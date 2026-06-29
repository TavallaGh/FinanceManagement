/* Filename: financial/CostBenefitCenters.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo } = React;

  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button      = DSCore.Button      || DS.Button      || Fallback;
  const PageHeader  = DSCore.PageHeader  || DS.PageHeader  || Fallback;
  const EmptyState  = DSCore.EmptyState  || DS.EmptyState  || Fallback;

  const TextField    = DSForms.TextField    || DS.TextField    || Fallback;
  const SelectField  = DSForms.SelectField  || DS.SelectField  || Fallback;
  const ToggleField  = DSForms.ToggleField  || DS.ToggleField  || Fallback;
  const CheckboxField = DSForms.CheckboxField || DS.CheckboxField || Fallback;

  const DataGrid = DSGrid.DataGrid || DS.DataGrid || Fallback;
  const LOVField = DSGrid.LOVField || DS.LOVField || Fallback;

  const Modal = DSFeedback.Modal || DSCore.Modal || DS.Modal || Fallback;
  const Toast = DSFeedback.Toast || DS.Toast || Fallback;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons   = window.LucideIcons || {};
  const LayoutGrid    = LucideIcons.LayoutGrid    || FallbackIcon;
  const Edit          = LucideIcons.Edit          || FallbackIcon;
  const Trash2        = LucideIcons.Trash2        || FallbackIcon;
  const Save          = LucideIcons.Save          || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;

  const supabase = window.supabase;

  const FORM_CODE = 'COST_BENEFIT_CENTERS';

  const CENTER_KIND_OPTIONS = [
    { value: 'DEPARTMENT', label_fa: 'دپارتمان', label_en: 'Department' },
    { value: 'TEAM',       label_fa: 'تیم',      label_en: 'Team'       },
    { value: 'PROJECT',    label_fa: 'پروژه',    label_en: 'Project'    },
    { value: 'OTHER',      label_fa: 'سایر',     label_en: 'Other'      },
  ];

  const EMPTY_FORM = {
    code:            '',
    officeId:        null,
    officeName:      '',
    titleFa:         '',
    titleEn:         '',
    centerKind:      'DEPARTMENT',
    isCostCenter:    true,
    isBenefitCenter: false,
    isActive:        true,
    description:     '',
  };

  const CostBenefitCenters = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const raw = securityCtx ? securityCtx.getActions(FORM_CODE) : null;
      return raw || { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }, [securityCtx]);

    const [data,       setData]       = useState([]);
    const [offices,    setOffices]    = useState([]);
    const [isLoading,  setIsLoading]  = useState(false);
    const [gridState,  setGridState]  = useState(null);

    const [isModalOpen,   setIsModalOpen]   = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [selectedIds,   setSelectedIds]   = useState([]);
    const [formData,      setFormData]      = useState(EMPTY_FORM);

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [toast,         setToast]         = useState({ isVisible: false, message: '', type: 'success' });
    const [importErrors,  setImportErrors]  = useState({ isOpen: false, errors: [], insertedCount: 0, updatedCount: 0 });

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (recordId, action, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: 'COST_BENEFIT_CENTER',
          record_id:   String(recordId),
          action,
          user_name:   currentUser,
          details,
        }]);
      } catch (err) {
        console.error('Log error:', err);
      }
    }, [supabase, currentUser]);

    const viewConfig = {
      pageId: 'cost_benefit_centers_main',
      currentState: () => ({ gridState }),
      onApplyState: (state) => {
        if (state) { if (state.gridState) setGridState(state.gridState); }
        else        { setGridState(null); }
      },
    };

    /* ── fetch offices ── */
    const fetchOffices = useCallback(async () => {
      try {
        if (!supabase) return;
        const { data: rows, error } = await supabase
          .from('fm_org_offices')
          .select('id, title, org_id, is_active, organization_info(name)')
          .eq('is_active', true)
          .order('title', { ascending: true });
        if (error) throw error;
        setOffices((rows || []).map(o => ({
          id:      o.id,
          value:   o.id,
          label:   o.title,
          orgName: o.organization_info?.name || '',
        })));
      } catch (err) {
        console.error('Error fetching offices:', err);
      }
    }, [supabase]);

    /* ── fetch cost/benefit centers ── */
    const fetchData = useCallback(async () => {
      setIsLoading(true);
      try {
        if (!supabase) return;
        const { data: rows, error } = await supabase
          .from('fm_cost_benefit_centers')
          .select('*, office:fm_org_offices(id, title)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setData((rows || []).map(r => ({
          id:              r.id,
          code:            r.code,
          titleFa:         r.title_fa,
          titleEn:         r.title_en,
          centerKind:      r.center_kind,
          isCostCenter:    r.is_cost_center    ?? false,
          isBenefitCenter: r.is_benefit_center ?? false,
          isActive:        r.is_active         ?? true,
          officeId:        r.office_id,
          officeName:      r.office?.title || '',
          description:     r.description  || '',
        })));
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
            const preview = await window.AutoNumberingService.previewNext('COST_BENEFIT_CENTER');
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
      if (!formData.isCostCenter && !formData.isBenefitCenter) {
        showToast(t('حداقل یکی از گزینه‌های «مرکز هزینه» یا «مرکز درآمد» باید انتخاب شود', 'At least one of Cost Center or Benefit Center must be selected'), 'error');
        return;
      }
      setIsLoading(true);
      try {
        const payload = {
          code:             formData.code.trim(),
          title_fa:         formData.titleFa.trim(),
          title_en:         formData.titleEn.trim(),
          center_kind:      formData.centerKind,
          is_cost_center:   formData.isCostCenter,
          is_benefit_center: formData.isBenefitCenter,
          is_active:        formData.isActive,
          office_id:        formData.officeId || null,
          description:      formData.description?.trim() || null,
        };

        if (currentRecord?.id) {
          const { error } = await supabase
            .from('fm_cost_benefit_centers')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', currentRecord.id);
          if (error) throw error;
          logAction(currentRecord.id, 'edit', `ویرایش مرکز: ${payload.title_fa}`);
        } else {
          const { data: inserted, error } = await supabase
            .from('fm_cost_benefit_centers')
            .insert([payload])
            .select('id')
            .single();
          if (error) throw error;
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('COST_BENEFIT_CENTER'); }
            catch (err) { console.error('AutoNumbering consume error:', err); }
          }
          logAction(inserted.id, 'create', `ایجاد مرکز: ${payload.title_fa}`);
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
          .from('fm_cost_benefit_centers')
          .update({ is_active: newValue, updated_at: new Date().toISOString() })
          .eq('id', row.id);
        if (error) throw error;
        setData(prev => prev.map(item => item.id === row.id ? { ...item, isActive: newValue } : item));
      } catch (err) {
        showToast(t('خطا در تغییر وضعیت', 'Error toggling status'), 'error');
      }
    };

    /* ── delete ── */
    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const { error } = await supabase.from('fm_cost_benefit_centers').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          logAction(deleteConfirm.data.id, 'delete', `حذف مرکز: ${deleteConfirm.data.titleFa}`);
          setSelectedIds([]);
        } else if (deleteConfirm.type === 'bulk') {
          const { error } = await supabase.from('fm_cost_benefit_centers').delete().in('id', deleteConfirm.data);
          if (error) throw error;
          setSelectedIds([]);
        }
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        fetchData();
        showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful'));
      } catch (err) {
        showToast(t('خطا در حذف رکورد', 'Error deleting record'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    /* ── helpers ── */
    const getKindLabel = (val) => {
      const opt = CENTER_KIND_OPTIONS.find(o => o.value === val);
      return opt ? (isRtl ? opt.label_fa : opt.label_en) : (val || '-');
    };

    const getCenterTypeBadges = (row) => {
      const badges = [];
      if (row.isCostCenter)    badges.push({ label: t('هزینه', 'Cost'),    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' });
      if (row.isBenefitCenter) badges.push({ label: t('درآمد', 'Benefit'), cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' });
      return badges;
    };

    /* ── download sample CSV ── */
    const handleDownloadSample = useCallback(() => {
      const headers = isRtl
        ? 'کد (خالی = اتوماتیک),عنوان فارسی,عنوان لاتین,نوع مرکز (DEPARTMENT|TEAM|PROJECT|OTHER),مرکز هزینه (1/0),مرکز درآمد (1/0),وضعیت (1 فعال / 0 غیرفعال),عنوان دفتر,توضیحات'
        : 'Code (empty=auto),Persian Title,English Title,Center Kind (DEPARTMENT|TEAM|PROJECT|OTHER),Is Cost Center (1/0),Is Benefit Center (1/0),Status (1 Active / 0 Inactive),Office Title,Description';
      const officeSample = offices.length > 0 ? offices[0].label : '';
      const sampleRows = isRtl
        ? [
            `,واحد فروش,Sales Unit,DEPARTMENT,1,1,1,${officeSample},فروش و بازاریابی`,
            ',تیم توسعه,Development Team,TEAM,1,0,1,,',
            ',پروژه ساختمانی,Construction Project,PROJECT,0,1,1,,پروژه ساخت دفتر',
            ',واحد پشتیبانی,Support Unit,OTHER,1,0,1,,',
          ]
        : [
            `,Sales Unit,واحد فروش,DEPARTMENT,1,1,1,${officeSample},Sales & Marketing`,
            ',Development Team,تیم توسعه,TEAM,1,0,1,,',
            ',Construction Project,پروژه ساختمانی,PROJECT,0,1,1,,Office construction',
            ',Support Unit,واحد پشتیبانی,OTHER,1,0,1,,',
          ];
      const csv = '\uFEFF' + headers + '\n' + sampleRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'CostBenefitCenters_Import_Sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [isRtl, offices]);

    /* ── import CSV / Excel ── */
    const handleImport = useCallback((file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let rows;
          const VALID_KINDS = new Set(['DEPARTMENT', 'TEAM', 'PROJECT', 'OTHER']);

          if (window.XLSX) {
            const wb = window.XLSX.read(e.target.result, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawRows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (rawRows.length < 2) { showToast(t('فایل خالی یا نامعتبر است', 'File is empty or invalid'), 'error'); return; }
            rows = rawRows.slice(1).map(p => ({
              code:            String(p[0] ?? '').trim(),
              titleFa:         String(p[1] ?? '').trim(),
              titleEn:         String(p[2] ?? '').trim(),
              centerKind:      String(p[3] ?? '').trim().toUpperCase() || 'DEPARTMENT',
              isCostCenter:    String(p[4] ?? '1').trim() !== '0',
              isBenefitCenter: String(p[5] ?? '0').trim() !== '0',
              isActive:        String(p[6] ?? '1').trim() !== '0',
              officeTitle:     String(p[7] ?? '').trim(),
              description:     String(p[8] ?? '').trim(),
            }));
          } else {
            const text = (new TextDecoder('utf-8')).decode(e.target.result).replace(/^\uFEFF/, '');
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { showToast(t('فایل خالی یا نامعتبر است', 'File is empty or invalid'), 'error'); return; }
            rows = lines.slice(1).map(line => {
              const p = line.split(',');
              return {
                code:            (p[0] || '').trim(),
                titleFa:         (p[1] || '').trim().replace(/^"|"$/g, ''),
                titleEn:         (p[2] || '').trim().replace(/^"|"$/g, ''),
                centerKind:      ((p[3] || '').trim().toUpperCase()) || 'DEPARTMENT',
                isCostCenter:    (p[4] || '1').trim() !== '0',
                isBenefitCenter: (p[5] || '0').trim() !== '0',
                isActive:        (p[6] || '1').trim() !== '0',
                officeTitle:     (p[7] || '').trim().replace(/^"|"$/g, ''),
                description:     (p[8] || '').trim().replace(/^"|"$/g, ''),
              };
            });
          }

          rows = rows.filter(r => r.titleFa && r.titleEn);
          if (rows.length === 0) { showToast(t('هیچ داده‌ای برای ورود وجود ندارد', 'No valid rows to import'), 'warning'); return; }

          let insertedCount = 0, updatedCount = 0;
          const rowErrors = [];
          const codeToId = {};
          data.forEach(d => { if (d.code) codeToId[d.code] = d.id; });

          for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
            const row = rows[rowIdx];
            const rowLabel = isRtl ? `ردیف ${rowIdx + 2}` : `Row ${rowIdx + 2}`;
            try {
              // اگر هیچ‌کدام انتخاب نشده، پیش‌فرض مرکز هزینه
              if (!row.isCostCenter && !row.isBenefitCenter) row.isCostCenter = true;

              const centerKind = VALID_KINDS.has(row.centerKind) ? row.centerKind : 'DEPARTMENT';
              let finalCode = row.code;
              let consumeAutoNumber = false;
              if (!finalCode && window.AutoNumberingService) {
                try {
                  const preview = await window.AutoNumberingService.previewNext('COST_BENEFIT_CENTER');
                  finalCode = typeof preview === 'string' ? preview : (preview?.formattedCode || '');
                  consumeAutoNumber = !!finalCode;
                } catch (_) {}
              }
              const matchedOffice = row.officeTitle ? offices.find(o => o.label.trim() === row.officeTitle.trim()) : null;
              if (row.officeTitle && !matchedOffice) {
                rowErrors.push(`${rowLabel}: دفتر «${row.officeTitle}» یافت نشد، فیلد محل مرکز خالی ماند.`);
              }
              const payload = {
                code:             finalCode || null,
                title_fa:         row.titleFa,
                title_en:         row.titleEn,
                center_kind:      centerKind,
                is_cost_center:   row.isCostCenter,
                is_benefit_center: row.isBenefitCenter,
                is_active:        row.isActive,
                office_id:        matchedOffice ? matchedOffice.id : null,
                description:      row.description || null,
                updated_at:       new Date().toISOString(),
              };
              const existingId = finalCode ? codeToId[finalCode] : null;
              if (existingId) {
                const { error } = await supabase.from('fm_cost_benefit_centers').update(payload).eq('id', existingId);
                if (error) throw error;
                updatedCount++;
              } else {
                const { data: ins, error } = await supabase.from('fm_cost_benefit_centers').insert([payload]).select('id, code').single();
                if (error) throw error;
                if (ins) codeToId[ins.code || finalCode] = ins.id;
                if (consumeAutoNumber && window.AutoNumberingService) {
                  await window.AutoNumberingService.consumeNext('COST_BENEFIT_CENTER').catch(() => {});
                }
                insertedCount++;
              }
            } catch (err) {
              rowErrors.push(`${rowLabel} («${row.titleFa}»): ${isRtl ? 'خطا در ذخیره‌سازی' : 'Save error'} — ${err?.message || ''}`);
            }
          }

          await fetchData();
          if (rowErrors.length > 0) {
            setImportErrors({ isOpen: true, errors: rowErrors, insertedCount, updatedCount });
          } else {
            showToast(isRtl ? `ورود کامل شد: ${insertedCount} جدید، ${updatedCount} به‌روز` : `Import done: ${insertedCount} inserted, ${updatedCount} updated`, 'success');
          }
        } catch (err) {
          console.error('Import error:', err);
          showToast(t('خطا در پردازش فایل', 'Error processing file'), 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }, [data, offices, supabase, fetchData, showToast, isRtl, t]);

    /* ── grid columns ── */
    const columns = [
      {
        field: 'code',
        header_fa: 'کد',
        header_en: 'Code',
        width: '120px',
        render: (val) => <span className="font-mono font-bold text-slate-700 dark:text-slate-200" dir="ltr">{val}</span>,
      },
      { field: 'titleFa', header_fa: 'عنوان فارسی', header_en: 'Persian Title', width: '190px' },
      { field: 'titleEn', header_fa: 'عنوان لاتین',  header_en: 'English Title', width: '190px',
        render: (val) => <span dir="ltr">{val}</span> },
      {
        field: 'centerKind',
        header_fa: 'نوع مرکز',
        header_en: 'Kind',
        width: '120px',
        render: (val) => <span>{getKindLabel(val)}</span>,
      },
      {
        field: 'isCostCenter',
        header_fa: 'نوع',
        header_en: 'Type',
        width: '130px',
        render: (_, row) => (
          <div className="flex gap-1 flex-wrap">
            {getCenterTypeBadges(row).map((b, i) => (
              <span key={i} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
            ))}
          </div>
        ),
      },
      { field: 'officeName', header_fa: 'محل مرکز', header_en: 'Location', width: '150px',
        render: (val) => <span>{val || '-'}</span> },
      { field: 'description', header_fa: 'توضیحات', header_en: 'Description', width: '180px',
        render: (val) => <span className="text-slate-500 dark:text-slate-400">{val || '-'}</span> },
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
      { field: 'label',   header_fa: 'عنوان دفتر', header_en: 'Office',       width: '200px' },
      { field: 'orgName', header_fa: 'سازمان',     header_en: 'Organization', width: '180px' },
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مراکز هزینه / درآمد', 'Cost & Benefit Centers')}
          icon={LayoutGrid}
          description={t('تعریف و مدیریت مراکز هزینه و درآمد سازمان', 'Define and manage cost and benefit centers')}
          language={language}
          breadcrumbs={[
            { label: t('مالی', 'Financial') },
            { label: t('مراکز هزینه / درآمد', 'Cost & Benefit Centers') },
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
              onDownloadSample={handleDownloadSample}
              onImport={access.canCreate ? handleImport : undefined}
              actions={[
                { icon: Edit,   tooltip: t('ویرایش', 'Edit'),   onClick: (row) => handleOpenModal(row),                                            className: 'text-slate-400 hover:text-indigo-600' },
                { icon: Trash2, tooltip: t('حذف', 'Delete'),    onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 hover:text-red-600'    },
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
          title={currentRecord ? t('ویرایش مرکز', 'Edit Center') : t('تعریف مرکز جدید', 'New Center')}
          width="max-w-xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* کد مرکز */}
              <TextField
                size="sm"
                label={t('کد مرکز', 'Center Code')}
                value={formData.code}
                onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                isRtl={isRtl}
                dir="ltr"
                formCode={FORM_CODE}
              />

              {/* محل مرکز (دفتر) */}
              <LOVField
                size="sm"
                label={t('محل مرکز (دفتر)', 'Location (Office)')}
                data={offices}
                columns={officelovColumns}
                dropdownWidth="min-w-[420px]"
                displayValue={formData.officeName}
                onChange={r => setFormData(p => ({ ...p, officeId: r?.id ?? null, officeName: r?.label ?? '' }))}
                onClear={() => setFormData(p => ({ ...p, officeId: null, officeName: '' }))}
                isRtl={isRtl}
                formCode={FORM_CODE}
              />

              {/* عنوان فارسی */}
              <TextField
                size="sm"
                label={t('عنوان فارسی', 'Persian Title')}
                value={formData.titleFa}
                onChange={e => setFormData(p => ({ ...p, titleFa: e.target.value }))}
                isRtl={isRtl}
                required
                formCode={FORM_CODE}
              />

              {/* عنوان لاتین */}
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

              {/* نوع مرکز */}
              <SelectField
                size="sm"
                label={t('نوع مرکز', 'Center Kind')}
                value={formData.centerKind}
                onChange={e => setFormData(p => ({ ...p, centerKind: e.target.value }))}
                options={CENTER_KIND_OPTIONS.map(o => ({ value: o.value, label: isRtl ? o.label_fa : o.label_en }))}
                isRtl={isRtl}
                required
                formCode={FORM_CODE}
              />

              {/* فعال */}
              <div className="flex items-end pb-1">
                <ToggleField
                  size="sm"
                  label={t('فعال', 'Active')}
                  checked={formData.isActive}
                  onChange={v => setFormData(p => ({ ...p, isActive: v }))}
                  isRtl={isRtl}
                  formCode={FORM_CODE}
                />
              </div>

              {/* مرکز هزینه / مرکز درآمد */}
              <div className="md:col-span-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                  {t('تعیین نوع مرکز', 'Center Role')}
                </div>
                <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700">
                  <CheckboxField
                    label={t('مرکز هزینه', 'Cost Center')}
                    checked={formData.isCostCenter}
                    onChange={v => setFormData(p => ({ ...p, isCostCenter: v }))}
                    formCode={FORM_CODE}
                  />
                  <CheckboxField
                    label={t('مرکز درآمد', 'Benefit Center')}
                    checked={formData.isBenefitCenter}
                    onChange={v => setFormData(p => ({ ...p, isBenefitCenter: v }))}
                    formCode={FORM_CODE}
                  />
                </div>
                {!formData.isCostCenter && !formData.isBenefitCenter && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {t('حداقل یک گزینه باید انتخاب شود', 'At least one option must be selected')}
                  </p>
                )}
              </div>

              {/* توضیحات */}
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
                ? t(`آیا از حذف ${deleteConfirm.data?.length} مرکز انتخاب‌شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected centers?`)
                : t(`آیا از حذف مرکز "${deleteConfirm.data?.titleFa}" اطمینان دارید؟`, `Delete center "${deleteConfirm.data?.titleEn || deleteConfirm.data?.titleFa}"?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>
                  {t('انصراف', 'Cancel')}
                </Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">
                  {t('تایید حذف', 'Delete')}
                </Button>
              </div>
            }
          />
        </Modal>

        {/* ─── Import Errors Modal ─── */}
        <Modal
          isOpen={importErrors.isOpen}
          onClose={() => setImportErrors({ isOpen: false, errors: [], insertedCount: 0, updatedCount: 0 })}
          title={t('گزارش خطاهای ایمپورت', 'Import Error Report')}
          language={language}
          width="max-w-lg"
        >
          <div className="p-4 flex flex-col gap-3">
            {(importErrors.insertedCount > 0 || importErrors.updatedCount > 0) && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg px-3 py-2 text-[13px] font-medium border border-emerald-200 dark:border-emerald-800">
                <span>✓</span>
                <span>{t(`${importErrors.insertedCount} ردیف جدید درج شد، ${importErrors.updatedCount} ردیف به‌روز شد.`, `${importErrors.insertedCount} inserted, ${importErrors.updatedCount} updated.`)}</span>
              </div>
            )}
            <div className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
              {t(`${importErrors.errors.length} ردیف با خطا مواجه شد:`, `${importErrors.errors.length} row(s) had errors:`)}
            </div>
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900">
              {importErrors.errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[12px] text-red-600 dark:text-red-400 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setImportErrors({ isOpen: false, errors: [], insertedCount: 0, updatedCount: 0 })}>
                {t('بستن', 'Close')}
              </Button>
            </div>
          </div>
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

  window.CostBenefitCenters = CostBenefitCenters;
})();
