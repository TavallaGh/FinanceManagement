/* Filename: security/SystemLog.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    History = FallbackIcon, Clock = FallbackIcon, Calendar = FallbackIcon, User = FallbackIcon, 
    Database = FallbackIcon, Eye = FallbackIcon, RefreshCw = FallbackIcon,
    Hash = FallbackIcon
  } = LucideIcons;

  const SystemLog = ({ language = 'fa' }) => {
    const FallbackComponent = () => null;
    const Core = window.DSCore || window.DesignSystem || {};
    const { 
      Button = FallbackComponent, PageHeader = FallbackComponent, Badge = FallbackComponent 
    } = Core;
    
    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent, AdvancedFilter = FallbackComponent } = Grid;
    
    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent, DiffViewer = FallbackComponent } = Feedback;

    const formatGlobalDate = Core.formatGlobalDate || ((v) => v);
    const useCalendarMode = Core.useCalendarMode || (() => 'jalali');

    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const globalCalendarMode = useCalendarMode();

    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({});
    const [gridState, setGridState] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'info' });
    
    const [selectedLog, setSelectedLog] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const supabase = window.supabase;

    const showToast = useCallback((message, type = 'info') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        if (!supabase) throw new Error("Supabase is not initialized");
        const { data, error } = await supabase
          .from('fm_record_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(5000);
          
        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error("Fetch logs error:", err);
        showToast(t('خطا در دریافت لاگ‌های سیستم', 'Error fetching system logs'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchLogs();
    }, []);

    const getEntityLabel = useCallback((entity) => {
        const labels = {
            'fm_currencies': t('تنظیمات ارزها', 'Currencies'),
            'fm_currency_rates': t('سوابق نرخ ارزها', 'Currency Rates'),
            'fm_record_logs': t('لاگ سیستم', 'System Logs'),
            'menus': t('منوهای سیستم', 'System Menus'),
            'users': t('کاربران', 'Users'),
            'parties': t('اشخاص و شرکت‌ها', 'Parties & Companies'),
            'fm_org_charts': t('چارت‌های سازمانی', 'Organization Charts'),
            'sec_roles': t('نقش‌های امنیتی', 'Security Roles')
        };
        return labels[entity] || entity;
    }, [t]);

    const getActionType = useCallback((actionStr) => {
        if (!actionStr) return 'OTHER';
        const act = String(actionStr).toUpperCase().trim();
        if (act.includes('CREATE') || act.includes('ایجاد')) return 'CREATE';
        if (act.includes('UPDATE') || act.includes('ویرایش')) return 'UPDATE';
        if (act.includes('DELETE') || act.includes('حذف')) return 'DELETE';
        return 'OTHER';
    }, []);

    const getActionBadge = useCallback((action) => {
        const type = getActionType(action);
        if (type === 'CREATE') return <Badge variant="emerald" size="sm" className="w-16 justify-center shadow-sm">{t('ایجاد', 'CREATE')}</Badge>;
        if (type === 'UPDATE') return <Badge variant="slate" size="sm" className="w-16 justify-center shadow-sm">{t('ویرایش', 'UPDATE')}</Badge>;
        if (type === 'DELETE') return <Badge variant="danger" size="sm" className="w-16 justify-center shadow-sm">{t('حذف', 'DELETE')}</Badge>;
        return <Badge variant="slate" size="sm" className="w-16 justify-center shadow-sm">{action}</Badge>;
    }, [t, getActionType]);

    const getFieldLabel = useCallback((key) => {
        const labels = {
          code: t('کد', 'Code'),
          title: t('عنوان', 'Title'),
          name: t('نام', 'Name'),
          first_name: t('نام', 'First Name'),
          last_name: t('نام خانوادگی', 'Last Name'),
          company_name: t('نام شرکت', 'Company Name'),
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
          id: t('شناسه رکورد', 'Record ID'),
          description: t('توضیحات', 'Description'),
          party_type: t('نوع موجودیت', 'Entity Type'),
          roles: t('نقش‌ها', 'Roles'),
          national_id: t('شناسه/کد ملی', 'National ID'),
          mobile: t('موبایل', 'Mobile')
        };
        return labels[key] || key;
    }, [t]);

    const filteredLogs = useMemo(() => {
        let result = [...logs];
        
        if (filters.entity_type) {
            result = result.filter(r => r.entity_type === filters.entity_type);
        }
        if (filters.fromDate) {
            const fromDateHyphen = filters.fromDate.replace(/\//g, '-');
            result = result.filter(r => {
                const dateStr = new Date(r.timestamp).toISOString().split('T')[0];
                return dateStr >= fromDateHyphen;
            });
        }
        if (filters.toDate) {
            const toDateHyphen = filters.toDate.replace(/\//g, '-');
            result = result.filter(r => {
                const dateStr = new Date(r.timestamp).toISOString().split('T')[0];
                return dateStr <= toDateHyphen;
            });
        }
        if (filters.changed_field) {
            const term = filters.changed_field.toLowerCase();
            result = result.filter(r => {
                if ((r.details || '').toLowerCase().includes(term)) return true;
                
                const type = getActionType(r.action);
                
                if (type === 'UPDATE' && r.old_data && r.new_data) {
                    for (const key of Object.keys(r.new_data)) {
                        if (['updated_at', 'updated_by', 'created_at', 'created_by'].includes(key)) continue;
                        const oldVal = r.old_data[key];
                        const newVal = r.new_data[key];
                        
                        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                            if (getFieldLabel(key).toLowerCase().includes(term) || key.toLowerCase().includes(term)) return true;
                            if (oldVal !== null && oldVal !== undefined && String(oldVal).toLowerCase().includes(term)) return true;
                            if (newVal !== null && newVal !== undefined && String(newVal).toLowerCase().includes(term)) return true;
                        }
                    }
                } else if (type === 'CREATE' && r.new_data) {
                    for (const [key, val] of Object.entries(r.new_data)) {
                        if (['updated_at', 'updated_by', 'created_at', 'created_by'].includes(key)) continue;
                        if (getFieldLabel(key).toLowerCase().includes(term) || key.toLowerCase().includes(term)) return true;
                        if (val !== null && val !== undefined && String(val).toLowerCase().includes(term)) return true;
                    }
                } else if (type === 'DELETE' && r.old_data) {
                    for (const [key, val] of Object.entries(r.old_data)) {
                        if (['updated_at', 'updated_by', 'created_at', 'created_by'].includes(key)) continue;
                        if (getFieldLabel(key).toLowerCase().includes(term) || key.toLowerCase().includes(term)) return true;
                        if (val !== null && val !== undefined && String(val).toLowerCase().includes(term)) return true;
                    }
                }
                
                return false;
            });
        }
        
        return result;
    }, [logs, filters, getFieldLabel, getActionType]);

    const uniqueEntities = useMemo(() => {
        const entities = new Set(logs.map(l => l.entity_type).filter(Boolean));
        return Array.from(entities).map(e => ({ value: e, label: getEntityLabel(e) }));
    }, [logs, getEntityLabel]);

    const viewConfig = {
      pageId: 'system_logs_main',
      currentState: () => ({ filters, gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.filters) setFilters(state.filters);
          if (state.gridState) setGridState(state.gridState);
        } else {
          setFilters({});
          setGridState(null);
        }
      }
    };

    const columns = [
      { 
        field: 'timestamp', header_fa: 'تاریخ و زمان', header_en: 'Date & Time', width: '150px', 
        render: (v) => {
          if (!v) return '';
          const d = new Date(v);
          const formattedDate = formatGlobalDate ? formatGlobalDate(v, globalCalendarMode) : d.toISOString().split('T')[0].replace(/-/g, '/');
          return (
             <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
               <Calendar size={12} className="text-slate-400 dark:text-slate-500" />
               <span className="font-mono text-[12px] font-medium" dir="ltr">{formattedDate}</span>
               <Clock size={12} className="text-slate-400 dark:text-slate-500 ml-1" />
               <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600" dir="ltr">
                  {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
               </span>
             </div>
          );
        }
      },
      { 
        field: 'action', header_fa: 'عملیات', header_en: 'Action', width: '90px', 
        searchAccessor: (v) => {
            const type = getActionType(v);
            if (type === 'CREATE') return t('ایجاد', 'CREATE');
            if (type === 'UPDATE') return t('ویرایش', 'UPDATE');
            if (type === 'DELETE') return t('حذف', 'DELETE');
            return v;
        },
        render: (v) => getActionBadge(v) 
      },
      { 
        field: 'user_name', header_fa: 'کاربر', header_en: 'User', width: '130px', 
        render: (v) => (
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                    <User size={10} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[12px] text-slate-700 dark:text-slate-200 truncate">{v}</span>
            </div>
        )
      },
      { 
        field: 'entity_type', header_fa: 'موجودیت (بخش)', header_en: 'Entity Module', width: '140px', 
        searchAccessor: (v) => getEntityLabel(v),
        render: (v) => (
            <div className="flex items-center gap-1.5">
                <Database size={12} className="text-slate-400 dark:text-slate-500" />
                <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{getEntityLabel(v)}</span>
            </div>
        )
      },
      { 
        field: 'record_id', header_fa: 'شناسه رکورد', header_en: 'Record ID', width: '110px', 
        render: (v) => (
            <div className="flex items-center gap-1">
               <Hash size={10} className="text-slate-400" />
               <span className="text-[12px] font-mono text-slate-600 dark:text-slate-400 truncate max-w-[80px]" title={v}>{v}</span>
            </div>
        )
      },
      { 
        field: 'details', header_fa: 'شرح جزئیات', header_en: 'Details', width: 'auto', minWidth: '250px',
        render: (v) => <span className="text-[12px] text-slate-600 dark:text-slate-400 truncate block w-full" title={v}>{v || '-'}</span> 
      }
    ];

    const formatValue = (val) => {
        if (val === null || val === undefined || val === '') return t('خالی', 'Empty');
        if (typeof val === 'boolean') return val ? t('بله (فعال)', 'Yes (Active)') : t('خیر (غیرفعال)', 'No (Inactive)');
        if (Array.isArray(val)) return val.length ? val.join('، ') : t('بدون مقدار', 'No Value');
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    const renderLogDetails = () => {
        if (!selectedLog) return null;
        
        const type = getActionType(selectedLog.action);
        const d = new Date(selectedLog.timestamp);
        const formattedDate = formatGlobalDate ? formatGlobalDate(selectedLog.timestamp, globalCalendarMode) : d.toISOString().split('T')[0];
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        return (
            <div className="flex flex-col p-4 font-sans gap-4 w-full">
                <div className="flex flex-wrap items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-2.5">
                        {getActionBadge(selectedLog.action)}
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">{selectedLog.user_name}</span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"><Database size={12}/> {getEntityLabel(selectedLog.entity_type)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[10.5px] font-mono font-medium" dir="ltr">
                        <div className="flex items-center gap-1.5"><Calendar size={12} /> <span>{formattedDate}</span></div>
                        <div className="flex items-center gap-1.5"><Clock size={12} /> <span>{timeStr}</span></div>
                    </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('شناسه رکورد:', 'Record ID:')} {selectedLog.record_id}</div>

                {selectedLog.details && (
                    <div className="text-[11.5px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 leading-relaxed font-medium w-full">
                        {selectedLog.details}
                    </div>
                )}
                
                <div className="mt-2 w-full">
                    <DiffViewer 
                        oldData={selectedLog.old_data} 
                        newData={selectedLog.new_data} 
                        actionType={type} 
                        getFieldLabel={getFieldLabel} 
                        formatValue={formatValue} 
                        language={language} 
                    />
                </div>
            </div>
        );
    };

    return (
      <div className="p-4 h-full flex flex-col font-sans bg-slate-50/50 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('مدیریت لاگ‌های سیستم', 'System Logs Management')}
          icon={History} language={language}
          breadcrumbs={[{ label: t('حقوق دسترسی', 'Access Rights') }, { label: t('لاگ‌ها', 'Logs') }]}
          viewConfig={viewConfig}
        >
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchLogs} className="shadow-sm bg-white dark:bg-slate-800">
                {t('بروزرسانی داده‌ها', 'Refresh Data')}
            </Button>
        </PageHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-500">
            <AdvancedFilter 
                fields={[
                  { name: 'entity_type', label: t('موجودیت', 'Entity'), type: 'select', options: uniqueEntities },
                  { name: 'fromDate', label: t('از تاریخ', 'From Date'), type: 'date' },
                  { name: 'toDate', label: t('تا تاریخ', 'To Date'), type: 'date' },
                  { name: 'changed_field', label: t('فیلد/مقدار تغییر یافته', 'Changed Field/Value'), type: 'text' }
                ]}
                initialValues={filters}
                onFilter={setFilters}
                onClear={() => setFilters({})}
                language={language}
            />
            
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-b-2xl md:rounded-b-none md:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 h-full">
                        <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                        <span className="text-slate-500 dark:text-slate-400 font-bold text-[12px]">{t('در حال دریافت اطلاعات لاگ...', 'Loading logs data...')}</span>
                    </div>
                ) : (
                    <DataGrid 
                        data={filteredLogs} 
                        columns={columns} 
                        language={language}
                        selectable={false}
                        gridState={gridState}
                        onGridStateChange={setGridState}
                        hideImport={true}
                        actions={[
                            { 
                                icon: Eye, 
                                tooltip: t('مشاهده جزئیات دقیق', 'View Detailed Info'), 
                                onClick: (row) => { setSelectedLog(row); setIsDetailModalOpen(true); }, 
                                className: 'text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-lg' 
                            }
                        ]}
                        onRowDoubleClick={(row) => { setSelectedLog(row); setIsDetailModalOpen(true); }}
                    />
                )}
            </div>
        </div>

        <Modal 
            isOpen={isDetailModalOpen} 
            onClose={() => setIsDetailModalOpen(false)} 
            title={t('جزئیات دقیق تغییرات رکورد', 'Detailed Record Changes')} 
            language={language} 
            width="max-w-3xl"
        >
            {renderLogDetails()}
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  window.SystemLog = SystemLog;
})();