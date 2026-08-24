/* Filename: financial/BalanceReport.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  // ── Fallbacks ─────────────────────────────────────────────────────────────
  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const FallbackComponent = () => null;

  // ── Icons ─────────────────────────────────────────────────────────────────
  const LucideIcons = window.LucideIcons || {};
  const {
    TrendingUp     = FallbackIcon,
    ChevronDown    = FallbackIcon,
    ChevronRight   = FallbackIcon,
  } = LucideIcons;

  // ── Design System ─────────────────────────────────────────────────────────
  const DS        = window.DesignSystem  || {};
  const Core      = window.DSCore        || DS || {};
  const DSGrid    = window.DSGrid        || DS || {};
  const DSFeedback = window.DSFeedback   || DS || {};
  const PageHeader     = Core.PageHeader       || FallbackComponent;
  const EmptyState     = Core.EmptyState       || FallbackComponent;
  const Badge          = Core.Badge            || FallbackComponent;
  const Tabs           = Core.Tabs             || FallbackComponent;
  const Modal          = DSFeedback.Modal      || FallbackComponent;
  const DataGrid       = DSGrid.DataGrid       || FallbackComponent;
  const AdvancedFilter = DSGrid.AdvancedFilter || FallbackComponent;
  const Toast          = DSFeedback.Toast      || FallbackComponent;
  const BalanceReportTotal = window.BalanceReportTotal || FallbackComponent;

  // ── Helpers ───────────────────────────────────────────────────────────────
  /** Convert YYYY/MM/DD  →  YYYY-MM-DD (for JS Date & lexical comparison) */
  const toIso = (d) => (d ? String(d).replace(/\//g, '-') : '');

  const formatLocalIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /** Format a number with thousand separators; negative shown in parens */
  const fmt = (num) => {
    if (num === null || num === undefined) return '—';
    const v = parseFloat(num);
    if (isNaN(v)) return '—';
    if (v === 0) return '0';
    const abs = Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return v < 0 ? `(${abs})` : abs;
  };

  const fmtDecimal = (num, maxFractionDigits = 6) => {
    if (num === null || num === undefined) return '—';
    const value = Number(num);
    if (Number.isNaN(value)) return '—';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits
    });
  };

  /** Build an array of ISO date strings for a range (max 62 days) */
  const buildDateRange = (from, to) => {
    const f = toIso(from);
    const t = toIso(to);
    if (!f || !t || f > t) return [];
    const dates = [];
    const startParts = f.split('-').map(part => parseInt(part, 10));
    const endParts = t.split('-').map(part => parseInt(part, 10));
    if (startParts.length !== 3 || endParts.length !== 3 || startParts.some(Number.isNaN) || endParts.some(Number.isNaN)) return [];
    let cur = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    let guard = 0;
    while (cur <= end && guard < 62) {
      dates.push(formatLocalIsoDate(cur));
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return dates;
  };

  const buildRateLookup = (rateRows = []) => {
    const lookup = new Map();
    (rateRows || []).forEach(rate => {
      const base = String(rate.base_currency || '').toUpperCase();
      const target = String(rate.target_currency || '').toUpperCase();
      if (!base || !target) return;
      const key = `${base}|${target}`;
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key).push({
        rate: parseFloat(rate.rate || 0),
        rate_date: String(rate.rate_date || ''),
        created_at: String(rate.created_at || '')
      });
    });

    lookup.forEach(list => {
      list.sort((a, b) => {
        const dateCmp = String(b.rate_date || '').localeCompare(String(a.rate_date || ''));
        if (dateCmp !== 0) return dateCmp;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
      });
    });

    return lookup;
  };

  const getExactRateForDate = (lookup, fromCode, toCode, dateIso) => {
    const key = `${String(fromCode || '').toUpperCase()}|${String(toCode || '').toUpperCase()}`;
    const list = lookup.get(key) || [];
    for (const entry of list) {
      if (String(entry.rate_date || '') === String(dateIso || '')) {
        return entry.rate > 0 ? entry.rate : null;
      }
    }
    return null;
  };

  const buildDailyRateGraph = (lookup, dateIso) => {
    const graph = new Map();

    lookup.forEach((list, pairKey) => {
      const exact = (list || []).find(entry => String(entry.rate_date || '') === String(dateIso || ''));
      if (!exact || exact.rate <= 0) return;

      const [baseRaw, targetRaw] = String(pairKey || '').split('|');
      const base = String(baseRaw || '').toUpperCase();
      const target = String(targetRaw || '').toUpperCase();
      if (!base || !target) return;

      if (!graph.has(base)) graph.set(base, []);
      if (!graph.has(target)) graph.set(target, []);
      graph.get(base).push({ to: target, rate: exact.rate });
      graph.get(target).push({ to: base, rate: 1 / exact.rate });
    });

    return graph;
  };

  const findRatePath = (graph, from, to, visited = new Set()) => {
    if (from === to) return 1;
    const edges = graph.get(from) || [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;
      const nextVisited = new Set(visited);
      nextVisited.add(from);
      const tailRate = findRatePath(graph, edge.to, to, nextVisited);
      if (tailRate !== null && tailRate !== undefined) {
        return edge.rate * tailRate;
      }
    }
    return null;
  };

  const resolveConversionRate = (lookup, fromCode, toCode, dateIso, cache = new Map()) => {
    const from = String(fromCode || '').toUpperCase();
    const to = String(toCode || '').toUpperCase();
    const day = String(dateIso || '');
    const cacheKey = `${day}|${from}|${to}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    let rate = 0;
    if (!from || !to || from === to) {
      rate = 1;
      cache.set(cacheKey, rate);
      return rate;
    }

    const direct = getExactRateForDate(lookup, from, to, day);
    if (direct !== null && direct !== undefined) {
      rate = direct;
    } else {
      const inverse = getExactRateForDate(lookup, to, from, day);
      if (inverse !== null && inverse !== undefined) {
        rate = 1 / inverse;
      } else {
        const graphCache = cache.__dailyGraphCache || (cache.__dailyGraphCache = new Map());
        const graph = graphCache.get(day) || (() => {
          const built = buildDailyRateGraph(lookup, day);
          graphCache.set(day, built);
          return built;
        })();
        const pathRate = findRatePath(graph, from, to);
        rate = pathRate !== null && pathRate !== undefined ? pathRate : 0;
      }
    }

    cache.set(cacheKey, rate || 0);
    return rate || 0;
  };

  const getDefaultFilters = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return {
      date_from: formatLocalIsoDate(start),
      date_to: formatLocalIsoDate(today),
      currency: null,
      show_movements: false
    };
  };

  const renderBalanceCellContent = (day, showMovements) => {
    const current = day || {};
    const balance = current.bal;
    const deposit = current.dep || 0;
    const withdrawal = current.wid || 0;

    if (showMovements) {
      return React.createElement('div', { className: 'flex flex-col gap-0.5 leading-4 whitespace-nowrap' },
        React.createElement('span', { className: 'font-sans text-emerald-700 dark:text-emerald-400 tabular-nums' }, fmt(deposit)),
        React.createElement('span', { className: 'font-sans text-rose-600 dark:text-rose-400 tabular-nums' }, fmt(withdrawal)),
        React.createElement('span', { className: 'font-sans text-slate-800 dark:text-slate-200 tabular-nums' }, fmt(balance))
      );
    }

    if (balance === null || balance === undefined) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600' }, '—');
    const colorCls = balance === 0
      ? 'text-slate-400 dark:text-slate-500'
      : balance > 0
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400';
    return React.createElement('span', { className: `font-sans tabular-nums ${colorCls} whitespace-nowrap` }, fmt(balance));
  };

  // ══════════════════════════════════════════════════════════════════════════
  const BalanceReport = ({ language = 'fa', formCode = 'FIN_BALANCE_REPORT' }) => {
    const isRtl    = language === 'fa';
    const t        = useCallback((fa, en) => (isRtl ? fa : en), [isRtl]);
    const calMode  = Core.useCalendarMode ? Core.useCalendarMode() : 'jalali';
    const fmtDate  = (d) => (Core.formatGlobalDate ? Core.formatGlobalDate(d, calMode) : d);

    // ── Current user ────────────────────────────────────────────────────────
    const sessionData = (() => {
      try {
        return JSON.parse(
          sessionStorage.getItem('fm_user_session') ||
          localStorage.getItem('fm_user_session') || '{}'
        );
      } catch { return {}; }
    })();
    const navUser       = window.NavigationSystem?.currentUser || {};
    const currentUserId = sessionData.id || navUser.id || null;
    const userType      = (sessionData.type || sessionData.user_type || navUser.user_type || '').toLowerCase();
    const isAdmin       = userType === 'admin' || userType === 'superadmin';
    const supabase      = window.supabase;

    // ── State ────────────────────────────────────────────────────────────────
    const [initLoading,  setInitLoading]  = useState(true);
    const [generating,   setGenerating]   = useState(false);
    const [filters,      setFilters]      = useState(() => getDefaultFilters());
    const [balanceGroups, setBalanceGroups] = useState([]);
    const [currencies,   setCurrencies]   = useState([]);
    const [reportData,   setReportData]   = useState(null);
    const [activeTab,    setActiveTab]    = useState('details');
    const [reportGridStates, setReportGridStates] = useState({ details: null, currency: null, rates: null, baseAmounts: null });
    const [cellDrillGridState, setCellDrillGridState] = useState({ pageSize: 5 });
    const [txLookups, setTxLookups] = useState({ costTypes: [], incomeTypes: [], costBenefitCenters: [] });
    const [cellDrillModal, setCellDrillModal] = useState({ isOpen: false, kind: 'account', accountId: '', accountLabel: '', currencyCode: '', currencyLabel: '', date: '', balance: null, items: [] });
    const [toast,        setToast]        = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    // ── Load accessible balance groups ──────────────────────────────────────
    const loadGroups = useCallback(async () => {
      if (!supabase) { setInitLoading(false); return; }
      setInitLoading(true);
      try {
        const { data: groups } = await supabase
          .from('fm_balance_groups')
          .select('id, code, title_fa, title_en, access:fm_balance_group_access(grantee_type, grantee_id)')
          .eq('is_active', true)
          .order('code');

        const enriched = (groups || []).map(g => ({
          ...g,
          displayLabel: g.title_fa || g.code || ''
        }));

        if (isAdmin) {
          setBalanceGroups(enriched);
          return;
        }

        if (!currentUserId) { setBalanceGroups([]); return; }

        const { data: urData } = await supabase
          .from('sec_user_roles')
          .select('role_id')
          .eq('user_id', currentUserId);

        const myRoleIds = new Set((urData || []).map(r => String(r.role_id)));

        const accessible = enriched.filter(g =>
          (g.access || []).some(a => {
            const gt = (a.grantee_type || '').toLowerCase();
            if (gt === 'user'  && String(a.grantee_id) === String(currentUserId)) return true;
            if (gt === 'role'  && myRoleIds.has(String(a.grantee_id)))            return true;
            return false;
          })
        );
        setBalanceGroups(accessible);
      } catch (e) {
        console.error('BalanceReport: error loading groups', e);
      } finally {
        setInitLoading(false);
      }
    }, [isAdmin, currentUserId]);

    useEffect(() => { loadGroups(); }, [loadGroups]);

    const loadCurrencies = useCallback(async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('fm_currencies')
          .select('id, code, title, symbol')
          .order('code');
        setCurrencies(data || []);
      } catch (e) {
        console.error('BalanceReport: error loading currencies', e);
      }
    }, []);

    const viewConfig = useMemo(() => ({
      pageId: 'balance_report',
      currentState: () => ({
        filters,
        activeTab,
        reportGridStates,
      }),
      onApplyState: (state) => {
        if (!state) {
          setFilters(getDefaultFilters());
          setActiveTab('details');
          setReportGridStates({ details: null, currency: null, rates: null, baseAmounts: null });
          setReportData(null);
          return;
        }
        if (state.filters) setFilters(state.filters);
        if (state.activeTab) setActiveTab(state.activeTab);
        if (state.reportGridStates) setReportGridStates(state.reportGridStates);
        else if (state.reportGridState) setReportGridStates({ details: state.reportGridState, currency: null, rates: null, baseAmounts: null });
      },
    }), [activeTab, filters, reportGridStates]);

    useEffect(() => { loadCurrencies(); }, [loadCurrencies]);

    useEffect(() => {
      if (!supabase) return;
      let cancelled = false;

      (async () => {
        try {
          const [costRes, incomeRes, centerRes] = await Promise.all([
            supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('fm_cost_benefit_centers').select('id, title_fa, title_en, center_kind, is_cost_center, is_benefit_center, is_active')
          ]);

          if (cancelled) return;

          const buildTree = (rows = []) => {
            const map = new Map((rows || []).map(row => [String(row.id), row]));
            return (rows || []).map(row => {
              const path = [];
              let current = row;
              let guard = 0;
              while (current && guard < 20) {
                path.unshift(current.title_fa || current.title_en || current.title || '');
                current = current.parent_id ? map.get(String(current.parent_id)) || null : null;
                guard += 1;
              }
              return {
                ...row,
                displayLabel: isRtl ? (row.title_fa || row.title_en || '') : (row.title_en || row.title_fa || ''),
                pathTitle: path.filter(Boolean).join(' / '),
              };
            });
          };

          setTxLookups({
            costTypes: buildTree(costRes.data || []),
            incomeTypes: buildTree(incomeRes.data || []),
            costBenefitCenters: (centerRes.data || []).map(row => ({
              ...row,
              titleFa: row.title_fa || '',
              titleEn: row.title_en || '',
            })),
          });
        } catch (e) {
          console.error('BalanceReport: error loading review lookups', e);
        }
      })();

      return () => { cancelled = true; };
    }, [supabase, isRtl]);

    const COST_TYPE_LOOKUP = useMemo(() => new Map((txLookups.costTypes || []).map(item => [String(item.id), item])), [txLookups.costTypes]);
    const INCOME_TYPE_LOOKUP = useMemo(() => new Map((txLookups.incomeTypes || []).map(item => [String(item.id), item])), [txLookups.incomeTypes]);
    const CENTER_LOOKUP = useMemo(() => new Map((txLookups.costBenefitCenters || []).map(item => [String(item.id), item])), [txLookups.costBenefitCenters]);
    const reportAccountLookup = useMemo(() => new Map((reportData?.leafAccounts || []).map(acc => [String(acc.id), acc])), [reportData?.leafAccounts]);

    const txTypes = useMemo(() => ({
      OPENING: t('افتتاحیه', 'Opening'),
      CLOSING: t('اختتامیه', 'Closing'),
      GENERAL: t('عمومی', 'General'),
      TRANSFER: t('انتقال', 'Transfer'),
    }), [t]);
    const txActions = useMemo(() => ({
      DEPOSIT: t('واریز', 'Deposit'),
      WITHDRAWAL: t('برداشت', 'Withdrawal'),
    }), [t]);
    const txGroups = useMemo(() => ({
      COST: t('هزینه', 'Cost'),
      INCOME: t('درآمد', 'Income'),
      BALANCE: t('بالانس', 'Balance'),
      OTHER: t('سایر', 'Other'),
    }), [t]);
    const statusColors = useMemo(() => ({ DRAFT: 'slate', TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }), []);
    const statusLabels = useMemo(() => ({
      DRAFT: t('یادداشت', 'Draft'),
      TEMPORARY: t('موقت', 'Temporary'),
      FINAL: t('بررسی شده', 'Final'),
      APPROVED: t('تایید شده', 'Approved'),
    }), [t]);

    const openCellDrill = useCallback((row, dateIso, balanceValue = null) => {
      if (!reportData || !row) return;
      const accountId = String(row.id || '');
      if (!accountId || !dateIso) return;

      const account = reportAccountLookup.get(accountId) || row;
      const accountLabel = `${account.code || ''} - ${isRtl ? (account.title_fa || account.title_en || '') : (account.title_en || account.title_fa || '')}`.trim();
      const targetDate = String(dateIso || '');
      const items = (reportData.detailItems || [])
        .filter(item => String(item.account_id || '') === accountId && String(item._doc_date || '') === targetDate)
        .sort((a, b) => {
          const docCmp = String(a._doc_code || '').localeCompare(String(b._doc_code || ''));
          if (docCmp !== 0) return docCmp;
          const rowCmp = (parseInt(a.row_number || 0, 10) || 0) - (parseInt(b.row_number || 0, 10) || 0);
          if (rowCmp !== 0) return rowCmp;
          return String(a.id || '').localeCompare(String(b.id || ''));
        });

      setCellDrillModal({
        isOpen: true,
        kind: 'account',
        accountId,
        accountLabel,
        currencyCode: account.currency_code || '',
        currencyLabel: account.currency_code || account.currency_title || '',
        date: targetDate,
        balance: balanceValue,
        items,
      });
    }, [isRtl, reportAccountLookup, reportData]);

    const openCurrencyCellDrill = useCallback((row, dateIso, balanceValue = null) => {
      if (!reportData || !row || !dateIso) return;
      if (!row.is_currency_summary) return;

      const currencyCode = String(row.currency_code || row.code || '').toUpperCase();
      if (!currencyCode) return;

      const targetDate = String(dateIso || '');
      const items = (reportData.detailItems || [])
        .filter(item => String(item._doc_date || '') === targetDate)
        .filter(item => String(item._account_currency_code || item._account?.currency_code || '').toUpperCase() === currencyCode)
        .sort((a, b) => {
          const accCmp = String(a._account_code || '').localeCompare(String(b._account_code || ''));
          if (accCmp !== 0) return accCmp;
          const docCmp = String(a._doc_code || '').localeCompare(String(b._doc_code || ''));
          if (docCmp !== 0) return docCmp;
          const rowCmp = (parseInt(a.row_number || 0, 10) || 0) - (parseInt(b.row_number || 0, 10) || 0);
          if (rowCmp !== 0) return rowCmp;
          return String(a.id || '').localeCompare(String(b.id || ''));
        });

      setCellDrillModal({
        isOpen: true,
        kind: 'currency',
        accountId: '',
        accountLabel: '',
        currencyCode,
        currencyLabel: row.currency_title || row.title_fa || row.title_en || currencyCode,
        date: targetDate,
        balance: balanceValue,
        items,
      });
    }, [reportData]);

    // ── Generate report ─────────────────────────────────────────────────────
    const handleGenerate = useCallback(async (formValues = filters) => {
      const selGroup  = formValues.balance_group;
      const dateFrom  = formValues.date_from;
      const dateTo    = formValues.date_to;

      if (!selGroup || !dateFrom || !dateTo) {
        showToast(t('لطفاً گروه بالانس و بازه تاریخی را مشخص کنید.', 'Please select balance group and date range.'), 'warning');
        return;
      }

      const groupId  = (typeof selGroup === 'object') ? selGroup.id : selGroup;
      const isoFrom  = toIso(dateFrom);
      const isoTo    = toIso(dateTo);

      if (isoFrom > isoTo) {
        showToast(t('تاریخ شروع نباید بعد از تاریخ پایان باشد.', 'Start date must not be after end date.'), 'error');
        return;
      }

      setGenerating(true);
      setReportData(null);

      try {
        const currencyMap = new Map(currencies.map(c => [String(c.id), c]));
        const selectedCurrencyId = formValues.currency && typeof formValues.currency === 'object'
          ? String(formValues.currency.id || formValues.currency.value || '')
          : '';
        const showMovements = !!formValues.show_movements;

        // ── 1. Group accounts (is_active = true only) ──────────────────────
        const { data: groupAccs, error: gaErr } = await supabase
          .from('fm_balance_group_accounts')
          .select('account_id, valid_from, valid_to, fm_coa_accounts(id, code, title_fa, title_en, parent_id, currency_id, chart_id)')
          .eq('group_id', groupId)
          .eq('is_active', true);

        if (gaErr) throw gaErr;
        if (!groupAccs || groupAccs.length === 0) {
          setReportData({ dates: [], accounts: [], leafAccounts: [], detailItems: [], matrix: {}, currencyAccounts: [], currencyMatrix: {}, currencyRateMatrix: {}, groupName: selGroup.title_fa || '', showMovements, leafCount: 0 });
          return;
        }

        const chartIds = Array.from(new Set((groupAccs || []).map(ga => ga.fm_coa_accounts?.chart_id).filter(Boolean).map(String)));
        const { data: chartAccounts } = chartIds.length > 0
          ? await supabase
              .from('fm_coa_accounts')
              .select('id, code, title_fa, title_en, parent_id, currency_id, chart_id, is_active, account_type')
              .in('chart_id', chartIds)
              .eq('is_active', true)
          : { data: [] };

        const accountMap = new Map((chartAccounts || []).map(a => [String(a.id), a]));

        // Deduplicate accounts; collect all valid date ranges per account
        const accMap = {};
        (groupAccs || []).forEach(ga => {
          const aid = String(ga.account_id);
          const baseAcc = accountMap.get(aid) || ga.fm_coa_accounts;
          if (!baseAcc) return;
          if (selectedCurrencyId && String(baseAcc.currency_id || '') !== selectedCurrencyId) return;

          const rowCurrency = currencyMap.get(String(baseAcc.currency_id || ''));

          if (!accMap[aid]) {
            accMap[aid] = {
              id:       aid,
              code:     baseAcc.code     || '',
              title_fa: baseAcc.title_fa || '',
              title_en: baseAcc.title_en || '',
              currency_id: baseAcc.currency_id || '',
              currency_code: rowCurrency?.code || '',
              currency_title: rowCurrency?.title || '',
              currency_symbol: rowCurrency?.symbol || '',
              ranges:   []
            };
          }
          accMap[aid].ranges.push({
            from: toIso(ga.valid_from) || '0000-01-01',
            to:   toIso(ga.valid_to)   || '9999-12-31'
          });
        });

        const allAccounts  = Object.values(accMap).sort((a, b) => {
          const codeCmp = String(a.code || '').localeCompare(String(b.code || ''));
          if (codeCmp !== 0) return codeCmp;
          return String(a.title_fa || a.title_en || '').localeCompare(String(b.title_fa || b.title_en || ''));
        });
        const filteredAccounts = selectedCurrencyId
          ? allAccounts.filter(acc => String(acc.currency_id || '') === selectedCurrencyId)
          : allAccounts;
        const accountIds   = filteredAccounts.map(a => a.id);
        const dates        = buildDateRange(isoFrom, isoTo);
        let detailedItems = [];
        const accountById = new Map(filteredAccounts.map(acc => [String(acc.id), acc]));

        if (dates.length === 0) {
          setReportData({ dates: [], accounts: filteredAccounts, leafAccounts: filteredAccounts, detailItems: detailedItems, matrix: {}, currencyAccounts: [], currencyMatrix: {}, currencyRateMatrix: {}, groupName: selGroup.title_fa || '', showMovements, leafCount: filteredAccounts.length });
          return;
        }

        const fetchAllCurrencyRatesUpToDate = async (formattedDate) => {
          const batchSize = 1000;
          const allRates = [];
          for (let offset = 0; ; offset += batchSize) {
            const { data, error } = await supabase
              .from('fm_currency_rates')
              .select('base_currency, target_currency, rate, rate_date, created_at')
              .lte('rate_date', formattedDate)
              .order('rate_date', { ascending: false })
              .order('created_at', { ascending: false })
              .range(offset, offset + batchSize - 1);
            if (error) throw error;
            if (data && data.length) allRates.push(...data);
            if (!data || data.length < batchSize) break;
          }
          return allRates;
        };
        const rateLookup = buildRateLookup(await fetchAllCurrencyRatesUpToDate(isoTo));
        const conversionCache = new Map();

        const { data: userData } = await supabase
          .from('sec_users')
          .select('id, full_name, username');
        const userNameMap = {};
        (userData || []).forEach(user => {
          const label = `${user.full_name || user.username || ''}`.trim();
          if (label) userNameMap[String(user.id)] = label;
        });

        // ── 2. Transactions (TEMPORARY / FINAL / APPROVED) up to dateTo ───
        //    document_date stored as YYYY/MM/DD — compare with slashes
        const isoToSlash = isoTo.replace(/-/g, '/');
        const { data: txData } = await supabase
          .from('fm_transactions')
          .select('id, document_code, document_date, status, transaction_type, reference_code, description, created_at, registrar_id, reviewed_at, approved_at, department_id, reviewed_by_name, approved_by_name')
          .in('status', ['TEMPORARY', 'FINAL', 'APPROVED'])
          .lte('document_date', isoToSlash);

        // Build a map: txId → ISO date
        const txDateMap = {};
        const txMetaMap = {};
        (txData || []).forEach(tx => {
          txDateMap[String(tx.id)] = toIso(tx.document_date);
          txMetaMap[String(tx.id)] = {
            id: tx.id,
            document_code: tx.document_code || '',
            document_date: toIso(tx.document_date) || '',
            status: tx.status || '',
            transaction_type: tx.transaction_type || '',
            reference_code: tx.reference_code || '',
            description: tx.description || '',
            created_at: tx.created_at || '',
            registrar_id: tx.registrar_id || '',
            reviewed_at: tx.reviewed_at || '',
            approved_at: tx.approved_at || '',
            department_id: tx.department_id || '',
            reviewed_by_name: tx.reviewed_by_name || '',
            approved_by_name: tx.approved_by_name || '',
          };
        });
        const validTxIds = new Set(Object.keys(txDateMap));

        // ── 3. Transaction items for the accounts ─────────────────────────
        let allItems = [];
        if (validTxIds.size > 0 && accountIds.length > 0) {
          const BATCH = 400;
          for (let i = 0; i < accountIds.length; i += BATCH) {
            const batch = accountIds.slice(i, i + BATCH);
            const { data: items } = await supabase
              .from('fm_transaction_items')
              .select('*')
              .in('account_id', batch);

            (items || []).forEach(item => {
              if (validTxIds.has(String(item.transaction_id))) {
                allItems.push(item);
                const txMeta = txMetaMap[String(item.transaction_id)] || {};
                const account = accountById.get(String(item.account_id)) || {};
                const rawDep = parseFloat(item.deposit_amount || 0);
                const rawWid = parseFloat(item.withdrawal_amount || 0);
                const rateToUsd = parseFloat(item.exchange_rate_to_usd || 0);
                const rateUsdToIrr = parseFloat(item.exchange_rate_usd_to_irr || 0);
                const amount = rawDep > 0 ? rawDep : rawWid;
                const resolvedToUsd = rateToUsd > 0 ? rateToUsd : 1;
                const resolvedUsdToIrr = rateUsdToIrr > 0 ? rateUsdToIrr : 1;
                detailedItems.push({
                  ...item,
                  deposit_amount: rawDep,
                  withdrawal_amount: rawWid,
                  _stored_exchange_rate_to_usd: rateToUsd > 0 ? rateToUsd : null,
                  _stored_exchange_rate_usd_to_irr: rateUsdToIrr > 0 ? rateUsdToIrr : null,
                  exchange_rate_to_usd: resolvedToUsd,
                  exchange_rate_usd_to_irr: resolvedUsdToIrr,
                  amount_usd: amount * resolvedToUsd,
                  amount_irr: amount * resolvedToUsd * resolvedUsdToIrr,
                  dep_usd: rawDep * resolvedToUsd,
                  dep_irr: rawDep * resolvedToUsd * resolvedUsdToIrr,
                  wid_usd: rawWid * resolvedToUsd,
                  wid_irr: rawWid * resolvedToUsd * resolvedUsdToIrr,
                  remained_amount: item.remained_amount != null ? parseFloat(item.remained_amount) : null,
                  _doc_id: txMeta.id || item.transaction_id,
                  _doc_code: txMeta.document_code || '',
                  _doc_date: txMeta.document_date || txDateMap[String(item.transaction_id)] || '',
                  _tx_type: txMeta.transaction_type || '',
                  _tx_status: txMeta.status || '',
                  _tx_reference_code: txMeta.reference_code || '',
                  _tx_description: txMeta.description || '',
                  _tx_created_at: txMeta.created_at || '',
                  _registrar_name: userNameMap[String(txMeta.registrar_id || '')] || txMeta.registrar_id || '',
                  _tx_meta: txMeta,
                  _account: account,
                  _account_code: account.code || '',
                  _account_title: isRtl ? (account.title_fa || account.title_en || account.code || '') : (account.title_en || account.title_fa || account.code || ''),
                  _account_currency_code: account.currency_code || '',
                });
              }
            });
          }
        }

        // ── 4. Build daily totals: dailyMap[accountId][isoDate] = {dep,wid} ─
        const dailyMap = {};
        allItems.forEach(item => {
          const aid    = String(item.account_id);
          const txDate = txDateMap[String(item.transaction_id)];
          if (!txDate) return;
          if (!dailyMap[aid]) dailyMap[aid] = {};
          if (!dailyMap[aid][txDate]) dailyMap[aid][txDate] = { dep: 0, wid: 0 };
          if (item.transaction_action === 'DEPOSIT') {
            dailyMap[aid][txDate].dep += parseFloat(item.deposit_amount || 0);
          } else {
            dailyMap[aid][txDate].wid += parseFloat(item.withdrawal_amount || 0);
          }
        });

        // ── 5. Compute running balance (cumulative from inception) ─────────
        /*
         *  Balance(account, dayX) = Σ (deposit - withdrawal)  for all tx dates ≤ dayX
         *
         *  This is the standard running/cumulative balance formula:
         *    Balance(X) = Balance(X-1) + Deposits(X) – Withdrawals(X)
         */
        const matrix = {};
        filteredAccounts.forEach(acc => {
          matrix[acc.id] = {};
          const daily     = dailyMap[acc.id] || {};
          const txDates   = Object.keys(daily).sort();

          dates.forEach(d => {
            // Account is shown for date d only if it was active in the group on that day
            const activeOnDate = acc.ranges.some(r => d >= r.from && d <= r.to);
            if (!activeOnDate) {
              matrix[acc.id][d] = null;
              return;
            }
            // Cumulative balance up to (and including) d
            let balance = 0;
            txDates.forEach(txD => {
              if (txD <= d) balance += daily[txD].dep - daily[txD].wid;
            });
            matrix[acc.id][d] = {
              dep: daily[d]?.dep || 0,
              wid: daily[d]?.wid || 0,
              bal: balance
            };
          });
        });

        const displayRows = filteredAccounts;
        const displayMatrix = matrix;

        const currencyBuckets = new Map();
        filteredAccounts.forEach(acc => {
          const currencyKey = String(acc.currency_id || acc.currency_code || acc.currency_title || acc.id);
          if (!currencyBuckets.has(currencyKey)) {
            const currencyRow = currencyMap.get(String(acc.currency_id || ''));
            currencyBuckets.set(currencyKey, {
              key: currencyKey,
              currency_id: acc.currency_id || '',
              code: acc.currency_code || currencyRow?.code || '',
              title_fa: currencyRow?.title || acc.currency_title || acc.currency_code || '',
              title_en: currencyRow?.title || acc.currency_title || acc.currency_code || '',
              symbol: currencyRow?.symbol || acc.currency_symbol || '',
              sortKey: `${acc.currency_code || currencyRow?.code || ''}-${currencyRow?.title || acc.currency_title || ''}`,
              accounts: []
            });
          }
          currencyBuckets.get(currencyKey).accounts.push(acc);
        });

        const currencyAccounts = [];
        const currencyMatrix = {};
        [...currencyBuckets.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey)).forEach(bucket => {
          const rowId = `currency-${bucket.key}`;
          currencyAccounts.push({
            id: rowId,
            is_currency_summary: true,
            currency_key: bucket.key,
            currency_id: bucket.currency_id,
            code: bucket.code || '',
            title_fa: bucket.title_fa || '',
            title_en: bucket.title_en || bucket.title_fa || '',
            currency_code: bucket.code || '',
            currency_title: bucket.title_fa || '',
            currency_symbol: bucket.symbol || '',
            member_count: bucket.accounts.length,
            group_label: t('تجمیع ارز', 'Currency Summary')
          });

          currencyMatrix[rowId] = {};
          dates.forEach(d => {
            let dep = 0;
            let wid = 0;
            let bal = 0;
            let hasValue = false;

            bucket.accounts.forEach(acc => {
              const day = matrix[acc.id]?.[d];
              if (!day) return;
              hasValue = true;
              dep += parseFloat(day.dep || 0) || 0;
              wid += parseFloat(day.wid || 0) || 0;
              bal += parseFloat(day.bal || 0) || 0;
            });

            currencyMatrix[rowId][d] = hasValue ? { dep, wid, bal } : null;
          });
        });

          const currencyRateMatrix = {};
          currencyAccounts.forEach(row => {
            const currencyCode = String(row.currency_code || row.code || '').toUpperCase();
            currencyRateMatrix[row.id] = {};
            dates.forEach(d => {
              currencyRateMatrix[row.id][d] = {
                usd: resolveConversionRate(rateLookup, currencyCode, 'USD', d, conversionCache),
                irr: resolveConversionRate(rateLookup, currencyCode, 'IRR', d, conversionCache)
              };
            });
          });

        setReportData({
          dates,
          accounts:  displayRows,
          leafAccounts: filteredAccounts,
          matrix:    displayMatrix,
          detailItems: detailedItems,
          currencyAccounts,
          currencyMatrix,
            currencyRateMatrix,
            rateLookup,
          groupName: (typeof selGroup === 'object') ? (selGroup.title_fa || selGroup.code || '') : '',
          showMovements,
          leafCount: filteredAccounts.length
        });

      } catch (e) {
        console.error('BalanceReport: error generating', e);
        showToast(t('خطا در تولید گزارش', 'Error generating report'), 'error');
      } finally {
        setGenerating(false);
      }
    }, [currencies, filters, showToast, t, isRtl]);

    // ── LOV columns for balance group ───────────────────────────────────────
    const groupLovCols = useMemo(() => [
      { field: 'code',     header_fa: 'کد',              header_en: 'Code',         width: '70px'  },
      { field: 'title_fa', header_fa: 'عنوان گروه بالانس', header_en: 'Balance Group', width: '220px' }
    ], []);

    const currencyLovData = useMemo(() => currencies.map(c => ({
      ...c,
      displayLabel: `${c.code || ''} - ${c.title || ''}${c.symbol ? ` (${c.symbol})` : ''}`.trim()
    })), [currencies]);

    const currencyLovCols = useMemo(() => [
      { field: 'code',   header_fa: 'کد ارز',   header_en: 'Code',   width: '90px' },
      { field: 'title',  header_fa: 'عنوان ارز', header_en: 'Title',  width: '180px' },
      { field: 'symbol', header_fa: 'نماد',     header_en: 'Symbol', width: '70px' }
    ], []);

    // ── Filter fields ───────────────────────────────────────────────────────
    const filterFields = useMemo(() => [
      {
        name:         'balance_group',
        label:        t('گروه بالانس', 'Balance Group'),
        type:         'lov',
        lovData:      balanceGroups,
        lovColumns:   groupLovCols,
        dropdownWidth:'min-w-[340px]'
      },
      {
        name:         'currency',
        label:        t('ارز', 'Currency'),
        type:         'lov',
        lovData:      currencyLovData,
        lovColumns:   currencyLovCols,
        dropdownWidth:'min-w-[380px]'
      },
      { name: 'date_from', label: t('از تاریخ', 'From Date'), type: 'date' },
      { name: 'date_to',   label: t('تا تاریخ', 'To Date'),   type: 'date' },
      {
        name:   'show_movements',
        label:  t('نمایش واریز/برداشت', 'Show Deposit/Withdrawal'),
        type:   'toggle'
      }
    ], [t, balanceGroups, groupLovCols, currencyLovData, currencyLovCols, isRtl]);

    const buildDayColumns = useCallback((showMovements, cellRenderer = null) => (
      reportData?.dates?.map((d) => ({
        field: d,
        header_fa: fmtDate(d),
        header_en: fmtDate(d),
        width: '128px',
        render: (val, row) => {
          const content = renderBalanceCellContent(val, showMovements);
          if (cellRenderer) return cellRenderer(val, row, d, content);
          return content;
        }
      })) || []
    ), [fmtDate, reportData]);

    const renderDetailGrid = () => {
      const { dates, accounts, matrix, groupName, showMovements, leafCount } = reportData;

      if (accounts.length === 0) {
        return React.createElement(EmptyState, {
          title:       t('هیچ حسابی مطابق فیلترها یافت نشد', 'No accounts matched the filters'),
          description: t('گروه بالانس یا فیلتر ارز نتیجه‌ای برنگرداند.', 'The selected balance group or currency filter returned no accounts.'),
          language
        });
      }

      if (dates.length === 0) {
        return React.createElement(EmptyState, {
          title:       t('بازه تاریخی نامعتبر است', 'Invalid date range'),
          description: t('بازه تاریخی وارد شده نامعتبر است.', 'The provided date range is invalid.'),
          language
        });
      }

      const gridRows = accounts.map(acc => {
        const row = { ...acc };
        dates.forEach(d => {
          row[d] = matrix[acc.id]?.[d] ?? null;
        });
        return row;
      });

      const dayColumns = buildDayColumns(showMovements, (val, row, dateIso, content) => {
        const day = val || {};
        if (day === null || day === undefined) return content;
        return React.createElement('button', {
          type: 'button',
          className: 'w-full text-left cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 rounded px-0.5 py-0.5',
          onClick: () => openCellDrill(row, dateIso, day.bal),
          title: t('کلیک کنید تا اقلام این روز نمایش داده شود', 'Click to view items for this day')
        }, content);
      });

      const columns = [
        {
          field: 'code',
          header_fa: 'کد حساب',
          header_en: 'Account Code',
          width: '90px',
          render: (val, row) => React.createElement('span', {
            className: 'font-sans tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400'
          }, val || '—')
        },
        {
          field: isRtl ? 'title_fa' : 'title_en',
          header_fa: 'عنوان حساب',
          header_en: 'Account Title',
          width: '280px',
          render: (val, row) => React.createElement('div', {
            className: 'whitespace-normal break-words leading-5 font-medium text-slate-800 dark:text-slate-200',
            title: isRtl ? row.title_fa : (row.title_en || row.title_fa)
          }, isRtl ? row.title_fa : (row.title_en || row.title_fa))
        },
        {
          field: 'currency_code',
          header_fa: 'ارز',
          header_en: 'Currency',
          width: '110px',
          render: (val, row) => React.createElement('span', {
            className: 'inline-flex items-center rounded-full border px-2 py-0.5 font-sans tabular-nums text-[11px] whitespace-nowrap border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
            title: row.currency_title || row.currency_code || ''
          }, val || '—')
        },
        ...dayColumns
      ];

      const toolbarContent = React.createElement('div', { className: 'flex items-center gap-2 flex-wrap text-[12px] text-slate-500 dark:text-slate-400 overflow-hidden' },
        React.createElement('span', { className: 'whitespace-nowrap' },
          t(
            `${leafCount || accounts.length} حساب  ·  ${dates.length} روز`,
            `${leafCount || accounts.length} accounts  ·  ${dates.length} days`
          )
        )
      );

      return React.createElement(DataGrid, {
        key: `${groupName || 'report'}-${dates.length}-${accounts.length}`,
        data: gridRows,
        columns,
        language,
        formCode,
        hideToolbar: false,
        hideImport: true,
        defaultPinnedCols: ['code', isRtl ? 'title_fa' : 'title_en', 'currency_code'],
        gridState: reportGridStates.details,
        onGridStateChange: (state) => setReportGridStates(prev => ({ ...prev, details: state })),
        groupable: false,
        pageSizeOptions: [20, 50, 100],
        toolbarContent
      });
    };

    const renderCellDrillModal = () => {
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
          : resolveConversionRate(reportData.rateLookup || new Map(), currencyCode, 'USD', docDate, drillConversionCache);
        const rateToIrr = (storedToUsd > 0 && storedUsdToIrr > 0)
          ? (storedToUsd * storedUsdToIrr)
          : resolveConversionRate(reportData.rateLookup || new Map(), currencyCode, 'IRR', docDate, drillConversionCache);
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
        ? resolveConversionRate(reportData.rateLookup || new Map(), balanceCurrencyCode, 'USD', String(cellDrillModal.date || ''), drillConversionCache)
        : 0;
      const balanceToIrrRate = balanceCurrencyCode
        ? resolveConversionRate(reportData.rateLookup || new Map(), balanceCurrencyCode, 'IRR', String(cellDrillModal.date || ''), drillConversionCache)
        : 0;
      const balanceUsd = (cellBalance === null || cellBalance === undefined) ? null : (parseFloat(cellBalance || 0) || 0) * balanceToUsdRate;
      const balanceIrr = (cellBalance === null || cellBalance === undefined) ? null : (parseFloat(cellBalance || 0) || 0) * balanceToIrrRate;

      const modalColumns = [
        { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px', render: (_, __, rowIndex) => React.createElement('span', { className: 'text-[12px] font-medium text-slate-600 dark:text-slate-400' }, rowIndex + 1) },
        ...(drillKind === 'currency' ? [
          { field: '_account_code', header_fa: 'کد حساب', header_en: 'Account Code', width: '100px', render: (val) => React.createElement('span', { className: 'text-[12px] font-bold text-slate-700 dark:text-slate-300', dir: 'ltr' }, val || '-') },
          { field: '_account_title', header_fa: 'عنوان حساب', header_en: 'Account Title', width: '220px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300', title: val }, val || '-') },
        ] : []),
        { field: '_doc_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '120px', render: (val) => React.createElement('span', { className: 'text-indigo-600 dark:text-indigo-400 font-bold text-[12px]' }, val || '-') },
        { field: '_tx_status', header_fa: 'وضعیت سند', header_en: 'Document Status', width: '95px', render: (val) => React.createElement(Badge, { variant: statusColors[val] || 'gray', size: 'sm' }, statusLabels[val] || val || '-') },
        { field: '_registrar_name', header_fa: 'نام ثبت‌کننده', header_en: 'Registrar', width: '140px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300', title: val }, val || '-') },
        { field: '_tx_type', header_fa: 'نوع سند', header_en: 'Document Type', width: '100px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block', title: val }, txTypes[val] || val || '-') },
        { field: '_tx_description', header_fa: 'شرح سربرگ', header_en: 'Header Description', width: '180px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block max-w-xs', title: val }, val || '-') },
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
        isOpen: cellDrillModal.isOpen,
        onClose: () => setCellDrillModal({ isOpen: false, kind: 'account', accountId: '', accountLabel: '', currencyCode: '', currencyLabel: '', date: '', items: [] }),
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
                  key: `cell-drill-${cellDrillModal.accountId || 'account'}-${cellDrillModal.date || 'date'}`,
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
                  toolbarContent: React.createElement('div', { className: 'text-[12px] text-slate-500 dark:text-slate-400' }, t('کلیک روی سلول روز در تب اول این پنجره را باز می‌کند.', 'Clicking a day cell in the first tab opens this window.'))
                })
              )
        )
      );
    };

    // ── Matrix renderer (custom – no DS equivalent) ─────────────────────────
    // ── Main render ─────────────────────────────────────────────────────────
    return React.createElement('div', {
      className: 'h-full flex flex-col font-sans',
      dir: isRtl ? 'rtl' : 'ltr'
    },
      React.createElement('div', {
        className: 'p-4 h-full flex flex-col bg-slate-50/50 dark:bg-slate-900 overflow-hidden'
      },

        // Page header
        React.createElement(PageHeader, {
          title:       t('گزارش بالانس روزانه', 'Daily Balance Report'),
          icon:        TrendingUp,
          language,
          viewConfig,
          description: t(
            'نمایش موجودی روزانه حساب‌ها به‌ازای هر گروه بالانس (ماتریس حساب × تاریخ)',
            'Daily account balance matrix per balance group (accounts × dates)'
          ),
          breadcrumbs: [
            { label: t('مدیریت مالی', 'Financial Management') },
            { label: t('گزارش بالانس روزانه', 'Daily Balance Report') }
          ]
        }),

        React.createElement('div', { className: 'flex-1 min-h-0 flex flex-col mt-2 overflow-hidden gap-1' },

          // Advanced filter
          React.createElement(AdvancedFilter, {
            fields:        filterFields,
            initialValues: filters,
            onFilter:      setFilters,
            onSearch:      handleGenerate,
            onClear:       () => { setFilters(getDefaultFilters()); setReportData(null); setActiveTab('details'); setReportGridStates({ details: null, currency: null, rates: null, baseAmounts: null }); setCellDrillModal({ isOpen: false, kind: 'account', accountId: '', accountLabel: '', currencyCode: '', currencyLabel: '', date: '', items: [] }); },
            language,
            defaultOpen:   true
          }),

          reportData && !generating && React.createElement(Tabs, {
            tabs: [
              { id: 'details', label: t('جزئیات روزانه', 'Daily Details') },
              { id: 'currency', label: t('تجمیع بر اساس ارز', 'Currency Summary') },
              { id: 'rates', label: t('نرخ ارز پایه', 'Base Currency Rates') },
              { id: 'baseAmounts', label: t('تجمیع به ارز پایه', 'Amounts in Base Currency') }
            ],
            activeTab,
            onChange: setActiveTab,
            className: 'mb-0'
          }),

          // Content area
          generating
            ? React.createElement('div', {
                className: 'flex-1 flex items-center justify-center gap-2 text-[13px] text-slate-500 dark:text-slate-400'
              },
                React.createElement('div', {
                  className: 'w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0'
                }),
                t('در حال محاسبه گزارش...', 'Generating report...')
              )

            : !reportData
              ? React.createElement('div', { className: 'flex-1' },
                  React.createElement(EmptyState, {
                    title:       t('گزارشی نمایش داده نشده', 'No report displayed'),
                    description: t(
                      'گروه بالانس، ارز و بازه تاریخی را انتخاب کرده، سپس دکمه «جستجو» را بزنید.',
                      'Select a balance group, currency, and date range, then click Search.'
                    ),
                    language
                  })
                )

              : React.createElement('div', { className: 'flex-1 min-h-0 overflow-hidden' },
                    activeTab === 'details'
                      ? renderDetailGrid()
                      : React.createElement(BalanceReportTotal, {
                          language,
                          formCode,
                          activeTab,
                          reportData,
                          reportGridStates,
                          setReportGridStates,
                          t,
                          isRtl,
                          fmt,
                          fmtDecimal,
                          buildDayColumns,
                          openCurrencyCellDrill,
                          resolveConversionRate
                        })
                )
        )
      ),

      // Toast
      React.createElement(Toast, {
        isVisible: toast.isVisible,
        message:   toast.message,
        type:      toast.type,
        onClose:   () => setToast(prev => ({ ...prev, isVisible: false })),
        language
      }),

      renderCellDrillModal()
    );
  };

  window.BalanceReport = BalanceReport;
})();