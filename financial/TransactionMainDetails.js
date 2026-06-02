/* Filename: financial/TransactionMainDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    FileText = FallbackIcon, Plus = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon,
    X = FallbackIcon, ChevronUp = FallbackIcon, ChevronDown = FallbackIcon, List = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const { Button = FallbackComponent, Badge = FallbackComponent } = Core;

  const Forms = window.DSForms || DS || {};
  const { TextField = FallbackComponent, SelectField = FallbackComponent, DatePicker = FallbackComponent } = Forms;

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
    
    const [headerData, setHeaderData] = useState({});
    const [itemsData, setItemsData] = useState([]);
    const [inlineItemEdit, setInlineItemEdit] = useState(null);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

    const [lookups, setLookups] = useState({
        accounts: [],
        leafAccounts: [],
        costTypes: [],
        incomeTypes: [],
        departments: [],
        usersMap: {}
    });

    const isFetchingDeps = useRef(false);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (action, recordId, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: 'تراکنش‌ها',
          action: action,
          record_id: String(recordId || 'SYSTEM'),
          user_name: currentUserName,
          details: details
        }]);
      } catch (err) {}
    }, [supabase, currentUserName]);

    const fetchDependencies = useCallback(async () => {
        if (isFetchingDeps.current || !supabase) return;
        isFetchingDeps.current = true;
        try {
            const [accRes, chartRes, costRes, incRes, usersRes, personnelRes, nodesRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, code, currency_id, parent_id, chart_id').eq('is_active', true),
                supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
                supabase.from('fm_cost_types').select('id, title_fa').eq('is_active', true),
                supabase.from('fm_income_types').select('id, title_fa').eq('is_active', true),
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

            const allAccounts = accRes.data || [];
            const charts = chartRes.data || [];
            const parentIds = new Set(allAccounts.map(a => a.parent_id).filter(Boolean));
            
            const leafAccs = allAccounts.filter(a => !parentIds.has(a.id)).map(a => {
                let pathArr = [];
                let curr = a;
                while (curr && curr.parent_id) {
                    const parent = allAccounts.find(p => p.id === curr.parent_id);
                    if (parent) {
                        pathArr.unshift(parent.title_fa);
                        curr = parent;
                    } else {
                        break;
                    }
                }
                const chartName = charts.find(c => c.id === a.chart_id)?.title || '';
                return {
                    ...a,
                    chart_name: chartName,
                    pathTitle: pathArr.join(' / '),
                    displayLabel: `${a.code} - ${a.title_fa}`
                };
            });

            setLookups({
                accounts: allAccounts,
                leafAccounts: leafAccs,
                costTypes: costRes.data || [],
                incomeTypes: incRes.data || [],
                usersMap: uMap,
                currentUserDeptId: myDeptId,
                currentUserDeptTitle: myDeptTitle
            });
        } catch (error) {
            showToast(t('خطا در دریافت اطلاعات پایه', 'Error fetching dependencies'), 'error');
        } finally {
            isFetchingDeps.current = false;
        }
    }, [supabase, showToast, t, currentUserId]);

    const generateDocumentCode = () => {
        return `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    };

    useEffect(() => {
        if (!isOpen) return;
        fetchDependencies().then(() => {
            const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '/');
            setInlineItemEdit(null);
            setIsHeaderCollapsed(false);

            if (formMode === 'CREATE') {
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
            } else if ((formMode === 'EDIT' || formMode === 'COPY') && initialRecord) {
                const parsedDate = initialRecord.document_date ? initialRecord.document_date.replace(/-/g, '/') : todayStr;
                setHeaderData({
                    ...initialRecord,
                    id: formMode === 'COPY' ? undefined : initialRecord.id,
                    document_code: formMode === 'COPY' ? generateDocumentCode() : initialRecord.document_code,
                    status: formMode === 'COPY' ? 'DRAFT' : initialRecord.status,
                    reference_code: formMode === 'COPY' ? '' : initialRecord.reference_code,
                    daily_number: formMode === 'COPY' ? '' : initialRecord.daily_number,
                    document_date: parsedDate,
                    registered_at: formMode === 'COPY' ? new Date().toISOString() : initialRecord.registered_at,
                    department_id: formMode === 'COPY' ? lookups.currentUserDeptId : initialRecord.department_id,
                    department_title: formMode === 'COPY' ? lookups.currentUserDeptTitle : ''
                });
                
                const mappedItems = (initialRecord.fm_transaction_items || []).map(item => ({
                    ...item,
                    _tempId: crypto.randomUUID(),
                    id: formMode === 'COPY' ? undefined : item.id,
                    transaction_id: formMode === 'COPY' ? undefined : item.transaction_id
                })).sort((a, b) => a.row_number - b.row_number);
                
                setItemsData(mappedItems);
            }
        });
    }, [isOpen, formMode, initialRecord, fetchDependencies, lookups.currentUserDeptId, lookups.currentUserDeptTitle]);

    const handleChangeStatus = async (newStatus) => {
        setHeaderData(prev => ({ ...prev, status: newStatus }));
        if (headerData.id) {
            setIsLoading(true);
            try {
                const { error } = await supabase.from('fm_transactions').update({ status: newStatus }).eq('id', headerData.id);
                if (error) throw error;
                await logAction('status_update', headerData.id, `تغییر وضعیت سند به ${newStatus}`);
                showToast(t('وضعیت سند با موفقیت تغییر کرد.', 'Document status updated successfully.'));
            } catch (err) {
                showToast(t('خطا در تغییر وضعیت سند.', 'Error updating document status.'), 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSaveTransaction = async () => {
        if (inlineItemEdit) {
            return showToast(t('لطفاً تغییرات سطر باز را ذخیره کنید.', 'Please save inline edits first.'), 'warning');
        }

        if (!headerData.document_date || !headerData.transaction_type || !headerData.description) {
            return showToast(t('تکمیل فیلدهای اجباری سربرگ الزامی است.', 'Header required fields missing.'), 'warning');
        }
        
        if (itemsData.length === 0) {
            return showToast(t('سند حداقل یک قلم نیاز دارد.', 'Document must have at least one item.'), 'warning');
        }

        setIsLoading(true);
        try {
            let txId = headerData.id;
            const validDeptId = headerData.department_id || null;

            const txPayload = {
                document_code: headerData.document_code,
                document_date: headerData.document_date.replace(/\//g, '-'),
                registrar_id: currentUserId || '00000000-0000-0000-0000-000000000000',
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
                amount: parseFloat(String(item.amount || '0').replace(/,/g, '')) || 0,
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
        if (inlineItemEdit) return showToast(t('ابتدا سطر جاری را ذخیره کنید.', 'Save current row first.'), 'warning');
        setInlineItemEdit({
            id: 'new',
            data: { account_id: '', account_obj: null, transaction_action: 'DEPOSIT', transaction_group: 'COST', cost_type_id: '', income_type_id: '', currency: '', amount: '', description: '' }
        });
    };

    const handleEditItemClick = (row) => {
        if (inlineItemEdit) return;
        const accObj = lookups.leafAccounts.find(a => String(a.id) === String(row.account_id)) || null;
        setInlineItemEdit({
            id: row._tempId || row.id,
            data: { ...row, account_obj: accObj, amount: row.amount ? String(row.amount).replace(/,/g, '') : '' }
        });
    };

    const handleSaveItemInline = () => {
        const form = inlineItemEdit.data;
        if (!form.account_id || !form.amount || !form.description) {
            return showToast(t('حساب، مبلغ و شرح اجباری هستند.', 'Account, Amount, and Description required.'), 'warning');
        }

        const cleanAmount = String(form.amount || '0').replace(/,/g, '');
        if (isNaN(cleanAmount) || cleanAmount === '') return showToast(t('مبلغ نامعتبر است.', 'Invalid amount.'), 'warning');

        const dataToSave = { ...form, amount: cleanAmount };
        if (inlineItemEdit.id === 'new') {
            setItemsData([...itemsData, { ...dataToSave, _tempId: crypto.randomUUID(), row_number: itemsData.length + 1 }]);
        } else {
            setItemsData(itemsData.map(item => (item._tempId === inlineItemEdit.id || item.id === inlineItemEdit.id) ? { ...item, ...dataToSave } : item));
        }
        setInlineItemEdit(null);
    };

    const handleRemoveItem = (row) => {
        const newItems = itemsData.filter(item => item._tempId !== row._tempId && item.id !== row.id);
        setItemsData(newItems.map((item, idx) => ({ ...item, row_number: idx + 1 })));
    };

    const formatNumber = (num) => {
        if (!num && num !== 0) return '';
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join('.');
    };

    const handleAmountChange = (e) => {
        const raw = e.target.value.replace(/,/g, '');
        if (raw === '' || !isNaN(raw)) {
            setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, amount: raw } }));
        }
    };

    const accountLovColumns = [
        { field: 'chart_name', header_fa: 'چارت حساب', header_en: 'Chart', width: '120px' },
        { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
        { field: 'title_fa', header_fa: 'عنوان حساب', header_en: 'Title', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                <span className="text-[10px] text-slate-500 truncate" title={row.pathTitle}>{row.pathTitle}</span>
            </div>
        )}
    ];

    const itemGridData = useMemo(() => {
        const data = [...itemsData];
        if (inlineItemEdit && inlineItemEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineItemEdit.data });
        return data;
    }, [itemsData, inlineItemEdit]);

    const itemColumns = [
        { field: 'row_number', header_fa: '#', width: '40px', render: (val, row) => row._isNew ? <span className="text-emerald-600 font-bold">*</span> : <span className="text-[12px]">{val}</span> },
        { field: 'account_id', header_fa: 'حساب', width: '250px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return (
                    <div onClick={e => e.stopPropagation()} className="w-full relative z-[100]">
                        <LOVField 
                            size="sm" formCode={formCode} data={lookups.leafAccounts} columns={accountLovColumns} dropdownWidth="min-w-[500px]"
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
        { field: 'transaction_action', header_fa: 'نوع', width: '100px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onClick={e => e.stopPropagation()} className="relative z-[90]"><SelectField size="sm" options={TRANSACTION_ACTIONS} value={inlineItemEdit.data.transaction_action} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, transaction_action: e.target.value}}))} isRtl={isRtl} wrapperClassName="m-0" /></div>;
            }
            return <span className="text-[12px]">{TRANSACTION_ACTIONS.find(a => a.value === val)?.label || val}</span>;
        }},
        { field: 'transaction_group', header_fa: 'گروه', width: '100px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onClick={e => e.stopPropagation()} className="relative z-[80]"><SelectField size="sm" options={TRANSACTION_GROUPS} value={inlineItemEdit.data.transaction_group} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, transaction_group: e.target.value, cost_type_id: '', income_type_id: ''}}))} isRtl={isRtl} wrapperClassName="m-0" /></div>;
            }
            return <span className="text-[12px]">{TRANSACTION_GROUPS.find(a => a.value === val)?.label || val}</span>;
        }},
        { field: 'sub_type', header_fa: 'هزینه/درآمد', width: '150px', render: (_, row) => {
            const group = inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId) ? inlineItemEdit.data.transaction_group : row.transaction_group;
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                if (group === 'COST') return <div onClick={e => e.stopPropagation()} className="relative z-[70]"><SelectField size="sm" options={lookups.costTypes.map(c => ({value: c.id, label: c.title_fa}))} value={inlineItemEdit.data.cost_type_id} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, cost_type_id: e.target.value}}))} isRtl={isRtl} wrapperClassName="m-0" /></div>;
                if (group === 'INCOME') return <div onClick={e => e.stopPropagation()} className="relative z-[70]"><SelectField size="sm" options={lookups.incomeTypes.map(c => ({value: c.id, label: c.title_fa}))} value={inlineItemEdit.data.income_type_id} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, income_type_id: e.target.value}}))} isRtl={isRtl} wrapperClassName="m-0" /></div>;
                return <div className="h-[32px] w-full bg-slate-100 dark:bg-slate-800 rounded opacity-50"></div>;
            }
            if (group === 'COST') return <span className="text-[12px]">{lookups.costTypes.find(x => String(x.id) === String(row.cost_type_id))?.title_fa || ''}</span>;
            if (group === 'INCOME') return <span className="text-[12px]">{lookups.incomeTypes.find(x => String(x.id) === String(row.income_type_id))?.title_fa || ''}</span>;
            return '-';
        }},
        { field: 'currency', header_fa: 'ارز', width: '60px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onClick={e => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.currency} disabled isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px]">{val}</span>;
        }},
        { field: 'amount', header_fa: 'مبلغ', width: '120px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onClick={e => e.stopPropagation()}><TextField size="sm" type="text" value={formatNumber(inlineItemEdit.data.amount)} onChange={handleAmountChange} isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px] font-medium">{formatNumber(val)}</span>;
        }},
        { field: 'description', header_fa: 'شرح *', width: 'auto', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onClick={e => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.description} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, description: e.target.value}}))} isRtl={isRtl} required wrapperClassName="m-0" /></div>;
            }
            return <span className="text-[12px] truncate">{val}</span>;
        }},
        { field: 'actions', header_fa: '', width: '80px', render: (_, row) => {
            const isEditing = inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId);
            if (isEditing) {
                return (
                    <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="sm" icon={Save} onClick={e => { e.stopPropagation(); handleSaveItemInline(); }} className="!text-emerald-600 hover:!bg-emerald-50 dark:hover:!bg-emerald-900/30 !p-1.5" />
                        <Button variant="ghost" size="sm" icon={X} onClick={e => { e.stopPropagation(); setInlineItemEdit(null); }} className="!text-slate-500 hover:!bg-slate-100 dark:hover:!bg-slate-800 !p-1.5" />
                    </div>
                );
            }
            if (inlineItemEdit) return null;
            return (
                <div className="flex gap-1 justify-center">
                    <Button variant="ghost" size="sm" icon={Edit} onClick={e => { e.stopPropagation(); handleEditItemClick(row); }} className="!text-indigo-600 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/30 !p-1.5" />
                    <Button variant="ghost" size="sm" icon={Trash2} onClick={e => { e.stopPropagation(); handleRemoveItem(row); }} className="!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/30 !p-1.5" />
                </div>
            );
        }}
    ];

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={formMode === 'CREATE' ? t('ثبت تراکنش جدید', 'New Transaction') : formMode === 'EDIT' ? t('ویرایش تراکنش', 'Edit Transaction') : t('کپی تراکنش', 'Copy Transaction')} language={language} width="max-w-6xl">
            <div className="flex flex-col bg-slate-50/50 dark:bg-slate-900/50 h-[85vh] text-[12px] relative">
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex flex-col gap-4 pb-20">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm shrink-0 transition-all duration-300 relative z-20">
                        <div 
                            className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                        >
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><FileText size={14} className="text-indigo-500" /> {t('اطلاعات سربرگ', 'Header Data')}</span>
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                {formMode !== 'CREATE' && (headerData.status || 'DRAFT') === 'DRAFT' && (
                                    <Button variant="success-outline" size="sm" onClick={() => handleChangeStatus('TEMPORARY')}>
                                        {t('تبدیل به موقت', 'Convert to Temporary')}
                                    </Button>
                                )}
                                {formMode !== 'CREATE' && (headerData.status || 'DRAFT') === 'TEMPORARY' && (
                                    <Button variant="outline" size="sm" onClick={() => handleChangeStatus('DRAFT')}>
                                        {t('تبدیل به یادداشت', 'Convert to Draft')}
                                    </Button>
                                )}
                            </div>
                            <Button variant="ghost" size="sm" icon={isHeaderCollapsed ? ChevronDown : ChevronUp} className="!p-1 h-6 w-6" />
                        </div>
                        {!isHeaderCollapsed && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3 animate-in slide-in-from-top-2 duration-200 overflow-visible">
                                <TextField size="sm" formCode={formCode} label={t('کد سند', 'Document Code')} value={headerData.document_code || ''} disabled isRtl={isRtl} dir="ltr" />
                                <TextField size="sm" formCode={formCode} label={t('کد عطف', 'Ref Code')} value={headerData.reference_code || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                                <TextField size="sm" formCode={formCode} label={t('شماره روزانه', 'Daily Number')} value={headerData.daily_number || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                                <div className="relative z-[90]">
                                    <DatePicker size="sm" formCode={formCode} label={t('تاریخ سند', 'Document Date')} value={headerData.document_date || ''} onChange={val => setHeaderData({...headerData, document_date: val})} isRtl={isRtl} required />
                                </div>
                                <TextField size="sm" formCode={formCode} label={t('ثبت کننده', 'Registrar')} value={formMode === 'EDIT' && headerData.registrar_id ? (lookups.usersMap[headerData.registrar_id] || '') : `${currentUserName} (${currentUserUsername})`} disabled isRtl={isRtl} />
                                
                                <div className="relative z-[80]">
                                    <SelectField size="sm" formCode={formCode} label={t('نوع تراکنش', 'Transaction Type')} value={headerData.transaction_type || 'GENERAL'} onChange={e => setHeaderData({...headerData, transaction_type: e.target.value})} options={TRANSACTION_TYPES} isRtl={isRtl} required />
                                </div>
                                <TextField size="sm" formCode={formCode} label={t('دپارتمان', 'Department')} value={headerData.department_title || lookups.currentUserDeptTitle || ''} disabled isRtl={isRtl} />
                                <div className="relative z-[70] flex flex-col justify-center bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                                    <span className="text-slate-500 text-[11px] mb-1 font-medium">{t('وضعیت سند', 'Document Status')}</span>
                                    <div>
                                        <Badge variant={(headerData.status || 'DRAFT') === 'APPROVED' ? 'emerald' : (headerData.status || 'DRAFT') === 'TEMPORARY' ? 'amber' : 'slate'} size="sm">
                                            {STATUS_OPTIONS.find(x => x.value === (headerData.status || 'DRAFT'))?.label}
                                        </Badge>
                                    </div>
                                </div>
                                
                                <div className="lg:col-span-2 sm:col-span-3">
                                    <TextField size="sm" formCode={formCode} label={t('شرح سربرگ', 'Header Description')} value={headerData.description || ''} onChange={e => setHeaderData({...headerData, description: e.target.value})} isRtl={isRtl} required />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col shadow-sm flex-1 min-h-[350px] relative z-10 overflow-visible">
                        <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><List size={14} className="text-indigo-500" /> {t('اقلام سند', 'Document Items')}</span>
                        </div>
                        <div className="flex-1 w-full overflow-visible p-1 relative min-h-[300px]">
                            <DataGrid 
                                data={itemGridData} columns={itemColumns}
                                language={language} onAdd={handleAddItemClick} hideImport={true} hideExport={true} hideToolbar={true}
                                className="h-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-50">
                    <Button variant="outline" size="sm" onClick={onClose}>{t('انصراف', 'Cancel')}</Button>
                    {access.canEdit && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveTransaction} isLoading={isLoading}>{t('ثبت نهایی سند', 'Save Document')}</Button>}
                </div>
            </div>
            <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
        </Modal>
    );
  };

  window.TransactionMainDetails = TransactionMainDetails;
})();