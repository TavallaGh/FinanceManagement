/* Filename: requests/RequestItemsGrid.js */
/* Editable items grid for requests – mirrors TransactionMainGrid.js pattern */
(() => {
  const React = window.React;
  const { useState, useMemo, useCallback, useImperativeHandle } = React;

  function FallbackComponent() { return null; }
  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

  const safeComp = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    if (c && c.default && (typeof c.default === 'function' || c.default.$$typeof)) return c.default;
    return FallbackComponent;
  };
  const safeIcon = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    if (c && c.default) return c.default;
    return FallbackIcon;
  };

  // ── Design System ──────────────────────────────────────────────────────────
  const DS      = window.DesignSystem || {};
  const DSGrid  = window.DSGrid || DS;
  const DSForms = window.DSForms || DS;

  const DataGrid    = safeComp(DSGrid,  'DataGrid');
  const LOVField    = safeComp(DSGrid,  'LOVField');
  const TextField   = safeComp(DSForms, 'TextField');
  const SelectField = safeComp(DSForms, 'SelectField');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const LucideIcons = window.LucideIcons || {};
  const Save  = safeIcon(LucideIcons, 'Save');
  const Trash2 = safeIcon(LucideIcons, 'Trash2');
  const X     = safeIcon(LucideIcons, 'X');

  // ── Constants (must stay in sync with RequestDetails.js) ──────────────────
  const TYPES_WITH_GROUP = ['GENERAL', 'BUDGET'];

  const formatNumberSafe = (val, forDisplay = false) => {
    if (val === null || val === undefined || val === '') return forDisplay ? '0' : '';
    const s = String(val).replace(/,/g, '');
    if (s.trim() === '' || isNaN(Number(s))) return forDisplay ? '0' : '';
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RequestItemsGrid
  // ════════════════════════════════════════════════════════════════════════════
  const RequestItemsGrid = React.forwardRef(({
    itemsData = [], onItemsChange, lookups = {}, requestType = 'GENERAL',
    isReadOnly = false, language = 'fa', showToast, formCode = ''
  }, ref) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const [inlineItemEdit, setInlineItemEdit] = useState(null);
    const showGroup = TYPES_WITH_GROUP.includes(requestType);

    useImperativeHandle(ref, () => ({
      cancelEdit: () => setInlineItemEdit(null),
    }));

    // ── local option lists ─────────────────────────────────────────────────
    const TX_ACTIONS = [
      { value: 'DEPOSIT',    label: t('واریز',   'Deposit')    },
      { value: 'WITHDRAWAL', label: t('برداشت',  'Withdrawal') },
    ];
    const TX_GROUPS = [
      { value: 'COST',    label: t('هزینه',  'Cost')    },
      { value: 'INCOME',  label: t('درآمد',  'Income')  },
      { value: 'BALANCE', label: t('بالانس', 'Balance') },
      { value: 'OTHER',   label: t('سایر',   'Other')   },
    ];

    // ── handlers ──────────────────────────────────────────────────────────
    const handleAmountChange = (e, field) => {
      const raw = e.target.value.replace(/,/g, '');
      if (raw === '' || !isNaN(raw))
        setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, [field]: raw } }));
    };

    const handleAddItemClick = () => {
      if (isReadOnly) return;
      if (inlineItemEdit) return showToast(t('ابتدا با Enter سطر جاری را ذخیره کنید.', 'Save current row first.'), 'warning');
      setInlineItemEdit({
        id: 'new',
        data: {
          row_number: itemsData.length + 1,
          account_id: '', account_obj: null, currency: '',
          transaction_action: 'DEPOSIT',
          transaction_group: showGroup ? 'COST' : null,
          cost_type_id: '', income_type_id: '',
          deposit_amount: '0', withdrawal_amount: '0',
          approved_amount: '0', remaining_amount: '0',
          description: '',
        },
      });
    };

    const handleEditItemClick = (row) => {
      if (isReadOnly || inlineItemEdit) return;
      const accObj = (lookups.leafAccounts || []).find(a => String(a.id) === String(row.account_id)) || null;
      setInlineItemEdit({
        id: row._tempId || row.id,
        data: {
          ...row,
          account_obj: accObj,
          deposit_amount:    row.deposit_amount    != null ? String(row.deposit_amount)    : '0',
          withdrawal_amount: row.withdrawal_amount != null ? String(row.withdrawal_amount) : '0',
          approved_amount:   row.approved_amount   != null ? String(row.approved_amount)   : '0',
          remaining_amount:  row.remaining_amount  != null ? String(row.remaining_amount)  : '0',
        },
      });
    };

    const handleSaveItemInline = () => {
      if (!inlineItemEdit) return;
      const form = inlineItemEdit.data;
      const numDep = parseFloat(String(form.deposit_amount    || '0').replace(/,/g, '')) || 0;
      const numWid = parseFloat(String(form.withdrawal_amount || '0').replace(/,/g, '')) || 0;

      if (numDep === 0 && numWid === 0)
        return showToast(t('مبلغ واریز یا برداشت باید بزرگتر از صفر باشد.', 'Amount must be greater than zero.'), 'warning');

      let newRowNum = parseInt(form.row_number, 10);
      if (isNaN(newRowNum) || newRowNum < 1) newRowNum = itemsData.length + (inlineItemEdit.id === 'new' ? 1 : 0);

      const dataToSave = {
        ...form,
        deposit_amount:    String(form.deposit_amount    || '0').replace(/,/g, ''),
        withdrawal_amount: String(form.withdrawal_amount || '0').replace(/,/g, ''),
      };
      if (inlineItemEdit.id === 'new') dataToSave._tempId = crypto.randomUUID();

      let otherItems = inlineItemEdit.id === 'new'
        ? [...itemsData]
        : itemsData.filter(i => i._tempId !== inlineItemEdit.id && i.id !== inlineItemEdit.id);

      otherItems.sort((a, b) => a.row_number - b.row_number);
      const idx = Math.min(Math.max(0, newRowNum - 1), otherItems.length);
      otherItems.splice(idx, 0, dataToSave);

      onItemsChange(otherItems.map((i, n) => ({ ...i, row_number: n + 1 })));
      setInlineItemEdit(null);
    };

    const handleRemoveItem = (row) => {
      if (isReadOnly) return;
      const next = itemsData.filter(i => i._tempId !== row._tempId && i.id !== row.id);
      onItemsChange(next.map((i, n) => ({ ...i, row_number: n + 1 })));
    };

    const handleBulkDeleteItems = (ids) => {
      if (isReadOnly) return;
      const next = itemsData.filter(i => !ids.includes(i.id) && !ids.includes(i._tempId));
      onItemsChange(next.map((i, n) => ({ ...i, row_number: n + 1 })));
      setInlineItemEdit(null);
      showToast(t('اقلام انتخاب شده حذف شدند.', 'Selected items deleted.'));
    };

    const handleInlineKeyDown = (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); e.stopPropagation(); handleSaveItemInline(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setInlineItemEdit(null); }
    };

    const isEditingRow = (row) =>
      inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId);

    // ── LOV column definitions ────────────────────────────────────────────
    const accLovCols = [
      { field: 'code',         header_fa: 'کد',     header_en: 'Code',  width: '90px'  },
      { field: 'displayLabel', header_fa: 'عنوان',  header_en: 'Title', width: '200px',
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
            {row.pathTitle && <span className="text-[10px] text-slate-500 truncate">{row.pathTitle}</span>}
          </div>
        )
      },
      { field: 'chart_name',   header_fa: 'ساختار', header_en: 'Chart', width: '110px' },
    ];

    const typeLovCols = [
      { field: 'code',         header_fa: 'کد',    header_en: 'Code',  width: '80px' },
      { field: 'displayLabel', header_fa: 'عنوان', header_en: 'Title', width: 'auto',
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
            {row.pathTitle && <span className="text-[10px] text-slate-500 truncate">{row.pathTitle}</span>}
          </div>
        )
      },
    ];

    // ── column definitions ────────────────────────────────────────────────
    const baseColumns = [
      {
        field: 'row_number', header_fa: '#', header_en: '#', width: '50px',
        render: (val, row) => {
          if (isEditingRow(row)) {
            return (
              <div id="grid-inline-edit-marker" onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}>
                <TextField size="sm" type="number" min="1" dir="ltr"
                  value={inlineItemEdit.data.row_number || ''}
                  onChange={e => setInlineItemEdit(p => ({ ...p, data: { ...p.data, row_number: parseInt(e.target.value) || 1 } }))}
                  isRtl={isRtl} wrapperClassName="m-0" />
              </div>
            );
          }
          return row._isNew
            ? <span className="text-emerald-600 font-bold text-[12px]">*</span>
            : <span className="text-[12px]">{val}</span>;
        },
      },
      {
        field: 'account_id', header_fa: 'حساب', header_en: 'Account', width: '200px',
        render: (val, row) => {
          if (isEditingRow(row)) {
            return (
              <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="w-full relative z-[100]">
                <LOVField size="sm" formCode={formCode}
                  data={lookups.leafAccounts || []} columns={accLovCols} dropdownWidth="min-w-[600px]"
                  displayValue={
                    inlineItemEdit.data.account_obj
                      ? `${inlineItemEdit.data.account_obj.code ? inlineItemEdit.data.account_obj.code + ' - ' : ''}${inlineItemEdit.data.account_obj.displayLabel || ''}`
                      : ''
                  }
                  onChange={r => {
                    if (!r) {
                      setInlineItemEdit(p => ({ ...p, data: { ...p.data, account_id: '', account_obj: null, currency: '' } }));
                      return;
                    }
                    const curObj = (lookups.currencies || []).find(c => String(c.id) === String(r.currency_id));
                    setInlineItemEdit(p => ({ ...p, data: { ...p.data, account_id: r.id, account_obj: r, currency: curObj ? curObj.code : '' } }));
                  }}
                  isRtl={isRtl} wrapperClassName="m-0"
                />
              </div>
            );
          }
          const acc = (lookups.leafAccounts || []).find(a => String(a.id) === String(val));
          return acc
            ? <div className="flex flex-col"><span className="text-[12px] font-bold truncate">{acc.displayLabel}</span><span className="text-[10px] text-slate-400 font-mono">{acc.code}</span></div>
            : <span className="text-[12px] text-slate-400">-</span>;
        },
      },
      {
        field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '65px',
        render: (val, row) => {
          if (isEditingRow(row)) {
            return <div onClick={e => e.stopPropagation()}>
              <TextField size="sm" value={inlineItemEdit.data.currency || ''} disabled isRtl={isRtl} dir="ltr" wrapperClassName="m-0" />
            </div>;
          }
          return <span dir="ltr" className="text-[12px] font-mono">{val || '-'}</span>;
        },
      },
      {
        field: 'transaction_action', header_fa: 'نوع', header_en: 'Action', width: '90px',
        render: (val, row) => {
          if (isEditingRow(row)) {
            return (
              <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[90]">
                <SelectField size="sm" formCode={formCode}
                  options={TX_ACTIONS}
                  value={inlineItemEdit.data.transaction_action || 'DEPOSIT'}
                  onChange={e => {
                    const action = e.target.value;
                    setInlineItemEdit(p => ({
                      ...p, data: {
                        ...p.data, transaction_action: action,
                        deposit_amount:    action === 'DEPOSIT'    ? p.data.deposit_amount    : '0',
                        withdrawal_amount: action === 'WITHDRAWAL' ? p.data.withdrawal_amount : '0',
                      }
                    }));
                  }}
                  isRtl={isRtl} wrapperClassName="m-0" />
              </div>
            );
          }
          const isDeposit = val === 'DEPOSIT';
          return <span className={`text-[12px] font-bold ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {isRtl ? (isDeposit ? 'واریز' : 'برداشت') : (isDeposit ? 'Deposit' : 'Withdrawal')}
          </span>;
        },
      },
    ];

    const groupColumns = [
      {
        field: 'transaction_group', header_fa: 'گروه', header_en: 'Group', width: '90px',
        render: (val, row) => {
          if (isEditingRow(row)) {
            return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[80]">
              <SelectField size="sm" formCode={formCode}
                options={TX_GROUPS}
                value={inlineItemEdit.data.transaction_group || 'COST'}
                onChange={e => setInlineItemEdit(p => ({ ...p, data: { ...p.data, transaction_group: e.target.value, cost_type_id: '', income_type_id: '' } }))}
                isRtl={isRtl} wrapperClassName="m-0" />
            </div>;
          }
          return <span className="text-[12px]">{TX_GROUPS.find(g => g.value === val)?.label || '-'}</span>;
        },
      },
      {
        field: 'sub_type', header_fa: 'نوع هزینه / درآمد', header_en: 'Cost / Income Type', width: '170px',
        render: (_, row) => {
          const group = isEditingRow(row) ? inlineItemEdit.data.transaction_group : row.transaction_group;
          if (isEditingRow(row)) {
            if (group === 'COST') {
              return (
                <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[70]">
                  <LOVField size="sm" formCode={formCode}
                    data={lookups.costTypes || []} columns={typeLovCols} dropdownWidth="min-w-[380px]"
                    displayValue={(lookups.costTypes || []).find(c => String(c.id) === String(inlineItemEdit.data.cost_type_id))?.displayLabel || ''}
                    onChange={r => setInlineItemEdit(p => ({ ...p, data: { ...p.data, cost_type_id: r ? r.id : '', income_type_id: '' } }))}
                    isRtl={isRtl} wrapperClassName="m-0"
                  />
                </div>
              );
            }
            if (group === 'INCOME') {
              return (
                <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[70]">
                  <LOVField size="sm" formCode={formCode}
                    data={lookups.incomeTypes || []} columns={typeLovCols} dropdownWidth="min-w-[380px]"
                    displayValue={(lookups.incomeTypes || []).find(c => String(c.id) === String(inlineItemEdit.data.income_type_id))?.displayLabel || ''}
                    onChange={r => setInlineItemEdit(p => ({ ...p, data: { ...p.data, income_type_id: r ? r.id : '', cost_type_id: '' } }))}
                    isRtl={isRtl} wrapperClassName="m-0"
                  />
                </div>
              );
            }
            return <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded opacity-40" />;
          }
          if (group === 'COST')   { const c = (lookups.costTypes   || []).find(x => String(x.id) === String(row.cost_type_id));   return <span className="text-[12px]">{c?.displayLabel || '-'}</span>; }
          if (group === 'INCOME') { const c = (lookups.incomeTypes || []).find(x => String(x.id) === String(row.income_type_id)); return <span className="text-[12px]">{c?.displayLabel || '-'}</span>; }
          return <span className="text-[12px]">-</span>;
        },
      },
    ];

    const amountColumns = [
      {
        field: 'deposit_amount', header_fa: 'واریز', header_en: 'Deposit', width: '110px',
        render: (val, row) => {
          const raw = row.deposit_amount !== undefined ? row.deposit_amount : val;
          if (isEditingRow(row)) {
            const disabled = inlineItemEdit.data.transaction_action !== 'DEPOSIT';
            return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}>
              <TextField size="sm" type="text" disabled={disabled}
                value={formatNumberSafe(inlineItemEdit.data.deposit_amount)}
                onChange={e => handleAmountChange(e, 'deposit_amount')}
                isRtl={isRtl} dir="ltr" wrapperClassName="m-0" />
            </div>;
          }
          return <span dir="ltr" className="block w-full text-right text-[12px] font-medium text-emerald-600 dark:text-emerald-500">{formatNumberSafe(raw, true)}</span>;
        },
      },
      {
        field: 'withdrawal_amount', header_fa: 'برداشت', header_en: 'Withdrawal', width: '110px',
        render: (val, row) => {
          const raw = row.withdrawal_amount !== undefined ? row.withdrawal_amount : val;
          if (isEditingRow(row)) {
            const disabled = inlineItemEdit.data.transaction_action !== 'WITHDRAWAL';
            return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}>
              <TextField size="sm" type="text" disabled={disabled}
                value={formatNumberSafe(inlineItemEdit.data.withdrawal_amount)}
                onChange={e => handleAmountChange(e, 'withdrawal_amount')}
                isRtl={isRtl} dir="ltr" wrapperClassName="m-0" />
            </div>;
          }
          return <span dir="ltr" className="block w-full text-right text-[12px] font-medium text-rose-600 dark:text-rose-500">{formatNumberSafe(raw, true)}</span>;
        },
      },
      {
        field: 'description', header_fa: 'شرح', header_en: 'Description', width: 'auto',
        render: (val, row) => {
          if (isEditingRow(row)) {
            return <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()}>
              <TextField size="sm"
                value={inlineItemEdit.data.description || ''}
                onChange={e => setInlineItemEdit(p => ({ ...p, data: { ...p.data, description: e.target.value } }))}
                isRtl={isRtl} wrapperClassName="m-0" placeholder={t('Enter برای ثبت', 'Enter to save')} />
            </div>;
          }
          return <span className="text-[12px] truncate">{val || '-'}</span>;
        },
      },
    ];

    const itemColumns = [
      ...baseColumns,
      ...(showGroup ? groupColumns : []),
      ...amountColumns,
    ];

    const itemGridData = useMemo(() => {
      const data = [...itemsData];
      if (inlineItemEdit && inlineItemEdit.id === 'new')
        data.unshift({ id: 'new', _isNew: true, ...inlineItemEdit.data });
      return data;
    }, [itemsData, inlineItemEdit]);

    const rowActions = isReadOnly ? [] : [
      {
        icon: Save,
        tooltip: t('ذخیره سطر', 'Save Row'),
        className: 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50',
        hidden: (row) => !(inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)),
        onClick: () => handleSaveItemInline(),
      },
      {
        icon: X,
        tooltip: t('انصراف', 'Cancel'),
        className: 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50',
        hidden: (row) => !(inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)),
        onClick: () => setInlineItemEdit(null),
      },
      {
        icon: Trash2,
        tooltip: t('حذف', 'Delete'),
        className: 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/50',
        hidden: (row) => !!(inlineItemEdit && (inlineItemEdit.id === row.id || inlineItemEdit.id === row._tempId)),
        onClick: (row) => handleRemoveItem(row),
      },
    ];

    const itemBulkActions = isReadOnly ? [] : [
      { label: t('حذف گروهی', 'Bulk Delete'), icon: Trash2, variant: 'danger-outline', onClick: handleBulkDeleteItems },
    ];

    return (
      <DataGrid
        data={itemGridData}
        columns={itemColumns}
        actionWidth="80px"
        language={language}
        onAdd={isReadOnly ? undefined : handleAddItemClick}
        hideImport={true}
        hideExport={true}
        hideToolbar={true}
        selectable={!isReadOnly}
        bulkActions={itemBulkActions}
        onRowDoubleClick={(row) => handleEditItemClick(row)}
        actions={rowActions}
        className="h-full border-0"
        formCode={formCode}
      />
    );
  });

  window.RequestItemsGrid = RequestItemsGrid;
})();
