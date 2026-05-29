/* Filename: security/RoleManagement.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;
  
  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    Shield = FallbackIcon, Users = FallbackIcon, Edit = FallbackIcon, 
    Trash2 = FallbackIcon, Save = FallbackIcon, Plus = FallbackIcon, 
    Search = FallbackIcon, AlertTriangle = FallbackIcon, Calendar = FallbackIcon, 
    ChevronDown = FallbackIcon, Check = FallbackIcon, X = FallbackIcon
  } = LucideIcons;

  const Core = window.DSCore || window.DesignSystem || {};
  const formatGlobalDate = Core.formatGlobalDate || ((v) => v);
  const useCalendarMode = Core.useCalendarMode || (() => 'jalali');

  const DesignSystem = window.DesignSystem || window.DSCore || {};
  const { 
    Button = () => null, 
    PageHeader = () => null, 
    Modal = () => null, 
    AdvancedFilter = () => null, 
    DataGrid = () => null, 
    TextField = () => null, 
    ToggleField = () => null, 
    DatePicker = () => null,
    LOVField = () => null
  } = DesignSystem;

  const supabase = window.supabase;
  const RoleAccess = window.RoleAccess;

  const RoleManagement = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    
    const globalCalendarMode = useCalendarMode();

    const [roles, setRoles] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [menus, setMenus] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [userRoles, setUserRoles] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);
    
    const [roleModal, setRoleModal] = useState({ isOpen: false, data: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    
    const [userModal, setUserModal] = useState({ isOpen: false, role: null });
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [inlineUserEdit, setInlineUserEdit] = useState(null);

    const [accessModal, setAccessModal] = useState({ isOpen: false, role: null });

    const [formData, setFormData] = useState({
      id: null,
      code: '',
      title: '',
      is_active: true,
      description: '',
      start_date: '',
      end_date: ''
    });

    const viewConfig = {
      pageId: 'roles_main',
      currentState: () => ({ filters, gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.filters) setFilters(state.filters);
          if (state.gridState) setGridState(state.gridState);
        } else {
          setFilters({});
          setGridState(null);
        }
      }
    };

    useEffect(() => {
      fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const { data: rolesData } = await supabase.from('sec_roles').select('*').order('created_at', { ascending: false });
        const { data: pData } = await supabase.from('parties').select('id, first_name, last_name, company_name, party_type');
        const { data: uData } = await supabase.from('sec_users').select('id, username, is_active, party_id').eq('is_active', true);
        const { data: userRolesData } = await supabase.from('sec_user_roles').select('role_id, user_id');
        const { data: permsData } = await supabase.from('sec_permissions').select('role_id, menu_id');
        const { data: menusData } = await supabase.from('menus').select('*');

        if (userRolesData) setUserRoles(userRolesData);
        if (permsData) setPermissions(permsData);
        if (menusData) setMenus(menusData);

        if (rolesData) {
            const mappedRoles = rolesData.map(r => ({
                ...r,
                hasUsers: userRolesData ? userRolesData.some(ur => ur.role_id === r.id) : false,
                hasPerms: permsData ? permsData.some(p => p.role_id === r.id) : false,
            }));
            setRoles(mappedRoles);
        }

        if (uData) {
            const mappedUsers = uData.map(u => {
                const p = pData?.find(x => x.id === u.party_id);
                let fullName = '';
                if (p) {
                    fullName = p.party_type === 'legal' ? (p.company_name || '') : `${p.first_name || ''} ${p.last_name || ''}`.trim();
                }
                return { ...u, fullName: fullName || '-' };
            });
            setAllUsers(mappedUsers);
        }
      } catch (err) {
        console.error('Fetch Roles Data Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase.from('sec_roles').update({ is_active: newValue }).eq('id', row.id);
        if (error) throw error;
        setRoles(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (err) {
        console.error("Toggle Active Error:", err);
      }
    };

    const handleOpenRoleModal = (record = null) => {
      setFormData(record ? {
        id: record.id,
        code: record.code || '',
        title: record.title || '',
        is_active: record.is_active ?? true,
        description: record.description || '',
        start_date: record.start_date || '',
        end_date: record.end_date || ''
      } : { 
        id: null,
        code: '',
        title: '',
        is_active: true,
        description: '',
        start_date: '',
        end_date: ''
      });
      setRoleModal({ isOpen: true, data: record });
    };

    const handleSaveRole = async () => {
      if (!formData.code || !formData.title) return;
      setIsLoading(true);
      try {
        const payload = {
          code: formData.code,
          title: formData.title,
          is_active: formData.is_active,
          description: formData.description,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          updated_at: new Date().toISOString()
        };

        if (roleModal.data?.id) {
          const { error } = await supabase.from('sec_roles').update(payload).eq('id', roleModal.data.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('sec_roles').insert([payload]);
          if (error) throw error;
        }

        setRoleModal({ isOpen: false, data: null });
        fetchInitialData();
      } catch (err) {
        console.error('Save Role Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const executeDelete = async () => {
      if (!deleteConfirm.data) return;
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'role') {
            const { error } = await supabase.from('sec_roles').delete().eq('id', deleteConfirm.data.id);
            if (error) throw error;
            fetchInitialData();
        } else if (deleteConfirm.type === 'user_role') {
            const { error } = await supabase.from('sec_user_roles').delete().match({ user_id: deleteConfirm.data.id, role_id: userModal.role.id });
            if (error) throw error;
            setAssignedUsers(prev => prev.filter(u => u.id !== deleteConfirm.data.id));
            fetchInitialData();
        } else if (deleteConfirm.type === 'bulk_user_role') {
            const validIds = deleteConfirm.data.filter(id => id !== 'new');
            if (validIds.length > 0) {
                const { error } = await supabase.from('sec_user_roles').delete().eq('role_id', userModal.role.id).in('user_id', validIds);
                if (error) throw error;
            }
            setAssignedUsers(prev => prev.filter(u => !deleteConfirm.data.includes(u.id)));
            if (deleteConfirm.data.includes('new')) {
                setInlineUserEdit(null);
            }
            fetchInitialData();
        }
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        console.error('Delete Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const openUserModal = async (role) => {
        setIsLoading(true);
        setUserModal({ isOpen: true, role });
        setInlineUserEdit(null);

        try {
            const { data: userRoles } = await supabase.from('sec_user_roles').select('user_id, start_date, end_date').eq('role_id', role.id);
            if (userRoles) {
                const assigned = userRoles.map(ur => {
                    const u = allUsers.find(x => x.id === ur.user_id);
                    return u ? { ...u, start_date: ur.start_date, end_date: ur.end_date } : null;
                }).filter(Boolean);
                setAssignedUsers(assigned);
            } else {
                setAssignedUsers([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUserClick = () => {
        if (inlineUserEdit) return;
        setInlineUserEdit({
            id: 'new',
            data: { user_id: '', user_obj: null, start_date: '', end_date: '' }
        });
    };

    const handleSaveUserInline = async () => {
        const form = inlineUserEdit.data;
        if (!form.user_id) return;
        
        if (inlineUserEdit.id === 'new' && assignedUsers.some(u => String(u.id) === String(form.user_id))) {
            alert(t('این کاربر قبلاً به نقش تخصیص داده شده است.', 'This user is already assigned to the role.'));
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                user_id: form.user_id,
                role_id: userModal.role.id,
                start_date: form.start_date || null,
                end_date: form.end_date || null
            };
            
            if (inlineUserEdit.id === 'new') {
                const { error } = await supabase.from('sec_user_roles').insert([payload]);
                if (error) throw error;
            } else {
                const oldUserId = inlineUserEdit.original_user_id;
                if (String(oldUserId) !== String(form.user_id)) {
                    await supabase.from('sec_user_roles').delete().match({ user_id: oldUserId, role_id: userModal.role.id });
                    const { error } = await supabase.from('sec_user_roles').insert([payload]);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('sec_user_roles').update({
                        start_date: payload.start_date,
                        end_date: payload.end_date
                    }).match({ user_id: form.user_id, role_id: userModal.role.id });
                    if (error) throw error;
                }
            }
            
            setInlineUserEdit(null);
            openUserModal(userModal.role);
            fetchInitialData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const usersGridData = useMemo(() => {
        const data = [...assignedUsers];
        if (inlineUserEdit && inlineUserEdit.id === 'new') {
            data.unshift({ id: 'new', _isNew: true, ...inlineUserEdit.data });
        }
        return data;
    }, [assignedUsers, inlineUserEdit]);

    const availableUsersForAssign = useMemo(() => {
        const assignedIds = assignedUsers.map(u => String(u.id));
        return allUsers.filter(u => {
            if (inlineUserEdit && inlineUserEdit.id !== 'new' && String(u.id) === String(inlineUserEdit.data.user_id)) return true;
            return !assignedIds.includes(String(u.id));
        });
    }, [allUsers, assignedUsers, inlineUserEdit]);

    const columns = [
      { field: 'code', header_fa: 'کد نقش', header_en: 'Role Code', width: '120px', render: (val) => <span className="text-[11px] text-slate-700 dark:text-slate-300 dir-ltr inline-block">{val}</span> },
      { field: 'title', header_fa: 'عنوان نقش', header_en: 'Role Title', width: '200px', render: (val) => <span className="font-bold text-slate-800 dark:text-slate-200 text-[12px]">{val}</span> },
      { field: 'start_date', header_fa: 'تاریخ شروع', header_en: 'Start Date', width: '120px', render: (val) => val ? <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /><span className="text-[11px] text-slate-700 dark:text-slate-300 dir-ltr inline-block">{formatGlobalDate(val, globalCalendarMode)}</span></div> : '-' },
      { field: 'end_date', header_fa: 'تاریخ پایان', header_en: 'End Date', width: '120px', render: (val) => val ? <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /><span className="text-[11px] text-slate-700 dark:text-slate-300 dir-ltr inline-block">{formatGlobalDate(val, globalCalendarMode)}</span></div> : '-' },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '120px', type: 'toggle', onToggle: (row, val) => handleToggleActive(row, val) },
      { field: 'description', header_fa: 'توضیحات', header_en: 'Description', width: 'auto', minWidth: '200px', render: (val) => <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block w-full" title={val}>{val || '-'}</span> }
    ];

    const assignedUsersColumns = [
        { 
            field: 'fullName', header_fa: 'نام و نام خانوادگی', header_en: 'Full Name', width: 'auto', 
            render: (val, row) => {
                if (inlineUserEdit?.id === row.id) {
                    return (
                        <div onClick={(e)=>e.stopPropagation()}>
                            <LOVField 
                                size="sm" 
                                data={availableUsersForAssign} 
                                columns={[
                                    { field: 'username', header_fa: 'نام کاربری', width: '150px' },
                                    { field: 'fullName', header_fa: 'نام و نام خانوادگی', width: '250px' }
                                ]} 
                                dropdownWidth="min-w-[400px]"
                                displayValue={inlineUserEdit.data.user_obj ? inlineUserEdit.data.user_obj.fullName : ''}
                                onChange={(r) => setInlineUserEdit(prev => ({...prev, data: {...prev.data, user_id: r?.id, user_obj: r}}))}
                            />
                        </div>
                    );
                }
                return <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px]">{val}</span>;
            }
        },
        {
            field: 'username', header_fa: 'نام کاربری', header_en: 'Username', width: '150px',
            render: (val, row) => {
                if (inlineUserEdit?.id === row.id) {
                    return <span className="text-[11px] text-slate-500 dir-ltr inline-block">{inlineUserEdit.data.user_obj?.username || '-'}</span>;
                }
                return <span className="text-[11px] text-slate-500 dir-ltr inline-block">{val}</span>;
            }
        },
        { 
            field: 'start_date', header_fa: 'تاریخ شروع موثر', header_en: 'Start Date', width: '150px', 
            render: (val, row) => {
                if (inlineUserEdit?.id === row.id) {
                    return <div onClick={(e)=>e.stopPropagation()}><DatePicker size="sm" value={inlineUserEdit.data.start_date} onChange={(v) => setInlineUserEdit(prev => ({...prev, data: {...prev.data, start_date: v}}))} isRtl={isRtl} language={language} /></div>
                }
                return val ? <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /><span className="text-[11px] text-slate-700 dark:text-slate-300 dir-ltr inline-block">{formatGlobalDate(val, globalCalendarMode)}</span></div> : '-';
            }
        },
        { 
            field: 'end_date', header_fa: 'تاریخ پایان موثر', header_en: 'End Date', width: '150px', 
            render: (val, row) => {
                if (inlineUserEdit?.id === row.id) {
                    return <div onClick={(e)=>e.stopPropagation()}><DatePicker size="sm" value={inlineUserEdit.data.end_date} onChange={(v) => setInlineUserEdit(prev => ({...prev, data: {...prev.data, end_date: v}}))} isRtl={isRtl} language={language} /></div>
                }
                return val ? <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /><span className="text-[11px] text-slate-700 dark:text-slate-300 dir-ltr inline-block">{formatGlobalDate(val, globalCalendarMode)}</span></div> : '-';
            }
        }
    ];

    const assignedUsersActions = [
        { 
            icon: Save, tooltip: t('ذخیره', 'Save'), 
            hidden: (row) => inlineUserEdit?.id !== row.id, 
            onClick: () => handleSaveUserInline(), 
            className: '!text-emerald-600 hover:!text-emerald-800' 
        },
        { 
            icon: X, tooltip: t('انصراف', 'Cancel'), 
            hidden: (row) => inlineUserEdit?.id !== row.id, 
            onClick: () => setInlineUserEdit(null), 
            className: '!text-slate-500 hover:!text-slate-700' 
        },
        { 
            icon: Edit, tooltip: t('ویرایش', 'Edit'), 
            hidden: (row) => inlineUserEdit?.id === row.id || row._isNew, 
            onClick: (row) => {
                setInlineUserEdit({
                    id: row.id,
                    original_user_id: row.id,
                    data: {
                        user_id: row.id,
                        user_obj: row,
                        start_date: row.start_date || '',
                        end_date: row.end_date || ''
                    }
                });
            },
            className: 'text-slate-400 hover:text-indigo-500' 
        },
        { 
            icon: Trash2, tooltip: t('حذف از نقش', 'Remove from role'), 
            hidden: (row) => inlineUserEdit?.id === row.id || row._isNew, 
            onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'user_role', data: row }), 
            className: 'text-slate-400 hover:text-rose-500' 
        }
    ];

    const filteredRoles = useMemo(() => {
      let res = [...roles];
      
      if (filters.user && filters.user.id) {
         res = res.filter(r => userRoles.some(ur => ur.role_id === r.id && ur.user_id === filters.user.id));
      }
      
      if (filters.form && filters.form.id) {
         res = res.filter(r => permissions.some(p => p.role_id === r.id && p.menu_id === filters.form.id));
      }

      return res;
    }, [roles, filters, userRoles, permissions]);

    const filterFields = [
      { 
        name: 'form', 
        label: t('دسترسی به فرم', 'Form Access'), 
        type: 'lov', 
        lovData: menus.map(m => {
            const parts = [];
            let curr = m;
            while(curr) {
                parts.unshift(isRtl ? (curr.label_fa || curr.title || curr.name) : (curr.label_en || curr.title || curr.name));
                curr = menus.find(x => x.id === curr.parent_id);
            }
            return { 
               id: m.id, 
               label: isRtl ? (m.label_fa || m.title || m.name) : (m.label_en || m.title || m.name), 
               path: parts.join(' / ') 
            };
        }), 
        lovColumns: [
          { field: 'label', header_fa: 'نام فرم', header_en: 'Form Name', width: '150px' },
          { field: 'path', header_fa: 'مسیر کامل', header_en: 'Full Path', width: '350px' }
        ],
        dropdownWidth: 'min-w-[550px]'
      },
      { 
        name: 'user', 
        label: t('کاربران', 'Users'), 
        type: 'lov', 
        lovData: allUsers.map(u => ({ ...u, label: u.fullName || u.username })), 
        lovColumns: [
          { field: 'username', header_fa: 'نام کاربری', header_en: 'Username', width: '150px' },
          { field: 'fullName', header_fa: 'نام و نام خانوادگی', header_en: 'Full Name', width: '250px' }
        ],
        dropdownWidth: 'min-w-[400px]'
      }
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('مدیریت نقش‌ها و دسترسی‌ها', 'Role & Permission Management')} 
          icon={Shield}
          description={t('تعریف نقش‌ها و تخصیص دسترسی‌های ۳ سطحی به فرم‌ها، عملیات و داده‌ها', 'Define roles and assign 3-level permissions to forms, actions, and data scopes')}
          language={language}
          breadcrumbs={[{ label: t('امنیت', 'Security') }, { label: t('نقش‌ها', 'Roles') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-3 animate-in fade-in duration-300">
          <AdvancedFilter 
            fields={filterFields}
            initialValues={filters}
            onFilter={setFilters}
            onClear={() => setFilters({})}
            language={language}
          />

          <div className="flex-1 min-h-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            <DataGrid 
              key={`roles_grid_${language}_${globalCalendarMode}`}
              data={filteredRoles}
              columns={columns} 
              language={language}
              isLoading={isLoading}
              gridState={gridState}
              onGridStateChange={setGridState}
              onAdd={() => handleOpenRoleModal()}
              onRowDoubleClick={(row) => handleOpenRoleModal(row)}
              hideImport={true}
              actions={[
                { icon: Shield, tooltip: t('دسترسی‌ها', 'Permissions'), onClick: (row) => setAccessModal({ isOpen: true, role: row }), className: (row) => row.hasPerms ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-500' },
                { icon: Users, tooltip: t('کاربران نقش', 'Role Users'), onClick: (row) => openUserModal(row), className: (row) => row.hasUsers ? 'text-blue-500 hover:text-blue-600' : 'text-slate-400 hover:text-blue-500' },
                { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => handleOpenRoleModal(row), className: 'text-slate-400 hover:text-indigo-500' },
                { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'role', data: row }), className: 'text-slate-400 hover:text-rose-500' }
              ]}
            />
          </div>
        </div>

        {RoleAccess && <RoleAccess isOpen={accessModal.isOpen} role={accessModal.role} onClose={() => { setAccessModal({ isOpen: false, role: null }); fetchInitialData(); }} language={language} />}

        <Modal isOpen={roleModal.isOpen} onClose={() => setRoleModal({ isOpen: false, data: null })} title={roleModal.data ? t('ویرایش نقش', 'Edit Role') : t('تعریف نقش جدید', 'New Role')} width="max-w-md" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField size="sm" label={t('کد نقش *', 'Role Code *')} value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} isRtl={isRtl} dir="ltr" disabled={!!roleModal.data} placeholder="ROLE_ADMIN" />
                <TextField size="sm" label={t('عنوان نقش *', 'Role Title *')} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} isRtl={isRtl} />
                
                <DatePicker size="sm" label={t('تاریخ شروع', 'Start Date')} value={formData.start_date} onChange={val => setFormData({...formData, start_date: val})} isRtl={isRtl} language={language} />
                <DatePicker size="sm" label={t('تاریخ پایان', 'End Date')} value={formData.end_date} onChange={val => setFormData({...formData, end_date: val})} isRtl={isRtl} language={language} />
                
                <div className="md:col-span-2">
                    <TextField size="sm" label={t('توضیحات', 'Description')} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} isRtl={isRtl} multiline rows={2} />
                </div>
                <div className="md:col-span-2 mt-1 flex items-center">
                    <ToggleField size="sm" label={t('فعال', 'Active')} checked={formData.is_active} onChange={v => setFormData({...formData, is_active: v})} isRtl={isRtl} />
                </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setRoleModal({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveRole} isLoading={isLoading}>{t('ذخیره', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={userModal.isOpen} onClose={() => setUserModal({ isOpen: false, role: null })} title={`${t('تخصیص کاربران به نقش:', 'Assign Users to Role:')} ${userModal.role?.title || ''}`} width="max-w-4xl" language={language}>
            <div className="flex flex-col h-[70vh] min-h-[500px] bg-slate-50 dark:bg-slate-900 p-4 gap-3">
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <DataGrid 
                        key={`users_grid_${language}_${globalCalendarMode}`}
                        columns={assignedUsersColumns} 
                        data={usersGridData} 
                        actions={assignedUsersActions}
                        language={language}
                        isLoading={isLoading}
                        hideImport={true}
                        hideExport={true}
                        onAdd={handleAddUserClick}
                        selectable={true}
                        bulkActions={[
                            {
                                id: 'delete',
                                icon: Trash2,
                                label: t('حذف انتخاب‌شده‌ها', 'Delete Selected'),
                                className: '!text-rose-600 !border-rose-200 hover:!bg-rose-50 dark:!border-rose-800/50 dark:hover:!bg-rose-900/30',
                                onClick: (selectedIds) => setDeleteConfirm({ isOpen: true, type: 'bulk_user_role', data: selectedIds })
                            }
                        ]}
                    />
                </div>
            </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-3 items-center text-center">
            <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 dark:text-rose-400 mb-1">
               <AlertTriangle size={22} />
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[13px] leading-relaxed">
              {deleteConfirm.type === 'role'
                ? t(`آیا از حذف نقش "${deleteConfirm.data?.title}" اطمینان دارید؟ تمامی دسترسی‌های این نقش حذف خواهد شد.`, `Are you sure you want to delete role "${deleteConfirm.data?.title}"? All permissions will be lost.`)
                : deleteConfirm.type === 'bulk_user_role'
                ? t(`آیا از حذف ${deleteConfirm.data?.length} کاربر انتخاب‌شده از این نقش اطمینان دارید؟`, `Are you sure you want to remove ${deleteConfirm.data?.length} selected users from this role?`)
                : t(`آیا از حذف این کاربر از نقش فعلی اطمینان دارید؟`, `Are you sure you want to remove this user from the role?`)
              }
            </p>
            <div className="flex gap-2 mt-4 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1 bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-600 border-rose-600 dark:border-rose-500">{t('تایید حذف', 'Delete')}</Button>
            </div>
          </div>
        </Modal>

      </div>
    );
  };

  window.RoleManagement = RoleManagement;
})();
