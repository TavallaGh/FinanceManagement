/* Filename: financial/BalanceGroup.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Scale = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, List = FallbackIcon, Shield = FallbackIcon,
    Save = FallbackIcon, AlertTriangle = FallbackIcon, Lock = FallbackIcon, Users = FallbackIcon,
    X = FallbackIcon
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
    const [rawUsers, setRawUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [userRoles, setUserRoles] = useState([]);
    const [charts, setCharts] = useState([]);
    const [parties, setParties] = useState([]);

    // Grid & Filter State
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);

    // Modal States
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [accessViewMode, setAccessViewMode] = useState('assign');
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, target: null, data: null });

    // Current Group
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [currentGroup, setCurrentGroup] = useState({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
    
    // Inline Forms inside Modals
    const [groupAccounts, setGroupAccounts] = useState([]);
    const [inlineAccountEdit, setInlineAccountEdit] = useState(null);

    const [groupAccesses, setGroupAccesses] = useState([]);
    const [inlineAccessEdit, setInlineAccessEdit] = useState(null);

    const globalMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';
    const formatDate = (val) => val && window.DSCore?.formatGlobalDate ? window.DSCore.formatGlobalDate(val, globalMode) : val;

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
        const [groupsRes, accountsRes, usersRes, rolesRes, userRolesRes, chartsRes, partiesRes] = await Promise.all([
          supabase.from('fm_balance_groups')
            .select('*, accounts:fm_balance_group_accounts(id, account_id), access:fm_balance_group_access(grantee_type, grantee_id)')
            .order('created_at', { ascending: false }),
          supabase.from('fm_coa_accounts').select('id, code, title_fa, parent_id, is_active, chart_id'),
          supabase.from('sec_users').select('*'),
          supabase.from('sec_roles').select('id, title, code'),
          supabase.from('sec_user_roles').select('user_id, role_id'),
          supabase.from('fm_coa_charts').select('id, title'),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type')
        ]);

        if (groupsRes.error) throw groupsRes.error;
        
        setGroups(groupsRes.data || []);
        setCoaAccounts(accountsRes.data || []);
        setRawUsers(usersRes.data || []);
        setRoles(rolesRes.data || []);
        setUserRoles(userRolesRes.data || []);
        setCharts(chartsRes.data || []);
        setParties(partiesRes.data || []);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    const users = useMemo(() => {
      return rawUsers.map(user => {
        const userParty = parties.find(p => String(p.id) === String(user.party_id || user.person_id));
        let fNameStr = '';
        if (userParty) {
            if (userParty.party_type === 'legal' && userParty.company_name) {
                fNameStr = userParty.company_name;
            } else {
                fNameStr = `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
            }
        }
        if (!fNameStr || fNameStr === '') {
            const fname = user.first_name || user.name || '';
            const lname = user.last_name || user.family || '';
            fNameStr = (fname || lname) ? `${fname} ${lname}`.trim() : '---';
        }
        return {
          ...user,
          full_name: fNameStr
        };
      });
    }, [rawUsers, parties]);

    const leafAccounts = useMemo(() => {
      if (!coaAccounts.length) return [];
      const parentIds = new Set(coaAccounts.map(a => a.parent_id).filter(Boolean));
      const accMap = new Map(coaAccounts.map(a => [a.id, a]));
      const chartsMap = new Map(charts.map(c => [String(c.id), c.title]));
      
      const leaves = coaAccounts.filter(a => !parentIds.has(a.id));
      
      return leaves.map(leaf => {
        let pathParts = [];
        let curr = accMap.get(leaf.parent_id);
        let rootNode = leaf;
        while (curr) {
          pathParts.unshift(curr.title_fa);
          rootNode = curr;
          curr = accMap.get(curr.parent_id);
        }
        pathParts.push(leaf.title_fa);
        
        const chartTitle = chartsMap.get(String(leaf.chart_id)) || chartsMap.get(String(rootNode.chart_id)) || rootNode.title_fa || '';
        
        return { 
          ...leaf, 
          fullPath: pathParts.join(' / '),
          structure_name: chartTitle,
          displayLabel: `${leaf.code} - ${leaf.title_fa}`
        };
      }).sort((a, b) => a.code.localeCompare(b.code));
    }, [coaAccounts, charts]);

    const filteredGroups = useMemo(() => {
      let result = [...groups];
      if (filters.account_id && filters.account_id.id) {
        result = result.filter(g => g.accounts?.some(a => a.account_id === filters.account_id.id));
      }
      if (filters.user_id && filters.user_id.id) {
        result = result.filter(g => g.access?.some(a => a.grantee_type?.toLowerCase() === 'user' && a.grantee_id === filters.user_id.id));
      }
      if (filters.role_id && filters.role_id.id) {
        result = result.filter(g => g.access?.some(a => a.grantee_type?.toLowerCase() === 'role' && a.grantee_id === filters.role_id.id));
      }
      return result;
    }, [groups, filters]);

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

    const openAccountsModal = (group) => {
      setSelectedGroup(group);
      setInlineAccountEdit(null);
      setIsAccountsModalOpen(true);
      fetchGroupAccounts(group.id);
    };

    const fetchGroupAccounts = async (groupId) => {
      setModalLoading(true);
      try {
        const { data, error } = await supabase.from('fm_balance_group_accounts')
          .select(`id, group_id, account_id, valid_from, valid_to, is_active, fm_coa_accounts ( code, title_fa, chart_id )`)
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

    const handleAddAccountClick = () => {
      if (inlineAccountEdit) return;
      setInlineAccountEdit({
        id: 'new',
        data: { account_id: '', account_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true }
      });
    };

    const handleEditAccountClick = (row) => {
      if (inlineAccountEdit) return;
      const accObj = leafAccounts.find(a => String(a.id) === String(row.account_id)) || null;
      setInlineAccountEdit({
        id: row.id,
        data: { account_id: row.account_id, account_obj: accObj, valid_from: row.valid_from, valid_to: row.valid_to || '', is_active: row.is_active }
      });
    };

    const handleSaveAccountInline = async () => {
      const form = inlineAccountEdit.data;
      if (!form.account_id || !form.valid_from) return;
      
      if (inlineAccountEdit.id === 'new' && groupAccounts.some(a => String(a.account_id) === String(form.account_id))) {
         alert(t('این حساب قبلاً به گروه افزوده شده است.', 'This account is already added to the group.'));
         return;
      }

      setModalLoading(true);
      try {
        const payload = {
          group_id: selectedGroup.id,
          account_id: form.account_id,
          valid_from: form.valid_from,
          valid_to: form.valid_to || null,
          is_active: form.is_active
        };

        if (inlineAccountEdit.id !== 'new') {
          const { error } = await supabase.from('fm_balance_group_accounts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', inlineAccountEdit.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_balance_group_accounts').insert([payload]);
          if (error) throw error;
        }
        
        setInlineAccountEdit(null);
        fetchGroupAccounts(selectedGroup.id);
        fetchInitialData();
      } catch (error) {
        console.error('Error saving account map:', error);
      } finally {
        setModalLoading(false);
      }
    };

    const accountGridData = useMemo(() => {
       const data = [...groupAccounts];
       if (inlineAccountEdit && inlineAccountEdit.id === 'new') {
         data.unshift({ id: 'new', _isNew: true, ...inlineAccountEdit.data });
       }
       return data;
    }, [groupAccounts, inlineAccountEdit]);

    const openAccessModal = (group) => {
      setSelectedGroup(group);
      setAccessViewMode('assign');
      setInlineAccessEdit(null);
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

    const handleAddAccessClick = () => {
      if (inlineAccessEdit) return;
      setInlineAccessEdit({
        id: 'new',
        data: { grantee_type: 'USER', grantee_id: '', grantee_obj: null }
      });
    };

    const handleSaveAccessInline = async () => {
      const form = inlineAccessEdit.data;
      if (!form.grantee_id) return;

      if (inlineAccessEdit.id === 'new' && groupAccesses.some(a => a.grantee_type?.toUpperCase() === form.grantee_type?.toUpperCase() && String(a.grantee_id) === String(form.grantee_id))) {
         alert(t('این دسترسی قبلاً افزوده شده است.', 'This access is already added.'));
         return;
      }

      setModalLoading(true);
      try {
        const payload = {
          group_id: selectedGroup.id,
          grantee_type: form.grantee_type,
          grantee_id: form.grantee_id
        };
        const { error } = await supabase.from('fm_balance_group_access').insert([payload]);
        if (error) throw error;
        
        setInlineAccessEdit(null);
        fetchGroupAccess(selectedGroup.id);
        fetchInitialData();
      } catch (error) {
        console.error('Error saving access map:', error);
      } finally {
        setModalLoading(false);
      }
    };

    const accessGridData = useMemo(() => {
       const data = [...groupAccesses];
       if (inlineAccessEdit && inlineAccessEdit.id === 'new') {
         data.unshift({ id: 'new', _isNew: true, ...inlineAccessEdit.data });
       }
       return data;
    }, [groupAccesses, inlineAccessEdit]);

    const availableUsersForAccess = useMemo(() => {
      return users.filter(u => !groupAccesses.some(ga => ga.grantee_type?.toLowerCase() === 'user' && String(ga.grantee_id) === String(u.id)));
    }, [users, groupAccesses]);

    const availableRolesForAccess = useMemo(() => {
      return roles.filter(r => !groupAccesses.some(ga => ga.grantee_type?.toLowerCase() === 'role' && String(ga.grantee_id) === String(r.id)));
    }, [roles, groupAccesses]);

    const aggregatedUsersList = useMemo(() => {
      if (accessViewMode !== 'aggregate') return [];
      const result = [];

      users.forEach(user => {
        const reasons = [];

        const directPerm = groupAccesses.find(p => p.grantee_type?.toLowerCase() === 'user' && String(p.grantee_id) === String(user.id));
        if (directPerm) {
          reasons.push(t('دسترسی مستقیم', 'Direct Access'));
        }

        const userRoleIds = userRoles.filter(m => String(m.user_id) === String(user.id)).map(m => String(m.role_id));
        const rolePerms = groupAccesses.filter(p => p.grantee_type?.toLowerCase() === 'role' && userRoleIds.includes(String(p.grantee_id)));

        rolePerms.forEach(rp => {
          const roleObj = roles.find(r => String(r.id) === String(rp.grantee_id));
          const rTitle = roleObj ? (roleObj.title || roleObj.code) : t('نقش سیستمی', 'System Role');
          reasons.push(`${t('ارث‌بری از نقش:', 'Inherited via Role:')} ${rTitle}`);
        });

        if (reasons.length > 0) {
          result.push({
            id: user.id,
            username: user.username || user.email || '---',
            full_name: user.full_name,
            sources: reasons
          });
        }
      });

      return result;
    }, [groupAccesses, accessViewMode, users, roles, userRoles, t]);

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

    const lovAccountColumns = [
      { field: 'structure_name', header_fa: 'نام ساختار', width: '140px' },
      { field: 'code', header_fa: 'کد حساب', width: '100px' },
      { 
        field: 'title_fa', 
        header_fa: 'عنوان حساب',
        width: 'auto',
        render: (val, row) => (
          <div className="flex flex-col my-0 py-0 leading-tight">
             <span className="font-medium text-slate-800 dark:text-slate-200">{val}</span>
             {row.fullPath && <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" dir="rtl">{row.fullPath}</span>}
          </div>
        )
      },
      { 
        field: 'is_active', 
        header_fa: 'وضعیت', 
        width: '90px', 
        render: (val) => (
          <Badge variant={val ? 'emerald' : 'slate'} size="sm" className="text-[10px]">
            {val ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}
          </Badge>
        )
      }
    ];

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
      { name: 'account_id', label: t('دارای حساب', 'Contains Account'), type: 'lov', lovData: leafAccounts, lovColumns: lovAccountColumns, dropdownWidth: 'min-w-[650px]' },
      { name: 'user_id', label: t('دسترسی کاربر', 'User Access'), type: 'lov', lovData: rawUsers, lovColumns: [{field: 'username', header_fa: 'نام کاربری'}, {field: 'full_name', header_fa: 'نام'}] },
      { name: 'role_id', label: t('دسترسی نقش', 'Role Access'), type: 'lov', lovData: roles, lovColumns: [{field: 'code', header_fa: 'کد نقش'}, {field: 'title', header_fa: 'عنوان نقش'}] }
    ];

    const accountColumns = [
      { 
        field: 'account', 
        header_fa: 'حساب', 
        header_en: 'Account', 
        width: 'auto', 
        render: (_, row) => {
          if (inlineAccountEdit?.id === row.id) {
             return (
               <div onClick={(e)=>e.stopPropagation()}>
                 <LOVField 
                   size="sm" 
                   data={leafAccounts} 
                   columns={lovAccountColumns} 
                   dropdownWidth="min-w-[650px]"
                   displayValue={inlineAccountEdit.data.account_obj ? `${inlineAccountEdit.data.account_obj.code} - ${inlineAccountEdit.data.account_obj.title_fa}` : ''}
                   onChange={(r) => setInlineAccountEdit(prev => ({...prev, data: {...prev.data, account_id: r?.id, account_obj: r}}))}
                 />
               </div>
             );
          }
          return (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">{row.fm_coa_accounts?.code}</span>
              <span className="text-slate-600 dark:text-slate-300">- {row.fm_coa_accounts?.title_fa}</span>
            </div>
          );
        }
      },
      { 
        field: 'valid_from', 
        header_fa: 'از تاریخ', 
        header_en: 'Valid From', 
        width: '140px', 
        render: (val, row) => {
          if (inlineAccountEdit?.id === row.id) {
             return <div onClick={(e)=>e.stopPropagation()}><DatePicker size="sm" value={inlineAccountEdit.data.valid_from} onChange={(v) => setInlineAccountEdit(prev => ({...prev, data: {...prev.data, valid_from: v}}))} isRtl={isRtl} /></div>
          }
          return <span className="text-[12px]" dir="ltr">{formatDate(val)}</span>;
        }
      },
      { 
        field: 'valid_to', 
        header_fa: 'تا تاریخ', 
        header_en: 'Valid To', 
        width: '140px', 
        render: (val, row) => {
          if (inlineAccountEdit?.id === row.id) {
             return <div onClick={(e)=>e.stopPropagation()}><DatePicker size="sm" value={inlineAccountEdit.data.valid_to} onChange={(v) => setInlineAccountEdit(prev => ({...prev, data: {...prev.data, valid_to: v}}))} isRtl={isRtl} /></div>
          }
          return val ? <span className="text-[12px]" dir="ltr">{formatDate(val)}</span> : <span className="text-[10px] text-slate-400">{t('تا کنون', 'Present')}</span>;
        } 
      },
      { 
        field: 'is_active', 
        header_fa: 'وضعیت', 
        header_en: 'Status', 
        width: '80px', 
        render: (val, row) => {
          if (inlineAccountEdit?.id === row.id) {
             return <div onClick={(e)=>e.stopPropagation()}><ToggleField size="sm" checked={inlineAccountEdit.data.is_active} onChange={v => setInlineAccountEdit(prev => ({...prev, data: {...prev.data, is_active: v}}))} isRtl={isRtl} /></div>
          }
          return <Badge variant={val ? 'emerald' : 'slate'} size="sm" className="text-[10px]">{val ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}</Badge>;
        }
      }
    ];

    const accountActions = [
      { 
        icon: Save, tooltip: t('ذخیره', 'Save'), 
        hidden: (row) => inlineAccountEdit?.id !== row.id, 
        onClick: (row) => handleSaveAccountInline(row), 
        className: '!text-emerald-600 hover:!text-emerald-800' 
      },
      { 
        icon: X, tooltip: t('انصراف', 'Cancel'), 
        hidden: (row) => inlineAccountEdit?.id !== row.id, 
        onClick: () => setInlineAccountEdit(null), 
        className: '!text-slate-500 hover:!text-slate-700' 
      },
      { 
        icon: Edit, tooltip: t('ویرایش', 'Edit'), 
        hidden: (row) => inlineAccountEdit?.id === row.id || row._isNew, 
        onClick: (row) => handleEditAccountClick(row),
        className: 'hover:text-indigo-600 text-slate-400' 
      },
      { 
        icon: Trash2, tooltip: t('حذف', 'Delete'), 
        hidden: (row) => inlineAccountEdit?.id === row.id || row._isNew, 
        onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'account', data: row }), 
        className: 'hover:text-red-600 text-slate-400' 
      }
    ];

    const accountBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', target: 'account', data: ids }) }
    ];

    const accessColumns = [
      { 
        field: 'grantee_type', 
        header_fa: 'نوع دسترسی', 
        header_en: 'Type', 
        width: '150px', 
        render: (val, row) => {
          if (inlineAccessEdit?.id === row.id) {
             return (
               <div onClick={(e)=>e.stopPropagation()}>
                 <SelectField 
                   size="sm" 
                   options={[{value:'USER', label:t('کاربر سیستم', 'User')}, {value:'ROLE', label:t('نقش سیستمی', 'Role')}]}
                   value={inlineAccessEdit.data.grantee_type} 
                   onChange={(e) => setInlineAccessEdit(prev => ({...prev, data: {...prev.data, grantee_type: e.target.value, grantee_id: '', grantee_obj: null}}))} 
                   isRtl={isRtl}
                 />
               </div>
             )
          }
          const normVal = val?.toLowerCase();
          return (
            <Badge variant={normVal === 'user' ? 'indigo' : 'emerald'} size="sm" className="text-[10px]">
              {normVal === 'user' ? t('کاربر', 'User') : t('نقش', 'Role')}
            </Badge>
          );
        }
      },
      { 
        field: 'grantee_id', 
        header_fa: 'شخص / نقش', 
        header_en: 'Grantee', 
        width: 'auto', 
        render: (val, row) => {
          if (inlineAccessEdit?.id === row.id) {
            const isUser = inlineAccessEdit.data.grantee_type?.toLowerCase() === 'user';
            return (
              <div onClick={(e)=>e.stopPropagation()}>
                <LOVField 
                  size="sm" 
                  data={isUser ? availableUsersForAccess : availableRolesForAccess} 
                  columns={isUser ? [{field:'username',header_fa:'نام کاربری'},{field:'full_name',header_fa:'نام'}] : [{field:'code',header_fa:'کد'},{field:'title',header_fa:'عنوان'}]}
                  displayValue={inlineAccessEdit.data.grantee_obj ? (isUser ? `${inlineAccessEdit.data.grantee_obj.full_name} (${inlineAccessEdit.data.grantee_obj.username})` : `${inlineAccessEdit.data.grantee_obj.title} (${inlineAccessEdit.data.grantee_obj.code})`) : ''}
                  onChange={(r) => setInlineAccessEdit(prev => ({...prev, data: {...prev.data, grantee_id: r?.id, grantee_obj: r}}))}
                />
              </div>
            )
          }
          if (row.grantee_type?.toLowerCase() === 'user') {
            const u = users.find(x => String(x.id) === String(val));
            return u ? `${u.full_name} (${u.username})` : t('نامشخص', 'Unknown');
          } else {
            const r = roles.find(x => String(x.id) === String(val));
            return r ? `${r.title} (${r.code})` : t('نامشخص', 'Unknown');
          }
        }
      }
    ];

    const accessActions = [
      { 
        icon: Save, tooltip: t('ذخیره', 'Save'), 
        hidden: (row) => inlineAccessEdit?.id !== row.id, 
        onClick: (row) => handleSaveAccessInline(row), 
        className: '!text-emerald-600 hover:!text-emerald-800' 
      },
      { 
        icon: X, tooltip: t('انصراف', 'Cancel'), 
        hidden: (row) => inlineAccessEdit?.id !== row.id, 
        onClick: () => setInlineAccessEdit(null), 
        className: '!text-slate-500 hover:!text-slate-700' 
      },
      { 
        icon: Trash2, tooltip: t('حذف', 'Delete'), 
        hidden: (row) => inlineAccessEdit?.id === row.id || row._isNew, 
        onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', target: 'access', data: row }), 
        className: 'hover:text-red-600 text-slate-400' 
      }
    ];

    const accessBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', target: 'access', data: ids }) }
    ];

    const aggregateColumns = [
      { 
        field: 'full_name', header_fa: 'نام و نام خانوادگی', width: '250px', 
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
               <Users size={14} />
            </div>
            <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{row.full_name}</span>
          </div>
        )
      },
      { 
        field: 'username', header_fa: 'نام کاربری', width: '150px', 
        render: (val) => <span className="text-[12px] text-slate-600 dark:text-slate-400" dir="ltr">{val}</span>
      },
      { 
        field: 'sources', header_fa: 'انواع دسترسی (نحوه ارث‌بری)', width: 'auto',
        render: (val) => (
          <div className="flex flex-wrap gap-1">
            {val.map((src, idx) => <Badge key={idx} variant="slate" size="sm" className="text-[10px] px-2 py-0.5">{src}</Badge>)}
          </div>
        )
      }
    ];

    const accessTabs = [
      { id: 'assign', label: t('تخصیص دسترسی', 'Access Assignment') },
      { id: 'aggregate', label: t('مشاهده تجمیع دسترسی‌ها', 'Aggregated Access View') }
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

        <Modal isOpen={isAccountsModalOpen} onClose={() => setIsAccountsModalOpen(false)} title={`${t('مدیریت حساب‌های مرتبط', 'Manage Accounts')} - ${selectedGroup?.title_fa || ''}`} width="max-w-6xl" language={language}>
          <div className="flex flex-col h-[70vh] min-h-[500px] bg-slate-50 dark:bg-slate-900 p-4 gap-3">
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
              <DataGrid 
                data={accountGridData} 
                columns={accountColumns} 
                actions={accountActions} 
                bulkActions={accountBulkActions}
                selectable={true}
                language={language} 
                isLoading={modalLoading} 
                hideImport={true}
                hideExport={true}
                onAdd={handleAddAccountClick}
              />
            </div>
          </div>
        </Modal>

        <Modal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} title={`${t('مدیریت دسترسی‌ها', 'Manage Access')} - ${selectedGroup?.title_fa || ''}`} width="max-w-4xl" language={language}>
          <div className="flex flex-col h-[70vh] min-h-[500px] bg-slate-50 dark:bg-slate-900 p-4 gap-3">
            <Tabs tabs={accessTabs} activeTab={accessViewMode} onChange={setAccessViewMode} className="shrink-0" />
            
            <div className="flex-1 flex flex-col min-h-0">
              {accessViewMode === 'assign' ? (
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                  <DataGrid 
                    key="grid-assign"
                    data={accessGridData} 
                    columns={accessColumns} 
                    actions={accessActions} 
                    bulkActions={accessBulkActions}
                    selectable={true}
                    language={language} 
                    isLoading={modalLoading}
                    hideImport={true}
                    hideExport={true}
                    onAdd={handleAddAccessClick}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                  <DataGrid 
                    key="grid-aggregate"
                    data={aggregatedUsersList} 
                    columns={aggregateColumns} 
                    language={language} 
                    isLoading={modalLoading}
                    hideImport={true}
                    hideExport={true}
                    hideToolbar={true}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>

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
