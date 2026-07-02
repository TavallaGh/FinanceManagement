/* Filename: security/SecurityContext.js */
(() => {
  const React = window.React;
  const { createContext, useState, useEffect, useContext, useCallback, useMemo } = React;

  const SecurityContext = createContext(null);

  const SecurityProvider = ({ children, userSession }) => {
    const [permissions, setPermissions] = useState({});
    const [actionDictionary, setActionDictionary] = useState({});
    const [loading, setLoading] = useState(true);
    const [isFullAccess, setIsFullAccess] = useState(false);

    const userId = userSession?.id;
    const username = userSession?.username?.toLowerCase();

    useEffect(() => {
      const loadPermissions = async () => {
        if (!userId) {
          setLoading(false);
          return;
        }

        try {
          const supabase = window.supabase;

          const { data: rolesRes } = await supabase
            .from('sec_user_roles')
            .select('role_id')
            .eq('user_id', userId);

          const roleIds = rolesRes ? rolesRes.map(ur => ur.role_id) : [];

          const [dictRes, userPermsRes, rolePermsRes, menusRes] = await Promise.all([
            supabase.from('sec_action_dictionary').select('action_code, label_fa, label_en'),
            supabase.from('sec_permissions').select('*').eq('user_id', userId),
            roleIds.length > 0 ? supabase.from('sec_permissions').select('*').in('role_id', roleIds) : Promise.resolve({ data: [] }),
            supabase.from('menus').select('id, unique_code')
          ]);

          const dict = {};
          if (dictRes.data) {
              dictRes.data.forEach(item => {
                  dict[item.action_code] = { fa: item.label_fa, en: item.label_en };
              });
          }
          setActionDictionary(dict);
          
          if (username === 'admin' || username === 'superadmin') {
            setIsFullAccess(true);
            setLoading(false);
            return;
          }
          
          const menusData = menusRes.data || [];
          const menuMap = {};
          menusData.forEach(m => {
            if (m.unique_code) {
              menuMap[m.id] = m.unique_code.trim().toLowerCase();
            }
          });

          const merged = {};

          const processPerm = (p) => {
            const code = menuMap[p.menu_id];
            if (!code) return;
            
            if (!merged[code]) {
              merged[code] = {
                can_view: false,
                can_create: false,
                can_edit: false,
                can_delete: false,
                can_print: false,
                raw_actions: [], 
                data_scope: {} 
              };
            }
            
            let parsedActions = [];
            if (typeof p.actions === 'string') {
                try { parsedActions = JSON.parse(p.actions || '[]'); } catch(e) { parsedActions = []; }
            } else if (Array.isArray(p.actions)) {
                parsedActions = p.actions;
            }
            if (!Array.isArray(parsedActions)) {
              parsedActions = parsedActions === null || parsedActions === undefined ? [] : [parsedActions];
            }
            
            const normalizedActions = parsedActions.map(a => String(a).toLowerCase().trim());
            merged[code].raw_actions = [...new Set([...merged[code].raw_actions, ...normalizedActions])];
            
            if (normalizedActions.length > 0) merged[code].can_view = true; 
            if (normalizedActions.includes('read') || normalizedActions.includes('view') || normalizedActions.includes('view_log')) merged[code].can_view = true;
            if (normalizedActions.includes('create') || normalizedActions.includes('add') || normalizedActions.includes('insert')) merged[code].can_create = true;
            if (normalizedActions.includes('update') || normalizedActions.includes('edit') || normalizedActions.includes('modify')) merged[code].can_edit = true;
            if (normalizedActions.includes('delete') || normalizedActions.includes('remove')) merged[code].can_delete = true;
            if (normalizedActions.includes('print') || normalizedActions.includes('export')) merged[code].can_print = true;
            
            let parsedScopes = {};
            if (typeof p.data_scopes === 'string') {
                try { parsedScopes = JSON.parse(p.data_scopes || '{}'); } catch(e) { parsedScopes = {}; }
            } else if (typeof p.data_scopes === 'object' && p.data_scopes !== null) {
                parsedScopes = p.data_scopes;
            }

            const normalizeScopeValues = (value) => {
              if (Array.isArray(value)) return value;
              if (value === null || value === undefined) return [];
              if (typeof value === 'string') {
                const trimmed = value.trim();
                if (!trimmed) return [];
                try {
                  const parsed = JSON.parse(trimmed);
                  return Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                  return [trimmed];
                }
              }
              return [value];
            };

            Object.keys(parsedScopes).forEach(key => {
                if (!merged[code].data_scope[key]) merged[code].data_scope[key] = [];
                const nextValues = normalizeScopeValues(parsedScopes[key]);
                merged[code].data_scope[key] = [...new Set([...merged[code].data_scope[key], ...nextValues])];
            });
          };

          if (rolePermsRes.data) rolePermsRes.data.forEach(processPerm);
          if (userPermsRes.data) userPermsRes.data.forEach(processPerm);

          setPermissions(merged);
        } catch (err) {
          console.error("Error loading permissions:", err);
        } finally {
          setLoading(false);
        }
      };

      loadPermissions();
    }, [userId, username]);

    const hasAccess = useCallback((formCode) => {
      if (isFullAccess) return true;
      if (!formCode) return false;
      const target = formCode.trim().toLowerCase();
      return !!(permissions[target] && permissions[target].can_view);
    }, [isFullAccess, permissions]);

    const getActions = useCallback((formCode) => {
      if (isFullAccess) {
        return { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true, raw_actions: ['*'] };
      }
      if (!formCode) {
        return { canView: false, canCreate: false, canEdit: false, canDelete: false, canPrint: false, raw_actions: [] };
      }
      const target = formCode.trim().toLowerCase();
      const p = permissions[target];
      if (!p) {
        return { canView: false, canCreate: false, canEdit: false, canDelete: false, canPrint: false, raw_actions: [] };
      }
      return { 
        canView: p.can_view, 
        canCreate: p.can_create, 
        canEdit: p.can_edit, 
        canDelete: p.can_delete, 
        canPrint: p.can_print,
        raw_actions: p.raw_actions || [] 
      };
    }, [isFullAccess, permissions]);

    const getDataScope = useCallback((formCode) => {
      if (isFullAccess) return ['*']; 
      if (!formCode) return {};
      const target = formCode.trim().toLowerCase();
      const p = permissions[target];
      return p && p.data_scope ? p.data_scope : {};
    }, [isFullAccess, permissions]);

    const value = useMemo(() => ({
      isFullAccess,
      permissions,
      actionDictionary,
      loading,
      hasAccess,
      getActions,
      getDataScope
    }), [isFullAccess, permissions, actionDictionary, loading, hasAccess, getActions, getDataScope]);

    if (loading) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 font-sans" dir="rtl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400">در حال بررسی سطوح دسترسی و امنیت...</p>
          </div>
        </div>
      );
    }

    return React.createElement(SecurityContext.Provider, { value }, children);
  };

  const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (context === undefined) {
      throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
  };

  window.SecurityManager = {
    SecurityContext,
    SecurityProvider,
    useSecurity
  };
})();
