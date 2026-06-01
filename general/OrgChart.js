/* Filename: general/OrgChart.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    Network = FallbackIcon, FolderTree = FallbackIcon, Plus = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon,
    ArrowLeft = FallbackIcon, ArrowRight = FallbackIcon, Users = FallbackIcon, AlertTriangle = FallbackIcon, Lock = FallbackIcon,
    ChevronDown = FallbackIcon, ChevronUp = FallbackIcon
  } = LucideIcons;

  const OrgChart = ({ language = 'fa', formCode = 'ORG_CHART' }) => {
    const FallbackComponent = () => null;
    
    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, PageHeader = FallbackComponent, Badge = FallbackComponent, Card = FallbackComponent, EmptyState = FallbackComponent } = Core;
    
    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, SelectField = FallbackComponent, ToggleField = FallbackComponent, DatePicker = FallbackComponent } = Forms;
    
    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent, AdvancedFilter = FallbackComponent } = Grid;
    
    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;
    
    const TreeSystem = window.DSTree || window.DesignSystem || {};
    const { Tree = FallbackComponent } = TreeSystem;

    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    
    const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
    const access = useMemo(() => {
        return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true, hasCustomAccess: () => true };
    }, [rawActions]);

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const [viewMode, setViewMode] = useState('list');
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const isFetchingCharts = useRef(false);
    const isFetchingEmps = useRef(false);

    const [charts, setCharts] = useState([]);
    const [chartFilters, setChartFilters] = useState({});
    const [chartsGridState, setChartsGridState] = useState(null);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [chartFormData, setChartFormData] = useState({});

    const [activeChart, setActiveChart] = useState(null);
    const [rawNodes, setRawNodes] = useState([]);
    const [rawPersonnel, setRawPersonnel] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeForm, setNodeForm] = useState({ id: null, code: '', title: '', parentId: '', isActive: true });
    const [isNodeEditMode, setIsNodeEditMode] = useState(false);
    const [isNodeFormExpanded, setIsNodeFormExpanded] = useState(true);

    const [employees, setEmployees] = useState([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignData, setAssignData] = useState({ id: null, personId: '', fromDate: '', toDate: '', isManager: false });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (entityType, recordId, action, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: entityType, record_id: String(recordId), action: action, user_name: currentUser, details: details
        }]);
      } catch (err) {
        console.error('Failed to log action:', err);
      }
    }, [supabase, currentUser]);

    const fetchCharts = useCallback(async () => {
      if (isFetchingCharts.current) return;
      isFetchingCharts.current = true;
      setIsLoading(true);
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from('fm_org_charts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setCharts(data || []);
      } catch (err) {
        showToast(t('خطا در دریافت اطلاعات چارت‌ها', 'Error fetching charts'), 'error');
      } finally {
        setIsLoading(false);
        isFetchingCharts.current = false;
      }
    }, [supabase, showToast, t]);

    const fetchEmployees = useCallback(async () => {
      if (isFetchingEmps.current) return;
      isFetchingEmps.current = true;
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from('parties').select('id, code, first_name, last_name, company_name, party_type, roles').eq('is_active', true);
        if (error) throw error;
        
        const mappedEmps = (data || []).map(p => ({
          id: p.id,
          code: p.code,
          name: p.party_type === 'legal' ? p.company_name : `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          roles: p.roles || []
        }));
        
        setEmployees(mappedEmps);
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        isFetchingEmps.current = false;
      }
    }, [supabase]);

    useEffect(() => {
      let mounted = true;
      if (mounted && access.canView) {
        fetchCharts();
        fetchEmployees();
      }
      return () => { mounted = false; };
    }, [fetchCharts, fetchEmployees, access.canView]);

    const fetchDesignerData = async (chartId, retainNodeId = null) => {
      try {
        if (!supabase) return;
        const { data: nData, error: nErr } = await supabase.from('fm_org_chart_nodes').select('*').eq('chart_id', chartId);
        if (nErr) throw nErr;

        const mappedNodes = (nData || []).map(n => ({
          id: n.id,
          parentId: n.parent_id,
          title: n.title,
          code: n.code,
          isActive: n.is_active
        }));
        setRawNodes(mappedNodes);

        if (mappedNodes.length > 0) {
          const nodeIds = mappedNodes.map(n => n.id);
          const { data: pData, error: pErr } = await supabase.from('fm_org_chart_personnel').select('*').in('node_id', nodeIds);
          if (pErr) throw pErr;
          setRawPersonnel(pData || []);
        } else {
          setRawPersonnel([]);
        }

        if (retainNodeId) {
          const target = mappedNodes.find(n => n.id === retainNodeId);
          if (target) {
             setSelectedNode(target);
             setNodeForm({ id: target.id, code: target.code || '', title: target.title, parentId: target.parentId || '', isActive: target.isActive ?? true });
             setIsNodeEditMode(true);
          }
        }
      } catch (err) {
        showToast(t('خطا در دریافت ساختار چارت', 'Error fetching chart structure'), 'error');
      }
    };

    const filteredCharts = useMemo(() => {
      let result = [...charts];
      if (chartFilters.code) result = result.filter(c => (c.code || '').toLowerCase().includes(chartFilters.code.toLowerCase()));
      if (chartFilters.title) result = result.filter(c => (c.title || '').toLowerCase().includes(chartFilters.title.toLowerCase()));
      return result;
    }, [charts, chartFilters]);

    const handleOpenChartModal = (chart = null) => {
      if (chart) {
        setChartFormData({ ...chart });
      } else {
        setChartFormData({ code: '', title: '', type: 'standard', is_active: true, start_date: '', end_date: '' });
      }
      setIsChartModalOpen(true);
    };

    const handleSaveChart = async () => {
      if (!chartFormData.code || !chartFormData.title) {
        return showToast(t('کد و عنوان اجباری است', 'Code and Title are required'), 'error');
      }
      try {
        const payload = {
          code: chartFormData.code,
          title: chartFormData.title,
          type: chartFormData.type,
          start_date: chartFormData.start_date || null,
          end_date: chartFormData.end_date || null,
          is_active: chartFormData.is_active
        };

        if (chartFormData.id) {
          const { error } = await supabase.from('fm_org_charts').update(payload).eq('id', chartFormData.id);
          if (error) throw error;
          await logAction('چارت سازمانی', chartFormData.id, 'update', `ویرایش چارت سازمانی: ${payload.title}`);
          showToast(t('تغییرات با موفقیت ذخیره شد', 'Changes saved successfully'));
        } else {
          const { data, error } = await supabase.from('fm_org_charts').insert([payload]).select();
          if (error) throw error;
          if (data && data[0]) await logAction('چارت سازمانی', data[0].id, 'create', `ایجاد چارت جدید: ${payload.title}`);
          showToast(t('چارت سازمانی جدید ایجاد شد', 'New chart created successfully'));
        }
        setIsChartModalOpen(false);
        fetchCharts();
      } catch (err) {
        showToast(t('خطا در ذخیره اطلاعات', 'Error saving data'), 'error');
      }
    };

    const handleOpenDesigner = (chart) => {
      setActiveChart(chart);
      fetchDesignerData(chart.id);
      setSelectedNode(null);
      setNodeForm({ id: null, code: '', title: '', parentId: '', isActive: true });
      setIsNodeEditMode(false);
      setIsNodeFormExpanded(true);
      setViewMode('designer');
    };

    const handleSelectNode = (node) => {
      setSelectedNode(node);
      setNodeForm({ 
        id: node.id, 
        code: node.code || '', 
        title: node.title, 
        parentId: node.parentId || '', 
        isActive: node.isActive ?? true 
      });
      setIsNodeEditMode(true);
      setIsNodeFormExpanded(true);
    };

    const handlePrepareNewNode = (parentNode = null) => {
      setSelectedNode(null);
      setNodeForm({ id: null, code: '', title: '', parentId: parentNode ? parentNode.id : '', isActive: true });
      setIsNodeEditMode(false);
      setIsNodeFormExpanded(true);
    };

    const handleSaveNode = async () => {
      if (!nodeForm.title) return showToast(t('عنوان گره الزامی است', 'Node title is required'), 'error');
      try {
        const payload = {
          chart_id: activeChart.id,
          code: nodeForm.code,
          title: nodeForm.title,
          parent_id: nodeForm.parentId || null,
          is_active: nodeForm.isActive
        };

        let targetNodeId = null;

        if (isNodeEditMode && selectedNode) {
          if (nodeForm.parentId === selectedNode.id) return showToast(t('گره نمی‌تواند زیرمجموعه خودش باشد', 'Cannot be parent to itself'), 'error');
          const { error } = await supabase.from('fm_org_chart_nodes').update(payload).eq('id', selectedNode.id);
          if (error) throw error;
          targetNodeId = selectedNode.id;
        } else {
          const { data, error } = await supabase.from('fm_org_chart_nodes').insert([payload]).select();
          if (error) throw error;
          if (data && data[0]) targetNodeId = data[0].id;
        }
        
        await fetchDesignerData(activeChart.id, targetNodeId);
        showToast(t('عملیات با موفقیت انجام شد', 'Operation successful'));
      } catch (err) {
        showToast(t('خطا در ذخیره گره', 'Error saving node'), 'error');
      }
    };

    const handleDeleteNode = async (node) => {
      setDeleteConfirm({ isOpen: true, type: 'node', data: node.id });
    };

    const personnelDataForSelectedNode = useMemo(() => {
      if (!selectedNode) return [];
      return rawPersonnel.filter(p => p.node_id === selectedNode.id);
    }, [rawPersonnel, selectedNode]);

    const handleOpenAssignModal = (assignment = null) => {
      if (assignment) {
        setAssignData({ 
          id: assignment.id, 
          personId: assignment.person_id || '', 
          fromDate: assignment.from_date || '', 
          toDate: assignment.to_date || '',
          isManager: assignment.is_manager || false
        });
      } else {
        setAssignData({ id: null, personId: '', fromDate: '', toDate: '', isManager: false });
      }
      setIsAssignModalOpen(true);
    };

    const handleSaveAssignment = async () => {
      if (!assignData.personId || !selectedNode) return;
      const personName = employees.find(p => String(p.id) === String(assignData.personId))?.name || '';
      
      if (assignData.isManager) {
        const start1 = assignData.fromDate || '2000/01/01';
        const end1 = assignData.toDate || '2200/01/01';
        
        const otherManagers = personnelDataForSelectedNode.filter(p => p.is_manager && String(p.id) !== String(assignData.id));
        
        const hasOverlap = otherManagers.some(m => {
          const start2 = m.from_date || '2000/01/01';
          const end2 = m.to_date || '2200/01/01';
          return (start1 <= end2) && (start2 <= end1);
        });
        
        if (hasOverlap) {
          return showToast(t('تداخل تاریخ: در این بازه زمانی مسئول واحد دیگری تعریف شده است', 'Date overlap: Another manager exists in this period'), 'error');
        }
      }

      try {
        const payload = {
          node_id: selectedNode.id,
          person_id: assignData.personId,
          person_name: personName,
          from_date: assignData.fromDate || null,
          to_date: assignData.toDate || null,
          is_manager: assignData.isManager
        };

        if (assignData.id) {
          const { error } = await supabase.from('fm_org_chart_personnel').update(payload).eq('id', assignData.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_org_chart_personnel').insert([payload]);
          if (error) throw error;
        }

        await fetchDesignerData(activeChart.id, selectedNode.id);
        setIsAssignModalOpen(false);
        showToast(t('تخصیص پرسنل انجام شد', 'Personnel assigned'));
      } catch (err) {
        showToast(t('خطا در ذخیره تخصیص', 'Error saving assignment'), 'error');
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'chart') {
          const { error } = await supabase.from('fm_org_charts').delete().eq('id', deleteConfirm.data);
          if (error) throw error;
          fetchCharts();
        } else if (deleteConfirm.type === 'node') {
          const { error } = await supabase.from('fm_org_chart_nodes').delete().eq('id', deleteConfirm.data);
          if (error) throw error;
          await fetchDesignerData(activeChart.id);
          handlePrepareNewNode();
        } else if (deleteConfirm.type === 'personnel') {
          const { error } = await supabase.from('fm_org_chart_personnel').delete().eq('id', deleteConfirm.data);
          if (error) throw error;
          await fetchDesignerData(activeChart.id, selectedNode.id);
        }
        showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful'));
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        showToast(t('امکان حذف رکورد دارای وابستگی وجود ندارد', 'Cannot delete record with relations'), 'error');
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } finally {
        setIsLoading(false);
      }
    };

    const viewConfig = useMemo(() => ({
      pageId: 'org_chart_main',
      currentState: () => ({ viewMode, chartFilters, chartsGridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.viewMode) setViewMode(state.viewMode);
          if (state.chartFilters) setChartFilters(state.chartFilters);
          if (state.chartsGridState) setChartsGridState(state.chartsGridState);
        } else {
          setViewMode('list');
          setChartFilters({});
          setChartsGridState(null);
        }
      }
    }), [viewMode, chartFilters, chartsGridState]);

    const chartColumns = [
      { field: 'code', header_fa: 'کد چارت', header_en: 'Code', width: '100px' },
      { field: 'title', header_fa: 'عنوان چارت', header_en: 'Title', width: '200px' },
      { 
        field: 'type', header_fa: 'نوع چارت', header_en: 'Type', width: '120px', type: 'select',
        options: [{value: 'standard', label: t('استاندارد', 'Standard')}, {value: 'sales', label: t('فروش', 'Sales')}, {value: 'finance', label: t('مالی', 'Finance')}, {value: 'hr', label: t('منابع انسانی', 'HR')}],
        render: (v) => {
          const typeLabels = {
            standard: t('استاندارد', 'Standard'),
            sales: t('فروش', 'Sales'),
            finance: t('مالی', 'Finance'),
            hr: t('منابع انسانی', 'HR')
          };
          return <Badge variant={v === 'standard' ? 'indigo' : 'slate'} className="text-[10px]">{typeLabels[v] || v}</Badge>;
        }
      },
      { field: 'start_date', header_fa: 'تاریخ شروع', header_en: 'Start Date', width: '100px', type: 'date' },
      { field: 'end_date', header_fa: 'تاریخ پایان', header_en: 'End Date', width: '100px', type: 'date' },
      { field: 'is_active', header_fa: 'فعال', header_en: 'Active', type: 'toggle', width: '100px' }
    ];

    const personnelColumns = [
      { field: 'person_name', header_fa: 'نام شخص', header_en: 'Person Name', width: '180px', render: (v) => <span className="font-bold text-slate-700 dark:text-slate-200">{v}</span> },
      { field: 'is_manager', header_fa: 'مسئول واحد', header_en: 'Manager', width: '90px', type: 'toggle' },
      { field: 'from_date', header_fa: 'از تاریخ', header_en: 'From Date', width: '100px', type: 'date' },
      { field: 'to_date', header_fa: 'تا تاریخ', header_en: 'To Date', width: '100px', type: 'date' }
    ];

    const employeeOptions = useMemo(() => {
      return employees.filter(e => {
        if (!e.roles || !e.roles.includes('employee')) return false;
        const isAlreadyInNode = personnelDataForSelectedNode.some(p => String(p.person_id) === String(e.id) && String(p.id) !== String(assignData.id));
        return !isAlreadyInNode;
      }).map(e => ({ value: e.id, label: `${e.name} (${e.code})` }));
    }, [employees, personnelDataForSelectedNode, assignData.id]);

    const parentNodeOptions = rawNodes.filter(n => n.id !== nodeForm.id).map(n => ({ value: n.id, label: n.title }));

    const renderList = () => (
      <div className="flex-1 min-h-0 flex flex-col gap-3 animate-in fade-in duration-500">
        <AdvancedFilter 
          fields={[
            { name: 'code', label: t('کد چارت', 'Chart Code'), type: 'text' },
            { name: 'title', label: t('عنوان چارت', 'Chart Title'), type: 'text' }
          ]} 
          initialValues={chartFilters} onFilter={setChartFilters} onClear={() => setChartFilters({})} language={language} 
        />
        <div className="flex-1 min-h-0">
          <DataGrid 
            data={filteredCharts} columns={chartColumns} language={language} formCode={formCode}
            gridState={chartsGridState} onGridStateChange={setChartsGridState}
            onAdd={access.canCreate ? () => handleOpenChartModal() : undefined}
            hideImport={true}
            hideExport={true}
            actions={[
              { id: 'design', icon: FolderTree, tooltip: t('طراحی ساختار', 'Design Structure'), onClick: (row) => handleOpenDesigner(row), className: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30' },
              { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => handleOpenChartModal(row), requiredAccess: 'edit' },
              { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'chart', data: row.id }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
            ]}
          />
        </div>
      </div>
    );

    const renderDesigner = () => {
      const BackIcon = isRtl ? ArrowRight : ArrowLeft;
      return (
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 p-2 flex items-center gap-3 shrink-0">
            <Button variant="ghost" size="sm" icon={BackIcon} onClick={() => setViewMode('list')}>{t('بازگشت به لیست', 'Back to List')}</Button>
            <div className="h-5 w-px bg-slate-300 dark:bg-slate-600"></div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              {t('محیط طراحی چارت:', 'Chart Designer:')} <span className="text-indigo-600 dark:text-indigo-400">{activeChart?.title}</span>
            </h2>
          </div>

          <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
            <div className={`w-full md:w-[440px] flex flex-col bg-slate-50/50 dark:bg-slate-900/20 border-b md:border-b-0 ${isRtl ? 'md:border-l' : 'md:border-r'} border-slate-200 dark:border-slate-700`}>
              <Tree 
                data={rawNodes} language={language} formCode={formCode}
                idField="id" parentField="parentId" displayField="title" activeField="isActive"
                selectedId={selectedNode?.id}
                onSelect={handleSelectNode}
                onAddRoot={() => handlePrepareNewNode(null)}
                onAddChild={(node) => handlePrepareNewNode(node)}
                onDelete={handleDeleteNode}
              />
            </div>

            <div className="flex-1 flex flex-col overflow-auto custom-scrollbar p-4 gap-4 bg-slate-50 dark:bg-slate-900/30">
              <Card noPadding={false} language={language}>
                <div 
                  className="flex justify-between items-center cursor-pointer mb-2 pb-2 border-b border-slate-100 dark:border-slate-700/50"
                  onClick={() => setIsNodeFormExpanded(!isNodeFormExpanded)}
                >
                  <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {isNodeEditMode ? t('ویرایش اطلاعات گره', 'Edit Node Info') : t('تعریف گره جدید', 'Define New Node')}
                  </div>
                  <Button variant="ghost" size="sm" icon={isNodeFormExpanded ? ChevronUp : ChevronDown} />
                </div>
                
                {isNodeFormExpanded && (
                  <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      <TextField formCode={formCode} label={t('کد گره', 'Node Code')} value={nodeForm.code} onChange={e => setNodeForm({...nodeForm, code: e.target.value})} isRtl={isRtl} size="sm" />
                      <TextField formCode={formCode} label={t('عنوان گره', 'Node Title')} value={nodeForm.title} onChange={e => setNodeForm({...nodeForm, title: e.target.value})} isRtl={isRtl} required size="sm" />
                      <SelectField formCode={formCode} label={t('گره والد', 'Parent Node')} value={nodeForm.parentId} onChange={e => setNodeForm({...nodeForm, parentId: e.target.value})} isRtl={isRtl} size="sm" options={[{value: '', label: t('بدون والد (ریشه)', 'Root (No Parent)')}, ...parentNodeOptions]} />
                      <div className="flex items-end pb-1.5">
                        <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={nodeForm.isActive} onChange={val => setNodeForm({...nodeForm, isActive: val})} isRtl={isRtl} />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 gap-2">
                      {access.canEdit && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveNode}>{t('ذخیره گره', 'Save Node')}</Button>}
                    </div>
                  </div>
                )}
              </Card>

              <Card title={t('پرسنل تخصیص یافته به این گره', 'Assigned Personnel')} noPadding={true} language={language} className="flex-1 min-h-[300px]">
                <DataGrid 
                  data={personnelDataForSelectedNode} columns={personnelColumns} language={language} formCode={formCode}
                  onAdd={isNodeEditMode && access.canEdit ? () => handleOpenAssignModal() : undefined}
                  hideImport={true}
                  hideExport={true}
                  actions={[
                    { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => handleOpenAssignModal(row), requiredAccess: 'edit' },
                    { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'personnel', data: row.id }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
                  ]}
                />
              </Card>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('مدیریت چارت سازمانی', 'Organization Chart Management')}
          icon={Network} language={language}
          breadcrumbs={[{ label: t('تنظیمات پایه', 'Base Setup') }, { label: t('ساختار سازمانی', 'Organizational Structure') }]}
          viewConfig={viewConfig}
        />

        {viewMode === 'list' ? renderList() : renderDesigner()}

        <Modal isOpen={isChartModalOpen} onClose={() => setIsChartModalOpen(false)} title={chartFormData.id ? t('ویرایش اطلاعات چارت', 'Edit Chart Info') : t('تعریف چارت جدید', 'Define New Chart')} language={language} width="max-w-2xl">
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField formCode={formCode} label={t('کد چارت', 'Chart Code')} value={chartFormData.code} onChange={e => setChartFormData({...chartFormData, code: e.target.value})} isRtl={isRtl} required size="sm" />
              <TextField formCode={formCode} label={t('عنوان چارت', 'Chart Title')} value={chartFormData.title} onChange={e => setChartFormData({...chartFormData, title: e.target.value})} isRtl={isRtl} required size="sm" />
              <SelectField formCode={formCode} label={t('نوع چارت', 'Chart Type')} value={chartFormData.type} onChange={e => setChartFormData({...chartFormData, type: e.target.value})} isRtl={isRtl} size="sm" options={[{value: 'standard', label: t('استاندارد', 'Standard')}, {value: 'sales', label: t('فروش', 'Sales')}, {value: 'finance', label: t('مالی', 'Finance')}, {value: 'hr', label: t('منابع انسانی', 'HR')}]} />
              <div className="flex items-end pb-1.5">
                <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={chartFormData.is_active} onChange={val => setChartFormData({...chartFormData, is_active: val})} isRtl={isRtl} />
              </div>
              <DatePicker formCode={formCode} label={t('تاریخ شروع اعتبار', 'Start Date')} value={chartFormData.start_date} onChange={val => setChartFormData({...chartFormData, start_date: val})} isRtl={isRtl} size="sm" />
              <DatePicker formCode={formCode} label={t('تاریخ پایان اعتبار', 'End Date')} value={chartFormData.end_date} onChange={val => setChartFormData({...chartFormData, end_date: val})} isRtl={isRtl} size="sm" />
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsChartModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              {access.canEdit && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveChart}>{t('ذخیره تغییرات', 'Save Changes')}</Button>}
            </div>
          </div>
        </Modal>

        <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={t('تخصیص پرسنل به گره', 'Assign Personnel to Node')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-4">
            <SelectField formCode={formCode} label={t('انتخاب شخص', 'Select Person')} value={assignData.personId} onChange={e => setAssignData({...assignData, personId: e.target.value})} options={employeeOptions} isRtl={isRtl} required size="sm" />
            <div className="flex items-center pt-2">
                <ToggleField formCode={formCode} label={t('مسئول واحد', 'Manager')} checked={assignData.isManager} onChange={val => setAssignData({...assignData, isManager: val})} isRtl={isRtl} />
            </div>
            <DatePicker formCode={formCode} label={t('از تاریخ', 'From Date')} value={assignData.fromDate} onChange={val => setAssignData({...assignData, fromDate: val})} isRtl={isRtl} size="sm" />
            <DatePicker formCode={formCode} label={t('تا تاریخ', 'To Date')} value={assignData.toDate} onChange={val => setAssignData({...assignData, toDate: val})} isRtl={isRtl} size="sm" />
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              {access.canEdit && <Button variant="primary" size="sm" onClick={handleSaveAssignment}>{t('تخصیص و ذخیره', 'Assign & Save')}</Button>}
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={t('آیا از حذف این مورد اطمینان دارید؟', 'Are you sure you want to delete this item?')}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Delete Now')}</Button>
              </div>
            }
          />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  OrgChart.formCode = 'ORG_CHART';
  window.OrgChart = OrgChart;
})();