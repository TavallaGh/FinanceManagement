/* Filename: security/UserGroupManagement.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Users = FallbackIcon, Edit = FallbackIcon, Trash2 = FallbackIcon,
    Save = FallbackIcon, Plus = FallbackIcon, AlertTriangle = FallbackIcon,
    X = FallbackIcon, Check = FallbackIcon
  } = LucideIcons;

  const Core = window.DSCore || window.DesignSystem || {};
  const formatGlobalDate = Core.formatGlobalDate || ((v) => v);
  const useCalendarMode = Core.useCalendarMode || (() => 'jalali');

  const DesignSystem = window.DesignSystem || window.DSCore || {};
  const {
    Button = () => null,
    PageHeader = () => null,
    Modal = () => null,
    DataGrid = () => null,
    TextField = () => null,
    ToggleField = () => null,
    LOVField = () => null,
    Badge = () => null,
    EmptyState = () => null
  } = DesignSystem;

  const supabase = window.supabase;

  const GROUPS_TABLE = 'sec_user_groups';
  const GROUP_USERS_TABLE = 'sec_user_group_users';
  const FORM_CODE = 'SYS_GROUP_MGMT';

  const UserGroupManagement = ({ language = 'fa', formCode = FORM_CODE }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const globalCalendarMode = useCalendarMode();

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const actions = useMemo(() => {
      const raw = securityCtx?.getActions?.(formCode);
      return raw || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const [groups, setGroups] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [groupUsers, setGroupUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [groupGridState, setGroupGridState] = useState(null);
    const [userGridState, setUserGridState] = useState(null);
    const [viewMode, setViewMode] = useState('groups');

    const [groupModal, setGroupModal] = useState({ isOpen: false, data: null });
    const [memberModal, setMemberModal] = useState({ isOpen: false, group: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [inlineMemberEdit, setInlineMemberEdit] = useState(null);

    const [formData, setFormData] = useState({
      id: null,
      code: '',
      title: '',
      description: '',
      is_active: true
    });

    const viewConfig = {
      pageId: 'user_group_management_main',
      currentState: () => ({ groupGridState, userGridState, viewMode }),
      onApplyState: (state) => {
        if (state) {
          if (state.groupGridState) setGroupGridState(state.groupGridState);
          if (state.userGridState) setUserGridState(state.userGridState);
          if (state.viewMode) setViewMode(state.viewMode);
        } else {
          setGroupGridState(null);
          setUserGridState(null);
          setViewMode('groups');
        }
      }
    };

    useEffect(() => {
      fetchInitialData();
    }, []);

    const createNextCode = useCallback(async () => {
      if (!window.AutoNumberingService) return '';
      try {
        const preview = await window.AutoNumberingService.previewNext(FORM_CODE);
        return typeof preview === 'string' ? preview : (preview?.formattedCode || '');
      } catch (error) {
        console.error('AutoNumbering Error:', error);
        return '';
      }
    }, []);

    const safeFetch = async (promise) => {
      try {
        const result = await promise;
        return result?.error ? { data: [] } : result;
      } catch (error) {
        return { data: [] };
      }
    };

    const fetchGroupMembers = useCallback(async (groupId) => {
      if (!groupId) return [];

      const [groupUsersRes, partiesRes] = await Promise.all([
        safeFetch(supabase.from(GROUP_USERS_TABLE).select('group_id, user_id').eq('group_id', groupId)),
        safeFetch(supabase.from('parties').select('id, first_name, last_name, company_name, party_type'))
      ]);

      const usersRes = await safeFetch(
        supabase.from('sec_users').select('id, username, is_active, party_id').eq('is_active', true)
      );

      const usersWithNames = (usersRes.data || []).map(user => {
        const party = (partiesRes.data || []).find(p => p.id === user.party_id);
        let fullName = '';
        if (party) {
          fullName = party.party_type === 'legal'
            ? (party.company_name || '')
            : `${party.first_name || ''} ${party.last_name || ''}`.trim();
        }
        return { ...user, fullName: fullName || '-' };
      });

      return (groupUsersRes.data || [])
        .map(item => {
          const user = usersWithNames.find(u => u.id === item.user_id);
          return user ? { ...user } : null;
        })
        .filter(Boolean);
    }, []);

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [
          groupsRes,
          usersRes,
          groupUsersRes,
          partiesRes
        ] = await Promise.all([
          safeFetch(supabase.from(GROUPS_TABLE).select('*').order('created_at', { ascending: false })),
          safeFetch(supabase.from('sec_users').select('id, username, is_active, party_id').eq('is_active', true)),
          safeFetch(supabase.from(GROUP_USERS_TABLE).select('group_id, user_id')),
          safeFetch(supabase.from('parties').select('id, first_name, last_name, company_name, party_type'))
        ]);

        const usersWithNames = (usersRes.data || []).map(user => {
          const party = (partiesRes.data || []).find(p => p.id === user.party_id);
          let fullName = '';
          if (party) {
            fullName = party.party_type === 'legal'
              ? (party.company_name || '')
              : `${party.first_name || ''} ${party.last_name || ''}`.trim();
          }
          return { ...user, fullName: fullName || '-' };
        });

        const groupUsersData = groupUsersRes.data || [];

        const mappedGroups = (groupsRes.data || []).map(group => ({
          ...group,
          memberCount: groupUsersData.filter(gu => gu.group_id === group.id).length,
          hasUsers: groupUsersData.some(gu => gu.group_id === group.id)
        }));

        setGroups(mappedGroups);
        setAllUsers(usersWithNames);
        setGroupUsers(groupUsersData);
      } catch (error) {
        console.error('Fetch User Groups Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const userGroupsById = useMemo(() => {
      const map = new Map();
      groups.forEach(group => map.set(String(group.id), group));
      return map;
    }, [groups]);

    const usersWithGroups = useMemo(() => {
      return allUsers.map(user => {
        const groupIds = groupUsers.filter(item => String(item.user_id) === String(user.id)).map(item => String(item.group_id));
        const groupNames = groupIds
          .map(id => userGroupsById.get(String(id)))
          .filter(Boolean)
          .map(group => group.title || group.code || '---');
        return {
          ...user,
          groupIds,
          groupNames
        };
      });
    }, [allUsers, groupUsers, userGroupsById]);

    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase.from(GROUPS_TABLE).update({ is_active: newValue }).eq('id', row.id);
        if (error) throw error;
        setGroups(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (error) {
        console.error('Toggle Group Active Error:', error);
      }
    };

    const handleOpenGroupModal = (record = null) => {
      if (record) {
        setFormData({
        id: record.id,
        code: record.code || '',
        title: record.title || '',
        description: record.description || '',
        is_active: record.is_active ?? true
      });
        setGroupModal({ isOpen: true, data: record });
        return;
      }

      (async () => {
        const nextCode = await createNextCode();
        setFormData({
          id: null,
          code: nextCode,
          title: '',
          description: '',
          is_active: true
        });
        setGroupModal({ isOpen: true, data: null });
      })();
    };

    const handleSaveGroup = async () => {
      if (!formData.code || !formData.title) return;
      setIsLoading(true);
      try {
        const payload = {
          code: formData.code,
          title: formData.title,
          description: formData.description,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        };

        if (groupModal.data?.id) {
          const { error } = await supabase.from(GROUPS_TABLE).update(payload).eq('id', groupModal.data.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from(GROUPS_TABLE).insert([payload]);
          if (error) throw error;
          if (window.AutoNumberingService) {
            try {
              await window.AutoNumberingService.consumeNext(FORM_CODE);
            } catch (error) {
              console.error('AutoNumbering consume error:', error);
            }
          }
        }

        setGroupModal({ isOpen: false, data: null });
        fetchInitialData();
      } catch (error) {
        console.error('Save User Group Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const openMembersModal = (group) => {
      setMemberModal({ isOpen: true, group });
      setInlineMemberEdit(null);
      fetchGroupMembers(group.id).then(setAssignedUsers);
    };

    const handleAddMemberClick = () => {
      if (inlineMemberEdit) return;
      setInlineMemberEdit({
        id: 'new',
        data: { user_id: '', user_obj: null }
      });
    };

    const handleSaveMemberInline = async () => {
      if (!inlineMemberEdit || !inlineMemberEdit.data.user_id || !memberModal.group) return;

      const selectedUserId = inlineMemberEdit.data.user_id;
      const duplicate = assignedUsers.some(user => String(user.id) === String(selectedUserId) && String(user.id) !== String(inlineMemberEdit.original_user_id || ''));
      if (duplicate) {
        alert(t('این کاربر قبلاً در این گروه ثبت شده است.', 'This user is already assigned to this group.'));
        return;
      }

      setIsLoading(true);
      try {
        const payload = {
          group_id: memberModal.group.id,
          user_id: selectedUserId
        };

        if (inlineMemberEdit.id === 'new') {
          const { error } = await supabase.from(GROUP_USERS_TABLE).insert([payload]);
          if (error) throw error;
        } else {
          const oldUserId = inlineMemberEdit.original_user_id;
          if (String(oldUserId) !== String(selectedUserId)) {
            const { error: deleteError } = await supabase.from(GROUP_USERS_TABLE).delete().match({ group_id: memberModal.group.id, user_id: oldUserId });
            if (deleteError) throw deleteError;
            const { error } = await supabase.from(GROUP_USERS_TABLE).insert([payload]);
            if (error) throw error;
          }
        }

        setInlineMemberEdit(null);
        await fetchInitialData();
        const refreshedMembers = await fetchGroupMembers(memberModal.group.id);
        setAssignedUsers(refreshedMembers);
      } catch (error) {
        console.error('Save Group Member Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const executeDelete = async () => {
      if (!deleteConfirm.data) return;
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'group') {
          await supabase.from(GROUP_USERS_TABLE).delete().eq('group_id', deleteConfirm.data.id);
          const { error } = await supabase.from(GROUPS_TABLE).delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          fetchInitialData();
        } else if (deleteConfirm.type === 'member') {
          const { error } = await supabase.from(GROUP_USERS_TABLE).delete().match({ group_id: memberModal.group.id, user_id: deleteConfirm.data.id });
          if (error) throw error;
          const refreshedMembers = await fetchGroupMembers(memberModal.group.id);
          setAssignedUsers(refreshedMembers);
          fetchInitialData();
        } else if (deleteConfirm.type === 'bulk_member') {
          const validIds = deleteConfirm.data.filter(id => id !== 'new');
          if (validIds.length > 0) {
            const { error } = await supabase.from(GROUP_USERS_TABLE).delete().eq('group_id', memberModal.group.id).in('user_id', validIds);
            if (error) throw error;
          }
          const refreshedMembers = await fetchGroupMembers(memberModal.group.id);
          setAssignedUsers(refreshedMembers);
          if (deleteConfirm.data.includes('new')) {
            setInlineMemberEdit(null);
          }
          fetchInitialData();
        }
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (error) {
        console.error('Delete User Group Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const usersForAssign = useMemo(() => {
      const assignedIds = assignedUsers.map(user => String(user.id));
      return allUsers.filter(user => {
        if (inlineMemberEdit?.id !== 'new' && String(user.id) === String(inlineMemberEdit?.data?.user_id)) return true;
        return !assignedIds.includes(String(user.id));
      });
    }, [allUsers, assignedUsers, inlineMemberEdit]);

    const memberGridData = useMemo(() => {
      const data = [...assignedUsers];
      if (inlineMemberEdit && inlineMemberEdit.id === 'new') {
        data.unshift({ id: 'new', _isNew: true, ...inlineMemberEdit.data });
      }
      return data;
    }, [assignedUsers, inlineMemberEdit]);

    const columns = [
      {
        field: 'code',
        header_fa: 'کد گروه',
        header_en: 'Group Code',
        width: '140px',
        render: (val) => <span className="text-[12px] text-slate-700 dark:text-slate-300 dir-ltr inline-block">{val}</span>
      },
      {
        field: 'title',
        header_fa: 'عنوان گروه',
        header_en: 'Group Title',
        width: '220px',
        render: (val, row) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-[12px]">{val}</span>
            {!row.is_active && <Badge variant="red" size="sm">{t('غیرفعال', 'Inactive')}</Badge>}
          </div>
        )
      },
      {
        field: 'memberCount',
        header_fa: 'تعداد کاربران',
        header_en: 'Users',
        width: '110px',
        render: (val) => <span className="text-[12px] text-slate-600 dark:text-slate-400">{val || 0}</span>
      },
      {
        field: 'is_active',
        header_fa: 'وضعیت',
        header_en: 'Status',
        width: '110px',
        render: (val, row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <ToggleField checked={!!val} onChange={(newVal) => handleToggleActive(row, newVal)} isRtl={isRtl} />
          </div>
        )
      },
      {
        field: 'description',
        header_fa: 'توضیحات',
        header_en: 'Description',
        width: 'auto',
        minWidth: '220px',
        render: (val) => <span className="text-[12px] text-slate-600 dark:text-slate-400 truncate block w-full" title={val}>{val || '-'}</span>
      }
    ];

    const memberColumns = [
      {
        field: 'fullName',
        header_fa: 'نام و نام خانوادگی / عنوان',
        header_en: 'Full Name / Title',
        width: 'auto',
        render: (val, row) => {
          if (inlineMemberEdit?.id === row.id) {
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <LOVField
                  size="sm"
                  data={usersForAssign}
                  columns={[
                    { field: 'username', header_fa: 'نام کاربری', header_en: 'Username', width: '150px' },
                    { field: 'fullName', header_fa: 'نام و نام خانوادگی', header_en: 'Full Name', width: '260px' }
                  ]}
                  dropdownWidth="min-w-[420px]"
                  displayValue={inlineMemberEdit.data.user_obj ? inlineMemberEdit.data.user_obj.fullName : ''}
                  onChange={(user) => setInlineMemberEdit(prev => ({ ...prev, data: { ...prev.data, user_id: user?.id, user_obj: user } }))}
                />
              </div>
            );
          }
          return <span className="font-bold text-slate-700 dark:text-slate-200 text-[12px]">{val}</span>;
        }
      },
      {
        field: 'username',
        header_fa: 'نام کاربری',
        header_en: 'Username',
        width: '160px',
        render: (val, row) => {
          if (inlineMemberEdit?.id === row.id) {
            return <span className="text-[12px] text-slate-500 dir-ltr inline-block">{inlineMemberEdit.data.user_obj?.username || '-'}</span>;
          }
          return <span className="text-[12px] text-slate-500 dir-ltr inline-block">{val}</span>;
        }
      },
      {
        field: 'email',
        header_fa: 'ایمیل',
        header_en: 'Email',
        width: '200px',
        render: (val) => <span className="text-[12px] text-slate-500 dir-ltr inline-block">{val || '-'}</span>
      },
      {
        field: 'is_active',
        header_fa: 'وضعیت',
        header_en: 'Status',
        width: '100px',
        render: (val) => <Badge variant={val === false ? 'slate' : 'emerald'} size="sm">{val === false ? t('غیرفعال', 'Inactive') : t('فعال', 'Active')}</Badge>
      }
    ];

    const memberActions = [
      {
        icon: Save,
        tooltip: t('ذخیره', 'Save'),
        hidden: (row) => inlineMemberEdit?.id !== row.id,
        onClick: () => handleSaveMemberInline(),
        className: '!text-emerald-600 hover:!text-emerald-800'
      },
      {
        icon: X,
        tooltip: t('انصراف', 'Cancel'),
        hidden: (row) => inlineMemberEdit?.id !== row.id,
        onClick: () => setInlineMemberEdit(null),
        className: '!text-slate-500 hover:!text-slate-700'
      },
      {
        icon: Edit,
        tooltip: t('ویرایش', 'Edit'),
        hidden: (row) => inlineMemberEdit?.id === row.id || row._isNew,
        onClick: (row) => {
          setInlineMemberEdit({
            id: row.id,
            original_user_id: row.id,
            data: {
              user_id: row.id,
              user_obj: row
            }
          });
        },
        className: 'text-slate-400 hover:text-indigo-500'
      },
      {
        icon: Trash2,
        tooltip: t('حذف کاربر از گروه', 'Remove user from group'),
        hidden: (row) => inlineMemberEdit?.id === row.id || row._isNew,
        onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'member', data: row }),
        className: 'text-slate-400 hover:text-rose-500'
      }
    ];

    const handleSwitchView = (nextView) => setViewMode(nextView);

    const handleMemberLOVChange = (row) => {
      if (!row) {
        setInlineMemberEdit(prev => ({ ...prev, data: { ...prev.data, user_id: '', user_obj: null } }));
        return;
      }
      setInlineMemberEdit(prev => ({
        ...prev,
        data: {
          ...prev.data,
          user_id: row.id,
          user_obj: row
        }
      }));
    };

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('مدیریت گروههای کاربری', 'User Group Management')}
          icon={Users}
          description={t('تعریف گروه‌های کاربری، تخصیص کاربران به هر گروه و کنترل وضعیت فعال/غیرفعال', 'Define user groups, assign users to each group, and control active/inactive status')}
          language={language}
          breadcrumbs={[{ label: t('امنیت', 'Security') }, { label: t('گروه‌های کاربری', 'User Groups') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-3 animate-in fade-in duration-300">
          <div className={`mb-3 flex items-center justify-between gap-3 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-0.5" dir="ltr">
              <Button
                variant={viewMode === 'groups' ? 'primary' : 'ghost'}
                size="sm"
                icon={Users}
                onClick={() => handleSwitchView('groups')}
                className={`!h-5 !px-3 !text-[11px] ${viewMode === 'groups' ? '' : '!text-slate-600 dark:!text-slate-300'}`}
              >
                {t('گروه‌ها', 'Groups')}
              </Button>
              <Button
                variant={viewMode === 'users' ? 'primary' : 'ghost'}
                size="sm"
                icon={Users}
                onClick={() => handleSwitchView('users')}
                className={`!h-5 !px-3 !text-[11px] ${viewMode === 'users' ? '' : '!text-slate-600 dark:!text-slate-300'}`}
              >
                {t('کاربران و عضویت', 'Users & Membership')}
              </Button>
            </div>
            <div className={`text-[12px] text-slate-500 dark:text-slate-400 font-bold px-2 ${isRtl ? 'text-right' : 'text-left'}`}>
              {viewMode === 'groups' ? t('مدیریت تعریف گروه‌ها', 'Manage groups') : t('ویرایش عضویت کاربران', 'Edit user membership')}
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            {viewMode === 'groups' ? (
              <DataGrid
                key={`user_groups_grid_${language}_${globalCalendarMode}`}
                data={groups}
                columns={columns}
                language={language}
                isLoading={isLoading}
                gridState={groupGridState}
                onGridStateChange={setGroupGridState}
                onAdd={actions.canCreate ? () => handleOpenGroupModal() : undefined}
                onRowDoubleClick={(row) => actions.canEdit ? handleOpenGroupModal(row) : null}
                hideImport={true}
                selectable={true}
                bulkActions={actions.canDelete ? [
                  {
                    label: t('حذف انتخاب‌شده‌ها', 'Delete Selected'),
                    icon: Trash2,
                    variant: 'danger-outline',
                    onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk_group', data: ids })
                  }
                ] : []}
                actions={[
                  { icon: Users, tooltip: t('کاربران گروه', 'Group Users'), onClick: (row) => openMembersModal(row), className: (row) => row.hasUsers ? 'text-blue-500 hover:text-blue-600' : 'text-slate-400 hover:text-blue-500' },
                  { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => handleOpenGroupModal(row), className: 'text-slate-400 hover:text-indigo-500' },
                  { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'group', data: row }), className: 'text-slate-400 hover:text-rose-500' }
                ].filter(action => {
                  if (action.tooltip === t('ویرایش', 'Edit')) return actions.canEdit;
                  if (action.tooltip === t('حذف', 'Delete')) return actions.canDelete;
                  return true;
                })}
              />
            ) : (
              <UserGroupUsers
                language={language}
                isRtl={isRtl}
                t={t}
                groups={groups}
                userGroupsById={userGroupsById}
                usersWithGroups={usersWithGroups}
                userGridState={userGridState}
                setUserGridState={setUserGridState}
                isLoading={isLoading}
                globalCalendarMode={globalCalendarMode}
                onSaved={fetchInitialData}
              />
            )}
          </div>
        </div>

        <Modal
          isOpen={groupModal.isOpen}
          onClose={() => setGroupModal({ isOpen: false, data: null })}
          title={groupModal.data ? t('ویرایش گروه کاربری', 'Edit User Group') : t('تعریف گروه کاربری جدید', 'New User Group')}
          width="max-w-2xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField size="sm" label={t('کد گروه', 'Group Code')} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} isRtl={isRtl} required dir="ltr" />
              <TextField size="sm" label={t('عنوان گروه', 'Group Title')} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} isRtl={isRtl} required />
              <div className="md:col-span-2"><TextField size="sm" label={t('توضیحات', 'Description')} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} isRtl={isRtl} multiline rows={3} /></div>
              <div className="md:col-span-2 mt-1 flex items-center"><ToggleField size="sm" label={t('فعال', 'Active')} checked={formData.is_active} onChange={v => setFormData({ ...formData, is_active: v })} isRtl={isRtl} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setGroupModal({ isOpen: false, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveGroup} isLoading={isLoading}>{t('ذخیره', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={memberModal.isOpen}
          onClose={() => setMemberModal({ isOpen: false, group: null })}
          title={`${t('تخصیص کاربران به گروه:', 'Assign Users to Group:')} ${memberModal.group?.title || ''}`}
          width="max-w-4xl"
          language={language}
        >
          <div className="flex flex-col h-[70vh] min-h-[500px] bg-slate-50 dark:bg-slate-900 p-4 gap-3">
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
              <DataGrid key={`user_group_members_${language}_${globalCalendarMode}`} columns={memberColumns} data={memberGridData} actions={memberActions} language={language} isLoading={isLoading} hideImport={true} hideExport={true} onAdd={handleAddMemberClick} selectable={true} bulkActions={[{ id: 'delete', icon: Trash2, label: t('حذف انتخاب‌شده‌ها', 'Delete Selected'), className: '!text-rose-600 !border-rose-200 hover:!bg-rose-50 dark:!border-rose-800/50 dark:hover:!bg-rose-900/30', onClick: (selectedIds) => setDeleteConfirm({ isOpen: true, type: 'bulk_member', data: selectedIds }) }]} />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
          title={t('تایید عملیات حذف', 'Confirm Deletion')}
          language={language}
          width="max-w-sm"
        >
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'group'
              ? t(`آیا از حذف گروه "${deleteConfirm.data?.title}" اطمینان دارید؟`, `Are you sure you want to delete group "${deleteConfirm.data?.title}"?`)
              : deleteConfirm.type === 'bulk_member'
              ? t(`آیا از حذف ${deleteConfirm.data?.length} کاربر انتخاب‌شده از این گروه اطمینان دارید؟`, `Are you sure you want to remove ${deleteConfirm.data?.length} selected users from this group?`)
              : t('آیا از حذف این کاربر از گروه فعلی اطمینان دارید؟', 'Are you sure you want to remove this user from the current group?')
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>
      </div>
    );
  };

  UserGroupManagement.formCode = FORM_CODE;
  window.UserGroupManagement = UserGroupManagement;
})();