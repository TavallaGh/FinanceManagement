/* Filename: financial/BalanceGroupDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { Edit = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon, X = FallbackIcon, AlertTriangle = FallbackIcon, Users = FallbackIcon } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Button = DS.Button || window.DSCore?.Button || (() => null);
  const Modal = DS.Modal || window.DSFeedback?.Modal || window.DSCore?.Modal || (() => null);
  const DataGrid = DS.DataGrid || window.DSGrid?.DataGrid || (() => null);
  const LOVField = DS.LOVField || window.DSGrid?.LOVField || (() => null);
  const ToggleField = DS.ToggleField || window.DSForms?.ToggleField || (() => null);
  const SelectField = DS.SelectField || window.DSForms?.SelectField || (() => null);
  const DatePicker = DS.DatePicker || window.DSForms?.DatePicker || (() => null);
  const Badge = DS.Badge || window.DSCore?.Badge || (() => null);
  const Tabs = DS.Tabs || window.DSCore?.Tabs || (() => null);
  const EmptyState = DS.EmptyState || window.DSCore?.EmptyState || (() => null);
  const Toast = DS.Toast || window.DSFeedback?.Toast || (() => null);

  const supabase = window.supabase;

  const BalanceGroupDetails = ({ config, onClose, lookups, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const { isOpen, type, group } = config;
    const { leafAccounts, users, roles, userRoles, lovAccountColumns } = lookups;

    const [modalLoading, setModalLoading] = useState(false);
    const [accessViewMode, setAccessViewMode] = useState('assign');
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, targetType: null, type: null, data: null });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [importErrors, setImportErrors] = useState({ isOpen: false, errors: [], successCount: 0 });

    // Arrays
    const [groupAccounts, setGroupAccounts] = useState([]);
    const [groupAccesses, setGroupAccesses] = useState([]);

    // Inline Edits
    const [inlineAccountEdit, setInlineAccountEdit] = useState(null);
    const [inlineAccessEdit, setInlineAccessEdit] = useState(null);

    const globalMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';
    const formatDate = (val) => val && window.DSCore?.formatGlobalDate ? window.DSCore.formatGlobalDate(val, globalMode) : val;

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    useEffect(() => {
      if (isOpen && group) {
        if (type === 'accounts') fetchGroupAccounts();
        if (type === 'access') fetchGroupAccess();
      } else {
        setInlineAccountEdit(null);
        setInlineAccessEdit(null);
        setAccessViewMode('assign');
      }
    }, [isOpen, type, group]);

    // ----------------------------------------------------------------------
    // Accounts Logic
    // ----------------------------------------------------------------------
    const fetchGroupAccounts = async () => {
      setModalLoading(true);
      try {
        const { data, error } = await supabase.from('fm_balance_group_accounts')
          .select(`id, group_id, account_id, valid_from, valid_to, is_active, fm_coa_accounts ( code, title_fa, chart_id )`)
          .eq('group_id', group.id)
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
      setInlineAccountEdit({ id: 'new', data: { account_id: '', account_obj: null, valid_from: new Date().toISOString().split('T')[0], valid_to: '', is_active: true } });
    };

    const handleEditAccountClick = (row) => {
      if (inlineAccountEdit) return;
      const accObj = leafAccounts.find(a => String(a.id) === String(row.account_id)) || null;
      setInlineAccountEdit({ id: row.id, data: { account_id: row.account_id, account_obj: accObj, valid_from: row.valid_from, valid_to: row.valid_to || '', is_active: row.is_active } });
    };

    const handleSaveAccountInline = async () => {
      const form = inlineAccountEdit.data;
      if (!form.account_id || !form.valid_from) return;
      
      if (inlineAccountEdit.id === 'new' && groupAccounts.some(a => String(a.account_id) === String(form.account_id))) {
         showToast(t('این حساب قبلاً به گروه افزوده شده است.', 'This account is already added to the group.'), 'error');
         return;
      }

      setModalLoading(true);
      try {
        const payload = {
          group_id: group.id,
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
        fetchGroupAccounts();
        showToast(t('حساب با موفقیت ذخیره شد.', 'Account saved successfully.'));
      } catch (error) {
        showToast(t('خطا در ذخیره حساب', 'Error saving account'), 'error');
      } finally {
        setModalLoading(false);
      }
    };

    const handleDownloadSample = () => {
      const headers = isRtl
        ? 'کد حساب,اسم حساب,تاریخ شروع (YYYY-MM-DD یا YYYY/MM/DD شمسی),تاریخ پایان (YYYY-MM-DD یا YYYY/MM/DD شمسی),وضعیت (1 فعال / 0 غیرفعال)'
        : 'Account Code,Account Name,Valid From (YYYY-MM-DD or Jalali YYYY/MM/DD),Valid To (YYYY-MM-DD or Jalali YYYY/MM/DD),Status (1 Active / 0 Inactive)';

      const sampleRow1 = isRtl
        ? '1101001,,1403/01/01,,1'
        : '1101001,,2024-03-20,,1';

      const sampleRow2 = isRtl
        ? ',موجودی نقد,1403/01/01,,1'
        : ',Cash and Cash Equivalents,2024-03-20,,1';

      const csv = '\uFEFF' + headers + '\n' + sampleRow1 + '\n' + sampleRow2;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'BalanceGroup_Accounts_Sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const jalaliToIso = (jy, jm, jd) => {
      const jy2 = jy - 979, jm2 = jm - 1, jd2 = jd - 1;
      let j_dn = 365 * jy2 + Math.floor(jy2 / 4) * 8 - Math.floor(jy2 / 100) + Math.floor(jy2 / 400);
      for (let i = 0; i < jm2; i++) j_dn += [31,31,31,31,31,31,30,30,30,30,30,29][i];
      j_dn += jd2;
      let g_dn = j_dn + 79;
      let gy = 1600 + 400 * Math.floor(g_dn / 146097);
      g_dn %= 146097;
      let leap = true;
      if (g_dn >= 36525) { g_dn--; gy += 100 * Math.floor(g_dn / 36524); g_dn %= 36524; if (g_dn >= 365) g_dn++; else leap = false; }
      gy += 4 * Math.floor(g_dn / 1461); g_dn %= 1461;
      if (g_dn >= 366) { leap = false; g_dn--; gy += Math.floor(g_dn / 365); g_dn %= 365; }
      const gml = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      let gm = 0;
      for (; gm < 12; gm++) { if (g_dn < gml[gm]) break; g_dn -= gml[gm]; }
      return `${gy}-${String(gm + 1).padStart(2, '0')}-${String(g_dn + 1).padStart(2, '0')}`;
    };

    const parseImportDate = (dateStr) => {
      if (!dateStr) return null;
      const str = dateStr.trim();
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
          const [p0, p1, p2] = parts.map(Number);
          if (p0 >= 1300 && p0 <= 1600) return jalaliToIso(p0, p1, p2);
        }
        return str.replace(/\//g, '-');
      }
      return str;
    };

    const handleImport = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = window.XLSX;
          if (!XLSX) {
            showToast(t('کتابخانه پردازش فایل در دسترس نیست.', 'File processing library not available.'), 'error');
            return;
          }
          const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          if (allRows.length < 2) {
            showToast(t('فایل خالی است یا فرمت صحیح ندارد.', 'File is empty or has invalid format.'), 'error');
            return;
          }
          const toInsert = [];
          const errors = [];
          for (let i = 1; i < allRows.length; i++) {
            const cols = allRows[i].map(c => String(c ?? '').trim());
            const accountCode = cols[0]?.trim();
            const accountName = cols[1]?.trim();
            const validFrom   = cols[2]?.trim();
            const validTo     = cols[3]?.trim();
            const isActiveRaw = cols[4]?.trim();
            const rowLabel = t(`ردیف ${i + 1}`, `Row ${i + 1}`);
            if (!accountCode && !accountName) {
              errors.push(t(`${rowLabel}: کد یا اسم حساب الزامی است.`, `${rowLabel}: Account code or name is required.`));
              continue;
            }
            if (!validFrom) {
              errors.push(t(`${rowLabel}: تاریخ شروع الزامی است.`, `${rowLabel}: Valid From is required.`));
              continue;
            }
            let account = null;
            if (accountCode) {
              account = leafAccounts.find(a => String(a.code).trim() === accountCode);
              if (!account) {
                errors.push(t(`${rowLabel}: حسابی با کد «${accountCode}» یافت نشد.`, `${rowLabel}: No account found with code "${accountCode}".`));
                continue;
              }
            } else {
              const matches = leafAccounts.filter(a => a.title_fa && a.title_fa.trim() === accountName);
              if (matches.length === 0) {
                errors.push(t(`${rowLabel}: حسابی با اسم «${accountName}» یافت نشد.`, `${rowLabel}: No account found with name "${accountName}".`));
                continue;
              }
              if (matches.length > 1) {
                errors.push(t(`${rowLabel}: چند حساب با اسم «${accountName}» یافت شد. لطفاً کد حساب را وارد کنید.`, `${rowLabel}: Multiple accounts match "${accountName}". Please use account code.`));
                continue;
              }
              account = matches[0];
            }
            if (groupAccounts.some(a => String(a.account_id) === String(account.id))) {
              errors.push(t(`${rowLabel}: حساب «${account.code}» قبلاً در این گروه وجود دارد.`, `${rowLabel}: Account "${account.code}" already exists in this group.`));
              continue;
            }
            toInsert.push({
              group_id: group.id,
              account_id: account.id,
              valid_from: parseImportDate(validFrom),
              valid_to: parseImportDate(validTo) || null,
              is_active: isActiveRaw === '0' ? false : true
            });
          }
          if (toInsert.length === 0) {
            showToast(errors.length > 0 ? errors[0] : t('رکورد معتبری برای درج یافت نشد.', 'No valid records to import.'), 'error');
            return;
          }
          setModalLoading(true);
          try {
            const { error } = await supabase.from('fm_balance_group_accounts').insert(toInsert);
            if (error) throw error;
            fetchGroupAccounts();
            if (errors.length > 0) {
              setImportErrors({ isOpen: true, errors, successCount: toInsert.length });
            } else {
              showToast(t(`${toInsert.length} رکورد با موفقیت وارد شد.`, `${toInsert.length} record(s) imported successfully.`), 'success');
            }
          } catch (err) {
            showToast(t('خطا در ذخیره اطلاعات وارد شده.', 'Error saving imported data.'), 'error');
          } finally {
            setModalLoading(false);
          }
        } catch (err) {
          showToast(t('خطا در خواندن فایل.', 'Error reading file.'), 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    };

    const accountGridData = useMemo(() => {
       const data = [...groupAccounts];
       if (inlineAccountEdit && inlineAccountEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineAccountEdit.data });
       return data;
    }, [groupAccounts, inlineAccountEdit]);

    // ----------------------------------------------------------------------
    // Access Logic
    // ----------------------------------------------------------------------
    const fetchGroupAccess = async () => {
      setModalLoading(true);
      try {
        const { data, error } = await supabase.from('fm_balance_group_access').select('*').eq('group_id', group.id);
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
      setInlineAccessEdit({ id: 'new', data: { grantee_type: 'USER', grantee_id: '', grantee_obj: null } });
    };

    const handleSaveAccessInline = async () => {
      const form = inlineAccessEdit.data;
      if (!form.grantee_id) return;

      if (inlineAccessEdit.id === 'new' && groupAccesses.some(a => a.grantee_type?.toUpperCase() === form.grantee_type?.toUpperCase() && String(a.grantee_id) === String(form.grantee_id))) {
         showToast(t('این دسترسی قبلاً افزوده شده است.', 'This access is already added.'), 'error');
         return;
      }

      setModalLoading(true);
      try {
        const payload = {
          group_id: group.id,
          grantee_type: form.grantee_type,
          grantee_id: form.grantee_id
        };
        const { error } = await supabase.from('fm_balance_group_access').insert([payload]);
        if (error) throw error;
        
        setInlineAccessEdit(null);
        fetchGroupAccess();
        showToast(t('دسترسی با موفقیت ذخیره شد.', 'Access saved successfully.'));
      } catch (error) {
        showToast(t('خطا در ذخیره دسترسی', 'Error saving access'), 'error');
      } finally {
        setModalLoading(false);
      }
    };

    const accessGridData = useMemo(() => {
       const data = [...groupAccesses];
       if (inlineAccessEdit && inlineAccessEdit.id === 'new') data.unshift({ id: 'new', _isNew: true, ...inlineAccessEdit.data });
       return data;
    }, [groupAccesses, inlineAccessEdit]);

    const availableAccountsForLov = useMemo(() => {
      const existingIds = new Set(
        groupAccounts
          .filter(a => inlineAccountEdit?.id === 'new' || String(a.id) !== String(inlineAccountEdit?.id))
          .map(a => String(a.account_id))
      );
      return leafAccounts.filter(a => !existingIds.has(String(a.id)));
    }, [leafAccounts, groupAccounts, inlineAccountEdit?.id]);

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
        if (directPerm) reasons.push(t('دسترسی مستقیم', 'Direct Access'));

        const userRoleIds = userRoles.filter(m => String(m.user_id) === String(user.id)).map(m => String(m.role_id));
        const rolePerms = groupAccesses.filter(p => p.grantee_type?.toLowerCase() === 'role' && userRoleIds.includes(String(p.grantee_id)));

        rolePerms.forEach(rp => {
          const roleObj = roles.find(r => String(r.id) === String(rp.grantee_id));
          const rTitle = roleObj ? (roleObj.title || roleObj.code) : t('نقش سیستمی', 'System Role');
          reasons.push(`${t('ارث‌بری از نقش:', 'Inherited via Role:')} ${rTitle}`);
        });

        if (reasons.length > 0) {
          result.push({ id: user.id, username: user.username || user.email || '---', full_name: user.full_name, sources: reasons });
        }
      });
      return result;
    }, [groupAccesses, accessViewMode, users, roles, userRoles, t]);

    // ----------------------------------------------------------------------
    // Common Delete
    // ----------------------------------------------------------------------
    const executeDelete = async () => {
      setModalLoading(true);
      try {
        const { targetType, type, data } = deleteConfirm;
        const table = targetType === 'account' ? 'fm_balance_group_accounts' : 'fm_balance_group_access';

        if (type === 'single') {
          const { error } = await supabase.from(table).delete().eq('id', data.id);
          if (error) throw error;
        } else if (type === 'bulk') {
          const { error } = await supabase.from(table).delete().in('id', data);
          if (error) throw error;
        }

        setDeleteConfirm({ isOpen: false, targetType: null, type: null, data: null });
        if (targetType === 'account') fetchGroupAccounts();
        if (targetType === 'access') fetchGroupAccess();
        showToast(t('عملیات حذف با موفقیت انجام شد.', 'Deletion completed successfully.'));
      } catch (err) {
        showToast(t('خطا در حذف اطلاعات.', 'Error deleting data.'), 'error');
      } finally {
        setModalLoading(false);
      }
    };

    // ----------------------------------------------------------------------
    // Columns & Actions
    // ----------------------------------------------------------------------
    const accountColumns = [
      {
        field: '_date_validity', header_fa: 'اعتبار', header_en: 'Validity', width: '90px',
        exportValue: (_, row) => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const parseDate = (s) => { if (!s) return null; const d = new Date(s.replace(/\//g, '-')); return isNaN(d.getTime()) ? null : d; };
          const isInvalid = (parseDate(row.valid_from) > today) || (parseDate(row.valid_to) && parseDate(row.valid_to) < today);
          return isInvalid ? (isRtl ? 'نامعتبر' : 'Invalid') : (isRtl ? 'معتبر' : 'Valid');
        },
        render: (_, row) => {
          if (inlineAccountEdit?.id === row.id || row._isNew) return null;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const parseDate = (s) => { if (!s) return null; const d = new Date(s.replace(/\//g, '-')); return isNaN(d.getTime()) ? null : d; };
          const startD = parseDate(row.valid_from);
          const endD = parseDate(row.valid_to);
          const isInvalid = (startD && startD > today) || (endD && endD < today);
          return <Badge variant={isInvalid ? 'rose' : 'emerald'} size="sm" className="text-[10px]">{isInvalid ? t('نامعتبر', 'Invalid') : t('معتبر', 'Valid')}</Badge>;
        }
      },
      { 
        field: 'account', header_fa: 'کد حساب', header_en: 'Account Code', width: 'auto',
        exportValue: (_, row) => row.fm_coa_accounts?.code || '',
        render: (_, row) => {
          if (inlineAccountEdit?.id === row.id) {
             return (
               <div onClick={(e)=>e.stopPropagation()}>
                 <LOVField 
                   size="sm" data={availableAccountsForLov} columns={lovAccountColumns} dropdownWidth="min-w-[650px]"
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
      { field: '_acc_title', header_fa: 'نام حساب', header_en: 'Account Name', exportOnly: true, exportValue: (_, row) => row.fm_coa_accounts?.title_fa || '' },
      { 
        field: 'valid_from', header_fa: 'از تاریخ', header_en: 'Valid From', width: '140px', 
        render: (val, row) => {
          if (inlineAccountEdit?.id === row.id) {
             return <div onClick={(e)=>e.stopPropagation()}><DatePicker size="sm" value={inlineAccountEdit.data.valid_from} onChange={(v) => setInlineAccountEdit(prev => ({...prev, data: {...prev.data, valid_from: v}}))} isRtl={isRtl} /></div>
          }
          return <span className="text-[12px]" dir="ltr">{formatDate(val)}</span>;
        }
      },
      { 
        field: 'valid_to', header_fa: 'تا تاریخ', header_en: 'Valid To', width: '140px', 
        render: (val, row) => {
          if (inlineAccountEdit?.id === row.id) {
             return <div onClick={(e)=>e.stopPropagation()}><DatePicker size="sm" value={inlineAccountEdit.data.valid_to} onChange={(v) => setInlineAccountEdit(prev => ({...prev, data: {...prev.data, valid_to: v}}))} isRtl={isRtl} /></div>
          }
          return val ? <span className="text-[12px]" dir="ltr">{formatDate(val)}</span> : <span className="text-[10px] text-slate-400">{t('تا کنون', 'Present')}</span>;
        } 
      },
      { 
        field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '80px', 
        render: (val, row) => {
          if (inlineAccountEdit?.id === row.id) {
             return <div onClick={(e)=>e.stopPropagation()}><ToggleField size="sm" checked={inlineAccountEdit.data.is_active} onChange={v => setInlineAccountEdit(prev => ({...prev, data: {...prev.data, is_active: v}}))} isRtl={isRtl} /></div>
          }
          return <Badge variant={val ? 'emerald' : 'slate'} size="sm" className="text-[10px]">{val ? t('فعال', 'Active') : t('غیرفعال', 'Inactive')}</Badge>;
        }
      }
    ];

    const accountActions = [
      { icon: Save, tooltip: t('ذخیره', 'Save'), hidden: (row) => inlineAccountEdit?.id !== row.id, onClick: (row) => handleSaveAccountInline(row), className: '!text-emerald-600 hover:!text-emerald-800' },
      { icon: X, tooltip: t('انصراف', 'Cancel'), hidden: (row) => inlineAccountEdit?.id !== row.id, onClick: () => setInlineAccountEdit(null), className: '!text-slate-500 hover:!text-slate-700' },
      { icon: Edit, tooltip: t('ویرایش', 'Edit'), hidden: (row) => inlineAccountEdit?.id === row.id || row._isNew, onClick: (row) => handleEditAccountClick(row), className: 'hover:text-indigo-600 text-slate-400' },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), hidden: (row) => inlineAccountEdit?.id === row.id || row._isNew, onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', targetType: 'account', data: row }), className: 'hover:text-red-600 text-slate-400' }
    ];

    const accountBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', targetType: 'account', data: ids }) }
    ];

    const accessColumns = [
      { 
        field: 'grantee_type', header_fa: 'نوع دسترسی', header_en: 'Type', width: '150px', 
        render: (val, row) => {
          if (inlineAccessEdit?.id === row.id) {
             return (
               <div onClick={(e)=>e.stopPropagation()}>
                 <SelectField size="sm" options={[{value:'USER', label:t('کاربر سیستم', 'User')}, {value:'ROLE', label:t('نقش سیستمی', 'Role')}]}
                   value={inlineAccessEdit.data.grantee_type} 
                   onChange={(e) => setInlineAccessEdit(prev => ({...prev, data: {...prev.data, grantee_type: e.target.value, grantee_id: '', grantee_obj: null}}))} isRtl={isRtl} />
               </div>
             )
          }
          const normVal = val?.toLowerCase();
          return <Badge variant={normVal === 'user' ? 'indigo' : 'emerald'} size="sm" className="text-[10px]">{normVal === 'user' ? t('کاربر', 'User') : t('نقش', 'Role')}</Badge>;
        }
      },
      { 
        field: 'grantee_id', header_fa: 'شخص / نقش', header_en: 'Grantee', width: 'auto', 
        render: (val, row) => {
          if (inlineAccessEdit?.id === row.id) {
            const isUser = inlineAccessEdit.data.grantee_type?.toLowerCase() === 'user';
            return (
              <div onClick={(e)=>e.stopPropagation()}>
                <LOVField size="sm" data={isUser ? availableUsersForAccess : availableRolesForAccess} 
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
      { icon: Save, tooltip: t('ذخیره', 'Save'), hidden: (row) => inlineAccessEdit?.id !== row.id, onClick: (row) => handleSaveAccessInline(row), className: '!text-emerald-600 hover:!text-emerald-800' },
      { icon: X, tooltip: t('انصراف', 'Cancel'), hidden: (row) => inlineAccessEdit?.id !== row.id, onClick: () => setInlineAccessEdit(null), className: '!text-slate-500 hover:!text-slate-700' },
      { icon: Trash2, tooltip: t('حذف', 'Delete'), hidden: (row) => inlineAccessEdit?.id === row.id || row._isNew, onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', targetType: 'access', data: row }), className: 'hover:text-red-600 text-slate-400' }
    ];

    const accessBulkActions = [
      { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', targetType: 'access', data: ids }) }
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
      { field: 'username', header_fa: 'نام کاربری', width: '150px', render: (val) => <span className="text-[12px] text-slate-600 dark:text-slate-400" dir="ltr">{val}</span> },
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

    if (!isOpen) return null;

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={type === 'accounts' ? `${t('مدیریت حساب‌های مرتبط', 'Manage Accounts')} - ${group?.title_fa || ''}` : `${t('مدیریت دسترسی‌ها', 'Manage Access')} - ${group?.title_fa || ''}`} width={type === 'accounts' ? "max-w-6xl" : "max-w-4xl"} language={language}>
        <div className="flex flex-col h-[70vh] min-h-[500px] bg-slate-50 dark:bg-slate-900 p-4 gap-3">
          
          {type === 'accounts' && (
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
              <DataGrid 
                data={accountGridData} columns={accountColumns} actions={accountActions} bulkActions={accountBulkActions}
                selectable={true} language={language} isLoading={modalLoading} onAdd={handleAddAccountClick}
                onImport={handleImport} onDownloadSample={handleDownloadSample}
              />
            </div>
          )}

          {type === 'access' && (
            <>
              <Tabs tabs={accessTabs} activeTab={accessViewMode} onChange={setAccessViewMode} className="shrink-0" />
              <div className="flex-1 flex flex-col min-h-0">
                {accessViewMode === 'assign' ? (
                  <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <DataGrid 
                      key="grid-assign" 
                      data={accessGridData} 
                      columns={accessColumns} 
                      actions={accessActions} 
                      bulkActions={accessBulkActions}
                      selectable={true} 
                      language={language} 
                      isLoading={modalLoading} 
                      onAdd={handleAddAccessClick}
                      hideImport={true} 
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <DataGrid 
                      key="grid-aggregate" 
                      data={aggregatedUsersList} 
                      columns={aggregateColumns} 
                      language={language} 
                      isLoading={modalLoading} 
                      hideToolbar={true}
                      hideImport={true} 
                    />
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        <Modal isOpen={importErrors.isOpen} onClose={() => setImportErrors({ isOpen: false, errors: [], successCount: 0 })} title={t('گزارش خطاهای ایمپورت', 'Import Error Report')} language={language} width="max-w-lg">
          <div className="p-4 flex flex-col gap-3">
            {importErrors.successCount > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg px-3 py-2 text-[13px] font-medium border border-emerald-200 dark:border-emerald-800">
                <span>✓</span>
                <span>{t(`${importErrors.successCount} رکورد با موفقیت وارد شد.`, `${importErrors.successCount} record(s) imported successfully.`)}</span>
              </div>
            )}
            <div className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
              {t(`${importErrors.errors.length} ردیف با خطا مواجه شد:`, `${importErrors.errors.length} row(s) had errors:`)}
            </div>
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900">
              {importErrors.errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[12px] text-red-600 dark:text-red-400 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setImportErrors({ isOpen: false, errors: [], successCount: 0 })}>{t('بستن', 'Close')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, targetType: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk' 
              ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
              : t(`آیا از حذف این مورد اطمینان دارید؟`, `Are you sure you want to delete this item?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, targetType: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={modalLoading} className="flex-1">{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>
        
        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </Modal>
    );
  };

  window.BalanceGroupDetails = BalanceGroupDetails;
})();