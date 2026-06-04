/* Filename: financial/TransactionPrint.js */
(() => {
    const React = window.React;
    const { useState, useEffect, useRef } = React;

    const FallbackIcon = ({ size = 16 }) => React.createElement(
        'svg', 
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('circle', { cx: '12', cy: '12', r: '10' })
    );

    const safeComp = (compName) => {
        const sources = [window.DSCore, window.DSOverlays, window.DSForms, window.DSGrid, window.DSFeedback, window.DesignSystem];
        for (const source of sources) {
            if (source && source[compName]) {
                const comp = source[compName];
                if (typeof comp === 'function' || (comp && typeof comp === 'object' && comp.$$typeof)) return comp;
                if (comp && comp.default && (typeof comp.default === 'function' || comp.default.$$typeof)) return comp.default;
            }
        }
        return null;
    };

    const safeIcon = (iconName) => {
        const source = window.LucideIcons || {};
        const icon = source[iconName];
        if (typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof)) return icon;
        return FallbackIcon;
    };

    const Card = safeComp('Card') || (({children}) => React.createElement('div', {className: 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full'}, children));
    const CardHeader = safeComp('CardHeader') || (({title, icon}) => React.createElement('div', {className: 'p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50'}, icon, title));
    const CardBody = safeComp('CardBody') || (({children, className}) => React.createElement('div', {className: `p-4 flex-1 ${className||''}`}, children));
    
    const Flex = safeComp('Flex') || (({children, direction='row', gap='md', justify='start', align='stretch', className=''}) => {
        const gapClass = gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4';
        const dirClass = direction === 'col' ? 'flex-col' : 'flex-row';
        const justClass = justify === 'between' ? 'justify-between' : justify === 'center' ? 'justify-center' : justify === 'end' ? 'justify-end' : 'justify-start';
        const alignClass = align === 'center' ? 'items-center' : 'items-stretch';
        return React.createElement('div', {className: `flex ${dirClass} ${gapClass} ${justClass} ${alignClass} ${className}`}, children);
    });

    const Grid = safeComp('Grid') || (({children, cols=1, span, gap='md'}) => {
        const gapClass = gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-6' : 'gap-4';
        const spanClass = span ? `col-span-${span}` : '';
        const gridClass = cols === 12 ? 'grid-cols-12' : cols === 3 ? 'grid-cols-3' : 'grid-cols-1';
        return React.createElement('div', {className: `grid ${gridClass} ${gapClass} ${spanClass}`}, children);
    });

    const Text = safeComp('Text') || (({children, variant='body', weight='normal', color='default'}) => {
        let cls = 'text-sm text-slate-700 dark:text-slate-300';
        if (variant === 'h3') cls = 'text-lg font-bold text-slate-900 dark:text-white';
        if (variant === 'caption') cls = 'text-xs text-slate-500';
        if (weight === 'bold') cls += ' font-bold';
        if (color === 'primary') cls += ' text-indigo-600 dark:text-indigo-400';
        if (color === 'secondary') cls += ' text-slate-500 dark:text-slate-400';
        return React.createElement('span', {className: cls}, children);
    });

    const Button = safeComp('Button') || (({children, onClick, disabled, fullWidth, icon}) => React.createElement(
        'button', 
        {onClick, disabled, className: `flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''}`}, 
        icon, children
    ));

    const Badge = safeComp('Badge') || (({children, variant='primary'}) => {
        const colors = {
            success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
            warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
            primary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
        };
        return React.createElement('span', {className: `px-2 py-1 text-xs font-bold border rounded-md ${colors[variant] || colors.primary}`}, children);
    });

    const Divider = safeComp('Divider') || (({margin='md'}) => {
        const my = margin === 'sm' ? 'my-2' : margin === 'lg' ? 'my-6' : 'my-4';
        return React.createElement('hr', {className: `border-slate-200 dark:border-slate-700 w-full ${my}`});
    });

    const Container = safeComp('Container') || (({children, className}) => React.createElement('div', {className: `w-full flex flex-col gap-6 ${className||''}`}, children));
    
    let Modal = safeComp('Modal');
    if (!Modal) {
        Modal = ({ isOpen, onClose, title, children, size }) => {
            if (!isOpen) return null;
            return React.createElement('div', { className: 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4' },
                React.createElement('div', { className: `bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 ${size === 'xl' ? 'max-w-[1200px]' : 'max-w-[800px]'}` },
                    React.createElement('div', { className: 'p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80' },
                        React.createElement('h2', { className: 'text-lg font-bold text-slate-800 dark:text-slate-100' }, title),
                        React.createElement('button', { onClick: onClose, className: 'text-slate-500 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors' }, '✕')
                    ),
                    React.createElement('div', { className: 'p-6 flex-1 overflow-auto max-h-[85vh]' }, children)
                )
            );
        };
    }

    const Checkbox = safeComp('Checkbox') || (({label, checked, onChange}) => React.createElement(
        'label', 
        {className: 'flex items-center gap-3 text-sm cursor-pointer group'}, 
        React.createElement('input', {type: 'checkbox', checked, onChange: (e) => onChange(e.target.checked), className: 'w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-800 dark:border-slate-600'}), 
        React.createElement('span', {className: 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors'}, label)
    ));

    const Select = safeComp('Select') || (({label, options, value, onChange, fullWidth}) => React.createElement(
        'div', 
        {className: `flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}, 
        React.createElement('label', {className: 'text-xs font-medium text-slate-600 dark:text-slate-400'}, label), 
        React.createElement('select', {value, onChange: (e) => onChange(e.target.value), className: 'w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'}, 
            options.map(o => React.createElement('option', {key: o.value, value: o.value}, o.label))
        )
    ));

    let Table = safeComp('Table') || safeComp('DataGrid');
    if (!Table) {
        Table = ({ columns, data, striped }) => React.createElement('div', {className: 'w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700'}, 
            React.createElement('table', {className: 'w-full text-sm text-left rtl:text-right border-collapse'}, 
                React.createElement('thead', {className: 'text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700'}, 
                    React.createElement('tr', null, columns.map((c, i) => React.createElement('th', {key: i, className: 'px-4 py-3 whitespace-nowrap', style: {width: c.width}}, c.header)))
                ),
                React.createElement('tbody', null, data.map((row, i) => React.createElement(
                    'tr', 
                    {key: i, className: `border-b dark:border-slate-700 ${striped && i%2===0 ? 'bg-slate-50 dark:bg-slate-800/30' : 'bg-white dark:bg-slate-900'}`}, 
                    columns.map((c, j) => React.createElement('td', {key: j, className: 'px-4 py-3 text-slate-700 dark:text-slate-300'}, row[c.field] || '-'))
                )))
            )
        );
    }

    const PrinterIcon = safeIcon('Printer');
    const SettingsIcon = safeIcon('Settings');
    const FileTextIcon = safeIcon('FileText');

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
                            return {
                                ...item,
                                fm_coa_accounts: accountMatch || null
                            };
                        });
                    }
                }

                setHeaderData(header);
                setItemsData(mappedItems);
            } catch (error) {
                console.error('Error fetching transaction print data:', error);
            } finally {
                setLoading(false);
            }
        };

        const handleSettingChange = (settingKey, value) => {
            setPrintSettings(prev => ({
                ...prev,
                [settingKey]: value
            }));
        };

        const handlePrint = () => {
            const printContent = printRef.current;
            if (!printContent) return;

            // Simple CSS for print to force layout and hide everything else
            const printStyles = `
                <style>
                    @media print {
                        body * { visibility: hidden; }
                        #printable-area, #printable-area * { visibility: visible; }
                        #printable-area { position: absolute; left: 0; top: 0; width: 100%; direction: ${isRtl ? 'rtl' : 'ltr'}; font-family: Tahoma, Arial, sans-serif; }
                        .no-print { display: none !important; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isRtl ? 'right' : 'left'}; font-size: 12px; }
                        th { background-color: #f3f4f6; font-weight: bold; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                        .flex { display: flex; }
                        .justify-between { justify-content: space-between; }
                        .mb-4 { margin-bottom: 1rem; }
                        .p-4 { padding: 1rem; }
                        .border { border: 1px solid #ddd; }
                        .bg-gray-100 { background-color: #f3f4f6; }
                    }
                </style>
            `;

            const originalContents = document.body.innerHTML;
            const printContents = `<div id="printable-area">${printContent.innerHTML}</div>`;
            
            document.body.innerHTML = printStyles + printContents;
            window.print();
            
            // Reload to restore React app state perfectly without memory leaks
            window.location.reload(); 
        };

        const calculateTotals = () => {
            return itemsData.reduce((acc, item) => ({
                debit: acc.debit + (item.transaction_action === 'DEPOSIT' ? (item.amount || 0) : 0),
                credit: acc.credit + (item.transaction_action === 'WITHDRAWAL' ? (item.amount || 0) : 0),
                fcDebit: acc.fcDebit + (item.transaction_action === 'DEPOSIT' ? (item.currency_amount || 0) : 0),
                fcCredit: acc.fcCredit + (item.transaction_action === 'WITHDRAWAL' ? (item.currency_amount || 0) : 0)
            }), { debit: 0, credit: 0, fcDebit: 0, fcCredit: 0 });
        };

        const totals = calculateTotals();

        const getColumns = () => {
            let cols = [
                { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px' },
                { field: 'account_code', header_fa: 'کد حساب', header_en: 'Account Code', width: '120px' },
                { field: 'account_name', header_fa: 'نام حساب', header_en: 'Account Name', width: 'auto' },
                { field: 'description', header_fa: 'شرح آرتیکل', header_en: 'Description', width: 'auto' },
                { field: 'debit_amount', header_fa: 'بدهکار', header_en: 'Debit', width: '150px' },
                { field: 'credit_amount', header_fa: 'بستانکار', header_en: 'Credit', width: '150px' }
            ];

            if (printSettings.showCurrencies) {
                cols.splice(4, 0, 
                    { field: 'fc_debit_amount', header_fa: 'بدهکار (ارزی)', header_en: 'Debit (FC)', width: '120px' },
                    { field: 'fc_credit_amount', header_fa: 'بستانکار (ارزی)', header_en: 'Credit (FC)', width: '120px' }
                );
            }

            return cols.map(c => ({
                field: c.field,
                header: isRtl ? c.header_fa : c.header_en,
                width: c.width
            }));
        };

        const renderPrintPreview = () => {
            if (!headerData) return null;

            return (
                <Container className="print-section bg-white dark:bg-slate-900 rounded-xl">
                    <div ref={printRef} className="p-8 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm bg-white text-slate-900">
                        <Flex direction="col" gap="lg" align="center" justify="center" className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-900">
                                {isRtl ? 'سند حسابداری' : 'Accounting Voucher'}
                            </h1>
                            {printSettings.showStatus && (
                                <span className={`px-4 py-1 rounded-full text-sm font-bold border ${headerData.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                    {headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')}
                                </span>
                            )}
                        </Flex>
                        
                        <div className="grid grid-cols-3 gap-6 mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <Flex direction="col" gap="sm">
                                <span className="text-xs text-slate-500 font-medium">{isRtl ? 'شماره سند:' : 'Doc Code:'}</span>
                                <span className="text-base font-bold text-indigo-700">{headerData.document_code}</span>
                            </Flex>
                            <Flex direction="col" gap="sm">
                                <span className="text-xs text-slate-500 font-medium">{isRtl ? 'تاریخ سند:' : 'Date:'}</span>
                                <span className="text-base font-bold">{headerData.document_date ? new Date(headerData.document_date).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : '-'}</span>
                            </Flex>
                            <Flex direction="col" gap="sm">
                                <span className="text-xs text-slate-500 font-medium">{isRtl ? 'شماره عطف:' : 'Ref Code:'}</span>
                                <span className="text-base font-bold">{headerData.reference_code || '-'}</span>
                            </Flex>
                            <Flex direction="col" gap="sm" className="col-span-3 mt-2 pt-4 border-t border-slate-200">
                                <span className="text-xs text-slate-500 font-medium">{isRtl ? 'شرح سند:' : 'Description:'}</span>
                                <span className="text-sm">{headerData.description || '-'}</span>
                            </Flex>
                        </div>

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
                            <div className="flex justify-end gap-12 p-4 mt-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                                <Flex direction="row" gap="md" align="center">
                                    <span className="text-sm font-bold text-slate-700">{isRtl ? 'جمع بدهکار:' : 'Total Debit:'}</span>
                                    <span className="text-lg font-bold text-indigo-700">{totals.debit.toLocaleString()}</span>
                                </Flex>
                                <Flex direction="row" gap="md" align="center">
                                    <span className="text-sm font-bold text-slate-700">{isRtl ? 'جمع بستانکار:' : 'Total Credit:'}</span>
                                    <span className="text-lg font-bold text-indigo-700">{totals.credit.toLocaleString()}</span>
                                </Flex>
                            </div>
                        )}

                        {printSettings.showSummary && (
                            <div className="grid grid-cols-3 gap-8 mt-12 p-6 border border-slate-200 rounded-lg">
                                <Flex direction="col" gap="md" align="center">
                                    <span className="text-sm text-slate-500 font-bold mb-8">{isRtl ? 'تنظیم کننده' : 'Prepared By'}</span>
                                    <span className="text-base font-medium">{usersMap[headerData.registrar_id] || headerData.registrar_id || '---'}</span>
                                </Flex>
                                <Flex direction="col" gap="md" align="center">
                                    <span className="text-sm text-slate-500 font-bold mb-8">{isRtl ? 'بررسی کننده' : 'Checked By'}</span>
                                    <span className="text-base font-medium">---</span>
                                </Flex>
                                <Flex direction="col" gap="md" align="center">
                                    <span className="text-sm text-slate-500 font-bold mb-8">{isRtl ? 'تایید کننده' : 'Approved By'}</span>
                                    <span className="text-base font-medium">---</span>
                                </Flex>
                            </div>
                        )}
                    </div>
                </Container>
            );
        };

        return (
            <Modal isOpen={true} onClose={onClose} size="xl" title={isRtl ? 'چاپ سند حسابداری' : 'Print Voucher'} language={language}>
                <Grid cols={12} gap="lg">
                    <Grid span={3} direction="col" gap="md">
                        <Card>
                            <CardHeader title={isRtl ? 'تنظیمات چاپ' : 'Print Settings'} icon={React.createElement(SettingsIcon, { size: 18 })} />
                            <CardBody className="flex flex-col gap-6">
                                <Select 
                                    label={isRtl ? 'سطح نمایش حساب' : 'Account Level'}
                                    options={accountLevelOptions}
                                    value={printSettings.accountLevel}
                                    onChange={(val) => handleSettingChange('accountLevel', val)}
                                    fullWidth
                                />
                                
                                <Divider margin="sm" />
                                
                                <div className="flex flex-col gap-4">
                                    <Checkbox 
                                        label={isRtl ? 'نمایش جمع کل' : 'Show Totals'}
                                        checked={printSettings.showTotals}
                                        onChange={(val) => handleSettingChange('showTotals', val)}
                                    />
                                    
                                    <Checkbox 
                                        label={isRtl ? 'نمایش مبالغ ارزی' : 'Show Currencies'}
                                        checked={printSettings.showCurrencies}
                                        onChange={(val) => handleSettingChange('showCurrencies', val)}
                                    />
                                    
                                    <Checkbox 
                                        label={isRtl ? 'نمایش امضاها' : 'Show Signatures'}
                                        checked={printSettings.showSummary}
                                        onChange={(val) => handleSettingChange('showSummary', val)}
                                    />
                                    
                                    <Checkbox 
                                        label={isRtl ? 'نمایش وضعیت سند' : 'Show Voucher Status'}
                                        checked={printSettings.showStatus}
                                        onChange={(val) => handleSettingChange('showStatus', val)}
                                    />
                                </div>

                                <div className="mt-auto pt-6">
                                    <Button 
                                        variant="primary" 
                                        fullWidth 
                                        icon={React.createElement(PrinterIcon, { size: 18 })}
                                        onClick={handlePrint}
                                        disabled={loading}
                                    >
                                        {isRtl ? 'تایید و چاپ' : 'Print Document'}
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    </Grid>

                    <Grid span={9}>
                        <Card>
                            <CardHeader title={isRtl ? 'پیش‌نمایش فرم' : 'Document Preview'} icon={React.createElement(FileTextIcon, { size: 18 })} />
                            <CardBody className="bg-slate-100 dark:bg-slate-900/50 p-6 overflow-y-auto">
                                {loading ? (
                                    <Flex justify="center" align="center" className="h-[400px]">
                                        <Text variant="h3" color="secondary">{isRtl ? 'در حال بارگذاری اطلاعات...' : 'Loading Data...'}</Text>
                                    </Flex>
                                ) : (
                                    renderPrintPreview()
                                )}
                            </CardBody>
                        </Card>
                    </Grid>
                </Grid>
            </Modal>
        );
    };

    window.TransactionPrint = TransactionPrint;
})();