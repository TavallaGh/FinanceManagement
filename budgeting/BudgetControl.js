/* Filename: budgeting/BudgetControl.js */
/* Prototype reporting only; no budget or request writes. */
(() => {
  const setup = window.BudgetSetupLogic;
  const amendments = window.BudgetAmendmentLogic;
  const math = window.BudgetSetupAllocationLogic;
  const { readAll, byIds } = amendments;
  const fail = (fa, en, language) => { throw new Error(language === 'fa' ? fa : en); };
  const title = (row, language) => row && (language === 'fa' ? row.title_fa || row.title : row.title_en || row.title_fa || row.title) || '-';
  const identity = row => [row.cost_benefit_center_id ?? '', row.cost_type_id ?? '', row.income_type_id ?? ''].map(String).join('|');
  const assertAccess = (access, scope, language) => {
    if (!access?.canView) fail('دسترسی مشاهده ندارید.', 'View access denied.', language);
    // These tables have no branch key. Do not silently ignore a restricted branch scope.
    if (scope?.branches && !scope.branches.includes('*'))
      fail('نگاشت دامنه شعب به داده‌های بودجه تعریف نشده است؛ گزارش با این دسترسی قابل اجرا نیست.',
        'Branch scope has no verified budget mapping; this report cannot run with this scope.', language);
    if (scope?.own_data_only === true || scope?.own_data_only?.length)
      fail('دامنه داده شخصی برای بودجه فاقد ستون مالک است.', 'Budget data has no owner column for own-data scope.', language);
  };
  const loadIndex = async (client, access, scope, language) => {
    assertAccess(access, scope, language);
    const [plans, centers, headings] = await Promise.all([
      readAll(client, 'fm_budget_setup_plans', '*', query => query.eq('plan_kind', 'MAIN').eq('status', 'APPROVED')),
      readAll(client, 'fm_cost_benefit_centers', setup.centerColumns),
      setup.loadTypes((table, columns) => readAll(client, table, columns), language)
    ]);
    return { plans, centers, headings };
  };
  const fraction = value => {
    const clean = math.digits(value).trim();
    if (!/^\d+(\.\d+)?$/.test(clean)) return null;
    const parts = clean.split('.');
    const numerator = BigInt(parts.join(''));
    return numerator > 0n ? [numerator, 10n ** BigInt(parts[1]?.length || 0)] : null;
  };
  const convert = (value, currency, context, date, rates, language) => {
    const clean = math.digits(value).replaceAll(',', '').trim();
    if (!/^\d+(\.\d+)?$/.test(clean)) fail('مبلغ درخواست نامعتبر است.', 'Invalid request amount.', language);
    const decimals = clean.split('.')[1]?.replace(/0+$/, '').length || 0;
    const source = math.units(clean, decimals);
    if (!currency) fail('ارز درخواست مشخص نیست.', 'Request currency is missing.', language);
    if (currency === context.currency.code) {
      const units = math.units(clean, context.precision);
      if (units == null) fail('دقت مبلغ درخواست با ارز بودجه سازگار نیست.', 'Request precision differs from budget currency.', language);
      return { units, rateTrace: currency };
    }
    const latest = (from, to) => rates.find(row => row.base_currency === from && row.target_currency === to && math.normalizeDate(row.rate_date) <= date);
    const leg = (from, to) => {
      if (from === to) return { ratio: [1n, 1n], trace: from };
      const direct = latest(from, to);
      if (direct) return { ratio: fraction(direct.rate), trace: `${from} → ${to}: ${direct.rate} (${math.normalizeDate(direct.rate_date)})` };
      const inverse = latest(to, from);
      const ratio = inverse && fraction(inverse.rate);
      return ratio ? { ratio: [ratio[1], ratio[0]], trace: `${from} → ${to}: 1/${inverse.rate} (${math.normalizeDate(inverse.rate_date)})` } : null;
    };
    let legs = [leg(currency, context.currency.code)];
    if (!legs[0]) legs = [leg(currency, 'USD'), leg('USD', context.currency.code)];
    if (legs.some(row => !row?.ratio)) fail('نرخ معتبر تا تاریخ نیاز موجود نیست.', 'No valid rate exists through the need date.', language);
    const numerator = legs.reduce((result, row) => result * row.ratio[0], source * 10n ** BigInt(context.precision));
    const denominator = legs.reduce((result, row) => result * row.ratio[1], 10n ** BigInt(decimals));
    return { units: (numerator + denominator / 2n) / denominator, rateTrace: legs.map(row => row.trace).join(' / ') };
  };
  const metrics = (original, effective, approved = 0n, pending = 0n) => ({
    original, amendment: effective - original, effective, approved, pending,
    available: effective - approved - pending, excess: approved + pending > effective ? approved + pending - effective : 0n
  });
  const matches = (line, filters) => {
    const selected = field => (filters[field] || []).map(row => String(row.id));
    const centers = selected('centers');
    const costs = selected('costs');
    const incomes = selected('incomes');
    return (!centers.length || centers.includes(String(line.cost_benefit_center_id))) &&
      ((!costs.length && !incomes.length) ||
        (line.cost_type_id != null && (!costs.length ? !incomes.length : costs.includes(setup.typeKey('COST', line.cost_type_id)))) ||
        (line.income_type_id != null && (!incomes.length ? !costs.length : incomes.includes(setup.typeKey('INCOME', line.income_type_id)))));
  };
  const summarize = (context, originals, requestItems, requests, candidates, rates, filters, language) => {
    const centerMap = new Map(context.centers.map(row => [String(row.id), row]));
    const headingMap = new Map(context.headings.map(row => [String(row.id), row]));
    const sourceMap = new Map(context.sources.map(row => [String(row.id), row]));
    const originalMap = new Map(originals.map(row => [`${row.line_id}:${row.slot_no}`, math.units(row.amount, context.precision)]));
    const rows = context.items.filter(line => matches(line, filters)).map(line => {
      const buckets = line.slots.map((slot, index) => {
        const original = line.origin === 'BASE' ? originalMap.get(`${line.id}:${index + 1}`) : 0n;
        if (original == null) fail('مبلغ اولیه بازه موجود نیست.', 'Original bucket amount is unavailable.', language);
        return { ...slot, key: `${line.cadence}:${slot.start}:${slot.end}`, ...metrics(original, line.values[index]), details: [] };
      });
      const type = amendments.typeOf(line);
      return { ...line, id: line.key, center: title(centerMap.get(String(line.cost_benefit_center_id)), language),
        heading: headingMap.get(setup.typeKey(type, line.cost_type_id ?? line.income_type_id))?.pathTitle || '-',
        source: title(sourceMap.get(String(line.funding_source_id)), language), type, buckets, details: [], incomplete: false };
    });
    const requestMap = new Map(requests.map(row => [String(row.id), row]));
    const issues = [];
    for (const item of requestItems) {
      const request = requestMap.get(String(item.request_id));
      if (!request) fail('سربرگ درخواست موجود نیست.', 'Request header is unavailable.', language);
      if (request.status === 'REJECTED') continue;
      const date = math.normalizeDate(request.need_date);
      const dimension = { cost_benefit_center_id: item.center_id,
        cost_type_id: item.transaction_group === 'COST' ? item.cost_type_id : null,
        income_type_id: item.transaction_group === 'INCOME' ? item.income_type_id : null };
      if (!matches(dimension, filters)) continue;
      const detail = { id: item.id, request_code: request.request_code, need_date: date, status: request.status,
        currency: item.currency, requested: item.transaction_action === 'WITHDRAWAL' ? item.withdrawal_amount : item.deposit_amount,
        center: title(centerMap.get(String(item.center_id)), language),
        heading: headingMap.get(setup.typeKey(item.transaction_group, item.cost_type_id ?? item.income_type_id))?.pathTitle || '-',
        approved_amount: item.approved_amount };
      const possible = candidates.filter(line => identity(line) === identity(dimension) && line.slots.some(slot => date >= slot.start && date <= slot.end));
      const affected = rows.filter(line => identity(line) === identity(dimension) && line.slots.some(slot => date >= slot.start && date <= slot.end));
      let reason = null;
      if (!['COST', 'INCOME'].includes(item.transaction_group) || !['DEPOSIT', 'WITHDRAWAL'].includes(item.transaction_action))
        reason = language === 'fa' ? 'گروه یا جهت مبلغ نامعتبر است' : 'Invalid group or amount direction';
      else if (possible.length !== 1) reason = possible.length ?
        (language === 'fa' ? 'تطبیق مبهم با چند ردیف یا بودجه' : 'Ambiguous budget or line match') :
        (language === 'fa' ? 'ردیف بودجه منطبق پیدا نشد' : 'No matching budget line');
      // A uniquely matched request belonging to another budget is outside this report.
      else if (String(possible[0].plan_id) !== String(context.plan.id)) continue;
      if (reason) {
        affected.forEach(row => { row.incomplete = true; });
        issues.push({ ...detail, reason });
        continue;
      }
      const row = affected[0];
      if (!row) continue;
      const buckets = row.buckets.filter(slot => date >= slot.start && date <= slot.end);
      if (buckets.length !== 1) fail('بازه‌های تسهیم هم‌پوشانی دارند.', 'Allocation buckets overlap.', language);
      try {
        const approvedStatuses = ['APPROVED', 'IN_PROGRESS', 'DONE', 'CLOSED'];
        const pendingStatuses = ['DRAFT', 'REGISTERED', 'REVIEWED'];
        if (![...approvedStatuses, ...pendingStatuses].includes(request.status))
          fail('وضعیت درخواست قابل محاسبه نیست.', 'Unknown request status.', language);
        const category = approvedStatuses.includes(request.status) ? 'approved' : 'pending';
        const charged = category === 'approved' ? item.approved_amount : detail.requested;
        const converted = convert(charged, item.currency, context, date, rates, language);
        const bucket = buckets[0];
        bucket[category] += converted.units;
        const record = { ...detail, converted: math.format(converted.units, context.precision), rateTrace: converted.rateTrace,
          bucket: language === 'fa' ? bucket.labelFa || bucket.label : bucket.labelEn || bucket.label };
        bucket.details.push(record);
        row.details.push(record);
      } catch (error) { row.incomplete = true; issues.push({ ...detail, reason: error.message }); }
    }
    for (const row of rows) {
      row.buckets = row.buckets.map(bucket => ({ ...bucket, ...metrics(bucket.original, bucket.effective, bucket.approved, bucket.pending) }));
      const sum = field => row.buckets.reduce((total, bucket) => total + bucket[field], 0n);
      row.total = metrics(sum('original'), sum('effective'), sum('approved'), sum('pending'));
    }
    return { context, rows, issues };
  };
  const loadReport = async (client, access, scope, filters, language) => {
    assertAccess(access, scope, language);
    if (!filters.plan?.id) fail('بودجه را انتخاب کنید.', 'Select a budget.', language);
    const context = await amendments.loadContext(client, filters.plan.id, language, { includeInactive: true });
    const slots = context.items.flatMap(row => row.slots);
    if (!slots.length) return { context, rows: [], issues: [] };
    const start = slots.reduce((date, slot) => date < slot.start ? date : slot.start, slots[0].start);
    const end = slots.reduce((date, slot) => date > slot.end ? date : slot.end, slots[0].end);
    const [originals, requests, plans, periods, years] = await Promise.all([
      readAll(client, 'fm_budget_setup_allocations', 'line_id,slot_no,amount', query => query.eq('plan_id', context.plan.id), ['line_id', 'slot_no']),
      readAll(client, 'req_requests', 'id,request_code,need_date,status', query => query.eq('request_type', 'BUDGET').neq('status', 'REJECTED').gte('need_date', start).lte('need_date', end)),
      readAll(client, 'fm_budget_setup_plans', '*', query => query.eq('plan_kind', 'MAIN').eq('status', 'APPROVED')),
      readAll(client, 'fm_fiscal_periods', 'id,fiscal_year_id,title,period_code,start_date,end_date', query => query.lte('start_date', end).gte('end_date', start)),
      readAll(client, 'fm_fiscal_years', 'id,calendar_type,start_date,end_date')
    ]);
    const otherPlans = plans.filter(plan => String(plan.id) !== String(context.plan.id) && math.slots(periods, plan, 'MONTHLY', years).length);
    const [baseLines, headers, requestItems] = await Promise.all([
      byIds(client, 'fm_budget_setup_lines', 'plan_id', otherPlans.map(row => row.id), setup.lineColumns),
      byIds(client, amendments.tables.headers, 'plan_id', otherPlans.map(row => row.id), 'id,plan_id,status'),
      byIds(client, 'req_request_items', 'request_id', requests.map(row => row.id),
        'id,request_id,currency,transaction_action,transaction_group,cost_type_id,income_type_id,center_id,deposit_amount,withdrawal_amount,approved_amount')
    ]);
    const approvedHeaders = headers.filter(row => row.status === 'APPROVED');
    const added = await byIds(client, amendments.tables.lines, 'amendment_id', approvedHeaders.map(row => row.id));
    const headerMap = new Map(approvedHeaders.map(row => [String(row.id), row]));
    const planMap = new Map(otherPlans.map(row => [String(row.id), row]));
    const otherLines = [...baseLines, ...added.filter(row => row.row_kind === 'NEW').map(row => ({ ...row, plan_id: headerMap.get(String(row.amendment_id)).plan_id }))];
    const candidates = [...context.items, ...otherLines.map(line => ({ ...line,
      slots: math.slots(periods, planMap.get(String(line.plan_id)), 'MONTHLY', years) }))];
    const requiresRates = requestItems.some(row => row.currency !== context.currency.code);
    const rates = requiresRates ? await readAll(client, 'fm_currency_rates', 'id,base_currency,target_currency,rate,rate_date',
      query => query.lte('rate_date', end), ['rate_date', 'id']) : [];
    rates.sort((a, b) => math.normalizeDate(b.rate_date).localeCompare(math.normalizeDate(a.rate_date)) || String(b.id).localeCompare(String(a.id)));
    return summarize(context, originals, requestItems, requests, candidates, rates, filters, language);
  };
  window.BudgetControlLogic = { loadIndex, loadReport, summarize, metrics, convert, matches, assertAccess };
})();

