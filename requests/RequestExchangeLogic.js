/* One exchange item contains both the payment and receipt. */
(() => {
  const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '';
  const number = value => Number(String(value ?? '').replace(/,/g, ''));
  const decimals = (currency, currencies = []) => {
    const value = currencies.find(row => row.code === currency)?.decimal_places;
    return value != null && Number.isInteger(Number(value)) ? Number(value) : 2;
  };
  const round = (value, currency, currencies) => {
    const factor = 10 ** decimals(currency, currencies);
    return Math.round(value * factor) / factor;
  };
  const recalculate = (item, currencies) => {
    if (!hasValue(item.exchange_rate)) return item;
    const rate = number(item.exchange_rate);
    const paid = number(item.withdrawal_amount);
    return { ...item, deposit_amount: rate > 0 && paid > 0 && item.destination_currency
      ? round(paid * rate, item.destination_currency, currencies) : '' };
  };
  const validate = (items, t, { requireReceipt = false, accounts, requireAccounts = false } = {}) => {
    for (const item of items) {
      const fail = (fa, en) => { throw new Error(t(`ردیف ${item.row_number}: ${fa}`, `Row ${item.row_number}: ${en}`)); };
      if (!item.currency || !item.destination_currency) {
        fail('ارز مبدأ و مقصد را مشخص کنید؛ اقلام قدیمی باید به یک ردیف برای هر تبدیل اصلاح شوند.',
          'Select source and destination currencies; legacy items must be revised to one row per exchange.');
      }
      if (item.currency === item.destination_currency) fail('ارز مبدأ و مقصد باید متفاوت باشند.', 'Source and destination currencies must differ.');
      const paid = number(item.withdrawal_amount);
      const received = number(item.deposit_amount);
      if (!Number.isFinite(paid) || paid <= 0) fail('مبلغ پرداختی باید بیشتر از صفر باشد.', 'Payment must be greater than zero.');
      if (!Number.isFinite(received) || received < 0 || (requireReceipt && received <= 0)) {
        fail('مبلغ دریافتی معتبر وارد کنید.', 'Enter a valid receipt amount.');
      }
      if (hasValue(item.exchange_rate) && (!Number.isFinite(number(item.exchange_rate)) || number(item.exchange_rate) <= 0)) {
        fail('نرخ تبدیل باید بیشتر از صفر باشد.', 'Exchange rate must be greater than zero.');
      }
      if (accounts) {
        for (const [field, currency] of [['related_account_id', item.currency], ['destination_account_id', item.destination_currency]]) {
          if (!item[field] && !requireAccounts) continue;
          const account = accounts.find(row => String(row.id) === String(item[field]));
          if (!account) fail('حساب معتبر برای هر سمت انتخاب کنید.', 'Select a valid account for each side.');
          if (account.currency_code && account.currency_code !== currency) {
            fail('ارز حساب با ارز همان سمت مطابقت ندارد.', 'Account currency does not match its side.');
          }
        }
      }
    }
  };
  const approvedReceipt = (item, currencies) => {
    const paid = number(item.withdrawal_amount);
    if (!(paid > 0) || !(number(item.deposit_amount) > 0)) return 0;
    return round(number(item.approved_amount) * number(item.deposit_amount) / paid, item.destination_currency, currencies);
  };
  const summaryItems = (items, currencies) => items.flatMap(item => {
    // Unpaired legacy rows retain their original meaning until explicitly revised.
    if (!item.destination_currency) return [item];
    const approved = approvedReceipt(item, currencies);
    return [
      { ...item, id: `${item.id}:source`, transaction_action: 'WITHDRAWAL', deposit_amount: 0 },
      { ...item, id: `${item.id}:destination`, transaction_action: 'DEPOSIT', currency: item.destination_currency,
        withdrawal_amount: 0, approved_amount: approved,
        remaining_amount: Math.max(number(item.deposit_amount) - approved, 0) },
    ];
  });
  window.RequestExchangeLogic = { hasValue, number, recalculate, validate, approvedReceipt, summaryItems };
})();
