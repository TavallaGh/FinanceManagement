/* Filename: requests/RequestDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef, useImperativeHandle } = React;

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
  const Core    = window.DSCore || DS;
  const Button      = safeComp(Core, 'Button');
  const Badge       = safeComp(Core, 'Badge');
  const Card        = safeComp(Core, 'Card');

  const DSGrid      = window.DSGrid || DS;
  const DataGrid    = safeComp(DSGrid, 'DataGrid');
  const LOVField    = safeComp(DSGrid, 'LOVField');

  const DSForms     = window.DSForms || DS;
  const TextField   = safeComp(DSForms, 'TextField');
  const SelectField = safeComp(DSForms, 'SelectField');
  const DatePicker  = safeComp(DSForms, 'DatePicker');

  const DSFeedback  = window.DSFeedback || window.DSOverlays || DS;
  const Modal       = safeComp(DSFeedback, 'Modal');
  const Toast       = safeComp(DSFeedback, 'Toast');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const LucideIcons   = window.LucideIcons || {};
  const Save          = safeIcon(LucideIcons, 'Save');
  const Trash2        = safeIcon(LucideIcons, 'Trash2');
  const X             = safeIcon(LucideIcons, 'X');
  const Check         = safeIcon(LucideIcons, 'Check');
  const AlertTriangle = safeIcon(LucideIcons, 'AlertTriangle');
  const Send          = safeIcon(LucideIcons, 'Send');
  const CheckCircle   = safeIcon(LucideIcons, 'CheckCircle');
  const XCircle       = safeIcon(LucideIcons, 'XCircle');
  const RotateCcw     = safeIcon(LucideIcons, 'RotateCcw');
  const Lock          = safeIcon(LucideIcons, 'Lock');
  const PlayCircle    = safeIcon(LucideIcons, 'PlayCircle');
  const CheckSquare   = safeIcon(LucideIcons, 'CheckSquare');

  // ── Shared constants (mirrored from RequestManagement.js) ─────────────────
  const REQUEST_TYPES = [
    { value: 'TRANSFER',   fa: 'انتقال',  en: 'Transfer'   },
    { value: 'CONVERSION', fa: 'تبدیل',   en: 'Conversion' },
    { value: 'BUDGET',     fa: 'بودجه',   en: 'Budget'     },
    { value: 'GENERAL',    fa: 'عمومی',   en: 'General'    },
  ];

  const STATUS_LIST = [
    { value: 'DRAFT',       fa: 'یادداشت',      en: 'Draft',        color: 'slate'   },
    { value: 'REGISTERED',  fa: 'ثبت شده',      en: 'Registered',   color: 'blue'    },
    { value: 'REVIEWED',    fa: 'بررسی شده',    en: 'Reviewed',     color: 'indigo'  },
    { value: 'APPROVED',    fa: 'تایید شده',    en: 'Approved',     color: 'emerald' },
    { value: 'IN_PROGRESS', fa: 'در حال انجام', en: 'In Progress',  color: 'orange'  },
    { value: 'DONE',        fa: 'انجام شده',    en: 'Done',         color: 'teal'    },
    { value: 'REJECTED',    fa: 'عدم تایید',    en: 'Rejected',     color: 'red'     },
    { value: 'CLOSED',      fa: 'بسته شده',     en: 'Closed',       color: 'gray'    },
  ];

  const TYPES_WITH_GROUP = ['GENERAL', 'BUDGET'];
  const lockedStatuses   = ['REGISTERED', 'REVIEWED', 'APPROVED', 'IN_PROGRESS', 'DONE', 'REJECTED', 'CLOSED'];

  const getStatus = (v) => STATUS_LIST.find(s => s.value === v) || STATUS_LIST[0];

  const getSessionUserId = () => {
    try {
      const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
      return JSON.parse(s).id || null;
    } catch { return null; }
  };

  const formatNumberSafe = (val, forDisplay = false) => {
    if (val === null || val === undefined || val === '') return forDisplay ? '0' : '';
    const s = String(val).replace(/,/g, '');
    if (s.trim() === '' || isNaN(Number(s))) return forDisplay ? '0' : '';
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RequestItemsGrid  –  follows TransactionMainGrid.js DataGrid pattern exactly
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

    // ── local option lists (use t so labels honour language) ──────────────
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

    // ── amount input handler ───────────────────────────────────────────────
    const handleAmountChange = (e, field) => {
      const raw = e.target.value.replace(/,/g, '');
      if (raw === '' || !isNaN(raw))
        setInlineItemEdit(prev => ({ ...prev, data: { ...prev.data, [field]: raw } }));
    };

    // ── add / edit / save / cancel / delete ────────────────────────────────
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
      { field: 'code',         header_fa: 'کد',      header_en: 'Code',  width: '90px'  },
      { field: 'displayLabel', header_fa: 'عنوان',   header_en: 'Title', width: '200px',
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
            {row.pathTitle && <span className="text-[10px] text-slate-500 truncate">{row.pathTitle}</span>}
          </div>
        )
      },
      { field: 'chart_name',   header_fa: 'ساختار',  header_en: 'Chart', width: '110px' },
    ];

    const typeLovCols = [
      { field: 'code',         header_fa: 'کد',    header_en: 'Code',  width: '80px'  },
      { field: 'displayLabel', header_fa: 'عنوان', header_en: 'Title', width: 'auto',
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
            {row.pathTitle && <span className="text-[10px] text-slate-500 truncate">{row.pathTitle}</span>}
          </div>
        )
      },
    ];

    // ── column definitions (same pattern as TransactionMainGrid) ──────────
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

  // ════════════════════════════════════════════════════════════════════════════
  // RequestFormModal
  // ════════════════════════════════════════════════════════════════════════════
  const RequestFormModal = ({
    isOpen, onClose, onSuccess, formMode = 'CREATE', initialRecord = null,
    language = 'fa', formCode = 'REQ_REQUEST_MNGMT'
  }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;

    const calendarMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';

    const currentUserObj = window.NavigationSystem?.currentUser || {};
    const currentUserId  = getSessionUserId() || currentUserObj.id || null;
    const currentUserName = currentUserObj.name || currentUserObj.full_name || currentUserObj.username || '';

    const secCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const a = secCtx ? secCtx.getActions(formCode) : null;
      return a || { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }, [secCtx, formCode]);

    const [toast, setToast]   = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3500);
    }, []);

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty,   setIsDirty]   = useState(false);
    const [hasSaved,  setHasSaved]  = useState(false);
    const [header,    setHeader]    = useState({});
    const [items,     setItems]     = useState([]);
    const [lookups,   setLookups]   = useState({
      leafAccounts: [], allAccounts: [], costTypes: [], incomeTypes: [],
      currencies: [], usersMap: {}, usersList: [], partiesMap: {},
      nodesMap: {}, currentUserDeptId: null, currentUserDeptTitle: '',
      currentUserPartyId: null, currentUserPartyName: '',
    });

    const gridRef     = useRef(null);
    const initialized = useRef(false);

    const isReadOnly = useMemo(
      () => formMode !== 'CREATE' && lockedStatuses.includes(header.status || ''),
      [formMode, header.status]
    );

    // ── fetch dependencies ───────────────────────────────────────────────
    const fetchDeps = useCallback(async () => {
      if (!supabase) return null;
      try {
        const [accRes, chartRes, costRes, incRes, usersRes, partiesRes, personnelRes, nodesRes, currRes] =
          await Promise.all([
            supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, chart_id').eq('is_active', true),
            supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
            supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('sec_users').select('id, full_name, username, party_id'),
            supabase.from('parties').select('id, first_name, last_name, company_name, party_type'),
            supabase.from('fm_org_chart_personnel').select('node_id, person_id'),
            supabase.from('fm_org_chart_nodes').select('id, title'),
            supabase.from('fm_currencies').select('id, code, title'),
          ]);

        const activeCharts   = chartRes.data || [];
        const activeChartIds = new Set(activeCharts.map(c => c.id));

        const buildLeafs = (items, charts = null) => {
          const parentIds = new Set(items.map(i => i.parent_id).filter(Boolean));
          return items.filter(i => {
            if (parentIds.has(i.id)) return false;
            if (charts && !activeChartIds.has(i.chart_id)) return false;
            return true;
          }).map(i => {
            const fa = i.title_fa || i.title;
            const en = i.title_en || i.title_fa || i.title;
            let pathArr = [isRtl ? fa : en];
            let curr = i;
            while (curr && curr.parent_id) {
              const par = items.find(p => p.id === curr.parent_id);
              if (par) { pathArr.unshift(isRtl ? (par.title_fa || par.title) : (par.title_en || par.title_fa || par.title)); curr = par; }
              else break;
            }
            return {
              ...i,
              displayLabel: isRtl ? fa : en,
              pathTitle:    pathArr.join(' / '),
              chart_name:   charts ? (activeCharts.find(c => c.id === i.chart_id)?.title || '') : '',
            };
          });
        };

        const usersMap = {};
        (usersRes.data || []).forEach(u => { usersMap[u.id] = u.full_name || u.username || ''; });

        const partiesMap = {};
        (partiesRes.data || []).forEach(p => {
          partiesMap[p.id] = p.party_type === 'legal'
            ? (p.company_name || '')
            : `${p.first_name || ''} ${p.last_name || ''}`.trim();
        });

        const nodesMap = {};
        (nodesRes.data || []).forEach(n => { nodesMap[n.id] = n.title; });

        let myDeptId = null, myDeptTitle = '', myPartyId = null, myPartyName = '';
        const me = currentUserId ? (usersRes.data || []).find(u => u.id === currentUserId) : null;
        if (me?.party_id) {
          myPartyId   = me.party_id;
          myPartyName = partiesMap[myPartyId] || '';
          const myPersonnel = (personnelRes.data || []).find(p => p.person_id === myPartyId);
          if (myPersonnel) { myDeptId = myPersonnel.node_id; myDeptTitle = nodesMap[myPersonnel.node_id] || ''; }
        }

        const lk = {
          leafAccounts: buildLeafs(accRes.data || [], activeCharts),
          allAccounts:  accRes.data || [],
          costTypes:    buildLeafs(costRes.data   || []),
          incomeTypes:  buildLeafs(incRes.data    || []),
          currencies:   currRes.data || [],
          usersMap, usersList: usersRes.data || [], partiesMap, nodesMap,
          currentUserDeptId: myDeptId, currentUserDeptTitle: myDeptTitle,
          currentUserPartyId: myPartyId, currentUserPartyName: myPartyName,
        };
        setLookups(lk);
        return lk;
      } catch (e) {
        console.error('RequestFormModal deps error:', e);
        showToast(t('خطا در بارگذاری اطلاعات پایه', 'Error loading dependencies'), 'error');
        return null;
      }
    }, [supabase, isRtl, currentUserId, showToast, t]);

    useEffect(() => {
      if (!isOpen) { initialized.current = false; setHasSaved(false); return; }
      if (initialized.current) return;
      initialized.current = true;

      fetchDeps().then(async (lk) => {
        if (!lk) return;

        if (formMode === 'CREATE') {
          let code = '';
          if (window.AutoNumberingService) {
            try {
              const preview = await window.AutoNumberingService.previewNext('REQUESTS');
              if (preview?.formattedCode) code = preview.formattedCode;
            } catch {}
          }
          if (!code) code = `REQ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

          setHeader({
            request_code:     code,
            registrar_id:     currentUserId,
            requester_party_id: lk.currentUserPartyId,
            requester_display: lk.currentUserPartyName || lk.usersMap[currentUserId] || currentUserName,
            department_id:    lk.currentUserDeptId,
            department_title: lk.currentUserDeptTitle,
            created_at:       new Date().toISOString(),
            need_date:        '',
            request_type:     'GENERAL',
            description:      '',
            status:           'DRAFT',
          });
          setItems([]);
          setIsDirty(false);
          setHasSaved(false);

        } else if (formMode === 'EDIT' && initialRecord) {
          setHeader({
            ...initialRecord,
            department_title:  initialRecord.department_id ? (lk.nodesMap[initialRecord.department_id] || '') : '',
            requester_display: initialRecord.requester_party_id
              ? (lk.partiesMap[initialRecord.requester_party_id] || '')
              : (initialRecord.registrar_id ? (lk.usersMap[initialRecord.registrar_id] || '') : ''),
          });
          const mapped = (initialRecord.req_request_items || []).map(item => ({
            ...item,
            _tempId:           crypto.randomUUID(),
            deposit_amount:    item.deposit_amount    != null ? parseFloat(item.deposit_amount)    : 0,
            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0,
            approved_amount:   item.approved_amount   != null ? parseFloat(item.approved_amount)   : 0,
            remaining_amount:  item.remaining_amount  != null ? parseFloat(item.remaining_amount)  : 0,
          })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
          setItems(mapped);
          setIsDirty(false);
          setHasSaved(false);
        }
      });
    }, [isOpen, formMode, initialRecord]);

    const updateHeader = useCallback((field, value) => {
      setHeader(p => ({ ...p, [field]: value }));
      setIsDirty(true);
    }, []);

    // ── save / status transitions ────────────────────────────────────────
    const handleSave = async (overrideStatus) => {
      const statusToSave = typeof overrideStatus === 'string' ? overrideStatus : header.status;

      if (document.getElementById('grid-inline-edit-marker'))
        return showToast(t('لطفاً ابتدا سطر باز اقلام را با Enter ذخیره کنید.', 'Please save the open items row first.'), 'warning');

      if (!header.description?.trim())
        return showToast(t('شرح درخواست الزامی است.', 'Request description is required.'), 'warning');

      setIsLoading(true);
      try {
        const now      = new Date().toISOString();
        const actorId   = currentUserId;
        const actorName = actorId ? (lookups.usersMap[actorId] || currentUserName) : currentUserName;

        const metaPayload = {};
        if (statusToSave === 'REVIEWED' && header.status !== 'REVIEWED')
          Object.assign(metaPayload, { reviewer_id: actorId, reviewed_at: now, reviewer_name: actorName });
        if (statusToSave === 'APPROVED' && header.status !== 'APPROVED')
          Object.assign(metaPayload, { approver_id: actorId, approved_at: now, approver_name: actorName });
        if (statusToSave === 'REGISTERED' && header.status === 'REJECTED')
          Object.assign(metaPayload, { reviewer_id: null, reviewed_at: null, reviewer_name: null });

        const payload = {
          request_code:      header.request_code,
          registrar_id:      header.registrar_id || currentUserId || null,
          requester_party_id: header.requester_party_id || null,
          department_id:     header.department_id || null,
          need_date:         header.need_date || null,
          request_type:      header.request_type || 'GENERAL',
          description:       header.description || '',
          status:            statusToSave,
          ...metaPayload,
        };

        let reqId = header.id;
        if (!reqId) {
          payload.created_at = now;
          const { data, error } = await supabase.from('req_requests').insert([payload]).select('id');
          if (error) throw error;
          reqId = data[0].id;
          setHeader(p => ({ ...p, id: reqId }));
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('REQUESTS'); } catch {}
          }
        } else {
          const { error } = await supabase.from('req_requests').update(payload).eq('id', reqId);
          if (error) throw error;
        }

        // persist items when dirty or it's a new record
        if (isDirty || !header.id) {
          await supabase.from('req_request_items').delete().eq('request_id', reqId);
          if (items.length > 0) {
            const parse = v => parseFloat(String(v || '0').replace(/,/g, '')) || 0;
            const itemsPayload = items.map((item, idx) => ({
              request_id:        reqId,
              row_number:        idx + 1,
              account_id:        item.account_id        || null,
              currency:          item.currency          || null,
              transaction_action: item.transaction_action || 'DEPOSIT',
              transaction_group: item.transaction_group || null,
              cost_type_id:      item.cost_type_id      || null,
              income_type_id:    item.income_type_id    || null,
              deposit_amount:    parse(item.deposit_amount),
              withdrawal_amount: parse(item.withdrawal_amount),
              approved_amount:   parse(item.approved_amount),
              remaining_amount:  parse(item.remaining_amount),
              description:       item.description || null,
            }));
            const { data: savedItems, error: iErr } = await supabase.from('req_request_items').insert(itemsPayload).select();
            if (iErr) throw iErr;
            setItems((savedItems || []).map(i => ({
              ...i, _tempId: crypto.randomUUID(),
              deposit_amount:    parseFloat(i.deposit_amount)    || 0,
              withdrawal_amount: parseFloat(i.withdrawal_amount) || 0,
              approved_amount:   parseFloat(i.approved_amount)   || 0,
              remaining_amount:  parseFloat(i.remaining_amount)  || 0,
            })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0)));
          }
        }

        setHeader(p => ({
          ...p, status: statusToSave,
          ...(statusToSave === 'REVIEWED' && p.status !== 'REVIEWED' ? { reviewer_id: actorId, reviewed_at: now, reviewer_name: actorName } : {}),
          ...(statusToSave === 'APPROVED' && p.status !== 'APPROVED' ? { approver_id: actorId, approved_at: now, approver_name: actorName } : {}),
        }));
        setIsDirty(false);
        setHasSaved(true);
        showToast(typeof overrideStatus === 'string'
          ? t('وضعیت درخواست تغییر کرد.', 'Request status updated.')
          : t('درخواست با موفقیت ذخیره شد.', 'Request saved successfully.'));
      } catch (err) {
        console.error('RequestFormModal save error:', err);
        showToast(t('خطا در ذخیره درخواست.', 'Error saving request.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleClose = () => { if (hasSaved && onSuccess) onSuccess(); else onClose(); };
    if (!isOpen) return null;

    const statusInfo = getStatus(header.status || 'DRAFT');
    const cur        = header.status || 'DRAFT';
    const hasItems   = items.length > 0;

    const fmtDT = (v) => {
      if (!v) return '-';
      try {
        return new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
          calendar: calendarMode === 'jalali' ? 'persian' : 'gregory',
        }).format(new Date(v));
      } catch { return v; }
    };

    // ── status transition buttons ────────────────────────────────────────
    const btnBase = 'flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 border rounded-md transition-colors';
    const statusActions = (
      <div className="flex flex-wrap items-center gap-2 pr-2" onClick={e => e.stopPropagation()}>
        {cur === 'DRAFT' && access.canEdit && (
          <button onClick={() => handleSave('REGISTERED')} className={`${btnBase} border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30`}>
            <Send size={12} /> {t('ارسال برای بررسی', 'Submit for Review')}
          </button>
        )}
        {cur === 'REGISTERED' && access.canEdit && (<>
          <button onClick={() => handleSave('DRAFT')} className={`${btnBase} border-slate-400 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800`}>
            <RotateCcw size={12} /> {t('برگشت به یادداشت', 'Back to Draft')}
          </button>
          <button onClick={() => handleSave('REVIEWED')} className={`${btnBase} border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30`}>
            <CheckSquare size={12} /> {t('بررسی شد', 'Mark Reviewed')}
          </button>
        </>)}
        {cur === 'REVIEWED' && access.canEdit && (<>
          <button onClick={() => handleSave('REGISTERED')} className={`${btnBase} border-slate-400 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800`}>
            <RotateCcw size={12} /> {t('برگشت به ثبت شده', 'Back to Registered')}
          </button>
          <button onClick={() => handleSave('REJECTED')} className={`${btnBase} border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30`}>
            <XCircle size={12} /> {t('رد درخواست', 'Reject')}
          </button>
          <button onClick={() => handleSave('APPROVED')} className={`${btnBase} border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30`}>
            <CheckCircle size={12} /> {t('تایید درخواست', 'Approve')}
          </button>
        </>)}
        {cur === 'APPROVED' && access.canEdit && (
          <button onClick={() => handleSave('IN_PROGRESS')} className={`${btnBase} border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30`}>
            <PlayCircle size={12} /> {t('شروع انجام', 'Start Processing')}
          </button>
        )}
        {cur === 'IN_PROGRESS' && access.canEdit && (
          <button onClick={() => handleSave('DONE')} className={`${btnBase} border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30`}>
            <Check size={12} /> {t('اتمام انجام', 'Mark Done')}
          </button>
        )}
        {cur === 'REJECTED' && access.canEdit && (
          <button onClick={() => handleSave('DRAFT')} className={`${btnBase} border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30`}>
            <RotateCcw size={12} /> {t('بازنگری مجدد', 'Revise & Resubmit')}
          </button>
        )}
        {['REJECTED', 'DONE', 'APPROVED'].includes(cur) && access.canEdit && (
          <button onClick={() => handleSave('CLOSED')} className={`${btnBase} border-slate-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800`}>
            <Lock size={12} /> {t('بستن درخواست', 'Close Request')}
          </button>
        )}
        {cur === 'CLOSED' && (
          <Badge variant="gray" size="sm">{t('بسته شده - غیرقابل تغییر', 'Closed - Locked')}</Badge>
        )}
      </div>
    );

    const headerCardTitle = (
      <div className="flex items-center gap-3 w-full">
        <span>{t('اطلاعات سربرگ', 'Request Header')}</span>
        <Badge variant={statusInfo.color} className="shadow-none text-[10px]">
          {isRtl ? statusInfo.fa : statusInfo.en}
        </Badge>
      </div>
    );

    return (
      <Modal isOpen={isOpen} onClose={handleClose}
        title={formMode === 'CREATE' ? t('ثبت درخواست جدید', 'New Request') : t('مشاهده / ویرایش درخواست', 'View / Edit Request')}
        language={language} width="max-w-6xl">
        <div className="flex flex-col bg-slate-50/50 dark:bg-slate-900/50 h-[85vh] text-[12px] relative">
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex flex-col gap-4 pb-20">

            {/* Header Card */}
            <Card title={headerCardTitle} action={statusActions}
              isCollapsible={true} noPadding={true}
              className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-20"
              headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
              language={language}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-white dark:bg-slate-800 overflow-visible">

                <TextField size="sm" label={t('کد درخواست', 'Request Code')}
                  value={header.request_code || ''} disabled isRtl={isRtl} dir="ltr" />

                <TextField size="sm" label={t('درخواست دهنده', 'Requester')}
                  value={header.requester_display || t('کاربر جاری', 'Current User')} disabled isRtl={isRtl} />

                <TextField size="sm" label={t('دپارتمان', 'Department')}
                  value={header.department_title || ''} disabled isRtl={isRtl} />

                <TextField size="sm" label={t('تاریخ و زمان ثبت', 'Submission Date/Time')}
                  value={fmtDT(header.created_at)} disabled isRtl={isRtl} />

                <div className="relative z-[90]">
                  <DatePicker size="sm" label={t('تاریخ نیاز', 'Need Date')}
                    value={header.need_date || ''} onChange={v => updateHeader('need_date', v)}
                    isRtl={isRtl} calendarMode={calendarMode} disabled={isReadOnly} />
                </div>

                <div className="relative z-[80]">
                  <SelectField size="sm" label={t('نوع درخواست', 'Request Type')}
                    value={header.request_type || 'GENERAL'}
                    onChange={e => updateHeader('request_type', e.target.value)}
                    options={REQUEST_TYPES.map(r => ({ value: r.value, label: isRtl ? r.fa : r.en }))}
                    isRtl={isRtl} disabled={isReadOnly || hasItems} required />
                  {hasItems && !isReadOnly && (
                    <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {t('در صورت وجود اقلام، نوع قابل تغییر نیست.', 'Type is locked when items exist.')}
                    </p>
                  )}
                </div>

                <div className="lg:col-span-2 relative z-[70]">
                  <TextField size="sm" label={t('شرح درخواست', 'Description')}
                    value={header.description || ''} onChange={e => updateHeader('description', e.target.value)}
                    isRtl={isRtl} disabled={isReadOnly} required />
                </div>

                {(header.reviewer_id || header.reviewer_name) && (<>
                  <TextField size="sm" label={t('بررسی کننده', 'Reviewed By')}
                    value={header.reviewer_name || lookups.usersMap[header.reviewer_id] || '-'} disabled isRtl={isRtl} />
                  <TextField size="sm" label={t('تاریخ بررسی', 'Reviewed At')}
                    value={fmtDT(header.reviewed_at)} disabled isRtl={isRtl} />
                </>)}

                {(header.approver_id || header.approver_name) && (<>
                  <TextField size="sm" label={t('تایید کننده', 'Approved By')}
                    value={header.approver_name || lookups.usersMap[header.approver_id] || '-'} disabled isRtl={isRtl} />
                  <TextField size="sm" label={t('تاریخ تایید', 'Approved At')}
                    value={fmtDT(header.approved_at)} disabled isRtl={isRtl} />
                </>)}
              </div>
            </Card>

            {/* Items Card */}
            <Card title={t('اقلام درخواست', 'Request Items')}
              isCollapsible={true} noPadding={true}
              className="border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col min-h-[320px] relative z-10"
              headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
              language={language}>
              <div className="flex-1 w-full flex flex-col relative min-h-[260px]">
                <RequestItemsGrid
                  ref={gridRef}
                  itemsData={items}
                  onItemsChange={(newItems) => { setItems(newItems); setIsDirty(true); }}
                  lookups={lookups}
                  requestType={header.request_type || 'GENERAL'}
                  isReadOnly={isReadOnly}
                  language={language}
                  showToast={showToast}
                  formCode={formCode}
                />
              </div>
            </Card>

          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-50">
            <Button variant="outline" size="sm" onClick={handleClose}>{t('بستن', 'Close')}</Button>
            {!isReadOnly && access.canEdit && (
              <Button variant="primary" size="sm" icon={Save}
                onClick={() => handleSave()} isLoading={isLoading} disabled={!isDirty}>
                {t('ذخیره', 'Save')}
              </Button>
            )}
          </div>
        </div>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
      </Modal>
    );
  };

  window.RequestFormModal = RequestFormModal;
})();
