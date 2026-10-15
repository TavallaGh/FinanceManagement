/* Shared calendar geometry. Dates are Gregorian storage keys; mode only changes presentation. */
(() => {
  const { useRef, useEffect } = window.React;
  const { Button, formatGlobalDate, g2j, j2g } = window.DSCore;
  const pad = n => String(n).padStart(2, '0');
  const key = parts => `${parts[0]}-${pad(parts[1])}-${pad(parts[2])}`;
  const parts = date => date.split('-').map(Number);
  const addDays = (date, amount) => {
    const [y, m, d] = parts(date);
    const next = new Date(Date.UTC(y, m - 1, d + amount));
    return key([next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()]);
  };
  const weekday = date => new Date(`${date}T12:00:00Z`).getUTCDay();
  const calendarParts = (date, mode) => mode === 'jalali' ? g2j(...parts(date)) : parts(date);
  const storageKey = (p, mode) => key(mode === 'jalali' ? j2g(...p) : p);
  const monthStart = (date, mode) => {
    const [y, m] = calendarParts(date, mode);
    return storageKey([y, m, 1], mode);
  };
  const shiftMonth = (date, amount, mode) => {
    const [y, m, d] = calendarParts(date, mode);
    const index = y * 12 + m - 1 + amount;
    const year = Math.floor(index / 12);
    const month = ((index % 12) + 12) % 12 + 1;
    const start = storageKey([year, month, 1], mode);
    const nextIndex = index + 1;
    const next = storageKey([Math.floor(nextIndex / 12), ((nextIndex % 12) + 12) % 12 + 1, 1], mode);
    const length = Math.round((Date.parse(next) - Date.parse(start)) / 86400000);
    return addDays(start, Math.min(d, length) - 1);
  };
  const range = (date, view, mode) => {
    const weekStart = mode === 'jalali' ? 6 : 1;
    const beginning = view === 'month' ? monthStart(date, mode) : date;
    const from = view === 'day' ? date : addDays(beginning, -((weekday(beginning) - weekStart + 7) % 7));
    const end = view === 'month' ? addDays(shiftMonth(beginning, 1, mode), -1) : addDays(from, view === 'week' ? 6 : 0);
    const to = view === 'month' ? addDays(end, (weekStart + 6 - weekday(end) + 7) % 7) : end;
    const dates = [];
    for (let day = from; day <= to; day = addDays(day, 1)) dates.push(day);
    return { from, to, dates };
  };
  const CalendarBoard = ({ date, view = 'month', mode = 'jalali', language = 'fa', today,
    onSelect, renderDay, disabled = false, variant = 'default', intervalsForDay = () => [], initialHour = 0, timeStep = 1,
    selectedDates = [], onToggleDay, height, monthCellHeight, renderDayHeader, renderWeekDay }) => {
    const step = [1, 2].includes(timeStep) ? timeStep : 1;
    const hourHeight = 48 / step;
    const timelineRef = useRef(null);
    useEffect(() => {
      if (variant === 'outlook' && timelineRef.current) timelineRef.current.scrollTop = Math.max(0, Math.min(23, initialHour)) * hourHeight;
    }, [variant, view, date, initialHour, hourHeight]);
    const isRtl = language === 'fa';
    const days = range(date, view, mode).dates;
    const locale = isRtl ? 'fa-IR' : 'en-GB';
    const selectedMonth = calendarParts(date, mode).slice(0, 2).join('-');
    const selected = day => selectedDates.includes(day);
    const dayStyle = day => selected(day) ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-inset ring-indigo-500'
      : day === today ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-inset ring-amber-400' : 'bg-white dark:bg-slate-800';
    const selectionProps = day => onToggleDay ? {
      role: 'button', tabIndex: disabled ? -1 : 0, 'aria-pressed': selected(day),
      'aria-label': `${formatGlobalDate(day, mode)}${day === today ? (isRtl ? '، امروز' : ', Today') : ''}`,
      onClick: e => { if (!disabled && !e.target.closest('button')) onToggleDay(day); },
      onKeyDown: e => { if (e.target === e.currentTarget && ['Enter', ' '].includes(e.key)) { e.preventDefault(); if (!disabled) onToggleDay(day); } }
    } : {};
    const heading = day => <div className="flex items-center justify-between gap-1">
      {view !== 'month' && <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}
      </span>}
      <Button size="sm" variant={selected(day) || (!onToggleDay && day === today) ? 'primary' : 'ghost'} disabled={disabled}
        className={view === 'month' && monthCellHeight ? '!h-6' : ''}
        aria-label={formatGlobalDate(day, mode)} aria-pressed={onToggleDay ? selected(day) : undefined}
        aria-current={day === today ? 'date' : undefined} onClick={() => onToggleDay ? onToggleDay(day) : onSelect(day)}>
        {view === 'month' ? new Intl.NumberFormat(locale).format(calendarParts(day, mode)[2]) : formatGlobalDate(day, mode)}
      </Button>
    </div>;
    if (view === 'week' && renderWeekDay) {
      return <div className="overflow-auto custom-scrollbar p-3" style={{ height }} dir={isRtl ? 'rtl' : 'ltr'} data-calendar-view={view}>
        <div className="min-w-[760px] space-y-2">
          {days.map(day => <div key={day} data-calendar-day={day} {...selectionProps(day)} aria-current={day === today ? 'date' : undefined}
            className={`flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 min-h-[76px] ${selected(day) ? dayStyle(day) : 'bg-white dark:bg-slate-800'} ${onToggleDay ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500' : ''}`}>
            <div className={`w-20 shrink-0 text-center space-y-1 rounded-lg border p-1 ${day === today ? 'border-orange-400 dark:border-orange-500' : 'border-transparent'}`}>
              <div className="text-lg font-black text-slate-800 dark:text-slate-100">{new Intl.NumberFormat(locale).format(calendarParts(day, mode)[2])}
                <span className="text-[10px] font-medium ms-1">{new Intl.DateTimeFormat(locale, { month: 'short', calendar: mode === 'jalali' ? 'persian' : 'gregory', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}</div>
              {(selected(day) || day === today) && <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{selected(day) ? (isRtl ? 'انتخاب‌شده' : 'Selected') : (isRtl ? 'امروز' : 'Today')}</div>}
            </div>
            <div className="flex-1 min-w-0">{renderWeekDay(day)}</div>
          </div>)}
        </div>
      </div>;
    }
    if (variant === 'outlook') {
      const columns = `60px repeat(${days.length}, minmax(0, 1fr))`;
      return <div className={`overflow-x-auto custom-scrollbar ${height ? 'flex flex-col min-h-0' : ''}`} style={{ height }} dir={isRtl ? 'rtl' : 'ltr'} data-calendar-view={view}>
        {view === 'month' ? <div className="grid grid-cols-7 min-w-[980px]" style={monthCellHeight ? { gridTemplateRows: `40px repeat(${days.length / 7}, ${monthCellHeight}px)` } : undefined}>
          {days.slice(0, 7).map(day => <div key={day} className={`${monthCellHeight ? 'p-2 flex items-center justify-center' : 'p-3 text-center'} text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900`}>
            {new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}
          </div>)}
          {days.map(day => <div key={day} data-calendar-day={day} {...selectionProps(day)}
            className={`${monthCellHeight ? '' : 'aspect-square'} min-w-0 overflow-y-auto custom-scrollbar p-2 border-b border-e border-slate-200 dark:border-slate-700 ${onToggleDay ? `${dayStyle(day)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500` : day === date ? 'bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-inset ring-indigo-300 dark:ring-indigo-700' : 'bg-white dark:bg-slate-800'} ${calendarParts(day, mode).slice(0, 2).join('-') !== selectedMonth ? 'opacity-50' : ''}`}>
            {heading(day)}
            {renderDay(day, { compact: true })}
          </div>)}
        </div> : <div className={`${view === 'week' ? 'min-w-[980px]' : 'min-w-[360px]'} ${height ? 'flex flex-col flex-1 min-h-0' : ''}`}>
          {view === 'day' && renderDayHeader ? <div className="shrink-0 max-h-[240px] overflow-y-auto custom-scrollbar border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {renderDayHeader(date)}
          </div> : <div className="grid bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: columns }}>
            <div className="p-2 text-[10px] text-slate-400 border-e border-slate-200 dark:border-slate-700">{isRtl ? 'ساعت' : 'Time'}</div>
            {days.map(day => <div key={day} data-calendar-day={day} {...selectionProps(day)} className={`p-2 border-e border-slate-200 dark:border-slate-700 ${onToggleDay ? `${dayStyle(day)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500` : day === today ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
              {heading(day)}
              <div className="max-h-44 overflow-y-auto custom-scrollbar">{renderDay(day, { compact: true })}</div>
            </div>)}
          </div>}
          <div ref={timelineRef} className={`${height ? 'flex-1 min-h-0' : 'max-h-[560px]'} overflow-y-auto custom-scrollbar`} tabIndex={0} aria-label={isRtl ? 'ساعات روز' : 'Day hours'}>
            <div className="grid" style={{ gridTemplateColumns: columns }}>
              <div className="relative border-e border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" style={{ height: 24 * hourHeight }} dir="ltr">
                {Array.from({ length: 24 / step }, (_, i) => i * step).map(hour => <div key={hour} className="absolute inset-x-0 text-center text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-1"
                  style={{ top: hour * hourHeight }}>{pad(hour)}:00</div>)}
              </div>
              {days.map(day => <div key={day} {...selectionProps(day)} className={`border-e border-slate-200 dark:border-slate-700 ${onToggleDay ? `${dayStyle(day)} cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500` : day === today ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'bg-white dark:bg-slate-800'}`}>
                <DayTimeline language={language} intervals={intervalsForDay(day)} showAxis={false} hourHeight={hourHeight} gridStep={step} />
              </div>)}
            </div>
          </div>
        </div>}
      </div>;
    }
    return <div className="overflow-x-auto custom-scrollbar" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={view === 'day' ? 'grid grid-cols-1' : 'grid grid-cols-7 min-w-[840px]'}>
        {view !== 'day' && days.slice(0, 7).map(day => <div key={day}
          className="p-2 text-center text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}
        </div>)}
        {days.map(day => {
          const outside = view === 'month' && calendarParts(day, mode).slice(0, 2).join('-') !== selectedMonth;
          return <div key={day} className={`p-3 border border-slate-200 dark:border-slate-700 ${view === 'month' ? 'min-h-[150px]' : 'min-h-[240px]'} ${outside ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-800'} ${day === date ? 'ring-1 ring-inset ring-indigo-500' : ''}`}>
            <Button size="sm" variant={day === today ? 'primary' : 'ghost'} disabled={disabled}
              aria-label={formatGlobalDate(day, mode)} onClick={() => onSelect(day)}>
              {view === 'month' ? new Intl.NumberFormat(locale).format(calendarParts(day, mode)[2]) : formatGlobalDate(day, mode)}
            </Button>
            {renderDay(day, { outside, selected: day === date })}
          </div>;
        })}
      </div>
    </div>;
  };
  const DayTimeline = ({ intervals = [], language = 'fa', showAxis = true, hourHeight = 24, gridStep = 1 }) => <div className={`relative text-[10px] ${showAxis ? 'mt-3' : ''}`} style={{ height: hourHeight * 24 }} dir="ltr">
    {(showAxis ? [0, 4, 8, 12, 16, 20, 24] : Array.from({ length: 24 / gridStep }, (_, i) => i * gridStep)).map(hour => <div key={hour} style={{ top: `${hour / 24 * 100}%` }}
      className="absolute w-full border-t border-slate-200 dark:border-slate-700 text-slate-400">
      {showAxis ? `${pad(hour)}:00` : gridStep === 1 && <div className="border-t border-dashed border-slate-100 dark:border-slate-700/50" style={{ marginTop: hourHeight / 2 }} />}
    </div>)}
    {intervals.map(item => <div key={item.id} title={item.label} style={{ top: `${item.start / 1440 * 100}%`,
      height: `${Math.min(1440 - item.start, Math.max(18, item.end - item.start)) / 1440 * 100}%` }}
      className={`absolute ${showAxis ? 'left-9 right-0' : 'left-1 right-1'} rounded bg-indigo-100 dark:bg-indigo-900/60 border-s-2 border-indigo-500 p-1 overflow-hidden text-indigo-800 dark:text-indigo-200`}>
      {item.label}
    </div>)}
  </div>;
  const HorizontalTimeline = ({ intervals = [], language = 'fa', emptyLabel, emptyVariant = 'gray' }) => {
    const tones = { gray: 'bg-slate-300 dark:bg-slate-600', amber: 'bg-amber-400', red: 'bg-red-400' };
    const isRtl = language === 'fa';
    return <div className="space-y-1" dir={isRtl ? 'rtl' : 'ltr'} aria-label={isRtl ? 'بازه‌های حضور در روز' : 'Daily attendance intervals'}>
      <div className="relative h-7 flex items-center">
        <div className={`absolute inset-x-0 h-px ${intervals.length ? 'bg-slate-200 dark:bg-slate-600' : tones[emptyVariant] || tones.gray}`} />
        {intervals.map(item => <div key={item.id} title={item.label} aria-label={item.label} data-attendance-interval
          style={{ [isRtl ? 'right' : 'left']: `${Math.max(0, item.start) / 1440 * 100}%`, width: `${Math.max(0.25, Math.min(1440, item.end) - Math.max(0, item.start)) / 1440 * 100}%` }}
          className="absolute h-2 rounded-full bg-emerald-500 dark:bg-emerald-400">
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
        </div>)}
        {!intervals.length && emptyLabel && <span className="relative mx-auto px-2 text-[10px] rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300" dir="auto">{emptyLabel}</span>}
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 tabular-nums" aria-hidden="true">{['00:00', '06:00', '12:00', '18:00', '24:00'].map(hour => <span key={hour} dir="ltr">{hour}</span>)}</div>
    </div>;
  };
  window.DSCalendar = { CalendarBoard, DayTimeline, HorizontalTimeline, addDays, weekday, calendarParts, monthStart, shiftMonth, range };
})();
