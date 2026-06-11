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

  const LucideIcons    = window.LucideIcons || {};
  const ClipboardList  = safeIcon(LucideIcons, 'ClipboardList');
  const Edit           = safeIcon(LucideIcons, 'Edit');
  const Trash2         = safeIcon(LucideIcons, 'Trash2');
  const AlertTriangle  = safeIcon(LucideIcons, 'AlertTriangle');
  const MessageSquare  = safeIcon(LucideIcons, 'MessageSquare');
  const Copy           = safeIcon(LucideIcons, 'Copy');

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

        // fetch which requests have at least one comment
        if (visible.length > 0) {
          const reqIds = visible.map(r => String(r.id));
          const { data: commentRows } = await supabase
            .from('sys_comments')
            .select('entity_id')
            .eq('entity_type', 'REQUEST_MANAGEMENT')
            .in('entity_id', reqIds);
          if (commentRows) setCommentedIds(new Set(commentRows.map(c => c.entity_id)));
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
              onAdd={access.canCreate ? () => setFormModal({ isOpen: true, mode: 'CREATE', record: null }) : undefined}
              onRowDoubleClick={row => setFormModal({ isOpen: true, mode: 'EDIT', record: row })}
              actions={[
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

        {(() => { const { CommentModal } = window.DSComments || {}; return CommentModal && commentModalState.isOpen ? (
          <CommentModal
            isOpen={commentModalState.isOpen}
            onClose={() => { setCommentModalState({ isOpen: false, record: null }); fetchData(); }}
            entityType="REQUEST_MANAGEMENT"
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