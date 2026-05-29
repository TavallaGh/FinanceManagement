/* Filename: financial/ChartOfAccountsAccess.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Trash2 = FallbackIcon, Save = FallbackIcon, AlertTriangle = FallbackIcon, Lock = FallbackIcon,
    Shield = FallbackIcon, X = FallbackIcon, Edit = FallbackIcon, Users = FallbackIcon, Scale = FallbackIcon
  } = LucideIcons;

  const Core = window.DSCore || window.DesignSystem || {};
  const { Button = () => null, Badge = () => null } = Core;

  const Forms = window.DSForms || window.DesignSystem || {};
  const { SelectField = () => null, ToggleField = () => null, DatePicker = () => null } = Forms;

  const Grid = window.DSGrid || window.DesignSystem || {};
  const { DataGrid = () => null, LOVField = () => null } = Grid;

  const Feedback = window.DSFeedback || window.DesignSystem || {};
  const { Modal = () => null, Alert = () => null } = Feedback;

  const supabase = window.supabase;

  const ChartOfAccountsAccess = ({ 
    selectedNodeId, activeTab, language = 'fa', 
    lookups = { systemUsers: [], systemRoles: [], userRolesMapping: [], systemParties: [], balanceGroupsMaster: [] }
  }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const globalMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';
    const formatGlobalDate = window.DSCore?.formatGlobalDate || ((v) => v);

    const { systemUsers, systemRoles, userRolesMapping, systemParties, balanceGroupsMaster } = lookups;

    const [accessViewMode, setAccessViewMode] = useState('assign');
    const [isLoading, setIsLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    const [accountPermissions, setAccountPermissions] = useState([]);
    const [inlinePermEdit, setInlinePermEdit] = useState(null);

    const [accountBalanceGroups, setAccountBalanceGroups] = useState([]);
    const [inlineBgEdit, setInlineBgEdit] = useState(null);
    const [bgAccessModal, setBgAccessModal] = useState({ isOpen: false, groupTitle: '', data: [] });

    const showToast = useCallback((message, type = 'success') => {
        if (window.DSFeedback && window.DSFeedback.toast) {
            window.DSFeedback.toast[type === 'error' ? 'error' : 'success'](message);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }, []);

    const fetchNodePermissions = useCallback(async () => {
      if (!selectedNodeId) {
          setAccountPermissions([]);
          return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('fm_coa_permissions').select('*').eq('account_id', selectedNodeId);
        if (error) throw error;
        setAccountPermissions(data || []);
      } catch (err) {
        showToast(t('خطا در دریافت دسترسی‌ها', 'Error fetching permissions'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [selectedNodeId, supabase, showToast, t]);

    const fetchNodeBalanceGroups = useCallback(async () => {
      if (!selectedNodeId) {
          setAccountBalanceGroups([]);
          return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('fm_balance_group_accounts')
            .select(`id, group_id, account_id, valid_from, valid_to, is_active, fm_balance_groups ( code, title_fa )`)
            .eq('account_id', selectedNodeId)
            .order('valid_from', { ascending: false });
        if (error) throw error;
        setAccountBalanceGroups(data || []);
      } catch (err) {
        showToast(t('خطا در دریافت گروه‌های بالانس', 'Error fetching balance groups'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [selectedNodeId, supabase, showToast, t]);

    useEffect(() => {
        fetchNodePermissions();
        fetchNodeBalanceGroups();
        setInlinePermEdit(null);
        setInlineBgEdit(null);
    }, [fetchNodePermissions, fetchNodeBalanceGroups, selectedNodeId]);

    const handleSavePermInline = async () => {
      const form = inlinePermEdit.data;
      if (!form.grantee_id || !selectedNodeId) return;

      if (inlinePermEdit.id === 'new' && accountPermissions.some(p => p.grantee_type === form.grantee_type && String(p.grantee_id) === String(form.grantee_id))) {
        return showToast(t('این دسترسی قبلاً ثبت شده است', 'Permission already assigned'), 'error');
      }

      setIsLoading(true);
      try {
        const payload = {
          account_id: selectedNodeId,
          grantee_type: form.grantee_type,
          grantee_id: form.grantee_id,
          access_level: form.access_level
        };

        if (inlinePermEdit.id === 'new') {
          const { error } = await supabase.from('fm_coa_permissions').insert([payload]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_coa_permissions').update(payload).eq('id', inlinePermEdit.id);
          if (error) throw error;
        }

        await fetchNodePermissions();
        setInlinePermEdit(null);
        showToast(t('دسترسی با موفقیت ذخیره شد', 'Permission saved'));
      } catch (err) {
        showToast(t('خطا در ذخیره دسترسی', 'Error saving permission'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddBgClick = () => {
        if (inlineBgEdit) return;
        setInlineBgEdit({
            id: 'new',
            data: { group_id: '', group_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true }
        });
    };

    const handleSaveBgInline = async () => {
      const form = inlineBgEdit.data;
      if (!form.group_id || !selectedNodeId) return;

      if (inlineBgEdit.id === 'new' && accountBalanceGroups.some(g => String(g.group_id) === String(form.group_id))) {
          return showToast(t('این گروه بالانس قبلاً تخصیص داده شده است.', 'This balance group is already assigned.'), 'error');
      }

      setIsLoading(true);
      try {
          const payload = {
              account_id: selectedNodeId,
              group_id: form.group_id,
              valid_from: form.valid_from || null,
              valid_to: form.valid_to || null,
              is_active: form.is_active !== false
          };

          if (inlineBgEdit.id === 'new') {
              const { error } = await supabase.from('fm_balance_group_accounts').insert([payload]);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('fm_balance_group_accounts').update(payload).eq('id', inlineBgEdit.id);
              if (error) throw error;
          }

          await fetchNodeBalanceGroups();
          setInlineBgEdit(null);
          showToast(t('تخصیص گروه بالانس با موفقیت ذخیره شد.', 'Balance group assignment saved.'));
      } catch (err) {
          showToast(t('خطا در ذخیره تخصیص بالانس', 'Error saving balance group'), 'error');
      } finally {
          setIsLoading(false);
      }
    };

    const fetchBgAccessAndOpenModal = async (row) => {
      setIsLoading(true);
      try {
          const { data, error } = await supabase.from('fm_balance_group_access').select('*').eq('group_id', row.group_id || row.data?.group_id);
          if (error) throw error;

          const result = [];
          systemUsers.forEach(user => {
              const reasons = [];
              const directPerm = data.find(p => p.grantee_type?.toLowerCase() === 'user' && String(p.grantee_id) === String(user.id));
              if (directPerm) reasons.push(t('دسترسی مستقیم', 'Direct Access'));

              const uRoleIds = userRolesMapping.filter(m => String(m.user_id) === String(user.id)).map(m => String(m.role_id));
              const rolePerms = data.filter(p => p.grantee_type?.toLowerCase() === 'role' && uRoleIds.includes(String(p.grantee_id)));

              rolePerms.forEach(rp => {
                  const roleObj = systemRoles.find(r => String(r.id) === String(rp.grantee_id));
                  const rTitle = roleObj ? (roleObj.title || roleObj.code) : t('نقش سیستمی', 'System Role');
                  reasons.push(`${t('ارث‌بری از نقش:', 'Inherited via Role:')} ${rTitle}`);
              });

              if (reasons.length > 0) {
                  const userParty = systemParties.find(p => String(p.id) === String(user.party_id || user.person_id));
                  let fNameStr = '';
                  if (userParty) {
                      fNameStr = userParty.party_type === 'legal' && userParty.company_name ? userParty.company_name : `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
                  }
                  if (!fNameStr) fNameStr = (user.first_name || user.last_name) ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : (user.username || '');

                  result.push({
                      id: user.id,
                      username: user.username || user.email || '---',
                      fullName: fNameStr,
                      reason: reasons.join(' / ')
                  });
              }
          });

          setBgAccessModal({ isOpen: true, groupTitle: row.fm_balance_groups?.title_fa || row.data?.group_obj?.title_fa || t('گروه بالانس', 'Balance Group'), data: result });
      } catch(e) {
          showToast(t('خطا در دریافت دسترسی‌های گروه بالانس', 'Error fetching BG access'), 'error');
      } finally {
          setIsLoading(false);
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'permission') {
          const { error } = await supabase.from('fm_coa_permissions').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await fetchNodePermissions();
        } else if (deleteConfirm.type === 'bg_account') {
          const { error } = await supabase.from('fm_balance_group_accounts').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await fetchNodeBalanceGroups();
        }
        showToast(t('رکورد با موفقیت حذف شد', 'Deleted successfully'));
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        showToast(t('خطا در حذف اطلاعات', 'Deletion error'), 'error');
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } finally {
        setIsLoading(false);
      }
    };

    const consolidatedUsersList = useMemo(() => {
      if (!selectedNodeId) return [];
      const result = [];
      systemUsers.forEach(user => {
        let maxAccess = null;
        const reasons = [];

        const directPerm = accountPermissions.find(p => p.grantee_type === 'user' && String(p.grantee_id) === String(user.id));
        if (directPerm) {
          maxAccess = directPerm.access_level;
          reasons.push(t('دسترسی مستقیم', 'Direct Access'));
        }

        const userRoles = userRolesMapping.filter(m => String(m.user_id) === String(user.id)).map(m => String(m.role_id));
        const rolePerms = accountPermissions.filter(p => p.grantee_type === 'role' && userRoles.includes(String(p.grantee_id)));

        rolePerms.forEach(rp => {
          const roleObj = systemRoles.find(r => String(r.id) === String(rp.grantee_id));
          const rTitle = roleObj ? (roleObj.title || roleObj.name) : t('نقش سیستم', 'System Role');
          reasons.push(`${t('ارث‌بری از نقش:', 'Inherited via Role:')} ${rTitle}`);
          if (!maxAccess || (maxAccess === 'view' && rp.access_level === 'full')) maxAccess = rp.access_level;
        });

        if (maxAccess) {
          const userParty = systemParties.find(p => String(p.id) === String(user.party_id || user.person_id));
          let fNameStr = '';
          if (userParty) fNameStr = userParty.party_type === 'legal' && userParty.company_name ? userParty.company_name : `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
          if (!fNameStr) fNameStr = (user.first_name || user.last_name) ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : (user.name || '');
          
          result.push({
            id: user.id, username: user.username || user.name || user.email || '---',
            fullName: fNameStr, accessLevel: maxAccess, reason: reasons.join(' / ')
          });
        }
      });
      return result;
    }, [selectedNodeId, systemUsers, accountPermissions, userRolesMapping, systemRoles, systemParties, t]);

    const permGridData = useMemo(() => {
       const data = [...accountPermissions];
       if (inlinePermEdit && inlinePermEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlinePermEdit.data });
       return data;
    }, [accountPermissions, inlinePermEdit]);

    const bgGridData = useMemo(() => {
       const data = [...accountBalanceGroups];
       if (inlineBgEdit && inlineBgEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineBgEdit.data });
       return data;
    }, [accountBalanceGroups, inlineBgEdit]);

    const availableUsersForAccess = useMemo(() => {
      return systemUsers.filter(u => !accountPermissions.some(p => p.grantee_type === 'user' && String(p.grantee_id) === String(u.id))).map(u => {
          const userParty = systemParties.find(p => String(p.id) === String(u.party_id || u.person_id));
          let fNameStr = '';
          if (userParty) fNameStr = userParty.party_type === 'legal' && userParty.company_name ? userParty.company_name : `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
          if (!fNameStr) fNameStr = (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.name || '');
          return { ...u, fullName: fNameStr };
      });
    }, [systemUsers, accountPermissions, systemParties]);

    const availableRolesForAccess = useMemo(() => {
      return systemRoles.filter(r => !accountPermissions.some(p => p.grantee_type === 'role' && String(p.grantee_id) === String(r.id)));
    }, [systemRoles, accountPermissions]);

    const permColumns = [
      {
        field: 'grantee_type', header_fa: 'نوع دسترسی', width: '150px',
        render: (val, row) => {
          if (inlinePermEdit?.id === row.id) {
             return (
               <div onClick={(e)=>e.stopPropagation()}>
                 <SelectField size="sm" options={[{value:'user', label:t('کاربر سیستم', 'User')}, {value:'role', label:t('نقش سیستمی', 'Role')}]}
                   value={inlinePermEdit.data.grantee_type} 
                   onChange={(e) => setInlinePermEdit(prev => ({...prev, data: {...prev.data, grantee_type: e.target.value, grantee_id: '', grantee_obj: null}}))} isRtl={isRtl} />
               </div>
             )
          }
          return <Badge variant="slate" size="sm">{val === 'user' ? t('کاربر', 'User') : t('نقش', 'Role')}</Badge>;
        }
      },
      {
        field: 'grantee_id', header_fa: 'نام کاربری / عنوان نقش', width: 'auto',
        render: (val, row) => {
          if (inlinePermEdit?.id === row.id) {
            const isUser = inlinePermEdit.data.grantee_type === 'user';
            return (
              <div onClick={(e)=>e.stopPropagation()}>
                <LOVField size="sm" data={isUser ? availableUsersForAccess : availableRolesForAccess} 
                  columns={isUser ? [{field:'username',header_fa:'نام کاربری'},{field:'fullName',header_fa:'نام'}] : [{field:'code',header_fa:'کد'},{field:'title',header_fa:'عنوان'}]}
                  dropdownWidth="min-w-[400px]"
                  displayValue={inlinePermEdit.data.grantee_obj ? (isUser ? `${inlinePermEdit.data.grantee_obj.fullName} (${inlinePermEdit.data.grantee_obj.username})` : `${inlinePermEdit.data.grantee_obj.title} (${inlinePermEdit.data.grantee_obj.code})`) : ''}
                  onChange={(r) => setInlinePermEdit(prev => ({...prev, data: {...prev.data, grantee_id: r?.id, grantee_obj: r}}))} />
              </div>
            )
          }
          if (row.grantee_type === 'user') {
            const u = systemUsers.find(su => String(su.id) === String(val));
            if (!u) return val;
            const userParty = systemParties.find(p => String(p.id) === String(u.party_id || u.person_id));
            let fNameStr = '';
            if (userParty) fNameStr = userParty.party_type === 'legal' && userParty.company_name ? userParty.company_name : `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
            if (!fNameStr) fNameStr = (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.name || '');
            return fNameStr ? `${fNameStr} (${u.username || u.email || val})` : (u.username || u.email || val);
          } else {
            const role = systemRoles.find(r => String(r.id) === String(val));
            return role ? (role.title || role.name || val) : val;
          }
        }
      },
      {
        field: 'access_level', header_fa: 'سطح دسترسی', width: '150px',
        render: (val, row) => {
          if (inlinePermEdit?.id === row.id) {
             return (
               <div onClick={(e)=>e.stopPropagation()}>
                 <SelectField size="sm" options={[{value:'view', label:t('فقط مشاهده', 'View Only')}, {value:'full', label:t('کامل', 'Full Access')}]}
                   value={inlinePermEdit.data.access_level} 
                   onChange={(e) => setInlinePermEdit(prev => ({...prev, data: {...prev.data, access_level: e.target.value}}))} isRtl={isRtl} />
               </div>
             )
          }
          return <Badge variant={val === 'full' ? 'indigo' : 'amber'} size="sm">{val === 'full' ? t('کامل (ویرایش و حذف)', 'Full Access') : t('فقط مشاهده', 'View Only')}</Badge>;
        }
      }
    ];

    const permActions = [
      { icon: Save, tooltip: t('ذخیره', 'Save'), hidden: (row) => inlinePermEdit?.id !== row.id, onClick: () => handleSavePermInline(), className: '!text-emerald-600 hover:!text-emerald-800' },
      { icon: X, tooltip: t('انصراف', 'Cancel'), hidden: (row) => inlinePermEdit?.id !== row.id, onClick: () => setInlinePermEdit(null), className: '!text-slate-500 hover:!text-slate-700' },
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), hidden: (row) => inlinePermEdit?.id === row.id || row._isNew, onClick: (row) => {
          let granteeObj = null;
          if (row.grantee_type === 'user') {
              const u = systemUsers.find(x => String(x.id) === String(row.grantee_id));
              if (u) {
                  const userParty = systemParties.find(p => String(p.id) === String(u.party_id || u.person_id));
                  let fNameStr = '';
                  if (userParty) fNameStr = userParty.party_type === 'legal' && userParty.company_name ? userParty.company_name : `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
                  if (!fNameStr) fNameStr = (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.name || '');
                  granteeObj = { ...u, fullName: fNameStr };
              }
          } else { granteeObj = systemRoles.find(r => String(r.id) === String(row.grantee_id)); }
          setInlinePermEdit({ id: row.id, data: { grantee_type: row.grantee_type, grantee_id: row.grantee_id, grantee_obj: granteeObj, access_level: row.access_level } });
        }, className: 'text-slate-400 hover:text-indigo-500' },
      { icon: Trash2, tooltip: t('حذف دسترسی', 'Revoke'), hidden: (row) => inlinePermEdit?.id === row.id || row._isNew, onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'permission', data: row }), className: 'text-red-500 hover:text-red-600' }
    ];

    const consolidatedColumns = [
      { field: 'fullName', header_fa: 'نام و نام خانوادگی', width: '250px', render: (val) => <span className="font-bold text-slate-800 dark:text-slate-200 text-[12px]">{val}</span> },
      { field: 'username', header_fa: 'نام کاربری', width: '130px', render: (val) => <span className="text-[12px] text-slate-600 dark:text-slate-400" dir="ltr">{val}</span> },
      { field: 'accessLevel', header_fa: 'سطح دسترسی', width: '150px', render: (v) => <Badge variant={v === 'full' ? 'indigo' : 'amber'} size="sm">{v === 'full' ? t('کامل', 'Full') : t('مشاهده', 'View')}</Badge> },
      { field: 'reason', header_fa: 'نحوه ارث‌بری', width: 'auto', render: (val) => <span className="text-[11px] text-slate-500">{val}</span> }
    ];

    const bgColumns = [
        { 
            field: 'group', header_fa: 'گروه بالانس', width: 'auto', 
            render: (_, row) => {
                if (inlineBgEdit?.id === row.id) {
                    return (
                        <div onClick={(e)=>e.stopPropagation()}>
                            <LOVField size="sm" data={balanceGroupsMaster} 
                                columns={[
                                    { field: 'code', header_fa: 'کد گروه', width: '100px' },
                                    { field: 'title_fa', header_fa: 'عنوان', width: 'auto' },
                                    { field: 'is_active', header_fa: 'وضعیت', width: '80px', render: (val) => val ? t('فعال', 'Active') : t('غیرفعال', 'Inactive') }
                                ]} 
                                dropdownWidth="min-w-[450px]"
                                displayValue={inlineBgEdit.data.group_obj ? `${inlineBgEdit.data.group_obj.code} - ${inlineBgEdit.data.group_obj.title_fa}` : ''}
                                onChange={(r) => setInlineBgEdit(prev => ({...prev, data: {...prev.data, group_id: r?.id, group_obj: r}}))}
                            />
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{row.fm_balance_groups?.code}</span>
                        <span className="text-slate-600 dark:text-slate-300">- {row.fm_balance_groups?.title_fa}</span>
                    </div>
                );
            }
        },
        { 
            field: 'valid_from', header_fa: 'از تاریخ', width: '140px', 
            render: (val, row) => {
                if (inlineBgEdit?.id === row.id) {
                    return <div onClick={(e)=>e.stopPropagation()}><DatePicker size="sm" value={inlineBgEdit.data.valid_from} onChange={(v) => setInlineBgEdit(prev => ({...prev, data: {...prev.data, valid_from: v}}))} isRtl={isRtl} language={language}/></div>
                }
                return <span className="text-[12px]" dir="ltr">{formatGlobalDate(val, globalMode)}</span>;
            }
        },
        { 
            field: 'valid_to', header_fa: 'تا تاریخ', width: '140px', 
            render: (val, row) => {
                if (inlineBgEdit?.id === row.id) {
                    return <div onClick={(e)=>e.stopPropagation()}><DatePicker size="sm" value={inlineBgEdit.data.valid_to} onChange={(v) => setInlineBgEdit(prev => ({...prev, data: {...prev.data, valid_to: v}}))} isRtl={isRtl} language={language}/></div>
                }
                return val ? <span className="text-[12px]" dir="ltr">{formatGlobalDate(val, globalMode)}</span> : <span className="text-[10px] text-slate-400">{t('تا کنون', 'Present')}</span>;
            } 
        },
        { 
            field: 'is_active', header_fa: 'وضعیت', width: '80px', 
            render: (val, row) => {
                if (inlineBgEdit?.id === row.id) {
                    return <div onClick={(e)=>e.stopPropagation()}><ToggleField size="sm" checked={inlineBgEdit.data.is_active} onChange={v => setInlineBgEdit(prev => ({...prev, data: {...prev.data, is_active: v}}))} isRtl={isRtl} /></div>
                }
                return <Badge variant={val ? 'emerald' : 'slate'} size="sm" className="text-[10px]">{val ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}</Badge>;
            }
        }
    ];

    const bgActions = [
        { icon: Save, tooltip: t('ذخیره', 'Save'), hidden: (row) => inlineBgEdit?.id !== row.id, onClick: () => handleSaveBgInline(), className: '!text-emerald-600 hover:!text-emerald-800' },
        { icon: X, tooltip: t('انصراف', 'Cancel'), hidden: (row) => inlineBgEdit?.id !== row.id, onClick: () => setInlineBgEdit(null), className: '!text-slate-500 hover:!text-slate-700' },
        { icon: Edit, tooltip: t('ویرایش', 'Edit'), hidden: (row) => inlineBgEdit?.id === row.id || row._isNew, onClick: (row) => {
                const bgObj = balanceGroupsMaster.find(b => String(b.id) === String(row.group_id)) || null;
                setInlineBgEdit({ id: row.id, data: { group_id: row.group_id, group_obj: bgObj, valid_from: row.valid_from, valid_to: row.valid_to || '', is_active: row.is_active } });
            }, className: 'text-slate-400 hover:text-indigo-500' },
        { icon: Users, tooltip: t('دسترسی‌های گروه بالانس', 'Group Access'), hidden: (row) => inlineBgEdit?.id === row.id || row._isNew, onClick: (row) => fetchBgAccessAndOpenModal(row), className: 'text-sky-500 hover:text-sky-600' },
        { id: 'delete', icon: Trash2, tooltip: t('حذف تخصیص', 'Remove Assignment'), hidden: (row) => inlineBgEdit?.id === row.id || row._isNew, onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'bg_account', data: row }), className: 'text-red-500 hover:text-red-600' }
    ];

    const bgConsolidatedColumns = [
      { field: 'fullName', header_fa: 'نام و نام خانوادگی', width: '250px', render: (val) => <span className="font-bold text-slate-800 dark:text-slate-200 text-[12px]">{val}</span> },
      { field: 'username', header_fa: 'نام کاربری', width: '130px', render: (val) => <span className="text-[12px] text-slate-600 dark:text-slate-400" dir="ltr">{val}</span> },
      { field: 'reason', header_fa: 'نحوه ارث‌بری', width: 'auto', render: (val) => <span className="text-[11px] text-slate-500">{val}</span> }
    ];

    return (
        <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-200">
            {activeTab === 'access' && (
                <div className="flex flex-col h-full min-h-0 gap-3">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 h-[46px] rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 px-2 flex items-center gap-1">
                        {accessViewMode === 'assign' ? <Shield size={14} className="text-indigo-500"/> : <Users size={14} className="text-indigo-500"/>}
                        {accessViewMode === 'assign' ? t('مدیریت مستقیم دسترسی‌های این حساب', 'Direct Access Management') : t('نمای تجمیعی تمامی دسترسی‌های موثر', 'Consolidated Effective Access')}
                    </span>
                    <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-md">
                        <button onClick={() => setAccessViewMode('assign')} className={`px-3 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1.5 ${accessViewMode === 'assign' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            {t('تخصیص دسترسی', 'Assign Access')}
                        </button>
                        <button onClick={() => setAccessViewMode('aggregate')} className={`px-3 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1.5 ${accessViewMode === 'aggregate' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            {t('کاربران مجاز', 'Authorized Users')}
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col min-h-0">
                    {accessViewMode === 'assign' ? (
                    <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        <DataGrid 
                        key="grid-perm-assign" data={permGridData} columns={permColumns} actions={permActions} language={language} 
                        hideImport={true} hideExport={true} isLoading={isLoading}
                        onAdd={() => { if (!inlinePermEdit) setInlinePermEdit({ id: 'new', data: { grantee_type: 'user', grantee_id: '', grantee_obj: null, access_level: 'view' } }); }}
                        />
                    </div>
                    ) : (
                    <div className="flex-1 min-h-0 flex flex-col gap-2">
                        <Alert type="warning" icon={Shield} message={t('لیست زیر مجموع تمامی کاربرانی است که به صورت مستقیم یا از طریق تفویض نقش‌های خود، اجازه تعامل با این حساب را کسب کرده‌اند.', 'Consolidated aggregate list of all operators with computed effective system access level.')} />
                        <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        <DataGrid key="grid-perm-aggregate" data={consolidatedUsersList} columns={consolidatedColumns} language={language} hideImport={true} hideExport={true} hideToolbar={true} />
                        </div>
                    </div>
                    )}
                </div>
                </div>
            )}

            {activeTab === 'balance_groups' && (
                <div className="flex flex-col h-full min-h-0 gap-3">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 h-[46px] rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 px-2 flex items-center gap-1">
                        <Scale size={14} className="text-indigo-500"/>
                        {t('مدیریت گروه‌های بالانس مرتبط با این حساب', 'Manage Balance Groups Associated with this Account')}
                    </span>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        <DataGrid 
                        key="grid-bg-assign" data={bgGridData} columns={bgColumns} actions={bgActions} language={language} 
                        hideImport={true} hideExport={true} isLoading={isLoading} onAdd={handleAddBgClick}
                        />
                    </div>
                </div>
                </div>
            )}

            <Modal isOpen={bgAccessModal.isOpen} onClose={() => setBgAccessModal({ isOpen: false, groupTitle: '', data: [] })} title={`${t('کاربران مجاز گروه بالانس:', 'Authorized Users for Balance Group:')} ${bgAccessModal.groupTitle}`} language={language} width="max-w-4xl">
                <div className="p-4 flex flex-col gap-3 h-[60vh] min-h-[400px]">
                    <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        <DataGrid key="grid-bg-modal-aggregate" data={bgAccessModal.data} columns={bgConsolidatedColumns} language={language} hideImport={true} hideExport={true} hideToolbar={true} />
                    </div>
                    <div className="flex justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <Button size="sm" variant="outline" onClick={() => setBgAccessModal({ isOpen: false, groupTitle: '', data: [] })}>{t('بستن', 'Close')}</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید حذف قطعی رکورد', 'Confirm Permanent Revocation')} language={language} width="max-w-sm">
                <div className="p-4 flex flex-col gap-3 items-center text-center">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1"><AlertTriangle size={22} /></div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1"><Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}</div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-1">
                    {deleteConfirm.type === 'permission' && t('آیا از حذف این ردیف دسترسی اطمینان دارید؟', 'Are you sure you want to revoke this explicit access right?')}
                    {deleteConfirm.type === 'bg_account' && t('آیا از حذف این حساب از گروه بالانس اطمینان دارید؟', 'Are you sure you want to remove this account from the balance group?')}
                    </p>
                    <div className="flex gap-2 mt-4 w-full">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                    <Button size="sm" variant="primary" onClick={executeDelete} isLoading={isLoading} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 border-red-600 dark:border-red-500 shadow-lg">{t('تایید حذف نهایی', 'Delete Now')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
  };

  window.ChartOfAccountsAccess = ChartOfAccountsAccess;
})();