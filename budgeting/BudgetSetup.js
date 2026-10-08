/* Filename: budgeting/BudgetSetup.js */

/* Budget planning logic */
(() => {
  const englishDigits = value => String(value ?? '').replace(/[۰-۹٠-٩]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
  });
  const normalizeDate = value => englishDigits(value).trim().replaceAll('/', '-');
  const lineKey = (row, headingTypes) => {
    const type = headingTypes.get(String(row.item_id));
    return [type, row.cost_benefit_center_id, row.item_id, row.funding_source_id].map(String).join('|');
  };
  const editableStatuses = new Set(['DRAFT', 'TEMPORARY']);
  const transitions = {
    DRAFT: ['TEMPORARY'],
    TEMPORARY: ['DRAFT', 'FINAL'],
    FINAL: ['TEMPORARY', 'APPROVED'],
    APPROVED: []
  };

  const amountUnits = (value, decimals) => {
    const precision = Math.max(0, Math.min(6, Number(decimals) || 0));
    const clean = englishDigits(value).replaceAll(',', '').trim();
    if (!/^\d+(\.\d+)?$/.test(clean)) return null;
    const [whole, fraction = ''] = clean.split('.');
    if (fraction.length > precision) return null;
    return BigInt(whole) * (10n ** BigInt(precision)) +
      BigInt(fraction.padEnd(precision, '0') || '0');
  };

  const formatUnits = (units, decimals) => {
    const precision = Math.max(0, Math.min(6, Number(decimals) || 0));
    const scale = 10n ** BigInt(precision);
    const whole = units / scale;
    const fraction = (units % scale).toString().padStart(precision, '0').replace(/0+$/, '');
    const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fraction ? `${grouped}.${fraction}` : grouped;
  };

  const formatAmount = (value, decimals) => {
    const normalized = englishDigits(value).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    const negative = normalized.startsWith('-');
    const units = amountUnits(negative ? normalized.slice(1) : normalized, decimals);
    return units == null ? englishDigits(value) : `${negative ? '-' : ''}${formatUnits(units, decimals)}`;
  };

  const totalAmount = (lines, decimals, language = 'fa') => {
    let total = 0n;
    for (const line of lines) {
      if (line.is_active === false) continue;
      const units = amountUnits(line.amount, decimals);
      if (units === null) return null;
      total += units;
    }
    return formatUnits(total, decimals, language);
  };

  const totalsByType = (lines, headingTypes, decimals) => {
    const totals = { INCOME: 0n, COST: 0n };
    for (const line of lines) {
      if (line.is_active === false) continue;
      const type = headingTypes.get(String(line.item_id));
      const units = amountUnits(line.amount, decimals);
      if (!Object.prototype.hasOwnProperty.call(totals, type) || units === null) return null;
      totals[type] += units;
    }
    return { income: formatUnits(totals.INCOME, decimals), cost: formatUnits(totals.COST, decimals) };
  };

  const summarizeByType = (lines, headings, groups, groupBy, decimals) => {
    const headingById = new Map(headings.map(row => [String(row.id), row]));
    const groupById = new Map(groups.map(row => [String(row.id), row]));
    const grouped = new Map();
    const field = { CENTER: 'cost_benefit_center_id', HEADING: 'item_id', SOURCE: 'funding_source_id' }[groupBy];
    if (!field) throw new Error('Invalid budget summary grouping');
    for (const line of lines) {
      const heading = headingById.get(String(line.item_id));
      const type = heading?.heading_type;
      if (type !== 'INCOME' && type !== 'COST') throw new Error('Budget heading type is unavailable');
      const groupId = line[field];
      const group = groupId == null && field === 'cost_benefit_center_id'
        ? { code: '—', title_fa: 'بدون مرکز هزینه و درآمد', title_en: 'No Cost and Income Center' }
        : groupId == null && field === 'funding_source_id'
          ? { code: '—', title_fa: 'بدون منبع تأمین اعتبار', title_en: 'No Funding Source' }
        : groupById.get(String(groupId));
      if (!group) throw new Error('Budget summary group is unavailable');
      const units = amountUnits(line.amount, decimals);
      if (units === null) throw new Error('Invalid budget line amount');
      const key = `${groupId ?? 'none'}|${type}`;
      if (!grouped.has(key)) grouped.set(key, {
        id: key, code: group.code, title_fa: group.title_fa, title_en: group.title_en,
        heading_type: type, active_units: 0n, inactive_units: 0n
      });
      const result = grouped.get(key);
      if (line.is_active === false) result.inactive_units += units;
      else result.active_units += units;
    }
    return [...grouped.values()].map(row => ({
      id: row.id, code: row.code, title_fa: row.title_fa, title_en: row.title_en,
      heading_type: row.heading_type, active_amount: formatUnits(row.active_units, decimals),
      inactive_amount: formatUnits(row.inactive_units, decimals)
    })).sort((a, b) => String(a.code).localeCompare(String(b.code)) ||
      a.heading_type.localeCompare(b.heading_type));
  };

  const expandMatrix = (existing, centers, headings, sources, headingTypes) => {
    const result = existing.slice();
    const keys = new Set(result.map(row => lineKey(row, headingTypes)));
    for (const center of centers) for (const heading of headings) for (const source of (sources.length ? sources : [null])) {
      const row = {
        id: `draft:${center?.id ?? 'income'}|${heading.id}|${source?.id ?? 'none'}`,
        cost_benefit_center_id: center?.id ?? null, item_id: heading.id,
        funding_source_id: source?.id ?? null, amount: '0', is_active: true,
        description: '', is_variable_budget: false
      };
      const key = lineKey(row, headingTypes);
      if (!keys.has(key)) {
        keys.add(key);
        result.push(row);
      }
    }
    return result;
  };

  const lineColumns = 'id,plan_id,cost_benefit_center_id,cost_type_id,income_type_id,funding_source_id,amount,is_active,description,is_variable_budget';
  const typeKey = (type, id) => `${type}:${id}`;
  const fromLine = row => {
    if ((row.cost_type_id != null) === (row.income_type_id != null))
      throw new Error('A budget line must reference exactly one cost or income type');
    return { ...row, item_id: row.cost_type_id != null
      ? typeKey('COST', row.cost_type_id) : typeKey('INCOME', row.income_type_id) };
  };
  const toLine = row => {
    const match = /^(COST|INCOME):(.+)$/.exec(String(row.item_id || ''));
    if (!match) throw new Error('Invalid cost or income type');
    return { cost_benefit_center_id: row.cost_benefit_center_id,
      cost_type_id: match[1] === 'COST' ? match[2] : null,
      income_type_id: match[1] === 'INCOME' ? match[2] : null,
      funding_source_id: row.funding_source_id,
      amount: englishDigits(row.amount).replaceAll(',', ''),
      is_active: row.is_active !== false,
      description: String(row.description || '').trim() || null,
      is_variable_budget: row.is_variable_budget === true };
  };
  const loadTypes = async (loadAll, language) => {
    const columns = 'id,parent_id,code,title_fa,title_en,is_active';
    const [costs, incomes] = await Promise.all([
      loadAll('fm_cost_types', columns), loadAll('fm_income_types', columns)
    ]);
    return [['COST', costs], ['INCOME', incomes]].flatMap(([type, rows]) => {
      const byId = new Map(rows.map(row => [String(row.id), row]));
      const parents = new Set(rows.filter(row => row.parent_id != null).map(row => String(row.parent_id)));
      return rows.map(row => {
        const path = [];
        const visited = new Set([String(row.id)]);
        let parent = byId.get(String(row.parent_id));
        while (parent && !visited.has(String(parent.id))) {
          visited.add(String(parent.id));
          path.unshift(language === 'fa' ? (parent.title_fa || parent.code)
            : (parent.title_en || parent.title_fa || parent.code));
          parent = byId.get(String(parent.parent_id));
        }
        return { ...row, id: typeKey(type, row.id), heading_type: type,
          isLeaf: !parents.has(String(row.id)), structureActive: true,
          structureTitle: type === 'COST' ? (language === 'fa' ? 'انواع هزینه' : 'Cost Types')
            : (language === 'fa' ? 'انواع درآمد' : 'Income Types'),
          title: language === 'fa' ? row.title_fa : (row.title_en || row.title_fa),
          pathTitle: path.join(' / ') };
      });
    });
  };

  const centerColumns = 'id,code,title_fa,title_en,is_active,is_cost_center,is_benefit_center,office:fm_org_offices(id,title),manager:parties(id,first_name,last_name)';
  const centerMatches = (row, type) => row?.[type === 'INCOME' ? 'is_benefit_center' : 'is_cost_center'] === true;
  const referenceSearch = (_value, row) => [row.code, row.title_fa, row.title_en, row.title].filter(Boolean).join(' ');
  const referenceLabel = (row, language) => row ? <div className={`min-w-0 leading-tight ${language === 'fa' ? 'text-right' : 'text-left'}`}>
    <div className="truncate">{language === 'fa' ? row.title_fa || row.title || '-' : row.title_en || row.title_fa || row.title || '-'}</div>
    <div dir="ltr" className="truncate text-[10px] text-slate-400 dark:text-slate-500">{englishDigits(row.code || '')}</div>
  </div> : '-';
  const referenceLovColumns = (language, heading = false) => [
    { field: 'code', header_fa: 'کد', header_en: 'Code', width: '110px', render: value => <span dir="ltr">{englishDigits(value || '')}</span> },
    { field: heading ? 'title' : language === 'fa' ? 'title_fa' : 'title_en', header_fa: 'عنوان', header_en: 'Title', width: '240px',
      render: (_value, row) => heading ? row.title || '-' : language === 'fa' ? row.title_fa || row.title || '-' : row.title_en || row.title_fa || row.title || '-',
      searchAccessor: referenceSearch }
  ];
  const centerLovColumns = language => [
    ...referenceLovColumns(language).map(column => column.field === 'code' ? column : { ...column, width: '170px' }),
    { field: 'office', header_fa: 'دفتر', header_en: 'Office', width: '160px', render: (_value, row) => row.office?.title || '-',
      searchAccessor: (_value, row) => row.office?.title || '' },
    { field: 'manager', header_fa: 'مسئول مرکز', header_en: 'Center Manager', width: '160px',
      render: (_value, row) => `${row.manager?.first_name || ''} ${row.manager?.last_name || ''}`.trim() || '-',
      searchAccessor: (_value, row) => `${row.manager?.first_name || ''} ${row.manager?.last_name || ''}`.trim() }
  ];
  const validateTemporary = async ({ client, plan, t }) => {
    const result = await client.from('fm_budget_setup_lines').select('id', { count: 'exact', head: true })
      .eq('plan_id', plan.id).eq('is_active', true).gt('amount', 0);
    if (result.error) throw result.error;
    if (result.count == null) throw new Error(t('مبالغ بودجه قابل بررسی نیست؛ دوباره تلاش کنید.', 'Budget amounts could not be checked; retry.'));
    if (!result.count) throw new Error(t('بودجه بدون مبلغ درآمد یا هزینه قابل تبدیل به موقت نیست.',
      'A budget with no income or cost amounts cannot be set to temporary.'));
  };
  window.BudgetSetupLogic = {
    centerColumns, centerMatches, referenceLabel, referenceSearch, referenceLovColumns, centerLovColumns, validateTemporary,
    lineColumns, fromLine, toLine, loadTypes, typeKey, normalizeDate, englishDigits, lineKey, editableStatuses, transitions,
    amountUnits, formatUnits, formatAmount, totalAmount, totalsByType, summarizeByType, expandMatrix
  };
})();

