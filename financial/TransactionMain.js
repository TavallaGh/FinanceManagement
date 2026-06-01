/* Filename: financial/TransactionMain.js */
(() => {
    const React = window.React;
    const { useState, useEffect, useMemo, useCallback } = React;

    const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
    const LucideIcons = window.LucideIcons || {};
    const {
        FileText = FallbackIcon, Plus = FallbackIcon, Edit = FallbackIcon, Copy = FallbackIcon, 
        Trash2 = FallbackIcon, Save = FallbackIcon, RefreshCw = FallbackIcon, 
        Search = FallbackIcon, Download = FallbackIcon, Upload = FallbackIcon,
        AlertTriangle = FallbackIcon, ArrowRight = FallbackIcon, ArrowLeft = FallbackIcon,
        List = FallbackIcon
    } = LucideIcons;

    const TransactionMain = ({ language = 'fa', formCode = 'TRANSACTIONS' }) => {
        const FallbackComponent = () => null;

        const Core = window.DSCore || window.DesignSystem || {};
        const { Button = FallbackComponent, Card = FallbackComponent, PageHeader = FallbackComponent, EmptyState = FallbackComponent, Tabs = FallbackComponent } = Core;

        const Forms = window.DSForms || window.DesignSystem || {};
        const { TextField = FallbackComponent, SelectField = FallbackComponent, DatePickerField = FallbackComponent, ToggleField = FallbackComponent } = Forms;

        const Feedback = window.DSFeedback || window.DesignSystem || {};
        const { Modal = FallbackComponent, Toast = FallbackComponent, Alert = FallbackComponent } = Feedback;

        const GridSystem = window.DSGrid || window.DesignSystem || {};
        const { DSGrid = FallbackComponent } = GridSystem;

        const isRtl = language === 'fa';
        const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

        const supabase = window.supabase;
        const currentUser = window.NavigationSystem?.currentUser || { id: '00000000-0000-0000-0000-000000000000', name: 'کاربر سیستم', username: 'user' };

        const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
        const access = useMemo(() => {
            const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
            return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
        }, [securityCtx, formCode]);

        const TRANSACTION_TYPES = [
            { value: 'OPENING', label: t('سند افتتاحیه', 'Opening Document') },
            { value: 'CLOSING', label: t('سند اختتامیه', 'Closing Document') },
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

        const [transactions, setTransactions] = useState([]);
        const [loading, setLoading] = useState(false);
        const [viewMode, setViewMode] = useState('ALL');
        const [formMode, setFormMode] = useState(null);
        const [entryMode, setEntryMode] = useState('SINGLE');
        const [selectedRows, setSelectedRows] = useState([]);

        const [lookups, setLookups] = useState({
            departments: [],
            accounts: [],
            costTypes: [],
            incomeTypes: [],
            usersMap: {}
        });

        const [headerData, setHeaderData] = useState({});
        const [itemsData, setItemsData] = useState([]);
        const [showAccountLOV, setShowAccountLOV] = useState(false);
        const [currentRowIndex, setCurrentRowIndex] = useState(null);

        const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
        const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, data: [] });

        const showToast = useCallback((message, type = 'success') => {
            setToast({ isVisible: true, message, type });
            setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
        }, []);

        const logAction = useCallback(async (action, details = '') => {
            try {
                if (!supabase) return;
                await supabase.from('fm_record_logs').insert([{
                    entity_type: 'تراکنش‌ها', action: action, user_name: currentUser.name, details: details
                }]);
            } catch (err) {
                console.error('Log error', err);
            }
        }, [supabase, currentUser]);

        const fetchLookups = useCallback(async () => {
            try {
                if (!supabase) return;
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
                showToast(t('خطا در دریافت اطلاعات پایه', 'Error fetching base data'), 'error');
            }
        }, [supabase, showToast, t]);

        const fetchData = useCallback(async () => {
            setLoading(true);
            try {
                if (!supabase) return;
                let query = supabase
                    .from('fm_transactions')
                    .select(`*, fm_transaction_items (*)`)
                    .order('created_at', { ascending: false });

                if (viewMode === 'MINE' && currentUser?.id) {
                    query = query.eq('registrar_id', currentUser.id);
                }

                const { data, error } = await query;
                if (error) throw error;
                setTransactions(data || []);
            } catch (error) {
                showToast(t('خطا در دریافت اطلاعات تراکنش‌ها', 'Error fetching transactions'), 'error');
            } finally {
                setLoading(false);
            }
        }, [supabase, viewMode, currentUser, showToast, t]);

        useEffect(() => {
            if (access.canView) {
                fetchLookups();
                fetchData();
            }
        }, [fetchLookups, fetchData, access.canView]);

        const generateDocumentCode = () => {
            return `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        };

        const getEmptyItem = (rowNum) => ({
            row_number: rowNum,
            account_id: '',
            transaction_action: 'DEPOSIT',
            transaction_group: 'COST',
            cost_type_id: '',
            income_type_id: '',
            currency: '',
            amount: '',
            description: ''
        });

        const handleOpenForm = (mode, record = null) => {
            setFormMode(mode);
            const userDept = lookups.departments.find(d => d.members?.includes(currentUser?.id))?.id || '';

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
                setEntryMode('SINGLE');
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
                setEntryMode(mappedItems.length <= 1 ? 'SINGLE' : 'MULTI');
            }
        };

        const handleCloseForm = () => {
            setFormMode(null);
            setHeaderData({});
            setItemsData([]);
            setCurrentRowIndex(null);
        };

        const handleSave = async () => {
            if (!headerData.document_date || !headerData.transaction_type) {
                return showToast(t('تکمیل فیلدهای اجباری سربرگ الزامی است.', 'Header required fields are missing.'), 'warning');
            }

            const validItems = entryMode === 'SINGLE' ? itemsData.slice(0, 1) : itemsData;
            if (validItems.length === 0 || validItems.some(i => !i.account_id || !i.amount || !i.description)) {
                return showToast(t('اطلاعات اقلام سند ناقص است (حساب، مبلغ و شرح اجباری می‌باشند).', 'Item fields are missing.'), 'warning');
            }

            setLoading(true);
            try {
                let txId = headerData.id;
                const txPayload = {
                    document_code: headerData.document_code,
                    document_date: headerData.document_date,
                    registrar_id: currentUser.id,
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

                const itemsPayload = validItems.map((item, index) => ({
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
                handleCloseForm();
                fetchData();
            } catch (error) {
                showToast(t('خطا در ثبت سند.', 'Error saving transaction.'), 'error');
            } finally {
                setLoading(false);
            }
        };

        const handleBulkStatusChange = async (newStatus) => {
            if (!selectedRows.length) return showToast(t('رکوردی انتخاب نشده است.', 'No records selected.'), 'warning');
            try {
                const { error } = await supabase.from('fm_transactions').update({ status: newStatus }).in('id', selectedRows);
                if (error) throw error;
                showToast(t('وضعیت اسناد انتخاب شده با موفقیت تغییر کرد.', 'Status updated successfully.'));
                await logAction('bulk_status_update', `تغییر وضعیت ${selectedRows.length} رکورد به ${newStatus}`);
                setSelectedRows([]);
                fetchData();
            } catch (error) {
                showToast(t('خطا در تغییر وضعیت.', 'Error updating status.'), 'error');
            }
        };

        const executeDelete = async () => {
            try {
                const { error } = await supabase.from('fm_transactions').delete().in('id', deleteConfirm.data);
                if (error) throw error;
                showToast(t('اسناد با موفقیت حذف شدند.', 'Documents deleted successfully.'));
                await logAction('bulk_delete', `حذف ${deleteConfirm.data.length} تراکنش`);
                setSelectedRows([]);
                fetchData();
                setDeleteConfirm({ isOpen: false, data: [] });
            } catch (error) {
                showToast(t('خطا در حذف اسناد.', 'Error deleting documents.'), 'error');
                setDeleteConfirm({ isOpen: false, data: [] });
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

        const addItem = () => {
            setItemsData([...itemsData, getEmptyItem(itemsData.length + 1)]);
        };

        const removeItem = (index) => {
            const newItems = itemsData.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, row_number: idx + 1 }));
            setItemsData(newItems);
        };

        const openAccountLOV = (index) => {
            setCurrentRowIndex(index);
            setShowAccountLOV(true);
        };

        const selectAccount = (account) => {
            if (currentRowIndex !== null) {
                handleItemChange(currentRowIndex, 'account_id', account.id);
                handleItemChange(currentRowIndex, 'currency', account.currency_id || 'IRR');
            }
            setShowAccountLOV(false);
            setCurrentRowIndex(null);
        };

        const columns = useMemo(() => [
            { key: 'reference_code', label: t('کد عطف', 'Ref Code'), sortable: true },
            { key: 'document_code', label: t('کد سند', 'Doc Code'), sortable: true },
            { key: 'daily_number', label: t('شماره روزانه', 'Daily Number'), sortable: true },
            { key: 'document_date', label: t('تاریخ سند', 'Date'), sortable: true },
            { key: 'transaction_type', label: t('نوع تراکنش', 'Type'), render: (val) => TRANSACTION_TYPES.find(x => x.value === val)?.label || val },
            { key: 'status', label: t('وضعیت', 'Status'), render: (val) => STATUS_OPTIONS.find(x => x.value === val)?.label || val },
            { key: 'registrar_id', label: t('ثبت کننده', 'Registrar'), render: (val) => lookups.usersMap[val] || val },
            { key: 'actions', label: t('عملیات', 'Actions'), render: (_, row) => (
                <div className="flex gap-2">
                    {access.canEdit && <Button icon={Edit} variant="ghost" size="sm" onClick={() => handleOpenForm('EDIT', row)} />}
                    {access.canCreate && <Button icon={Copy} variant="ghost" size="sm" onClick={() => handleOpenForm('COPY', row)} />}
                </div>
            )}
        ], [lookups.usersMap, access, t, TRANSACTION_TYPES, STATUS_OPTIONS]);

        const renderItemRow = (item, index, isSingleMode) => (
            <div key={index} className="flex flex-col gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm mb-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t(`ردیف ${item.row_number}`, `Row ${item.row_number}`)}</span>
                    {!isSingleMode && itemsData.length > 1 && (
                        <Button variant="ghost" size="sm" icon={Trash2} className="!text-red-500" onClick={() => removeItem(index)} />
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex gap-1 items-end md:col-span-2">
                        <div className="flex-1">
                            <TextField size="sm" label={t('حساب', 'Account')} value={lookups.accounts.find(a => a.id === item.account_id)?.title_fa || ''} readOnly isRtl={isRtl} />
                        </div>
                        <Button variant="secondary" size="sm" icon={Search} onClick={() => openAccountLOV(index)} className="mb-0.5" />
                    </div>
                    <SelectField size="sm" label={t('نوع تراکنش', 'Action')} value={item.transaction_action} onChange={e => handleItemChange(index, 'transaction_action', e.target.value)} options={TRANSACTION_ACTIONS} isRtl={isRtl} />
                    <SelectField size="sm" label={t('گروه تراکنش', 'Group')} value={item.transaction_group} onChange={e => handleItemChange(index, 'transaction_group', e.target.value)} options={TRANSACTION_GROUPS} isRtl={isRtl} />
                    
                    {item.transaction_group === 'COST' && <SelectField size="sm" label={t('نوع هزینه', 'Cost Type')} value={item.cost_type_id} onChange={e => handleItemChange(index, 'cost_type_id', e.target.value)} options={lookups.costTypes.map(c => ({ value: c.id, label: isRtl ? c.title_fa : c.title_en }))} isRtl={isRtl} />}
                    {item.transaction_group === 'INCOME' && <SelectField size="sm" label={t('نوع درآمد', 'Income Type')} value={item.income_type_id} onChange={e => handleItemChange(index, 'income_type_id', e.target.value)} options={lookups.incomeTypes.map(c => ({ value: c.id, label: isRtl ? c.title_fa : c.title_en }))} isRtl={isRtl} />}
                    {['BALANCE', 'OTHER'].includes(item.transaction_group) && <div className="hidden md:block"></div>}
                    
                    <TextField size="sm" label={t('ارز', 'Currency')} value={item.currency} readOnly isRtl={isRtl} dir="ltr" />
                    <TextField size="sm" type="number" label={t('مبلغ', 'Amount')} value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} isRtl={isRtl} dir="ltr" />
                    <TextField size="sm" label={t('شرح', 'Description')} value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} isRtl={isRtl} className="md:col-span-4" required />
                </div>
            </div>
        );

        return (
            <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
                <PageHeader 
                    title={t('ثبت تراکنش‌ها', 'Transactions')}
                    icon={FileText} language={language}
                    description={t('مدیریت و ثبت اسناد مالی', 'Manage financial documents')}
                    breadcrumbs={[{ label: t('مدیریت مالی', 'Financial Management') }, { label: t('تراکنش‌ها', 'Transactions') }]}
                />

                <div className="flex-1 flex flex-col mt-3 gap-4 min-h-0">
                    <Card className="shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {access.canCreate && <Button onClick={() => handleOpenForm('CREATE')} icon={Plus}>{t('ثبت سند جدید', 'New Document')}</Button>}
                                <SelectField size="sm" value={viewMode} onChange={e => setViewMode(e.target.value)} options={[
                                    { value: 'ALL', label: t('همه اسناد', 'All Documents') },
                                    { value: 'MINE', label: t('اسناد من', 'My Documents') }
                                ]} wrapperClassName="w-48 mb-0" isRtl={isRtl} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                                <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange('TEMPORARY')} disabled={!selectedRows.length}>{t('تغییر به موقت', 'Set Temporary')}</Button>
                                <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange('DRAFT')} disabled={!selectedRows.length}>{t('تغییر به یادداشت', 'Set Draft')}</Button>
                                {access.canDelete && <Button variant="danger" size="sm" icon={Trash2} onClick={() => selectedRows.length && setDeleteConfirm({ isOpen: true, data: selectedRows })} disabled={!selectedRows.length}>{t('حذف گروهی', 'Bulk Delete')}</Button>}
                            </div>
                        </div>
                    </Card>

                    <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <DSGrid
                            data={transactions}
                            columns={columns}
                            loading={loading}
                            selectable={true}
                            onSelectionChange={setSelectedRows}
                            advancedSearch={true}
                            pagination={true}
                        />
                    </div>
                </div>

                <Modal isOpen={!!formMode} onClose={handleCloseForm} title={formMode === 'CREATE' ? t('ثبت تراکنش جدید', 'New Transaction') : formMode === 'EDIT' ? t('ویرایش تراکنش', 'Edit Transaction') : t('کپی تراکنش', 'Copy Transaction')} language={language} width="max-w-5xl">
                    <div className="flex flex-col gap-6 h-[70vh] overflow-hidden">
                        <div className="flex justify-end gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 shrink-0">
                            <Button variant={entryMode === 'SINGLE' ? 'primary' : 'outline'} size="sm" onClick={() => {
                                setEntryMode('SINGLE');
                                setItemsData(itemsData.slice(0, 1));
                            }}>{t('تک سطری', 'Single Row')}</Button>
                            <Button variant={entryMode === 'MULTI' ? 'primary' : 'outline'} size="sm" onClick={() => setEntryMode('MULTI')}>{t('چند سطری', 'Multi Row')}</Button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 space-y-6">
                            <Card title={t('اطلاعات سربرگ', 'Header Data')} className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700 shadow-none">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-2">
                                    <TextField size="sm" label={t('کد سند', 'Document Code')} value={headerData.document_code || ''} readOnly isRtl={isRtl} dir="ltr" />
                                    <TextField size="sm" label={t('کد عطف', 'Ref Code')} value={headerData.reference_code || ''} readOnly isRtl={isRtl} dir="ltr" />
                                    <TextField size="sm" label={t('شماره روزانه', 'Daily Number')} value={headerData.daily_number || ''} readOnly isRtl={isRtl} dir="ltr" />
                                    <TextField size="sm" type="date" label={t('تاریخ سند', 'Document Date')} value={headerData.document_date || ''} onChange={e => setHeaderData({...headerData, document_date: e.target.value})} isRtl={isRtl} dir="ltr" />
                                    
                                    <TextField size="sm" label={t('تاریخ ثبت', 'Registered At')} value={headerData.registered_at ? new Date(headerData.registered_at).toLocaleString('fa-IR') : ''} readOnly isRtl={isRtl} dir="ltr" />
                                    <TextField size="sm" label={t('ثبت کننده', 'Registrar')} value={formMode === 'EDIT' && headerData.registrar_id ? (lookups.usersMap[headerData.registrar_id] || '') : `${currentUser?.name} (${currentUser?.username})`} readOnly isRtl={isRtl} />
                                    <SelectField size="sm" label={t('نوع تراکنش', 'Transaction Type')} value={headerData.transaction_type || 'GENERAL'} onChange={e => setHeaderData({...headerData, transaction_type: e.target.value})} options={TRANSACTION_TYPES} isRtl={isRtl} />
                                    <SelectField size="sm" label={t('دپارتمان', 'Department')} value={headerData.department_id || ''} disabled options={lookups.departments.map(d => ({ value: d.id, label: d.title }))} isRtl={isRtl} />
                                    
                                    <SelectField size="sm" label={t('وضعیت', 'Status')} value={headerData.status || 'DRAFT'} onChange={e => setHeaderData({...headerData, status: e.target.value})} options={[
                                        { value: 'DRAFT', label: t('یادداشت', 'Draft') }, { value: 'TEMPORARY', label: t('موقت', 'Temporary') }
                                    ]} isRtl={isRtl} />
                                    <TextField size="sm" label={t('شرح تراکنش', 'Description')} value={headerData.description || ''} onChange={e => setHeaderData({...headerData, description: e.target.value})} isRtl={isRtl} className="md:col-span-3" />
                                </div>
                            </Card>

                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300">{t('اقلام سند', 'Document Items')}</h3>
                                    {entryMode === 'MULTI' && <Button variant="secondary" size="sm" onClick={addItem} icon={Plus}>{t('افزودن ردیف', 'Add Row')}</Button>}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {entryMode === 'SINGLE' ? renderItemRow(itemsData[0] || getEmptyItem(1), 0, true) : itemsData.map((item, index) => renderItemRow(item, index, false))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
                            <Button variant="ghost" onClick={handleCloseForm}>{t('انصراف', 'Cancel')}</Button>
                            <Button variant="primary" icon={Save} onClick={handleSave} loading={loading}>{t('ثبت نهایی', 'Save')}</Button>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={showAccountLOV} onClose={() => { setShowAccountLOV(false); setCurrentRowIndex(null); }} title={t('انتخاب حساب', 'Select Account')} language={language} width="max-w-3xl">
                    <div className="h-[50vh]">
                        <DSGrid
                            data={lookups.accounts}
                            columns={[
                                { key: 'code', label: t('کد حساب', 'Code'), sortable: true },
                                { key: 'title_fa', label: t('عنوان', 'Title'), sortable: true },
                                { key: 'select', label: t('انتخاب', 'Select'), render: (_, row) => <Button size="sm" variant="primary" onClick={() => selectAccount(row)}>{t('انتخاب', 'Select')}</Button> }
                            ]}
                            pagination={true}
                            advancedSearch={true}
                        />
                    </div>
                </Modal>

                <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, data: [] })} title={t('تایید حذف', 'Confirm Delete')} language={language} width="max-w-sm">
                    <EmptyState
                        icon={AlertTriangle}
                        title={t('هشدار', 'Warning')}
                        description={t('آیا از حذف اسناد انتخاب شده اطمینان دارید؟', 'Are you sure you want to delete selected documents?')}
                        action={
                            <div className="flex gap-2 w-full mt-2 px-4">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, data: [] })}>{t('انصراف', 'Cancel')}</Button>
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
