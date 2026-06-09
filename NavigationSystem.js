/* Filename: NavigationSystem.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo } = React;
  
  const FallbackIcon = (props) => <span {...props} style={{ display: 'inline-block', width: props.size || 16, height: props.size || 16 }} />;
  const LucideIcons = window.LucideIcons || {};
  const { 
    Search = FallbackIcon, Star = FallbackIcon, ChevronLeft = FallbackIcon, ChevronRight = FallbackIcon, LayoutGrid = FallbackIcon, 
    ListTree = FallbackIcon, FileText = FallbackIcon, Bell = FallbackIcon, Monitor = FallbackIcon, Clock = FallbackIcon,
    Settings = FallbackIcon, ArrowLeft = FallbackIcon, ArrowRight = FallbackIcon, ChevronDown = FallbackIcon, Folder = FallbackIcon, FolderOpen = FallbackIcon, Globe = FallbackIcon, Loader2 = FallbackIcon, FileWarning = FallbackIcon,
    Maximize2 = FallbackIcon, Minimize2 = FallbackIcon, FileSpreadsheet = FallbackIcon, Calendar = FallbackIcon, Moon = FallbackIcon, Sun = FallbackIcon,
    HelpCircle = FallbackIcon, LogOut = FallbackIcon
  } = LucideIcons;

  const FormLoader = ({ path, language }) => {
    if (!path) return null;

    const componentName = path.split('/').pop();
    const DynamicComponent = window[componentName];

    if (!DynamicComponent) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-10 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <FileWarning size={32} />
          </div>
          <h3 className="text-[16px] font-black text-slate-800 dark:text-slate-100 mb-2">خطا در بارگذاری فرم</h3>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg mt-2 font-sans">
            کامپوننت <br/><strong className="text-red-600 dark:text-red-400 font-sans">{componentName}</strong><br/> در سیستم یافت نشد (لطفاً بررسی کنید که فایل آن آپلود شده باشد).
          </p>
        </div>
      );
    }

    return <DynamicComponent language={language} formCode={DynamicComponent.formCode || componentName} />;
  };

  const NavigationSystem = ({ isAdmin = true, initialLanguage = 'fa' }) => {
    const supabase = window.supabase;
    const { Dialog } = window.DSFeedback || {};
    
    const { hasAccess, isFullAccess } = window.SecurityManager ? window.SecurityManager.useSecurity() : { hasAccess: () => true, isFullAccess: true };

    const [currentLanguage, setCurrentLanguage] = window.DSCore?.useLanguage
      ? window.DSCore.useLanguage(initialLanguage)
      : useState(initialLanguage);
    const isRtl = currentLanguage === 'fa';
    
    const t = (fa, en) => isRtl ? fa : en;
    const getLabel = (item) => isRtl ? item.label_fa : (item.label_en || item.label_fa);

    const [menuData, setMenuData] = useState([]);
    const [favorites, setFavorites] = useState(new Set());
    const [recents, setRecents] = useState([]);
    
    const [viewMode, setViewMode] = useState('tile');
    const [searchTerm, setSearchTerm] = useState('');
    const [treeSearchTerm, setTreeSearchTerm] = useState('');
    const [expandedNodes, setExpandedNodes] = useState({});
    const [collapsedModules, setCollapsedModules] = useState({});
    const [loading, setLoading] = useState(true);
    
    const [activeDomainId, setActiveDomainId] = useState('HOME_FAV');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeForm, setActiveForm] = useState(null);
    const [activeFormId, setActiveFormId] = useState(null);
    
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);

    const [docModalInfo, setDocModalInfo] = useState({ isOpen: false, type: 'user' });
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

    const calendarMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';
    const theme = window.DSCore?.useTheme ? window.DSCore.useTheme() : 'light';

    const sessionString = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
    let sessionUser = { id: '00000000-0000-0000-0000-000000000000', username: 'US', photo_url: null };
    try {
        const parsed = JSON.parse(sessionString);
        if (parsed && parsed.id) {
            sessionUser = parsed;
        }
    } catch (e) {}
    const CURRENT_USER_ID = sessionUser.id;

    const [avatarUrl, setAvatarUrl] = useState(sessionUser.photo_url || null);
    useEffect(() => {
      const handler = (e) => setAvatarUrl(e.detail);
      window.addEventListener('fm_avatar_change', handler);
      return () => window.removeEventListener('fm_avatar_change', handler);
    }, []);
    const RECENTS_STORAGE_KEY = `sys_recents_${CURRENT_USER_ID}`;

    useEffect(() => {
      fetchMenuData();
      fetchFavorites();
      const savedRecents = localStorage.getItem(RECENTS_STORAGE_KEY);
      if (savedRecents) {
        setRecents(JSON.parse(savedRecents));
      }
    }, []);

    useEffect(() => {
      setExpandedNodes({});
      setCollapsedModules({});
      setTreeSearchTerm('');
    }, [activeDomainId]);

    const fetchMenuData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('menus')
          .select('*')
          .eq('is_visible', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setMenuData(data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchFavorites = async () => {
      try {
        const { data } = await supabase
          .from('user_favorites')
          .select('menu_id')
          .eq('user_id', CURRENT_USER_ID);
        if (data) setFavorites(new Set(data.map(f => f.menu_id)));
      } catch(err) {}
    };

    const toggleFavorite = async (e, id) => {
      e.stopPropagation();
      const node = menuData.find(m => m.id === id);
      if (!node || node.menu_type !== 'form') return;

      const newFavs = new Set(favorites);
      const isAdding = !newFavs.has(id);
      if (isAdding) newFavs.add(id); else newFavs.delete(id);
      setFavorites(newFavs);

      try {
        if (isAdding) await supabase.from('user_favorites').insert({ user_id: CURRENT_USER_ID, menu_id: id });
        else await supabase.from('user_favorites').delete().match({ user_id: CURRENT_USER_ID, menu_id: id });
      } catch (err) {}
    };

    const handleFormClick = (item) => {
      setActiveForm(item);
      setActiveFormId(item.id);
      const newRecents = [item.id, ...recents.filter(id => id !== item.id)].slice(0, 10);
      setRecents(newRecents);
      localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(newRecents));
    };

    const toggleCalendar = () => {
      const newMode = calendarMode === 'jalali' ? 'gregorian' : 'jalali';
      if (window.DSCore?.setGlobalCalendarMode) {
        window.DSCore.setGlobalCalendarMode(newMode);
      }
    };

    const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      if (window.DSCore?.setGlobalTheme) {
        window.DSCore.setGlobalTheme(newTheme);
      }
    };

    const handleLogoutClick = () => {
      setLogoutConfirmOpen(true);
    };

    const executeLogout = () => {
      sessionStorage.removeItem('fm_user_session');
      localStorage.removeItem('fm_user_session');
      window.location.reload();
    };

    const handleProfileClick = () => {
      setActiveDomainId('HOME_FAV');
      setActiveForm({
        id: 'SYS_USER_PROFILE',
        unique_code: 'SYS_USER_PROFILE',
        label_fa: 'پروفایل کاربری',
        label_en: 'User Profile',
        component_path: 'UserProfile',
        icon: 'User'
      });
      setActiveFormId('SYS_USER_PROFILE');
    };

    // تجمیع منوهای مجاز و بازسازی بازگشتی مسیر گره‌های بالاسری (Parents) برای نمایش صحیح درخت
    const accessibleMenus = useMemo(() => {
      if (isFullAccess) return menuData;
      
      const accessibleIds = new Set();
      
      menuData.forEach(m => {
        if (m.menu_type === 'form') {
          if (hasAccess(m.unique_code)) {
            accessibleIds.add(m.id);
            let pid = m.parent_id;
            while (pid) {
              accessibleIds.add(pid);
              const pMenu = menuData.find(x => x.id === pid);
              pid = pMenu ? pMenu.parent_id : null;
            }
          }
        }
      });
      
      return menuData.filter(m => accessibleIds.has(m.id));
    }, [menuData, hasAccess, isFullAccess]);

    const domains = useMemo(() => accessibleMenus.filter(m => m.menu_type === 'domain'), [accessibleMenus]);
    
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }));
    };

    const fullTree = useMemo(() => buildTree(accessibleMenus), [accessibleMenus]);

    const flattenedForms = useMemo(() => {
      const forms = [];
      const traverse = (node, path = []) => {
        const currentPath = [...path, getLabel(node)];
        if (node.menu_type === 'form') forms.push({ ...node, fullPath: currentPath.join(' / ') });
        if (node.children) node.children.forEach(c => traverse(c, currentPath));
      };
      fullTree.forEach(domain => traverse(domain));
      return forms;
    }, [fullTree, currentLanguage]);

    const filteredItems = useMemo(() => {
      if (!searchTerm) return [];
      return flattenedForms.filter(f => 
        getLabel(f).toLowerCase().includes(searchTerm.toLowerCase()) || 
        (f.unique_code && f.unique_code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }, [searchTerm, flattenedForms, currentLanguage]);

    const activeTree = useMemo(() => {
      if (activeDomainId === 'HOME_FAV') return [];
      return buildTree(accessibleMenus, activeDomainId);
    }, [accessibleMenus, activeDomainId]);

    const filteredActiveTree = useMemo(() => {
      if (!treeSearchTerm) return activeTree;
      const lowerTerm = treeSearchTerm.toLowerCase();
      
      const filterNodes = (nodes) => {
        return nodes.reduce((acc, node) => {
          const matchFa = (node.label_fa || '').toLowerCase().includes(lowerTerm);
          const matchEn = (node.label_en || '').toLowerCase().includes(lowerTerm);
          const matchCode = (node.unique_code || '').toLowerCase().includes(lowerTerm);
          
          const filteredChildren = node.children ? filterNodes(node.children) : [];
          
          if (matchFa || matchEn || matchCode || filteredChildren.length > 0) {
            acc.push({ ...node, children: filteredChildren });
          }
          return acc;
        }, []);
      };
      
      return filterNodes(activeTree);
    }, [activeTree, treeSearchTerm]);

    const getAllForms = (node) => {
      let forms = [];
      if (node.menu_type === 'form') forms.push(node);
      if (node.children) node.children.forEach(c => { forms = forms.concat(getAllForms(c)); });
      return forms;
    };

    const toggleNode = (id) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleModuleCollapse = (id) => setCollapsedModules(prev => ({ ...prev, [id]: !prev[id] }));

    const handleExpandAll = () => {
      const allNodes = {};
      const traverse = (nodes) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            allNodes[node.id] = true;
            traverse(node.children);
          }
        });
      };
      traverse(activeTree);
      setExpandedNodes(allNodes);
    };

    const handleCollapseAll = () => {
      setExpandedNodes({});
    };

    const handleExportMenu = () => {
      const rows = [];
      const traverse = (nodes, path = '') => {
        nodes.forEach(node => {
          const currentPath = path ? `${path} > ${getLabel(node)}` : getLabel(node);
          rows.push({
            ID: node.id,
            Code: node.unique_code || '',
            Label_FA: node.label_fa,
            Label_EN: node.label_en || '',
            Type: node.menu_type,
            Path: currentPath
          });
          if (node.children) traverse(node.children, currentPath);
        });
      };
      traverse(activeTree);
      
      if (rows.length === 0) return;

      const headers = Object.keys(rows[0]).join(",");
      const csvData = rows.map(row => 
        Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
      ).join("\n");
      
      const csvContent = "\uFEFF" + headers + "\n" + csvData;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Menu_Export_${activeDomainId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const DynamicIcon = (props) => {
      const name = props.name;
      const size = props.size || 18;
      const restProps = Object.assign({}, props);
      delete restProps.name;
      delete restProps.size;
      
      let Icon = typeof name === 'string' ? LucideIcons[name] : name;
      if (!Icon) Icon = FileText;
      if (!Icon) return <FallbackIcon size={size} {...restProps} />;
      return <Icon size={size} {...restProps} />;
    };

    const showSidebar = viewMode === 'tree' && activeDomainId !== 'HOME_FAV';

    const renderSidebarNode = (node, depth = 0) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes[node.id];
      const isForm = node.menu_type === 'form';
      const isFav = isForm && favorites.has(node.id);
      const isSelected = activeFormId === node.id;
      const guideLinePos = depth * 20 + 26; 

      return (
        <div key={node.id} className="select-none relative">
          <div 
            className={`flex items-center py-1 my-[2px] rounded-md cursor-pointer transition-colors group ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-400'} ${depth === 0 && !isSelected ? 'font-bold text-slate-800 dark:text-slate-100' : ''}`}
            style={{ paddingInlineStart: `${depth * 20 + 8}px`, paddingInlineEnd: '8px' }}
            onClick={() => { if (hasChildren) toggleNode(node.id); else if (isForm) handleFormClick(node); }}
          >
            {hasChildren ? (
              <>
                <div className="flex items-center justify-center w-5 shrink-0">
                  <div className={`transition-transform duration-200 ${isExpanded ? (isRtl ? '-rotate-90 text-indigo-500 dark:text-indigo-400' : 'rotate-90 text-indigo-500 dark:text-indigo-400') : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-400 dark:group-hover:text-indigo-300'}`}>
                    {isRtl ? <ChevronLeft size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                  </div>
                </div>
                <div className="flex items-center justify-center w-6 shrink-0">
                  {isExpanded ? (
                    <FolderOpen size={15} className="text-indigo-500 dark:text-indigo-400" fill="currentColor" fillOpacity={0.15} strokeWidth={2} />
                  ) : (
                    <Folder size={15} className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" strokeWidth={2} />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-5 shrink-0" />
                <div className="flex items-center justify-center w-6 shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isSelected ? 'bg-indigo-600 dark:bg-indigo-500 scale-[1.5] ring-[3px] ring-indigo-100 dark:ring-indigo-900/50' : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-400 dark:group-hover:bg-indigo-500 group-hover:scale-125'}`} />
                </div>
              </>
            )}
            <span className={`flex-1 truncate ${isRtl ? 'pr-1.5' : 'pl-1.5'} ${depth === 0 ? 'text-[14px]' : 'text-[12px]'} ${isSelected ? 'font-black' : 'font-medium'}`}>
              {getLabel(node)}
            </span>
            {isForm && (
              <button onClick={(e) => toggleFavorite(e, node.id)} className={`transition-all p-1 shrink-0 ${isFav ? 'text-amber-400' : 'opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-amber-400'}`}>
                <Star size={13} fill={isFav ? "currentColor" : "none"} />
              </button>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div className="relative">
              <div className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" style={{ [isRtl ? 'right' : 'left']: `${guideLinePos}px` }} />
              <div className="space-y-[2px] animate-in slide-in-from-top-1 duration-200 pt-0.5 pb-1 relative z-10 font-sans">
                {node.children.map(child => renderSidebarNode(child, depth + 1))}
              </div>
            </div>
          )}
        </div>
      );
    };

    const renderTileCard = (item) => {
      const isFav = favorites.has(item.id);
      return (
        <div key={item.id} onClick={() => handleFormClick(item)} className="w-[100px] h-[100px] shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex flex-col justify-between hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer group relative overflow-hidden">
          <div className="flex items-start justify-between z-10">
            <div className="p-1.5 rounded-md transition-colors bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              <DynamicIcon name={item.icon || 'FileText'} size={18} strokeWidth={2.5} />
            </div>
            <button onClick={(e) => toggleFavorite(e, item.id)} className={`z-20 p-0.5 transition-all ${isFav ? 'text-amber-400' : 'opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-amber-400'}`}>
              <Star size={16} fill={isFav ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="z-10 mt-auto pt-1">
            <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200 leading-snug group-hover:text-indigo-700 dark:group-hover:text-indigo-400 whitespace-normal break-words line-clamp-3">
              {getLabel(item)}
            </div>
          </div>
        </div>
      );
    };

    const renderFioriTiles = () => {
      const directForms = [];
      const groupedModules = [];
      activeTree.forEach(node => {
        if (node.menu_type === 'form') directForms.push(node);
        else groupedModules.push(node);
      });
      return (
        <div className="p-8 space-y-10 animate-in fade-in duration-300 font-sans">
          {directForms.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors px-2 -mx-2 rounded-t-md font-sans" onClick={() => toggleModuleCollapse('direct_forms')}>
                <div className="text-slate-400 dark:text-slate-500">
                  {collapsedModules['direct_forms'] ? (isRtl ? <ChevronLeft size={18} strokeWidth={2.5}/> : <ChevronRight size={18} strokeWidth={2.5}/>) : <ChevronDown size={18} strokeWidth={2.5} />}
                </div>
                <h3 className="text-[16px] font-black text-slate-800 dark:text-slate-100">{t('فرم‌های مستقل', 'Independent Forms')}</h3>
              </div>
              {!collapsedModules['direct_forms'] && <div className="flex flex-wrap gap-3 animate-in slide-in-from-top-1 duration-200">{directForms.map(renderTileCard)}</div>}
            </section>
          )}
          {groupedModules.map(moduleNode => {
            const sections = [];
            const moduleDirectForms = [];
            (moduleNode.children || []).forEach(child => {
              if (child.menu_type === 'form') moduleDirectForms.push(child);
              else sections.push(child);
            });
            const allNested = getAllForms(moduleNode);
            if (allNested.length === 0) return null;
            const isCollapsed = collapsedModules[moduleNode.id];
            return (
              <section key={moduleNode.id} className="space-y-4 font-sans">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors px-2 -mx-2 rounded-t-md select-none font-sans" onClick={() => toggleModuleCollapse(moduleNode.id)}>
                  <div className="text-slate-400 dark:text-slate-500">
                    {isCollapsed ? (isRtl ? <ChevronLeft size={18} strokeWidth={2.5}/> : <ChevronRight size={18} strokeWidth={2.5}/>) : <ChevronDown size={18} strokeWidth={2.5} />}
                  </div>
                  <h3 className="text-[16px] font-black text-slate-800 dark:text-slate-100">{getLabel(moduleNode)}</h3>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[12px] px-2.5 py-0.5 rounded-full font-bold">{allNested.length} {t('فرم', 'Forms')}</span>
                </div>
                {!isCollapsed && (
                  <div className="space-y-4 pt-1 animate-in slide-in-from-top-1 duration-200">
                    {moduleDirectForms.length > 0 && (
                      <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
                        <div className="w-24 shrink-0 pt-1.5 flex items-center font-black text-slate-400 dark:text-slate-500 text-[14px] uppercase tracking-wider">{t('عمومی', 'General')}</div>
                        <div className="flex-1 flex flex-wrap gap-3">{moduleDirectForms.map(renderTileCard)}</div>
                      </div>
                    )}
                    {sections.map(section => {
                      const sectionForms = getAllForms(section);
                      if (sectionForms.length === 0) return null;
                      return (
                        <div key={section.id} className="flex flex-col md:flex-row md:items-start gap-4 mb-4 font-sans">
                          <div className="w-24 shrink-0 pt-1.5 flex items-center gap-1.5 font-black text-slate-700 dark:text-slate-300 text-[14px]">
                            <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full"></div>
                            <span className="leading-tight">{getLabel(section)}</span>
                          </div>
                          <div className="flex-1 flex flex-wrap gap-3">{sectionForms.map(renderTileCard)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      );
    };

    const renderHomeView = () => {
      const favItems = accessibleMenus.filter(m => favorites.has(m.id) && m.menu_type === 'form');
      const recentItems = recents.map(id => accessibleMenus.find(m => m.id === id)).filter(Boolean);
      return (
        <div className="p-8 space-y-10 animate-in fade-in font-sans">
          <section>
            <div className="flex items-center gap-2 mb-4 px-1 border-b border-slate-200 dark:border-slate-700 pb-2">
              <Clock size={18} className="text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
              <h2 className="text-[16px] font-black text-slate-800 dark:text-slate-100">{t('بازدیدهای اخیر', 'Recent Visits')}</h2>
            </div>
            <div className="flex flex-wrap gap-3">{recentItems.length > 0 ? recentItems.map(renderTileCard) : <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 text-[14px] font-sans">{t('شما هنوز از فرمی بازدید نکرده‌اید.', 'You have not visited any forms yet.')}</div>}</div>
          </section>
          <section>
            <div className="flex items-center gap-2 mb-4 px-1 border-b border-slate-200 dark:border-slate-700 pb-2">
              <Star size={18} className="text-amber-500 dark:text-amber-400" fill="currentColor" />
              <h2 className="text-[16px] font-black text-slate-800 dark:text-slate-100">{t('فرم‌های منتخب (علاقه‌مندی‌ها)', 'Favorite Forms')}</h2>
            </div>
            <div className="flex flex-wrap gap-3">{favItems.length > 0 ? favItems.map(renderTileCard) : <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 text-[14px] font-sans">{t('فرمی به علاقه‌مندی‌ها اضافه نشده است.', 'No forms added to favorites.')}</div>}</div>
          </section>
        </div>
      );
    };

    if (loading) return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f8fafc] dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400 font-sans">در حال بارگذاری...</p>
        </div>
      </div>
    );

    const NotificationSidebarComponent = window.NotificationSidebar;
    const NavigationDocsComponent = window.NavigationDocs;

    return (
      <div className="h-screen w-full flex bg-[#f8fafc] dark:bg-slate-900 overflow-hidden font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <nav className={`w-[60px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex flex-col items-center py-6 gap-4 shrink-0 z-40 shadow-sm relative ${isRtl ? 'border-l' : 'border-r'}`}>
          <button onClick={() => { setActiveDomainId('HOME_FAV'); setActiveForm(null); setActiveFormId(null); }} className={`relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all mb-4 ${activeDomainId === 'HOME_FAV' ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
            <Star size={18} fill={activeDomainId === 'HOME_FAV' ? "currentColor" : "none"} />
            <div className={`absolute ${isRtl ? 'right-full mr-3' : 'left-full ml-3'} px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-[12px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg font-sans`}>{t('میز کار و علاقه‌مندی‌ها', 'Workspace & Favorites')}</div>
          </button>
          {domains.map(domain => (
            <button key={domain.id} onClick={() => { setActiveDomainId(domain.id); setActiveForm(null); setActiveFormId(null); }} className={`relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all ${activeDomainId === domain.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <DynamicIcon name={domain.icon} size={18} />
              <div className={`absolute ${isRtl ? 'right-full mr-3' : 'left-full ml-3'} px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-[12px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg font-sans`}>{getLabel(domain)}</div>
            </button>
          ))}
          <div className="mt-auto flex flex-col items-center gap-5">
            <button onClick={handleLogoutClick} title={t('خروج از سیستم', 'Logout')} className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"><LogOut size={18} /></button>
            <div onClick={handleProfileClick} title={t('پروفایل کاربری', 'User Profile')} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-[12px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors uppercase overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : (sessionUser.username ? sessionUser.username.substring(0, 2) : 'US')
              }
            </div>
          </div>
        </nav>

        {showSidebar && (
          <aside className={`bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-30 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden opacity-0'} ${isRtl ? 'border-l' : 'border-r'}`}>
            <div className="h-12 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-700/50 shrink-0 font-sans">
              <h2 className="font-black text-slate-800 dark:text-slate-100 tracking-tight text-[14px] truncate flex-1 font-sans">{getLabel(domains.find(d => d.id === activeDomainId) || {})}</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 dark:text-slate-500 transition-colors">{isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
            </div>
            
            <div className="flex items-center justify-between p-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 gap-2 shrink-0 overflow-x-auto custom-scrollbar">
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={handleExpandAll} title={t('باز کردن همه', 'Expand All')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-md transition-all">
                  <Maximize2 size={14}/>
                </button>
                <button onClick={handleCollapseAll} title={t('بستن همه', 'Collapse All')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-md transition-all">
                  <Minimize2 size={14}/>
                </button>
              </div>
              
              <div className="flex items-center gap-1 shrink-0 flex-1">
                <div className="relative flex-1">
                  <Search size={14} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-2' : 'left-2'} text-slate-400 dark:text-slate-500`} />
                  <input 
                    type="text" value={treeSearchTerm} onChange={(e) => setTreeSearchTerm(e.target.value)}
                    placeholder={t('جستجو در درخت...', 'Search tree...')}
                    className={`w-full h-8 text-[12px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all ${isRtl ? 'pr-7 pl-2' : 'pl-7 pr-2'}`}
                  />
                </div>
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
                <button onClick={handleExportMenu} title={t('خروجی اکسل', 'Export Excel')} className="p-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-md transition-all">
                  <FileSpreadsheet size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2 font-sans">
              <div className="space-y-[2px]">
                {filteredActiveTree.length > 0 ? filteredActiveTree.map(node => renderSidebarNode(node)) : (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-[12px] font-sans">
                    {t('نتیجه‌ای یافت نشد.', 'No results found.')}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] dark:bg-slate-900 relative font-sans">
          <header className="h-12 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 z-20 font-sans">
            <div className="flex items-center gap-4 w-full max-w-3xl">
              {showSidebar && !sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-all active:scale-95 shrink-0">{isRtl ? <ChevronLeft size={16} strokeWidth={2.5} /> : <ChevronRight size={16} strokeWidth={2.5} />}</button>}
              {activeDomainId !== 'HOME_FAV' && (
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0 h-8">
                  <button onClick={() => setViewMode('tree')} className={`flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-bold transition-all h-full ${viewMode === 'tree' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><ListTree size={14} /><span>{t('درختی', 'Tree')}</span></button>
                  <button onClick={() => setViewMode('tile')} className={`flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-bold transition-all h-full ${viewMode === 'tile' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><LayoutGrid size={14} /><span>{t('کاشی', 'Tile')}</span></button>
                </div>
              )}
              <div className="relative w-full max-w-md">
                <Search size={14} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'} text-slate-400 dark:text-slate-500`} />
                <input placeholder={t('جستجو در تمام فرم‌ها...', 'Search all forms...')} className={`w-full h-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md text-[12px] font-bold ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-300 dark:focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-700 dark:text-slate-200 font-sans`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {searchTerm && (
                  <div className="absolute top-full right-0 left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 py-2 z-50 font-sans">
                    {filteredItems.length > 0 ? filteredItems.map(item => (
                      <div key={item.id} onClick={() => { handleFormClick(item); setSearchTerm(''); }} className="px-5 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-all flex items-center justify-between">
                        <div><div className="font-bold text-slate-800 dark:text-slate-100 text-[12px] font-sans">{getLabel(item)}</div><div className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 font-sans">{item.fullPath}</div></div>
                        {isRtl ? <ArrowLeft size={14} className="text-slate-300 dark:text-slate-600" /> : <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />}
                      </div>
                    )) : <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-[12px] font-sans">{t('نتیجه‌ای یافت نشد.', 'No results found.')}</div>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {activeForm && (
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1 mr-2 ml-2">
                    <button onClick={() => setDocModalInfo({ isOpen: true, type: 'user' })} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-indigo-500 dark:text-indigo-400" title={t('راهنمای کاربری', 'User Guide')}>
                      <HelpCircle size={14} />
                    </button>
                    <button onClick={() => setDocModalInfo({ isOpen: true, type: 'dev' })} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-amber-500 dark:text-amber-400" title={t('مستندات توسعه', 'Developer Docs')}>
                      <FileText size={14} />
                    </button>
                  </div>
                )}
                {activeForm && <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>}
                
                <button onClick={toggleTheme} className="flex items-center justify-center p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" title={t('تغییر تم', 'Change Theme')}>
                  {theme === 'dark' ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-500" />}
                </button>
                <button onClick={toggleCalendar} className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 font-bold text-[12px] transition-colors border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-sans tracking-wider" title={t('تغییر تقویم', 'Change Calendar')}>
                  <Calendar size={14} className="text-indigo-500 dark:text-indigo-400" /><span className="mt-[1px]">{calendarMode === 'jalali' ? 'Gre' : 'Ja'}</span>
                </button>
                <button onClick={() => setCurrentLanguage(isRtl ? 'en' : 'fa')} className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 font-bold text-[12px] transition-colors border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-sans tracking-wider" title={t('تغییر زبان', 'Change Language')}>
                  <Globe size={14} className="text-indigo-500 dark:text-indigo-400" /><span className="mt-[1px]">{isRtl ? 'EN' : 'FA'}</span>
                </button>
              </div>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
              <button onClick={() => setIsNotifOpen(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 relative transition-all">
                <Bell size={16} />
                {unreadNotifCount > 0 && (
                  <span className={`absolute top-1 ${isRtl ? 'right-1' : 'left-1'} flex h-2 w-2 items-center justify-center rounded-full bg-red-500 border-[1.5px] border-white dark:border-slate-800`}></span>
                )}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar font-sans">
            {activeForm && activeForm.component_path ? (
              <FormLoader path={activeForm.component_path} language={currentLanguage} />
            ) : activeDomainId === 'HOME_FAV' ? renderHomeView() : viewMode === 'tile' ? renderFioriTiles() : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 font-sans">
                <Monitor size={40} className="text-slate-300 dark:text-slate-700 mb-4" strokeWidth={1.5} />
                <h2 className="text-xl font-black text-slate-700 dark:text-slate-200 font-sans">{t('ناحیه کاری ', 'Workspace ')} {getLabel(domains.find(d => d.id === activeDomainId) || {})}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-[14px] mt-3 max-w-sm leading-relaxed font-sans">{t('جهت باز کردن فرم‌ها، از منوی درختی در سمت راست استفاده نمایید.', 'Use the tree menu to open forms.')}</p>
              </div>
            )}
          </div>
        </main>

        {NotificationSidebarComponent && (
          <NotificationSidebarComponent 
            isOpen={isNotifOpen} 
            onClose={() => setIsNotifOpen(false)} 
            language={currentLanguage} 
            onUpdateUnread={setUnreadNotifCount}
          />
        )}
        
        {NavigationDocsComponent && (
          <NavigationDocsComponent
            isOpen={docModalInfo.isOpen}
            onClose={() => setDocModalInfo({ ...docModalInfo, isOpen: false })}
            pageKey={activeForm?.unique_code || activeForm?.id}
            pageName={activeForm ? getLabel(activeForm) : ''}
            docType={docModalInfo.type}
            isAdmin={isAdmin}
            language={currentLanguage}
          />
        )}

        {Dialog && (
          <Dialog
            isOpen={logoutConfirmOpen}
            title={t('خروج از سیستم', 'Logout')}
            type="warning"
            language={currentLanguage}
            confirmLabel={t('بله، خارج می‌شوم', 'Yes, Logout')}
            cancelLabel={t('انصراف', 'Cancel')}
            onConfirm={executeLogout}
            onCancel={() => setLogoutConfirmOpen(false)}
          >
            {t('آیا از خروج از سیستم اطمینان دارید؟', 'Are you sure you want to logout?')}
          </Dialog>
        )}
      </div>
    );
  };

  window.NavigationSystem = NavigationSystem;
})();