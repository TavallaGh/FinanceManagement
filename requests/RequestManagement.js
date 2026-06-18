/* Filename: requests/RequestManagement.js */
/* Modal & items grid live in RequestDetails.js which must load first */
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

    const [requests,    setRequests]    = useState([]);
    const [usersMap,    setUsersMap]    = useState({});
    const [deptsMap,    setDeptsMap]    = useState({});
    const [partiesMap,  setPartiesMap]  = useState({});
    const [isLoading,   setIsLoading]   = useState(false);
    const [filters,     setFilters]     = useState({});
    const [gridState,   setGridState]   = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [formModal,        setFormModal]        = useState({ isOpen: false, mode: 'CREATE', record: null });
    const [deleteConfirm,    setDeleteConfirm]    = useState({ isOpen: false, type: null, data: null });
    const [commentModalState, setCommentModalState] = useState({ isOpen: false, record: null });
    const [commentedIds,     setCommentedIds]     = useState(new Set());
    const [attachmentCounts, setAttachmentCounts] = useState({});
    const [attachModal,      setAttachModal]      = useState({ isOpen: false, record: null, files: [] });
    const [isUploading,      setIsUploading]      = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
    }, []);

    const fetchMeta = useCallback(async () => {
      try {
        const [uRes, pRes, nRes] = await Promise.all([
          supabase.from('sec_users').select('id, full_name, username'),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type'),
          supabase.from('fm_org_chart_nodes').select('id, title'),
        ]);
        const uMap = {}; (uRes.data || []).forEach(u => { uMap[u.id] = u.full_name || u.username || ''; });
        setUsersMap(uMap);
        const pMap = {}; (pRes.data || []).forEach(p => {
          pMap[p.id] = p.party_type === 'legal' ? (p.company_name || '') : `${p.first_name || ''} ${p.last_name || ''}`.trim();
        });
        setPartiesMap(pMap);
        const dMap = {}; (nRes.data || []).forEach(n => { dMap[n.id] = n.title; });
        setDeptsMap(dMap);
      } catch {}
    }, [supabase]);

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
        field: 'request_type', header_fa: 'نوع درخواست', header_en: 'Type', width: '105px',
        render: val => <span className="text-[11px] text-slate-600 dark:text-slate-400">{getTypeLabel(val, isRtl)}</span>,
      },
      {
        field: 'requester_party_id', header_fa: 'درخواست دهنده', header_en: 'Requester', width: '160px',
        render: (val, row) => (
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
            {val ? (partiesMap[val] || val) : (row.registrar_id ? (usersMap[row.registrar_id] || '-') : '-')}
          </span>
        ),
      },
      {
        field: 'department_id', header_fa: 'دپارتمان', header_en: 'Department', width: '130px',
        render: val => <span className="text-[11px] text-slate-500 dark:text-slate-400">{val ? (deptsMap[val] || val) : '-'}</span>,
      },
      {
        field: 'created_at', header_fa: 'تاریخ ثبت', header_en: 'Submitted', width: '100px',
        render: val => <span className="text-[11px] text-slate-500">{fmtDate(val)}</span>,
      },
      {
        field: 'need_date', header_fa: 'تاریخ نیاز', header_en: 'Need Date', width: '100px',
        render: val => <span className="text-[11px] text-slate-500">{val ? fmtDate(val) : '-'}</span>,
      },
      {
        field: 'description', header_fa: 'شرح', header_en: 'Description', width: 'auto',
        render: val => <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block max-w-xs" title={val}>{val || '-'}</span>,
      },
    ], [usersMap, partiesMap, deptsMap, isRtl]);

    const filteredData = useMemo(() => requests.filter(r => {
      if (filters.status       && r.status       !== filters.status)       return false;
      if (filters.request_type && r.request_type !== filters.request_type) return false;
      if (filters.my_requests  && String(r.registrar_id) !== String(currentUserId)) return false;
      return true;
    }), [requests, filters, currentUserId]);

    const filterFields = [
      { name: 'status',       label: t('وضعیت', 'Status'),           type: 'select', options: STATUS_LIST.map(s => ({ value: s.value, label: isRtl ? s.fa : s.en })) },
      { name: 'request_type', label: t('نوع درخواست', 'Request Type'), type: 'select', options: REQUEST_TYPES.map(r => ({ value: r.value, label: isRtl ? r.fa : r.en })) },
      { name: 'my_requests',  label: t('درخواست‌های من', 'My Requests'), type: 'toggle' },
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
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مدیریت درخواست‌ها', 'Request Management')}
          icon={ClipboardList}
          description={t('ثبت، پیگیری و مدیریت درخواست‌های سازمانی', 'Manage and track organizational requests')}
          language={language}
          breadcrumbs={[{ label: t('گردش کار', 'Workflow') }, { label: t('درخواست‌ها', 'Requests') }]}
          viewConfig={viewConfig}
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
              actionWidth="180px"
              onAdd={access.canCreate ? () => setFormModal({ isOpen: true, mode: 'CREATE', record: null }) : undefined}
              onRowDoubleClick={row => setFormModal({ isOpen: true, mode: 'EDIT', record: row })}
              actions={[
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
                  onClick: row => setFormModal({ isOpen: true, mode: 'COPY', record: row }),
                  requiredAccess: 'create',
                  className: 'text-emerald-600 hover:text-emerald-700',
                },
                {
                  icon: Edit, tooltip: t('مشاهده / ویرایش', 'View / Edit'),
                  onClick: row => setFormModal({ isOpen: true, mode: 'EDIT', record: row }),
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
              bulkActions={[{
                label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline',
                onClick: ids => {
                  const ok = requests.filter(r => ids.includes(r.id) && isDeletable(r)).map(r => r.id);
                  if (!ok.length) { showToast(t('هیچ‌کدام قابل حذف نیستند.', 'None can be deleted.'), 'warning'); return; }
                  setDeleteConfirm({ isOpen: true, type: 'bulk', data: ok });
                },
              }]}
            />
          </div>
        </div>

        {formModal.isOpen && (
          <RequestFormModal
            isOpen={formModal.isOpen}
            onClose={() => setFormModal({ isOpen: false, mode: 'CREATE', record: null })}
            onSuccess={() => { setFormModal({ isOpen: false, mode: 'CREATE', record: null }); fetchData(); }}
            formMode={formModal.mode}
            initialRecord={formModal.record}
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

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
      </div>
    );
  };

  window.RequestManagement = RequestManagement;
})();