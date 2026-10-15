/* Filename: budgeting/BudgetSetupAllocation.js */

/* Budget allocation arithmetic and fiscal-period mapping. */
(() => {
  const setup = window.BudgetSetupLogic;
  const { digits, precisionFor, units, format, normalizeDate, slots, balance, equal,
    isEquallyAllocated } = window.BudgetAllocationLogic;

  const allocationColumns = 'plan_id,line_id,slot_no,amount,period_start_id,period_end_id';
  const allocationSignature = rows => JSON.stringify(rows.map(row => [String(row.line_id), Number(row.slot_no),
    String(units(row.amount, 6)), String(row.period_start_id), String(row.period_end_id)])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]));

  // Prototype persistence only. Separate REST writes are not a database transaction.
  const saveAllocation = async ({ client, loadAll, plan, headingType, cadence, lines, amounts,
    precision, displayedSlots, savedRows, savedCadence, canWrite, t }) => {
    if (!canWrite) throw new Error(t('دسترسی ثبت ندارید', 'Write access denied'));
    if (!['INCOME', 'COST'].includes(headingType) || !['MONTHLY', 'QUARTERLY'].includes(cadence))
      throw new Error(t('نوع تسهیم نامعتبر است', 'Invalid allocation type'));
    const conflict = () => new Error(t('اطلاعات بودجه یا تسهیم تغییر کرده است؛ پیش از ثبت بازخوانی کنید.',
      'Budget or allocation data changed; reload before saving.'));
    const check = result => { if (result.error) throw result.error; return result.data; };
    const freshPlan = check(await client.from('fm_budget_setup_plans')
      .select('id,status,is_active,period_type,quarter,fiscal_year_id,start_date,end_date,base_currency_id')
      .eq('id', plan.id).single());
    if (!freshPlan || !['TEMPORARY', 'FINAL'].includes(freshPlan.status) || freshPlan.is_active !== true)
      throw new Error(t('تسهیم فقط برای بودجه فعالِ موقت یا بررسی‌شده قابل ثبت است؛ بودجه تأییدشده قفل است.',
        'Only active temporary or reviewed budgets can be allocated; approved budgets are locked.'));
    if (freshPlan.status !== plan.status) throw conflict();
    if (['period_type', 'quarter', 'fiscal_year_id', 'start_date', 'end_date', 'base_currency_id']
      .some(field => String(freshPlan[field] ?? '') !== String(plan[field] ?? ''))) throw conflict();
    const [rawLines, headings, periods, years, currencies, methods, existing] = await Promise.all([
      loadAll('fm_budget_setup_lines', setup.lineColumns, q => q.eq('plan_id', plan.id)),
      setup.loadTypes(loadAll, 'fa'),
      loadAll('fm_fiscal_periods', 'id,fiscal_year_id,period_code,title,start_date,end_date', q =>
        plan.period_type === 'CUSTOM'
          ? q.lte('start_date', normalizeDate(plan.end_date)).gte('end_date', normalizeDate(plan.start_date))
          : q.eq('fiscal_year_id', plan.fiscal_year_id)),
      loadAll('fm_fiscal_years', 'id,calendar_type,start_date,end_date'),
      loadAll('fm_currencies', 'id,decimal_places', q => q.eq('id', plan.base_currency_id)),
      loadAll('fm_budget_setup_allocation_methods', 'plan_id,heading_type,cadence',
        q => q.eq('plan_id', plan.id).eq('heading_type', headingType), ['plan_id', 'heading_type']),
      loadAll('fm_budget_setup_allocations', allocationColumns, q => q.eq('plan_id', plan.id), ['line_id', 'slot_no'])
    ]);
    const freshLines = rawLines.map(setup.fromLine);
    const types = new Map(headings.map(row => [String(row.id), row.heading_type]));
    const eligible = freshLines.filter(row => row.is_active !== false && types.get(String(row.item_id)) === headingType);
    const lineById = new Map(lines.map(row => [String(row.id), row]));
    if (!eligible.length || eligible.length !== lines.length || eligible.some(row => {
      const original = lineById.get(String(row.id));
      return !original || String(row.item_id) !== String(original.item_id) ||
        String(row.cost_benefit_center_id) !== String(original.cost_benefit_center_id) ||
        String(row.funding_source_id ?? '') !== String(original.funding_source_id ?? '') ||
        units(row.amount, precision) !== units(original.amount, precision);
    })) throw conflict();
    if (currencies.length !== 1 || precisionFor(currencies[0].decimal_places) !== precision) throw conflict();
    const currentSlots = slots(periods, freshPlan, cadence, years);
    const slotSignature = rows => JSON.stringify(rows.map(row => [row.periodIds.map(String), row.start, row.end]));
    if (!currentSlots.length || currentSlots.length > 24)
      throw new Error(t('تعداد دوره‌های تسهیم باید بین ۱ و ۲۴ باشد', 'Allocation must contain between 1 and 24 periods'));
    if (slotSignature(currentSlots) !== slotSignature(displayedSlots)) throw conflict();
    const ids = eligible.map(row => String(row.id));
    const idSet = new Set(ids);
    const previous = existing.filter(row => idSet.has(String(row.line_id)));
    if (allocationSignature(previous) !== allocationSignature(savedRows.filter(row => idSet.has(String(row.line_id)))) ||
      (methods[0]?.cadence || null) !== (savedCadence || null)) throw conflict();
    const rows = [];
    eligible.forEach(line => {
      const values = currentSlots.map((slot, index) => units(line.amount, precision) === 0n ? undefined : amounts[String(line.id)]?.[index]);
      const result = balance(values, line.amount, precision);
      if (result.invalid)
        throw new Error(t('مبلغ بودجه یا تسهیم ردیف نامعتبر است', 'A budget or allocation amount is invalid'));
      currentSlots.forEach((slot, index) => {
        if (values[index] == null || values[index] === '') return;
        const amount = units(values[index], precision);
        if (amount >= 100000000000000n * (10n ** BigInt(precision)))
          throw new Error(t('مبلغ از ظرفیت ذخیره‌سازی بیشتر است', 'Amount exceeds storage precision'));
        rows.push({ plan_id: plan.id, line_id: line.id, slot_no: index + 1,
          amount: format(amount, precision).replaceAll(',', ''),
          period_start_id: String(slot.periodIds[0]), period_end_id: String(slot.periodIds[slot.periodIds.length - 1]) });
      });
    });
    const scope = query => query.eq('plan_id', plan.id).in('line_id', ids);
    const readRows = () => loadAll('fm_budget_setup_allocations', allocationColumns,
      q => scope(q), ['line_id', 'slot_no']);
    const readMethods = () => loadAll('fm_budget_setup_allocation_methods', 'plan_id,heading_type,cadence',
      q => q.eq('plan_id', plan.id).eq('heading_type', headingType), ['plan_id', 'heading_type']);
    const rowKeys = new Set(rows.map(row => `${row.line_id}:${row.slot_no}`));
    let intermediate = [...rows, ...previous.filter(row => !rowKeys.has(`${row.line_id}:${row.slot_no}`))];
    const recoveryStates = [previous, rows, intermediate];
    let attempted = false;
    let writeTarget = 'fm_budget_setup_allocations / UPSERT';
    try {
      attempted = true;
      if (rows.length) check(await client.from('fm_budget_setup_allocations').upsert(rows, { onConflict: 'line_id,slot_no' }));
      writeTarget = 'fm_budget_setup_allocations / DELETE';
      for (const id of ids) {
        const keptSlots = rows.filter(row => String(row.line_id) === id).map(row => row.slot_no);
        let query = client.from('fm_budget_setup_allocations').delete().eq('plan_id', plan.id).eq('line_id', id);
        if (keptSlots.length) query = query.not('slot_no', 'in', `(${keptSlots.join(',')})`);
        intermediate = intermediate.filter(row => String(row.line_id) !== id || keptSlots.includes(row.slot_no));
        recoveryStates.push(intermediate);
        check(await query);
      }
      writeTarget = 'fm_budget_setup_allocation_methods / UPSERT';
      check(await client.from('fm_budget_setup_allocation_methods').upsert([
        { plan_id: plan.id, heading_type: headingType, cadence }
      ], { onConflict: 'plan_id,heading_type' }));
      const [written, writtenMethods] = await Promise.all([readRows(), readMethods()]);
      if (allocationSignature(written) !== allocationSignature(rows) || writtenMethods[0]?.cadence !== cadence)
        throw conflict();
    } catch (error) {
      if (attempted) {
        try {
          const [current, currentMethods] = await Promise.all([readRows(), readMethods()]);
          const signature = allocationSignature(current);
          if (!recoveryStates.some(state => allocationSignature(state) === signature) ||
            ![savedCadence || null, cadence].includes(currentMethods[0]?.cadence || null)) throw conflict();
          if (signature !== allocationSignature(previous)) {
            if (previous.length) check(await client.from('fm_budget_setup_allocations')
              .upsert(previous, { onConflict: 'line_id,slot_no' }));
            const oldKeys = new Set(previous.map(row => `${row.line_id}:${row.slot_no}`));
            for (const row of rows.filter(row => !oldKeys.has(`${row.line_id}:${row.slot_no}`))) {
              check(await client.from('fm_budget_setup_allocations').delete().eq('plan_id', plan.id)
                .eq('line_id', row.line_id).eq('slot_no', row.slot_no));
            }
          }
          if ((currentMethods[0]?.cadence || null) !== (savedCadence || null)) {
            if (methods.length) check(await client.from('fm_budget_setup_allocation_methods')
              .upsert(methods, { onConflict: 'plan_id,heading_type' }));
            else check(await client.from('fm_budget_setup_allocation_methods').delete()
              .eq('plan_id', plan.id).eq('heading_type', headingType));
          }
          const [restoredRows, restoredMethods] = await Promise.all([readRows(), readMethods()]);
          if (allocationSignature(restoredRows) !== allocationSignature(previous) ||
            (restoredMethods[0]?.cadence || null) !== (savedCadence || null)) throw conflict();
        } catch (restoreError) {
          const incomplete = new Error(t('ذخیره کامل نشد و بازگردانی تأیید نشد؛ اطلاعات را بازخوانی و بررسی کنید.',
            'Save was incomplete and restoration could not be confirmed; reload and review the data.'));
          incomplete.recoveryRequired = true;
          throw incomplete;
        }
      }
      if (error.code === '42501') {
        const denied = new Error(t('دیتابیس اجازه عملیات تسهیم را نداد؛ مجوز جدول و سیاست‌های RLS باید بررسی شوند.',
          'The database denied the allocation operation; check table privileges and RLS policies.') +
          ` [${writeTarget}; 42501] ${error.message || ''}`);
        denied.code = error.code;
        throw denied;
      }
      throw error;
    }
    let auditError = null;
    try {
      const log = await client.from('fm_record_logs').insert([{
        entity_type: 'تنظیم بودجه', record_id: String(plan.id), action: 'update',
        user_name: window.NavigationSystem?.currentUser?.name || 'system',
        details: `تسهیم بودجه: ${headingType} / ${cadence} / ${eligible.length} ردیف`
      }]);
      auditError = log.error;
    } catch (error) { auditError = error; }
    return { rows, auditError };
  };
  const summarize = ({ plan, lines, headings, centers, sources, periods, years, methods, amounts,
    precision, groupBy, cadence }) => {
    const field = { CENTER: 'cost_benefit_center_id', HEADING: 'item_id', SOURCE: 'funding_source_id' }[groupBy];
    if (!field) throw new Error('Invalid summary grouping');
    const headingMap = new Map(headings.map(row => [String(row.id), row]));
    const groupMap = new Map(({ CENTER: centers, HEADING: headings, SOURCE: sources }[groupBy])
      .map(row => [String(row.id), row]));
    const monthly = slots(periods, plan, 'MONTHLY', years);
    const targets = slots(periods, plan, cadence, years);
    const sourceSlots = Object.fromEntries(['INCOME', 'COST'].map(type =>
      [type, slots(periods, plan, methods[type] || 'MONTHLY', years)]));
    const groups = new Map();
    let estimated = false;
    for (const line of lines.filter(row => row.is_active !== false)) {
      const type = headingMap.get(String(line.item_id))?.heading_type;
      if (!sourceSlots[type]) throw new Error('Budget heading type is unavailable');
      const original = units(line.amount, precision);
      if (original == null) throw new Error('Invalid budget line amount');
      const groupId = line[field];
      const group = groupId == null && groupBy !== 'HEADING'
        ? { code: '-', title_fa: groupBy === 'CENTER' ? 'بدون مرکز هزینه و درآمد' : 'بدون منبع تأمین',
          title_en: groupBy === 'CENTER' ? 'No Cost and Income Center' : 'No Funding Source' }
        : groupMap.get(String(groupId));
      if (!group) throw new Error('Budget summary group is unavailable');
      const key = `${type}:${groupId ?? 'none'}`;
      if (!groups.has(key)) groups.set(key, { id: key, code: group.code,
        title_fa: group.title_fa, title_en: group.title_en || group.title_fa, heading_type: type,
        budget: 0n, totals: targets.map(() => 0n), missing: targets.map(() => false) });
      const result = groups.get(key);
      result.budget += original;
      const byMonth = new Map(monthly.map(slot => [String(slot.periodIds[0]), null]));
      sourceSlots[type].forEach((slot, index) => {
        const raw = amounts[String(line.id)]?.[index];
        if (raw == null || raw === '') return;
        const value = units(raw, precision);
        if (value == null) throw new Error('Invalid allocation amount');
        const divided = equal(raw, slot.periodIds.length, precision);
        if (cadence === 'MONTHLY' && methods[type] === 'QUARTERLY') estimated = true;
        slot.periodIds.forEach((id, i) => byMonth.set(String(id), units(divided[i], precision)));
      });
      targets.forEach((slot, index) => slot.periodIds.forEach(id => {
        const value = byMonth.get(String(id));
        if (value == null) result.missing[index] = true;
        else result.totals[index] += value;
      }));
    }
    return { slots: targets, estimated, rows: [...groups.values()].map(row => {
      const incomplete = row.missing.some(Boolean) || !targets.length;
      const total = row.totals.reduce((a, b) => a + b, 0n);
      return { id: row.id, code: row.code, title_fa: row.title_fa, title_en: row.title_en,
        heading_type: row.heading_type, budget: format(row.budget, precision),
        allocated: incomplete ? null : format(total, precision),
        remaining: incomplete ? null : format(row.budget - total, precision), incomplete,
        ...Object.fromEntries(row.totals.map((amount, i) => [`slot_${i}`, row.missing[i] ? null : format(amount, precision)])) };
    }).sort((a, b) => String(a.code).localeCompare(String(b.code)) || a.heading_type.localeCompare(b.heading_type)) };
  };
  const validateForReview = async ({ client, plan, t }) => {
    const read = async (table, columns, configure = query => query, orderFields = ['id']) => {
      const rows = [];
      for (let from = 0; ; from += 500) {
        let query = configure(client.from(table).select(columns));
        orderFields.forEach(field => { query = query.order(field, { ascending: true }); });
        const result = await query.range(from, from + 499);
        if (result.error) throw result.error;
        rows.push(...(result.data || []));
        if (!result.data || result.data.length < 500) return rows;
      }
    };
    const record = await client.from('fm_budget_setup_plans').select('*').eq('id', plan.id).single();
    if (record.error) throw record.error;
    const current = record.data;
    if (!current?.is_active || current.status !== plan.status)
      throw new Error(t('وضعیت بودجه تغییر کرده یا بودجه غیرفعال است؛ بازخوانی کنید', 'Budget status changed or budget is inactive; reload'));
    const [rawLines, headings, periods, years, currencies, methods, allocations] = await Promise.all([
      read('fm_budget_setup_lines', setup.lineColumns, query => query.eq('plan_id', plan.id)),
      setup.loadTypes(read, 'fa'),
      read('fm_fiscal_periods', 'id,fiscal_year_id,title,period_code,start_date,end_date', query =>
        current.period_type === 'CUSTOM'
          ? query.lte('start_date', normalizeDate(current.end_date)).gte('end_date', normalizeDate(current.start_date))
          : query.eq('fiscal_year_id', current.fiscal_year_id)),
      read('fm_fiscal_years', 'id,calendar_type,start_date,end_date'),
      read('fm_currencies', 'id,decimal_places', query => query.eq('id', current.base_currency_id)),
      read('fm_budget_setup_allocation_methods', 'plan_id,heading_type,cadence',
        query => query.eq('plan_id', plan.id), ['plan_id', 'heading_type']),
      read('fm_budget_setup_allocations', allocationColumns,
        query => query.eq('plan_id', plan.id), ['line_id', 'slot_no'])
    ]);
    if (currencies.length !== 1) throw new Error(t('ارز بودجه در دسترس نیست', 'Budget currency is unavailable'));
    const precision = precisionFor(currencies[0].decimal_places);
    const lines = rawLines.map(setup.fromLine).filter(row => row.is_active !== false);
    if (!lines.length) throw new Error(t('دست‌کم یک ردیف فعال لازم است', 'At least one active line is required'));
    if (rawLines.some(row => units(row.amount, precision) === 0n))
      throw new Error(t('بودجه دارای ردیف با مبلغ صفر قابل تبدیل به «بررسی شده» نیست.', 'A budget with zero amount lines cannot be marked reviewed.'));
    const types = new Map(headings.map(row => [String(row.id), row.heading_type]));
    const cadenceByType = new Map(methods.map(row => [row.heading_type, row.cadence]));
    for (const line of lines) {
      const fail = (fa, en) => new Error(`${current.code}: ${t(fa, en)} (${t('ردیف', 'Line')} ${line.id})`);
      const type = types.get(String(line.item_id));
      const cadence = cadenceByType.get(type);
      const budget = units(line.amount, precision);
      if (!type || !line.cost_benefit_center_id || budget == null || budget <= 0n)
        throw fail('اطلاعات ردیف بودجه نامعتبر است', 'Budget line data is invalid');
      if (!['MONTHLY', 'QUARTERLY'].includes(cadence))
        throw fail('نوع تسهیم ثبت نشده است', 'Allocation method has not been saved');
      const expected = slots(periods, current, cadence, years);
      if (!expected.length || expected.length > 24)
        throw fail('دوره‌های تسهیم نامعتبر یا ناقص‌اند', 'Allocation periods are invalid or missing');
      const saved = allocations.filter(row => String(row.line_id) === String(line.id));
      if (saved.length !== expected.length)
        throw fail('اطلاعات تسهیم کامل نشده است', 'Allocation is incomplete');
      const bySlot = new Map(saved.map(row => [Number(row.slot_no), row]));
      let total = 0n;
      for (const [index, slot] of expected.entries()) {
        const row = bySlot.get(index + 1);
        const amount = row ? units(row.amount, precision) : null;
        if (amount == null || String(row.period_start_id) !== String(slot.periodIds[0]) ||
          String(row.period_end_id) !== String(slot.periodIds[slot.periodIds.length - 1]))
          throw fail('مبلغ یا دوره ثبت‌شده تسهیم نامعتبر است', 'A saved allocation amount or period is invalid');
        total += amount;
      }
      if (total !== budget)
        throw fail('جمع تسهیم ردیف با مبلغ بودجه برابر نیست؛ ردیف مانده دارد', 'Allocation total differs from budget; the line has a remaining balance');
    }
  };
  const transitions = { TEMPORARY: ['FINAL'], FINAL: ['TEMPORARY', 'APPROVED'], APPROVED: [] };
  const changeStatus = async ({ client, plan, plans = [plan], target, canEdit, t }) => {
    if (!canEdit || !plans.length || plans.some(row => !row?.is_active || !transitions[row.status]?.includes(target)))
      throw new Error(t('تغییر وضعیت مجاز نیست', 'Status transition is not allowed'));
    if (target === 'FINAL' || target === 'APPROVED') {
      for (const row of plans) await validateForReview({ client, plan: row, t });
    }
    if (target === 'TEMPORARY') for (const row of plans) await setup.validateTemporary({ client, plan: row, t });
    const metadata = window.BudgetSetupSupport.statusMetadata(target);
    const result = await client.from('fm_budget_setup_plans').update({ status: target, ...metadata })
      .in('id', plans.map(row => row.id)).eq('status', plans[0].status).eq('is_active', true).select(`id,${window.BudgetSetupSupport.statusFields}`);
    if (result.error) throw result.error;
    const changedIds = new Set((result.data || []).map(row => String(row.id)));
    const changed = plans.filter(row => changedIds.has(String(row.id)));
    let auditError = null;
    try {
      const log = changed.length ? await client.from('fm_record_logs').insert(changed.map(plan => ({
        entity_type: 'تنظیم بودجه', record_id: String(plan.id), action: 'update',
        user_name: window.NavigationSystem?.currentUser?.name || 'system',
        details: `تغییر وضعیت بودجه: ${plan.status} -> ${target}`
      }))) : {};
      auditError = log.error;
    } catch (error) { auditError = error; }
    return { auditError, changedIds, metadata, incomplete: changed.length !== plans.length };
  };
  window.BudgetSetupAllocationLogic = { digits, units, format, normalizeDate, slots, balance, equal, isEquallyAllocated,
    precisionFor, saveAllocation, summarize, validateForReview, transitions, changeStatus };
})();

