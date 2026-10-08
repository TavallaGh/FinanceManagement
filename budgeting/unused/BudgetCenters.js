/* Filename: budgeting/BudgetCenters.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { Landmark = FallbackIcon, Link2 = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon, AlertTriangle = FallbackIcon } = window.LucideIcons || {};

  const BudgetCenters = ({ language = 'fa', formCode = 'BudgetCenters' }) => {
    const Empty = () => null;
    const { Button = Empty, PageHeader = Empty, EmptyState = Empty, Skeleton = Empty, Badge = Empty } = window.DSCore || window.DesignSystem || {};
    const { TextField = Empty, SelectField = Empty, ToggleField = Empty, DatePicker = Empty } = window.DSForms || window.DesignSystem || {};
    const { DataGrid = Empty, AdvancedFilter = Empty } = window.DSGrid || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty } = window.DSFeedback || window.DesignSystem || {};
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;
    const requestIdRef = useRef(0);
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => securityCtx?.getActions(formCode) || { canView: true, canCreate: true, canEdit: true, canDelete: true }, [securityCtx, formCode]);

    const [centers, setCenters] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedCostCenterId, setSelectedCostCenterId] = useState('');
    const [loadError, setLoadError] = useState(false);
    const [gridState, setGridState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeCenter, setActiveCenter] = useState(null);
    const [editor, setEditor] = useState({ isOpen: false, data: {} });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(value => ({ ...value, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (recordId, action, details) => {
      if (!supabase) return;
      const { error } = await supabase.from('fm_record_logs').insert([{
        entity_type: 'مرکز بودجه', record_id: String(recordId), action,
        user_name: window.NavigationSystem?.currentUser?.name || 'system', details
      }]);
      if (error) console.error('Budget center audit log failed:', error);
    }, [supabase]);

    const loadAll = async (table, columns, orderField, ascending = true) => {
      const rows = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase.from(table).select(columns).order(orderField, { ascending }).order('id', { ascending: true }).range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) return rows;
      }
    };

    const normalizeDate = value => String(value || '').replaceAll('/', '-');
    const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
    const isCurrent = row => (!row.effectiveFrom || normalizeDate(row.effectiveFrom) <= today())
      && (!row.effectiveTo || normalizeDate(row.effectiveTo) >= today());
    const interval = row => ({ from: normalizeDate(row.effectiveFrom) || '0001-01-01', to: normalizeDate(row.effectiveTo) || '9999-12-31' });
    const ensureNoMembershipConflicts = async candidate => {
      if (!candidate.id || candidate.isActive === false || !isCurrent(candidate)) return;
      const [links, budgetRows] = await Promise.all([
        loadAll('fm_budget_center_assignments', 'id,budget_center_id,cost_benefit_center_id,is_active', 'id'),
        loadAll('fm_budget_centers', 'id,effective_from,effective_to,is_active', 'id')
      ]);
      const activeLinks = links.filter(link => link.is_active);
      const ownIds = new Set(activeLinks.filter(link => String(link.budget_center_id) === String(candidate.id)).map(link => String(link.cost_benefit_center_id)));
      const ownInterval = interval(candidate);
      const conflict = budgetRows.some(row => {
        if (String(row.id) === String(candidate.id) || !row.is_active) return false;
        const other = { effectiveFrom: row.effective_from, effectiveTo: row.effective_to };
        const otherInterval = interval(other);
        return isCurrent(other) && ownInterval.from <= otherInterval.to && otherInterval.from <= ownInterval.to
          && activeLinks.some(link => String(link.budget_center_id) === String(row.id) && ownIds.has(String(link.cost_benefit_center_id)));
      });
      if (conflict) throw new Error(t('ارتباط فعال این مرکز با مرکز بودجه معتبر دیگری تداخل دارد', 'An active assignment conflicts with another valid budget center'));
    };

    const fetchCenters = useCallback(async () => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setLoadError(false);
      try {
        if (!supabase) throw new Error('Supabase client is unavailable');
        const [budgetRows, costRows, assignmentRows] = await Promise.all([
          loadAll('fm_budget_centers', '*', 'created_at', false),
          loadAll('fm_cost_benefit_centers', 'id,code,title_fa,title_en,is_cost_center,is_benefit_center', 'id'),
          loadAll('fm_budget_center_assignments', 'id,budget_center_id,cost_benefit_center_id,is_active', 'id')
        ]);
        if (requestId === requestIdRef.current) {
          setCostCenters(costRows);
          setAssignments(assignmentRows);
          setCenters(budgetRows.map(row => ({
          id: row.id, code: row.code, titleFa: row.title_fa, titleEn: row.title_en,
          allocationType: row.allocation_type, effectiveFrom: row.effective_from,
          effectiveTo: row.effective_to, isActive: row.is_active
          })));
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setLoadError(true);
          showToast(t('خطا در دریافت مراکز بودجه', 'Failed to load budget centers'), 'error');
        }
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, [supabase, showToast, t]);

    useEffect(() => {
      if (access.canView) fetchCenters();
      return () => { requestIdRef.current += 1; };
    }, [access.canView, fetchCenters]);

    const openEditor = useCallback(async (row = null) => {
      if (row) {
        setEditor({ isOpen: true, data: { ...row } });
        return;
      }
      let code = '';
      if (window.AutoNumberingService) {
        try {
          const preview = await window.AutoNumberingService.previewNext('BUDGET_CENTER');
          code = typeof preview === 'string' ? preview : (preview?.formattedCode || '');
        } catch (error) {
          console.error('Budget center auto-number preview failed:', error);
        }
      }
      setEditor({ isOpen: true, data: { code, titleFa: '', titleEn: '', allocationType: 'SHARED', effectiveFrom: '', effectiveTo: '', isActive: true } });
    }, []);

    const saveCenter = async () => {
      const data = editor.data;
      const code = String(data.code || '').trim();
      const titleFa = String(data.titleFa || '').trim();
      if (!code || !titleFa) return showToast(t('کد و عنوان فارسی مرکز بودجه الزامی هستند', 'Budget center code and Persian title are required'), 'error');
      const from = String(data.effectiveFrom || '').replaceAll('/', '-');
      const to = String(data.effectiveTo || '').replaceAll('/', '-');
      if (from && to && from > to) return showToast(t('تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد', 'End date cannot be before start date'), 'error');
      if ((!data.id && !access.canCreate) || (data.id && !access.canEdit)) return;
      setIsLoading(true);
      try {
        await ensureNoMembershipConflicts(data);
        const original = data.id ? centers.find(item => String(item.id) === String(data.id)) : null;
        if (original && original.allocationType !== data.allocationType) {
          const { data: linkedRows, error: linkedError } = await supabase.from('fm_budget_center_assignments').select('id').eq('budget_center_id', data.id).limit(1);
          if (linkedError) throw linkedError;
          if (linkedRows?.length) throw new Error(t('بودجه برای تغییر نوع تخصیص، ابتدا ارتباط‌های مرکز هزینه/درآمد را حذف کنید.', 'Remove cost/benefit center assignments before changing the allocation type.'));
        }
        const payload = {
          code, title_fa: titleFa, title_en: String(data.titleEn || '').trim() || null,
          allocation_type: data.allocationType || 'SHARED', effective_from: data.effectiveFrom || null,
          effective_to: data.effectiveTo || null, is_active: data.isActive !== false
        };
        if (data.id) {
          const { error } = await supabase.from('fm_budget_centers').update(payload).eq('id', data.id);
          if (error) throw error;
          await logAction(data.id, 'update', `ویرایش مرکز بودجه: ${payload.code} - ${payload.title_fa}`);
        } else {
          const { data: inserted, error } = await supabase.from('fm_budget_centers').insert([payload]).select('id').single();
          if (error) throw error;
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('BUDGET_CENTER'); } catch (error) { console.error('Budget center auto-number consume failed:', error); }
          }
          await logAction(inserted.id, 'create', `ایجاد مرکز بودجه: ${payload.code} - ${payload.title_fa}`);
        }
        setEditor({ isOpen: false, data: {} });
        await fetchCenters();
        showToast(t('مرکز بودجه ذخیره شد', 'Budget center saved'));
      } catch (error) {
        showToast(error?.message || t('خطا در ذخیره مرکز بودجه', 'Failed to save budget center'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const toggleActive = async (row, value) => {
      if (!access.canEdit) return;
      try {
        if (value) await ensureNoMembershipConflicts({ ...row, isActive: true });
        const { error } = await supabase.from('fm_budget_centers').update({ is_active: value }).eq('id', row.id);
        if (error) throw error;
        await logAction(row.id, 'update', `${value ? 'فعال' : 'غیرفعال'} کردن مرکز بودجه`);
        await fetchCenters();
      } catch (error) {
        showToast(error?.message || t('تغییر وضعیت مرکز بودجه انجام نشد', 'Budget center status could not be changed'), 'error');
      }
    };

    const deleteCenter = async () => {
      const row = deleteConfirm.data;
      if (!row || !access.canDelete) return;
      try {
        const { error } = await supabase.from('fm_budget_centers').delete().eq('id', row.id);
        if (error) throw error;
        await logAction(row.id, 'delete', `حذف مرکز بودجه: ${row.code}`);
        setDeleteConfirm({ isOpen: false, data: null });
        await fetchCenters();
        showToast(t('مرکز بودجه حذف شد', 'Budget center deleted'));
      } catch (error) {
        setDeleteConfirm({ isOpen: false, data: null });
        showToast(t('حذف مرکز بودجه به دلیل وابستگی یا خطای دریافت انجام نشد', 'Budget center could not be deleted due to dependencies or a data error'), 'error');
      }
    };

    const filteredCenters = selectedCostCenterId ? centers.filter(row =>
      assignments.some(link => link.is_active
        && String(link.cost_benefit_center_id) === selectedCostCenterId
        && String(link.budget_center_id) === String(row.id))) : centers;
    const lovData = costCenters.map(row => ({ ...row,
      title: isRtl ? row.title_fa : (row.title_en || row.title_fa),
      displayLabel: `${row.code} - ${isRtl ? row.title_fa : (row.title_en || row.title_fa)}`,
      typeLabel: row.is_cost_center && row.is_benefit_center ? t('هزینه و درآمد', 'Cost & Benefit') : row.is_benefit_center ? t('درآمد', 'Benefit') : t('هزینه', 'Cost')
    }));
    const filterFields = [{ name: 'costCenter', label: t('مرکز هزینه/درآمد', 'Cost/Benefit Center'), type: 'lov',
      lovData, lovColumns: [
        { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
        { field: 'title', header_fa: 'عنوان مرکز', header_en: 'Center Title', width: '220px' },
        { field: 'typeLabel', header_fa: 'نوع', header_en: 'Type', width: '120px' }
      ], dropdownWidth: 'min-w-[460px] max-w-[600px]' }];
    const columns = [
      { field: 'code', header_fa: 'کد مرکز', header_en: 'Code', width: '110px' },
      { field: 'titleFa', header_fa: 'عنوان فارسی', header_en: 'Persian Title', width: '200px' },
      { field: 'titleEn', header_fa: 'عنوان انگلیسی', header_en: 'English Title', width: '180px' },
      { field: 'allocationType', header_fa: 'نوع تخصیص بودجه', header_en: 'Budget Allocation Type', width: '120px', render: value => <Badge variant={value === 'EXCLUSIVE' ? 'warning' : 'blue'}>{value === 'EXCLUSIVE' ? t('اختصاصی', 'Exclusive') : t('اشتراکی', 'Shared')}</Badge> },
      { field: 'effectiveFrom', header_fa: 'شروع موثر', header_en: 'Effective From', type: 'date', width: '120px' },
      { field: 'effectiveTo', header_fa: 'پایان موثر', header_en: 'Effective To', type: 'date', width: '120px' },
      { field: 'validity', header_fa: 'اعتبار تاریخ', header_en: 'Date Validity', width: '110px',
        render: (value, row) => <Badge variant={isCurrent(row) ? 'success' : 'danger'}>{isCurrent(row) ? t('معتبر', 'Valid') : t('نامعتبر', 'Invalid')}</Badge> },
      { field: 'isActive', header_fa: 'وضعیت', header_en: 'Status', type: 'toggle', width: '100px', onToggle: toggleActive }
    ];
    const withStatusAfterValidity = state => {
      if (!state) return state;
      const fields = (state.columnOrder || columns.map(column => column.field))
        .filter(field => field !== 'validity' && field !== 'isActive');
      return { ...state, columnOrder: [...fields, 'validity', 'isActive'],
        pinnedCols: (state.pinnedCols || []).filter(field => field !== 'validity' && field !== 'isActive') };
    };

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader title={t('مراکز بودجه', 'Budget Centers')} icon={Landmark} language={language}
          description={t('تعریف مراکز بودجه و نحوه تخصیص آن‌ها به مراکز هزینه و درآمد', 'Define budget centers and their cost/benefit center allocations')}
          breadcrumbs={[{ label: t('بودجه‌ریزی', 'Budgeting') }, { label: t('مراکز بودجه', 'Budget Centers') }]} />
        <div className="flex-1 min-h-0 mt-2 flex flex-col">
          <AdvancedFilter fields={filterFields} language={language}
            onSearch={values => { setSelectedCostCenterId(values.costCenter ? String(values.costCenter.id) : ''); setGridState(null); }}
            onClear={() => { setSelectedCostCenterId(''); setGridState(null); }} />
          <div className="flex-1 min-h-0">
          {isLoading && centers.length === 0 ? <div className="p-4 flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="12rem" /></div> : loadError ?
            <EmptyState title={t('دریافت اطلاعات انجام نشد', 'Could not load data')} action={<Button size="sm" onClick={fetchCenters}>{t('تلاش دوباره', 'Retry')}</Button>} /> : (
            <DataGrid key={selectedCostCenterId} data={filteredCenters} columns={columns} language={language} formCode={formCode}
              gridState={withStatusAfterValidity(gridState)} onGridStateChange={state => setGridState(withStatusAfterValidity(state))} hideImport={true} hideExport={true}
              onAdd={access.canCreate ? () => openEditor() : undefined} onRowDoubleClick={access.canEdit ? openEditor : undefined}
              actions={[
                { id: 'assign', icon: Link2, tooltip: t('اتصال مراکز هزینه/درآمد', 'Assign Cost/Benefit Centers'), onClick: setActiveCenter, className: 'text-indigo-600 dark:text-indigo-400' },
                { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: openEditor, requiredAccess: 'edit' },
                { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: row => setDeleteConfirm({ isOpen: true, data: row }), requiredAccess: 'delete', className: 'text-red-500' }
              ]} />
          )}
          </div>
        </div>

        {activeCenter && window.BudgetCentersDetails && (
          <window.BudgetCentersDetails center={activeCenter} onClose={() => { setActiveCenter(null); fetchCenters(); }} language={language} formCode={formCode} />
        )}

        <Modal isOpen={editor.isOpen} onClose={() => setEditor({ isOpen: false, data: {} })}
          title={editor.data.id ? t('ویرایش مرکز بودجه', 'Edit Budget Center') : t('مرکز بودجه جدید', 'New Budget Center')} language={language} width="max-w-2xl">
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField size="sm" formCode={formCode} label={t('کد مرکز بودجه', 'Budget Center Code')} required dir="ltr" isRtl={isRtl}
                value={editor.data.code || ''} onChange={event => setEditor(value => ({ ...value, data: { ...value.data, code: event.target.value } }))} />
              <SelectField size="sm" formCode={formCode} label={t('نوع تخصیص بودجه', 'Budget Allocation Type')} required isRtl={isRtl}
                value={editor.data.allocationType || 'SHARED'} options={[{ value: 'SHARED', label: t('اشتراکی', 'Shared') }, { value: 'EXCLUSIVE', label: t('اختصاصی', 'Exclusive') }]}
                onChange={event => setEditor(value => ({ ...value, data: { ...value.data, allocationType: event.target.value } }))} />
              <TextField size="sm" formCode={formCode} label={t('عنوان فارسی', 'Persian Title')} required isRtl={isRtl}
                value={editor.data.titleFa || ''} onChange={event => setEditor(value => ({ ...value, data: { ...value.data, titleFa: event.target.value } }))} />
              <TextField size="sm" formCode={formCode} label={t('عنوان انگلیسی', 'English Title')} dir="ltr" isRtl={isRtl}
                value={editor.data.titleEn || ''} onChange={event => setEditor(value => ({ ...value, data: { ...value.data, titleEn: event.target.value } }))} />
              <DatePicker size="sm" formCode={formCode} label={t('تاریخ شروع موثر', 'Effective From')} language={language} isRtl={isRtl}
                value={editor.data.effectiveFrom || ''} onChange={value => setEditor(state => ({ ...state, data: { ...state.data, effectiveFrom: value } }))} />
              <DatePicker size="sm" formCode={formCode} label={t('تاریخ پایان موثر', 'Effective To')} language={language} isRtl={isRtl}
                value={editor.data.effectiveTo || ''} onChange={value => setEditor(state => ({ ...state, data: { ...state.data, effectiveTo: value } }))} />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('تاریخ شروع خالی به معنی «از ابتدا» و تاریخ پایان خالی به معنی «بدون انقضا» است.', 'An empty start means “from the beginning”; an empty end means “no expiry”.')}</div>
            <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={editor.data.isActive !== false}
              onChange={value => setEditor(state => ({ ...state, data: { ...state.data, isActive: value } }))} isRtl={isRtl} />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button size="sm" variant="outline" onClick={() => setEditor({ isOpen: false, data: {} })}>{t('انصراف', 'Cancel')}</Button>
              {((editor.data.id && access.canEdit) || (!editor.data.id && access.canCreate)) && <Button size="sm" variant="primary" icon={Save} isLoading={isLoading} onClick={saveCenter}>{t('ذخیره', 'Save')}</Button>}
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, data: null })} title={t('تأیید حذف مرکز بودجه', 'Confirm Budget Center Deletion')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle} title={t('حذف مرکز بودجه', 'Delete Budget Center')}
            description={t(`آیا از حذف مرکز «${deleteConfirm.data?.titleFa || ''}» و تمام ارتباط‌های آن مطمئن هستید؟`, `Delete “${deleteConfirm.data?.titleEn || deleteConfirm.data?.titleFa || ''}” and all of its assignments?`)}
            action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setDeleteConfirm({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button><Button size="sm" variant="danger" onClick={deleteCenter}>{t('حذف', 'Delete')}</Button></div>} />
        </Modal>
        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
      </div>
    );
  };

  BudgetCenters.formCode = 'BudgetCenters';
  window.BudgetCenters = BudgetCenters;
})();
