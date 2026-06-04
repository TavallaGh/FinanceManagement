/* Filename: financial/TransactionPrint.js */
(() => {
    const React = window.React;
    const { useState, useEffect, useRef } = React;

    const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size, backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '10px' } }, 'X');

    // Visual Debugging Extractor
    const safeComp = (moduleObj, compName) => {
        const comp = moduleObj && moduleObj[compName];
        if (typeof comp === 'function' || (comp && typeof comp === 'object' && comp.$$typeof)) return comp;
        
        return (props) => React.createElement('div', { 
            style: { 
                backgroundColor: '#fee2e2', color: '#991b1b', padding: '8px', 
                margin: '4px', border: '1px solid #ef4444', borderRadius: '4px', 
                fontSize: '12px', fontWeight: 'bold' 
            } 
        }, `[DEBUG] Missing Component: ${compName} from DesignSystem`);
    };

    const safeIcon = (moduleObj, iconName) => {
        const icon = moduleObj && moduleObj[iconName];
        if (typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof)) return icon;
        return FallbackIcon;
    };

    const DS = window.DesignSystem || {};
    
    const Core = window.DSCore || DS || {};
    const Card = safeComp(Core, 'Card');
    const CardHeader = safeComp(Core, 'CardHeader');
    const CardBody = safeComp(Core, 'CardBody');
    const Flex = safeComp(Core, 'Flex');
    const Grid = safeComp(Core, 'Grid');
    const Text = safeComp(Core, 'Text');
    const Button = safeComp(Core, 'Button');
    const Badge = safeComp(Core, 'Badge');
    const Divider = safeComp(Core, 'Divider');
    const Container = safeComp(Core, 'Container');

    const Overlays = window.DSOverlays || window.DSFeedback || DS || {};
    const Modal = safeComp(Overlays, 'Modal');

    const Forms = window.DSForms || DS || {};
    const Checkbox = safeComp(Forms, 'Checkbox');
    const Select = safeComp(Forms, 'Select');

    const DSGrid = window.DSGrid || DS || {};
    // Fallback logic: check for Table, if not use DataGrid, if not use safe fallback
    const Table = (DSGrid && DSGrid.Table) ? safeComp(DSGrid, 'Table') : safeComp(DSGrid, 'DataGrid');

    const LucideIcons = window.LucideIcons || {};
    const Printer = safeIcon(LucideIcons, 'Printer');
    const Settings = safeIcon(LucideIcons, 'Settings');
    const FileText = safeIcon(LucideIcons, 'FileText');

    const TransactionPrint = ({ transactionId, onClose, language = 'fa' }) => {
        const isRtl = language === 'fa';
        const supabase = window.supabase;
        const printRef = useRef(null);

        const [loading, setLoading] = useState(false);
        const [headerData, setHeaderData] = useState(null);
        const [itemsData, setItemsData] = useState([]);
        const [debugError, setDebugError] = useState(null);
        
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
            console.log("DEBUG: TransactionPrint mounted for ID", transactionId);
            if (transactionId) {
                fetchTransactionData();
            }
        }, [transactionId]);

        const fetchTransactionData = async () => {
            setLoading(true);
            setDebugError(null);
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
                console.error('DEBUG - API Error in TransactionPrint:', error);
                setDebugError(error.message || 'خطا در ارتباط با سرور');
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

            const originalContents = document.body.innerHTML;
            const printContents = printContent.innerHTML;

            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
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
            if (debugError) {
                return React.createElement('div', { className: 'p-4 bg-red-100 text-red-700 border border-red-400 rounded' }, `Error: ${debugError}`);
            }

            if (!headerData) return null;

            return (
                <Container ref={printRef} direction="col" gap="lg" className="print-section">
                    <Card variant="outline">
                        <CardBody>
                            <Flex direction="col" gap="md" align="center" justify="center">
                                <Text variant="h3" weight="bold">
                                    {isRtl ? 'سند حسابداری' : 'Accounting Voucher'}
                                </Text>
                                {printSettings.showStatus && (
                                    <Badge variant={headerData.status === 'APPROVED' ? 'success' : 'warning'}>
                                        {headerData.status === 'APPROVED' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت / موقت' : 'Draft / Temp')}
                                    </Badge>
                                )}
                            </Flex>
                            
                            <Divider margin="md" />
                            
                            <Grid cols={3} gap="md">
                                <Flex direction="col" gap="sm">
                                    <Text variant="caption" color="secondary">{isRtl ? 'شماره سند:' : 'Doc Code:'}</Text>
                                    <Text variant="body" weight="bold">{headerData.document_code}</Text>
                                </Flex>
                                <Flex direction="col" gap="sm">
                                    <Text variant="caption" color="secondary">{isRtl ? 'تاریخ سند:' : 'Date:'}</Text>
                                    <Text variant="body" weight="bold">{headerData.document_date ? new Date(headerData.document_date).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : '-'}</Text>
                                </Flex>
                                <Flex direction="col" gap="sm">
                                    <Text variant="caption" color="secondary">{isRtl ? 'شماره عطف:' : 'Ref Code:'}</Text>
                                    <Text variant="body" weight="bold">{headerData.reference_code || '-'}</Text>
                                </Flex>
                                <Flex direction="col" gap="sm" span={3}>
                                    <Text variant="caption" color="secondary">{isRtl ? 'شرح سند:' : 'Description:'}</Text>
                                    <Text variant="body">{headerData.description}</Text>
                                </Flex>
                            </Grid>
                        </CardBody>
                    </Card>

                    <Card variant="outline">
                        <CardBody>
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
                                language={language}
                                striped={true}
                            />
                            
                            {printSettings.showTotals && (
                                <Flex direction="row" justify="end" gap="lg" className="p-md bg-secondary-light">
                                    <Flex direction="row" gap="md">
                                        <Text variant="body" weight="bold">{isRtl ? 'جمع بدهکار:' : 'Total Debit:'}</Text>
                                        <Text variant="body" weight="bold" color="primary">{totals.debit.toLocaleString()}</Text>
                                    </Flex>
                                    <Flex direction="row" gap="md">
                                        <Text variant="body" weight="bold">{isRtl ? 'جمع بستانکار:' : 'Total Credit:'}</Text>
                                        <Text variant="body" weight="bold" color="primary">{totals.credit.toLocaleString()}</Text>
                                    </Flex>
                                </Flex>
                            )}
                        </CardBody>
                    </Card>

                    {printSettings.showSummary && (
                        <Card variant="outline">
                            <CardBody>
                                <Grid cols={3} gap="lg">
                                    <Flex direction="col" gap="md" align="center">
                                        <Text variant="caption" color="secondary">{isRtl ? 'تنظیم کننده' : 'Prepared By'}</Text>
                                        <Divider margin="sm" />
                                        <Text variant="body">{headerData.registrar_id || '---'}</Text>
                                    </Flex>
                                    <Flex direction="col" gap="md" align="center">
                                        <Text variant="caption" color="secondary">{isRtl ? 'بررسی کننده' : 'Checked By'}</Text>
                                        <Divider margin="sm" />
                                        <Text variant="body">---</Text>
                                    </Flex>
                                    <Flex direction="col" gap="md" align="center">
                                        <Text variant="caption" color="secondary">{isRtl ? 'تایید کننده' : 'Approved By'}</Text>
                                        <Divider margin="sm" />
                                        <Text variant="body">---</Text>
                                    </Flex>
                                </Grid>
                            </CardBody>
                        </Card>
                    )}
                </Container>
            );
        };

        return (
            <Modal isOpen={true} onClose={onClose} size="xl" title={isRtl ? 'چاپ سند حسابداری' : 'Print Voucher'} language={language}>
                <Grid cols={12} gap="lg">
                    <Grid span={3} direction="col" gap="md">
                        <Card>
                            <CardHeader title={isRtl ? 'تنظیمات چاپ' : 'Print Settings'} icon={React.createElement(Settings, { size: 18 })} />
                            <CardBody>
                                <Flex direction="col" gap="lg">
                                    <Select 
                                        label={isRtl ? 'سطح نمایش حساب' : 'Account Level'}
                                        options={accountLevelOptions}
                                        value={printSettings.accountLevel}
                                        onChange={(val) => handleSettingChange('accountLevel', val)}
                                        fullWidth
                                    />
                                    
                                    <Divider />
                                    
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
                                        label={isRtl ? 'نمایش خلاصه و امضاها' : 'Show Summary & Signatures'}
                                        checked={printSettings.showSummary}
                                        onChange={(val) => handleSettingChange('showSummary', val)}
                                    />
                                    
                                    <Checkbox 
                                        label={isRtl ? 'نمایش وضعیت سند' : 'Show Voucher Status'}
                                        checked={printSettings.showStatus}
                                        onChange={(val) => handleSettingChange('showStatus', val)}
                                    />
                                </Flex>
                            </CardBody>
                            <CardBody>
                                <Button 
                                    variant="primary" 
                                    fullWidth 
                                    icon={React.createElement(Printer, { size: 18 })}
                                    onClick={handlePrint}
                                    disabled={loading}
                                >
                                    {isRtl ? 'چاپ' : 'Print'}
                                </Button>
                            </CardBody>
                        </Card>
                    </Grid>

                    <Grid span={9}>
                        <Card>
                            <CardHeader title={isRtl ? 'پیش‌نمایش' : 'Preview'} icon={React.createElement(FileText, { size: 18 })} />
                            <CardBody>
                                {loading ? (
                                    <Flex justify="center" align="center" className="p-xl">
                                        <Text>{isRtl ? 'در حال بارگذاری...' : 'Loading...'}</Text>
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