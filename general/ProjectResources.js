/* Filename: general/ProjectResources.js */
/* Personnel assignment modal for a project – extracted from ProjectManagement.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  // ── Design System ──────────────────────────────────────────────────────────
  const DS         = window.DesignSystem || {};
  const DSCore     = window.DSCore     || DS;
  const DSForms    = window.DSForms    || DS;
  const DSGrid     = window.DSGrid     || DS;
  const DSFeedback = window.DSFeedback || DS;

  const FallbackComponent = () => null;
  const safeComp = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    return FallbackComponent;
  };

  const Button     = safeComp(DSCore,     'Button');
  const Badge      = safeComp(DSCore,     'Badge');
  const Modal      = safeComp(DSFeedback, 'Modal') !== FallbackComponent
                      ? safeComp(DSFeedback, 'Modal')
                      : safeComp(DSCore,     'Modal');

  const TextField  = safeComp(DSForms, 'TextField');
  const ToggleField = safeComp(DSForms, 'ToggleField');
  const DatePicker = safeComp(DSForms, 'DatePicker');

  const DataGrid   = safeComp(DSGrid, 'DataGrid');
  const LOVField   = safeComp(DSGrid, 'LOVField');

  // ── Icons ──────────────────────────────────────────────────────────────────
  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const safeIcon = (name) => {
    const c = LucideIcons[name];
    return (typeof c === 'function' || (c && c.$$typeof)) ? c : FallbackIcon;
  };
  const Edit   = safeIcon('Edit');
  const Trash2 = safeIcon('Trash2');
  const Save   = safeIcon('Save');
  const X      = safeIcon('X');

  const supabase = window.supabase;

  // ── ROW_HEIGHT × 10 rows + header → fixed min-height to prevent grid shrink
  const GRID_MIN_HEIGHT = 460; // px — keeps modal stable while editing

  // ════════════════════════════════════════════════════════════════════════════
  // ProjectResources
  // ════════════════════════════════════════════════════════════════════════════
  const ProjectResources = ({
    project,       // { id, title, start_date, actual_end_date } | null
    isOpen,        // boolean
    onClose,       // () => void
    allParties,    // full party list (from ProjectManagement fetchData)
    showToast,     // (message, type) => void
    language = 'fa'
  }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const { useCalendarMode: _useCalendarMode, formatGlobalDate: _formatGlobalDate } = window.DSCore || {};
    const calendarMode = _useCalendarMode ? _useCalendarMode() : (window.DSCore?.getGlobalCalendarMode?.() || 'jalali');

    // ── State ──────────────────────────────────────────────────────────────
    const [personnelList, setPersonnelList]           = useState([]);
    const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
    const [inlinePersonnelEdit, setInlinePersonnelEdit] = useState(null);
    // null | { id: 'new' | rowId, data: { party_id, party_obj, start_date, end_date, participation_percent, is_active } }

    // ── Derived: employees ────────────────────────────────────────────────
    const employeeParties = useMemo(() =>
      (allParties || [])
        .filter(p => Array.isArray(p.roles) && p.roles.includes('employee') && p.is_active !== false)
        .map(p => ({
          id: p.id, value: p.id,
          code: p.code || '',
          title: p.party_type === 'legal'
            ? (p.company_name || '')
            : `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          label: p.party_type === 'legal'
            ? (p.company_name || '')
            : `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          mobile: p.mobile || ''
        })),
    [allParties]);

    // employees not already assigned (excluding currently-edited row)
    const availableEmployees = useMemo(() =>
      employeeParties.filter(e =>
        !personnelList.some(p =>
          String(p.party_id) === String(e.id) &&
          (!inlinePersonnelEdit || String(p.id) !== String(inlinePersonnelEdit.id))
        )
      ),
    [employeeParties, personnelList, inlinePersonnelEdit]);

    // ── Helpers ────────────────────────────────────────────────────────────
    const fmtDate = useCallback((v) => {
      if (!v) return '-';
      if (_formatGlobalDate) return _formatGlobalDate(v, calendarMode);
      try {
        return new Date(v).toLocaleDateString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          calendar: calendarMode === 'jalali' ? 'persian' : 'gregory'
        });
      } catch { return v; }
    }, [calendarMode, _formatGlobalDate]);

    const getPartyName = useCallback((partyId) => {
      if (!partyId) return '-';
      const p = (allParties || []).find(x => x.id === partyId);
      if (!p) return '-';
      return p.party_type === 'legal'
        ? (p.company_name || '-')
        : `${p.first_name || ''} ${p.last_name || ''}`.trim() || '-';
    }, [allParties]);

    // ── Load personnel when modal opens ───────────────────────────────────
    useEffect(() => {
      if (!isOpen || !project?.id) { setPersonnelList([]); return; }
      setInlinePersonnelEdit(null);
      setIsLoadingPersonnel(true);
      supabase
        .from('gen_project_personnel')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true })
        .then(({ data: rows, error }) => {
          if (error) {
            showToast?.(t('خطا در دریافت پرسنل', 'Error fetching personnel'), 'error');
          } else {
            setPersonnelList(rows || []);
          }
          setIsLoadingPersonnel(false);
        });
    }, [isOpen, project?.id]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleAdd = () => {
      if (inlinePersonnelEdit) return;
      setInlinePersonnelEdit({
        id: 'new',
        data: { party_id: '', party_obj: null, start_date: '', end_date: '', participation_percent: 100, is_active: true }
      });
    };

    const handleSave = async () => {
      const form = inlinePersonnelEdit?.data;
      if (!form?.party_id) {
        showToast?.(t('انتخاب پرسنل الزامی است', 'Personnel selection is required'), 'error');
        return;
      }
      try {
        const payload = {
          project_id:            project.id,
          party_id:              form.party_id,
          start_date:            form.start_date || null,
          end_date:              form.end_date   || null,
          participation_percent: parseFloat(form.participation_percent) || 100,
          is_active:             form.is_active
        };
        if (inlinePersonnelEdit.id === 'new') {
          const { data: newRow, error } = await supabase
            .from('gen_project_personnel')
            .insert([{ ...payload, created_at: new Date().toISOString() }])
            .select().single();
          if (error) throw error;
          setPersonnelList(prev => [...prev, newRow]);
        } else {
          const { error } = await supabase
            .from('gen_project_personnel')
            .update(payload).eq('id', inlinePersonnelEdit.id);
          if (error) throw error;
          setPersonnelList(prev =>
            prev.map(r => r.id === inlinePersonnelEdit.id ? { ...r, ...payload } : r)
          );
        }
        setInlinePersonnelEdit(null);
        showToast?.(t('پرسنل ذخیره شد', 'Personnel saved'), 'success');
      } catch (err) {
        console.error('Save personnel error:', err);
        showToast?.(t('خطا در ذخیره پرسنل', 'Error saving personnel'), 'error');
      }
    };

    const handleDelete = async (rowId) => {
      try {
        const { error } = await supabase.from('gen_project_personnel').delete().eq('id', rowId);
        if (error) throw error;
        setPersonnelList(prev => prev.filter(r => r.id !== rowId));
        if (inlinePersonnelEdit?.id === rowId) setInlinePersonnelEdit(null);
        showToast?.(t('ردیف حذف شد', 'Row deleted'), 'success');
      } catch (err) {
        showToast?.(t('خطا در حذف', 'Error deleting'), 'error');
      }
    };

    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase.from('gen_project_personnel')
          .update({ is_active: newValue }).eq('id', row.id);
        if (error) throw error;
        setPersonnelList(prev => prev.map(r => r.id === row.id ? { ...r, is_active: newValue } : r));
      } catch (err) {
        showToast?.(t('خطا در تغییر وضعیت', 'Error updating status'), 'error');
      }
    };

    // ── Grid data: prepend 'new' row at top when adding ───────────────────
    const gridData = useMemo(() => {
      const list = [...personnelList];
      if (inlinePersonnelEdit?.id === 'new')
        list.unshift({ id: 'new', _isNew: true, ...inlinePersonnelEdit.data });
      return list;
    }, [personnelList, inlinePersonnelEdit]);

    // ── Columns ────────────────────────────────────────────────────────────
    const columns = [
      {
        field: 'party_id', header_fa: 'پرسنل', header_en: 'Personnel', width: '220px',
        render: (val, row) => {
          if (inlinePersonnelEdit?.id === row.id) {
            return (
              <div onClick={e => e.stopPropagation()}>
                <LOVField size="sm" data={availableEmployees}
                  columns={[
                    { field: 'code',   header_fa: 'کد',     header_en: 'Code',   width: '70px'  },
                    { field: 'label',  header_fa: 'نام',    header_en: 'Name',   width: '170px' },
                    { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '110px' }
                  ]}
                  dropdownWidth="min-w-[400px]"
                  displayValue={inlinePersonnelEdit.data.party_obj ? inlinePersonnelEdit.data.party_obj.label : ''}
                  onChange={r => setInlinePersonnelEdit(prev => ({
                    ...prev,
                    data: { ...prev.data, party_id: r?.value || r?.id || '', party_obj: r }
                  }))}
                />
              </div>
            );
          }
          return <span className="font-bold text-slate-700 dark:text-slate-200">{getPartyName(val)}</span>;
        }
      },
      {
        field: 'start_date', header_fa: 'تاریخ شروع', header_en: 'Start Date', width: '150px',
        render: (val, row) => {
          if (inlinePersonnelEdit?.id === row.id) {
            return (
              <div onClick={e => e.stopPropagation()}>
                <DatePicker size="sm" value={inlinePersonnelEdit.data.start_date}
                  onChange={v => setInlinePersonnelEdit(prev => ({ ...prev, data: { ...prev.data, start_date: v } }))}
                  isRtl={isRtl} language={language} />
              </div>
            );
          }
          return val
            ? <span className="text-[12px]" dir="ltr">{fmtDate(val)}</span>
            : <span className="text-slate-400 italic text-[12px]">{t('از شروع پروژه', 'From project start')}</span>;
        }
      },
      {
        field: 'end_date', header_fa: 'تاریخ پایان', header_en: 'End Date', width: '150px',
        render: (val, row) => {
          if (inlinePersonnelEdit?.id === row.id) {
            return (
              <div onClick={e => e.stopPropagation()}>
                <DatePicker size="sm" value={inlinePersonnelEdit.data.end_date}
                  onChange={v => setInlinePersonnelEdit(prev => ({ ...prev, data: { ...prev.data, end_date: v } }))}
                  isRtl={isRtl} language={language} />
              </div>
            );
          }
          return val
            ? <span className="text-[12px]" dir="ltr">{fmtDate(val)}</span>
            : <span className="text-slate-400 italic text-[12px]">{t('تا پایان پروژه', 'Until project end')}</span>;
        }
      },
      {
        field: 'participation_percent', header_fa: 'درصد مشارکت', header_en: 'Participation %', width: '130px',
        render: (val, row) => {
          if (inlinePersonnelEdit?.id === row.id) {
            return (
              <div onClick={e => e.stopPropagation()}>
                <TextField size="sm"
                  value={String(inlinePersonnelEdit.data.participation_percent)}
                  onChange={e => setInlinePersonnelEdit(prev => ({
                    ...prev, data: { ...prev.data, participation_percent: e.target.value }
                  }))}
                  isRtl={isRtl} dir="ltr" type="number" min="0" max="100" />
              </div>
            );
          }
          return <Badge variant="indigo" size="sm">{val ?? 100}%</Badge>;
        }
      },
      {
        field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '90px',
        render: (val, row) => {
          if (inlinePersonnelEdit?.id === row.id) {
            return (
              <div onClick={e => e.stopPropagation()}>
                <ToggleField size="sm" checked={inlinePersonnelEdit.data.is_active}
                  onChange={v => setInlinePersonnelEdit(prev => ({ ...prev, data: { ...prev.data, is_active: v } }))}
                  isRtl={isRtl} />
              </div>
            );
          }
          return null; // DataGrid renders toggle via type:'toggle'
        },
        type: 'toggle',
        onToggle: (row, val) => { if (!inlinePersonnelEdit) handleToggleActive(row, val); }
      }
    ];

    const actions = [
      {
        icon: Save, tooltip: t('ذخیره', 'Save'),
        hidden: (row) => inlinePersonnelEdit?.id !== row.id,
        onClick: () => handleSave(),
        className: '!text-emerald-600 hover:!text-emerald-800'
      },
      {
        icon: X, tooltip: t('انصراف', 'Cancel'),
        hidden: (row) => inlinePersonnelEdit?.id !== row.id,
        onClick: () => setInlinePersonnelEdit(null),
        className: '!text-slate-500 hover:!text-slate-700'
      },
      {
        icon: Edit, tooltip: t('ویرایش', 'Edit'),
        hidden: (row) => inlinePersonnelEdit?.id === row.id || !!row._isNew,
        onClick: (row) => {
          const emp = employeeParties.find(e => String(e.id) === String(row.party_id));
          setInlinePersonnelEdit({
            id: row.id,
            data: {
              party_id: row.party_id, party_obj: emp || null,
              start_date: row.start_date || '', end_date: row.end_date || '',
              participation_percent: row.participation_percent ?? 100,
              is_active: row.is_active ?? true
            }
          });
        },
        className: 'text-slate-400 hover:text-indigo-500'
      },
      {
        icon: Trash2, tooltip: t('حذف', 'Delete'),
        hidden: (row) => inlinePersonnelEdit?.id === row.id || !!row._isNew,
        onClick: (row) => handleDelete(row.id),
        className: 'text-slate-400 hover:text-red-500'
      }
    ];

    // ── Close handler: also cancel any pending edit ────────────────────────
    const handleClose = () => {
      setInlinePersonnelEdit(null);
      onClose?.();
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={project
          ? `${t('پرسنل مرتبط با پروژه', 'Project Personnel')}: ${project.title}`
          : t('پرسنل مرتبط', 'Related Personnel')}
        width="max-w-4xl"
        language={language}
      >
        <div className="p-4 flex flex-col gap-3">
          {/* Fixed-height wrapper prevents grid from shrinking in edit mode */}
          <div style={{ minHeight: `${GRID_MIN_HEIGHT}px` }} className="flex flex-col">
            <DataGrid
              data={gridData}
              columns={columns}
              language={language}
              isLoading={isLoadingPersonnel}
              onAdd={handleAdd}
              hideImport={true}
              selectable={false}
              onToggle={(row, field, val) => {
                if (field === 'is_active' && !inlinePersonnelEdit) handleToggleActive(row, val);
              }}
              actions={actions}
            />
          </div>
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <Button variant="outline" size="sm" onClick={handleClose}>
              {t('بستن', 'Close')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  window.ProjectResources = ProjectResources;
})();
