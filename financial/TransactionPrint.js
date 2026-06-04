/* Filename: financial/TransactionPrint.js */
(() => {
    const React = window.React;
    const { useState, useEffect, useRef } = React;

    const safeGet = (name) => {
        const spaces = [window.DSCore, window.DSForms, window.DSGrid, window.DSOverlays, window.DSFeedback, window.DesignSystem];
        for (let s of spaces) {
            if (s && s[name]) {
                let c = s[name];
                if (c.default) c = c.default;
                if (typeof c === 'function' || (c && typeof c === 'object' && c.$$typeof)) return c;
            }
        }
        return null;
    };

    const SafePrinterIcon = ({ size = 16, className = '' }) => (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
    );

    const SafeSettingsIcon = ({ size = 16, className = '' }) => (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
    );

    const SafeFileTextIcon = ({ size = 16, className = '' }) => (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
    );

    const SafeChevronRightIcon = ({ size = 16, className = '' }) => (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
    );

    const SafeChevronLeftIcon = ({ size = 16, className = '' }) => (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
    );

    const Card = safeGet('Card') || (({ children, className }) => <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden ${className || ''}`}>{children}</div>);
    
    const CardHeader = safeGet('CardHeader') || (({ title, icon: Icon, action }) => (
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 font-bold flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 text-sm text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-2">
                {Icon && (typeof Icon === 'function' ? <Icon size={16} className="text-slate-500" /> : Icon)}
                {title}
            </div>
            {action && <div>{action}</div>}
        </div>
    ));

    const CardBody = safeGet('CardBody') || (({ children, className }) => <div className={`p-3 flex-1 ${className || ''}`}>{children}</div>);
    
    const Flex = safeGet('Flex') || (({ children, direction = 'row', gap = 'md', align = 'stretch', justify = 'start', className = '' }) => {
        const gapCls = gap === 'xs' ? 'gap-1' : gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4';
        const dirCls = direction === 'col' ? 'flex-col' : 'flex-row';
        const alignCls = align === 'center' ? 'items-center' : align === 'start' ? 'items-start' : align === 'end' ? 'items-end' : 'items-stretch';
        const justCls = justify === 'center' ? 'justify-center' : justify === 'between' ? 'justify-between' : justify === 'end' ? 'justify-end' : 'justify-start';
        return <div className={`flex ${dirCls} ${gapCls} ${alignCls} ${justCls} ${className}`}>{children}</div>;
    });

    const Text = safeGet('Text') || (({ children, variant = 'body', weight = 'normal', color = 'default', className = '' }) => {
        let cls = 'text-xs text-slate-700 dark:text-slate-300';
        if (variant === 'h1') cls = 'text-xl font-extrabold text-slate-900 dark:text-white';
        if (variant === 'h2') cls = 'text-lg font-bold text-slate-900 dark:text-white';
        if (variant === 'caption') cls = 'text-[11px] text-slate-500 dark:text-slate-400';
        if (weight === 'bold') cls += ' font-bold';
        if (weight === 'medium') cls += ' font-medium';
        if (color === 'primary') cls += ' text-indigo-600 dark:text-indigo-400';
        if (color === 'secondary') cls += ' text-slate-500 dark:text-slate-400';
        if (color === 'danger') cls += ' text-red-600 dark:text-red-400';
        return <span className={`${cls} ${className}`}>{children}</span>;
    });

    const Button = safeGet('Button') || (({ children, onClick, disabled, fullWidth, icon: Icon, variant = 'primary', size = 'md', className = '' }) => {
        let baseCls = "flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 outline-none";
        if (size === 'sm') baseCls += " py-1.5 px-3 text-xs";
        else baseCls += " py-2 px-4 text-sm";
        
        let varCls = "bg-indigo-600 text-white hover:bg-indigo-700";
        if (variant === 'outline') varCls = "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800";
        if (variant === 'ghost') varCls = "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800";
        
        return (
            <button onClick={onClick} disabled={disabled} className={`${baseCls} ${varCls} ${fullWidth ? 'w-full' : ''} ${className}`}>
                {Icon && (typeof Icon === 'function' ? <Icon size={size === 'sm' ? 14 : 16} /> : Icon)}
                {children}
            </button>
        );
    });

    const Badge = safeGet('Badge') || (({ children, variant = 'primary' }) => {
        const colors = {
            success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
            warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
            primary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
        };
        return <span className={`px-2 py-0.5 text-[11px] font-bold border rounded-md whitespace-nowrap ${colors[variant] || colors.primary}`}>{children}</span>;
    });

    const Divider = safeGet('Divider') || (({ margin = 'md', className = '' }) => {
        const my = margin === 'sm' ? 'my-2' : margin === 'lg' ? 'my-6' : 'my-4';
        return <hr className={`border-slate-200 dark:border-slate-700 w-full ${my} ${className}`} />;
    });

    let Modal = safeGet('Modal');
    if (!Modal) {
        Modal = ({ isOpen, onClose, title, children, size, width }) => {
            if (!isOpen) return null;
            const wCls = width || (size === 'xl' ? 'max-w-[1200px]' : 'max-w-[800px]');
            return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 ${wCls}`}>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                            <button onClick={onClose} className="text-slate-500 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">✕</button>
                        </div>
                        <div className="p-0 flex-1 overflow-auto max-h-[90vh] bg-slate-100/50 dark:bg-slate-900 flex">{children}</div>
                    </div>
                </div>
            );
        };
    }

    const Checkbox = safeGet('Checkbox') || (({ label, checked, onChange }) => (
        <label className="flex items-center gap-2 text-xs cursor-pointer group">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
            <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</span>
        </label>
    ));

    const Select = safeGet('Select') || (({ label, options, value, onChange, fullWidth }) => (
        <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}`}>
            {label && <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{label}</label>}
            <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    ));

    let Table = safeGet('Table') || safeGet('DataGrid');
    if (!Table) {
        Table = ({ columns, data, striped }) => (
            <div className="w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <table className="w-full text-xs text-left rtl:text-right border-collapse">
                    <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/80 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            {columns.map((c, i) => <th key={i} className="px-3 py-2 whitespace-nowrap" style={{ width: c.width }}>{c.header}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} className={`border-b dark:border-slate-700/50 last:border-0 ${striped && i % 2 !== 0 ? 'bg-slate-50/50 dark:bg-slate-800/30' : 'bg-white dark:bg-slate-900'}`}>
                                {columns.map((c, j) => <td key={j} className="px-3 py-2 text-slate-700 dark:text-slate-300">{row[c.field] || '-'}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    const TransactionPrint = ({ transactionId, onClose, language = 'fa' }) => {
        const isRtl = language === 'fa';
        const supabase = window.supabase;
        const printRef = useRef(null);

        const [loading, setLoading] = useState(false);
        const [headerData, setHeaderData] = useState(null);
        const [itemsData, setItemsData] = useState([]);
        const [usersMap, setUsersMap] = useState({});
        const [isSettingsOpen, setIsSettingsOpen] = useState(true);
        
        const [printSettings, setPrintSettings] = useState({
            accountLevel: 'subsidiary', 
            showTotals: true,
            showCurrencies: false,
            showSummary: true,
            showStatus: true
        });

        const accountLevelOptions = [
            { value: 'subsidiary', label: isRtl ? 'سطح معین' : 'Subsidiary Level' },
            { value: 'general', label: isRtl ? 'سطح کل' : 'General Level' },
            { value: 'group', label: isRtl ? 'سطح گروه' : 'Group Level' }
        ];

        useEffect(() => {
            if (transactionId) {
                fetchTransactionData();
                fetchUsers();
            }
        }, [transactionId]);

        const fetchUsers = async () => {
            try {
                const { data } = await supabase.from('sec_users').select('id, full_name, username');
                const uMap = {};
                (data || []).forEach(u => {
                    uMap[u.id] = u.full_name || u.username;
                });
                setUsersMap(uMap);
            } catch (error) {}
        };

        const fetchTransactionData = async () => {
            setLoading(true);
            try {
                const { data: header, error: headerError } = await supabase
                    .from('fm_transactions')
                    .select('*')
                    .eq('id', transactionId)
                    .single();

                if (headerError) throw headerError;

                const { data: items, error: itemsError } = await supabase
                    .from('fm_transaction_items')
                    .select('*')
                    .eq('transaction_id', transactionId)
                    .order('created_at', { ascending: true });

                if (itemsError) throw itemsError;

                let mappedItems = items || [];
                const accountIds = [...new Set(mappedItems.map(i => i.account_id))].filter(Boolean);
                
                if (accountIds.length > 0) {
                    const { data: accountsData, error: accountsError } = await supabase
                        .from('fm_coa_accounts')
                        .select('id, code, title_fa, title_en')
                        .in('id', accountIds);

                    if (!accountsError && accountsData) {
                        mappedItems = mappedItems.map(item => {
                            const accountMatch = accountsData.find(a => a.id === item.account_id);
                            return { ...item, fm_coa_accounts: accountMatch || null };
                        });
                    }
                }

                setHeaderData(header);
                setItemsData(mappedItems);
            } catch (error) {
            } finally {
                setLoading(false);
            }
        };

        const handleSettingChange = (settingKey, value) => {
            setPrintSettings(prev => ({ ...prev, [settingKey]: value }));
        };

        const handlePrint = () => {
            const printContent = printRef.current;
            if (!printContent) return;

            const printHTML = `
                <!DOCTYPE html>
                <html lang="${language}" dir="${isRtl ? 'rtl' : 'ltr'}">
                <head>
                    <meta charset="utf-8">
                    <title>${isRtl ? 'چاپ سند حسابداری' : 'Print Voucher'}</title>
                    <style>
                        @page { size: A5 landscape; margin: 10mm; }
                        body { 
                            font-family: Tahoma, Arial, sans-serif; 
                            font-size: 11px; 
                            color: #000; 
                            background: #fff;
                            margin: 0; 
                            padding: 0;
                            direction: ${isRtl ? 'rtl' : 'ltr'};
                        }
                        .print-container { width: 100%; max-width: 100%; box-sizing: border-box; }
                        .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
                        .header-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
                        .header-center { text-align: center; align-items: center; justify-content: center; }
                        .title { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; }
                        .badge { display: inline-block; padding: 2px 10px; border: 1px solid #000; border-radius: 12px; font-size: 10px; font-weight: bold; }
                        .info-line { display: flex; gap: 5px; font-size: 11px; }
                        .info-label { color: #444; }
                        .info-val { font-weight: bold; }
                        .desc-box { margin-bottom: 15px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: #fafafa; font-size: 11px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
                        th, td { border: 1px solid #000; padding: 6px; text-align: ${isRtl ? 'right' : 'left'}; }
                        th { background-color: #eee !important; -webkit-print-color-adjust: exact; font-weight: bold; text-align: center; }
                        .text-center { text-align: center; }
                        .totals-row { display: flex; justify-content: flex-end; gap: 30px; margin-top: 10px; padding: 8px; border: 1px solid #000; background: #f9f9f9 !important; -webkit-print-color-adjust: exact; font-size: 12px; }
                        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
                        .sig-box { flex: 1; text-align: center; display: flex; flex-direction: column; gap: 40px; }
                        .sig-title { font-weight: bold; font-size: 11px; color: #333; }
                        .sig-name { font-size: 11px; }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <div class="header-row">
                            <div class="header-col">
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره سند:' : 'Doc Code:'}</span><span class="info-val">${headerData.document_code}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'تاریخ سند:' : 'Date:'}</span><span class="info-val">${headerData.document_date ? new Date(headerData.document_date).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : '-'}</span></div>
                            </div>
                            <div class="header-col header-center">
                                <h1 class="title">${isRtl ? 'سند حسابداری' : 'Accounting Voucher'}</h1>
                                ${printSettings.showStatus ? `<span class="badge">${headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')}</span>` : ''}
                            </div>
                            <div class="header-col" style="align-items: flex-end;">
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره عطف:' : 'Ref Code:'}</span><span class="info-val">${headerData.reference_code || '-'}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره روزانه:' : 'Daily No:'}</span><span class="info-val">${headerData.daily_number || '-'}</span></div>
                            </div>
                        </div>

                        ${headerData.description ? `
                        <div class="desc-box">
                            <span class="info-label">${isRtl ? 'شرح سند:' : 'Description:'}</span> 
                            <span>${headerData.description}</span>
                        </div>
                        ` : ''}

                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 5%">${isRtl ? 'ردیف' : 'Row'}</th>
                                    <th style="width: 15%">${isRtl ? 'کد حساب' : 'Code'}</th>
                                    <th style="width: 25%">${isRtl ? 'نام حساب' : 'Account Name'}</th>
                                    <th style="width: 25%">${isRtl ? 'شرح' : 'Description'}</th>
                                    <th style="width: 15%">${isRtl ? 'بدهکار' : 'Debit'}</th>
                                    <th style="width: 15%">${isRtl ? 'بستانکار' : 'Credit'}</th>
                                    ${printSettings.showCurrencies ? `<th>${isRtl ? 'بدهکار ارزی' : 'FC Debit'}</th><th>${isRtl ? 'بستانکار ارزی' : 'FC Credit'}</th>` : ''}
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsData.map((item, index) => `
                                    <tr>
                                        <td class="text-center">${index + 1}</td>
                                        <td class="text-center">${item.fm_coa_accounts?.code || '-'}</td>
                                        <td>${isRtl ? item.fm_coa_accounts?.title_fa : item.fm_coa_accounts?.title_en || '-'}</td>
                                        <td>${item.description || '-'}</td>
                                        <td>${item.transaction_action === 'DEPOSIT' ? item.amount?.toLocaleString() : '-'}</td>
                                        <td>${item.transaction_action === 'WITHDRAWAL' ? item.amount?.toLocaleString() : '-'}</td>
                                        ${printSettings.showCurrencies ? `
                                            <td>${item.transaction_action === 'DEPOSIT' ? item.currency_amount?.toLocaleString() : '-'}</td>
                                            <td>${item.transaction_action === 'WITHDRAWAL' ? item.currency_amount?.toLocaleString() : '-'}</td>
                                        ` : ''}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        ${printSettings.showTotals ? `
                            <div class="totals-row">
                                <div class="info-line"><span class="info-label">${isRtl ? 'جمع کل بدهکار:' : 'Total Debit:'}</span><span class="info-val">${calculateTotals().debit.toLocaleString()}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'جمع کل بستانکار:' : 'Total Credit:'}</span><span class="info-val">${calculateTotals().credit.toLocaleString()}</span></div>
                            </div>
                        ` : ''}

                        ${printSettings.showSummary ? `
                            <div class="signatures">
                                <div class="sig-box">
                                    <span class="sig-title">${isRtl ? 'تنظیم کننده' : 'Prepared By'}</span>
                                    <span class="sig-name">${usersMap[headerData.registrar_id] || headerData.registrar_id || '---'}</span>
                                </div>
                                <div class="sig-box">
                                    <span class="sig-title">${isRtl ? 'بررسی کننده' : 'Checked By'}</span>
                                    <span class="sig-name">---</span>
                                </div>
                                <div class="sig-box">
                                    <span class="sig-title">${isRtl ? 'تایید کننده' : 'Approved By'}</span>
                                    <span class="sig-name">---</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </body>
                </html>
            `;
            
            const printIframe = document.createElement('iframe');
            printIframe.style.position = 'absolute';
            printIframe.style.width = '0px';
            printIframe.style.height = '0px';
            printIframe.style.border = 'none';
            document.body.appendChild(printIframe);
            
            const iframeDoc = printIframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(printHTML);
            iframeDoc.close();
            
            printIframe.contentWindow.focus();
            setTimeout(() => {
                printIframe.contentWindow.print();
                setTimeout(() => { document.body.removeChild(printIframe); }, 1000);
            }, 500);
        };

        const calculateTotals = () => {
            return itemsData.reduce((acc, item) => ({
                debit: acc.debit + (item.transaction_action === 'DEPOSIT' ? (item.amount || 0) : 0),
                credit: acc.credit + (item.transaction_action === 'WITHDRAWAL' ? (item.amount || 0) : 0)
            }), { debit: 0, credit: 0 });
        };

        const totals = calculateTotals();

        const getColumns = () => {
            let cols = [
                { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '40px' },
                { field: 'account_code', header_fa: 'کد حساب', header_en: 'Account Code', width: '100px' },
                { field: 'account_name', header_fa: 'نام حساب', header_en: 'Account Name', width: 'auto' },
                { field: 'description', header_fa: 'شرح آرتیکل', header_en: 'Description', width: 'auto' },
                { field: 'debit_amount', header_fa: 'بدهکار', header_en: 'Debit', width: '120px' },
                { field: 'credit_amount', header_fa: 'بستانکار', header_en: 'Credit', width: '120px' }
            ];

            if (printSettings.showCurrencies) {
                cols.splice(4, 0, 
                    { field: 'fc_debit_amount', header_fa: 'بدهکار (ارزی)', header_en: 'Debit (FC)', width: '100px' },
                    { field: 'fc_credit_amount', header_fa: 'بستانکار (ارزی)', header_en: 'Credit (FC)', width: '100px' }
                );
            }

            return cols.map(c => ({ field: c.field, header: isRtl ? c.header_fa : c.header_en, width: c.width }));
        };

        const renderPrintPreview = () => {
            if (!headerData) return null;

            return (
                <div ref={printRef} className="bg-white mx-auto shadow-sm border border-slate-300 w-full max-w-[900px] min-h-[600px] relative">
                    <div className="p-8 pb-4 border-b-2 border-slate-800 flex justify-between items-start">
                        <Flex direction="col" gap="xs" className="w-1/3">
                            <Flex align="center" gap="sm"><Text variant="caption" weight="medium">شماره سند:</Text><Text weight="bold" color="primary">{headerData.document_code}</Text></Flex>
                            <Flex align="center" gap="sm"><Text variant="caption" weight="medium">تاریخ سند:</Text><Text weight="bold">{headerData.document_date ? new Date(headerData.document_date).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : '-'}</Text></Flex>
                        </Flex>
                        
                        <Flex direction="col" gap="sm" align="center" justify="center" className="w-1/3">
                            <Text variant="h1">{isRtl ? 'سند حسابداری' : 'Accounting Voucher'}</Text>
                            {printSettings.showStatus && (
                                <Badge variant={headerData.status === 'APPROVED' ? 'success' : 'warning'}>
                                    {headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')}
                                </Badge>
                            )}
                        </Flex>

                        <Flex direction="col" gap="xs" className="w-1/3" align="end">
                            <Flex align="center" gap="sm"><Text variant="caption" weight="medium">شماره عطف:</Text><Text weight="bold">{headerData.reference_code || '-'}</Text></Flex>
                            <Flex align="center" gap="sm"><Text variant="caption" weight="medium">شماره روزانه:</Text><Text weight="bold">{headerData.daily_number || '-'}</Text></Flex>
                        </Flex>
                    </div>

                    <div className="p-8 pt-4 flex flex-col gap-4">
                        {headerData.description && (
                            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 dark:text-slate-800">
                                <span className="font-bold text-slate-500 ml-2">{isRtl ? 'شرح سند:' : 'Description:'}</span>
                                {headerData.description}
                            </div>
                        )}

                        <Table 
                            columns={getColumns()}
                            data={itemsData.map((item, index) => ({
                                row_number: index + 1,
                                account_code: item.fm_coa_accounts?.code || '-',
                                account_name: isRtl ? item.fm_coa_accounts?.title_fa : item.fm_coa_accounts?.title_en || '-',
                                description: item.description,
                                debit_amount: item.transaction_action === 'DEPOSIT' ? item.amount?.toLocaleString() : '-',
                                credit_amount: item.transaction_action === 'WITHDRAWAL' ? item.amount?.toLocaleString() : '-',
                                fc_debit_amount: item.transaction_action === 'DEPOSIT' ? item.currency_amount?.toLocaleString() : '-',
                                fc_credit_amount: item.transaction_action === 'WITHDRAWAL' ? item.currency_amount?.toLocaleString() : '-'
                            }))}
                            striped={true}
                        />
                        
                        {printSettings.showTotals && (
                            <div className="flex justify-end gap-12 p-3 mt-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-800">
                                <Flex direction="row" gap="sm" align="center">
                                    <span className="font-bold text-slate-500">{isRtl ? 'جمع کل بدهکار:' : 'Total Debit:'}</span>
                                    <span className="font-extrabold">{totals.debit.toLocaleString()}</span>
                                </Flex>
                                <Flex direction="row" gap="sm" align="center">
                                    <span className="font-bold text-slate-500">{isRtl ? 'جمع کل بستانکار:' : 'Total Credit:'}</span>
                                    <span className="font-extrabold">{totals.credit.toLocaleString()}</span>
                                </Flex>
                            </div>
                        )}

                        {printSettings.showSummary && (
                            <div className="flex justify-between mt-10 pt-4 px-10 text-center text-slate-800">
                                <Flex direction="col" gap="lg" align="center">
                                    <span className="text-xs font-bold text-slate-500">{isRtl ? 'تنظیم کننده' : 'Prepared By'}</span>
                                    <span className="text-sm font-medium">{usersMap[headerData.registrar_id] || headerData.registrar_id || '---'}</span>
                                </Flex>
                                <Flex direction="col" gap="lg" align="center">
                                    <span className="text-xs font-bold text-slate-500">{isRtl ? 'بررسی کننده' : 'Checked By'}</span>
                                    <span className="text-sm font-medium">---</span>
                                </Flex>
                                <Flex direction="col" gap="lg" align="center">
                                    <span className="text-xs font-bold text-slate-500">{isRtl ? 'تایید کننده' : 'Approved By'}</span>
                                    <span className="text-sm font-medium">---</span>
                                </Flex>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        return (
            <Modal isOpen={true} onClose={onClose} width="max-w-[1200px]" title={isRtl ? 'چاپ سند حسابداری' : 'Print Voucher'}>
                {/* Responsive Bento Grid Layout */}
                <div className="w-full h-full flex flex-row">
                    
                    {/* Collapsible Settings Sidebar */}
                    <div className={`flex flex-col bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out ${isSettingsOpen ? 'w-[280px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
                        <div className="p-4 flex-1 overflow-y-auto w-[280px]">
                            <Flex align="center" gap="sm" className="mb-6 text-indigo-600 dark:text-indigo-400">
                                <SafeSettingsIcon size={18} />
                                <Text weight="bold" color="primary">{isRtl ? 'تنظیمات خروجی' : 'Output Settings'}</Text>
                            </Flex>

                            <Flex direction="col" gap="lg">
                                <Select 
                                    label={isRtl ? 'سطح نمایش حساب' : 'Account Level'}
                                    options={accountLevelOptions}
                                    value={printSettings.accountLevel}
                                    onChange={(val) => handleSettingChange('accountLevel', val)}
                                    fullWidth
                                />
                                
                                <Divider margin="sm" />
                                
                                <Flex direction="col" gap="sm">
                                    <Text variant="caption" weight="bold" className="mb-2">{isRtl ? 'گزینه‌های نمایش' : 'Display Options'}</Text>
                                    <Checkbox label={isRtl ? 'نمایش جمع کل' : 'Show Totals'} checked={printSettings.showTotals} onChange={(val) => handleSettingChange('showTotals', val)} />
                                    <Checkbox label={isRtl ? 'نمایش مبالغ ارزی' : 'Show Currencies'} checked={printSettings.showCurrencies} onChange={(val) => handleSettingChange('showCurrencies', val)} />
                                    <Checkbox label={isRtl ? 'نمایش امضاها' : 'Show Signatures'} checked={printSettings.showSummary} onChange={(val) => handleSettingChange('showSummary', val)} />
                                    <Checkbox label={isRtl ? 'نمایش وضعیت سند' : 'Show Status'} checked={printSettings.showStatus} onChange={(val) => handleSettingChange('showStatus', val)} />
                                </Flex>
                            </Flex>
                        </div>
                        
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 w-[280px]">
                            <Button variant="primary" fullWidth icon={SafePrinterIcon} onClick={handlePrint} disabled={loading}>
                                {isRtl ? 'تایید و چاپ' : 'Print Document'}
                            </Button>
                        </div>
                    </div>

                    {/* Main Preview Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-slate-100/50 dark:bg-slate-900 relative">
                        {/* Toggle Button for Settings */}
                        <button 
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className={`absolute top-4 z-10 flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-slate-500 hover:text-indigo-600 transition-all ${isRtl ? 'right-4' : 'left-4'}`}
                            title={isRtl ? 'تنظیمات' : 'Settings'}
                        >
                            {isRtl 
                                ? (isSettingsOpen ? <SafeChevronLeftIcon size={16} /> : <SafeSettingsIcon size={16} />) 
                                : (isSettingsOpen ? <SafeChevronRightIcon size={16} /> : <SafeSettingsIcon size={16} />)
                            }
                        </button>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center">
                            {loading ? (
                                <Flex justify="center" align="center" className="h-full w-full">
                                    <Text variant="h2" color="secondary" className="animate-pulse">{isRtl ? 'در حال بارگذاری فرم...' : 'Loading Form...'}</Text>
                                </Flex>
                            ) : (
                                renderPrintPreview()
                            )}
                        </div>
                    </div>

                </div>
            </Modal>
        );
    };

    window.TransactionPrint = TransactionPrint;
})();