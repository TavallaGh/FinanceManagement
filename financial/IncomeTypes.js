/* Filename: financial/IncomeTypes.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    TrendingUp = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon, ListTree = FallbackIcon, AlertTriangle = FallbackIcon
  } = LucideIcons;

  const IncomeTypes = ({ language = 'fa', formCode = 'INCOME_TYPES' }) => {
    const FallbackComponent = () => null;
    
    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, PageHeader = FallbackComponent, Card = FallbackComponent, EmptyState = FallbackComponent } = Core;
    
    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, SelectField = FallbackComponent, ToggleField = FallbackComponent } = Forms;
    
    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent, Alert = FallbackComponent } = Feedback;
    
    const TreeSystem = window.DSTree || window.DesignSystem || {};
    const { Tree = FallbackComponent } = TreeSystem;

    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
        const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
        return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, data: null });
    const isFetching = useRef(false);

    const [rawNodes, setRawNodes] = useState([]);
    
    const [selectedTreeNodeId, setSelectedTreeNodeId] = useState(null);
    const [treeFormData, setTreeFormData] = useState({});
    const [isCreatingNode, setIsCreatingNode] = useState(false);
    const [newTargetParentId, setNewTargetParentId] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (entityType, recordId, action, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: entityType, record_id: String(recordId), action: action, user_name: currentUser, details: details
        }]);
      } catch (err) {
        console.error('Failed to log action:', err);
      }
    }, [supabase, currentUser]);

    const fetchData = useCallback(async (retainNodeId = null) => {
      if (isFetching.current) return;
      isFetching.current = true;
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from('fm_income_types').select('*').order('created_at', { ascending: true });
        if (error) throw error;

        const mappedNodes = (data || []).map(n => ({
          id: n.id,
          parentId: n.parent_id,
          titleFa: n.title_fa,
          titleEn: n.title_en,
          code: n.code,
          isActive: n.is_active
        }));
        
        const isEffectivelyInactive = (nodeId, nodesList) => {
          const node = nodesList.find(n => n.id === nodeId);
          if (!node) return false;
          if (!node.isActive) return true;
          if (node.parentId) {
            return isEffectivelyInactive(node.parentId, nodesList);
          }
          return false;
        };

        mappedNodes.forEach(n => {
          const baseTitle = isRtl ? n.titleFa : (n.titleEn || n.titleFa);
          const inactive = isEffectivelyInactive(n.id, mappedNodes);
          n.title = inactive ? `${baseTitle} ${isRtl ? '(غیرفعال)' : '(Inactive)'}` : baseTitle;
        });
        
        setRawNodes(mappedNodes);

        if (retainNodeId) {
          const target = mappedNodes.find(n => n.id === retainNodeId);
          if (target) {
             setSelectedTreeNodeId(target.id);
             setTreeFormData({ ...target });
             setIsCreatingNode(false);
             setNewTargetParentId(null);
          }
        }
      } catch (err) {
        showToast(t('خطا در دریافت اطلاعات انواع درآمد', 'Error fetching income types'), 'error');
        console.error('Fetch error:', err);
      } finally {
        isFetching.current = false;
      }
    }, [supabase, showToast, t, isRtl]);

    useEffect(() => {
      let mounted = true;
      if (mounted && access.canView) {
        fetchData();
      }
      return () => { mounted = false; };
    }, [fetchData, access.canView]);

    const handleSelectTreeNode = (node) => {
      setSelectedTreeNodeId(node.id);
      setTreeFormData({ ...node });
      setIsCreatingNode(false);
      setNewTargetParentId(null);
    };

    const handleAddTreeRoot = async () => {
      setSelectedTreeNodeId(null);
      setIsCreatingNode(true);
      setNewTargetParentId(null);
      
      let nextCode = '';
      if (window.AutoNumberingService) {
        try {
            const preview = await window.AutoNumberingService.previewNext('INCOME_TYPE');
            if (preview && preview.formattedCode) {
                nextCode = preview.formattedCode;
            } else if (typeof preview === 'string') {
                nextCode = preview;
            }
        } catch (err) {
            console.error('AutoNumbering Error:', err);
        }
      }
      
      setTreeFormData({ code: nextCode, titleFa: '', titleEn: '', parentId: null, isActive: true });
    };

    const handleAddTreeChild = async (parentNode) => {
      setSelectedTreeNodeId(null);
      setIsCreatingNode(true);
      setNewTargetParentId(parentNode.id);
      
      let nextCode = '';
      if (window.AutoNumberingService) {
        try {
            const preview = await window.AutoNumberingService.previewNext('INCOME_TYPE');
            if (preview && preview.formattedCode) {
                nextCode = preview.formattedCode;
            } else if (typeof preview === 'string') {
                nextCode = preview;
            }
        } catch (err) {
            console.error('AutoNumbering Error:', err);
        }
      }
      
      setTreeFormData({ code: nextCode, titleFa: '', titleEn: '', parentId: parentNode.id, isActive: true });
    };

    const handleCancelTreeForm = () => {
      if (isCreatingNode) {
        setIsCreatingNode(false);
        if (newTargetParentId) {
          const parent = rawNodes.find(n => n.id === newTargetParentId);
          if (parent) handleSelectTreeNode(parent);
        } else {
          setSelectedTreeNodeId(null); 
          setTreeFormData({});
        }
      } else {
        const originalNode = rawNodes.find(n => n.id === selectedTreeNodeId);
        if (originalNode) setTreeFormData({ ...originalNode });
      }
    };

    const validateUniqueness = () => {
      const parentIdToCheck = treeFormData.parentId || null;
      const siblings = rawNodes.filter(n => n.parentId === parentIdToCheck && n.id !== treeFormData.id);
      
      const duplicateFa = siblings.some(n => (n.titleFa || '').trim() === (treeFormData.titleFa || '').trim());
      if (duplicateFa) {
        showToast(t('عنوان فارسی در این سطح تکراری است.', 'Persian title is duplicated at this level.'), 'error');
        return false;
      }

      const enVal = (treeFormData.titleEn || '').trim();
      if (enVal !== '') {
        const duplicateEn = siblings.some(n => (n.titleEn || '').trim() === enVal);
        if (duplicateEn) {
          showToast(t('عنوان انگلیسی در این سطح تکراری است.', 'English title is duplicated at this level.'), 'error');
          return false;
        }
      }

      return true;
    };

    const handleSaveTreeForm = async () => {
      if (!treeFormData.titleFa) {
        return showToast(t('عنوان فارسی الزامی است', 'Persian title is required'), 'error');
      }

      if (!validateUniqueness()) return;

      try {
        const payload = {
          code: treeFormData.code,
          title_fa: treeFormData.titleFa,
          title_en: treeFormData.titleEn,
          parent_id: treeFormData.parentId || null,
          is_active: treeFormData.isActive
        };

        let targetNodeId = null;

        if (isCreatingNode) {
          const { data, error } = await supabase.from('fm_income_types').insert([payload]).select();
          if (error) throw error;
          
          if (window.AutoNumberingService) {
             try {
                 await window.AutoNumberingService.consumeNext('INCOME_TYPE');
             } catch(err) {
                 console.error('AutoNumbering consume error:', err);
             }
          }
          
          if (data && data[0]) {
            targetNodeId = data[0].id;
            await logAction('انواع درآمد', targetNodeId, 'create', `ایجاد نوع درآمد جدید: ${payload.title_fa}`);
          }
        } else {
          if (treeFormData.parentId === selectedTreeNodeId) {
             return showToast(t('گره نمی‌تواند زیرمجموعه خودش باشد', 'Cannot be parent to itself'), 'error');
          }
          const { error } = await supabase.from('fm_income_types').update(payload).eq('id', selectedTreeNodeId);
          if (error) throw error;
          targetNodeId = selectedTreeNodeId;
          await logAction('انواع درآمد', targetNodeId, 'update', `ویرایش نوع درآمد: ${payload.title_fa}`);
        }
        
        await fetchData(targetNodeId);
        showToast(t('عملیات با موفقیت انجام شد', 'Operation successful'));
      } catch (err) {
        showToast(t('خطا در ذخیره اطلاعات', 'Error saving data'), 'error');
        console.error('Save error:', err);
      }
    };

    const getDescendantIds = (nodes, parentId) => {
      let ids = [];
      const children = nodes.filter(n => n.parentId === parentId);
      children.forEach(child => {
        ids.push(child.id);
        ids = ids.concat(getDescendantIds(nodes, child.id));
      });
      return ids;
    };

    const handleDeleteTreeNode = (node) => {
      const descendants = getDescendantIds(rawNodes, node.id);
      if (descendants.length > 0) {
        return showToast(t('این نود دارای زیرمجموعه است و قابل حذف نیست', 'Node has children and cannot be deleted'), 'error');
      }
      setDeleteConfirm({ isOpen: true, data: node });
    };

    const executeDelete = async () => {
      if (!deleteConfirm.data) return;
      try {
        const targetId = deleteConfirm.data.id;
        const targetTitle = deleteConfirm.data.titleFa;

        const { error } = await supabase.from('fm_income_types').delete().eq('id', targetId);
        if (error) throw error;
        
        await logAction('انواع درآمد', targetId, 'delete', `حذف نوع درآمد: ${targetTitle}`);
        
        const newRawNodes = rawNodes.filter(n => n.id !== targetId);
        setRawNodes(newRawNodes);

        if (selectedTreeNodeId === targetId) {
           const parentId = deleteConfirm.data.parentId;
           if (parentId) {
              const parent = newRawNodes.find(n => n.id === parentId);
              if (parent) handleSelectTreeNode(parent);
              else { setSelectedTreeNodeId(null); setTreeFormData({}); setIsCreatingNode(false); }
           } else {
              setSelectedTreeNodeId(null); setTreeFormData({}); setIsCreatingNode(false);
           }
        }

        showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful'));
        setDeleteConfirm({ isOpen: false, data: null });
      } catch (err) {
        showToast(t('امکان حذف رکورد دارای وابستگی وجود ندارد', 'Cannot delete record with relations'), 'error');
        setDeleteConfirm({ isOpen: false, data: null });
        console.error('Delete error:', err);
      }
    };

    const handleDownloadSample = () => {
      const headers = isRtl
        ? 'کد (خالی = اتوماتیک),عنوان فارسی,عنوان انگلیسی,کد والد (خالی = ریشه),وضعیت (1/0)'
        : 'Code (empty=auto),Persian Title,English Title,Parent Code (empty=root),Status (1/0)';
      const sampleRows = [
        `,درآمدهای عملیاتی,Operational Income,,1`,
        `,فروش کالا و خدمات,Sales of Goods,,1`,
        `,درآمد سرمایه‌گذاری,Investment Income,,1`,
      ];
      const csv = '\uFEFF' + headers + '\n' + sampleRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'IncomeTypes_Import_Sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleExportTree = () => {
      if (!rawNodes || rawNodes.length === 0)
        return showToast(t('داده‌ای برای خروجی وجود ندارد.', 'No data to export.'), 'warning');

      const headers = isRtl
        ? 'کد,عنوان فارسی,عنوان انگلیسی,کد والد,وضعیت (1/0)'
        : 'Code,Persian Title,English Title,Parent Code,Status (1/0)';
      const csvRows = rawNodes.map(node => {
        const parent = rawNodes.find(n => n.id === node.parentId);
        const parentCode = parent ? (parent.code || '') : '';
        const titleFa = `"${(node.titleFa || '').replace(/"/g, '""')}"`;
        const titleEn = `"${(node.titleEn || '').replace(/"/g, '""')}"`;
        return `${node.code || ''},${titleFa},${titleEn},${parentCode},${node.isActive ? '1' : '0'}`;
      });
      const csv = '\uFEFF' + headers + '\n' + csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'IncomeTypes_Export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleImportTree = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let rows;
          if (window.XLSX) {
            const wb = window.XLSX.read(e.target.result, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawRows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (rawRows.length < 2) return showToast(t('فایل خالی یا نامعتبر است', 'File is empty or invalid'), 'error');
            rows = rawRows.slice(1).map(parts => ({
              code:       String(parts[0] ?? '').trim(),
              titleFa:    String(parts[1] ?? '').trim(),
              titleEn:    String(parts[2] ?? '').trim(),
              parentCode: String(parts[3] ?? '').trim(),
              isActive:   String(parts[4] ?? '1').trim() !== '0',
            })).filter(r => r.titleFa);
          } else {
            const cleanText = (new TextDecoder('utf-8')).decode(e.target.result).replace(/^\uFEFF/, '');
            const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) return showToast(t('فایل خالی یا نامعتبر است', 'File is empty or invalid'), 'error');
            rows = lines.slice(1).map(line => {
              const parts = line.split(',');
              return {
                code: (parts[0]||'').trim(), titleFa: (parts[1]||'').trim().replace(/^"|"$/g,''),
                titleEn: (parts[2]||'').trim().replace(/^"|"$/g,''), parentCode: (parts[3]||'').trim(),
                isActive: (parts[4]||'1').trim() !== '0',
              };
            }).filter(r => r.titleFa);
          }

          if (rows.length === 0) return showToast(t('هیچ داده‌ای برای ورود وجود ندارد', 'No data to import'), 'warning');

          rows.sort((a, b) => (!a.parentCode && b.parentCode ? -1 : a.parentCode && !b.parentCode ? 1 : 0));

          const codeToId = {};
          rawNodes.forEach(n => { if (n.code) codeToId[n.code] = n.id; });

          let insertedCount = 0, updatedCount = 0, errorCount = 0;

          for (const row of rows) {
            try {
              const parentId = row.parentCode ? (codeToId[row.parentCode] ?? null) : null;

              let finalCode = row.code;
              let consumeAutoNumber = false;
              if (!finalCode && window.AutoNumberingService) {
                const preview = await window.AutoNumberingService.previewNext('INCOME_TYPE').catch(() => null);
                finalCode = preview?.formattedCode || (typeof preview === 'string' ? preview : '');
                consumeAutoNumber = !!finalCode;
              }

              const payload = {
                code: finalCode || null, title_fa: row.titleFa, title_en: row.titleEn || null,
                parent_id: parentId, is_active: row.isActive,
              };

              const existing = finalCode ? rawNodes.find(n => n.code === finalCode) : null;
              if (existing) {
                const { error } = await supabase.from('fm_income_types').update(payload).eq('id', existing.id);
                if (error) throw error;
                codeToId[finalCode] = existing.id;
                updatedCount++;
              } else {
                const { data: ins, error } = await supabase.from('fm_income_types').insert([payload]).select('id, code');
                if (error) throw error;
                if (ins?.[0]) codeToId[ins[0].code || finalCode] = ins[0].id;
                if (consumeAutoNumber && window.AutoNumberingService)
                  await window.AutoNumberingService.consumeNext('INCOME_TYPE').catch(() => {});
                insertedCount++;
              }
            } catch (err) { console.error('Import row error:', row, err); errorCount++; }
          }

          await fetchData();
          const msg = isRtl
            ? `ورود کامل شد: ${insertedCount} جدید، ${updatedCount} به‌روز${errorCount > 0 ? `، ${errorCount} خطا` : ''}`
            : `Import done: ${insertedCount} inserted, ${updatedCount} updated${errorCount > 0 ? `, ${errorCount} errors` : ''}`;
          showToast(msg, errorCount > 0 ? 'warning' : 'success');
        } catch (err) {
          showToast(t('خطا در پردازش فایل', 'Error processing file'), 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    };

    const parentNodeOptions = useMemo(() => {
        return rawNodes
            .filter(n => n.id !== treeFormData.id) 
            .map(n => ({ value: n.id, label: isRtl ? n.titleFa : (n.titleEn || n.titleFa) }));
    }, [rawNodes, treeFormData.id, isRtl]);

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('تعریف انواع درآمد', 'Income Types Management')}
          icon={TrendingUp} language={language}
          description={t('مدیریت و دسته‌بندی درختی درآمدهای سیستم', 'Manage and categorize system incomes hierarchically')}
          breadcrumbs={[{ label: t('مدیریت مالی', 'Financial Management') }, { label: t('انواع درآمد', 'Income Types') }]}
        />

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden mt-3 animate-in fade-in duration-300">
          
          <div className="w-full md:w-[40%] h-full min-h-0 shadow-sm overflow-auto bg-slate-50/40 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-700 rounded-xl">
            <Tree 
              data={rawNodes} language={language} formCode={formCode}
              idField="id" parentField="parentId" displayField="title" secondaryField="code" activeField="isActive"
              selectedId={selectedTreeNodeId}
              onSelect={handleSelectTreeNode}
              onAddRoot={access.canCreate ? handleAddTreeRoot : undefined}
              onAddChild={access.canCreate ? handleAddTreeChild : undefined}
              onDelete={access.canDelete ? handleDeleteTreeNode : undefined}
              onExport={handleExportTree}
              onImport={access.canCreate ? handleImportTree : undefined}
              onDownloadSample={handleDownloadSample}
            />
          </div>

          <div className="w-full md:w-[60%] h-full min-h-0 flex flex-col">
            <Card 
              title={isCreatingNode ? (newTargetParentId ? t('ایجاد زیرمجموعه جدید', 'Create New Child') : t('ایجاد درآمد ریشه', 'Create Root Income')) : (selectedTreeNodeId ? t('ویرایش مشخصات نوع درآمد', 'Edit Income Type Details') : t('اطلاعات جزئی', 'Details'))}
              className="h-full border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
              headerClassName="bg-slate-50/80 dark:bg-slate-900/50 shrink-0"
              action={
                (selectedTreeNodeId && !isCreatingNode && access.canDelete) && (
                  <Button size="sm" variant="ghost" icon={Trash2} className="!text-red-500 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/30" onClick={() => handleDeleteTreeNode(rawNodes.find(n => n.id === selectedTreeNodeId))} title={t('حذف', 'Delete')}/>
                )
              }
            >
              {(selectedTreeNodeId || isCreatingNode) ? (
                <div className="flex flex-col h-full min-h-0 p-4">
                  <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1">
                    {isCreatingNode && newTargetParentId && (
                      <Alert 
                        type="info" 
                        message={<span>{t('در حال تعریف زیرمجموعه برای:', 'Defining sub-income for:')} <strong className="dark:text-indigo-300">{rawNodes.find(n => n.id === newTargetParentId)?.titleFa}</strong></span>} 
                      />
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField size="sm" formCode={formCode} label={t('کد درآمد', 'Income Code')} value={treeFormData.code || ''} onChange={(e) => setTreeFormData({...treeFormData, code: e.target.value})} isRtl={isRtl} dir="ltr" />
                        <SelectField size="sm" formCode={formCode} label={t('مجموعه والد', 'Parent Node')} value={treeFormData.parentId || ''} onChange={(e) => setTreeFormData({...treeFormData, parentId: e.target.value})} options={[{value: '', label: t('بدون والد (سطح ریشه)', 'Root Level (No Parent)')}, ...parentNodeOptions]} isRtl={isRtl} disabled={isCreatingNode && newTargetParentId !== null} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField size="sm" formCode={formCode} label={t('عنوان فارسی', 'Persian Title')} value={treeFormData.titleFa || ''} onChange={(e) => setTreeFormData({...treeFormData, titleFa: e.target.value})} isRtl={isRtl} required />
                        <TextField size="sm" formCode={formCode} label={t('عنوان انگلیسی', 'English Title')} value={treeFormData.titleEn || ''} onChange={(e) => setTreeFormData({...treeFormData, titleEn: e.target.value})} isRtl={isRtl} dir="ltr" />
                    </div>

                    <div className="pt-2">
                        <ToggleField size="sm" formCode={formCode} label={t('وضعیت فعال بودن', 'Active Status')} checked={treeFormData.isActive !== false} onChange={(v) => setTreeFormData({...treeFormData, isActive: v})} isRtl={isRtl} wrapperClassName="pt-2" />
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-2">
                            {t('درآمدهای غیرفعال در لیست‌های انتخاب فرم‌های عملیاتی نمایش داده نمی‌شوند.', 'Inactive incomes will not appear in selection dropdowns.')}
                        </p>
                    </div>

                  </div>
                  <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={handleCancelTreeForm}>{t('لغو', 'Cancel')}</Button>
                    {access.canEdit && (
                        <Button size="sm" variant="primary" icon={Save} onClick={handleSaveTreeForm}>{t('ذخیره تغییرات', 'Save Changes')}</Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-0 text-slate-400 dark:text-slate-500 gap-3 text-[12px] font-medium p-4">
                  <EmptyState 
                    icon={ListTree}
                    title={t('گره‌ای انتخاب نشده است', 'No Node Selected')}
                    description={t('برای مشاهده یا ویرایش اطلاعات، یک گره را از درخت انتخاب کنید.', 'Select a node from the tree to view or edit details.')}
                  />
                </div>
              )}
            </Card>
          </div>
          
        </div>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={t(`آیا از حذف نوع درآمد "${deleteConfirm.data?.titleFa}" اطمینان دارید؟`, `Are you sure you want to delete "${deleteConfirm.data?.titleEn || deleteConfirm.data?.titleFa}"?`)}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} className="flex-1">{t('تایید حذف نهایی', 'Delete Now')}</Button>
              </div>
            }
          />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  IncomeTypes.formCode = 'INCOME_TYPES';
  window.IncomeTypes = IncomeTypes;
})();