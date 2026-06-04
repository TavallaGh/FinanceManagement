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

    // Safe Static Icons that will NEVER trigger React Error #130
    const SafePrinterIcon = ({ size = 18 }) => React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('polyline', { points: '6 9 6 2 18 2 18 9' }),
        React.createElement('path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }),
        React.createElement('rect', { x: '6', y: '14', width: '12', height: '8' })
    );

    const SafeSettingsIcon = ({ size = 18 }) => React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: '12', cy: '12', r: '3' }),
        React.createElement('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' })
    );

    const SafeFileTextIcon = ({ size = 18 }) => React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
        React.createElement('polyline', { points: '14 2 14 8 20 8' }),
        React.createElement('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
        React.createElement('line', { x1: '16', y1: '17', x2: '8', y2: '17' }),
        React.createElement('polyline', { points: '10 9 9 9 8 9' })
    );

    const Card = safeGet('Card') || (({ children }) => React.createElement('div', { className: "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden" }, children));
    const CardHeader = safeGet('CardHeader') || (({ title, icon }) => React.createElement('div', { className: "p-4 border-b border-slate-200 dark:border-slate-700 font-bold flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50" }, icon, title));
    const CardBody = safeGet('CardBody') || (({ children, className }) => React.createElement('div', { className: `p-4 flex-1 ${className || ''}` }, children));
    
    const Flex = safeGet('Flex') || (({ children, direction = 'row', gap = 'md', align = 'stretch', justify = 'start', className = '' }) => {
        const gapCls = gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4';
        const dirCls = direction === 'col' ? 'flex-col' : 'flex-row';
        const alignCls = align === 'center' ? 'items-center' : 'items-stretch';
        const justCls = justify === 'center' ? 'justify-center' : justify === 'between' ? 'justify-between' : justify === 'end' ? 'justify-end' : 'justify-start';
        return React.createElement('div', { className: `flex ${dirCls} ${gapCls} ${alignCls} ${justCls} ${className}` }, children);
    });

    const Grid = safeGet('Grid') || (({ children, cols = 1, span, gap = 'md' }) => {
        const gapCls = gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4';
        const colsCls = cols === 12 ? 'grid-cols-12' : cols === 3 ? 'grid-cols-3' : 'grid-cols-1';
        const spanCls = span ? `col-span-${span}` : '';
        return React.createElement('div', { className: `grid ${colsCls} ${gapCls} ${spanCls}` }, children);
    });

    const Text = safeGet('Text') || (({ children, variant = 'body', weight = 'normal', color = 'default' }) => {
        let cls = 'text-sm text-slate-700 dark:text-slate-300';
        if (variant === 'h3') cls = 'text-lg font-bold text-slate-900 dark:text-white';
        if (variant === 'caption') cls = 'text-xs text-slate-500';
        if (weight === 'bold') cls += ' font-bold';
        if (color === 'primary') cls += ' text-indigo-600 dark:text-indigo-400';
        if (color === 'secondary') cls += ' text-slate-500 dark:text-slate-400';
        return React.createElement('span', { className: cls }, children);
    });

    const Button = safeGet('Button') || (({ children, onClick, disabled, fullWidth, icon }) => React.createElement(
        'button', 
        { onClick, disabled, className: `flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 ${fullWidth ? 'w-full' : ''}` }, 
        icon, children
    ));

    const Badge = safeGet('Badge') || (({ children, variant = 'primary' }) => {
        const colors = {
            success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
            warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200',
            primary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200'
        };
        return React.createElement('span', { className: `px-2 py-1 text-xs font-bold border rounded-md ${colors[variant] || colors.primary}` }, children);
    });

    const Divider = safeGet('Divider') || (({ margin = 'md' }) => {
        const my = margin === 'sm' ? 'my-2' : margin === 'lg' ? 'my-6' : 'my-4';
        return React.createElement('hr', { className: `border-slate-200 dark:border-slate-700 w-full ${my}` });
    });

    const Container = safeGet('Container') || (({ children, className }) => React.createElement('div', { className: `w-full flex flex-col gap-6 ${className || ''}` }, children));

    let Modal = safeGet('Modal');
    if (!Modal) {
        Modal = ({ isOpen, onClose, title, children, size }) => {
            if (!isOpen) return null;
            return React.createElement('div', { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" },
                React.createElement('div', { className: `bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 ${size === 'xl' ? 'max-w-[1200px]' : 'max-w-[800px]'}` },
                    React.createElement('div', { className: "p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80" },
                        React.createElement('h2', { className: "text-lg font-bold text-slate-800 dark:text-slate-100" }, title),
                        React.createElement('button', { onClick: onClose, className: "text-slate-500 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" }, '✕')
                    ),
                    React.createElement('div', { className: "p-6 flex-1 overflow-auto max-h-[85vh]" }, children)
                )
            );
        };
    }

    const Checkbox = safeGet('Checkbox') || (({ label, checked, onChange }) => React.createElement(
        'label', { className: "flex items-center gap-3 text-sm cursor-pointer group" },
        React.createElement('input', { type: "checkbox", checked, onChange: (e) => onChange(e.target.checked), className: "w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" }),
        React.createElement('span', { className: "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" }, label)
    ));

    const Select = safeGet('Select') || (({ label, options, value, onChange, fullWidth }) => React.createElement(
        'div', { className: `flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}` },
        React.createElement('label', { className: "text-xs font-medium text-slate-600 dark:text-slate-400" }, label),
        React.createElement('select', { value, onChange: (e) => onChange(e.target.value), className: "w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 outline-none" },
            options.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))
        )
    ));

    let Table = safeGet('Table') || safeGet('DataGrid');
    if (!Table) {
        Table = ({ columns, data, striped }) => React.createElement(
            'div', { className: "w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700" },
            React.createElement('table', { className: "w-full text-sm text-left rtl:text-right border-collapse" },
                React.createElement('thead', { className: "text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700" },
                    React.createElement('tr', null, columns.map((c, i) => React.createElement('th', { key: i, className: "px-4 py-3 whitespace-nowrap", style: { width: c.width } }, c.header)))
                ),
                React.createElement('tbody', null, data.map((row, i) => React.createElement(
                    'tr', { key: i, className: `border-b dark:border-slate-700 ${striped && i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/30' : 'bg-white dark:bg-slate-900'}` },
                    columns.map((c, j) => React.createElement('td', { key: j, className: "px-4 py-3 text-slate-700 dark:text-slate-300" }, row[c.field] || '-'))
                )))
            )
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
            } catch (error) {} finally {
                setLoading(false);
            }
        };

        const handleSettingChange = (settingKey, value) => {
            setPrintSettings(prev => ({ ...prev, [settingKey]: value }));
        };

        const handlePrint = () => {
            const printContent = printRef.current;
            if (!printContent) return;

            const printStyles = `
                <style>
                    @media print {
                        body * { visibility: hidden; }
                        #printable-area, #printable-area * { visibility: visible; }
                        #printable-area { position: absolute; left: 0; top: 0; width: 100%; direction: ${isRtl ? 'rtl' : 'ltr'}; font-family: Tahoma, Arial, sans-serif; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isRtl ? 'right' : 'left'}; font-size: 12px; color: #000; }
                        th { background-color: #f3f4f6; font-weight: bold; }
                        h1 { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #000; }
                        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                        .info-item { display: flex; flex-direction: column; gap: 5px; }
                        .info-label { font-size: 11px; color: #555; }
                        .info-value { font-size: 14px; font-weight: bold; color: #000; }
                        .full-width { grid-column: span 3; border-top: 1px solid #eee; padding-top: 10px; margin-top: 5px; }
                        .totals-box { display: flex; justify-content: flex-end; gap: 40px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-top: 15px; }
                        .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; text-align: center; }
                        .sig-label { font-size: 12px; color: #555; font-weight: bold; margin-bottom: 30px; }
                        .sig-value { font-size: 14px; font-weight: bold; color: #000; }
                        .status-badge { display: inline-block; padding: 4px 12px; border: 1px solid #000; border-radius: 15px; font-size: 12px; font-weight: bold; margin-top: 5px; }
                    }
                </style>
            `;

            const printHTML = `
                <div id="printable-area">
                    <h1>${isRtl ? 'سند حسابداری' : 'Accounting Voucher'}</h1>
                    ${printSettings.showStatus ? `<div style="text-align: center; margin-bottom: 20px;"><span class="status-badge">${headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')}</span></div>` : ''}
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">${isRtl ? 'شماره سند:' : 'Doc Code:'}</span>
                            <span class="info-value">${headerData.document_code}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">${isRtl ? 'تاریخ سند:' : 'Date:'}</span>
                            <span class="info-value">${headerData.document_date ? new Date(headerData.document_date).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : '-'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">${isRtl ? 'شماره عطف:' : 'Ref Code:'}</span>
                            <span class="info-value">${headerData.reference_code || '-'}</span>
                        </div>
                        <div class="info-item full-width">
                            <span class="info-label">${isRtl ? 'شرح سند:' : 'Description:'}</span>
                            <span class="info-value" style="font-weight: normal;">${headerData.description || '-'}</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>${isRtl ? 'ردیف' : 'Row'}</th>
                                <th>${isRtl ? 'کد حساب' : 'Account Code'}</th>
                                <th>${isRtl ? 'نام حساب' : 'Account Name'}</th>
                                <th>${isRtl ? 'شرح آرتیکل' : 'Description'}</th>
                                <th>${isRtl ? 'بدهکار' : 'Debit'}</th>
                                <th>${isRtl ? 'بستانکار' : 'Credit'}</th>
                                ${printSettings.showCurrencies ? `<th>${isRtl ? 'بدهکار (ارزی)' : 'Debit (FC)'}</th><th>${isRtl ? 'بستانکار (ارزی)' : 'Credit (FC)'}</th>` : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsData.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.fm_coa_accounts?.code || '-'}</td>
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
                        <div class="totals-box">
                            <div class="info-item" style="flex-direction: row; align-items: center; gap: 10px;">
                                <span class="info-label">${isRtl ? 'جمع بدهکار:' : 'Total Debit:'}</span>
                                <span class="info-value">${calculateTotals().debit.toLocaleString()}</span>
                            </div>
                            <div class="info-item" style="flex-direction: row; align-items: center; gap: 10px;">
                                <span class="info-label">${isRtl ? 'جمع بستانکار:' : 'Total Credit:'}</span>
                                <span class="info-value">${calculateTotals().credit.toLocaleString()}</span>
                            </div>
                        </div>
                    ` : ''}

                    ${printSettings.showSummary ? `
                        <div class="signatures">
                            <div class="info-item">
                                <span class="sig-label">${isRtl ? 'تنظیم کننده' : 'Prepared By'}</span>
                                <span class="sig-value">${usersMap[headerData.registrar_id] || headerData.registrar_id || '---'}</span>
                            </div>
                            <div class="info-item">
                                <span class="sig-label">${isRtl ? 'بررسی کننده' : 'Checked By'}</span>
                                <span class="sig-value">---</span>
                            </div>
                            <div class="info-item">
                                <span class="sig-label">${isRtl ? 'تایید کننده' : 'Approved By'}</span>
                                <span class="sig-value">---</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.body.innerHTML = printStyles + printHTML;
            window.print();
            window.location.reload(); 
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
                { field: 'row_number', header: isRtl ? 'ردیف' : 'Row', width: '60px' },
                { field: 'account_code', header: isRtl ? 'کد حساب' : 'Account Code', width: '120px' },
                { field: 'account_name', header: isRtl ? 'نام حساب' : 'Account Name', width: 'auto' },
                { field: 'description', header: isRtl ? 'شرح آرتیکل' : 'Description', width: 'auto' },
                { field: 'debit_amount', header: isRtl ? 'بدهکار' : 'Debit', width: '150px' },
                { field: 'credit_amount', header: isRtl ? 'بستانکار' : 'Credit', width: '150px' }
            ];

            if (printSettings.showCurrencies) {
                cols.splice(4, 0, 
                    { field: 'fc_debit_amount', header: isRtl ? 'بدهکار (ارزی)' : 'Debit (FC)', width: '120px' },
                    { field: 'fc_credit_amount', header: isRtl ? 'بستانکار (ارزی)' : 'Credit (FC)', width: '120px' }
                );
            }

            return cols;
        };

        const renderPrintPreview = () => {
            if (!headerData) return null;

            return React.createElement(Container, { className: "bg-white dark:bg-slate-900 rounded-xl" },
                React.createElement('div', { ref: printRef, className: "p-8 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm bg-white text-slate-900" },
                    React.createElement(Flex, { direction: "col", gap: "lg", align: "center", justify: "center", className: "mb-6" },
                        React.createElement('h1', { className: "text-2xl font-bold text-slate-900" }, isRtl ? 'سند حسابداری' : 'Accounting Voucher'),
                        printSettings.showStatus && React.createElement('span', { className: `px-4 py-1 rounded-full text-sm font-bold border ${headerData.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}` },
                            headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')
                        )
                    ),
                    
                    React.createElement('div', { className: "grid grid-cols-3 gap-6 mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg" },
                        React.createElement(Flex, { direction: "col", gap: "sm" },
                            React.createElement('span', { className: "text-xs text-slate-500 font-medium" }, isRtl ? 'شماره سند:' : 'Doc Code:'),
                            React.createElement('span', { className: "text-base font-bold text-indigo-700" }, headerData.document_code)
                        ),
                        React.createElement(Flex, { direction: "col", gap: "sm" },
                            React.createElement('span', { className: "text-xs text-slate-500 font-medium" }, isRtl ? 'تاریخ سند:' : 'Date:'),
                            React.createElement('span', { className: "text-base font-bold" }, headerData.document_date ? new Date(headerData.document_date).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : '-')
                        ),
                        React.createElement(Flex, { direction: "col", gap: "sm" },
                            React.createElement('span', { className: "text-xs text-slate-500 font-medium" }, isRtl ? 'شماره عطف:' : 'Ref Code:'),
                            React.createElement('span', { className: "text-base font-bold" }, headerData.reference_code || '-')
                        ),
                        React.createElement(Flex, { direction: "col", gap: "sm", className: "col-span-3 mt-2 pt-4 border-t border-slate-200" },
                            React.createElement('span', { className: "text-xs text-slate-500 font-medium" }, isRtl ? 'شرح سند:' : 'Description:'),
                            React.createElement('span', { className: "text-sm" }, headerData.description || '-')
                        )
                    ),

                    React.createElement(Table, {
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
                        })),
                        striped: true
                    }),
                    
                    printSettings.showTotals && React.createElement('div', { className: "flex justify-end gap-12 p-4 mt-4 bg-indigo-50 border border-indigo-100 rounded-lg" },
                        React.createElement(Flex, { direction: "row", gap: "md", align: "center" },
                            React.createElement('span', { className: "text-sm font-bold text-slate-700" }, isRtl ? 'جمع بدهکار:' : 'Total Debit:'),
                            React.createElement('span', { className: "text-lg font-bold text-indigo-700" }, totals.debit.toLocaleString())
                        ),
                        React.createElement(Flex, { direction: "row", gap: "md", align: "center" },
                            React.createElement('span', { className: "text-sm font-bold text-slate-700" }, isRtl ? 'جمع بستانکار:' : 'Total Credit:'),
                            React.createElement('span', { className: "text-lg font-bold text-indigo-700" }, totals.credit.toLocaleString())
                        )
                    ),

                    printSettings.showSummary && React.createElement('div', { className: "grid grid-cols-3 gap-8 mt-12 p-6 border border-slate-200 rounded-lg" },
                        React.createElement(Flex, { direction: "col", gap: "md", align: "center" },
                            React.createElement('span', { className: "text-sm text-slate-500 font-bold mb-8" }, isRtl ? 'تنظیم کننده' : 'Prepared By'),
                            React.createElement('span', { className: "text-base font-medium" }, usersMap[headerData.registrar_id] || headerData.registrar_id || '---')
                        ),
                        React.createElement(Flex, { direction: "col", gap: "md", align: "center" },
                            React.createElement('span', { className: "text-sm text-slate-500 font-bold mb-8" }, isRtl ? 'بررسی کننده' : 'Checked By'),
                            React.createElement('span', { className: "text-base font-medium" }, '---')
                        ),
                        React.createElement(Flex, { direction: "col", gap: "md", align: "center" },
                            React.createElement('span', { className: "text-sm text-slate-500 font-bold mb-8" }, isRtl ? 'تایید کننده' : 'Approved By'),
                            React.createElement('span', { className: "text-base font-medium" }, '---')
                        )
                    )
                )
            );
        };

        return React.createElement(Modal, {
            isOpen: true,
            onClose: onClose,
            size: "xl",
            title: isRtl ? 'چاپ سند حسابداری' : 'Print Voucher',
            language: language
        },
            React.createElement(Grid, { cols: 12, gap: "lg" },
                React.createElement(Grid, { span: 3, direction: "col", gap: "md" },
                    React.createElement(Card, null,
                        React.createElement(CardHeader, { title: isRtl ? 'تنظیمات چاپ' : 'Print Settings', icon: React.createElement(SafeSettingsIcon, { size: 18 }) }),
                        React.createElement(CardBody, { className: "flex flex-col gap-6" },
                            React.createElement(Select, {
                                label: isRtl ? 'سطح نمایش حساب' : 'Account Level',
                                options: accountLevelOptions,
                                value: printSettings.accountLevel,
                                onChange: (val) => handleSettingChange('accountLevel', val),
                                fullWidth: true
                            }),
                            
                            React.createElement(Divider, { margin: "sm" }),
                            
                            React.createElement('div', { className: "flex flex-col gap-4" },
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش جمع کل' : 'Show Totals', checked: printSettings.showTotals, onChange: (val) => handleSettingChange('showTotals', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش مبالغ ارزی' : 'Show Currencies', checked: printSettings.showCurrencies, onChange: (val) => handleSettingChange('showCurrencies', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش امضاها' : 'Show Signatures', checked: printSettings.showSummary, onChange: (val) => handleSettingChange('showSummary', val) }),
                                React.createElement(Checkbox, { label: isRtl ? 'نمایش وضعیت سند' : 'Show Voucher Status', checked: printSettings.showStatus, onChange: (val) => handleSettingChange('showStatus', val) })
                            ),

                            React.createElement('div', { className: "mt-auto pt-6" },
                                React.createElement(Button, { variant: "primary", fullWidth: true, icon: React.createElement(SafePrinterIcon, { size: 18 }), onClick: handlePrint, disabled: loading },
                                    isRtl ? 'تایید و چاپ' : 'Print Document'
                                )
                            )
                        )
                    )
                ),

                React.createElement(Grid, { span: 9 },
                    React.createElement(Card, null,
                        React.createElement(CardHeader, { title: isRtl ? 'پیش‌نمایش فرم' : 'Document Preview', icon: React.createElement(SafeFileTextIcon, { size: 18 }) }),
                        React.createElement(CardBody, { className: "bg-slate-100 dark:bg-slate-900/50 p-6 overflow-y-auto" },
                            loading ? React.createElement(Flex, { justify: "center", align: "center", className: "h-[400px]" },
                                React.createElement(Text, { variant: "h3", color: "secondary" }, isRtl ? 'در حال بارگذاری اطلاعات...' : 'Loading Data...')
                            ) : renderPrintPreview()
                        )
                    )
                )
            )
        );
    };

    window.TransactionPrint = TransactionPrint;
})();