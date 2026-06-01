/* Filename: financial/ChartOfAccountsMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Network = FallbackIcon, Save = FallbackIcon,
    ArrowLeft = FallbackIcon, ArrowRight = FallbackIcon, AlertTriangle = FallbackIcon,
    Lock = FallbackIcon, Info = FallbackIcon, RefreshCw = FallbackIcon
  } = LucideIcons;

  const ChartOfAccountsMain = ({ chart, onBack, language = 'fa', formCode = 'CHART_OF_ACCOUNTS' }) => {
    const FallbackComponent = () => null;

    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, Card = FallbackComponent, Tabs = FallbackComponent, EmptyState = FallbackComponent } = Core;

    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, SelectField = FallbackComponent, ToggleField = FallbackComponent } = Forms;

    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent } = Feedback;

    const TreeSystem = window.DSTree || window.DesignSystem || {};
    const { Tree = FallbackComponent } = TreeSystem;

    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
      return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const [activeTab, setActiveTab] = useState('details');
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    const [rawAccounts, setRawAccounts] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [isCreatingNode, setIsCreatingNode] = useState(false);
    const [nodeFormData, setNodeFormData] = useState({});
    const [nodeDepth, setNodeDepth] = useState(1);

    const [lookups, setLookups] = useState({
      currencies: [],
      systemUsers: [],
      systemRoles: [],
      userRolesMapping: [],
      systemParties: [],
      balanceGroupsMaster: []
    });

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
        console.error('Action log failed:', err);
      }
    }, [supabase, currentUser]);

    const safeFetch = async (query) => {
      try {
        const res = await query;
        return res.error ? { data: null, error: res.error } : res;
      } catch (e) {
        return { data: null, error: e };
      }
    };

    const fetchLookups = useCallback(async () => {
      try {
        if (!supabase) return;
        const [currRes, userRes, roleRes, userRoleMapRes, partyRes, bgRes] = await Promise.all([
          safeFetch(supabase.from('fm_currencies').select('*')),
          safeFetch(supabase.from('sec_users').select('*')),
          safeFetch(supabase.from('sec_roles').select('*')),
          safeFetch(supabase.from('sec_user_roles').select('*')),
          safeFetch(supabase.from('parties').select('id, first_name, last_name, company_name, party_type')),
          safeFetch(supabase.from('fm_balance_groups').select('id, code, title_fa, title_en, is_active').eq('is_active', true))
        ]);

        setLookups({
          currencies: currRes.data || [],
          systemUsers: (userRes.data || []).filter(u => u.is_active !== false),
          systemRoles: roleRes.data || [],
          userRolesMapping: userRoleMapRes.data || [],
          systemParties: partyRes.data || [],
          balanceGroupsMaster: bgRes.data || []
        });
      } catch (err) {
        console.error('Error fetching lookups:', err);
      }
    }, [supabase]);

    const getNewNodeDepth = useCallback((nodes, parentId) => {
      let depth = 1;
      let currentParentId = parentId;
      while (currentParentId) {
        const pNode = nodes.find(n => String(n.id) === String(currentParentId));
        if (pNode) {
          depth += 1;
          currentParentId = pNode.parentId;
        } else {
          break;
        }
      }
      return depth;
    }, []);

    const suggestNextCode = useCallback((nodes, parentId, depth, currentChart) => {
      const siblings = nodes.filter(n => String(n.parentId || '') === String(parentId || ''));
      let parentPrefix = '';
      if (parentId) {
        const pNode = nodes.find(n => String(n.id) === String(parentId));
        if (pNode) parentPrefix = pNode.code || '';
      }

      let segmentLength = parseInt(currentChart.len_group || 1, 10);
      if (depth === 2) segmentLength = parseInt(currentChart.len_general || 2, 10);
      if (depth === 3) segmentLength = parseInt(currentChart.len_subsidiary || 3, 10);
      if (depth === 4) segmentLength = parseInt(currentChart.len_detail || 4, 10);

      let maxSuffixNum = 0;
      siblings.forEach(s => {
        const sCode = s.code || '';
        if (sCode.startsWith(parentPrefix)) {
          const suffix = sCode.substring(parentPrefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxSuffixNum) {
            maxSuffixNum = num;
          }
        }
      });

      const nextNumStr = String(maxSuffixNum + 1).padStart(segmentLength, '0');
      return parentPrefix + nextNumStr;
    }, []);

    const fetchDesignerData = useCallback(async (retainNodeId = null) => {
      if (!chart) return;
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from('fm_coa_accounts').select('*').eq('chart_id', chart.id).order('code', { ascending: true });
        if (error) throw error;

        const mapped = (data || []).map(a => ({
          id: a.id,
          parentId: a.parent_id,
          code: a.code,
          titleFa: a.title_fa,
          titleEn: a.title_en,
          title: isRtl ? a.title_fa : (a.title_en || a.title_fa),
          currencyId: a.currency_id,
          isActive: a.is_active,
          accountType: a.account_type,
          controlInventory: a.control_inventory
        }));

        const isChainInactive = (pId, list) => {
          if (!pId) return false;
          const parent = list.find(l => String(l.id) === String(pId));
          if (!parent) return false;
          if (!parent.isActive) return true;
          return isChainInactive(parent.parentId, list);
        };

        mapped.forEach(m => {
          const base = isRtl ? `${m.code} - ${m.titleFa}` : `${m.code} - ${m.titleEn || m.titleFa}`;
          const isParentDead = isChainInactive(m.parentId, mapped);
          if (!m.isActive || isParentDead) {
            m.title = `${base} ${t('(غیرفعال)', '(Inactive)')}`;
          }
        });

        setRawAccounts(mapped);

        if (retainNodeId) {
          const match = mapped.find(m => String(m.id) === String(retainNodeId));
          if (match) {
            setSelectedNodeId(match.id);
            setNodeFormData({ ...match });
            setNodeDepth(getNewNodeDepth(mapped, match.parentId));
            setIsCreatingNode(false);
          }
        }
      } catch (err) {
        showToast(t('خطا در بارگذاری ساختار کدینگ', 'Error loading account codes'), 'error');
      }
    }, [chart, supabase, getNewNodeDepth, showToast, t, isRtl]);

    useEffect(() => {
      if (access.canView) {
        fetchLookups();
        fetchDesignerData();
      }
    }, [fetchLookups, fetchDesignerData, access.canView]);

    const handleSelectTreeNode = (node) => {
      setSelectedNodeId(node.id);
      setNodeFormData({ ...node });
      setIsCreatingNode(false);
      setNodeDepth(getNewNodeDepth(rawAccounts, node.parentId));
    };

    const handleAddTreeRoot = () => {
      if (!access.canCreate) return;
      const suggested = suggestNextCode(rawAccounts, null, 1, chart);
      setSelectedNodeId(null);
      setNodeDepth(1);
      setNodeFormData({ code: suggested, titleFa: '', titleEn: '', parentId: null, currencyId: '', isActive: true, accountType: 'main', controlInventory: false });
      setIsCreatingNode(true);
      setActiveTab('details');
    };

    const handleAddTreeChild = (parentNode) => {
      if (!access.canCreate) return;
      const nextDepth = getNewNodeDepth(rawAccounts, parentNode.id);
      if (nextDepth > 4) {
        return showToast(t('امکان تعریف گره جدید فراتر از سطح ۴ (تفصیل) وجود ندارد', 'Cannot add nodes beyond Level 4 (Detail)'), 'error');
      }
      const suggested = suggestNextCode(rawAccounts, parentNode.id, nextDepth, chart);
      
      setSelectedNodeId(null);
      setNodeDepth(nextDepth);
      setNodeFormData({ code: suggested, titleFa: '', titleEn: '', parentId: parentNode.id, currencyId: parentNode.currencyId || '', isActive: true, accountType: 'main', controlInventory: false });
      setIsCreatingNode(true);
      setActiveTab('details');
    };

    const validateNodeUniqueness = () => {
      const pId = nodeFormData.parentId || null;
      const siblings = rawAccounts.filter(n => String(n.parentId || '') === String(pId || '') && String(n.id) !== String(nodeFormData.id));

      const dupFa = siblings.some(s => (s.titleFa || '').trim() === (nodeFormData.titleFa || '').trim());
      if (dupFa) {
        showToast(t('عنوان فارسی در این سطح تکراری است', 'Duplicate Persian title at this level'), 'error');
        return false;
      }

      const enVal = (nodeFormData.titleEn || '').trim();
      if (enVal !== '') {
        const dupEn = siblings.some(s => (s.titleEn || '').trim() === enVal);
        if (dupEn) {
          showToast(t('عنوان انگلیسی در این سطح تکراری است', 'Duplicate English title at this level'), 'error');
          return false;
        }
      }

      const codeDup = rawAccounts.some(n => String(n.id) !== String(nodeFormData.id) && String(n.code) === String(nodeFormData.code));
      if (codeDup) {
        showToast(t('کد حساب وارد شده در کل ساختار تکراری است', 'Account code must be unique globally'), 'error');
        return false;
      }

      return true;
    };

    const handleSaveNodeForm = async () => {
      if (!nodeFormData.titleFa || !nodeFormData.code) {
        return showToast(t('فیلدهای کد و عنوان فارسی الزامی هستند', 'Code and Persian title are required'), 'error');
      }

      if (!validateNodeUniqueness()) return;

      try {
        const payload = {
          chart_id: chart.id,
          parent_id: nodeFormData.parentId || null,
          code: nodeFormData.code?.trim(),
          title_fa: nodeFormData.titleFa?.trim(),
          title_en: nodeFormData.titleEn?.trim() || null,
          currency_id: nodeFormData.currencyId || null,
          is_active: nodeFormData.isActive !== false,
          account_type: nodeFormData.accountType || 'main',
          control_inventory: !!nodeFormData.controlInventory
        };

        let targetId = null;
        if (isCreatingNode) {
          const { data, error } = await supabase.from('fm_coa_accounts').insert([payload]).select();
          if (error) throw error;
          if (data && data.length > 0) {
            targetId = data[0].id;
          } else {
            const { data: fetchNew } = await supabase.from('fm_coa_accounts').select('id').eq('code', payload.code).single();
            if (fetchNew) targetId = fetchNew.id;
          }
          if (targetId) {
             await logAction('حساب کدینگ', targetId, 'create', `ایجاد حساب: ${payload.code} - ${payload.title_fa}`);
          }
        } else {
          if (String(nodeFormData.parentId) === String(selectedNodeId)) {
            return showToast(t('گره نمی‌تواند زیرمجموعه خودش قرار گیرد', 'A node cannot be a child of itself'), 'error');
          }
          const { error } = await supabase.from('fm_coa_accounts').update(payload).eq('id', selectedNodeId);
          if (error) throw error;
          targetId = selectedNodeId;
          await logAction('حساب کدینگ', targetId, 'update', `ویرایش حساب: ${payload.code} - ${payload.title_fa}`);
        }

        if (targetId) {
            await fetchDesignerData(targetId);
        } else {
            await fetchDesignerData();
        }
        showToast(t('اطلاعات حساب با موفقیت ثبت شد', 'Account specifications updated successfully'));
      } catch (err) {
        showToast(t('خطا در ذخیره اطلاعات گره حساب', 'Error saving account specification'), 'error');
      }
    };

    const handleDeleteNode = (node) => {
      const hasChildren = rawAccounts.some(n => String(n.parentId) === String(node.id));
      if (hasChildren) {
        return showToast(t('این حساب دارای زیرمجموعه است و حذف آن امکان‌پذیر نیست', 'Account has children and cannot be removed'), 'error');
      }
      setDeleteConfirm({ isOpen: true, type: 'node', data: node });
    };

    const executeDelete = async () => {
      try {
        if (deleteConfirm.type === 'node') {
          const { error } = await supabase.from('fm_coa_accounts').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await logAction('حساب کدینگ', deleteConfirm.data.id, 'delete', `حذف حساب: ${deleteConfirm.data.code}`);
          await fetchDesignerData();
          setSelectedNodeId(null);
          setNodeFormData({});
          setIsCreatingNode(false);
        }
        showToast(t('رکورد با موفقیت حذف شد', 'Deleted successfully'));
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        showToast(t('امکان حذف رکورد به دلیل وابستگی‌های جانبی وجود ندارد', 'Deletion failed due to existing relationships'), 'error');
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      }
    };

    const handleExportTree = () => {
      if (!rawAccounts || rawAccounts.length === 0) {
         return showToast(t('داده‌ای برای خروجی وجود ندارد.', 'No data to export.'), 'warning');
      }
      
      showToast(t('در حال آماده‌سازی فایل خروجی...', 'Preparing export file...'), 'info');
      
      try {
        const headers = isRtl 
          ? 'کد حساب,عنوان فارسی,عنوان انگلیسی,نوع حساب,ارز,کنترل موجودی,وضعیت' 
          : 'Account Code,Persian Title,English Title,Account Type,Currency,Control Inventory,Status';
        
        const csvRows = rawAccounts.map(row => {
          const code = row.code || '';
          const titleFa = `"${(row.titleFa || '').replace(/"/g, '""')}"`;
          const titleEn = `"${(row.titleEn || '').replace(/"/g, '""')}"`;
          const type = row.accountType === 'main' ? (isRtl ? 'اصلی' : 'Main') : (isRtl ? 'واسط/کنترلی' : 'Intermediate');
          
          let currency = isRtl ? 'ریال' : 'IRR';
          if (row.currencyId) {
             const c = lookups.currencies.find(x => String(x.id) === String(row.currencyId));
             if (c) currency = (isRtl ? (c.title_fa || c.code) : (c.title_en || c.code));
          }
          
          const controlInv = row.controlInventory ? (isRtl ? 'بله' : 'Yes') : (isRtl ? 'خیر' : 'No');
          const status = row.isActive ? (isRtl ? 'فعال' : 'Active') : (isRtl ? 'غیرفعال' : 'Inactive');

          return `${code},${titleFa},${titleEn},${type},${currency},${controlInv},${status}`;
        });

        const csvContent = '\uFEFF' + headers + '\n' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `ChartOfAccounts_${chart?.code || 'Export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        showToast(t('خطا در تولید فایل خروجی', 'Error generating export file'), 'error');
      }
    };

    const levelLabels = {
      1: t('سطح ۱ - گروه حساب', 'Level 1 - Account Group'),
      2: t('سطح ۲ - حساب کل', 'Level 2 - General Ledger'),
      3: t('سطح ۳ - حساب معین', 'Level 3 - Subsidiary Ledger'),
      4: t('سطح ۴ - حساب تفصیل', 'Level 4 - Detail Account')
    };

    const getNodeCurrencyCode = () => {
      if (!nodeFormData.currencyId) return 'IRR';
      const c = lookups.currencies.find(x => String(x.id) === String(nodeFormData.currencyId));
      return c ? c.code : 'IRR';
    };

    const getNodeCurrencyName = () => {
      if (!nodeFormData.currencyId) return isRtl ? 'ریال' : 'IRR';
      const c = lookups.currencies.find(x => String(x.id) === String(nodeFormData.currencyId));
      if (!c) return isRtl ? 'ریال' : 'IRR';
      return isRtl ? (c.title_fa || c.title || c.code) : (c.title_en || c.title || c.code);
    };

    const tabOptions = [
      { id: 'details', label: t('مشخصات حساب', 'Account Parameters') },
      ...(!isCreatingNode ? [
        { id: 'access', label: t('تنظیمات دسترسی', 'Access Configuration') },
        { id: 'balance_groups', label: t('گروه‌های بالانس', 'Balance Groups') }
      ] : [])
    ];

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between shrink-0 h-12">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" icon={isRtl ? ArrowRight : ArrowLeft} onClick={onBack}>{t('بازگشت به لیست', 'Back')}</Button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1">
                {t('پیکربندی درخت حساب:', 'Coding Setup:')} <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{chart?.title}</span>
              </h2>
            </div>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => fetchDesignerData(selectedNodeId)} className="h-8 w-8 px-0" />
          </div>

          <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
            <div className={`w-full md:w-[30%] flex flex-col bg-slate-50/40 dark:bg-slate-900/10 border-b md:border-b-0 ${isRtl ? 'md:border-l' : 'md:border-r'} border-slate-200 dark:border-slate-700 overflow-y-auto`}>
              <Tree
                data={rawAccounts} language={language} formCode={formCode}
                idField="id" parentField="parentId" displayField="title" secondaryField="code" activeField="isActive"
                selectedId={selectedNodeId}
                onSelect={handleSelectTreeNode}
                onAddRoot={access.canCreate ? handleAddTreeRoot : undefined}
                onAddChild={access.canCreate ? handleAddTreeChild : undefined}
                onDelete={access.canDelete ? handleDeleteNode : undefined}
                onImport={(file) => showToast(t(`فایل ${file.name} جهت پردازش بارگذاری شد.`, `File ${file.name} uploaded for processing.`), 'info')}
                onExport={handleExportTree}
                onDownloadSample={() => showToast(t('در حال دانلود نمونه فایل اکسل...', 'Downloading Excel Sample...'), 'info')}
              />
            </div>

            <div className="flex-1 flex flex-col overflow-auto p-4 gap-3 bg-slate-50/50 dark:bg-slate-900/20">
              {selectedNodeId || isCreatingNode ? (
                <Card noPadding={true} className="flex-1 border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 bg-white dark:bg-slate-800 shadow-sm h-full">
                  
                  <div className="px-3 pt-3 pb-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 shrink-0">
                    <Tabs tabs={tabOptions} activeTab={activeTab} onChange={setActiveTab} />
                  </div>

                  <div className="flex-1 flex flex-col p-4 overflow-y-auto min-h-0">
                    {activeTab === 'details' && (
                      <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-200">
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                          
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 shrink-0 lg:h-[60px]">
                            <div className="lg:col-span-2 flex items-center gap-3 px-4 py-2 bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl h-full shadow-sm">
                              <Info size={18} className="text-blue-500 shrink-0" />
                              <div className="flex flex-col justify-center overflow-hidden">
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-0.5 whitespace-nowrap">{t('سطح گره جاری', 'Current Level')}</span>
                                  <span className="text-[13px] font-black text-blue-800 dark:text-blue-300 truncate">{levelLabels[nodeDepth]}</span>
                              </div>
                            </div>

                            {!isCreatingNode && (
                              <div className="lg:col-span-2 flex items-center justify-between gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl h-full shadow-sm">
                                <div className="flex flex-col justify-center flex-1">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 truncate">{t(`بالانس در لحظه (به ${getNodeCurrencyName()})`, `Real-time Balance (${getNodeCurrencyName()})`)}</span>
                                    <div className="text-[14px] font-black text-slate-800 dark:text-slate-200 dir-ltr text-right truncate">
                                      0.00 <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold ml-0.5">{getNodeCurrencyCode()}</span>
                                    </div>
                                </div>
                                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0"></div>
                                <div className="flex-col justify-center hidden sm:flex flex-1">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 truncate">{t('معادل ارزی پایه (دلار)', 'Base Currency Eq (USD)')}</span>
                                    <div className="text-[14px] font-black text-slate-800 dark:text-slate-200 dir-ltr text-right truncate">
                                      0.00 <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold ml-0.5">USD</span>
                                    </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TextField size="sm" formCode={formCode} label={t('کد حساب (ترکیبی اتوماتیک)', 'Account Code')} value={nodeFormData.code || ''} onChange={(e) => setNodeFormData({ ...nodeFormData, code: e.target.value })} isRtl={isRtl} required dir="ltr" />
                            <SelectField size="sm" formCode={formCode} label={t('نوع ارز', 'Currency Type')} value={nodeFormData.currencyId || ''} onChange={(e) => setNodeFormData({ ...nodeFormData, currencyId: e.target.value })} options={[{ value: '', label: t('بدون محدودیت ارزی', 'No Currency Restriction') }, ...lookups.currencies.map(c => {
                               const cNameFa = c.name_fa || c.title_fa || c.name || c.title || '';
                               const cNameEn = c.name_en || c.title_en || c.name || c.title || '';
                               return { value: c.id, label: `${c.code || c.id} - ${isRtl ? cNameFa : cNameEn}` };
                            })]} isRtl={isRtl} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TextField size="sm" formCode={formCode} label={t('عنوان فارسی حساب', 'Persian Title')} value={nodeFormData.titleFa || ''} onChange={(e) => setNodeFormData({ ...nodeFormData, titleFa: e.target.value })} isRtl={isRtl} required />
                            <TextField size="sm" formCode={formCode} label={t('عنوان انگلیسی حساب', 'English Title')} value={nodeFormData.titleEn || ''} onChange={(e) => setNodeFormData({ ...nodeFormData, titleEn: e.target.value })} isRtl={isRtl} dir="ltr" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <SelectField size="sm" formCode={formCode} label={t('نوع حساب', 'Account Category')} value={nodeFormData.accountType || 'main'} onChange={(e) => setNodeFormData({ ...nodeFormData, accountType: e.target.value })} options={[{ value: 'main', label: t('حساب اصلی', 'Main Account') }, { value: 'intermediate', label: t('حساب واسط / کنترلی', 'Intermediate Account') }]} isRtl={isRtl} />
                            <div className="flex flex-row items-center gap-6 pt-5 pb-1 w-full">
                              <div className="flex-1">
                                <ToggleField size="sm" formCode={formCode} label={t('کنترل موجودی', 'Control Inventory')} checked={!!nodeFormData.controlInventory} onChange={(v) => setNodeFormData({ ...nodeFormData, controlInventory: v })} isRtl={isRtl} wrapperClassName="w-full" />
                              </div>
                              <div className="flex-1">
                                <ToggleField size="sm" formCode={formCode} label={t('فعال', 'Active')} checked={nodeFormData.isActive !== false} onChange={(v) => setNodeFormData({ ...nodeFormData, isActive: v })} isRtl={isRtl} wrapperClassName="w-full" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => { setIsCreatingNode(false); setSelectedNodeId(null); setNodeFormData({}); }}>{t('انصراف', 'Cancel')}</Button>
                          {access.canEdit && <Button size="sm" variant="primary" icon={Save} onClick={handleSaveNodeForm}>{t('ذخیره تغییرات حساب', 'Save Account')}</Button>}
                        </div>
                      </div>
                    )}

                    {(activeTab === 'access' || activeTab === 'balance_groups') && window.ChartOfAccountsAccess && (
                      <window.ChartOfAccountsAccess 
                         selectedNodeId={selectedNodeId} 
                         activeTab={activeTab} 
                         language={language}
                         lookups={lookups}
                      />
                    )}
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3 text-[12px] font-medium p-8">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"><Network size={26} className="text-slate-300 dark:text-slate-600"/></div>
                  <span>{t('جهت بررسی پارامترها، قوانین ارث‌بری یا دسترسی، یک حساب را از ساختار درخت انتخاب کنید.', 'Select an account item node from the left tree setup to manage permissions or parameters.')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید حذف قطعی رکورد', 'Confirm Permanent Revocation')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'node' && t(`آیا از حذف حساب کدینگ "${deleteConfirm.data?.titleFa}" اطمینان دارید؟`, `Are you sure you want to delete account component "${deleteConfirm.data?.titleFa}"?`)}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} className="flex-1">{t('تایید حذف نهایی', 'Delete Now')}</Button>
              </div>
            }
          />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  ChartOfAccountsMain.formCode = 'CHART_OF_ACCOUNTS_MAIN';
  window.ChartOfAccountsMain = ChartOfAccountsMain;
})();
