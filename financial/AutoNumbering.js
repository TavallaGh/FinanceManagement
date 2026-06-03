/* Filename: financial/AutoNumbering.js */
(() => {
  if (!window.AutoNumberingService) {
    window.AutoNumberingService = {
        async previewNext(entityCode) {
            try {
                const supabase = window.supabase;
                if (!supabase) return null;
                const { data, error } = await supabase
                    .from('fm_auto_numbering')
                    .select('*')
                    .eq('entity_code', entityCode)
                    .eq('is_active', true)
                    .single();

                if (error || !data) return null;

                let nextNum = parseInt(data.current_number) + 1;
                const startNum = parseInt(data.start_number) || 1;
                if (nextNum < startNum) nextNum = startNum;

                const prefix = data.prefix || '';
                const suffix = data.suffix || '';
                const padLen = parseInt(data.number_length) || 4;

                const paddedNumber = String(nextNum).padStart(padLen, '0');
                return {
                    formattedCode: `${prefix}${paddedNumber}${suffix}`,
                    nextNumber: nextNum,
                    recordId: data.id
                };
            } catch (err) {
                return null;
            }
        },
        async consumeNext(entityCode) {
            try {
                const supabase = window.supabase;
                if (!supabase) return null;
                const preview = await this.previewNext(entityCode);
                if (!preview) return null;

                const { error } = await supabase
                    .from('fm_auto_numbering')
                    .update({ current_number: preview.nextNumber, updated_at: new Date().toISOString() })
                    .eq('id', preview.recordId);

                if (error) throw error;
                return preview.formattedCode;
            } catch (err) {
                return null;
            }
        }
    };
  }

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
      { value: 'COST_TYPE', label: t('انواع هزینه', 'Cost Types'), fa: 'انواع هزینه', en: 'Cost Types' },
      { value: 'INCOME_TYPE', label: t('انواع درآمد', 'Income Types'), fa: 'انواع درآمد', en: 'Income Types' },
      { value: 'GATEWAY_TYPE', label: t('درگاه‌های پرداخت', 'Gateway Types'), fa: 'درگاه‌های پرداخت', en: 'Gateway Types' },
      { value: 'CHART_OF_ACCOUNTS', label: t('ساختار حساب‌ها', 'Chart of Accounts'), fa: 'ساختار حساب‌ها', en: 'Chart of Accounts' },
      { value: 'BALANCE_GROUP', label: t('گروه‌های بالانس', 'Balance Groups'), fa: 'گروه‌های بالانس', en: 'Balance Groups' },
      { value: 'BROKER_MGMT', label: t('بروکرها', 'Brokers'), fa: 'بروکرها', en: 'Brokers' },
      { value: 'TRANSACTION', label: t('تراکنش‌ها', 'Transactions'), fa: 'تراکنش‌ها', en: 'Transactions' },
      { value: 'TRANSACTIONS', label: t('تراکنش‌ها', 'Transactions'), fa: 'تراکنش‌ها', en: 'Transactions' }
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
        const selectedEntity = ENTITY_OPTIONS.find(o => o.value === formData.entity_code);
        
        const payload = {
          entity_code: formData.entity_code,
          title_fa: formData.title_fa || (selectedEntity ? selectedEntity.fa : formData.entity_code),
          title_en: formData.title_en || (selectedEntity ? selectedEntity.en : formData.entity_code),
          prefix: formData.prefix || '',
          suffix: formData.suffix || '',
          current_number: parseInt(formData.current_number) || 0,
          start_number: parseInt(formData.start_number) || 1,
          number_length: parseInt(formData.number_length) || 4,
          is_active: formData.is_active
        };

        if (currentRecord?.id) {
          const { error } = await supabase.from('fm_auto_numbering').update(payload).eq('id', currentRecord.id);
          if (error) {
            if (error.code === '23505') showToast(t('تنظیمات این موجودیت قبلاً ثبت شده است', 'Configuration for this entity already exists'), 'error');
            else throw error;
            return;
          }
        } else {
          const { error } = await supabase.from('fm_auto_numbering').insert([payload]);
          if (error) {
            if (error.code === '23505') showToast(t('تنظیمات این موجودیت قبلاً ثبت شده است', 'Configuration for this entity already exists'), 'error');
            else throw error;
            return;
          }
        }

        setIsModalOpen(false);
        fetchData();
        showToast(t('اطلاعات با موفقیت ذخیره شد', 'Saved successfully'));
      } catch (err) {
        console.error('Save Error:', err);
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
        console.error("Toggle Error:", err);
        showToast(t('خطا در تغییر وضعیت', 'Error toggling status'), 'error');
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const { error } = await supabase.from('fm_auto_numbering').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
        } else if (deleteConfirm.type === 'bulk') {
          const { error } = await supabase.from('fm_auto_numbering').delete().in('id', deleteConfirm.data);
          if (error) throw error;
        }
        
        setSelectedIds([]);
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        fetchData();
        showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful'));
      } catch (err) {
        console.error("Delete error:", err);
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

    const getEntityLabel = (val) => {
        const opt = ENTITY_OPTIONS.find(o => o.value === val);
        return opt ? opt.label : val;
    };

    const columns = [
      { 
        field: 'entity_code', 
        header_fa: 'موجودیت هدف', 
        header_en: 'Target Entity', 
        width: '200px',
        render: (val) => <span className="font-bold text-slate-700 dark:text-slate-200">{getEntityLabel(val)}</span>
      },
      { field: 'prefix', header_fa: 'پیشوند', header_en: 'Prefix', width: '100px', render: (val) => <span dir="ltr">{val || '-'}</span> },
      { field: 'suffix', header_fa: 'پسوند', header_en: 'Suffix', width: '100px', render: (val) => <span dir="ltr">{val || '-'}</span> },
      { field: 'current_number', header_fa: 'مقدار فعلی (آخرین شماره)', header_en: 'Current Value', width: '180px', render: (val) => <span className="font-mono text-[13px] font-bold" dir="ltr">{val}</span> },
      { field: 'number_length', header_fa: 'طول ارقام (Padding)', header_en: 'Pad Length', width: '150px' },
      { field: 'start_number', header_fa: 'شماره شروع', header_en: 'Start Number', width: '100px' },
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
          description={t('مدیریت پیشوندها، پسوندها و توالی کدهای سیستم', 'Manage prefixes, suffixes, and sequences for system codes')}
          language={language}
          breadcrumbs={[{ label: t('تنظیمات', 'Settings') }, { label: t('شماره‌گذاری', 'Numbering') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-4 animate-in fade-in duration-300">
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
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
                { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => handleOpenModal(row), className: 'text-slate-400 hover:text-indigo-600' },
                { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 hover:text-red-600' }
              ]}
              bulkActions={[
                { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
              ]}
            />
          </div>
        </div>

        <Modal 
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
          title={currentRecord ? t('ویرایش تنظیمات شماره‌گذاری', 'Edit Auto Numbering') : t('تعریف ساختار جدید', 'New Configuration')}
          width="max-w-2xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField 
                size="sm" 
                label={t('موجودیت هدف', 'Target Entity')} 
                value={formData.entity_code} 
                onChange={e => setFormData({...formData, entity_code: e.target.value})} 
                options={[
                  { value: '', label: t('انتخاب کنید...', 'Select...') },
                  ...ENTITY_OPTIONS
                ]}
                isRtl={isRtl} 
                required
                disabled={!!currentRecord}
              />
              <div className="md:col-start-1">
                 <TextField size="sm" label={t('پیشوند (Prefix)', 'Prefix')} value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} isRtl={isRtl} dir="ltr" />
              </div>
              <div>
                 <TextField size="sm" label={t('پسوند (Suffix)', 'Suffix')} value={formData.suffix} onChange={e => setFormData({...formData, suffix: e.target.value})} isRtl={isRtl} dir="ltr" />
              </div>

              <TextField size="sm" type="number" label={t('آخرین مقدار ثبت شده', 'Current Value')} value={formData.current_number} onChange={e => setFormData({...formData, current_number: e.target.value})} isRtl={isRtl} dir="ltr" required />
              <TextField size="sm" type="number" label={t('شماره شروع', 'Start Number')} value={formData.start_number} onChange={e => setFormData({...formData, start_number: e.target.value})} isRtl={isRtl} dir="ltr" required />
              <TextField size="sm" type="number" label={t('طول ارقام (Padding)', 'Pad Length')} value={formData.number_length} onChange={e => setFormData({...formData, number_length: e.target.value})} isRtl={isRtl} dir="ltr" required />
              
              <div className="md:col-span-2 flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                 <ToggleField size="sm" label={t('وضعیت فعال', 'Active Status')} checked={formData.is_active} onChange={v => setFormData({...formData, is_active: v})} isRtl={isRtl} />
                 
                 <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('پیش‌نمایش شماره بعدی:', 'Next Number Preview:')}</span>
                    <span className="font-mono text-[14px] font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{generatePreview()}</span>
                 </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isLoading}>{t('ذخیره تنظیمات', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk' 
              ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
              : t(`آیا از حذف تنظیمات شماره‌گذاری برای این موجودیت اطمینان دارید؟`, `Are you sure you want to delete this configuration?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  window.AutoNumbering = AutoNumbering;
})();