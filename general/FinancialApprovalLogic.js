/* Prototype application logic. The production backend must enforce the same rules atomically. */
(() => {
  const SETTINGS_KEY = 'financial_approval';
  const normalizeDate = value => {
    const text = String(value || '').replace(/\//g, '-');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
    const date = new Date(`${text}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : '';
  };
  const today = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const part = type => parts.find(p => p.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  const addDays = (value, count) => {
    const date = new Date(`${normalizeDate(value)}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0, 10);
  };
  const earliestClosingDate = (currentDate = today()) => addDays(currentDate, -7);
  const readAll = async (buildQuery) => {
    const rows = [];
    const size = 500;
    for (let offset = 0; ;) {
      const { data, error, count } = await buildQuery().order('id', { ascending: true }).range(offset, offset + size - 1);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error('Incomplete database response.');
      rows.push(...data);
      if (Number.isFinite(count)) {
        if (rows.length >= count) return rows;
        if (!data.length) throw new Error('Incomplete paginated database response.');
      } else if (data.length < size) return rows;
      offset += data.length;
    }
  };
  const readSettings = async (client, t) => {
    const { data, error } = await client.from('gen_system_settings')
      .select('setting_key, value, updated_at').eq('setting_key', SETTINGS_KEY).single();
    if (error) throw error;
    if (!normalizeDate(data?.value?.closed_through)) {
      throw new Error(t('تنظیم تاریخ بسته‌شده در دسترس نیست؛ ابتدا migration را اجرا کنید.',
        'The closing date is unavailable. Apply the database migration first.'));
    }
    return { ...data, value: { ...data.value, closed_through: normalizeDate(data.value.closed_through) } };
  };
  const validateApproval = (value, closedThrough, currentDate, t) => {
    const date = normalizeDate(value);
    const closed = normalizeDate(closedThrough);
    const current = normalizeDate(currentDate);
    if (!date || !closed || !current || date > current || date <= closed) {
      throw new Error(t('تاریخ تأیید باید بعد از آخرین روز بسته‌شده و حداکثر امروز باشد.',
        'Approval date must be after the last closed day and no later than today.'));
    }
    return date;
  };
  const checkApproval = async (client, value, t) => {
    const settings = await readSettings(client, t);
    return validateApproval(value, settings.value.closed_through, today(), t);
  };
  const saveClosingDate = async (client, value, original, security, formCode, t) => {
    if (!security?.getActions(formCode)?.canEdit) {
      throw new Error(t('مجوز ویرایش دوره‌های مالی لازم است.', 'Fiscal-period edit access is required.'));
    }
    const date = normalizeDate(value);
    if (!date || date > today() || date < earliestClosingDate()) {
      throw new Error(t('تاریخ بسته‌شده باید بین امروز و هفت روز قبل باشد.',
        'The closing date must be between today and seven days ago.'));
    }
    const current = await readSettings(client, t);
    if (current.updated_at !== original.updated_at) {
      throw new Error(t('تنظیمات تغییر کرده است؛ دوباره دریافت کنید.', 'Settings changed. Reload before saving.'));
    }
    const { data, error } = await client.from('gen_system_settings')
      .update({ value: { ...current.value, closed_through: date }, updated_at: new Date().toISOString() })
      .eq('setting_key', SETTINGS_KEY).eq('updated_at', current.updated_at).select().single();
    if (error) throw error;
    return data;
  };
  const readApprovedTransactions = async (client, endDate) => {
    const rows = await readAll(() => client.from('fm_transactions')
      .select('id, document_code, document_date, approval_date, status, transaction_type, reference_code, description, created_at, registrar_id, reviewed_at, approved_at, department_id, reviewed_by_name, approved_by_name', { count: 'exact' })
      .eq('status', 'APPROVED').or(`approval_date.lte.${normalizeDate(endDate)},approval_date.is.null`));
    if (rows.some(row => !normalizeDate(row.approval_date))) {
      throw new Error('Approved transactions are missing effective approval dates. Complete the backfill.');
    }
    return rows;
  };
  const readApprovedItems = (client, accountIds, endDate) => readAll(() => client.from('fm_transaction_items')
    .select('*, fm_transactions!inner(id, approval_date, status)', { count: 'exact' })
    .in('account_id', accountIds).eq('fm_transactions.status', 'APPROVED')
    .lte('fm_transactions.approval_date', normalizeDate(endDate)));
  const accountBalance = items => {
    let balance = 0;
    let balanceDate = '';
    for (const item of items) {
      const tx = Array.isArray(item.fm_transactions) ? item.fm_transactions[0] : item.fm_transactions;
      if (tx?.status !== 'APPROVED') continue;
      const date = normalizeDate(tx.approval_date);
      const deposit = Number(item.deposit_amount || 0);
      const withdrawal = Number(item.withdrawal_amount || 0);
      if (!date || !Number.isFinite(deposit) || !Number.isFinite(withdrawal)) {
        throw new Error('Incomplete approved transaction data.');
      }
      balance += deposit - withdrawal;
      if (date > balanceDate) balanceDate = date;
    }
    return { balance, balanceDate };
  };
  const withApprovalBalances = items => {
    const balances = new Map();
    const result = new Map();
    const ordered = [...items].sort((a, b) =>
      String(a.account_id).localeCompare(String(b.account_id)) ||
      String(a._approval_date).localeCompare(String(b._approval_date)) ||
      String(a._doc_code || '').localeCompare(String(b._doc_code || '')) ||
      (Number(a.row_number) || 0) - (Number(b.row_number) || 0) ||
      String(a.id).localeCompare(String(b.id)));
    for (const item of ordered) {
      if (item._tx_status !== 'APPROVED' || !normalizeDate(item._approval_date)) {
        throw new Error('Account balances require approved transactions with an effective approval date.');
      }
      const deposit = Number(item.deposit_amount || 0);
      const withdrawal = Number(item.withdrawal_amount || 0);
      if (!Number.isFinite(deposit) || !Number.isFinite(withdrawal)) throw new Error('Invalid transaction amount.');
      const id = String(item.account_id);
      const balance = (balances.get(id) || 0) + deposit - withdrawal;
      balances.set(id, balance);
      result.set(item, { ...item, remained_amount: balance });
    }
    return items.map(item => result.get(item));
  };
  window.FinancialApprovalLogic = {
    SETTINGS_KEY, normalizeDate, today, addDays, earliestClosingDate, readAll, readSettings,
    validateApproval, checkApproval, saveClosingDate, readApprovedTransactions, readApprovedItems, accountBalance,
    withApprovalBalances
  };
})();
