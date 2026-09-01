/* Filename: financial/BalanceMonthlyReportDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect } = React;
  const FallbackComponent = () => null;
  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const DSGrid = window.DSGrid || DS || {};
  const DSFeedback = window.DSFeedback || window.DSOverlays || DS || {};
  const SystemBadge = Core.Badge || FallbackComponent;
  const SystemDataGrid = DSGrid.DataGrid || FallbackComponent;
  const SystemEmptyState = Core.EmptyState || FallbackComponent;
  const SystemModal = DSFeedback.Modal || FallbackComponent;

  const getInitialCellDrillModal = () => ({
    isOpen: false,
    kind: 'account',
    accountId: '',
    accountLabel: '',
    accountCode: '',
    currencyCode: '',
    currencyLabel: '',
    date: '',
    periodFrom: '',
    periodTo: '',
    balance: null,
    items: []
  });

  const getMonthlyDrillLookups = (t) => ({
    txTypes: {
      NORMAL: t('عادی', 'Normal'),
      OPENING: t('افتتاحیه', 'Opening'),
      CLOSING: t('اختتامیه', 'Closing'),
      ADJUSTMENT: t('اصلاحی', 'Adjustment'),
      TRANSFER: t('انتقال', 'Transfer')
    },
    txActions: {
      DEPOSIT: t('واریز', 'Deposit'),
      WITHDRAWAL: t('برداشت', 'Withdrawal'),
    },
    txGroups: {
      COST: t('هزینه', 'Cost'),
      INCOME: t('درآمد', 'Income'),
      BALANCE: t('بالانس', 'Balance'),
      OTHER: t('سایر', 'Other'),
    },
    statusColors: {
      DRAFT: 'slate',
      TEMPORARY: 'orange',
      FINAL: 'blue',
      APPROVED: 'emerald'
    },
    statusLabels: {
      DRAFT: t('یادداشت', 'Draft'),
      TEMPORARY: t('موقت', 'Temporary'),
      FINAL: t('بررسی شده', 'Final'),
      APPROVED: t('تایید شده', 'Approved'),
    }
  });

  const createCellDrillModalState = ({
    reportData,
    row,
    slot,
    val,
    isRtl,
    normalizeSlashDate = (v) => String(v || '').replace(/-/g, '/'),
  }) => {
    if (!reportData || !row || !slot) return null;
    const periodFrom = String(slot.periodFrom || '');
    const periodTo = String(slot.periodTo || slot.targetDate || '');
    if (!periodFrom || !periodTo) return null;

    const rowLeafIds = Array.isArray(row._leafIds) ? row._leafIds.map((id) => String(id)) : [];
    const leafIds = rowLeafIds.length > 0
      ? rowLeafIds
      : (row._accountId ? [String(row._accountId)] : []);
    const leafSet = new Set(leafIds);
    const drillKind = row._type === 'currency_header' ? 'currency' : 'account';

    const items = (reportData.detailItems || [])
      .filter((item) => {
        const docDate = normalizeSlashDate(item._doc_date);
        if (!docDate || docDate < periodFrom || docDate > periodTo) return false;
        if (row._type === 'grand_total') return true;
        if (leafSet.size === 0) return false;
        return leafSet.has(String(item.account_id || ''));
      })
      .sort((a, b) => {
        const accCmp = String(a._account_code || '').localeCompare(String(b._account_code || ''));
        if (accCmp !== 0) return accCmp;
        const dateCmp = String(a._doc_date || '').localeCompare(String(b._doc_date || ''));
        if (dateCmp !== 0) return dateCmp;
        const docCmp = String(a._doc_code || '').localeCompare(String(b._doc_code || ''));
        if (docCmp !== 0) return docCmp;
        const rowCmp = (parseInt(a.row_number || 0, 10) || 0) - (parseInt(b.row_number || 0, 10) || 0);
        if (rowCmp !== 0) return rowCmp;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });

    const isLeaf = row._type === 'leaf';
    const isCurrency = row._type === 'currency_header';
    const accountId = isLeaf ? String(row._accountId || '') : '';
    const account = reportData.reportAccountLookup?.get(accountId) || null;
    const accountLabel = row._title || (isLeaf
      ? `${account?.code || ''} - ${isRtl ? (account?.title_fa || account?.title_en || '') : (account?.title_en || account?.title_fa || '')}`.trim()
      : '');
    const balanceValue = isLeaf
      ? (val?.nat ?? null)
      : (isCurrency ? (val?.nat ?? null) : null);

    return {
      isOpen: true,
      kind: drillKind,
      accountId,
      accountLabel,
      accountCode: account?.code || '',
      currencyCode: row._currency || '',
      currencyLabel: row._currency || '',
      date: periodTo,
      periodFrom,
      periodTo,
      balance: balanceValue,
      items,
    };
  };

  const BalanceMonthlyReportDetailsModal = ({
    isOpen = false,
    onClose = () => {},
    language = 'fa',
    t = (fa, en) => fa,
    isRtl = false,
    fmtDecimal = (value) => String(value),
    fmtDate = (value) => value,
    reportData = null,
    cellDrillModal = {},
    initialGridState = { pageSize: 10 },
    reportAccountLookup = new Map(),
    txTypes = {},
    txActions = {},
    txGroups = {},
    statusColors = {},
    statusLabels = {},
    COST_TYPE_LOOKUP = new Map(),
    INCOME_TYPE_LOOKUP = new Map(),
    CENTER_LOOKUP = new Map(),
    resolveConversionRate = () => 0,
    Badge = SystemBadge,
    DataGrid = SystemDataGrid,
    EmptyState = SystemEmptyState,
    Modal = SystemModal,
    formCode = 'FIN_BALANCE_MONTHLY_REPORT'
  }) => {
    const [cellDrillGridState, setCellDrillGridState] = useState(() => ({ pageSize: 10, ...(initialGridState || {}) }));

    useEffect(() => {
      if (isOpen) {
        setCellDrillGridState((prev) => ({ ...prev, ...(initialGridState || {}) }));
      }
    }, [isOpen, initialGridState]);

    if (!isOpen) return null;

    const fallbackLookups = getMonthlyDrillLookups(t);
    const effectiveTxTypes = Object.keys(txTypes || {}).length ? txTypes : fallbackLookups.txTypes;
    const effectiveTxActions = Object.keys(txActions || {}).length ? txActions : fallbackLookups.txActions;
    const effectiveTxGroups = Object.keys(txGroups || {}).length ? txGroups : fallbackLookups.txGroups;
    const effectiveStatusColors = Object.keys(statusColors || {}).length ? statusColors : fallbackLookups.statusColors;
    const effectiveStatusLabels = Object.keys(statusLabels || {}).length ? statusLabels : fallbackLookups.statusLabels;

    const selectedItems = cellDrillModal.items || [];
    const account = reportAccountLookup.get(String(cellDrillModal.accountId || '')) || null;
    const accountTitle = account
      ? (isRtl
          ? (account.title_fa || account.title_en || account.code || '-')
          : (account.title_en || account.title_fa || account.code || '-'))
      : cellDrillModal.accountLabel || '-';
    const accountCode = account?.code || cellDrillModal.accountCode || '-';
    const accountCurrency = account?.currency_code || '';
    const drillKind = cellDrillModal.kind || 'account';
    const drillCurrencyCode = cellDrillModal.currencyCode || '';
    const drillCurrencyLabel = cellDrillModal.currencyLabel || drillCurrencyCode || '-';
    const cellBalance = cellDrillModal.balance;
    const balanceCurrencyCode = String(accountCurrency || drillCurrencyCode || '').toUpperCase();
    const itemsCount = selectedItems.length;
    const drillConversionCache = new Map();

    const resolveItemAmounts = (item) => {
      const rawDep = parseFloat(item.deposit_amount || 0) || 0;
      const rawWid = parseFloat(item.withdrawal_amount || 0) || 0;
      const amount = rawDep > 0 ? rawDep : rawWid;
      const currencyCode = String(item._account_currency_code || item._account?.currency_code || '').toUpperCase();
      const docDate = String(item._doc_date || cellDrillModal.periodTo || cellDrillModal.date || '');
      const storedToUsd = parseFloat(item._stored_exchange_rate_to_usd || item.exchange_rate_to_usd || 0) || 0;
      const storedUsdToIrr = parseFloat(item._stored_exchange_rate_usd_to_irr || item.exchange_rate_usd_to_irr || 0) || 0;
      const rateToUsd = storedToUsd > 0
        ? storedToUsd
        : resolveConversionRate(reportData?.rateLookup || new Map(), currencyCode, 'USD', docDate, drillConversionCache);
      const rateToIrr = (storedToUsd > 0 && storedUsdToIrr > 0)
        ? (storedToUsd * storedUsdToIrr)
        : resolveConversionRate(reportData?.rateLookup || new Map(), currencyCode, 'IRR', docDate, drillConversionCache);
      return {
        rawDep,
        rawWid,
        amount,
        signedUsd: (rawDep - rawWid) * rateToUsd,
        signedIrr: (rawDep - rawWid) * rateToIrr,
      };
    };

    const itemTotals = selectedItems.reduce((totals, item) => {
      const amounts = resolveItemAmounts(item);
      totals.deposit += amounts.rawDep;
      totals.withdrawal += amounts.rawWid;
      totals.net += amounts.rawDep - amounts.rawWid;
      return totals;
    }, { deposit: 0, withdrawal: 0, net: 0 });

    const balanceToUsdRate = balanceCurrencyCode
      ? resolveConversionRate(reportData?.rateLookup || new Map(), balanceCurrencyCode, 'USD', String(cellDrillModal.periodTo || cellDrillModal.date || ''), drillConversionCache)
      : 0;
    const balanceToIrrRate = balanceCurrencyCode
      ? resolveConversionRate(reportData?.rateLookup || new Map(), balanceCurrencyCode, 'IRR', String(cellDrillModal.periodTo || cellDrillModal.date || ''), drillConversionCache)
      : 0;
    const balanceUsd = (cellBalance === null || cellBalance === undefined) ? null : (parseFloat(cellBalance || 0) || 0) * balanceToUsdRate;
    const balanceIrr = (cellBalance === null || cellBalance === undefined) ? null : (parseFloat(cellBalance || 0) || 0) * balanceToIrrRate;

    const modalColumns = [
      { field: '_doc_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '90px', render: (val) => React.createElement('span', { className: 'text-indigo-600 dark:text-indigo-400 font-bold text-[12px]' }, val || '-') },
      { field: '_tx_status', header_fa: 'وضعیت سند', header_en: 'Document Status', width: '95px', render: (val) => React.createElement(Badge, { variant: effectiveStatusColors[val] || 'gray', size: 'sm' }, effectiveStatusLabels[val] || val || '-') },
      { field: '_tx_type', header_fa: 'نوع سند', header_en: 'Document Type', width: '100px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block', title: val }, effectiveTxTypes[val] || val || '-') },
      { field: '_registrar_name', header_fa: 'نام ثبت‌کننده', header_en: 'Registrar', width: '140px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300', title: val }, val || '-') },
      { field: '_tx_description', header_fa: 'شرح سربرگ', header_en: 'Header Description', width: '130px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block max-w-xs', title: val }, val || '-') },
      { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px', render: (_, __, rowIndex) => React.createElement('span', { className: 'text-[12px] font-medium text-slate-600 dark:text-slate-400' }, rowIndex + 1) },
      { field: '_account_code', header_fa: 'کد حساب', header_en: 'Account Code', width: '100px', render: (val) => React.createElement('span', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300', dir: 'ltr' }, val || '-') },
      { field: '_account_title', header_fa: 'عنوان حساب', header_en: 'Account Title', width: '220px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300', title: val }, val || '-') },
      { field: 'transaction_action', header_fa: 'نوع', header_en: 'Action', width: '90px', render: (val) => {
        const color = val === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400';
        return React.createElement('span', { className: `text-[12px] font-medium ${color}` }, effectiveTxActions[val] || val || '-');
      }},
      { field: 'transaction_group', header_fa: 'گروه', header_en: 'Group', width: '75px', render: (val) => React.createElement('span', { className: 'text-[12px]' }, effectiveTxGroups[val] || val || '-') },
      { field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '65px' },
      { field: 'deposit_amount', header_fa: 'مبلغ واریز', header_en: 'Deposit', width: '110px', render: (val) => React.createElement('span', { className: 'text-[12px] font-medium text-emerald-600 dark:text-emerald-500', dir: 'rtl' }, fmtDecimal(val || 0, 6)) },
      { field: 'withdrawal_amount', header_fa: 'مبلغ برداشت', header_en: 'Withdrawal', width: '110px', render: (val) => React.createElement('span', { className: 'text-[12px] font-medium text-rose-500 dark:text-rose-400', dir: 'rtl' }, fmtDecimal(val || 0, 6)) },
      { field: 'remained_amount', header_fa: 'مانده حساب', header_en: 'Account Balance', width: '120px', render: (_, row) => React.createElement('span', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300', dir: 'rtl' }, fmtDecimal(row.remained_amount, 6)) },
      { field: 'cost_income', header_fa: 'هزینه/درآمد', header_en: 'Cost/Income', width: '130px', render: (_, row) => {
        const item = row.cost_type_id ? COST_TYPE_LOOKUP.get(String(row.cost_type_id)) : INCOME_TYPE_LOOKUP.get(String(row.income_type_id || ''));
        const label = item
          ? (isRtl
              ? (item.displayLabel || item.titleFa || item.title_fa || '')
              : (item.displayLabel || item.titleEn || item.title_en || item.title_fa || ''))
          : '-';
        return React.createElement('span', { className: 'text-[12px] truncate block', title: label }, label);
      }},
      { field: 'center_id', header_fa: 'مرکز هزینه/درآمد', header_en: 'Center', width: '130px', render: (val) => {
        const item = CENTER_LOOKUP.get(String(val || ''));
        const label = item ? (isRtl ? (item.title_fa || item.titleFa || item.title_en || item.titleEn || '') : (item.title_en || item.titleEn || item.title_fa || item.titleFa || '')) : (val || '-');
        return React.createElement('span', { className: 'text-[12px] truncate block', title: label }, label);
      }},
      { field: 'description', header_fa: 'شرح قلم', header_en: 'Item Desc.', width: '150px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block max-w-sm', title: val }, val || '-') },
    ];

    return React.createElement(Modal, {
      isOpen,
      onClose,
      title: t('اقلام تراکنش دوره', 'Period Transaction Items'),
      language,
      width: 'max-w-7xl'
    },
      React.createElement('div', { className: 'p-3 flex flex-col gap-3 max-h-[80vh] overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg' },
        React.createElement('div', { className: 'flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 shrink-0' },
          React.createElement('div', { className: 'min-w-0 flex-1' },
            React.createElement('div', { className: 'flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300' },
              React.createElement('span', { className: 'font-black text-indigo-600 dark:text-indigo-400' }, drillKind === 'currency' ? t('شرح ارز', 'Currency Name') : t('شرح حساب', 'Account Name')),
              React.createElement('span', null, '•'),
              React.createElement('span', { className: 'truncate font-bold text-slate-700 dark:text-slate-100' }, drillKind === 'currency' ? drillCurrencyLabel : accountTitle)
            ),
            React.createElement('div', { className: 'mt-0.5 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300' },
              drillKind === 'currency'
                ? React.createElement('span', { className: 'truncate' }, `${t('کد ارز', 'Currency Code')}: ${drillCurrencyCode}`)
                : React.createElement('span', { className: 'truncate' }, `${t('کد حساب', 'Account Code')}: ${accountCode}`),
              React.createElement('span', { className: 'truncate' }, `${t('از', 'From')}: ${fmtDate(cellDrillModal.periodFrom) || cellDrillModal.periodFrom || '-'}`),
              React.createElement('span', { className: 'truncate' }, `${t('تا', 'To')}: ${fmtDate(cellDrillModal.periodTo) || cellDrillModal.periodTo || '-'}`),
              drillKind === 'currency' && accountCurrency ? React.createElement('span', { className: 'truncate' }, `${t('ارز حساب', 'Account Currency')}: ${accountCurrency}`) : (!drillKind || drillKind === 'account') && accountCurrency ? React.createElement('span', { className: 'truncate' }, `${t('ارز', 'Currency')}: ${accountCurrency}`) : null
            )
          ),
          React.createElement('div', { className: 'flex flex-wrap items-center justify-end gap-2' },
            React.createElement(Badge, { variant: 'slate', size: 'sm' }, t(`${itemsCount} قلم`, `${itemsCount} items`)),
            drillKind === 'currency' && React.createElement(Badge, { variant: 'indigo', size: 'sm' }, drillCurrencyCode || '-')
          )
        ),
        React.createElement('div', { className: 'grid grid-cols-6 gap-2 shrink-0' },
          React.createElement('div', { className: 'rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-900/20 px-3 py-2' }, React.createElement('div', { className: 'text-[10px] font-bold text-indigo-600 dark:text-indigo-400' }, t('بالانس سلول', 'Cell Balance')), React.createElement('div', { className: 'mt-0.5 text-[13px] font-black text-indigo-700 dark:text-indigo-300 tabular-nums font-sans', dir: 'ltr' }, fmtDecimal(cellBalance, 6))),
          React.createElement('div', { className: 'rounded-lg border border-sky-100 dark:border-sky-900/40 bg-sky-50/70 dark:bg-sky-900/20 px-3 py-2' }, React.createElement('div', { className: 'text-[10px] font-bold text-sky-600 dark:text-sky-400' }, t('بالانس USD', 'USD Balance')), React.createElement('div', { className: 'mt-0.5 text-[13px] font-black text-sky-700 dark:text-sky-300 tabular-nums font-sans', dir: 'ltr' }, fmtDecimal(balanceUsd, 6))),
          React.createElement('div', { className: 'rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/20 px-3 py-2' }, React.createElement('div', { className: 'text-[10px] font-bold text-amber-600 dark:text-amber-400' }, t('بالانس IRR', 'IRR Balance')), React.createElement('div', { className: 'mt-0.5 text-[13px] font-black text-amber-700 dark:text-amber-300 tabular-nums font-sans', dir: 'ltr' }, fmtDecimal(balanceIrr, 6))),
          React.createElement('div', { className: 'rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-900/20 px-3 py-2' }, React.createElement('div', { className: 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400' }, t('کل واریز', 'Total Deposit')), React.createElement('div', { className: 'mt-0.5 text-[13px] font-black text-emerald-700 dark:text-emerald-300 tabular-nums font-sans', dir: 'ltr' }, fmtDecimal(itemTotals.deposit, 6))),
          React.createElement('div', { className: 'rounded-lg border border-rose-100 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-900/20 px-3 py-2' }, React.createElement('div', { className: 'text-[10px] font-bold text-rose-600 dark:text-rose-400' }, t('کل برداشت', 'Total Withdrawal')), React.createElement('div', { className: 'mt-0.5 text-[13px] font-black text-rose-700 dark:text-rose-300 tabular-nums font-sans', dir: 'ltr' }, fmtDecimal(itemTotals.withdrawal, 6))),
          React.createElement('div', { className: 'rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2' }, React.createElement('div', { className: 'text-[10px] font-bold text-slate-600 dark:text-slate-400' }, t('خالص تغییر', 'Net Change')), React.createElement('div', { className: 'mt-0.5 text-[13px] font-black text-slate-800 dark:text-slate-100 tabular-nums font-sans', dir: 'ltr' }, fmtDecimal(itemTotals.net, 6)))
        ),
        selectedItems.length === 0
          ? React.createElement(EmptyState, {
              title: t('اقلامی برای این سلول پیدا نشد', 'No items found for this cell'),
              description: t(
                'برای این بازه و این حساب/ارز، تراکنشی ثبت نشده است.',
                'No transaction items were found for this account/currency in the selected period.'
              ),
              language,
            })
            : React.createElement('div', { className: 'shrink-0 h-[52vh] min-h-[360px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' },
              React.createElement(DataGrid, {
                key: `cell-drill-monthly-${drillKind}-${cellDrillModal.accountId || 'account'}-${cellDrillModal.periodTo || 'to'}`,
                data: selectedItems,
                columns: modalColumns,
                language,
                formCode,
                hideImport: true,
                hideExport: true,
                hideToolbar: false,
                gridState: cellDrillGridState,
                onGridStateChange: setCellDrillGridState,
                defaultPinnedCols: ['_doc_code', '_tx_status'],
                pageSizeOptions: [5, 10, 20, 50],
                minVisibleRows: 5,
                toolbarContent: React.createElement('div', { className: 'text-[12px] text-slate-500 dark:text-slate-400' }, t('مرور اقلام اسناد مرتبط با این دوره.', 'Review related transaction items for this period.'))
              })
            )
      )
    );
  };

  window.BalanceMonthlyReportDetails = {
    getInitialCellDrillModal,
    createCellDrillModalState,
    getMonthlyDrillLookups,
  };
  window.BalanceMonthlyReportDetailsModal = BalanceMonthlyReportDetailsModal;
})();
