/* Filename: financial/TransactionMainGrid.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { Trash2 = FallbackIcon } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Forms = window.DSForms || DS || {};
  const { TextField = FallbackComponent, SelectField = FallbackComponent } = Forms;

  const Grid = window.DSGrid || DS || {};
  const { DataGrid = FallbackComponent, LOVField = FallbackComponent } = Grid;

  function FallbackComponent() { return null; }

  const TransactionMainGrid = ({ itemsData = [], onItemsChange, lookups, isReadOnly, formCode, language = 'fa', showToast }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const [inlineItemEdit, setInlineItemEdit] = useState(null);

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
        
        const numDep = parseFloat(cleanDeposit) || 0;
        const numWid = parseFloat(cleanWithdrawal) || 0;

        if (numDep === 0 && numWid === 0) {
            return showToast(t('برای هر قلم سند، مبلغ واریز یا برداشت باید بزرگتر از صفر باشد.', 'Amount must be greater than zero.'), 'warning');
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
        onItemsChange(finalItems);
        setInlineItemEdit(null);
    };

    const handleRemoveItem = (row) => {
        if (isReadOnly) return;
        const newItems = itemsData.filter(item => item._tempId !== row._tempId && item.id !== row.id);
        onItemsChange(newItems.map((item, idx) => ({ ...item, row_number: idx + 1 })));
    };

    const handleBulkDeleteItems = (ids) => {
        if (isReadOnly) return;
        const newItems = itemsData.filter(item => !ids.includes(item.id) && !ids.includes(item._tempId));
        onItemsChange(newItems.map((item, idx) => ({ ...item, row_number: idx + 1 })));
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

    const accountLovColumns = [
        { field: 'chart_name', header_fa: 'ساختار حساب', header_en: 'Chart Structure', width: '250px' },
        { field: 'code', header_fa: 'کد حساب', header_en: 'Account Code', width: '120px' },
        { field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان حساب', header_en: 'Account Title', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val || row.title_fa}</span>
                {(isRtl ? row.pathTitle_fa : row.pathTitle_en) && <span className="text-[10px] text-slate-500 truncate" title={isRtl ? row.pathTitle_fa : row.pathTitle_en}>{isRtl ? row.pathTitle_fa : row.pathTitle_en}</span>}
            </div>
        )}
    ];

    const costLovColumns = [
        { field: 'code', header_fa: 'کد هزینه', header_en: 'Cost Code', width: '100px' },
        { field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان هزینه', header_en: 'Cost Title', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val || row.title_fa}</span>
                {(isRtl ? row.pathTitle_fa : row.pathTitle_en) && <span className="text-[10px] text-slate-500 truncate" title={isRtl ? row.pathTitle_fa : row.pathTitle_en}>{isRtl ? row.pathTitle_fa : row.pathTitle_en}</span>}
            </div>
        )}
    ];

    const incomeLovColumns = [
        { field: 'code', header_fa: 'کد درآمد', header_en: 'Income Code', width: '100px' },
        { field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان درآمد', header_en: 'Income Title', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val || row.title_fa}</span>
                {(isRtl ? row.pathTitle_fa : row.pathTitle_en) && <span className="text-[10px] text-slate-500 truncate" title={isRtl ? row.pathTitle_fa : row.pathTitle_en}>{isRtl ? row.pathTitle_fa : row.pathTitle_en}</span>}
            </div>
        )}
    ];

    const itemGridData = useMemo(() => {
        const data = [...itemsData];
        if (inlineItemEdit && inlineItemEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineItemEdit.data });
        return data;
    }, [itemsData, inlineItemEdit]);

    const itemColumns = [
        { field: 'row_number', header_fa: '#', header_en: '#', width: '40px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" type="number" min="1" value={inlineItemEdit.data.row_number || ''} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, row_number: e.target.value}}))} isRtl={isRtl} dir="ltr" wrapperClassName="m-0" id="grid-inline-edit-marker" /></div>;
            }
            return row._isNew ? <span className="text-emerald-600 font-bold">*</span> : <span className="text-[12px]">{val}</span>;
        }},
        { field: 'account_id', header_fa: 'حساب *', header_en: 'Account *', width: '200px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return (
                    <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="w-full relative z-[100]">
                        <LOVField 
                            size="sm" formCode={formCode} data={lookups.leafAccounts} columns={accountLovColumns} dropdownWidth="min-w-[650px]"
                            displayValue={inlineItemEdit.data.account_obj ? `${inlineItemEdit.data.account_obj.code} - ${isRtl ? inlineItemEdit.data.account_obj.title_fa : (inlineItemEdit.data.account_obj.title_en || inlineItemEdit.data.account_obj.title_fa)}` : ''}
                            onChange={(r) => setInlineItemEdit(prev => ({...prev, data: { ...prev.data, account_id: r?.id, account_obj: r, currency: r?.currency_id || 'IRR' }}))}
                            isRtl={isRtl} wrapperClassName="m-0"
                        />
                    </div>
                );
            }
            const acc = lookups.leafAccounts.find(a => String(a.id) === String(val));
            return acc ? <span className="text-[12px] truncate block">{acc.code} - {isRtl ? acc.title_fa : (acc.title_en || acc.title_fa)}</span> : '';
        }},
        { field: 'transaction_action', header_fa: 'نوع', header_en: 'Type', width: '80px', render: (val, row) => {
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
        { field: 'transaction_group', header_fa: 'گروه', header_en: 'Group', width: '80px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[80]"><SelectField size="sm" options={TRANSACTION_GROUPS} value={inlineItemEdit.data.transaction_group} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, transaction_group: e.target.value, cost_type_id: '', income_type_id: ''}}))} isRtl={isRtl} wrapperClassName="m-0" /></div>;
            }
            return <span className="text-[12px]">{TRANSACTION_GROUPS.find(a => a.value === val)?.label || val}</span>;
        }},
        { field: 'sub_type', header_fa: 'هزینه/درآمد', header_en: 'Cost/Income', width: '150px', render: (_, row) => {
            const group = inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId) ? inlineItemEdit.data.transaction_group : row.transaction_group;
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                if (group === 'COST') {
                    return (
                        <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[70]">
                            <LOVField 
                                size="sm" formCode={formCode} data={lookups.costTypes} columns={costLovColumns} dropdownWidth="min-w-[500px]"
                                displayValue={(() => {
                                    const c = lookups.costTypes.find(c => String(c.id) === String(inlineItemEdit.data.cost_type_id));
                                    return c ? (isRtl ? c.title_fa : (c.title_en || c.title_fa)) : '';
                                })()}
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
                                displayValue={(() => {
                                    const c = lookups.incomeTypes.find(c => String(c.id) === String(inlineItemEdit.data.income_type_id));
                                    return c ? (isRtl ? c.title_fa : (c.title_en || c.title_fa)) : '';
                                })()}
                                onChange={(r) => setInlineItemEdit(prev => ({...prev, data: {...prev.data, income_type_id: r?.id}}))}
                                isRtl={isRtl} wrapperClassName="m-0"
                            />
                        </div>
                    );
                }
                return <div className="h-[32px] w-full bg-slate-100 dark:bg-slate-800 rounded opacity-50"></div>;
            }
            if (group === 'COST') {
                const c = lookups.costTypes.find(x => String(x.id) === String(row.cost_type_id));
                return <span className="text-[12px]">{c ? (isRtl ? c.title_fa : (c.title_en || c.title_fa)) : ''}</span>;
            }
            if (group === 'INCOME') {
                const c = lookups.incomeTypes.find(x => String(x.id) === String(row.income_type_id));
                return <span className="text-[12px]">{c ? (isRtl ? c.title_fa : (c.title_en || c.title_fa)) : ''}</span>;
            }
            return '-';
        }},
        { field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '50px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onClick={e => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.currency} disabled isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px]">{val}</span>;
        }},
        { field: 'deposit_amount', header_fa: 'واریز *', header_en: 'Deposit *', width: '100px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                const disabled = inlineItemEdit.data.transaction_action !== 'DEPOSIT';
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" type="text" disabled={disabled} value={formatNumber(inlineItemEdit.data.deposit_amount)} onChange={(e) => handleAmountChange(e, 'deposit_amount')} isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px] font-medium text-emerald-600 dark:text-emerald-500">{formatNumber(val)}</span>;
        }},
        { field: 'withdrawal_amount', header_fa: 'برداشت *', header_en: 'Withdrawal *', width: '100px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                const disabled = inlineItemEdit.data.transaction_action !== 'WITHDRAWAL';
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" type="text" disabled={disabled} value={formatNumber(inlineItemEdit.data.withdrawal_amount)} onChange={(e) => handleAmountChange(e, 'withdrawal_amount')} isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px] font-medium text-rose-600 dark:text-rose-500">{formatNumber(val)}</span>;
        }},
        { field: 'description', header_fa: 'شرح *', header_en: 'Description *', width: 'auto', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.description} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, description: e.target.value}}))} isRtl={isRtl} required wrapperClassName="m-0" placeholder={t('Enter برای ثبت', 'Enter to save')} /></div>;
            }
            return <span className="text-[12px] truncate">{val}</span>;
        }}
    ];

    const itemBulkActions = isReadOnly ? [] : [
        { label: t('حذف گروهی', 'Bulk Delete'), icon: Trash2, variant: 'danger-outline', requiredAccess: 'delete', onClick: (ids) => handleBulkDeleteItems(ids) }
    ];

    return (
        <DataGrid 
            data={itemGridData} columns={itemColumns}
            language={language} onAdd={isReadOnly ? undefined : handleAddItemClick} hideImport={true} hideExport={true} hideToolbar={true}
            selectable={!isReadOnly} bulkActions={itemBulkActions} onRowDoubleClick={(row) => handleEditItemClick(row)}
            className="h-full" formCode={formCode}
        />
    );
  };

  window.TransactionMainGrid = TransactionMainGrid;
})();