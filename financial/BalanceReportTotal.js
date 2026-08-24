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

  window.BalanceReportTotal = BalanceReportTotal;
})();