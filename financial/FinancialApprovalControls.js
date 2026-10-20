(() => {
  const { useState, useRef, useEffect } = window.React;
  const { Button, useCalendarMode, formatGlobalDate } = window.DSCore;
  const { DatePicker } = window.DSForms;
  const { Modal, Alert, Tooltip } = window.DSFeedback;
  const FallbackIcon = ({ size = 16 }) => <span style={{ display: 'inline-block', width: size, height: size }} />;
  const { HelpCircle = FallbackIcon } = window.LucideIcons || {};
  const L = window.FinancialApprovalLogic;

  const ApprovalDateModal = ({ language, count, onFinish }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const mode = useCalendarMode();
    const [date, setDate] = useState(L.today());
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const saving = useRef(false);
    useEffect(() => {
      let active = true;
      L.readSettings(window.supabase, t).then(data => { if (active) setSettings(data); })
        .catch(e => { if (active) setError(e.message); });
      return () => { active = false; };
    }, []);
    const confirm = async () => {
      if (saving.current) return;
      saving.current = true;
      setBusy(true);
      setError('');
      try {
        const checked = await L.checkApproval(window.supabase, date, t);
        onFinish(checked);
      } catch (e) { setError(e.message); }
      finally { saving.current = false; setBusy(false); }
    };
    const closedThrough = settings?.value.closed_through;
    const noOpenDay = closedThrough && closedThrough >= L.today();
    return <Modal isOpen onClose={() => { if (!busy) onFinish(null); }}
      title={t('تاریخ تأیید تراکنش‌ها', 'Transaction approval date')} language={language} width="max-w-md">
      <div className="p-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t(`تاریخ موثر گزارشدهی برای ${count} تراکنش را انتخاب کنید.`, `Select the effective reporting date for ${count} transactions.`)}
        </p>
        <DatePicker label={t('تاریخ موثر گزارشدهی', 'Effective reporting date')} value={date.replace(/-/g, '/')}
          onChange={setDate} minDate={closedThrough ? L.addDays(closedThrough, 1) : undefined}
          maxDate={L.today()} disabled={!settings || busy || noOpenDay} size="sm" required isRtl={isRtl} language={language} />
        {closedThrough && <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('تا پایان این روز بسته است: ', 'Closed through: ')}{formatGlobalDate(closedThrough, mode)}
        </p>}
        {noOpenDay && <Alert type="warning" message={t('امروز بسته شده است؛ تأیید جدید تا فردا ممکن نیست.',
          'Today is closed. New approvals are unavailable until tomorrow.')} />}
        {error && <Alert type="error" message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onFinish(null)}>{t('انصراف', 'Cancel')}</Button>
          <Button size="sm" disabled={!settings || busy || noOpenDay} isLoading={busy} onClick={confirm}>{t('تأیید', 'Confirm')}</Button>
        </div>
      </div>
    </Modal>;
  };

  const useApprovalDate = (language) => {
    const [count, setCount] = useState(null);
    const pending = useRef(null);
    useEffect(() => () => { pending.current?.(null); pending.current = null; }, []);
    const request = count => {
      if (pending.current) return Promise.resolve(null);
      return new Promise(resolve => { pending.current = resolve; setCount(count); });
    };
    const finish = value => {
      const resolve = pending.current;
      pending.current = null;
      setCount(null);
      resolve?.(value);
    };
    return { request, modal: count === null ? null :
      <ApprovalDateModal language={language} count={count} onFinish={finish} /> };
  };

  const FiscalApprovalSetting = ({ language, securityCtx, formCode, onLog, showToast }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [settings, setSettings] = useState(null);
    const [date, setDate] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const sequence = useRef(0);
    const saving = useRef(false);
    const load = async () => {
      const token = ++sequence.current;
      setError('');
      try {
        const data = await L.readSettings(window.supabase, t);
        if (token === sequence.current) { setSettings(data); setDate(data.value.closed_through); }
      } catch (e) { if (token === sequence.current) setError(e.message); }
    };
    useEffect(() => { load(); return () => { sequence.current++; }; }, []);
    const save = async () => {
      if (saving.current || !settings) return;
      saving.current = true;
      setBusy(true);
      setError('');
      try {
        const saved = await L.saveClosingDate(window.supabase, date, settings, securityCtx, formCode, t);
        const old = settings;
        setSettings(saved);
        setDate(saved.value.closed_through);
        try {
          await onLog(L.SETTINGS_KEY, 'UPDATE', 'Financial closing date', old.value, saved.value, true);
          showToast(t('آخرین تاریخ تأییدشده ذخیره شد.', 'Closing date saved.'));
        } catch (e) {
          showToast(t('تاریخ ذخیره شد، اما ثبت لاگ ناموفق بود: ', 'Date saved, but audit logging failed: ') + e.message, 'warning');
        }
      } catch (e) { setError(e.message); }
      finally { saving.current = false; setBusy(false); }
    };
    const canEdit = !!securityCtx?.getActions(formCode)?.canEdit;
    return <div className="w-full sm:w-80" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-end gap-2">
        <DatePicker label={t('آخرین تاریخ تأییدشده', 'Last closed approval date')} size="sm"
          value={date.replace(/-/g, '/')} onChange={setDate} minDate={L.earliestClosingDate()} maxDate={L.today()}
          disabled={!settings || !canEdit || busy} isRtl={isRtl} language={language} formCode={formCode} />
        <Tooltip position="bottom" align={isRtl ? 'left' : 'right'} multiline
          text={t('این روز و روزهای قبل بسته‌اند. انتخاب از هفت روز تقویمی قبل تا امروز مجاز است. تاریخ‌های قدیمی‌تر برای حفظ گزارش‌های نهایی قابل انتخاب نیستند.',
            'This day and earlier days are closed. You may select from seven calendar days ago through today. Earlier dates are unavailable to protect finalized reports.')}>
          <Button variant="ghost" size="sm" icon={HelpCircle} className="!px-1.5 !h-8"
            aria-label={t('راهنمای تاریخ بسته‌شده', 'Closing date help')} />
        </Tooltip>
        {canEdit && <Button size="sm" disabled={!settings || busy || L.normalizeDate(date) === settings.value.closed_through}
          onClick={save} isLoading={busy}>{t('ذخیره', 'Save')}</Button>}
      </div>
      {error && <><Alert type="error" message={error} />
        <Button size="sm" variant="outline" disabled={busy} onClick={load}>{t('دریافت مجدد', 'Reload')}</Button></>}
    </div>;
  };
  window.FinancialApprovalControls = { useApprovalDate, FiscalApprovalSetting };
})();
