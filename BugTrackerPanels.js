/* Filename: BugTrackerPanels.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo } = React;

  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    ChevronDown = FallbackIcon,
    Check = FallbackIcon,
    Search = FallbackIcon
  } = LucideIcons;

  const PRIORITY_OPTIONS = [
    { value: 'LOW', fa: 'کم', en: 'Low' },
    { value: 'MEDIUM', fa: 'متوسط', en: 'Medium' },
    { value: 'HIGH', fa: 'زیاد', en: 'High' },
    { value: 'CRITICAL', fa: 'بحرانی', en: 'Critical' }
  ];

  const OVERALL_STATUS_OPTIONS = [
    { value: 'OPEN', fa: 'باز', en: 'Open', badge: 'blue' },
    { value: 'REOPENED', fa: 'بازگشایی مجدد', en: 'Reopened', badge: 'indigo' },
    { value: 'IN_PROGRESS', fa: 'در دست بررسی', en: 'In Review', badge: 'orange' },
    { value: 'CLOSED', fa: 'بسته شده', en: 'Closed', badge: 'gray' }
  ];

  const FIX_STATUS_OPTIONS = [
    { value: 'TODO', fa: 'شروع نشده', en: 'To Do', badge: 'slate' },
    { value: 'IN_PROGRESS', fa: 'در حال انجام', en: 'Doing', badge: 'orange' },
    { value: 'DONE', fa: 'انجام شده', en: 'Done', badge: 'green' }
  ];

  const QA_STATUS_OPTIONS = [
    { value: 'PENDING', fa: 'در انتظار بررسی', en: 'Pending', badge: 'slate' },
    { value: 'IN_REVIEW', fa: 'در حال انجام', en: 'In Review', badge: 'blue' },
    { value: 'PASSED', fa: 'تایید شد', en: 'Passed', badge: 'emerald' },
    { value: 'FAILED', fa: 'رد شد', en: 'Failed', badge: 'red' }
  ];

  const getInitialBugForm = () => ({
    id: null,
    title: '',
    form_name: '',
    is_general: false,
    priority: 'MEDIUM',
    overall_status: 'OPEN',
    fix_status: 'TODO',
    qa_status: 'PENDING',
    description: '',
    assignee_ids: [],
    checklist: []
  });

  const MultiSelectDropdown = ({ label, values = [], options = [], onChange, placeholder, language = 'fa', disabled = false }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = React.useRef(null);
    const dropdownRef = React.useRef(null);
    const [rect, setRect] = useState(null);
    const ReactDOM = window.ReactDOM;

    useEffect(() => {
      const updateRect = () => {
        if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
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

    useEffect(() => {
      const handleClickOutside = (e) => {
        const insideTrigger = containerRef.current && containerRef.current.contains(e.target);
        const insideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
        if (!insideTrigger && !insideDropdown) setIsOpen(false);
      };
      if (isOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
      if (disabled && isOpen) setIsOpen(false);
    }, [disabled, isOpen]);

    const selectedLabels = useMemo(() => {
      const map = new Map(options.map(o => [o.value, o.label]));
      return (values || []).map(v => map.get(v)).filter(Boolean);
    }, [values, options]);

    const filteredOptions = useMemo(() => {
      if (!searchTerm.trim()) return options;
      const q = searchTerm.toLowerCase();
      return options.filter(o => String(o.label || '').toLowerCase().includes(q));
    }, [options, searchTerm]);

    const toggleValue = (value) => {
      const exists = (values || []).includes(value);
      if (exists) onChange((values || []).filter(x => x !== value));
      else onChange([...(values || []), value]);
    };

    return (
      <div ref={containerRef} className="flex flex-col gap-1 w-full relative">
        {label ? <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{label}</label> : null}
        <button
          type="button"
          onClick={() => { if (!disabled) setIsOpen(v => !v); }}
          className={`w-full h-8 px-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-[12px] flex items-center justify-between ${disabled ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
          disabled={disabled}
        >
          <span className="truncate text-start">
            {selectedLabels.length ? selectedLabels.join('، ') : (placeholder || t('انتخاب کنید...', 'Select...'))}
          </span>
          <ChevronDown size={14} className={`shrink-0 text-slate-400 ${isOpen ? 'rotate-180' : ''} transition-transform`} />
        </button>

        {isOpen && rect && !disabled ? (() => {
          const minWidth = Math.max(rect.width, 280);
          const viewportH = window.innerHeight;
          const viewportW = window.innerWidth;
          const spaceBelow = Math.max(80, viewportH - rect.bottom - 12);
          const dropdownMaxHeight = Math.min(220, spaceBelow);
          const top = rect.bottom + 6;
          const left = Math.max(8, Math.min(rect.left, viewportW - minWidth - 8));

          const dropdownNode = (
            <div
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top,
                left,
                width: minWidth,
                zIndex: 999999
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
            >
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <span className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-2' : 'left-2'} text-slate-400`}>
                  <Search size={12} />
                </span>
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`w-full h-7 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-900 text-[12px] outline-none focus:border-indigo-400 ${isRtl ? 'pr-7 pl-2' : 'pl-7 pr-2'}`}
                  placeholder={t('جستجو...', 'Search...')}
                />
              </div>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-1" style={{ maxHeight: `${dropdownMaxHeight}px` }}>
              {filteredOptions.length ? filteredOptions.map(opt => {
                const checked = (values || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    className={`w-full h-7 px-2 rounded-md text-[12px] flex items-center justify-between transition-colors ${checked ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {checked ? <Check size={12} className="shrink-0" /> : null}
                  </button>
                );
              }) : (
                <div className="text-[12px] text-slate-400 px-2 py-2">{t('موردی یافت نشد.', 'No results found.')}</div>
              )}
            </div>
            </div>
          );

          return ReactDOM
            ? ReactDOM.createPortal(dropdownNode, document.body)
            : dropdownNode;
        })() : null}
      </div>
    );
  };

  const buildBugColumns = ({ t, menuForms, Badge, getLabel, getBadgeVariant, specialistsMap }) => ([
    {
      field: 'title',
      header_fa: 'عنوان باگ',
      header_en: 'Bug Title',
      width: '220px',
      render: (val) => <span className="font-bold text-[12px] text-slate-700 dark:text-slate-200">{val || '-'}</span>,
      searchAccessor: (val) => val || ''
    },
    {
      field: 'form_name',
      header_fa: 'نام فرم',
      header_en: 'Form Name',
      width: '260px',
      render: (val, row) => {
        if (row?.is_general) {
          return (
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{t('عمومی سیستم', 'System-wide')}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('بدون مسیر فرم', 'No form path')}</span>
            </div>
          );
        }
        const strVal = String(val || '').trim();
        const found = menuForms.find(item => item.value === strVal || item.component_path === strVal || item.name === strVal || item.path === strVal);
        const fallbackName = strVal.includes('/') ? String(strVal.split('/').pop() || '').trim() : strVal;
        const name = found?.name || fallbackName || '-';
        const path = found?.path || (strVal && strVal !== name ? strVal : '');
        return (
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{name}</span>
            {path ? <span className="text-[10px] text-slate-500 dark:text-slate-400">{path}</span> : null}
          </div>
        );
      },
      searchAccessor: (val, row) => {
        if (row?.is_general) return `${t('عمومی سیستم', 'System-wide')} ${t('بدون مسیر فرم', 'No form path')}`;
        const strVal = String(val || '').trim();
        const found = menuForms.find(item => item.value === strVal || item.component_path === strVal || item.name === strVal || item.path === strVal);
        const fallbackName = strVal.includes('/') ? String(strVal.split('/').pop() || '').trim() : strVal;
        return `${found?.name || fallbackName || ''} ${found?.path || ''} ${strVal}`.trim();
      }
    },
    {
      field: 'priority',
      header_fa: 'اولویت',
      header_en: 'Priority',
      width: '90px',
      render: val => <Badge variant={val === 'CRITICAL' ? 'danger' : val === 'HIGH' ? 'orange' : val === 'MEDIUM' ? 'blue' : 'slate'}>{getLabel(PRIORITY_OPTIONS, val)}</Badge>,
      searchAccessor: (val) => `${val || ''} ${getLabel(PRIORITY_OPTIONS, val) || ''}`
    },
    {
      field: 'overall_status',
      header_fa: 'وضعیت کلی',
      header_en: 'Overall Status',
      width: '120px',
      render: val => <Badge variant={getBadgeVariant(OVERALL_STATUS_OPTIONS, val)}>{getLabel(OVERALL_STATUS_OPTIONS, val)}</Badge>,
      searchAccessor: (val) => `${val || ''} ${getLabel(OVERALL_STATUS_OPTIONS, val) || ''}`
    },
    {
      field: 'fix_status',
      header_fa: 'وضعیت توسعه/رفع',
      header_en: 'Fix Status',
      width: '130px',
      render: val => <Badge variant={getBadgeVariant(FIX_STATUS_OPTIONS, val)}>{getLabel(FIX_STATUS_OPTIONS, val)}</Badge>,
      searchAccessor: (val) => `${val || ''} ${getLabel(FIX_STATUS_OPTIONS, val) || ''}`
    },
    {
      field: 'qa_status',
      header_fa: 'وضعیت بررسی/کنترل',
      header_en: 'QA Status',
      width: '140px',
      render: val => <Badge variant={getBadgeVariant(QA_STATUS_OPTIONS, val)}>{getLabel(QA_STATUS_OPTIONS, val)}</Badge>,
      searchAccessor: (val) => `${val || ''} ${getLabel(QA_STATUS_OPTIONS, val) || ''}`
    },
    {
      field: 'assignee_ids',
      header_fa: 'مسئول انجام',
      header_en: 'Assignees',
      width: '190px',
      render: val => {
        const names = (val || []).map(id => specialistsMap[id]?.full_name).filter(Boolean);
        return <span className="text-[12px] text-slate-600 dark:text-slate-300">{names.length ? names.join('، ') : '-'}</span>;
      },
      searchAccessor: (val) => (val || []).map(id => specialistsMap[id]?.full_name).filter(Boolean).join(' ')
    },
    {
      field: 'checklist_progress',
      header_fa: 'چک‌لیست',
      header_en: 'Checklist',
      width: '120px',
      render: (val, row) => <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{row.checklist_done}/{row.checklist_total} ({val || 0}%)</span>,
      searchAccessor: (val, row) => `${row.checklist_done || 0}/${row.checklist_total || 0} ${val || 0}`
    }
  ]);

  const getFormNameOptions = (bugs, menuForms) => {
    const values = new Map();
    menuForms.forEach(item => {
      values.set(item.value, item.label || item.value);
    });
    bugs.forEach(b => {
      if (b.form_name && !values.has(b.form_name)) values.set(b.form_name, b.form_name);
    });
    return Array.from(values.entries()).map(([value, label]) => ({ value, label }));
  };

  const getSpecialistOptions = (activeSpecialists) => {
    return activeSpecialists.map(s => ({ value: s.id, label: `${s.full_name}${s.skill_title ? ` (${s.skill_title})` : ''}` }));
  };

  const getTaskSpecialistOptions = (activeSpecialists) => {
    return activeSpecialists.map(s => ({ value: s.id, label: s.full_name || '-' }));
  };

  const getFilteredBugs = ({ bugs, filters, attachmentCounts, commentedIds }) => {
    return bugs.filter(bug => {
      const status = bug.overall_status || 'OPEN';
      const isDone = status === 'DONE' || status === 'CLOSED';

      if (filters.show_done && !isDone) return false;
      if (!filters.show_done && isDone) return false;

      if (filters.assignee_id) {
        const targetId = filters.assignee_id;
        const assignedOnTask = (bug.checklist || []).some(task => (task.assignee_ids || []).includes(targetId));
        if (!assignedOnTask) return false;
      }

      if (filters.has_attachment && (attachmentCounts[String(bug.id)] || 0) <= 0) return false;
      if (filters.has_comment && !commentedIds.has(String(bug.id))) return false;

      return true;
    });
  };

  const getFilterFields = (t, specialistOptions) => ([
    { name: 'assignee_id', label: t('مسئول انجام تسک', 'Task assignee'), type: 'select', options: [{ value: '', label: t('همه', 'All') }, ...specialistOptions] },
    { name: 'show_done', label: t('مشاهده موارد تکمیل شده', 'Show completed items'), type: 'toggle' },
    { name: 'has_attachment', label: t('دارای فایل ضمیمه', 'Has attachment'), type: 'toggle' },
    { name: 'has_comment', label: t('دارای کامنت', 'Has comment'), type: 'toggle' }
  ]);

  const getSpecialistColumns = () => ([
    { field: 'full_name', header_fa: 'نام', header_en: 'Full Name', width: '180px' },
    { field: 'skill_title', header_fa: 'تخصص', header_en: 'Skill', width: '160px' },
    { field: 'is_active', header_fa: 'فعال', header_en: 'Active', width: '90px', type: 'toggle' }
  ]);

  const BugFormModal = ({
    isOpen,
    onClose,
    mode,
    t,
    language,
    isRtl,
    bugForm,
    attachmentCounts,
    openCurrentBugAttachments,
    formCode,
    formNameOptions,
    setBugForm,
    PRIORITY_OPTIONS,
    OVERALL_STATUS_OPTIONS,
    FIX_STATUS_OPTIONS,
    specialistOptions,
    newTaskTitle,
    setNewTaskTitle,
    addChecklistTask,
    toggleChecklistDone,
    updateChecklistTaskTitle,
    removeChecklistTask,
    taskSpecialistOptions,
    MultiSelectDropdown,
    copyCurrentFormAsNew,
    saveBug,
    isLoading,
    Button,
    Modal,
    Card,
    TextField,
    SelectField,
    TextAreaField,
    CheckboxField,
    Save,
    Copy,
    Paperclip,
    Plus,
    Trash2
  }) => {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'EDIT' ? t('ویرایش باگ', 'Edit Bug') : t('ثبت باگ جدید', 'New Bug')}
        width="max-w-5xl"
        headerActions={
          <button
            type="button"
            onClick={openCurrentBugAttachments}
            title={t('پیوست‌های باگ', 'Bug attachments')}
            className={`relative p-1.5 rounded-lg transition-all active:scale-95 ${bugForm.id ? 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
            disabled={!bugForm.id}
          >
            <Paperclip size={14} strokeWidth={2.5} />
            {bugForm.id && (attachmentCounts[String(bugForm.id)] || 0) > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-black leading-4 text-center">
                {attachmentCounts[String(bugForm.id)]}
              </span>
            ) : null}
          </button>
        }
        language={language}
      >
        <div className="p-3 max-h-[72vh] overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            <Card title={t('مشخصات باگ', 'Bug Details')} className="xl:col-span-5 border border-slate-200 dark:border-slate-700" noPadding={false}>
              <div className="space-y-2">
                <TextField
                  size="sm"
                  label={t('عنوان باگ', 'Bug Title')}
                  value={bugForm.title}
                  onChange={e => setBugForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  formCode={formCode}
                />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-10">
                    <SelectField
                      size="sm"
                      label={t('نام فرم', 'Form')}
                      value={bugForm.form_name}
                      onChange={e => setBugForm(prev => ({ ...prev, form_name: e.target.value }))}
                      options={[
                        { value: '', label: t('انتخاب فرم', 'Select form') },
                        ...formNameOptions
                      ]}
                      required={!bugForm.is_general}
                      disabled={!!bugForm.is_general}
                      formCode={formCode}
                    />
                  </div>
                  <div className="md:col-span-2 pb-1">
                    <CheckboxField
                      label={t('عمومی', 'General')}
                      checked={!!bugForm.is_general}
                      onChange={v => setBugForm(prev => ({
                        ...prev,
                        is_general: !!v,
                        form_name: v ? '' : prev.form_name
                      }))}
                      formCode={formCode}
                    />
                  </div>
                </div>

                <TextAreaField
                  size="sm"
                  label={t('توضیحات', 'Description')}
                  value={bugForm.description}
                  onChange={e => setBugForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  formCode={formCode}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <SelectField
                    size="sm"
                    label={t('اولویت', 'Priority')}
                    value={bugForm.priority}
                    onChange={e => setBugForm(prev => ({ ...prev, priority: e.target.value }))}
                    options={PRIORITY_OPTIONS.map(x => ({ value: x.value, label: isRtl ? x.fa : x.en }))}
                    formCode={formCode}
                  />
                  <SelectField
                    size="sm"
                    label={t('وضعیت', 'Status')}
                    value={bugForm.overall_status}
                    onChange={e => setBugForm(prev => ({ ...prev, overall_status: e.target.value }))}
                    options={OVERALL_STATUS_OPTIONS.map(x => ({ value: x.value, label: isRtl ? x.fa : x.en }))}
                    formCode={formCode}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <MultiSelectDropdown
                    label={t('تخصیص به', 'Assign To')}
                    values={bugForm.assignee_ids}
                    options={specialistOptions}
                    onChange={(vals) => setBugForm(prev => ({ ...prev, assignee_ids: vals }))}
                    placeholder={t('انتخاب یک یا چند نفر', 'Select one or more specialists')}
                    language={language}
                  />
                  <SelectField
                    size="sm"
                    label={t('وضعیت توسعه/رفع', 'Fix Status')}
                    value={bugForm.fix_status}
                    onChange={e => setBugForm(prev => ({ ...prev, fix_status: e.target.value }))}
                    options={FIX_STATUS_OPTIONS.map(x => ({ value: x.value, label: isRtl ? x.fa : x.en }))}
                    formCode={formCode}
                  />
                </div>
              </div>

              {!specialistOptions.length ? (
                <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                  {t('ابتدا افراد را با دکمه "تعریف افراد و تخصص‌ها" ثبت کنید.', 'Add specialists first using the Manage Specialists button.')}
                </div>
              ) : null}
            </Card>

            <Card title={t('تسک‌های مرتبط', 'Related Tasks')} className="xl:col-span-7 border border-slate-200 dark:border-slate-700" noPadding={false}>
              <div className="flex items-end gap-2">
                <TextField
                  size="sm"
                  label={t('تسک جدید', 'New Task')}
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  formCode={formCode}
                />
                <Button variant="outline" size="sm" icon={Plus} onClick={addChecklistTask}>
                  {t('افزودن', 'Add')}
                </Button>
              </div>

              <div className="mt-2 max-h-[420px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                {bugForm.checklist.length ? bugForm.checklist.map((task, idx) => (
                  <div key={task.local_id} className={`border border-slate-200 dark:border-slate-700 rounded-lg p-2 ${task.is_done ? 'bg-slate-50 dark:bg-slate-800/60 opacity-80' : 'bg-white dark:bg-slate-800'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="h-6 min-w-[26px] px-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <CheckboxField
                          label=""
                          checked={!!task.is_done}
                          onChange={v => toggleChecklistDone(task.local_id, v)}
                          formCode={formCode}
                        />
                        <input
                          type="text"
                          value={task.title || ''}
                          onChange={e => updateChecklistTaskTitle(task.local_id, e.target.value)}
                          disabled={!!task.is_done}
                          className={`flex-1 h-8 px-2 border rounded-md text-[12px] outline-none ${task.is_done ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 focus:border-indigo-400'}`}
                          placeholder={t('عنوان تسک', 'Task title')}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        className={task.is_done ? '!text-slate-300 dark:!text-slate-600 cursor-not-allowed' : '!text-red-500'}
                        onClick={() => {
                          if (task.is_done) return;
                          removeChecklistTask(task.local_id);
                        }}
                      />
                    </div>

                    <div className="mt-1">
                      <MultiSelectDropdown
                        values={task.assignee_ids || []}
                        options={taskSpecialistOptions}
                        disabled={!!task.is_done}
                        onChange={(vals) => {
                          setBugForm(prev => ({
                            ...prev,
                            checklist: prev.checklist.map(item => item.local_id === task.local_id ? { ...item, assignee_ids: vals } : item)
                          }));
                        }}
                        placeholder={t('تخصیص به ...', 'Assign one or more specialists')}
                        language={language}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">
                    {t('هنوز تسکی تعریف نشده است.', 'No checklist task has been added yet.')}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2">
          {mode === 'EDIT' ? (
            <Button variant="outline" size="sm" icon={Copy} onClick={copyCurrentFormAsNew}>
              {t('کپی و ایجاد جدید', 'Copy as New')}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('انصراف', 'Cancel')}
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={saveBug} isLoading={isLoading}>
            {t('ذخیره', 'Save')}
          </Button>
        </div>
      </Modal>
    );
  };

  const SpecialistModal = ({
    isOpen,
    onClose,
    t,
    language,
    specialistForm,
    setSpecialistForm,
    saveSpecialist,
    isLoading,
    formCode,
    DataGrid,
    specialists,
    specialistColumns,
    Button,
    Modal,
    TextField,
    ToggleField,
    Edit,
    Trash2,
    Save,
    X,
    setDeleteConfirm
  }) => {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('تعریف افراد و تخصص‌ها', 'Manage Specialists & Skills')}
        width="max-w-4xl"
        language={language}
      >
        <div className="p-4 max-h-[72vh] overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <TextField
              size="sm"
              label={t('نام فرد', 'Full Name')}
              value={specialistForm.full_name}
              onChange={e => setSpecialistForm(prev => ({ ...prev, full_name: e.target.value }))}
              formCode={formCode}
              required
            />
            <TextField
              size="sm"
              label={t('تخصص', 'Skill')}
              value={specialistForm.skill_title}
              onChange={e => setSpecialistForm(prev => ({ ...prev, skill_title: e.target.value }))}
              formCode={formCode}
            />
            <div className="md:mt-5">
              <ToggleField
                size="sm"
                label={t('فعال', 'Active')}
                checked={specialistForm.is_active}
                onChange={v => setSpecialistForm(prev => ({ ...prev, is_active: v }))}
                formCode={formCode}
              />
            </div>
            <div className="md:col-span-2 md:mt-5 flex items-center gap-2">
              <Button variant="primary" size="sm" icon={Save} onClick={saveSpecialist} isLoading={isLoading}>
                {specialistForm.id ? t('ذخیره تغییرات', 'Save Changes') : t('افزودن فرد', 'Add Specialist')}
              </Button>
              {specialistForm.id ? (
                <Button
                  variant="outline"
                  size="sm"
                  icon={X}
                  onClick={() => setSpecialistForm({ id: null, full_name: '', skill_title: '', is_active: true })}
                >
                  {t('انصراف', 'Cancel')}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="h-[330px] mt-3">
            <DataGrid
              data={specialists}
              columns={specialistColumns}
              language={language}
              formCode={formCode}
              hideImport={true}
              hideExport={true}
              actionWidth="120px"
              actions={[
                {
                  icon: Edit,
                  tooltip: t('ویرایش', 'Edit'),
                  onClick: row => setSpecialistForm({
                    id: row.id,
                    full_name: row.full_name || '',
                    skill_title: row.skill_title || '',
                    is_active: row.is_active ?? true
                  }),
                  className: 'text-slate-500 hover:text-indigo-600'
                },
                {
                  icon: Trash2,
                  tooltip: t('حذف', 'Delete'),
                  onClick: row => setDeleteConfirm({ isOpen: true, type: 'SPECIALIST', data: row }),
                  className: 'text-slate-400 hover:text-red-600'
                }
              ]}
            />
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            {t('بستن', 'Close')}
          </Button>
        </div>
      </Modal>
    );
  };

  const AttachmentModal = ({
    isOpen,
    onClose,
    t,
    language,
    attachModal,
    handleFileUpload,
    handleDeleteAttachment,
    isUploading,
    formCode,
    AttachmentManager,
    Button,
    Modal
  }) => {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('پیوست‌های باگ', 'Bug Attachments')}
        width="max-w-xl"
        language={language}
      >
        <div className="p-4 max-h-[70vh] overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="mb-3 text-[12px] font-bold text-slate-700 dark:text-slate-200">
            {attachModal.bug ? `${t('باگ:', 'Bug:')} ${attachModal.bug.title}` : ''}
          </div>
          <div className="h-[360px] rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2">
            <AttachmentManager
              files={attachModal.files}
              onUpload={handleFileUpload}
              onDelete={handleDeleteAttachment}
              onDownload={(f) => window.open(f.file_url, '_blank')}
              readOnly={false}
              isUploading={isUploading}
              language={language}
              formCode={formCode}
            />
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            {t('بستن', 'Close')}
          </Button>
        </div>
      </Modal>
    );
  };

  const BulkStatusModal = ({
    isOpen,
    onClose,
    t,
    language,
    bulkStatusModal,
    setBulkStatusModal,
    OVERALL_STATUS_OPTIONS,
    FIX_STATUS_OPTIONS,
    QA_STATUS_OPTIONS,
    isRtl,
    executeBulkStatusChange,
    isLoading,
    formCode,
    Button,
    Modal,
    SelectField,
    Save
  }) => {
    const statusFieldOptions = [
      { value: 'overall_status', label: t('وضعیت کلی', 'Overall Status') },
      { value: 'fix_status', label: t('وضعیت توسعه/رفع', 'Fix Status') },
      { value: 'qa_status', label: t('وضعیت بررسی/کنترل', 'QA Status') }
    ];
    const statusOptionsByField = {
      overall_status: OVERALL_STATUS_OPTIONS,
      fix_status: FIX_STATUS_OPTIONS,
      qa_status: QA_STATUS_OPTIONS
    };
    const activeField = statusOptionsByField[bulkStatusModal.field] ? bulkStatusModal.field : 'overall_status';
    const activeOptions = statusOptionsByField[activeField] || [];

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('تغییر وضعیت گروهی باگ‌ها', 'Bulk Bug Status Change')}
        width="max-w-md"
        language={language}
      >
        <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
          <div className="text-[12px] text-slate-600 dark:text-slate-400">
            {t(
              `وضعیت ${bulkStatusModal.ids.length} باگ انتخاب‌شده را تغییر دهید:`,
              `Set status for ${bulkStatusModal.ids.length} selected bug(s):`
            )}
          </div>

          <SelectField
            size="sm"
            label={t('نوع تغییر وضعیت', 'Status Type')}
            value={activeField}
            onChange={e => {
              const nextField = e.target.value;
              const nextOptions = statusOptionsByField[nextField] || [];
              setBulkStatusModal(prev => ({
                ...prev,
                field: nextField,
                value: nextOptions[0]?.value || ''
              }));
            }}
            options={statusFieldOptions}
            formCode={formCode}
          />

          <SelectField
            size="sm"
            label={statusFieldOptions.find(x => x.value === activeField)?.label || t('وضعیت', 'Status')}
            value={bulkStatusModal.value}
            onChange={e => setBulkStatusModal(prev => ({ ...prev, value: e.target.value }))}
            options={activeOptions.map(x => ({ value: x.value, label: isRtl ? x.fa : x.en }))}
            formCode={formCode}
          />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('انصراف', 'Cancel')}
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={executeBulkStatusChange} isLoading={isLoading}>
            {t('اعمال تغییرات', 'Apply Changes')}
          </Button>
        </div>
      </Modal>
    );
  };

  const BulkAssigneeModal = ({
    isOpen,
    onClose,
    t,
    language,
    bulkAssigneeModal,
    setBulkAssigneeModal,
    specialistOptions,
    executeBulkAssigneeChange,
    isLoading,
    MultiSelectDropdown,
    Button,
    Modal,
    Save
  }) => {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('تغییر مسئول انجام گروهی', 'Bulk Assignee Change')}
        width="max-w-md"
        language={language}
      >
        <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
          <div className="text-[12px] text-slate-600 dark:text-slate-400">
            {t(
              `مسئول انجام ${bulkAssigneeModal.ids.length} باگ انتخاب‌شده را تعیین کنید:`,
              `Set assignees for ${bulkAssigneeModal.ids.length} selected bug(s):`
            )}
          </div>

          <MultiSelectDropdown
            label={t('مسئول انجام', 'Assignees')}
            values={bulkAssigneeModal.assignee_ids}
            options={specialistOptions}
            onChange={(vals) => setBulkAssigneeModal(prev => ({ ...prev, assignee_ids: vals }))}
            placeholder={t('انتخاب یک یا چند نفر', 'Select one or more specialists')}
            language={language}
          />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('انصراف', 'Cancel')}
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={executeBulkAssigneeChange} isLoading={isLoading}>
            {t('اعمال تغییرات', 'Apply Changes')}
          </Button>
        </div>
      </Modal>
    );
  };

  const DeleteConfirmDialog = ({
    isOpen,
    t,
    language,
    deleteConfirm,
    setDeleteConfirm,
    deleteSpecialist,
    executeDelete,
    Dialog
  }) => {
    return (
      <Dialog
        isOpen={isOpen}
        title={t('تایید حذف', 'Confirm Delete')}
        type="warning"
        language={language}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
        onConfirm={deleteConfirm.type === 'SPECIALIST' ? () => {
          const row = deleteConfirm.data;
          setDeleteConfirm({ isOpen: false, type: null, data: null });
          deleteSpecialist(row);
        } : executeDelete}
        confirmLabel={t('حذف', 'Delete')}
        cancelLabel={t('انصراف', 'Cancel')}
      >
        {deleteConfirm.type === 'SPECIALIST'
          ? t('حذف این فرد باعث حذف تخصیص‌های مرتبط هم می‌شود. ادامه می‌دهید؟', 'Deleting this specialist will remove related assignments. Continue?')
          : deleteConfirm.type === 'BUG_BULK'
            ? t(`این ${deleteConfirm.data?.length || 0} باگ انتخاب‌شده حذف می‌شود. ادامه می‌دهید؟`, `Delete ${deleteConfirm.data?.length || 0} selected bugs and their checklists?`)
            : t('این باگ و چک‌لیست‌های آن حذف می‌شود. ادامه می‌دهید؟', 'This bug and its checklist will be deleted. Continue?')}
      </Dialog>
    );
  };

  window.BugTrackerPanels = {
    PRIORITY_OPTIONS,
    OVERALL_STATUS_OPTIONS,
    FIX_STATUS_OPTIONS,
    QA_STATUS_OPTIONS,
    getInitialBugForm,
    MultiSelectDropdown,
    buildBugColumns,
    getFormNameOptions,
    getSpecialistOptions,
    getTaskSpecialistOptions,
    getFilteredBugs,
    getFilterFields,
    getSpecialistColumns,
    BugFormModal,
    SpecialistModal,
    AttachmentModal,
    BulkStatusModal,
    BulkAssigneeModal,
    DeleteConfirmDialog
  };
})();
