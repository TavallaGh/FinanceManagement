/* Filename: financial/BalanceGroup.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback } = React;

  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    Edit = FallbackIcon, Trash2 = FallbackIcon, Users = FallbackIcon, 
    List = FallbackIcon, Plus = FallbackIcon, Save = FallbackIcon,
    X = FallbackIcon
  } = LucideIcons;

  const DesignSystem = window.DesignSystem || window.DSCore || {};
  const { 
      Modal = () => null, 
      Button = () => null,
      DataGrid = () => null
  } = DesignSystem;

  const supabase = window.supabase;

  const BalanceGroup = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState([]);
    const [coaAccounts, setCoaAccounts] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

    const [currentGroup, setCurrentGroup] = useState({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
    const [selectedGroupId, setSelectedGroupId] = useState(null);

    const [groupAccounts, setGroupAccounts] = useState([]);
    const [currentAccountMap, setCurrentAccountMap] = useState({ id: null, account_id: '', valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });

    const [groupAccesses, setGroupAccesses] = useState([]);
    const [currentAccessMap, setCurrentAccessMap] = useState({ id: null, grantee_type: 'USER', grantee_id: '' });

    useEffect(() => {
      fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [groupsRes, accountsRes, usersRes, rolesRes] = await Promise.all([
          supabase.from('fm_balance_groups').select('*').order('created_at', { ascending: false }),
          supabase.from('fm_coa_accounts').select('id, code, title_fa').eq('is_active', true),
          supabase.from('sec_users').select('id, full_name, username').eq('is_active', true),
          supabase.from('sec_roles').select('id, title, code').eq('is_active', true)
        ]);

        setGroups(groupsRes.data || []);
        setCoaAccounts(accountsRes.data || []);
        setUsers(usersRes.data || []);
        setRoles(rolesRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const handleSaveGroup = async (e) => {
      if (e) e.preventDefault();
      setLoading(true);
      try {
        if (currentGroup.id) {
          await supabase.from('fm_balance_groups')
            .update({
              code: currentGroup.code,
              title_fa: currentGroup.title_fa,
              title_en: currentGroup.title_en,
              description: currentGroup.description,
              is_active: currentGroup.is_active,
              updated_at: new Date().toISOString()
            }).eq('id', currentGroup.id);
        } else {
          await supabase.from('fm_balance_groups')
            .insert([{
              code: currentGroup.code,
              title_fa: currentGroup.title_fa,
              title_en: currentGroup.title_en,
              description: currentGroup.description,
              is_active: currentGroup.is_active
            }]);
        }
        setIsGroupModalOpen(false);
        fetchInitialData();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const handleDeleteGroup = async (id) => {
      if (!window.confirm(t('آیا از حذف این گروه اطمینان دارید؟', 'Are you sure you want to delete this group?'))) return;
      setLoading(true);
      try {
        await supabase.from('fm_balance_groups').delete().eq('id', id);
        fetchInitialData();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const openAccountsModal = async (groupId) => {
      setSelectedGroupId(groupId);
      setCurrentAccountMap({ id: null, account_id: '', valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });
      await fetchGroupAccounts(groupId);
      setIsAccountModalOpen(true);
    };

    const fetchGroupAccounts = async (groupId) => {
      setLoading(true);
      try {
        const { data } = await supabase.from('fm_balance_group_accounts')
          .select(`id, group_id, account_id, valid_from, valid_to, is_active, fm_coa_accounts ( code, title_fa )`)
          .eq('group_id', groupId)
          .order('valid_from', { ascending: false });
        setGroupAccounts(data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const handleSaveAccountMap = async () => {
      setLoading(true);
      try {
        const payload = {
          group_id: selectedGroupId,
          account_id: currentAccountMap.account_id,
          valid_from: currentAccountMap.valid_from,
          valid_to: currentAccountMap.valid_to || null,
          is_active: currentAccountMap.is_active
        };

        if (currentAccountMap.id) {
          await supabase.from('fm_balance_group_accounts')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', currentAccountMap.id);
        } else {
          await supabase.from('fm_balance_group_accounts').insert([payload]);
        }
        setCurrentAccountMap({ id: null, account_id: '', valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });
        fetchGroupAccounts(selectedGroupId);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const handleDeleteAccountMap = async (id) => {
      if (!window.confirm(t('آیا از حذف این حساب از گروه اطمینان دارید؟', 'Are you sure you want to delete this account from group?'))) return;
      setLoading(true);
      try {
        await supabase.from('fm_balance_group_accounts').delete().eq('id', id);
        fetchGroupAccounts(selectedGroupId);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const openAccessModal = async (groupId) => {
      setSelectedGroupId(groupId);
      setCurrentAccessMap({ id: null, grantee_type: 'USER', grantee_id: '' });
      await fetchGroupAccess(groupId);
      setIsAccessModalOpen(true);
    };

    const fetchGroupAccess = async (groupId) => {
      setLoading(true);
      try {
        const { data } = await supabase.from('fm_balance_group_access').select('*').eq('group_id', groupId);
        setGroupAccesses(data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const handleSaveAccessMap = async () => {
      setLoading(true);
      try {
        const payload = {
          group_id: selectedGroupId,
          grantee_type: currentAccessMap.grantee_type,
          grantee_id: currentAccessMap.grantee_id
        };
        await supabase.from('fm_balance_group_access').insert([payload]);
        setCurrentAccessMap({ id: null, grantee_type: 'USER', grantee_id: '' });
        fetchGroupAccess(selectedGroupId);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const handleDeleteAccessMap = async (id) => {
      if (!window.confirm(t('آیا از حذف این دسترسی اطمینان دارید؟', 'Are you sure you want to delete this access?'))) return;
      setLoading(true);
      try {
        await supabase.from('fm_balance_group_access').delete().eq('id', id);
        fetchGroupAccess(selectedGroupId);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const getGranteeName = (type, id) => {
      if (type === 'USER') {
        const u = users.find(x => x.id === id);
        return u ? `${u.full_name} (${u.username})` : t('نامشخص', 'Unknown');
      } else {
        const r = roles.find(x => x.id === id);
        return r ? `${r.title} (${r.code})` : t('نامشخص', 'Unknown');
      }
    };

    const groupColumns = [
      { field: 'code', header_fa: 'کد گروه', header_en: 'Group Code', width: '150px', render: (val) => <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span> },
      { field: 'title_fa', header_fa: 'عنوان (فارسی)', header_en: 'Title (FA)', width: 'auto' },
      { field: 'title_en', header_fa: 'عنوان (انگلیسی)', header_en: 'Title (EN)', width: 'auto' },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '100px', render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${val ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {val ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}
        </span>
      )}
    ];

    const groupActions = [
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => { setCurrentGroup(row); setIsGroupModalOpen(true); }, className: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800' },
      { icon: List, tooltip: t('حساب‌ها', 'Accounts'), onClick: (row) => openAccountsModal(row.id), className: 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800' },
      { icon: Users, tooltip: t('دسترسی‌ها', 'Access'), onClick: (row) => openAccessModal(row.id), className: 'text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-slate-800' },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => handleDeleteGroup(row.id), className: 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800' }
    ];

    const accountColumns = [
      { field: 'code', header_fa: 'کد حساب', header_en: 'Account Code', width: '150px', render: (_, row) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.fm_coa_accounts?.code}</span> },
      { field: 'title', header_fa: 'عنوان حساب', header_en: 'Account Title', width: 'auto', render: (_, row) => row.fm_coa_accounts?.title_fa },
      { field: 'valid_from', header_fa: 'از تاریخ', header_en: 'Valid From', width: '120px' },
      { field: 'valid_to', header_fa: 'تا تاریخ', header_en: 'Valid To', width: '120px', render: (val) => val || t('تا کنون', 'Present') },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '100px', render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${val ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {val ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}
        </span>
      )}
    ];

    const accountActions = [
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => setCurrentAccountMap({ id: row.id, account_id: row.account_id, valid_from: row.valid_from, valid_to: row.valid_to || '', is_active: row.is_active }), className: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800' },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => handleDeleteAccountMap(row.id), className: 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800' }
    ];

    const accessColumns = [
      { field: 'grantee_type', header_fa: 'نوع دسترسی', header_en: 'Type', width: '120px', render: (val) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold ${val === 'USER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'}`}>
          {val === 'USER' ? t('کاربر', 'User') : t('نقش', 'Role')}
        </span>
      )},
      { field: 'grantee_id', header_fa: 'شخص / نقش', header_en: 'Grantee', width: 'auto', render: (val, row) => getGranteeName(row.grantee_type, val) }
    ];

    const accessActions = [
      { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => handleDeleteAccessMap(row.id), className: 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800' }
    ];

    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 font-sans">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h1 className="text-lg font-black text-slate-800 dark:text-slate-100">{t('مدیریت گروه‌های بالانس', 'Balance Groups Management')}</h1>
          <Button variant="primary" icon={Plus} onClick={() => { setCurrentGroup({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true }); setIsGroupModalOpen(true); }}>
            {t('ایجاد گروه جدید', 'Create New Group')}
          </Button>
        </div>

        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <DataGrid data={groups} columns={groupColumns} actions={groupActions} language={language} />
        </div>

        {isGroupModalOpen && (
          <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={currentGroup.id ? t('ویرایش گروه بالانس', 'Edit Balance Group') : t('ایجاد گروه بالانس', 'Create Balance Group')} width="max-w-md" language={language}>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('کد گروه', 'Group Code')}</label>
                <input value={currentGroup.code} onChange={(e) => setCurrentGroup({...currentGroup, code: e.target.value})} className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('عنوان (فارسی)', 'Title (FA)')}</label>
                <input value={currentGroup.title_fa} onChange={(e) => setCurrentGroup({...currentGroup, title_fa: e.target.value})} className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('عنوان (انگلیسی)', 'Title (EN)')}</label>
                <input value={currentGroup.title_en} onChange={(e) => setCurrentGroup({...currentGroup, title_en: e.target.value})} className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('توضیحات', 'Description')}</label>
                <textarea value={currentGroup.description} onChange={(e) => setCurrentGroup({...currentGroup, description: e.target.value})} rows="3" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input type="checkbox" checked={currentGroup.is_active} onChange={(e) => setCurrentGroup({...currentGroup, is_active: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{t('گروه فعال است', 'Group is active')}</span>
              </label>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" icon={Save} onClick={handleSaveGroup} isLoading={loading}>{t('ذخیره', 'Save')}</Button>
            </div>
          </Modal>
        )}

        {isAccountModalOpen && (
          <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title={t('مدیریت حساب‌های گروه و سوابق', 'Group Accounts & History')} width="max-w-4xl" language={language}>
            <div className="flex flex-col h-[600px] bg-slate-50 dark:bg-slate-900">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('انتخاب حساب', 'Select Account')}</label>
                  <select value={currentAccountMap.account_id} onChange={(e) => setCurrentAccountMap({...currentAccountMap, account_id: e.target.value})} className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">{t('-- انتخاب کنید --', '-- Select --')}</option>
                    {coaAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.title_fa}</option>)}
                  </select>
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('از تاریخ (Valid From)', 'Valid From')}</label>
                  <input type="date" value={currentAccountMap.valid_from} onChange={(e) => setCurrentAccountMap({...currentAccountMap, valid_from: e.target.value})} className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('تا تاریخ (Valid To)', 'Valid To')}</label>
                  <input type="date" value={currentAccountMap.valid_to} onChange={(e) => setCurrentAccountMap({...currentAccountMap, valid_to: e.target.value})} className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="w-full md:w-auto flex gap-2 items-center">
                  <label className="flex items-center gap-1.5 cursor-pointer h-9 px-2">
                    <input type="checkbox" checked={currentAccountMap.is_active} onChange={(e) => setCurrentAccountMap({...currentAccountMap, is_active: e.target.checked})} className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{t('فعال', 'Active')}</span>
                  </label>
                  <Button variant="primary" icon={currentAccountMap.id ? Save : Plus} onClick={handleSaveAccountMap} disabled={!currentAccountMap.account_id || !currentAccountMap.valid_from} isLoading={loading}>
                    {currentAccountMap.id ? t('بروزرسانی', 'Update') : t('افزودن', 'Add')}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <div className="h-full border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 flex flex-col">
                  <DataGrid data={groupAccounts} columns={accountColumns} actions={accountActions} language={language} />
                </div>
              </div>
            </div>
          </Modal>
        )}

        {isAccessModalOpen && (
          <Modal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} title={t('مدیریت دسترسی‌های گروه بالانس', 'Balance Group Access Management')} width="max-w-3xl" language={language}>
            <div className="flex flex-col h-[500px] bg-slate-50 dark:bg-slate-900">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 flex flex-col md:flex-row gap-3 items-end">
                <div className="w-full md:w-1/3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('نوع دسترسی', 'Access Type')}</label>
                  <select value={currentAccessMap.grantee_type} onChange={(e) => setCurrentAccessMap({...currentAccessMap, grantee_type: e.target.value, grantee_id: ''})} className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="USER">{t('کاربر خاص', 'Specific User')}</option>
                    <option value="ROLE">{t('نقش سیستمی', 'System Role')}</option>
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{t('انتخاب شخص/نقش', 'Select Grantee')}</label>
                  <select value={currentAccessMap.grantee_id} onChange={(e) => setCurrentAccessMap({...currentAccessMap, grantee_id: e.target.value})} className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">{t('-- انتخاب کنید --', '-- Select --')}</option>
                    {currentAccessMap.grantee_type === 'USER' 
                      ? users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>)
                      : roles.map(r => <option key={r.id} value={r.id}>{r.title} ({r.code})</option>)
                    }
                  </select>
                </div>
                <div className="w-full md:w-auto">
                  <Button variant="primary" icon={Plus} onClick={handleSaveAccessMap} disabled={!currentAccessMap.grantee_id} isLoading={loading} className="bg-teal-600 hover:bg-teal-700 border-teal-600">
                    {t('تخصیص دسترسی', 'Assign Access')}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <div className="h-full border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 flex flex-col">
                  <DataGrid data={groupAccesses} columns={accessColumns} actions={accessActions} language={language} />
                </div>
              </div>
            </div>
          </Modal>
        )}

      </div>
    );
  };

  window.BalanceGroup = BalanceGroup;
})();