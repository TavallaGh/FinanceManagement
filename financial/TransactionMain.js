/* Filename: financial/TransactionMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    FileText = FallbackIcon, Plus = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon,
    Copy = FallbackIcon, AlertTriangle = FallbackIcon, X = FallbackIcon, ChevronUp = FallbackIcon, ChevronDown = FallbackIcon,
    List = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  
  const Core = window.DSCore || DS || {};
  const { Button = FallbackComponent, PageHeader = FallbackComponent, EmptyState = FallbackComponent, Badge = FallbackComponent } = Core;

  const Forms = window.DSForms || DS || {};
  const { TextField = FallbackComponent, SelectField = FallbackComponent, DatePicker = FallbackComponent } = Forms;

  const Grid = window.DSGrid || DS || {};
  const { DataGrid = FallbackComponent, AdvancedFilter = FallbackComponent, LOVField = FallbackComponent } = Grid;

  const Feedback = window.DSFeedback || DS || {};
  const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

  function FallbackComponent() { return null; }

  const TransactionMain = ({ language = 'fa', formCode = 'TRANSACTIONS' }) => {
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

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    
    const [transactions, setTransactions] = useState([]);
    const [gridState, setGridState] = useState(null);
    const [filters, setFilters] = useState({});
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState('CREATE');
    const [headerData, setHeaderData] = useState({});
    const [itemsData, setItemsData] = useState([]);
    const [inlineItemEdit, setInlineItemEdit] = useState(null);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    const [lookups, setLookups] = useState({
        accounts: [],
        leafAccounts: [],
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
            const [accRes, costRes, incRes, usersRes, personnelRes, nodesRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa, title_en').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa, title_en').eq('is_active', true),
                supabase.from('sec_users').select('id, full_name, username, party_id'),
                supabase.from('fm_org_chart_personnel').select('node_id, person_id'),
                supabase.from('fm_org_chart_nodes').select('id, title')
            ]);
            
            const uMap = {};
            let myDeptId = '';
            let myDeptTitle = '';

            (usersRes.data || []).forEach(u => {
                uMap[u.id] = `${u.full_name || u.username || ''}`.trim();
                
                if (u.id === currentUserId && u.party_id) {
                    const personnelRecord = (personnelRes.data || []).find(p => p.person_id === u.party_id);
                    if (personnelRecord) {
                        const nodeRecord = (nodesRes.data || []).find(n => n.id === personnelRecord.node_id);
                        if (nodeRecord) {
                            myDeptId = nodeRecord.id;
                            myDeptTitle = nodeRecord.title;
                        }
                    }
                }
            });

            const parentIds = new Set((accRes.data || []).map(a => a.parent_id).filter(Boolean));
            const leafAccs = (accRes.data || []).filter(a => !parentIds.has(a.id)).map(a => ({
                ...a,
                displayLabel: `${a.code} - ${a.title_fa}`
            }));

            setLookups({
                accounts: accRes.data || [],
                leafAccounts: leafAccs,
                costTypes: costRes.data || [],
                incomeTypes: incRes.data || [],
                usersMap: uMap,
                currentUserDeptId: myDeptId,
                currentUserDeptTitle: myDeptTitle
            });
        } catch (error) {
            showToast(t('خطا در دریافت اطلاعات پایه', 'Error fetching dependencies'), 'error');
            console.error(error);
        } finally {
            isFetchingDeps.current = false;
        }
    }, [supabase, showToast, t, currentUserId]);

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
            console.error(error);
        } finally {
            setIsLoading(false);
            isFetchingData.current = false;
        }
    }, [supabase, showToast, t]);

    useEffect(() => {
        if (access.canView) {
            fetchDependencies();
            fetchData();
        }
    }, [fetchDependencies, fetchData, access.canView]);

    const generateDocumentCode = () => {
        return `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    };

    const handleOpenForm = (mode, record = null) => {
        setFormMode(mode);
        const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '/');
        setInlineItemEdit(null);
        setIsHeaderCollapsed(false);

        if (mode === 'CREATE') {
            setHeaderData({
                document_code: generateDocumentCode(),
                document_date: todayStr,
                transaction_type: 'GENERAL',
                department_id: lookups.currentUserDeptId,
                department_title: lookups.currentUserDeptTitle,
                description: '',
                status: 'DRAFT',
                registered_at: new Date().toISOString()
            });
            setItemsData([]);
        } else if (mode === 'EDIT' || mode === 'COPY') {
            const parsedDate = record.document_date ? record.document_date.replace(/-/g, '/') : todayStr;
            
            setHeaderData({
                ...record,
                id: mode === 'COPY' ? undefined : record.id,
                document_code: mode === 'COPY' ? generateDocumentCode() : record.document_code,
                status: mode === 'COPY' ? 'DRAFT' : record.status,
                reference_code: mode === 'COPY' ? '' : record.reference_code,
                daily_number: mode === 'COPY' ? '' : record.daily_number,
                document_date: parsedDate,
                registered_at: mode === 'COPY' ? new Date().toISOString() : record.registered_at,
                department_id: mode === 'COPY' ? lookups.currentUserDeptId : record.department_id,
                department_title: mode === 'COPY' ? lookups.currentUserDeptTitle : ''
            });
            
            const mappedItems = (record.fm_transaction_items || []).map(item => ({
                ...item,
                _tempId: crypto.randomUUID(),
                id: mode === 'COPY' ? undefined : item.id,
                transaction_id: mode === 'COPY' ? undefined : item.transaction_id
            })).sort((a, b) => a.row_number - b.row_number);
            
            setItemsData(mappedItems);
        }
        setIsFormModalOpen(true);
    };

    const handleSaveTransaction = async () => {
        if (inlineItemEdit) {
            return showToast(t('لطفاً ابتدا تغییرات سطر باز را ذخیره یا لغو کنید.', 'Please save or cancel inline edits first.'), 'warning');
        }

        if (!headerData.document_date || !headerData.transaction_type) {
            return showToast(t('تکمیل فیلدهای اجباری سربرگ الزامی است.', 'Header required fields missing.'), 'warning');
        }
        
        if (itemsData.length === 0) {
            return showToast(t('سند باید حداقل یک قلم داشته باشد.', 'Document must have at least one item.'), 'warning');
        }

        setIsLoading(true);
        try {
            let txId = headerData.id;
            const txPayload = {
                document_code: headerData.document_code,
                document_date: headerData.document_date.replace(/\//g, '-'),
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
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItemClick = () => {
        if (inlineItemEdit) return;
        setInlineItemEdit({
            id: 'new',
            data: { 
                account_id: '', account_obj: null, transaction_action: 'DEPOSIT', transaction_group: 'COST',
                cost_type_id: '', income_type_id: '', currency: '', amount: '', description: ''
            }
        });
    };

    const handleEditItemClick = (row) => {
        if (inlineItemEdit) return;
        const accObj = lookups.leafAccounts.find(a => String(a.id) === String(row.account_id)) || null;
        setInlineItemEdit({
            id: row._tempId || row.id,
            data: {
                ...row,
                account_obj: accObj
            }
        });
    };

    const handleSaveItemInline = () => {
        const form = inlineItemEdit.data;
        if (!form.account_id || !form.amount || !form.description) {
            showToast(t('حساب، مبلغ و شرح اجباری هستند.', 'Account, Amount, and Description are required.'), 'warning');
            return;
        }

        if (inlineItemEdit.id === 'new') {
            setItemsData([...itemsData, { ...form, _tempId: crypto.randomUUID(), row_number: itemsData.length + 1 }]);
        } else {
            setItemsData(itemsData.map(item => (item._tempId === inlineItemEdit.id || item.id === inlineItemEdit.id) ? { ...item, ...form } : item));
        }
        setInlineItemEdit(null);
    };

    const handleRemoveItem = (row) => {
        const newItems = itemsData.filter(item => item._tempId !== row._tempId && item.id !== row.id);
        const reordered = newItems.map((item, idx) => ({ ...item, row_number: idx + 1 }));
        setItemsData(reordered);
    };

    const executeDelete = async () => {
        setIsLoading(true);
        try {
            if (deleteConfirm.type === 'single') {
                const { error } = await supabase.from('fm_transactions').delete().eq('id', deleteConfirm.data.id);
                if (error) throw error;
                await logAction('delete_transaction', `حذف تراکنش: ${deleteConfirm.data.document_code}`);
            } else if (deleteConfirm.type === 'bulk') {
                const { error } = await supabase.from('fm_transactions').delete().in('id', deleteConfirm.data);
                if (error) throw error;
                await logAction('bulk_delete_transactions', `حذف گروهی ${deleteConfirm.data.length} تراکنش`);
            }
            showToast(t('عملیات با موفقیت انجام شد.', 'Operation successful.'));
            fetchData();
            setDeleteConfirm({ isOpen: false, type: null, data: null });
        } catch (error) {
            showToast(t('خطا در حذف.', 'Error deleting.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkStatusChange = async (newStatus, ids) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.from('fm_transactions').update({ status: newStatus }).in('id', ids);
            if (error) throw error;
            showToast(t('وضعیت با موفقیت تغییر کرد.', 'Status updated.'));
            await logAction('bulk_status_update', `تغییر وضعیت ${ids.length} سند به ${newStatus}`);
            fetchData();
        } catch (error) {
            showToast(t('خطا در تغییر وضعیت.', 'Error updating status.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const columns = useMemo(() => [
        { field: 'reference_code', header_fa: 'کد عطف', header_en: 'Ref Code', width: '100px', render: (val) => <span className="font-bold text-slate-700 dark:text-slate-300">{val || '-'}</span> },
        { field: 'document_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '140px', render: (val) => <span className="text-indigo-600 dark:text-indigo-400 font-bold">{val}</span> },
        { field: 'daily_number', header_fa: 'شماره روزانه', header_en: 'Daily Num', width: '100px' },
        { field: 'document_date', header_fa: 'تاریخ سند', header_en: 'Date', width: '120px', type: 'date' },
        { field: 'transaction_type', header_fa: 'نوع تراکنش', header_en: 'Type', width: '120px', render: (val) => TRANSACTION_TYPES.find(x => x.value === val)?.label || val },
        { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '100px', render: (val) => {
            const s = STATUS_OPTIONS.find(x => x.value === val);
            const colors = { DRAFT: 'slate', TEMPORARY: 'amber', APPROVED: 'emerald' };
            return <Badge variant={colors[val] || 'gray'} size="sm">{s ? s.label : val}</Badge>;
        }},
        { field: 'registrar_id', header_fa: 'ثبت کننده', header_en: 'Registrar', width: '180px', render: (val) => lookups.usersMap[val] || val }
    ], [lookups.usersMap, t]);

    const filterFields = [
        { name: 'document_code', label: t('کد سند', 'Doc Code'), type: 'text' },
        { name: 'document_date', label: t('تاریخ سند', 'Date'), type: 'date' },
        { name: 'transaction_type', label: t('نوع تراکنش', 'Type'), type: 'select', options: [{value: '', label: t('همه', 'All')}, ...TRANSACTION_TYPES] },
        { name: 'status', label: t('وضعیت', 'Status'), type: 'select', options: [{value: '', label: t('همه', 'All')}, ...STATUS_OPTIONS] }
    ];

    const gridActions = [
        { id: 'copy', icon: Copy, tooltip: t('کپی سند', 'Duplicate Document'), onClick: (row) => handleOpenForm('COPY', row), requiredAccess: 'create', className: 'text-emerald-600 hover:text-emerald-700' },
        { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit Document'), onClick: (row) => handleOpenForm('EDIT', row), requiredAccess: 'edit' },
        { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete Document'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
    ];

    const bulkActions = [
        { label: t('تغییر به موقت', 'Set Temporary'), icon: FileText, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('TEMPORARY', ids) },
        { label: t('تغییر به یادداشت', 'Set Draft'), icon: Edit, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('DRAFT', ids) },
        { label: t('حذف گروهی', 'Bulk Delete'), icon: Trash2, variant: 'danger-outline', requiredAccess: 'delete', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
    ];

    const accountLovColumns = [
        { field: 'code', header_fa: 'کد حساب', header_en: 'Code', width: '120px' },
        { field: 'title_fa', header_fa: 'عنوان حساب', header_en: 'Title', width: 'auto' }
    ];

    const itemGridData = useMemo(() => {
        const data = [...itemsData];
        if (inlineItemEdit && inlineItemEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineItemEdit.data });
        return data;
    }, [itemsData, inlineItemEdit]);

    const itemColumns = [
        { 
            field: 'row_number', header_fa: 'ردیف', header_en: '#', width: '60px', 
            render: (val, row) => row._isNew ? <span className="text-emerald-600 font-bold">*</span> : val 
        },
        { 
            field: 'account_id', header_fa: 'حساب', header_en: 'Account', width: '250px', 
            render: (val, row) => {
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <LOVField 
                                size="sm" formCode={formCode} data={lookups.leafAccounts} columns={accountLovColumns} dropdownWidth="min-w-[400px]"
                                displayValue={inlineItemEdit.data.account_obj ? `${inlineItemEdit.data.account_obj.code} - ${inlineItemEdit.data.account_obj.title_fa}` : ''}
                                onChange={(r) => setInlineItemEdit(prev => ({
                                    ...prev, 
                                    data: { ...prev.data, account_id: r?.id, account_obj: r, currency: r?.currency_id || 'IRR' }
                                }))}
                                isRtl={isRtl}
                            />
                        </div>
                    );
                }
                const acc = lookups.leafAccounts.find(a => String(a.id) === String(val));
                return acc ? `${acc.code} - ${acc.title_fa}` : '';
            }
        },
        { 
            field: 'transaction_action', header_fa: 'نوع', header_en: 'Action', width: '120px', 
            render: (val, row) => {
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <SelectField 
                                size="sm" options={TRANSACTION_ACTIONS} value={inlineItemEdit.data.transaction_action} 
                                onChange={(e) => setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, transaction_action: e.target.value } }))} isRtl={isRtl} 
                            />
                        </div>
                    );
                }
                return TRANSACTION_ACTIONS.find(a => a.value === val)?.label || val;
            }
        },
        { 
            field: 'transaction_group', header_fa: 'گروه', header_en: 'Group', width: '120px', 
            render: (val, row) => {
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <SelectField 
                                size="sm" options={TRANSACTION_GROUPS} value={inlineItemEdit.data.transaction_group} 
                                onChange={(e) => setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, transaction_group: e.target.value, cost_type_id: '', income_type_id: '' } }))} isRtl={isRtl} 
                            />
                        </div>
                    );
                }
                return TRANSACTION_GROUPS.find(a => a.value === val)?.label || val;
            }
        },
        { 
            field: 'sub_type', header_fa: 'نوع هزینه/درآمد', header_en: 'Sub-type', width: '150px', 
            render: (_, row) => {
                const group = inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId) ? inlineItemEdit.data.transaction_group : row.transaction_group;
                
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    if (group === 'COST') {
                        return <div onClick={(e) => e.stopPropagation()}><SelectField size="sm" options={lookups.costTypes.map(c => ({ value: c.id, label: isRtl ? c.title_fa : c.title_en }))} value={inlineItemEdit.data.cost_type_id} onChange={(e) => setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, cost_type_id: e.target.value } }))} isRtl={isRtl} /></div>;
                    }
                    if (group === 'INCOME') {
                        return <div onClick={(e) => e.stopPropagation()}><SelectField size="sm" options={lookups.incomeTypes.map(c => ({ value: c.id, label: isRtl ? c.title_fa : c.title_en }))} value={inlineItemEdit.data.income_type_id} onChange={(e) => setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, income_type_id: e.target.value } }))} isRtl={isRtl} /></div>;
                    }
                    return <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded opacity-50"></div>;
                }

                if (group === 'COST') {
                    const c = lookups.costTypes.find(x => String(x.id) === String(row.cost_type_id));
                    return c ? (isRtl ? c.title_fa : c.title_en) : '';
                }
                if (group === 'INCOME') {
                    const i = lookups.incomeTypes.find(x => String(x.id) === String(row.income_type_id));
                    return i ? (isRtl ? i.title_fa : i.title_en) : '';
                }
                return '-';
            }
        },
        { 
            field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '100px', 
            render: (val, row) => {
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    return <div onClick={(e) => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.currency} disabled isRtl={isRtl} dir="ltr" /></div>;
                }
                return <span dir="ltr">{val}</span>;
            }
        },
        { 
            field: 'amount', header_fa: 'مبلغ', header_en: 'Amount', width: '150px', 
            render: (val, row) => {
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    return <div onClick={(e) => e.stopPropagation()}><TextField size="sm" type="number" value={inlineItemEdit.data.amount} onChange={(e) => setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, amount: e.target.value } }))} isRtl={isRtl} dir="ltr" /></div>;
                }
                return <span dir="ltr">{Number(val).toLocaleString()}</span>;
            }
        },
        { 
            field: 'description', header_fa: 'شرح', header_en: 'Description', width: 'auto', 
            render: (val, row) => {
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    return <div onClick={(e) => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.description} onChange={(e) => setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))} isRtl={isRtl} /></div>;
                }
                return val;
            }
        }
    ];

    const itemActions = [
        { icon: Save, tooltip: t('ذخیره', 'Save'), hidden: (row) => !inlineItemEdit || (inlineItemEdit.id !== row.id && inlineItemEdit.id !== row._tempId), onClick: handleSaveItemInline, className: '!text-emerald-600 hover:!text-emerald-800' },
        { icon: X, tooltip: t('انصراف', 'Cancel'), hidden: (row) => !inlineItemEdit || (inlineItemEdit.id !== row.id && inlineItemEdit.id !== row._tempId), onClick: () => setInlineItemEdit(null), className: '!text-slate-500 hover:!text-slate-700' },
        { icon: Edit, tooltip: t('ویرایش', 'Edit'), hidden: (row) => inlineItemEdit?.id === row.id || inlineItemEdit?.id === row._tempId || row._isNew, onClick: handleEditItemClick, className: 'hover:text-indigo-600 text-slate-400' },
        { icon: Trash2, tooltip: t('حذف', 'Delete'), hidden: (row) => inlineItemEdit?.id === row.id || inlineItemEdit?.id === row._tempId || row._isNew, onClick: handleRemoveItem, className: 'hover:text-red-600 text-slate-400' }
    ];

    const viewConfig = useMemo(() => ({
      pageId: 'transactions_main_list',
      currentState: () => ({ filters, gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.filters) setFilters(state.filters);
          if (state.gridState) setGridState(state.gridState);
        } else {
          setFilters({});
          setGridState(null);
        }
      }
    }), [filters, gridState]);

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مدیریت تراکنش‌ها', 'Transactions Management')}
          icon={FileText} language={language}
          description={t('ثبت و پیگیری اسناد مالی چندسطری', 'Manage financial documents')}
          breadcrumbs={[{ label: t('مدیریت مالی', 'Financial Setup') }, { label: t('تراکنش‌ها', 'Transactions') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 min-h-0 flex flex-col gap-2 mt-4">
          <AdvancedFilter 
            fields={filterFields} initialValues={filters} onFilter={setFilters} onClear={() => setFilters({})} language={language} 
          />
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <DataGrid
              data={transactions} columns={columns} language={language} formCode={formCode}
              gridState={gridState} onGridStateChange={setGridState}
              onAdd={access.canCreate ? () => handleOpenForm('CREATE') : undefined}
              selectable={true} actions={gridActions} bulkActions={bulkActions} isLoading={isLoading}
            />
          </div>
        </div>

        <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={formMode === 'CREATE' ? t('ثبت تراکنش جدید', 'New Transaction') : formMode === 'EDIT' ? t('ویرایش تراکنش', 'Edit Transaction') : t('کپی تراکنش', 'Copy Transaction')} language={language} width="max-w-6xl">
          <div className="flex flex-col h-[85vh] bg-slate-50/50 dark:bg-slate-900/50 text-[12px]">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm shrink-0 transition-all duration-300">
                <div 
                    className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                    onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                >
                    <h4 className="text-[12px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-2"><FileText size={16} className="text-indigo-500" /> {t('اطلاعات سربرگ', 'Header Data')}</h4>
                    <Button variant="ghost" size="sm" icon={isHeaderCollapsed ? ChevronDown : ChevronUp} className="!p-1 h-6 w-6" />
                </div>
                {!isHeaderCollapsed && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 animate-in slide-in-from-top-2 duration-200">
                        <TextField size="sm" formCode={formCode} label={t('کد سند', 'Document Code')} value={headerData.document_code || ''} disabled isRtl={isRtl} dir="ltr" />
                        <TextField size="sm" formCode={formCode} label={t('کد عطف', 'Ref Code')} value={headerData.reference_code || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                        <TextField size="sm" formCode={formCode} label={t('شماره روزانه', 'Daily Number')} value={headerData.daily_number || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                        <DatePicker size="sm" formCode={formCode} label={t('تاریخ سند', 'Document Date')} value={headerData.document_date || ''} onChange={val => setHeaderData({...headerData, document_date: val})} isRtl={isRtl} required />
                        
                        <TextField size="sm" formCode={formCode} label={t('ثبت کننده', 'Registrar')} value={formMode === 'EDIT' && headerData.registrar_id ? (lookups.usersMap[headerData.registrar_id] || '') : `${currentUserName} (${currentUserUsername})`} disabled isRtl={isRtl} />
                        <SelectField size="sm" formCode={formCode} label={t('نوع تراکنش', 'Transaction Type')} value={headerData.transaction_type || 'GENERAL'} onChange={e => setHeaderData({...headerData, transaction_type: e.target.value})} options={TRANSACTION_TYPES} isRtl={isRtl} required />
                        <TextField size="sm" formCode={formCode} label={t('دپارتمان', 'Department')} value={headerData.department_title || lookups.currentUserDeptTitle || ''} disabled isRtl={isRtl} />
                        <SelectField size="sm" formCode={formCode} label={t('وضعیت سند', 'Document Status')} value={headerData.status || 'DRAFT'} onChange={e => setHeaderData({...headerData, status: e.target.value})} options={STATUS_OPTIONS} isRtl={isRtl} />
                        
                        <div className="md:col-span-4">
                            <TextField size="sm" formCode={formCode} label={t('شرح سربرگ', 'Header Description')} value={headerData.description || ''} onChange={e => setHeaderData({...headerData, description: e.target.value})} isRtl={isRtl} />
                        </div>
                    </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex-1 flex flex-col shadow-sm min-h-[350px]">
                <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                    <h3 className="font-bold text-[12px] text-slate-700 dark:text-slate-300 flex items-center gap-2"><List size={16} className="text-indigo-500" /> {t('اقلام سند', 'Document Items')}</h3>
                </div>
                
                <div className="flex-1 min-h-0 flex flex-col p-1">
                    <DataGrid 
                        data={itemGridData} columns={itemColumns} actions={itemActions}
                        language={language} onAdd={handleAddItemClick} hideImport={true} hideExport={true} hideToolbar={true}
                    />
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 z-50">
                <Button variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
                {access.canEdit && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveTransaction} isLoading={isLoading}>{t('ثبت نهایی سند', 'Save Document')}</Button>}
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار', 'Warning')}
            description={deleteConfirm.type === 'bulk' ? t(`آیا از حذف ${deleteConfirm.data?.length} سند اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} documents?`) : t(`آیا از حذف این سند اطمینان دارید؟`, `Delete this document?`)}
            action={
              <div className="flex gap-2 w-full mt-4 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Confirm')}</Button>
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