/* Filename: budgeting/FundingSources.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const { Wallet = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon,
    Save = FallbackIcon, AlertTriangle = FallbackIcon } = window.LucideIcons || {};

  const FundingSources = ({ language = 'fa', formCode = 'FundingSources' }) => {
    const Empty = () => null;
    const { Button = Empty, PageHeader = Empty, EmptyState = Empty, Skeleton = Empty } = window.DSCore || window.DesignSystem || {};
    const { TextField = Empty, ToggleField = Empty, DatePicker = Empty } = window.DSForms || window.DesignSystem || {};
    const { DataGrid = Empty } = window.DSGrid || window.DesignSystem || {};
    const { Modal = Empty, Toast = Empty } = window.DSFeedback || window.DesignSystem || {};
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => securityCtx?.getActions(formCode) || {
      canView: false, canCreate: false, canEdit: false, canDelete: false
    }, [securityCtx, formCode]);
    const requestIdRef = useRef(0);
    const savingRef = useRef(false);
    const editorRequestRef = useRef(0);
    const [sources, setSources] = useState([]);
    const [gridState, setGridState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editor, setEditor] = useState({ isOpen: false, data: {} });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      window.setTimeout(() => setToast(value => ({ ...value, isVisible: false })), 3000);
    }, []);

    const loadAll = useCallback(async (table, columns) => {
      const result = [];
      const pageSize = 500;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase.from(table).select(columns)
          .order('id', { ascending: true }).range(from, from + pageSize - 1);
        if (error) throw error;
        result.push(...(data || []));
        if (!data || data.length < pageSize) return result;
      }
    }, [supabase]);

    const fetchData = useCallback(async () => {
      if (!access.canView) return;
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        if (!supabase) throw new Error('Supabase client is unavailable');
        const sourceRows = await loadAll('fm_funding_sources',
          'id,code,title_fa,title_en,effective_from,effective_to,is_active');
        if (requestId !== requestIdRef.current) return;
        setSources(sourceRows.map(row => ({
          id: row.id, code: row.code, titleFa: row.title_fa, titleEn: row.title_en,
          effectiveFrom: row.effective_from, effectiveTo: row.effective_to, isActive: row.is_active
        })));
        setLoadError(false);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          setLoadError(true);
          showToast(t('خطا در دریافت منابع تأمین اعتبار', 'Failed to load funding sources'), 'error');
        }
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, [access.canView, supabase, loadAll, showToast, t]);

    useEffect(() => {
      fetchData();
      return () => { requestIdRef.current += 1; };
    }, [fetchData]);

    const logAction = async (id, action, details) => {
      const { error } = await supabase.from('fm_record_logs').insert([{
        entity_type: 'منبع تأمین اعتبار', record_id: String(id), action,
        user_name: window.NavigationSystem?.currentUser?.name || 'system', details
      }]);
      if (error) console.error('Funding source audit log failed:', error);
    };

    const openEditor = async (row = null) => {
      if (loadError || (row ? !access.canEdit : !access.canCreate)) return;
      const request = ++editorRequestRef.current;
      if (row) {
        setEditor({ isOpen: true, data: { ...row } });
        return;
      }
      let code = '';
      try {
        const preview = await window.AutoNumberingService?.previewNext('FUNDING_SOURCE');
        code = typeof preview === 'string' ? preview : (preview?.formattedCode || '');
        if (!code) throw new Error(t('شماره‌گذاری خودکار منبع تأمین اعتبار در دسترس نیست', 'Funding source auto numbering is unavailable'));
      } catch (error) {
        if (request === editorRequestRef.current) showToast(error.message, 'error');
        return;
      }
      if (request !== editorRequestRef.current) return;
      setEditor({ isOpen: true, data: {
        code, titleFa: '', titleEn: '', effectiveFrom: '', effectiveTo: '',
        isActive: true
      } });
    };

    const updateEditor = (field, value) => setEditor(state => ({
      ...state, data: { ...state.data, [field]: value }
    }));
    const normalizeDate = value => String(value || '').replaceAll('/', '-');
    const saveSource = async () => {
      const data = editor.data;
      if (savingRef.current || loadError || !supabase || (data.id ? !access.canEdit : !access.canCreate)) return;
      let code = String(data.code || '').trim();
      const titleFa = String(data.titleFa || '').trim();
      if (!code || !titleFa) return showToast(t('کد و عنوان منبع الزامی هستند', 'Code and source title are required'), 'error');
      const from = normalizeDate(data.effectiveFrom);
      const to = normalizeDate(data.effectiveTo);
      if (from && to && from > to) return showToast(t('تاریخ پایان باید پس از تاریخ شروع باشد', 'End date must follow start date'), 'error');
      if (data.id && sources.some(row => row.code === code && String(row.id) !== String(data.id))) {
        return showToast(t('کد منبع تکراری است', 'Source code is already used'), 'error');
      }
      savingRef.current = true;
      setIsSaving(true);
      try {
        if (!data.id) {
          const number = await window.AutoNumberingService.consumeNext('FUNDING_SOURCE');
          code = typeof number === 'string' ? number : number?.formattedCode;
          if (!code) throw new Error(t('کد خودکار منبع دریافت نشد', 'Automatic funding source code was not received'));
          updateEditor('code', code);
        }
        const payload = {
          code, title_fa: titleFa, title_en: String(data.titleEn || '').trim() || null,
          effective_from: from || null, effective_to: to || null,
          is_active: data.isActive !== false
        };
        let id = data.id;
        if (id) {
          const { error } = await supabase.from('fm_funding_sources').update(payload).eq('id', id).select('id').single();
          if (error) throw error;
          await logAction(id, 'update', `ویرایش منبع تأمین اعتبار: ${code} - ${titleFa}`);
        } else {
          const { data: inserted, error } = await supabase.from('fm_funding_sources').insert([payload]).select('id').single();
          if (error) throw error;
          id = inserted.id;
          await logAction(id, 'create', `ایجاد منبع تأمین اعتبار: ${code} - ${titleFa}`);
        }
        setEditor({ isOpen: false, data: {} });
        await fetchData();
        showToast(t('منبع تأمین اعتبار ذخیره شد', 'Funding source saved'));
      } catch (error) {
        showToast(error?.message || t('خطا در ذخیره منبع تأمین اعتبار', 'Failed to save funding source'), 'error');
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    };

    const toggleActive = async (row, value) => {
      if (!access.canEdit || loadError || !supabase) return;
      try {
        const { error } = await supabase.from('fm_funding_sources').update({ is_active: value }).eq('id', row.id).select('id').single();
        if (error) throw error;
        await logAction(row.id, 'update', `${value ? 'فعال' : 'غیرفعال'} کردن منبع تأمین اعتبار: ${row.code}`);
        await fetchData();
      } catch (error) {
        showToast(error?.message || t('تغییر وضعیت منبع انجام نشد', 'Failed to change source status'), 'error');
      }
    };

    const deleteSource = async () => {
      const row = deleteConfirm;
      if (!row || !access.canDelete || loadError || !supabase) return;
      setIsSaving(true);
      try {
        const { error } = await supabase.from('fm_funding_sources').delete().eq('id', row.id).select('id').single();
        if (error) throw error;
        await logAction(row.id, 'delete', `حذف منبع تأمین اعتبار: ${row.code}`);
        setDeleteConfirm(null);
        await fetchData();
        showToast(t('منبع تأمین اعتبار حذف شد', 'Funding source deleted'));
      } catch (error) {
        showToast(t('حذف منبع به دلیل وابستگی یا خطای داده انجام نشد', 'Source could not be deleted due to dependencies or a data error'), 'error');
      } finally {
        setIsSaving(false);
      }
    };

    const columns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '120px' },
      { field: isRtl ? 'titleFa' : 'titleEn', header_fa: 'عنوان منبع', header_en: 'Source Title', width: '240px',
        render: (value, row) => value || row.titleFa },
      { field: 'effectiveFrom', header_fa: 'شروع مؤثر', header_en: 'Effective From', type: 'date', width: '130px' },
      { field: 'effectiveTo', header_fa: 'پایان مؤثر', header_en: 'Effective To', type: 'date', width: '130px' },
      { field: 'isActive', header_fa: 'وضعیت', header_en: 'Status', type: 'toggle', width: '110px',
        onToggle: access.canEdit ? toggleActive : undefined }
    ];
    if (!access.canView) return <EmptyState title={t('دسترسی مشاهده ندارید', 'View access denied')} />;
    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader title={t('منابع تأمین اعتبار', 'Funding Sources')} icon={Wallet} language={language}
          breadcrumbs={[{ label: t('بودجه‌ریزی', 'Budgeting') }, { label: t('اطلاعات پایه', 'Basic Information') },
            { label: t('منابع تأمین اعتبار', 'Funding Sources') }]} />
        <div className="flex-1 min-h-0 mt-2 flex flex-col">
          <div className="flex-1 min-h-0">
            {isLoading && !sources.length ? <div className="p-4 flex flex-col gap-3"><Skeleton height="2.5rem" /><Skeleton height="12rem" /></div> :
              loadError ? <EmptyState title={t('دریافت اطلاعات انجام نشد', 'Could not load data')}
                action={<Button size="sm" onClick={fetchData}>{t('تلاش دوباره', 'Retry')}</Button>} /> :
              <DataGrid data={sources} columns={columns} language={language} formCode={formCode}
                gridState={gridState} onGridStateChange={setGridState} hideImport hideExport
                onAdd={access.canCreate ? () => openEditor() : undefined}
                onRowDoubleClick={access.canEdit ? openEditor : undefined}
                actions={[
                  { id: 'update', icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: openEditor,
                    requiredAccess: 'edit' },
                  { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: setDeleteConfirm,
                    requiredAccess: 'delete', className: 'text-red-500' }
                ]} />}
          </div>
        </div>

        <Modal isOpen={editor.isOpen} onClose={() => setEditor({ isOpen: false, data: {} })}
          title={editor.data.id ? t('ویرایش منبع تأمین اعتبار', 'Edit Funding Source') : t('منبع تأمین اعتبار جدید', 'New Funding Source')}
          language={language} width="max-w-2xl">
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField size="sm" formCode={formCode} label={t('کد', 'Code')} required dir="ltr" isRtl={isRtl}
                value={editor.data.code || ''} disabled placeholder={t('تولید خودکار', 'Auto')} />
              <TextField size="sm" formCode={formCode} label={t('عنوان منبع', 'Source Title')} required isRtl={isRtl}
                value={editor.data.titleFa || ''} onChange={event => updateEditor('titleFa', event.target.value)} />
              <TextField size="sm" formCode={formCode} label={t('عنوان انگلیسی', 'English Title')} dir="ltr" isRtl={isRtl}
                value={editor.data.titleEn || ''} onChange={event => updateEditor('titleEn', event.target.value)} />
              <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={editor.data.isActive !== false}
              onChange={value => updateEditor('isActive', value)} isRtl={isRtl} />
              <DatePicker size="sm" formCode={formCode} label={t('تاریخ شروع مؤثر', 'Effective From')} language={language} isRtl={isRtl}
                value={editor.data.effectiveFrom || ''} onChange={value => updateEditor('effectiveFrom', value)} />
              <DatePicker size="sm" formCode={formCode} label={t('تاریخ پایان مؤثر', 'Effective To')} language={language} isRtl={isRtl}
                value={editor.data.effectiveTo || ''} onChange={value => updateEditor('effectiveTo', value)} />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button size="sm" variant="outline" onClick={() => setEditor({ isOpen: false, data: {} })}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="primary" icon={Save} isLoading={isSaving} onClick={saveSource}>{t('ذخیره', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}
          title={t('تأیید حذف منبع', 'Confirm Source Deletion')} language={language} width="max-w-sm">
          <EmptyState icon={AlertTriangle} title={t('حذف منبع تأمین اعتبار', 'Delete Funding Source')}
            description={t(`آیا منبع «${deleteConfirm?.titleFa || ''}» حذف شود؟`,
              `Delete “${deleteConfirm?.titleEn || deleteConfirm?.titleFa || ''}”?`)}
            action={<div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="danger" isLoading={isSaving} onClick={deleteSource}>{t('حذف', 'Delete')}</Button>
            </div>} />
        </Modal>
        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(value => ({ ...value, isVisible: false }))} />
      </div>
    );
  };

  FundingSources.formCode = 'FundingSources';
  window.FundingSources = FundingSources;
})();
