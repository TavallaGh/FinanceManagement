/* Filename: financial/BalanceGroup.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Scale = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon, List = FallbackIcon, Shield = FallbackIcon,
    Save = FallbackIcon, AlertTriangle = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Button = DS.Button || window.DSCore?.Button || (() => null);
  const PageHeader = DS.PageHeader || window.DSCore?.PageHeader || (() => null);
  const Modal = DS.Modal || window.DSFeedback?.Modal || window.DSCore?.Modal || (() => null);
  const DataGrid = DS.DataGrid || window.DSGrid?.DataGrid || (() => null);
  const AdvancedFilter = DS.AdvancedFilter || window.DSGrid?.AdvancedFilter || (() => null);
  const TextField = DS.TextField || window.DSForms?.TextField || (() => null);
  const ToggleField = DS.ToggleField || window.DSForms?.ToggleField || (() => null);
  const EmptyState = DS.EmptyState || window.DSCore?.EmptyState || (() => null);

  const supabase = window.supabase;

  const BalanceGroup = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const [loading, setLoading] = useState(false);
    
    // Master Data
    const [groups, setGroups] = useState([]);
    const [coaAccounts, setCoaAccounts] = useState([]);
    const [rawUsers, setRawUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [userRoles, setUserRoles] = useState([]);
    const [charts, setCharts] = useState([]);
    const [parties, setParties] = useState([]);
    const [currencies, setCurrencies] = useState([]);

    // Grid & Filter State
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);

    // Modal States
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    
    // Details Modal State (Passed to BalanceGroupDetails.js)
    const [detailsConfig, setDetailsConfig] = useState({ isOpen: false, type: null, group: null });

    // Current Group
    const [currentGroup, setCurrentGroup] = useState({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });

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
        const [groupsRes, accountsRes, usersRes, rolesRes, userRolesRes, chartsRes, partiesRes, currenciesRes] = await Promise.all([
          supabase.from('fm_balance_groups')
            .select('*, accounts:fm_balance_group_accounts(id, account_id), access:fm_balance_group_access(grantee_type, grantee_id)')
            .order('created_at', { ascending: false }),
          supabase.from('fm_coa_accounts').select('id, code, title_fa, currency_id, parent_id, is_active, chart_id'),
          supabase.from('sec_users').select('*'),
          supabase.from('sec_roles').select('id, title, code'),
          supabase.from('sec_user_roles').select('user_id, role_id'),
          supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type'),
          supabase.from('fm_currencies').select('id, code')
        ]);

        if (groupsRes.error) throw groupsRes.error;
        
        setGroups(groupsRes.data || []);
        setCoaAccounts(accountsRes.data || []);
        setRawUsers(usersRes.data || []);
        setRoles(rolesRes.data || []);
        setUserRoles(userRolesRes.data || []);
        setCharts(chartsRes.data || []);
        setParties(partiesRes.data || []);
        setCurrencies(currenciesRes.data || []);
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
        return { ...user, full_name: fNameStr };
      });
    }, [rawUsers, parties]);

    const leafAccounts = useMemo(() => {
      if (!coaAccounts.length) return [];
      const accMap = new Map(coaAccounts.map(a => [a.id, a]));
      const chartsMap = new Map(charts.map(c => [String(c.id), c.title]));
      const isEffectivelyActive = (acc) => {
        if (!acc.is_active) return false;
        if (!acc.parent_id) return true;
        const parent = accMap.get(acc.parent_id);
        return parent ? isEffectivelyActive(parent) : true;
      };
      const parentIds = new Set(coaAccounts.map(a => a.parent_id).filter(Boolean));
      const leaves = coaAccounts.filter(a =>
        !parentIds.has(a.id) &&
        chartsMap.has(String(a.chart_id)) &&
        isEffectivelyActive(a)
      );
      
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
          displayLabel: `${leaf.code} - ${leaf.title_fa}`,
          currency_code: currencies.find(c => c.id === leaf.currency_id)?.code || ''
        };
      }).sort((a, b) => a.code.localeCompare(b.code));
    }, [coaAccounts, charts, currencies]);

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

    const openGroupForm = async (group = null) => {
      if (group) {
        setCurrentGroup(group);
      } else {
        let nextCode = '';
        if (window.AutoNumberingService) {
          try {
            const preview = await window.AutoNumberingService.previewNext('BALANCE_GROUP');
            nextCode = typeof preview === 'string' ? preview : (preview?.formattedCode || '');
          } catch (err) {
            console.error('AutoNumbering Error:', err);
          }
        }
        setCurrentGroup({ id: null, code: nextCode, title_fa: '', title_en: '', description: '', is_active: true });
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
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('BALANCE_GROUP'); } catch (err) { console.error('AutoNumbering consume error:', err); }
          }
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

    const executeDelete = async () => {
      setLoading(true);
      try {
        const { type, data } = deleteConfirm;
        if (type === 'single') {
          const { error } = await supabase.from('fm_balance_groups').delete().eq('id', data.id);
          if (error) throw error;
        } else if (type === 'bulk') {
          const { error } = await supabase.from('fm_balance_groups').delete().in('id', data);
          if (error) throw error;
        }

        setDeleteConfirm({ isOpen: false, type: null, data: null });
        fetchInitialData();
      } catch (err) {
        console.error("Delete error:", err);
      } finally {
        setLoading(false);
      }
    };

    const lovAccountColumns = [
      { field: 'structure_name', header_fa: 'نام ساختار', width: '80px' },
      { field: 'code', header_fa: 'کد حساب', width: '80px' },
      { 
        field: 'title_fa', 
        header_fa: 'عنوان حساب',
        width: '240px',
        render: (val, row) => (
          <div className="flex flex-col my-0 py-0 leading-tight">
             <span className="font-medium text-slate-800 dark:text-slate-200">{val}</span>
             {row.fullPath && <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" dir="rtl">{row.fullPath}</span>}
          </div>
        )
      },
      { field: 'currency_code', header_fa: 'ارز', width: '60px' }
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
        onClick: (row) => setDetailsConfig({ isOpen: true, type: 'accounts', group: row }), 
        className: (row) => row.accounts && row.accounts.length > 0 ? '!text-indigo-600 dark:!text-indigo-400 hover:!text-indigo-800' : 'hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400'
      },
      { 
        icon: Shield, 
        tooltip: t('مدیریت دسترسی‌ها', 'Manage Access'), 
        onClick: (row) => setDetailsConfig({ isOpen: true, type: 'access', group: row }), 
        className: (row) => row.access && row.access.length > 0 ? '!text-teal-600 dark:!text-teal-400 hover:!text-teal-800' : 'hover:text-teal-600 dark:hover:text-teal-400 text-slate-400'
      },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'hover:text-red-600 dark:hover:text-red-400 text-slate-400' }
    ];

    const groupBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
    ];

    const filterFields = [
      { name: 'account_id', label: t('دارای حساب', 'Contains Account'), type: 'lov', lovData: leafAccounts, lovColumns: lovAccountColumns, dropdownWidth: 'min-w-[470px] max-w-[470px]' },
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
              hideImport={true}
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

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk' 
              ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
              : t(`آیا از حذف این مورد اطمینان دارید؟`, `Are you sure you want to delete this item?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={loading} className="flex-1">{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>

        {window.BalanceGroupDetails && (
          <window.BalanceGroupDetails 
             config={detailsConfig}
             onClose={() => {
                setDetailsConfig({ isOpen: false, type: null, group: null });
                fetchInitialData();
             }}
             lookups={{ leafAccounts, users, roles, userRoles, lovAccountColumns }}
             language={language}
          />
        )}
      </div>
    );
  };

  window.BalanceGroup = BalanceGroup;
})();