/* Filename: financial/BrokerContract.js */
(() => {
  const React = window.React;
  const { useState, useEffect } = React;
  
  const { 
    Button, DataGrid, Modal,
    TextField, SelectField, CurrencyField, Badge,
    DatePicker, Toast
  } = window.DesignSystem || {};
  
  const { 
    Edit, Trash2, Save, Plus,
    AlertTriangle, Lock, Briefcase, Info
  } = window.LucideIcons || {};
  
  const supabase = window.supabase;

  const BrokerContract = ({ broker, brokerName, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    
    const [currencies, setCurrencies] = useState([]);
    const [contractsData, setContractsData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    
    const [contractFormData, setContractFormData] = useState({
      id: null,
      currencyId: '',
      fromDate: '',
      toDate: '',
      minAmount: 0,
      maxAmount: 0,
      commissionPct: 0
    });

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, data: null });

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
    };

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
    }, []);

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

    const handleSaveContract = async () => {
        if (!contractFormData.fromDate || contractFormData.commissionPct === null || contractFormData.commissionPct === '') {
            showToast(t('فیلدهای تاریخ شروع و درصد کارمزد الزامی هستند.', 'From Date and Commission fields are required.'), 'error');
            return;
        }

        const commissionValue = Number(contractFormData.commissionPct);
        if (commissionValue > 100 || commissionValue < 0) {
            showToast(t('درصد کارمزد نمی‌تواند بیشتر از 100 یا کمتر از صفر باشد.', 'Commission percentage cannot be greater than 100 or less than 0.'), 'error');
            return;
        }

        if (contractFormData.fromDate && contractFormData.toDate) {
            const fromDate = new Date(contractFormData.fromDate);
            const toDate = new Date(contractFormData.toDate);
            if (toDate < fromDate) {
                showToast(t('تاریخ پایان اعتبار نمی‌تواند قبل از تاریخ شروع باشد.', 'Valid To date cannot be earlier than Valid From date.'), 'error');
                return;
            }
        }

        setIsLoading(true);
        try {
            const payload = {
                broker_id: broker.id,
                currency_id: contractFormData.currencyId || null,
                from_date: contractFormData.fromDate,
                to_date: contractFormData.toDate || null,
                min_amount: contractFormData.minAmount || 0,
                max_amount: contractFormData.maxAmount || null,
                commission_pct: commissionValue,
                updated_at: new Date().toISOString()
            };

            const { error } = contractFormData.id
                ? await supabase.from('fm_broker_contracts').update(payload).eq('id', contractFormData.id)
                : await supabase.from('fm_broker_contracts').insert([payload]);

            if (error) throw error;

            showToast(t('قرارداد با موفقیت ذخیره شد.', 'Contract saved successfully.'), 'success');
            setContractFormData({ id: null, currencyId: '', fromDate: '', toDate: '', minAmount: 0, maxAmount: 0, commissionPct: 0 });
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
            const { error } = await supabase.from('fm_broker_contracts').delete().eq('id', deleteConfirm.data.id);
            if (error) throw error;
            
            showToast(t('قرارداد با موفقیت حذف شد.', 'Contract deleted successfully.'), 'success');
            fetchContracts(broker.id);
            setDeleteConfirm({ isOpen: false, data: null });
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

    const contractColumns = [
        {
            field: 'status',
            header_fa: 'وضعیت',
            header_en: 'Status',
            width: '90px',
            render: (_, row) => {
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
            width: '120px',
            render: (val) => val ? 
                <Badge variant="indigo" size="sm">{getCurrencyName(val)}</Badge> : 
                <Badge variant="slate" size="sm">{t('همه ارزها', 'All Currencies')}</Badge>
        },
        { 
            field: 'from_date', 
            header_fa: 'از تاریخ', 
            header_en: 'From Date', 
            width: '120px',
            type: 'date'
        },
        { 
            field: 'to_date', 
            header_fa: 'تا تاریخ', 
            header_en: 'To Date', 
            width: '120px',
            type: 'date'
        },
        { 
            field: 'min_amount', 
            header_fa: 'از مبلغ', 
            header_en: 'Min Amount', 
            width: '120px',
            render: (val) => <span dir="ltr" className="font-medium text-slate-700 dark:text-slate-300">{Number(val).toLocaleString()}</span>
        },
        { 
            field: 'max_amount', 
            header_fa: 'تا مبلغ', 
            header_en: 'Max Amount', 
            width: '120px',
            render: (val) => <span dir="ltr" className="font-medium text-slate-700 dark:text-slate-300">{val ? Number(val).toLocaleString() : '∞'}</span>
        },
        { 
            field: 'commission_pct', 
            header_fa: 'درصد کارمزد', 
            header_en: 'Commission %', 
            width: '100px',
            render: (val) => <Badge variant="sky" size="sm" className="font-bold">{val} %</Badge>
        }
    ];

    return (
        <div className="flex flex-col h-[600px] w-full relative" dir={isRtl ? 'rtl' : 'ltr'}>
            {toast.show && (
                <div className={`fixed bottom-4 ${isRtl ? 'right-4' : 'left-4'} z-50`}>
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
                </div>
            )}
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-2 mb-4 text-indigo-700 dark:text-indigo-300 font-bold">
                    <Briefcase size={18} />
                    <span>{brokerName}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end pb-3">
                    <div className="relative">
                        <SelectField 
                            size="sm" 
                            label={t('ارز تراکنش', 'Currency')} 
                            value={contractFormData.currencyId} 
                            onChange={e => setContractFormData({...contractFormData, currencyId: e.target.value})} 
                            isRtl={isRtl}
                            options={[
                                { value: '', label: `-- ${t('همه ارزها', 'All Currencies')} --` },
                                ...currencies.map(c => ({ value: c.id, label: c.title }))
                            ]}
                        />
                        <div className="absolute -bottom-4 left-0 right-0 flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400">
                            <Info size={10} />
                            <span className="whitespace-nowrap">{t('اختیاری (خالی = همه)', 'Optional (Empty = All)')}</span>
                        </div>
                    </div>
                    <DatePicker 
                        size="sm" 
                        label={t('از تاریخ', 'From Date')} 
                        value={contractFormData.fromDate} 
                        onChange={val => setContractFormData({...contractFormData, fromDate: val})} 
                        isRtl={isRtl} 
                        required
                    />
                    <DatePicker 
                        size="sm" 
                        label={t('تا تاریخ (اختیاری)', 'To Date (Opt)')} 
                        value={contractFormData.toDate} 
                        onChange={val => setContractFormData({...contractFormData, toDate: val})} 
                        isRtl={isRtl} 
                    />
                    <CurrencyField 
                        size="sm" 
                        label={t('از مبلغ تراکنش', 'Min Amount')} 
                        value={contractFormData.minAmount} 
                        onChange={val => setContractFormData({...contractFormData, minAmount: val})} 
                        isRtl={isRtl} 
                    />
                    <CurrencyField 
                        size="sm" 
                        label={t('تا مبلغ تراکنش (0=نامحدود)', 'Max Amount (0=Unlimit)')} 
                        value={contractFormData.maxAmount} 
                        onChange={val => setContractFormData({...contractFormData, maxAmount: val})} 
                        isRtl={isRtl} 
                    />
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <TextField 
                                size="sm" 
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                label={t('درصد کارمزد', 'Commission %')} 
                                value={contractFormData.commissionPct} 
                                onChange={e => {
                                    let v = e.target.value;
                                    if (v !== '' && Number(v) > 100) v = '100';
                                    if (v !== '' && Number(v) < 0) v = '0';
                                    setContractFormData({...contractFormData, commissionPct: v});
                                }} 
                                isRtl={isRtl} 
                                required
                                dir="ltr" 
                            />
                        </div>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            icon={contractFormData.id ? Save : Plus} 
                            onClick={handleSaveContract} 
                            isLoading={isLoading}
                            className="h-8 mb-[1px]"
                            title={contractFormData.id ? t('بروزرسانی', 'Update') : t('افزودن', 'Add')}
                        >
                            {contractFormData.id ? t('ثبت', 'Save') : t('افزودن', 'Add')}
                        </Button>
                        {contractFormData.id && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setContractFormData({ id: null, currencyId: '', fromDate: '', toDate: '', minAmount: 0, maxAmount: 0, commissionPct: 0 })} 
                                className="h-8 mb-[1px] px-2 text-slate-500"
                                title={t('انصراف از ویرایش', 'Cancel Edit')}
                            >
                                ✕
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 p-4">
                <DataGrid 
                    data={contractsData}
                    columns={contractColumns} 
                    language={language}
                    isLoading={isLoading}
                    actions={[
                        { icon: Edit, tooltip: t('ویرایش ردیف', 'Edit Tier'), onClick: (row) => setContractFormData({
                            id: row.id,
                            currencyId: row.currency_id || '',
                            fromDate: row.from_date ? row.from_date.substring(0, 10) : '',
                            toDate: row.to_date ? row.to_date.substring(0, 10) : '',
                            minAmount: row.min_amount || 0,
                            maxAmount: row.max_amount || 0,
                            commissionPct: row.commission_pct || 0
                        }), className: 'text-slate-400 hover:text-indigo-600' },
                        { icon: Trash2, tooltip: t('حذف ردیف', 'Delete Tier'), onClick: (row) => setDeleteConfirm({ isOpen: true, data: row }), className: 'text-slate-400 hover:text-red-600' }
                    ]}
                />
            </div>

            <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
                <div className="p-4 flex flex-col gap-3 items-center text-center">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1">
                        <Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                        {t(`آیا از حذف این رکورد اطمینان دارید؟`, `Are you sure you want to delete this record?`)}
                    </p>
                    <div className="flex gap-2 mt-4 w-full">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button>
                        <Button variant="primary" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 border-red-600 dark:border-red-500">{t('تایید حذف', 'Delete')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
  };

  window.BrokerContract = BrokerContract;
})();