/* Employee persistence for the browser prototype; shared identity lives in parties. */
(() => {
  const table = 'gen_employees';
  const partyColumns = 'id,code,party_type,first_name,last_name,company_name,national_id,latin_title,mobile,email,roles,is_active,updated_at';
  const userColumns = 'id,username,party_id,is_active,email,mobile,created_at';
  const statuses = [
    { value: 'ACTIVE', fa: 'شاغل', en: 'Active', variant: 'emerald' },
    { value: 'ON_LEAVE', fa: 'مرخصی', en: 'On leave', variant: 'amber' },
    { value: 'SUSPENDED', fa: 'تعلیق', en: 'Suspended', variant: 'slate' },
    { value: 'TERMINATED', fa: 'پایان همکاری', en: 'Terminated', variant: 'red' }
  ];
  const check = result => {
    if (result.error) throw result.error;
    return result.data;
  };
  const same = (a, b) => String(a ?? '') === String(b ?? '');
  const text = value => String(value ?? '').trim();
  const digits = value => text(value).replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
  const fail = (fa, en) => {
    const error = new Error(en);
    error.fa = fa;
    throw error;
  };
  const actor = () => {
    try { return JSON.parse(window.sessionStorage.getItem('fm_user_session') || '{}'); }
    catch (_error) { return {}; }
  };
  const assert = (security, code, operation) => {
    if (!security?.getActions(code)?.[operation]) fail('دسترسی مجاز نیست.', 'Access denied.');
  };
  const normalizeDate = value => {
    if (value == null || value === '') return null;
    const v = digits(value).replaceAll('/', '-');
    const match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) fail('تاریخ باید میلادی و به صورت YYYY-MM-DD باشد.', 'Use a Gregorian YYYY-MM-DD date.');
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (year < 1900 || year > 2200 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
      fail('تاریخ معتبر نیست.', 'Invalid date.');
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  const readAll = async (client, name, columns, configure = q => q) => {
    const rows = [];
    for (let offset = 0; ;) {
      const result = await configure(client.from(name).select(columns, { count: 'exact' }))
        .order('id', { ascending: true }).range(offset, offset + 499);
      const page = check(result) || [];
      rows.push(...page);
      if (result.count != null ? rows.length >= result.count : page.length === 0) return rows;
      if (!page.length) fail('دریافت اطلاعات کامل نشد.', 'Incomplete source pagination.');
      offset += page.length;
    }
  };
  const scoped = (query, security, code) => {
    if (security.isFullAccess) return query;
    const scope = security.getDataScope(code);
    if (Array.isArray(scope)) {
      if (scope.includes('*')) return query;
      return query.in('id', scope.length ? scope : ['00000000-0000-0000-0000-000000000000']);
    }
    const supported = ['own_data_only', 'party_id', 'party_ids', 'id', 'employee_ids'];
    if (Object.keys(scope || {}).some(key => !supported.includes(key)))
      fail('دامنه دسترسی این فرم پشتیبانی نشده است.', 'Unsupported employee data scope.');
    if (scope?.own_data_only === true || scope?.own_data_only?.includes?.(true)) {
      if (!actor().id) fail('نشست کاربری معتبر نیست.', 'Invalid user session.');
      query = query.eq('created_by', String(actor().id));
    }
    for (const [keys, column] of [[['party_id', 'party_ids'], 'party_id'], [['id', 'employee_ids'], 'id']]) {
      const key = keys.find(k => Object.prototype.hasOwnProperty.call(scope || {}, k));
      if (!key) continue;
      const values = Array.isArray(scope[key]) ? scope[key] : [scope[key]];
      if (!values.includes('*')) query = query.in(column, values.length ? values : ['00000000-0000-0000-0000-000000000000']);
    }
    return query;
  };
  const byIds = async (client, name, column, ids, columns) => {
    const rows = [];
    const unique = [...new Set(ids.filter(id => id != null).map(String))];
    for (let offset = 0; offset < unique.length; offset += 100) {
      rows.push(...await readAll(client, name, columns, q => q.in(column, unique.slice(offset, offset + 100))));
    }
    return rows;
  };
  const load = async (client, security, code) => {
    assert(security, code, 'canView');
    const [records, employeeParties, menus] = await Promise.all([
      readAll(client, table, '*', q => scoped(q, security, code)),
      readAll(client, 'parties', partyColumns, q => q.contains('roles', JSON.stringify(['employee']))),
      readAll(client, 'menus', 'id,unique_code,component_path')
    ]);
    const historical = await byIds(client, 'parties', 'id', records.map(r => r.party_id)
      .filter(id => !employeeParties.some(p => same(p.id, id))), partyColumns);
    const parties = [...employeeParties, ...historical];
    const users = await byIds(client, 'sec_users', 'party_id', parties.map(p => p.id), userColumns);
    return { records, parties, users, menus };
  };
  const codeFor = (context, name) => context.menus.find(m =>
    String(m.component_path || '').split('/').pop().replace(/\.js$/i, '') === name)?.unique_code;
  const name = party => party?.party_type === 'legal' ? party.company_name || ''
    : `${party?.first_name || ''} ${party?.last_name || ''}`.trim();
  const activeUsers = (context, partyId) => context.users
    .filter(u => same(u.party_id, partyId) && u.is_active === true)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.id).localeCompare(String(b.id)));
  const draft = (context, partyId, record = {}) => {
    const party = context.parties.find(p => same(p.id, partyId));
    const user = Object.prototype.hasOwnProperty.call(record, 'user_id')
      ? context.users.find(u => same(u.id, record.user_id)) : activeUsers(context, partyId)[0];
    return {
      id: record.id || null, code: record.code || '', party_id: partyId || '', user_id: user?.id || '',
      first_name: party?.first_name || '', last_name: party?.last_name || '', company_name: party?.company_name || '',
      mobile: party?.mobile || user?.mobile || '', email: party?.email || user?.email || '',
      father_name: record.father_name || '', birth_date: record.birth_date || '', start_date: record.start_date || '',
      end_date: record.end_date || '', status: record.status || 'ACTIVE', job_title: record.job_title || '',
      notes: record.notes || '', updated_at: record.updated_at || null
    };
  };
  const hydrate = (context, record) => {
    const party = context.parties.find(p => same(p.id, record.party_id));
    const user = context.users.find(u => same(u.id, record.user_id));
    return { ...record, party_name: name(party), party_code: party?.code || '',
      first_name: party?.first_name || '', last_name: party?.last_name || '', company_name: party?.company_name || '',
      national_id: party?.national_id || '', username: user?.username || '',
      mobile: party?.mobile || user?.mobile || '', email: party?.email || user?.email || '' };
  };
  const validate = (context, form) => {
    const party = context.parties.find(p => same(p.id, form.party_id));
    if (!party || (!party.roles?.includes('employee') && !context.records.some(r => same(r.id, form.id) && same(r.party_id, party.id))))
      fail('شخص دارای نقش کارمند را انتخاب کنید.', 'Select an employee party.');
    if (context.records.some(r => same(r.party_id, form.party_id) && !same(r.id, form.id)))
      fail('این شخص قبلاً به عنوان کارمند ثبت شده است.', 'Employee already exists for this party.');
    if (form.user_id) {
      const user = context.users.find(u => same(u.id, form.user_id));
      const existing = context.records.find(r => same(r.id, form.id));
      if (!user || !same(user.party_id, form.party_id) || (!user.is_active && !same(existing?.user_id, user.id)))
        fail('کاربر باید فعال و متصل به شخص انتخابی باشد.', 'Select an active user linked to this party.');
    }
    if (party.party_type === 'legal' ? !text(form.company_name) : !text(form.last_name))
      fail('نام خانوادگی یا نام شرکت الزامی است.', 'Last name or company name is required.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(form.email))) fail('ایمیل معتبر نیست.', 'Invalid email.');
    if (form.mobile && !/^\+?[0-9]{8,15}$/.test(digits(form.mobile))) fail('شماره موبایل معتبر نیست.', 'Invalid mobile number.');
    if (!statuses.some(s => s.value === form.status)) fail('وضعیت معتبر نیست.', 'Invalid status.');
    const birth = normalizeDate(form.birth_date);
    const start = normalizeDate(form.start_date);
    const end = normalizeDate(form.end_date);
    if (!start) fail('تاریخ شروع به کار الزامی است.', 'Start date is required.');
    if (birth && birth >= start) fail('تولد باید پیش از شروع به کار باشد.', 'Birth must precede employment.');
    if (end && end < start) fail('پایان همکاری پیش از شروع است.', 'End date precedes start date.');
    if (form.status === 'TERMINATED' && !end) fail('تاریخ پایان همکاری الزامی است.', 'Termination date is required.');
    return { party, birth, start, end };
  };
  const audit = async (client, entity, id, action, before, after) => {
    const user = actor();
    try {
      check(await client.from('fm_record_logs').insert({ entity_type: entity, record_id: String(id), action,
        user_name: user.username || user.name || 'system', details: `${entity}: ${action}`,
        old_data: before || null, new_data: after || null }));
      return null;
    } catch (error) { return error; }
  };
  const save = async (client, security, code, context, form) => {
    assert(security, code, form.id ? 'canEdit' : 'canCreate');
    const { party, birth, start, end } = validate(context, form);
    const original = context.records.find(r => same(r.id, form.id));
    if (form.id && !original) fail('رکورد در دامنه مجاز نیست.', 'Record is outside the permitted scope.');
    if (!security.isFullAccess) {
      const scope = security.getDataScope(code);
      const rawIds = Array.isArray(scope) ? scope : scope?.id || scope?.employee_ids;
      const allowedIds = rawIds == null ? null : Array.isArray(rawIds) ? rawIds : [rawIds];
      if (!form.id && allowedIds && !allowedIds.includes('*')) fail('تعریف کارمند خارج از دامنه مجاز است.', 'Creation is outside the permitted scope.');
      const rawPartyIds = scope?.party_id || scope?.party_ids;
      const partyIds = rawPartyIds == null ? null : Array.isArray(rawPartyIds) ? rawPartyIds : [rawPartyIds];
      if (partyIds && !partyIds.includes('*') && !partyIds.some(id => same(id, party.id)))
        fail('شخص خارج از دامنه مجاز است.', 'Party is outside the permitted scope.');
    }
    const originalDraft = draft(context, party.id, { ...original, user_id: form.user_id || null });
    const fields = party.party_type === 'legal' ? ['company_name', 'mobile', 'email'] : ['first_name', 'last_name', 'mobile', 'email'];
    const changed = fields.filter(key => text(form[key]) !== text(originalDraft[key]));
    if (changed.length) assert(security, codeFor(context, 'Parties'), 'canEdit');
    const timestamp = new Date().toISOString();
    const identity = Object.fromEntries(changed.map(key => [key, key === 'mobile' ? digits(form[key]) : text(form[key])]));
    let partySaved = null;
    if (changed.length) {
      let q = client.from('parties').update({ ...identity, updated_at: timestamp }).eq('id', party.id);
      q = party.updated_at ? q.eq('updated_at', party.updated_at) : q.is('updated_at', null);
      partySaved = check(await q.select(partyColumns).single());
    }
    let saved;
    try {
      const payload = { party_id: party.id, user_id: form.user_id || null, father_name: text(form.father_name),
        birth_date: birth, start_date: start, end_date: end, status: form.status,
        job_title: text(form.job_title), notes: text(form.notes), updated_at: timestamp };
      if (form.id) {
        let q = scoped(client.from(table).update(payload).eq('id', form.id), security, code);
        q = form.updated_at ? q.eq('updated_at', form.updated_at) : q.is('updated_at', null);
        saved = check(await q.select('*').single());
      } else {
        const number = await window.AutoNumberingService.consumeNext('EMPLOYEE');
        saved = check(await client.from(table).insert({ ...payload, code: number.formattedCode,
          created_by: String(actor().id || '') }).select('*').single());
      }
    } catch (error) {
      if (partySaved) {
        const restore = Object.fromEntries(changed.map(key => [key, party[key] ?? null]));
        const rollback = await client.from('parties').update({ ...restore, updated_at: party.updated_at })
          .eq('id', party.id).eq('updated_at', timestamp).select('id');
        if (rollback.error || rollback.data?.length !== 1) {
          await audit(client, 'اشخاص و شرکت‌ها', party.id, 'update', party, partySaved);
          fail('ثبت کارمند ناموفق بود؛ تغییرات شخص باقی مانده است. اطلاعات را دوباره دریافت کنید.',
            'Employee save failed; shared party changes remain. Reload before retrying.');
        }
      }
      throw error;
    }
    let auditError = await audit(client, 'اطلاعات کارکنان', saved.id, form.id ? 'update' : 'create', original, saved);
    if (partySaved) auditError = await audit(client, 'اشخاص و شرکت‌ها', party.id, 'update', party, partySaved) || auditError;
    return { saved, party: partySaved, auditError };
  };
  const quickParty = async (client, security, context, form) => {
    assert(security, codeFor(context, 'Parties'), 'canCreate');
    if (!text(form.latin_title) || (form.party_type === 'legal' ? !text(form.company_name) : !text(form.last_name)))
      fail('عنوان لاتین و نام شخص یا شرکت الزامی است.', 'Latin title and party name are required.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(form.email))) fail('ایمیل معتبر نیست.', 'Invalid email.');
    if (form.mobile && !/^\+?[0-9]{8,15}$/.test(digits(form.mobile))) fail('شماره موبایل معتبر نیست.', 'Invalid mobile number.');
    const normalizeName = value => text(value).replace(/ي/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[^a-zA-Zآابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئءؤإأ]/g, '').toLowerCase();
    const requestedName = normalizeName(form.party_type === 'legal' ? form.company_name : `${form.first_name || ''}${form.last_name || ''}`);
    const existing = await readAll(client, 'parties', 'id,party_type,first_name,last_name,company_name,latin_title');
    if (existing.some(p => text(p.latin_title).toLowerCase() === text(form.latin_title).toLowerCase() ||
      normalizeName(p.party_type === 'legal' ? p.company_name : `${p.first_name || ''}${p.last_name || ''}`) === requestedName))
      fail('نام یا عنوان لاتین شخص تکراری است.', 'Party name or Latin title already exists.');
    const number = await window.AutoNumberingService.consumeNext('PARTY');
    const payload = { code: number.formattedCode, party_type: form.party_type || 'real',
      first_name: text(form.first_name), last_name: text(form.last_name), company_name: text(form.company_name),
      latin_title: text(form.latin_title), national_id: digits(form.national_id), mobile: digits(form.mobile),
      email: text(form.email), roles: ['employee', 'system_user'], is_active: true, updated_at: new Date().toISOString() };
    const saved = check(await client.from('parties').insert(payload).select(partyColumns).single());
    return { saved, auditError: await audit(client, 'اشخاص و شرکت‌ها', saved.id, 'create', null, saved) };
  };
  const quickUser = async (client, security, context, form, partyId) => {
    assert(security, codeFor(context, 'UserManagement'), 'canCreate');
    const party = context.parties.find(p => same(p.id, partyId));
    if (!party) fail('ابتدا شخص را انتخاب کنید.', 'Select a party first.');
    if (!text(form.username) || !form.password || !text(form.email) || !text(form.mobile))
      fail('نام کاربری، رمز، ایمیل و موبایل الزامی است.', 'Username, password, email and mobile are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(form.email)) || !/^\+?[0-9]{8,15}$/.test(digits(form.mobile)))
      fail('ایمیل یا موبایل معتبر نیست.', 'Invalid email or mobile.');
    const buffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(form.password));
    const hash = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const payload = { username: text(form.username), password_hash: hash, party_id: party.id,
      full_name: name(party), user_type: 'کاربر سیستم', is_active: true, email: text(form.email),
      mobile: digits(form.mobile), updated_at: new Date().toISOString() };
    const saved = check(await client.from('sec_users').insert(payload).select(userColumns).single());
    return { saved, auditError: await audit(client, 'کاربران', saved.id, 'create', null, saved) };
  };
  const excelHeaders = ['party_code', 'username', 'father_name', 'birth_date', 'start_date', 'end_date', 'status', 'job_title', 'notes'];
  const template = () => {
    if (!window.XLSX) fail('ابزار اکسل در دسترس نیست.', 'Excel support is unavailable.');
    const book = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(book, window.XLSX.utils.aoa_to_sheet([excelHeaders]), 'Employee');
    window.XLSX.utils.book_append_sheet(book, window.XLSX.utils.aoa_to_sheet([
      ['فارسی', 'English'],
      ['party_code: کد شخص دارای نقش کارمند (الزامی)', 'party_code: existing employee party code (required)'],
      ['username: خالی برای اولین کاربر فعال متصل', 'username: blank selects first linked active user'],
      ['start_date: تاریخ میلادی YYYY-MM-DD (الزامی)', 'start_date: Gregorian YYYY-MM-DD (required)'],
      ['birth_date و end_date: تاریخ میلادی YYYY-MM-DD', 'birth_date and end_date: Gregorian YYYY-MM-DD'],
      ['status: ACTIVE / ON_LEAVE / SUSPENDED / TERMINATED', 'status: ACTIVE / ON_LEAVE / SUSPENDED / TERMINATED'],
      ['نام و اطلاعات تماس از شخص خوانده می‌شوند', 'Names and contacts are read from the linked party']
    ]), 'Guide');
    window.XLSX.writeFile(book, 'Employee.xlsx');
  };
  const importRows = async (file, context) => {
    if (!window.XLSX) fail('ابزار اکسل در دسترس نیست.', 'Excel support is unavailable.');
    if (file.size > 5 * 1024 * 1024) fail('حداکثر اندازه فایل ۵ مگابایت است.', 'Maximum file size is 5 MB.');
    const book = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = book.Sheets.Employee || book.Sheets[book.SheetNames[0]];
    if (!sheet) fail('فایل فاقد برگه اطلاعات است.', 'No data sheet found.');
    const matrix = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });
    const headers = (matrix.shift() || []).map(text);
    if (!headers.includes('party_code') || !headers.includes('start_date') || new Set(headers).size !== headers.length)
      fail('ستون‌های فایل با نمونه اکسل سازگار نیستند.', 'Use the sample workbook columns.');
    if (matrix.length > 1000) fail('حداکثر ۱۰۰۰ ردیف در هر فایل مجاز است.', 'Maximum 1,000 rows per file.');
    const seen = new Set();
    return matrix.map((cells, index) => {
      if (!cells.some(v => text(v))) return null;
      const raw = Object.fromEntries(headers.map((key, i) => [key, cells[i]]));
      const party = context.parties.find(p => text(p.code) === text(raw.party_code));
      const form = { ...draft(context, party?.id), ...Object.fromEntries(excelHeaders.slice(2).map(key => [key, text(raw[key])])),
        status: text(raw.status) || 'ACTIVE' };
      let error = null;
      try {
        if (!party) fail('کد شخص دارای نقش کارمند یافت نشد.', 'Employee party code not found.');
        if (text(raw.username)) {
          const user = activeUsers(context, party.id).find(u => u.username === text(raw.username));
          if (!user) fail('کاربر فعال متصل به این شخص یافت نشد.', 'Linked active username not found.');
          form.user_id = user.id;
          form.mobile = party.mobile || user.mobile || '';
          form.email = party.email || user.email || '';
        }
        for (const key of ['birth_date', 'start_date', 'end_date']) {
          if (typeof raw[key] === 'number') {
            const parsed = window.XLSX.SSF.parse_date_code(raw[key]);
            if (!parsed) fail('تاریخ اکسل معتبر نیست.', 'Invalid Excel date.');
            form[key] = `${parsed.y}-${parsed.m}-${parsed.d}`;
          }
        }
        validate(context, form);
        if (seen.has(String(party.id))) fail('شخص در فایل تکرار شده است.', 'Duplicate party in workbook.');
        seen.add(String(party.id));
      } catch (e) { error = e; }
      return { ...form, preview_id: `excel-${index + 2}`, row_number: index + 2, party_code: text(raw.party_code),
        party_name: name(party), username: text(raw.username) || activeUsers(context, party?.id)[0]?.username || '', error };
    }).filter(Boolean);
  };
  window.EmployeeLogic = { table, statuses, same, text, fail, normalizeDate, load, scoped, codeFor, name,
    activeUsers, draft, hydrate, validate, save, quickParty, quickUser, template, importRows };
})();
