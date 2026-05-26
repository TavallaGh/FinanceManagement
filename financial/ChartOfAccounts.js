/* Filename: financial/ChartOfAccounts.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Network = FallbackIcon, Plus = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon,
    Copy = FallbackIcon, AlertTriangle = FallbackIcon, Lock = FallbackIcon, Info = FallbackIcon
  } = LucideIcons;

  const ChartOfAccounts = ({ language = 'fa', formCode = 'CHART_OF_ACCOUNTS' }) => {
    const FallbackComponent = () => null;

    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, PageHeader = FallbackComponent } = Core;

    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, ToggleField = FallbackComponent, DatePicker = FallbackComponent } = Forms;

    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent } = Grid;

    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent, Alert = FallbackComponent } = Feedback;

    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
      return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const [viewMode, setViewMode] = useState('list');
    const [activeChart, setActiveChart] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    
    const [charts, setCharts] = useState([]);
    const [chartsGridState, setChartsGridState] = useState(null);
    
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [chartFormData, setChartFormData] = useState({});
    
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [copyFormData, setCopyFormData] = useState({ sourceId: null, code: '', title: '' });
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

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
        console.error('Action log failed:', err);
      }
    }, [supabase, currentUser]);

    const fetchCharts = useCallback(async () => {
      setIsLoading(true);
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from('fm_coa_charts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setCharts(data || []);
      } catch (err) {
        showToast(t('خطا در دریافت اطلاعات ساختارهای حساب', 'Error fetching charts'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [supabase, showToast, t]);

    useEffect(() => {
      if (access.canView && viewMode === 'list') {
        fetchCharts();
      }
    }, [fetchCharts, access.canView, viewMode]);

    const handleOpenChartModal = (chart = null) => {
      if (chart) {
        setChartFormData({ ...chart });
      } else {
        setChartFormData({
          code: '', title: '', is_active: true, start_date: '', end_date: '',
          len_group: '1', len_general: '2', len_subsidiary: '3', len_detail: '4'
        });
      }
      setIsChartModalOpen(true);
    };

    const handleSaveChart = async () => {
      if (!chartFormData.code || !chartFormData.title) {
        return showToast(t('وارد کردن کد و عنوان اجباری است', 'Code and Title are required'), 'error');
      }
      try {
        const payload = {
          code: chartFormData.code,
          title: chartFormData.title,
          start_date: chartFormData.start_date || null,
          end_date: chartFormData.end_date || null,
          is_active: chartFormData.is_active,
          len_group: parseInt(chartFormData.len_group || 1, 10),
          len_general: parseInt(chartFormData.len_general || 2, 10),
          len_subsidiary: parseInt(chartFormData.len_subsidiary || 3, 10),
          len_detail: parseInt(chartFormData.len_detail || 4, 10)
        };

        if (chartFormData.id) {
          const { error } = await supabase.from('fm_coa_charts').update(payload).eq('id', chartFormData.id);
          if (error) throw error;
          await logAction('ساختار حساب‌ها', chartFormData.id, 'update', `ویرایش ساختار: ${payload.title}`);
        } else {
          const { data, error } = await supabase.from('fm_coa_charts').insert([payload]).select();
          if (error) throw error;
          if (data && data[0]) {
            await logAction('ساختار حساب‌ها', data[0].id, 'create', `ایجاد ساختار جدید: ${payload.title}`);
          }
        }
        setIsChartModalOpen(false);
        fetchCharts();
        showToast(t('ساختار با موفقیت ذخیره شد', 'Structure saved successfully'));
      } catch (err) {
        showToast(t('خطا در ذخیره اطلاعات ساختار', 'Error saving chart definition'), 'error');
      }
    };

    const handleOpenCopyModal = (chart) => {
      setCopyFormData({ sourceId: chart.id, code: `${chart.code}_COPY`, title: `${chart.title} - ${t('کپی', 'Copy')}` });
      setIsCopyModalOpen(true);
    };

    const handleExecuteCopy = async () => {
      if (!copyFormData.code || !copyFormData.title) return;
      setIsLoading(true);
      try {
        const { data: srcChart, error: sErr } = await supabase.from('fm_coa_charts').select('*').eq('id', copyFormData.sourceId).single();
        if (sErr || !srcChart) throw new Error('Source chart missing');

        const { data: newChart, error: iErr } = await supabase.from('fm_coa_charts').insert([{
          code: copyFormData.code,
          title: copyFormData.title,
          start_date: srcChart.start_date,
          end_date: srcChart.end_date,
          is_active: srcChart.is_active,
          len_group: srcChart.len_group,
          len_general: srcChart.len_general,
          len_subsidiary: srcChart.len_subsidiary,
          len_detail: srcChart.len_detail
        }]).select().single();

        if (iErr || !newChart) throw iErr;

        const { data: srcAccounts, error: aErr } = await supabase.from('fm_coa_accounts').select('*').eq('chart_id', copyFormData.sourceId).order('created_at', { ascending: true });
        if (aErr) throw aErr;

        if (srcAccounts && srcAccounts.length > 0) {
          const idMapping = {};
          for (const acc of srcAccounts) {
            const mappedParentId = acc.parent_id ? idMapping[acc.parent_id] : null;
            const { data: insertedAcc, error: accInsErr } = await supabase.from('fm_coa_accounts').insert([{
              chart_id: newChart.id,
              parent_id: mappedParentId,
              code: acc.code,
              title_fa: acc.title_fa,
              title_en: acc.title_en,
              currency_id: acc.currency_id,
              is_active: acc.is_active,
              account_type: acc.account_type,
              control_inventory: acc.control_inventory
            }]).select().single();

            if (!accInsErr && insertedAcc) {
              idMapping[acc.id] = insertedAcc.id;
            }
          }
        }

        await logAction('ساختار حساب‌ها', newChart.id, 'create', `کپی برداری ساختار از شناسه ${copyFormData.sourceId}`);
        setIsCopyModalOpen(false);
        fetchCharts();
        showToast(t('ساختار حساب با تمامی زیرمجموعه‌ها کپی شد', 'Chart structure copied completely'));
      } catch (err) {
        showToast(t('خطا در فرآیند کپی ساختار', 'Error duplicating structure'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleOpenDesigner = (chart) => {
      setActiveChart(chart);
      setViewMode('designer');
    };

    const executeDelete = async () => {
      try {
        if (deleteConfirm.type === 'chart') {
          const { error } = await supabase.from('fm_coa_charts').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          fetchCharts();
          showToast(t('رکورد با موفقیت حذف شد', 'Deleted successfully'));
        }
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        showToast(t('امکان حذف رکورد به دلیل وابستگی‌های جانبی وجود ندارد', 'Deletion failed due to existing relationships'), 'error');
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      }
    };

    const chartColumns = [
      { field: 'code', header_fa: 'کد ساختار', header_en: 'Code', width: '120px' },
      { field: 'title', header_fa: 'عنوان ساختار', header_en: 'Structure Title', width: '180px' },
      { field: 'start_date', header_fa: 'تاریخ شروع موثر', header_en: 'Effective Start', width: '120px', type: 'date' },
      { field: 'end_date', header_fa: 'تاریخ پایان موثر', header_en: 'Effective End', width: '120px', type: 'date' },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Active', type: 'toggle', width: '120px' }
    ];

    const viewConfig = useMemo(() => ({
      pageId: 'coa_charts_main_list',
      currentState: () => ({ viewMode, chartsGridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.viewMode) setViewMode(state.viewMode);
          if (state.chartsGridState) setChartsGridState(state.chartsGridState);
        } else {
          setViewMode('list');
          setChartsGridState(null);
        }
      }
    }), [viewMode, chartsGridState]);

    if (viewMode === 'designer') {
      const DesignerComponent = window.ChartOfAccountsMain;
      if (!DesignerComponent) {
        return (
          <div className="p-8 text-center text-red-500 font-bold">
            {t('کامپوننت ChartOfAccountsMain یافت نشد. لطفاً فایل مربوطه را بارگذاری کنید.', 'ChartOfAccountsMain component not found.')}
            <Button className="mt-4" onClick={() => setViewMode('list')}>{t('بازگشت', 'Back')}</Button>
          </div>
        );
      }
      return <DesignerComponent chart={activeChart} onBack={() => setViewMode('list')} language={language} formCode={formCode} />;
    }

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('ساختار و درخت حساب‌ها (Coding)', 'Chart of Accounts Setup')}
          icon={Network} language={language}
          description={t('مدیریت مدل‌های کدینگ مالی و تخصیص سطوح دسترسی کاربران', 'Define accounting structures, levels, and access profiles')}
          breadcrumbs={[{ label: t('مدیریت مالی', 'Financial Setup') }, { label: t('کدینگ حساب‌ها', 'Chart of Accounts') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 min-h-0 flex flex-col gap-1 mt-2 animate-in fade-in duration-500">
          <div className="flex-1 min-h-0">
            <DataGrid
              data={charts} columns={chartColumns} language={language} formCode={formCode}
              gridState={chartsGridState} onGridStateChange={setChartsGridState}
              onAdd={access.canCreate ? () => handleOpenChartModal() : undefined}
              actions={[
                { id: 'design', icon: Network, tooltip: t('طراحی درخت حساب‌ها', 'Design Tree Structure'), onClick: (row) => handleOpenDesigner(row), className: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50' },
                { id: 'copy', icon: Copy, tooltip: t('کپی ساختار', 'Duplicate Entire Structure'), onClick: (row) => handleOpenCopyModal(row), className: 'text-emerald-600 dark:text-emerald-400' },
                { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit Definition'), onClick: (row) => handleOpenChartModal(row), requiredAccess: 'edit' },
                { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete Structure'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'chart', data: row }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
              ]}
            />
          </div>
        </div>

        <Modal isOpen={isChartModalOpen} onClose={() => setIsChartModalOpen(false)} title={chartFormData.id ? t('ویرایش مشخصات ساختار', 'Edit Structure Definition') : t('تعریف ساختار حساب جدید', 'New Chart Model Setup')} language={language} width="max-w-2xl">
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField size="sm" formCode={formCode} label={t('کد ساختار حساب', 'Structure Code')} value={chartFormData.code || ''} onChange={e => setChartFormData({ ...chartFormData, code: e.target.value })} isRtl={isRtl} required dir="ltr" />
              <TextField size="sm" formCode={formCode} label={t('عنوان ساختار', 'Coding Model Title')} value={chartFormData.title || ''} onChange={e => setChartFormData({ ...chartFormData, title: e.target.value })} isRtl={isRtl} required />
              <DatePicker size="sm" formCode={formCode} label={t('تاریخ شروع اعتبار', 'Effective From')} value={chartFormData.start_date || ''} onChange={val => setChartFormData({ ...chartFormData, start_date: val })} isRtl={isRtl} />
              <DatePicker size="sm" formCode={formCode} label={t('تاریخ پایان اعتبار', 'Effective To')} value={chartFormData.end_date || ''} onChange={val => setChartFormData({ ...chartFormData, end_date: val })} isRtl={isRtl} />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1"><Info size={14} className="text-indigo-500" /> {t('برای تولید اتوماتیک کدها، طول هر کد را مشخص کنید', 'Segment Formatting Setup for Auto Suggested Increments')}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <TextField size="sm" type="number" formCode={formCode} label={t('طول کد گروه', 'Group Code Len')} value={chartFormData.len_group || '1'} onChange={e => setChartFormData({ ...chartFormData, len_group: e.target.value })} isRtl={isRtl} dir="ltr" />
                <TextField size="sm" type="number" formCode={formCode} label={t('طول کد کل', 'GL Code Len')} value={chartFormData.len_general || '2'} onChange={e => setChartFormData({ ...chartFormData, len_general: e.target.value })} isRtl={isRtl} dir="ltr" />
                <TextField size="sm" type="number" formCode={formCode} label={t('طول کد معین', 'Subsidiary Len')} value={chartFormData.len_subsidiary || '3'} onChange={e => setChartFormData({ ...chartFormData, len_subsidiary: e.target.value })} isRtl={isRtl} dir="ltr" />
                <TextField size="sm" type="number" formCode={formCode} label={t('طول کد تفصیل', 'Detail Len')} value={chartFormData.len_detail || '4'} onChange={e => setChartFormData({ ...chartFormData, len_detail: e.target.value })} isRtl={isRtl} dir="ltr" />
              </div>
            </div>

            <div className="flex items-center pt-1">
              <ToggleField size="sm" formCode={formCode} label={t('فعال', 'Is Active')} checked={chartFormData.is_active !== false} onChange={val => setChartFormData({ ...chartFormData, is_active: val })} isRtl={isRtl} />
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button size="sm" variant="outline" onClick={() => setIsChartModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              {access.canEdit && <Button size="sm" variant="primary" icon={Save} onClick={handleSaveChart}>{t('ذخیره ساختار', 'Save Setup')}</Button>}
            </div>
          </div>
        </Modal>

        <Modal isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} title={t('کپی‌برداری کامل از ساختار حساب', 'Duplicate Account Code Hierarchy')} language={language} width="max-w-md">
          <div className="p-4 flex flex-col gap-4">
            <Alert type="info" message={t('با انجام این عملیات، تمامی نودهای درخت حسابهای ساختار مبدا، عینا به همراه متدهای کدینگ در قالب یک ساختار جدید تکثیر خواهند شد.', 'This procedure copies all ledger nodes recursively, creating a duplicate tree mapping.')} />
            <TextField size="sm" formCode={formCode} label={t('کد ساختار جدید', 'New Code Target')} value={copyFormData.code} onChange={e => setCopyFormData({ ...copyFormData, code: e.target.value })} isRtl={isRtl} required dir="ltr" />
            <TextField size="sm" formCode={formCode} label={t('عنوان ساختار جدید', 'New Title Target')} value={copyFormData.title} onChange={e => setCopyFormData({ ...copyFormData, title: e.target.value })} isRtl={isRtl} required />
            
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button size="sm" variant="outline" onClick={() => setIsCopyModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="primary" icon={Copy} onClick={handleExecuteCopy} isLoading={isLoading}>{t('شروع فرآیند کپی پیوندها', 'Execute Duplication')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید حذف قطعی رکورد', 'Confirm Permanent Revocation')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-3 items-center text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1"><AlertTriangle size={22} /></div>
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1"><Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}</div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-1">
              {t(`آیا از حذف کامل ساختار "${deleteConfirm.data?.title}" و تمامی کدهای متصل به آن اطمینان دارید؟`, `Are you sure you want to delete structure "${deleteConfirm.data?.title}" and all nested accounts?`)}
            </p>
            <div className="flex gap-2 mt-4 w-full">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="primary" onClick={executeDelete} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 border-red-600 dark:border-red-500 shadow-lg">{t('تایید حذف نهایی', 'Delete Now')}</Button>
            </div>
          </div>
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  ChartOfAccounts.formCode = 'CHART_OF_ACCOUNTS';
  window.ChartOfAccounts = ChartOfAccounts;
})();
