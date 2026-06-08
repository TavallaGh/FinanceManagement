/* Filename: designsystem/DSCore.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useRef, useCallback, useMemo } = React;
  const { 
    Loader2, AlertCircle, Search, ChevronDown, ChevronLeft, ChevronRight, 
    Home, UploadCloud, FileText, Download, Trash2, ArrowUpRight, 
    ArrowDownRight, Calendar, Check, X, LayoutTemplate, Save, Settings, Info
  } = window.LucideIcons || {};

  const getGlobalCalendarMode = () => window.localStorage.getItem('fm_calendar_mode') || 'jalali';
  
  const setGlobalCalendarMode = (mode) => {
    window.localStorage.setItem('fm_calendar_mode', mode);
    window.dispatchEvent(new CustomEvent('fm_calendar_mode_change', { detail: mode }));
  };

  const useCalendarMode = () => {
    const [mode, setMode] = useState(getGlobalCalendarMode());
    useEffect(() => {
      const handler = (e) => setMode(e.detail);
      window.addEventListener('fm_calendar_mode_change', handler);
      return () => window.removeEventListener('fm_calendar_mode_change', handler);
    }, []);
    return mode;
  };

  const getGlobalTheme = () => window.localStorage.getItem('fm_theme') || 'light';

  const setGlobalTheme = (theme) => {
    window.localStorage.setItem('fm_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    window.dispatchEvent(new CustomEvent('fm_theme_change', { detail: theme }));
  };

  const useTheme = () => {
    const [theme, setTheme] = useState(getGlobalTheme());
    useEffect(() => {
      const handler = (e) => setTheme(e.detail);
      window.addEventListener('fm_theme_change', handler);
      return () => window.removeEventListener('fm_theme_change', handler);
    }, []);
    return theme;
  };

  const j2g = (jy, jm, jd) => {
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + parseInt(jy / 33) * 8 + parseInt((jy % 33 + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * parseInt(days / 146097);
    days %= 146097;
    if (days > 36524) { gy += 100 * parseInt(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * parseInt(days / 1461);
    days %= 1461;
    gy += parseInt((days - 1) / 365);
    if (days > 365) days = (days - 1) % 365;
    let gd = days + 1;
    let sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 13; gm++) {
      let v = sal_a[gm];
      if (gd <= v) break;
      gd -= v;
    }
    return [gy, gm, gd];
  };

  const g2j = (gy, gm, gd) => {
    let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + parseInt((gy2 + 3) / 4) - parseInt((gy2 + 99) / 100) + parseInt((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * parseInt(days / 12053);
    days %= 12053;
    jy += 4 * parseInt(days / 1461);
    days %= 1461;
    jy += parseInt((days - 1) / 365);
    if (days > 365) days = (days - 1) % 365;
    let jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
    let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
  };

  const formatGlobalDate = (gregorianDateStr, mode) => {
    if (!gregorianDateStr) return '';
    let str = String(gregorianDateStr).replace(/-/g, '/');
    if (str.includes('T')) str = str.split('T')[0];
    const parts = str.split('/');
    if (parts.length < 3) return gregorianDateStr;
    const gy = parseInt(parts[0], 10);
    const gm = parseInt(parts[1], 10);
    const gd = parseInt(parts[2], 10);
    if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return gregorianDateStr;

    if (mode === 'jalali') {
      const [jy, jm, jd] = g2j(gy, gm, gd);
      return `${jy}/${jm < 10 ? '0'+jm : jm}/${jd < 10 ? '0'+jd : jd}`;
    }
    return `${gy}/${gm < 10 ? '0'+gm : gm}/${gd < 10 ? '0'+gd : gd}`;
  };

  const useSecureAccess = (formCode) => {
    if (!formCode || !window.SecurityManager) {
       return { canView: true, canCreate: true, canEdit: true, canDelete: true, canPrint: true, hasCustomAccess: () => true };
    }
    try {
      const securityCtx = window.SecurityManager.useSecurity();
      const { getActions, isFullAccess } = securityCtx;
      const access = getActions(formCode);
      return {
        ...access,
        hasCustomAccess: (actionCode) => isFullAccess || (access.raw_actions && (access.raw_actions.includes('*') || access.raw_actions.includes(actionCode)))
      };
    } catch (e) {
      console.warn("Security context not found for access check.");
      return { canView: false, canCreate: false, canEdit: false, canDelete: false, canPrint: false, hasCustomAccess: () => false };
    }
  };

  const useSecureDataScope = (formCode) => {
    const SecurityManager = window.SecurityManager;
    if (!SecurityManager) return ['*'];
    
    try {
      const security = SecurityManager.useSecurity();
      return security.getDataScope(formCode);
    } catch (e) {
       console.warn("SecurityContext not found, defaulting to restricted scope");
       return [];
    }
  };

  const applyDataScope = (supabaseQuery, scopes, columnName = 'id') => {
    if (!scopes || scopes.length === 0) {
      return supabaseQuery.in(columnName, ['00000000-0000-0000-0000-000000000000']); 
    }
    if (scopes.includes('*')) {
      return supabaseQuery; 
    }
    return supabaseQuery.in(columnName, scopes);
  };

  const Button = (props) => {
    const { children, variant = 'primary', size = 'md', isLoading = false, disabled = false, icon: Icon, iconPosition = 'right', className = '', onClick, type = 'button', title, formCode, requiredAccess, hideOnNoAccess = false } = props;
    const restProps = Object.assign({}, props);
    ['children', 'variant', 'size', 'isLoading', 'disabled', 'icon', 'iconPosition', 'className', 'onClick', 'type', 'title', 'formCode', 'requiredAccess', 'hideOnNoAccess'].forEach(k => delete restProps[k]);
    
    const access = useSecureAccess(formCode);
    let hasAccess = true;
    if (requiredAccess) {
       if (requiredAccess === 'view') hasAccess = access.canView;
       else if (requiredAccess === 'create') hasAccess = access.canCreate;
       else if (requiredAccess === 'edit' || requiredAccess === 'update') hasAccess = access.canEdit;
       else if (requiredAccess === 'delete') hasAccess = access.canDelete;
       else if (requiredAccess === 'print' || requiredAccess === 'export') hasAccess = access.canPrint;
       else hasAccess = access.hasCustomAccess(requiredAccess);
    }

    if (!hasAccess && hideOnNoAccess) return null;
    const finalDisabled = disabled || isLoading || !hasAccess;

    const baseStyles = "inline-flex items-center justify-center font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shrink-0";
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm shadow-indigo-200 dark:shadow-none dark:bg-indigo-500 dark:hover:bg-indigo-600",
      secondary: "bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-700 shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600",
      outline: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-200 dark:focus:ring-slate-700",
      danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm shadow-red-200 dark:shadow-none dark:bg-red-600 dark:hover:bg-red-700",
      'danger-outline': "bg-white dark:bg-slate-800 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-100 dark:focus:ring-red-900",
      ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-200 dark:focus:ring-slate-700"
    };
    const hasText = React.Children.count(children) > 0;
    const sizes = { sm: `h-8 ${hasText ? 'px-3 gap-1.5 text-[12px]' : 'w-8'}`, md: `h-10 ${hasText ? 'px-4 gap-2 text-[12px]' : 'w-10'}`, lg: `h-12 ${hasText ? 'px-6 gap-2.5 text-[14px]' : 'w-12'}` };
    const iconSizes = { sm: 14, md: 16, lg: 18 };

    return (
      <button type={type} title={!hasAccess && !title ? 'عدم دسترسی' : title} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} disabled={finalDisabled} onClick={onClick} {...restProps}>
        {isLoading && <Loader2 size={iconSizes[size]} className="animate-spin shrink-0" />}
        {!isLoading && Icon && iconPosition === 'right' && <Icon size={iconSizes[size]} className="shrink-0" />}
        {hasText && <span className="truncate">{children}</span>}
        {!isLoading && Icon && iconPosition === 'left' && <Icon size={iconSizes[size]} className="shrink-0" />}
      </button>
    );
  };

  const Card = ({ title, action, children, className = '', noPadding = false, headerClassName = '', isCollapsible = false, defaultCollapsed = false, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    
    return (
      <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col transition-all ${className}`}>
        {(title || action) && (
          <div 
            className={`h-10 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-3 bg-slate-50/50 dark:bg-slate-800/80 shrink-0 transition-colors ${isCollapsible ? 'cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-700/50' : ''} ${collapsed ? 'rounded-xl border-b-0' : 'rounded-t-xl'} ${headerClassName}`}
            onClick={() => isCollapsible && setCollapsed(!collapsed)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isCollapsible && (
                <span className="text-slate-400 dark:text-slate-500 shrink-0 transition-transform">
                  {collapsed ? (isRtl ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>) : <ChevronDown size={16}/>}
                </span>
              )}
              <div className="font-black text-[12px] text-slate-800 dark:text-slate-100 truncate flex items-center gap-2 w-full">{title}</div>
            </div>
            {action && <div className="shrink-0" onClick={e => e.stopPropagation()}>{action}</div>}
          </div>
        )}
        {!collapsed && (
          <div className={`flex flex-col flex-1 min-h-0 rounded-b-xl ${noPadding ? '' : 'p-3'}`}>
            {children}
          </div>
        )}
      </div>
    );
  };

  const Badge = ({ children, variant = 'gray', className = '' }) => {
    const variants = {
      gray: "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300", 
      slate: "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300", 
      success: "bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      warning: "bg-amber-100/50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", 
      danger: "bg-red-100/50 dark:bg-red-900/30 text-red-600 dark:text-red-400", 
      indigo: "bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
      blue: "bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      orange: "bg-orange-100/50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
      emerald: "bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
    };
    return <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-black tracking-wide ${variants[variant] || variants.gray} ${className}`}>{children}</span>;
  };

  const PageHeader = ({ title, icon: Icon, breadcrumbs = [], language = 'fa', actions, viewConfig }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [views, setViews] = useState([]);
    const [activeView, setActiveView] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [newViewName, setNewViewName] = useState('');
    const [isDefaultView, setIsDefaultView] = useState(false);
    const [saveMode, setSaveMode] = useState('new');
    const [isInitialized, setIsInitialized] = useState(false);
    const dropdownRef = useRef(null);

    const TextField = window.DSCore?.TextField || (() => null);
    const RadioGroup = window.DSCore?.RadioGroup || (() => null);
    const ToggleField = window.DSCore?.ToggleField || (() => null);

    const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

    useEffect(() => {
      const clickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false); };
      document.addEventListener('mousedown', clickOutside);
      return () => document.removeEventListener('mousedown', clickOutside);
    }, []);

    useEffect(() => {
      if (viewConfig && viewConfig.pageId && !isInitialized) {
        const loadViews = async () => {
          try {
            if (window.supabase) {
              const { data } = await window.supabase.from('fm_user_views').select('*').eq('page_id', viewConfig.pageId).eq('user_id', MOCK_USER_ID);
              if (data) {
                setViews(data);
                const def = data.find(v => v.is_default);
                if (def) {
                  setActiveView(def);
                  if (viewConfig.onApplyState) viewConfig.onApplyState(def.view_data);
                }
              }
            } else throw new Error();
          } catch(e) {
            const local = JSON.parse(localStorage.getItem(`fm_views_${viewConfig.pageId}`) || '[]');
            setViews(local);
            const def = local.find(v => v.is_default);
            if (def) {
              setActiveView(def);
              if (viewConfig.onApplyState) viewConfig.onApplyState(def.view_data);
            }
          } finally {
            setIsInitialized(true);
          }
        };
        loadViews();
      }
    }, [viewConfig?.pageId, isInitialized]);

    const handleSaveView = async () => {
      if (!viewConfig) return;
      if (saveMode === 'new' && !newViewName) return;
      
      const dataToSave = typeof viewConfig.currentState === 'function' ? viewConfig.currentState() : viewConfig.currentState;
      
      try {
        if (window.supabase) {
           if (isDefaultView) {
               await window.supabase.from('fm_user_views').update({ is_default: false }).eq('page_id', viewConfig.pageId).eq('user_id', MOCK_USER_ID);
           }
           
           if (saveMode === 'update' && activeView) {
               const { data, error } = await window.supabase.from('fm_user_views')
                   .update({ view_data: dataToSave, is_default: isDefaultView })
                   .eq('id', activeView.id)
                   .select();
               if (error) throw error;
               
               setViews(prev => prev.map(v => {
                   if (isDefaultView && v.id !== activeView.id) return { ...v, is_default: false };
                   if (v.id === activeView.id) return data[0];
                   return v;
               }));
               setActiveView(data[0]);
           } else {
               const newView = {
                 user_id: MOCK_USER_ID,
                 page_id: viewConfig.pageId,
                 view_name: newViewName,
                 view_data: dataToSave,
                 is_default: isDefaultView
               };
               const { data, error } = await window.supabase.from('fm_user_views').insert([newView]).select();
               if (error) throw error;
               
               setViews(prev => {
                 let updated = [...prev];
                 if (isDefaultView) updated = updated.map(v => ({...v, is_default: false}));
                 return [...updated, data[0]];
               });
               setActiveView(data[0]);
           }
           setIsSaveModalOpen(false);
           return;
        } else throw new Error();
      } catch(e) {
        let local = JSON.parse(localStorage.getItem(`fm_views_${viewConfig.pageId}`) || '[]');
        if (isDefaultView) local = local.map(v => ({...v, is_default: false}));
        
        let updatedView;
        if (saveMode === 'update' && activeView) {
            const idx = local.findIndex(v => v.id === activeView.id);
            if (idx > -1) {
                local[idx] = { ...local[idx], view_data: dataToSave, is_default: isDefaultView };
                updatedView = local[idx];
            }
        } else {
            updatedView = {
              id: Date.now().toString(),
              user_id: MOCK_USER_ID,
              page_id: viewConfig.pageId,
              view_name: newViewName,
              view_data: dataToSave,
              is_default: isDefaultView
            };
            local.push(updatedView);
        }
        
        localStorage.setItem(`fm_views_${viewConfig.pageId}`, JSON.stringify(local));
        
        setViews(local);
        setActiveView(updatedView);
        setIsSaveModalOpen(false);
      }
    };

    const handleDeleteView = async (id) => {
      try {
        if (window.supabase) {
          await window.supabase.from('fm_user_views').delete().eq('id', id);
        } else throw new Error();
      } catch(e) {
        const local = JSON.parse(localStorage.getItem(`fm_views_${viewConfig.pageId}`) || '[]');
        const updated = local.filter(v => v.id !== id);
        localStorage.setItem(`fm_views_${viewConfig.pageId}`, JSON.stringify(updated));
      }
      setViews(prev => prev.filter(v => v.id !== id));
      if (activeView && activeView.id === id) {
        handleResetView();
      }
    };

    const handleSetDefaultView = async (id) => {
      try {
        if (window.supabase) {
          await window.supabase.from('fm_user_views').update({ is_default: false }).eq('page_id', viewConfig.pageId).eq('user_id', MOCK_USER_ID);
          if (id !== 'system') {
            await window.supabase.from('fm_user_views').update({ is_default: true }).eq('id', id);
          }
        } else {
          let local = JSON.parse(localStorage.getItem(`fm_views_${viewConfig.pageId}`) || '[]');
          local = local.map(v => ({ ...v, is_default: v.id === id }));
          localStorage.setItem(`fm_views_${viewConfig.pageId}`, JSON.stringify(local));
        }
        setViews(prev => prev.map(v => ({ ...v, is_default: v.id === id })));
      } catch(e) {
        console.error("Error setting default view", e);
      }
    };

    const handleApplyView = (view) => {
      setActiveView(view);
      setIsDropdownOpen(false);
      setIsManageModalOpen(false);
      if (viewConfig && viewConfig.onApplyState && view) {
        viewConfig.onApplyState(view.view_data);
      }
    };

    const handleResetView = () => {
      setActiveView(null);
      setIsDropdownOpen(false);
      setIsManageModalOpen(false);
      if (viewConfig && viewConfig.onApplyState) {
        viewConfig.onApplyState(null); 
      }
    };

    const isSystemDefault = !views.some(v => v.is_default);

    return (
      <div className="flex flex-col mb-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="flex flex-col gap-1.5">
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold overflow-hidden whitespace-nowrap">
                <Home size={12} className="shrink-0" />
                {breadcrumbs.map((bc, idx) => (
                  <React.Fragment key={idx}>
                    <span className="opacity-40 shrink-0">{isRtl ? <ChevronLeft size={10} strokeWidth={3}/> : <ChevronRight size={10} strokeWidth={3}/>}</span>
                    <span className="flex items-center gap-1 shrink-0 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors">
                      {bc.icon && <bc.icon size={12} />}
                      {bc.label}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              {Icon && <div className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0"><Icon size={18} strokeWidth={2.5}/></div>}
              <h1 className="text-[14px] font-black tracking-tight">{title}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {viewConfig && (
              <div className={`relative ${isDropdownOpen ? 'z-[9999]' : 'z-10'}`} ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2 px-3 h-8 rounded-lg border text-[12px] font-bold transition-all ${activeView ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <LayoutTemplate size={14} className={activeView ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                  <span>{t('نما:', 'View:')} <span className={activeView ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>{activeView ? activeView.view_name : t('پیش‌فرض سیستم', 'System Default')}</span></span>
                  <ChevronDown size={14} className="opacity-70" />
                </button>

                {isDropdownOpen && (
                  <div className={`absolute top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl py-1.5 z-[9999] animate-in zoom-in-95 duration-100 ${isRtl ? 'left-0' : 'right-0'}`}>
                    <button onClick={() => { 
                        setIsSaveModalOpen(true); 
                        setIsDropdownOpen(false); 
                        setSaveMode(activeView ? 'update' : 'new');
                        setNewViewName(activeView ? activeView.view_name : '');
                        setIsDefaultView(activeView ? activeView.is_default : false);
                    }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <Save size={14} /> {t('ذخیره این نما', 'Save Current View')}
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>
                    <button onClick={handleResetView} className={`w-full flex items-center justify-between px-3 py-2 text-[12px] font-bold transition-colors ${!activeView ? 'text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-700/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                      <span>{t('پیش‌فرض سیستم', 'System Default')}</span>
                      {!activeView && <Check size={14} className="text-emerald-500" />}
                    </button>
                    {views.map(v => (
                      <button key={v.id} onClick={() => handleApplyView(v)} className={`w-full flex items-center justify-between px-3 py-2 text-[12px] font-bold transition-colors ${activeView?.id === v.id ? 'text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-700/50' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                        <span>{v.view_name}</span>
                        {activeView?.id === v.id && <Check size={14} className="text-emerald-500" />}
                      </button>
                    ))}
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>
                    <button onClick={() => { setIsManageModalOpen(true); setIsDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <Settings size={14} /> {t('مدیریت نماها', 'Manage Views')}
                    </button>
                  </div>
                )}
              </div>
            )}
            {actions}
          </div>
        </div>

        {viewConfig && window.DSFeedback && (
          <>
            <window.DSFeedback.Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title={t('ذخیره نمای جاری', 'Save Current View')} width="max-w-md" language={language}>
               <div className="p-5 flex flex-col gap-4">
                  {activeView && (
                      <RadioGroup 
                          options={[
                              { label: t('بروزرسانی نمای فعلی', 'Update current view') + ` (${activeView.view_name})`, value: 'update' },
                              { label: t('ذخیره به عنوان نمای جدید', 'Save as new view'), value: 'new' }
                          ]}
                          value={saveMode}
                          onChange={setSaveMode}
                          isRtl={isRtl}
                          inline={false}
                      />
                  )}
                  {(saveMode === 'new' || !activeView) && (
                      <TextField label={t('نام نما', 'View Name')} value={newViewName} onChange={(e) => setNewViewName(e.target.value)} isRtl={isRtl} required />
                  )}
                  <ToggleField label={t('تنظیم به عنوان پیش‌فرض این صفحه', 'Set as default for this page')} checked={isDefaultView} onChange={setIsDefaultView} isRtl={isRtl} />
                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <Button variant="outline" size="sm" onClick={() => setIsSaveModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
                    <Button variant="primary" size="sm" onClick={handleSaveView} disabled={saveMode === 'new' && !newViewName}>{t('ذخیره نما', 'Save View')}</Button>
                  </div>
               </div>
            </window.DSFeedback.Modal>

            <window.DSFeedback.Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title={t('مدیریت نماهای صفحه', 'Manage Page Views')} width="max-w-lg" language={language}>
               <div className="p-4 flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar gap-2">
                  
                  {/* System Default View - Always present at the top */}
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{t('پیش‌فرض سیستم', 'System Default')}</span>
                      {isSystemDefault && <Badge variant="emerald" className="!py-0 !px-1.5 text-[10px]">{t('پیش‌فرض', 'Default')}</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleSetDefaultView('system')} title={t('تنظیم به عنوان پیش‌فرض', 'Set as Default')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${isSystemDefault ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        {t('پیش‌فرض', 'Default')}
                      </button>
                      <Button size="sm" variant="ghost" onClick={handleResetView} className="!h-7 !px-2 !text-[10px] text-indigo-600 dark:text-indigo-400">{t('اعمال', 'Apply')}</Button>
                      <div className="w-[28px]"></div> {/* Spacer to align with items that have trash icon */}
                    </div>
                  </div>

                  {/* Saved User Views */}
                  {views.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{v.view_name}</span>
                        {v.is_default && <Badge variant="emerald" className="!py-0 !px-1.5 text-[10px]">{t('پیش‌فرض', 'Default')}</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleSetDefaultView(v.id)} title={t('تنظیم به عنوان پیش‌فرض', 'Set as Default')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${v.is_default ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                          {t('پیش‌فرض', 'Default')}
                        </button>
                        <Button size="sm" variant="ghost" onClick={() => handleApplyView(v)} className="!h-7 !px-2 !text-[10px] text-indigo-600 dark:text-indigo-400">{t('اعمال', 'Apply')}</Button>
                        <button onClick={() => handleDeleteView(v.id)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}

               </div>
            </window.DSFeedback.Modal>
          </>
        )}
      </div>
    );
  };

  const Tabs = ({ tabs = [], activeTab, onChange, className = '' }) => {
    return (
      <div className={`flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto custom-scrollbar ${className}`}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold transition-all border-b-2 outline-none whitespace-nowrap ${isActive ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-t-lg' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-t-lg'}`}
            >
              {Icon && <Icon size={16} />}
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  };

  const Skeleton = ({ className = '', variant = 'text', width, height }) => {
    const base = "bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0";
    const styles = variant === 'circle' ? 'rounded-full' : 'rounded-lg';
    return <div className={`${base} ${styles} ${className}`} style={{ width: width || '100%', height: height || (variant === 'text' ? '1rem' : '100%') }}></div>;
  };

  const EmptyState = ({ title, description, icon: Icon = Search, action }) => {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
          <Icon size={32} strokeWidth={1.5} />
        </div>
        <h4 className="text-[14px] font-black text-slate-800 dark:text-slate-100 mb-1">{title}</h4>
        <p className="text-[12px] text-slate-400 dark:text-slate-500 max-w-[250px] leading-relaxed mb-4">{description}</p>
        {action}
      </div>
    );
  };

  const StatCard = ({ label, value, icon: Icon, trend, trendValue, color = 'indigo', language = 'fa' }) => {
    const isRtl = language === 'fa';
    const colors = {
      indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800",
      emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800",
      amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800",
      rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800",
      blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
    };
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 rounded-xl p-4 shadow-sm group transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg border ${colors[color]} group-hover:scale-110 transition-transform`}>
            {Icon && <Icon size={20} />}
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
              {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
          <span className="text-[18px] font-black text-slate-800 dark:text-slate-100 tracking-tight">{value}</span>
        </div>
      </div>
    );
  };

  const Timeline = ({ items = [], language = 'fa' }) => {
    const isRtl = language === 'fa';
    return (
      <div className="flex flex-col gap-4 relative py-2" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`absolute top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700 ${isRtl ? 'right-2' : 'left-2'}`}></div>
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-4 relative z-10">
            <div className={`w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm shrink-0 mt-1 ${item.variant === 'success' ? 'bg-emerald-500' : item.variant === 'danger' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-black text-slate-800 dark:text-slate-100">{item.title}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">{item.time}</span>
              </div>
              {item.description && <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const Avatar = ({ src, name, size = 'md', className = '' }) => {
    const sizes = { sm: 'w-7 h-7 text-[10px]', md: 'w-10 h-10 text-[12px]', lg: 'w-14 h-14 text-[14px]' };
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '?';
    return (
      <div className={`${sizes[size]} rounded-full border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden shrink-0 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-black ${className}`}>
        {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
      </div>
    );
  };

  const DropdownMenu = ({ trigger, items = [], language = 'fa', formCode }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const isRtl = language === 'fa';
    const access = useSecureAccess(formCode);

    useEffect(() => {
      const click = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', click);
      return () => document.removeEventListener('mousedown', click);
    }, []);

    const filteredItems = items.filter(item => {
        if (item.divider) return true;
        if (!item.requiredAccess) return true;
        if (item.requiredAccess === 'view') return access.canView;
        if (item.requiredAccess === 'create') return access.canCreate;
        if (item.requiredAccess === 'edit' || item.requiredAccess === 'update') return access.canEdit;
        if (item.requiredAccess === 'delete') return access.canDelete;
        if (item.requiredAccess === 'print' || item.requiredAccess === 'export') return access.canPrint;
        return access.hasCustomAccess(item.requiredAccess);
    }).filter((item, idx, arr) => {
        if (item.divider) {
            if (idx === 0 || idx === arr.length - 1) return false;
            if (arr[idx - 1].divider) return false;
        }
        return true;
    });

    if (filteredItems.length === 0 && items.length > 0) return null;

    return (
      <div className={`relative inline-block text-start ${open ? 'z-[9999]' : 'z-10'}`} ref={ref} dir={isRtl ? 'rtl' : 'ltr'}>
        <div onClick={() => setOpen(!open)} className="cursor-pointer">{trigger}</div>
        {open && (
          <div className={`absolute mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-1 animate-in zoom-in-95 duration-150 z-[9999] ${isRtl ? 'left-0' : 'right-0'}`}>
            {filteredItems.map((item, i) => (
              item.divider ? <div key={i} className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-1"></div> :
              <button 
                key={i} 
                onClick={() => { item.onClick?.(); setOpen(false); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-bold rounded-lg transition-colors ${item.variant === 'danger' ? 'text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                {item.icon && <item.icon size={14} />}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ProgressBar = ({ value = 0, max = 100, color = 'indigo', size = 'md', label, showValue = true }) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const heights = { sm: 'h-1', md: 'h-2', lg: 'h-4' };
    const colors = { indigo: "bg-indigo-600 dark:bg-indigo-500", emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", blue: "bg-blue-500" };
    return (
      <div className="w-full flex flex-col gap-1.5">
        {(label || showValue) && (
          <div className="flex items-center justify-between text-[10px] font-black text-slate-500 dark:text-slate-400">
            {label && <span>{label}</span>}
            {showValue && <span>{Math.round(pct)}%</span>}
          </div>
        )}
        <div className={`w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden ${heights[size]}`}>
          <div className={`h-full transition-all duration-500 ease-out rounded-full ${colors[color]}`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  const Stepper = ({ steps = [], currentStep = 0, language = 'fa' }) => {
    const isRtl = language === 'fa';
    return (
      <div className="w-full py-4 px-2" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-700 z-0"></div>
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <div key={idx} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : isActive ? 'bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 scale-110 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'}`}>
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : <span className="text-[12px] font-black">{idx + 1}</span>}
                </div>
                <span className={`text-[10px] font-black transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Spinner = ({ size = 'md', color = 'text-indigo-600 dark:text-indigo-400' }) => {
    const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
    return (
      <svg className={`animate-spin ${sizes[size]} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    );
  };

  window.DSCore = window.DSCore || {};
  Object.assign(window.DSCore, {
    getGlobalCalendarMode, setGlobalCalendarMode, useCalendarMode, formatGlobalDate, j2g, g2j,
    getGlobalTheme, setGlobalTheme, useTheme,
    useSecureDataScope, applyDataScope, useSecureAccess,
    Button, Card, Badge, PageHeader, Tabs, Skeleton, EmptyState, StatCard, 
    Timeline, Avatar, DropdownMenu, ProgressBar, Stepper, Spinner
  });
})();