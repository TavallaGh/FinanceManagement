/* Filename: financial/AutoNumbering.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Hash = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon,
    Save = FallbackIcon, AlertTriangle = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button = DSCore.Button || DS.Button || (() => null);
  const PageHeader = DSCore.PageHeader || DS.PageHeader || (() => null);
  const EmptyState = DSCore.EmptyState || DS.EmptyState || (() => null);
  
  const TextField = DSForms.TextField || DS.TextField || (() => null);
  const SelectField = DSForms.SelectField || DS.SelectField || (() => null);
  const ToggleField = DSForms.ToggleField || DS.ToggleField || (() => null);
  
  const DataGrid = DSGrid.DataGrid || DS.DataGrid || (() => null);
  const Modal = DSFeedback.Modal || DSCore.Modal || DS.Modal || (() => null);
  const Toast = DSFeedback.Toast || DS.Toast || (() => null);

  const supabase = window.supabase;

  const AutoNumbering = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [gridState, setGridState] = useState(null);

    const [formData, setFormData] = useState({
      entity_code: '',
      title_fa: '',
      title_en: '',
      prefix: '',
      suffix: '',
      current_number: 0,
      start_number: 1,
      number_length: 4,
      is_active: true
    });

    const ENTITY_OPTIONS = [
      { value: 'COST_TYPE', label: t('انواع هزینه', 'Cost Types') },
      { value: 'INCOME_TYPE', label: t('انواع درآمد', 'Income Types') },
      { value: 'PAYMENT_SOURCE', label: t('منابع پرداخت', 'Payment Sources') },
      { value: 'BROKER_MGMT', label: t('مدیریت بروکرها', 'Broker Management') },
      { value: 'CHART_OF_ACCOUNTS', label: t('ساختار حساب‌ها', 'Chart of Accounts') },
      { value: 'BALANCE_GROUP', label: t('گروه‌های بالانس', 'Balance Groups') }
    ];

    const viewConfig = {
      pageId: 'auto_numbering_main',
      currentState: () => ({ gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.gridState) setGridState(state.gridState);
        } else {
          setGridState(null);
        }
      }
    };

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    useEffect(() => {
      fetchData();
    }, []);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!supabase) return;
        const { data: res, error } = await supabase
          .from('fm_auto_numbering')
          .select('*')
          .order('entity_code', { ascending: true });

        if (error) throw error;
        setData(res || []);
      } catch (err) {
        console.error('Fetch Error:', err);
        showToast(t('خطا در دریافت اطلاعات', 'Error fetching data'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleSave = async () => {
      if (!formData.entity_code) {
         showToast(t('انتخاب موجودیت الزامی است', 'Entity selection is required'), 'error');
         return;
      }

      setIsLoading(true);
      try {
        const payload = {
          entity_code: formData.entity_code,
          title_fa: formData.title_fa,
          title_en: formData.title_en,
          prefix: formData.prefix || '',
          suffix: formData.suffix || '',
          current_number: parseInt(formData.current_number) || 0,
          start_number: parseInt(formData.start_number) || 1,
          number_length: parseInt(formData.number_length) || 4,
          is_active: formData.is_active
        };

        if (currentRecord?.id) {
          const { error } = await supabase.from('fm_auto_numbering').update(payload).eq('id', currentRecord.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_auto_numbering').insert([payload]);
          if (error) throw error;
        }

        setIsModalOpen(false);
        fetchData();
        showToast(t('اطلاعات با موفقیت ذخیره شد', 'Saved successfully'));
      } catch (err) {
        showToast(t('خطا در ذخیره اطلاعات', 'Error saving data'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase
          .from('fm_auto_numbering')
          .update({ is_active: newValue })
          .eq('id', row.id);
        
        if (error) throw error;
        setData(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (err) {
        showToast(t('خطا در تغییر وضعیت', 'Error toggling status'), 'error');
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        const idsToDelete = deleteConfirm.type === 'single' ? [deleteConfirm.data.id] : deleteConfirm.data;
        const { error } = await supabase.from('fm_auto_numbering').delete().in('id', idsToDelete);
        if (error) throw error;
        
        setSelectedIds([]);
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        fetchData();
        showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful'));
      } catch (err) {
        showToast(t('خطا در حذف رکوردها', 'Error deleting records'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleOpenModal = (record = null) => {
      setFormData(record ? { ...record } : { 
        entity_code: '', title_fa: '', title_en: '', prefix: '', suffix: '', current_number: 0, start_number: 1, number_length: 4, is_active: true 
      });
      setCurrentRecord(record);
      setIsModalOpen(true);
    };

    const columns = [
      { field: 'entity_code', header_fa: 'کد موجودیت', header_en: 'Entity Code', width: '150px' },
      { field: 'title_fa', header_fa: 'عنوان (فارسی)', header_en: 'Title (FA)', width: '200px' },
      { field: 'prefix', header_fa: 'پیشوند', header_en: 'Prefix', width: '100px', render: (val) => <span dir="ltr">{val || '-'}</span> },
      { field: 'suffix', header_fa: 'پسوند', header_en: 'Suffix', width: '100px', render: (val) => <span dir="ltr">{val || '-'}</span> },
      { field: 'current_number', header_fa: 'آخرین شماره', header_en: 'Current Value', width: '150px', render: (val) => <span className="font-mono font-bold" dir="ltr">{val}</span> },
      { 
        field: 'is_active', 
        header_fa: 'وضعیت', 
        header_en: 'Status', 
        width: '100px', 
        type: 'toggle',
        onToggle: (row, val) => handleToggleActive(row, val)
      }
    ];

    const generatePreview = () => {
        const p = formData.prefix || '';
        const s = formData.suffix || '';
        const val = parseInt(formData.current_number) || 0;
        const len = parseInt(formData.number_length) || 4;
        const nextVal = String(val + 1).padStart(len, '0');
        return `${p}${nextVal}${s}`;
    };

    return (
      <div className="flex flex-col h-full p-4 bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('تنظیمات شماره‌گذاری خودکار', 'Auto Numbering Configuration')} 
          icon={Hash}
          language={language}
          viewConfig={viewConfig}
        />

        <div className="flex-1 min-h-0 mt-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <DataGrid 
            data={data}
            columns={columns} 
            language={language}
            selectable={true}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            isLoading={isLoading}
            onAdd={() => handleOpenModal()}
            onRowDoubleClick={(row) => handleOpenModal(row)}
            gridState={gridState}
            onGridStateChange={setGridState}
            hideImport={true}
            actions={[
              { icon: Edit, onClick: (row) => handleOpenModal(row) },
              { icon: Trash2, onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }) }
            ]}
          />
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('تنظیمات شماره‌گذاری', 'Auto Numbering')} width="max-w-xl" language={language}>
          <div className="p-4 grid grid-cols-2 gap-4">
             <TextField size="sm" label={t('کد موجودیت', 'Entity Code')} value={formData.entity_code} onChange={e => setFormData({...formData, entity_code: e.target.value})} disabled={!!currentRecord} />
             <div className="col-span-2 grid grid-cols-2 gap-4">
                <TextField size="sm" label={t('عنوان فارسی', 'Title FA')} value={formData.title_fa} onChange={e => setFormData({...formData, title_fa: e.target.value})} />
                <TextField size="sm" label={t('عنوان انگلیسی', 'Title EN')} value={formData.title_en} onChange={e => setFormData({...formData, title_en: e.target.value})} />
                <TextField size="sm" label={t('پیشوند', 'Prefix')} value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} dir="ltr" />
                <TextField size="sm" label={t('پسوند', 'Suffix')} value={formData.suffix} onChange={e => setFormData({...formData, suffix: e.target.value})} dir="ltr" />
                <TextField size="sm" type="number" label={t('آخرین شماره', 'Current Number')} value={formData.current_number} onChange={e => setFormData({...formData, current_number: e.target.value})} />
                <TextField size="sm" type="number" label={t('طول ارقام', 'Length')} value={formData.number_length} onChange={e => setFormData({...formData, number_length: e.target.value})} />
             </div>
             <div className="col-span-2 flex justify-between items-center pt-4 border-t">
                <ToggleField label={t('فعال', 'Active')} checked={formData.is_active} onChange={v => setFormData({...formData, is_active: v})} />
                <span className="font-mono text-indigo-600 font-bold">{t('پیش‌نمایش: ', 'Preview: ')}{generatePreview()}</span>
             </div>
             <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="primary" onClick={handleSave}>{t('ذخیره', 'Save')}</Button>
             </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('حذف', 'Delete')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle} description={t('آیا مطمئن هستید؟', 'Are you sure?')} action={<Button variant="danger" onClick={executeDelete}>{t('تایید', 'Confirm')}</Button>} />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  window.AutoNumbering = AutoNumbering;
})();