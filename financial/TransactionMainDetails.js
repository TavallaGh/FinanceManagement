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
  const { Button = FallbackComponent } = Core;

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
            const [accRes, strRes, costRes, incRes, usersRes, personnelRes, nodesRes] = await Promise.all([
                supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, structure_id').eq('is_active', true),
                supabase.from('fm_coa_structures').select('id, title_fa').eq('is_active', true),
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

            const allAccounts = accRes.data || [];
            const structures = strRes.data || [];
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
                const structureName = structures.find(s => s.id === a.structure_id)?.title_fa || '';
                return {
                    ...a,
                    structure_name: structureName,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, formMode, initialRecord]);

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
            const validDeptId = headerData.department_id && headerData.department_id.trim() !== '' ? headerData.department_id : null;

            const txPayload = {
                document_code: headerData.document_code,
                document_date: headerData.document_date.replace(/\//g, '-'),
                registrar_id: currentUserId,
                transaction_type: headerData.transaction_type,
                department_id: validDeptId,
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
                cost_type_id: item.cost_type_id && item.cost_type_id.trim() !== '' ? item.cost_type_id : null,
                income_type_id: item.income_type_id && item.income_type_id.trim() !== '' ? item.income_type_id : null,
                currency: item.currency || 'IRR',
                amount: parseFloat(String(item.amount).replace(/,/g, '')) || 0,
                description: item.description
            }));

            const { error: itemsError } = await supabase.from('fm_transaction_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            showToast(t('سند با موفقیت ثبت شد.', 'Transaction saved successfully.'));
            onSuccess();
        } catch (error) {
            showToast(t('خطا در ثبت سند.', 'Error saving transaction.'), 'error');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItemClick = () => {
        if (inlineItemEdit) {
            showToast(t('لطفاً ابتدا سطر باز را ذخیره کنید.', 'Please save current edit first.'), 'warning');
            return;
        }
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
                account_obj: accObj,
                amount: row.amount ? String(row.amount).replace(/,/g, '') : ''
            }
        });
    };

    const handleSaveItemInline = () => {
        const form = inlineItemEdit.data;
        if (!form.account_id || !form.amount || !form.description) {
            showToast(t('حساب، مبلغ و شرح اجباری هستند.', 'Account, Amount, and Description are required.'), 'warning');
            return;
        }

        const cleanAmount = String(form.amount).replace(/,/g, '');
        if (isNaN(cleanAmount) || cleanAmount === '') {
            showToast(t('مبلغ نامعتبر است.', 'Invalid amount.'), 'warning');
            return;
        }

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
        const reordered = newItems.map((item, idx) => ({ ...item, row_number: idx + 1 }));
        setItemsData(reordered);
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
        { field: 'structure_name', header_fa: 'ساختار', header_en: 'Structure', width: '120px' },
        { field: 'code', header_fa: 'کد حساب', header_en: 'Code', width: '100px' },
        { field: 'title_fa', header_fa: 'عنوان حساب', header_en: 'Title', width: 'auto', render: (val, row) => (
            <div className="flex flex-col py-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                <span className="text-xs text-slate-500 truncate" title={row.pathTitle}>{row.pathTitle}</span>
            </div>
        )}
    ];

    const itemGridData = useMemo(() => {
        const data = [...itemsData];
        if (inlineItemEdit && inlineItemEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineItemEdit.data });
        return data;
    }, [itemsData, inlineItemEdit]);

    const itemColumns = [
        { 
            field: 'row_number', header_fa: 'ردیف', header_en: '#', width: '50px', 
            render: (val, row) => row._isNew ? <span className="text-emerald-600 font-bold">*</span> : val 
        },
        { 
            field: 'account_id', header_fa: 'حساب', header_en: 'Account', width: '250px', 
            render: (val, row) => {
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <LOVField 
                                size="sm" formCode={formCode} data={lookups.leafAccounts} columns={accountLovColumns} dropdownWidth="min-w-[500px]"
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
                return acc ? <span>{acc.code} - {acc.title_fa}</span> : '';
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
                const act = TRANSACTION_ACTIONS.find(a => a.value === val);
                return act ? <span>{act.label}</span> : val;
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
                const grp = TRANSACTION_GROUPS.find(a => a.value === val);
                return grp ? <span>{grp.label}</span> : val;
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
                    return c ? <span>{isRtl ? c.title_fa : c.title_en}</span> : '';
                }
                if (group === 'INCOME') {
                    const i = lookups.incomeTypes.find(x => String(x.id) === String(row.income_type_id));
                    return i ? <span>{isRtl ? i.title_fa : i.title_en}</span> : '';
                }
                return '-';
            }
        },
        { 
            field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '80px', 
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
                    const dispVal = formatNumber(inlineItemEdit.data.amount);
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <TextField 
                                size="sm" type="text" value={dispVal} 
                                onChange={handleAmountChange} 
                                isRtl={isRtl} dir="ltr" 
                            />
                        </div>
                    );
                }
                return <span dir="ltr">{formatNumber(val)}</span>;
            }
        },
        { 
            field: 'description', header_fa: 'شرح', header_en: 'Description', width: 'auto', 
            render: (val, row) => {
                if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                    return <div onClick={(e) => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.description} onChange={(e) => setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))} isRtl={isRtl} /></div>;
                }
                return <span>{val}</span>;
            }
        },
        {
            field: 'actions', header_fa: 'عملیات', header_en: 'Actions', width: '90px',
            render: (_, row) => {
                const isEditing = inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId);
                if (isEditing) {
                    return (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" icon={Save} onClick={(e) => { e.stopPropagation(); handleSaveItemInline(); }} className="!text-emerald-600 hover:!bg-emerald-50 dark:hover:!bg-emerald-900/30 !px-2" />
                            <Button variant="ghost" size="sm" icon={X} onClick={(e) => { e.stopPropagation(); setInlineItemEdit(null); }} className="!text-slate-500 hover:!bg-slate-100 dark:hover:!bg-slate-800 !px-2" />
                        </div>
                    );
                }
                if (inlineItemEdit) return null;
                return (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" icon={Edit} onClick={(e) => { e.stopPropagation(); handleEditItemClick(row); }} className="!text-indigo-600 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/30 !px-2" />
                        <Button variant="ghost" size="sm" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleRemoveItem(row); }} className="!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/30 !px-2" />
                    </div>
                );
            }
        }
    ];

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={formMode === 'CREATE' ? t('ثبت تراکنش جدید', 'New Transaction') : formMode === 'EDIT' ? t('ویرایش تراکنش', 'Edit Transaction') : t('کپی تراکنش', 'Copy Transaction')} language={language} width="max-w-6xl">
            <div className="flex flex-col bg-slate-50/50 dark:bg-slate-900/50 relative overflow-visible h-full min-h-[500px]">
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-visible">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm shrink-0 transition-all duration-300 relative z-20">
                        <div 
                            className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                        >
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><FileText size={16} className="text-indigo-500" /> {t('اطلاعات سربرگ', 'Header Data')}</h4>
                            <Button variant="ghost" size="sm" icon={isHeaderCollapsed ? ChevronDown : ChevronUp} className="!p-1 h-6 w-6" />
                        </div>
                        {!isHeaderCollapsed && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 overflow-visible">
                                <TextField size="sm" formCode={formCode} label={t('کد سند', 'Document Code')} value={headerData.document_code || ''} disabled isRtl={isRtl} dir="ltr" />
                                <TextField size="sm" formCode={formCode} label={t('کد عطف', 'Ref Code')} value={headerData.reference_code || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                                <TextField size="sm" formCode={formCode} label={t('شماره روزانه', 'Daily Number')} value={headerData.daily_number || ''} disabled isRtl={isRtl} dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
                                <DatePicker size="sm" formCode={formCode} label={t('تاریخ سند', 'Document Date')} value={headerData.document_date || ''} onChange={val => setHeaderData({...headerData, document_date: val})} isRtl={isRtl} required />
                                <TextField size="sm" formCode={formCode} label={t('ثبت کننده', 'Registrar')} value={formMode === 'EDIT' && headerData.registrar_id ? (lookups.usersMap[headerData.registrar_id] || '') : `${currentUserName} (${currentUserUsername})`} disabled isRtl={isRtl} />
                                <SelectField size="sm" formCode={formCode} label={t('نوع تراکنش', 'Transaction Type')} value={headerData.transaction_type || 'GENERAL'} onChange={e => setHeaderData({...headerData, transaction_type: e.target.value})} options={TRANSACTION_TYPES} isRtl={isRtl} required />
                                <TextField size="sm" formCode={formCode} label={t('دپارتمان', 'Department')} value={headerData.department_title || lookups.currentUserDeptTitle || ''} disabled isRtl={isRtl} />
                                <SelectField size="sm" formCode={formCode} label={t('وضعیت سند', 'Document Status')} value={headerData.status || 'DRAFT'} onChange={e => setHeaderData({...headerData, status: e.target.value})} options={STATUS_OPTIONS} disabled={formMode === 'CREATE'} isRtl={isRtl} />
                                <div className="lg:col-span-4">
                                    <TextField size="sm" formCode={formCode} label={t('شرح سربرگ', 'Header Description')} value={headerData.description || ''} onChange={e => setHeaderData({...headerData, description: e.target.value})} isRtl={isRtl} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col shadow-sm flex-1 relative z-10 overflow-visible min-h-[300px]">
                        <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><List size={16} className="text-indigo-500" /> {t('اقلام سند', 'Document Items')}</h3>
                        </div>
                        <div className="flex-1 w-full overflow-visible p-1 relative">
                            <DataGrid 
                                data={itemGridData} columns={itemColumns}
                                language={language} onAdd={handleAddItemClick} hideImport={true} hideExport={true} hideToolbar={true}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 z-30">
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