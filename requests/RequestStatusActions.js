/* Static request transitions; independent of workflow configuration. */
(() => {
  const { useState, useEffect, useRef } = window.React;
  // DatePicker stores Gregorian dates even when the displayed calendar is Jalali.
  const normalizeNeedDate = value => {
    const match = String(value || '').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/);
    if (!match) return null;
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  const todayKey = () => {
    const today = new Date();
    return normalizeNeedDate(`${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`);
  };
  const isOverdue = (request, today = todayKey()) => {
    const date = normalizeNeedDate(request.need_date);
    return !!date && ['DRAFT', 'REGISTERED', 'REVIEWED', 'APPROVED'].includes(request.status) && date < today;
  };
  const useTodayKey = () => {
    const [today, setToday] = useState(todayKey);
    useEffect(() => {
      const refresh = () => setToday(todayKey());
      const timer = window.setInterval(refresh, 60000);
      window.addEventListener('focus', refresh);
      return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
    }, []);
    return today;
  };

  const transitions = [
    ['DRAFT', 'REGISTERED', 'ثبت درخواست', 'Register Request', ''],
    ['REGISTERED', 'DRAFT', 'برگشت به یادداشت', 'Revert to Draft', 'NOTE'],
    ['REGISTERED', 'APPROVED', 'تایید درخواست', 'Approve Request', 'NOTE'],
    ['REGISTERED', 'REJECTED', 'عدم تایید', 'Reject Request', 'NOTE'],
    ['APPROVED', 'REGISTERED', 'برگشت به ثبت شده', 'Revert to Registered', 'NOTE'],
    ['APPROVED', 'IN_PROGRESS', 'شروع انجام', 'Start Processing', 'ACCOUNTS_AMOUNTS'],
    ['REJECTED', 'REGISTERED', 'برگشت به ثبت شده', 'Revert to Registered', 'NOTE'],
    ['IN_PROGRESS', 'APPROVED', 'برگشت به تایید شده', 'Revert to Approved', 'NOTE'],
    ['IN_PROGRESS', 'DONE', 'انجام شده', 'Mark Done', 'NOTE'],
    ['IN_PROGRESS', 'CLOSED', 'بستن درخواست', 'Close Request', 'NOTE'],
    ['DONE', 'IN_PROGRESS', 'برگشت به در حال انجام', 'Revert to In Progress', 'NOTE'],
    ['DONE', 'CLOSED', 'بستن درخواست', 'Close Request', 'NOTE'],
    // Existing reviewed requests can return to the new approval path without a data migration.
    ['REVIEWED', 'REGISTERED', 'برگشت به ثبت شده', 'Revert to Registered', 'NOTE'],
  ].map(([from, to, fa, en, form]) => ({
    id: `request_${from.toLowerCase()}_to_${to.toLowerCase()}`,
    from_status: from,
    to_status: to,
    action_label_fa: fa,
    action_label_en: en,
    data_entry_form: form,
  }));

  const canPerform = (access, action) => !!access?.canView &&
    (access.raw_actions || []).some(code => code === '*' || code === action.id);

  const buttonColors = {
    DRAFT: '!text-slate-600 dark:!text-slate-300 !border-slate-500',
    REGISTERED: '!text-blue-600 dark:!text-blue-400 !border-blue-500',
    APPROVED: '!text-emerald-600 dark:!text-emerald-400 !border-emerald-500',
    REJECTED: '!text-red-600 dark:!text-red-400 !border-red-500',
    IN_PROGRESS: '!text-orange-500 dark:!text-orange-400 !border-orange-500',
    DONE: '!text-teal-600 dark:!text-teal-400 !border-teal-500',
    CLOSED: '!text-slate-600 dark:!text-slate-300 !border-slate-500',
  };

  const getActions = (status, access) => transitions.filter(action =>
    action.from_status === status && canPerform(access, action));

  const recordAccess = (record, access, dataScope, userId) => {
    const ownOnly = [].concat(dataScope?.own_data_only || []).some(value =>
      value === true || value === 1 || value === '1' || value === 'true');
    if (record.id && ownOnly && String(record.registrar_id) !== String(userId)) {
      return { ...access, canView: false, canEdit: false, raw_actions: [] };
    }
    return access;
  };

  const getBulkActions = (records, access, dataScope, userId, selectionCount = records.length) => {
    const groups = new Map();
    for (const record of records) {
      for (const action of getActions(record.status, recordAccess(record, access, dataScope, userId))) {
        if (action.data_entry_form && action.data_entry_form !== 'NOTE' && selectionCount !== 1) continue;
        const key = `${action.to_status}:${action.data_entry_form}:${action.action_label_en}`;
        if (!groups.has(key)) groups.set(key, { key, action, entries: [] });
        groups.get(key).entries.push({ record, action });
      }
    }
    return [...groups.values()];
  };

  const getRatesForDate = async (supabase, dateRaw) => {
    const dateKey = (dateRaw || new Date().toISOString()).replace(/\//g, '-').split('T')[0];
    const { data, error } = await supabase.from('fm_currency_rates')
      .select('base_currency, target_currency, rate, rate_date')
      .lte('rate_date', dateKey).order('rate_date', { ascending: false });
    if (error) throw error;
    const latest = {};
    (data || []).forEach(rate => {
      const key = `${rate.base_currency}_${rate.target_currency}`;
      if (!latest[key]) latest[key] = rate.rate;
    });
    return latest;
  };

  const validateBalance = async (supabase, header, items, t) => {
    if (header.request_type !== 'TRANSFER' || !items.length) return;
    const rates = await getRatesForDate(supabase, header.need_date || header.created_at);
    let difference = 0;
    const amount = value => parseFloat(String(value || '0').replace(/,/g, '')) || 0;
    items.forEach(item => {
      const currency = item.currency || 'IRR';
      let toUsd = 1;
      if (currency !== 'USD') {
        if (rates[`${currency}_USD`]) toUsd = parseFloat(rates[`${currency}_USD`]);
        else if (rates[`USD_${currency}`]) toUsd = 1 / parseFloat(rates[`USD_${currency}`]);
      }
      difference += (amount(item.deposit_amount) - amount(item.withdrawal_amount)) * toUsd;
    });
    if (Math.abs(difference) > 0.01) {
      throw new Error(t(`بالانس درخواست صحیح نیست. اختلاف معادل دلار: ${difference.toFixed(2)}`,
        `Request balance mismatch. USD difference: ${difference.toFixed(2)}`));
    }
  };

  const validateItems = (items, accounts, t, requestType) => {
    if (!items.length) throw new Error(t('حداقل یک قلم درخواست لازم است.', 'At least one request item is required.'));
    if (requestType === 'EXCHANGE') {
      window.RequestExchangeLogic.validate(items, t, { requireReceipt: true, accounts, requireAccounts: true });
    }
    for (const item of items) {
      const amount = Number(item.approved_amount);
      const requested = requestType === 'EXCHANGE' ? Number(item.withdrawal_amount) : Math.max(Number(item.deposit_amount) || 0, Number(item.withdrawal_amount) || 0);
      if (!Number.isFinite(amount) || amount < 0 || amount > requested) {
        throw new Error(t(`مبلغ تایید شده ردیف ${item.row_number} باید بین صفر و مبلغ درخواستی باشد.`,
          `Approved amount in row ${item.row_number} must be between zero and the requested amount.`));
      }
      for (const [field, currency] of [['related_account_id', item.currency],
        ...(requestType === 'EXCHANGE' ? [['destination_account_id', item.destination_currency]] : [])]) {
        const account = accounts.find(candidate => String(candidate.id) === String(item[field]));
        if (!account || !currency || account.currency_code !== currency) {
          throw new Error(t(`در ردیف ${item.row_number} فقط حساب با ارز ${currency || 'مشخص‌شده'} مجاز است.`,
            `Row ${item.row_number} requires an account in ${currency || 'the selected currency'}.`));
        }
      }
    }
  };
  const validateLiveCurrencies = async (supabase, items, t, requestType) => {
    const ids = [...new Set(items.flatMap(item => [item.related_account_id,
      ...(requestType === 'EXCHANGE' ? [item.destination_account_id] : [])]))];
    const accounts = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const result = await supabase.from('fm_coa_accounts').select('id, currency_id')
        .in('id', ids.slice(offset, offset + 100)).eq('is_active', true);
      if (result.error) throw result.error;
      accounts.push(...result.data);
    }
    const currencyIds = [...new Set(accounts.map(account => account.currency_id).filter(Boolean))];
    const currencies = [];
    for (let offset = 0; offset < currencyIds.length; offset += 100) {
      const result = await supabase.from('fm_currencies').select('id, code').in('id', currencyIds.slice(offset, offset + 100));
      if (result.error) throw result.error;
      currencies.push(...result.data);
    }
    validateItems(items, accounts.map(account => ({ ...account,
      currency_code: currencies.find(currency => String(currency.id) === String(account.currency_id))?.code })), t, requestType);
  };

  const changeStatus = async ({ supabase, header, action, access, dataScope, currentUserId, currentUserName,
    items, input, accounts, currencies, t }) => {
    const allowed = getActions(header.status, access).find(candidate => candidate.id === action.id);
    if (!header.id || !currentUserId || !allowed || allowed.to_status !== action.to_status) {
      throw new Error(t('اجازه این تغییر وضعیت را ندارید.', 'This status transition is not permitted.'));
    }
    const live = await supabase.from('req_requests').select('*, req_request_items(*)').eq('id', header.id).single();
    if (live.error) throw live.error;
    if (!recordAccess(live.data, access, dataScope, currentUserId).canView) {
      throw new Error(t('این درخواست خارج از دامنه دسترسی شما است.', 'This request is outside your data scope.'));
    }
    if (live.data.status !== header.status) {
      throw new Error(t('وضعیت درخواست تغییر کرده است؛ درخواست را دوباره باز کنید.',
        'Request status has changed. Reopen the request.'));
    }
    if (allowed.from_status === 'DRAFT' && allowed.to_status === 'REGISTERED' && !normalizeNeedDate(live.data.need_date)) {
      throw new Error(t('تاریخ نیاز معتبر الزامی است؛ آن را در حالت یادداشت تکمیل کنید.',
        'A valid need date is required. Complete it in Draft status.'));
    }
    if (!live.data.transaction_id && await window.RequestTransactionLogic.findTransaction(supabase, header.id)) {
      throw new Error(t('ثبت تراکنش مرتبط کامل نشده است؛ ابتدا تراکنش را بررسی و ذخیره کنید.',
        'Linked transaction save is incomplete. Review and save the transaction first.'));
    }
    if (allowed.to_status === 'DONE') {
      await window.RequestTransactionLogic.requireCompletedLink(supabase, live.data, t);
    }
    if (allowed.to_status !== 'CLOSED') await validateBalance(supabase, live.data, live.data.req_request_items || [], t);

    const isExchange = live.data.request_type === 'EXCHANGE';
    const forward = ['DRAFT:REGISTERED', 'REGISTERED:APPROVED', 'APPROVED:IN_PROGRESS', 'IN_PROGRESS:DONE', 'DONE:CLOSED']
      .includes(`${allowed.from_status}:${allowed.to_status}`);
    if (isExchange && forward && allowed.data_entry_form !== 'ACCOUNTS_AMOUNTS') {
      window.RequestExchangeLogic.validate(live.data.req_request_items || [], t,
        { requireReceipt: ['DONE', 'CLOSED'].includes(allowed.to_status) });
    }
    const itemValues = item => ({
      related_account_id: item.related_account_id,
      approved_amount: item.approved_amount,
      remaining_amount: item.remaining_amount,
      ...(isExchange ? {
        destination_account_id: item.destination_account_id,
        deposit_amount: item.deposit_amount,
        exchange_rate: item.exchange_rate ?? null,
      } : {}),
    });

    let savedItems = items;
    const originals = live.data.req_request_items || [];
    const changedItems = [];
    let statusWritten = false;
    let assignment = null;
    try {
      if (allowed.data_entry_form === 'ACCOUNTS_AMOUNTS') {
        if (window.RequestAssignmentLogic.fields.some(field => !Object.prototype.hasOwnProperty.call(live.data, field))) {
          throw new Error(t('ستون‌های ارجاع درخواست در دیتابیس آماده نیستند. کوئری request_assignment_migration.sql را اجرا کنید و درخواست را دوباره باز کنید.',
            'Request assignment columns are missing. Run request_assignment_migration.sql and reopen the request.'));
        }
        assignment = await window.RequestAssignmentLogic.validateChoice(supabase, input.assignee, t);
        const edits = input.overrideItems;
        if (!Array.isArray(edits) || edits.length !== originals.length ||
            new Set(edits.map(item => item.id)).size !== originals.length ||
            edits.some(item => !originals.some(original => original.id === item.id))) {
          throw new Error(t('اقلام درخواست تغییر کرده‌اند؛ درخواست را دوباره باز کنید.',
            'Request items have changed. Reopen the request.'));
        }
        savedItems = originals.map(original => {
          const edit = edits.find(item => item.id === original.id);
          const snapshot = items.find(item => item.id === original.id);
          if (!snapshot || ['related_account_id', 'currency', ...(isExchange ? ['destination_account_id', 'destination_currency'] : [])]
              .some(field => String(original[field] || '') !== String(snapshot[field] || '')) ||
            ['approved_amount', 'deposit_amount', 'withdrawal_amount', ...(isExchange ? ['exchange_rate'] : [])]
              .some(field => Number(original[field] || 0) !== Number(snapshot[field] || 0))) {
            throw new Error(t('اقلام درخواست تغییر کرده‌اند؛ درخواست را دوباره باز کنید.',
              'Request items have changed. Reopen the request.'));
          }
          const updated = {
            ...original,
            approved_amount: Number(edit.approved_amount),
            related_account_id: edit.related_account_id,
            remaining_amount: (isExchange ? Number(original.withdrawal_amount) : Math.max(Number(original.deposit_amount) || 0, Number(original.withdrawal_amount) || 0)) - Number(edit.approved_amount),
            ...(isExchange ? {
              destination_account_id: edit.destination_account_id,
              exchange_rate: window.RequestExchangeLogic.hasValue(edit.exchange_rate) ? Number(edit.exchange_rate) : null,
              deposit_amount: Number(edit.deposit_amount),
            } : {}),
          };
          return isExchange ? window.RequestExchangeLogic.recalculate(updated, currencies) : updated;
        });
        validateItems(savedItems, accounts, t, live.data.request_type);
        await validateLiveCurrencies(supabase, savedItems, t, live.data.request_type);
        // Publish IN_PROGRESS and its assignee only after account/amount writes succeed.
        for (const item of savedItems) {
          let itemQuery = supabase.from('req_request_items').update(itemValues(item))
            .eq('id', item.id).eq('request_id', header.id);
          for (const [field, value] of Object.entries(itemValues(originals.find(original => original.id === item.id)))) {
            itemQuery = value == null ? itemQuery.is(field, null) : itemQuery.eq(field, value);
          }
          const result = await itemQuery.select('id');
          if (result.error) throw result.error;
          if (result.data?.length !== 1) throw new Error(t('قلم درخواست ذخیره نشد.', 'Request item was not saved.'));
          changedItems.push(item);
        }
      }

      let statusQuery = supabase.from('req_requests').update({ status: allowed.to_status, ...(assignment?.patch || {}) })
        .eq('id', header.id).eq('status', allowed.from_status);
      statusQuery = live.data.transaction_id ? statusQuery.eq('transaction_id', live.data.transaction_id) : statusQuery.is('transaction_id', null);
      const update = await statusQuery.select('id');
      if (update.error) throw update.error;
      if (update.data?.length !== 1) {
        throw new Error(t('درخواست تغییر کرده یا دسترسی ندارید؛ درخواست را دوباره باز کنید.',
          'Request changed or access was denied. Reopen the request.'));
      }
      statusWritten = true;
      const note = String(input.approver_note || '').trim() || null;
      const log = await supabase.from('req_request_status_logs').insert([{
        request_id: header.id,
        from_status: allowed.from_status,
        to_status: allowed.to_status,
        actor_user_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(currentUserId)) ? currentUserId : null,
        actor_name: currentUserName || String(currentUserId),
        next_assignee: assignment?.label || '-',
        description: note,
        changed_at: new Date().toISOString(),
        metadata: {
          actor_user_id_raw: currentUserId,
          action_id: allowed.id,
          action_label_fa: allowed.action_label_fa,
          action_label_en: allowed.action_label_en,
          data_entry_form: allowed.data_entry_form || null,
          approver_note: note,
          ...(assignment ? { transaction_assignee: { kind: assignment.kind, id: assignment.id } } : {}),
          workflow_source: 'MANUAL',
        },
      }]).select('id');
      if (log.error) throw log.error;
      if (log.data?.length !== 1) throw new Error(t('تاریخچه وضعیت ثبت نشد.', 'Status history was not saved.'));
      return savedItems;
    } catch (error) {
      // The prototype has no backend transaction endpoint. Check every compensating write.
      let restored = true;
      if (statusWritten) {
        try {
          const rollback = await supabase.from('req_requests').update({ status: allowed.from_status,
            ...(assignment ? { transaction_assignee_user_id: live.data.transaction_assignee_user_id || null,
              transaction_assignee_group_id: live.data.transaction_assignee_group_id || null } : {}) })
            .eq('id', header.id).eq('status', allowed.to_status).select('id');
          restored = !rollback.error && rollback.data?.length === 1;
        } catch { restored = false; }
      }
      for (const changed of restored ? changedItems : []) {
        const original = originals.find(item => item.id === changed.id);
        try {
          let rollbackQuery = supabase.from('req_request_items').update(itemValues(original))
            .eq('id', original.id).eq('request_id', header.id);
          for (const [field, value] of Object.entries(itemValues(changed))) {
            rollbackQuery = value == null ? rollbackQuery.is(field, null) : rollbackQuery.eq(field, value);
          }
          const rollback = await rollbackQuery.select('id');
          if (rollback.error || rollback.data?.length !== 1) restored = false;
        } catch { restored = false; }
      }
      if (!restored) {
        throw new Error(t('ثبت کامل نشد و بازگردانی اطلاعات هم ناموفق بود؛ درخواست و تاریخچه را پیش از تلاش مجدد بررسی کنید.',
          'Save and recovery failed. Check the request and its history before retrying.'));
      }
      throw error;
    }
  };

  const useRequestStatusActions = ({ isOpen, language, isRtl, t, header, items, lookups,
    access, isLoading, isDirty, showToast, formatNumberSafe, getRequestedAmount, dataEntryComponents, onCancel }) => {
    const { Button, Modal, DataGrid, TextField, TextAreaField, RadioGroup, LOVField } = dataEntryComponents;
    const [modal, setModal] = useState(null);
    const [assignees, setAssignees] = useState({ rows: [], loading: false, error: '' });
    const isExchange = header.request_type === 'EXCHANGE';
    const submitting = useRef(false);
    useEffect(() => { setModal(null); }, [isOpen, header.id, header.status]);
    useEffect(() => {
      if (modal?.action.data_entry_form !== 'ACCOUNTS_AMOUNTS') return;
      let cancelled = false;
      setAssignees({ rows: [], loading: true, error: '' });
      window.RequestAssignmentLogic.loadOptions(window.supabase, t).then(rows => {
        if (!cancelled) setAssignees({ rows, loading: false, error: '' });
      }).catch(error => {
        if (!cancelled) setAssignees({ rows: [], loading: false, error: error.message });
      });
      return () => { cancelled = true; };
    }, [modal?.action.id, t]);

    const close = () => {
      if (submitting.current) return;
      setModal(null);
      if (onCancel) onCancel();
    };
    const open = (action, handleSave) => {
      if (isLoading || submitting.current) return;
      if (isDirty) {
        showToast(t('ابتدا تغییرات درخواست را ذخیره کنید.', 'Save request changes first.'), 'warning');
        return;
      }
      if (!action.data_entry_form) {
        handleSave(action);
        return;
      }
      if (action.data_entry_form === 'ACCOUNTS_AMOUNTS' && !items.length) {
        showToast(t('حداقل یک قلم درخواست لازم است.', 'At least one request item is required.'), 'warning');
        return;
      }
      const assignee = window.RequestAssignmentLogic.selection(header);
      setModal({ action, note: '', assigneeKind: assignee?.kind || 'USER', assignee, rows: items.map(item => ({ ...item })) });
    };
    const updateRow = (id, patch) => setModal(previous => ({
      ...previous,
      rows: previous.rows.map(row => row.id === id
        ? (isExchange ? window.RequestExchangeLogic.recalculate({ ...row, ...patch }, lookups.currencies) : { ...row, ...patch }) : row),
    }));
    const submit = async (handleSave) => {
      if (!modal || submitting.current || isLoading) return;
      submitting.current = true;
      try {
        const input = { approver_note: modal.note };
        if (modal.action.data_entry_form === 'ACCOUNTS_AMOUNTS') {
          const choice = assignees.rows.find(row => row.kind === modal.assigneeKind && row.key === window.RequestAssignmentLogic.key(modal.assignee));
          if (!choice) throw new Error(t('کاربر یا گروه فعال برای «ارجاع به» انتخاب کنید.', 'Select an active user or group in Assign To.'));
          input.assignee = { kind: choice.kind, id: choice.id };
          validateItems(modal.rows, lookups.leafAccounts, t, header.request_type);
          input.overrideItems = modal.rows;
        }
        if (await handleSave(modal.action, input)) setModal(null);
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        submitting.current = false;
      }
    };

    const accountColumns = [
      { field: 'chart_name', header_fa: 'ساختار حساب', header_en: 'Chart', width: '110px' },
      { field: 'code', header_fa: 'کد حساب', header_en: 'Code', width: '100px' },
      { field: 'pathTitle', header_fa: 'عنوان حساب', header_en: 'Account', width: '260px' },
      { field: 'currency_code', header_fa: 'ارز', header_en: 'Currency', width: '80px' },
    ];
    const accountColumn = (field, fa, en, currencyField) => ({
      field, header_fa: fa, header_en: en, width: '260px',
      render: (value, row) => {
        const account = lookups.leafAccounts.find(candidate => String(candidate.id) === String(value));
        const choices = lookups.leafAccounts.filter(candidate =>
          !!row[currencyField] && candidate.currency_code === row[currencyField]);
        return <LOVField size="sm" data={choices} columns={accountColumns}
          displayValue={account ? `${account.code} - ${account.displayLabel}` : ''}
          dropdownWidth="min-w-[650px]" isRtl={isRtl} disabled={isLoading}
          placeholder={t('انتخاب حساب', 'Select account')}
          onChange={selected => updateRow(row.id, { [field]: selected?.id || null })} />;
      },
    });
    const exchangeNumberColumn = (field, fa, en) => ({
      field, header_fa: fa, header_en: en, width: '150px',
      render: (value, row) => <TextField size="sm" value={value ?? ''} dir="ltr" isRtl={isRtl}
        aria-label={t(`${fa} ردیف ${row.row_number}`, `${en}, row ${row.row_number}`)}
        disabled={isLoading || (field === 'deposit_amount' && window.RequestExchangeLogic.hasValue(row.exchange_rate))}
        onChange={event => {
          const raw = event.target.value.replace(/,/g, '');
          if (raw === '' || Number.isFinite(Number(raw))) updateRow(row.id, { [field]: raw });
        }} />,
    });
    const columns = [
      { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px' },
      ...(!isExchange ? [accountColumn('related_account_id', 'حساب مرتبط', 'Related Account', 'currency')] : []),
      { field: 'currency', header_fa: isExchange ? 'از ارز' : 'ارز', header_en: isExchange ? 'From Currency' : 'Currency', width: '70px' },
      ...(!isExchange ? [{ field: 'deposit_amount', header_fa: 'واریز', header_en: 'Deposit', width: '110px', render: formatNumberSafe }] : []),
      { field: 'withdrawal_amount', header_fa: isExchange ? 'از مبلغ' : 'برداشت', header_en: isExchange ? 'From Amount' : 'Withdrawal', width: '110px', render: formatNumberSafe },
      ...(isExchange ? [
        { field: 'destination_currency', header_fa: 'به ارز', header_en: 'To Currency', width: '90px' },
        exchangeNumberColumn('exchange_rate', 'نرخ تبدیل', 'Exchange Rate'),
        exchangeNumberColumn('deposit_amount', 'به مبلغ', 'To Amount'),
        accountColumn('related_account_id', 'از حساب', 'From Account', 'currency'),
        accountColumn('destination_account_id', 'به حساب', 'To Account', 'destination_currency'),
      ] : []),
      {
        field: 'approved_amount', header_fa: 'مبلغ تایید شده', header_en: 'Approved Amount', width: '140px',
        render: (value, row) => <TextField size="sm" value={value ?? ''} dir="ltr" isRtl={isRtl}
          disabled={isLoading} aria-label={t(`مبلغ تایید شده ردیف ${row.row_number}`, `Approved amount, row ${row.row_number}`)}
          onChange={event => {
            const raw = event.target.value.replace(/,/g, '');
            if (raw === '' || Number.isFinite(Number(raw))) updateRow(row.id, { approved_amount: raw });
          }} />,
      },
      { field: 'remaining_amount', header_fa: isExchange ? 'مانده' : 'مبلغ مانده', header_en: 'Remaining', width: '110px',
        render: (_, row) => formatNumberSafe(Math.max(getRequestedAmount(row) - Number(row.approved_amount || 0), 0)) },
      ...(isExchange ? [{ field: 'approved_receipt', header_fa: 'مبلغ تبدیل شده', header_en: 'Converted Amount', width: '140px',
        render: (_, row) => formatNumberSafe(window.RequestExchangeLogic.approvedReceipt(row, lookups.currencies)) }] : []),
      { field: 'description', header_fa: 'شرح', header_en: 'Description', width: '180px' },
    ];
    const renderStatusActions = handleSave => (
      <div className="flex items-center gap-2 flex-wrap" onClick={event => event.stopPropagation()}>
        {header.id && getActions(header.status, access).map(action => (
          <Button key={action.id} variant="outline" size="sm" disabled={isLoading}
            className={`!py-0.5 !h-6 ${buttonColors[action.to_status]}`} onClick={() => open(action, handleSave)}>
            {t(action.action_label_fa, action.action_label_en)}
          </Button>
        ))}
      </div>
    );
    const renderStatusModals = handleSave => {
      const combined = modal?.action.data_entry_form === 'ACCOUNTS_AMOUNTS';
      const assignGroup = modal?.assigneeKind === 'GROUP';
      return <Modal isOpen={!!modal} onClose={close} language={language}
        title={combined ? t('تعیین حساب‌ها و مبالغ تایید شده', 'Accounts and Approved Amounts') : t('توضیحات انجام دهنده', 'Performer Note')}
        width={combined ? 'max-w-7xl' : 'max-w-lg'}>
        {modal && <div className={`p-4 flex flex-col gap-4 ${combined ? 'h-[72vh] min-h-[600px] md:min-h-[500px]' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          {combined && <div className="flex-1 min-h-0">
            <DataGrid data={modal.rows} columns={columns} language={language} hideImport={true}
              hideExport={true} hideToolbar={true} selectable={false} actionWidth="0px" minVisibleRows={6} className="h-full" />
          </div>}
          <div className={combined ? 'grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 border-t border-slate-200 dark:border-slate-700 pt-4' : ''}>
            <TextAreaField label={t('توضیحات انجام دهنده (اختیاری)', 'Performer Note (optional)')}
              value={modal.note} onChange={event => setModal(previous => ({ ...previous, note: event.target.value }))}
              rows={combined ? 4 : 3} isRtl={isRtl} disabled={isLoading} />
            {combined && <div className="flex flex-col gap-3 min-w-0">
              <RadioGroup label={t('ارجاع به', 'Assign To')} isRtl={isRtl} disabled={isLoading}
                value={modal.assigneeKind} options={[
                  { value: 'USER', label: t('کاربر', 'User') },
                  { value: 'GROUP', label: t('گروه کاربری', 'User Group') },
                ]} onChange={kind => setModal(previous => previous.assigneeKind === kind
                  ? previous : { ...previous, assigneeKind: kind, assignee: null })} />
              <LOVField key={modal.assigneeKind} size="sm" required isRtl={isRtl}
                label={assignGroup ? t('گروه مسئول ثبت تراکنش', 'Transaction Assignee Group') : t('مسئول ثبت تراکنش', 'Transaction Assignee')}
                data={assignees.rows.filter(row => row.kind === modal.assigneeKind)} columns={[
                  { field: 'title', header_fa: assignGroup ? 'گروه کاربری' : 'کاربر', header_en: assignGroup ? 'User Group' : 'User', width: '240px' },
                  { field: 'code', header_fa: 'شناسه', header_en: 'Identifier', width: '140px' },
                ]} dropdownWidth="min-w-[280px]" dropdownPlacement="auto" disabled={isLoading || assignees.loading || !!assignees.error}
                placeholder={assignees.loading ? t('در حال دریافت...', 'Loading...') : assignGroup ? t('انتخاب گروه کاربری', 'Select user group') : t('انتخاب کاربر', 'Select user')}
                displayValue={assignees.rows.find(row => row.key === window.RequestAssignmentLogic.key(modal.assignee))?.title || ''}
                onChange={choice => setModal(previous => ({ ...previous, assignee: choice?.kind === previous.assigneeKind ? { kind: choice.kind, id: choice.id } : null }))} />
              {assignees.error
                ? <div role="alert" className="text-[12px] text-red-600 dark:text-red-400">{t('خطا در دریافت کاربران و گروه‌ها: ', 'Could not load users and groups: ')}{assignees.error}</div>
                : <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {assignGroup ? t('هر یک از اعضای فعال این گروه می‌تواند تراکنش را ثبت کند.', 'Any active member of this group can create the transaction.')
                    : t('ثبت تراکنش این درخواست به کاربر انتخاب‌شده ارجاع می‌شود.', 'The selected user will be responsible for creating this transaction.')}
                </p>}
            </div>}
          </div>
          <div className="flex items-center justify-end gap-2 shrink-0">
            <Button variant="outline" size="sm" disabled={isLoading} onClick={close}>{t('انصراف', 'Cancel')}</Button>
            <Button variant="primary" size="sm" isLoading={isLoading} disabled={isLoading || (combined && (assignees.loading || !!assignees.error))}
              onClick={() => submit(handleSave)}>{t('ثبت', 'Save')}</Button>
          </div>
        </div>}
      </Modal>;
    };
    return { renderStatusActions, renderStatusModals, openStatusAction: open };
  };

  const useRequestBulkStatusActions = ({ records, selectedIds, access, dataScope, currentUserId,
    currentUserName, supabase, language, t, showToast, onOpenSingle, onSaved, setSelectedIds, isLoading }) => {
    const [batch, setBatch] = useState(null);
    const [busy, setBusy] = useState(false);
    const saving = useRef(false);
    const { Button } = window.DSCore;
    const { Modal } = window.DSFeedback;
    const { TextAreaField } = window.DSForms;
    const selected = records.filter(record => selectedIds.includes(record.id));
    const available = getBulkActions(selected, access, dataScope, currentUserId, selectedIds.length);

    const run = async (group, note = '') => {
      if (saving.current) return;
      saving.current = true;
      setBusy(true);
      const succeeded = [];
      const failed = [];
      try {
        for (const entry of group.entries) {
          try {
            // Reuse the individual handler: permissions, live status, balance and history.
            await changeStatus({ supabase, header: entry.record, action: entry.action, access, dataScope,
              currentUserId, currentUserName, items: entry.record.req_request_items || [],
              input: { approver_note: note }, accounts: [], t });
            succeeded.push(entry.record.id);
          } catch (error) {
            failed.push({ ...entry, error: error.message });
          }
        }
        setSelectedIds(ids => ids.filter(id => !succeeded.includes(id)));
        if (group.action.data_entry_form === 'NOTE' && failed.length) {
          setBatch({ ...group, entries: failed, note });
        } else {
          setBatch(null);
        }
        await onSaved();
        const summary = t(`${succeeded.length} درخواست تغییر وضعیت یافت؛ ${failed.length} ناموفق.`,
          `${succeeded.length} requests updated; ${failed.length} failed.`);
        const errors = failed.map(entry => `${entry.record.request_code || entry.record.id}: ${entry.error}`).join('\n');
        showToast(errors ? `${summary}\n${errors}` : summary, failed.length ? 'error' : 'success');
      } finally {
        saving.current = false;
        setBusy(false);
      }
    };
    const actions = available.map(group => ({
      label: `${t(group.action.action_label_fa, group.action.action_label_en)}${group.entries.length < selectedIds.length ? ` (${group.entries.length}/${selectedIds.length})` : ''}`,
      variant: 'outline',
      className: buttonColors[group.action.to_status],
      clearSelectionOnClick: false,
      disabled: busy || isLoading || !!batch,
      onClick: ids => {
        if (saving.current || isLoading || batch) return;
        const current = getBulkActions(records.filter(record => ids.includes(record.id)), access, dataScope, currentUserId, ids.length)
          .find(candidate => candidate.key === group.key);
        if (!current) return;
        if (current.action.data_entry_form && current.action.data_entry_form !== 'NOTE') {
          onOpenSingle(current.entries[0].record, current.entries[0].action);
        } else if (current.action.data_entry_form === 'NOTE') {
          setBatch({ ...current, note: '' });
        } else {
          run(current);
        }
      },
    }));
    const modal = <Modal isOpen={!!batch} onClose={() => { if (!saving.current) setBatch(null); }}
      title={t('توضیحات انجام دهنده', 'Performer Note')} language={language} width="max-w-lg">
      {batch && <div className="p-4 flex flex-col gap-3" dir={language === 'fa' ? 'rtl' : 'ltr'}>
        <div className="text-[12px] text-slate-600 dark:text-slate-300">
          {t(`${batch.entries.length} درخواست — این توضیحات برای هر درخواست ثبت می‌شود.`,
            `${batch.entries.length} requests — this note will be saved for each request.`)}
        </div>
        {batch.entries.some(entry => entry.error) && <div role="alert" className="text-[12px] text-red-600 dark:text-red-400">
          {batch.entries.filter(entry => entry.error).map(entry => <div key={entry.record.id}>{entry.record.request_code}: {entry.error}</div>)}
        </div>}
        <TextAreaField label={t('توضیحات انجام دهنده (اختیاری)', 'Performer Note (optional)')}
          value={batch.note} onChange={event => setBatch(previous => ({ ...previous, note: event.target.value }))}
          rows={3} isRtl={language === 'fa'} disabled={busy} />
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setBatch(null)}>{t('انصراف', 'Cancel')}</Button>
          <Button variant="primary" size="sm" isLoading={busy} disabled={busy}
            onClick={() => run(batch, batch.note)}>{t('ثبت', 'Save')}</Button>
        </div>
      </div>}
    </Modal>;
    return { actions, modal, busy };
  };

  window.RequestStatusActions = { transitions, canPerform, getActions, getBulkActions, recordAccess,
    getRatesForDate, validateBalance, validateItems, changeStatus, normalizeNeedDate, isOverdue, useTodayKey };
  window.useRequestStatusActions = useRequestStatusActions;
  window.useRequestBulkStatusActions = useRequestBulkStatusActions;
})();
