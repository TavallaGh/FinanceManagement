import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { supabase } from '../supabaseConfig';
import { DSGrid } from '../designsystem/DSGrid';
import { DSInput, DSSelect, DSDatePicker } from '../designsystem/DSForms';
import { DSButton, DSIcon } from '../designsystem/DSCore';
import { DSModal, DSConfirm } from '../designsystem/DSOverlays';
import { DSAlert } from '../designsystem/DSFeedback';
import { UserContext } from '../security/SecurityContext';
import { SystemLog } from '../security/SystemLog';

const TRANSACTION_TYPES = [
    { value: 'OPENING', label: 'سند افتتاحیه' },
    { value: 'CLOSING', label: 'سند اختتامیه' },
    { value: 'GENERAL', label: 'عمومی' }
];

const TRANSACTION_ACTIONS = [
    { value: 'DEPOSIT', label: 'واریز' },
    { value: 'WITHDRAWAL', label: 'برداشت' },
    { value: 'TRANSFER', label: 'انتقال' }
];

const TRANSACTION_GROUPS = [
    { value: 'COST', label: 'هزینه' },
    { value: 'INCOME', label: 'درآمد' },
    { value: 'BALANCE', label: 'بالانس' },
    { value: 'OTHER', label: 'سایر' }
];

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'یادداشت' },
    { value: 'TEMPORARY', label: 'موقت' },
    { value: 'APPROVED', label: 'تایید شده' }
];

