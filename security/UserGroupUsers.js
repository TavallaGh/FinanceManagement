/* Filename: security/UserGroupUsers.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useRef, useMemo } = React;

  const FallbackIcon = ({ size = 16, className = '' }) => React.createElement('span', { className: `inline-block ${className}`, style: { width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { Save = FallbackIcon, X = FallbackIcon, Edit = FallbackIcon } = LucideIcons;

  const DesignSystem = window.DesignSystem || window.DSCore || {};
  const { DataGrid = () => null, Badge = () => null } = DesignSystem;

  const Forms = window.DSForms || window.DesignSystem || {};
  const { CheckboxField = () => null } = Forms;

  const supabase = window.supabase;
  const GROUP_USERS_TABLE = 'sec_user_group_users';

  const UserGroupUsers = ({
    language = 'fa',
    isRtl = true,
    t,
    groups = [],
    userGroupsById,
    usersWithGroups = [],
    userGridState,
    setUserGridState,
    isLoading: externalLoading = false,
    globalCalendarMode,
    onSaved
  }) => {
    const [inlineUserGroupEdit, setInlineUserGroupEdit] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const dropdownRef = useRef(null);

    const loading = externalLoading || isSaving;

    // Close dropdown on outside click
    useEffect(() => {
      if (!inlineUserGroupEdit?.isDropdownOpen) return;
      const handleOutsideClick = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          setInlineUserGroupEdit(prev => prev ? { ...prev, isDropdownOpen: false } : prev);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [inlineUserGroupEdit?.isDropdownOpen]);

    const groupedUsersOnly = useMemo(() => {
      return usersWithGroups.filter(user => (user.groupIds || []).length > 0);
    }, [usersWithGroups]);

    const inlineUserGroupData = useMemo(() => {
      if (!inlineUserGroupEdit) return groupedUsersOnly;
      const existing = groupedUsersOnly.find(user => String(user.id) === String(inlineUserGroupEdit.id));
      if (!existing) return groupedUsersOnly;
      const editedRow = {
        ...existing,
        groupIds: inlineUserGroupEdit.selectedGroupIds || [],
        groupNames: (inlineUserGroupEdit.selectedGroupIds || [])
          .map(groupId => userGroupsById ? userGroupsById.get(String(groupId)) : null)
          .filter(Boolean)
          .map(group => group.title || group.code || '---'),
        _isEditing: true
      };
      return groupedUsersOnly.map(user => String(user.id) === String(editedRow.id) ? editedRow : user);
    }, [groupedUsersOnly, inlineUserGroupEdit, userGroupsById]);

    const startInlineUserGroupEdit = (user) => {
      const selectedGroupIds = (user.groupIds || []).map(String);
      setInlineUserGroupEdit({
        id: user.id,
        user,
        selectedGroupIds,
        isDropdownOpen: false
      });
    };

    const cancelInlineUserGroupEdit = () => {
      setInlineUserGroupEdit(null);
    };

    const toggleUserGroupSelection = (groupId, checked) => {
      setInlineUserGroupEdit(prev => {
        if (!prev) return prev;
        const current = prev.selectedGroupIds || [];
        return {
          ...prev,
          selectedGroupIds: checked
            ? Array.from(new Set([...current, String(groupId)]))
            : current.filter(id => String(id) !== String(groupId))
        };
      });
    };

    const saveUserGroupAssignments = async () => {
      if (!inlineUserGroupEdit?.user) return;
      setIsSaving(true);
      try {
        const userId = inlineUserGroupEdit.user.id;
        const selectedIds = (inlineUserGroupEdit.selectedGroupIds || []).map(String);

        const { error: deleteError } = await supabase
          .from(GROUP_USERS_TABLE)
          .delete()
          .eq('user_id', userId);
        if (deleteError) throw deleteError;

        if (selectedIds.length > 0) {
          const payload = selectedIds.map(groupId => ({ user_id: userId, group_id: groupId }));
          const { error: insertError } = await supabase.from(GROUP_USERS_TABLE).insert(payload);
          if (insertError) throw insertError;
        }

        setInlineUserGroupEdit(null);
        if (onSaved) await onSaved();
      } catch (error) {
        console.error('Save User Group Assignments Error:', error);
      } finally {
        setIsSaving(false);
      }
    };

    const userColumns = [
      {
        field: 'username',
        header_fa: 'نام کاربری',
        header_en: 'Username',
        width: '150px',
        render: (val) => <span className="font-bold text-slate-700 dark:text-slate-300" dir="ltr">{val}</span>
      },
      {
        field: 'fullName',
        header_fa: 'نام و نام خانوادگی',
        header_en: 'Full Name',
        width: '220px',
        render: (val) => <span className="font-bold text-slate-700 dark:text-slate-200">{val}</span>
      },
      {
        field: 'groupNames',
        header_fa: 'گروه‌های کاربر',
        header_en: 'User Groups',
        width: 'auto',
        minWidth: '280px',
        render: (_, row) => {
          const isEditing = inlineUserGroupEdit?.id === row.id;
          const selectedGroupIds = isEditing
            ? (inlineUserGroupEdit.selectedGroupIds || [])
            : (row.groupIds || []);
          const selectedGroups = selectedGroupIds
            .map(groupId => userGroupsById ? userGroupsById.get(String(groupId)) : null)
            .filter(Boolean);

          if (isEditing) {
            return (
              <div ref={dropdownRef} className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setInlineUserGroupEdit(prev => prev ? { ...prev, isDropdownOpen: !prev.isDropdownOpen } : prev)}
                  className="w-full min-h-8 px-3 py-1.5 text-[12px] rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
                >
                  <span className="text-slate-500 dark:text-slate-400">
                    {selectedGroups.length > 0
                      ? t(`${selectedGroups.length} گروه انتخاب شده`, `${selectedGroups.length} group(s) selected`)
                      : t('انتخاب گروه‌ها...', 'Select groups...')}
                  </span>
                  <span className={`text-slate-400 transition-transform duration-150 select-none ${inlineUserGroupEdit?.isDropdownOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {inlineUserGroupEdit?.isDropdownOpen && (
                  <div className="absolute z-30 mt-1 w-full min-w-[280px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                    <div className="max-h-60 overflow-auto py-1">
                      {groups.length === 0 && (
                        <div className="px-3 py-2 text-[12px] text-slate-400">{t('گروهی تعریف نشده', 'No groups defined')}</div>
                      )}
                      {groups.map(group => {
                        const isChecked = selectedGroupIds.includes(String(group.id));
                        return (
                          <div
                            key={group.id}
                            className={`flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer transition-colors select-none ${isChecked ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleUserGroupSelection(group.id, !isChecked);
                            }}
                          >
                            <div className="pointer-events-none">
                              <CheckboxField
                                checked={isChecked}
                                onChange={() => {}}
                                isRtl={isRtl}
                                wrapperClassName="m-0"
                              />
                            </div>
                            <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 truncate">{group.title || group.code}</span>
                            <span className="text-[10px] text-slate-400 shrink-0" dir="ltr">{group.code}</span>
                            {!group.is_active && (
                              <Badge variant="slate" size="sm" className="!py-0.5 !px-2 text-[10px] shrink-0">{t('غیرفعال', 'Inactive')}</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedGroups.length > 0 ? selectedGroups.map((group, idx) => (
                    <Badge key={`${row.id}-${group.id || idx}`} variant={group.is_active === false ? 'slate' : 'indigo'} size="sm" className="!py-0.5 !px-2 text-[10px] flex items-center gap-1">
                      <span>{group.title || group.code}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUserGroupSelection(group.id, false);
                        }}
                        className="text-indigo-300 hover:text-rose-500 leading-none ms-1"
                        title={t('حذف', 'Remove')}
                      >×</button>
                    </Badge>
                  )) : <span className="text-[12px] text-slate-400">-</span>}
                </div>
              </div>
            );
          }

          return (
            <div className="flex flex-wrap gap-1.5">
              {selectedGroups.length > 0
                ? selectedGroups.map((group, idx) => (
                    <Badge key={`${row.id}-${group.id || idx}`} variant={group.is_active === false ? 'slate' : 'indigo'} size="sm" className="!py-0.5 !px-2 text-[10px]">
                      {group.title || group.code}
                    </Badge>
                  ))
                : <span className="text-[12px] text-slate-400">-</span>}
            </div>
          );
        }
      },
      {
        field: 'is_active',
        header_fa: 'وضعیت',
        header_en: 'Status',
        width: '100px',
        render: (val) => <Badge variant={val === false ? 'slate' : 'emerald'} size="sm">{val === false ? t('غیرفعال', 'Inactive') : t('فعال', 'Active')}</Badge>
      }
    ];

    const userActions = [
      {
        icon: Save,
        tooltip: t('ذخیره', 'Save'),
        hidden: (row) => inlineUserGroupEdit?.id !== row.id,
        onClick: () => saveUserGroupAssignments(),
        className: '!text-emerald-600 hover:!text-emerald-800'
      },
      {
        icon: X,
        tooltip: t('انصراف', 'Cancel'),
        hidden: (row) => inlineUserGroupEdit?.id !== row.id,
        onClick: () => cancelInlineUserGroupEdit(),
        className: '!text-slate-500 hover:!text-slate-700'
      },
      {
        icon: Edit,
        tooltip: t('ویرایش گروه‌ها', 'Edit Groups'),
        hidden: (row) => inlineUserGroupEdit?.id === row.id,
        onClick: (row) => startInlineUserGroupEdit(row),
        className: 'text-slate-400 hover:text-indigo-500'
      }
    ];

    return (
      <DataGrid
        key={`user_membership_grid_${language}_${globalCalendarMode}`}
        data={inlineUserGroupData}
        columns={userColumns}
        actions={userActions}
        language={language}
        isLoading={loading}
        hideImport={true}
        hideExport={true}
        onRowDoubleClick={(row) => !inlineUserGroupEdit && startInlineUserGroupEdit(row)}
        gridState={userGridState}
        onGridStateChange={setUserGridState}
      />
    );
  };

  window.UserGroupUsers = UserGroupUsers;
})();
