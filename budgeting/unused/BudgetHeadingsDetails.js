/* Filename: budgeting/BudgetHeadingsDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { Network = FallbackIcon, Save = FallbackIcon, ArrowLeft = FallbackIcon, ArrowRight = FallbackIcon, RefreshCw = FallbackIcon, AlertTriangle = FallbackIcon, FileText = FallbackIcon, Plus = FallbackIcon, Trash2 = FallbackIcon } = window.LucideIcons || {};

  const BudgetHeadingsDetails = ({ structure, onBack, language = 'fa', formCode = 'BudgetHeadings' }) => {
    const Empty = () => null;
    const { Button = Empty, Tabs = Empty, EmptyState = Empty, Skeleton = Empty } = window.DSCore || window.DesignSystem || {};
    const { TextField = Empty, ToggleField = Empty, SelectField = Empty } = window.DSForms || window.DesignSystem || {};
    const { DataGrid = Empty, AdvancedFilter = Empty } = window.DSGrid || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty } = window.DSFeedback || window.DesignSystem || {};
    const { Tree = Empty } = window.DSTree || window.DesignSystem || {};
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;
    const requestIdRef = useRef(0);
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => securityCtx?.getActions(formCode) || { canView: true, canCreate: true, canEdit: true, canDelete: true }, [securityCtx, formCode]);

    const [headings, setHeadings] = useState([]);
    const [types, setTypes] = useState({ COST: [], INCOME: [] });
    const [treeFilters, setTreeFilters] = useState({});
    const [loadError, setLoadError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [typePicker, setTypePicker] = useState({ isOpen: false, selectedIds: [] });
    const [removeTypeIds, setRemoveTypeIds] = useState([]);
    const savingRef = useRef(false);
    const [selectedId, setSelectedId] = useState(null);
    const [formData, setFormData] = useState({});
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [isLoading, setIsLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(v => ({ ...v, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (recordId, action, details) => {
      if (!supabase) return;
      const { error } = await supabase.from('fm_record_logs').insert([{
        entity_type: 'سرفصل بودجه', record_id: String(recordId), action,
        user_name: window.NavigationSystem?.currentUser?.name || 'system', details
      }]);
      if (error) console.error('Budget heading audit log failed:', error);
    }, [supabase]);

    const fetchData = useCallback(async (retainId = null) => {
      if (!structure?.id || !access.canView) return;
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        if (!supabase) throw new Error('Supabase client is unavailable');
        const loadAll = async (table, columns, structureId) => {
          const rows = [];
          const pageSize = 100;
          for (let from = 0; ; from += pageSize) {
            let query = supabase.from(table).select(columns).order('id', { ascending: true });
            if (structureId != null) query = query.eq('structure_id', structureId);
            const { data, error } = await query.range(from, from + pageSize - 1);
            if (error) throw error;
            if (requestId !== requestIdRef.current) return [];
            rows.push(...(data || []));
            if (!data || data.length < pageSize) return rows;
          }
        };
        const [headingRows, costRows, incomeRows] = await Promise.all([
          loadAll('fm_budget_headings', 'id,parent_id,code,title_fa,title_en,is_active,heading_type,related_type_ids', structure.id),
          loadAll('fm_cost_types', 'id,parent_id,code,title_fa,title_en'),
          loadAll('fm_income_types', 'id,parent_id,code,title_fa,title_en')
        ]);
        if (requestId !== requestIdRef.current) return;
        const mappedRows = headingRows.map(row => ({
          id: row.id, parentId: row.parent_id, code: row.code, titleFa: row.title_fa,
          titleEn: row.title_en, headingType: row.heading_type || '',
          relatedTypeIds: row.related_type_ids || [], isActive: row.is_active,
          title: isRtl ? row.title_fa : (row.title_en || row.title_fa)
        })).sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
        const headingById = new Map(mappedRows.map(row => [String(row.id), row]));
        const mapped = mappedRows.map(row => {
          let parent = row.parentId == null ? null : headingById.get(String(row.parentId));
          const visited = new Set();
          let inheritedInactive = false;
          while (parent && !visited.has(String(parent.id))) {
            visited.add(String(parent.id));
            if (parent.isActive === false) { inheritedInactive = true; break; }
            parent = parent.parentId == null ? null : headingById.get(String(parent.parentId));
          }
          return { ...row, isEffectivelyActive: row.isActive !== false && !inheritedInactive };
        });
        const enrichTypes = rows => {
          const parentIds = new Set(rows.filter(row => row.parent_id != null).map(row => String(row.parent_id)));
          const byId = new Map(rows.map(row => [String(row.id), row]));
          return rows.map(row => {
            const path = [];
            const visited = new Set();
            let current = row;
            while (current && !visited.has(String(current.id))) {
              visited.add(String(current.id));
              path.unshift(isRtl ? current.title_fa : (current.title_en || current.title_fa));
              current = byId.get(String(current.parent_id));
            }
            return { ...row, title: isRtl ? row.title_fa : (row.title_en || row.title_fa),
              path: path.join(' / '), isLeaf: !parentIds.has(String(row.id)) };
          });
        };
        setHeadings(mapped);
        setTypes({ COST: enrichTypes(costRows), INCOME: enrichTypes(incomeRows) });
        setLoadError(false);
        if (retainId) {
          const retained = mapped.find(item => String(item.id) === String(retainId));
          if (retained) { setSelectedId(retained.id); setFormData({ ...retained }); setIsCreating(false); }
        }
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setLoadError(true);
          showToast(t('خطا در دریافت سرفصل‌ها یا انواع هزینه/درآمد؛ دریافت را دوباره انجام دهید.', 'Failed to load headings or cost/income types; retry loading.'), 'error');
        }
        return false;
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, [structure?.id, supabase, isRtl, showToast, t, access.canView]);

    useEffect(() => {
      if (access.canView) fetchData();
      return () => { requestIdRef.current += 1; };
    }, [access.canView, fetchData]);

    const selectNode = node => {
      if (savingRef.current || isLoading) return;
      setSelectedId(node.id); setFormData({ ...node }); setIsCreating(false); setActiveTab('details');
    };
    const getNodeDepth = parentId => {
      let depth = 0;
      let current = headings.find(node => String(node.id) === String(parentId));
      const visited = new Set();
      while (current && !visited.has(String(current.id))) {
        visited.add(String(current.id));
        depth += 1;
        current = headings.find(node => String(node.id) === String(current.parentId));
      }
      return depth;
    };
    const suggestNextCode = (parentId, depth) => {
      const parent = parentId == null ? null : headings.find(node => String(node.id) === String(parentId));
      const parentPrefix = parent?.code || '';
      const siblings = headings.filter(node => String(node.parentId || '') === String(parentId || ''));
      let maxSuffix = 0;
      siblings.forEach(node => {
        const code = String(node.code || '');
        if (!code.startsWith(parentPrefix)) return;
        const suffix = code.slice(parentPrefix.length);
        const number = Number.parseInt(suffix, 10);
        if (Number.isFinite(number)) maxSuffix = Math.max(maxSuffix, number);
      });
      const lengthField = ['len_group', 'len_general', 'len_subsidiary', 'len_detail'][depth - 1];
      const segmentLength = Math.max(1, Math.min(10, Number.parseInt(structure?.[lengthField], 10) || depth));
      return `${parentPrefix}${String(maxSuffix + 1).padStart(segmentLength, '0')}`;
    };
    const addRoot = () => {
      if (!access.canCreate || savingRef.current || isLoading || loadError) return;
      setSelectedId(null); setFormData({ parentId: null, code: suggestNextCode(null, 1), titleFa: '', titleEn: '', headingType: '', relatedTypeIds: [], isActive: true }); setIsCreating(true); setActiveTab('details');
    };
    const addChild = parent => {
      if (!access.canCreate || savingRef.current || isLoading || loadError) return;
      if ((parent.relatedTypeIds || []).length > 0)
        return showToast(t('ابتدا ارتباط‌های نوع هزینه و درآمد این سرفصل را حذف کنید', 'Remove this heading’s cost and income assignments before adding a child'), 'error');
      const depth = getNodeDepth(parent.id) + 1;
      if (depth > 4) return showToast(t('تعریف گره جدید فراتر از سطح چهارم مجاز نیست', 'Cannot add nodes beyond level 4'), 'error');
      setSelectedId(null); setFormData({ parentId: parent.id, code: suggestNextCode(parent.id, depth), titleFa: '', titleEn: '', headingType: parent.headingType || '', relatedTypeIds: [], isActive: true }); setIsCreating(true); setActiveTab('details');
    };

    const saveHeading = async () => {
      const code = String(formData.code || '').trim();
      const titleFa = String(formData.titleFa || '').trim();
      if (!code || !titleFa) return showToast(t('کد و عنوان فارسی الزامی هستند', 'Code and Persian title are required'), 'error');
      if (headings.some(item => String(item.id) !== String(formData.id) && item.code === code)) return showToast(t('کد سرفصل در این ساختار تکراری است', 'Heading code must be unique in this structure'), 'error');
      if (savingRef.current || isLoading || loadError) return;
      if (!['COST', 'INCOME'].includes(formData.headingType)) return showToast(t('نوع سرفصل را انتخاب کنید', 'Select the heading type'), 'error');
      const relatedTypeIds = [...new Set((formData.relatedTypeIds || []).map(String))];
      const availableIds = new Set((types[formData.headingType] || []).filter(row => row.isLeaf).map(row => String(row.id)));
      if (relatedTypeIds.some(id => !availableIds.has(id))) return showToast(t('فقط انواع بدون فرزند قابل اتصال هستند؛ ارتباط نامعتبر را پاک کنید.', 'Only leaf types can be assigned; remove invalid assignments.'), 'error');
      if ((isCreating && !access.canCreate) || (!isCreating && !access.canEdit)) return;
      savingRef.current = true;
      setIsSaving(true);
      try {
        const payload = {
          structure_id: structure.id, parent_id: formData.parentId || null, code,
          title_fa: titleFa, title_en: String(formData.titleEn || '').trim() || null,
          heading_type: formData.headingType, related_type_ids: relatedTypeIds, is_active: formData.isActive !== false
        };
        let id = formData.id;
        if (isCreating) {
          const { data, error } = await supabase.from('fm_budget_headings').insert([payload]).select('id').single();
          if (error) throw error;
          id = data.id;
          await logAction(id, 'create', `ایجاد سرفصل بودجه: ${code} - ${titleFa}; ${formData.headingType}: ${relatedTypeIds.join(', ')}`);
        } else {
          const { error } = await supabase.from('fm_budget_headings').update(payload).eq('id', selectedId).eq('structure_id', structure.id).select('id').single();
          if (error) throw error;
          await logAction(selectedId, 'update', `ویرایش سرفصل بودجه: ${code} - ${titleFa}; ${formData.headingType}: ${relatedTypeIds.join(', ')}`);
        }
        setSelectedId(id);
        setFormData(value => ({ ...value, id }));
        setIsCreating(false);
        if (await fetchData(id) !== false) showToast(t('سرفصل بودجه ذخیره شد', 'Budget heading saved'));
      } catch (error) {
        showToast(t('خطا در ذخیره سرفصل بودجه', 'Failed to save budget heading'), 'error');
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    };

    const requestDelete = node => {
      if (savingRef.current || isLoading || loadError || !access.canDelete) return;
      if (headings.some(item => String(item.parentId) === String(node.id))) return showToast(t('ابتدا زیرمجموعه‌های این سرفصل را حذف کنید', 'Delete child headings first'), 'error');
      setDeleteConfirm({ isOpen: true, data: node });
    };
    const deleteHeading = async () => {
      const row = deleteConfirm.data;
      if (!row || !access.canDelete) return;
      try {
        const { error } = await supabase.from('fm_budget_headings').delete().eq('id', row.id).eq('structure_id', structure.id);
        if (error) throw error;
        await logAction(row.id, 'delete', `حذف سرفصل بودجه: ${row.code}`);
        setDeleteConfirm({ isOpen: false, data: null }); setSelectedId(null); setFormData({}); setIsCreating(false);
        await fetchData();
        showToast(t('سرفصل حذف شد', 'Heading deleted'));
      } catch (error) {
        setDeleteConfirm({ isOpen: false, data: null });
        showToast(t('حذف سرفصل به دلیل وابستگی یا خطای دریافت انجام نشد', 'Heading could not be deleted due to dependencies or a data error'), 'error');
      }
    };

    const canSave = isCreating ? access.canCreate : access.canEdit;
    const editorDisabled = !canSave || isLoading || isSaving || loadError;
    const selectedHasChildren = !isCreating && headings.some(node => String(node.parentId) === String(formData.id));
    const selectedTypes = (formData.relatedTypeIds || []).map(id => {
      const row = (types[formData.headingType] || []).find(item => String(item.id) === String(id));
      return row || { id, code: id, title: t('ناموجود یا خارج از دسترسی', 'Missing or inaccessible') };
    });
    const assignedIds = new Set((formData.relatedTypeIds || []).map(String));
    const availableTypes = (types[formData.headingType] || []).filter(row => row.isLeaf && !assignedIds.has(String(row.id)));
    const typeColumns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
      { field: 'title', header_fa: 'عنوان', header_en: 'Title', width: '180px',
        render: value => <div className="whitespace-normal break-words leading-5">{value}</div> },
      { field: 'path', header_fa: 'مسیر', header_en: 'Path', width: '240px',
        render: value => <div className="whitespace-normal break-words leading-5 text-slate-500 dark:text-slate-400">{value || '-'}</div> }
    ];
    const filteredHeadings = useMemo(() => {
      const costTypeId = treeFilters.costType?.id;
      const incomeTypeId = treeFilters.incomeType?.id;
      if (!costTypeId && !incomeTypeId) return headings;
      const matchingIds = new Set();
      headings.forEach(row => {
        const assignedIds = new Set((row.relatedTypeIds || []).map(String));
        const matchesCost = costTypeId && row.headingType === 'COST' && assignedIds.has(String(costTypeId));
        const matchesIncome = incomeTypeId && row.headingType === 'INCOME' && assignedIds.has(String(incomeTypeId));
        if (matchesCost || matchesIncome) matchingIds.add(String(row.id));
      });
      [...matchingIds].forEach(id => {
        let current = headings.find(row => String(row.id) === id);
        const visited = new Set();
        while (current?.parentId != null && !visited.has(String(current.id))) {
          visited.add(String(current.id));
          matchingIds.add(String(current.parentId));
          current = headings.find(row => String(row.id) === String(current.parentId));
        }
      });
      return headings.filter(row => matchingIds.has(String(row.id)));
    }, [headings, treeFilters]);
    const treeFilterFields = [
      { name: 'costType', label: t('نوع هزینه', 'Cost Type'), type: 'lov', lovData: types.COST,
        lovColumns: [{ field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
          { field: 'title', header_fa: 'عنوان', header_en: 'Title' }] },
      { name: 'incomeType', label: t('نوع درآمد', 'Income Type'), type: 'lov', lovData: types.INCOME,
        lovColumns: [{ field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
          { field: 'title', header_fa: 'عنوان', header_en: 'Title' }] }
    ];
    const addSelectedTypes = () => {
      if (editorDisabled) return;
      if (selectedHasChildren) return showToast(t('نوع هزینه و درآمد فقط به سرفصل بدون زیرمجموعه قابل تخصیص است', 'Cost and income types can only be assigned to headings without children'), 'error');
      const availableIds = new Set(availableTypes.map(row => String(row.id)));
      const additions = typePicker.selectedIds.map(String).filter(id => availableIds.has(id));
      if (!additions.length) return;
      setFormData(value => ({ ...value, relatedTypeIds: [...new Set([...(value.relatedTypeIds || []).map(String), ...additions])] }));
      setTypePicker({ isOpen: false, selectedIds: [] });
    };
    const removeSelectedTypes = () => {
      if (editorDisabled) return;
      const removed = new Set(removeTypeIds.map(String));
      setFormData(value => ({ ...value, relatedTypeIds: (value.relatedTypeIds || []).filter(id => !removed.has(String(id))) }));
      setRemoveTypeIds([]);
    };
    const saveButton = canSave && (
      <Button size="sm" variant="primary" icon={Save} isLoading={isSaving} disabled={editorDisabled}
        onClick={saveHeading}>{t('ذخیره سرفصل و ارتباط‌ها', 'Save Heading and Assignments')}</Button>
    );
    const tabs = [
      { id: 'details', label: t('مشخصات سرفصل', 'Heading Details'), icon: FileText },
      { id: 'related_types', label: t('هزینه/درآمد مرتبط', 'Related Cost/Income'), icon: FileText,
        disabled: selectedHasChildren }
    ];

    if (!access.canView) return <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} />;

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="h-12 p-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="sm" icon={isRtl ? ArrowRight : ArrowLeft} disabled={isSaving} onClick={onBack}>{t('بازگشت به فهرست', 'Back')}</Button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t('طراحی درخت:', 'Tree Design:')} <span className="text-indigo-600 dark:text-indigo-400">{structure?.title}</span></h2>
            </div>
            <Button variant="ghost" size="sm" icon={RefreshCw} isLoading={isLoading} disabled={isSaving || !access.canView} onClick={() => fetchData(selectedId)} className="h-8 w-8 px-0" />
          </div>

          <div className="px-3 pt-2 shrink-0">
            <AdvancedFilter fields={treeFilterFields} language={language} initialValues={treeFilters}
              onFilter={setTreeFilters} onSearch={setTreeFilters} onClear={() => setTreeFilters({})} />
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3">
            <div className="lg:col-span-5 min-h-[260px] lg:min-h-0">
              {isLoading && headings.length === 0 ? (
                <div className="p-4 flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="14rem" /></div>
              ) : filteredHeadings.length === 0 ? (
                <EmptyState icon={Network} title={t('سرفصلی با این فیلتر پیدا نشد', 'No headings match these filters')} />
              ) : (
                <Tree data={filteredHeadings} idField="id" parentField="parentId" displayField="title" secondaryField="code" activeField="isEffectivelyActive"
                  selectedId={selectedId} onSelect={selectNode} onAddRoot={addRoot} onAddChild={addChild} onDelete={requestDelete}
                  language={language} formCode={formCode} />
              )}
            </div>
            <div className="lg:col-span-7 min-h-0 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-auto custom-scrollbar">
              {(selectedId || isCreating) ? (
                <div className="p-4 h-full flex flex-col">
                  <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
                  {activeTab === 'details' ? (
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TextField size="sm" formCode={formCode} disabled={editorDisabled} label={t('کد سرفصل', 'Heading Code')} required dir="ltr" isRtl={isRtl}
                          value={formData.code || ''} onChange={e => setFormData(v => ({ ...v, code: e.target.value }))} />
                        <SelectField size="sm" formCode={formCode} label={t('نوع سرفصل', 'Heading Type')} required
                          isRtl={isRtl} disabled={editorDisabled} value={formData.headingType || ''}
                          placeholder={t('انتخاب نوع سرفصل', 'Select heading type')}
                          options={[{ value: 'COST', label: t('هزینه', 'Cost') }, { value: 'INCOME', label: t('درآمد', 'Income') }]}
                          onChange={e => {
                            const headingType = e.target.value;
                            if (headingType === formData.headingType) return;
                            if (formData.relatedTypeIds?.length) {
                              showToast(t('پیش از تغییر نوع، ارتباط‌های تب هزینه/درآمد مرتبط را پاک کنید.', 'Clear related assignments before changing the heading type.'), 'error');
                              return;
                            }
                            setFormData(v => ({ ...v, headingType }));
                          }} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TextField size="sm" formCode={formCode} disabled={editorDisabled} label={t('عنوان فارسی', 'Persian Title')} required isRtl={isRtl}
                          value={formData.titleFa || ''} onChange={e => setFormData(v => ({ ...v, titleFa: e.target.value }))} />
                        <TextField size="sm" formCode={formCode} disabled={editorDisabled} label={t('عنوان انگلیسی', 'English Title')} dir="ltr" isRtl={isRtl}
                          value={formData.titleEn || ''} onChange={e => setFormData(v => ({ ...v, titleEn: e.target.value }))} />
                      </div>
                      <ToggleField formCode={formCode} disabled={editorDisabled} label={t('فعال', 'Active')} checked={formData.isActive !== false}
                        onChange={value => setFormData(v => ({ ...v, isActive: value }))} isRtl={isRtl} />
                      <div className="mt-auto flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => { setSelectedId(null); setFormData({}); setIsCreating(false); }}>{t('انصراف', 'Cancel')}</Button>
                        {saveButton}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col gap-3">
                      <div className="flex-1 min-h-[280px]">
                        <DataGrid key={`assignments-${selectedId || 'new'}-${formData.headingType}`}
                          data={selectedTypes} columns={typeColumns} language={language} formCode={formCode}
                          hideImport hideExport actionWidth="60px" selectable={!editorDisabled}
                          toolbarContent={canSave && <Button size="sm" variant="primary" icon={Plus}
                            disabled={editorDisabled || selectedHasChildren || !formData.headingType || availableTypes.length === 0}
                            onClick={() => setTypePicker({ isOpen: true, selectedIds: [] })}>
                            {t('افزودن هزینه/درآمد', 'Add Cost/Income')}
                          </Button>}
                          actions={editorDisabled ? [] : [{ id: 'unassign', icon: Trash2,
                            tooltip: t('حذف ارتباط', 'Remove Assignment'), className: 'text-red-500',
                            onClick: row => setRemoveTypeIds([row.id]) }]}
                          bulkActions={editorDisabled ? [] : [{ id: 'unassign_selected', icon: Trash2,
                            label: t('حذف ارتباط‌های انتخاب‌شده', 'Remove Selected Assignments'),
                            onClick: ids => setRemoveTypeIds(ids) }]} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState icon={Network} title={t('یک سرفصل را انتخاب کنید', 'Select a heading')}
                  description={t('برای مشاهده مشخصات، یک سرفصل را از درخت انتخاب کنید یا سرفصل جدید بسازید.', 'Select a tree node to view its details or create a new heading.')} />
              )}
            </div>
          </div>
        </div>

        <Modal isOpen={typePicker.isOpen} onClose={() => setTypePicker({ isOpen: false, selectedIds: [] })}
          title={formData.headingType === 'INCOME' ? t('افزودن انواع درآمد', 'Add Income Types') : t('افزودن انواع هزینه', 'Add Cost Types')}
          language={language} width="max-w-4xl">
          <div className="p-4 flex flex-col gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('موارد موردنظر را انتخاب کنید؛ فقط انواع بدون فرزند که قبلاً متصل نشده‌اند نمایش داده می‌شوند.', 'Select the types to add. Only unassigned leaf types are shown.')}
            </p>
            <div className="h-[50vh] min-h-[280px]">
              <DataGrid key={`picker-${selectedId || 'new'}-${formData.headingType}-${typePicker.isOpen}`}
                data={availableTypes} columns={typeColumns} language={language} formCode={formCode}
                selectable={!editorDisabled} hideImport hideExport selectedRowIds={typePicker.selectedIds}
                onSelectionChange={ids => setTypePicker(value => ({ ...value, selectedIds: ids }))} />
            </div>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t(`${typePicker.selectedIds.length.toLocaleString('fa-IR')} مورد انتخاب شده`, `${typePicker.selectedIds.length} selected`)}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setTypePicker({ isOpen: false, selectedIds: [] })}>{t('انصراف', 'Cancel')}</Button>
                <Button size="sm" variant="primary" icon={Plus} disabled={editorDisabled || !typePicker.selectedIds.length}
                  onClick={addSelectedTypes}>{t('افزودن انتخاب‌شده‌ها', 'Add Selected')}</Button>
              </div>
            </div>
          </div>
        </Modal>
        <Modal isOpen={removeTypeIds.length > 0} onClose={() => setRemoveTypeIds([])}
          title={t('حذف ارتباط هزینه/درآمد', 'Remove Cost/Income Assignments')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle} title={t('حذف ارتباط‌های انتخاب‌شده', 'Remove Selected Assignments')}
            description={t(`حذف ${removeTypeIds.length.toLocaleString('fa-IR')} ارتباط از این سرفصل؟ تغییرات با ذخیره در تب مشخصات سرفصل ثبت می‌شوند.`, `Remove ${removeTypeIds.length} assignments from this heading? Changes take effect after saving in the Heading Details tab.`)}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRemoveTypeIds([])}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="danger" disabled={editorDisabled} onClick={removeSelectedTypes}>{t('حذف ارتباط', 'Remove Assignment')}</Button>
            </div>} />
        </Modal>
        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, data: null })}
          title={t('تأیید حذف سرفصل', 'Confirm Heading Deletion')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle} title={t('حذف سرفصل بودجه', 'Delete Budget Heading')}
            description={t(`آیا از حذف سرفصل «${deleteConfirm.data?.titleFa || ''}» مطمئن هستید؟`, `Delete heading “${deleteConfirm.data?.titleEn || deleteConfirm.data?.titleFa || ''}”?`)}
            action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setDeleteConfirm({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button><Button size="sm" variant="danger" onClick={deleteHeading}>{t('حذف', 'Delete')}</Button></div>} />
        </Modal>
        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, isVisible: false }))} />
      </div>
    );
  };

  BudgetHeadingsDetails.formCode = 'BudgetHeadings';
  window.BudgetHeadingsDetails = BudgetHeadingsDetails;
})();
