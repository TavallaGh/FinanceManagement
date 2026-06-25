/* Filename: general/OrgChartMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Save = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon,
    ArrowLeft = FallbackIcon, ArrowRight = FallbackIcon, AlertTriangle = FallbackIcon,
    X = FallbackIcon, RefreshCw = FallbackIcon
  } = LucideIcons;

  const OrgChartMain = ({ chart, onBack, language = 'fa', formCode = 'ORG_CHART' }) => {
    const FallbackComponent = () => null;

    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, Badge = FallbackComponent, Card = FallbackComponent, EmptyState = FallbackComponent, Tabs = FallbackComponent } = Core;

    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, SelectField = FallbackComponent, ToggleField = FallbackComponent, DatePicker = FallbackComponent } = Forms;

    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent, LOVField = FallbackComponent } = Grid;

    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

    const TreeSystem = window.DSTree || window.DesignSystem || {};
    const { Tree = FallbackComponent } = TreeSystem;

    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const { useCalendarMode: _useCalendarMode, formatGlobalDate: _formatGlobalDate } = window.DSCore || {};
    const calendarMode = _useCalendarMode ? _useCalendarMode() : (window.DSCore?.getGlobalCalendarMode?.() || 'jalali');
    const fmtDate = (v) => (v && _formatGlobalDate) ? _formatGlobalDate(v, calendarMode) : (v || '-');

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
      return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true, hasCustomAccess: () => true };
    }, [securityCtx, formCode]);

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [importErrors, setImportErrors] = useState({ isOpen: false, errors: [], insertedCount: 0, updatedCount: 0 });
    const isFetchingEmps = useRef(false);

    const [rawNodes, setRawNodes] = useState([]);
    const [rawPersonnel, setRawPersonnel] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeForm, setNodeForm] = useState({ id: null, code: '', title: '', parentId: '', isActive: true, officeId: '' });
    const [isNodeEditMode, setIsNodeEditMode] = useState(false);
    const [activeNodeTab, setActiveNodeTab] = useState('info');

    const [employees, setEmployees] = useState([]);
    const [inlineAssignEdit, setInlineAssignEdit] = useState(null);
    const [orgOffices, setOrgOffices] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (entityType, recordId, action, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: entityType, record_id: String(recordId), action, user_name: currentUser, details
        }]);
      } catch (err) {
        console.error('Failed to log action:', err);
      }
    }, [supabase, currentUser]);

    const fetchEmployees = useCallback(async () => {
      if (isFetchingEmps.current) return;
      isFetchingEmps.current = true;
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from('parties')
          .select('id, code, first_name, last_name, company_name, party_type, roles, mobile, email')
          .eq('is_active', true);
        if (error) throw error;
        setEmployees((data || []).map(p => ({
          id: p.id,
          code: p.code,
          name: p.party_type === 'legal' ? p.company_name : `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          roles: p.roles || [],
          mobile: p.mobile || '',
          email: p.email || '',
        })));
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        isFetchingEmps.current = false;
      }
    }, [supabase]);

    const fetchOrgOffices = useCallback(async () => {
      try {
        if (!supabase) return;
        const { data: orgs } = await supabase.from('organization_info').select('id').eq('is_active', true).limit(1);
        if (!orgs || orgs.length === 0) return;
        const { data: offices } = await supabase.from('fm_org_offices').select('id, title').eq('org_id', orgs[0].id).eq('is_active', true).order('title');
        setOrgOffices((offices || []).map(o => ({ value: o.id, label: o.title })));
      } catch (err) {
        console.error('Error fetching org offices:', err);
      }
    }, [supabase]);

    const fetchDesignerData = useCallback(async (retainNodeId = null) => {
      if (!chart?.id) return;
      try {
        if (!supabase) return;
        const { data: nData, error: nErr } = await supabase.from('fm_org_chart_nodes').select('*').eq('chart_id', chart.id);
        if (nErr) throw nErr;

        const mappedNodes = (nData || []).map(n => ({
          id: n.id, parentId: n.parent_id, title: n.title, code: n.code, isActive: n.is_active, officeId: n.office_id || ''
        }));
        mappedNodes.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));

        // Propagate inactive status down the tree (display-only, DB not modified)
        const isChainInactive = (pId, list) => {
          if (!pId) return false;
          const parent = list.find(l => String(l.id) === String(pId));
          if (!parent) return false;
          if (!parent.isActive) return true;
          return isChainInactive(parent.parentId, list);
        };
        mappedNodes.forEach(m => {
          if (isChainInactive(m.parentId, mappedNodes)) {
            m.isActive = false;
          }
        });

        setRawNodes(mappedNodes);

        if (mappedNodes.length > 0) {
          const nodeIds = mappedNodes.map(n => n.id);
          const { data: pData, error: pErr } = await supabase.from('fm_org_chart_personnel').select('*').in('node_id', nodeIds);
          if (pErr) throw pErr;
          setRawPersonnel(pData || []);
        } else {
          setRawPersonnel([]);
        }

        if (retainNodeId) {
          const target = mappedNodes.find(n => n.id === retainNodeId);
          if (target) {
            setSelectedNode(target);
            setNodeForm({ id: target.id, code: target.code || '', title: target.title, parentId: target.parentId || '', isActive: target.isActive ?? true, officeId: target.officeId || '' });
            setIsNodeEditMode(true);
          }
        }
      } catch (err) {
        showToast(t('خطا در دریافت ساختار چارت', 'Error fetching chart structure'), 'error');
      }
    }, [supabase, chart, showToast, t]);

    useEffect(() => {
      if (chart?.id) {
        fetchDesignerData();
        fetchEmployees();
        fetchOrgOffices();
      }
    }, [chart, fetchDesignerData, fetchEmployees, fetchOrgOffices]);

    const handleSelectNode = (node) => {
      setSelectedNode(node);
      setNodeForm({ id: node.id, code: node.code || '', title: node.title, parentId: node.parentId || '', isActive: node.isActive ?? true, officeId: node.officeId || '' });
      setIsNodeEditMode(true);
      setActiveNodeTab('info');
      setInlineAssignEdit(null);
    };

    const handlePrepareNewNode = async (parentNode = null) => {
      let nextCode = '';
      if (window.AutoNumberingService) {
        try {
          const preview = await window.AutoNumberingService.previewNext('RG_CHART_NODE');
          nextCode = typeof preview === 'string' ? preview : (preview?.formattedCode || '');
        } catch (err) {
          console.error('AutoNumbering Error:', err);
        }
      }
      setSelectedNode(null);
      setNodeForm({ id: null, code: nextCode, title: '', parentId: parentNode ? parentNode.id : '', isActive: true, officeId: '' });
      setIsNodeEditMode(false);
      setActiveNodeTab('info');
      setInlineAssignEdit(null);
    };

    const handleSaveNode = async () => {
      if (!nodeForm.title) return showToast(t('عنوان گره الزامی است', 'Node title is required'), 'error');
      try {
        const payload = {
          chart_id: chart.id, code: nodeForm.code, title: nodeForm.title,
          parent_id: nodeForm.parentId || null, is_active: nodeForm.isActive,
          office_id: nodeForm.officeId || null
        };
        let targetNodeId = null;
        if (isNodeEditMode && selectedNode) {
          if (nodeForm.parentId === selectedNode.id) return showToast(t('گره نمی‌تواند زیرمجموعه خودش باشد', 'Cannot be parent to itself'), 'error');
          const { error } = await supabase.from('fm_org_chart_nodes').update(payload).eq('id', selectedNode.id);
          if (error) throw error;
          targetNodeId = selectedNode.id;
        } else {
          const { data, error } = await supabase.from('fm_org_chart_nodes').insert([payload]).select();
          if (error) throw error;
          if (data && data[0]) targetNodeId = data[0].id;
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('RG_CHART_NODE'); } catch (e) { console.error(e); }
          }
        }
        await fetchDesignerData(targetNodeId);
        showToast(t('عملیات با موفقیت انجام شد', 'Operation successful'));
      } catch (err) {
        showToast(t('خطا در ذخیره گره', 'Error saving node'), 'error');
      }
    };

    const handleDeleteNode = (node) => {
      setDeleteConfirm({ isOpen: true, type: 'node', data: node.id });
    };

    const handleCancelNode = () => {
      setSelectedNode(null);
      setNodeForm({ id: null, code: '', title: '', parentId: '', isActive: true, officeId: '' });
      setIsNodeEditMode(false);
      setActiveNodeTab('info');
      setInlineAssignEdit(null);
    };

    const handleDownloadSample = () => {
      const header = isRtl ? 'کد گره,عنوان گره,کد گره والد,وضعیت (1/0)' : 'Node Code,Node Title,Parent Code,Active (1/0)';
      const sampleRows = ['001,مدیریت,,1', '002,مالی و اداری,,1', '003,فروش,,1', '003001,تیم فروش شمال,003,1', '003002,تیم فروش جنوب,003,1'];
      const csv = '\uFEFF' + header + '\n' + sampleRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `OrgChart_${chart?.code || 'Sample'}_Import.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleExportNodes = () => {
      if (!rawNodes || rawNodes.length === 0) return showToast(t('داده‌ای برای خروجی وجود ندارد', 'No data to export'), 'warning');
      showToast(t('در حال آماده‌سازی فایل خروجی...', 'Preparing export file...'), 'info');
      try {
        const header = isRtl ? 'کد گره,عنوان گره,کد گره والد,وضعیت (1/0)' : 'Node Code,Node Title,Parent Code,Active (1/0)';
        const csvRows = rawNodes.map(node => {
          const parent = rawNodes.find(n => n.id === node.parentId);
          const parentCode = parent ? (parent.code || '') : '';
          const title = `"${(node.title || '').replace(/"/g, '""')}"`;
          return `${node.code || ''},${title},${parentCode},${node.isActive ? '1' : '0'}`;
        });
        const blob = new Blob(['\uFEFF' + header + '\n' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `OrgChart_${chart?.code || 'Export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        showToast(t('خطا در تولید فایل خروجی', 'Error generating export file'), 'error');
      }
    };

    const handleImportNodes = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = window.XLSX;
          if (!XLSX) return showToast(t('کتابخانه پردازش فایل در دسترس نیست', 'File processing library not available'), 'error');
          const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          if (allRows.length < 2) return showToast(t('فایل خالی یا نامعتبر است', 'File is empty or invalid'), 'error');

          const rows = allRows.slice(1).map(cols => ({
            code: String(cols[0] ?? '').trim(),
            title: String(cols[1] ?? '').trim(),
            parentCode: String(cols[2] ?? '').trim(),
            isActive: String(cols[3] ?? '1').trim() !== '0',
          })).filter(r => r.title);
          if (rows.length === 0) return showToast(t('هیچ داده‌ای برای ورود وجود ندارد', 'No data to import'), 'warning');

          rows.sort((a, b) => {
            if (!a.parentCode && b.parentCode) return -1;
            if (a.parentCode && !b.parentCode) return 1;
            return a.parentCode.localeCompare(b.parentCode);
          });
          const codeToId = {};
          rawNodes.forEach(n => { if (n.code) codeToId[n.code] = n.id; });
          let insertedCount = 0, updatedCount = 0;
          const rowErrors = [];
          for (const row of rows) {
            try {
              const parentId = row.parentCode ? (codeToId[row.parentCode] ?? null) : null;
              const payload = { chart_id: chart.id, code: row.code, title: row.title, parent_id: parentId, is_active: row.isActive };
              const existing = rawNodes.find(n => n.code === row.code);
              if (existing) {
                const { error } = await supabase.from('fm_org_chart_nodes').update(payload).eq('id', existing.id);
                if (error) throw error;
                codeToId[row.code] = existing.id;
                updatedCount++;
              } else {
                const { data: inserted, error } = await supabase.from('fm_org_chart_nodes').insert([payload]).select('id');
                if (error) throw error;
                if (inserted && inserted.length > 0) codeToId[row.code] = inserted[0].id;
                insertedCount++;
              }
            } catch (err) {
              rowErrors.push(`${t('گره', 'Node')} ${row.code || row.title}: ${err?.message || JSON.stringify(err)}`);
            }
          }
          await fetchDesignerData();
          if (rowErrors.length > 0) {
            setImportErrors({ isOpen: true, errors: rowErrors, insertedCount, updatedCount });
          } else {
            showToast(isRtl ? `ورود اطلاعات کامل شد: ${insertedCount} ردیف جدید، ${updatedCount} ردیف به‌روز شد` : `Import complete: ${insertedCount} inserted, ${updatedCount} updated`, 'success');
          }
        } catch (err) {
          showToast(t('خطا در پردازش فایل', 'Error processing file'), 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    };

    const personnelDataForSelectedNode = useMemo(() => {
      if (!selectedNode) return [];
      return rawPersonnel.filter(p => p.node_id === selectedNode.id);
    }, [rawPersonnel, selectedNode]);

    const employeeOptions = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return employees
        .filter(e => {
          if (!e.roles || !e.roles.includes('employee')) return false;
          return !personnelDataForSelectedNode.some(p => String(p.person_id) === String(e.id) && (!inlineAssignEdit || String(p.id) !== String(inlineAssignEdit.id)));
        })
        .map(e => {
          const isNotStarted = e.validFrom && e.validFrom > today;
          const isExpired = e.validTo && e.validTo < today;
          const isInvalid = isNotStarted || isExpired;
          return {
            id: e.id, value: e.id, label: e.name, code: e.code,
            mobile: e.mobile || '-', email: e.email || '-',
            isInvalid,
            invalidTag: isNotStarted ? t('نامعتبر', 'Not Active') : (isExpired ? t('منقضی', 'Expired') : ''),
          };
        });
    }, [employees, personnelDataForSelectedNode, inlineAssignEdit, t]);

    const personnelGridData = useMemo(() => {
      const data = [...personnelDataForSelectedNode];
      if (inlineAssignEdit && inlineAssignEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineAssignEdit.data });
      return data;
    }, [personnelDataForSelectedNode, inlineAssignEdit]);

    const handleAddAssignmentClick = () => {
      if (inlineAssignEdit) return;
      setInlineAssignEdit({ id: 'new', data: { person_id: '', person_obj: null, person_name: '', from_date: '', to_date: '', is_manager: false } });
    };

    const handleSaveAssignment = async () => {
      const form = inlineAssignEdit?.data;
      if (!form || !form.person_id || !selectedNode) return;
      const personName = form.person_name || form.person_obj?.label || '';
      try {
        if (form.is_manager) {
          const others = personnelDataForSelectedNode.filter(p => p.is_manager && String(p.id) !== String(inlineAssignEdit.id));
          for (const other of others) {
            await supabase.from('fm_org_chart_personnel').update({ is_manager: false }).eq('id', other.id);
          }
        }
        const payload = { node_id: selectedNode.id, person_id: form.person_id, person_name: personName, from_date: form.from_date || null, to_date: form.to_date || null, is_manager: form.is_manager };
        if (inlineAssignEdit.id === 'new') {
          const { error } = await supabase.from('fm_org_chart_personnel').insert([payload]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_org_chart_personnel').update(payload).eq('id', inlineAssignEdit.id);
          if (error) throw error;
        }
        await fetchDesignerData(selectedNode.id);
        setInlineAssignEdit(null);
        showToast(t('تخصیص پرسنل انجام شد', 'Personnel assigned'));
      } catch (err) {
        showToast(t('خطا در ذخیره تخصیص', 'Error saving assignment'), 'error');
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'node') {
          const { error } = await supabase.from('fm_org_chart_nodes').delete().eq('id', deleteConfirm.data);
          if (error) throw error;
          await fetchDesignerData();
          handleCancelNode();
        } else if (deleteConfirm.type === 'personnel') {
          const { error } = await supabase.from('fm_org_chart_personnel').delete().eq('id', deleteConfirm.data);
          if (error) throw error;
          await fetchDesignerData(selectedNode.id);
          if (inlineAssignEdit && inlineAssignEdit.id === deleteConfirm.data) setInlineAssignEdit(null);
        }
        showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful'));
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        showToast(t('امکان حذف رکورد دارای وابستگی وجود ندارد', 'Cannot delete record with relations'), 'error');
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } finally {
        setIsLoading(false);
      }
    };

    const personnelColumns = [
      {
        field: 'person_id', header_fa: 'نام شخص', header_en: 'Person Name', width: '250px',
        render: (val, row) => {
          if (inlineAssignEdit?.id === row.id) {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <LOVField size="sm" data={employeeOptions}
                  columns={[
                    { field: 'code', header_fa: 'کد', header_en: 'Code', width: '70px' },
                    { field: 'label', header_fa: 'نام کامل', header_en: 'Full Name', width: '170px' },
                    { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '110px' },
                    { field: 'email', header_fa: 'ایمیل', header_en: 'Email', width: '160px' },
                  ]}
                  dropdownWidth="min-w-[560px]"
                  displayValue={inlineAssignEdit.data.person_obj ? inlineAssignEdit.data.person_obj.label : ''}
                  onChange={(r) => setInlineAssignEdit(prev => ({ ...prev, data: { ...prev.data, person_id: r?.value, person_obj: r, person_name: r?.label } }))}
                />
              </div>
            );
          }
          return (() => {
            const today = new Date().toISOString().split('T')[0];
            const isNotStarted = row.from_date && row.from_date > today;
            const isExpired = row.to_date && row.to_date < today;
            return (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200">{row.person_name || val}</span>
                {isNotStarted && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-sm font-medium">{t('\u0646\u0627\u0645\u0639\u062a\u0628\u0631', 'Not Active')}</span>}
                {!isNotStarted && isExpired && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-sm font-medium">{t('\u0645\u0646\u0642\u0636\u06cc', 'Expired')}</span>}
              </div>
            );
          })();
        }
      },
      {
        field: 'is_manager', header_fa: 'مسئول واحد', header_en: 'Manager', width: '100px',
        render: (val, row) => {
          if (inlineAssignEdit?.id === row.id) {
            return <div onClick={(e) => e.stopPropagation()}><ToggleField size="sm" checked={inlineAssignEdit.data.is_manager} onChange={v => setInlineAssignEdit(prev => ({ ...prev, data: { ...prev.data, is_manager: v } }))} isRtl={isRtl} /></div>;
          }
          return <Badge variant={val ? 'indigo' : 'slate'} size="sm" className="text-[10px]">{val ? t('بله', 'Yes') : t('خیر', 'No')}</Badge>;
        }
      },
      {
        field: 'from_date', header_fa: 'از تاریخ', header_en: 'From Date', width: '130px',
        render: (val, row) => {
          if (inlineAssignEdit?.id === row.id) {
            return <div onClick={(e) => e.stopPropagation()}><DatePicker size="sm" value={inlineAssignEdit.data.from_date} onChange={(v) => setInlineAssignEdit(prev => ({ ...prev, data: { ...prev.data, from_date: v } }))} isRtl={isRtl} language={language} /></div>;
          }
          return <span className="text-[12px]" dir="ltr">{fmtDate(val)}</span>;
        }
      },
      {
        field: 'to_date', header_fa: 'تا تاریخ', header_en: 'To Date', width: '130px',
        render: (val, row) => {
          if (inlineAssignEdit?.id === row.id) {
            return <div onClick={(e) => e.stopPropagation()}><DatePicker size="sm" value={inlineAssignEdit.data.to_date} onChange={(v) => setInlineAssignEdit(prev => ({ ...prev, data: { ...prev.data, to_date: v } }))} isRtl={isRtl} language={language} /></div>;
          }
          return <span className="text-[12px]" dir="ltr">{fmtDate(val)}</span>;
        }
      }
    ];

    const personnelActions = [
      { icon: Save, tooltip: t('ذخیره تغییرات', 'Save Changes'), hidden: (row) => inlineAssignEdit?.id !== row.id, onClick: () => handleSaveAssignment(), className: '!text-emerald-600 hover:!text-emerald-800' },
      { icon: X, tooltip: t('انصراف', 'Cancel'), hidden: (row) => inlineAssignEdit?.id !== row.id, onClick: () => setInlineAssignEdit(null), className: '!text-slate-500 hover:!text-slate-700' },
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), hidden: (row) => inlineAssignEdit?.id === row.id || row._isNew, onClick: (row) => {
        const empObj = employeeOptions.find(e => String(e.value) === String(row.person_id));
        setInlineAssignEdit({ id: row.id, data: { person_id: row.person_id, person_obj: empObj, person_name: row.person_name, from_date: row.from_date || '', to_date: row.to_date || '', is_manager: row.is_manager } });
      }, className: 'text-slate-400 hover:text-indigo-500' },
      { id: 'delete', icon: Trash2, tooltip: t('حذف', 'Delete'), hidden: (row) => inlineAssignEdit?.id === row.id || row._isNew, onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'personnel', data: row.id }), className: 'text-red-500 hover:text-red-600' }
    ];

    const parentNodeOptions = rawNodes.filter(n => n.id !== nodeForm.id).map(n => ({ value: n.id, label: n.title }));

    const nodeTabOptions = [
      { id: 'info', label: t('مشخصات', 'Details') },
      ...(isNodeEditMode ? [{ id: 'personnel', label: t('پرسنل مرتبط', 'Personnel') }] : [])
    ];

    const BackIcon = isRtl ? ArrowRight : ArrowLeft;

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between shrink-0 h-12">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" icon={BackIcon} onClick={onBack}>{t('بازگشت به لیست', 'Back')}</Button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1">
                {t('طراحی درخت چارت:', 'Chart Designer:')} <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{chart?.title}</span>
              </h2>
            </div>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => fetchDesignerData()} className="h-8 w-8 px-0" />
          </div>

          <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
            <div className={`w-full md:w-[40%] flex flex-col bg-slate-50/40 dark:bg-slate-900/10 border-b md:border-b-0 ${isRtl ? 'md:border-l' : 'md:border-r'} border-slate-200 dark:border-slate-700 overflow-y-auto`}>
              <Tree
                data={rawNodes} language={language} formCode={formCode}
                idField="id" parentField="parentId" displayField="title" secondaryField="code" activeField="isActive"
                selectedId={selectedNode?.id}
                onSelect={handleSelectNode}
                onAddRoot={() => handlePrepareNewNode(null)}
                onAddChild={(node) => handlePrepareNewNode(node)}
                onDelete={handleDeleteNode}
                onImport={access.canCreate ? handleImportNodes : undefined}
                onExport={handleExportNodes}
                onDownloadSample={handleDownloadSample}
              />
            </div>

            <div className="flex-1 flex flex-col overflow-auto p-4 gap-3 bg-slate-50/50 dark:bg-slate-900/20">
              <Card noPadding={true} className="flex-1 border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 bg-white dark:bg-slate-800 shadow-sm h-full">
                <div className="px-3 pt-3 pb-0 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 shrink-0">
                  <Tabs tabs={nodeTabOptions} activeTab={activeNodeTab} onChange={setActiveNodeTab} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {activeNodeTab === 'info' && (
                    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
                      <div className="flex-1 overflow-auto custom-scrollbar p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <TextField formCode={formCode} label={t('کد گره', 'Node Code')} value={nodeForm.code} onChange={e => setNodeForm({ ...nodeForm, code: e.target.value })} isRtl={isRtl} size="sm" dir="ltr" />
                          <TextField formCode={formCode} label={t('عنوان گره', 'Node Title')} value={nodeForm.title} onChange={e => setNodeForm({ ...nodeForm, title: e.target.value })} isRtl={isRtl} required size="sm" />
                          <SelectField formCode={formCode} label={t('گره والد', 'Parent Node')} value={nodeForm.parentId} onChange={e => setNodeForm({ ...nodeForm, parentId: e.target.value })} isRtl={isRtl} size="sm" options={[{ value: '', label: t('بدون والد (ریشه)', 'Root (No Parent)') }, ...parentNodeOptions]} />
                          <SelectField formCode={formCode} label={t('دفتر مرتبط', 'Associated Office')} value={nodeForm.officeId} onChange={e => setNodeForm({ ...nodeForm, officeId: e.target.value })} isRtl={isRtl} size="sm" options={[{ value: '', label: t('-- بدون دفتر --', '-- None --') }, ...orgOffices]} />
                          <div className="flex items-end pb-1.5">
                            <ToggleField formCode={formCode} label={t('فعال', 'Active')} checked={nodeForm.isActive} onChange={val => setNodeForm({ ...nodeForm, isActive: val })} isRtl={isRtl} wrapperClassName="!mb-0" />
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-2 bg-white dark:bg-slate-800">
                        <Button variant="outline" size="sm" icon={X} onClick={handleCancelNode}>{t('انصراف', 'Cancel')}</Button>
                        {access.canEdit && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveNode}>{t('ذخیره', 'Save')}</Button>}
                      </div>
                    </div>
                  )}

                  {activeNodeTab === 'personnel' && isNodeEditMode && (
                    <div className="flex-1 flex flex-col min-h-[400px] animate-in fade-in duration-200">
                      <DataGrid
                        data={personnelGridData} columns={personnelColumns} actions={personnelActions}
                        language={language} formCode={formCode}
                        hideImport={true} hideExport={true}
                        onAdd={access.canEdit ? handleAddAssignmentClick : undefined}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={t('آیا از حذف این مورد اطمینان دارید؟', 'Are you sure you want to delete this item?')}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Delete Now')}</Button>
              </div>
            }
          />
        </Modal>

        <Modal isOpen={importErrors.isOpen} onClose={() => setImportErrors({ isOpen: false, errors: [], insertedCount: 0, updatedCount: 0 })} title={t('گزارش خطاهای ایمپورت', 'Import Error Report')} language={language} width="max-w-lg">
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
                  <span dir="ltr" className="text-left">{err}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setImportErrors({ isOpen: false, errors: [], insertedCount: 0, updatedCount: 0 })}>{t('بستن', 'Close')}</Button>
            </div>
          </div>
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  OrgChartMain.formCode = 'ORG_CHART';
  window.OrgChartMain = OrgChartMain;
})();
