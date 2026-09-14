/* Filename: financial/BalanceMonthlyReportController.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const Core = window.DSCore || window.DesignSystem || {};
  const Logic = window.BalanceMonthlyReportLogic || {};
  const DetailsHelpers = window.BalanceMonthlyReportDetails || {};

  const {
    pad2 = (n) => String(n).padStart(2, '0'),
    normalizeSlashDate = (v) => String(v || '').replace(/-/g, '/'),
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
    resolveRate = () => 0,
    buildTree = (accounts) => accounts || [],
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

  const useBalanceMonthlyReportController = ({ language = 'fa', formCode = 'FIN_BALANCE_MONTHLY_REPORT' }) => {
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

    const [filters, setFilters] = useState({ account_filter_type: 'account', currency: null, show_movements: false });
    const [fYears, setFYears] = useState(() => new Set());
    const [fMonths, setFMonths] = useState(() => new Set());
    const [fBalanceGroups, setFBalanceGroups] = useState(() => new Set());

    const [currencies, setCurrencies] = useState([]);
    const [balanceGroups, setBalanceGroups] = useState([]);
    const [fiscalYears, setFiscalYears] = useState([]);
    const [fiscalPeriods, setFiscalPeriods] = useState([]);
    const [loadingFiscalFilters, setLoadingFiscalFilters] = useState(false);
    const [loadingBalanceGroups, setLoadingBalanceGroups] = useState(false);
    const [fullAccountTree, setFullAccountTree] = useState([]);
    const [accountMap, setAccountMap] = useState(new Map());
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTreeResetToken, setSettingsTreeResetToken] = useState(0);
    const [settingsTreeExpandMode, setSettingsTreeExpandMode] = useState('collapse');
    const [loadingTree, setLoadingTree] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [gridState, setGridState] = useState(null);
    const [cellDrillModal, setCellDrillModal] = useState(() => getInitialCellDrillModal());
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const hasSeededYearsRef = useRef(false);

    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast((p) => ({ ...p, isVisible: false })), 3000);
    }, []);

    useEffect(() => {
      if (settingsOpen) {
        setSettingsTreeResetToken((v) => v + 1);
        setSettingsTreeExpandMode('collapse');
      }
    }, [settingsOpen]);

    useEffect(() => {
      if (!supabase) return;
      supabase.from('fm_currencies').select('id, code, title, symbol').order('code')
        .then(({ data }) => setCurrencies(data || []));
    }, []);

    useEffect(() => {
      if (!supabase) return;
      let cancelled = false;

      const loadBalanceGroups = async () => {
        setLoadingBalanceGroups(true);
        try {
          const { data: groupsRes, error: groupsErr } = await supabase
            .from('fm_balance_groups')
            .select('id, code, title_fa, title_en, access:fm_balance_group_access(grantee_type, grantee_id)')
            .eq('is_active', true)
            .order('code');
          if (groupsErr) throw groupsErr;

          const enriched = (groupsRes || []).map((g) => ({
            ...g,
            displayLabel: (isRtl ? (g.title_fa || g.title_en) : (g.title_en || g.title_fa)) || g.code || '-',
          }));

          if (isAdmin) {
            if (!cancelled) setBalanceGroups(enriched);
            return;
          }

          if (!currentUserId) {
            if (!cancelled) setBalanceGroups([]);
            return;
          }

          const [rolesRes, groupUsersRes] = await Promise.all([
            supabase.from('sec_user_roles').select('role_id').eq('user_id', currentUserId),
            supabase.from('sec_user_group_users').select('group_id').eq('user_id', currentUserId),
          ]);

          if (rolesRes.error) throw rolesRes.error;
          if (groupUsersRes.error) throw groupUsersRes.error;

          const myRoleIds = new Set((rolesRes.data || []).map((r) => String(r.role_id)));
          const myGroupIds = new Set((groupUsersRes.data || []).map((g) => String(g.group_id)));

          const accessible = enriched.filter((g) =>
            (g.access || []).some((a) => {
              const gt = String(a.grantee_type || '').toLowerCase();
              const gid = String(a.grantee_id || '');
              if (gt === 'user' && gid === String(currentUserId)) return true;
              if (gt === 'role' && myRoleIds.has(gid)) return true;
              if ((gt === 'user_group' || gt === 'group') && myGroupIds.has(gid)) return true;
              return false;
            })
          );

          if (!cancelled) setBalanceGroups(accessible);
        } catch (e) {
          console.error('BalanceMonthlyReport: load balance groups error', e);
          if (!cancelled) {
            showToast(t('خطا در بارگذاری گروه‌های بالانس.', 'Error loading balance groups.'), 'error');
          }
        } finally {
          if (!cancelled) setLoadingBalanceGroups(false);
        }
      };

      loadBalanceGroups();
      return () => { cancelled = true; };
    }, [supabase, isAdmin, currentUserId, isRtl, t, showToast]);

    useEffect(() => {
      if (!supabase) return;
      let cancelled = false;

      const loadFiscalFilterData = async () => {
        setLoadingFiscalFilters(true);
        try {
          const [yearsRes, periodsRes] = await Promise.all([
            supabase
              .from('fm_fiscal_years')
              .select('id, year_code, calendar_type, start_date, end_date, status, is_active')
              .eq('is_active', true)
              .order('start_date', { ascending: false }),
            supabase
              .from('fm_fiscal_periods')
              .select('id, fiscal_year_id, period_code, title, start_date, end_date, sort_order, status, is_active')
              .eq('is_active', true)
              .order('start_date', { ascending: true })
          ]);

          if (yearsRes.error) throw yearsRes.error;
          if (periodsRes.error) throw periodsRes.error;
          if (cancelled) return;

          const mappedYears = (yearsRes.data || []).map((y) => ({
            id: y.id,
            yearCode: y.year_code,
            calendarType: y.calendar_type || 'SHAMSI',
            startDate: normalizeSlashDate(y.start_date),
            endDate: normalizeSlashDate(y.end_date),
            status: y.status || 'NOT_OPENED',
            isActive: y.is_active !== false,
          }));

          const mappedPeriods = (periodsRes.data || []).map((p) => ({
            id: p.id,
            fiscalYearId: p.fiscal_year_id,
            periodCode: p.period_code || '',
            title: p.title || '',
            startDate: normalizeSlashDate(p.start_date),
            endDate: normalizeSlashDate(p.end_date),
            sortOrder: p.sort_order || 0,
            status: p.status || 'NOT_OPENED',
            isActive: p.is_active !== false,
          }));

          setFiscalYears(mappedYears);
          setFiscalPeriods(mappedPeriods);
        } catch (e) {
          console.error('BalanceMonthlyReport: load fiscal filters error', e);
          showToast(
            t('خطا در بارگذاری سال‌ها و دوره‌های مالی.', 'Error loading fiscal years and fiscal periods.'),
            'error'
          );
        } finally {
          if (!cancelled) setLoadingFiscalFilters(false);
        }
      };

      loadFiscalFilterData();
      return () => { cancelled = true; };
    }, [supabase, showToast, t]);

    const loadTree = useCallback(async () => {
      if (!supabase) return;
      setLoadingTree(true);
      try {
        const { data: charts } = await supabase.from('fm_coa_charts').select('id').eq('is_active', true);
        const chartIds = (charts || []).map((c) => String(c.id));
        if (!chartIds.length) { setFullAccountTree([]); setAccountMap(new Map()); return; }

        const { data: accs } = await supabase.from('fm_coa_accounts')
          .select('id, code, title_fa, title_en, parent_id, currency_id, chart_id, is_active')
          .in('chart_id', chartIds).order('code');

        setAccountMap(new Map((accs || []).map((a) => [String(a.id), a])));
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

    const todaySlash = useMemo(() => {
      const d = new Date();
      return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
    }, [pad2]);

    const defaultYearId = useMemo(() => {
      if (!fiscalYears.length) return null;

      const containing = fiscalYears.find((y) => {
        const from = String(y.startDate || '');
        const to = String(y.endDate || '');
        return from && to && todaySlash >= from && todaySlash <= to;
      });
      if (containing?.id) return String(containing.id);
      return String(fiscalYears[0].id);
    }, [fiscalYears, todaySlash]);

    useEffect(() => {
      const validIds = new Set((fiscalYears || []).map((y) => String(y.id)));
      setFYears((prev) => {
        const kept = new Set([...prev].filter((id) => validIds.has(String(id))));
        if (kept.size > 0) return kept;
        if (!hasSeededYearsRef.current && defaultYearId) {
          hasSeededYearsRef.current = true;
          return new Set([String(defaultYearId)]);
        }
        return kept;
      });
    }, [fiscalYears, defaultYearId]);

    const availableMonths = useMemo(() => {
      const selectedYearIds = new Set(Array.from(fYears || []).map(String));
      return (fiscalPeriods || [])
        .filter((p) => selectedYearIds.has(String(p.fiscalYearId)))
        .sort((a, b) => {
          const byStart = String(a.startDate || '').localeCompare(String(b.startDate || ''));
          if (byStart !== 0) return byStart;
          const byOrder = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
          if (byOrder !== 0) return byOrder;
          return String(a.periodCode || '').localeCompare(String(b.periodCode || ''));
        })
        .map((p) => {
          const periodTitle = String(p.title || '').trim() || String(p.periodCode || '').trim() || t('دوره بدون عنوان', 'Untitled Period');
          return {
            key: String(p.id),
            periodId: String(p.id),
            fiscalYearId: String(p.fiscalYearId),
            periodFrom: normalizeSlashDate(p.startDate),
            periodTo: normalizeSlashDate(p.endDate),
            label: periodTitle,
          };
        });
    }, [fYears, fiscalPeriods, t]);

    useEffect(() => {
      const validPeriodIds = new Set((availableMonths || []).map((m) => String(m.key)));
      setFMonths((prev) => new Set([...prev].filter((id) => validPeriodIds.has(String(id)))));
    }, [availableMonths]);

    const toggleYear = useCallback((yearId) => {
      const yStr = String(yearId);
      setFYears((prev) => {
        const next = new Set(prev);
        if (next.has(yStr)) {
          next.delete(yStr);
          setFMonths((pm) => {
            const nm = new Set(pm);
            (availableMonths || [])
              .filter((p) => String(p.fiscalYearId) === yStr)
              .forEach((p) => nm.delete(String(p.key)));
            return nm;
          });
        } else {
          next.add(yStr);
        }
        return next;
      });
    }, [availableMonths]);

    const toggleMonth = useCallback((key) =>
      setFMonths((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }), []);

    const clearYearAndPeriods = useCallback(() => {
      hasSeededYearsRef.current = true;
      setFYears(new Set());
      setFMonths(new Set());
    }, []);

    const toggleBalanceGroup = useCallback((groupId) => {
      const idStr = String(groupId);
      setFBalanceGroups((prev) => {
        const next = new Set(prev);
        if (next.has(idStr)) next.delete(idStr);
        else next.add(idStr);
        return next;
      });
    }, []);

    const applyBalanceGroupsToSelectedAccounts = useCallback(async (groupIds) => {
      if (!supabase) return;
      const ids = Array.from(groupIds || []).map(String).filter(Boolean);
      if (!ids.length) {
        setSelectedIds(new Set());
        return;
      }
      try {
        const { data, error } = await supabase
          .from('fm_balance_group_accounts')
          .select('account_id')
          .in('group_id', ids)
          .eq('is_active', true);
        if (error) throw error;

        const accountIds = new Set(
          (data || [])
            .map((r) => String(r.account_id || ''))
            .filter((id) => id && accountMap.has(id))
        );
        setSelectedIds(accountIds);
      } catch (e) {
        console.error('BalanceMonthlyReport: apply group accounts error', e);
        showToast(t('خطا در دریافت حساب‌های گروه بالانس.', 'Error loading balance group accounts.'), 'error');
      }
    }, [supabase, accountMap, showToast, t]);

    useEffect(() => {
      if (filters.account_filter_type !== 'balance_group') return;
      applyBalanceGroupsToSelectedAccounts(fBalanceGroups);
    }, [filters.account_filter_type, fBalanceGroups, applyBalanceGroupsToSelectedAccounts]);

    const treeNodeMap = useMemo(() => {
      const map = new Map();
      const visit = (nodes) => {
        (nodes || []).forEach((node) => {
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
        (nodes || []).forEach((node) => {
          const isLeaf = !node.children || node.children.length === 0;
          if (isLeaf && selectedIds.has(String(node.id))) count += 1;
          if (!isLeaf) walk(node.children);
        });
      };
      walk(reportTree);
      return count;
    }, [reportTree, selectedIds]);

    const toggleId = useCallback((id) => {
      const targetId = String(id);
      setSelectedIds((prev) => {
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
        subtreeIds.forEach((nodeId) => {
          if (shouldSelect) next.add(nodeId);
          else next.delete(nodeId);
        });
        return next;
      });
    }, [treeNodeMap]);

    const selectAllTree = useCallback(() => {
      const ids = new Set();
      const visit = (ns) => ns.forEach((n) => { ids.add(String(n.id)); visit(n.children || []); });
      visit(accountTree);
      setSelectedIds(ids);
    }, [accountTree]);

    const handleGenerate = useCallback(async () => {
      if (fMonths.size === 0) {
        showToast(t('لطفاً حداقل یک دوره مالی انتخاب کنید.', 'Please select at least one fiscal period.'), 'warning');
        return;
      }
      if (filters.account_filter_type === 'balance_group' && fBalanceGroups.size === 0) {
        showToast(t('لطفاً حداقل یک گروه بالانس انتخاب کنید.', 'Please select at least one balance group.'), 'warning');
        return;
      }
      if (selectedIds.size === 0) {
        showToast(
          filters.account_filter_type === 'balance_group'
            ? t('برای گروه‌های انتخابی، حسابی پیدا نشد.', 'No accounts were found for selected balance groups.')
            : t('لطفاً حساب‌ها را از طریق انتخاب درختی تعیین کنید.', 'Please select accounts from the account tree.'),
          'warning'
        );
        return;
      }

      setGenerating(true);
      setReportData(null);

      try {
        const result = await generateMonthlyReportData({
          supabase,
          filters,
          availablePeriods: availableMonths,
          fPeriods: fMonths,
          cal,
          currencies,
          accountMap,
          accountTree: reportTree,
          selectedIds,
          isRtl,
        });

        if (result?.kind === 'invalid_months') {
          showToast(t('دوره‌های انتخابی نامعتبر هستند.', 'Invalid selected periods.'), 'warning');
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
    }, [fMonths, selectedIds, filters, fBalanceGroups, availableMonths, cal, currencies, accountMap, reportTree, isRtl, t, showToast, supabase]);

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
    }, [isRtl, reportData, createCellDrillModalState]);

    const viewConfig = useMemo(() => ({
      pageId: 'balance_monthly_report',
      currentState: () => ({
        filters,
        fYears: Array.from(fYears),
        fPeriods: Array.from(fMonths),
        fMonths: Array.from(fMonths),
        fBalanceGroups: Array.from(fBalanceGroups),
        selIds: Array.from(selectedIds),
        showInactiveAccounts,
        gridState,
      }),
      onApplyState: (state) => {
        if (!state) {
          setFilters({ account_filter_type: 'account', currency: null, show_movements: false });
          hasSeededYearsRef.current = true;
          setFYears(defaultYearId ? new Set([String(defaultYearId)]) : new Set());
          setFMonths(new Set());
          setFBalanceGroups(new Set());
          setSelectedIds(new Set());
          setShowInactiveAccounts(false);
          setGridState(null);
          setReportData(null);
          return;
        }
        if (state.filters) setFilters(state.filters);
        if (state.fYears) setFYears(new Set(state.fYears));
        if (state.fPeriods) setFMonths(new Set(state.fPeriods));
        else if (state.fMonths) setFMonths(new Set(state.fMonths));
        if (state.fBalanceGroups) setFBalanceGroups(new Set(state.fBalanceGroups));
        if (state.selIds) setSelectedIds(new Set(state.selIds));
        if (typeof state.showInactiveAccounts === 'boolean') setShowInactiveAccounts(state.showInactiveAccounts);
        if (state.gridState) setGridState(state.gridState);
      },
    }), [filters, fYears, fMonths, fBalanceGroups, selectedIds, showInactiveAccounts, gridState, defaultYearId]);

    return {
      isRtl,
      t,
      fmt,
      fmtDecimal,
      fmtDate,
      resolveRate,
      normalizeSlashDate,
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
    };
  };

  window.useBalanceMonthlyReportController = useBalanceMonthlyReportController;

  const FallbackComponent = () => null;

  const BalanceMonthlyReport = ({ language = 'fa', formCode = 'FIN_BALANCE_MONTHLY_REPORT' }) => {
    const View = window.BalanceMonthlyReport || FallbackComponent;
    const controller = useBalanceMonthlyReportController({ language, formCode });

    return React.createElement(View, {
      language,
      formCode,
      ...controller,
    });
  };

  BalanceMonthlyReport.formCode = 'FIN_BALANCE_MONTHLY_REPORT';
  window.BalanceMonthlyReport = BalanceMonthlyReport;
})();
