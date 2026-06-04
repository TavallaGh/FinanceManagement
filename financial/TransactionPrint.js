/* Filename: financial/TransactionPrint.js */
import React, { useState, useEffect, useRef } from 'react';
import { Printer, Settings, X, Check, FileText } from 'lucide-react';
import { 
    Card, 
    CardHeader, 
    CardBody, 
    Flex, 
    Grid, 
    Text, 
    Button, 
    Badge, 
    Divider, 
    Container 
} from '../designsystem/DSCore';
import { Modal } from '../designsystem/DSOverlays';
import { Checkbox, Select } from '../designsystem/DSForms';
import { Table } from '../designsystem/DSGrid';

const TransactionPrint = ({ transactionId, onClose, isRtl = true }) => {
    const supabase = window.supabase;
    const printRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [headerData, setHeaderData] = useState(null);
    const [itemsData, setItemsData] = useState([]);
    
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
        }
    }, [transactionId]);

    const fetchTransactionData = async () => {
        setLoading(true);
        try {
            const { data: header, error: headerError } = await supabase
                .schema('financial')
                .from('transactions')
                .select('*')
                .eq('id', transactionId)
                .single();

            if (headerError) throw headerError;

            const { data: items, error: itemsError } = await supabase
                .schema('financial')
                .from('transaction_items')
                .select(`
                    *,
                    chart_of_accounts (
                        account_code,
                        account_name,
                        level,
                        parent_id
                    )
                `)
                .eq('transaction_id', transactionId)
                .order('row_number', { ascending: true });

            if (itemsError) throw itemsError;

            setHeaderData(header);
            setItemsData(items || []);
        } catch (error) {
            console.error('Error fetching transaction data for print:', error);
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
            debit: acc.debit + (item.debit_amount || 0),
            credit: acc.credit + (item.credit_amount || 0),
            fcDebit: acc.fcDebit + (item.fc_debit_amount || 0),
            fcCredit: acc.fcCredit + (item.fc_credit_amount || 0)
        }), { debit: 0, credit: 0, fcDebit: 0, fcCredit: 0 });
    };

    const totals = calculateTotals();

    const getColumns = () => {
        let cols = [
            { field: 'row_number', header: isRtl ? 'ردیف' : 'Row', width: '60px' },
            { field: 'account_code', header: isRtl ? 'کد حساب' : 'Account Code', width: '120px' },
            { field: 'account_name', header: isRtl ? 'نام حساب' : 'Account Name', width: 'flex-1' },
            { field: 'description', header: isRtl ? 'شرح آرتیکل' : 'Description', width: 'flex-1' },
            { field: 'debit_amount', header: isRtl ? 'بدهکار (ریال)' : 'Debit (IRR)', width: '150px' },
            { field: 'credit_amount', header: isRtl ? 'بستانکار (ریال)' : 'Credit (IRR)', width: '150px' }
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

        return (
            <Container ref={printRef} direction="col" gap="lg" className="print-section">
                <Card variant="outline">
                    <CardBody>
                        <Flex direction="col" gap="md" align="center" justify="center">
                            <Text variant="h3" weight="bold">
                                {isRtl ? 'سند حسابداری' : 'Accounting Voucher'}
                            </Text>
                            {printSettings.showStatus && (
                                <Badge variant={headerData.status === 'approved' ? 'success' : 'warning'}>
                                    {headerData.status === 'approved' ? (isRtl ? 'تایید شده' : 'Approved') : (isRtl ? 'یادداشت' : 'Draft')}
                                </Badge>
                            )}
                        </Flex>
                        
                        <Divider margin="md" />
                        
                        <Grid cols={3} gap="md">
                            <Flex direction="col" gap="sm">
                                <Text variant="caption" color="secondary">{isRtl ? 'شماره سند:' : 'Voucher No:'}</Text>
                                <Text variant="body" weight="bold">{headerData.voucher_number}</Text>
                            </Flex>
                            <Flex direction="col" gap="sm">
                                <Text variant="caption" color="secondary">{isRtl ? 'تاریخ سند:' : 'Date:'}</Text>
                                <Text variant="body" weight="bold">{new Date(headerData.voucher_date).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}</Text>
                            </Flex>
                            <Flex direction="col" gap="sm">
                                <Text variant="caption" color="secondary">{isRtl ? 'شماره عطف:' : 'Reference No:'}</Text>
                                <Text variant="body" weight="bold">{headerData.reference_number || '-'}</Text>
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
                                account_code: item.chart_of_accounts?.account_code || '-',
                                account_name: item.chart_of_accounts?.account_name || '-',
                                description: item.description,
                                debit_amount: item.debit_amount?.toLocaleString(),
                                credit_amount: item.credit_amount?.toLocaleString(),
                                fc_debit_amount: item.fc_debit_amount?.toLocaleString() || '-',
                                fc_credit_amount: item.fc_credit_amount?.toLocaleString() || '-'
                            }))}
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
                                    <Text variant="body">{headerData.created_by || '---'}</Text>
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
        <Modal isOpen={true} onClose={onClose} size="xl" title={isRtl ? 'چاپ سند حسابداری' : 'Print Voucher'}>
            <Grid cols={12} gap="lg">
                <Grid span={3} direction="col" gap="md">
                    <Card>
                        <CardHeader title={isRtl ? 'تنظیمات چاپ' : 'Print Settings'} icon={<Settings size={18} />} />
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
                                icon={<Printer size={18} />}
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
                        <CardHeader title={isRtl ? 'پیش‌نمایش' : 'Preview'} icon={<FileText size={18} />} />
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

export default TransactionPrint;