/* Filename: financial/BalanceGroup.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Scale = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, List = FallbackIcon, Shield = FallbackIcon,
    Save = FallbackIcon, Plus = FallbackIcon, AlertTriangle = FallbackIcon, Lock = FallbackIcon,
    X = FallbackIcon, Users = FallbackIcon, Check = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Button = DS.Button || window.DSCore?.Button || (() => null);
  const PageHeader = DS.PageHeader || window.DSCore?.PageHeader || (() => null);
  const Modal = DS.Modal || window.DSFeedback?.Modal || (() => null);
  const DataGrid = DS.DataGrid || window.DSGrid?.DataGrid || (() => null);
  const AdvancedFilter = DS.AdvancedFilter || window.DSGrid?.AdvancedFilter || (() => null);
  const LOVField = DS.LOVField || window.DSGrid?.LOVField || (() => null);
  const TextField = DS.TextField || window.DSForms?.TextField || (() => null);
  const ToggleField = DS.ToggleField || window.DSForms?.ToggleField || (() => null);
  const SelectField = DS.SelectField || window.DSForms?.SelectField || (() => null);
  const DatePicker = DS.DatePicker || window.DSForms?.DatePicker || (() => null);
  const Badge = DS.Badge || window.DSCore?.Badge || (() => null);

  const supabase = window.supabase;

  const BalanceGroup = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const [loading, setLoading] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    
    // Master Data
    const [groups, setGroups] = useState([]);
    const [coaAccounts, setCoaAccounts] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [userRoles, setUserRoles] = useState([]);

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
    
    // Inline Edit States
    const [groupAccounts, setGroupAccounts] = useState([]);
    const [editingAccount, setEditingAccount] = useState(null);
    const [editAccountForm, setEditAccountForm] = useState({});

    const [groupAccesses, setGroupAccesses] = useState([]);
    const [editingAccess, setEditingAccess] = useState(null);
    const [editAccessForm, setEditAccessForm] = useState({});
    const [accessViewMode, setAccessViewMode] = useState('assign'); // 'assign' or 'aggregate'

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
        const [groupsRes, accountsRes, usersRes, rolesRes, userRolesRes] = await Promise.all([
          supabase.from('fm_balance_groups')
            .select('*, accounts:fm_balance_group_accounts(id), access:fm_balance_group_access(grantee_type, grantee_id)')
            .order('created_at', { ascending: false }),
          supabase.from('fm_coa_accounts').select('id, code, title_fa, parent_id').eq('is_active', true),
          supabase.from('sec_users').select('id, full_name, username').eq('is_active', true),
          supabase.from('sec_roles').select('id, title, code').eq('is_active', true),
          supabase.from('sec_user_roles').select('user_id, role_id')
        ]);

        if (groupsRes.error) throw groupsRes.error;
        
        setGroups(groupsRes.data || []);
        setCoaAccounts(accountsRes.data || []);
        setUsers(usersRes.data || []);
        setRoles(rolesRes.data || []);
        setUserRoles(userRolesRes.data || []);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    // COA Leaf Nodes & Paths Logic
    const leafAccounts = useMemo(() => {
      if (!coaAccounts.length) return [];
      const parentIds = new Set(coaAccounts.map(a => a.parent_id).filter(Boolean));
      const accMap = new Map(coaAccounts.map(a => [a.id, a]));
      
      return coaAccounts
        .filter(a => !parentIds.has(a.id))
        .map(acc => {
          let path = acc.title_fa;
          let curr = accMap.get(acc.parent_id);
          while (curr) {
            path = `${curr.title_fa} / ${path}`;
            curr = accMap.get(curr.parent_id);
          }
          return { ...acc, fullPath: path, displayLabel: `${acc.code} - ${path}` };
        })
        .sort((a, b) => a.code.localeCompare(b.code));
    }, [coaAccounts]);

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

    // --- Accounts Mapping CRUD (Inline Edit) ---
    const openAccountsModal = (group) => {
      setSelectedGroup(group);
      setIsAccountModalOpen(true);
      setEditingAccount(null);
      fetchGroupAccounts(group.id);
    };

    const fetchGroupAccounts = async (groupId) => {
      setModalLoading(true);
      try {
        const { data, error } = await supabase.from('fm_balance_group_accounts')
          .select(`id, group_id, account_id, valid_from, valid_to, is_active`)
          .eq('group_id', groupId)
          .order('valid_from', { ascending: false });
        if (error) throw error;
        setGroupAccounts(data || []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setModalLoading(false);
      }
    };

    const startAddAccount = () => {
      setEditingAccount('NEW');
      setEditAccountForm({ account_id: '', account_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });
    };

    const startEditAccount = (row) => {
      setEditingAccount(row.id);
      const acc = leafAccounts.find(a => a.id === row.account_id);
      setEditAccountForm({ account_id: row.account_id, account_obj: acc, valid_from: row.valid_from, valid_to: row.valid_to || '', is_active: row.is_active });
    };

    const handleSaveAccountInline = async () => {
      if (!editAccountForm.account_id || !editAccountForm.valid_from) return;
      setModalLoading(true);
      try {
        const payload = {
          group_id: selectedGroup.id,
          account_id: editAccountForm.account_id,
          valid_from: editAccountForm.valid_from,
          valid_to: editAccountForm.valid_to || null,
          is_active: editAccountForm.is_active
        };

        if (editingAccount === 'NEW') {
          const { error } = await supabase.from('fm_balance_group_accounts').insert([payload]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_balance_group_accounts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingAccount);
          if (error) throw error;
        }
        setEditingAccount(null);
        fetchGroupAccounts(selectedGroup.id);
        fetchInitialData(); // Refresh grid icons
      } catch (error) {
        console.error('Error saving account map:', error);
      } finally {
        setModalLoading(false);
      }
    };

    // --- Access Mapping CRUD (Inline Edit) ---
    const openAccessModal = (group) => {
      setSelectedGroup(group);
      setIsAccessModalOpen(true);
      setEditingAccess(null);
      setAccessViewMode('assign');
      fetchGroupAccess(group.id);
    };

    const fetchGroupAccess = async (groupId) => {
      setModalLoading(true);
      try {
        const { data, error } = await supabase.from('fm_balance_group_access').select('*').eq('group_id', groupId);
        if (error) throw error;
        setGroupAccesses(data || []);
      } catch (error) {
        console.error('Error fetching access:', error);
      } finally {
        setModalLoading(false);
      }
    };

    const startAddAccess = () => {
      setEditingAccess('NEW');
      setEditAccessForm({ grantee_type: 'USER', grantee_id: '', grantee_obj: null });
    };

    const handleSaveAccessInline = async () => {
      if (!editAccessForm.grantee_id) return;
      setModalLoading(true);
      try {
        const payload = {
          group_id: selectedGroup.id,
          grantee_type: editAccessForm.grantee_type,
          grantee_id: editAccessForm.grantee_id
        };
        const { error } = await supabase.from('fm_balance_group_access').insert([payload]);
        if (error) throw error;
        
        setEditingAccess(null);
        fetchGroupAccess(selectedGroup.id);
        fetchInitialData(); // Refresh grid icons
      } catch (error) {
        console.error('Error saving access map:', error);
      } finally {
        setModalLoading(false);
      }
    };

    const aggregatedUsersList = useMemo(() => {
      if (accessViewMode !== 'aggregate') return [];
      const result = [];
      const addedIds = new Set();
      
      const rolesMap = new Map(roles.map(r => [r.id, r]));
      const usersMap = new Map(users.map(u => [u.id, u]));

      groupAccesses.forEach(acc => {
        if (acc.grantee_type === 'USER') {
          if (!addedIds.has(acc.grantee_id)) {
            const u = usersMap.get(acc.grantee_id);
            if (u) result.push({ user_id: u.id, user: u, sources: [t('دسترسی مستقیم', 'Direct Access')] });
            addedIds.add(acc.grantee_id);
          }
        } else if (acc.grantee_type === 'ROLE') {
          const roleTitle = rolesMap.get(acc.grantee_id)?.title || t('نامشخص', 'Unknown');
          const usersInRole = userRoles.filter(ur => ur.role_id === acc.grantee_id);
          
          usersInRole.forEach(ur => {
            const u = usersMap.get(ur.user_id);
            if (!u) return;
            
            if (!addedIds.has(ur.user_id)) {
              result.push({ user_id: u.id, user: u, sources: [`${t('نقش:', 'Role:')} ${roleTitle}`] });
              addedIds.add(ur.user_id);
            } else {
              const existing = result.find(x => x.user_id === ur.user_id);
              if (existing) existing.sources.push(`${t('نقش:', 'Role:')} ${roleTitle}`);
            }
          });
        }
      });
      return result;
    }, [groupAccesses, accessViewMode, users, roles, userRoles, t]);

    const availableUsersForAccess = useMemo(() => {
      return users.filter(u => !groupAccesses.some(ga => ga.grantee_type === 'USER' && ga.grantee_id === u.id));
    }, [users, groupAccesses]);

    const availableRolesForAccess = useMemo(() => {
      return roles.filter(r => !groupAccesses.some(ga => ga.grantee_type === 'ROLE' && ga.grantee_id === r.id));
    }, [roles, groupAccesses]);

    // --- Delete Execution ---
    const executeDelete = async () => {
      setLoading(true);
      setModalLoading(true);
      try {
        const { type, target, data } = deleteConfirm;
        let table = '';
        if (target === 'group') table = 'fm_balance_groups';
        if (target === 'account') table = 'fm_balance_group_accounts';
        if (target === 'access') table = 'fm_balance_group_access';

        if (type === 'single') {
          const { error } = await supabase.from(table).delete().eq('id', data.id);
          if (error) throw error;
        } else if (type === 'bulk') {
          const { error } = await supabase.from(table).delete().in('id', data);
          if (error) throw error;
        }

        setDeleteConfirm({ isOpen: false, type: null, target: null, data: null });
        
        if (target === 'group') fetchInitialData();
        if (target === 'account') { fetchGroupAccounts(selectedGroup.id); fetchInitialData(); }
        if (target === 'access') { fetchGroupAccess(selectedGroup.id); fetchInitialData(); }
      } catch (err) {
        console.error("Delete error:", err);
      } finally {
        setLoading(false);
        setModalLoading(false);
      }
    };

    // --- Main Grid Definitions ---
    const groupColumns = [
      { field: 'code', header_fa: 'کد گروه', header_en: 'Group Code', width: '120px', render: (val) => <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span> },
      { field: 'title_fa', header_fa: 'عنوان (فارسی)', header_en: 'Title (FA)', width: 'auto' },
      { field: 'title_en', header_fa: 'عنوان (انگلیسی)', header_en: 'Title (EN)', width: 'auto' },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '100px', type: 'toggle', onToggle: (row, val) => handleToggleGroupActive(row, val) }
    ];

    const groupActions = [
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => { setCurrentGroup(row); setIsGroupModalOpen(true); }, className: 'hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400' },
      { 
        icon: List, 
        tooltip: t('حساب‌های مرتبط', 'Related Accounts'), 
        onClick: (row) => openAccountsModal(row), 
        className: (row) => row.accounts && row.accounts.length > 0 ? '!text-indigo-600 dark:!text-indigo-400 hover:!text-indigo-800' : 'hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400'
      },
      { 
        icon: Shield, 
        tooltip: t('مدیریت دسترسی‌ها', 'Access Management'), 
        onClick: (row) => openAccessModal(row), 
        className: (row) => row.access && row.access.length > 0 ? '!text-teal-600 dark:!text-teal-400 hover:!text-teal-800' : 'hover:text-teal-600 dark:hover:text-teal-400 text-slate-400'
      },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'group', data: row }), className: 'hover:text-red-600 dark:hover:text-red-400 text-slate-400' }
    ];

    const groupBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', target: 'group', data: ids }) }
    ];

    const filterFields = [
      { name: 'account_id', label: t('حساب مرتبط', 'Related Account'), type: 'lov', lovData: leafAccounts, lovColumns: [{field: 'displayLabel', header_fa: 'مسیر حساب'}] },
      { name: 'user_id', label: t('دسترسی کاربر', 'User Access'), type: 'lov', lovData: users, lovColumns: [{field: 'username', header_fa: 'نام کاربری'}, {field: 'full_name', header_fa: 'نام'}] },
      { name: 'role_id', label: t('دسترسی نقش', 'Role Access'), type: 'lov', lovData: roles, lovColumns: [{field: 'code', header_fa: 'کد نقش'}, {field: 'title', header_fa: 'عنوان نقش'}] }
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
          <div className="flex-1 min-h-0 mt-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
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
              onRowDoubleClick={(row) => { setCurrentGroup(row); setIsGroupModalOpen(true); }}
              onAdd={() => {
                setCurrentGroup({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
                setIsGroupModalOpen(true);
              }}
            />
          </div>
        </div>

        {/* Modal: Group Definition */}
        <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={currentGroup.id ? t('ویرایش گروه بالانس', 'Edit Balance Group') : t('ایجاد گروه بالانس', 'New Balance Group')} width="max-w-3xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField size="sm" label={t('کد گروه', 'Group Code')} value={currentGroup.code} onChange={(e) => setCurrentGroup({...currentGroup, code: e.target.value})} isRtl={isRtl} required dir="ltr" wrapperClassName="md:col-span-1" />
              <TextField size="sm" label={t('عنوان (فارسی)', 'Title (FA)')} value={currentGroup.title_fa} onChange={(e) => setCurrentGroup({...currentGroup, title_fa: e.target.value})} isRtl={isRtl} required wrapperClassName="md:col-span-1" />
              <TextField size="sm" label={t('عنوان (انگلیسی)', 'Title (EN)')} value={currentGroup.title_en} onChange={(e) => setCurrentGroup({...currentGroup, title_en: e.target.value})} isRtl={isRtl} dir="ltr" wrapperClassName="md:col-span-1" />
              
              <TextField size="sm" label={t('توضیحات', 'Description')} value={currentGroup.description} onChange={(e) => setCurrentGroup({...currentGroup, description: e.target.value})} isRtl={isRtl} wrapperClassName="md:col-span-2" />
              <div className="md:col-span-1 flex items-center pt-5">
                 <ToggleField size="sm" label={t('وضعیت فعال', 'Active Status')} checked={currentGroup.is_active} onChange={v => setCurrentGroup({...currentGroup, is_active: v})} isRtl={isRtl} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsGroupModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveGroup} isLoading={loading}>{t('ذخیره اطلاعات', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        {/* Modal: Accounts Mapping (Inline Edit) */}
        <Modal isOpen={isAccountModalOpen} onClose={() => {setIsAccountModalOpen(false); setEditingAccount(null);}} title={`${t('حساب‌های مرتبط', 'Related Accounts')} - ${selectedGroup?.title_fa || ''}`} width="max-w-5xl" language={language}>
          <div className="flex flex-col h-[60vh] min-h-[400px] bg-slate-50 dark:bg-slate-900">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
               <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{t('فهرست حساب‌های تخصیص یافته', 'Assigned Accounts List')}</span>
               <Button variant="primary" size="sm" icon={Plus} onClick={startAddAccount} disabled={editingAccount === 'NEW'}>{t('افزودن حساب جدید', 'Add New Account')}</Button>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar p-3">
              {modalLoading && groupAccounts.length === 0 ? (
                 <div className="flex justify-center items-center h-full text-slate-400 text-sm">{t('در حال دریافت اطلاعات...', 'Loading...')}</div>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-start border-collapse min-w-[800px]">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 w-2/5">{t('مسیر حساب', 'Account Path')}</th>
                        <th className="p-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 w-1/6">{t('از تاریخ', 'Valid From')}</th>
                        <th className="p-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 w-1/6">{t('تا تاریخ', 'Valid To')}</th>
                        <th className="p-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 w-24 text-center">{t('وضعیت', 'Status')}</th>
                        <th className="p-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 w-24 text-center">{t('عملیات', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingAccount === 'NEW' && (
                        <tr className="bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50">
                          <td className="p-2 align-top">
                            <LOVField 
                              size="sm" required data={leafAccounts} columns={[{field:'displayLabel', header_fa:'مسیر حساب'}]} 
                              displayValue={editAccountForm.account_obj?.displayLabel || ''}
                              onChange={(row) => setEditAccountForm({...editAccountForm, account_id: row?.id || '', account_obj: row})}
                            />
                          </td>
                          <td className="p-2 align-top">
                            <DatePicker size="sm" value={editAccountForm.valid_from} onChange={(v) => setEditAccountForm({...editAccountForm, valid_from: v})} required isRtl={isRtl} />
                          </td>
                          <td className="p-2 align-top">
                            <DatePicker size="sm" value={editAccountForm.valid_to} onChange={(v) => setEditAccountForm({...editAccountForm, valid_to: v})} isRtl={isRtl} />
                          </td>
                          <td className="p-2 align-top pt-3 text-center">
                            <ToggleField checked={editAccountForm.is_active} onChange={v => setEditAccountForm({...editAccountForm, is_active: v})} isRtl={isRtl} wrapperClassName="justify-center" />
                          </td>
                          <td className="p-2 align-top pt-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={handleSaveAccountInline} disabled={!editAccountForm.account_id || !editAccountForm.valid_from} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md disabled:opacity-50"><Check size={16} /></button>
                              <button onClick={() => setEditingAccount(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md"><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {groupAccounts.length === 0 && editingAccount !== 'NEW' && (
                        <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-[12px]">{t('رکوردی یافت نشد', 'No records found')}</td></tr>
                      )}
                      {groupAccounts.map(row => {
                        const isEditing = editingAccount === row.id;
                        const acc = leafAccounts.find(a => a.id === row.account_id);
                        return isEditing ? (
                          <tr key={row.id} className="bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50">
                            <td className="p-2 align-top">
                              <LOVField 
                                size="sm" required data={leafAccounts} columns={[{field:'displayLabel', header_fa:'مسیر حساب'}]} 
                                displayValue={editAccountForm.account_obj?.displayLabel || ''}
                                onChange={(r) => setEditAccountForm({...editAccountForm, account_id: r?.id || '', account_obj: r})}
                              />
                            </td>
                            <td className="p-2 align-top">
                              <DatePicker size="sm" value={editAccountForm.valid_from} onChange={(v) => setEditAccountForm({...editAccountForm, valid_from: v})} required isRtl={isRtl} />
                            </td>
                            <td className="p-2 align-top">
                              <DatePicker size="sm" value={editAccountForm.valid_to} onChange={(v) => setEditAccountForm({...editAccountForm, valid_to: v})} isRtl={isRtl} />
                            </td>
                            <td className="p-2 align-top pt-3 text-center">
                              <ToggleField checked={editAccountForm.is_active} onChange={v => setEditAccountForm({...editAccountForm, is_active: v})} isRtl={isRtl} wrapperClassName="justify-center" />
                            </td>
                            <td className="p-2 align-top pt-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={handleSaveAccountInline} disabled={!editAccountForm.account_id || !editAccountForm.valid_from} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md disabled:opacity-50"><Check size={16} /></button>
                                <button onClick={() => setEditingAccount(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md"><X size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="p-2.5 text-[12px] text-slate-700 dark:text-slate-300 font-medium">{acc?.displayLabel || row.account_id}</td>
                            <td className="p-2.5 text-[12px] text-slate-700 dark:text-slate-300" dir="ltr">{row.valid_from}</td>
                            <td className="p-2.5 text-[12px] text-slate-700 dark:text-slate-300" dir="ltr">{row.valid_to || <span className="text-[10px] text-slate-400">{t('تا کنون', 'Present')}</span>}</td>
                            <td className="p-2.5 text-center"><Badge variant={row.is_active ? 'emerald' : 'slate'} size="sm" className="text-[10px]">{row.is_active ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}</Badge></td>
                            <td className="p-2.5">
                               <div className="flex items-center justify-center gap-1">
                                 <button onClick={() => startEditAccount(row)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"><Edit size={14}/></button>
                                 <button onClick={() => setDeleteConfirm({ isOpen: true, type: 'single', target: 'account', data: row })} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"><Trash2 size={14}/></button>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* Modal: Access Mapping (Inline Edit & Aggregated View) */}
        <Modal isOpen={isAccessModalOpen} onClose={() => {setIsAccessModalOpen(false); setEditingAccess(null);}} title={`${t('مدیریت دسترسی‌ها', 'Manage Access')} - ${selectedGroup?.title_fa || ''}`} width="max-w-4xl" language={language}>
          <div className="flex flex-col h-[60vh] min-h-[400px] bg-slate-50 dark:bg-slate-900 font-sans">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
               <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button onClick={() => setAccessViewMode('assign')} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${accessViewMode === 'assign' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    {t('تخصیص دسترسی', 'Access Assignment')}
                  </button>
                  <button onClick={() => setAccessViewMode('aggregate')} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${accessViewMode === 'aggregate' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    {t('مشاهده تجمیعی کاربران', 'Aggregated Users View')}
                  </button>
               </div>
               {accessViewMode === 'assign' && (
                 <div className="flex gap-2">
                   {groupAccesses.length > 0 && <Button variant="danger-outline" size="sm" icon={Trash2} onClick={() => setDeleteConfirm({ isOpen: true, type: 'bulk', target: 'access', data: groupAccesses.map(a => a.id) })}>{t('حذف همه', 'Delete All')}</Button>}
                   <Button variant="primary" size="sm" icon={Plus} onClick={startAddAccess} disabled={editingAccess === 'NEW'}>{t('افزودن دسترسی', 'Add Access')}</Button>
                 </div>
               )}
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar p-3">
              {modalLoading && groupAccesses.length === 0 ? (
                 <div className="flex justify-center items-center h-full text-slate-400 text-sm">{t('در حال دریافت اطلاعات...', 'Loading...')}</div>
              ) : accessViewMode === 'assign' ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-start border-collapse min-w-[600px]">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 w-48">{t('نوع دسترسی', 'Access Type')}</th>
                        <th className="p-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 w-auto">{t('شخص / نقش', 'Grantee')}</th>
                        <th className="p-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 w-24 text-center">{t('عملیات', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingAccess === 'NEW' && (
                        <tr className="bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50">
                          <td className="p-2 align-top">
                             <SelectField size="sm" required
                               options={[{value:'USER', label:t('کاربر سیستم', 'User')}, {value:'ROLE', label:t('نقش سیستمی', 'Role')}]}
                               value={editAccessForm.grantee_type} onChange={(e) => setEditAccessForm({...editAccessForm, grantee_type: e.target.value, grantee_id: '', grantee_obj: null})} isRtl={isRtl}
                             />
                          </td>
                          <td className="p-2 align-top">
                             <LOVField 
                               size="sm" required
                               data={editAccessForm.grantee_type === 'USER' ? availableUsersForAccess : availableRolesForAccess} 
                               columns={editAccessForm.grantee_type === 'USER' ? [{field:'username',header_fa:'نام کاربری'},{field:'full_name',header_fa:'نام'}] : [{field:'code',header_fa:'کد'},{field:'title',header_fa:'عنوان'}]}
                               displayValue={editAccessForm.grantee_obj ? (editAccessForm.grantee_type === 'USER' ? `${editAccessForm.grantee_obj.full_name} (${editAccessForm.grantee_obj.username})` : `${editAccessForm.grantee_obj.title} (${editAccessForm.grantee_obj.code})`) : ''}
                               onChange={(row) => setEditAccessForm({...editAccessForm, grantee_id: row?.id || '', grantee_obj: row})}
                             />
                          </td>
                          <td className="p-2 align-top pt-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={handleSaveAccessInline} disabled={!editAccessForm.grantee_id} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md disabled:opacity-50"><Check size={16} /></button>
                              <button onClick={() => setEditingAccess(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md"><X size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {groupAccesses.length === 0 && editingAccess !== 'NEW' && (
                        <tr><td colSpan="3" className="p-8 text-center text-slate-400 text-[12px]">{t('دسترسی تعریف نشده است', 'No access defined')}</td></tr>
                      )}
                      {groupAccesses.map(row => {
                        let displayGrantee = t('نامشخص', 'Unknown');
                        if (row.grantee_type === 'USER') {
                          const u = users.find(x => x.id === row.grantee_id);
                          if (u) displayGrantee = `${u.full_name} (${u.username})`;
                        } else {
                          const r = roles.find(x => x.id === row.grantee_id);
                          if (r) displayGrantee = `${r.title} (${r.code})`;
                        }
                        return (
                          <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="p-2.5">
                              <Badge variant={row.grantee_type === 'USER' ? 'indigo' : 'emerald'} size="sm" className="text-[10px]">
                                {row.grantee_type === 'USER' ? t('کاربر', 'User') : t('نقش', 'Role')}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-[12px] text-slate-700 dark:text-slate-300 font-medium">{displayGrantee}</td>
                            <td className="p-2.5">
                               <div className="flex items-center justify-center gap-1">
                                 <button onClick={() => setDeleteConfirm({ isOpen: true, type: 'single', target: 'access', data: row })} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"><Trash2 size={14}/></button>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {aggregatedUsersList.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-400 text-[12px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">{t('هیچ کاربری دسترسی ندارد', 'No users have access')}</div>
                  ) : (
                    aggregatedUsersList.map(item => (
                      <div key={item.user_id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                               <Users size={18} />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                               <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{item.user.full_name}</span>
                               <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate" dir="ltr">{item.user.username}</span>
                            </div>
                         </div>
                         <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-1">
                            {item.sources.map((src, idx) => (
                               <Badge key={idx} variant="slate" size="sm" className="text-[9px] px-1.5">{src}</Badge>
                            ))}
                         </div>
                      </div>
                    ))
                  )}
                </div>
              )}
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
              <Button variant="primary" size="sm" onClick={executeDelete} isLoading={loading || modalLoading} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 border-red-600 dark:border-red-500">{t('تایید حذف', 'Delete')}</Button>
            </div>
          </div>
        </Modal>

      </div>
    );
  };

  window.BalanceGroup = BalanceGroup;
})();