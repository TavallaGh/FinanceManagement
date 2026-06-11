/* Filename: workflow/RequestManagement.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef, useImperativeHandle } = React;

  // ── Fallbacks ──────────────────────────────────────────────────────────────
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
  const DS   = window.DesignSystem || {};
  const Core = window.DSCore || DS;
  const Button      = safeComp(Core, 'Button');
  const PageHeader  = safeComp(Core, 'PageHeader');
  const Badge       = safeComp(Core, 'Badge');
  const Card        = safeComp(Core, 'Card');
  const EmptyState  = safeComp(Core, 'EmptyState');

  const DSGrid       = window.DSGrid || DS;
  const DataGrid     = safeComp(DSGrid, 'DataGrid');
  const AdvancedFilter = safeComp(DSGrid, 'AdvancedFilter');
  const LOVField     = safeComp(DSGrid, 'LOVField');

  const DSForms    = window.DSForms || DS;
  const TextField  = safeComp(DSForms, 'TextField');
  const SelectField = safeComp(DSForms, 'SelectField');
  const DatePicker = safeComp(DSForms, 'DatePicker');

  const DSFeedback = window.DSFeedback || window.DSOverlays || DS;
  const Modal      = safeComp(DSFeedback, 'Modal');
  const Toast      = safeComp(DSFeedback, 'Toast');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const LucideIcons = window.LucideIcons || {};
  const ClipboardList = safeIcon(LucideIcons, 'ClipboardList');
  const Edit          = safeIcon(LucideIcons, 'Edit');
  const Trash2        = safeIcon(LucideIcons, 'Trash2');
  const Save          = safeIcon(LucideIcons, 'Save');
  const Check         = safeIcon(LucideIcons, 'Check');
  const X             = safeIcon(LucideIcons, 'X');
  const Plus          = safeIcon(LucideIcons, 'Plus');
  const AlertTriangle = safeIcon(LucideIcons, 'AlertTriangle');
  const Send          = safeIcon(LucideIcons, 'Send');
  const CheckCircle   = safeIcon(LucideIcons, 'CheckCircle');
  const XCircle       = safeIcon(LucideIcons, 'XCircle');
  const RotateCcw     = safeIcon(LucideIcons, 'RotateCcw');
  const Lock          = safeIcon(LucideIcons, 'Lock');
  const PlayCircle    = safeIcon(LucideIcons, 'PlayCircle');
  const CheckSquare   = safeIcon(LucideIcons, 'CheckSquare');

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    const parts = parseFloat(num).toFixed(2).toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts[1] === '00' ? parts[0] : parts.join('.');
  };

  const formatNumberInput = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const s = String(val).replace(/,/g, '');
    if (s.trim() === '' || isNaN(Number(s))) return '';
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // ── Domain Constants ───────────────────────────────────────────────────────
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

  const TX_ACTIONS = [
    { value: 'DEPOSIT',    fa: 'واریز',    en: 'Deposit'    },
    { value: 'WITHDRAWAL', fa: 'برداشت',   en: 'Withdrawal' },
  ];

  const TX_GROUPS = [
    { value: 'COST',    fa: 'هزینه',  en: 'Cost'    },
    { value: 'INCOME',  fa: 'درآمد',  en: 'Income'  },
    { value: 'BALANCE', fa: 'بالانس', en: 'Balance' },
    { value: 'OTHER',   fa: 'سایر',   en: 'Other'   },
  ];

  // Types that show Group + Cost/Income Type columns
  const TYPES_WITH_GROUP = ['GENERAL', 'BUDGET'];

  const getStatus = (v) => STATUS_LIST.find(s => s.value === v) || STATUS_LIST[0];
  const getTypeLabel = (v, rtl) => {
    const t = REQUEST_TYPES.find(r => r.value === v);
    return t ? (rtl ? t.fa : t.en) : (v || '-');
  };

  const lockedStatuses = ['REGISTERED', 'REVIEWED', 'APPROVED', 'IN_PROGRESS', 'DONE', 'REJECTED', 'CLOSED'];

  // ── Session helper ─────────────────────────────────────────────────────────
  const getSessionUserId = () => {
    try {
      const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
      return JSON.parse(s).id || null;
    } catch { return null; }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RequestItemsGrid  –  editable items table embedded in the form modal
  // ════════════════════════════════════════════════════════════════════════════
  const RequestItemsGrid = React.forwardRef(({
    itemsData = [], onItemsChange, lookups = {}, requestType = 'GENERAL',
    isReadOnly = false, language = 'fa', showToast
  }, ref) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const [inlineEdit, setInlineEdit] = useState(null);
    const showGroup = TYPES_WITH_GROUP.includes(requestType);

    useImperativeHandle(ref, () => ({
      cancelEdit: () => setInlineEdit(null),
    }));

    // ── inline edit handlers ─────────────────────────────────
    const handleAmount = (e, field) => {
      const raw = e.target.value.replace(/,/g, '');
      if (raw === '' || !isNaN(raw))
        setInlineEdit(p => ({ ...p, data: { ...p.data, [field]: raw } }));
    };

    const handleAdd = () => {
      if (isReadOnly) return;
      if (inlineEdit) return showToast(t('ابتدا با Enter سطر جاری را ذخیره کنید.', 'Save current row first.'), 'warning');
      setInlineEdit({
        id: 'new',
        data: {
          row_number: itemsData.length + 1,
          account_id: '', account_obj: null, currency: '',
          transaction_action: 'DEPOSIT',
          transaction_group: showGroup ? 'COST' : null,
          cost_type_id: '', income_type_id: '',
          deposit_amount: '', withdrawal_amount: '',
          approved_amount: '', remaining_amount: '',
          description: '',
        },
      });
    };

    const handleEditRow = (row) => {
      if (isReadOnly || inlineEdit) return;
      const accObj = (lookups.leafAccounts || []).find(a => String(a.id) === String(row.account_id)) || null;
      setInlineEdit({
        id: row._tempId || row.id,
        data: {
          ...row,
          account_obj: accObj,
          deposit_amount: row.deposit_amount != null ? String(row.deposit_amount).replace(/,/g, '') : '',
          withdrawal_amount: row.withdrawal_amount != null ? String(row.withdrawal_amount).replace(/,/g, '') : '',
          approved_amount: row.approved_amount != null ? String(row.approved_amount).replace(/,/g, '') : '',
          remaining_amount: row.remaining_amount != null ? String(row.remaining_amount).replace(/,/g, '') : '',
        },
      });
    };

    const handleConfirm = () => {
      if (!inlineEdit) return;
      const d = inlineEdit.data;
      const parse = (v) => parseFloat(String(v || '0').replace(/,/g, '')) || 0;
      const saved = {
        ...d,
        deposit_amount: parse(d.deposit_amount),
        withdrawal_amount: parse(d.withdrawal_amount),
        approved_amount: parse(d.approved_amount),
        remaining_amount: parse(d.remaining_amount),
      };
      if (inlineEdit.id === 'new') {
        saved._tempId = crypto.randomUUID();
        const next = [...itemsData, saved].sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
        onItemsChange(next);
      } else {
        const next = itemsData.map(item =>
          (item._tempId || item.id) === inlineEdit.id ? { ...item, ...saved } : item
        ).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
        onItemsChange(next);
      }
      setInlineEdit(null);
    };

    const handleCancel = () => setInlineEdit(null);
    const handleDelete = (row) => {
      if (isReadOnly) return;
      onItemsChange(itemsData.filter(i => (i._tempId || i.id) !== (row._tempId || row.id)));
    };
    const isEditing = (row) => inlineEdit && (row._tempId || row.id) === inlineEdit.id;

    // ── LOV column definitions ───────────────────────────────
    const accLovCols = [
      { field: 'code',         header_fa: 'کد',     header_en: 'Code',  width: '90px'  },
      { field: 'displayLabel', header_fa: 'عنوان',  header_en: 'Title', width: '200px' },
      { field: 'chart_name',   header_fa: 'ساختار', header_en: 'Chart', width: '110px' },
    ];
    const typeLovCols = [
      { field: 'code',         header_fa: 'کد',    header_en: 'Code',  width: '80px' },
      { field: 'displayLabel', header_fa: 'عنوان', header_en: 'Title', width: 'auto' },
    ];

    // col span used when no group columns
    const totalCols = showGroup ? 10 : 8;

    // ── inline row renderer ──────────────────────────────────
    const renderInlineRow = () => {
      if (!inlineEdit) return null;
      const d = inlineEdit.data;
      const selAcc = d.account_obj || (lookups.leafAccounts || []).find(a => String(a.id) === String(d.account_id));
      const isDeposit = d.transaction_action === 'DEPOSIT';

      const commonInput = 'w-full h-7 px-2 text-[12px] border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-400';
      const disabledInput = 'w-full h-7 px-2 text-[12px] border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed';

      return (
        <tr id="grid-inline-edit-marker" className="bg-indigo-50/60 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800">
          {/* ردیف */}
          <td className="p-1.5 w-14">
            <input type="number" className={commonInput} value={d.row_number || ''} min={1}
              onChange={e => setInlineEdit(p => ({ ...p, data: { ...p.data, row_number: parseInt(e.target.value) || 1 } }))} />
          </td>
          {/* حساب */}
          <td className="p-1.5 min-w-[180px]">
            <LOVField size="sm" isRtl={isRtl}
              data={lookups.leafAccounts || []}
              columns={accLovCols}
              displayValue={selAcc ? `${selAcc.code ? selAcc.code + ' - ' : ''}${selAcc.displayLabel || ''}` : ''}
              onChange={row => {
                if (!row) { setInlineEdit(p => ({ ...p, data: { ...p.data, account_id: '', account_obj: null, currency: '' } })); return; }
                const curObj = (lookups.currencies || []).find(c => c.id === row.currency_id);
                setInlineEdit(p => ({ ...p, data: { ...p.data, account_id: row.id, account_obj: row, currency: curObj ? curObj.code : (row.currency_id || '') } }));
              }}
              dropdownWidth="min-w-[480px]"
              placeholder={t('انتخاب حساب...', 'Select account...')}
            />
          </td>
          {/* ارز */}
          <td className="p-1.5 w-20">
            <input className={disabledInput} value={d.currency || ''} disabled dir="ltr" readOnly />
          </td>
          {/* نوع */}
          <td className="p-1.5 w-24">
            <select className={commonInput} value={d.transaction_action || 'DEPOSIT'} dir={isRtl ? 'rtl' : 'ltr'}
              onChange={e => setInlineEdit(p => ({ ...p, data: { ...p.data, transaction_action: e.target.value, deposit_amount: '', withdrawal_amount: '' } }))}>
              {TX_ACTIONS.map(a => <option key={a.value} value={a.value}>{isRtl ? a.fa : a.en}</option>)}
            </select>
          </td>
          {/* گروه */}
          {showGroup && (
            <td className="p-1.5 w-24">
              <select className={commonInput} value={d.transaction_group || 'COST'} dir={isRtl ? 'rtl' : 'ltr'}
                onChange={e => setInlineEdit(p => ({ ...p, data: { ...p.data, transaction_group: e.target.value, cost_type_id: '', income_type_id: '' } }))}>
                {TX_GROUPS.map(g => <option key={g.value} value={g.value}>{isRtl ? g.fa : g.en}</option>)}
              </select>
            </td>
          )}
          {/* نوع هزینه / درآمد */}
          {showGroup && (
            <td className="p-1.5 min-w-[140px]">
              {d.transaction_group === 'COST' ? (
                <LOVField size="sm" isRtl={isRtl}
                  data={lookups.costTypes || []} columns={typeLovCols}
                  displayValue={(lookups.costTypes || []).find(c => String(c.id) === String(d.cost_type_id))?.displayLabel || ''}
                  onChange={row => setInlineEdit(p => ({ ...p, data: { ...p.data, cost_type_id: row ? row.id : '', income_type_id: '' } }))}
                  dropdownWidth="min-w-[320px]"
                  placeholder={t('نوع هزینه...', 'Cost type...')}
                />
              ) : d.transaction_group === 'INCOME' ? (
                <LOVField size="sm" isRtl={isRtl}
                  data={lookups.incomeTypes || []} columns={typeLovCols}
                  displayValue={(lookups.incomeTypes || []).find(c => String(c.id) === String(d.income_type_id))?.displayLabel || ''}
                  onChange={row => setInlineEdit(p => ({ ...p, data: { ...p.data, income_type_id: row ? row.id : '', cost_type_id: '' } }))}
                  dropdownWidth="min-w-[320px]"
                  placeholder={t('نوع درآمد...', 'Income type...')}
                />
              ) : (
                <span className="text-[11px] text-slate-400 px-2">-</span>
              )}
            </td>
          )}
          {/* واریز */}
          <td className="p-1.5 w-28">
            <input type="text" dir="ltr" placeholder="0"
              className={isDeposit ? commonInput : disabledInput}
              value={isDeposit ? formatNumberInput(d.deposit_amount) : ''}
              onChange={e => isDeposit && handleAmount(e, 'deposit_amount')}
              disabled={!isDeposit}
            />
          </td>
          {/* برداشت */}
          <td className="p-1.5 w-28">
            <input type="text" dir="ltr" placeholder="0"
              className={!isDeposit ? commonInput : disabledInput}
              value={!isDeposit ? formatNumberInput(d.withdrawal_amount) : ''}
              onChange={e => !isDeposit && handleAmount(e, 'withdrawal_amount')}
              disabled={isDeposit}
            />
          </td>
          {/* شرح */}
          <td className="p-1.5">
            <input type="text" className={commonInput} value={d.description || ''}
              onChange={e => setInlineEdit(p => ({ ...p, data: { ...p.data, description: e.target.value } }))}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleCancel(); }}
            />
          </td>
          {/* اقدام */}
          <td className="p-1.5 w-18 text-center">
            <div className="flex items-center gap-1 justify-center">
              <button onClick={handleConfirm} title={t('ذخیره', 'Save')}
                className="w-6 h-6 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors">
                <Check size={12} />
              </button>
              <button onClick={handleCancel} title={t('لغو', 'Cancel')}
                className="w-6 h-6 flex items-center justify-center bg-slate-400 hover:bg-slate-500 text-white rounded transition-colors">
                <X size={12} />
              </button>
            </div>
          </td>
        </tr>
      );
    };

    // ── display row renderer ─────────────────────────────────
    const renderRow = (row, idx) => {
      if (isEditing(row)) return renderInlineRow();
      const accObj = row.account_obj || (lookups.leafAccounts || []).find(a => String(a.id) === String(row.account_id));
      const isDeposit = row.transaction_action === 'DEPOSIT';
      const grpLabel = TX_GROUPS.find(g => g.value === row.transaction_group);
      const costLabel  = row.cost_type_id   ? (lookups.costTypes   || []).find(c => String(c.id) === String(row.cost_type_id))?.displayLabel   : null;
      const incLabel   = row.income_type_id ? (lookups.incomeTypes || []).find(c => String(c.id) === String(row.income_type_id))?.displayLabel  : null;

      return (
        <tr key={row._tempId || row.id || idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
          <td className="p-1.5 w-14 text-center text-[11px] font-bold text-slate-500">{row.row_number}</td>
          <td className="p-1.5">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{accObj?.displayLabel || '-'}</span>
              {accObj?.code && <span className="text-[10px] text-slate-400 font-mono">{accObj.code}</span>}
            </div>
          </td>
          <td className="p-1.5 w-20 text-center text-[11px] font-mono text-slate-500 dark:text-slate-400">{row.currency || '-'}</td>
          <td className="p-1.5 w-24 text-center">
            <span className={`text-[11px] font-bold ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {isRtl ? (isDeposit ? 'واریز' : 'برداشت') : (isDeposit ? 'Deposit' : 'Withdrawal')}
            </span>
          </td>
          {showGroup && (
            <td className="p-1.5 w-24 text-center text-[11px] text-slate-500 dark:text-slate-400">
              {grpLabel ? (isRtl ? grpLabel.fa : grpLabel.en) : '-'}
            </td>
          )}
          {showGroup && (
            <td className="p-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
              {costLabel || incLabel || '-'}
            </td>
          )}
          <td className="p-1.5 w-28 text-right">
            <span className={`text-[11px] font-mono ${isDeposit ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-300 dark:text-slate-600'}`} dir="ltr">
              {isDeposit && row.deposit_amount ? formatNumber(row.deposit_amount) : '-'}
            </span>
          </td>
          <td className="p-1.5 w-28 text-right">
            <span className={`text-[11px] font-mono ${!isDeposit ? 'text-red-500 dark:text-red-400 font-bold' : 'text-slate-300 dark:text-slate-600'}`} dir="ltr">
              {!isDeposit && row.withdrawal_amount ? formatNumber(row.withdrawal_amount) : '-'}
            </span>
          </td>
          <td className="p-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">{row.description || '-'}</td>
          <td className="p-1.5 w-18 text-center">
            {!isReadOnly && (
              <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEditRow(row)} className="w-6 h-6 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded">
                  <Edit size={11} />
                </button>
                <button onClick={() => handleDelete(row)} className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </td>
        </tr>
      );
    };

    return (
      <div className="flex flex-col h-full">
        {/* toolbar */}
        {!isReadOnly && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
            <span className="text-[11px] text-slate-500">{t(`${itemsData.length} ردیف`, `${itemsData.length} row(s)`)}</span>
            <button onClick={handleAdd} disabled={!!inlineEdit}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-md transition-colors ${inlineEdit ? 'text-slate-400 bg-slate-100 dark:bg-slate-700/50 cursor-not-allowed' : 'text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'}`}>
              <Plus size={12} />
              {t('قلم جدید', 'New Item')}
            </button>
          </div>
        )}
        {/* table */}
        <div className="flex-1 overflow-auto custom-scrollbar min-h-[200px]">
          <table className="w-full min-w-max border-collapse text-[12px]" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/90 z-10 shadow-sm">
              <tr>
                <th className={`p-2 w-14 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('ردیف', '#')}</th>
                <th className={`p-2 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('حساب', 'Account')}</th>
                <th className={`p-2 w-20 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('ارز', 'Currency')}</th>
                <th className={`p-2 w-24 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('نوع', 'Action')}</th>
                {showGroup && <th className={`p-2 w-24 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('گروه', 'Group')}</th>}
                {showGroup && <th className={`p-2 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('نوع هزینه / درآمد', 'Cost / Income Type')}</th>}
                <th className={`p-2 w-28 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('واریز', 'Deposit')}</th>
                <th className={`p-2 w-28 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('برداشت', 'Withdrawal')}</th>
                <th className={`p-2 text-[10px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`}>{t('شرح', 'Description')}</th>
                <th className="p-2 w-18 border-b border-slate-200 dark:border-slate-700"></th>
              </tr>
            </thead>
            <tbody>
              {/* new row always at top */}
              {inlineEdit && inlineEdit.id === 'new' && renderInlineRow()}
              {itemsData.length === 0 && !inlineEdit ? (
                <tr>
                  <td colSpan={totalCols} className="py-10 text-center text-[12px] text-slate-400 dark:text-slate-500 italic">
                    {t('هیچ قلمی ثبت نشده است.', 'No items have been added yet.')}
                  </td>
                </tr>
              ) : (
                itemsData.map((row, idx) => renderRow(row, idx))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  });

  // ════════════════════════════════════════════════════════════════════════════
  // RequestFormModal  –  the Create / Edit modal
  // ════════════════════════════════════════════════════════════════════════════
  const RequestFormModal = ({
    isOpen, onClose, onSuccess, formMode = 'CREATE', initialRecord = null,
    language = 'fa', formCode = 'REQ_REQUEST_MNGMT'
  }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;

    const currentUserObj = window.NavigationSystem?.currentUser || {};
    const currentUserId = getSessionUserId() || currentUserObj.id || null;
    const currentUserName = currentUserObj.name || currentUserObj.full_name || currentUserObj.username || '';

    const secCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const a = secCtx ? secCtx.getActions(formCode) : null;
      return a || { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }, [secCtx, formCode]);

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3500);
    }, []);

    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [header, setHeader] = useState({});
    const [items, setItems] = useState([]);
    const [lookups, setLookups] = useState({
      leafAccounts: [], allAccounts: [], costTypes: [], incomeTypes: [],
      currencies: [], usersMap: {}, usersList: [], partiesMap: {},
      nodesMap: {}, currentUserDeptId: null, currentUserDeptTitle: '',
      currentUserPartyId: null, currentUserPartyName: '',
    });

    const gridRef = useRef(null);
    const initialized = useRef(false);

    const isReadOnly = useMemo(
      () => formMode !== 'CREATE' && lockedStatuses.includes(header.status || ''),
      [formMode, header.status]
    );

    // ── fetch dependencies ───────────────────────────────────
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

        const activeCharts = chartRes.data || [];
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
              pathTitle: pathArr.join(' / '),
              chart_name: charts ? (activeCharts.find(c => c.id === i.chart_id)?.title || '') : '',
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
          myPartyId = me.party_id;
          myPartyName = partiesMap[myPartyId] || '';
          const myPersonnel = (personnelRes.data || []).find(p => p.person_id === myPartyId);
          if (myPersonnel) { myDeptId = myPersonnel.node_id; myDeptTitle = nodesMap[myPersonnel.node_id] || ''; }
        }

        const lk = {
          leafAccounts: buildLeafs(accRes.data || [], activeCharts),
          allAccounts: accRes.data || [],
          costTypes: buildLeafs(costRes.data || []),
          incomeTypes: buildLeafs(incRes.data || []),
          currencies: currRes.data || [],
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
            request_code: code,
            registrar_id: currentUserId,
            requester_party_id: lk.currentUserPartyId,
            requester_party_name: lk.currentUserPartyName,
            requester_display: lk.currentUserPartyName || lk.usersMap[currentUserId] || currentUserName,
            department_id: lk.currentUserDeptId,
            department_title: lk.currentUserDeptTitle,
            created_at: new Date().toISOString(),
            need_date: '',
            request_type: 'GENERAL',
            description: '',
            status: 'DRAFT',
          });
          setItems([]);
          setIsDirty(false);
          setHasSaved(false);

        } else if (formMode === 'EDIT' && initialRecord) {
          const deptTitle = initialRecord.department_id ? (lk.nodesMap[initialRecord.department_id] || '') : '';
          const partyName = initialRecord.requester_party_id ? (lk.partiesMap[initialRecord.requester_party_id] || '') : '';
          const regName = initialRecord.registrar_id ? (lk.usersMap[initialRecord.registrar_id] || '') : '';
          setHeader({
            ...initialRecord,
            department_title: deptTitle,
            requester_party_name: partyName,
            requester_display: partyName || regName,
          });
          const mapped = (initialRecord.req_request_items || []).map(item => ({
            ...item,
            _tempId: crypto.randomUUID(),
            deposit_amount: item.deposit_amount != null ? parseFloat(item.deposit_amount) : 0,
            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0,
            approved_amount: item.approved_amount != null ? parseFloat(item.approved_amount) : 0,
            remaining_amount: item.remaining_amount != null ? parseFloat(item.remaining_amount) : 0,
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

    // ── save ─────────────────────────────────────────────────
    const handleSave = async (overrideStatus) => {
      const statusToSave = typeof overrideStatus === 'string' ? overrideStatus : header.status;

      if (document.getElementById('grid-inline-edit-marker'))
        return showToast(t('لطفاً ابتدا سطر باز اقلام را با Enter ذخیره کنید.', 'Please save the open items row first.'), 'warning');

      if (!header.description?.trim())
        return showToast(t('شرح درخواست الزامی است.', 'Request description is required.'), 'warning');

      setIsLoading(true);
      try {
        const now = new Date().toISOString();
        const actorId = currentUserId;
        const actorName = actorId ? (lookups.usersMap[actorId] || currentUserName) : currentUserName;

        const metaPayload = {};
        if (statusToSave === 'REVIEWED'  && header.status !== 'REVIEWED')  { metaPayload.reviewer_id = actorId; metaPayload.reviewed_at  = now; metaPayload.reviewer_name = actorName; }
        if (statusToSave === 'APPROVED'  && header.status !== 'APPROVED')  { metaPayload.approver_id = actorId; metaPayload.approved_at  = now; metaPayload.approver_name = actorName; }
        if (statusToSave === 'REGISTERED' && header.status === 'REJECTED') { metaPayload.reviewer_id = null; metaPayload.reviewed_at = null; metaPayload.reviewer_name = null; }

        const payload = {
          request_code: header.request_code,
          registrar_id: header.registrar_id || currentUserId || null,
          requester_party_id: header.requester_party_id || null,
          department_id: header.department_id || null,
          need_date: header.need_date || null,
          request_type: header.request_type || 'GENERAL',
          description: header.description || '',
          status: statusToSave,
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

        // save items when dirty or new record
        if (isDirty || !header.id) {
          await supabase.from('req_request_items').delete().eq('request_id', reqId);
          if (items.length > 0) {
            const parse = v => parseFloat(String(v || '0').replace(/,/g, '')) || 0;
            const itemsPayload = items.map((item, idx) => ({
              request_id: reqId,
              row_number: idx + 1,
              account_id: item.account_id || null,
              currency: item.currency || null,
              transaction_action: item.transaction_action || 'DEPOSIT',
              transaction_group: item.transaction_group || null,
              cost_type_id: item.cost_type_id || null,
              income_type_id: item.income_type_id || null,
              deposit_amount: parse(item.deposit_amount),
              withdrawal_amount: parse(item.withdrawal_amount),
              approved_amount: parse(item.approved_amount),
              remaining_amount: parse(item.remaining_amount),
              description: item.description || null,
            }));
            const { data: savedItems, error: iErr } = await supabase.from('req_request_items').insert(itemsPayload).select();
            if (iErr) throw iErr;
            const remapped = (savedItems || []).map(i => ({
              ...i, _tempId: crypto.randomUUID(),
              deposit_amount: parseFloat(i.deposit_amount) || 0,
              withdrawal_amount: parseFloat(i.withdrawal_amount) || 0,
              approved_amount: parseFloat(i.approved_amount) || 0,
              remaining_amount: parseFloat(i.remaining_amount) || 0,
            })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
            setItems(remapped);
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
    const cur = header.status || 'DRAFT';
    const hasItems = items.length > 0;

    const fmtDT = (v) => {
      if (!v) return '-';
      try { return new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(v)); }
      catch { return v; }
    };

    // ── status action buttons ────────────────────────────────
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

            {/* ── Header Card ── */}
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
                    isRtl={isRtl} disabled={isReadOnly} />
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

                {/* Review metadata */}
                {(header.reviewer_id || header.reviewer_name) && (<>
                  <TextField size="sm" label={t('بررسی کننده', 'Reviewed By')}
                    value={header.reviewer_name || lookups.usersMap[header.reviewer_id] || '-'} disabled isRtl={isRtl} />
                  <TextField size="sm" label={t('تاریخ بررسی', 'Reviewed At')}
                    value={fmtDT(header.reviewed_at)} disabled isRtl={isRtl} />
                </>)}

                {/* Approval metadata */}
                {(header.approver_id || header.approver_name) && (<>
                  <TextField size="sm" label={t('تایید کننده', 'Approved By')}
                    value={header.approver_name || lookups.usersMap[header.approver_id] || '-'} disabled isRtl={isRtl} />
                  <TextField size="sm" label={t('تاریخ تایید', 'Approved At')}
                    value={fmtDT(header.approved_at)} disabled isRtl={isRtl} />
                </>)}
              </div>
            </Card>

            {/* ── Items Card ── */}
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
                />
              </div>
            </Card>

          </div>

          {/* ── Footer ── */}
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

  // ════════════════════════════════════════════════════════════════════════════
  // RequestManagement  –  the main list page
  // ════════════════════════════════════════════════════════════════════════════
  const RequestManagement = ({ language = 'fa', formCode = 'REQ_REQUEST_MNGMT' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;

    const currentUserId = getSessionUserId() || window.NavigationSystem?.currentUser?.id || null;

    const secCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const a = secCtx ? secCtx.getActions(formCode) : null;
      return a || { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }, [secCtx, formCode]);

    const [requests, setRequests] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [deptsMap, setDeptsMap] = useState({});
    const [partiesMap, setPartiesMap] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [formModal, setFormModal] = useState({ isOpen: false, mode: 'CREATE', record: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 3000);
    }, []);

    const fetchMeta = useCallback(async () => {
      try {
        const [uRes, pRes, nRes] = await Promise.all([
          supabase.from('sec_users').select('id, full_name, username'),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type'),
          supabase.from('fm_org_chart_nodes').select('id, title'),
        ]);
        const uMap = {}; (uRes.data || []).forEach(u => { uMap[u.id] = u.full_name || u.username || ''; });
        setUsersMap(uMap);
        const pMap = {}; (pRes.data || []).forEach(p => {
          pMap[p.id] = p.party_type === 'legal' ? (p.company_name || '') : `${p.first_name || ''} ${p.last_name || ''}`.trim();
        });
        setPartiesMap(pMap);
        const dMap = {}; (nRes.data || []).forEach(n => { dMap[n.id] = n.title; });
        setDeptsMap(dMap);
      } catch {}
    }, [supabase]);

    const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('req_requests')
          .select('*, req_request_items(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        // DRAFT records visible only to their creator
        const visible = (data || []).filter(r =>
          r.status !== 'DRAFT' || String(r.registrar_id) === String(currentUserId)
        );
        setRequests(visible);
      } catch {
        showToast(t('خطا در دریافت درخواست‌ها', 'Error loading requests'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [supabase, currentUserId, showToast, t]);

    useEffect(() => {
      if (access.canView) { fetchMeta(); fetchData(); }
    }, [fetchMeta, fetchData, access.canView]);

    const isDeletable = (r) => r.status === 'DRAFT';

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const { error } = await supabase.from('req_requests').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('req_requests').delete().in('id', deleteConfirm.data);
          if (error) throw error;
        }
        showToast(t('حذف با موفقیت انجام شد.', 'Deleted successfully.'));
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        setSelectedIds([]);
        fetchData();
      } catch {
        showToast(t('خطا در حذف.', 'Delete error.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const fmtDate = (v) => {
      if (!v) return '-';
      try { return new Intl.DateTimeFormat(isRtl ? 'fa-IR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(v)); }
      catch { return v; }
    };

    const columns = useMemo(() => [
      {
        field: 'request_code', header_fa: 'کد درخواست', header_en: 'Request Code', width: '130px',
        render: val => <span className="font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{val}</span>,
      },
      {
        field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '115px',
        render: val => { const s = getStatus(val); return <Badge variant={s.color} size="sm">{isRtl ? s.fa : s.en}</Badge>; },
      },
      {
        field: 'request_type', header_fa: 'نوع درخواست', header_en: 'Type', width: '105px',
        render: val => <span className="text-[11px] text-slate-600 dark:text-slate-400">{getTypeLabel(val, isRtl)}</span>,
      },
      {
        field: 'requester_party_id', header_fa: 'درخواست دهنده', header_en: 'Requester', width: '160px',
        render: (val, row) => (
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
            {val ? (partiesMap[val] || val) : (row.registrar_id ? (usersMap[row.registrar_id] || '-') : '-')}
          </span>
        ),
      },
      {
        field: 'department_id', header_fa: 'دپارتمان', header_en: 'Department', width: '130px',
        render: val => <span className="text-[11px] text-slate-500 dark:text-slate-400">{val ? (deptsMap[val] || val) : '-'}</span>,
      },
      {
        field: 'created_at', header_fa: 'تاریخ ثبت', header_en: 'Submitted', width: '100px',
        render: val => <span className="text-[11px] text-slate-500">{fmtDate(val)}</span>,
      },
      {
        field: 'need_date', header_fa: 'تاریخ نیاز', header_en: 'Need Date', width: '100px',
        render: val => <span className="text-[11px] text-slate-500">{val ? fmtDate(val) : '-'}</span>,
      },
      {
        field: 'description', header_fa: 'شرح', header_en: 'Description', width: 'auto',
        render: val => <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block max-w-xs" title={val}>{val || '-'}</span>,
      },
    ], [usersMap, partiesMap, deptsMap, isRtl]);

    const filteredData = useMemo(() => requests.filter(r => {
      if (filters.status && r.status !== filters.status) return false;
      if (filters.request_type && r.request_type !== filters.request_type) return false;
      if (filters.my_requests && String(r.registrar_id) !== String(currentUserId)) return false;
      return true;
    }), [requests, filters, currentUserId]);

    const filterFields = [
      { name: 'status', label: t('وضعیت', 'Status'), type: 'select', options: STATUS_LIST.map(s => ({ value: s.value, label: isRtl ? s.fa : s.en })) },
      { name: 'request_type', label: t('نوع درخواست', 'Request Type'), type: 'select', options: REQUEST_TYPES.map(r => ({ value: r.value, label: isRtl ? r.fa : r.en })) },
      { name: 'my_requests', label: t('درخواست‌های من', 'My Requests'), type: 'toggle' },
    ];

    const viewConfig = useMemo(() => ({
      pageId: 'request_management_list',
      currentState: () => ({ filters, gridState }),
      onApplyState: (state) => {
        if (state) { if (state.filters) setFilters(state.filters); if (state.gridState) setGridState(state.gridState); }
        else { setFilters({}); setGridState(null); }
      },
    }), [filters, gridState]);

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مدیریت درخواست‌ها', 'Request Management')}
          icon={ClipboardList}
          description={t('ثبت، پیگیری و مدیریت درخواست‌های سازمانی', 'Manage and track organizational requests')}
          language={language}
          breadcrumbs={[{ label: t('گردش کار', 'Workflow') }, { label: t('درخواست‌ها', 'Requests') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-2 animate-in fade-in duration-300">
          <AdvancedFilter fields={filterFields} initialValues={filters}
            onFilter={setFilters} onClear={() => setFilters({})} language={language} />

          <div className="flex-1 min-h-0 mt-1">
            <DataGrid
              data={filteredData} columns={columns} language={language}
              formCode={formCode} isLoading={isLoading} hideImport={true}
              selectable={true} selectedIds={selectedIds} onSelectChange={setSelectedIds}
              gridState={gridState} onGridStateChange={setGridState}
              onAdd={access.canCreate ? () => setFormModal({ isOpen: true, mode: 'CREATE', record: null }) : undefined}
              onRowDoubleClick={row => setFormModal({ isOpen: true, mode: 'EDIT', record: row })}
              actions={[
                {
                  icon: Edit, tooltip: t('مشاهده / ویرایش', 'View / Edit'),
                  onClick: row => setFormModal({ isOpen: true, mode: 'EDIT', record: row }),
                  className: 'text-slate-400 hover:text-indigo-600',
                },
                {
                  icon: Trash2, tooltip: t('حذف', 'Delete'),
                  onClick: row => {
                    if (!isDeletable(row)) { showToast(t('فقط درخواست‌های "یادداشت" قابل حذف هستند.', 'Only Draft requests can be deleted.'), 'warning'); return; }
                    setDeleteConfirm({ isOpen: true, type: 'single', data: row });
                  },
                  className: row => isDeletable(row) ? 'text-slate-400 hover:text-red-600' : '!text-slate-200 dark:!text-slate-700 cursor-not-allowed',
                },
              ]}
              bulkActions={[{
                label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline',
                onClick: ids => {
                  const ok = requests.filter(r => ids.includes(r.id) && isDeletable(r)).map(r => r.id);
                  if (!ok.length) { showToast(t('هیچ‌کدام قابل حذف نیستند.', 'None can be deleted.'), 'warning'); return; }
                  setDeleteConfirm({ isOpen: true, type: 'bulk', data: ok });
                },
              }]}
            />
          </div>
        </div>

        {formModal.isOpen && (
          <RequestFormModal
            isOpen={formModal.isOpen}
            onClose={() => setFormModal({ isOpen: false, mode: 'CREATE', record: null })}
            onSuccess={() => { setFormModal({ isOpen: false, mode: 'CREATE', record: null }); fetchData(); }}
            formMode={formModal.mode}
            initialRecord={formModal.record}
            language={language}
            formCode={formCode}
          />
        )}

        <Modal isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
          title={t('تایید حذف', 'Confirm Delete')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'Warning: Irreversible')}
            description={deleteConfirm.type === 'bulk'
              ? t(`آیا از حذف ${deleteConfirm.data?.length} درخواست مطمئنید؟`, `Delete ${deleteConfirm.data?.length} requests?`)
              : t('آیا از حذف این درخواست مطمئنید؟', 'Delete this request?')}
            action={
              <div className="flex gap-2 w-full mt-4 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={executeDelete} isLoading={isLoading}>{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
      </div>
    );
  };

  window.RequestManagement = RequestManagement;
})();
