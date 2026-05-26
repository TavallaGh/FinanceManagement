/* Filename: workflow/WorkflowDesign.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo, useRef } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    GitMerge = FallbackIcon, Save = FallbackIcon, Plus = FallbackIcon, Trash2 = FallbackIcon,
    PlayCircle = FallbackIcon, StopCircle = FallbackIcon, CheckSquare = FallbackIcon, Diamond = FallbackIcon,
    ArrowLeft = FallbackIcon, ArrowRight = FallbackIcon, Database = FallbackIcon, Settings2 = FallbackIcon,
    Layers = FallbackIcon, Users = FallbackIcon, X = FallbackIcon, ListTree = FallbackIcon, ArrowRightLeft = FallbackIcon,
    Info = FallbackIcon, Split = FallbackIcon, Settings = FallbackIcon, Clock = FallbackIcon, 
    Send = FallbackIcon, Cpu = FallbackIcon, Mail = FallbackIcon, AlignCenter = FallbackIcon
  } = LucideIcons;

  const WorkflowDesign = ({ definition, systemEntities = [], onBack, language = 'fa' }) => {
    const FallbackComponent = () => null;
    const Core = window.DSCore || window.DesignSystem || {};
    const { 
      Button = FallbackComponent, PageHeader = FallbackComponent, TextField = FallbackComponent, 
      SelectField = FallbackComponent, ToggleField = FallbackComponent, Tabs = FallbackComponent,
      DatePicker = FallbackComponent, Card = FallbackComponent
    } = Core;
    
    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Toast = FallbackComponent } = Feedback;

    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'info' });
    const [activeTab, setActiveTab] = useState('base');
    const [editingDef, setEditingDef] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [selectedElement, setSelectedElement] = useState(null);

    const [domainFilter, setDomainFilter] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [workflowsList, setWorkflowsList] = useState([]);

    const canvasRef = useRef(null);
    const [draggingNode, setDraggingNode] = useState(null);
    const [connectingStart, setConnectingStart] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    useEffect(() => {
        const fetchWfs = async () => {
            try {
                const { data } = await supabase.schema('wf').from('wf_definitions').select('id, title, version');
                if (data) {
                    setWorkflowsList(data.map(w => ({ value: w.id, label: `${w.title} (v${w.version})` })));
                }
            } catch (e) {
                console.error("Error fetching workflows for subprocess list:", e);
            }
        };
        fetchWfs();
    }, []);

    useEffect(() => {
        if (definition) {
            setEditingDef({
                ...definition,
                bpmn_data: definition.bpmn_data || { nodes: [], flows: [] }
            });
            
            if (definition.entity_type && systemEntities.length > 0) {
                const ent = systemEntities.find(e => e.entity_code === definition.entity_type);
                if (ent) {
                    setDomainFilter(ent.domain_name || '');
                    setModuleFilter(ent.module_name || '');
                }
            }
        } else {
            setEditingDef({
                id: null,
                title: '',
                entity_type: '',
                is_active: false,
                version: 1,
                factor_field: '',
                factor_operator: '=',
                factor_value: '',
                effective_start_date: '',
                effective_end_date: '',
                bpmn_data: {
                    nodes: [
                        { id: `start_${generateId()}`, type: 'START_EVENT', name: t('شروع', 'Start'), position: { x: 100, y: 150 } }
                    ],
                    flows: []
                }
            });
            setDomainFilter('');
            setModuleFilter('');
        }
    }, [definition?.id, systemEntities.length]); 

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setDraggingNode(null);
            setConnectingStart(null);
        };
        
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('mouseleave', handleGlobalMouseUp);
        
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mouseleave', handleGlobalMouseUp);
        };
    }, []);

    const handleSaveDefinition = async () => {
        try {
            setIsSaving(true);
            if (!editingDef.title || !editingDef.entity_type) {
                showToast(t('لطفاً در تب تنظیمات پایه، عنوان و موجودیت را مشخص کنید.', 'Please provide title and entity type in base settings.'), 'error');
                setActiveTab('base');
                setIsSaving(false);
                return;
            }

            const payload = {
                title: editingDef.title,
                entity_type: editingDef.entity_type,
                is_active: editingDef.is_active,
                factor_field: editingDef.factor_field,
                factor_operator: editingDef.factor_operator || '=',
                factor_value: editingDef.factor_value,
                effective_start_date: editingDef.effective_start_date || null,
                effective_end_date: editingDef.effective_end_date || null,
                bpmn_data: editingDef.bpmn_data,
                updated_at: new Date().toISOString()
            };

            if (editingDef.id) {
                const { error } = await supabase.schema('wf').from('wf_definitions').update(payload).eq('id', editingDef.id);
                if (error) throw error;
                showToast(t('طراحی گردش کار با موفقیت بروزرسانی شد.', 'Workflow design updated successfully.'));
            } else {
                payload.created_by = currentUser;
                const { error } = await supabase.schema('wf').from('wf_definitions').insert([payload]);
                if (error) throw error;
                showToast(t('گردش کار جدید با موفقیت ایجاد شد.', 'New workflow created successfully.'));
            }
            
            setTimeout(() => onBack(true), 1000);

        } catch (err) {
            console.error("Save error:", err);
            showToast(t('خطا در ذخیره اطلاعات گردش کار', 'Error saving workflow data'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoLayout = () => {
        const nodes = [...editingDef.bpmn_data.nodes];
        const flows = editingDef.bpmn_data.flows;
        
        const startNodes = nodes.filter(n => n.type === 'START_EVENT');
        if (startNodes.length === 0) {
            showToast(t('برای مرتب‌سازی، حداقل یک گره شروع نیاز است.', 'Need a start event to auto layout.'), 'warning');
            return;
        }

        const orderedNodes = [];
        const visited = new Set();
        const queue = [...startNodes];

        while(queue.length > 0) {
            const curr = queue.shift();
            if(visited.has(curr.id)) continue;
            visited.add(curr.id);
            orderedNodes.push(curr);

            const outgoing = flows.filter(f => f.sourceRef === curr.id);
            outgoing.forEach(f => {
                const targetNode = nodes.find(n => n.id === f.targetRef);
                if(targetNode && !visited.has(targetNode.id) && !queue.includes(targetNode)) {
                    queue.push(targetNode);
                }
            });
        }
        
        nodes.forEach(n => {
            if(!visited.has(n.id)) orderedNodes.push(n);
        });

        const canvasWidth = canvasRef.current ? canvasRef.current.clientWidth : 1000;
        const nodeSpacingX = 220;
        const nodeSpacingY = 160;
        const startX = 100;
        const startY = 100;
        
        const maxPerRow = Math.max(1, Math.floor((canvasWidth - 150) / nodeSpacingX));

        const newNodes = nodes.map(n => {
            const idx = orderedNodes.findIndex(on => on.id === n.id);
            if(idx === -1) return n;
            
            const row = Math.floor(idx / maxPerRow);
            const col = idx % maxPerRow;
            
            let x;
            if (row % 2 === 0) {
                x = startX + (col * nodeSpacingX);
            } else {
                const reverseCol = (maxPerRow - 1) - col;
                x = startX + (reverseCol * nodeSpacingX);
            }
            
            const y = startY + (row * nodeSpacingY);
            return { ...n, position: { x, y } };
        });

        setEditingDef(prev => ({ ...prev, bpmn_data: { ...prev.bpmn_data, nodes: newNodes } }));
        showToast(t('المان‌ها به صورت مارپیچ (Snake) و یکپارچه مرتب شدند.', 'Elements aligned in snake pattern.'), 'success');
    };

    const uniqueDomains = useMemo(() => {
        const domains = [...new Set(systemEntities.map(e => e.domain_name).filter(Boolean))];
        return domains.map(d => ({ value: d, label: d }));
    }, [systemEntities]);

    const uniqueModules = useMemo(() => {
        if (!domainFilter) return [];
        const modules = [...new Set(systemEntities.filter(e => e.domain_name === domainFilter).map(e => e.module_name).filter(Boolean))];
        return modules.map(m => ({ value: m, label: m }));
    }, [systemEntities, domainFilter]);

    const filteredEntities = useMemo(() => {
        let list = systemEntities;
        if (domainFilter) list = list.filter(e => e.domain_name === domainFilter);
        if (moduleFilter) list = list.filter(e => e.module_name === moduleFilter);
        return list.map(e => ({
            value: e.entity_code,
            label: isRtl ? e.name_fa : e.name_en
        }));
    }, [systemEntities, domainFilter, moduleFilter, isRtl]);

    const operatorOptions = [
        {value: '=', label: '='}, {value: '!=', label: '!='}, {value: '>', label: '>'},
        {value: '<', label: '<'}, {value: '>=', label: '>='}, {value: '<=', label: '<='},
        {value: 'IN', label: 'IN (...)'}, {value: 'NOT IN', label: 'NOT IN (...)'}
    ];

    const builderTabs = [
        { id: 'base', label: t('تنظیمات پایه و شروط', 'Base Settings & Rules'), icon: Settings2 },
        { id: 'process', label: t('طراحی فرآیند (Visual)', 'Process Designer'), icon: GitMerge }
    ];

    const handleTabChange = (tabId) => {
        if (tabId === 'process' && !editingDef.entity_type) {
            showToast(t('ابتدا باید در تنظیمات پایه، موجودیت هدف را انتخاب کنید.', 'Please select target entity in base settings first.'), 'warning');
            return;
        }
        setActiveTab(tabId);
    };

    const updateElement = (elementType, id, field, value) => {
        setEditingDef(prev => {
            const newData = { ...prev.bpmn_data };
            if (elementType === 'node') {
                newData.nodes = newData.nodes.map(n => n.id === id ? { ...n, [field]: value } : n);
            } else if (elementType === 'flow') {
                newData.flows = newData.flows.map(f => f.id === id ? { ...f, [field]: value } : f);
            }
            return { ...prev, bpmn_data: newData };
        });
    };

    const addNodeToCanvas = (type, x, y) => {
        if (type === 'START_EVENT') {
            const hasStartEvent = editingDef.bpmn_data.nodes.some(n => n.type === 'START_EVENT');
            if (hasStartEvent) {
                showToast(t('هر گردش کار فقط می‌تواند یک نقطه شروع داشته باشد.', 'A workflow can only have one start event.'), 'error');
                return;
            }
        }

        let name = '';
        if (type === 'USER_TASK') name = t('فعالیت کاربری', 'User Task');
        if (type === 'SERVICE_TASK') name = t('عملیات سیستمی', 'System Task');
        if (type === 'SEND_TASK') name = t('ارسال اعلان', 'Send Task');
        if (type === 'SUB_PROCESS') name = t('زیرفرآیند', 'Subprocess');
        if (type === 'APPROVAL_GATEWAY') name = t('دروازه تایید/رد', 'Decision Gateway');
        if (type === 'EXCLUSIVE_GATEWAY') name = t('دروازه شرطی (چندگانه)', 'Condition Gateway');
        if (type === 'PARALLEL_GATEWAY') name = t('دروازه موازی (همزمان)', 'Parallel Gateway');
        if (type === 'TIMER_EVENT') name = t('رویداد زمانی', 'Timer Event');
        if (type === 'END_EVENT') name = t('پایان', 'End');
        if (type === 'START_EVENT') name = t('شروع', 'Start');
        
        const newNode = { id: `node_${generateId()}`, type, name, position: { x, y } };
        setEditingDef(prev => ({ ...prev, bpmn_data: { ...prev.bpmn_data, nodes: [...prev.bpmn_data.nodes, newNode] } }));
        setSelectedElement({ type: 'node', id: newNode.id });
    };

    const addFlow = (sourceRef, targetRef) => {
        if (sourceRef === targetRef) return;
        const exists = editingDef.bpmn_data.flows.find(f => f.sourceRef === sourceRef && f.targetRef === targetRef);
        if (exists) return;

        const sourceNode = editingDef.bpmn_data.nodes.find(n => n.id === sourceRef);
        const targetNode = editingDef.bpmn_data.nodes.find(n => n.id === targetRef);

        const existingOutFlows = editingDef.bpmn_data.flows.filter(f => f.sourceRef === sourceRef).length;

        if (sourceNode?.type === 'END_EVENT') {
            showToast(t('گره پایان نمی‌تواند نقطه شروع مسیر باشد.', 'End event cannot have outgoing flows.'), 'error');
            return;
        }

        if (targetNode?.type === 'START_EVENT') {
            showToast(t('نمی‌توان به گره شروع مسیر وصل کرد.', 'Start event cannot have incoming flows.'), 'error');
            return;
        }

        if (sourceNode?.type === 'START_EVENT' && targetNode?.type === 'END_EVENT') {
            showToast(t('اتصال مستقیم نقطه شروع به پایان مجاز نیست. حداقل یک گام میانی تعریف کنید.', 'Direct connection from start to end is not allowed. Define at least one intermediate step.'), 'error');
            return;
        }

        if (sourceNode?.type === 'START_EVENT' && existingOutFlows >= 1) {
            showToast(t('گره شروع فقط می‌تواند یک خروجی داشته باشد.', 'Start event can only have one outgoing flow.'), 'error');
            return;
        }

        if (sourceNode?.type === 'APPROVAL_GATEWAY' && existingOutFlows >= 2) {
            showToast(t('دروازه تایید/رد فقط می‌تواند حداکثر دو خروجی (بله/خیر) داشته باشد.', 'Approval gateway can only have max two outgoing flows.'), 'error');
            return;
        }

        const singleOutputNodes = ['USER_TASK', 'SERVICE_TASK', 'SEND_TASK', 'SUB_PROCESS', 'TIMER_EVENT'];
        if (singleOutputNodes.includes(sourceNode?.type) && existingOutFlows >= 1) {
            showToast(t('این فعالیت فقط می‌تواند یک مسیر خروجی داشته باشد. برای ایجاد انشعاب در فرآیند، حتماً از دروازه‌ها (Gateways) استفاده کنید.', 'This task can only have one outgoing flow. Use gateways for branching.'), 'error');
            return;
        }

        let defaultName = '';
        let defaultActionLabel = '';
        
        if (sourceNode?.type === 'APPROVAL_GATEWAY') {
            if (existingOutFlows === 0) {
                defaultName = t('بله (تایید)', 'Yes (Approve)');
                defaultActionLabel = t('تایید', 'Approve');
            } else {
                defaultName = t('خیر (رد)', 'No (Reject)');
                defaultActionLabel = t('رد', 'Reject');
            }
        }

        const newFlow = { id: `flow_${generateId()}`, sourceRef, targetRef, name: defaultName, condition: '', action_label: defaultActionLabel, is_default: false };
        setEditingDef(prev => ({ ...prev, bpmn_data: { ...prev.bpmn_data, flows: [...prev.bpmn_data.flows, newFlow] } }));
        setSelectedElement({ type: 'flow', id: newFlow.id });
    };

    const deleteSelected = () => {
        if (!selectedElement) return;
        if (selectedElement.type === 'node') {
            setEditingDef(prev => ({
                ...prev,
                bpmn_data: {
                    nodes: prev.bpmn_data.nodes.filter(n => n.id !== selectedElement.id),
                    flows: prev.bpmn_data.flows.filter(f => f.sourceRef !== selectedElement.id && f.targetRef !== selectedElement.id)
                }
            }));
        } else {
            setEditingDef(prev => ({
                ...prev,
                bpmn_data: {
                    ...prev.bpmn_data,
                    flows: prev.bpmn_data.flows.filter(f => f.id !== selectedElement.id)
                }
            }));
        }
        setSelectedElement(null);
    };

    const handleCanvasDragOver = (e) => {
        e.preventDefault();
    };

    const handleCanvasDrop = (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('nodeType');
        if (!type || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        addNodeToCanvas(type, x, y);
    };

    const handleCanvasMouseMove = (e) => {
        if (e.buttons === 0 && draggingNode) {
            setDraggingNode(null);
            return;
        }
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePos({ x, y });

        if (draggingNode) {
            setEditingDef(prev => ({
                ...prev,
                bpmn_data: {
                    ...prev.bpmn_data,
                    nodes: prev.bpmn_data.nodes.map(n => n.id === draggingNode ? { ...n, position: { x, y } } : n)
                }
            }));
        }
    };

    const handleCanvasMouseUp = () => {
        setDraggingNode(null);
    };

    const getNodeEdges = (node) => {
        if (!node) return { right: 0, left: 0, top: 0, bottom: 0, x: 0, y: 0 };
        const { x, y } = node.position;
        let width = 128, height = 64; 
        if (node.type.includes('EVENT')) { width = 48; height = 48; } 
        else if (node.type.includes('GATEWAY')) { width = 56; height = 56; }
        
        return { 
            right: x + width / 2, 
            left: x - width / 2, 
            top: y - height / 2, 
            bottom: y + height / 2, 
            x, y 
        };
    };

    const getDynamicPath = (sourceNode, targetNode) => {
        if (!sourceNode || !targetNode) return '';
        const sRect = getNodeEdges(sourceNode);
        const tRect = getNodeEdges(targetNode);
        
        let startX = sRect.right, startY = sRect.y;
        let endX = tRect.left, endY = tRect.y;

        if (sRect.right + 20 < tRect.left) {
            startX = sRect.right; startY = sRect.y;
            endX = tRect.left; endY = tRect.y;
        } else if (sRect.left > tRect.right + 20) {
            startX = sRect.left; startY = sRect.y;
            endX = tRect.right; endY = tRect.y;
        } else if (sRect.bottom + 20 < tRect.top) {
            startX = sRect.x; startY = sRect.bottom;
            endX = tRect.x; endY = tRect.top;
        } else if (sRect.top > tRect.bottom + 20) {
            startX = sRect.x; startY = sRect.top;
            endX = tRect.x; endY = tRect.bottom;
        } else {
            startX = sRect.right; startY = sRect.y;
            endX = tRect.left; endY = tRect.y;
        }

        const midX = startX + (endX - startX) / 2;
        const midY = startY + (endY - startY) / 2;

        if (startY === sRect.y && endY === tRect.y) {
            return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
        } else if (startX === sRect.x && endX === tRect.x) {
            return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
        } else {
            return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
        }
    };

    const getNodeStyle = (type) => {
        if (type === 'START_EVENT') return 'w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-400 text-emerald-600';
        if (type === 'END_EVENT') return 'w-12 h-12 rounded-full bg-rose-50 border-4 border-rose-400 text-rose-600';
        if (type === 'TIMER_EVENT') return 'w-12 h-12 rounded-full bg-orange-50 border-2 border-orange-400 text-orange-600';
        
        if (type === 'APPROVAL_GATEWAY') return 'w-14 h-14 bg-indigo-50 border-2 border-indigo-400 text-indigo-600 rotate-45';
        if (type === 'EXCLUSIVE_GATEWAY') return 'w-14 h-14 bg-amber-50 border-2 border-amber-400 text-amber-600 rotate-45';
        if (type === 'PARALLEL_GATEWAY') return 'w-14 h-14 bg-emerald-50 border-2 border-emerald-400 text-emerald-600 rotate-45';
        
        if (type === 'SERVICE_TASK') return 'w-32 h-16 rounded-xl bg-slate-50 border-2 border-slate-400 text-slate-700 shadow-sm';
        if (type === 'SEND_TASK') return 'w-32 h-16 rounded-xl bg-blue-50 border-2 border-blue-400 text-blue-700 shadow-sm';
        if (type === 'SUB_PROCESS') return 'w-32 h-16 rounded-xl bg-teal-50 border-2 border-teal-400 text-teal-700 shadow-sm border-dashed';
        
        return 'w-32 h-16 rounded-xl bg-white border-2 border-indigo-400 text-indigo-700 shadow-sm';
    };

    const getNodePaletteIcon = (type) => {
        if (type === 'START_EVENT') return <PlayCircle size={20} />;
        if (type === 'END_EVENT') return <StopCircle size={18} />;
        if (type === 'TIMER_EVENT') return <Clock size={20} />;
        
        if (type === 'APPROVAL_GATEWAY') return <Split size={18} className="-rotate-45" />;
        if (type === 'EXCLUSIVE_GATEWAY') return <Diamond size={18} className="-rotate-45" />;
        if (type === 'PARALLEL_GATEWAY') return <Plus size={24} className="-rotate-45" />;
        
        if (type === 'SERVICE_TASK') return <Settings size={18} />;
        if (type === 'SEND_TASK') return <Mail size={18} />;
        if (type === 'SUB_PROCESS') return <Layers size={18} />;
        
        return <CheckSquare size={18} />;
    };

    if (!editingDef) return null;

    const selectedNode = selectedElement?.type === 'node' ? editingDef.bpmn_data.nodes.find(n => n.id === selectedElement.id) : null;
    const selectedFlow = selectedElement?.type === 'flow' ? editingDef.bpmn_data.flows.find(f => f.id === selectedElement.id) : null;

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('محیط طراح گردش کار', 'Workflow Designer')}
          icon={GitMerge} language={language}
          breadcrumbs={[{ label: t('مدیریت گردش کارها', 'Workflow Management') }, { label: t('محیط طراح', 'Designer') }]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-700">
            <Tabs 
                tabs={builderTabs} 
                activeTab={activeTab} 
                onChange={handleTabChange} 
                className="!mb-0 !border-b-0" 
            />
            <div className="flex items-center gap-1.5 pb-2">
                {activeTab === 'process' && (
                    <Button size="sm" variant="ghost" icon={AlignCenter} onClick={handleAutoLayout}>{t('مرتب‌سازی خودکار', 'Auto Layout')}</Button>
                )}
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
                <Button size="sm" variant="outline" icon={isRtl ? ArrowRight : ArrowLeft} onClick={() => onBack(false)}>{t('بازگشت', 'Back')}</Button>
                <Button size="sm" variant="primary" icon={Save} onClick={handleSaveDefinition} disabled={isSaving}>
                    {isSaving ? t('در حال ذخیره...', 'Saving...') : t('ذخیره تغییرات', 'Save Changes')}
                </Button>
            </div>
        </div>

        <Card
          noPadding={true}
          className="flex-1 flex flex-col border border-slate-200 dark:border-slate-700 shadow-sm min-h-0"
        >
            {activeTab === 'base' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-slate-50/50 dark:bg-slate-900/50 min-h-0">
                    <div className="w-full flex flex-col gap-3 h-full">
                        
                        <Card title={t('موجودیت هدف', 'Target Entity')} noPadding className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-[30]" headerClassName="h-10 bg-white dark:bg-slate-800" isCollapsible language={language}>
                            <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-slate-800">
                                <SelectField size="sm" label={t('حوزه سیستمی', 'Domain')} value={domainFilter} onChange={(e) => { setDomainFilter(e.target.value); setModuleFilter(''); setEditingDef({...editingDef, entity_type: ''}); }} options={[{value: '', label: t('همه حوزه‌ها...', 'All Domains...')}, ...uniqueDomains]} isRtl={isRtl} />
                                <SelectField size="sm" label={t('ماژول', 'Module')} value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setEditingDef({...editingDef, entity_type: ''}); }} options={[{value: '', label: t('همه ماژول‌ها...', 'All Modules...')}, ...uniqueModules]} isRtl={isRtl} disabled={!domainFilter && uniqueModules.length === 0} />
                                <SelectField size="sm" wrapperClassName="md:col-span-2" label={t('موجودیت سیستمی', 'Entity')} value={editingDef.entity_type} onChange={(e) => setEditingDef({...editingDef, entity_type: e.target.value})} options={[{value: '', label: t('انتخاب موجودیت...', 'Select Entity...')}, ...filteredEntities]} isRtl={isRtl} required />
                            </div>
                        </Card>

                        <Card title={t('تنظیمات عمومی گردش کار', 'Workflow Config')} noPadding className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-[20]" headerClassName="h-10 bg-white dark:bg-slate-800" isCollapsible language={language}>
                            <div className="p-3 grid grid-cols-1 md:grid-cols-6 gap-3 bg-white dark:bg-slate-800">
                                <TextField size="sm" wrapperClassName="md:col-span-2" label={t('عنوان گردش کار', 'Workflow Title')} value={editingDef.title} onChange={(e) => setEditingDef({...editingDef, title: e.target.value})} isRtl={isRtl} required />
                                <TextField size="sm" label={t('ورژن', 'Version')} value={`v${editingDef.version || 1}.0`} isRtl={isRtl} disabled />
                                <DatePicker size="sm" label={t('تاریخ شروع', 'Start Date')} value={editingDef.effective_start_date || ''} onChange={(val) => setEditingDef({...editingDef, effective_start_date: val})} isRtl={isRtl} language={language} />
                                <DatePicker size="sm" label={t('تاریخ پایان', 'End Date')} value={editingDef.effective_end_date || ''} onChange={(val) => setEditingDef({...editingDef, effective_end_date: val})} isRtl={isRtl} language={language} />
                                <div className="flex items-center pt-5 px-1">
                                    <ToggleField size="sm" label={t('فعال در سیستم', 'Active in System')} checked={editingDef.is_active} onChange={(val) => setEditingDef({...editingDef, is_active: val})} isRtl={isRtl} />
                                </div>
                            </div>
                        </Card>

                        <Card title={t('شروط شروع (فاکتورها)', 'Start Condition (Factors)')} noPadding className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-[10]" headerClassName="h-10 bg-white dark:bg-slate-800" isCollapsible language={language}>
                            <div className="p-3 flex flex-col gap-3 bg-white dark:bg-slate-800">
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 m-0 leading-relaxed">
                                    {t('در صورت تنظیم، گردش کار فقط برای رکوردهایی اعمال می‌شود که این شرط را برآورده کنند.', 'If set, applies only to records matching this condition.')}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    <TextField size="sm" wrapperClassName="md:col-span-2" label={t('نام فیلد دیتابیس (مثلا: loan_type)', 'Field Name')} value={editingDef.factor_field || ''} onChange={(e) => setEditingDef({...editingDef, factor_field: e.target.value})} isRtl={isRtl} />
                                    <SelectField size="sm" label={t('عملگر', 'Operator')} value={editingDef.factor_operator || '='} onChange={(e) => setEditingDef({...editingDef, factor_operator: e.target.value})} isRtl={isRtl} options={operatorOptions} />
                                    <TextField size="sm" wrapperClassName="md:col-span-2" label={t('مقدار مورد نظر', 'Value')} value={editingDef.factor_value || ''} onChange={(e) => setEditingDef({...editingDef, factor_value: e.target.value})} isRtl={isRtl} />
                                </div>
                            </div>
                        </Card>

                    </div>
                </div>
            )}

            {activeTab === 'process' && (
                <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-900/50 relative">
                    {/* Palette Sidebar - 2 Column Grid */}
                    <div className={`w-[130px] shrink-0 bg-white dark:bg-slate-800 border-${isRtl ? 'l' : 'r'} border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-y-6 gap-x-4 p-4 content-start justify-items-center shadow-sm z-20 overflow-y-auto custom-scrollbar`}>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'START_EVENT')} className="w-10 h-10 shrink-0 rounded-full border-2 border-emerald-400 bg-emerald-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-emerald-500" title={t('گره شروع', 'Start Event')}>
                            {getNodePaletteIcon('START_EVENT')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'END_EVENT')} className="w-10 h-10 shrink-0 rounded-full border-4 border-rose-400 bg-rose-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-rose-500" title={t('گره پایان', 'End Event')}>
                            {getNodePaletteIcon('END_EVENT')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'USER_TASK')} className="w-10 h-10 shrink-0 rounded-lg border-2 border-indigo-400 bg-indigo-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-indigo-500" title={t('فعالیت کاربری', 'User Task')}>
                            {getNodePaletteIcon('USER_TASK')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'SERVICE_TASK')} className="w-10 h-10 shrink-0 rounded-lg border-2 border-slate-400 bg-slate-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-slate-500" title={t('عملیات سیستمی', 'System Task')}>
                            {getNodePaletteIcon('SERVICE_TASK')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'SEND_TASK')} className="w-10 h-10 shrink-0 rounded-lg border-2 border-blue-400 bg-blue-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-blue-500" title={t('ارسال اعلان / پیام', 'Send Task')}>
                            {getNodePaletteIcon('SEND_TASK')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'SUB_PROCESS')} className="w-10 h-10 shrink-0 rounded-lg border-2 border-dashed border-teal-400 bg-teal-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-teal-500" title={t('زیرفرآیند', 'Subprocess')}>
                            {getNodePaletteIcon('SUB_PROCESS')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'APPROVAL_GATEWAY')} className="w-10 h-10 shrink-0 border-2 border-indigo-400 bg-indigo-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-indigo-500 rotate-45" title={t('تصمیم بله/خیر', 'Decision Gateway')}>
                            {getNodePaletteIcon('APPROVAL_GATEWAY')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'EXCLUSIVE_GATEWAY')} className="w-10 h-10 shrink-0 border-2 border-amber-400 bg-amber-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-amber-500 rotate-45" title={t('شرط چندگانه', 'Conditional Gateway')}>
                            {getNodePaletteIcon('EXCLUSIVE_GATEWAY')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'PARALLEL_GATEWAY')} className="w-10 h-10 shrink-0 border-2 border-emerald-400 bg-emerald-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-emerald-500 rotate-45" title={t('دروازه موازی (AND)', 'Parallel Gateway')}>
                            {getNodePaletteIcon('PARALLEL_GATEWAY')}
                        </div>
                        <div draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'TIMER_EVENT')} className="w-10 h-10 shrink-0 rounded-full border-2 border-orange-400 bg-orange-50 flex items-center justify-center cursor-grab hover:shadow-md transition-shadow text-orange-500" title={t('رویداد زمانی', 'Timer Event')}>
                            {getNodePaletteIcon('TIMER_EVENT')}
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div 
                        className="flex-1 relative overflow-auto custom-scrollbar outline-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] z-10"
                        ref={canvasRef}
                        onDragOver={handleCanvasDragOver}
                        onDrop={handleCanvasDrop}
                        onMouseMove={handleCanvasMouseMove}
                        onClick={() => setSelectedElement(null)}
                        dir="ltr" 
                    >
                        <div style={{
                            width: Math.max(2000, ...editingDef.bpmn_data.nodes.map(n => n.position.x + 300)),
                            height: Math.max(2000, ...editingDef.bpmn_data.nodes.map(n => n.position.y + 300)),
                            position: 'relative'
                        }}>
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                <defs>
                                    <marker id="arrowhead" markerWidth="6" markerHeight="5" refX="5.5" refY="2.5" orient="auto">
                                        <polygon points="0 0, 6 2.5, 0 5" fill="#94a3b8" />
                                    </marker>
                                    <marker id="arrowhead-selected" markerWidth="6" markerHeight="5" refX="5.5" refY="2.5" orient="auto">
                                        <polygon points="0 0, 6 2.5, 0 5" fill="#6366f1" />
                                    </marker>
                                </defs>
                                
                                {editingDef.bpmn_data.flows.map(flow => {
                                    const sourceNode = editingDef.bpmn_data.nodes.find(n => n.id === flow.sourceRef);
                                    const targetNode = editingDef.bpmn_data.nodes.find(n => n.id === flow.targetRef);
                                    if (!sourceNode || !targetNode) return null;
                                    
                                    const isSelected = selectedElement?.id === flow.id;
                                    const d = getDynamicPath(sourceNode, targetNode);
                                    
                                    return (
                                        <g key={flow.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'flow', id: flow.id }); }}>
                                            <path d={d} stroke="transparent" strokeWidth="20" fill="none" />
                                            <path 
                                                d={d} 
                                                stroke={isSelected ? '#6366f1' : '#94a3b8'} 
                                                strokeWidth={isSelected ? "3" : "2"} 
                                                strokeLinejoin="round"
                                                fill="none" 
                                                markerEnd={`url(#${isSelected ? 'arrowhead-selected' : 'arrowhead'})`}
                                                className="transition-all"
                                            />
                                        </g>
                                    );
                                })}
                                
                                {connectingStart && (
                                    <path 
                                        d={getDynamicPath(
                                            editingDef.bpmn_data.nodes.find(n=>n.id===connectingStart), 
                                            { position: mousePos, type: 'USER_TASK' }
                                        )} 
                                        stroke="#94a3b8" 
                                        strokeWidth="2" 
                                        strokeLinejoin="round"
                                        strokeDasharray="5,5" 
                                        fill="none" 
                                    />
                                )}
                            </svg>

                            {/* Labels for Flows */}
                            {editingDef.bpmn_data.flows.map(flow => {
                                const sourceNode = editingDef.bpmn_data.nodes.find(n => n.id === flow.sourceRef);
                                const targetNode = editingDef.bpmn_data.nodes.find(n => n.id === flow.targetRef);
                                if (!sourceNode || !targetNode || !flow.name) return null;
                                
                                const sourceEdges = getNodeEdges(sourceNode);
                                const targetEdges = getNodeEdges(targetNode);
                                const midX = (sourceEdges.x + targetEdges.x) / 2;
                                const midY = (sourceEdges.y + targetEdges.y) / 2;
                                const isSelected = selectedElement?.id === flow.id;

                                return (
                                    <div 
                                        key={`label_${flow.id}`}
                                        className={`absolute px-2 py-0.5 rounded text-[10px] font-black z-10 pointer-events-auto cursor-pointer whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 transition-colors border ${isSelected ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-slate-600 border-slate-200 shadow-sm hover:border-indigo-200'}`}
                                        style={{ left: midX, top: midY }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'flow', id: flow.id }); }}
                                        dir={isRtl ? 'rtl' : 'ltr'}
                                    >
                                        {flow.name}
                                    </div>
                                );
                            })}

                            {/* Nodes Layer */}
                            {editingDef.bpmn_data.nodes.map(node => {
                                const isSelected = selectedElement?.id === node.id;
                                const styleClass = getNodeStyle(node.type);
                                const isTargetable = connectingStart && connectingStart !== node.id;
                                
                                return (
                                    <div 
                                        key={node.id}
                                        className={`absolute flex items-center justify-center flex-col z-20 transition-all group ${isSelected ? 'ring-4 ring-indigo-500/30 rounded-xl' : isTargetable ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] rounded-xl cursor-pointer' : 'hover:ring-2 ring-slate-300 rounded-xl'}`}
                                        style={{ left: node.position.x, top: node.position.y, transform: 'translate(-50%, -50%)' }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'node', id: node.id }); }}
                                        onMouseDown={(e) => {
                                            if (e.target.closest('.connector')) return;
                                            e.stopPropagation();
                                            setDraggingNode(node.id);
                                            setSelectedElement({ type: 'node', id: node.id });
                                        }}
                                        onMouseUp={(e) => {
                                            e.stopPropagation();
                                            setDraggingNode(null);
                                            if (connectingStart && connectingStart !== node.id) {
                                                addFlow(connectingStart, node.id);
                                                setConnectingStart(null);
                                            }
                                        }}
                                    >
                                        <div className={`${styleClass} flex items-center justify-center relative cursor-move bg-white shadow-md`}>
                                            {node.type.includes('GATEWAY') ? (
                                                <div className="absolute inset-0 flex items-center justify-center -rotate-45 pointer-events-none">
                                                    {node.type === 'APPROVAL_GATEWAY' ? <Split size={24} /> : node.type === 'PARALLEL_GATEWAY' ? <Plus size={24} /> : <Diamond size={24} />}
                                                </div>
                                            ) : node.type === 'TIMER_EVENT' ? (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <Clock size={20} />
                                                </div>
                                            ) : (
                                                <div className="px-3 text-center text-[12px] font-black leading-tight select-none break-words max-w-full overflow-hidden pointer-events-none" dir={isRtl ? 'rtl' : 'ltr'}>
                                                    {node.name}
                                                </div>
                                            )}
                                            
                                            {/* 4 Connection Points */}
                                            {node.type !== 'END_EVENT' && ['top', 'right', 'bottom', 'left'].map(pos => (
                                                <div 
                                                    key={pos}
                                                    className={`connector absolute ${pos==='top'?'-top-3 left-1/2 -translate-x-1/2':pos==='bottom'?'-bottom-3 left-1/2 -translate-x-1/2':pos==='left'?'-left-3 top-1/2 -translate-y-1/2':'-right-3 top-1/2 -translate-y-1/2'} w-4 h-4 bg-white border border-indigo-500 rounded-full cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30 shadow-sm`}
                                                    onMouseDown={(e) => { e.stopPropagation(); setConnectingStart(node.id); }}
                                                >
                                                    <Plus size={10} className="text-indigo-500 pointer-events-none"/>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {(node.type.includes('GATEWAY') || node.type === 'TIMER_EVENT') && (
                                            <div className="absolute top-full mt-2 text-[10px] font-black text-slate-700 bg-white/90 px-2 py-0.5 rounded shadow-sm border border-slate-200 whitespace-nowrap" dir={isRtl ? 'rtl' : 'ltr'}>
                                                {node.name}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mini Settings Panel overlay */}
                    {selectedElement && (
                        <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-4`}>
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/30 p-3 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/50">
                                <span className="text-[12px] font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                                    {selectedElement.type === 'node' ? <Layers size={16} /> : <GitMerge size={16} />}
                                    {selectedElement.type === 'node' ? t('تنظیمات گره (Node)', 'Node Settings') : t('تنظیمات مسیر (Flow)', 'Flow Settings')}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={deleteSelected} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    <button onClick={() => setSelectedElement(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><X size={16}/></button>
                                </div>
                            </div>
                            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {selectedElement.type === 'node' && selectedNode ? (
                                    <>
                                        <TextField size="sm" label={t('عنوان نمایشی', 'Display Name')} value={selectedNode.name} onChange={(e) => updateElement('node', selectedNode.id, 'name', e.target.value)} isRtl={isRtl} />
                                        
                                        {selectedNode.type === 'USER_TASK' && (
                                            <>
                                                <SelectField size="sm" label={t('نوع فعالیت', 'Task Type')} value={selectedNode.task_type || 'APPROVAL'} onChange={(e) => updateElement('node', selectedNode.id, 'task_type', e.target.value)} options={[
                                                    {value: 'APPROVAL', label: t('بررسی و تایید/رد', 'Review & Approve/Reject')},
                                                    {value: 'DATA_ENTRY', label: t('تکمیل اطلاعات فرم', 'Form Data Entry')}
                                                ]} isRtl={isRtl} />
                                                
                                                {selectedNode.task_type === 'DATA_ENTRY' && (
                                                    <TextField size="sm" label={t('فرم متصل (Component Path)', 'Connected Form')} value={selectedNode.form_binding || ''} onChange={(e) => updateElement('node', selectedNode.id, 'form_binding', e.target.value)} isRtl={isRtl} placeholder={t('مثلا: financial/VoucherForm', 'e.g. financial/VoucherForm')} dir="ltr" />
                                                )}
                                                
                                                <TextField size="sm" label={t('نقش‌های مجاز (کاما جدا)', 'Assignee Roles')} value={selectedNode.assignee_roles || ''} onChange={(e) => updateElement('node', selectedNode.id, 'assignee_roles', e.target.value)} isRtl={isRtl} placeholder={t('مثلا: مدیر مالی, کارشناس', 'e.g. Finance Manager')} />
                                                <TextField size="sm" label={t('فیلدهای اجباری برای تغییر', 'Required Fields')} value={selectedNode.required_fields || ''} onChange={(e) => updateElement('node', selectedNode.id, 'required_fields', e.target.value)} isRtl={isRtl} placeholder={t('مثلا: amount, description', 'e.g. amount, description')} />
                                                
                                                <TextField size="sm" type="number" label={t('مهلت انجام (SLA - ساعت)', 'SLA (Hours)')} value={selectedNode.sla_hours || ''} onChange={(e) => updateElement('node', selectedNode.id, 'sla_hours', e.target.value)} isRtl={isRtl} placeholder="24" dir="ltr" />
                                                <SelectField size="sm" label={t('قانون ارجاع در صورت تاخیر', 'Escalation Rule')} value={selectedNode.escalation_rule || ''} onChange={(e) => updateElement('node', selectedNode.id, 'escalation_rule', e.target.value)} options={[
                                                    {value: '', label: t('بدون اقدام', 'None')},
                                                    {value: 'NOTIFY_MANAGER', label: t('اطلاع به مدیر', 'Notify Manager')},
                                                    {value: 'AUTO_FORWARD', label: t('ارجاع خودکار به مرحله بعد', 'Auto Forward')}
                                                ]} isRtl={isRtl} />
                                            </>
                                        )}

                                        {selectedNode.type === 'SERVICE_TASK' && (
                                            <>
                                                <SelectField size="sm" label={t('نوع عملیات', 'Action Type')} value={selectedNode.service_type || 'API_CALL'} onChange={(e) => updateElement('node', selectedNode.id, 'service_type', e.target.value)} options={[
                                                    {value: 'API_CALL', label: t('فراخوانی وب‌سرویس (API)', 'Call API')},
                                                    {value: 'DB_UPDATE', label: t('بروزرسانی وضعیت دیتابیس', 'Update Database')}
                                                ]} isRtl={isRtl} />
                                                <TextField size="sm" label={t('آدرس / متد هدف', 'Target Endpoint / Method')} value={selectedNode.target_endpoint || ''} onChange={(e) => updateElement('node', selectedNode.id, 'target_endpoint', e.target.value)} isRtl={isRtl} dir="ltr" placeholder="api/finance/approve" />
                                            </>
                                        )}

                                        {selectedNode.type === 'SEND_TASK' && (
                                            <>
                                                <SelectField size="sm" label={t('کانال ارتباطی', 'Channel')} value={selectedNode.channel || 'SYSTEM'} onChange={(e) => updateElement('node', selectedNode.id, 'channel', e.target.value)} options={[
                                                    {value: 'SYSTEM', label: t('نوتیفیکیشن سیستمی', 'System Notification')},
                                                    {value: 'SMS', label: t('پیامک', 'SMS')},
                                                    {value: 'EMAIL', label: t('ایمیل', 'Email')}
                                                ]} isRtl={isRtl} />
                                                <TextField size="sm" label={t('گیرنده (نقش / شخص)', 'Recipient')} value={selectedNode.recipient || ''} onChange={(e) => updateElement('node', selectedNode.id, 'recipient', e.target.value)} isRtl={isRtl} placeholder={t('ایجاد کننده سند', 'Document Creator')} />
                                                <TextField size="sm" label={t('متن پیام', 'Message Template')} value={selectedNode.message_template || ''} onChange={(e) => updateElement('node', selectedNode.id, 'message_template', e.target.value)} isRtl={isRtl} placeholder={t('سند شما تایید شد.', 'Your doc is approved.')} />
                                            </>
                                        )}

                                        {selectedNode.type === 'TIMER_EVENT' && (
                                            <>
                                                <TextField size="sm" type="number" label={t('مدت تاخیر (ساعت)', 'Delay (Hours)')} value={selectedNode.delay_hours || ''} onChange={(e) => updateElement('node', selectedNode.id, 'delay_hours', e.target.value)} isRtl={isRtl} dir="ltr" placeholder="48" />
                                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{t('فرآیند پس از رسیدن به این گره، تا زمان تعیین شده متوقف می‌ماند.', 'Process will pause here for the specified duration.')}</p>
                                            </>
                                        )}

                                        {selectedNode.type === 'SUB_PROCESS' && (
                                            <>
                                                <SelectField 
                                                    size="sm" 
                                                    label={t('انتخاب زیرفرآیند', 'Select Subprocess')} 
                                                    value={selectedNode.subprocess_id || ''} 
                                                    onChange={(e) => updateElement('node', selectedNode.id, 'subprocess_id', e.target.value)} 
                                                    options={[{value: '', label: t('انتخاب کنید...', 'Select...')}, ...workflowsList]} 
                                                    isRtl={isRtl} 
                                                />
                                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{t('در این گام، یک گردش کار طراحی شده دیگر اجرا خواهد شد.', 'In this step, another designed workflow will be executed.')}</p>
                                            </>
                                        )}

                                        {selectedNode.type === 'APPROVAL_GATEWAY' && (
                                            <div className="text-[12px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-justify leading-relaxed">
                                                {t('این دروازه مختص تصمیم‌گیری‌های بله/خیر است. دو مسیر خروجی از این گره بکشید. سیستم به صورت خودکار یکی را "تایید" و دیگری را "رد" نام‌گذاری می‌کند.', 'This gateway is for Yes/No decisions. Draw two outgoing flows; they will be automatically named Approve/Reject.')}
                                            </div>
                                        )}
                                        
                                        {selectedNode.type === 'EXCLUSIVE_GATEWAY' && (
                                            <div className="text-[12px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-justify leading-relaxed">
                                                {t('این دروازه برای انشعاب‌های شرطی چندگانه است. روی خطوط خروجی کلیک کنید تا شرط هر کدام را تعیین نمایید.', 'This gateway branches paths based on conditions. Click on outgoing flows to define their conditions.')}
                                            </div>
                                        )}

                                        {selectedNode.type === 'PARALLEL_GATEWAY' && (
                                            <div className="text-[12px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-justify leading-relaxed">
                                                {t('این دروازه فرآیند را به صورت همزمان (موازی) به چند مسیر تقسیم می‌کند، یا منتظر می‌ماند تا تمام مسیرهای ورودی به آن برسند تا ادامه دهد (AND).', 'This gateway splits the process into parallel paths, or waits for all incoming paths to merge (AND).')}
                                            </div>
                                        )}
                                    </>
                                ) : selectedFlow ? (
                                    <>
                                        <TextField size="sm" label={t('عنوان مسیر', 'Flow Label')} value={selectedFlow.name} onChange={(e) => updateElement('flow', selectedFlow.id, 'name', e.target.value)} isRtl={isRtl} />
                                        <TextField size="sm" label={t('عنوان دکمه در کارتابل', 'Action Button Label')} value={selectedFlow.action_label || ''} onChange={(e) => updateElement('flow', selectedFlow.id, 'action_label', e.target.value)} isRtl={isRtl} placeholder={t('مثلا: تایید و ارسال', 'e.g. Approve & Send')} />
                                        
                                        {(() => {
                                            const sourceNode = editingDef.bpmn_data.nodes.find(n => n.id === selectedFlow.sourceRef);
                                            if (sourceNode?.type === 'EXCLUSIVE_GATEWAY') {
                                                return (
                                                    <>
                                                        <ToggleField size="sm" label={t('مسیر پیش‌فرض', 'Default Flow')} checked={selectedFlow.is_default || false} onChange={(v) => {
                                                            updateElement('flow', selectedFlow.id, 'is_default', v);
                                                            if (v) updateElement('flow', selectedFlow.id, 'condition', '');
                                                        }} isRtl={isRtl} />
                                                        
                                                        <TextField size="sm" label={t('شرط عبور (Condition)', 'Condition Expression')} value={selectedFlow.condition || ''} onChange={(e) => updateElement('flow', selectedFlow.id, 'condition', e.target.value)} isRtl={isRtl} placeholder={t('مثلا: amount > 5000', 'e.g. amount > 5000')} dir="ltr" disabled={selectedFlow.is_default} />
                                                        <span className="text-[10px] text-slate-400 font-bold leading-relaxed -mt-1">{t('در صورت انتخاب به عنوان مسیر پیش‌فرض، نیازی به درج شرط عبور نیست.', 'If selected as default, condition expression is ignored.')}</span>
                                                    </>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  window.WorkflowDesign = WorkflowDesign;
})();