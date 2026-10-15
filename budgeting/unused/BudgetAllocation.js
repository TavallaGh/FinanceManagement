/* Allocation of approved budget lines by fiscal month or quarter. */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { CalendarRange = FallbackIcon, ArrowRight = FallbackIcon, ArrowLeft = FallbackIcon,
    Save = FallbackIcon, Sparkles = FallbackIcon, AlertTriangle = FallbackIcon,
    RefreshCw = FallbackIcon, Sigma = FallbackIcon, FileText = FallbackIcon,
    CheckCircle = FallbackIcon } = window.LucideIcons || {};
  const logic = window.BudgetAllocationLogic;
  const pinnedAllocationColumns = ['budget_heading_id', 'budget_center_id', 'funding_source_id', 'amount', '_remaining'];

  const BudgetAllocation = ({ language = 'fa', formCode = 'BUD_ALLOCATION' }) => {
    const Empty = () => null;
    const { PageHeader = Empty, Button = Empty, Tabs = Empty, EmptyState = Empty,
      Skeleton = Empty, Badge = Empty } = window.DSCore || window.DesignSystem || {};
    const { DataGrid = Empty } = window.DSGrid || window.DesignSystem || {};
    const { SelectField = Empty, CurrencyField = Empty } = window.DSForms || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty } = window.DSFeedback || window.DesignSystem || {};
    const supabase = window.supabase;
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = securityCtx?.getActions(formCode) || { canView: false, canCreate: false, canEdit: false };
    const requestRef = useRef(0);
    const savingRef = useRef(false);
    const [plans, setPlans] = useState([]);
    const [years, setYears] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [selected, setSelected] = useState(null);
    const canWrite = (access.canCreate || access.canEdit) && selected?.is_active === true &&
      ['TEMPORARY', 'FINAL'].includes(selected?.status);
    const [lines, setLines] = useState([]);
    const [headings, setHeadings] = useState([]);
    const [centers, setCenters] = useState([]);
    const [sources, setSources] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [methods, setMethods] = useState({ INCOME: 'QUARTERLY', COST: 'QUARTERLY' });
    const [savedMethods, setSavedMethods] = useState({});
    const [amounts, setAmounts] = useState({});
    const [savedAmounts, setSavedAmounts] = useState({});
    const [savedRows, setSavedRows] = useState([]);
    const [activeTab, setActiveTab] = useState('INCOME');
    const [methodChange, setMethodChange] = useState(null);
    const [exitConfirm, setExitConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [summaryTarget, setSummaryTarget] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(value => ({ ...value, isVisible: false })), 4000);
    }, []);
    const loadAll = useCallback(async (table, columns, configure = query => query, orderFields = ['id']) => {
      const result = [];
      for (let from = 0; ; from += 500) {
        let query = configure(supabase.from(table).select(columns));
        orderFields.forEach(field => { query = query.order(field, { ascending: true }); });
        query = query.range(from, from + 499);
        const { data, error } = await query;
        if (error) throw error;
        result.push(...(data || []));
        if (!data || data.length < 500) return result;
      }
    }, [supabase]);
    const loadPlans = useCallback(async () => {
      if (!access.canView) return;
      const request = ++requestRef.current;
      setLoading(true);
      setLoadError(false);
      try {
        if (!supabase) throw new Error(t('اتصال داده در دسترس نیست', 'Data connection is unavailable'));
        const [planRows, yearRows, currencyRows] = await Promise.all([
          loadAll('fm_budget_plans', 'id,code,title,plan_kind,period_type,quarter,fiscal_year_id,start_date,end_date,base_currency_id,status,is_active',
            query => query.in('status', ['TEMPORARY', 'FINAL', 'APPROVED']).eq('is_active', true)),
          loadAll('fm_fiscal_years', 'id,year_code,calendar_type,start_date,end_date'),
          loadAll('fm_currencies', 'id,code,decimal_places')
        ]);
        if (request !== requestRef.current) return;
        setPlans(planRows);
        setYears(yearRows);
        setCurrencies(currencyRows);
      } catch (error) {
        if (request === requestRef.current) {
          setLoadError(true);
          showToast(error?.message || t('دریافت بودجه‌ها ناموفق بود', 'Could not load budgets'), 'error');
        }
      } finally { if (request === requestRef.current) setLoading(false); }
    }, [access.canView, supabase, loadAll, showToast, t]);
    useEffect(() => {
      loadPlans();
      return () => { requestRef.current += 1; };
    }, [loadPlans]);
    const loadDetails = useCallback(async plan => {
      const request = ++requestRef.current;
      setSelected(plan);
      setAmounts({});
      setSavedAmounts({});
      setSavedMethods({});
      setLoading(true);
      setLoadError(false);
      try {
        const planResult = await supabase.from('fm_budget_plans')
          .select('id,code,title,period_type,quarter,fiscal_year_id,start_date,end_date,base_currency_id,status,is_active')
          .eq('id', plan.id).single();
        if (planResult.error) throw planResult.error;
        if (request !== requestRef.current) return;
        plan = planResult.data;
        const [lineRows, headingRows, centerRows, sourceRows, periodRows,
          methodRows, allocationRows] = await Promise.all([
          loadAll('fm_budget_plan_lines', 'id,plan_id,budget_center_id,budget_heading_id,funding_source_id,amount,is_active',
            query => query.eq('plan_id', plan.id)),
          loadAll('fm_budget_headings', 'id,code,title_fa,title_en,heading_type'),
          loadAll('fm_budget_centers', 'id,code,title_fa,title_en'),
          loadAll('fm_funding_sources', 'id,code,title_fa,title_en'),
          loadAll('fm_fiscal_periods', 'id,fiscal_year_id,period_code,title,start_date,end_date,sort_order,is_active',
            query => plan.period_type === 'CUSTOM'
              ? query.lte('start_date', logic.normalizeDate(plan.end_date))
                .gte('end_date', logic.normalizeDate(plan.start_date))
              : query.eq('fiscal_year_id', plan.fiscal_year_id)),
          loadAll('fm_budget_allocation_methods', 'plan_id,heading_type,cadence',
            query => query.eq('plan_id', plan.id), ['plan_id', 'heading_type']),
          loadAll('fm_budget_allocations', 'line_id,slot_no,amount,period_start_id,period_end_id',
            query => query.eq('plan_id', plan.id), ['line_id', 'slot_no'])
        ]);
        if (request !== requestRef.current) return;
        if (!['TEMPORARY', 'FINAL', 'APPROVED'].includes(planResult.data.status) || !planResult.data.is_active)
          throw new Error(t('این بودجه دیگر در وضعیت مجاز و فعال نیست', 'This budget is no longer active in an eligible status'));
        const nextMethods = { INCOME: 'QUARTERLY', COST: 'QUARTERLY' };
        methodRows.forEach(row => { nextMethods[row.heading_type] = row.cadence; });
        const headingTypes = new Map(headingRows.map(row => [String(row.id), row.heading_type]));
        const lineTypes = new Map(lineRows.map(row => [String(row.id), headingTypes.get(String(row.budget_heading_id))]));
        const activeLineIds = new Set(lineRows.filter(row => row.is_active !== false).map(row => String(row.id)));
        const nextAmounts = {};
        const slotsByType = Object.fromEntries(['INCOME', 'COST'].map(type =>
          [type, logic.slots(periodRows, plan, nextMethods[type], years)]));
        allocationRows.forEach(row => {
          const key = String(row.line_id);
          if (!activeLineIds.has(key)) return;
          const type = lineTypes.get(key);
          const expected = slotsByType[type]?.[row.slot_no - 1];
          if (!expected || String(expected.periodIds[0]) !== String(row.period_start_id) ||
            String(expected.periodIds[expected.periodIds.length - 1]) !== String(row.period_end_id))
            throw new Error(t('دوره‌های مالی از زمان ثبت تسهیم تغییر کرده‌اند؛ بررسی پایگاه داده لازم است',
              'Fiscal periods changed after allocation was saved; database review is required'));
          if (!nextAmounts[key]) nextAmounts[key] = [];
          nextAmounts[key][row.slot_no - 1] = String(row.amount);
        });
        setSelected(planResult.data);
        setLines(lineRows.filter(row => row.is_active !== false));
        setHeadings(headingRows);
        setCenters(centerRows);
        setSources(sourceRows);
        setPeriods(periodRows);
        setMethods(nextMethods);
        setSavedMethods(Object.fromEntries(methodRows.map(row => [row.heading_type, row.cadence])));
        setAmounts(nextAmounts);
        setSavedAmounts(nextAmounts);
        setSavedRows(allocationRows);
        setActiveTab(lineRows.some(row => row.is_active !== false && lineTypes.get(String(row.id)) === 'INCOME') ? 'INCOME' : 'COST');
      } catch (error) {
        if (request === requestRef.current) {
          setLoadError(true);
          showToast(error?.message || t('دریافت ردیف‌ها ناموفق بود', 'Could not load budget lines'), 'error');
        }
      } finally { if (request === requestRef.current) setLoading(false); }
    }, [supabase, loadAll, showToast, t, years]);
    const headingById = useMemo(() => new Map(headings.map(row => [String(row.id), row])), [headings]);
    const centerById = useMemo(() => new Map(centers.map(row => [String(row.id), row])), [centers]);
    const sourceById = useMemo(() => new Map(sources.map(row => [String(row.id), row])), [sources]);
    const currency = currencies.find(row => String(row.id) === String(selected?.base_currency_id));
    const precision = logic.precisionFor(currency?.decimal_places);
    const slots = selected && !loading && !loadError ? logic.slots(periods, selected, methods[activeTab], years) : [];
    const tabLines = lines.filter(row => headingById.get(String(row.budget_heading_id))?.heading_type === activeTab);
    const labelOf = row => row ? `${row.code || ''} ${isRtl ? row.title_fa || row.title || '' : row.title_en || row.title_fa || row.title || ''}`.trim() : '-';
    const dirty = Object.fromEntries(['INCOME', 'COST'].map(type => {
      const typeLines = lines.filter(row => headingById.get(String(row.budget_heading_id))?.heading_type === type);
      const amountsChanged = typeLines.some(row => {
        const current = amounts[String(row.id)] || [];
        const saved = savedAmounts[String(row.id)] || [];
        return Array.from({ length: Math.max(current.length, saved.length) }, (_, index) => index)
          .some(index => {
            const value = current[index] ?? '';
            const original = saved[index] ?? '';
            if (value === '' || original === '') return value !== original;
            const valueUnits = logic.units(value, precision);
            const originalUnits = logic.units(original, precision);
            return valueUnits == null || originalUnits == null
              ? String(value) !== String(original) : valueUnits !== originalUnits;
          });
      });
      return [type, amountsChanged || (!!savedMethods[type] && methods[type] !== savedMethods[type])];
    }));
    const changeAmount = (lineId, index, value) => {
      if (!canWrite || saving) return;
      setAmounts(current => {
        const key = String(lineId);
        const next = (current[key] || []).slice();
        next[index] = value;
        return { ...current, [key]: next };
      });
    };
    const applyEqual = rows => {
      if (!canWrite || saving || !slots.length) return;
      setAmounts(current => {
        const next = { ...current };
        rows.forEach(row => { next[String(row.id)] = logic.equal(row.amount, slots.length, precision); });
        return next;
      });
    };
    const changeMethod = cadence => {
      if (!canWrite || saving || !['MONTHLY', 'QUARTERLY'].includes(cadence)) return;
      if (cadence === methods[activeTab]) return;
      if (tabLines.some(row => (amounts[String(row.id)] || []).some(value => value !== '' && value != null))) {
        setMethodChange(cadence);
        return;
      }
      setMethods(current => ({ ...current, [activeTab]: cadence }));
    };
    const confirmMethod = () => {
      if (!canWrite || saving) return;
      setMethods(current => ({ ...current, [activeTab]: methodChange }));
      setAmounts(current => {
        const next = { ...current };
        tabLines.forEach(row => { delete next[String(row.id)]; });
        return next;
      });
      setMethodChange(null);
    };
    const save = async () => {
      if (!selected || !canWrite || loading || savingRef.current || !tabLines.length) return;
      if (!slots.length) return showToast(t('دوره مالی معتبر برای این روش تسهیم یافت نشد', 'No valid fiscal periods for this allocation method'), 'error');
      for (const row of tabLines) {
        const values = Array.from({ length: slots.length }, (_, index) => (amounts[String(row.id)] || [])[index] || '0');
        const result = logic.balance(values, row.amount, precision);
        if (result.invalid || result.remaining !== 0n) {
          showToast(t('جمع تسهیم هر ردیف باید دقیقاً برابر مبلغ بودجه باشد', 'Every line must be allocated in full'), 'error');
          return;
        }
      }
      savingRef.current = true;
      setSaving(true);
      try {
        const result = await logic.saveAllocation({
          client: supabase, loadAll, plan: selected, headingType: activeTab,
          cadence: methods[activeTab], lines: tabLines, amounts, precision, displayedSlots: slots,
          savedRows, savedCadence: savedMethods[activeTab], canWrite, t
        });
        const writtenIds = new Set(tabLines.map(row => String(row.id)));
        setSavedRows(current => [...current.filter(row => !writtenIds.has(String(row.line_id))), ...result.rows]);
        setSavedMethods(current => ({ ...current, [activeTab]: methods[activeTab] }));
        setSavedAmounts(current => {
          const next = { ...current };
          tabLines.forEach(row => { next[String(row.id)] = (amounts[String(row.id)] || []).slice(); });
          return next;
        });
        showToast(result.auditError
          ? t('تسهیم ثبت شد، اما ثبت سابقه عملیات ناموفق بود.', 'Allocation saved, but the audit log could not be recorded.')
          : t('تسهیم بودجه ثبت شد', 'Budget allocation saved'), result.auditError ? 'warning' : 'success');
      } catch (error) {
        if (error.recoveryRequired) setLoadError(true);
        showToast(error?.message || t('ثبت تسهیم ناموفق بود', 'Could not save allocation'), 'error');
      } finally { savingRef.current = false; setSaving(false); }
    };
    const statusLabel = status => ({ TEMPORARY: t('موقت', 'Temporary'),
      FINAL: t('بررسی شده', 'Reviewed'), APPROVED: t('تأیید شده', 'Approved') }[status] || status);
    const transitionLabel = status => status === 'TEMPORARY' ? t('برگشت به موقت', 'Revert to Temporary')
      : t('تأیید بودجه', 'Approve Budget');
    const changeStatus = async () => {
      if (!selected || !access.canEdit || savingRef.current || loading || loadError ||
        dirty.INCOME || dirty.COST || !logic.transitions[selected.status]?.includes(statusTarget)) return;
      savingRef.current = true;
      setSaving(true);
      try {
        const result = await logic.changeStatus({ client: supabase, plan: selected,
          target: statusTarget, canEdit: access.canEdit, t });
        const next = { ...selected, status: statusTarget };
        setSelected(next);
        setPlans(current => current.map(row => row.id === next.id ? { ...row, status: next.status } : row));
        setStatusTarget(null);
        showToast(result.auditError
          ? t('وضعیت تغییر کرد، اما ثبت سابقه ناموفق بود.', 'Status changed, but the audit log failed.')
          : t('وضعیت بودجه تغییر کرد', 'Budget status updated'), result.auditError ? 'warning' : 'success');
      } catch (error) {
        showToast(error.message || t('تغییر وضعیت ناموفق بود', 'Could not change status'), 'error');
      } finally { savingRef.current = false; setSaving(false); }
    };
    const gridRows = tabLines.map(row => ({ ...row, key: String(row.id) }));
    const columns = [
      { field: 'budget_heading_id', header_fa: 'سرفصل', header_en: 'Heading', width: '220px',
        render: value => labelOf(headingById.get(String(value))) },
      { field: 'budget_center_id', header_fa: 'مرکز بودجه', header_en: 'Budget Center', width: '120px',
        render: value => value ? labelOf(centerById.get(String(value))) : '-' },
      { field: 'funding_source_id', header_fa: 'منبع تأمین', header_en: 'Funding Source', width: '120px',
        render: value => value ? labelOf(sourceById.get(String(value))) : '-' },
      { field: 'amount', header_fa: 'مبلغ بودجه', header_en: 'Budget Amount', width: '120px',
        render: value => <span dir="ltr">{logic.format(logic.units(value, precision) || 0n, precision)} {currency?.code || ''}</span> },
      { field: '_remaining', header_fa: 'مانده تسهیم‌نشده', header_en: 'Unallocated Balance', width: '135px',
        render: (_value, row) => {
          const values = Array.from({ length: slots.length }, (_, index) => (amounts[String(row.id)] || [])[index] || '0');
          const result = logic.balance(values, row.amount, precision);
          return <span dir="ltr" className={result.invalid || result.remaining < 0n
            ? 'font-bold text-red-600 dark:text-red-400' : result.remaining > 0n
              ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-bold text-emerald-700 dark:text-emerald-400'}>
            {result.invalid ? t('نامعتبر', 'Invalid') : logic.format(result.remaining, precision)}
          </span>;
        } },
      ...slots.map((slot, index) => ({ field: `slot_${index}`, width: '120px',
        header_fa: slot.labelFa || slot.label, header_en: slot.labelEn || slot.label,
        render: (_value, row) => <CurrencyField size="sm" isRtl={isRtl} formCode={formCode}
          aria-label={`${labelOf(headingById.get(String(row.budget_heading_id)))} - ${isRtl ? slot.labelFa || slot.label : slot.labelEn || slot.label}`}
          value={(amounts[String(row.id)] || [])[index] ?? ''}
          disabled={!canWrite || saving} onChange={value => changeAmount(row.id, index, value)} />
      })),
      { field: '_equal', header_fa: 'تسهیم', header_en: 'Split', width: '70px',
        render: (_value, row) => <Button size="sm" variant="outline" icon={Sparkles}
          title={t('تسهیم مساوی مبالغ برای این ردیف', 'Split amounts equally for this row')}
          aria-label={t('تسهیم مساوی مبالغ برای این ردیف', 'Split amounts equally for this row')}
          disabled={!canWrite || !slots.length || saving ||
            logic.isEquallyAllocated(amounts[String(row.id)], row.amount, slots.length, precision)}
          onClick={() => applyEqual([row])} /> }
    ];
    const allocationToolbar = <div className="flex flex-wrap items-center gap-2">
      <SelectField size="sm" wrapperClassName="w-56" labelPosition="inline" label={t('نوع تسهیم', 'Allocation Type')}
        isRtl={isRtl} formCode={formCode} value={methods[activeTab]}
        disabled={!canWrite || saving || !tabLines.length} options={[
          { value: 'MONTHLY', label: t('ماهانه', 'Monthly') },
          { value: 'QUARTERLY', label: t('فصلی', 'Quarterly') }
        ]} onChange={event => changeMethod(event.target.value)} />
      <Button size="sm" variant="outline" icon={Sparkles}
        disabled={!canWrite || !slots.length || !tabLines.length || saving}
        onClick={() => applyEqual(tabLines)}>{t('تسهیم مساوی همه ردیف‌ها', 'Split All Equally')}</Button>
    </div>;
    const leaveDetails = () => {
      if (saving) return;
      if (dirty.INCOME || dirty.COST) setExitConfirm(true);
      else {
        requestRef.current += 1;
        setSelected(null);
        setLoading(false);
        setLoadError(false);
      }
    };
    const openCurrentSummary = () => setSummaryTarget({ plan: selected, snapshot: {
      plan: selected, lines, headings, centers, sources, periods, years, methods, amounts, precision,
      currencyCode: currency?.code || '', hasDraft: dirty.INCOME || dirty.COST
    } });
    const Summary = window.BudgetAllocationSummary;
    if (!access.canView) return <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} />;
    return <div className={`${selected ? '' : 'p-4'} h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900 text-[12px] overflow-hidden`}
      dir={isRtl ? 'rtl' : 'ltr'}>
      {!selected ? <PageHeader title={t('تسهیم بودجه', 'Budget Allocation')} icon={CalendarRange} language={language}
        breadcrumbs={[{ label: t('بودجه‌ریزی', 'Budgeting') }, { label: t('تسهیم بودجه', 'Budget Allocation') }]} /> :
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between gap-3 shrink-0 shadow-sm z-30 relative">
          <div className="flex items-center gap-3 min-w-0">
            <Button size="sm" variant="ghost" icon={isRtl ? ArrowRight : ArrowLeft}
              disabled={saving} onClick={leaveDetails}>{t('بازگشت به لیست', 'Back to List')}</Button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />
            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate">
              {t('تسهیم بودجه', 'Budget Allocation')}: {selected.title}
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{logic.digits(selected.code)}</span>
            <Badge variant={{ TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }[selected.status]}>{statusLabel(selected.status)}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" icon={Sigma} disabled={loading || loadError || saving}
              onClick={openCurrentSummary}>{t('نمایش تجمیع', 'Summary')}</Button>
            <Button size="sm" variant="outline" disabled={saving} onClick={leaveDetails}>{t('انصراف', 'Cancel')}</Button>
            {canWrite && <Button size="sm" variant="primary" icon={Save} isLoading={saving}
              disabled={loading || loadError || !dirty[activeTab] || !slots.length || !tabLines.length}
              onClick={save}>{t('ثبت تسهیم', 'Save Allocation')}</Button>}
          </div>
        </div>}
      {!selected ? <div className="flex-1 min-h-0 mt-4 flex flex-col gap-2 overflow-hidden">
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? <div className="p-4"><Skeleton height="12rem" /></div> : loadError ?
            <EmptyState title={t('دریافت بودجه‌ها ناموفق بود', 'Could not load budgets')}
              action={<Button size="sm" icon={RefreshCw} onClick={loadPlans}>{t('تلاش دوباره', 'Retry')}</Button>} /> :
            <DataGrid data={plans} language={language} formCode={formCode}
              columns={[{ field: 'code', header_fa: 'کد', header_en: 'Code', width: '120px' },
                { field: 'title', header_fa: 'عنوان بودجه', header_en: 'Budget Title', width: '260px' },
                { field: 'fiscal_year_id', header_fa: 'سال مالی', header_en: 'Fiscal Year', width: '130px',
                  render: value => logic.digits(years.find(row => String(row.id) === String(value))?.year_code || '-') },
                { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '120px',
                  render: value => <Badge variant={{ TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }[value]}>{statusLabel(value)}</Badge> }]}
              hideImport hideExport onRowClick={loadDetails}
              actions={[{ id: 'allocate', icon: CalendarRange, tooltip: t('تسهیم', 'Allocate'),
                requiredAccess: 'view', onClick: loadDetails },
                { id: 'summary', icon: Sigma, tooltip: t('نمایش تجمیع تسهیم', 'Allocation Summary'),
                  requiredAccess: 'view', onClick: row => setSummaryTarget({ plan: row }) }]} />}
        </div>
      </div> : <div className="flex-1 min-h-0 p-4 flex flex-col overflow-hidden">
        {!loading && !loadError && <div className="shrink-0 flex flex-wrap items-center gap-2 mb-3">
          {selected.status === 'APPROVED' && <Badge variant="slate">{t('تأیید نهایی؛ فقط مشاهده', 'Approved; read only')}</Badge>}
          {access.canEdit && (logic.transitions[selected.status] || []).map(target =>
            <Button key={target} size="sm" variant="outline"
              icon={{ TEMPORARY: FileText, APPROVED: CheckCircle }[target]}
              disabled={saving || dirty.INCOME || dirty.COST} onClick={() => setStatusTarget(target)}>
              {transitionLabel(target)}
            </Button>)}
          {(dirty.INCOME || dirty.COST) && <span className="text-slate-500 dark:text-slate-400">
            {t('پیش از تغییر وضعیت، تسهیم هر دو بخش را ثبت کنید.', 'Save changes in both sections before changing status.')}
          </span>}
        </div>}
        {loading ? <Skeleton height="14rem" /> : loadError ?
          <EmptyState title={t('دریافت ردیف‌ها ناموفق بود', 'Could not load budget lines')}
            action={<Button size="sm" onClick={() => loadDetails(selected)}>{t('تلاش دوباره', 'Retry')}</Button>} /> : <>
            <Tabs className="shrink-0 !mb-0" tabs={[
              { id: 'INCOME', label: t('درآمد', 'Income'), disabled: saving },
              { id: 'COST', label: t('هزینه', 'Cost'), disabled: saving }
            ]} activeTab={activeTab} onChange={setActiveTab}
              trailingContent={dirty[activeTab]
                ? <Badge variant="orange">{t('تغییرات ثبت‌نشده', 'Unsaved Changes')}</Badge>
                : savedMethods[activeTab] ? <Badge variant="success">{t('ثبت‌شده', 'Saved')}</Badge> : null} />
            {(!tabLines.length || !slots.length) && <div className="shrink-0 p-1.5">{allocationToolbar}</div>}
            {!tabLines.length ? <EmptyState title={t('ردیفی برای تسهیم در این بخش وجود ندارد', 'No budget lines in this section')}
              description={t('بخش درآمد یا هزینه دیگر را بررسی کنید؛ ردیف‌ها از بودجه تأییدشده دریافت می‌شوند.',
                'Check the other tab. Lines are loaded from the approved budget.')} /> :
              !slots.length ? <EmptyState title={t('دوره مالی مناسب یافت نشد', 'No valid fiscal periods found')}
                description={t('هیچ دوره ماهانه‌ای با بازه این بودجه هم‌پوشانی ندارد. فصل‌ها به‌صورت خودکار از تاریخ دوره‌های ماهانه تعیین می‌شوند.',
                  'No monthly fiscal periods overlap this budget. Quarters are derived automatically from monthly period dates.')}
                action={<Button size="sm" variant="outline" icon={RefreshCw}
                  disabled={dirty.INCOME || dirty.COST} onClick={() => loadDetails(selected)}>{t('تلاش دوباره', 'Retry')}</Button>} /> :
              <div className="flex-1 min-h-0">
                <DataGrid key={`${selected.id}-${activeTab}-${methods[activeTab]}`} data={gridRows}
                  columns={columns} language={language} formCode={formCode} hideImport hideExport
                  defaultPinnedCols={pinnedAllocationColumns} toolbarContent={allocationToolbar} />
              </div>}
          </>}
      </div>}
      <Modal isOpen={!!statusTarget} onClose={() => !saving && setStatusTarget(null)}
        title={t('تأیید تغییر وضعیت', 'Confirm Status Change')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={statusLabel(statusTarget)}
          description={statusTarget === 'APPROVED'
            ? t('پس از تأیید، مبالغ و نوع تسهیم قابل تغییر نیستند. ادامه می‌دهید؟', 'Approval locks allocation amounts and type. Continue?')
            : t('وضعیت بودجه تغییر کند؟', 'Change budget status?')}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={saving} onClick={() => setStatusTarget(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="primary" isLoading={saving} onClick={changeStatus}>{t('تأیید', 'Confirm')}</Button>
          </div>} />
      </Modal>
      <Modal isOpen={!!methodChange} onClose={() => setMethodChange(null)}
        title={t('تغییر نوع تسهیم', 'Change Allocation Type')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={t('مبالغ این بخش پاک می‌شوند', 'Amounts in this section will be cleared')}
          description={t('با تغییر نوع تسهیم، مبالغ قبلی این بخش باید دوباره وارد شوند.',
            'Changing the allocation type requires reentering the amounts in this section.')}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setMethodChange(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="primary" onClick={confirmMethod}>{t('تأیید', 'Confirm')}</Button>
          </div>} />
      </Modal>
      <Modal isOpen={exitConfirm} onClose={() => setExitConfirm(false)}
        title={t('بازگشت از تسهیم', 'Leave Allocation')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={t('تغییرات ثبت‌نشده دارید', 'You have unsaved changes')}
          description={t('با بازگشت، تغییرات ثبت‌نشده از بین می‌روند.', 'Leaving will discard unsaved changes.')}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setExitConfirm(false)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="danger" onClick={() => {
              requestRef.current += 1;
              setExitConfirm(false);
              setSelected(null);
              setLoading(false);
              setLoadError(false);
            }}>{t('بازگشت', 'Leave')}</Button>
          </div>} />
      </Modal>
      {Summary && summaryTarget && <Summary key={summaryTarget.plan.id} {...summaryTarget}
        language={language} formCode={formCode} loadAll={loadAll} onClose={() => setSummaryTarget(null)} />}
      <Toast {...toast} onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
    </div>;
  };
  window.BudgetAllocation = BudgetAllocation;
})();
