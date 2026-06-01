/* Filename: financial/TransactionMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    FileText = FallbackIcon, Plus = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon,
    Copy = FallbackIcon, AlertTriangle = FallbackIcon, Search = FallbackIcon, Info = FallbackIcon, RefreshCw = FallbackIcon
  } = LucideIcons;

  const TransactionMain = ({ language = 'fa', formCode = 'TRANSACTIONS' }) => {
    const FallbackComponent = () => null;

    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, PageHeader = FallbackComponent, EmptyState = FallbackComponent, Card = FallbackComponent } = Core;

    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, SelectField = FallbackComponent, DatePicker = FallbackComponent } = Forms;

    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent } = Grid;

    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent, Alert = FallbackComponent } = Feedback;

    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const supabase = window.supabase;
    const currentUserObj = window.NavigationSystem?.currentUser || {};
    const currentUserId = currentUserObj.id || null;
    const currentUserName = currentUserObj.name || 'مدیر سیستم';
    const currentUserUsername = currentUserObj.username || 'admin';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
      return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const TRANSACTION_TYPES = [
        { value: 'OPENING', label: t('سند افتتاحیه', 'Opening') },
        { value: 'CLOSING', label: t('سند اختتامیه', 'Closing') },
        { value: 'GENERAL', label: t('عمومی', 'General') }
    ];

    const TRANSACTION_ACTIONS = [
        { value: 'DEPOSIT', label: t('واریز', 'Deposit') },
        { value: 'WITHDRAWAL', label: t('برداشت', 'Withdrawal') },
        { value: 'TRANSFER', label: t('انتقال', 'Transfer') }
    ];

    const TRANSACTION_GROUPS = [
        { value: 'COST', label: t('هزینه', 'Cost') },
        { value: 'INCOME', label: t('درآمد', 'Income') },
        { value: 'BALANCE', label: t('بالانس', 'Balance') },
        { value: 'OTHER', label: t('سایر', 'Other') }
    ];

    const STATUS_OPTIONS = [
        { value: 'DRAFT', label: t('یادداشت', 'Draft') },
        { value: 'TEMPORARY', label: t('موقت', 'Temporary') },
        { value: 'APPROVED', label: t('تایید شده', 'Approved') }
    ];

    const [viewMode, setViewMode] = useState('list');
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    
    const [transactions, setTransactions] = useState([]);
    const [gridState, setGridState] = useState(null);
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState('CREATE');
    const [headerData, setHeaderData] = useState({});
    const [itemsData, setItemsData] = useState([]);
    
    const [isLovOpen, setIsLovOpen] = useState(false);
    const [lovTargetIndex, setLovTargetIndex] = useState(null);
    const [lovGridState, setLovGridState] = useState(null);

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, data: null });

    const [lookups, setLookups] = useState({
        accounts: [],
        costTypes: [],
        incomeTypes: [],
        departments: [],
        usersMap: {}
    });

    const isFetchingDeps = useRef(false);
    const isFetchingData = useRef(false);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (action, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: 'تراکنش‌ها', action: action, user_name: currentUserName, details: details
        }]);
      } catch (err) {
        console.error('Action log failed:', err);
      }
    }, [supabase, currentUserName]);

    const fetchDependencies = useCallback(async () => {
        if (isFetchingDeps.current || !supabase) return;
        isFetchingDeps.current = true;
        try {
            const [accRes, costRes, incRes, orgRes, usersRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa, title_en').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa, title_en').eq('is_active', true),
                supabase.from('org_departments').select('id, title, members'),
                supabase.from('sec_users').select('id, first_name, last_name, username')
            ]);
            
            const uMap = {};
            (usersRes.data || []).forEach(u => {
                uMap[u.id] = `${u.first_name || ''} ${u.last_name || ''} (${u.username || ''})`.trim();
            });

            setLookups({
                accounts: accRes.data || [],
                costTypes: costRes.data || [],
                incomeTypes: incRes.data || [],
                departments: orgRes.data || [],
                usersMap: uMap
            });
        } catch (error) {
            showToast(t('خطا در دریافت اطلاعات پایه', 'Error fetching dependencies'), 'error');
        } finally {
            isFetchingDeps.current = false;
        }
    }, [supabase, showToast, t]);

    const fetchData = useCallback(async () => {
        if (isFetchingData.current || !supabase) return;
        isFetchingData.current = true;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('fm_transactions')
                .select('*, fm_transaction_items(*)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            showToast(t('خطا در دریافت لیست تراکنش‌ها', 'Error fetching transactions'), 'error');
        } finally {
            setIsLoading(false);
            isFetchingData.current = false;
        }
    }, [supabase, showToast, t]);

    useEffect(() => {
        if (access.canView && viewMode === 'list') {
            fetchDependencies();
            fetchData();
        }
    }, [fetchDependencies, fetchData, access.canView, viewMode]);

    const generateDocumentCode = () => {
        return `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    };

    const getEmptyItem = (rowNum) => ({
        row_number: rowNum, account_id: '', transaction_action: 'DEPOSIT', transaction_group: 'COST',
        cost_type_id: '', income_type_id: '', currency: '', amount: '', description: ''
    });

    const handleOpenForm = (mode, record = null) => {
        setFormMode(mode);
        const userDept = lookups.departments.find(d => d.members?.includes(currentUserId))?.id || '';

        if (mode === 'CREATE') {
            setHeaderData({
                document_code: generateDocumentCode(),
                document_date: new Date().toISOString().split('T')[0],
                transaction_type: 'GENERAL',
                department_id: userDept,
                description: '',
                status: 'DRAFT',
                registered_at: new Date().toISOString()
            });
            setItemsData([getEmptyItem(1)]);
        } else if (mode === 'EDIT' || mode === 'COPY') {
            setHeaderData({
                ...record,
                id: mode === 'COPY' ? undefined : record.id,
                document_code: mode === 'COPY' ? generateDocumentCode() : record.document_code,
                status: mode === 'COPY' ? 'DRAFT' : record.status,
                reference_code: mode === 'COPY' ? '' : record.reference_code,
                daily_number: mode === 'COPY' ? '' : record.daily_number,
                registered_at: mode === 'COPY' ? new Date().toISOString() : record.registered_at,
                department_id: mode === 'COPY' ? userDept : record.department_id
            });
            
            const mappedItems = (record.fm_transaction_items || []).map(item => ({
                ...item,
                id: mode === 'COPY' ? undefined : item.id,
                transaction_id: mode === 'COPY' ? undefined : item.transaction_id
            })).sort((a, b) => a.row_number - b.row_number);
            
            setItemsData(mappedItems.length ? mappedItems : [getEmptyItem(1)]);
        }
        setIsFormModalOpen(true);
    };

    const handleSaveTransaction = async () => {
        if (!headerData.document_date || !headerData.transaction_type) {
            return showToast(t('تکمیل فیلدهای اجباری سربرگ الزامی است.', 'Header required fields missing.'), 'warning');
        }
        
        if (itemsData.length === 0 || itemsData.some(i => !i.account_id || !i.amount || !i.description)) {
            return showToast(t('اطلاعات اقلام سند ناقص است (حساب، مبلغ و شرح اجباری می‌باشند).', 'Item fields are missing.'), 'warning');
        }

        setIsLoading(true);
        try {
            let txId = headerData.id;
            const txPayload = {
                document_code: headerData.document_code,
                document_date: headerData.document_date,
                registrar_id: currentUserId,
                transaction_type: headerData.transaction_type,
                department_id: headerData.department_id,
                status: headerData.status,
                description: headerData.description
            };

            if (formMode === 'CREATE' || formMode === 'COPY') {
                const { data, error } = await supabase.from('fm_transactions').insert([txPayload]).select('id');
                if (error) throw error;
                txId = data[0].id;
                await logAction('create_transaction', `ایجاد تراکنش: ${headerData.document_code}`);
            } else {
                const { error } = await supabase.from('fm_transactions').update(txPayload).eq('id', txId);
                if (error) throw error;
                await logAction('update_transaction', `ویرایش تراکنش: ${headerData.document_code}`);
                await supabase.from('fm_transaction_items').delete().eq('transaction_id', txId);
            }

            const itemsPayload = itemsData.map((item, index) => ({
                transaction_id: txId,
                row_number: index + 1,
                account_id: item.account_id,
                transaction_action: item.transaction_action,
                transaction_group: item.transaction_group,
                cost_type_id: item.transaction_group === 'COST' ? item.cost_type_id : null,
                income_type_id: item.transaction_group === 'INCOME' ? item.income_type_id : null,
                currency: item.currency || 'IRR',
                amount: parseFloat(item.amount),
                description: item.description
            }));

            const { error: itemsError } = await supabase.from('fm_transaction_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            showToast(t('سند با موفقیت ثبت شد.', 'Transaction saved successfully.'));
            setIsFormModalOpen(false);
            fetchData();
        } catch (error) {
            showToast(t('خطا در ثبت سند.', 'Error saving transaction.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...itemsData];
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'transaction_group') {
            newItems[index].cost_type_id = '';
            newItems[index].income_type_id = '';
        }
        setItemsData(newItems);
    };

    const addItem = () => setItemsData([...itemsData, getEmptyItem(itemsData.length + 1)]);
    
    const removeItem = (index) => {
        const newItems = itemsData.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, row_number: idx + 1 }));
        setItemsData(newItems);
    };

    const openAccountLOV = (index) => {
        setLovTargetIndex(index);
        setIsLovOpen(true);
    };

    const selectAccount = (account) => {
        if (lovTargetIndex !== null) {
            handleItemChange(lovTargetIndex, 'account_id', account.id);
            handleItemChange(lovTargetIndex, 'currency', account.currency_id || 'IRR');
        }
        setIsLovOpen(false);
        setLovTargetIndex(null);
    };

    const executeDelete = async () => {
        try {
            const { error } = await supabase.from('fm_transactions').delete().eq('id', deleteConfirm.data.id);
            if (error) throw error;
            await logAction('delete_transaction', `حذف تراکنش: ${deleteConfirm.data.document_code}`);
            showToast(t('سند با موفقیت حذف شد.', 'Document deleted successfully.'));
            fetchData();
            setDeleteConfirm({ isOpen: false, data: null });
        } catch (error) {
            showToast(t('خطا در حذف سند.', 'Error deleting document.'), 'error');
            setDeleteConfirm({ isOpen: false, data: null });
        }
    };

    const columns = useMemo(() => [
        { field: 'reference_code', header_fa: 'کد عطف', header_en: 'Ref Code', width: '100px' },
        { field: 'document_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '140px' },
        { field: 'document_date', header_fa: 'تاریخ سند', header_en: 'Date', width: '120px', type: 'date' },
        { field: 'transaction_type', header_fa: 'نوع تراکنش', header_en: 'Type', width: '120px', render: (row) => TRANSACTION_TYPES.find(x => x.value === row.transaction_type)?.label || row.transaction_type },
        { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '100px', render: (row) => STATUS_OPTIONS.find(x => x.value === row.status)?.label || row.status },
        { field: 'registrar_id', header_fa: 'ثبت کننده', header_en: 'Registrar', width: '180px', render: (row) => lookups.usersMap[row.registrar_id] || row.registrar_id }
    ], [lookups.usersMap, t]);

    const lovColumns = useMemo(() => [
        { field: 'code', header_fa: 'کد حساب', header_en: 'Code', width: '120px' },
        { field: 'title_fa', header_fa: 'عنوان حساب', header_en: 'Title', width: 'auto' }
    ], []);

    const viewConfig = useMemo(() => ({
      pageId: 'transactions_main_list',
      currentState: () => ({ viewMode, gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.viewMode) setViewMode(state.viewMode);
          if (state.gridState) setGridState(state.gridState);
        } else {
          setViewMode('list');
          setGridState(null);
        }
      }
    }), [viewMode, gridState]);

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('ثبت و مدیریت تراکنش‌ها', 'Transactions Management')}
          icon={FileText} language={language}
          description={t('ورود اطلاعات و مدیریت اسناد مالی چندسطری', 'Manage financial documents and multi-row records')}
          breadcrumbs={[{ label: t('مدیریت مالی', 'Financial Setup') }, { label: t('تراکنش‌ها', 'Transactions') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 min-h-0 flex flex-col gap-1 mt-2 animate-in fade-in duration-500">
          <div className="flex-1 min-h-0">
            <DataGrid
              data={transactions} columns={columns} language={language} formCode={formCode}
              gridState={gridState} onGridStateChange={setGridState}
              onAdd={access.canCreate ? () => handleOpenForm('CREATE') : undefined}
              onRowDoubleClick={access.canEdit ? (row) => handleOpenForm('EDIT', row) : undefined}
              hideImport={false}
              hideExport={false}
              actions={[
                { id: 'copy', icon: Copy, tooltip: t('کپی سند', 'Duplicate Document'), onClick: (row) => handleOpenForm('COPY', row), requiredAccess: 'create', className: 'text-emerald-600 dark:text-emerald-400' },
                { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit Document'), onClick: (row) => handleOpenForm('EDIT', row), requiredAccess: 'edit' },
                { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete Document'), onClick: (row) => setDeleteConfirm({ isOpen: true, data: row }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
              ]}
            />
          </div>
        </div>

        <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={formMode === 'CREATE' ? t('ثبت تراکنش جدید', 'New Transaction') : formMode === 'EDIT' ? t('ویرایش تراکنش', 'Edit Transaction') : t('کپی تراکنش', 'Copy Transaction')} language={language} width="max-w-5xl">
          <div className="flex flex-col gap-4 h-[75vh] overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                
              <Card title={t('اطلاعات سربرگ سند', 'Document Header')} className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700 shadow-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-2">
                    <TextField size="sm" formCode={formCode} label={t('کد سند', 'Document Code')} value={headerData.document_code || ''} readOnly isRtl={isRtl} dir="ltr" />
                    <TextField size="sm" formCode={formCode} label={t('کد عطف', 'Ref Code')} value={headerData.reference_code || ''} readOnly isRtl={isRtl} dir="ltr" />
                    <TextField size="sm" formCode={formCode} label={t('شماره روزانه', 'Daily Number')} value={headerData.daily_number || ''} readOnly isRtl={isRtl} dir="ltr" />
                    <DatePicker size="sm" formCode={formCode} label={t('تاریخ سند', 'Document Date')} value={headerData.document_date || ''} onChange={val => setHeaderData({...headerData, document_date: val})} isRtl={isRtl} required />
                    
                    <TextField size="sm" formCode={formCode} label={t('تاریخ ثبت', 'Registered At')} value={headerData.registered_at ? new Date(headerData.registered_at).toLocaleString('fa-IR') : ''} readOnly isRtl={isRtl} dir="ltr" />
                    <TextField size="sm" formCode={formCode} label={t('ثبت کننده', 'Registrar')} value={formMode === 'EDIT' && headerData.registrar_id ? (lookups.usersMap[headerData.registrar_id] || '') : `${currentUserName} (${currentUserUsername})`} readOnly isRtl={isRtl} />
                    <SelectField size="sm" formCode={formCode} label={t('نوع تراکنش', 'Transaction Type')} value={headerData.transaction_type || 'GENERAL'} onChange={e => setHeaderData({...headerData, transaction_type: e.target.value})} options={TRANSACTION_TYPES} isRtl={isRtl} required />
                    <SelectField size="sm" formCode={formCode} label={t('دپارتمان', 'Department')} value={headerData.department_id || ''} disabled options={lookups.departments.map(d => ({ value: d.id, label: d.title }))} isRtl={isRtl} />
                    
                    <SelectField size="sm" formCode={formCode} label={t('وضعیت سند', 'Document Status')} value={headerData.status || 'DRAFT'} onChange={e => setHeaderData({...headerData, status: e.target.value})} options={STATUS_OPTIONS} isRtl={isRtl} className="md:col-span-1" />
                    <TextField size="sm" formCode={formCode} label={t('شرح تراکنش (سربرگ)', 'Header Description')} value={headerData.description || ''} onChange={e => setHeaderData({...headerData, description: e.target.value})} isRtl={isRtl} className="md:col-span-3" />
                </div>
              </Card>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">{t('اقلام و جزئیات سند', 'Document Items Details')}</h3>
                    <Button variant="secondary" size="sm" onClick={addItem} icon={Plus}>{t('افزودن ردیف', 'Add Row')}</Button>
                </div>
                
                <div className="flex flex-col gap-3">
                    {itemsData.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm items-start">
                            <div className="md:col-span-1 flex flex-col justify-center h-[60px] border-l border-slate-100 dark:border-slate-700 pl-2">
                                <span className="text-[10px] text-slate-400 font-bold mb-1">{t('ردیف', 'Row')}</span>
                                <span className="font-black text-slate-700 dark:text-slate-300 text-lg">{item.row_number}</span>
                            </div>
                            
                            <div className="md:col-span-11 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('حساب', 'Account')}</label>
                                    <div className="flex gap-1 h-9">
                                        <div className="flex-1">
                                            <TextField size="sm" value={lookups.accounts.find(a => a.id === item.account_id)?.title_fa || ''} readOnly isRtl={isRtl} placeholder={t('انتخاب کنید...', 'Select...')} />
                                        </div>
                                        <Button variant="outline" size="sm" icon={Search} onClick={() => openAccountLOV(index)} className="px-2" />
                                    </div>
                                </div>
                                <SelectField size="sm" formCode={formCode} label={t('نوع', 'Action')} value={item.transaction_action} onChange={e => handleItemChange(index, 'transaction_action', e.target.value)} options={TRANSACTION_ACTIONS} isRtl={isRtl} />
                                <SelectField size="sm" formCode={formCode} label={t('گروه', 'Group')} value={item.transaction_group} onChange={e => handleItemChange(index, 'transaction_group', e.target.value)} options={TRANSACTION_GROUPS} isRtl={isRtl} />
                                
                                {item.transaction_group === 'COST' ? (
                                    <SelectField size="sm" formCode={formCode} label={t('نوع هزینه', 'Cost Type')} value={item.cost_type_id} onChange={e => handleItemChange(index, 'cost_type_id', e.target.value)} options={lookups.costTypes.map(c => ({ value: c.id, label: isRtl ? c.title_fa : c.title_en }))} isRtl={isRtl} />
                                ) : item.transaction_group === 'INCOME' ? (
                                    <SelectField size="sm" formCode={formCode} label={t('نوع درآمد', 'Income Type')} value={item.income_type_id} onChange={e => handleItemChange(index, 'income_type_id', e.target.value)} options={lookups.incomeTypes.map(c => ({ value: c.id, label: isRtl ? c.title_fa : c.title_en }))} isRtl={isRtl} />
                                ) : (
                                    <div className="hidden sm:block"></div>
                                )}
                                
                                <TextField size="sm" formCode={formCode} label={t('ارز', 'Currency')} value={item.currency} readOnly isRtl={isRtl} dir="ltr" />
                                <TextField size="sm" type="number" formCode={formCode} label={t('مبلغ', 'Amount')} value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} isRtl={isRtl} dir="ltr" required />
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <TextField size="sm" formCode={formCode} label={t('شرح قلم', 'Item Description')} value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} isRtl={isRtl} required />
                                    </div>
                                    {itemsData.length > 1 && (
                                        <Button variant="ghost" size="sm" icon={Trash2} className="!text-red-500 mb-0.5 h-9 w-9 px-0" onClick={() => removeItem(index)} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 px-4 pb-4 border-t border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50/80 dark:bg-slate-900/80">
                <Button variant="outline" onClick={() => setIsFormModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
                {access.canEdit && <Button variant="primary" icon={Save} onClick={handleSaveTransaction} isLoading={isLoading}>{t('ثبت نهایی سند', 'Save Document')}</Button>}
            </div>
          </div>
        </Modal>

        <Modal isOpen={isLovOpen} onClose={() => { setIsLovOpen(false); setLovTargetIndex(null); }} title={t('انتخاب حساب', 'Select Account')} language={language} width="max-w-3xl">
          <div className="h-[60vh] flex flex-col p-2">
            <DataGrid
              data={lookups.accounts}
              columns={lovColumns}
              language={language}
              formCode={formCode}
              gridState={lovGridState}
              onGridStateChange={setLovGridState}
              hideImport={true}
              hideExport={true}
              actions={[
                  { id: 'select', icon: Plus, tooltip: t('انتخاب این حساب', 'Select Account'), onClick: (row) => selectAccount(row), className: 'text-indigo-600 dark:text-indigo-400 font-bold' }
              ]}
            />
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, data: null })} title={t('تایید حذف سند', 'Confirm Document Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار', 'Warning')}
            description={t(`آیا از حذف سند شماره ${deleteConfirm.data?.document_code} اطمینان دارید؟`, `Are you sure you want to delete document ${deleteConfirm.data?.document_code}?`)}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} className="flex-1">{t('تایید', 'Confirm')}</Button>
              </div>
            }
          />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  TransactionMain.formCode = 'TRANSACTIONS';
  window.TransactionMain = TransactionMain;
})();