/* Budget control report view. */
(() => {
  const { useState, useEffect, useRef, useCallback, useMemo } = window.React;
  const logic = window.BudgetControlLogic;
  const setup = window.BudgetSetupLogic;
  const math = window.BudgetSetupAllocationLogic;
  const FallbackIcon = ({ size = 16 }) => <span style={{ display: 'inline-block', width: size, height: size }} />;
  const { ShieldCheck = FallbackIcon, RefreshCw = FallbackIcon, Eye = FallbackIcon } = window.LucideIcons || {};
  const metricLabels = [
    ['original', 'مصوب اولیه', 'Original'], ['amendment', 'خالص متمم', 'Net Amendment'],
    ['effective', 'کل مصوب', 'Effective Budget'], ['approved', 'درخواست تأییدشده', 'Approved Requests'],
    ['pending', 'درخواست در جریان', 'Pending Requests'], ['available', 'مانده', 'Remaining'],
    ['excess', 'مازاد بر مصوب', 'Over Budget']
  ];
  const BudgetControl = ({ language = 'fa', formCode = 'BUD_CONTROL' }) => {
    const { PageHeader, Button, Badge, EmptyState, Skeleton } = window.DSCore;
    const { DataGrid, AdvancedFilter } = window.DSGrid;
    const { Modal, Alert } = window.DSFeedback;
    const security = window.SecurityManager?.useSecurity?.();
    const access = security?.getActions(formCode) || { canView: false };
    const scope = security?.getDataScope(formCode) || {};
    const scopeKey = JSON.stringify(scope);
    const client = window.supabase;
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const [lookups, setLookups] = useState({ plans: [], centers: [], headings: [] });
    const [filters, setFilters] = useState({});
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [error, setError] = useState(null);
    const [detail, setDetail] = useState(null);
    const sequence = useRef(0);
    const lookupSequence = useRef(0);
    const applied = useRef({});
    const loadIndex = useCallback(async () => {
      const token = ++lookupSequence.current;
      ++sequence.current;
      setResult(null);
      setDetail(null);
      setLoading(false);
      setLookups({ plans: [], centers: [], headings: [] });
      if (!access.canView) return;
      setLookupLoading(true);
      setError(null);
      try {
        const data = await logic.loadIndex(client, access, scope, language);
        if (token === lookupSequence.current) setLookups(data);
      } catch (failure) { if (token === lookupSequence.current) setError(failure.message); }
      finally { if (token === lookupSequence.current) setLookupLoading(false); }
    }, [client, access.canView, scopeKey, language]);
    useEffect(() => {
      loadIndex();
      return () => { ++lookupSequence.current; ++sequence.current; };
    }, [loadIndex]);
    const search = async values => {
      const token = ++sequence.current;
      applied.current = values;
      setFilters(values);
      setResult(null);
      setDetail(null);
      setError(null);
      if (!values.plan?.id) { setLoading(false); return; }
      setLoading(true);
      try {
        const data = await logic.loadReport(client, access, scope, values, language);
        if (token === sequence.current) setResult(data);
      } catch (failure) { if (token === sequence.current) setError(failure.message); }
      finally { if (token === sequence.current) setLoading(false); }
    };
    const clear = () => {
      ++sequence.current;
      setFilters({});
      applied.current = {};
      setResult(null);
      setDetail(null);
      setError(null);
      setLoading(false);
    };
    const fields = [
      { name: 'plan', label: t('بودجه', 'Budget'), type: 'lov', required: true,
        lovData: lookups.plans, lovColumns: setup.referenceLovColumns(language) },
      { name: 'centers', label: t('مراکز هزینه / درآمد', 'Cost / Income Centers'), type: 'lov', multiple: true,
        lovData: lookups.centers, lovColumns: setup.centerLovColumns(language), dropdownWidth: 'min-w-[600px] max-w-[760px]' },
      ...['COST', 'INCOME'].map(type => ({ name: type === 'COST' ? 'costs' : 'incomes', type: 'lov', multiple: true,
        label: type === 'COST' ? t('نوع هزینه', 'Cost Type') : t('نوع درآمد', 'Income Type'),
        lovData: lookups.headings.filter(row => row.heading_type === type), lovColumns: setup.referenceLovColumns(language, true) }))
    ];
    const amount = value => <span dir="ltr" className={`block text-end tabular-nums ${value < 0n ? 'text-red-600 dark:text-red-400' : ''}`}>
      {math.format(value, result.context.precision)}
    </span>;
    const columns = useMemo(() => {
      if (!result) return [];
      const buckets = new Map();
      result.rows.forEach(row => row.buckets.forEach(bucket => {
        if (!buckets.has(bucket.key)) buckets.set(bucket.key, bucket);
      }));
      const groups = [...buckets.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
      const bucketColumn = (field, fa, en, bucketKey = null) => ({
        field, header_fa: fa, header_en: en, width: '250px',
        searchAccessor: (_value, row) => {
          const value = bucketKey ? row.buckets.find(bucket => bucket.key === bucketKey) : row.total;
          return value ? metricLabels.filter(([metric]) => !row.incomplete || ['original', 'amendment', 'effective'].includes(metric))
            .map(([metric]) => math.format(value[metric], result.context.precision).replaceAll(',', '')).join(' ') : '';
        },
        render: (_value, row) => {
          const value = bucketKey ? row.buckets.find(bucket => bucket.key === bucketKey) : row.total;
          if (!value) return <span className="text-slate-400">—</span>;
          return <div className="flex flex-col gap-0.5 leading-tight text-[11px]">
            {metricLabels.map(([metric, labelFa, labelEn]) => <div key={metric}
              className={`flex items-center justify-between gap-3 ${['effective', 'available'].includes(metric) ? 'font-bold' : ''}`}>
              <span className="text-slate-500 dark:text-slate-400 shrink-0">{t(labelFa, labelEn)}</span>
              {row.incomplete && ['approved', 'pending', 'available', 'excess'].includes(metric)
                ? <span className="text-slate-400">—</span> : amount(value[metric])}
            </div>)}
            {row.incomplete ? <Badge variant="orange">{t('ناقص؛ نیازمند بررسی', 'Incomplete; review needed')}</Badge> : !bucketKey &&
              <Badge variant={row.total.excess > 0n ? row.is_variable_budget ? 'orange' : 'red' : 'emerald'}>
                {row.total.excess > 0n ? row.is_variable_budget ? t('مازاد بودجه متغیر', 'Variable budget excess')
                  : t('تجاوز از سقف بودجه ثابت', 'Fixed budget limit exceeded') : t('در محدوده مصوب', 'Within budget')}
              </Badge>}
          </div>;
        }
      });
      return [
        { field: 'center', header_fa: 'مرکز هزینه / درآمد', header_en: 'Cost / Income Center', width: '210px' },
        { field: 'type', header_fa: 'گروه', header_en: 'Group', width: '90px',
          render: value => <Badge variant={value === 'COST' ? 'orange' : 'emerald'}>{value === 'COST' ? t('هزینه', 'Cost') : t('درآمد', 'Income')}</Badge> },
        { field: 'heading', header_fa: 'نوع هزینه / درآمد', header_en: 'Cost / Income Type', width: '250px' },
        { field: 'source', header_fa: 'منبع تأمین', header_en: 'Funding Source', width: '180px' },
        { field: 'is_variable_budget', header_fa: 'نوع بودجه', header_en: 'Budget Type', width: '110px',
          render: value => <Badge variant={value ? 'blue' : 'slate'}>{value ? t('متغیر', 'Variable') : t('ثابت', 'Fixed')}</Badge> },
        ...groups.map((bucket, index) => bucketColumn(`bucket${index}`, bucket.labelFa || bucket.label, bucket.labelEn || bucket.label, bucket.key)),
        bucketColumn('total_available', 'جمع کل ردیف', 'Line Total')
      ];
    }, [result, language]);
    const gridRows = useMemo(() => {
      if (!result) return [];
      const slots = new Map();
      result.rows.forEach(row => row.buckets.forEach(bucket => slots.set(bucket.key, bucket)));
      const ordered = [...slots.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
      return result.rows.map(row => {
        const values = { ...row };
        ordered.forEach((slot, index) => {
          const bucket = row.buckets.find(item => item.key === slot.key);
          values[`bucket${index}`] = row.incomplete ? null : bucket?.available ?? null;
        });
        values.total_available = row.incomplete ? null : row.total.available;
        return values;
      });
    }, [result]);
    const detailColumns = [
      { field: 'request_code', header_fa: 'کد درخواست', header_en: 'Request Code', width: '140px' },
      { field: 'need_date', header_fa: 'تاریخ نیاز', header_en: 'Need Date', type: 'date', width: '130px' },
      { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '120px', render: value => ({
        DRAFT: t('یادداشت', 'Draft'), REGISTERED: t('ثبت‌شده', 'Registered'), REVIEWED: t('بررسی‌شده', 'Reviewed'),
        APPROVED: t('تأییدشده', 'Approved'), IN_PROGRESS: t('در حال انجام', 'In Progress'), DONE: t('انجام‌شده', 'Done'), CLOSED: t('بسته‌شده', 'Closed')
      }[value] || value) },
      { field: 'bucket', header_fa: 'بازه', header_en: 'Bucket', width: '150px' },
      { field: 'currency', header_fa: 'ارز درخواست', header_en: 'Request Currency', width: '110px' },
      { field: 'requested', header_fa: 'مبلغ درخواست', header_en: 'Requested Amount', width: '140px' },
      { field: 'approved_amount', header_fa: 'مبلغ تأییدشده درخواست', header_en: 'Request Approved Amount', width: '170px' },
      { field: 'converted', header_fa: 'مبلغ منظورشده در بودجه', header_en: 'Amount Charged to Budget', width: '170px' },
      { field: 'rateTrace', header_fa: 'نرخ و تاریخ تبدیل', header_en: 'Conversion Rate and Date', width: '340px' }
    ];
    if (!access.canView) return <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} />;
    return <div dir={isRtl ? 'rtl' : 'ltr'} className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900 text-[12px] overflow-hidden">
      <PageHeader title={t('کنترل بودجه', 'Budget Control')} icon={ShieldCheck} language={language}
        breadcrumbs={[{ label: t('بودجه‌ریزی', 'Budgeting') }, { label: t('کنترل بودجه', 'Budget Control') }]} />
      <div className="mt-4 flex-1 min-h-0 flex flex-col gap-2">
        <AdvancedFilter fields={fields} language={language} initialValues={filters} defaultOpen
          gridClassName="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3" searchDisabled={lookupLoading}
          onSearch={search} onClear={clear} />
        {result && <Alert type="info" title={`${result.context.plan.code} · ${result.context.plan.title} · ${result.context.currency.code}`}
          message={t('مانده = کل مصوب − درخواست تأییدشده − در جریان. ردشده حذف است؛ بسته‌شده با مبلغ تأییدشده لحاظ می‌شود. جمع نهایی ردیف مستقل از مازاد هر بازه است. برای جزئیات روی ردیف کلیک کنید.',
            'Remaining = effective budget − approved − pending. Rejected requests are excluded; closed requests use their approved amount. Line totals net all buckets. Click a row for details.')} />}
        {result?.issues.length > 0 && <div className="flex items-center gap-2">
          <div className="flex-1"><Alert type="warning" title={t('تطبیق گزارش کامل نیست', 'Report matching is incomplete')}
            message={t(`${result.issues.length} قلم نیازمند بررسی است؛ مانده ردیف‌های مرتبط قطعی نمایش داده نمی‌شود.`,
              `${result.issues.length} items need review; affected balances are not shown as final.`)} /></div>
          <Button size="sm" variant="outline" icon={Eye} onClick={() => setDetail({ issues: true })}>{t('بررسی موارد', 'Review Items')}</Button>
        </div>}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading || lookupLoading ? <div className="p-4"><Skeleton height="12rem" /></div> : error ?
            <EmptyState title={error} action={<Button size="sm" onClick={() => applied.current.plan ? search(applied.current) : loadIndex()}>{t('تلاش دوباره', 'Retry')}</Button>} /> : !result ?
              <EmptyState title={t('بودجه را انتخاب و جستجو کنید', 'Select a budget and search')} /> :
              <DataGrid key={`${result.context.plan.id}-${scopeKey}-${language}-${JSON.stringify(filters)}`} data={gridRows} columns={columns}
                language={language} formCode={formCode} hideImport hideExport defaultPinnedCols={['center', 'heading']}
                onRowClick={row => setDetail({ row })}
                toolbarContent={<Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => search(applied.current)}>{t('بازخوانی', 'Refresh')}</Button>} />}
        </div>
      </div>
      {detail && result && <Modal isOpen language={language} width="max-w-7xl" onClose={() => setDetail(null)}
        title={detail.issues ? t('اقلام نیازمند بررسی', 'Items Requiring Review') : `${detail.row.center} · ${detail.row.heading}`}>
        <div className="h-[65vh] min-h-[300px]">
          <DataGrid data={detail.issues ? result.issues : detail.row.details} language={language} formCode={formCode} hideImport hideExport
            columns={detail.issues ? [
              ...detailColumns.filter(column => !['bucket', 'converted', 'rateTrace'].includes(column.field)),
              { field: 'center', header_fa: 'مرکز', header_en: 'Center', width: '180px' },
              { field: 'heading', header_fa: 'نوع هزینه / درآمد', header_en: 'Cost / Income Type', width: '220px' },
              { field: 'reason', header_fa: 'علت', header_en: 'Reason', width: '350px' }
            ] : detailColumns} />
        </div>
      </Modal>}
    </div>;
  };
  BudgetControl.formCode = 'BUD_CONTROL';
  window.BudgetControl = BudgetControl;
})();
