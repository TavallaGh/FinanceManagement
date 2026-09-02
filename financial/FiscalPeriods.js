/* Filename: financial/FiscalPeriods.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button = DSCore.Button || DS.Button || Fallback;
  const PageHeader = DSCore.PageHeader || DS.PageHeader || Fallback;
  const EmptyState = DSCore.EmptyState || DS.EmptyState || Fallback;
  const Badge = DSCore.Badge || DS.Badge || Fallback;

  const TextField = DSForms.TextField || DS.TextField || Fallback;
  const SelectField = DSForms.SelectField || DS.SelectField || Fallback;
  const ToggleField = DSForms.ToggleField || DS.ToggleField || Fallback;
  const DatePicker = DSForms.DatePicker || DS.DatePicker || Fallback;

  const DataGrid = DSGrid.DataGrid || DS.DataGrid || Fallback;

  const Modal = DSFeedback.Modal || DS.Modal || Fallback;
  const Toast = DSFeedback.Toast || DS.Toast || Fallback;

  const LucideIcons = window.LucideIcons || {};
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } });
  const CalendarDays = LucideIcons.CalendarDays || LucideIcons.Calendar || FallbackIcon;
  const Edit = LucideIcons.Edit || FallbackIcon;
  const Trash2 = LucideIcons.Trash2 || FallbackIcon;
  const Save = LucideIcons.Save || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;

  const supabase = window.supabase;

  const FORM_CODE = 'FIN_FISCAL_PERIODS';
  const STATUS = {
    NOT_OPENED: 'NOT_OPENED',
    OPEN: 'OPEN',
    CLOSED: 'CLOSED'
  };

  const STATUS_OPTIONS = [
    { value: STATUS.NOT_OPENED, label_fa: 'باز نشده', label_en: 'Not Opened', badge: 'slate' },
    { value: STATUS.OPEN, label_fa: 'باز', label_en: 'Open', badge: 'emerald' },
    { value: STATUS.CLOSED, label_fa: 'بسته شده', label_en: 'Closed', badge: 'red' }
  ];

  const CALENDAR_OPTIONS = [
    { value: 'SHAMSI', label_fa: 'شمسی', label_en: 'Jalali' },
    { value: 'GREGORIAN', label_fa: 'میلادی', label_en: 'Gregorian' }
  ];

  const oneDayMs = 24 * 60 * 60 * 1000;
  const addDays = (dateObj, n) => new Date(dateObj.getTime() + n * oneDayMs);

  const canTransitionStatus = (from, to) => {
    if (!from || from === to) return true;
    if (from === STATUS.NOT_OPENED && to === STATUS.OPEN) return true;
    if (from === STATUS.OPEN && to === STATUS.CLOSED) return true;
    if (from === STATUS.CLOSED && to === STATUS.OPEN) return true;
    return false;
  };

  const pad2 = (v) => String(v).padStart(2, '0');
  const toSlash = (y, m, d) => `${y}/${pad2(m)}/${pad2(d)}`;
  const toDash = (slashDate) => String(slashDate || '').replace(/\//g, '-');
  const fromDash = (dashDate) => String(dashDate || '').replace(/-/g, '/');

  const parseSlashDate = (value) => {
    const clean = String(value || '').trim().replace(/-/g, '/');
    const m = clean.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  };

  const toSlashFromDate = (dateObj) => {
    if (!(dateObj instanceof Date)) return '';
    return toSlash(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
  };

  const getCalendarParts = (gregDateSlash, calendarType) => {
    const d = parseSlashDate(gregDateSlash);
    if (!d) return null;
    const gy = d.getFullYear();
    const gm = d.getMonth() + 1;
    const gd = d.getDate();

    if (calendarType === 'SHAMSI' && window.DSCore?.g2j) {
      const out = window.DSCore.g2j(gy, gm, gd);
      return { year: out[0], month: out[1], day: out[2] };
    }
    return { year: gy, month: gm, day: gd };
  };

  const getMonthRangeGregorianForJalali = (jy, jm) => {
    if (!window.DSCore?.j2g) return null;
    const [sy, sm, sd] = window.DSCore.j2g(jy, jm, 1);

    const nextMonth = jm === 12 ? { y: jy + 1, m: 1 } : { y: jy, m: jm + 1 };
    const [ny, nm, nd] = window.DSCore.j2g(nextMonth.y, nextMonth.m, 1);

    const start = new Date(sy, sm - 1, sd);
    const nextStart = new Date(ny, nm - 1, nd);
    const end = new Date(nextStart);
    end.setDate(end.getDate() - 1);

    return { start, end };
  };

  const getMonthRangeGregorianForGregorian = (gy, gm) => {
    const start = new Date(gy, gm - 1, 1);
    const end = new Date(gy, gm, 0);
    return { start, end };
  };

  const FiscalPeriods = ({ language = 'fa', formCode = FORM_CODE }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => (isRtl ? fa : en), [isRtl]);
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const raw = securityCtx ? securityCtx.getActions(formCode) : null;
      return raw || { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }, [securityCtx, formCode]);

    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const [fiscalYears, setFiscalYears] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [users, setUsers] = useState([]);

    const [selectedYearId, setSelectedYearId] = useState(null);

    const [yearGridState, setYearGridState] = useState(null);

    const [yearModal, setYearModal] = useState({ isOpen: false, record: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, payload: null });

    const [yearForm, setYearForm] = useState({
      id: null,
      yearCode: '',
      calendarType: 'SHAMSI',
      startDate: '',
      endDate: '',
      isActive: true
    });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3500);
    }, []);

    const selectedYear = useMemo(() => {
      return fiscalYears.find(y => String(y.id) === String(selectedYearId)) || null;
    }, [fiscalYears, selectedYearId]);

    const periodRows = useMemo(() => {
      if (!selectedYearId) return [];
      return periods
        .filter(p => String(p.fiscalYearId) === String(selectedYearId))
        .sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
    }, [periods, selectedYearId]);

    const mapFiscalYears = (rows) => (rows || []).map(r => ({
      id: r.id,
      yearCode: r.year_code,
      calendarType: r.calendar_type || 'SHAMSI',
      startDate: fromDash(r.start_date),
      endDate: fromDash(r.end_date),
      isActive: r.is_active !== false,
      createdAt: r.created_at
    }));

    const mapPeriods = (rows) => (rows || []).map(r => ({
      id: r.id,
      fiscalYearId: r.fiscal_year_id,
      periodCode: r.period_code,
      title: r.title || '',
      startDate: fromDash(r.start_date),
      endDate: fromDash(r.end_date),
      status: r.status || STATUS.NOT_OPENED,
      isActive: r.is_active !== false,
      sortOrder: r.sort_order || 0,
      createdAt: r.created_at
    }));

    const mapUsers = (rows) => (rows || []).map(r => ({
      id: r.id,
      username: r.username || '',
      fullName: r.full_name || '',
      email: r.email || '',
      isActive: r.is_active !== false,
      label: `${r.full_name || r.username || ''}`.trim() || (r.username || '-')
    }));

    const logAction = useCallback(async (recordId, action, details = '', oldData = null, newData = null) => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: 'FISCAL_PERIODS',
          record_id: String(recordId || ''),
          action,
          user_name: currentUser,
          details,
          old_data: oldData,
          new_data: newData
        }]);
      } catch (err) {
        console.error('FiscalPeriods logAction failed:', err);
      }
    }, [currentUser]);

    const fetchBaseData = useCallback(async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
        const [
          { data: yData, error: yErr },
          { data: pData, error: pErr },
          { data: uData, error: uErr }
        ] = await Promise.all([
          supabase.from('fm_fiscal_years').select('*').order('start_date', { ascending: false }),
          supabase.from('fm_fiscal_periods').select('*').order('start_date', { ascending: true }),
          supabase.from('sec_users').select('id, username, full_name, email, is_active').order('username', { ascending: true })
        ]);

        if (yErr) throw yErr;
        if (pErr) throw pErr;
        if (uErr) throw uErr;

        const mappedYears = mapFiscalYears(yData);
        const mappedPeriods = mapPeriods(pData);
        const mappedUsers = mapUsers(uData);

        setFiscalYears(mappedYears);
        setPeriods(mappedPeriods);
        setUsers(mappedUsers);

        if (!selectedYearId && mappedYears.length > 0) {
          setSelectedYearId(mappedYears[0].id);
        } else if (selectedYearId && !mappedYears.some(y => String(y.id) === String(selectedYearId))) {
          setSelectedYearId(mappedYears.length ? mappedYears[0].id : null);
        }
      } catch (err) {
        console.error('FiscalPeriods fetch error:', err);
        showToast(
          t('خطا در دریافت اطلاعات دوره‌های مالی. اگر جدول‌ها ایجاد نشده‌اند، ابتدا اسکریپت دیتابیس را اجرا کنید.', 'Error loading fiscal periods. If tables are missing, run the database script first.'),
          'error'
        );
      } finally {
        setIsLoading(false);
      }
    }, [selectedYearId, showToast, t]);

    useEffect(() => {
      if (access.canView) fetchBaseData();
    }, [fetchBaseData, access.canView]);

    const openYearModal = (row = null) => {
      if (row) {
        setYearForm({
          id: row.id,
          yearCode: row.yearCode || '',
          calendarType: row.calendarType || 'SHAMSI',
          startDate: row.startDate || '',
          endDate: row.endDate || '',
          isActive: row.isActive !== false
        });
      } else {
        setYearForm({
          id: null,
          yearCode: '',
          calendarType: 'SHAMSI',
          startDate: '',
          endDate: '',
          isActive: true
        });
      }
      setYearModal({ isOpen: true, record: row });
    };

    const normalizeAndSortRanges = (rows) => {
      return [...rows].sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
    };

    const hasOverlap = (sortedRows) => {
      for (let i = 0; i < sortedRows.length - 1; i++) {
        const aEnd = parseSlashDate(sortedRows[i].endDate);
        const bStart = parseSlashDate(sortedRows[i + 1].startDate);
        if (!aEnd || !bStart) continue;
        if (bStart <= aEnd) return true;
      }
      return false;
    };

    const hasInternalGap = (sortedRows) => {
      for (let i = 0; i < sortedRows.length - 1; i++) {
        const aEnd = parseSlashDate(sortedRows[i].endDate);
        const bStart = parseSlashDate(sortedRows[i + 1].startDate);
        if (!aEnd || !bStart) continue;
        if (bStart.getTime() !== addDays(aEnd, 1).getTime()) return true;
      }
      return false;
    };

    const validateYearForm = () => {
      if (!yearForm.yearCode || !yearForm.startDate || !yearForm.endDate) {
        showToast(t('کد سال مالی، تاریخ شروع و تاریخ پایان الزامی است.', 'Fiscal year code, start date, and end date are required.'), 'error');
        return false;
      }

      const start = parseSlashDate(yearForm.startDate);
      const end = parseSlashDate(yearForm.endDate);
      if (!start || !end || start > end) {
        showToast(t('بازه تاریخ سال مالی نامعتبر است.', 'Fiscal year date range is invalid.'), 'error');
        return false;
      }

      const duplicate = fiscalYears.some(y =>
        String(y.yearCode).trim() === String(yearForm.yearCode).trim() && String(y.id) !== String(yearForm.id || '')
      );
      if (duplicate) {
        showToast(t('کد سال مالی تکراری است.', 'Fiscal year code is duplicate.'), 'error');
        return false;
      }

      const draftRows = fiscalYears
        .filter(y => String(y.id) !== String(yearForm.id || ''))
        .concat([{ ...yearForm }]);
      const sorted = normalizeAndSortRanges(draftRows);

      if (hasOverlap(sorted)) {
        showToast(t('بازه سال‌های مالی با هم تداخل دارند.', 'Fiscal year date ranges overlap.'), 'error');
        return false;
      }

      if (sorted.length > 1 && hasInternalGap(sorted)) {
        showToast(t('بین سال‌های مالی فاصله زمانی خالی وجود دارد.', 'There is an unassigned date gap between fiscal years.'), 'error');
        return false;
      }

      return true;
    };

    const saveYear = async () => {
      if (!validateYearForm()) return;

      setIsLoading(true);
      try {
        const payload = {
          year_code: String(yearForm.yearCode).trim(),
          calendar_type: yearForm.calendarType,
          start_date: toDash(yearForm.startDate),
          end_date: toDash(yearForm.endDate),
          is_active: yearForm.isActive,
          updated_at: new Date().toISOString()
        };

        if (yearForm.id) {
          const oldRec = fiscalYears.find(y => String(y.id) === String(yearForm.id)) || null;
          const { error } = await supabase.from('fm_fiscal_years').update(payload).eq('id', yearForm.id);
          if (error) throw error;
          await logAction(yearForm.id, 'update', `ویرایش سال مالی ${payload.year_code}`, oldRec, payload);
        } else {
          payload.created_at = new Date().toISOString();
          const { data, error } = await supabase.from('fm_fiscal_years').insert([payload]).select('id').single();
          if (error) throw error;
          await logAction(data?.id, 'create', `ایجاد سال مالی ${payload.year_code}`, null, payload);
        }

        setYearModal({ isOpen: false, record: null });
        await fetchBaseData();
        showToast(t('سال مالی با موفقیت ذخیره شد.', 'Fiscal year saved successfully.'));
      } catch (err) {
        console.error('saveYear error:', err);
        showToast(t('خطا در ذخیره سال مالی', 'Error saving fiscal year'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const canDeleteYear = (yearRow) => {
      const yearPeriods = periods.filter(p => String(p.fiscalYearId) === String(yearRow.id));
      if (yearPeriods.length > 0) {
        return { ok: false, message: t('تا وقتی دوره میانی برای این سال مالی وجود دارد، حذف سال مالی مجاز نیست.', 'Fiscal year cannot be deleted while it has periods.') };
      }

      const remaining = normalizeAndSortRanges(fiscalYears.filter(y => String(y.id) !== String(yearRow.id)));
      if (remaining.length > 1 && hasInternalGap(remaining)) {
        return { ok: false, message: t('حذف این سال باعث ایجاد فاصله زمانی خالی بین سال‌های مالی می‌شود.', 'Deleting this year creates an unassigned date gap between fiscal years.') };
      }

      return { ok: true };
    };

    const executeDeleteYear = async () => {
      const y = deleteConfirm.payload;
      if (!y) return;

      const check = canDeleteYear(y);
      if (!check.ok) {
        showToast(check.message, 'error');
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await supabase.from('fm_fiscal_years').delete().eq('id', y.id);
        if (error) throw error;
        await logAction(y.id, 'delete', `حذف سال مالی ${y.yearCode}`);
        if (String(selectedYearId) === String(y.id)) setSelectedYearId(null);
        setDeleteConfirm({ isOpen: false, payload: null });
        await fetchBaseData();
        showToast(t('سال مالی حذف شد.', 'Fiscal year deleted.'));
      } catch (err) {
        console.error('delete year error:', err);
        showToast(t('خطا در حذف سال مالی', 'Error deleting fiscal year'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const yearColumns = [
      {
        field: 'yearCode',
        header_fa: 'سال مالی',
        header_en: 'Fiscal Year',
        width: '130px',
        render: (val) => <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400" dir="ltr">{val || '-'}</span>
      },
      {
        field: 'calendarType',
        header_fa: 'نوع تقویم',
        header_en: 'Calendar Type',
        width: '120px',
        render: (val) => {
          const opt = CALENDAR_OPTIONS.find(c => c.value === val);
          return <span>{isRtl ? opt?.label_fa : opt?.label_en}</span>;
        }
      },
      { field: 'startDate', header_fa: 'شروع سال', header_en: 'Start Date', width: '120px', type: 'date' },
      { field: 'endDate', header_fa: 'پایان سال', header_en: 'End Date', width: '120px', type: 'date' },
      {
        field: 'isActive',
        header_fa: 'فعال',
        header_en: 'Active',
        width: '90px',
        render: (val) => val
          ? <Badge variant="emerald">{t('فعال', 'Active')}</Badge>
          : <Badge variant="slate">{t('غیرفعال', 'Inactive')}</Badge>
      }
    ];

    const DetailsComponent = window.FiscalPeriodDetails || (() => null);

    return (
      <div className="flex flex-col h-full p-4 bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('دوره‌های مالی', 'Fiscal Periods')}
          icon={CalendarDays}
          language={language}
          breadcrumbs={[
            { label: t('مالی', 'Financial') },
            { label: t('دوره‌های مالی', 'Fiscal Periods') }
          ]}
        />

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-5 gap-4 mt-4 animate-in fade-in duration-300">
          <div className="xl:col-span-2 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <DataGrid
              data={fiscalYears}
              columns={yearColumns}
              language={language}
              isLoading={isLoading}
              onAdd={access.canCreate ? () => openYearModal() : undefined}
              onRowClick={(row) => setSelectedYearId(row.id)}
              onRowDoubleClick={(row) => access.canEdit ? openYearModal(row) : undefined}
              activeRowId={selectedYearId}
              gridState={yearGridState}
              onGridStateChange={setYearGridState}
              hideImport
              hideExport
              actions={[
                { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => openYearModal(row), className: 'text-slate-400 hover:text-indigo-600' },
                {
                  icon: Trash2,
                  tooltip: t('حذف', 'Delete'),
                  onClick: (row) => {
                    const check = canDeleteYear(row);
                    if (!check.ok) {
                      showToast(check.message, 'error');
                      return;
                    }
                    setDeleteConfirm({ isOpen: true, payload: row });
                  },
                  className: 'text-slate-400 hover:text-red-600'
                }
              ]}
            />
          </div>

          <DetailsComponent
            language={language}
            formCode={formCode}
            selectedYear={selectedYear}
            periodRows={periodRows}
            isLoading={isLoading}
            access={access}
            status={STATUS}
            statusOptions={STATUS_OPTIONS}
            canTransitionStatus={canTransitionStatus}
            parseSlashDate={parseSlashDate}
            toDash={toDash}
            fromDash={fromDash}
            toSlashFromDate={toSlashFromDate}
            getCalendarParts={getCalendarParts}
            getMonthRangeGregorianForJalali={getMonthRangeGregorianForJalali}
            getMonthRangeGregorianForGregorian={getMonthRangeGregorianForGregorian}
            supabase={supabase}
            users={users}
            showToast={showToast}
            t={t}
            isRtl={isRtl}
            onRefresh={fetchBaseData}
            onLog={logAction}
          />
        </div>

        <Modal
          isOpen={yearModal.isOpen}
          onClose={() => setYearModal({ isOpen: false, record: null })}
          title={yearModal.record ? t('ویرایش سال مالی', 'Edit Fiscal Year') : t('تعریف سال مالی', 'New Fiscal Year')}
          width="max-w-2xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                size="sm"
                label={t('کد/عنوان سال مالی', 'Fiscal Year Code/Title')}
                value={yearForm.yearCode}
                onChange={(e) => setYearForm(prev => ({ ...prev, yearCode: e.target.value }))}
                required
                isRtl={isRtl}
                dir="ltr"
                formCode={formCode}
              />

              <SelectField
                size="sm"
                label={t('نوع سال مالی', 'Fiscal Calendar Type')}
                value={yearForm.calendarType}
                onChange={(e) => setYearForm(prev => ({ ...prev, calendarType: e.target.value }))}
                options={CALENDAR_OPTIONS.map(c => ({ value: c.value, label: isRtl ? c.label_fa : c.label_en }))}
                required
                isRtl={isRtl}
                formCode={formCode}
              />

              <DatePicker
                size="sm"
                label={t('اولین روز سال مالی', 'Fiscal Year Start Date')}
                value={yearForm.startDate}
                onChange={(v) => {
                  const next = { ...yearForm, startDate: v };
                  if (!next.yearCode && v) {
                    const p = getCalendarParts(v, next.calendarType);
                    if (p?.year) next.yearCode = String(p.year);
                  }
                  setYearForm(next);
                }}
                isRtl={isRtl}
                language={language}
                required
                formCode={formCode}
              />

              <DatePicker
                size="sm"
                label={t('آخرین روز سال مالی', 'Fiscal Year End Date')}
                value={yearForm.endDate}
                onChange={(v) => setYearForm(prev => ({ ...prev, endDate: v }))}
                isRtl={isRtl}
                language={language}
                required
                formCode={formCode}
              />

              <div className="md:col-span-2">
                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('فعال', 'Active')}</div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700">
                  <ToggleField
                    size="sm"
                    label={t('این سال مالی فعال باشد', 'Keep this fiscal year active')}
                    checked={yearForm.isActive}
                    onChange={(v) => setYearForm(prev => ({ ...prev, isActive: v }))}
                    isRtl={isRtl}
                    formCode={formCode}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setYearModal({ isOpen: false, record: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={saveYear} isLoading={isLoading}>{t('ذخیره', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, payload: null })}
          title={t('تایید حذف', 'Confirm Delete')}
          width="max-w-sm"
          language={language}
        >
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'Warning: Irreversible')}
            description={t('آیا از حذف این سال مالی اطمینان دارید؟', 'Are you sure you want to delete this fiscal year?')}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, payload: null })}>
                  {t('انصراف', 'Cancel')}
                </Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={executeDeleteYear} isLoading={isLoading}>
                  {t('حذف', 'Delete')}
                </Button>
              </div>
            }
          />
        </Modal>

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />
      </div>
    );
  };

  FiscalPeriods.formCode = FORM_CODE;
  window.FiscalPeriods = FiscalPeriods;
})();
