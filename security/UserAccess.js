/* Filename: security/UserAccess.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo } = React;
  
  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    Shield = FallbackIcon, Save = FallbackIcon, User = FallbackIcon,
    Zap = FallbackIcon, X = FallbackIcon, Info = FallbackIcon, Trash2 = FallbackIcon, Eye = FallbackIcon
  } = LucideIcons;

  const DesignSystem = window.DesignSystem || window.DSCore || {};
  const { 
      Modal = () => null, 
      Button = () => null,
      DataGrid = () => null,
      SelectField = () => null,
      CheckboxField = () => null,
      Tabs = () => null,
      Badge = () => null
  } = DesignSystem;

  const supabase = window.supabase;

  const SCOPE_DICT = {
    'docTypes': { fa: 'انواع سند مجاز', en: 'Allowed Document Types' },
    'branches': { fa: 'شعب مجاز', en: 'Allowed Branches' }
  };

  const UserAccess = ({ isOpen, onClose, user, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const actionDictionary = securityCtx?.actionDictionary || {};

    const [isLoading, setIsLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    
    const [menusData, setMenusData] = useState([]);
    const [scopesData, setScopesData] = useState({ docTypes: [], branches: [] });
    
    const [allRoles, setAllRoles] = useState([]);
    const [assignedRoles, setAssignedRoles] = useState([]);
    const [globalRolePerms, setGlobalRolePerms] = useState({}); 
    
    const [directPerms, setDirectPerms] = useState({});
    const [deletedPermIds, setDeletedPermIds] = useState([]);
    
    const [selectedMenuId, setSelectedMenuId] = useState(null);
    const [activeSourceId, setActiveSourceId] = useState(null);
    const [gridSelectedIds, setGridSelectedIds] = useState([]);
    const [isDetailPanelVisible, setIsDetailPanelVisible] = useState(false);

    useEffect(() => {
      if (isOpen && user) {
        fetchData();
      } else {
        setSelectedMenuId(null);
        setActiveSourceId(null);
        setAssignedRoles([]);
        setDirectPerms({});
        setDeletedPermIds([]);
        setGridSelectedIds([]);
        setIsDetailPanelVisible(false);
        setHasChanges(false);
      }
    }, [isOpen, user]);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const safeFetch = async (promise) => {
            try {
                const res = await promise;
                return res.error ? { data: [] } : res;
            } catch (e) {
                return { data: [] };
            }
        };

        const [
            { data: dbMenus },
            { data: dtData },
            { data: brData },
            { data: rolesData },
            { data: userRolesData },
            { data: allPerms }
        ] = await Promise.all([
            supabase.from('menus').select('*').order('display_order', { ascending: true }),
            safeFetch(supabase.from('fm_doc_types').select('id, title').eq('is_active', true)),
            safeFetch(supabase.from('fm_branches').select('id, title').eq('is_active', true)),
            supabase.from('sec_roles').select('*'),
            supabase.from('sec_user_roles').select('role_id').eq('user_id', user.id),
            supabase.from('sec_permissions').select('*')
        ]);

        if (dbMenus) setMenusData(dbMenus);
        setScopesData({
            docTypes: dtData || [],
            branches: brData || []
        });

        if (rolesData) setAllRoles(rolesData);
        
        const currentAssigned = userRolesData ? userRolesData.map(ur => ur.role_id) : [];
        setAssignedRoles(currentAssigned);

        const rPerms = {};
        const dPerms = {};

        if (allPerms) {
            allPerms.forEach(p => {
                const actions = typeof p.actions === 'string' ? JSON.parse(p.actions || '[]') : (p.actions || []);
                const scopes = typeof p.data_scopes === 'string' ? JSON.parse(p.data_scopes || '{}') : (p.data_scopes || {});
                
                if (p.role_id) {
                    const rId = String(p.role_id);
                    if (!rPerms[rId]) rPerms[rId] = [];
                    rPerms[rId].push({ menu_id: p.menu_id, actions, scopes });
                }
                
                if (p.user_id && p.user_id === user.id) {
                    dPerms[String(p.menu_id)] = { id: p.id, actions, scopes };
                }
            });
        }
        
        setGlobalRolePerms(rPerms);
        setDirectPerms(dPerms);
        setDeletedPermIds([]);

      } catch (err) {
        console.error('Fetch Access Data Error:', err);
      } finally {
        setIsLoading(false);
        setHasChanges(false);
      }
    };

    const getMenuLabel = useCallback((m) => {
        if (!m) return '';
        return isRtl ? (m.label_fa || m.title || m.name) : (m.label_en || m.title || m.name);
    }, [isRtl]);

    const getMenuFullPath = useCallback((menuId) => {
        const pathParts = [];
        let current = menusData.find(m => String(m.id) === String(menuId));
        while (current) {
            pathParts.unshift(getMenuLabel(current));
            current = menusData.find(m => String(m.id) === String(current.parent_id));
        }
        return pathParts.join(' / ');
    }, [menusData, getMenuLabel]);

    const allSystemForms = useMemo(() => {
        return menusData
            .map(m => ({
                id: m.id,
                label: getMenuLabel(m),
                fullPath: getMenuFullPath(m.id),
                available_actions: typeof m.available_actions === 'string' ? JSON.parse(m.available_actions || '[]') : (m.available_actions || []),
                available_scopes: typeof m.available_scopes === 'string' ? JSON.parse(m.available_scopes || '[]') : (m.available_scopes || [])
            }));
    }, [menusData, getMenuLabel, getMenuFullPath]);

    const effectivePermissions = useMemo(() => {
        const map = new Map();

        assignedRoles.forEach(roleId => {
            const rolePerms = globalRolePerms[String(roleId)] || [];
            const roleInfo = allRoles.find(r => String(r.id) === String(roleId));
            
            rolePerms.forEach(p => {
                const formInfo = allSystemForms.find(f => String(f.id) === String(p.menu_id));
                if (!formInfo) return; 
                const stringId = String(p.menu_id);
                if (!map.has(stringId)) {
                    map.set(stringId, { id: formInfo.id, path: formInfo.fullPath, name: formInfo.label, breakdown: [] });
                }
                map.get(stringId).breakdown.push({ 
                    sourceId: `role_${roleId}`, 
                    type: 'role', 
                    label: `${t('نقش:', 'Role:')} ${roleInfo?.title || roleId}`, 
                    actions: p.actions, 
                    scopes: p.scopes 
                });
            });
        });

        Object.entries(directPerms).forEach(([menuId, p]) => {
            if (menuId.startsWith('temp_')) {
                map.set(menuId, {
                    id: menuId,
                    name: t('(فرم جدید)', '(New Form)'),
                    path: t('لطفاً فرم را انتخاب کنید...', 'Please select a form...'),
                    breakdown: [{
                        sourceId: 'direct',
                        type: 'direct',
                        label: t('مستقیم (جدید)', 'Direct (New)'),
                        actions: p.actions || [],
                        scopes: p.scopes || {}
                    }]
                });
                return;
            }

            const formInfo = allSystemForms.find(f => String(f.id) === String(menuId));
            if (!formInfo) return;
            
            const stringId = String(formInfo.id);
            if (!map.has(stringId)) {
                map.set(stringId, { id: formInfo.id, path: formInfo.fullPath, name: formInfo.label, breakdown: [] });
            }
            const existing = map.get(stringId).breakdown.find(b => b.type === 'direct');
            if (existing) {
                existing.actions = p.actions || []; 
                existing.scopes = p.scopes || {};
            } else {
                map.get(stringId).breakdown.push({ 
                    sourceId: 'direct', 
                    type: 'direct', 
                    label: t('مستقیم', 'Direct'), 
                    actions: p.actions || [], 
                    scopes: p.scopes || {} 
                });
            }
        });

        const result = Array.from(map.values());
        return result.sort((a, b) => {
            const aTemp = String(a.id).startsWith('temp_');
            const bTemp = String(b.id).startsWith('temp_');
            if (aTemp && !bTemp) return -1;
            if (!aTemp && bTemp) return 1;
            return 0;
        });
    }, [assignedRoles, directPerms, allSystemForms, globalRolePerms, allRoles, t]);

    const currentDetailRow = useMemo(() => {
        if (!selectedMenuId) return null;
        return effectivePermissions.find(r => String(r.id) === String(selectedMenuId)) || null;
    }, [selectedMenuId, effectivePermissions]);

    const handleSavePermissions = async () => {
      if (!hasChanges) return;
      setIsLoading(true);
      
      try {
          await supabase.from('sec_user_roles').delete().eq('user_id', user.id);
          if (assignedRoles.length > 0) {
              const userRolesPayload = assignedRoles.map(rId => ({ user_id: user.id, role_id: rId }));
              await supabase.from('sec_user_roles').insert(userRolesPayload);
          }

          const inserts = [];
          const updates = [];
          const deletes = [...deletedPermIds];

          Object.entries(directPerms).forEach(([menuId, data]) => {
              if (menuId.startsWith('temp_')) return;

              const hasActions = data.actions && data.actions.length > 0;
              const hasScopes = data.scopes && Object.keys(data.scopes).some(k => data.scopes[k]?.length > 0);

              const systemForm = allSystemForms.find(f => String(f.id) === String(menuId));
              const dbMenuId = systemForm ? systemForm.id : menuId;

              if (hasActions || hasScopes) {
                  const payload = { 
                      user_id: user.id, 
                      menu_id: dbMenuId, 
                      actions: data.actions || [], 
                      data_scopes: data.scopes || {} 
                  };

                  if (data.id) {
                      updates.push({ id: data.id, ...payload });
                  } else {
                      inserts.push(payload);
                  }
              } else if (data.id) {
                  deletes.push(data.id);
              }
          });

          if (deletes.length > 0) await supabase.from('sec_permissions').delete().in('id', deletes);
          if (inserts.length > 0) {
              const { error } = await supabase.from('sec_permissions').insert(inserts);
              if (error) throw error;
          }
          if (updates.length > 0) {
              for (const u of updates) {
                  const { error } = await supabase.from('sec_permissions').update({ actions: u.actions, data_scopes: u.data_scopes }).eq('id', u.id);
                  if (error) throw error;
              }
          }
          
          await fetchData();
          
      } catch (err) {
          console.error("Save perms error:", err);
          alert(t('خطا در ذخیره دسترسی‌ها. مطمئن شوید جدول دیتابیس آپدیت شده است.', 'Error saving permissions. Ensure DB is updated.'));
          setIsLoading(false);
      }
    };

    const handleAddRole = (roleId) => {
        if (!roleId || assignedRoles.includes(roleId)) return;
        setAssignedRoles(prev => [...prev, roleId]);
        setHasChanges(true);
    };

    const handleRemoveRole = (roleId) => {
        setAssignedRoles(prev => prev.filter(id => id !== roleId));
        setHasChanges(true);
    };

    const handleInlineAddRow = () => {
        const tempId = `temp_${Date.now()}`;
        setDirectPerms(prev => ({
            ...prev,
            [tempId]: { id: null, actions: [], scopes: {} }
        }));
        setSelectedMenuId(tempId);
        setActiveSourceId('direct');
        setIsDetailPanelVisible(false);
        setHasChanges(true);
    };

    const handleInlineSelectForm = (tempId, targetMenuId) => {
        if (!targetMenuId) return;
        const stringTargetId = String(targetMenuId);
        if (directPerms[stringTargetId]) {
            alert(t('این فرم قبلاً در لیست دسترسی‌های مستقیم وجود دارد.', 'This form is already in direct permissions list.'));
            return;
        }

        setDirectPerms(prev => {
            const next = { ...prev };
            const oldData = next[tempId] || { id: null, actions: [], scopes: {} };
            delete next[tempId];
            next[stringTargetId] = oldData;
            return next;
        });

        const systemForm = allSystemForms.find(f => String(f.id) === stringTargetId);
        const finalId = systemForm ? systemForm.id : targetMenuId;

        setSelectedMenuId(finalId);
        setActiveSourceId('direct');
        setIsDetailPanelVisible(false);
        setHasChanges(true);
    };

    const handleDeleteDirect = (menuId) => {
        const stringMenuId = String(menuId);
        const perm = directPerms[stringMenuId];
        if (perm && perm.id) {
            setDeletedPermIds(prev => [...prev, perm.id]);
        }
        
        setDirectPerms(prev => {
            const next = { ...prev };
            delete next[stringMenuId];
            return next;
        });

        setGridSelectedIds(prev => prev.filter(id => String(id) !== stringMenuId));

        if (String(selectedMenuId) === stringMenuId) {
            if (activeSourceId === 'direct') {
                const current = effectivePermissions.find(r => String(r.id) === stringMenuId);
                const roleSources = current?.breakdown.filter(b => b.type === 'role') || [];
                if (roleSources.length > 0) {
                    setActiveSourceId(roleSources[0].sourceId);
                } else {
                    setSelectedMenuId(null);
                    setActiveSourceId(null);
                    setIsDetailPanelVisible(false);
                }
            }
        }
        setHasChanges(true);
    };

    const handleBulkDeleteDirect = (menuIds) => {
        const idsToDelete = [];
        const stringMenuIds = menuIds.map(id => String(id));

        stringMenuIds.forEach(id => {
            if (directPerms[id] && directPerms[id].id) {
                idsToDelete.push(directPerms[id].id);
            }
        });
        
        if (idsToDelete.length > 0) {
            setDeletedPermIds(prev => [...prev, ...idsToDelete]);
        }

        setDirectPerms(prev => {
            const next = { ...prev };
            stringMenuIds.forEach(id => delete next[id]);
            return next;
        });

        setGridSelectedIds(prev => prev.filter(id => !stringMenuIds.includes(String(id))));

        if (stringMenuIds.includes(String(selectedMenuId)) && activeSourceId === 'direct') {
            setSelectedMenuId(null);
            setActiveSourceId(null);
            setIsDetailPanelVisible(false);
        }
        setHasChanges(true);
    };

    const handleUpdateDirectPermission = (formId, type, key, value) => {
        const stringFormId = String(formId);
        if (stringFormId.startsWith('temp_')) {
            alert(t('لطفاً ابتدا فرم مورد نظر را انتخاب کنید.', 'Please select a form first.'));
            return;
        }

        setDirectPerms(prev => {
            const current = prev[stringFormId] || { id: null, actions: [], scopes: {} };
            let updatedActions = [...current.actions];
            let updatedScopes = { ...current.scopes };

            if (type === 'action') {
                if (updatedActions.includes(key)) {
                    updatedActions = updatedActions.filter(a => a !== key);
                } else {
                    updatedActions.push(key);
                }
            } else if (type === 'scope') {
                let currentScopeArr = updatedScopes[key] || [];
                if (currentScopeArr.includes(value)) {
                    currentScopeArr = currentScopeArr.filter(v => v !== value);
                } else {
                    currentScopeArr.push(value);
                }
                updatedScopes[key] = currentScopeArr;
            }

            return {
                ...prev,
                [stringFormId]: {
                    ...current,
                    actions: updatedActions,
                    scopes: updatedScopes
                }
            };
        });
        setHasChanges(true);
    };

    const columns = [
      { 
        field: 'path', 
        header_fa: 'مسیر و نام فرم', 
        header_en: 'Form Path & Name', 
        width: '350px',
        render: (val, row) => {
            if (row.id.toString().startsWith('temp_')) {
                return (
                    <div className="w-full py-1">
                        <SelectField
                            size="sm"
                            placeholder={t('انتخاب فرم...', 'Select Form...')}
                            options={allSystemForms.filter(f => !directPerms[String(f.id)]).map(f => ({ value: f.id, label: f.fullPath }))}
                            value=""
                            onChange={(e) => handleInlineSelectForm(row.id, e.target.value)}
                            isRtl={isRtl}
                        />
                    </div>
                );
            }
            return (
                <div className="flex flex-col py-0.5 w-full">
                    <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{row.name}</span>
                    <span className="text-[10px] text-slate-400 font-sans truncate">{row.path}</span>
                </div>
            );
        }
      },
      { 
        field: 'source', 
        header_fa: 'نوع دسترسی', 
        header_en: 'Access Type', 
        width: '250px',
        render: (val, row) => {
          if (row.id.toString().startsWith('temp_')) {
              return (
                  <div className="flex items-center min-h-[24px]">
                      <Badge variant="blue" className="flex items-center gap-1">
                          <Zap size={10}/> {t('مستقیم (جدید)', 'Direct (New)')}
                      </Badge>
                  </div>
              );
          }
          return (
            <div className="flex items-center w-full min-h-[24px]">
               <div className="flex flex-wrap gap-1 flex-1 items-center">
                   {row.breakdown.map((s, idx) => {
                      const isDirect = s.type === 'direct';
                      return (
                          <Badge key={idx} variant={isDirect ? 'blue' : 'gray'} className="flex items-center gap-1">
                             {isDirect ? <Zap size={10}/> : <Shield size={10}/>} {s.label}
                          </Badge>
                      )
                   })}
               </div>
            </div>
          )
        }
      }
    ];

    if (!isOpen) return null;

    const activeMenuInfo = currentDetailRow ? allSystemForms.find(f => String(f.id) === String(currentDetailRow.id)) : null;
    const availActions = activeMenuInfo ? activeMenuInfo.available_actions : [];
    const availScopes = activeMenuInfo ? activeMenuInfo.available_scopes : [];
    const activeSource = currentDetailRow ? currentDetailRow.breakdown.find(b => b.sourceId === activeSourceId) : null;
    const isReadOnly = activeSource ? activeSource.type === 'role' : true;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('مدیریت دسترسی‌های کاربر:', 'User Permissions Management:')} ${user?.username || ''}`} width="max-w-6xl" language={language}>
            <div className="flex flex-col h-[650px] bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                
                <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto w-full">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 shrink-0">
                            <User size={16} />
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            {t('نقش‌های اختصاص یافته:', 'Assigned Roles:')}
                        </span>
                        <div className="flex gap-1 flex-wrap items-center">
                            {assignedRoles.map(rId => {
                                const role = allRoles.find(r => String(r.id) === String(rId));
                                return (
                                    <div key={rId} className="flex items-center gap-1 bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-[11px] font-bold shadow-sm">
                                        {role?.title || rId}
                                        <button onClick={() => handleRemoveRole(rId)} className="hover:text-red-500 rounded-full p-0.5 transition-colors">
                                            <X size={10} strokeWidth={3}/>
                                        </button>
                                    </div>
                                );
                            })}
                            {assignedRoles.length === 0 && <span className="text-[10px] text-slate-400 italic px-2">{t('بدون نقش', 'No roles')}</span>}
                        </div>
                    </div>
                    
                    <div className="shrink-0 w-64">
                        <SelectField 
                            size="sm"
                            placeholder={t('+ افزودن نقش جدید...', '+ Add new role...')}
                            options={allRoles.filter(r => !assignedRoles.includes(r.id)).map(r => ({ value: r.id, label: r.title }))}
                            value=""
                            onChange={(e) => { if(e.target.value) handleAddRole(e.target.value); }}
                            isRtl={isRtl}
                        />
                    </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-5 gap-5">
                    
                    <div className={`flex flex-col bg-white dark:bg-slate-900 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm ${(currentDetailRow && !String(selectedMenuId).startsWith('temp_') && isDetailPanelVisible) ? 'w-full md:w-7/12' : 'w-full'}`}>
                        <div className="flex-1 min-h-0 relative">
                            <DataGrid 
                                data={effectivePermissions}
                                columns={columns}
                                language={language}
                                selectable={true}
                                hideImport={true}
                                selectedIds={gridSelectedIds}
                                onSelectChange={setGridSelectedIds}
                                activeRowId={selectedMenuId}
                                onRowClick={(row) => {
                                    setSelectedMenuId(row.id);
                                    if (row.breakdown && row.breakdown.length > 0) {
                                        if (!activeSourceId || !row.breakdown.find(b => b.sourceId === activeSourceId)) {
                                            setActiveSourceId(row.breakdown[0].sourceId);
                                        }
                                        if (!row.id.toString().startsWith('temp_')) setIsDetailPanelVisible(true);
                                    } else {
                                        setActiveSourceId('direct');
                                        if (!row.id.toString().startsWith('temp_')) setIsDetailPanelVisible(true);
                                    }
                                }}
                                onAdd={handleInlineAddRow}
                                onRowDoubleClick={(row) => {
                                    setSelectedMenuId(row.id);
                                    if (row.breakdown && row.breakdown.length > 0) setActiveSourceId(row.breakdown[0].sourceId);
                                    if (!row.id.toString().startsWith('temp_')) setIsDetailPanelVisible(true);
                                }}
                                actions={[
                                    { 
                                        icon: Eye, 
                                        tooltip: t('مشاهده جزئیات', 'View Details'), 
                                        hidden: (row) => row.id.toString().startsWith('temp_'),
                                        onClick: (row) => {
                                            setSelectedMenuId(row.id);
                                            if (row.breakdown && row.breakdown.length > 0) setActiveSourceId(row.breakdown[0].sourceId);
                                            setIsDetailPanelVisible(true);
                                        },
                                        className: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded transition-colors'
                                    },
                                    {
                                        icon: Trash2,
                                        tooltip: t('حذف دسترسی مستقیم', 'Delete Direct Access'),
                                        hidden: (row) => !directPerms[String(row.id)],
                                        onClick: (row) => handleDeleteDirect(row.id),
                                        className: 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 p-1.5 rounded transition-colors'
                                    }
                                ]}
                                bulkActions={[
                                    {
                                        label: t('حذف دسترسی‌های مستقیم', 'Delete Direct Accesses'),
                                        icon: Trash2,
                                        variant: 'danger-outline',
                                        onClick: (ids) => handleBulkDeleteDirect(ids)
                                    }
                                ]}
                            />
                        </div>
                    </div>

                    {currentDetailRow && !selectedMenuId.toString().startsWith('temp_') && isDetailPanelVisible && (
                        <div className="w-full md:w-5/12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200 relative z-10 shadow-sm">
                            <div className="absolute top-3 left-3">
                                <button onClick={() => { setSelectedMenuId(null); setIsDetailPanelVisible(false); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors">
                                    <X size={14}/>
                                </button>
                            </div>
                            
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                                <h3 className="font-black text-slate-800 dark:text-slate-100 text-[13px] mb-1.5 pr-6">{currentDetailRow.name}</h3>
                                <div className="text-[10px] text-slate-500 font-sans leading-tight">{currentDetailRow.path}</div>
                            </div>

                            <div className="flex-1 flex flex-col overflow-hidden">
                                {currentDetailRow.breakdown && currentDetailRow.breakdown.length > 1 && (
                                    <div className="px-4 pt-4 border-b border-slate-100 dark:border-slate-800">
                                        <Tabs 
                                            tabs={currentDetailRow.breakdown.map(s => ({ 
                                                id: s.sourceId, 
                                                label: s.label, 
                                                icon: s.type === 'direct' ? Zap : Shield 
                                            }))}
                                            activeTab={activeSourceId}
                                            onChange={setActiveSourceId}
                                        />
                                    </div>
                                )}

                                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                                    {activeSource && (
                                        <>
                                            {!isReadOnly && (
                                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 p-2.5 rounded shadow-sm mb-4">
                                                    <Zap size={14} className="text-blue-600 dark:text-blue-400" />
                                                    <span className="font-bold text-[11px] text-blue-800 dark:text-blue-300">
                                                        {t('شما در حال ویرایش دسترسی مستقیم هستید.', 'Editing Direct Access.')}
                                                    </span>
                                                </div>
                                            )}

                                            {isReadOnly && (
                                                <div className="flex items-start gap-2 text-[10px] text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 p-2.5 rounded leading-relaxed border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                                                    <Info size={14} className="shrink-0 text-amber-500 mt-0.5"/>
                                                    {t('این دسترسی‌ها از نقش به ارث رسیده‌اند و در اینجا قابل تغییر نیستند. برای ویرایش باید به فرم مدیریت نقش‌ها بروید.', 'Inherited from role. To edit, please use the Role Management screen.')}
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                                                    {t('عملیات مجاز (Actions)', 'Allowed Actions')}
                                                </div>

                                                {availActions.length === 0 ? (
                                                    <div className="text-[10px] text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                                        {t('عملیاتی برای این فرم تعریف نشده است.', 'No actions defined.')}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {availActions.map(actId => (
                                                            <CheckboxField
                                                                key={actId}
                                                                label={actionDictionary[actId]?.[isRtl ? 'fa' : 'en'] || actId}
                                                                checked={activeSource.actions.includes(actId)}
                                                                onChange={() => handleUpdateDirectPermission(currentDetailRow.id, 'action', actId)}
                                                                disabled={isReadOnly}
                                                                isRtl={isRtl}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {availScopes.length > 0 && (
                                                <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                                                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                                                        {t('محدودیت دسترسی به داده‌ها', 'Data Scopes')}
                                                    </div>
                                                    
                                                    {availScopes.map(scopeId => {
                                                        const scopeDataList = scopesData[scopeId] || [];
                                                        const displayLabel = SCOPE_DICT[scopeId]?.[isRtl ? 'fa' : 'en'] || scopeId;

                                                        return (
                                                            <div key={scopeId} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden flex flex-col shadow-sm mb-3">
                                                                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-400">
                                                                    {displayLabel}
                                                                </div>
                                                                <div className="p-3">
                                                                    {scopeDataList.length > 0 ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                                                                            {scopeDataList.map(item => (
                                                                                <CheckboxField
                                                                                    key={item.id}
                                                                                    label={item.title}
                                                                                    checked={activeSource.scopes?.[scopeId]?.includes(item.id)}
                                                                                    onChange={() => handleUpdateDirectPermission(currentDetailRow.id, 'scope', scopeId, item.id)}
                                                                                    disabled={isReadOnly}
                                                                                    isRtl={isRtl}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-400 italic">{t('داده‌ای یافت نشد.', 'No data found.')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-slate-500 font-medium hidden sm:block">
                        {t('تمامی دسترسی‌های مستقیم و نقش‌های اختصاص یافته پس از ذخیره، برای کاربر فعال می‌شوند.', 'All direct permissions and role assignments will be applied upon saving.')}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={onClose}>{t('بستن', 'Close')}</Button>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            className={`flex-1 sm:flex-none transition-opacity ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`} 
                            icon={Save} 
                            onClick={hasChanges ? handleSavePermissions : undefined} 
                            isLoading={isLoading}
                        >
                            {t('ذخیره تغییرات', 'Save Changes')}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
  };

  window.UserAccess = UserAccess;
})();