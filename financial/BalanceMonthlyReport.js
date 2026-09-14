/* Filename: financial/BalanceMonthlyReport.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const FallbackComponent = () => null;

  const LucideIcons = window.LucideIcons || {};
  const ChevronDown = LucideIcons.ChevronDown || FallbackIcon;
  const ChevronRight = LucideIcons.ChevronRight || FallbackIcon;
  const Maximize2 = LucideIcons.Maximize2 || FallbackIcon;
  const Minimize2 = LucideIcons.Minimize2 || FallbackIcon;
  const Check = LucideIcons.Check || FallbackIcon;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const DSGridMod = window.DSGrid || DS || {};
  const DSTreeMod = window.DSTree || DS || {};
  const Feedback = window.DSFeedback || window.DSOverlays || DS || {};

  const PageHeader = Core.PageHeader || FallbackComponent;
  const EmptyState = Core.EmptyState || FallbackComponent;
  const Badge = Core.Badge || FallbackComponent;
  const Button = Core.Button || FallbackComponent;
  const Modal = Feedback.Modal || FallbackComponent;
  const Toast = Feedback.Toast || FallbackComponent;
  const DataGrid = DSGridMod.DataGrid || FallbackComponent;
  const AdvancedFilter = DSGridMod.AdvancedFilter || FallbackComponent;
  const TreeGrid = DSTreeMod.TreeGrid || FallbackComponent;
  const BarChart2 = LucideIcons.BarChart2 || LucideIcons.TrendingUp || FallbackIcon;
  const BalanceMonthlyReportDetailsModal = window.BalanceMonthlyReportDetailsModal || window.BalanceReportDrillModal || FallbackComponent;

  const TreeNode = ({ node, depth, selectedIds, onToggle, isRtl, resetToken = 0, expandMode = 'collapse', inheritedInactive = false }) => {
    const [open, setOpen] = useState(false);
    const hasKids = (node.children || []).length > 0;
    const sel = selectedIds.has(String(node.id));
    const name = isRtl ? (node.title_fa || node.title_en || '') : (node.title_en || node.title_fa || '');
    const isDirectInactive = node.is_active === false;
    const isInheritedInactive = !isDirectInactive && inheritedInactive;
    const isEffectivelyInactive = isDirectInactive || inheritedInactive;

    useEffect(() => {
      setOpen(false);
    }, [resetToken]);

    useEffect(() => {
      if (!hasKids) return;
      if (expandMode === 'expand') setOpen(true);
      if (expandMode === 'collapse') setOpen(false);
    }, [expandMode, hasKids]);

    return React.createElement('div', null,
      React.createElement('div', {
        className: `flex items-center gap-1 py-0.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-md cursor-pointer select-none ${isEffectivelyInactive ? 'opacity-65' : ''}`,
        style: { paddingInlineStart: `${depth * 20 + 8}px` }
      },
        hasKids
          ? React.createElement('button', {
              className: 'p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0',
              onClick: (e) => { e.stopPropagation(); setOpen((x) => !x); }
            }, open ? React.createElement(ChevronDown, { size: 13 }) : React.createElement(ChevronRight, { size: 13 }))
          : React.createElement('span', { className: 'w-5 shrink-0' }),
        React.createElement('input', {
          type: 'checkbox',
          checked: sel,
          onChange: () => onToggle(String(node.id)),
          className: 'w-3.5 h-3.5 accent-indigo-600 shrink-0 cursor-pointer'
        }),
        React.createElement('span', {
          className: `ms-1.5 text-[12px] cursor-pointer flex items-center gap-2 min-w-0 ${hasKids ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'} ${isEffectivelyInactive ? 'text-slate-500 dark:text-slate-400' : ''}`,
          onClick: () => onToggle(String(node.id))
        },
          React.createElement('span', {
            className: 'text-slate-500 dark:text-slate-400 text-[11px] shrink-0 min-w-[72px]'
          }, node.code || '-'),
          React.createElement('span', { className: 'truncate' }, name),
          isDirectInactive && React.createElement('span', {
            className: 'inline-flex items-center rounded-full border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold shrink-0'
          }, isRtl ? 'غیرفعال' : 'Inactive'),
          isInheritedInactive && React.createElement('span', {
            className: 'inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-bold shrink-0'
          }, isRtl ? 'غیرفعال (ارثی)' : 'Inactive (Inherited)')
        )
      ),
      open && hasKids && node.children.map((c) =>
        React.createElement(TreeNode, { key: c.id, node: c, depth: depth + 1, selectedIds, onToggle, isRtl, resetToken, expandMode, inheritedInactive: isEffectivelyInactive })
      )
    );
  };

  const MultiSelectDropdown = ({
    label,
    options = [],
    selected = new Set(),
    onToggle = () => {},
    onSelectAll = () => {},
    onClear = () => {},
    summary = '',
    isRtl = true,
    disabled = false,
    hideLabel = false,
    triggerClassName = '',
    triggerStyle = null,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef(null);
    const dropdownRef = useRef(null);
    const [rect, setRect] = useState(null);
    const ReactDOM = window.ReactDOM;

    useEffect(() => {
      const onDocClick = (e) => {
        const insideRoot = rootRef.current && rootRef.current.contains(e.target);
        const insideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
        if (!insideRoot && !insideDropdown) setIsOpen(false);
      };
      if (isOpen) document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [isOpen]);

    useEffect(() => {
      const updateRect = () => {
        if (rootRef.current) setRect(rootRef.current.getBoundingClientRect());
      };
      if (isOpen) {
        updateRect();
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);
      }
      return () => {
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
      };
    }, [isOpen]);

    return React.createElement('div', { className: 'flex flex-col gap-1 w-full min-w-0 relative', ref: rootRef },
      !hideLabel && React.createElement('label', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300' }, label),
      React.createElement('button', {
        type: 'button',
        disabled,
        onClick: () => !disabled && setIsOpen((v) => !v),
        style: triggerStyle || undefined,
        className: `h-8 px-2.5 rounded-lg border flex items-center justify-between text-[12px] transition-colors ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
            : 'bg-white dark:bg-slate-700/40 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500 hover:border-indigo-400'
        } ${triggerClassName}`
      },
        React.createElement('span', { className: 'truncate text-start' }, summary),
        React.createElement(ChevronDown, { size: 14 })
      ),

      isOpen && rect && (ReactDOM
        ? ReactDOM.createPortal(
            React.createElement('div', {
              ref: dropdownRef,
              style: {
                position: 'fixed',
                top: rect.bottom + 4,
                [isRtl ? 'right' : 'left']: isRtl ? Math.max(8, window.innerWidth - rect.right) : Math.max(8, rect.left),
                width: Math.max(rect.width, 260),
                zIndex: 999999,
              },
              className: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150'
            },
              React.createElement('div', { className: 'flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-900/40' },
                React.createElement('button', {
                  type: 'button',
                  className: 'text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline',
                  onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); },
                  onClick: onSelectAll
                }, isRtl ? 'انتخاب همه' : 'Select All'),
                React.createElement('button', {
                  type: 'button',
                  className: 'text-[10px] font-bold text-rose-500 hover:underline',
                  onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); },
                  onClick: onClear
                }, isRtl ? 'پاک کردن' : 'Clear')
              ),
              React.createElement('div', { className: 'max-h-56 overflow-y-auto custom-scrollbar' },
                options.map((opt) => {
                  const checked = selected.has(String(opt.value));
                  return React.createElement('button', {
                    key: opt.value,
                    type: 'button',
                    onMouseDown: (e) => { e.preventDefault(); e.stopPropagation(); },
                    onClick: () => onToggle(String(opt.value)),
                    className: `w-full px-2.5 py-1.5 flex items-center gap-2 text-[12px] border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 ${
                      checked
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    }`
                  },
                    React.createElement('span', {
                      className: `w-4 h-4 rounded border flex items-center justify-center ${checked ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 dark:border-slate-500 text-transparent'}`
                    }, React.createElement(Check, { size: 10 })),
                    React.createElement('span', { className: 'truncate text-start' }, opt.label)
                  );
                })
              )
            ),
            document.body
          )
        : null)
    );
  };

  const BalanceMonthlyReport = ({
    language,
    formCode,
    isRtl,
    t,
    fmt,
    fmtDecimal,
    fmtDate,
    resolveRate,
    getInitialCellDrillModal,
    filters,
    setFilters,
    fYears,
    setFYears,
    fMonths,
    setFMonths,
    fBalanceGroups,
    setFBalanceGroups,
    currencies,
    balanceGroups,
    fiscalYears,
    availableMonths,
    accountTree,
    loadingFiscalFilters,
    loadingBalanceGroups,
    loadingTree,
    generating,
    selectedIds,
    setSelectedIds,
    selectedLeafCount,
    showInactiveAccounts,
    setShowInactiveAccounts,
    settingsOpen,
    setSettingsOpen,
    settingsTreeResetToken,
    settingsTreeExpandMode,
    setSettingsTreeExpandMode,
    reportData,
    setReportData,
    gridState,
    setGridState,
    cellDrillModal,
    setCellDrillModal,
    toast,
    setToast,
    showToast,
    defaultYearId,
    toggleYear,
    toggleMonth,
    clearYearAndPeriods,
    toggleBalanceGroup,
    toggleId,
    selectAllTree,
    handleGenerate,
    openCellDrill,
    viewConfig,
  }) => {
    const accountFilterTypeOptions = useMemo(() => ([
      { value: 'balance_group', label: t('گروه بالانس', 'Balance Group') },
      { value: 'account', label: t('انتخاب حساب', 'Select Account') },
    ]), [t]);

    const balanceGroupOptions = useMemo(() =>
      (balanceGroups || []).map((g) => ({
        value: String(g.id),
        label: `${g.code ? `${g.code} - ` : ''}${g.displayLabel || '-'}`,
      })),
      [balanceGroups]
    );

    const balanceGroupSummary = useMemo(() =>
      fBalanceGroups.size > 0
        ? t(`${fBalanceGroups.size} گروه انتخاب شده`, `${fBalanceGroups.size} groups selected`)
        : t('انتخاب گروه‌های بالانس', 'Select balance groups'),
      [fBalanceGroups, t]
    );

    const currencyLovData = useMemo(() => (currencies || []).map((c) => ({
      ...c,
      displayLabel: `${c.code || ''} - ${c.title || ''}${c.symbol ? ` (${c.symbol})` : ''}`.trim()
    })), [currencies]);

    const currencyLovCols = useMemo(() => [
      { field: 'code', header_fa: 'کد ارز', header_en: 'Code', width: '90px' },
      { field: 'title', header_fa: 'عنوان ارز', header_en: 'Title', width: '180px' },
      { field: 'symbol', header_fa: 'نماد', header_en: 'Symbol', width: '70px' },
    ], []);

    const yearOptions = useMemo(() =>
      (fiscalYears || [])
        .map((y) => {
          const calTitle = y.calendarType === 'GREGORIAN'
            ? t('میلادی', 'Gregorian')
            : t('شمسی', 'Jalali');
          return {
            value: String(y.id),
            label: `${y.yearCode || '-'} (${calTitle})`
          };
        }),
      [fiscalYears, t]
    );

    const monthOptions = useMemo(() => availableMonths.map((m) => ({ value: m.key, label: m.label })), [availableMonths]);
    const yearSummary = useMemo(() => fYears.size > 0 ? t(`${fYears.size} سال انتخاب شده`, `${fYears.size} years selected`) : t('انتخاب سال‌ها', 'Select years'), [fYears, t]);
    const monthSummary = useMemo(() => fMonths.size > 0 ? t(`${fMonths.size} دوره انتخاب شده`, `${fMonths.size} periods selected`) : t('انتخاب دوره‌ها', 'Select periods'), [fMonths, t]);

    const advancedFilterFields = useMemo(() => ([
      {
        name: 'f_years',
        label: t('سال مالی', 'Fiscal Year'),
        type: 'custom',
        render: ({ key }) => React.createElement('div', { key, className: 'w-full min-w-0' },
          React.createElement(MultiSelectDropdown, {
            label: t('سال مالی', 'Fiscal Year'),
            options: yearOptions,
            selected: fYears,
            onToggle: toggleYear,
            onSelectAll: () => setFYears(new Set(yearOptions.map((o) => String(o.value)))),
            onClear: clearYearAndPeriods,
            summary: loadingFiscalFilters ? t('در حال بارگذاری...', 'Loading...') : yearSummary,
            isRtl,
            disabled: loadingFiscalFilters,
          })
        )
      },
      {
        name: 'f_months',
        label: t('دوره‌های مالی', 'Fiscal Periods'),
        type: 'custom',
        render: ({ key }) => React.createElement('div', { key, className: 'w-full min-w-0' },
          React.createElement(MultiSelectDropdown, {
            label: t('دوره‌های مالی', 'Fiscal Periods'),
            options: monthOptions,
            selected: fMonths,
            onToggle: toggleMonth,
            onSelectAll: () => setFMonths(new Set(monthOptions.map((o) => String(o.value)))),
            onClear: () => setFMonths(new Set()),
            summary: loadingFiscalFilters ? t('در حال بارگذاری...', 'Loading...') : monthSummary,
            isRtl,
            disabled: loadingFiscalFilters || fYears.size === 0,
          })
        )
      },
      {
        name: 'account_filter_type',
        label: t('فیلتر نوع حساب', 'Account Filter Type'),
        type: 'select',
        options: accountFilterTypeOptions,
      },
      {
        name: 'account_group_selector',
        label: filters.account_filter_type === 'balance_group'
          ? t('انتخاب گروه‌ها', 'Select Groups')
          : t('انتخاب حساب‌ها', 'Select Accounts'),
        type: 'custom',
        render: ({ key }) => React.createElement('div', { key, className: 'w-full min-w-0 flex flex-col gap-1' },
          React.createElement('label', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300' },
            filters.account_filter_type === 'balance_group'
              ? t('انتخاب گروه‌ها / درخت حساب', 'Select Groups / Account Tree')
              : t('انتخاب حساب‌ها / درخت حساب', 'Select Accounts / Account Tree')
          ),
          React.createElement('div', { className: 'w-full min-w-0 flex items-stretch gap-0' },
            filters.account_filter_type === 'balance_group'
              ? React.createElement('div', { className: 'flex-1 min-w-0' },
                  React.createElement(MultiSelectDropdown, {
                    label: t('انتخاب گروه‌ها', 'Select Groups'),
                    options: balanceGroupOptions,
                    selected: fBalanceGroups,
                    onToggle: toggleBalanceGroup,
                    onSelectAll: () => setFBalanceGroups(new Set(balanceGroupOptions.map((o) => String(o.value)))),
                    onClear: () => setFBalanceGroups(new Set()),
                    summary: loadingBalanceGroups ? t('در حال بارگذاری...', 'Loading...') : balanceGroupSummary,
                    isRtl,
                    disabled: loadingBalanceGroups,
                    hideLabel: true,
                    triggerClassName: 'rounded-r-lg rounded-l-none',
                    triggerStyle: isRtl
                      ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }
                      : { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                  })
                )
              : React.createElement('div', {
                  className: 'flex-1 min-w-0 h-8 px-2.5 border bg-white dark:bg-slate-700/40 border-slate-300 dark:border-slate-500 flex items-center text-[12px] text-slate-600 dark:text-slate-300 truncate rounded-r-lg rounded-l-none',
                  style: isRtl
                    ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }
                    : { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                },
                  t(`${selectedLeafCount} حساب انتخاب شده`, `${selectedLeafCount} accounts selected`)
                ),
            React.createElement('button', {
              type: 'button',
              onClick: () => setSettingsOpen(true),
              className: 'h-8 px-2.5 border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[12px] font-bold whitespace-nowrap hover:bg-indigo-100 dark:hover:bg-indigo-900/45 transition-colors rounded-l-lg rounded-r-none',
              style: isRtl
                ? { borderTopRightRadius: 0, borderBottomRightRadius: 0, marginRight: '-1px' }
                : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: '-1px' }
            }, t('درخت حساب', 'Account Tree'))
          )
        )
      },
      {
        name: 'currency',
        label: t('نوع ارز', 'Currency Type'),
        type: 'lov',
        lovData: currencyLovData,
        lovColumns: currencyLovCols,
        dropdownWidth: 'min-w-[360px]'
      },
      {
        name: 'show_movements',
        label: t('نمایش واریز/ برداشت', 'Show Deposit/Withdrawal'),
        type: 'toggle',
      }
    ]), [
      t,
      filters.account_filter_type,
      accountFilterTypeOptions,
      balanceGroupOptions,
      fBalanceGroups,
      toggleBalanceGroup,
      balanceGroupSummary,
      loadingBalanceGroups,
      selectedLeafCount,
      clearYearAndPeriods,
      currencyLovData,
      currencyLovCols,
      yearOptions,
      monthOptions,
      yearSummary,
      monthSummary,
      fYears,
      isRtl,
      toggleYear,
      toggleMonth,
      loadingFiscalFilters,
      setFBalanceGroups,
      setFMonths,
      setFYears,
      setSettingsOpen,
    ]);

    const advancedFilterValues = useMemo(() => ({
      account_filter_type: filters.account_filter_type || 'account',
      currency: filters.currency || null,
      show_movements: !!filters.show_movements,
    }), [filters]);

    const handleAdvancedFilterChange = useCallback((vals) => {
      setFilters((prev) => ({
        ...prev,
        account_filter_type: vals?.account_filter_type || 'account',
        currency: vals?.currency || null,
        show_movements: !!vals?.show_movements,
      }));
    }, [setFilters]);

    const columns = useMemo(() => {
      if (!reportData) return [];
      const { slots, showMovements } = reportData;
      const getCurrencyMarker = (code) => {
        const c = String(code || '').toUpperCase();
        if (!c) return '';
        if (c === 'USD') return '$';
        if (c === 'IRR' || c === 'RIAL' || c === 'RLS') return 'IRR';
        return c;
      };
      const renderAmountWithMarker = (amount, currencyCode, numberClass) =>
        React.createElement('div', {
          className: 'inline-flex items-center gap-1.5 min-w-0',
          dir: 'ltr'
        },
        React.createElement('span', {
          className: 'text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0'
        }, getCurrencyMarker(currencyCode) || '---'),
        React.createElement('span', {
          className: numberClass,
          dir: 'rtl'
        }, fmt(amount))
      );

      const titleCol = {
        field: '_title',
        header_fa: 'حساب / گروه',
        header_en: 'Account / Group',
        width: '300px',
        render: (val, row) => {
          const depth = row._depth || 0;
          const isGrand = row._type === 'grand_total';
          const isHdr = row._type === 'group_header';
          const isCurrency = row._type === 'currency_header';
          const textCls = isGrand
            ? 'font-black text-slate-700 dark:text-slate-200'
            : isHdr
              ? 'font-bold text-slate-800 dark:text-slate-100'
              : isCurrency
                ? 'font-semibold text-teal-700 dark:text-teal-300'
                : 'font-medium text-slate-700 dark:text-slate-300';
          return React.createElement('div', {
            style: { paddingInlineStart: `${depth * 16}px` },
            className: 'flex items-center gap-1'
          },
            isGrand && React.createElement('span', { className: 'text-slate-500 text-[10px] me-0.5' }, '●'),
            isHdr && React.createElement('span', { className: 'text-indigo-400 text-[10px] me-0.5' }, '■'),
            isCurrency && React.createElement('span', { className: 'text-teal-400 text-[10px] me-0.5' }, '◆'),
            React.createElement('span', { className: `text-[12px] leading-tight ${textCls}` }, val || '—')
          );
        }
      };

      const currCol = {
        field: '_currency',
        header_fa: 'ارز',
        header_en: 'Currency',
        width: '65px',
        render: (val, row) => val
          ? React.createElement('span', {
              className: 'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-sans whitespace-nowrap border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }, val)
          : React.createElement('span', { className: 'text-[10px] text-slate-300 dark:text-slate-600' },
              row._type === 'leaf' ? '—' : ''
            )
      };

      const slotCols = slots.map((slot) => ({
        field: slot.key,
        header_fa: slot.label,
        header_en: slot.label,
        width: '130px',
        render: (val, row) => {
          if (!val) return React.createElement('span', { className: 'text-slate-200 dark:text-slate-700 text-[11px]' }, '—');

          let content = null;
          if (row._type === 'leaf') {
            const bal = val.nat ?? 0;
            if (showMovements) {
              const dep = val.dep ?? 0;
              const wid = val.wid ?? 0;
              content = React.createElement('div', { className: 'flex flex-col gap-0.5 leading-4 whitespace-nowrap' },
                React.createElement('span', {
                  className: 'font-sans text-emerald-700 dark:text-emerald-400 tabular-nums text-[11px]',
                  dir: 'rtl'
                }, fmt(dep)),
                React.createElement('span', {
                  className: 'font-sans text-rose-600 dark:text-rose-400 tabular-nums text-[11px]',
                  dir: 'rtl'
                }, fmt(-Math.abs(wid))),
                React.createElement('span', {
                  className: 'font-sans text-slate-800 dark:text-slate-200 tabular-nums text-[11px] font-semibold',
                  dir: 'rtl'
                }, fmt(bal))
              );
            } else {
              const clr = bal === 0
                ? 'text-slate-400 dark:text-slate-500'
                : bal > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400';
              content = React.createElement('span', {
                className: `font-sans tabular-nums text-[12px] whitespace-nowrap ${clr}`,
                dir: 'rtl'
              }, fmt(bal));
            }
          } else {
            const isGrand = row._type === 'grand_total';
            const isCurrency = row._type === 'currency_header';
            content = React.createElement('div', { className: 'flex flex-col gap-0.5 leading-4 items-end' },
              isCurrency && renderAmountWithMarker(
                val.nat || 0,
                row._currency || '',
                'font-sans tabular-nums text-[11px] font-semibold text-teal-700 dark:text-teal-300'
              ),
              renderAmountWithMarker(
                val.usd || 0,
                'USD',
                `font-sans tabular-nums text-[11px] ${isGrand ? 'font-black text-sky-700 dark:text-sky-300' : 'text-sky-700 dark:text-sky-400'}`
              ),
              renderAmountWithMarker(
                val.irr || 0,
                'IRR',
                `font-sans tabular-nums text-[11px] ${isGrand ? 'font-black text-amber-700 dark:text-amber-300' : 'text-amber-700 dark:text-amber-400'}`
              )
            );
          }

          return React.createElement('button', {
            type: 'button',
            className: 'w-full text-right cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 rounded px-0.5 py-0.5',
            onClick: () => openCellDrill(row, slot, val),
            title: t('کلیک کنید تا اقلام این دوره نمایش داده شود', 'Click to view period transaction items')
          }, content);
        },
        exportValue: (val, row) => {
          if (!val) return '';
          if (row._type === 'leaf') {
            if (showMovements) {
              return `dep:${fmt(val.dep || 0)} | wid:${fmt(-Math.abs(val.wid || 0))} | bal:${fmt(val.nat || 0)}`;
            }
            return String(val.nat ?? '');
          }
          if (row._type === 'currency_header') return `${row._currency || 'N/A'}:${fmt(val.nat || 0)} / USD:${fmt(val.usd || 0)} / IRR:${fmt(val.irr || 0)}`;
          return `USD:${fmt(val.usd || 0)} / IRR:${fmt(val.irr || 0)}`;
        }
      }));

      return [titleCol, currCol, ...slotCols];
    }, [reportData, openCellDrill, t, fmt]);

    const handleClearFilters = useCallback(() => {
      setFilters({ currency: null, show_movements: false });
      setFYears(defaultYearId ? new Set([String(defaultYearId)]) : new Set());
      setFMonths(new Set());
      setReportData(null);
      setGridState(null);
    }, [defaultYearId, setFMonths, setFYears, setFilters, setGridState, setReportData]);

    const renderSettings = () =>
      React.createElement(Modal, {
        isOpen: settingsOpen,
        onClose: () => setSettingsOpen(false),
        title: t('تنظیمات گزارش — انتخاب حساب‌ها', 'Report Settings — Select Accounts'),
        language,
        width: 'max-w-lg'
      },
        React.createElement('div', { className: 'flex flex-col gap-3 p-4 max-h-[72vh] overflow-hidden' },
          React.createElement('div', { className: 'flex items-start justify-between gap-3 shrink-0' },
            React.createElement('p', { className: 'text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[70%]' },
              filters.account_filter_type === 'balance_group'
                ? t(
                    'حساب‌های این درخت براساس گروه‌های بالانس انتخابی تیک خورده‌اند. در صورت نیاز می‌توانید همینجا آن‌ها را کم یا زیاد کنید.',
                    'Accounts are pre-selected from the chosen balance groups. You can fine-tune selection here.'
                  )
                : t(
                    'شاخه‌ها یا حساب‌هایی که می‌خواهید در گزارش نمایش داده شوند را انتخاب کنید. انتخاب یک شاخه، تمام زیرمجموعه‌های آن را شامل می‌شود.',
                    'Select branches or accounts to include in the report. Selecting a branch includes all its descendants.'
                  )
            ),
            React.createElement('div', { className: 'flex gap-3 shrink-0' },
              React.createElement('button', {
                className: 'text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline',
                onClick: selectAllTree
              }, t('انتخاب همه', 'Select All')),
              React.createElement('button', {
                className: 'text-[11px] text-rose-500 hover:underline',
                onClick: () => setSelectedIds(new Set())
              }, t('پاک کردن', 'Clear All'))
            )
          ),

          React.createElement('div', {
            className: 'flex items-center justify-between gap-2 shrink-0 px-1'
          },
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowInactiveAccounts((v) => !v),
              className: 'inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors'
            },
              React.createElement('span', { className: 'whitespace-nowrap' }, t('نمایش حساب‌های غیرفعال', 'Show inactive accounts')),
              React.createElement('span', {
                className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showInactiveAccounts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`
              },
                React.createElement('span', {
                  className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showInactiveAccounts ? (isRtl ? '-translate-x-0.5' : 'translate-x-4') : (isRtl ? '-translate-x-4' : 'translate-x-0.5')}`
                })
              )
            ),
            React.createElement('div', { className: 'flex items-center gap-1' },
              React.createElement('button', {
                type: 'button',
                onClick: () => setSettingsTreeExpandMode('expand'),
                title: t('باز کردن همه', 'Expand All'),
                'aria-label': t('باز کردن همه', 'Expand All'),
                className: 'p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all'
              }, React.createElement(Maximize2, { size: 14 })),
              React.createElement('button', {
                type: 'button',
                onClick: () => setSettingsTreeExpandMode('collapse'),
                title: t('بستن همه', 'Collapse All'),
                'aria-label': t('بستن همه', 'Collapse All'),
                className: 'p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all'
              }, React.createElement(Minimize2, { size: 14 }))
            )
          ),

          React.createElement('div', {
            className: 'flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 min-h-[300px] py-1'
          },
            loadingTree
              ? React.createElement('div', { className: 'flex items-center justify-center p-8 text-slate-400 gap-2' },
                  React.createElement('div', { className: 'w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' }),
                  t('بارگذاری درخت حساب‌ها...', 'Loading account tree...')
                )
              : accountTree.length === 0
                ? React.createElement(EmptyState, {
                    title: t('درختی یافت نشد', 'No Account Tree Found'),
                    description: t('هیچ نمودار حساب فعالی وجود ندارد.', 'No active chart of accounts exists.'),
                    language
                  })
                : accountTree.map((root) =>
                    React.createElement(TreeNode, {
                      key: root.id,
                      node: root,
                      depth: 0,
                      selectedIds,
                      onToggle: toggleId,
                      isRtl,
                      resetToken: settingsTreeResetToken,
                      expandMode: settingsTreeExpandMode,
                      inheritedInactive: false
                    })
                  )
          ),

          React.createElement('div', {
            className: 'flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3 shrink-0'
          },
            React.createElement('span', { className: 'text-[12px] text-slate-500 dark:text-slate-400' },
              t(`${selectedLeafCount} حساب انتخاب شده`, `${selectedLeafCount} accounts selected`)
            ),
            React.createElement(Button, {
              variant: 'primary',
              size: 'sm',
              onClick: () => setSettingsOpen(false)
            }, t('تایید', 'Confirm'))
          )
        )
      );

    const renderGrid = () => {
      if (!reportData) return null;
      const { slots, groupedRows, grandTotal } = reportData;

      const grandRow = {
        _id: '__grand_total__', _type: 'grand_total', _depth: 0,
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700/50',
        _title: t('جمع کل (USD / IRR)', 'Grand Total (USD / IRR)'),
        _currency: '',
        _leafIds: Array.from(reportData.reportAccountLookup?.keys?.() || []),
        _rowId: '__grand_total__',
        _parentRowId: null,
      };
      slots.forEach((s) => { grandRow[s.key] = grandTotal[s.key] || { usd: 0, irr: 0 }; });

      const treeRows = [...groupedRows, grandRow];

      const toolbarStartContent = React.createElement('div', { className: 'flex items-center gap-2 px-1' },
        React.createElement('span', { className: 'text-[12px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold' },
          t(
            `${selectedLeafCount} حساب انتخابی · ${slots.length} دوره`,
            `${selectedLeafCount} selected accounts · ${slots.length} periods`
          )
        )
      );

      return React.createElement('div', { className: 'h-full flex flex-col min-h-0' },
        React.createElement('div', { className: 'flex-1 min-h-0' },
          React.createElement(TreeGrid, {
            key: `bmr-tree-${slots.length}-${groupedRows.length}`,
            data: treeRows,
            idField: '_rowId',
            parentField: '_parentRowId',
            columns,
            actions: [],
            selectable: false,
            language,
            formCode,
            gridState,
            onGridStateChange: setGridState,
            toolbarStartContent,
            placeExpandControlsOnEnd: false,
            placeSearchBeforeExpandControls: false,
            exportFileName: `balance_monthly_report_${new Date().getTime()}.csv`,
            onExport: () => showToast(t('خروجی گزارش آماده شد.', 'Report export completed.'), 'success'),
          })
        )
      );
    };

    const renderCellDrillModal = () => React.createElement(BalanceMonthlyReportDetailsModal, {
      isOpen: cellDrillModal.isOpen,
      onClose: () => setCellDrillModal(getInitialCellDrillModal()),
      language,
      t,
      isRtl,
      fmtDecimal,
      fmtDate,
      reportData,
      cellDrillModal,
      initialGridState: { pageSize: 10 },
      reportAccountLookup: reportData?.reportAccountLookup || new Map(),
      COST_TYPE_LOOKUP: new Map(),
      INCOME_TYPE_LOOKUP: new Map(),
      CENTER_LOOKUP: new Map(),
      resolveConversionRate: (lookup, fromCode, toCode, date, cache) => resolveRate(lookup, fromCode, toCode, date, cache),
      Badge,
      DataGrid,
      EmptyState,
      Modal,
      formCode
    });

    return React.createElement('div', {
      className: 'h-full flex flex-col font-sans',
      dir: isRtl ? 'rtl' : 'ltr'
    },
      React.createElement('div', {
        className: 'p-4 h-full flex flex-col bg-slate-50/50 dark:bg-slate-900 overflow-hidden'
      },
        React.createElement(PageHeader, {
          title: t('گزارش ماهیانه بالانس', 'Monthly Balance Report'),
          icon: BarChart2,
          language,
          viewConfig,
          description: t(
            'موجودی ماهیانه حساب‌ها با گروه‌بندی درختی و تجمیع به USD / IRR',
            'Monthly account balances with hierarchical grouping and USD / IRR aggregation'
          ),
          breadcrumbs: [
            { label: t('مدیریت مالی', 'Financial Management') },
            { label: t('گزارش ماهیانه بالانس', 'Monthly Balance Report') }
          ],
        }),

        React.createElement('div', { className: 'flex-1 min-h-0 flex flex-col mt-2 gap-2 overflow-hidden' },
          React.createElement(AdvancedFilter, {
            title: t('فیلتر پیشرفته گزارش', 'Report Advanced Filter'),
            fields: advancedFilterFields,
            initialValues: advancedFilterValues,
            onFilter: handleAdvancedFilterChange,
            onClear: handleClearFilters,
            onSearch: handleGenerate,
            language,
            defaultOpen: true,
            inlineChildren: false,
            footerStartContent: React.createElement('div', {
              className: 'text-[12px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap'
            },
              filters.account_filter_type === 'balance_group'
                ? t(`${selectedLeafCount} حساب از گروه‌های بالانس انتخاب شده`, `${selectedLeafCount} accounts selected from balance groups`)
                : t(`${selectedLeafCount} حساب انتخاب شده`, `${selectedLeafCount} selected accounts`)
            ),
          }),

          generating
            ? React.createElement('div', {
                className: 'flex-1 flex items-center justify-center gap-2 text-[13px] text-slate-500 dark:text-slate-400'
              },
                React.createElement('div', { className: 'w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0' }),
                t('در حال محاسبه گزارش...', 'Generating report...')
              )

            : !reportData
              ? React.createElement('div', { className: 'flex-1' },
                  React.createElement(EmptyState, {
                    title: t('گزارش تولید نشده', 'Report Not Generated'),
                    description: t(
                      'دوره‌های مالی را انتخاب کنید، از «تنظیمات گزارش» حساب‌ها را تعیین کنید، سپس «جستجو» را بزنید.',
                      'Select fiscal periods, configure accounts via "Report Settings", then click "Search".'
                    ),
                    language,
                    action: null
                  })
                )

              : React.createElement('div', {
                  className: 'flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm'
                },
                  renderGrid()
                )
        )
      ),

      renderSettings(),

      renderCellDrillModal(),

      React.createElement(Toast, {
        isVisible: toast.isVisible,
        message: toast.message,
        type: toast.type,
        onClose: () => setToast((p) => ({ ...p, isVisible: false })),
        language
      })
    );
  };

  window.BalanceMonthlyReport = BalanceMonthlyReport;
})();
