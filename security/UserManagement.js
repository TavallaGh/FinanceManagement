/* Filename: security/UserManagement.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;
  
  const { 
    Button, PageHeader, Modal, AdvancedFilter, DataGrid, LOVField,
    TextField, SelectField, ToggleField, Badge, CheckboxField, EmptyState
  } = window.DesignSystem || window.DSCore || {};
  
  const { 
    Users, Edit, Trash2, Save, 
    AlertTriangle, Lock, RefreshCw, Shield, Plus
  } = window.LucideIcons || {};
  const supabase = window.supabase;

  const UserManagement = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const calendarMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';
    
    const [data, setData] = useState([]);
    const [allParties, setAllParties] = useState([]);

    const partiesDropdown = useMemo(() => {
      const sysUsers = allParties.filter(p => p.roles && p.roles.includes('system_user') && p.is_active === true);
      return sysUsers.map(p => ({
        id: p.id,
        code: p.code || '',
        title: p.party_type === 'legal' ? (p.company_name || '') : `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        email: p.email || '',
        mobile: p.mobile || ''
      }));
    }, [allParties]);
    
    const [roles, setRoles] = useState([]);
    const [userRoles, setUserRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [menus, setMenus] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({});
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [resetConfirm, setResetConfirm] = useState({ isOpen: false, data: null });
    const [accessModal, setAccessModal] = useState({ isOpen: false, user: null });
    
    const [formData, setFormData] = useState({
      username: '',
      password: '123456',
      partyId: '',
      userType: 'کاربر سیستم',
      isActive: true,
      email: '',
      mobile: ''
    });

    const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);
    const [isSavingParty, setIsSavingParty] = useState(false);
    const [quickPartyData, setQuickPartyData] = useState({
      code: '',
      firstName: '',
      lastName: '',
      nationalId: '',
      mobile: '',
      email: '',
      roles: ['system_user']
    });

    const PARTY_ROLES = [
      { id: 'system_user', label: t('کاربر سیستم', 'System User') },
      { id: 'employee', label: t('پرسنل / کارمند', 'Employee') },
      { id: 'customer', label: t('مشتری', 'Customer') },
      { id: 'supplier', label: t('تامین‌کننده', 'Supplier') },
      { id: 'shareholder', label: t('سهامدار', 'Shareholder') }
    ];

    const [gridState, setGridState] = useState(null);

    const viewConfig = {
      pageId: 'users_main',
      currentState: () => ({ 
        filters,
        gridState
      }),
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
      fetchData();
    }, []);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: pData, error: pError },
          { data: usersData, error: uError },
          { data: rolesData },
          { data: urData },
          { data: permsData },
          { data: menusData }
        ] = await Promise.all([
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, roles, mobile, email, is_active'),
          supabase.from('sec_users').select('*').order('created_at', { ascending: false }),
          supabase.from('sec_roles').select('*'),
          supabase.from('sec_user_roles').select('*'),
          supabase.from('sec_permissions').select('*'),
          supabase.from('menus').select('*')
        ]);
          
        if (pData && !pError) {
          setAllParties(pData);
        }

        if (uError) throw uError;

        setData(usersData || []);
        setRoles(rolesData || []);
        setUserRoles(urData || []);
        setPermissions(permsData || []);
        setMenus(menusData || []);

      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const hashPassword = async (pass) => {
      const msgBuffer = new TextEncoder().encode(pass);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleSave = async () => {
      if (!formData.username || !formData.partyId) {
        return;
      }
      if (!currentRecord && !formData.password) return;

      setIsLoading(true);
      try {
        let fullName = '';
        const party = allParties.find(p => p.id === formData.partyId);
        if (party) {
            if (party.party_type === 'legal' && party.company_name) {
                fullName = party.company_name;
            } else {
                fullName = `${party.first_name || ''} ${party.last_name || ''}`.trim();
            }
        }

        const payload = {
          username: formData.username,
          party_id: formData.partyId || null,
          full_name: fullName,
          user_type: formData.userType,
          is_active: formData.isActive,
          email: formData.email,
          mobile: formData.mobile,
          updated_at: new Date().toISOString()
        };

        if (formData.password) {
          payload.password_hash = await hashPassword(formData.password);
        }

        const { error } = currentRecord?.id 
          ? await supabase.from('sec_users').update(payload).eq('id', currentRecord.id)
          : await supabase.from('sec_users').insert([payload]);

        if (error) {
          if (error.message?.includes('unique') || error.code === '23505') {
            alert(t('این نام کاربری قبلاً ثبت شده است.', 'This username is already taken.'));
          } else {
            throw error;
          }
          return;
        }
        
        setIsModalOpen(false);
        fetchData();
      } catch (err) {
        console.error('Save Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSaveQuickParty = async () => {
      if (!quickPartyData.firstName || !quickPartyData.lastName || !quickPartyData.code) {
         alert(t('لطفاً فیلدهای ستاره‌دار را تکمیل کنید.', 'Please fill required fields.'));
         return;
      }
      
      setIsSavingParty(true);
      try {
        const payload = {
          party_type: 'real',
          code: quickPartyData.code,
          first_name: quickPartyData.firstName,
          last_name: quickPartyData.lastName,
          national_id: quickPartyData.nationalId,
          mobile: quickPartyData.mobile,
          email: quickPartyData.email,
          roles: quickPartyData.roles,
          is_active: true,
          created_at: new Date().toISOString()
        };

        const { data: newPartyData, error } = await supabase.from('parties').insert([payload]).select().single();
        
        if (error) {
           if (error.code === '23505') {
             alert(t('کد شخص یا کد ملی تکراری است.', 'Duplicate party code or national ID.'));
           } else {
             throw error;
           }
           return;
        }

        setAllParties(prev => [...prev, newPartyData]);

        setFormData(prev => ({
          ...prev,
          partyId: newPartyData.id,
          mobile: newPartyData.mobile || prev.mobile,
          email: newPartyData.email || prev.email
        }));

        setIsQuickPartyModalOpen(false);
        setQuickPartyData({ code: '', firstName: '', lastName: '', nationalId: '', mobile: '', email: '', roles: ['system_user'] });
      } catch (err) {
        console.error('Save Quick Party Error:', err);
        alert(t('خطا در ذخیره اطلاعات شخص.', 'Error saving party.'));
      } finally {
        setIsSavingParty(false);
      }
    };

    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase
          .from('sec_users')
          .update({ is_active: newValue })
          .eq('id', row.id);
        
        if (error) throw error;
        setData(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (err) {
        console.error("Toggle Error:", err);
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const { error } = await supabase.from('sec_users').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
        } else if (deleteConfirm.type === 'bulk') {
          const { error } = await supabase.from('sec_users').delete().in('id', deleteConfirm.data);
          if (error) throw error;
        }
        
        setSelectedIds([]);
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        fetchData();
      } catch (err) {
        console.error("Delete error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const executeResetPassword = async () => {
      setIsLoading(true);
      try {
        const newHash = await hashPassword('123456');
        const { error } = await supabase.from('sec_users').update({ password_hash: newHash }).eq('id', resetConfirm.data.id);
        if (error) throw error;
        setResetConfirm({ isOpen: false, data: null });
      } catch (err) {
        console.error('Reset password error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleOpenModal = (record = null) => {
      setFormData(record ? {
        username: record.username || '',
        password: '',
        partyId: record.party_id || '',
        userType: record.user_type || 'کاربر سیستم',
        isActive: record.is_active ?? true,
        email: record.email || '',
        mobile: record.mobile || ''
      } : { 
        username: '',
        password: '123456',
        partyId: '',
        userType: 'کاربر سیستم',
        isActive: true,
        email: '',
        mobile: ''
      });
      setCurrentRecord(record);
      setIsModalOpen(true);
    };

    const handlePartyLOVChange = (row) => {
      if (!row) {
        setFormData(prev => ({ ...prev, partyId: '', mobile: '', email: '' }));
        return;
      }
      setFormData(prev => ({
        ...prev,
        partyId: row.id,
        mobile: row.mobile || '',
        email: row.email || ''
      }));
    };

    const formatDateTime = (dateString) => {
      if (!dateString) return '-';
      try {
        return new Date(dateString).toLocaleString(isRtl ? 'fa-IR' : 'en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
          calendar: calendarMode === 'jalali' ? 'persian' : 'gregory'
        });
      } catch (e) {
        return dateString;
      }
    };

    const getPartyName = (partyId) => {
      if (!partyId) return '-';
      const p = allParties.find(x => x.id === partyId);
      if (!p) return '-';
      return p.party_type === 'legal' ? p.company_name : `${p.first_name || ''} ${p.last_name || ''}`.trim();
    };

    const hasAccess = useCallback((userId) => {
       return userRoles.some(ur => ur.user_id === userId) || permissions.some(p => p.user_id === userId);
    }, [userRoles, permissions]);

    const columns = [
      { 
        field: 'username', 
        header_fa: 'نام کاربری', 
        header_en: 'Username', 
        width: '150px',
        render: (val) => <span className="font-bold text-slate-700 dark:text-slate-300" dir="ltr">{val}</span>
      },
      { 
        field: 'party_id', 
        header_fa: 'شخص / پرسنل متصل', 
        header_en: 'Linked Party', 
        width: '250px',
        render: (val) => <span className="font-bold text-slate-700 dark:text-slate-200">{getPartyName(val)}</span>
      },
      { 
        field: 'user_type', 
        header_fa: 'نوع', 
        header_en: 'Type', 
        width: '120px',
        render: (val) => (
          <Badge variant={val === 'مدیر سیستم' || val === 'System Admin' ? 'indigo' : 'slate'} size="sm">
            {val}
          </Badge>
        )
      },
      { 
        field: 'mobile', 
        header_fa: 'موبایل', 
        header_en: 'Mobile', 
        width: '130px', 
        render: (val) => <span className="inline-block w-full text-left" dir="ltr">{val || '-'}</span> 
      },
      { 
        field: 'email', 
        header_fa: 'ایمیل', 
        header_en: 'Email', 
        width: '200px', 
        render: (val) => <span className="inline-block w-full text-left" dir="ltr">{val || '-'}</span> 
      },
      { 
        field: 'last_login', 
        header_fa: 'آخرین ورود', 
        header_en: 'Last Login', 
        width: '140px',
        render: (val) => <span className="text-[11px] text-slate-500 inline-block w-full text-left" dir="ltr">{formatDateTime(val)}</span>
      },
      { 
        field: 'is_active', 
        header_fa: 'وضعیت', 
        header_en: 'Status', 
        width: '90px', 
        type: 'toggle',
        onToggle: (row, val) => handleToggleActive(row, val)
      }
    ];

    const filteredData = useMemo(() => {
      let result = [...data];
      
      if (filters.party && filters.party.id) {
         result = result.filter(u => u.party_id === filters.party.id);
      }
      
      if (filters.accessType) {
         if (filters.accessType === 'direct') {
             result = result.filter(u => permissions.some(p => p.user_id === u.id));
         } else if (filters.accessType === 'role') {
             result = result.filter(u => userRoles.some(ur => ur.user_id === u.id));
         }
      }

      if (filters.role && filters.role.id) {
         result = result.filter(u => userRoles.some(ur => ur.user_id === u.id && ur.role_id === filters.role.id));
      }

      if (filters.form && filters.form.id) {
         const formId = filters.form.id;
         result = result.filter(u => {
             const hasDirect = permissions.some(p => p.user_id === u.id && p.menu_id === formId);
             if (hasDirect) return true;
             
             const userRoleIds = userRoles.filter(ur => ur.user_id === u.id).map(ur => ur.role_id);
             const hasRoleAccess = permissions.some(p => userRoleIds.includes(p.role_id) && p.menu_id === formId);
             
             return hasRoleAccess;
         });
      }

      if (filters.isActive) {
         const wantActive = filters.isActive === 'active';
         result = result.filter(u => u.is_active === wantActive);
      }
      
      return result;
    }, [data, filters, permissions, userRoles]);

    const filterFields = [
      { 
        name: 'party', 
        label: t('شخص متصل', 'Linked Party'), 
        type: 'lov', 
        lovData: partiesDropdown.map(p => ({ ...p, label: `${p.title} (${p.code})` })), 
        lovColumns: [
          { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
          { field: 'title', header_fa: 'عنوان', header_en: 'Title', width: '200px' },
          { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '130px' }
        ],
        dropdownWidth: 'min-w-[450px]'
      },
      { 
        name: 'accessType', 
        label: t('نوع دسترسی', 'Access Type'), 
        type: 'select', 
        options: [
          { value: 'direct', label: t('مستقیم', 'Direct') },
          { value: 'role', label: t('نقش', 'Role-based') }
        ] 
      },
      { 
        name: 'role', 
        label: t('نقش دسترسی', 'Access Role'), 
        type: 'lov', 
        lovData: roles.map(r => ({ ...r, label: r.title || r.name })), 
        lovColumns: [
          { field: 'title', header_fa: 'عنوان نقش', header_en: 'Role Title', width: '150px' },
          { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '80px', render: (val) => val === false ? t('غیرفعال', 'Inactive') : t('فعال', 'Active') },
          { field: 'valid_from', header_fa: 'از تاریخ', header_en: 'Valid From', width: '100px', render: (val) => val ? new Date(val).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : '-' },
          { field: 'valid_to', header_fa: 'تا تاریخ', header_en: 'Valid To', width: '100px', render: (val) => val ? new Date(val).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : '-' }
        ],
        dropdownWidth: 'min-w-[500px] max-w-[700px]'
      },
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
        name: 'isActive', 
        label: t('وضعیت', 'Status'), 
        type: 'select', 
        options: [
          { value: 'active', label: t('فعال', 'Active') },
          { value: 'inactive', label: t('غیرفعال', 'Inactive') }
        ] 
      }
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('مدیریت کاربران', 'User Management')} 
          icon={Users}
          description={t('تعریف و مدیریت دسترسی ورود کاربران به سیستم', 'Manage user accounts and system access')}
          language={language}
          breadcrumbs={[{ label: t('امنیت', 'Security') }, { label: t('کاربران', 'Users') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-2 animate-in fade-in duration-300">
          <AdvancedFilter 
            fields={filterFields}
            initialValues={filters}
            onFilter={setFilters}
            onClear={() => setFilters({})}
            language={language}
          />

          <div className="flex-1 min-h-0 mt-1">
            <DataGrid 
              data={filteredData}
              columns={columns} 
              language={language}
              selectable={true}
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              isLoading={isLoading}
              onAdd={() => handleOpenModal()}
              onRowDoubleClick={(row) => handleOpenModal(row)}
              gridState={gridState}
              onGridStateChange={setGridState}
              hideImport={true}
              onToggle={(row, field, val) => {
                 if (field === 'is_active') handleToggleActive(row, val);
              }}
              actions={[
                { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => handleOpenModal(row), className: 'text-slate-400 hover:text-indigo-600' },
                { icon: Shield, tooltip: t('دسترسی‌ها', 'Permissions'), onClick: (row) => setAccessModal({ isOpen: true, user: row }), className: (row) => hasAccess(row.id) ? '!text-indigo-600 dark:!text-indigo-400 hover:!text-indigo-800' : 'text-slate-400 hover:text-indigo-600' },
                { icon: RefreshCw, tooltip: t('بازنشانی رمز عبور', 'Reset Password'), onClick: (row) => setResetConfirm({ isOpen: true, data: row }), className: 'text-slate-400 hover:text-amber-600' },
                { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 hover:text-red-600' }
              ]}
              bulkActions={[
                { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
              ]}
            />
          </div>
        </div>

        <Modal 
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
          title={currentRecord ? t('ویرایش مشخصات کاربر', 'Edit User') : t('تعریف کاربر جدید', 'New User')}
          width="max-w-2xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField 
                size="sm" 
                label={t('نام کاربری', 'Username')} 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})} 
                isRtl={isRtl} 
                required 
                dir="ltr" 
              />
              <SelectField 
                size="sm" 
                label={t('نوع کاربری', 'User Type')} 
                value={formData.userType} 
                onChange={e => setFormData({...formData, userType: e.target.value})} 
                isRtl={isRtl}
                options={[
                  { value: 'مدیر سیستم', label: t('مدیر سیستم', 'System Admin') },
                  { value: 'کاربر سیستم', label: t('کاربر سیستم', 'System User') }
                ]}
              />

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <LOVField
                    size="sm"
                    label={t('اتصال به شخص / پرسنل', 'Link to Party')}
                    displayValue={formData.partyId ? (() => { const p = partiesDropdown.find(x => x.id === formData.partyId); return p ? `${p.title} (${p.code})` : ''; })() : ''}
                    onChange={handlePartyLOVChange}
                    data={partiesDropdown}
                    columns={[
                      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '25%' },
                      { field: 'title', header_fa: 'عنوان', header_en: 'Title', width: '25%' },
                      { field: 'email', header_fa: 'ایمیل', header_en: 'Email', width: '25%' },
                      { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '25%' }
                    ]}
                    required
                    isRtl={isRtl}
                    dropdownWidth="min-w-[520px] max-w-[700px]"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={Plus} 
                  onClick={() => setIsQuickPartyModalOpen(true)} 
                  className="h-8 w-8 px-0 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40 mb-[1px]" 
                  title={t('تعریف شخص جدید', 'Add New Party')}
                />
              </div>

              <TextField 
                size="sm" 
                label={currentRecord ? t('رمز عبور جدید (اختیاری)', 'New Password (Optional)') : t('رمز عبور', 'Password')} 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                isRtl={isRtl} 
                required={!currentRecord}
                dir="ltr" 
                placeholder="********"
              />

              <TextField 
                size="sm" 
                label={t('موبایل', 'Mobile')} 
                value={formData.mobile} 
                onChange={e => setFormData({...formData, mobile: e.target.value})} 
                isRtl={isRtl} 
                dir="ltr" 
              />
              <TextField 
                size="sm" 
                label={t('ایمیل', 'Email')} 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                isRtl={isRtl} 
                dir="ltr" 
              />

              <div className="md:col-span-2 flex items-center mt-2">
                 <ToggleField size="sm" label={t('کاربر فعال است', 'Is Active')} checked={formData.isActive} onChange={v => setFormData({...formData, isActive: v})} isRtl={isRtl} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isLoading}>{t('ذخیره اطلاعات', 'Save Changes')}</Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isQuickPartyModalOpen}
          onClose={() => setIsQuickPartyModalOpen(false)}
          title={t('تعریف سریع شخص حقیقی', 'Quick Add Real Person')}
          width="max-w-3xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField size="sm" label={t('کد شخص', 'Party Code')} value={quickPartyData.code} onChange={e => setQuickPartyData({...quickPartyData, code: e.target.value})} isRtl={isRtl} required dir="ltr" />
              <TextField size="sm" label={t('نام', 'First Name')} value={quickPartyData.firstName} onChange={e => setQuickPartyData({...quickPartyData, firstName: e.target.value})} isRtl={isRtl} required />
              <TextField size="sm" label={t('نام خانوادگی', 'Last Name')} value={quickPartyData.lastName} onChange={e => setQuickPartyData({...quickPartyData, lastName: e.target.value})} isRtl={isRtl} required />
              <TextField size="sm" label={t('کد ملی', 'National ID')} value={quickPartyData.nationalId} onChange={e => setQuickPartyData({...quickPartyData, nationalId: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('موبایل', 'Mobile')} value={quickPartyData.mobile} onChange={e => setQuickPartyData({...quickPartyData, mobile: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('ایمیل', 'Email')} value={quickPartyData.email} onChange={e => setQuickPartyData({...quickPartyData, email: e.target.value})} isRtl={isRtl} dir="ltr" />
            </div>
            
            <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
               <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-3 block">{t('نقش‌های شخص', 'Party Roles')}</label>
               <div className="flex flex-wrap gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                 {PARTY_ROLES.map(role => (
                   <CheckboxField 
                     key={role.id} 
                     size="sm" 
                     label={role.label} 
                     checked={quickPartyData.roles.includes(role.id)} 
                     disabled={role.id === 'system_user'}
                     onChange={(checked) => {
                       if (role.id === 'system_user') return;
                       setQuickPartyData(prev => ({
                         ...prev,
                         roles: checked ? [...prev.roles, role.id] : prev.roles.filter(r => r !== role.id)
                       }));
                     }} 
                     isRtl={isRtl} 
                   />
                 ))}
               </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsQuickPartyModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickParty} isLoading={isSavingParty}>{t('ذخیره و انتخاب', 'Save & Select')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk' 
              ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
              : t(`آیا از حذف کاربر "${deleteConfirm.data?.username}" اطمینان دارید؟`, `Delete this user?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>

        <Modal isOpen={resetConfirm.isOpen} onClose={() => setResetConfirm({ isOpen: false, data: null })} title={t('بازنشانی رمز عبور', 'Reset Password')} language={language} width="max-w-sm">
          <EmptyState
            icon={RefreshCw}
            title={t('بازنشانی رمز عبور', 'Reset Password')}
            description={t(`آیا از بازنشانی رمز عبور کاربر "${resetConfirm.data?.username}" به 123456 اطمینان دارید؟`, `Are you sure you want to reset password to 123456?`)}
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setResetConfirm({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="primary" size="sm" onClick={executeResetPassword} isLoading={isLoading} className="flex-1">{t('تایید بازنشانی', 'Confirm Reset')}</Button>
              </div>
            }
          />
        </Modal>
        
        {window.UserAccess && (
          <window.UserAccess 
             isOpen={accessModal.isOpen} 
             onClose={() => setAccessModal({ isOpen: false, user: null })} 
             user={accessModal.user} 
             language={language} 
          />
        )}
      </div>
    );
  };

  window.UserManagement = UserManagement;
})();