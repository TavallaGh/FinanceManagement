/* Filename: financial/TransactionMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    FileText = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon,
    Copy = FallbackIcon, AlertTriangle = FallbackIcon, Paperclip = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const { Button = FallbackComponent, PageHeader = FallbackComponent, EmptyState = FallbackComponent, Badge = FallbackComponent } = Core;

  const Grid = window.DSGrid || DS || {};
  const { DataGrid = FallbackComponent, AdvancedFilter = FallbackComponent } = Grid;

  const Forms = window.DSForms || DS || {};
  const { AttachmentManager = FallbackComponent } = Forms;

  const Feedback = window.DSFeedback || DS || {};
  const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

  function FallbackComponent() { return null; }

  const TransactionMain = ({ language = 'fa', formCode = 'TRANSACTIONS' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const supabase = window.supabase;
    const currentUserObj = window.NavigationSystem?.currentUser || {};
    const currentUserId = currentUserObj.id || null;
    const currentUserName = currentUserObj.name || currentUserObj.username || 'مدیر سیستم';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
      return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const TRANSACTION_TYPES = [
        { value: 'OPENING', label: t('سند افتتاحیه', 'Opening') },
        { value: 'CLOSING', label: t('سند اختتامیه', 'Closing') },
        { value: 'GENERAL', label: t('عمومی', 'General') },
        { value: 'TRANSFER', label: t('سند انتقال', 'Transfer') }
    ];

    const TRANSACTION_ACTIONS = [
        { value: 'DEPOSIT', label: t('واریز', 'Deposit') },
        { value: 'WITHDRAWAL', label: t('برداشت', 'Withdrawal') }
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
    const [attachmentCounts, setAttachmentCounts] = useState({});
    const [gridState, setGridState] = useState(null);
    const [filters, setFilters] = useState({});
    const [usersMap, setUsersMap] = useState({});
    const [lookups, setLookups] = useState({ accounts: [], costTypes: [], incomeTypes: [] });
    const [resolvedUserId, setResolvedUserId] = useState(currentUserId);
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState('CREATE');
    const [currentRecord, setCurrentRecord] = useState(null);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    const [attachModal, setAttachModal] = useState({ isOpen: false, record: null, files: [] });
    const [isUploading, setIsUploading] = useState(false);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (action, recordId, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: 'تراکنش‌ها',
          record_id: String(recordId || 'SYSTEM'),
          action: action,
          user_name: currentUserName,
          details: details
        }]);
      } catch (err) {}
    }, [supabase, currentUserName]);

    const fetchUsers = useCallback(async () => {
        try {
            const { data } = await supabase.from('sec_users').select('id, full_name, username');
            const uMap = {};
            (data || []).forEach(u => {
                uMap[u.id] = `${u.full_name || u.username || ''}`.trim();
            });
            setUsersMap(uMap);

            let myId = currentUserId;
            if (!myId || myId === '00000000-0000-0000-0000-000000000000') {
                const me = (data || []).find(u => u.username === (currentUserObj.username || 'admin') || u.full_name === currentUserName);
                if (me) myId = me.id;
            }
            setResolvedUserId(myId);

        } catch (error) {}
    }, [supabase, currentUserId, currentUserObj.username, currentUserName]);

    const fetchLookups = useCallback(async () => {
        try {
            const [accRes, chartRes, costRes, incRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, code, parent_id, chart_id').eq('is_active', true),
                supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa, code, parent_id').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa, code, parent_id').eq('is_active', true)
            ]);

            const activeCharts = chartRes.data || [];
            const activeChartIds = new Set(activeCharts.map(c => c.id));

            const buildPathsAndFilterLeafs = (items, charts = null) => {
                const parentIds = new Set(items.map(i => i.parent_id).filter(Boolean));
                return items.filter(i => {
                    if (parentIds.has(i.id)) return false; 
                    if (charts && !activeChartIds.has(i.chart_id)) return false; 
                    return true;
                }).map(i => {
                    let pathArr = [i.title_fa || i.title]; 
                    let curr = i;
                    while (curr && curr.parent_id) {
                        const parent = items.find(p => p.id === curr.parent_id);
                        if (parent) {
                            pathArr.unshift(parent.title_fa || parent.title);
                            curr = parent;
                        } else break;
                    }
                    return {
                        ...i,
                        pathTitle: pathArr.join(' / '),
                        chart_name: charts ? (charts.find(c => c.id === i.chart_id)?.title || '') : ''
                    };
                });
            };

            setLookups({
                accounts: buildPathsAndFilterLeafs(accRes.data || [], activeCharts),
                costTypes: buildPathsAndFilterLeafs(costRes.data || []),
                incomeTypes: buildPathsAndFilterLeafs(incRes.data || [])
            });
        } catch (err) {}
    }, [supabase]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [{ data: txData, error: txError }, { data: attData }] = await Promise.all([
                supabase.from('fm_transactions').select('*, fm_transaction_items(*)').order('created_at', { ascending: false }),
                supabase.from('fm_attachments').select('entity_id').eq('entity_type', 'TRANSACTION')
            ]);
            
            if (txError) throw txError;
            setTransactions(txData || []);

            const counts = {};
            (attData || []).forEach(att => {
                counts[att.entity_id] = (counts[att.entity_id] || 0) + 1;
            });
            setAttachmentCounts(counts);

        } catch (error) {
            showToast(t('خطا در دریافت لیست تراکنش‌ها', 'Error fetching transactions'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, t]);

    useEffect(() => {
        if (access.canView) {
            fetchUsers();
            fetchLookups();
            fetchData();
        }
    }, [fetchUsers, fetchLookups, fetchData, access.canView]);

    const handleOpenForm = (mode, record = null) => {
        setFormMode(mode);
        setCurrentRecord(record);
        setIsFormModalOpen(true);
    };

    const handleModalSuccess = () => {
        setIsFormModalOpen(false);
        fetchData();
    };

    const executeDelete = async () => {
        setIsLoading(true);
        try {
            if (deleteConfirm.type === 'single') {
                const { error } = await supabase.from('fm_transactions').delete().eq('id', deleteConfirm.data.id);
                if (error) throw error;
                await logAction('delete_transaction', deleteConfirm.data.id, `حذف تراکنش: ${deleteConfirm.data.document_code}`);
            } else if (deleteConfirm.type === 'bulk') {
                const { error } = await supabase.from('fm_transactions').delete().in('id', deleteConfirm.data);
                if (error) throw error;
                await logAction('bulk_delete_transactions', 'BULK_DELETE', `حذف گروهی ${deleteConfirm.data.length} تراکنش`);
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
            await logAction('bulk_status_update', 'BULK_UPDATE', `تغییر وضعیت ${ids.length} سند به ${newStatus}`);
            fetchData();
        } catch (error) {
            showToast(t('خطا در تغییر وضعیت.', 'Error updating status.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadAttachments = async (recordId) => {
        try {
            const { data } = await supabase.from('fm_attachments').select('*').eq('entity_type', 'TRANSACTION').eq('entity_id', recordId);
            setAttachModal(prev => ({ ...prev, files: data || [] }));
        } catch (err) {}
    };

    const openAttachments = (record) => {
        setAttachModal({ isOpen: true, record, files: [] });
        loadAttachments(record.id);
    };

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0 || !attachModal.record) return;
        const file = files[0];

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${attachModal.record.id}_${Date.now()}.${fileExt}`;
            const filePath = `transactions/${fileName}`;

            let fileUrl = '';
            
            if (supabase.storage) {
                const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath);
                fileUrl = urlData.publicUrl;
            } else {
                fileUrl = URL.createObjectURL(file); 
            }

            const payload = {
                entity_type: 'TRANSACTION',
                entity_id: attachModal.record.id,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type || 'application/octet-stream',
                file_url: fileUrl,
                created_by: resolvedUserId
            };

            const { error } = await supabase.from('fm_attachments').insert([payload]);
            if (error) throw error;

            showToast(t('فایل با موفقیت پیوست شد.', 'File attached successfully.'));
            loadAttachments(attachModal.record.id);
            fetchData();
        } catch (error) {
            showToast(t('خطا در آپلود فایل.', 'Error uploading file.'), 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (file) => {
        try {
            const { error } = await supabase.from('fm_attachments').delete().eq('id', file.id);
            if (error) throw error;
            showToast(t('پیوست حذف شد.', 'Attachment deleted.'));
            loadAttachments(attachModal.record.id);
            fetchData();
        } catch (error) {
            showToast(t('خطا در حذف پیوست.', 'Error deleting attachment.'), 'error');
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            if (filters.my_docs && String(tx.registrar_id) !== String(resolvedUserId)) return false;
            if (filters.status && tx.status !== filters.status) return false;

            if (filters.account_id || filters.transaction_action || filters.transaction_group || filters.cost_type_id || filters.income_type_id) {
                const hasMatchingItem = (tx.fm_transaction_items || []).some(item => {
                    if (filters.account_id && item.account_id !== filters.account_id.id) return false;
                    if (filters.transaction_action && item.transaction_action !== filters.transaction_action) return false;
                    if (filters.transaction_group && item.transaction_group !== filters.transaction_group) return false;
                    if (filters.cost_type_id && item.cost_type_id !== filters.cost_type_id.id) return false;
                    if (filters.income_type_id && item.income_type_id !== filters.income_type_id.id) return false;
                    return true;
                });
                if (!hasMatchingItem) return false;
            }
            return true;
        });
    }, [transactions, filters, resolvedUserId]);

    const columns = useMemo(() => [
        { field: 'reference_code', header_fa: 'کد عطف', header_en: 'Ref Code', width: '90px', render: (val) => <span className="font-bold text-slate-700 dark:text-slate-300">{val || '-'}</span> },
        { field: 'document_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '130px', render: (val) => <span className="text-indigo-600 dark:text-indigo-400 font-bold">{val}</span> },
        { field: 'daily_number', header_fa: 'شماره روزانه', header_en: 'Daily Num', width: '90px' },
        { field: 'document_date', header_fa: 'تاریخ سند', header_en: 'Date', width: '110px', type: 'date' },
        { field: 'transaction_type', header_fa: 'نوع تراکنش', header_en: 'Type', width: '110px', render: (val) => TRANSACTION_TYPES.find(x => x.value === val)?.label || val },
        { field: 'description', header_fa: 'شرح سربرگ', header_en: 'Description', width: 'auto', render: (val) => <span className="text-[12px] truncate max-w-[200px] block" title={val}>{val || '-'}</span> },
        { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '90px', render: (val) => {
            const s = STATUS_OPTIONS.find(x => x.value === val);
            const colors = { DRAFT: 'slate', TEMPORARY: 'orange', APPROVED: 'emerald' };
            return <Badge variant={colors[val] || 'gray'} size="sm">{s ? s.label : val}</Badge>;
        }},
        { field: 'registrar_id', header_fa: 'ثبت کننده', header_en: 'Registrar', width: '140px', render: (val) => {
            if (!val || val === '00000000-0000-0000-0000-000000000000') return <span className="text-[12px] text-slate-500">ثبت سیستمی</span>;
            return <span className="text-[12px] truncate font-medium text-slate-700 dark:text-slate-300">{usersMap[val] || val}</span>;
        }}
    ], [usersMap, t]);

    const accountLovColumns = [
        { field: 'chart_name', header_fa: 'ساختار حساب', width: '120px' },
        { field: 'code', header_fa: 'کد حساب', width: '100px' },
        { field: 'title_fa', header_fa: 'عنوان حساب', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                {row.pathTitle && <span className="text-[10px] text-slate-500 truncate" title={row.pathTitle}>{row.pathTitle}</span>}
            </div>
        )}
    ];

    const costLovColumns = [
        { field: 'code', header_fa: 'کد هزینه', width: '100px' },
        { field: 'title_fa', header_fa: 'عنوان هزینه', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                {row.pathTitle && <span className="text-[10px] text-slate-500 truncate" title={row.pathTitle}>{row.pathTitle}</span>}
            </div>
        )}
    ];

    const incomeLovColumns = [
        { field: 'code', header_fa: 'کد درآمد', width: '100px' },
        { field: 'title_fa', header_fa: 'عنوان درآمد', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                {row.pathTitle && <span className="text-[10px] text-slate-500 truncate" title={row.pathTitle}>{row.pathTitle}</span>}
            </div>
        )}
    ];

    const filterFields = [
        { name: 'account_id', label: t('حساب مرتبط', 'Account'), type: 'lov', lovData: lookups.accounts, lovColumns: accountLovColumns, dropdownWidth: 'min-w-[600px]' },
        { name: 'transaction_action', label: t('نوع (واریز/برداشت)', 'Action'), type: 'select', options: TRANSACTION_ACTIONS },
        { name: 'transaction_group', label: t('گروه', 'Group'), type: 'select', options: TRANSACTION_GROUPS },
        { name: 'cost_type_id', label: t('نوع هزینه', 'Cost Type'), type: 'lov', lovData: lookups.costTypes, lovColumns: costLovColumns, dropdownWidth: 'min-w-[500px]' },
        { name: 'income_type_id', label: t('نوع درآمد', 'Income Type'), type: 'lov', lovData: lookups.incomeTypes, lovColumns: incomeLovColumns, dropdownWidth: 'min-w-[500px]' },
        { name: 'status', label: t('وضعیت سند', 'Status'), type: 'select', options: STATUS_OPTIONS },
        { name: 'my_docs', label: t('سندهای من', 'My Documents'), type: 'toggle' }
    ];

    const gridActions = [
        { id: 'attach', icon: Paperclip, tooltip: t('پیوست‌ها', 'Attachments'), onClick: (row) => openAttachments(row), className: (row) => (attachmentCounts[row.id] > 0 ? '!text-indigo-500 hover:!text-indigo-600' : '!text-slate-400 hover:!text-slate-600') },
        { id: 'copy', icon: Copy, tooltip: t('کپی سند', 'Duplicate Document'), onClick: (row) => handleOpenForm('COPY', row), requiredAccess: 'create', className: 'text-emerald-600 hover:text-emerald-700' },
        { id: 'update', icon: Edit, tooltip: t('مشاهده/ویرایش', 'View/Edit'), onClick: (row) => handleOpenForm('EDIT', row), requiredAccess: 'view' },
        { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete Document'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
    ];

    const bulkActions = [
        { label: t('تغییر به موقت', 'Set Temporary'), icon: FileText, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('TEMPORARY', ids) },
        { label: t('تغییر به یادداشت', 'Set Draft'), icon: Edit, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('DRAFT', ids) },
        { label: t('حذف گروهی', 'Bulk Delete'), icon: Trash2, variant: 'danger-outline', requiredAccess: 'delete', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
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

    const DetailsModal = window.TransactionMainDetails || (() => null);
    const isAttachReadOnly = attachModal.record && attachModal.record.status !== 'DRAFT' && attachModal.record.status !== 'TEMPORARY';

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
            fields={filterFields} initialValues={filters} onFilter={setFilters} onClear={() => setFilters({})} language={language} columns={6} 
          />
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <DataGrid
              data={filteredTransactions} columns={columns} language={language} formCode={formCode}
              gridState={gridState} onGridStateChange={setGridState}
              onAdd={access.canCreate ? () => handleOpenForm('CREATE') : undefined}
              onRowDoubleClick={(row) => handleOpenForm('EDIT', row)}
              selectable={true} actions={gridActions} bulkActions={bulkActions} isLoading={isLoading}
            />
          </div>
        </div>

        {window.TransactionMainDetails && (
            <DetailsModal 
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSuccess={handleModalSuccess}
                formMode={formMode}
                initialRecord={currentRecord}
                language={language}
                formCode={formCode}
            />
        )}

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

        <Modal isOpen={attachModal.isOpen} onClose={() => setAttachModal({ isOpen: false, record: null, files: [] })} title={t('پیوست‌های سند', 'Document Attachments')} language={language} width="max-w-xl">
            <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-800/50 shrink-0">
                    <span className="text-[12px] font-bold text-indigo-800 dark:text-indigo-300">{attachModal.record?.document_code}</span>
                    {isAttachReadOnly && <Badge variant="slate" size="sm">{t('فقط خواندنی', 'Read Only')}</Badge>}
                </div>

                <div className="flex-1 overflow-hidden min-h-[300px] rounded-lg">
                    <AttachmentManager 
                        files={attachModal.files}
                        onUpload={handleFileUpload}
                        onDelete={handleDeleteAttachment}
                        onDownload={(f) => window.open(f.file_url, '_blank')}
                        readOnly={isAttachReadOnly}
                        isUploading={isUploading}
                        language={language}
                        formCode={formCode}
                    />
                </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end rounded-b-lg">
                <Button variant="primary" size="sm" onClick={() => setAttachModal({ isOpen: false, record: null, files: [] })}>{t('بستن', 'Close')}</Button>
            </div>
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  TransactionMain.formCode = 'TRANSACTIONS';
  window.TransactionMain = TransactionMain;
})();