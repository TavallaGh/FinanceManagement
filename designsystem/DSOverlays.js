/* Filename: DSOverlays.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useRef } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    X = FallbackIcon, 
    ChevronRight = FallbackIcon, 
    ChevronLeft = FallbackIcon 
  } = LucideIcons;

  const Drawer = ({ isOpen, onClose, title, children, position = 'right', width = 'max-w-sm', language = 'fa' }) => {
    const isRtl = language === 'fa';

    useEffect(() => {
      const handleEsc = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
      if (isOpen) document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isRight = position === 'right';
    const slideAnim = isRight ? 'animate-slide-in-right' : 'animate-slide-in-left';
    const placementClasses = isRight ? 'right-0 border-l' : 'left-0 border-r';

    return (
      <div className="fixed inset-0 z-[150] font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="absolute inset-0 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
        <aside 
          className={`absolute top-0 bottom-0 ${width} w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.1)] dark:shadow-[0_0_60px_rgba(0,0,0,0.5)] border-slate-200/60 dark:border-slate-700/60 flex flex-col transition-all duration-300 ${placementClasses} ${slideAnim}`}
        >
          <div className="h-12 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between px-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <h3 className="font-black text-slate-700 dark:text-slate-200 text-[14px] tracking-tight truncate">{title}</h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white dark:bg-slate-800 flex flex-col min-h-0">
            {children}
          </div>
        </aside>
      </div>
    );
  };

  const ContextMenu = ({ items = [], children, language = 'fa' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef(null);
    const isRtl = language === 'fa';

    useEffect(() => {
      const hideMenu = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          setIsVisible(false);
        }
      };
      const handleScroll = () => setIsVisible(false);
      
      if (isVisible) {
        document.addEventListener('mousedown', hideMenu);
        document.addEventListener('scroll', handleScroll, true);
      }
      return () => {
        document.removeEventListener('mousedown', hideMenu);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }, [isVisible]);

    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsVisible(true);
      
      const menuWidth = 180;
      const menuHeight = items.length * 36 + 20;
      
      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
      if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

      setPosition({ x, y });
    };

    return (
      <div onContextMenu={handleContextMenu} className="relative w-full h-full">
        {children}
        {isVisible && (
          <div 
            ref={menuRef}
            style={{ top: position.y, left: position.x }}
            className="fixed z-[9999] w-48 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-xl py-1.5 animate-in fade-in zoom-in-95 duration-150 font-sans"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {items.map((item, idx) => {
              if (item.divider) return <div key={idx} className="h-px bg-slate-100 dark:bg-slate-700/50 my-1 mx-2" />;
              return (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setIsVisible(false); item.onClick?.(); }}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-bold transition-colors ${
                    item.disabled 
                      ? 'opacity-40 cursor-not-allowed text-slate-500 dark:text-slate-400' 
                      : item.variant === 'danger' 
                        ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {item.icon && <item.icon size={14} strokeWidth={2.5} />}
                  <span className="flex-1 text-start truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const Popover = ({ trigger, children, position = 'bottom', language = 'fa' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const popoverRef = useRef(null);
    const triggerRef = useRef(null);
    const isRtl = language === 'fa';

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target) &&
            triggerRef.current && !triggerRef.current.contains(e.target)) {
          setIsVisible(false);
        }
      };
      if (isVisible) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isVisible]);

    const posClasses = {
      top: "bottom-full mb-2 left-1/2 -translate-x-1/2 origin-bottom",
      bottom: "top-full mt-2 left-1/2 -translate-x-1/2 origin-top",
      left: "right-full mr-2 top-1/2 -translate-y-1/2 origin-right",
      right: "left-full ml-2 top-1/2 -translate-y-1/2 origin-left"
    };

    return (
      <div className="relative inline-flex font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <div ref={triggerRef} onClick={() => setIsVisible(!isVisible)} className="cursor-pointer">
          {trigger}
        </div>
        {isVisible && (
          <div 
            ref={popoverRef} 
            className={`absolute z-[100] ${posClasses[position]} bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-2xl p-3 min-w-[200px] animate-in fade-in zoom-in-95 duration-200`}
          >
            {children}
          </div>
        )}
      </div>
    );
  };

  window.DSOverlays = { Drawer, ContextMenu, Popover };
})();
