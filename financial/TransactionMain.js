/* Filename: financial/TransactionMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    FileText = FallbackIcon, Plus = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon,
    Copy = FallbackIcon, AlertTriangle = FallbackIcon, Search = FallbackIcon, Download = FallbackIcon, Upload = FallbackIcon
  } = LucideIcons;

  const TransactionMain = ({ language = 'fa', formCode = 'TRANSACTIONS' }) => {
    const FallbackComponent = () => null;

    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, PageHeader = FallbackComponent, EmptyState = FallbackComponent, Card = FallbackComponent, Badge = FallbackComponent } = Core;

    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, SelectField = FallbackComponent, DatePicker = FallbackComponent } = Forms;

    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent, AdvancedFilter = FallbackComponent, LOVField = FallbackComponent } = Grid;

    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

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
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

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
            const leafAccounts = (accRes.data || []).filter(a => !parentIds.has(a.id)).map(a => ({
                ...a,
                displayLabel: `${a.code} - ${a.title_fa}`
            }));

            setLookups({
                accounts: leafAccounts,
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

    const getEmptyItem = () => ({
        account_id: '', transaction_action: 'DEPOSIT', transaction_group: 'COST',
        cost_type_id: '', income_type_id: '', currency: '', amount: '', description: ''
    });

    const handleOpenForm = (mode, record = null) => {
        setFormMode(mode);
        const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '/');

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
            setItemsData([getEmptyItem()]);
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
                id: mode === 'COPY' ? undefined : item.id,
                transaction_id: mode === 'COPY' ? undefined : item.transaction_id
            })).sort((a, b) => a.row_number - b.row_number);
            
            setItemsData(mappedItems.length ? mappedItems : [getEmptyItem()]);
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

    const handleItemChange = (index, field, value) => {
        const newItems = [...itemsData];
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'transaction_group') {
            newItems[index].cost_type_id = '';
            newItems[index].income_type_id = '';
        }
        setItemsData(newItems);
    };

    const addItem = () => setItemsData([...itemsData, getEmptyItem()]);
    
    const removeItem = (index) => {
        const newItems = itemsData.filter((_, idx) => idx !== index);
        setItemsData(newItems);
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

    const filterFields = [
        { name: 'document_code', label: t('کد سند', 'Doc Code'), type: 'text' },
        { name: 'document_date', label: t('تاریخ سند', 'Date'), type: 'date' },
        { name: 'transaction_type', label: t('نوع تراکنش', 'Type'), type: 'select', options: [{value: '', label: t('همه', 'All')}, ...TRANSACTION_TYPES] },
        { name: 'status', label: t('وضعیت', 'Status'), type: 'select', options: [{value: '', label: t('همه', 'All')}, ...STATUS_OPTIONS] }
    ];

    const gridActions = [
        { id: 'copy', icon: Copy, tooltip: t('کپی سند', 'Duplicate Document'), onClick: (row) => handleOpenForm('COPY', row), requiredAccess: 'create', className: 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300' },
        { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit Document'), onClick: (row) => handleOpenForm('EDIT', row), requiredAccess: 'edit' },
        { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete Document'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
    ];

    const bulkActions = [
        { label: t('تغییر به موقت', 'Set Temporary'), icon: FileText, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('TEMPORARY', ids) },
        { label: t('تغییر به یادداشت', 'Set Draft'), icon: Edit, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('DRAFT', ids) },
        { label: t('حذف گروهی', 'Bulk Delete'), icon: Trash2, variant: 'danger-outline', requiredAccess: 'delete', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
    ];

    const accountLovColumns = [
        { field: 'code', header_fa: 'کد حساب', header_en: 'Code', width: '100px' },
        { field: 'title_fa', header_fa: 'عنوان حساب', header_en: 'Title', width: '200px' }
    ];

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مدیریت تراکنش‌ها', 'Transactions Management')}
          icon={FileText} language={language}
          description={t('ثبت و پیگیری اسناد مالی چندسطری', 'Manage financial documents and multi-row records')}
          breadcrumbs={[{ label: t('مدیریت مالی', 'Financial Setup') }, { label: t('تراکنش‌ها', 'Transactions') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 min-h-0 flex flex-col gap-1 mt-2 animate-in fade-in duration-500">
          <AdvancedFilter 
            fields={filterFields} 
            initialValues={filters} 
            onFilter={setFilters} 
            onClear={() => setFilters({})} 
            language={language} 
          />
          <div className="flex-1 min-h-0">
            <DataGrid
              data={transactions} columns={columns} language={language} formCode={formCode}
              gridState={gridState} onGridStateChange={setGridState}
              onAdd={access.canCreate ? () => handleOpenForm('CREATE') : undefined}
              onRowDoubleClick={access.canEdit ? (row) => handleOpenForm('EDIT', row) : undefined}
              selectable={true}
              actions={gridActions}
              bulkActions={bulkActions}
              isLoading={isLoading}
            />
          </div>
        </div>

        <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={formMode === 'CREATE' ? t('ثبت تراکنش جدید', 'New Transaction') : formMode === 'EDIT' ? t('ویرایش تراکنش', 'Edit Transaction') : t('کپی تراکنش', 'Copy Transaction')} language={language} width="max-w-6xl">
          <div className="flex flex-col h-[85vh] bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
              
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm shrink-0">
                <h4 className="text-[12px] font-black text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50 pb-2 mb-3">{t('اطلاعات سربرگ', 'Header Data')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    <TextField size="xs" formCode={formCode} label={t('کد سند', 'Document Code')} value={headerData.document_code || ''} disabled isRtl={isRtl} dir="ltr" />
                    <TextField size="xs" formCode={formCode} label={t('کد عطف', 'Ref Code')} value={headerData.reference_code || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                    <TextField size="xs" formCode={formCode} label={t('شماره روزانه', 'Daily Number')} value={headerData.daily_number || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                    <DatePicker size="xs" formCode={formCode} label={t('تاریخ سند', 'Document Date')} value={headerData.document_date || ''} onChange={val => setHeaderData({...headerData, document_date: val})} isRtl={isRtl} required />
                    <TextField size="xs" formCode={formCode} label={t('ثبت کننده', 'Registrar')} value={formMode === 'EDIT' && headerData.registrar_id ? (lookups.usersMap[headerData.registrar_id] || '') : `${currentUserName} (${currentUserUsername})`} disabled isRtl={isRtl} />
                    
                    <SelectField size="xs" formCode={formCode} label={t('نوع تراکنش', 'Transaction Type')} value={headerData.transaction_type || 'GENERAL'} onChange={e => setHeaderData({...headerData, transaction_type: e.target.value})} options={TRANSACTION_TYPES} isRtl={isRtl} required />
                    <TextField size="xs" formCode={formCode} label={t('دپارتمان', 'Department')} value={headerData.department_title || lookups.currentUserDeptTitle || ''} disabled isRtl={isRtl} />
                    <SelectField size="xs" formCode={formCode} label={t('وضعیت سند', 'Document Status')} value={headerData.status || 'DRAFT'} onChange={e => setHeaderData({...headerData, status: e.target.value})} options={STATUS_OPTIONS} isRtl={isRtl} />
                    <div className="md:col-span-2 lg:col-span-2">
                        <TextField size="xs" formCode={formCode} label={t('شرح سربرگ', 'Header Description')} value={headerData.description || ''} onChange={e => setHeaderData({...headerData, description: e.target.value})} isRtl={isRtl} />
                    </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex-1 flex flex-col shadow-sm min-h-[300px]">
                <div className="flex justify-between items-center p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                    <h3 className="font-black text-[12px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><FileText size={14} className="text-indigo-500" /> {t('اقلام سند', 'Document Items')}</h3>
                    <Button variant="primary" size="xs" onClick={addItem} icon={Plus} className="shadow-sm">{t('افزودن سطر', 'Add Row')}</Button>
                </div>
                
                <div className="flex-1 overflow-x-auto overflow-y-visible pb-16">
                    <div className="min-w-[1000px] flex flex-col">
                        <div className="flex items-center gap-2 px-2 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-[11px] font-black text-slate-500 dark:text-slate-400 sticky top-0 z-20">
                            <div className="w-8 text-center shrink-0">{t('ردیف', '#')}</div>
                            <div className="flex-1 min-w-[200px] shrink-0">{t('حساب', 'Account')} <span className="text-red-500">*</span></div>
                            <div className="w-24 shrink-0">{t('نوع', 'Action')}</div>
                            <div className="w-24 shrink-0">{t('گروه', 'Group')}</div>
                            <div className="w-36 shrink-0">{t('نوع هزینه/درآمد', 'Sub-type')}</div>
                            <div className="w-16 shrink-0">{t('ارز', 'Currency')}</div>
                            <div className="w-32 shrink-0">{t('مبلغ', 'Amount')} <span className="text-red-500">*</span></div>
                            <div className="flex-1 min-w-[200px] shrink-0">{t('شرح', 'Description')} <span className="text-red-500">*</span></div>
                            <div className="w-8 shrink-0"></div>
                        </div>

                        <div className="flex flex-col z-10">
                            {itemsData.map((item, index) => (
                                <div key={index} className="flex items-start gap-2 px-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                    <div className="w-8 flex items-center justify-center h-6 text-[11px] font-black text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">{index + 1}</div>
                                    <div className="flex-1 min-w-[200px] shrink-0">
                                        <LOVField 
                                            size="xs" formCode={formCode} data={lookups.accounts} columns={accountLovColumns} dropdownWidth="min-w-[250px]"
                                            displayValue={lookups.accounts.find(a => String(a.id) === String(item.account_id))?.displayLabel || ''}
                                            onChange={(row) => {
                                                handleItemChange(index, 'account_id', row ? row.id : '');
                                                handleItemChange(index, 'currency', row ? (row.currency_id || 'IRR') : '');
                                            }}
                                            isRtl={isRtl}
                                        />
                                    </div>
                                    <div className="w-24 shrink-0">
                                        <SelectField size="xs" formCode={formCode} value={item.transaction_action} onChange={e => handleItemChange(index, 'transaction_action', e.target.value)} options={TRANSACTION_ACTIONS} isRtl={isRtl} />
                                    </div>
                                    <div className="w-24 shrink-0">
                                        <SelectField size="xs" formCode={formCode} value={item.transaction_group} onChange={e => handleItemChange(index, 'transaction_group', e.target.value)} options={TRANSACTION_GROUPS} isRtl={isRtl} />
                                    </div>
                                    <div className="w-36 shrink-0">
                                        {item.transaction_group === 'COST' ? (
                                            <SelectField size="xs" formCode={formCode} value={item.cost_type_id} onChange={e => handleItemChange(index, 'cost_type_id', e.target.value)} options={lookups.costTypes.map(c => ({ value: c.id, label: isRtl ? c.title_fa : c.title_en }))} isRtl={isRtl} />
                                        ) : item.transaction_group === 'INCOME' ? (
                                            <SelectField size="xs" formCode={formCode} value={item.income_type_id} onChange={e => handleItemChange(index, 'income_type_id', e.target.value)} options={lookups.incomeTypes.map(c => ({ value: c.id, label: isRtl ? c.title_fa : c.title_en }))} isRtl={isRtl} />
                                        ) : (
                                            <div className="h-6 w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700"></div>
                                        )}
                                    </div>
                                    <div className="w-16 shrink-0">
                                        <TextField size="xs" formCode={formCode} value={item.currency} disabled isRtl={isRtl} dir="ltr" />
                                    </div>
                                    <div className="w-32 shrink-0">
                                        <TextField size="xs" type="number" formCode={formCode} value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} isRtl={isRtl} dir="ltr" />
                                    </div>
                                    <div className="flex-1 min-w-[200px] shrink-0">
                                        <TextField size="xs" formCode={formCode} value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} isRtl={isRtl} />
                                    </div>
                                    <div className="w-8 flex items-center justify-center shrink-0 mt-0.5">
                                        <Button variant="ghost" size="xs" icon={Trash2} className="!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/30 !px-0 !w-6 !h-6" onClick={() => removeItem(index)} />
                                    </div>
                                </div>
                            ))}
                            {itemsData.length === 0 && (
                                <div className="p-8 text-center text-[12px] font-bold text-slate-400 dark:text-slate-500">{t('هیچ قلمی وارد نشده است.', 'No items entered.')}</div>
                            )}
                        </div>
                    </div>
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
              <div className="flex gap-2 w-full mt-2 px-4">
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