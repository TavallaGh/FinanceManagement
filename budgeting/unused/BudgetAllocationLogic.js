/* Budget allocation arithmetic and fiscal-period mapping. */
(() => {
  const digits = value => String(value ?? '').replace(/[\u06f0-\u06f9\u0660-\u0669]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
  const precisionFor = value => Math.max(0, Math.min(6, Number(value) || 0));
  const units = (value, precision) => {
    const clean = digits(value).replaceAll(',', '').trim();
    if (!/^\d+(\.\d+)?$/.test(clean)) return null;
    const [whole, rawFraction = ''] = clean.split('.');
    const fraction = rawFraction.replace(/0+$/, '');
    if (fraction.length > precision) return null;
    const scale = 10n ** BigInt(precision);
    return BigInt(whole) * scale + BigInt(fraction.padEnd(precision, '0') || '0');
  };
  const format = (value, precision) => {
    if (value < 0n) return `-${format(-value, precision)}`;
    const scale = 10n ** BigInt(precision);
    const fraction = (value % scale).toString().padStart(precision, '0').replace(/0+$/, '');
    const whole = (value / scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction ? `${whole}.${fraction}` : whole;
  };
  const normalizeDate = value => digits(value).trim().replaceAll('/', '-').slice(0, 10);
  const slots = (periods, plan, cadence, years = []) => {
    if (!['MONTHLY', 'QUARTERLY'].includes(cadence)) return [];
    const yearById = new Map(years.map(year => [String(year.id), year]));
    const planYear = yearById.get(String(plan.fiscal_year_id));
    const custom = plan.period_type === 'CUSTOM';
    const start = normalizeDate(custom ? plan.start_date : planYear?.start_date);
    const end = normalizeDate(custom ? plan.end_date : planYear?.end_date);
    if (!start || !end || start > end) return [];
    const monthly = periods
      .filter(row => custom || String(row.fiscal_year_id) === String(plan.fiscal_year_id))
      .filter(row => normalizeDate(row.start_date) <= end && normalizeDate(row.end_date) >= start)
      .sort((a, b) => normalizeDate(a.start_date).localeCompare(normalizeDate(b.start_date)) ||
        String(a.id).localeCompare(String(b.id)))
      .map(row => {
        const year = yearById.get(String(row.fiscal_year_id));
        if (!year) throw new Error('Fiscal year information is unavailable');
        const parts = normalizeDate(row.start_date).split('-').map(Number);
        const calendar = year.calendar_type || 'SHAMSI';
        if (calendar === 'SHAMSI' && !window.DSCore?.g2j)
          throw new Error('Jalali calendar conversion is unavailable');
        const [calendarYear, month] = calendar === 'SHAMSI' ? window.DSCore.g2j(...parts) : parts;
        const quarter = Math.ceil(month / 3);
        return { id: row.id, label: row.title || row.period_code, quarter,
          group: `${calendar}:${calendarYear}:${quarter}`, calendarYear,
          start: normalizeDate(row.start_date) < start ? start : normalizeDate(row.start_date),
          end: normalizeDate(row.end_date) > end ? end : normalizeDate(row.end_date) };
      })
      .filter(row => plan.period_type !== 'QUARTERLY' || row.quarter === Number(plan.quarter));
    if (cadence === 'MONTHLY') return monthly.map((row, index) => ({
      index: index + 1, label: row.label || String(index + 1), periodIds: [row.id], start: row.start, end: row.end
    }));
    const groups = new Map();
    monthly.forEach(row => {
      if (!groups.has(row.group)) groups.set(row.group, {
        index: groups.size + 1, labelFa: `فصل ${row.quarter} / ${row.calendarYear}`,
        labelEn: `Q${row.quarter} / ${row.calendarYear}`, periodIds: [], start: row.start, end: row.end
      });
      const slot = groups.get(row.group);
      slot.periodIds.push(row.id);
      slot.end = row.end;
    });
    return [...groups.values()];
  };
  const balance = (values, amount, precision) => {
    const original = units(amount, precision);
    if (original == null) return { invalid: true };
    let allocated = 0n;
    for (const value of values) {
      const parsed = units(value === '' || value == null ? '0' : value, precision);
      if (parsed == null) return { invalid: true };
      allocated += parsed;
    }
    return { allocated, remaining: original - allocated, invalid: false };
  };
  const equal = (amount, count, precision) => {
    const total = units(amount, precision);
    if (total == null || count < 1) return null;
    const divisor = BigInt(count);
    const each = total / divisor;
    const remainder = total % divisor;
    return Array.from({ length: count }, (_, index) =>
      format(each + (BigInt(index) < remainder ? 1n : 0n), precision));
  };
  const isEquallyAllocated = (values, amount, count, precision) => {
    if (!count || !values || values.length !== count) return false;
    const parsed = Array.from({ length: count }, (_, index) => units(values[index], precision));
    if (parsed.some(value => value == null)) return false;
    const result = balance(values, amount, precision);
    if (result.invalid || result.remaining !== 0n) return false;
    const min = parsed.reduce((a, b) => a < b ? a : b);
    const max = parsed.reduce((a, b) => a > b ? a : b);
    return max - min <= 1n;
  };
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
    const freshPlan = check(await client.from('fm_budget_plans')
      .select('id,status,is_active,period_type,quarter,fiscal_year_id,start_date,end_date,base_currency_id')
      .eq('id', plan.id).single());
    if (!freshPlan || !['TEMPORARY', 'FINAL'].includes(freshPlan.status) || freshPlan.is_active !== true)
      throw new Error(t('تسهیم فقط برای بودجه فعالِ موقت یا بررسی‌شده قابل ثبت است؛ بودجه تأییدشده قفل است.',
        'Only active temporary or reviewed budgets can be allocated; approved budgets are locked.'));
    if (freshPlan.status !== plan.status) throw conflict();
    if (['period_type', 'quarter', 'fiscal_year_id', 'start_date', 'end_date', 'base_currency_id']
      .some(field => String(freshPlan[field] ?? '') !== String(plan[field] ?? ''))) throw conflict();
    const [freshLines, headings, periods, years, currencies, methods, existing] = await Promise.all([
      loadAll('fm_budget_plan_lines', 'id,budget_heading_id,amount,is_active', q => q.eq('plan_id', plan.id)),
      loadAll('fm_budget_headings', 'id,heading_type'),
      loadAll('fm_fiscal_periods', 'id,fiscal_year_id,period_code,title,start_date,end_date', q =>
        plan.period_type === 'CUSTOM'
          ? q.lte('start_date', normalizeDate(plan.end_date)).gte('end_date', normalizeDate(plan.start_date))
          : q.eq('fiscal_year_id', plan.fiscal_year_id)),
      loadAll('fm_fiscal_years', 'id,calendar_type,start_date,end_date'),
      loadAll('fm_currencies', 'id,decimal_places', q => q.eq('id', plan.base_currency_id)),
      loadAll('fm_budget_allocation_methods', 'plan_id,heading_type,cadence',
        q => q.eq('plan_id', plan.id).eq('heading_type', headingType), ['plan_id', 'heading_type']),
      loadAll('fm_budget_allocations', allocationColumns, q => q.eq('plan_id', plan.id), ['line_id', 'slot_no'])
    ]);
    const types = new Map(headings.map(row => [String(row.id), row.heading_type]));
    const eligible = freshLines.filter(row => row.is_active !== false && types.get(String(row.budget_heading_id)) === headingType);
    const lineById = new Map(lines.map(row => [String(row.id), row]));
    if (!eligible.length || eligible.length !== lines.length || eligible.some(row => {
      const original = lineById.get(String(row.id));
      return !original || String(row.budget_heading_id) !== String(original.budget_heading_id) ||
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
      const values = currentSlots.map((slot, index) => amounts[String(line.id)]?.[index] ?? '0');
      const result = balance(values, line.amount, precision);
      if (result.invalid || result.remaining !== 0n)
        throw new Error(t('جمع تسهیم هر ردیف باید دقیقاً برابر مبلغ بودجه باشد', 'Every line must be allocated in full'));
      currentSlots.forEach((slot, index) => {
        const amount = units(values[index] === '' ? '0' : values[index], precision);
        if (amount >= 100000000000000n * (10n ** BigInt(precision)))
          throw new Error(t('مبلغ از ظرفیت ذخیره‌سازی بیشتر است', 'Amount exceeds storage precision'));
        rows.push({ plan_id: plan.id, line_id: line.id, slot_no: index + 1,
          amount: format(amount, precision).replaceAll(',', ''),
          period_start_id: String(slot.periodIds[0]), period_end_id: String(slot.periodIds[slot.periodIds.length - 1]) });
      });
    });
    const scope = query => query.eq('plan_id', plan.id).in('line_id', ids);
    const readRows = () => loadAll('fm_budget_allocations', allocationColumns,
      q => scope(q), ['line_id', 'slot_no']);
    const readMethods = () => loadAll('fm_budget_allocation_methods', 'plan_id,heading_type,cadence',
      q => q.eq('plan_id', plan.id).eq('heading_type', headingType), ['plan_id', 'heading_type']);
    let attempted = false;
    let writeTarget = 'fm_budget_allocations / UPSERT';
    try {
      attempted = true;
      check(await client.from('fm_budget_allocations').upsert(rows, { onConflict: 'line_id,slot_no' }));
      writeTarget = 'fm_budget_allocations / DELETE';
      check(await scope(client.from('fm_budget_allocations').delete()).gt('slot_no', currentSlots.length));
      writeTarget = 'fm_budget_allocation_methods / UPSERT';
      check(await client.from('fm_budget_allocation_methods').upsert([
        { plan_id: plan.id, heading_type: headingType, cadence }
      ], { onConflict: 'plan_id,heading_type' }));
      const [written, writtenMethods] = await Promise.all([readRows(), readMethods()]);
      if (allocationSignature(written) !== allocationSignature(rows) || writtenMethods[0]?.cadence !== cadence)
        throw conflict();
    } catch (error) {
      if (attempted) {
        try {
          const [current, currentMethods] = await Promise.all([readRows(), readMethods()]);
          const intermediate = [...rows, ...previous.filter(row => row.slot_no > currentSlots.length)];
          const signature = allocationSignature(current);
          if (![previous, rows, intermediate].some(state => allocationSignature(state) === signature) ||
            ![savedCadence || null, cadence].includes(currentMethods[0]?.cadence || null)) throw conflict();
          if (signature !== allocationSignature(previous)) {
            if (previous.length) check(await client.from('fm_budget_allocations')
              .upsert(previous, { onConflict: 'line_id,slot_no' }));
            const oldKeys = new Set(previous.map(row => `${row.line_id}:${row.slot_no}`));
            for (const row of rows.filter(row => !oldKeys.has(`${row.line_id}:${row.slot_no}`))) {
              check(await client.from('fm_budget_allocations').delete().eq('plan_id', plan.id)
                .eq('line_id', row.line_id).eq('slot_no', row.slot_no));
            }
          }
          if ((currentMethods[0]?.cadence || null) !== (savedCadence || null)) {
            if (methods.length) check(await client.from('fm_budget_allocation_methods')
              .upsert(methods, { onConflict: 'plan_id,heading_type' }));
            else check(await client.from('fm_budget_allocation_methods').delete()
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
        entity_type: 'برنامه بودجه', record_id: String(plan.id), action: 'update',
        user_name: window.NavigationSystem?.currentUser?.name || 'system',
        details: `تسهیم بودجه: ${headingType} / ${cadence} / ${eligible.length} ردیف`
      }]);
      auditError = log.error;
    } catch (error) { auditError = error; }
    return { rows, auditError };
  };
  const summarize = ({ plan, lines, headings, centers, sources, periods, years, methods, amounts,
    precision, groupBy, cadence }) => {
    const field = { CENTER: 'budget_center_id', HEADING: 'budget_heading_id', SOURCE: 'funding_source_id' }[groupBy];
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
      const type = headingMap.get(String(line.budget_heading_id))?.heading_type;
      if (!sourceSlots[type]) throw new Error('Budget heading type is unavailable');
      const original = units(line.amount, precision);
      if (original == null) throw new Error('Invalid budget line amount');
      const groupId = line[field];
      const group = groupId == null && groupBy !== 'HEADING'
        ? { code: '-', title_fa: groupBy === 'CENTER' ? 'بدون مرکز بودجه' : 'بدون منبع تأمین',
          title_en: groupBy === 'CENTER' ? 'No Budget Center' : 'No Funding Source' }
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
  const transitions = { TEMPORARY: [], FINAL: ['TEMPORARY', 'APPROVED'], APPROVED: [] };
  const changeStatus = async ({ client, plan, target, canEdit, t }) => {
    if (!canEdit || !plan?.is_active || !transitions[plan.status]?.includes(target))
      throw new Error(t('تغییر وضعیت مجاز نیست', 'Status transition is not allowed'));
    if (target === 'APPROVED') {
      const active = await client.from('fm_budget_plan_lines').select('id', { count: 'exact', head: true })
        .eq('plan_id', plan.id).eq('is_active', true);
      if (active.error) throw active.error;
      if (!active.count) throw new Error(t('دست‌کم یک ردیف فعال لازم است', 'At least one active line is required'));
    }
    const result = await client.from('fm_budget_plans').update({ status: target })
      .eq('id', plan.id).eq('status', plan.status).eq('is_active', true).select('id').single();
    if (result.error) throw result.error;
    let auditError = null;
    try {
      const log = await client.from('fm_record_logs').insert([{
        entity_type: 'برنامه بودجه', record_id: String(plan.id), action: 'update',
        user_name: window.NavigationSystem?.currentUser?.name || 'system',
        details: `تغییر وضعیت بودجه: ${plan.status} -> ${target}`
      }]);
      auditError = log.error;
    } catch (error) { auditError = error; }
    return { auditError };
  };
  window.BudgetAllocationLogic = { digits, units, format, normalizeDate, slots, balance, equal, isEquallyAllocated,
    precisionFor, saveAllocation, summarize, transitions, changeStatus };
})();
