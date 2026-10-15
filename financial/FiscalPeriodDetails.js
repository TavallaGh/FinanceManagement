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
  const Modal = DSFeedback.Modal || DS.Modal || Fallback;

  const LucideIcons = window.LucideIcons || {};
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } });
  const Edit = LucideIcons.Edit || FallbackIcon;
  const Trash2 = LucideIcons.Trash2 || FallbackIcon;
  const Save = LucideIcons.Save || FallbackIcon;
  const Sparkles = LucideIcons.Sparkles || FallbackIcon;
  const X = LucideIcons.X || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;

  const oneDayMs = 24 * 60 * 60 * 1000;
  const addDays = (dateObj, n) => new Date(dateObj.getTime() + n * oneDayMs);
  const GREGORIAN_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const JALALI_MONTH_NAMES = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

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
    showToast,
    t,
    isRtl = true,
    onRefresh,
    onLog
  }) => {
    const [selectedPeriodIds, setSelectedPeriodIds] = useState([]);
    const [periodGridState, setPeriodGridState] = useState(null);

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, payload: null });
    const [statusConfirm, setStatusConfirm] = useState({ isOpen: false, type: null });

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

    const getStatusMeta = useCallback((statusValue) => {
      return (statusOptions || []).find(s => s.value === statusValue) || (statusOptions || [])[0] || { badge: 'slate', label_fa: statusValue, label_en: statusValue };
    }, [statusOptions]);

    const allowedStatusOptions = useCallback((currentStatus) => {
      const base = (!currentStatus)
        ? (statusOptions || []).filter(opt => opt.value === status.NOT_OPENED)
        : (statusOptions || []).filter(opt => opt.value === currentStatus || canTransitionStatus(currentStatus, opt.value));

      if (selectedYear?.status === status.CLOSED) {
        return base.filter(opt => opt.value === status.CLOSED || opt.value === currentStatus);
      }

      return base;
    }, [statusOptions, canTransitionStatus, selectedYear?.status, status?.NOT_OPENED, status?.CLOSED]);

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

    const validatePeriodDeletion = useCallback((periodIds) => {
      const idSet = new Set((periodIds || []).map(id => String(id)));
      const sorted = normalizeAndSort(periodRows);
      const selectedRows = sorted.filter(p => idSet.has(String(p.id)));

      if (idSet.size === 0 || selectedRows.length !== idSet.size) {
        return { ok: false, message: t('دوره‌های انتخاب‌شده معتبر نیستند.', 'The selected periods are invalid.') };
      }

      if (selectedRows.some(p => (p.status || status.NOT_OPENED) !== status.NOT_OPENED)) {
        return { ok: false, message: t('فقط دوره‌های «باز نشده» قابل حذف هستند.', 'Only Not Opened periods can be deleted.') };
      }

      const firstSelectedIndex = sorted.findIndex(p => idSet.has(String(p.id)));
      const selectedIsCompleteSuffix = firstSelectedIndex >= 0
        && sorted.slice(firstSelectedIndex).every(p => idSet.has(String(p.id)));
      if (!selectedIsCompleteSuffix) {
        return {
          ok: false,
          message: t('حذف باید از آخرین دوره انجام شود. در حذف گروهی نیز همه دوره‌های انتهایی باید پشت سر هم انتخاب شده باشند.', 'Deletion must start from the last period. For bulk deletion, all selected periods must form a contiguous suffix of the list.')
        };
      }

      return { ok: true };
    }, [periodRows, status.NOT_OPENED, t]);

    const canDeletePeriod = useCallback((periodToDelete) => {
      if (!periodToDelete) return { ok: false, message: t('رکورد دوره نامعتبر است.', 'Invalid period record.') };
      return validatePeriodDeletion([periodToDelete.id]);
    }, [validatePeriodDeletion, t]);

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

      if (!oldRow && draft.status !== status.NOT_OPENED) {
        showToast(t('دوره جدید باید ابتدا با وضعیت «باز نشده» ایجاد شود.', 'A new period must initially be created with Not Opened status.'), 'error');
        return false;
      }

      if (selectedYear?.status === status.CLOSED && draft.status !== status.CLOSED) {
        showToast(
          t('وقتی سال مالی بسته است، وضعیت دوره فقط می‌تواند بسته شده باشد.', 'When fiscal year is closed, period status cannot be Open or Not Opened.'),
          'error'
        );
        return false;
      }

      const baseRows = periodRows.filter(p => String(p.id) !== String(draft.id || ''));
      const testRows = baseRows.concat([{ ...draft }]);
      const sorted = normalizeAndSort(testRows);

      if (oldRow && oldRow.status !== draft.status) {
        const draftIndex = sorted.findIndex(p => String(p.id) === String(draft.id));
        const priorPeriods = draftIndex > 0 ? sorted.slice(0, draftIndex) : [];

        if (draft.status === status.OPEN && priorPeriods.some(p => (p.status || status.NOT_OPENED) === status.NOT_OPENED)) {
          showToast(t('برای بازکردن این دوره، نباید هیچ دوره «باز نشده‌ای» قبل از آن وجود داشته باشد.', 'This period cannot be opened while an earlier period is still Not Opened.'), 'error');
          return false;
        }

        if (draft.status === status.CLOSED && priorPeriods.some(p => (p.status || status.NOT_OPENED) !== status.CLOSED)) {
          showToast(t('برای بستن این دوره، همه دوره‌های قبل از آن باید بسته شده باشند.', 'This period cannot be closed until every earlier period is closed.'), 'error');
          return false;
        }
      }

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

    const saveInlinePeriod = async (statusChangeConfirmed = false) => {
      const draft = {
        ...periodInlineForm,
        id: inlinePeriodEdit.isNew ? null : periodInlineForm.id
      };
      if (!validatePeriodDraft(draft)) return;

      const oldRow = periodRows.find(p => String(p.id) === String(draft.id));
      const isOpening = oldRow?.status === status.NOT_OPENED && draft.status === status.OPEN;
      const isClosing = oldRow?.status === status.OPEN && draft.status === status.CLOSED;
      if ((isOpening || isClosing) && !statusChangeConfirmed) {
        setStatusConfirm({ isOpen: true, type: isClosing ? 'close_period' : 'open_period' });
        return;
      }

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
            generated.push({
              startDate: toSlashFromDate(range.start),
              endDate: toSlashFromDate(range.end),
              title: `${GREGORIAN_MONTH_NAMES[m - 1]} ${y}`
            });
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
            generated.push({
              startDate: toSlashFromDate(range.start),
              endDate: toSlashFromDate(range.end),
              title: `${JALALI_MONTH_NAMES[jm - 1]} ${jy}`
            });
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
            title: g.title,
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
          const check = validatePeriodDeletion(ids);
          if (!check.ok) {
            showToast(check.message, 'error');
            return;
          }

          const idSet = new Set(ids.map(id => String(id)));
          const rowsToDelete = normalizeAndSort(periodRows)
            .filter(p => idSet.has(String(p.id)))
            .reverse();

          for (const row of rowsToDelete) {
            const { error } = await supabase.from('fm_fiscal_periods').delete().eq('id', row.id);
            if (error) throw error;
          }
          await onLog?.(selectedYear?.id, 'bulk_delete', `حذف گروهی ${ids.length} دوره`);
          setSelectedPeriodIds([]);
        }

        setDeleteConfirm({ isOpen: false, type: null, payload: null });
        await onRefresh?.();
        showToast(t('عملیات حذف با موفقیت انجام شد.', 'Deletion completed successfully.'));
      } catch (err) {
        console.error('delete period error:', err);
        setDeleteConfirm({ isOpen: false, type: null, payload: null });
        setSelectedPeriodIds([]);
        await onRefresh?.();
        showToast(t('خطا در حذف. احتمالاً رکورد وابسته وجود دارد.', 'Delete failed. The record may have dependencies.'), 'error');
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

    const isEditingPeriodRow = useCallback((row) => {
      return inlinePeriodEdit.id && String(row?.id) === String(inlinePeriodEdit.id);
    }, [inlinePeriodEdit.id]);

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
            <div className="flex flex-col w-full bg-white dark:bg-slate-900 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <div className="flex-1 min-h-0">
                <DataGrid
                  data={periodGridData}
                  columns={periodColumns}
                  language={language}
                  selectable={true}
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
                        const check = validatePeriodDeletion(ids);
                        if (!check.ok) {
                          showToast(check.message, 'error');
                          return;
                        }
                        setDeleteConfirm({ isOpen: true, type: 'period_bulk', payload: ids });
                      }
                    }
                  ]}
                />
              </div>
            </div>
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

        <Modal isOpen={statusConfirm.isOpen} onClose={() => setStatusConfirm({ isOpen: false, type: null })} title={statusConfirm.type === 'close_period' ? t('تایید بستن دوره', 'Confirm Period Closure') : t('تایید بازکردن دوره', 'Confirm Period Opening')} width="max-w-sm" language={language}>
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: عملیات غیرقابل بازگشت', 'Warning: Irreversible Operation')}
            description={statusConfirm.type === 'close_period'
              ? t('پس از بستن دوره، امکان بازکردن یا بازگرداندن وضعیت آن وجود ندارد. آیا ادامه می‌دهید؟', 'After closing the period, it cannot be reopened or moved back to an earlier status. Continue?')
              : t('پس از بازکردن دوره، امکان بازگرداندن آن به وضعیت «باز نشده» وجود ندارد. آیا ادامه می‌دهید؟', 'After opening the period, it cannot be returned to Not Opened status. Continue?')}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setStatusConfirm({ isOpen: false, type: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button
                  variant={statusConfirm.type === 'close_period' ? 'danger' : 'primary'}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setStatusConfirm({ isOpen: false, type: null });
                    saveInlinePeriod(true);
                  }}
                >
                  {t('تایید و ادامه', 'Confirm and Continue')}
                </Button>
              </div>
            }
          />
        </Modal>
      </>
    );
  };

  window.FiscalPeriodDetails = FiscalPeriodDetails;
})();
