/* Filename: financial/TransactionReviewView.js */
(() => {
  const React = window.React;
  const { useMemo, useEffect, useState, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const FallbackComponent = () => null;

  const LucideIcons = window.LucideIcons || {};
  const {
    Eye = FallbackIcon,
    ChevronLeft = FallbackIcon,
    ChevronRight = FallbackIcon,
    Paperclip = FallbackIcon,
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const DSGrid = window.DSGrid || DS || {};
  const DSForms = window.DSForms || DS || {};
  const DSFeedback = window.DSFeedback || DS || {};

  const PageHeader = Core.PageHeader || FallbackComponent;
  const EmptyState = Core.EmptyState || FallbackComponent;
  const Badge = Core.Badge || FallbackComponent;
  const Button = Core.Button || FallbackComponent;
  const Tabs = Core.Tabs || FallbackComponent;
  const DataGrid = DSGrid.DataGrid || FallbackComponent;
  const AdvancedFilter = DSGrid.AdvancedFilter || FallbackComponent;
  const AttachmentManager = DSForms.AttachmentManager || FallbackComponent;
  const Modal = DSFeedback.Modal || FallbackComponent;
  const Toast = DSFeedback.Toast || FallbackComponent;

  const fmt = (num) => {
    if (num === null || num === undefined) return '—';
    const v = parseFloat(num);
    if (isNaN(v)) return '—';
    if (v === 0) return '0';
    const abs = Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return v < 0 ? `(${abs})` : abs;
  };

  const fmtInt = (num) => {
    if (num === null || num === undefined) return '—';
    const v = parseFloat(num);
    if (isNaN(v) || v === 0) return '—';
    const abs = Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return v < 0 ? `(${abs})` : abs;
  };

  const asText = (value) => (value === null || value === undefined || value === '' ? '-' : String(value));

    const TransactionReviewView = ({
      language = 'fa',
      formCode = 'FIN_TRANSACTION_REVIEW',
      isRtl,
      t,
      fmtDate,
      dateLocale,
      filterState,
      filterFields,
      handleFilterChange,
      handleSearch,
      handleClear,
      setFilterState,
      setTransactions,
      setAppliedFilters,
      setSelectedDocumentIds,
      setDrillDoc,
      activeTab,
      setActiveTab,
      selectedDocumentIds,
      drillDoc,
      isLoading,
      transactions,
      documentsGridData,
      itemsGridData,
      activeDrillData,
      openAttachments,
      attachModal,
      setAttachModal,
      toast,
      setToast,
      accountLovColumns,
      groupLovCols,
      accountLovData,
      balanceGroups,
      usersMap,
      deptsMap,
      accountsMap,
      lookups,
      txTypes,
      txActions,
      txGroups,
      statusColors,
      statusLabels,
    }) => {
    const BackIcon = isRtl ? ChevronRight : ChevronLeft;
    const showCurrencySummary = !!filterState.summary_currency;
    const [itemsGridState, setItemsGridState] = useState(() => ({
      hiddenCols: ['_doc_id', '_tx', 'exchange_rate_to_usd', 'cost_type_id', 'income_type_id', 'center_id'],
    }));

    useEffect(() => {
      setItemsGridState(prev => {
        const hidden = new Set(prev?.hiddenCols || []);
        if (showCurrencySummary) hidden.delete('exchange_rate_to_usd');
        else hidden.add('exchange_rate_to_usd');
        return { ...(prev || {}), hiddenCols: Array.from(hidden) };
      });
    }, [showCurrencySummary]);

    const COST_TYPE_LOOKUP = useMemo(() => new Map((lookups.costTypes || []).map(item => [String(item.id), item])), [lookups.costTypes]);
    const INCOME_TYPE_LOOKUP = useMemo(() => new Map((lookups.incomeTypes || []).map(item => [String(item.id), item])), [lookups.incomeTypes]);
    const CENTER_LOOKUP = useMemo(() => new Map((lookups.costBenefitCenters || []).map(item => [String(item.id), item])), [lookups.costBenefitCenters]);

    const documentsColumns = useMemo(() => [
      { field: 'reference_code', header_fa: 'عطف', header_en: 'Ref', width: '70px', render: (val) => React.createElement('span', { className: 'font-bold text-slate-700 dark:text-slate-300' }, val || '-') },
      { field: 'document_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '120px', render: (val, row) => React.createElement('button', { type: 'button', className: 'text-indigo-600 dark:text-indigo-400 font-bold text-[12px] hover:underline cursor-pointer', onClick: () => setDrillDoc(row), title: t('کلیک کنید تا اقلام این سند نمایش داده شود', 'Click to view items of this document') }, val || '-') },
      { field: 'document_date', header_fa: 'تاریخ سند', header_en: 'Date', width: '90px', type: 'date', render: (val) => React.createElement('span', { className: 'text-[12px]' }, fmtDate(val) || '-') },
      { field: 'created_at', header_fa: 'زمان ثبت', header_en: 'Registered At', width: '100px', render: (val) => {
        if (!val) return React.createElement('span', { className: 'text-slate-400 text-[12px]' }, '-');
        try {
          const d = new Date(val);
          const datePart = new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
          const timePart = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
          return React.createElement('div', { className: 'flex flex-col leading-tight', dir: 'ltr' },
            React.createElement('span', { className: 'text-[12px] font-sans text-slate-700 dark:text-slate-300' }, datePart),
            React.createElement('span', { className: 'text-[10px] font-sans text-slate-400 dark:text-slate-500' }, timePart)
          );
        } catch (e) { return React.createElement('span', { className: 'text-[12px]' }, val); }
      }},
      { field: 'transaction_type', header_fa: 'نوع تراکنش', header_en: 'Type', width: '100px', render: (val) => txTypes[val] || val },
      { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '95px', render: (val) => {
        const s = statusLabels[val];
        return React.createElement(Badge, { variant: statusColors[val] || 'gray', size: 'sm' }, s || val);
      }},
      { field: '_total_usd', header_fa: 'جمع (USD)', header_en: 'Total (USD)', width: '110px', render: (_, row) => {
        const items = row.fm_transaction_items || [];
        let depUsd = 0, widUsd = 0;
        items.forEach(item => {
          const dep = parseFloat(item.deposit_amount || 0);
          const wid = parseFloat(item.withdrawal_amount || 0);
          const val = dep > 0 ? dep : wid;
          const toUsd = parseFloat(item.exchange_rate_to_usd || 0);
          const usd = toUsd > 0 ? val * toUsd : parseFloat(item.amount_usd || 0);
          if (item.transaction_action === 'DEPOSIT') depUsd += usd;
          else widUsd += usd;
        });
        if (depUsd === 0 && widUsd === 0) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[12px]' }, '—');
        return React.createElement('div', { className: 'flex flex-col gap-0.5', dir: 'ltr' },
          depUsd > 0 ? React.createElement('span', { className: 'text-[12px] font-medium text-emerald-600 dark:text-emerald-500' }, fmtInt(depUsd)) : null,
          widUsd > 0 ? React.createElement('span', { className: 'text-[12px] font-medium text-rose-500 dark:text-rose-400' }, fmtInt(widUsd)) : null
        );
      }},
      { field: '_total_irr', header_fa: 'جمع (IRR)', header_en: 'Total (IRR)', width: '130px', render: (_, row) => {
        const items = row.fm_transaction_items || [];
        let depIrr = 0, widIrr = 0;
        items.forEach(item => {
          const dep = parseFloat(item.deposit_amount || 0);
          const wid = parseFloat(item.withdrawal_amount || 0);
          const val = dep > 0 ? dep : wid;
          const toUsd = parseFloat(item.exchange_rate_to_usd || 0);
          const usdToIrr = parseFloat(item.exchange_rate_usd_to_irr || 0);
          const irr = toUsd > 0 && usdToIrr > 0 ? val * toUsd * usdToIrr : parseFloat(item.amount_irr || 0);
          if (item.transaction_action === 'DEPOSIT') depIrr += irr;
          else widIrr += irr;
        });
        if (depIrr === 0 && widIrr === 0) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[12px]' }, '—');
        return React.createElement('div', { className: 'flex flex-col gap-0.5', dir: 'ltr' },
          depIrr > 0 ? React.createElement('span', { className: 'text-[12px] font-medium text-emerald-600 dark:text-emerald-500' }, fmtInt(depIrr)) : null,
          widIrr > 0 ? React.createElement('span', { className: 'text-[12px] font-medium text-rose-500 dark:text-rose-400' }, fmtInt(widIrr)) : null
        );
      }},
      { field: 'registrar_id', header_fa: 'ثبت کننده', header_en: 'Registrar', width: '110px', render: (val) => {
        if (!val || val === '00000000-0000-0000-0000-000000000000') return React.createElement('span', { className: 'text-[12px] text-slate-500' }, t('سیستمی', 'System'));
        return React.createElement('span', { className: 'text-[12px] truncate font-medium text-slate-700 dark:text-slate-300 block' }, usersMap[val] || val);
      }},
      { field: 'reviewed_by_name', header_fa: 'بررسی‌کننده', header_en: 'Reviewed By', width: '110px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300' }, val || '-') },
      { field: 'approved_by_name', header_fa: 'تاییدکننده', header_en: 'Approved By', width: '110px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300' }, val || '-') },
      { field: 'description', header_fa: 'شرح سربرگ', header_en: 'Description', width: '160px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block max-w-xs', title: val }, val || '-') },
      { field: 'department_id', header_fa: 'دپارتمان', header_en: 'Department', width: '120px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate font-medium text-slate-600 dark:text-slate-400 block' }, deptsMap[val] || val || '-') },
      { field: 'reviewed_at', header_fa: 'تاریخ بررسی', header_en: 'Reviewed At', width: '115px', render: (val) => {
        if (!val) return React.createElement('span', { className: 'text-slate-400 text-[12px]' }, '-');
        try { return React.createElement('span', { className: 'text-[12px] font-sans block', dir: 'ltr' }, new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(val))); }
        catch (e) { return React.createElement('span', { className: 'text-[12px]' }, val); }
      }},
      { field: 'approved_at', header_fa: 'تاریخ تایید', header_en: 'Approved At', width: '115px', render: (val) => {
        if (!val) return React.createElement('span', { className: 'text-slate-400 text-[12px]' }, '-');
        try { return React.createElement('span', { className: 'text-[12px] font-sans block', dir: 'ltr' }, new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(val))); }
        catch (e) { return React.createElement('span', { className: 'text-[12px]' }, val); }
      }},
      { field: 'daily_number', header_fa: 'روزانه', header_en: 'Daily', width: '70px' },
    ], [dateLocale, deptsMap, fmtDate, t, usersMap, statusLabels, statusColors, setDrillDoc, txTypes]);

    const AmountCell = ({ amount, usd, irr, cur, isDeposit }) => {
      if (!showCurrencySummary) {
        const numericAmount = parseFloat(amount || 0);
        if (!numericAmount) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[12px]' }, '—');
        const plainColor = isDeposit ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400';
        return React.createElement('span', { className: `text-[12px] font-medium ${plainColor}`, dir: 'ltr' }, fmt(numericAmount));
      }

      const numericAmount = parseFloat(amount || 0);
      if (!numericAmount) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[12px]' }, '—');
      const mainColor = isDeposit ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400';
      return React.createElement('div', { className: 'flex flex-col gap-[3px]', dir: 'ltr' },
        React.createElement('span', { className: `font-bold text-[12px] ${mainColor}` }, `${fmt(numericAmount)} ${cur || ''}`.trim()),
        React.createElement('span', { className: 'text-[10px] text-slate-400' }, `≈ $ ${fmt(usd)}`),
        React.createElement('span', { className: 'text-[10px] text-slate-400' }, `≈ ﷼ ${fmt(irr)}`)
      );
    };

    const getAccountExportLabel = (row) => {
      const acc = accountsMap.get(String(row.account_id || ''));
      if (!acc) return '-';
      return isRtl ? (acc.title_fa || acc.title_en || acc.code || '-') : (acc.title_en || acc.title_fa || acc.code || '-');
    };

    const getLookupExportLabel = (lookupMap, id, fallback = '-') => {
      const item = lookupMap.get(String(id || ''));
      if (!item) return asText(fallback);
      return isRtl
        ? (item.displayLabel || item.titleFa || item.title_fa || item.titleEn || item.title_en || item.code || fallback)
        : (item.displayLabel || item.titleEn || item.title_en || item.titleFa || item.title_fa || item.code || fallback);
    };

    const itemsColumns = useMemo(() => [
      { field: '_doc_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '120px', render: (val) => React.createElement('span', { className: 'text-indigo-600 dark:text-indigo-400 font-bold text-[12px]' }, val || '-') },
      { field: '_tx_type', header_fa: 'نوع سند', header_en: 'Doc Type', width: '90px', render: (val) => React.createElement('span', { className: 'text-[12px]' }, txTypes[val] || val || '-') },
      { field: '_doc_date', header_fa: 'تاریخ سند', header_en: 'Doc Date', width: '90px', render: (val) => React.createElement('span', { className: 'text-[12px]' }, fmtDate(val) || '-') },
      { field: '_tx_status', header_fa: 'وضعیت سند', header_en: 'Document Status', width: '95px', render: (val) => {
        const label = statusLabels[val] || val || '-';
        return React.createElement(Badge, { variant: statusColors[val] || 'gray', size: 'sm' }, label);
      }},
      { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px', render: (_, __, rowIndex) => React.createElement('span', { className: 'text-[12px] font-medium text-slate-600 dark:text-slate-400' }, rowIndex + 1) },
      { field: '_account', header_fa: 'حساب', header_en: 'Account', width: '200px', exportValue: (_, row) => getAccountExportLabel(row), render: (_, row) => {
        const acc = accountsMap.get(String(row.account_id || ''));
        if (!acc) return React.createElement('span', { className: 'text-slate-400 text-[12px]' }, '-');
        return React.createElement('div', { className: 'flex flex-col' },
          React.createElement('span', { className: 'text-[12px] font-medium text-slate-700 dark:text-slate-300' }, isRtl ? acc.title_fa : (acc.title_en || acc.title_fa)),
          React.createElement('span', { className: 'text-[10px] text-slate-500 font-mono' }, acc.code)
        );
      }},
      { field: 'transaction_action', header_fa: 'نوع', header_en: 'Action', width: '90px', exportValue: (val) => txActions[val] || val || '-', render: (val) => {
        const color = val === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400';
        return React.createElement('span', { className: `text-[12px] font-medium ${color}` }, txActions[val] || val);
      }},
      { field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '65px' },
      { field: 'exchange_rate_to_usd', header_fa: 'نرخ تبدیل', header_en: 'Exchange Rate to USD', width: '95px', exportValue: (val) => fmt(val), render: (val, row) => {
        if (!showCurrencySummary) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[12px]' }, '—');
        return React.createElement('div', { className: 'flex flex-col gap-[2px]', dir: 'ltr' },
          React.createElement('span', { className: 'text-[10px] text-slate-500' }, `1 ${row.currency || ''} = ${fmt(val)} $`),
          React.createElement('span', { className: 'text-[10px] text-slate-500' }, `1 $ = ${fmt(row.exchange_rate_usd_to_irr)} ﷼`)
        );
      }},
      { field: 'deposit_amount', header_fa: 'واریز', header_en: 'Deposit', width: '110px', exportValue: (val) => fmt(val), render: (val, row) => React.createElement(AmountCell, { amount: val, usd: row.dep_usd, irr: row.dep_irr, cur: row.currency, isDeposit: true }) },
      { field: 'withdrawal_amount', header_fa: 'برداشت', header_en: 'Withdrawal', width: '110px', exportValue: (val) => fmt(val), render: (val, row) => React.createElement(AmountCell, { amount: val, usd: row.wid_usd, irr: row.wid_irr, cur: row.currency, isDeposit: false }) },
      { field: '_balance_after', header_fa: 'مانده حساب', header_en: 'Account Balance', width: '120px', exportValue: (val) => fmt(val), render: (val) => React.createElement('span', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300', dir: 'ltr' }, fmt(val))},      
      { field: 'deposit_amount_usd', header_fa: 'واریز به دلار', header_en: 'Deposit (USD)', width: '95px', exportOnly: true, exportValue: (_, row) => fmt(row.dep_usd) },
      { field: 'withdrawal_amount_usd', header_fa: 'برداشت به دلار', header_en: 'Withdrawal (USD)', width: '95px', exportOnly: true, exportValue: (_, row) => fmt(row.wid_usd) },
      { field: 'exchange_rate_usd_to_irr', header_fa: 'نرخ تبدیل', header_en: 'Exchange Rate to IRR', width: '95px', exportOnly: true, exportValue: (val) => fmt(val) },
      { field: 'deposit_amount_irr', header_fa: 'واریز به ريال', header_en: 'Deposit (IRR)', width: '95px', exportOnly: true, exportValue: (_, row) => fmt(row.dep_irr) },
      { field: 'withdrawal_amount_irr', header_fa: 'برداشت به ريال', header_en: 'Withdrawal (IRR)', width: '95px', exportOnly: true, exportValue: (_, row) => fmt(row.wid_irr) },
      { field: 'transaction_group', header_fa: 'گروه', header_en: 'Group', width: '75px', render: (val) => React.createElement('span', { className: 'text-[12px]' }, txGroups[val] || val || '-') },
      { field: 'cost_income', header_fa: 'هزینه/درآمد', header_en: 'Cost/Income', width: '170px', render: (_, row) => {
        const item = row.cost_type_id ? COST_TYPE_LOOKUP.get(String(row.cost_type_id)) : INCOME_TYPE_LOOKUP.get(String(row.income_type_id || ''));
        const label = item
          ? (isRtl
              ? (item.displayLabel || item.titleFa || item.title_fa || '')
              : (item.displayLabel || item.titleEn || item.title_en || item.title_fa || ''))
          : '-';
        return React.createElement('span', { className: 'text-[12px] truncate block', title: label }, label);
      }},
      { field: 'center_id', header_fa: 'مرکز هزینه/درآمد', header_en: 'Center', width: '170px', exportValue: (val) => getLookupExportLabel(CENTER_LOOKUP, val, val || '-'), render: (val) => {
        const label = getLookupExportLabel(CENTER_LOOKUP, val, val || '-');
        return React.createElement('span', { className: 'text-[12px] truncate block', title: label }, label);
      }},
      { field: 'description', header_fa: 'شرح قلم', header_en: 'Item Desc.', width: '200px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block max-w-xs', title: val }, val || '-') },
    ], [accountsMap, fmtDate, isRtl, txActions, txGroups, txTypes, statusLabels, statusColors, COST_TYPE_LOOKUP, INCOME_TYPE_LOOKUP, CENTER_LOOKUP, showCurrencySummary, setDrillDoc]);

    const exportItemsCsv = useCallback(() => {
      const exportColumns = [
        { header: t('کد سند', 'Doc Code'), value: row => row._doc_code || '-' },
        { header: t('نوع سند', 'Doc Type'), value: row => txTypes[row._tx_type] || row._tx_type || '-' },
        { header: t('تاریخ سند', 'Doc Date'), value: row => fmtDate(row._doc_date) || '-' },
        { header: t('وضعیت سند', 'Document Status'), value: row => statusLabels[row._tx_status] || row._tx_status || '-' },
        { header: t('ردیف', 'Row'), value: row => row.row_number || '-' },
        { header: t('حساب', 'Account'), value: row => getAccountExportLabel(row) },
        { header: t('نوع', 'Action'), value: row => txActions[row.transaction_action] || row.transaction_action || '-' },
        { header: t('ارز', 'Currency'), value: row => row.currency || '-' },
        { header: t('واریز', 'Deposit'), value: row => fmt(row.deposit_amount) },
        { header: t('برداشت', 'Withdrawal'), value: row => fmt(row.withdrawal_amount) },
        { header: t('مانده حساب', 'Account Balance'), value: row => fmt(row._balance_after) },
        { header: t('نرخ تبدیل به دلار', 'Exchange Rate to USD'), value: row => fmt(row.exchange_rate_to_usd) },
        { header: t('واریز به دلار', 'Deposit (USD)'), value: row => fmt(row.dep_usd) },
        { header: t('برداشت به دلار', 'Withdrawal (USD)'), value: row => fmt(row.wid_usd) },
        { header: t('نرخ تبدیل به ريال', 'Exchange Rate to IRR'), value: row => fmt(row.exchange_rate_usd_to_irr) },
        { header: t('واریز به ريال', 'Deposit (IRR)'), value: row => fmt(row.dep_irr) },
        { header: t('برداشت به ريال', 'Withdrawal (IRR)'), value: row => fmt(row.wid_irr) },
        { header: t('گروه', 'Group'), value: row => txGroups[row.transaction_group] || row.transaction_group || '-' },
        { header: t('هزینه/درآمد', 'Cost/Income'), value: row => {
          const item = row.cost_type_id ? COST_TYPE_LOOKUP.get(String(row.cost_type_id)) : INCOME_TYPE_LOOKUP.get(String(row.income_type_id || ''));
          return item
            ? (isRtl
                ? (item.displayLabel || item.titleFa || item.title_fa || '-')
                : (item.displayLabel || item.titleEn || item.title_en || item.title_fa || '-'))
            : '-';
        }},
        { header: t('مرکز هزینه/درآمد', 'Center'), value: row => getLookupExportLabel(CENTER_LOOKUP, row.center_id, row.center_id || '-') },
        { header: t('شرح قلم', 'Item Desc.'), value: row => row.description || '-' },
      ];
      const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csv = [
        '\uFEFF' + exportColumns.map(col => csvEscape(col.header)).join(','),
        ...itemsGridData.map(row => exportColumns.map(col => csvEscape(col.value(row))).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [itemsGridData, t, fmtDate, txTypes, statusLabels, txActions, txGroups, isRtl, COST_TYPE_LOOKUP, INCOME_TYPE_LOOKUP, CENTER_LOOKUP]);

    const drillColumns = useMemo(() => [
      { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px' },
      { field: '_account', header_fa: 'حساب', header_en: 'Account', width: '210px', render: (_, row) => {
        const acc = accountsMap.get(String(row.account_id || ''));
        if (!acc) return React.createElement('span', { className: 'text-slate-400 text-[12px]' }, '-');
        return React.createElement('div', { className: 'flex flex-col' },
          React.createElement('span', { className: 'text-[12px] font-medium text-slate-700 dark:text-slate-300' }, isRtl ? acc.title_fa : (acc.title_en || acc.title_fa)),
          React.createElement('span', { className: 'text-[10px] text-slate-500 font-mono' }, acc.code)
        );
      }},
      { field: 'transaction_action', header_fa: 'نوع', header_en: 'Action', width: '90px', render: (val) => {
        const color = val === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400';
        return React.createElement('span', { className: `text-[12px] font-medium ${color}` }, txActions[val] || val);
      }},
      { field: 'transaction_group', header_fa: 'گروه', header_en: 'Group', width: '75px', render: (val) => React.createElement('span', { className: 'text-[12px]' }, txGroups[val] || val || '-') },
      { field: 'center_id', header_fa: 'مرکز هزینه/درآمد', header_en: 'Center', width: '170px', render: (val) => {
        const item = CENTER_LOOKUP.get(String(val || ''));
        const label = item ? (isRtl ? (item.title_fa || item.titleFa || item.title_en || item.titleEn || '') : (item.title_en || item.titleEn || item.title_fa || item.titleFa || '')) : (val || '-');
        return React.createElement('span', { className: 'text-[12px] truncate block', title: label }, label);
      }},
      { field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '65px' },
      { field: 'exchange_rate_to_usd', header_fa: 'نرخ تبدیل', header_en: 'Exchange Rate to USD', width: '95px', exportValue: (val) => fmt(val), render: (val, row) => {
        if (!showCurrencySummary) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[12px]' }, '—');
        return React.createElement('div', { className: 'flex flex-col gap-[2px]', dir: 'ltr' },
          React.createElement('span', { className: 'text-[10px] text-slate-500' }, `1 ${row.currency || ''} = ${fmt(val)} $`),
          React.createElement('span', { className: 'text-[10px] text-slate-500' }, `1 $ = ${fmt(row.exchange_rate_usd_to_irr)} ﷼`)
        );
      }},
      { field: 'deposit_amount', header_fa: 'مبلغ واریز', header_en: 'Deposit', width: '110px', render: (val, row) => {
        if (!showCurrencySummary) {
          const v = parseFloat(val);
          if (!v) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[12px]' }, '—');
          return React.createElement('span', { className: 'text-[12px] font-medium text-emerald-600 dark:text-emerald-500', dir: 'ltr' }, fmt(v));
        }
        return React.createElement(AmountCell, { amount: val, usd: row.dep_usd, irr: row.dep_irr, cur: row.currency, isDeposit: true });
      }},
      { field: 'withdrawal_amount', header_fa: 'مبلغ برداشت', header_en: 'Withdrawal', width: '110px', render: (val, row) => {
        if (!showCurrencySummary) {
          const v = parseFloat(val);
          if (!v) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[12px]' }, '—');
          return React.createElement('span', { className: 'text-[12px] font-medium text-rose-500 dark:text-rose-400', dir: 'ltr' }, fmt(v));
        }
        return React.createElement(AmountCell, { amount: val, usd: row.wid_usd, irr: row.wid_irr, cur: row.currency, isDeposit: false });
      }},
      { field: '_balance_after', header_fa: 'مانده حساب', header_en: 'Account Balance', width: '120px', exportValue: (val) => fmt(val), render: (val) => React.createElement('span', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300', dir: 'ltr' }, fmt(val))},
      { field: 'description', header_fa: 'شرح قلم', header_en: 'Item Desc.', width: '220px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block max-w-sm', title: val }, val || '-') },      
    ], [accountsMap, isRtl, txActions, txGroups, COST_TYPE_LOOKUP, INCOME_TYPE_LOOKUP, CENTER_LOOKUP, showCurrencySummary]);

    const documentsDefaultHiddenCols = [
      'reference_code',
      'daily_number',
      'department_id',
      'reviewed_at',
      'approved_at',
    ];

    return React.createElement('div', {
      className: 'p-4 h-full flex flex-col bg-slate-50/50 dark:bg-slate-900 overflow-hidden font-sans',
      dir: isRtl ? 'rtl' : 'ltr',
    },
      React.createElement(PageHeader, {
        title: t('مرور تراکنش‌ها', 'Transaction Review'),
        icon: Eye,
        language,
      }),

      React.createElement('div', { className: 'flex-1 min-h-0 flex flex-col mt-2 overflow-hidden gap-2' },
        !drillDoc && React.createElement(AdvancedFilter, {
          fields: filterFields,
          initialValues: filterState,
          onFilter: handleFilterChange,
          onSearch: handleSearch,
          onClear: handleClear,
          language,
          defaultOpen: true,
        }),

        !drillDoc && React.createElement(Tabs, {
          tabs: [
            { id: 'documents', label: t('اسناد', 'Documents') },
            { id: 'items', label: t('اقلام سند', 'Document Items') },
          ],
          activeTab,
          onChange: setActiveTab,
          className: 'mb-0'
        }),

        drillDoc && React.createElement('div', { className: 'flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-lg px-4 py-2 shrink-0' },
          React.createElement(Button, { variant: 'outline', size: 'sm', icon: BackIcon, onClick: () => setDrillDoc(null) }, t('برگشت به لیست اسناد', 'Back to Documents')),
          React.createElement('div', { className: 'h-4 w-px bg-indigo-200 dark:bg-indigo-700' }),
          React.createElement('span', { className: 'text-[12px] font-bold text-indigo-700 dark:text-indigo-300' }, t('اقلام سند', 'Document Items'), ' ', drillDoc.document_code || '—'),
          drillDoc.document_date && React.createElement('span', { className: 'text-[11px] text-indigo-500 dark:text-indigo-400' }, fmtDate(drillDoc.document_date)),
          drillDoc.transaction_type && React.createElement('span', { className: 'text-[11px] text-slate-500' }, txTypes[drillDoc.transaction_type] || drillDoc.transaction_type),
          drillDoc.status && React.createElement(Badge, { variant: statusColors[drillDoc.status] || 'gray', size: 'sm' }, statusLabels[drillDoc.status] || drillDoc.status)
        ),

        React.createElement('div', { className: 'flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden' },
          transactions === null && !isLoading && !drillDoc
            ? React.createElement(EmptyState, {
                title: t('هنوز جستجویی انجام نشده', 'No search performed yet'),
                description: t('فیلترهای مورد نظر را تنظیم کرده و دکمه «جستجو» را بزنید.', 'Configure the filters above and click Search to load transactions.'),
                language,
              })
            : React.createElement(React.Fragment, null,
                !drillDoc && React.createElement('div', { style: { display: activeTab === 'documents' ? 'flex' : 'none' }, className: 'flex-1 min-h-0' },
                  React.createElement(DataGrid, {
                    key: 'review-documents',
                    data: documentsGridData,
                    columns: documentsColumns,
                    language,
                    formCode,
                    isLoading,
                    selectable: true,
                    defaultHiddenCols: documentsDefaultHiddenCols,
                    actions: [{ id: 'attach', icon: Paperclip, tooltip: t('پیوست‌ها', 'Attachments'), onClick: (row) => openAttachments(row), className: 'text-indigo-500 hover:text-indigo-600' }],
                    onRowDoubleClick: (row) => setDrillDoc(row),
                    onSelectionChange: (ids) => setSelectedDocumentIds((ids || []).map(String)),
                  })
                ),
                !drillDoc && React.createElement('div', { style: { display: activeTab === 'items' ? 'flex' : 'none' }, className: 'flex-1 min-h-0' },
                  React.createElement(DataGrid, {
                    key: 'review-items',
                    data: itemsGridData,
                    columns: itemsColumns,
                    language,
                    formCode,
                    isLoading,
                    gridState: itemsGridState,
                    onGridStateChange: setItemsGridState,
                    onExport: exportItemsCsv,
                    toolbarContent: selectedDocumentIds.length > 0 && React.createElement('div', { className: 'flex-1 flex items-center' },
                      React.createElement('span', {
                        className: `text-[11px] text-slate-500 dark:text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`,
                        dir: isRtl ? 'rtl' : 'ltr',
                      }, t('فقط اقلام اسناد انتخاب‌شده نمایش داده می‌شود', 'Only items from selected documents are shown'))
                    ),
                  })
                ),
                drillDoc && React.createElement(DataGrid, {
                  key: `drill-${drillDoc.id || drillDoc.document_code || 'doc'}`,
                  data: activeDrillData,
                  columns: drillColumns,
                  language,
                  formCode,
                  isLoading,
                })
              )
        )
      ),

      React.createElement(Modal, {
        isOpen: attachModal.isOpen,
        onClose: () => setAttachModal({ isOpen: false, record: null, files: [] }),
        title: t('پیوست‌های سند', 'Document Attachments'),
        language,
        width: 'max-w-xl'
      },
        React.createElement('div', { className: 'p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg' },
          React.createElement('div', { className: 'bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-800/50 shrink-0' },
            React.createElement('span', { className: 'text-[12px] font-bold text-indigo-800 dark:text-indigo-300' }, attachModal.record?.document_code || '-'),
            attachModal.record?.status && React.createElement(Badge, { variant: 'slate', size: 'sm' }, statusLabels[attachModal.record.status] || attachModal.record.status)
          ),
          React.createElement('div', { className: 'flex-1 overflow-hidden min-h-[300px] rounded-lg' },
            React.createElement(AttachmentManager, {
              files: attachModal.files,
              onDownload: (f) => window.open(f.file_url, '_blank'),
              readOnly: true,
              isUploading: false,
              language,
              formCode,
            })
          )
        ),
        React.createElement('div', { className: 'p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end rounded-b-lg' },
          React.createElement(Button, { variant: 'primary', size: 'sm', onClick: () => setAttachModal({ isOpen: false, record: null, files: [] }) }, t('بستن', 'Close'))
        )
      ),

      React.createElement(Toast, {
        isVisible: toast.isVisible,
        message: toast.message,
        type: toast.type,
        onClose: () => setToast(prev => ({ ...prev, isVisible: false })),
        language,
      })
    );
  };

  window.TransactionReviewView = TransactionReviewView;
})();