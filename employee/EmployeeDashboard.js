(() => {
  const { useState, useEffect, useRef, useCallback } = window.React;
  const { Button, PageHeader, Badge, Avatar, Tabs, Skeleton, EmptyState, useCalendarMode } = window.DSCore;
  const { SelectField, TextField } = window.DSForms;
  const { Alert, Toast } = window.DSFeedback;
  const { DailyOverview, MonthlyDaySummary, WeeklyDaySummary, AttendanceModal, LeaveModal } = window.EmployeeDashboardDetails;
  const { CalendarBoard, range, addDays, shiftMonth } = window.DSCalendar;
  const L = window.EmployeeDashboardLogic;
  const FallbackIcon = ({ size = 16 }) => <span style={{ width: size, height: size }} />;
  const { CalendarDays = FallbackIcon, ChevronLeft = FallbackIcon, ChevronRight = FallbackIcon,
    RefreshCw = FallbackIcon, LogIn = FallbackIcon, LogOut = FallbackIcon } = window.LucideIcons || {};
  const EmployeeDashboard = ({ language = 'fa', formCode = 'EMPLOYEE_DASHBOARD' }) => {
    const security = window.SecurityManager.useSecurity();
    const access = security.getActions(formCode);
    const mode = useCalendarMode();
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const ownId = String(L.actor().id || '');
    const [userId, setUserId] = useState(ownId);
    const [date, setDate] = useState(() => L.today());
    const [view, setView] = useState('day');
    const [returnView, setReturnView] = useState(null);
    const [data, setData] = useState(null);
    const [people, setPeople] = useState([]);
    const [users, setUsers] = useState([]);
    const [usersError, setUsersError] = useState('');
    const [peopleLoading, setPeopleLoading] = useState(true);
    const [presenceError, setPresenceError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [leave, setLeave] = useState(null);
    const [attendanceOpen, setAttendanceOpen] = useState(false);
    const [selectedDates, setSelectedDates] = useState([]);
    const [toast, setToast] = useState({ isVisible: false });
    const generation = useRef(0);
    const mounted = useRef(true);
    const saving = useRef(false);
    const presenceRevision = useRef(0);
    const toastTimer = useRef(null);
    const own = L.same(userId, ownId);
    const notify = (message, type = 'success') => {
      if (!mounted.current) return;
      clearTimeout(toastTimer.current);
      setToast({ isVisible: true, message, type });
      toastTimer.current = setTimeout(() => { if (mounted.current) setToast({ isVisible: false }); }, 5000);
    };
    const errorText = e => isRtl ? e.fa || e.message : e.message;
    const refresh = useCallback(async (quiet = false) => {
      if (!access.canView || !userId) return;
      const token = ++generation.current;
      if (!quiet) { setLoading(true); setError(''); }
      try {
        const result = await L.load(window.supabase, security, formCode, userId, range(date, view, mode));
        if (mounted.current && token === generation.current) { setData(result); setError(''); }
      } catch (e) {
        if (mounted.current && token === generation.current) { setData(null); setError(errorText(e)); }
      } finally { if (mounted.current && token === generation.current) setLoading(false); }
    }, [security, formCode, access.canView, userId, date, view, mode, language]);
    useEffect(() => {
      mounted.current = true;
      return () => { mounted.current = false; generation.current++; clearTimeout(toastTimer.current); };
    }, []);
    useEffect(() => {
      refresh();
      const timer = setInterval(() => { if (!saving.current) refresh(true); }, 30000);
      return () => { clearInterval(timer); generation.current++; };
    }, [refresh]);
    useEffect(() => {
      if (!access.canView) return;
      let active = true;
      let running = false;
      const loadPeople = async () => {
        if (running) return;
        running = true;
        const revision = presenceRevision.current;
        try {
          const next = await L.presence(window.supabase);
          if (active && revision === presenceRevision.current) { setPeople(next); setPresenceError(''); }
        } catch (e) { if (active && revision === presenceRevision.current) setPresenceError(errorText(e)); }
        finally { running = false; if (active) setPeopleLoading(false); }
      };
      loadPeople();
      const timer = setInterval(loadPeople, 30000);
      return () => { active = false; clearInterval(timer); };
    }, [access.canView, language]);
    useEffect(() => {
      if (!access.canView || !security.isFullAccess) return;
      let active = true;
      L.directory(window.supabase, true).then(next => {
        if (active) { setUsers(next); setUsersError(''); }
      }).catch(e => { if (active) setUsersError(errorText(e)); });
      return () => { active = false; };
    }, [access.canView, security.isFullAccess, language]);
    useEffect(() => {
      const timer = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(timer);
    }, []);
    const currentCalendar = data?.calendars.find(c => c.valid_from <= L.today(c.timezone, now)
      && (!c.valid_to || c.valid_to >= L.today(c.timezone, now)));
    const zone = currentCalendar?.timezone || 'Asia/Tehran';
    const currentDay = L.today(zone, now);
    const selectDate = next => { setDate(next); setSelectedDates([]); };
    const toggleDate = day => setSelectedDates(previous => previous.includes(day)
      ? previous.filter(d => d !== day) : [...previous, day].sort());
    const panelHeight = range(date, 'month', mode).dates.length / 7 * 104 + 106;
    const navigate = step => selectDate(view === 'month' ? shiftMonth(date, step, mode) : addDays(date, step * (view === 'week' ? 7 : 1)));
    const act = async operation => {
      if (saving.current) return;
      saving.current = true; setBusy(true);
      try {
        const result = await operation();
        if (result?.presence && mounted.current) {
          presenceRevision.current++;
          setPeople(previous => previous.map(person => L.same(person.id, ownId) ? { ...person, presence: result.presence } : person));
          if (!result.presenceError) setPresenceError('');
        }
        if (result?.presenceError) notify(t('حضور ثبت شد؛ به‌روزرسانی فهرست همکاران ناموفق بود.', 'Attendance saved; presence update failed.'), 'warning');
        else if (result?.auditError) notify(t('اطلاعات ذخیره شد؛ ثبت لاگ ناموفق بود.', 'Saved; audit logging failed.'), 'warning');
        else notify(t('عملیات با موفقیت انجام شد.', 'Saved successfully.'));
        if (mounted.current) setLeave(null);
      } catch (e) { notify(errorText(e), 'error'); }
      finally {
        saving.current = false;
        if (mounted.current) { setBusy(false); await refresh(true); }
      }
    };
    const portions = [
      { value: 'FULL', label: t('روز کامل', 'Full day') },
      { value: 'FIRST_HALF', label: t('نیمه اول روز', 'First half') },
      { value: 'SECOND_HALF', label: t('نیمه دوم روز', 'Second half') }
    ];
    const decisionLabel = status => ({ DRAFT: t('ثبت‌شده؛ ارسال نشده', 'Saved; not submitted'),
      PENDING: t('در انتظار بررسی', 'Pending'), APPROVED: t('تأیید شده', 'Approved'), REJECTED: t('رد شده', 'Rejected'),
      UNRESOLVED: t('گردش پایان یافته؛ نتیجه تعیین نشده', 'Workflow ended without a decision') })[status];
    const editLeave = () => {
      const dates = view !== 'day' && selectedDates.length ? selectedDates : [date];
      const existing = data?.leaves.find(record => dates.every(day => L.leaveDates(record).includes(day)));
      setLeave(existing ? { ...existing, selected_dates: L.leaveDates(existing) }
        : { leave_date: dates[0], end_date: dates[dates.length - 1], selected_dates: dates, portion: 'FULL', notes: '' });
    };
    const dayData = day => {
      const calendar = L.schedule(data.calendars, userId, day);
      const dayZone = calendar?.timezone || 'Asia/Tehran';
      return { ...L.daySummary(day, data.sessions, data.leaves, dayZone, now), calendar, zone: dayZone,
        work: L.workDay(calendar, day) };
    };
    const intervalsForDay = day => {
      const summary = dayData(day);
      return summary.intervals.filter(s => s.to > s.from).map(s => {
        const start = L.time(s.from, summary.zone, 'en');
        const end = L.time(s.to, summary.zone, 'en');
        const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
        return { id: s.id, start: minutes(start), end: s.to === L.midnight(addDays(day, 1), summary.zone) ? 1440 : minutes(end),
          label: `${start}–${end}${s.open ? ` (${t('نوبت باز', 'Open session')})` : ''}` };
      });
    };
    const renderDay = day => {
      const summary = dayData(day);
      if (view === 'month') return <MonthlyDaySummary date={day} today={currentDay} summary={summary} language={language} />;
      const record = summary.leave;
      const leaveHours = (() => {
        if (!record || !summary.work?.working) return '';
        const asMinutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
        const start = asMinutes(summary.work.start);
        const end = asMinutes(summary.work.end);
        const middle = Math.floor((start + end) / 2);
        const format = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
        return `${format(record.portion === 'SECOND_HALF' ? middle : start)}–${format(record.portion === 'FIRST_HALF' ? middle : end)}`;
      })();
      return <div className={`${view === 'month' ? 'space-y-1 mt-1' : 'space-y-2 mt-2'} text-xs text-slate-600 dark:text-slate-300`}>
        <div className="font-bold">{t('کارکرد', 'Worked')}: <span dir="ltr">{L.duration(summary.milliseconds)}</span></div>
        {view === 'day' && <div>{t('ورود / خروج', 'Entries / exits')}: {new Intl.NumberFormat(isRtl ? 'fa-IR' : 'en').format(summary.entries)} / {new Intl.NumberFormat(isRtl ? 'fa-IR' : 'en').format(summary.exits)}</div>}
        {view !== 'month' && summary.work && <div>{summary.work.working ? `${summary.work.start}–${summary.work.end}` : t('تعطیل', 'Non-working')}</div>}
        {summary.work?.title && <div>{summary.work.title}</div>}
        {record && <div className="space-y-1">
          <Badge variant={record.decision === 'APPROVED' ? 'emerald' : record.decision === 'REJECTED' ? 'red' : 'amber'}>{decisionLabel(record.decision)}</Badge>
          <div>{t('مرخصی', 'Leave')}: {portions.find(p => p.value === record.portion)?.label}</div>
          {leaveHours && <div dir="ltr">{leaveHours}</div>}
          {view === 'day' && record.notes && <div>{record.notes}</div>}
        </div>}
      </div>;
    };
    const ownName = users.find(p => L.same(p.id, ownId))?.name || people.find(p => L.same(p.id, ownId))?.name
      || L.actor().full_name || L.actor().username || t('خودم', 'Me');
    const userOptions = [{ value: ownId, label: ownName }, ...users.filter(p => !L.same(p.id, ownId))
      .map(p => ({ value: String(p.id), label: p.name }))];
    if (!access.canView) return <Alert type="error" message={t('دسترسی به پیشخوان مجاز نیست.', 'Dashboard access denied.')} />;
    const presenceState = person => person.onLeave ? { label: t('مرخصی', 'On leave'), color: 'bg-slate-300 dark:bg-slate-400', key: 'leave' }
      : person.presence?.is_online ? { label: t('آنلاین', 'Online'), color: 'bg-emerald-500', key: 'online' }
      : person.presence?.work_date === L.today(person.presence?.timezone || 'Asia/Tehran', now)
        ? { label: t('آفلاین', 'Offline'), color: 'bg-amber-400', key: 'offline' }
        : { label: t('بدون ورود امروز', 'No check-in today'), color: 'bg-red-500', key: 'absent' };
    return <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto custom-scrollbar" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader title={t('پیشخوان کارکنان', 'Employee dashboard')} icon={CalendarDays} language={language} actionsPlacement="center"
        actions={<div className="flex flex-wrap items-center justify-center gap-2" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="w-52" data-dashboard-user role="group" aria-label={t('نام کاربر', 'User name')}>
          {security.isFullAccess ? <SelectField size="sm" isRtl={isRtl} value={userId} options={userOptions} disabled={busy}
            onChange={e => {
              if (L.same(e.target.value, userId)) return;
              generation.current++; setData(null); setLoading(true);
              setUserId(String(e.target.value)); setLeave(null); setSelectedDates([]); setAttendanceOpen(false); setReturnView(null);
            }} />
            : <TextField aria-label={t('نام کاربر', 'User name')} value={ownName} readOnly size="sm" isRtl={isRtl} />}
        </div>
        <Button size="sm" variant="outline" icon={RefreshCw} disabled={busy || loading} onClick={() => {
          L.resetLeaveSchema(window.supabase); refresh();
        }}>{t('تازه‌سازی', 'Refresh')}</Button>
        {own && <Button size="sm" variant={data?.open ? 'danger' : 'success'} icon={data?.open ? LogOut : LogIn} isLoading={busy}
          disabled={loading || !!error || !data || !(data.open ? access.canEdit : access.canCreate)}
          onClick={() => act(() => L.punch(window.supabase, security, formCode, userId, data.open, zone))}>
          {data?.open ? t('پایان کار / خروج', 'Stop work / check out') : t('شروع کار / ورود', 'Start work / check in')}
        </Button>}
        {data && !error && <div className="flex gap-2 text-xs font-bold text-slate-700 dark:text-slate-200" data-open-session>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" dir={isRtl ? 'rtl' : 'ltr'}>{t('مدت کارکرد', 'Work duration')}: <span dir="ltr" data-session-duration>{L.duration(data.open
            ? now - Date.parse(data.open.started_at) : 0, true)}</span></div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" dir={isRtl ? 'rtl' : 'ltr'}>{t('جمع کارکرد روز', 'Today worked')}: <span dir="ltr" data-today-duration>{L.duration(
            L.daySummary(currentDay, data.todaySessions || [], [], zone, now).milliseconds, true)}</span></div>
        </div>}
      </div>} />
      {usersError && <Alert type="error" title={t('دریافت کاربران ناموفق بود', 'Could not load users')} message={usersError} />}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
      <main style={{ height: panelHeight }} className="flex flex-col flex-1 min-w-0 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="px-3 h-16 shrink-0 flex items-center">
      <Tabs className="!mb-0 w-full" tabs={[{ id: 'day', label: t('روزانه', 'Daily') }, { id: 'week', label: t('هفتگی', 'Weekly') },
        { id: 'month', label: t('ماهانه', 'Monthly') }]} activeTab={view} onChange={next => { if (!busy) {
          if (next === 'day' && selectedDates.length) { setDate(selectedDates[0]); setSelectedDates([]); }
          setView(next); setReturnView(null);
        } }}
        middleContent={<div className="flex items-center gap-2" data-calendar-navigation>
        {returnView && <Button size="sm" variant="outline" disabled={busy} onClick={() => {
          selectDate(returnView.date); setView(returnView.view); setReturnView(null);
        }}>{returnView.view === 'month' ? t('بازگشت به ماه', 'Back to month') : t('بازگشت به هفته', 'Back to week')}</Button>}
        <Button size="sm" variant="outline" icon={isRtl ? ChevronRight : ChevronLeft} onClick={() => navigate(-1)} disabled={busy}>{t('قبلی', 'Previous')}</Button>
        <Button size="sm" variant="outline" onClick={() => selectDate(currentDay)} disabled={busy}>{t('امروز', 'Today')}</Button>
        <Button size="sm" variant="outline" icon={isRtl ? ChevronLeft : ChevronRight} onClick={() => navigate(1)} disabled={busy}>{t('بعدی', 'Next')}</Button>
        </div>}
        trailingContent={<div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy || loading || !!error || !data} onClick={() => setAttendanceOpen(true)}>{t('لیست ورود و خروج‌ها', 'Attendance sessions')}</Button>
          {own && (access.canCreate || access.canEdit) && <Button size="sm" disabled={busy || loading || !data || !!error} onClick={editLeave}>{t('ثبت مرخصی', 'Request leave')}</Button>}
        </div>} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      {error && <Alert type="error" title={t('دریافت پیشخوان ناموفق بود', 'Dashboard could not be loaded')} message={error} />}
      {loading ? <Skeleton height="288px" /> : data && !error && <>
        <CalendarBoard date={date} view={view} mode={mode} language={language} today={currentDay} disabled={busy}
          variant="outlook" intervalsForDay={intervalsForDay} initialHour={7} timeStep={2}
          height="100%" monthCellHeight={104} selectedDates={view === 'day' ? [] : selectedDates} onToggleDay={view === 'day' ? undefined : toggleDate}
          renderDayHeader={day => <DailyOverview date={day} today={currentDay} summary={dayData(day)} mode={mode} language={language} />}
          renderWeekDay={day => <WeeklyDaySummary date={day} today={currentDay} summary={dayData(day)} intervals={intervalsForDay(day)} mode={mode} language={language} />}
          onSelect={day => { if (view !== 'day') selectDate(day); }} renderDay={renderDay} />
      </>}
      </div>
      </main>
      <aside style={{ height: panelHeight }} className="flex flex-col w-full lg:w-64 shrink-0 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden" aria-label={t('وضعیت امروز همکاران', 'Colleagues today')}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('وضعیت امروز همکاران', 'Colleagues today')}</div>
        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          {[{ label: t('آنلاین', 'Online'), color: 'bg-emerald-500' }, { label: t('آفلاین', 'Offline'), color: 'bg-amber-400' },
            { label: t('بدون ورود', 'No check-in'), color: 'bg-red-500' }, { label: t('مرخصی', 'On leave'), color: 'bg-slate-300 dark:bg-slate-400' }].map(item => <span key={item.color} className="inline-flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${item.color}`} aria-hidden="true" />{item.label}
          </span>)}
        </div>
        <div className="text-[10px] text-slate-400">{t('بر اساس اعلام ورود و خروج • هر ۳۰ ثانیه', 'Based on check in/out • every 30 seconds')}</div>
      </div>
        {presenceError ? <div className="p-3"><Alert type="error" message={presenceError} /></div> : peopleLoading ? <Skeleton height="180px" />
          : <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-700">
          {[...people.filter(p => L.same(p.id, ownId)), ...people.filter(p => !L.same(p.id, ownId))].map(person => <div key={person.id} className="flex items-center gap-3 p-3" data-presence={presenceState(person).key}>
            <Avatar name={person.name} src={person.photo_url} size="sm" />
            <div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={person.name}>{person.name}</div>
              <div className="text-[10px] text-slate-400 mt-1">{presenceState(person).label}</div></div>
            <span className={`w-3 h-3 rounded-full shrink-0 ${presenceState(person).color}`} title={presenceState(person).label} aria-hidden="true" />
          </div>)}
          {!people.length && <div className="p-3"><EmptyState title={t('کاربری برای نمایش نیست', 'No users to display')} /></div>}
        </div>}
      </aside>
      </div>
      {attendanceOpen && data && !loading && !error && <AttendanceModal isOpen onClose={() => setAttendanceOpen(false)}
        date={date} view={view} mode={mode} language={language} data={data} userId={userId} now={now} />}
      {leave && <LeaveModal draft={leave} setDraft={setLeave} onClose={() => setLeave(null)} busy={busy}
        language={language} userId={userId} security={security} formCode={formCode}
        canEdit={leave.id ? access.canEdit && ['DRAFT', 'PENDING'].includes(leave.decision) : access.canCreate}
        onSubmit={(!leave.id || leave.decision === 'DRAFT') && access.canEdit
          ? () => act(async () => {
            const saved = await L.saveLeaveRequest(window.supabase, security, formCode, userId, leave);
            if (mounted.current) setLeave({ ...saved.saved, decision: 'DRAFT', selected_dates: saved.saved.working_dates });
            const submitted = await L.submitLeave(window.supabase, security, formCode, saved.saved);
            return { ...submitted, auditError: submitted.auditError || saved.auditError };
          }) : null}
        onSave={() => act(() => L.saveLeaveRequest(window.supabase, security, formCode, userId, leave))} />}
      <Toast {...toast} onClose={() => setToast({ isVisible: false })} />
    </div>;
  };
  EmployeeDashboard.formCode = 'EMPLOYEE_DASHBOARD';
  window.EmployeeDashboard = EmployeeDashboard;
})();
