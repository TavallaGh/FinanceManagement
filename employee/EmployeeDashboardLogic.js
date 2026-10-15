/* Browser prototype logic; private queries require trusted server/RLS authorization. */
(() => {
  const { addDays, weekday } = window.DSCalendar;
  const check = result => {
    if (result.error) throw result.error;
    return result.data;
  };
  const fail = (fa, en) => { const e = new Error(en); e.fa = fa; throw e; };
  const actor = () => {
    try { return JSON.parse(sessionStorage.getItem('fm_user_session') || '{}'); }
    catch (_) { return {}; }
  };
  const same = (a, b) => String(a ?? '') === String(b ?? '');
  const assert = (security, code, permission) => {
    if (!actor().id || !security.getActions(code)[permission]) fail('دسترسی مجاز نیست.', 'Access denied.');
  };
  const normalizeDate = value => {
    if (!value) return null;
    const normalized = String(value).replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replaceAll('/', '-');
    const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) fail('تاریخ معتبر نیست.', 'Invalid date.');
    const [y, m, d] = match.slice(1).map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    if (y < 1900 || y > 2200 || parsed.getUTCFullYear() !== y || parsed.getUTCMonth() + 1 !== m || parsed.getUTCDate() !== d)
      fail('تاریخ معتبر نیست.', 'Invalid date.');
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  const readAll = async (client, table, columns, configure = q => q, orderColumn = 'id') => {
    const rows = [];
    for (let offset = 0; ;) {
      const result = await configure(client.from(table).select(columns, { count: 'exact' }))
        .order(orderColumn, { ascending: true }).range(offset, offset + 499);
      const page = check(result) || [];
      rows.push(...page);
      if (result.count != null ? rows.length >= result.count : !page.length) return rows;
      if (!page.length) fail('دریافت اطلاعات کامل نشد.', 'Incomplete source pagination.');
      offset += page.length;
    }
  };
  const zoneParts = (instant, zone) => {
    const values = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(instant));
    return Object.fromEntries(values.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  };
  const today = (zone = 'Asia/Tehran', instant = Date.now()) => {
    const p = zoneParts(instant, zone);
    return `${p.year}-${p.month}-${p.day}`;
  };
  const midnight = (date, zone) => {
    const target = Date.parse(`${date}T00:00:00Z`);
    let candidate = target;
    for (let i = 0; i < 5; i++) {
      const p = zoneParts(candidate, zone);
      const represented = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
      const difference = target - represented;
      candidate += difference;
      if (!difference) return candidate;
    }
    fail('منطقه زمانی برای این تاریخ قابل محاسبه نیست.', 'Cannot resolve midnight in this time zone.');
  };
  const duration = (milliseconds, withSeconds = false) => {
    const minutes = Math.floor(Math.max(0, milliseconds) / 60000);
    const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    return withSeconds ? `${clock}:${String(Math.floor(Math.max(0, milliseconds) / 1000) % 60).padStart(2, '0')}` : clock;
  };
  const time = (instant, zone, language) => new Intl.DateTimeFormat(language === 'fa' ? 'fa-IR' : 'en-GB',
    { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant));
  const leaveDates = leave => Array.isArray(leave.working_dates) && leave.working_dates.length
    ? leave.working_dates : [leave.leave_date];
  const daySummary = (date, sessions, leaves, zone, now = Date.now()) => {
    const from = midnight(date, zone);
    const to = midnight(addDays(date, 1), zone);
    const intervals = sessions.filter(s => Date.parse(s.started_at) < to && (!s.ended_at || Date.parse(s.ended_at) > from))
      .map(s => ({ ...s, from: Math.max(from, Date.parse(s.started_at)),
        to: Math.min(to, s.ended_at ? Date.parse(s.ended_at) : now), open: !s.ended_at }));
    const actual = intervals.filter(s => s.to > s.from).sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
    const ended = sessions.filter(s => s.ended_at && today(zone, s.ended_at) === date)
      .sort((a, b) => Date.parse(b.ended_at) - Date.parse(a.ended_at));
    return { intervals, milliseconds: intervals.reduce((sum, s) => sum + Math.max(0, s.to - s.from), 0),
      firstStartedAt: actual[0]?.started_at || null, lastEndedAt: ended[0]?.ended_at || null,
      hasOpenSession: actual.some(s => s.open),
      entries: sessions.filter(s => today(zone, s.started_at) === date).length,
      exits: sessions.filter(s => s.ended_at && today(zone, s.ended_at) === date).length,
      leave: leaves.find(l => leaveDates(l).includes(date)) || null };
  };
  const schedule = (calendars, userId, date) => calendars.find(c =>
    c.user_ids.some(id => same(id, userId)) && c.valid_from <= date && (!c.valid_to || c.valid_to >= date));
  const workDay = (calendar, date) => {
    if (!calendar) return [6, 0].includes(weekday(date)) ? { working: false, provisional: true } : null;
    const exception = (calendar.exceptions || []).find(e => e.date === date);
    if (exception) return exception;
    return (calendar.week || []).find(d => d.day === weekday(date)) || { working: false };
  };
  const leaveDecision = (leave, instances, tasks) => {
    const instance = instances.find(i => same(i.record_id, leave.id));
    if (!instance) return { ...leave, decision: 'DRAFT', workflow_id: null };
    const completed = tasks.filter(t => same(t.instance_id, instance.id) && t.status === 'COMPLETED')
      .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)) || String(b.id).localeCompare(String(a.id)));
    const decision = completed.find(t => ['APPROVE', 'REJECT'].includes(t.action_taken));
    return { ...leave, workflow_id: instance.id,
      decision: instance.status !== 'COMPLETED' ? 'PENDING'
        : decision ? (decision.action_taken === 'APPROVE' ? 'APPROVED' : 'REJECTED') : 'UNRESOLVED' };
  };
  const workflowData = async (client, leaves) => {
    const instances = [];
    const tasks = [];
    for (let i = 0; i < leaves.length; i += 100) {
      instances.push(...await readAll(client.schema('wf'), 'wf_instances', 'id,record_id,status,created_at',
        q => q.eq('entity_type', 'GEN_EMPLOYEE_LEAVE').in('record_id', leaves.slice(i, i + 100).map(l => String(l.id)))));
    }
    for (let i = 0; i < instances.length; i += 100) {
      tasks.push(...await readAll(client.schema('wf'), 'wf_tasks', 'id,instance_id,status,action_taken,completed_at',
        q => q.in('instance_id', instances.slice(i, i + 100).map(r => r.id))));
    }
    instances.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || String(b.id).localeCompare(String(a.id)));
    return leaves.map(l => leaveDecision(l, instances, tasks));
  };
  const directory = async (client, includeInactive = false) => {
    const users = await readAll(client, 'sec_users', 'id,username,full_name,is_active', q => includeInactive ? q : q.eq('is_active', true));
    return users.map(u => ({ ...u, name: u.full_name || u.username }));
  };
  const leaveSchemas = new WeakMap();
  const resetLeaveSchema = client => leaveSchemas.delete(client);
  const readLeaves = async (client, userId, scope, columns = '*') => {
    const scopeUsers = q => Array.isArray(userId) ? q.in('user_id', userId) : q.eq('user_id', userId);
    if (leaveSchemas.get(client) !== false) {
      try {
        const rows = await readAll(client, 'gen_employee_leaves', columns, q => scopeUsers(q)
          .gte('end_date', scope.from).lte('leave_date', scope.to));
        leaveSchemas.set(client, true);
        return rows;
      } catch (e) {
        // Only the known pre-migration schema may fall back; authorization/network failures still propagate.
        if (!['42703', 'PGRST204'].includes(e.code) || !/end_date/i.test(e.message || '')) throw e;
        leaveSchemas.set(client, false);
      }
    }
    return readAll(client, 'gen_employee_leaves', columns === '*' ? '*' : 'id,user_id,leave_date,portion', q => scopeUsers(q)
      .gte('leave_date', scope.from).lte('leave_date', scope.to));
  };
  const load = async (client, security, code, userId, range) => {
    assert(security, code, 'canView');
    if (!security.isFullAccess && !same(userId, actor().id)) fail('فقط پیشخوان خودتان قابل مشاهده است.', 'Only your dashboard is permitted.');
    const calendars = await readAll(client, 'gen_work_calendars', '*', q => q.contains('user_ids', JSON.stringify([String(userId)])));
    const zones = [...new Set(calendars.map(c => c.timezone).concat('Asia/Tehran'))];
    const from = Math.min(...zones.map(z => midnight(range.from, z)));
    const to = Math.max(...zones.map(z => midnight(addDays(range.to, 1), z)));
    const todayFrom = Math.min(...zones.map(z => midnight(today(z), z)));
    const todayTo = Math.max(...zones.map(z => midnight(addDays(today(z), 1), z)));
    const includesToday = from <= todayFrom && to >= todayTo;
    const [sessions, leaves, open, todaySessions] = await Promise.all([
      readAll(client, 'gen_work_sessions', '*', q => q.eq('user_id', userId).lt('started_at', new Date(to).toISOString())
        .or(`ended_at.is.null,ended_at.gt.${new Date(from).toISOString()}`)),
      readLeaves(client, userId, range),
      readAll(client, 'gen_work_sessions', '*', q => q.eq('user_id', userId).is('ended_at', null)),
      includesToday ? Promise.resolve(null) : readAll(client, 'gen_work_sessions', '*', q => q.eq('user_id', userId).lt('started_at', new Date(todayTo).toISOString())
        .or(`ended_at.is.null,ended_at.gt.${new Date(todayFrom).toISOString()}`))
    ]);
    return { calendars, sessions, todaySessions: todaySessions || sessions, leaves: await workflowData(client, leaves), open: open[0] || null };
  };
  const presence = async client => {
    const [users, records] = await Promise.all([directory(client), readAll(client, 'gen_employee_presence', '*')]);
    const currentDates = users.map(user => today(records.find(r => same(r.user_id, user.id))?.timezone || 'Asia/Tehran')).sort();
    const leaveRows = [];
    for (let i = 0; i < users.length; i += 100) {
      leaveRows.push(...await readLeaves(client, users.slice(i, i + 100).map(u => u.id),
        { from: currentDates[0], to: currentDates[currentDates.length - 1] }, 'id,user_id,leave_date,end_date,working_dates,portion'));
    }
    const leaves = await workflowData(client, leaveRows);
    const photos = [];
    for (let i = 0; i < users.length; i += 100) {
      photos.push(...await readAll(client, 'fm_user_preferences', 'user_id,photo_url',
        q => q.in('user_id', users.slice(i, i + 100).map(u => u.id)), 'user_id'));
    }
    const signed = new Map();
    for (let i = 0; i < photos.length; i += 20) {
      await Promise.all(photos.slice(i, i + 20).map(async photo => {
        if (!photo.photo_url) return;
        const raw = photo.photo_url;
        const legacy = raw.match(/\/object\/(?:public\/)?attachments\/(.+?)(?:\?|$)/);
        const path = legacy ? legacy[1] : !raw.startsWith('http') ? raw : null;
        if (!path) return;
        const result = await client.storage.from('attachments').createSignedUrl(path, 3600);
        if (result.error) throw result.error;
        signed.set(String(photo.user_id), result.data?.signedUrl);
      }));
    }
    return users.map(u => {
      const record = records.find(r => same(r.user_id, u.id)) || null;
      const day = today(record?.timezone || 'Asia/Tehran');
      return { ...u, photo_url: signed.get(String(u.id)), presence: record,
        onLeave: leaves.some(l => same(l.user_id, u.id) && l.decision === 'APPROVED' && leaveDates(l).includes(day)) };
    });
  };
  const audit = async (client, entity, id, action, before, after) => {
    try {
      check(await client.from('fm_record_logs').insert({ entity_type: entity, record_id: String(id), action,
        user_name: actor().username || 'system', details: `${entity}: ${action}`,
        old_data: before || null, new_data: after || null }));
      return null;
    } catch (e) { return e; }
  };
  const punch = async (client, security, code, userId, open, zone) => {
    assert(security, code, open ? 'canEdit' : 'canCreate');
    if (!same(userId, actor().id)) fail('ثبت حضور فقط برای خودتان مجاز است.', 'You can only record your own attendance.');
    const now = new Date().toISOString();
    const saved = open ? check(await client.from('gen_work_sessions').update({ ended_at: now })
      .eq('id', open.id).eq('user_id', actor().id).is('ended_at', null).select().single())
      : check(await client.from('gen_work_sessions').insert({ user_id: actor().id, started_at: now }).select().single());
    const auditError = await audit(client, 'gen_work_sessions', saved.id, open ? 'UPDATE' : 'INSERT', open, saved);
    let presenceError = null;
    const presenceRecord = { user_id: actor().id, is_online: !open,
      work_date: today(zone, now), timezone: zone, updated_at: now };
    try {
      check(await client.from('gen_employee_presence').upsert(presenceRecord, { onConflict: 'user_id' }));
    } catch (e) { presenceError = e; }
    return { saved, auditError, presenceError, presence: presenceRecord };
  };
  const saveLeave = (...args) => saveLeaveRequest(...args);
  // Prototype entitlement; no carryover or entitlement source currently exists in the data model.
  const annualAllowance = 22;
  // Display-calendar switches must not change the entitlement period or available balance.
  const allowanceCalendar = 'jalali';
  const yearRange = (date, mode) => {
    const year = window.DSCalendar.calendarParts(date, mode)[0];
    const key = y => {
      const p = mode === 'jalali' ? window.DSCore.j2g(y, 1, 1) : [y, 1, 1];
      return `${p[0]}-${String(p[1]).padStart(2, '0')}-${String(p[2]).padStart(2, '0')}`;
    };
    return { year, from: key(year), to: addDays(key(year + 1), -1) };
  };
  const leavePlan = (calendars, userId, draft) => {
    const from = normalizeDate(draft.leave_date);
    const to = draft.portion === 'FULL' ? normalizeDate(draft.end_date || draft.leave_date) : from;
    if (!from || !to || !['FULL', 'FIRST_HALF', 'SECOND_HALF'].includes(draft.portion))
      fail('تاریخ و نوع مرخصی را مشخص کنید.', 'Choose a date and leave portion.');
    if (to < from) fail('تاریخ پایان باید پس از تاریخ شروع باشد.', 'End date must not precede start date.');
    const dates = [];
    let holidays = 0;
    let missingCalendar = false;
    const picked = draft.portion === 'FULL' && Array.isArray(draft.selected_dates) && draft.selected_dates.length
      ? new Set(draft.selected_dates.map(normalizeDate)) : null;
    if (picked && [...picked].some(day => !day || day < from || day > to))
      fail('روزهای انتخاب‌شده باید داخل بازهٔ تاریخ باشند.', 'Selected days must be within the date range.');
    for (let day = from; day <= to; day = addDays(day, 1)) {
      if (picked && !picked.has(day)) continue;
      const calendar = schedule(calendars, userId, day);
      const work = workDay(calendar, day);
      if (!calendar) missingCalendar = true;
      if (!work || work.working) dates.push(day);
      else holidays++;
    }
    return { from, to, dates, holidays, missingCalendar, days: dates.length * (draft.portion === 'FULL' ? 1 : 0.5) };
  };
  const leaveBalance = (leaves, period, currentDay, excludeId) => {
    let approved = 0, pending = 0, used = 0;
    leaves.filter(l => !same(l.id, excludeId)).forEach(l => {
      const dates = leaveDates(l).filter(d => d >= period.from && d <= period.to);
      const weight = l.portion === 'FULL' ? 1 : 0.5;
      if (l.decision === 'APPROVED') {
        approved += dates.length * weight;
        used += dates.filter(d => d <= currentDay).length * weight;
      } else if (l.decision !== 'REJECTED') pending += dates.length * weight;
    });
    return { ...period, allowance: annualAllowance, remaining: annualAllowance - approved,
      available: annualAllowance - approved - pending, pending, used, reserved: approved - used };
  };
  const leaveContext = async (client, security, code, userId, draft) => {
    assert(security, code, 'canView');
    if (!security.isFullAccess && !same(userId, actor().id)) fail('دسترسی مجاز نیست.', 'Access denied.');
    const from = normalizeDate(draft.leave_date);
    const to = draft.portion === 'FULL' ? normalizeDate(draft.end_date || from) : from;
    if (!from || !to || to < from) fail('بازهٔ تاریخ معتبر نیست.', 'Invalid date range.');
    const first = yearRange(from, allowanceCalendar), last = yearRange(to, allowanceCalendar);
    const [calendars, rows] = await Promise.all([
      readAll(client, 'gen_work_calendars', '*', q => q.contains('user_ids', JSON.stringify([String(userId)]))),
      readLeaves(client, userId, { from: first.from, to: last.to })
    ]);
    const leaves = await workflowData(client, rows);
    const balances = [];
    for (let day = first.from; day <= last.to;) {
      const period = yearRange(day, allowanceCalendar);
      const zone = schedule(calendars, userId, day)?.timezone || calendars[0]?.timezone || 'Asia/Tehran';
      balances.push(leaveBalance(leaves, period, today(zone)));
      day = addDays(period.to, 1);
    }
    return { calendars, leaves, balances, rangeSchemaAvailable: leaveSchemas.get(client) === true };
  };
  const saveLeaveRequest = async (client, security, code, userId, draft) => {
    assert(security, code, draft.id ? 'canEdit' : 'canCreate');
    if (!same(userId, actor().id)) fail('ثبت مرخصی فقط برای خودتان مجاز است.', 'You can only request your own leave.');
    const context = await leaveContext(client, security, code, userId, draft);
    if (!context.rangeSchemaAvailable) fail('برای ثبت مرخصی، ابتدا migration مربوط به بازهٔ مرخصی را اجرا کنید.',
      'Run the leave-range migration before saving leave requests.');
    const plan = leavePlan(context.calendars, userId, draft);
    if (!plan.days) fail('بازهٔ انتخاب‌شده روز کاری ندارد.', 'The selected range has no working days.');
    let existing = null;
    if (draft.id) {
      existing = check(await client.from('gen_employee_leaves').select('*').eq('id', draft.id).eq('user_id', userId).single());
      const [live] = await workflowData(client, [existing]);
      if (!['DRAFT', 'PENDING'].includes(live.decision)) fail('مرخصی تعیین تکلیف شده قابل ویرایش نیست.', 'Decided leave cannot be edited.');
      if (draft.updated_at !== existing.updated_at) fail('مرخصی تغییر کرده است؛ صفحه را تازه کنید.', 'Leave changed; refresh the page.');
    }
    if (context.leaves.some(l => leaveDates(l).some(d => plan.dates.includes(d)) && !same(l.id, draft.id)))
      fail('برای یکی از روزهای انتخاب‌شده قبلاً مرخصی ثبت شده است.', 'A leave request already exists on a selected day.');
    for (const period of context.balances) {
      const balance = leaveBalance(context.leaves, period, today(), draft.id);
      const requested = plan.dates.filter(d => d >= period.from && d <= period.to).length * (draft.portion === 'FULL' ? 1 : 0.5);
      if (requested > balance.available) fail('ماندهٔ قابل درخواست در این سال کافی نیست.', 'Available leave balance for this year is insufficient.');
    }
    const payload = { user_id: actor().id, leave_date: plan.from, end_date: plan.to, working_dates: plan.dates,
      portion: draft.portion, notes: String(draft.notes || '').trim(), updated_at: new Date().toISOString() };
    if (!existing) payload.code = await window.AutoNumberingService.consumeNext('EMPLOYEE_LEAVE');
    const saved = existing ? check(await client.from('gen_employee_leaves').update(payload).eq('id', existing.id)
      .eq('user_id', userId).eq('updated_at', existing.updated_at).select().single())
      : check(await client.from('gen_employee_leaves').insert(payload).select().single());
    return { saved, auditError: await audit(client, 'gen_employee_leaves', saved.id, existing ? 'UPDATE' : 'INSERT', existing, saved) };
  };
  const submitLeave = async (client, security, code, leave) => {
    assert(security, code, 'canEdit');
    if (!same(leave.user_id, actor().id)) fail('دسترسی مجاز نیست.', 'Access denied.');
    const current = check(await client.from('gen_employee_leaves').select('*').eq('id', leave.id).eq('user_id', actor().id).single());
    const [live] = await workflowData(client, [current]);
    if (live.workflow_id) fail('این مرخصی قبلاً ارسال شده است.', 'Leave was already submitted.');
    const result = await window.WorkflowEngine.startProcess('GEN_EMPLOYEE_LEAVE', live.id, live, String(actor().id));
    if (!result.success) fail(result.message || result.error, result.error || result.message);
    const verified = check(await client.schema('wf').from('wf_instances').select('id,status').eq('id', result.instanceId).single());
    const pending = check(await client.schema('wf').from('wf_tasks').select('id').eq('instance_id', verified.id).eq('status', 'PENDING'));
    if (!pending?.length) fail('مرخصی ثبت شد اما وظیفه تأیید ایجاد نشد؛ گردش کار را بررسی کنید.', 'Leave saved, but no pending approval task was created. Check workflow configuration.');
    return { auditError: await audit(client, 'gen_employee_leaves', live.id, 'SUBMIT', live, { workflow_id: verified.id }) };
  };
  window.EmployeeDashboardLogic = { check, fail, actor, same, assert, normalizeDate, readAll, today, midnight,
    duration, time, daySummary, leaveDates, schedule, workDay, directory, load, presence, punch, saveLeave, submitLeave, audit,
    annualAllowance, allowanceCalendar, yearRange, leavePlan, leaveBalance, leaveContext, saveLeaveRequest, resetLeaveSchema };
})();
