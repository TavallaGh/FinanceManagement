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

  const TextField      = safeComp(DSForms, 'TextField');
  const TextAreaField  = safeComp(DSForms, 'TextAreaField');
  const SelectField    = safeComp(DSForms, 'SelectField');
  const ToggleField    = safeComp(DSForms, 'ToggleField');
  const CheckboxField  = safeComp(DSForms, 'CheckboxField');
  const DatePicker     = safeComp(DSForms, 'DatePicker');

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

    // main modal
    const [isModalOpen, setIsModalOpen]   = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [isSaving, setIsSaving]         = useState(false);
    const [formData, setFormData] = useState({
      code: '', title: '', status: 'PLANNING',
      manager_party_id: '', supervisor_party_id: '',
      start_date: '', estimated_days: '', estimated_end_date: '',
      actual_end_date: '', is_active: true, description: ''
    });

    // bulk status modal
    const [bulkStatusModal, setBulkStatusModal] = useState({ isOpen: false, ids: [] });
    const [bulkStatusValue, setBulkStatusValue] = useState('IN_PROGRESS');

    // delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    // quick party modal (shared for manager / supervisor)
    const [quickPartyTarget, setQuickPartyTarget] = useState(null); // 'manager' | 'supervisor'
    const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);
    const [isSavingParty, setIsSavingParty] = useState(false);
    const [quickPartyData, setQuickPartyData] = useState({
      code: '', firstName: '', lastName: '', latinTitle: '',
      nationalId: '', mobile: '', email: '', roles: ['employee']
    });

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

    const calcEstimatedEnd = (startDate, days) => {
      if (!startDate || days === '' || days === null || isNaN(parseInt(days))) return '';
      try {
        const d = new Date(startDate);
        d.setDate(d.getDate() + parseInt(days));
        return d.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

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

    // ── Open main modal ────────────────────────────────────────────────────
    const handleOpenModal = async (record = null) => {
      setCurrentRecord(record);
      if (record) {
        setFormData({
          code:                record.code                || '',
          title:               record.title               || '',
          status:              record.status              || 'PLANNING',
          manager_party_id:    record.manager_party_id    || '',
          supervisor_party_id: record.supervisor_party_id || '',
          start_date:          record.start_date          || '',
          estimated_days:      record.estimated_days      ?? '',
          estimated_end_date:  record.estimated_end_date  || '',
          actual_end_date:     record.actual_end_date     || '',
          is_active:           record.is_active           ?? true,
          description:         record.description         || ''
        });
      } else {
        let nextCode = '';
        try { nextCode = await window.AutoNumberingService.previewNext('PROJECT'); } catch {}
        setFormData({
          code: nextCode, title: '', status: 'PLANNING',
          manager_party_id: '', supervisor_party_id: '',
          start_date: '', estimated_days: '', estimated_end_date: '',
          actual_end_date: '', is_active: true, description: ''
        });
      }
      setIsModalOpen(true);
    };

    // ── Save project ───────────────────────────────────────────────────────
    const handleSave = async () => {
      if (!formData.title.trim()) {
        showToast(t('عنوان پروژه الزامی است', 'Project title is required'), 'error');
        return;
      }
      setIsSaving(true);
      try {
        const estEnd = calcEstimatedEnd(formData.start_date, formData.estimated_days);
        const payload = {
          code:                formData.code,
          title:               formData.title.trim(),
          status:              formData.status              || 'PLANNING',
          manager_party_id:    formData.manager_party_id    || null,
          supervisor_party_id: formData.supervisor_party_id || null,
          start_date:          formData.start_date          || null,
          estimated_days:      formData.estimated_days !== '' ? parseInt(formData.estimated_days) : null,
          estimated_end_date:  estEnd                        || null,
          actual_end_date:     formData.actual_end_date      || null,
          is_active:           formData.is_active,
          description:         formData.description          || null,
          updated_at:          new Date().toISOString()
        };

        if (currentRecord?.id) {
          const { error } = await supabase.from('gen_projects').update(payload).eq('id', currentRecord.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('gen_projects')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          try { await window.AutoNumberingService.consumeNext('PROJECT'); } catch {}
        }

        setIsModalOpen(false);
        showToast(t('اطلاعات با موفقیت ذخیره شد', 'Saved successfully'));
        fetchData();
      } catch (err) {
        console.error('Save error:', err);
        showToast(t('خطا در ذخیره اطلاعات', 'Error saving data'), 'error');
      } finally {
        setIsSaving(false);
      }
    };

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
    const executeBulkStatusChange = async () => {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('gen_projects')
          .update({ status: bulkStatusValue }).in('id', bulkStatusModal.ids);
        if (error) throw error;
        setData(prev => prev.map(item =>
          bulkStatusModal.ids.includes(item.id) ? { ...item, status: bulkStatusValue } : item
        ));
        setSelectedIds([]);
        setBulkStatusModal({ isOpen: false, ids: [] });
        showToast(t('وضعیت پروژه‌های انتخابی بروزرسانی شد', 'Status updated for selected projects'));
      } catch (err) {
        showToast(t('خطا در تغییر وضعیت', 'Error changing status'), 'error');
      } finally { setIsLoading(false); }
    };

    // ── Quick Party ────────────────────────────────────────────────────────
    const openQuickParty = (target) => {
      setQuickPartyTarget(target);
      setQuickPartyData({
        code: '', firstName: '', lastName: '', latinTitle: '',
        nationalId: '', mobile: '', email: '', roles: ['employee']
      });
      setIsQuickPartyModalOpen(true);
    };

    const handleSaveQuickParty = async () => {
      if (!quickPartyData.firstName || !quickPartyData.lastName ||
          !quickPartyData.code      || !quickPartyData.latinTitle) {
        showToast(t('لطفاً فیلدهای اجباری (کد، نام، نام خانوادگی، عنوان لاتین) را تکمیل کنید',
                    'Please fill required fields: code, first name, last name, latin title'), 'error');
        return;
      }
      setIsSavingParty(true);
      try {
        const payload = {
          party_type:  'real',
          code:         quickPartyData.code,
          first_name:   quickPartyData.firstName,
          last_name:    quickPartyData.lastName,
          latin_title:  quickPartyData.latinTitle,
          national_id:  quickPartyData.nationalId || null,
          mobile:       quickPartyData.mobile     || null,
          email:        quickPartyData.email       || null,
          roles:        quickPartyData.roles,
          is_active:    true,
          created_at:   new Date().toISOString()
        };
        const { data: newParty, error } = await supabase.from('parties').insert([payload]).select().single();
        if (error) {
          if (error.code === '23505')
            showToast(t('کد شخص یا کد ملی تکراری است', 'Duplicate party code or national ID'), 'error');
          else throw error;
          return;
        }
        setAllParties(prev => [...prev, newParty]);
        if (quickPartyTarget === 'manager')
          setFormData(prev => ({ ...prev, manager_party_id: newParty.id }));
        else if (quickPartyTarget === 'supervisor')
          setFormData(prev => ({ ...prev, supervisor_party_id: newParty.id }));
        setIsQuickPartyModalOpen(false);
        showToast(t('پرسنل جدید با موفقیت ثبت شد', 'New personnel saved'), 'success');
      } catch (err) {
        console.error('Quick party error:', err);
        showToast(t('خطا در ذخیره اطلاعات شخص', 'Error saving party'), 'error');
      } finally {
        setIsSavingParty(false);
      }
    };

    // ── Personnel Modal ────────────────────────────────────────────────────
    const openPersonnelModal = (project) => {
      setPersonnelModal({ isOpen: true, project });
    };

    // ── Main grid columns ─────────────────────────────────────────────────
    const columns = [
      {
        field: 'code', header_fa: 'کد پروژه', header_en: 'Code', width: '120px',
        render: val => <span className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">{val}</span>
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
        render: val => <span className="font-mono text-[13px]" dir="ltr">{val ?? '-'}</span>
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

    // ── Party Roles (for quick add) ────────────────────────────────────────
    const PARTY_ROLES = [
      { id: 'system_user', label: t('کاربر سیستم',     'System User') },
      { id: 'employee',    label: t('پرسنل / کارمند',  'Employee')    },
      { id: 'customer',    label: t('مشتری',            'Customer')    },
      { id: 'supplier',    label: t('تامین‌کننده',      'Supplier')    },
      { id: 'shareholder', label: t('سهامدار',          'Shareholder') }
    ];

    // ── LOV display helper ─────────────────────────────────────────────────
    const getEmpDisplay = (id) => {
      if (!id) return '';
      const p = employeeParties.find(x => x.id === id);
      return p ? `${p.title} (${p.code})` : '';
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
              onToggle={(row, field, val) => { if (field === 'is_active') handleToggleActive(row, val); }}
              actions={[
                { icon: Edit,   tooltip: t('ویرایش',       'Edit'),              onClick: (row) => handleOpenModal(row),                                              className: 'text-slate-400 hover:text-indigo-600' },
                { icon: Users,  tooltip: t('پرسنل مرتبط', 'Related Personnel'), onClick: (row) => openPersonnelModal(row),                                          className: 'text-slate-400 hover:text-teal-600'   },
                { icon: Trash2, tooltip: t('حذف',          'Delete'),            onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 hover:text-red-600'    }
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
            Main Project Modal
        ══════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={currentRecord
            ? t('ویرایش پروژه',     'Edit Project')
            : t('تعریف پروژه جدید', 'New Project')}
          width="max-w-3xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* کد پروژه */}
              <TextField
                size="sm"
                label={t('کد پروژه', 'Project Code')}
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                isRtl={isRtl} dir="ltr"
                disabled={!!currentRecord}
                placeholder={t('خودکار', 'Auto')}
              />

              {/* عنوان پروژه */}
              <div className="md:col-span-2">
                <TextField
                  size="sm"
                  label={t('عنوان پروژه', 'Project Title')}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  isRtl={isRtl} required
                />
              </div>

              {/* وضعیت پروژه */}
              <SelectField
                size="sm"
                label={t('وضعیت پروژه', 'Project Status')}
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                isRtl={isRtl}
                options={PROJECT_STATUSES.map(s => ({ value: s.value, label: isRtl ? s.fa : s.en }))}
              />

              {/* مدیر پروژه */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <LOVField
                    size="sm"
                    label={t('مدیر پروژه', 'Project Manager')}
                    displayValue={getEmpDisplay(formData.manager_party_id)}
                    onChange={row => setFormData(prev => ({ ...prev, manager_party_id: row ? row.id : '' }))}
                    data={employeeParties}
                    columns={[
                      { field: 'code',   header_fa: 'کد',    header_en: 'Code',   width: '25%' },
                      { field: 'title',  header_fa: 'نام',   header_en: 'Name',   width: '50%' },
                      { field: 'mobile', header_fa: 'موبایل',header_en: 'Mobile', width: '25%' }
                    ]}
                    isRtl={isRtl}
                    dropdownWidth="min-w-[480px]"
                  />
                </div>
                <Button
                  variant="outline" size="sm" icon={Plus}
                  onClick={() => openQuickParty('manager')}
                  className="h-8 w-8 px-0 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40 mb-[1px]"
                  title={t('تعریف پرسنل جدید', 'Add New Personnel')}
                />
              </div>

              {/* ناظر پروژه */}
              <div className="flex items-end gap-2 md:col-span-2">
                <div className="flex-1">
                  <LOVField
                    size="sm"
                    label={t('ناظر پروژه', 'Project Supervisor')}
                    displayValue={getEmpDisplay(formData.supervisor_party_id)}
                    onChange={row => setFormData(prev => ({ ...prev, supervisor_party_id: row ? row.id : '' }))}
                    data={employeeParties}
                    columns={[
                      { field: 'code',   header_fa: 'کد',    header_en: 'Code',   width: '25%' },
                      { field: 'title',  header_fa: 'نام',   header_en: 'Name',   width: '50%' },
                      { field: 'mobile', header_fa: 'موبایل',header_en: 'Mobile', width: '25%' }
                    ]}
                    isRtl={isRtl}
                    dropdownWidth="min-w-[480px]"
                  />
                </div>
                <Button
                  variant="outline" size="sm" icon={Plus}
                  onClick={() => openQuickParty('supervisor')}
                  className="h-8 w-8 px-0 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40 mb-[1px]"
                  title={t('تعریف پرسنل جدید', 'Add New Personnel')}
                />
              </div>

              {/* تاریخ شروع */}
              <DatePicker
                size="sm"
                label={t('تاریخ شروع', 'Start Date')}
                value={formData.start_date}
                onChange={val => {
                  const estEnd = calcEstimatedEnd(val, formData.estimated_days);
                  setFormData(prev => ({ ...prev, start_date: val, estimated_end_date: estEnd }));
                }}
                isRtl={isRtl}
                language={language}
              />

              {/* مدت زمان تخمینی */}
              <TextField
                size="sm"
                label={t('مدت زمان تخمینی (روز)', 'Estimated Duration (days)')}
                value={String(formData.estimated_days)}
                onChange={e => {
                  const val = e.target.value;
                  const estEnd = calcEstimatedEnd(formData.start_date, val);
                  setFormData(prev => ({ ...prev, estimated_days: val, estimated_end_date: estEnd }));
                }}
                isRtl={isRtl}
                dir="ltr"
                type="number"
                min="0"
              />

              {/* تاریخ پایان تخمینی - readonly, same font/format as start_date */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('تاریخ پایان تخمینی', 'Estimated End Date')}
                </label>
                <div className="h-8 flex items-center px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[12px] text-slate-600 dark:text-slate-400" dir="ltr">
                  {formData.estimated_end_date
                    ? fmtDate(formData.estimated_end_date)
                    : <span className="text-slate-400 italic">{t('محاسبه خودکار', 'Auto-calculated')}</span>}
                </div>
              </div>

              {/* تاریخ واقعی پایان */}
              <DatePicker
                size="sm"
                label={t('تاریخ واقعی پایان', 'Actual End Date')}
                value={formData.actual_end_date}
                onChange={val => setFormData(prev => ({ ...prev, actual_end_date: val }))}
                isRtl={isRtl}
                language={language}
              />

              {/* فعال / غیرفعال */}
              <div className="flex items-center">
                <ToggleField
                  size="sm"
                  label={t('پروژه فعال است', 'Project is Active')}
                  checked={formData.is_active}
                  onChange={v => setFormData({ ...formData, is_active: v })}
                  isRtl={isRtl}
                />
              </div>

              {/* توضیحات */}
              <div className="md:col-span-3">
                <TextAreaField
                  size="sm"
                  label={t('توضیحات پروژه', 'Project Description')}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  isRtl={isRtl}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                {t('انصراف', 'Cancel')}
              </Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isSaving}>
                {t('ذخیره اطلاعات', 'Save Changes')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════════
            Quick Party Modal (employee)
        ══════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={isQuickPartyModalOpen}
          onClose={() => setIsQuickPartyModalOpen(false)}
          title={t('تعریف سریع پرسنل جدید', 'Quick Add New Personnel')}
          width="max-w-3xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField size="sm" label={t('کد شخص', 'Party Code')}     value={quickPartyData.code}        onChange={e => setQuickPartyData({ ...quickPartyData, code:        e.target.value })} isRtl={isRtl} required dir="ltr" />
              <TextField size="sm" label={t('نام', 'First Name')}          value={quickPartyData.firstName}   onChange={e => setQuickPartyData({ ...quickPartyData, firstName:   e.target.value })} isRtl={isRtl} required />
              <TextField size="sm" label={t('نام خانوادگی', 'Last Name')}  value={quickPartyData.lastName}    onChange={e => setQuickPartyData({ ...quickPartyData, lastName:    e.target.value })} isRtl={isRtl} required />
              <TextField size="sm" label={t('عنوان لاتین', 'Latin Title')} value={quickPartyData.latinTitle}  onChange={e => setQuickPartyData({ ...quickPartyData, latinTitle:  e.target.value })} isRtl={isRtl} dir="ltr" required />
              <TextField size="sm" label={t('کد ملی', 'National ID')}      value={quickPartyData.nationalId}  onChange={e => setQuickPartyData({ ...quickPartyData, nationalId:  e.target.value })} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('موبایل', 'Mobile')}           value={quickPartyData.mobile}      onChange={e => setQuickPartyData({ ...quickPartyData, mobile:      e.target.value })} isRtl={isRtl} dir="ltr" />

              {/* ایمیل + نقش‌ها در یک ردیف */}
              <TextField size="sm" label={t('ایمیل', 'Email')} value={quickPartyData.email} onChange={e => setQuickPartyData({ ...quickPartyData, email: e.target.value })} isRtl={isRtl} dir="ltr" />
              <div className="md:col-span-2">
                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('نقش‌های شخص', 'Party Roles')}</label>
                <div className="flex flex-wrap gap-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 min-h-[2rem] items-center">
                  {PARTY_ROLES.map(role => (
                    <CheckboxField key={role.id} size="sm" label={role.label}
                      checked={quickPartyData.roles.includes(role.id)}
                      disabled={role.id === 'employee'}
                      onChange={(checked) => {
                        if (role.id === 'employee') return;
                        setQuickPartyData(prev => ({ ...prev, roles: checked ? [...prev.roles, role.id] : prev.roles.filter(r => r !== role.id) }));
                      }}
                      isRtl={isRtl} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsQuickPartyModalOpen(false)}>
                {t('انصراف', 'Cancel')}
              </Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickParty} isLoading={isSavingParty}>
                {t('ذخیره و انتخاب', 'Save & Select')}
              </Button>
            </div>
          </div>
        </Modal>

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
          language={language} width="max-w-sm"
        >
          <div className="p-4 flex flex-col gap-4">
            <SelectField
              size="sm"
              label={t(`تغییر وضعیت ${bulkStatusModal.ids.length} پروژه به:`,
                       `Change status of ${bulkStatusModal.ids.length} projects to:`)}
              value={bulkStatusValue}
              onChange={e => setBulkStatusValue(e.target.value)}
              isRtl={isRtl}
              options={PROJECT_STATUSES.map(s => ({ value: s.value, label: isRtl ? s.fa : s.en }))}
            />
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setBulkStatusModal({ isOpen: false, ids: [] })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={executeBulkStatusChange} isLoading={isLoading}>{t('تأیید و اعمال', 'Apply')}</Button>
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
