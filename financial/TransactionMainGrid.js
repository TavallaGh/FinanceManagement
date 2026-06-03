/* Filename: financial/TransactionMainGrid.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { Edit = FallbackIcon, Trash2 = FallbackIcon, X = FallbackIcon } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const { Button = FallbackComponent } = Core;

  const Forms = window.DSForms || DS || {};
  const { TextField = FallbackComponent, SelectField = FallbackComponent } = Forms;

  const Grid = window.DSGrid || DS || {};
  const { DataGrid = FallbackComponent, LOVField = FallbackComponent } = Grid;

  function FallbackComponent() { return null; }

  const TransactionMainGrid = ({ items = [], onItemsChange, lookups = {}, isReadOnly = false, language = 'fa', isRtl = true, formCode, showToast }) => {
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

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

    const [inlineItemEdit, setInlineItemEdit] = useState(null);

    const handleAddItemClick = () => {
        if (isReadOnly) return;
        if (inlineItemEdit) return showToast(t('ابتدا با زدن دکمه Enter سطر جاری را ذخیره کنید.', 'Save current row first.'), 'warning');
        setInlineItemEdit({
            id: 'new',
            data: { row_number: items.length + 1, account_id: '', account_obj: null, transaction_action: 'DEPOSIT', transaction_group: 'COST', cost_type_id: '', income_type_id: '', currency: '', amount: '', description: '' }
        });
    };

    const handleEditItemClick = (row) => {
        if (isReadOnly || inlineItemEdit) return;
        const accObj = (lookups.leafAccounts || []).find(a => String(a.id) === String(row.account_id)) || null;
        setInlineItemEdit({
            id: row._tempId || row.id,
            data: { ...row, account_obj: accObj, amount: row.amount ? String(row.amount).replace(/,/g, '') : '' }
        });
    };

    const handleSaveItemInline = () => {
        if (!inlineItemEdit) return;
        const form = inlineItemEdit.data;
        
        if (!form.account_id || !form.amount || !form.description) {
            return showToast(t('حساب، مبلغ و شرح اجباری هستند.', 'Account, Amount, and Description required.'), 'warning');
        }

        const cleanAmount = String(form.amount || '0').replace(/,/g, '');
        if (isNaN(cleanAmount) || cleanAmount === '') return showToast(t('مبلغ نامعتبر است.', 'Invalid amount.'), 'warning');

        let newRowNum = parseInt(form.row_number, 10);
        if (isNaN(newRowNum) || newRowNum < 1) newRowNum = items.length + (inlineItemEdit.id === 'new' ? 1 : 0);

        const dataToSave = { ...form, amount: cleanAmount };
        if (inlineItemEdit.id === 'new') dataToSave._tempId = crypto.randomUUID();

        let otherItems = items;
        if (inlineItemEdit.id !== 'new') {
            otherItems = items.filter(item => item._tempId !== inlineItemEdit.id && item.id !== inlineItemEdit.id);
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
        const newItems = items.filter(item => item._tempId !== row._tempId && item.id !== row.id);
        onItemsChange(newItems.map((item, idx) => ({ ...item, row_number: idx + 1 })));
    };

    const handleBulkDeleteItems = (ids) => {
        if (isReadOnly) return;
        const newItems = items.filter(item => !ids.includes(item.id) && !ids.includes(item._tempId));
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
        { field: 'chart_name', header_fa: 'ساختار حساب', header_en: 'Chart', width: '120px' },
        { field: 'code', header_fa: 'کد حساب', header_en: 'Account Code', width: '100px' },
        { field: 'displayLabel', header_fa: 'عنوان حساب', header_en: 'Account Title', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                {row.pathTitle && <span className="text-[10px] text-slate-500 truncate" title={row.pathTitle}>{row.pathTitle}</span>}
            </div>
        )}
    ];

    const costLovColumns = [
        { field: 'code', header_fa: 'کد هزینه', header_en: 'Cost Code', width: '100px' },
        { field: 'displayLabel', header_fa: 'عنوان هزینه', header_en: 'Cost Title', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                {row.pathTitle && <span className="text-[10px] text-slate-500 truncate" title={row.pathTitle}>{row.pathTitle}</span>}
            </div>
        )}
    ];

    const incomeLovColumns = [
        { field: 'code', header_fa: 'کد درآمد', header_en: 'Income Code', width: '100px' },
        { field: 'displayLabel', header_fa: 'عنوان درآمد', header_en: 'Income Title', width: 'auto', render: (val, row) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                {row.pathTitle && <span className="text-[10px] text-slate-500 truncate" title={row.pathTitle}>{row.pathTitle}</span>}
            </div>
        )}
    ];

    const itemGridData = useMemo(() => {
        const data = [...items];
        if (inlineItemEdit && inlineItemEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineItemEdit.data });
        return data;
    }, [items, inlineItemEdit]);

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
                            size="sm" formCode={formCode} data={lookups.leafAccounts || []} columns={accountLovColumns} dropdownWidth="min-w-[400px]"
                            displayValue={inlineItemEdit.data.account_obj ? `${inlineItemEdit.data.account_obj.code} - ${inlineItemEdit.data.account_obj.displayLabel}` : ''}
                            onChange={(r) => setInlineItemEdit(prev => ({...prev, data: { ...prev.data, account_id: r?.id, account_obj: r, currency: r?.currency_id || 'IRR' }}))}
                            isRtl={isRtl} wrapperClassName="m-0"
                        />
                    </div>
                );
            }
            const acc = (lookups.leafAccounts || []).find(a => String(a.id) === String(val));
            return acc ? <span className="text-[12px] truncate block">{acc.code} - {acc.displayLabel}</span> : '';
        }},
        { field: 'transaction_action', header_fa: 'نوع', width: '80px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[90]"><SelectField size="sm" options={TRANSACTION_ACTIONS} value={inlineItemEdit.data.transaction_action} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, transaction_action: e.target.value}}))} isRtl={isRtl} wrapperClassName="m-0" /></div>;
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
                                size="sm" formCode={formCode} data={lookups.costTypes || []} columns={costLovColumns} dropdownWidth="min-w-[400px]"
                                displayValue={(lookups.costTypes || []).find(c => c.id === inlineItemEdit.data.cost_type_id)?.displayLabel || ''}
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
                                size="sm" formCode={formCode} data={lookups.incomeTypes || []} columns={incomeLovColumns} dropdownWidth="min-w-[400px]"
                                displayValue={(lookups.incomeTypes || []).find(c => c.id === inlineItemEdit.data.income_type_id)?.displayLabel || ''}
                                onChange={(r) => setInlineItemEdit(prev => ({...prev, data: {...prev.data, income_type_id: r?.id}}))}
                                isRtl={isRtl} wrapperClassName="m-0"
                            />
                        </div>
                    );
                }
                return <div className="h-[32px] w-full bg-slate-100 dark:bg-slate-800 rounded opacity-50"></div>;
            }
            if (group === 'COST') return <span className="text-[12px]">{(lookups.costTypes || []).find(x => String(x.id) === String(row.cost_type_id))?.displayLabel || ''}</span>;
            if (group === 'INCOME') return <span className="text-[12px]">{(lookups.incomeTypes || []).find(x => String(x.id) === String(row.income_type_id))?.displayLabel || ''}</span>;
            return '-';
        }},
        { field: 'currency', header_fa: 'ارز', width: '50px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onClick={e => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.currency} disabled isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px]">{val}</span>;
        }},
        { field: 'amount', header_fa: 'مبلغ *', width: '100px', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" type="text" value={formatNumber(inlineItemEdit.data.amount)} onChange={handleAmountChange} isRtl={isRtl} dir="ltr" wrapperClassName="m-0" /></div>;
            }
            return <span dir="ltr" className="text-[12px] font-medium">{formatNumber(val)}</span>;
        }},
        { field: 'description', header_fa: 'شرح *', width: 'auto', render: (val, row) => {
            if (inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)) {
                return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}><TextField size="sm" value={inlineItemEdit.data.description} onChange={e => setInlineItemEdit(prev => ({...prev, data: {...prev.data, description: e.target.value}}))} isRtl={isRtl} required wrapperClassName="m-0" placeholder={t('Enter برای ثبت', 'Enter to save')} /></div>;
            }
            return <span className="text-[12px] truncate">{val}</span>;
        }},
        { field: 'actions', header_fa: '', width: '40px', render: (_, row) => {
            if (isReadOnly) return null;
            const isEditing = inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId);
            if (isEditing) {
                return (
                    <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="sm" icon={X} onClick={e => { e.stopPropagation(); setInlineItemEdit(null); }} className="!text-slate-500 hover:!bg-slate-100 dark:hover:!bg-slate-800 !p-1 h-6 w-6" title={t('انصراف (Esc)', 'Cancel')} />
                    </div>
                );
            }
            if (inlineItemEdit) return null;
            return (
                <div className="flex gap-1 justify-center">
                    <Button variant="ghost" size="sm" icon={Edit} onClick={e => { e.stopPropagation(); handleEditItemClick(row); }} className="!text-indigo-600 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/30 !p-1 h-6 w-6" />
                    <Button variant="ghost" size="sm" icon={Trash2} onClick={e => { e.stopPropagation(); handleRemoveItem(row); }} className="!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-900/30 !p-1 h-6 w-6" />
                </div>
            );
        }}
    ];

    const itemBulkActions = isReadOnly ? [] : [
        { label: t('حذف گروهی', 'Bulk Delete'), icon: Trash2, variant: 'danger-outline', requiredAccess: 'delete', onClick: (ids) => handleBulkDeleteItems(ids) }
    ];

    return (
        <div className="flex-1 w-full p-1 relative min-h-[300px] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col min-w-0">
            <DataGrid 
                data={itemGridData} columns={itemColumns}
                language={language} onAdd={isReadOnly ? undefined : handleAddItemClick} hideImport={true} hideExport={true} hideToolbar={true}
                selectable={!isReadOnly} bulkActions={itemBulkActions} onRowDoubleClick={(row) => handleEditItemClick(row)}
                className="h-full"
            />
        </div>
    );
  };

  window.TransactionMainGrid = TransactionMainGrid;
})();