/* Filename: financial/TransactionMainDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    FileText = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon,
    X = FallbackIcon, List = FallbackIcon, AlertTriangle = FallbackIcon, Check = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const { Button = FallbackComponent, Badge = FallbackComponent, Card = FallbackComponent } = Core;

  const Forms = window.DSForms || DS || {};
  const { TextField = FallbackComponent, SelectField = FallbackComponent, DatePicker = FallbackComponent, AttachmentManager = FallbackComponent } = Forms;

  const Grid = window.DSGrid || DS || {};
  const { DataGrid = FallbackComponent, LOVField = FallbackComponent } = Grid;

  const Feedback = window.DSFeedback || DS || {};
  const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

  function FallbackComponent() { return null; }

  const TransactionMainDetails = ({ isOpen, onClose, onSuccess, formMode, initialRecord, language = 'fa', formCode }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const supabase = window.supabase;
    const currentUserObj = window.NavigationSystem?.currentUser || {};
    const currentUserId = currentUserObj.id || null;
    const currentUserName = currentUserObj.name || currentUserObj.full_name || 'مدیر سیستم';
    const currentUserUsername = currentUserObj.username || 'admin';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
      return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const TRANSACTION_TYPES = [
        { value: 'OPENING', label: t('افتتاحیه', 'Opening') },
        { value: 'CLOSING', label: t('اختتامیه', 'Closing') },
        { value: 'GENERAL', label: t('عمومی', 'General') },
        { value: 'TRANSFER', label: t('انتقال', 'Transfer') }
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
        { value: 'APPROVED', label: t('تایید شده', 'Approved') },
        { value: 'FINAL', label: t('قطعی شده', 'Final') }
    ];

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    
    const [headerData, setHeaderData] = useState({});
    const [itemsData, setItemsData] = useState([]);
    const [inlineItemEdit, setInlineItemEdit] = useState(null);
    const [copyWarning, setCopyWarning] = useState(null);

    const [attachModal, setAttachModal] = useState({ isOpen: false, record: null, files: [] });
    const [isUploading, setIsUploading] = useState(false);

    const [lookups, setLookups] = useState({
        accounts: [],
        leafAccounts: [],
        costTypes: [],
        incomeTypes: [],
        departments: [],
        usersMap: {},
        usersList: []
    });

    const isFetchingDeps = useRef(false);
    const hasInitialized = useRef(false);

    const isReadOnly = useMemo(() => {
        if (formMode === 'CREATE' || formMode === 'COPY') return false;
        if (!headerData.status) return false;
        return headerData.status !== 'DRAFT' && headerData.status !== 'TEMPORARY';
    }, [headerData.status, formMode]);

    const isAttachReadOnly = useMemo(() => {
        return attachModal.record && attachModal.record.status !== 'DRAFT' && attachModal.record.status !== 'TEMPORARY';
    }, [attachModal.record]);

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

    const fetchDependencies = useCallback(async () => {
        if (!supabase) return null;
        try {
            const [accRes, chartRes, costRes, incRes, usersRes, personnelRes, nodesRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, code, currency_id, parent_id, chart_id').eq('is_active', true),
                supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa, code, parent_id').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa, code, parent_id').eq('is_active', true),
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

            const allAccounts = accRes.data || [];
            const leafAccs = buildPathsAndFilterLeafs(allAccounts, activeCharts);
            const costLeafs = buildPathsAndFilterLeafs(costRes.data || []);
            const incomeLeafs = buildPathsAndFilterLeafs(incRes.data || []);

            const newLookups = {
                accounts: allAccounts,
                leafAccounts: leafAccs,
                costTypes: costLeafs,
                incomeTypes: incomeLeafs,
                usersMap: uMap,
                usersList: usersRes.data || [],
                currentUserDeptId: myDeptId,
                currentUserDeptTitle: myDeptTitle
            };

            setLookups(newLookups);
            return newLookups;
        } catch (error) {
            showToast(t('خطا در دریافت اطلاعات پایه', 'Error fetching dependencies'), 'error');
            return null;
        }
    }, [supabase, showToast, t, currentUserId]);

    const generateDocumentCode = () => {
        return `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    };

    const loadAttachments = async (recordId) => {
        try {
            const { data } = await supabase.from('fm_attachments').select('*').eq('entity_type', 'TRANSACTION').eq('entity_id', recordId);
            setAttachModal(prev => ({ ...prev, files: data || [] }));
        } catch (err) {}
    };

    useEffect(() => {
        if (!isOpen) {
            hasInitialized.current = false;
            return;
        }
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        
        fetchDependencies().then((newLookups) => {
            if (!newLookups) return;

            const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '/');
            setInlineItemEdit(null);
            setCopyWarning(null);

            let safeFinalRegistrar = currentUserId;
            if (!safeFinalRegistrar || safeFinalRegistrar === '00000000-0000-0000-0000-000000000000') {
                const matchingUser = newLookups.usersList.find(u => u.username === currentUserUsername || u.full_name === currentUserName);
                if (matchingUser) safeFinalRegistrar = matchingUser.id;
            }

            if (formMode === 'CREATE') {
                setHeaderData({
                    document_code: generateDocumentCode(),
                    document_date: todayStr,
                    transaction_type: 'GENERAL',
                    department_id: newLookups.currentUserDeptId,
                    department_title: newLookups.currentUserDeptTitle,
                    description: '',
                    status: 'DRAFT',
                    registrar_id: safeFinalRegistrar,
                    registered_at: new Date().toISOString()
                });
                setItemsData([]);
                setAttachModal({ isOpen: false, record: null, files: [] });
            } else if ((formMode === 'EDIT' || formMode === 'COPY') && initialRecord) {
                if (formMode === 'COPY') {
                    setCopyWarning(t(`هشدار: این سند کپی از سند ${initialRecord.document_code} می‌باشد و نیازمند بررسی و تغییرات است.`, `Warning: This is a copy of transaction ${initialRecord.document_code} and requires review.`));
                }
                
                const parsedDate = formMode === 'COPY' ? todayStr : (initialRecord.document_date ? initialRecord.document_date.replace(/-/g, '/') : todayStr);
                
                setHeaderData({
                    ...initialRecord,
                    id: formMode === 'COPY' ? undefined : initialRecord.id,
                    document_code: formMode === 'COPY' ? generateDocumentCode() : initialRecord.document_code,
                    status: formMode === 'COPY' ? 'DRAFT' : initialRecord.status,
                    reference_code: formMode === 'COPY' ? '' : initialRecord.reference_code,
                    daily_number: formMode === 'COPY' ? '' : initialRecord.daily_number,
                    document_date: parsedDate,
                    registered_at: formMode === 'COPY' ? new Date().toISOString() : initialRecord.registered_at,
                    department_id: formMode === 'COPY' ? newLookups.currentUserDeptId : initialRecord.department_id,
                    department_title: formMode === 'COPY' ? newLookups.currentUserDeptTitle : '',
                    registrar_id: formMode === 'COPY' ? safeFinalRegistrar : initialRecord.registrar_id
                });
                
                const mappedItems = (initialRecord.fm_transaction_items || []).map(item => ({
                    ...item,
                    _tempId: crypto.randomUUID(),
                    id: formMode === 'COPY' ? undefined : item.id,
                    transaction_id: formMode === 'COPY' ? undefined : item.transaction_id
                })).sort((a, b) => a.row_number - b.row_number);
                
                setItemsData(mappedItems);

                if (formMode === 'EDIT') {
                    loadAttachments(initialRecord.id);
                    setAttachModal(prev => ({ ...prev, record: initialRecord }));
                } else {
                    setAttachModal({ isOpen: false, record: null, files: [] });
                }
            }
        });
    }, [isOpen, formMode, initialRecord, fetchDependencies, currentUserId, currentUserName, currentUserUsername, t]);

    const handleChangeStatus = async (newStatus) => {
        if (headerData.transaction_type === 'TRANSFER' && newStatus !== 'DRAFT') {
            let sumDep = 0, sumWid = 0;
            itemsData.forEach(i => {
                sumDep += parseFloat(String(i.deposit_amount || '0').replace(/,/g, '')) || 0;
                sumWid += parseFloat(String(i.withdrawal_amount || '0').replace(/,/g, '')) || 0;
            });
            if (sumDep !== sumWid) {
                return showToast(t('تراکنش انتقال غیرتراز است. مجموع واریز و برداشت باید برابر باشد.', 'Cannot change status of unbalanced transfer.'), 'warning');
            }
        }
        
        setHeaderData(prev => ({ ...prev, status: newStatus }));
        if (headerData.id) {
            setIsLoading(true);
            try {
                const { error } = await supabase.from('fm_transactions').update({ status: newStatus }).eq('id', headerData.id);
                if (error) throw error;
                await logAction('status_update', headerData.id, `تغییر وضعیت سند به ${newStatus}`);
                showToast(t('وضعیت سند با موفقیت تغییر کرد.', 'Transaction status updated successfully.'));
                onSuccess();
            } catch (err) {
                showToast(t('خطا در تغییر وضعیت سند.', 'Error updating transaction status.'), 'error');
                setHeaderData(prev => ({ ...prev, status: initialRecord?.status || 'DRAFT' }));
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSaveTransaction = async () => {
        if (inlineItemEdit) {
            return showToast(t('لطفاً با زدن دکمه Enter تغییرات سطر باز را ذخیره کنید.', 'Please save inline edits first using Enter key.'), 'warning');
        }

        if (!headerData.document_date || !headerData.transaction_type || !headerData.description) {
            return showToast(t('تکمیل فیلدهای اجباری سربرگ (تاریخ، نوع، شرح) الزامی است.', 'Header required fields missing.'), 'warning');
        }
        
        if (itemsData.length === 0) {
            return showToast(t('سند حداقل یک قلم نیاز دارد.', 'Transaction must have at least one item.'), 'warning');
        }

        if (headerData.transaction_type === 'TRANSFER' && headerData.status !== 'DRAFT') {
            let sumDep = 0, sumWid = 0;
            itemsData.forEach(i => {
                sumDep += parseFloat(String(i.deposit_amount || '0').replace(/,/g, '')) || 0;
                sumWid += parseFloat(String(i.withdrawal_amount || '0').replace(/,/g, '')) || 0;
            });
            if (sumDep !== sumWid) {
                return showToast(t('تراکنش انتقال غیرتراز است. مجموع واریز و برداشت باید برابر باشد.', 'Transfer transactions must be balanced.'), 'warning');
            }
        }

        setIsLoading(true);
        try {
            let txId = headerData.id;
            const validDeptId = (headerData.department_id && String(headerData.department_id).trim() !== '') ? headerData.department_id : null;

            const txPayload = {
                document_code: headerData.document_code,
                document_date: headerData.document_date.replace(/\//g, '-'),
                registrar_id: headerData.registrar_id || null,
                transaction_type: headerData.transaction_type,
                department_id: validDeptId,
                status: headerData.status || 'DRAFT',
                description: headerData.description || ''
            };

            if (formMode === 'CREATE' || formMode === 'COPY') {
                const { data, error } = await supabase.from('fm_transactions').insert([txPayload]).select('id');
                if (error) throw error;
                txId = data[0].id;
                await logAction('create_transaction', txId, `ایجاد تراکنش: ${headerData.document_code}`);
            } else {
                const { error } = await supabase.from('fm_transactions').update(txPayload).eq('id', txId);
                if (error) throw error;
                await supabase.from('fm_transaction_items').delete().eq('transaction_id', txId);
                await logAction('update_transaction', txId, `ویرایش تراکنش: ${headerData.document_code}`);
            }

            const itemsPayload = itemsData.map((item, index) => ({
                transaction_id: txId,
                row_number: index + 1,
                account_id: item.account_id || null,
                transaction_action: item.transaction_action,
                transaction_group: item.transaction_group,
                cost_type_id: item.cost_type_id || null,
                income_type_id: item.income_type_id || null,
                currency: item.currency || 'IRR',
                deposit_amount: parseFloat(String(item.deposit_amount || '0').replace(/,/g, '')) || 0,
                withdrawal_amount: parseFloat(String(item.withdrawal_amount || '0').replace(/,/g, '')) || 0,
                description: item.description || ''
            }));

            const { error: itemsError } = await supabase.from('fm_transaction_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            showToast(t('سند با موفقیت ثبت شد.', 'Transaction saved successfully.'));
            onSuccess();
        } catch (error) {
            showToast(t('خطا در ثبت سند.', 'Error saving transaction.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItemClick = () => {
        if (isReadOnly) return;
        if (inlineItemEdit) return showToast(t('ابتدا با زدن دکمه Enter سطر جاری را ذخیره کنید.', 'Save current row first.'), 'warning');
        setInlineItemEdit({
            id: 'new',
            data: { row_number: itemsData.length + 1, account_id: '', account_obj: null, transaction_action: 'DEPOSIT', transaction_group: 'COST', cost_type_id: '', income_type_id: '', currency: '', deposit_amount: '', withdrawal_amount: '0', description: '' }
        });
    };

    const handleEditItemClick = (row) => {
        if (isReadOnly || inlineItemEdit) return;
        const accObj = lookups.leafAccounts.find(a => String(a.id) === String(row.account_id)) || null;
        setInlineItemEdit({
            id: row._tempId || row.id,
            data: { ...row, account_obj: accObj, deposit_amount: row.deposit_amount ? String(row.deposit_amount).replace(/,/g, '') : '0', withdrawal_amount: row.withdrawal_amount ? String(row.withdrawal_amount).replace(/,/g, '') : '0' }
        });
    };

    const handleSaveItemInline = () => {
        if (!inlineItemEdit) return;
        const form = inlineItemEdit.data;
        
        if (!form.account_id || !form.description) {
            return showToast(t('حساب و شرح اجباری هستند.', 'Account and Description required.'), 'warning');
        }

        const cleanDeposit = String(form.deposit_amount || '0').replace(/,/g, '');
        const cleanWithdrawal = String(form.withdrawal_amount || '0').replace(/,/g, '');
        
        if ((isNaN(cleanDeposit) || cleanDeposit === '') && (isNaN(cleanWithdrawal) || cleanWithdrawal === '')) {
            return showToast(t('مبلغ نامعتبر است.', 'Invalid amount.'), 'warning');
        }

        let newRowNum = parseInt(form.row_number, 10);
        if (isNaN(newRowNum) || newRowNum < 1) newRowNum = itemsData.length + (inlineItemEdit.id === 'new' ? 1 : 0);

        const dataToSave = { ...form, deposit_amount: cleanDeposit, withdrawal_amount: cleanWithdrawal };
        if (inlineItemEdit.id === 'new') dataToSave._tempId = crypto.randomUUID();

        let otherItems = itemsData;
        if (inlineItemEdit.id !== 'new') {
            otherItems = itemsData.filter(item => item._tempId !== inlineItemEdit.id && item.id !== inlineItemEdit.id);
        }

        otherItems.sort((a, b) => a.row_number - b.row_number);
        
        const targetIndex = Math.min(Math.max(0, newRowNum - 1), otherItems.length);
        otherItems.splice(targetIndex, 0, dataToSave);
        
        const finalItems = otherItems.map((item, idx) => ({ ...item, row_number: idx + 1 }));
        setItemsData(finalItems);
        setInlineItemEdit(null);
    };

    const handleRemoveItem = (row) => {
        if (isReadOnly) return;
        const newItems = itemsData.filter(item => item._tempId !== row._tempId && item.id !== row.id);
        setItemsData(newItems.map((item, idx) => ({ ...item, row_number: idx + 1 })));
    };

    const handleBulkDeleteItems = (ids) => {
        if (isReadOnly) return;
        const newItems = itemsData.filter(item => !ids.includes(item.id) && !ids.includes(item._tempId));
        setItemsData(newItems.map((item, idx) => ({ ...item, row_number: idx + 1 })));
        setInlineItemEdit(null);
        showToast(t('اقلام انتخاب شده حذف شدند.', 'Selected items deleted.'));
    };

    const handleInlineKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSaveItemInline();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setInlineItemEdit(null);
        }
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
                file_type: file.type,
                file_url: fileUrl,
                created_by: currentUserId
            };

            const { error } = await supabase.from('fm_attachments').insert([payload]);
            if (error) throw error;

            showToast(t('فایل با موفقیت پیوست شد.', 'File attached successfully.'));
            loadAttachments(attachModal.record.id);
        } catch (error) {
            showToast(t('خطا در آپلود فایل.', 'Error uploading file.'), 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (fileId) => {
        try {
            const { error } = await supabase.from('fm_attachments').delete().eq('id', fileId);
            if (error) throw error;
            showToast(t('پیوست حذف شد.', 'Attachment deleted.'));
            loadAttachments(attachModal.record.id);
        } catch (error) {
            showToast(t('خطا در حذف پیوست.', 'Error deleting attachment.'), 'error');
        }
    };

    const formatNumber = (num) => {
        if (!num && num !== 0) return '';
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    };

    const handleAmountChange = (e, field) => {
        const raw = e.target.value.replace(/,/g, '');
        if (raw === '' || !isNaN(raw)) {
            setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, [field]: raw } }));
        }
    };

    const accountLovColumns = [
        { field: 'chart_name', header_fa: 'ساختار حساب', width: '250px' },
        { field: 'code', header_fa: 'کد حساب', width: '120px' },
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

    const itemGridData = useMemo(() => {
        const data = [...itemsData];
        if (inlineItemEdit && inlineItemEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineItemEdit.data });
        return data;
    }, [itemsData, inlineItemEdit]);

    const itemColumns = [
        { field: 'row_number', header_fa: '#', width: '40px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" type="number" min="1" value={inlineItemEdit.data.row_number || ''} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, row_number: e.target.value}}))} isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return row._isNew ? <span className="text-emerald-600 font-bold">*</span> : <span className="text-[12px]">{val}</span>;
        }},
        { field: 'account_id', header_fa: 'حساب *', width: '200px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return (
                    <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="w-full relative z-[100]">
                        <LOVField 
                            size="sm" formCode={formCode} data={lookups.leafAccounts} columns={accountLovColumns} dropdownWidth="min-w-[650px]"
                            displayValue={inlineItemEdit.data.account_obj ? `${inlineItemEdit.data.account_obj.code} - ${inlineItemEdit.data.account_obj.title_fa}` : ''}
                            onChange={(r) => setInlineItemEdit(prev => ({...prev, data: { ...prev.data, account_id: r?.id, account_obj: r, currency: r?.currency_id || 'IRR' }}))}
                            isRtl={isRtl} wrapperClassName="m-0"
                        />
                    </div>
                );
            }
            const acc = lookups.leafAccounts.find(a => String(a.id) === String(val));
            return acc ? <span className="text-[12px] truncate block">{acc.code} - {acc.title_fa}</span> : '';
        }},
        { field: 'transaction_action', header_fa: 'نوع', width: '80px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[90]">
                    <SelectField size="sm" options={TRANSACTION_ACTIONS} value={inlineItemEdit.data.transaction_action} onChange={e => {
                        const action = e.target.value;
                        setInlineItemEdit(prev => ({
                            ...prev, 
                            data: {
                                ...prev.data, 
                                transaction_action: action, 
                                deposit_amount: action === 'DEPOSIT' ? prev.data.deposit_amount : '0', 
                                withdrawal_amount: action === 'WITHDRAWAL' ? prev.data.withdrawal_amount : '0'
                            }
                        }));
                    }} isRtl={isRtl} wrapperClassName="m-0" />
                </div>;
            }
            return <span className="text-[12px]">{TRANSACTION_ACTIONS.find(a => a.value === val)?.label || val}</span>;
        }},
        { field: 'transaction_group', header_fa: 'گروه', width: '80px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[80]"><SelectField size="sm" options={TRANSACTION_GROUPS} value={inlineItemEdit.data.transaction_group} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, transaction_group: e.target.value, cost_type_id: '', income_type_id: ''}}))} isRtl={isRtl} wrapperClassName="m-0" /></div>;
            }
            return <span className="text-[12px]">{TRANSACTION_GROUPS.find(a => a.value === val)?.label || val}</span>;
        }},
        { field: 'sub_type', header_fa: 'هزینه/درآمد', width: '150px', render: (_, row) => {
            const group = inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId) ? inlineItemEdit.data.transaction_group : row.transaction_group;
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                if (group === 'COST') {
                    return (
                        <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[70]">
                            <LOVField 
                                size="sm" formCode={formCode} data={lookups.costTypes} columns={costLovColumns} dropdownWidth="min-w-[500px]"
                                displayValue={lookups.costTypes.find(c => String(c.id) === String(inlineItemEdit.data.cost_type_id))?.title_fa || ''}
                                onChange={(r) => setInlineItemEdit(prev => ({...prev, data: {...prev.data, cost_type_id: r?.id}}))}
                                isRtl={isRtl} wrapperClassName="m-0"
                            />
                        </div>
                    );
                }
                if (group === 'INCOME') {
                    return (
                        <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[70]">
                            <LOVField 
                                size="sm" formCode={formCode} data={lookups.incomeTypes} columns={incomeLovColumns} dropdownWidth="min-w-[500px]"
                                displayValue={lookups.incomeTypes.find(c => String(c.id) === String(inlineItemEdit.data.income_type_id))?.title_fa || ''}
                                onChange={(r) => setInlineItemEdit(prev => ({...prev, data: {...prev.data, income_type_id: r?.id}}))}
                                isRtl={isRtl} wrapperClassName="m-0"
                            />
                        </div>
                    );
                }
                return <div className="h-[32px] w-full bg-slate-100 dark:bg-slate-800 rounded opacity-50"></div>;
            }
            if (group === 'COST') return <span className="text-[12px]">{lookups.costTypes.find(x => String(x.id) === String(row.cost_type_id))?.title_fa || ''}</span>;
            if (group === 'INCOME') return <span className="text-[12px]">{lookups.incomeTypes.find(x => String(x.id) === String(row.income_type_id))?.title_fa || ''}</span>;
            return '-';
        }},
        { field: 'currency', header_fa: 'ارز', width: '50px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onClick={e => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.currency} disabled isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px]">{val}</span>;
        }},
        { field: 'deposit_amount', header_fa: 'واریز *', width: '100px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                const disabled = inlineItemEdit.data.transaction_action !== 'DEPOSIT';
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" type="text" disabled={disabled} value={formatNumber(inlineItemEdit.data.deposit_amount)} onChange={(e) => handleAmountChange(e, 'deposit_amount')} isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px] font-medium text-emerald-600 dark:text-emerald-500">{formatNumber(val)}</span>;
        }},
        { field: 'withdrawal_amount', header_fa: 'برداشت *', width: '100px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                const disabled = inlineItemEdit.data.transaction_action !== 'WITHDRAWAL';
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" type="text" disabled={disabled} value={formatNumber(inlineItemEdit.data.withdrawal_amount)} onChange={(e) => handleAmountChange(e, 'withdrawal_amount')} isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px] font-medium text-rose-600 dark:text-rose-500">{formatNumber(val)}</span>;
        }},
        { field: 'description', header_fa: 'شرح *', width: 'auto', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.description} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, description: e.target.value}}))} isRtl={isRtl} required wrapperClassName="m-0" placeholder={t('Enter برای ثبت', 'Enter to save')} /></div>;
            }
            return <span className="text-[12px] truncate">{val}</span>;
        }}
    ];

    const itemBulkActions = isReadOnly ? [] : [
        { label: t('حذف گروهی', 'Bulk Delete'), icon: Trash2, variant: 'danger-outline', requiredAccess: 'delete', onClick: (ids) => handleBulkDeleteItems(ids) }
    ];

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isReadOnly ? t('مشاهده تراکنش', 'View Transaction') : (formMode === 'CREATE' ? t('ثبت تراکنش جدید', 'New Transaction') : formMode === 'EDIT' ? t('ویرایش تراکنش', 'Edit Transaction') : t('کپی تراکنش', 'Copy Transaction'))} language={language} width="max-w-6xl">
            <div className="flex flex-col bg-slate-50/50 dark:bg-slate-900/50 h-[85vh] text-[12px] relative">
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex flex-col gap-4 pb-20">
                    
                    {copyWarning && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 p-2 rounded-lg flex items-center gap-2 mb-1 animate-in slide-in-from-top-2 shrink-0">
                            <AlertTriangle size={16} />
                            <span className="text-[12px] font-bold">{copyWarning}</span>
                        </div>
                    )}

                    <Card
                        title={t('اطلاعات سربرگ', 'Header Data')}
                        isCollapsible={true}
                        noPadding={true}
                        className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-20"
                        headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
                        action={
                            <div className="flex items-center gap-2 pr-2" onClick={e => e.stopPropagation()}>
                                <Badge variant={(headerData.status || 'DRAFT') === 'APPROVED' ? 'emerald' : (headerData.status || 'DRAFT') === 'TEMPORARY' ? 'orange' : 'slate'} size="sm" className="shadow-sm">
                                    {STATUS_OPTIONS.find(x => x.value === (headerData.status || 'DRAFT'))?.label || t('یادداشت', 'Draft')}
                                </Badge>
                                
                                {!isReadOnly && formMode !== 'CREATE' && (
                                    <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-700 rtl:border-r-0 rtl:pr-0 rtl:border-l rtl:pl-2">
                                        {(headerData.status || 'DRAFT') === 'DRAFT' && access.canEdit && (
                                            <Button variant="outline" size="sm" onClick={() => handleChangeStatus('TEMPORARY')} className="!text-orange-500 !border-orange-500 hover:!bg-orange-50 dark:hover:!bg-orange-900/30 !py-0.5 !h-6">
                                                {t('تبدیل به موقت', 'Set Temporary')}
                                            </Button>
                                        )}
                                        {(headerData.status || 'DRAFT') === 'TEMPORARY' && access.canEdit && (
                                            <Button variant="outline" size="sm" onClick={() => handleChangeStatus('DRAFT')} className="!text-slate-600 !border-slate-500 hover:!bg-slate-50 dark:hover:!bg-slate-800 !py-0.5 !h-6">
                                                {t('برگشت به یادداشت', 'Revert to Draft')}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        }
                        language={language}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-white dark:bg-slate-800 overflow-visible">
                            <TextField size="sm" formCode={formCode} label={t('کد سند', 'Transaction Code')} value={headerData.document_code || ''} disabled isRtl={isRtl} dir="ltr" />
                            <TextField size="sm" formCode={formCode} label={t('کد عطف', 'Ref Code')} value={headerData.reference_code || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                            <TextField size="sm" formCode={formCode} label={t('شماره روزانه', 'Daily Number')} value={headerData.daily_number || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                            <div className="relative z-[90]">
                                <DatePicker size="sm" formCode={formCode} label={t('تاریخ سند', 'Transaction Date')} value={headerData.document_date || ''} onChange={val => setHeaderData({...headerData, document_date: val})} isRtl={isRtl} disabled={isReadOnly} required />
                            </div>
                            <TextField size="sm" formCode={formCode} label={t('ثبت کننده', 'Registrar')} value={lookups.usersMap[headerData.registrar_id] || ''} disabled isRtl={isRtl} />
                            
                            <div className="relative z-[80]">
                                <SelectField size="sm" formCode={formCode} label={t('نوع تراکنش', 'Transaction Type')} value={headerData.transaction_type || 'GENERAL'} onChange={e => setHeaderData({...headerData, transaction_type: e.target.value})} options={TRANSACTION_TYPES} isRtl={isRtl} disabled={isReadOnly} required />
                            </div>
                            <TextField size="sm" formCode={formCode} label={t('دپارتمان', 'Department')} value={headerData.department_title || lookups.currentUserDeptTitle || ''} disabled isRtl={isRtl} />
                            
                            <div className="lg:col-span-3 sm:col-span-2 relative z-[70]">
                                <TextField size="sm" formCode={formCode} label={t('شرح سربرگ', 'Header Description')} value={headerData.description || ''} onChange={e => setHeaderData({...headerData, description: e.target.value})} isRtl={isRtl} disabled={isReadOnly} required />
                            </div>
                        </div>
                    </Card>

                    <Card
                        title={t('اقلام سند', 'Transaction Items')}
                        isCollapsible={true}
                        noPadding={true}
                        className="border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col min-h-[350px] relative z-10"
                        headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
                        language={language}
                    >
                        <div className="flex-1 w-full p-1 relative min-h-[300px] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col min-w-0">
                            <DataGrid 
                                data={itemGridData} columns={itemColumns}
                                language={language} onAdd={isReadOnly ? undefined : handleAddItemClick} hideImport={true} hideExport={true} hideToolbar={true}
                                selectable={!isReadOnly} bulkActions={itemBulkActions} onRowDoubleClick={(row) => handleEditItemClick(row)}
                                className="h-full"
                            />
                        </div>
                    </Card>
                </div>

                <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-50">
                    <Button variant="outline" size="sm" onClick={onClose}>{t('بستن', 'Close')}</Button>
                    {!isReadOnly && access.canEdit && <Button variant="primary" size="sm" icon={Check} onClick={handleSaveTransaction} isLoading={isLoading}>{t('ثبت نهایی سند', 'Save Transaction')}</Button>}
                </div>
            </div>
            
            <Modal isOpen={attachModal.isOpen} onClose={() => setAttachModal({ isOpen: false, record: null, files: [] })} title={t('پیوست‌های سند', 'Attachments')} language={language} width="max-w-xl">
                <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-800/50 shrink-0">
                        <span className="text-[12px] font-bold text-indigo-800 dark:text-indigo-300">{attachModal.record?.document_code}</span>
                        {isAttachReadOnly && <Badge variant="slate" size="sm">{t('فقط خواندنی', 'Read Only')}</Badge>}
                    </div>

                    <div className="flex-1 overflow-hidden min-h-[300px] rounded-lg">
                        <AttachmentManager 
                            files={attachModal.files}
                            onUpload={handleFileUpload}
                            onDelete={(f) => handleDeleteAttachment(f.id)}
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
        </Modal>
    );
  };

  window.TransactionMainDetails = TransactionMainDetails;
})();