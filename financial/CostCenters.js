/* Filename: financial/CostCenters.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo } = React;

  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button = DSCore.Button || DS.Button || Fallback;
  const PageHeader = DSCore.PageHeader || DS.PageHeader || Fallback;
  const EmptyState = DSCore.EmptyState || DS.EmptyState || Fallback;

  const TextField = DSForms.TextField || DS.TextField || Fallback;
  const SelectField = DSForms.SelectField || DS.SelectField || Fallback;
  const ToggleField = DSForms.ToggleField || DS.ToggleField || Fallback;

  const DataGrid = DSGrid.DataGrid || DS.DataGrid || Fallback;
  const LOVField = DSGrid.LOVField || DS.LOVField || Fallback;

  const Modal = DSFeedback.Modal || DSCore.Modal || DS.Modal || Fallback;
  const Toast = DSFeedback.Toast || DS.Toast || Fallback;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const Landmark   = LucideIcons.Landmark   || FallbackIcon;
  const Edit       = LucideIcons.Edit       || FallbackIcon;
  const Trash2     = LucideIcons.Trash2     || FallbackIcon;
  const Save       = LucideIcons.Save       || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;

  const supabase = window.supabase;

  const FORM_CODE = 'COST_CENTERS';

  const CENTER_TYPE_OPTIONS = [
    { value: 'ADMINISTRATIVE', label_fa: 'اداری',       label_en: 'Administrative' },
    { value: 'PRODUCTION',     label_fa: 'تولیدی',      label_en: 'Production'     },
    { value: 'SERVICE',        label_fa: 'خدماتی',      label_en: 'Service'        },
    { value: 'SUPPORT',        label_fa: 'پشتیبانی',    label_en: 'Support'        },
  ];

  const EMPTY_FORM = {
    code:        '',
    titleFa:     '',
    titleEn:     '',
    centerType:  'ADMINISTRATIVE',
    isActive:    true,
    officeId:    null,
    officeName:  '',
    description: '',
  };

  const CostCenters = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const raw = securityCtx ? securityCtx.getActions(FORM_CODE) : null;
      return raw || { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }, [securityCtx]);

    const [data,        setData]        = useState([]);
    const [offices,     setOffices]     = useState([]);
    const [isLoading,   setIsLoading]   = useState(false);
    const [gridState,   setGridState]   = useState(null);

    const [isModalOpen,   setIsModalOpen]   = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [selectedIds,   setSelectedIds]   = useState([]);
    const [formData,      setFormData]      = useState(EMPTY_FORM);

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [toast,         setToast]         = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (recordId, action, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: 'COST_CENTER',
          record_id: String(recordId),
          action,
          user_name: currentUser,
          details,
        }]);
      } catch (err) {
        console.error('Log error:', err);
      }
    }, [supabase, currentUser]);

    const viewConfig = {
      pageId: 'cost_centers_main',
      currentState: () => ({ gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.gridState) setGridState(state.gridState);
        } else {
          setGridState(null);
        }
      },
    };

    /* ── fetch offices from all organizations ── */
    const fetchOffices = useCallback(async () => {
      try {
        if (!supabase) return;
        const { data: rows, error } = await supabase
          .from('fm_org_offices')
          .select('id, title, org_id, is_active, organization_info(name)')
          .eq('is_active', true)
          .order('title', { ascending: true });
        if (error) throw error;
        setOffices(
          (rows || []).map(o => ({
            id: o.id,
            value: o.id,
            label: o.title,
            orgName: o.organization_info?.name || '',
          }))
        );
      } catch (err) {
        console.error('Error fetching offices:', err);
      }
    }, [supabase]);

    /* ── fetch cost centers ── */
    const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
        if (!supabase) return;
        const { data: rows, error } = await supabase
          .from('fm_cost_centers')
          .select(`
            *,
            office:fm_org_offices(id, title)
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setData(
          (rows || []).map(r => ({
            id:          r.id,
            code:        r.code,
            titleFa:     r.title_fa,
            titleEn:     r.title_en,
            centerType:  r.center_type,
            isActive:    r.is_active ?? true,
            officeId:    r.office_id,
            officeName:  r.office?.title || '',
            description: r.description || '',
          }))
        );
      } catch (err) {
        console.error('Fetch Error:', err);
        showToast(t('خطا در دریافت اطلاعات', 'Error fetching data'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [supabase, showToast, t]);

    useEffect(() => {
      fetchData();
      fetchOffices();
    }, [fetchData, fetchOffices]);

    /* ── open add/edit modal ── */
    const handleOpenModal = useCallback(async (record = null) => {
      if (record) {
        setFormData({ ...record });
      } else {
        let nextCode = '';
        if (window.AutoNumberingService) {
          try {
            const preview = await window.AutoNumberingService.previewNext('COST_CENTER');
            nextCode = typeof preview === 'string' ? preview : (preview?.formattedCode || '');
          } catch (err) {
            console.error('AutoNumbering Error:', err);
          }
        }
        setFormData({ ...EMPTY_FORM, code: nextCode });
      }
      setCurrentRecord(record);
      setIsModalOpen(true);
    }, []);

    /* ── save ── */
    const handleSave = async () => {
      if (!formData.titleFa.trim() || !formData.titleEn.trim()) {
        showToast(t('عنوان فارسی و لاتین الزامی هستند', 'Persian and Latin titles are required'), 'error');
        return;
      }
      if (!formData.centerType) {
        showToast(t('نوع مرکز هزینه الزامی است', 'Cost center type is required'), 'error');
        return;
      }

      setIsLoading(true);
      try {
        const payload = {
          code:        formData.code.trim(),
          title_fa:    formData.titleFa.trim(),
          title_en:    formData.titleEn.trim(),
          center_type: formData.centerType,
          is_active:   formData.isActive,
          office_id:   formData.officeId || null,
          description: formData.description?.trim() || null,
        };

        if (currentRecord?.id) {
          const { error } = await supabase
            .from('fm_cost_centers')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', currentRecord.id);
          if (error) throw error;
          logAction(currentRecord.id, 'edit', `ویرایش مرکز هزینه: ${payload.title_fa}`);
        } else {
          const { data: inserted, error } = await supabase
            .from('fm_cost_centers')
            .insert([payload])
            .select('id')
            .single();
          if (error) throw error;
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('COST_CENTER'); } catch (err) { console.error('AutoNumbering consume error:', err); }
          }
          logAction(inserted.id, 'create', `ایجاد مرکز هزینه: ${payload.title_fa}`);
        }

        setIsModalOpen(false);
        fetchData();
        showToast(t('اطلاعات با موفقیت ذخیره شد', 'Saved successfully'));
      } catch (err) {
        console.error('Save Error:', err);
        showToast(t('خطا در ذخیره اطلاعات', 'Error saving data'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    /* ── toggle active inline ── */
    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase
          .from('fm_cost_centers')
          .update({ is_active: newValue, updated_at: new Date().toISOString() })
          .eq('id', row.id);
        if (error) throw error;
        setData(prev => prev.map(item => item.id === row.id ? { ...item, isActive: newValue } : item));
      } catch (err) {
        console.error('Toggle Error:', err);
        showToast(t('خطا در تغییر وضعیت', 'Error toggling status'), 'error');
      }
    };

    /* ── delete ── */
    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const { error } = await supabase.from('fm_cost_centers').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          logAction(deleteConfirm.data.id, 'delete', `حذف مرکز هزینه: ${deleteConfirm.data.titleFa}`);
          setSelectedIds([]);
        } else if (deleteConfirm.type === 'bulk') {
          const { error } = await supabase.from('fm_cost_centers').delete().in('id', deleteConfirm.data);
          if (error) throw error;
          setSelectedIds([]);
        }
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        fetchData();
        showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful'));
      } catch (err) {
        console.error('Delete error:', err);
        showToast(t('خطا در حذف رکورد', 'Error deleting record'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    /* ── helpers ── */
    const getCenterTypeLabel = (val) => {
      const opt = CENTER_TYPE_OPTIONS.find(o => o.value === val);
      return opt ? (isRtl ? opt.label_fa : opt.label_en) : val;
    };

    /* ── grid columns ── */
    const columns = [
      {
        field: 'code',
        header_fa: 'کد',
        header_en: 'Code',
        width: '120px',
        render: (val) => <span className="font-mono font-bold text-slate-700 dark:text-slate-200" dir="ltr">{val}</span>,
      },
      { field: 'titleFa', header_fa: 'عنوان فارسی',  header_en: 'Persian Title',  width: '200px' },
      { field: 'titleEn', header_fa: 'عنوان لاتین',   header_en: 'English Title',  width: '200px', render: (val) => <span dir="ltr">{val}</span> },
      {
        field: 'centerType',
        header_fa: 'نوع مرکز هزینه',
        header_en: 'Center Type',
        width: '140px',
        render: (val) => <span>{getCenterTypeLabel(val)}</span>,
      },
      { field: 'officeName', header_fa: 'محل مرکز', header_en: 'Location', width: '160px', render: (val) => <span>{val || '-'}</span> },
      {
        field: 'isActive',
        header_fa: 'وضعیت',
        header_en: 'Status',
        width: '100px',
        type: 'toggle',
        onToggle: (row, val) => handleToggleActive(row, val),
      },
    ];

    /* ── LOV columns for office picker ── */
    const officelovColumns = [
      { field: 'label',   header_fa: 'عنوان دفتر',  header_en: 'Office',       width: '200px' },
      { field: 'orgName', header_fa: 'سازمان',      header_en: 'Organization', width: '180px' },
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مراکز هزینه', 'Cost Centers')}
          icon={Landmark}
          description={t('تعریف و مدیریت مراکز هزینه سازمان', 'Define and manage organizational cost centers')}
          language={language}
          breadcrumbs={[
            { label: t('مالی', 'Financial') },
            { label: t('مراکز هزینه', 'Cost Centers') },
          ]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-4 animate-in fade-in duration-300">
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <DataGrid
              data={data}
              columns={columns}
              language={language}
              selectable={true}
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              isLoading={isLoading}
              onAdd={access.canCreate ? () => handleOpenModal() : undefined}
              onRowDoubleClick={(row) => access.canEdit ? handleOpenModal(row) : undefined}
              gridState={gridState}
              onGridStateChange={setGridState}
              hideImport={true}
              actions={[
                { icon: Edit,   tooltip: t('ویرایش', 'Edit'),   onClick: (row) => handleOpenModal(row), className: 'text-slate-400 hover:text-indigo-600'  },
                { icon: Trash2, tooltip: t('حذف', 'Delete'),    onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 hover:text-red-600' },
              ]}
              bulkActions={[
                { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) },
              ]}
            />
          </div>
        </div>

        {/* ─── Add / Edit Modal ─── */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={currentRecord
            ? t('ویرایش مرکز هزینه', 'Edit Cost Center')
            : t('تعریف مرکز هزینه جدید', 'New Cost Center')}
          width="max-w-xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* code */}
              <TextField
                size="sm"
                label={t('کد مرکز هزینه', 'Cost Center Code')}
                value={formData.code}
                onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                isRtl={isRtl}
                dir="ltr"
                formCode={FORM_CODE}
              />

              {/* center type */}
              <SelectField
                size="sm"
                label={t('نوع مرکز هزینه', 'Center Type')}
                value={formData.centerType}
                onChange={e => setFormData(p => ({ ...p, centerType: e.target.value }))}
                options={CENTER_TYPE_OPTIONS.map(o => ({ value: o.value, label: isRtl ? o.label_fa : o.label_en }))}
                isRtl={isRtl}
                required
                formCode={FORM_CODE}
              />

              {/* title_fa */}
              <TextField
                size="sm"
                label={t('عنوان فارسی', 'Persian Title')}
                value={formData.titleFa}
                onChange={e => setFormData(p => ({ ...p, titleFa: e.target.value }))}
                isRtl={isRtl}
                required
                formCode={FORM_CODE}
              />

              {/* title_en */}
              <TextField
                size="sm"
                label={t('عنوان لاتین', 'English Title')}
                value={formData.titleEn}
                onChange={e => setFormData(p => ({ ...p, titleEn: e.target.value }))}
                isRtl={isRtl}
                dir="ltr"
                required
                formCode={FORM_CODE}
              />

              {/* office LOV */}
              <div className="md:col-span-2">
                <LOVField
                  size="sm"
                  label={t('محل مرکز (دفتر)', 'Location (Office)')}
                  data={offices}
                  columns={officelovColumns}
                  dropdownWidth="min-w-[420px]"
                  displayValue={formData.officeName}
                  onChange={r => setFormData(p => ({
                    ...p,
                    officeId:   r?.id   ?? null,
                    officeName: r?.label ?? '',
                  }))}
                  onClear={() => setFormData(p => ({ ...p, officeId: null, officeName: '' }))}
                  isRtl={isRtl}
                  formCode={FORM_CODE}
                />
              </div>

              {/* description */}
              <div className="md:col-span-2">
                <TextField
                  size="sm"
                  label={t('توضیحات', 'Description')}
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  isRtl={isRtl}
                  formCode={FORM_CODE}
                />
              </div>

              {/* is_active toggle */}
              <div className="md:col-span-2 flex items-center">
                <ToggleField
                  size="sm"
                  label={t('فعال', 'Active')}
                  checked={formData.isActive}
                  onChange={v => setFormData(p => ({ ...p, isActive: v }))}
                  isRtl={isRtl}
                  formCode={FORM_CODE}
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                {t('انصراف', 'Cancel')}
              </Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isLoading}>
                {t('ذخیره تغییرات', 'Save Changes')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ─── Delete Confirm Modal ─── */}
        <Modal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
          title={t('تایید عملیات حذف', 'Confirm Deletion')}
          language={language}
          width="max-w-sm"
        >
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={
              deleteConfirm.type === 'bulk'
                ? t(
                    `آیا از حذف ${deleteConfirm.data?.length} مرکز هزینه انتخاب‌شده اطمینان دارید؟`,
                    `Delete ${deleteConfirm.data?.length} selected cost centers?`
                  )
                : t(
                    `آیا از حذف مرکز هزینه "${deleteConfirm.data?.titleFa}" اطمینان دارید؟`,
                    `Delete cost center "${deleteConfirm.data?.titleEn || deleteConfirm.data?.titleFa}"?`
                  )
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
                >
                  {t('انصراف', 'Cancel')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={executeDelete}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  {t('تایید حذف', 'Delete')}
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

  window.CostCenters = CostCenters;
})();
