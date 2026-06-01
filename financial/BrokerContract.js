/* Filename: financial/BrokerContract.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;
  
  const { 
    Button, DataGrid, Modal,
    TextField, SelectField, CurrencyField, Badge,
    DatePicker, Toast, EmptyState
  } = window.DesignSystem || {};
  
  const { 
    Edit, Trash2, Save, Plus, X,
    AlertTriangle, Lock, Briefcase
  } = window.LucideIcons || {};
  
  const supabase = window.supabase;

  const BrokerContract = ({ broker, brokerName, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const globalMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';
    const formatGlobalDate = window.DSCore?.formatGlobalDate || ((v) => v);
    
    const [currencies, setCurrencies] = useState([]);
    const [contractsData, setContractsData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    
    const [inlineEdit, setInlineEdit] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    const showToast = useCallback((message, type = 'error') => {
        setToast({ isVisible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 4000);
    }, []);

    useEffect(() => {
      const initCurrencies = async () => {
         try {
             const { data, error } = await supabase.from('fm_currencies').select('id, code, title').eq('is_active', true);
             if (error) throw error;
             if (data) setCurrencies(data);
         } catch (e) {
             console.error('Error fetching currencies:', e);
             showToast(t('خطا در دریافت لیست ارزها.', 'Error fetching currencies.'), 'error');
         }
      };
      initCurrencies();
    }, [supabase, showToast, t]);

    useEffect(() => {
      if (broker?.id) {
          fetchContracts(broker.id);
      }
    }, [broker]);

    const fetchContracts = async (brokerId) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('fm_broker_contracts')
                .select('*')
                .eq('broker_id', brokerId)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            setContractsData(data || []);
        } catch (err) {
            console.error('Fetch Contracts Error:', err);
            showToast(t('خطا در دریافت لیست قراردادها.', 'Error fetching contracts.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddClick = () => {
        if (inlineEdit) return;
        setInlineEdit({
            id: 'new',
            data: { currencyId: '', fromDate: '', toDate: '', minAmount: 0, maxAmount: '', commissionPct: 0 }
        });
    };

    const handleSaveInline = async () => {
        const form = inlineEdit?.data;
        if (!form) return;
        
        if (!form.fromDate) {
            showToast(t('وارد کردن تاریخ شروع الزامی است.', 'From Date is required.'), 'error');
            return;
        }

        const sanitizeAmount = (val) => {
            if (val === null || val === undefined || val === '') return null;
            const cleanStr = String(val).replace(/,/g, '');
            const num = Number(cleanStr);
            return isNaN(num) ? null : num;
        };

        const commissionValue = sanitizeAmount(form.commissionPct) || 0;
        if (commissionValue > 100 || commissionValue < 0) {
            showToast(t('درصد کارمزد نامعتبر است (بین ۰ تا ۱۰۰).', 'Invalid commission percentage.'), 'error');
            return;
        }

        if (form.fromDate && form.toDate) {
            const fromDateObj = new Date(form.fromDate);
            const toDateObj = new Date(form.toDate);
            if (toDateObj < fromDateObj) {
                showToast(t('تاریخ پایان اعتبار نمی‌تواند قبل از تاریخ شروع باشد.', 'Valid To date cannot be earlier than Valid From date.'), 'error');
                return;
            }
        }

        setIsLoading(true);
        try {
            const payload = {
                broker_id: broker.id,
                currency_id: form.currencyId || null,
                from_date: form.fromDate,
                to_date: form.toDate || null,
                min_amount: sanitizeAmount(form.minAmount) || 0,
                max_amount: sanitizeAmount(form.maxAmount),
                commission_pct: commissionValue
            };

            const { error } = inlineEdit.id !== 'new'
                ? await supabase.from('fm_broker_contracts').update(payload).eq('id', inlineEdit.id)
                : await supabase.from('fm_broker_contracts').insert([payload]);

            if (error) throw error;

            showToast(t('قرارداد با موفقیت ذخیره شد.', 'Contract saved successfully.'), 'success');
            setInlineEdit(null);
            fetchContracts(broker.id);
        } catch (err) {
            console.error('Save Contract Error:', err);
            showToast(t('خطا در ذخیره قرارداد.', 'Error saving contract.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const executeDelete = async () => {
        setIsLoading(true);
        try {
            if (deleteConfirm.type === 'bulk') {
                const validIds = deleteConfirm.data.filter(id => id !== 'new');
                if (validIds.length > 0) {
                    const { error } = await supabase.from('fm_broker_contracts').delete().in('id', validIds);
                    if (error) throw error;
                }
                if (deleteConfirm.data.includes('new')) {
                    setInlineEdit(null);
                }
                setSelectedIds([]);
                showToast(t('قراردادهای انتخاب‌شده با موفقیت حذف شدند.', 'Selected contracts deleted successfully.'), 'success');
            } else {
                const { error } = await supabase.from('fm_broker_contracts').delete().eq('id', deleteConfirm.data.id);
                if (error) throw error;
                showToast(t('قرارداد با موفقیت حذف شد.', 'Contract deleted successfully.'), 'success');
            }
            
            fetchContracts(broker.id);
            setDeleteConfirm({ isOpen: false, type: null, data: null });
        } catch (err) {
            console.error("Delete error:", err);
            showToast(t('خطا در حذف اطلاعات.', 'Deletion error.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getCurrencyName = (currencyId) => {
        if (!currencyId) return t('همه ارزها', 'All Currencies');
        const c = currencies.find(x => x.id === currencyId);
        if (!c) return '-';
        return c.title;
    };

    const gridData = useMemo(() => {
        const data = [...contractsData];
        if (inlineEdit && inlineEdit.id === 'new') {
            data.unshift({ id: 'new', _isNew: true, ...inlineEdit.data });
        }
        return data;
    }, [contractsData, inlineEdit]);

    const columns = [
        {
            field: 'status',
            header_fa: 'وضعیت',
            header_en: 'Status',
            width: '80px',
            render: (_, row) => {
                if (inlineEdit?.id === row.id && row._isNew) {
                    return <Badge variant="indigo" size="sm">{t('جدید', 'New')}</Badge>;
                }
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isExpired = row.to_date && new Date(row.to_date) < today;
                return isExpired ? 
                    <Badge variant="rose" size="sm">{t('منقضی شده', 'Expired')}</Badge> : 
                    <Badge variant="emerald" size="sm">{t('معتبر', 'Valid')}</Badge>;
            }
        },
        { 
            field: 'currency_id', 
            header_fa: 'ارز', 
            header_en: 'Currency', 
            width: '85px',
            render: (val, row) => {
                if (inlineEdit?.id === row.id) {
                    return (
                        <div onClick={(e)=>e.stopPropagation()}>
                            <SelectField 
                                size="sm" 
                                value={inlineEdit.data.currencyId} 
                                onChange={e => setInlineEdit(prev => ({...prev, data: {...prev.data, currencyId: e.target.value}}))} 
                                isRtl={isRtl}
                                options={[
                                    { value: '', label: t('همه', 'All') },
                                    ...currencies.map(c => ({ value: c.id, label: c.title }))
                                ]}
                            />
                        </div>
                    );
                }
                return val ? 
                    <Badge variant="indigo" size="sm" className="whitespace-nowrap">{getCurrencyName(val)}</Badge> : 
                    <Badge variant="slate" size="sm" className="whitespace-nowrap">{t('همه', 'All')}</Badge>;
            }
        },
        { 
            field: 'from_date', 
            header_fa: 'از تاریخ', 
            header_en: 'From Date', 
            width: '95px',
            render: (val, row) => {
                if (inlineEdit?.id === row.id) {
                    return (
                        <div onClick={(e)=>e.stopPropagation()}>
                            <DatePicker 
                                size="sm" 
                                value={inlineEdit.data.fromDate} 
                                onChange={v => setInlineEdit(prev => ({...prev, data: {...prev.data, fromDate: v}}))} 
                                isRtl={isRtl} 
                                language={language}
                            />
                        </div>
                    );
                }
                return val ? <span className="text-[11px] text-slate-700 dark:text-slate-300" dir="ltr">{formatGlobalDate(val, globalMode)}</span> : '-';
            }
        },
        { 
            field: 'to_date', 
            header_fa: 'تا تاریخ', 
            header_en: 'To Date', 
            width: '95px',
            render: (val, row) => {
                if (inlineEdit?.id === row.id) {
                    return (
                        <div onClick={(e)=>e.stopPropagation()}>
                            <DatePicker 
                                size="sm" 
                                value={inlineEdit.data.toDate} 
                                onChange={v => setInlineEdit(prev => ({...prev, data: {...prev.data, toDate: v}}))} 
                                isRtl={isRtl} 
                                language={language}
                            />
                        </div>
                    );
                }
                return val ? <span className="text-[11px] text-slate-700 dark:text-slate-300" dir="ltr">{formatGlobalDate(val, globalMode)}</span> : <span className="text-[10px] text-slate-400">{t('تا کنون', 'Present')}</span>;
            }
        },
        { 
            field: 'min_amount', 
            header_fa: 'از مبلغ', 
            header_en: 'Min Amount', 
            width: '130px',
            render: (val, row) => {
                if (inlineEdit?.id === row.id) {
                    return (
                        <div onClick={(e)=>e.stopPropagation()}>
                            <CurrencyField 
                                size="sm" 
                                value={inlineEdit.data.minAmount} 
                                onChange={v => setInlineEdit(prev => ({...prev, data: {...prev.data, minAmount: v}}))} 
                                isRtl={isRtl} 
                            />
                        </div>
                    );
                }
                return <span dir="ltr" className="font-medium text-[11px] text-slate-700 dark:text-slate-300">{Number(val || 0).toLocaleString()}</span>;
            }
        },
        { 
            field: 'max_amount', 
            header_fa: 'تا مبلغ', 
            header_en: 'Max Amount', 
            width: '130px',
            render: (val, row) => {
                if (inlineEdit?.id === row.id) {
                    return (
                        <div onClick={(e)=>e.stopPropagation()}>
                            <CurrencyField 
                                size="sm" 
                                value={inlineEdit.data.maxAmount} 
                                onChange={v => setInlineEdit(prev => ({...prev, data: {...prev.data, maxAmount: v}}))} 
                                isRtl={isRtl} 
                            />
                        </div>
                    );
                }
                return <span dir="ltr" className="font-medium text-[11px] text-slate-700 dark:text-slate-300">{val ? Number(val).toLocaleString() : '∞'}</span>;
            }
        },
        { 
            field: 'commission_pct', 
            header_fa: 'درصد کارمزد', 
            header_en: 'Commission %', 
            width: '90px',
            render: (val, row) => {
                if (inlineEdit?.id === row.id) {
                    return (
                        <div onClick={(e)=>e.stopPropagation()}>
                            <TextField 
                                size="sm" 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                max="100"
                                value={inlineEdit.data.commissionPct} 
                                onChange={e => {
                                    let v = e.target.value;
                                    if (v !== '' && Number(v) > 100) v = '100';
                                    if (v !== '' && Number(v) < 0) v = '0';
                                    setInlineEdit(prev => ({...prev, data: {...prev.data, commissionPct: v}}));
                                }} 
                                isRtl={isRtl} 
                                dir="ltr" 
                            />
                        </div>
                    );
                }
                return <Badge variant="sky" size="sm" className="font-bold whitespace-nowrap">{val} %</Badge>;
            }
        }
    ];

    const actions = [
        { 
            icon: Save, tooltip: t('ذخیره', 'Save'), 
            hidden: (row) => inlineEdit?.id !== row.id, 
            onClick: () => handleSaveInline(), 
            className: '!text-emerald-600 hover:!text-emerald-800' 
        },
        { 
            icon: X, tooltip: t('انصراف', 'Cancel'), 
            hidden: (row) => inlineEdit?.id !== row.id, 
            onClick: () => setInlineEdit(null), 
            className: '!text-slate-500 hover:!text-slate-700' 
        },
        { 
            icon: Edit, tooltip: t('ویرایش ردیف', 'Edit Tier'), 
            hidden: (row) => inlineEdit?.id === row.id || row._isNew, 
            onClick: (row) => setInlineEdit({
                id: row.id,
                data: {
                    currencyId: row.currency_id || '',
                    fromDate: row.from_date ? row.from_date.substring(0, 10) : '',
                    toDate: row.to_date ? row.to_date.substring(0, 10) : '',
                    minAmount: row.min_amount || 0,
                    maxAmount: row.max_amount || '',
                    commissionPct: row.commission_pct || 0
                }
            }), 
            className: 'text-slate-400 hover:text-indigo-600' 
        },
        { 
            icon: Trash2, tooltip: t('حذف ردیف', 'Delete Tier'), 
            hidden: (row) => inlineEdit?.id === row.id || row._isNew, 
            onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), 
            className: 'text-slate-400 hover:text-red-600' 
        }
    ];

    return (
        <div className="flex flex-col h-[60vh] min-h-[500px] w-full relative bg-slate-50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-[12px]">
                    <Briefcase size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>{t('ویرایش قراردادهای بروکر:', 'Edit Broker Contracts:')} <strong className="text-indigo-700 dark:text-indigo-300 font-bold ml-1">{brokerName}</strong></span>
                </div>
            </div>

            <div className="flex-1 min-h-0 p-4">
                <div className="h-full bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <DataGrid 
                        data={gridData}
                        columns={columns} 
                        actions={actions}
                        language={language}
                        isLoading={isLoading}
                        hideImport={true}
                        onAdd={handleAddClick}
                        selectable={true}
                        selectedIds={selectedIds}
                        onSelectChange={setSelectedIds}
                        bulkActions={[
                            {
                                id: 'delete',
                                icon: Trash2,
                                label: t('حذف انتخاب‌شده‌ها', 'Delete Selected'),
                                className: '!text-rose-600 !border-rose-200 hover:!bg-rose-50 dark:!border-rose-800/50 dark:hover:!bg-rose-900/30',
                                onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids })
                            }
                        ]}
                    />
                </div>
            </div>

            <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
                <EmptyState
                    icon={AlertTriangle}
                    title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
                    description={deleteConfirm.type === 'bulk'
                        ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
                        : t(`آیا از حذف این رکورد اطمینان دارید؟`, `Are you sure you want to delete this record?`)
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

  window.BrokerContract = BrokerContract;
})();