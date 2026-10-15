/* Single, group and workbook entry use the same employee validation and persistence. */
(() => {
  const { useState, useEffect } = window.React;
  const { Button } = window.DSCore;
  const { TextField, SelectField, DatePicker, TextAreaField } = window.DSForms;
  const { Modal, Alert } = window.DSFeedback;
  const { LOVField, DataGrid } = window.DSGrid;
  const logic = window.EmployeeLogic;
  const FallbackIcon = ({ size = 16 }) => window.React.createElement('span', { style: { width: size, height: size } });
  const { Plus = FallbackIcon, Save = FallbackIcon } = window.LucideIcons || {};

  const EmployeeDetails = ({ mode, record, importedRows = [], context, security, formCode, language,
    busy, onClose, onSave, onSaveMany, onQuickCreated, notify }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [form, setForm] = useState(() => logic.draft(context, record?.party_id, record || {}));
    const [rows, setRows] = useState(importedRows);
    const [selected, setSelected] = useState([]);
    const [commonStart, setCommonStart] = useState('');
    const [commonStatus, setCommonStatus] = useState('ACTIVE');
    const [quick, setQuick] = useState(null);
    const [quickBusy, setQuickBusy] = useState(false);
    const [error, setError] = useState('');
    const [quickError, setQuickError] = useState('');
    const [quickForm, setQuickForm] = useState({});
    const party = context.parties.find(p => logic.same(p.id, form.party_id));
    const partyCode = logic.codeFor(context, 'Parties');
    const usersCode = logic.codeFor(context, 'UserManagement');
    const canEditParty = security.getActions(partyCode).canEdit;
    const canCreateParty = security.getActions(partyCode).canCreate;
    const canCreateUser = security.getActions(usersCode).canCreate;
    const access = security.getActions(formCode);
    const writable = record?.id ? access.canEdit : access.canCreate;
    const disabled = busy || !writable;
    const partyOptions = context.parties.filter(p =>
      (logic.same(p.id, record?.party_id) || (p.roles?.includes('employee') && !context.records.some(r => logic.same(r.party_id, p.id)))))
      .map(p => ({ ...p, title: logic.name(p) }));
    const userOptions = context.users.filter(u => logic.same(u.party_id, form.party_id) &&
      (u.is_active === true || logic.same(u.id, record?.user_id)));
    const statuses = logic.statuses.map(s => ({ value: s.value, label: t(s.fa, s.en) }));
    const set = (key, value) => {
      setError('');
      setForm(prev => ({ ...prev, [key]: value }));
    };
    const selectParty = p => {
      setError('');
      setForm(prev => ({ ...prev, ...logic.draft(context, p?.id),
        id: prev.id, code: prev.code, updated_at: prev.updated_at,
        father_name: prev.father_name, birth_date: prev.birth_date, start_date: prev.start_date,
        end_date: prev.end_date, status: prev.status, job_title: prev.job_title, notes: prev.notes }));
    };
    const selectUser = u => {
      setForm(prev => ({ ...prev, user_id: u?.id || '',
        mobile: party?.mobile || u?.mobile || '', email: party?.email || u?.email || '' }));
    };
    useEffect(() => {
      setRows(previous => previous.map(row => mode === 'bulk'
        ? { ...row, start_date: commonStart, status: commonStatus, error: null } : row));
    }, [commonStart, commonStatus]);

    const field = (key, fa, en, options = {}) => <TextField key={key} size="sm" label={t(fa, en)}
      value={form[key] || ''} onChange={e => set(key, e.target.value)} isRtl={isRtl}
      disabled={disabled} formCode={formCode} {...options} />;
    const date = (key, fa, en, required = false) => <DatePicker key={key} size="sm" label={t(fa, en)}
      value={form[key] || ''} onChange={value => set(key, value)} required={required}
      language={language} isRtl={isRtl} disabled={disabled} formCode={formCode} />;
    const openQuick = type => {
      setQuickError('');
      setQuick(type);
      setQuickForm(type === 'party' ? { party_type: 'real', first_name: '', last_name: '', company_name: '',
        latin_title: '', national_id: '', mobile: '', email: '' }
        : { username: '', password: '', mobile: form.mobile || '', email: form.email || '' });
    };
    const saveQuick = async () => {
      if (quickBusy || disabled) return;
      setQuickBusy(true);
      setQuickError('');
      try {
        const result = quick === 'party'
          ? await logic.quickParty(window.supabase, security, context, quickForm)
          : await logic.quickUser(window.supabase, security, context, quickForm, form.party_id);
        const nextContext = onQuickCreated(quick, result.saved);
        if (quick === 'party') setForm(prev => ({ ...prev, ...logic.draft(nextContext, result.saved.id),
          start_date: prev.start_date, status: prev.status }));
        else setForm(prev => ({ ...prev, user_id: result.saved.id,
          mobile: party?.mobile || result.saved.mobile || '', email: party?.email || result.saved.email || '' }));
        notify(result.auditError ? t('ثبت انجام شد؛ ثبت لاگ ناموفق بود.', 'Saved; audit logging failed.')
          : t('اطلاعات ثبت شد.', 'Saved.'), result.auditError ? 'warning' : 'success');
        setQuick(null);
        setQuickForm({});
      } catch (e) { setQuickError(isRtl ? e.fa || e.message : e.message); }
      finally { setQuickBusy(false); }
    };
    const saveSingle = async () => {
      if (disabled) return;
      setError('');
      try {
        logic.validate(context, form);
        await onSave(form);
      } catch (e) { setError(isRtl ? e.fa || e.message : e.message); }
    };
    const selectGroup = values => {
      setSelected(values);
      setRows(previous => values.map(p => previous.find(r => logic.same(r.party_id, p.id)) || {
        ...logic.draft(context, p.id), preview_id: `bulk-${p.id}`, party_name: logic.name(p), party_code: p.code,
        username: logic.activeUsers(context, p.id)[0]?.username || '', start_date: commonStart,
        status: commonStatus, error: null
      }));
    };
    const updateRow = (row, key, value) => setRows(prev => prev.map(r => r.preview_id === row.preview_id
      ? { ...r, [key]: value, error: null } : r));
    const saveGroup = async () => {
      if (disabled || !rows.length) return;
      setError('');
      try {
        const remaining = await onSaveMany(rows);
        setRows(remaining);
        if (mode === 'bulk') setSelected(prev => prev.filter(p => remaining.some(r => logic.same(r.party_id, p.id))));
      } catch (e) { setError(isRtl ? e.fa || e.message : e.message); }
    };
    const previewColumns = [
      ...(mode === 'excel' ? [{ field: 'row_number', header_fa: 'ردیف اکسل', header_en: 'Excel row', width: '90px' }] : []),
      { field: 'party_code', header_fa: 'کد شخص', header_en: 'Party code', width: '170px', render: (value, row) =>
        <LOVField size="sm" isRtl={isRtl} data={partyOptions} disabled={disabled} displayValue={value || ''}
          columns={[{ field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
            { field: 'title', header_fa: 'نام', header_en: 'Name' }]}
          onChange={p => setRows(prev => prev.map(r => r.preview_id === row.preview_id ? {
            ...r, ...logic.draft(context, p?.id), preview_id: r.preview_id, row_number: r.row_number,
            party_code: p?.code || '', party_name: logic.name(p), username: logic.activeUsers(context, p?.id)[0]?.username || '',
            father_name: r.father_name, birth_date: r.birth_date, start_date: r.start_date,
            end_date: r.end_date, status: r.status, job_title: r.job_title, notes: r.notes, error: null
          } : r))} /> },
      { field: 'party_name', header_fa: 'شخص یا شرکت', header_en: 'Party', width: '190px' },
      { field: 'username', header_fa: 'نام کاربری', header_en: 'Username', width: '160px', render: (value, row) => {
        const options = logic.activeUsers(context, row.party_id);
        return <LOVField size="sm" isRtl={isRtl} disabled={disabled} formCode={formCode}
          displayValue={options.find(u => logic.same(u.id, row.user_id))?.username || ''} data={options}
          columns={[{ field: 'username', header_fa: 'نام کاربری', header_en: 'Username' }]}
          onChange={user => setRows(prev => prev.map(r => r.preview_id === row.preview_id
            ? { ...r, user_id: user?.id || '', username: user?.username || '', error: null } : r))} />;
      } },
      ...[['father_name', 'نام پدر', 'Father name'], ['job_title', 'عنوان شغلی', 'Job title']].map(([key, fa, en]) => ({
        field: key, header_fa: fa, header_en: en, width: '150px', render: (value, row) =>
          <TextField size="sm" isRtl={isRtl} value={value || ''} aria-label={t(fa, en)}
            disabled={disabled} onChange={e => updateRow(row, key, e.target.value)} />
      })),
      ...[['birth_date', 'تاریخ تولد', 'Birth date'], ['start_date', 'شروع همکاری', 'Start date'],
        ['end_date', 'پایان همکاری', 'End date']].map(([key, fa, en]) => ({
        field: key, header_fa: fa, header_en: en, width: '175px', render: (value, row) =>
          <DatePicker size="sm" isRtl={isRtl} language={language} value={value || ''} disabled={disabled}
            onChange={value => updateRow(row, key, value)} />
      })),
      { field: 'status', header_fa: 'وضعیت', header_en: 'Status', width: '160px', render: (value, row) =>
        <SelectField size="sm" isRtl={isRtl} options={statuses} value={value} disabled={disabled}
          onChange={value => updateRow(row, 'status', value)} /> },
      { field: 'notes', header_fa: 'توضیحات', header_en: 'Notes', width: '190px', render: (value, row) =>
        <TextField size="sm" isRtl={isRtl} value={value || ''} disabled={disabled}
          onChange={e => updateRow(row, 'notes', e.target.value)} /> },
      { field: 'error', header_fa: 'نتیجه بررسی', header_en: 'Validation', width: '260px', render: value => value
        ? <span className="text-rose-600 dark:text-rose-400">{isRtl ? value.fa || value.message : value.message}</span>
        : t('آماده بررسی و ثبت', 'Ready for validation and save') }
    ];
    const quickField = (key, fa, en, options = {}) => <TextField key={key} size="sm" isRtl={isRtl}
      label={t(fa, en)} value={quickForm[key] || ''} disabled={quickBusy}
      onChange={e => setQuickForm(prev => ({ ...prev, [key]: e.target.value }))} {...options} />;

    return <>
      <Modal isOpen onClose={() => { if (!busy && !quickBusy) onClose(); }} language={language}
        width={mode === 'single' ? 'max-w-4xl' : 'max-w-7xl'} title={mode === 'single'
          ? (record ? t('ویرایش اطلاعات کارکنان', 'Edit employee') : t('تعریف کارمند', 'Add employee'))
          : mode === 'bulk' ? t('تعریف گروهی کارکنان', 'Add employee in bulk') : t('ورود کارکنان از اکسل', 'Import employee from Excel')}>
        <div className="p-4 space-y-4">
          {error && <Alert type="error" message={error} />}
          {mode === 'single' ? <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2 flex items-end gap-2">
                <LOVField size="sm" label={t('اتصال به شخص یا شرکت', 'Linked party')} required
                  displayValue={logic.name(party)} data={partyOptions} disabled={disabled || Boolean(record?.id)}
                  columns={[{ field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
                    { field: 'title', header_fa: 'نام', header_en: 'Name' }]}
                  onChange={selectParty} isRtl={isRtl} formCode={formCode} />
                {canCreateParty && !record?.id && <Button size="sm" variant="outline" icon={Plus}
                  title={t('تعریف شخص جدید', 'Create party')} aria-label={t('تعریف شخص جدید', 'Create party')}
                  disabled={disabled} onClick={() => openQuick('party')} />}
              </div>
              <div className="flex items-end gap-2">
                <LOVField size="sm" label={t('نام کاربری', 'Username')} isRtl={isRtl} formCode={formCode}
                  displayValue={context.users.find(u => logic.same(u.id, form.user_id))?.username || ''}
                  data={userOptions} columns={[{ field: 'username', header_fa: 'نام کاربری', header_en: 'Username' }]}
                  disabled={disabled || !party} onChange={selectUser} />
                {canCreateUser && <Button size="sm" variant="outline" icon={Plus}
                  title={t('تعریف کاربر جدید', 'Create user')} aria-label={t('تعریف کاربر جدید', 'Create user')}
                  disabled={disabled || !party} onClick={() => openQuick('user')} />}
              </div>
              {record?.code && field('code', 'کد کارمند', 'Employee code', { disabled: true })}
              {field('first_name', 'نام', 'First name', { disabled: disabled || !party || !canEditParty || party.party_type === 'legal' })}
              {field('last_name', 'نام خانوادگی', 'Last name', { required: party?.party_type !== 'legal',
                disabled: disabled || !party || !canEditParty || party.party_type === 'legal' })}
              {party?.party_type === 'legal' && field('company_name', 'نام شرکت', 'Company name',
                { required: true, disabled: disabled || !canEditParty })}
              {field('mobile', 'شماره موبایل', 'Mobile', { dir: 'ltr', disabled: disabled || !party || !canEditParty })}
              {field('email', 'ایمیل', 'Email', { type: 'email', dir: 'ltr', disabled: disabled || !party || !canEditParty })}
              {field('father_name', 'نام پدر', 'Father name')}
              {date('birth_date', 'تاریخ تولد', 'Birth date')}
              {date('start_date', 'تاریخ شروع به کار', 'Start date', true)}
              {date('end_date', 'تاریخ پایان همکاری', 'End date')}
              <SelectField size="sm" label={t('وضعیت', 'Status')} value={form.status} options={statuses}
                onChange={value => set('status', value)} isRtl={isRtl} disabled={disabled} formCode={formCode} />
              {field('job_title', 'عنوان شغلی', 'Job title')}
              <TextAreaField size="sm" label={t('توضیحات', 'Notes')} wrapperClassName="sm:col-span-2 lg:col-span-3"
                value={form.notes} onChange={e => set('notes', e.target.value)} isRtl={isRtl}
                disabled={disabled} formCode={formCode} />
            </div>
            <Alert type="info" message={t('نام و اطلاعات تماس از اشخاص و شرکت‌ها خوانده می‌شوند؛ ویرایش آن‌ها همان اطلاعات مشترک را تغییر می‌دهد.',
              'Names and contacts come from Parties. Editing them updates the shared party information.')} />
          </> : <>
            {mode === 'bulk' && <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <LOVField size="sm" label={t('اشخاص دارای نقش کارمند', 'Employee parties')} multiple
                data={partyOptions} selectedValues={selected} displayValue={t(`${selected.length} انتخاب`, `${selected.length} selected`)}
                columns={[{ field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
                  { field: 'title', header_fa: 'نام', header_en: 'Name' }]}
                onChange={selectGroup} isRtl={isRtl} disabled={disabled} formCode={formCode} />
              <DatePicker size="sm" label={t('شروع همکاری مشترک', 'Common start date')} value={commonStart}
                onChange={setCommonStart} isRtl={isRtl} language={language} disabled={disabled} />
              <SelectField size="sm" label={t('وضعیت مشترک', 'Common status')} value={commonStatus}
                onChange={setCommonStatus} options={statuses} isRtl={isRtl} disabled={disabled} />
            </div>}
            <Alert type="info" message={t('هر ردیف قبل از ثبت بررسی می‌شود. ردیف‌های ناموفق برای اصلاح باقی می‌مانند و ردیف‌های ثبت‌شده دوباره ثبت نمی‌شوند.',
              'Each row is validated before saving. Failed rows remain for correction; successful rows are removed.')} />
            <div className="h-[420px] flex flex-col">
              <DataGrid data={rows.map(row => ({ ...row, id: row.preview_id }))} columns={previewColumns}
                language={language} hideImport hideExport formCode={formCode} reserveMiddleSpace={false}
                actions={[{ id: 'discard_row', requiredAccess: 'create', icon: (window.LucideIcons || {}).Trash2 || FallbackIcon,
                  tooltip: t('کنار گذاشتن ردیف', 'Discard row'), hidden: () => disabled,
                  onClick: row => {
                    setRows(prev => prev.filter(r => r.preview_id !== row.preview_id));
                    setSelected(prev => prev.filter(p => !logic.same(p.id, row.party_id)));
                  } }]} />
            </div>
          </>}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <Button size="sm" variant="outline" disabled={busy || quickBusy} onClick={onClose}>{t('انصراف', 'Cancel')}</Button>
            {writable && <Button size="sm" icon={Save} disabled={disabled || quickBusy || (mode !== 'single' && !rows.length)}
              onClick={mode === 'single' ? saveSingle : saveGroup}>
              {busy ? t('در حال ثبت…', 'Saving…') : mode === 'single' ? t('ذخیره', 'Save')
                : t(`ثبت ردیف‌های معتبر (${rows.length})`, `Save valid rows (${rows.length})`)}
            </Button>}
          </div>
        </div>
      </Modal>
      <Modal isOpen={Boolean(quick)} onClose={() => { if (!quickBusy) { setQuick(null); setQuickForm({}); } }}
        language={language} width="max-w-2xl" title={quick === 'party' ? t('تعریف شخص یا شرکت', 'Create party') : t('تعریف کاربر', 'Create user')}>
        <div className="p-4 space-y-4">
          {quickError && <Alert type="error" message={quickError} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quick === 'party' ? <>
              <SelectField size="sm" label={t('نوع شخص', 'Party type')} isRtl={isRtl} value={quickForm.party_type}
                disabled={quickBusy} options={[{ value: 'real', label: t('حقیقی', 'Individual') },
                  { value: 'legal', label: t('حقوقی', 'Company') }]}
                onChange={value => setQuickForm(prev => ({ ...prev, party_type: value }))} />
              {quickField('latin_title', 'عنوان لاتین', 'Latin title', { required: true, dir: 'ltr' })}
              {quickForm.party_type === 'legal' ? quickField('company_name', 'نام شرکت', 'Company name', { required: true })
                : <>{quickField('first_name', 'نام', 'First name')}{quickField('last_name', 'نام خانوادگی', 'Last name', { required: true })}</>}
              {quickField('national_id', 'کد / شناسه ملی', 'National ID', { dir: 'ltr' })}
            </> : <>
              {quickField('username', 'نام کاربری', 'Username', { required: true, dir: 'ltr', autoComplete: 'off' })}
              {quickField('password', 'رمز عبور', 'Password', { required: true, dir: 'ltr', type: 'password', autoComplete: 'new-password' })}
            </>}
            {quickField('mobile', 'شماره موبایل', 'Mobile', { dir: 'ltr', required: quick === 'user' })}
            {quickField('email', 'ایمیل', 'Email', { type: 'email', dir: 'ltr', required: quick === 'user' })}
          </div>
          {quick === 'party' && <Alert type="info" message={t('شخص جدید با نقش کارمند و کاربر سیستم ایجاد می‌شود.',
            'The new party receives Employee and System User roles.')} />}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <Button size="sm" variant="outline" disabled={quickBusy} onClick={() => { setQuick(null); setQuickForm({}); }}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" icon={Save} disabled={quickBusy} onClick={saveQuick}>{t('ثبت', 'Save')}</Button>
          </div>
        </div>
      </Modal>
    </>;
  };
  window.EmployeeDetails = EmployeeDetails;
})();
