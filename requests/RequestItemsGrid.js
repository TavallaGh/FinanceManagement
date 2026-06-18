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
  const TYPES_WITH_TRANSFER = ['TRANSFER'];
  const TYPES_WITH_CONVERSION = ['CONVERSION'];
  const TYPES_BALANCED = ['TRANSFER', 'CONVERSION'];

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
    const isTransfer = TYPES_WITH_TRANSFER.includes(requestType);
    const isConversion = TYPES_WITH_CONVERSION.includes(requestType);
    const isBalanced = TYPES_BALANCED.includes(requestType);
    const isBudget = requestType === 'BUDGET';

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
      
      // پیشنهاد خودکار ارز از آخرین ردیف در TRANSFER و CONVERSION
      let suggestedCurrency = '';
      if (isBalanced && itemsData.length > 0) {
        const lastItem = itemsData[itemsData.length - 1];
        if (lastItem && lastItem.currency) suggestedCurrency = lastItem.currency;
      }

      // دپارتمان پیشفرض برای BUDGET
      const defaultDepartment = isBudget ? (lookups.currentUserDeptId || '') : '';

      setInlineItemEdit({
        id: 'new',
        data: {
          row_number: itemsData.length + 1,
          currency: suggestedCurrency,
          transaction_action: isTransfer ? (itemsData.length % 2 === 0 ? 'WITHDRAWAL' : 'DEPOSIT') : 'DEPOSIT',          
          party_id: '', party_obj: null,
          department_id: defaultDepartment,
          project_id: '',
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
      const partyObj = (lookups.partiesList || []).find(p => String(p.id) === String(row.party_id)) || null;
      const defaultDept = isBudget && !row.department_id ? (lookups.currentUserDeptId || '') : (row.department_id || '');
      setInlineItemEdit({
        id: row._tempId || row.id,
        data: {
          ...row,
          party_obj: partyObj,
          department_id: defaultDept,
          project_id: row.project_id || '',
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

      // برای BUDGET فقط واریز باید بزرگتر از صفر باشد
      if (isBudget) {
        if (numDep === 0)
          return showToast(t('مبلغ باید بزرگتر از صفر باشد.', 'Amount must be greater than zero.'), 'warning');
      } else {
        if (numDep === 0 && numWid === 0)
          return showToast(t('مبلغ واریز یا برداشت باید بزرگتر از صفر باشد.', 'Amount must be greater than zero.'), 'warning');
      }

      if (!form.currency || !form.currency.trim())
        return showToast(t('انتخاب ارز الزامی است.', 'Currency is required.'), 'warning');

      if (!form.description || !form.description.trim())
        return showToast(t('شرح الزامی است.', 'Description is required.'), 'warning');

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

    const partyLovCols = [
      { field: 'code',         header_fa: 'کد',      header_en: 'Code',   width: '90px' },
      { field: 'displayLabel', header_fa: 'نام',     header_en: 'Name',   width: '200px' },
      { field: 'mobile',       header_fa: 'موبایل',  header_en: 'Mobile', width: '120px', render: (val) => <span dir="ltr" className="font-mono text-[11px]">{val || '-'}</span> },
    ];

    const deptLovCols = [
      { field: 'id',    header_fa: 'شناسه',  header_en: 'ID',    width: '70px' },
      { field: 'title', header_fa: 'عنوان',  header_en: 'Title', width: 'auto' },
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
        field: 'transaction_action', header_fa: 'نوع', header_en: 'Action', width: '90px',
        render: (val, row) => {
          if (isEditingRow(row)) {
            return (
              <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[100]">
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

    const currencyColumn = {
      field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '110px',
      render: (val, row) => {
        if (isEditingRow(row)) {
          const currLovCols = [
            { field: 'code',  header_fa: 'کد',     header_en: 'Code',  width: '70px' },
            { field: 'title', header_fa: 'عنوان',  header_en: 'Title', width: 'auto' },
          ];
          return (
            <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="relative z-[95]">
              <LOVField size="sm" formCode={formCode}
                data={lookups.currencies || []} columns={currLovCols} dropdownWidth="min-w-[300px]"
                displayValue={
                  inlineItemEdit.data.currency
                    ? `${inlineItemEdit.data.currency} - ${(lookups.currencies || []).find(c => c.code === inlineItemEdit.data.currency)?.title || ''}`
                    : ''
                }
                onChange={r => setInlineItemEdit(p => ({ ...p, data: { ...p.data, currency: r ? r.code : '' } }))}
                isRtl={isRtl} wrapperClassName="m-0"
              />
            </div>
          );
        }
        return <span dir="ltr" className="text-[12px] font-mono">{val || '-'}</span>;
      },
    };

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
                isRtl={isRtl} wrapperClassName="m-0" disabled={isBudget} />
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
        field: 'deposit_amount', header_fa: isBudget ? 'مبلغ' : 'واریز', header_en: isBudget ? 'Amount' : 'Deposit', width: '110px',
        render: (val, row) => {
          const raw = row.deposit_amount !== undefined ? row.deposit_amount : val;
          if (isEditingRow(row)) {
            const disabled = !isBudget && inlineItemEdit.data.transaction_action !== 'DEPOSIT';
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
    ];

    const partyColumn = {
      field: 'party_id',
      header_fa: isTransfer ? (t('برداشت کننده', 'Withdrawer') + ' / ' + t('دریافت کننده', 'Receiver')) : t('طرف مقابل', 'Party'),
      header_en: isTransfer ? 'Withdrawer / Receiver' : 'Party',
      width: '180px',
      render: (val, row) => {
        if (isEditingRow(row)) {
          const labelFa = inlineItemEdit.data.transaction_action === 'WITHDRAWAL' ? 'برداشت کننده' : 'دریافت کننده';
          const labelEn = inlineItemEdit.data.transaction_action === 'WITHDRAWAL' ? 'Withdrawer' : 'Receiver';
          return (
            <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="w-full relative z-[60]">
              <LOVField size="sm" formCode={formCode}
                data={lookups.partiesList || []} columns={partyLovCols} dropdownWidth="min-w-[500px]"
                displayValue={
                  inlineItemEdit.data.party_obj
                    ? `${inlineItemEdit.data.party_obj.code ? inlineItemEdit.data.party_obj.code + ' - ' : ''}${inlineItemEdit.data.party_obj.displayLabel || ''}`
                    : ''
                }
                onChange={r => {
                  setInlineItemEdit(p => ({ ...p, data: { ...p.data, party_id: r ? r.id : '', party_obj: r } }));
                }}
                isRtl={isRtl} wrapperClassName="m-0" placeholder={t(labelFa, labelEn)}
              />
            </div>
          );
        }
        const party = (lookups.partiesList || []).find(p => String(p.id) === String(val));
        return party
          ? <div className="flex flex-col"><span className="text-[12px] font-bold truncate">{party.displayLabel}</span><span className="text-[10px] text-slate-400 font-mono">{party.code || ''}</span></div>
          : <span className="text-[12px] text-slate-400">-</span>;
      },
    };

    const descriptionColumn = {
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
    };

    // ── transfer-specific columns ─────────────────────────────────────────
    const transferDepartmentColumn = {
      field: 'department_id',
      header_fa: t('از دپارتمان', 'From Dept') + ' / ' + t('به دپارتمان', 'To Dept'),
      header_en: 'From Dept / To Dept',
      width: '150px',
      render: (val, row) => {
        if (isEditingRow(row)) {
          const deptList = Object.keys(lookups.nodesMap || {}).map(id => ({
            id,
            title: lookups.nodesMap[id],
          }));
          const isWithdrawal = inlineItemEdit.data.transaction_action === 'WITHDRAWAL';
          const labelFa = isWithdrawal ? 'از دپارتمان' : 'به دپارتمان';
          const labelEn = isWithdrawal ? 'From Dept' : 'To Dept';
          
          return (
            <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="w-full relative z-[55]">
              <LOVField size="sm" formCode={formCode}
                data={deptList} columns={deptLovCols} dropdownWidth="min-w-[350px]"
                displayValue={(lookups.nodesMap || {})[inlineItemEdit.data.department_id] || ''}
                onChange={r => {
                  setInlineItemEdit(p => ({ ...p, data: { ...p.data, department_id: r ? r.id : '' } }));
                }}
                isRtl={isRtl} wrapperClassName="m-0" placeholder={t(labelFa, labelEn)}
              />
            </div>
          );
        }
        return <span className="text-[12px]">{(lookups.nodesMap || {})[val] || '-'}</span>;
      },
    };

    // ── general department column (for GENERAL and BUDGET types) ──────────
    const generalDepartmentColumn = {
      field: 'department_id',
      header_fa: t('دپارتمان', 'Department'),
      header_en: 'Department',
      width: '150px',
      render: (val, row) => {
        if (isEditingRow(row)) {
          const deptList = Object.keys(lookups.nodesMap || {}).map(id => ({
            id,
            title: lookups.nodesMap[id],
          }));
          
          return (
            <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="w-full relative z-[55]">
              <LOVField size="sm" formCode={formCode}
                data={deptList} columns={deptLovCols} dropdownWidth="min-w-[350px]"
                displayValue={(lookups.nodesMap || {})[inlineItemEdit.data.department_id] || ''}
                onChange={r => {
                  setInlineItemEdit(p => ({ ...p, data: { ...p.data, department_id: r ? r.id : '' } }));
                }}
                isRtl={isRtl} wrapperClassName="m-0" placeholder={t('دپارتمان', 'Department')}
              />
            </div>
          );
        }
        return <span className="text-[12px]">{(lookups.nodesMap || {})[val] || '-'}</span>;
      },
    };

    // ── project column ────────────────────────────────────────────────────
    const projectColumn = {
      field: 'project_id',
      header_fa: t('پروژه', 'Project'),
      header_en: 'Project',
      width: '130px',
      render: (val, row) => {
        if (isEditingRow(row)) {
          return (
            <div onKeyDown={handleInlineKeyDown} onClick={e => e.stopPropagation()} className="w-full relative z-[50]">
              <TextField size="sm"
                value={inlineItemEdit.data.project_id || ''}
                onChange={e => setInlineItemEdit(p => ({ ...p, data: { ...p.data, project_id: e.target.value } }))}
                isRtl={isRtl} wrapperClassName="m-0" placeholder={t('پروژه', 'Project')}
              />
            </div>
          );
        }
        return <span className="text-[12px]">{val || '-'}</span>;
      },
    };

    // ترتیب یکپارچه ستون‌ها در همه انواع درخواست (فقط نمایش برخی تغییر می‌کند)
    const itemColumns = [
      baseColumns[0], // ردیف
      ...(isBudget ? [] : [baseColumns[1]]), // نوع (واریز/برداشت) - مخفی در BUDGET
      ...(showGroup ? [groupColumns[0]] : []), // گروه
      ...(showGroup ? [groupColumns[1]] : []), // نوع هزینه/درآمد
      ...(isConversion || isBudget ? [] : [partyColumn]), // طرف مقابل - مخفی در CONVERSION و BUDGET
      ...(isConversion ? [] : (isTransfer ? [transferDepartmentColumn] : [generalDepartmentColumn])), // دپارتمان - مخفی در CONVERSION
      ...(isConversion ? [] : [projectColumn]), // پروژه - مخفی در CONVERSION
      currencyColumn, // ارز
      amountColumns[0], // مبلغ واریز
      ...(isBudget ? [] : [amountColumns[1]]), // مبلغ برداشت - مخفی در BUDGET
      descriptionColumn, // شرح
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
