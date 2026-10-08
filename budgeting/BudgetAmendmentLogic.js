/* Prototype amendment persistence and effective budget by the original allocation bucket. */
(() => {
  const setup = window.BudgetSetupLogic;
  const math = window.BudgetSetupAllocationLogic;
  const tables = { headers: 'fm_budget_setup_amendments', lines: 'fm_budget_setup_amendment_lines',
    deltas: 'fm_budget_setup_amendment_deltas', locks: 'fm_budget_setup_amendment_locks' };
  const transitions = { DRAFT: ['TEMPORARY'], TEMPORARY: ['DRAFT', 'FINAL'], FINAL: ['TEMPORARY', 'APPROVED'], APPROVED: [] };
  const editable = new Set(['DRAFT', 'TEMPORARY']);
  const uuid = () => window.crypto.randomUUID();
  const user = () => {
    const current = window.NavigationSystem?.currentUser || {};
    try {
      const stored = window.sessionStorage.getItem('fm_user_session') || window.localStorage.getItem('fm_user_session') || '{}';
      return { id: String(JSON.parse(stored).id || current.id || ''), name: current.name || current.full_name || 'system' };
    } catch (_error) { return { id: String(current.id || ''), name: current.name || 'system' }; }
  };
  const signed = (value, precision) => {
    const text = math.digits(value ?? '').replaceAll(',', '').trim();
    if (text === '') return 0n;
    const negative = text.startsWith('-');
    const result = math.units(negative ? text.slice(1) : text.replace(/^\+/, ''), precision);
    return result == null ? null : negative ? -result : result;
  };
  const amount = (value, precision) => math.format(value, precision).replaceAll(',', '');
  const dimensionKey = row => [row.cost_benefit_center_id, row.cost_type_id, row.income_type_id, row.funding_source_id ?? ''].map(String).join('|');
  const rootKey = row => row.row_kind === 'NEW' ? `NEW:${row.id}`
    : row.base_line_id != null ? `BASE:${row.base_line_id}` : `NEW:${row.origin_line_id}`;
  const typeOf = row => row.cost_type_id != null ? 'COST' : 'INCOME';
  const check = result => { if (result.error) throw result.error; return result.data; };
  const readAll = async (client, table, columns = '*', configure = query => query, order = ['id']) => {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      let query = configure(client.from(table).select(columns));
      order.forEach(field => { query = query.order(field, { ascending: true }); });
      const page = check(await query.range(offset, offset + 499)) || [];
      rows.push(...page);
      if (page.length < 500) return rows;
    }
  };
  const byIds = async (client, table, field, ids, columns = '*') => {
    const unique = [...new Set(ids.filter(value => value != null).map(String))];
    const rows = [];
    for (let offset = 0; offset < unique.length; offset += 100)
      rows.push(...await readAll(client, table, columns, query => query.in(field, unique.slice(offset, offset + 100))));
    return rows;
  };
  const assertAccess = (access, operation, doc, scope) => {
    if (!access?.canView || !access[operation] || (scope?.own_data_only && doc?.id && String(doc.created_by) !== user().id))
      throw new Error('Access denied');
  };
  const audit = (client, id, action, details, oldData = null, newData = null) =>
    window.BudgetSetupSupport.writeAudit(client, [{ entity: 'متمم بودجه', id, action, details, oldData, newData }]);
  const loadIndex = async (client, access, scope, language = 'fa') => {
    assertAccess(access, 'canView');
    const headers = await readAll(client, tables.headers, '*', query =>
      scope?.own_data_only ? query.eq('created_by', user().id) : query, ['created_at', 'id']);
    const [plans, lines, centers, headings] = await Promise.all([
      readAll(client, 'fm_budget_setup_plans', '*', query => query.eq('plan_kind', 'MAIN').eq('status', 'APPROVED').eq('is_active', true)),
      byIds(client, tables.lines, 'amendment_id', headers.map(row => row.id), 'id,amendment_id,cost_benefit_center_id,cost_type_id,income_type_id'),
      readAll(client, 'fm_cost_benefit_centers', setup.centerColumns),
      setup.loadTypes((table, columns) => readAll(client, table, columns), language)
    ]);
    const deltas = await byIds(client, tables.deltas, 'amendment_id', headers.map(row => row.id), 'id,amendment_id,amount');
    const referencePlans = await byIds(client, 'fm_budget_setup_plans', 'id', headers.map(row => row.plan_id));
    const currencies = await byIds(client, 'fm_currencies', 'id', referencePlans.map(row => row.base_currency_id));
    const planMap = new Map(referencePlans.map(row => [String(row.id), row]));
    const headerMap = new Map(headers.map(row => [String(row.id), row]));
    const lineCounts = new Map();
    const linesByHeader = new Map();
    for (const line of lines) {
      const key = String(line.amendment_id);
      lineCounts.set(key, (lineCounts.get(key) || 0) + 1);
      if (!linesByHeader.has(key)) linesByHeader.set(key, []);
      linesByHeader.get(key).push(line);
    }
    const currencyMap = new Map(currencies.map(row => [String(row.id), row]));
    const sums = new Map();
    for (const delta of deltas) {
      const header = headerMap.get(String(delta.amendment_id));
      const plan = planMap.get(String(header?.plan_id));
      if (!plan || !currencyMap.has(String(plan.base_currency_id))) throw new Error('The reference budget or its currency is unavailable');
      const precision = math.precisionFor(currencyMap.get(String(plan?.base_currency_id))?.decimal_places);
      const value = signed(delta.amount, precision);
      if (value == null) throw new Error('Invalid amendment amount');
      if (!sums.has(String(delta.amendment_id))) sums.set(String(delta.amendment_id), { increase: 0n, decrease: 0n });
      const sum = sums.get(String(delta.amendment_id));
      if (value > 0n) sum.increase += value; else sum.decrease -= value;
    }
    return { plans, centers, headings, rows: headers.slice().reverse().map(header => {
      const plan = planMap.get(String(header.plan_id));
      const currency = currencyMap.get(String(plan?.base_currency_id));
      const precision = math.precisionFor(currency?.decimal_places);
      const sum = sums.get(String(header.id)) || { increase: 0n, decrease: 0n };
      return { ...header, budget_title: plan?.title || '-', budget_code: plan?.code || '-', currency_code: currency?.code || '',
        increase: math.format(sum.increase, precision), decrease: math.format(sum.decrease, precision),
        net: math.format(sum.increase - sum.decrease, precision), line_count: lineCounts.get(String(header.id)) || 0,
        _lines: linesByHeader.get(String(header.id)) || [] };
    }) };
  };
  const matchesFilters = (record, filters) => {
    const center = filters.cost_benefit_center?.id;
    const cost = filters.cost_type?.id;
    const income = filters.income_type?.id;
    if (center == null && cost == null && income == null) return true;
    const lines = (record._lines || []).filter(row => center == null || String(row.cost_benefit_center_id) === String(center));
    return lines.length > 0 && (!cost || lines.some(row => row.cost_type_id != null && setup.typeKey('COST', row.cost_type_id) === String(cost))) &&
      (!income || lines.some(row => row.income_type_id != null && setup.typeKey('INCOME', row.income_type_id) === String(income)));
  };
  const loadContext = async (client, planId, language = 'fa') => {
    const load = (table, columns, configure, order) => readAll(client, table, columns, configure, order);
    const plan = check(await client.from('fm_budget_setup_plans').select('*').eq('id', planId).eq('plan_kind', 'MAIN').single());
    if (!plan || plan.status !== 'APPROVED' || !plan.is_active) throw new Error('The reference budget must be active and approved');
    const [baseLines, baseAllocations, methods, periods, years, currencies, centers, headings, sources, approved] = await Promise.all([
      load('fm_budget_setup_lines', setup.lineColumns, query => query.eq('plan_id', planId)),
      load('fm_budget_setup_allocations', 'plan_id,line_id,slot_no,amount,period_start_id,period_end_id',
        query => query.eq('plan_id', planId), ['line_id', 'slot_no']),
      load('fm_budget_setup_allocation_methods', '*', query => query.eq('plan_id', planId), ['plan_id', 'heading_type']),
      load('fm_fiscal_periods', 'id,fiscal_year_id,title,period_code,start_date,end_date', query => plan.period_type === 'CUSTOM'
        ? query.lte('start_date', math.normalizeDate(plan.end_date)).gte('end_date', math.normalizeDate(plan.start_date))
        : query.eq('fiscal_year_id', plan.fiscal_year_id)),
      load('fm_fiscal_years', 'id,calendar_type,start_date,end_date'),
      load('fm_currencies', 'id,code,decimal_places', query => query.eq('id', plan.base_currency_id)),
      load('fm_cost_benefit_centers', setup.centerColumns), setup.loadTypes(load, language),
      load('fm_funding_sources', 'id,code,title_fa,title_en,is_active'),
      load(tables.headers, '*', query => query.eq('plan_id', planId).eq('status', 'APPROVED'))
    ]);
    if (currencies.length !== 1) throw new Error('Budget currency is unavailable');
    const precision = math.precisionFor(currencies[0].decimal_places);
    const approvedLines = await byIds(client, tables.lines, 'amendment_id', approved.map(row => row.id));
    const approvedDeltas = await byIds(client, tables.deltas, 'amendment_id', approved.map(row => row.id));
    const cadenceByType = Object.fromEntries(methods.map(row => [row.heading_type, row.cadence]));
    const items = new Map();
    const allocationsByLine = new Map();
    for (const allocation of baseAllocations) {
      const key = String(allocation.line_id);
      if (!allocationsByLine.has(key)) allocationsByLine.set(key, []);
      allocationsByLine.get(key).push(allocation);
    }
    const bucketSlots = cadence => math.slots(periods, plan, cadence, years);
    for (const line of baseLines.filter(row => row.is_active !== false)) {
      const cadence = cadenceByType[typeOf(line)];
      const slots = bucketSlots(cadence);
      if (!slots.length) throw new Error('The original budget allocation method or periods are missing');
      const allocations = allocationsByLine.get(String(line.id)) || [];
      if (allocations.length !== slots.length) throw new Error('The original budget allocation is incomplete');
      const values = slots.map((slot, index) => {
        const saved = allocations.find(row => Number(row.slot_no) === index + 1);
        if (!saved || String(saved.period_start_id) !== String(slot.periodIds[0]) || String(saved.period_end_id) !== String(slot.periodIds[slot.periodIds.length - 1]))
          throw new Error('Original allocation periods do not match');
        const value = math.units(saved.amount, precision);
        if (value == null) throw new Error('Invalid original allocation amount');
        return value;
      });
      if (values.reduce((sum, value) => sum + value, 0n) !== math.units(line.amount, precision)) throw new Error('Original allocation total differs from budget');
      items.set(`BASE:${line.id}`, { ...line, key: `BASE:${line.id}`, cadence, slots, values, origin: 'BASE' });
    }
    for (const line of approvedLines.filter(row => row.row_kind === 'NEW')) {
      const type = typeOf(line);
      if (cadenceByType[type] && cadenceByType[type] !== line.cadence) throw new Error('Approved allocation methods conflict');
      cadenceByType[type] = line.cadence;
      const slots = bucketSlots(line.cadence);
      if (!slots.length) throw new Error('Approved amendment periods are unavailable');
      if ([...items.values()].some(item => dimensionKey(item) === dimensionKey(line))) throw new Error('Duplicate approved budget line identity');
      items.set(`NEW:${line.id}`, { ...line, key: `NEW:${line.id}`, slots, values: slots.map(() => 0n), origin: 'AMENDMENT' });
    }
    const approvedById = new Map(approvedLines.map(row => [String(row.id), row]));
    for (const delta of approvedDeltas) {
      const line = approvedById.get(String(delta.amendment_line_id));
      const item = line && items.get(rootKey(line));
      const slot = item?.slots[Number(delta.slot_no) - 1];
      const value = signed(delta.amount, precision);
      if (!item || !slot || value == null || String(delta.period_start_id) !== String(slot.periodIds[0]) ||
        String(delta.period_end_id) !== String(slot.periodIds[slot.periodIds.length - 1])) throw new Error('Approved amendment allocation is invalid');
      item.values[Number(delta.slot_no) - 1] += value;
    }
    if ([...items.values()].some(item => item.values.some(value => value < 0n))) throw new Error('An approved budget bucket is negative');
    return { plan, currency: currencies[0], precision, periods, years, centers, headings, sources,
      cadenceByType, items: [...items.values()], itemMap: items, approvedIds: approved.map(row => String(row.id)), bucketSlots };
  };
  const loadDocument = async (client, id, access, scope, language) => {
    const doc = check(await client.from(tables.headers).select('*').eq('id', id).single());
    if (!doc) throw new Error('Amendment is unavailable');
    assertAccess(access, 'canView', doc, scope);
    const [context, lines, deltas] = await Promise.all([
      loadContext(client, doc.plan_id, language), readAll(client, tables.lines, '*', query => query.eq('amendment_id', id)),
      readAll(client, tables.deltas, '*', query => query.eq('amendment_id', id))
    ]);
    const deltasByLine = new Map();
    for (const delta of deltas) {
      const key = String(delta.amendment_line_id);
      if (!deltasByLine.has(key)) deltasByLine.set(key, []);
      deltasByLine.get(key).push(delta);
    }
    const mapped = lines.map(row => ({ ...row, values: Object.fromEntries((deltasByLine.get(String(row.id)) || [])
      .map(delta => [delta.slot_no, String(delta.amount)])) }));
    const mappedById = new Map(mapped.map(row => [String(row.id), row]));
    for (const delta of deltas) {
      const row = mappedById.get(String(delta.amendment_line_id));
      const slot = row && projectedItem(context, row, doc.id).slots[Number(delta.slot_no) - 1];
      if (!slot || String(delta.period_start_id) !== String(slot.periodIds[0]) ||
        String(delta.period_end_id) !== String(slot.periodIds[slot.periodIds.length - 1]))
        throw new Error('Saved amendment bucket periods do not match the reference budget');
    }
    return { doc, context, lines: mapped, deltas };
  };
  const projectedItem = (context, row, docId) => {
    // Exclude this approved document, while retaining all other approved amendments.
    const item = context.itemMap?.get(rootKey(row)) || context.items.find(item => item.key === rootKey(row));
    if (row.row_kind === 'NEW' && !item) return { ...row, slots: context.bucketSlots(row.cadence), values: context.bucketSlots(row.cadence).map(() => 0n) };
    if (!item) throw new Error('The referenced budget line is unavailable');
    if (context.approvedIds.includes(String(docId))) return { ...item, values: item.values.map((value, index) => value - (signed(row.values?.[index + 1], context.precision) ?? 0n)) };
    return item;
  };
  const validate = (context, rows, complete = false, docId = null) => {
    const seen = new Set();
    const newDimensions = new Set(context.items.filter(item => !(docId && item.origin === 'AMENDMENT' && String(item.amendment_id) === String(docId))).map(dimensionKey));
    let changed = false;
    for (const row of rows) {
      if (!['NEW', 'EXISTING'].includes(row.row_kind) || (row.row_kind === 'NEW' && (row.base_line_id != null || row.origin_line_id != null)) ||
        (row.row_kind === 'EXISTING' && (row.base_line_id != null) === (row.origin_line_id != null)))
        throw new Error('Invalid amendment line origin');
      if (seen.has(rootKey(row))) throw new Error('A budget line occurs more than once in this amendment');
      seen.add(rootKey(row));
      const type = typeOf(row);
      if ((row.cost_type_id != null) === (row.income_type_id != null)) throw new Error('Select exactly one cost or income type');
      if (row.row_kind === 'NEW') {
        const center = context.centers.find(item => String(item.id) === String(row.cost_benefit_center_id));
        const heading = context.headings.find(item => String(item.id) === setup.typeKey(type, row.cost_type_id ?? row.income_type_id));
        if (!center?.is_active || !setup.centerMatches(center, type) || !heading?.is_active || !heading.isLeaf)
          throw new Error('Select an active center and a leaf cost or income type matching this tab');
        if (row.funding_source_id != null && !context.sources.some(item => String(item.id) === String(row.funding_source_id) && item.is_active))
          throw new Error('Funding source is unavailable');
        const dimension = dimensionKey(row);
        if (newDimensions.has(dimension)) throw new Error('This combination exists; amend its existing budget line');
        newDimensions.add(dimension);
        const siblings = rows.filter(item => typeOf(item) === type);
        if ((context.cadenceByType[type] && context.cadenceByType[type] !== row.cadence) || siblings.some(item => item.cadence !== row.cadence))
          throw new Error('New lines must use the same allocation method as this budget type');
      }
      const item = projectedItem(context, row, docId);
      if (row.row_kind !== 'NEW' && (dimensionKey(item) !== dimensionKey(row) || item.cadence !== row.cadence))
        throw new Error('The original line references and allocation method cannot be changed');
      if (!item.slots.length || item.slots.length > 24) throw new Error('No valid allocation periods');
      let rowChanged = false;
      for (const key of Object.keys(row.values || {})) {
        const index = Number(key) - 1;
        if (!Number.isInteger(index) || index < 0 || index >= item.slots.length) throw new Error('Allocation slot is outside the budget range');
      }
      item.slots.forEach((_slot, index) => {
        const value = signed(row.values?.[index + 1], context.precision);
        if (value == null) throw new Error('Invalid amendment amount or currency precision');
        if ((value < 0n ? -value : value) >= 100000000000000n * (10n ** BigInt(context.precision))) throw new Error('Amount exceeds storage precision');
        if (item.values[index] + value < 0n) throw new Error(`Budget cannot be negative: ${row.id}, ${_slot.labelFa || _slot.label || _slot.labelEn}`);
        if (value !== 0n) rowChanged = changed = true;
      });
      if (complete && !rowChanged) throw new Error('Every amendment line must change at least one bucket');
    }
    if (complete && (!rows.length || !changed)) throw new Error('Enter at least one nonzero bucket change; the net total may be zero');
    return true;
  };
  const acquire = async (client, planId) => {
    check(await client.from(tables.locks).upsert([{ plan_id: planId }], { onConflict: 'plan_id', ignoreDuplicates: true }));
    const token = uuid();
    const now = new Date().toISOString();
    const expires = () => new Date(Date.now() + 180000).toISOString();
    const result = await client.from(tables.locks).update({ token, expires_at: expires() }).eq('plan_id', planId)
      .or(`token.is.null,expires_at.lt.${now}`).select('plan_id');
    check(result);
    if (!result.data?.length) throw new Error('Another amendment operation is running for this budget; retry');
    return {
      renew: async () => {
        const result = await client.from(tables.locks).update({ expires_at: expires() }).eq('plan_id', planId)
          .eq('token', token).gt('expires_at', new Date().toISOString()).select('plan_id');
        check(result);
        if (!result.data?.length) throw new Error('The budget editing lease expired; reload');
      },
      release: async () => {
        const result = await client.from(tables.locks).update({ token: null, expires_at: null }).eq('plan_id', planId).eq('token', token);
        if (result.error) throw result.error;
      }
    };
  };
  const linePayload = (row, doc) => ({ id: row.id, amendment_id: doc.id, plan_id: doc.plan_id, row_kind: row.row_kind,
    base_line_id: row.base_line_id ?? null, origin_line_id: row.origin_line_id ?? null,
    cost_benefit_center_id: row.cost_benefit_center_id, cost_type_id: row.cost_type_id ?? null,
    income_type_id: row.income_type_id ?? null, funding_source_id: row.funding_source_id ?? null,
    cadence: row.cadence, description: row.description || null });
  const auditLines = (client, before, after, doc, precision) => {
    const snapshot = row => ({ ...linePayload(row, doc), buckets: Object.fromEntries(Object.entries(row.values || {})
      .map(([slot, value]) => [Number(slot), amount(signed(value, precision), precision)])
      .filter(([, value]) => signed(value, precision) !== 0n).sort((a, b) => a[0] - b[0])) });
    return window.BudgetSetupSupport.auditChanges(client, 'ردیف متمم بودجه', before.map(snapshot), after.map(snapshot),
      `متمم ${doc.code}؛ تغییر ردیف و مبالغ تسهیم`);
  };
  const signature = (rows, deltas, precision) => JSON.stringify({
    lines: rows.map(row => [String(row.id), row.row_kind, rootKey(row), dimensionKey(row), row.cadence, row.description || ''])
      .sort((a, b) => a[0].localeCompare(b[0])),
    deltas: deltas.map(row => [String(row.amendment_line_id), Number(row.slot_no), String(row.period_start_id),
      String(row.period_end_id), String(signed(row.amount, precision))]).sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1])
  });
  const deltaPayloads = (rows, context, doc) => rows.flatMap(row => projectedItem(context, row, doc.id).slots.flatMap((slot, index) => {
    const value = signed(row.values?.[index + 1], context.precision);
    return value === 0n ? [] : [{ amendment_line_id: row.id, amendment_id: doc.id, plan_id: doc.plan_id, slot_no: index + 1,
      period_start_id: slot.periodIds[0], period_end_id: slot.periodIds[slot.periodIds.length - 1], amount: amount(value, context.precision) }];
  }));
  const writeRows = async (client, table, rows, conflict, lease) => {
    for (let offset = 0; offset < rows.length; offset += 100) {
      await lease.renew();
      check(await client.from(table).upsert(rows.slice(offset, offset + 100), { onConflict: conflict }));
    }
  };
  const replaceDetails = async (client, doc, rows, deltas, lease) => {
    await writeRows(client, tables.lines, rows, 'id', lease);
    await lease.renew();
    check(await client.from(tables.deltas).delete().eq('amendment_id', doc.id));
    await writeRows(client, tables.deltas, deltas, 'amendment_line_id,slot_no', lease);
    const saved = await readAll(client, tables.lines, 'id', query => query.eq('amendment_id', doc.id));
    const keep = new Set(rows.map(row => String(row.id)));
    for (const row of saved.filter(row => !keep.has(String(row.id)))) {
      await lease.renew();
      check(await client.from(tables.lines).delete().eq('id', row.id).eq('amendment_id', doc.id));
    }
  };
  const effectiveDate = (context, value) => {
    const date = math.normalizeDate(setup.englishDigits(value || ''));
    const slots = context.bucketSlots('MONTHLY');
    const start = slots[0]?.start;
    const end = slots[slots.length - 1]?.end;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date || !start || !end || date < start || date > end)
      throw new Error('Effective start date must be within the reference budget range');
    return date;
  };
  const summarize = (context, rows, documentId, headingType, cadence, groupBy) => {
    if (!['type', 'center', 'source'].includes(groupBy)) throw new Error('Invalid summary grouping');
    const groups = new Map();
    const selected = rows.filter(row => (!headingType || typeOf(row) === headingType) && (!cadence || row.cadence === cadence))
      .map(row => ({ row, item: projectedItem(context, row, documentId) }));
    const slotKey = (slot, method) => `${method}:${slot.start}:${slot.end}:${slot.periodIds.map(String).join(',')}`;
    const bySlot = new Map();
    for (const { row, item } of selected) for (const slot of item.slots) {
      const key = slotKey(slot, row.cadence);
      bySlot.set(key, { ...slot, key, cadence: row.cadence });
    }
    const slots = [...bySlot.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.key.localeCompare(b.key));
    const indexes = new Map(slots.map((slot, index) => [slot.key, index]));
    for (const { row, item } of selected) {
      const type = typeOf(row);
      const referenceId = groupBy === 'type' ? setup.typeKey(type, row.cost_type_id ?? row.income_type_id)
        : groupBy === 'center' ? row.cost_benefit_center_id : row.funding_source_id;
      const key = `${type}:${row.cadence}:${referenceId ?? ''}`;
      if (!groups.has(key)) groups.set(key, { id: key, referenceId, heading_type: type, cadence: row.cadence,
        before: 0n, delta: 0n, after: 0n, values: slots.map(() => null) });
      const group = groups.get(key);
      item.slots.forEach((slot, index) => {
        const value = signed(row.values?.[index + 1], context.precision);
        if (value == null) throw new Error('Invalid amendment amount or currency precision');
        group.before += item.values[index];
        group.delta += value;
        group.after += item.values[index] + value;
        const targetIndex = indexes.get(slotKey(slot, row.cadence));
        group.values[targetIndex] = (group.values[targetIndex] ?? 0n) + value;
      });
    }
    return { slots, rows: [...groups.values()] };
  };
  const save = async ({ client, doc, rows, access, scope, language }) => {
    const creating = !doc.persisted;
    assertAccess(access, creating ? 'canCreate' : 'canEdit', creating ? null : doc, scope);
    if (!editable.has(doc.status) || !doc.plan_id || !String(doc.code || '').trim() || !String(doc.title || '').trim())
      throw new Error('Select an approved budget and enter code and title');
    const lease = await acquire(client, doc.plan_id);
    let previous = null;
    let mutated = false;
    let committed = false;
    let releaseError = null;
    try {
      if (!creating) {
        previous = await loadDocument(client, doc.id, access, scope, language);
        if (!editable.has(previous.doc.status) || previous.doc.status !== doc.status || previous.doc.revision !== doc.revision)
          throw new Error('Amendment changed; reload before saving');
        if (String(previous.doc.plan_id) !== String(doc.plan_id)) throw new Error('The reference budget cannot be changed');
      }
      const context = previous?.context || await loadContext(client, doc.plan_id, language);
      const effective_start_date = effectiveDate(context, doc.effective_start_date);
      validate(context, rows, false, doc.id);
      const deltas = deltaPayloads(rows, context, doc);
      const payload = { code: setup.englishDigits(doc.code).trim(), title: doc.title.trim(), effective_start_date,
        description: String(doc.description || '').trim() || null };
      await lease.renew();
      if (creating) {
        check(await client.from(tables.headers).insert([{ id: doc.id, ...payload, plan_id: doc.plan_id,
          status: 'DRAFT', revision: 0, created_by: user().id || null, created_by_name: user().name }]).select('id').single());
      } else {
        check(await client.from(tables.headers).update({ ...payload, revision: doc.revision + 1 })
          .eq('id', doc.id).eq('status', doc.status).eq('revision', doc.revision).select('id').single());
      }
      mutated = true;
      await replaceDetails(client, doc, rows.map(row => linePayload(row, doc)), deltas, lease);
      await lease.renew();
      const saved = await loadDocument(client, doc.id, access, scope, language);
      if (signature(saved.lines, saved.deltas, context.precision) !== signature(rows, deltas, context.precision))
        throw new Error('Amendment save could not be confirmed');
      committed = true;
      const headerError = await audit(client, doc.id, creating ? 'create' : 'update', `متمم بودجه ${doc.code}`,
        previous?.doc || null, saved.doc);
      const auditError = await auditLines(client, previous?.lines || [], saved.lines, saved.doc, context.precision) || headerError;
      return { ...saved, auditError };
    } catch (failure) {
      if (mutated && !committed) {
        try {
          await lease.renew();
          if (creating) check(await client.from(tables.headers).delete().eq('id', doc.id).eq('status', 'DRAFT'));
          else {
            await replaceDetails(client, doc, previous.lines.map(row => linePayload(row, previous.doc)), previous.deltas, lease);
            check(await client.from(tables.headers).update({ code: previous.doc.code, title: previous.doc.title,
              description: previous.doc.description, effective_start_date: previous.doc.effective_start_date,
              revision: previous.doc.revision }).eq('id', doc.id).eq('status', previous.doc.status));
          }
        } catch (restoreError) {
          const error = new Error(`${failure.message}; save restoration was not confirmed: ${restoreError.message}. Reload the amendment.`);
          error.recoveryRequired = true;
          throw error;
        }
      }
      throw failure;
    } finally {
      try { await lease.release(); } catch (error) { releaseError = error; }
      // A release failure retains the short lease; the completed document stays saved.
      if (releaseError) window.console?.error('Budget amendment lease release failed', releaseError.message);
    }
  };
  const changeStatus = async ({ client, doc, target, access, scope, language }) => {
    assertAccess(access, 'canEdit', doc, scope);
    if (!transitions[doc.status]?.includes(target)) throw new Error('Status transition is not allowed');
    const lease = await acquire(client, doc.plan_id);
    try {
      const fresh = await loadDocument(client, doc.id, access, scope, language);
      if (fresh.doc.status !== doc.status || fresh.doc.revision !== doc.revision) throw new Error('Amendment changed; reload');
      if (target !== 'DRAFT') {
        effectiveDate(fresh.context, fresh.doc.effective_start_date);
        validate(fresh.context, fresh.lines, true, doc.id);
      }
      await lease.renew();
      const record = check(await client.from(tables.headers).update({ status: target, revision: doc.revision + 1,
        ...window.BudgetSetupSupport.statusMetadata(target) })
        .eq('id', doc.id).eq('status', doc.status).eq('revision', doc.revision).select('*').single());
      const auditError = await audit(client, doc.id, 'update', `تغییر وضعیت متمم: ${doc.status} -> ${target}`, fresh.doc, record);
      return { doc: record, auditError };
    } finally { await lease.release().catch(error => window.console?.error('Budget amendment lease release failed', error.message)); }
  };
  const remove = async ({ client, doc, access, scope }) => {
    assertAccess(access, 'canDelete', doc, scope);
    if (doc.status !== 'DRAFT') throw new Error('Only draft amendments can be deleted');
    const lease = await acquire(client, doc.plan_id);
    try {
      const fresh = await loadDocument(client, doc.id, access, scope);
      check(await client.from(tables.headers).delete().eq('id', doc.id).eq('status', 'DRAFT').eq('revision', doc.revision).select('id').single());
      const headerError = await audit(client, doc.id, 'delete', `حذف متمم ${doc.code}`, fresh.doc);
      return { auditError: await auditLines(client, fresh.lines, [], fresh.doc, fresh.context.precision) || headerError };
    } finally { await lease.release().catch(error => window.console?.error('Budget amendment lease release failed', error.message)); }
  };
  const effectiveBuckets = context => context.items.flatMap(item => item.slots.map((slot, index) => ({
    row_key: item.key, plan_id: context.plan.id, cost_benefit_center_id: item.cost_benefit_center_id,
    cost_type_id: item.cost_type_id ?? null, income_type_id: item.income_type_id ?? null,
    funding_source_id: item.funding_source_id ?? null, currency_id: context.currency.id, cadence: item.cadence,
    slot_no: index + 1, period_start_id: slot.periodIds[0], period_end_id: slot.periodIds[slot.periodIds.length - 1],
    start_date: slot.start, end_date: slot.end, amount: amount(item.values[index], context.precision)
  })));
  window.BudgetAmendmentLogic = { tables, transitions, editable, uuid, user, signed, amount, rootKey, typeOf,
    readAll, byIds, loadIndex, matchesFilters, loadContext, loadDocument, projectedItem, validate, effectiveDate, summarize, effectiveBuckets, save, changeStatus, remove };
})();
