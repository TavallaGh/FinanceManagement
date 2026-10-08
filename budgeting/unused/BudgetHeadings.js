/* Filename: budgeting/BudgetHeadings.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { Network = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon, AlertTriangle = FallbackIcon } = window.LucideIcons || {};

  const BudgetHeadings = ({ language = 'fa', formCode = 'BudgetHeadings' }) => {
    const Empty = () => null;
    const { Button = Empty, PageHeader = Empty, EmptyState = Empty, Skeleton = Empty } = window.DSCore || window.DesignSystem || {};
    const { TextField = Empty, ToggleField = Empty, DatePicker = Empty } = window.DSForms || window.DesignSystem || {};
    const { DataGrid = Empty } = window.DSGrid || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty } = window.DSFeedback || window.DesignSystem || {};
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;
    const requestIdRef = useRef(0);

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => securityCtx?.getActions(formCode) || {
      canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true
    }, [securityCtx, formCode]);

    const [structures, setStructures] = useState([]);
    const [gridState, setGridState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [activeStructure, setActiveStructure] = useState(null);
    const [editor, setEditor] = useState({ isOpen: false, data: {} });
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

    const fetchStructures = useCallback(async () => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        if (!supabase) throw new Error('Supabase client is unavailable');
        const { data, error } = await supabase.from('fm_budget_heading_structures')
          .select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (requestId === requestIdRef.current) setStructures(data || []);
      } catch (error) {
        if (requestId === requestIdRef.current) showToast(t('خطا در دریافت ساختارهای سرفصل بودجه', 'Failed to load budget heading structures'), 'error');
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, [supabase, showToast, t]);

    useEffect(() => {
      if (access.canView && viewMode === 'list') fetchStructures();
      return () => { requestIdRef.current += 1; };
    }, [access.canView, viewMode, fetchStructures]);

    const openEditor = (row = null) => setEditor({
      isOpen: true,
      data: row ? { ...row } : { title: '', effective_from: '', effective_to: '', is_active: true }
    });

    const saveStructure = async () => {
      const data = editor.data;
      if (!String(data.title || '').trim()) return showToast(t('عنوان ساختار الزامی است', 'Structure title is required'), 'error');
      if (data.effective_from && data.effective_to && String(data.effective_from).replaceAll('/', '-') > String(data.effective_to).replaceAll('/', '-')) {
        return showToast(t('تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد', 'End date cannot be before start date'), 'error');
      }
      const codeLengths = ['len_group', 'len_general', 'len_subsidiary', 'len_detail'].map((field, index) =>
        Number.parseInt(data[field] || [1, 2, 3, 4][index], 10));
      if (codeLengths.some(length => !Number.isInteger(length) || length < 1 || length > 10))
        return showToast(t('طول هر قطعه کد باید بین ۱ تا ۱۰ رقم باشد', 'Each code segment length must be between 1 and 10'), 'error');
      if ((!data.id && !access.canCreate) || (data.id && !access.canEdit)) return;

      setIsLoading(true);
      try {
        const payload = {
          title: String(data.title).trim(),
          effective_from: data.effective_from || null,
          effective_to: data.effective_to || null,
          len_group: codeLengths[0],
          len_general: codeLengths[1],
          len_subsidiary: codeLengths[2],
          len_detail: codeLengths[3],
          is_active: data.is_active !== false
        };
        if (data.id) {
          const { error } = await supabase.from('fm_budget_heading_structures').update(payload).eq('id', data.id);
          if (error) throw error;
          await logAction(data.id, 'update', `ویرایش ساختار سرفصل بودجه: ${payload.title}`);
        } else {
          const { data: inserted, error } = await supabase.from('fm_budget_heading_structures').insert([payload]).select('id').single();
          if (error) throw error;
          await logAction(inserted.id, 'create', `ایجاد ساختار سرفصل بودجه: ${payload.title}`);
        }
        setEditor({ isOpen: false, data: {} });
        await fetchStructures();
        showToast(t('ساختار سرفصل بودجه ذخیره شد', 'Budget heading structure saved'));
      } catch (error) {
        showToast(t('خطا در ذخیره ساختار سرفصل بودجه', 'Failed to save budget heading structure'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const toggleActive = async (row, value) => {
      if (!access.canEdit) return;
      try {
        const { error } = await supabase.from('fm_budget_heading_structures').update({ is_active: value }).eq('id', row.id);
        if (error) throw error;
        await logAction(row.id, 'update', `${value ? 'فعال' : 'غیرفعال'} کردن ساختار سرفصل بودجه`);
        await fetchStructures();
      } catch (error) {
        showToast(t('خطا در تغییر وضعیت ساختار', 'Failed to change structure status'), 'error');
      }
    };

    const deleteStructure = async () => {
      const row = deleteConfirm.data;
      if (!row || !access.canDelete) return;
      try {
        const { error } = await supabase.from('fm_budget_heading_structures').delete().eq('id', row.id);
        if (error) throw error;
        await logAction(row.id, 'delete', `حذف ساختار سرفصل بودجه: ${row.title}`);
        setDeleteConfirm({ isOpen: false, data: null });
        await fetchStructures();
        showToast(t('ساختار حذف شد', 'Structure deleted'));
      } catch (error) {
        setDeleteConfirm({ isOpen: false, data: null });
        showToast(t('حذف ساختار به دلیل وابستگی یا خطای دریافت انجام نشد', 'Structure could not be deleted due to dependencies or a data error'), 'error');
      }
    };

    if (viewMode === 'details') {
      const Details = window.BudgetHeadingsDetails;
      return Details
        ? <Details structure={activeStructure} onBack={() => setViewMode('list')} language={language} formCode={formCode} />
        : <EmptyState title={t('صفحه جزئیات در دسترس نیست', 'Details page is unavailable')} description="BudgetHeadingsDetails" />;
    }

    const columns = [
      { field: 'title', header_fa: 'عنوان ساختار سرفصل بودجه', header_en: 'Budget Heading Structure', width: '260px' },
      { field: 'effective_from', header_fa: 'تاریخ شروع موثر', header_en: 'Effective From', type: 'date', width: '140px' },
      { field: 'effective_to', header_fa: 'تاریخ پایان موثر', header_en: 'Effective To', type: 'date', width: '140px' },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', type: 'toggle', width: '110px', onToggle: toggleActive }
    ];

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('ساختار و درخت سرفصل‌های بودجه', 'Budget Heading Structures')}
          description={t('تعریف ساختارهای زمانی و طراحی درخت سرفصل‌های بودجه', 'Define effective structures and design budget heading trees')}
          icon={Network} language={language}
          breadcrumbs={[{ label: t('بودجه‌ریزی', 'Budgeting') }, { label: t('سرفصل بودجه', 'Budget Headings') }]}
        />
        <div className="flex-1 min-h-0 mt-2">
          {isLoading && structures.length === 0 ? (
            <div className="p-4 flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="12rem" /></div>
          ) : (
            <DataGrid data={structures} columns={columns} language={language} formCode={formCode}
              gridState={gridState} onGridStateChange={setGridState}
              onAdd={access.canCreate ? () => openEditor() : undefined}
              onRowDoubleClick={access.canEdit ? openEditor : undefined} hideImport={true} hideExport={true}
              actions={[
                { id: 'design', icon: Network, tooltip: t('طراحی درخت سرفصل‌ها', 'Design Heading Tree'), onClick: row => { setActiveStructure(row); setViewMode('details'); }, className: 'text-indigo-600 dark:text-indigo-400' },
                { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: openEditor, requiredAccess: 'edit' },
                { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: row => setDeleteConfirm({ isOpen: true, data: row }), requiredAccess: 'delete', className: 'text-red-500' }
              ]}
            />
          )}
        </div>

        <Modal isOpen={editor.isOpen} onClose={() => setEditor({ isOpen: false, data: {} })}
          title={editor.data.id ? t('ویرایش ساختار سرفصل بودجه', 'Edit Budget Heading Structure') : t('ساختار جدید سرفصل بودجه', 'New Budget Heading Structure')}
          language={language} width="max-w-2xl">
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
              <TextField size="sm" formCode={formCode} label={t('عنوان ساختار', 'Structure Title')} required
                value={editor.data.title || ''} onChange={e => setEditor(v => ({ ...v, data: { ...v.data, title: e.target.value } }))} isRtl={isRtl} />
              <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={editor.data.is_active !== false}
                onChange={value => setEditor(v => ({ ...v, data: { ...v.data, is_active: value } }))} isRtl={isRtl} wrapperClassName="h-8 px-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePicker size="sm" formCode={formCode} label={t('تاریخ شروع موثر', 'Effective From')}
                value={editor.data.effective_from || ''} onChange={value => setEditor(v => ({ ...v, data: { ...v.data, effective_from: value } }))} isRtl={isRtl} />
              <DatePicker size="sm" formCode={formCode} label={t('تاریخ پایان موثر', 'Effective To')}
                value={editor.data.effective_to || ''} onChange={value => setEditor(v => ({ ...v, data: { ...v.data, effective_to: value } }))} isRtl={isRtl} />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-3">{t('تنظیم طول قطعه‌های کدینگ درخت سرفصل', 'Heading Tree Code Segment Lengths')}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['len_group', 'طول کد سطح ۱', 'Level 1 Code Length', '1'],
                  ['len_general', 'طول کد سطح ۲', 'Level 2 Code Length', '2'],
                  ['len_subsidiary', 'طول کد سطح ۳', 'Level 3 Code Length', '3'],
                  ['len_detail', 'طول کد سطح ۴', 'Level 4 Code Length', '4']
                ].map(([field, labelFa, labelEn, fallback]) => <TextField key={field} size="sm" type="number" formCode={formCode}
                  label={t(labelFa, labelEn)} value={editor.data[field] ?? fallback}
                  onChange={e => setEditor(v => ({ ...v, data: { ...v.data, [field]: e.target.value } }))}
                  isRtl={isRtl} dir="ltr" />)}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button size="sm" variant="outline" onClick={() => setEditor({ isOpen: false, data: {} })}>{t('انصراف', 'Cancel')}</Button>
              {((editor.data.id && access.canEdit) || (!editor.data.id && access.canCreate)) && (
                <Button size="sm" variant="primary" icon={Save} isLoading={isLoading} onClick={saveStructure}>{t('ذخیره', 'Save')}</Button>
              )}
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, data: null })}
          title={t('تأیید حذف ساختار', 'Confirm Structure Deletion')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle} title={t('حذف ساختار و سرفصل‌ها', 'Delete Structure and Headings')}
            description={t(`آیا از حذف ساختار «${deleteConfirm.data?.title || ''}» و تمام سرفصل‌های آن مطمئن هستید؟`, `Delete “${deleteConfirm.data?.title || ''}” and all of its headings?`)}
            action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setDeleteConfirm({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button><Button size="sm" variant="danger" onClick={deleteStructure}>{t('حذف', 'Delete')}</Button></div>} />
        </Modal>
        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(v => ({ ...v, isVisible: false }))} />
      </div>
    );
  };

  BudgetHeadings.formCode = 'BudgetHeadings';
  window.BudgetHeadings = BudgetHeadings;
})();
