/* Filename: general/OrgChart.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Network = FallbackIcon, FolderTree = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon,
    Save = FallbackIcon, AlertTriangle = FallbackIcon, Copy = FallbackIcon
  } = LucideIcons;

  const OrgChart = ({ language = 'fa', formCode = 'ORG_CHART' }) => {
    const FallbackComponent = () => null;

    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, PageHeader = FallbackComponent, Badge = FallbackComponent, EmptyState = FallbackComponent } = Core;

    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, SelectField = FallbackComponent, ToggleField = FallbackComponent, DatePicker = FallbackComponent } = Forms;

    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent } = Grid;

    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
      return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true, hasCustomAccess: () => true };
    }, [securityCtx, formCode]);

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';
    const isFetchingCharts = useRef(false);

    const [viewMode, setViewMode] = useState('list');
    const [activeChart, setActiveChart] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    const [charts, setCharts] = useState([]);
    const [chartsGridState, setChartsGridState] = useState(null);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [chartFormData, setChartFormData] = useState({});

    const [copyModal, setCopyModal] = useState({ isOpen: false, sourceChart: null });
    const [copyOptions, setCopyOptions] = useState({ newCode: '', newTitle: '', newType: 'standard', newStartDate: '', newEndDate: '', newIsActive: false, includeTree: true, includePersonnel: false });
    const [isCopying, setIsCopying] = useState(false);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (entityType, recordId, action, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: entityType, record_id: String(recordId), action, user_name: currentUser, details
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

    useEffect(() => {
      if (access.canView) fetchCharts();
    }, [fetchCharts, access.canView]);

    const handleOpenChartModal = async (chart = null) => {
      if (chart) {
        setChartFormData({ ...chart });
      } else {
        let nextCode = '';
        if (window.AutoNumberingService) {
          try {
            const preview = await window.AutoNumberingService.previewNext('ORG_CHART');
            nextCode = typeof preview === 'string' ? preview : (preview?.formattedCode || '');
          } catch (err) {
            console.error('AutoNumbering Error:', err);
          }
        }
        setChartFormData({ code: nextCode, title: '', type: 'standard', is_active: true, start_date: '', end_date: '' });
      }
      setIsChartModalOpen(true);
    };

    const handleSaveChart = async () => {
      if (!chartFormData.code || !chartFormData.title) {
        return showToast(t('کد و عنوان اجباری است', 'Code and Title are required'), 'error');
      }
      try {
        const payload = {
          code: chartFormData.code, title: chartFormData.title, type: chartFormData.type,
          start_date: chartFormData.start_date || null, end_date: chartFormData.end_date || null,
          is_active: chartFormData.is_active
        };
        if (payload.is_active) {
          const q = supabase.from('fm_org_charts').update({ is_active: false }).eq('type', payload.type).eq('is_active', true);
          if (chartFormData.id) q.neq('id', chartFormData.id);
          await q;
        }
        if (chartFormData.id) {
          const { error } = await supabase.from('fm_org_charts').update(payload).eq('id', chartFormData.id);
          if (error) throw error;
          await logAction('چارت سازمانی', chartFormData.id, 'update', `ویرایش چارت سازمانی: ${payload.title}`);
          showToast(t('تغییرات با موفقیت ذخیره شد', 'Changes saved successfully'));
        } else {
          const { data, error } = await supabase.from('fm_org_charts').insert([payload]).select();
          if (error) throw error;
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('ORG_CHART'); } catch (e) { console.error(e); }
          }
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
      setViewMode('designer');
    };

    const handleOpenCopyModal = (chart) => {
      setCopyModal({ isOpen: true, sourceChart: chart });
      setCopyOptions({
        newCode: '',
        newTitle: `${chart.title} (${t('کپی', 'Copy')})`,
        newType: chart.type || 'standard',
        newStartDate: chart.start_date || '',
        newEndDate: chart.end_date || '',
        newIsActive: false,
        includeTree: true,
        includePersonnel: false
      });
    };

    const handleCopyChart = async () => {
      if (!copyOptions.newCode || !copyOptions.newTitle) {
        return showToast(t('کد و عنوان الزامی است', 'Code and title are required'), 'error');
      }
      setIsCopying(true);
      try {
        const source = copyModal.sourceChart;
        if (copyOptions.newIsActive) {
          await supabase.from('fm_org_charts').update({ is_active: false }).eq('type', copyOptions.newType).eq('is_active', true);
        }
        const { data: newChart, error: chartErr } = await supabase.from('fm_org_charts').insert([{
          code: copyOptions.newCode, title: copyOptions.newTitle, type: copyOptions.newType,
          start_date: copyOptions.newStartDate || null, end_date: copyOptions.newEndDate || null, is_active: copyOptions.newIsActive,
        }]).select();
        if (chartErr) throw chartErr;
        const newChartId = newChart[0].id;

        if (copyOptions.includeTree) {
          const { data: sourceNodes } = await supabase.from('fm_org_chart_nodes').select('*').eq('chart_id', source.id);
          if (sourceNodes && sourceNodes.length > 0) {
            const sorted = [...sourceNodes].sort((a, b) => (!a.parent_id && b.parent_id) ? -1 : (a.parent_id && !b.parent_id) ? 1 : 0);
            const idMap = {};
            for (const node of sorted) {
              const newParentId = node.parent_id ? (idMap[node.parent_id] ?? null) : null;
              const { data: inserted } = await supabase.from('fm_org_chart_nodes').insert([{
                chart_id: newChartId, code: node.code, title: node.title, parent_id: newParentId, is_active: node.is_active,
              }]).select('id');
              if (inserted && inserted[0]) idMap[node.id] = inserted[0].id;
            }
            if (copyOptions.includePersonnel) {
              const { data: srcP } = await supabase.from('fm_org_chart_personnel').select('*').in('node_id', sourceNodes.map(n => n.id));
              if (srcP && srcP.length > 0) {
                const pp = srcP.map(p => ({ node_id: idMap[p.node_id], person_id: p.person_id, person_name: p.person_name, from_date: p.from_date, to_date: p.to_date, is_manager: p.is_manager })).filter(p => p.node_id);
                if (pp.length > 0) await supabase.from('fm_org_chart_personnel').insert(pp);
              }
            }
          }
        }
        await logAction('چارت سازمانی', newChartId, 'create', `کپی چارت از: ${source.title}`);
        showToast(t('کپی با موفقیت انجام شد', 'Copy completed successfully'));
        setCopyModal({ isOpen: false, sourceChart: null });
        fetchCharts();
      } catch (err) {
        showToast(t('خطا در کپی ساختار', 'Error copying structure'), 'error');
      } finally {
        setIsCopying(false);
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('fm_org_charts').delete().eq('id', deleteConfirm.data);
        if (error) throw error;
        fetchCharts();
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
      currentState: () => ({ chartsGridState }),
      onApplyState: (state) => {
        if (state && state.chartsGridState) setChartsGridState(state.chartsGridState);
        else setChartsGridState(null);
      }
    }), [chartsGridState]);

    const chartColumns = [
      { field: 'code', header_fa: 'کد چارت', header_en: 'Code', width: '100px' },
      {
        field: 'title', header_fa: 'عنوان چارت', header_en: 'Title', width: '250px',
        render: (val, row) => {
          const isExpired = row.end_date && new Date(row.end_date) < new Date();
          return (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">{val}</span>
              {isExpired && <Badge variant="danger" className="!py-0 !px-1.5 !text-[10px]">{t('منقضی', 'Expired')}</Badge>}
            </div>
          );
        }
      },
      {
        field: 'type', header_fa: 'نوع چارت', header_en: 'Type', width: '120px', type: 'select',
        options: [{ value: 'standard', label: t('استاندارد', 'Standard') }, { value: 'sales', label: t('فروش', 'Sales') }, { value: 'finance', label: t('مالی', 'Finance') }, { value: 'hr', label: t('منابع انسانی', 'HR') }],
        render: (v) => {
          const labels = { standard: t('استاندارد', 'Standard'), sales: t('فروش', 'Sales'), finance: t('مالی', 'Finance'), hr: t('منابع انسانی', 'HR') };
          return <Badge variant={v === 'standard' ? 'indigo' : 'slate'} className="text-[10px]">{labels[v] || v}</Badge>;
        }
      },
      { field: 'start_date', header_fa: 'تاریخ شروع', header_en: 'Start Date', width: '100px', type: 'date' },
      { field: 'end_date', header_fa: 'تاریخ پایان', header_en: 'End Date', width: '100px', type: 'date' },
      { field: 'is_active', header_fa: 'فعال', header_en: 'Active', type: 'toggle', width: '100px' }
    ];

    // Designer mode: delegate to OrgChartMain
    if (viewMode === 'designer') {
      const DesignerComponent = window.OrgChartMain;
      if (!DesignerComponent) {
        return (
          <div className="p-8 text-center text-red-500 font-bold">
            {t('کامپوننت OrgChartMain یافت نشد. لطفاً فایل مربوطه را بارگذاری کنید.', 'OrgChartMain component not found. Please load the file.')}
            <Button className="mt-4" onClick={() => setViewMode('list')}>{t('بازگشت', 'Back')}</Button>
          </div>
        );
      }
      return <DesignerComponent chart={activeChart} onBack={() => setViewMode('list')} language={language} formCode={formCode} />;
    }

    // List mode
    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مدیریت چارت سازمانی', 'Organization Chart Management')}
          icon={Network} language={language}
          breadcrumbs={[{ label: t('تنظیمات پایه', 'Base Setup') }, { label: t('ساختار سازمانی', 'Organizational Structure') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 min-h-0 flex flex-col gap-3 animate-in fade-in duration-500">
          <div className="flex-1 min-h-0">
            <DataGrid
              data={charts} columns={chartColumns} language={language} formCode={formCode}
              gridState={chartsGridState} onGridStateChange={setChartsGridState}
              onAdd={access.canCreate ? () => handleOpenChartModal() : undefined}
              onRowDoubleClick={(row) => handleOpenChartModal(row)}
              hideImport={true} hideExport={true}
              actions={[
                { id: 'design', icon: FolderTree, tooltip: t('طراحی ساختار', 'Design Structure'), onClick: (row) => handleOpenDesigner(row), className: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30' },
                { id: 'copy', icon: Copy, tooltip: t('کپی ساختار', 'Copy Structure'), onClick: (row) => handleOpenCopyModal(row), className: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30' },
                { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => handleOpenChartModal(row), requiredAccess: 'edit' },
                { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'chart', data: row.id }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
              ]}
            />
          </div>
        </div>

        <Modal isOpen={isChartModalOpen} onClose={() => setIsChartModalOpen(false)} title={chartFormData.id ? t('ویرایش اطلاعات چارت', 'Edit Chart Info') : t('تعریف چارت جدید', 'Define New Chart')} language={language} width="max-w-2xl">
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField formCode={formCode} label={t('کد چارت', 'Chart Code')} value={chartFormData.code || ''} onChange={e => setChartFormData({ ...chartFormData, code: e.target.value })} isRtl={isRtl} required size="sm" dir="ltr" />
              <TextField formCode={formCode} label={t('عنوان چارت', 'Chart Title')} value={chartFormData.title || ''} onChange={e => setChartFormData({ ...chartFormData, title: e.target.value })} isRtl={isRtl} required size="sm" />
              <DatePicker formCode={formCode} label={t('تاریخ شروع اعتبار', 'Start Date')} value={chartFormData.start_date || ''} onChange={val => setChartFormData({ ...chartFormData, start_date: val })} isRtl={isRtl} size="sm" />
              <DatePicker formCode={formCode} label={t('تاریخ پایان اعتبار', 'End Date')} value={chartFormData.end_date || ''} onChange={val => setChartFormData({ ...chartFormData, end_date: val })} isRtl={isRtl} size="sm" />
              <SelectField formCode={formCode} label={t('نوع چارت', 'Chart Type')} value={chartFormData.type || 'standard'} onChange={e => setChartFormData({ ...chartFormData, type: e.target.value })} isRtl={isRtl} size="sm" options={[{ value: 'standard', label: t('استاندارد', 'Standard') }, { value: 'sales', label: t('فروش', 'Sales') }, { value: 'finance', label: t('مالی', 'Finance') }, { value: 'hr', label: t('منابع انسانی', 'HR') }]} />
              <div className="flex items-end pb-1.5">
                <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={chartFormData.is_active ?? true} onChange={val => setChartFormData({ ...chartFormData, is_active: val })} isRtl={isRtl} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsChartModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              {access.canEdit && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveChart}>{t('ذخیره تغییرات', 'Save Changes')}</Button>}
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

        <Modal isOpen={copyModal.isOpen} onClose={() => setCopyModal({ isOpen: false, sourceChart: null })} title={t('کپی ساختار سازمانی', 'Copy Organization Structure')} language={language} width="max-w-lg">
          <div className="p-4 flex flex-col gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-600 dark:text-slate-400">
              {t('ساختار منبع:', 'Source:')} <span className="font-bold text-slate-800 dark:text-slate-100">{copyModal.sourceChart?.title}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField formCode={formCode} label={t('کد جدید', 'New Code')} value={copyOptions.newCode} onChange={e => setCopyOptions(p => ({ ...p, newCode: e.target.value }))} isRtl={isRtl} required size="sm" dir="ltr" />
              <TextField formCode={formCode} label={t('عنوان جدید', 'New Title')} value={copyOptions.newTitle} onChange={e => setCopyOptions(p => ({ ...p, newTitle: e.target.value }))} isRtl={isRtl} required size="sm" />
              <DatePicker formCode={formCode} label={t('تاریخ شروع اعتبار', 'Start Date')} value={copyOptions.newStartDate} onChange={val => setCopyOptions(p => ({ ...p, newStartDate: val }))} isRtl={isRtl} size="sm" />
              <DatePicker formCode={formCode} label={t('تاریخ پایان اعتبار', 'End Date')} value={copyOptions.newEndDate} onChange={val => setCopyOptions(p => ({ ...p, newEndDate: val }))} isRtl={isRtl} size="sm" />
              <SelectField formCode={formCode} label={t('نوع چارت', 'Chart Type')} value={copyOptions.newType} onChange={e => setCopyOptions(p => ({ ...p, newType: e.target.value }))} isRtl={isRtl} size="sm" options={[{ value: 'standard', label: t('استاندارد', 'Standard') }, { value: 'sales', label: t('فروش', 'Sales') }, { value: 'finance', label: t('مالی', 'Finance') }, { value: 'hr', label: t('منابع انسانی', 'HR') }]} />
              <div className="flex items-end pb-1.5">
                <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={copyOptions.newIsActive} onChange={val => setCopyOptions(p => ({ ...p, newIsActive: val }))} isRtl={isRtl} />
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex flex-col gap-3">
              <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1">{t('محتویات کپی', 'Copy Contents')}</div>
              <div className="flex items-center gap-3 opacity-60">
                <input type="checkbox" checked={true} readOnly className="w-4 h-4 accent-indigo-600" />
                <span className="text-[13px] text-slate-700 dark:text-slate-200">{t('اطلاعات ساختار (اجباری)', 'Structure Info (Required)')}</span>
              </div>
              <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setCopyOptions(p => ({ ...p, includeTree: !p.includeTree, includePersonnel: p.includeTree ? false : p.includePersonnel }))}>
                <input type="checkbox" checked={copyOptions.includeTree} readOnly className="w-4 h-4 accent-indigo-600" />
                <span className="text-[13px] text-slate-700 dark:text-slate-200">{t('طراحی درخت گره‌ها', 'Tree Structure (Nodes)')}</span>
              </div>
              <div className={`flex items-center gap-3 select-none ${copyOptions.includeTree ? 'cursor-pointer' : 'opacity-40 pointer-events-none'}`} onClick={() => copyOptions.includeTree && setCopyOptions(p => ({ ...p, includePersonnel: !p.includePersonnel }))}>
                <input type="checkbox" checked={copyOptions.includePersonnel} readOnly className="w-4 h-4 accent-indigo-600" />
                <span className="text-[13px] text-slate-700 dark:text-slate-200">{t('پرسنل تخصیص یافته به گره‌ها', 'Assigned Personnel')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setCopyModal({ isOpen: false, sourceChart: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Copy} onClick={handleCopyChart} isLoading={isCopying}>{t('اجرای کپی', 'Copy Now')}</Button>
            </div>
          </div>
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  OrgChart.formCode = 'ORG_CHART';
  window.OrgChart = OrgChart;
})();