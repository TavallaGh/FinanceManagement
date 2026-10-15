/* Filename: budgeting/BudgetPlanningDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { ArrowRight = FallbackIcon, ArrowLeft = FallbackIcon, Save = FallbackIcon,
    Plus = FallbackIcon, Edit = FallbackIcon, X = FallbackIcon, Trash2 = FallbackIcon,
    AlertTriangle = FallbackIcon, RefreshCw = FallbackIcon,
    CheckSquare = FallbackIcon, CheckCircle = FallbackIcon, FileText = FallbackIcon } = window.LucideIcons || {};
  const logic = window.BudgetPlanningLogic;

  const BudgetPlanningDetails = ({ sourcePlan, copyNotice = null, onBack,
    language = 'fa', formCode = 'BUD_PLANNING' }) => {
    const Empty = () => null;
    const { Button = Empty, Badge = Empty, Tabs = Empty, EmptyState = Empty, Skeleton = Empty } = window.DSCore || window.DesignSystem || {};
    const { CurrencyField = Empty, ToggleField = Empty, TextField = Empty } = window.DSForms || window.DesignSystem || {};
    const { DataGrid = Empty, LOVField = Empty } = window.DSGrid || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty } = window.DSFeedback || window.DesignSystem || {};
    const supabase = window.supabase;
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => securityCtx?.getActions(formCode) || {
      canView: false, canEdit: false
    }, [securityCtx, formCode]);
    const [plan, setPlan] = useState(sourcePlan || {});
    const [lines, setLines] = useState([]);
    const [lookups, setLookups] = useState({ centers: [], headings: [], sources: [], currencies: [] });
    const [matrix, setMatrix] = useState({ centers: [], headings: [], sources: [] });
    const [matrixOpen, setMatrixOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lineDirty, setLineDirty] = useState(false);
    const [editingLine, setEditingLine] = useState(null);
    const [activeTab, setActiveTab] = useState('INCOME');
    const [gridVersion, setGridVersion] = useState(0);
    const [selectedLineIds, setSelectedLineIds] = useState([]);
    const [statusTarget, setStatusTarget] = useState(null);
    const [removeLine, setRemoveLine] = useState(null);
    const [bulkLineDelete, setBulkLineDelete] = useState([]);
    const [exitConfirm, setExitConfirm] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const requestRef = useRef(0);
    const savingRef = useRef(false);
    const persistedLinesRef = useRef(new Map());
    const draftIdRef = useRef(0);
    const canWriteLines = access.canEdit && logic.editableStatuses.has(plan.status);
    const baseCurrency = lookups.currencies.find(row => String(row.id) === String(plan.base_currency_id));
    const precision = Math.max(0, Math.min(6, Number(baseCurrency?.decimal_places) || 0));
    const headingTypes = useMemo(() => new Map(lookups.headings.map(row =>
      [String(row.id), row.heading_type])), [lookups.headings]);
    const visibleLines = lines.filter(row => headingTypes.get(String(row.budget_heading_id)) === activeTab ||
      (editingLine?.id === row.id && !row.budget_heading_id));
    const previewLines = lines.map(row => editingLine?.id === row.id ? editingLine : row)
      .filter(row => !String(row.id).startsWith('draft:manual:') || row.budget_heading_id);
    const typedTotals = logic.totalsByType(previewLines, headingTypes, precision);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(value => ({ ...value, isVisible: false })), 3500);
    }, []);
    const loadAll = useCallback(async (table, columns, filterField, filterValue) => {
      const rows = [];
      for (let from = 0; ; from += 500) {
        let query = supabase.from(table).select(columns).order('id', { ascending: true });
        if (filterField) query = query.eq(filterField, filterValue);
        const { data, error } = await query.range(from, from + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) return rows;
      }
    }, [supabase]);
    const loadData = useCallback(async () => {
      if (!access.canView || !sourcePlan?.id) return;
      const request = ++requestRef.current;
      setLoading(true);
      try {
        if (!supabase) throw new Error('Supabase client is unavailable');
        const [centers, headings, structures, sources, currencies, record, savedLines] = await Promise.all([
          loadAll('fm_budget_centers', 'id,code,title_fa,title_en,is_active'),
          loadAll('fm_budget_headings', 'id,structure_id,parent_id,code,title_fa,title_en,heading_type,is_active'),
          loadAll('fm_budget_heading_structures', 'id,title,is_active'),
          loadAll('fm_funding_sources', 'id,code,title_fa,title_en,is_active'),
          loadAll('fm_currencies', 'id,code,decimal_places,system_role'),
          supabase.from('fm_budget_plans').select('*').eq('id', sourcePlan.id).single(),
          loadAll('fm_budget_plan_lines',
            'id,plan_id,budget_center_id,budget_heading_id,funding_source_id,amount,is_active,description,is_variable_budget',
            'plan_id', sourcePlan.id)
        ]);
        if (record.error) throw record.error;
        if (request !== requestRef.current) return;
        const parentIds = new Set(headings.filter(row => row.parent_id != null).map(row => String(row.parent_id)));
        const structureById = new Map(structures.map(row => [String(row.id), row]));
        const headingById = new Map(headings.map(row => [String(row.id), row]));
        const loadedHeadingTypes = new Map(headings.map(row => [String(row.id), row.heading_type]));
        if (savedLines.some(row => !['INCOME', 'COST'].includes(loadedHeadingTypes.get(String(row.budget_heading_id)))))
          throw new Error(t('نوع سرفصل یک یا چند ردیف مشخص نیست', 'One or more budget lines have no heading type'));
        setLookups({ centers, sources, currencies, headings: headings.map(row => {
          const structure = structureById.get(String(row.structure_id));
          const path = [];
          let parent = row.parent_id == null ? null : headingById.get(String(row.parent_id));
          const visited = new Set();
          while (parent && !visited.has(String(parent.id))) {
            visited.add(String(parent.id));
            path.unshift(isRtl ? (parent.title_fa || parent.code) : (parent.title_en || parent.title_fa || parent.code));
            parent = parent.parent_id == null ? null : headingById.get(String(parent.parent_id));
          }
          if (structure?.title) path.unshift(structure.title);
          return { ...row, isLeaf: !parentIds.has(String(row.id)),
            structureActive: structure?.is_active !== false,
            structureTitle: structure?.title || '',
            title: isRtl ? row.title_fa : (row.title_en || row.title_fa),
            pathTitle: path.join(' / ') };
        }) });
        setPlan(record.data);
        persistedLinesRef.current = new Map(savedLines.map(row => [String(row.id), row]));
        setLines(savedLines.map(row => ({ ...row, amount: String(row.amount) })));
        setEditingLine(null);
        setSelectedLineIds([]);
        setLineDirty(false);
        setLoadError(false);
      } catch (error) {
        if (request === requestRef.current) {
          setLoadError(true);
          showToast(error?.message || t('دریافت ردیف‌های بودجه انجام نشد', 'Failed to load budget lines'), 'error');
        }
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, [access.canView, sourcePlan?.id, supabase, loadAll, isRtl, showToast, t]);
    useEffect(() => {
      loadData();
      return () => { requestRef.current += 1; };
    }, [loadData]);

    const logAction = async details => {
      const { error } = await supabase.from('fm_record_logs').insert([{
        entity_type: 'برنامه بودجه', record_id: String(plan.id), action: 'update',
        user_name: window.NavigationSystem?.currentUser?.name || 'system', details
      }]);
      if (error) console.error('Budget plan audit log failed:', error);
    };
    const addMatrix = () => {
      if (!canWriteLines || loading || loadError || savingRef.current) return;
      if (editingLine) return showToast(t('ابتدا ویرایش ردیف جاری را ثبت کنید', 'Apply the current line edit first'), 'warning');
      if ((activeTab === 'COST' && !matrix.centers.length) || !matrix.headings.length)
        return showToast(t('گزینه‌های لازم را انتخاب کنید', 'Select the required items'), 'error');
      const centers = activeTab === 'INCOME' ? [null] : matrix.centers;
      if (centers.length * matrix.headings.length * Math.max(1, matrix.sources.length) > 1000)
        return showToast(t('هر بار حداکثر 1000 ترکیب ایجاد کنید', 'Create at most 1,000 combinations at a time'), 'error');
      const next = logic.expandMatrix(lines, centers, matrix.headings, matrix.sources, headingTypes);
      if (next.length > 5000) return showToast(t('حداکثر 5000 ردیف در یک بودجه مجاز است', 'A plan can contain at most 5,000 lines'), 'error');
      setLines(next);
      if (next.length !== lines.length) setLineDirty(true);
      setMatrixOpen(false);
      setMatrix({ centers: [], headings: [], sources: [] });
      showToast(t(`${next.length - lines.length} ردیف اضافه شد`, `${next.length - lines.length} lines added`));
    };
    const addLine = () => {
      if (!canWriteLines || editingLine || loading || loadError || saving || lines.length >= 5000) return;
      const row = { id: `draft:manual:${++draftIdRef.current}`, budget_center_id: null,
        budget_heading_id: null, funding_source_id: null, amount: '0', is_active: true,
        description: '', is_variable_budget: false };
      setLines(current => [row, ...current]);
      setEditingLine({ ...row });
      setGridVersion(current => current + 1);
    };
    const beginEditLine = row => {
      if (!canWriteLines || editingLine || savingRef.current) return;
      setEditingLine({ ...row, amount: String(row.amount ?? '0'), is_active: row.is_active !== false,
        description: row.description || '', is_variable_budget: row.is_variable_budget === true });
    };
    const hasValidReferences = row =>
      (headingTypes.get(String(row.budget_heading_id)) === 'INCOME' ||
        lookups.centers.some(item => String(item.id) === String(row.budget_center_id))) &&
      lookups.headings.some(item => String(item.id) === String(row.budget_heading_id) &&
        (item.heading_type === 'COST' || item.heading_type === 'INCOME')) &&
      (row.funding_source_id == null || lookups.sources.some(item => String(item.id) === String(row.funding_source_id)));
    const cancelLineEdit = () => {
      if (String(editingLine?.id).startsWith('draft:manual:'))
        setLines(current => current.filter(row => row.id !== editingLine.id));
      setEditingLine(null);
    };
    const commitLineEdit = () => {
      if (!editingLine) return;
      if ((activeTab === 'COST' && !editingLine.budget_center_id) ||
        !editingLine.budget_heading_id)
        return showToast(t('فیلدهای لازم ردیف را انتخاب کنید', 'Select the required line fields'), 'error');
      if (!hasValidReferences(editingLine))
        return showToast(t('یک یا چند مقدار انتخابی معتبر نیست', 'One or more selected values are invalid'), 'error');
      if (headingTypes.get(String(editingLine.budget_heading_id)) !== activeTab)
        return showToast(t('نوع سرفصل با تب انتخابی یکسان نیست', 'Heading type does not match this tab'), 'error');
      if (lines.some(row => String(row.id) !== String(editingLine.id) &&
        logic.lineKey(row, headingTypes) === logic.lineKey(editingLine, headingTypes)))
        return showToast(t('این ترکیب قبلاً در ردیف‌ها وجود دارد', 'This line combination already exists'), 'error');
      if (logic.amountUnits(editingLine.amount, precision) == null)
        return showToast(t('مبلغ ردیف معتبر نیست', 'Invalid line amount'), 'error');
      setLines(current => current.map(row => String(row.id) === String(editingLine.id)
        ? { ...editingLine } : row));
      setEditingLine(null);
      setLineDirty(true);
    };
    const handleLineKeyDown = event => {
      if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); commitLineEdit(); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelLineEdit(); }
    };
    const saveLines = async () => {
      if (!canWriteLines || !lineDirty || savingRef.current || loadError) return;
      if (editingLine) return showToast(t('ابتدا ویرایش ردیف جاری را ثبت کنید', 'Apply the current line edit first'), 'warning');
      if (lines.some(row => !row.budget_heading_id ||
        (headingTypes.get(String(row.budget_heading_id)) === 'COST' && !row.budget_center_id)))
        return showToast(t('اطلاعات همه ردیف‌ها را کامل کنید', 'Complete every line'), 'error');
      if (lines.some(row => !hasValidReferences(row)))
        return showToast(t('ارجاع یک یا چند ردیف معتبر نیست', 'One or more line references are invalid'), 'error');
      if (new Set(lines.map(row => logic.lineKey(row, headingTypes))).size !== lines.length)
        return showToast(t('ردیف تکراری وجود دارد', 'Duplicate line combination exists'), 'error');
      if (lines.some(row => logic.amountUnits(row.amount, precision) == null))
        return showToast(t('مبلغ یک یا چند ردیف معتبر نیست', 'One or more line amounts are invalid'), 'error');
      savingRef.current = true;
      setSaving(true);
      let savedCount = 0;
      try {
        const linePayload = row => ({
          budget_center_id: row.budget_center_id,
          budget_heading_id: row.budget_heading_id,
          funding_source_id: row.funding_source_id,
          amount: logic.englishDigits(row.amount).replaceAll(',', ''),
          is_active: row.is_active !== false,
          description: String(row.description || '').trim() || null,
          is_variable_budget: row.is_variable_budget === true
        });
        for (const row of lines) {
          const payload = linePayload(row);
          const isNew = String(row.id).startsWith('draft:');
          const persisted = persistedLinesRef.current.get(String(row.id));
          if (!isNew && persisted &&
            JSON.stringify(payload) === JSON.stringify(linePayload(persisted))) continue;
          // Existing lines must be addressed by their own ID, including copied lines.
          const query = isNew
            ? supabase.from('fm_budget_plan_lines').insert([{ ...payload, plan_id: plan.id }])
            : supabase.from('fm_budget_plan_lines').update(payload)
                .eq('id', row.id).eq('plan_id', plan.id);
          const { data, error } = await query.select('id').single();
          if (error) throw error;
          persistedLinesRef.current.set(String(data.id), { ...payload, id: data.id });
          // Keep returned IDs immediately so a retry after partial failure cannot insert again.
          setLines(current => current.map(item => String(item.id) === String(row.id)
            ? { ...item, id: data.id, plan_id: plan.id } : item));
          savedCount += 1;
        }
        await logAction(`ذخیره ${savedCount} ردیف بودجه`);
        const saved = await loadAll('fm_budget_plan_lines',
          'id,plan_id,budget_center_id,budget_heading_id,funding_source_id,amount,is_active,description,is_variable_budget',
          'plan_id', plan.id);
        persistedLinesRef.current = new Map(saved.map(row => [String(row.id), row]));
        setLines(saved.map(row => ({ ...row, amount: String(row.amount) })));
        setSelectedLineIds([]);
        setLineDirty(false);
        showToast(t('ردیف‌های بودجه ذخیره شدند', 'Budget lines saved'));
      } catch (error) {
        if (savedCount) await logAction(`ذخیره ناقص ردیف‌های بودجه: ${savedCount} ردیف ثبت شد`);
        const missingCenterSchema = String(error?.message || '').includes('budget_center_id') &&
          (error?.code === '23502' || String(error?.message || '').includes('not-null constraint'));
        showToast(missingCenterSchema
          ? t('ساختار دیتابیس برای ذخیره ردیف درآمد باید به‌روز شود', 'The database schema must be updated to save income lines')
          : error?.message || t('ذخیره ردیف‌ها انجام نشد', 'Failed to save budget lines'), 'error');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    };
    const deleteLine = async () => {
      const row = removeLine;
      if (!row || !canWriteLines || savingRef.current) return;
      if (String(row.id).startsWith('draft:')) {
        setLines(current => current.filter(item => item.id !== row.id));
        setRemoveLine(null);
        setLineDirty(true);
        return;
      }
      savingRef.current = true;
      setSaving(true);
      try {
        const { error } = await supabase.from('fm_budget_plan_lines').delete()
          .eq('id', row.id).eq('plan_id', plan.id).select('id').single();
        if (error) throw error;
        setLines(current => current.filter(item => item.id !== row.id));
        setSelectedLineIds(current => current.filter(id => id !== row.id));
        setRemoveLine(null);
        await logAction(`حذف ردیف بودجه: ${logic.lineKey(row, headingTypes)}`);
        showToast(t('ردیف حذف شد', 'Line deleted'));
      } catch (error) {
        showToast(error?.message || t('حذف ردیف انجام نشد', 'Failed to delete line'), 'error');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    };
    const deleteSelectedLines = async () => {
      if (!bulkLineDelete.length || !canWriteLines || savingRef.current) return;
      if (editingLine) return showToast(t('ابتدا ویرایش ردیف جاری را ثبت کنید', 'Apply the current line edit first'), 'warning');
      const ids = bulkLineDelete.filter(id => !String(id).startsWith('draft:'));
      savingRef.current = true;
      setSaving(true);
      try {
        if (ids.length) {
          const { data, error } = await supabase.from('fm_budget_plan_lines').delete()
            .eq('plan_id', plan.id).in('id', ids).select('id');
          if (error) throw error;
          if (data?.length !== ids.length) throw new Error(t('برخی ردیف‌ها حذف نشدند؛ بازخوانی کنید', 'Some lines were not deleted; refresh'));
        }
        const selected = new Set(bulkLineDelete.map(String));
        setLines(current => current.filter(row => !selected.has(String(row.id))));
        setSelectedLineIds([]);
        setBulkLineDelete([]);
        await logAction(`حذف گروهی ${bulkLineDelete.length} ردیف بودجه`);
        showToast(t('ردیف‌های انتخاب‌شده حذف شدند', 'Selected lines deleted'));
      } catch (error) {
        showToast(error?.message || t('حذف گروهی انجام نشد', 'Bulk deletion failed'), 'error');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    };
    const setSelectedLinesActive = (active, ids) => {
      if (!canWriteLines || !ids?.length || savingRef.current) return;
      if (editingLine) return showToast(t('ابتدا ویرایش ردیف جاری را ثبت کنید', 'Apply the current line edit first'), 'warning');
      const selected = new Set(ids.map(String));
      setLines(current => current.map(row => selected.has(String(row.id)) ? { ...row, is_active: active } : row));
      setSelectedLineIds([]);
      setLineDirty(true);
      showToast(t('وضعیت ردیف‌ها تغییر کرد؛ برای ثبت، ذخیره را بزنید', 'Line status changed; press Save to apply'));
    };
    const changeStatus = async () => {
      const target = statusTarget;
      if (!target || !plan.id || !access.canEdit || savingRef.current ||
        !logic.transitions[plan.status]?.includes(target)) return;
      if (lineDirty || editingLine) return showToast(t('ابتدا ردیف‌ها را ذخیره کنید', 'Save line changes first'), 'error');
      savingRef.current = true;
      setSaving(true);
      try {
        if (target === 'FINAL' || target === 'APPROVED') {
          const { count, error } = await supabase.from('fm_budget_plan_lines')
            .select('id', { count: 'exact', head: true }).eq('plan_id', plan.id).eq('is_active', true);
          if (error) throw error;
          if (!count) throw new Error(t('دست‌کم یک ردیف فعال لازم است', 'At least one active line is required'));
          if (target === 'FINAL') {
            const { count: zeroAmountCount, error: zeroAmountError } = await supabase.from('fm_budget_plan_lines')
              .select('id', { count: 'exact', head: true }).eq('plan_id', plan.id).eq('amount', 0);
            if (zeroAmountError) throw zeroAmountError;
            if (zeroAmountCount) throw new Error(t(
              '\u062a\u0628\u062f\u06cc\u0644 \u0628\u0648\u062f\u062c\u0647 \u0628\u0647 \u00ab\u0628\u0631\u0631\u0633\u06cc \u0634\u062f\u0647\u00bb \u0645\u062c\u0627\u0632 \u0646\u06cc\u0633\u062a\u061b \u0645\u0628\u0644\u063a \u06cc\u06a9 \u06cc\u0627 \u0686\u0646\u062f \u0631\u062f\u06cc\u0641 \u0635\u0641\u0631 \u0627\u0633\u062a.',
              'This budget cannot be marked reviewed because one or more lines have a zero amount.'
            ));
          }
        }
        const { error } = await supabase.from('fm_budget_plans').update({ status: target })
          .eq('id', plan.id).eq('status', plan.status).select('id').single();
        if (error) throw error;
        await logAction(`تغییر وضعیت بودجه: ${plan.status} -> ${target}`);
        setPlan(current => ({ ...current, status: target }));
        setStatusTarget(null);
        showToast(t('وضعیت بودجه تغییر کرد', 'Budget status updated'));
      } catch (error) {
        showToast(error?.message || t('تغییر وضعیت انجام نشد', 'Failed to change status'), 'error');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    };

    const byId = rows => new Map(rows.map(row => [String(row.id), row]));
    const centerById = byId(lookups.centers);
    const headingById = byId(lookups.headings);
    const sourceById = byId(lookups.sources);
    const display = row => row ? `${logic.englishDigits(row.code)} - ${isRtl ? row.title_fa : (row.title_en || row.title_fa)}` : t('ناموجود', 'Missing');
    const headingDisplay = row => row ? `${logic.englishDigits(row.code)} - ${row.title}` : t('ناموجود', 'Missing');
    const headingPickerColumns = [
      { field: 'structureTitle', header_fa: 'ساختار بودجه', header_en: 'Budget Structure', width: '150px' },
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '90px' },
      { field: 'title', header_fa: 'عنوان', header_en: 'Title', width: '280px',
        render: (_value, row) => <div className="min-w-0">
          <div className="truncate">{row.title || '-'}</div>
          <div className="truncate text-[10px] text-slate-500 dark:text-slate-400" title={row.pathTitle || ''}>{row.pathTitle || '-'}</div>
        </div> }
    ];
    const linePicker = (row, field, data, columns, displayValue) =>
      editingLine?.id === row.id
        ? <div onClick={event => event.stopPropagation()} onKeyDown={event => {
            if (event.key === 'Escape') { event.stopPropagation(); cancelLineEdit(); }
          }}>
            <LOVField formCode={formCode} size="sm" isRtl={isRtl} data={data} columns={columns}
              displayValue={displayValue} dropdownWidth={field === 'budget_heading_id'
                ? 'min-w-[540px] max-w-[640px]' : 'min-w-[320px] max-w-[480px]'}
              onChange={value => setEditingLine(current => ({ ...current, [field]: value?.id ?? null }))} />
          </div>
        : displayValue;
    const selectableCenters = lookups.centers.filter(row => row.is_active || String(row.id) === String(editingLine?.budget_center_id));
    const selectableHeadings = lookups.headings.filter(row =>
      (row.is_active && row.structureActive && row.isLeaf && row.heading_type === activeTab) ||
      String(row.id) === String(editingLine?.budget_heading_id));
    const selectableSources = lookups.sources.filter(row => row.is_active || String(row.id) === String(editingLine?.funding_source_id));
    const pickerColumns = [{ field: 'code', header_fa: 'کد', header_en: 'Code' },
      { field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان', header_en: 'Title' }];
    const lineColumns = [
      ...(activeTab === 'COST' ? [{ field: 'budget_center_id', header_fa: 'مرکز بودجه', header_en: 'Budget Center', width: '195px',
        render: (value, row) => linePicker(row, 'budget_center_id', selectableCenters, pickerColumns,
          (editingLine?.id === row.id ? editingLine.budget_center_id : value)
            ? display(centerById.get(String(editingLine?.id === row.id ? editingLine.budget_center_id : value))) : '') }] : []),
      { field: 'budget_heading_id', header_fa: 'سرفصل بودجه', header_en: 'Budget Heading', width: '220px',
        render: (value, row) => linePicker(row, 'budget_heading_id', selectableHeadings,
          headingPickerColumns,
          (editingLine?.id === row.id ? editingLine.budget_heading_id : value)
            ? headingDisplay(headingById.get(String(editingLine?.id === row.id ? editingLine.budget_heading_id : value))) : '') },
      { field: '_heading_type', header_fa: 'نوع سرفصل', header_en: 'Heading Type', width: '110px',
        render: (_value, row) => {
          const type = headingTypes.get(String(editingLine?.id === row.id ? editingLine.budget_heading_id : row.budget_heading_id));
          return type === 'INCOME' ? t('درآمدی', 'Income') : type === 'COST' ? t('هزینه‌ای', 'Cost') : '-';
        } },
      { field: 'funding_source_id', header_fa: 'منبع تأمین', header_en: 'Funding Source', width: '195px',
        render: (value, row) => linePicker(row, 'funding_source_id', selectableSources, pickerColumns,
          (editingLine?.id === row.id ? editingLine.funding_source_id : value)
            ? display(sourceById.get(String(editingLine?.id === row.id ? editingLine.funding_source_id : value))) : '') },
      { field: 'is_variable_budget', header_fa: '\u0628\u0648\u062f\u062c\u0647 \u0645\u062a\u063a\u06cc\u0631', header_en: 'Variable Budget', width: '145px',
        render: (value, row) => editingLine?.id === row.id
          ? <div onClick={event => event.stopPropagation()} onKeyDown={handleLineKeyDown}>
              <ToggleField formCode={formCode}
                checked={editingLine.is_variable_budget === true} isRtl={isRtl}
                onChange={active => setEditingLine(current => ({ ...current, is_variable_budget: active }))} />
            </div>
          : <Badge variant={value === true ? 'orange' : 'gray'}>
              {value === true ? t('\u0645\u062a\u063a\u06cc\u0631', 'Variable') : t('\u0642\u0637\u0639\u06cc', 'Fixed')}
            </Badge> },
      { field: 'amount', header_fa: 'مبلغ', header_en: 'Amount', width: '160px',
        render: (value, row) => editingLine?.id === row.id
          ? <div onClick={event => event.stopPropagation()} onKeyDown={handleLineKeyDown}>
              <CurrencyField size="sm" formCode={formCode} value={editingLine.amount} isRtl={false}
                onChange={amount => setEditingLine(current => ({ ...current, amount }))} />
            </div>
          : <span dir="ltr" className={`block text-end font-medium ${headingTypes.get(String(row.budget_heading_id)) === 'INCOME'
              ? 'text-emerald-700 dark:text-emerald-400' : headingTypes.get(String(row.budget_heading_id)) === 'COST'
                ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {logic.formatAmount(value, precision)}
            </span> },
      { field: 'description', header_fa: '\u062a\u0648\u0636\u06cc\u062d\u0627\u062a', header_en: 'Description', width: '190px',
        render: (value, row) => editingLine?.id === row.id
          ? <div onClick={event => event.stopPropagation()} onKeyDown={handleLineKeyDown}>
              <TextField size="sm" formCode={formCode} isRtl={isRtl}
                value={editingLine.description || ''}
                onChange={event => setEditingLine(current => ({ ...current, description: event.target.value }))} />
            </div>
          : <span className="block truncate" title={value || ''}>{value || '-'}</span> },
      { field: 'is_active', header_fa: 'فعال', header_en: 'Active', width: '95px',
        render: (value, row) => editingLine?.id === row.id
          ? <div onClick={event => event.stopPropagation()} onKeyDown={handleLineKeyDown}>
              <ToggleField formCode={formCode} checked={editingLine.is_active} isRtl={isRtl}
                onChange={active => setEditingLine(current => ({ ...current, is_active: active }))} />
            </div>
          : <Badge variant={value !== false ? 'success' : 'gray'}>
              {value !== false ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}
            </Badge> }
    ];
    const matrixFields = [
      { key: 'centers', label: t('مراکز بودجه', 'Budget Centers'), data: lookups.centers.filter(row => row.is_active),
        columns: [{ field: 'code', header_fa: 'کد', header_en: 'Code' },
          { field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان', header_en: 'Title' }] },
      { key: 'headings', label: t('سرفصل‌های بودجه', 'Budget Headings'),
        data: lookups.headings.filter(row => row.is_active && row.structureActive && row.isLeaf &&
          row.heading_type === activeTab),
        columns: headingPickerColumns },
      { key: 'sources', label: t('منابع تأمین اعتبار', 'Funding Sources'), data: lookups.sources.filter(row => row.is_active),
        columns: [{ field: 'code', header_fa: 'کد', header_en: 'Code' },
          { field: isRtl ? 'title_fa' : 'title_en', header_fa: 'عنوان', header_en: 'Title' }] }
    ];
    const statusLabel = value => ({ DRAFT: t('یادداشت', 'Draft'), TEMPORARY: t('موقت', 'Temporary'),
      FINAL: t('بررسی شده', 'Reviewed'), APPROVED: t('تأیید شده', 'Approved') }[value] || value);
    const transitionLabel = target => {
      if (target === 'TEMPORARY') return plan.status === 'FINAL'
        ? t('برگشت به موقت', 'Revert to Temporary') : t('تبدیل به موقت', 'Set Temporary');
      if (target === 'DRAFT') return t('برگشت به یادداشت', 'Revert to Draft');
      if (target === 'FINAL') return t('تبدیل به بررسی شده', 'Set Reviewed');
      return t('تأیید بودجه', 'Approve Budget');
    };
    const statusActions = <div className="flex items-center gap-2 flex-wrap">
      {access.canEdit && (logic.transitions[plan.status] || []).map(target => (
        <Button key={target} size="sm" variant="outline"
          icon={{ DRAFT: Edit, TEMPORARY: FileText, FINAL: CheckSquare, APPROVED: CheckCircle }[target]}
          className={{ DRAFT: '!text-slate-600 !border-slate-500', TEMPORARY: '!text-orange-500 !border-orange-500',
            FINAL: '!text-blue-600 !border-blue-500', APPROVED: '!text-emerald-600 !border-emerald-500' }[target]}
          disabled={saving || lineDirty || !!editingLine} onClick={() => setStatusTarget(target)}>
          {transitionLabel(target)}
        </Button>
      ))}
    </div>;
    const lineBulkActions = canWriteLines ? [
      { label: t('فعال‌سازی گروهی', 'Activate Selected'), icon: CheckCircle, variant: 'outline', requiredAccess: 'edit',
        onClick: ids => setSelectedLinesActive(true, ids) },
      { label: t('غیرفعال‌سازی گروهی', 'Deactivate Selected'), icon: FileText, variant: 'outline', requiredAccess: 'edit',
        onClick: ids => setSelectedLinesActive(false, ids) },
      { label: t('حذف گروهی', 'Bulk Delete'), icon: Trash2, variant: 'danger-outline', requiredAccess: 'edit',
        onClick: ids => setBulkLineDelete(ids) }
    ] : [];

    if (!access.canView) return <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} />;
    return <div className="h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900 text-[12px]"
      dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between gap-3 shrink-0 shadow-sm z-30 relative">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" icon={isRtl ? ArrowRight : ArrowLeft}
            disabled={saving} onClick={() => (lineDirty || editingLine) ? setExitConfirm(true) : onBack()}>
            {t('بازگشت به لیست', 'Back to List')}
          </Button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />
          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate">
            {t('ردیف‌های بودجه', 'Budget Lines')}: {plan.title}
          </span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{logic.englishDigits(plan.code)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadData}
            disabled={saving || lineDirty || !!editingLine} title={t('بازخوانی', 'Refresh')} />
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
          <Button size="sm" variant="outline" disabled={saving}
            onClick={() => (lineDirty || editingLine) ? setExitConfirm(true) : onBack()}>
            {t('انصراف', 'Cancel')}
          </Button>
          {canWriteLines && <Button size="sm" variant="primary" icon={Save} isLoading={saving}
            disabled={!lineDirty || !!editingLine} onClick={saveLines}>{t('ذخیره', 'Save')}</Button>}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 flex flex-col gap-4">
        {copyNotice && <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 p-2 rounded-lg flex items-center gap-2 shrink-0">
          <AlertTriangle size={16} />
          <span className="font-bold">{t(`این بودجه از «${logic.englishDigits(copyNotice.code)}» کپی شده است؛ ردیف‌ها و مبالغ را پیش از ثبت کنترل کنید.`,
            `Copied from ${logic.englishDigits(copyNotice.code)}; review lines and amounts before saving.`)}</span>
        </div>}
        {loading ? <div className="flex flex-col gap-3"><Skeleton height="3rem" /><Skeleton height="18rem" /></div>
          : loadError ? <EmptyState title={t('بارگذاری ردیف‌های بودجه انجام نشد', 'Could not load budget lines')}
              action={<Button size="sm" onClick={loadData}>{t('تلاش دوباره', 'Retry')}</Button>} />
            : <>
                <div className="shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-3 grid grid-cols-1 lg:grid-cols-3 items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{t('وضعیت بودجه', 'Budget Status')}</span>
                    <Badge variant={{ DRAFT: 'slate', TEMPORARY: 'orange', FINAL: 'blue', APPROVED: 'emerald' }[plan.status] || 'slate'}>
                      {statusLabel(plan.status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                    <span className="text-slate-600 dark:text-slate-300">{t('کل درآمد', 'Total Income')}:
                      {' '}<strong dir="ltr" className="text-emerald-700 dark:text-emerald-400">{typedTotals?.income ?? '-'}</strong> {baseCurrency?.code || ''}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">{t('کل هزینه', 'Total Cost')}:
                      {' '}<strong dir="ltr" className="text-red-700 dark:text-red-400">{typedTotals?.cost ?? '-'}</strong> {baseCurrency?.code || ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {statusActions}
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <Tabs tabs={[
                    { id: 'INCOME', label: `${t('ردیف‌های درآمد', 'Income Lines')} (${lines.filter(row => headingTypes.get(String(row.budget_heading_id)) === 'INCOME').length})` },
                    { id: 'COST', label: `${t('ردیف‌های هزینه', 'Cost Lines')} (${lines.filter(row => headingTypes.get(String(row.budget_heading_id)) === 'COST').length})` }
                  ]} activeTab={activeTab} className="shrink-0 !mb-2" onChange={tab => {
                    if (editingLine) return showToast(t('ابتدا ویرایش ردیف جاری را ثبت یا لغو کنید', 'Apply or cancel the current line edit first'), 'warning');
                    setActiveTab(tab);
                    setSelectedLineIds([]);
                    setMatrix({ centers: [], headings: [], sources: [] });
                  }} />
                  <div className="flex-1 min-h-[300px] p-1">
                    <DataGrid key={`${activeTab}-${gridVersion}`} data={visibleLines} columns={lineColumns} language={language} formCode={formCode}
                      hideImport hideExport hideToolbar={!canWriteLines} compactBulkToolbar actionWidth="80px"
                      toolbarContent={canWriteLines && <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="primary" icon={Plus}
                          disabled={!!editingLine || saving || lines.length >= 5000} onClick={addLine}>
                          {t('جدید', 'New')}
                        </Button>
                        <Button size="sm" variant="outline" icon={Plus}
                          disabled={!!editingLine || saving || lines.length >= 5000} onClick={() => setMatrixOpen(true)}>
                          {t('ایجاد ردیف از ترکیب انتخابی', 'Create Lines from Selection')}
                        </Button>
                      </div>}
                      selectable={canWriteLines} selectedRowIds={selectedLineIds}
                      onSelectionChange={setSelectedLineIds} bulkActions={lineBulkActions}
                      onRowDoubleClick={beginEditLine}
                      actions={canWriteLines ? [
                        { id: 'save', icon: Save, tooltip: t('ثبت ویرایش ردیف', 'Apply Line Edit'),
                          hidden: row => editingLine?.id !== row.id, onClick: commitLineEdit, requiredAccess: 'edit' },
                        { id: 'cancel', icon: X, tooltip: t('انصراف از ویرایش', 'Cancel Line Edit'),
                          hidden: row => editingLine?.id !== row.id, onClick: cancelLineEdit, requiredAccess: 'edit' },
                        { id: 'edit', icon: Edit, tooltip: t('ویرایش ردیف', 'Edit Line'),
                          hidden: () => !!editingLine, onClick: beginEditLine, requiredAccess: 'edit' },
                        { id: 'delete', icon: Trash2, tooltip: t('حذف ردیف', 'Delete Line'),
                          hidden: () => !!editingLine || saving, onClick: setRemoveLine, requiredAccess: 'edit', className: 'text-red-500' }
                      ] : []} />
                  </div>
                </div>
              </>}
      </div>
      <Modal isOpen={matrixOpen} onClose={() => setMatrixOpen(false)}
        title={t('ایجاد ردیف از ترکیب انتخابی', 'Create Lines from Selection')} language={language} width="max-w-lg">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {matrixFields.filter(field => activeTab === 'COST' || field.key !== 'centers').map(field => <LOVField key={field.key} formCode={formCode} size="sm"
              label={field.label} isRtl={isRtl} data={field.data} columns={field.columns} multiple
              selectedValues={matrix[field.key]} dropdownWidth={field.key === 'headings'
                ? 'min-w-[540px] max-w-[640px]' : 'min-w-[380px] max-w-[520px]'}
              displayValue={matrix[field.key].length ? `${matrix[field.key].length} ${t('انتخاب شده', 'selected')}` : ''}
              onChange={rows => setMatrix(current => ({ ...current, [field.key]: rows }))} />)}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">
              {t('ترکیب‌های انتخابی', 'Selected Combinations')}:
              {' '}{(activeTab === 'COST' ? matrix.centers.length : 1) * matrix.headings.length * Math.max(1, matrix.sources.length)}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setMatrixOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="primary" icon={Plus} onClick={addMatrix}>{t('ایجاد ردیف‌ها', 'Create Lines')}</Button>
            </div>
          </div>
        </div>
      </Modal>
      <Modal isOpen={!!statusTarget} onClose={() => setStatusTarget(null)}
        title={t('تأیید تغییر وضعیت', 'Confirm Status Change')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={statusLabel(statusTarget)}
          description={t('وضعیت برنامه بودجه تغییر کند؟', 'Change budget plan status?')}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setStatusTarget(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="primary" isLoading={saving} onClick={changeStatus}>{t('تأیید', 'Confirm')}</Button>
          </div>} />
      </Modal>
      <Modal isOpen={!!removeLine} onClose={() => setRemoveLine(null)}
        title={t('تأیید حذف ردیف', 'Confirm Line Deletion')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={t('حذف ردیف بودجه', 'Delete Budget Line')}
          description={t('این ردیف حذف شود؟', 'Delete this line?')}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRemoveLine(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="danger" isLoading={saving} onClick={deleteLine}>{t('حذف', 'Delete')}</Button>
          </div>} />
      </Modal>
      <Modal isOpen={bulkLineDelete.length > 0} onClose={() => setBulkLineDelete([])}
        title={t('تأیید حذف گروهی', 'Confirm Bulk Deletion')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={t('حذف ردیف‌های بودجه', 'Delete Budget Lines')}
          description={t(`${bulkLineDelete.length} ردیف انتخاب‌شده حذف شوند؟`, `Delete ${bulkLineDelete.length} selected lines?`)}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkLineDelete([])}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="danger" isLoading={saving} onClick={deleteSelectedLines}>{t('حذف', 'Delete')}</Button>
          </div>} />
      </Modal>
      <Modal isOpen={exitConfirm} onClose={() => setExitConfirm(false)}
        title={t('تغییرات ذخیره‌نشده', 'Unsaved Changes')} language={language} width="max-w-sm">
        <EmptyState icon={AlertTriangle} title={t('بازگشت به فهرست', 'Back to List')}
          description={t('تغییرات ذخیره‌نشده کنار گذاشته شوند؟', 'Discard unsaved changes?')}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setExitConfirm(false)}>{t('ماندن', 'Stay')}</Button>
            <Button size="sm" variant="danger" onClick={onBack}>{t('بازگشت', 'Back')}</Button>
          </div>} />
      </Modal>
      <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
        onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
    </div>;
  };

  BudgetPlanningDetails.formCode = 'BUD_PLANNING';
  window.BudgetPlanningDetails = BudgetPlanningDetails;
})();
