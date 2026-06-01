/* Filename: financial/TransactionMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    FileText = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon,
    Copy = FallbackIcon, AlertTriangle = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const { Button = FallbackComponent, PageHeader = FallbackComponent, EmptyState = FallbackComponent, Badge = FallbackComponent } = Core;

  const Grid = window.DSGrid || DS || {};
  const { DataGrid = FallbackComponent, AdvancedFilter = FallbackComponent } = Grid;

  const Feedback = window.DSFeedback || DS || {};
  const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

  function FallbackComponent() { return null; }

  const TransactionMain = ({ language = 'fa', formCode = 'TRANSACTIONS' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const supabase = window.supabase;
    const currentUserObj = window.NavigationSystem?.currentUser || {};
    const currentUserName = currentUserObj.name || 'مدیر سیستم';

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
    const [usersMap, setUsersMap] = useState({});
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState('CREATE');
    const [currentRecord, setCurrentRecord] = useState(null);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

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

    const fetchUsers = useCallback(async () => {
        try {
            const { data } = await supabase.from('sec_users').select('id, full_name, username');
            const uMap = {};
            (data || []).forEach(u => {
                uMap[u.id] = `${u.full_name || u.username || ''}`.trim();
            });
            setUsersMap(uMap);
        } catch (error) {}
    }, [supabase]);

    const fetchData = useCallback(async () => {
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
        }
    }, [supabase, showToast, t]);

    useEffect(() => {
        if (access.canView) {
            fetchUsers();
            fetchData();
        }
    }, [fetchUsers, fetchData, access.canView]);

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
        { field: 'registrar_id', header_fa: 'ثبت کننده', header_en: 'Registrar', width: '180px', render: (val) => usersMap[val] || val }
    ], [usersMap, t]);

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
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-visible border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <DataGrid
              data={transactions} columns={columns} language={language} formCode={formCode}
              gridState={gridState} onGridStateChange={setGridState}
              onAdd={access.canCreate ? () => handleOpenForm('CREATE') : undefined}
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

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  TransactionMain.formCode = 'TRANSACTIONS';
  window.TransactionMain = TransactionMain;
})();