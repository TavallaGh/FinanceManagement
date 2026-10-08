/* Read-only allocation summary, shared by the list and allocation editor. */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useRef } = React;
  const logic = window.BudgetAllocationLogic;
  const BudgetAllocationSummary = ({ plan, snapshot, language = 'fa', formCode, loadAll, onClose }) => {
    const { Button, Badge, Skeleton, EmptyState } = window.DSCore;
    const { SelectField } = window.DSForms;
    const { DataGrid } = window.DSGrid;
    const { Modal } = window.DSFeedback;
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const security = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const canView = security?.getActions(formCode)?.canView === true;
    const [groupBy, setGroupBy] = useState('CENTER');
    const [cadence, setCadence] = useState('MONTHLY');
    const [data, setData] = useState(snapshot || null);
    const [loading, setLoading] = useState(!snapshot);
    const [error, setError] = useState(null);
    const [reload, setReload] = useState(0);
    const requestRef = useRef(0);
    useEffect(() => {
      const request = ++requestRef.current;
      if (!canView) return;
      if (snapshot) {
        setData(snapshot);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const byIds = async (table, columns, ids) => {
        const unique = [...new Set(ids.filter(id => id != null).map(String))];
        const rows = [];
        for (let i = 0; i < unique.length; i += 100)
          rows.push(...await loadAll(table, columns, q => q.in('id', unique.slice(i, i + 100))));
        return rows;
      };
      const load = async () => {
        try {
          const result = await window.supabase.from('fm_budget_plans')
            .select('id,code,title,status,is_active,period_type,quarter,fiscal_year_id,start_date,end_date,base_currency_id')
            .eq('id', plan.id).single();
          if (result.error) throw result.error;
          const current = result.data;
          if (!current || !['TEMPORARY', 'FINAL', 'APPROVED'].includes(current.status) || !current.is_active)
            throw new Error('Budget is no longer active in an eligible status');
          const [lines, periods, methodRows, allocations, currencies] = await Promise.all([
            loadAll('fm_budget_plan_lines', 'id,budget_heading_id,budget_center_id,funding_source_id,amount,is_active',
              q => q.eq('plan_id', plan.id)),
            loadAll('fm_fiscal_periods', 'id,fiscal_year_id,title,period_code,start_date,end_date', q =>
              current.period_type === 'CUSTOM'
                ? q.lte('start_date', logic.normalizeDate(current.end_date)).gte('end_date', logic.normalizeDate(current.start_date))
                : q.eq('fiscal_year_id', current.fiscal_year_id)),
            loadAll('fm_budget_allocation_methods', 'plan_id,heading_type,cadence',
              q => q.eq('plan_id', plan.id), ['plan_id', 'heading_type']),
            loadAll('fm_budget_allocations', 'line_id,slot_no,amount,period_start_id,period_end_id',
              q => q.eq('plan_id', plan.id), ['line_id', 'slot_no']),
            byIds('fm_currencies', 'id,code,decimal_places', [current.base_currency_id])
          ]);
          if (request !== requestRef.current) return;
          const active = lines.filter(row => row.is_active !== false);
          const [headings, centers, sources, years] = await Promise.all([
            byIds('fm_budget_headings', 'id,code,title_fa,title_en,heading_type', active.map(row => row.budget_heading_id)),
            byIds('fm_budget_centers', 'id,code,title_fa,title_en', active.map(row => row.budget_center_id)),
            byIds('fm_funding_sources', 'id,code,title_fa,title_en', active.map(row => row.funding_source_id)),
            byIds('fm_fiscal_years', 'id,calendar_type,start_date,end_date', [current.fiscal_year_id, ...periods.map(row => row.fiscal_year_id)])
          ]);
          if (request !== requestRef.current) return;
          if (currencies.length !== 1) throw new Error('Budget currency is unavailable');
          const methods = Object.fromEntries(methodRows.map(row => [row.heading_type, row.cadence]));
          const types = new Map(headings.map(row => [String(row.id), row.heading_type]));
          const activeById = new Map(active.map(row => [String(row.id), row]));
          const sourceSlots = Object.fromEntries(['INCOME', 'COST'].map(type =>
            [type, logic.slots(periods, current, methods[type] || 'MONTHLY', years)]));
          const amounts = {};
          allocations.forEach(row => {
            const line = activeById.get(String(row.line_id));
            if (!line) return;
            const type = types.get(String(line.budget_heading_id));
            const slot = sourceSlots[type]?.[row.slot_no - 1];
            if (!methods[type] || !slot || String(slot.periodIds[0]) !== String(row.period_start_id) ||
              String(slot.periodIds[slot.periodIds.length - 1]) !== String(row.period_end_id))
              throw new Error('Saved allocation periods do not match the budget');
            if (!amounts[String(row.line_id)]) amounts[String(row.line_id)] = [];
            amounts[String(row.line_id)][row.slot_no - 1] = String(row.amount);
          });
          setData({ plan: current, lines: active, headings, centers, sources, periods, years, methods, amounts,
            precision: logic.precisionFor(currencies[0].decimal_places), currencyCode: currencies[0].code });
        } catch (failure) {
          if (request === requestRef.current) setError(failure.message || String(failure));
        } finally { if (request === requestRef.current) setLoading(false); }
      };
      load();
      return () => { requestRef.current += 1; };
    }, [plan.id, snapshot, reload, loadAll, canView]);
    const summary = useMemo(() => {
      if (!data) return null;
      try { return logic.summarize({ ...data, groupBy, cadence }); }
      catch (failure) { return { error: failure.message }; }
    }, [data, groupBy, cadence]);
    const amountCell = value => value == null
      ? <span title={t('تسهیم کامل نشده است', 'Allocation is incomplete')}>—</span>
      : <span dir="ltr">{value}</span>;
    const columns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
      { field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان', header_en: 'Title', width: '240px' },
      { field: 'heading_type', header_fa: 'نوع', header_en: 'Type', width: '90px',
        render: value => <Badge variant={value === 'INCOME' ? 'emerald' : 'orange'}>{value === 'INCOME' ? t('درآمد', 'Income') : t('هزینه', 'Cost')}</Badge> },
      { field: 'budget', header_fa: 'مبلغ بودجه', header_en: 'Budget Amount', width: '120px', render: amountCell },
      { field: 'remaining', header_fa: 'مانده', header_en: 'Remaining', width: '120px',
        render: value => value == null ? amountCell(value) : <span dir="ltr" className={String(value).startsWith('-')
          ? 'font-bold text-red-600 dark:text-red-400' : logic.units(value, data.precision) > 0n
            ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-bold text-emerald-700 dark:text-emerald-400'}>{value}</span> },
      ...(summary?.slots || []).map((slot, i) => ({ field: `slot_${i}`, width: '120px',
        header_fa: slot.labelFa || slot.label, header_en: slot.labelEn || slot.label, render: amountCell })),
      { field: 'allocated', header_fa: 'جمع تسهیم', header_en: 'Allocated Total', width: '130px', render: amountCell }
    ];
    return <Modal isOpen onClose={onClose} title={t('اطلاعات تجمیعی تسهیم بودجه', 'Budget Allocation Summary')}
      language={language} width="max-w-5xl">
      <div className="p-4 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {logic.digits(plan.code)} - {plan.title} {data?.currencyCode && `(${data.currencyCode})`}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <SelectField size="sm" wrapperClassName="w-full sm:w-48" isRtl={isRtl}
              label={t('مبنای تجمیع', 'Group By')} value={groupBy} options={[
                { value: 'CENTER', label: t('مرکز بودجه', 'Budget Center') },
                { value: 'HEADING', label: t('سرفصل بودجه', 'Budget Heading') },
                { value: 'SOURCE', label: t('منبع تأمین اعتبار', 'Funding Source') }
              ]} onChange={event => setGroupBy(event.target.value)} />
            <SelectField size="sm" wrapperClassName="w-full sm:w-36" isRtl={isRtl}
              label={t('دوره نمایش', 'Display Period')} value={cadence} options={[
                { value: 'MONTHLY', label: t('ماهانه', 'Monthly') },
                { value: 'QUARTERLY', label: t('فصلی', 'Quarterly') }
              ]} onChange={event => setCadence(event.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={snapshot?.hasDraft ? 'orange' : 'slate'}>{snapshot?.hasDraft
            ? t('پیش‌نمایش مقادیر فرم؛ شامل تغییرات ثبت‌نشده', 'Form preview; includes unsaved changes')
            : snapshot ? t('مقادیر فعلی فرم', 'Current form values') : t('مقادیر ثبت‌شده', 'Saved amounts')}</Badge>
          {summary?.estimated && <Badge variant="blue">{t('ماه‌های تسهیم فصلی: تقسیم مساوی با حفظ جمع', 'Quarterly amounts split equally across months; totals preserved')}</Badge>}
          {summary?.rows?.some(row => row.incomplete) && <Badge variant="orange">{t('— یعنی تسهیم ناقص؛ صفر نیست', '— means incomplete allocation, not zero')}</Badge>}
        </div>
        <div className="h-[50vh] min-h-[300px]">
          {!canView ? <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} /> : loading
            ? <div className="flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="12rem" /></div>
            : error || summary?.error ? <EmptyState title={t('دریافت تجمیع انجام نشد', 'Failed to load summary')}
                description={error || summary.error}
                action={!snapshot && <Button size="sm" onClick={() => setReload(value => value + 1)}>{t('تلاش دوباره', 'Retry')}</Button>} />
            : <DataGrid key={`${groupBy}-${cadence}-${language}`} data={summary?.rows || []} columns={columns}
                language={language} formCode={formCode} hideToolbar hideImport hideExport
                defaultPinnedCols={['code', isRtl ? 'title_fa' : 'title_en', 'heading_type']} />}
        </div>
        <div className="flex justify-end"><Button size="sm" variant="outline" onClick={onClose}>{t('بستن', 'Close')}</Button></div>
      </div>
    </Modal>;
  };
  window.BudgetAllocationSummary = BudgetAllocationSummary;
})();
