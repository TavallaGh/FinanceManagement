/* Filename: designsystem/DSGrid.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    Search = FallbackIcon, Settings = FallbackIcon, Trash2 = FallbackIcon, Pin = FallbackIcon, PinOff = FallbackIcon, GripVertical = FallbackIcon, ChevronDown = FallbackIcon, 
    ChevronUp = FallbackIcon, ChevronLeft = FallbackIcon, ChevronRight = FallbackIcon, ChevronsLeft = FallbackIcon, ChevronsRight = FallbackIcon,
    Layers = FallbackIcon, X = FallbackIcon, Maximize2 = FallbackIcon, Minimize2 = FallbackIcon, Plus = FallbackIcon, Filter = FallbackIcon, Upload = FallbackIcon, FileSpreadsheet = FallbackIcon, FileDown = FallbackIcon, Check = FallbackIcon
  } = LucideIcons;

  const FallbackComponent = () => null;
  const Core = window.DSCore || {};
  const { 
    Button = FallbackComponent, TextField = FallbackComponent, SelectField = FallbackComponent, ToggleField = FallbackComponent, CheckboxField = FallbackComponent, DatePicker = FallbackComponent, Badge = FallbackComponent,
    formatGlobalDate = (v) => v, useCalendarMode = () => 'jalali', useTheme = () => 'light'
  } = Core;
  const { Modal } = window.DSFeedback || {};

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
      console.warn("Security context not found for grid access check.");
      return { canView: false, canCreate: false, canEdit: false, canDelete: false, canPrint: false, hasCustomAccess: () => false };
    }
  };

  const LOVField = ({ label, displayValue, onChange, data = [], columns = [], disabled = false, required = false, wrapperClassName = '', size = 'md', isRtl = true, placeholder = '', formCode, dropdownWidth = 'min-w-[300px] max-w-[500px]' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const [rect, setRect] = useState(null);
    const t = (fa, en) => isRtl ? fa : en;
    const access = useSecureAccess(formCode);
    const isDisabled = (!access.canEdit && !access.canCreate) || disabled;
    const ReactDOM = window.ReactDOM;
    
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };
      if (isOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
      if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    useEffect(() => {
      const updateRect = () => {
        if (containerRef.current) {
          setRect(containerRef.current.getBoundingClientRect());
        }
      };
      if (isOpen) {
        updateRect();
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);
      }
      return () => {
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
      };
    }, [isOpen]);

    const filteredData = useMemo(() => {
      if (!searchTerm) return data;
      const lowerSearch = searchTerm.toLowerCase();
      return data.filter(row => {
         return columns.some(col => {
           const val = row[col.field];
           return val && String(val).toLowerCase().includes(lowerSearch);
         });
      });
    }, [data, columns, searchTerm]);

    const heights = { xs: 'h-6 text-[10px]', sm: 'h-8 text-[12px]', md: 'h-10 text-[14px]', lg: 'h-12 text-[14px]' };

    const dropdownContentBox = (
      <div className="max-h-64 overflow-y-auto custom-scrollbar">
        {filteredData.length > 0 ? (
          <table className="w-full text-start border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm z-10">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className={`p-2.5 text-[12px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${isRtl ? 'text-right' : 'text-left'}`} style={{ width: col.width || 'auto' }}>
                    {t(col.header_fa, col.header_en)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, rIdx) => (
                <tr 
                  key={rIdx} 
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(row); setIsOpen(false); setSearchTerm(''); }}
                  className="cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors"
                >
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-[12px] text-slate-700 dark:text-slate-300">
                      {col.render ? col.render(row[col.field], row) : (row[col.field] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center text-[12px] text-slate-400 dark:text-slate-500">
            {t('موردی یافت نشد', 'No results found')}
          </div>
        )}
      </div>
    );

    return (
      <div ref={containerRef} className={`flex flex-col ${size === 'sm' ? 'gap-1' : 'gap-1.5'} w-full relative ${isOpen ? 'z-[9999]' : 'z-10'} ${wrapperClassName}`}>
        {label && <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">{label} {required && <span className="text-red-500 dark:text-red-400">*</span>}</label>}
        
        <div 
          className={`relative flex items-center w-full ${heights[size] || heights.md} bg-white dark:bg-slate-700/40 border rounded-lg text-slate-800 dark:text-slate-100 transition-all ${isDisabled ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700' : 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-400 border-slate-300 dark:border-slate-500 focus-within:border-indigo-400 dark:focus-within:ring-2 dark:focus-within:ring-indigo-400/20'} ${isRtl ? 'pr-2.5 pl-8' : 'pl-2.5 pr-8'}`}
          onClick={() => !isDisabled && !isOpen && setIsOpen(true)}
        >
          <div className={`absolute ${isRtl ? 'left-2.5' : 'right-2.5'} text-slate-400 dark:text-slate-500 pointer-events-none`}>
             <Search size={size === 'sm' ? 14 : 16} />
          </div>
          
          {isOpen ? (
            <input 
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none placeholder:text-slate-400"
              placeholder={t('جستجو...', 'Search...')}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          ) : (
            <div className={`w-full truncate ${displayValue ? (isRtl ? 'pl-6' : 'pr-6') : ''} ${!displayValue ? 'text-slate-400 dark:text-slate-500' : ''}`}>
               {displayValue || placeholder || t('انتخاب کنید...', 'Select...')}
            </div>
          )}
          
          {displayValue && !isOpen && !isDisabled && (
            <button 
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className={`absolute ${isRtl ? 'left-8' : 'right-8'} text-slate-400 hover:text-red-500 transition-colors p-1`}
              title={t('پاک کردن', 'Clear')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isOpen && rect && (() => {
          const inputWidth = containerRef.current ? containerRef.current.offsetWidth : 0;
          const minWMatch = dropdownWidth && dropdownWidth.match(/min-w-\[(\d+)px\]/);
          const estWidth = Math.max(inputWidth, minWMatch ? parseInt(minWMatch[1]) : 300);
          let posH;
          if (isRtl) {
            const leftEdge = rect.right - estWidth;
            posH = leftEdge >= 8
              ? { right: window.innerWidth - rect.right }
              : { left: Math.max(8, Math.min(rect.left, window.innerWidth - estWidth - 8)) };
          } else {
            const rightEdge = rect.left + estWidth;
            posH = rightEdge <= window.innerWidth - 8
              ? { left: rect.left }
              : { right: window.innerWidth - rect.right };
          }
          const portalNode = (
            <div
              style={{ position: 'fixed', top: rect.bottom + 4, ...posH, width: inputWidth || 'auto', zIndex: 999999 }}
              className={`w-full ${dropdownWidth} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden`}
            >
              {dropdownContentBox}
            </div>
          );
          return ReactDOM ? ReactDOM.createPortal(portalNode, document.body) : (
            <div className={`absolute top-full mt-1 ${isRtl ? 'right-0' : 'left-0'} w-full ${dropdownWidth} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-[9999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150`}>
              {dropdownContentBox}
            </div>
          );
        })()}
      </div>
    );
  };

  const AdvancedFilter = ({ title, fields = [], onFilter, onClear, language = 'fa', defaultOpen = false, initialValues, children }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [values, setValues] = useState(initialValues || {});

    const lastSyncValues = useRef(null);

    useEffect(() => {
      const initialStr = JSON.stringify(initialValues || {});
      if (initialStr !== JSON.stringify(lastSyncValues.current || {})) {
        lastSyncValues.current = initialValues || {};
        setValues(initialValues || {});
      }
    }, [initialValues]);

    const handleChange = (name, val) => {
      const newValues = { ...values, [name]: val };
      setValues(newValues);
      lastSyncValues.current = newValues;
      if (onFilter) onFilter(newValues);
    };

    const handleClear = () => { 
      setValues({}); 
      lastSyncValues.current = {};
      if (onClear) onClear(); 
      else if (onFilter) onFilter({});
    };

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex flex-col shrink-0 mb-3 font-sans transition-all duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`h-9 px-4 flex items-center justify-between cursor-pointer bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors select-none ${isOpen ? 'rounded-t-lg' : 'rounded-lg'}`} onClick={() => setIsOpen(!isOpen)}>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 shrink-0">
             <Filter size={14} strokeWidth={2.5} />
             <span className="text-[12px] font-black">{title || t('فیلتر پیشرفته', 'Advanced Filter')}</span>
          </div>
          <div className="text-slate-400 dark:text-slate-500 shrink-0">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
        </div>
        {isOpen && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {fields.map((f, idx) => {
                if (f.type === 'select') return <SelectField key={idx} size="sm" label={f.label} isRtl={isRtl} options={f.options} value={values[f.name] || ''} onChange={(e) => handleChange(f.name, e.target.value)} />;
                if (f.type === 'toggle') return <ToggleField key={idx} size="sm" label={f.label} isRtl={isRtl} checked={values[f.name]} onChange={(v) => handleChange(f.name, v)} wrapperClassName="mt-5" />;
                if (f.type === 'checkbox') return <CheckboxField key={idx} size="sm" label={f.label} isRtl={isRtl} checked={values[f.name]} onChange={(v) => handleChange(f.name, v)} wrapperClassName="mt-5" />;
                if (f.type === 'lov') {
                  let displayStr = values[f.name];
                  if (values[f.name] && typeof values[f.name] === 'object') {
                      const v = values[f.name];
                      displayStr = v.displayLabel || v.title_fa || v.full_name || v.username || v.title || v.name || v.label || v.code || (Object.keys(v).length > 1 ? v[Object.keys(v)[1]] : v[Object.keys(v)[0]]);
                  }
                  return <LOVField key={idx} size="sm" label={f.label} isRtl={isRtl} data={f.lovData} columns={f.lovColumns} displayValue={displayStr} onChange={(row) => handleChange(f.name, row)} dropdownWidth={f.dropdownWidth} />;
                }
                if (f.type === 'date') return <DatePicker key={idx} size="sm" label={f.label} isRtl={isRtl} language={language} value={values[f.name] || ''} onChange={(val) => handleChange(f.name, val)} />;
                return <TextField key={idx} size="sm" label={f.label} isRtl={isRtl} type={f.type} placeholder={f.type === 'date' ? 'YYYY/MM/DD' : ''} value={values[f.name] || ''} onChange={(e) => handleChange(f.name, e.target.value)} dir={f.type === 'date' || !isRtl ? 'ltr' : 'rtl'} />;
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                {children}
              </div>
              <div className="flex items-center gap-2 shrink-0 mr-auto">
                <Button variant="ghost" size="sm" icon={Trash2} onClick={handleClear}>{t('پاک کردن', 'Clear')}</Button>
                <Button variant="primary" size="sm" icon={Search} onClick={() => onFilter && onFilter(values)}>{t('جستجو', 'Search')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const DataGrid = ({ data = [], columns = [], actions = [], language = 'fa', onAdd, onRowClick, onRowDoubleClick, selectable = false, activeRowId = null, bulkActions = [], headerMenus = [], rowReorderable = false, onRowReorder, onDownloadSample, showSummaryRow = false, gridState, onGridStateChange, hideImport = false, hideExport = false, hideToolbar = false, onImport, onExport, formCode, actionWidth = '120px', groupable = false, defaultHiddenCols = [] }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const globalMode = useCalendarMode();
    const theme = useTheme();
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

    const filteredBulkActions = useMemo(() => {
      return bulkActions.filter(act => {
        if (act.requiredAccess !== undefined) return checkAccess(act.requiredAccess);
        if (act.id === 'delete' || act.id === 'remove') return access.canDelete;
        if (act.id === 'print' || act.id === 'export') return access.canPrint;
        return true;
      });
    }, [bulkActions, access, checkAccess]);

    const filteredHeaderMenus = useMemo(() => {
       if (!headerMenus) return [];
       return headerMenus.map(menu => {
           if (menu.requiredAccess !== undefined && !checkAccess(menu.requiredAccess)) return null;
           
           const filteredItems = menu.items.filter(item => {
               if (item.divider) return true;
               if (item.requiredAccess !== undefined) return checkAccess(item.requiredAccess);
               return true;
           });
           
           const cleanedItems = filteredItems.filter((item, idx, arr) => {
               if (item.divider) {
                   if (idx === 0 || idx === arr.length - 1) return false;
                   if (arr[idx-1].divider) return false;
               }
               return true;
           });
           
           if (cleanedItems.length === 0) return null;
           return { ...menu, items: cleanedItems };
       }).filter(Boolean);
    }, [headerMenus, access, checkAccess]);

    const [gridData, setGridData] = useState(data);
    const [columnOrder, setColumnOrder] = useState(columns.map(c => c.field));
    const [hiddenCols, setHiddenCols] = useState(defaultHiddenCols);
    const [pinnedCols, setPinnedCols] = useState([]);
    const [filters, setFilters] = useState({});
    const [localFilters, setLocalFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
    const [groupCols, setGroupCols] = useState([]);
    const [collapsedGroups, setCollapsedGroups] = useState([]);
    
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [showColMenu, setShowColMenu] = useState(false);
    const [activeHeaderMenu, setActiveHeaderMenu] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [draggableRowIndex, setDraggableRowIndex] = useState(null);
    
    const colMenuRef = useRef(null);
    const headerMenuRef = useRef(null);
    const colMenuPortalRef = useRef(null);
    const [colMenuPosition, setColMenuPosition] = useState(null);
    const ReactDOM = window.ReactDOM;
    const dragColItem = useRef(); const dragOverColItem = useRef();
    const dragRowItem = useRef(); const dragOverRowItem = useRef();
    const dragGroupItem = useRef(null); const dragOverGroupItem = useRef(null);

    const lastSyncState = useRef(null);

    useEffect(() => {
      if (gridState !== undefined && gridState !== null) {
        const stateStr = JSON.stringify(gridState);
        if (stateStr !== JSON.stringify(lastSyncState.current || {})) {
          lastSyncState.current = gridState;
          
          setColumnOrder(gridState.columnOrder || columns.map(c => c.field));
          setHiddenCols(gridState.hiddenCols || defaultHiddenCols);
          setPinnedCols(gridState.pinnedCols || []);
          setFilters(gridState.filters || {});
          setLocalFilters(gridState.filters || {});
          setSortConfig(gridState.sortConfig || { field: null, direction: 'asc' });
          setGroupCols(gridState.groupCols || []);
        }
      } else if (gridState === null && lastSyncState.current !== null) {
        lastSyncState.current = null;
        setColumnOrder(columns.map(c => c.field));
        setHiddenCols(defaultHiddenCols);
        setPinnedCols([]);
        setFilters({});
        setLocalFilters({});
        setSortConfig({ field: null, direction: 'asc' });
        setGroupCols([]);
      }
    }, [gridState, columns]);

    useEffect(() => {
      if (onGridStateChange) {
        const currentState = { columnOrder, hiddenCols, pinnedCols, filters, sortConfig, groupCols };
        const stateStr = JSON.stringify(currentState);
        
        if (stateStr !== JSON.stringify(lastSyncState.current || {})) {
          lastSyncState.current = currentState;
          onGridStateChange(currentState);
        }
      }
    }, [columnOrder, hiddenCols, pinnedCols, filters, sortConfig, groupCols, onGridStateChange]);

    useEffect(() => {
      const handleClickOutside = (e) => { 
        const inColBtn = colMenuRef.current && colMenuRef.current.contains(e.target);
        const inColPortal = colMenuPortalRef.current && colMenuPortalRef.current.contains(e.target);
        if (!inColBtn && !inColPortal) setShowColMenu(false);
        if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setActiveHeaderMenu(null);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => { setGridData(data); setSelectedRows([]); }, [data]);

    const visibleColumns = useMemo(() => {
      const visibleFields = columnOrder.filter(f => !hiddenCols.includes(f));
      const pinned = visibleFields.filter(f => pinnedCols.includes(f));
      const unpinned = visibleFields.filter(f => !pinnedCols.includes(f));
      return [...pinned, ...unpinned].map(f => columns.find(c => c.field === f)).filter(Boolean).filter(c => !c.exportOnly);
    }, [columnOrder, hiddenCols, pinnedCols, columns]);

    const processedData = useMemo(() => {
      let result = [...gridData];
      Object.keys(filters).forEach(key => {
        const filterVal = filters[key]?.toString().toLowerCase();
        if (!filterVal) return;
        const colDef = columns.find(c => c.field === key);
        result = result.filter(row => {
          let val = row[key];
          if (colDef && colDef.searchAccessor) {
             val = colDef.searchAccessor(val, row);
          }
          if (val === null || val === undefined) return false;
          return val.toString().toLowerCase().includes(filterVal);
        });
      });
      if (sortConfig.field) {
        result.sort((a, b) => {
          const valA = a[sortConfig.field]; const valB = b[sortConfig.field];
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      const buildGroupedData = (dataArray, colsToGroup, depth = 0, parentKey = '') => {
        if (depth >= colsToGroup.length) return dataArray;
        const currentField = colsToGroup[depth]; const groups = {};
        dataArray.forEach(row => { 
          let rawVal = row[currentField];
          let val = rawVal;
          if (rawVal && typeof rawVal === 'object') {
              val = rawVal.title || rawVal.name || rawVal.label || rawVal.text || rawVal.display || String(rawVal);
          }
          if (val === null || val === undefined || val === '') {
              val = t('نامشخص', 'Unknown');
          }
          if (!groups[val]) groups[val] = []; 
          groups[val].push(row); 
        });
        let groupedResult = [];
        Object.keys(groups).forEach(val => {
          const groupKey = parentKey ? `${parentKey}|${val}` : val;
          groupedResult.push({ isGroupHeader: true, groupField: currentField, groupValue: val, groupKey, depth, count: groups[val].length });
          if (!collapsedGroups.includes(groupKey)) groupedResult = groupedResult.concat(buildGroupedData(groups[val], colsToGroup, depth + 1, groupKey));
        });
        return groupedResult;
      };
      if (groupCols.length > 0) return buildGroupedData(result, groupCols);
      return result;
    }, [gridData, filters, sortConfig, groupCols, collapsedGroups, columns, t]);

    const totalRecords = processedData.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const paginatedData = useMemo(() => {
      const start = (page - 1) * pageSize;
      return processedData.slice(start, start + pageSize);
    }, [processedData, page, pageSize]);

    const summaryData = useMemo(() => {
      if (!showSummaryRow) return null;
      const flatData = processedData.filter(r => !r.isGroupHeader);
      const sums = {};
      let hasSummary = false;
      columns.forEach(col => {
        if (col.summarizable) {
          hasSummary = true;
          const total = flatData.reduce((acc, row) => {
             let raw = row[col.field];
             if(raw === null || raw === undefined) return acc;
             const val = parseFloat(String(raw).replace(/,/g, ''));
             return acc + (isNaN(val) ? 0 : val);
          }, 0);
          sums[col.field] = total;
        }
      });
      return hasSummary ? sums : null;
    }, [processedData, columns, showSummaryRow]);

    const handleSort = (field) => { setSortConfig(prev => ({ field, direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' })); };
    
    const handleLocalFilterChange = (field, value) => { 
      setLocalFilters(prev => {
        const newFilters = { ...prev, [field]: value };
        if (!value) delete newFilters[field];
        return newFilters;
      }); 
    };

    const applyInlineFilters = () => {
      setFilters(localFilters);
      setPage(1);
    };

    const clearInlineFilters = () => {
      setLocalFilters({});
      setFilters({});
      setPage(1);
    };
    
    const togglePin = (field) => { setPinnedCols(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]); };
    const toggleVisibility = (field) => { setHiddenCols(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]); };

    const handleColDragStart = (e, position, field) => { dragColItem.current = position; e.dataTransfer.setData('colField', field); };
    const handleColDragEnter = (e, position) => { dragOverColItem.current = position; };
    const handleColDragEnd = () => {
      if (dragColItem.current !== null && dragOverColItem.current !== null) {
        const newOrder = [...columnOrder]; const draggedContent = newOrder[dragColItem.current];
        newOrder.splice(dragColItem.current, 1); newOrder.splice(dragOverColItem.current, 0, draggedContent); setColumnOrder(newOrder);
      }
      dragColItem.current = null; dragOverColItem.current = null;
    };

    const handleRowDragStart = (e, index) => { dragRowItem.current = index; e.dataTransfer.effectAllowed = 'move'; };
    const handleRowDragEnter = (e, index) => { dragOverRowItem.current = index; };
    const handleRowDragEnd = () => {
      if (dragRowItem.current !== null && dragOverRowItem.current !== null && dragRowItem.current !== dragOverRowItem.current) {
        if (onRowReorder) onRowReorder(dragRowItem.current, dragOverRowItem.current);
      }
      dragRowItem.current = null; dragOverRowItem.current = null;
      setDraggableRowIndex(null);
    };

    const handleGroupDragStart = (e, index) => {
      dragGroupItem.current = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    };
    const handleGroupDragEnter = (e, index) => { dragOverGroupItem.current = index; };
    const handleGroupDragEnd = () => {
      if (dragGroupItem.current !== null && dragOverGroupItem.current !== null && dragGroupItem.current !== dragOverGroupItem.current) {
        const newGroups = [...groupCols];
        const dragged = newGroups[dragGroupItem.current];
        newGroups.splice(dragGroupItem.current, 1);
        newGroups.splice(dragOverGroupItem.current, 0, dragged);
        setGroupCols(newGroups);
        setPage(1);
      }
      dragGroupItem.current = null; dragOverGroupItem.current = null;
    };

    const handleGroupDrop = (e) => { 
      e.preventDefault(); 
      const field = e.dataTransfer.getData('colField'); 
      if (field && !groupCols.includes(field)) { 
        setGroupCols([...groupCols, field]); 
        setPage(1); 
      } 
    };
    
    const removeGroupCol = (field) => { setGroupCols(groupCols.filter(f => f !== field)); setCollapsedGroups([]); setPage(1); };
    const toggleGroupCollapse = (groupKey) => { setCollapsedGroups(prev => prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]); };
    const expandAllGroups = () => setCollapsedGroups([]);
    const collapseAllGroups = () => { const topLevelKeys = processedData.filter(r => r.isGroupHeader && r.depth === 0).map(r => r.groupKey); setCollapsedGroups(topLevelKeys); };

    const handleSelectAll = (e) => {
      if (e.target.checked) {
        const allIds = paginatedData.filter(r => !r.isGroupHeader).map(r => r.id);
        setSelectedRows(Array.from(new Set([...selectedRows, ...allIds])));
      } else {
        const pageIds = paginatedData.map(r => r.id);
        setSelectedRows(selectedRows.filter(id => !pageIds.includes(id)));
      }
    };
    const handleSelectRow = (id) => { if (selectedRows.includes(id)) setSelectedRows(selectedRows.filter(rowId => rowId !== id)); else setSelectedRows([...selectedRows, id]); };

    const exportCSV = () => {
      if (!access.canPrint) {
         if (window.DSFeedback && window.DSFeedback.toast) {
            window.DSFeedback.toast.error(t('شما دسترسی خروجی و چاپ در این فرم را ندارید.', 'You do not have export permission for this form.'));
         } else {
            alert(t('شما دسترسی خروجی و چاپ در این فرم را ندارید.', 'You do not have export permission for this form.'));
         }
         return;
      }
      const exportCols = columns; // always export ALL defined columns regardless of visibility
      const headers = exportCols.map(c => t(c.header_fa, c.header_en || c.header_fa)).join(',');
      const rows = gridData.map(row => exportCols.map(c => {
        let val = c.exportValue ? c.exportValue(row[c.field], row) : row[c.field];
        if (c.type === 'date') val = formatGlobalDate(val, globalMode);
        return `"${(val ?? '').toString().replace(/"/g, '""')}"`;
      }).join(',')).join('\n');
      const csv = '\uFEFF' + headers + '\n' + rows;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', `export_${new Date().getTime()}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const getStickyStyles = (field, isAction = false, isHeader = false, isFooter = false) => {
      const bg = (isHeader || isFooter) ? (theme === 'dark' ? '#0f172a' : '#f1f5f9') : (theme === 'dark' ? '#1e293b' : '#ffffff'); 
      if (isAction) return { position: 'sticky', [isRtl ? 'left' : 'right']: 0, zIndex: isHeader ? 50 : (isFooter ? 30 : 20), backgroundColor: bg };
      if (field === 'ROW_REORDER_COL') return { position: 'sticky', [isRtl ? 'right' : 'left']: 0, zIndex: isHeader ? 45 : (isFooter ? 25 : 15), backgroundColor: bg };
      if (field === 'SELECT_COL') return { position: 'sticky', [isRtl ? 'right' : 'left']: rowReorderable ? 30 : 0, zIndex: isHeader ? 45 : (isFooter ? 25 : 15), backgroundColor: bg };

      if (!pinnedCols.includes(field)) return isHeader ? { zIndex: 30 } : (isFooter ? { zIndex: 10 } : {});
      
      let offset = (rowReorderable ? 30 : 0) + (selectable ? 40 : 0); 
      for (let col of visibleColumns) {
        if (col.field === field) break;
        offset += parseInt(col.width || 100);
      }
      return { position: 'sticky', [isRtl ? 'right' : 'left']: offset, zIndex: isHeader ? 40 : (isFooter ? 20 : 10), backgroundColor: bg };
    };

    const renderCellContent = (col, row, rowIndex) => {
      if (col.render) return col.render(row[col.field], row, rowIndex);
      const val = row[col.field];
      if (col.type === 'toggle') return <ToggleField checked={!!val} disabled isRtl={isRtl} wrapperClassName="pointer-events-none" />;
      if (col.type === 'checkbox') return <CheckboxField checked={!!val} disabled isRtl={isRtl} wrapperClassName="pointer-events-none" />;
      if (col.type === 'badge') return <Badge variant={col.badgeColor ? col.badgeColor(val) : 'gray'}>{val}</Badge>;
      if (col.type === 'date') return <span dir="ltr" className="font-sans text-[12px] font-medium text-slate-800 dark:text-slate-200 block truncate" title={val ? formatGlobalDate(val, globalMode) : ''}>{formatGlobalDate(val, globalMode)}</span>;
      
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' || typeof val === 'number') {
        return <div className="truncate w-full" title={val}>{val}</div>;
      }
      return val;
    };

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex flex-col font-sans h-full overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        {!hideToolbar && <div className="flex flex-wrap items-stretch p-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 gap-2 shrink-0 min-h-[46px]">
          <div className="flex items-center shrink-0">
            {onAdd && access.canCreate && (
              <Button size="sm" variant="primary" icon={Plus} onClick={onAdd} className="h-full px-3.5 text-[12px] shadow-sm">
                {t('جدید', 'New')}
              </Button>
            )}
          </div>

          {selectedRows.length > 0 && filteredBulkActions.length > 0 ? (
            <div className="flex-1 flex items-center gap-3 px-4 py-1 border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/30 rounded-md transition-all animate-in fade-in">
              <span className="text-[12px] font-black text-indigo-800 dark:text-indigo-300">{selectedRows.length} {t('مورد انتخاب شده', 'Items selected')}</span>
              <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-800/50 mx-1"></div>
              {filteredBulkActions.map((act, i) => (
                <Button key={i} size="sm" variant={act.variant || 'outline'} icon={act.icon} onClick={() => {act.onClick(selectedRows); setSelectedRows([]);}} className={`!h-7 text-[10px] ${act.className || ''}`}>
                  {act.label}
                </Button>
              ))}
            </div>
          ) : groupable ? (
            <div className={`flex-1 flex items-center gap-2 px-3 py-1 border border-dashed rounded-md transition-colors overflow-x-auto custom-scrollbar ${groupCols.length > 0 ? 'bg-indigo-50/30 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`} onDragOver={(e) => e.preventDefault()} onDrop={handleGroupDrop}>
              <Layers size={14} className={groupCols.length > 0 ? 'text-indigo-500 dark:text-indigo-400 shrink-0' : 'text-slate-400 dark:text-slate-500 shrink-0'} />
              {groupCols.length === 0 ? (
                <span className="text-[12px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">{t('هدر ستون را برای گروه‌بندی اینجا رها کنید', 'Drop column header here to group')}</span>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-max">
                  {groupCols.map((field, idx) => {
                    const colDef = columns.find(c => c.field === field);
                    return (
                      <div key={field} 
                           draggable
                           onDragStart={(e) => { e.stopPropagation(); handleGroupDragStart(e, idx); }}
                           onDragEnter={(e) => handleGroupDragEnter(e, idx)}
                           onDragEnd={handleGroupDragEnd}
                           onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                           className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[12px] font-bold shadow-sm cursor-grab active:cursor-grabbing">
                        <span>{colDef ? t(colDef.header_fa, colDef.header_en) : field}</span>
                        <button onClick={() => removeGroupCol(field)} className="text-indigo-400 dark:text-indigo-500 hover:text-red-500 dark:hover:text-red-400 rounded-full p-0.5 ml-1"><X size={12} /></button>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-auto shrink-0">
                    <button onClick={expandAllGroups} title={t('باز کردن همه', 'Expand All')} className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"><Maximize2 size={12} /></button>
                    <button onClick={collapseAllGroups} title={t('بستن همه', 'Collapse All')} className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"><Minimize2 size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-1 shrink-0">
            {filteredHeaderMenus && filteredHeaderMenus.length > 0 && (
              <div className="flex items-center gap-1.5" ref={headerMenuRef}>
                {filteredHeaderMenus.map((menu, idx) => (
                  <div key={idx} className="relative h-full">
                    <Button size="sm" variant={menu.variant || 'outline'} onClick={() => setActiveHeaderMenu(activeHeaderMenu === idx ? null : idx)} className={`h-full flex items-center justify-between gap-4 min-w-[130px] ${menu.className || ''}`}>
                      <span className="flex items-center gap-1.5">
                        {menu.icon && <menu.icon size={14} className="shrink-0" />}
                        {menu.label}
                      </span>
                      <ChevronDown size={14} className="opacity-70 shrink-0" />
                    </Button>
                    {activeHeaderMenu === idx && (
                      <div className="absolute top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-1.5 z-50 min-w-[180px] right-0 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                        <div className="text-[12px] font-black text-slate-400 dark:text-slate-500 mb-1 px-2 pt-1 uppercase">{menu.label}</div>
                        {menu.items.map((item, i) => {
                          if (item.divider) return <div key={i} className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>;
                          return (
                            <button key={i} onClick={() => { item.onClick(); setActiveHeaderMenu(null); }} className={`flex items-center gap-2 w-full text-start px-2.5 py-2 text-[11.5px] font-bold rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${item.className || 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                              {item.icon && <item.icon size={14} className={item.iconClassName || ''} />}
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
              </div>
            )}
            
            <div className="relative flex items-center h-full" ref={colMenuRef}>
              <button
                onClick={() => {
                  if (!showColMenu && colMenuRef.current) {
                    setColMenuPosition(colMenuRef.current.getBoundingClientRect());
                  }
                  setShowColMenu(prev => !prev);
                }}
                title={t('نمایش/مخفی‌سازی ستون‌ها', 'Columns')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:border-slate-600 rounded-md transition-all h-full flex items-center justify-center"><Settings size={16} /></button>
            </div>
            {showColMenu && colMenuPosition && (() => {
              const menuWidth = 220;
              // Smart horizontal position: right-align if menu fits on left side of button, else left-align
              const resultingLeftEdge = colMenuPosition.right - menuWidth;
              const posH = resultingLeftEdge >= 8
                ? { right: Math.max(4, window.innerWidth - colMenuPosition.right) }
                : { left: Math.max(8, Math.min(colMenuPosition.left, window.innerWidth - menuWidth - 8)) };
              // Smart vertical position
              const spaceBelow = window.innerHeight - colMenuPosition.bottom;
              const posV = spaceBelow > 270
                ? { top: colMenuPosition.bottom + 4 }
                : { bottom: window.innerHeight - colMenuPosition.top + 4 };
              const menuNode = (
                <div
                  ref={colMenuPortalRef}
                  style={{ position: 'fixed', zIndex: 999999, ...posH, ...posV }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-2 min-w-[200px] animate-in zoom-in-95 duration-100"
                >
                  <div className="text-[12px] font-black text-slate-800 dark:text-slate-100 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700 px-1">{t('نمایش / مخفی‌سازی', 'Show / Hide')}</div>
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-0.5">
                    {columns.map(c => (
                      <label key={c.field} className="flex items-center gap-2.5 cursor-pointer p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 transition-colors">
                        <input type="checkbox" checked={!hiddenCols.includes(c.field)} onChange={() => toggleVisibility(c.field)} className="rounded border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/40 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 w-3.5 h-3.5" />
                        {t(c.header_fa, c.header_en)}
                      </label>
                    ))}
                  </div>
                </div>
              );
              return ReactDOM ? ReactDOM.createPortal(menuNode, document.body) : menuNode;
            })()}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            {onDownloadSample && access.canCreate && (
              <button onClick={onDownloadSample} title={t('دانلود نمونه فایل اکسل', 'Download Excel Sample')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all h-full flex items-center justify-center"><FileDown size={16} /></button>
            )}
            {!hideImport && access.canCreate && (
              <>
                <button onClick={() => document.getElementById('grid-import-input').click()} title={t('ورود اطلاعات', 'Import')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all h-full flex items-center justify-center"><Upload size={16} /></button>
                <input id="grid-import-input" type="file" className="hidden" accept=".csv" onChange={(e) => { if (onImport && e.target.files.length > 0) { onImport(e.target.files[0]); e.target.value = ''; } }} />
              </>
            )}
            {!hideExport && access.canPrint && (
              <button onClick={onExport || exportCSV} title={t('خروجی اکسل', 'Export')} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-md transition-all h-full flex items-center justify-center"><FileSpreadsheet size={16} /></button>
            )}
          </div>
        </div>}

        <div className="overflow-auto custom-scrollbar flex-1 relative bg-white dark:bg-slate-800">
          <table className="w-full h-full text-start border-separate border-spacing-0 min-w-max" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 shadow-sm">
              <tr>
                {rowReorderable && <th style={{ width: '30px', ...getStickyStyles('ROW_REORDER_COL', false, true) }} className={`p-1.5 bg-slate-100 dark:bg-slate-900 border-0`}></th>}
                {selectable && (
                  <th style={{ width: '40px', ...getStickyStyles('SELECT_COL', false, true) }} className={`p-1.5 text-center bg-slate-100 dark:bg-slate-900 border-0`}>
                    <input type="checkbox" onChange={handleSelectAll} checked={paginatedData.length > 0 && paginatedData.filter(r => !r.isGroupHeader).every(r => selectedRows.includes(r.id))} className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/40 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 cursor-pointer" />
                  </th>
                )}
                {visibleColumns.map((col, index) => {
                  const actualIndex = columnOrder.indexOf(col.field);
                  const isPinned = pinnedCols.includes(col.field);
                  return (
                    <th 
                      key={col.field} draggable
                      onDragStart={(e) => handleColDragStart(e, actualIndex, col.field)} onDragEnter={(e) => handleColDragEnter(e, actualIndex)} onDragEnd={handleColDragEnd} onDragOver={(e) => e.preventDefault()}
                      style={{ width: col.width || '150px', ...getStickyStyles(col.field, false, true) }}
                      className={`p-1.5 text-[12px] font-black text-slate-700 dark:text-slate-200 select-none bg-slate-100 dark:bg-slate-900 border-0`}
                    >
                      <div className="flex items-center justify-between gap-1 group">
                        <div className="flex items-center gap-1.5 cursor-pointer flex-1 overflow-hidden" onClick={() => handleSort(col.field)}>
                          <GripVertical size={12} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                          <span className="truncate">{t(col.header_fa, col.header_en)}</span>
                          {sortConfig.field === col.field && <span className="text-indigo-500 dark:text-indigo-400 shrink-0">{sortConfig.direction === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}</span>}
                        </div>
                        <button onClick={() => togglePin(col.field)} className={`p-0.5 rounded shrink-0 transition-colors ${isPinned ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 opacity-100' : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-300'}`} title={t('سنجاق کردن', 'Pin Column')}>
                          {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                        </button>
                      </div>
                    </th>
                  )
                })}
                {filteredActions.length > 0 && (
                  <th style={{...getStickyStyles('ACTIONS', true, true), width: actionWidth, minWidth: actionWidth, maxWidth: actionWidth}} className="p-1.5 text-[12px] font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.03)] dark:shadow-none border-0">
                    {t('عملیات', 'Actions')}
                  </th>
                )}
              </tr>

              <tr>
                {rowReorderable && <td style={getStickyStyles('ROW_REORDER_COL', false, true)} className={`p-1 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700`}></td>}
                {selectable && <td style={getStickyStyles('SELECT_COL', false, true)} className={`p-1 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700`}></td>}
                {visibleColumns.map((col) => {
                  return (
                    <td key={`filter-${col.field}`} style={getStickyStyles(col.field, false, true)} className={`p-1 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700`}>
                      <div className="relative">
                        {col.type === 'date' ? (
                          <div className="w-full">
                              <DatePicker 
                                value={localFilters[col.field] || ''} 
                                onChange={(val) => handleLocalFilterChange(col.field, val)}
                                isRtl={isRtl} language={language} size="xs" wrapperClassName="!gap-0"
                              />
                          </div>
                        ) : col.type === 'select' ? (
                          <div className="w-full">
                              <SelectField 
                                size="xs" options={col.options || []} value={localFilters[col.field] || ''} 
                                onChange={(e) => handleLocalFilterChange(col.field, e.target.value)} 
                                isRtl={isRtl} wrapperClassName="!gap-0" placeholder={t('همه', 'All')} 
                              />
                          </div>
                        ) : col.type !== 'toggle' && col.type !== 'checkbox' ? (
                          <>
                            <Search size={10} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-1.5' : 'left-1.5'} text-slate-400 dark:text-slate-500`} />
                            <input 
                              type={col.type === 'number' ? 'number' : 'text'}
                              dir={!isRtl ? 'ltr' : 'rtl'}
                              value={localFilters[col.field] || ''} 
                              onChange={(e) => handleLocalFilterChange(col.field, e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') applyInlineFilters(); }}
                              placeholder={t('جستجو...', 'Search...')}
                              className={`w-full h-6 text-[10px] font-sans font-bold bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-500 rounded outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-700/60 focus:border-indigo-400 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-400/20 transition-all ${isRtl ? 'pr-5 pl-1' : 'pl-5 pr-1'}`}
                            />
                          </>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
                {filteredActions.length > 0 && (
                  <td style={{...getStickyStyles('ACTIONS', true, true), width: actionWidth, minWidth: actionWidth, maxWidth: actionWidth}} className="p-1 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] dark:shadow-none">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={applyInlineFilters} title={t('اعمال فیلتر', 'Apply Filter')} className="p-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm transition-colors">
                        <Search size={12} strokeWidth={2.5} />
                      </button>
                      {Object.keys(localFilters).some(k => localFilters[k]) && (
                        <button onClick={clearInlineFilters} title={t('پاک کردن فیلترها', 'Clear Filters')} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            </thead>

            <tbody className="relative">
              {paginatedData.length > 0 ? paginatedData.map((row, rowIndex) => {
                if (row.isGroupHeader) {
                  const isCollapsed = collapsedGroups.includes(row.groupKey);
                  return (
                    <tr key={`group-${row.groupKey}`} className="bg-indigo-50/40 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50">
                      <td colSpan={visibleColumns.length + (filteredActions.length > 0 ? 1 : 0) + (selectable ? 1 : 0) + (rowReorderable ? 1 : 0)} className="p-0 sticky left-0 right-0">
                        <div className="flex items-center gap-2 p-1.5 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors w-max" style={{ paddingInlineStart: `${row.depth * 20 + 8}px` }} onClick={() => toggleGroupCollapse(row.groupKey)}>
                          <div className="text-indigo-500 dark:text-indigo-400">{isRtl ? (isCollapsed ? <ChevronLeft size={14}/> : <ChevronDown size={14}/>) : (isCollapsed ? <ChevronRight size={14}/> : <ChevronDown size={14}/>)}</div>
                          <Layers size={12} className="text-indigo-400 dark:text-indigo-500" />
                          <span className="text-[12px] font-black text-indigo-900 dark:text-indigo-300">{row.groupValue}</span>
                          <span className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{row.count} {t('ردیف', 'rows')}</span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const isSelected = selectedRows.includes(row.id);
                const isActive = activeRowId !== null && activeRowId === row.id;
                const isHighlighted = isSelected || isActive;
                const isDragging = rowReorderable && draggableRowIndex === rowIndex;

                return (
                  <tr 
                    key={row.id || rowIndex} 
                    onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(row)}
                    onClick={() => onRowClick && onRowClick(row)}
                    draggable={isDragging}
                    onDragStart={(e) => handleRowDragStart(e, rowIndex)} onDragEnter={(e) => handleRowDragEnter(e, rowIndex)} onDragEnd={handleRowDragEnd} onDragOver={(e) => e.preventDefault()}
                    className={`bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50 transition-colors group ${isHighlighted ? 'bg-indigo-50/80 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${isDragging ? 'opacity-50' : ''}`}
                  >
                    {rowReorderable && (
                      <td style={{...getStickyStyles('ROW_REORDER_COL', false), backgroundColor: 'inherit'}} className={`p-0 text-center bg-inherit ${!isHighlighted ? 'group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50' : ''} ${isRtl ? 'border-l border-slate-100 dark:border-slate-700/50' : 'border-r border-slate-100 dark:border-slate-700/50'}`}>
                        <div 
                          onMouseDown={() => setDraggableRowIndex(rowIndex)}
                          onMouseUp={() => setDraggableRowIndex(null)}
                          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 py-1.5 px-2 w-full flex items-center justify-center"
                        >
                          <GripVertical size={14} />
                        </div>
                      </td>
                    )}
                    {selectable && (
                      <td style={{...getStickyStyles('SELECT_COL', false), backgroundColor: 'inherit'}} className={`p-1.5 text-center bg-inherit ${!isHighlighted ? 'group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50' : ''} ${isRtl ? 'border-l border-slate-100 dark:border-slate-700/50' : 'border-r border-slate-100 dark:border-slate-700/50'}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(row.id)} className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/40 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 cursor-pointer" />
                      </td>
                    )}
                    {visibleColumns.map((col) => (
                      <td key={`${row.id || rowIndex}-${col.field}`} style={{...getStickyStyles(col.field), backgroundColor: 'inherit'}} className={`p-1.5 text-[12px] text-slate-700 dark:text-slate-300 bg-inherit ${!isHighlighted ? 'group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50' : ''} ${isRtl ? 'border-l border-slate-100 dark:border-slate-700/50' : 'border-r border-slate-100 dark:border-slate-700/50'}`}>
                        {renderCellContent(col, row, rowIndex)}
                      </td>
                    ))}
                    
                    {filteredActions.length > 0 && (
                      <td style={{...getStickyStyles('ACTIONS', true), backgroundColor: 'inherit', width: actionWidth, minWidth: actionWidth, maxWidth: actionWidth}} className={`p-1 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.01)] dark:shadow-none bg-inherit ${!isHighlighted ? 'group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50' : ''} border-slate-100 dark:border-slate-700/50`}>
                        <div className="flex items-center justify-center gap-0.5">
                          {filteredActions.map((act, i) => {
                            if (act.hidden && act.hidden(row)) return null;
                            const actClass = typeof act.className === 'function' ? act.className(row) : (act.className || 'hover:text-indigo-600 dark:hover:text-indigo-400');
                            return (
                              <button key={i} onClick={(e) => { e.stopPropagation(); act.onClick(row, rowIndex); }} title={act.tooltip} className={`p-1.5 rounded-md text-slate-400 dark:text-slate-500 border border-transparent hover:border-slate-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all ${actClass}`}>
                                <act.icon size={14} strokeWidth={2} />
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={visibleColumns.length + (filteredActions.length > 0 ? 1 : 0) + (selectable ? 1 : 0) + (rowReorderable ? 1 : 0)} className="p-12 h-full text-center text-slate-400 dark:text-slate-500 text-[12px] font-medium bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex flex-col items-center justify-center gap-3"><Search size={32} className="text-slate-300 dark:text-slate-600" /><span>{t('هیچ داده‌ای برای نمایش یافت نشد.', 'No data found to display.')}</span></div>
                  </td>
                </tr>
              )}
              {paginatedData.length > 0 && (
                <tr className="h-full">
                  <td colSpan={visibleColumns.length + (filteredActions.length > 0 ? 1 : 0) + (selectable ? 1 : 0) + (rowReorderable ? 1 : 0)} className="border-0 bg-transparent p-0"></td>
                </tr>
              )}
            </tbody>
            
            {showSummaryRow && summaryData && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  {rowReorderable && <td style={getStickyStyles('ROW_REORDER_COL', false, false, true)} className={`p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 ${isRtl ? 'border-l' : 'border-r'}`}></td>}
                  {selectable && <td style={getStickyStyles('SELECT_COL', false, false, true)} className={`p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 ${isRtl ? 'border-l' : 'border-r'}`}></td>}
                  {visibleColumns.map((col, idx) => {
                    const isFirstVisible = idx === 0;
                    const cellValue = col.summarizable && summaryData[col.field] !== undefined 
                      ? (col.formatSummary ? col.formatSummary(summaryData[col.field]) : summaryData[col.field].toLocaleString()) 
                      : (isFirstVisible && !col.summarizable ? t('جمع کل:', 'Total:') : '');
                    return (
                      <td key={`summary-${col.field}`} style={getStickyStyles(col.field, false, false, true)} className={`p-2 font-black text-[12px] text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 ${isRtl ? 'border-l' : 'border-r'} ${col.summarizable ? 'text-indigo-700 dark:text-indigo-400' : ''}`}>
                        {cellValue}
                      </td>
                    );
                  })}
                  {filteredActions.length > 0 && <td style={{...getStickyStyles('ACTIONS', true, false, true), width: actionWidth, minWidth: actionWidth, maxWidth: actionWidth}} className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] dark:shadow-none"></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 gap-4 shrink-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{t('تعداد در صفحه:', 'Rows per page:')}</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="text-[12px] font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-700 dark:text-slate-200 cursor-pointer">
              {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mx-2 hidden sm:block">{t(`نمایش ${(page - 1) * pageSize + 1} تا ${Math.min(page * pageSize, totalRecords)} از ${totalRecords}`, `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalRecords)} of ${totalRecords}`)}</span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-0.5 shadow-sm">
              <button onClick={() => setPage(1)} disabled={page === 1} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded"><ChevronsRight size={14} className={isRtl ? '' : 'rotate-180'} /></button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded"><ChevronRight size={14} className={isRtl ? '' : 'rotate-180'} /></button>
              <div className="text-[12px] font-black text-indigo-700 dark:text-indigo-300 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded">{page} <span className="text-indigo-300 dark:text-indigo-600 mx-1">/</span> {totalPages || 1}</div>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded"><ChevronLeft size={14} className={isRtl ? '' : 'rotate-180'} /></button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages || totalPages === 0} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded"><ChevronsLeft size={14} className={isRtl ? '' : 'rotate-180'} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  window.DSGrid = { LOVField, AdvancedFilter, DataGrid };
})();