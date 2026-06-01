/* Filename: financial/AutoNumbering.js */
(() => {
  const React = window.React;
  const { useState, useEffect } = React;
  
  const { 
    Button, PageHeader, Modal, DataGrid, 
    TextField, ToggleField
  } = window.DesignSystem || window.DSCore || window.DSForms || window.DSGrid || {};
  
  const { 
    Settings, Edit, RefreshCw, Save, Hash
  } = window.LucideIcons || {};
  
  const supabase = window.supabase;

  // ---------------------------------------------------------------------------
  // سرویس سراسری برای تولید و مصرف شماره‌های اتوماتیک در سایر فرم‌ها
  // ---------------------------------------------------------------------------
  window.AutoNumberingService = {
    previewNext: async (entityCode) => {
      if (!supabase) return null;
      try {
        const { data, error } = await supabase
          .from('fm_auto_numbering')
          .select('*')
          .eq('entity_code', entityCode)
          .eq('is_active', true)
          .single();
          
        if (error || !data) return null;
        
        const nextNum = data.current_number >= data.start_number ? data.current_number + 1 : data.start_number;
        const paddedNum = String(nextNum).padStart(data.number_length || 4, '0');
        const formattedCode = `${data.prefix || ''}${paddedNum}${data.suffix || ''}`;
        
        return { rawNumber: nextNum, formattedCode };
      } catch (err) {
        console.error('AutoNumberingService Error:', err);
        return null;
      }
    },
    consumeNext: async (entityCode) => {
      if (!supabase) return null;
      try {
        const preview = await window.AutoNumberingService.previewNext(entityCode);
        if (!preview) return null;

        const { error } = await supabase
          .from('fm_auto_numbering')
          .update({ current_number: preview.rawNumber, updated_at: new Date().toISOString() })
          .eq('entity_code', entityCode);

        if (error) throw error;
        return preview.formattedCode;
      } catch (err) {
        console.error('AutoNumberingService Error:', err);
        return null;
      }
    }
  };

  // ---------------------------------------------------------------------------
  // کامپوننت فرم تنظیمات شماره‌گذاری
  // ---------------------------------------------------------------------------
  const AutoNumbering = ({ isAdmin, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    
    const [formData, setFormData] = useState({
      prefix: '',
      suffix: '',
      numberLength: 4,
      startNumber: 1,
      isActive: true
    });

    const [gridState, setGridState] = useState(null);

    const viewConfig = {
      pageId: 'auto_numbering_main',
      currentState: () => ({ gridState }),
      onApplyState: (state) => {
        if (state && state.gridState) setGridState(state.gridState);
      }
    };

    useEffect(() => {
      fetchData();
    }, []);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: settings, error } = await supabase
          .from('fm_auto_numbering')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;

        const mappedData = (settings || []).map(item => ({
          id: item.id,
          entityCode: item.entity_code,
          titleFa: item.title_fa,
          titleEn: item.title_en,
          title: isRtl ? item.title_fa : item.title_en,
          prefix: item.prefix || '',
          suffix: item.suffix || '',
          numberLength: item.number_length,
          startNumber: item.start_number,
          currentNumber: item.current_number,
          isActive: item.is_active ?? true
        }));
        
        setData(mappedData);
      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleOpenModal = (record) => {
      setCurrentRecord(record);
      setFormData({
        prefix: record.prefix || '',
        suffix: record.suffix || '',
        numberLength: record.numberLength || 4,
        startNumber: record.startNumber || 1,
        isActive: record.isActive
      });
      setIsModalOpen(true);
    };

    const handleSave = async () => {
      if (!currentRecord) return;
      setIsLoading(true);
      try {
        const payload = {
          prefix: formData.prefix,
          suffix: formData.suffix,
          number_length: parseInt(formData.numberLength) || 4,
          start_number: parseInt(formData.startNumber) || 1,
          is_active: formData.isActive,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('fm_auto_numbering')
          .update(payload)
          .eq('id', currentRecord.id);

        if (error) throw error;
        setIsModalOpen(false);
        fetchData();
      } catch (err) {
        console.error('Save Error:', err);
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
        setData(prev => prev.map(item => item.id === row.id ? { ...item, isActive: newValue } : item));
      } catch (err) {
        console.error("Toggle Error:", err);
      }
    };

    const generatePreview = () => {
      const nLen = parseInt(formData.numberLength) || 4;
      const sNum = parseInt(formData.startNumber) || 1;
      const curr = currentRecord ? currentRecord.currentNumber : 0;
      
      const nextNum = curr >= sNum ? curr + 1 : sNum;
      const paddedNum = String(nextNum).padStart(nLen, '0');
      return `${formData.prefix}${paddedNum}${formData.suffix}`;
    };

    const columns = [
      { field: 'entityCode', header_fa: 'کد سیستم', header_en: 'Sys Code', width: '150px' },
      { field: 'title', header_fa: 'موجودیت / فرم', header_en: 'Entity', width: '200px' },
      { 
        field: 'formatPreview', 
        header_fa: 'فرمت الگو', 
        header_en: 'Pattern Format', 
        width: '180px',
        render: (value, row) => {
          const r = (value && value.startNumber !== undefined) ? value : (row || {});
          const startNum = r.startNumber || 1;
          const numLen = r.numberLength || 4;
          const paddedNum = String(startNum).padStart(numLen, 'X');
          return <span className="font-sans text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded dir-ltr inline-block">{`${r.prefix || ''}${paddedNum}${r.suffix || ''}`}</span>;
        }
      },
      { field: 'numberLength', header_fa: 'طول ارقام', header_en: 'Length', width: '100px' },
      { field: 'currentNumber', header_fa: 'آخرین شماره مصرفی', header_en: 'Last Used', width: '150px' },
      { 
        field: 'isActive', 
        header_fa: 'وضعیت', 
        header_en: 'Status', 
        width: '100px', 
        type: 'toggle',
        onToggle: (row, val) => handleToggleActive(row, val)
      }
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('تنظیمات شماره‌گذاری اتوماتیک', 'Auto Numbering Settings')} 
          icon={Hash}
          description={t('پیکربندی ساختار و الگوی تولید کدهای سیستمی برای فرم‌های مختلف', 'Configure system code generation patterns for various forms')}
          language={language}
          breadcrumbs={[{ label: t('تنظیمات پایه', 'Base Settings') }, { label: t('شماره‌گذاری', 'Auto Numbering') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-4 animate-in fade-in duration-300">
          <div className="flex-1 min-h-0">
            <DataGrid 
              data={data}
              columns={columns} 
              language={language}
              selectable={false}
              isLoading={isLoading}
              onRowDoubleClick={(row) => handleOpenModal(row)}
              gridState={gridState}
              onGridStateChange={setGridState}
              hideImport={true}
              actions={[
                { icon: Edit, tooltip: t('ویرایش تنظیمات', 'Edit Settings'), onClick: (row) => handleOpenModal(row), className: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700' }
              ]}
            />
          </div>
        </div>

        <Modal 
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
          title={t(`تنظیمات الگو: ${currentRecord?.title || ''}`, `Pattern Settings: ${currentRecord?.titleEn || ''}`)}
          width="max-w-xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
              <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{t('پیش‌نمایش کد بعدی:', 'Next Code Preview:')}</span>
              <div className="font-sans text-2xl font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-6 py-2 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900/50 dir-ltr tracking-widest">
                {generatePreview()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField 
                size="sm" 
                label={t('پیشوند (Prefix)', 'Prefix')} 
                value={formData.prefix} 
                onChange={e => setFormData({...formData, prefix: e.target.value})} 
                isRtl={isRtl} 
                dir="ltr"
                placeholder="e.g. CST-"
              />
              <TextField 
                size="sm" 
                label={t('پسوند (Suffix)', 'Suffix')} 
                value={formData.suffix} 
                onChange={e => setFormData({...formData, suffix: e.target.value})} 
                isRtl={isRtl} 
                dir="ltr"
                placeholder="e.g. -1403"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField 
                size="sm" 
                type="number"
                label={t('طول ارقام (تعداد صفرها)', 'Number Length')} 
                value={formData.numberLength} 
                onChange={e => setFormData({...formData, numberLength: e.target.value})} 
                isRtl={isRtl} 
                dir="ltr"
                min="1"
                max="10"
                required
              />
              <TextField 
                size="sm" 
                type="number"
                label={t('شروع شمارش از', 'Start Number')} 
                value={formData.startNumber} 
                onChange={e => setFormData({...formData, startNumber: e.target.value})} 
                isRtl={isRtl} 
                dir="ltr"
                min="1"
                required
              />
            </div>

            <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
              <ToggleField 
                size="sm" 
                label={t('وضعیت فعال‌بودن الگو', 'Pattern Active Status')} 
                checked={formData.isActive} 
                onChange={v => setFormData({...formData, isActive: v})} 
                isRtl={isRtl} 
              />
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isLoading}>{t('ذخیره الگو', 'Save Pattern')}</Button>
              </div>
            </div>

          </div>
        </Modal>
      </div>
    );
  };

  window.AutoNumbering = AutoNumbering;
})();
