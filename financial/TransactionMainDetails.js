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

  const Grid = window.DSGrid || DS || {};
  const { DataGrid = FallbackComponent } = Grid;

  const Forms = window.DSForms || DS || {};
  const { TextField = FallbackComponent, SelectField = FallbackComponent, DatePicker = FallbackComponent, AttachmentManager = FallbackComponent } = Forms;

  const Feedback = window.DSFeedback || DS || {};
  const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

  function FallbackComponent() { return null; }

  const formatNumber = (num) => {
      if (!num && num !== 0) return '0';
      const parts = parseFloat(num).toFixed(2).toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts[1] === '00' ? parts[0] : parts.join('.');
  };

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
        { value: 'FINAL', label: t('بررسی شده', 'Final') },
        { value: 'APPROVED', label: t('تایید شده', 'Approved') }
    ];

    // ترتیب مجاز تغییر وضعیت
    const STATUS_ORDER = ['DRAFT', 'TEMPORARY', 'FINAL', 'APPROVED'];
    const canTransitionTo = (from, to) => {
        if (from === 'APPROVED') return false;
        if (to === 'DRAFT' && from === 'TEMPORARY') return true;
        if (to === 'TEMPORARY' && from === 'FINAL') return true;
        const fromIdx = STATUS_ORDER.indexOf(from);
        const toIdx = STATUS_ORDER.indexOf(to);
        return toIdx === fromIdx + 1;
    };

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    
    const [headerData, setHeaderData] = useState({});
    const [itemsData, setItemsData] = useState([]);
    const [copyWarning, setCopyWarning] = useState(null);

    const [attachModal, setAttachModal] = useState({ isOpen: false, record: null, files: [] });
    const [isUploading, setIsUploading] = useState(false);

    const [currencyRates, setCurrencyRates] = useState({});

    const gridRef = useRef(null);
    const hasInitialized = useRef(false);

    const [lookups, setLookups] = useState({
        accounts: [],
        leafAccounts: [],
        costTypes: [],
        incomeTypes: [],
        departments: [],
        usersMap: {},
        usersList: [],
        currencies: []
    });

    const isReadOnly = useMemo(() => {
        if (formMode === 'CREATE' || formMode === 'COPY') return false;
        if (!headerData.status) return false;
        // وضعیت بررسی شده (FINAL) یا تایید شده (APPROVED) قابل ویرایش نیست
        return headerData.status === 'FINAL' || headerData.status === 'APPROVED';
    }, [headerData.status, formMode]);

    const isAttachReadOnly = useMemo(() => {
        return attachModal.record && (attachModal.record.status === 'FINAL' || attachModal.record.status === 'APPROVED');
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
            const [accRes, chartRes, costRes, incRes, usersRes, personnelRes, nodesRes, currRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, chart_id').eq('is_active', true),
                supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
                supabase.from('sec_users').select('id, full_name, username, party_id'),
                supabase.from('fm_org_chart_personnel').select('node_id, person_id'),
                supabase.from('fm_org_chart_nodes').select('id, title'),
                supabase.from('fm_currencies').select('id, code, title')
            ]);
            
            const uMap = {};
            let myDeptId = '';
            let myDeptTitle = '';

            (usersRes.data || []).forEach(u => {
                uMap[u.id] = `${u.full_name || u.username || ''}`.trim();
            });

            let safeMyUserId = currentUserId;
            if (!safeMyUserId || safeMyUserId === '00000000-0000-0000-0000-000000000000') {
                const matchedMe = (usersRes.data || []).find(u => u.username === currentUserUsername || u.full_name === currentUserName);
                if (matchedMe) safeMyUserId = matchedMe.id;
            }

            const activeUserObj = (usersRes.data || []).find(u => u.id === safeMyUserId);
            if (activeUserObj && activeUserObj.party_id) {
                const personnelRecord = (personnelRes.data || []).find(p => p.person_id === activeUserObj.party_id);
                if (personnelRecord) {
                    const nodeRecord = (nodesRes.data || []).find(n => n.id === personnelRecord.node_id);
                    if (nodeRecord) {
                        myDeptId = nodeRecord.id;
                        myDeptTitle = nodeRecord.title;
                    }
                }
            }

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

            const nodesMap = {};
            (nodesRes.data || []).forEach(n => {
                nodesMap[n.id] = n.title;
            });

            const newLookups = {
                accounts: allAccounts,
                leafAccounts: leafAccs,
                costTypes: costLeafs,
                incomeTypes: incomeLeafs,
                usersMap: uMap,
                usersList: usersRes.data || [],
                currentUserDeptId: myDeptId,
                currentUserDeptTitle: myDeptTitle,
                currencies: currRes.data || [],
                departmentsMap: nodesMap
            };

            setLookups(newLookups);
            return newLookups;
        } catch (error) {
            showToast(t('خطا در دریافت اطلاعات پایه', 'Error fetching dependencies'), 'error');
            return null;
        }
    }, [supabase, showToast, t, currentUserId, currentUserName, currentUserUsername]);

    const generateFallbackCode = () => {
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
            setHasSaved(false);
            return;
        }
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        
        fetchDependencies().then(async (newLookups) => {
            if (!newLookups) return;

            const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '/');
            setCopyWarning(null);

            let safeFinalRegistrar = currentUserId;
            if (!safeFinalRegistrar || safeFinalRegistrar === '00000000-0000-0000-0000-000000000000') {
                const matchingUser = newLookups.usersList.find(u => u.username === currentUserUsername || u.full_name === currentUserName);
                if (matchingUser) safeFinalRegistrar = matchingUser.id;
            }

            let nextDocCode = '';
            if (formMode === 'CREATE' || formMode === 'COPY') {
                if (window.AutoNumberingService) {
                    try {
                        const preview = await window.AutoNumberingService.previewNext('TRANSACTIONS');
                        if (preview && preview.formattedCode) {
                            nextDocCode = preview.formattedCode;
                        } else if (typeof preview === 'string') {
                            nextDocCode = preview;
                        }
                    } catch (err) {
                        console.error('AutoNumbering Error:', err);
                    }
                }
                if (!nextDocCode) {
                    nextDocCode = generateFallbackCode();
                }
            }

            if (formMode === 'CREATE') {
                setHeaderData({
                    document_code: nextDocCode,
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
                setIsDirty(false);
                setHasSaved(false);
            } else if ((formMode === 'EDIT' || formMode === 'COPY') && initialRecord) {
                if (formMode === 'COPY') {
                    setCopyWarning(t(`هشدار: این سند کپی از سند ${initialRecord.document_code} می‌باشد و نیازمند بررسی و تغییرات است.`, `Warning: This is a copy of transaction ${initialRecord.document_code} and requires review.`));
                }
                
                const parsedDate = formMode === 'COPY' ? todayStr : (initialRecord.document_date ? initialRecord.document_date.replace(/-/g, '/') : todayStr);
                const finalDeptId = formMode === 'COPY' ? newLookups.currentUserDeptId : initialRecord.department_id;
                const finalDeptTitle = formMode === 'COPY' ? newLookups.currentUserDeptTitle : (newLookups.departmentsMap[initialRecord.department_id] || initialRecord.department_id || '');

                setHeaderData({
                    ...initialRecord,
                    id: formMode === 'COPY' ? undefined : initialRecord.id,
                    document_code: formMode === 'COPY' ? nextDocCode : initialRecord.document_code,
                    status: formMode === 'COPY' ? 'DRAFT' : initialRecord.status,
                    reference_code: formMode === 'COPY' ? '' : initialRecord.reference_code,
                    daily_number: formMode === 'COPY' ? '' : initialRecord.daily_number,
                    document_date: parsedDate,
                    registered_at: formMode === 'COPY' ? new Date().toISOString() : initialRecord.registered_at,
                    department_id: finalDeptId,
                    department_title: finalDeptTitle,
                    registrar_id: formMode === 'COPY' ? safeFinalRegistrar : initialRecord.registrar_id
                });
                
                const mappedItems = (initialRecord.fm_transaction_items || []).map(item => {
                    return {
                        ...item,
                        _tempId: crypto.randomUUID(),
                        id: formMode === 'COPY' ? undefined : item.id,
                        transaction_id: formMode === 'COPY' ? undefined : item.transaction_id,
                        deposit_amount: item.deposit_amount != null ? parseFloat(item.deposit_amount) : 0,
                        withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0
                    };
                }).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
                
                setItemsData(mappedItems);
                setIsDirty(formMode === 'COPY');
                setHasSaved(false);

                if (formMode === 'EDIT') {
                    loadAttachments(initialRecord.id);
                    setAttachModal(prev => ({ ...prev, record: initialRecord }));
                } else {
                    setAttachModal({ isOpen: false, record: null, files: [] });
                }
            }
        });
    }, [isOpen, formMode, initialRecord, fetchDependencies, currentUserId, currentUserName, currentUserUsername, t]);

    useEffect(() => {
        if (headerData.document_date && supabase) {
            const fetchRates = async () => {
                try {
                    const formattedDate = headerData.document_date.replace(/\//g, '-');
                    const { data } = await supabase.from('fm_currency_rates')
                        .select('base_currency, target_currency, rate, rate_date')
                        .lte('rate_date', formattedDate)
                        .order('rate_date', { ascending: false });
                    
                    const latestRates = {};
                    (data || []).forEach(r => {
                        const key = `${r.base_currency}_${r.target_currency}`;
                        if (!latestRates[key]) latestRates[key] = r.rate;
                    });
                    setCurrencyRates(latestRates);
                } catch (e) {}
            };
            fetchRates();
        }
    }, [headerData.document_date, supabase]);

    const getExchangeRates = useCallback((currency) => {
        let toUsd = 1;
        if (currency !== 'USD') {
            const direct = currencyRates[`${currency}_USD`];
            if (direct) {
                toUsd = direct;
            } else {
                const inverse = currencyRates[`USD_${currency}`];
                if (inverse) toUsd = 1 / inverse;
            }
        }
        
        let usdToIrr = currencyRates[`USD_IRR`] || 1;
        if (!currencyRates[`USD_IRR`] && currencyRates[`IRR_USD`]) {
             usdToIrr = 1 / currencyRates[`IRR_USD`];
        }
        
        return { toUsd, usdToIrr };
    }, [currencyRates]);

    const summaryStats = useMemo(() => {
        let totalDepUsd = 0, totalWidUsd = 0;
        
        itemsData.forEach(i => {
            const dep = parseFloat(String(i.deposit_amount || '0').replace(/,/g, '')) || 0;
            const wid = parseFloat(String(i.withdrawal_amount || '0').replace(/,/g, '')) || 0;
            const cur = i.currency || 'IRR';
            const { toUsd } = getExchangeRates(cur);
            
            const depUsd = dep * toUsd;
            const widUsd = wid * toUsd;
            
            totalDepUsd += depUsd;
            totalWidUsd += widUsd;
        });
        
        const diffUsd = totalDepUsd - totalWidUsd;

        return {
            totalDepUsd, totalWidUsd, diffUsd,
            isUnbalanced: Math.abs(diffUsd) >= 0.01
        };
    }, [itemsData, getExchangeRates]);

    const balanceInfo = useMemo(() => {
        if (headerData.transaction_type !== 'TRANSFER' || itemsData.length === 0 || isReadOnly) return { isUnbalanced: false, diff: 0 };
        return {
            isUnbalanced: summaryStats.isUnbalanced,
            diff: summaryStats.diffUsd
        };
    }, [summaryStats, headerData.transaction_type, isReadOnly, itemsData.length]);

    const validateTransactionLogic = (targetStatus) => {
        if (targetStatus === 'DRAFT') return true;

        if (!itemsData || itemsData.length === 0) {
            showToast(t('سند باید حداقل دارای یک قلم باشد.', 'Transaction must have at least one item.'), 'warning');
            return false;
        }

        let hasZeroItem = false;
        itemsData.forEach(i => {
            const dep = parseFloat(String(i.deposit_amount || '0').replace(/,/g, '')) || 0;
            const wid = parseFloat(String(i.withdrawal_amount || '0').replace(/,/g, '')) || 0;
            if (dep === 0 && wid === 0) hasZeroItem = true;
        });

        if (hasZeroItem) {
            showToast(t('مبلغ تمام اقلام سند باید پر شود و نمی‌تواند صفر باشد.', 'All items must have a valid amount.'), 'warning');
            return false;
        }

        if (summaryStats.totalDepUsd === 0 && summaryStats.totalWidUsd === 0) {
            showToast(t('جمع مبالغ سند صفر است و قابلیت تغییر وضعیت ندارد.', 'Total transaction amount cannot be zero.'), 'warning');
            return false;
        }

        if (headerData.transaction_type === 'TRANSFER' && summaryStats.isUnbalanced) {
            showToast(t('تراکنش انتقال غیرتراز است. مجموع واریز و برداشت ارزی باید برابر باشد.', 'Transfer transactions must be balanced.'), 'warning');
            return false;
        }

        return true;
    };

    const handleSaveTransaction = async (overrideStatus) => {
        const statusToSave = typeof overrideStatus === 'string' ? overrideStatus : headerData.status;

        // بررسی تغییر وضعیت - ترتیب وضعیت باید رعایت شود
        if (typeof overrideStatus === 'string' && overrideStatus !== headerData.status) {
            if (!canTransitionTo(headerData.status, overrideStatus)) {
                return showToast(t('تغییر وضعیت به دلیل رعایت نشدن ترتیب امکانپذیر نیست.', 'Status transition is not allowed.'), 'warning');
            }
        }

        if (document.getElementById('grid-inline-edit-marker')) {
            return showToast(t('لطفاً ابتدا با زدن دکمه Enter یا دکمه تایید تغییرات سطر باز را در اقلام ذخیره کنید.', 'Please save inline edits first.'), 'warning');
        }

        if (!headerData.document_date || !headerData.transaction_type || !headerData.description) {
            return showToast(t('تکمیل فیلدهای اجباری سربرگ (تاریخ، نوع، شرح) الزامی است.', 'Header required fields missing.'), 'warning');
        }
        
        if (!validateTransactionLogic(statusToSave)) return;

        setIsLoading(true);
        try {
            let txId = headerData.id;
            const validDeptId = (headerData.department_id && String(headerData.department_id).trim() !== '') ? headerData.department_id : null;

            const now = new Date().toISOString();

            // فیلدهای metadata بررسی/تایید - جداگانه ارسال می‌شوند تا در صورت نبود ستون‌ها، عملیات اصلی fail نشود
            const metaPayload = {};
            if (statusToSave === 'FINAL' && headerData.status !== 'FINAL') {
                metaPayload.reviewed_by = currentUserId || null;
                metaPayload.reviewed_at = now;
                metaPayload.reviewed_by_name = currentUserName;
            } else if (statusToSave === 'APPROVED' && headerData.status !== 'APPROVED') {
                metaPayload.approved_by = currentUserId || null;
                metaPayload.approved_at = now;
                metaPayload.approved_by_name = currentUserName;
            } else if (statusToSave === 'TEMPORARY' && headerData.status === 'FINAL') {
                metaPayload.reviewed_by = null;
                metaPayload.reviewed_at = null;
                metaPayload.reviewed_by_name = null;
            }

            const txPayload = {
                document_code: headerData.document_code,
                document_date: headerData.document_date.replace(/\//g, '-'),
                registrar_id: headerData.registrar_id || null,
                transaction_type: headerData.transaction_type,
                department_id: validDeptId,
                status: statusToSave || 'DRAFT',
                description: headerData.description || ''
            };

            if (!txId) {
                const { data, error } = await supabase.from('fm_transactions').insert([txPayload]).select('id');
                if (error) throw error;
                txId = data[0].id;
                setHeaderData(prev => ({ ...prev, id: txId }));
                
                if (window.AutoNumberingService) {
                    try {
                        await window.AutoNumberingService.consumeNext('TRANSACTIONS');
                    } catch(err) {
                        console.error('AutoNumbering consume error:', err);
                    }
                }

                await logAction('create_transaction', txId, `ایجاد تراکنش: ${headerData.document_code}`);
            } else {
                const { error } = await supabase.from('fm_transactions').update(txPayload).eq('id', txId);
                if (error) throw error;

                // آپدیت جداگانه فیلدهای بررسی/تایید (در صورت نبود ستون در DB، عملیات اصلی مختل نمی‌شود)
                if (Object.keys(metaPayload).length > 0) {
                    const { error: metaError } = await supabase.from('fm_transactions').update(metaPayload).eq('id', txId);
                    if (metaError) {
                        console.warn('متادیتای بررسی/تایید ذخیره نشد (ستون‌های DB ممکن است اضافه نشده باشند):', metaError.message);
                    }
                }

                if (statusToSave !== headerData.status) {
                    const statusLabels = { DRAFT: 'یادداشت', TEMPORARY: 'موقت', FINAL: 'بررسی شده', APPROVED: 'تایید شده' };
                    await logAction('status_update', txId, `تغییر وضعیت از ${statusLabels[headerData.status] || headerData.status} به ${statusLabels[statusToSave] || statusToSave} - توسط ${currentUserName}`);
                } else if (isDirty) {
                    await logAction('update_transaction', txId, `ویرایش تراکنش: ${headerData.document_code} - توسط ${currentUserName}`);
                }
            }

            if (isDirty || !headerData.id) {
                await supabase.from('fm_transaction_items').delete().eq('transaction_id', txId);
                
                if (itemsData.length > 0) {
                    const itemsPayload = itemsData.map((item, index) => {
                        const dep = parseFloat(String(item.deposit_amount || '0').replace(/,/g, '')) || 0;
                        const wid = parseFloat(String(item.withdrawal_amount || '0').replace(/,/g, '')) || 0;
                        const cur = item.currency || 'IRR';
                        
                        const { toUsd, usdToIrr } = getExchangeRates(cur);
                        const val = dep > 0 ? dep : wid;
                        const amtUsd = val * toUsd;
                        const amtIrr = amtUsd * usdToIrr;
                        
                        return {
                            transaction_id: txId,
                            row_number: index + 1,
                            account_id: (item.account_id && String(item.account_id).trim() !== '') ? item.account_id : null,
                            transaction_action: item.transaction_action || 'DEPOSIT',
                            transaction_group: (item.transaction_group && String(item.transaction_group).trim() !== '') ? item.transaction_group : null,
                            cost_type_id: (item.cost_type_id && String(item.cost_type_id).trim() !== '') ? item.cost_type_id : null,
                            income_type_id: (item.income_type_id && String(item.income_type_id).trim() !== '') ? item.income_type_id : null,
                            currency: cur,
                            deposit_amount: dep,
                            withdrawal_amount: wid,
                            exchange_rate_to_usd: toUsd,
                            exchange_rate_usd_to_irr: usdToIrr,
                            amount_usd: amtUsd,
                            amount_irr: amtIrr,
                            description: item.description || null
                        };
                    });

                    const { data: newItems, error: itemsError } = await supabase.from('fm_transaction_items').insert(itemsPayload).select();
                    if (itemsError) throw itemsError;
                    await logAction('update_items', txId, `بروزرسانی ${itemsPayload.length} قلم سند ${headerData.document_code} - توسط ${currentUserName}`);

                    const mappedItems = newItems.map(item => {
                        return {
                            ...item,
                            _tempId: crypto.randomUUID(),
                            deposit_amount: item.deposit_amount != null ? parseFloat(item.deposit_amount) : 0,
                            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0
                        };
                    }).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
                    
                    setItemsData(mappedItems);
                }
            }

            setHeaderData(prev => ({ 
                ...prev, 
                status: statusToSave,
                // بهروزرسانی مختصر برای نمایش در اینترفیس
                ...(statusToSave === 'FINAL' && headerData.status !== 'FINAL' ? { reviewed_by: currentUserId, reviewed_at: new Date().toISOString(), reviewed_by_name: currentUserName } : {}),
                ...(statusToSave === 'APPROVED' && headerData.status !== 'APPROVED' ? { approved_by: currentUserId, approved_at: new Date().toISOString(), approved_by_name: currentUserName } : {}),
                ...(statusToSave === 'TEMPORARY' && headerData.status === 'FINAL' ? { reviewed_by: null, reviewed_at: null, reviewed_by_name: null } : {})
            }));
            setIsDirty(false);
            setHasSaved(true);
            
            if (typeof overrideStatus === 'string') {
                showToast(t('وضعیت سند با موفقیت تغییر کرد.', 'Transaction status updated successfully.'));
            } else {
                showToast(t('سند با موفقیت ثبت شد.', 'Transaction saved successfully.'));
            }
        } catch (error) {
            showToast(t('خطا در عملیات. لطفاً مجدداً تلاش کنید.', 'Operation failed. Please try again.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0 || !attachModal.record) return;
        // بلوک آپلود برای تراکنش‌های بررسی شده / تایید شده
        if (attachModal.record.status === 'FINAL' || attachModal.record.status === 'APPROVED') {
            return showToast(t('تراکنش‌های بررسی شده / تایید شده امکان افزودن پیوست ندارند.', 'Finalized/approved transactions cannot have attachments added.'), 'warning');
        }
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
            await logAction('upload_attachment', attachModal.record.id, `افزودن پیوست به تراکنش ${attachModal.record.document_code}: ${file.name} - توسط ${currentUserName}`);
            loadAttachments(attachModal.record.id);
        } catch (error) {
            showToast(t('خطا در آپلود فایل.', 'Error uploading file.'), 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (fileId) => {
        // بلوک حذف برای تراکنش‌های بررسی شده / تایید شده
        if (attachModal.record && (attachModal.record.status === 'FINAL' || attachModal.record.status === 'APPROVED')) {
            return showToast(t('تراکنش‌های بررسی شده / تایید شده امکان حذف پیوست ندارند.', 'Finalized/approved transactions cannot have attachments deleted.'), 'warning');
        }
        try {
            const { error } = await supabase.from('fm_attachments').delete().eq('id', fileId);
            if (error) throw error;
            showToast(t('پیوست حذف شد.', 'Attachment deleted.'));
            await logAction('delete_attachment', attachModal.record.id, `حذف پیوست از تراکنش ${attachModal.record.document_code} - توسط ${currentUserName}`);
            loadAttachments(attachModal.record.id);
        } catch (error) {
            showToast(t('خطا در حذف پیوست.', 'Error deleting attachment.'), 'error');
        }
    };

    const handleCloseModal = () => {
        if (hasSaved && onSuccess) {
            onSuccess();
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    const TransactionMainGrid = window.TransactionMainGrid || FallbackComponent;

    const headerCardTitle = (
        <div className="flex items-center gap-4 w-full">
            <span>{t('اطلاعات سربرگ', 'Header Data')}</span>
            <Badge variant={{ APPROVED: 'emerald', FINAL: 'blue', TEMPORARY: 'orange', DRAFT: 'slate' }[(headerData.status || 'DRAFT')] || 'slate'} className="shadow-none">
                {STATUS_OPTIONS.find(x => x.value === (headerData.status || 'DRAFT'))?.label || t('یادداشت', 'Draft')}
            </Badge>
        </div>
    );

    const currentStatus = headerData.status || 'DRAFT';
    const headerCardAction = (
        <div className="flex items-center gap-2 pr-2" onClick={e => e.stopPropagation()}>
            {/* وضعیت یادداشت -> موقت */}
            {currentStatus === 'DRAFT' && access.canEdit && (
                <Button variant="outline" size="sm" onClick={() => handleSaveTransaction('TEMPORARY')} className="!text-orange-500 !border-orange-500 hover:!bg-orange-50 dark:hover:!bg-orange-900/30 !py-0.5 !h-6">
                    {t('تبدیل به موقت', 'Set Temporary')}
                </Button>
            )}
            {/* وضعیت موقت: برگشت به یادداشت یا تبدیل به بررسی شده */}
            {currentStatus === 'TEMPORARY' && access.canEdit && (
                <>
                    <Button variant="outline" size="sm" onClick={() => handleSaveTransaction('DRAFT')} className="!text-slate-600 !border-slate-500 hover:!bg-slate-50 dark:hover:!bg-slate-800 !py-0.5 !h-6">
                        {t('برگشت به یادداشت', 'Revert to Draft')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSaveTransaction('FINAL')} className="!text-blue-600 !border-blue-500 hover:!bg-blue-50 dark:hover:!bg-blue-900/30 !py-0.5 !h-6">
                        {t('تبدیل به بررسی شده', 'Set Final')}
                    </Button>
                </>
            )}
            {/* وضعیت بررسی شده: برگشت به موقت یا تایید */}
            {currentStatus === 'FINAL' && access.canEdit && (
                <>
                    <Button variant="outline" size="sm" onClick={() => handleSaveTransaction('TEMPORARY')} className="!text-orange-500 !border-orange-500 hover:!bg-orange-50 dark:hover:!bg-orange-900/30 !py-0.5 !h-6">
                        {t('برگشت به موقت', 'Revert to Temporary')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSaveTransaction('APPROVED')} className="!text-emerald-600 !border-emerald-500 hover:!bg-emerald-50 dark:hover:!bg-emerald-900/30 !py-0.5 !h-6">
                        {t('تایید سند', 'Approve')}
                    </Button>
                </>
            )}
            {/* وضعیت تایید شده: غیرقابل تغییر */}
            {currentStatus === 'APPROVED' && (
                <Badge variant="emerald" size="sm">{t('تایید نهایی - غیرقابل تغییر', 'Approved - Locked')}</Badge>
            )}
        </div>
    );

    const itemsCardTitle = (
        <div className="flex items-center gap-4 w-full">
            <span>{t('اقلام سند', 'Transaction Items')}</span>
            {balanceInfo.isUnbalanced && (
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/50">
                    <AlertTriangle size={14} />
                    <span className="text-[11px] font-bold">
                        {t('اختلاف تراز دلاری:', 'USD Diff:')} <span dir="ltr" className="inline-block px-1 font-black">{formatNumber(Math.abs(balanceInfo.diff))}</span>
                    </span>
                </div>
            )}
        </div>
    );

    const itemsCardAction = (
        <div className="flex items-center gap-2">
            {balanceInfo.isUnbalanced && !isReadOnly && (
                <Button size="sm" variant="outline" className="!text-orange-600 !border-orange-500 hover:!bg-orange-100 dark:hover:!bg-orange-900/40 !h-6 !py-0 !text-[11px]" icon={Scale} onClick={(e) => { e.stopPropagation(); gridRef.current?.triggerBalanceRow(balanceInfo.diff); }}>
                    {t('تراز کردن ارزی', 'Balance (USD)')}
                </Button>
            )}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleCloseModal} title={isReadOnly ? t('مشاهده تراکنش', 'View Transaction') : (formMode === 'CREATE' ? t('ثبت تراکنش جدید', 'New Transaction') : formMode === 'EDIT' ? t('ویرایش تراکنش', 'Edit Transaction') : t('کپی تراکنش', 'Copy Transaction'))} language={language} width="max-w-6xl">
            <div className="flex flex-col bg-slate-50/50 dark:bg-slate-900/50 h-[85vh] text-[12px] relative">
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex flex-col gap-4 pb-20">
                    
                    {copyWarning && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 p-2 rounded-lg flex items-center gap-2 mb-1 animate-in slide-in-from-top-2 shrink-0">
                            <AlertTriangle size={16} />
                            <span className="text-[12px] font-bold">{copyWarning}</span>
                        </div>
                    )}

                    <Card
                        title={headerCardTitle}
                        isCollapsible={true}
                        noPadding={true}
                        className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-20"
                        headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
                        action={headerCardAction}
                        language={language}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-white dark:bg-slate-800 overflow-visible">
                            <TextField size="sm" formCode={formCode} label={t('کد سند', 'Transaction Code')} value={headerData.document_code || ''} disabled isRtl={isRtl} dir="ltr" />
                            <TextField size="sm" formCode={formCode} label={t('کد عطف', 'Ref Code')} value={headerData.reference_code || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                            <TextField size="sm" formCode={formCode} label={t('شماره روزانه', 'Daily Number')} value={headerData.daily_number || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                            <div className="relative z-[90]">
                                <DatePicker size="sm" formCode={formCode} label={t('تاریخ سند', 'Transaction Date')} value={headerData.document_date || ''} onChange={val => { setHeaderData({...headerData, document_date: val}); setIsDirty(true); }} isRtl={isRtl} disabled={isReadOnly} required />
                            </div>
                            <TextField size="sm" formCode={formCode} label={t('ثبت کننده', 'Registrar')} value={lookups.usersMap[headerData.registrar_id] || ''} disabled isRtl={isRtl} />
                            
                            <div className="relative z-[80]">
                                <SelectField size="sm" formCode={formCode} label={t('نوع تراکنش', 'Transaction Type')} value={headerData.transaction_type || 'GENERAL'} onChange={e => { setHeaderData({...headerData, transaction_type: e.target.value}); setIsDirty(true); }} options={TRANSACTION_TYPES} isRtl={isRtl} disabled={isReadOnly} required />
                            </div>
                            <TextField size="sm" formCode={formCode} label={t('دپارتمان', 'Department')} value={headerData.department_title || lookups.currentUserDeptTitle || ''} disabled isRtl={isRtl} />
                            
                            <div className="lg:col-span-3 sm:col-span-2 relative z-[70]">
                                <TextField size="sm" formCode={formCode} label={t('شرح سربرگ', 'Header Description')} value={headerData.description || ''} onChange={e => { setHeaderData({...headerData, description: e.target.value}); setIsDirty(true); }} isRtl={isRtl} disabled={isReadOnly} required />
                            </div>

                            {/* نمایش اطلاعات بررسی و تایید */}
                            {(headerData.reviewed_by || headerData.reviewed_by_name) && (
                                <>
                                    <TextField size="sm" formCode={formCode} label={t('بررسی کننده', 'Reviewed By')} value={headerData.reviewed_by_name || lookups.usersMap[headerData.reviewed_by] || '-'} disabled isRtl={isRtl} />
                                    <TextField size="sm" formCode={formCode} label={t('تاریخ بررسی', 'Reviewed At')} value={headerData.reviewed_at ? new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(headerData.reviewed_at)) : '-'} disabled isRtl={isRtl} />
                                </>
                            )}
                            {(headerData.approved_by || headerData.approved_by_name) && (
                                <>
                                    <TextField size="sm" formCode={formCode} label={t('تایید کننده', 'Approved By')} value={headerData.approved_by_name || lookups.usersMap[headerData.approved_by] || '-'} disabled isRtl={isRtl} />
                                    <TextField size="sm" formCode={formCode} label={t('تاریخ تایید', 'Approved At')} value={headerData.approved_at ? new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(headerData.approved_at)) : '-'} disabled isRtl={isRtl} />
                                </>
                            )}
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
                                onItemsChange={(newItems) => { setItemsData(newItems); setIsDirty(true); }} 
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
                    <Button variant="outline" size="sm" onClick={handleCloseModal}>{t('بستن', 'Close')}</Button>
                    {!isReadOnly && access.canEdit && (
                        <Button variant="primary" size="sm" icon={Check} onClick={() => handleSaveTransaction()} isLoading={isLoading} disabled={!isDirty}>
                            {t('ذخیره', 'Save')}
                        </Button>
                    )}
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