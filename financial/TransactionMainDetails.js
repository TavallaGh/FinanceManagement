/* Filename: financial/TransactionMainDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    AlertTriangle = FallbackIcon, Check = FallbackIcon, Scale = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const { Button = FallbackComponent, Badge = FallbackComponent, Card = FallbackComponent } = Core;

  const Forms = window.DSForms || DS || {};
  const { TextField = FallbackComponent, SelectField = FallbackComponent, DatePicker = FallbackComponent, AttachmentManager = FallbackComponent } = Forms;

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
    const [copyWarning, setCopyWarning] = useState(null);

    const [attachModal, setAttachModal] = useState({ isOpen: false, record: null, files: [] });
    const [isUploading, setIsUploading] = useState(false);

    const gridRef = useRef(null);
    const hasInitialized = useRef(false);

    const [lookups, setLookups] = useState({
        accounts: [],
        leafAccounts: [],
        costTypes: [],
        incomeTypes: [],
        departments: [],
        usersMap: {},
        usersList: []
    });

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
                supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, chart_id').eq('is_active', true),
                supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
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
                    let pathArrFa = [i.title_fa || i.title || i.code]; 
                    let pathArrEn = [i.title_en || i.title_fa || i.title || i.code]; 
                    let curr = i;
                    while (curr && curr.parent_id) {
                        const parent = items.find(p => p.id === curr.parent_id);
                        if (parent) {
                            pathArrFa.unshift(parent.title_fa || parent.title || parent.code);
                            pathArrEn.unshift(parent.title_en || parent.title_fa || parent.title || parent.code);
                            curr = parent;
                        } else break;
                    }
                    return {
                        ...i,
                        pathTitle_fa: pathArrFa.join(' / '),
                        pathTitle_en: pathArrEn.join(' / '),
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

    const balanceInfo = useMemo(() => {
        if (headerData.transaction_type !== 'TRANSFER' || itemsData.length === 0 || isReadOnly) return { isUnbalanced: false };
        let sumDep = 0, sumWid = 0;
        itemsData.forEach(i => {
            sumDep += parseFloat(String(i.deposit_amount || '0').replace(/,/g, '')) || 0;
            sumWid += parseFloat(String(i.withdrawal_amount || '0').replace(/,/g, '')) || 0;
        });
        const diff = sumDep - sumWid;
        return {
            isUnbalanced: diff !== 0,
            diff: diff
        };
    }, [itemsData, headerData.transaction_type, isReadOnly]);

    const formatNumber = (num) => {
        if (!num && num !== 0) return '';
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    };

    const validateTransactionLogic = (targetStatus) => {
        if (targetStatus === 'DRAFT') return true;

        if (!itemsData || itemsData.length === 0) {
            showToast(t('سند باید حداقل دارای یک قلم باشد.', 'Transaction must have at least one item.'), 'warning');
            return false;
        }

        let sumDep = 0, sumWid = 0;
        let hasZeroItem = false;

        itemsData.forEach(i => {
            const dep = parseFloat(String(i.deposit_amount || '0').replace(/,/g, '')) || 0;
            const wid = parseFloat(String(i.withdrawal_amount || '0').replace(/,/g, '')) || 0;
            if (dep === 0 && wid === 0) hasZeroItem = true;
            sumDep += dep;
            sumWid += wid;
        });

        if (hasZeroItem) {
            showToast(t('مبلغ تمام اقلام سند باید پر شود و نمی‌تواند صفر باشد.', 'All items must have a valid amount.'), 'warning');
            return false;
        }

        if (sumDep === 0 && sumWid === 0) {
            showToast(t('جمع مبالغ سند صفر است و قابلیت تغییر وضعیت ندارد.', 'Total transaction amount cannot be zero.'), 'warning');
            return false;
        }

        if (headerData.transaction_type === 'TRANSFER') {
            if (sumDep !== sumWid) {
                showToast(t('تراکنش انتقال غیرتراز است. مجموع واریز و برداشت باید برابر باشد.', 'Transfer transactions must be balanced.'), 'warning');
                return false;
            }
        }

        return true;
    };

    const handleSaveTransaction = async (overrideStatus) => {
        const statusToSave = typeof overrideStatus === 'string' ? overrideStatus : headerData.status;

        if (document.getElementById('grid-inline-edit-marker')) {
            return showToast(t('لطفاً ابتدا با زدن دکمه Enter تغییرات سطر باز را در اقلام ذخیره کنید.', 'Please save inline edits first using Enter key.'), 'warning');
        }

        if (!headerData.document_date || !headerData.transaction_type || !headerData.description) {
            return showToast(t('تکمیل فیلدهای اجباری سربرگ (تاریخ، نوع، شرح) الزامی است.', 'Header required fields missing.'), 'warning');
        }
        
        if (!validateTransactionLogic(statusToSave)) return;

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
                status: statusToSave || 'DRAFT',
                description: headerData.description || ''
            };

            if (formMode === 'CREATE' || formMode === 'COPY' || !txId) {
                const { data, error } = await supabase.from('fm_transactions').insert([txPayload]).select('id');
                if (error) throw error;
                txId = data[0].id;
                setHeaderData(prev => ({ ...prev, id: txId }));
                await logAction('create_transaction', txId, `ایجاد تراکنش: ${headerData.document_code}`);
            } else {
                const { error } = await supabase.from('fm_transactions').update(txPayload).eq('id', txId);
                if (error) throw error;
                await supabase.from('fm_transaction_items').delete().eq('transaction_id', txId);
                await logAction('update_transaction', txId, `ویرایش تراکنش: ${headerData.document_code}`);
            }

            if (itemsData.length > 0) {
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
            }

            setHeaderData(prev => ({ ...prev, status: statusToSave }));
            
            if (typeof overrideStatus === 'string') {
                showToast(t('وضعیت سند با موفقیت تغییر کرد.', 'Transaction status updated successfully.'));
            } else {
                showToast(t('سند با موفقیت ثبت شد.', 'Transaction saved successfully.'));
            }
            onSuccess();
        } catch (error) {
            showToast(t('خطا در عملیات.', 'Operation failed.'), 'error');
        } finally {
            setIsLoading(false);
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

    if (!isOpen) return null;

    const TransactionMainGrid = window.TransactionMainGrid || FallbackComponent;

    const itemsCardTitle = (
        <div className="flex items-center gap-4">
            <span>{t('اقلام سند', 'Transaction Items')}</span>
            {balanceInfo.isUnbalanced && (
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/50">
                    <AlertTriangle size={14} />
                    <span className="text-[11px] font-bold">
                        {t('اختلاف تراز:', 'Balance diff:')} <span dir="ltr" className="inline-block px-1 font-black">{formatNumber(Math.abs(balanceInfo.diff))}</span>
                    </span>
                </div>
            )}
        </div>
    );

    const itemsCardAction = balanceInfo.isUnbalanced ? (
        <Button size="sm" variant="outline" className="!text-orange-600 !border-orange-500 hover:!bg-orange-100 dark:hover:!bg-orange-900/40 !h-6 !py-0 !text-[11px]" icon={Scale} onClick={(e) => { e.stopPropagation(); gridRef.current?.triggerBalanceRow(balanceInfo.diff); }}>
            {t('تراز کردن تراکنش', 'Balance Transaction')}
        </Button>
    ) : null;

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
                                            <Button variant="outline" size="sm" onClick={() => handleSaveTransaction('TEMPORARY')} className="!text-orange-500 !border-orange-500 hover:!bg-orange-50 dark:hover:!bg-orange-900/30 !py-0.5 !h-6">
                                                {t('تبدیل به موقت', 'Set Temporary')}
                                            </Button>
                                        )}
                                        {(headerData.status || 'DRAFT') === 'TEMPORARY' && access.canEdit && (
                                            <Button variant="outline" size="sm" onClick={() => handleSaveTransaction('DRAFT')} className="!text-slate-600 !border-slate-500 hover:!bg-slate-50 dark:hover:!bg-slate-800 !py-0.5 !h-6">
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
                        title={itemsCardTitle}
                        action={itemsCardAction}
                        isCollapsible={true}
                        noPadding={true}
                        className="border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col min-h-[350px] relative z-10"
                        headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
                        language={language}
                    >
                        <div className="flex-1 w-full p-1 relative min-h-[300px] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col min-w-0">
                            <TransactionMainGrid 
                                ref={gridRef}
                                itemsData={itemsData} 
                                onItemsChange={setItemsData} 
                                lookups={lookups} 
                                isReadOnly={isReadOnly} 
                                formCode={formCode} 
                                language={language}
                                showToast={showToast}
                            />
                        </div>
                    </Card>
                </div>

                <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-50">
                    <Button variant="outline" size="sm" onClick={onClose}>{t('بستن', 'Close')}</Button>
                    {!isReadOnly && access.canEdit && <Button variant="primary" size="sm" icon={Check} onClick={() => handleSaveTransaction()} isLoading={isLoading}>{t('ثبت نهایی سند', 'Save Transaction')}</Button>}
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