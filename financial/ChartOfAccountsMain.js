/* Filename: financial/ChartOfAccountsMain.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Network = FallbackIcon, Plus = FallbackIcon, Trash2 = FallbackIcon, Save = FallbackIcon,
    ArrowLeft = FallbackIcon, ArrowRight = FallbackIcon, AlertTriangle = FallbackIcon,
    Lock = FallbackIcon, Shield = FallbackIcon, Info = FallbackIcon, RefreshCw = FallbackIcon,
    X = FallbackIcon, Edit = FallbackIcon
  } = LucideIcons;

  const ChartOfAccountsMain = ({ chart, onBack, language = 'fa', formCode = 'CHART_OF_ACCOUNTS' }) => {
    const FallbackComponent = () => null;

    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, Card = FallbackComponent, Badge = FallbackComponent, Tabs = FallbackComponent } = Core;

    const Forms = window.DSForms || window.DesignSystem || {};
    const { TextField = FallbackComponent, SelectField = FallbackComponent, ToggleField = FallbackComponent } = Forms;

    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent, LOVField = FallbackComponent } = Grid;

    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent, Alert = FallbackComponent } = Feedback;

    const TreeSystem = window.DSTree || window.DesignSystem || {};
    const { Tree = FallbackComponent } = TreeSystem;

    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const access = useMemo(() => {
      const rawActions = securityCtx ? securityCtx.getActions(formCode) : null;
      return rawActions || { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true };
    }, [securityCtx, formCode]);

    const [activeTab, setActiveTab] = useState('details');
    const [accessViewMode, setAccessViewMode] = useState('assign');
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    const [rawAccounts, setRawAccounts] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [isCreatingNode, setIsCreatingNode] = useState(false);
    const [nodeFormData, setNodeFormData] = useState({});
    const [nodeDepth, setNodeDepth] = useState(1);

    const [currencies, setCurrencies] = useState([]);
    const [systemUsers, setSystemUsers] = useState([]);
    const [systemRoles, setSystemRoles] = useState([]);
    const [userRolesMapping, setUserRolesMapping] = useState([]);
    const [systemParties, setSystemParties] = useState([]);

    const [accountPermissions, setAccountPermissions] = useState([]);
    const [inlinePermEdit, setInlinePermEdit] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const logAction = useCallback(async (entityType, recordId, action, details = '') => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: entityType, record_id: String(recordId), action: action, user_name: currentUser, details: details
        }]);
      } catch (err) {
        console.error('Action log failed:', err);
      }
    }, [supabase, currentUser]);

    const safeFetch = async (query) => {
      try {
        const res = await query;
        return res.error ? { data: null, error: res.error } : res;
      } catch (e) {
        return { data: null, error: e };
      }
    };

    const fetchLookups = useCallback(async () => {
      try {
        if (!supabase) return;
        const [currRes, userRes, roleRes, userRoleMapRes, partyRes] = await Promise.all([
          safeFetch(supabase.from('fm_currencies').select('*')),
          safeFetch(supabase.from('sec_users').select('*')),
          safeFetch(supabase.from('sec_roles').select('*')),
          safeFetch(supabase.from('sec_user_roles').select('*')),
          safeFetch(supabase.from('parties').select('id, first_name, last_name, company_name, party_type'))
        ]);

        if (currRes.data) setCurrencies(currRes.data);
        if (userRes.data) setSystemUsers(userRes.data.filter(u => u.is_active !== false));
        if (roleRes.data) setSystemRoles(roleRes.data);
        if (userRoleMapRes.data) setUserRolesMapping(userRoleMapRes.data);
        if (partyRes.data) setSystemParties(partyRes.data);
      } catch (err) {
        console.error('Error fetching lookups:', err);
      }
    }, [supabase]);

    const getNewNodeDepth = useCallback((nodes, parentId) => {
      let depth = 1;
      let currentParentId = parentId;
      while (currentParentId) {
        const pNode = nodes.find(n => String(n.id) === String(currentParentId));
        if (pNode) {
          depth += 1;
          currentParentId = pNode.parentId;
        } else {
          break;
        }
      }
      return depth;
    }, []);

    const suggestNextCode = useCallback((nodes, parentId, depth, currentChart) => {
      const siblings = nodes.filter(n => String(n.parentId || '') === String(parentId || ''));
      let parentPrefix = '';
      if (parentId) {
        const pNode = nodes.find(n => String(n.id) === String(parentId));
        if (pNode) parentPrefix = pNode.code || '';
      }

      let segmentLength = parseInt(currentChart.len_group || 1, 10);
      if (depth === 2) segmentLength = parseInt(currentChart.len_general || 2, 10);
      if (depth === 3) segmentLength = parseInt(currentChart.len_subsidiary || 3, 10);
      if (depth === 4) segmentLength = parseInt(currentChart.len_detail || 4, 10);

      let maxSuffixNum = 0;
      siblings.forEach(s => {
        const sCode = s.code || '';
        if (sCode.startsWith(parentPrefix)) {
          const suffix = sCode.substring(parentPrefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxSuffixNum) {
            maxSuffixNum = num;
          }
        }
      });

      const nextNumStr = String(maxSuffixNum + 1).padStart(segmentLength, '0');
      return parentPrefix + nextNumStr;
    }, []);

    const fetchDesignerData = useCallback(async (retainNodeId = null) => {
      if (!chart) return;
      try {
        if (!supabase) return;
        const [accRes, permRes] = await Promise.all([
          supabase.from('fm_coa_accounts').select('*').eq('chart_id', chart.id).order('code', { ascending: true }),
          supabase.from('fm_coa_permissions').select('*')
        ]);

        if (accRes.error) throw accRes.error;

        const mapped = (accRes.data || []).map(a => ({
          id: a.id,
          parentId: a.parent_id,
          code: a.code,
          titleFa: a.title_fa,
          titleEn: a.title_en,
          title: isRtl ? a.title_fa : (a.title_en || a.title_fa),
          currencyId: a.currency_id,
          isActive: a.is_active,
          accountType: a.account_type,
          controlInventory: a.control_inventory
        }));

        const isChainInactive = (pId, list) => {
          if (!pId) return false;
          const parent = list.find(l => String(l.id) === String(pId));
          if (!parent) return false;
          if (!parent.isActive) return true;
          return isChainInactive(parent.parentId, list);
        };

        mapped.forEach(m => {
          const base = isRtl ? `${m.code} - ${m.titleFa}` : `${m.code} - ${m.titleEn || m.titleFa}`;
          const isParentDead = isChainInactive(m.parentId, mapped);
          if (!m.isActive || isParentDead) {
            m.title = `${base} ${t('(غیرفعال)', '(Inactive)')}`;
          }
        });

        setRawAccounts(mapped);
        if (permRes.data) {
          setAccountPermissions(permRes.data);
        }

        if (retainNodeId) {
          const match = mapped.find(m => String(m.id) === String(retainNodeId));
          if (match) {
            setSelectedNodeId(match.id);
            setNodeFormData({ ...match });
            setNodeDepth(getNewNodeDepth(mapped, match.parentId));
            setIsCreatingNode(false);
          }
        }
      } catch (err) {
        showToast(t('خطا در بارگذاری ساختار کدینگ', 'Error loading account codes'), 'error');
      }
    }, [chart, supabase, getNewNodeDepth, showToast, t, isRtl]);

    useEffect(() => {
      if (access.canView) {
        fetchLookups();
        fetchDesignerData();
      }
    }, [fetchLookups, fetchDesignerData, access.canView]);

    const handleSelectTreeNode = (node) => {
      setSelectedNodeId(node.id);
      setNodeFormData({ ...node });
      setIsCreatingNode(false);
      setInlinePermEdit(null);
      setNodeDepth(getNewNodeDepth(rawAccounts, node.parentId));
    };

    const handleAddTreeRoot = () => {
      if (!access.canCreate) return;
      const suggested = suggestNextCode(rawAccounts, null, 1, chart);
      setSelectedNodeId(null);
      setNodeDepth(1);
      setNodeFormData({ code: suggested, titleFa: '', titleEn: '', parentId: null, currencyId: '', isActive: true, accountType: 'main', controlInventory: false });
      setIsCreatingNode(true);
      setActiveTab('details');
    };

    const handleAddTreeChild = (parentNode) => {
      if (!access.canCreate) return;
      const nextDepth = getNewNodeDepth(rawAccounts, parentNode.id);
      if (nextDepth > 4) {
        return showToast(t('امکان تعریف گره جدید فراتر از سطح ۴ (تفصیل) وجود ندارد', 'Cannot add nodes beyond Level 4 (Detail)'), 'error');
      }
      const suggested = suggestNextCode(rawAccounts, parentNode.id, nextDepth, chart);
      
      setSelectedNodeId(null);
      setNodeDepth(nextDepth);
      setNodeFormData({ code: suggested, titleFa: '', titleEn: '', parentId: parentNode.id, currencyId: parentNode.currencyId || '', isActive: true, accountType: 'main', controlInventory: false });
      setIsCreatingNode(true);
      setActiveTab('details');
    };

    const validateNodeUniqueness = () => {
      const pId = nodeFormData.parentId || null;
      const siblings = rawAccounts.filter(n => String(n.parentId || '') === String(pId || '') && String(n.id) !== String(nodeFormData.id));

      const dupFa = siblings.some(s => (s.titleFa || '').trim() === (nodeFormData.titleFa || '').trim());
      if (dupFa) {
        showToast(t('عنوان فارسی در این سطح تکراری است', 'Duplicate Persian title at this level'), 'error');
        return false;
      }

      const enVal = (nodeFormData.titleEn || '').trim();
      if (enVal !== '') {
        const dupEn = siblings.some(s => (s.titleEn || '').trim() === enVal);
        if (dupEn) {
          showToast(t('عنوان انگلیسی در این سطح تکراری است', 'Duplicate English title at this level'), 'error');
          return false;
        }
      }

      const codeDup = rawAccounts.some(n => String(n.id) !== String(nodeFormData.id) && String(n.code) === String(nodeFormData.code));
      if (codeDup) {
        showToast(t('کد حساب وارد شده در کل ساختار تکراری است', 'Account code must be unique globally'), 'error');
        return false;
      }

      return true;
    };

    const handleSaveNodeForm = async () => {
      if (!nodeFormData.titleFa || !nodeFormData.code) {
        return showToast(t('فیلدهای کد و عنوان فارسی الزامی هستند', 'Code and Persian title are required'), 'error');
      }

      if (!validateNodeUniqueness()) return;

      try {
        const payload = {
          chart_id: chart.id,
          parent_id: nodeFormData.parentId || null,
          code: nodeFormData.code,
          title_fa: nodeFormData.titleFa,
          title_en: nodeFormData.titleEn,
          currency_id: nodeFormData.currencyId || null,
          is_active: nodeFormData.isActive,
          account_type: nodeFormData.accountType,
          control_inventory: nodeFormData.controlInventory
        };

        let targetId = null;
        if (isCreatingNode) {
          const { data, error } = await supabase.from('fm_coa_accounts').insert([payload]).select();
          if (error) throw error;
          if (data && data.length > 0) {
            targetId = data[0].id;
          } else {
            const { data: fetchNew } = await supabase.from('fm_coa_accounts').select('id').eq('code', payload.code).single();
            if (fetchNew) targetId = fetchNew.id;
          }
          if (targetId) {
             await logAction('حساب کدینگ', targetId, 'create', `ایجاد حساب: ${payload.code} - ${payload.title_fa}`);
          }
        } else {
          if (String(nodeFormData.parentId) === String(selectedNodeId)) {
            return showToast(t('گره نمی‌تواند زیرمجموعه خودش قرار گیرد', 'A node cannot be a child of itself'), 'error');
          }
          const { error } = await supabase.from('fm_coa_accounts').update(payload).eq('id', selectedNodeId);
          if (error) throw error;
          targetId = selectedNodeId;
          await logAction('حساب کدینگ', targetId, 'update', `ویرایش حساب: ${payload.code} - ${payload.title_fa}`);
        }

        if (targetId) {
            await fetchDesignerData(targetId);
        } else {
            await fetchDesignerData();
        }
        showToast(t('اطلاعات حساب با موفقیت ثبت شد', 'Account specifications updated successfully'));
      } catch (err) {
        showToast(t('خطا در ذخیره اطلاعات گره حساب', 'Error saving account specification'), 'error');
      }
    };

    const handleDeleteNode = (node) => {
      const hasChildren = rawAccounts.some(n => String(n.parentId) === String(node.id));
      if (hasChildren) {
        return showToast(t('این حساب دارای زیرمجموعه است و حذف آن امکان‌پذیر نیست', 'Account has children and cannot be removed'), 'error');
      }
      setDeleteConfirm({ isOpen: true, type: 'node', data: node });
    };

    const executeDelete = async () => {
      try {
        if (deleteConfirm.type === 'node') {
          const { error } = await supabase.from('fm_coa_accounts').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await logAction('حساب کدینگ', deleteConfirm.data.id, 'delete', `حذف حساب: ${deleteConfirm.data.code}`);
          await fetchDesignerData();
          setSelectedNodeId(null);
          setNodeFormData({});
          setIsCreatingNode(false);
        } else if (deleteConfirm.type === 'permission') {
          const { error } = await supabase.from('fm_coa_permissions').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await fetchDesignerData(selectedNodeId);
        }
        showToast(t('رکورد با موفقیت حذف شد', 'Deleted successfully'));
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        showToast(t('امکان حذف رکورد به دلیل وابستگی‌های جانبی وجود ندارد', 'Deletion failed due to existing relationships'), 'error');
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      }
    };

    const activeNodePermissions = useMemo(() => {
      if (!selectedNodeId) return [];
      return accountPermissions.filter(p => String(p.account_id) === String(selectedNodeId));
    }, [accountPermissions, selectedNodeId]);

    const handleSavePermInline = async () => {
      const form = inlinePermEdit.data;
      if (!form.grantee_id || !selectedNodeId) return;

      if (inlinePermEdit.id === 'new' && activeNodePermissions.some(p => p.grantee_type === form.grantee_type && String(p.grantee_id) === String(form.grantee_id))) {
        return showToast(t('این دسترسی قبلاً برای حساب ثبت شده است', 'Access role/user already specified'), 'error');
      }

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

        await fetchDesignerData(selectedNodeId);
        setInlinePermEdit(null);
        showToast(t('دسترسی با موفقیت ذخیره شد', 'Permission saved'));
      } catch (err) {
        showToast(t('خطا در ذخیره دسترسی', 'Error saving permission'), 'error');
      }
    };

    const consolidatedUsersList = useMemo(() => {
      if (!selectedNodeId) return [];
      const result = [];

      systemUsers.forEach(user => {
        let maxAccess = null;
        const reasons = [];

        const directPerm = activeNodePermissions.find(p => p.grantee_type === 'user' && String(p.grantee_id) === String(user.id));
        if (directPerm) {
          maxAccess = directPerm.access_level;
          reasons.push(t('دسترسی مستقیم', 'Direct Access'));
        }

        const userRoles = userRolesMapping.filter(m => String(m.user_id) === String(user.id)).map(m => String(m.role_id));
        const rolePerms = activeNodePermissions.filter(p => p.grantee_type === 'role' && userRoles.includes(String(p.grantee_id)));

        rolePerms.forEach(rp => {
          const roleObj = systemRoles.find(r => String(r.id) === String(rp.grantee_id));
          const rTitle = roleObj ? (roleObj.title || roleObj.name) : t('نقش سیستم', 'System Role');
          reasons.push(`${t('ارث‌بری از نقش:', 'Inherited via Role:')} ${rTitle}`);
          
          if (!maxAccess || (maxAccess === 'view' && rp.access_level === 'full')) {
            maxAccess = rp.access_level;
          }
        });

        if (maxAccess) {
          const userParty = systemParties.find(p => String(p.id) === String(user.party_id || user.person_id));
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
          
          result.push({
            id: user.id,
            username: user.username || user.name || user.email || '---',
            fullName: fNameStr,
            accessLevel: maxAccess,
            reason: reasons.join(' / ')
          });
        }
      });

      return result;
    }, [selectedNodeId, systemUsers, activeNodePermissions, userRolesMapping, systemRoles, systemParties, t]);

    const permGridData = useMemo(() => {
       const data = [...activeNodePermissions];
       if (inlinePermEdit && inlinePermEdit.id === 'new') {
         data.unshift({ id: 'new', _isNew: true, ...inlinePermEdit.data });
       }
       return data;
    }, [activeNodePermissions, inlinePermEdit]);

    const availableUsersForAccess = useMemo(() => {
      return systemUsers.filter(u => !activeNodePermissions.some(p => p.grantee_type === 'user' && String(p.grantee_id) === String(u.id))).map(u => {
          const userParty = systemParties.find(p => String(p.id) === String(u.party_id || u.person_id));
          let fNameStr = '';
          if (userParty) {
              if (userParty.party_type === 'legal' && userParty.company_name) {
                  fNameStr = userParty.company_name;
              } else {
                  fNameStr = `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
              }
          }
          if (!fNameStr || fNameStr === '') {
              const fname = u.first_name || u.name || '';
              const lname = u.last_name || u.family || '';
              fNameStr = (fname || lname) ? `${fname} ${lname}`.trim() : '---';
          }
          return { ...u, fullName: fNameStr };
      });
    }, [systemUsers, activeNodePermissions, systemParties]);

    const availableRolesForAccess = useMemo(() => {
      return systemRoles.filter(r => !activeNodePermissions.some(p => p.grantee_type === 'role' && String(p.grantee_id) === String(r.id)));
    }, [systemRoles, activeNodePermissions]);

    const permColumns = [
      {
        field: 'grantee_type', header_fa: 'نوع دسترسی', header_en: 'Type', width: '150px',
        render: (val, row) => {
          if (inlinePermEdit?.id === row.id) {
             return (
               <div onClick={(e)=>e.stopPropagation()}>
                 <SelectField 
                   size="sm" 
                   options={[{value:'user', label:t('کاربر سیستم', 'User')}, {value:'role', label:t('نقش سیستمی', 'Role')}]}
                   value={inlinePermEdit.data.grantee_type} 
                   onChange={(e) => setInlinePermEdit(prev => ({...prev, data: {...prev.data, grantee_type: e.target.value, grantee_id: '', grantee_obj: null}}))} 
                   isRtl={isRtl}
                 />
               </div>
             )
          }
          return <Badge variant="slate" size="sm">{val === 'user' ? t('کاربر', 'User') : t('نقش', 'Role')}</Badge>;
        }
      },
      {
        field: 'grantee_id', header_fa: 'نام کاربری / عنوان نقش', header_en: 'Name/Title', width: 'auto',
        render: (val, row) => {
          if (inlinePermEdit?.id === row.id) {
            const isUser = inlinePermEdit.data.grantee_type === 'user';
            return (
              <div onClick={(e)=>e.stopPropagation()}>
                <LOVField 
                  size="sm" 
                  data={isUser ? availableUsersForAccess : availableRolesForAccess} 
                  columns={isUser ? [{field:'username',header_fa:'نام کاربری'},{field:'fullName',header_fa:'نام'}] : [{field:'code',header_fa:'کد'},{field:'title',header_fa:'عنوان'}]}
                  dropdownWidth="min-w-[400px]"
                  displayValue={inlinePermEdit.data.grantee_obj ? (isUser ? `${inlinePermEdit.data.grantee_obj.fullName} (${inlinePermEdit.data.grantee_obj.username})` : `${inlinePermEdit.data.grantee_obj.title} (${inlinePermEdit.data.grantee_obj.code})`) : ''}
                  onChange={(r) => setInlinePermEdit(prev => ({...prev, data: {...prev.data, grantee_id: r?.id, grantee_obj: r}}))}
                />
              </div>
            )
          }
          if (row.grantee_type === 'user') {
            const u = systemUsers.find(su => String(su.id) === String(val));
            if (!u) return val;
            const userParty = systemParties.find(p => String(p.id) === String(u.party_id || u.person_id));
            let fNameStr = '';
            if (userParty) {
                if (userParty.party_type === 'legal' && userParty.company_name) fNameStr = userParty.company_name;
                else fNameStr = `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
            }
            if (!fNameStr || fNameStr === '') {
                fNameStr = (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.name || '');
            }
            return fNameStr ? `${fNameStr} (${u.username || u.email || val})` : (u.username || u.email || val);
          } else {
            const role = systemRoles.find(r => String(r.id) === String(val));
            return role ? (role.title || role.name || val) : val;
          }
        }
      },
      {
        field: 'access_level', header_fa: 'سطح دسترسی', header_en: 'Access Level', width: '150px',
        render: (val, row) => {
          if (inlinePermEdit?.id === row.id) {
             return (
               <div onClick={(e)=>e.stopPropagation()}>
                 <SelectField 
                   size="sm" 
                   options={[{value:'view', label:t('فقط مشاهده', 'View Only')}, {value:'full', label:t('کامل', 'Full Access')}]}
                   value={inlinePermEdit.data.access_level} 
                   onChange={(e) => setInlinePermEdit(prev => ({...prev, data: {...prev.data, access_level: e.target.value}}))} 
                   isRtl={isRtl}
                 />
               </div>
             )
          }
          return (
            <Badge variant={val === 'full' ? 'indigo' : 'amber'} size="sm">
              {val === 'full' ? t('کامل (ویرایش و حذف)', 'Full Access') : t('فقط مشاهده', 'View Only')}
            </Badge>
          )
        }
      }
    ];

    const permActions = [
      { 
        icon: Save, tooltip: t('ذخیره', 'Save'), 
        hidden: (row) => inlinePermEdit?.id !== row.id, 
        onClick: () => handleSavePermInline(), 
        className: '!text-emerald-600 hover:!text-emerald-800' 
      },
      { 
        icon: X, tooltip: t('انصراف', 'Cancel'), 
        hidden: (row) => inlinePermEdit?.id !== row.id, 
        onClick: () => setInlinePermEdit(null), 
        className: '!text-slate-500 hover:!text-slate-700' 
      },
      { 
        icon: Edit, tooltip: t('ویرایش', 'Edit'), 
        hidden: (row) => inlinePermEdit?.id === row.id || row._isNew, 
        onClick: (row) => {
          let granteeObj = null;
          if (row.grantee_type === 'user') {
              const u = systemUsers.find(x => String(x.id) === String(row.grantee_id));
              if (u) {
                  const userParty = systemParties.find(p => String(p.id) === String(u.party_id || u.person_id));
                  let fNameStr = '';
                  if (userParty) fNameStr = userParty.party_type === 'legal' && userParty.company_name ? userParty.company_name : `${userParty.first_name || ''} ${userParty.last_name || ''}`.trim();
                  if (!fNameStr || fNameStr === '') fNameStr = (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.name || '');
                  granteeObj = { ...u, fullName: fNameStr };
              }
          } else {
              granteeObj = systemRoles.find(r => String(r.id) === String(row.grantee_id));
          }
          setInlinePermEdit({
            id: row.id,
            data: { grantee_type: row.grantee_type, grantee_id: row.grantee_id, grantee_obj: granteeObj, access_level: row.access_level }
          });
        },
        className: 'text-slate-400 hover:text-indigo-500' 
      },
      { 
        id: 'delete', icon: Trash2, tooltip: t('حذف دسترسی', 'Revoke Permission'), 
        hidden: (row) => inlinePermEdit?.id === row.id || row._isNew,
        onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'permission', data: row }), 
        className: 'text-red-500 hover:text-red-600' 
      }
    ];

    const consolidatedColumns = [
      { field: 'username', header_fa: 'نام کاربری', header_en: 'Username', width: '130px', render: (val) => <span className="text-[12px] text-slate-600 dark:text-slate-400" dir="ltr">{val}</span> },
      { field: 'fullName', header_fa: 'نام و نام خانوادگی', header_en: 'Full Name', width: '200px', render: (val) => <span className="font-bold text-slate-800 dark:text-slate-200 text-[12px]">{val}</span> },
      {
        field: 'accessLevel', header_fa: 'سطح دسترسی', header_en: 'Effective Access', width: '150px',
        render: (v) => (
          <Badge variant={v === 'full' ? 'indigo' : 'amber'} size="sm">
            {v === 'full' ? t('کامل (ویرایش و حذف)', 'Full Access') : t('فقط مشاهده', 'View Only')}
          </Badge>
        )
      },
      { field: 'reason', header_fa: 'نحوه ارث‌بری', header_en: 'Inheritance/Reason', width: 'auto', render: (val) => <span className="text-[11px] text-slate-500">{val}</span> }
    ];

    const accessTabs = [
      { id: 'assign', label: t('تخصیص دسترسی', 'Access Assignment') },
      { id: 'aggregate', label: t('مشاهده تجمیع دسترسی‌ها', 'Aggregated Access View') }
    ];

    const levelLabels = {
      1: t('سطح ۱ - گروه حساب', 'Level 1 - Account Group'),
      2: t('سطح ۲ - حساب کل', 'Level 2 - General Ledger'),
      3: t('سطح ۳ - حساب معین', 'Level 3 - Subsidiary Ledger'),
      4: t('سطح ۴ - حساب تفصیل', 'Level 4 - Detail Account')
    };

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" icon={isRtl ? ArrowRight : ArrowLeft} onClick={onBack}>{t('بازگشت به لیست', 'Back')}</Button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1">
                {t('پیکربندی درخت حساب:', 'Coding Setup:')} <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{chart?.title}</span>
              </h2>
            </div>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => fetchDesignerData(selectedNodeId)} className="h-8 w-8 px-0" />
          </div>

          <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
            <div className={`w-full md:w-[40%] flex flex-col bg-slate-50/40 dark:bg-slate-900/10 border-b md:border-b-0 ${isRtl ? 'md:border-l' : 'md:border-r'} border-slate-200 dark:border-slate-700 overflow-y-auto`}>
              <Tree
                data={rawAccounts} language={language} formCode={formCode}
                idField="id" parentField="parentId" displayField="title" secondaryField="code" activeField="isActive"
                selectedId={selectedNodeId}
                onSelect={handleSelectTreeNode}
                onAddRoot={access.canCreate ? handleAddTreeRoot : undefined}
                onAddChild={access.canCreate ? handleAddTreeChild : undefined}
                onDelete={access.canDelete ? handleDeleteNode : undefined}
                onImport={(file) => showToast(t(`فایل ${file.name} جهت پردازش بارگذاری شد.`, `File ${file.name} uploaded for processing.`), 'info')}
                onDownloadSample={() => showToast(t('در حال دانلود نمونه فایل اکسل...', 'Downloading Excel Sample...'), 'info')}
              />
            </div>

            <div className="flex-1 flex flex-col overflow-auto p-4 gap-3 bg-slate-50/50 dark:bg-slate-900/20">
              {selectedNodeId || isCreatingNode ? (
                <Card noPadding={true} className="flex-1 border border-slate-200 dark:border-slate-700 flex flex-col min-h-0 bg-white dark:bg-slate-800 shadow-sm h-full">
                  <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 px-3 pt-2 gap-1 shrink-0">
                    <button onClick={() => setActiveTab('details')} className={`px-4 py-2 font-bold text-xs border-b-2 transition-all ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-800 rounded-t-lg shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                      {t('مشخصات حساب', 'Account Parameters')}
                    </button>
                    {!isCreatingNode && (
                      <button onClick={() => setActiveTab('access')} className={`px-4 py-2 font-bold text-xs border-b-2 transition-all ${activeTab === 'access' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-800 rounded-t-lg shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        {t('تنظیمات دسترسی', 'Access Configuration')}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col p-4 overflow-y-auto min-h-0">
                    {activeTab === 'details' && (
                      <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-200">
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                          <Alert type="info" icon={Info} message={<span>{t('سطح گره جاری:', 'Current Element Hierarchy Level:')} <strong className="text-indigo-600 dark:text-indigo-300">{levelLabels[nodeDepth]}</strong></span>} />
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TextField size="sm" formCode={formCode} label={t('کد حساب (ترکیبی اتوماتیک)', 'Account Code')} value={nodeFormData.code || ''} onChange={(e) => setNodeFormData({ ...nodeFormData, code: e.target.value })} isRtl={isRtl} required dir="ltr" />
                            <SelectField size="sm" formCode={formCode} label={t('نوع ارز', 'Currency Type')} value={nodeFormData.currencyId || ''} onChange={(e) => setNodeFormData({ ...nodeFormData, currencyId: e.target.value })} options={[{ value: '', label: t('بدون محدودیت ارزی', 'No Currency Restriction') }, ...currencies.map(c => {
                               const cNameFa = c.name_fa || c.title_fa || c.name || c.title || '';
                               const cNameEn = c.name_en || c.title_en || c.name || c.title || '';
                               return { value: c.id, label: `${c.code || c.id} - ${isRtl ? cNameFa : cNameEn}` };
                            })]} isRtl={isRtl} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TextField size="sm" formCode={formCode} label={t('عنوان فارسی حساب', 'Persian Title')} value={nodeFormData.titleFa || ''} onChange={(e) => setNodeFormData({ ...nodeFormData, titleFa: e.target.value })} isRtl={isRtl} required />
                            <TextField size="sm" formCode={formCode} label={t('عنوان انگلیسی حساب', 'English Title')} value={nodeFormData.titleEn || ''} onChange={(e) => setNodeFormData({ ...nodeFormData, titleEn: e.target.value })} isRtl={isRtl} dir="ltr" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <SelectField size="sm" formCode={formCode} label={t('نوع حساب', 'Account Category')} value={nodeFormData.accountType || 'main'} onChange={(e) => setNodeFormData({ ...nodeFormData, accountType: e.target.value })} options={[{ value: 'main', label: t('حساب اصلی', 'Main Account') }, { value: 'intermediate', label: t('حساب واسط / کنترلی', 'Intermediate Account') }]} isRtl={isRtl} />
                            <div className="flex flex-row items-center gap-6 pt-5 pb-1 w-full">
                              <div className="flex-1">
                                <ToggleField size="sm" formCode={formCode} label={t('کنترل موجودی', 'Control Inventory')} checked={!!nodeFormData.controlInventory} onChange={(v) => setNodeFormData({ ...nodeFormData, controlInventory: v })} isRtl={isRtl} wrapperClassName="w-full" />
                              </div>
                              <div className="flex-1">
                                <ToggleField size="sm" formCode={formCode} label={t('فعال', 'Active')} checked={nodeFormData.isActive !== false} onChange={(v) => setNodeFormData({ ...nodeFormData, isActive: v })} isRtl={isRtl} wrapperClassName="w-full" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => { setIsCreatingNode(false); setSelectedNodeId(null); setNodeFormData({}); }}>{t('انصراف', 'Cancel')}</Button>
                          {access.canEdit && <Button size="sm" variant="primary" icon={Save} onClick={handleSaveNodeForm}>{t('ذخیره تغییرات حساب', 'Save Account')}</Button>}
                        </div>
                      </div>
                    )}

                    {activeTab === 'access' && (
                      <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-200 gap-3">
                        <Tabs tabs={accessTabs} activeTab={accessViewMode} onChange={setAccessViewMode} className="shrink-0" />
                        
                        <div className="flex-1 flex flex-col min-h-0">
                          {accessViewMode === 'assign' ? (
                            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                              <DataGrid 
                                key="grid-perm-assign"
                                data={permGridData} 
                                columns={permColumns} 
                                actions={permActions} 
                                language={language} 
                                hideImport={true}
                                hideExport={true}
                                onAdd={() => {
                                  if (inlinePermEdit) return;
                                  setInlinePermEdit({ id: 'new', data: { grantee_type: 'user', grantee_id: '', grantee_obj: null, access_level: 'view' } });
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-1 min-h-0 flex flex-col gap-2">
                              <Alert type="warning" icon={Shield} message={t('لیست زیر مجموع تمامی کاربرانی است که به صورت مستقیم یا از طریق تفویض نقش‌های خود، اجازه تعامل با این حساب را کسب کرده‌اند.', 'Consolidated aggregate list of all operators with computed effective system access level.')} />
                              <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                <DataGrid 
                                  key="grid-perm-aggregate"
                                  data={consolidatedUsersList} 
                                  columns={consolidatedColumns} 
                                  language={language} 
                                  hideImport={true}
                                  hideExport={true}
                                  hideToolbar={true}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 gap-3 text-[12px] font-medium p-8">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"><Network size={26} className="text-slate-300 dark:text-slate-600"/></div>
                  <span>{t('جهت بررسی پارامترها، قوانین ارث‌بری یا دسترسی، یک حساب را از ساختار درخت انتخاب کنید.', 'Select an account item node from the left tree setup to manage permissions or parameters.')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید حذف قطعی رکورد', 'Confirm Permanent Revocation')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-3 items-center text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1"><AlertTriangle size={22} /></div>
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1"><Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}</div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-1">
              {deleteConfirm.type === 'node' && t(`آیا از حذف حساب کدینگ "${deleteConfirm.data?.titleFa}" اطمینان دارید؟`, `Are you sure you want to delete account component "${deleteConfirm.data?.titleFa}"?`)}
              {deleteConfirm.type === 'permission' && t('آیا از حذف این ردیف دسترسی اطمینان دارید؟', 'Are you sure you want to revoke this explicit access right?')}
            </p>
            <div className="flex gap-2 mt-4 w-full">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button size="sm" variant="primary" onClick={executeDelete} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 border-red-600 dark:border-red-500 shadow-lg">{t('تایید حذف نهایی', 'Delete Now')}</Button>
            </div>
          </div>
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  ChartOfAccountsMain.formCode = 'CHART_OF_ACCOUNTS_MAIN';
  window.ChartOfAccountsMain = ChartOfAccountsMain;
})();

