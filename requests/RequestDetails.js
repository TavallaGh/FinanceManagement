/* Filename: requests/RequestDetails.js */
/* RequestFormModal – depends on RequestItemsGrid.js loaded before this file */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  function FallbackComponent() { return null; }
  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

  const safeComp = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    if (c && c.default && (typeof c.default === 'function' || c.default.$$typeof)) return c.default;
    return FallbackComponent;
  };
  const safeIcon = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    if (c && c.default) return c.default;
    return FallbackIcon;
  };

  // ── Design System ──────────────────────────────────────────────────────────
  const DS      = window.DesignSystem || {};
  const Core    = window.DSCore || DS;
  const Button      = safeComp(Core, 'Button');
  const Badge       = safeComp(Core, 'Badge');
  const Card        = safeComp(Core, 'Card');

  const DSForms     = window.DSForms || DS;
  const TextField         = safeComp(DSForms, 'TextField');
  const SelectField       = safeComp(DSForms, 'SelectField');
  const DatePicker        = safeComp(DSForms, 'DatePicker');

  const DSGrid      = window.DSGrid || DS;
  const DataGrid    = safeComp(DSGrid, 'DataGrid');
  const LOVField    = safeComp(DSGrid, 'LOVField');

  const DSFeedback  = window.DSFeedback || window.DSOverlays || DS;
  const Modal       = safeComp(DSFeedback, 'Modal');
  const Toast       = safeComp(DSFeedback, 'Toast');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const LucideIcons   = window.LucideIcons || {};
  const Save          = safeIcon(LucideIcons, 'Save');
  const Check         = safeIcon(LucideIcons, 'Check');
  const AlertTriangle = safeIcon(LucideIcons, 'AlertTriangle');
  const Scale         = safeIcon(LucideIcons, 'Scale');
  const Send          = safeIcon(LucideIcons, 'Send');
  const CheckCircle   = safeIcon(LucideIcons, 'CheckCircle');
  const XCircle       = safeIcon(LucideIcons, 'XCircle');
  const RotateCcw     = safeIcon(LucideIcons, 'RotateCcw');
  const Lock          = safeIcon(LucideIcons, 'Lock');
  const PlayCircle    = safeIcon(LucideIcons, 'PlayCircle');
  const CheckSquare   = safeIcon(LucideIcons, 'CheckSquare');
  const ChevronRight  = safeIcon(LucideIcons, 'ChevronRight');
  const ChevronLeft   = safeIcon(LucideIcons, 'ChevronLeft');

  // ── Shared constants ───────────────────────────────────────────────────────
  const REQUEST_TYPES = [
    { value: 'TRANSFER',   fa: 'انتقال وجه',  en: 'Transfer'   },
    { value: 'EXCHANGE',   fa: 'تبدیل ارز',   en: 'Exchange' },
    { value: 'BUDGET',     fa: 'مصرف بودجه',   en: 'Budget'     },
    { value: 'GENERAL',    fa: 'واریز/ برداشت',   en: 'General'    },
  ];

  const PAYMENT_TYPES = [
    { value: 'CASH',   fa: 'نقد',     en: 'Cash'   },
    { value: 'CHECK',  fa: 'چک',      en: 'Check'  },
    { value: 'CRYPTO', fa: 'کریپتو',  en: 'Crypto' },
    { value: 'BANK',   fa: 'بانک',    en: 'Bank'   },
    { value: 'TC',     fa: 'TC',      en: 'TC'     },
  ];

  const STATUS_LIST = [
    { value: 'DRAFT',       fa: 'یادداشت',      en: 'Draft',        color: 'slate'   },
    { value: 'REGISTERED',  fa: 'ثبت شده',      en: 'Registered',   color: 'blue'    },
    { value: 'REVIEWED',    fa: 'بررسی شده',    en: 'Reviewed',     color: 'indigo'  },
    { value: 'APPROVED',    fa: 'تایید شده',    en: 'Approved',     color: 'emerald' },
    { value: 'IN_PROGRESS', fa: 'در حال انجام', en: 'In Progress',  color: 'orange'  },
    { value: 'DONE',        fa: 'انجام شده',    en: 'Done',         color: 'teal'    },
    { value: 'REJECTED',    fa: 'عدم تایید',    en: 'Rejected',     color: 'red'     },
    { value: 'CLOSED',      fa: 'بسته شده',     en: 'Closed',       color: 'gray'    },
  ];

  const BALANCED_REQUEST_TYPES = ['TRANSFER', 'EXCHANGE'];
  const getStatus = (v) => STATUS_LIST.find(s => s.value === v) || STATUS_LIST[0];

  const getSessionUserId = () => {
    try {
      const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
      return JSON.parse(s).id || null;
    } catch { return null; }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RequestFormModal
  // ════════════════════════════════════════════════════════════════════════════
  const RequestFormModal = ({
    isOpen, onClose, onSuccess, formMode = 'CREATE', initialRecord = null,
    language = 'fa', formCode = 'REQ_REQUEST_MNGMT'
  }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;

    const calendarMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';

    const currentUserObj  = window.NavigationSystem?.currentUser || {};
    const currentUserId   = getSessionUserId() || currentUserObj.id || null;
    const currentUserName = currentUserObj.name || currentUserObj.full_name || currentUserObj.username || '';

    // RequestItemsGrid registered by RequestItemsGrid.js (loaded before this)
    const RequestItemsGrid = safeComp(window, 'RequestItemsGrid');

    const secCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const a = secCtx ? secCtx.getActions(formCode) : null;
      return a || { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }, [secCtx, formCode]);

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3500);
    }, []);

    const [isLoading,   setIsLoading]   = useState(false);
    const [isDirty,     setIsDirty]     = useState(false);
    const [hasSaved,    setHasSaved]    = useState(false);
    const [copyWarning, setCopyWarning] = useState(null);
    const [header,      setHeader]      = useState({});
    const [items,       setItems]       = useState([]);
    const [currencyRates, setCurrencyRates] = useState({});
    const [lookups,     setLookups]     = useState({
      leafAccounts: [], allAccounts: [], costTypes: [], incomeTypes: [],
      costBenefitCenters: [],
      currencies: [], usersMap: {}, usersList: [], partiesMap: {}, partiesList: [],
      nodesMap: {}, orgNodes: [], personnelRows: [], rolesMap: {}, currentUserDeptId: null, currentUserDeptTitle: '',
      currentUserPartyId: null, currentUserPartyName: '',
      projects: [],
    });

    const gridRef     = useRef(null);
    const initialized = useRef(false);

    const isMissingWorkflowSchemaError = useCallback((error, status) => {
      const msg = String(error?.message || '').toLowerCase();
      const details = String(error?.details || '').toLowerCase();
      const hint = String(error?.hint || '').toLowerCase();
      return (
        status === 404 ||
        error?.code === '42P01' ||
        msg.includes('wf_state_machines') ||
        details.includes('wf_state_machines') ||
        hint.includes('wf_state_machines')
      );
    }, []);

    const parseAmount = useCallback((value) => {
      return parseFloat(String(value || '0').replace(/,/g, '')) || 0;
    }, []);

    const formatNumberSafe = useCallback((val) => {
      const num = parseAmount(val);
      return num.toLocaleString('en-US');
    }, [parseAmount]);

    const getRequestedAmount = useCallback((item) => {
      const dep = parseAmount(item?.deposit_amount);
      const wid = parseAmount(item?.withdrawal_amount);
      return Math.max(dep, wid);
    }, [parseAmount]);

    const getCurrencyDecimals = useCallback((currencyCode) => {
      const currency = (lookups.currencies || []).find(item => item.code === currencyCode);
      const decimals = currency?.decimal_places;
      return Number.isFinite(Number(decimals)) ? Number(decimals) : 2;
    }, [lookups.currencies]);

    const roundToCurrencyDecimals = useCallback((value, currencyCode) => {
      const decimals = getCurrencyDecimals(currencyCode);
      const factor = 10 ** decimals;
      return Math.round((Number(value) || 0) * factor) / factor;
    }, [getCurrencyDecimals]);

    const resolveRates = useCallback((ratesMap, currency) => {
      let toUsd = 1;
      if (currency !== 'USD') {
        const direct = ratesMap[`${currency}_USD`];
        const inverse = ratesMap[`USD_${currency}`];
        if (direct) toUsd = parseFloat(direct);
        else if (inverse) toUsd = 1 / parseFloat(inverse);
      }
      return { toUsd };
    }, []);

    const dataEntryComponents = useMemo(() => ({
      Button,
      Modal,
      DataGrid,
      TextField,
      LOVField,
    }), []);

    const useRequestWorkFlow = window.useRequestWorkFlow || (() => ({
      dynamicActions: [],
      workflowGraph: { nodes: [], edges: [] },
      workflowLoading: false,
      workflowPermissions: {},
      renderStatusActions: () => null,
      renderWorkflowModals: () => null,
      resolveNextAssigneeLabel: async () => '-',
    }));
    const workflowModule = useRequestWorkFlow({
      isOpen,
      language,
      isRtl,
      t,
      supabase,
      header,
      items,
      lookups,
      currentUserId,
      isLoading,
      access,
      formCode,
      parseAmount,
      formatNumberSafe,
      getRequestedAmount,
      showToast,
      setItems,
      setIsDirty,
      safeIcon,
      LucideIcons,
      getStatus,
      isMissingWorkflowSchemaError,
      dataEntryComponents,
    });

    const {
      workflowPermissions,
      renderStatusActions,
      renderWorkflowModals,
      resolveNextAssigneeLabel,
    } = workflowModule;

    const canEditField = useCallback((field) => {
      if (formMode === 'CREATE' || formMode === 'COPY') return true;
      return ['EDITABLE', 'REQUIRED'].includes(workflowPermissions[field]);
    }, [formMode, workflowPermissions]);

    const isReadOnly = formMode !== 'CREATE' && formMode !== 'COPY' &&
      !Object.values(workflowPermissions).some(permission => permission === 'EDITABLE' || permission === 'REQUIRED');
    const areItemsReadOnly = formMode !== 'CREATE' && formMode !== 'COPY' &&
      !Object.entries(workflowPermissions).some(([field, permission]) => field.startsWith('items.') && ['EDITABLE', 'REQUIRED'].includes(permission));

    const getRatesForDate = useCallback(async (dateRaw) => {
      const dateKey = (dateRaw || new Date().toISOString()).replace(/\//g, '-').split('T')[0];
      const { data, error } = await supabase
        .from('fm_currency_rates')
        .select('base_currency, target_currency, rate, rate_date')
        .lte('rate_date', dateKey)
        .order('rate_date', { ascending: false });

      if (error) throw error;

      const latest = {};
      (data || []).forEach(rate => {
        const key = `${rate.base_currency}_${rate.target_currency}`;
        if (!latest[key]) latest[key] = rate.rate;
      });

      return latest;
    }, [supabase]);

    const validateTransferBalance = useCallback(async (itemsInput = items) => {
      if (!BALANCED_REQUEST_TYPES.includes(header.request_type) || !itemsInput.length) return true;

      const ratesMap = await getRatesForDate(header.need_date || header.created_at || new Date().toISOString());
      let diffUsd = 0;

      itemsInput.forEach(item => {
        const dep = parseAmount(item.deposit_amount);
        const wid = parseAmount(item.withdrawal_amount);
        const cur = item.currency || 'IRR';
        const { toUsd } = resolveRates(ratesMap, cur);
        diffUsd += (dep - wid) * toUsd;
      });

      const tolerance = 0.01;
      if (Math.abs(diffUsd) > tolerance) {
        showToast(
          t(
            `بالانس درخواست صحیح نیست. اختلاف معادل دلار: ${diffUsd.toFixed(2)}`,
            `Request balance mismatch. USD difference: ${diffUsd.toFixed(2)}`
          ),
          'error'
        );
        return false;
      }

      return true;
    }, [getRatesForDate, header.created_at, header.need_date, header.request_type, items, parseAmount, resolveRates, showToast, t]);

    useEffect(() => {
      let cancelled = false;

      const loadCurrencyRates = async () => {
        if (!BALANCED_REQUEST_TYPES.includes(header.request_type)) {
          if (!cancelled) setCurrencyRates({});
          return;
        }

        try {
          const ratesMap = await getRatesForDate(header.need_date || header.created_at || new Date().toISOString());
          if (!cancelled) setCurrencyRates(ratesMap);
        } catch (e) {
          console.error('RequestFormModal currency rates error:', e);
          if (!cancelled) setCurrencyRates({});
        }
      };

      loadCurrencyRates();
      return () => { cancelled = true; };
    }, [getRatesForDate, header.created_at, header.need_date, header.request_type]);

    // ── fetch dependencies ───────────────────────────────────────────────
    const fetchDeps = useCallback(async () => {
      if (!supabase) return null;
      try {
        const [accRes, chartRes, costRes, incRes, usersRes, partiesRes, personnelRes, nodesRes, rolesRes, currRes, cbcRes, projectsRes] =
          await Promise.all([
            supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, chart_id').eq('is_active', true),
            supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
            supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('sec_users').select('id, full_name, username, party_id'),
            supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, mobile').eq('is_active', true),
            supabase.from('fm_org_chart_personnel').select('node_id, person_id'),
            supabase.from('fm_org_chart_nodes').select('id, title, parent_id'),
            supabase.from('sec_roles').select('id, title, code').eq('is_active', true),
            supabase.from('fm_currencies').select('id, code, title'),
            supabase.from('fm_cost_benefit_centers').select('id, title_fa, title_en, center_kind, is_cost_center, is_benefit_center, is_active, manager:parties(id, first_name, last_name), office:fm_org_offices(id, title)'),
            supabase.from('gen_projects').select('id, code, title, status, manager_party_id').eq('is_active', true).order('code'),
          ]);

        const activeCharts   = chartRes.data || [];
        const activeChartIds = new Set(activeCharts.map(c => c.id));

        const buildLeafs = (items, charts = null) => {
          const parentIds = new Set(items.map(i => i.parent_id).filter(Boolean));
          return items.filter(i => {
            if (parentIds.has(i.id)) return false;
            if (charts && !activeChartIds.has(i.chart_id)) return false;
            return true;
          }).map(i => {
            const fa = i.title_fa || i.title;
            const en = i.title_en || i.title_fa || i.title;
            let pathArr = [isRtl ? fa : en];
            let curr = i;
            while (curr && curr.parent_id) {
              const par = items.find(p => p.id === curr.parent_id);
              if (par) { pathArr.unshift(isRtl ? (par.title_fa || par.title) : (par.title_en || par.title_fa || par.title)); curr = par; }
              else break;
            }
            return {
              ...i,
              displayLabel: isRtl ? fa : en,
              pathTitle:    pathArr.join(' / '),
              chart_name:   charts ? (activeCharts.find(c => c.id === i.chart_id)?.title || '') : '',
            };
          });
        };

        const usersMap = {};
        (usersRes.data || []).forEach(u => { usersMap[u.id] = u.full_name || u.username || ''; });

        const partiesMap = {};
        const partiesList = (partiesRes.data || []).map(p => {
          const name = p.party_type === 'legal'
            ? (p.company_name || '')
            : `${p.first_name || ''} ${p.last_name || ''}`.trim();
          partiesMap[p.id] = name;
          return {
            ...p,
            displayLabel: name,
          };
        });

        const nodesMap = {};
        (nodesRes.data || []).forEach(n => { nodesMap[n.id] = n.title; });

        const rolesMap = {};
        (rolesRes.data || []).forEach(r => { rolesMap[r.id] = r.title || r.code || ''; });

        let myDeptId = null, myDeptTitle = '', myPartyId = null, myPartyName = '';
        const me = currentUserId ? (usersRes.data || []).find(u => u.id === currentUserId) : null;
        if (me?.party_id) {
          myPartyId   = me.party_id;
          myPartyName = partiesMap[myPartyId] || '';
          const myPersonnel = (personnelRes.data || []).find(p => p.person_id === myPartyId);
          if (myPersonnel) { myDeptId = myPersonnel.node_id; myDeptTitle = nodesMap[myPersonnel.node_id] || ''; }
        }

        const lk = {
          leafAccounts: buildLeafs(accRes.data || [], activeCharts),
          allAccounts:  accRes.data || [],
          costTypes:    buildLeafs(costRes.data   || []),
          incomeTypes:  buildLeafs(incRes.data    || []),
          costBenefitCenters: (cbcRes.data || []).map(r => ({
            id: r.id,
            titleFa: r.title_fa || '',
            titleEn: r.title_en || r.title_fa || '',
            centerKind: r.center_kind || '',
            isCostCenter: r.is_cost_center ?? false,
            isBenefitCenter: r.is_benefit_center ?? false,
            isActive: r.is_active ?? true,
            managerName: r.manager ? `${r.manager.first_name || ''} ${r.manager.last_name || ''}`.trim() : '',
            officeName: r.office?.title || '',
          })),
          currencies:   currRes.data || [],
          usersMap, usersList: usersRes.data || [], partiesMap, partiesList, nodesMap,
          orgNodes: nodesRes.data || [], personnelRows: personnelRes.data || [], rolesMap,
          currentUserDeptId: myDeptId, currentUserDeptTitle: myDeptTitle,
          currentUserPartyId: myPartyId, currentUserPartyName: myPartyName,
          projects: (projectsRes.data || []).map(p => ({
            id: p.id,
            code: p.code || '',
            title: p.title || '',
            status: p.status || '',
            managerName: partiesMap[p.manager_party_id] || '',
            displayLabel: p.title || '',
          })),
        };
        setLookups(lk);
        return lk;
      } catch (e) {
        console.error('RequestFormModal deps error:', e);
        showToast(t('خطا در بارگذاری اطلاعات پایه', 'Error loading dependencies'), 'error');
        return null;
      }
    }, [supabase, isRtl, currentUserId, showToast, t]);

    useEffect(() => {
      if (!isOpen) { initialized.current = false; setHasSaved(false); setCopyWarning(null); return; }
      if (initialized.current) return;
      initialized.current = true;

      fetchDeps().then(async (lk) => {
        if (!lk) return;

        const needNewCode = formMode === 'CREATE' || formMode === 'COPY';
        let code = '';
        if (needNewCode) {
          if (window.AutoNumberingService) {
            try {
              const preview = await window.AutoNumberingService.previewNext('REQUESTS');
              if (preview?.formattedCode) code = preview.formattedCode;
            } catch {}
          }
          if (!code) code = `REQ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        }

        setCopyWarning(null);

        if (formMode === 'CREATE') {
          setHeader({
            request_code:      code,
            registrar_id:      currentUserId,
            requester_party_id: lk.currentUserPartyId,
            requester_display: lk.currentUserPartyName || lk.usersMap[currentUserId] || currentUserName,
            department_id:     lk.currentUserDeptId,
            department_title:  lk.currentUserDeptTitle,
            created_at:        new Date().toISOString(),
            need_date:         '',
            request_type:      'GENERAL',
            payment_type:      '',
            description:       '',
            status:            'DRAFT',
          });
          setItems([]);
          setIsDirty(false);
          setHasSaved(false);

        } else if (formMode === 'COPY' && initialRecord) {
          setCopyWarning(t(
            `هشدار: این درخواست کپی از درخواست ${initialRecord.request_code} می‌باشد و نیازمند بررسی و تغییرات است.`,
            `Warning: This is a copy of request ${initialRecord.request_code} and requires review.`
          ));
          setHeader({
            ...initialRecord,
            id:                 undefined,
            request_code:       code,
            status:             'DRAFT',
            registrar_id:       currentUserId,
            requester_party_id: lk.currentUserPartyId,
            requester_display:  lk.currentUserPartyName || lk.usersMap[currentUserId] || currentUserName,
            department_id:      lk.currentUserDeptId,
            department_title:   lk.currentUserDeptTitle,
            created_at:         new Date().toISOString(),
            need_date:          '',
            payment_type:       initialRecord.payment_type || '',
            reviewer_id: null, reviewer_name: null, reviewed_at: null,
            approver_id: null, approver_name: null, approved_at: null,
          });
          const mapped = (initialRecord.req_request_items || []).map(item => ({
            ...item,
            _tempId:           crypto.randomUUID(),
            id:                undefined,
            request_id:        undefined,
            account_id:        undefined,
            deposit_amount:    item.deposit_amount    != null ? parseFloat(item.deposit_amount)    : 0,
            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0,
            approved_amount:   0,
            remaining_amount:  0,
          })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
          setItems(mapped);
          setIsDirty(true);
          setHasSaved(false);

        } else if (formMode === 'EDIT' && initialRecord) {
          setHeader({
            ...initialRecord,
            department_title:  initialRecord.department_id ? (lk.nodesMap[initialRecord.department_id] || '') : '',
            requester_display: initialRecord.requester_party_id
              ? (lk.partiesMap[initialRecord.requester_party_id] || '')
              : (initialRecord.registrar_id ? (lk.usersMap[initialRecord.registrar_id] || '') : ''),
          });
          const mapped = (initialRecord.req_request_items || []).map(item => ({
            ...item,
            _tempId:           crypto.randomUUID(),
            account_id:        undefined,
            deposit_amount:    item.deposit_amount    != null ? parseFloat(item.deposit_amount)    : 0,
            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0,
            approved_amount:   item.approved_amount   != null ? parseFloat(item.approved_amount)   : 0,
            remaining_amount:  item.remaining_amount  != null ? parseFloat(item.remaining_amount)  : 0,
          })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
          setItems(mapped);
          setIsDirty(false);
          setHasSaved(false);
        }
      });
    }, [isOpen, formMode, initialRecord]);

    const updateHeader = useCallback((field, value) => {
      setHeader(p => ({ ...p, [field]: value }));
      setIsDirty(true);
    }, []);

    // ── save ─────────────────────────────────────────────────────────────
    const getPermissionValue = useCallback((field, sourceItems = items, sourceHeader = header) => {
      if (field.startsWith('items.')) {
        const itemField = field.slice(6);
        if (itemField === 'amount') return sourceItems.some(item => parseAmount(item.deposit_amount) > 0 || parseAmount(item.withdrawal_amount) > 0);
        return sourceItems.length > 0 && sourceItems.every(item => item[itemField] !== null && item[itemField] !== undefined && String(item[itemField]).trim() !== '');
      }
      const value = sourceHeader[field];
      return value !== null && value !== undefined && String(value).trim() !== '';
    }, [header, items, parseAmount]);

    const toUuidOrNull = useCallback((value) => {
      const v = String(value || '').trim();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : null;
    }, []);

    const handleSave = async (actionOrStatus, actionInput = {}) => {
      const selectedAction = actionOrStatus && typeof actionOrStatus === 'object' ? actionOrStatus : null;
      const statusToSave = selectedAction?.to_status || (typeof actionOrStatus === 'string' ? actionOrStatus : header.status);
      const overrideItems = Array.isArray(actionInput?.overrideItems) ? actionInput.overrideItems : null;
      const itemsForSave = overrideItems || items;

      if (selectedAction) {
        const missingField = Object.entries(selectedAction.field_permissions || {})
          .find(([field, permission]) => permission === 'REQUIRED' && !getPermissionValue(field, itemsForSave, header));
        if (missingField) {
          const labels = {
            need_date: t('تاریخ نیاز', 'Need Date'), request_type: t('نوع درخواست', 'Request Type'),
            payment_type: t('نوع پرداخت', 'Payment Type'), description: t('شرح درخواست', 'Description'),
            'items.description': t('شرح اقلام', 'Item Description'), 'items.amount': t('مبلغ اقلام', 'Item Amount'),
            'items.approved_amount': t('مبلغ تاییدشده', 'Approved Amount'),
          };
          const fieldLabel = labels[missingField[0]] || missingField[0];
          return showToast(t(`پر کردن فیلد ${fieldLabel} برای این عملیات الزامی است.`, `${fieldLabel} is required for this action.`), 'error');
        }
      }

      if (document.getElementById('grid-inline-edit-marker'))
        return showToast(t('لطفاً ابتدا سطر باز اقلام را با Enter ذخیره کنید.', 'Please save the open items row first.'), 'warning');

      if (!selectedAction && !header.description?.trim())
        return showToast(t('شرح درخواست الزامی است.', 'Request description is required.'), 'warning');

      setIsLoading(true);
      try {
        const now       = new Date().toISOString();
        const fromStatus = header.status || 'DRAFT';

        if (!(await validateTransferBalance(itemsForSave))) {
          return;
        }

        const payload = {
          request_code:       header.request_code,
          registrar_id:       header.registrar_id || currentUserId || null,
          requester_party_id: header.requester_party_id || null,
          department_id:      header.department_id || null,
          need_date:          header.need_date || null,
          request_type:       header.request_type || 'GENERAL',
          payment_type:       header.payment_type || null,
          description:        header.description || '',
          status:             statusToSave,
        };

        let reqId = header.id;
        if (!reqId) {
          payload.created_at = now;
          const { data, error } = await supabase.from('req_requests').insert([payload]).select('id');
          if (error) throw error;
          reqId = data[0].id;
          setHeader(p => ({ ...p, id: reqId }));
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('REQUESTS'); } catch {}
          }
        } else {
          const { error } = await supabase.from('req_requests').update(payload).eq('id', reqId);
          if (error) throw error;
        }

        if (isDirty || !header.id || !!overrideItems) {
          await supabase.from('req_request_items').delete().eq('request_id', reqId);
          if (itemsForSave.length > 0) {
            const itemsPayload = itemsForSave.map((item, idx) => ({
              request_id:         reqId,
              row_number:         idx + 1,
              currency:           item.currency           || null,
              transaction_action: item.transaction_action || 'DEPOSIT',
              transaction_group:  item.transaction_group  || null,
              cost_type_id:       item.cost_type_id       || null,
              income_type_id:     item.income_type_id     || null,
              party_id:           item.party_id           || null,
              center_id:          item.center_id          || null,
              project_id:         item.project_id         || null,
              deposit_amount:     parseAmount(item.deposit_amount),
              withdrawal_amount:  parseAmount(item.withdrawal_amount),
              approved_amount:    parseAmount(item.approved_amount),
              remaining_amount:   parseAmount(item.remaining_amount),
              related_account_id: item.related_account_id || item.account_id || null,
              description:        item.description || null,
            }));
            const { data: savedItems, error: iErr } = await supabase.from('req_request_items').insert(itemsPayload).select();
            if (iErr) throw iErr;
            setItems((savedItems || []).map(i => ({
              ...i, _tempId: crypto.randomUUID(),
              deposit_amount:    parseFloat(i.deposit_amount)    || 0,
              withdrawal_amount: parseFloat(i.withdrawal_amount) || 0,
              approved_amount:   parseFloat(i.approved_amount)   || 0,
              remaining_amount:  parseFloat(i.remaining_amount)  || 0,
            })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0)));
          }
        }

        const statusChanged = String(fromStatus || '') !== String(statusToSave || '');
        if (statusChanged && reqId) {
          const actorName = lookups.usersMap?.[currentUserId] || currentUserName || '';
          const nextAssignee = await resolveNextAssigneeLabel(statusToSave);
          const actorUserId = toUuidOrNull(currentUserId);
          const statusLogDescription = (actionInput?.approver_note || '').trim() || null;
          const logPayload = {
            request_id: reqId,
            from_status: fromStatus,
            to_status: statusToSave,
            actor_user_id: actorUserId,
            actor_name: actorName || 'Unknown',
            next_assignee: nextAssignee,
            description: statusLogDescription,
            metadata: {
              actor_user_id_raw: currentUserId || null,
              action_id: selectedAction?.id || null,
              action_label_fa: selectedAction?.action_label_fa || null,
              action_label_en: selectedAction?.action_label_en || null,
              data_entry_form: selectedAction?.data_entry_form || null,
              approver_note: statusLogDescription,
              workflow_source: selectedAction?.workflow_source || 'VISUAL',
            },
          };

          const { error: logError } = await supabase.from('req_request_status_logs').insert([logPayload]);
          if (logError) {
            console.error('Request status log insert error:', logError);
            showToast(
              t(
                `ثبت لاگ تغییر وضعیت انجام نشد: ${logError.message || 'خطای نامشخص'}`,
                `Status log was not saved: ${logError.message || 'Unknown error'}`
              ),
              'warning'
            );
          }
        }

        setHeader(p => ({ ...p, status: statusToSave }));
        setIsDirty(false);
        setHasSaved(true);
        showToast(selectedAction || typeof actionOrStatus === 'string'
          ? t('وضعیت درخواست تغییر کرد.', 'Request status updated.')
          : t('درخواست با موفقیت ذخیره شد.', 'Request saved successfully.'));
      } catch (err) {
        console.error('RequestFormModal save error:', err?.message || err, '| code:', err?.code, '| details:', err?.details, '| hint:', err?.hint);
        showToast(t('خطا در ذخیره درخواست.', 'Error saving request.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleClose = () => { if (hasSaved && onSuccess) onSuccess(); else onClose(); };
    
    // ── balance check for TRANSFER and EXCHANGE ───────────────────────────────────
    const balanceInfo = useMemo(() => {
      if (!BALANCED_REQUEST_TYPES.includes(header.request_type) || items.length === 0) return { isUnbalanced: false, diffUsd: 0 };

      let diffUsd = 0;
      items.forEach(item => {
        const dep = parseAmount(item.deposit_amount);
        const wid = parseAmount(item.withdrawal_amount);
        const cur = item.currency || 'IRR';
        const { toUsd } = resolveRates(currencyRates, cur);
        diffUsd += (dep - wid) * toUsd;
      });
      
      const tolerance = 0.01;
      const isUnbalanced = Math.abs(diffUsd) > tolerance;

      const currenciesUsed = [...new Set(items.map(item => item.currency || 'IRR'))];
      const displayCurrency = currenciesUsed.length === 1 ? currenciesUsed[0] : 'USD';
      const displayToUsd = resolveRates(currencyRates, displayCurrency).toUsd || 1;
      const diffDisplayRaw = displayToUsd > 0 ? diffUsd / displayToUsd : diffUsd;
      const displayDecimals = getCurrencyDecimals(displayCurrency);
      const diffDisplayAmount = roundToCurrencyDecimals(diffDisplayRaw, displayCurrency);

      return { isUnbalanced, diffUsd, displayCurrency, displayToUsd, diffDisplayAmount, displayDecimals };
    }, [currencyRates, getCurrencyDecimals, header.request_type, items, parseAmount, roundToCurrencyDecimals, resolveRates]);
    
    if (!isOpen) return null;

    const statusInfo = getStatus(header.status || 'DRAFT');
    const hasItems   = items.length > 0;

    const fmtDT = (v) => {
      if (!v) return '-';
      try {
        return new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
          calendar: calendarMode === 'jalali' ? 'persian' : 'gregory',
        }).format(new Date(v));
      } catch { return v; }
    };

    const statusActions = renderStatusActions(handleSave);

    const headerCardTitle = (
      <div className="flex items-center gap-3 w-full">
        <span>{t('اطلاعات سربرگ', 'Request Header')}</span>
        <Badge variant={statusInfo.color} className="shadow-none text-[10px]">
          {isRtl ? statusInfo.fa : statusInfo.en}
        </Badge>
      </div>
    );

    return (
      <div className="flex-1 min-h-0 flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900 text-[12px] animate-in fade-in duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-30 relative">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" icon={isRtl ? ChevronRight : ChevronLeft} onClick={handleClose}>{t('بازگشت به لیست', 'Back to List')}</Button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                {isReadOnly ? t('مشاهده درخواست', 'View Request') : formMode === 'CREATE' ? t('ثبت درخواست جدید', 'New Request') : formMode === 'COPY' ? t('کپی درخواست', 'Copy Request') : t('ویرایش درخواست', 'Edit Request')}
              </span>
              {header.request_code && (
                <>
                  <span className="text-slate-300 dark:text-slate-600 select-none">·</span>
                  <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{header.request_code}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="!px-5" onClick={handleClose}>{t('انصراف', 'Cancel')}</Button>
            {!isReadOnly && access.canEdit && (
              <Button variant="primary" size="sm" className="!px-5" icon={Save}
                onClick={() => handleSave()} isLoading={isLoading} disabled={!isDirty}>
                {t('ذخیره', 'Save')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex flex-col gap-4">

            {copyWarning && (
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 p-2 rounded-lg flex items-center gap-2 shrink-0 animate-in slide-in-from-top-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="text-[12px] font-bold">{copyWarning}</span>
              </div>
            )}

            <Card title={headerCardTitle} action={statusActions}
              isCollapsible={true} noPadding={true}
              className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-20"
              headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
              language={language}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 p-3 bg-white dark:bg-slate-800 overflow-visible">

                <TextField size="sm" label={t('کد درخواست', 'Request Code')}
                  value={header.request_code || ''} disabled isRtl={isRtl} dir="ltr" />

                <TextField size="sm" label={t('درخواست دهنده', 'Requester')}
                  value={header.requester_display || t('کاربر جاری', 'Current User')} disabled isRtl={isRtl} />

                <TextField size="sm" label={t('دپارتمان', 'Department')}
                  value={header.department_title || ''} disabled isRtl={isRtl} />

                <TextField size="sm" label={t('تاریخ و زمان ثبت', 'Submission Date/Time')}
                  value={fmtDT(header.created_at)} disabled isRtl={isRtl} />

                <div className="relative z-[90]">
                  <DatePicker size="sm" label={t('تاریخ نیاز', 'Need Date')}
                    value={header.need_date || ''} onChange={v => updateHeader('need_date', v)}
                    isRtl={isRtl} calendarMode={calendarMode} disabled={!canEditField('need_date')} />
                </div>

                <div className="relative z-[80]">
                  <SelectField size="sm" label={t('نوع درخواست', 'Request Type')}
                    value={header.request_type || 'GENERAL'}
                    onChange={e => updateHeader('request_type', e.target.value)}
                    options={REQUEST_TYPES.map(r => ({ value: r.value, label: isRtl ? r.fa : r.en }))}
                    isRtl={isRtl} disabled={!canEditField('request_type') || hasItems} required />
                  {hasItems && !isReadOnly && (
                    <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {t('در صورت وجود اقلام، نوع درخواست قابل تغییر نیست.', 'Request Type is locked when items exist.')}
                    </p>
                  )}
                </div>

                <div className="relative z-[78]">
                  <SelectField size="sm" label={t('نوع پرداخت', 'Payment Type')}
                    value={header.payment_type || ''}
                    onChange={e => updateHeader('payment_type', e.target.value)}
                    options={PAYMENT_TYPES.map(r => ({ value: r.value, label: isRtl ? r.fa : r.en }))}
                    isRtl={isRtl} disabled={!canEditField('payment_type')} required />
                </div>

                {(header.reviewer_id || header.reviewer_name) && (<>
                  <TextField size="sm" label={t('بررسی کننده', 'Reviewed By')}
                    value={header.reviewer_name || lookups.usersMap[header.reviewer_id] || '-'} disabled isRtl={isRtl} />
                  <TextField size="sm" label={t('تاریخ بررسی', 'Reviewed At')}
                    value={fmtDT(header.reviewed_at)} disabled isRtl={isRtl} />
                </>)}

                {(header.approver_id || header.approver_name) && (<>
                  <TextField size="sm" label={t('تایید کننده', 'Approved By')}
                    value={header.approver_name || lookups.usersMap[header.approver_id] || '-'} disabled isRtl={isRtl} />
                  <TextField size="sm" label={t('تاریخ تایید', 'Approved At')}
                    value={fmtDT(header.approved_at)} disabled isRtl={isRtl} />
                </>)}

                <div className="lg:col-span-2 md:col-span-2 relative z-[70]">
                  <TextField size="sm" label={t('شرح درخواست', 'Description')}
                    value={header.description || ''} onChange={e => updateHeader('description', e.target.value)}
                    isRtl={isRtl} disabled={!canEditField('description')} required={workflowPermissions.description === 'REQUIRED' || formMode === 'CREATE' || formMode === 'COPY'} />
                </div>
              </div>
            </Card>

            <Card title={
              <div className="flex items-center gap-4 w-full">
                <span>{t('اقلام درخواست', 'Request Items')}</span>
                {balanceInfo.isUnbalanced && (
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/50">
                    <AlertTriangle size={14} />
                    <span className="text-[12px] font-bold">
                      {t(
                        balanceInfo.displayCurrency === 'USD' ? 'اختلاف تراز دلاری:' : `اختلاف تراز ${balanceInfo.displayCurrency}:`,
                        balanceInfo.displayCurrency === 'USD' ? 'USD Diff:' : `${balanceInfo.displayCurrency} Diff:`
                      )}
                      <span dir="ltr" className="inline-block px-1 font-black">{balanceInfo.diffDisplayAmount.toFixed(balanceInfo.displayDecimals)}</span>
                    </span>
                  </div>
                )}
              </div>
            }
              action={
                balanceInfo.isUnbalanced && !isReadOnly ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="!text-orange-600 !border-orange-500 hover:!bg-orange-100 dark:hover:!bg-orange-900/40 !h-6 !py-0 !text-[12px]"
                    icon={Scale}
                    onClick={(e) => {
                      e.stopPropagation();
                      gridRef.current?.triggerBalanceRow({
                        diffAmount: balanceInfo.diffDisplayAmount,
                        currency: balanceInfo.displayCurrency,
                      });
                    }}
                  >
                    {t('تراز کردن ارزی', 'Balance (USD)')}
                  </Button>
                ) : null
              }
              isCollapsible={true} noPadding={true}
              className="border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col min-h-[320px] relative z-10"
              headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
              language={language}>
              <div className="flex-1 w-full flex flex-col relative min-h-[260px]">
                <RequestItemsGrid
                  ref={gridRef}
                  itemsData={items}
                  onItemsChange={(newItems) => { setItems(newItems); setIsDirty(true); }}
                  lookups={lookups}
                  requestType={header.request_type || 'GENERAL'}
                  isReadOnly={areItemsReadOnly}
                  language={language}
                  showToast={showToast}
                  formCode={formCode}
                />
              </div>
            </Card>

        </div>

        {renderWorkflowModals(handleSave)}

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
      </div>
    );
  };

  window.RequestFormModal = RequestFormModal;
})();