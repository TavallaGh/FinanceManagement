/* Filename: designsystem/DSForms.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useRef, useCallback, useMemo } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  
  const { 
    AlertCircle = FallbackIcon, 
    Search = FallbackIcon, 
    ChevronDown = FallbackIcon, 
    ChevronLeft = FallbackIcon, 
    ChevronRight = FallbackIcon, 
    Calendar = FallbackIcon, 
    X = FallbackIcon, 
    UploadCloud = FallbackIcon, 
    FileText = FallbackIcon, 
    Download = FallbackIcon, 
    Trash2 = FallbackIcon,
    Eye = FallbackIcon
  } = window.LucideIcons || {};

  const { useCalendarMode, formatGlobalDate, j2g, g2j } = window.DSCore || {};

  const useSecureField = (formCode, defaultDisabled) => {
    if (!formCode || !window.SecurityManager) return defaultDisabled;
    try {
      const { getActions } = window.SecurityManager.useSecurity();
      const actions = getActions(formCode);
      if (!actions.canEdit && !actions.canCreate) return true;
    } catch (e) {
      console.warn("Security context not found for field access check.");
    }
    return defaultDisabled;
  };

  const TextField = (props) => {
    const { label, error, hint, icon: Icon, disabled = false, required = false, className = '', wrapperClassName = '', id, type = 'text', size = 'md', isRtl = true, formCode } = props;
    const restProps = Object.assign({}, props);
    ['label', 'error', 'hint', 'icon', 'disabled', 'required', 'className', 'wrapperClassName', 'id', 'type', 'size', 'isRtl', 'formCode'].forEach(k => delete restProps[k]);
    
    const isDisabled = useSecureField(formCode, disabled);
    const [generatedId] = useState(() => `input-${Math.random().toString(36).substr(2, 9)}`);
    const inputId = id || generatedId;
    const inputHeights = { xs: 'h-6 text-[10px]', sm: 'h-8 text-[12px]', md: 'h-10 text-[14px]', lg: 'h-12 text-[14px]' };
    const isXs = size === 'xs';
    
    return (
      <div className={`flex flex-col ${isXs ? 'gap-0.5' : size === 'sm' ? 'gap-1' : 'gap-1.5'} w-full ${wrapperClassName}`}>
        {label && <label htmlFor={inputId} className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">{label} {required && <span className="text-red-500 dark:text-red-400">*</span>}</label>}
        <div className="relative flex items-center">
          {Icon && <div className={`absolute ${isRtl ? 'right-2.5' : 'left-2.5'} text-slate-400 dark:text-slate-500 pointer-events-none`}><Icon size={isXs ? 12 : size === 'sm' ? 14 : 16} /></div>}
          <input
            id={inputId} type={type} disabled={isDisabled}
            className={`w-full ${inputHeights[size] || inputHeights.md} bg-white dark:bg-slate-700/40 border rounded-lg text-slate-800 dark:text-slate-100 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-700/60 focus:ring-2 ${isDisabled ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'border-slate-300 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-400/20 hover:border-slate-400 dark:hover:border-slate-400'} ${Icon ? (isRtl ? (isXs ? 'pr-6 pl-2' : 'pr-8 pl-2.5') : (isXs ? 'pl-6 pr-2' : 'pl-8 pr-2.5')) : (isXs ? 'px-2' : 'px-2.5')} ${className}`}
            dir={isRtl ? 'rtl' : 'ltr'} {...restProps}
          />
        </div>
        {error ? <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-[10px] font-bold mt-0.5"><AlertCircle size={10} /><span>{error}</span></div> : hint ? <div className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">{hint}</div> : null}
      </div>
    );
  };

  const SelectField = ({ label, error, options = [], value, onChange, disabled = false, required = false, className = '', wrapperClassName = '', id, name, size = 'md', isRtl = true, placeholder = '', formCode }) => {
    const isDisabled = useSecureField(formCode, disabled);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const [rect, setRect] = useState(null);
    const ReactDOM = window.ReactDOM;
    const t = (fa, en) => isRtl ? fa : en;
    const isXs = size === 'xs';
    
    const [generatedId] = useState(() => `select-${Math.random().toString(36).substr(2, 9)}`);
    const selectId = id || generatedId;
    
    const selectedOption = options.find(o => String(o.value) === String(value));
    const displayValue = selectedOption ? selectedOption.label : '';

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
          setSearchTerm('');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const filteredOptions = options.filter(o => 
      o.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(o.value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const inputHeights = { xs: 'h-6 text-[10px]', sm: 'h-8 text-[12px]', md: 'h-10 text-[14px]', lg: 'h-12 text-[14px]' };

    const dropdownContent = (
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        {filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (
          <div 
            key={idx} 
            className={`px-3 py-2 text-[12px] cursor-pointer transition-colors ${String(value) === String(opt.value) ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300'}`}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if(onChange) onChange({ target: { name: name || id, value: opt.value } });
              setIsOpen(false);
              setSearchTerm('');
            }}
          >
            {opt.label}
          </div>
        )) : (
          <div className="px-3 py-4 text-center text-[12px] text-slate-400 dark:text-slate-500">{t('موردی یافت نشد', 'No results')}</div>
        )}
      </div>
    );

    return (
      <div ref={containerRef} className={`flex flex-col ${isXs ? 'gap-0.5' : size === 'sm' ? 'gap-1' : 'gap-1.5'} w-full relative ${isOpen ? 'z-[9999]' : 'z-10'} ${wrapperClassName}`}>
        {label && <label htmlFor={selectId} className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">{label} {required && <span className="text-red-500 dark:text-red-400">*</span>}</label>}
        <div 
          className={`relative w-full ${inputHeights[size] || inputHeights.md} bg-white dark:bg-slate-700/40 border rounded-lg text-slate-800 dark:text-slate-100 transition-all flex items-center ${isDisabled ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700' : 'cursor-pointer border-slate-300 dark:border-slate-500 focus-within:border-indigo-400 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-400/20 hover:border-slate-400 dark:hover:border-slate-400'} ${className}`}
          onClick={() => !isDisabled && setIsOpen(true)}
        >
          {isOpen ? (
            <input
              ref={inputRef} type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={displayValue || placeholder || t('جستجو...', 'Search...')}
              className={`w-full h-full bg-transparent border-none outline-none placeholder:text-slate-400 dark:placeholder:text-slate-400 ${isRtl ? (isXs ? 'pr-2 pl-6' : 'pr-2.5 pl-8') : (isXs ? 'pl-2 pr-6' : 'pl-2.5 pr-8')}`}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          ) : (
            <div className={`w-full h-full flex items-center truncate ${isRtl ? (isXs ? 'pr-2 pl-6' : 'pr-2.5 pl-8') : (isXs ? 'pl-2 pr-6' : 'pl-2.5 pr-8')}`} dir={isRtl ? 'rtl' : 'ltr'}>
              <span className={displayValue ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-400'}>{displayValue || placeholder || t('انتخاب کنید...', 'Select...')}</span>
            </div>
          )}
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? (isXs ? 'left-1.5' : 'left-2.5') : (isXs ? 'right-1.5' : 'right-2.5')} pointer-events-none text-slate-400 dark:text-slate-400`}>
            <ChevronDown size={isXs ? 12 : 14} />
          </div>
        </div>
        
        {isOpen && rect && (
          ReactDOM ? ReactDOM.createPortal(
            <div 
              style={{ position: 'fixed', top: rect.bottom + 4, left: isRtl ? undefined : rect.left, right: isRtl ? (window.innerWidth - rect.right) : undefined, width: containerRef.current ? containerRef.current.offsetWidth : 'auto', zIndex: 999999 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-xl rounded-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            >
              {dropdownContent}
            </div>,
            document.body
          ) : (
            <div className={`absolute top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-xl rounded-lg z-[9999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${isRtl ? 'right-0' : 'left-0'}`}>
              {dropdownContent}
            </div>
          )
        )}
        {error && <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-[10px] font-bold mt-0.5"><AlertCircle size={10} /><span>{error}</span></div>}
      </div>
    );
  };

  const ToggleField = ({ checked, onChange, disabled = false, isRtl = true, label, wrapperClassName = '', formCode }) => {
    const isDisabled = useSecureField(formCode, disabled);
    return (
      <div className={`flex items-center gap-2 ${isDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${wrapperClassName}`} onClick={() => !isDisabled && onChange(!checked)}>
        <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ease-in-out ${checked ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-500'}`}>
          <div className={`absolute top-0.5 w-3 h-3 bg-white dark:bg-slate-100 rounded-full shadow transition-all duration-200 ease-in-out ${checked ? (isRtl ? 'left-0.5' : 'right-0.5') : (isRtl ? 'right-0.5' : 'left-0.5')}`}></div>
        </div>
        {label && <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 select-none">{label}</span>}
      </div>
    );
  };

  const CheckboxField = ({ checked, onChange, disabled = false, label, wrapperClassName = '', formCode }) => {
    const isDisabled = useSecureField(formCode, disabled);
    return (
      <label className={`flex items-center gap-2 ${isDisabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'} ${wrapperClassName}`}>
        <input 
          type="checkbox" 
          checked={checked || false} 
          onChange={(e) => onChange(e.target.checked)} 
          disabled={isDisabled}
          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/40 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:border-slate-300 dark:disabled:border-slate-700"
        />
        {label && <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 select-none">{label}</span>}
      </label>
    );
  };

  const CurrencyField = (props) => {
    const { value, onChange, label, error, size = 'md', isRtl = true, formCode } = props;
    const restProps = Object.assign({}, props);
    ['value', 'onChange', 'label', 'error', 'size', 'isRtl', 'formCode'].forEach(k => delete restProps[k]);

    const format = (v) => {
      if (!v && v !== 0) return '';
      const clean = String(v).replace(/,/g, '');
      return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const handleInputChange = (e) => {
      const raw = e.target.value.replace(/,/g, '');
      if (!isNaN(raw) || raw === '') {
        onChange(raw);
      }
    };

    return (
      <TextField 
        {...restProps} label={label} error={error} size={size} isRtl={isRtl} 
        value={format(value)} onChange={handleInputChange} dir="ltr" formCode={formCode}
      />
    );
  };

  const TextAreaField = (props) => {
    const { label, error, disabled = false, required = false, className = '', id, rows = 3, size = 'md', isRtl = true, formCode } = props;
    const restProps = Object.assign({}, props);
    ['label', 'error', 'disabled', 'required', 'className', 'id', 'rows', 'size', 'isRtl', 'formCode'].forEach(k => delete restProps[k]);

    const isDisabled = useSecureField(formCode, disabled);
    const [generatedId] = useState(() => `textarea-${Math.random().toString(36).substr(2, 9)}`);
    const inputId = id || generatedId;
    return (
      <div className={`flex flex-col gap-1.5 w-full`}>
        {label && <label htmlFor={inputId} className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{label} {required && <span className="text-red-500 dark:text-red-400">*</span>}</label>}
        <textarea
          id={inputId} disabled={isDisabled} rows={rows}
          className={`w-full bg-white dark:bg-slate-700/40 border rounded-lg text-slate-800 dark:text-slate-100 transition-all outline-none p-2.5 text-[14px] placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-700/60 focus:ring-2 ${isDisabled ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'border-slate-300 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-400/20 hover:border-slate-400 dark:hover:border-slate-400'} ${className}`}
          dir={isRtl ? 'rtl' : 'ltr'} {...restProps}
        />
        {error && <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-[10px] font-bold mt-0.5"><AlertCircle size={10} /><span>{error}</span></div>}
      </div>
    );
  };

  const RadioGroup = ({ label, options = [], value, onChange, isRtl = true, inline = true, disabled = false, formCode }) => {
    const isDisabled = useSecureField(formCode, disabled);
    return (
      <div className={`flex flex-col gap-2 ${isDisabled ? 'opacity-70 pointer-events-none' : ''}`}>
        {label && <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{label}</label>}
        <div className={`flex ${inline ? 'flex-row gap-4' : 'flex-col gap-2'}`} dir={isRtl ? 'rtl' : 'ltr'}>
          {options.map((opt) => (
            <label key={opt.value} className={`flex items-center gap-2 group ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <div className="relative flex items-center justify-center">
                <input 
                  type="radio" name={label} value={opt.value} checked={value === opt.value} 
                  onChange={() => !isDisabled && onChange(opt.value)} className="sr-only" disabled={isDisabled}
                />
                <div className={`w-4 h-4 rounded-full border transition-all ${value === opt.value ? 'border-indigo-600 dark:border-indigo-400 bg-white dark:bg-slate-700/40' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700/40 group-hover:border-slate-400 dark:group-hover:border-slate-400'}`}></div>
                {value === opt.value && <div className="absolute w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-in zoom-in-50 duration-200"></div>}
              </div>
              <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 select-none">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const DatePicker = ({ label, value, onChange, isRtl = true, language = 'fa', required = false, size = 'md', disabled = false, id, wrapperClassName = '', formCode }) => {
    const isDisabled = useSecureField(formCode, disabled);
    const getTodayInfo = useCallback((mode) => {
      const today = new Date();
      const gy = today.getFullYear();
      const gm = today.getMonth() + 1;
      const gd = today.getDate();
      if (mode === 'jalali' && g2j) {
        const [jy, jm, jd] = g2j(gy, gm, gd);
        return { y: jy, m: jm, d: jd };
      }
      return { y: gy, m: gm, d: gd };
    }, [g2j]);

    const globalMode = useCalendarMode ? useCalendarMode() : 'jalali';
    const [calendarMode, setCalendarMode] = useState(globalMode);
    const [isOpen, setIsOpen] = useState(false);
    
    useEffect(() => {
      setCalendarMode(globalMode);
    }, [globalMode]);
    
    const initToday = getTodayInfo(calendarMode);
    const [currentMonth, setCurrentMonth] = useState(initToday.m);
    const [currentYear, setCurrentYear] = useState(initToday.y);
    
    const containerRef = useRef(null);
    const [rect, setRect] = useState(null);
    const ReactDOM = window.ReactDOM;
    const [generatedId] = useState(() => `datepicker-${Math.random().toString(36).substr(2, 9)}`);
    const inputId = id || generatedId;
    const inputHeights = { xs: 'h-6 text-[10px]', sm: 'h-8 text-[12px]', md: 'h-10 text-[14px]', lg: 'h-12 text-[14px]' };
    const t = (fa, en) => isRtl ? fa : en;
    const isXs = size === 'xs';

    useEffect(() => {
      const clickOutside = (e) => { 
        if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); 
      };
      document.addEventListener('mousedown', clickOutside);
      return () => document.removeEventListener('mousedown', clickOutside);
    }, []);

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

    useEffect(() => {
      if (value && value.length === 10) {
        const parts = value.split('/');
        if (parts.length === 3) {
          const gy = parseInt(parts[0], 10);
          const gm = parseInt(parts[1], 10);
          const gd = parseInt(parts[2], 10);
          if (calendarMode === 'jalali' && g2j) {
            const [jy, jm, jd] = g2j(gy, gm, gd);
            setCurrentYear(jy);
            setCurrentMonth(jm);
          } else {
            setCurrentYear(gy);
            setCurrentMonth(gm);
          }
        }
      }
    }, [value, calendarMode, g2j]);

    const displayValue = useMemo(() => {
      return formatGlobalDate ? formatGlobalDate(value, calendarMode) : value;
    }, [value, calendarMode, formatGlobalDate]);

    const handleDayClick = (day) => {
      if (calendarMode === 'jalali' && j2g) {
        const [gy, gm, gd] = j2g(currentYear, currentMonth, day);
        onChange(`${gy}/${gm < 10 ? '0'+gm : gm}/${gd < 10 ? '0'+gd : gd}`);
      } else {
        const m = currentMonth < 10 ? `0${currentMonth}` : currentMonth;
        const d = day < 10 ? `0${day}` : day;
        onChange(`${currentYear}/${m}/${d}`);
      }
      setIsOpen(false);
    };

    const handleTodayClick = () => {
      const d = new Date();
      const gy = d.getFullYear();
      const gm = d.getMonth() + 1;
      const gd = d.getDate();
      onChange(`${gy}/${gm < 10 ? '0'+gm : gm}/${gd < 10 ? '0'+gd : gd}`);
      setIsOpen(false);
    };

    const handleOpen = () => {
      if (!isDisabled) {
        if (!value || value.length !== 10) {
          const ti = getTodayInfo(calendarMode);
          setCurrentYear(ti.y);
          setCurrentMonth(ti.m);
        }
        setIsOpen(true);
      }
    };

    const toggleCalendarMode = () => {
      const newMode = calendarMode === 'jalali' ? 'gregorian' : 'jalali';
      if (!value || value.length !== 10) {
         const ti = getTodayInfo(newMode);
         setCurrentYear(ti.y);
         setCurrentMonth(ti.m);
      }
      setCalendarMode(newMode);
    };

    let daysInMonth, firstDayOffset;
    if (calendarMode === 'jalali' && j2g) {
      const isLeap = [1, 5, 9, 13, 17, 22, 26, 30].includes(currentYear % 33);
      daysInMonth = currentMonth <= 6 ? 31 : (currentMonth === 12 ? (isLeap ? 30 : 29) : 30);
      const [gy, gm, gd] = j2g(currentYear, currentMonth, 1);
      const d = new Date(gy, gm - 1, gd).getDay();
      firstDayOffset = (d + 1) % 7; 
    } else {
      daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      firstDayOffset = new Date(currentYear, currentMonth - 1, 1).getDay(); 
    }

    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanksArray = Array.from({ length: firstDayOffset }, (_, i) => i);

    const faDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
    const enDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const faMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const monthName = calendarMode === 'jalali' ? faMonths[currentMonth - 1] : enMonths[currentMonth - 1];
    const weekDays = calendarMode === 'jalali' ? faDays : enDays;

    const ti = getTodayInfo(calendarMode);
    const todayStr = `${ti.y}/${ti.m < 10 ? '0'+ti.m : ti.m}/${ti.d < 10 ? '0'+ti.d : ti.d}`;

    const calendarContent = (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
          <button type="button" onClick={() => { if(currentMonth===1){setCurrentMonth(12); setCurrentYear(currentYear-1)}else setCurrentMonth(currentMonth-1) }} className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm transition-all"><ChevronRight size={14} className={isRtl ? '' : 'rotate-180'} /></button>
          <div className="text-[12px] font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
            <span>{monthName}</span>
            <span className="text-indigo-600 dark:text-indigo-400">{currentYear}</span>
          </div>
          <button type="button" onClick={() => { if(currentMonth===12){setCurrentMonth(1); setCurrentYear(currentYear+1)}else setCurrentMonth(currentMonth+1) }} className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm transition-all"><ChevronLeft size={14} className={isRtl ? '' : 'rotate-180'} /></button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-1" dir={isRtl ? 'rtl' : 'ltr'}>
          {weekDays.map((d, i) => <div key={i} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1" dir={isRtl ? 'rtl' : 'ltr'}>
          {blanksArray.map(b => <div key={`blank-${b}`} className="h-7"></div>)}
          {daysArray.map(day => {
            const dStr = day < 10 ? '0'+day : day;
            const mStr = currentMonth < 10 ? '0'+currentMonth : currentMonth;
            const currentIterDate = calendarMode === 'jalali' && j2g
              ? (() => { const [gy,gm,gd] = j2g(currentYear, currentMonth, day); return `${gy}/${gm<10?'0'+gm:gm}/${gd<10?'0'+gd:gd}`; })()
              : `${currentYear}/${mStr}/${dStr}`;
            const isSelected = value === currentIterDate;
            const isToday = (() => { const d=new Date(); return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`})() === currentIterDate;
            
            let btnClass = 'h-7 w-full rounded flex items-center justify-center text-[12px] font-bold transition-all ';
            if (isSelected) {
              btnClass += 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md';
            } else if (isToday) {
              btnClass += 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
            } else {
              btnClass += 'text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300';
            }

            return (
              <button 
                key={day} type="button" onClick={() => handleDayClick(day)}
                className={btnClass}
              >
                {day}
              </button>
            );
          })}
        </div>
        
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-center">
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); handleTodayClick(); }}
            className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-4 py-1.5 rounded transition-colors w-full border border-indigo-100 dark:border-indigo-800"
          >
            {t('امروز', 'Today')}
          </button>
        </div>
      </div>
    );

    return (
      <div ref={containerRef} className={`flex flex-col ${isXs ? 'gap-0.5' : size === 'sm' ? 'gap-1' : 'gap-1.5'} w-full relative ${isOpen ? 'z-[9999]' : 'z-10'} ${wrapperClassName}`}>
        {label && <label htmlFor={inputId} className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">{label} {required && <span className="text-red-500 dark:text-red-400">*</span>}</label>}
        <div className="relative group flex items-center">
          <div className={`absolute ${isRtl ? (isXs ? 'right-1.5' : 'right-2.5') : (isXs ? 'left-1.5' : 'left-2.5')} text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors pointer-events-none z-10`}>
            <Calendar size={isXs ? 12 : size === 'sm' ? 14 : 16} />
          </div>
          <input 
            id={inputId} type="text" value={displayValue} readOnly disabled={isDisabled}
            onClick={handleOpen}
            placeholder={todayStr}
            className={`w-full ${inputHeights[size] || inputHeights.md} bg-white dark:bg-slate-700/40 border rounded-lg text-slate-800 dark:text-slate-100 transition-all outline-none cursor-pointer focus:bg-white dark:focus:bg-slate-700/60 focus:ring-2 ${isDisabled ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'border-slate-300 dark:border-slate-500 focus:border-indigo-400 dark:focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-400/20 hover:border-slate-400 dark:hover:border-slate-400'} ${isRtl ? (isXs ? 'pr-6 pl-[38px]' : 'pr-8 pl-[60px]') : (isXs ? 'pl-6 pr-[38px]' : 'pl-8 pr-[60px]')} font-sans`}
            dir="ltr"
          />
          <div className={`absolute ${isRtl ? 'left-1' : 'right-1'} flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded p-0.5 z-10`}>
            <button 
              type="button" onClick={(e) => { e.stopPropagation(); toggleCalendarMode(); }}
              className={`rounded ${isXs ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[10px]'} font-black transition-all bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300`}
              title={t('تغییر نوع تقویم', 'Toggle Calendar Mode')}
            >
              {calendarMode === 'jalali' ? 'FA' : 'EN'}
            </button>
          </div>
        </div>

        {isOpen && !isDisabled && rect && (
          ReactDOM ? ReactDOM.createPortal(
            <div 
              style={{ position: 'fixed', top: rect.bottom + 4, left: isRtl ? undefined : rect.left, right: isRtl ? (window.innerWidth - rect.right) : undefined, zIndex: 999999 }}
              className="w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl animate-in zoom-in-95 duration-150"
            >
              {calendarContent}
            </div>,
            document.body
          ) : (
            <div className={`absolute top-full mt-1 ${isRtl ? 'right-0' : 'left-0'} z-[9999] w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl animate-in zoom-in-95 duration-150`}>
              {calendarContent}
            </div>
          )
        )}
      </div>
    );
  };

  const AttachmentManager = ({ files = [], onUpload, onDelete, onDownload, readOnly = false, isUploading = false, language = 'fa', formCode }) => {
    const isReadOnlyMode = useSecureField(formCode, readOnly);
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const [previewFile, setPreviewFile] = useState(null);

    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const Modal = Feedback.Modal || (({children}) => <div className="hidden">{children}</div>);
    const EmptyState = Feedback.EmptyState || (({title}) => <div className="text-center p-4 text-slate-500">{title}</div>);
    const Core = window.DSCore || window.DesignSystem || {};
    const Button = Core.Button || (({children, onClick}) => <button onClick={onClick}>{children}</button>);

    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (!isReadOnlyMode && e.dataTransfer.files?.length > 0) onUpload(Array.from(e.dataTransfer.files)); };
    const handleFileSelect = (e) => { if (e.target.files?.length > 0) onUpload(Array.from(e.target.files)); };

    const formatSize = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getName = (f) => f.file_name || f.name;
    const getSize = (f) => f.file_size || f.size;
    const getType = (f) => f.file_type || f.type;
    const getUrl = (f) => f.file_url || f.url || (f instanceof File ? URL.createObjectURL(f) : '');

    return (
      <div className="flex flex-col gap-3 font-sans w-full h-full" dir={isRtl ? 'rtl' : 'ltr'}>
        {!isReadOnlyMode && (
          <div onDragOver={e => {e.preventDefault(); setIsDragging(true);}} onDragLeave={e => {e.preventDefault(); setIsDragging(false);}} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all shrink-0 ${isDragging ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'}`}>
            <UploadCloud size={24} className={isDragging ? 'text-indigo-600 dark:text-indigo-400 mb-2' : 'text-slate-400 dark:text-slate-500 mb-2'} />
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{isUploading ? t('در حال آپلود...', 'Uploading...') : t('برای انتخاب فایل کلیک کنید یا فایل را اینجا رها کنید', 'Click to select file or drop here')}</span>
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} disabled={isUploading} />
          </div>
        )}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
          {files.length === 0 ? (
              <EmptyState icon={FileText} title={t('هیچ فایلی ضمیمه نشده است.', 'No attachments found.')} />
          ) : files.map((file, idx) => (
            <div key={file.id || idx} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-colors group shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={18} className="text-slate-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">{getName(file)}</span>
                    <span className="text-[10px] text-slate-500">{formatSize(getSize(file))}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" icon={Eye} onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }} className="!p-1.5 text-indigo-600 dark:text-indigo-400" title={t('پیش‌نمایش', 'Preview')} />
                {onDownload && <Button variant="ghost" size="sm" icon={Download} onClick={(e) => { e.stopPropagation(); onDownload(file); }} className="!p-1.5 text-blue-600 dark:text-blue-400" title={t('دانلود', 'Download')} />}
                {!isReadOnlyMode && onDelete && <Button variant="ghost" size="sm" icon={Trash2} onClick={(e) => { e.stopPropagation(); onDelete(file); }} className="!p-1.5 text-red-500 dark:text-red-400" title={t('حذف', 'Delete')} />}
              </div>
            </div>
          ))}
        </div>

        <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} title={previewFile ? getName(previewFile) : ''} language={language} width="max-w-4xl">
            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-b-lg">
                {previewFile && (
                    getType(previewFile)?.startsWith('image/') ? (
                        <img src={getUrl(previewFile)} alt="preview" className="max-w-full max-h-[70vh] object-contain mx-auto rounded shadow-sm" />
                    ) : getType(previewFile) === 'application/pdf' ? (
                        <iframe src={getUrl(previewFile)} className="w-full h-[70vh] border-0 rounded shadow-sm" title="pdf-preview" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[40vh] text-slate-500 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                            <FileText size={48} className="mb-4 opacity-50 text-indigo-400" />
                            <p className="font-bold text-[12px]">{t('پیش‌نمایش برای این نوع فایل پشتیبانی نمی‌شود.', 'Preview not supported for this file type.')}</p>
                            {!isReadOnlyMode && (
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => window.open(getUrl(previewFile), '_blank')}>
                                    {t('دانلود فایل برای مشاهده', 'Download File to View')}
                                </Button>
                            )}
                        </div>
                    )
                )}
            </div>
        </Modal>
      </div>
    );
  };

  const TagInput = ({ tags = [], onAdd, onDelete, placeholder, label, isRtl = true, size = 'md', wrapperClassName = '', disabled = false, formCode }) => {
    const isDisabled = useSecureField(formCode, disabled);
    const [val, setVal] = useState('');
    const handleKeyDown = (e) => { if (e.key === 'Enter' && val && !isDisabled) { onAdd(val); setVal(''); e.preventDefault(); } };
    const minHeights = { xs: 'min-h-[24px]', sm: 'min-h-[32px]', md: 'min-h-[40px]', lg: 'min-h-[48px]' };
    const isXs = size === 'xs';
    
    return (
      <div className={`flex flex-col ${isXs ? 'gap-0.5' : size === 'sm' ? 'gap-1' : 'gap-1.5'} w-full ${wrapperClassName}`}>
        {label && <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{label}</label>}
        <div className={`flex flex-wrap gap-1.5 p-1 bg-white dark:bg-slate-700/40 border rounded-lg transition-all items-center ${minHeights[size] || minHeights.md} ${isDisabled ? 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'border-slate-300 dark:border-slate-500 focus-within:border-indigo-400 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-400/20'}`} dir={isRtl ? 'rtl' : 'ltr'}>
          {tags.map((tag, idx) => (
            <div key={idx} className={`flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-500/30 animate-in zoom-in-90 duration-150 ${isDisabled ? 'opacity-70' : ''}`}>
              <span className="text-[12px] font-bold">{tag}</span>
              {!isDisabled && <button onClick={() => onDelete(idx)} className="text-indigo-400 dark:text-indigo-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"><X size={10} /></button>}
            </div>
          ))}
          {!isDisabled && (
            <input 
              type="text" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[80px] h-6 bg-transparent border-none outline-none text-[12px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 px-1"
            />
          )}
        </div>
      </div>
    );
  };

  const SuffixField = ({ 
    label, error, disabled = false, required = false, wrapperClassName = '', size = 'md', isRtl = true,
    value, onChange, placeholder = '', isCurrency = false,
    unitValue, onUnitChange, unitOptions = [], unitPlaceholder = '', formCode
  }) => {
    const isDisabled = useSecureField(formCode, disabled);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const [rect, setRect] = useState(null);
    const ReactDOM = window.ReactDOM;
    const t = (fa, en) => isRtl ? fa : en;
    const isXs = size === 'xs';

    const selectedOption = unitOptions.find(o => String(o.value) === String(unitValue));
    const displayUnit = selectedOption ? selectedOption.label : '';

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
          setSearchTerm('');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && searchInputRef.current) searchInputRef.current.focus();
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

    const filteredOptions = unitOptions.filter(o => 
      o.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(o.value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const format = (v) => {
      if (!v && v !== 0) return '';
      const clean = String(v).replace(/,/g, '');
      return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const handleValueChange = (e) => {
      if (isCurrency) {
        const raw = e.target.value.replace(/,/g, '');
        if (!isNaN(raw) || raw === '') onChange(raw);
      } else {
        onChange(e.target.value);
      }
    };

    const heights = { xs: 'h-6 text-[10px]', sm: 'h-8 text-[12px]', md: 'h-10 text-[14px]', lg: 'h-12 text-[14px]' };

    const suffixDropdownContent = (
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        {filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (
          <div 
            key={idx} 
            className={`px-3 py-2 text-[12px] cursor-pointer transition-colors ${String(unitValue) === String(opt.value) ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300'}`}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if(onUnitChange) onUnitChange(opt.value);
              setIsOpen(false);
              setSearchTerm('');
            }}
          >
            {opt.label}
          </div>
        )) : (
          <div className="px-3 py-4 text-center text-[12px] text-slate-400 dark:text-slate-500">{t('موردی یافت نشد', 'No results')}</div>
        )}
      </div>
    );

    return (
      <div className={`flex flex-col ${isXs ? 'gap-0.5' : size === 'sm' ? 'gap-1' : 'gap-1.5'} w-full relative ${isOpen ? 'z-[9999]' : 'z-10'} ${wrapperClassName}`}>
        {label && <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">{label} {required && <span className="text-red-500 dark:text-red-400">*</span>}</label>}
        
        <div ref={containerRef} className={`relative flex items-center w-full ${heights[size] || heights.md} bg-white dark:bg-slate-700/40 border rounded-lg text-slate-800 dark:text-slate-100 transition-all ${isDisabled ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'border-slate-300 dark:border-slate-500 focus-within:border-indigo-400 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-400/20 hover:border-slate-400 dark:hover:border-slate-400'}`} dir={isRtl ? 'rtl' : 'ltr'}>
          
          <input
            type="text"
            disabled={isDisabled}
            value={isCurrency ? format(value) : (value || '')}
            onChange={handleValueChange}
            placeholder={placeholder}
            dir={isCurrency || !isRtl ? 'ltr' : 'rtl'}
            className={`flex-1 h-full bg-transparent border-none outline-none px-2.5 w-full min-w-0 ${isDisabled ? 'cursor-not-allowed' : ''}`}
          />

          <div className="w-px h-2/3 bg-slate-200 dark:bg-slate-600 shrink-0"></div>

          <div 
            className={`relative h-full flex items-center justify-between shrink-0 min-w-[90px] md:min-w-[110px] px-2 ${isDisabled ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
            onClick={() => !isDisabled && setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('جستجو...', 'Search...')}
                className="w-full h-full bg-transparent border-none outline-none text-[12px] placeholder:text-slate-400"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`truncate text-[12px] font-bold ${displayUnit ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                {displayUnit || unitPlaceholder || t('واحد...', 'Unit...')}
              </span>
            )}
            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
          </div>

          {isOpen && rect && (
            ReactDOM ? ReactDOM.createPortal(
              <div 
                style={{ position: 'fixed', top: rect.bottom + 4, left: isRtl ? rect.left : undefined, right: isRtl ? undefined : (window.innerWidth - rect.right), zIndex: 999999 }}
                className="w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              >
                {suffixDropdownContent}
              </div>,
              document.body
            ) : (
              <div className={`absolute top-full mt-1 ${isRtl ? 'left-0' : 'right-0'} w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-xl rounded-lg z-[9999] overflow-hidden`}>
                {suffixDropdownContent}
              </div>
            )
          )}
        </div>
        {error && <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-[10px] font-bold mt-0.5"><AlertCircle size={10} /><span>{error}</span></div>}
      </div>
    );
  };

  window.DSForms = {
    TextField, SelectField, ToggleField, CheckboxField, CurrencyField, 
    TextAreaField, RadioGroup, DatePicker, AttachmentManager, TagInput,
    SuffixField
  };

  window.DSCore = window.DSCore || {};
  Object.assign(window.DSCore, window.DSForms);
})();