/* Filename: general/ProjectManagement.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  // ── Design System ──────────────────────────────────────────────────────────
  const DS         = window.DesignSystem || {};
  const DSCore     = window.DSCore     || DS;
  const DSForms    = window.DSForms    || DS;
  const DSGrid     = window.DSGrid     || DS;
  const DSFeedback = window.DSFeedback || DS;

  const FallbackComponent = () => null;
  const safeComp = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    return FallbackComponent;
  };

  const Button         = safeComp(DSCore,     'Button');
  const PageHeader     = safeComp(DSCore,     'PageHeader');
  const EmptyState     = safeComp(DSCore,     'EmptyState');
  const Badge          = safeComp(DSCore,     'Badge');
  const AdvancedFilter = safeComp(DSCore,     'AdvancedFilter') !== FallbackComponent
                          ? safeComp(DSCore,  'AdvancedFilter')
                          : safeComp(DSGrid,  'AdvancedFilter');
  const Modal          = safeComp(DSFeedback, 'Modal') !== FallbackComponent
                          ? safeComp(DSFeedback, 'Modal')
                          : safeComp(DSCore,     'Modal');
  const Toast          = safeComp(DSFeedback, 'Toast');

  const DataGrid  = safeComp(DSGrid, 'DataGrid');
  const LOVField  = safeComp(DSGrid, 'LOVField');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const safeIcon = (name) => {
    const c = LucideIcons[name];
    return (typeof c === 'function' || (c && c.$$typeof)) ? c : FallbackIcon;
  };

  const FolderOpen    = safeIcon('FolderOpen');
  const Edit          = safeIcon('Edit');
  const Trash2        = safeIcon('Trash2');
  const Save          = safeIcon('Save');
  const Plus          = safeIcon('Plus');
  const Users         = safeIcon('Users');
  const AlertTriangle = safeIcon('AlertTriangle');

  const supabase = window.supabase;

  // ── Project status options ─────────────────────────────────────────────────
  const PROJECT_STATUSES = [
    { value: 'PLANNING',    fa: 'در دست برنامه‌ریزی', en: 'Planning',    variant: 'slate'   },
    { value: 'IN_PROGRESS', fa: 'در حال اجرا',         en: 'In Progress', variant: 'indigo'  },
    { value: 'ON_HOLD',     fa: 'متوقف',               en: 'On Hold',     variant: 'amber'   },
    { value: 'COMPLETED',   fa: 'تکمیل شده',           en: 'Completed',   variant: 'emerald' },
    { value: 'CANCELLED',   fa: 'لغو شده',             en: 'Cancelled',   variant: 'red'     },
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // ProjectManagement
  // ════════════════════════════════════════════════════════════════════════════
  const ProjectManagement = ({ language = 'fa', formCode = 'PROJECT_MGMT' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const { useCalendarMode: _useCalendarMode, formatGlobalDate: _formatGlobalDate } = window.DSCore || {};
    const calendarMode = _useCalendarMode ? _useCalendarMode() : (window.DSCore?.getGlobalCalendarMode?.() || 'jalali');

    // ── State ──────────────────────────────────────────────────────────────
    const [data, setData]             = useState([]);
    const [allParties, setAllParties] = useState([]);
    const [isLoading, setIsLoading]   = useState(false);
    const [filters, setFilters]       = useState({});
    const [gridState, setGridState]   = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    // main modal – state only (logic lives in ProjectDefinition)
    const [modalState, setModalState] = useState({ isOpen: false, record: null });

    // bulk status modal
    const [bulkStatusModal, setBulkStatusModal] = useState({ isOpen: false, ids: [] });
    const [bulkStatusValue, setBulkStatusValue] = useState('IN_PROGRESS');

    // delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    // quick party modal (shared for manager / supervisor)
    // (moved to ProjectDefinition.js)

    // personnel modal (state only – logic lives in ProjectResources)
    const [personnelModal, setPersonnelModal] = useState({ isOpen: false, project: null });

    // all project-personnel assignments (project_id, party_id) – for advanced filter
    const [allProjectPersonnel, setAllProjectPersonnel] = useState([]);

    // ── Derived: employees only ────────────────────────────────────────────
    const employeeParties = useMemo(() =>
      allParties
        .filter(p => Array.isArray(p.roles) && p.roles.includes('employee') && p.is_active !== false)
        .map(p => ({
          id: p.id, value: p.id,
          code: p.code || '',
          title: p.party_type === 'legal'
            ? (p.company_name || '')
            : `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          label: p.party_type === 'legal'
            ? (p.company_name || '')
            : `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          mobile: p.mobile || ''
        })),
    [allParties]);

    // ── Helpers ────────────────────────────────────────────────────────────
    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3500);
    }, []);

    const getPartyName = useCallback((partyId) => {
      if (!partyId) return '-';
      const p = allParties.find(x => x.id === partyId);
      if (!p) return '-';
      return p.party_type === 'legal'
        ? (p.company_name || '-')
        : `${p.first_name || ''} ${p.last_name || ''}`.trim() || '-';
    }, [allParties]);

    // Always English numerals; calendar follows system setting
    const fmtDate = useCallback((v) => {
      if (!v) return '-';
      if (_formatGlobalDate) return _formatGlobalDate(v, calendarMode);
      try {
        return new Date(v).toLocaleDateString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          calendar: calendarMode === 'jalali' ? 'persian' : 'gregory'
        });
      } catch { return v; }
    }, [calendarMode, _formatGlobalDate]);

    const getStatusInfo = (value) =>
      PROJECT_STATUSES.find(s => s.value === value) || PROJECT_STATUSES[0];

    const isLockedProject = (row) =>
      row?.status === 'COMPLETED' || row?.status === 'CANCELLED';

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
        const [
          { data: projects, error: pErr },
          { data: parties,  error: ptErr }
        ] = await Promise.all([
          supabase.from('gen_projects').select('*').order('created_at', { ascending: false }),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, roles, mobile, is_active')
        ]);
        if (pErr)  throw pErr;
        if (ptErr) throw ptErr;
        setData(projects || []);
        setAllParties(parties || []);

        // lightweight personnel assignments for the advanced filter
        const { data: ppData } = await supabase
          .from('gen_project_personnel')
          .select('project_id, party_id');
        setAllProjectPersonnel(ppData || []);
      } catch (err) {
        console.error('Fetch error:', err);
        showToast(t('خطا در دریافت اطلاعات', 'Error fetching data'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => { fetchData(); }, []);

    // ── Open modal – delegates all logic to ProjectDefinition ──────────────
    const handleOpenModal = (record = null) => setModalState({ isOpen: true, record });

    // ── Toggle active ──────────────────────────────────────────────────────
    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase.from('gen_projects')
          .update({ is_active: newValue }).eq('id', row.id);
        if (error) throw error;
        setData(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (err) {
        console.error('Toggle error:', err);
        showToast(t('خطا در تغییر وضعیت', 'Error updating status'), 'error');
      }
    };

    // ── Delete ─────────────────────────────────────────────────────────────
    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const { error } = await supabase.from('gen_projects').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
        } else if (deleteConfirm.type === 'bulk') {
          const { error } = await supabase.from('gen_projects').delete().in('id', deleteConfirm.data);
          if (error) throw error;
        }
        setSelectedIds([]);
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        showToast(t('حذف با موفقیت انجام شد', 'Deletion successful'));
        fetchData();
      } catch (err) {
        console.error('Delete error:', err);
        showToast(t('خطا در حذف', 'Error deleting'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    // ── Bulk: activate ─────────────────────────────────────────────────
    const handleBulkActivate = async (ids) => {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('gen_projects').update({ is_active: true }).in('id', ids);
        if (error) throw error;
        setData(prev => prev.map(item => ids.includes(item.id) ? { ...item, is_active: true } : item));
        setSelectedIds([]);
        showToast(t('پروژه‌های انتخابی فعال شدند', 'Selected projects activated'));
      } catch (err) {
        showToast(t('خطا در فعال‌سازی', 'Error activating'), 'error');
      } finally { setIsLoading(false); }
    };

    // ── Bulk: change status ───────────────────────────────────────────
    const executeBulkStatusChange = async (statusToSet) => {
      const targetStatus = statusToSet || bulkStatusValue;
      setIsLoading(true);
      try {
        const { error } = await supabase.from('gen_projects')
          .update({ status: targetStatus }).in('id', bulkStatusModal.ids);
        if (error) throw error;
        setData(prev => prev.map(item =>
          bulkStatusModal.ids.includes(item.id) ? { ...item, status: targetStatus } : item
        ));
        setSelectedIds([]);
        setBulkStatusModal({ isOpen: false, ids: [] });
        showToast(t('وضعیت پروژه‌های انتخابی بروزرسانی شد', 'Status updated for selected projects'));
      } catch (err) {
        showToast(t('خطا در تغییر وضعیت', 'Error changing status'), 'error');
      } finally { setIsLoading(false); }
    };

    // ── Personnel Modal ────────────────────────────────────────────────────
    const openPersonnelModal = (project) => setPersonnelModal({ isOpen: true, project });

    // ── Main grid columns ─────────────────────────────────────────────────
    const columns = [
      {
        field: 'code', header_fa: 'کد پروژه', header_en: 'Code', width: '120px',
        render: val => <span className="font-sans font-bold text-slate-700 dark:text-slate-300" dir="ltr">{val}</span>
      },
      {
        field: 'title', header_fa: 'عنوان پروژه', header_en: 'Title', width: '200px',
        render: val => <span className="font-bold text-slate-700 dark:text-slate-200">{val}</span>
      },
      {
        field: 'status', header_fa: 'وضعیت پروژه', header_en: 'Project Status', width: '140px',
        render: val => {
          const s = getStatusInfo(val);
          return <Badge variant={s.variant} size="sm">{isRtl ? s.fa : s.en}</Badge>;
        }
      },
      {
        field: 'manager_party_id', header_fa: 'مدیر پروژه', header_en: 'Manager', width: '150px',
        render: val => <span>{getPartyName(val)}</span>
      },
      {
        field: 'supervisor_party_id', header_fa: 'ناظر پروژه', header_en: 'Supervisor', width: '150px',
        render: val => <span>{getPartyName(val)}</span>
      },
      {
        field: 'start_date', header_fa: 'تاریخ شروع', header_en: 'Start Date', width: '110px',
        render: val => <span className="text-[12px]" dir="ltr">{fmtDate(val)}</span>
      },
      {
        field: 'estimated_days', header_fa: 'مدت (روز)', header_en: 'Duration', width: '90px',
        render: val => <span className="font-sans text-[13px]" dir="ltr">{val ?? '-'}</span>
      },
      {
        field: 'estimated_end_date', header_fa: 'پایان تخمینی', header_en: 'Est. End', width: '110px',
        render: val => <span className="text-[12px]" dir="ltr">{fmtDate(val)}</span>
      },
      {
        field: 'actual_end_date', header_fa: 'پایان واقعی', header_en: 'Actual End', width: '110px',
        render: val => val
          ? <span className="text-[12px] text-emerald-600 dark:text-emerald-400" dir="ltr">{fmtDate(val)}</span>
          : <span className="text-slate-400">-</span>
      },
      {
        field: 'is_active', header_fa: 'فعال', header_en: 'Active', width: '80px',
        type: 'toggle', onToggle: (row, val) => handleToggleActive(row, val)
      }
    ];

    // ── Filtered data ──────────────────────────────────────────────────────
    const filteredData = useMemo(() => {
      let result = [...data];
      if (filters.title)
        result = result.filter(p => p.title?.includes(filters.title));
      if (filters.manager?.id)
        result = result.filter(p => p.manager_party_id === filters.manager.id);
      if (filters.status)
        result = result.filter(p => p.status === filters.status);
      if (filters.isActive)
        result = result.filter(p => p.is_active === (filters.isActive === 'active'));
      if (filters.personnel?.id)
        result = result.filter(p =>
          allProjectPersonnel.some(pp => pp.project_id === p.id && pp.party_id === filters.personnel.id)
        );
      return result;
    }, [data, filters, allProjectPersonnel]);

    // ── Filter fields ──────────────────────────────────────────────────────
    const filterFields = [
      { name: 'title', label: t('عنوان پروژه', 'Project Title'), type: 'text' },
      {
        name: 'manager', label: t('مدیر پروژه', 'Project Manager'), type: 'lov',
        lovData: employeeParties.map(p => ({ ...p, label: `${p.title} (${p.code})` })),
        lovColumns: [
          { field: 'code',   header_fa: 'کد',    header_en: 'Code',   width: '100px' },
          { field: 'title',  header_fa: 'نام',    header_en: 'Name',   width: '200px' },
          { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '130px' }
        ],
        dropdownWidth: 'min-w-[450px]'
      },
      {
        name: 'personnel', label: t('پرسنل مرتبط', 'Related Personnel'), type: 'lov',
        lovData: employeeParties.map(p => ({ ...p, label: `${p.title} (${p.code})` })),
        lovColumns: [
          { field: 'code',   header_fa: 'کد',    header_en: 'Code',   width: '100px' },
          { field: 'title',  header_fa: 'نام',    header_en: 'Name',   width: '200px' },
          { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '130px' }
        ],
        dropdownWidth: 'min-w-[450px]'
      },
      {
        name: 'status', label: t('وضعیت پروژه', 'Project Status'), type: 'select',
        options: PROJECT_STATUSES.map(s => ({ value: s.value, label: isRtl ? s.fa : s.en }))
      },
      {
        name: 'isActive', label: t('فعال', 'Active'), type: 'select',
        options: [
          { value: 'active',   label: t('فعال',    'Active')   },
          { value: 'inactive', label: t('غیرفعال', 'Inactive') }
        ]
      }
    ];

    // ── viewConfig ─────────────────────────────────────────────────────────
    const viewConfig = {
      pageId: 'project_management_main',
      currentState: () => ({ filters, gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.filters)   setFilters(state.filters);
          if (state.gridState) setGridState(state.gridState);
        } else {
          setFilters({}); setGridState(null);
        }
      }
    };


    // ── Render ─────────────────────────────────────────────────────────────
    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مدیریت پروژه‌ها', 'Project Management')}
          icon={FolderOpen}
          description={t('تعریف و مدیریت پروژه‌های سازمان', 'Define and manage organization projects')}
          language={language}
          breadcrumbs={[
            { label: t('اطلاعات پایه', 'General') },
            { label: t('پروژه‌ها',     'Projects') }
          ]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-2 animate-in fade-in duration-300">
          <AdvancedFilter
            fields={filterFields}
            initialValues={filters}
            onFilter={setFilters}
            onClear={() => setFilters({})}
            language={language}
          />

          <div className="flex-1 min-h-0 mt-1">
            <DataGrid
              data={filteredData}
              columns={columns}
              language={language}
              selectable={true}
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              isLoading={isLoading}
              onAdd={() => handleOpenModal()}
              onRowDoubleClick={(row) => handleOpenModal(row)}
              gridState={gridState}
              onGridStateChange={setGridState}
              hideImport={true}
              onToggle={(row, field, val) => { if (field === 'is_active' && !isLockedProject(row)) handleToggleActive(row, val); }}
              actions={[
                {
                  icon: Edit, tooltip: t('ویرایش', 'Edit'),
                  onClick: (row) => handleOpenModal(row),
                  className: 'text-slate-400 hover:text-indigo-600'
                },
                {
                  icon: Users, tooltip: t('پرسنل مرتبط', 'Related Personnel'),
                  onClick: (row) => openPersonnelModal(row),
                  className: (row) => allProjectPersonnel.some(pp => pp.project_id === row.id)
                    ? 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300'
                    : 'text-slate-400 hover:text-teal-600'
                },
                {
                  icon: Trash2, tooltip: t('حذف', 'Delete'),
                  hidden: (row) => isLockedProject(row),
                  onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }),
                  className: 'text-slate-400 hover:text-red-600'
                }
              ]}
              bulkActions={[
                {
                  label: t('تغییر وضعیت گروهی', 'Change Status'),
                  icon: Edit, variant: 'outline',
                  onClick: (ids) => { setBulkStatusValue('IN_PROGRESS'); setBulkStatusModal({ isOpen: true, ids }); }
                },
                {
                  label: t('فعال‌سازی گروهی', 'Activate Selected'),
                  icon: Users, variant: 'outline',
                  onClick: (ids) => handleBulkActivate(ids)
                },
                {
                  label: t('حذف گروهی', 'Delete Selected'),
                  icon: Trash2, variant: 'danger-outline',
                  onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids })
                }
              ]}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            Project Definition Modal (new / edit) – ProjectDefinition.js
        ══════════════════════════════════════════════════════════════════ */}
        {window.ProjectDefinition && React.createElement(window.ProjectDefinition, {
          isOpen:            modalState.isOpen,
          onClose:           () => setModalState({ isOpen: false, record: null }),
          initialRecord:     modalState.record,
          allParties:        allParties,
          onProjectUpdated:  fetchData,
          language:          language
        })}

        {/* ══════════════════════════════════════════════════════════════════
            Personnel Modal – rendered by ProjectResources component
        ══════════════════════════════════════════════════════════════════ */}
        {window.ProjectResources && (
          React.createElement(window.ProjectResources, {
            project:    personnelModal.project,
            isOpen:     personnelModal.isOpen,
            onClose:    () => setPersonnelModal({ isOpen: false, project: null }),
            allParties: allParties,
            showToast:  showToast,
            isReadOnly: personnelModal.project ? isLockedProject(personnelModal.project) : false,
            language:   language
          })
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Bulk Status Change Modal
        ══════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={bulkStatusModal.isOpen}
          onClose={() => setBulkStatusModal({ isOpen: false, ids: [] })}
          title={t('تغییر وضعیت گروهی پروژه‌ها', 'Bulk Status Change')}
          language={language} width="max-w-md"
        >
          <div className="p-4 flex flex-col gap-4">
            <p className="text-[12px] text-slate-600 dark:text-slate-400">
              {t(`تغییر وضعیت ${bulkStatusModal.ids.length} پروژه انتخاب شده به:`,
                 `Set ${bulkStatusModal.ids.length} selected project(s) to:`)}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {PROJECT_STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => executeBulkStatusChange(s.value)}
                  disabled={isLoading}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 text-[13px] font-bold transition-all
                    ${bulkStatusValue === s.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                >
                  <Badge variant={s.variant} size="sm">{isRtl ? s.fa : s.en}</Badge>
                  <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400">
                    {isRtl ? s.en : s.fa}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setBulkStatusModal({ isOpen: false, ids: [] })}>
                {t('انصراف', 'Cancel')}
              </Button>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
          title={t('تایید عملیات حذف', 'Confirm Deletion')}
          language={language}
          width="max-w-sm"
        >
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk'
              ? t(`آیا از حذف ${deleteConfirm.data?.length} پروژه اطمینان دارید؟`,
                  `Delete ${deleteConfirm.data?.length} selected projects?`)
              : t(`آیا از حذف پروژه "${deleteConfirm.data?.title}" اطمینان دارید؟`,
                  `Delete project "${deleteConfirm.data?.title}"?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button
                  variant="outline" size="sm" className="flex-1"
                  onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
                >
                  {t('انصراف', 'Cancel')}
                </Button>
                <Button
                  variant="danger" size="sm" className="flex-1"
                  onClick={executeDelete} isLoading={isLoading}
                >
                  {t('تایید حذف', 'Confirm Delete')}
                </Button>
              </div>
            }
          />
        </Modal>

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))}
        />
      </div>
    );
  };

  window.ProjectManagement = ProjectManagement;
})();
