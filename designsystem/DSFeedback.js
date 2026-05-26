/* Filename: DSFeedback.js */
(() => {
  const React = window.React;
  const { useState, useEffect } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    X = FallbackIcon, 
    Maximize2 = FallbackIcon, 
    Minimize2 = FallbackIcon, 
    CheckCircle2 = FallbackIcon, 
    AlertCircle = FallbackIcon, 
    Info = FallbackIcon, 
    AlertTriangle = FallbackIcon,
    History = FallbackIcon,
    Plus = FallbackIcon,
    Edit = FallbackIcon,
    Trash2 = FallbackIcon,
    Clock = FallbackIcon,
    Calendar = FallbackIcon,
    ArrowLeft = FallbackIcon,
    ArrowRight = FallbackIcon,
    ChevronDown = FallbackIcon,
    ChevronUp = FallbackIcon
  } = LucideIcons;
  
  const { Button } = window.DSCore || {};

  const Modal = ({ isOpen, onClose, title, children, showMaximize = true, width = 'max-w-2xl', language = 'fa' }) => {
    const isRtl = language === 'fa';
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
      const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
      if (isOpen) document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto custom-scrollbar font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="fixed inset-0 bg-slate-900/30 dark:bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />
        <div className="flex items-center justify-center min-h-full p-2 sm:p-4 pointer-events-none">
          <div className={`pointer-events-auto bg-white dark:bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative z-10 transition-all duration-300 animate-in zoom-in-95 ${isMaximized ? 'w-full min-h-[calc(100vh-1rem)] rounded-xl' : `${width} w-full rounded-2xl`} border border-slate-200 dark:border-slate-700`}>
            <div className="h-11 px-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80 shrink-0 rounded-t-2xl">
              <h3 className="font-black text-slate-700 dark:text-slate-200 text-[14px] tracking-tight">{title}</h3>
              <div className="flex items-center gap-1">
                {showMaximize && (
                  <button onClick={() => setIsMaximized(!isMaximized)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95">
                    {isMaximized ? <Minimize2 size={14} strokeWidth={2.5} /> : <Maximize2 size={14} strokeWidth={2.5} />}
                  </button>
                )}
                <button onClick={onClose} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95">
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-800 flex flex-col rounded-b-2xl">{children}</div>
          </div>
        </div>
      </div>
    );
  };

  const Tooltip = ({ children, text, position = 'top' }) => {
    const [show, setShow] = useState(false);
    const posClasses = {
      top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
      bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
      left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
      right: "left-full top-1/2 -translate-y-1/2 ml-1.5"
    };
    return (
      <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        {show && (
          <div className={`absolute z-[200] px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-bold rounded-md whitespace-nowrap shadow-lg animate-in fade-in zoom-in-95 duration-150 ${posClasses[position]}`}>
            {text}
          </div>
        )}
      </div>
    );
  };

  const Alert = ({ type = 'info', title, message, onClose }) => {
    const styles = {
      success: 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400',
      error: 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-400',
      warning: 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-400',
      info: 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-400',
    };
    
    const icons = {
      success: <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />,
      error: <AlertCircle size={16} className="text-rose-500 dark:text-rose-400" />,
      warning: <AlertTriangle size={16} className="text-amber-500 dark:text-amber-400" />,
      info: <Info size={16} className="text-indigo-500 dark:text-indigo-400" />
    };

    return (
      <div className={`flex items-start p-3 border rounded-xl shadow-sm ${styles[type]} gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-1`}>
        <div className="flex-shrink-0 pt-0.5">{icons[type]}</div>
        <div className="flex-1 flex flex-col gap-0.5">
          {title && <h3 className="text-[12px] font-black">{title}</h3>}
          <div className="text-[12px] opacity-90 leading-relaxed font-medium">{message}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity p-0.5">
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  };

  const Toast = ({ type = 'success', message, isVisible, onClose }) => {
    if (!isVisible) return null;
    
    const styles = {
      success: 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-400',
      error: 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-800/50 text-rose-900 dark:text-rose-400',
      warning: 'bg-white dark:bg-slate-800 border-amber-100 dark:border-amber-800/50 text-amber-900 dark:text-amber-400',
      info: 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-400',
    };

    const icons = {
      success: <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />,
      error: <AlertCircle size={16} className="text-rose-500 dark:text-rose-400" />,
      warning: <AlertTriangle size={16} className="text-amber-500 dark:text-amber-400" />,
      info: <Info size={16} className="text-indigo-500 dark:text-indigo-400" />
    };
    
    return (
      <div className={`fixed bottom-6 end-6 md:start-auto md:end-6 flex items-center px-4 py-3 border rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${styles[type]} z-[200] gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300`}>
        <div className="shrink-0">{icons[type]}</div>
        <div className="text-[12px] font-black whitespace-nowrap">{message}</div>
        {onClose && (
          <button onClick={onClose} className="opacity-30 hover:opacity-100 transition-all p-1 ms-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  };

  const Banner = ({ type = 'info', message, action, onClose }) => {
    const styles = {
      success: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400',
      error: 'bg-rose-50 dark:bg-rose-900/40 border-rose-100 dark:border-rose-800/50 text-rose-800 dark:text-rose-400',
      warning: 'bg-amber-50 dark:bg-amber-900/40 border-amber-100 dark:border-amber-800/50 text-amber-800 dark:text-amber-400',
      info: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-400',
    };
    
    const icons = {
      success: <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />,
      error: <AlertCircle size={14} className="text-rose-500 dark:text-rose-400" />,
      warning: <AlertTriangle size={14} className="text-amber-500 dark:text-amber-400" />,
      info: <Info size={14} className="text-indigo-500 dark:text-indigo-400" />
    };

    return (
      <div className={`w-full flex items-center justify-between px-4 py-2 border-b transition-all duration-300 ${styles[type]} z-40`}>
        <div className="flex items-center gap-2.5">
          {icons[type]}
          <span className="text-[12px] font-bold tracking-tight">{message}</span>
        </div>
        <div className="flex items-center gap-3">
          {action && (
            <button onClick={action.onClick} className="text-[10px] font-black bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/5 px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow-sm dark:text-white">
              {action.label}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="opacity-30 hover:opacity-100 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all">
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const Dialog = ({ isOpen, title, children, onConfirm, onCancel, confirmLabel = 'تایید', cancelLabel = 'انصراف', type = 'info', language = 'fa' }) => {
    const isRtl = language === 'fa';
    
    useEffect(() => {
      const handleEsc = (e) => { if (e.key === 'Escape' && isOpen) onCancel && onCancel(); };
      if (isOpen) document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const accentStyles = {
      success: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800",
      error: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800",
      warning: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800",
      info: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800"
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in duration-200" onClick={onCancel} />
        <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-slate-200 dark:border-slate-700 shadow-[0_30px_70px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.5)] w-full max-w-sm overflow-hidden relative z-10 flex flex-col animate-in zoom-in-95 duration-200">
          <div className="px-6 pt-6 pb-3 flex items-center justify-between">
            <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${accentStyles[type]}`}>
              {title}
            </div>
            <button onClick={onCancel} className="opacity-30 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-all text-slate-800 dark:text-slate-200">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="px-6 pb-6">
            <div className="text-slate-600 dark:text-slate-300 text-[14px] leading-relaxed font-bold py-1">
              {children}
            </div>
            <div className="mt-8 flex justify-end gap-2.5">
              {onCancel && (
                <Button variant="outline" size="sm" onClick={onCancel} className="!rounded-xl !px-4 !border-slate-200 dark:!border-slate-600 !text-slate-500 dark:!text-slate-400 !h-8 !text-[12px]">
                  {cancelLabel}
                </Button>
              )}
              {onConfirm && (
                <Button variant={type === 'error' ? 'danger' : 'primary'} size="sm" onClick={onConfirm} className="!rounded-xl !px-6 !h-8 !text-[12px] shadow-sm">
                  {confirmLabel}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LogTimeline = ({ logs = [], isLoading = false, language = 'fa' }) => {
    const [expandedLogs, setExpandedLogs] = useState([]);
    
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const globalMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';
    const formatDate = window.DSCore?.formatGlobalDate || ((v) => v);

    const toggleExpand = (id) => {
        setExpandedLogs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const getFieldLabel = (key) => {
      const labels = {
        code: t('کد ارز', 'Currency Code'),
        title: t('عنوان', 'Title'),
        symbol: t('نماد', 'Symbol'),
        is_active: t('وضعیت فعالیت', 'Status'),
        fetch_type: t('نحوه دریافت', 'Fetch Type'),
        decimal_places: t('اعشار', 'Decimals'),
        targets: t('ارزهای هدف', 'Targets'),
        rate: t('نرخ تبدیل', 'Exchange Rate'),
        rate_date: t('تاریخ نرخ', 'Rate Date'),
        source: t('منبع اطلاعات', 'Source'),
        base_currency: t('ارز پایه', 'Base Currency'),
        target_currency: t('ارز هدف', 'Target Currency'),
        created_by: t('ایجاد کننده', 'Created By'),
        updated_by: t('ویرایش کننده', 'Updated By'),
        created_at: t('تاریخ ایجاد', 'Created At'),
        updated_at: t('تاریخ ویرایش', 'Updated At'),
        id: t('شناسه رکورد', 'Record ID')
      };
      return labels[key] || key;
    };

    const formatValue = (val) => {
      if (val === null || val === undefined || val === '') return t('خالی', 'Empty');
      if (typeof val === 'boolean') return val ? t('بله (فعال)', 'Yes (Active)') : t('خیر (غیرفعال)', 'No (Inactive)');
      if (Array.isArray(val)) return val.length ? val.join('، ') : t('بدون مقدار', 'No Value');
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    };

    const getActionLabel = (action) => {
      if (!action) return '';
      const act = action.toUpperCase();
      if (act === 'CREATE' || act === 'ایجاد') return t('ایجاد', 'Create');
      if (act === 'UPDATE' || act === 'ویرایش') return t('ویرایش', 'Update');
      if (act === 'DELETE' || act === 'حذف') return t('حذف', 'Delete');
      return action;
    };

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-3 min-h-[200px]">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="text-slate-500 dark:text-slate-400 text-[12px] font-bold">{t('در حال دریافت لاگ‌ها...', 'Loading logs...')}</span>
        </div>
      );
    }

    if (!logs || logs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-400 dark:text-slate-500 min-h-[200px]">
          <History size={40} className="opacity-40" />
          <span className="text-[12px] font-bold">{t('هیچ لاگی برای این رکورد ثبت نشده است.', 'No logs found for this record.')}</span>
        </div>
      );
    }

    return (
      <div className="relative px-4 py-6 font-sans min-h-[200px] max-h-[65vh] overflow-y-auto custom-scrollbar" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`absolute top-6 bottom-6 w-px bg-slate-200 dark:bg-slate-700 ${isRtl ? 'right-[31px]' : 'left-[31px]'}`}></div>
        <div className="flex flex-col gap-6">
          {logs.map((log, index) => {
            const isCreate = log.action === 'CREATE' || log.action === 'ایجاد';
            const isDelete = log.action === 'DELETE' || log.action === 'حذف';
            const isUpdate = log.action === 'UPDATE' || log.action === 'ویرایش';
            const logId = log.id || index;
            const isExpanded = expandedLogs.includes(logId);
            
            let ActionIcon = Info;
            let iconColor = 'text-blue-500 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
            
            if (isCreate) { ActionIcon = Plus; iconColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'; }
            if (isUpdate) { ActionIcon = Edit; iconColor = 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'; }
            if (isDelete) { ActionIcon = Trash2; iconColor = 'text-rose-500 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800'; }

            const d = new Date(log.timestamp);
            const dateStr = formatDate ? formatDate(log.timestamp, globalMode) : d.toISOString().split('T')[0];
            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            const actionDisplay = getActionLabel(log.action);

            const renderDiffs = () => {
              if (!log.old_data && !log.new_data) return null;
              
              if (isUpdate && log.old_data && log.new_data) {
                 const changes = [];
                 Object.keys(log.new_data).forEach(key => {
                    if (['updated_at', 'updated_by', 'created_at', 'created_by'].includes(key)) return;
                    
                    const oldVal = log.old_data[key];
                    const newVal = log.new_data[key];
                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                        changes.push({ key, oldVal, newVal });
                    }
                 });
                 if (changes.length === 0) return null;
                 return (
                    <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t('تغییرات فیلدها:', 'Field Changes:')}</span>
                       {changes.map(c => (
                          <div key={c.key} className="flex items-center flex-wrap gap-2 text-[12px] bg-slate-100/50 dark:bg-slate-900/40 p-2 rounded-md border border-slate-200/50 dark:border-slate-700/50">
                             <span className="font-bold text-slate-600 dark:text-slate-300 min-w-[80px]">{getFieldLabel(c.key)}:</span>
                             <span className="text-rose-500 dark:text-rose-400 line-through decoration-rose-300/50 truncate max-w-[150px]" title={formatValue(c.oldVal)}>{formatValue(c.oldVal)}</span>
                             {isRtl ? <ArrowLeft size={10} className="text-slate-400 shrink-0" /> : <ArrowRight size={10} className="text-slate-400 shrink-0" />}
                             <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[150px]" title={formatValue(c.newVal)}>{formatValue(c.newVal)}</span>
                          </div>
                       ))}
                    </div>
                 );
              }
              
              if (isDelete && log.old_data) {
                 return (
                    <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{t('اطلاعات رکورد حذف شده:', 'Deleted Record Data:')}</span>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.keys(log.old_data).filter(k => !['updated_at', 'updated_by', 'created_at', 'created_by'].includes(k)).map(key => (
                             <div key={key} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-md border border-slate-100 dark:border-slate-700/50">
                                <span className="text-[10px] font-bold text-slate-400 min-w-[70px]">{getFieldLabel(key)}:</span>
                                <span className="text-[12px] font-black text-slate-700 dark:text-slate-300 truncate" title={formatValue(log.old_data[key])}>{formatValue(log.old_data[key])}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 )
              }
              return null;
            };

            return (
              <div key={logId} className="relative flex items-start gap-4 group animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}>
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 relative z-10 ${iconColor} shadow-sm`}>
                  <ActionIcon size={14} strokeWidth={2.5} />
                </div>
                <div 
                  className={`flex-1 bg-white dark:bg-slate-800 border ${isExpanded ? 'border-indigo-300 dark:border-indigo-600 shadow-md' : 'border-slate-200 dark:border-slate-700 shadow-sm'} rounded-xl p-3.5 hover:shadow-md transition-all cursor-pointer select-none overflow-hidden`}
                  onClick={() => toggleExpand(logId)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[12.5px] font-black text-slate-800 dark:text-slate-100">{actionDisplay}</span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">{log.user_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[10.5px] font-sans font-medium" dir="ltr">
                      <div className="flex items-center gap-1.5"><Calendar size={12} /> <span>{dateStr}</span></div>
                      <div className="flex items-center gap-1.5"><Clock size={12} /> <span>{timeStr}</span></div>
                      <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-500' : ''}`}>
                         <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                     <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200 cursor-auto" onClick={(e) => e.stopPropagation()}>
                        {log.details && (
                          <div className="text-[11.5px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 leading-relaxed font-medium">
                            {log.details}
                          </div>
                        )}
                        {renderDiffs()}
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  window.DSFeedback = { Modal, Tooltip, Alert, Toast, Banner, Dialog, LogTimeline };
})();
