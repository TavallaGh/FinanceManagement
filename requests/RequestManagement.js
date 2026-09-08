/* Filename: requests/RequestManagement.js */
/* Request form & items grid live in RequestDetails.js which must load first */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

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

  const DS    = window.DesignSystem || {};
  const Core  = window.DSCore || DS;
  const Button      = safeComp(Core, 'Button');
  const PageHeader  = safeComp(Core, 'PageHeader');
  const Badge       = safeComp(Core, 'Badge');
  const EmptyState  = safeComp(Core, 'EmptyState');

  const DSGrid         = window.DSGrid || DS;
  const DataGrid       = safeComp(DSGrid, 'DataGrid');
  const AdvancedFilter = safeComp(DSGrid, 'AdvancedFilter');

  const DSFeedback = window.DSFeedback || window.DSOverlays || DS;
  const Modal      = safeComp(DSFeedback, 'Modal');
  const Toast      = safeComp(DSFeedback, 'Toast');

  const DSForms           = window.DSForms || DS;
  const AttachmentManager = safeComp(DSForms, 'AttachmentManager');

  const LucideIcons    = window.LucideIcons || {};
  const ClipboardList  = safeIcon(LucideIcons, 'ClipboardList');
  const Edit           = safeIcon(LucideIcons, 'Edit');
  const Trash2         = safeIcon(LucideIcons, 'Trash2');
  const AlertTriangle  = safeIcon(LucideIcons, 'AlertTriangle');
  const MessageSquare  = safeIcon(LucideIcons, 'MessageSquare');
  const Copy           = safeIcon(LucideIcons, 'Copy');
  const Paperclip      = safeIcon(LucideIcons, 'Paperclip');
  const DollarSign     = safeIcon(LucideIcons, 'DollarSign');
  const RefreshCw      = safeIcon(LucideIcons, 'RefreshCw');
  const History        = safeIcon(LucideIcons, 'History');

  const REQUEST_TYPES = [
    { value: 'TRANSFER',   fa: 'انتقال وجه',  en: 'Transfer'   },
    { value: 'EXCHANGE',   fa: 'تبدیل ارز',   en: 'Exchange' },
    { value: 'BUDGET',     fa: 'مصرف بودجه',   en: 'Budget'     },
    { value: 'GENERAL',    fa: 'واریز/ برداشت',   en: 'General'    },
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

  const lockedStatuses = ['REGISTERED', 'REVIEWED', 'APPROVED', 'IN_PROGRESS', 'DONE', 'REJECTED', 'CLOSED'];

  const getStatus    = (v) => STATUS_LIST.find(s => s.value === v) || STATUS_LIST[0];
  const getTypeLabel = (v, rtl) => {
    const r = REQUEST_TYPES.find(x => x.value === v);
    return r ? (rtl ? r.fa : r.en) : (v || '-');
  };

  const getSessionUserId = () => {
    try {
      const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
      return JSON.parse(s).id || null;
    } catch { return null; }
  };

  const RequestManagement = ({ language = 'fa', formCode = 'REQ_REQUEST_MNGMT' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;

    const currentUserId = getSessionUserId() || window.NavigationSystem?.currentUser?.id || null;

    // Loaded from RequestDetails.js (must appear before this script in index.html)
    const RequestFormModal = safeComp(window, 'RequestFormModal');

    const secCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const a = secCtx ? secCtx.getActions(formCode) : null;
      return a || { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }, [secCtx, formCode]);
    const dataScope = useMemo(() => {
      return secCtx ? (secCtx.getDataScope(formCode) || {}) : {};
    }, [secCtx, formCode]);

    const ownDataOnly = useMemo(() => {
      const raw = dataScope?.own_data_only;
      if (raw === true || raw === 1 || raw === '1' || raw === 'true') return true;
      if (Array.isArray(raw)) {
        return raw.some(v => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true');
      }
      return false;
    }, [dataScope]);

    const [requests,         setRequests]         = useState([]);
    const [usersMap,         setUsersMap]         = useState({});
    const [deptsMap,         setDeptsMap]         = useState({});
    const [partiesMap,       setPartiesMap]       = useState({});
    const [partiesList,      setPartiesList]      = useState([]);
    const [costTypes,        setCostTypes]        = useState([]);
    const [incomeTypes,      setIncomeTypes]      = useState([]);
    const [costBenefitCenters, setCostBenefitCenters] = useState([]);
    const [stateMachineRows, setStateMachineRows] = useState([]);
    const [userRoles,        setUserRoles]        = useState([]);
    const [rolesMap,         setRolesMap]         = useState({});
    const [usersList,        setUsersList]        = useState([]);
    const [personnelRows,    setPersonnelRows]    = useState([]);
    const [orgNodes,         setOrgNodes]         = useState([]);
    const [isLoading,        setIsLoading]        = useState(false);
    const [filters,          setFilters]          = useState({});
    const [gridState,        setGridState]        = useState(null);
    const [selectedIds,      setSelectedIds]      = useState([]);
    const [currentView,      setCurrentView]      = useState('list');
    const [formMode,         setFormMode]         = useState('CREATE');
    const [currentRecord,    setCurrentRecord]    = useState(null);
    const [deleteConfirm,    setDeleteConfirm]    = useState({ isOpen: false, type: null, data: null });
    const [commentModalState, setCommentModalState] = useState({ isOpen: false, record: null });
    const [commentedIds,     setCommentedIds]     = useState(new Set());
    const [filteredRecordId, setFilteredRecordId] = useState(null);
    const [attachmentCounts, setAttachmentCounts] = useState({});
    const [attachModal,      setAttachModal]      = useState({ isOpen: false, record: null, files: [] });
    const [isUploading,      setIsUploading]      = useState(false);
    const [toast,            setToast]            = useState({ isVisible: false, message: '', type: 'success' });
    const [summaryModal,     setSummaryModal]     = useState({ isOpen: false, record: null });
    const [statusHistoryModal, setStatusHistoryModal] = useState({ isOpen: false, record: null, rows: [], isLoading: false });

    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
    }, []);

    const parseAmount = useCallback((value) => parseFloat(String(value || '0').replace(/,/g, '')) || 0, []);

    const parseVisualWorkflowGraph = useCallback((raw) => {
      if (!raw) return { nodes: [], edges: [] };
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return {
            nodes: Array.isArray(parsed?.nodes) ? parsed.nodes : [],
            edges: Array.isArray(parsed?.edges) ? parsed.edges : [],
          };
        } catch {
          return { nodes: [], edges: [] };
        }
      }
      return {
        nodes: Array.isArray(raw?.nodes) ? raw.nodes : [],
        edges: Array.isArray(raw?.edges) ? raw.edges : [],
      };
    }, []);

    const fetchMeta = useCallback(async () => {
      try {
        const [uRes, pRes, nRes, costRes, incRes, cbcRes, smRes, urRes, rolesRes, personnelRes] = await Promise.all([
          supabase.from('sec_users').select('id, full_name, username, party_id'),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, mobile').eq('is_active', true),
          supabase.from('fm_org_chart_nodes').select('id, title, parent_id'),
          supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
          supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
          supabase.from('fm_cost_benefit_centers').select('id, title_fa, title_en, center_kind, is_cost_center, is_benefit_center, is_active, manager:parties(id, first_name, last_name), office:fm_org_offices(id, title)'),
          supabase.from('wf_state_machines').select('id, machine_code, entity_code, entry_condition, entry_condition_text, valid_from, valid_to, is_active, graph_json').eq('entity_code', 'REQ_REQUESTS').eq('is_active', true),
          supabase.from('sec_user_roles').select('role_id').eq('user_id', currentUserId),
          supabase.from('sec_roles').select('id, title, code').eq('is_active', true),
          supabase.from('fm_org_chart_personnel').select('node_id, person_id'),
        ]);

        const buildLeafs = (items) => {
          const parentIds = new Set((items || []).map(i => i.parent_id).filter(Boolean));
          return (items || []).filter(i => !parentIds.has(i.id)).map(i => ({
            ...i,
            displayLabel: isRtl ? (i.title_fa || '') : (i.title_en || i.title_fa || ''),
          }));
        };

        const uMap = {}; (uRes.data || []).forEach(u => { uMap[u.id] = u.full_name || u.username || ''; });
        setUsersMap(uMap);
        setUsersList(uRes.data || []);
        const pMap = {};
        const pList = (pRes.data || []).map(p => {
          const label = p.party_type === 'legal' ? (p.company_name || '') : `${p.first_name || ''} ${p.last_name || ''}`.trim();
          pMap[p.id] = label;
          return { ...p, displayLabel: label };
        });
        setPartiesMap(pMap);
        setPartiesList(pList);
        const dMap = {}; (nRes.data || []).forEach(n => { dMap[n.id] = n.title; });
        setDeptsMap(dMap);
        setCostTypes(buildLeafs(costRes.data || []));
        setIncomeTypes(buildLeafs(incRes.data || []));
        setStateMachineRows(smRes.error ? [] : (smRes.data || []));
        if (smRes.error) {
          const msg = String(smRes.error?.message || '').toLowerCase();
          if (smRes.error?.code === '42P01' || msg.includes('wf_state_machines')) {
            showToast(t('تنظیمات State Machine در این محیط کامل نیست. ابتدا اسکریپت‌های فاز ۲ و ۵ را اجرا کنید.', 'State machine setup is incomplete in this environment. Run Phase 2 and Phase 5 scripts first.'), 'warning');
          }
        }
        setUserRoles((urRes.data || []).map(r => String(r.role_id)));
        const rMap = {};
        (rolesRes.data || []).forEach(r => { rMap[String(r.id)] = r.title || r.code || ''; });
        setRolesMap(rMap);
        setPersonnelRows(personnelRes.data || []);
        setOrgNodes(nRes.data || []);
        setCostBenefitCenters((cbcRes.data || []).map(r => ({
          id: r.id,
          titleFa: r.title_fa || '',
          titleEn: r.title_en || r.title_fa || '',
          centerKind: r.center_kind || '',
          isCostCenter: r.is_cost_center ?? false,
          isBenefitCenter: r.is_benefit_center ?? false,
          isActive: r.is_active ?? true,
          managerName: r.manager ? `${r.manager.first_name || ''} ${r.manager.last_name || ''}`.trim() : '',
          officeName: r.office?.title || '',
        })));
      } catch {}
    }, [supabase, isRtl, currentUserId]);

    const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('req_requests')
          .select('*, req_request_items(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const visible = (data || []).filter(r =>
          r.status !== 'DRAFT' || String(r.registrar_id) === String(currentUserId)
        );
        setRequests(visible);

        // fetch comments and attachment counts in parallel
        if (visible.length > 0) {
          const reqIds = visible.map(r => String(r.id));
          const [{ data: commentRows }, { data: attachRows }] = await Promise.all([
            supabase.from('sys_comments').select('entity_id').eq('entity_type', 'req_requests').in('entity_id', reqIds),
            supabase.from('fm_attachments').select('entity_id').eq('entity_type', 'REQUEST_MANAGEMENT').in('entity_id', reqIds),
          ]);
          if (commentRows) setCommentedIds(new Set(commentRows.map(c => c.entity_id)));
          if (attachRows) {
            const counts = {};
            attachRows.forEach(a => { counts[a.entity_id] = (counts[a.entity_id] || 0) + 1; });
            setAttachmentCounts(counts);
          }
        }
      } catch {
        showToast(t('خطا در دریافت درخواست‌ها', 'Error loading requests'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [supabase, currentUserId, showToast, t]);

    useEffect(() => {
      if (access.canView) { fetchMeta(); fetchData(); }
    }, [fetchMeta, fetchData, access.canView]);

    useEffect(() => {
      const handleFilterToRecord = (e) => {
        const details = e?.detail || {};
        const matchesForm = String(details.form_component || '') === 'RequestManagement';
        const matchesEntity = String(details.entity_type || '').toLowerCase() === 'req_requests';
        if ((matchesForm || matchesEntity) && details.entity_id) {
          setFilteredRecordId(String(details.entity_id));
        }
      };
      window.addEventListener('filterToRecord', handleFilterToRecord);
      return () => window.removeEventListener('filterToRecord', handleFilterToRecord);
    }, []);

    const loadAttachments = useCallback(async (recordId) => {
      if (!supabase || !recordId) return;
      try {
        const { data } = await supabase.from('fm_attachments').select('*')
          .eq('entity_type', 'REQUEST_MANAGEMENT').eq('entity_id', String(recordId));
        setAttachModal(prev => ({ ...prev, files: data || [] }));
      } catch {}
    }, [supabase]);

    const openAttachments = useCallback((record) => {
      setAttachModal({ isOpen: true, record, files: [] });
      loadAttachments(record.id);
    }, [loadAttachments]);

    const handleFileUpload = useCallback(async (files) => {
      if (!files || files.length === 0 || !attachModal.record) return;
      const file = files[0];
      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${attachModal.record.id}_${Date.now()}.${fileExt}`;
        const filePath = `requests/${fileName}`;
        let fileUrl = '';
        if (supabase.storage) {
          const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath);
          fileUrl = urlData.publicUrl;
        } else {
          fileUrl = URL.createObjectURL(file);
        }
        const payload = {
          entity_type: 'REQUEST_MANAGEMENT',
          entity_id:   String(attachModal.record.id),
          file_name:   file.name,
          file_size:   file.size,
          file_type:   file.type || 'application/octet-stream',
          file_url:    fileUrl,
          created_by:  currentUserId,
        };
        const { error } = await supabase.from('fm_attachments').insert([payload]);
        if (error) throw error;
        showToast(t('فایل با موفقیت پیوست شد.', 'File attached successfully.'));
        loadAttachments(attachModal.record.id);
        fetchData();
      } catch {
        showToast(t('خطا در آپلود فایل.', 'Error uploading file.'), 'error');
      } finally {
        setIsUploading(false);
      }
    }, [supabase, attachModal.record, currentUserId, showToast, t, loadAttachments, fetchData]);

    const handleDeleteAttachment = useCallback(async (file) => {
      try {
        const { error } = await supabase.from('fm_attachments').delete().eq('id', file.id);
        if (error) throw error;
        showToast(t('پیوست حذف شد.', 'Attachment deleted.'));
        loadAttachments(attachModal.record.id);
        fetchData();
      } catch {
        showToast(t('خطا در حذف پیوست.', 'Error deleting attachment.'), 'error');
      }
    }, [supabase, attachModal.record, showToast, t, loadAttachments, fetchData]);

    // ── exchange-rate helpers ──────────────────────────────────────────────
    const resolveRates = (ratesMap, currency) => {
      let toUsd = 1;
      if (currency !== 'USD') {
        const direct  = ratesMap[`${currency}_USD`];
        const inverse = ratesMap[`USD_${currency}`];
        if (direct)       toUsd = parseFloat(direct);
        else if (inverse) toUsd = 1 / parseFloat(inverse);
      }
      let usdToIrr = parseFloat(ratesMap['USD_IRR'] || 1);
      if (!ratesMap['USD_IRR'] && ratesMap['IRR_USD'])
        usdToIrr = 1 / parseFloat(ratesMap['IRR_USD']);
      return { toUsd, usdToIrr };
    };

    const handleBulkUpdateRates = async (ids) => {
      setIsLoading(true);
      try {
        const updatableStatuses = ['DRAFT', 'REGISTERED'];
        const selected = requests.filter(r => ids.includes(r.id) && updatableStatuses.includes(r.status));
        if (selected.length === 0) {
          showToast(t('فقط درخواست‌های «یادداشت» یا «ثبت‌شده» امکان بروزرسانی نرخ ارز دارند.', 'Only Draft or Registered requests can have exchange rates updated.'), 'warning');
          setIsLoading(false);
          return;
        }

        const uniqueDates = [...new Set(selected.map(r => r.need_date || r.created_at).filter(Boolean))];
        const ratesByDate = {};
        for (const dateRaw of uniqueDates) {
          const dateKey     = dateRaw.replace(/\//g, '-').split('T')[0];
          const { data }    = await supabase
            .from('fm_currency_rates')
            .select('base_currency, target_currency, rate, rate_date')
            .lte('rate_date', dateKey)
            .order('rate_date', { ascending: false });
          const latest = {};
          (data || []).forEach(r => {
            const key = `${r.base_currency}_${r.target_currency}`;
            if (!latest[key]) latest[key] = r.rate;
          });
          ratesByDate[dateRaw] = latest;
        }

        let updatedCount = 0;
        for (const req of selected) {
          const dateKey  = req.need_date || req.created_at;
          const ratesMap = ratesByDate[dateKey] || {};
          for (const item of (req.req_request_items || [])) {
            const cur = item.currency || 'IRR';
            const { toUsd, usdToIrr } = resolveRates(ratesMap, cur);
            const { error } = await supabase
              .from('req_request_items')
              .update({
                exchange_rate_to_usd:     toUsd,
                exchange_rate_usd_to_irr: usdToIrr,
              })
              .eq('id', item.id);
            if (!error) updatedCount++;
          }
        }

        showToast(t(`${updatedCount} قلم درخواست با آخرین نرخ‌های ارز بروز شد.`, `${updatedCount} items updated with latest exchange rates.`));
        fetchData();
      } catch {
        showToast(t('خطا در بروزرسانی نرخ ارزها.', 'Error updating exchange rates.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const openSummary = (record) => setSummaryModal({ isOpen: true, record });

    const openStatusHistory = useCallback(async (record) => {
      if (!record?.id) return;
      setStatusHistoryModal({ isOpen: true, record, rows: [], isLoading: true });
      try {
        const { data, error, status } = await supabase
          .from('req_request_status_logs')
          .select('*')
          .eq('request_id', record.id)
          .order('changed_at', { ascending: true });
        if (error) {
          const msg = String(error?.message || '').toLowerCase();
          const missing = status === 404 || error?.code === '42P01' || msg.includes('req_request_status_logs');
          if (missing) {
            showToast(t('جدول تاریخچه وضعیت ایجاد نشده است. ابتدا اسکریپت SQL مربوطه را اجرا کنید.', 'Status history table is missing. Run its SQL migration first.'), 'warning');
            setStatusHistoryModal({ isOpen: false, record: null, rows: [], isLoading: false });
            return;
          }
          throw error;
        }
        const rows = (data || []).map((row, idx) => ({ ...row, row_no: idx + 1 }));
        setStatusHistoryModal({ isOpen: true, record, rows, isLoading: false });
      } catch {
        showToast(t('خطا در دریافت تاریخچه تغییر وضعیت.', 'Error loading status history.'), 'error');
        setStatusHistoryModal({ isOpen: true, record, rows: [], isLoading: false });
      }
    }, [supabase, showToast, t]);

    const handleOpenForm = (mode, record = null) => {
      setFormMode(mode);
      setCurrentRecord(record || {});
      setCurrentView('form');
    };

    const handleFormSuccess = () => {
      setCurrentView('list');
      fetchData();
    };

    const isDeletable = (r) => r.status === 'DRAFT';

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const { error } = await supabase.from('req_requests').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('req_requests').delete().in('id', deleteConfirm.data);
          if (error) throw error;
        }
        showToast(t('حذف با موفقیت انجام شد.', 'Deleted successfully.'));
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        setSelectedIds([]);
        fetchData();
      } catch {
        showToast(t('خطا در حذف.', 'Delete error.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const fmtDate = (v) => {
      if (!v) return '-';
      try { return new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(v)); }
      catch { return v; }
    };

    const columns = useMemo(() => [
      {
        field: 'request_code', header_fa: 'کد درخواست', header_en: 'Request Code', width: '130px',
        render: val => <span className="font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{val}</span>,
      },
      {
        field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '115px',
        render: val => { const s = getStatus(val); return <Badge variant={s.color} size="sm">{isRtl ? s.fa : s.en}</Badge>; },
      },
      {
        field: 'request_type', header_fa: 'نوع درخواست', header_en: 'Type', width: '100px',
        render: val => <span className="text-[12px] text-slate-600 dark:text-slate-400">{getTypeLabel(val, isRtl)}</span>,
      },      
      {
        field: 'payment_type', header_fa: 'نوع پرداخت', header_en: 'Payment', width: '100px',
        render: val => {
          const types = { CASH: t('نقد', 'Cash'), CHECK: t('چک', 'Check'), CRYPTO: t('کریپتو', 'Crypto'), BANK: t('بانک', 'Bank'), TC: 'TC' };
          return <span className="text-[12px] text-slate-600 dark:text-slate-400">{val ? (types[val] || val) : '-'}</span>;
        },
      },
      {
        field: 'requester_party_id', header_fa: 'درخواست دهنده', header_en: 'Requester', width: '100px',
        render: (val, row) => (
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
            {val ? (partiesMap[val] || val) : (row.registrar_id ? (usersMap[row.registrar_id] || '-') : '-')}
          </span>
        ),
      },
      {
        field: 'assigned_to_display', header_fa: 'انجام دهنده', header_en: 'Assigned To', width: '120px',
        render: (val, row) => (
          <span className={`text-[12px] ${row.assigned_to_is_me ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {val || '-'}
          </span>
        ),
      },
      {
        field: 'created_at', header_fa: 'تاریخ ثبت', header_en: 'Submitted', width: '100px',
        render: val => <span className="text-[12px] text-slate-500">{fmtDate(val)}</span>,
      },
      {
        field: 'need_date', header_fa: 'تاریخ نیاز', header_en: 'Need Date', width: '100px',
        render: val => <span className="text-[12px] text-slate-500">{val ? fmtDate(val) : '-'}</span>,
      },
      {
        field: 'description', header_fa: 'شرح', header_en: 'Description', width: 'auto',
        render: val => <span className="text-[12px] text-slate-500 dark:text-slate-400 truncate block max-w-xs" title={val}>{val || '-'}</span>,
      },
    ], [usersMap, partiesMap, isRtl]);

    const historyColumns = useMemo(() => [
      {
        field: 'row_no', header_fa: 'ردیف', header_en: 'Row', width: '70px',
        render: val => <span className="text-[12px] font-bold text-slate-600">{val}</span>,
      },
      {
        field: 'changed_at', header_fa: 'تاریخ', header_en: 'Date', width: '110px',
        render: val => {
          if (!val) return '-';
          try {
            return new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(val));
          } catch { return '-'; }
        },
      },
      {
        field: 'changed_at_time', header_fa: 'زمان', header_en: 'Time', width: '90px',
        render: (_, row) => {
          if (!row.changed_at) return '-';
          try {
            return new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(row.changed_at));
          } catch { return '-'; }
        },
      },
      {
        field: 'from_status', header_fa: 'از وضعیت', header_en: 'From Status', width: '120px',
        render: val => {
          const s = getStatus(val);
          return <Badge variant={s.color} size="sm">{isRtl ? s.fa : s.en}</Badge>;
        },
      },
      {
        field: 'to_status', header_fa: 'به وضعیت', header_en: 'To Status', width: '120px',
        render: val => {
          const s = getStatus(val);
          return <Badge variant={s.color} size="sm">{isRtl ? s.fa : s.en}</Badge>;
        },
      },
      {
        field: 'actor_name', header_fa: 'انجام دهنده', header_en: 'Done By', width: '140px',
        render: val => <span className="text-[12px] text-slate-700 dark:text-slate-300">{val || '-'}</span>,
      },
      {
        field: 'next_assignee', header_fa: 'انجام دهنده بعدی', header_en: 'Next Assignee', width: '170px',
        render: val => <span className="text-[12px] text-slate-600 dark:text-slate-300">{val || '-'}</span>,
      },
      {
        field: 'description', header_fa: 'توضیحات', header_en: 'Description', width: 'auto',
        render: val => <span className="text-[12px] text-slate-500 dark:text-slate-400 truncate block max-w-xs" title={val || ''}>{val || '-'}</span>,
      },
    ], [isRtl]);

    const ITEM_ACTIONS = [
      { value: 'DEPOSIT', label: t('واریز', 'Deposit') },
      { value: 'WITHDRAWAL', label: t('برداشت', 'Withdrawal') },
    ];
    const ITEM_GROUPS = [
      { value: 'COST', label: t('هزینه', 'Cost') },
      { value: 'INCOME', label: t('درآمد', 'Income') },
      { value: 'BALANCE', label: t('بالانس', 'Balance') },
      { value: 'OTHER', label: t('سایر', 'Other') },
    ];
    const CENTER_KIND_LABELS = {
      DEPARTMENT: { fa: 'دپارتمان', en: 'Department' },
      TEAM: { fa: 'تیم', en: 'Team' },
      PROJECT: { fa: 'پروژه', en: 'Project' },
      OTHER: { fa: 'سایر', en: 'Other' },
    };

    const mergedSubTypes = useMemo(() => ([
      ...(costTypes || []).map(x => ({ ...x, subTypeGroup: 'COST', subTypeGroupLabel: t('هزینه', 'Cost') })),
      ...(incomeTypes || []).map(x => ({ ...x, subTypeGroup: 'INCOME', subTypeGroupLabel: t('درآمد', 'Income') })),
    ]), [costTypes, incomeTypes, t]);

    const subTypeLovColumns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '90px' },
      { field: 'displayLabel', header_fa: 'عنوان', header_en: 'Title', width: 'auto' },
      { field: 'subTypeGroupLabel', header_fa: 'گروه', header_en: 'Group', width: '90px' },
    ];
    const partyLovColumns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '90px' },
      { field: 'displayLabel', header_fa: 'نام', header_en: 'Name', width: '200px' },
      { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '120px' },
    ];
    const centerLovColumns = [
      { field: isRtl ? 'titleFa' : 'titleEn', header_fa: 'عنوان مرکز', header_en: 'Center Title', width: '200px' },
      { field: 'managerName', header_fa: 'مسئول', header_en: 'Manager', width: '140px' },
      {
        field: 'centerKind',
        header_fa: 'گروه مرکز',
        header_en: 'Center Group',
        width: '110px',
        render: (val) => {
          const lbl = CENTER_KIND_LABELS[val];
          return <span>{lbl ? (isRtl ? lbl.fa : lbl.en) : val}</span>;
        },
      },
    ];

    const workflowAssignments = useMemo(() => {
      if (!currentUserId) return { actionableSet: new Set(), assignedMap: {} };

      const today = new Date();
      const toDateOnly = (val) => {
        if (!val) return null;
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      const getRequestConditionValue = (requestRow, field) => {
        if (!field) return undefined;
        const reqItems = requestRow.req_request_items || [];
        if (field === 'total_usd_amount') {
          return reqItems.reduce((total, item) => {
            const amount = Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount));
            const rate = parseFloat(item.exchange_rate_to_usd || 1) || 1;
            return total + (amount * rate);
          }, 0);
        }
        if (field.startsWith('items.')) {
          const itemField = field.slice(6);
          if (itemField === 'amount') {
            return reqItems.map(item => Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount)));
          }
          return reqItems.map(item => item[itemField]).filter(value => value !== null && value !== undefined);
        }
        return requestRow[field];
      };

      const matchOperator = (actualCandidate, operator, expectedValue) => {
        if (operator === 'contains') return String(actualCandidate ?? '').includes(String(expectedValue ?? ''));
        const numeric = actualCandidate !== '' && expectedValue !== '' && !isNaN(Number(actualCandidate)) && !isNaN(Number(expectedValue));
        const left = numeric ? Number(actualCandidate) : String(actualCandidate ?? '');
        const right = numeric ? Number(expectedValue) : String(expectedValue ?? '');
        if (operator === '=') return left === right;
        if (operator === '!=') return left !== right;
        if (operator === '>') return left > right;
        if (operator === '>=') return left >= right;
        if (operator === '<') return left < right;
        if (operator === '<=') return left <= right;
        return false;
      };

      const parseEntryConditionText = (textValue) => {
        const raw = String(textValue || '').trim();
        if (!raw) return null;
        const match = raw.match(/^\s*([a-zA-Z0-9_.]+)\s*(=|!=|>=|<=|>|<|contains)\s*(.+?)\s*$/i);
        if (!match) return null;
        const valueRaw = String(match[3] || '').trim();
        const normalizedValue = valueRaw.replace(/^['\"]|['\"]$/g, '');
        return {
          field: match[1],
          operator: String(match[2] || '=').toLowerCase(),
          value: normalizedValue,
        };
      };

      const conditionMatches = (requestRow, condition) => {
        if (!condition?.field) return true;
        const actual = getRequestConditionValue(requestRow, condition.field);
        const values = Array.isArray(actual) ? actual : [actual];
        return values.some(candidate => matchOperator(candidate, condition.operator || '=', condition.value));
      };

      const stateMachineMatchesRequest = (machine, requestRow) => {
        if (!machine || machine.is_active === false) return false;
        const fromDate = toDateOnly(machine.valid_from);
        const toDate = toDateOnly(machine.valid_to);
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (fromDate && todayDate < fromDate) return false;
        if (toDate && todayDate > toDate) return false;

        if (machine.entry_condition && typeof machine.entry_condition === 'object' && machine.entry_condition.field) {
          return conditionMatches(requestRow, {
            field: machine.entry_condition.field,
            operator: machine.entry_condition.operator || '=',
            value: machine.entry_condition.value,
          });
        }

        const parsedText = parseEntryConditionText(machine.entry_condition_text);
        if (parsedText) return conditionMatches(requestRow, parsedText);

        return true;
      };

      const selectMachineForRequest = (requestRow) => {
        const candidates = (stateMachineRows || [])
          .filter(machine => String(machine.entity_code || '') === 'REQ_REQUESTS')
          .filter(machine => stateMachineMatchesRequest(machine, requestRow))
          .sort((a, b) => String(a.machine_code || '').localeCompare(String(b.machine_code || '')));
        return candidates[0] || null;
      };

      const usersById = {};
      (usersList || []).forEach(user => { usersById[String(user.id)] = user; });
      const currentUser = usersById[String(currentUserId)] || null;
      const currentUserPartyId = currentUser?.party_id ? String(currentUser.party_id) : null;

      const nodeById = {};
      (orgNodes || []).forEach(node => { nodeById[String(node.id)] = node; });

      const nodeByPartyId = {};
      const partyIdsByNodeId = {};
      (personnelRows || []).forEach(row => {
        const personId = row?.person_id != null ? String(row.person_id) : null;
        const nodeId = row?.node_id != null ? String(row.node_id) : null;
        if (personId && nodeId && !nodeByPartyId[personId]) nodeByPartyId[personId] = nodeId;
        if (personId && nodeId) {
          if (!partyIdsByNodeId[nodeId]) partyIdsByNodeId[nodeId] = [];
          partyIdsByNodeId[nodeId].push(personId);
        }
      });

      const roleSet = new Set((userRoles || []).map(String));

      const userDisplay = (user) => user ? (user.full_name || user.username || String(user.id)) : '';

      const getConditionValue = (requestRow, field) => {
        const reqItems = requestRow.req_request_items || [];
        if (field === 'total_usd_amount') {
          return reqItems.reduce((total, item) => {
            const amount = Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount));
            const rate = parseFloat(item.exchange_rate_to_usd || 1) || 1;
            return total + (amount * rate);
          }, 0);
        }
        if (field.startsWith('items.')) {
          const itemField = field.slice(6);
          if (itemField === 'amount') {
            return reqItems.map(item => Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount)));
          }
          return reqItems.map(item => item[itemField]).filter(value => value !== null && value !== undefined);
        }
        return requestRow[field];
      };

      const singleConditionMatch = (requestRow, condition) => {
        if (!condition?.field) return true;
        const actual = getConditionValue(requestRow, condition.field);
        const expected = condition.value;
        const values = Array.isArray(actual) ? actual : [actual];
        return values.some(candidate => {
          if (condition.operator === 'contains') return String(candidate ?? '').includes(String(expected ?? ''));
          const numeric = candidate !== '' && expected !== '' && !isNaN(Number(candidate)) && !isNaN(Number(expected));
          const left = numeric ? Number(candidate) : String(candidate ?? '');
          const right = numeric ? Number(expected) : String(expected ?? '');
          if (condition.operator === '=') return left === right;
          if (condition.operator === '!=') return left !== right;
          if (condition.operator === '>') return left > right;
          if (condition.operator === '>=') return left >= right;
          if (condition.operator === '<') return left < right;
          if (condition.operator === '<=') return left <= right;
          return false;
        });
      };

      const assigneeBlockConditionsMatch = (requestRow, conditions) => {
        if (!Array.isArray(conditions) || conditions.length === 0) return true;
        let result = true;
        conditions.forEach((condition, index) => {
          const matched = singleConditionMatch(requestRow, condition);
          if (index === 0) {
            result = matched;
            return;
          }
          if (String(condition.joinWithPrev || 'AND').toUpperCase() === 'OR') result = result || matched;
          else result = result && matched;
        });
        return result;
      };

      const resolveAssignee = (requestRow, type, value) => {
        if (!type || !value) return { found: false, matches: false, labels: [] };
        if (type === 'USER') {
          const assignedUser = usersById[String(value)];
          const label = assignedUser ? userDisplay(assignedUser) : (usersMap[value] || String(value));
          return { found: true, matches: String(value) === String(currentUserId), labels: [label] };
        }
        if (type === 'ROLE') {
          const roleTitle = rolesMap[String(value)] || String(value);
          return { found: true, matches: roleSet.has(String(value)), labels: [roleTitle] };
        }
        if (type === 'DYNAMIC' && value === 'REQUESTER') {
          const requesterId = requestRow.registrar_id || null;
          const requesterUser = usersById[String(requesterId || '')];
          const label = requesterUser ? userDisplay(requesterUser) : (requesterId ? (usersMap[requesterId] || String(requesterId)) : '');
          return { found: !!requesterId, matches: !!requesterId && String(requesterId) === String(currentUserId), labels: label ? [label] : [] };
        }
        if (type === 'DYNAMIC' && value === 'DIRECT_MANAGER') {
          const requesterUser = usersById[String(requestRow.registrar_id || '')];
          const requesterPartyId = requesterUser?.party_id ? String(requesterUser.party_id) : null;
          if (!requesterPartyId || !currentUserPartyId) return { found: false, matches: false, labels: [] };
          const requesterNodeId = nodeByPartyId[requesterPartyId];
          if (!requesterNodeId) return { found: false, matches: false, labels: [] };
          const parentNodeId = nodeById[requesterNodeId]?.parent_id ? String(nodeById[requesterNodeId].parent_id) : null;
          if (!parentNodeId) return { found: false, matches: false, labels: [] };
          const managerPartyIds = partyIdsByNodeId[parentNodeId] || [];
          const managerUsers = (usersList || []).filter(u => managerPartyIds.includes(String(u.party_id || '')));
          const labels = managerUsers.map(userDisplay).filter(Boolean);
          const found = labels.length > 0;
          const matches = managerPartyIds.includes(String(currentUserPartyId));
          return { found, matches, labels };
        }
        return { found: false, matches: false, labels: [] };
      };

      const actionableSet = new Set();
      const assignedMap = {};

      (requests || []).forEach(requestRow => {
        const wf = selectMachineForRequest(requestRow);
        if (!wf || wf.is_active === false) {
          assignedMap[String(requestRow.id)] = { label: '-', isMine: false };
          return;
        }
        const graph = parseVisualWorkflowGraph(wf.graph_json);
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const edges = Array.isArray(graph.edges) ? graph.edges : [];
        if (!nodes.length || !edges.length) {
          assignedMap[String(requestRow.id)] = { label: '-', isMine: false };
          return;
        }

        const currentNodes = nodes.filter(node => String(node?.status || '') === String(requestRow.status || ''));
        let canAct = false;
        const assigneeLabels = [];

        for (const node of currentNodes) {
          const hasOutgoing = edges.some(edge => String(edge?.source || '') === String(node?.id || ''));
          if (!hasOutgoing) continue;

          const blocks = Array.isArray(node?.settings?.assignee?.blocks) ? node.settings.assignee.blocks : [];
          for (const block of blocks) {
            if (!assigneeBlockConditionsMatch(requestRow, block?.conditions || [])) continue;
            let resolution = resolveAssignee(requestRow, block?.assignee_type, block?.assignee_value);
            if (!resolution.found && block?.fallback_assignee_type) {
              resolution = resolveAssignee(requestRow, block.fallback_assignee_type, block.fallback_assignee_value);
            }
            (resolution.labels || []).forEach(label => {
              if (label && !assigneeLabels.includes(label)) assigneeLabels.push(label);
            });
            if (resolution.matches) {
              canAct = true;
            }
          }
        }

        const label = assigneeLabels.length ? assigneeLabels.join(' | ') : '-';
        assignedMap[String(requestRow.id)] = { label, isMine: canAct };
        if (canAct) actionableSet.add(String(requestRow.id));
      });

      return { actionableSet, assignedMap };
    }, [currentUserId, orgNodes, parseAmount, parseVisualWorkflowGraph, personnelRows, requests, rolesMap, stateMachineRows, userRoles, usersList, usersMap]);

    const actionableRequestIds = workflowAssignments.actionableSet;

    const filteredData = useMemo(() => requests.filter(r => {
      if (filteredRecordId && String(r.id) !== String(filteredRecordId)) return false;

      const hasItemFilters =
        !!filters.transaction_action ||
        !!filters.transaction_group ||
        !!filters.sub_type_id ||
        !!filters.party_id ||
        !!filters.center_id;

      if (ownDataOnly) {
        const isCreator = String(r.registrar_id || '') === String(currentUserId || '');
        if (filters.assigned_to_me) {
          if (!actionableRequestIds.has(String(r.id))) return false;
        } else {
          if (!isCreator) return false;
        }
      } else {
        if (filters.assigned_to_me && !actionableRequestIds.has(String(r.id))) return false;
      }

      if (!hasItemFilters) return true;

      const hasMatchingItem = (r.req_request_items || []).some(item => {
        if (filters.transaction_action && item.transaction_action !== filters.transaction_action) return false;
        if (filters.transaction_group && item.transaction_group !== filters.transaction_group) return false;

        if (filters.sub_type_id) {
          const selected = filters.sub_type_id;
          if (selected.subTypeGroup === 'COST') {
            if (String(item.cost_type_id || '') !== String(selected.id)) return false;
          } else if (selected.subTypeGroup === 'INCOME') {
            if (String(item.income_type_id || '') !== String(selected.id)) return false;
          }
        }

        if (filters.party_id && String(item.party_id || '') !== String(filters.party_id.id)) return false;
        if (filters.center_id && String(item.center_id || '') !== String(filters.center_id.id)) return false;

        return true;
      });

      return hasMatchingItem;
    }).map(r => {
      const assigned = workflowAssignments.assignedMap[String(r.id)] || { label: '-', isMine: false };
      return { ...r, assigned_to_display: assigned.label, assigned_to_is_me: assigned.isMine };
    }), [requests, filteredRecordId, filters, actionableRequestIds, workflowAssignments.assignedMap, ownDataOnly, currentUserId]);

    const filterFields = [
      { name: 'transaction_action', label: t('نوع', 'Action'), type: 'select', options: ITEM_ACTIONS },
      { name: 'transaction_group', label: t('گروه', 'Group'), type: 'select', options: ITEM_GROUPS },
      { name: 'sub_type_id', label: t('نوع هزینه/درآمد', 'Cost/Income Type'), type: 'lov', lovData: mergedSubTypes, lovColumns: subTypeLovColumns, dropdownWidth: 'min-w-[420px]' },
      { name: 'party_id', label: t('طرف مقابل', 'Party'), type: 'lov', lovData: partiesList, lovColumns: partyLovColumns, dropdownWidth: 'min-w-[520px]' },
      { name: 'center_id', label: t('مرکز هزینه/درآمد', 'Cost/Income Center'), type: 'lov', lovData: costBenefitCenters, lovColumns: centerLovColumns, dropdownWidth: 'min-w-[580px]' },
      { name: 'assigned_to_me', label: t('تخصیص به من', 'Assigned To Me'), type: 'toggle' },
    ];

    const viewConfig = useMemo(() => ({
      pageId: 'request_management_list',
      currentState: () => ({ filters, gridState }),
      onApplyState: (state) => {
        if (state) { if (state.filters) setFilters(state.filters); if (state.gridState) setGridState(state.gridState); }
        else { setFilters({}); setGridState(null); }
      },
    }), [filters, gridState]);

    return (
      <div className="h-full flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
        {currentView === 'list' && (
          <div className="flex-1 flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900 overflow-hidden">
            <PageHeader
              title={t('مدیریت درخواست‌ها', 'Request Management')}
              icon={ClipboardList}
              description={t('ثبت، پیگیری و مدیریت درخواست‌های سازمانی', 'Manage and track organizational requests')}
              language={language}
              breadcrumbs={[{ label: t('گردش کار', 'Workflow') }, { label: t('درخواست‌ها', 'Requests') }]}
              viewConfig={viewConfig}
              notifFilter={filteredRecordId ? { isActive: true, onClear: () => setFilteredRecordId(null) } : null}
            />

            <div className="flex-1 flex flex-col min-h-0 mt-2 animate-in fade-in duration-300">
              <AdvancedFilter fields={filterFields} initialValues={filters}
                onFilter={setFilters} onClear={() => setFilters({})} language={language} />

              <div className="flex-1 min-h-0 mt-1">
                <DataGrid
                  data={filteredData} columns={columns} language={language}
                  formCode={formCode} isLoading={isLoading} hideImport={true}
                  selectable={true} selectedIds={selectedIds} onSelectChange={setSelectedIds}
                  gridState={gridState} onGridStateChange={setGridState}
                  actionWidth="240px"
                  onAdd={access.canCreate ? () => handleOpenForm('CREATE') : undefined}
                  onRowDoubleClick={row => handleOpenForm('EDIT', row)}
                  actions={[
                    {
                      icon: DollarSign,
                      tooltip: t('خلاصه ارزی', 'Currency Summary'),
                      onClick: row => openSummary(row),
                      className: 'text-indigo-500 hover:text-indigo-600',
                    },
                    {
                      icon: History,
                      tooltip: t('تاریخچه وضعیت', 'Status History'),
                      onClick: row => openStatusHistory(row),
                      className: 'text-violet-600 hover:text-violet-700',
                    },
                    {
                      icon: Paperclip,
                      tooltip: t('پیوست‌ها', 'Attachments'),
                      onClick: row => openAttachments(row),
                      className: row => attachmentCounts[String(row.id)] > 0 ? '!text-indigo-600 hover:!text-indigo-700' : '!text-slate-400 hover:!text-slate-600',
                    },
                    {
                      icon: MessageSquare,
                      tooltip: t('کامنت‌ها', 'Comments'),
                      onClick: row => setCommentModalState({ isOpen: true, record: row }),
                      className: row => commentedIds.has(String(row.id)) ? 'text-blue-500 hover:text-blue-600' : 'text-slate-400 hover:text-blue-600',
                    },
                    {
                      icon: Copy,
                      tooltip: t('کپی درخواست', 'Copy Request'),
                      onClick: row => handleOpenForm('COPY', row),
                      requiredAccess: 'create',
                      className: 'text-emerald-600 hover:text-emerald-700',
                    },
                    {
                      icon: Edit, tooltip: t('مشاهده / ویرایش', 'View / Edit'),
                      onClick: row => handleOpenForm('EDIT', row),
                      className: 'text-slate-400 hover:text-indigo-600',
                    },
                    {
                      icon: Trash2, tooltip: t('حذف', 'Delete'),
                      onClick: row => {
                        if (!isDeletable(row)) { showToast(t('فقط درخواست‌های "یادداشت" قابل حذف هستند.', 'Only Draft requests can be deleted.'), 'warning'); return; }
                        setDeleteConfirm({ isOpen: true, type: 'single', data: row });
                      },
                      className: row => isDeletable(row) ? 'text-slate-400 hover:text-red-600' : '!text-slate-200 dark:!text-slate-700 cursor-not-allowed',
                    },
                  ]}
                  bulkActions={[
                    {
                      label: t('بروزرسانی نرخ ارز', 'Update Exchange Rates'),
                      icon: RefreshCw, variant: 'outline',
                      onClick: ids => handleBulkUpdateRates(ids),
                      className: 'text-indigo-600 dark:text-indigo-400',
                    },
                    {
                      label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline',
                      onClick: ids => {
                        const ok = requests.filter(r => ids.includes(r.id) && isDeletable(r)).map(r => r.id);
                        if (!ok.length) { showToast(t('هیچ‌کدام قابل حذف نیستند.', 'None can be deleted.'), 'warning'); return; }
                        setDeleteConfirm({ isOpen: true, type: 'bulk', data: ok });
                      },
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {currentView === 'form' && currentRecord && (
          <RequestFormModal
            key={`${formMode}-${currentRecord?.id || 'new'}`}
            isOpen={true}
            onClose={() => setCurrentView('list')}
            onSuccess={handleFormSuccess}
            formMode={formMode}
            initialRecord={currentRecord}
            language={language}
            formCode={formCode}
          />
        )}

        <Modal isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
          title={t('تایید حذف', 'Confirm Delete')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'Warning: Irreversible')}
            description={deleteConfirm.type === 'bulk'
              ? t(`آیا از حذف ${deleteConfirm.data?.length} درخواست مطمئنید؟`, `Delete ${deleteConfirm.data?.length} requests?`)
              : t('آیا از حذف این درخواست مطمئنید؟', 'Delete this request?')}
            action={
              <div className="flex gap-2 w-full mt-4 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={executeDelete} isLoading={isLoading}>{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>

        {(() => {
          const isAttachReadOnly = attachModal.record && lockedStatuses.includes(attachModal.record.status);
          return attachModal.isOpen ? (
            <Modal isOpen={attachModal.isOpen}
              onClose={() => setAttachModal({ isOpen: false, record: null, files: [] })}
              title={t('پیوست‌های درخواست', 'Request Attachments')} language={language} width="max-w-xl">
              <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-800/50 shrink-0">
                  <span className="text-[12px] font-bold text-indigo-800 dark:text-indigo-300">{attachModal.record?.request_code}</span>
                  {isAttachReadOnly && <Badge variant="slate" size="sm">{t('فقط خواندنی', 'Read Only')}</Badge>}
                </div>
                <div className="flex-1 overflow-hidden min-h-[300px] rounded-lg">
                  <AttachmentManager
                    files={attachModal.files}
                    onUpload={handleFileUpload}
                    onDelete={handleDeleteAttachment}
                    onDownload={(f) => window.open(f.file_url, '_blank')}
                    readOnly={isAttachReadOnly}
                    isUploading={isUploading}
                    language={language}
                    formCode={formCode}
                  />
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end rounded-b-lg">
                <Button variant="primary" size="sm" onClick={() => setAttachModal({ isOpen: false, record: null, files: [] })}>{t('بستن', 'Close')}</Button>
              </div>
            </Modal>
          ) : null;
        })()}

        {(() => { const { CommentModal } = window.DSComments || {}; return CommentModal && commentModalState.isOpen ? (
          <CommentModal
            isOpen={commentModalState.isOpen}
            onClose={() => { setCommentModalState({ isOpen: false, record: null }); fetchData(); }}
            entityType="req_requests"
            entityId={commentModalState.record ? String(commentModalState.record.id) : ''}
            entityTitle={commentModalState.record ? `${t('کد:', 'Code:')} ${commentModalState.record.request_code || '-'}  |  ${t('شرح:', 'Desc:')} ${commentModalState.record.description || '-'}` : ''}
            formTitle={t('مدیریت درخواست‌ها', 'Request Management')}
            formComponent="RequestManagement"
            language={language}
          />
        ) : null; })()}

        {(() => { const RequestSummaryModal = safeComp(window, 'RequestSummary'); return summaryModal.isOpen ? (
          <RequestSummaryModal
            isOpen={summaryModal.isOpen}
            onClose={() => setSummaryModal({ isOpen: false, record: null })}
            record={summaryModal.record}
            language={language}
            formCode={formCode}
          />
        ) : null; })()}

        <Modal
          isOpen={statusHistoryModal.isOpen}
          onClose={() => setStatusHistoryModal({ isOpen: false, record: null, rows: [], isLoading: false })}
          title={`${t('تاریخچه تغییر وضعیت درخواست', 'Request Status History')} | ${t('کد', 'Code')}: ${statusHistoryModal.record?.request_code || '-'}`}
          language={language}
          width="max-w-5xl"
        >
          <div className="p-4 h-[430px] bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg flex flex-col">
            <div className="flex-1 min-h-0">
              <DataGrid
                data={statusHistoryModal.rows}
                columns={historyColumns}
                language={language}
                formCode={formCode}
                isLoading={statusHistoryModal.isLoading}
                hideImport={true}
                hideExport={true}
                hideToolbar={true}
                selectable={false}
                actionWidth="0px"
                minVisibleRows={5}
              />
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end rounded-b-lg">
            <Button variant="primary" size="sm" onClick={() => setStatusHistoryModal({ isOpen: false, record: null, rows: [], isLoading: false })}>{t('بستن', 'Close')}</Button>
          </div>
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
      </div>
    );
  };

  window.RequestManagement = RequestManagement;
})();