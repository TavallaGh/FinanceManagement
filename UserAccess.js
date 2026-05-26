/* Filename: security/UserAccess.js */
(() => {
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const { useState, useEffect, useCallback, useMemo, useRef } = React;
  
  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    Shield = FallbackIcon, Lock = FallbackIcon, Save = FallbackIcon, 
    Check = FallbackIcon, AlertCircle = FallbackIcon, User = FallbackIcon,
    Zap = FallbackIcon, X = FallbackIcon, Plus = FallbackIcon, ChevronLeft = FallbackIcon,
    FileText = FallbackIcon, Info = FallbackIcon, Search = FallbackIcon, Trash2 = FallbackIcon,
    Eye = FallbackIcon
  } = LucideIcons;

  const DesignSystem = window.DesignSystem || window.DSCore || {};
  const { 
      Modal = () => null, 
      Button = () => null,
      DataGrid = () => null
  } = DesignSystem;

  const supabase = window.supabase;

  const SCOPE_DICT = {
    'docTypes': { fa: 'انواع سند مجاز', en: 'Allowed Document Types' },
    'branches': { fa: 'شعب مجاز', en: 'Allowed Branches' }
  };

  const InlineSearch = ({ term, setTerm, results, onSelect, onCancel, t, isRtl }) => {
      const [rect, setRect] = useState(null);
      const inputRef = useRef(null);

      const updateRect = useCallback(() => {
          if (inputRef.current) {
              setRect(inputRef.current.getBoundingClientRect());
          }
      }, []);

      useEffect(() => {
          updateRect();
          window.addEventListener('resize', updateRect);
          window.addEventListener('scroll', updateRect, true);
          return () => {
              window.removeEventListener('resize', updateRect);
              window.removeEventListener('scroll', updateRect, true);
          };
      }, [updateRect]);

      const dropdownContent = (
          <div 
              style={{ 
                  position: 'fixed', 
                  top: rect ? rect.bottom + 4 : 0, 
                  left: rect ? rect.left : 0, 
                  width: rect ? rect.width : 'auto', 
                  zIndex: 999999 
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-lg max-h-56 overflow-y-auto custom-scrollbar"
          >
              {results.length > 0 ? results.map(f => (
                  <div 
                      key={f.id} 
                      onClick={() => onSelect(f)} 
                      className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-[12px] border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors"
                  >
                      <div className="font-bold text-slate-800 dark:text-slate-200">{f.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{f.fullPath}</div>
                  </div>
              )) : (
                  <div className="p-4 text-[11px] text-slate-400 text-center">{t('موردی یافت نشد.', 'No items found.')}</div>
              )}
          </div>
      );

      return (
          <div className="relative w-full flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <div className="relative flex-1">
                  <div className={`absolute inset-y-0 flex items-center pointer-events-none text-slate-400 ${isRtl ? 'right-2' : 'left-2'}`}>
                      <Search size={14}/>
                  </div>
                  <input
                      ref={inputRef}
                      autoFocus
                      value={term}
                      onChange={(e) => {
                          setTerm(e.target.value);
                          updateRect();
                      }}
                      placeholder={t('جستجوی نام فرم جهت افزودن...', 'Search form name...')}
                      className={`w-full h-8 text-[11px] font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-blue-400 dark:border-blue-500 rounded outline-none focus:ring-2 focus:ring-blue-500 shadow-inner ${isRtl ? 'pr-8 pl-2' : 'pl-8 pr-2'}`}
                  />
                  {term && rect && (ReactDOM ? ReactDOM.createPortal(dropdownContent, document.body) : <div className="absolute top-full left-0 right-0 z-50">{dropdownContent}</div>)}
              </div>
              <button 
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  onClick={onCancel}
                  title={t('انصراف', 'Cancel')}
              >
                  <X size={16}/>
              </button>
          </div>
      );
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

    const [isInlineAdding, setIsInlineAdding] = useState(false);
    const [inlineSearchTerm, setInlineSearchTerm] = useState('');

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
        setIsInlineAdding(false);
        setInlineSearchTerm('');
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
                    if (!rPerms[p.role_id]) rPerms[p.role_id] = [];
                    rPerms[p.role_id].push({ menu_id: p.menu_id, actions, scopes });
                }
                
                if (p.user_id && p.user_id === user.id) {
                    dPerms[p.menu_id] = { id: p.id, actions, scopes };
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
        let current = menusData.find(m => m.id === menuId);
        while (current) {
            pathParts.unshift(getMenuLabel(current));
            current = menusData.find(m => m.id === current.parent_id);
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
            const rolePerms = globalRolePerms[roleId] || [];
            const roleInfo = allRoles.find(r => r.id === roleId);
            
            rolePerms.forEach(p => {
                const formInfo = allSystemForms.find(f => f.id === p.menu_id);
                if (!formInfo) return; 
                if (!map.has(p.menu_id)) {
                    map.set(p.menu_id, { id: p.menu_id, path: formInfo.fullPath, name: formInfo.label, breakdown: [] });
                }
                map.get(p.menu_id).breakdown.push({ 
                    sourceId: `role_${roleId}`, 
                    type: 'role', 
                    label: `${t('نقش:', 'Role:')} ${roleInfo?.title || roleId}`, 
                    actions: p.actions, 
                    scopes: p.scopes 
                });
            });
        });

        Object.entries(directPerms).forEach(([menuId, p]) => {
            const formInfo = allSystemForms.find(f => f.id === menuId);
            if (!formInfo) return;
            if (!map.has(menuId)) {
                map.set(menuId, { id: menuId, path: formInfo.fullPath, name: formInfo.label, breakdown: [] });
            }
            const existing = map.get(menuId).breakdown.find(b => b.type === 'direct');
            if (existing) {
                existing.actions = p.actions || []; 
                existing.scopes = p.scopes || {};
            } else {
                map.get(menuId).breakdown.push({ 
                    sourceId: 'direct', 
                    type: 'direct', 
                    label: t('مستقیم', 'Direct'), 
                    actions: p.actions || [], 
                    scopes: p.scopes || {} 
                });
            }
        });

        const list = Array.from(map.values());

        if (isInlineAdding) {
            list.unshift({
                id: 'INLINE_NEW',
                path: '',
                name: '',
                isNewRow: true,
                breakdown: []
            });
        }

        return list;
    }, [assignedRoles, directPerms, allSystemForms, globalRolePerms, allRoles, t, isInlineAdding]);

    const currentDetailRow = useMemo(() => {
        if (!selectedMenuId) return null;
        if (selectedMenuId === 'INLINE_NEW') return { id: 'INLINE_NEW', isNewRow: true, breakdown: [] };
        return effectivePermissions.find(r => r.id === selectedMenuId) || null;
    }, [selectedMenuId, effectivePermissions]);

    const inlineFilteredForms = useMemo(() => {
        if (!inlineSearchTerm) return [];
        return allSystemForms
            .filter(f => !directPerms[f.id] && f.fullPath.toLowerCase().includes(inlineSearchTerm.toLowerCase()))
            .slice(0, 15);
    }, [allSystemForms, directPerms, inlineSearchTerm]);

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
              const hasActions = data.actions && data.actions.length > 0;
              const hasScopes = data.scopes && Object.keys(data.scopes).some(k => data.scopes[k]?.length > 0);

              if (hasActions || hasScopes) {
                  const payload = { 
                      user_id: user.id, 
                      menu_id: menuId, 
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

    const handleAddDirectForm = (form) => {
        if (directPerms[form.id]) {
            alert(t('این فرم قبلاً در لیست دسترسی‌های مستقیم وجود دارد.', 'This form is already in direct permissions list.'));
            return;
        }

        setDirectPerms(prev => ({
            ...prev,
            [form.id]: { id: null, actions: [], scopes: {} }
        }));
        
        setIsInlineAdding(false);
        setInlineSearchTerm('');
        setSelectedMenuId(form.id);
        setGridSelectedIds([form.id]);
        setActiveSourceId('direct');
        setHasChanges(true);
    };

    const handleDeleteDirect = (menuId) => {
        const perm = directPerms[menuId];
        if (perm && perm.id) {
            setDeletedPermIds(prev => [...prev, perm.id]);
        }
        
        setDirectPerms(prev => {
            const next = { ...prev };
            delete next[menuId];
            return next;
        });

        setGridSelectedIds(prev => prev.filter(id => id !== menuId));

        if (selectedMenuId === menuId) {
            if (activeSourceId === 'direct') {
                const current = effectivePermissions.find(r => r.id === menuId);
                const roleSources = current?.breakdown.filter(b => b.type === 'role') || [];
                if (roleSources.length > 0) {
                    setActiveSourceId(roleSources[0].sourceId);
                } else {
                    setSelectedMenuId(null);
                    setActiveSourceId(null);
                }
            }
        }
        setHasChanges(true);
    };

    const handleBulkDeleteDirect = (menuIds) => {
        const idsToDelete = [];
        menuIds.forEach(id => {
            if (directPerms[id] && directPerms[id].id) {
                idsToDelete.push(directPerms[id].id);
            }
        });
        
        if (idsToDelete.length > 0) {
            setDeletedPermIds(prev => [...prev, ...idsToDelete]);
        }

        setDirectPerms(prev => {
            const next = { ...prev };
            menuIds.forEach(id => delete next[id]);
            return next;
        });

        setGridSelectedIds(prev => prev.filter(id => !menuIds.includes(id)));

        if (menuIds.includes(selectedMenuId) && activeSourceId === 'direct') {
            setSelectedMenuId(null);
            setActiveSourceId(null);
        }
        setHasChanges(true);
    };

    const handleUpdateDirectPermission = (formId, type, key, value) => {
        setDirectPerms(prev => {
            const current = prev[formId] || { id: null, actions: [], scopes: {} };
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
                [formId]: {
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
            if (row.isNewRow) {
                return (
                    <InlineSearch 
                        term={inlineSearchTerm} 
                        setTerm={setInlineSearchTerm} 
                        results={inlineFilteredForms} 
                        onSelect={handleAddDirectForm} 
                        onCancel={() => { setIsInlineAdding(false); setInlineSearchTerm(''); }} 
                        t={t} 
                        isRtl={isRtl} 
                    />
                );
            }
            return (
                <div className="flex flex-col py-0.5 w-full">
                    <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{row.name}</span>
                    <span className="text-[10px] text-slate-400 font-sans truncate">{row.path}</span>
                </div>
            )
        }
      },
      { 
        field: 'source', 
        header_fa: 'نوع دسترسی', 
        header_en: 'Access Type', 
        width: '250px',
        render: (val, row) => {
           if (row.isNewRow) return <span className="text-slate-400 text-[10px] italic">{t('نام فرم را جستجو و انتخاب کنید...', 'Search and select form...')}</span>;
           return (
              <div className="flex items-center w-full min-h-[24px]">
                 <div className="flex flex-wrap gap-1 flex-1 items-center">
                     {row.breakdown.map((s, idx) => {
                        const isDirect = s.type === 'direct';
                        return (
                            <span 
                               key={idx} 
                               className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1
                                   ${isDirect 
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' 
                                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                            >
                               {isDirect ? <Zap size={10}/> : <Shield size={10}/>} {s.label}
                            </span>
                        )
                     })}
                 </div>
              </div>
           )
        }
      }
    ];

    if (!isOpen) return null;

    const activeMenuInfo = currentDetailRow ? allSystemForms.find(f => f.id === currentDetailRow.id) : null;
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
                                const role = allRoles.find(r => r.id === rId);
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
                    
                    <div className="shrink-0 flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-1">
                        <select 
                            className="bg-transparent text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none w-48 cursor-pointer"
                            onChange={e => { if(e.target.value) handleAddRole(e.target.value); e.target.value = ''; }}
                        >
                            <option value="">{t('+ افزودن نقش جدید...', '+ Add new role...')}</option>
                            {allRoles.filter(r => !assignedRoles.includes(r.id)).map(r => (
                                <option key={r.id} value={r.id}>{r.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-5 gap-5">
                    
                    <div className={`flex flex-col bg-white dark:bg-slate-900 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm ${currentDetailRow ? 'w-full md:w-7/12' : 'w-full'}`}>
                        <div className="flex-1 min-h-0 relative">
                            <DataGrid 
                                data={effectivePermissions}
                                columns={columns}
                                language={language}
                                selectable={true}
                                selectedIds={gridSelectedIds}
                                onSelectChange={setGridSelectedIds}
                                activeRowId={selectedMenuId}
                                onRowClick={(row) => {
                                    if (row.isNewRow) return;
                                    setSelectedMenuId(row.id);
                                    if (row.breakdown && row.breakdown.length > 0) {
                                        if (!activeSourceId || !row.breakdown.find(b => b.sourceId === activeSourceId)) {
                                            setActiveSourceId(row.breakdown[0].sourceId);
                                        }
                                    } else {
                                        setActiveSourceId(null);
                                    }
                                }}
                                onAdd={() => {
                                    setIsInlineAdding(true);
                                    setInlineSearchTerm('');
                                }}
                                onRowDoubleClick={(row) => {
                                    if (row.isNewRow) return;
                                    setSelectedMenuId(row.id);
                                    if (row.breakdown.length > 0) setActiveSourceId(row.breakdown[0].sourceId);
                                }}
                                actions={[
                                    { 
                                        icon: Eye, 
                                        tooltip: t('مشاهده جزئیات', 'View Details'), 
                                        onClick: (row) => {
                                            if (row.isNewRow) return;
                                            setSelectedMenuId(row.id);
                                            if (row.breakdown.length > 0) setActiveSourceId(row.breakdown[0].sourceId);
                                        },
                                        className: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded transition-colors'
                                    },
                                    {
                                        icon: Trash2,
                                        tooltip: t('حذف دسترسی مستقیم', 'Delete Direct Access'),
                                        hidden: (row) => row.isNewRow || !row.breakdown.some(b => b.type === 'direct'),
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

                    {currentDetailRow && !currentDetailRow.isNewRow && (
                        <div className="w-full md:w-5/12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200 relative z-10 shadow-sm">
                            <div className="absolute top-3 left-3">
                                <button onClick={() => setSelectedMenuId(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors">
                                    <X size={14}/>
                                </button>
                            </div>
                            
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                                <h3 className="font-black text-slate-800 dark:text-slate-100 text-[13px] mb-1.5 pr-6">{currentDetailRow.name}</h3>
                                <div className="text-[10px] text-slate-500 font-sans leading-tight">{currentDetailRow.path}</div>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                                
                                {currentDetailRow.breakdown.length > 1 && (
                                    <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        {currentDetailRow.breakdown.map((s, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setActiveSourceId(s.sourceId)}
                                                className={`px-3 py-1.5 rounded text-[11px] font-bold border transition-all flex items-center gap-1.5
                                                ${activeSourceId === s.sourceId 
                                                    ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-600' 
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'}`}
                                            >
                                                {s.type === 'direct' ? <Zap size={12}/> : <Shield size={12}/>}
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeSource && (
                                    <>
                                        {!isReadOnly && (
                                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 p-2.5 rounded shadow-sm">
                                                <Zap size={14} className="text-blue-600 dark:text-blue-400" />
                                                <span className="font-bold text-[11px] text-blue-800 dark:text-blue-300">
                                                    {t('شما در حال ویرایش دسترسی مستقیم هستید.', 'Editing Direct Access.')}
                                                </span>
                                            </div>
                                        )}

                                        {isReadOnly && (
                                            <div className="flex items-start gap-2 text-[10px] text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 p-2.5 rounded leading-relaxed border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <Info size={14} className="shrink-0 text-amber-500 mt-0.5"/>
                                                {t('این دسترسی‌ها از نقش به ارث رسیده‌اند و در اینجا قابل تغییر نیستند. برای ویرایش باید به فرم مدیریت نقش‌ها بروید.', 'Inherited from role. To edit, please use the Role Management screen.')}
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                                                {t('عملیات مجاز (Actions)', 'Allowed Actions')}
                                            </div>

                                            {availActions.length === 0 ? (
                                                <div className="text-[10px] text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                                    {t('عملیاتی برای این فرم تعریف نشده است.', 'No actions defined.')}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                                    {availActions.map(actId => {
                                                        const isChecked = activeSource.actions.includes(actId);
                                                        const labelObj = actionDictionary[actId];
                                                        const lbl = labelObj ? labelObj[isRtl ? 'fa' : 'en'] : actId;

                                                        if (isReadOnly) {
                                                            return (
                                                                <div key={actId} className={`flex flex-col items-center justify-center text-center gap-1.5 p-2.5 rounded border bg-slate-50 dark:bg-slate-800 ${isChecked ? 'border-blue-200 dark:border-blue-800 opacity-100 shadow-sm' : 'border-slate-100 dark:border-slate-800 opacity-50'}`}>
                                                                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'text-transparent border-slate-300'}`}>
                                                                        <Check size={12} strokeWidth={3}/>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{lbl}</span>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <label 
                                                                key={actId} 
                                                                onClick={() => handleUpdateDirectPermission(currentDetailRow.id, 'action', actId)}
                                                                className={`flex flex-col items-center justify-center text-center gap-1.5 p-2.5 rounded border cursor-pointer transition-all bg-white dark:bg-slate-800 ${isChecked ? 'border-blue-400 ring-1 ring-blue-100 dark:ring-0 dark:border-blue-500 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                    {isChecked && <Check size={12} strokeWidth={3}/>}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{lbl}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {availScopes.length > 0 && (
                                            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                                                    {t('محدودیت دسترسی به داده‌ها', 'Data Scopes')}
                                                </div>
                                                
                                                {availScopes.map(scopeId => {
                                                    const scopeDataList = scopesData[scopeId] || [];
                                                    const displayLabel = SCOPE_DICT[scopeId]?.[isRtl ? 'fa' : 'en'] || scopeId;

                                                    return (
                                                        <div key={scopeId} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden flex flex-col shadow-sm">
                                                            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-400">
                                                                {displayLabel}
                                                            </div>
                                                            <div className="p-2.5 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                                                {scopeDataList.length > 0 ? scopeDataList.map(item => {
                                                                    const isSelected = activeSource.scopes?.[scopeId]?.includes(item.id);

                                                                    if (isReadOnly) {
                                                                        if (!isSelected) return null;
                                                                        return (
                                                                            <span key={item.id} className="px-2.5 py-1 text-[10px] rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 font-bold flex items-center gap-1 shadow-sm">
                                                                                <Check size={10} strokeWidth={3}/> {item.title}
                                                                            </span>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div 
                                                                            key={item.id} 
                                                                            onClick={() => handleUpdateDirectPermission(currentDetailRow.id, 'scope', scopeId, item.id)}
                                                                            className={`px-2.5 py-1 text-[10px] rounded border cursor-pointer select-none transition-all flex items-center gap-1 shadow-sm ${isSelected ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400'}`}
                                                                        >
                                                                            {isSelected && <Check size={10} strokeWidth={3}/>}
                                                                            {item.title}
                                                                        </div>
                                                                    );
                                                                }) : (
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