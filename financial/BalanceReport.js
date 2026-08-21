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

  const PageHeader      = Core.PageHeader      || FallbackComponent;
  const EmptyState      = Core.EmptyState      || FallbackComponent;
  const Badge           = Core.Badge           || FallbackComponent;
  const DataGrid        = DSGrid.DataGrid      || FallbackComponent;
  const AdvancedFilter  = DSGrid.AdvancedFilter || FallbackComponent;
  const Toast           = DSFeedback.Toast     || FallbackComponent;

  const supabase = window.supabase;

  // ── Helpers ───────────────────────────────────────────────────────────────
  /** Convert YYYY/MM/DD  →  YYYY-MM-DD (for JS Date & lexical comparison) */
  const toIso = (d) => (d ? String(d).replace(/\//g, '-') : '');

  /** Format a number with thousand separators; negative shown in parens */
  const fmt = (num) => {
    if (num === null || num === undefined) return '—';
    const v = parseFloat(num);
    if (isNaN(v)) return '—';
    if (v === 0) return '0';
    const abs = Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return v < 0 ? `(${abs})` : abs;
  };

  /** Build an array of ISO date strings for a range (max 62 days) */
  const buildDateRange = (from, to) => {
    const f = toIso(from);
    const t = toIso(to);
    if (!f || !t || f > t) return [];
    const dates = [];
    let cur = new Date(f + 'T00:00:00');
    const end = new Date(t + 'T00:00:00');
    let guard = 0;
    while (cur <= end && guard < 62) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return dates;
  };

  const formatLocalIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const GROUP_LEVEL_OPTIONS = [
    { value: '',           label_fa: 'بدون گروهبندی', label_en: 'No Grouping' },
    { value: 'group',      label_fa: 'گروه حساب',   label_en: 'Account Group' },
    { value: 'general',    label_fa: 'حساب کل',     label_en: 'General Account' },
    { value: 'subsidiary', label_fa: 'حساب معین',   label_en: 'Subsidiary Account' }
  ];

  const GROUP_LEVEL_DEPTH = {
    group: 1,
    general: 2,
    subsidiary: 3
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

  const getLatestRateForDate = (lookup, fromCode, toCode, dateIso) => {
    const key = `${String(fromCode || '').toUpperCase()}|${String(toCode || '').toUpperCase()}`;
    const list = lookup.get(key) || [];
    for (const entry of list) {
      if (!entry.rate_date || entry.rate_date <= dateIso) {
        return entry.rate > 0 ? entry.rate : null;
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

    let rate = 1;
    if (!from || !to || from === to) {
      cache.set(cacheKey, rate);
      return rate;
    }

    const direct = getLatestRateForDate(lookup, from, to, day);
    if (direct) {
      rate = direct;
    } else {
      const inverse = getLatestRateForDate(lookup, to, from, day);
      if (inverse) {
        rate = 1 / inverse;
      } else {
        const viaUsdFrom = from === 'USD' ? 1 : resolveConversionRate(lookup, from, 'USD', day, cache);
        const viaUsdTo = to === 'USD' ? 1 : resolveConversionRate(lookup, 'USD', to, day, cache);
        rate = (viaUsdFrom && viaUsdTo) ? (viaUsdFrom * viaUsdTo) : 1;
      }
    }

    cache.set(cacheKey, rate || 1);
    return rate || 1;
  };

  const getDefaultFilters = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return {
      date_from: formatLocalIsoDate(start),
      date_to: formatLocalIsoDate(today),
      currency: null,
      grouping_level: '',
      show_movements: false
    };
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

    // ── State ────────────────────────────────────────────────────────────────
    const [initLoading,  setInitLoading]  = useState(true);
    const [generating,   setGenerating]   = useState(false);
    const [filters,      setFilters]      = useState(() => getDefaultFilters());
    const [balanceGroups, setBalanceGroups] = useState([]);
    const [currencies,   setCurrencies]   = useState([]);
    const [reportData,   setReportData]   = useState(null);
    const [collapsedGroupKeys, setCollapsedGroupKeys] = useState([]);
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

    useEffect(() => { loadCurrencies(); }, [loadCurrencies]);

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
        const selectedGroupingLevel = formValues.grouping_level || '';
        const selectedGroupingDepth = selectedGroupingLevel ? (GROUP_LEVEL_DEPTH[selectedGroupingLevel] || null) : null;
        const showMovements = !!formValues.show_movements;

        // ── 1. Group accounts (is_active = true only) ──────────────────────
        const { data: groupAccs, error: gaErr } = await supabase
          .from('fm_balance_group_accounts')
          .select('account_id, valid_from, valid_to, fm_coa_accounts(id, code, title_fa, title_en, parent_id, currency_id, chart_id)')
          .eq('group_id', groupId)
          .eq('is_active', true);

        if (gaErr) throw gaErr;
        if (!groupAccs || groupAccs.length === 0) {
          setReportData({ dates: [], accounts: [], matrix: {}, groupName: selGroup.title_fa || '', groupLevel: selectedGroupingLevel });
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
        const chainCache = new Map();
        const getChain = (accountId) => {
          const key = String(accountId || '');
          if (chainCache.has(key)) return chainCache.get(key);
          const chain = [];
          let current = accountMap.get(key) || null;
          let guard = 0;
          while (current && guard < 20) {
            chain.unshift(current);
            current = current.parent_id ? accountMap.get(String(current.parent_id)) || null : null;
            guard++;
          }
          chainCache.set(key, chain);
          return chain;
        };

        const getAncestorAtLevel = (accountId, depth) => {
          const chain = getChain(accountId);
          if (chain.length === 0) return null;
          const idx = Math.min(Math.max(depth, 1), chain.length) - 1;
          return chain[idx] || chain[chain.length - 1] || null;
        };

        // Deduplicate accounts; collect all valid date ranges per account
        const accMap = {};
        (groupAccs || []).forEach(ga => {
          const aid = String(ga.account_id);
          const baseAcc = accountMap.get(aid) || ga.fm_coa_accounts;
          if (!baseAcc) return;
          if (selectedCurrencyId && String(baseAcc.currency_id || '') !== selectedCurrencyId) return;

          const chain = getChain(aid);
          const groupNode = selectedGroupingDepth ? (getAncestorAtLevel(aid, selectedGroupingDepth) || baseAcc) : baseAcc;
          const groupCurrency = currencyMap.get(String(groupNode.currency_id || ''));
          const rowCurrency = currencyMap.get(String(baseAcc.currency_id || ''));

          if (!accMap[aid]) {
            accMap[aid] = {
              id:       aid,
              group_key: String(groupNode.id || aid),
              group_sort_key: `${groupNode.code || ''}-${groupNode.title_fa || groupNode.title_en || ''}`,
              group_code: groupNode.code || '',
              group_title_fa: groupNode.title_fa || '',
              group_title_en: groupNode.title_en || groupNode.title_fa || '',
              group_currency_id: groupNode.currency_id || '',
              group_currency_code: groupCurrency?.code || '',
              group_currency_title: groupCurrency?.title || '',
              group_currency_symbol: groupCurrency?.symbol || '',
              member_count: 0,
              code:     baseAcc.code     || '',
              title_fa: baseAcc.title_fa || '',
              title_en: baseAcc.title_en || '',
              currency_id: baseAcc.currency_id || '',
              currency_code: rowCurrency?.code || '',
              currency_title: rowCurrency?.title || '',
              currency_symbol: rowCurrency?.symbol || '',
              group_label: `${groupNode.code || ''} - ${isRtl ? (groupNode.title_fa || '') : (groupNode.title_en || groupNode.title_fa || '')}`.trim(),
              group_currency_code: groupCurrency?.code || '',
              group_currency_title: groupCurrency?.title || '',
              group_currency_symbol: groupCurrency?.symbol || '',
              level_depth: chain.length || 1,
              level_name: GROUP_LEVEL_OPTIONS.find(l => l.value === selectedGroupingLevel)?.[isRtl ? 'label_fa' : 'label_en'] || '',
              ranges:   []
            };
          }
          accMap[aid].ranges.push({
            from: toIso(ga.valid_from) || '0000-01-01',
            to:   toIso(ga.valid_to)   || '9999-12-31'
          });
        });

        const allAccounts  = Object.values(accMap).sort((a, b) => {
          const g = String(a.group_sort_key || '').localeCompare(String(b.group_sort_key || ''));
          if (g !== 0) return g;
          return String(a.code || '').localeCompare(String(b.code || ''));
        });
        const filteredAccounts = selectedCurrencyId
          ? allAccounts.filter(acc => String(acc.currency_id || '') === selectedCurrencyId)
          : allAccounts;
        const accountIds   = filteredAccounts.map(a => a.id);
        const dates        = buildDateRange(isoFrom, isoTo);

        if (dates.length === 0) {
          setReportData({ dates: [], accounts: filteredAccounts, matrix: {}, groupName: selGroup.title_fa || '', groupLevel: selectedGroupingLevel, showMovements });
          return;
        }

        const usesGroupingSummary = !!selectedGroupingDepth;
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
        const rateLookup = usesGroupingSummary
          ? buildRateLookup(await fetchAllCurrencyRatesUpToDate(isoTo))
          : new Map();
        const conversionCache = new Map();

        // ── 2. Transactions (TEMPORARY / FINAL / APPROVED) up to dateTo ───
        //    document_date stored as YYYY/MM/DD — compare with slashes
        const isoToSlash = isoTo.replace(/-/g, '/');
        const { data: txData } = await supabase
          .from('fm_transactions')
          .select('id, document_date, status')
          .in('status', ['TEMPORARY', 'FINAL', 'APPROVED'])
          .lte('document_date', isoToSlash);

        // Build a map: txId → ISO date
        const txDateMap = {};
        (txData || []).forEach(tx => {
          txDateMap[String(tx.id)] = toIso(tx.document_date);
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
              .select('account_id, transaction_id, transaction_action, deposit_amount, withdrawal_amount')
              .in('account_id', batch);

            (items || []).forEach(item => {
              if (validTxIds.has(String(item.transaction_id))) {
                allItems.push(item);
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

        let displayRows = filteredAccounts;
        let displayMatrix = matrix;

        if (usesGroupingSummary) {
          const groupBuckets = new Map();
          filteredAccounts.forEach(acc => {
            const key = String(acc.group_key || acc.group_sort_key || acc.id);
            if (!groupBuckets.has(key)) {
              groupBuckets.set(key, {
                key,
                sortKey: String(acc.group_sort_key || ''),
                code: acc.group_code || '',
                title_fa: acc.group_title_fa || '',
                title_en: acc.group_title_en || acc.group_title_fa || '',
                currency_id: acc.group_currency_id || acc.currency_id || '',
                currency_code: acc.group_currency_code || acc.currency_code || '',
                currency_title: acc.group_currency_title || acc.currency_title || '',
                currency_symbol: acc.group_currency_symbol || acc.currency_symbol || '',
                label: `${acc.group_code || ''} - ${isRtl ? (acc.group_title_fa || '') : (acc.group_title_en || acc.group_title_fa || '')}`.trim(),
                accounts: []
              });
            }
            groupBuckets.get(key).accounts.push(acc);
          });

          const groupedRows = [];
          const groupedMatrix = {};

          [...groupBuckets.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey)).forEach(group => {
            const summaryId = `group-${group.key}`;
            const summaryRow = {
              id: summaryId,
              is_group_summary: true,
              group_key: group.key,
              group_sort_key: group.sortKey,
              code: group.code || '',
              title_fa: group.title_fa || '',
              title_en: group.title_en || group.title_fa || '',
              currency_id: group.currency_id || '',
              currency_code: group.currency_code || '',
              currency_title: group.currency_title || '',
              currency_symbol: group.currency_symbol || '',
              group_label: group.label || '',
              member_count: group.accounts.length
            };
            groupedRows.push(summaryRow);

            let runningBalance = 0;
            groupedMatrix[summaryId] = {};
            dates.forEach(d => {
              let dep = 0;
              let wid = 0;
              group.accounts.forEach(acc => {
                const day = matrix[acc.id]?.[d];
                if (!day) return;
                const rate = resolveConversionRate(
                  rateLookup,
                  acc.currency_code || acc.currency_title || '',
                  group.currency_code || acc.currency_code || '',
                  d,
                  conversionCache
                );
                dep += (parseFloat(day.dep || 0) || 0) * rate;
                wid += (parseFloat(day.wid || 0) || 0) * rate;
              });
              runningBalance += dep - wid;
              groupedMatrix[summaryId][d] = { dep, wid, bal: runningBalance };
            });

            groupedRows.push(...group.accounts);
            group.accounts.forEach(acc => {
              groupedMatrix[acc.id] = matrix[acc.id] || {};
            });
          });

          displayRows = groupedRows;
          displayMatrix = groupedMatrix;
        }

        setReportData({
          dates,
          accounts:  displayRows,
          matrix:    displayMatrix,
          groupName: (typeof selGroup === 'object') ? (selGroup.title_fa || selGroup.code || '') : '',
          groupLevel: selectedGroupingLevel,
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
      {
        name:   'grouping_level',
        label:  t('سطح نمایش', 'Display Level'),
        type:   'select',
        options: [{ value: '', label: t('بدون گروهبندی', 'No Grouping') }].concat(GROUP_LEVEL_OPTIONS.filter(o => o.value).map(o => ({
          value: o.value,
          label: isRtl ? o.label_fa : o.label_en
        })))
      },
      { name: 'date_from', label: t('از تاریخ', 'From Date'), type: 'date' },
      { name: 'date_to',   label: t('تا تاریخ', 'To Date'),   type: 'date' },
      {
        name:   'show_movements',
        label:  t('نمایش واریز/برداشت', 'Show Deposit/Withdrawal'),
        type:   'toggle'
      }
    ], [t, balanceGroups, groupLovCols, currencyLovData, currencyLovCols, isRtl]);

    const renderMatrix = () => {
      const { dates, accounts, matrix, groupName, groupLevel, showMovements, leafCount } = reportData;

      const visibleAccounts = [];
      accounts.forEach(acc => {
        if (acc.is_group_summary) {
          visibleAccounts.push(acc);
          return;
        }
        if (!collapsedGroupKeys.includes(String(acc.group_key || ''))) {
          visibleAccounts.push(acc);
        }
      });

      const toggleGroup = (groupKey) => {
        const key = String(groupKey || '');
        if (!key) return;
        setCollapsedGroupKeys(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]);
      };

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

      const gridRows = visibleAccounts.map(acc => {
        const row = { ...acc };
        dates.forEach(d => {
          row[d] = matrix[acc.id]?.[d] || {};
        });
        return row;
      });

      const dayColumns = dates.map((d) => ({
        field: d,
        header_fa: fmtDate(d),
        header_en: fmtDate(d),
        width: '128px',
        render: (val) => {
          const day = val || {};
          const balance = day.bal;
          const deposit = day.dep || 0;
          const withdrawal = day.wid || 0;

          if (showMovements) {
            return React.createElement('div', { className: 'flex flex-col gap-0.5 leading-4 whitespace-nowrap' },
              React.createElement('span', { className: 'font-mono text-emerald-700 dark:text-emerald-400' }, fmt(deposit)),
              React.createElement('span', { className: 'font-mono text-rose-600 dark:text-rose-400' }, fmt(withdrawal)),
              React.createElement('span', { className: 'font-mono text-slate-800 dark:text-slate-200' }, fmt(balance))
            );
          }

          if (balance === null || balance === undefined) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600' }, '—');
          const colorCls = balance === 0
            ? 'text-slate-400 dark:text-slate-500'
            : balance > 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400';
          return React.createElement('span', { className: `font-mono ${colorCls} whitespace-nowrap` }, fmt(balance));
        }
      }));

      const columns = [
        {
          field: 'group_label',
          header_fa: 'گروه حساب',
          header_en: 'Account Group',
          width: '220px',
          exportOnly: true
        },
        {
          field: 'code',
          header_fa: 'کد حساب',
          header_en: 'Account Code',
          width: '90px',
          render: (val, row) => React.createElement('span', {
            className: `font-mono whitespace-nowrap ${row.is_group_summary ? 'font-black text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`
          }, val || '—')
        },
        {
          field: isRtl ? 'title_fa' : 'title_en',
          header_fa: 'عنوان حساب',
          header_en: 'Account Title',
          width: '280px',
          render: (val, row) => React.createElement('div', {
            className: `whitespace-normal break-words leading-5 ${row.is_group_summary ? 'font-black text-indigo-700 dark:text-indigo-300' : 'font-medium text-slate-800 dark:text-slate-200'}`,
            title: isRtl ? row.title_fa : (row.title_en || row.title_fa)
          }, row.is_group_summary
            ? React.createElement('button', {
                type: 'button',
                onClick: () => toggleGroup(row.group_key),
                className: 'flex items-center gap-2 text-inherit text-start w-full'
              },
                React.createElement('span', { className: 'inline-flex items-center justify-center w-5 h-5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shrink-0' },
                  collapsedGroupKeys.includes(String(row.group_key || ''))
                    ? React.createElement(ChevronRight, { size: 12 })
                    : React.createElement(ChevronDown, { size: 12 })
                ),
                React.createElement('span', null, `${row.currency_code ? `${row.currency_code} - ` : ''}${isRtl ? row.title_fa : (row.title_en || row.title_fa)}`),
                React.createElement('span', { className: 'text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-full shrink-0' }, row.member_count || 0)
              )
            : (isRtl ? row.title_fa : (row.title_en || row.title_fa)))
        },
        {
          field: 'currency_code',
          header_fa: 'ارز',
          header_en: 'Currency',
          width: '110px',
          render: (val, row) => React.createElement('span', {
            className: `inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap ${row.is_group_summary ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`,
            title: row.currency_title || row.currency_code || ''
          }, val || '—')
        },
        ...dayColumns
      ];

      const toolbarContent = React.createElement('div', { className: 'flex items-center gap-2 flex-wrap text-[12px] text-slate-500 dark:text-slate-400 overflow-hidden' },
        React.createElement('span', { className: 'whitespace-nowrap' },
          t(
            `${leafCount || accounts.filter(acc => !acc.is_group_summary).length} حساب  ·  ${dates.length} روز`,
            `${leafCount || accounts.filter(acc => !acc.is_group_summary).length} accounts  ·  ${dates.length} days`
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
        gridState: null,
        groupable: false,
        pageSizeOptions: [20, 50, 100],
        toolbarContent
      });
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
            onClear:       () => { setFilters(getDefaultFilters()); setReportData(null); },
            language,
            defaultOpen:   true
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

              : React.createElement('div', { className: 'flex-1 min-h-0 overflow-hidden' }, renderMatrix())
        )
      ),

      // Toast
      React.createElement(Toast, {
        isVisible: toast.isVisible,
        message:   toast.message,
        type:      toast.type,
        onClose:   () => setToast(prev => ({ ...prev, isVisible: false })),
        language
      })
    );
  };

  window.BalanceReport = BalanceReport;
})();