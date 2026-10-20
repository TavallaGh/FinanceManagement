/* Filename: requests/RequestManagement.js */
/* Request form & items grid live in RequestDetails.js which must load first */
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
  const FilePlus       = safeIcon(LucideIcons, 'FilePlus');
  const FileText       = safeIcon(LucideIcons, 'FileText');

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
      return a || { canView: false, canCreate: false, canEdit: false, canDelete: false, raw_actions: [] };
    }, [secCtx, formCode]);
    const dataScope = useMemo(() => {
      return secCtx ? (secCtx.getDataScope(formCode) || {}) : {};
    }, [secCtx, formCode]);
    const transactionAccess = secCtx?.getActions('FIN_TRANSACTION_MAIN') || {};

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
    const [isLoading,        setIsLoading]        = useState(false);
    const [filters,          setFilters]          = useState({});
    const [gridState,        setGridState]        = useState(null);
    const [selectedIds,      setSelectedIds]      = useState([]);
    const [currentView,      setCurrentView]      = useState('list');
    const [initialStatusAction, setInitialStatusAction] = useState(null);
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
    const historyRequest = useRef(0);
    const transactionOpen = useRef(0);
    const [transactionView, setTransactionView] = useState(null);
    const [statusHistoryModal, setStatusHistoryModal] = useState({ isOpen: false, record: null, rows: [], isLoading: false });

    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
    }, []);
    const transactionActor = window.RequestAssignmentLogic.useActor(supabase, currentUserId, showToast, t);
    const today = window.RequestStatusActions.useTodayKey();

    const fetchMeta = useCallback(async () => {
      try {
        const [uRes, pRes, nRes, costRes, incRes, cbcRes] = await Promise.all([
          supabase.from('sec_users').select('id, full_name, username, party_id'),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, mobile').eq('is_active', true),
          supabase.from('fm_org_chart_nodes').select('id, title, parent_id'),
          supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
          supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
          supabase.from('fm_cost_benefit_centers').select('id, title_fa, title_en, center_kind, is_cost_center, is_benefit_center, is_active, manager:parties(id, first_name, last_name), office:fm_org_offices(id, title)'),
        ]);

        for (const result of [uRes, pRes, nRes, costRes, incRes, cbcRes]) {
          if (result.error) throw result.error;
        }
        const buildLeafs = (items) => {
          const parentIds = new Set((items || []).map(i => i.parent_id).filter(Boolean));
          return (items || []).filter(i => !parentIds.has(i.id)).map(i => ({
            ...i,
            displayLabel: isRtl ? (i.title_fa || '') : (i.title_en || i.title_fa || ''),
          }));
        };

        const uMap = {}; (uRes.data || []).forEach(u => { uMap[u.id] = u.full_name || u.username || ''; });
        setUsersMap(uMap);
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
      } catch { showToast(t('خطا در دریافت اطلاعات پایه.', 'Error loading dependencies.'), 'error'); }
    }, [supabase, isRtl, currentUserId, showToast, t]);

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
      const requestId = ++historyRequest.current;
      setStatusHistoryModal({ isOpen: true, record, rows: [], isLoading: true, error: '' });
      try {
        const { data, error, status } = await supabase
          .from('req_request_status_logs')
          .select('*')
          .eq('request_id', record.id)
          .order('changed_at', { ascending: true });
        if (requestId !== historyRequest.current) return;
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
        if (requestId !== historyRequest.current) return;
        const message = t('خطا در دریافت تاریخچه تغییر وضعیت.', 'Error loading status history.');
        showToast(message, 'error');
        setStatusHistoryModal({ isOpen: true, record, rows: [], isLoading: false, error: message });
      }
    }, [supabase, showToast, t]);

    const handleOpenForm = (mode, record = null, statusAction = null) => {
      setInitialStatusAction(statusAction);
      setFormMode(mode);
      setCurrentRecord(record || {});
      setCurrentView('form');
    };

    const handleFormSuccess = () => {
      if (initialStatusAction) setSelectedIds(ids => ids.filter(id => id !== currentRecord?.id));
      setInitialStatusAction(null);
      setCurrentView('list');
      fetchData();
    };

    const openTransaction = async (row, create = false) => {
      const sequence = ++transactionOpen.current;
      setIsLoading(true);
      try {
        const logic = window.RequestTransactionLogic;
        const request = await logic.readRequest(supabase, row.id, true);
        logic.assertScope(request, secCtx, formCode, currentUserId, t);
        if (!transactionAccess.canView || (create && !transactionAccess.canCreate)) {
          throw new Error(t('مجوز مشاهده یا ثبت تراکنش ندارید.', 'Transaction view/create access is required.'));
        }
        const existing = await logic.findTransaction(supabase, request.id);
        if (sequence !== transactionOpen.current) return;
        if (existing) {
          if (!request.transaction_id && !logic.same(existing.registrar_id, currentUserId)) {
            throw new Error(t('ثبت تراکنش توسط کاربر دیگری شروع شده است؛ پس از تکمیل، آن را مشاهده کنید.',
              'Another user has started this transaction. View it after saving is complete.'));
          }
          const record = await logic.readTransaction(supabase, existing.id);
          logic.assertScope(record, secCtx, 'FIN_TRANSACTION_MAIN', currentUserId, t);
          if (sequence !== transactionOpen.current) return;
          setTransactionView({ request, record, mode: 'EDIT' });
        } else {
          if (!create) throw new Error(t('تراکنش مرتبط یافت نشد.', 'Linked transaction was not found.'));
          logic.assertInProgress(request, t);
          await window.RequestAssignmentLogic.assertCanCreate(supabase, request, currentUserId, t);
          if (sequence !== transactionOpen.current) return;
          setTransactionView({ request, record: null, mode: 'CREATE' });
        }
        setCurrentView('transaction');
      } catch (error) {
        if (sequence === transactionOpen.current) showToast(error.message, 'error');
      } finally {
        if (sequence === transactionOpen.current) setIsLoading(false);
      }
    };

    const closeTransaction = () => {
      ++transactionOpen.current;
      setTransactionView(null);
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

    const columns = useMemo(() => {
      const paymentTypes = { CASH: t('نقد', 'Cash'), CHECK: t('چک', 'Check'), CRYPTO: t('کریپتو', 'Crypto'), BANK: t('بانک', 'Bank'), TC: 'TC' };
      const display = {
        request_code: value => value ?? '',
        status: value => { const status = getStatus(value); return isRtl ? status.fa : status.en; },
        request_type: value => getTypeLabel(value, isRtl),
        payment_type: value => value ? (paymentTypes[value] || value) : '-',
        requester_party_id: (value, row) => value
          ? (partiesMap[value] || value)
          : (row.registrar_id ? (usersMap[row.registrar_id] || '-') : '-'),
        created_at: fmtDate,
        need_date: fmtDate,
        description: value => value || '-',
      };
      return [
        {
          field: 'request_code', header_fa: 'کد درخواست', header_en: 'Request Code', width: '130px',
          render: val => <span className="font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{display.request_code(val)}</span>,
        },
        {
          field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '115px',
          render: val => <Badge variant={getStatus(val).color} size="sm">{display.status(val)}</Badge>,
        },
        {
          field: 'request_type', header_fa: 'نوع درخواست', header_en: 'Type', width: '100px',
          render: val => <span className="text-[12px] text-slate-600 dark:text-slate-400">{display.request_type(val)}</span>,
        },
        {
          field: 'payment_type', header_fa: 'نوع پرداخت', header_en: 'Payment', width: '100px',
          render: val => <span className="text-[12px] text-slate-600 dark:text-slate-400">{display.payment_type(val)}</span>,
        },
        {
          field: 'requester_party_id', header_fa: 'درخواست دهنده', header_en: 'Requester', width: '100px',
          render: (val, row) => (
            <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
              {display.requester_party_id(val, row)}
            </span>
          ),
        },
        {
          field: 'created_at', header_fa: 'تاریخ ثبت', header_en: 'Submitted', width: '100px',
          render: val => <span className="text-[12px] text-slate-500">{display.created_at(val)}</span>,
        },
        {
          field: 'need_date', header_fa: 'تاریخ نیاز', header_en: 'Need Date', width: '165px',
          render: (val, row) => <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[12px] text-slate-500 dark:text-slate-400">{display.need_date(val)}</span>
            {window.RequestStatusActions.isOverdue(row, today) && <Badge variant="red" size="sm">{t('نیاز به رسیدگی فوری', 'Urgent attention')}</Badge>}
          </div>,
        },
        {
          field: 'description', header_fa: 'شرح', header_en: 'Description', width: 'auto',
          render: val => <span className="text-[12px] text-slate-500 dark:text-slate-400 truncate block max-w-xs" title={val}>{display.description(val)}</span>,
        },
      ].map(column => ({ ...column, searchAccessor: display[column.field] }));
    }, [usersMap, partiesMap, isRtl, today]);

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

    const filteredData = useMemo(() => {
      return (requests || []).filter(r => {
        if (filteredRecordId && String(r.id) !== String(filteredRecordId)) return false;

        const hasItemFilters =
          !!filters.transaction_action ||
          !!filters.transaction_group ||
          !!filters.sub_type_id ||
          !!filters.party_id ||
          !!filters.center_id;

        if (ownDataOnly && String(r.registrar_id || '') !== String(currentUserId || '')) return false;

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
      });
    }, [requests, filteredRecordId, filters, ownDataOnly, currentUserId]);

    const bulkStatus = window.useRequestBulkStatusActions({
      records: filteredData, selectedIds, access, dataScope, currentUserId, supabase, language, t,
      currentUserName: usersMap[currentUserId] || window.NavigationSystem?.currentUser?.full_name || '',
      showToast, setSelectedIds, isLoading, onSaved: fetchData,
      onOpenSingle: (record, action) => handleOpenForm('EDIT', record, action),
    });

    const filterFields = [
      { name: 'transaction_action', label: t('نوع', 'Action'), type: 'select', options: ITEM_ACTIONS },
      { name: 'transaction_group', label: t('گروه', 'Group'), type: 'select', options: ITEM_GROUPS },
      { name: 'sub_type_id', label: t('نوع هزینه/درآمد', 'Cost/Income Type'), type: 'lov', lovData: mergedSubTypes, lovColumns: subTypeLovColumns, dropdownWidth: 'min-w-[420px]' },
      { name: 'party_id', label: t('طرف مقابل', 'Party'), type: 'lov', lovData: partiesList, lovColumns: partyLovColumns, dropdownWidth: 'min-w-[520px]' },
      { name: 'center_id', label: t('مرکز هزینه/درآمد', 'Cost/Income Center'), type: 'lov', lovData: costBenefitCenters, lovColumns: centerLovColumns, dropdownWidth: 'min-w-[580px]' },
    ];

    const viewConfig = useMemo(() => ({
      pageId: 'request_management_list',
      currentState: () => ({ filters, gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.filters) setFilters(state.filters);
          if (state.gridState) {
            const restoredFilters = { ...state.gridState.filters };
            delete restoredFilters.can_change_status;
            setGridState({ ...state.gridState, filters: restoredFilters });
          }
        }
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
                  selectable={true} selectedRowIds={selectedIds} onSelectionChange={setSelectedIds}
                  gridState={gridState} onGridStateChange={setGridState}
                  actionWidth="280px"
                  onAdd={access.canCreate ? () => handleOpenForm('CREATE') : undefined}
                  onRowDoubleClick={row => handleOpenForm('EDIT', row)}
                  actions={[
                    {
                      icon: FilePlus, tooltip: t('ثبت تراکنش', 'Create Transaction'),
                      hidden: row => !transactionAccess.canView || !transactionAccess.canCreate || row.status !== 'IN_PROGRESS' || !!row.transaction_id || !window.RequestAssignmentLogic.mayCreate(row, transactionActor),
                      onClick: row => openTransaction(row, true),
                      className: 'text-emerald-600 hover:text-emerald-700',
                    },
                    {
                      icon: FileText, tooltip: t('مشاهده تراکنش مرتبط', 'View Linked Transaction'),
                      hidden: row => !transactionAccess.canView || !row.transaction_id,
                      onClick: row => openTransaction(row),
                      className: 'text-indigo-600 hover:text-indigo-700',
                    },
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
                    ...bulkStatus.actions,
                    {
                      label: t('بروزرسانی نرخ ارز', 'Update Exchange Rates'),
                      icon: RefreshCw, variant: 'outline',
                      disabled: bulkStatus.busy,
                      onClick: ids => handleBulkUpdateRates(ids),
                      className: 'text-indigo-600 dark:text-indigo-400',
                    },
                    {
                      label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline',
                      disabled: bulkStatus.busy,
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
            initialStatusAction={initialStatusAction}
            language={language}
            formCode={formCode}
          />
        )}

        {bulkStatus.modal}

        {currentView === 'transaction' && transactionView && React.createElement(window.TransactionMainDetails, {
          key: `${transactionView.request.id}-${transactionView.record?.id || 'new'}`,
          isOpen: true, formMode: transactionView.mode, initialRecord: transactionView.record,
          sourceRequest: transactionView.mode === 'CREATE' ? transactionView.request : null,
          returnToRequests: true, language, formCode: 'FIN_TRANSACTION_MAIN',
          onClose: closeTransaction, onSuccess: closeTransaction,
        })}

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
          onClose={() => { historyRequest.current++; setStatusHistoryModal({ isOpen: false, record: null, rows: [], isLoading: false }); }}
          title={`${t('تاریخچه تغییر وضعیت درخواست', 'Request Status History')} | ${t('کد', 'Code')}: ${statusHistoryModal.record?.request_code || '-'}`}
          language={language}
          width="max-w-5xl"
        >
          <div className="p-4 h-[430px] bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg flex flex-col">
            {statusHistoryModal.error && <div role="alert" className="text-red-600 dark:text-red-400">{statusHistoryModal.error}</div>}
            <div className="flex-1 min-h-0">
              {!statusHistoryModal.error && <DataGrid
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
              />}
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end rounded-b-lg">
            <Button variant="primary" size="sm" onClick={() => { historyRequest.current++; setStatusHistoryModal({ isOpen: false, record: null, rows: [], isLoading: false }); }}>{t('بستن', 'Close')}</Button>
          </div>
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
      </div>
    );
  };

  window.RequestManagement = RequestManagement;
})();
