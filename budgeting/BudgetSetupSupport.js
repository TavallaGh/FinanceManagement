/* Shared list metadata for Budget Setup and its allocation form. */
(() => {
  const React = window.React;
  const setup = window.BudgetSetupLogic;
  const statusFields = 'reviewed_by,reviewed_by_name,reviewed_at,approved_by,approved_by_name,approved_at';
  const hiddenStatusColumns = ['reviewed_by_name', 'reviewed_at', 'approved_by_name', 'approved_at'];
  const currentUser = () => {
    const current = window.NavigationSystem?.currentUser || {};
    try {
      const session = window.sessionStorage.getItem('fm_user_session') || window.localStorage.getItem('fm_user_session') || '{}';
      const stored = JSON.parse(session);
      return { id: String(stored.id || current.id || ''), name: current.name || current.full_name || stored.name || 'system' };
    } catch (_error) { return { id: String(current.id || ''), name: current.name || current.full_name || 'system' }; }
  };
  const statusMetadata = (target, timestamp = new Date().toISOString()) => {
    const actor = currentUser();
    const approval = { approved_by: null, approved_by_name: null, approved_at: null };
    if (target === 'APPROVED') return { approved_by: actor.id || null, approved_by_name: actor.name, approved_at: timestamp };
    if (target === 'FINAL') return { reviewed_by: actor.id || null, reviewed_by_name: actor.name, reviewed_at: timestamp, ...approval };
    return { reviewed_by: null, reviewed_by_name: null, reviewed_at: null, ...approval };
  };
  const formatStamp = (value, mode) => {
    if (!value || !Number.isFinite(new Date(value).getTime())) return '-';
    return new Intl.DateTimeFormat(mode === 'jalali' ? 'fa-IR-u-nu-latn' : 'en-US',
      { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  };
  const lifecycleColumns = () => [
    { field: 'reviewed_by_name', header_fa: 'بررسی‌کننده', header_en: 'Reviewed By', width: '150px', render: (value, row) => value || row.reviewed_by || '-' },
    { field: 'reviewed_at', header_fa: 'تاریخ بررسی', header_en: 'Reviewed At', width: '175px', render: value => formatStamp(value, window.DSCore.getGlobalCalendarMode()) },
    { field: 'approved_by_name', header_fa: 'تأییدکننده', header_en: 'Approved By', width: '150px', render: (value, row) => value || row.approved_by || '-' },
    { field: 'approved_at', header_fa: 'تاریخ تأیید', header_en: 'Approved At', width: '175px', render: value => formatStamp(value, window.DSCore.getGlobalCalendarMode()) }
  ];
  const LifecycleFields = ({ record, language = 'fa', formCode }) => {
    const mode = window.DSCore.useCalendarMode();
    const TextField = window.DSForms.TextField;
    const isRtl = language === 'fa';
    return <>{['reviewed', 'approved'].map(prefix => {
      if (!record?.[`${prefix}_by`] && !record?.[`${prefix}_by_name`] && !record?.[`${prefix}_at`]) return null;
      const reviewed = prefix === 'reviewed';
      return <React.Fragment key={prefix}>
        <TextField size="sm" formCode={formCode} isRtl={isRtl} disabled
          label={isRtl ? reviewed ? 'بررسی‌کننده' : 'تأییدکننده' : reviewed ? 'Reviewed By' : 'Approved By'}
          value={record[`${prefix}_by_name`] || record[`${prefix}_by`] || '-'} />
        <TextField size="sm" formCode={formCode} isRtl={isRtl} disabled
          label={isRtl ? reviewed ? 'تاریخ بررسی' : 'تاریخ تأیید' : reviewed ? 'Reviewed At' : 'Approved At'}
          value={formatStamp(record[`${prefix}_at`], mode)} />
      </React.Fragment>;
    })}</>;
  };
  const BudgetTotals = ({ totals, currencyCode, language = 'fa' }) => {
    const t = (fa, en) => language === 'fa' ? fa : en;
    return <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[12px] text-slate-600 dark:text-slate-300">
      <span>{t('کل درآمد', 'Total Income')}: {' '}
        <strong dir="ltr" className="text-emerald-700 dark:text-emerald-400">{totals?.income ?? '-'}</strong> {currencyCode || ''}
      </span>
      <span>{t('کل هزینه', 'Total Cost')}: {' '}
        <strong dir="ltr" className="text-red-700 dark:text-red-400">{totals?.cost ?? '-'}</strong> {currencyCode || ''}
      </span>
    </div>;
  };
  const HeaderSection = ({ record, language = 'fa', formCode, actions, note }) => {
    const { Card, Badge } = window.DSCore;
    const { TextField } = window.DSForms;
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const statuses = { DRAFT: t('یادداشت', 'Draft'), TEMPORARY: t('موقت', 'Temporary'),
      FINAL: t('بررسی‌شده', 'Reviewed'), APPROVED: t('تأییدشده', 'Approved') };
    return <Card title={<div className="flex items-center gap-3 w-full min-w-0">
      <span className="shrink-0">{t('سربرگ بودجه', 'Budget Header')}</span>
      <Badge variant={{ DRAFT: 'slate', TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }[record.status]}>{statuses[record.status]}</Badge>
    </div>} action={actions} isCollapsible noPadding language={language}
      className="border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 relative z-20 mb-3"
      headerClassName="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 !h-auto min-h-10">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3 bg-white dark:bg-slate-800">
        <TextField size="sm" formCode={formCode} isRtl={isRtl} disabled label={t('کد بودجه', 'Budget Code')} value={setup.englishDigits(record.code || '')} dir="ltr" />
        <TextField size="sm" formCode={formCode} isRtl={isRtl} disabled label={t('عنوان بودجه', 'Budget Title')} value={record.title || ''} />
        <LifecycleFields record={record} language={language} formCode={formCode} />
      </div>
      {note && <div className="px-3 pb-3 text-slate-500 dark:text-slate-400">{note}</div>}
    </Card>;
  };
  const loadCreators = async (loadAll, plans) => {
    const creators = new Map();
    const ids = [...new Set(plans.map(row => String(row.id)))];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const logs = await loadAll('fm_record_logs', 'id,record_id,user_name,timestamp', query =>
        query.eq('entity_type', 'تنظیم بودجه').eq('action', 'create').in('record_id', ids.slice(offset, offset + 100)));
      logs.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)) || String(a.id).localeCompare(String(b.id)));
      for (const log of logs) if (!creators.has(String(log.record_id))) creators.set(String(log.record_id), log.user_name || null);
    }
    return creators;
  };
  const loadAllocationPlans = async (loadAll, language) => {
    const [plans, years, currencies, headings] = await Promise.all([
      loadAll('fm_budget_setup_plans', `id,code,title,plan_kind,period_type,quarter,fiscal_year_id,start_date,end_date,base_currency_id,status,is_active,created_at,${statusFields}`,
        query => query.eq('plan_kind', 'MAIN').in('status', ['TEMPORARY', 'FINAL', 'APPROVED']).eq('is_active', true)),
      loadAll('fm_fiscal_years', 'id,year_code,calendar_type,start_date,end_date'),
      loadAll('fm_currencies', 'id,code,decimal_places'), setup.loadTypes(loadAll, language)
    ]);
    const types = new Map(headings.map(row => [String(row.id), row.heading_type]));
    const byPlan = new Map();
    const ids = plans.map(row => row.id);
    for (let offset = 0; offset < ids.length; offset += 100) {
      const rows = await loadAll('fm_budget_setup_lines', 'id,plan_id,cost_type_id,income_type_id,amount,is_active',
        query => query.in('plan_id', ids.slice(offset, offset + 100)));
      for (const raw of rows) {
        const row = setup.fromLine(raw);
        if (!types.has(String(row.item_id))) throw new Error('A budget cost or income type is unavailable');
        const key = String(row.plan_id);
        if (!byPlan.has(key)) byPlan.set(key, []);
        byPlan.get(key).push(row);
      }
    }
    const creators = await loadCreators(loadAll, plans);
    const currencyMap = new Map(currencies.map(row => [String(row.id), row]));
    const planRows = plans.map(plan => {
      const currency = currencyMap.get(String(plan.base_currency_id));
      if (!currency) throw new Error('Budget currency is unavailable');
      const totals = setup.totalsByType(byPlan.get(String(plan.id)) || [], types, currency.decimal_places);
      if (!totals) throw new Error('A budget amount is invalid');
      return { ...plan, _creator: creators.get(String(plan.id)) || null,
        _income_total: `${setup.formatAmount(totals.income, currency.decimal_places)} ${currency.code || ''}`.trim(),
        _cost_total: `${setup.formatAmount(totals.cost, currency.decimal_places)} ${currency.code || ''}`.trim() };
    });
    return { planRows, yearRows: years, currencyRows: currencies };
  };
  const allocationColumns = ({ years, statusLabel, Badge }) => [
    { field: 'code', header_fa: 'کد', header_en: 'Code', width: '120px' },
    { field: 'title', header_fa: 'عنوان بودجه', header_en: 'Budget Title', width: '260px' },
    { field: 'fiscal_year_id', header_fa: 'سال مالی', header_en: 'Fiscal Year', width: '130px',
      render: value => setup.englishDigits(years.find(row => String(row.id) === String(value))?.year_code || '-') },
    { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '120px',
      render: value => <Badge variant={{ TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }[value]}>{statusLabel(value)}</Badge> },
    { field: 'created_at', header_fa: 'تاریخ ثبت', header_en: 'Created At', type: 'date', width: '115px' },
    { field: '_creator', header_fa: 'ثبت‌کننده', header_en: 'Created By', width: '150px', render: value => value || '-' },
    { field: '_income_total', header_fa: 'کل درآمد', header_en: 'Total Income', width: '150px',
      render: value => <span dir="ltr" className="font-semibold text-emerald-700 dark:text-emerald-400">{value}</span> },
    { field: '_cost_total', header_fa: 'کل هزینه', header_en: 'Total Cost', width: '150px',
      render: value => <span dir="ltr" className="font-semibold text-red-700 dark:text-red-400">{value}</span> },
    ...lifecycleColumns()
  ];
  const Comments = ({ plan, language, onClose }) => {
    const Modal = window.DSComments?.CommentModal;
    return Modal && plan ? <Modal isOpen onClose={onClose} entityType="fm_budget_setup_plans" entityId={String(plan.id)}
      entityTitle={`${plan.code || ''} | ${plan.title || ''}`} language={language}
      formTitle={language === 'fa' ? 'تنظیم بودجه' : 'Budget Setup'} formComponent="BudgetSetup" /> : null;
  };
  window.BudgetSetupSupport = { loadCreators, loadAllocationPlans, allocationColumns, Comments,
    statusFields, hiddenStatusColumns, statusMetadata, currentUser, lifecycleColumns, LifecycleFields, BudgetTotals, HeaderSection };
})();