/* Budget setup header and form, following BudgetPlanning. */
(() => {
  const React = window.React;
  const { useState, useEffect, useRef } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { Save = FallbackIcon } = window.LucideIcons || {};
  const logic = window.BudgetSetupLogic;

  const BudgetSetupHeader = ({ mode = 'CREATE', sourcePlan = null, onClose, onSaved,
    language = 'fa', formCode = 'BUD_SETUP' }) => {
    const Empty = () => null;
    const { Button = Empty, EmptyState = Empty, Skeleton = Empty } = window.DSCore || window.DesignSystem || {};
    const { TextField = Empty, SelectField = Empty, DatePicker = Empty, ToggleField = Empty } = window.DSForms || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty } = window.DSFeedback || window.DesignSystem || {};
    const supabase = window.supabase;
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = securityCtx?.getActions(formCode) || { canView: false, canCreate: false, canEdit: false };
    const isNew = mode === 'CREATE' || mode === 'COPY';
    const [plan, setPlan] = useState(() => ({
      code: '', title: mode === 'COPY' ? `${sourcePlan?.title || ''} - ${t('کپی', 'Copy')}` : '',
      plan_kind: 'MAIN', period_type: sourcePlan?.period_type || 'ANNUAL',
      fiscal_year_id: sourcePlan?.fiscal_year_id || '', quarter: sourcePlan?.quarter || '',
      start_date: sourcePlan?.start_date || '', end_date: sourcePlan?.end_date || '',
      fiscal_period_id: null,
      base_currency_id: sourcePlan?.base_currency_id || null,
      status: 'DRAFT', is_active: true
    }));
    const [years, setYears] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const savingRef = useRef(false);
    const requestRef = useRef(0);
    const canEditFields = isNew ? access.canCreate
      : access.canEdit && logic.editableStatuses.has(plan.status);
    const baseCurrency = currencies.find(row => String(row.id) === String(plan.base_currency_id))
      || currencies.find(row => row.system_role === 'base');

    const showToast = (message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(value => ({ ...value, isVisible: false })), 3500);
    };
    const update = (field, value) => setPlan(current => ({ ...current, [field]: value }));

    const loadAll = async (table, columns, configure = query => query) => {
      const rows = [];
      for (let from = 0; ; from += 500) {
        const { data, error } = await configure(supabase.from(table).select(columns))
          .order('id', { ascending: true }).range(from, from + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) return rows;
      }
    };
    const loadData = async () => {
      const request = ++requestRef.current;
      setLoading(true);
      try {
        if (!supabase) throw new Error('Supabase client is unavailable');
        const [yearRows, currencyRows, record] = await Promise.all([
          loadAll('fm_fiscal_years', 'id,year_code,start_date,end_date,is_active'),
          loadAll('fm_currencies', 'id,code,decimal_places,system_role'),
          mode === 'EDIT'
            ? supabase.from('fm_budget_setup_plans').select('*').eq('id', sourcePlan.id).eq('plan_kind', 'MAIN').single()
            : Promise.resolve({ data: null, error: null })
        ]);
        if (record.error) throw record.error;
        if (request !== requestRef.current) return;
        setYears(yearRows);
        setCurrencies(currencyRows);
        if (record.data) setPlan(record.data);
        setLoadError(false);
      } catch (error) {
        if (request === requestRef.current) {
          setLoadError(true);
          showToast(error?.message || t('دریافت اطلاعات سربرگ انجام نشد', 'Failed to load budget header'), 'error');
        }
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    };
    useEffect(() => {
      loadData();
      return () => { requestRef.current += 1; };
    }, [mode, sourcePlan?.id]);
    useEffect(() => {
      if (!isNew || !window.AutoNumberingService) return;
      let active = true;
      window.AutoNumberingService.previewNext('BUDGET_PLAN').then(preview => {
        const code = typeof preview === 'string' ? preview : preview?.formattedCode || '';
        if (active && code) setPlan(current => current.code ? current : { ...current, code, generatedCode: code });
      }).catch(error => console.error('Budget plan numbering preview failed:', error));
      return () => { active = false; };
    }, [mode]);

    const logAction = async (id, action, details) => {
      const { error } = await supabase.from('fm_record_logs').insert([{
        entity_type: 'تنظیم بودجه', record_id: String(id), action,
        user_name: window.NavigationSystem?.currentUser?.name || 'system', details
      }]);
      if (error) console.error('Budget plan audit log failed:', error);
    };
    const validate = () => {
      if (!String(plan.code || '').trim() || !String(plan.title || '').trim())
        return t('کد و عنوان الزامی هستند', 'Code and title are required');
      if (!baseCurrency?.id) return t('ارز پایه تعریف نشده است', 'System base currency is missing');
      if (plan.period_type === 'ANNUAL' || plan.period_type === 'QUARTERLY') {
        if (!plan.fiscal_year_id) return t('سال مالی را انتخاب کنید', 'Select a fiscal year');
        if (plan.period_type === 'QUARTERLY' && ![1, 2, 3, 4].includes(Number(plan.quarter)))
          return t('فصل را انتخاب کنید', 'Select a quarter');
      } else {
        const from = logic.normalizeDate(plan.start_date);
        const to = logic.normalizeDate(plan.end_date);
        if (!from || !to || from > to) return t('بازه تاریخ معتبر وارد کنید', 'Enter a valid date range');
      }
      return null;
    };
    const save = async () => {
      if (!['CREATE', 'COPY', 'EDIT'].includes(mode)) return;
      if (!access.canView || !(canEditFields || (!isNew && access.canEdit)) || loadError || savingRef.current) return;
      const problem = canEditFields ? validate() : null;
      if (problem) return showToast(problem, 'error');
      savingRef.current = true;
      setSaving(true);
      try {
        const payload = canEditFields ? {
          code: logic.englishDigits(plan.code).trim(), title: String(plan.title).trim(),
          period_type: plan.period_type,
          fiscal_year_id: plan.period_type === 'CUSTOM' ? null : plan.fiscal_year_id,
          fiscal_period_id: null,
          quarter: plan.period_type === 'QUARTERLY' ? Number(plan.quarter) : null,
          start_date: plan.period_type === 'CUSTOM' ? logic.normalizeDate(plan.start_date) : null,
          end_date: plan.period_type === 'CUSTOM' ? logic.normalizeDate(plan.end_date) : null,
          base_currency_id: plan.base_currency_id || baseCurrency.id,
          is_active: plan.is_active !== false
        } : { is_active: plan.is_active !== false };
        let id = plan.id;
        if (isNew && mode === 'COPY') {
          if (String(sourcePlan.base_currency_id) !== String(baseCurrency.id))
            throw new Error(t('ارز پایه بودجه مبدا با ارز پایه فعلی متفاوت است', 'Source base currency differs from current base currency'));
          const copiedLines = await loadAll('fm_budget_setup_lines', logic.lineColumns,
            query => query.eq('plan_id', sourcePlan.id));
          const { data, error } = await supabase.from('fm_budget_setup_plans')
            .insert([{ ...payload, plan_kind: 'MAIN', status: 'DRAFT' }]).select('id').single();
          if (error) throw error;
          id = data.id;
          try {
            for (let offset = 0; offset < copiedLines.length; offset += 100) {
              const batch = copiedLines.slice(offset, offset + 100).map(row => ({
                ...logic.toLine(logic.fromLine(row)), plan_id: id
              }));
              const { error: copyError } = await supabase.from('fm_budget_setup_lines').insert(batch);
              if (copyError) throw copyError;
            }
          } catch (copyError) {
            const { error: cleanupError } = await supabase.from('fm_budget_setup_plans').delete().eq('id', id);
            if (cleanupError) throw new Error(`${copyError.message}; ${t('کپی ناقص با کد', 'Incomplete copy with code')} ${payload.code}: ${cleanupError.message}`);
            throw copyError;
          }
        } else if (isNew) {
          const { data, error } = await supabase.from('fm_budget_setup_plans')
            .insert([{ ...payload, plan_kind: 'MAIN', status: 'DRAFT' }]).select('id').single();
          if (error) throw error;
          id = data.id;
        } else {
          let query = supabase.from('fm_budget_setup_plans').update(payload).eq('id', id).eq('plan_kind', 'MAIN');
          if (canEditFields) query = query.in('status', ['DRAFT', 'TEMPORARY']);
          const { error } = await query.select('id').single();
          if (error) throw error;
        }
        if (isNew && window.AutoNumberingService && plan.generatedCode && payload.code === plan.generatedCode) {
          try { await window.AutoNumberingService.consumeNext('BUDGET_PLAN'); }
          catch (error) { console.error('Budget plan numbering consume failed:', error); }
        }
        await logAction(id, isNew ? 'create' : 'update',
          `${isNew ? 'ایجاد' : 'ویرایش'} سربرگ بودجه: ${payload.code || plan.code}`);
        onSaved({ ...plan, ...payload, id, status: isNew ? 'DRAFT' : plan.status }, mode);
      } catch (error) {
        showToast(error?.message || t('ذخیره سربرگ انجام نشد', 'Failed to save budget header'), 'error');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    };

    const yearOptions = years.filter(row => row.is_active || String(row.id) === String(plan.fiscal_year_id))
      .map(row => ({ value: row.id, label: logic.englishDigits(row.year_code) }));
    const title = mode === 'EDIT' ? t('ویرایش سربرگ بودجه', 'Edit Budget Header')
      : mode === 'COPY' ? t('کپی برنامه بودجه', 'Copy Budget Plan')
        : t('تعریف برنامه بودجه', 'New Budget Plan');
    return <>
      <Modal isOpen onClose={onClose} title={title} language={language} width="max-w-2xl">
        {loading ? <div className="p-4 flex flex-col gap-3"><Skeleton height="2rem" /><Skeleton height="12rem" /></div>
          : loadError ? <EmptyState title={t('دریافت اطلاعات انجام نشد', 'Failed to load data')}
              action={<Button size="sm" onClick={loadData}>{t('تلاش دوباره', 'Retry')}</Button>} />
            : <div className="p-4 flex flex-col gap-4 max-h-[75vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
                <div className="grid grid-cols-2 gap-3">
                  <TextField size="sm" formCode={formCode} label={t('کد برنامه', 'Plan Code')} required
                    value={logic.englishDigits(plan.code)} disabled={!canEditFields} dir="ltr" isRtl={false}
                    onChange={event => update('code', logic.englishDigits(event.target.value))} />
                  <TextField size="sm" formCode={formCode}
                    label={t('عنوان برنامه', 'Plan Title')} required value={plan.title || ''}
                    disabled={!canEditFields} isRtl={isRtl}
                    onChange={event => update('title', event.target.value)} />
                  <SelectField size="sm" formCode={formCode} label={t('نوع دوره', 'Period Type')} required
                    value={plan.period_type || 'ANNUAL'} disabled={!canEditFields} isRtl={isRtl}
                    options={[{ value: 'ANNUAL', label: t('سالیانه', 'Annual') },
                      { value: 'QUARTERLY', label: t('فصلی', 'Quarterly') },
                      { value: 'CUSTOM', label: t('دوره‌ای', 'Custom Period') }]}
                    onChange={event => setPlan(current => ({ ...current, period_type: event.target.value,
                      fiscal_year_id: '', quarter: '', start_date: '', end_date: '' }))} />
                  <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={plan.is_active !== false}
                    disabled={!access.canEdit && !isNew} isRtl={isRtl} wrapperClassName="self-end min-h-8"
                    onChange={value => update('is_active', value)} />
                  {plan.period_type !== 'CUSTOM' && <SelectField size="sm" formCode={formCode}
                    label={t('سال مالی', 'Fiscal Year')} required value={plan.fiscal_year_id || ''}
                    options={yearOptions} disabled={!canEditFields} isRtl={isRtl}
                    onChange={event => update('fiscal_year_id', event.target.value)} />}
                  {plan.period_type === 'QUARTERLY' && <SelectField size="sm" formCode={formCode}
                    label={t('فصل', 'Quarter')} required value={String(plan.quarter || '')}
                    options={[1, 2, 3, 4].map(value => ({ value: String(value), label: t(`فصل ${value}`, `Q${value}`) }))}
                    disabled={!canEditFields} isRtl={isRtl}
                    onChange={event => update('quarter', event.target.value)} />}
                  {plan.period_type === 'CUSTOM' && <>
                    <DatePicker size="sm" formCode={formCode} label={t('تاریخ شروع', 'Start Date')} required
                      value={plan.start_date || ''} disabled={!canEditFields}
                      language={language} isRtl={isRtl}
                      onChange={value => update('start_date', logic.englishDigits(value))} />
                    <DatePicker size="sm" formCode={formCode} label={t('تاریخ پایان', 'End Date')} required
                      value={plan.end_date || ''} disabled={!canEditFields}
                      language={language} isRtl={isRtl}
                      onChange={value => update('end_date', logic.englishDigits(value))} />
                  </>}
                </div>
                <div className="flex items-center justify-end border-t border-slate-200 dark:border-slate-700 pt-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={onClose}>{t('انصراف', 'Cancel')}</Button>
                    {(canEditFields || access.canEdit) && <Button size="sm" variant="primary" icon={Save}
                      isLoading={saving} onClick={save}>{t('ذخیره', 'Save')}</Button>}
                  </div>
                </div>
              </div>}
      </Modal>
      <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
        onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
    </>;
  };

  window.BudgetSetupHeader = BudgetSetupHeader;
})();

