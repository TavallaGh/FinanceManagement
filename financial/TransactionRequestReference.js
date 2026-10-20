/* Request selection and navigation reuse the existing request/transaction forms. */
(() => {
  const React = window.React;
  const { useState, useRef, useEffect } = React;
  const requestFormCode = 'REQ_REQUEST_MNGMT';
  const ownsOnly = scope => [].concat(scope?.own_data_only || []).some(value =>
    value === true || value === 1 || value === '1' || value === 'true');
  const scoped = (query, security, userId) => ownsOnly(security.getDataScope(requestFormCode))
    ? query.eq('registrar_id', userId) : query;
  const readPages = async build => {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const result = await build().range(offset, offset + 499);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 500) return rows;
    }
  };
  const requireCreate = (security, formCode, t) => {
    const access = security?.getActions(formCode);
    if (!access?.canView || !access.canCreate || !security?.getActions(requestFormCode)?.canView) {
      throw new Error(t('مجوز ثبت تراکنش و مشاهده درخواست لازم است.', 'Transaction creation and request view permissions are required.'));
    }
  };
  const loadAssignedRequests = async (supabase, security, userId, formCode, t) => {
    requireCreate(security, formCode, t);
    const actor = await window.RequestAssignmentLogic.loadActor(supabase, userId);
    if (!actor.active) return [];
    const build = () => scoped(supabase.from('req_requests')
      .select('id, request_code, request_type, need_date, description, status, registrar_id, transaction_id, transaction_assignee_user_id, transaction_assignee_group_id, created_at')
      .eq('status', 'IN_PROGRESS').is('transaction_id', null), security, userId)
      .order('created_at', { ascending: false }).order('id');
    const rows = await readPages(() => build().eq('transaction_assignee_user_id', userId));
    for (let offset = 0; offset < actor.groupIds.length; offset += 100) {
      rows.push(...await readPages(() => build().is('transaction_assignee_user_id', null)
        .in('transaction_assignee_group_id', actor.groupIds.slice(offset, offset + 100))));
    }
    return [...new Map(rows.filter(row => window.RequestAssignmentLogic.mayCreate(row, actor))
      .map(row => [row.id, row])).values()]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || String(a.id).localeCompare(String(b.id)));
  };
  const addReferenceCodes = async (supabase, transactions, security, userId) => {
    const ids = [...new Set(transactions.map(row => row.request_id).filter(Boolean))];
    const codes = new Map();
    if (security?.getActions(requestFormCode)?.canView) {
      for (let offset = 0; offset < ids.length; offset += 100) {
        const rows = await readPages(() => scoped(supabase.from('req_requests')
          .select('id, request_code').in('id', ids.slice(offset, offset + 100)), security, userId).order('id'));
        rows.forEach(row => codes.set(String(row.id), row.request_code));
      }
    }
    return transactions.map(row => ({ ...row, request_reference_code: codes.get(String(row.request_id)) || '' }));
  };
  const prepareTransaction = async (supabase, security, userId, formCode, requestId, t) => {
    requireCreate(security, formCode, t);
    const logic = window.RequestTransactionLogic;
    const request = await logic.readRequest(supabase, requestId);
    logic.assertScope(request, security, requestFormCode, userId, t);
    logic.assertInProgress(request, t);
    await window.RequestAssignmentLogic.assertCanCreate(supabase, request, userId, t);
    const existing = await logic.findTransaction(supabase, request.id);
    if (request.transaction_id || existing) {
      // Resume only the current actor's unfinished save; never create a second document.
      if (!request.transaction_id && existing && logic.same(existing.registrar_id, userId)) {
        const record = await logic.readTransaction(supabase, existing.id);
        logic.assertScope(record, security, formCode, userId, t);
        return { mode: 'EDIT', record, request: null };
      }
      throw new Error(t('برای این درخواست، تراکنش ثبت شده یا ثبت آن توسط کاربر دیگری شروع شده است. فهرست را تازه‌سازی کنید.',
        'A transaction already exists or another user has started saving it. Refresh the list.'));
    }
    request.req_request_items = await logic.readItems(supabase, 'req_request_items', 'request_id', request.id);
    return { mode: 'CREATE', record: null, request };
  };
  const readReference = async (supabase, security, userId, formCode, transactionId, t) => {
    const result = await supabase.from('fm_transactions').select('id, request_id, registrar_id').eq('id', transactionId).single();
    if (result.error) throw result.error;
    const logic = window.RequestTransactionLogic;
    logic.assertScope(result.data, security, formCode, userId, t);
    if (!result.data.request_id) throw new Error(t('این تراکنش درخواست مرجع ندارد.', 'This transaction has no reference request.'));
    const request = await logic.readRequest(supabase, result.data.request_id);
    logic.assertScope(request, security, requestFormCode, userId, t);
    request.req_request_items = await logic.readItems(supabase, 'req_request_items', 'request_id', request.id);
    return request;
  };
  const useReference = ({ supabase, security, userId, formCode, language, t, showToast, onTransaction, onRequest }) => {
    const [picker, setPicker] = useState(null);
    const [requestRecord, setRequestRecord] = useState(null);
    const [busy, setBusy] = useState(false);
    const sequence = useRef(0);
    const selecting = useRef(false);
    useEffect(() => {
      sequence.current++;
      selecting.current = false;
      setPicker(null);
      setRequestRecord(null);
      setBusy(false);
      return () => { sequence.current++; };
    }, [supabase, security, userId]);
    const access = security?.getActions(formCode);
    const canViewRequest = !!security?.getActions(requestFormCode)?.canView;
    const canCreate = !!userId && !!access?.canView && !!access?.canCreate && canViewRequest;
    const closePicker = () => { sequence.current++; selecting.current = false; setBusy(false); setPicker(null); };
    const openPicker = async () => {
      if (selecting.current) return;
      const current = ++sequence.current;
      setPicker({ rows: [], loading: true, error: '' });
      try {
        const rows = await loadAssignedRequests(supabase, security, userId, formCode, t);
        if (sequence.current === current) setPicker({ rows, loading: false, error: '' });
      } catch (error) {
        if (sequence.current === current) setPicker({ rows: [], loading: false, error: error.message });
      }
    };
    const selectRequest = async row => {
      if (selecting.current || !canCreate) return;
      selecting.current = true;
      setBusy(true);
      const current = ++sequence.current;
      try {
        const result = await prepareTransaction(supabase, security, userId, formCode, row.id, t);
        if (current !== sequence.current) return;
        setPicker(null);
        onTransaction(result);
      } catch (error) {
        if (current === sequence.current) showToast(error.message, 'error');
      } finally {
        if (current === sequence.current) { selecting.current = false; setBusy(false); }
      }
    };
    const openRequest = async row => {
      const current = ++sequence.current;
      setBusy(true);
      try {
        const request = await readReference(supabase, security, userId, formCode, row.id, t);
        if (current !== sequence.current) return;
        setRequestRecord(request);
        onRequest();
      } catch (error) {
        if (current === sequence.current) showToast(error.message, 'error');
      } finally {
        if (current === sequence.current) setBusy(false);
      }
    };
    const { Button } = window.DSCore;
    const { Modal } = window.DSFeedback;
    const { DataGrid } = window.DSGrid;
    const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { width: size, height: size } });
    const SelectIcon = window.LucideIcons?.FilePlus || FallbackIcon;
    const typeLabels = { GENERAL: ['واریز/ برداشت', 'Deposit / Withdrawal'], BUDGET: ['مصرف بودجه', 'Budget Consumption'],
      TRANSFER: ['انتقال', 'Transfer'], EXCHANGE: ['تبدیل ارز', 'Currency Exchange'] };
    const modal = <Modal isOpen={!!picker} onClose={closePicker} language={language}
      title={t('ثبت تراکنش با مرجع درخواست', 'Create Transaction from Request')} width="max-w-5xl">
      {picker && <div className="p-4 flex flex-col gap-3" dir={language === 'fa' ? 'rtl' : 'ltr'}>
        <p className="text-[12px] text-slate-600 dark:text-slate-300">
          {t('درخواست‌های در حال انجام، ارجاع‌شده به شما یا گروه‌های شما، که هنوز تراکنش آن‌ها ثبت نشده است.',
            'In-progress requests assigned to you or your groups whose transactions have not yet been saved.')}
        </p>
        {picker.loading ? <div role="status" className="p-8 text-center text-slate-500">{t('در حال دریافت درخواست‌ها...', 'Loading requests...')}</div>
          : picker.error ? <div role="alert" className="p-4 text-[12px] text-red-600 dark:text-red-400">{picker.error}</div>
          : <div className="h-[48vh] min-h-[260px]">
            <DataGrid data={picker.rows} language={language} hideToolbar hideImport hideExport
              selectable={false} actionWidth="64px" minVisibleRows={5}
              onRowDoubleClick={selectRequest} columns={[
                { field: 'request_code', header_fa: 'کد درخواست', header_en: 'Request Code', width: '150px' },
                { field: 'request_type', header_fa: 'نوع درخواست', header_en: 'Type', width: '120px',
                  render: value => typeLabels[value] ? t(...typeLabels[value]) : value },
                { field: 'need_date', header_fa: 'تاریخ نیاز', header_en: 'Need Date', type: 'date', width: '110px' },
                { field: 'description', header_fa: 'شرح درخواست', header_en: 'Description', width: '280px' },
              ]} actions={[{ id: 'select_request', icon: SelectIcon, tooltip: t('ثبت تراکنش برای این درخواست', 'Create transaction for this request'), onClick: selectRequest }]} />
          </div>}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={busy || picker.loading} onClick={openPicker}>{t('تازه‌سازی', 'Refresh')}</Button>
          {busy && <span role="status" className="text-[12px] text-slate-500">{t('در حال باز کردن...', 'Opening...')}</span>}
          <Button variant="outline" size="sm" onClick={closePicker}>{t('انصراف', 'Cancel')}</Button>
        </div>
      </div>}
    </Modal>;
    return { canCreate, canViewRequest, openPicker, openRequest, requestRecord, busy, modal };
  };
  window.TransactionRequestReference = { loadAssignedRequests, addReferenceCodes, prepareTransaction, readReference, useReference };
})();
