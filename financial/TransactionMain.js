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
  const FileSpreadsheet = safeIcon(LucideIcons, 'FileSpreadsheet');
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
    const calendarMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : (isRtl ? 'jalali' : 'gregorian');
    const dateLocale = calendarMode === 'jalali' ? 'fa-IR-u-nu-latn' : 'en-US';

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
    const [lookups, setLookups] = useState({ accounts: [], costTypes: [], incomeTypes: [], costBenefitCenters: [] });
    const [resolvedUserId, setResolvedUserId] = useState(currentUserId);
    const [userDepartmentId, setUserDepartmentId] = useState(null);
    
    const [currentView, setCurrentView] = useState('list');
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
            const [accRes, chartRes, costRes, incRes, deptNodesRes, cbcRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, parent_id, chart_id').eq('is_active', true),
                supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
                supabase.from('fm_org_chart_nodes').select('id, title'),
                supabase.from('fm_cost_benefit_centers').select('id, title_fa, title_en, center_kind, is_cost_center, is_benefit_center, is_active, manager:parties(id, first_name, last_name), office:fm_org_offices(id, title)')
            ]);

            const costBenefitCenters = (cbcRes.data || []).map(r => ({
                id: r.id,
                titleFa: r.title_fa || '',
                titleEn: r.title_en || '',
                centerKind: r.center_kind || '',
                isCostCenter: r.is_cost_center ?? false,
                isBenefitCenter: r.is_benefit_center ?? false,
                isActive: r.is_active ?? true,
                managerName: r.manager ? `${r.manager.first_name || ''} ${r.manager.last_name || ''}`.trim() : '',
                officeName: r.office?.title || ''
            }));

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
                incomeTypes: buildPathsAndFilterLeafs(incRes.data || []),
                costBenefitCenters
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
                    .eq('entity_type', 'fm_transactions')
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
            if (e.detail && e.detail.form_component === 'TransactionMain') {
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
        setCurrentView('form');
    };

    const handleModalSuccess = () => {
        setCurrentView('list');
        fetchData();
    };

    const isLocked = (tx) => tx.status === 'FINAL' || tx.status === 'APPROVED';

    const executeDelete = async () => {
        setIsLoading(true);
        try {
            if (deleteConfirm.type === 'single') {
                // جلوگیری از حذف سندهای بررسی شده / تایید شده
                if (isLocked(deleteConfirm.data)) {
                    showToast(t('سندهای بررسی شده یا تایید شده قابل حذف نیستند.', 'Reviewed or approved documents cannot be deleted.'), 'warning');
                    setDeleteConfirm({ isOpen: false, type: null, data: null });
                    setIsLoading(false);
                    return;
                }
                const { error } = await supabase.from('fm_transactions').delete().eq('id', deleteConfirm.data.id);
                if (error) throw error;
                await logAction('delete_transaction', deleteConfirm.data.id, `حذف تراکنش: ${deleteConfirm.data.document_code}`);
            } else if (deleteConfirm.type === 'bulk') {
                // فیلتر کردن سندهای قابل حذف
                const deletable = transactions.filter(tx => deleteConfirm.data.includes(tx.id) && !isLocked(tx));
                const skipped = deleteConfirm.data.length - deletable.length;
                if (deletable.length === 0) {
                    showToast(t('هیچ‌کدام از سندهای انتخابی قابل حذف نیستند. سندهای بررسی شده یا تایید شده قابل حذف نمی‌باشند.', 'None of the selected documents can be deleted.'), 'warning');
                    setDeleteConfirm({ isOpen: false, type: null, data: null });
                    setIsLoading(false);
                    return;
                }
                const deletableIds = deletable.map(tx => tx.id);
                const { error } = await supabase.from('fm_transactions').delete().in('id', deletableIds);
                if (error) throw error;
                await logAction('bulk_delete_transactions', 'BULK_DELETE', `حذف گروهی ${deletableIds.length} تراکنش${skipped > 0 ? ` (${skipped} سند قفل شده نادیده گرفته شد)` : ''}`);
                if (skipped > 0) {
                    showToast(t(`${deletableIds.length} سند حذف شد. ${skipped} سند بررسی/تایید شده نادیده گرفته شد.`, `${deletableIds.length} deleted. ${skipped} locked documents were skipped.`), 'warning');
                    fetchData();
                    setDeleteConfirm({ isOpen: false, type: null, data: null });
                    setIsLoading(false);
                    return;
                }
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
            // نام مطمئن كاربر از usersMap
            const actorName = (currentUserId && usersMap[currentUserId]) ? usersMap[currentUserId] : currentUserName;

            const metaPayload = {};
            if (newStatus === 'FINAL') {
                metaPayload.reviewed_by = currentUserId || null;
                metaPayload.reviewed_at = now;
                metaPayload.reviewed_by_name = actorName;
            } else if (newStatus === 'APPROVED') {
                metaPayload.approved_by = currentUserId || null;
                metaPayload.approved_at = now;
                metaPayload.approved_by_name = actorName;
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
        const normDate = (d) => d ? String(d).replace(/\//g, '-').substring(0, 10) : null;
        return transactions.filter(tx => {
            // date range filter
            if (filters.date_from || filters.date_to) {
                const dateField = filters.date_type || 'document_date';
                const txDate = normDate(tx[dateField]);
                if (!txDate) return false;
                if (filters.date_from && txDate < normDate(filters.date_from)) return false;
                if (filters.date_to && txDate > normDate(filters.date_to)) return false;
            }
            if (filters.account_id || filters.transaction_action || filters.transaction_group || filters.cost_type_id || filters.income_type_id || filters.center_id) {
                const hasMatchingItem = (tx.fm_transaction_items || []).some(item => {
                    if (filters.account_id && item.account_id !== filters.account_id.id) return false;
                    if (filters.transaction_action && item.transaction_action !== filters.transaction_action) return false;
                    if (filters.transaction_group && item.transaction_group !== filters.transaction_group) return false;
                    if (filters.cost_type_id && item.cost_type_id !== filters.cost_type_id.id) return false;
                    if (filters.income_type_id && item.income_type_id !== filters.income_type_id.id) return false;
                    if (filters.center_id && String(item.center_id) !== String(filters.center_id.id)) return false;
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
        { field: 'created_at', header_fa: 'زمان ثبت', header_en: 'Registered At', width: '100px', render: (val) => {
            if (!val) return React.createElement('span', { className: 'text-slate-400 text-[11px]' }, '-');
            try {
                const d = new Date(val);
                const datePart = new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
                const timePart = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
                return React.createElement('div', { className: 'flex flex-col leading-tight', dir: 'ltr' },
                    React.createElement('span', { className: 'text-[11px] font-sans text-slate-700 dark:text-slate-300' }, datePart),
                    React.createElement('span', { className: 'text-[10px] font-sans text-slate-400 dark:text-slate-500' }, timePart)
                );
            } catch(e) { return React.createElement('span', { className: 'text-[11px]' }, val); }
        }},
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
        { field: 'description', header_fa: 'شرح سربرگ', header_en: 'Description', width: '160px', render: (val) => React.createElement('span', { className: "text-[12px] truncate block max-w-xs", title: val }, val || '-') },
        { field: 'reviewed_by_name', header_fa: 'بررسی‌کننده', header_en: 'Reviewed By', width: '110px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300' }, val || '-') },
        { field: 'reviewed_at', header_fa: 'تاریخ بررسی', header_en: 'Reviewed At', width: '115px', render: (val) => {
            if (!val) return React.createElement('span', { className: 'text-slate-400 text-[11px]' }, '-');
            try { return React.createElement('span', { className: 'text-[11px] font-sans block', dir: 'ltr' }, new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(val))); }
            catch(e) { return React.createElement('span', { className: 'text-[11px]' }, val); }
        }},
        { field: 'approved_by_name', header_fa: 'تاییدکننده', header_en: 'Approved By', width: '110px', render: (val) => React.createElement('span', { className: 'text-[12px] truncate block font-medium text-slate-700 dark:text-slate-300' }, val || '-') },
        { field: 'approved_at', header_fa: 'تاریخ تایید', header_en: 'Approved At', width: '115px', render: (val) => {
            if (!val) return React.createElement('span', { className: 'text-slate-400 text-[11px]' }, '-');
            try { return React.createElement('span', { className: 'text-[11px] font-sans block', dir: 'ltr' }, new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(val))); }
            catch(e) { return React.createElement('span', { className: 'text-[11px]' }, val); }
        }},
        { field: '_total_usd', header_fa: 'جمع (USD)', header_en: 'Total (USD)', width: '110px', render: (_, row) => {
            const items = row.fm_transaction_items || [];
            let depUsd = 0, widUsd = 0;
            items.forEach(item => {
                const dep = parseFloat(item.deposit_amount || 0);
                const wid = parseFloat(item.withdrawal_amount || 0);
                const val = dep > 0 ? dep : wid;
                const toUsd = parseFloat(item.exchange_rate_to_usd || 0);
                const usd = toUsd > 0 ? val * toUsd : parseFloat(item.amount_usd || 0);
                if (item.transaction_action === 'DEPOSIT') depUsd += usd;
                else widUsd += usd;
            });
            if (depUsd === 0 && widUsd === 0) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[11px]' }, '—');
            return React.createElement('div', { className: 'flex flex-col gap-0.5', dir: 'ltr' },
                depUsd > 0 ? React.createElement('span', { className: 'text-[11px] font-medium text-emerald-600 dark:text-emerald-500' }, formatNumber(depUsd)) : null,
                widUsd > 0 ? React.createElement('span', { className: 'text-[11px] font-medium text-rose-500 dark:text-rose-400' }, formatNumber(widUsd)) : null
            );
        }},
        { field: '_total_irr', header_fa: 'جمع (IRR)', header_en: 'Total (IRR)', width: '130px', render: (_, row) => {
            const items = row.fm_transaction_items || [];
            let depIrr = 0, widIrr = 0;
            items.forEach(item => {
                const dep = parseFloat(item.deposit_amount || 0);
                const wid = parseFloat(item.withdrawal_amount || 0);
                const val = dep > 0 ? dep : wid;
                const toUsd = parseFloat(item.exchange_rate_to_usd || 0);
                const usdToIrr = parseFloat(item.exchange_rate_usd_to_irr || 0);
                const irr = toUsd > 0 && usdToIrr > 0 ? val * toUsd * usdToIrr : parseFloat(item.amount_irr || 0);
                if (item.transaction_action === 'DEPOSIT') depIrr += irr;
                else widIrr += irr;
            });
            if (depIrr === 0 && widIrr === 0) return React.createElement('span', { className: 'text-slate-300 dark:text-slate-600 text-[11px]' }, '—');
            return React.createElement('div', { className: 'flex flex-col gap-0.5', dir: 'ltr' },
                depIrr > 0 ? React.createElement('span', { className: 'text-[11px] font-medium text-emerald-600 dark:text-emerald-500' }, formatNumber(depIrr)) : null,
                widIrr > 0 ? React.createElement('span', { className: 'text-[11px] font-medium text-rose-500 dark:text-rose-400' }, formatNumber(widIrr)) : null
            );
        }}
    ], [usersMap, deptsMap, t, dateLocale]);

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

    const CENTER_KIND_LABELS = {
        DEPARTMENT: { fa: 'دپارتمان', en: 'Department' },
        TEAM: { fa: 'تیم', en: 'Team' },
        PROJECT: { fa: 'پروژه', en: 'Project' },
        OTHER: { fa: 'سایر', en: 'Other' }
    };

    const centerLovColumns = [
        { field: isRtl ? 'titleFa' : 'titleEn', header_fa: 'عنوان مرکز', header_en: 'Center Title', width: '200px', render: (val, row) => React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('span', { className: 'font-bold text-slate-800 dark:text-slate-200' }, val || row.titleFa),
            !row.isActive && React.createElement('span', { className: 'text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-medium shrink-0' }, t('غیرفعال', 'Inactive'))
        )},
        { field: 'managerName', header_fa: 'مسئول', header_en: 'Manager', width: '150px' },
        { field: 'centerKind', header_fa: 'گروه مرکز', header_en: 'Center Group', width: '110px', render: (val) => {
            const lbl = CENTER_KIND_LABELS[val];
            return React.createElement('span', null, lbl ? (isRtl ? lbl.fa : lbl.en) : val);
        }},
        { field: 'officeName', header_fa: 'محل مرکز', header_en: 'Location', width: '150px' }
    ];

    const filterFields = [
        { name: 'account_id', label: t('حساب مرتبط', 'Account'), type: 'lov', lovData: lookups.accounts, lovColumns: accountLovColumns, dropdownWidth: 'min-w-[600px]' },
        { name: 'transaction_action', label: t('نوع (واریز/برداشت)', 'Action'), type: 'select', options: TRANSACTION_ACTIONS },
        { name: 'transaction_group', label: t('گروه', 'Group'), type: 'select', options: TRANSACTION_GROUPS },
        { name: 'cost_type_id', label: t('نوع هزینه', 'Cost Type'), type: 'lov', lovData: lookups.costTypes, lovColumns: costLovColumns, dropdownWidth: 'min-w-[500px]' },
        { name: 'income_type_id', label: t('نوع درآمد', 'Income Type'), type: 'lov', lovData: lookups.incomeTypes, lovColumns: incomeLovColumns, dropdownWidth: 'min-w-[500px]' },
        { name: 'center_id', label: t('مرکز هزینه/درآمد', 'Cost/Income Center'), type: 'lov', lovData: lookups.costBenefitCenters, lovColumns: centerLovColumns, dropdownWidth: 'min-w-[620px]' },
        { name: 'date_type', label: t('نوع تاریخ', 'Date Field'), type: 'select', options: [
            { value: 'document_date', label: t('تاریخ تراکنش', 'Transaction Date') },
            { value: 'created_at', label: t('تاریخ ثبت', 'Registration Date') }
        ]},
        { name: 'date_from', label: t('از تاریخ', 'From Date'), type: 'date' },
        { name: 'date_to', label: t('تا تاریخ', 'To Date'), type: 'date' }
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
        { id: 'update', icon: Edit, tooltip: (row) => isLocked(row) ? t('مشاهده سند', 'View Document') : t('مشاهده/ویرایش', 'View/Edit'), onClick: (row) => handleOpenForm('EDIT', row), requiredAccess: 'view' },
        { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete Document'), onClick: (row) => { if (isLocked(row)) { showToast(t('سندهای بررسی شده یا تایید شده قابل حذف نیستند.', 'Locked documents cannot be deleted.'), 'warning'); return; } setDeleteConfirm({ isOpen: true, type: 'single', data: row }); }, requiredAccess: 'delete', className: (row) => isLocked(row) ? '!text-slate-300 dark:!text-slate-600 cursor-not-allowed' : 'text-red-500 hover:text-red-600' }
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

    const handleCustomExport = useCallback(() => {
        const TX_TYPE = { OPENING: t('افتتاحیه', 'Opening'), CLOSING: t('اختتامیه', 'Closing'), GENERAL: t('عمومی', 'General'), TRANSFER: t('انتقال', 'Transfer') };
        const TX_STATUS = { DRAFT: t('یادداشت', 'Draft'), TEMPORARY: t('موقت', 'Temporary'), FINAL: t('بررسی شده', 'Final'), APPROVED: t('تایید شده', 'Approved') };
        const TX_ACTION = { DEPOSIT: t('واریز', 'Deposit'), WITHDRAWAL: t('برداشت', 'Withdrawal') };
        const TX_GROUP = { COST: t('هزینه', 'Cost'), INCOME: t('درآمد', 'Income'), BALANCE: t('بالانس', 'Balance'), OTHER: t('سایر', 'Other') };

        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const formatDT = (val) => {
            if (!val) return '';
            try { return new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(val)); }
            catch(e) { return String(val); }
        };

        const headerCols = [
            t('کد تراکنش', 'Transaction Code'),
            t('تاریخ سند', 'Document Date'),
            t('زمان ثبت', 'Registered At'),
            t('نوع تراکنش', 'Type'),
            t('وضعیت', 'Status'),
            t('ثبت‌کننده', 'Registrar'),
            t('دپارتمان', 'Department'),
            t('شرح سربرگ', 'Description'),
            t('بررسی‌کننده', 'Reviewed By'),
            t('تاریخ بررسی', 'Reviewed At'),
            t('تاییدکننده', 'Approved By'),
            t('تاریخ تایید', 'Approved At'),
            t('جمع واریز (USD)', 'Total Deposit (USD)'),
            t('جمع برداشت (USD)', 'Total Withdrawal (USD)'),
            t('جمع واریز (IRR)', 'Total Deposit (IRR)'),
            t('جمع برداشت (IRR)', 'Total Withdrawal (IRR)'),
        ];
        const itemCols = [
            t('ردیف', 'Row'),
            t('حساب', 'Account'),
            t('نوع عملیات', 'Action'),
            t('گروه', 'Group'),
            t('نوع هزینه/درآمد', 'Cost/Income Type'),
            t('ارز', 'Currency'),
            t('واریز', 'Deposit'),
            t('برداشت', 'Withdrawal'),
            t('معادل دلار', 'Amount USD'),
            t('معادل ریال', 'Amount IRR'),
            t('شرح قلم', 'Item Desc'),
        ];

        const allCols = [...headerCols, ...itemCols];
        const dataToExport = filteredRecordId
            ? filteredTransactions.filter(r => String(r.id) === filteredRecordId)
            : filteredTransactions;

        const rows = [];
        dataToExport.forEach(tx => {
            const txItems = tx.fm_transaction_items || [];
            let txDepUsd = 0, txWidUsd = 0, txDepIrr = 0, txWidIrr = 0;
            txItems.forEach(item => {
                const usd = parseFloat(item.amount_usd || 0);
                const irr = parseFloat(item.amount_irr || 0);
                if (item.transaction_action === 'DEPOSIT') { txDepUsd += usd; txDepIrr += irr; }
                else { txWidUsd += usd; txWidIrr += irr; }
            });
            const hdr = [
                tx.document_code || '',
                tx.document_date || '',
                formatDT(tx.created_at),
                TX_TYPE[tx.transaction_type] || tx.transaction_type || '',
                TX_STATUS[tx.status] || tx.status || '',
                usersMap[tx.registrar_id] || '',
                deptsMap[tx.department_id] || '',
                tx.description || '',
                tx.reviewed_by_name || '',
                formatDT(tx.reviewed_at),
                tx.approved_by_name || '',
                formatDT(tx.approved_at),
                txDepUsd > 0 ? txDepUsd.toFixed(2) : '',
                txWidUsd > 0 ? txWidUsd.toFixed(2) : '',
                txDepIrr > 0 ? txDepIrr.toFixed(0) : '',
                txWidIrr > 0 ? txWidIrr.toFixed(0) : '',
            ];
            const items = tx.fm_transaction_items || [];
            if (items.length === 0) {
                rows.push([...hdr, '', '', '', '', '', '', '', '', '', '', ''].map(esc).join(','));
            } else {
                items.forEach(item => {
                    const acc = (lookups.accounts || []).find(a => String(a.id) === String(item.account_id));
                    const costT = (lookups.costTypes || []).find(c => String(c.id) === String(item.cost_type_id));
                    const incT = (lookups.incomeTypes || []).find(c => String(c.id) === String(item.income_type_id));
                    const subType = item.transaction_group === 'COST'
                        ? (costT ? (isRtl ? costT.title_fa : (costT.title_en || costT.title_fa)) : '')
                        : item.transaction_group === 'INCOME'
                        ? (incT ? (isRtl ? incT.title_fa : (incT.title_en || incT.title_fa)) : '')
                        : '';
                    const itemRow = [
                        item.row_number || '',
                        acc ? acc.displayLabel : (item.account_id || ''),
                        TX_ACTION[item.transaction_action] || item.transaction_action || '',
                        TX_GROUP[item.transaction_group] || item.transaction_group || '',
                        subType,
                        item.currency || '',
                        item.deposit_amount || '0',
                        item.withdrawal_amount || '0',
                        item.amount_usd || '0',
                        item.amount_irr || '0',
                        item.description || '',
                    ];
                    rows.push([...hdr, ...itemRow].map(esc).join(','));
                });
            }
        });

        const csv = '\uFEFF' + allCols.map(esc).join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `transactions_full_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredTransactions, filteredRecordId, usersMap, deptsMap, lookups, isRtl, t]);

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

    return React.createElement('div', { className: "h-full flex flex-col font-sans", dir: isRtl ? 'rtl' : 'ltr' },

        currentView === 'list' && React.createElement('div', { className: "p-4 h-full flex flex-col bg-slate-50/50 dark:bg-slate-900 overflow-hidden" },
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
                        onExport: handleCustomExport,
                        defaultHiddenCols: ['reference_code', 'daily_number', 'department_id', 'reviewed_by_name', 'reviewed_at', 'approved_by_name', 'approved_at'],
                        actionWidth: '220px'
                    })
                )
            )
        ),

        currentView === 'form' && currentRecord && React.createElement(DetailsModal, {
            key: `${formMode}-${currentRecord?.id || 'new'}`,
            isOpen: true,
            onClose: () => setCurrentView('list'),
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
            entityType: 'fm_transactions',
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