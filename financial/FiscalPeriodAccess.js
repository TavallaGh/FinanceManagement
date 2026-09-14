/* Filename: financial/FiscalPeriodAccess.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useEffect, useCallback } = React;

  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;

  const Badge = DSCore.Badge || DS.Badge || Fallback;

  const SelectField = DSForms.SelectField || DS.SelectField || Fallback;
  const ToggleField = DSForms.ToggleField || DS.ToggleField || Fallback;

  const DataGrid = DSGrid.DataGrid || DS.DataGrid || Fallback;
  const LOVField = DSGrid.LOVField || DS.LOVField || Fallback;

  const LucideIcons = window.LucideIcons || {};
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { width: size, height: size, display: 'inline-block' } });
  const Edit = LucideIcons.Edit || FallbackIcon;
  const Trash2 = LucideIcons.Trash2 || FallbackIcon;
  const Save = LucideIcons.Save || FallbackIcon;
  const X = LucideIcons.X || FallbackIcon;
  const UserRoundCog = LucideIcons.UserRoundCog || LucideIcons.UsersRound || FallbackIcon;
  const UsersRound = LucideIcons.UsersRound || LucideIcons.Users || FallbackIcon;

  const FiscalPeriodAccess = ({
    language = 'fa',
    formCode = 'FIN_FISCAL_PERIODS',
    period = null,
    status,
    supabase,
    users = [],
    userGroups = [],
    showToast,
    t,
    isRtl = true,
    onClose,
    onExceptionMarkerChange
  }) => {
    const [exceptionGridState, setExceptionGridState] = useState(null);
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [inlineExceptionEdit, setInlineExceptionEdit] = useState({ id: null, isNew: false });
    const [exceptionInlineForm, setExceptionInlineForm] = useState({
      id: null,
      subjectType: 'USER',
      userId: null,
      userDisplay: '',
      userUsername: '',
      groupId: null,
      isActive: true
    });

    const usersById = useMemo(() => {
      const map = new Map();
      users.forEach(u => map.set(String(u.id), u));
      return map;
    }, [users]);

    const groupsById = useMemo(() => {
      const map = new Map();
      userGroups.forEach(g => map.set(String(g.id), g));
      return map;
    }, [userGroups]);

    const activeUsers = useMemo(() => users.filter(u => u.isActive !== false), [users]);
    const activeUserGroups = useMemo(() => userGroups.filter(g => g.isActive !== false), [userGroups]);

    const userLovColumns = [
      { field: 'username', header_fa: 'نام کاربری', header_en: 'Username', width: '140px' },
      { field: 'fullName', header_fa: 'نام کامل', header_en: 'Full Name', width: '220px' },
      { field: 'email', header_fa: 'ایمیل', header_en: 'Email', width: '200px' }
    ];

    const normalizeSubjectType = (value) => {
      const v = String(value || '').toLowerCase();
      if (v === 'user_group' || v === 'group' || v === 'role') return 'USER_GROUP';
      return 'USER';
    };

    const mapExceptionRows = useCallback((rawRows) => {
      return (rawRows || []).map(r => {
        const normalizedType = normalizeSubjectType(r.grantee_type || (r.user_group_id ? 'user_group' : (r.role_id ? 'user_group' : 'user')));
        const userId = r.user_id || (normalizedType === 'USER' ? r.grantee_id : null) || null;
        const groupId = r.user_group_id || (normalizedType === 'USER_GROUP' ? r.grantee_id : null) || null;

        const userObj = userId ? usersById.get(String(userId)) : null;
        const groupObj = groupId ? groupsById.get(String(groupId)) : null;

        return {
          id: r.id,
          periodId: r.period_id,
          subjectType: normalizedType,
          userId,
          userName: userObj?.fullName || userObj?.username || '-',
          userUsername: userObj?.username || '-',
          groupId,
          groupTitle: groupObj?.title || '-',
          accessTarget: normalizedType === 'USER_GROUP' ? (groupObj?.title || '-') : (userObj?.fullName || userObj?.username || '-'),
          isActive: r.is_active !== false
        };
      });
    }, [groupsById, usersById]);

    const loadExceptionsForPeriod = useCallback(async (periodRow) => {
      if (!periodRow || !supabase) return;
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('fm_fiscal_period_exceptions')
          .select('*')
          .eq('period_id', periodRow.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const mapped = mapExceptionRows(data);
        setRows(mapped);
        setIsLoading(false);
        onExceptionMarkerChange?.(periodRow.id, mapped.some(r => r.isActive !== false));
      } catch (err) {
        console.error('load exceptions error:', err);
        setIsLoading(false);
        showToast(t('خطا در دریافت استثناها', 'Error loading exceptions'), 'error');
      }
    }, [mapExceptionRows, onExceptionMarkerChange, showToast, supabase, t]);

    useEffect(() => {
      setExceptionGridState(null);
      setInlineExceptionEdit({ id: null, isNew: false });
      setExceptionInlineForm({
        id: null,
        subjectType: 'USER',
        userId: null,
        userDisplay: '',
        userUsername: '',
        groupId: null,
        isActive: true
      });

      if (!period) {
        setRows([]);
        setIsLoading(false);
        return;
      }

      loadExceptionsForPeriod(period);
    }, [loadExceptionsForPeriod, period]);

    const resetInlineExceptionForm = () => {
      setExceptionInlineForm({
        id: '__new_exception__',
        subjectType: 'USER',
        userId: null,
        userDisplay: '',
        userUsername: '',
        groupId: null,
        isActive: true
      });
      setInlineExceptionEdit({ id: '__new_exception__', isNew: true });
    };

    const beginInlineExceptionEdit = (row = null) => {
      if (!period) return;
      if (inlineExceptionEdit.id) {
        showToast(t('ابتدا ویرایش جاری استثنا را ذخیره یا لغو کنید.', 'Save or cancel current exception edit first.'), 'warning');
        return;
      }

      if (!row) {
        resetInlineExceptionForm();
        return;
      }

      setExceptionInlineForm({
        id: row.id,
        subjectType: row.subjectType || 'USER',
        userId: row.userId || null,
        userDisplay: row.userName || '',
        userUsername: row.userUsername || '',
        groupId: row.groupId || null,
        isActive: row.isActive !== false
      });
      setInlineExceptionEdit({ id: row.id, isNew: false });
    };

    const cancelInlineExceptionEdit = () => {
      setInlineExceptionEdit({ id: null, isNew: false });
      setExceptionInlineForm({
        id: null,
        subjectType: 'USER',
        userId: null,
        userDisplay: '',
        userUsername: '',
        groupId: null,
        isActive: true
      });
    };

    const validateExceptionDraft = (draft) => {
      if (!period) return false;

      if (draft.subjectType === 'USER' && !draft.userId) {
        showToast(t('انتخاب کاربر الزامی است.', 'Selecting a user is required.'), 'error');
        return false;
      }
      if (draft.subjectType === 'USER_GROUP' && !draft.groupId) {
        showToast(t('انتخاب گروه کاربری الزامی است.', 'Selecting a user group is required.'), 'error');
        return false;
      }

      const targetId = draft.subjectType === 'USER_GROUP' ? String(draft.groupId || '') : String(draft.userId || '');
      const duplicate = rows.some(r => {
        if (String(r.id) === String(draft.id || '')) return false;
        const rowTargetId = r.subjectType === 'USER_GROUP' ? String(r.groupId || '') : String(r.userId || '');
        return String(r.subjectType) === String(draft.subjectType) && rowTargetId === targetId;
      });

      if (duplicate) {
        showToast(t('اطلاعات تکراری است.', 'Duplicate information.'), 'error');
        return false;
      }

      return true;
    };

    const saveInlineException = async () => {
      if (!period) return;

      if (period.status !== status.CLOSED) {
        showToast(t('فقط برای دوره بسته شده می‌توان استثنا تعریف کرد.', 'Exceptions can only be saved for closed periods.'), 'error');
        return;
      }

      const draft = {
        ...exceptionInlineForm,
        id: inlineExceptionEdit.isNew ? null : exceptionInlineForm.id
      };
      if (!validateExceptionDraft(draft)) return;

      setIsLoading(true);
      try {
        const payload = {
          period_id: period.id,
          grantee_type: draft.subjectType === 'USER_GROUP' ? 'user_group' : 'user',
          grantee_id: draft.subjectType === 'USER_GROUP' ? draft.groupId : draft.userId,
          user_id: draft.subjectType === 'USER' ? draft.userId : null,
          user_group_id: draft.subjectType === 'USER_GROUP' ? draft.groupId : null,
          is_active: draft.isActive,
          updated_at: new Date().toISOString()
        };

        if (draft.id) {
          const { error } = await supabase.from('fm_fiscal_period_exceptions').update(payload).eq('id', draft.id);
          if (error) throw error;
        } else {
          payload.created_at = new Date().toISOString();
          const { error } = await supabase.from('fm_fiscal_period_exceptions').insert([payload]);
          if (error) throw error;
        }

        cancelInlineExceptionEdit();
        await loadExceptionsForPeriod(period);
        showToast(t('استثنا با موفقیت ذخیره شد.', 'Exception saved successfully.'));
      } catch (err) {
        console.error('saveInlineException error:', err);
        setIsLoading(false);
        if (String(err?.code || '') === '23505') {
          showToast(t('اطلاعات تکراری است.', 'Duplicate information.'), 'error');
          return;
        }
        const errMsg = String(err?.message || '').toLowerCase();
        if (errMsg.includes('grantee_type') || errMsg.includes('grantee_id') || errMsg.includes('user_group_id')) {
          showToast(t('ساختار جدول استثناها نیاز به به‌روزرسانی دارد. کوئری مهاجرت را اجرا کنید.', 'Exceptions table schema needs migration. Please run migration query.'), 'error');
          return;
        }
        showToast(t('خطا در ذخیره استثنا', 'Error saving exception'), 'error');
      }
    };

    const deleteException = async (row) => {
      if (!row || !period) return;
      setIsLoading(true);
      try {
        const { error } = await supabase.from('fm_fiscal_period_exceptions').delete().eq('id', row.id);
        if (error) throw error;
        await loadExceptionsForPeriod(period);
        if (String(inlineExceptionEdit.id) === String(row.id)) {
          cancelInlineExceptionEdit();
        }
        showToast(t('استثنا حذف شد.', 'Exception deleted.'));
      } catch (err) {
        console.error('deleteException error:', err);
        setIsLoading(false);
        showToast(t('خطا در حذف استثنا', 'Error deleting exception'), 'error');
      }
    };

    const exceptionGridData = useMemo(() => {
      if (!inlineExceptionEdit.isNew) return rows;
      return [{
        id: '__new_exception__',
        subjectType: exceptionInlineForm.subjectType,
        accessTarget: exceptionInlineForm.subjectType === 'USER_GROUP' ? (groupsById.get(String(exceptionInlineForm.groupId))?.title || '-') : (exceptionInlineForm.userDisplay || '-'),
        userName: exceptionInlineForm.userDisplay,
        userUsername: exceptionInlineForm.userUsername,
        groupId: exceptionInlineForm.groupId,
        isActive: exceptionInlineForm.isActive
      }, ...rows];
    }, [rows, exceptionInlineForm, groupsById, inlineExceptionEdit.isNew]);

    const isEditingExceptionRow = useCallback((row) => {
      return inlineExceptionEdit.id && String(row?.id) === String(inlineExceptionEdit.id);
    }, [inlineExceptionEdit.id]);

    const exceptionColumns = [
      {
        field: 'isActive',
        header_fa: 'فعال',
        header_en: 'Active',
        width: '110px',
        render: (val, row) => isEditingExceptionRow(row)
          ? <ToggleField size="sm" checked={exceptionInlineForm.isActive} onChange={(v) => setExceptionInlineForm(prev => ({ ...prev, isActive: v }))} isRtl={isRtl} formCode={formCode} />
          : (val ? <Badge variant="emerald">{t('فعال', 'Active')}</Badge> : <Badge variant="slate">{t('غیرفعال', 'Inactive')}</Badge>)
      },
      {
        field: 'subjectType',
        header_fa: 'نوع دسترسی',
        header_en: 'Access Type',
        width: '150px',
        render: (val, row) => {
          if (isEditingExceptionRow(row)) {
            return (
              <SelectField
                size="sm"
                value={exceptionInlineForm.subjectType}
                onChange={(e) => setExceptionInlineForm(prev => ({
                  ...prev,
                  subjectType: e.target.value,
                  userId: null,
                  userDisplay: '',
                  userUsername: '',
                  groupId: null
                }))}
                options={[
                  { value: 'USER', label: t('کاربر', 'User') },
                  { value: 'USER_GROUP', label: t('گروه کاربری', 'User Group') }
                ]}
                isRtl={isRtl}
                formCode={formCode}
              />
            );
          }

          return val === 'USER_GROUP'
            ? <Badge variant="indigo" className="inline-flex items-center gap-1"><UsersRound size={10} />{t('گروه کاربری', 'User Group')}</Badge>
            : <Badge variant="blue" className="inline-flex items-center gap-1"><UserRoundCog size={10} />{t('کاربر', 'User')}</Badge>;
        }
      },
      {
        field: 'accessTarget',
        header_fa: 'دسترسی برای',
        header_en: 'Access Target',
        width: '100px',
        render: (val, row) => {
          if (isEditingExceptionRow(row)) {
            if (exceptionInlineForm.subjectType === 'USER') {
              return (
                <LOVField
                  size="sm"
                  data={activeUsers}
                  columns={userLovColumns}
                  displayValue={exceptionInlineForm.userDisplay}
                  onChange={(userRow) => setExceptionInlineForm(prev => ({
                    ...prev,
                    userId: userRow?.id || null,
                    userDisplay: userRow?.label || userRow?.username || '',
                    userUsername: userRow?.username || ''
                  }))}
                  onClear={() => setExceptionInlineForm(prev => ({ ...prev, userId: null, userDisplay: '', userUsername: '' }))}
                  dropdownWidth="min-w-[520px]"
                  isRtl={isRtl}
                  formCode={formCode}
                />
              );
            }

            return (
              <SelectField
                size="sm"
                value={exceptionInlineForm.groupId || ''}
                onChange={(e) => setExceptionInlineForm(prev => ({ ...prev, groupId: e.target.value || null }))}
                options={activeUserGroups.map(g => ({ value: g.id, label: `${g.code ? `${g.code} - ` : ''}${g.title || g.id}` }))}
                isRtl={isRtl}
                formCode={formCode}
              />
            );
          }

          return (
            <div className="flex flex-col py-0.5 w-full">
              <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{val || '-'}</span>
              {row.subjectType === 'USER' && <span className="text-[10px] text-slate-400" dir="ltr">{row.userUsername || '-'}</span>}
            </div>
          );
        }
      },
    ];

    if (!period) return null;

    return (
      <div className="w-full md:w-5/12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200 relative z-10 shadow-sm">
        <div className="absolute top-3 left-3">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-[13px] mb-1.5 pr-6">{t('استثناهای دسترسی دوره بسته', 'Closed Period Access Exceptions')}</h3>
          <div className="text-[10px] text-slate-500 font-sans leading-tight flex items-center gap-1.5">
            <Badge variant="blue">{t('دوره انتخاب شده', 'Selected Period')}</Badge>
            <span className="font-sans" dir="ltr">{period?.periodCode || '-'}</span>
            <span className="mx-1">|</span>
            <span>{period?.title || '-'}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-3">
          <div className="h-full min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <DataGrid
              data={exceptionGridData}
              columns={exceptionColumns}
              language={language}
              isLoading={isLoading}
              gridState={exceptionGridState}
              onGridStateChange={setExceptionGridState}
              hideImport
              hideExport
              onAdd={() => beginInlineExceptionEdit(null)}
              onRowDoubleClick={(row) => {
                if (String(row.id) === '__new_exception__') return;
                beginInlineExceptionEdit(row);
              }}
              formCode={formCode}
              actions={[
                {
                  icon: Save,
                  tooltip: t('ذخیره', 'Save'),
                  hidden: (row) => !isEditingExceptionRow(row),
                  onClick: () => saveInlineException(),
                  className: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded transition-colors'
                },
                {
                  icon: X,
                  tooltip: t('لغو', 'Cancel'),
                  hidden: (row) => !isEditingExceptionRow(row),
                  onClick: () => cancelInlineExceptionEdit(),
                  className: 'text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded transition-colors'
                },
                {
                  icon: Edit,
                  tooltip: t('ویرایش', 'Edit'),
                  hidden: (row) => String(row.id) === '__new_exception__' || isEditingExceptionRow(row),
                  onClick: (row) => beginInlineExceptionEdit(row),
                  className: 'text-slate-400 hover:text-indigo-600'
                },
                {
                  icon: Trash2,
                  tooltip: t('حذف', 'Delete'),
                  hidden: (row) => String(row.id) === '__new_exception__' || isEditingExceptionRow(row),
                  onClick: (row) => deleteException(row),
                  className: 'text-slate-400 hover:text-red-600'
                }
              ]}
            />
          </div>
        </div>
      </div>
    );
  };

  window.FiscalPeriodAccess = FiscalPeriodAccess;
})();
