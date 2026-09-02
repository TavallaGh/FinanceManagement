/* Filename: financial/BalanceMonthlyReport.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const FallbackComponent = () => null;

  const LucideIcons = window.LucideIcons || {};
  const BarChart2 = LucideIcons.BarChart2 || LucideIcons.TrendingUp || FallbackIcon;
  const Settings  = LucideIcons.Settings  || FallbackIcon;
  const Check     = LucideIcons.Check     || FallbackIcon;
  const X         = LucideIcons.X         || FallbackIcon;
  const ChevronDown  = LucideIcons.ChevronDown  || FallbackIcon;
  const ChevronRight = LucideIcons.ChevronRight || FallbackIcon;
  const Maximize2 = LucideIcons.Maximize2 || FallbackIcon;
  const Minimize2 = LucideIcons.Minimize2 || FallbackIcon;

  const DS        = window.DesignSystem || {};
  const Core      = window.DSCore       || DS || {};
  const DSGridMod = window.DSGrid       || DS || {};
  const DSTreeMod = window.DSTree       || DS || {};
  const Feedback  = window.DSFeedback   || window.DSOverlays || DS || {};

  const PageHeader  = Core.PageHeader         || FallbackComponent;
  const EmptyState  = Core.EmptyState         || FallbackComponent;
  const Badge       = Core.Badge              || FallbackComponent;
  const Button      = Core.Button             || FallbackComponent;
  const Modal       = Feedback.Modal          || FallbackComponent;
  const Toast       = Feedback.Toast          || FallbackComponent;
  const DataGrid    = DSGridMod.DataGrid      || FallbackComponent;
  const AdvancedFilter = DSGridMod.AdvancedFilter || FallbackComponent;
  const TreeGrid    = DSTreeMod.TreeGrid      || FallbackComponent;
  const BalanceMonthlyReportDetailsModal = window.BalanceMonthlyReportDetailsModal || window.BalanceReportDrillModal || FallbackComponent;
  const DetailsHelpers = window.BalanceMonthlyReportDetails || {};

  const Logic = window.BalanceMonthlyReportLogic || {};
  const {
    pad2 = (n) => String(n).padStart(2, '0'),
    normalizeSlashDate = (v) => String(v || '').replace(/-/g, '/'),
    normalizeDashDate = (v) => String(v || '').replace(/\//g, '-'),
    monthLabel = (year, month) => `${month}/${year}`,
    currentCalYear = () => new Date().getFullYear(),
    slotTargetDate = (year, month, day) => {
      const d = String(day || '01').toUpperCase() === 'LAST' ? '31' : String(day || '01').padStart(2, '0');
      const slash = `${year}/${String(month).padStart(2, '0')}/${d}`;
      return { slash, dash: slash.replace(/\//g, '-') };
    },
    prevMonthSlot = (year, month) => (month <= 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }),
    fmt = (num) => {
      if (num === null || num === undefined) return '—';
      const v = parseFloat(num);
      if (Number.isNaN(v)) return '—';
      if (v === 0) return '0';
      const abs = Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return v < 0 ? `(${abs})` : abs;
    },
    fmtDecimal = (num, maxFractionDigits = 6) => {
      if (num === null || num === undefined) return '—';
      const value = Number(num);
      if (Number.isNaN(value)) return '—';
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFractionDigits
      });
    },
    buildRateLookup = () => new Map(),
    resolveRate = () => 0,
    buildTree = (accounts) => accounts || [],
    buildGroupedRows = () => [],
    generateMonthlyReportData = async () => ({ kind: 'ok', reportData: null }),
  } = Logic;
  const {
    getInitialCellDrillModal = () => ({
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
    }),
    createCellDrillModalState = () => null,
  } = DetailsHelpers;

  // ── Account tree node component ────────────────────────────────────────────
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
              onClick: (e) => { e.stopPropagation(); setOpen(x => !x); }
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
          }, isRtl ? 'غیرفعال' : 'Inactive')
          ,
          isInheritedInactive && React.createElement('span', {
            className: 'inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-bold shrink-0'
          }, isRtl ? 'غیرفعال (ارثی)' : 'Inactive (Inherited)')
        )
      ),
      open && hasKids && node.children.map(c =>
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
      React.createElement('label', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300' }, label),
      React.createElement('button', {
        type: 'button',
        disabled,
        onClick: () => !disabled && setIsOpen(v => !v),
        className: `h-8 px-2.5 rounded-lg border flex items-center justify-between text-[12px] transition-colors ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
            : 'bg-white dark:bg-slate-700/40 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500 hover:border-indigo-400'
        }`
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
                options.map(opt => {
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

  // ══════════════════════════════════════════════════════════════════════════
  const BalanceMonthlyReport = ({ language = 'fa', formCode = 'FIN_BALANCE_MONTHLY_REPORT' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => (isRtl ? fa : en), [isRtl]);
    const cal = Core.useCalendarMode ? Core.useCalendarMode() : (isRtl ? 'jalali' : 'gregorian');
    const fmtDate = useCallback((d) => {
      const slash = normalizeSlashDate(d);
      return Core.formatGlobalDate ? Core.formatGlobalDate(slash, cal) : slash;
    }, [cal]);
    const supabase = window.supabase;

    const sessionData = useMemo(() => {
      try { return JSON.parse(sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}'); }
      catch { return {}; }
    }, []);
    const navUser = window.NavigationSystem?.currentUser || {};
    const currentUserId = sessionData.id || navUser.id || null;
    const userType = (sessionData.type || sessionData.user_type || navUser.user_type || '').toLowerCase();
    const isAdmin = userType === 'admin' || userType === 'superadmin';

    const secCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const raw = secCtx ? secCtx.getActions(formCode) : null;
      return raw || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [secCtx, formCode]);

    const curYear = useMemo(() => currentCalYear(cal), [cal]);

    // ── Filter state ───────────────────────────────────────────────────────
    const [filters,   setFilters]   = useState({ report_day: 'LAST', currency: null, show_movements: false });
    const [fYears,    setFYears]    = useState(() => new Set([String(curYear)]));
    const [fMonths,   setFMonths]   = useState(() => new Set());

    // ── Data / UI state ────────────────────────────────────────────────────
    const [currencies,   setCurrencies]   = useState([]);
    const [fullAccountTree, setFullAccountTree] = useState([]);
    const [accountMap,   setAccountMap]   = useState(new Map());
    const [selectedIds,  setSelectedIds]  = useState(new Set());
    const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTreeResetToken, setSettingsTreeResetToken] = useState(0);
    const [settingsTreeExpandMode, setSettingsTreeExpandMode] = useState('collapse');
    const [loadingTree,  setLoadingTree]  = useState(false);
    const [generating,   setGenerating]   = useState(false);
    const [reportData,   setReportData]   = useState(null);
    const [gridState,    setGridState]    = useState(null);
    const [cellDrillModal, setCellDrillModal] = useState(() => getInitialCellDrillModal());
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
    }, []);

    useEffect(() => {
      if (settingsOpen) {
        setSettingsTreeResetToken(v => v + 1);
        setSettingsTreeExpandMode('collapse');
      }
    }, [settingsOpen]);

    // ── Load currencies ────────────────────────────────────────────────────
    useEffect(() => {
      if (!supabase) return;
      supabase.from('fm_currencies').select('id, code, title, symbol').order('code')
        .then(({ data }) => setCurrencies(data || []));
    }, []);

    // ── Load account tree ──────────────────────────────────────────────────
    const loadTree = useCallback(async () => {
      if (!supabase) return;
      setLoadingTree(true);
      try {
        const { data: charts } = await supabase.from('fm_coa_charts').select('id').eq('is_active', true);
        const chartIds = (charts || []).map(c => String(c.id));
        if (!chartIds.length) { setFullAccountTree([]); setAccountMap(new Map()); return; }

        const { data: accs } = await supabase.from('fm_coa_accounts')
          .select('id, code, title_fa, title_en, parent_id, currency_id, chart_id, is_active')
          .in('chart_id', chartIds).order('code');

        setAccountMap(new Map((accs || []).map(a => [String(a.id), a])));
        setFullAccountTree(buildTree(accs || []));
      } catch (e) {
        console.error('BalanceMonthlyReport: loadTree error', e);
      } finally {
        setLoadingTree(false);
      }
    }, [supabase]);

    useEffect(() => { loadTree(); }, [loadTree]);

    const accountTree = useMemo(() => {
      if (showInactiveAccounts) return fullAccountTree;

      const filterNodes = (nodes) => (nodes || []).reduce((acc, node) => {
        const children = filterNodes(node.children || []);
        const isActiveNode = node.is_active !== false;
        if (!isActiveNode && children.length === 0) return acc;
        acc.push({ ...node, children });
        return acc;
      }, []);

      return filterNodes(fullAccountTree);
    }, [fullAccountTree, showInactiveAccounts]);

    const reportTree = useMemo(() => (showInactiveAccounts ? fullAccountTree : accountTree), [showInactiveAccounts, fullAccountTree, accountTree]);

    // ── Year / month derivations ───────────────────────────────────────────
    const yearsRange = useMemo(() => {
      const res = [];
      for (let y = curYear - 5; y <= curYear + 3; y++) res.push(y);
      return res;
    }, [curYear]);

    const availableMonths = useMemo(() => {
      const sorted = Array.from(fYears).map(Number).sort();
      const res = [];
      sorted.forEach(y => {
        for (let m = 1; m <= 12; m++) {
          res.push({ key: `${y}/${pad2(m)}`, year: y, month: m, label: monthLabel(y, m, cal, isRtl) });
        }
      });
      return res;
    }, [fYears, cal, isRtl]);

    const toggleYear = useCallback((year) => {
      const yStr = String(year);
      setFYears(prev => {
        const next = new Set(prev);
        if (next.has(yStr)) {
          next.delete(yStr);
          setFMonths(pm => {
            const nm = new Set(pm);
            [...nm].filter(k => k.startsWith(`${yStr}/`)).forEach(k => nm.delete(k));
            return nm;
          });
        } else {
          next.add(yStr);
        }
        return next;
      });
    }, []);

    const toggleMonth = useCallback((key) =>
      setFMonths(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }), []);

    const treeNodeMap = useMemo(() => {
      const map = new Map();
      const visit = (nodes) => {
        (nodes || []).forEach(node => {
          map.set(String(node.id), node);
          visit(node.children || []);
        });
      };
      visit(reportTree);
      return map;
    }, [reportTree]);

    const selectedLeafCount = useMemo(() => {
      let count = 0;
      const walk = (nodes) => {
        (nodes || []).forEach(node => {
          const isLeaf = !node.children || node.children.length === 0;
          if (isLeaf && selectedIds.has(String(node.id))) count += 1;
          if (!isLeaf) walk(node.children);
        });
      };
      walk(reportTree);
      return count;
    }, [reportTree, selectedIds]);

    // ── Account selection ──────────────────────────────────────────────────
    const toggleId = useCallback((id) => {
      const targetId = String(id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        const targetNode = treeNodeMap.get(targetId);
        if (!targetNode) {
          if (next.has(targetId)) next.delete(targetId);
          else next.add(targetId);
          return next;
        }

        const subtreeIds = [];
        const collect = (node) => {
          subtreeIds.push(String(node.id));
          (node.children || []).forEach(collect);
        };
        collect(targetNode);

        const shouldSelect = !next.has(targetId);
        subtreeIds.forEach(nodeId => {
          if (shouldSelect) next.add(nodeId);
          else next.delete(nodeId);
        });
        return next;
      });
    }, [treeNodeMap]);

    const selectAllTree = useCallback(() => {
      const ids = new Set();
      const visit = (ns) => ns.forEach(n => { ids.add(String(n.id)); visit(n.children || []); });
      visit(accountTree);
      setSelectedIds(ids);
    }, [accountTree]);

    // ── Generate report ────────────────────────────────────────────────────
    const handleGenerate = useCallback(async () => {
      if (fMonths.size === 0) {
        showToast(t('لطفاً حداقل یک ماه انتخاب کنید.', 'Please select at least one month.'), 'warning');
        return;
      }
      if (selectedIds.size === 0) {
        showToast(t('لطفاً حساب‌ها را از طریق «تنظیمات گزارش» انتخاب کنید.', 'Please select accounts via "Report Settings".'), 'warning');
        return;
      }

      setGenerating(true);
      setReportData(null);

      try {
        const result = await generateMonthlyReportData({
          supabase,
          filters,
          availableMonths,
          fMonths,
          cal,
          currencies,
          accountMap,
          accountTree: reportTree,
          selectedIds,
          isRtl,
        });

        if (result?.kind === 'invalid_months') {
          showToast(t('ماه‌های انتخابی نامعتبر هستند.', 'Invalid selected months.'), 'warning');
          return;
        }

        if (result?.kind === 'no_leaf_accounts') {
          showToast(t('حساب‌های انتخابی برگ‌نما ندارند.', 'Selected accounts have no leaf accounts.'), 'warning');
          return;
        }

        setReportData(result?.reportData || null);
      } catch (e) {
        console.error('BalanceMonthlyReport: generate error', e);
        showToast(t('خطا در تولید گزارش', 'Error generating report'), 'error');
      } finally {
        setGenerating(false);
      }
    }, [fMonths, selectedIds, filters, availableMonths, cal, currencies, accountMap, reportTree, isRtl, t, showToast, supabase]);

    const openCellDrill = useCallback((row, slot, val) => {
      const nextModalState = createCellDrillModalState({
        reportData,
        row,
        slot,
        val,
        isRtl,
        normalizeSlashDate,
      });
      if (!nextModalState) return;
      setCellDrillModal(nextModalState);
    }, [isRtl, normalizeSlashDate, reportData, createCellDrillModalState]);

    // ── viewConfig ─────────────────────────────────────────────────────────
    const viewConfig = useMemo(() => ({
      pageId: 'balance_monthly_report',
      currentState: () => ({
        filters,
        fYears:    Array.from(fYears),
        fMonths:   Array.from(fMonths),
        selIds:    Array.from(selectedIds),
        showInactiveAccounts,
        gridState,
      }),
      onApplyState: (state) => {
        if (!state) {
          setFilters({ report_day: 'LAST', currency: null, show_movements: false });
          setFYears(new Set([String(curYear)]));
          setFMonths(new Set());
          setSelectedIds(new Set());
          setShowInactiveAccounts(false);
          setGridState(null);
          setReportData(null);
          return;
        }
        if (state.filters) setFilters(state.filters);
        if (state.fYears)  setFYears(new Set(state.fYears));
        if (state.fMonths) setFMonths(new Set(state.fMonths));
        if (state.selIds)  setSelectedIds(new Set(state.selIds));
        if (typeof state.showInactiveAccounts === 'boolean') setShowInactiveAccounts(state.showInactiveAccounts);
        if (state.gridState) setGridState(state.gridState);
      },
    }), [filters, fYears, fMonths, selectedIds, showInactiveAccounts, gridState, curYear]);

    const dayOptions = useMemo(() => {
      const opts = [{ value: 'LAST', label: t('آخرین روز ماه', 'Last Day of Month') }];
      for (let i = 1; i <= 31; i++) opts.push({ value: String(i), label: String(i) });
      return opts;
    }, [t]);

    const currencyLovData = useMemo(() => (currencies || []).map(c => ({
      ...c,
      displayLabel: `${c.code || ''} - ${c.title || ''}${c.symbol ? ` (${c.symbol})` : ''}`.trim()
    })), [currencies]);

    const currencyLovCols = useMemo(() => [
      { field: 'code', header_fa: 'کد ارز', header_en: 'Code', width: '90px' },
      { field: 'title', header_fa: 'عنوان ارز', header_en: 'Title', width: '180px' },
      { field: 'symbol', header_fa: 'نماد', header_en: 'Symbol', width: '70px' },
    ], []);

    const yearOptions = useMemo(() => yearsRange.map(y => ({ value: String(y), label: String(y) })), [yearsRange]);
    const monthOptions = useMemo(() => availableMonths.map(m => ({ value: m.key, label: m.label })), [availableMonths]);
    const yearSummary = useMemo(() => fYears.size > 0 ? t(`${fYears.size} سال انتخاب شده`, `${fYears.size} years selected`) : t('انتخاب سال‌ها', 'Select years'), [fYears, t]);
    const monthSummary = useMemo(() => fMonths.size > 0 ? t(`${fMonths.size} ماه انتخاب شده`, `${fMonths.size} months selected`) : t('انتخاب ماه‌ها', 'Select months'), [fMonths, t]);

    const advancedFilterFields = useMemo(() => ([
      {
        name: 'report_day',
        label: t('روز گزارش', 'Report Day'),
        type: 'select',
        options: dayOptions,
      },
      {
        name: 'currency',
        label: t('ارز', 'Currency'),
        type: 'lov',
        lovData: currencyLovData,
        lovColumns: currencyLovCols,
        dropdownWidth: 'min-w-[360px]'
      },
      {
        name: 'f_years',
        label: t('سال‌ها', 'Years'),
        type: 'custom',
        render: ({ key }) => React.createElement('div', { key, className: 'w-full min-w-0' },
          React.createElement(MultiSelectDropdown, {
            label: t('سال‌ها', 'Years'),
            options: yearOptions,
            selected: fYears,
            onToggle: (yearStr) => toggleYear(Number(yearStr)),
            onSelectAll: () => setFYears(new Set(yearOptions.map(o => String(o.value)))),
            onClear: () => { setFYears(new Set()); setFMonths(new Set()); },
            summary: yearSummary,
            isRtl,
          })
        )
      },
      {
        name: 'f_months',
        label: t('ماه‌ها', 'Months'),
        type: 'custom',
        render: ({ key }) => React.createElement('div', { key, className: 'w-full min-w-0' },
          React.createElement(MultiSelectDropdown, {
            label: t('ماه‌ها', 'Months'),
            options: monthOptions,
            selected: fMonths,
            onToggle: toggleMonth,
            onSelectAll: () => setFMonths(new Set(monthOptions.map(o => String(o.value)))),
            onClear: () => setFMonths(new Set()),
            summary: monthSummary,
            isRtl,
            disabled: fYears.size === 0,
          })
        )
      },      
      {
        name: 'show_movements',
        label: t('نمایش واریز/ برداشت', 'Show Deposit/Withdrawal'),
        type: 'toggle',
      }
    ]), [t, dayOptions, currencyLovData, currencyLovCols, yearOptions, monthOptions, yearSummary, monthSummary, fYears, isRtl, toggleYear, toggleMonth]);

    const advancedFilterValues = useMemo(() => ({
      report_day: filters.report_day || 'LAST',
      currency: filters.currency || null,
      show_movements: !!filters.show_movements,
    }), [filters]);

    const handleAdvancedFilterChange = useCallback((vals) => {
      setFilters(prev => ({
        ...prev,
        report_day: vals?.report_day || 'LAST',
        currency: vals?.currency || null,
        show_movements: !!vals?.show_movements,
      }));
    }, []);

    // ── Dynamic grid columns ───────────────────────────────────────────────
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
          const isHdr   = row._type === 'group_header';
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
            isHdr   && React.createElement('span', { className: 'text-indigo-400 text-[10px] me-0.5' }, '■'),
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

      const slotCols = slots.map(slot => ({
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
            // Group/currency/grand rows: show USD and IRR
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
    }, [reportData, openCellDrill, t]);

    const handleClearFilters = useCallback(() => {
      setFilters({ report_day: 'LAST', currency: null, show_movements: false });
      setFYears(new Set([String(curYear)]));
      setFMonths(new Set());
      setReportData(null);
      setGridState(null);
    }, [curYear]);

    // ── Settings modal ─────────────────────────────────────────────────────
    const renderSettings = () =>
      React.createElement(Modal, {
        isOpen: settingsOpen,
        onClose: () => setSettingsOpen(false),
        title: t('تنظیمات گزارش — انتخاب حساب‌ها', 'Report Settings — Select Accounts'),
        language,
        width: 'max-w-lg'
      },
        React.createElement('div', { className: 'flex flex-col gap-3 p-4 max-h-[72vh] overflow-hidden' },
          // Header row
          React.createElement('div', { className: 'flex items-start justify-between gap-3 shrink-0' },
            React.createElement('p', { className: 'text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[70%]' },
              t(
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

          // Tree controls
          React.createElement('div', {
            className: 'flex items-center justify-between gap-2 shrink-0 px-1'
          },
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowInactiveAccounts(v => !v),
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

          // Tree
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
                : accountTree.map(root =>
                    React.createElement(TreeNode, {
                      key: root.id, node: root, depth: 0,
                      selectedIds, onToggle: toggleId, isRtl,
                      resetToken: settingsTreeResetToken,
                      expandMode: settingsTreeExpandMode,
                      inheritedInactive: false
                    })
                  )
          ),

          // Footer
          React.createElement('div', {
            className: 'flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3 shrink-0'
          },
            React.createElement('span', { className: 'text-[12px] text-slate-500 dark:text-slate-400' },
              t(`${selectedLeafCount} حساب انتخاب شده`, `${selectedLeafCount} accounts selected`)
            ),
            React.createElement(Button, {
              variant: 'primary', size: 'sm',
              onClick: () => setSettingsOpen(false)
            }, t('تایید', 'Confirm'))
          )
        )
      );

    // ── Grid render ────────────────────────────────────────────────────────
    const renderGrid = () => {
      if (!reportData) return null;
      const { slots, groupedRows, grandTotal, leafCount } = reportData;

      // Grand total row
      const grandRow = {
        _id: '__grand_total__', _type: 'grand_total', _depth: 0,
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700/50',
        _title: t('جمع کل (USD / IRR)', 'Grand Total (USD / IRR)'),
        _currency: '',
        _leafIds: Array.from(reportData.reportAccountLookup?.keys?.() || []),
        _rowId: '__grand_total__',
        _parentRowId: null,
      };
      slots.forEach(s => { grandRow[s.key] = grandTotal[s.key] || { usd: 0, irr: 0 }; });

      const treeRows = [...groupedRows, grandRow];

      const toolbarStartContent = React.createElement('div', { className: 'flex items-center gap-2 px-1' },        
        React.createElement('span', { className: 'text-[12px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold' },
          t(
            `${selectedLeafCount} حساب انتخابی · ${slots.length} ماه`,
            `${selectedLeafCount} selected accounts · ${slots.length} months`
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

    // ── Main render ────────────────────────────────────────────────────────
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
            footerStartContent: access.canEdit
              ? React.createElement('div', { className: 'flex items-center gap-2' },
                  React.createElement(Button, {
                    variant: 'outline',
                    size: 'sm',
                    onClick: () => setSettingsOpen(true)
                  },
                    React.createElement('span', { className: 'flex items-center gap-1.5' },
                      React.createElement(Settings, { size: 14 }),
                      t('تنظیمات گزارش / حساب‌ها', 'Report / Accounts Settings')
                    )
                  ),
                  React.createElement('span', {
                    className: 'text-[12px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap'
                  },
                    t(`${selectedLeafCount} حساب انتخاب شده`, `${selectedLeafCount} accounts selected`)
                  )
                )
              : null,
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
                      'ماه‌ها را انتخاب کنید، از «تنظیمات گزارش» حساب‌ها را تعیین کنید، سپس «جستجو» را بزنید.',
                      'Select months, configure accounts via "Report Settings", then click "Search".'
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
        message:   toast.message,
        type:      toast.type,
        onClose:   () => setToast(p => ({ ...p, isVisible: false })),
        language
      })
    );
  };

  BalanceMonthlyReport.formCode = 'FIN_BALANCE_MONTHLY_REPORT';
  window.BalanceMonthlyReport = BalanceMonthlyReport;
})();