export const TransactionMain = () => {
    const { currentUser } = useContext(UserContext);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('ALL'); 
    const [formMode, setFormMode] = useState(null); 
    const [entryMode, setEntryMode] = useState('SINGLE'); 
    const [selectedRows, setSelectedRows] = useState([]);
    
    const [departments, setDepartments] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [costTypes, setCostTypes] = useState([]);
    const [incomeTypes, setIncomeTypes] = useState([]);
    const [usersMap, setUsersMap] = useState({});

    const [headerData, setHeaderData] = useState({});
    const [itemsData, setItemsData] = useState([]);
    const [showAccountLOV, setShowAccountLOV] = useState(false);
    const [currentRowIndex, setCurrentRowIndex] = useState(null);

    const registrarDisplayName = useMemo(() => {
        if (!currentUser) return '';
        return `${currentUser.first_name || ''} ${currentUser.last_name || ''} (${currentUser.username || ''})`.trim();
    }, [currentUser]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('fm_transactions')
                .select(`*, fm_transaction_items (*)`)
                .order('created_at', { ascending: false });

            if (viewMode === 'MINE' && currentUser) {
                query = query.eq('registrar_id', currentUser.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            DSAlert.error('خطا در دریافت اطلاعات تراکنش‌ها');
            SystemLog.error('TransactionMain', 'FetchError', error.message);
        } finally {
            setLoading(false);
        }
    }, [viewMode, currentUser]);

    const fetchDependencies = useCallback(async () => {
        try {
            const [accRes, costRes, incRes, orgRes, usersRes] = await Promise.all([
                supabase.from('fm_accounts').select('id, title, currency, code'),
                supabase.from('fm_cost_types').select('id, title'),
                supabase.from('fm_income_types').select('id, title'),
                supabase.from('org_departments').select('id, title, members'),
                supabase.from('sys_users').select('id, first_name, last_name, username')
            ]);
            
            setAccounts(accRes.data || []);
            setCostTypes(costRes.data || []);
            setIncomeTypes(incRes.data || []);
            setDepartments(orgRes.data || []);

            const uMap = {};
            (usersRes.data || []).forEach(u => {
                uMap[u.id] = `${u.first_name || ''} ${u.last_name || ''} (${u.username || ''})`.trim();
            });
            setUsersMap(uMap);

        } catch (error) {
            SystemLog.error('TransactionMain', 'FetchDependenciesError', error.message);
        }
    }, []);

    useEffect(() => {
        fetchDependencies();
    }, [fetchDependencies]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
        amount: 0,
        description: ''
    });

    const handleOpenForm = (mode, record = null) => {
        setFormMode(mode);
        const userDept = departments.find(d => d.members?.includes(currentUser?.id))?.id || '';
        
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
            return DSAlert.warning('تکمیل فیلدهای اجباری سربرگ الزامی است.');
        }
        
        const validItems = entryMode === 'SINGLE' ? itemsData.slice(0, 1) : itemsData;
        if (validItems.length === 0 || validItems.some(i => !i.account_id || !i.amount || !i.description)) {
            return DSAlert.warning('اطلاعات اقلام سند ناقص است (حساب، مبلغ و شرح اجباری می‌باشند).');
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
                const { data, error } = await supabase.from('fm_transactions').insert(txPayload).select('id').single();
                if (error) throw error;
                txId = data.id;
                SystemLog.info('TransactionMain', 'Create', `Transaction ${txId} created by ${currentUser.username}`);
            } else {
                const { error } = await supabase.from('fm_transactions').update(txPayload).eq('id', txId);
                if (error) throw error;
                SystemLog.info('TransactionMain', 'Update', `Transaction ${txId} updated by ${currentUser.username}`);
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
                currency: item.currency,
                amount: parseFloat(item.amount),
                description: item.description
            }));

            const { error: itemsError } = await supabase.from('fm_transaction_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            DSAlert.success('سند با موفقیت ثبت شد.');
            handleCloseForm();
            fetchData();
        } catch (error) {
            DSAlert.error('خطا در ثبت سند.');
            SystemLog.error('TransactionMain', 'SaveError', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (!selectedRows.length) return DSAlert.warning('رکوردی انتخاب نشده است.');
        try {
            const { error } = await supabase.from('fm_transactions').update({ status: newStatus }).in('id', selectedRows);
            if (error) throw error;
            DSAlert.success(`وضعیت اسناد انتخاب شده با موفقیت به ${newStatus === 'TEMPORARY' ? 'موقت' : 'یادداشت'} تغییر کرد.`);
            SystemLog.info('TransactionMain', 'BulkStatusUpdate', `Status changed to ${newStatus} for ${selectedRows.length} records`);
            setSelectedRows([]);
            fetchData();
        } catch (error) {
            DSAlert.error('خطا در تغییر وضعیت.');
            SystemLog.error('TransactionMain', 'BulkStatusUpdateError', error.message);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedRows.length) return;
        DSConfirm('آیا از حذف اسناد انتخاب شده اطمینان دارید؟ این عملیات غیرقابل بازگشت است.', async () => {
            try {
                const { error } = await supabase.from('fm_transactions').delete().in('id', selectedRows);
                if (error) throw error;
                DSAlert.success('اسناد با موفقیت حذف شدند.');
                SystemLog.info('TransactionMain', 'BulkDelete', `Deleted ${selectedRows.length} records`);
                setSelectedRows([]);
                fetchData();
            } catch (error) {
                DSAlert.error('خطا در حذف اسناد.');
                SystemLog.error('TransactionMain', 'BulkDeleteError', error.message);
            }
        });
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

    const handleRowReorder = (oldIndex, newIndexStr) => {
        const newIndex = parseInt(newIndexStr, 10) - 1;
        if (isNaN(newIndex) || newIndex < 0 || newIndex >= itemsData.length || newIndex === oldIndex) return;
        
        const newItems = [...itemsData];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        
        const renumberedItems = newItems.map((item, idx) => ({ ...item, row_number: idx + 1 }));
        setItemsData(renumberedItems);
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
            handleItemChange(currentRowIndex, 'currency', account.currency);
        }
        setShowAccountLOV(false);
        setCurrentRowIndex(null);
    };

    const columns = useMemo(() => [
        { key: 'reference_code', label: 'کد عطف', sortable: true },
        { key: 'document_code', label: 'کد سند', sortable: true },
        { key: 'daily_number', label: 'شماره روزانه', sortable: true },
        { key: 'document_date', label: 'تاریخ سند', sortable: true },
        { key: 'transaction_type', label: 'نوع تراکنش', render: (val) => TRANSACTION_TYPES.find(t => t.value === val)?.label || val },
        { key: 'status', label: 'وضعیت', render: (val) => STATUS_OPTIONS.find(s => s.value === val)?.label || val },
        { key: 'registrar_id', label: 'ثبت کننده', render: (val) => usersMap[val] || val },
        { key: 'actions', label: 'عملیات', render: (_, row) => (
            <div className="flex gap-2">
                <DSButton icon={<DSIcon name="edit" />} variant="text" onClick={() => handleOpenForm('EDIT', row)} />
                <DSButton icon={<DSIcon name="copy" />} variant="text" onClick={() => handleOpenForm('COPY', row)} />
            </div>
        )}
    ], [usersMap]);

    const renderItemRow = (item, index, isSingleMode) => (
        <React.Fragment key={index}>
            <div className={`grid gap-4 ${isSingleMode ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-[60px_minmax(150px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_80px_minmax(120px,1fr)_minmax(200px,2fr)_50px] items-end border-b pb-4'}`}>
                {isSingleMode ? (
                    <div className="col-span-full border-b pb-2 mb-2">
                        <h4 className="font-bold text-gray-700">اطلاعات قلم سند</h4>
                    </div>
                ) : (
                    <DSInput label={index === 0 ? "ردیف" : ""} type="number" value={item.row_number} onChange={e => handleRowReorder(index, e.target.value)} />
                )}

                <div className="flex flex-col gap-1">
                    {(!isSingleMode && index === 0 || isSingleMode) && <label className="text-sm text-gray-600">حساب</label>}
                    <div className="flex gap-1">
                        <DSInput value={accounts.find(a => a.id === item.account_id)?.title || ''} readOnly placeholder="انتخاب..." className="flex-1" />
                        <DSButton icon={<DSIcon name="search" />} onClick={() => openAccountLOV(index)} />
                    </div>
                </div>

                <DSSelect label={(!isSingleMode && index === 0 || isSingleMode) ? "نوع تراکنش" : ""} value={item.transaction_action} onChange={e => handleItemChange(index, 'transaction_action', e.target.value)} options={TRANSACTION_ACTIONS} />
                
                <DSSelect label={(!isSingleMode && index === 0 || isSingleMode) ? "گروه تراکنش" : ""} value={item.transaction_group} onChange={e => handleItemChange(index, 'transaction_group', e.target.value)} options={TRANSACTION_GROUPS} />
                
                <div className="flex flex-col">
                    {item.transaction_group === 'COST' && <DSSelect label={(!isSingleMode && index === 0 || isSingleMode) ? "نوع هزینه" : ""} value={item.cost_type_id} onChange={e => handleItemChange(index, 'cost_type_id', e.target.value)} options={costTypes.map(c => ({ value: c.id, label: c.title }))} />}
                    {item.transaction_group === 'INCOME' && <DSSelect label={(!isSingleMode && index === 0 || isSingleMode) ? "نوع درآمد" : ""} value={item.income_type_id} onChange={e => handleItemChange(index, 'income_type_id', e.target.value)} options={incomeTypes.map(c => ({ value: c.id, label: c.title }))} />}
                    {['BALANCE', 'OTHER'].includes(item.transaction_group) && <div className="h-10 w-full bg-gray-50 rounded border border-gray-200 opacity-50"></div>}
                </div>

                <DSInput label={(!isSingleMode && index === 0 || isSingleMode) ? "ارز" : ""} value={item.currency} readOnly />
                
                <DSInput label={(!isSingleMode && index === 0 || isSingleMode) ? "مبلغ" : ""} type="number" value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} />
                
                <DSInput label={(!isSingleMode && index === 0 || isSingleMode) ? "شرح" : ""} value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} required className={isSingleMode ? "md:col-span-2" : ""} />

                {!isSingleMode && (
                    <div className="flex items-center justify-center h-10">
                        {itemsData.length > 1 && <DSButton variant="danger" icon={<DSIcon name="trash" />} onClick={() => removeItem(index)} />}
                    </div>
                )}
            </div>
        </React.Fragment>
    );

    return (
        <div className="w-full flex flex-col gap-4 p-4">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <DSButton onClick={() => handleOpenForm('CREATE')} icon={<DSIcon name="plus" />}>ثبت سند جدید</DSButton>
                    <DSSelect value={viewMode} onChange={e => setViewMode(e.target.value)} options={[
                        { value: 'ALL', label: 'همه اسناد' },
                        { value: 'MINE', label: 'اسناد من' }
                    ]} className="w-48" />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <DSButton variant="secondary" icon={<DSIcon name="download" />} onClick={() => DSAlert.info('دانلود نمونه فایل در حال توسعه است')}>دانلود نمونه</DSButton>
                    <DSButton variant="secondary" icon={<DSIcon name="upload" />} onClick={() => DSAlert.info('ایمپورت در حال توسعه است')}>ایمپورت</DSButton>
                    <DSButton variant="secondary" icon={<DSIcon name="download" />} onClick={() => DSAlert.info('اکسپورت در حال توسعه است')}>اکسپورت</DSButton>
                    <DSButton variant="outline" onClick={() => handleBulkStatusChange('TEMPORARY')} disabled={!selectedRows.length}>تغییر به موقت</DSButton>
                    <DSButton variant="outline" onClick={() => handleBulkStatusChange('DRAFT')} disabled={!selectedRows.length}>تغییر به یادداشت</DSButton>
                    <DSButton variant="danger" icon={<DSIcon name="trash" />} onClick={handleBulkDelete} disabled={!selectedRows.length}>حذف گروهی</DSButton>
                </div>
            </div>

            <DSGrid
                data={transactions}
                columns={columns}
                loading={loading}
                selectable={true}
                onSelectionChange={setSelectedRows}
                advancedSearch={true}
                pagination={true}
            />

            {formMode && (
                <DSModal title={formMode === 'CREATE' ? 'ثبت تراکنش جدید' : formMode === 'EDIT' ? 'ویرایش تراکنش' : 'کپی تراکنش'} onClose={handleCloseForm} size="2xl">
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-end gap-2 border-b pb-2">
                            <DSButton variant={entryMode === 'SINGLE' ? 'primary' : 'outline'} onClick={() => {
                                setEntryMode('SINGLE');
                                setItemsData(itemsData.slice(0, 1));
                            }}>تک سطری</DSButton>
                            <DSButton variant={entryMode === 'MULTI' ? 'primary' : 'outline'} onClick={() => {
                                setEntryMode('MULTI');
                            }}>چند سطری</DSButton>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h4 className="col-span-full font-bold text-gray-700 border-b pb-2 mb-2">اطلاعات سربرگ</h4>
                            <DSInput label="کد سند" value={headerData.document_code || ''} readOnly placeholder="تولید خودکار" />
                            <DSInput label="کد عطف" value={headerData.reference_code || ''} readOnly placeholder="سیستمی" />
                            <DSInput label="شماره روزانه" value={headerData.daily_number || ''} readOnly placeholder="سیستمی" />
                            <DSDatePicker label="تاریخ سند" value={headerData.document_date || ''} onChange={val => setHeaderData({...headerData, document_date: val})} />
                            
                            <DSInput label="تاریخ ثبت" value={headerData.registered_at ? new Date(headerData.registered_at).toLocaleString('fa-IR') : ''} readOnly dir="ltr" />
                            <DSInput label="ثبت کننده" value={formMode === 'EDIT' && headerData.registrar_id ? (usersMap[headerData.registrar_id] || '') : registrarDisplayName} readOnly />
                            <DSSelect label="نوع تراکنش" value={headerData.transaction_type || 'GENERAL'} onChange={e => setHeaderData({...headerData, transaction_type: e.target.value})} options={TRANSACTION_TYPES} />
                            <DSSelect label="دپارتمان ثبت کننده" value={headerData.department_id || ''} disabled options={departments.map(d => ({ value: d.id, label: d.title }))} />
                            
                            <DSSelect label="وضعیت" value={headerData.status || 'DRAFT'} onChange={e => setHeaderData({...headerData, status: e.target.value})} options={[
                                { value: 'DRAFT', label: 'یادداشت' }, { value: 'TEMPORARY', label: 'موقت' }
                            ]} className="md:col-span-1" />
                            <DSInput label="شرح تراکنش (سربرگ)" value={headerData.description || ''} onChange={e => setHeaderData({...headerData, description: e.target.value})} className="md:col-span-3" />
                        </div>

                        <div className="flex flex-col gap-4">
                            {entryMode === 'MULTI' && (
                                <div className="flex justify-between items-center bg-gray-100 p-3 rounded">
                                    <h3 className="font-bold text-gray-700">اقلام سند</h3>
                                    <DSButton variant="secondary" size="sm" onClick={addItem} icon={<DSIcon name="plus" />}>افزودن ردیف جدید</DSButton>
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-4 overflow-x-auto p-2">
                                {entryMode === 'SINGLE' ? renderItemRow(itemsData[0], 0, true) : itemsData.map((item, index) => renderItemRow(item, index, false))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                            <DSButton variant="outline" onClick={handleCloseForm}>انصراف</DSButton>
                            <DSButton variant="primary" onClick={handleSave} loading={loading}>ثبت نهایی سند</DSButton>
                        </div>
                    </div>
                </DSModal>
            )}

            {showAccountLOV && (
                <DSModal title="جستجو و انتخاب حساب" onClose={() => { setShowAccountLOV(false); setCurrentRowIndex(null); }} size="lg">
                    <DSGrid
                        data={accounts}
                        columns={[
                            { key: 'code', label: 'کد حساب', sortable: true },
                            { key: 'title', label: 'عنوان حساب', sortable: true },
                            { key: 'currency', label: 'نوع ارز', sortable: true },
                            { key: 'select', label: 'انتخاب', render: (_, row) => <DSButton size="sm" onClick={() => selectAccount(row)}>انتخاب این حساب</DSButton> }
                        ]}
                        pagination={true}
                        advancedSearch={true}
                    />
                </DSModal>
            )}
        </div>
    );
};
