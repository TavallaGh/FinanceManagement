/* Filename: financial/TransactionPrint.js */
(() => {
    const React = window.React;
    const { useState, useEffect, useRef, useCallback } = React;

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

    const formatNumberSafe = (val) => {
        if (val === null || val === undefined || val === '') return '0';
        const strVal = String(val).replace(/,/g, '');
        if (strVal.trim() === '' || isNaN(Number(strVal))) return '0';
        const parsed = parseFloat(strVal);
        if (parsed === 0) return '0';
        const parts = parsed.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts[1] === '00' ? parts[0] : parts.join('.');
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
        if (variant === 'outline') varCls = "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700";
        return React.createElement('button', { onClick, disabled, className: `${baseCls} ${varCls} ${fullWidth ? 'w-full' : ''} ${className}` },
            Icon && (typeof Icon === 'function' ? React.createElement(Icon, { size: size === 'sm' ? 14 : 16 }) : Icon),
            children
        );
    });

    const Badge = safeGet('Badge') || (({ children, variant = 'primary', className = '' }) => {
        const colors = {
            success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
            warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200',
            primary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200'
        };
        return React.createElement('span', { className: `px-2 py-0.5 text-[11px] font-bold border rounded-md whitespace-nowrap ${colors[variant] || colors.primary} ${className}` }, children);
    });

    const Divider = safeGet('Divider') || (({ margin = 'md', className = '' }) => {
        const my = margin === 'sm' ? 'my-2' : margin === 'lg' ? 'my-6' : 'my-4';
        return React.createElement('hr', { className: `border-slate-200 dark:border-slate-700 w-full ${my} ${className}` });
    });

    let Modal = safeGet('Modal');
    if (!Modal) {
        Modal = ({ isOpen, onClose, title, children, width }) => {
            if (!isOpen) return null;
            return React.createElement('div', { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" },
                React.createElement('div', { className: `bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 ${width}` },
                    React.createElement('div', { className: "p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 shrink-0" },
                        React.createElement('h2', { className: "text-lg font-bold text-slate-800 dark:text-slate-100" }, title),
                        React.createElement('button', { onClick: onClose, className: "text-slate-500 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" }, '✕')
                    ),
                    React.createElement('div', { className: "p-0 flex-1 overflow-auto bg-slate-100/50 dark:bg-slate-900 flex relative" }, children)
                )
            );
        };
    }

    let Drawer = safeGet('Drawer');
    if (!Drawer || !Drawer.supportsInline) {
        Drawer = ({ isOpen, onClose, title, children, footer, position = 'right', width = 'w-[280px]', language = 'fa', variant = 'modal' }) => {
            const isRtl = language === 'fa';
            let physicalPosition = position;
            if (position === 'start') physicalPosition = isRtl ? 'right' : 'left';
            if (position === 'end') physicalPosition = isRtl ? 'left' : 'right';
            const isRight = physicalPosition === 'right';

            const innerContent = React.createElement(React.Fragment, null,
                React.createElement('div', { className: "h-12 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between px-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0" },
                    React.createElement('h3', { className: "font-black text-slate-700 dark:text-slate-200 text-[14px]" }, title),
                    React.createElement('button', { onClick: onClose, className: "text-slate-400 hover:text-rose-500" }, '✕')
                ),
                React.createElement('div', { className: "flex-1 overflow-y-auto p-4 flex flex-col" }, children),
                footer && React.createElement('div', { className: "p-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 shrink-0" }, footer)
            );

            if (variant === 'inline') {
                const innerWidthClass = width.includes('max-w-') ? 'w-[320px]' : width;
                return React.createElement('aside', { 
                    className: `relative flex flex-col bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${isOpen ? width : 'w-0 border-none opacity-0'} ${isRight ? 'border-l' : 'border-r'}`,
                    dir: isRtl ? 'rtl' : 'ltr'
                }, 
                    React.createElement('div', { className: `absolute top-0 bottom-0 flex flex-col h-full ${isRight ? 'right-0' : 'left-0'} ${innerWidthClass} max-w-[100vw]` }, innerContent)
                );
            }

            if (!isOpen) return null;
            return React.createElement('div', { className: "fixed inset-0 z-[99999] font-sans flex", dir: isRtl ? 'rtl' : 'ltr', style: { justifyContent: isRight ? 'flex-end' : 'flex-start' } },
                React.createElement('div', { className: "absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]", onClick: onClose }),
                React.createElement('div', { className: `relative bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col w-full sm:${width} border-slate-200 dark:border-slate-700 ${isRight ? 'border-l' : 'border-r'}` }, innerContent)
            );
        };
    }

    const Checkbox = safeGet('Checkbox') || (({ label, checked, onChange, disabled }) => React.createElement('label', { className: `flex items-center gap-2 text-xs cursor-pointer group ${disabled ? 'opacity-50' : ''}` },
        React.createElement('input', { type: "checkbox", checked, disabled, onChange: (e) => onChange(e.target.checked), className: "w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" }),
        React.createElement('span', { className: "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" }, label)
    ));

    const Select = safeGet('Select') || (({ label, options, value, onChange, fullWidth }) => React.createElement('div', { className: `flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}` },
        label && React.createElement('label', { className: "text-[11px] font-bold text-slate-500 dark:text-slate-400" }, label),
        React.createElement('select', { value, onChange: (e) => onChange(e.target.value), className: "w-full border border-slate-300 dark:border-slate-600 rounded-md p-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" },
            options.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))
        )
    ));

    const SimplePrintTable = ({ columns, rows, totals, language, showGroupTotals }) => {
        const isRtl = language === 'fa';
        return React.createElement('div', { className: "w-full overflow-hidden border border-slate-300 mt-4 rounded shadow-sm" },
            React.createElement('table', { className: `w-full text-[11px] text-slate-900 border-collapse ${isRtl ? 'text-right' : 'text-left'}` },
                React.createElement('thead', { className: "bg-slate-100 border-b-2 border-slate-300 text-slate-800" },
                    React.createElement('tr', null,
                        columns.map((c, i) => React.createElement('th', { key: i, className: "px-2 py-2 font-bold text-center border-x border-slate-200", style: { width: c.width } }, c.header))
                    )
                ),
                React.createElement('tbody', null,
                    rows.map((r, i) => {
                        if (r.type === 'header') {
                            const bgCls = r.level === 'group' ? 'bg-indigo-100/60 border-indigo-200' :
                                          r.level === 'general' ? 'bg-slate-200 border-slate-300' :
                                          'bg-slate-50 border-slate-200';
                            const indent = r.level === 'group' ? '' : r.level === 'general' ? (isRtl ? 'pr-4' : 'pl-4') : (isRtl ? 'pr-8' : 'pl-8');
                            const levelName = r.level === 'group' ? (isRtl ? 'گروه' : 'Group') : r.level === 'general' ? (isRtl ? 'کل' : 'General') : (isRtl ? 'معین' : 'Subsidiary');
                            
                            const usdColIndex = columns.findIndex(c => c.field === 'usd_amount');
                            const irrColIndex = columns.findIndex(c => c.field === 'irr_amount');

                            if (showGroupTotals && usdColIndex !== -1 && irrColIndex !== -1) {
                                const beforeUsdCount = usdColIndex;
                                return React.createElement('tr', { key: `hdr-${i}`, className: `${bgCls} border-b font-bold` },
                                    React.createElement('td', { colSpan: beforeUsdCount, className: `px-3 py-2 text-slate-800 ${indent}` }, 
                                        `${levelName}: ${r.data.code} - ${isRtl ? r.data.title_fa : (r.data.title_en || r.data.title_fa)}`
                                    ),
                                    React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-200 font-bold", dir: "ltr" }, formatNumberSafe(r.usdSum)),
                                    React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-200 font-bold", dir: "ltr" }, formatNumberSafe(r.irrSum)),
                                    React.createElement('td', { colSpan: columns.length - irrColIndex - 1, className: "border-x border-slate-200" })
                                );
                            } else {
                                return React.createElement('tr', { key: `hdr-${i}`, className: `${bgCls} border-b` },
                                    React.createElement('td', { colSpan: columns.length, className: `px-3 py-2 font-bold text-slate-800 ${indent}` }, 
                                        `${levelName}: ${r.data.code} - ${isRtl ? r.data.title_fa : (r.data.title_en || r.data.title_fa)}`
                                    )
                                );
                            }
                        } else {
                            const item = r.data;
                            return React.createElement('tr', { key: `itm-${i}`, className: "border-b border-slate-200 last:border-b-0 hover:bg-slate-50" },
                                columns.map((c, j) => React.createElement('td', { key: j, className: `px-2 py-2 border-x border-slate-200 ${c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left'}`, dir: c.align === 'right' ? 'ltr' : 'auto' }, item[c.field] || '-'))
                            );
                        }
                    })
                ),
                totals && React.createElement('tfoot', { className: "bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800" },
                    React.createElement('tr', null,
                        React.createElement('td', { 
                            colSpan: columns.findIndex(c => c.field === 'deposit_amount'), 
                            className: `px-3 py-2 border-x border-slate-200 ${isRtl ? 'text-left' : 'text-right'}` 
                        }, totals.label),
                        React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-200 font-extrabold", dir: "ltr" }, totals.deposit),
                        React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-200 font-extrabold", dir: "ltr" }, totals.withdrawal),
                        totals.usdDebit !== undefined && React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-200 font-extrabold", dir: "ltr" }, totals.usdDebit),
                        totals.irrDebit !== undefined && React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-200 font-extrabold", dir: "ltr" }, totals.irrDebit),
                        React.createElement('td', { className: "border-x border-slate-200" })
                    )
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
        const [deptsMap, setDeptsMap] = useState({});
        const [allAccounts, setAllAccounts] = useState([]);
        const [isSettingsOpen, setIsSettingsOpen] = useState(true);
        
        const [printSettings, setPrintSettings] = useState({
            accountLevels: {
                group: false,
                general: false,
                subsidiary: true
            },
            calendarType: 'jalali',
            showTotals: true,
            showCurrencies: true,
            showGroupTotals: true,
            showStatus: true,
            showSignatures: true,
            signatures: {
                preparer: true,
                checker: false,
                approver: false,
                finManager: true,
                auditor: true,
                ceo: false
            }
        });

        const calendarOptions = [
            { value: 'jalali', label: isRtl ? 'شمسی' : 'Jalali' },
            { value: 'gregorian', label: isRtl ? 'میلادی' : 'Gregorian' }
        ];

        const signatureOptions = [
            { key: 'preparer', label: isRtl ? 'ثبت کننده' : 'Prepared By' },
            { key: 'checker', label: isRtl ? 'بررسی کننده' : 'Checked By' },
            { key: 'approver', label: isRtl ? 'تایید کننده' : 'Approved By' },
            { key: 'finManager', label: isRtl ? 'مدیر مالی' : 'Financial Manager' },
            { key: 'auditor', label: isRtl ? 'حسابرس' : 'Auditor' },
            { key: 'ceo', label: isRtl ? 'مدیرعامل' : 'CEO' }
        ];

        useEffect(() => {
            if (transactionId) {
                fetchTransactionData();
                fetchDependencies();
            }
        }, [transactionId]);

        const fetchDependencies = async () => {
            try {
                const [{ data: users }, { data: depts }] = await Promise.all([
                    supabase.from('sec_users').select('id, full_name, username'),
                    supabase.from('fm_org_chart_nodes').select('id, title')
                ]);
                
                const uMap = {};
                (users || []).forEach(u => {
                    uMap[u.id] = u.full_name || u.username;
                });
                setUsersMap(uMap);

                const dMap = {};
                (depts || []).forEach(d => {
                    dMap[d.id] = d.title;
                });
                setDeptsMap(dMap);
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

                const { data: allAccs } = await supabase.from('fm_coa_accounts').select('id, code, title_fa, title_en, parent_id');
                const loadedAccounts = allAccs || [];
                setAllAccounts(loadedAccounts);

                let mappedItems = items || [];
                mappedItems = mappedItems.map(item => {
                    const accountMatch = loadedAccounts.find(a => String(a.id) === String(item.account_id));
                    return { ...item, fm_coa_accounts: accountMatch || null };
                });

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

        const handleSignatureToggle = (key, checked) => {
            setPrintSettings(prev => ({
                ...prev,
                signatures: {
                    ...prev.signatures,
                    [key]: checked
                }
            }));
        };

        const formatDate = (dateString, calType) => {
            if (!dateString) return '-';
            const d = new Date(dateString);
            if (calType === 'jalali') {
                return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            }
            return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        };

        const calculateTotals = () => {
            let debit = 0, credit = 0, usdDebit = 0, usdCredit = 0, irrDebit = 0, irrCredit = 0;
            
            itemsData.forEach(item => {
                const dep = parseFloat(item.deposit_amount || 0);
                const wtd = parseFloat(item.withdrawal_amount || 0);
                const usd = parseFloat(item.amount_usd || 0);
                const irr = parseFloat(item.amount_irr || 0);

                debit += dep;
                credit += wtd;

                if (dep > 0) {
                    usdDebit += usd;
                    irrDebit += irr;
                } else if (wtd > 0) {
                    usdCredit += usd;
                    irrCredit += irr;
                }
            });

            return { debit, credit, usdDebit, usdCredit, irrDebit, irrCredit };
        };

        const totals = calculateTotals();

        const getColumns = () => {
            let cols = [
                { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '30px', align: 'center' },
                { field: 'account_code', header_fa: 'کد حساب', header_en: 'Account Code', width: '70px', align: 'center' },
                { field: 'account_name', header_fa: 'نام حساب', header_en: 'Account Name', width: 'auto', align: isRtl ? 'right' : 'left' },
                { field: 'currency', header_fa: 'ارز', header_en: 'Cur', width: '30px', align: 'center' },
                { field: 'deposit_amount', header_fa: 'مبلغ واریز', header_en: 'Deposit', width: '80px', align: 'right' },
                { field: 'withdrawal_amount', header_fa: 'مبلغ برداشت', header_en: 'Withdrawal', width: '80px', align: 'right' }
            ];

            if (printSettings.showCurrencies) {
                cols.push(
                    { field: 'usd_amount', header_fa: 'مبلغ (دلار)', header_en: 'Amount (USD)', width: '80px', align: 'right' },
                    { field: 'irr_amount', header_fa: 'مبلغ (ریال)', header_en: 'Amount (IRR)', width: '80px', align: 'right' }
                );
            }

            cols.push({ field: 'description', header_fa: 'شرح', header_en: 'Description', width: '20%', align: isRtl ? 'right' : 'left' });

            return cols.map(c => ({ ...c, header: isRtl ? c.header_fa : c.header_en }));
        };

        const activeSignaturesList = signatureOptions.filter(opt => printSettings.signatures[opt.key]);

        const getPreparedRows = () => {
            const augmentedItems = itemsData.map(item => {
                const path = [];
                let curr = allAccounts.find(a => String(a.id) === String(item.account_id));
                while (curr) {
                    path.unshift(curr);
                    curr = allAccounts.find(a => String(a.id) === String(curr.parent_id));
                }
                return {
                    ...item,
                    _group: path[0] || null,
                    _general: path[1] || null,
                    _subsidiary: path[2] || null,
                    _sortCode: path.map(p => p.code).join('-')
                };
            }).sort((a, b) => a._sortCode.localeCompare(b._sortCode));

            const rows = [];
            let currentGroupId = null;
            let currentGeneralId = null;
            let currentSubsidiaryId = null;

            augmentedItems.forEach((item, index) => {
                const itemGroupId = item._group ? item._group.id : null;
                const itemGeneralId = item._general ? item._general.id : null;
                const itemSubsidiaryId = item._subsidiary ? item._subsidiary.id : null;

                const groupChanged = itemGroupId !== currentGroupId;
                const generalChanged = groupChanged || (itemGeneralId !== currentGeneralId);
                const subChanged = generalChanged || (itemSubsidiaryId !== currentSubsidiaryId);

                if (printSettings.accountLevels.group && item._group && groupChanged) {
                    let usdSum = 0, irrSum = 0;
                    if (printSettings.showCurrencies && printSettings.showGroupTotals) {
                        augmentedItems.forEach(x => {
                            if (x._group && x._group.id === itemGroupId) {
                                usdSum += parseFloat(x.amount_usd || 0);
                                irrSum += parseFloat(x.amount_irr || 0);
                            }
                        });
                    }
                    rows.push({ type: 'header', level: 'group', data: item._group, usdSum, irrSum });
                }
                if (printSettings.accountLevels.general && item._general && generalChanged) {
                    let usdSum = 0, irrSum = 0;
                    if (printSettings.showCurrencies && printSettings.showGroupTotals) {
                        augmentedItems.forEach(x => {
                            if (x._general && x._general.id === itemGeneralId) {
                                usdSum += parseFloat(x.amount_usd || 0);
                                irrSum += parseFloat(x.amount_irr || 0);
                            }
                        });
                    }
                    rows.push({ type: 'header', level: 'general', data: item._general, usdSum, irrSum });
                }
                if (printSettings.accountLevels.subsidiary && item._subsidiary && subChanged) {
                    let usdSum = 0, irrSum = 0;
                    if (printSettings.showCurrencies && printSettings.showGroupTotals) {
                        augmentedItems.forEach(x => {
                            if (x._subsidiary && x._subsidiary.id === itemSubsidiaryId) {
                                usdSum += parseFloat(x.amount_usd || 0);
                                irrSum += parseFloat(x.amount_irr || 0);
                            }
                        });
                    }
                    rows.push({ type: 'header', level: 'subsidiary', data: item._subsidiary, usdSum, irrSum });
                }

                currentGroupId = itemGroupId;
                currentGeneralId = itemGeneralId;
                currentSubsidiaryId = itemSubsidiaryId;

                const accName = isRtl ? item.fm_coa_accounts?.title_fa : item.fm_coa_accounts?.title_en;
                const cur = item.currency || item.currency_code || 'IRR';
                
                const depositAmt = parseFloat(item.deposit_amount || 0);
                const withdrawAmt = parseFloat(item.withdrawal_amount || 0);
                const usdVal = parseFloat(item.amount_usd || 0);
                const irrVal = parseFloat(item.amount_irr || 0);

                rows.push({
                    type: 'item',
                    data: {
                        row_number: index + 1,
                        account_code: item.fm_coa_accounts?.code || '-',
                        account_name: accName || '-',
                        currency: cur,
                        deposit_amount: depositAmt > 0 ? formatNumberSafe(depositAmt) : '-',
                        withdrawal_amount: withdrawAmt > 0 ? formatNumberSafe(withdrawAmt) : '-',
                        usd_amount: usdVal > 0 ? formatNumberSafe(usdVal) : '-',
                        irr_amount: irrVal > 0 ? formatNumberSafe(irrVal) : '-',
                        description: item.description || '-'
                    }
                });
            });

            return rows;
        };

        const handlePrint = () => {
            const printContent = printRef.current;
            if (!printContent) return;

            const rows = getPreparedRows();
            const cols = getColumns();

            const usdColIdx = cols.findIndex(c => c.field === 'usd_amount');
            const irrColIdx = cols.findIndex(c => c.field === 'irr_amount');

            const tableRowsHTML = rows.map(r => {
                if (r.type === 'header') {
                    const cls = r.level === 'group' ? 'hdr-group' : r.level === 'general' ? 'hdr-general' : 'hdr-sub';
                    const levelName = r.level === 'group' ? (isRtl ? 'گروه' : 'Group') : r.level === 'general' ? (isRtl ? 'کل' : 'General') : (isRtl ? 'معین' : 'Subsidiary');
                    
                    if (printSettings.showCurrencies && printSettings.showGroupTotals && usdColIdx !== -1 && irrColIdx !== -1) {
                        return `
                            <tr class="${cls}" style="font-weight: bold;">
                                <td colspan="${usdColIdx}">${levelName}: ${r.data.code} - ${isRtl ? r.data.title_fa : (r.data.title_en || r.data.title_fa)}</td>
                                <td class="text-right" dir="ltr">${formatNumberSafe(r.usdSum)}</td>
                                <td class="text-right" dir="ltr">${formatNumberSafe(r.irrSum)}</td>
                                <td colspan="${cols.length - irrColIdx - 1}"></td>
                            </tr>
                        `;
                    } else {
                        return `<tr class="${cls}"><td colspan="${cols.length}">${levelName}: ${r.data.code} - ${isRtl ? r.data.title_fa : (r.data.title_en || r.data.title_fa)}</td></tr>`;
                    }
                } else {
                    const item = r.data;
                    return `<tr>${cols.map(c => `<td class="${c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left'}" ${c.align === 'right' ? 'dir="ltr"' : ''}>${item[c.field] || '-'}</td>`).join('')}</tr>`;
                }
            }).join('');

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
                        
                        .header-flex { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: stretch; 
                            border: 1px solid #000; 
                            padding: 10px; 
                            border-radius: 4px;
                            margin-bottom: 10px;
                        }
                        .header-col { display: flex; flex-direction: column; gap: 5px; justify-content: center; flex: 1; }
                        .header-start { align-items: flex-start; text-align: start; }
                        .header-center { align-items: center; text-align: center; }
                        .header-end { align-items: flex-end; text-align: end; }
                        
                        .title { font-size: 16px; font-weight: bold; margin: 0 0 5px 0; }
                        .badge { display: inline-block; padding: 2px 8px; border: 1px solid #000; border-radius: 10px; font-size: 10px; font-weight: bold; margin-top: 4px; }
                        
                        .info-line { display: flex; gap: 4px; font-size: 10px; align-items: center; }
                        .info-label { font-weight: normal; color: #555; }
                        .info-val { font-weight: bold; }
                        
                        .desc-box { margin-bottom: 10px; padding: 5px 10px; font-size: 11px; display: flex; gap: 5px; }
                        
                        table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 10px; }
                        th, td { border: 1px solid #000; padding: 4px 6px; text-align: ${isRtl ? 'right' : 'left'}; }
                        th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; font-weight: bold; text-align: center; color: #1e293b; border-bottom: 2px solid #cbd5e1; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        
                        tr.hdr-group td { background-color: #e0e7ff !important; font-weight: bold; }
                        tr.hdr-general td { background-color: #e2e8f0 !important; font-weight: bold; padding-${isRtl ? 'right' : 'left'}: 15px; }
                        tr.hdr-sub td { background-color: #f8fafc !important; font-weight: bold; padding-${isRtl ? 'right' : 'left'}: 25px; }
                        
                        tfoot td { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; font-weight: bold; color: #1e293b; border-top: 2px solid #cbd5e1; }
                        
                        .signatures-grid {
                            display: grid;
                            grid-template-columns: repeat(${activeSignaturesList.length || 1}, 1fr);
                            gap: 10px;
                            margin-top: 40px;
                            text-align: center;
                        }
                        .sig-box { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
                        .sig-title { font-weight: bold; font-size: 11px; color: #333; margin-bottom: 30px; }
                        .sig-line { width: 80%; border-top: 1px dashed #666; margin-bottom: 5px; }
                        .sig-name { font-size: 11px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <div class="header-flex">
                            <div class="header-col header-start">
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره سند:' : 'Doc Code:'}</span><span class="info-val">${headerData.document_code}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'تاریخ سند:' : 'Date:'}</span><span class="info-val">${formatDate(headerData.document_date, printSettings.calendarType)}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره عطف:' : 'Ref Code:'}</span><span class="info-val">${headerData.reference_code || '-'}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'شماره روزانه:' : 'Daily No:'}</span><span class="info-val">${headerData.daily_number || '-'}</span></div>
                            </div>
                            
                            <div class="header-col header-center">
                                <h1 class="title">${isRtl ? 'سند حسابداری' : 'Accounting Voucher'}</h1>
                                ${printSettings.showStatus ? `<span class="badge">${
                            headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') :
                            headerData.status === 'FINAL' ? (isRtl ? 'بررسی شده' : 'Final') :
                            (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')
                        }</span>` : ''}
                            </div>
                            
                            <div class="header-col header-end">
                                <div class="info-line"><span class="info-label">${isRtl ? 'ثبت کننده:' : 'Prepared By:'}</span><span class="info-val">${usersMap[headerData.registrar_id] || headerData.registrar_id || '---'}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'بررسی کننده:' : 'Reviewed By:'}</span><span class="info-val">${headerData.reviewed_by_name || (headerData.reviewed_by ? (usersMap[headerData.reviewed_by] || headerData.reviewed_by) : '---')}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'تایید کننده:' : 'Approved By:'}</span><span class="info-val">${headerData.approved_by_name || (headerData.approved_by ? (usersMap[headerData.approved_by] || headerData.approved_by) : '---')}</span></div>
                                <div class="info-line"><span class="info-label">${isRtl ? 'دپارتمان:' : 'Department:'}</span><span class="info-val">${deptsMap[headerData.department_id] || '---'}</span></div>
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
                                    ${cols.map(c => `<th style="width: ${c.width}">${c.header}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHTML}
                            </tbody>
                            ${printSettings.showTotals ? `
                            <tfoot>
                                <tr>
                                    <td colspan="${cols.findIndex(c => c.field === 'deposit_amount')}" style="text-align: ${isRtl ? 'left' : 'right'}; padding-right: 10px; padding-left: 10px;">${isRtl ? 'جمع کل:' : 'Total:'}</td>
                                    <td class="text-right" dir="ltr">${formatNumberSafe(totals.debit)}</td>
                                    <td class="text-right" dir="ltr">${formatNumberSafe(totals.credit)}</td>
                                    ${printSettings.showCurrencies ? `
                                        <td class="text-right" dir="ltr">${formatNumberSafe(totals.usdDebit)}</td>
                                        <td class="text-right" dir="ltr">${formatNumberSafe(totals.irrDebit)}</td>
                                    ` : ''}
                                    <td></td>
                                </tr>
                            </tfoot>
                            ` : ''}
                        </table>

                        ${(printSettings.showSignatures && activeSignaturesList.length > 0) ? `
                            <div class="signatures-grid">
                                ${activeSignaturesList.map(sig => `
                                    <div class="sig-box">
                                        <span class="sig-title">${sig.label}</span>
                                        <div class="sig-line"></div>
                                        <span class="sig-name">${
                                            sig.key === 'preparer' ? (usersMap[headerData.registrar_id] || headerData.registrar_id || '---') :
                                            sig.key === 'checker' ? (
                                                (headerData.reviewed_by && usersMap[headerData.reviewed_by]) ||
                                                headerData.reviewed_by_name || '---'
                                            ) :
                                            sig.key === 'approver' ? (
                                                (headerData.approved_by && usersMap[headerData.approved_by]) ||
                                                headerData.approved_by_name || '---'
                                            ) :
                                            '---'
                                        }</span>
                                    </div>
                                `).join('')}
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

        const renderPrintPreview = () => {
            if (!headerData) return null;

            return React.createElement('div', { ref: printRef, className: "bg-white mx-auto w-full max-w-[1000px] border border-slate-300 shadow-sm text-slate-900 font-sans p-6" },
                React.createElement(Flex, { className: "border border-slate-800 rounded p-4 mb-4", align: "start", justify: "between" },
                    React.createElement(Flex, { direction: "col", gap: "xs", align: "start", className: "flex-1" },
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره سند:' : 'Doc Code:'), React.createElement(Text, { weight: "bold" }, headerData.document_code)),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'تاریخ سند:' : 'Date:'), React.createElement(Text, { weight: "bold" }, formatDate(headerData.document_date, printSettings.calendarType))),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره عطف:' : 'Ref Code:'), React.createElement(Text, { weight: "bold" }, headerData.reference_code || '-')),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره روزانه:' : 'Daily No:'), React.createElement(Text, { weight: "bold" }, headerData.daily_number || '-'))
                    ),
                    
                    React.createElement(Flex, { direction: "col", gap: "xs", align: "center", justify: "center", className: "flex-1" },
                        React.createElement(Text, { variant: "h2", className: "tracking-tight text-center" }, isRtl ? 'سند حسابداری' : 'Accounting Voucher'),
                        printSettings.showStatus && React.createElement(Badge, { variant: headerData.status === 'APPROVED' ? 'success' : headerData.status === 'FINAL' ? 'primary' : 'warning', className: "mt-1 border-slate-800 bg-transparent text-slate-800" },
                            headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') :
                            headerData.status === 'FINAL' ? (isRtl ? 'بررسی شده' : 'Final') :
                            (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')
                        )
                    ),

                    React.createElement(Flex, { direction: "col", gap: "xs", align: "end", className: "flex-1 text-left" },
                        React.createElement(Flex, { align: "center", gap: "xs", justify: isRtl ? "end" : "start", className: "w-full" }, React.createElement(Text, { variant: "caption", className: "whitespace-nowrap" }, isRtl ? 'ثبت کننده:' : 'Prepared By:'), React.createElement(Text, { weight: "bold" }, usersMap[headerData.registrar_id] || headerData.registrar_id || '---')),
                        React.createElement(Flex, { align: "center", gap: "xs", justify: isRtl ? "end" : "start", className: "w-full" }, React.createElement(Text, { variant: "caption", className: "whitespace-nowrap" }, isRtl ? 'بررسی کننده:' : 'Reviewed By:'), React.createElement(Text, { weight: "bold" }, headerData.reviewed_by_name || (headerData.reviewed_by ? (usersMap[headerData.reviewed_by] || headerData.reviewed_by) : '---'))),
                        React.createElement(Flex, { align: "center", gap: "xs", justify: isRtl ? "end" : "start", className: "w-full" }, React.createElement(Text, { variant: "caption", className: "whitespace-nowrap" }, isRtl ? 'تایید کننده:' : 'Approved By:'), React.createElement(Text, { weight: "bold" }, headerData.approved_by_name || (headerData.approved_by ? (usersMap[headerData.approved_by] || headerData.approved_by) : '---'))),
                        React.createElement(Flex, { align: "center", gap: "xs", justify: isRtl ? "end" : "start", className: "w-full" }, React.createElement(Text, { variant: "caption", className: "whitespace-nowrap" }, isRtl ? 'دپارتمان:' : 'Department:'), React.createElement(Text, { weight: "bold" }, deptsMap[headerData.department_id] || '---'))
                    )
                ),

                headerData.description && React.createElement(Flex, { className: "mb-3 px-2 gap-1" },
                    React.createElement(Text, { variant: "caption", className: "whitespace-nowrap font-bold" }, isRtl ? 'شرح سند:' : 'Description:'),
                    React.createElement(Text, null, headerData.description)
                ),

                React.createElement(SimplePrintTable, {
                    columns: getColumns(),
                    language: language,
                    showGroupTotals: printSettings.showGroupTotals,
                    totals: printSettings.showTotals ? {
                        label: isRtl ? 'جمع کل:' : 'Total:',
                        deposit: formatNumberSafe(totals.debit),
                        withdrawal: formatNumberSafe(totals.credit),
                        usdDebit: printSettings.showCurrencies ? formatNumberSafe(totals.usdDebit) : undefined,
                        irrDebit: printSettings.showCurrencies ? formatNumberSafe(totals.irrDebit) : undefined
                    } : null,
                    rows: getPreparedRows()
                }),

                (printSettings.showSignatures && activeSignaturesList.length > 0) && React.createElement('div', { 
                    className: "grid mt-10 pt-4 px-4 text-center text-slate-800",
                    style: { gridTemplateColumns: `repeat(${activeSignaturesList.length}, minmax(0, 1fr))` }
                },
                    activeSignaturesList.map(sig => React.createElement(Flex, { key: sig.key, direction: "col", gap: "sm", align: "center", justify: "end" },
                        React.createElement('span', { className: "text-xs font-bold text-slate-500 mb-6" }, sig.label),
                        React.createElement('div', { className: "w-3/4 border-t border-dashed border-slate-400 mb-1" }),
                        React.createElement('span', { className: "text-sm font-bold" }, 
                            sig.key === 'preparer' ? (usersMap[headerData.registrar_id] || headerData.registrar_id || '---') :
                            sig.key === 'checker' ? (
                                (headerData.reviewed_by && usersMap[headerData.reviewed_by]) ||
                                headerData.reviewed_by_name || '---'
                            ) :
                            sig.key === 'approver' ? (
                                (headerData.approved_by && usersMap[headerData.approved_by]) ||
                                headerData.approved_by_name || '---'
                            ) :
                            '---'
                        )
                    ))
                )
            );
        };

        return React.createElement(Modal, {
            isOpen: true,
            onClose: onClose,
            width: "max-w-[1200px] max-h-[90vh]",
            title: isRtl ? 'چاپ سند حسابداری' : 'Print Voucher'
        },
            React.createElement('div', { className: "w-full h-[80vh] flex flex-col relative bg-slate-100/50 dark:bg-slate-900", dir: isRtl ? 'rtl' : 'ltr' },
                
                React.createElement(Flex, { className: "p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 z-10 shadow-sm", justify: "between", align: "center" },
                    React.createElement(Button, { variant: "outline", icon: SafeSettingsIcon, onClick: () => setIsSettingsOpen(true) }, isRtl ? 'تنظیمات چاپ' : 'Print Settings'),
                    React.createElement(Button, { variant: "primary", icon: SafePrinterIcon, onClick: handlePrint, disabled: loading }, isRtl ? 'چاپ سند' : 'Print Document')
                ),

                React.createElement('div', { className: "xs:flex-1 flex flex-row relative min-h-0 overflow-hidden" },
                    
                    Drawer && React.createElement(Drawer, {
                        isOpen: isSettingsOpen,
                        onClose: () => setIsSettingsOpen(false),
                        title: isRtl ? 'تنظیمات خروجی' : 'Output Settings',
                        position: 'start',
                        language: language,
                        width: 'w-[280px]',
                        variant: 'inline',
                        footer: React.createElement(Button, { variant: "primary", fullWidth: true, icon: SafePrinterIcon, onClick: handlePrint, disabled: loading },
                            isRtl ? 'چاپ سند' : 'Print Document'
                        )
                    },
                        React.createElement(Flex, { direction: "col", gap: "md", className: "p-1" },
                            React.createElement(Select, {
                                label: isRtl ? 'تقویم' : 'Calendar',
                                options: calendarOptions,
                                value: printSettings.calendarType,
                                onChange: (val) => handleSettingChange('calendarType', val),
                                fullWidth: true
                            }),
                            
                            React.createElement(Divider, { margin: "sm" }),
                            
                            React.createElement(Flex, { direction: "col", gap: "sm" },
                                React.createElement(Text, { variant: "caption", weight: "bold", className: "mb-1 text-slate-400" }, isRtl ? 'سطح نمایش حساب' : 'Account Level'),
                                React.createElement(Checkbox, { label: isRtl ? 'گروه حساب' : 'Account Group', checked: printSettings.accountLevels.group, onChange: (val) => handleSettingChange('accountLevels', {...printSettings.accountLevels, group: val}) }),
                                React.createElement(Checkbox, { label: isRtl ? 'حساب کل' : 'General Account', checked: printSettings.accountLevels.general, onChange: (val) => handleSettingChange('accountLevels', {...printSettings.accountLevels, general: val}) }),
                                React.createElement(Checkbox, { label: isRtl ? 'حساب معین' : 'Subsidiary Account', checked: printSettings.accountLevels.subsidiary, onChange: (val) => handleSettingChange('accountLevels', {...printSettings.accountLevels, subsidiary: val}) })
                            ),

                            React.createElement(Divider, { margin: "sm" }),

                            React.createElement(Flex, { direction: "col", gap: "sm" },
                                React.createElement(Text, { variant: "caption", weight: "bold", className: "mb-1 text-slate-400" }, isRtl ? 'گزینه‌های نمایش' : 'Display Options'),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش جمع کل' : 'Show Totals', checked: printSettings.showTotals, onChange: (val) => handleSettingChange('showTotals', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش مبالغ ارزی' : 'Show Currencies', checked: printSettings.showCurrencies, onChange: (val) => handleSettingChange('showCurrencies', val) }),
                                printSettings.showCurrencies && React.createElement(Checkbox, { label: isRtl ? 'نمایش مجموع سطوح گروهبندی' : 'Show Totals for Group Levels', checked: printSettings.showGroupTotals, onChange: (val) => handleSettingChange('showGroupTotals', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش وضعیت سند' : 'Show Status', checked: printSettings.showStatus, onChange: (val) => handleSettingChange('showStatus', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش محل امضاها' : 'Show Signatures Section', checked: printSettings.showSignatures, onChange: (val) => handleSettingChange('showSignatures', val) })
                            ),

                            printSettings.showSignatures && React.createElement(Flex, { direction: "col", gap: "sm", className: "mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700" },
                                React.createElement(Text, { variant: "caption", weight: "bold", className: "mb-1 text-slate-500" }, isRtl ? 'انتخاب امضاکنندگان (حداکثر ۴)' : 'Select Signatories (Max 4)'),
                                signatureOptions.map(opt => React.createElement(Checkbox, { 
                                    key: opt.key, 
                                    label: opt.label, 
                                    checked: printSettings.signatures[opt.key], 
                                    onChange: (val) => handleSignatureToggle(opt.key, val),
                                    disabled: !printSettings.signatures[opt.key] && activeSignaturesList.length >= 4
                                }))
                            )
                        )
                    ),

                    React.createElement('div', { className: "flex-1 overflow-y-auto p-4 md:p-8 flex items-start justify-center w-full" },
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