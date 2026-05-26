/* Filename: workflow/WorkflowManagement.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    GitMerge = FallbackIcon, Plus = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, 
    RefreshCw = FallbackIcon, Database = FallbackIcon, Layout = FallbackIcon
  } = LucideIcons;

  const WorkflowManagement = ({ language = 'fa' }) => {
    const FallbackComponent = () => null;
    const Core = window.DSCore || window.DesignSystem || {};
    const { 
      Button = FallbackComponent, PageHeader = FallbackComponent, Badge = FallbackComponent
    } = Core;
    
    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent, AdvancedFilter = FallbackComponent } = Grid;
    
    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Toast = FallbackComponent, Dialog = FallbackComponent } = Feedback;

    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;

    const supabase = window.supabase;

    const [viewMode, setViewMode] = useState('list');
    const [definitions, setDefinitions] = useState([]);
    const [systemEntities, setSystemEntities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'info' });
    const [activeDef, setActiveDef] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const viewConfig = {
      pageId: 'workflow_management_main',
      currentState: () => ({ filters, gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.filters) setFilters(state.filters);
          if (state.gridState) setGridState(state.gridState);
        } else {
          setFilters({});
          setGridState(null);
        }
      }
    };

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        if (!supabase) throw new Error("Supabase is not initialized");
        
        const [defRes, entRes] = await Promise.all([
            supabase.schema('wf').from('wf_definitions').select('*').order('created_at', { ascending: false }),
            supabase.from('sys_entities').select('*').order('domain_name')
        ]);

        if (defRes.error) throw defRes.error;
        if (entRes.error) throw entRes.error;

        setDefinitions(defRes.data || []);
        setSystemEntities(entRes.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
        showToast(t('خطا در دریافت اطلاعات', 'Error fetching data'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      if (viewMode === 'list') {
          fetchInitialData();
      }
    }, [viewMode]);

    const entityOptions = useMemo(() => {
        return systemEntities.map(e => ({
            value: e.entity_code,
            label: isRtl ? `${e.name_fa} (${e.domain_name} - ${e.module_name})` : `${e.name_en} (${e.domain_name} - ${e.module_name})`
        }));
    }, [systemEntities, isRtl]);

    const getEntityDisplay = (code) => {
        const ent = systemEntities.find(e => e.entity_code === code);
        if (!ent) return code;
        return isRtl ? ent.name_fa : ent.name_en;
    };

    const handleNewWorkflow = () => {
        setActiveDef(null);
        setViewMode('design');
    };

    const handleEditWorkflow = (def) => {
        setActiveDef(def);
        setViewMode('design');
    };

    const handleDesignBack = (shouldRefresh) => {
        setViewMode('list');
        if (shouldRefresh) {
            fetchInitialData();
        }
    };

    const executeDelete = async () => {
        try {
            if (!deleteConfirm) return;
            const { error } = await supabase.schema('wf').from('wf_definitions').delete().eq('id', deleteConfirm);
            if (error) throw error;
            showToast(t('گردش کار با موفقیت حذف شد.', 'Workflow deleted successfully.'));
            setDeleteConfirm(null);
            fetchInitialData();
        } catch (err) {
            console.error("Delete error:", err);
            showToast(t('خطا در حذف گردش کار (ممکن است دارای سوابق اجرایی باشد)', 'Error deleting workflow (might have active instances)'), 'error');
            setDeleteConfirm(null);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const { error } = await supabase.schema('wf').from('wf_definitions').update({ is_active: !currentStatus }).eq('id', id);
            if (error) throw error;
            showToast(t('وضعیت گردش کار تغییر کرد.', 'Workflow status updated.'));
            fetchInitialData();
        } catch (err) {
            console.error("Status error:", err);
            showToast(t('خطا در تغییر وضعیت', 'Error changing status'), 'error');
        }
    };

    const columns = [
        { field: 'title', header_fa: 'عنوان گردش کار', header_en: 'Title', width: '250px', render: (v) => <span className="font-black text-slate-800 dark:text-slate-100">{v}</span> },
        { field: 'entity_type', header_fa: 'موجودیت هدف', header_en: 'Target Entity', width: '220px', render: (v) => (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 w-fit">
                <Database size={12} className="text-indigo-500" />
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{getEntityDisplay(v)}</span>
            </div>
        )},
        { field: 'version', header_fa: 'نسخه', header_en: 'Version', width: '80px', render: (v) => <Badge variant="slate" size="sm" className="font-mono">v{v}.0</Badge> },
        { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '100px', render: (v, row) => (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleStatus(row.id, v)}>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${v ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${v ? (isRtl ? '-translate-x-4' : 'translate-x-4') : ''}`}></div>
                </div>
                <span className={`text-[10px] font-bold ${v ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{v ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}</span>
            </div>
        )}
    ];

    const filteredDefinitions = useMemo(() => {
        let result = [...definitions];
        if (filters.title) {
            result = result.filter(d => d.title.toLowerCase().includes(filters.title.toLowerCase()));
        }
        if (filters.entity_type) {
            result = result.filter(d => d.entity_type === filters.entity_type);
        }
        if (filters.is_active !== undefined && filters.is_active !== '') {
            const isActive = filters.is_active === 'true';
            result = result.filter(d => d.is_active === isActive);
        }
        return result;
    }, [definitions, filters]);

    if (viewMode === 'design') {
        const Designer = window.WorkflowDesign;
        if (!Designer) {
            return (
                <div className="p-8 text-center text-rose-500 font-bold font-sans">
                    {t('خطا: کامپوننت WorkflowDesign یافت نشد.', 'Error: WorkflowDesign component not found.')}
                </div>
            );
        }
        return <Designer definition={activeDef} systemEntities={systemEntities} onBack={handleDesignBack} language={language} />;
    }

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('مدیریت گردش کارها (BPMS)', 'Workflow Management (BPMS)')}
          icon={GitMerge} language={language}
          breadcrumbs={[{ label: t('عملیات سیستم', 'System Operations') }, { label: t('گردش کارها', 'Workflows') }]}
          viewConfig={viewConfig}
        >
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchInitialData} className="shadow-sm bg-white dark:bg-slate-800">
                    {t('بروزرسانی', 'Refresh')}
                </Button>
                <Button variant="primary" size="sm" icon={Plus} onClick={handleNewWorkflow} className="shadow-sm">
                    {t('طراحی گردش کار جدید', 'Design New Workflow')}
                </Button>
            </div>
        </PageHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-500">
            <AdvancedFilter 
                fields={[
                  { name: 'title', label: t('عنوان گردش کار', 'Workflow Title'), type: 'text' },
                  { name: 'entity_type', label: t('موجودیت', 'Entity'), type: 'select', options: entityOptions },
                  { name: 'is_active', label: t('وضعیت', 'Status'), type: 'select', options: [
                      {value: 'true', label: t('فعال', 'Active')},
                      {value: 'false', label: t('غیرفعال', 'Inactive')}
                  ]}
                ]}
                initialValues={filters}
                onFilter={setFilters}
                onClear={() => setFilters({})}
                language={language}
            />
            
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-b-2xl md:rounded-b-none md:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 h-full">
                        <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]">{t('در حال دریافت اطلاعات...', 'Loading data...')}</span>
                    </div>
                ) : (
                    <DataGrid 
                        data={filteredDefinitions} 
                        columns={columns} 
                        language={language}
                        selectable={false}
                        gridState={gridState}
                        onGridStateChange={setGridState}
                        onAdd={() => handleNewWorkflow()}
                        actions={[
                            { icon: Edit, tooltip: t('ویرایش و طراحی فرایند', 'Edit Process Design'), onClick: (row) => handleEditWorkflow(row), className: 'text-slate-400 hover:text-indigo-600' },
                            { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm(row.id), className: 'text-slate-400 hover:text-red-600' }
                        ]}
                    />
                )}
            </div>
        </div>

        <Dialog 
            isOpen={!!deleteConfirm} 
            title={t('حذف گردش کار', 'Delete Workflow')}
            type="error"
            confirmLabel={t('بله، حذف شود', 'Yes, Delete')}
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={executeDelete}
            language={language}
        >
            {t('آیا از حذف این گردش کار اطمینان دارید؟ در صورتی که این گردش کار دارای سوابق اجرایی در سیستم باشد، حذف آن امکان‌پذیر نخواهد بود.', 'Are you sure you want to delete this workflow? If it has active instances, deletion will fail.')}
        </Dialog>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  window.WorkflowManagement = WorkflowManagement;
})();