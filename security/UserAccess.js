/* Filename: security/UserAccess.js */
(() => {
  const React = window.React;
  const { useState, useEffect } = React;

  const { 
    Button, DataGrid, Badge, CheckboxField, SelectField, EmptyState 
  } = window.DesignSystem || {};
  
  const { 
    Shield, ShieldAlert, Key, Eye, Trash2, Plus, Save, X 
  } = window.LucideIcons || {};
  const supabase = window.supabase;

  const UserAccess = ({ user, onClose, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const FORM_CODE = 'user_access_modal';

    const [loading, setLoading] = useState(false);
    const [directPermissions, setDirectPermissions] = useState([]);
    const [inheritedPermissions, setInheritedPermissions] = useState([]);
    const [formsList, setFormsList] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState(null);
    const [permissionDetails, setPermissionDetails] = useState({
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_print: false,
      can_import: false,
      can_export: false
    });

    useEffect(() => {
      if (user?.id) {
        fetchForms();
        fetchUserPermissions();
      }
    }, [user]);

    const fetchForms = async () => {
      try {
        const { data, error } = await supabase
          .from('fm_menu_items')
          .select('id, title_fa, title_en, form_code')
          .not('form_code', 'is', null);
        if (!error && data) setFormsList(data);
      } catch (err) {
        console.error('Error fetching forms:', err);
      }
    };

    const fetchUserPermissions = async () => {
      setLoading(true);
      try {
        const { data: direct, error: err1 } = await supabase
          .from('fm_user_permissions')
          .select(`
            id, user_id, form_id, 
            can_view, can_create, can_edit, can_delete, can_print, can_import, can_export,
            fm_menu_items (title_fa, title_en, form_code)
          `)
          .eq('user_id', user.id);

        if (err1) throw err1;
        setDirectPermissions(direct || []);

        const { data: userRoles, error: err2 } = await supabase
          .from('fm_user_roles')
          .select('role_id')
          .eq('user_id', user.id);

        if (err2) throw err2;
        const roleIds = (userRoles || []).map(r => r.role_id);

        if (roleIds.length > 0) {
          const { data: inherited, error: err3 } = await supabase
            .from('fm_role_permissions')
            .select(`
              id, role_id, form_id,
              can_view, can_create, can_edit, can_delete, can_print, can_import, can_export,
              fm_roles (name_fa, name_en),
              fm_menu_items (title_fa, title_en, form_code)
            `)
            .in('role_id', roleIds);

          if (err3) throw err3;
          setInheritedPermissions(inherited || []);
        } else {
          setInheritedPermissions([]);
        }
      } catch (err) {
        console.error('Error fetching permissions:', err);
      } finally {
        setLoading(false);
      }
    };

    const handleAddRow = () => {
      const isAlreadyAdding = directPermissions.some(p => p.id.toString().startsWith('temp_'));
      if (isAlreadyAdding) return;

      const newRow = {
        id: 'temp_' + Date.now(),
        user_id: user.id,
        form_id: '',
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_print: false,
        can_import: false,
        can_export: false,
        isNewRow: true,
        fm_menu_items: null
      };
      setDirectPermissions([newRow, ...directPermissions]);
    };

    const handleFormChangeInGrid = (rowId, formId) => {
      const targetForm = formsList.find(f => f.id === formId);
      setDirectPermissions(prev => prev.map(item => {
        if (item.id === rowId) {
          return {
            ...item,
            form_id: formId,
            fm_menu_items: targetForm ? {
              title_fa: targetForm.title_fa,
              title_en: targetForm.title_en,
              form_code: targetForm.form_code
            } : null
          };
        }
        return item;
      }));
    };

    const handleRowKeyPress = (e, row) => {
      if (e.key === 'Enter') {
        if (!row.form_id) return;
        handleOpenDetails(row.form_id, row);
      }
    };

    const handleOpenDetails = (formId, rowRecord) => {
      setSelectedFormId(formId);
      setPermissionDetails({
        can_view: rowRecord.can_view ?? false,
        can_create: rowRecord.can_create ?? false,
        can_edit: rowRecord.can_edit ?? false,
        can_delete: rowRecord.can_delete ?? false,
        can_print: rowRecord.can_print ?? false,
        can_import: rowRecord.can_import ?? false,
        can_export: rowRecord.can_export ?? false
      });
    };

    const handleTogglePermission = (field) => {
      const nextVal = !permissionDetails[field];
      setPermissionDetails(prev => ({ ...prev, [field]: nextVal }));

      setDirectPermissions(prev => prev.map(item => {
        if (item.form_id === selectedFormId) {
          return { ...item, [field]: nextVal };
        }
        return item;
      }));
    };

    const handleSavePermission = async (row) => {
      if (!row.form_id) return;
      setLoading(true);
      try {
        const payload = {
          user_id: user.id,
          form_id: row.form_id,
          can_view: row.can_view,
          can_create: row.can_create,
          can_edit: row.can_edit,
          can_delete: row.can_delete,
          can_print: row.can_print,
          can_import: row.can_import,
          can_export: row.can_export,
          updated_at: new Date().toISOString()
        };

        if (row.id.toString().startsWith('temp_')) {
          const { error } = await supabase.from('fm_user_permissions').insert([payload]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('fm_user_permissions').update(payload).eq('id', row.id);
          if (error) throw error;
        }
        fetchUserPermissions();
      } catch (err) {
        console.error('Error saving permission:', err);
      } finally {
        setLoading(false);
      }
    };

    const handleDeletePermission = async (row) => {
      if (row.id.toString().startsWith('temp_')) {
        if (selectedFormId === row.form_id) {
          setSelectedFormId(null);
        }
        setDirectPermissions(prev => prev.filter(item => item.id !== row.id));
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.from('fm_user_permissions').delete().eq('id', row.id);
        if (error) throw error;
        if (selectedFormId === row.form_id) {
          setSelectedFormId(null);
        }
        fetchUserPermissions();
      } catch (err) {
        console.error('Error deleting permission:', err);
        setLoading(false);
      }
    };

    const directColumns = [
      {
        field: 'form_id',
        header_fa: 'فرم / منو',
        header_en: 'Form / Menu',
        width: '240px',
        render: (val, row) => {
          if (row.id.toString().startsWith('temp_')) {
            const availableForms = formsList.filter(f => 
              !directPermissions.some(p => p.form_id === f.id && p.id !== row.id)
            );
            return (
              <div onKeyDown={(e) => handleRowKeyPress(e, row)} className="w-full">
                <SelectField
                  size="sm"
                  options={availableForms.map(f => ({ label: isRtl ? f.title_fa : f.title_en, value: f.id }))}
                  value={val}
                  onChange={(v) => handleFormChangeInGrid(row.id, v)}
                  isRtl={isRtl}
                  placeholder={t('انتخاب فرم...', 'Select Form...')}
                  wrapperClassName="!m-0 w-full"
                  formCode={FORM_CODE}
                />
              </div>
            );
          }
          return <span className="font-bold text-slate-700 dark:text-slate-200">{isRtl ? row.fm_menu_items?.title_fa : row.fm_menu_items?.title_en}</span>;
        }
      },
      {
        field: 'form_code',
        header_fa: 'کد فرم',
        header_en: 'Form Code',
        width: '140px',
        render: (val, row) => <span className="text-slate-400 font-mono text-[11px]">{row.fm_menu_items?.form_code || '-'}</span>
      },
      {
        field: 'summary',
        header_fa: 'خلاصه دسترسی',
        header_en: 'Access Summary',
        width: '280px',
        render: (val, row) => {
          const list = [];
          if (row.can_view) list.push(t('مشاهده', 'View'));
          if (row.can_create) list.push(t('ایجاد', 'Create'));
          if (row.can_edit) list.push(t('ویرایش', 'Edit'));
          if (row.can_delete) list.push(t('حذف', 'Delete'));
          if (row.can_print) list.push(t('چاپ', 'Print'));
          if (row.can_import) list.push(t('ورود', 'Import'));
          if (row.can_export) list.push(t('خروج', 'Export'));

          if (list.length === 0) return <span className="text-slate-400 text-[10px]">{t('بدون دسترسی', 'No Access')}</span>;
          return (
            <div className="flex flex-wrap gap-0.5">
              {list.map((lbl, idx) => (
                <Badge key={idx} variant="indigo" size="sm" className="text-[9px] px-1 py-0">{lbl}</Badge>
              ))}
            </div>
          );
        }
      }
    ];

    const inheritedColumns = [
      {
        field: 'role_name',
        header_fa: 'نقش موروثی',
        header_en: 'Inherited Role',
        width: '150px',
        render: (val, row) => <Badge variant="slate" size="sm" className="font-bold">{isRtl ? row.fm_roles?.name_fa : row.fm_roles?.name_en}</Badge>
      },
      {
        field: 'form_title',
        header_fa: 'فرم / منو',
        header_en: 'Form / Menu',
        width: '200px',
        render: (val, row) => <span className="text-slate-700 dark:text-slate-300">{isRtl ? row.fm_menu_items?.title_fa : row.fm_menu_items?.title_en}</span>
      },
      {
        field: 'rights',
        header_fa: 'مجوزها',
        header_en: 'Permissions',
        width: '300px',
        render: (val, row) => {
          const rights = [];
          if (row.can_view) rights.push(t('مشاهده', 'View'));
          if (row.can_create) rights.push(t('ایجاد', 'Create'));
          if (row.can_edit) rights.push(t('ویرایش', 'Edit'));
          if (row.can_delete) rights.push(t('حذف', 'Delete'));
          if (row.can_print) rights.push(t('چاپ', 'Print'));
          if (row.can_import) rights.push(t('ورود', 'Import'));
          if (row.can_export) rights.push(t('خروج', 'Export'));
          return (
            <div className="flex flex-wrap gap-0.5">
              {rights.map((r, i) => <Badge key={i} variant="emerald" size="sm" className="text-[9px] px-1 py-0">{r}</Badge>)}
              {rights.length === 0 && <span className="text-slate-400 text-[10px]">-</span>}
            </div>
          );
        }
      }
    ];

    const targetFormRecord = formsList.find(f => f.id === selectedFormId);

    return (
      <div className="flex flex-col h-[620px] bg-slate-50 dark:bg-slate-900/40 p-1" dir={isRtl ? 'rtl' : 'ltr'}>
        
        {/* User Info Bar */}
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
              <Key size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="text-[12px] font-black text-slate-800 dark:text-slate-100">{user?.display_name || user?.username}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{user?.email}</div>
            </div>
          </div>
          <Badge variant={user?.is_active ? 'emerald' : 'rose'} size="sm">
            {user?.is_active ? t('کاربر فعال', 'Active User') : t('غیرفعال', 'Inactive')}
          </Badge>
        </div>

        {/* Content Tabs / Split Configuration */}
        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          
          {/* Main List Management Side */}
          <div className={`${selectedFormId ? 'col-span-8' : 'col-span-12'} flex flex-col gap-3 min-h-0 transition-all duration-300`}>
            
            {/* Direct Permissions Block */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700/50">
                <div className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Shield size={13} className="text-indigo-500" />
                  {t('سطوح دسترسی مستقیم (کاربر فراتر از نقش)', 'Direct Explicit Permissions')}
                </div>
                <Button variant="primary" size="sm" icon={Plus} onClick={handleAddRow} disabled={loading}>
                  {t('دسترسی جدید', 'New Permission')}
                </Button>
              </div>

              <div className="flex-1 min-h-0">
                <DataGrid
                  data={directPermissions}
                  columns={directColumns}
                  language={language}
                  isLoading={loading}
                  compact={true}
                  actions={[
                    { 
                      icon: Eye, 
                      tooltip: t('مشاهده و ویرایش جزئیات مجوزها', 'View/Edit Permission Details'), 
                      onClick: (row) => {
                        if (!row.form_id) return;
                        handleOpenDetails(row.form_id, row);
                      },
                      className: 'text-slate-400 hover:text-indigo-600',
                      disabled: (row) => !row.form_id
                    },
                    { 
                      icon: Save, 
                      tooltip: t('ذخیره ردیف', 'Save Row'), 
                      onClick: (row) => handleSavePermission(row), 
                      className: 'text-emerald-500 hover:text-emerald-700',
                      disabled: (row) => !row.form_id 
                    },
                    { 
                      icon: Trash2, 
                      tooltip: t('حذف دسترسی', 'Delete Access'), 
                      onClick: (row) => handleDeletePermission(row), 
                      className: 'text-slate-400 hover:text-rose-600' 
                    }
                  ]}
                />
              </div>
            </div>

            {/* Inherited Roles Block */}
            <div className="h-[180px] flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-3">
              <div className="text-[11px] font-black text-slate-400 uppercase pb-2 mb-2 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-1.5">
                <ShieldAlert size={13} />
                {t('دسترسى‌های کسب شده از طریق نقش‌ها (موروثی)', 'Inherited Permissions from Roles')}
              </div>
              <div className="flex-1 min-h-0">
                <DataGrid
                  data={inheritedPermissions}
                  columns={inheritedColumns}
                  language={language}
                  isLoading={loading}
                  compact={true}
                />
              </div>
            </div>

          </div>

          {/* Details Setting Side - Rendered dynamically ONLY when selectedFormId has value */}
          {selectedFormId && (
            <div className="col-span-4 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-slate-700 shadow-md flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-200">
              <div className="p-3 bg-indigo-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{t('تنظیم دقیق عملیات', 'Fine-tune Operations')}</div>
                  <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate mt-0.5">
                    {targetFormRecord ? (isRtl ? targetFormRecord.title_fa : targetFormRecord.title_en) : t('انتخاب نشده', 'Not Selected')}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="!w-6 !h-6 !p-0 text-slate-400 hover:text-slate-600" icon={X} onClick={() => setSelectedFormId(null)} />
              </div>

              <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                <CheckboxField size="sm" label={t('امکان مشاهده منو و داده‌ها (View)', 'Can View Form & Records')} checked={permissionDetails.can_view} onChange={() => handleTogglePermission('can_view')} isRtl={isRtl} formCode={FORM_CODE} />
                <CheckboxField size="sm" label={t('امکان ثبت رکورد جدید (Create)', 'Can Insert New Data')} checked={permissionDetails.can_create} onChange={() => handleTogglePermission('can_create')} isRtl={isRtl} formCode={FORM_CODE} />
                <CheckboxField size="sm" label={t('امکان ویرایش اطلاعات (Edit)', 'Can Update Existing Data')} checked={permissionDetails.can_edit} onChange={() => handleTogglePermission('can_edit')} isRtl={isRtl} formCode={FORM_CODE} />
                <CheckboxField size="sm" label={t('امکان حذف اطلاعات (Delete)', 'Can Remove Data Records')} checked={permissionDetails.can_delete} onChange={() => handleTogglePermission('can_delete')} isRtl={isRtl} formCode={FORM_CODE} />
                <CheckboxField size="sm" label={t('امکان چاپ و گزارش‌گیری (Print)', 'Can Print & Export Reports')} checked={permissionDetails.can_print} onChange={() => handleTogglePermission('can_print')} isRtl={isRtl} formCode={FORM_CODE} />
                <CheckboxField size="sm" label={t('امکان ورود اطلاعات گروهی (Import)', 'Can Import CSV/Excel Files')} checked={permissionDetails.can_import} onChange={() => handleTogglePermission('can_import')} isRtl={isRtl} formCode={FORM_CODE} />
                <CheckboxField size="sm" label={t('امکان خروجی داده‌ها (Export)', 'Can Export Data Formats')} checked={permissionDetails.can_export} onChange={() => handleTogglePermission('can_export')} isRtl={isRtl} formCode={FORM_CODE} />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={Save} 
                  onClick={() => {
                    const matchedRow = directPermissions.find(p => p.form_id === selectedFormId);
                    if (matchedRow) handleSavePermission(matchedRow);
                  }}
                  disabled={loading}
                >
                  {t('ثبت مجوزها', 'Apply Actions')}
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700 mt-3 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-inner">
          <Button variant="outline" size="sm" onClick={onClose}>{t('بستن پنجره', 'Close')}</Button>
        </div>
      </div>
    );
  };

  window.UserAccess = UserAccess;
})();