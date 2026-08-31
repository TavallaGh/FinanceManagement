/* Filename: BugTracker.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const FallbackComponent = () => null;

  const LucideIcons = window.LucideIcons || {};
  const {
    Bug = FallbackIcon,
    Plus = FallbackIcon,
    Copy = FallbackIcon,
    Edit = FallbackIcon,
    Trash2 = FallbackIcon,
    Paperclip = FallbackIcon,
    CheckCircle2 = FallbackIcon,
    RotateCcw = FallbackIcon,
    Users = FallbackIcon,
    Save = FallbackIcon,
    X = FallbackIcon,
    AlertTriangle = FallbackIcon,
    MessageSquare = FallbackIcon,
    Settings = FallbackIcon,
    ChevronDown = FallbackIcon,
    Check = FallbackIcon,
    Search = FallbackIcon
  } = LucideIcons;

  const safeComp = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    if (c && c.default && (typeof c.default === 'function' || c.default.$$typeof)) return c.default;
    return FallbackComponent;
  };

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS;
  const Grid = window.DSGrid || DS;
  const Feedback = window.DSFeedback || window.DSOverlays || DS;
  const Forms = window.DSForms || DS;

  const Button = safeComp(Core, 'Button');
  const PageHeader = safeComp(Core, 'PageHeader');
  const Card = safeComp(Core, 'Card');
  const Badge = safeComp(Core, 'Badge');
  const EmptyState = safeComp(Core, 'EmptyState');

  const DataGrid = safeComp(Grid, 'DataGrid');
  const AdvancedFilter = safeComp(Grid, 'AdvancedFilter');

  const Modal = safeComp(Feedback, 'Modal');
  const Toast = safeComp(Feedback, 'Toast');
  const Dialog = safeComp(Feedback, 'Dialog');

  const TextField = safeComp(Forms, 'TextField');
  const SelectField = safeComp(Forms, 'SelectField');
  const TextAreaField = safeComp(Forms, 'TextAreaField');
  const CheckboxField = safeComp(Forms, 'CheckboxField');
  const ToggleField = safeComp(Forms, 'ToggleField');
  const AttachmentManager = safeComp(Forms, 'AttachmentManager');

  const supabase = window.supabase;
  const FORM_CODE = 'BUG_TRACKER';

  const BUGS_TABLE = 'bt_bugs';
  const SPECIALISTS_TABLE = 'bt_specialists';
  const BUG_ASSIGN_TABLE = 'bt_bug_assignments';
  const TASK_TABLE = 'bt_bug_checklist';
  const TASK_ASSIGN_TABLE = 'bt_bug_checklist_assignments';
  const ATTACHMENT_ENTITY = 'BUG_TRACKER';

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

  const getSessionUserId = () => {
    try {
      const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
      return JSON.parse(s).id || null;
    } catch {
      return null;
    }
  };

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

  const BugTracker = ({ language = 'fa', formCode = FORM_CODE }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const a = securityCtx ? securityCtx.getActions(formCode) : null;
      return a || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const currentUserId = getSessionUserId();

    const [isLoading, setIsLoading] = useState(false);
    const [bugs, setBugs] = useState([]);
    const [specialists, setSpecialists] = useState([]);
    const [menuForms, setMenuForms] = useState([]);
    const [attachmentCounts, setAttachmentCounts] = useState({});
    const [filters, setFilters] = useState({ show_done: false, assignee_id: '' });
    const [selectedBugIds, setSelectedBugIds] = useState([]);

    const [gridState, setGridState] = useState(null);
    const [bugModal, setBugModal] = useState({ isOpen: false, mode: 'CREATE' });
    const [bugForm, setBugForm] = useState(getInitialBugForm());
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [commentModalState, setCommentModalState] = useState({ isOpen: false, record: null });
    const [commentedIds, setCommentedIds] = useState(new Set());
    const [filteredRecordId, setFilteredRecordId] = useState(null);

    const [attachModal, setAttachModal] = useState({ isOpen: false, bug: null, files: [] });
    const [isUploading, setIsUploading] = useState(false);

    const [specialistModalOpen, setSpecialistModalOpen] = useState(false);

    const [specialistForm, setSpecialistForm] = useState({ id: null, full_name: '', skill_title: '', is_active: true });

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [bulkStatusModal, setBulkStatusModal] = useState({ isOpen: false, ids: [], value: 'OPEN' });
    const [bulkAssigneeModal, setBulkAssigneeModal] = useState({ isOpen: false, ids: [], assignee_ids: [] });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const getLabel = useCallback((arr, value) => {
      const found = arr.find(x => x.value === value);
      if (!found) return value || '-';
      return isRtl ? found.fa : found.en;
    }, [isRtl]);

    const getBadgeVariant = useCallback((arr, value) => {
      const found = arr.find(x => x.value === value);
      return found?.badge || 'gray';
    }, []);

    const specialistsMap = useMemo(() => {
      const map = {};
      specialists.forEach(s => {
        map[s.id] = s;
      });
      return map;
    }, [specialists]);

    const activeSpecialists = useMemo(() => specialists.filter(s => s.is_active), [specialists]);

    const fetchAllData = useCallback(async () => {
      setIsLoading(true);
      try {
        const [specialistsRes, bugsRes, menusRes] = await Promise.all([
          supabase.from(SPECIALISTS_TABLE).select('*').order('full_name', { ascending: true }),
          supabase.from(BUGS_TABLE).select('*').order('updated_at', { ascending: false }),
          supabase
            .from('menus')
            .select('id, parent_id, menu_type, label_fa, label_en, component_path, is_visible')
            .eq('is_visible', true)
        ]);

        if (specialistsRes.error) throw specialistsRes.error;
        if (bugsRes.error) throw bugsRes.error;
        if (menusRes.error) throw menusRes.error;

        const loadedSpecialists = specialistsRes.data || [];
        const loadedBugs = bugsRes.data || [];
        const loadedMenus = menusRes.data || [];

        const byId = {};
        loadedMenus.forEach(item => { byId[item.id] = item; });
        const parentsWithChildren = new Set(loadedMenus.map(item => item.parent_id).filter(Boolean));
        const formLeaves = loadedMenus.filter(item => item.menu_type === 'form' && !parentsWithChildren.has(item.id));

        const resolvePath = (node) => {
          const labels = [];
          let current = node;
          let guard = 0;
          while (current && guard < 12) {
            const lbl = isRtl ? (current.label_fa || current.label_en) : (current.label_en || current.label_fa);
            if (lbl) labels.unshift(lbl);
            current = current.parent_id ? byId[current.parent_id] : null;
            guard += 1;
          }
          return labels.join(' / ');
        };

        const normalizedMenuForms = formLeaves
          .map(item => ({
            value: item.component_path || item.label_fa || item.label_en,
            label: resolvePath(item),
            name: isRtl ? (item.label_fa || item.label_en || '-') : (item.label_en || item.label_fa || '-'),
            path: resolvePath(item),
            component_path: item.component_path
          }))
          .filter(item => !!item.value)
          .sort((a, b) => a.label.localeCompare(b.label, 'fa'));

        setMenuForms(normalizedMenuForms);

        setSpecialists(loadedSpecialists);

        if (!loadedBugs.length) {
          setBugs([]);
          setAttachmentCounts({});
          setCommentedIds(new Set());
          return;
        }

        const bugIds = loadedBugs.map(b => b.id);

        const [bugAssignRes, tasksRes, attachRes, commentsRes] = await Promise.all([
          supabase.from(BUG_ASSIGN_TABLE).select('bug_id, specialist_id').in('bug_id', bugIds),
          supabase.from(TASK_TABLE).select('id, bug_id, title, is_done, sort_order').in('bug_id', bugIds),
          supabase.from('fm_attachments').select('entity_id').eq('entity_type', ATTACHMENT_ENTITY).in('entity_id', bugIds.map(id => String(id))),
          supabase.from('sys_comments').select('entity_id').eq('entity_type', BUGS_TABLE).in('entity_id', bugIds.map(id => String(id)))
        ]);

        const taskIds = (tasksRes.data || []).map(x => x.id);
        let taskAssignRows = [];
        if (taskIds.length) {
          const { data: taskAssignData, error: taskAssignError } = await supabase
            .from(TASK_ASSIGN_TABLE)
            .select('task_id, specialist_id')
            .in('task_id', taskIds);
          if (taskAssignError) throw taskAssignError;
          taskAssignRows = taskAssignData || [];
        }

        const bugAssignRows = bugAssignRes.data || [];
        const taskRows = tasksRes.data || [];

        const taskAssignByTask = {};
        taskAssignRows.forEach(x => {
          if (!taskAssignByTask[x.task_id]) taskAssignByTask[x.task_id] = [];
          taskAssignByTask[x.task_id].push(x.specialist_id);
        });

        const tasksByBug = {};
        taskRows.forEach(task => {
          if (!tasksByBug[task.bug_id]) tasksByBug[task.bug_id] = [];
          tasksByBug[task.bug_id].push({
            ...task,
            assignee_ids: taskAssignByTask[task.id] || []
          });
        });

        const assigneesByBug = {};
        bugAssignRows.forEach(row => {
          if (!assigneesByBug[row.bug_id]) assigneesByBug[row.bug_id] = [];
          assigneesByBug[row.bug_id].push(row.specialist_id);
        });

        const attachCounts = {};
        (attachRes.data || []).forEach(a => {
          attachCounts[a.entity_id] = (attachCounts[a.entity_id] || 0) + 1;
        });
        setAttachmentCounts(attachCounts);
        setCommentedIds(new Set((commentsRes.data || []).map(c => String(c.entity_id))));

        const merged = loadedBugs.map(bug => {
          const checklist = (tasksByBug[bug.id] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          const doneCount = checklist.filter(c => c.is_done).length;
          return {
            ...bug,
            assignee_ids: assigneesByBug[bug.id] || [],
            checklist,
            checklist_total: checklist.length,
            checklist_done: doneCount,
            checklist_progress: checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0
          };
        });

        setBugs(merged);
      } catch (error) {
        console.error('BugTracker fetch error:', error);
        showToast(t('خطا در دریافت اطلاعات رهگیری مشکلات', 'Error loading bug tracker data'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [showToast, t, isRtl]);

    useEffect(() => {
      if (access.canView) fetchAllData();
    }, [fetchAllData, access.canView]);

    useEffect(() => {
      const handleFilterToRecord = (e) => {
        if (e.detail && e.detail.form_component === 'BugTracker') {
          setFilteredRecordId(String(e.detail.entity_id));
        }
      };
      window.addEventListener('filterToRecord', handleFilterToRecord);
      return () => window.removeEventListener('filterToRecord', handleFilterToRecord);
    }, []);

    const openBugModal = useCallback((mode, row) => {
      if (mode === 'EDIT' && row) {
        setBugForm({
          id: row.id,
          title: row.title || '',
          form_name: row.form_name || '',
          is_general: !!row.is_general,
          priority: row.priority || 'MEDIUM',
          overall_status: row.overall_status || 'OPEN',
          fix_status: row.fix_status || 'TODO',
          qa_status: row.qa_status || 'PENDING',
          description: row.description || '',
          assignee_ids: row.assignee_ids || [],
          checklist: (row.checklist || []).map((task, idx) => ({
            ...task,
            local_id: task.local_id || `${task.id || 'existing'}-${idx}`
          }))
        });
      } else {
        setBugForm(getInitialBugForm());
      }
      setNewTaskTitle('');
      setBugModal({ isOpen: true, mode });
    }, []);

    const copyBugAsNew = useCallback((row) => {
      if (!row) return;
      setBugForm({
        id: null,
        title: row.title ? `${row.title} ${t('(کپی)', '(Copy)')}` : '',
        form_name: row.form_name || '',
        is_general: !!row.is_general,
        priority: row.priority || 'MEDIUM',
        overall_status: 'OPEN',
        fix_status: 'TODO',
        qa_status: 'PENDING',
        description: row.description || '',
        assignee_ids: row.assignee_ids || [],
        checklist: (row.checklist || []).map((task, idx) => ({
          id: null,
          local_id: `copy-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          title: task.title || '',
          is_done: false,
          assignee_ids: task.assignee_ids || []
        }))
      });
      setNewTaskTitle('');
      setBugModal({ isOpen: true, mode: 'CREATE' });
    }, [t]);

    const copyCurrentFormAsNew = useCallback(() => {
      setBugForm(prev => ({
        ...prev,
        id: null,
        title: prev.title ? `${prev.title} ${t('(کپی)', '(Copy)')}` : '',
        overall_status: 'OPEN',
        fix_status: 'TODO',
        qa_status: 'PENDING',
        checklist: (prev.checklist || []).map((task, idx) => ({
          ...task,
          id: null,
          local_id: `copy-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          is_done: false
        }))
      }));
      setBugModal({ isOpen: true, mode: 'CREATE' });
      showToast(t('نسخه کپی برای ثبت باگ جدید آماده شد.', 'Copied draft is ready for a new bug.'), 'success');
    }, [showToast, t]);

    const closeBugModal = useCallback(() => {
      setBugModal({ isOpen: false, mode: 'CREATE' });
      setBugForm(getInitialBugForm());
      setNewTaskTitle('');
    }, []);

    const addChecklistTask = useCallback(() => {
      const title = newTaskTitle.trim();
      if (!title) return;
      setBugForm(prev => ({
        ...prev,
        checklist: [
          {
            id: null,
            local_id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title,
            is_done: false,
            assignee_ids: []
          },
          ...prev.checklist
        ]
      }));
      setNewTaskTitle('');
    }, [newTaskTitle]);

    const updateChecklistTaskTitle = useCallback((localId, title) => {
      setBugForm(prev => ({
        ...prev,
        checklist: prev.checklist.map(task => task.local_id === localId ? { ...task, title } : task)
      }));
    }, []);

    const removeChecklistTask = useCallback((localId) => {
      setBugForm(prev => ({
        ...prev,
        checklist: prev.checklist.filter(task => task.local_id !== localId)
      }));
    }, []);

    const toggleChecklistDone = useCallback((localId, value) => {
      setBugForm(prev => ({
        ...prev,
        checklist: prev.checklist.map(task => task.local_id === localId ? { ...task, is_done: value } : task)
      }));
    }, []);

    const toggleTaskAssignee = useCallback((localId, specialistId) => {
      setBugForm(prev => ({
        ...prev,
        checklist: prev.checklist.map(task => {
          if (task.local_id !== localId) return task;
          const exists = (task.assignee_ids || []).includes(specialistId);
          return {
            ...task,
            assignee_ids: exists
              ? (task.assignee_ids || []).filter(x => x !== specialistId)
              : [...(task.assignee_ids || []), specialistId]
          };
        })
      }));
    }, []);

    const toggleBugAssignee = useCallback((specialistId) => {
      setBugForm(prev => {
        const exists = prev.assignee_ids.includes(specialistId);
        return {
          ...prev,
          assignee_ids: exists
            ? prev.assignee_ids.filter(x => x !== specialistId)
            : [...prev.assignee_ids, specialistId]
        };
      });
    }, []);

    const saveBug = useCallback(async () => {
      const title = (bugForm.title || '').trim();
      const formName = (bugForm.form_name || '').trim();
      const isGeneral = !!bugForm.is_general;

      if (!title || (!isGeneral && !formName)) {
        showToast(t('عنوان باگ الزامی است و در حالت غیرعمومی باید نام فرم هم وارد شود.', 'Bug title is required, and form is required for non-general bugs.'), 'warning');
        return;
      }

      setIsLoading(true);
      try {
        const nowIso = new Date().toISOString();
        const payload = {
          title,
          form_name: isGeneral ? null : formName,
          is_general: isGeneral,
          priority: bugForm.priority,
          overall_status: bugForm.overall_status,
          fix_status: bugForm.fix_status,
          qa_status: bugForm.qa_status,
          description: bugForm.description || null,
          updated_by: currentUserId,
          updated_at: nowIso,
          closed_at: ['DONE', 'CLOSED'].includes(bugForm.overall_status) ? nowIso : null
        };

        const normalizedChecklist = (bugForm.checklist || [])
          .map((item, idx) => ({
            local_id: item.local_id || `new-${Date.now()}-${idx}`,
            title: (item.title || '').trim(),
            is_done: !!item.is_done,
            assignee_ids: item.assignee_ids || [],
            sort_order: idx + 1
          }))
          .filter(item => !!item.title);

        let bugId = bugForm.id;

        if (bugForm.id) {
          const { error } = await supabase.from(BUGS_TABLE).update(payload).eq('id', bugForm.id);
          if (error) throw error;
        } else {
          const insertPayload = {
            ...payload,
            created_by: currentUserId
          };
          const { data, error } = await supabase.from(BUGS_TABLE).insert([insertPayload]).select('id').single();
          if (error) throw error;
          bugId = data.id;
        }

        await supabase.from(BUG_ASSIGN_TABLE).delete().eq('bug_id', bugId);
        if (bugForm.assignee_ids.length) {
          const bugAssRows = bugForm.assignee_ids.map(specialistId => ({
            bug_id: bugId,
            specialist_id: specialistId
          }));
          const { error: assignError } = await supabase.from(BUG_ASSIGN_TABLE).insert(bugAssRows);
          if (assignError) throw assignError;
        }

        const { data: oldTaskRows, error: oldTaskErr } = await supabase.from(TASK_TABLE).select('id').eq('bug_id', bugId);
        if (oldTaskErr) throw oldTaskErr;

        const oldTaskIds = (oldTaskRows || []).map(x => x.id);
        if (oldTaskIds.length) {
          const { error: oldTaskAssignDelErr } = await supabase.from(TASK_ASSIGN_TABLE).delete().in('task_id', oldTaskIds);
          if (oldTaskAssignDelErr) throw oldTaskAssignDelErr;
        }

        const { error: oldTaskDelErr } = await supabase.from(TASK_TABLE).delete().eq('bug_id', bugId);
        if (oldTaskDelErr) throw oldTaskDelErr;

        if (normalizedChecklist.length) {
          const taskRows = normalizedChecklist.map(item => ({
            bug_id: bugId,
            title: item.title,
            is_done: item.is_done,
            sort_order: item.sort_order
          }));

          const { data: createdTasks, error: taskInsertErr } = await supabase
            .from(TASK_TABLE)
            .insert(taskRows)
            .select('id, sort_order');

          if (taskInsertErr) throw taskInsertErr;

          const taskIdBySortOrder = new Map((createdTasks || []).map(task => [task.sort_order, task.id]));
          const allTaskAssignRows = normalizedChecklist.flatMap(item => {
            const taskId = taskIdBySortOrder.get(item.sort_order);
            if (!taskId || !(item.assignee_ids || []).length) return [];
            return item.assignee_ids.map(specialistId => ({
              task_id: taskId,
              specialist_id: specialistId
            }));
          });

          if (allTaskAssignRows.length) {
            const { error: taskAssignErr } = await supabase.from(TASK_ASSIGN_TABLE).insert(allTaskAssignRows);
            if (taskAssignErr) throw taskAssignErr;
          }
        }

        const checklistDone = normalizedChecklist.filter(item => item.is_done).length;
        const optimisticBug = {
          id: bugId,
          ...payload,
          assignee_ids: bugForm.assignee_ids || [],
          checklist: normalizedChecklist,
          checklist_total: normalizedChecklist.length,
          checklist_done: checklistDone,
          checklist_progress: normalizedChecklist.length ? Math.round((checklistDone / normalizedChecklist.length) * 100) : 0
        };

        setBugs(prev => {
          if (bugForm.id) {
            return prev.map(row => row.id === bugId ? { ...row, ...optimisticBug } : row);
          }
          return [optimisticBug, ...prev];
        });

        showToast(t('باگ با موفقیت ذخیره شد.', 'Bug saved successfully.'), 'success');
        closeBugModal();
        fetchAllData();
      } catch (error) {
        console.error('BugTracker save error:', error);
        showToast(t('خطا در ذخیره باگ', 'Error saving bug'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [bugForm, currentUserId, showToast, t, closeBugModal, fetchAllData]);

    const executeDelete = useCallback(async () => {
      if (!deleteConfirm.data) return;
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'BUG_BULK') {
          const targetIds = Array.isArray(deleteConfirm.data) ? deleteConfirm.data.filter(Boolean) : [];
          if (!targetIds.length) {
            setDeleteConfirm({ isOpen: false, type: null, data: null });
            return;
          }
          const { error } = await supabase.from(BUGS_TABLE).delete().in('id', targetIds);
          if (error) throw error;
          showToast(t(`${targetIds.length} باگ حذف شد.`, `${targetIds.length} bugs deleted.`), 'success');
        } else {
          const { error } = await supabase.from(BUGS_TABLE).delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          showToast(t('باگ حذف شد.', 'Bug deleted.'), 'success');
        }
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        fetchAllData();
      } catch (error) {
        console.error('BugTracker delete error:', error);
        showToast(t('خطا در حذف باگ', 'Error deleting bug'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [deleteConfirm.data, fetchAllData, showToast, t]);

    const executeBulkStatusChange = useCallback(async () => {
      const targetIds = (bulkStatusModal.ids || []).filter(Boolean);
      if (!targetIds.length) {
        setBulkStatusModal({ isOpen: false, ids: [], value: 'OPEN' });
        return;
      }

      const statusValue = bulkStatusModal.value || 'OPEN';
      setIsLoading(true);
      try {
        const nowIso = new Date().toISOString();
        const payload = {
          overall_status: statusValue,
          updated_by: currentUserId,
          updated_at: nowIso,
          closed_at: statusValue === 'CLOSED' ? nowIso : null
        };

        const { error } = await supabase
          .from(BUGS_TABLE)
          .update(payload)
          .in('id', targetIds);

        if (error) throw error;
        showToast(t('وضعیت باگ‌های انتخابی بروزرسانی شد.', 'Status updated for selected bugs.'), 'success');
        setBulkStatusModal({ isOpen: false, ids: [], value: 'OPEN' });
        fetchAllData();
      } catch (error) {
        console.error('Bulk status update error:', error);
        showToast(t('خطا در تغییر وضعیت گروهی', 'Error updating bulk status'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [bulkStatusModal, currentUserId, fetchAllData, showToast, t]);

    const executeBulkAssigneeChange = useCallback(async () => {
      const targetIds = (bulkAssigneeModal.ids || []).filter(Boolean);
      if (!targetIds.length) {
        setBulkAssigneeModal({ isOpen: false, ids: [], assignee_ids: [] });
        return;
      }

      const assigneeIds = Array.from(new Set((bulkAssigneeModal.assignee_ids || []).filter(Boolean)));
      setIsLoading(true);
      try {
        const { error: deleteAssignErr } = await supabase
          .from(BUG_ASSIGN_TABLE)
          .delete()
          .in('bug_id', targetIds);
        if (deleteAssignErr) throw deleteAssignErr;

        if (assigneeIds.length) {
          const assignmentRows = [];
          targetIds.forEach(bugId => {
            assigneeIds.forEach(specialistId => {
              assignmentRows.push({ bug_id: bugId, specialist_id: specialistId });
            });
          });
          const { error: insertAssignErr } = await supabase.from(BUG_ASSIGN_TABLE).insert(assignmentRows);
          if (insertAssignErr) throw insertAssignErr;
        }

        const { error: updateMetaErr } = await supabase
          .from(BUGS_TABLE)
          .update({
            updated_by: currentUserId,
            updated_at: new Date().toISOString()
          })
          .in('id', targetIds);
        if (updateMetaErr) throw updateMetaErr;

        showToast(t('مسئول انجام برای موارد انتخابی بروزرسانی شد.', 'Assignees updated for selected bugs.'), 'success');
        setBulkAssigneeModal({ isOpen: false, ids: [], assignee_ids: [] });
        fetchAllData();
      } catch (error) {
        console.error('Bulk assignee update error:', error);
        showToast(t('خطا در تغییر مسئول انجام گروهی', 'Error updating bulk assignees'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [bulkAssigneeModal, currentUserId, fetchAllData, showToast, t]);

    const reopenBug = useCallback(async (row) => {
      if (!['DONE', 'CLOSED'].includes(row?.overall_status)) {
        showToast(t('فقط باگ‌های انجام‌شده/بسته‌شده قابل بازگشایی هستند.', 'Only done/closed bugs can be reopened.'), 'warning');
        return;
      }
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from(BUGS_TABLE)
          .update({
            overall_status: 'REOPENED',
            fix_status: 'IN_PROGRESS',
            qa_status: 'PENDING',
            closed_at: null,
            updated_by: currentUserId,
            updated_at: new Date().toISOString()
          })
          .eq('id', row.id);
        if (error) throw error;
        showToast(t('باگ دوباره باز شد.', 'Bug reopened.'), 'success');
        fetchAllData();
      } catch (error) {
        console.error('Reopen bug error:', error);
        showToast(t('خطا در بازگشایی باگ', 'Error reopening bug'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [currentUserId, fetchAllData, showToast, t]);

    const loadAttachments = useCallback(async (bugId) => {
      if (!bugId) return;
      try {
        const { data, error } = await supabase
          .from('fm_attachments')
          .select('*')
          .eq('entity_type', ATTACHMENT_ENTITY)
          .eq('entity_id', String(bugId))
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAttachModal(prev => ({ ...prev, files: data || [] }));
      } catch (error) {
        console.error('Load attachments error:', error);
        showToast(t('خطا در دریافت پیوست‌ها', 'Error loading attachments'), 'error');
      }
    }, [showToast, t]);

    const openAttachments = useCallback((row) => {
      setAttachModal({ isOpen: true, bug: row, files: [] });
      loadAttachments(row.id);
    }, [loadAttachments]);

    const openCurrentBugAttachments = useCallback(() => {
      if (!bugForm.id) {
        showToast(t('برای افزودن پیوست، ابتدا باگ را ذخیره کنید.', 'Save the bug first to add attachments.'), 'warning');
        return;
      }
      const currentRow = {
        id: bugForm.id,
        title: bugForm.title || '-'
      };
      openAttachments(currentRow);
    }, [bugForm.id, bugForm.title, openAttachments, showToast, t]);

    const handleFileUpload = useCallback(async (files) => {
      if (!files || !files.length || !attachModal.bug) return;

      setIsUploading(true);
      try {
        for (const file of files) {
          const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
          const fileName = `${attachModal.bug.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
          const filePath = `bug-tracker/${fileName}`;

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
            entity_type: ATTACHMENT_ENTITY,
            entity_id: String(attachModal.bug.id),
            file_name: file.name,
            file_size: file.size,
            file_type: file.type || 'application/octet-stream',
            file_url: fileUrl,
            created_by: currentUserId
          };

          const { error } = await supabase.from('fm_attachments').insert([payload]);
          if (error) throw error;
        }

        showToast(t('فایل‌ها با موفقیت پیوست شدند.', 'Files attached successfully.'), 'success');
        loadAttachments(attachModal.bug.id);
        fetchAllData();
      } catch (error) {
        console.error('Attachment upload error:', error);
        showToast(t('خطا در آپلود پیوست', 'Error uploading attachment'), 'error');
      } finally {
        setIsUploading(false);
      }
    }, [attachModal.bug, currentUserId, fetchAllData, loadAttachments, showToast, t]);

    const handleDeleteAttachment = useCallback(async (file) => {
      if (!file?.id) return;
      try {
        const { error } = await supabase.from('fm_attachments').delete().eq('id', file.id);
        if (error) throw error;
        showToast(t('پیوست حذف شد.', 'Attachment deleted.'), 'success');
        loadAttachments(attachModal.bug.id);
        fetchAllData();
      } catch (error) {
        console.error('Attachment delete error:', error);
        showToast(t('خطا در حذف پیوست', 'Error deleting attachment'), 'error');
      }
    }, [attachModal.bug, fetchAllData, loadAttachments, showToast, t]);

    const saveSpecialist = useCallback(async () => {
      const fullName = (specialistForm.full_name || '').trim();
      const skillTitle = (specialistForm.skill_title || '').trim();
      if (!fullName) {
        showToast(t('نام فرد الزامی است.', 'Full name is required.'), 'warning');
        return;
      }

      setIsLoading(true);
      try {
        const payload = {
          full_name: fullName,
          skill_title: skillTitle || null,
          is_active: specialistForm.is_active,
          updated_at: new Date().toISOString()
        };

        if (specialistForm.id) {
          const { error } = await supabase.from(SPECIALISTS_TABLE).update(payload).eq('id', specialistForm.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from(SPECIALISTS_TABLE).insert([payload]);
          if (error) throw error;
        }

        setSpecialistForm({ id: null, full_name: '', skill_title: '', is_active: true });
        showToast(t('فرد ذخیره شد.', 'Specialist saved.'), 'success');
        fetchAllData();
      } catch (error) {
        console.error('Save specialist error:', error);
        showToast(t('خطا در ذخیره اطلاعات فرد', 'Error saving specialist'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [fetchAllData, showToast, specialistForm, t]);

    const deleteSpecialist = useCallback(async (row) => {
      setIsLoading(true);
      try {
        const { error } = await supabase.from(SPECIALISTS_TABLE).delete().eq('id', row.id);
        if (error) throw error;
        showToast(t('فرد حذف شد.', 'Specialist deleted.'), 'success');

        setBugForm(prev => ({
          ...prev,
          assignee_ids: prev.assignee_ids.filter(x => x !== row.id),
          checklist: prev.checklist.map(task => ({
            ...task,
            assignee_ids: (task.assignee_ids || []).filter(x => x !== row.id)
          }))
        }));

        fetchAllData();
      } catch (error) {
        console.error('Delete specialist error:', error);
        showToast(t('خطا در حذف فرد', 'Error deleting specialist'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [fetchAllData, showToast, t]);

    const bugColumns = useMemo(() => [
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
    ], [getBadgeVariant, getLabel, specialistsMap, menuForms, t]);

    const formNameOptions = useMemo(() => {
      const values = new Map();
      menuForms.forEach(item => {
        values.set(item.value, item.label || item.value);
      });
      bugs.forEach(b => {
        if (b.form_name && !values.has(b.form_name)) values.set(b.form_name, b.form_name);
      });
      return Array.from(values.entries()).map(([value, label]) => ({ value, label }));
    }, [bugs, menuForms]);

    const specialistOptions = useMemo(() => {
      return activeSpecialists.map(s => ({ value: s.id, label: `${s.full_name}${s.skill_title ? ` (${s.skill_title})` : ''}` }));
    }, [activeSpecialists]);

    const taskSpecialistOptions = useMemo(() => {
      return activeSpecialists.map(s => ({ value: s.id, label: s.full_name || '-' }));
    }, [activeSpecialists]);

    const filteredBugs = useMemo(() => {
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

        return true;
      });
    }, [bugs, filters]);

    const filterFields = useMemo(() => [
      { name: 'assignee_id', label: t('مسئول انجام تسک', 'Task assignee'), type: 'select', options: [{ value: '', label: t('همه', 'All') }, ...specialistOptions] },
      { name: 'show_done', label: t('مشاهده موارد تکمیل شده', 'Show completed items'), type: 'toggle' }
    ], [t, specialistOptions]);

    const specialistColumns = useMemo(() => [
      { field: 'full_name', header_fa: 'نام', header_en: 'Full Name', width: '180px' },
      { field: 'skill_title', header_fa: 'تخصص', header_en: 'Skill', width: '160px' },
      { field: 'is_active', header_fa: 'فعال', header_en: 'Active', width: '90px', type: 'toggle' }
    ], []);

    const { CommentModal } = window.DSComments || {};

    if (!access.canView) {
      return (
        <div className="h-full p-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <EmptyState
            icon={AlertTriangle}
            title={t('عدم دسترسی', 'No Access')}
            description={t('شما مجوز مشاهده این فرم را ندارید.', 'You do not have access to this form.')}
          />
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex-1 flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900 overflow-hidden">
          <PageHeader
            title={t('رهگیری مشکلات', 'Bug Tracker')}
            icon={Bug}
            description={t('ثبت، تخصیص، کنترل و بستن/بازگشایی مشکلات فرم‌ها', 'Track, assign, control, close/reopen form issues')}
            language={language}
            breadcrumbs={[{ label: t('امکانات عمومی سیستم', 'System Utilities') }, { label: t('رهگیری مشکلات', 'Bug Tracker') }]}
            notifFilter={filteredRecordId ? { isActive: true, onClear: () => setFilteredRecordId(null) } : null}
          />

          <div className="mt-2 flex-1 min-h-0 flex flex-col gap-3">
            <AdvancedFilter
              fields={filterFields}
              initialValues={filters}
              onFilter={setFilters}
              onClear={() => setFilters({ show_done: false, assignee_id: '' })}
              language={language}
            />

            <div className="flex-1 min-h-0">
              <DataGrid
                data={filteredRecordId ? filteredBugs.filter(row => String(row.id) === filteredRecordId) : filteredBugs}
                columns={bugColumns}
                language={language}
                formCode={formCode}
                selectable={true}
                onSelectionChange={setSelectedBugIds}
                reserveMiddleSpace={false}
                gridState={gridState}
                onGridStateChange={setGridState}
                actionWidth="220px"
                hideImport={true}
                onAdd={access.canCreate ? () => openBugModal('CREATE') : undefined}
                toolbarContent={
                  <div className="flex items-center gap-2 min-w-0 flex-nowrap">
                    <Button className="shrink-0" variant="outline" size="sm" icon={Settings} onClick={() => setSpecialistModalOpen(true)}>
                      {t('تعریف افراد و تخصص‌ها', 'Manage Specialists')}
                    </Button>

                    {selectedBugIds.length > 0 ? (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/30 shrink-0 whitespace-nowrap">
                        <span className="text-[11px] font-black text-indigo-800 dark:text-indigo-300 whitespace-nowrap">
                          {selectedBugIds.length} {t('مورد انتخاب شده', 'Items selected')}
                        </span>

                        {access.canEdit ? (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={CheckCircle2}
                            className="!h-7 text-[10px]"
                            onClick={() => setBulkStatusModal({ isOpen: true, ids: selectedBugIds, value: 'OPEN' })}
                          >
                            {t('تغییر وضعیت گروهی', 'Bulk Status Change')}
                          </Button>
                        ) : null}

                        {access.canEdit ? (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Users}
                            className="!h-7 text-[10px]"
                            onClick={() => setBulkAssigneeModal({ isOpen: true, ids: selectedBugIds, assignee_ids: [] })}
                          >
                            {t('تغییر مسئول انجام', 'Bulk Assignee Change')}
                          </Button>
                        ) : null}

                        {access.canDelete ? (
                          <Button
                            size="sm"
                            variant="danger-outline"
                            icon={Trash2}
                            className="!h-7 text-[10px]"
                            onClick={() => setDeleteConfirm({ isOpen: true, type: 'BUG_BULK', data: selectedBugIds })}
                          >
                            {t('حذف گروهی', 'Delete Selected')}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                }
                onRowDoubleClick={row => openBugModal('EDIT', row)}
                actions={[
                  {
                    icon: MessageSquare,
                    tooltip: t('کامنت‌ها', 'Comments'),
                    onClick: row => setCommentModalState({ isOpen: true, record: row }),
                    className: row => commentedIds.has(String(row.id)) ? 'text-blue-500 hover:text-blue-600' : 'text-slate-400 hover:text-blue-600'
                  },
                  {
                    icon: Paperclip,
                    tooltip: t('پیوست‌ها', 'Attachments'),
                    onClick: row => openAttachments(row),
                    className: row => attachmentCounts[String(row.id)] > 0 ? '!text-indigo-600 hover:!text-indigo-700' : '!text-slate-400 hover:!text-slate-600'
                  },
                  {
                    icon: Copy,
                    tooltip: t('کپی و ایجاد باگ جدید', 'Copy and create new bug'),
                    onClick: row => copyBugAsNew(row),
                    requiredAccess: 'create',
                    className: 'text-emerald-600 hover:text-emerald-700'
                  },
                  {
                    icon: RotateCcw,
                    tooltip: t('بازگشایی مجدد', 'Reopen'),
                    onClick: row => reopenBug(row),
                    requiredAccess: 'edit',
                    className: row => ['DONE', 'CLOSED'].includes(row.overall_status) ? 'text-amber-600 hover:text-amber-700' : '!text-slate-200 dark:!text-slate-700 cursor-not-allowed'
                  },
                  {
                    icon: Edit,
                    tooltip: t('ویرایش', 'Edit'),
                    onClick: row => openBugModal('EDIT', row),
                    requiredAccess: 'edit',
                    className: 'text-slate-500 hover:text-indigo-600'
                  },
                  {
                    icon: Trash2,
                    tooltip: t('حذف', 'Delete'),
                    onClick: row => setDeleteConfirm({ isOpen: true, type: 'BUG', data: row }),
                    requiredAccess: 'delete',
                    className: 'text-slate-400 hover:text-red-600'
                  }
                ]}
              />
            </div>
          </div>
        </div>

        <Modal
          isOpen={bugModal.isOpen}
          onClose={closeBugModal}
          title={bugModal.mode === 'EDIT' ? t('ویرایش باگ', 'Edit Bug') : t('ثبت باگ جدید', 'New Bug')}
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
            {bugModal.mode === 'EDIT' ? (
              <Button variant="outline" size="sm" icon={Copy} onClick={copyCurrentFormAsNew}>
                {t('کپی و ایجاد جدید', 'Copy as New')}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={closeBugModal}>
              {t('انصراف', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" icon={Save} onClick={saveBug} isLoading={isLoading}>
              {t('ذخیره', 'Save')}
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={specialistModalOpen}
          onClose={() => setSpecialistModalOpen(false)}
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
            <Button variant="primary" size="sm" onClick={() => setSpecialistModalOpen(false)}>
              {t('بستن', 'Close')}
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={attachModal.isOpen}
          onClose={() => setAttachModal({ isOpen: false, bug: null, files: [] })}
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
            <Button variant="primary" size="sm" onClick={() => setAttachModal({ isOpen: false, bug: null, files: [] })}>
              {t('بستن', 'Close')}
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={bulkStatusModal.isOpen}
          onClose={() => setBulkStatusModal({ isOpen: false, ids: [], value: 'OPEN' })}
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
              label={t('وضعیت کلی', 'Overall Status')}
              value={bulkStatusModal.value}
              onChange={e => setBulkStatusModal(prev => ({ ...prev, value: e.target.value }))}
              options={OVERALL_STATUS_OPTIONS.map(x => ({ value: x.value, label: isRtl ? x.fa : x.en }))}
              formCode={formCode}
            />
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkStatusModal({ isOpen: false, ids: [], value: 'OPEN' })}>
              {t('انصراف', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" icon={Save} onClick={executeBulkStatusChange} isLoading={isLoading}>
              {t('اعمال تغییرات', 'Apply Changes')}
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={bulkAssigneeModal.isOpen}
          onClose={() => setBulkAssigneeModal({ isOpen: false, ids: [], assignee_ids: [] })}
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
            <Button variant="outline" size="sm" onClick={() => setBulkAssigneeModal({ isOpen: false, ids: [], assignee_ids: [] })}>
              {t('انصراف', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" icon={Save} onClick={executeBulkAssigneeChange} isLoading={isLoading}>
              {t('اعمال تغییرات', 'Apply Changes')}
            </Button>
          </div>
        </Modal>

        <Dialog
          isOpen={deleteConfirm.isOpen}
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

        {CommentModal && commentModalState.isOpen ? (
          <CommentModal
            isOpen={commentModalState.isOpen}
            onClose={() => { setCommentModalState({ isOpen: false, record: null }); fetchAllData(); }}
            entityType={BUGS_TABLE}
            entityId={commentModalState.record ? String(commentModalState.record.id) : ''}
            entityTitle={commentModalState.record ? `${t('عنوان:', 'Title:')} ${commentModalState.record.title || '-'}  |  ${t('فرم:', 'Form:')} ${commentModalState.record.form_name || '-'}` : ''}
            formTitle={t('رهگیری مشکلات', 'Bug Tracker')}
            formComponent="BugTracker"
            language={language}
          />
        ) : null}

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />
      </div>
    );
  };

  window.BugTracker = BugTracker;
})();
