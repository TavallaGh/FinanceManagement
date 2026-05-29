/* Filename: financial/BalanceGroup.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Scale = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, List = FallbackIcon, Shield = FallbackIcon,
    Save = FallbackIcon, AlertTriangle = FallbackIcon, Lock = FallbackIcon, Users = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Button = DS.Button || window.DSCore?.Button || (() => null);
  const PageHeader = DS.PageHeader || window.DSCore?.PageHeader || (() => null);
  const Modal = DS.Modal || window.DSFeedback?.Modal || window.DSCore?.Modal || (() => null);
  const DataGrid = DS.DataGrid || window.DSGrid?.DataGrid || (() => null);
  const AdvancedFilter = DS.AdvancedFilter || window.DSGrid?.AdvancedFilter || (() => null);
  const LOVField = DS.LOVField || window.DSGrid?.LOVField || (() => null);
  const TextField = DS.TextField || window.DSForms?.TextField || (() => null);
  const ToggleField = DS.ToggleField || window.DSForms?.ToggleField || (() => null);
  const SelectField = DS.SelectField || window.DSForms?.SelectField || (() => null);
  const DatePicker = DS.DatePicker || window.DSForms?.DatePicker || (() => null);
  const Badge = DS.Badge || window.DSCore?.Badge || (() => null);
  const Tabs = DS.Tabs || window.DSCore?.Tabs || (() => null);

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
    
    const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
    const [isAccountFormModalOpen, setIsAccountFormModalOpen] = useState(false);
    
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [isAccessFormModalOpen, setIsAccessFormModalOpen] = useState(false);
    const [accessViewMode, setAccessViewMode] = useState('assign');
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, target: null, data: null });

    // Current Edit States
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [currentGroup, setCurrentGroup] = useState({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
    
    const [groupAccounts, setGroupAccounts] = useState([]);
    const [editAccountForm, setEditAccountForm] = useState({ id: null, account_id: '', account_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });

    const [groupAccesses, setGroupAccesses] = useState([]);
    const [editAccessForm, setEditAccessForm] = useState({ id: null, grantee_type: 'USER', grantee_id: '', grantee_obj: null });

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
          supabase.from('fm_coa_accounts').select('id, code, title_fa, parent_id, is_active'),
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

    // Calculate leaf accounts and their full path
    const leafAccounts = useMemo(() => {
      if (!coaAccounts.length) return [];
      const parentIds = new Set(coaAccounts.map(a => a.parent_id).filter(Boolean));
      const accMap = new Map(coaAccounts.map(a => [a.id, a]));
      
      const leaves = coaAccounts.filter(a => !parentIds.has(a.id));
      
      return leaves.map(leaf => {
        let pathParts = [];
        let curr = accMap.get(leaf.parent_id);
        while (curr) {
          pathParts.unshift(curr.title_fa);
          curr = accMap.get(curr.parent_id);
        }
        return { 
          ...leaf, 
          fullPath: pathParts.join(' / '),
          displayLabel: `${leaf.code} - ${leaf.title_fa}`
        };
      }).sort((a, b) => a.code.localeCompare(b.code));
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

    // --- Main Group CRUD ---
    const openGroupForm = (group = null) => {
      if (group) {
        setCurrentGroup(group);
      } else {
        setCurrentGroup({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
      }
      setIsGroupModalOpen(true);
    };

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

    // --- Related Accounts Modal & CRUD ---
    const openAccountsModal = (group) => {
      setSelectedGroup(group);
      setIsAccountsModalOpen(true);
      fetchGroupAccounts(group.id);
    };

    const fetchGroupAccounts = async (groupId) => {
      setModalLoading(true);
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
        setModalLoading(false);
      }
    };

    const openAccountForm = (row = null) => {
      if (row) {
        const accObj = leafAccounts.find(a => a.id === row.account_id) || null;
        setEditAccountForm({ id: row.id, account_id: row.account_id, account_obj: accObj, valid_from: row.valid_from, valid_to: row.valid_to || '', is_active: row.is_active });
      } else {
        setEditAccountForm({ id: null, account_id: '', account_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });
      }
      setIsAccountFormModalOpen(true);
    };

    const handleSaveAccount = async () => {
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

        if (editAccountForm.id) {
          const { error } = await supabase.from('fm_balance_group_accounts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editAccountForm.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_balance_group_accounts').insert([payload]);
          if (error) throw error;
        }
        setIsAccountFormModalOpen(false);
        fetchGroupAccounts(selectedGroup.id);
        fetchInitialData();
      } catch (error) {
        console.error('Error saving account map:', error);
      } finally {
        setModalLoading(false);
      }
    };

    const handleToggleAccountActive = async (row, newValue) => {
      try {
        const { error } = await supabase.from('fm_balance_group_accounts').update({ is_active: newValue, updated_at: new Date().toISOString() }).eq('id', row.id);
        if (error) throw error;
        setGroupAccounts(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (err) {
        console.error("Toggle Error:", err);
      }
    };

    // --- Access Modal & CRUD ---
    const openAccessModal = (group) => {
      setSelectedGroup(group);
      setAccessViewMode('assign');
      setIsAccessModalOpen(true);
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

    const openAccessForm = () => {
      setEditAccessForm({ id: null, grantee_type: 'USER', grantee_id: '', grantee_obj: null });
      setIsAccessFormModalOpen(true);
    };

    const handleSaveAccess = async () => {
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
        
        setIsAccessFormModalOpen(false);
        fetchGroupAccess(selectedGroup.id);
        fetchInitialData();
      } catch (error) {
        console.error('Error saving access map:', error);
      } finally {
        setModalLoading(false);
      }
    };

    // Derived Lists for Access
    const availableUsersForAccess = useMemo(() => {
      return users.filter(u => !groupAccesses.some(ga => ga.grantee_type === 'USER' && ga.grantee_id === u.id));
    }, [users, groupAccesses]);

    const availableRolesForAccess = useMemo(() => {
      return roles.filter(r => !groupAccesses.some(ga => ga.grantee_type === 'ROLE' && ga.grantee_id === r.id));
    }, [roles, groupAccesses]);

    const aggregatedUsersList = useMemo(() => {
      if (accessViewMode !== 'aggregate') return [];
      const resultMap = new Map();
      const rolesMap = new Map(roles.map(r => [r.id, r]));
      const usersMap = new Map(users.map(u => [u.id, u]));

      groupAccesses.forEach(acc => {
        if (acc.grantee_type === 'USER') {
          const u = usersMap.get(acc.grantee_id);
          if (u) {
            if (!resultMap.has(u.id)) resultMap.set(u.id, { id: u.id, full_name: u.full_name, username: u.username, sources: [] });
            resultMap.get(u.id).sources.push(t('دسترسی مستقیم', 'Direct Access'));
          }
        } else if (acc.grantee_type === 'ROLE') {
          const roleTitle = rolesMap.get(acc.grantee_id)?.title || t('نامشخص', 'Unknown');
          const usersInRole = userRoles.filter(ur => ur.role_id === acc.grantee_id);
          
          usersInRole.forEach(ur => {
            const u = usersMap.get(ur.user_id);
            if (!u) return;
            if (!resultMap.has(u.id)) resultMap.set(u.id, { id: u.id, full_name: u.full_name, username: u.username, sources: [] });
            resultMap.get(u.id).sources.push(`${t('نقش:', 'Role:')} ${roleTitle}`);
          });
        }
      });
      return Array.from(resultMap.values());
    }, [groupAccesses, accessViewMode, users, roles, userRoles, t]);

    // --- Shared Delete Action ---
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

    // --- Columns Definitions ---
    
    // Shared LOV Column for Accounts (Used in Filter & Forms)
    const lovAccountColumns = [
      { field: 'code', header_fa: 'کد حساب', width: '100px' },
      { 
        field: 'title_fa', 
        header_fa: 'عنوان حساب',
        width: '250px',
        render: (val, row) => (
          <div className="flex flex-col py-0.5">
             <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
             {row.fullPath && <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5" dir="rtl">{row.fullPath}</span>}
          </div>
        )
      },
      {
        field: 'is_active',
        header_fa: 'وضعیت',
        width: '80px',
        render: (val) => <Badge variant={val ? 'emerald' : 'slate'} size="sm" className="text-[10px]">{val ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}</Badge>
      }
    ];

    // Main Group DataGrid
    const groupColumns = [
      { field: 'code', header_fa: 'کد گروه', header_en: 'Group Code', width: '120px', render: (val) => <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span> },
      { field: 'title_fa', header_fa: 'عنوان (فارسی)', header_en: 'Title (FA)', width: 'auto' },
      { field: 'title_en', header_fa: 'عنوان (انگلیسی)', header_en: 'Title (EN)', width: 'auto' },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '100px', type: 'toggle', onToggle: (row, val) => handleToggleGroupActive(row, val) }
    ];

    const groupActions = [
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => openGroupForm(row), className: 'hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400' },
      { 
        icon: List, 
        tooltip: t('مدیریت حساب‌ها', 'Manage Accounts'), 
        onClick: (row) => openAccountsModal(row), 
        className: (row) => row.accounts && row.accounts.length > 0 ? '!text-indigo-600 dark:!text-indigo-400 hover:!text-indigo-800' : 'hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400'
      },
      { 
        icon: Shield, 
        tooltip: t('مدیریت دسترسی‌ها', 'Manage Access'), 
        onClick: (row) => openAccessModal(row), 
        className: (row) => row.access && row.access.length > 0 ? '!text-teal-600 dark:!text-teal-400 hover:!text-teal-800' : 'hover:text-teal-600 dark:hover:text-teal-400 text-slate-400'
      },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'group', data: row }), className: 'hover:text-red-600 dark:hover:text-red-400 text-slate-400' }
    ];

    const groupBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', target: 'group', data: ids }) }
    ];

    const filterFields = [
      { name: 'account_id', label: t('دارای حساب', 'Contains Account'), type: 'lov', lovData: leafAccounts, lovColumns: lovAccountColumns, dropdownWidth: 'min-w-[450px]' },
      { name: 'user_id', label: t('دسترسی کاربر', 'User Access'), type: 'lov', lovData: users, lovColumns: [{field: 'username', header_fa: 'نام کاربری'}, {field: 'full_name', header_fa: 'نام'}] },
      { name: 'role_id', label: t('دسترسی نقش', 'Role Access'), type: 'lov', lovData: roles, lovColumns: [{field: 'code', header_fa: 'کد نقش'}, {field: 'title', header_fa: 'عنوان نقش'}] }
    ];

    // Accounts Modal DataGrid
    const accountColumns = [
      { field: 'code', header_fa: 'کد حساب', header_en: 'Account Code', width: '120px', render: (_, row) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.fm_coa_accounts?.code}</span> },
      { field: 'title', header_fa: 'عنوان حساب', header_en: 'Account Title', width: 'auto', render: (_, row) => row.fm_coa_accounts?.title_fa },
      { field: 'valid_from', header_fa: 'از تاریخ', header_en: 'Valid From', width: '120px', type: 'date' },
      { field: 'valid_to', header_fa: 'تا تاریخ', header_en: 'Valid To', width: '120px', type: 'date', render: (val) => val || <span className="text-[10px] text-slate-400">{t('تا کنون', 'Present')}</span> },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '90px', type: 'toggle', onToggle: (row, val) => handleToggleAccountActive(row, val) }
    ];

    const accountActions = [
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => openAccountForm(row) },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'account', data: row }), className: 'hover:text-red-600' }
    ];

    const accountBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', target: 'account', data: ids }) }
    ];

    // Access Modal DataGrids
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
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'access', data: row }), className: 'hover:text-red-600' }
    ];

    const accessBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', target: 'access', data: ids }) }
    ];

    const aggregateColumns = [
      { 
        field: 'full_name', header_fa: 'کاربر', width: '250px', 
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
               <Users size={14} />
            </div>
            <div className="flex flex-col min-w-0">
               <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{row.full_name}</span>
               <span className="text-[10px] text-slate-500 dark:text-slate-400" dir="ltr">{row.username}</span>
            </div>
          </div>
        )
      },
      { 
        field: 'sources', header_fa: 'منابع دسترسی', width: 'auto',
        render: (val) => (
          <div className="flex flex-wrap gap-1">
            {val.map((src, idx) => <Badge key={idx} variant="slate" size="sm" className="text-[10px]">{src}</Badge>)}
          </div>
        )
      }
    ];

    const accessTabs = [
      { id: 'assign', label: t('تخصیص دسترسی', 'Access Assignment') },
      { id: 'aggregate', label: t('مشاهده تجمیعی', 'Aggregated View') }
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
              onRowDoubleClick={(row) => openGroupForm(row)}
              onAdd={() => openGroupForm()}
            />
          </div>
        </div>

        {/* Modal: Group Form */}
        <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={currentGroup.id ? t('ویرایش گروه بالانس', 'Edit Balance Group') : t('ایجاد گروه بالانس', 'New Balance Group')} width="max-w-2xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField size="sm" label={t('کد گروه', 'Group Code')} value={currentGroup.code} onChange={(e) => setCurrentGroup({...currentGroup, code: e.target.value})} isRtl={isRtl} required dir="ltr" wrapperClassName="md:col-span-1" />
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

        {/* Modal: Related Accounts Grid */}
        <Modal isOpen={isAccountsModalOpen} onClose={() => setIsAccountsModalOpen(false)} title={`${t('مدیریت حساب‌های مرتبط', 'Manage Accounts')} - ${selectedGroup?.title_fa || ''}`} width="max-w-4xl" language={language}>
          <div className="flex flex-col h-[60vh] min-h-[400px]">
            <DataGrid 
              data={groupAccounts} 
              columns={accountColumns} 
              actions={accountActions} 
              bulkActions={accountBulkActions}
              language={language} 
              selectable={true}
              isLoading={modalLoading} 
              onAdd={() => openAccountForm()}
              onRowDoubleClick={(row) => openAccountForm(row)}
            />
          </div>
        </Modal>

        {/* Sub-Modal: Add/Edit Account Form */}
        <Modal isOpen={isAccountFormModalOpen} onClose={() => setIsAccountFormModalOpen(false)} title={editAccountForm.id ? t('ویرایش حساب مرتبط', 'Edit Account') : t('افزودن حساب', 'Add Account')} width="max-w-2xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LOVField 
                size="sm" label={t('انتخاب حساب', 'Select Account')} required wrapperClassName="md:col-span-2"
                data={leafAccounts} columns={lovAccountColumns} dropdownWidth="min-w-[450px]"
                displayValue={editAccountForm.account_obj ? `${editAccountForm.account_obj.code} - ${editAccountForm.account_obj.title_fa}` : ''}
                onChange={(row) => setEditAccountForm({...editAccountForm, account_id: row?.id || '', account_obj: row})}
              />
              <DatePicker size="sm" label={t('از تاریخ', 'Valid From')} value={editAccountForm.valid_from} onChange={(v) => setEditAccountForm({...editAccountForm, valid_from: v})} required isRtl={isRtl} wrapperClassName="md:col-span-1" />
              <DatePicker size="sm" label={t('تا تاریخ', 'Valid To')} value={editAccountForm.valid_to} onChange={(v) => setEditAccountForm({...editAccountForm, valid_to: v})} isRtl={isRtl} wrapperClassName="md:col-span-1" />
              <div className="md:col-span-2 flex items-center pt-2">
                 <ToggleField size="sm" label={t('وضعیت فعال', 'Active Status')} checked={editAccountForm.is_active} onChange={v => setEditAccountForm({...editAccountForm, is_active: v})} isRtl={isRtl} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsAccountFormModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveAccount} isLoading={modalLoading} disabled={!editAccountForm.account_id || !editAccountForm.valid_from}>{t('ذخیره اطلاعات', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        {/* Modal: Access Grid & Aggregation */}
        <Modal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} title={`${t('مدیریت دسترسی‌ها', 'Manage Access')} - ${selectedGroup?.title_fa || ''}`} width="max-w-4xl" language={language}>
          <div className="flex flex-col h-[60vh] min-h-[400px]">
            <Tabs tabs={accessTabs} activeTab={accessViewMode} onChange={setAccessViewMode} />
            <div className="flex-1 min-h-0 mt-2">
              {accessViewMode === 'assign' ? (
                <DataGrid 
                  data={groupAccesses} 
                  columns={accessColumns} 
                  actions={accessActions} 
                  bulkActions={accessBulkActions}
                  language={language} 
                  selectable={true}
                  isLoading={modalLoading}
                  onAdd={() => openAccessForm()}
                />
              ) : (
                <DataGrid 
                  data={aggregatedUsersList} 
                  columns={aggregateColumns} 
                  language={language} 
                  isLoading={modalLoading}
                />
              )}
            </div>
          </div>
        </Modal>

        {/* Sub-Modal: Add Access Form */}
        <Modal isOpen={isAccessFormModalOpen} onClose={() => setIsAccessFormModalOpen(false)} title={t('افزودن دسترسی', 'Add Access')} width="max-w-xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3">
              <SelectField size="sm" label={t('نوع دسترسی', 'Access Type')} required
                options={[{value:'USER', label:t('کاربر سیستم', 'User')}, {value:'ROLE', label:t('نقش سیستمی', 'Role')}]}
                value={editAccessForm.grantee_type} onChange={(e) => setEditAccessForm({...editAccessForm, grantee_type: e.target.value, grantee_id: '', grantee_obj: null})} isRtl={isRtl}
              />
              <LOVField 
                size="sm" label={t('انتخاب شخص / نقش', 'Select Grantee')} required
                data={editAccessForm.grantee_type === 'USER' ? availableUsersForAccess : availableRolesForAccess} 
                columns={editAccessForm.grantee_type === 'USER' ? [{field:'username',header_fa:'نام کاربری'},{field:'full_name',header_fa:'نام'}] : [{field:'code',header_fa:'کد'},{field:'title',header_fa:'عنوان'}]}
                displayValue={editAccessForm.grantee_obj ? (editAccessForm.grantee_type === 'USER' ? `${editAccessForm.grantee_obj.full_name} (${editAccessForm.grantee_obj.username})` : `${editAccessForm.grantee_obj.title} (${editAccessForm.grantee_obj.code})`) : ''}
                onChange={(row) => setEditAccessForm({...editAccessForm, grantee_id: row?.id || '', grantee_obj: row})}
              />
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsAccessFormModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveAccess} isLoading={modalLoading} disabled={!editAccessForm.grantee_id}>{t('تخصیص دسترسی', 'Assign')}</Button>
            </div>
          </div>
        </Modal>

        {/* Shared Modal: Delete Confirmation */}
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