/* Read-only allocation summary, shared by the list and allocation editor. */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useRef } = React;
  const logic = window.BudgetSetupAllocationLogic;
  const setup = window.BudgetSetupLogic;
  const BudgetSetupAllocationSummary = ({ plan, snapshot, language = 'fa', formCode, loadAll, onClose }) => {
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
          const result = await window.supabase.from('fm_budget_setup_plans')
            .select('id,code,title,status,is_active,period_type,quarter,fiscal_year_id,start_date,end_date,base_currency_id')
            .eq('id', plan.id).single();
          if (result.error) throw result.error;
          const current = result.data;
          if (!current || !['TEMPORARY', 'FINAL', 'APPROVED'].includes(current.status) || !current.is_active)
            throw new Error('Budget is no longer active in an eligible status');
          const [rawLines, periods, methodRows, allocations, currencies] = await Promise.all([
            loadAll('fm_budget_setup_lines', setup.lineColumns,
              q => q.eq('plan_id', plan.id)),
            loadAll('fm_fiscal_periods', 'id,fiscal_year_id,title,period_code,start_date,end_date', q =>
              current.period_type === 'CUSTOM'
                ? q.lte('start_date', logic.normalizeDate(current.end_date)).gte('end_date', logic.normalizeDate(current.start_date))
                : q.eq('fiscal_year_id', current.fiscal_year_id)),
            loadAll('fm_budget_setup_allocation_methods', 'plan_id,heading_type,cadence',
              q => q.eq('plan_id', plan.id), ['plan_id', 'heading_type']),
            loadAll('fm_budget_setup_allocations', 'line_id,slot_no,amount,period_start_id,period_end_id',
              q => q.eq('plan_id', plan.id), ['line_id', 'slot_no']),
            byIds('fm_currencies', 'id,code,decimal_places', [current.base_currency_id])
          ]);
          if (request !== requestRef.current) return;
          const lines = rawLines.map(setup.fromLine);
          const active = lines.filter(row => row.is_active !== false);
          const [headings, centers, sources, years] = await Promise.all([
            setup.loadTypes(loadAll, language),
            byIds('fm_cost_benefit_centers', 'id,code,title_fa,title_en', active.map(row => row.cost_benefit_center_id)),
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
            const type = types.get(String(line.item_id));
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
    }, [plan.id, snapshot, reload, loadAll, canView, language]);
    const summary = useMemo(() => {
      if (!data) return null;
      try { return logic.summarize({ ...data, groupBy, cadence }); }
      catch (failure) { return { error: failure.message }; }
    }, [data, groupBy, cadence]);
    const amountCell = value => value == null
      ? <span title={t('تسهیم کامل نشده است', 'Allocation is incomplete')}>—</span>
      : <span dir="ltr">{value}</span>;
    const columns = [
      { field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان', header_en: 'Title', width: '240px',
        render: (_value, row) => setup.referenceLabel(row, language) },
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
                { value: 'CENTER', label: t('مرکز هزینه و درآمد', 'Cost and Income Center') },
                { value: 'HEADING', label: t('نوع هزینه / درآمد', 'Cost / Income Type') },
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
  window.BudgetSetupAllocationSummary = BudgetSetupAllocationSummary;
})();

