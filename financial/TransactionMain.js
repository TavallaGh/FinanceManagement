/* Filename: financial/TransactionMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackComponent = () => null;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

  const safeComp = (moduleObj, compName) => {
      const comp = moduleObj && moduleObj[compName];
      if (typeof comp === 'function' || (comp && typeof comp === 'object' && comp.$$typeof)) return comp;
      if (comp && comp.default && (typeof comp.default === 'function' || comp.default.$$typeof)) return comp.default;
      return FallbackComponent;
  };

  const safeIcon = (moduleObj, iconName) => {
      const icon = moduleObj && moduleObj[iconName];
      if (typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof)) return icon;
      if (icon && icon.default && (typeof icon.default === 'function' || icon.default.$$typeof)) return icon.default;
      return FallbackIcon;
  };

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const Button = safeComp(Core, 'Button');
  const PageHeader = safeComp(Core, 'PageHeader');
  const EmptyState = safeComp(Core, 'EmptyState');
  const Badge = safeComp(Core, 'Badge');
  const Card = safeComp(Core, 'Card');

  const DSGrid = window.DSGrid || DS || {};
  const DataGrid = safeComp(DSGrid, 'DataGrid');
  const AdvancedFilter = safeComp(DSGrid, 'AdvancedFilter');

  const Forms = window.DSForms || DS || {};
  const AttachmentManager = safeComp(Forms, 'AttachmentManager');

  const Feedback = window.DSFeedback || window.DSOverlays || DS || {};
  const Modal = safeComp(Feedback, 'Modal');
  const Toast = safeComp(Feedback, 'Toast');

  const LucideIcons = window.LucideIcons || {};
  const FileText = safeIcon(LucideIcons, 'FileText');
  const Edit = safeIcon(LucideIcons, 'Edit');
  const Trash2 = safeIcon(LucideIcons, 'Trash2');
  const Copy = safeIcon(LucideIcons, 'Copy');
  const AlertTriangle = safeIcon(LucideIcons, 'AlertTriangle');
  const Paperclip = safeIcon(LucideIcons, 'Paperclip');
  const DollarSign = safeIcon(LucideIcons, 'DollarSign');
  const Printer = safeIcon(LucideIcons, 'Printer');
  const RefreshCw = safeIcon(LucideIcons, 'RefreshCw');
  const MessageSquare = safeIcon(LucideIcons, 'MessageSquare');

  const formatNumber = (num) => {
      if (!num && num !== 0) return '0';
      const parts = parseFloat(num).toFixed(2).toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts[1] === '00' ? parts[0] : parts.join('.');
  };

  const TransactionMain = ({ language = 'fa', formCode = 'FIN_TRANSACTION_MAIN' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const supabase = window.supabase;

    // read current user from session (same source used across the app)
    const sessionUserId = (() => {
      try {
        const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
        return JSON.parse(s).id || null;
      } catch(e) { return null; }
    })();

    const currentUserObj = window.NavigationSystem?.currentUser || {};
    const currentUserId = sessionUserId || currentUserObj.id || null;
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
        { value: 'FINAL', label: t('بررسی شده', 'Final') },
        { value: 'APPROVED', label: t('تایید شده', 'Approved') }
    ];

    // ترتیب مجاز تغییر وضعیت
    const STATUS_ORDER = ['DRAFT', 'TEMPORARY', 'FINAL', 'APPROVED'];
    const canTransitionTo = (from, to) => {
        if (from === 'APPROVED') return false; // وضعیت تایید شده قابل تغییر نیست
        if (to === 'DRAFT' && from === 'TEMPORARY') return true; // برگشت از موقت به یادداشت
        if (to === 'TEMPORARY' && from === 'FINAL') return true; // برگشت از بررسی شده به موقت
        // پیشرفت رو به جلو در ترتیب مجاز
        const fromIdx = STATUS_ORDER.indexOf(from);
        const toIdx = STATUS_ORDER.indexOf(to);
        return toIdx === fromIdx + 1;
    };

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    
    const [transactions, setTransactions] = useState([]);
    const [attachmentCounts, setAttachmentCounts] = useState({});
    const [gridState, setGridState] = useState(null);
    const [filters, setFilters] = useState({});
    const [usersMap, setUsersMap] = useState({});
    const [deptsMap, setDeptsMap] = useState({});
    const [lookups, setLookups] = useState({ accounts: [], costTypes: [], incomeTypes: [] });
    const [resolvedUserId, setResolvedUserId] = useState(currentUserId);
    const [userDepartmentId, setUserDepartmentId] = useState(null);
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState('CREATE');
    const [currentRecord, setCurrentRecord] = useState(null);
    
    const [commentModalState, setCommentModalState] = useState({ isOpen: false, record: null });
    const [commentedIds, setCommentedIds] = useState(new Set());
    const [filteredRecordId, setFilteredRecordId] = useState(null);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [attachModal, setAttachModal] = useState({ isOpen: false, record: null, files: [] });
    const [summaryModal, setSummaryModal] = useState({ isOpen: false, record: null });
    const [printModal, setPrintModal] = useState({ isOpen: false, transactionId: null });
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

    const fetchUsersAndResolveDepartment = useCallback(async () => {
        try {
            const { data: userData } = await supabase.from('sec_users').select('id, full_name, username, party_id');
            const uMap = {};
            (userData || []).forEach(u => {
                uMap[u.id] = `${u.full_name || u.username || ''}`.trim();
            });
            setUsersMap(uMap);

            // use session-based ID directly — no username fallback that could match wrong user
            const myId = currentUserId;
            setResolvedUserId(myId);

            const activeUserRecord = myId ? (userData || []).find(u => u.id === myId) : null;
            if (activeUserRecord && activeUserRecord.party_id) {
                const { data: personnelData } = await supabase
                    .from('fm_org_chart_personnel')
                    .select('node_id')
                    .eq('person_id', activeUserRecord.party_id)
                    .maybeSingle();
                
                if (personnelData && personnelData.node_id) {
                    setUserDepartmentId(personnelData.node_id);
                }
            }
        } catch (error) {
            console.error("Error in fetching user department relation:", error);
        }
    }, [supabase, currentUserId, currentUserObj.username, currentUserName]);

    const fetchLookups = useCallback(async () => {
        try {
            const [accRes, chartRes, costRes, incRes, deptNodesRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, parent_id, chart_id').eq('is_active', true),
                supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
                supabase.from('fm_org_chart_nodes').select('id, title')
            ]);

            const dMap = {};
            (deptNodesRes.data || []).forEach(d => {
                dMap[d.id] = d.title;
            });
            setDeptsMap(dMap);

            const activeCharts = chartRes.data || [];
            const activeChartIds = new Set(activeCharts.map(c => c.id));

            const buildPathsAndFilterLeafs = (items, charts = null) => {
                const parentIds = new Set(items.map(i => i.parent_id).filter(Boolean));
                return items.filter(i => {
                    if (parentIds.has(i.id)) return false; 
                    if (charts && !activeChartIds.has(i.chart_id)) return false; 
                    return true;
                }).map(i => {
                    const titleFa = i.title_fa || i.title;
                    const titleEn = i.title_en || i.title_fa || i.title;
                    let pathArr = [isRtl ? titleFa : titleEn]; 
                    let curr = i;
                    while (curr && curr.parent_id) {
                        const parent = items.find(p => p.id === curr.parent_id);
                        if (parent) {
                            const pTitleFa = parent.title_fa || parent.title;
                            const pTitleEn = parent.title_en || parent.title_fa || parent.title;
                            pathArr.unshift(isRtl ? pTitleFa : pTitleEn);
                            curr = parent;
                        } else break;
                    }
                    return {
                        ...i,
                        displayLabel: isRtl ? titleFa : titleEn,
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
    }, [supabase, isRtl]);

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

            // fetch which transactions have at least one comment
            if ((txData || []).length > 0) {
                const txIds = txData.map(r => String(r.id));
                const { data: commentRows } = await supabase
                    .from('sys_comments')
                    .select('entity_id')
                    .eq('entity_type', 'TRANSACTION_MAIN')
                    .in('entity_id', txIds);
                if (commentRows) {
                    setCommentedIds(new Set(commentRows.map(r => r.entity_id)));
                }
            }

        } catch (error) {
            showToast(t('خطا در دریافت لیست تراکنش‌ها', 'Error fetching transactions'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, t]);

    useEffect(() => {
        if (access.canView) {
            fetchUsersAndResolveDepartment();
            fetchLookups();
            fetchData();
        }
    }, [fetchUsersAndResolveDepartment, fetchLookups, fetchData, access.canView]);

    useEffect(() => {
        const handleFilterToRecord = (e) => {
            if (e.detail && e.detail.entity_type === 'TRANSACTION_MAIN') {
                setFilteredRecordId(String(e.detail.entity_id));
            }
        };
        window.addEventListener('filterToRecord', handleFilterToRecord);
        return () => window.removeEventListener('filterToRecord', handleFilterToRecord);
    }, []);

    const handleOpenForm = (mode, record = null) => {
        setFormMode(mode);
        if (mode === 'CREATE') {
            setCurrentRecord({
                department_id: userDepartmentId,
                registrar_id: resolvedUserId,
                document_date: new Date().toISOString().split('T')[0],
                status: 'DRAFT',
                transaction_type: 'GENERAL',
                fm_transaction_items: []
            });
        } else {
            setCurrentRecord(record);
        }
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
            // فیلتر رکوردهایی که تغییر وضعیت برایشان مجاز است
            const eligible = transactions.filter(tx => ids.includes(tx.id) && canTransitionTo(tx.status, newStatus));
            const skipped = ids.length - eligible.length;

            if (eligible.length === 0) {
                showToast(t('هیچ‌کدام از رکوردهای انتخابی امکان تغییر به این وضعیت را ندارند.', 'None of the selected records can transition to this status.'), 'warning');
                setIsLoading(false);
                return;
            }

            const eligibleIds = eligible.map(tx => tx.id);
            const now = new Date().toISOString();

            // آپدیت وضعیت (بدون فیلدهای metadata)
            const { error } = await supabase.from('fm_transactions').update({ status: newStatus }).in('id', eligibleIds);
            if (error) throw error;

            // آپدیت جداگانه فیلدهای metadata بررسی/تایید (graceful - در صورت نبود ستون‌ها fail نمی‌شود)
            const metaPayload = {};
            if (newStatus === 'FINAL') {
                metaPayload.reviewed_by = currentUserId || null;
                metaPayload.reviewed_at = now;
                metaPayload.reviewed_by_name = currentUserName;
            } else if (newStatus === 'APPROVED') {
                metaPayload.approved_by = currentUserId || null;
                metaPayload.approved_at = now;
                metaPayload.approved_by_name = currentUserName;
            } else if (newStatus === 'TEMPORARY') {
                metaPayload.reviewed_by = null;
                metaPayload.reviewed_at = null;
                metaPayload.reviewed_by_name = null;
            }
            if (Object.keys(metaPayload).length > 0) {
                const { error: metaError } = await supabase.from('fm_transactions').update(metaPayload).in('id', eligibleIds);
                if (metaError) {
                    console.warn('متادیتای بررسی/تایید ذخیره نشد (ستون‌های DB ممکن است اضافه نشده باشند):', metaError.message);
                }
            }

            const statusLabels = { DRAFT: 'یادداشت', TEMPORARY: 'موقت', FINAL: 'بررسی شده', APPROVED: 'تایید شده' };
            const msg = skipped > 0
                ? t(`وضعیت ${eligible.length} سند تغییر کرد. ${skipped} سند به دلیل ترتیب وضعیت قابل تغییر نبود.`, `${eligible.length} records updated. ${skipped} skipped due to invalid transition.`)
                : t('وضعیت با موفقیت تغییر کرد.', 'Status updated.');
            showToast(msg, skipped > 0 ? 'warning' : 'success');
            await logAction('bulk_status_update', 'BULK_UPDATE', `تغییر وضعیت ${eligible.length} سند به ${statusLabels[newStatus] || newStatus} توسط ${currentUserName}`);
            fetchData();
        } catch (error) {
            showToast(t('خطا در تغییر وضعیت.', 'Error updating status.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const resolveRates = (ratesMap, currency) => {
        let toUsd = 1;
        if (currency !== 'USD') {
            const direct = ratesMap[`${currency}_USD`];
            if (direct) {
                toUsd = parseFloat(direct);
            } else {
                const inverse = ratesMap[`USD_${currency}`];
                if (inverse) toUsd = 1 / parseFloat(inverse);
            }
        }
        let usdToIrr = parseFloat(ratesMap['USD_IRR'] || 1);
        if (!ratesMap['USD_IRR'] && ratesMap['IRR_USD']) {
            usdToIrr = 1 / parseFloat(ratesMap['IRR_USD']);
        }
        return { toUsd, usdToIrr };
    };

    const handleBulkUpdateRates = async (ids) => {
        setIsLoading(true);
        try {
            // فقط تراکنش‌های یادداشت یا موقت قابل بروزرسانی نرخ هستند
            const selectedTxs = transactions.filter(tx => ids.includes(tx.id) && (tx.status === 'DRAFT' || tx.status === 'TEMPORARY'));
            if (selectedTxs.length === 0) {
                showToast(t('تراکنش‌های بررسی شده یا تایید شده امکان بروزرسانی نرخ ارز را ندارند.', 'Reviewed or Approved transactions cannot have exchange rates updated.'), 'warning');
                setIsLoading(false);
                return;
            }

            const uniqueDates = [...new Set(selectedTxs.map(tx => tx.document_date).filter(Boolean))];
            const ratesByDate = {};
            for (const date of uniqueDates) {
                const formattedDate = date.replace(/\//g, '-');
                const { data } = await supabase.from('fm_currency_rates')
                    .select('base_currency, target_currency, rate, rate_date')
                    .lte('rate_date', formattedDate)
                    .order('rate_date', { ascending: false });
                const latestRates = {};
                (data || []).forEach(r => {
                    const key = `${r.base_currency}_${r.target_currency}`;
                    if (!latestRates[key]) latestRates[key] = r.rate;
                });
                ratesByDate[date] = latestRates;
            }

            let updatedCount = 0;
            for (const tx of selectedTxs) {
                const ratesMap = ratesByDate[tx.document_date] || {};
                for (const item of (tx.fm_transaction_items || [])) {
                    const cur = item.currency || 'IRR';
                    const { toUsd, usdToIrr } = resolveRates(ratesMap, cur);
                    const dep = parseFloat(item.deposit_amount || 0);
                    const wid = parseFloat(item.withdrawal_amount || 0);
                    const val = dep > 0 ? dep : wid;
                    const amtUsd = val * toUsd;
                    const amtIrr = amtUsd * usdToIrr;
                    const { error } = await supabase.from('fm_transaction_items').update({
                        exchange_rate_to_usd: toUsd,
                        exchange_rate_usd_to_irr: usdToIrr,
                        amount_usd: amtUsd,
                        amount_irr: amtIrr
                    }).eq('id', item.id);
                    if (!error) updatedCount++;
                }
            }

            showToast(t(`${updatedCount} قلم تراکنش با آخرین نرخ‌های ارز بروز شد.`, `${updatedCount} items updated with latest exchange rates.`));
            await logAction('bulk_update_rates', 'BULK', `بروزرسانی نرخ ارز ${selectedTxs.length} سند (${updatedCount} قلم) توسط ${currentUserName}`);
            fetchData();
        } catch (error) {
            showToast(t('خطا در بروزرسانی نرخ ارزها.', 'Error updating exchange rates.'), 'error');
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

    const openSummary = (record) => {
        setSummaryModal({ isOpen: true, record: record });
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
        { field: 'reference_code', header_fa: 'عطف', header_en: 'Ref', width: '70px', render: (val) => React.createElement('span', { className: "font-bold text-slate-700 dark:text-slate-300" }, val || '-') },
        { field: 'document_code', header_fa: 'کد سند', header_en: 'Doc Code', width: '120px', render: (val) => React.createElement('span', { className: "text-indigo-600 dark:text-indigo-400 font-bold" }, val) },
        { field: 'daily_number', header_fa: 'روزانه', header_en: 'Daily', width: '70px' },
        { field: 'document_date', header_fa: 'تاریخ سند', header_en: 'Date', width: '90px', type: 'date' },
        { field: 'transaction_type', header_fa: 'نوع تراکنش', header_en: 'Type', width: '100px', render: (val) => TRANSACTION_TYPES.find(x => x.value === val)?.label || val },
        { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '95px', render: (val) => {
            const s = STATUS_OPTIONS.find(x => x.value === val);
            const colors = { DRAFT: 'slate', TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' };
            return React.createElement(Badge, { variant: colors[val] || 'gray', size: "sm" }, s ? s.label : val);
        }},
        { field: 'registrar_id', header_fa: 'ثبت کننده', header_en: 'Registrar', width: '110px', render: (val) => {
            if (!val || val === '00000000-0000-0000-0000-000000000000') return React.createElement('span', { className: "text-[12px] text-slate-500" }, t('سیستمی', 'System'));
            return React.createElement('span', { className: "text-[12px] truncate font-medium text-slate-700 dark:text-slate-300 block" }, usersMap[val] || val);
        }},
        { field: 'department_id', header_fa: 'دپارتمان', header_en: 'Department', width: '120px', render: (val) => {
            return React.createElement('span', { className: "text-[12px] truncate font-medium text-slate-600 dark:text-slate-400 block" }, deptsMap[val] || val || '-');
        }},
        { field: 'description', header_fa: 'شرح سربرگ', header_en: 'Description', width: 'auto', render: (val) => React.createElement('span', { className: "text-[12px] truncate block max-w-xs", title: val }, val || '-') }
    ], [usersMap, deptsMap, t]);

    const accountLovColumns = [
        { field: 'chart_name', header_fa: 'ساختار حساب', header_en: 'Chart', width: '120px' },
        { field: 'code', header_fa: 'کد حساب', header_en: 'Account Code', width: '100px' },
        { field: 'displayLabel', header_fa: 'عنوان حساب', header_en: 'Account Title', width: 'auto', render: (val, row) => React.createElement('div', { className: "flex flex-col" },
            React.createElement('span', { className: "font-bold text-slate-800 dark:text-slate-200" }, val),
            row.pathTitle && React.createElement('span', { className: "text-[10px] text-slate-500 truncate", title: row.pathTitle }, row.pathTitle)
        )}
    ];

    const costLovColumns = [
        { field: 'code', header_fa: 'کد هزینه', header_en: 'Cost Code', width: '100px' },
        { field: 'displayLabel', header_fa: 'عنوان هزینه', header_en: 'Cost Title', width: 'auto', render: (val, row) => React.createElement('div', { className: "flex flex-col" },
            React.createElement('span', { className: "font-bold text-slate-800 dark:text-slate-200" }, val),
            row.pathTitle && React.createElement('span', { className: "text-[10px] text-slate-500 truncate", title: row.pathTitle }, row.pathTitle)
        )}
    ];

    const incomeLovColumns = [
        { field: 'code', header_fa: 'کد درآمد', header_en: 'Income Code', width: '100px' },
        { field: 'displayLabel', header_fa: 'عنوان درآمد', header_en: 'Income Title', width: 'auto', render: (val, row) => React.createElement('div', { className: "flex flex-col" },
            React.createElement('span', { className: "font-bold text-slate-800 dark:text-slate-200" }, val),
            row.pathTitle && React.createElement('span', { className: "text-[10px] text-slate-500 truncate", title: row.pathTitle }, row.pathTitle)
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
        { 
            id: 'comment',
            icon: MessageSquare,
            tooltip: t('کامنت‌ها', 'Comments'),
            onClick: (row) => setCommentModalState({ isOpen: true, record: row }),
            className: (row) => commentedIds.has(String(row.id)) ? 'text-blue-500 hover:text-blue-600' : 'text-slate-400 hover:text-blue-600'
        },
        { 
            id: 'print', 
            icon: Printer, 
            tooltip: t('چاپ سند', 'Print Document'), 
            onClick: (row) => setPrintModal({ isOpen: true, transactionId: row.id }), 
            requiredAccess: 'view', 
            className: 'text-blue-500 hover:text-blue-600' 
        },
        { id: 'summary', icon: DollarSign, tooltip: t('خلاصه ارزی', 'Currency Summary'), onClick: (row) => openSummary(row), className: 'text-indigo-500 hover:text-indigo-600' },
        { id: 'attach', icon: Paperclip, tooltip: t('پیوست‌ها', 'Attachments'), onClick: (row) => openAttachments(row), className: (row) => (attachmentCounts[row.id] > 0 ? '!text-indigo-600 hover:!text-indigo-700' : '!text-slate-400 hover:!text-slate-600') },
        { id: 'copy', icon: Copy, tooltip: t('کپی سند', 'Duplicate Document'), onClick: (row) => handleOpenForm('COPY', row), requiredAccess: 'create', className: 'text-emerald-600 hover:text-emerald-700' },
        { id: 'update', icon: Edit, tooltip: t('مشاهده/ویرایش', 'View/Edit'), onClick: (row) => handleOpenForm('EDIT', row), requiredAccess: 'view' },
        { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete Document'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), requiredAccess: 'delete', className: 'text-red-500 hover:text-red-600' }
    ];

    const CheckCircle = safeIcon(LucideIcons, 'CheckCircle');
    const CheckSquare = safeIcon(LucideIcons, 'CheckSquare');
    const RotateCcw = safeIcon(LucideIcons, 'RotateCcw');

    const bulkActions = [
        { label: t('تغییر به موقت', 'Set Temporary'), icon: FileText, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('TEMPORARY', ids) },
        { label: t('تغییر به یادداشت', 'Set Draft'), icon: Edit, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('DRAFT', ids) },
        { label: t('تبدیل به بررسی شده', 'Set Final'), icon: CheckSquare, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('FINAL', ids), className: 'text-blue-600 dark:text-blue-400' },
        { label: t('تبدیل به تایید شده', 'Set Approved'), icon: CheckCircle, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('APPROVED', ids), className: 'text-emerald-600 dark:text-emerald-400' },
        { label: t('برگشت به موقت', 'Revert to Temporary'), icon: RotateCcw, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkStatusChange('TEMPORARY', ids), className: 'text-orange-500 dark:text-orange-400' },
        { label: t('بروزرسانی نرخ ارز', 'Update Exchange Rates'), icon: RefreshCw, variant: 'outline', requiredAccess: 'edit', onClick: (ids) => handleBulkUpdateRates(ids), className: 'text-indigo-600 dark:text-indigo-400' },
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

    const DetailsModal = safeComp(window, 'TransactionMainDetails');
    const TransactionSummaryModal = safeComp(window, 'TransactionSummary');
    const { CommentModal } = window.DSComments || {};
    
    const isAttachReadOnly = attachModal.record && (attachModal.record.status === 'FINAL' || attachModal.record.status === 'APPROVED');

    return React.createElement('div', { className: "p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900", dir: isRtl ? 'rtl' : 'ltr' },
        React.createElement(PageHeader, {
            title: t('مدیریت تراکنش‌ها', 'Transactions Management'),
            icon: FileText,
            language: language,
            description: t('ثبت و پیگیری اسناد مالی چندسطری ارزی', 'Manage multi-currency financial documents'),
            breadcrumbs: [{ label: t('مدیریت مالی', 'Financial Setup') }, { label: t('تراکنش‌ها', 'Transactions') }],
            viewConfig: viewConfig,
            notifFilter: filteredRecordId ? { isActive: true, onClear: () => setFilteredRecordId(null) } : null
        }),

        React.createElement('div', { className: "flex-1 min-h-0 flex flex-col gap-2 mt-4 overflow-hidden" },
            React.createElement(AdvancedFilter, {
                fields: filterFields,
                initialValues: filters,
                onFilter: setFilters,
                onClear: () => setFilters({}),
                language: language,
                columns: 6
            }),
            React.createElement('div', { className: "flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden" },
                React.createElement(DataGrid, {
                    data: filteredRecordId ? filteredTransactions.filter(r => String(r.id) === filteredRecordId) : filteredTransactions,
                    columns: columns,
                    language: language,
                    formCode: formCode,
                    gridState: gridState,
                    onGridStateChange: setGridState,
                    onAdd: access.canCreate ? () => handleOpenForm('CREATE') : undefined,
                    onRowDoubleClick: (row) => handleOpenForm('EDIT', row),
                    selectable: true,
                    actions: gridActions,
                    bulkActions: bulkActions,
                    isLoading: isLoading,
                    actionWidth: '220px'
                })
            )
        ),

        isFormModalOpen && React.createElement(DetailsModal, {
            isOpen: isFormModalOpen,
            onClose: () => setIsFormModalOpen(false),
            onSuccess: handleModalSuccess,
            formMode: formMode,
            initialRecord: currentRecord,
            language: language,
            formCode: formCode
        }),

        React.createElement(Modal, {
            isOpen: deleteConfirm.isOpen,
            onClose: () => setDeleteConfirm({ isOpen: false, type: null, data: null }),
            title: t('تایید عملیات حذف', 'Confirm Deletion'),
            language: language,
            width: "max-w-sm"
        },
            React.createElement(EmptyState, {
                icon: AlertTriangle,
                title: t('هشدار', 'Warning'),
                description: deleteConfirm.type === 'bulk' ? t(`آیا از حذف ${deleteConfirm.data?.length} سند اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} documents?`) : t(`آیا از حذف این سند اطمینان دارید؟`, `Delete this document?`),
                action: React.createElement('div', { className: "flex gap-2 w-full mt-4 px-4" },
                    React.createElement(Button, { variant: "outline", size: "sm", className: "flex-1", onClick: () => setDeleteConfirm({ isOpen: false, type: null, data: null }) }, t('انصراف', 'Cancel')),
                    React.createElement(Button, { variant: "danger", size: "sm", onClick: executeDelete, isLoading: isLoading, className: "flex-1" }, t('تایید حذف', 'Confirm'))
                )
            })
        ),

        React.createElement(Modal, {
            isOpen: attachModal.isOpen,
            onClose: () => setAttachModal({ isOpen: false, record: null, files: [] }),
            title: t('پیوست‌های سند', 'Document Attachments'),
            language: language,
            width: "max-w-xl"
        },
            React.createElement('div', { className: "p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg" },
                React.createElement('div', { className: "bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-800/50 shrink-0" },
                    React.createElement('span', { className: "text-[12px] font-bold text-indigo-800 dark:text-indigo-300" }, attachModal.record?.document_code),
                    isAttachReadOnly && React.createElement(Badge, { variant: "slate", size: "sm" }, t('فقط خواندنی', 'Read Only'))
                ),
                React.createElement('div', { className: "flex-1 overflow-hidden min-h-[300px] rounded-lg" },
                    React.createElement(AttachmentManager, {
                        files: attachModal.files,
                        onUpload: handleFileUpload,
                        onDelete: handleDeleteAttachment,
                        onDownload: (f) => window.open(f.file_url, '_blank'),
                        readOnly: isAttachReadOnly,
                        isUploading: isUploading,
                        language: language,
                        formCode: formCode
                    })
                )
            ),
            React.createElement('div', { className: "p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end rounded-b-lg" },
                React.createElement(Button, { variant: "primary", size: "sm", onClick: () => setAttachModal({ isOpen: false, record: null, files: [] }) }, t('بستن', 'Close'))
            )
        ),

        React.createElement(TransactionSummaryModal, {
            isOpen: summaryModal.isOpen,
            onClose: () => setSummaryModal({ isOpen: false, record: null }),
            record: summaryModal.record,
            lookups: lookups,
            language: language,
            formCode: formCode
        }),

        printModal.isOpen && window.TransactionPrint ? React.createElement(window.TransactionPrint, {
            transactionId: printModal.transactionId,
            onClose: () => setPrintModal({ isOpen: false, transactionId: null }),
            language: language
        }) : null,

        CommentModal && commentModalState.isOpen ? React.createElement(CommentModal, {
            isOpen: commentModalState.isOpen,
            onClose: () => { setCommentModalState({ isOpen: false, record: null }); fetchData(); },
            entityType: 'TRANSACTION_MAIN',
            entityId: commentModalState.record ? String(commentModalState.record.id) : '',
            entityTitle: commentModalState.record ? `${t('کد:', 'Code:')} ${commentModalState.record.document_code || '-'}  |  ${t('شرح:', 'Desc:')} ${commentModalState.record.description || '-'}` : '',
            formTitle: t('ثبت تراکنش', 'Transaction'),
            formComponent: 'TransactionMain',
            language: language
        }) : null,

        React.createElement(Toast, {
            isVisible: toast.isVisible,
            message: toast.message,
            type: toast.type,
            onClose: () => setToast(prev => ({ ...prev, isVisible: false }))
        })
    );
  };

  TransactionMain.formCode = 'FIN_TRANSACTION_MAIN';
  window.TransactionMain = TransactionMain;
})();