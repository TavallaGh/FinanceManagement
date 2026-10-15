(() => {
  const { useState, useEffect, useRef, useCallback } = window.React;
  const { PageHeader, Button, Skeleton, useCalendarMode, formatGlobalDate } = window.DSCore;
  const { TextField, DatePicker, ToggleField } = window.DSForms;
  const { AdvancedFilter, DataGrid, LOVField } = window.DSGrid;
  const { Alert, Modal, Toast } = window.DSFeedback;
  const L = window.EmployeeDashboardLogic;
  const FallbackIcon = ({ size = 16 }) => <span style={{ width: size, height: size }} />;
  const { CalendarDays = FallbackIcon, Edit = FallbackIcon, RefreshCw = FallbackIcon } = window.LucideIcons || {};
  const weekNames = [['یکشنبه', 'Sunday'], ['دوشنبه', 'Monday'], ['سه‌شنبه', 'Tuesday'], ['چهارشنبه', 'Wednesday'],
    ['پنجشنبه', 'Thursday'], ['جمعه', 'Friday'], ['شنبه', 'Saturday']];
  const validate = (draft, calendars) => {
    if (!draft.title.trim()) L.fail('عنوان تقویم الزامی است.', 'Calendar title is required.');
    const from = L.normalizeDate(draft.valid_from);
    const to = L.normalizeDate(draft.valid_to);
    if (!from || (to && to < from)) L.fail('بازه اعتبار معتبر نیست.', 'Invalid validity range.');
    new Intl.DateTimeFormat('en', { timeZone: draft.timezone }).format(new Date());
    if (!draft.user_ids.length) L.fail('حداقل یک کاربر انتخاب کنید.', 'Select at least one user.');
    const validateHours = item => {
      if (item.working && (!/^\d{2}:\d{2}$/.test(item.start) || !/^\d{2}:\d{2}$/.test(item.end)
        || Number(item.start.slice(0, 2)) > 23 || Number(item.end.slice(0, 2)) > 23
        || Number(item.start.slice(3)) > 59 || Number(item.end.slice(3)) > 59 || item.end <= item.start))
        L.fail('ساعات کاری باید در همان روز و پایان پس از شروع باشد.', 'Work hours must end after start within the same day.');
    };
    draft.week.forEach(validateHours);
    const dates = new Set();
    draft.exceptions.forEach(e => {
      const date = L.normalizeDate(e.date);
      if (!date || date < from || (to && date > to) || dates.has(date)) L.fail('تاریخ استثنا خارج از بازه یا تکراری است.', 'Exception date is outside validity or duplicated.');
      dates.add(date); validateHours(e);
    });
    if (calendars.some(c => !L.same(c.id, draft.id) && c.valid_from <= (to || '9999-12-31')
      && (!c.valid_to || c.valid_to >= from) && c.user_ids.some(id => draft.user_ids.includes(String(id)))))
      L.fail('برای کاربران انتخاب‌شده تقویم با اعتبار هم‌پوشان وجود دارد.', 'Selected users already have an overlapping calendar.');
    return { title: draft.title.trim(), timezone: draft.timezone, valid_from: from, valid_to: to,
      user_ids: [...new Set(draft.user_ids.map(String))], week: draft.week,
      exceptions: draft.exceptions.map(e => ({ ...e, date: L.normalizeDate(e.date) })), updated_at: new Date().toISOString() };
  };
  const WorkCalendars = ({ language = 'fa', formCode = 'work_calendars' }) => {
    const security = window.SecurityManager.useSecurity();
    const access = security.getActions(formCode);
    const mode = useCalendarMode();
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [rows, setRows] = useState([]);
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState({});
    const [draftFilter, setDraftFilter] = useState({});
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ isVisible: false });
    const sequence = useRef(0);
    const saving = useRef(false);
    const mounted = useRef(true);
    const toastTimer = useRef(null);
    const notify = (message, type = 'success') => {
      if (!mounted.current) return;
      clearTimeout(toastTimer.current); setToast({ isVisible: true, message, type });
      toastTimer.current = setTimeout(() => { if (mounted.current) setToast({ isVisible: false }); }, 5000);
    };
    const refresh = useCallback(async () => {
      const token = ++sequence.current;
      setLoading(true); setError('');
      try {
        L.assert(security, formCode, 'canView');
        const [calendars, directory] = await Promise.all([L.readAll(window.supabase, 'gen_work_calendars', '*'), L.directory(window.supabase)]);
        if (mounted.current && token === sequence.current) { setRows(calendars); setUsers(directory); }
      } catch (e) { if (mounted.current && token === sequence.current) setError(isRtl ? e.fa || e.message : e.message); }
      finally { if (mounted.current && token === sequence.current) setLoading(false); }
    }, [security, formCode, language]);
    useEffect(() => {
      mounted.current = true;
      if (access.canView) refresh();
      return () => { mounted.current = false; sequence.current++; clearTimeout(toastTimer.current); };
    }, [refresh, access.canView]);
    const create = () => setDraft({ title: '', timezone: 'Asia/Tehran', valid_from: L.today(), valid_to: '', user_ids: [],
      week: weekNames.map((_, day) => ({ day, working: day !== 5, start: '09:00', end: '17:00' })), exceptions: [] });
    const save = async () => {
      if (saving.current) return;
      saving.current = true; setBusy(true);
      try {
        L.assert(security, formCode, draft.id ? 'canEdit' : 'canCreate');
        const live = await L.readAll(window.supabase, 'gen_work_calendars', '*');
        const original = live.find(r => L.same(r.id, draft.id));
        if (draft.id && (!original || original.updated_at !== draft.updated_at)) L.fail('تقویم تغییر کرده است؛ صفحه را تازه کنید.', 'Calendar changed; refresh the page.');
        const payload = validate(draft, live);
        if (!draft.id) payload.code = await window.AutoNumberingService.consumeNext('WORK_CALENDAR');
        const saved = draft.id ? L.check(await window.supabase.from('gen_work_calendars').update(payload)
          .eq('id', draft.id).eq('updated_at', draft.updated_at).select().single())
          : L.check(await window.supabase.from('gen_work_calendars').insert(payload).select().single());
        const auditError = await L.audit(window.supabase, 'gen_work_calendars', saved.id, draft.id ? 'UPDATE' : 'INSERT', original, saved);
        if (mounted.current) setDraft(null);
        notify(auditError ? t('تقویم ذخیره شد؛ ثبت لاگ ناموفق بود.', 'Calendar saved; audit logging failed.')
          : t('تقویم کاری ذخیره شد.', 'Work calendar saved.'), auditError ? 'warning' : 'success');
        await refresh();
      } catch (e) { notify(isRtl ? e.fa || e.message : e.message, 'error'); }
      finally { saving.current = false; if (mounted.current) setBusy(false); }
    };
    const updateDay = (index, patch) => setDraft(prev => ({ ...prev, week: prev.week.map((d, i) => i === index ? { ...d, ...patch } : d) }));
    const updateException = (index, patch) => setDraft(prev => ({ ...prev, exceptions: prev.exceptions.map((d, i) => i === index ? { ...d, ...patch } : d) }));
    const timeFields = (item, update) => <>
      <TextField type="time" size="sm" label={t('شروع', 'Start')} value={item.start} disabled={busy || !item.working} isRtl={isRtl} onChange={e => update({ start: e.target.value })} />
      <TextField type="time" size="sm" label={t('پایان', 'End')} value={item.end} disabled={busy || !item.working} isRtl={isRtl} onChange={e => update({ end: e.target.value })} />
    </>;
    const filtered = rows.filter(r => !filter.search || `${r.code} ${r.title}`.toLowerCase().includes(String(filter.search).toLowerCase()));
    if (!access.canView) return <Alert type="error" message={t('دسترسی مجاز نیست.', 'Access denied.')} />;
    return <div className="h-full flex flex-col p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader title={t('تقویم‌های کاری', 'Work calendars')} icon={CalendarDays} language={language}
        actions={<Button size="sm" variant="outline" icon={RefreshCw} onClick={refresh} disabled={busy || loading}>{t('تازه‌سازی', 'Refresh')}</Button>} />
      <AdvancedFilter language={language} initialValues={draftFilter} onFilter={setDraftFilter} onSearch={setFilter}
        onClear={() => { setFilter({}); setDraftFilter({}); }} fields={[{ name: 'search', label: t('کد یا عنوان', 'Code or title') }]} />
      {error && <Alert type="error" message={error} />}
      {loading ? <Skeleton height="240px" /> : !error && <DataGrid data={filtered} language={language} formCode={formCode} hideImport hideExport
        onAdd={access.canCreate && !busy ? create : undefined}
        columns={[{ field: 'code', header_fa: 'کد', header_en: 'Code' }, { field: 'title', header_fa: 'عنوان', header_en: 'Title' },
          { field: 'timezone', header_fa: 'منطقه زمانی', header_en: 'Time zone' },
          { field: 'valid_from', header_fa: 'معتبر از', header_en: 'Valid from', render: value => formatGlobalDate(value, mode) },
          { field: 'valid_to', header_fa: 'معتبر تا', header_en: 'Valid until', render: value => value ? formatGlobalDate(value, mode) : '—' },
          { field: 'user_ids', header_fa: 'کاربران', header_en: 'Users', render: value => value.map(id => users.find(u => L.same(u.id, id))?.name || id).join(isRtl ? '، ' : ', ') }]}
        actions={access.canEdit ? [{ id: 'edit', icon: Edit, tooltip: t('ویرایش', 'Edit'), hidden: () => busy,
          onClick: row => setDraft(JSON.parse(JSON.stringify(row))) }] : []} />}
      <Modal isOpen={!!draft} onClose={() => { if (!busy) setDraft(null); }} language={language} title={t('تعریف تقویم کاری', 'Define work calendar')} width="max-w-4xl">
        {draft && <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField size="sm" label={t('عنوان', 'Title')} value={draft.title} onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))} disabled={busy} isRtl={isRtl} required />
            <TextField size="sm" label={t('منطقه زمانی IANA', 'IANA time zone')} value={draft.timezone} onChange={e => setDraft(prev => ({ ...prev, timezone: e.target.value }))} disabled={busy} isRtl={isRtl} required />
            <DatePicker size="sm" label={t('معتبر از', 'Valid from')} value={draft.valid_from} onChange={v => setDraft(prev => ({ ...prev, valid_from: v }))} disabled={busy} isRtl={isRtl} language={language} required />
            <DatePicker size="sm" label={t('معتبر تا', 'Valid until')} value={draft.valid_to} onChange={v => setDraft(prev => ({ ...prev, valid_to: v }))} disabled={busy} isRtl={isRtl} language={language} />
          </div>
          <LOVField label={t('تخصیص به کاربران', 'Assign to users')} multiple data={users}
            columns={[{ field: 'name', header_fa: 'نام', header_en: 'Name' }, { field: 'username', header_fa: 'نام کاربری', header_en: 'Username' }]}
            selectedValues={draft.user_ids} displayValue={t(`${draft.user_ids.length} کاربر انتخاب شده`, `${draft.user_ids.length} users selected`)}
            onChange={v => setDraft(prev => ({ ...prev, user_ids: (v || []).map(item => String(item?.id ?? item)) }))} disabled={busy} isRtl={isRtl} size="sm" />
          <Alert type="info" message={t('نیمه اول و دوم مرخصی، دو نیمه مساوی بازه کاری همان روز هستند. زمان حضور مستقل از ساعات برنامه ثبت می‌شود.', 'Half-day leave divides the scheduled work interval equally. Attendance records actual time.')} />
          <div className="space-y-3">
            {draft.week.map((day, index) => <div key={day.day} className="grid grid-cols-3 gap-3 items-center border-b border-slate-100 dark:border-slate-700 pb-2">
              <ToggleField label={t(...weekNames[day.day])} checked={day.working} onChange={v => updateDay(index, { working: v })} disabled={busy} isRtl={isRtl} />
              {timeFields(day, patch => updateDay(index, patch))}
            </div>)}
          </div>
          <div className="flex justify-between items-center"><span className="font-bold text-sm text-slate-700 dark:text-slate-200">{t('تعطیلی‌ها و ساعات استثنا', 'Holidays and exceptions')}</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft(prev => ({ ...prev, exceptions: [...prev.exceptions,
              { date: '', title: '', working: false, start: '09:00', end: '17:00' }] }))}>{t('افزودن تاریخ', 'Add date')}</Button></div>
          {draft.exceptions.map((item, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <DatePicker size="sm" label={t('تاریخ', 'Date')} value={item.date} onChange={v => updateException(index, { date: v })} disabled={busy} isRtl={isRtl} language={language} />
            <TextField size="sm" label={t('عنوان', 'Title')} value={item.title} onChange={e => updateException(index, { title: e.target.value })} disabled={busy} isRtl={isRtl} />
            <ToggleField label={t('روز کاری', 'Working day')} checked={item.working} onChange={v => updateException(index, { working: v })} disabled={busy} isRtl={isRtl} />
            {timeFields(item, patch => updateException(index, patch))}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft(prev => ({ ...prev, exceptions: prev.exceptions.filter((_, i) => i !== index) }))}>{t('حذف استثنا', 'Remove exception')}</Button>
          </div>)}
          <div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" isLoading={busy} onClick={save}>{t('ذخیره', 'Save')}</Button></div>
        </div>}
      </Modal>
      <Toast {...toast} onClose={() => setToast({ isVisible: false })} />
    </div>;
  };
  WorkCalendars.formCode = 'work_calendars';
  window.WorkCalendars = WorkCalendars;
  window.WorkCalendarsLogic = { validate };
})();
