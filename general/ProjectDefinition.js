/* Filename: general/ProjectDefinition.js */
/* Project definition / edit modal – extracted from ProjectManagement.js */
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

  const Button      = safeComp(DSCore,     'Button');
  const Badge       = safeComp(DSCore,     'Badge');
  const Modal       = safeComp(DSFeedback, 'Modal') !== FallbackComponent
                       ? safeComp(DSFeedback, 'Modal')
                       : safeComp(DSCore,     'Modal');
  const Toast       = safeComp(DSFeedback, 'Toast');

  const TextField   = safeComp(DSForms, 'TextField');
  const ToggleField = safeComp(DSForms, 'ToggleField');
  const CheckboxField = safeComp(DSForms, 'CheckboxField');
  const DatePicker  = safeComp(DSForms, 'DatePicker');

  const LOVField    = safeComp(DSGrid, 'LOVField');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const safeIcon = (name) => {
    const c = LucideIcons[name];
    return (typeof c === 'function' || (c && c.$$typeof)) ? c : FallbackIcon;
  };
  const Save = safeIcon('Save');
  const Plus = safeIcon('Plus');

  const supabase = window.supabase;

  // ── Project status constants ───────────────────────────────────────────────
  const PROJECT_STATUSES = [
    { value: 'PLANNING',    fa: 'در دست برنامه‌ریزی', en: 'Planning',    variant: 'slate'   },
    { value: 'IN_PROGRESS', fa: 'در حال اجرا',         en: 'In Progress', variant: 'indigo'  },
    { value: 'ON_HOLD',     fa: 'متوقف',               en: 'On Hold',     variant: 'amber'   },
    { value: 'COMPLETED',   fa: 'تکمیل شده',           en: 'Completed',   variant: 'emerald' },
    { value: 'CANCELLED',   fa: 'لغو شده',             en: 'Cancelled',   variant: 'red'     },
  ];

  const STATUS_TRANSITIONS = {
    'PLANNING':    [{ value: 'IN_PROGRESS', fa: 'شروع پروژه',   en: 'Start Project', cls: '!text-indigo-600 !border-indigo-400 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/30' }],
    'IN_PROGRESS': [
      { value: 'ON_HOLD',   fa: 'توقف موقت',   en: 'Put On Hold', cls: '!text-amber-600 !border-amber-400 hover:!bg-amber-50 dark:hover:!bg-amber-900/30'            },
      { value: 'COMPLETED', fa: 'تکمیل پروژه', en: 'Complete',    cls: '!text-emerald-600 !border-emerald-400 hover:!bg-emerald-50 dark:hover:!bg-emerald-900/30'  },
      { value: 'CANCELLED', fa: 'لغو پروژه',   en: 'Cancel',      cls: '!text-red-600 !border-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/30'                  }
    ],
    'ON_HOLD': [
      { value: 'IN_PROGRESS', fa: 'ادامه پروژه', en: 'Resume', cls: '!text-indigo-600 !border-indigo-400 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/30' },
      { value: 'CANCELLED',   fa: 'لغو پروژه',   en: 'Cancel', cls: '!text-red-600 !border-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/30'            }
    ],
    'COMPLETED': [],
    'CANCELLED': []
  };

  const PARTY_ROLES = [
    { id: 'system_user', fa: 'کاربر سیستم',    en: 'System User' },
    { id: 'employee',    fa: 'پرسنل / کارمند', en: 'Employee'    },
    { id: 'customer',    fa: 'مشتری',           en: 'Customer'    },
    { id: 'supplier',    fa: 'تامین‌کننده',     en: 'Supplier'    },
    { id: 'shareholder', fa: 'سهامدار',         en: 'Shareholder' }
  ];

  const EMPTY_FORM = {
    code: '', title: '', status: 'PLANNING',
    manager_party_id: '', supervisor_party_id: '',
    start_date: '', estimated_days: '', estimated_end_date: '',
    actual_end_date: '', is_active: true, description: ''
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ProjectDefinition
  // ════════════════════════════════════════════════════════════════════════════
  const ProjectDefinition = ({
    isOpen,             // boolean
    onClose,            // () => void
    initialRecord,      // project object | null
    allParties,         // party list from parent
    onProjectUpdated,   // () => void — triggers fetchData in parent
    language = 'fa'
  }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const { useCalendarMode: _useCalendarMode, formatGlobalDate: _formatGlobalDate } = window.DSCore || {};
    const calendarMode = _useCalendarMode ? _useCalendarMode() : (window.DSCore?.getGlobalCalendarMode?.() || 'jalali');

    // ── State ──────────────────────────────────────────────────────────────
    const [formData, setFormData]   = useState(EMPTY_FORM);
    const [isSaving, setIsSaving]   = useState(false);
    const [toast, setToast]         = useState({ isVisible: false, message: '', type: 'success' });

    // local party list (starts from allParties, grows with quick-add)
    const [localParties, setLocalParties] = useState([]);

    // quick party
    const [quickPartyTarget, setQuickPartyTarget]       = useState(null);
    const [isQuickPartyOpen, setIsQuickPartyOpen]       = useState(false);
    const [isSavingParty, setIsSavingParty]             = useState(false);
    const [quickPartyData, setQuickPartyData] = useState({
      code: '', firstName: '', lastName: '', latinTitle: '',
      nationalId: '', mobile: '', email: '', roles: ['employee']
    });

    // ── Init on open ───────────────────────────────────────────────────────
    useEffect(() => {
      if (!isOpen) return;
      setLocalParties(allParties || []);
      if (initialRecord) {
        setFormData({
          code:                initialRecord.code                || '',
          title:               initialRecord.title               || '',
          status:              initialRecord.status              || 'PLANNING',
          manager_party_id:    initialRecord.manager_party_id    || '',
          supervisor_party_id: initialRecord.supervisor_party_id || '',
          start_date:          initialRecord.start_date          || '',
          estimated_days:      initialRecord.estimated_days      ?? '',
          estimated_end_date:  initialRecord.estimated_end_date  || '',
          actual_end_date:     initialRecord.actual_end_date     || '',
          is_active:           initialRecord.is_active           ?? true,
          description:         initialRecord.description         || ''
        });
      } else {
        let nextCode = '';
        (async () => {
          try { nextCode = await window.AutoNumberingService.previewNext('PROJECT'); } catch {}
          setFormData({ ...EMPTY_FORM, code: nextCode });
        })();
      }
    }, [isOpen, initialRecord?.id]);

    // ── Helpers ────────────────────────────────────────────────────────────
    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3500);
    }, []);

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

    const calcEstimatedEnd = (startDate, days) => {
      if (!startDate || days === '' || days === null || isNaN(parseInt(days))) return '';
      try {
        const d = new Date(startDate);
        d.setDate(d.getDate() + parseInt(days));
        return d.toISOString().split('T')[0];
      } catch { return ''; }
    };

    const getStatusInfo = (value) =>
      PROJECT_STATUSES.find(s => s.value === value) || PROJECT_STATUSES[0];

    // ── Employee LOV from local parties ────────────────────────────────────
    const employeeParties = useMemo(() =>
      localParties
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
    [localParties]);

    const getEmpDisplay = (id) => {
      if (!id) return '';
      const p = employeeParties.find(x => x.id === id);
      return p ? `${p.title} (${p.code})` : '';
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

        if (initialRecord?.id) {
          const { error } = await supabase.from('gen_projects').update(payload).eq('id', initialRecord.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('gen_projects')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          try { await window.AutoNumberingService.consumeNext('PROJECT'); } catch {}
        }

        onClose();
        onProjectUpdated?.();
      } catch (err) {
        console.error('Save error:', err);
        showToast(t('خطا در ذخیره اطلاعات', 'Error saving data'), 'error');
      } finally {
        setIsSaving(false);
      }
    };

    // ── Status transition ──────────────────────────────────────────────────
    const handleStatusTransition = async (newStatus) => {
      if (!initialRecord?.id) return;
      setIsSaving(true);
      try {
        const { error } = await supabase.from('gen_projects')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', initialRecord.id);
        if (error) throw error;
        setFormData(prev => ({ ...prev, status: newStatus }));
        onProjectUpdated?.();
        showToast(t('وضعیت پروژه بروزرسانی شد', 'Project status updated'), 'success');
      } catch (err) {
        showToast(t('خطا در تغییر وضعیت', 'Error updating status'), 'error');
      } finally { setIsSaving(false); }
    };

    // ── Quick Party ────────────────────────────────────────────────────────
    const openQuickParty = (target) => {
      setQuickPartyTarget(target);
      setQuickPartyData({ code: '', firstName: '', lastName: '', latinTitle: '', nationalId: '', mobile: '', email: '', roles: ['employee'] });
      setIsQuickPartyOpen(true);
    };

    const handleSaveQuickParty = async () => {
      if (!quickPartyData.firstName || !quickPartyData.lastName || !quickPartyData.code || !quickPartyData.latinTitle) {
        showToast(t('لطفاً فیلدهای اجباری (کد، نام، نام خانوادگی، عنوان لاتین) را تکمیل کنید',
                    'Please fill required fields: code, first name, last name, latin title'), 'error');
        return;
      }
      setIsSavingParty(true);
      try {
        const payload = {
          party_type: 'real',
          code:        quickPartyData.code,
          first_name:  quickPartyData.firstName,
          last_name:   quickPartyData.lastName,
          latin_title: quickPartyData.latinTitle,
          national_id: quickPartyData.nationalId || null,
          mobile:      quickPartyData.mobile      || null,
          email:       quickPartyData.email        || null,
          roles:       quickPartyData.roles,
          is_active:   true,
          created_at:  new Date().toISOString()
        };
        const { data: newParty, error } = await supabase.from('parties').insert([payload]).select().single();
        if (error) {
          if (error.code === '23505')
            showToast(t('کد شخص یا کد ملی تکراری است', 'Duplicate party code or national ID'), 'error');
          else throw error;
          return;
        }
        setLocalParties(prev => [...prev, newParty]);
        if (quickPartyTarget === 'manager')
          setFormData(prev => ({ ...prev, manager_party_id: newParty.id }));
        else if (quickPartyTarget === 'supervisor')
          setFormData(prev => ({ ...prev, supervisor_party_id: newParty.id }));
        setIsQuickPartyOpen(false);
        showToast(t('پرسنل جدید با موفقیت ثبت شد', 'New personnel saved'), 'success');
      } catch (err) {
        console.error('Quick party error:', err);
        showToast(t('خطا در ذخیره اطلاعات شخص', 'Error saving party'), 'error');
      } finally {
        setIsSavingParty(false);
      }
    };

    const currentStatus = formData.status || 'PLANNING';
    const statusInfo    = getStatusInfo(currentStatus);
    const transitions   = STATUS_TRANSITIONS[currentStatus] || [];

    // ── Render ─────────────────────────────────────────────────────────────
    return (
      <>
        {/* ══════════════════════════════════════════════════════════════════
            Main Project Modal
        ══════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={initialRecord
            ? t('ویرایش پروژه',     'Edit Project')
            : t('تعریف پروژه جدید', 'New Project')}
          width="max-w-3xl"
          language={language}
        >
          <div className="flex flex-col gap-0">

            {/* ── Status bar (existing records only) ── */}
            {initialRecord && (
              <div className={`flex items-center ${isRtl ? 'flex-row' : 'flex-row-reverse'} justify-between gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40`}>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('وضعیت:', 'Status:')}</span>
                  <Badge variant={statusInfo.variant} size="sm">
                    {isRtl ? statusInfo.fa : statusInfo.en}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                  {transitions.map(tr => (
                    <Button key={tr.value} variant="outline" size="sm"
                      onClick={() => handleStatusTransition(tr.value)}
                      isLoading={isSaving}
                      className={`!py-0.5 !h-6 !text-[11px] ${tr.cls}`}>
                      {isRtl ? tr.fa : tr.en}
                    </Button>
                  ))}
                  {transitions.length === 0 && (
                    <Badge variant={statusInfo.variant} size="sm">
                      {t('وضعیت نهایی - غیرقابل تغییر', 'Final status – locked')}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                {/* ردیف ۱: کد (1) + عنوان (2) */}
                <TextField
                  size="sm" label={t('کد پروژه', 'Project Code')}
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  isRtl={isRtl} dir="ltr"
                  disabled={!!initialRecord}
                  placeholder={t('خودکار', 'Auto')}
                />
                <div className="md:col-span-2">
                  <TextField
                    size="sm" label={t('عنوان پروژه', 'Project Title')}
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    isRtl={isRtl} required
                  />
                </div>

                {/* ردیف ۲: مدیر (1) + ناظر (1) + مدت زمان (1) */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <LOVField size="sm" label={t('مدیر پروژه', 'Project Manager')}
                      displayValue={getEmpDisplay(formData.manager_party_id)}
                      onChange={row => setFormData(prev => ({ ...prev, manager_party_id: row ? row.id : '' }))}
                      data={employeeParties}
                      columns={[
                        { field: 'code',   header_fa: 'کد',    header_en: 'Code',   width: '25%' },
                        { field: 'title',  header_fa: 'نام',   header_en: 'Name',   width: '50%' },
                        { field: 'mobile', header_fa: 'موبایل',header_en: 'Mobile', width: '25%' }
                      ]}
                      isRtl={isRtl} dropdownWidth="min-w-[460px]" />
                  </div>
                  <Button variant="outline" size="sm" icon={Plus}
                    onClick={() => openQuickParty('manager')}
                    className="h-8 w-8 px-0 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40 mb-[1px]"
                    title={t('تعریف پرسنل جدید', 'Add New Personnel')} />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <LOVField size="sm" label={t('ناظر پروژه', 'Project Supervisor')}
                      displayValue={getEmpDisplay(formData.supervisor_party_id)}
                      onChange={row => setFormData(prev => ({ ...prev, supervisor_party_id: row ? row.id : '' }))}
                      data={employeeParties}
                      columns={[
                        { field: 'code',   header_fa: 'کد',    header_en: 'Code',   width: '25%' },
                        { field: 'title',  header_fa: 'نام',   header_en: 'Name',   width: '50%' },
                        { field: 'mobile', header_fa: 'موبایل',header_en: 'Mobile', width: '25%' }
                      ]}
                      isRtl={isRtl} dropdownWidth="min-w-[460px]" />
                  </div>
                  <Button variant="outline" size="sm" icon={Plus}
                    onClick={() => openQuickParty('supervisor')}
                    className="h-8 w-8 px-0 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40 mb-[1px]"
                    title={t('تعریف پرسنل جدید', 'Add New Personnel')} />
                </div>

                <TextField
                  size="sm" label={t('مدت زمان (روز)', 'Duration (days)')}
                  value={String(formData.estimated_days)}
                  onChange={e => {
                    const val = e.target.value;
                    const estEnd = calcEstimatedEnd(formData.start_date, val);
                    setFormData(prev => ({ ...prev, estimated_days: val, estimated_end_date: estEnd }));
                  }}
                  isRtl={isRtl} dir="ltr" type="number" min="0"
                />

                {/* ردیف ۳: تاریخ شروع (1) + پایان تخمینی (1) + پایان واقعی (1) */}
                <DatePicker
                  size="sm" label={t('تاریخ شروع', 'Start Date')}
                  value={formData.start_date}
                  onChange={val => {
                    const estEnd = calcEstimatedEnd(val, formData.estimated_days);
                    setFormData(prev => ({ ...prev, start_date: val, estimated_end_date: estEnd }));
                  }}
                  isRtl={isRtl} language={language}
                />

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('تاریخ پایان تخمینی', 'Estimated End')}
                  </label>
                  <div className="h-8 flex items-center px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[12px] text-slate-600 dark:text-slate-400" dir="ltr">
                    {formData.estimated_end_date
                      ? fmtDate(formData.estimated_end_date)
                      : <span className="text-slate-400 italic text-[11px]">{t('محاسبه خودکار', 'Auto')}</span>}
                  </div>
                </div>

                <DatePicker
                  size="sm" label={t('تاریخ پایان واقعی', 'Actual End Date')}
                  value={formData.actual_end_date}
                  onChange={val => setFormData(prev => ({ ...prev, actual_end_date: val }))}
                  isRtl={isRtl} language={language}
                />

                {/* ردیف ۴: توضیحات (2) + فعال (1) */}
                <div className="md:col-span-2">
                  <TextField
                    size="sm" label={t('توضیحات', 'Description')}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    isRtl={isRtl}
                  />
                </div>

                <div className="flex items-center h-8 mt-[22px]">
                  <ToggleField
                    size="sm" label={t('پروژه فعال است', 'Active')}
                    checked={formData.is_active}
                    onChange={v => setFormData({ ...formData, is_active: v })}
                    isRtl={isRtl}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <Button variant="outline" size="sm" onClick={onClose}>
                  {t('انصراف', 'Cancel')}
                </Button>
                <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isSaving}>
                  {t('ذخیره اطلاعات', 'Save Changes')}
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════════
            Quick Party Modal (employee)
        ══════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={isQuickPartyOpen}
          onClose={() => setIsQuickPartyOpen(false)}
          title={t('تعریف سریع پرسنل جدید', 'Quick Add New Personnel')}
          width="max-w-3xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField size="sm" label={t('کد شخص',       'Party Code')}  value={quickPartyData.code}       onChange={e => setQuickPartyData({ ...quickPartyData, code:       e.target.value })} isRtl={isRtl} required dir="ltr" />
              <TextField size="sm" label={t('نام',           'First Name')}  value={quickPartyData.firstName}  onChange={e => setQuickPartyData({ ...quickPartyData, firstName:  e.target.value })} isRtl={isRtl} required />
              <TextField size="sm" label={t('نام خانوادگی', 'Last Name')}   value={quickPartyData.lastName}   onChange={e => setQuickPartyData({ ...quickPartyData, lastName:   e.target.value })} isRtl={isRtl} required />
              <TextField size="sm" label={t('عنوان لاتین',  'Latin Title')} value={quickPartyData.latinTitle} onChange={e => setQuickPartyData({ ...quickPartyData, latinTitle: e.target.value })} isRtl={isRtl} dir="ltr" required />
              <TextField size="sm" label={t('کد ملی',        'National ID')} value={quickPartyData.nationalId} onChange={e => setQuickPartyData({ ...quickPartyData, nationalId: e.target.value })} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('موبایل',        'Mobile')}      value={quickPartyData.mobile}     onChange={e => setQuickPartyData({ ...quickPartyData, mobile:     e.target.value })} isRtl={isRtl} dir="ltr" />

              {/* ایمیل + نقش‌ها در یک ردیف */}
              <TextField size="sm" label={t('ایمیل', 'Email')} value={quickPartyData.email} onChange={e => setQuickPartyData({ ...quickPartyData, email: e.target.value })} isRtl={isRtl} dir="ltr" />
              <div className="md:col-span-2">
                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('نقش‌های شخص', 'Party Roles')}</label>
                <div className="flex flex-wrap gap-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 min-h-[2rem] items-center">
                  {PARTY_ROLES.map(role => (
                    <CheckboxField key={role.id} size="sm" label={isRtl ? role.fa : role.en}
                      checked={quickPartyData.roles.includes(role.id)}
                      disabled={role.id === 'employee'}
                      onChange={(checked) => {
                        if (role.id === 'employee') return;
                        setQuickPartyData(prev => ({
                          ...prev,
                          roles: checked ? [...prev.roles, role.id] : prev.roles.filter(r => r !== role.id)
                        }));
                      }}
                      isRtl={isRtl} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsQuickPartyOpen(false)}>
                {t('انصراف', 'Cancel')}
              </Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickParty} isLoading={isSavingParty}>
                {t('ذخیره و انتخاب', 'Save & Select')}
              </Button>
            </div>
          </div>
        </Modal>

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))}
        />
      </>
    );
  };

  window.ProjectDefinition = ProjectDefinition;
})();
