/* Filename: designsystem/DSTree.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useEffect, useCallback, useRef } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    ChevronDown = FallbackIcon, ChevronRight = FallbackIcon, ChevronLeft = FallbackIcon, Folder = FallbackIcon, FolderOpen = FallbackIcon, FileText = FallbackIcon, 
    Plus = FallbackIcon, Trash2 = FallbackIcon, Maximize2 = FallbackIcon, Minimize2 = FallbackIcon, Search = FallbackIcon, FileDown = FallbackIcon, Upload = FallbackIcon, FileSpreadsheet = FallbackIcon, 
    Check = FallbackIcon, X = FallbackIcon, Layers = FallbackIcon, Settings = FallbackIcon 
  } = LucideIcons;

  const FallbackComponent = () => null;
  const Core = window.DSCore || window.DesignSystem || {};
  const { 
    Button = FallbackComponent, 
    ToggleField = FallbackComponent, 
    DatePicker = FallbackComponent, 
    formatGlobalDate = (v) => v, 
    useCalendarMode = () => 'jalali',
    useTheme = () => 'light'
  } = Core;

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

  const HighlightText = ({ text, term }) => {
    if (!term || !text) return <span>{text}</span>;
    const parts = String(text).split(new RegExp(`(${term})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-200 rounded px-0.5 font-black">{part}</mark> : part
        )}
      </span>
    );
  };

  const Tree = ({ data = [], idField = 'id', parentField = 'parentId', displayField = 'title', secondaryField, activeField = 'isActive', selectedId, onSelect, onAddChild, onAddRoot, onDelete, onExport, onImport, onDownloadSample, language = 'fa', formCode }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const access = useSecureAccess(formCode);

    const [expandedIds, setExpandedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
      if (selectedId && data && data.length > 0) {
        const parentsToExpand = new Set();
        let currentId = String(selectedId);
        
        let limit = 100;
        while (currentId && limit > 0) {
          limit--;
          const node = data.find(n => String(n[idField]) === currentId);
          if (node && node[parentField] != null) {
            parentsToExpand.add(String(node[parentField]));
            currentId = String(node[parentField]);
          } else {
            break;
          }
        }

        if (parentsToExpand.size > 0) {
          setExpandedIds(prev => {
            const next = new Set(prev);
            let changed = false;
            parentsToExpand.forEach(p => {
              if (!next.has(p)) { next.add(p); changed = true; }
            });
            return changed ? next : prev;
          });
        }
      }
    }, [selectedId, data, idField, parentField]);

    const buildTree = (nodes) => {
      const map = {};
      const roots = [];
      nodes.forEach(node => { map[String(node[idField])] = { ...node, children: [] }; });
      nodes.forEach(node => {
        const strId = String(node[idField]);
        const strParentId = node[parentField] != null ? String(node[parentField]) : null;
        if (strParentId && map[strParentId]) {
          map[strParentId].children.push(map[strId]);
        } else {
          roots.push(map[strId]);
        }
      });
      return roots;
    };

    const filterTree = (nodes, term) => {
      if (!term) return nodes;
      const lowerTerm = term.toLowerCase();
      return nodes.reduce((acc, node) => {
        const matchPrimary = String(node[displayField] || '').toLowerCase().includes(lowerTerm);
        const matchSecondary = secondaryField && String(node[secondaryField] || '').toLowerCase().includes(lowerTerm);
        const isMatch = matchPrimary || matchSecondary;
        
        const filteredChildren = filterTree(node.children || [], term);
        if (isMatch || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren, isMatch });
        }
        return acc;
      }, []);
    };

    const treeData = useMemo(() => {
      const roots = buildTree(data);
      return filterTree(roots, searchTerm);
    }, [data, searchTerm, idField, parentField, displayField, secondaryField]);

    useEffect(() => {
      if (searchTerm) {
        const extractIds = (nodes, acc) => {
          nodes.forEach(n => { if (n.children.length > 0) { acc.add(String(n[idField])); extractIds(n.children, acc); } });
          return acc;
        };
        setExpandedIds(extractIds(treeData, new Set(expandedIds)));
      }
    }, [searchTerm, treeData, idField]);

    const toggleExpand = (id, e) => {
      if (e) e.stopPropagation();
      const strId = String(id);
      const newExpanded = new Set(expandedIds);
      if (newExpanded.has(strId)) newExpanded.delete(strId);
      else newExpanded.add(strId);
      setExpandedIds(newExpanded);
    };

    const expandAll = () => {
      const allIds = new Set();
      const collectIds = (nodes) => { nodes.forEach(n => { if (n.children?.length) { allIds.add(String(n[idField])); collectIds(n.children); } }); };
      collectIds(buildTree(data));
      setExpandedIds(allIds);
    };

    const collapseAll = () => setExpandedIds(new Set());

    const renderNode = (node, depth = 0) => {
      const strId = String(node[idField]);
      const isExpanded = expandedIds.has(strId);
      const isSelected = String(selectedId) === strId;
      const hasChildren = node.children && node.children.length > 0;
      const isNodeActive = node[activeField] !== false;

      return (
        <div key={strId} className="select-none relative">
          <div 
            onClick={() => onSelect && onSelect(node)}
            className={`flex items-center gap-2 py-1 px-2 my-0.5 cursor-pointer rounded-lg transition-all border border-transparent group
              ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold border-indigo-200 dark:border-indigo-800 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-700'}`}
            style={{ 
              paddingInlineStart: `${depth * 20 + 8}px`,
              paddingInlineEnd: '8px'
            }}
          >
            {hasChildren ? (
              <div 
                className="w-5 h-5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-10 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600 shadow-sm shrink-0 cursor-pointer"
                onClick={(e) => toggleExpand(strId, e)}
              >
                <div className={`transition-transform duration-200 ${isExpanded ? '' : (isRtl ? 'rotate-90' : '-rotate-90')}`}>
                  <ChevronDown size={12} />
                </div>
              </div>
            ) : (
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
              </div>
            )}

            <div className={`${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-400 dark:group-hover:text-indigo-300 transition-colors'} shrink-0 ${!isNodeActive ? 'opacity-60' : ''}`}>
              {hasChildren ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />) : <FileText size={14} />}
            </div>

            <div className={`flex items-center gap-2 truncate flex-1 min-w-0 ${!isNodeActive ? 'opacity-60' : ''}`}>
              {secondaryField && node[secondaryField] && (
                  <span className="font-sans text-[12px] font-bold bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 px-1 rounded shrink-0 text-slate-600 dark:text-slate-400">
                    <HighlightText text={node[secondaryField]} term={searchTerm} />
                  </span>
              )}
              <span className={`text-[12px] truncate ${isSelected ? 'font-bold' : ''}`}>
                  <HighlightText text={node[displayField]} term={searchTerm} />
              </span>
              {!isNodeActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600 shrink-0 font-bold mx-1">
                  {t('غیرفعال', 'Inactive')}
                </span>
              )}
            </div>

            <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {onAddChild && access.canCreate && <button onClick={(e) => { 
                e.stopPropagation(); 
                const nExp = new Set(expandedIds);
                nExp.add(strId);
                setExpandedIds(nExp);
                onAddChild(node); 
              }} title={t('افزودن زیرمجموعه', 'Add Child')} className="p-1 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"><Plus size={14}/></button>}
              {onDelete && access.canDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} title={t('حذف', 'Delete')} className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={14}/></button>}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="overflow-hidden relative">
              <div className={`absolute top-0 bottom-2 w-px bg-slate-200 dark:bg-slate-700`} style={{ [isRtl ? 'right' : 'left']: `${depth * 20 + 17}px` }}></div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex flex-col font-sans h-full overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between p-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 gap-2 shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            {onAddRoot && access.canCreate && <Button size="sm" variant="primary" icon={Plus} onClick={onAddRoot} className="h-8 px-3 text-[12px] shadow-sm">{t('افزودن ریشه', 'Add Root')}</Button>}
            {onAddRoot && access.canCreate && <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>}
            <button onClick={expandAll} title={t('باز کردن همه', 'Expand All')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><Maximize2 size={14}/></button>
            <button onClick={collapseAll} title={t('بستن همه', 'Collapse All')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><Minimize2 size={14}/></button>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <div className="relative">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-2' : 'left-2'} text-slate-400 dark:text-slate-500`} />
              <input 
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('جستجو در درخت...', 'Search tree...')}
                className={`w-48 h-8 text-[12px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all ${isRtl ? 'pr-7 pl-2' : 'pl-7 pr-2'}`}
              />
            </div>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            {onDownloadSample && access.canCreate && <button onClick={onDownloadSample} title={t('دانلود نمونه فایل', 'Download Sample')} className="p-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><FileDown size={14} /></button>}
            {onImport && access.canCreate && (
              <>
                <button onClick={() => document.getElementById('tree-import-input').click()} title={t('ورود از اکسل', 'Import Excel')} className="p-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><Upload size={14} /></button>
                <input id="tree-import-input" type="file" className="hidden" accept=".csv,.xlsx" onChange={(e) => { if(e.target.files.length) onImport(e.target.files[0]); }} />
              </>
            )}
            {onExport && access.canPrint && <button onClick={onExport} title={t('خروجی اکسل', 'Export Excel')} className="p-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><FileSpreadsheet size={14} /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-2 bg-white dark:bg-slate-800">
          {treeData.length > 0 ? treeData.map(node => renderNode(node, 0)) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 dark:text-slate-500 text-[12px] font-medium p-8">
              <Layers size={32} className="text-slate-300 dark:text-slate-600" />
              <span>{t('هیچ موردی یافت نشد.', 'No items found.')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TreeGrid = ({ data = [], columns = [], idField = 'id', parentField = 'parentId', actions = [], selectable = false, selectedIds = [], onSelectChange, onAddRoot, onAddChild, onDelete, onExport, onImport, onDownloadSample, language = 'fa', editingId, editData, onEditFieldChange, onSaveEdit, onCancelEdit, gridState, onGridStateChange, formCode }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const globalMode = useCalendarMode ? useCalendarMode() : 'jalali';
    const theme = useTheme ? useTheme() : 'light';
    const access = useSecureAccess(formCode);

    const checkAccess = useCallback((reqAccess) => {
      if (!reqAccess) return true;
      if (reqAccess === 'view') return access.canView;
      if (reqAccess === 'create') return access.canCreate;
      if (reqAccess === 'edit' || reqAccess === 'update') return access.canEdit;
      if (reqAccess === 'delete') return access.canDelete;
      if (reqAccess === 'print' || reqAccess === 'export') return access.canPrint;
      return access.hasCustomAccess ? access.hasCustomAccess(reqAccess) : false;
    }, [access]);

    const filteredActions = useMemo(() => {
      return actions.filter(act => {
        if (act.requiredAccess !== undefined) return checkAccess(act.requiredAccess);
        if (act.id === 'edit' || act.id === 'update') return access.canEdit;
        if (act.id === 'delete' || act.id === 'remove') return access.canDelete;
        if (act.id === 'print' || act.id === 'export') return access.canPrint;
        if (act.id === 'view_log') return access.canView || (access.hasCustomAccess && access.hasCustomAccess('view_log'));
        return true;
      });
    }, [actions, access, checkAccess]);

    const [expandedIds, setExpandedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    
    const [hiddenCols, setHiddenCols] = useState([]);
    const [showColMenu, setShowColMenu] = useState(false);
    const [selectedRowId, setSelectedRowId] = useState(null);
    
    const colMenuRef = useRef(null);

    useEffect(() => {
      const activeId = editingId || selectedRowId || (selectedIds && selectedIds.length > 0 ? selectedIds[0] : null);
      if (activeId && data && data.length > 0) {
        const parentsToExpand = new Set();
        let currentId = String(activeId);
        let limit = 100;
        while (currentId && limit > 0) {
          limit--;
          const node = data.find(n => String(n[idField]) === currentId);
          if (node && node[parentField] != null) {
            parentsToExpand.add(String(node[parentField]));
            currentId = String(node[parentField]);
          } else {
            break;
          }
        }
        if (parentsToExpand.size > 0) {
          setExpandedIds(prev => {
            const next = new Set(prev);
            let changed = false;
            parentsToExpand.forEach(p => {
              if (!next.has(p)) { next.add(p); changed = true; }
            });
            return changed ? next : prev;
          });
        }
      }
    }, [editingId, selectedRowId, selectedIds, data, idField, parentField]);

    useEffect(() => {
      if (gridState && gridState.hiddenCols) {
        setHiddenCols(gridState.hiddenCols);
      }
    }, [gridState]);

    useEffect(() => {
      if (onGridStateChange && !gridState) {
        onGridStateChange({ hiddenCols });
      }
    }, [hiddenCols, gridState, onGridStateChange]);

    useEffect(() => {
      const handleClickOutside = (e) => { if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setShowColMenu(false); };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const buildTree = (nodes) => {
      const map = {};
      const roots = [];
      nodes.forEach(node => { map[String(node[idField])] = { ...node, children: [] }; });
      nodes.forEach(node => {
        const strId = String(node[idField]);
        const strParentId = node[parentField] != null ? String(node[parentField]) : null;
        if (strParentId && map[strParentId]) {
          map[strParentId].children.push(map[strId]);
        } else {
          roots.push(map[strId]);
        }
      });
      return roots;
    };

    const filterTree = (nodes, term) => {
      if (!term) return nodes;
      const lowerTerm = term.toLowerCase();
      return nodes.reduce((acc, node) => {
        const isMatch = columns.some(c => String(node[c.field] || '').toLowerCase().includes(lowerTerm));
        const filteredChildren = filterTree(node.children || [], term);
        if (isMatch || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren, isMatch });
        }
        return acc;
      }, []);
    };

    const treeData = useMemo(() => {
      return filterTree(buildTree(data), searchTerm);
    }, [data, searchTerm, idField, parentField, columns]);

    useEffect(() => {
      if (searchTerm) {
        const extractIds = (nodes, acc) => {
          nodes.forEach(n => { if (n.children.length > 0) { acc.add(String(n[idField])); extractIds(n.children, acc); } });
          return acc;
        };
        setExpandedIds(extractIds(treeData, new Set(expandedIds)));
      }
    }, [searchTerm, treeData, idField]);

    const flattenTree = (nodes, depth = 0) => {
      let result = [];
      nodes.forEach(node => {
        result.push({ ...node, _depth: depth });
        if (expandedIds.has(String(node[idField])) && node.children?.length > 0) {
          result = result.concat(flattenTree(node.children, depth + 1));
        }
      });
      return result;
    };

    const flatData = useMemo(() => flattenTree(treeData), [treeData, expandedIds, idField]);

    const visibleColumns = useMemo(() => {
      return columns.filter(c => !hiddenCols.includes(c.field));
    }, [columns, hiddenCols]);

    const toggleVisibility = (field) => {
      setHiddenCols(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
    };

    const toggleExpand = (id, e) => {
      if (e) e.stopPropagation();
      const strId = String(id);
      const newExpanded = new Set(expandedIds);
      if (newExpanded.has(strId)) newExpanded.delete(strId);
      else newExpanded.add(strId);
      setExpandedIds(newExpanded);
    };

    const expandAll = () => {
      const allIds = new Set();
      data.forEach(n => allIds.add(String(n[idField])));
      setExpandedIds(allIds);
    };
    const collapseAll = () => setExpandedIds(new Set());

    const handleSelectAll = (e) => {
      if (e.target.checked) onSelectChange && onSelectChange(flatData.map(r => r[idField]));
      else onSelectChange && onSelectChange([]);
    };

    const handleSelectCheckbox = (id) => {
      if (!onSelectChange) return;
      if (selectedIds.includes(id)) onSelectChange(selectedIds.filter(rowId => rowId !== id));
      else onSelectChange([...selectedIds, id]);
    };

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex flex-col font-sans h-full overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between p-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 gap-2 shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            {onAddRoot && access.canCreate && <Button size="sm" variant="primary" icon={Plus} onClick={onAddRoot} className="h-8 px-3 text-[12px] shadow-sm">{t('افزودن ریشه', 'Add Root')}</Button>}
            {onAddRoot && access.canCreate && <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>}
            <button onClick={expandAll} title={t('باز کردن همه', 'Expand All')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><Maximize2 size={14}/></button>
            <button onClick={collapseAll} title={t('بستن همه', 'Collapse All')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><Minimize2 size={14}/></button>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <div className="relative">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-2' : 'left-2'} text-slate-400 dark:text-slate-500`} />
              <input 
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('جستجو در درخت...', 'Search tree...')}
                className={`w-48 h-8 text-[12px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all ${isRtl ? 'pr-7 pl-2' : 'pl-7 pr-2'}`}
              />
            </div>
            
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            
            <div className="relative flex items-center h-full" ref={colMenuRef}>
              <button onClick={() => setShowColMenu(!showColMenu)} title={t('نمایش/مخفی‌سازی ستون‌ها', 'Columns')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all h-full flex items-center justify-center"><Settings size={14} /></button>
              {showColMenu && (
                <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-2 z-50 min-w-[200px] right-0 animate-in zoom-in-95 duration-100">
                  <div className="text-[12px] font-black text-slate-800 dark:text-slate-100 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700 px-1">{t('نمایش / مخفی‌سازی', 'Show / Hide')}</div>
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-0.5">
                    {columns.map(c => (
                      <label key={c.field} className="flex items-center gap-2.5 cursor-pointer p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 transition-colors">
                        <input type="checkbox" checked={!hiddenCols.includes(c.field)} onChange={() => toggleVisibility(c.field)} className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400 w-3.5 h-3.5" />
                        {t(c.header_fa, c.header_en)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            {onDownloadSample && access.canCreate && <button onClick={onDownloadSample} title={t('دانلود نمونه فایل', 'Download Sample')} className="p-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><FileDown size={14} /></button>}
            {onImport && access.canCreate && (
              <>
                <button onClick={() => document.getElementById('treegrid-import-input').click()} title={t('ورود از اکسل', 'Import Excel')} className="p-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><Upload size={14} /></button>
                <input id="treegrid-import-input" type="file" className="hidden" accept=".csv,.xlsx" onChange={(e) => { if(e.target.files.length) onImport(e.target.files[0]); }} />
              </>
            )}
            {onExport && access.canPrint && <button onClick={() => {
                if(onExport) {
                   const rows = flatData.map(row => visibleColumns.map(c => {
                     let val = row[c.field];
                     if (c.type === 'date' && formatGlobalDate) val = formatGlobalDate(val, globalMode);
                     return `"${(val || '').toString().replace(/"/g, '""')}"`;
                   }).join(',')).join('\n');
                   const headers = visibleColumns.map(c => t(c.header_fa, c.header_en)).join(',');
                   const csv = '\uFEFF' + headers + '\n' + rows;
                   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                   const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', `tree_export_${new Date().getTime()}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
                }
            }} title={t('خروجی اکسل', 'Export Excel')} className="p-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all"><FileSpreadsheet size={14} /></button>}
          </div>
        </div>

        <div className="overflow-auto custom-scrollbar flex-1 relative bg-white dark:bg-slate-800">
          <table className="w-full text-start border-separate border-spacing-0 min-w-max" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead className="sticky top-0 z-40 bg-slate-100 dark:bg-slate-900 shadow-sm">
              <tr>
                {selectable && (
                  <th className={`p-1.5 border-b border-slate-200 dark:border-slate-700 text-center bg-slate-100 dark:bg-slate-900 w-10 sticky ${isRtl ? 'right-0' : 'left-0'} z-50 ${isRtl ? 'border-l' : 'border-r'}`}>
                    <input type="checkbox" onChange={handleSelectAll} checked={flatData.length > 0 && selectedIds.length === flatData.length} className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400 cursor-pointer" />
                  </th>
                )}
                {visibleColumns.map((col, index) => (
                  <th key={col.field} style={{ width: col.width || '150px' }} className={`p-2 border-b border-slate-200 dark:border-slate-700 text-[12px] font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 ${isRtl ? 'border-l' : 'border-r'}`}>
                    {t(col.header_fa, col.header_en)}
                  </th>
                ))}
                {filteredActions.length > 0 && (
                  <th className={`p-2 border-b border-slate-200 dark:border-slate-700 text-[12px] font-black text-slate-700 dark:text-slate-200 w-[120px] bg-slate-100 dark:bg-slate-900 text-center sticky ${isRtl ? 'left-0' : 'right-0'} z-50 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] dark:shadow-none`}>
                    {t('عملیات', 'Actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="z-10 relative">
              {flatData.length > 0 ? flatData.map((row, rowIndex) => {
                const strId = String(row[idField]);
                const isSelectedCheckbox = selectedIds.map(String).includes(strId);
                const isSelectedRow = String(selectedRowId) === strId;
                const isEditing = String(editingId) === strId;
                const hasChildren = row.children && row.children.length > 0;
                const isExpanded = expandedIds.has(strId);

                return (
                  <tr 
                    key={strId} 
                    onClick={() => setSelectedRowId(row[idField])}
                    className={`bg-white dark:bg-slate-800 transition-colors group border-b border-slate-100 dark:border-slate-700/50 
                      ${isSelectedRow || isEditing ? 'bg-indigo-50/50 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    {selectable && (
                      <td className={`p-1.5 text-center bg-inherit sticky ${isRtl ? 'right-0' : 'left-0'} z-20 ${isRtl ? 'border-l border-slate-100 dark:border-slate-700/50' : 'border-r border-slate-100 dark:border-slate-700/50'}`}>
                        <input type="checkbox" checked={isSelectedCheckbox} onChange={() => handleSelectCheckbox(row[idField])} className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400 cursor-pointer" />
                      </td>
                    )}
                    {visibleColumns.map((col, colIndex) => (
                      <td key={col.field} className={`py-1 px-2 text-[12px] text-slate-700 dark:text-slate-300 truncate bg-inherit ${isRtl ? 'border-l border-slate-100 dark:border-slate-700/50' : 'border-r border-slate-100 dark:border-slate-700/50'}`}>
                        
                        {colIndex === 0 ? (
                          <div className="flex items-center gap-2 relative" style={{ paddingInlineStart: `${row._depth * 20}px` }}>
                            {hasChildren ? (
                              <div 
                                className="w-5 h-5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-10 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600 shadow-sm shrink-0 cursor-pointer"
                                onClick={(e) => toggleExpand(strId, e)}
                              >
                                <div className={`transition-transform duration-200 ${isExpanded ? '' : (isRtl ? 'rotate-90' : '-rotate-90')}`}>
                                  <ChevronDown size={12} />
                                </div>
                              </div>
                            ) : (
                              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                              </div>
                            )}
                            
                            <div className={`${isSelectedRow ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-400 dark:group-hover:text-indigo-300 transition-colors'} shrink-0`}>
                              {hasChildren ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />) : <FileText size={14} />}
                            </div>
                            
                            {isEditing && col.editable && access.canEdit ? (
                              <input 
                                value={editData[col.field] || ''} 
                                onChange={(e) => onEditFieldChange(col.field, e.target.value)} 
                                className="h-7 text-xs bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-600 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-300 dark:focus:ring-indigo-500 rounded px-1 w-full outline-none"
                              />
                            ) : (
                              <span className={`text-[12px] truncate ${isSelectedRow ? 'font-bold text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                <HighlightText text={row[col.field]} term={searchTerm} />
                              </span>
                            )}
                          </div>
                        ) : (
                          isEditing && col.editable && access.canEdit ? (
                            col.type === 'select' ? (
                              <select 
                                value={editData[col.field] || ''} 
                                onChange={(e) => onEditFieldChange(col.field, e.target.value)} 
                                className="h-7 text-xs bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-600 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-300 dark:focus:ring-indigo-500 rounded px-1 w-full outline-none"
                              >
                                <option value="">...</option>
                                {col.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            ) : col.type === 'toggle' ? (
                              <ToggleField checked={!!editData[col.field]} onChange={(val) => onEditFieldChange(col.field, val)} isRtl={isRtl} wrapperClassName="justify-start" />
                            ) : col.type === 'date' ? (
                              <DatePicker 
                                value={editData[col.field] || ''} 
                                onChange={(val) => onEditFieldChange(col.field, val)}
                                isRtl={isRtl} language={language} size="sm" wrapperClassName="w-full"
                              />
                            ) : (
                              <input 
                                value={editData[col.field] || ''} 
                                onChange={(e) => onEditFieldChange(col.field, e.target.value)} 
                                className="h-7 text-xs bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-600 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-300 dark:focus:ring-indigo-500 rounded px-1 w-full outline-none"
                              />
                            )
                          ) : (
                            col.render ? col.render(row[col.field], row) : (
                               col.type === 'date' ? (
                                   <span dir="ltr" className="font-sans text-[12px] font-medium text-slate-800 dark:text-slate-200">
                                       {formatGlobalDate ? formatGlobalDate(row[col.field], globalMode) : row[col.field]}
                                   </span>
                               ) : <HighlightText text={row[col.field]} term={searchTerm} />
                            )
                          )
                        )}
                      </td>
                    ))}
                    {filteredActions.length > 0 && (
                      <td className={`p-1 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.01)] dark:shadow-none bg-inherit sticky ${isRtl ? 'left-0' : 'right-0'} z-20 border-slate-100 dark:border-slate-700/50`}>
                        {isEditing && access.canEdit ? (
                          <div className="flex items-center justify-center gap-1 opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); onSaveEdit(row); }} title={t('ذخیره', 'Save')} className="p-1.5 rounded-md text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all">
                              <Check size={14} strokeWidth={2} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onCancelEdit(); }} title={t('انصراف', 'Cancel')} className="p-1.5 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all">
                              <X size={14} strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-0.5 opacity-100">
                            {onAddChild && access.canCreate && (
                              <button onClick={(e) => { 
                                e.stopPropagation(); 
                                const newExp = new Set(expandedIds);
                                newExp.add(strId);
                                setExpandedIds(newExp);
                                onAddChild(row); 
                              }} title={t('افزودن زیرمجموعه', 'Add Child')} className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm transition-all">
                                <Plus size={14} strokeWidth={2} />
                              </button>
                            )}
                            {filteredActions.map((act, i) => (
                              <button key={i} onClick={(e) => { e.stopPropagation(); act.onClick(row, rowIndex); }} title={act.tooltip} className={`p-1.5 rounded-md text-slate-400 dark:text-slate-500 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all ${act.className || 'hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                                <act.icon size={14} strokeWidth={2} />
                              </button>
                            ))}
                            {onDelete && access.canDelete && (
                              <button onClick={(e) => { e.stopPropagation(); onDelete(row); }} title={t('حذف', 'Delete')} className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400 hover:shadow-sm transition-all">
                                <Trash2 size={14} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={columns.length + (filteredActions.length > 0 ? 1 : 0) + (selectable ? 1 : 0)} className="p-12 text-center text-slate-400 dark:text-slate-500 text-[12px] font-medium bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex flex-col items-center justify-center gap-3"><Layers size={32} className="text-slate-300 dark:text-slate-600" /><span>{t('هیچ داده‌ای برای نمایش یافت نشد.', 'No data found to display.')}</span></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  window.DSTree = { HighlightText, Tree, TreeGrid };
})();
