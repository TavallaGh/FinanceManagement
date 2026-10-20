/* Request-to-transaction mapping and shared guards; no alternate transaction UI. */
(() => {
  const amount = value => Number(String(value ?? '').replace(/,/g, ''));
  const same = (a, b) => String(a ?? '') === String(b ?? '');
  const ownOnly = scope => [].concat(scope?.own_data_only || []).some(value =>
    value === true || value === 1 || value === '1' || value === 'true');
  const assertScope = (record, security, formCode, userId, t) => {
    if (!security?.getActions(formCode)?.canView ||
        (ownOnly(security.getDataScope(formCode)) && !same(record.registrar_id, userId))) {
      throw new Error(t('اطلاعات خارج از دامنه دسترسی شما است.', 'Record is outside your access scope.'));
    }
  };
  const readItems = async (supabase, table, field, id) => {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const result = await supabase.from(table).select('*').eq(field, id)
        .order('row_number').order('id').range(offset, offset + 499);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 500) return rows;
    }
  };
  const readRequest = async (supabase, id, withItems = false) => {
    const result = await supabase.from('req_requests').select('*').eq('id', id).single();
    if (result.error) throw result.error;
    if (withItems) result.data.req_request_items = await readItems(supabase, 'req_request_items', 'request_id', id);
    return result.data;
  };
  const readTransaction = async (supabase, id) => {
    const result = await supabase.from('fm_transactions').select('*').eq('id', id).single();
    if (result.error) throw result.error;
    result.data.fm_transaction_items = await readItems(supabase, 'fm_transaction_items', 'transaction_id', id);
    return result.data;
  };
  const findTransaction = async (supabase, requestId) => {
    const result = await supabase.from('fm_transactions').select('id, document_code, status, registrar_id')
      .eq('request_id', requestId).maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  };
  const assertInProgress = (request, t) => {
    if (request.status !== 'IN_PROGRESS') {
      throw new Error(t('ثبت و ویرایش تراکنش فقط برای درخواست «در حال انجام» مجاز است.',
        'Transactions can only be created or edited while the request is In Progress.'));
    }
  };
  const buildItems = (request, currencies, t) => {
    const source = request.req_request_items || [];
    if (!source.length) throw new Error(t('درخواست فاقد قلم است.', 'Request has no items.'));
    if (request.request_type === 'EXCHANGE') {
      window.RequestExchangeLogic.validate(source, t, { requireReceipt: true });
    }
    const rows = source.flatMap(item => {
      const approved = amount(item.approved_amount);
      const requested = request.request_type === 'EXCHANGE' ? amount(item.withdrawal_amount)
        : Math.max(amount(item.deposit_amount), amount(item.withdrawal_amount));
      if (item.approved_amount == null || item.approved_amount === '' || !Number.isFinite(approved) ||
          !Number.isFinite(requested) || approved < 0 || approved > requested || !item.related_account_id) {
        throw new Error(t(`حساب یا مبلغ تایید شده ردیف ${item.row_number} معتبر نیست.`,
          `Invalid account or approved amount in row ${item.row_number}.`));
      }
      const base = {
        request_item_id: item.id,
        account_id: item.related_account_id,
        transaction_action: item.transaction_action,
        transaction_group: request.request_type === 'EXCHANGE' ? 'BALANCE' : item.transaction_group,
        cost_type_id: request.request_type === 'EXCHANGE' ? null : item.cost_type_id,
        income_type_id: request.request_type === 'EXCHANGE' ? null : item.income_type_id,
        center_id: item.center_id,
        party_id: item.party_id,
        project_id: item.project_id,
        currency: item.currency,
        description: item.description || request.description || '',
      };
      if (request.request_type === 'EXCHANGE') {
        if (!item.destination_account_id) throw new Error(t('حساب مقصد تبدیل ارز مشخص نشده است.', 'Exchange destination account is missing.'));
        return [
          { ...base, transaction_action: 'WITHDRAWAL', deposit_amount: 0, withdrawal_amount: approved },
          { ...base, account_id: item.destination_account_id, currency: item.destination_currency,
            transaction_action: 'DEPOSIT', withdrawal_amount: 0,
            deposit_amount: window.RequestExchangeLogic.approvedReceipt(item, currencies) },
        ];
      }
      if (!['DEPOSIT', 'WITHDRAWAL'].includes(item.transaction_action)) {
        throw new Error(t('نوع عملیات قلم درخواست معتبر نیست.', 'Invalid request item action.'));
      }
      return [{ ...base, deposit_amount: item.transaction_action === 'DEPOSIT' ? approved : 0,
        withdrawal_amount: item.transaction_action === 'WITHDRAWAL' ? approved : 0 }];
    });
    return rows.map((item, index) => ({ ...item, row_number: index + 1, _tempId: crypto.randomUUID() }));
  };
  const validateItems = (request, header, items, lookups, t) => {
    const type = request.request_type === 'TRANSFER' ? 'TRANSFER' : 'GENERAL';
    if (header.transaction_type !== type) throw new Error(t('نوع تراکنش با درخواست مطابقت ندارد.', 'Transaction type does not match the request.'));
    const expected = request.request_type === 'EXCHANGE' ? buildItems(request, lookups.currencies, t) : [];
    // Editing follows the transaction form; only exchange pair structure is additional.
    if (expected.length && items.length !== expected.length) throw new Error(t('هر تبدیل ارز باید دو قلم برداشت و واریز داشته باشد.', 'Each exchange must have a withdrawal and a deposit.'));
    const used = new Set();
    for (const item of items) {
      const index = expected.findIndex((row, i) => !used.has(i) && same(row.request_item_id, item.request_item_id)
        && row.transaction_action === item.transaction_action);
      const row = expected[index];
      if (expected.length && (!row || row.currency !== item.currency ||
          (row.transaction_action === 'DEPOSIT' ? amount(item.withdrawal_amount) !== 0 : amount(item.deposit_amount) !== 0))) {
        throw new Error(t('هر تبدیل باید یک برداشت از ارز مبدأ و یک واریز به ارز مقصد داشته باشد.',
          'Each exchange must have one source-currency withdrawal and one destination-currency deposit.'));
      }
      used.add(index);
      const account = lookups.leafAccounts.find(candidate => same(candidate.id, item.account_id));
      if (!account || (account.currency_code && account.currency_code !== item.currency)) {
        throw new Error(t('حساب قلم غیرفعال، غیرمجاز یا دارای ارز متفاوت است.', 'Item account is inactive, inaccessible or has a different currency.'));
      }
    }
  };
  const validateRates = (rates, items, t) => {
    const connected = new Set(['USD']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [pair, value] of Object.entries(rates)) {
        if (!(Number(value) > 0) || !Number.isFinite(Number(value))) continue;
        const [from, to] = pair.split('_');
        if (connected.has(from) !== connected.has(to)) {
          connected.add(from); connected.add(to); changed = true;
        }
      }
    }
    for (const currency of new Set(['IRR', ...items.map(item => item.currency)])) {
      if (!connected.has(currency)) throw new Error(t(`نرخ معتبر تبدیل ${currency} برای تاریخ تراکنش موجود نیست.`,
        `No valid ${currency} conversion rate is available for the transaction date.`));
    }
  };
  const assertMutable = async (supabase, transaction, t, allowLocked = false) => {
    if (transaction.id) {
      const live = await supabase.from('fm_transactions').select('*').eq('id', transaction.id).single();
      if (live.error) throw live.error;
      transaction = live.data;
    }
    if (!allowLocked && ['FINAL', 'APPROVED'].includes(transaction.status)) {
      throw new Error(t('وضعیت تراکنش اجازه ویرایش نمی‌دهد.', 'Transaction status prevents editing.'));
    }
    if (!transaction.request_id) return null;
    const request = await readRequest(supabase, transaction.request_id);
    assertInProgress(request, t);
    return request;
  };
  const deleteTransaction = async (supabase, transaction, t) => {
    const request = await assertMutable(supabase, transaction, t);
    let unlinked = false;
    try {
      if (request?.transaction_id) {
        const result = await supabase.from('req_requests').update({ transaction_id: null })
          .eq('id', request.id).eq('status', 'IN_PROGRESS').eq('transaction_id', transaction.id).select('id');
        if (result.error) throw result.error;
        if (result.data.length !== 1) throw new Error(t('درخواست تغییر کرده است.', 'Request changed.'));
        unlinked = true;
      }
      const result = await supabase.from('fm_transactions').delete().eq('id', transaction.id)
        .in('status', ['DRAFT', 'TEMPORARY']).select('id');
      if (result.error) throw result.error;
      if (result.data.length !== 1) throw new Error(t('تراکنش حذف نشد؛ وضعیت یا دسترسی تغییر کرده است.', 'Transaction was not deleted; status or access changed.'));
    } catch (error) {
      if (unlinked) {
        const restored = await supabase.from('req_requests').update({ transaction_id: transaction.id })
          .eq('id', request.id).eq('status', 'IN_PROGRESS').is('transaction_id', null).select('id');
        if (restored.error || restored.data?.length !== 1) {
          throw new Error(t('حذف ناموفق بود؛ ارتباط درخواست را بررسی کنید.', 'Delete failed; inspect the request link.'));
        }
      }
      throw error;
    }
  };
  const requireCompletedLink = async (supabase, request, t) => {
    if (!request.transaction_id) throw new Error(t('ابتدا تراکنش مربوط به درخواست را ثبت کنید.', 'Save the linked transaction first.'));
    const transaction = await readTransaction(supabase, request.transaction_id);
    if (!same(transaction.request_id, request.id) || !transaction.fm_transaction_items.length) {
      throw new Error(t('تراکنش مرتبط کامل نیست؛ ابتدا آن را بررسی و ذخیره کنید.', 'Linked transaction is incomplete. Review and save it first.'));
    }
    return transaction;
  };
  window.RequestTransactionLogic = { amount, same, assertScope, readItems, readRequest, readTransaction,
    findTransaction, assertInProgress, buildItems, validateItems, validateRates, assertMutable, deleteTransaction, requireCompletedLink };
})();
