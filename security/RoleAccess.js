/* Filename: security/RoleAccess.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo } = React;
  
  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    Shield = FallbackIcon, Lock = FallbackIcon, Save = FallbackIcon, 
    Check = FallbackIcon, Layers = FallbackIcon, AlertCircle = FallbackIcon,
    CheckSquare = FallbackIcon, Trash2 = FallbackIcon, AlertTriangle = FallbackIcon
  } = LucideIcons;

  const DesignSystem = window.DesignSystem || window.DSCore || {};
  const { 
      Modal = () => null, 
      Button = () => null, 
      Tree = () => null,
      CheckboxField = () => null,
      EmptyState = () => null
  } = DesignSystem;

  const supabase = window.supabase;

  const SCOPE_DICT = {
    'docTypes': { fa: 'انواع سند مجاز', en: 'Allowed Document Types' },
    'branches': { fa: 'شعب مجاز', en: 'Allowed Branches' }
  };

  const LOCAL_ACTION_LABELS = {
    'read':                  { fa: 'مشاهده',                en: 'Read' },
    'create':                { fa: 'ایجاد',                  en: 'Create' },
    'edit':                  { fa: 'ویرایش',                 en: 'Edit' },
    'delete':                { fa: 'حذف',                    en: 'Delete' },
    'print':                 { fa: 'چاپ',                    en: 'Print' },
    'copy':                  { fa: 'کپی سند',                en: 'Copy Document' },
    'attach':                { fa: 'مدیریت پیوست',           en: 'Attachments' },
    'summary':               { fa: 'خلاصه ارزی',             en: 'Currency Summary' },
    'comment':               { fa: 'کامنت‌ها',                en: 'Comments' },
    'bulk_delete':           { fa: 'حذف گروهی',              en: 'Bulk Delete' },
    'set_temporary':         { fa: 'تغییر به موقت',          en: 'Set Temporary' },
    'set_draft':             { fa: 'تغییر به یادداشت',       en: 'Set Draft' },
    'set_final':             { fa: 'تبدیل به بررسی شده',     en: 'Set Final' },
    'set_approved':          { fa: 'تبدیل به تایید شده',     en: 'Set Approved' },
    'revert_temporary':      { fa: 'برگشت به موقت',          en: 'Revert to Temporary' },
    'update_rates':          { fa: 'بروزرسانی نرخ ارز',      en: 'Update Exchange Rates' },
    'manage_accounts':       { fa: 'مدیریت حساب‌ها',         en: 'Manage Accounts' },
    'manage_access':         { fa: 'مدیریت دسترسی‌ها',       en: 'Manage Access' },
    'excel_export':          { fa: 'خروجی Excel',            en: 'Excel Export' },
    'import':                { fa: 'ورود اطلاعات',           en: 'Import' },
    'download_sample':       { fa: 'دانلود نمونه',           en: 'Download Sample' },
    'manage_balance_groups': { fa: 'گروه‌های بالانس',         en: 'Balance Groups' },
  };

  // نگاشت برچسب‌های فارسی قدیمی به کدهای انگلیسی استاندارد
  const PERSIAN_TO_CODE = {
    'مشاهده': 'read', 'نمایش': 'read', 'خواندن': 'read',
    'ایجاد': 'create', 'افزودن': 'create',
    'ویرایش': 'edit', 'بروزرسانی': 'edit', 'update': 'edit',
    'حذف': 'delete',
    'چاپ': 'print',
    'کپی': 'copy',
    'حذف گروهی': 'bulk_delete',
  };

  const RoleAccess = ({ isOpen, onClose, role, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const actionDictionary = securityCtx?.actionDictionary || {};

    const [isLoading, setIsLoading] = useState(false);
    const [menusData, setMenusData] = useState([]);
    const [scopesData, setScopesData] = useState({ docTypes: [], branches: [] });
    
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [tempPermissions, setTempPermissions] = useState({});
    
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

    useEffect(() => {
      if (isOpen && role) {
        fetchData();
      } else {
        setSelectedMenu(null);
        setTempPermissions({});
      }
    }, [isOpen, role]);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: dbMenus, error: menuErr } = await supabase.from('menus').select('*').order('display_order', { ascending: true });
        if (!menuErr && dbMenus) setMenusData(dbMenus);

        const safeFetchDocTypes = async () => {
            try {
                const res = await supabase.from('fm_doc_types').select('id, title').eq('is_active', true);
                return res.error ? { data: [] } : res;
            } catch (e) { return { data: [] }; }
        };

        const safeFetchBranches = async () => {
            try {
                const res = await supabase.from('fm_branches').select('id, title').eq('is_active', true);
                return res.error ? { data: [] } : res;
            } catch (e) { return { data: [] }; }
        };

        const [dtRes, brRes] = await Promise.all([safeFetchDocTypes(), safeFetchBranches()]);

        setScopesData({
            docTypes: dtRes.data || [],
            branches: brRes.data || []
        });

        const { data: perms } = await supabase.from('sec_permissions').select('*').eq('role_id', role.id);
        if (perms) {
            const mapped = {};
            perms.forEach(p => {
                mapped[p.menu_id] = {
                    id: p.id,
                    actions: typeof p.actions === 'string' ? JSON.parse(p.actions || '[]') : (p.actions || []),
                    scopes: typeof p.data_scopes === 'string' ? JSON.parse(p.data_scopes || '{}') : (p.data_scopes || {})
                };
            });
            setTempPermissions(mapped);
        }
      } catch (err) {
        console.error('Fetch Access Data Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const getMenuLabel = useCallback((m) => {
        if (!m) return '';
        return isRtl 
            ? (m.label_fa || m.title || m.name) 
            : (m.label_en || m.title || m.name);
    }, [isRtl]);

    const mappedTreeData = useMemo(() => {
        return menusData.map(m => ({
            ...m,
            displayLabel: getMenuLabel(m)
        }));
    }, [menusData, getMenuLabel]);

    const getDescendantMenuIds = useCallback((parentId) => {
        let ids = [];
        const children = menusData.filter(m => m.parent_id === parentId);
        children.forEach(child => {
            ids.push(child.id);
            ids = ids.concat(getDescendantMenuIds(child.id));
        });
        return ids;
    }, [menusData]);

    const showToastNotification = (msg) => {
        if (window.DesignSystem?.Toast || window.DSCore?.Toast) {
            if (typeof alert !== 'undefined') {
                console.log(msg);
            }
        }
    };

    const handleGrantFullAccessRecursive = () => {
        if (!selectedMenu) return;
        setConfirmModal({
            isOpen: true,
            type: 'grant',
            title: t('تایید دسترسی کامل', 'Confirm Full Access'),
            message: t('آیا از اختصاص تمامی دسترسی‌های این فرم و زیرمجموعه‌های آن اطمینان دارید؟', 'Are you sure you want to grant all permissions for this node and its descendants?'),
            onConfirm: () => {
                const targetIds = [selectedMenu.id, ...getDescendantMenuIds(selectedMenu.id)];
                setTempPermissions(prev => {
                    const nextPerms = { ...prev };
                    targetIds.forEach(id => {
                        const menuObj = menusData.find(m => m.id === id);
                        if (menuObj) {
                            // عملیات: نرمال‌سازی به کدهای انگلیسی و حذف تکراری
                            const rawActions = typeof menuObj.available_actions === 'string'
                                ? JSON.parse(menuObj.available_actions || '[]')
                                : (menuObj.available_actions || []);
                            const normalizedActions = [...new Set(rawActions.map(a =>
                                PERSIAN_TO_CODE[String(a).trim()] || String(a).toLowerCase().trim()
                            ))];

                            // دسترسی داده: همه option ها را انتخاب کن
                            const rawScopes = typeof menuObj.available_scopes === 'string'
                                ? JSON.parse(menuObj.available_scopes || 'null')
                                : menuObj.available_scopes;
                            const fullScopes = {};
                            if (rawScopes && !Array.isArray(rawScopes) && typeof rawScopes === 'object') {
                                Object.entries(rawScopes).forEach(([key, def]) => {
                                    fullScopes[key] = (def.options || []).map(o => o.value);
                                });
                            }

                            nextPerms[id] = {
                                id: prev[id]?.id || null,
                                actions: normalizedActions,
                                scopes: fullScopes
                            };
                        }
                    });
                    return nextPerms;
                });
                setConfirmModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
                showToastNotification(t('دسترسی کامل به این بخش و زیرمجموعه‌ها اعمال شد.', 'Full access granted to this section and descendants.'));
            }
        });
    };

    const handleRemoveAccessRecursive = () => {
        if (!selectedMenu) return;
        setConfirmModal({
            isOpen: true,
            type: 'remove',
            title: t('تایید حذف دسترسی', 'Confirm Remove Access'),
            message: t('آیا از حذف تمامی دسترسی‌های این فرم و زیرمجموعه‌های آن اطمینان دارید؟', 'Are you sure you want to remove all permissions for this node and its descendants?'),
            onConfirm: () => {
                const targetIds = [selectedMenu.id, ...getDescendantMenuIds(selectedMenu.id)];
                setTempPermissions(prev => {
                    const nextPerms = { ...prev };
                    targetIds.forEach(id => {
                        nextPerms[id] = {
                            id: prev[id]?.id || null,
                            actions: [],
                            scopes: {}
                        };
                    });
                    return nextPerms;
                });
                setConfirmModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
                showToastNotification(t('تمامی دسترسی‌های این بخش و زیرمجموعه‌ها حذف شد.', 'All access removed from this section and descendants.'));
            }
        });
    };

    const handleSavePermissions = async () => {
      setIsLoading(true);
      try {
          const inserts = [];
          const updates = [];
          const deletes = [];

          Object.entries(tempPermissions).forEach(([menuId, data]) => {
              const hasActions = data.actions.length > 0;
              const hasScopes = Object.keys(data.scopes).some(k => data.scopes[k]?.length > 0);
              
              if (hasActions || hasScopes) {
                  if (data.id) {
                      updates.push({ id: data.id, role_id: role.id, menu_id: menuId, actions: data.actions, data_scopes: data.scopes });
                  } else {
                      inserts.push({ role_id: role.id, menu_id: menuId, actions: data.actions, data_scopes: data.scopes });
                  }
              } else if (data.id) {
                  deletes.push(data.id);
              }
          });

          if (deletes.length > 0) await supabase.from('sec_permissions').delete().in('id', deletes);
          if (inserts.length > 0) await supabase.from('sec_permissions').insert(inserts);
          if (updates.length > 0) {
              for (const u of updates) {
                  await supabase.from('sec_permissions').update({ actions: u.actions, data_scopes: u.data_scopes }).eq('id', u.id);
              }
          }
          
          onClose();
      } catch (err) {
          console.error("Save perms error:", err);
          alert(t('خطا در ذخیره دسترسی‌ها', 'Error saving permissions'));
      } finally {
          setIsLoading(false);
      }
    };

    const toggleAction = (actionId) => {
        if (!selectedMenu) return;
        setTempPermissions(prev => {
            const current = prev[selectedMenu.id] || { actions: [], scopes: {} };
            const hasAction = current.actions.includes(actionId);
            return {
                ...prev,
                [selectedMenu.id]: {
                    ...current,
                    actions: hasAction ? current.actions.filter(a => a !== actionId) : [...current.actions, actionId]
                }
            };
        });
    };

    const toggleScope = (scopeKey, valueId) => {
        if (!selectedMenu) return;
        setTempPermissions(prev => {
            const current = prev[selectedMenu.id] || { actions: [], scopes: {} };
            const scopeArr = current.scopes[scopeKey] || [];
            const hasVal = scopeArr.includes(valueId);
            return {
                ...prev,
                [selectedMenu.id]: {
                    ...current,
                    scopes: {
                        ...current.scopes,
                        [scopeKey]: hasVal ? scopeArr.filter(v => v !== valueId) : [...scopeArr, valueId]
                    }
                }
            };
        });
    };

    if (!isOpen) return null;

    const rawAvailActions = selectedMenu ? (typeof selectedMenu.available_actions === 'string' ? JSON.parse(selectedMenu.available_actions || '[]') : (selectedMenu.available_actions || [])) : [];
    // نرمال‌سازی به کدهای انگلیسی کوچک + حذف تکراری‌ها بر اساس برچسب نمایشی
    const _seenActionLabels = new Set();
    const availActions = rawAvailActions.reduce((acc, a) => {
        const id = PERSIAN_TO_CODE[String(a).trim()] || String(a).toLowerCase().trim();
        const lbl = actionDictionary[id] || LOCAL_ACTION_LABELS[id];
        const key = lbl ? lbl[isRtl ? 'fa' : 'en'] : id;
        if (!_seenActionLabels.has(key)) { _seenActionLabels.add(key); acc.push(id); }
        return acc;
    }, []);
    // پارسینگ available_scopes - دو فرمت پشتیبانی می‌شود:
    //   فرمت جدید: آبجکت JSONB با options تعبیه‌شده { key: { label_fa, label_en, options: [{value, label_fa, label_en}] } }
    //   فرمت قدیمی: آرایه کلیدها ['docTypes', 'branches'] که داده از جداول جداگانه می‌آید
    const availScopesRaw = selectedMenu ? (typeof selectedMenu.available_scopes === 'string' ? JSON.parse(selectedMenu.available_scopes || 'null') : selectedMenu.available_scopes) : null;
    const isNewScopeFormat = availScopesRaw && !Array.isArray(availScopesRaw) && typeof availScopesRaw === 'object';
    const availScopeKeys = isNewScopeFormat ? Object.keys(availScopesRaw) : (Array.isArray(availScopesRaw) ? availScopesRaw : []);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('مدیریت دسترسی‌های نقش:', 'Role Permissions Management:')} ${role?.title || ''}`} width="max-w-6xl" language={language}>
            <div className="flex h-[600px] flex-col md:flex-row bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                
                <div className="w-full md:w-1/3 border-r md:border-b-0 border-b border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900 overflow-hidden shrink-0 p-1">
                    {menusData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                            <AlertCircle size={24} className="opacity-50" />
                            <span className="text-[11px]">{t('در حال دریافت یا منویی وجود ندارد.', 'Loading or no menus available.')}</span>
                        </div>
                    ) : (
                        <Tree 
                            data={mappedTreeData}
                            idField="id" 
                            parentField="parent_id" 
                            displayField="displayLabel" 
                            activeField="is_visible"
                            selectedId={selectedMenu?.id}
                            onSelect={setSelectedMenu}
                            language={language}
                        />
                    )}
                </div>

                <div className="w-full md:w-2/3 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                    {!selectedMenu ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Shield size={48} className="opacity-10 mb-4 text-indigo-500" />
                            <span className="text-[13px] font-bold text-slate-500">{t('برای تنظیم دسترسی، یک فرم از درخت انتخاب کنید.', 'Select a form from the tree to configure permissions.')}</span>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h3 className="text-[14px] font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                        {getMenuLabel(selectedMenu)}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" icon={CheckSquare} onClick={handleGrantFullAccessRecursive} className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20 text-[11px] font-bold">
                                        {t('دسترسی کامل شاخه', 'Full Branch Access')}
                                    </Button>
                                    <Button size="sm" variant="outline" icon={Trash2} onClick={handleRemoveAccessRecursive} className="text-red-500 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 text-[11px] font-bold">
                                        {t('حذف دسترسی شاخه', 'Remove Branch Access')}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                        <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Shield size={14}/></div>
                                        <span className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('عملیات مجاز (Actions)', 'Allowed Actions')}</span>
                                    </div>
                                    
                                    {availActions.length === 0 ? (
                                        <div className="text-[11px] text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                            {t('هیچ عملیات خاصی برای این فرم در دیتابیس تعریف نشده است.', 'No specific actions defined for this form in the database.')}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                            {availActions.map(actionId => {
                                                const isChecked = (tempPermissions[selectedMenu.id]?.actions || []).some(a => (PERSIAN_TO_CODE[String(a).trim()] || String(a).toLowerCase().trim()) === actionId);
                                                const labelObj = actionDictionary[actionId] || LOCAL_ACTION_LABELS[actionId];
                                                const displayLabel = labelObj ? labelObj[isRtl ? 'fa' : 'en'] : actionId;
                                                return (
                                                    <button
                                                        key={actionId}
                                                        type="button"
                                                        onClick={() => toggleAction(actionId)}
                                                        className={[
                                                            'w-full inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all duration-150 select-none cursor-pointer',
                                                            isChecked
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                                                        ].join(' ')}
                                                    >
                                                        {isChecked && React.createElement(Check, { size: 11, className: 'shrink-0' })}
                                                        {displayLabel}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {availScopeKeys.length > 0 && (
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><Lock size={14}/></div>
                                            <span className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('محدودیت دسترسی به داده‌ها', 'Data Scope Restrictions')}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                                            {t('در صورت عدم انتخاب هیچ گزینه‌ای در یک بخش، کاربر به تمامی داده‌های آن بخش دسترسی خواهد داشت.', 'If no options are selected, the user will have access to all data in that scope.')}
                                        </div>
                                        
                                        <div className="flex flex-col gap-5">
                                            {availScopeKeys.map(scopeKey => {
                                                const scopeDef = isNewScopeFormat ? availScopesRaw[scopeKey] : null;
                                                const displayLabel = scopeDef
                                                    ? (isRtl ? (scopeDef.label_fa || scopeKey) : (scopeDef.label_en || scopeKey))
                                                    : (SCOPE_DICT[scopeKey] ? SCOPE_DICT[scopeKey][isRtl ? 'fa' : 'en'] : scopeKey);
                                                const itemsList = scopeDef ? (scopeDef.options || []) : (scopesData[scopeKey] || []);
                                                return (
                                                    <div key={scopeKey}>
                                                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                            {displayLabel}
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                            {itemsList.length > 0 ? itemsList.map(item => {
                                                                const itemValue = scopeDef ? item.value : item.id;
                                                                const itemLabel = scopeDef
                                                                    ? (isRtl ? (item.label_fa || item.value) : (item.label_en || item.value))
                                                                    : item.title;
                                                                const isSelected = tempPermissions[selectedMenu.id]?.scopes?.[scopeKey]?.includes(itemValue);
                                                                return (
                                                                    <button
                                                                        key={itemValue}
                                                                        type="button"
                                                                        onClick={() => toggleScope(scopeKey, itemValue)}
                                                                        className={[
                                                                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all duration-150 select-none cursor-pointer',
                                                                            isSelected
                                                                                ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-200 dark:shadow-teal-900'
                                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-600 dark:hover:text-teal-400'
                                                                        ].join(' ')}
                                                                    >
                                                                        {isSelected && React.createElement(Check, { size: 11, className: 'shrink-0' })}
                                                                        {itemLabel}
                                                                    </button>
                                                                );
                                                            }) : (
                                                                <span className="text-[10px] text-slate-400 italic">{t('داده‌ای یافت نشد.', 'No data found.')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div className="text-[10px] text-slate-500 font-medium hidden sm:block">
                            {t('تغییرات دسترسی بلافاصله پس از ذخیره برای کاربران اعمال می‌گردد.', 'Permission changes apply immediately upon save.')}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={onClose}>{t('انصراف', 'Cancel')}</Button>
                            <Button variant="primary" size="sm" className="flex-1 sm:flex-none" icon={Save} onClick={handleSavePermissions} isLoading={isLoading}>{t('ذخیره تغییرات فرم‌ها', 'Save All Changes')}</Button>
                        </div>
                    </div>
                </div>
            </div>

            {confirmModal.isOpen && (
                <Modal isOpen={true} onClose={() => setConfirmModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null })} title={confirmModal.title} width="max-w-sm" language={language}>
                    <EmptyState
                        icon={AlertTriangle}
                        title={confirmModal.title}
                        description={confirmModal.message}
                        action={
                            <div className="flex gap-2 w-full mt-2 px-4">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null })}>{t('انصراف', 'Cancel')}</Button>
                                <Button variant={confirmModal.type === 'remove' ? 'danger' : 'primary'} size="sm" onClick={confirmModal.onConfirm} className="flex-1">
                                    {t('تایید عملیات', 'Confirm')}
                                </Button>
                            </div>
                        }
                    />
                </Modal>
            )}
        </Modal>
    );
  };

  window.RoleAccess = RoleAccess;
})();