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
                    React.createElement('div', { className: "p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80" },
                        React.createElement('h2', { className: "text-lg font-bold text-slate-800 dark:text-slate-100" }, title),
                        React.createElement('button', { onClick: onClose, className: "text-slate-500 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" }, '✕')
                    ),
                    React.createElement('div', { className: "p-0 flex-1 overflow-auto max-h-[90vh] bg-slate-100/50 dark:bg-slate-900 flex relative" }, children)
                )
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

    const SimplePrintTable = ({ columns, data, totals, language }) => {
        const isRtl = language === 'fa';
        return React.createElement('div', { className: "w-full overflow-hidden border border-slate-400 mt-4 rounded shadow-sm" },
            React.createElement('table', { className: `w-full text-[11px] text-slate-900 border-collapse ${isRtl ? 'text-right' : 'text-left'}` },
                React.createElement('thead', { style: { backgroundColor: 'lavender' }, className: "border-b-2 border-slate-400" },
                    React.createElement('tr', null,
                        columns.map((c, i) => React.createElement('th', { key: i, className: "px-2 py-2 font-bold text-center border-x border-slate-300 text-slate-800", style: { width: c.width } }, c.header))
                    )
                ),
                React.createElement('tbody', null,
                    data.map((row, i) => React.createElement('tr', { key: i, className: "border-b border-slate-300 last:border-b-0 hover:bg-slate-50" },
                        columns.map((c, j) => React.createElement('td', { key: j, className: `px-2 py-2 border-x border-slate-300 ${c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left'}`, dir: c.align === 'right' ? 'ltr' : 'auto' }, row[c.field] || '-'))
                    ))
                ),
                totals && React.createElement('tfoot', { className: "bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-800" },
                    React.createElement('tr', null,
                        React.createElement('td', { 
                            colSpan: columns.findIndex(c => c.field === 'deposit_amount'), 
                            className: `px-3 py-2 border-x border-slate-300 ${isRtl ? 'text-left' : 'text-right'}` 
                        }, totals.label),
                        React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-300 font-extrabold", dir: "ltr" }, totals.deposit),
                        React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-300 font-extrabold", dir: "ltr" }, totals.withdrawal),
                        totals.usdDebit !== undefined && React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-300 font-extrabold", dir: "ltr" }, totals.usdDebit),
                        totals.irrDebit !== undefined && React.createElement('td', { className: "px-2 py-2 text-right border-x border-slate-300 font-extrabold", dir: "ltr" }, totals.irrDebit),
                        React.createElement('td', { className: "border-x border-slate-300" })
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
        const [currencyRates, setCurrencyRates] = useState({});
        const [isSettingsOpen, setIsSettingsOpen] = useState(true);
        
        const [printSettings, setPrintSettings] = useState({
            accountLevel: 'subsidiary', 
            calendarType: 'jalali',
            showTotals: true,
            showCurrencies: true,
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

        const accountLevelOptions = [
            { value: 'subsidiary', label: isRtl ? 'سطح معین' : 'Subsidiary Level' },
            { value: 'general', label: isRtl ? 'سطح کل' : 'General Level' },
            { value: 'group', label: isRtl ? 'سطح گروه' : 'Group Level' }
        ];

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
                fetchUsers();
            }
        }, [transactionId]);

        useEffect(() => {
            if (headerData?.document_date && supabase) {
                const fetchRates = async () => {
                    try {
                        const formattedDate = headerData.document_date.replace(/\//g, '-');
                        const { data } = await supabase.from('fm_currency_rates')
                            .select('base_currency, target_currency, rate, rate_date')
                            .lte('rate_date', formattedDate)
                            .order('rate_date', { ascending: false });
                        
                        const latestRates = {};
                        (data || []).forEach(r => {
                            const key = `${r.base_currency}_${r.target_currency}`;
                            if (!latestRates[key]) latestRates[key] = r.rate;
                        });
                        setCurrencyRates(latestRates);
                    } catch (e) {}
                };
                fetchRates();
            }
        }, [headerData?.document_date, supabase]);

        const getExchangeRates = useCallback((currency) => {
            let toUsd = 1;
            if (currency !== 'USD') {
                const direct = currencyRates[`${currency}_USD`];
                if (direct) {
                    toUsd = direct;
                } else {
                    const inverse = currencyRates[`USD_${currency}`];
                    if (inverse) toUsd = 1 / inverse;
                }
            }
            
            let usdToIrr = currencyRates[`USD_IRR`] || 1;
            if (!currencyRates[`USD_IRR`] && currencyRates[`IRR_USD`]) {
                 usdToIrr = 1 / currencyRates[`IRR_USD`];
            }
            
            return { toUsd, usdToIrr };
        }, [currencyRates]);

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
                const amt = parseFloat(item.amount || 0);
                const cur = item.currency || item.currency_code || 'IRR';
                const { toUsd, usdToIrr } = getExchangeRates(cur);
                const usdVal = amt * toUsd;
                const irrVal = usdVal * usdToIrr;

                if (item.transaction_action === 'DEPOSIT') {
                    debit += amt;
                    usdDebit += usdVal;
                    irrDebit += irrVal;
                } else {
                    credit += amt;
                    usdCredit += usdVal;
                    irrCredit += irrVal;
                }
            });

            return { debit, credit, usdDebit, usdCredit, irrDebit, irrCredit };
        };

        const totals = calculateTotals();

        const getColumns = () => {
            let cols = [
                { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '30px', align: 'center' },
                { field: 'account_code', header_fa: 'کد حساب', header_en: 'Account Code', width: '80px', align: 'center' },
                { field: 'account_name', header_fa: 'نام حساب', header_en: 'Account Name', width: 'auto', align: isRtl ? 'right' : 'left' },
                { field: 'currency', header_fa: 'ارز', header_en: 'Cur', width: '40px', align: 'center' },
                { field: 'deposit_amount', header_fa: 'مبلغ واریز', header_en: 'Deposit', width: '90px', align: 'right' },
                { field: 'withdrawal_amount', header_fa: 'مبلغ برداشت', header_en: 'Withdrawal', width: '90px', align: 'right' }
            ];

            if (printSettings.showCurrencies) {
                cols.push(
                    { field: 'usd_amount', header_fa: 'مبلغ (دلار)', header_en: 'Amount (USD)', width: '90px', align: 'right' },
                    { field: 'irr_amount', header_fa: 'مبلغ (ریال)', header_en: 'Amount (IRR)', width: '100px', align: 'right' }
                );
            }

            cols.push({ field: 'description', header_fa: 'شرح', header_en: 'Description', width: '25%', align: isRtl ? 'right' : 'left' });

            return cols.map(c => ({ ...c, header: isRtl ? c.header_fa : c.header_en }));
        };

        const activeSignaturesList = signatureOptions.filter(opt => printSettings.signatures[opt.key]);

        const getPreparedItems = () => {
            return itemsData.map((item, index) => {
                const accName = isRtl ? item.fm_coa_accounts?.title_fa : item.fm_coa_accounts?.title_en;
                const cur = item.currency || item.currency_code || 'IRR';
                const amt = parseFloat(item.amount || 0);
                const { toUsd, usdToIrr } = getExchangeRates(cur);
                const usdVal = amt * toUsd;
                const irrVal = usdVal * usdToIrr;

                return {
                    row_number: index + 1,
                    account_code: item.fm_coa_accounts?.code || '-',
                    account_name: accName || '-',
                    currency: cur,
                    deposit_amount: item.transaction_action === 'DEPOSIT' ? formatNumberSafe(item.amount) : '-',
                    withdrawal_amount: item.transaction_action === 'WITHDRAWAL' ? formatNumberSafe(item.amount) : '-',
                    usd_amount: formatNumberSafe(usdVal),
                    irr_amount: formatNumberSafe(irrVal),
                    description: item.description || '-'
                };
            });
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
                        th { background-color: lavender !important; -webkit-print-color-adjust: exact; font-weight: bold; text-align: center; color: #000; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        
                        tfoot td { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; font-weight: bold; }
                        
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
                                ${printSettings.showStatus ? `<span class="badge">${headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')}</span>` : ''}
                            </div>
                            
                            <div class="header-col header-end">
                                <div class="info-line"><span class="info-label">${isRtl ? 'ثبت کننده:' : 'Prepared By:'}</span><span class="info-val">${usersMap[headerData.registrar_id] || headerData.registrar_id || '---'}</span></div>
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
                                    <th style="width: 12%">${isRtl ? 'کد حساب' : 'Code'}</th>
                                    <th style="width: 20%">${isRtl ? 'نام حساب' : 'Account Name'}</th>
                                    <th style="width: 5%">${isRtl ? 'ارز' : 'Cur'}</th>
                                    <th style="width: 12%">${isRtl ? 'مبلغ واریز' : 'Deposit'}</th>
                                    <th style="width: 12%">${isRtl ? 'مبلغ برداشت' : 'Withdrawal'}</th>
                                    ${printSettings.showCurrencies ? `<th>${isRtl ? 'مبلغ (دلار)' : 'Amount (USD)'}</th><th>${isRtl ? 'مبلغ (ریال)' : 'Amount (IRR)'}</th>` : ''}
                                    <th style="width: 25%">${isRtl ? 'شرح' : 'Description'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${getPreparedItems().map((item) => `
                                    <tr>
                                        <td class="text-center">${item.row_number}</td>
                                        <td class="text-center">${item.account_code}</td>
                                        <td class="text-${isRtl ? 'right' : 'left'}">${item.account_name}</td>
                                        <td class="text-center">${item.currency}</td>
                                        <td class="text-right" dir="ltr">${item.deposit_amount}</td>
                                        <td class="text-right" dir="ltr">${item.withdrawal_amount}</td>
                                        ${printSettings.showCurrencies ? `
                                            <td class="text-right" dir="ltr">${item.usd_amount}</td>
                                            <td class="text-right" dir="ltr">${item.irr_amount}</td>
                                        ` : ''}
                                        <td class="text-${isRtl ? 'right' : 'left'}">${item.description}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            ${printSettings.showTotals ? `
                            <tfoot>
                                <tr>
                                    <td colspan="4" style="text-align: ${isRtl ? 'left' : 'right'}; padding-right: 10px; padding-left: 10px;">${isRtl ? 'جمع کل:' : 'Total:'}</td>
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
                                        <span class="sig-name">${sig.key === 'preparer' ? (usersMap[headerData.registrar_id] || headerData.registrar_id || '---') : '---'}</span>
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

            return React.createElement('div', { ref: printRef, className: "bg-white mx-auto w-full max-w-[950px] border border-slate-300 shadow-sm text-slate-900 font-sans p-6" },
                React.createElement(Flex, { className: "border border-slate-800 rounded p-4 mb-4", align: "start", justify: "between" },
                    React.createElement(Flex, { direction: "col", gap: "xs", align: "start", className: "flex-1" },
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره سند:' : 'Doc Code:'), React.createElement(Text, { weight: "bold" }, headerData.document_code)),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'تاریخ سند:' : 'Date:'), React.createElement(Text, { weight: "bold" }, formatDate(headerData.document_date, printSettings.calendarType))),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره عطف:' : 'Ref Code:'), React.createElement(Text, { weight: "bold" }, headerData.reference_code || '-')),
                        React.createElement(Flex, { align: "center", gap: "xs" }, React.createElement(Text, { variant: "caption", className: "w-20" }, isRtl ? 'شماره روزانه:' : 'Daily No:'), React.createElement(Text, { weight: "bold" }, headerData.daily_number || '-'))
                    ),
                    
                    React.createElement(Flex, { direction: "col", gap: "xs", align: "center", justify: "center", className: "flex-1" },
                        React.createElement(Text, { variant: "h2", className: "tracking-tight text-center" }, isRtl ? 'سند حسابداری' : 'Accounting Voucher'),
                        printSettings.showStatus && React.createElement(Badge, { variant: headerData.status === 'APPROVED' ? 'success' : 'warning', className: "mt-1 border-slate-800 bg-transparent text-slate-800" },
                            headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')
                        )
                    ),

                    React.createElement(Flex, { direction: "col", gap: "xs", align: "end", className: "flex-1 text-left" },
                        React.createElement(Flex, { align: "center", gap: "xs", justify: isRtl ? "end" : "start", className: "w-full" }, React.createElement(Text, { variant: "caption", className: "whitespace-nowrap" }, isRtl ? 'ثبت کننده:' : 'Prepared By:'), React.createElement(Text, { weight: "bold" }, usersMap[headerData.registrar_id] || headerData.registrar_id || '---')),
                        React.createElement(Flex, { align: "center", gap: "xs", justify: isRtl ? "end" : "start", className: "w-full" }, React.createElement(Text, { variant: "caption", className: "whitespace-nowrap" }, isRtl ? 'تایید کننده:' : 'Approved By:'), React.createElement(Text, { weight: "bold" }, '---'))
                    )
                ),

                headerData.description && React.createElement(Flex, { className: "mb-3 px-2 gap-1" },
                    React.createElement(Text, { variant: "caption", className: "whitespace-nowrap font-bold" }, isRtl ? 'شرح سند:' : 'Description:'),
                    React.createElement(Text, null, headerData.description)
                ),

                React.createElement(SimplePrintTable, {
                    columns: getColumns(),
                    language: language,
                    totals: printSettings.showTotals ? {
                        label: isRtl ? 'جمع کل:' : 'Total:',
                        deposit: formatNumberSafe(totals.debit),
                        withdrawal: formatNumberSafe(totals.credit),
                        usdDebit: printSettings.showCurrencies ? formatNumberSafe(totals.usdDebit) : undefined,
                        irrDebit: printSettings.showCurrencies ? formatNumberSafe(totals.irrDebit) : undefined
                    } : null,
                    data: getPreparedItems()
                }),

                (printSettings.showSignatures && activeSignaturesList.length > 0) && React.createElement('div', { 
                    className: "grid mt-10 pt-4 px-4 text-center text-slate-800",
                    style: { gridTemplateColumns: `repeat(${activeSignaturesList.length}, minmax(0, 1fr))` }
                },
                    activeSignaturesList.map(sig => React.createElement(Flex, { key: sig.key, direction: "col", gap: "sm", align: "center", justify: "end" },
                        React.createElement('span', { className: "text-xs font-bold text-slate-500 mb-6" }, sig.label),
                        React.createElement('div', { className: "w-3/4 border-t border-dashed border-slate-400 mb-1" }),
                        React.createElement('span', { className: "text-sm font-bold" }, sig.key === 'preparer' ? (usersMap[headerData.registrar_id] || headerData.registrar_id || '---') : '---')
                    ))
                )
            );
        };

        return React.createElement(Modal, {
            isOpen: true,
            onClose: onClose,
            width: "max-w-[1200px]",
            title: isRtl ? 'چاپ سند حسابداری' : 'Print Voucher'
        },
            React.createElement('div', { className: "w-full h-full flex flex-row relative", dir: isRtl ? 'rtl' : 'ltr' },
                React.createElement('div', { className: `relative flex flex-col bg-white dark:bg-slate-800 border-x border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out shrink-0 z-20 shadow-md ${isSettingsOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}` },
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
                            
                            React.createElement(Flex, { direction: "col", gap: "sm" },
                                React.createElement(Text, { variant: "caption", weight: "bold", className: "mb-1 text-slate-400" }, isRtl ? 'گزینه‌های نمایش' : 'Display Options'),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش جمع کل' : 'Show Totals', checked: printSettings.showTotals, onChange: (val) => handleSettingChange('showTotals', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش مبالغ ارزی' : 'Show Currencies', checked: printSettings.showCurrencies, onChange: (val) => handleSettingChange('showCurrencies', val) }),
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
                    
                    React.createElement('div', { className: "p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 w-[260px]" },
                        React.createElement(Button, { variant: "primary", fullWidth: true, icon: SafePrinterIcon, onClick: handlePrint, disabled: loading },
                            isRtl ? 'چاپ سند' : 'Print Document'
                        )
                    )
                ),

                React.createElement('div', { className: "flex-1 flex flex-col min-w-0 bg-slate-100/50 dark:bg-slate-900 relative" },
                    React.createElement('button', {
                        onClick: () => setIsSettingsOpen(!isSettingsOpen),
                        className: `absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-6 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md text-slate-500 hover:text-indigo-600 transition-all cursor-pointer hover:bg-slate-50 ${isRtl ? 'right-0 rounded-l-md border-r-0' : 'left-0 rounded-r-md border-l-0'}`,
                        title: isRtl ? 'تنظیمات' : 'Settings'
                    },
                        isRtl 
                            ? (isSettingsOpen ? React.createElement(SafeChevronRightIcon, { size: 14 }) : React.createElement(SafeChevronLeftIcon, { size: 14 })) 
                            : (isSettingsOpen ? React.createElement(SafeChevronLeftIcon, { size: 14 }) : React.createElement(SafeChevronRightIcon, { size: 14 }))
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