/* Budget planning form */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { ClipboardList = FallbackIcon, Edit = FallbackIcon, Copy = FallbackIcon,
    List = FallbackIcon, Sigma = FallbackIcon,
    Trash2 = FallbackIcon, AlertTriangle = FallbackIcon, FileText = FallbackIcon,
    CheckSquare = FallbackIcon, CheckCircle = FallbackIcon,
    MessageSquare = FallbackIcon, Paperclip = FallbackIcon } = window.LucideIcons || {};

  const BudgetSetup = ({ language = 'fa', formCode = 'BUD_SETUP' }) => {
    const Empty = () => null;
    const { PageHeader = Empty, Button = Empty, Badge = Empty, EmptyState = Empty, Skeleton = Empty } = window.DSCore || window.DesignSystem || {};
    const { DataGrid = Empty, AdvancedFilter = Empty, LOVField = Empty } = window.DSGrid || window.DesignSystem || {};
    const { SelectField = Empty } = window.DSForms || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty } = window.DSFeedback || window.DesignSystem || {};
    const logic = window.BudgetSetupLogic;
    const supabase = window.supabase;
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => securityCtx?.getActions(formCode) || {
      canView: false, canCreate: false, canEdit: false, canDelete: false
    }, [securityCtx, formCode]);
    const requestIdRef = useRef(0);
    const summaryRequestRef = useRef(0);
    const [plans, setPlans] = useState([]);
    const [years, setYears] = useState([]);
    const [filterLookups, setFilterLookups] = useState({ centers: [], sources: [], headings: [] });
    const [planLines, setPlanLines] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [totals, setTotals] = useState({});
    const [selected, setSelected] = useState(null);
    const [commentPlan, setCommentPlan] = useState(null);
    const [attachmentPlan, setAttachmentPlan] = useState(null);
    const [headerModal, setHeaderModal] = useState(null);
    const [summaryPlan, setSummaryPlan] = useState(null);
    const [summaryGroup, setSummaryGroup] = useState('CENTER');
    const [summaryRows, setSummaryRows] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(false);
    const [summaryReload, setSummaryReload] = useState(0);
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [deletePlan, setDeletePlan] = useState(null);
    const [bulkAction, setBulkAction] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(value => ({ ...value, isVisible: false })), 3500);
    }, []);

    const loadAll = useCallback(async (table, columns, orderField = 'id', configure = query => query) => {
      const result = [];
      const pageSize = 500;
      for (let from = 0; ; from += pageSize) {
        let query = configure(supabase.from(table).select(columns))
          .order(orderField, { ascending: true });
        if (orderField !== 'id') query = query.order('id', { ascending: true });
        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error) throw error;
        result.push(...(data || []));
        if (!data || data.length < pageSize) return result;
      }
    }, [supabase]);

    const loadByIds = useCallback(async (table, columns, field, ids) => {
      const rows = [];
      const uniqueIds = [...new Set(ids.filter(id => id != null).map(String))];
      for (let start = 0; start < uniqueIds.length; start += 100) {
        const batch = uniqueIds.slice(start, start + 100);
        for (let from = 0; ; from += 500) {
          const { data, error } = await supabase.from(table).select(columns).in(field, batch)
            .order('id', { ascending: true }).range(from, from + 499);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < 500) break;
        }
      }
      return rows;
    }, [supabase]);

    const fetchData = useCallback(async () => {
      if (!access.canView) return false;
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        if (!supabase) throw new Error('Supabase client is unavailable');
        const [planRows, yearRows, currencyRows, activeCenters, headingRows, activeSources] = await Promise.all([
          loadAll('fm_budget_setup_plans', `id,code,title,period_type,fiscal_year_id,quarter,start_date,end_date,base_currency_id,status,is_active,created_at,${window.BudgetSetupSupport.statusFields}`,
            'created_at', query => query.eq('plan_kind', 'MAIN')),
          loadAll('fm_fiscal_years', 'id,year_code,start_date,end_date,is_active', 'start_date'),
          loadAll('fm_currencies', 'id,code,decimal_places,system_role'),
          loadAll('fm_cost_benefit_centers', logic.centerColumns),
          logic.loadTypes(loadAll, language),
          loadAll('fm_funding_sources', 'id,code,title_fa,title_en,is_active')
        ]);
        if (requestId !== requestIdRef.current) return false;
        const savedLines = await loadByIds('fm_budget_setup_lines', logic.lineColumns,
          'plan_id', planRows.map(row => row.id));
        const creators = await window.BudgetSetupSupport.loadCreators(
          (table, columns, configure) => loadAll(table, columns, 'id', configure), planRows);
        if (requestId !== requestIdRef.current) return false;
        const lineRows = savedLines.map(logic.fromLine);
        const headingTypes = new Map(headingRows.map(row => [String(row.id), row.heading_type]));
        if (lineRows.some(row => !headingTypes.has(String(row.item_id))))
          throw new Error(t('نوع هزینه یا درآمد یک یا چند ردیف در دسترس نیست', 'A line cost or income type is unavailable'));
        const filterHeadings = headingRows.filter(row => row.is_active && row.isLeaf);
        const currencyMap = new Map(currencyRows.map(row => [String(row.id), row]));
        const linesByPlan = new Map();
        for (const line of lineRows) {
          const id = String(line.plan_id);
          if (!linesByPlan.has(id)) linesByPlan.set(id, []);
          linesByPlan.get(id).push(line);
        }
        setPlans(planRows.slice().reverse().map(row => ({ ...row, _creator: creators.get(String(row.id)) || null })));
        setYears(yearRows);
        setPlanLines(lineRows);
        setFilterLookups({ centers: activeCenters.filter(row => row.is_active), sources: activeSources.filter(row => row.is_active), headings: filterHeadings });
        setCurrencies(currencyRows);
        setTotals(Object.fromEntries(planRows.map(plan => [String(plan.id),
          logic.totalsByType(linesByPlan.get(String(plan.id)) || [], headingTypes,
            currencyMap.get(String(plan.base_currency_id))?.decimal_places ?? 0)])));
        setLoadError(false);
        return true;
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setLoadError(true);
          showToast(t('دریافت برنامه‌های بودجه انجام نشد', 'Failed to load budget plans'), 'error');
        }
        return false;
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, [access.canView, supabase, loadAll, loadByIds, showToast, t, language]);

    useEffect(() => {
      fetchData();
      return () => { requestIdRef.current += 1; };
    }, [fetchData]);

    useEffect(() => {
      if (!summaryPlan?.id) return;
      const request = ++summaryRequestRef.current;
      setSummaryLoading(true);
      setSummaryError(false);
      setSummaryRows([]);
      const load = async () => {
        try {
          if (summaryPlan._summarySnapshot) {
            const snapshot = summaryPlan._summarySnapshot;
            const groups = { CENTER: snapshot.centers, HEADING: snapshot.headings, SOURCE: snapshot.sources }[summaryGroup];
            setSummaryRows(logic.summarizeByType(snapshot.lines, snapshot.headings, groups, summaryGroup, snapshot.precision));
            return;
          }
          const savedLines = await loadByIds('fm_budget_setup_lines', logic.lineColumns,
            'plan_id', [summaryPlan.id]);
          if (request !== summaryRequestRef.current) return;
          const lines = savedLines.map(logic.fromLine);
          const headings = await logic.loadTypes(loadAll, language);
          if (request !== summaryRequestRef.current) return;
          const groupConfig = {
            CENTER: ['fm_cost_benefit_centers', 'cost_benefit_center_id'],
            SOURCE: ['fm_funding_sources', 'funding_source_id']
          }[summaryGroup];
          const groups = summaryGroup === 'HEADING' ? headings : await loadByIds(groupConfig[0],
            'id,code,title_fa,title_en', 'id', lines.map(row => row[groupConfig[1]]));
          if (request !== summaryRequestRef.current) return;
          const precision = currencies.find(row => String(row.id) === String(summaryPlan.base_currency_id))?.decimal_places ?? 0;
          setSummaryRows(logic.summarizeByType(lines, headings, groups, summaryGroup, precision));
        } catch (error) {
          if (request === summaryRequestRef.current) {
            setSummaryError(true);
            showToast(error?.message || t('دریافت تجمیع بودجه انجام نشد', 'Failed to load budget summary'), 'error');
          }
        } finally {
          if (request === summaryRequestRef.current) setSummaryLoading(false);
        }
      };
      load();
      return () => { summaryRequestRef.current += 1; };
    }, [summaryPlan, summaryGroup, summaryReload, loadByIds, loadAll, currencies, showToast, t, language]);

    const yearById = useMemo(() => new Map(years.map(row => [String(row.id), row])), [years]);
    const currencyById = useMemo(() => new Map(currencies.map(row => [String(row.id), row])), [currencies]);
    const filteredPlans = useMemo(() => plans.filter(plan => {
      const centerId = filters.cost_benefit_center?.id;
      const sourceId = filters.funding_source?.id;
      const costTypeId = filters.cost_type?.id;
      const incomeTypeId = filters.income_type?.id;
      if (!centerId && !sourceId && !costTypeId && !incomeTypeId) return true;
      const matchingLines = planLines.filter(line => String(line.plan_id) === String(plan.id) &&
        (!centerId || String(line.cost_benefit_center_id) === String(centerId)) &&
        (!sourceId || String(line.funding_source_id) === String(sourceId)));
      return matchingLines.length > 0 &&
        (!costTypeId || matchingLines.some(line => String(line.item_id) === String(costTypeId))) &&
        (!incomeTypeId || matchingLines.some(line => String(line.item_id) === String(incomeTypeId)));
    }), [plans, planLines, filters]);

    const statusLabel = value => ({
      DRAFT: t('یادداشت', 'Draft'), TEMPORARY: t('موقت', 'Temporary'),
      FINAL: t('بررسی شده', 'Reviewed'), APPROVED: t('تأیید شده', 'Approved')
    }[value] || value);
    const periodLabel = row => {
      if (row.period_type === 'CUSTOM') return `${logic.englishDigits(row.start_date || '-')} – ${logic.englishDigits(row.end_date || '-')}`;
      const year = yearById.get(String(row.fiscal_year_id));
      const yearCode = logic.englishDigits(year?.year_code || '-');
      return row.period_type === 'QUARTERLY'
        ? t(`فصل ${row.quarter} سال ${yearCode}`, `Q${row.quarter} / ${yearCode}`)
        : t(`سالانه ${yearCode}`, `Annual / ${yearCode}`);
    };

    const logAction = async (id, action, details) => {
      const { error } = await supabase.from('fm_record_logs').insert([{
        entity_type: 'تنظیم بودجه', record_id: String(id), action,
        user_name: window.NavigationSystem?.currentUser?.name || 'system', details
      }]);
      if (error) console.error('Budget plan audit log failed:', error);
    };

    const confirmDelete = async () => {
      const row = deletePlan;
      if (!row || row.status !== 'DRAFT' || !access.canDelete || saving) return;
      setSaving(true);
      try {
        const { error } = await supabase.from('fm_budget_setup_plans').delete()
          .eq('id', row.id).eq('plan_kind', 'MAIN').eq('status', 'DRAFT').select('id').single();
        if (error) throw error;
        await logAction(row.id, 'delete', `حذف برنامه بودجه: ${row.code}`);
        setDeletePlan(null);
        setSelectedIds(current => current.filter(id => id !== row.id));
        if (await fetchData()) showToast(t('برنامه بودجه حذف شد', 'Budget plan deleted'));
      } catch (error) {
        showToast(t('حذف برنامه بودجه انجام نشد', 'Failed to delete budget plan'), 'error');
      } finally {
        setSaving(false);
      }
    };

    const confirmBulkAction = async () => {
      if (!bulkAction || saving) return;
      const selected = plans.filter(row => bulkAction.ids.includes(row.id));
      const eligible = selected.filter(row => bulkAction.target === 'DELETE'
        ? row.status === 'DRAFT' && access.canDelete
        : access.canEdit && bulkAction.fromStatuses.includes(row.status) &&
          window.BudgetSetupLogic?.transitions?.[row.status]?.includes(bulkAction.target));
      if (!eligible.length) {
        setBulkAction(null);
        return showToast(t('هیچ برنامهٔ واجد شرایطی انتخاب نشده است', 'No eligible plans selected'), 'warning');
      }
      setSaving(true);
      try {
        const ids = eligible.map(row => row.id);
        if (bulkAction.target === 'TEMPORARY') {
          for (const plan of eligible) await logic.validateTemporary({ client: supabase, plan, t });
        }
        if (bulkAction.target === 'FINAL' || bulkAction.target === 'APPROVED') {
          const saved = await loadByIds('fm_budget_setup_lines', logic.lineColumns, 'plan_id', ids);
          for (const row of eligible) {
            await window.BudgetSetupAllocationLogic.validateForReview({ client: supabase, plan: row, t });
            const rows = saved.filter(line => String(line.plan_id) === String(row.id));
            if (!rows.some(line => line.is_active !== false))
              throw new Error(t(`بودجه ${row.code} ردیف فعال ندارد`, `Budget ${row.code} has no active lines`));
            if (bulkAction.target === 'FINAL' && rows.some(line => Number(line.amount) === 0))
              throw new Error(t(`بودجه ${row.code} ردیف با مبلغ صفر دارد`, `Budget ${row.code} has a zero amount line`));
          }
        }
        const query = bulkAction.target === 'DELETE'
          ? supabase.from('fm_budget_setup_plans').delete().in('id', ids).eq('status', 'DRAFT')
          : supabase.from('fm_budget_setup_plans').update({ status: bulkAction.target, ...window.BudgetSetupSupport.statusMetadata(bulkAction.target) })
              .in('id', ids).in('status', bulkAction.fromStatuses);
        const { data, error } = await query.eq('plan_kind', 'MAIN').select('id');
        if (error) throw error;
        if (data?.length !== ids.length) throw new Error(t('تعداد برنامه‌های تغییر یافته با انتخاب‌ها برابر نیست؛ فهرست را بازخوانی کنید', 'Some plans were not changed; refresh the list'));
        for (const row of eligible) await logAction(row.id,
          bulkAction.target === 'DELETE' ? 'delete' : 'update',
          `عملیات گروهی برنامه بودجه: ${bulkAction.target}`);
        setBulkAction(null);
        setSelectedIds([]);
        if (await fetchData()) showToast(t('عملیات گروهی انجام شد', 'Bulk action completed'));
      } catch (error) {
        showToast(error?.message || t('عملیات گروهی انجام نشد', 'Bulk action failed'), 'error');
        await fetchData();
      } finally {
        setSaving(false);
      }
    };

    const bulkActions = [
      { label: t('تبدیل به موقت', 'Set Temporary'), icon: FileText, variant: 'outline', requiredAccess: 'edit',
        onClick: ids => setBulkAction({ ids, target: 'TEMPORARY', fromStatuses: ['DRAFT'] }) },
      { label: t('برگشت به یادداشت', 'Revert to Draft'), icon: Edit, variant: 'outline', requiredAccess: 'edit',
        onClick: ids => setBulkAction({ ids, target: 'DRAFT', fromStatuses: ['TEMPORARY'] }) },
      { label: t('تبدیل به بررسی شده', 'Set Reviewed'), icon: CheckSquare, variant: 'outline', requiredAccess: 'edit',
        onClick: ids => setBulkAction({ ids, target: 'FINAL', fromStatuses: ['TEMPORARY'] }) },
      { label: t('تأیید بودجه', 'Approve'), icon: CheckCircle, variant: 'outline', requiredAccess: 'edit',
        onClick: ids => setBulkAction({ ids, target: 'APPROVED', fromStatuses: ['FINAL'] }) },
      { label: t('برگشت به موقت', 'Revert to Temporary'), icon: FileText, variant: 'outline', requiredAccess: 'edit',
        onClick: ids => setBulkAction({ ids, target: 'TEMPORARY', fromStatuses: ['FINAL'] }) },
      { label: t('حذف گروهی یادداشت‌ها', 'Bulk Delete Drafts'), icon: Trash2, variant: 'danger-outline', requiredAccess: 'delete',
        onClick: ids => setBulkAction({ ids, target: 'DELETE' }) }
    ];

    const filterHeadingColumns = logic.referenceLovColumns(language, true);
    const filterFields = [
      { name: 'cost_benefit_center', label: t('مرکز هزینه و درآمد', 'Cost and Income Center'), type: 'lov',
        lovData: filterLookups.centers, lovColumns: logic.centerLovColumns(language), dropdownWidth: 'min-w-[600px] max-w-[760px]' },
      { name: 'funding_source', label: t('مرکز تأمین', 'Funding Source'), type: 'lov',
        lovData: filterLookups.sources, lovColumns: logic.referenceLovColumns(language) },
      { name: 'cost_type', label: t('نوع هزینه', 'Cost Type'), type: 'lov',
        lovData: filterLookups.headings.filter(row => row.heading_type === 'COST'),
        lovColumns: filterHeadingColumns,
        dropdownWidth: 'min-w-[540px] max-w-[640px]' },
      { name: 'income_type', label: t('نوع درآمد', 'Income Type'), type: 'lov',
        lovData: filterLookups.headings.filter(row => row.heading_type === 'INCOME'),
        lovColumns: filterHeadingColumns,
        dropdownWidth: 'min-w-[540px] max-w-[640px]' }
    ];
    const formatForPlan = (amount, plan) => {
      const currency = currencyById.get(String(plan.base_currency_id));
      return `${logic.formatAmount(amount, currency?.decimal_places ?? 0)} ${currency?.code || ''}`.trim();
    };
    const summaryColumns = [
      { field: 'title_fa', header_fa: 'عنوان', header_en: 'Title', width: '220px',
        render: (_value, row) => logic.referenceLabel(row, language) },
      { field: 'heading_type', header_fa: 'نوع', header_en: 'Type', width: '110px',
        render: value => value === 'INCOME' ? t('درآمدی', 'Income') : t('هزینه‌ای', 'Cost') },
      { field: 'active_amount', header_fa: 'مبلغ ردیف‌های فعال', header_en: 'Active Line Amount', width: '170px',
        render: (value, row) => <span dir="ltr" className={`font-semibold ${row.heading_type === 'INCOME'
          ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
          {formatForPlan(value, summaryPlan || {})}
        </span> },
      { field: 'inactive_amount', header_fa: 'مبلغ ردیف‌های غیرفعال', header_en: 'Inactive Line Amount', width: '170px',
        render: (value, row) => <span dir="ltr" className={row.heading_type === 'INCOME'
          ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
          {formatForPlan(value, summaryPlan || {})}
        </span> }
    ];
    const columns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px',
        render: value => <span className="font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{logic.englishDigits(value)}</span> },
      { field: 'title', header_fa: 'عنوان برنامه', header_en: 'Plan Title', width: '220px' },
      { field: 'period_type', header_fa: 'بازه', header_en: 'Period', width: '150px',
        render: (_value, row) => periodLabel(row) },
      { field: 'status', header_fa: 'وضعیت گردش', header_en: 'Workflow Status', width: '130px',
        render: value => <Badge variant={{ DRAFT: 'gray', TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'success' }[value] || 'gray'}>{statusLabel(value)}</Badge> },
      { field: 'created_at', header_fa: 'تاریخ ثبت', header_en: 'Created At', type: 'date', width: '115px' },
      { field: '_creator', header_fa: 'ثبت‌کننده', header_en: 'Created By', width: '150px', render: value => value || '-' },
      { field: '_income_total', header_fa: 'کل درآمد', header_en: 'Total Income', width: '150px',
        render: (_value, row) => totals[String(row.id)] == null ? '-'
          : <span dir="ltr" className="font-semibold text-emerald-700 dark:text-emerald-400">
              {formatForPlan(totals[String(row.id)].income, row)}
            </span> },
      { field: '_cost_total', header_fa: 'کل هزینه', header_en: 'Total Cost', width: '150px',
        render: (_value, row) => totals[String(row.id)] == null ? '-'
          : <span dir="ltr" className="font-semibold text-red-700 dark:text-red-400">
              {formatForPlan(totals[String(row.id)].cost, row)}
            </span> },
      ...window.BudgetSetupSupport.lifecycleColumns(),
      { field: 'is_active', header_fa: 'فعال', header_en: 'Active', type: 'toggle', width: '80px' }
    ];

    if (!access.canView) return <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} />;
    const Details = window.BudgetSetupDetails;
    const Header = window.BudgetSetupHeader;
    const CommentModal = window.DSComments?.CommentModal;
    const Attachments = window.DSRecordAttachments?.RecordAttachmentModal;
    return (
      <div className={selected
        ? 'h-full flex flex-col font-sans overflow-hidden'
        : 'p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900 overflow-hidden'}
        dir={isRtl ? 'rtl' : 'ltr'}>
        {selected && Details ? (
          <Details sourcePlan={selected.plan} copyNotice={selected.copyNotice} language={language} formCode={formCode}
            onAttachments={setAttachmentPlan} onSummary={plan => { setSummaryGroup('CENTER'); setSummaryPlan(plan); }}
            onBack={() => { setSelected(null); fetchData(); }} />
        ) : (
          <>
            <PageHeader title={t('تنظیم بودجه', 'Budget Setup')} icon={ClipboardList} language={language}
              description={t('تعریف برنامه‌های بودجه', 'Manage budget plans')}
              breadcrumbs={[{ label: t('بودجه‌ریزی', 'Budgeting') }, { label: t('تنظیم بودجه', 'Budget Setup') }]} />
            <div className="flex-1 min-h-0 mt-4 flex flex-col gap-2 overflow-hidden">
              <AdvancedFilter fields={filterFields} language={language} initialValues={filters}
                onFilter={value => { setFilters(value); setSelectedIds([]); }}
                onSearch={value => { setFilters(value); setSelectedIds([]); }}
                onClear={() => { setFilters({}); setSelectedIds([]); }} />
              <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                {loading && !plans.length ? <div className="p-4 flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="12rem" /></div> :
                  loadError ? <EmptyState title={t('دریافت برنامه‌ها انجام نشد', 'Could not load plans')}
                    action={<Button size="sm" onClick={fetchData}>{t('تلاش دوباره', 'Retry')}</Button>} /> :
                  <DataGrid key={JSON.stringify(filters)} data={filteredPlans} columns={columns} language={language}
                    formCode={formCode} gridState={gridState} onGridStateChange={setGridState}
                    hideImport hideExport defaultHiddenCols={window.BudgetSetupSupport.hiddenStatusColumns} actionWidth="190px" selectable selectedRowIds={selectedIds}
                    onSelectionChange={setSelectedIds} bulkActions={bulkActions}
                    onAdd={access.canCreate ? () => setHeaderModal({ mode: 'CREATE', plan: null }) : undefined}
                    onRowClick={row => setHeaderModal({ mode: 'EDIT', plan: row })}
                    actions={[
                      { id: 'header', icon: Edit, tooltip: t('ویرایش سربرگ', 'Edit Header'),
                        onClick: row => setHeaderModal({ mode: 'EDIT', plan: row }), requiredAccess: 'view' },
                      { id: 'lines', icon: List, tooltip: t('ردیف‌های بودجه', 'Budget Lines'),
                        onClick: row => setSelected({ plan: row }), requiredAccess: 'view' },
                      { id: 'summary', icon: Sigma, tooltip: t('نمایش تجمیع بودجه', 'Budget Summary'),
                        onClick: row => { setSummaryGroup('CENTER'); setSummaryPlan(row); }, requiredAccess: 'view' },
                      { id: 'comments', icon: MessageSquare, tooltip: t('کامنت‌ها', 'Comments'),
                        onClick: setCommentPlan, requiredAccess: 'view' },
                      { id: 'attachments', icon: Paperclip, tooltip: t('پیوست‌ها', 'Attachments'),
                        onClick: setAttachmentPlan, requiredAccess: 'view' },
                      { id: 'copy', icon: Copy, tooltip: t('کپی برنامه', 'Copy Plan'),
                        onClick: row => setHeaderModal({ mode: 'COPY', plan: row }), requiredAccess: 'create' },
                      { id: 'delete', icon: Trash2, tooltip: t('حذف یادداشت', 'Delete Draft'),
                        hidden: row => row.status !== 'DRAFT',
                        onClick: setDeletePlan,
                        requiredAccess: 'delete', className: 'text-red-500' }
                    ]} />}
              </div>
            </div>
          </>
        )}
        <Modal isOpen={!!deletePlan} onClose={() => setDeletePlan(null)}
          title={t('تأیید حذف برنامه', 'Confirm Plan Deletion')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle} title={t('حذف یادداشت بودجه', 'Delete Budget Draft')}
            description={t(`برنامه «${deletePlan?.title || ''}» حذف شود؟`, `Delete “${deletePlan?.title || ''}”?`)}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDeletePlan(null)}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="danger" isLoading={saving} onClick={confirmDelete}>{t('حذف', 'Delete')}</Button>
            </div>} />
        </Modal>
        <Modal isOpen={!!bulkAction} onClose={() => setBulkAction(null)}
          title={t('تأیید عملیات گروهی', 'Confirm Bulk Action')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle}
            title={bulkAction?.target === 'DELETE' ? t('حذف گروهی', 'Bulk Delete') : statusLabel(bulkAction?.target)}
            description={t(`عملیات روی برنامه‌های واجد شرایط از ${bulkAction?.ids?.length || 0} مورد انتخاب‌شده انجام شود؟`,
              `Apply this action to eligible plans among ${bulkAction?.ids?.length || 0} selected?`)}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setBulkAction(null)}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant={bulkAction?.target === 'DELETE' ? 'danger' : 'primary'}
                isLoading={saving} onClick={confirmBulkAction}>{t('تأیید', 'Confirm')}</Button>
            </div>} />
        </Modal>
        {Header && headerModal && <Header key={`${headerModal.mode}-${headerModal.plan?.id || 'new'}`}
          mode={headerModal.mode} sourcePlan={headerModal.plan} language={language} formCode={formCode}
          onClose={() => setHeaderModal(null)}
          onSaved={(record, mode) => {
            const original = headerModal.plan;
            setHeaderModal(null);
            fetchData();
            if (mode !== 'EDIT') setSelected({ plan: record, copyNotice: mode === 'COPY' ? original : null });
          }} />}
        {commentPlan && CommentModal &&
          <CommentModal isOpen onClose={() => setCommentPlan(null)}
            entityType="fm_budget_setup_plans" entityId={String(commentPlan.id)}
            entityTitle={`${t('کد:', 'Code:')} ${logic.englishDigits(commentPlan.code)}  |  ${t('عنوان:', 'Title:')} ${commentPlan.title || '-'}`}
            formTitle={t('تنظیم بودجه', 'Budget Setup')} formComponent="BudgetSetup"
            language={language} />}
        <Modal isOpen={!!summaryPlan} onClose={() => setSummaryPlan(null)}
          title={t('اطلاعات تجمیعی بودجه', 'Budget Summary')} language={language} width="max-w-5xl">
          <div className="p-4 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {logic.englishDigits(summaryPlan?.code)} - {summaryPlan?.title}
                {summaryPlan?._summarySnapshot?.dirty && <Badge variant="orange">{t('شامل تغییرات ذخیره‌نشده', 'Includes unsaved changes')}</Badge>}
              </div>
              <SelectField size="sm" wrapperClassName="w-full sm:w-64" isRtl={isRtl}
                label={t('مبنای تجمیع', 'Group By')} value={summaryGroup}
                options={[
                  { value: 'CENTER', label: t('مرکز هزینه و درآمد', 'Cost and Income Center') },
                  { value: 'HEADING', label: t('نوع هزینه / درآمد', 'Cost / Income Type') },
                  { value: 'SOURCE', label: t('منبع تأمین اعتبار', 'Funding Source') }
                ]} onChange={event => setSummaryGroup(event.target.value)} />
            </div>
            <div className="h-[50vh] min-h-[300px]">
              {summaryLoading ? <div className="flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="12rem" /></div>
                : summaryError ? <EmptyState title={t('دریافت تجمیع انجام نشد', 'Failed to load summary')}
                    action={<Button size="sm" onClick={() => setSummaryReload(value => value + 1)}>
                      {t('تلاش دوباره', 'Retry')}</Button>} />
                  : <DataGrid key={summaryGroup} data={summaryRows} columns={summaryColumns}
                      language={language} formCode={formCode} hideToolbar hideImport hideExport />}
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSummaryPlan(null)}>{t('بستن', 'Close')}</Button>
            </div>
          </div>
        </Modal>
        {Attachments && attachmentPlan && <Attachments key={attachmentPlan.id} entityType="BUDGET_SETUP"
          recordTable="fm_budget_setup_plans" recordId={attachmentPlan.id} recordTitle={`${attachmentPlan.code} - ${attachmentPlan.title}`}
          storageFolder="budget_setup" auditEntityType="تنظیم بودجه" formCode={formCode} language={language}
          onClose={() => setAttachmentPlan(null)} onNotify={showToast} />}
        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
      </div>
    );
  };

  BudgetSetup.formCode = 'BUD_SETUP';
  window.BudgetSetup = BudgetSetup;
})();
