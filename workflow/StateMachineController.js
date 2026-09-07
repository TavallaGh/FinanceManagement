/* Filename: workflow/StateMachineController.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useEffect, useCallback, useRef } = React;

  const settingsModule = window.StateMachineSettingsModule || {};
  const canvasModule = window.StateMachineCanvasModule || {};

  const STATUS_LIST = canvasModule.STATUS_LIST || [
    { value: 'DRAFT', fa: 'یادداشت', en: 'Draft', color: 'from-slate-100 to-slate-200' },
    { value: 'REGISTERED', fa: 'ثبت شده', en: 'Registered', color: 'from-blue-100 to-blue-200' },
    { value: 'REVIEWED', fa: 'بررسی شده', en: 'Reviewed', color: 'from-violet-100 to-violet-200' },
    { value: 'APPROVED', fa: 'تایید شده', en: 'Approved', color: 'from-emerald-100 to-emerald-200' },
    { value: 'IN_PROGRESS', fa: 'در حال انجام', en: 'In Progress', color: 'from-amber-100 to-amber-200' },
    { value: 'DONE', fa: 'انجام شده', en: 'Done', color: 'from-green-100 to-green-200' },
    { value: 'REJECTED', fa: 'عدم تایید', en: 'Rejected', color: 'from-rose-100 to-rose-200' },
    { value: 'CANCELED', fa: 'لغو شده', en: 'Canceled', color: 'from-red-100 to-red-200' },
    { value: 'CLOSED', fa: 'بسته شده', en: 'Closed', color: 'from-zinc-100 to-zinc-200' },
  ];

  const NODE_WIDTH = canvasModule.NODE_WIDTH || 188;
  const NODE_HEIGHT = canvasModule.NODE_HEIGHT || 112;
  const CANVAS_SAFE_MARGIN = canvasModule.CANVAS_SAFE_MARGIN || 36;

  const ASSIGNEE_TYPES = settingsModule.ASSIGNEE_TYPES || ['USER', 'ROLE', 'DYNAMIC'];
  const ASSIGNEE_TYPE_LABELS = settingsModule.ASSIGNEE_TYPE_LABELS || {
    USER: { fa: 'کاربر سیستم', en: 'System User' },
    ROLE: { fa: 'سمت سازمانی', en: 'Organizational Role' },
    DYNAMIC: { fa: 'فرد مشخص', en: 'Specific Person' },
  };

  const DYNAMIC_ASSIGNEES = settingsModule.DYNAMIC_ASSIGNEES || [];
  const CONDITION_OPERATORS = settingsModule.CONDITION_OPERATORS || ['=', '!=', '>', '>=', '<', '<=', 'contains'];
  const MAX_ASSIGNEE_CONDITIONS = settingsModule.MAX_ASSIGNEE_CONDITIONS || 2;
  const DATA_ENTRY_FORMS = settingsModule.DATA_ENTRY_FORMS || [];
  const CONDITION_FIELDS = settingsModule.CONDITION_FIELDS || [];

  const createAssigneeCondition = settingsModule.createAssigneeCondition || (() => ({
    id: crypto.randomUUID(),
    joinWithPrev: 'AND',
    field: 'total_usd_amount',
    operator: '>',
    value: '',
  }));

  const createAssigneeBlock = settingsModule.createAssigneeBlock || (() => ({
    id: crypto.randomUUID(),
    conditions: [],
    assignee_type: 'USER',
    assignee_value: '',
    fallback_assignee_type: '',
    fallback_assignee_value: '',
  }));

  const normalizeAssigneeConditions = settingsModule.normalizeAssigneeConditions || ((conditions) => Array.isArray(conditions) ? conditions : []);
  const normalizeAssigneeBlocks = settingsModule.normalizeAssigneeBlocks || ((blocks) => Array.isArray(blocks) ? blocks : [createAssigneeBlock()]);
  const getAssigneeSettings = settingsModule.getAssigneeSettings || (() => ({ blocks: [createAssigneeBlock()], note: '' }));
  const getEdgeDataEntrySettings = settingsModule.getEdgeDataEntrySettings || (() => ({ selectedForm: '' }));
  const renderStateMachineSettingsModals = settingsModule.renderStateMachineSettingsModals || (() => null);

  const emptyGraph = () => ({ nodes: [], edges: [] });

  const parseGraphJson = (rawValue) => {
    if (!rawValue) return emptyGraph();
    if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        return parsed && typeof parsed === 'object' ? parsed : emptyGraph();
      } catch (error) {
        return emptyGraph();
      }
    }
    if (typeof rawValue === 'object') return rawValue;
    return emptyGraph();
  };

  const normalizeSettingsForSave = (graph) => {
    const allowedDataForms = new Set(DATA_ENTRY_FORMS.map(item => item.value).filter(Boolean));
    const safeGraph = graph || emptyGraph();
    const nodesInput = Array.isArray(safeGraph.nodes) ? safeGraph.nodes : [];
    const edgesInput = Array.isArray(safeGraph.edges) ? safeGraph.edges : [];

    const nodes = nodesInput.map((node) => {
      const rawSettings = (node && typeof node.settings === 'object' && node.settings) ? node.settings : {};
      const rawAssignee = (rawSettings.assignee && typeof rawSettings.assignee === 'object') ? rawSettings.assignee : null;

      let assignee = undefined;
      if (rawAssignee) {
        assignee = {
          blocks: normalizeAssigneeBlocks(rawAssignee.blocks || []).map((block) => ({
            id: block.id || crypto.randomUUID(),
            assignee_type: block.assignee_type || 'USER',
            assignee_value: block.assignee_value == null ? '' : String(block.assignee_value),
            fallback_assignee_type: block.fallback_assignee_type || '',
            fallback_assignee_value: block.fallback_assignee_value == null ? '' : String(block.fallback_assignee_value),
            conditions: normalizeAssigneeConditions(block.conditions || []).map((condition, conditionIndex) => ({
              id: condition.id || crypto.randomUUID(),
              joinWithPrev: conditionIndex === 0 ? 'AND' : (condition.joinWithPrev === 'OR' ? 'OR' : 'AND'),
              field: condition.field || 'total_usd_amount',
              operator: condition.operator || '=',
              value: condition.value == null ? '' : String(condition.value),
            })),
          })),
          note: rawAssignee.note == null ? '' : String(rawAssignee.note),
        };
      }

      const id = node?.id ? String(node.id) : crypto.randomUUID();
      const status = node?.status ? String(node.status) : 'DRAFT';
      const x = Number.isFinite(node?.x) ? node.x : CANVAS_SAFE_MARGIN;
      const y = Number.isFinite(node?.y) ? node.y : CANVAS_SAFE_MARGIN;

      return {
        id,
        status,
        x,
        y,
        settings: {
          ...(assignee ? { assignee } : {}),
        },
      };
    });

    const nodeIds = new Set(nodes.map(node => node.id));
    const edges = edgesInput
      .filter(edge => edge && edge.source && edge.target)
      .map(edge => {
        const rawEdgeSettings = (edge.settings && typeof edge.settings === 'object') ? edge.settings : {};
        const rawEdgeDataEntry = rawEdgeSettings.data_entry;
        let edgeDataEntry = undefined;
        if (rawEdgeDataEntry && typeof rawEdgeDataEntry === 'object') {
          const rawForms = Array.isArray(rawEdgeDataEntry.forms) ? rawEdgeDataEntry.forms : [];
          const normalizedFirst = rawForms.find(value => allowedDataForms.has(value)) || '';
          edgeDataEntry = {
            forms: normalizedFirst ? [normalizedFirst] : [],
          };
        }
        return {
          id: edge.id ? String(edge.id) : crypto.randomUUID(),
          source: String(edge.source),
          target: String(edge.target),
          settings: {
            ...(edgeDataEntry ? { data_entry: edgeDataEntry } : {}),
          },
        };
      })
      .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));

    return {
      nodes,
      edges,
    };
  };

  const graphSignature = (graph) => {
    const g = graph || emptyGraph();
    const nodes = (Array.isArray(g.nodes) ? g.nodes : [])
      .map(node => ({
        id: node.id,
        status: node.status,
        x: Math.round(node.x || 0),
        y: Math.round(node.y || 0),
        settings: node.settings || null,
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const edges = (Array.isArray(g.edges) ? g.edges : [])
      .map(edge => ({ id: edge.id, source: edge.source, target: edge.target }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return JSON.stringify({ nodes, edges });
  };

  const isGraphChanged = (graphA, graphB) => graphSignature(graphA) !== graphSignature(graphB);

  const createNode = canvasModule.createNode || ((status, x, y) => ({ id: crypto.randomUUID(), status, x, y }));
  const createEdge = canvasModule.createEdge || ((source, target) => ({ id: crypto.randomUUID(), source, target }));
  const autoLayoutGraph = canvasModule.autoLayoutGraph || (() => null);
  const renderStateMachineCanvas = canvasModule.renderStateMachineCanvas || (() => null);

  

  const useStateMachineController = (params) => {
    const {
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
      onGraphSaved,
      onExit,
      controls,
    } = params;

    const isRtl = language === 'fa';
    const byLanguage = useCallback((fa, en) => (isRtl ? fa : en), [isRtl]);

    const canvasRef = useRef(null);
    const [activeGraph, setActiveGraphState] = useState(emptyGraph());
    const [savedGraph, setSavedGraph] = useState(emptyGraph());
    const [currentTypeDirty, setCurrentTypeDirty] = useState(false);

    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const [pendingSourceId, setPendingSourceId] = useState(null);
    const [dragging, setDragging] = useState(null);

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isUnauthorizedMode, setIsUnauthorizedMode] = useState(false);

    const [nodeSettingsModal, setNodeSettingsModal] = useState({ isOpen: false, nodeId: null });
    const [modalDraft, setModalDraft] = useState(null);
    const [nodeDataEntryModal, setNodeDataEntryModal] = useState({ isOpen: false, nodeId: null });
    const [nodeEdgeFormsDraft, setNodeEdgeFormsDraft] = useState({});
    const [isLeaveDesignDialogOpen, setIsLeaveDesignDialogOpen] = useState(false);

    useEffect(() => {
      const graph = normalizeSettingsForSave(parseGraphJson(activeMachine?.graph_json));
      setActiveGraphState(graph);
      setSavedGraph(graph);
      setCurrentTypeDirty(false);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setPendingSourceId(null);
      setNodeSettingsModal({ isOpen: false, nodeId: null });
      setNodeDataEntryModal({ isOpen: false, nodeId: null });
      setNodeEdgeFormsDraft({});
      setModalDraft(null);
    }, [activeMachine?.id]);

    const setActiveGraph = (updater) => {
      setActiveGraphState((prev) => {
        const nextGraph = typeof updater === 'function' ? updater(prev) : updater;
        setCurrentTypeDirty(isGraphChanged(nextGraph, savedGraph));
        return nextGraph;
      });
    };

    const statusMap = useMemo(() => STATUS_LIST.reduce((acc, item) => {
      acc[item.value] = item;
      return acc;
    }, {}), []);

    const statusOrderMap = useMemo(() => STATUS_LIST.reduce((acc, item, index) => {
      acc[item.value] = index;
      return acc;
    }, {}), []);

    const labelByValue = useCallback((list, value) => {
      const item = list.find(row => row.value === value);
      if (!item) return value || '-';
      return isRtl ? item.fa : item.en;
    }, [isRtl]);

    const usersLovData = useMemo(() => users.map(user => ({
      ...user,
      label: user.full_name || user.username || '-',
      usernameText: user.username || '-',
      fullNameText: user.full_name || '-',
    })), [users]);

    const usersLovColumns = useMemo(() => [
      { field: 'usernameText', header_fa: 'نام کاربری', header_en: 'Username', width: '180px' },
      { field: 'fullNameText', header_fa: 'نام و نام خانوادگی', header_en: 'Full Name', width: '260px' },
    ], []);

    const rolesLovData = useMemo(() => roles.map(role => ({
      ...role,
      label: role.title || role.code || '-',
      roleCode: role.code || '-',
      roleTitle: role.title || '-',
    })), [roles]);

    const rolesLovColumns = useMemo(() => [
      { field: 'roleCode', header_fa: 'کد سمت', header_en: 'Role Code', width: '160px' },
      { field: 'roleTitle', header_fa: 'عنوان سمت', header_en: 'Role Title', width: '260px' },
    ], []);

    const assigneeTypeOptions = useMemo(() => ASSIGNEE_TYPES.map(type => ({
      value: type,
      label: byLanguage(ASSIGNEE_TYPE_LABELS[type].fa, ASSIGNEE_TYPE_LABELS[type].en),
    })), [byLanguage]);

    const fallbackAssigneeTypeOptions = useMemo(() => ([
      { value: '', label: byLanguage('بدون جانشین', 'No Fallback') },
      ...ASSIGNEE_TYPES.map(type => ({
        value: type,
        label: byLanguage(ASSIGNEE_TYPE_LABELS[type].fa, ASSIGNEE_TYPE_LABELS[type].en),
      })),
    ]), [byLanguage]);

    const conditionFieldOptions = useMemo(() => CONDITION_FIELDS.map(field => ({
      value: field.value,
      label: byLanguage(field.fa, field.en),
    })), [byLanguage]);

    const fetchAssigneeLookups = useCallback(async () => {
      if (!supabase) return;
      try {
        const [userResult, roleResult, partiesResult] = await Promise.all([
          supabase.from('sec_users').select('id, username, full_name, party_id, is_active').eq('is_active', true).order('username', { ascending: true }),
          supabase.from('sec_roles').select('id, code, title').eq('is_active', true).order('title', { ascending: true }),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type').eq('is_active', true),
        ]);
        const lookupError = userResult.error || roleResult.error || partiesResult.error;
        if (lookupError) {
          if (isUnauthorizedError(lookupError)) {
            setIsUnauthorizedMode(true);
            return;
          }
          return;
        }

        const partyNameById = {};
        (partiesResult.data || []).forEach(party => {
          const partyName = party.party_type === 'legal'
            ? (party.company_name || '')
            : `${party.first_name || ''} ${party.last_name || ''}`.trim();
          partyNameById[party.id] = partyName;
        });

        const normalizedUsers = (userResult.data || []).map(user => ({
          ...user,
          full_name: user.full_name || partyNameById[user.party_id] || user.username || '-',
        }));

        setUsers(normalizedUsers);
        setRoles(roleResult.data || []);
        setIsUnauthorizedMode(false);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          setIsUnauthorizedMode(true);
          return;
        }
        console.error('StateMachineController assignee lookup error:', error);
      }
    }, [isUnauthorizedError, supabase]);

    useEffect(() => {
      if (!activeMachine?.id) return;
      fetchAssigneeLookups();
    }, [activeMachine?.id, fetchAssigneeLookups]);

    useEffect(() => {
      if (!currentTypeDirty) return undefined;
      const onBeforeUnload = (event) => {
        event.preventDefault();
        event.returnValue = '';
        return '';
      };
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [currentTypeDirty]);

    useEffect(() => {
      const onMove = (event) => {
        if (!dragging || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const nx = event.clientX - rect.left - dragging.offsetX;
        const ny = event.clientY - rect.top - dragging.offsetY;
        setActiveGraph(prev => ({
          ...prev,
          nodes: prev.nodes.map(node => node.id !== dragging.id ? node : {
            ...node,
            x: Math.max(CANVAS_SAFE_MARGIN, nx),
            y: Math.max(CANVAS_SAFE_MARGIN, ny),
          }),
        }));
      };

      const onUp = () => setDragging(null);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }, [dragging, savedGraph]);

    const nodeById = useMemo(() => {
      const map = {};
      activeGraph.nodes.forEach(node => { map[node.id] = node; });
      return map;
    }, [activeGraph.nodes]);

    const contentSize = useMemo(() => {
      if (!activeGraph.nodes.length) return { width: 1200, height: 680 };
      const maxX = Math.max(...activeGraph.nodes.map(node => node.x + NODE_WIDTH));
      const maxY = Math.max(...activeGraph.nodes.map(node => node.y + NODE_HEIGHT));
      return { width: Math.max(1200, Math.ceil(maxX + 120)), height: Math.max(680, Math.ceil(maxY + 120)) };
    }, [activeGraph.nodes]);

    const statusUsageSet = useMemo(() => new Set(activeGraph.nodes.map(node => node.status)), [activeGraph.nodes]);

    const activeModalNode = useMemo(() => {
      if (!nodeSettingsModal.nodeId) return null;
      return activeGraph.nodes.find(node => node.id === nodeSettingsModal.nodeId) || null;
    }, [activeGraph.nodes, nodeSettingsModal.nodeId]);

    const activeDataEntryModalNode = useMemo(() => {
      if (!nodeDataEntryModal.nodeId) return null;
      return activeGraph.nodes.find(node => node.id === nodeDataEntryModal.nodeId) || null;
    }, [activeGraph.nodes, nodeDataEntryModal.nodeId]);

    const assigneeConfigCountByNode = useMemo(() => {
      const map = {};
      activeGraph.nodes.forEach(node => {
        const blocks = node?.settings?.assignee?.blocks;
        if (!Array.isArray(blocks) || !blocks.length) {
          map[node.id] = 0;
          return;
        }
        const configuredBlocks = blocks.filter((block) => {
          const hasAssignee = !!(block?.assignee_type && block?.assignee_value);
          const hasFallback = !!(block?.fallback_assignee_type && block?.fallback_assignee_value);
          const hasConditions = Array.isArray(block?.conditions) && block.conditions.length > 0;
          return hasAssignee || hasFallback || hasConditions;
        });
        map[node.id] = configuredBlocks.length;
      });
      return map;
    }, [activeGraph.nodes]);

    const dataEntryConfigCountByNode = useMemo(() => {
      const map = {};
      activeGraph.nodes.forEach(node => {
        const outgoingEdges = activeGraph.edges.filter(edge => edge.source === node.id);
        const configuredCount = outgoingEdges.filter(edge => {
          const forms = edge?.settings?.data_entry?.forms;
          const validForms = Array.isArray(forms)
            ? forms.filter(value => DATA_ENTRY_FORMS.some(item => item.value === value && value))
            : [];
          return validForms.length > 0;
        }).length;
        map[node.id] = configuredCount;
      });
      return map;
    }, [activeGraph.edges, activeGraph.nodes]);

    const edgeFormLabelById = useMemo(() => {
      const map = {};
      activeGraph.edges.forEach(edge => {
        const forms = edge?.settings?.data_entry?.forms;
        const formValue = Array.isArray(forms) && forms.length ? forms[0] : '';
        map[edge.id] = formValue ? labelByValue(DATA_ENTRY_FORMS, formValue) : byLanguage('بدون فرم', 'No Form');
      });
      return map;
    }, [activeGraph.edges, byLanguage, labelByValue]);

    const handlePaletteDragStart = (event, statusValue) => {
      event.dataTransfer.setData('application/request-status', statusValue);
      event.dataTransfer.effectAllowed = 'copy';
    };

    const addStatusNode = (statusValue, x, y) => {
      setActiveGraph(prev => {
        const alreadyExists = prev.nodes.some(node => node.status === statusValue);
        if (alreadyExists) {
          showToast(t('این وضعیت قبلا اضافه شده است.', 'This status is already on the canvas.'), 'warning');
          return prev;
        }
        return { ...prev, nodes: [...prev.nodes, createNode(statusValue, x, y)] };
      });
    };

    const handleCanvasDrop = (event) => {
      event.preventDefault();
      if (!canvasRef.current) return;
      const statusValue = event.dataTransfer.getData('application/request-status');
      if (!statusValue) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left - (NODE_WIDTH / 2);
      const y = event.clientY - rect.top - (NODE_HEIGHT / 2);
      addStatusNode(statusValue, Math.max(CANVAS_SAFE_MARGIN, x), Math.max(CANVAS_SAFE_MARGIN, y));
    };

    const tryConnect = (sourceId, targetId) => {
      if (!sourceId || !targetId || sourceId === targetId) return;
      setActiveGraph(prev => {
        const exists = prev.edges.some(edge => edge.source === sourceId && edge.target === targetId);
        if (exists) return prev;
        return { ...prev, edges: [...prev.edges, createEdge(sourceId, targetId)] };
      });
    };

    const removeNodeWithRelations = (nodeId) => {
      if (!nodeId) return;
      setActiveGraph(prev => ({
        nodes: prev.nodes.filter(node => node.id !== nodeId),
        edges: prev.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
      }));
      if (pendingSourceId === nodeId) setPendingSourceId(null);
      setSelectedNodeId(prev => prev === nodeId ? null : prev);
      setSelectedEdgeId(null);

      if (nodeSettingsModal.nodeId === nodeId) {
        setNodeSettingsModal({ isOpen: false, nodeId: null });
        setModalDraft(null);
      }
      if (nodeDataEntryModal.nodeId === nodeId) setNodeDataEntryModal({ isOpen: false, nodeId: null });
      setNodeEdgeFormsDraft({});
    };

    const removeSelected = useCallback(() => {
      if (!selectedNodeId && !selectedEdgeId) return;
      if (selectedNodeId) {
        removeNodeWithRelations(selectedNodeId);
        return;
      }
      setActiveGraph(prev => ({ ...prev, edges: prev.edges.filter(edge => edge.id !== selectedEdgeId) }));
      setSelectedEdgeId(null);
    }, [selectedEdgeId, selectedNodeId]);

    useEffect(() => {
      const onKeyDown = (event) => {
        const target = event.target;
        const tagName = (target && target.tagName) ? String(target.tagName).toLowerCase() : '';
        const isTypingTarget = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || (target && target.isContentEditable);
        if (isTypingTarget) return;

        if (event.key === 'Delete' || event.key === 'Backspace') {
          if (!selectedNodeId && !selectedEdgeId) return;
          event.preventDefault();
          removeSelected();
        }
      };

      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [removeSelected, selectedEdgeId, selectedNodeId]);

    const autoLayout = () => {
      autoLayoutGraph({ activeGraph, canvasRef, statusOrderMap, showToast, t, setActiveGraph });
    };

    const saveRequestType = async (graphOverride = null, successMessage = null) => {
      if (!supabase) return;

      setIsLoading(true);
      try {
        const looksLikeEvent = graphOverride && typeof graphOverride === 'object' && (typeof graphOverride.preventDefault === 'function' || !!graphOverride.nativeEvent);
        const rawGraphToSave = looksLikeEvent ? activeGraph : (graphOverride || activeGraph);
        const graphToSave = normalizeSettingsForSave(rawGraphToSave);

        if (!activeMachine?.id || !isStateMachineTableReady) {
          showToast(t('ابتدا از لیست، یک روال معتبر را برای طراحی انتخاب کنید.', 'Select a valid state machine from list before designing.'), 'warning');
          return;
        }

        const { error } = await supabase.from('wf_state_machines').update({ graph_json: graphToSave }).eq('id', activeMachine.id);
        if (error) throw error;

        setActiveGraphState(graphToSave);
        setSavedGraph(graphToSave);
        setCurrentTypeDirty(false);
        onGraphSaved?.(graphToSave);
        showToast(successMessage || t('طراحی روال ذخیره شد.', 'State machine design has been saved.'));
      } catch (error) {
        console.error('StateMachineDesign save error:', error);
        let serializedError = '';
        if (typeof error === 'object' && error !== null) {
          try { serializedError = JSON.stringify(error); } catch (jsonError) { serializedError = '[unserializable error object]'; }
        }
        const details = [
          error?.code ? `code=${error.code}` : '',
          error?.status ? `status=${error.status}` : '',
          error?.message,
          error?.details,
          error?.hint,
          serializedError,
        ].filter(Boolean).join(' | ');
        showToast(details ? `${t('خطا در ذخیره تنظیمات', 'Failed to save visual settings')}: ${details}` : t('خطا در ذخیره تنظیمات', 'Failed to save visual settings'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const cancelCurrentTypeChanges = () => {
      setActiveGraphState(savedGraph);
      setCurrentTypeDirty(false);
      setPendingSourceId(null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      showToast(t('تغییرات این تب لغو شد.', 'Changes for this tab were discarded.'), 'warning');
    };

    const closeNodeSettingsModal = () => {
      setNodeSettingsModal({ isOpen: false, nodeId: null });
      setModalDraft(null);
    };

    const closeNodeDataEntryModal = () => setNodeDataEntryModal({ isOpen: false, nodeId: null });

    const openNodeSettingsModal = (nodeId) => {
      const node = activeGraph.nodes.find(item => item.id === nodeId);
      if (!node) return;
      const hasOutgoing = activeGraph.edges.some(edge => edge.source === nodeId);
      if (!hasOutgoing) {
        showToast(t('برای وضعیت نهایی (بدون خروجی)، تنظیم انجام‌دهنده قابل تعریف نیست.', 'Assignee settings are not available for terminal statuses without outgoing edges.'), 'warning');
        return;
      }
      const assignee = getAssigneeSettings(node);
      const draft = JSON.parse(JSON.stringify({ assignee }));
      setNodeSettingsModal({ isOpen: true, nodeId });
      setModalDraft(draft);
    };

    const openNodeDataEntryModal = (nodeId) => {
      const node = activeGraph.nodes.find(item => item.id === nodeId);
      if (!node) return;
      const hasOutgoing = activeGraph.edges.some(edge => edge.source === nodeId);
      if (!hasOutgoing) {
        showToast(t('برای وضعیت نهایی (بدون خروجی)، فرم خط خروجی معنی ندارد.', 'Outgoing-edge form settings are not available for terminal statuses.'), 'warning');
        return;
      }
      const draft = {};
      activeGraph.edges.filter(edge => edge.source === nodeId).forEach(edge => {
        const settings = getEdgeDataEntrySettings(edge);
        draft[edge.id] = settings.selectedForm || '';
      });
      setNodeDataEntryModal({ isOpen: true, nodeId });
      setNodeEdgeFormsDraft(draft);
    };

    const updateAssigneeDraft = (updater) => {
      setModalDraft(prev => {
        if (!prev) return prev;
        const nextAssignee = typeof updater === 'function' ? updater(prev.assignee) : updater;
        return { ...prev, assignee: nextAssignee };
      });
    };

    const addAssigneeBlock = () => {
      updateAssigneeDraft(prev => ({ ...prev, blocks: [...(prev.blocks || []), createAssigneeBlock()] }));
    };

    const removeAssigneeBlock = (blockId) => {
      updateAssigneeDraft(prev => {
        const blocks = (prev.blocks || []).filter(block => block.id !== blockId);
        return { ...prev, blocks: blocks.length ? blocks : [createAssigneeBlock()] };
      });
    };

    const updateAssigneeBlock = (blockId, patch) => {
      updateAssigneeDraft(prev => ({ ...prev, blocks: (prev.blocks || []).map(block => block.id === blockId ? { ...block, ...patch } : block) }));
    };

    const addConditionToBlock = (blockId) => {
      let isLimitReached = false;
      updateAssigneeDraft(prev => ({
        ...prev,
        blocks: (prev.blocks || []).map(block => {
          if (block.id !== blockId) return block;
          const currentConditions = normalizeAssigneeConditions(block.conditions);
          if (currentConditions.length >= MAX_ASSIGNEE_CONDITIONS) {
            isLimitReached = true;
            return { ...block, conditions: currentConditions };
          }
          return { ...block, conditions: [...currentConditions, createAssigneeCondition()] };
        }),
      }));
      if (isLimitReached) showToast(t('هر بلوک فقط می‌تواند ۲ شرط داشته باشد.', 'Each block can have at most 2 conditions.'), 'warning');
    };

    const updateConditionInBlock = (blockId, conditionId, patch) => {
      updateAssigneeDraft(prev => ({
        ...prev,
        blocks: (prev.blocks || []).map(block => {
          if (block.id !== blockId) return block;
          return { ...block, conditions: (block.conditions || []).map(condition => condition.id === conditionId ? { ...condition, ...patch } : condition) };
        }),
      }));
    };

    const removeConditionFromBlock = (blockId, conditionId) => {
      updateAssigneeDraft(prev => ({
        ...prev,
        blocks: (prev.blocks || []).map(block => {
          if (block.id !== blockId) return block;
          return { ...block, conditions: (block.conditions || []).filter(condition => condition.id !== conditionId) };
        }),
      }));
    };

    const resolveAssigneeLabel = useCallback((assigneeType, assigneeValue) => {
      if (!assigneeType || !assigneeValue) return byLanguage('نامشخص', 'Unassigned');
      if (assigneeType === 'USER') {
        const user = users.find(item => String(item.id) === String(assigneeValue));
        return user ? (user.full_name || user.username || '-') : String(assigneeValue);
      }
      if (assigneeType === 'ROLE') {
        const role = roles.find(item => String(item.id) === String(assigneeValue));
        return role ? (role.title || role.code || '-') : String(assigneeValue);
      }
      return labelByValue(DYNAMIC_ASSIGNEES, assigneeValue);
    }, [byLanguage, labelByValue, roles, users]);

    const resolveFallbackLabel = useCallback((assigneeType, assigneeValue) => {
      if (!assigneeType || !assigneeValue) return byLanguage('بدون جانشین', 'No Fallback');
      return resolveAssigneeLabel(assigneeType, assigneeValue);
    }, [byLanguage, resolveAssigneeLabel]);

    const getBlockExpression = useCallback((block) => {
      const condText = (block.conditions || []).map((condition, idx) => {
        const chunk = `${labelByValue(CONDITION_FIELDS, condition.field)} ${condition.operator || '='} ${condition.value || byLanguage('...', '...')}`;
        if (idx === 0) return chunk;
        return `${condition.joinWithPrev || 'AND'} ${chunk}`;
      }).join(' ');
      const blockExpr = `(${condText || byLanguage('همیشه', 'Always')})`;
      const assigneeLabel = resolveAssigneeLabel(block.assignee_type, block.assignee_value);
      const fallbackLabel = resolveFallbackLabel(block.fallback_assignee_type, block.fallback_assignee_value);
      return `IF ${blockExpr} => ${assigneeLabel} [FB: ${fallbackLabel}]`;
    }, [byLanguage, labelByValue, resolveAssigneeLabel, resolveFallbackLabel]);

    const saveNodeSettingsModal = async () => {
      if (!nodeSettingsModal.nodeId || !modalDraft) {
        closeNodeSettingsModal();
        return;
      }

      const hasOutgoing = activeGraph.edges.some(edge => edge.source === nodeSettingsModal.nodeId);
      if (!hasOutgoing) {
        showToast(t('این وضعیت خروجی ندارد؛ تنظیم انجام‌دهنده قابل ذخیره نیست.', 'This status has no outgoing edges; assignee settings cannot be saved.'), 'warning');
        closeNodeSettingsModal();
        return;
      }

      const normalizedBlocks = normalizeAssigneeBlocks(modalDraft.assignee?.blocks || []).map((block) => ({
        ...block,
        assignee_type: block.assignee_type || 'USER',
        assignee_value: block.assignee_value || '',
        fallback_assignee_type: block.fallback_assignee_type || '',
        fallback_assignee_value: block.fallback_assignee_type ? (block.fallback_assignee_value || '') : '',
        conditions: normalizeAssigneeConditions(block.conditions).map((condition, conditionIndex) => ({
          ...condition,
          joinWithPrev: conditionIndex === 0 ? 'AND' : (condition.joinWithPrev || 'AND'),
          field: condition.field || 'total_usd_amount',
          operator: condition.operator || '=',
        })),
      }));

      const nextGraph = {
        ...activeGraph,
        nodes: activeGraph.nodes.map(node => node.id !== nodeSettingsModal.nodeId ? node : {
          ...node,
          settings: {
            ...(node.settings || {}),
            assignee: {
              ...(modalDraft.assignee || {}),
              blocks: normalizedBlocks,
            },
          },
        }),
      };

      setActiveGraph(nextGraph);
      closeNodeSettingsModal();
      await saveRequestType(nextGraph, t('قواعد انجام‌دهنده ذخیره شد.', 'Assignee rules were saved.'));
    };

    const selectNodeEdgeDataEntryForm = (edgeId, formValue) => {
      setNodeEdgeFormsDraft(prev => ({ ...prev, [edgeId]: formValue }));
    };

    const saveNodeDataEntryModal = async () => {
      if (!nodeDataEntryModal.nodeId) {
        closeNodeDataEntryModal();
        return;
      }

      const hasOutgoing = activeGraph.edges.some(edge => edge.source === nodeDataEntryModal.nodeId);
      if (!hasOutgoing) {
        showToast(t('این وضعیت خروجی ندارد؛ تنظیم فرم خروجی قابل ذخیره نیست.', 'This status has no outgoing edges; outgoing form settings cannot be saved.'), 'warning');
        closeNodeDataEntryModal();
        return;
      }

      const validValues = new Set(DATA_ENTRY_FORMS.map(item => item.value));
      const nodeId = nodeDataEntryModal.nodeId;

      const nextGraph = {
        ...activeGraph,
        edges: activeGraph.edges.map(edge => {
          if (edge.source !== nodeId) return edge;
          const selectedValue = nodeEdgeFormsDraft[edge.id] || '';
          const normalizedForm = validValues.has(selectedValue) ? selectedValue : '';
          const normalizedForms = normalizedForm ? [normalizedForm] : [];
          return {
            ...edge,
            settings: {
              ...(edge.settings || {}),
              data_entry: {
                forms: normalizedForms,
              },
            },
          };
        }),
      };

      setActiveGraph(nextGraph);
      closeNodeDataEntryModal();
      setNodeEdgeFormsDraft({});
      await saveRequestType(nextGraph, t('تنظیم اطلاعات خطوط خروجی ذخیره شد.', 'Outgoing edge data-entry settings were saved.'));
    };

    const requestBackToList = useCallback(() => {
      if (currentTypeDirty) {
        setIsLeaveDesignDialogOpen(true);
        return;
      }
      onExit?.();
    }, [currentTypeDirty, onExit]);

    const discardAndLeaveDesign = useCallback(() => {
      setActiveGraphState(savedGraph);
      setCurrentTypeDirty(false);
      setIsLeaveDesignDialogOpen(false);
      onExit?.();
      showToast(t('تغییرات ذخیره‌نشده کنار گذاشته شد.', 'Unsaved changes were discarded.'), 'warning');
    }, [onExit, savedGraph, showToast, t]);

    const designContent = activeMachine ? renderStateMachineCanvas({
      activeMachine,
      t,
      entityLabelByCode,
      Sparkles: controls.Sparkles,
      Button: controls.Button,
      currentTypeDirty,
      isLoading,
      Save: controls.Save,
      onAutoLayout: autoLayout,
      onCancel: cancelCurrentTypeChanges,
      onSave: saveRequestType,
      isRtl,
      statusUsageSet,
      handlePaletteDragStart,
      canvasRef,
      handleCanvasDrop,
      setSelectedNodeId,
      setSelectedEdgeId,
      contentSize,
      activeGraph,
      nodeById,
      selectedEdgeId,
      edgeFormLabelById,
      setPendingSourceId,
      pendingSourceId,
      statusMap,
      selectedNodeId,
      tryConnect,
      openNodeSettingsModal,
      setDragging,
      Link2: controls.Link2,
      UserRound: controls.UserRound,
      Database: controls.Database,
      Trash2: controls.Trash2,
      removeNodeWithRelations,
      assigneeConfigCountByNode,
      dataEntryConfigCountByNode,
      openNodeDataEntryModal,
    }) : null;

    const settingsModals = renderStateMachineSettingsModals({
      language,
      isRtl,
      t,
      formCode,
      Modal: controls.Modal,
      Button: controls.Button,
      SelectField: controls.SelectField,
      TextField: controls.TextField,
      LOVField: controls.LOVField,
      Save: controls.Save,
      Plus: controls.Plus,
      Trash2: controls.Trash2,
      Sparkles: controls.Sparkles,
      nodeSettingsModal,
      modalDraft,
      closeNodeSettingsModal,
      activeModalNode,
      labelByValue,
      statusList: STATUS_LIST,
      addAssigneeBlock,
      addConditionToBlock,
      getBlockExpression,
      removeAssigneeBlock,
      conditionFieldOptions,
      updateConditionInBlock,
      removeConditionFromBlock,
      assigneeTypeOptions,
      updateAssigneeBlock,
      usersLovData,
      usersLovColumns,
      resolveAssigneeLabel,
      rolesLovData,
      rolesLovColumns,
      byLanguage,
      fallbackAssigneeTypeOptions,
      resolveFallbackLabel,
      saveNodeSettingsModal,
      nodeDataEntryModal,
      closeNodeDataEntryModal,
      activeDataEntryModalNode,
      activeGraph,
      nodeById,
      nodeEdgeFormsDraft,
      selectNodeEdgeDataEntryForm,
      saveNodeDataEntryModal,
    });

    const leaveDialog = (
      <controls.Dialog
        isOpen={isLeaveDesignDialogOpen}
        title={t('تغییرات ذخیره‌نشده', 'Unsaved Changes')}
        type="warning"
        language={language}
        confirmLabel={t('خروج و عدم ذخیره', 'Leave Without Saving')}
        cancelLabel={t('ادامه ویرایش', 'Keep Editing')}
        onCancel={() => setIsLeaveDesignDialogOpen(false)}
        onConfirm={discardAndLeaveDesign}
      >
        {t('تغییرات این طراحی ذخیره نشده‌اند. آیا مایل به خروج بدون ذخیره هستید؟', 'This design has unsaved changes. Leave without saving?')}
      </controls.Dialog>
    );

    return {
      currentTypeDirty,
      requestBackToList,
      designContent,
      settingsModals,
      leaveDialog,
      isUnauthorizedMode,
      saveRequestType,
    };
  };

  window.StateMachineDesignUtils = {
    STATUS_LIST,
    parseGraphJson,
    normalizeSettingsForSave,
  };

  window.StateMachineControllerUtils = {
    STATUS_LIST,
    parseGraphJson,
    normalizeSettingsForSave,
  };

  window.useStateMachineController = useStateMachineController;
})();