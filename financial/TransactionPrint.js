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

    const SafePrinterIcon = ({ size = 16, className = '' }) => React.createElement('svg', { className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('polyline', { points: '6 9 6 2 18 2 18 9' }),
        React.createElement('path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }),
        React.createElement('rect', { x: '6', y: '14', width: '12', height: '8' })
    );

    const SafeSettingsIcon = ({ size = 16, className = '' }) => React.createElement('svg', { className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: '12', cy: '12', r: '3' }),
        React.createElement('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' })
    );

    const SafeFileTextIcon = ({ size = 16, className = '' }) => React.createElement('svg', { className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
        React.createElement('polyline', { points: '14 2 14 8 20 8' }),
        React.createElement('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
        React.createElement('line', { x1: '16', y1: '17', x2: '8', y2: '17' }),
        React.createElement('polyline', { points: '10 9 9 9 8 9' })
    );

    const SafeChevronRightIcon = ({ size = 16, className = '' }) => React.createElement('svg', { className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('polyline', { points: '9 18 15 12 9 6' })
    );

    const SafeChevronLeftIcon = ({ size = 16, className = '' }) => React.createElement('svg', { className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('polyline', { points: '15 18 9 12 15 6' })
    );

    const Card = safeGet('Card') || (({ children, className }) => React.createElement('div', { className: `bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden ${className || ''}` }, children));
    
    const CardHeader = safeGet('CardHeader') || (({ title, icon: Icon, action }) => React.createElement('div', { className: "p-3 border-b border-slate-200 dark:border-slate-700 font-bold flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 text-sm text-slate-800 dark:text-slate-100" },
        React.createElement('div', { className: "flex items-center gap-2" },
            Icon && (typeof Icon === 'function' ? React.createElement(Icon, { size: 16, className: "text-slate-500" }) : Icon),
            title
        ),
        action && React.createElement('div', null, action)
    ));

    const CardBody = safeGet('CardBody') || (({ children, className }) => React.createElement('div', { className: `p-3 flex-1 ${className || ''}` }, children));
    
    const Flex = safeGet('Flex') || (({ children, direction = 'row', gap = 'md', align = 'stretch', justify = 'start', className = '', style }) => {
        const gapCls = gap === 'xs' ? 'gap-1' : gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : gap === 'xl' ? 'gap-8' : 'gap-4';
        const dirCls = direction === 'col' ? 'flex-col' : 'flex-row';
        const alignCls = align === 'center' ? 'items-center' : align === 'start' ? 'items-start' : align === 'end' ? 'items-end' : 'items-stretch';
        const justCls = justify === 'center' ? 'justify-center' : justify === 'between' ? 'justify-between' : justify === 'end' ? 'justify-end' : justify === 'start' ? 'justify-start' : 'justify-around';
        return React.createElement('div', { className: `flex ${dirCls} ${gapCls} ${alignCls} ${justCls} ${className}`, style }, children);
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
        return React.createElement('span', { className: `${cls} ${className}` }, children);
    });

    const Button = safeGet('Button') || (({ children, onClick, disabled, fullWidth, icon: Icon, variant = 'primary', size = 'md', className = '' }) => {
        let baseCls = "flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 outline-none";
        if (size === 'sm') baseCls += " py-1.5 px-3 text-xs";
        else baseCls += " py-2 px-4 text-sm";
        
        let varCls = "bg-indigo-600 text-white hover:bg-indigo-700";
        if (variant === 'outline') varCls = "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800";
        if (variant === 'ghost') varCls = "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800";
        
        return React.createElement('button', { onClick, disabled, className: `${baseCls} ${varCls} ${fullWidth ? 'w-full' : ''} ${className}` },
            Icon && (typeof Icon === 'function' ? React.createElement(Icon, { size: size === 'sm' ? 14 : 16 }) : Icon),
            children
        );
    });

    const Badge = safeGet('Badge') || (({ children, variant = 'primary', className = '' }) => {
        const colors = {
            success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
            warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
            primary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
        };
        return React.createElement('span', { className: `px-2 py-0.5 text-[11px] font-bold border rounded-md whitespace-nowrap ${colors[variant] || colors.primary} ${className}` }, children);
    });

    const Divider = safeGet('Divider') || (({ margin = 'md', className = '' }) => {
        const my = margin === 'sm' ? 'my-2' : margin === 'lg' ? 'my-6' : 'my-4';
        return React.createElement('hr', { className: `border-slate-200 dark:border-slate-700 w-full ${my} ${className}` });
    });

    let Modal = safeGet('Modal');
    if (!Modal) {
        Modal = ({ isOpen, onClose, title, children, size, width }) => {
            if (!isOpen) return null;
            const wCls = width || (size === 'xl' ? 'max-w-[1200px]' : 'max-w-[800px]');
            return React.createElement('div', { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" },
                React.createElement('div', { className: `bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 ${wCls}` },
                    React.createElement('div', { className: "p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80" },
                        React.createElement('h2', { className: "text-lg font-bold text-slate-800 dark:text-slate-100" }, title),
                        React.createElement('button', { onClick: onClose, className: "text-slate-500 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" }, '✕')
                    ),
                    React.createElement('div', { className: "p-0 flex-1 overflow-auto max-h-[90vh] bg-slate-100/50 dark:bg-slate-900 flex" }, children)
                )
            );
        };
    }

    const Checkbox = safeGet('Checkbox') || (({ label, checked, onChange }) => React.createElement('label', { className: "flex items-center gap-2 text-xs cursor-pointer group" },
        React.createElement('input', { type: "checkbox", checked, onChange: (e) => onChange(e.target.checked), className: "w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" }),
        React.createElement('span', { className: "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" }, label)
    ));

    const Select = safeGet('Select') || (({ label, options, value, onChange, fullWidth }) => React.createElement('div', { className: `flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}` },
        label && React.createElement('label', { className: "text-[11px] font-bold text-slate-500 dark:text-slate-400" }, label),
        React.createElement('select', { value, onChange: (e) => onChange(e.target.value), className: "w-full border border-slate-300 dark:border-slate-600 rounded-md p-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" },
            options.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))
        )
    ));

    // A very simple native table specifically for Print Preview to avoid DataGrid bloat
    const SimplePrintTable = ({ columns, data }) => {
        return React.createElement('div', { className: "w-full overflow-hidden border-y border-slate-400 my-4" },
            React.createElement('table', { className: "w-full text-[11px] text-slate-900 border-collapse" },
                React.createElement('thead', { className: "bg-slate-100 border-b-2 border-slate-400" },
                    React.createElement('tr', null,
                        columns.map((c, i) => React.createElement('th', { key: i, className: "px-2 py-2 font-bold text-center border-x border-slate-300", style: { width: c.width } }, c.header))
                    )
                ),
                React.createElement('tbody', null,
                    data.map((row, i) => React.createElement('tr', { key: i, className: "border-b border-slate-300 last:border-b-0 hover:bg-slate-50" },
                        columns.map((c, j) => React.createElement('td', { key: j, className: `px-2 py-2 border-x border-slate-300 ${c.align === 'center' ? 'text-center' : ''}` }, row[c.field] || '-'))
                    ))
                )
            )
        );
    };

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
            calendarType: 'jalali',
            showTotals: true,
            showCurrencies: false,
            showStatus: true
        });

        const accountLevelOptions = [
            { value: 'subsidiary', label: isRtl ? 'سطح معین' : 'Subsidiary Level' },
            { value: 'general', label: isRtl ? 'سطح کل' : 'General Level' },
            { value: 'group', label: isRtl ? 'سطح گروه' : 'Group Level' }
        ];

        const calendarOptions = [
            { value: 'jalali', label: isRtl ? 'شمسی' : 'Jalali' },
            { value: 'gregorian', label: isRtl ? 'میلادی' : 'Gregorian' }
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

        const formatDate = (dateString, calType) => {
            if (!dateString) return '-';
            const d = new Date(dateString);
            if (calType === 'jalali') {
                return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            }
            return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
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
                            font-family: Tahoma, Arial, "IRANSans", sans-serif; 
                            font-size: 11px; 
                            color: #000; 
                            background: #fff;
                            margin: 0; 
                            padding: 0;
                            direction: ${isRtl ? 'rtl' : 'ltr'};
                        }
                        .print-container { width: 100%; box-sizing: border-box; }
                        
                        /* Header Grid Layout */
                        .header-grid { 
                            display: grid; 
                            grid-template-columns: 1fr auto 1fr; 
                            gap: 10px; 
                            border: 1px solid #000; 
                            padding: 10px; 
                            border-radius: 4px;
                            margin-bottom: 10px;
                        }
                        .header-col { display: flex; flex-direction: column; gap: 5px; justify-content: center; }
                        .header-center { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                        .title { font-size: 16px; font-weight: bold; margin: 0 0 5px 0; }
                        .badge { display: inline-block; padding: 2px 8px; border: 1px solid #000; border-radius: 10px; font-size: 10px; font-weight: bold; margin-top: 4px; }
                        
                        .info-line { display: flex; gap: 4px; font-size: 10px; align-items: center; }
                        .info-label { font-weight: normal; color: #333; }
                        .info-val { font-weight: bold; }
                        
                        .desc-box { margin-bottom: 10px; padding: 5px 10px; font-size: 11px; }
                        
                        /* Simple Table for Print */
                        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
                        th, td { border: 1px solid #000; padding: 4px 6px; text-align: ${isRtl ? 'right' : 'left'}; }
                        th { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; font-weight: bold; text-align: center; }
                        .text-center { text-align: center; }
                        
                        /* Totals & Signatures */
                        .totals-row { display: flex; justify-content: flex-end; gap: 20px; padding: 5px 10px; border: 1px solid #000; background: #f3f4f6 !important; -webkit-print-color-adjust: exact; font-size: 11px; margin-bottom: 5px; }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <div class="header-grid">
                            <div class="header-col">
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره سند:' : 'Doc Code:'}</span><span class="info-val">${headerData.document_code}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'تاریخ سند:' : 'Date:'}</span><span class="info-val">${formatDate(headerData.document_date, printSettings.calendarType)}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره عطف:' : 'Ref Code:'}</span><span class="info-val">${headerData.reference_code || '-'}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره روزانه:' : 'Daily No:'}</span><span class="info-val">${headerData.daily_number || '-'}</span></div>
                            </div>
                            
                            <div class="header-col header-center">
                                <h1 class="title">${isRtl ? 'سند حسابداری' : 'Accounting Voucher'}</h1>
                                ${printSettings.showStatus ? `<span class="badge">${headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')}</span>` : ''}
                            </div>
                            
                            <div class="header-col" style="align-items: ${isRtl ? 'flex-end' : 'flex-start'};">
                                <div class="info-line"><span class="info-label">${isRtl ? 'تنظیم کننده:' : 'Prepared By:'}</span><span class="info-val">${usersMap[headerData.registrar_id] || headerData.registrar_id || '---'}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'تایید کننده:' : 'Approved By:'}</span><span class="info-val">---</span></div>
                            </div>
                        </div>

                        ${headerData.description ? `
                        <div class="desc-box">
                            <span class="info-label">${isRtl ? 'شرح سند:' : 'Description:'}</span> 
                            <span class="info-val" style="font-weight: normal;">${headerData.description}</span>
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
                { field: 'row_number', header: isRtl ? 'ردیف' : 'Row', width: '40px', align: 'center' },
                { field: 'account_code', header: isRtl ? 'کد حساب' : 'Account Code', width: '100px', align: 'center' },
                { field: 'account_name', header: isRtl ? 'نام حساب' : 'Account Name', width: 'auto' },
                { field: 'description', header: isRtl ? 'شرح آرتیکل' : 'Description', width: 'auto' },
                { field: 'debit_amount', header: isRtl ? 'بدهکار' : 'Debit', width: '120px' },
                { field: 'credit_amount', header: isRtl ? 'بستانکار' : 'Credit', width: '120px' }
            ];

            if (printSettings.showCurrencies) {
                cols.splice(4, 0, 
                    { field: 'fc_debit_amount', header: isRtl ? 'بدهکار (ارزی)' : 'Debit (FC)', width: '100px' },
                    { field: 'fc_credit_amount', header: isRtl ? 'بستانکار (ارزی)' : 'Credit (FC)', width: '100px' }
                );
            }

            return cols;
        };

        const renderPrintPreview = () => {
            if (!headerData) return null;

            return React.createElement('div', { ref: printRef, className: "bg-white mx-auto w-full max-w-[950px] min-h-[500px] border border-slate-300 shadow-sm text-slate-900 font-sans p-6" },
                React.createElement(Flex, { className: "border border-slate-800 rounded p-4 mb-4", align: "center" },
                    React.createElement(Flex, { direction: "col", gap: "xs", className: "w-1/3" },
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره سند:' : 'Doc Code:'), React.createElement(Text, { weight: "bold" }, headerData.document_code)),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'تاریخ سند:' : 'Date:'), React.createElement(Text, { weight: "bold" }, formatDate(headerData.document_date, printSettings.calendarType))),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره عطف:' : 'Ref Code:'), React.createElement(Text, { weight: "bold" }, headerData.reference_code || '-')),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره روزانه:' : 'Daily No:'), React.createElement(Text, { weight: "bold" }, headerData.daily_number || '-'))
                    ),
                    
                    React.createElement(Flex, { direction: "col", gap: "xs", align: "center", justify: "center", className: "w-1/3" },
                        React.createElement(Text, { variant: "h2", className: "tracking-tight" }, isRtl ? 'سند حسابداری' : 'Accounting Voucher'),
                        printSettings.showStatus && React.createElement(Badge, { variant: headerData.status === 'APPROVED' ? 'success' : 'warning', className: "mt-1 border-slate-800 bg-transparent text-slate-800" },
                            headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')
                        )
                    ),

                    React.createElement(Flex, { direction: "col", gap: "xs", className: "w-1/3", align: isRtl ? "start" : "end" },
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'تنظیم کننده:' : 'Prepared By:'), React.createElement(Text, { weight: "bold" }, usersMap[headerData.registrar_id] || headerData.registrar_id || '---')),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'تایید کننده:' : 'Approved By:'), React.createElement(Text, { weight: "bold" }, '---'))
                    )
                ),

                headerData.description && React.createElement(Flex, { className: "mb-3 px-2" },
                    React.createElement(Text, { variant: "caption", className: "ml-2 whitespace-nowrap" }, isRtl ? 'شرح سند:' : 'Description:'),
                    React.createElement(Text, null, headerData.description)
                ),

                React.createElement(SimplePrintTable, {
                    columns: getColumns(),
                    data: itemsData.map((item, index) => ({
                        row_number: index + 1,
                        account_code: item.fm_coa_accounts?.code || '-',
                        account_name: isRtl ? item.fm_coa_accounts?.title_fa : item.fm_coa_accounts?.title_en || '-',
                        description: item.description,
                        debit_amount: item.transaction_action === 'DEPOSIT' ? item.amount?.toLocaleString() : '-',
                        credit_amount: item.transaction_action === 'WITHDRAWAL' ? item.amount?.toLocaleString() : '-',
                        fc_debit_amount: item.transaction_action === 'DEPOSIT' ? item.currency_amount?.toLocaleString() : '-',
                        fc_credit_amount: item.transaction_action === 'WITHDRAWAL' ? item.currency_amount?.toLocaleString() : '-'
                    }))
                }),
                
                printSettings.showTotals && React.createElement(Flex, { justify: "end", gap: "xl", className: "p-2 border border-slate-400 bg-slate-100/50 mt-2" },
                    React.createElement(Flex, { align: "center", gap: "sm" }, React.createElement(Text, { variant: "caption" }, isRtl ? 'جمع کل بدهکار:' : 'Total Debit:'), React.createElement(Text, { weight: "bold", className: "text-sm" }, totals.debit.toLocaleString())),
                    React.createElement(Flex, { align: "center", gap: "sm" }, React.createElement(Text, { variant: "caption" }, isRtl ? 'جمع کل بستانکار:' : 'Total Credit:'), React.createElement(Text, { weight: "bold", className: "text-sm" }, totals.credit.toLocaleString()))
                )
            );
        };

        return React.createElement(Modal, {
            isOpen: true,
            onClose: onClose,
            width: "max-w-[1200px]",
            title: isRtl ? 'چاپ سند حسابداری' : 'Print Voucher'
        },
            React.createElement('div', { className: "w-full h-full flex flex-row relative" },
                React.createElement('div', { className: `flex flex-col bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out shrink-0 ${isSettingsOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}` },
                    React.createElement('div', { className: "p-4 flex-1 overflow-y-auto w-[260px]" },
                        React.createElement(Flex, { align: "center", gap: "sm", className: "mb-6 text-indigo-600 dark:text-indigo-400" },
                            React.createElement(SafeSettingsIcon, { size: 16 }),
                            React.createElement(Text, { weight: "bold", color: "primary" }, isRtl ? 'تنظیمات خروجی' : 'Output Settings')
                        ),

                        React.createElement(Flex, { direction: "col", gap: "md" },
                            React.createElement(Select, {
                                label: isRtl ? 'تقویم' : 'Calendar',
                                options: calendarOptions,
                                value: printSettings.calendarType,
                                onChange: (val) => handleSettingChange('calendarType', val),
                                fullWidth: true
                            }),
                            React.createElement(Select, {
                                label: isRtl ? 'سطح نمایش حساب' : 'Account Level',
                                options: accountLevelOptions,
                                value: printSettings.accountLevel,
                                onChange: (val) => handleSettingChange('accountLevel', val),
                                fullWidth: true
                            }),
                            
                            React.createElement(Divider, { margin: "sm" }),
                            
                            React.createElement(Flex, { direction: "col", gap: "xs" },
                                React.createElement(Text, { variant: "caption", weight: "bold", className: "mb-1 text-slate-400" }, isRtl ? 'گزینه‌های نمایش' : 'Display Options'),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش جمع کل' : 'Show Totals', checked: printSettings.showTotals, onChange: (val) => handleSettingChange('showTotals', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش مبالغ ارزی' : 'Show Currencies', checked: printSettings.showCurrencies, onChange: (val) => handleSettingChange('showCurrencies', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش وضعیت سند' : 'Show Status', checked: printSettings.showStatus, onChange: (val) => handleSettingChange('showStatus', val) })
                            )
                        )
                    ),
                    
                    React.createElement('div', { className: "p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 w-[260px]" },
                        React.createElement(Button, { variant: "primary", fullWidth: true, icon: SafePrinterIcon, onClick: handlePrint, disabled: loading },
                            isRtl ? 'چاپ سند' : 'Print Document'
                        )
                    )
                ),

                React.createElement('div', { className: "flex-1 flex flex-col min-w-0 bg-slate-100/50 dark:bg-slate-900 relative" },
                    React.createElement('button', {
                        onClick: () => setIsSettingsOpen(!isSettingsOpen),
                        className: `absolute top-4 z-10 flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-slate-500 hover:text-indigo-600 transition-all ${isRtl ? 'right-4' : 'left-4'}`,
                        title: isRtl ? 'تنظیمات' : 'Settings'
                    },
                        isRtl 
                            ? (isSettingsOpen ? React.createElement(SafeChevronLeftIcon, { size: 16 }) : React.createElement(SafeSettingsIcon, { size: 16 })) 
                            : (isSettingsOpen ? React.createElement(SafeChevronRightIcon, { size: 16 }) : React.createElement(SafeSettingsIcon, { size: 16 }))
                    ),

                    React.createElement('div', { className: "flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center" },
                        loading ? React.createElement(Flex, { justify: "center", align: "center", className: "h-full w-full" },
                            React.createElement(Text, { variant: "h2", color: "secondary", className: "animate-pulse" }, isRtl ? 'در حال بارگذاری...' : 'Loading...')
                        ) : renderPrintPreview()
                    )
                )
            )
        );
    };

    window.TransactionPrint = TransactionPrint;
})();