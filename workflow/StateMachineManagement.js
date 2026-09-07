/* Filename: workflow/StateMachineManagement.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useEffect, useCallback } = React;

  function FallbackComponent() { return null; }
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

  const safeComp = (obj, name) => {
    const component = obj && obj[name];
    if (typeof component === 'function' || (component && component.$$typeof)) return component;
    if (component && component.default) return component.default;
    return FallbackComponent;
  };

  const safeIcon = (obj, name) => {
    const component = obj && obj[name];
    if (typeof component === 'function' || (component && component.$$typeof)) return component;
    if (component && component.default) return component.default;
    return FallbackIcon;
  };

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS;
  const Forms = window.DSForms || DS;
  const Grid = window.DSGrid || DS;
  const Feedback = window.DSFeedback || window.DSOverlays || DS;

  const Button = safeComp(Core, 'Button');
  const PageHeader = safeComp(Core, 'PageHeader');
  const SelectField = safeComp(Forms, 'SelectField');
  const TextField = safeComp(Forms, 'TextField');
  const ToggleField = safeComp(Forms, 'ToggleField');
  const DatePicker = safeComp(Forms, 'DatePicker');
  const DataGrid = safeComp(Grid, 'DataGrid');
  const AdvancedFilter = safeComp(Grid, 'AdvancedFilter');
  const Modal = safeComp(Feedback, 'Modal');
  const Toast = safeComp(Feedback, 'Toast');
  const Dialog = safeComp(Feedback, 'Dialog');

  const LucideIcons = window.LucideIcons || {};
  const Workflow = safeIcon(LucideIcons, 'Workflow');
  const Save = safeIcon(LucideIcons, 'Save');
  const Plus = safeIcon(LucideIcons, 'Plus');
  const Trash2 = safeIcon(LucideIcons, 'Trash2');
  const Edit = safeIcon(LucideIcons, 'Edit');
  const RefreshCw = safeIcon(LucideIcons, 'RefreshCw');
  const ArrowLeft = safeIcon(LucideIcons, 'ArrowLeft');
  const ArrowRight = safeIcon(LucideIcons, 'ArrowRight');
  const Sparkles = safeIcon(LucideIcons, 'Sparkles');
  const Link2 = safeIcon(LucideIcons, 'Link2');
  const UserRound = safeIcon(LucideIcons, 'UserRound');
  const Database = safeIcon(LucideIcons, 'Database');

  const designUtils = window.StateMachineControllerUtils || window.StateMachineDesignUtils || {};
  const useStateMachineController = window.useStateMachineController || window.useStateMachineDesign;

  const REQUEST_TYPES = [
    { value: 'TRANSFER', fa: 'انتقال وجه', en: 'Transfer' },
    { value: 'EXCHANGE', fa: 'تبدیل ارز', en: 'Exchange' },
    { value: 'BUDGET', fa: 'مصرف بودجه', en: 'Budget' },
    { value: 'GENERAL', fa: 'واریز/ برداشت', en: 'General' },
  ];

  const STATUS_LIST = designUtils.STATUS_LIST || [
    { value: 'DRAFT', fa: 'یادداشت', en: 'Draft' },
    { value: 'REGISTERED', fa: 'ثبت شده', en: 'Registered' },
    { value: 'REVIEWED', fa: 'بررسی شده', en: 'Reviewed' },
    { value: 'APPROVED', fa: 'تایید شده', en: 'Approved' },
    { value: 'IN_PROGRESS', fa: 'در حال انجام', en: 'In Progress' },
    { value: 'DONE', fa: 'انجام شده', en: 'Done' },
    { value: 'REJECTED', fa: 'عدم تایید', en: 'Rejected' },
    { value: 'CANCELED', fa: 'لغو شده', en: 'Canceled' },
    { value: 'CLOSED', fa: 'بسته شده', en: 'Closed' },
  ];

  const parseGraphJson = designUtils.parseGraphJson || ((raw) => {
    if (!raw) return { nodes: [], edges: [] };
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (error) { return { nodes: [], edges: [] }; }
    }
    return raw;
  });

  const normalizeSettingsForSave = designUtils.normalizeSettingsForSave || ((g) => g || { nodes: [], edges: [] });

  const ENTRY_CONDITION_FIELDS = [
    { value: 'request_type', fa: 'نوع درخواست', en: 'Request Type' },
    { value: 'status', fa: 'وضعیت درخواست', en: 'Request Status' },
    { value: 'payment_type', fa: 'نوع پرداخت', en: 'Payment Type' },
    { value: 'description', fa: 'شرح درخواست', en: 'Description' },
    { value: 'need_date', fa: 'تاریخ نیاز', en: 'Need Date' },
    { value: 'total_usd_amount', fa: 'جمع دلاری اقلام', en: 'Total USD Amount' },
    { value: 'items.description', fa: 'شرح اقلام', en: 'Item Description' },
    { value: 'items.currency', fa: 'ارز اقلام', en: 'Item Currency' },
    { value: 'items.transaction_action', fa: 'نوع تراکنش اقلام', en: 'Item Transaction Action' },
    { value: 'items.amount', fa: 'مبلغ اقلام', en: 'Item Amount' },
    { value: 'items.approved_amount', fa: 'مبلغ تایید شده اقلام', en: 'Item Approved Amount' },
  ];

  const ENTRY_CONDITION_FIELDS_BY_ENTITY = {
    REQ_REQUESTS: [
      { value: 'request_type', fa: 'نوع درخواست', en: 'Request Type' },
      { value: 'status', fa: 'وضعیت درخواست', en: 'Request Status' },
      { value: 'payment_type', fa: 'نوع پرداخت', en: 'Payment Type' },
      { value: 'description', fa: 'شرح درخواست', en: 'Description' },
      { value: 'need_date', fa: 'تاریخ نیاز', en: 'Need Date' },
    ],
  };

  const ENTRY_CONDITION_FIELD_TYPES = {
    request_type: 'enum',
    status: 'enum',
    payment_type: 'text',
    description: 'text',
    need_date: 'date',
    total_usd_amount: 'number',
    'items.description': 'text',
    'items.currency': 'text',
    'items.transaction_action': 'text',
    'items.amount': 'number',
    'items.approved_amount': 'number',
  };

  const ENTRY_CONDITION_OPERATORS_BY_TYPE = {
    text: ['=', '!=', 'contains'],
    enum: ['=', '!='],
    number: ['=', '!=', '>', '>=', '<', '<='],
    date: ['=', '!=', '>', '>=', '<', '<='],
  };

  const emptyGraph = () => ({ nodes: [], edges: [] });

  const createEmptyMachine = () => ({
    id: null,
    machine_code: '',
    machine_title: '',
    entity_code: '',
    entry_condition_field: '',
    entry_condition_operator: '=',
    entry_condition_value: '',
    entry_condition_text: '',
    valid_from: '',
    valid_to: '',
    is_active: true,
    graph_json: emptyGraph(),
  });

  const isValidDateLiteral = (value) => {
    const raw = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return false;
    const [year, month, day] = raw.split('-').map(part => parseInt(part, 10));
    return parsed.getUTCFullYear() === year && (parsed.getUTCMonth() + 1) === month && parsed.getUTCDate() === day;
  };

  const parseEntryConditionDraft = (entryCondition, entryConditionText) => {
    if (entryCondition && typeof entryCondition === 'object' && entryCondition.field) {
      return {
        field: String(entryCondition.field || ''),
        operator: String(entryCondition.operator || '='),
        value: entryCondition.value == null ? '' : String(entryCondition.value),
      };
    }
    const raw = String(entryConditionText || '').trim();
    if (!raw) return { field: '', operator: '=', value: '' };
    const match = raw.match(/^\s*([a-zA-Z0-9_.]+)\s*(=|!=|>=|<=|>|<|contains)\s*(.+?)\s*$/i);
    if (!match) return { field: '', operator: '=', value: '' };
    return {
      field: String(match[1] || ''),
      operator: String(match[2] || '='),
      value: String(match[3] || '').replace(/^['\"]|['\"]$/g, ''),
    };
  };

  const StateMachineManagement = ({ language = 'fa', formCode = 'WF_STATE_MACHINE_MGMT' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => (isRtl ? fa : en), [isRtl]);
    const supabase = window.supabase;

    const [viewMode, setViewMode] = useState('list');
    const [stateMachines, setStateMachines] = useState([]);
    const [entityRows, setEntityRows] = useState([]);
    const [stateMachineFilters, setStateMachineFilters] = useState({});
    const [stateMachineGridState, setStateMachineGridState] = useState(null);
    const [machineEditor, setMachineEditor] = useState({ isOpen: false, mode: 'create' });
    const [machineDraft, setMachineDraft] = useState(createEmptyMachine());
    const [activeMachine, setActiveMachine] = useState(null);
    const [deleteMachineId, setDeleteMachineId] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isStateMachineTableReady, setIsStateMachineTableReady] = useState(true);
    const [isUnauthorizedMode, setIsUnauthorizedMode] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3200);
    }, []);

    const isUnauthorizedError = useCallback((error) => {
      const msg = String(error?.message || '').toLowerCase();
      return error?.status === 401
        || error?.status === 403
        || msg.includes('unauthorized')
        || msg.includes('forbidden')
        || msg.includes('jwt')
        || msg.includes('auth');
    }, []);

    const isMissingStateMachineSchemaError = useCallback((error) => {
      const msg = String(error?.message || '').toLowerCase();
      const details = String(error?.details || '').toLowerCase();
      const hint = String(error?.hint || '').toLowerCase();
      return error?.code === '42P01'
        || msg.includes('wf_state_machines')
        || details.includes('wf_state_machines')
        || hint.includes('wf_state_machines');
    }, []);

    const fetchStateMachineEntities = useCallback(async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('sys_entities')
          .select('entity_code, name_fa, name_en')
          .order('entity_code', { ascending: true });
        if (error) throw error;
        setEntityRows(data || []);
      } catch (error) {
        if (!isUnauthorizedError(error)) console.error('StateMachineManagement entities fetch error:', error);
      }
    }, [isUnauthorizedError, supabase]);

    const fetchStateMachines = useCallback(async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('wf_state_machines')
          .select('id, machine_code, machine_title, entity_code, entry_condition, entry_condition_text, valid_from, valid_to, is_active, graph_json, created_at, updated_at')
          .order('updated_at', { ascending: false });

        if (error) {
          if (isUnauthorizedError(error)) {
            setIsUnauthorizedMode(true);
            setIsStateMachineTableReady(false);
            showToast(t('برای طراحی روال تاییدات نیاز به ورود معتبر دارید.', 'A valid login is required to manage state machines.'), 'warning');
            return;
          }
          if (isMissingStateMachineSchemaError(error)) {
            setIsStateMachineTableReady(false);
            showToast(t('اسکیما طراحی روال تاییدات ایجاد نشده است. ابتدا اسکریپت فاز ۲ را اجرا کنید.', 'State-machine schema is missing. Run Phase 2 SQL migration first.'), 'warning');
            return;
          }
          throw error;
        }

        setIsStateMachineTableReady(true);
        setIsUnauthorizedMode(false);
        setStateMachines(data || []);
      } catch (error) {
        console.error('StateMachineManagement list fetch error:', error);
        showToast(t('خطا در دریافت لیست روال‌های تاییدات', 'Failed to load state-machine list'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [isMissingStateMachineSchemaError, isUnauthorizedError, showToast, supabase, t]);

    useEffect(() => {
      if (viewMode !== 'list') return;
      fetchStateMachines();
      fetchStateMachineEntities();
    }, [fetchStateMachineEntities, fetchStateMachines, viewMode]);

    const openCreateMachine = useCallback(() => {
      setMachineDraft(createEmptyMachine());
      setMachineEditor({ isOpen: true, mode: 'create' });
    }, []);

    const openEditMachine = useCallback((row) => {
      if (!row) return;
      const parsedCondition = parseEntryConditionDraft(row.entry_condition, row.entry_condition_text);
      setMachineDraft({
        id: row.id,
        machine_code: row.machine_code || '',
        machine_title: row.machine_title || '',
        entity_code: row.entity_code || '',
        entry_condition_field: parsedCondition.field,
        entry_condition_operator: parsedCondition.operator,
        entry_condition_value: parsedCondition.value,
        entry_condition_text: row.entry_condition_text || '',
        valid_from: row.valid_from || '',
        valid_to: row.valid_to || '',
        is_active: row.is_active !== false,
        graph_json: parseGraphJson(row.graph_json),
      });
      setMachineEditor({ isOpen: true, mode: 'edit' });
    }, []);

    const closeMachineEditor = useCallback(() => {
      setMachineEditor({ isOpen: false, mode: 'create' });
      setMachineDraft(createEmptyMachine());
    }, []);

    const openDesignerForMachine = useCallback((row) => {
      if (!row) return;
      setActiveMachine(row);
      setViewMode('design');
    }, []);

    const goBackToList = useCallback(() => {
      setViewMode('list');
      setActiveMachine(null);
    }, []);

    const saveMachine = useCallback(async () => {
      if (!supabase) return;
      const code = String(machineDraft.machine_code || '').trim().toUpperCase();
      const title = String(machineDraft.machine_title || '').trim();
      const entityCode = String(machineDraft.entity_code || '').trim();
      const conditionField = String(machineDraft.entry_condition_field || '').trim();
      const conditionOperator = String(machineDraft.entry_condition_operator || '=').trim();
      const conditionValue = String(machineDraft.entry_condition_value || '').trim();
      const conditionFieldType = ENTRY_CONDITION_FIELD_TYPES[conditionField] || 'text';
      const allowedOperators = ENTRY_CONDITION_OPERATORS_BY_TYPE[conditionFieldType] || ['=', '!=', '>', '>=', '<', '<=', 'contains'];

      if (!code || !title || !entityCode || !conditionField || !conditionOperator || !conditionValue) {
        showToast(t('کد روال، عنوان روال، موجودیت و شرط ورود الزامی هستند.', 'Machine code, title, entity, and entry condition are required.'), 'warning');
        return;
      }

      if (!allowedOperators.includes(conditionOperator)) {
        showToast(t('عملگر انتخاب‌شده برای این فیلد معتبر نیست.', 'Selected operator is not valid for this field.'), 'warning');
        return;
      }

      if (conditionFieldType === 'number' && !Number.isFinite(Number(conditionValue))) {
        showToast(t('مقدار شرط باید عددی باشد.', 'Condition value must be numeric.'), 'warning');
        return;
      }

      if (conditionFieldType === 'date' && !isValidDateLiteral(conditionValue)) {
        showToast(t('برای فیلد تاریخ، مقدار را با فرمت YYYY-MM-DD وارد کنید.', 'For date fields, use YYYY-MM-DD format.'), 'warning');
        return;
      }

      if (conditionField === 'request_type') {
        const allowedValues = new Set(REQUEST_TYPES.map(item => String(item.value)));
        if (!allowedValues.has(conditionValue)) {
          showToast(t('مقدار شرط برای نوع درخواست معتبر نیست.', 'Condition value is not valid for request type.'), 'warning');
          return;
        }
      }

      if (conditionField === 'status') {
        const allowedValues = new Set(STATUS_LIST.map(item => String(item.value)));
        if (!allowedValues.has(conditionValue)) {
          showToast(t('مقدار شرط برای وضعیت معتبر نیست.', 'Condition value is not valid for status.'), 'warning');
          return;
        }
      }

      const entryCondition = { field: conditionField, operator: conditionOperator, value: conditionValue };
      const entryConditionText = `${conditionField} ${conditionOperator} ${conditionValue}`;

      setIsLoading(true);
      try {
        const payload = {
          machine_code: code,
          machine_title: title,
          entity_code: entityCode,
          entry_condition: entryCondition,
          entry_condition_text: entryConditionText,
          valid_from: machineDraft.valid_from || null,
          valid_to: machineDraft.valid_to || null,
          is_active: !!machineDraft.is_active,
        };

        let error = null;
        if (machineEditor.mode === 'edit' && machineDraft.id) {
          ({ error } = await supabase.from('wf_state_machines').update(payload).eq('id', machineDraft.id));
        } else {
          ({ error } = await supabase.from('wf_state_machines').insert([{ ...payload, graph_json: normalizeSettingsForSave(parseGraphJson(machineDraft.graph_json)) }]));
        }
        if (error) throw error;

        closeMachineEditor();
        await fetchStateMachines();
        showToast(machineEditor.mode === 'edit'
          ? t('روال با موفقیت ویرایش شد.', 'State machine updated successfully.')
          : t('روال با موفقیت ایجاد شد.', 'State machine created successfully.'), 'success');
      } catch (error) {
        console.error('StateMachineManagement save machine error:', error);
        showToast(t('خطا در ذخیره روال', 'Failed to save state machine'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [closeMachineEditor, fetchStateMachines, machineDraft, machineEditor.mode, showToast, supabase, t]);

    const removeMachine = useCallback(async () => {
      if (!supabase || !deleteMachineId) return;
      setIsLoading(true);
      try {
        const { error } = await supabase.from('wf_state_machines').delete().eq('id', deleteMachineId);
        if (error) throw error;
        setDeleteMachineId(null);
        if (activeMachine && String(activeMachine.id) === String(deleteMachineId)) {
          setActiveMachine(null);
          setViewMode('list');
        }
        await fetchStateMachines();
        showToast(t('روال حذف شد.', 'State machine deleted.'), 'success');
      } catch (error) {
        console.error('StateMachineManagement delete machine error:', error);
        showToast(t('خطا در حذف روال', 'Failed to delete state machine'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [activeMachine, deleteMachineId, fetchStateMachines, showToast, supabase, t]);

    const toggleMachineStatus = useCallback(async (row) => {
      if (!supabase || !row?.id) return;
      try {
        const { error } = await supabase.from('wf_state_machines').update({ is_active: !(row.is_active !== false) }).eq('id', row.id);
        if (error) throw error;
        await fetchStateMachines();
      } catch (error) {
        console.error('StateMachineManagement toggle status error:', error);
        showToast(t('خطا در تغییر وضعیت روال', 'Failed to change state-machine status'), 'error');
      }
    }, [fetchStateMachines, showToast, supabase, t]);

    const entityLabelByCode = useMemo(() => {
      const map = {};
      entityRows.forEach(row => { map[row.entity_code] = isRtl ? (row.name_fa || row.entity_code) : (row.name_en || row.name_fa || row.entity_code); });
      return map;
    }, [entityRows, isRtl]);

    const entryConditionFields = useMemo(() => {
      const entityCode = String(machineDraft.entity_code || '').trim();
      const rows = ENTRY_CONDITION_FIELDS_BY_ENTITY[entityCode] || ENTRY_CONDITION_FIELDS;
      return rows.map(row => ({ value: row.value, label: isRtl ? row.fa : row.en }));
    }, [isRtl, machineDraft.entity_code]);

    const entryConditionValueOptions = useMemo(() => {
      if (machineDraft.entry_condition_field === 'request_type') {
        return REQUEST_TYPES.map(item => ({ value: item.value, label: isRtl ? item.fa : item.en }));
      }
      if (machineDraft.entry_condition_field === 'status') {
        return STATUS_LIST.map(item => ({ value: item.value, label: isRtl ? item.fa : item.en }));
      }
      return [];
    }, [isRtl, machineDraft.entry_condition_field]);

    const entryConditionOperatorOptions = useMemo(() => {
      const field = String(machineDraft.entry_condition_field || '').trim();
      const type = ENTRY_CONDITION_FIELD_TYPES[field] || 'text';
      const operators = ENTRY_CONDITION_OPERATORS_BY_TYPE[type] || ['=', '!=', '>', '>=', '<', '<=', 'contains'];
      return operators.map(operator => ({ value: operator, label: operator }));
    }, [machineDraft.entry_condition_field]);

    const stateMachineFilterFields = useMemo(() => ([
      { name: 'machine_code', label: t('کد روال', 'Machine Code'), type: 'text' },
      { name: 'machine_title', label: t('عنوان روال', 'Machine Title'), type: 'text' },
      {
        name: 'entity_code',
        label: t('موجودیت مرتبط', 'Entity'),
        type: 'select',
        options: [{ value: '', label: t('همه', 'All') }].concat(entityRows.map(row => ({ value: row.entity_code, label: entityLabelByCode[row.entity_code] || row.entity_code }))),
      },
      {
        name: 'is_active',
        label: t('وضعیت', 'Status'),
        type: 'select',
        options: [
          { value: '', label: t('همه', 'All') },
          { value: 'true', label: t('فعال', 'Active') },
          { value: 'false', label: t('غیرفعال', 'Inactive') },
        ],
      },
    ]), [entityLabelByCode, entityRows, t]);

    const filteredStateMachines = useMemo(() => {
      let rows = [...stateMachines];
      const codeFilter = String(stateMachineFilters.machine_code || '').trim().toLowerCase();
      const titleFilter = String(stateMachineFilters.machine_title || '').trim().toLowerCase();
      const entityFilter = String(stateMachineFilters.entity_code || '').trim();
      const activeFilter = String(stateMachineFilters.is_active || '').trim();

      if (codeFilter) rows = rows.filter(row => String(row.machine_code || '').toLowerCase().includes(codeFilter));
      if (titleFilter) rows = rows.filter(row => String(row.machine_title || '').toLowerCase().includes(titleFilter));
      if (entityFilter) rows = rows.filter(row => String(row.entity_code || '') === entityFilter);
      if (activeFilter === 'true' || activeFilter === 'false') {
        const boolVal = activeFilter === 'true';
        rows = rows.filter(row => (row.is_active !== false) === boolVal);
      }
      return rows;
    }, [stateMachineFilters, stateMachines]);

    const stateMachineColumns = useMemo(() => ([
      { field: 'machine_code', header_fa: 'کد روال', header_en: 'Code', width: '160px', render: (value) => <span className="font-mono text-[12px]">{value || '-'}</span> },
      { field: 'machine_title', header_fa: 'عنوان روال', header_en: 'Title', width: '220px', render: (value) => <span className="font-bold text-slate-800 dark:text-slate-100">{value || '-'}</span> },
      { field: 'entity_code', header_fa: 'موجودیت مرتبط', header_en: 'Entity', width: '220px', render: (value) => <span>{entityLabelByCode[value] || value || '-'}</span> },
      { field: 'entry_condition_text', header_fa: 'شرط ورود', header_en: 'Entry Condition', width: '260px', render: (value) => <span className="text-[12px]">{value || '-'}</span> },
      { field: 'valid_from', header_fa: 'از تاریخ', header_en: 'From Date', width: '120px', render: (value) => <span className="font-mono text-[12px]">{value || '-'}</span> },
      { field: 'valid_to', header_fa: 'تا تاریخ', header_en: 'To Date', width: '120px', render: (value) => <span className="font-mono text-[12px]">{value || '-'}</span> },
      {
        field: 'is_active',
        header_fa: 'وضعیت',
        header_en: 'Status',
        width: '110px',
        render: (value, row) => (
          <div onClick={(event) => event.stopPropagation()}>
            <ToggleField formCode={formCode} size="sm" label="" checked={value !== false} onChange={() => toggleMachineStatus(row)} isRtl={isRtl} wrapperClassName="!m-0 justify-start" />
          </div>
        ),
      },
    ]), [entityLabelByCode, formCode, isRtl, toggleMachineStatus]);

    const design = typeof useStateMachineController === 'function'
      ? useStateMachineController({
        language,
        formCode,
        supabase,
        activeMachine,
        isStateMachineTableReady,
        showToast,
        t,
        isLoading,
        setIsLoading,
        isUnauthorizedError,
        entityLabelByCode,
        onGraphSaved: (graphToSave) => {
          setStateMachines(prev => prev.map(row => String(row.id) === String(activeMachine?.id) ? { ...row, graph_json: graphToSave } : row));
          setActiveMachine(prev => prev ? { ...prev, graph_json: graphToSave } : prev);
        },
        onExit: goBackToList,
        controls: {
          Button,
          SelectField,
          TextField,
          Modal,
          Dialog,
          Save,
          Sparkles,
          Plus,
          Trash2,
          Link2,
          UserRound,
          Database,
          LOVField: safeComp(Grid, 'LOVField'),
        },
      })
      : { currentTypeDirty: false, requestBackToList: goBackToList, designContent: null, settingsModals: null, leaveDialog: null, isUnauthorizedMode: false };

    return (
      <div className="p-4 h-full flex flex-col bg-slate-50/60 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={viewMode === 'list' ? t('طراحی روال تاییدات', 'State Machine Management') : t('طراحی روال تاییدات', 'State Machine Designer')}
          icon={Workflow}
          language={language}
          breadcrumbs={viewMode === 'list' ? [{ label: t('گردش کار', 'Workflow') }, { label: t('طراحی روال تاییدات', 'State Machine Management') }] : [{ label: t('گردش کار', 'Workflow') }, { label: t('طراحی روال', 'Design') }]}
        >
          <div className="flex items-center gap-2">
            {viewMode === 'list' ? (
              <>
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchStateMachines}>{t('بروزرسانی', 'Refresh')}</Button>
                <Button size="sm" variant="primary" icon={Plus} onClick={openCreateMachine}>{t('روال جدید', 'New State Machine')}</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" icon={isRtl ? ArrowRight : ArrowLeft} onClick={design.requestBackToList}>{t('بازگشت به لیست', 'Back To List')}</Button>
            )}
          </div>
        </PageHeader>

        {viewMode === 'list' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <AdvancedFilter fields={stateMachineFilterFields} initialValues={stateMachineFilters} onFilter={setStateMachineFilters} onClear={() => setStateMachineFilters({})} language={language} />

            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
              {!isStateMachineTableReady ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400 text-[12px]">
                  {t('اسکیما آماده نیست. ابتدا اسکریپت workflow/create_state_machine_management_schema.sql را اجرا کنید.', 'Schema is not ready. Run workflow/create_state_machine_management_schema.sql first.')}
                </div>
              ) : (
                <DataGrid
                  data={filteredStateMachines}
                  columns={stateMachineColumns}
                  language={language}
                  selectable={false}
                  onRowDoubleClick={(row) => openEditMachine(row)}
                  gridState={stateMachineGridState}
                  onGridStateChange={setStateMachineGridState}
                  onAdd={openCreateMachine}
                  actions={[
                    { icon: Workflow, tooltip: t('طراحی روال', 'Design Workflow'), onClick: (row) => openDesignerForMachine(row), className: 'text-slate-400 hover:text-indigo-600' },
                    { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => openEditMachine(row), className: 'text-slate-400 hover:text-sky-600' },
                    { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteMachineId(row.id), className: 'text-slate-400 hover:text-rose-600' },
                  ]}
                />
              )}
            </div>
          </div>
        )}

        {viewMode === 'design' && design.designContent}
        {design.settingsModals}

        <Modal isOpen={machineEditor.isOpen} onClose={closeMachineEditor} title={machineEditor.mode === 'edit' ? t('ویرایش روال', 'Edit State Machine') : t('ایجاد روال جدید', 'Create State Machine')} language={language} width="max-w-3xl">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3" dir={isRtl ? 'rtl' : 'ltr'}>
            <TextField formCode={formCode} size="sm" label={t('کد روال', 'Machine Code')} value={machineDraft.machine_code || ''} onChange={(event) => setMachineDraft(prev => ({ ...prev, machine_code: event.target.value.toUpperCase() }))} isRtl={isRtl} required dir="ltr" />
            <TextField formCode={formCode} size="sm" label={t('عنوان روال', 'Machine Title')} value={machineDraft.machine_title || ''} onChange={(event) => setMachineDraft(prev => ({ ...prev, machine_title: event.target.value }))} isRtl={isRtl} required />

            <SelectField
              formCode={formCode}
              size="sm"
              label={t('موجودیت مرتبط', 'Related Entity')}
              value={machineDraft.entity_code || ''}
              onChange={(event) => setMachineDraft(prev => ({ ...prev, entity_code: event.target.value, entry_condition_field: '', entry_condition_operator: '=', entry_condition_value: '' }))}
              options={[{ value: '', label: t('انتخاب موجودیت...', 'Select entity...') }].concat(entityRows.map(row => ({ value: row.entity_code, label: entityLabelByCode[row.entity_code] || row.entity_code })))}
              isRtl={isRtl}
              required
            />

            <ToggleField formCode={formCode} size="sm" label={t('وضعیت فعال', 'Active Status')} checked={machineDraft.is_active !== false} onChange={(value) => setMachineDraft(prev => ({ ...prev, is_active: value }))} isRtl={isRtl} />

            <DatePicker formCode={formCode} size="sm" label={t('از تاریخ', 'Valid From')} value={machineDraft.valid_from || ''} onChange={(value) => setMachineDraft(prev => ({ ...prev, valid_from: value }))} isRtl={isRtl} language={language} />
            <DatePicker formCode={formCode} size="sm" label={t('تا تاریخ', 'Valid To')} value={machineDraft.valid_to || ''} onChange={(value) => setMachineDraft(prev => ({ ...prev, valid_to: value }))} isRtl={isRtl} language={language} />

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <SelectField
                  formCode={formCode}
                  size="sm"
                  label={t('فیلد شرط ورود', 'Entry Condition Field')}
                  value={machineDraft.entry_condition_field || ''}
                  onChange={(event) => {
                    const field = String(event.target.value || '').trim();
                    const type = ENTRY_CONDITION_FIELD_TYPES[field] || 'text';
                    const nextOperators = ENTRY_CONDITION_OPERATORS_BY_TYPE[type] || ['=', '!=', '>', '>=', '<', '<=', 'contains'];
                    setMachineDraft(prev => ({ ...prev, entry_condition_field: field, entry_condition_operator: nextOperators[0] || '=', entry_condition_value: '' }));
                  }}
                  options={[{ value: '', label: t('انتخاب فیلد...', 'Select field...') }].concat(entryConditionFields)}
                  isRtl={isRtl}
                />
              </div>

              <div className="md:col-span-2">
                <SelectField formCode={formCode} size="sm" label={t('عملگر', 'Operator')} value={machineDraft.entry_condition_operator || '='} onChange={(event) => setMachineDraft(prev => ({ ...prev, entry_condition_operator: event.target.value }))} options={entryConditionOperatorOptions} isRtl={isRtl} />
              </div>

              <div className="md:col-span-5">
                {entryConditionValueOptions.length > 0 ? (
                  <SelectField formCode={formCode} size="sm" label={t('مقدار شرط', 'Condition Value')} value={machineDraft.entry_condition_value || ''} onChange={(event) => setMachineDraft(prev => ({ ...prev, entry_condition_value: event.target.value }))} options={[{ value: '', label: t('انتخاب مقدار...', 'Select value...') }].concat(entryConditionValueOptions)} isRtl={isRtl} />
                ) : (
                  <TextField formCode={formCode} size="sm" label={t('مقدار شرط', 'Condition Value')} value={machineDraft.entry_condition_value || ''} onChange={(event) => setMachineDraft(prev => ({ ...prev, entry_condition_value: event.target.value }))} isRtl={isRtl} />
                )}
              </div>
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={closeMachineEditor}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="primary" icon={Save} isLoading={isLoading} onClick={saveMachine}>{t('ذخیره', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        <Dialog
          isOpen={!!deleteMachineId}
          title={t('حذف روال', 'Delete State Machine')}
          type="error"
          language={language}
          confirmLabel={t('بله، حذف شود', 'Yes, Delete')}
          cancelLabel={t('انصراف', 'Cancel')}
          onCancel={() => setDeleteMachineId(null)}
          onConfirm={removeMachine}
        >
          {t('آیا از حذف این روال اطمینان دارید؟', 'Are you sure you want to delete this state machine?')}
        </Dialog>

        {design.leaveDialog}

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  StateMachineManagement.formCode = 'WF_STATE_MACHINE_MGMT';
  window.StateMachineManagement = StateMachineManagement;
})();