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
    Settings = FallbackIcon
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

  const bugPanels = window.BugTrackerPanels || {};
  const PRIORITY_OPTIONS = bugPanels.PRIORITY_OPTIONS || [];
  const OVERALL_STATUS_OPTIONS = bugPanels.OVERALL_STATUS_OPTIONS || [];
  const FIX_STATUS_OPTIONS = bugPanels.FIX_STATUS_OPTIONS || [];
  const QA_STATUS_OPTIONS = bugPanels.QA_STATUS_OPTIONS || [];

  const getSessionUserId = () => {
    try {
      const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
      return JSON.parse(s).id || null;
    } catch {
      return null;
    }
  };

  const getInitialBugForm = bugPanels.getInitialBugForm || (() => ({
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
  }));
  const MultiSelectDropdown = bugPanels.MultiSelectDropdown || (() => null);

  const BugTracker = ({ language = 'fa', formCode = FORM_CODE }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const a = securityCtx ? securityCtx.getActions(formCode) : null;
      return a || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const {
      buildBugColumns = () => [],
      getFormNameOptions = () => [],
      getSpecialistOptions = () => [],
      getTaskSpecialistOptions = () => [],
      getFilteredBugs = () => [],
      getFilterFields = () => [],
      getSpecialistColumns = () => [],
      BugFormModal,
      SpecialistModal,
      AttachmentModal,
      BulkStatusModal,
      BulkAssigneeModal,
      DeleteConfirmDialog
    } = window.BugTrackerPanels || {};
    const { CommentModal } = window.DSComments || {};

    const currentUserId = getSessionUserId();

    const [isLoading, setIsLoading] = useState(false);
    const [bugs, setBugs] = useState([]);
    const [specialists, setSpecialists] = useState([]);
    const [menuForms, setMenuForms] = useState([]);
    const [attachmentCounts, setAttachmentCounts] = useState({});
    const [filters, setFilters] = useState({
      show_done: false,
      assignee_id: '',
      has_attachment: false,
      has_comment: false
    });
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

    const bugColumns = useMemo(() => buildBugColumns({ t, menuForms, Badge, getLabel, getBadgeVariant, specialistsMap }), [getBadgeVariant, getLabel, specialistsMap, menuForms, t]);

    const formNameOptions = useMemo(() => getFormNameOptions(bugs, menuForms), [bugs, menuForms]);

    const specialistOptions = useMemo(() => getSpecialistOptions(activeSpecialists), [activeSpecialists]);

    const taskSpecialistOptions = useMemo(() => getTaskSpecialistOptions(activeSpecialists), [activeSpecialists]);

    const filteredBugs = useMemo(() => getFilteredBugs({ bugs, filters, attachmentCounts, commentedIds }), [bugs, filters, attachmentCounts, commentedIds]);

    const filterFields = useMemo(() => getFilterFields(t, specialistOptions), [t, specialistOptions]);

    const specialistColumns = useMemo(() => getSpecialistColumns(), []);

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
              onClear={() => setFilters({
                show_done: false,
                assignee_id: '',
                has_attachment: false,
                has_comment: false
              })}
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

        {BugFormModal ? (
          <BugFormModal
            isOpen={bugModal.isOpen}
            onClose={closeBugModal}
            mode={bugModal.mode}
            t={t}
            language={language}
            isRtl={isRtl}
            bugForm={bugForm}
            attachmentCounts={attachmentCounts}
            openCurrentBugAttachments={openCurrentBugAttachments}
            formCode={formCode}
            formNameOptions={formNameOptions}
            setBugForm={setBugForm}
            PRIORITY_OPTIONS={PRIORITY_OPTIONS}
            OVERALL_STATUS_OPTIONS={OVERALL_STATUS_OPTIONS}
            FIX_STATUS_OPTIONS={FIX_STATUS_OPTIONS}
            specialistOptions={specialistOptions}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            addChecklistTask={addChecklistTask}
            toggleChecklistDone={toggleChecklistDone}
            updateChecklistTaskTitle={updateChecklistTaskTitle}
            removeChecklistTask={removeChecklistTask}
            taskSpecialistOptions={taskSpecialistOptions}
            MultiSelectDropdown={MultiSelectDropdown}
            copyCurrentFormAsNew={copyCurrentFormAsNew}
            saveBug={saveBug}
            isLoading={isLoading}
            Button={Button}
            Modal={Modal}
            Card={Card}
            TextField={TextField}
            SelectField={SelectField}
            TextAreaField={TextAreaField}
            CheckboxField={CheckboxField}
            Save={Save}
            Copy={Copy}
            Paperclip={Paperclip}
            Plus={Plus}
            Trash2={Trash2}
          />
        ) : null}

        {SpecialistModal ? (
          <SpecialistModal
            isOpen={specialistModalOpen}
            onClose={() => setSpecialistModalOpen(false)}
            t={t}
            language={language}
            specialistForm={specialistForm}
            setSpecialistForm={setSpecialistForm}
            saveSpecialist={saveSpecialist}
            isLoading={isLoading}
            formCode={formCode}
            DataGrid={DataGrid}
            specialists={specialists}
            specialistColumns={specialistColumns}
            Button={Button}
            Modal={Modal}
            TextField={TextField}
            ToggleField={ToggleField}
            Edit={Edit}
            Trash2={Trash2}
            Save={Save}
            X={X}
            setDeleteConfirm={setDeleteConfirm}
          />
        ) : null}

        {AttachmentModal ? (
          <AttachmentModal
            isOpen={attachModal.isOpen}
            onClose={() => setAttachModal({ isOpen: false, bug: null, files: [] })}
            t={t}
            language={language}
            attachModal={attachModal}
            handleFileUpload={handleFileUpload}
            handleDeleteAttachment={handleDeleteAttachment}
            isUploading={isUploading}
            formCode={formCode}
            AttachmentManager={AttachmentManager}
            Button={Button}
            Modal={Modal}
          />
        ) : null}

        {BulkStatusModal ? (
          <BulkStatusModal
            isOpen={bulkStatusModal.isOpen}
            onClose={() => setBulkStatusModal({ isOpen: false, ids: [], value: 'OPEN' })}
            t={t}
            language={language}
            bulkStatusModal={bulkStatusModal}
            setBulkStatusModal={setBulkStatusModal}
            OVERALL_STATUS_OPTIONS={OVERALL_STATUS_OPTIONS}
            isRtl={isRtl}
            executeBulkStatusChange={executeBulkStatusChange}
            isLoading={isLoading}
            formCode={formCode}
            Button={Button}
            Modal={Modal}
            SelectField={SelectField}
            Save={Save}
          />
        ) : null}

        {BulkAssigneeModal ? (
          <BulkAssigneeModal
            isOpen={bulkAssigneeModal.isOpen}
            onClose={() => setBulkAssigneeModal({ isOpen: false, ids: [], assignee_ids: [] })}
            t={t}
            language={language}
            bulkAssigneeModal={bulkAssigneeModal}
            setBulkAssigneeModal={setBulkAssigneeModal}
            specialistOptions={specialistOptions}
            executeBulkAssigneeChange={executeBulkAssigneeChange}
            isLoading={isLoading}
            MultiSelectDropdown={MultiSelectDropdown}
            Button={Button}
            Modal={Modal}
            Save={Save}
          />
        ) : null}

        {DeleteConfirmDialog ? (
          <DeleteConfirmDialog
            isOpen={deleteConfirm.isOpen}
            t={t}
            language={language}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            deleteSpecialist={deleteSpecialist}
            executeDelete={executeDelete}
            Dialog={Dialog}
          />
        ) : null}

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
