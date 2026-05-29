/* Filename: financial/BalanceGroup.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Scale = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, List = FallbackIcon, Shield = FallbackIcon,
    Save = FallbackIcon, Plus = FallbackIcon, AlertTriangle = FallbackIcon, Lock = FallbackIcon
  } = LucideIcons;

  const Core = window.DSCore || window.DesignSystem || {};
  const {
    PageHeader = () => null, Modal = () => null, Button = () => null, TextField = () => null,
    SelectField = () => null, ToggleField = () => null, DatePicker = () => null, Badge = () => null
  } = Core;

  const Grid = window.DSGrid || window.DesignSystem || {};
  const {
    DataGrid = () => null, AdvancedFilter = () => null, LOVField = () => null
  } = Grid;

  const supabase = window.supabase;

  const BalanceGroup = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const [loading, setLoading] = useState(false);
    
    // Master Data
    const [groups, setGroups] = useState([]);
    const [coaAccounts, setCoaAccounts] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);

    // Grid & Filter State
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);

    // Modal States
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, target: null, data: null });

    // Current Edit States
    const [currentGroup, setCurrentGroup] = useState({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
    const [selectedGroup, setSelectedGroup] = useState(null);
    
    const [groupAccounts, setGroupAccounts] = useState([]);
    const [currentAccountMap, setCurrentAccountMap] = useState({ id: null, account_id: '', account_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });

    const [groupAccesses, setGroupAccesses] = useState([]);
    const [currentAccessMap, setCurrentAccessMap] = useState({ id: null, grantee_type: 'USER', grantee_id: '', grantee_obj: null });

    const viewConfig = {
      pageId: 'balance_group_main',
      currentState: () => ({ gridState, filters }),
      onApplyState: (state) => {
        if (state) {
          if (state.gridState) setGridState(state.gridState);
          if (state.filters) setFilters(state.filters);
        } else {
          setGridState(null);
          setFilters({});
        }
      }
    };

    useEffect(() => {
      fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [groupsRes, accountsRes, usersRes, rolesRes] = await Promise.all([
          supabase.from('fm_balance_groups')
            .select('*, accounts:fm_balance_group_accounts(account_id), access:fm_balance_group_access(grantee_type, grantee_id)')
            .order('created_at', { ascending: false }),
          supabase.from('fm_coa_accounts').select('id, code, title_fa').eq('is_active', true).order('code'),
          supabase.from('sec_users').select('id, full_name, username').eq('is_active', true),
          supabase.from('sec_roles').select('id, title, code').eq('is_active', true)
        ]);

        if (groupsRes.error) throw groupsRes.error;
        setGroups(groupsRes.data || []);
        setCoaAccounts(accountsRes.data || []);
        setUsers(usersRes.data || []);
        setRoles(rolesRes.data || []);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    const filteredGroups = useMemo(() => {
      let result = [...groups];
      if (filters.account_id && filters.account_id.id) {
        result = result.filter(g => g.accounts?.some(a => a.account_id === filters.account_id.id));
      }
      if (filters.user_id && filters.user_id.id) {
        result = result.filter(g => g.access?.some(a => a.grantee_type === 'USER' && a.grantee_id === filters.user_id.id));
      }
      if (filters.role_id && filters.role_id.id) {
        result = result.filter(g => g.access?.some(a => a.grantee_type === 'ROLE' && a.grantee_id === filters.role_id.id));
      }
      return result;
    }, [groups, filters]);

    // --- Group CRUD ---
    const handleSaveGroup = async () => {
      if (!currentGroup.code || !currentGroup.title_fa) return;
      setLoading(true);
      try {
        const payload = {
          code: currentGroup.code,
          title_fa: currentGroup.title_fa,
          title_en: currentGroup.title_en,
          description: currentGroup.description,
          is_active: currentGroup.is_active
        };

        if (currentGroup.id) {
          const { error } = await supabase.from('fm_balance_groups').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', currentGroup.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_balance_groups').insert([payload]);
          if (error) throw error;
        }
        setIsGroupModalOpen(false);
        fetchInitialData();
      } catch (error) {
        console.error('Error saving group:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleToggleGroupActive = async (row, newValue) => {
      try {
        const { error } = await supabase.from('fm_balance_groups').update({ is_active: newValue, updated_at: new Date().toISOString() }).eq('id', row.id);
        if (error) throw error;
        setGroups(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (err) {
        console.error("Toggle Error:", err);
      }
    };

    // --- Account Mapping CRUD ---
    const openAccountsModal = async (group) => {
      setSelectedGroup(group);
      setCurrentAccountMap({ id: null, account_id: '', account_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });
      await fetchGroupAccounts(group.id);
      setIsAccountModalOpen(true);
    };

    const fetchGroupAccounts = async (groupId) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('fm_balance_group_accounts')
          .select(`id, group_id, account_id, valid_from, valid_to, is_active, fm_coa_accounts ( code, title_fa )`)
          .eq('group_id', groupId)
          .order('valid_from', { ascending: false });
        if (error) throw error;
        setGroupAccounts(data || []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleSaveAccountMap = async () => {
      if (!currentAccountMap.account_id || !currentAccountMap.valid_from) return;
      setLoading(true);
      try {
        const payload = {
          group_id: selectedGroup.id,
          account_id: currentAccountMap.account_id,
          valid_from: currentAccountMap.valid_from,
          valid_to: currentAccountMap.valid_to || null,
          is_active: currentAccountMap.is_active
        };

        if (currentAccountMap.id) {
          const { error } = await supabase.from('fm_balance_group_accounts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', currentAccountMap.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_balance_group_accounts').insert([payload]);
          if (error) throw error;
        }
        setCurrentAccountMap({ id: null, account_id: '', account_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });
        fetchGroupAccounts(selectedGroup.id);
      } catch (error) {
        console.error('Error saving account map:', error);
      } finally {
        setLoading(false);
      }
    };

    // --- Access Mapping CRUD ---
    const openAccessModal = async (group) => {
      setSelectedGroup(group);
      setCurrentAccessMap({ id: null, grantee_type: 'USER', grantee_id: '', grantee_obj: null });
      await fetchGroupAccess(group.id);
      setIsAccessModalOpen(true);
    };

    const fetchGroupAccess = async (groupId) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('fm_balance_group_access').select('*').eq('group_id', groupId);
        if (error) throw error;
        setGroupAccesses(data || []);
      } catch (error) {
        console.error('Error fetching access:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleSaveAccessMap = async () => {
      if (!currentAccessMap.grantee_id) return;
      setLoading(true);
      try {
        const payload = {
          group_id: selectedGroup.id,
          grantee_type: currentAccessMap.grantee_type,
          grantee_id: currentAccessMap.grantee_id
        };
        const { error } = await supabase.from('fm_balance_group_access').insert([payload]);
        if (error) throw error;
        
        setCurrentAccessMap({ id: null, grantee_type: 'USER', grantee_id: '', grantee_obj: null });
        fetchGroupAccess(selectedGroup.id);
      } catch (error) {
        console.error('Error saving access map:', error);
      } finally {
        setLoading(false);
      }
    };

    // --- Delete Execution ---
    const executeDelete = async () => {
      setLoading(true);
      try {
        const { type, target, data } = deleteConfirm;
        let table = '';
        if (target === 'group') table = 'fm_balance_groups';
        if (target === 'account') table = 'fm_balance_group_accounts';
        if (target === 'access') table = 'fm_balance_group_access';

        if (type === 'single') {
          const { error } = await supabase.from(table).delete().eq('id', data.id);
          if (error) throw error;
        } else if (type === 'bulk' && target === 'group') {
          const { error } = await supabase.from(table).delete().in('id', data);
          if (error) throw error;
        }

        setDeleteConfirm({ isOpen: false, type: null, target: null, data: null });
        
        if (target === 'group') fetchInitialData();
        if (target === 'account') fetchGroupAccounts(selectedGroup.id);
        if (target === 'access') fetchGroupAccess(selectedGroup.id);
      } catch (err) {
        console.error("Delete error:", err);
      } finally {
        setLoading(false);
      }
    };

    // --- Column Definitions ---
    const groupColumns = [
      { field: 'code', header_fa: 'کد گروه', header_en: 'Group Code', width: '120px', render: (val) => <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span> },
      { field: 'title_fa', header_fa: 'عنوان (فارسی)', header_en: 'Title (FA)', width: 'auto' },
      { field: 'title_en', header_fa: 'عنوان (انگلیسی)', header_en: 'Title (EN)', width: 'auto' },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '100px', type: 'toggle', onToggle: (row, val) => handleToggleGroupActive(row, val) }
    ];

    const groupActions = [
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => { setCurrentGroup(row); setIsGroupModalOpen(true); }, className: 'text-slate-400 hover:text-indigo-600' },
      { icon: List, tooltip: t('حساب‌های مرتبط', 'Related Accounts'), onClick: (row) => openAccountsModal(row), className: 'text-slate-400 hover:text-indigo-600' },
      { icon: Shield, tooltip: t('مدیریت دسترسی‌ها', 'Access Management'), onClick: (row) => openAccessModal(row), className: 'text-slate-400 hover:text-indigo-600' },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'group', data: row }), className: 'text-slate-400 hover:text-red-600' }
    ];

    const groupBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', target: 'group', data: ids }) }
    ];

    const filterFields = [
      { name: 'account_id', label: t('حساب مرتبط', 'Related Account'), type: 'lov', lovData: coaAccounts, lovColumns: [{field: 'code', header_fa: 'کد حساب'}, {field: 'title_fa', header_fa: 'عنوان حساب'}] },
      { name: 'user_id', label: t('دسترسی کاربر', 'User Access'), type: 'lov', lovData: users, lovColumns: [{field: 'username', header_fa: 'نام کاربری'}, {field: 'full_name', header_fa: 'نام'}] },
      { name: 'role_id', label: t('دسترسی نقش', 'Role Access'), type: 'lov', lovData: roles, lovColumns: [{field: 'code', header_fa: 'کد نقش'}, {field: 'title', header_fa: 'عنوان نقش'}] }
    ];

    const accountColumns = [
      { field: 'code', header_fa: 'کد حساب', header_en: 'Account Code', width: '150px', render: (_, row) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.fm_coa_accounts?.code}</span> },
      { field: 'title', header_fa: 'عنوان حساب', header_en: 'Account Title', width: 'auto', render: (_, row) => row.fm_coa_accounts?.title_fa },
      { field: 'valid_from', header_fa: 'از تاریخ', header_en: 'Valid From', width: '120px', type: 'date' },
      { field: 'valid_to', header_fa: 'تا تاریخ', header_en: 'Valid To', width: '120px', type: 'date', render: (val) => val || <span className="text-slate-400 text-[10px]">{t('تا کنون', 'Present')}</span> },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '90px', type: 'toggle' }
    ];

    const accountActions = [
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => {
        const acc = coaAccounts.find(a => a.id === row.account_id);
        setCurrentAccountMap({ id: row.id, account_id: row.account_id, account_obj: acc, valid_from: row.valid_from, valid_to: row.valid_to || '', is_active: row.is_active });
      }, className: 'text-slate-400 hover:text-indigo-600' },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'account', data: row }), className: 'text-slate-400 hover:text-red-600' }
    ];

    const accessColumns = [
      { field: 'grantee_type', header_fa: 'نوع دسترسی', header_en: 'Type', width: '120px', render: (val) => (
        <Badge variant={val === 'USER' ? 'indigo' : 'emerald'} size="sm" className="text-[10px]">
          {val === 'USER' ? t('کاربر', 'User') : t('نقش', 'Role')}
        </Badge>
      )},
      { field: 'grantee_id', header_fa: 'شخص / نقش', header_en: 'Grantee', width: 'auto', render: (val, row) => {
        if (row.grantee_type === 'USER') {
          const u = users.find(x => x.id === val);
          return u ? `${u.full_name} (${u.username})` : t('نامشخص', 'Unknown');
        } else {
          const r = roles.find(x => x.id === val);
          return r ? `${r.title} (${r.code})` : t('نامشخص', 'Unknown');
        }
      }}
    ];

    const accessActions = [
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'access', data: row }), className: 'text-slate-400 hover:text-red-600' }
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('مدیریت گروه‌های بالانس', 'Balance Groups Management')} 
          icon={Scale}
          description={t('تعریف و مدیریت گروه‌های بالانس و دسترسی‌ها', 'Manage balance groups and their associated access permissions')}
          language={language}
          breadcrumbs={[{ label: t('ماژول مالی', 'Financial Module') }, { label: t('گروه‌های بالانس', 'Balance Groups') }]}
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
              data={filteredGroups}
              columns={groupColumns} 
              actions={groupActions}
              bulkActions={groupBulkActions}
              language={language}
              selectable={true}
              isLoading={loading}
              gridState={gridState}
              onGridStateChange={setGridState}
              onAdd={() => {
                setCurrentGroup({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
                setIsGroupModalOpen(true);
              }}
            />
          </div>
        </div>

        {/* Modal: Group Definition */}
        <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={currentGroup.id ? t('ویرایش گروه بالانس', 'Edit Balance Group') : t('ایجاد گروه بالانس', 'New Balance Group')} width="max-w-2xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField size="sm" label={t('کد گروه', 'Group Code')} value={currentGroup.code} onChange={(e) => setCurrentGroup({...currentGroup, code: e.target.value})} isRtl={isRtl} required wrapperClassName="md:col-span-1" dir="ltr" />
              <div className="md:col-span-1 flex items-center pt-5">
                 <ToggleField size="sm" label={t('وضعیت فعال', 'Active Status')} checked={currentGroup.is_active} onChange={v => setCurrentGroup({...currentGroup, is_active: v})} isRtl={isRtl} />
              </div>
              <TextField size="sm" label={t('عنوان (فارسی)', 'Title (FA)')} value={currentGroup.title_fa} onChange={(e) => setCurrentGroup({...currentGroup, title_fa: e.target.value})} isRtl={isRtl} required wrapperClassName="md:col-span-1" />
              <TextField size="sm" label={t('عنوان (انگلیسی)', 'Title (EN)')} value={currentGroup.title_en} onChange={(e) => setCurrentGroup({...currentGroup, title_en: e.target.value})} isRtl={isRtl} dir="ltr" wrapperClassName="md:col-span-1" />
              <TextField size="sm" label={t('توضیحات', 'Description')} value={currentGroup.description} onChange={(e) => setCurrentGroup({...currentGroup, description: e.target.value})} isRtl={isRtl} wrapperClassName="md:col-span-2" />
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsGroupModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveGroup} isLoading={loading}>{t('ذخیره اطلاعات', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        {/* Modal: Accounts Mapping */}
        <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title={`${t('مدیریت حساب‌های گروه', 'Manage Accounts')} - ${selectedGroup?.title_fa || ''}`} width="max-w-5xl" language={language}>
          <div className="p-4 flex flex-col gap-4 h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <div className="md:col-span-4">
                 <LOVField 
                   size="sm" label={t('انتخاب حساب', 'Select Account')} required
                   data={coaAccounts} columns={[{field:'code', header_fa:'کد حساب'},{field:'title_fa', header_fa:'عنوان حساب'}]} 
                   displayValue={currentAccountMap.account_obj?.title_fa ? `${currentAccountMap.account_obj.code} - ${currentAccountMap.account_obj.title_fa}` : ''}
                   onChange={(row) => setCurrentAccountMap({...currentAccountMap, account_id: row?.id || '', account_obj: row})}
                 />
              </div>
              <div className="md:col-span-3">
                 <DatePicker size="sm" label={t('از تاریخ', 'Valid From')} value={currentAccountMap.valid_from} onChange={(v) => setCurrentAccountMap({...currentAccountMap, valid_from: v})} required isRtl={isRtl} />
              </div>
              <div className="md:col-span-3">
                 <DatePicker size="sm" label={t('تا تاریخ', 'Valid To')} value={currentAccountMap.valid_to} onChange={(v) => setCurrentAccountMap({...currentAccountMap, valid_to: v})} isRtl={isRtl} />
              </div>
              <div className="md:col-span-2 flex items-end justify-between pb-0.5">
                 <ToggleField size="sm" label={t('فعال', 'Active')} checked={currentAccountMap.is_active} onChange={v => setCurrentAccountMap({...currentAccountMap, is_active: v})} isRtl={isRtl} wrapperClassName="mb-1" />
                 <Button variant="primary" size="sm" icon={currentAccountMap.id ? Save : Plus} onClick={handleSaveAccountMap} disabled={!currentAccountMap.account_id || !currentAccountMap.valid_from || loading}>
                   {currentAccountMap.id ? t('ویرایش', 'Edit') : t('افزودن', 'Add')}
                 </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
               <DataGrid data={groupAccounts} columns={accountColumns} actions={accountActions} language={language} isLoading={loading} />
            </div>
          </div>
        </Modal>

        {/* Modal: Access Mapping */}
        <Modal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} title={`${t('مدیریت دسترسی‌ها', 'Manage Access')} - ${selectedGroup?.title_fa || ''}`} width="max-w-4xl" language={language}>
          <div className="p-4 flex flex-col gap-4 h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <div className="md:col-span-3">
                 <SelectField size="sm" label={t('نوع دسترسی', 'Access Type')} required
                   options={[{value:'USER', label:t('کاربر سیستم', 'User')}, {value:'ROLE', label:t('نقش سیستمی', 'Role')}]}
                   value={currentAccessMap.grantee_type} onChange={(e) => setCurrentAccessMap({...currentAccessMap, grantee_type: e.target.value, grantee_id: '', grantee_obj: null})} isRtl={isRtl}
                 />
              </div>
              <div className="md:col-span-7">
                 <LOVField 
                   size="sm" label={t('انتخاب شخص / نقش', 'Select Grantee')} required
                   data={currentAccessMap.grantee_type === 'USER' ? users : roles} 
                   columns={currentAccessMap.grantee_type === 'USER' ? [{field:'username',header_fa:'نام کاربری'},{field:'full_name',header_fa:'نام'}] : [{field:'code',header_fa:'کد'},{field:'title',header_fa:'عنوان'}]}
                   displayValue={currentAccessMap.grantee_obj ? (currentAccessMap.grantee_type === 'USER' ? `${currentAccessMap.grantee_obj.full_name} (${currentAccessMap.grantee_obj.username})` : `${currentAccessMap.grantee_obj.title} (${currentAccessMap.grantee_obj.code})`) : ''}
                   onChange={(row) => setCurrentAccessMap({...currentAccessMap, grantee_id: row?.id || '', grantee_obj: row})}
                 />
              </div>
              <div className="md:col-span-2 flex items-end pb-0.5">
                 <Button variant="primary" size="sm" icon={Plus} onClick={handleSaveAccessMap} disabled={!currentAccessMap.grantee_id || loading} className="w-full">
                   {t('تخصیص', 'Assign')}
                 </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
               <DataGrid data={groupAccesses} columns={accessColumns} actions={accessActions} language={language} isLoading={loading} />
            </div>
          </div>
        </Modal>

        {/* Modal: Delete Confirmation */}
        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, target: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-3 items-center text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1">
               <AlertTriangle size={22} />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1">
               <Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {deleteConfirm.type === 'bulk' 
                ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
                : t(`آیا از حذف این مورد اطمینان دارید؟`, `Are you sure you want to delete this item?`)
              }
            </p>
            <div className="flex gap-2 mt-4 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, target: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={executeDelete} isLoading={loading} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 border-red-600 dark:border-red-500">{t('تایید حذف', 'Delete')}</Button>
            </div>
          </div>
        </Modal>

      </div>
    );
  };

  window.BalanceGroup = BalanceGroup;
})();