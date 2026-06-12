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
  const AttachmentManager = safeComp(DSForms, 'AttachmentManager');

  const DSFeedback  = window.DSFeedback || window.DSOverlays || DS;
  const Modal       = safeComp(DSFeedback, 'Modal');
  const Toast       = safeComp(DSFeedback, 'Toast');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const LucideIcons   = window.LucideIcons || {};
  const Save          = safeIcon(LucideIcons, 'Save');
  const Check         = safeIcon(LucideIcons, 'Check');
  const AlertTriangle = safeIcon(LucideIcons, 'AlertTriangle');
  const Send          = safeIcon(LucideIcons, 'Send');
  const CheckCircle   = safeIcon(LucideIcons, 'CheckCircle');
  const XCircle       = safeIcon(LucideIcons, 'XCircle');
  const RotateCcw     = safeIcon(LucideIcons, 'RotateCcw');
  const Lock          = safeIcon(LucideIcons, 'Lock');
  const PlayCircle    = safeIcon(LucideIcons, 'PlayCircle');
  const CheckSquare   = safeIcon(LucideIcons, 'CheckSquare');
  const Paperclip     = safeIcon(LucideIcons, 'Paperclip');

  // ── Shared constants ───────────────────────────────────────────────────────
  const REQUEST_TYPES = [
    { value: 'TRANSFER',   fa: 'انتقال',  en: 'Transfer'   },
    { value: 'CONVERSION', fa: 'تبدیل',   en: 'Conversion' },
    { value: 'BUDGET',     fa: 'بودجه',   en: 'Budget'     },
    { value: 'GENERAL',    fa: 'عمومی',   en: 'General'    },
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
    const [attachFiles, setAttachFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [lookups,     setLookups]     = useState({
      leafAccounts: [], allAccounts: [], costTypes: [], incomeTypes: [],
      currencies: [], usersMap: {}, usersList: [], partiesMap: {},
      nodesMap: {}, currentUserDeptId: null, currentUserDeptTitle: '',
      currentUserPartyId: null, currentUserPartyName: '',
    });

    const gridRef     = useRef(null);
    const initialized = useRef(false);

    const loadAttachments = useCallback(async (recordId) => {
      if (!supabase || !recordId) return;
      try {
        const { data } = await supabase.from('fm_attachments').select('*')
          .eq('entity_type', 'REQUEST_MANAGEMENT').eq('entity_id', String(recordId));
        setAttachFiles(data || []);
      } catch {}
    }, [supabase]);

    const isReadOnly = useMemo(
      () => formMode !== 'CREATE' && formMode !== 'COPY' && lockedStatuses.includes(header.status || ''),
      [formMode, header.status]
    );

    // ── fetch dependencies ───────────────────────────────────────────────
    const fetchDeps = useCallback(async () => {
      if (!supabase) return null;
      try {
        const [accRes, chartRes, costRes, incRes, usersRes, partiesRes, personnelRes, nodesRes, currRes] =
          await Promise.all([
            supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, chart_id').eq('is_active', true),
            supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
            supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('sec_users').select('id, full_name, username, party_id'),
            supabase.from('parties').select('id, first_name, last_name, company_name, party_type'),
            supabase.from('fm_org_chart_personnel').select('node_id, person_id'),
            supabase.from('fm_org_chart_nodes').select('id, title'),
            supabase.from('fm_currencies').select('id, code, title'),
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
        (partiesRes.data || []).forEach(p => {
          partiesMap[p.id] = p.party_type === 'legal'
            ? (p.company_name || '')
            : `${p.first_name || ''} ${p.last_name || ''}`.trim();
        });

        const nodesMap = {};
        (nodesRes.data || []).forEach(n => { nodesMap[n.id] = n.title; });

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
          currencies:   currRes.data || [],
          usersMap, usersList: usersRes.data || [], partiesMap, nodesMap,
          currentUserDeptId: myDeptId, currentUserDeptTitle: myDeptTitle,
          currentUserPartyId: myPartyId, currentUserPartyName: myPartyName,
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
            description:       '',
            status:            'DRAFT',
          });
          setItems([]);
          setAttachFiles([]);
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
            reviewer_id: null, reviewer_name: null, reviewed_at: null,
            approver_id: null, approver_name: null, approved_at: null,
          });
          const mapped = (initialRecord.req_request_items || []).map(item => ({
            ...item,
            _tempId:           crypto.randomUUID(),
            id:                undefined,
            request_id:        undefined,
            deposit_amount:    item.deposit_amount    != null ? parseFloat(item.deposit_amount)    : 0,
            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0,
            approved_amount:   0,
            remaining_amount:  0,
          })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
          setItems(mapped);
          setAttachFiles([]);
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
            deposit_amount:    item.deposit_amount    != null ? parseFloat(item.deposit_amount)    : 0,
            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0,
            approved_amount:   item.approved_amount   != null ? parseFloat(item.approved_amount)   : 0,
            remaining_amount:  item.remaining_amount  != null ? parseFloat(item.remaining_amount)  : 0,
          })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
          setItems(mapped);
          setIsDirty(false);
          setHasSaved(false);
          loadAttachments(initialRecord.id);
        }
      });
    }, [isOpen, formMode, initialRecord]);

    const updateHeader = useCallback((field, value) => {
      setHeader(p => ({ ...p, [field]: value }));
      setIsDirty(true);
    }, []);

    const handleFileUpload = useCallback(async (files) => {
      if (!files || files.length === 0) return;
      if (!header.id) {
        showToast(t('ابتدا درخواست را ذخیره کنید تا بتوانید پیوست اضافه کنید.', 'Save the request first to add attachments.'), 'warning');
        return;
      }
      const file = files[0];
      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${header.id}_${Date.now()}.${fileExt}`;
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
          entity_id:   String(header.id),
          file_name:   file.name,
          file_size:   file.size,
          file_type:   file.type || 'application/octet-stream',
          file_url:    fileUrl,
          created_by:  currentUserId,
        };
        const { error } = await supabase.from('fm_attachments').insert([payload]);
        if (error) throw error;
        showToast(t('فایل با موفقیت پیوست شد.', 'File attached successfully.'));
        loadAttachments(header.id);
      } catch {
        showToast(t('خطا در آپلود فایل.', 'Error uploading file.'), 'error');
      } finally {
        setIsUploading(false);
      }
    }, [supabase, header.id, currentUserId, showToast, t, loadAttachments]);

    const handleDeleteAttachment = useCallback(async (file) => {
      try {
        const { error } = await supabase.from('fm_attachments').delete().eq('id', file.id);
        if (error) throw error;
        showToast(t('پیوست حذف شد.', 'Attachment deleted.'));
        loadAttachments(header.id);
      } catch {
        showToast(t('خطا در حذف پیوست.', 'Error deleting attachment.'), 'error');
      }
    }, [supabase, header.id, showToast, t, loadAttachments]);

    // ── save ─────────────────────────────────────────────────────────────
    const handleSave = async (overrideStatus) => {
      const statusToSave = typeof overrideStatus === 'string' ? overrideStatus : header.status;

      if (document.getElementById('grid-inline-edit-marker'))
        return showToast(t('لطفاً ابتدا سطر باز اقلام را با Enter ذخیره کنید.', 'Please save the open items row first.'), 'warning');

      if (!header.description?.trim())
        return showToast(t('شرح درخواست الزامی است.', 'Request description is required.'), 'warning');

      setIsLoading(true);
      try {
        const now       = new Date().toISOString();
        const actorId   = currentUserId;
        const actorName = actorId ? (lookups.usersMap[actorId] || currentUserName) : currentUserName;

        const metaPayload = {};
        if (statusToSave === 'REVIEWED' && header.status !== 'REVIEWED')
          Object.assign(metaPayload, { reviewer_id: actorId, reviewed_at: now, reviewer_name: actorName });
        if (statusToSave === 'APPROVED' && header.status !== 'APPROVED')
          Object.assign(metaPayload, { approver_id: actorId, approved_at: now, approver_name: actorName });
        if (statusToSave === 'REGISTERED' && header.status === 'REJECTED')
          Object.assign(metaPayload, { reviewer_id: null, reviewed_at: null, reviewer_name: null });

        const payload = {
          request_code:       header.request_code,
          registrar_id:       header.registrar_id || currentUserId || null,
          requester_party_id: header.requester_party_id || null,
          department_id:      header.department_id || null,
          need_date:          header.need_date || null,
          request_type:       header.request_type || 'GENERAL',
          description:        header.description || '',
          status:             statusToSave,
          ...metaPayload,
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

        if (isDirty || !header.id) {
          await supabase.from('req_request_items').delete().eq('request_id', reqId);
          if (items.length > 0) {
            const parse = v => parseFloat(String(v || '0').replace(/,/g, '')) || 0;
            const itemsPayload = items.map((item, idx) => ({
              request_id:         reqId,
              row_number:         idx + 1,
              account_id:         item.account_id         || null,
              currency:           item.currency           || null,
              transaction_action: item.transaction_action || 'DEPOSIT',
              transaction_group:  item.transaction_group  || null,
              cost_type_id:       item.cost_type_id       || null,
              income_type_id:     item.income_type_id     || null,
              deposit_amount:     parse(item.deposit_amount),
              withdrawal_amount:  parse(item.withdrawal_amount),
              approved_amount:    parse(item.approved_amount),
              remaining_amount:   parse(item.remaining_amount),
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

        setHeader(p => ({
          ...p, status: statusToSave,
          ...(statusToSave === 'REVIEWED' && p.status !== 'REVIEWED' ? { reviewer_id: actorId, reviewed_at: now, reviewer_name: actorName } : {}),
          ...(statusToSave === 'APPROVED' && p.status !== 'APPROVED' ? { approver_id: actorId, approved_at: now, approver_name: actorName } : {}),
        }));
        setIsDirty(false);
        setHasSaved(true);
        showToast(typeof overrideStatus === 'string'
          ? t('وضعیت درخواست تغییر کرد.', 'Request status updated.')
          : t('درخواست با موفقیت ذخیره شد.', 'Request saved successfully.'));
      } catch (err) {
        console.error('RequestFormModal save error:', err);
        showToast(t('خطا در ذخیره درخواست.', 'Error saving request.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleClose = () => { if (hasSaved && onSuccess) onSuccess(); else onClose(); };
    if (!isOpen) return null;

    const statusInfo = getStatus(header.status || 'DRAFT');
    const cur        = header.status || 'DRAFT';
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

    // ── status transition buttons ────────────────────────────────────────
    const btnBase = 'flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 border rounded-md transition-colors';
    const statusActions = (
      <div className="flex flex-wrap items-center gap-2 pr-2" onClick={e => e.stopPropagation()}>
        {cur === 'DRAFT' && access.canEdit && (
          <button onClick={() => handleSave('REGISTERED')} className={`${btnBase} border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30`}>
            <Send size={12} /> {t('ارسال برای بررسی', 'Submit for Review')}
          </button>
        )}
        {cur === 'REGISTERED' && access.canEdit && (<>
          <button onClick={() => handleSave('DRAFT')} className={`${btnBase} border-slate-400 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800`}>
            <RotateCcw size={12} /> {t('برگشت به یادداشت', 'Back to Draft')}
          </button>
          <button onClick={() => handleSave('REVIEWED')} className={`${btnBase} border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30`}>
            <CheckSquare size={12} /> {t('بررسی شد', 'Mark Reviewed')}
          </button>
        </>)}
        {cur === 'REVIEWED' && access.canEdit && (<>
          <button onClick={() => handleSave('REGISTERED')} className={`${btnBase} border-slate-400 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800`}>
            <RotateCcw size={12} /> {t('برگشت به ثبت شده', 'Back to Registered')}
          </button>
          <button onClick={() => handleSave('REJECTED')} className={`${btnBase} border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30`}>
            <XCircle size={12} /> {t('رد درخواست', 'Reject')}
          </button>
          <button onClick={() => handleSave('APPROVED')} className={`${btnBase} border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30`}>
            <CheckCircle size={12} /> {t('تایید درخواست', 'Approve')}
          </button>
        </>)}
        {cur === 'APPROVED' && access.canEdit && (
          <button onClick={() => handleSave('IN_PROGRESS')} className={`${btnBase} border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30`}>
            <PlayCircle size={12} /> {t('شروع انجام', 'Start Processing')}
          </button>
        )}
        {cur === 'IN_PROGRESS' && access.canEdit && (
          <button onClick={() => handleSave('DONE')} className={`${btnBase} border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30`}>
            <Check size={12} /> {t('اتمام انجام', 'Mark Done')}
          </button>
        )}
        {cur === 'REJECTED' && access.canEdit && (
          <button onClick={() => handleSave('DRAFT')} className={`${btnBase} border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30`}>
            <RotateCcw size={12} /> {t('بازنگری مجدد', 'Revise & Resubmit')}
          </button>
        )}
        {['REJECTED', 'DONE', 'APPROVED'].includes(cur) && access.canEdit && (
          <button onClick={() => handleSave('CLOSED')} className={`${btnBase} border-slate-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800`}>
            <Lock size={12} /> {t('بستن درخواست', 'Close Request')}
          </button>
        )}
        {cur === 'CLOSED' && (
          <Badge variant="gray" size="sm">{t('بسته شده - غیرقابل تغییر', 'Closed - Locked')}</Badge>
        )}
      </div>
    );

    const headerCardTitle = (
      <div className="flex items-center gap-3 w-full">
        <span>{t('اطلاعات سربرگ', 'Request Header')}</span>
        <Badge variant={statusInfo.color} className="shadow-none text-[10px]">
          {isRtl ? statusInfo.fa : statusInfo.en}
        </Badge>
      </div>
    );

    return (
      <Modal isOpen={isOpen} onClose={handleClose}
        title={
          formMode === 'CREATE' ? t('ثبت درخواست جدید', 'New Request') :
          formMode === 'COPY'   ? t('کپی درخواست', 'Copy Request') :
          t('مشاهده / ویرایش درخواست', 'View / Edit Request')
        }
        language={language} width="max-w-6xl">
        <div className="flex flex-col bg-slate-50/50 dark:bg-slate-900/50 h-[85vh] text-[12px] relative">
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex flex-col gap-4 pb-20">

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
                    isRtl={isRtl} calendarMode={calendarMode} disabled={isReadOnly} />
                </div>

                <div className="relative z-[80]">
                  <SelectField size="sm" label={t('نوع درخواست', 'Request Type')}
                    value={header.request_type || 'GENERAL'}
                    onChange={e => updateHeader('request_type', e.target.value)}
                    options={REQUEST_TYPES.map(r => ({ value: r.value, label: isRtl ? r.fa : r.en }))}
                    isRtl={isRtl} disabled={isReadOnly || hasItems} required />
                  {hasItems && !isReadOnly && (
                    <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {t('در صورت وجود اقلام، نوع درخواست قابل تغییر نیست.', 'Request Type is locked when items exist.')}
                    </p>
                  )}
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
                    isRtl={isRtl} disabled={isReadOnly} required />
                </div>
              </div>
            </Card>

            <Card title={t('اقلام درخواست', 'Request Items')}
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
                  isReadOnly={isReadOnly}
                  language={language}
                  showToast={showToast}
                  formCode={formCode}
                />
              </div>
            </Card>

            <Card
              title={
                <div className="flex items-center gap-2">
                  <Paperclip size={14} />
                  <span>{t('پیوست‌ها', 'Attachments')}</span>
                  {attachFiles.length > 0 && (
                    <Badge variant="indigo" className="!py-0 !px-1.5 text-[10px]">{attachFiles.length}</Badge>
                  )}
                </div>
              }
              isCollapsible={true} noPadding={true} defaultCollapsed={true}
              className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
              headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
              language={language}>
              <div className="p-3 bg-white dark:bg-slate-800 min-h-[200px]">
                {!header.id ? (
                  <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-[12px] py-6">
                    <AlertTriangle size={14} />
                    {t('ابتدا درخواست را ذخیره کنید تا بتوانید پیوست اضافه کنید.', 'Save the request first to add attachments.')}
                  </div>
                ) : (
                  <AttachmentManager
                    files={attachFiles}
                    onUpload={handleFileUpload}
                    onDelete={handleDeleteAttachment}
                    onDownload={(f) => window.open(f.file_url, '_blank')}
                    readOnly={isReadOnly}
                    isUploading={isUploading}
                    language={language}
                    formCode={formCode}
                  />
                )}
              </div>
            </Card>

          </div>

          <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-50">
            <Button variant="outline" size="sm" onClick={handleClose}>{t('بستن', 'Close')}</Button>
            {!isReadOnly && access.canEdit && (
              <Button variant="primary" size="sm" icon={Save}
                onClick={() => handleSave()} isLoading={isLoading} disabled={!isDirty}>
                {t('ذخیره', 'Save')}
              </Button>
            )}
          </div>
        </div>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
      </Modal>
    );
  };

  window.RequestFormModal = RequestFormModal;
})();