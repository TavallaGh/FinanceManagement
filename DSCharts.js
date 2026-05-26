/* Filename: DSCharts.js */
(() => {
  const React = window.React;
  const { useMemo, useState } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    Maximize2 = FallbackIcon, 
    Minimize2 = FallbackIcon
  } = LucideIcons;

  const colorMap = {
    indigo: { main: '#4f46e5', light: '#e0e7ff', gradStart: 'rgba(79, 70, 229, 0.2)', gradEnd: 'rgba(79, 70, 229, 0)' },
    emerald: { main: '#10b981', light: '#d1fae5', gradStart: 'rgba(16, 185, 129, 0.2)', gradEnd: 'rgba(16, 185, 129, 0)' },
    rose: { main: '#f43f5e', light: '#ffe4e6', gradStart: 'rgba(244, 63, 94, 0.2)', gradEnd: 'rgba(244, 63, 94, 0)' },
    amber: { main: '#f59e0b', light: '#fef3c7', gradStart: 'rgba(245, 158, 11, 0.2)', gradEnd: 'rgba(245, 158, 11, 0)' },
    sky: { main: '#0ea5e9', light: '#e0f2fe', gradStart: 'rgba(14, 165, 233, 0.2)', gradEnd: 'rgba(14, 165, 233, 0)' },
    purple: { main: '#a855f7', light: '#f3e8ff', gradStart: 'rgba(168, 85, 247, 0.2)', gradEnd: 'rgba(168, 85, 247, 0)' }
  };

  const ChartTooltip = ({ visible, x, y, content }) => {
    if (!visible) return null;
    return (
      <div 
        className="fixed z-[9999] pointer-events-none bg-slate-800 dark:bg-slate-700 text-white text-[12px] font-bold px-3 py-1.5 rounded-lg shadow-xl transform -translate-x-1/2 -translate-y-full mt-[-15px] animate-in fade-in zoom-in-95 duration-150" 
        style={{ left: x, top: y }}
      >
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
      </div>
    );
  };

  const ChartContainer = ({ title, action, isMaximized, setIsMaximized, children, height, isRtl, t }) => {
    const renderHeader = (isMaxMode = false) => {
      if (!title && !action) return null;
      return (
        <div className={`flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-3 shrink-0 ${isMaxMode ? 'h-10 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl' : 'h-10 bg-white dark:bg-slate-800 rounded-t-xl'}`}>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMaximized(!isMaxMode)} 
                className={`p-1 rounded transition-colors ${isMaxMode ? 'text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`} 
                title={isMaxMode ? t('بستن', 'Close') : t('بزرگنمایی', 'Maximize')}
              >
                {isMaxMode ? <Minimize2 size={14} strokeWidth={2.5} /> : <Maximize2 size={14} strokeWidth={2.5} />}
              </button>
              <h3 className="text-[12px] font-black text-slate-800 dark:text-slate-100">{title}</h3>
           </div>
           {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      );
    };

    if (isMaximized) {
      return (
        <div className="w-full flex flex-col font-sans bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700" style={{ height }} dir={isRtl ? 'rtl' : 'ltr'}>
          {renderHeader(false)}
          <div className="flex-1 min-h-0 relative w-full p-4">
            {children}
          </div>
          
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm z-[9900] animate-in fade-in" onClick={() => setIsMaximized(false)} />
          <div className="fixed inset-4 sm:inset-8 z-[9950] bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
            {renderHeader(true)}
            <div className="flex-1 p-4 min-h-0 flex flex-col overflow-hidden w-full h-full relative">
               {children}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-full flex flex-col font-sans bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700" style={{ height }} dir={isRtl ? 'rtl' : 'ltr'}>
         {renderHeader(false)}
         <div className="flex-1 min-h-0 flex flex-col relative w-full p-4">
            {children}
         </div>
      </div>
    );
  };

  const BarChart = ({ title, action, data = [], height = 200, color = 'indigo', language = 'fa', onClick, activeLabel }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
    const [isMaximized, setIsMaximized] = useState(false);
    const theme = colorMap[color] || colorMap.indigo;

    const maxVal = useMemo(() => {
      const max = Math.max(...data.map(d => d.value));
      return isFinite(max) && max > 0 ? max : 1;
    }, [data]);

    return (
      <ChartContainer title={title} action={action} isMaximized={isMaximized} setIsMaximized={setIsMaximized} height={height} isRtl={isRtl} t={t}>
        <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 relative pt-6 pb-2 border-b border-slate-100 dark:border-slate-700 w-full h-full">
          {data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-slate-400 dark:text-slate-500">
              {t('داده‌ای برای نمایش وجود ندارد', 'No data to display')}
            </div>
          ) : data.map((item, idx) => {
            const pct = (item.value / maxVal) * 100;
            const isActive = activeLabel === null || activeLabel === undefined || activeLabel === item.label;
            
            return (
              <div 
                key={idx} 
                className={`relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, content: `${item.label}: ${item.value.toLocaleString()}` })}
                onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '' })}
                onClick={() => onClick && onClick(item)}
              >
                <div 
                  className="w-full max-w-[48px] rounded-t-sm transition-all duration-500 ease-out hover:brightness-110 mx-auto"
                  style={{ height: `${pct}%`, backgroundColor: theme.main }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between gap-1 sm:gap-2 pt-2 h-6 shrink-0">
          {data.map((item, idx) => (
            <div key={idx} className={`flex-1 text-center truncate text-[10px] font-bold transition-colors ${activeLabel === item.label ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {item.label}
            </div>
          ))}
        </div>
        <ChartTooltip {...tooltip} />
      </ChartContainer>
    );
  };

  const LineChart = ({ title, action, data = [], height = 200, color = 'indigo', language = 'fa', onClick, activeLabel }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const theme = colorMap[color] || colorMap.indigo;
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
    const [isMaximized, setIsMaximized] = useState(false);

    const maxVal = useMemo(() => {
      const max = Math.max(...data.map(d => d.value));
      return isFinite(max) && max > 0 ? max : 1;
    }, [data]);
    
    const minVal = useMemo(() => {
      const min = Math.min(0, ...data.map(d => d.value));
      return isFinite(min) ? min : 0;
    }, [data]);

    const range = maxVal - minVal;
    
    const getPoints = () => {
      const padding = range === 0 ? 10 : range * 0.15;
      const paddedMin = minVal >= 0 ? 0 : minVal - padding; 
      const paddedMax = maxVal + padding;
      const paddedRange = paddedMax - paddedMin;

      return data.map((d, i) => {
        const x = data.length <= 1 ? 50 : (i / (data.length - 1)) * 100;
        const y = paddedRange === 0 ? 50 : 100 - (((d.value - paddedMin) / paddedRange) * 100);
        return { x, y, d };
      });
    };

    const renderPath = () => {
      if (data.length === 0) return '';
      const points = getPoints();
      
      let path = `M ${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const ctrlX = (current.x + next.x) / 2;
        path += ` C ${ctrlX},${current.y} ${ctrlX},${next.y} ${next.x},${next.y}`;
      }
      return path;
    };

    const renderArea = () => {
      if (data.length === 0) return '';
      const points = getPoints();
      const path = renderPath();
      return `${path} L ${points[points.length - 1].x},100 L ${points[0].x},100 Z`;
    };

    return (
      <ChartContainer title={title} action={action} isMaximized={isMaximized} setIsMaximized={setIsMaximized} height={height} isRtl={isRtl} t={t}>
        <div className="flex-1 relative w-full h-full mb-6">
          {data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-slate-400 dark:text-slate-500">
              {t('داده‌ای برای نمایش وجود ندارد', 'No data to display')}
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="-2 -2 104 104">
                <defs>
                  <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={theme.gradStart} />
                    <stop offset="100%" stopColor={theme.gradEnd} />
                  </linearGradient>
                </defs>
                <path d={renderArea()} fill={`url(#grad-${color})`} vectorEffect="non-scaling-stroke" className="animate-in fade-in duration-1000" />
                <path d={renderPath()} fill="none" stroke={theme.main} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" className="drop-shadow-sm animate-in slide-in-from-left duration-1000" />
              </svg>
              
              {getPoints().map((pt, i) => {
                const isActive = activeLabel === null || activeLabel === undefined || activeLabel === pt.d.label;
                return (
                  <div 
                    key={i} 
                    className={`absolute w-3 h-3 -ml-[6px] -mt-[6px] rounded-full cursor-pointer z-10 transition-all duration-300 ${isActive ? 'opacity-100 hover:scale-150' : 'opacity-40'}`}
                    style={{
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      backgroundColor: theme.main,
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                    }}
                    onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, content: `${pt.d.label}: ${pt.d.value.toLocaleString()}`, label: pt.d.label })}
                    onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '', label: null })}
                    onClick={() => onClick && onClick(pt.d)}
                  />
                );
              })}
            </div>
          )}
        </div>
        
        <div className="flex justify-between w-full absolute bottom-0 left-0 right-0 h-4 px-1 shrink-0 pointer-events-none">
          {data.map((item, idx) => {
            const isEdgeOrMiddle = idx === 0 || idx === data.length - 1 || idx === Math.floor(data.length / 2);
            if (isEdgeOrMiddle) {
               return <span key={idx} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">{item.label}</span>;
            }
            return <span key={idx} className="w-4"></span>;
          })}
        </div>
        <ChartTooltip {...tooltip} />
      </ChartContainer>
    );
  };

  const DonutChart = ({ title, action, data = [], height = 200, language = 'fa', onClick, activeLabel }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
    const [isMaximized, setIsMaximized] = useState(false);
    const themeMode = window.DSCore?.useTheme ? window.DSCore.useTheme() : 'light';
    
    const colors = [colorMap.indigo.main, colorMap.emerald.main, colorMap.amber.main, colorMap.sky.main, colorMap.purple.main, colorMap.rose.main];
    const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);
    
    let cumulativePercent = 0;
    const segments = data.map((d, i) => {
      const percent = total === 0 ? 0 : (d.value / total) * 100;
      const strokeDasharray = `${percent} ${100 - percent}`;
      const strokeDashoffset = 100 - cumulativePercent;
      cumulativePercent += percent;
      return { ...d, percent, strokeDasharray, strokeDashoffset, color: colors[i % colors.length] };
    });

    const hoveredSeg = tooltip.visible ? segments.find(s => s.label === tooltip.label) : null;

    return (
      <ChartContainer title={title} action={action} isMaximized={isMaximized} setIsMaximized={setIsMaximized} height={height} isRtl={isRtl} t={t}>
        <div className={`w-full h-full flex items-center justify-center gap-6 relative ${isMaximized ? 'flex-col sm:flex-row' : ''}`}>
          <div className={`relative aspect-square shrink-0 ${isMaximized ? 'w-[250px] h-[250px]' : 'h-full max-h-full max-w-full'}`}>
            {data.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-slate-400 dark:text-slate-500 border-4 border-slate-100 dark:border-slate-700 rounded-full">
                {t('بدون داده', 'No data')}
              </div>
            ) : (
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 transform">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke={themeMode === 'dark' ? '#334155' : '#f1f5f9'} strokeWidth="4" />
                {segments.map((seg, i) => {
                  const isActive = activeLabel === null || activeLabel === undefined || activeLabel === seg.label;
                  return (
                    <circle 
                      key={i} cx="18" cy="18" r="15.915" fill="transparent" 
                      stroke={seg.color} strokeWidth={tooltip.label === seg.label ? "5" : "4"} 
                      strokeDasharray={seg.strokeDasharray} strokeDashoffset={seg.strokeDashoffset} 
                      className={`transition-all duration-300 cursor-pointer origin-center ${isActive ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                      onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, content: `${seg.label}: ${seg.value.toLocaleString()} (${seg.percent.toFixed(1)}%)`, label: seg.label })}
                      onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '', label: null })}
                      onClick={() => onClick && onClick(seg)}
                    />
                  );
                })}
              </svg>
            )}
            {data.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-[12px] text-slate-400 dark:text-slate-500 font-bold">{hoveredSeg ? hoveredSeg.label : t('مجموع', 'Total')}</span>
                 <span className="text-[14px] font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
                   {hoveredSeg ? hoveredSeg.value.toLocaleString() : total.toLocaleString()}
                 </span>
              </div>
            )}
          </div>

          <div className={`flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 py-2 ${isMaximized ? 'w-[250px] h-[250px]' : 'h-full max-w-[120px]'}`}>
            {segments.map((seg, i) => {
              const isActive = activeLabel === null || activeLabel === undefined || activeLabel === seg.label;
              return (
                <div 
                  key={i} 
                  className={`flex items-center gap-2 cursor-pointer transition-all ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                  onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, content: `${seg.label}: ${seg.value.toLocaleString()} (${seg.percent.toFixed(1)}%)`, label: seg.label })}
                  onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '', label: null })}
                  onClick={() => onClick && onClick(seg)}
                >
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }}></div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">{seg.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{seg.percent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <ChartTooltip {...tooltip} />
        </div>
      </ChartContainer>
    );
  };

  const PieChart = ({ title, action, data = [], height = 200, language = 'fa', onClick, activeLabel }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
    const [isMaximized, setIsMaximized] = useState(false);
    
    const colors = [colorMap.sky.main, colorMap.rose.main, colorMap.emerald.main, colorMap.amber.main, colorMap.indigo.main, colorMap.purple.main];
    const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);
    
    let cumulativePercent = 0;
    const segments = data.map((d, i) => {
      const percent = total === 0 ? 0 : (d.value / total) * 100;
      const strokeDasharray = `${percent} ${100 - percent}`;
      const strokeDashoffset = 100 - cumulativePercent;
      cumulativePercent += percent;
      return { ...d, percent, strokeDasharray, strokeDashoffset, color: colors[i % colors.length] };
    });

    return (
      <ChartContainer title={title} action={action} isMaximized={isMaximized} setIsMaximized={setIsMaximized} height={height} isRtl={isRtl} t={t}>
        <div className={`w-full h-full flex items-center justify-center gap-6 relative ${isMaximized ? 'flex-col sm:flex-row' : ''}`}>
          <div className={`relative aspect-square shrink-0 ${isMaximized ? 'w-[250px] h-[250px]' : 'h-full max-h-full max-w-full'}`}>
            {data.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-full">
                {t('بدون داده', 'No data')}
              </div>
            ) : (
              <svg viewBox="0 0 31.83 31.83" className="w-full h-full -rotate-90 transform rounded-full">
                {segments.map((seg, i) => {
                  const isActive = activeLabel === null || activeLabel === undefined || activeLabel === seg.label;
                  return (
                    <circle 
                      key={i} cx="15.915" cy="15.915" r="7.9575" fill="transparent" 
                      stroke={seg.color} strokeWidth="15.915" 
                      strokeDasharray={seg.strokeDasharray} strokeDashoffset={seg.strokeDashoffset} 
                      className={`transition-all duration-300 cursor-pointer origin-center ${isActive ? 'opacity-100 hover:brightness-110' : 'opacity-30 hover:opacity-70'}`}
                      onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, content: `${seg.label}: ${seg.value.toLocaleString()} (${seg.percent.toFixed(1)}%)`, label: seg.label })}
                      onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '', label: null })}
                      onClick={() => onClick && onClick(seg)}
                    />
                  );
                })}
              </svg>
            )}
          </div>

          <div className={`flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 py-2 ${isMaximized ? 'w-[250px] h-[250px]' : 'h-full max-w-[120px]'}`}>
            {segments.map((seg, i) => {
              const isActive = activeLabel === null || activeLabel === undefined || activeLabel === seg.label;
              return (
                <div 
                  key={i} 
                  className={`flex items-center gap-2 cursor-pointer transition-all ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                  onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, content: `${seg.label}: ${seg.value.toLocaleString()} (${seg.percent.toFixed(1)}%)`, label: seg.label })}
                  onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '', label: null })}
                  onClick={() => onClick && onClick(seg)}
                >
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }}></div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">{seg.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{seg.percent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <ChartTooltip {...tooltip} />
        </div>
      </ChartContainer>
    );
  };

  const GaugeChart = ({ title, action, value = 0, min = 0, max = 100, label = '', height = 160, color = 'indigo', language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const theme = colorMap[color] || colorMap.indigo;
    const themeMode = window.DSCore?.useTheme ? window.DSCore.useTheme() : 'light';
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
    const [isMaximized, setIsMaximized] = useState(false);

    const safeValue = Math.min(Math.max(value, min), max);
    const range = max - min;
    const percent = range === 0 ? 0 : ((safeValue - min) / range) * 100;
    
    const R = 40;
    const C = Math.PI * R;
    const dashValue = (percent / 100) * C;

    return (
      <ChartContainer title={title} action={action} isMaximized={isMaximized} setIsMaximized={setIsMaximized} height={height} isRtl={isRtl} t={t}>
        <div className="w-full h-full flex flex-col items-center justify-center font-sans relative">
          <div 
            className={`relative w-full ${isMaximized ? 'max-w-[400px]' : 'h-full flex items-end justify-center'}`} 
            onMouseMove={(e) => setTooltip({ visible: true, x: e.clientX, y: e.clientY, content: `${label}: ${safeValue.toLocaleString()}` })}
            onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '' })}
          >
            <svg viewBox="0 0 100 55" className={`w-full ${!isMaximized ? 'max-h-full' : ''} overflow-visible`}>
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={themeMode === 'dark' ? '#334155' : '#f1f5f9'} strokeWidth="12" strokeLinecap="round" />
              <path 
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke={theme.main} 
                strokeWidth="12" 
                strokeLinecap="round" 
                strokeDasharray={`${dashValue} ${C}`} 
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-2 pointer-events-none">
              <span className={`${isMaximized ? 'text-[32px]' : 'text-[20px]'} font-black text-slate-800 dark:text-slate-100 tracking-tight transition-all`}>
                {safeValue.toLocaleString()}
              </span>
              {label && <span className={`${isMaximized ? 'text-[14px]' : 'text-[10px]'} font-bold text-slate-400 dark:text-slate-500 mt-1 transition-all`}>{label}</span>}
            </div>
            <div className={`absolute bottom-1 left-2 ${isMaximized ? 'text-[12px]' : 'text-[10px]'} font-bold text-slate-400 dark:text-slate-500 pointer-events-none transition-all`}>{min}</div>
            <div className={`absolute bottom-1 right-2 ${isMaximized ? 'text-[12px]' : 'text-[10px]'} font-bold text-slate-400 dark:text-slate-500 pointer-events-none transition-all`}>{max}</div>
          </div>
          <ChartTooltip {...tooltip} />
        </div>
      </ChartContainer>
    );
  };

  window.DSCharts = { BarChart, LineChart, DonutChart, PieChart, GaugeChart };
})();