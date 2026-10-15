/* Employee list in the existing application shell. */
(() => {
  const { useState, useEffect, useRef, useMemo, useCallback } = window.React;
  const { Button, PageHeader, Badge, EmptyState, Skeleton, useCalendarMode, formatGlobalDate } = window.DSCore;
  const { Toast, Alert } = window.DSFeedback;
  const { DataGrid, AdvancedFilter } = window.DSGrid;
  const logic = window.EmployeeLogic;
  const FallbackIcon = ({ size = 16 }) => window.React.createElement('span', { style: { width: size, height: size } });
  const { Users = FallbackIcon, Edit = FallbackIcon, RefreshCw = FallbackIcon } = window.LucideIcons || {};
  const emptyContext = { records: [], parties: [], users: [], menus: [] };

  const Employee = ({ language = 'fa', formCode = 'EMPLOYEE_MAIN' }) => {
    const security = window.SecurityManager.useSecurity();
    const access = security.getActions(formCode);
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const calendar = useCalendarMode();
    const [context, setContext] = useState(emptyContext);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [draftFilters, setDraftFilters] = useState({});
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);
    const [filterRevision, setFilterRevision] = useState(0);
    const [modal, setModal] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const requestId = useRef(0);
    const mounted = useRef(true);
    const saving = useRef(false);
    const toastTimer = useRef(null);
    const notify = useCallback((message, type = 'success') => {
      if (!mounted.current) return;
      clearTimeout(toastTimer.current);
      setToast({ isVisible: true, message, type });
      toastTimer.current = setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 5000);
    }, []);
    const errorText = e => isRtl ? e.fa || e.message : e.message;
    const refresh = useCallback(async () => {
      const sequence = ++requestId.current;
      setLoading(true);
      setError('');
      try {
        const next = await logic.load(window.supabase, security, formCode);
        if (mounted.current && sequence === requestId.current) setContext(next);
        return next;
      } catch (e) {
        if (mounted.current && sequence === requestId.current) setError(isRtl ? e.fa || e.message : e.message);
        throw e;
      } finally {
        if (mounted.current && sequence === requestId.current) setLoading(false);
      }
    }, [security, formCode, isRtl]);
    useEffect(() => {
      mounted.current = true;
      if (access.canView) refresh().catch(() => {});
      else setLoading(false);
      return () => { mounted.current = false; requestId.current += 1; clearTimeout(toastTimer.current); };
    }, [refresh, access.canView]);
    const rows = useMemo(() => context.records.map(r => logic.hydrate(context, r)), [context]);
    const filteredRows = useMemo(() => rows.filter(row => {
      const query = String(filters.search || '').trim().toLowerCase();
      if (query && !['code', 'party_code', 'first_name', 'last_name', 'company_name', 'username', 'mobile', 'email', 'national_id']
        .some(key => String(row[key] || '').toLowerCase().includes(query))) return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.start_from && row.start_date < logic.normalizeDate(filters.start_from)) return false;
      if (filters.start_to && row.start_date > logic.normalizeDate(filters.start_to)) return false;
      return true;
    }), [rows, filters]);
    const search = values => {
      try {
        const from = logic.normalizeDate(values.start_from);
        const to = logic.normalizeDate(values.start_to);
        if (from && to && from > to) logic.fail('بازه تاریخ معتبر نیست.', 'Invalid date range.');
        setFilters({ ...values, start_from: from, start_to: to });
        setFilterRevision(prev => prev + 1);
      } catch (e) { notify(errorText(e), 'error'); }
    };
    const clear = () => {
      setDraftFilters({});
      setFilters({});
      setFilterRevision(prev => prev + 1);
    };
    const onQuickCreated = (type, saved) => {
      const next = type === 'party' ? { ...context, parties: [...context.parties, saved] }
        : { ...context, users: [...context.users, saved] };
      setContext(next);
      return next;
    };
    const onSave = async form => {
      if (saving.current) return;
      saving.current = true;
      setBusy(true);
      try {
        const result = await logic.save(window.supabase, security, formCode, context, form);
        setModal(null);
        notify(result.auditError ? t('اطلاعات ذخیره شد؛ ثبت لاگ ناموفق بود.', 'Saved; audit logging failed.')
          : t('اطلاعات کارکنان ذخیره شد.', 'Employee saved.'), result.auditError ? 'warning' : 'success');
        await refresh().catch(() => {});
      } catch (e) {
        await refresh().catch(() => {});
        throw e;
      } finally { saving.current = false; if (mounted.current) setBusy(false); }
    };
    const onSaveMany = async pending => {
      if (saving.current) return pending;
      saving.current = true;
      setBusy(true);
      const remaining = [];
      let successes = 0;
      let auditFailed = false;
      try {
        let current = await logic.load(window.supabase, security, formCode);
        for (const row of pending) {
          if (!mounted.current) { remaining.push(row); continue; }
          try {
            const result = await logic.save(window.supabase, security, formCode, current, row);
            successes += 1;
            auditFailed = auditFailed || Boolean(result.auditError);
            current = { ...current, records: [...current.records, result.saved],
              parties: result.party ? current.parties.map(p => logic.same(p.id, result.party.id) ? result.party : p) : current.parties };
          } catch (e) { remaining.push({ ...row, error: e }); }
        }
        if (mounted.current) {
          setContext(current);
          if (!remaining.length) setModal(null);
          notify(t(`${successes} ردیف ثبت شد؛ ${remaining.length} ردیف نیاز به اصلاح دارد.`,
            `${successes} saved; ${remaining.length} require correction.`), remaining.length || auditFailed ? 'warning' : 'success');
          if (auditFailed) notify(t('ثبت اطلاعات انجام شد؛ برخی لاگ‌ها ثبت نشدند.', 'Saved; some audit logs failed.'), 'warning');
        }
        await refresh().catch(() => {});
        return remaining;
      } finally { saving.current = false; if (mounted.current) setBusy(false); }
    };
    const importFile = async file => {
      if (!access.canCreate || busy || loading || error) return;
      setBusy(true);
      try {
        const importedRows = await logic.importRows(file, context);
        if (!importedRows.length) logic.fail('فایل فاقد ردیف اطلاعات است.', 'The workbook contains no data rows.');
        setModal({ mode: 'excel', rows: importedRows });
      } catch (e) { notify(errorText(e), 'error'); }
      finally { if (mounted.current) setBusy(false); }
    };
    const fmtDate = value => value ? formatGlobalDate(value, calendar) : '—';
    const columns = [
      ['code', 'کد کارمند', 'Employee code', '120px'],
      ['party_code', 'کد شخص', 'Party code', '110px'],
      ['party_name', 'شخص یا شرکت', 'Party', '200px'],
      ['first_name', 'نام', 'First name', '140px'],
      ['last_name', 'نام خانوادگی', 'Last name', '170px'],
      ['username', 'نام کاربری', 'Username', '150px'],
      ['mobile', 'شماره موبایل', 'Mobile', '150px'],
      ['email', 'ایمیل', 'Email', '220px'],
      ['national_id', 'کد / شناسه ملی', 'National ID', '140px'],
      ['father_name', 'نام پدر', 'Father name', '150px'],
      ['birth_date', 'تاریخ تولد', 'Birth date', '140px'],
      ['start_date', 'شروع همکاری', 'Start date', '140px'],
      ['end_date', 'پایان همکاری', 'End date', '140px'],
      ['job_title', 'عنوان شغلی', 'Job title', '180px'],
      ['notes', 'توضیحات', 'Notes', '230px']
    ].map(([field, fa, en, width]) => ({ field, header_fa: fa, header_en: en, width,
      ...(field.endsWith('_date') ? { render: fmtDate } : {}) }));
    columns.splice(13, 0, { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '130px', render: value => {
      const status = logic.statuses.find(s => s.value === value);
      return <Badge variant={status?.variant || 'slate'} size="sm">{status ? t(status.fa, status.en) : value}</Badge>;
    } });
    if (!access.canView) return <EmptyState title={t('دسترسی مجاز نیست', 'Access denied')} icon={Users} />;
    return <div className="h-full flex flex-col p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader title={t('اطلاعات کارکنان', 'Employee information')} icon={Users}
        description={t('فهرست کارکنان سازمان و تعریف تکی، گروهی و اکسل', 'Organization employee with single, bulk and Excel entry')}
        breadcrumbs={[{ label: t('تنظیمات پایه', 'Base setup') }, { label: t('اطلاعات کارکنان', 'Employee') }]}
        language={language} />
      <AdvancedFilter language={language} initialValues={draftFilters} onFilter={setDraftFilters}
        onSearch={search} onClear={clear} fields={[
          { name: 'search', label: t('کد، نام، کاربر یا اطلاعات تماس', 'Code, name, user or contact') },
          { name: 'status', type: 'select', label: t('وضعیت', 'Status'), options:
            [{ value: '', label: t('همه', 'All') }, ...logic.statuses.map(s => ({ value: s.value, label: t(s.fa, s.en) }))] },
          { name: 'start_from', type: 'date', label: t('شروع همکاری از', 'Start date from') },
          { name: 'start_to', type: 'date', label: t('شروع همکاری تا', 'Start date to') }
        ]} />
      {error && <div className="mb-3 space-y-2"><Alert type="error" title={t('دریافت اطلاعات ناموفق بود', 'Failed to load employee')} message={error} />
        <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => refresh().catch(() => {})} disabled={busy || loading}>
          {t('دریافت مجدد', 'Retry')}
        </Button></div>}
      {loading ? <div className="space-y-3"><Skeleton height="40px" />{[1, 2, 3, 4].map(i => <Skeleton key={i} height="36px" />)}</div>
        : !error && <div className="flex-1 min-h-0 flex flex-col">
          <DataGrid key={filterRevision} data={filteredRows} columns={columns} language={language} formCode={formCode}
            gridState={gridState} onGridStateChange={setGridState} hideExport={!access.canPrint}
            hideImport={!access.canCreate || busy} onImport={importFile}
            onDownloadSample={access.canCreate ? () => { try { logic.template(); } catch (e) { notify(errorText(e), 'error'); } } : undefined}
            onAdd={access.canCreate && !busy ? () => setModal({ mode: 'single' }) : undefined}
            onRowDoubleClick={row => { if (!busy) setModal({ mode: 'single', record: context.records.find(r => logic.same(r.id, row.id)) }); }}
            actions={access.canEdit ? [{ id: 'edit', icon: Edit, tooltip: t('ویرایش', 'Edit'), hidden: () => busy,
              onClick: row => setModal({ mode: 'single', record: context.records.find(r => logic.same(r.id, row.id)) }) }] : []}
            toolbarContent={<>
              {access.canCreate && <Button size="sm" variant="outline" icon={Users} disabled={busy}
                onClick={() => setModal({ mode: 'bulk' })}>{t('تعریف گروهی', 'Add in bulk')}</Button>}
              <Button size="sm" variant="outline" icon={RefreshCw} disabled={busy}
                onClick={() => refresh().catch(() => {})}>{t('بازخوانی', 'Refresh')}</Button>
            </>} />
        </div>}
      {modal && <window.EmployeeDetails key={`${modal.mode}-${modal.record?.id || 'new'}`} mode={modal.mode}
        record={modal.record} importedRows={modal.rows} context={context} security={security} formCode={formCode}
        language={language} busy={busy} onClose={() => { if (!saving.current) setModal(null); }}
        onSave={onSave} onSaveMany={onSaveMany} onQuickCreated={onQuickCreated} notify={notify} />}
      <Toast {...toast} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
    </div>;
  };
  Employee.formCode = 'EMPLOYEE_MAIN';
  window.Employee = Employee;
})();
