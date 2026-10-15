(() => {
  const { useState, useEffect } = window.React;
  const { Button, Badge, Skeleton, EmptyState, formatGlobalDate } = window.DSCore;
  const { DatePicker, SelectField, TextAreaField } = window.DSForms;
  const { Modal, Alert } = window.DSFeedback;
  const { DataGrid } = window.DSGrid;
  const { range, monthStart, shiftMonth, addDays, HorizontalTimeline } = window.DSCalendar;
  const L = window.EmployeeDashboardLogic;

  const DailyOverview = ({ date, today, summary, mode, language }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const locale = isRtl ? 'fa-IR' : 'en-GB';
    const title = new Intl.DateTimeFormat(locale, { calendar: mode === 'jalali' ? 'persian' : 'gregory',
      day: 'numeric', month: 'long', year: 'numeric', weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    const stamp = instant => instant ? `${L.today(summary.zone, instant) !== date
      ? `${formatGlobalDate(L.today(summary.zone, instant), mode)} • ` : ''}${L.time(instant, summary.zone, language)}` : '—';
    const leave = summary.leave;
    const leaveState = { DRAFT: t('ارسال‌نشده', 'Not submitted'), PENDING: t('در انتظار تأیید', 'Pending approval'),
      APPROVED: t('تأییدشده', 'Approved'), REJECTED: t('ردشده', 'Rejected'), UNRESOLVED: t('تعیین‌تکلیف‌نشده', 'Undecided') };
    const cards = [
      { label: t('کارکرد روز', 'Day worked'), value: L.duration(summary.milliseconds, true),
        color: 'border-indigo-100 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300' },
      { label: t('برنامهٔ کاری', 'Work schedule'), value: summary.work
        ? summary.work.working ? `${summary.work.start}–${summary.work.end}` : t('روز تعطیل', 'Non-working day') : t('تعیین نشده', 'Not assigned'),
        color: 'border-sky-100 bg-sky-50/70 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300' },
      { label: t('اولین ورود', 'First check-in'), value: stamp(summary.firstStartedAt),
        color: 'border-emerald-100 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300' },
      { label: t('آخرین خروج', 'Last check-out'), value: stamp(summary.lastEndedAt),
        color: 'border-rose-100 bg-rose-50/70 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300' }
    ];
    return <section className="p-3 space-y-3" dir={isRtl ? 'rtl' : 'ltr'} aria-label={t('خلاصهٔ روز', 'Day overview')} data-day-overview>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">{title}</h2>
        <div className="flex items-center gap-2">
          {date === today && <Badge variant="amber">{t('امروز', 'Today')}</Badge>}
          <Badge variant={summary.hasOpenSession ? 'emerald' : 'gray'}>{summary.hasOpenSession
            ? t('نوبت باز', 'Open session') : summary.milliseconds ? t('نوبت‌ها بسته شده‌اند', 'Sessions closed') : t('بدون حضور ثبت‌شده', 'No attendance recorded')}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
        {cards.map(card => <div key={card.label} className={`rounded-lg border px-3 py-2 ${card.color}`}>
          <div className="text-[10px] font-bold opacity-80">{card.label}</div>
          <div className="mt-1 text-sm font-black tabular-nums" dir="auto">{card.value}</div>
        </div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div>{t('ورودها', 'Check-ins')}: {new Intl.NumberFormat(locale).format(summary.entries)}
          <span className="mx-2 text-slate-300 dark:text-slate-600">|</span>
          {t('خروج‌ها', 'Check-outs')}: {new Intl.NumberFormat(locale).format(summary.exits)}</div>
        {summary.work?.title && <span>{summary.work.title}</span>}
        {leave && <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{t('مرخصی', 'Leave')}: {leave.portion === 'FULL' ? t('تمام روز', 'Full day')
            : leave.portion === 'FIRST_HALF' ? t('نیمهٔ اول', 'First half') : t('نیمهٔ دوم', 'Second half')}</span>
          <Badge variant={leave.decision === 'APPROVED' ? 'emerald' : leave.decision === 'REJECTED' ? 'red' : 'amber'}>{leaveState[leave.decision]}</Badge>
        </div>}
      </div>
      {leave?.notes && <div className="text-xs text-slate-500 dark:text-slate-400 break-words">{t('توضیح مرخصی', 'Leave notes')}: {leave.notes}</div>}
    </section>;
  };

  const MonthlyDaySummary = ({ date, today, summary, language }) => {
    const t = (fa, en) => language === 'fa' ? fa : en;
    const record = summary.leave;
    const worked = summary.milliseconds > 0;
    const holiday = summary.work && !summary.work.working;
    const leaveLabel = record?.portion === 'FULL' ? t('مرخصی تمام روز', 'Full-day leave')
      : record?.portion === 'FIRST_HALF' ? t('مرخصی نیم‌روز اول', 'First-half leave') : t('مرخصی نیم‌روز دوم', 'Second-half leave');
    const decisionLabel = { DRAFT: t('ارسال‌نشده', 'Not submitted'), PENDING: t('در انتظار تأیید', 'Pending'),
      REJECTED: t('ردشده', 'Rejected'), UNRESOLVED: t('تعیین‌تکلیف‌نشده', 'Undecided') };
    const badgeClass = '!text-[10px] !px-2 !py-1 !font-bold max-w-full whitespace-normal text-start';
    return <div className="flex flex-col items-start gap-1 mt-1" data-month-summary>
      {worked && <Badge variant="emerald" className={badgeClass}>{t('کارکرد', 'Worked')}: <span className="ms-1" dir="ltr">{L.duration(summary.milliseconds)}</span></Badge>}
      {record && <Badge variant={record.decision === 'REJECTED' ? 'red' : 'orange'} className={badgeClass}>
        {leaveLabel}{record.decision !== 'APPROVED' ? ` • ${decisionLabel[record.decision] || t('تعیین‌تکلیف‌نشده', 'Undecided')}` : ''}
      </Badge>}
      {!worked && !record && <Badge variant={date < today && !holiday ? 'red' : 'gray'} className={badgeClass}>
        {holiday ? summary.work.title || t('تعطیل', 'Non-working day') : date > today ? t('آینده', 'Upcoming')
          : date < today ? t('غایب', 'Absent') : t('بدون حضور', 'No check-in yet')}
      </Badge>}
    </div>;
  };

  const WeeklyDaySummary = ({ date, today, summary, intervals, language, mode }) => {
    const t = (fa, en) => language === 'fa' ? fa : en;
    const leave = summary.leave;
    const holiday = summary.work && !summary.work.working;
    const leaveApproved = leave?.decision === 'APPROVED';
    const emptyLabel = leaveApproved ? t('مرخصی', 'On leave') : holiday ? summary.work.title || t('تعطیل', 'Non-working day')
      : date > today ? t('هنوز شروع نشده', 'Upcoming') : '';
    const stamp = instant => instant ? `${L.today(summary.zone, instant) !== date
      ? `${formatGlobalDate(L.today(summary.zone, instant), mode)} • ` : ''}${L.time(instant, summary.zone, language)}` : '—';
    const leaveLabel = { DRAFT: t('ارسال‌نشده', 'Not submitted'), PENDING: t('در انتظار تأیید', 'Pending'),
      APPROVED: t('تأییدشده', 'Approved'), REJECTED: t('ردشده', 'Rejected'), UNRESOLVED: t('تعیین‌تکلیف‌نشده', 'Undecided') };
    return <div className="flex items-center gap-4" data-week-summary>
      <div className="w-24 shrink-0 text-center">
        <div className="text-[10px] text-slate-400">{t('اولین ورود', 'First check-in')}</div>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 tabular-nums" dir="auto">{stamp(summary.firstStartedAt)}</div>
      </div>
      <div className="flex-1 min-w-0">
        {(intervals.length > 0 || leave) && <div className="flex items-center flex-wrap gap-1 mb-1">
          {intervals.length > 0 && <Badge variant="emerald">{summary.hasOpenSession && date === today ? t('در حال کار', 'Working now') : t('حضور ثبت‌شده', 'Attendance recorded')}</Badge>}
          {leave && <Badge variant={leaveApproved ? 'gray' : leave.decision === 'REJECTED' ? 'red' : 'warning'}>
            {t('مرخصی', 'Leave')} {leave.portion === 'FULL' ? t('تمام روز', 'Full day') : leave.portion === 'FIRST_HALF' ? t('نیمهٔ اول', 'First half') : t('نیمهٔ دوم', 'Second half')} • {leaveLabel[leave.decision]}
          </Badge>}
          {holiday && intervals.length > 0 && <Badge variant="warning">{t('روز تعطیل', 'Non-working day')}</Badge>}
        </div>}
        <HorizontalTimeline intervals={intervals} language={language} emptyLabel={emptyLabel}
          emptyVariant={holiday ? 'amber' : leaveApproved || date >= today || !summary.work ? 'gray' : 'red'} />
      </div>
      <div className="w-24 shrink-0 text-center">
        <div className="text-[10px] text-slate-400">{t('آخرین خروج', 'Last check-out')}</div>
        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 tabular-nums" dir="auto">{summary.hasOpenSession && date === today ? t('نوبت باز', 'Open session') : stamp(summary.lastEndedAt)}</div>
      </div>
      <div className="w-24 shrink-0 text-center border-s border-slate-200 dark:border-slate-700 ps-3">
        <div className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums" dir="ltr">{L.duration(summary.milliseconds, true)}</div>
        <div className="text-[10px] text-slate-400">{t('جمع کارکرد', 'Hours worked')}</div>
      </div>
    </div>;
  };

  const AttendanceModal = ({ isOpen, onClose, date, view, mode, language, data, userId, now }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const scope = view === 'month'
      ? { from: monthStart(date, mode), to: addDays(shiftMonth(monthStart(date, mode), 1, mode), -1) }
      : range(date, view, mode);
    const rows = [];
    let entries = 0, exits = 0, total = 0;
    if (isOpen && data) {
      for (let day = scope.from; day <= scope.to; day = addDays(day, 1)) {
        const zone = L.schedule(data.calendars, userId, day)?.timezone || 'Asia/Tehran';
        const summary = L.daySummary(day, data.sessions, data.leaves, zone, now);
        entries += summary.entries; exits += summary.exits; total += summary.milliseconds;
        summary.intervals.filter(s => s.to > s.from).forEach(s => rows.push({
          id: `${day}:${s.id}`, day: formatGlobalDate(day, mode),
          entry: `${formatGlobalDate(L.today(zone, s.started_at), mode)} ${L.time(s.started_at, zone, language)}`,
          exit: s.ended_at ? `${formatGlobalDate(L.today(zone, s.ended_at), mode)} ${L.time(s.ended_at, zone, language)}` : t('نوبت باز', 'Open session'),
          duration: L.duration(s.to - s.from, true)
        }));
      }
    }
    const number = n => new Intl.NumberFormat(isRtl ? 'fa-IR' : 'en').format(n);
    return <Modal isOpen={isOpen} onClose={onClose} language={language} width="max-w-4xl" title={t('لیست ورود و خروج‌ها', 'Attendance sessions')}>
      <div className="p-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-sm text-slate-600 dark:text-slate-300">{formatGlobalDate(scope.from, mode)} — {formatGlobalDate(scope.to, mode)}</div>
        <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700 dark:text-slate-200">
          <span>{t('جمع کارکرد', 'Total worked')}: <span dir="ltr">{L.duration(total, true)}</span></span>
          <span>{t('تعداد ورود', 'Check-ins')}: {number(entries)}</span>
          <span>{t('تعداد خروج', 'Check-outs')}: {number(exits)}</span>
        </div>
        <DataGrid language={language} data={rows} columns={[
          { field: 'day', header_fa: 'روز', header_en: 'Day' },
          { field: 'entry', header_fa: 'زمان ورود', header_en: 'Check in' },
          { field: 'exit', header_fa: 'زمان خروج', header_en: 'Check out' },
          { field: 'duration', header_fa: 'کارکرد در این روز', header_en: 'Worked in this day' }
        ]} hideImport hideExport hideToolbar reserveMiddleSpace={false} />
        {!rows.length && <EmptyState title={t('در این بازه ورود و خروجی ثبت نشده', 'No attendance in this range')} />}
        <div className="text-xs text-slate-500">{t('کارکرد نوبت‌های عبوری از نیمه‌شب، بین روزها تقسیم می‌شود.', 'Work across midnight is split between days.')}</div>
      </div>
    </Modal>;
  };

  const LeaveModal = ({ draft, setDraft, onClose, onSave, onSubmit, canEdit = true, busy, language, userId, security, formCode }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [context, setContext] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      let active = true;
      setLoading(true); setContext(null); setError('');
      L.leaveContext(window.supabase, security, formCode, userId, draft)
        .then(next => { if (active) setContext(next); })
        .catch(e => { if (active) setError(isRtl ? e.fa || e.message : e.message); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [draft.leave_date, draft.end_date, draft.portion, draft.selected_dates, userId, language, security, formCode]);
    let plan = null, planError = '';
    if (context) {
      try { plan = L.leavePlan(context.calendars, userId, draft); }
      catch (e) { planError = isRtl ? e.fa || e.message : e.message; }
    }
    const number = n => new Intl.NumberFormat(isRtl ? 'fa-IR' : 'en', { maximumFractionDigits: 1 }).format(n);
    const update = patch => setDraft(prev => ({ ...prev, ...patch }));
    const fieldsDisabled = busy || !canEdit;
    const saveDisabled = loading || !!error || !!planError || !plan?.days || context?.rangeSchemaAvailable === false;
    return <Modal isOpen onClose={() => { if (!busy) onClose(); }} title={t('ثبت مرخصی', 'Leave request')} language={language} width="max-w-2xl">
      <div className="p-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        {plan?.missingCalendar && <Alert type="warning" message={t(
          'برای بازهٔ انتخاب‌شده تقویم کاری معتبر تخصیص داده نشده است.',
          'No valid work calendar covers the selected range.')} />}
        {planError && <Alert type="error" message={planError} />}
        {context?.rangeSchemaAvailable === false && <Alert type="warning" message={t(
          'برای ثبت مرخصی، ابتدا migration مربوط به بازهٔ مرخصی را اجرا کنید.',
          'Run the leave-range migration before saving leave requests.')} />}
        {loading ? <Skeleton height="90px" /> : error ? <Alert type="error" message={error} /> : context?.balances.map(balance =>
          <div key={balance.year} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('سهمیهٔ سال شمسی', 'Jalali year allowance')} {new Intl.NumberFormat(isRtl ? 'fa-IR' : 'en', { useGrouping: false }).format(balance.year)}: {number(balance.allowance)} {t('روز', 'days')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-300">
              {[{ label: t('مانده', 'Remaining'), value: balance.remaining, box: 'border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-900/20', labelColor: 'text-indigo-600 dark:text-indigo-400', valueColor: 'text-indigo-700 dark:text-indigo-300' },
                { label: t('تعیین‌تکلیف‌نشده', 'Undecided'), value: balance.pending, box: 'border-amber-100 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-900/20', labelColor: 'text-amber-600 dark:text-amber-400', valueColor: 'text-amber-700 dark:text-amber-300' },
                { label: t('مرخصی رفته', 'Leave taken'), value: balance.used, box: 'border-rose-100 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-900/20', labelColor: 'text-rose-600 dark:text-rose-400', valueColor: 'text-rose-700 dark:text-rose-300' },
                { label: t('قابل درخواست', 'Available'), value: balance.available, box: 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-900/20', labelColor: 'text-emerald-600 dark:text-emerald-400', valueColor: 'text-emerald-700 dark:text-emerald-300' }].map(item =>
                <div key={item.label} className={`rounded-lg border px-3 py-2 ${item.box}`}>
                  <div className={`text-[10px] font-bold ${item.labelColor}`}>{item.label}</div>
                  <div className={`mt-0.5 text-[13px] font-black tabular-nums font-sans ${item.valueColor}`}>{number(item.value)} {t('روز', 'days')}</div>
                </div>)}
            </div>
            {!!balance.reserved && <div className="text-xs text-slate-500">{t('تأییدشده برای روزهای آینده', 'Approved for future days')}: {number(balance.reserved)} {t('روز', 'days')}</div>}
          </div>)}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-leave-type-row>
        <SelectField label={t('نوع مرخصی', 'Leave type')} size="sm" options={[
          { value: 'FULL', label: t('تمام روز', 'Full day') },
          { value: 'HALF', label: t('نیم روز', 'Half day') }
        ]} value={draft.portion === 'FULL' ? 'FULL' : 'HALF'} onChange={e => {
          if (e.target.value === (draft.portion === 'FULL' ? 'FULL' : 'HALF')) return;
          update({ portion: e.target.value === 'FULL' ? 'FULL' : 'FIRST_HALF', end_date: draft.leave_date, selected_dates: undefined });
        }} disabled={fieldsDisabled} isRtl={isRtl} />
        {draft.portion !== 'FULL' && <SelectField label={t('نیمهٔ روز', 'Day half')} size="sm" options={[
          { value: 'FIRST_HALF', label: t('نیمه اول روز', 'First half') },
          { value: 'SECOND_HALF', label: t('نیمه دوم روز', 'Second half') }
        ]} value={draft.portion} onChange={e => update({ portion: e.target.value, end_date: draft.leave_date })} disabled={fieldsDisabled} isRtl={isRtl} />}
        </div>
        <div className={`grid grid-cols-1 ${draft.portion === 'FULL' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 items-start`}>
          <DatePicker label={t('از تاریخ', 'From date')} value={draft.leave_date} required disabled={fieldsDisabled}
            onChange={raw => {
              const value = L.normalizeDate(raw) || '';
              update({ leave_date: value, end_date: !draft.end_date || draft.end_date < value ? value : draft.end_date, selected_dates: undefined });
            }} isRtl={isRtl} language={language} size="sm" />
          {draft.portion === 'FULL' && <DatePicker label={t('تا تاریخ', 'To date')} value={draft.end_date || draft.leave_date} required
            disabled={fieldsDisabled} onChange={raw => update({ end_date: L.normalizeDate(raw) || '', selected_dates: undefined })} isRtl={isRtl} language={language} size="sm" />}
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1" data-leave-count>
            <div className="font-bold">{t('تعداد روز', 'Days')}</div>
            <div className="h-8 flex items-center font-bold">{loading ? t('در حال محاسبه…', 'Calculating…') : plan ? `${number(plan.days)} ${t('روز مرخصی', 'days of leave')}` : '—'}</div>
            {!!plan?.holidays && <div>{number(plan.holidays)} {t('روز تعطیل محاسبه نشده', 'non-working days excluded')}</div>}
          </div>
        </div>
        <TextAreaField label={t('توضیحات', 'Notes')} value={draft.notes} onChange={e => update({ notes: e.target.value })} disabled={fieldsDisabled} isRtl={isRtl} size="sm" />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={onClose}>{t('انصراف', 'Cancel')}</Button>
          {canEdit && <Button size="sm" isLoading={busy} disabled={saveDisabled} onClick={onSave}>{t('ذخیره', 'Save')}</Button>}
          {canEdit && onSubmit && <Button size="sm" variant="outline" disabled={busy || saveDisabled} onClick={onSubmit}>{t('ثبت و ارسال برای تأیید', 'Save and submit for approval')}</Button>}
        </div>
      </div>
    </Modal>;
  };
  window.EmployeeDashboardDetails = { DailyOverview, MonthlyDaySummary, WeeklyDaySummary, AttendanceModal, LeaveModal };
})();
