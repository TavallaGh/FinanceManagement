/* Filename: budgeting/BudgetAmendment.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useRef, useMemo } = React;
  const logic = window.BudgetAmendmentLogic;
  const setup = window.BudgetSetupLogic;
  const math = window.BudgetSetupAllocationLogic;
  const FallbackIcon = ({ size = 16 }) => <span style={{ display: 'inline-block', width: size, height: size }} />;
  const { FilePlus = FallbackIcon,
    Save = FallbackIcon, Plus = FallbackIcon, Trash2 = FallbackIcon, Edit = FallbackIcon,
    RefreshCw = FallbackIcon, AlertTriangle = FallbackIcon, Sigma = FallbackIcon,
    MessageSquare = FallbackIcon, Paperclip = FallbackIcon, Clock = FallbackIcon,
    ChevronRight = FallbackIcon, ChevronLeft = FallbackIcon } = window.LucideIcons || {};
  const BudgetAmendment = ({ language = 'fa', formCode = 'BUD_AMENDMENT' }) => {
    const { PageHeader, Button, Badge, Tabs, Skeleton, EmptyState, Card } = window.DSCore;
    const { TextField, TextAreaField, SelectField, CurrencyField, DatePicker } = window.DSForms;
    const { DataGrid, AdvancedFilter, LOVField } = window.DSGrid;
    const { Modal, Toast } = window.DSFeedback;
    const client = window.supabase;
    const security = window.SecurityManager?.useSecurity?.();
    const access = security?.getActions(formCode) || { canView: false, canCreate: false, canEdit: false, canDelete: false };
    const scope = security?.getDataScope(formCode) || {};
    const isRtl = language === 'fa';
    const calendarMode = window.DSCore.useCalendarMode();
    const dateLocale = calendarMode === 'jalali' ? 'fa-IR-u-nu-latn' : 'en-US';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const [records, setRecords] = useState([]);
    const [plans, setPlans] = useState([]);
    const [filterLookups, setFilterLookups] = useState({ centers: [], headings: [] });
    const [filters, setFilters] = useState({});
    const [doc, setDoc] = useState(null);
    const [context, setContext] = useState(null);
    const [rows, setRows] = useState([]);
    const [persistedLineIds, setPersistedLineIds] = useState(new Set());
    const [dirty, setDirty] = useState(false);
    const [activeTab, setActiveTab] = useState('INCOME');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [addTarget, setAddTarget] = useState(null);
    const [existingSelection, setExistingSelection] = useState([]);
    const [newLine, setNewLine] = useState({});
    const [removeTarget, setRemoveTarget] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [exitConfirm, setExitConfirm] = useState(false);
    const [pendingPlan, setPendingPlan] = useState(null);
    const [editingRow, setEditingRow] = useState(null);
    const [summaryTarget, setSummaryTarget] = useState(null);
    const [commentTarget, setCommentTarget] = useState(null);
    const [attachmentTarget, setAttachmentTarget] = useState(null);
    const [logTarget, setLogTarget] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });
    const requestRef = useRef(0);
    const savingRef = useRef(false);
    const writable = doc && logic.editable.has(doc.status) && (doc.persisted ? access.canEdit : access.canCreate);
    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(value => ({ ...value, isVisible: false })), 4000);
    }, []);
    const errorText = error => {
      const messages = {
        'The reference budget must be active and approved': ['بودجه مرجع باید فعال و تأییدشده باشد.', 'The reference budget must be active and approved.'],
        'Access denied': ['دسترسی لازم را ندارید.', 'Access denied.'],
        'Effective start date must be within the reference budget range': ['تاریخ مؤثر شروع را در بازه بودجه مرجع انتخاب کنید.', 'Select an effective start date within the reference budget range.'],
        'Amendment changed; reload before saving': ['متمم تغییر کرده است؛ پیش از ذخیره بازخوانی کنید.', 'Amendment changed; reload before saving.'],
        'Amendment changed; reload': ['متمم تغییر کرده است؛ بازخوانی کنید.', 'Amendment changed; reload.'],
        'Another amendment operation is running for this budget; retry': ['عملیات دیگری روی متمم این بودجه در حال انجام است؛ دوباره تلاش کنید.', 'Another amendment operation is running; retry.'],
        'Every amendment line must change at least one bucket': ['هر ردیف متمم باید حداقل یک دوره با تغییر غیرصفر داشته باشد.', 'Every amendment line must change at least one bucket.'],
        'Enter at least one nonzero bucket change; the net total may be zero': ['حداقل یک تغییر غیرصفر در دوره‌ها لازم است؛ خالص متمم می‌تواند صفر باشد.', 'Enter at least one nonzero bucket change; the net may be zero.'],
        'This combination exists; amend its existing budget line': ['این ترکیب موجود است؛ ردیف موجود را برای متمم انتخاب کنید.', 'This combination exists; amend its existing line.'],
        'Invalid amendment amount or currency precision': ['مبلغ تغییر یا تعداد اعشار ارز معتبر نیست.', 'Invalid amendment amount or currency precision.'],
        'Select an active center and a leaf cost or income type matching this tab': ['مرکز فعال و نوع هزینه/درآمد نهایی و متناسب با تب را انتخاب کنید.', 'Select an active matching center and leaf cost/income type.'],
        'New lines must use the same allocation method as this budget type': ['روش تسهیم ردیف جدید باید با ردیف‌های همین نوع بودجه یکسان باشد.', 'New lines must use the same allocation method.']
      };
      if (error.message?.startsWith('Budget cannot be negative:'))
        return t('کاهش مبلغ مجاز نیست؛ بودجه تجمیعی ردیف در این دوره منفی می‌شود: ', 'The decrease makes this budget bucket negative: ') + error.message.split(':').slice(1).join(':');
      const mapped = messages[error.message];
      return mapped ? t(...mapped) : error.message || t('عملیات انجام نشد', 'Operation failed');
    };
    const loadIndex = useCallback(async () => {
      if (!access.canView) return;
      const request = ++requestRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const result = await logic.loadIndex(client, access, scope, language);
        if (request !== requestRef.current) return;
        setRecords(result.rows);
        setPlans(result.plans);
        setFilterLookups({ centers: result.centers, headings: result.headings });
      } catch (error) { if (request === requestRef.current) setLoadError(error.message); }
      finally { if (request === requestRef.current) setLoading(false); }
    }, [client, access.canView, scope?.own_data_only, language]);
    useEffect(() => { loadIndex(); return () => { requestRef.current += 1; }; }, [loadIndex]);
    const open = async record => {
      if (savingRef.current || !access.canView) return;
      const request = ++requestRef.current;
      setDoc({ ...record, persisted: true });
      setContext(null);
      setRows([]);
      setDirty(false);
      setLoading(true);
      setLoadError(null);
      try {
        const loaded = await logic.loadDocument(client, record.id, access, scope, language);
        if (request !== requestRef.current) return;
        setDoc({ ...loaded.doc, persisted: true });
        setContext(loaded.context);
        setRows(loaded.lines);
        setPersistedLineIds(new Set(loaded.lines.map(row => String(row.id))));
        setActiveTab(loaded.lines.some(row => logic.typeOf(row) === 'INCOME') ? 'INCOME' : 'COST');
      } catch (error) { if (request === requestRef.current) setLoadError(errorText(error)); }
      finally { if (request === requestRef.current) setLoading(false); }
    };
    const create = async () => {
      if (!access.canCreate || savingRef.current) return;
      const request = ++requestRef.current;
      setLoading(true);
      setLoadError(null);
      try {
        const preview = await window.AutoNumberingService?.previewNext('BUDGET_AMENDMENT');
        const code = typeof preview === 'string' ? preview : preview?.formattedCode;
        if (!code) throw new Error(t('شماره‌گذاری خودکار متمم بودجه در دسترس نیست', 'Budget amendment auto numbering is unavailable'));
        if (request !== requestRef.current) return;
        setDoc({ id: logic.uuid(), code, title: '', plan_id: null, status: 'DRAFT', persisted: false, revision: 0,
          created_at: new Date().toISOString(), created_by_name: logic.user().name, effective_start_date: '' });
        setRows([]);
        setPersistedLineIds(new Set());
        setContext(null);
        setDirty(false);
      } catch (error) { if (request === requestRef.current) showToast(errorText(error), 'error'); }
      finally { if (request === requestRef.current) setLoading(false); }
    };
    const choosePlan = async (plan, confirmed = false) => {
      if (!doc || doc.persisted || !writable || savingRef.current) return;
      if (context && String(doc.plan_id) === String(plan?.id)) return;
      if (rows.length && !confirmed) { setPendingPlan({ plan }); return; }
      const request = ++requestRef.current;
      setDoc(current => ({ ...current, plan_id: plan?.id || null }));
      setContext(null);
      setRows([]);
      setDirty(true);
      if (!plan) return;
      setLoading(true);
      setLoadError(null);
      try {
        const context = await logic.loadContext(client, plan.id, language);
        if (request === requestRef.current) setContext(context);
      } catch (error) { if (request === requestRef.current) setLoadError(errorText(error)); }
      finally { if (request === requestRef.current) setLoading(false); }
    };
    const back = () => {
      ++requestRef.current;
      setDoc(null);
      setContext(null);
      setRows([]);
      setDirty(false);
      setExitConfirm(false);
      loadIndex();
    };
    const leave = () => { if (!savingRef.current) dirty ? setExitConfirm(true) : back(); };
    const save = async (candidateRows = rows, force = false) => {
      if (!writable || (!dirty && !force) || savingRef.current || loading || loadError || !context) return false;
      if (!String(doc.code || '').trim() || !String(doc.title || '').trim())
        return showToast(t('کد و عنوان متمم الزامی است', 'Amendment code and title are required'), 'error');
      savingRef.current = true;
      setSaving(true);
      try {
        let document = doc;
        if (!doc.persisted) {
          logic.effectiveDate(context, doc.effective_start_date);
          logic.validate(context, candidateRows, false, doc.id);
          const number = await window.AutoNumberingService.consumeNext('BUDGET_AMENDMENT');
          const code = typeof number === 'string' ? number : number?.formattedCode;
          if (!code) throw new Error(t('کد خودکار متمم دریافت نشد', 'Automatic amendment code was not received'));
          document = { ...doc, code };
          setDoc(document);
        }
        const result = await logic.save({ client, doc: document, rows: candidateRows, access, scope, language });
        setDoc({ ...result.doc, persisted: true });
        setContext(result.context);
        setRows(result.lines);
        setPersistedLineIds(new Set(result.lines.map(row => String(row.id))));
        setDirty(false);
        showToast(result.auditError
          ? t('متمم ذخیره شد، اما ثبت سابقه کامل نشد.', 'Saved, but audit logging was incomplete.')
          : t('متمم ذخیره شد', 'Amendment saved'), result.auditError ? 'warning' : 'success');
        return true;
      } catch (error) {
        if (error.recoveryRequired) {
          setDoc(current => ({ ...current, persisted: true }));
          setDirty(false);
          setLoadError(errorText(error));
        }
        showToast(errorText(error), 'error');
        return false;
      }
      finally { savingRef.current = false; setSaving(false); }
    };
    const statusLabel = status => ({ DRAFT: t('یادداشت', 'Draft'), TEMPORARY: t('موقت', 'Temporary'),
      FINAL: t('بررسی‌شده', 'Reviewed'), APPROVED: t('تأییدشده', 'Approved') }[status] || status);
    const transitionLabel = status => ({ DRAFT: t('بازگشت به یادداشت', 'Revert to Draft'), TEMPORARY: t('تبدیل به موقت', 'Set Temporary'),
      FINAL: t('تبدیل به بررسی‌شده', 'Set Reviewed'), APPROVED: t('تأیید متمم', 'Approve Amendment') }[status]);
    const changeStatus = async () => {
      if (!doc?.persisted || !access.canEdit || dirty || loading || loadError || savingRef.current || !statusTarget) return;
      savingRef.current = true;
      setSaving(true);
      try {
        const result = await logic.changeStatus({ client, doc, target: statusTarget, access, scope, language });
        setDoc({ ...result.doc, persisted: true });
        setStatusTarget(null);
        showToast(result.auditError ? t('وضعیت تغییر کرد، اما ثبت سابقه ناموفق بود.', 'Status changed, but audit failed.')
          : t('وضعیت متمم تغییر کرد', 'Amendment status updated'), result.auditError ? 'warning' : 'success');
      } catch (error) { showToast(errorText(error), 'error'); }
      finally { savingRef.current = false; setSaving(false); }
    };
    const removeDocument = async () => {
      if (!deleteTarget || !access.canDelete || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      try {
        const result = await logic.remove({ client, doc: deleteTarget, access, scope });
        setDeleteTarget(null);
        showToast(result.auditError ? t('متمم حذف شد، اما ثبت سابقه ناموفق بود.', 'Deleted, but audit failed.') : t('متمم حذف شد', 'Amendment deleted'), result.auditError ? 'warning' : 'success');
        await loadIndex();
      } catch (error) { showToast(errorText(error), 'error'); }
      finally { savingRef.current = false; setSaving(false); }
    };
    const addExisting = () => {
      if (!writable || !context || savingRef.current) return;
      const ids = new Set(rows.map(logic.rootKey));
      const additions = existingSelection.filter(item => !ids.has(item.key)).map(item => ({
        id: logic.uuid(), row_kind: 'EXISTING', base_line_id: item.origin === 'BASE' ? item.source_id : null,
        origin_line_id: item.origin === 'AMENDMENT' ? item.source_id : null, cadence: item.cadence,
        cost_benefit_center_id: item.cost_benefit_center_id, cost_type_id: item.cost_type_id ?? null,
        income_type_id: item.income_type_id ?? null, funding_source_id: item.funding_source_id ?? null, values: {}
      }));
      if (!additions.length) return showToast(t('حداقل یک ردیف جدید انتخاب کنید', 'Select at least one additional line'), 'warning');
      setRows(current => [...current, ...additions]);
      setDirty(true);
      setAddTarget(null);
      setExistingSelection([]);
    };
    const addNew = () => {
      if (!writable || !context || savingRef.current) return;
      const row = { id: logic.uuid(), row_kind: 'NEW', base_line_id: null, origin_line_id: null,
        ...newLine, values: {}, cost_type_id: activeTab === 'COST' ? newLine.type_id : null,
        income_type_id: activeTab === 'INCOME' ? newLine.type_id : null };
      try { logic.validate(context, [...rows, row]); }
      catch (error) { return showToast(errorText(error), 'error'); }
      setRows(current => [...current, row]);
      setDirty(true);
      setAddTarget(null);
    };
    const setValue = (rowId, slotNo, value) => {
      if (!writable || savingRef.current) return;
      setRows(current => current.map(row => row.id === rowId ? { ...row, values: { ...row.values, [slotNo]: value } } : row));
      setDirty(true);
    };
    const saveEditingRow = async () => {
      if (!editingRow || !writable || savingRef.current) return;
      const candidate = rows.map(row => row.id === editingRow.id ? editingRow : row);
      if (await save(candidate, true)) setEditingRow(null);
    };
    const headingMap = useMemo(() => new Map((context?.headings || []).map(row => [String(row.id), row])), [context]);
    const centerMap = useMemo(() => new Map((context?.centers || []).map(row => [String(row.id), row])), [context]);
    const sourceMap = useMemo(() => new Map((context?.sources || []).map(row => [String(row.id), row])), [context]);
    const headingOf = row => headingMap.get(setup.typeKey(logic.typeOf(row), row.cost_type_id ?? row.income_type_id));
    const visibleRows = rows.filter(row => logic.typeOf(row) === activeTab);
    const editingType = editingRow && logic.typeOf(rows.find(row => row.id === editingRow.id) || editingRow);
    const chosenCadence = context?.cadenceByType[activeTab] || visibleRows[0]?.cadence || 'QUARTERLY';
    const slots = context ? context.bucketSlots(chosenCadence) : [];
    const totals = useMemo(() => {
      if (!context) return null;
      let increase = 0n, decrease = 0n;
      for (const row of rows) for (const value of Object.values(row.values || {})) {
        const units = logic.signed(value, context.precision);
        if (units == null) return null;
        if (units > 0n) increase += units; else decrease -= units;
      }
      return { increase, decrease, net: increase - decrease };
    }, [context, rows]);
    const money = value => value == null ? t('نامعتبر', 'Invalid') : math.format(value, context?.precision || 0);
    const existingRows = (context?.items || []).filter(item => logic.typeOf(item) === activeTab && !rows.some(row => logic.rootKey(row) === item.key))
      .map(item => ({ ...item, source_id: item.id, id: item.key }));
    const preview = row => {
      try {
        const item = logic.projectedItem(context, row, doc.id);
        const changes = item.slots.map((_slot, index) => logic.signed(row.values?.[index + 1], context.precision));
        if (changes.some(value => value == null)) return { item, invalid: true };
        const before = item.values.reduce((sum, value) => sum + value, 0n);
        const delta = changes.reduce((sum, value) => sum + value, 0n);
        return { item, changes, before, delta, after: before + delta };
      } catch (_error) { return { invalid: true }; }
    };
    const lineColumns = [
      { field: 'row_kind', header_fa: 'منشأ ردیف', header_en: 'Line Origin', width: '130px',
        render: (value, row) => <Badge variant={value === 'NEW' ? 'blue' : 'slate'}>{value === 'NEW' ? t('ردیف جدید', 'New Line')
          : row.origin_line_id ? t('ردیف متمم قبلی', 'Prior Amendment Line') : t('بودجه اصلی', 'Original Budget')}</Badge> },
      { field: '_change_type', header_fa: 'نوع تغییر', header_en: 'Change Type', width: '140px', render: (_value, row) => {
        const changes = preview(row).changes || [];
        const increase = changes.some(value => value > 0n), decrease = changes.some(value => value < 0n);
        return <Badge variant={increase && decrease ? 'blue' : increase ? 'emerald' : decrease ? 'orange' : 'slate'}>
          {increase && decrease ? t('افزایش و کاهش', 'Increase and Decrease') : increase ? t('افزایشی', 'Increase') : decrease ? t('کاهشی', 'Decrease') : t('بدون تغییر', 'No Change')}
        </Badge>;
      } },
      { field: '_type', header_fa: activeTab === 'COST' ? 'نوع هزینه' : 'نوع درآمد', header_en: activeTab === 'COST' ? 'Cost Type' : 'Income Type',
        width: '210px', render: (_value, row) => setup.referenceLabel(headingOf(row), language) },
      { field: 'cost_benefit_center_id', header_fa: 'مرکز درآمد / هزینه', header_en: 'Income / Cost Center', width: '190px',
        render: value => setup.referenceLabel(centerMap.get(String(value)), language) },
      { field: 'funding_source_id', header_fa: 'منبع تأمین', header_en: 'Funding Source', width: '160px',
        render: value => setup.referenceLabel(sourceMap.get(String(value)), language) },
      { field: '_before', header_fa: 'بودجه اولیه', header_en: 'Initial Budget', width: '150px', render: (_value, row) => <span dir="ltr">{money(preview(row).before)}</span> },
      { field: '_delta', header_fa: 'خالص متمم', header_en: 'Net Amendment', width: '130px', render: (_value, row) => <span dir="ltr">{money(preview(row).delta)}</span> },
      { field: '_after', header_fa: 'بودجه نهایی', header_en: 'Final Budget', width: '130px', render: (_value, row) => <span dir="ltr">{money(preview(row).after)}</span> },
      ...slots.map((slot, index) => ({ field: `slot_${index + 1}`, header_fa: slot.labelFa || slot.label,
        header_en: slot.labelEn || slot.label, width: '160px', render: (_value, row) => {
          const info = preview(row);
          const before = info.item?.values[index];
          return <CurrencyField size="sm" formCode={formCode} isRtl={isRtl} allowNegative value={row.values?.[index + 1] ?? ''}
              disabled={!writable || saving} aria-label={`${headingOf(row)?.title || ''} - ${slot.labelFa || slot.label || slot.labelEn}`}
              placeholder={money(before)} onChange={value => setValue(row.id, index + 1, value)} />;
        } }))
    ];
    const existingColumns = [
      { field: '_type', header_fa: 'نوع هزینه / درآمد', header_en: 'Cost / Income Type', width: '210px', render: (_value, row) => setup.referenceLabel(headingOf(row), language) },
      { field: 'cost_benefit_center_id', header_fa: 'مرکز', header_en: 'Center', width: '190px', render: value => setup.referenceLabel(centerMap.get(String(value)), language) },
      { field: 'funding_source_id', header_fa: 'منبع تأمین', header_en: 'Funding Source', render: value => setup.referenceLabel(sourceMap.get(String(value)), language) },
      { field: '_amount', header_fa: 'مبلغ بودجه', header_en: 'Budget Amount', width: '160px',
        render: (_value, row) => <span dir="ltr">{money(row.values.reduce((sum, value) => sum + value, 0n))} {context?.currency.code}</span> }
    ];
    const statusColors = { DRAFT: '!text-slate-600 !border-slate-500 hover:!bg-slate-50 dark:hover:!bg-slate-800',
      TEMPORARY: '!text-orange-500 !border-orange-500 hover:!bg-orange-50 dark:hover:!bg-orange-900/30',
      FINAL: '!text-blue-600 !border-blue-500 hover:!bg-blue-50 dark:hover:!bg-blue-900/30',
      APPROVED: '!text-emerald-600 !border-emerald-500 hover:!bg-emerald-50 dark:hover:!bg-emerald-900/30' };
    const budgetColumns = [{ field: 'code', header_fa: 'کد', header_en: 'Code', width: '130px' },
      { field: 'title', header_fa: 'عنوان بودجه', header_en: 'Budget Title', width: '260px' }];
    const filteredRecords = records.filter(row => logic.matchesFilters(row, filters));
    const authorizeAttachment = useCallback(record => {
      if (!access.canView || (scope?.own_data_only && String(record.created_by) !== logic.user().id))
        throw new Error(t('دسترسی مشاهده پیوست‌ها را ندارید.', 'Attachment view access denied.'));
    }, [access.canView, scope?.own_data_only, t]);
    const Attachments = window.DSRecordAttachments?.RecordAttachmentModal;
    const headerTitle = <div className="flex items-center gap-3 w-full min-w-0">
      <span className="shrink-0">{t('سربرگ متمم', 'Amendment Header')}</span>
      <Badge variant={{ DRAFT: 'slate', TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }[doc?.status]}>{statusLabel(doc?.status)}</Badge>
    </div>;
    const amendmentTotals = context && <div className="justify-self-center flex justify-center items-center gap-x-5 gap-y-1 text-[12px] font-semibold flex-wrap">
        <span className="text-emerald-700 dark:text-emerald-400">{t('افزایش', 'Increase')}: <span dir="ltr" className="inline-block">{money(totals?.increase)}</span></span>
        <span className="text-red-700 dark:text-red-400">{t('کاهش', 'Decrease')}: <span dir="ltr" className="inline-block">{money(totals?.decrease)}</span></span>
        <span className={totals?.net == null || totals.net === 0n ? 'text-slate-600 dark:text-slate-300' : totals.net > 0n ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
          {t('خالص', 'Net')}: <span dir="ltr" className="inline-block">{money(totals?.net)} {context.currency.code}</span></span>
      </div>;
    const netColor = value => {
      const units = logic.signed(value, 6);
      return units == null || units === 0n ? 'text-slate-600 dark:text-slate-300'
        : units > 0n ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';
    };
    const headerActions = doc?.persisted && <div className="flex items-center gap-2" onClick={event => event.stopPropagation()}>
      {access.canEdit && logic.transitions[doc.status].map(target => <Button key={target} size="sm" variant="outline"
        className={`${statusColors[target]} !py-0.5 !h-6`} disabled={dirty || saving || loading || !!loadError || !!editingRow}
        onClick={() => setStatusTarget(target)}>{transitionLabel(target)}</Button>)}
      {doc.status === 'APPROVED' && <Badge variant="emerald">{t('تأییدشده ـ غیرقابل تغییر', 'Approved - Locked')}</Badge>}
    </div>;
    if (!access.canView) return <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} />;
    return <div className={`${doc ? '' : 'p-4'} h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900 text-[12px] overflow-hidden`} dir={isRtl ? 'rtl' : 'ltr'}>
      {!doc ? <>
        <PageHeader title={t('متمم بودجه', 'Budget Amendment')} icon={FilePlus} language={language}
          breadcrumbs={[{ label: t('بودجه‌ریزی', 'Budgeting') }, { label: t('متمم بودجه', 'Budget Amendment') }]} />
        <div className="mt-4 flex-1 min-h-0 flex flex-col gap-2">
          <AdvancedFilter language={language} initialValues={filters} fields={[
            { name: 'cost_benefit_center', label: t('مرکز هزینه / درآمد', 'Cost / Income Center'), type: 'lov',
              lovData: filterLookups.centers, lovColumns: setup.centerLovColumns(language), dropdownWidth: 'min-w-[600px] max-w-[760px]' },
            ...['COST', 'INCOME'].map(type => ({ name: type === 'COST' ? 'cost_type' : 'income_type',
              label: type === 'COST' ? t('نوع هزینه', 'Cost Type') : t('نوع درآمد', 'Income Type'), type: 'lov',
              lovData: filterLookups.headings.filter(row => row.heading_type === type),
              lovColumns: setup.referenceLovColumns(language, true) }))
          ]} onFilter={setFilters} onSearch={setFilters} onClear={() => setFilters({})} />
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? <div className="p-4"><Skeleton height="12rem" /></div> : loadError ? <EmptyState title={loadError}
              action={<Button size="sm" onClick={loadIndex}>{t('تلاش دوباره', 'Retry')}</Button>} /> :
              <DataGrid key={JSON.stringify(filters)} data={filteredRecords} language={language} formCode={formCode} hideImport hideExport actionWidth="230px"
                defaultHiddenCols={window.BudgetSetupSupport.hiddenStatusColumns}
                onAdd={access.canCreate ? create : undefined} onRowClick={open} columns={[
                  { field: 'code', header_fa: 'کد متمم', header_en: 'Amendment Code', width: '120px' },
                  { field: 'title', header_fa: 'عنوان متمم', header_en: 'Amendment Title', width: '240px' },
                  { field: 'budget_title', header_fa: 'بودجه مرجع', header_en: 'Reference Budget', width: '220px',
                    render: (_value, row) => setup.referenceLabel({ title: row.budget_title, code: row.budget_code }, language),
                    searchAccessor: (_value, row) => `${row.budget_title || ''} ${row.budget_code || ''}` },
                  { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '110px', render: value => <Badge variant={{ DRAFT: 'slate', TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }[value]}>{statusLabel(value)}</Badge> },
                  { field: '_changes', header_fa: 'افزایش / کاهش', header_en: 'Increase / Decrease', width: '170px',
                    searchAccessor: (_value, row) => `${row.increase || ''} ${row.decrease || ''}`,
                    render: (_value, row) => <div className="flex flex-col gap-0.5 leading-tight text-[11px]">
                      <span className="text-emerald-700 dark:text-emerald-400">{t('افزایش', 'Increase')}: <span dir="ltr" className="inline-block">{row.increase}</span></span>
                      <span className="text-red-700 dark:text-red-400">{t('کاهش', 'Decrease')}: <span dir="ltr" className="inline-block">{row.decrease}</span></span>
                    </div> },
                  { field: 'net', header_fa: 'خالص تغییر', header_en: 'Net Change', width: '130px',
                    render: value => <span dir="ltr" className={netColor(value)}>{value}</span> },
                  { field: 'currency_code', header_fa: 'ارز', header_en: 'Currency', width: '80px' },
                  { field: 'created_at', header_fa: 'تاریخ ثبت', header_en: 'Created At', type: 'date', width: '115px' },
                  { field: 'created_by_name', header_fa: 'ثبت‌کننده', header_en: 'Created By', width: '150px' },
                  ...window.BudgetSetupSupport.lifecycleColumns()
                ]} actions={[
                  { id: 'open', icon: Edit, tooltip: t('بازکردن متمم', 'Open Amendment'), requiredAccess: 'view', onClick: open },
                  { id: 'summary', icon: Sigma, tooltip: t('نمایش تجمیع', 'Summary'), requiredAccess: 'view', onClick: record => setSummaryTarget({ record }) },
                  { id: 'comments', icon: MessageSquare, tooltip: t('کامنت‌ها', 'Comments'), requiredAccess: 'view', onClick: setCommentTarget },
                  { id: 'attachments', icon: Paperclip, tooltip: t('پیوست‌ها', 'Attachments'), requiredAccess: 'view', onClick: setAttachmentTarget },
                  { id: 'view_log', icon: Clock, tooltip: t('لاگ سیستم', 'System Log'), requiredAccess: 'view',
                    onClick: row => setLogTarget({ entity: 'متمم بودجه', id: row.id }) },
                  { id: 'delete', icon: Trash2, tooltip: t('حذف یادداشت', 'Delete Draft'), requiredAccess: 'delete', hidden: row => row.status !== 'DRAFT', onClick: setDeleteTarget }
                ]} />}
          </div>
        </div>
      </> : <>
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 shrink-0 shadow-sm z-30 relative">
          <div className="flex items-center gap-3 min-w-0">
            <Button size="sm" variant="ghost" icon={isRtl ? ChevronRight : ChevronLeft} disabled={saving} onClick={leave}>{t('بازگشت به لیست', 'Back to List')}</Button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{!writable ? t('مشاهده متمم', 'View Amendment') : doc.persisted ? t('ویرایش متمم', 'Edit Amendment') : t('ثبت متمم جدید', 'New Amendment')}</span>
              {doc.code && <><span className="text-slate-300 dark:text-slate-600 select-none">·</span><span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{doc.code}</span></>}
            </div>
          </div>
          <div className="min-w-0">{amendmentTotals}</div>
          <div className="flex items-center justify-end flex-wrap gap-1.5 justify-self-end">
            <Button size="sm" variant="ghost" icon={Sigma} title={t('نمایش تجمیع', 'Summary')} aria-label={t('نمایش تجمیع', 'Summary')}
              disabled={saving || loading || !!loadError || !context} onClick={() => setSummaryTarget({ snapshot: { doc, context, lines: rows }, dirty })} />
            {doc.persisted && <Button size="sm" variant="ghost" icon={RefreshCw} title={t('بازخوانی', 'Refresh')} disabled={saving || dirty} onClick={() => open(doc)} />}
            <Button size="sm" variant="ghost" icon={Paperclip} title={t('پیوست‌ها', 'Attachments')} aria-label={t('پیوست‌ها', 'Attachments')}
              disabled={!doc.persisted || saving || loading || !!loadError} onClick={() => setAttachmentTarget(doc)} />
            {doc.persisted && <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />}
            <Button size="sm" variant="outline" className="!px-5" disabled={saving} onClick={leave}>{t('انصراف', 'Cancel')}</Button>
            {writable && <Button size="sm" variant="primary" className="!px-5" icon={Save} isLoading={saving} disabled={!dirty || loading || !!loadError || !context} onClick={() => save()}>{t('ذخیره', 'Save')}</Button>}
          </div>
        </div>
        <div className="p-4 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          <Card key={doc.id} title={headerTitle} action={headerActions} isCollapsible noPadding language={language}
            className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-20"
            headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 !h-auto min-h-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3 bg-white dark:bg-slate-800 overflow-visible">
            <LOVField size="sm" formCode={formCode} isRtl={isRtl} label={t('بودجه مرجع تأییدشده', 'Approved Reference Budget')} data={plans} columns={budgetColumns}
              disabled={doc.persisted || !writable || saving} displayValue={context ? `${context.plan.code} - ${context.plan.title}` : ''} onChange={choosePlan} />
            <TextField size="sm" formCode={formCode} isRtl={isRtl} required label={t('کد متمم', 'Amendment Code')} value={doc.code}
              disabled dir="ltr" placeholder={t('تولید خودکار', 'Auto')} />
            <TextField size="sm" formCode={formCode} isRtl={isRtl} required label={t('عنوان متمم', 'Amendment Title')} value={doc.title}
              disabled={!writable || saving} onChange={event => { setDoc(current => ({ ...current, title: event.target.value })); setDirty(true); }} />
            <TextField size="sm" formCode={formCode} isRtl={isRtl} label={t('تاریخ ثبت', 'Registered At')} disabled
              value={doc.created_at ? new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(doc.created_at)) : ''} />
            <TextField size="sm" formCode={formCode} isRtl={isRtl} label={t('ثبت‌کننده', 'Created By')} disabled value={doc.created_by_name || ''} />
            <div className="relative z-[90]"><DatePicker size="sm" formCode={formCode} isRtl={isRtl} language={language} required
              label={t('تاریخ مؤثر شروع', 'Effective Start Date')} value={(doc.effective_start_date || '').replaceAll('-', '/')}
              disabled={!writable || saving || !context} onChange={value => {
                try { logic.effectiveDate(context, value); }
                catch (error) { if (value) showToast(errorText(error), 'error'); else { setDoc(current => ({ ...current, effective_start_date: '' })); setDirty(true); } return; }
                setDoc(current => ({ ...current, effective_start_date: math.normalizeDate(value) })); setDirty(true);
              }} /></div>
            <div className="col-span-2 md:col-span-4 lg:col-span-6"><TextField size="sm" formCode={formCode} isRtl={isRtl} label={t('توضیحات', 'Description')} value={doc.description || ''}
              disabled={!writable || saving} onChange={event => { setDoc(current => ({ ...current, description: event.target.value })); setDirty(true); }} /></div>
            <window.BudgetSetupSupport.LifecycleFields record={doc} language={language} formCode={formCode} />
          </div>
          </Card>
          {loading ? <Skeleton height="12rem" /> : loadError ? <EmptyState title={loadError}
            action={<Button size="sm" onClick={() => doc.persisted ? open(doc) : choosePlan(plans.find(row => row.id === doc.plan_id))}>{t('تلاش دوباره', 'Retry')}</Button>} /> : !context ?
            <EmptyState title={t('یک بودجه تأییدشده انتخاب کنید', 'Select an approved budget')} /> : <>
              <Tabs language={language} className="shrink-0 !mb-0" tabs={[{ id: 'INCOME', label: t('درآمد', 'Income'), disabled: saving }, { id: 'COST', label: t('هزینه', 'Cost'), disabled: saving }]}
                activeTab={activeTab} onChange={value => { setActiveTab(value); setExistingSelection([]); }} />
              <div className="flex-1 min-h-[280px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <DataGrid data={visibleRows} columns={lineColumns} language={language} formCode={formCode} hideImport hideExport
                  defaultPinnedCols={['_type', 'cost_benefit_center_id', 'funding_source_id', '_after']}
                  toolbarContent={writable && <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" icon={Plus} disabled={saving} onClick={() => { setAddTarget('EXISTING'); setExistingSelection([]); }}>{t('انتخاب ردیف موجود', 'Select Existing Line')}</Button>
                    <Button size="sm" variant="outline" icon={FilePlus} disabled={saving} onClick={() => {
                      setNewLine({ cadence: chosenCadence }); setAddTarget('NEW');
                    }}>{t('افزودن ردیف جدید', 'Add New Line')}</Button>
                  </div>} actionWidth="150px" actions={[...(writable ? [
                    { id: 'edit', icon: Edit, requiredAccess: doc.persisted ? 'edit' : 'create', tooltip: t('ویرایش ردیف', 'Edit Line'),
                      onClick: row => !savingRef.current && setEditingRow({ ...row, values: { ...row.values } }) },
                    { id: 'save', icon: Save, requiredAccess: doc.persisted ? 'edit' : 'create', tooltip: t('ذخیره تغییرات متمم', 'Save Amendment Changes'),
                      onClick: () => save(rows, true) },
                    { id: 'delete', icon: Trash2, requiredAccess: doc.persisted ? 'edit' : 'create',
                    tooltip: t('حذف از متمم', 'Remove from Amendment'), onClick: row => !savingRef.current && setRemoveTarget(row) }] : []),
                    { id: 'view_log', icon: Clock, requiredAccess: 'view', tooltip: t('لاگ سیستم', 'System Log'),
                      hidden: row => !doc.persisted || !persistedLineIds.has(String(row.id)),
                      onClick: row => setLogTarget({ entity: 'ردیف متمم بودجه', id: row.id }) }]} />
              </div>
            </>}
        </div>
      </>}
      {logTarget && <window.BudgetSetupSupport.LogModal entity={logTarget.entity} recordId={logTarget.id}
        formCode={formCode} language={language} onClose={() => setLogTarget(null)} />}
      <Modal isOpen={!!editingRow} onClose={() => !saving && setEditingRow(null)} title={t('ویرایش ردیف متمم', 'Edit Amendment Line')} language={language} width="max-w-3xl">
        {editingRow && context && <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <LOVField size="sm" formCode={formCode} isRtl={isRtl} disabled={saving || editingRow.row_kind !== 'NEW'}
              label={t('نوع درآمد / هزینه', 'Income / Cost Type')}
              data={context.headings.filter(row => row.heading_type === editingType && row.is_active && row.isLeaf)}
              columns={[{ field: 'title', header_fa: 'عنوان', header_en: 'Title', render: (_value, row) => setup.referenceLabel(row, language), searchAccessor: setup.referenceSearch }]}
              displayValue={headingOf(editingRow)?.title || ''} onChange={row => {
                const id = row ? String(row.id).split(':').slice(1).join(':') : null;
                const field = editingType === 'COST' ? 'cost_type_id' : 'income_type_id';
                setEditingRow(current => ({ ...current, [field]: id }));
              }} />
            <LOVField size="sm" formCode={formCode} isRtl={isRtl} disabled={saving || editingRow.row_kind !== 'NEW'}
              label={t('مرکز درآمد / هزینه', 'Income / Cost Center')} columns={setup.centerLovColumns(language)}
              dropdownWidth="min-w-[600px] max-w-[760px]"
              data={context.centers.filter(row => row.is_active && setup.centerMatches(row, editingType))}
              displayValue={centerMap.get(String(editingRow.cost_benefit_center_id))?.[isRtl ? 'title_fa' : 'title_en'] || ''}
              onChange={row => setEditingRow(current => ({ ...current, cost_benefit_center_id: row?.id ?? null }))} />
            <LOVField size="sm" formCode={formCode} isRtl={isRtl} disabled={saving || editingRow.row_kind !== 'NEW'}
              label={t('منبع تأمین', 'Funding Source')} data={context.sources.filter(row => row.is_active)}
              columns={[{ field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان', header_en: 'Title', render: (_value, row) => setup.referenceLabel(row, language), searchAccessor: setup.referenceSearch }]}
              displayValue={sourceMap.get(String(editingRow.funding_source_id))?.[isRtl ? 'title_fa' : 'title_en'] || ''}
              onChange={row => setEditingRow(current => ({ ...current, funding_source_id: row?.id ?? null }))} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {context.bucketSlots(editingRow.cadence).map((slot, index) => <CurrencyField key={index} size="sm" formCode={formCode}
              isRtl={isRtl} allowNegative disabled={saving} label={isRtl ? slot.labelFa || slot.label : slot.labelEn || slot.label}
              placeholder={money(preview(editingRow).item?.values[index])} value={editingRow.values?.[index + 1] ?? ''}
              onChange={value => setEditingRow(current => ({ ...current, values: { ...current.values, [index + 1]: value } }))} />)}
          </div>
          <TextAreaField size="sm" formCode={formCode} isRtl={isRtl} disabled={saving} label={t('توضیحات ردیف', 'Line Description')}
            value={editingRow.description || ''} onChange={event => setEditingRow(current => ({ ...current, description: event.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditingRow(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="primary" icon={Save} isLoading={saving} onClick={saveEditingRow}>{t('ذخیره', 'Save')}</Button>
          </div>
        </div>}
      </Modal>
      <Modal isOpen={addTarget === 'EXISTING'} onClose={() => setAddTarget(null)} title={t('انتخاب ردیف‌های بودجه', 'Select Budget Lines')} language={language} width="max-w-5xl">
        <div className="p-4 flex flex-col gap-3">
          <div className="h-[50vh] min-h-[300px]"><DataGrid data={existingRows} columns={existingColumns} language={language} formCode={formCode}
            hideImport hideExport selectable selectedRowIds={existingSelection.map(item => item.id)} onSelectionChange={ids => setExistingSelection(existingRows.filter(item => ids.includes(item.id)))} /></div>
          <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setAddTarget(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="primary" onClick={addExisting}>{t('افزودن ردیف‌های انتخاب‌شده', 'Add Selected Lines')}</Button></div>
        </div>
      </Modal>
      <Modal isOpen={addTarget === 'NEW'} onClose={() => setAddTarget(null)} title={t('ردیف جدید متمم', 'New Amendment Line')} language={language} width="max-w-lg">
        <div className="p-4 flex flex-col gap-3">
          <LOVField size="sm" formCode={formCode} isRtl={isRtl} label={t('مرکز هزینه و درآمد', 'Cost and Income Center')}
            data={(context?.centers || []).filter(row => row.is_active && setup.centerMatches(row, activeTab))} columns={setup.centerLovColumns(language)} dropdownWidth="min-w-[600px] max-w-[760px]"
            displayValue={centerMap.get(String(newLine.cost_benefit_center_id))?.[isRtl ? 'title_fa' : 'title_en'] || ''}
            onChange={row => setNewLine(current => ({ ...current, cost_benefit_center_id: row?.id || null }))} />
          <LOVField size="sm" formCode={formCode} isRtl={isRtl} label={activeTab === 'COST' ? t('نوع هزینه', 'Cost Type') : t('نوع درآمد', 'Income Type')}
            data={(context?.headings || []).filter(row => row.heading_type === activeTab && row.is_active && row.isLeaf)}
            columns={[{ field: 'title', header_fa: 'عنوان', header_en: 'Title', render: (_value, row) => setup.referenceLabel(row, language), searchAccessor: setup.referenceSearch }]}
            displayValue={headingMap.get(setup.typeKey(activeTab, newLine.type_id))?.title || ''}
            onChange={row => setNewLine(current => ({ ...current, type_id: row ? String(row.id).split(':').slice(1).join(':') : null }))} />
          <LOVField size="sm" formCode={formCode} isRtl={isRtl} label={t('منبع تأمین', 'Funding Source')} data={(context?.sources || []).filter(row => row.is_active)}
            columns={[{ field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان', header_en: 'Title', render: (_value, row) => setup.referenceLabel(row, language), searchAccessor: setup.referenceSearch }]}
            displayValue={sourceMap.get(String(newLine.funding_source_id))?.[isRtl ? 'title_fa' : 'title_en'] || ''}
            onChange={row => setNewLine(current => ({ ...current, funding_source_id: row?.id || null }))} />
          <SelectField size="sm" formCode={formCode} isRtl={isRtl} label={t('نوع تسهیم', 'Allocation Method')} value={newLine.cadence || chosenCadence}
            disabled={!!context?.cadenceByType[activeTab] || visibleRows.length > 0}
            options={[{ value: 'MONTHLY', label: t('ماهانه', 'Monthly') }, { value: 'QUARTERLY', label: t('فصلی', 'Quarterly') }]}
            onChange={event => setNewLine(current => ({ ...current, cadence: event.target.value }))} />
          <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setAddTarget(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="primary" onClick={addNew}>{t('افزودن', 'Add')}</Button></div>
        </div>
      </Modal>
      <Modal isOpen={!!statusTarget} onClose={() => !saving && setStatusTarget(null)} title={t('تأیید تغییر وضعیت', 'Confirm Status Change')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={statusLabel(statusTarget)} description={statusTarget === 'APPROVED'
          ? t('پس از تأیید، متمم قفل و در بودجه دوره‌های مربوط اعمال می‌شود. ادامه می‌دهید؟', 'Approval locks the amendment and includes it in the affected budget buckets. Continue?')
          : t('وضعیت متمم تغییر کند؟', 'Change amendment status?')} action={<div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={saving} onClick={() => setStatusTarget(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="primary" isLoading={saving} onClick={changeStatus}>{t('تأیید', 'Confirm')}</Button>
          </div>} />
      </Modal>
      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title={t('حذف ردیف از متمم', 'Remove Amendment Line')} language={language} width="max-w-sm">
        <EmptyState title={t('ردیف از متمم حذف شود؟', 'Remove this line from the amendment?')} action={<div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setRemoveTarget(null)}>{t('انصراف', 'Cancel')}</Button>
          <Button size="sm" variant="danger" onClick={() => { if (!writable || savingRef.current) return; setRows(current => current.filter(row => row.id !== removeTarget.id)); setRemoveTarget(null); setDirty(true); }}>{t('حذف', 'Delete')}</Button>
        </div>} />
      </Modal>
      <Modal isOpen={!!deleteTarget} onClose={() => !saving && setDeleteTarget(null)} title={t('حذف متمم', 'Delete Amendment')} language={language} width="max-w-sm">
        <EmptyState title={t('متمم یادداشت حذف شود؟', 'Delete this draft amendment?')} description={deleteTarget?.code} action={<div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={saving} onClick={() => setDeleteTarget(null)}>{t('انصراف', 'Cancel')}</Button>
          <Button size="sm" variant="danger" isLoading={saving} onClick={removeDocument}>{t('حذف', 'Delete')}</Button>
        </div>} />
      </Modal>
      <Modal isOpen={exitConfirm} onClose={() => setExitConfirm(false)} title={t('تغییرات ذخیره‌نشده', 'Unsaved Changes')} language={language} width="max-w-sm">
        <EmptyState title={t('بدون ذخیره خارج شوید؟', 'Leave without saving?')} action={<div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setExitConfirm(false)}>{t('ادامه ویرایش', 'Continue Editing')}</Button>
          <Button size="sm" variant="danger" onClick={back}>{t('خروج بدون ذخیره', 'Leave Without Saving')}</Button>
        </div>} />
      </Modal>
      <Modal isOpen={!!pendingPlan} onClose={() => setPendingPlan(null)} title={t('تغییر بودجه مرجع', 'Change Reference Budget')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={t('ردیف‌های واردشده پاک شوند؟', 'Discard the entered lines?')}
          description={t('با تغییر بودجه مرجع، ردیف‌ها و تغییرات دوره‌های این متمم پاک می‌شوند.', 'Changing the reference budget clears the lines and bucket changes in this amendment.')}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPendingPlan(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="danger" onClick={() => { const plan = pendingPlan.plan; setPendingPlan(null); choosePlan(plan, true); }}>{t('تغییر بودجه', 'Change Budget')}</Button>
          </div>} />
      </Modal>
      {summaryTarget && <AmendmentSummary target={summaryTarget} language={language} formCode={formCode}
        client={client} access={access} scope={scope} onClose={() => setSummaryTarget(null)} />}
      {commentTarget && window.DSComments?.CommentModal && <window.DSComments.CommentModal isOpen
        onClose={() => setCommentTarget(null)} entityType="fm_budget_setup_amendments" entityId={String(commentTarget.id)}
        entityTitle={`${commentTarget.code || ''} | ${commentTarget.title || ''}`} language={language}
        formTitle={t('متمم بودجه', 'Budget Amendment')} formComponent="BudgetAmendment" />}
      {Attachments && attachmentTarget && <Attachments key={attachmentTarget.id} entityType="BUDGET_AMENDMENT"
        recordTable="fm_budget_setup_amendments" recordId={attachmentTarget.id} recordTitle={`${attachmentTarget.code} - ${attachmentTarget.title}`}
        storageFolder="budget-amendments" auditEntityType="متمم بودجه" formCode={formCode} language={language}
        recordColumns="id,status,created_by" authorizeRecord={authorizeAttachment}
        onClose={() => setAttachmentTarget(null)} onNotify={showToast} />}
      <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
    </div>;
  };
  const AmendmentSummary = ({ target, language, formCode, client, access, scope, onClose }) => {
    const { Button, Badge, Skeleton, EmptyState } = window.DSCore;
    const { SelectField } = window.DSForms;
    const { DataGrid } = window.DSGrid;
    const { Modal } = window.DSFeedback;
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [snapshot, setSnapshot] = useState(target.snapshot || null);
    const [error, setError] = useState(null);
    const [reload, setReload] = useState(0);
    const [groupBy, setGroupBy] = useState('center');
    useEffect(() => {
      let cancelled = false;
      setError(null);
      setSnapshot(target.snapshot || null);
      const apply = loaded => {
        if (cancelled) return;
        setSnapshot(loaded);
      };
      if (target.snapshot) apply(target.snapshot);
      else logic.loadDocument(client, target.record.id, access, scope, language).then(apply)
        .catch(failure => { if (!cancelled) setError(failure.message); });
      return () => { cancelled = true; };
    }, [target, reload, language]);
    const result = useMemo(() => {
      if (!snapshot) return null;
      try { return logic.summarize(snapshot.context, snapshot.lines, snapshot.doc.id, null, null, groupBy); }
      catch (failure) { return { error: failure.message }; }
    }, [snapshot, groupBy]);
    const money = value => value == null ? '—' : math.format(value, snapshot.context.precision);
    const references = snapshot ? groupBy === 'type' ? snapshot.context.headings
      : groupBy === 'center' ? snapshot.context.centers : snapshot.context.sources : [];
    const referenceMap = new Map(references.map(row => [String(row.id), row]));
    const columns = [
      { field: 'referenceId', header_fa: groupBy === 'type' ? 'نوع درآمد / هزینه' : groupBy === 'center' ? 'مرکز درآمد / هزینه' : 'منبع تأمین',
        header_en: groupBy === 'type' ? 'Income / Cost Type' : groupBy === 'center' ? 'Income / Cost Center' : 'Funding Source', width: '230px',
        render: value => value == null ? t('بدون منبع', 'No Source') : setup.referenceLabel(referenceMap.get(String(value)), language) },
      { field: 'heading_type', header_fa: 'نوع', header_en: 'Type', width: '90px',
        render: value => <Badge variant={value === 'COST' ? 'blue' : 'emerald'}>{value === 'COST' ? t('هزینه', 'Cost') : t('درآمد', 'Income')}</Badge> },
      { field: 'before', header_fa: 'بودجه اولیه', header_en: 'Initial Budget', width: '140px', render: value => <span dir="ltr">{money(value)}</span> },
      { field: 'delta', header_fa: 'خالص متمم', header_en: 'Net Amendment', width: '140px', render: value =>
        <span dir="ltr" className={value > 0n ? 'text-emerald-700 dark:text-emerald-400' : value < 0n ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}>{money(value)}</span> },
      { field: 'after', header_fa: 'بودجه نهایی', header_en: 'Final Budget', width: '140px', render: value => <span dir="ltr" className="text-blue-600 dark:text-blue-400">{money(value)}</span> },
      ...(result?.slots || []).map((slot, index) => ({ field: `slot_${index}`, header_fa: slot.labelFa || slot.label,
        header_en: slot.labelEn || slot.label, width: '130px', render: (_value, row) => <span dir="ltr">{money(row.values[index])}</span> }))
    ];
    return <Modal isOpen onClose={onClose} title={t('تجمیع متمم بودجه', 'Budget Amendment Summary')} language={language} width="max-w-5xl">
      <div className="p-4 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {(snapshot?.doc || target.record)?.code} - {(snapshot?.doc || target.record)?.title} {snapshot && `(${snapshot.context.currency.code})`}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <SelectField size="sm" wrapperClassName="w-full sm:w-48" isRtl={isRtl} label={t('مبنای تجمیع', 'Group By')} value={groupBy}
              options={[{ value: 'center', label: t('مرکز هزینه و درآمد', 'Cost and Income Center') }, { value: 'type', label: t('نوع هزینه / درآمد', 'Cost / Income Type') },
                { value: 'source', label: t('منبع تأمین اعتبار', 'Funding Source') }]} onChange={event => setGroupBy(event.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={target.dirty ? 'orange' : 'slate'}>{target.dirty ? t('پیش‌نمایش مقادیر فرم؛ شامل تغییرات ثبت‌نشده', 'Form preview; includes unsaved changes')
            : target.snapshot ? t('مقادیر فعلی فرم', 'Current form values') : t('مقادیر ثبت‌شده', 'Saved amounts')}</Badge>
          <Badge variant="slate">{t('ستون‌های دوره: تغییر مبلغ متمم', 'Bucket columns: amendment changes')}</Badge>
        </div>
        <div className="h-[50vh] min-h-[300px]">
          {error || result?.error ? <EmptyState title={t('تجمیع انجام نشد', 'Summary Failed')} description={error || result.error}
            action={!target.snapshot && <Button size="sm" onClick={() => setReload(value => value + 1)}>{t('تلاش دوباره', 'Retry')}</Button>} />
            : !snapshot ? <div className="flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="12rem" /></div>
              : <DataGrid key={`${groupBy}-${language}`} data={result?.rows || []} columns={columns}
              language={language} formCode={formCode} hideToolbar hideImport hideExport defaultPinnedCols={['referenceId', 'heading_type']} />}
        </div>
        <div className="flex justify-end"><Button size="sm" variant="outline" onClick={onClose}>{t('بستن', 'Close')}</Button></div>
      </div>
    </Modal>;
  };
  BudgetAmendment.formCode = 'BUD_AMENDMENT';
  window.BudgetAmendment = BudgetAmendment;
})();
