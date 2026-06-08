/* Filename: financial/TransactionSummary.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo } = React;

  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const {
    DollarSign = FallbackIcon, LayoutList = FallbackIcon
  } = LucideIcons;

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const { Button = FallbackComponent, Badge = FallbackComponent, Card = FallbackComponent } = Core;

  const Grid = window.DSGrid || DS || {};
  const { DataGrid = FallbackComponent } = Grid;

  const Feedback = window.DSFeedback || DS || {};
  const { Modal = FallbackComponent } = Feedback;

  function FallbackComponent() { return null; }

  const formatNumber = (num) => {
      if (!num && num !== 0) return '0';
      const parts = parseFloat(num).toFixed(2).toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts[1] === '00' ? parts[0] : parts.join('.');
  };

  const TransactionSummary = ({ isOpen, onClose, record, lookups, language = 'fa', formCode = 'TRANSACTIONS' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;

    const [showGrid, setShowGrid] = useState(false);
    const [currencyRates, setCurrencyRates] = useState({});

    useEffect(() => {
        if (isOpen && record?.document_date && supabase) {
            const fetchRates = async () => {
                try {
                    const formattedDate = record.document_date.replace(/\//g, '-');
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
    }, [isOpen, record?.document_date, supabase]);

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
        
        // USD to IRR is generally stored as USD_IRR
        let usdToIrr = currencyRates[`USD_IRR`] || 1;
        if (!currencyRates[`USD_IRR`] && currencyRates[`IRR_USD`]) {
             usdToIrr = 1 / currencyRates[`IRR_USD`];
        }
        
        return { toUsd, usdToIrr };
    }, [currencyRates]);

    const { mappedItems, depUsd, widUsd, depIrr, widIrr } = useMemo(() => {
        const rawItems = record?.fm_transaction_items || [];
        let dUsd = 0, wUsd = 0, dIrr = 0, wIrr = 0;
        
        const mItems = rawItems.map(item => {
            const isDep = item.transaction_action === 'DEPOSIT';
            const cur = item.currency || 'IRR';
            const { toUsd, usdToIrr } = getExchangeRates(cur);

            const rawDep = parseFloat(item.deposit_amount || 0);
            const rawWid = parseFloat(item.withdrawal_amount || 0);
            const val = rawDep > 0 ? rawDep : rawWid;

            let usd = val * toUsd;
            let irr = usd * usdToIrr;

            if (isDep) {
                dUsd += usd;
                dIrr += irr;
            } else {
                wUsd += usd;
                wIrr += irr;
            }

            return {
                ...item,
                deposit_amount: rawDep,
                withdrawal_amount: rawWid,
                exchange_rate_to_usd: toUsd,
                exchange_rate_usd_to_irr: usdToIrr,
                amount_usd: usd,
                amount_irr: irr
            };
        });

        return { mappedItems: mItems, depUsd: dUsd, widUsd: wUsd, depIrr: dIrr, widIrr: wIrr };
    }, [record, getExchangeRates]);

    if (!isOpen || !record) return null;
    
    const diffUsd = Math.abs(depUsd - widUsd);
    const isBalancedUsd = diffUsd < 0.01;

    const diffIrr = Math.abs(depIrr - widIrr);
    const isBalancedIrr = diffIrr < 0.01;

    const handleToggleGrid = () => {
        setShowGrid(prev => !prev);
    };

    const handleClose = () => {
        setShowGrid(false);
        onClose();
    };

    const summaryColumns = [
        { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px' },
        { field: 'account_id', header_fa: 'حساب', header_en: 'Account', width: 'minmax(120px, 1fr)', render: val => {
            const acc = (lookups?.accounts || []).find(a => a.id === val);
            return <span className="font-bold text-slate-700 dark:text-slate-300 truncate block" title={acc ? acc.displayLabel : val}>{acc ? acc.displayLabel : val}</span>;
        }},
        { field: 'deposit_amount', header_fa: 'مبلغ واریز', header_en: 'Deposit', width: '110px', render: val => <span dir="ltr" className="text-emerald-600 dark:text-emerald-400 font-bold">{formatNumber(val)}</span> },
        { field: 'withdrawal_amount', header_fa: 'مبلغ برداشت', header_en: 'Withdrawal', width: '110px', render: val => <span dir="ltr" className="text-orange-600 dark:text-orange-400 font-bold">{formatNumber(val)}</span> },
        { field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '60px', render: val => <Badge size="sm" variant="slate">{val}</Badge> },
        { field: 'exchange_rate_to_usd', header_fa: 'نرخ به دلار', header_en: 'USD Rate', width: '80px', render: val => <span dir="ltr">{formatNumber(val)}</span> },
        { field: 'amount_usd', header_fa: 'مبلغ به دلار', header_en: 'USD Amount', width: '110px', render: val => <span dir="ltr" className="font-bold text-slate-800 dark:text-slate-200">{formatNumber(val)}</span> },
        { field: 'exchange_rate_usd_to_irr', header_fa: 'نرخ دلار به ریال', header_en: 'USD to IRR Rate', width: '110px', render: val => <span dir="ltr">{formatNumber(val)}</span> },
        { field: 'amount_irr', header_fa: 'مبلغ به ریال', header_en: 'IRR Amount', width: '120px', render: val => <span dir="ltr" className="font-bold text-slate-800 dark:text-slate-200">{formatNumber(val)}</span> },
    ];

    const modalWidthClass = showGrid ? "max-w-6xl" : "max-w-xs";

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t('خلاصه ارزی سند', 'Document Currency Summary')} width={modalWidthClass} language={language}>
            <div className={`p-4 flex gap-4 bg-slate-50 dark:bg-slate-900 rounded-b-lg transition-all duration-300 ${showGrid ? 'flex-col md:flex-row' : 'flex-col'}`}>
                
                {/* Cards Column */}
                <div className={`flex flex-col gap-3 shrink-0 ${showGrid ? 'w-full md:w-[280px]' : 'w-full'}`}>
                    {/* USD Card */}
                    <Card noPadding className="border border-slate-200 dark:border-slate-700 shadow-sm" language={language}>
                        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between shrink-0">
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-[12px]">{t('اطلاعات به دلار (USD)', 'USD Info')}</span>
                            <DollarSign size={14} className="text-indigo-500" />
                        </div>
                        <div className="p-3 flex flex-col gap-2 text-[12px]">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400">{t('جمع واریز:', 'Total Deposit:')}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">{formatNumber(depUsd)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400">{t('جمع برداشت:', 'Total Withdrawal:')}</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400" dir="ltr">{formatNumber(widUsd)}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-2 mt-1">
                                <span className="text-slate-500 dark:text-slate-400">{t('وضعیت تراز:', 'Balance Status:')}</span>
                                {isBalancedUsd ? (
                                    <Badge variant="emerald" size="sm">{t('تراز', 'Balanced')}</Badge>
                                ) : (
                                    <Badge variant="orange" size="sm">{t('ناتراز', 'Unbalanced')}</Badge>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* IRR Card */}
                    <Card noPadding className="border border-slate-200 dark:border-slate-700 shadow-sm" language={language}>
                        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between shrink-0">
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-[12px]">{t('اطلاعات به ریال (IRR)', 'IRR Info')}</span>
                            <span className="font-bold text-emerald-500 text-sm">﷼</span>
                        </div>
                        <div className="p-3 flex flex-col gap-2 text-[12px]">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400">{t('جمع واریز:', 'Total Deposit:')}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">{formatNumber(depIrr)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400">{t('جمع برداشت:', 'Total Withdrawal:')}</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400" dir="ltr">{formatNumber(widIrr)}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-2 mt-1">
                                <span className="text-slate-500 dark:text-slate-400">{t('وضعیت تراز:', 'Balance Status:')}</span>
                                {isBalancedIrr ? (
                                    <Badge variant="emerald" size="sm">{t('تراز', 'Balanced')}</Badge>
                                ) : (
                                    <Badge variant="orange" size="sm">{t('ناتراز', 'Unbalanced')}</Badge>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Toggle Button */}
                    <Button 
                        variant={showGrid ? "primary" : "outline"} 
                        className="w-full mt-2" 
                        icon={LayoutList} 
                        onClick={handleToggleGrid}
                    >
                        {showGrid ? t('مخفی‌سازی اقلام', 'Hide Items') : t('نمایش جزئیات اقلام', 'Show Item Details')}
                    </Button>
                </div>

                {/* Data Grid Column */}
                {showGrid && (
                    <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 flex flex-col min-w-0 min-h-[350px] animate-in fade-in zoom-in-95 duration-200">
                        <DataGrid 
                            data={mappedItems} 
                            columns={summaryColumns} 
                            language={language} 
                            formCode={formCode}                             
                            exportable={false}
                            importable={false}
                            selectable={false}                            
                            hideImport={true} 
                            hideExport={true} 
                            hideToolbar={true}
                        />
                    </div>
                )}

            </div>
        </Modal>
    );
  };

  window.TransactionSummary = TransactionSummary;
})();