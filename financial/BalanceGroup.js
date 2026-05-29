import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseConfig';

const BalanceGroup = () => {
  const [groups, setGroups] = useState([]);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal States
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  // Form States
  const [currentGroup, setCurrentGroup] = useState({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupAccounts, setGroupAccounts] = useState([]);
  const [currentAccountMap, setCurrentAccountMap] = useState({ id: null, account_id: '', valid_from: '', valid_to: '', is_active: true });
  const [groupAccesses, setGroupAccesses] = useState([]);
  const [currentAccessMap, setCurrentAccessMap] = useState({ id: null, grantee_type: 'USER', grantee_id: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [groupsRes, accountsRes, usersRes, rolesRes] = await Promise.all([
        supabase.from('fm_balance_groups').select('*').order('created_at', { ascending: false }),
        supabase.from('fm_coa_accounts').select('id, code, title_fa').eq('is_active', true),
        supabase.schema('sec').from('users').select('id, full_name, username').eq('is_active', true),
        supabase.from('sec_roles').select('id, title, code').eq('is_active', true)
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setGroups(groupsRes.data || []);
      setCoaAccounts(accountsRes.data || []);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      showMessage('error', 'خطا در دریافت اطلاعات پایه: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Group CRUD ---
  const handleSaveGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (currentGroup.id) {
        const { error } = await supabase.from('fm_balance_groups')
          .update({
            code: currentGroup.code,
            title_fa: currentGroup.title_fa,
            title_en: currentGroup.title_en,
            description: currentGroup.description,
            is_active: currentGroup.is_active,
            updated_at: new Date().toISOString()
          }).eq('id', currentGroup.id);
        if (error) throw error;
        showMessage('success', 'گروه بالانس با موفقیت ویرایش شد.');
      } else {
        const { error } = await supabase.from('fm_balance_groups')
          .insert([{
            code: currentGroup.code,
            title_fa: currentGroup.title_fa,
            title_en: currentGroup.title_en,
            description: currentGroup.description,
            is_active: currentGroup.is_active
          }]);
        if (error) throw error;
        showMessage('success', 'گروه بالانس جدید با موفقیت ایجاد شد.');
      }
      setIsGroupModalOpen(false);
      fetchInitialData();
    } catch (error) {
      showMessage('error', 'خطا در ذخیره گروه: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('آیا از حذف این گروه اطمینان دارید؟')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('fm_balance_groups').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'گروه با موفقیت حذف شد.');
      fetchInitialData();
    } catch (error) {
      showMessage('error', 'خطا در حذف گروه: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Accounts Mapping CRUD ---
  const openAccountsModal = async (groupId) => {
    setSelectedGroupId(groupId);
    setCurrentAccountMap({ id: null, account_id: '', valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });
    await fetchGroupAccounts(groupId);
    setIsAccountModalOpen(true);
  };

  const fetchGroupAccounts = async (groupId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fm_balance_group_accounts')
        .select(`
          id, group_id, account_id, valid_from, valid_to, is_active,
          fm_coa_accounts ( code, title_fa )
        `)
        .eq('group_id', groupId)
        .order('valid_from', { ascending: false });
      if (error) throw error;
      setGroupAccounts(data || []);
    } catch (error) {
      showMessage('error', 'خطا در دریافت لیست حساب‌ها: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccountMap = async (e) => {
    e.preventDefault();
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
        const { error } = await supabase.from('fm_balance_group_accounts')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', currentAccountMap.id);
        if (error) throw error;
        showMessage('success', 'تنظیمات حساب با موفقیت ویرایش شد.');
      } else {
        const { error } = await supabase.from('fm_balance_group_accounts').insert([payload]);
        if (error) throw error;
        showMessage('success', 'حساب جدید با موفقیت به گروه افزوده شد.');
      }
      setCurrentAccountMap({ id: null, account_id: '', valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true });
      fetchGroupAccounts(selectedGroupId);
    } catch (error) {
      showMessage('error', 'خطا در ذخیره حساب: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccountMap = async (id) => {
    if (!window.confirm('آیا از حذف این حساب از گروه اطمینان دارید؟')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('fm_balance_group_accounts').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'حساب با موفقیت از گروه حذف شد.');
      fetchGroupAccounts(selectedGroupId);
    } catch (error) {
      showMessage('error', 'خطا در حذف حساب: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Access CRUD ---
  const openAccessModal = async (groupId) => {
    setSelectedGroupId(groupId);
    setCurrentAccessMap({ id: null, grantee_type: 'USER', grantee_id: '' });
    await fetchGroupAccess(groupId);
    setIsAccessModalOpen(true);
  };

  const fetchGroupAccess = async (groupId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fm_balance_group_access')
        .select('*')
        .eq('group_id', groupId);
      if (error) throw error;
      setGroupAccesses(data || []);
    } catch (error) {
      showMessage('error', 'خطا در دریافت لیست دسترسی‌ها: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccessMap = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        group_id: selectedGroupId,
        grantee_type: currentAccessMap.grantee_type,
        grantee_id: currentAccessMap.grantee_id
      };
      
      const { error } = await supabase.from('fm_balance_group_access').insert([payload]);
      if (error) throw error;
      
      showMessage('success', 'دسترسی با موفقیت ایجاد شد.');
      setCurrentAccessMap({ id: null, grantee_type: 'USER', grantee_id: '' });
      fetchGroupAccess(selectedGroupId);
    } catch (error) {
      showMessage('error', 'خطا در ثبت دسترسی: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccessMap = async (id) => {
    if (!window.confirm('آیا از حذف این دسترسی اطمینان دارید؟')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('fm_balance_group_access').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'دسترسی با موفقیت حذف شد.');
      fetchGroupAccess(selectedGroupId);
    } catch (error) {
      showMessage('error', 'خطا در حذف دسترسی: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getGranteeName = (type, id) => {
    if (type === 'USER') {
      const u = users.find(x => x.id === id);
      return u ? `${u.full_name} (${u.username})` : 'نامشخص';
    } else {
      const r = roles.find(x => x.id === id);
      return r ? `${r.title} (${r.code})` : 'نامشخص';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-right" dir="rtl">
      {message.text && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 text-white ${message.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">مدیریت گروه‌های بالانس</h1>
        <button 
          onClick={() => {
            setCurrentGroup({ id: null, code: '', title_fa: '', title_en: '', description: '', is_active: true });
            setIsGroupModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors"
        >
          + ایجاد گروه جدید
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">کد گروه</th>
                <th className="px-6 py-4">عنوان (فارسی)</th>
                <th className="px-6 py-4">عنوان (انگلیسی)</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{group.code}</td>
                  <td className="px-6 py-4">{group.title_fa}</td>
                  <td className="px-6 py-4">{group.title_en}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${group.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {group.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2 space-x-reverse">
                    <button onClick={() => { setCurrentGroup(group); setIsGroupModalOpen(true); }} className="text-blue-600 hover:text-blue-800 px-2">ویرایش</button>
                    <button onClick={() => openAccountsModal(group.id)} className="text-indigo-600 hover:text-indigo-800 px-2">حساب‌ها</button>
                    <button onClick={() => openAccessModal(group.id)} className="text-teal-600 hover:text-teal-800 px-2">دسترسی‌ها</button>
                    <button onClick={() => handleDeleteGroup(group.id)} className="text-red-600 hover:text-red-800 px-2">حذف</button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && !loading && (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">هیچ گروه بالانسی یافت نشد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Group Definition */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">{currentGroup.id ? 'ویرایش گروه بالانس' : 'ایجاد گروه بالانس'}</h2>
            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">کد گروه</label>
                <input required value={currentGroup.code} onChange={(e) => setCurrentGroup({...currentGroup, code: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان (فارسی)</label>
                <input required value={currentGroup.title_fa} onChange={(e) => setCurrentGroup({...currentGroup, title_fa: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان (انگلیسی)</label>
                <input value={currentGroup.title_en} onChange={(e) => setCurrentGroup({...currentGroup, title_en: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
                <textarea rows="3" value={currentGroup.description} onChange={(e) => setCurrentGroup({...currentGroup, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="isActiveGroup" checked={currentGroup.is_active} onChange={(e) => setCurrentGroup({...currentGroup, is_active: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="isActiveGroup" className="mr-2 text-sm text-gray-700">گروه فعال است</label>
              </div>
              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-5 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">انصراف</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{loading ? 'در حال ثبت...' : 'ذخیره'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Group Accounts */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">مدیریت حساب‌های گروه و سوابق</h2>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveAccountMap} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">انتخاب حساب</label>
                <select required value={currentAccountMap.account_id} onChange={(e) => setCurrentAccountMap({...currentAccountMap, account_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">-- انتخاب کنید --</option>
                  {coaAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.code} - {acc.title_fa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">از تاریخ (Valid From)</label>
                <input type="date" required value={currentAccountMap.valid_from} onChange={(e) => setCurrentAccountMap({...currentAccountMap, valid_from: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">تا تاریخ (Valid To)</label>
                <input type="date" value={currentAccountMap.valid_to} onChange={(e) => setCurrentAccountMap({...currentAccountMap, valid_to: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                  {currentAccountMap.id ? 'بروزرسانی حساب' : 'افزودن حساب'}
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-auto border rounded-xl">
              <table className="w-full text-sm text-right text-gray-600">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">کد حساب</th>
                    <th className="px-4 py-3">عنوان حساب</th>
                    <th className="px-4 py-3">از تاریخ</th>
                    <th className="px-4 py-3">تا تاریخ</th>
                    <th className="px-4 py-3">وضعیت</th>
                    <th className="px-4 py-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {groupAccounts.map((ga) => (
                    <tr key={ga.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{ga.fm_coa_accounts?.code}</td>
                      <td className="px-4 py-3">{ga.fm_coa_accounts?.title_fa}</td>
                      <td className="px-4 py-3" dir="ltr">{ga.valid_from}</td>
                      <td className="px-4 py-3" dir="ltr">{ga.valid_to || 'تا کنون'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${ga.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {ga.is_active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center space-x-2 space-x-reverse">
                        <button onClick={() => setCurrentAccountMap({ id: ga.id, account_id: ga.account_id, valid_from: ga.valid_from, valid_to: ga.valid_to || '', is_active: ga.is_active })} className="text-blue-600 hover:text-blue-800 text-xs px-2">ویرایش</button>
                        <button onClick={() => handleDeleteAccountMap(ga.id)} className="text-red-600 hover:text-red-800 text-xs px-2">حذف</button>
                      </td>
                    </tr>
                  ))}
                  {groupAccounts.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-6 text-gray-500">حسابی برای این گروه ثبت نشده است.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Group Access */}
      {isAccessModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">مدیریت دسترسی‌های گروه بالانس</h2>
              <button onClick={() => setIsAccessModalOpen(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveAccessMap} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">نوع دسترسی</label>
                <select required value={currentAccessMap.grantee_type} onChange={(e) => setCurrentAccessMap({...currentAccessMap, grantee_type: e.target.value, grantee_id: ''})} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="USER">کاربر خاص</option>
                  <option value="ROLE">نقش سیستمی</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">انتخاب شخص/نقش</label>
                <select required value={currentAccessMap.grantee_id} onChange={(e) => setCurrentAccessMap({...currentAccessMap, grantee_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">-- انتخاب کنید --</option>
                  {currentAccessMap.grantee_type === 'USER' 
                    ? users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>)
                    : roles.map(r => <option key={r.id} value={r.id}>{r.title} ({r.code})</option>)
                  }
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
                  تخصیص دسترسی
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-auto border rounded-xl">
              <table className="w-full text-sm text-right text-gray-600">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">نوع دسترسی</th>
                    <th className="px-4 py-3">نام شخص / عنوان نقش</th>
                    <th className="px-4 py-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {groupAccesses.map((acc) => (
                    <tr key={acc.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {acc.grantee_type === 'USER' ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">کاربر</span>
                        ) : (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">نقش</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getGranteeName(acc.grantee_type, acc.grantee_id)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDeleteAccessMap(acc.id)} className="text-red-600 hover:text-red-800 text-xs px-2">حذف دسترسی</button>
                      </td>
                    </tr>
                  ))}
                  {groupAccesses.length === 0 && (
                    <tr><td colSpan="3" className="text-center py-6 text-gray-500">هیچ دسترسی برای این گروه تعریف نشده است.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BalanceGroup;