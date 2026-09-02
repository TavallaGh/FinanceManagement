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
  const Sparkles = LucideIcons.Sparkles || FallbackIcon;
  const Users = LucideIcons.Users || FallbackIcon;
  const Shield = LucideIcons.Shield || FallbackIcon;
  const X = LucideIcons.X || FallbackIcon;
  const UserRoundCog = LucideIcons.UserRoundCog || LucideIcons.UsersRound || FallbackIcon;
  const UsersRound = LucideIcons.UsersRound || LucideIcons.Users || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;

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
    userGroups = [],
    showToast,
    t,
    isRtl = true,
    onRefresh,
    onLog
  }) => {
    const [selectedPeriodIds, setSelectedPeriodIds] = useState([]);
    const [periodGridState, setPeriodGridState] = useState(null);
    const [exceptionGridState, setExceptionGridState] = useState(null);

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, payload: null });

    const [inlinePeriodEdit, setInlinePeriodEdit] = useState({ id: null, isNew: false });
    const [periodInlineForm, setPeriodInlineForm] = useState({
      id: null,
      periodCode: '',
      title: '',
      startDate: '',
      endDate: '',
      status: status?.NOT_OPENED || 'NOT_OPENED',
      isActive: true
    });

    const [accessPanel, setAccessPanel] = useState({
      isVisible: false,
      period: null,
      rows: [],
      isLoading: false
    });

    const [inlineExceptionEdit, setInlineExceptionEdit] = useState({ id: null, isNew: false });
    const [exceptionInlineForm, setExceptionInlineForm] = useState({
      id: null,
      subjectType: 'USER',
      userId: null,
      userDisplay: '',
      userUsername: '',
      groupId: null,
      isActive: true
    });

    const usersById = useMemo(() => {
      const map = new Map();
      users.forEach(u => map.set(String(u.id), u));
      return map;
    }, [users]);

    const groupsById = useMemo(() => {
      const map = new Map();
      userGroups.forEach(g => map.set(String(g.id), g));
      return map;
    }, [userGroups]);

    const activeUsers = useMemo(() => users.filter(u => u.isActive !== false), [users]);
    const activeUserGroups = useMemo(() => userGroups.filter(g => g.isActive !== false), [userGroups]);

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
        if (bStart.getTime() !== addDays(aEnd, 1).getTime()) return true;
      }
      return false;
    };

    const normalizeAndSort = (rows) => {
      return [...rows].sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));
    };

    const resetInlinePeriodForm = () => {
      const prefixParts = selectedYear ? getCalendarParts(selectedYear.startDate, selectedYear.calendarType) : null;
      const prefixYear = prefixParts?.year ? String(prefixParts.year) : '';
      const nextNo = String(periodRows.length + 1).padStart(2, '0');
      setPeriodInlineForm({
        id: '__new__',
        periodCode: `${prefixYear}${nextNo}`,
        title: `${t('دوره', 'Period')} ${nextNo}`,
        startDate: selectedYear?.startDate || '',
        endDate: selectedYear?.endDate || '',
        status: status.NOT_OPENED,
        isActive: true
      });
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

    const validatePeriodDraft = (draft) => {
      if (!selectedYear) {
        showToast(t('ابتدا سال مالی را انتخاب کنید.', 'Please select a fiscal year first.'), 'error');
        return false;
      }
      if (!draft.periodCode || !draft.startDate || !draft.endDate) {
        showToast(t('کد دوره، تاریخ شروع و تاریخ پایان الزامی است.', 'Period code, start date and end date are required.'), 'error');
        return false;
      }

      const start = parseSlashDate(draft.startDate);
      const end = parseSlashDate(draft.endDate);
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
        String(p.periodCode).trim() === String(draft.periodCode).trim() && String(p.id) !== String(draft.id || '')
      );
      if (duplicate) {
        showToast(t('کد دوره تکراری است.', 'Period code is duplicate.'), 'error');
        return false;
      }

      const oldRow = periodRows.find(p => String(p.id) === String(draft.id));
      if (oldRow && !canTransitionStatus(oldRow.status, draft.status)) {
        showToast(t('تغییر وضعیت دوره طبق قوانین مجاز نیست.', 'Period status transition is not allowed.'), 'error');
        return false;
      }

      const baseRows = periodRows.filter(p => String(p.id) !== String(draft.id || ''));
      const testRows = baseRows.concat([{ ...draft }]);
      const sorted = normalizeAndSort(testRows);

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

    const beginInlinePeriodEdit = (row = null) => {
      if (!selectedYear) {
        showToast(t('ابتدا یک سال مالی را انتخاب کنید.', 'Please select a fiscal year first.'), 'warning');
        return;
      }
      if (inlinePeriodEdit.id) {
        showToast(t('ابتدا ویرایش جاری را ذخیره یا لغو کنید.', 'Save or cancel current edit first.'), 'warning');
        return;
      }

      if (row) {
        setPeriodInlineForm({
          id: row.id,
          periodCode: row.periodCode || '',
          title: row.title || '',
          startDate: row.startDate || '',
          endDate: row.endDate || '',
          status: row.status || status.NOT_OPENED,
          isActive: row.isActive !== false
        });
        setInlinePeriodEdit({ id: row.id, isNew: false });
      } else {
        resetInlinePeriodForm();
        setInlinePeriodEdit({ id: '__new__', isNew: true });
      }
    };

    const cancelInlinePeriodEdit = () => {
      setInlinePeriodEdit({ id: null, isNew: false });
      setPeriodInlineForm({
        id: null,
        periodCode: '',
        title: '',
        startDate: '',
        endDate: '',
        status: status?.NOT_OPENED || 'NOT_OPENED',
        isActive: true
      });
    };

    const saveInlinePeriod = async () => {
      const draft = {
        ...periodInlineForm,
        id: inlinePeriodEdit.isNew ? null : periodInlineForm.id
      };
      if (!validatePeriodDraft(draft)) return;

      try {
        const payload = {
          fiscal_year_id: selectedYear.id,
          period_code: String(draft.periodCode).trim(),
          title: String(draft.title || '').trim() || null,
          start_date: toDash(draft.startDate),
          end_date: toDash(draft.endDate),
          status: draft.status,
          is_active: draft.isActive,
          updated_at: new Date().toISOString()
        };

        if (inlinePeriodEdit.isNew) {
          payload.created_at = new Date().toISOString();
          payload.sort_order = periodRows.length + 1;
          const { data, error } = await supabase.from('fm_fiscal_periods').insert([payload]).select('id').single();
          if (error) throw error;
          await onLog?.(data?.id, 'create', `ایجاد دوره ${payload.period_code}`);
        } else {
          const { error } = await supabase.from('fm_fiscal_periods').update(payload).eq('id', draft.id);
          if (error) throw error;
          await onLog?.(draft.id, 'update', `ویرایش دوره ${payload.period_code}`);
        }

        cancelInlinePeriodEdit();
        await onRefresh?.();
        showToast(t('دوره با موفقیت ذخیره شد.', 'Period saved successfully.'));
      } catch (err) {
        console.error('saveInlinePeriod error:', err);
        showToast(t('خطا در ذخیره دوره', 'Error saving period'), 'error');
      }
    };

    const generateMonthlyPeriods = async () => {
      if (!selectedYear) {
        showToast(t('ابتدا یک سال مالی انتخاب کنید.', 'Please select a fiscal year first.'), 'warning');
        return;
      }

      if (inlinePeriodEdit.id) {
        showToast(t('ابتدا ویرایش جاری دوره را ذخیره یا لغو کنید.', 'Save or cancel current period edit first.'), 'warning');
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

          if (accessPanel.isVisible && String(accessPanel.period?.id) === String(p.id)) {
            setAccessPanel({ isVisible: false, period: null, rows: [], isLoading: false });
          }
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

          if (accessPanel.isVisible && ids.some(id => String(id) === String(accessPanel.period?.id))) {
            setAccessPanel({ isVisible: false, period: null, rows: [], isLoading: false });
          }
        }

        setDeleteConfirm({ isOpen: false, type: null, payload: null });
        await onRefresh?.();
        showToast(t('عملیات حذف با موفقیت انجام شد.', 'Deletion completed successfully.'));
      } catch (err) {
        console.error('delete period error:', err);
        showToast(t('خطا در حذف. احتمالاً رکورد وابسته وجود دارد.', 'Delete failed. The record may have dependencies.'), 'error');
      }
    };

    const normalizeSubjectType = (value) => {
      const v = String(value || '').toLowerCase();
      if (v === 'user_group' || v === 'group' || v === 'role') return 'USER_GROUP';
      return 'USER';
    };

    const mapExceptionRows = useCallback((rows) => {
      return (rows || []).map(r => {
        const normalizedType = normalizeSubjectType(r.grantee_type || (r.user_group_id ? 'user_group' : (r.role_id ? 'user_group' : 'user')));
        const userId = r.user_id || (normalizedType === 'USER' ? r.grantee_id : null) || null;
        const groupId = r.user_group_id || (normalizedType === 'USER_GROUP' ? r.grantee_id : null) || null;

        const userObj = userId ? usersById.get(String(userId)) : null;
        const groupObj = groupId ? groupsById.get(String(groupId)) : null;

        return {
          id: r.id,
          periodId: r.period_id,
          subjectType: normalizedType,
          userId,
          userName: userObj?.fullName || userObj?.username || '-',
          userUsername: userObj?.username || '-',
          groupId,
          groupTitle: groupObj?.title || '-',
          accessTarget: normalizedType === 'USER_GROUP' ? (groupObj?.title || '-') : (userObj?.fullName || userObj?.username || '-'),
          isActive: r.is_active !== false
        };
      });
    }, [groupsById, usersById]);

    const loadExceptionsForPeriod = async (periodRow) => {
      if (!periodRow) return;
      setAccessPanel(prev => ({ ...prev, isLoading: true }));

      try {
        const { data, error } = await supabase
          .from('fm_fiscal_period_exceptions')
          .select('*')
          .eq('period_id', periodRow.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setAccessPanel(prev => ({ ...prev, rows: mapExceptionRows(data), isLoading: false }));
      } catch (err) {
        console.error('load exceptions error:', err);
        setAccessPanel(prev => ({ ...prev, isLoading: false }));
        showToast(t('خطا در دریافت استثناها', 'Error loading exceptions'), 'error');
      }
    };

    const openAccessPanel = async (periodRow) => {
      if (!periodRow) return;
      if (periodRow.status !== status.CLOSED) {
        showToast(t('استثنا فقط برای دوره‌های بسته شده قابل تعریف است.', 'Exceptions are only available for closed periods.'), 'warning');
        return;
      }

      setAccessPanel({ isVisible: true, period: periodRow, rows: [], isLoading: true });
      setInlineExceptionEdit({ id: null, isNew: false });
      setExceptionInlineForm({
        id: null,
        subjectType: 'USER',
        userId: null,
        userDisplay: '',
        userUsername: '',
        groupId: null,
        isActive: true
      });

      try {
        const { data, error } = await supabase
          .from('fm_fiscal_period_exceptions')
          .select('*')
          .eq('period_id', periodRow.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setAccessPanel({
          isVisible: true,
          period: periodRow,
          rows: mapExceptionRows(data),
          isLoading: false
        });
      } catch (err) {
        console.error('load exceptions error:', err);
        setAccessPanel(prev => ({ ...prev, isLoading: false }));
        showToast(t('خطا در دریافت استثناها', 'Error loading exceptions'), 'error');
      }
    };

    const closeAccessPanel = () => {
      setAccessPanel({ isVisible: false, period: null, rows: [], isLoading: false });
      setInlineExceptionEdit({ id: null, isNew: false });
      setExceptionInlineForm({
        id: null,
        subjectType: 'USER',
        userId: null,
        userDisplay: '',
        userUsername: '',
        groupId: null,
        isActive: true
      });
      setExceptionGridState(null);
    };

    const resetInlineExceptionForm = (periodRow) => {
      setExceptionInlineForm({
        id: '__new_exception__',
        subjectType: 'USER',
        userId: null,
        userDisplay: '',
        userUsername: '',
        groupId: null,
        isActive: true
      });
      setInlineExceptionEdit({ id: '__new_exception__', isNew: true });
      if (!periodRow) return;
    };

    const beginInlineExceptionEdit = (row = null) => {
      if (!accessPanel.period) return;
      if (inlineExceptionEdit.id) {
        showToast(t('ابتدا ویرایش جاری استثنا را ذخیره یا لغو کنید.', 'Save or cancel current exception edit first.'), 'warning');
        return;
      }

      if (!row) {
        resetInlineExceptionForm(accessPanel.period);
        return;
      }

      setExceptionInlineForm({
        id: row.id,
        subjectType: row.subjectType || 'USER',
        userId: row.userId || null,
        userDisplay: row.userName || '',
        userUsername: row.userUsername || '',
        groupId: row.groupId || null,
        isActive: row.isActive !== false
      });
      setInlineExceptionEdit({ id: row.id, isNew: false });
    };

    const cancelInlineExceptionEdit = () => {
      setInlineExceptionEdit({ id: null, isNew: false });
      setExceptionInlineForm({
        id: null,
        subjectType: 'USER',
        userId: null,
        userDisplay: '',
        userUsername: '',
        groupId: null,
        isActive: true
      });
    };

    const validateExceptionDraft = (draft) => {
      if (!accessPanel.period) return false;

      if (draft.subjectType === 'USER' && !draft.userId) {
        showToast(t('انتخاب کاربر الزامی است.', 'Selecting a user is required.'), 'error');
        return false;
      }
      if (draft.subjectType === 'USER_GROUP' && !draft.groupId) {
        showToast(t('انتخاب گروه کاربری الزامی است.', 'Selecting a user group is required.'), 'error');
        return false;
      }

      const targetId = draft.subjectType === 'USER_GROUP' ? String(draft.groupId || '') : String(draft.userId || '');
      const duplicate = accessPanel.rows.some(r => {
        if (String(r.id) === String(draft.id || '')) return false;
        const rowTargetId = r.subjectType === 'USER_GROUP' ? String(r.groupId || '') : String(r.userId || '');
        return String(r.subjectType) === String(draft.subjectType) && rowTargetId === targetId;
      });

      if (duplicate) {
        showToast(t('اطلاعات تکراری است.', 'Duplicate information.'), 'error');
        return false;
      }

      return true;
    };

    const saveInlineException = async () => {
      const period = accessPanel.period;
      if (!period) return;

      if (period.status !== status.CLOSED) {
        showToast(t('فقط برای دوره بسته شده می‌توان استثنا تعریف کرد.', 'Exceptions can only be saved for closed periods.'), 'error');
        return;
      }

      const draft = {
        ...exceptionInlineForm,
        id: inlineExceptionEdit.isNew ? null : exceptionInlineForm.id
      };
      if (!validateExceptionDraft(draft)) return;

      setAccessPanel(prev => ({ ...prev, isLoading: true }));
      try {
        const payload = {
          period_id: period.id,
          grantee_type: draft.subjectType === 'USER_GROUP' ? 'user_group' : 'user',
          grantee_id: draft.subjectType === 'USER_GROUP' ? draft.groupId : draft.userId,
          user_id: draft.subjectType === 'USER' ? draft.userId : null,
          user_group_id: draft.subjectType === 'USER_GROUP' ? draft.groupId : null,
          is_active: draft.isActive,
          updated_at: new Date().toISOString()
        };

        if (draft.id) {
          const { error } = await supabase.from('fm_fiscal_period_exceptions').update(payload).eq('id', draft.id);
          if (error) throw error;
        } else {
          payload.created_at = new Date().toISOString();
          const { error } = await supabase.from('fm_fiscal_period_exceptions').insert([payload]);
          if (error) throw error;
        }

        cancelInlineExceptionEdit();
        await loadExceptionsForPeriod(period);
        showToast(t('استثنا با موفقیت ذخیره شد.', 'Exception saved successfully.'));
      } catch (err) {
        console.error('saveInlineException error:', err);
        setAccessPanel(prev => ({ ...prev, isLoading: false }));
        if (String(err?.code || '') === '23505') {
          showToast(t('اطلاعات تکراری است.', 'Duplicate information.'), 'error');
          return;
        }
        const errMsg = String(err?.message || '').toLowerCase();
        if (errMsg.includes('grantee_type') || errMsg.includes('grantee_id') || errMsg.includes('user_group_id')) {
          showToast(t('ساختار جدول استثناها نیاز به به‌روزرسانی دارد. کوئری مهاجرت را اجرا کنید.', 'Exceptions table schema needs migration. Please run migration query.'), 'error');
          return;
        }
        showToast(t('خطا در ذخیره استثنا', 'Error saving exception'), 'error');
      }
    };

    const deleteException = async (row) => {
      if (!row) return;
      setAccessPanel(prev => ({ ...prev, isLoading: true }));
      try {
        const { error } = await supabase.from('fm_fiscal_period_exceptions').delete().eq('id', row.id);
        if (error) throw error;
        await loadExceptionsForPeriod(accessPanel.period);
        if (String(inlineExceptionEdit.id) === String(row.id)) {
          cancelInlineExceptionEdit();
        }
        showToast(t('استثنا حذف شد.', 'Exception deleted.'));
      } catch (err) {
        console.error('deleteException error:', err);
        setAccessPanel(prev => ({ ...prev, isLoading: false }));
        showToast(t('خطا در حذف استثنا', 'Error deleting exception'), 'error');
      }
    };

    const periodGridData = useMemo(() => {
      if (!inlinePeriodEdit.isNew) return periodRows;
      return [{
        id: '__new__',
        periodCode: periodInlineForm.periodCode,
        title: periodInlineForm.title,
        startDate: periodInlineForm.startDate,
        endDate: periodInlineForm.endDate,
        status: periodInlineForm.status,
        isActive: periodInlineForm.isActive
      }, ...periodRows];
    }, [inlinePeriodEdit.isNew, periodInlineForm, periodRows]);

    const exceptionGridData = useMemo(() => {
      if (!inlineExceptionEdit.isNew) return accessPanel.rows;
      return [{
        id: '__new_exception__',
        subjectType: exceptionInlineForm.subjectType,
        accessTarget: exceptionInlineForm.subjectType === 'USER_GROUP' ? (groupsById.get(String(exceptionInlineForm.groupId))?.title || '-') : (exceptionInlineForm.userDisplay || '-'),
        userName: exceptionInlineForm.userDisplay,
        userUsername: exceptionInlineForm.userUsername,
        groupId: exceptionInlineForm.groupId,
        isActive: exceptionInlineForm.isActive
      }, ...accessPanel.rows];
    }, [accessPanel.rows, exceptionInlineForm, groupsById, inlineExceptionEdit.isNew]);

    const isEditingPeriodRow = useCallback((row) => {
      return inlinePeriodEdit.id && String(row?.id) === String(inlinePeriodEdit.id);
    }, [inlinePeriodEdit.id]);

    const isEditingExceptionRow = useCallback((row) => {
      return inlineExceptionEdit.id && String(row?.id) === String(inlineExceptionEdit.id);
    }, [inlineExceptionEdit.id]);

    const periodColumns = [
      
      {
        field: 'status',
        header_fa: 'وضعیت',
        header_en: 'Status',
        width: '140px',
        render: (val, row) => {
          if (isEditingPeriodRow(row)) {
            const baseStatus = inlinePeriodEdit.isNew ? null : (periodRows.find(p => String(p.id) === String(row.id))?.status || null);
            return (
              <SelectField
                size="sm"
                value={periodInlineForm.status}
                onChange={(e) => setPeriodInlineForm(prev => ({ ...prev, status: e.target.value }))}
                options={allowedStatusOptions(baseStatus).map(s => ({ value: s.value, label: isRtl ? s.label_fa : s.label_en }))}
                isRtl={isRtl}
                formCode={formCode}
              />
            );
          }
          const meta = getStatusMeta(val);
          return <Badge variant={meta.badge}>{isRtl ? meta.label_fa : meta.label_en}</Badge>;
        }
      },
      {
        field: 'periodCode',
        header_fa: 'کد دوره',
        header_en: 'Period Code',
        width: '140px',
        render: (val, row) => isEditingPeriodRow(row)
          ? <TextField size="sm" value={periodInlineForm.periodCode} onChange={(e) => setPeriodInlineForm(prev => ({ ...prev, periodCode: e.target.value }))} dir="ltr" isRtl={isRtl} formCode={formCode} />
          : <span className="font-sans font-bold text-slate-700 dark:text-slate-200" dir="ltr">{val || '-'}</span>
      },
      {
        field: 'title',
        header_fa: 'عنوان',
        header_en: 'Title',
        width: '170px',
        render: (val, row) => isEditingPeriodRow(row)
          ? <TextField size="sm" value={periodInlineForm.title} onChange={(e) => setPeriodInlineForm(prev => ({ ...prev, title: e.target.value }))} isRtl={isRtl} formCode={formCode} />
          : <span>{val || '-'}</span>
      },
      {
        field: 'startDate',
        header_fa: 'شروع دوره',
        header_en: 'Start Date',
        width: '150px',
        type: 'date',
        render: (val, row) => isEditingPeriodRow(row)
          ? <DatePicker size="sm" value={periodInlineForm.startDate} onChange={(v) => setPeriodInlineForm(prev => ({ ...prev, startDate: v }))} isRtl={isRtl} language={language} formCode={formCode} />
          : <span dir="ltr">{val || '-'}</span>
      },
      {
        field: 'endDate',
        header_fa: 'پایان دوره',
        header_en: 'End Date',
        width: '150px',
        type: 'date',
        render: (val, row) => isEditingPeriodRow(row)
          ? <DatePicker size="sm" value={periodInlineForm.endDate} onChange={(v) => setPeriodInlineForm(prev => ({ ...prev, endDate: v }))} isRtl={isRtl} language={language} formCode={formCode} />
          : <span dir="ltr">{val || '-'}</span>
      },
      {
        field: 'isActive',
        header_fa: 'فعال',
        header_en: 'Active',
        width: '115px',
        render: (val, row) => isEditingPeriodRow(row)
          ? <ToggleField size="sm" checked={periodInlineForm.isActive} onChange={(v) => setPeriodInlineForm(prev => ({ ...prev, isActive: v }))} isRtl={isRtl} formCode={formCode} />
          : (val ? <Badge variant="emerald">{t('فعال', 'Active')}</Badge> : <Badge variant="slate">{t('غیرفعال', 'Inactive')}</Badge>)
      }
    ];

    const exceptionColumns = [
      {
        field: 'isActive',
        header_fa: 'فعال',
        header_en: 'Active',
        width: '110px',
        render: (val, row) => isEditingExceptionRow(row)
          ? <ToggleField size="sm" checked={exceptionInlineForm.isActive} onChange={(v) => setExceptionInlineForm(prev => ({ ...prev, isActive: v }))} isRtl={isRtl} formCode={formCode} />
          : (val ? <Badge variant="emerald">{t('فعال', 'Active')}</Badge> : <Badge variant="slate">{t('غیرفعال', 'Inactive')}</Badge>)
      },
      {
        field: 'subjectType',
        header_fa: 'نوع دسترسی',
        header_en: 'Access Type',
        width: '150px',
        render: (val, row) => {
          if (isEditingExceptionRow(row)) {
            return (
              <SelectField
                size="sm"
                value={exceptionInlineForm.subjectType}
                onChange={(e) => setExceptionInlineForm(prev => ({
                  ...prev,
                  subjectType: e.target.value,
                  userId: null,
                  userDisplay: '',
                  userUsername: '',
                  groupId: null
                }))}
                options={[
                  { value: 'USER', label: t('کاربر', 'User') },
                  { value: 'USER_GROUP', label: t('گروه کاربری', 'User Group') }
                ]}
                isRtl={isRtl}
                formCode={formCode}
              />
            );
          }

          return val === 'USER_GROUP'
            ? <Badge variant="indigo" className="inline-flex items-center gap-1"><UsersRound size={10} />{t('گروه کاربری', 'User Group')}</Badge>
            : <Badge variant="blue" className="inline-flex items-center gap-1"><UserRoundCog size={10} />{t('کاربر', 'User')}</Badge>;
        }
      },
      {
        field: 'accessTarget',
        header_fa: 'دسترسی برای',
        header_en: 'Access Target',
        width: '100px',
        render: (val, row) => {
          if (isEditingExceptionRow(row)) {
            if (exceptionInlineForm.subjectType === 'USER') {
              return (
                <LOVField
                  size="sm"
                  data={activeUsers}
                  columns={userLovColumns}
                  displayValue={exceptionInlineForm.userDisplay}
                  onChange={(userRow) => setExceptionInlineForm(prev => ({
                    ...prev,
                    userId: userRow?.id || null,
                    userDisplay: userRow?.label || userRow?.username || '',
                    userUsername: userRow?.username || ''
                  }))}
                  onClear={() => setExceptionInlineForm(prev => ({ ...prev, userId: null, userDisplay: '', userUsername: '' }))}
                  dropdownWidth="min-w-[520px]"
                  isRtl={isRtl}
                  formCode={formCode}
                />
              );
            }

            return (
              <SelectField
                size="sm"
                value={exceptionInlineForm.groupId || ''}
                onChange={(e) => setExceptionInlineForm(prev => ({ ...prev, groupId: e.target.value || null }))}
                options={activeUserGroups.map(g => ({ value: g.id, label: `${g.code ? `${g.code} - ` : ''}${g.title || g.id}` }))}
                isRtl={isRtl}
                formCode={formCode}
              />
            );
          }

          return (
            <div className="flex flex-col py-0.5 w-full">
              <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{val || '-'}</span>
              {row.subjectType === 'USER' && <span className="text-[10px] text-slate-400" dir="ltr">{row.userUsername || '-'}</span>}
            </div>
          );
        }
      },
    ];

    return (
      <>
        <div className="flex flex-col h-[80vh] bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2">
            {selectedYear && (
              <span className="text-[12px] text-slate-500 dark:text-slate-400 mr-auto">
                {t('سال انتخاب‌شده:', 'Selected Year:')} <span className="font-sans font-bold" dir="ltr">{selectedYear.yearCode}</span>
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
            <div className={`flex flex-col bg-white dark:bg-slate-900 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm ${accessPanel.isVisible ? 'w-full md:w-7/12' : 'w-full'}`}>
              <div className="flex-1 min-h-0">
                <DataGrid
                  data={periodGridData}
                  columns={periodColumns}
                  language={language}
                  selectable={true}
                  activeRowId={accessPanel.period?.id || null}
                  selectedIds={selectedPeriodIds}
                  onSelectChange={setSelectedPeriodIds}
                  isLoading={isLoading}
                  onAdd={() => beginInlinePeriodEdit(null)}
                  onRowDoubleClick={(row) => {
                    if (String(row.id) === '__new__') return;
                    if (access.canEdit) beginInlinePeriodEdit(row);
                  }}
                  gridState={periodGridState}
                  onGridStateChange={setPeriodGridState}
                  hideImport
                  hideExport
                  formCode={formCode}
                  toolbarContent={(
                    <Button variant="outline" size="sm" icon={Sparkles} onClick={generateMonthlyPeriods} disabled={!selectedYear || !access.canCreate} formCode={formCode}>
                      {t('ایجاد اتوماتیک ماهانه', 'Auto Generate Monthly')}
                    </Button>
                  )}
                  actions={[
                    {
                      icon: Save,
                      tooltip: t('ذخیره', 'Save'),
                      hidden: (row) => !isEditingPeriodRow(row),
                      onClick: () => saveInlinePeriod(),
                      className: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded transition-colors'
                    },
                    {
                      icon: X,
                      tooltip: t('لغو', 'Cancel'),
                      hidden: (row) => !isEditingPeriodRow(row),
                      onClick: () => cancelInlinePeriodEdit(),
                      className: 'text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded transition-colors'
                    },
                    {
                      icon: Edit,
                      tooltip: t('ویرایش', 'Edit'),
                      hidden: (row) => String(row.id) === '__new__' || isEditingPeriodRow(row),
                      onClick: (row) => beginInlinePeriodEdit(row),
                      className: 'text-slate-400 hover:text-indigo-600'
                    },
                    {
                      icon: Shield,
                      tooltip: t('استثناهای دسترسی', 'Access Exceptions'),
                      hidden: (row) => String(row.id) === '__new__',
                      onClick: (row) => openAccessPanel(row),
                      className: 'text-slate-400 hover:text-blue-600'
                    },
                    {
                      icon: Trash2,
                      tooltip: t('حذف', 'Delete'),
                      hidden: (row) => String(row.id) === '__new__' || isEditingPeriodRow(row),
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

            {accessPanel.isVisible && (
              <div className="w-full md:w-5/12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200 relative z-10 shadow-sm">
                <div className="absolute top-3 left-3">
                  <button onClick={closeAccessPanel} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>

                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-[13px] mb-1.5 pr-6">{t('استثناهای دسترسی دوره بسته', 'Closed Period Access Exceptions')}</h3>
                  <div className="text-[10px] text-slate-500 font-sans leading-tight flex items-center gap-1.5">
                    <Badge variant="blue">{t('دوره انتخاب شده', 'Selected Period')}</Badge>
                    <span className="font-sans" dir="ltr">{accessPanel.period?.periodCode || '-'}</span>
                    <span className="mx-1">|</span>
                    <span>{accessPanel.period?.title || '-'}</span>
                  </div>
                </div>

                <div className="flex-1 min-h-0 p-3">
                  <div className="h-full min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <DataGrid
                      data={exceptionGridData}
                      columns={exceptionColumns}
                      language={language}
                      isLoading={accessPanel.isLoading}
                      gridState={exceptionGridState}
                      onGridStateChange={setExceptionGridState}
                      hideImport
                      hideExport
                      onAdd={() => beginInlineExceptionEdit(null)}
                      onRowDoubleClick={(row) => {
                        if (String(row.id) === '__new_exception__') return;
                        beginInlineExceptionEdit(row);
                      }}
                      formCode={formCode}
                      actions={[
                        {
                          icon: Save,
                          tooltip: t('ذخیره', 'Save'),
                          hidden: (row) => !isEditingExceptionRow(row),
                          onClick: () => saveInlineException(),
                          className: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded transition-colors'
                        },
                        {
                          icon: X,
                          tooltip: t('لغو', 'Cancel'),
                          hidden: (row) => !isEditingExceptionRow(row),
                          onClick: () => cancelInlineExceptionEdit(),
                          className: 'text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded transition-colors'
                        },
                        {
                          icon: Edit,
                          tooltip: t('ویرایش', 'Edit'),
                          hidden: (row) => String(row.id) === '__new_exception__' || isEditingExceptionRow(row),
                          onClick: (row) => beginInlineExceptionEdit(row),
                          className: 'text-slate-400 hover:text-indigo-600'
                        },
                        {
                          icon: Trash2,
                          tooltip: t('حذف', 'Delete'),
                          hidden: (row) => String(row.id) === '__new_exception__' || isEditingExceptionRow(row),
                          onClick: (row) => deleteException(row),
                          className: 'text-slate-400 hover:text-red-600'
                        }
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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
