/* Filename: financial/FiscalPeriodDetails.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useCallback } = React;

  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button = DSCore.Button || DS.Button || Fallback;
  const EmptyState = DSCore.EmptyState || DS.EmptyState || Fallback;
  const Badge = DSCore.Badge || DS.Badge || Fallback;

  const TextField = DSForms.TextField || DS.TextField || Fallback;
  const SelectField = DSForms.SelectField || DS.SelectField || Fallback;
  const ToggleField = DSForms.ToggleField || DS.ToggleField || Fallback;
  const DatePicker = DSForms.DatePicker || DS.DatePicker || Fallback;

  const DataGrid = DSGrid.DataGrid || DS.DataGrid || Fallback;
  const LOVField = DSGrid.LOVField || DS.LOVField || Fallback;

  const Modal = DSFeedback.Modal || DS.Modal || Fallback;

  const LucideIcons = window.LucideIcons || {};
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } });
  const Edit = LucideIcons.Edit || FallbackIcon;
  const Trash2 = LucideIcons.Trash2 || FallbackIcon;
  const Save = LucideIcons.Save || FallbackIcon;
  const Plus = LucideIcons.Plus || FallbackIcon;
  const Sparkles = LucideIcons.Sparkles || FallbackIcon;
  const Users = LucideIcons.Users || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;
  const Lock = LucideIcons.Lock || FallbackIcon;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const addDays = (dateObj, n) => new Date(dateObj.getTime() + n * oneDayMs);

  const FiscalPeriodDetails = ({
    language = 'fa',
    formCode = 'FIN_FISCAL_PERIODS',
    selectedYear = null,
    periodRows = [],
    isLoading = false,
    access = { canCreate: true, canEdit: true, canDelete: true },
    status,
    statusOptions,
    canTransitionStatus,
    parseSlashDate,
    toDash,
    fromDash,
    toSlashFromDate,
    getCalendarParts,
    getMonthRangeGregorianForJalali,
    getMonthRangeGregorianForGregorian,
    supabase,
    users = [],
    showToast,
    t,
    isRtl = true,
    onRefresh,
    onLog
  }) => {
    const [selectedPeriodIds, setSelectedPeriodIds] = useState([]);
    const [periodGridState, setPeriodGridState] = useState(null);
    const [exceptionGridState, setExceptionGridState] = useState(null);

    const [periodModal, setPeriodModal] = useState({ isOpen: false, record: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, payload: null });

    const [exceptionModal, setExceptionModal] = useState({
      isOpen: false,
      period: null,
      rows: [],
      current: null,
      isLoading: false
    });

    const [periodForm, setPeriodForm] = useState({
      id: null,
      periodCode: '',
      title: '',
      startDate: '',
      endDate: '',
      status: status?.NOT_OPENED || 'NOT_OPENED',
      isActive: true
    });

    const [exceptionForm, setExceptionForm] = useState({
      id: null,
      userId: null,
      userDisplay: '',
      fromDate: '',
      toDate: '',
      note: '',
      isActive: true
    });

    const usersById = useMemo(() => {
      const map = new Map();
      users.forEach(u => map.set(String(u.id), u));
      return map;
    }, [users]);

    const activeUsers = useMemo(() => users.filter(u => u.isActive !== false), [users]);

    const userLovColumns = [
      { field: 'username', header_fa: 'نام کاربری', header_en: 'Username', width: '140px' },
      { field: 'fullName', header_fa: 'نام کامل', header_en: 'Full Name', width: '220px' },
      { field: 'email', header_fa: 'ایمیل', header_en: 'Email', width: '200px' }
    ];

    const getStatusMeta = useCallback((statusValue) => {
      return (statusOptions || []).find(s => s.value === statusValue) || (statusOptions || [])[0] || { badge: 'slate', label_fa: statusValue, label_en: statusValue };
    }, [statusOptions]);

    const allowedStatusOptions = useCallback((currentStatus) => {
      if (!currentStatus) return statusOptions || [];
      return (statusOptions || []).filter(opt => opt.value === currentStatus || canTransitionStatus(currentStatus, opt.value));
    }, [statusOptions, canTransitionStatus]);

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
        const expectedNext = addDays(aEnd, 1);
        if (bStart.getTime() !== expectedNext.getTime()) return true;
      }
      return false;
    };

    const normalizeAndSort = (rows) => {
      return [...rows].sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
    };

    const canDeletePeriod = useCallback((periodToDelete) => {
      if (!periodToDelete) return { ok: false, message: t('رکورد دوره نامعتبر است.', 'Invalid period record.') };

      if (periodToDelete.status === status.OPEN || periodToDelete.status === status.CLOSED) {
        return { ok: false, message: t('امکان حذف دوره باز یا بسته شده وجود ندارد.', 'Open or closed periods cannot be deleted.') };
      }

      const lockedPeriods = periodRows.filter(p => p.status === status.OPEN || p.status === status.CLOSED);
      if (lockedPeriods.length > 0 && periodToDelete.status === status.NOT_OPENED) {
        const minLockedStart = normalizeAndSort(lockedPeriods)[0];
        const candStart = parseSlashDate(periodToDelete.startDate);
        const lockStart = parseSlashDate(minLockedStart.startDate);
        if (candStart && lockStart && candStart < lockStart) {
          return {
            ok: false,
            message: t('با وجود دوره باز/بسته، حذف دوره‌های قبل از آن مجاز نیست.', 'When any period is open/closed, you cannot delete earlier not-opened periods.')
          };
        }
      }

      const remaining = normalizeAndSort(periodRows.filter(p => String(p.id) !== String(periodToDelete.id)));
      if (remaining.length > 1 && hasInternalGap(remaining)) {
        return {
          ok: false,
          message: t('این حذف باعث ایجاد بازه خالی بین دوره‌ها می‌شود و مجاز نیست.', 'This delete creates an unassigned date gap between periods and is not allowed.')
        };
      }

      return { ok: true };
    }, [periodRows, parseSlashDate, status, t]);

    const openPeriodModal = (row = null) => {
      if (!selectedYear) {
        showToast(t('ابتدا یک سال مالی را انتخاب کنید.', 'Please select a fiscal year first.'), 'warning');
        return;
      }

      if (row) {
        setPeriodForm({
          id: row.id,
          periodCode: row.periodCode || '',
          title: row.title || '',
          startDate: row.startDate || '',
          endDate: row.endDate || '',
          status: row.status || status.NOT_OPENED,
          isActive: row.isActive !== false
        });
      } else {
        const prefixParts = getCalendarParts(selectedYear.startDate, selectedYear.calendarType);
        const prefixYear = prefixParts?.year ? String(prefixParts.year) : '';
        const nextNo = String(periodRows.length + 1).padStart(2, '0');
        setPeriodForm({
          id: null,
          periodCode: `${prefixYear}${nextNo}`,
          title: `${t('دوره', 'Period')} ${nextNo}`,
          startDate: selectedYear.startDate || '',
          endDate: selectedYear.endDate || '',
          status: status.NOT_OPENED,
          isActive: true
        });
      }

      setPeriodModal({ isOpen: true, record: row });
    };

    const closeExceptionModal = () => {
      setExceptionModal({ isOpen: false, period: null, rows: [], current: null, isLoading: false });
      setExceptionForm({ id: null, userId: null, userDisplay: '', fromDate: '', toDate: '', note: '', isActive: true });
      setExceptionGridState(null);
    };

    const openExceptionModal = async (periodRow) => {
      if (!periodRow) return;
      if (periodRow.status !== status.CLOSED) {
        showToast(t('استثنا فقط برای دوره‌های بسته شده قابل تعریف است.', 'Exceptions are only available for closed periods.'), 'warning');
        return;
      }
      setExceptionModal({ isOpen: true, period: periodRow, rows: [], current: null, isLoading: true });
      setExceptionForm({ id: null, userId: null, userDisplay: '', fromDate: '', toDate: '', note: '', isActive: true });

      try {
        const { data, error } = await supabase
          .from('fm_fiscal_period_exceptions')
          .select('*')
          .eq('period_id', periodRow.id)
          .order('from_date', { ascending: true });
        if (error) throw error;

        const rows = (data || []).map(r => ({
          id: r.id,
          periodId: r.period_id,
          userId: r.user_id,
          userName: usersById.get(String(r.user_id))?.fullName || usersById.get(String(r.user_id))?.username || '-',
          userUsername: usersById.get(String(r.user_id))?.username || '-',
          fromDate: fromDash(r.from_date),
          toDate: fromDash(r.to_date),
          note: r.note || '',
          isActive: r.is_active !== false
        }));

        setExceptionModal({ isOpen: true, period: periodRow, rows, current: null, isLoading: false });
      } catch (err) {
        console.error('load exceptions error:', err);
        setExceptionModal(prev => ({ ...prev, isLoading: false }));
        showToast(t('خطا در دریافت استثناها', 'Error loading exceptions'), 'error');
      }
    };

    const validatePeriodForm = () => {
      if (!selectedYear) {
        showToast(t('ابتدا سال مالی را انتخاب کنید.', 'Please select a fiscal year first.'), 'error');
        return false;
      }
      if (!periodForm.periodCode || !periodForm.startDate || !periodForm.endDate) {
        showToast(t('کد دوره، تاریخ شروع و تاریخ پایان الزامی است.', 'Period code, start date and end date are required.'), 'error');
        return false;
      }

      const start = parseSlashDate(periodForm.startDate);
      const end = parseSlashDate(periodForm.endDate);
      const fyStart = parseSlashDate(selectedYear.startDate);
      const fyEnd = parseSlashDate(selectedYear.endDate);

      if (!start || !end || !fyStart || !fyEnd || start > end) {
        showToast(t('بازه تاریخ دوره نامعتبر است.', 'Period date range is invalid.'), 'error');
        return false;
      }

      if (start < fyStart || end > fyEnd) {
        showToast(t('بازه دوره باید داخل بازه سال مالی باشد.', 'Period range must be inside selected fiscal year range.'), 'error');
        return false;
      }

      const duplicate = periodRows.some(p =>
        String(p.periodCode).trim() === String(periodForm.periodCode).trim() && String(p.id) !== String(periodForm.id || '')
      );
      if (duplicate) {
        showToast(t('کد دوره تکراری است.', 'Period code is duplicate.'), 'error');
        return false;
      }

      if (periodModal.record && !canTransitionStatus(periodModal.record.status, periodForm.status)) {
        showToast(t('تغییر وضعیت دوره طبق قوانین مجاز نیست.', 'Period status transition is not allowed.'), 'error');
        return false;
      }

      const draftRows = periodRows
        .filter(p => String(p.id) !== String(periodForm.id || ''))
        .concat([{ ...periodForm }]);
      const sorted = normalizeAndSort(draftRows);

      if (hasOverlap(sorted)) {
        showToast(t('بازه دوره‌ها با یکدیگر تداخل دارند.', 'Period date ranges overlap.'), 'error');
        return false;
      }

      if (sorted.length > 1 && hasInternalGap(sorted)) {
        showToast(t('بین دوره‌ها تاریخ خالی وجود دارد. دوره‌ها باید پشت سر هم باشند.', 'There is an unassigned date gap between periods. Periods must be contiguous.'), 'error');
        return false;
      }

      return true;
    };

    const savePeriod = async () => {
      if (!validatePeriodForm()) return;

      try {
        const payload = {
          fiscal_year_id: selectedYear.id,
          period_code: String(periodForm.periodCode).trim(),
          title: String(periodForm.title || '').trim() || null,
          start_date: toDash(periodForm.startDate),
          end_date: toDash(periodForm.endDate),
          status: periodForm.status,
          is_active: periodForm.isActive,
          updated_at: new Date().toISOString()
        };

        if (periodForm.id) {
          const { error } = await supabase.from('fm_fiscal_periods').update(payload).eq('id', periodForm.id);
          if (error) throw error;
          await onLog?.(periodForm.id, 'update', `ویرایش دوره ${payload.period_code}`);
        } else {
          payload.created_at = new Date().toISOString();
          payload.sort_order = periodRows.length + 1;
          const { data, error } = await supabase.from('fm_fiscal_periods').insert([payload]).select('id').single();
          if (error) throw error;
          await onLog?.(data?.id, 'create', `ایجاد دوره ${payload.period_code}`);
        }

        setPeriodModal({ isOpen: false, record: null });
        await onRefresh?.();
        showToast(t('دوره با موفقیت ذخیره شد.', 'Period saved successfully.'));
      } catch (err) {
        console.error('savePeriod error:', err);
        showToast(t('خطا در ذخیره دوره', 'Error saving period'), 'error');
      }
    };

    const generateMonthlyPeriods = async () => {
      if (!selectedYear) {
        showToast(t('ابتدا یک سال مالی انتخاب کنید.', 'Please select a fiscal year first.'), 'warning');
        return;
      }

      const fyStart = parseSlashDate(selectedYear.startDate);
      const fyEnd = parseSlashDate(selectedYear.endDate);
      if (!fyStart || !fyEnd || fyStart > fyEnd) {
        showToast(t('بازه سال مالی نامعتبر است.', 'Fiscal year range is invalid.'), 'error');
        return;
      }

      const existingCodes = new Set(periodRows.map(p => String(p.periodCode || '').trim()));
      const generated = [];

      const prefixParts = getCalendarParts(selectedYear.startDate, selectedYear.calendarType);
      const prefixYear = prefixParts?.year ? String(prefixParts.year) : String(fyStart.getFullYear());

      if (selectedYear.calendarType === 'GREGORIAN') {
        let y = fyStart.getFullYear();
        let m = fyStart.getMonth() + 1;

        while (true) {
          const range = getMonthRangeGregorianForGregorian(y, m);
          if (!range || range.start > fyEnd) break;

          if (range.start >= fyStart && range.end <= fyEnd) {
            generated.push({ startDate: toSlashFromDate(range.start), endDate: toSlashFromDate(range.end) });
          }

          m += 1;
          if (m > 12) {
            m = 1;
            y += 1;
          }
        }
      } else {
        if (!window.DSCore?.g2j || !window.DSCore?.j2g) {
          showToast(t('ابزار تبدیل تاریخ شمسی در سیستم موجود نیست.', 'Jalali date conversion utilities are not available.'), 'error');
          return;
        }

        const fromJ = window.DSCore.g2j(fyStart.getFullYear(), fyStart.getMonth() + 1, fyStart.getDate());
        let jy = fromJ[0];
        let jm = fromJ[1];

        while (true) {
          const range = getMonthRangeGregorianForJalali(jy, jm);
          if (!range || range.start > fyEnd) break;

          if (range.start >= fyStart && range.end <= fyEnd) {
            generated.push({ startDate: toSlashFromDate(range.start), endDate: toSlashFromDate(range.end) });
          }

          jm += 1;
          if (jm > 12) {
            jm = 1;
            jy += 1;
          }
        }
      }

      if (generated.length === 0) {
        showToast(t('هیچ ماه کاملی داخل بازه سال مالی پیدا نشد.', 'No full month found in fiscal year range.'), 'warning');
        return;
      }

      const rowsToInsert = generated
        .map((g, idx) => {
          const code = `${prefixYear}${String(idx + 1).padStart(2, '0')}`;
          return {
            fiscal_year_id: selectedYear.id,
            period_code: code,
            title: `${t('دوره', 'Period')} ${String(idx + 1).padStart(2, '0')}`,
            start_date: toDash(g.startDate),
            end_date: toDash(g.endDate),
            status: status.NOT_OPENED,
            is_active: true,
            sort_order: idx + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        })
        .filter(r => !existingCodes.has(r.period_code));

      if (rowsToInsert.length === 0) {
        showToast(t('کدهای دوره از قبل وجود دارند.', 'Generated period codes already exist.'), 'warning');
        return;
      }

      const previewRows = normalizeAndSort(rowsToInsert.map(r => ({ startDate: fromDash(r.start_date), endDate: fromDash(r.end_date) })));
      if (previewRows.length > 1 && hasInternalGap(previewRows)) {
        showToast(t('ساخت خودکار باعث ایجاد بازه خالی می‌شود و متوقف شد.', 'Auto generation would create a date gap and was cancelled.'), 'error');
        return;
      }

      try {
        const { error } = await supabase.from('fm_fiscal_periods').insert(rowsToInsert);
        if (error) throw error;
        await onLog?.(selectedYear.id, 'auto_generate', `ایجاد اتوماتیک ${rowsToInsert.length} دوره ماهانه برای سال مالی ${selectedYear.yearCode}`);
        await onRefresh?.();
        showToast(t(`${rowsToInsert.length} دوره ماهانه ایجاد شد.`, `${rowsToInsert.length} monthly periods generated.`), 'success');
      } catch (err) {
        console.error('generateMonthlyPeriods error:', err);
        showToast(t('خطا در ایجاد اتوماتیک دوره‌ها', 'Error generating monthly periods'), 'error');
      }
    };

    const executeDelete = async () => {
      if (!deleteConfirm.type || !deleteConfirm.payload) return;
      try {
        if (deleteConfirm.type === 'period') {
          const p = deleteConfirm.payload;
          const check = canDeletePeriod(p);
          if (!check.ok) {
            showToast(check.message, 'error');
            return;
          }
          const { error } = await supabase.from('fm_fiscal_periods').delete().eq('id', p.id);
          if (error) throw error;
          await onLog?.(p.id, 'delete', `حذف دوره ${p.periodCode}`);
          setSelectedPeriodIds(prev => prev.filter(id => String(id) !== String(p.id)));
        }

        if (deleteConfirm.type === 'period_bulk') {
          const ids = deleteConfirm.payload || [];
          const rows = periodRows.filter(p => ids.includes(p.id));
          for (const row of rows) {
            const check = canDeletePeriod(row);
            if (!check.ok) {
              showToast(check.message, 'error');
              return;
            }
          }

          const remaining = normalizeAndSort(periodRows.filter(p => !ids.includes(p.id)));
          if (remaining.length > 1 && hasInternalGap(remaining)) {
            showToast(t('حذف گروهی باعث ایجاد بازه خالی بین دوره‌ها می‌شود.', 'Bulk delete creates an unassigned date gap between periods.'), 'error');
            return;
          }

          const { error } = await supabase.from('fm_fiscal_periods').delete().in('id', ids);
          if (error) throw error;
          await onLog?.(selectedYear?.id, 'bulk_delete', `حذف گروهی ${ids.length} دوره`);
          setSelectedPeriodIds([]);
        }

        setDeleteConfirm({ isOpen: false, type: null, payload: null });
        await onRefresh?.();
        showToast(t('عملیات حذف با موفقیت انجام شد.', 'Deletion completed successfully.'));
      } catch (err) {
        console.error('delete period error:', err);
        showToast(t('خطا در حذف. احتمالاً رکورد وابسته وجود دارد.', 'Delete failed. The record may have dependencies.'), 'error');
      }
    };

    const beginEditException = (row = null) => {
      if (!row) {
        setExceptionForm({ id: null, userId: null, userDisplay: '', fromDate: '', toDate: '', note: '', isActive: true });
        setExceptionModal(prev => ({ ...prev, current: null }));
        return;
      }

      setExceptionForm({
        id: row.id,
        userId: row.userId,
        userDisplay: row.userName,
        fromDate: row.fromDate,
        toDate: row.toDate,
        note: row.note || '',
        isActive: row.isActive !== false
      });
      setExceptionModal(prev => ({ ...prev, current: row }));
    };

    const saveException = async () => {
      const period = exceptionModal.period;
      if (!period) return;

      if (period.status !== status.CLOSED) {
        showToast(t('فقط برای دوره بسته شده می‌توان استثنا تعریف کرد.', 'Exceptions can only be saved for closed periods.'), 'error');
        return;
      }

      if (!exceptionForm.userId || !exceptionForm.fromDate || !exceptionForm.toDate) {
        showToast(t('کاربر، تاریخ شروع و تاریخ پایان استثنا الزامی است.', 'User, from date and to date are required.'), 'error');
        return;
      }

      const from = parseSlashDate(exceptionForm.fromDate);
      const to = parseSlashDate(exceptionForm.toDate);
      const pFrom = parseSlashDate(period.startDate);
      const pTo = parseSlashDate(period.endDate);
      if (!from || !to || !pFrom || !pTo || from > to) {
        showToast(t('بازه زمانی استثنا نامعتبر است.', 'Invalid exception date range.'), 'error');
        return;
      }
      if (from < pFrom || to > pTo) {
        showToast(t('بازه استثنا باید داخل بازه دوره باشد.', 'Exception range must be inside the period range.'), 'error');
        return;
      }

      setExceptionModal(prev => ({ ...prev, isLoading: true }));
      try {
        const payload = {
          period_id: period.id,
          user_id: exceptionForm.userId,
          from_date: toDash(exceptionForm.fromDate),
          to_date: toDash(exceptionForm.toDate),
          note: String(exceptionForm.note || '').trim() || null,
          is_active: exceptionForm.isActive,
          updated_at: new Date().toISOString()
        };

        if (exceptionForm.id) {
          const { error } = await supabase.from('fm_fiscal_period_exceptions').update(payload).eq('id', exceptionForm.id);
          if (error) throw error;
        } else {
          payload.created_at = new Date().toISOString();
          const { error } = await supabase.from('fm_fiscal_period_exceptions').insert([payload]);
          if (error) throw error;
        }

        await openExceptionModal(period);
        beginEditException(null);
        showToast(t('استثنا با موفقیت ذخیره شد.', 'Exception saved successfully.'));
      } catch (err) {
        console.error('saveException error:', err);
        setExceptionModal(prev => ({ ...prev, isLoading: false }));
        showToast(t('خطا در ذخیره استثنا', 'Error saving exception'), 'error');
      }
    };

    const deleteException = async (row) => {
      if (!row) return;
      setExceptionModal(prev => ({ ...prev, isLoading: true }));
      try {
        const { error } = await supabase.from('fm_fiscal_period_exceptions').delete().eq('id', row.id);
        if (error) throw error;
        await openExceptionModal(exceptionModal.period);
        showToast(t('استثنا حذف شد.', 'Exception deleted.'));
      } catch (err) {
        console.error('deleteException error:', err);
        setExceptionModal(prev => ({ ...prev, isLoading: false }));
        showToast(t('خطا در حذف استثنا', 'Error deleting exception'), 'error');
      }
    };

    const periodColumns = [
      {
        field: 'periodCode',
        header_fa: 'کد دوره',
        header_en: 'Period Code',
        width: '130px',
        render: (val) => <span className="font-mono font-bold text-slate-700 dark:text-slate-200" dir="ltr">{val || '-'}</span>
      },
      { field: 'title', header_fa: 'عنوان', header_en: 'Title', width: '160px', render: (v) => <span>{v || '-'}</span> },
      { field: 'startDate', header_fa: 'شروع دوره', header_en: 'Start Date', width: '120px', type: 'date' },
      { field: 'endDate', header_fa: 'پایان دوره', header_en: 'End Date', width: '120px', type: 'date' },
      {
        field: 'status',
        header_fa: 'وضعیت',
        header_en: 'Status',
        width: '120px',
        render: (val) => {
          const meta = getStatusMeta(val);
          return <Badge variant={meta.badge}>{isRtl ? meta.label_fa : meta.label_en}</Badge>;
        }
      },
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

    const exceptionColumns = [
      { field: 'userUsername', header_fa: 'نام کاربری', header_en: 'Username', width: '140px', render: (v) => <span dir="ltr">{v}</span> },
      { field: 'userName', header_fa: 'نام کاربر', header_en: 'User', width: '180px' },
      { field: 'fromDate', header_fa: 'از تاریخ', header_en: 'From Date', width: '120px', type: 'date' },
      { field: 'toDate', header_fa: 'تا تاریخ', header_en: 'To Date', width: '120px', type: 'date' },
      { field: 'note', header_fa: 'توضیح', header_en: 'Note', width: 'auto', minWidth: '180px', render: (v) => <span>{v || '-'}</span> },
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

    return (
      <>
        <div className="xl:col-span-3 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Button variant="outline" size="sm" icon={Plus} onClick={() => openPeriodModal()} disabled={!selectedYear || !access.canCreate} formCode={formCode}>
              {t('دوره جدید', 'New Period')}
            </Button>
            <Button variant="outline" size="sm" icon={Sparkles} onClick={generateMonthlyPeriods} disabled={!selectedYear || !access.canCreate} formCode={formCode}>
              {t('ایجاد اتوماتیک ماهانه', 'Auto Generate Monthly')}
            </Button>
            {selectedYear && (
              <span className="text-[12px] text-slate-500 dark:text-slate-400 mr-auto">
                {t('سال انتخاب‌شده:', 'Selected Year:')} <span className="font-mono font-bold" dir="ltr">{selectedYear.yearCode}</span>
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0">
            <DataGrid
              data={periodRows}
              columns={periodColumns}
              language={language}
              selectable={true}
              selectedIds={selectedPeriodIds}
              onSelectChange={setSelectedPeriodIds}
              isLoading={isLoading}
              onRowDoubleClick={(row) => access.canEdit ? openPeriodModal(row) : undefined}
              gridState={periodGridState}
              onGridStateChange={setPeriodGridState}
              hideImport
              hideExport
              actions={[
                { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => openPeriodModal(row), className: 'text-slate-400 hover:text-indigo-600' },
                { icon: Users, tooltip: t('استثناهای دوره بسته', 'Closed Period Exceptions'), onClick: (row) => openExceptionModal(row), className: 'text-slate-400 hover:text-blue-600' },
                {
                  icon: Trash2,
                  tooltip: t('حذف', 'Delete'),
                  onClick: (row) => {
                    const check = canDeletePeriod(row);
                    if (!check.ok) {
                      showToast(check.message, 'error');
                      return;
                    }
                    setDeleteConfirm({ isOpen: true, type: 'period', payload: row });
                  },
                  className: 'text-slate-400 hover:text-red-600'
                }
              ]}
              bulkActions={[
                {
                  label: t('حذف گروهی', 'Delete Selected'),
                  icon: Trash2,
                  variant: 'danger-outline',
                  onClick: (ids) => {
                    const rows = periodRows.filter(p => ids.includes(p.id));
                    for (const row of rows) {
                      const check = canDeletePeriod(row);
                      if (!check.ok) {
                        showToast(check.message, 'error');
                        return;
                      }
                    }
                    setDeleteConfirm({ isOpen: true, type: 'period_bulk', payload: ids });
                  }
                }
              ]}
            />
          </div>
        </div>

        <Modal
          isOpen={periodModal.isOpen}
          onClose={() => setPeriodModal({ isOpen: false, record: null })}
          title={periodModal.record ? t('ویرایش دوره', 'Edit Period') : t('تعریف دوره جدید', 'New Period')}
          width="max-w-2xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField size="sm" label={t('کد دوره', 'Period Code')} value={periodForm.periodCode} onChange={(e) => setPeriodForm(prev => ({ ...prev, periodCode: e.target.value }))} required dir="ltr" isRtl={isRtl} formCode={formCode} />
              <TextField size="sm" label={t('عنوان دوره', 'Period Title')} value={periodForm.title} onChange={(e) => setPeriodForm(prev => ({ ...prev, title: e.target.value }))} isRtl={isRtl} formCode={formCode} />
              <DatePicker size="sm" label={t('تاریخ شروع دوره', 'Period Start Date')} value={periodForm.startDate} onChange={(v) => setPeriodForm(prev => ({ ...prev, startDate: v }))} isRtl={isRtl} language={language} required formCode={formCode} />
              <DatePicker size="sm" label={t('تاریخ پایان دوره', 'Period End Date')} value={periodForm.endDate} onChange={(v) => setPeriodForm(prev => ({ ...prev, endDate: v }))} isRtl={isRtl} language={language} required formCode={formCode} />
              <SelectField
                size="sm"
                label={t('وضعیت دوره', 'Period Status')}
                value={periodForm.status}
                onChange={(e) => setPeriodForm(prev => ({ ...prev, status: e.target.value }))}
                options={allowedStatusOptions(periodModal.record?.status).map(s => ({ value: s.value, label: isRtl ? s.label_fa : s.label_en }))}
                required
                isRtl={isRtl}
                formCode={formCode}
              />
              <div>
                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('فعال', 'Active')}</div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700">
                  <ToggleField size="sm" label={t('این دوره فعال باشد', 'Keep this period active')} checked={periodForm.isActive} onChange={(v) => setPeriodForm(prev => ({ ...prev, isActive: v }))} isRtl={isRtl} formCode={formCode} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-900/20 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
              <div className="font-bold mb-1 flex items-center gap-1"><Lock size={12} />{t('قوانین تغییر وضعیت', 'Status Transition Rules')}</div>
              <div>{t('باز نشده ← باز ، باز ← بسته شده ، بسته شده ← باز', 'Not Opened -> Open, Open -> Closed, Closed -> Open')}</div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setPeriodModal({ isOpen: false, record: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={savePeriod}>{t('ذخیره', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={exceptionModal.isOpen} onClose={closeExceptionModal} title={t('مدیریت استثناهای دوره بسته', 'Closed Period Exceptions')} width="max-w-6xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            {exceptionModal.period && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 flex items-center gap-2 text-[12px]">
                <Badge variant="slate">{t('دوره', 'Period')}</Badge>
                <span className="font-mono" dir="ltr">{exceptionModal.period.periodCode}</span>
                <span className="text-slate-400">|</span>
                <span>{exceptionModal.period.title || '-'}</span>
                <span className="mr-auto text-slate-500" dir="ltr">{exceptionModal.period.startDate} - {exceptionModal.period.endDate}</span>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 min-h-[400px]">
              <div className="xl:col-span-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800">
                <div className="grid grid-cols-1 gap-3">
                  <LOVField
                    size="sm"
                    label={t('کاربر', 'User')}
                    data={activeUsers}
                    columns={userLovColumns}
                    displayValue={exceptionForm.userDisplay}
                    onChange={(row) => setExceptionForm(prev => ({ ...prev, userId: row?.id || null, userDisplay: row?.label || row?.username || '' }))}
                    onClear={() => setExceptionForm(prev => ({ ...prev, userId: null, userDisplay: '' }))}
                    dropdownWidth="min-w-[560px]"
                    isRtl={isRtl}
                    formCode={formCode}
                  />
                  <DatePicker size="sm" label={t('از تاریخ', 'From Date')} value={exceptionForm.fromDate} onChange={(v) => setExceptionForm(prev => ({ ...prev, fromDate: v }))} isRtl={isRtl} language={language} required formCode={formCode} />
                  <DatePicker size="sm" label={t('تا تاریخ', 'To Date')} value={exceptionForm.toDate} onChange={(v) => setExceptionForm(prev => ({ ...prev, toDate: v }))} isRtl={isRtl} language={language} required formCode={formCode} />
                  <TextField size="sm" label={t('توضیحات', 'Note')} value={exceptionForm.note} onChange={(e) => setExceptionForm(prev => ({ ...prev, note: e.target.value }))} isRtl={isRtl} formCode={formCode} />
                  <div>
                    <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('فعال', 'Active')}</div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-2.5 border border-slate-200 dark:border-slate-700">
                      <ToggleField size="sm" label={t('استثنا فعال باشد', 'Keep exception active')} checked={exceptionForm.isActive} onChange={(v) => setExceptionForm(prev => ({ ...prev, isActive: v }))} isRtl={isRtl} formCode={formCode} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <Button variant="outline" size="sm" onClick={() => beginEditException(null)}>{t('پاک کردن فرم', 'Clear')}</Button>
                  <Button variant="primary" size="sm" icon={Save} onClick={saveException} isLoading={exceptionModal.isLoading}>{t('ذخیره استثنا', 'Save Exception')}</Button>
                </div>
              </div>

              <div className="xl:col-span-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                <DataGrid
                  data={exceptionModal.rows}
                  columns={exceptionColumns}
                  language={language}
                  isLoading={exceptionModal.isLoading}
                  gridState={exceptionGridState}
                  onGridStateChange={setExceptionGridState}
                  hideImport
                  hideExport
                  actions={[
                    { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => beginEditException(row), className: 'text-slate-400 hover:text-indigo-600' },
                    { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => deleteException(row), className: 'text-slate-400 hover:text-red-600' }
                  ]}
                />
              </div>
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, payload: null })} title={t('تایید حذف', 'Confirm Delete')} width="max-w-sm" language={language}>
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'Warning: Irreversible')}
            description={deleteConfirm.type === 'period_bulk' ? t(`آیا از حذف ${deleteConfirm.payload?.length || 0} دوره انتخاب‌شده اطمینان دارید؟`, `Delete ${deleteConfirm.payload?.length || 0} selected periods?`) : t('آیا از انجام عملیات حذف اطمینان دارید؟', 'Are you sure you want to delete this record?')}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, payload: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={executeDelete}>{t('حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>
      </>
    );
  };

  window.FiscalPeriodDetails = FiscalPeriodDetails;
})();
