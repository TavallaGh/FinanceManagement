/* Filename: financial/BalanceReportTotal.js */
(() => {
  const React = window.React;

  // ── Fallbacks ─────────────────────────────────────────────────────────────
  const FallbackComponent = () => null;

  // ── Design System ─────────────────────────────────────────────────────────
  const DS         = window.DesignSystem || {};
  const Core       = window.DSCore || DS || {};
  const DSGrid     = window.DSGrid || DS || {};

  const EmptyState = Core.EmptyState || FallbackComponent;
  const DataGrid   = DSGrid.DataGrid || FallbackComponent;

  const BalanceReportTotal = ({
    language = 'fa',
    formCode = 'FIN_BALANCE_REPORT',
    activeTab = 'currency',
    reportData = null,
    reportGridStates = {},
    setReportGridStates = () => {},
    t = (fa, en) => fa,
    isRtl = false,
    fmt = (value) => String(value),
    fmtDecimal = (value) => String(value),
    buildDayColumns = () => [],
    openCurrencyCellDrill = () => {},
    resolveConversionRate = () => 0
  }) => {
    if (!reportData || activeTab === 'details') return null;

    const renderCurrencyGrid = () => {
      const { dates, currencyAccounts, currencyMatrix, showMovements, leafCount } = reportData;

      if (currencyAccounts.length === 0) {
        return React.createElement(EmptyState, {
          title: t('اطلاعاتی برای تجمیع ارزی یافت نشد', 'No currency summary data found'),
          description: t('برای این فیلترها حسابی با ارز مشخص پیدا نشد.', 'No account with a usable currency was found for the selected filters.'),
          language
        });
      }

      if (dates.length === 0) {
        return React.createElement(EmptyState, {
          title: t('بازه تاریخی نامعتبر است', 'Invalid date range'),
          description: t('بازه تاریخی وارد شده نامعتبر است.', 'The provided date range is invalid.'),
          language
        });
      }

      const gridRows = currencyAccounts.map(acc => {
        const row = { ...acc };
        dates.forEach(d => {
          row[d] = currencyMatrix[acc.id]?.[d] || {};
        });
        return row;
      });

      const dayColumns = buildDayColumns(showMovements, (val, row, dateIso, content) => {
        if (!val) return content;
        const day = val || {};
        return React.createElement('button', {
          type: 'button',
          className: 'w-full text-left cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 rounded px-0.5 py-0.5',
          onClick: () => openCurrencyCellDrill(row, dateIso, day.bal),
          title: t('کلیک کنید تا اقلام این روز و این ارز نمایش داده شود', 'Click to view items for this day and currency')
        }, content);
      }, (val) => {
        const day = val || {};
        if (showMovements) {
          return `dep: ${fmt(day.dep || 0)} | wid: ${fmt(day.wid || 0)} | bal: ${fmt(day.bal || 0)}`;
        }
        return fmt(day.bal || 0);
      });

      const columns = [
        {
          field: 'code',
          header_fa: 'کد ارز',
          header_en: 'Currency Code',
          width: '120px',
          render: (val) => React.createElement('span', { className: 'font-sans tabular-nums whitespace-nowrap font-black text-slate-700 dark:text-slate-200' }, val || '—')
        },
        {
          field: isRtl ? 'title_fa' : 'title_en',
          header_fa: 'عنوان ارز',
          header_en: 'Currency Title',
          width: '240px',
          render: (val, row) => React.createElement('div', {
            className: 'whitespace-normal break-words leading-5 font-medium text-slate-800 dark:text-slate-200',
            title: isRtl ? row.title_fa : (row.title_en || row.title_fa)
          }, React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('span', null, isRtl ? row.title_fa : (row.title_en || row.title_fa)),
            row.currency_symbol && React.createElement('span', { className: 'text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-full' }, row.currency_symbol)
          ))
        },
        {
          field: 'member_count',
          header_fa: 'تعداد حساب',
          header_en: 'Account Count',
          width: '110px',
          render: (val) => React.createElement('span', { className: 'font-sans tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap' }, fmt(val || 0))
        },
        ...dayColumns
      ];

      const toolbarContent = React.createElement('div', { className: 'flex items-center gap-2 flex-wrap text-[12px] text-slate-500 dark:text-slate-400 overflow-hidden' },
        React.createElement('span', { className: 'whitespace-nowrap' },
          t(
            `${currencyAccounts.length} ارز  ·  ${leafCount || 0} حساب`,
            `${currencyAccounts.length} currencies  ·  ${leafCount || 0} accounts`
          )
        ),
        React.createElement('span', { className: 'text-indigo-500 dark:text-indigo-400 whitespace-nowrap' },
          t('تجمیع بر اساس ارز حساب‌ها انجام شده است.', 'Balances are summarized by account currency.')
        )
      );

      return React.createElement(DataGrid, {
        key: `currency-report-${dates.length}-${currencyAccounts.length}`,
        data: gridRows,
        columns,
        language,
        formCode,
        hideToolbar: false,
        hideImport: true,
        defaultPinnedCols: ['code', isRtl ? 'title_fa' : 'title_en', 'member_count'],
        gridState: reportGridStates.currency,
        onGridStateChange: (state) => setReportGridStates(prev => ({ ...prev, currency: state })),
        groupable: false,
        pageSizeOptions: [20, 50, 100],
        toolbarContent
      });
    };

    const renderCurrencyRateGrid = () => {
      const { dates, currencyAccounts, currencyRateMatrix, rateLookup } = reportData;

      if (currencyAccounts.length === 0) {
        return React.createElement(EmptyState, {
          title: t('اطلاعاتی برای نرخ تبدیل یافت نشد', 'No conversion rate data found'),
          description: t('برای این فیلترها حسابی با ارز مشخص پیدا نشد.', 'No account with a usable currency was found for the selected filters.'),
          language
        });
      }

      if (!rateLookup || dates.length === 0) {
        return React.createElement(EmptyState, {
          title: t('نرخ ارز در دسترس نیست', 'Exchange rates are unavailable'),
          description: t('برای بازه انتخاب‌شده نرخ ارزی ثبت نشده است.', 'No exchange-rate records were found for the selected date range.'),
          language
        });
      }

      const gridRows = currencyAccounts.map(acc => {
        const row = { ...acc };
        dates.forEach(d => {
          row[d] = currencyRateMatrix[acc.id]?.[d] || {};
        });
        return row;
      });

      const dayColumns = buildDayColumns(false, (val) => {
        const day = val || {};
        const usd = day.usd;
        const irr = day.irr;
        return React.createElement('div', { className: 'flex flex-col gap-0.5 leading-4 whitespace-nowrap' },
          React.createElement('span', { className: 'font-sans tabular-nums text-sky-700 dark:text-sky-400' }, `USD: ${fmtDecimal(usd, 6)}`),
          React.createElement('span', { className: 'font-sans tabular-nums text-amber-700 dark:text-amber-400' }, `IRR: ${fmtDecimal(irr, 6)}`)
        );
      }, (val) => {
        const day = val || {};
        return `USD: ${fmtDecimal(day.usd, 6)} | IRR: ${fmtDecimal(day.irr, 6)}`;
      });

      const columns = [
        {
          field: 'code',
          header_fa: 'کد ارز',
          header_en: 'Currency Code',
          width: '120px',
          render: (val) => React.createElement('span', { className: 'font-sans tabular-nums whitespace-nowrap font-black text-slate-700 dark:text-slate-200' }, val || '—')
        },
        {
          field: isRtl ? 'title_fa' : 'title_en',
          header_fa: 'عنوان ارز',
          header_en: 'Currency Title',
          width: '240px',
          render: (val, row) => React.createElement('div', {
            className: 'whitespace-normal break-words leading-5 font-medium text-slate-800 dark:text-slate-200',
            title: isRtl ? row.title_fa : (row.title_en || row.title_fa)
          }, React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('span', null, isRtl ? row.title_fa : (row.title_en || row.title_fa)),
            row.currency_symbol && React.createElement('span', { className: 'text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-full' }, row.currency_symbol)
          ))
        },
        {
          field: 'member_count',
          header_fa: 'تعداد حساب',
          header_en: 'Account Count',
          width: '110px',
          render: (val) => React.createElement('span', { className: 'font-sans tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap' }, fmt(val || 0))
        },
        ...dayColumns
      ];

      const toolbarContent = React.createElement('div', { className: 'flex items-center gap-2 flex-wrap text-[12px] text-slate-500 dark:text-slate-400 overflow-hidden' },
        React.createElement('span', { className: 'whitespace-nowrap' },
          t(
            `${currencyAccounts.length} ارز  ·  ${dates.length} روز`,
            `${currencyAccounts.length} currencies  ·  ${dates.length} days`
          )
        ),
        React.createElement('span', { className: 'text-sky-600 dark:text-sky-400 whitespace-nowrap' },
          t('هر سلول نرخ تبدیل به USD و IRR را نشان می‌دهد.', 'Each cell shows conversion rates to USD and IRR.')
        )
      );

      return React.createElement(DataGrid, {
        key: `currency-rates-${dates.length}-${currencyAccounts.length}`,
        data: gridRows,
        columns,
        language,
        formCode,
        hideToolbar: false,
        hideImport: true,
        defaultPinnedCols: ['code', isRtl ? 'title_fa' : 'title_en', 'member_count'],
        gridState: reportGridStates.rates,
        onGridStateChange: (state) => setReportGridStates(prev => ({ ...prev, rates: state })),
        groupable: false,
        pageSizeOptions: [20, 50, 100],
        toolbarContent
      });
    };

    const renderBaseAmountsGrid = () => {
      const { dates, accounts, matrix, rateLookup } = reportData;
      const conversionCache = new Map();

      if (!rateLookup || dates.length === 0) {
        return React.createElement(EmptyState, {
          title: t('نرخ ارز در دسترس نیست', 'Exchange rates are unavailable'),
          description: t('برای محاسبه مبالغ پایه، نرخ ارز در بازه انتخاب‌شده لازم است.', 'Exchange rates are required to calculate base-currency amounts for the selected range.'),
          language
        });
      }

      const sourceAccounts = (accounts || []).filter(acc => !acc.is_currency_summary);
      if (sourceAccounts.length === 0) {
        return React.createElement(EmptyState, {
          title: t('اطلاعاتی برای تبدیل مبالغ یافت نشد', 'No amounts available for conversion'),
          description: t('هیچ حسابی برای محاسبه مبالغ پایه در نتیجه گزارش وجود ندارد.', 'No accounts are available in the report result to convert to base currencies.'),
          language
        });
      }

      const baseRows = [
        { id: 'dep', key: 'dep', label: t('جمع واریز', 'Total Deposit') },
        { id: 'wid', key: 'wid', label: t('جمع برداشت', 'Total Withdrawal') },
        { id: 'bal', key: 'bal', label: t('جمع بالانس', 'Total Balance') }
      ];

      const gridRows = baseRows.map(row => {
        const out = { ...row };
        dates.forEach(d => {
          let usd = 0;
          let irr = 0;

          sourceAccounts.forEach(acc => {
            const day = matrix[acc.id]?.[d];
            if (!day) return;

            const amount = row.key === 'dep'
              ? parseFloat(day.dep || 0) || 0
              : row.key === 'wid'
                ? parseFloat(day.wid || 0) || 0
                : parseFloat(day.bal || 0) || 0;
            if (!amount) return;

            const currencyCode = String(acc.currency_code || acc.currency_title || '').toUpperCase();
            const usdRate = resolveConversionRate(rateLookup, currencyCode, 'USD', d, conversionCache);
            const irrRate = resolveConversionRate(rateLookup, currencyCode, 'IRR', d, conversionCache);
            usd += amount * usdRate;
            irr += amount * irrRate;
          });

          out[d] = { usd, irr };
        });
        return out;
      });

      const dayColumns = buildDayColumns(false, (val) => {
        const day = val || {};
        return React.createElement('div', { className: 'flex flex-col gap-0.5 leading-4 whitespace-nowrap' },
          React.createElement('span', { className: 'font-sans tabular-nums text-sky-700 dark:text-sky-400' }, `USD: ${fmtDecimal(day.usd, 6)}`),
          React.createElement('span', { className: 'font-sans tabular-nums text-amber-700 dark:text-amber-400' }, `IRR: ${fmtDecimal(day.irr, 6)}`)
        );
      }, (val) => {
        const day = val || {};
        return `USD: ${fmtDecimal(day.usd, 6)} | IRR: ${fmtDecimal(day.irr, 6)}`;
      });

      const columns = [
        {
          field: 'label',
          header_fa: 'نوع مبلغ',
          header_en: 'Amount Type',
          width: '170px',
          render: (val, row) => React.createElement('span', {
            className: `font-sans whitespace-nowrap font-black ${row.key === 'bal' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`
          }, val || '—')
        },
        ...dayColumns
      ];

      const toolbarContent = React.createElement('div', { className: 'flex items-center gap-2 flex-wrap text-[12px] text-slate-500 dark:text-slate-400 overflow-hidden' },
        React.createElement('span', { className: 'whitespace-nowrap' },
          t(
            `${sourceAccounts.length} حساب  ·  ${dates.length} روز`,
            `${sourceAccounts.length} accounts  ·  ${dates.length} days`
          )
        ),
        React.createElement('span', { className: 'text-sky-600 dark:text-sky-400 whitespace-nowrap' },
          t('تمام مبالغ روزانه به USD و IRR تبدیل شده‌اند.', 'All daily amounts are converted to USD and IRR.')
        )
      );

      return React.createElement(DataGrid, {
        key: `base-amounts-${dates.length}-${sourceAccounts.length}`,
        data: gridRows,
        columns,
        language,
        formCode,
        hideToolbar: false,
        hideImport: true,
        defaultPinnedCols: ['label'],
        gridState: reportGridStates.baseAmounts,
        onGridStateChange: (state) => setReportGridStates(prev => ({ ...prev, baseAmounts: state })),
        groupable: false,
        pageSizeOptions: [20, 50, 100],
        toolbarContent
      });
    };

    switch (activeTab) {
      case 'currency': return renderCurrencyGrid();
      case 'rates': return renderCurrencyRateGrid();
      case 'baseAmounts': return renderBaseAmountsGrid();
      default: return null;
    }
  };

  const BalanceReportDrillModal = ({
    isOpen = false,
    onClose = () => {},
    language = 'fa',
    t = (fa, en) => fa,
    isRtl = false,
    activeTab = 'details',
    fmtDecimal = (value) => String(value),
    fmtDate = (value) => value,
    reportData = null,
    cellDrillModal = {},
    cellDrillGridState = {},
    setCellDrillGridState = () => {},
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
    Badge = FallbackComponent,
    DataGrid = FallbackComponent,
    EmptyState = FallbackComponent,
    Modal = FallbackComponent,
    formCode = 'FIN_BALANCE_REPORT'
  }) => {
    if (!isOpen) return null;

    const selectedItems = cellDrillModal.items || [];
    const account = reportAccountLookup.get(String(cellDrillModal.accountId || '')) || null;
    const accountTitle = account ? (isRtl ? (account.title_fa || account.title_en || account.code || '-') : (account.title_en || account.title_fa || account.code || '-')) : cellDrillModal.accountLabel || '-';
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
      const docDate = String(item._doc_date || cellDrillModal.date || '');
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
      ? resolveConversionRate(reportData?.rateLookup || new Map(), balanceCurrencyCode, 'USD', String(cellDrillModal.date || ''), drillConversionCache)
      : 0;
    const balanceToIrrRate = balanceCurrencyCode
      ? resolveConversionRate(reportData?.rateLookup || new Map(), balanceCurrencyCode, 'IRR', String(cellDrillModal.date || ''), drillConversionCache)
      : 0;
    const balanceUsd = (cellBalance === null || cellBalance === undefined) ? null : (parseFloat(cellBalance || 0) || 0) * balanceToUsdRate;
    const balanceIrr = (cellBalance === null || cellBalance === undefined) ? null : (parseFloat(cellBalance || 0) || 0) * balanceToIrrRate;

    const modalColumns = [
      { field: '_doc_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '120px', render: (val) => React.createElement('span', { className: 'text-indigo-600 dark:text-indigo-400 font-bold text-[12px]' }, val || '-') },
      { field: '_tx_status', header_fa: 'وضعیت سند', header_en: 'Document Status', width: '95px', render: (val) => React.createElement(Badge, { variant: statusColors[val] || 'gray', size: 'sm' }, statusLabels[val] || val || '-') },
      { field: '_tx_type', header_fa: 'نوع سند', header_en: 'Document Type', width: '100px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block', title: val }, txTypes[val] || val || '-') },
      { field: '_registrar_name', header_fa: 'نام ثبت‌کننده', header_en: 'Registrar', width: '140px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300', title: val }, val || '-') },
      { field: '_tx_description', header_fa: 'شرح سربرگ', header_en: 'Header Description', width: '180px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block max-w-xs', title: val }, val || '-') },
      { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px', render: (_, __, rowIndex) => React.createElement('span', { className: 'text-[12px] font-medium text-slate-600 dark:text-slate-400' }, rowIndex + 1) },
      ...(drillKind === 'currency' ? [
        { field: '_account_code', header_fa: 'کد حساب', header_en: 'Account Code', width: '100px', render: (val) => React.createElement('span', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300', dir: 'ltr' }, val || '-') },
        { field: '_account_title', header_fa: 'عنوان حساب', header_en: 'Account Title', width: '220px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300', title: val }, val || '-') },
      ] : []),
      { field: 'transaction_action', header_fa: 'نوع', header_en: 'Action', width: '90px', render: (val) => {
        const color = val === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400';
        return React.createElement('span', { className: `text-[12px] font-medium ${color}` }, txActions[val] || val || '-');
      }},
      { field: 'transaction_group', header_fa: 'گروه', header_en: 'Group', width: '75px', render: (val) => React.createElement('span', { className: 'text-[12px]' }, txGroups[val] || val || '-') },
      { field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '65px' },
      { field: 'deposit_amount', header_fa: 'مبلغ واریز', header_en: 'Deposit', width: '110px', render: (val) => React.createElement('span', { className: 'text-[12px] font-medium text-emerald-600 dark:text-emerald-500', dir: 'ltr' }, fmtDecimal(val || 0, 6)) },
      { field: 'withdrawal_amount', header_fa: 'مبلغ برداشت', header_en: 'Withdrawal', width: '110px', render: (val) => React.createElement('span', { className: 'text-[12px] font-medium text-rose-500 dark:text-rose-400', dir: 'ltr' }, fmtDecimal(val || 0, 6)) },
      { field: 'remained_amount', header_fa: 'مانده حساب', header_en: 'Account Balance', width: '120px', render: (_, row) => React.createElement('span', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300', dir: 'ltr' }, fmtDecimal(row.remained_amount, 6)) },
      { field: 'cost_income', header_fa: 'هزینه/درآمد', header_en: 'Cost/Income', width: '170px', render: (_, row) => {
        const item = row.cost_type_id ? COST_TYPE_LOOKUP.get(String(row.cost_type_id)) : INCOME_TYPE_LOOKUP.get(String(row.income_type_id || ''));
        const label = item
          ? (isRtl
              ? (item.displayLabel || item.titleFa || item.title_fa || '')
              : (item.displayLabel || item.titleEn || item.title_en || item.title_fa || ''))
          : '-';
        return React.createElement('span', { className: 'text-[12px] truncate block', title: label }, label);
      }},
      { field: 'center_id', header_fa: 'مرکز هزینه/درآمد', header_en: 'Center', width: '170px', render: (val) => {
        const item = CENTER_LOOKUP.get(String(val || ''));
        const label = item ? (isRtl ? (item.title_fa || item.titleFa || item.title_en || item.titleEn || '') : (item.title_en || item.titleEn || item.title_fa || item.titleFa || '')) : (val || '-');
        return React.createElement('span', { className: 'text-[12px] truncate block', title: label }, label);
      }},
      { field: 'description', header_fa: 'شرح قلم', header_en: 'Item Desc.', width: '220px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block max-w-sm', title: val }, val || '-') },
    ];

    return React.createElement(Modal, {
      isOpen,
      onClose,
      title: t('اقلام تراکنش روز', 'Daily Transaction Items'),
      language,
      width: 'max-w-7xl'
    },
      React.createElement('div', { className: 'p-3 flex flex-col gap-3 max-h-[80vh] overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg' },
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
              React.createElement('span', { className: 'truncate' }, `${t('تاریخ', 'Date')}: ${fmtDate(cellDrillModal.date) || cellDrillModal.date || '-'}`),
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
                drillKind === 'currency'
                  ? 'برای این ارز و این تاریخ، تراکنشی ثبت نشده است.'
                  : 'برای این حساب و این تاریخ، تراکنشی ثبت نشده است.',
                drillKind === 'currency'
                  ? 'No transaction items were found for this currency and date.'
                  : 'No transaction items were found for this account and date.'
              ),
              language,
            })
          : React.createElement('div', { className: 'flex-1 min-h-[360px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' },
              React.createElement(DataGrid, {
                key: `cell-drill-${drillKind}-${cellDrillModal.accountId || 'account'}-${cellDrillModal.date || 'date'}`,
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
                toolbarContent: React.createElement('div', { className: 'text-[12px] text-slate-500 dark:text-slate-400' }, t('مرور اقلام اسناد مرتبط.', 'Review Related Transaction Items'))
              })
            )
      )
    );
  };

  window.BalanceReportTotal = BalanceReportTotal;
  window.BalanceReportDrillModal = BalanceReportDrillModal;
})();