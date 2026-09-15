/* Filename: financial/TransactionReview.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  // ── Fallbacks ─────────────────────────────────────────────────────────────
  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const FallbackComponent = () => null;

  // ── Icons ─────────────────────────────────────────────────────────────────
  const LucideIcons = window.LucideIcons || {};
  const {
    Eye          = FallbackIcon,
    ChevronLeft  = FallbackIcon,
    ChevronRight = FallbackIcon,
    ChevronDown  = FallbackIcon,
    Check        = FallbackIcon,
    Paperclip    = FallbackIcon,
  } = LucideIcons;

  // ── Design System ─────────────────────────────────────────────────────────
  const DS         = window.DesignSystem  || {};
  const Core       = window.DSCore        || DS || {};
  const DSGrid     = window.DSGrid        || DS || {};
  const DSForms    = window.DSForms       || DS || {};
  const DSFeedback = window.DSFeedback    || DS || {};

  const PageHeader     = Core.PageHeader      || FallbackComponent;
  const EmptyState     = Core.EmptyState      || FallbackComponent;
  const Badge          = Core.Badge           || FallbackComponent;
  const Button         = Core.Button          || FallbackComponent;
  const Tabs           = Core.Tabs            || FallbackComponent;
  const DataGrid       = DSGrid.DataGrid      || FallbackComponent;
  const AdvancedFilter = DSGrid.AdvancedFilter || FallbackComponent;
  const AttachmentManager = DSForms.AttachmentManager || FallbackComponent;
  const Modal         = DSFeedback.Modal      || FallbackComponent;
  const Toast          = DSFeedback.Toast     || FallbackComponent;

  const supabase = window.supabase;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toIso = (d) => (d ? String(d).replace(/\//g, '-') : '');
  const getSelectedIds = (value) => new Set(
    (Array.isArray(value) ? value : value == null || value === '' ? [] : [value])
      .map(item => item?.id ?? item)
      .filter(id => id != null && id !== '')
      .map(String)
  );

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

  const formatLocalIsoDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  const getDefaultFilters = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return {
      date_type:           'registered_at',
      date_from:           formatLocalIsoDate(start),
      date_to:             formatLocalIsoDate(today),
      account_filter_type: 'balance_group',
      filter_value:        null,
      transaction_types:   [],
      document_statuses:   [],
      cost_type_ids:       [],
      income_type_ids:     [],
      center_ids:          [],
      summary_currency:    false,
    };
  };

  // ══════════════════════════════════════════════════════════════════════════
  const TransactionReview = ({ language = 'fa', formCode = 'FIN_TRANSACTION_REVIEW' }) => {
    const isRtl      = language === 'fa';
    const t          = useCallback((fa, en) => (isRtl ? fa : en), [isRtl]);
    const calMode    = Core.useCalendarMode ? Core.useCalendarMode() : (isRtl ? 'jalali' : 'gregorian');
    const fmtDate    = useCallback((d) => (Core.formatGlobalDate ? Core.formatGlobalDate(d, calMode) : d), [calMode]);
    const dateLocale = calMode === 'jalali' ? 'fa-IR-u-nu-latn' : 'en-US';

    // ── Current user ─────────────────────────────────────────────────────────
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
    const currentUserName = sessionData.username || sessionData.full_name || navUser.username || navUser.name || '';
    const userType      = (sessionData.type || sessionData.user_type || navUser.user_type || '').toLowerCase();
    const usernameVal   = String(currentUserName || '').toLowerCase();
    const isAdmin       = ['admin', 'superadmin'].includes(usernameVal) || userType === 'admin' || userType === 'superadmin';

    // ── Security ──────────────────────────────────────────────────────────────
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const raw = securityCtx ? securityCtx.getActions(formCode) : null;
      return raw || { canView: true };
    }, [securityCtx, formCode]);

    // ── State ────────────────────────────────────────────────────────────────
    const [filterState,    setFilterState]    = useState(() => getDefaultFilters());
    const [appliedFilters, setAppliedFilters] = useState(null);
    const [isLoading,      setIsLoading]      = useState(false);
    const [transactions,   setTransactions]   = useState(null); // null = not searched yet
    const [drillDoc,       setDrillDoc]       = useState(null); // set when drill-through active
    const [accountRows,    setAccountRows]    = useState([]);
    const [usersMap,       setUsersMap]       = useState({});
    const [deptsMap,       setDeptsMap]       = useState({});
    const [balanceGroups,  setBalanceGroups]  = useState([]);
    const [activeTab,      setActiveTab]      = useState('documents');
    const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
    const [lookups,       setLookups]       = useState({ costTypes: [], incomeTypes: [], costBenefitCenters: [] });
    const [attachModal,   setAttachModal]   = useState({ isOpen: false, record: null, files: [] });
    const [toast,          setToast]          = useState({ isVisible: false, message: '', type: 'success' });

    const accountsMap = useMemo(() => new Map(accountRows.map(a => [String(a.id), a])), [accountRows]);
    const accountLovData = useMemo(() => accountRows.map(acc => ({
      ...acc,
      displayLabel: acc.displayLabel || (isRtl ? (acc.title_fa || '') : (acc.title_en || acc.title_fa || '')),
      currency_code: acc.currency_code || ''
    })), [accountRows, isRtl]);

    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3500);
    }, []);

    const refreshLovDebug = useCallback(() => {}, []);

    // ── Load balance groups (same access logic as BalanceReport.js) ──────────
    const loadBalanceGroups = useCallback(async () => {
      if (!supabase) return;
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
        if (!currentUserId) {
          setBalanceGroups([]);
          return;
        }

        const { data: urData } = await supabase

        const accessible = enriched.filter(g =>
          (g.access || []).some(a => {
            const gt = (a.grantee_type || '').toLowerCase();
            if (gt === 'user' && String(a.grantee_id) === String(currentUserId)) return true;
            if (gt === 'role' && myRoleIds.has(String(a.grantee_id)))            return true;
            return false;
          })
        );
        setBalanceGroups(accessible);
        refreshLovDebug({
          balanceGroupCount: accessible.length,
          balanceGroupSamples: accessible.slice(0, 5).map(g => ({ id: g.id, code: g.code, title: g.displayLabel || g.title_fa || g.title_en || '' })),
          notes: accessible.length === 0 ? ['Balance group LOV is empty for the current user.'] : []
        });
      } catch (e) {
        console.error('TransactionReview: error loading balance groups', e);
      }
    }, [isAdmin, currentUserId, refreshLovDebug]);

    const loadUsersAndDepartments = useCallback(async () => {
      if (!supabase) return;
      try {
        const [userRes, deptRes] = await Promise.all([
          supabase.from('sec_users').select('id, full_name, username, party_id'),
          supabase.from('fm_org_chart_nodes').select('id, title')
        ]);

        const uMap = {};
        (userRes.data || []).forEach(u => {
          uMap[u.id] = `${u.full_name || u.username || ''}`.trim();
        });
        setUsersMap(uMap);

        const dMap = {};
        (deptRes.data || []).forEach(d => {
          dMap[d.id] = d.title;
        });
        setDeptsMap(dMap);
      } catch (e) {
        console.error('TransactionReview: error loading users/departments', e);
      }
    }, []);

    const loadLookups = useCallback(async () => {
      if (!supabase) return;
      try {
        const [costRes, incRes, cbcRes] = await Promise.all([
          supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
          supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
          supabase.from('fm_cost_benefit_centers').select('id, title_fa, title_en, center_kind, is_cost_center, is_benefit_center, is_active, manager:parties(id, first_name, last_name), office:fm_org_offices(id, title)')
        ]);

        const buildTree = (rows = []) => {
          const map = new Map((rows || []).map(row => [String(row.id), row]));
          return (rows || []).map(row => {
            const titleFa = row.title_fa || row.title || '';
            const titleEn = row.title_en || row.title_fa || row.title || '';
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
              displayLabel: isRtl ? titleFa : titleEn,
              pathTitle: path.filter(Boolean).join(' / '),
            };
          });
        };

        setLookups({
          costTypes: buildTree(costRes.data || []),
          incomeTypes: buildTree(incRes.data || []),
          costBenefitCenters: (cbcRes.data || []).map(row => ({
            ...row,
            titleFa: row.title_fa || '',
            titleEn: row.title_en || '',
            centerKind: row.center_kind || '',
            isActive: row.is_active ?? true,
            managerName: row.manager ? `${row.manager.first_name || ''} ${row.manager.last_name || ''}`.trim() : '',
            officeName: row.office?.title || '',
          })),
        });
      } catch (e) {
        console.error('TransactionReview: error loading lookups', e);
      }
    }, [isRtl]);

    const loadAttachments = useCallback(async (recordId) => {
      if (!supabase || !recordId) return;
      try {
        const { data } = await supabase
          .from('fm_attachments')
          .select('*')
          .eq('entity_type', 'TRANSACTION')
          .eq('entity_id', recordId)
          .order('created_at', { ascending: false });
        setAttachModal(prev => ({ ...prev, files: data || [] }));
      } catch (e) {
        console.error('TransactionReview: error loading attachments', e);
      }
    }, []);

    const openAttachments = useCallback((record) => {
      setAttachModal({ isOpen: true, record, files: [] });
      loadAttachments(record?.id);
    }, [loadAttachments]);

    // ── Load accounts (same permission logic as TransactionMain.js) ──────────
    const loadAccounts = useCallback(async () => {
      if (!supabase) return;
      try {
        const [accRes, chartRes, permsRes, rolesRes, currRes] = await Promise.all([
          supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, chart_id').eq('is_active', true),
          supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
          supabase.from('fm_coa_permissions').select('account_id, grantee_type, grantee_id, access_level'),
          supabase.from('sec_user_roles').select('role_id').eq('user_id', currentUserId || '00000000-0000-0000-0000-000000000000'),
          supabase.from('fm_currencies').select('id, code'),
        ]);

        const activeCharts = chartRes.data || [];
        const activeChartIds = new Set(activeCharts.map(c => String(c.id)));
        const currenciesData = currRes.data || [];
        const rawAccounts = accRes.data || [];
        const accMap = new Map(rawAccounts.map(a => [String(a.id), a]));

        const enrichedAccounts = rawAccounts
          .filter(acc => activeChartIds.has(String(acc.chart_id)))
          .map(acc => {
            const chart = activeCharts.find(c => String(c.id) === String(acc.chart_id));
            const pathParts = [];
            let current = acc;
            let guard = 0;
            while (current && guard < 25) {
              pathParts.unshift(isRtl ? (current.title_fa || '') : (current.title_en || current.title_fa || ''));
              current = current.parent_id ? accMap.get(String(current.parent_id)) || null : null;
              guard += 1;
            }
            return {
              ...acc,
              displayLabel: isRtl ? (acc.title_fa || '') : (acc.title_en || acc.title_fa || ''),
              pathTitle: pathParts.filter(Boolean).join(' / '),
              chart_name: chart?.title || '',
              currency_code: currenciesData.find(c => String(c.id) === String(acc.currency_id))?.code || ''
            };
          });

        const toLeafAccounts = (items) => {
          const parentIds = new Set(items.map(item => String(item.parent_id || '')).filter(Boolean));
          return items.filter(item => !parentIds.has(String(item.id)));
        };

        if (isAdmin) {
          const leafAccounts = toLeafAccounts(enrichedAccounts);
          setAccountRows(leafAccounts);
          return;
        }

        if (!currentUserId) {
          setAccountRows([]);
          return;
        }

        const perms = permsRes.data || [];
        const userRoleIds = new Set((rolesRes.data || []).map(r => String(r.role_id)));
        const allowedRoots = new Set();

        perms.forEach(p => {
          const level = String(p.access_level || '').toLowerCase();
          if (!['full', 'view', 'create', 'edit'].includes(level)) return;
          const granteeType = String(p.grantee_type || '').toLowerCase();
          if (granteeType === 'user' && String(p.grantee_id) === String(currentUserId)) allowedRoots.add(String(p.account_id));
          if (granteeType === 'role' && userRoleIds.has(String(p.grantee_id))) allowedRoots.add(String(p.account_id));
        });

        const hasAllowedAncestor = (acc) => {
          let current = acc;
          let guard = 0;
          while (current && guard < 25) {
            if (allowedRoots.has(String(current.id))) return true;
            current = current.parent_id ? accMap.get(String(current.parent_id)) || null : null;
            guard += 1;
          }
          return false;
        };

        const visibleAccounts = enrichedAccounts.filter(hasAllowedAncestor);
        const leafAccounts = toLeafAccounts(visibleAccounts);
        setAccountRows(leafAccounts);
      } catch (e) {
        console.error('TransactionReview: error loading accounts', e);
      }
    }, [isAdmin, currentUserId, isRtl, refreshLovDebug]);

    const reloadLovs = useCallback(async () => {
      await Promise.all([loadBalanceGroups(), loadAccounts()]);
    }, [loadBalanceGroups, loadAccounts]);

    useEffect(() => {
      if (access.canView) {
        loadUsersAndDepartments();
        loadLookups();
        loadBalanceGroups();
        loadAccounts();
      }
    }, [access.canView, loadUsersAndDepartments, loadLookups, loadBalanceGroups, loadAccounts]);

    // ── Filter change handler ─────────────────────────────────────────────────
    // When account_filter_type changes, clear filter_value to avoid stale LOV selection
    const handleFilterChange = useCallback((newValues) => {
      setFilterState(prev => {
        if (newValues.account_filter_type !== prev.account_filter_type) {
          return { ...newValues, filter_value: newValues.account_filter_type === 'account' ? [] : null };
        }
        return newValues;
      });
    }, []);

    // ── Search / fetch data ───────────────────────────────────────────────────
    const handleSearch = useCallback(async (formValues) => {
      const { date_type, date_from, date_to, account_filter_type, filter_value, transaction_types, document_statuses } = formValues;

      if (!['registered_at', 'created_at'].includes(date_type)) {
        showToast(t('لطفاً نوع تاریخ را مشخص کنید.', 'Please select a date type.'), 'warning');
        return;
      }

      if (!date_from || !date_to) {
        showToast(t('لطفاً بازه تاریخی را مشخص کنید.', 'Please specify a date range.'), 'warning');
        return;
      }

      const isoFrom = toIso(date_from);
      const isoTo   = toIso(date_to);

      if (isoFrom > isoTo) {
        showToast(t('تاریخ شروع نباید بعد از تاریخ پایان باشد.', 'Start date must not be after end date.'), 'error');
        return;
      }

      setIsLoading(true);
      setDrillDoc(null);
      setAppliedFilters(formValues);

      try {
        const selectedTypes = Array.isArray(transaction_types)
          ? transaction_types.map(v => String(v || '').trim()).filter(Boolean)
          : [];
        const selectedStatuses = Array.isArray(document_statuses)
          ? document_statuses.map(v => String(v || '').trim()).filter(Boolean)
          : [];

        let query = supabase
          .from('fm_transactions')
          .select('*, fm_transaction_items(*)')
          .order('created_at', { ascending: false });

        // Append 'Z' so PostgreSQL treats the string as UTC timestamptz
        if (date_type === 'registered_at') {
          if (isoFrom) query = query.gte('registered_at', isoFrom + 'T00:00:00Z');
          if (isoTo)   query = query.lte('registered_at', isoTo   + 'T23:59:59Z');
        } else {
          if (isoFrom) query = query.gte('created_at', isoFrom + 'T00:00:00Z');
          if (isoTo)   query = query.lte('created_at', isoTo   + 'T23:59:59Z');
        }

        if (selectedTypes.length > 0) {
          query = query.in('transaction_type', selectedTypes);
        }
        if (selectedStatuses.length > 0) {
          query = query.in('status', selectedStatuses);
        }

        const { data: txData, error } = await query;
        if (error) throw error;

        let txList = txData || [];

        // Apply account / balance-group filter client-side
        if (account_filter_type === 'account') {
          const accountIds = getSelectedIds(filter_value);
          if (accountIds.size > 0) txList = txList.filter(tx =>
            (tx.fm_transaction_items || []).some(item => accountIds.has(String(item.account_id)))
          );
        } else if (account_filter_type === 'balance_group' && filter_value) {
          const groupId = typeof filter_value === 'object' ? filter_value.id : filter_value;
          const { data: groupAccs } = await supabase
            .from('fm_balance_group_accounts')
            .select('account_id')
            .eq('group_id', groupId)
            .eq('is_active', true);

          const groupAccountIds = new Set((groupAccs || []).map(ga => String(ga.account_id)));
          txList = txList.filter(tx =>
            (tx.fm_transaction_items || []).some(item => groupAccountIds.has(String(item.account_id)))
          );
        }

        setTransactions(txList);
      } catch (err) {
        console.error('TransactionReview: fetch error', err);
        showToast(t('خطا در دریافت داده‌ها', 'Error fetching data'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [supabase, showToast, t]);

    const handleClear = useCallback(() => {
      setFilterState(getDefaultFilters());
      setTransactions(null);
      setAppliedFilters(null);
      setSelectedDocumentIds([]);
      setDrillDoc(null);
    }, []);

    // ── Filter fields (LOV switches based on account_filter_type) ─────────────
    const TRANSACTION_TYPE_OPTIONS = useMemo(() => ([
      { value: 'OPENING', label: t('افتتاحیه', 'Opening') },
      { value: 'CLOSING', label: t('اختتامیه', 'Closing') },
      { value: 'GENERAL', label: t('عمومی', 'General') },
      { value: 'TRANSFER', label: t('انتقال', 'Transfer') },
    ]), [t]);

    const DOCUMENT_STATUS_OPTIONS = useMemo(() => ([
      { value: 'DRAFT', label: t('یادداشت', 'Draft') },
      { value: 'TEMPORARY', label: t('موقت', 'Temporary') },
      { value: 'FINAL', label: t('بررسی شده', 'Final') },
      { value: 'APPROVED', label: t('تایید شده', 'Approved') },
    ]), [t]);

    const transactionTypeSummary = useCallback((selectedSet) => {
      if (!selectedSet || selectedSet.size === 0) return t('همه انواع سند', 'All document types');
      return t(`${selectedSet.size} نوع سند انتخاب شده`, `${selectedSet.size} document types selected`);
    }, [t]);

    const documentStatusSummary = useCallback((selectedSet) => {
      if (!selectedSet || selectedSet.size === 0) return t('همه وضعیت‌ها', 'All statuses');
      return t(`${selectedSet.size} وضعیت انتخاب شده`, `${selectedSet.size} statuses selected`);
    }, [t]);

    const centerLovColumns = useMemo(() => [
      { field: isRtl ? 'titleFa' : 'titleEn', header_fa: 'عنوان مرکز', header_en: 'Center Title', width: '150px', render: (val, row) => React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'font-bold text-slate-800 dark:text-slate-200' }, val || row.titleFa),
        !row.isActive && React.createElement('span', { className: 'text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-medium shrink-0' }, t('غیرفعال', 'Inactive'))
      ) },
      { field: 'managerName', header_fa: 'مسئول', header_en: 'Manager', width: '112px' },
      { field: 'centerKind', header_fa: 'گروه مرکز', header_en: 'Center Group', width: '82px', render: val => ({
        DEPARTMENT: t('دپارتمان', 'Department'), TEAM: t('تیم', 'Team'), PROJECT: t('پروژه', 'Project'), OTHER: t('سایر', 'Other'),
      })[val] || val },
      { field: 'officeName', header_fa: 'محل مرکز', header_en: 'Location', width: '112px' },
    ], [isRtl, t]);
    const typeLovColumns = useMemo(() => [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '68px' },
      { field: 'displayLabel', header_fa: 'عنوان', header_en: 'Title', width: '150px' },
      { field: 'pathTitle', header_fa: 'مسیر', header_en: 'Path', width: '172px' },
    ], []);

    const filterFields = useMemo(() => [
      {
        name: 'date_type',
        label: t('نوع تاریخ', 'Date Type'),
        type: 'select',
        required: true,
        options: [
          { value: 'registered_at', label: t('تاریخ تراکنش', 'Transaction Date') },
          { value: 'created_at', label: t('تاریخ ایجاد', 'Creation Date') },
        ],
      },
      { name: 'date_from', label: t('از تاریخ', 'From Date'), type: 'date', required: true },
      { name: 'date_to', label: t('تا تاریخ', 'To Date'), type: 'date', required: true },
      {
        name: 'transaction_types',
        type: 'custom',
        render: ({ key, values }) => {
          const selectedSet = new Set((Array.isArray(values.transaction_types) ? values.transaction_types : []).map(String));
          return React.createElement('div', { key, className: 'flex flex-col gap-1' },
            React.createElement(MultiSelectDropdown, {
              label: t('نوع سند', 'Document Type'),
              options: TRANSACTION_TYPE_OPTIONS,
              selected: selectedSet,
              onToggle: (value) => {
                const next = new Set(selectedSet);
                if (next.has(value)) next.delete(value); else next.add(value);
                handleFilterChange({ ...values, transaction_types: Array.from(next) });
              },
              onSelectAll: () => handleFilterChange({ ...values, transaction_types: TRANSACTION_TYPE_OPTIONS.map(opt => String(opt.value)) }),
              onClear: () => handleFilterChange({ ...values, transaction_types: [] }),
              summary: transactionTypeSummary(selectedSet),
              isRtl,
            })
          );
        },
      },
      {
        name: 'document_statuses',
        type: 'custom',
        render: ({ key, values }) => {
          const selectedSet = new Set((Array.isArray(values.document_statuses) ? values.document_statuses : []).map(String));
          return React.createElement('div', { key, className: 'flex flex-col gap-1' },
            React.createElement(MultiSelectDropdown, {
              label: t('وضعیت سند', 'Document Status'),
              options: DOCUMENT_STATUS_OPTIONS,
              selected: selectedSet,
              onToggle: (value) => {
                const next = new Set(selectedSet);
                if (next.has(value)) next.delete(value); else next.add(value);
                handleFilterChange({ ...values, document_statuses: Array.from(next) });
              },
              onSelectAll: () => handleFilterChange({ ...values, document_statuses: DOCUMENT_STATUS_OPTIONS.map(opt => String(opt.value)) }),
              onClear: () => handleFilterChange({ ...values, document_statuses: [] }),
              summary: documentStatusSummary(selectedSet),
              isRtl,
            })
          );
        },
      },   
      {
        name: 'summary_currency',
        label: t('خلاصه ارزی', 'Currency Summary'),
        type: 'toggle',
      },      
      {
        name: 'account_filter_type',
        label: t('نوع فیلتر حساب', 'Account Filter Type'),
        type: 'select',
        options: [
          { value: 'balance_group', label: t('گروه بالانس', 'Balance Group') },
          { value: 'account', label: t('انتخاب حساب', 'Select Account') },
        ],
      },
      filterState.account_filter_type === 'account'
        ? {
            name: 'filter_value',
            label: t('حساب', 'Account'),
            type: 'lov',
            multiple: true,
            lovData: accountLovData,
            lovColumns: [
              { field: 'chart_name', header_fa: 'ساختار حساب', header_en: 'Chart', width: '60px' },
              { field: 'code', header_fa: 'کد حساب', header_en: 'Account Code', width: '60px' },
              {
                field: 'displayLabel',
                header_fa: 'عنوان حساب',
                header_en: 'Account Title',
                width: '180px',
                render: (val, row) => React.createElement('div', { className: 'flex flex-col' },
                  React.createElement('span', { className: 'font-bold text-slate-800 dark:text-slate-200' }, val),
                  row.pathTitle && React.createElement('span', { className: 'text-[10px] text-slate-500 truncate', title: row.pathTitle }, row.pathTitle)
                )
              },
              { field: 'currency_code', header_fa: 'ارز', header_en: 'Currency', width: '45px' },
            ],
            dropdownWidth: 'min-w-[405px] max-w-[405px]',
          }
        : {
            name: 'filter_value',
            label: t('گروه بالانس', 'Balance Group'),
            type: 'lov',
            lovData: balanceGroups,
            lovColumns: [
              { field: 'code', header_fa: 'کد', header_en: 'Code', width: '52px' },
              { field: 'title_fa', header_fa: 'عنوان گروه بالانس', header_en: 'Balance Group', width: '165px' },
            ],
            dropdownWidth: 'min-w-[255px]',
          },               
      { name: 'cost_type_ids', label: t('نوع هزینه', 'Cost Type'), type: 'lov', multiple: true, lovData: lookups.costTypes, lovColumns: typeLovColumns, dropdownWidth: 'min-w-[420px]' },
      { name: 'income_type_ids', label: t('نوع درآمد', 'Income Type'), type: 'lov', multiple: true, lovData: lookups.incomeTypes, lovColumns: typeLovColumns, dropdownWidth: 'min-w-[420px]' },
      { name: 'center_ids', label: t('مرکز هزینه/درآمد', 'Cost/Income Center'), type: 'lov', multiple: true, lovData: lookups.costBenefitCenters, lovColumns: centerLovColumns, dropdownWidth: 'min-w-[495px]' },
    ], [t, isRtl, filterState.account_filter_type, accountLovData, balanceGroups, TRANSACTION_TYPE_OPTIONS, DOCUMENT_STATUS_OPTIONS, transactionTypeSummary, documentStatusSummary, handleFilterChange, lookups, centerLovColumns, typeLovColumns]);

    const TX_TYPES = {
      OPENING: t('افتتاحیه', 'Opening'),
      CLOSING: t('اختتامیه', 'Closing'),
      GENERAL: t('عمومی', 'General'),
      TRANSFER: t('انتقال', 'Transfer'),
    };

    const TX_ACTIONS = {
      DEPOSIT: t('واریز', 'Deposit'),
      WITHDRAWAL: t('برداشت', 'Withdrawal'),
    };

    const TX_GROUPS = {
      COST: t('هزینه', 'Cost'),
      INCOME: t('درآمد', 'Income'),
      BALANCE: t('بالانس', 'Balance'),
      OTHER: t('سایر', 'Other'),
    };

    const STATUS_COLORS = { DRAFT: 'slate', TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' };
    const STATUS_LABELS = {
      DRAFT: t('یادداشت', 'Draft'),
      TEMPORARY: t('موقت', 'Temporary'),
      FINAL: t('بررسی شده', 'Final'),
      APPROVED: t('تایید شده', 'Approved'),
    };

    const COST_TYPE_LOOKUP = useMemo(() => new Map((lookups.costTypes || []).map(item => [String(item.id), item])), [lookups.costTypes]);
    const INCOME_TYPE_LOOKUP = useMemo(() => new Map((lookups.incomeTypes || []).map(item => [String(item.id), item])), [lookups.incomeTypes]);
    const CENTER_LOOKUP = useMemo(() => new Map((lookups.costBenefitCenters || []).map(item => [String(item.id), item])), [lookups.costBenefitCenters]);

    const { documentsGridData, itemsGridData: matchingGridItems } = useMemo(() => {
      if (!transactions) return { documentsGridData: [], itemsGridData: [] };

      const filterAccountIds = appliedFilters?.account_filter_type === 'account'
        ? getSelectedIds(appliedFilters.filter_value)
        : new Set();

      const items = [];
      const balanceByAccount = new Map();

      transactions.forEach(tx => {
        (tx.fm_transaction_items || []).forEach(item => {
          if (filterAccountIds.size > 0 && !filterAccountIds.has(String(item.account_id))) return;
          const rawDep = parseFloat(item.deposit_amount || 0);
          const rawWid = parseFloat(item.withdrawal_amount || 0);
          const signedAmount = rawDep > 0 ? rawDep : (rawWid > 0 ? -rawWid : 0);
          const accountKey = String(item.account_id || '');
          const balanceAfter = (balanceByAccount.get(accountKey) || 0) + signedAmount;
          balanceByAccount.set(accountKey, balanceAfter);

          const rateToUsd = parseFloat(item.exchange_rate_to_usd || 0);
          const rateUsdToIrr = parseFloat(item.exchange_rate_usd_to_irr || 0);
          const amount = rawDep > 0 ? rawDep : rawWid;
          const resolvedToUsd = rateToUsd > 0 ? rateToUsd : 1;
          const resolvedUsdToIrr = rateUsdToIrr > 0 ? rateUsdToIrr : 1;
          items.push({
            ...item,
            deposit_amount: rawDep,
            withdrawal_amount: rawWid,
            exchange_rate_to_usd: resolvedToUsd,
            exchange_rate_usd_to_irr: resolvedUsdToIrr,
            amount_usd: amount * resolvedToUsd,
            amount_irr: amount * resolvedToUsd * resolvedUsdToIrr,
            dep_usd: rawDep * resolvedToUsd,
            dep_irr: rawDep * resolvedToUsd * resolvedUsdToIrr,
            wid_usd: rawWid * resolvedToUsd,
            wid_irr: rawWid * resolvedToUsd * resolvedUsdToIrr,
            remained_amount: item.remained_amount != null ? parseFloat(item.remained_amount) : balanceAfter,
            _doc_id:   tx.id,
            _doc_code: tx.document_code,
            _doc_date: tx.document_date,
            _tx_type:  tx.transaction_type,
            _tx_status: tx.status,
            _tx:       tx,
            _balance_after: balanceAfter,
          });
        });
      });

      const toIdSet = values => new Set((Array.isArray(values) ? values : []).map(value => String(value?.id ?? value)));
      const costIds = toIdSet(appliedFilters?.cost_type_ids);
      const incomeIds = toIdSet(appliedFilters?.income_type_ids);
      const centerIds = toIdSet(appliedFilters?.center_ids);
      const hasItemFilters = filterAccountIds.size > 0 || costIds.size > 0 || incomeIds.size > 0 || centerIds.size > 0;
      const matchingItems = items.filter(item => {
        const matchesType = (!costIds.size && !incomeIds.size)
          || (String(item.transaction_group).toUpperCase() === 'COST' && costIds.has(String(item.cost_type_id)))
          || (String(item.transaction_group).toUpperCase() === 'INCOME' && incomeIds.has(String(item.income_type_id)));
        return matchesType && (!centerIds.size || centerIds.has(String(item.center_id)));
      });
      const itemsByDocument = new Map();
      if (hasItemFilters) matchingItems.forEach(item => {
        const key = String(item._doc_id);
        if (!itemsByDocument.has(key)) itemsByDocument.set(key, []);
        itemsByDocument.get(key).push(item);
      });

      return {
        documentsGridData: hasItemFilters
          ? transactions.filter(tx => itemsByDocument.has(String(tx.id)))
            .map(tx => ({ ...tx, fm_transaction_items: itemsByDocument.get(String(tx.id)) }))
          : transactions,
        itemsGridData: matchingItems,
      };
    }, [transactions, appliedFilters]);

    const itemsGridData = useMemo(() => selectedDocumentIds.length > 0
      ? matchingGridItems.filter(item => selectedDocumentIds.includes(String(item._doc_id)))
      : matchingGridItems, [matchingGridItems, selectedDocumentIds]);

    const activeDrillData = useMemo(() => {
      if (!drillDoc) return [];
      return (drillDoc.fm_transaction_items || []).map(item => ({
        ...item,
        _doc_code: drillDoc.document_code,
        _doc_date: drillDoc.document_date,
        _tx_type: drillDoc.transaction_type,
      }));
    }, [drillDoc]);
    return React.createElement(TransactionReviewView, {
      language,
      formCode,
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
      accountLovColumns: [],
      groupLovCols: [],
      accountLovData,
      balanceGroups,
      usersMap,
      deptsMap,
      accountsMap,
      lookups,
      txTypes: TX_TYPES,
      txActions: TX_ACTIONS,
      txGroups: TX_GROUPS,
      statusColors: STATUS_COLORS,
      statusLabels: STATUS_LABELS,
    });
  };
 
  TransactionReview.formCode = 'FIN_TRANSACTION_REVIEW';
  window.TransactionReview = TransactionReview;
})();
