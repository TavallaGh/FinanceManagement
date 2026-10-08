/* Filename: budgeting/BudgetCentersDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { RefreshCw = FallbackIcon, Save = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, X = FallbackIcon, Link2 = FallbackIcon } = window.LucideIcons || {};
  const MIN_DATE = '0001-01-01';
  const MAX_DATE = '9999-12-31';

  const BudgetCentersDetails = ({ center, onClose, language = 'fa', formCode = 'BudgetCenters' }) => {
    const Empty = () => null;
    const { Button = Empty, EmptyState = Empty, Skeleton = Empty, Badge = Empty } = window.DSCore || window.DesignSystem || {};
    const { TextField = Empty, ToggleField = Empty } = window.DSForms || window.DesignSystem || {};
    const { DataGrid = Empty, LOVField = Empty } = window.DSGrid || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty, Alert = Empty } = window.DSFeedback || window.DesignSystem || {};
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;
    const requestIdRef = useRef(0);
    const savingRef = useRef(false);
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => securityCtx?.getActions(formCode) || { canView: true, canCreate: true, canEdit: true, canDelete: true }, [securityCtx, formCode]);

    const [assignments, setAssignments] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [gridState, setGridState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [editor, setEditor] = useState({ isOpen: false, data: {} });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(value => ({ ...value, isVisible: false })), 3500);
    }, []);
    const normalizeDate = value => String(value || '').replaceAll('/', '-');
    const intervalFor = budgetCenter => ({
      from: normalizeDate(budgetCenter?.effective_from || budgetCenter?.effectiveFrom) || MIN_DATE,
      to: normalizeDate(budgetCenter?.effective_to || budgetCenter?.effectiveTo) || MAX_DATE
    });
    const intervalsOverlap = (left, right) => left.from <= right.to && right.from <= left.to;
    const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
    const isCurrent = budgetCenter => {
      const interval = intervalFor(budgetCenter);
      const date = today();
      return !!budgetCenter && budgetCenter.is_active !== false && budgetCenter.isActive !== false && interval.from <= date && date <= interval.to;
    };

    const logAction = useCallback(async (recordId, action, details) => {
      if (!supabase) return;
      const { error } = await supabase.from('fm_record_logs').insert([{
        entity_type: 'اتصال مرکز بودجه', record_id: String(recordId), action,
        user_name: window.NavigationSystem?.currentUser?.name || 'system', details
      }]);
      if (error) console.error('Budget center assignment audit log failed:', error);
    }, [supabase]);

    const loadAll = async (table, columns, orderField, filterColumn, filterValue) => {
      const pageSize = 1000;
      const rows = [];
      for (let from = 0; ; from += pageSize) {
        let query = supabase.from(table).select(columns).order(orderField, { ascending: true }).range(from, from + pageSize - 1);
        if (filterColumn) query = query.eq(filterColumn, filterValue);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) return rows;
      }
    };

    const loadConflictData = async () => {
      const [links, budgets] = await Promise.all([
        loadAll('fm_budget_center_assignments', '*', 'id'),
        loadAll('fm_budget_centers', 'id, effective_from, effective_to, is_active', 'id')
      ]);
      return { links, budgets };
    };

    const fetchData = useCallback(async () => {
      if (!center?.id) return;
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setLoadError(false);
      try {
        if (!supabase) throw new Error('Supabase client is unavailable');
        const [assignmentResult, costCenterResult] = await Promise.all([
          loadAll('fm_budget_center_assignments', '*', 'id'),
          loadAll('fm_cost_benefit_centers', 'id, code, title_fa, title_en, is_cost_center, is_benefit_center, is_active', 'id')
        ]);
        if (requestId !== requestIdRef.current) return;
        const costs = costCenterResult;
        const costById = new Map(costs.map(item => [String(item.id), item]));
        const all = assignmentResult;
        setCostCenters(costs);
        setAllAssignments(all);
        setAssignments(all.filter(item => String(item.budget_center_id) === String(center.id)).map(item => {
          const linked = costById.get(String(item.cost_benefit_center_id));
          return {
            id: item.id, costCenterId: item.cost_benefit_center_id, code: linked?.code || '-',
            titleFa: linked?.title_fa || '-', titleEn: linked?.title_en || '',
            centerType: linked?.is_cost_center && linked?.is_benefit_center ? 'BOTH' : linked?.is_benefit_center ? 'BENEFIT' : 'COST',
            allocationPercentage: item.allocation_percentage, isActive: item.is_active
          };
        }));
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setLoadError(true);
          showToast(t('خطا در دریافت ارتباط‌های مرکز بودجه', 'Failed to load budget center assignments'), 'error');
        }
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, [center?.id, supabase, showToast, t]);

    useEffect(() => {
      if (access.canView) fetchData();
      return () => { requestIdRef.current += 1; };
    }, [access.canView, fetchData]);

    const openEditor = row => {
      if (editor.isOpen || isLoading || loadError) return;
      setEditor({ isOpen: true, data: row ? { ...row } : { costCenterId: '', allocationPercentage: '', isActive: true } });
    };
    const cancelEditor = () => setEditor({ isOpen: false, data: {} });
    const closeDetails = () => {
      if (savingRef.current) return;
      if (deleteConfirm.isOpen) return setDeleteConfirm({ isOpen: false, data: null });
      if (editor.isOpen) return cancelEditor();
      onClose();
    };

    const validateExclusiveTotal = (proposed, links = allAssignments) => {
      if (center.allocationType !== 'EXCLUSIVE' || !proposed.isActive) return true;
      const allocated = links
        .filter(item => String(item.budget_center_id) === String(center.id) && String(item.id) !== String(proposed.id || '') && item.is_active)
        .reduce((sum, item) => sum + Number(item.allocation_percentage || 0), Number(proposed.allocationPercentage || 0));
      return allocated <= 100.000001;
    };

    const hasConflictingAssignment = (proposed, links, budgets, currentCenter) => {
      if (!isCurrent(currentCenter) || !proposed.isActive) return false;
      const proposedInterval = intervalFor(currentCenter);
      return links.some(item => {
        if (String(item.id) === String(proposed.id || '') || String(item.cost_benefit_center_id) !== String(proposed.costCenterId) || !item.is_active) return false;
        if (String(item.budget_center_id) === String(center.id)) return true;
        const otherCenter = budgets.find(value => String(value.id) === String(item.budget_center_id));
        return isCurrent(otherCenter) && intervalsOverlap(proposedInterval, intervalFor(otherCenter));
      });
    };

    const saveAssignment = async () => {
      const data = editor.data;
      if (savingRef.current) return;
      if (!data.costCenterId) return showToast(t('انتخاب مرکز هزینه/درآمد الزامی است', 'Selecting a cost/benefit center is required'), 'error');
      if (loadError) return showToast(t('ابتدا اطلاعات ارتباط‌ها را دوباره دریافت کنید', 'Reload assignment data first'), 'error');
      if (assignments.some(row => String(row.costCenterId) === String(data.costCenterId) && String(row.id) !== String(data.id || '')))
        return showToast(t('این مرکز هزینه/درآمد قبلاً به مرکز بودجه متصل شده است', 'This cost/benefit center is already assigned to the budget center'), 'error');
      if (center.allocationType === 'EXCLUSIVE') {
        const percentage = Number(data.allocationPercentage);
        if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) return showToast(t('درصد تخصیص برای مرکز اختصاصی باید بیشتر از صفر و حداکثر ۱۰۰ باشد', 'Exclusive allocation percentage must be greater than zero and at most 100'), 'error');
      }
      if ((!data.id && !access.canCreate) || (data.id && !access.canEdit)) return;
      savingRef.current = true;
      setIsLoading(true);
      try {
        const { links, budgets } = await loadConflictData();
        const currentCenter = budgets.find(item => String(item.id) === String(center.id));
        if (!isCurrent(currentCenter)) throw new Error(t('مرکز بودجه باید فعال و در بازه معتبر باشد', 'Budget center must be active and currently valid'));
        if (hasConflictingAssignment(data, links, budgets, currentCenter)) throw new Error(t('این مرکز هزینه/درآمد در بازه مرکز بودجه به مرکز فعال و معتبر دیگری متصل است', 'This cost/benefit center is assigned to another active, valid budget center in this period'));
        if (!validateExclusiveTotal(data, links)) throw new Error(t('مجموع درصد تخصیص نمی‌تواند از ۱۰۰ بیشتر شود', 'The allocation total cannot exceed 100'));
        const payload = {
          budget_center_id: center.id, cost_benefit_center_id: data.costCenterId,
          allocation_percentage: center.allocationType === 'EXCLUSIVE' ? Number(data.allocationPercentage) : null,
          is_active: data.isActive !== false
        };
        if (data.id) {
          const { error } = await supabase.from('fm_budget_center_assignments').update(payload).eq('id', data.id).eq('budget_center_id', center.id);
          if (error) throw error;
          await logAction(data.id, 'update', `ویرایش اتصال مرکز هزینه/درآمد: ${data.code || data.costCenterId}`);
        } else {
          const { data: inserted, error } = await supabase.from('fm_budget_center_assignments').insert([payload]).select('id').single();
          if (error) throw error;
          await logAction(inserted.id, 'create', `اتصال مرکز هزینه/درآمد: ${data.costCenterId}`);
        }
        cancelEditor();
        await fetchData();
        showToast(t('ارتباط مرکز هزینه/درآمد ذخیره شد', 'Cost/benefit center assignment saved'));
      } catch (error) {
        showToast(error?.message || t('خطا در ذخیره ارتباط', 'Failed to save assignment'), 'error');
      } finally {
        savingRef.current = false;
        setIsLoading(false);
      }
    };

    const deleteAssignment = async () => {
      const row = deleteConfirm.data;
      if (!row || !access.canDelete) return;
      try {
        const { error } = await supabase.from('fm_budget_center_assignments').delete().eq('id', row.id).eq('budget_center_id', center.id);
        if (error) throw error;
        await logAction(row.id, 'delete', `حذف اتصال مرکز هزینه/درآمد: ${row.code}`);
        setDeleteConfirm({ isOpen: false, data: null });
        await fetchData();
        showToast(t('ارتباط حذف شد', 'Assignment deleted'));
      } catch (error) {
        setDeleteConfirm({ isOpen: false, data: null });
        showToast(t('حذف ارتباط انجام نشد', 'Assignment could not be deleted'), 'error');
      }
    };

    const selectedCostCenter = costCenters.find(item => String(item.id) === String(editor.data.costCenterId || ''));
    const availableCostCenters = costCenters.filter(item => item.is_active || String(item.id) === String(editor.data.costCenterId || '')).map(item => ({
      ...item,
      title: isRtl ? item.title_fa : (item.title_en || item.title_fa),
      typeLabel: item.is_cost_center && item.is_benefit_center ? t('هزینه و درآمد', 'Cost & Benefit') : item.is_benefit_center ? t('درآمد', 'Benefit') : t('هزینه', 'Cost')
    }));
    const lovColumns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
      { field: 'title', header_fa: 'عنوان مرکز', header_en: 'Center Title', width: '220px' },
      { field: 'typeLabel', header_fa: 'نوع مرکز', header_en: 'Center Type', width: '120px' }
    ];
    const editingRow = row => editor.isOpen && (editor.data.id
      ? String(editor.data.id) === String(row.id) : row._isNew);
    const gridRows = editor.isOpen && !editor.data.id
      ? [{ ...editor.data, id: 'draft:assignment', _isNew: true }, ...assignments] : assignments;
    const columns = [
      { field: 'code', header_fa: 'کد مرکز', header_en: 'Center Code', width: '90px', render: (value, row) => editingRow(row) ? '-' : value },
      { field: isRtl ? 'titleFa' : 'titleEn', header_fa: 'عنوان مرکز هزینه/درآمد', header_en: 'Cost/Benefit Center', width: '200px', render: (value, row) => editingRow(row)
        ? <div onClick={event => event.stopPropagation()}>
            <LOVField size="sm" formCode={formCode} isRtl={isRtl} required
              data={availableCostCenters} columns={lovColumns} dropdownWidth="min-w-[460px] max-w-[75vw]"
              displayValue={selectedCostCenter ? `${selectedCostCenter.code} - ${isRtl ? selectedCostCenter.title_fa : (selectedCostCenter.title_en || selectedCostCenter.title_fa)}` : ''}
              onChange={item => setEditor(current => ({ ...current, data: { ...current.data, costCenterId: item?.id || '' } }))} />
          </div> : value || row.titleFa },
      { field: 'centerType', header_fa: 'نوع', header_en: 'Type', width: '90px', render: (value, row) => editingRow(row) && selectedCostCenter
        ? selectedCostCenter.is_cost_center && selectedCostCenter.is_benefit_center ? t('هزینه و درآمد', 'Both') : selectedCostCenter.is_benefit_center ? t('درآمد', 'Benefit') : t('هزینه', 'Cost')
        : value === 'BOTH' ? t('هزینه و درآمد', 'Both') : value === 'BENEFIT' ? t('درآمد', 'Benefit') : t('هزینه', 'Cost') },
      { field: 'allocationPercentage', header_fa: 'درصد تخصیص', header_en: 'Allocation %', width: '100px', render: (value, row) => center.allocationType === 'SHARED' ? '-' : editingRow(row)
        ? <div onClick={event => event.stopPropagation()}><TextField size="sm" type="number" min="0.01" max="100" step="0.01" formCode={formCode}
            required dir="ltr" isRtl={isRtl} value={editor.data.allocationPercentage ?? ''}
            onChange={event => setEditor(current => ({ ...current, data: { ...current.data, allocationPercentage: event.target.value } }))} /></div>
        : `${Number(value || 0).toLocaleString(isRtl ? 'fa-IR' : 'en-US')}٪` },
      { field: 'isActive', header_fa: 'وضعیت', header_en: 'Status', width: '80px', render: (value, row) => editingRow(row)
        ? <div onClick={event => event.stopPropagation()}><ToggleField formCode={formCode} checked={editor.data.isActive !== false} isRtl={isRtl}
            onChange={active => setEditor(current => ({ ...current, data: { ...current.data, isActive: active } }))} /></div>
        : <Badge variant={value !== false ? 'success' : 'gray'}>{value !== false ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}</Badge> }
    ];
    const totalAllocation = allAssignments
      .filter(item => String(item.budget_center_id) === String(center.id) && item.is_active)
      .reduce((sum, item) => sum + Number(item.allocation_percentage || 0), 0);

    return (
      <>
      <Modal isOpen={true} onClose={closeDetails}
        title={t(`اتصال مراکز هزینه/درآمد به «${center?.titleFa || ''}»`, `Cost/Benefit Assignments — ${center?.titleEn || center?.titleFa || ''}`)}
        language={language} width="max-w-5xl" showMaximize={false}>
      <div className="h-[72vh] min-h-[420px] flex flex-col font-sans p-3" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="h-12 p-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 size={16} className="text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t('ارتباط‌های مرکز هزینه/درآمد', 'Cost/Benefit Center Assignments')}</h2>
              <Badge variant={center.allocationType === 'EXCLUSIVE' ? 'warning' : 'blue'}>{center.allocationType === 'EXCLUSIVE' ? t('اختصاصی', 'Exclusive') : t('اشتراکی', 'Shared')}</Badge>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {center.allocationType === 'EXCLUSIVE' && <div className="flex items-baseline gap-2 text-slate-600 dark:text-slate-300" aria-label={t('مجموع درصد تخصیص بودجه', 'Total budget allocation percentage')}>
                <span className="text-xs">{t('مجموع درصد تخصیص:', 'Total allocation:')}</span>
                <strong className={`text-xl tabular-nums ${totalAllocation > 100 ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{totalAllocation.toLocaleString(isRtl ? 'fa-IR' : 'en-US')}{isRtl ? '٪' : '%'}</strong>
              </div>}
              <Button variant="ghost" size="sm" icon={RefreshCw} isLoading={isLoading} onClick={fetchData} className="h-8 w-8 px-0" />
            </div>
          </div>
          <div className="flex-1 min-h-0 p-3">
            {isLoading && assignments.length === 0 ? <div className="p-4 flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="12rem" /></div> : loadError ?
              <EmptyState title={t('دریافت ارتباط‌ها انجام نشد', 'Could not load assignments')} action={<Button size="sm" onClick={fetchData}>{t('تلاش دوباره', 'Retry')}</Button>} /> : (
              <DataGrid key={editor.isOpen && !editor.data.id ? 'new-assignment' : 'assignments'} data={gridRows} columns={columns} language={language} formCode={formCode} gridState={gridState} onGridStateChange={setGridState}
                hideImport={true} hideExport={true} onAdd={access.canCreate && !editor.isOpen ? () => openEditor() : undefined} onRowDoubleClick={access.canEdit ? openEditor : undefined}
                actions={[
                  { id: 'save', icon: Save, tooltip: t('ذخیره ردیف', 'Save Row'), hidden: row => !editingRow(row), onClick: saveAssignment },
                  { id: 'cancel', icon: X, tooltip: t('انصراف', 'Cancel'), hidden: row => !editingRow(row), onClick: cancelEditor },
                  { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit'), hidden: row => !!editor.isOpen || row._isNew, onClick: openEditor, requiredAccess: 'edit' },
                  { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), hidden: row => !!editor.isOpen || row._isNew, onClick: row => setDeleteConfirm({ isOpen: true, data: row }), requiredAccess: 'delete', className: 'text-red-500' }
                ]} />
            )}
          </div>
          {deleteConfirm.isOpen && <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex-1"><Alert type="warning" message={t(`ارتباط مرکز «${deleteConfirm.data?.titleFa || ''}» حذف شود؟`, `Delete the assignment for “${deleteConfirm.data?.titleEn || deleteConfirm.data?.titleFa || ''}”?`)} /></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="danger" onClick={deleteAssignment}>{t('حذف', 'Delete')}</Button>
            </div>
          </div>}
        </div>
      </div>
      </Modal>
        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
      </>
    );
  };

  BudgetCentersDetails.formCode = 'BudgetCenters';
  window.BudgetCentersDetails = BudgetCentersDetails;
})();