/* Allocation of BudgetSetup lines by fiscal month or quarter. */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { CalendarRange = FallbackIcon, ArrowRight = FallbackIcon, ArrowLeft = FallbackIcon,
    Save = FallbackIcon, Sparkles = FallbackIcon, AlertTriangle = FallbackIcon,
    RefreshCw = FallbackIcon, Sigma = FallbackIcon, FileText = FallbackIcon,
    CheckCircle = FallbackIcon, CheckSquare = FallbackIcon, Edit = FallbackIcon, MessageSquare = FallbackIcon } = window.LucideIcons || {};
  const logic = window.BudgetSetupAllocationLogic;
  const setup = window.BudgetSetupLogic;
  const pinnedAllocationColumns = ['item_id', 'cost_benefit_center_id', 'funding_source_id', 'amount', '_remaining'];

  const BudgetSetupAllocation = ({ language = 'fa', formCode = 'BUD_SETUP_ALLOCATION' }) => {
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
    const [selectedIds, setSelectedIds] = useState([]);
    const [statusPlanIds, setStatusPlanIds] = useState(null);
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
    const [commentPlan, setCommentPlan] = useState(null);
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
        const { planRows, yearRows, currencyRows } = await window.BudgetSetupSupport.loadAllocationPlans(loadAll, language);
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
    }, [access.canView, supabase, loadAll, showToast, t, language]);
    useEffect(() => {
      loadPlans();
      return () => { requestRef.current += 1; };
    }, [loadPlans]);
    const loadDetails = useCallback(async plan => {
      if (savingRef.current) return;
      const request = ++requestRef.current;
      setSelected(plan);
      setAmounts({});
      setSavedAmounts({});
      setSavedMethods({});
      setLoading(true);
      setLoadError(false);
      try {
        const planResult = await supabase.from('fm_budget_setup_plans')
          .select(`id,code,title,period_type,quarter,fiscal_year_id,start_date,end_date,base_currency_id,status,is_active,${window.BudgetSetupSupport.statusFields}`)
          .eq('id', plan.id).eq('plan_kind', 'MAIN').single();
        if (planResult.error) throw planResult.error;
        if (request !== requestRef.current) return;
        plan = planResult.data;
        const [rawLineRows, headingRows, centerRows, sourceRows, periodRows,
          methodRows, allocationRows] = await Promise.all([
          loadAll('fm_budget_setup_lines', setup.lineColumns,
            query => query.eq('plan_id', plan.id)),
          setup.loadTypes(loadAll, language),
          loadAll('fm_cost_benefit_centers', 'id,code,title_fa,title_en'),
          loadAll('fm_funding_sources', 'id,code,title_fa,title_en'),
          loadAll('fm_fiscal_periods', 'id,fiscal_year_id,period_code,title,start_date,end_date,sort_order,is_active',
            query => plan.period_type === 'CUSTOM'
              ? query.lte('start_date', logic.normalizeDate(plan.end_date))
                .gte('end_date', logic.normalizeDate(plan.start_date))
              : query.eq('fiscal_year_id', plan.fiscal_year_id)),
          loadAll('fm_budget_setup_allocation_methods', 'plan_id,heading_type,cadence',
            query => query.eq('plan_id', plan.id), ['plan_id', 'heading_type']),
          loadAll('fm_budget_setup_allocations', 'line_id,slot_no,amount,period_start_id,period_end_id',
            query => query.eq('plan_id', plan.id), ['line_id', 'slot_no'])
        ]);
        if (request !== requestRef.current) return;
        if (!['TEMPORARY', 'FINAL', 'APPROVED'].includes(planResult.data.status) || !planResult.data.is_active)
          throw new Error(t('این بودجه دیگر در وضعیت مجاز و فعال نیست', 'This budget is no longer active in an eligible status'));
        const lineRows = rawLineRows.map(setup.fromLine);
        const nextMethods = { INCOME: 'QUARTERLY', COST: 'QUARTERLY' };
        methodRows.forEach(row => { nextMethods[row.heading_type] = row.cadence; });
        const headingTypes = new Map(headingRows.map(row => [String(row.id), row.heading_type]));
        if (lineRows.some(row => row.is_active !== false && !headingTypes.has(String(row.item_id))))
          throw new Error(t('نوع هزینه یا درآمد یک ردیف در دسترس نیست', 'A line cost or income type is unavailable'));
        if (!currencies.some(row => String(row.id) === String(plan.base_currency_id)))
          throw new Error(t('ارز بودجه در دسترس نیست', 'Budget currency is unavailable'));
        const lineTypes = new Map(lineRows.map(row => [String(row.id), headingTypes.get(String(row.item_id))]));
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
    }, [supabase, loadAll, showToast, t, years, currencies, language]);
    const headingById = useMemo(() => new Map(headings.map(row => [String(row.id), row])), [headings]);
    const centerById = useMemo(() => new Map(centers.map(row => [String(row.id), row])), [centers]);
    const sourceById = useMemo(() => new Map(sources.map(row => [String(row.id), row])), [sources]);
    const currency = currencies.find(row => String(row.id) === String(selected?.base_currency_id));
    const precision = logic.precisionFor(currency?.decimal_places);
    const budgetTotals = useMemo(() => currency ? setup.totalsByType(lines,
      new Map(headings.map(row => [String(row.id), row.heading_type])), precision) : null, [lines, headings, currency, precision]);
    const slots = selected && !loading && !loadError ? logic.slots(periods, selected, methods[activeTab], years) : [];
    const tabLines = lines.filter(row => headingById.get(String(row.item_id))?.heading_type === activeTab);
    const labelOf = row => row ? (isRtl ? row.title_fa || row.title || '' : row.title_en || row.title_fa || row.title || '') : '-';
    const dirty = Object.fromEntries(['INCOME', 'COST'].map(type => {
      const typeLines = lines.filter(row => headingById.get(String(row.item_id))?.heading_type === type);
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
      if (!canWrite || saving || logic.units(lines.find(row => String(row.id) === String(lineId))?.amount, precision) === 0n) return;
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
        rows.filter(row => logic.units(row.amount, precision) > 0n).forEach(row => { next[String(row.id)] = logic.equal(row.amount, slots.length, precision); });
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
        if (logic.units(row.amount, precision) === 0n) continue;
        const values = Array.from({ length: slots.length }, (_, index) => (amounts[String(row.id)] || [])[index] || '0');
        const result = logic.balance(values, row.amount, precision);
        if (result.invalid) {
          showToast(t('مبلغ بودجه یا تسهیم ردیف نامعتبر است', 'A budget or allocation amount is invalid'), 'error');
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
      : status === 'FINAL' ? t('تبدیل به بررسی شده', 'Set Reviewed') : t('تأیید بودجه', 'Approve Budget');
    const changeStatus = async () => {
      if (!access.canEdit || savingRef.current || loading || loadError ||
        (selected && (dirty.INCOME || dirty.COST))) return;
      const candidates = statusPlanIds ? plans.filter(row => statusPlanIds.includes(row.id)) : [selected];
      const eligible = candidates.filter(row => row?.is_active && logic.transitions[row.status]?.includes(statusTarget));
      if (!eligible.length) return showToast(t('هیچ بودجه‌ای برای این تغییر وضعیت مجاز نیست', 'No eligible budgets for this transition'), 'warning');
      savingRef.current = true;
      setSaving(true);
      try {
        const result = await logic.changeStatus({ client: supabase, plans: eligible,
          target: statusTarget, canEdit: access.canEdit, t });
        if (selected && result.changedIds.has(String(selected.id))) setSelected({ ...selected, status: statusTarget, ...result.metadata });
        setPlans(current => current.map(row => result.changedIds.has(String(row.id)) ? { ...row, status: statusTarget, ...result.metadata } : row));
        setSelectedIds([]);
        setStatusTarget(null);
        if (result.incomplete) {
          showToast(t('وضعیت بعضی بودجه‌ها تغییر نکرد؛ فهرست را دوباره بررسی کنید.', 'Some budgets were not updated; review the refreshed list.'), 'warning');
          if (!selected) await loadPlans();
        } else showToast(result.auditError
          ? t('وضعیت تغییر کرد، اما ثبت سابقه ناموفق بود.', 'Status changed, but the audit log failed.')
          : t('وضعیت بودجه تغییر کرد', 'Budget status updated'), result.auditError ? 'warning' : 'success');
      } catch (error) {
        showToast(error.message || t('تغییر وضعیت ناموفق بود', 'Could not change status'), 'error');
      } finally { savingRef.current = false; setSaving(false); }
    };
    const gridRows = tabLines.map(row => ({ ...row, key: String(row.id) }));
    const columns = [
      { field: 'item_id', header_fa: activeTab === 'COST' ? 'نوع هزینه' : 'نوع درآمد',
        header_en: activeTab === 'COST' ? 'Cost Type' : 'Income Type', width: '220px',
        render: value => setup.referenceLabel(headingById.get(String(value)), language) },
      { field: 'cost_benefit_center_id', header_fa: 'مرکز هزینه و درآمد', header_en: 'Cost and Income Center', width: '120px',
        render: value => setup.referenceLabel(centerById.get(String(value)), language) },
      { field: 'funding_source_id', header_fa: 'منبع تأمین', header_en: 'Funding Source', width: '120px',
        render: value => setup.referenceLabel(sourceById.get(String(value)), language) },
      { field: 'amount', header_fa: 'مبلغ بودجه', header_en: 'Budget Amount', width: '120px',
        render: value => {
          const amount = logic.units(value, precision);
          return <span dir="ltr">{amount == null ? t('نامعتبر', 'Invalid')
            : logic.format(amount, precision)} {currency?.code || ''}
            {amount === 0n && <span className="block text-[10px] text-slate-400 dark:text-slate-500">{t('فقط مشاهده', 'Read only')}</span>}</span>;
        } },
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
          aria-label={`${labelOf(headingById.get(String(row.item_id)))} - ${isRtl ? slot.labelFa || slot.label : slot.labelEn || slot.label}`}
          value={logic.units(row.amount, precision) === 0n ? '0' : (amounts[String(row.id)] || [])[index] ?? ''}
          disabled={!canWrite || saving || logic.units(row.amount, precision) === 0n} onChange={value => changeAmount(row.id, index, value)} />
      })),
      { field: '_equal', header_fa: 'تسهیم', header_en: 'Split', width: '70px',
        render: (_value, row) => <Button size="sm" variant="outline" icon={Sparkles}
          title={t('تسهیم مساوی مبالغ برای این ردیف', 'Split amounts equally for this row')}
          aria-label={t('تسهیم مساوی مبالغ برای این ردیف', 'Split amounts equally for this row')}
          disabled={!canWrite || !slots.length || saving || logic.units(row.amount, precision) === 0n ||
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
    const Summary = window.BudgetSetupAllocationSummary;
    const Comments = window.BudgetSetupSupport.Comments;
    if (!access.canView) return <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} />;
    return <div className={`${selected ? '' : 'p-4'} h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900 text-[12px] overflow-hidden`}
      dir={isRtl ? 'rtl' : 'ltr'}>
      {!selected ? <PageHeader title={t('تسهیم تنظیم بودجه', 'Budget Setup Allocation')} icon={CalendarRange} language={language}
        breadcrumbs={[{ label: t('بودجه‌ریزی', 'Budgeting') }, { label: t('تسهیم تنظیم بودجه', 'Budget Setup Allocation') }]} /> :
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 shrink-0 shadow-sm z-30 relative">
          <div className="flex items-center gap-3 min-w-0">
            <Button size="sm" variant="ghost" icon={isRtl ? ArrowRight : ArrowLeft}
              disabled={saving} onClick={leaveDetails}>{t('بازگشت به لیست', 'Back to List')}</Button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />
            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate">
              {t('تسهیم تنظیم بودجه', 'Budget Setup Allocation')}: {selected.title}
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{logic.digits(selected.code)}</span>
            <Badge variant={{ TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }[selected.status]}>{statusLabel(selected.status)}</Badge>
          </div>
          <div className="min-w-0">{!loading && !loadError && <window.BudgetSetupSupport.BudgetTotals
            totals={budgetTotals} currencyCode={currency?.code} language={language} />}</div>
          <div className="flex items-center justify-end flex-wrap gap-1.5 justify-self-end">
            <Button size="sm" variant="ghost" icon={Sigma} disabled={loading || loadError || saving}
              title={t('نمایش تجمیع', 'Summary')} aria-label={t('نمایش تجمیع', 'Summary')} onClick={openCurrentSummary} />
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
              columns={window.BudgetSetupSupport.allocationColumns({ years, statusLabel, Badge })}
              hideImport hideExport defaultHiddenCols={window.BudgetSetupSupport.hiddenStatusColumns} onRowClick={loadDetails}
              selectable={access.canEdit} selectedRowIds={selectedIds} onSelectionChange={setSelectedIds} actionWidth="160px"
              bulkActions={['FINAL', 'APPROVED', 'TEMPORARY'].map(target => ({
                label: transitionLabel(target), icon: { FINAL: CheckSquare, APPROVED: CheckCircle, TEMPORARY: FileText }[target],
                requiredAccess: 'edit', onClick: ids => {
                  if (!savingRef.current) { setStatusPlanIds(ids); setStatusTarget(target); }
                }
              }))}
              actions={[{ id: 'edit', icon: Edit, tooltip: t('ویرایش', 'Edit'), requiredAccess: 'edit',
                hidden: row => row.status === 'APPROVED', onClick: loadDetails },
                { id: 'allocate', icon: CalendarRange, tooltip: t('تسهیم', 'Allocate'),
                requiredAccess: 'view', onClick: loadDetails },
                { id: 'comments', icon: MessageSquare, tooltip: t('کامنت‌ها', 'Comments'), requiredAccess: 'view', onClick: setCommentPlan },
                { id: 'summary', icon: Sigma, tooltip: t('نمایش تجمیع تسهیم', 'Allocation Summary'),
                  requiredAccess: 'view', onClick: row => setSummaryTarget({ plan: row }) }]} />}
        </div>
      </div> : <div className="flex-1 min-h-0 p-4 flex flex-col overflow-hidden">
        {!loading && !loadError && <window.BudgetSetupSupport.HeaderSection record={selected} language={language} formCode={formCode}
          note={(dirty.INCOME || dirty.COST) && t('پیش از تغییر وضعیت، تسهیم هر دو بخش را ثبت کنید.', 'Save changes in both sections before changing status.')}
          actions={<div className="flex flex-wrap items-center justify-end gap-2">
          {selected.status === 'APPROVED' && <Badge variant="slate">{t('تأیید نهایی؛ فقط مشاهده', 'Approved; read only')}</Badge>}
          {access.canEdit && (logic.transitions[selected.status] || []).map(target =>
            <Button key={target} size="sm" variant="outline"
              icon={{ TEMPORARY: FileText, FINAL: CheckSquare, APPROVED: CheckCircle }[target]}
              className={{
                TEMPORARY: '!text-orange-500 !border-orange-500 hover:!bg-orange-50 dark:hover:!bg-orange-900/30',
                FINAL: '!text-blue-600 !border-blue-500 hover:!bg-blue-50 dark:hover:!bg-blue-900/30',
                APPROVED: '!text-emerald-600 !border-emerald-500 hover:!bg-emerald-50 dark:hover:!bg-emerald-900/30'
              }[target]}
              disabled={saving || dirty.INCOME || dirty.COST} onClick={() => { setStatusPlanIds(null); setStatusTarget(target); }}>
              {transitionLabel(target)}
            </Button>)}
        </div>} />}
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
              description={t('بخش درآمد یا هزینه دیگر را بررسی کنید؛ ردیف‌ها از فرم تنظیم بودجه دریافت می‌شوند.',
                'Check the other tab. Lines are loaded from Budget Setup.')} /> :
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
          description={statusPlanIds ? t(`وضعیت بودجه‌های مجاز از ${logic.digits(statusPlanIds.length)} مورد انتخاب‌شده تغییر کند؟`,
            `Change status for eligible budgets among ${statusPlanIds.length} selected records?`) : statusTarget === 'APPROVED'
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
      {commentPlan && <Comments plan={commentPlan} language={language} onClose={() => setCommentPlan(null)} />}
      {Summary && summaryTarget && <Summary key={summaryTarget.plan.id} {...summaryTarget}
        language={language} formCode={formCode} loadAll={loadAll} onClose={() => setSummaryTarget(null)} />}
      <Toast {...toast} onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
    </div>;
  };
  BudgetSetupAllocation.formCode = 'BUD_SETUP_ALLOCATION';
  window.BudgetSetupAllocation = BudgetSetupAllocation;
})();
