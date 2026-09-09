/* Filename: requests/RequestDetails.js */
/* RequestFormModal – depends on RequestItemsGrid.js loaded before this file */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

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

  const DSForms     = window.DSForms || DS;
  const TextField         = safeComp(DSForms, 'TextField');
  const SelectField       = safeComp(DSForms, 'SelectField');
  const DatePicker        = safeComp(DSForms, 'DatePicker');

  const DSGrid      = window.DSGrid || DS;
  const DataGrid    = safeComp(DSGrid, 'DataGrid');
  const LOVField    = safeComp(DSGrid, 'LOVField');

  const DSFeedback  = window.DSFeedback || window.DSOverlays || DS;
  const Modal       = safeComp(DSFeedback, 'Modal');
  const Toast       = safeComp(DSFeedback, 'Toast');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const LucideIcons   = window.LucideIcons || {};
  const Save          = safeIcon(LucideIcons, 'Save');
  const Check         = safeIcon(LucideIcons, 'Check');
  const AlertTriangle = safeIcon(LucideIcons, 'AlertTriangle');
  const Scale         = safeIcon(LucideIcons, 'Scale');
  const Send          = safeIcon(LucideIcons, 'Send');
  const CheckCircle   = safeIcon(LucideIcons, 'CheckCircle');
  const XCircle       = safeIcon(LucideIcons, 'XCircle');
  const RotateCcw     = safeIcon(LucideIcons, 'RotateCcw');
  const Lock          = safeIcon(LucideIcons, 'Lock');
  const PlayCircle    = safeIcon(LucideIcons, 'PlayCircle');
  const CheckSquare   = safeIcon(LucideIcons, 'CheckSquare');
  const ChevronRight  = safeIcon(LucideIcons, 'ChevronRight');
  const ChevronLeft   = safeIcon(LucideIcons, 'ChevronLeft');

  // ── Shared constants ───────────────────────────────────────────────────────
  const REQUEST_TYPES = [
    { value: 'TRANSFER',   fa: 'انتقال وجه',  en: 'Transfer'   },
    { value: 'EXCHANGE',   fa: 'تبدیل ارز',   en: 'Exchange' },
    { value: 'BUDGET',     fa: 'مصرف بودجه',   en: 'Budget'     },
    { value: 'GENERAL',    fa: 'واریز/ برداشت',   en: 'General'    },
  ];

  const PAYMENT_TYPES = [
    { value: 'CASH',   fa: 'نقد',     en: 'Cash'   },
    { value: 'CHECK',  fa: 'چک',      en: 'Check'  },
    { value: 'CRYPTO', fa: 'کریپتو',  en: 'Crypto' },
    { value: 'BANK',   fa: 'بانک',    en: 'Bank'   },
    { value: 'TC',     fa: 'TC',      en: 'TC'     },
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

  const BALANCED_REQUEST_TYPES = ['TRANSFER', 'EXCHANGE'];
  const getStatus = (v) => STATUS_LIST.find(s => s.value === v) || STATUS_LIST[0];
  const workflowNotificationUtils = window.WorkflowNotificationUtils || {};
  const sendWorkflowAssignmentNotifications = workflowNotificationUtils.sendWorkflowAssignmentNotifications
    || (async () => 0);

  const getSessionUserId = () => {
    try {
      const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
      return JSON.parse(s).id || null;
    } catch { return null; }
  };

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

    const currentUserObj  = window.NavigationSystem?.currentUser || {};
    const currentUserId   = getSessionUserId() || currentUserObj.id || null;
    const currentUserName = currentUserObj.name || currentUserObj.full_name || currentUserObj.username || '';

    // RequestItemsGrid registered by RequestItemsGrid.js (loaded before this)
    const RequestItemsGrid = safeComp(window, 'RequestItemsGrid');

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

    const [isLoading,   setIsLoading]   = useState(false);
    const [isDirty,     setIsDirty]     = useState(false);
    const [hasSaved,    setHasSaved]    = useState(false);
    const [copyWarning, setCopyWarning] = useState(null);
    const [header,      setHeader]      = useState({});
    const [items,       setItems]       = useState([]);
    const [lookups,     setLookups]     = useState({
      leafAccounts: [], allAccounts: [], costTypes: [], incomeTypes: [],
      costBenefitCenters: [],
      currencies: [], usersMap: {}, usersList: [], partiesMap: {}, partiesList: [],
      nodesMap: {}, orgNodes: [], personnelRows: [], rolesMap: {}, currentUserDeptId: null, currentUserDeptTitle: '',
      currentUserPartyId: null, currentUserPartyName: '',
      projects: [],
    });

  const gridRef     = useRef(null);

    const isMissingWorkflowSchemaError = useCallback((error, status) => {
      const msg = String(error?.message || '').toLowerCase();
      const details = String(error?.details || '').toLowerCase();
      const hint = String(error?.hint || '').toLowerCase();
      return (
        status === 404 ||
        error?.code === '42P01' ||
        msg.includes('wf_state_machines') ||
        details.includes('wf_state_machines') ||
        hint.includes('wf_state_machines')
      );
    }, []);

    const parseAmount = useCallback((value) => {
      return parseFloat(String(value || '0').replace(/,/g, '')) || 0;
    }, []);

    const formatNumberSafe = useCallback((val) => {
      const num = parseAmount(val);
      return num.toLocaleString('en-US');
    }, [parseAmount]);

    const getRequestedAmount = useCallback((item) => {
      const dep = parseAmount(item?.deposit_amount);
      const wid = parseAmount(item?.withdrawal_amount);
      return Math.max(dep, wid);
    }, [parseAmount]);

    const getCurrencyDecimals = useCallback((currencyCode) => {
      const currency = (lookups.currencies || []).find(item => item.code === currencyCode);
      const decimals = currency?.decimal_places;
      return Number.isFinite(Number(decimals)) ? Number(decimals) : 2;
    }, [lookups.currencies]);

    const roundToCurrencyDecimals = useCallback((value, currencyCode) => {
      const decimals = getCurrencyDecimals(currencyCode);
      const factor = 10 ** decimals;
      return Math.round((Number(value) || 0) * factor) / factor;
    }, [getCurrencyDecimals]);

    const resolveRates = useCallback((ratesMap, currency) => {
      let toUsd = 1;
      if (currency !== 'USD') {
        const direct = ratesMap[`${currency}_USD`];
        const inverse = ratesMap[`USD_${currency}`];
        if (direct) toUsd = parseFloat(direct);
        else if (inverse) toUsd = 1 / parseFloat(inverse);
      }
      return { toUsd };
    }, []);

    const dataEntryComponents = useMemo(() => ({
      Button,
      Modal,
      DataGrid,
      TextField,
      LOVField,
    }), []);

    const useRequestWorkFlow = window.useRequestWorkFlow || (() => ({
      dynamicActions: [],
      workflowGraph: { nodes: [], edges: [] },
      workflowLoading: false,
      workflowPermissions: {},
      renderStatusActions: () => null,
      renderWorkflowModals: () => null,
      resolveNextAssignees: async () => ({ users: [], labels: [] }),
      resolveDataEntryFormsForStatus: () => [],
      selectedMachineMeta: { id: null, machine_code: '' },
    }));
    const workflowModule = useRequestWorkFlow({
      isOpen,
      language,
      isRtl,
      t,
      supabase,
      header,
      items,
      lookups,
      currentUserId,
      isLoading,
      access,
      formCode,
      parseAmount,
      formatNumberSafe,
      getRequestedAmount,
      showToast,
      setItems,
      setIsDirty,
      safeIcon,
      LucideIcons,
      getStatus,
      isMissingWorkflowSchemaError,
      dataEntryComponents,
    });

    const {
      workflowPermissions,
      renderStatusActions,
      renderWorkflowModals,
      resolveNextAssignees,
      resolveDataEntryFormsForStatus,
      selectedMachineMeta,
    } = workflowModule;

    const isMissingWorkItemsTableError = useCallback((error) => {
      const msg = String(error?.message || '').toLowerCase();
      const details = String(error?.details || '').toLowerCase();
      const hint = String(error?.hint || '').toLowerCase();
      return error?.code === '42P01'
        || error?.code === 'PGRST205'
        || msg.includes('wf_work_items')
        || msg.includes('could not find the table')
        || details.includes('wf_work_items')
        || hint.includes('wf_work_items');
    }, []);

    const canEditField = useCallback((field) => {
      if (formMode === 'CREATE' || formMode === 'COPY') return true;
      return ['EDITABLE', 'REQUIRED'].includes(workflowPermissions[field]);
    }, [formMode, workflowPermissions]);

    const isReadOnly = formMode !== 'CREATE' && formMode !== 'COPY' &&
      !Object.values(workflowPermissions).some(permission => permission === 'EDITABLE' || permission === 'REQUIRED');
    const areItemsReadOnly = formMode !== 'CREATE' && formMode !== 'COPY' &&
      !Object.entries(workflowPermissions).some(([field, permission]) => field.startsWith('items.') && ['EDITABLE', 'REQUIRED'].includes(permission));
    const useRequestDetailsPersistence = window.useRequestDetailsPersistence || (() => ({
      currencyRates: {},
      handleSave: async () => {},
    }));

    const { currencyRates, handleSave } = useRequestDetailsPersistence({
      isOpen,
      formMode,
      initialRecord,
      supabase,
      isRtl,
      t,
      currentUserId,
      currentUserName,
      header,
      setHeader,
      items,
      setItems,
      isDirty,
      setIsDirty,
      setHasSaved,
      setIsLoading,
      setCopyWarning,
      showToast,
      setLookups,
      resolveNextAssignees,
      resolveDataEntryFormsForStatus,
      selectedMachineMeta,
      parseAmount,
      resolveRates,
      isMissingWorkItemsTableError,
      getStatus,
      lookups,
      sendWorkflowAssignmentNotifications,
    });

    const updateHeader = useCallback((field, value) => {
      setHeader(p => ({ ...p, [field]: value }));
      setIsDirty(true);
    }, []);


    const handleClose = () => { if (hasSaved && onSuccess) onSuccess(); else onClose(); };
    
    // ── balance check for TRANSFER and EXCHANGE ───────────────────────────────────
    const balanceInfo = useMemo(() => {
      if (!BALANCED_REQUEST_TYPES.includes(header.request_type) || items.length === 0) return { isUnbalanced: false, diffUsd: 0 };

      let diffUsd = 0;
      items.forEach(item => {
        const dep = parseAmount(item.deposit_amount);
        const wid = parseAmount(item.withdrawal_amount);
        const cur = item.currency || 'IRR';
        const { toUsd } = resolveRates(currencyRates, cur);
        diffUsd += (dep - wid) * toUsd;
      });
      
      const tolerance = 0.01;
      const isUnbalanced = Math.abs(diffUsd) > tolerance;

      const currenciesUsed = [...new Set(items.map(item => item.currency || 'IRR'))];
      const displayCurrency = currenciesUsed.length === 1 ? currenciesUsed[0] : 'USD';
      const displayToUsd = resolveRates(currencyRates, displayCurrency).toUsd || 1;
      const diffDisplayRaw = displayToUsd > 0 ? diffUsd / displayToUsd : diffUsd;
      const displayDecimals = getCurrencyDecimals(displayCurrency);
      const diffDisplayAmount = roundToCurrencyDecimals(diffDisplayRaw, displayCurrency);

      return { isUnbalanced, diffUsd, displayCurrency, displayToUsd, diffDisplayAmount, displayDecimals };
    }, [currencyRates, getCurrencyDecimals, header.request_type, items, parseAmount, roundToCurrencyDecimals, resolveRates]);
    
    if (!isOpen) return null;

    const statusInfo = getStatus(header.status || 'DRAFT');
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

    const statusActions = renderStatusActions(handleSave);

    const headerCardTitle = (
      <div className="flex items-center gap-3 w-full">
        <span>{t('اطلاعات سربرگ', 'Request Header')}</span>
        <Badge variant={statusInfo.color} className="shadow-none text-[10px]">
          {isRtl ? statusInfo.fa : statusInfo.en}
        </Badge>
      </div>
    );

    return (
      <div className="flex-1 min-h-0 flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900 text-[12px] animate-in fade-in duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-30 relative">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" icon={isRtl ? ChevronRight : ChevronLeft} onClick={handleClose}>{t('بازگشت به لیست', 'Back to List')}</Button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                {isReadOnly ? t('مشاهده درخواست', 'View Request') : formMode === 'CREATE' ? t('ثبت درخواست جدید', 'New Request') : formMode === 'COPY' ? t('کپی درخواست', 'Copy Request') : t('ویرایش درخواست', 'Edit Request')}
              </span>
              {header.request_code && (
                <>
                  <span className="text-slate-300 dark:text-slate-600 select-none">·</span>
                  <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{header.request_code}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="!px-5" onClick={handleClose}>{t('انصراف', 'Cancel')}</Button>
            {!isReadOnly && access.canEdit && (
              <Button variant="primary" size="sm" className="!px-5" icon={Save}
                onClick={() => handleSave()} isLoading={isLoading} disabled={!isDirty}>
                {t('ذخیره', 'Save')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex flex-col gap-4">

            {copyWarning && (
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 p-2 rounded-lg flex items-center gap-2 shrink-0 animate-in slide-in-from-top-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="text-[12px] font-bold">{copyWarning}</span>
              </div>
            )}

            <Card title={headerCardTitle} action={statusActions}
              isCollapsible={true} noPadding={true}
              className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-20"
              headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0"
              language={language}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 p-3 bg-white dark:bg-slate-800 overflow-visible">

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
                    isRtl={isRtl} calendarMode={calendarMode} disabled={!canEditField('need_date')} />
                </div>

                <div className="relative z-[80]">
                  <SelectField size="sm" label={t('نوع درخواست', 'Request Type')}
                    value={header.request_type || 'GENERAL'}
                    onChange={e => updateHeader('request_type', e.target.value)}
                    options={REQUEST_TYPES.map(r => ({ value: r.value, label: isRtl ? r.fa : r.en }))}
                    isRtl={isRtl} disabled={!canEditField('request_type') || hasItems} required />
                  {hasItems && !isReadOnly && (
                    <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {t('در صورت وجود اقلام، نوع درخواست قابل تغییر نیست.', 'Request Type is locked when items exist.')}
                    </p>
                  )}
                </div>

                <div className="relative z-[78]">
                  <SelectField size="sm" label={t('نوع پرداخت', 'Payment Type')}
                    value={header.payment_type || ''}
                    onChange={e => updateHeader('payment_type', e.target.value)}
                    options={PAYMENT_TYPES.map(r => ({ value: r.value, label: isRtl ? r.fa : r.en }))}
                    isRtl={isRtl} disabled={!canEditField('payment_type')} required />
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

                <div className="lg:col-span-2 md:col-span-2 relative z-[70]">
                  <TextField size="sm" label={t('شرح درخواست', 'Description')}
                    value={header.description || ''} onChange={e => updateHeader('description', e.target.value)}
                    isRtl={isRtl} disabled={!canEditField('description')} required={workflowPermissions.description === 'REQUIRED' || formMode === 'CREATE' || formMode === 'COPY'} />
                </div>
              </div>
            </Card>

            <Card title={
              <div className="flex items-center gap-4 w-full">
                <span>{t('اقلام درخواست', 'Request Items')}</span>
                {balanceInfo.isUnbalanced && (
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800/50">
                    <AlertTriangle size={14} />
                    <span className="text-[12px] font-bold">
                      {t(
                        balanceInfo.displayCurrency === 'USD' ? 'اختلاف تراز دلاری:' : `اختلاف تراز ${balanceInfo.displayCurrency}:`,
                        balanceInfo.displayCurrency === 'USD' ? 'USD Diff:' : `${balanceInfo.displayCurrency} Diff:`
                      )}
                      <span dir="ltr" className="inline-block px-1 font-black">{balanceInfo.diffDisplayAmount.toFixed(balanceInfo.displayDecimals)}</span>
                    </span>
                  </div>
                )}
              </div>
            }
              action={
                balanceInfo.isUnbalanced && !isReadOnly ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="!text-orange-600 !border-orange-500 hover:!bg-orange-100 dark:hover:!bg-orange-900/40 !h-6 !py-0 !text-[12px]"
                    icon={Scale}
                    onClick={(e) => {
                      e.stopPropagation();
                      gridRef.current?.triggerBalanceRow({
                        diffAmount: balanceInfo.diffDisplayAmount,
                        currency: balanceInfo.displayCurrency,
                      });
                    }}
                  >
                    {t('تراز کردن ارزی', 'Balance (USD)')}
                  </Button>
                ) : null
              }
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
                  isReadOnly={areItemsReadOnly}
                  language={language}
                  showToast={showToast}
                  formCode={formCode}
                />
              </div>
            </Card>

        </div>

        {renderWorkflowModals(handleSave)}

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(p => ({ ...p, isVisible: false }))} />
      </div>
    );
  };

  window.RequestFormModal = RequestFormModal;
})();