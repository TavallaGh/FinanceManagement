/* Filename: general/CurrencySettings.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    DollarSign = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, RefreshCw = FallbackIcon, History = FallbackIcon, Check = FallbackIcon, X = FallbackIcon,
    Lock = FallbackIcon, AlertTriangle = FallbackIcon, Globe = FallbackIcon, Save = FallbackIcon
  } = LucideIcons;

  const CurrencySettings = ({ language = 'fa', formCode = 'SYS_CURRENCY' }) => {
    const FallbackComponent = () => null;
    const Core = window.DSCore || window.DesignSystem || {};
    const { 
      Button = FallbackComponent, TextField = FallbackComponent, SelectField = FallbackComponent, ToggleField = FallbackComponent, Badge = FallbackComponent, PageHeader = FallbackComponent, 
      Tabs = FallbackComponent 
    } = Core;
    
    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent, AdvancedFilter = FallbackComponent } = Grid;
    
    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent, LogTimeline = FallbackComponent } = Feedback;

    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;

    const getTodayGregorian = () => {
      const d = new Date();
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayStr = getTodayGregorian();

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = securityCtx ? securityCtx.getActions(formCode) : { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    const isReadOnly = !access.canEdit && !access.canCreate;

    const [activeTab, setActiveTab] = useState('list');
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    
    const [currencies, setCurrencies] = useState([]);
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [currencyFilters, setCurrencyFilters] = useState({});
    const [currenciesGridState, setCurrenciesGridState] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [recordLogs, setRecordLogs] = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);

    const [rateFilters, setRateFilters] = useState({ fromDate: todayStr, toDate: todayStr });
    const [ratesGridState, setRatesGridState] = useState(null);

    const viewConfig = {
      pageId: 'currency_settings_main',
      currentState: () => ({ activeTab, currencyFilters, currenciesGridState, rateFilters, ratesGridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.activeTab) setActiveTab(state.activeTab);
          if (state.currencyFilters) setCurrencyFilters(state.currencyFilters);
          if (state.currenciesGridState) setCurrenciesGridState(state.currenciesGridState);
          if (state.rateFilters) setRateFilters(state.rateFilters);
          if (state.ratesGridState) setRatesGridState(state.ratesGridState);
        } else {
          setActiveTab('list');
          setCurrencyFilters({});
          setCurrenciesGridState(null);
          setRateFilters({ fromDate: todayStr, toDate: todayStr });
          setRatesGridState(null);
        }
      }
    };

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = async (entityType, recordId, action, details = '', oldData = null, newData = null) => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: entityType, record_id: String(recordId), action: action, user_name: currentUser,
          details: details, old_data: oldData, new_data: newData
        }]);
      } catch (err) {
        console.error('Failed to log action:', err);
      }
    };

    const openLogModal = async (entityType, recordId) => {
      setIsLogModalOpen(true); setIsLogsLoading(true);
      try {
        if (!supabase) throw new Error("Supabase is not initialized");
        const { data, error } = await supabase.from('fm_record_logs').select('*').eq('entity_type', entityType).eq('record_id', String(recordId)).order('timestamp', { ascending: false });
        if (error) throw error;
        setRecordLogs(data || []);
      } catch (err) {
        showToast(t('خطا در دریافت تاریخچه تغییرات', 'Error fetching logs'), 'error');
      } finally {
        setIsLogsLoading(false);
      }
    };

    const fetchCurrencies = useCallback(async () => {
      setIsLoading(true);
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from('fm_currencies').select('*').order('code');
        if (error) throw error;
        setCurrencies(data || []);
      } catch (err) {
        showToast(t('خطا در دریافت اطلاعات ارزها', 'Error fetching currencies'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [supabase, showToast, t]);

    useEffect(() => { fetchCurrencies(); }, [fetchCurrencies]);

    const handleSaveCurrency = async () => {
      try {
        if (!selectedCurrency.code || !selectedCurrency.title) {
          showToast(t('لطفاً فیلدهای اجباری را پر کنید', 'Please fill required fields'), 'error');
          return;
        }
        const nowStr = new Date().toISOString();
        const payload = {
          code: selectedCurrency.code.toUpperCase(), title: selectedCurrency.title, symbol: selectedCurrency.symbol,
          is_active: selectedCurrency.is_active ?? true, fetch_type: selectedCurrency.fetch_type || 'manual',
          decimal_places: parseInt(selectedCurrency.decimal_places) || 0, targets: selectedCurrency.targets || [],
          updated_by: currentUser, updated_at: nowStr
        };

        if (selectedCurrency.id) {
          const oldRecord = currencies.find(c => c.id === selectedCurrency.id);
          const { error } = await supabase.from('fm_currencies').update(payload).eq('id', selectedCurrency.id);
          if (error) throw error;
          await logAction('fm_currencies', selectedCurrency.id, 'update', `بروزرسانی مشخصات ارز: ${payload.title}`, oldRecord, { ...oldRecord, ...payload });
          showToast(t('ارز با موفقیت بروزرسانی شد', 'Currency updated successfully'));
        } else {
          payload.created_by = currentUser;
          const { data, error } = await supabase.from('fm_currencies').insert([payload]).select();
          if (error) throw error;
          if (data && data.length > 0) await logAction('fm_currencies', data[0].id, 'create', `تعریف ارز جدید: ${payload.title}`, null, data[0]);
          showToast(t('ارز جدید با موفقیت تعریف شد', 'New currency added successfully'));
        }
        setIsCurrencyModalOpen(false);
        fetchCurrencies();
      } catch (err) {
        showToast(t('خطا در ذخیره اطلاعات', 'Error saving data'), 'error');
      }
    };

    const handleBulkAction = async (actionType, selectedIds) => {
      if (!selectedIds || !selectedIds.length) return;
      try {
        const nowStr = new Date().toISOString();
        let updatePayload = { updated_by: currentUser, updated_at: nowStr };
        let actionDesc = '';
        if (actionType === 'activate') { updatePayload.is_active = true; actionDesc = 'فعال‌سازی ارز'; }
        if (actionType === 'deactivate') { updatePayload.is_active = false; actionDesc = 'غیرفعال‌سازی ارز'; }
        if (actionType === 'setAuto') { updatePayload.fetch_type = 'auto'; actionDesc = 'تغییر به دریافت اتوماتیک'; }
        if (actionType === 'setManual') { updatePayload.fetch_type = 'manual'; actionDesc = 'تغییر به دریافت دستی'; }

        const { error } = await supabase.from('fm_currencies').update(updatePayload).in('id', selectedIds);
        if (error) throw error;
        
        for (const id of selectedIds) {
           const oldRecord = currencies.find(c => c.id === id);
           await logAction('fm_currencies', id, 'update', `عملیات گروهی: ${actionDesc}`, oldRecord, { ...oldRecord, ...updatePayload });
        }
        showToast(t('عملیات گروهی با موفقیت انجام شد', 'Bulk action successful'));
        fetchCurrencies();
      } catch (err) {
        showToast(t('خطا در اجرای عملیات گروهی', 'Error executing bulk action'), 'error');
      }
    };

    const executeDelete = async () => {
      try {
        if (deleteConfirm.type === 'single') {
          const oldRec = currencies.find(c => c.id === deleteConfirm.data.id);
          const { error } = await supabase.from('fm_currencies').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await logAction('fm_currencies', deleteConfirm.data.id, 'delete', `حذف ارز با کد: ${deleteConfirm.data.code}`, oldRec, null);
        } else if (deleteConfirm.type === 'bulk') {
          const oldRecords = deleteConfirm.data.map(id => currencies.find(c => c.id === id)).filter(Boolean);
          const { error } = await supabase.from('fm_currencies').delete().in('id', deleteConfirm.data);
          if (error) throw error;
          for (const oldRec of oldRecords) await logAction('fm_currencies', oldRec.id, 'delete', `حذف گروهی ارز`, oldRec, null);
        }
        fetchCurrencies();
        showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful'));
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        showToast(t('امکان حذف رکورد دارای وابستگی وجود ندارد', 'Cannot delete record with relations'), 'error');
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      }
    };

    const tabs = [
      { id: 'list', label: t('فهرست ارزها', 'Currency List'), icon: Globe },
      { id: 'rates', label: t('سوابق نرخ ارزها', 'Exchange Rate History'), icon: History },
    ];

    const currencyColumns = [
      { field: 'code', header_fa: 'کد ارز', header_en: 'Code', width: '90px', render: (v) => <span className="font-black text-slate-800 dark:text-slate-200">{v}</span> },
      { field: 'title', header_fa: 'عنوان', header_en: 'Title', width: '180px' },
      { field: 'symbol', header_fa: 'نماد', header_en: 'Symbol', width: '70px' },
      { 
        field: 'targets', header_fa: 'ارزهای مبنا', header_en: 'Targets', width: '220px',
        render: (val) => (
          <div className="flex gap-1 flex-wrap">
            {Array.isArray(val) && val.map(c => <Badge key={c} variant="indigo" size="sm" className="px-1.5 py-0 text-[10px]">{c}</Badge>)}
            {(!val || val.length === 0) && <span className="text-slate-300 dark:text-slate-500 text-[10px]">{t('بدون وابستگی', 'No targets')}</span>}
          </div>
        )
      },
      { 
        field: 'fetch_type', header_fa: 'نوع دریافت', header_en: 'Fetch Type', width: '110px', type: 'select',
        options: [{value: 'auto', label: t('اتوماتیک', 'Auto')}, {value: 'manual', label: t('دستی', 'Manual')}],
        render: (v) => <Badge variant={v === 'auto' ? 'emerald' : 'slate'} className="text-[10px]">{v === 'auto' ? t('اتوماتیک', 'Auto') : t('دستی', 'Manual')}</Badge>
      },
      { field: 'decimal_places', header_fa: 'اعشار', header_en: 'Decimals', width: '70px', render: (v) => <span className="text-slate-500 dark:text-slate-400 font-mono">{v}</span> },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', type: 'toggle', width: '90px' },
    ];

    const currencyBulkActions = [
      { id: 'activate', label: t('فعال‌سازی', 'Activate'), icon: Check, onClick: (ids) => handleBulkAction('activate', ids), variant: 'outline', className: 'text-emerald-600 dark:text-emerald-400', requiredAccess: 'edit' },
      { id: 'deactivate', label: t('غیرفعال‌سازی', 'Deactivate'), icon: X, onClick: (ids) => handleBulkAction('deactivate', ids), variant: 'outline', className: 'text-slate-600 dark:text-slate-400', requiredAccess: 'edit' },
      { id: 'setAuto', label: t('دریافت اتوماتیک', 'Set Auto'), icon: RefreshCw, onClick: (ids) => handleBulkAction('setAuto', ids), variant: 'outline', className: 'text-blue-600 dark:text-blue-400', requiredAccess: 'edit' },
      { id: 'setManual', label: t('دریافت دستی', 'Set Manual'), icon: Lock, onClick: (ids) => handleBulkAction('setManual', ids), variant: 'outline', className: 'text-amber-600 dark:text-amber-400', requiredAccess: 'edit' },
      { id: 'delete', label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }), variant: 'danger-outline', className: '!text-red-500 dark:!text-red-400 !border-red-500 dark:!border-red-800 hover:!bg-red-50 dark:hover:!bg-red-900/30' },
    ];

    const filteredCurrencies = useMemo(() => {
      let result = [...currencies];
      if (currencyFilters.code) result = result.filter(c => c.code.toLowerCase().includes(currencyFilters.code.toLowerCase()));
      return result;
    }, [currencies, currencyFilters]);

    const CurrencyHistoryComponent = window.CurrencyHistory;

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('تنظیمات و مدیریت نرخ ارزها', 'Currency & Exchange Management')}
          icon={DollarSign} language={language}
          breadcrumbs={[{ label: t('تنظیمات پایه', 'Base Setup') }, { label: t('ارزها', 'Currencies') }]}
          viewConfig={viewConfig}
        />

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-500">
          
          {activeTab === 'list' && (
            <>
              <AdvancedFilter 
                fields={[{ name: 'code', label: t('کد ارز', 'Code'), type: 'text' }]} 
                initialValues={currencyFilters} onFilter={setCurrencyFilters} onClear={() => setCurrencyFilters({})} language={language} 
              />
              <div className="flex-1 min-h-0">
                <DataGrid 
                  data={filteredCurrencies} columns={currencyColumns} language={language} formCode={formCode}
                  gridState={currenciesGridState} onGridStateChange={setCurrenciesGridState}
                  actions={[
                    { id: 'view_log', icon: History, tooltip: t('مشاهده لاگ سیستم', 'View System Log'), onClick: (row) => openLogModal('fm_currencies', row.id), className: 'text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300' },
                    { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => { setSelectedCurrency({...row}); setIsCurrencyModalOpen(true); }, className: 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400' },
                    { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400' }
                  ]}
                  selectable={true}
                  onRowDoubleClick={(row) => { if(access.canEdit || access.canView) { setSelectedCurrency({...row}); setIsCurrencyModalOpen(true); } }}
                  bulkActions={currencyBulkActions}
                  onAdd={() => { setSelectedCurrency({ code: '', title: '', symbol: '', is_active: true, fetch_type: 'manual', decimal_places: 0, targets: [] }); setIsCurrencyModalOpen(true); }}
                />
              </div>
            </>
          )}

          {activeTab === 'rates' && CurrencyHistoryComponent ? (
             <CurrencyHistoryComponent 
                currencies={currencies} language={language} formCode={formCode} 
                access={access}
                rateFilters={rateFilters} setRateFilters={setRateFilters}
                ratesGridState={ratesGridState} setRatesGridState={setRatesGridState}
             />
          ) : activeTab === 'rates' ? (
             <div className="p-10 text-center text-slate-500">{t('فایل CurrencyHistory یافت نشد.', 'CurrencyHistory component not found.')}</div>
          ) : null}
        </div>

        <Modal isOpen={isCurrencyModalOpen} onClose={() => setIsCurrencyModalOpen(false)} title={selectedCurrency?.id ? t('ویرایش اطلاعات ارز', 'Edit Currency Info') : t('تعریف ارز جدید در سیستم', 'Define New Currency')} language={language} width="max-w-xl">
          <div className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextField formCode={formCode} label={t('کد ارز', 'Code')} value={selectedCurrency?.code || ''} onChange={(e) => setSelectedCurrency({...selectedCurrency, code: e.target.value.toUpperCase()})} isRtl={isRtl} required size="sm" wrapperClassName="sm:col-span-1" />
              <div className="sm:col-span-2 flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">{t('عنوان ارز', 'Title')} <span className="text-red-500 dark:text-red-400">*</span></label>
                      <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={selectedCurrency?.is_active ?? true} onChange={(val) => setSelectedCurrency({...selectedCurrency, is_active: val})} isRtl={isRtl} />
                  </div>
                  <input
                      type="text" disabled={isReadOnly} value={selectedCurrency?.title || ''} onChange={(e) => setSelectedCurrency({...selectedCurrency, title: e.target.value})}
                      className={`w-full h-8 text-[12px] px-2.5 rounded-lg transition-all outline-none 
                        ${isReadOnly ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-700/40 border border-slate-300 dark:border-slate-500 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700/60 focus:ring-2 focus:border-indigo-400 dark:focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-400/20'}`}
                      dir={isRtl ? 'rtl' : 'ltr'}
                  />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TextField formCode={formCode} label={t('نماد', 'Symbol')} value={selectedCurrency?.symbol || ''} onChange={(e) => setSelectedCurrency({...selectedCurrency, symbol: e.target.value})} isRtl={isRtl} size="sm" />
              <SelectField formCode={formCode} label={t('نوع دریافت نرخ', 'Fetch Method')} value={selectedCurrency?.fetch_type || 'manual'} onChange={(e) => setSelectedCurrency({...selectedCurrency, fetch_type: e.target.value})} isRtl={isRtl} size="sm" options={[{value: 'manual', label: t('دستی', 'Manual')}, {value: 'auto', label: t('اتوماتیک (API)', 'Automatic')}]} />
              <TextField formCode={formCode} label={t('تعداد اعشار', 'Decimals')} type="number" value={selectedCurrency?.decimal_places ?? 0} onChange={(e) => setSelectedCurrency({...selectedCurrency, decimal_places: e.target.value})} isRtl={isRtl} size="sm" />
            </div>
            
            <div className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-700/50">
               <label className="text-[12px] font-black text-slate-500 dark:text-slate-400 mb-1.5 block uppercase tracking-wider">{t('ارزهای هدف (ارزهایی که این ارز به آنها تبدیل می‌شود):', 'Target Currencies (Conversion Base):')}</label>
               <div className="flex flex-col gap-2">
                 <SelectField formCode={formCode} value="" onChange={(e) => { const val = e.target.value; if (val && !(selectedCurrency?.targets || []).includes(val)) setSelectedCurrency({...selectedCurrency, targets: [...(selectedCurrency?.targets || []), val]}); }} isRtl={isRtl} size="sm" wrapperClassName="w-full sm:w-1/2" options={[{ value: '', label: t('انتخاب ارز جهت افزودن...', 'Select currency to add...') }, ...currencies.filter(c => c.code !== selectedCurrency?.code && !(selectedCurrency?.targets || []).includes(c.code)).map(c => ({value: c.code, label: `${c.title} (${c.code})`}))]} />
                 <div className="flex flex-wrap gap-1.5 p-2.5 min-h-[44px] bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] mt-1">
                    {(selectedCurrency?.targets || []).map(tcode => (
                      <Badge key={tcode} variant="indigo" className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 group">
                        <span className="font-bold text-[10px]">{tcode}</span>
                        {!isReadOnly && <div className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-indigo-200/50 dark:bg-indigo-900/50 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-all" onClick={() => setSelectedCurrency({...selectedCurrency, targets: selectedCurrency.targets.filter(x => x !== tcode)})}><X size={10} /></div>}
                      </Badge>
                    ))}
                    {(!selectedCurrency?.targets || selectedCurrency.targets.length === 0) && <span className="text-slate-300 dark:text-slate-500 text-[10px] italic py-1">{t('هیچ ارزی انتخاب نشده است.', 'No targets selected.')}</span>}
                 </div>
               </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsCurrencyModalOpen(false)}>{t('بستن', 'Close')}</Button>
              {!isReadOnly && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveCurrency} className="px-6">{t('ذخیره تغییرات', 'Save Changes')}</Button>}
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-3 items-center text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1"><AlertTriangle size={22} /></div>
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1"><Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}</div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{deleteConfirm.type === 'bulk' ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد اطمینان دارید؟`, `Delete selected items?`) : t(`آیا از حذف این مورد اطمینان دارید?`, `Delete this item?`)}</p>
            <div className="flex gap-2 mt-4 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={executeDelete} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 border-red-600 dark:border-red-500 shadow-lg shadow-red-100 dark:shadow-none">{t('تایید حذف', 'Delete Now')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title={t('لاگ‌های سیستمی رکورد', 'System Logs')} language={language} width="max-w-xl">
           <LogTimeline logs={recordLogs} isLoading={isLogsLoading} language={language} />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  CurrencySettings.formCode = 'SYS_CURRENCY';
  window.CurrencySettings = CurrencySettings;
})();