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
                        .select('base_currency, target_currency, rate, rate_date, created_at')
                        .lte('rate_date', formattedDate)
                        .order('rate_date', { ascending: false });
                    const sorted = (data || []).slice().sort((a, b) => {
                        if (a.rate_date > b.rate_date) return -1;
                        if (a.rate_date < b.rate_date) return  1;
                        const ca = a.created_at || '', cb = b.created_at || '';
                        return ca > cb ? -1 : ca < cb ? 1 : 0;
                    });
                    const latestRates = {};
                    sorted.forEach(r => {
                        const key = `${r.base_currency}_${r.target_currency}`;
                        if (!latestRates[key]) latestRates[key] = r.rate;
                    });
                    setCurrencyRates(latestRates);
                } catch (e) {}
            };
            fetchRates();
        }
    }, [isOpen, record?.document_date, supabase]);

    const getExchangeRates = useCallback((currency, fallbackToUsd = 0, fallbackUsdToIrr = 0) => {
        let toUsd = 1;
        if (currency !== 'USD') {
            const direct = parseFloat(currencyRates[`${currency}_USD`] || 0);
            if (direct > 0) {
                toUsd = direct;
            } else {
                const inverse = parseFloat(currencyRates[`USD_${currency}`] || 0);
                if (inverse > 0) {
                    toUsd = 1 / inverse;
                } else if (fallbackToUsd > 0) {
                    toUsd = fallbackToUsd;  // نرخ ذخیره‌شده در DB توسط بروزرسانی نرخ
                }
            }
        }

        let usdToIrr = 1;
        const directIrr = parseFloat(currencyRates['USD_IRR'] || 0);
        if (directIrr > 0) {
            usdToIrr = directIrr;
        } else {
            const inverseIrr = parseFloat(currencyRates['IRR_USD'] || 0);
            if (inverseIrr > 0) {
                usdToIrr = 1 / inverseIrr;
            } else if (fallbackUsdToIrr > 0) {
                usdToIrr = fallbackUsdToIrr;  // نرخ ذخیره‌شده در DB
            }
        }

        return { toUsd, usdToIrr };
    }, [currencyRates]);

    const { mappedItems, depUsd, widUsd, depIrr, widIrr } = useMemo(() => {
        const rawItems = record?.fm_transaction_items || [];
        let dUsd = 0, wUsd = 0, dIrr = 0, wIrr = 0;
        
        const mItems = rawItems.map(item => {
            const isDep = item.transaction_action === 'DEPOSIT';
            const cur = item.currency || 'IRR';
            const storedToUsd    = parseFloat(item.exchange_rate_to_usd     || 0);
            const storedUsdToIrr = parseFloat(item.exchange_rate_usd_to_irr || 0);
            const { toUsd, usdToIrr } = getExchangeRates(cur, storedToUsd, storedUsdToIrr);

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
                amount_irr: irr,
                dep_usd: rawDep * toUsd,
                dep_irr: rawDep * toUsd * usdToIrr,
                wid_usd: rawWid * toUsd,
                wid_irr: rawWid * toUsd * usdToIrr,
            };
        });

        return { mappedItems: mItems, depUsd: dUsd, widUsd: wUsd, depIrr: dIrr, widIrr: wIrr };
    }, [record, getExchangeRates]);

    if (!isOpen || !record) return null;
    
    const isTransfer = record.transaction_type === 'TRANSFER';

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

    // ── AmountCell: original amount + ≈$ + ≈﷼ stacked (same format as RequestSummary) ──
    const AmountCell = ({ amount, usd, irr, cur, isDeposit }) => {
        if (!amount) return <span className="text-slate-300 dark:text-slate-600 text-[12px]" dir="ltr">—</span>;
        const mainColor = isDeposit ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400';
        return (
            <div className="flex flex-col gap-[3px]" dir="ltr">
                <span className={`font-bold text-[12px] ${mainColor}`}>
                    {formatNumber(amount)}&nbsp;<span className="text-[10px] font-semibold">{cur}</span>
                </span>
                <span className="text-[10px] text-slate-400">≈&nbsp;$&nbsp;{formatNumber(usd)}</span>
                <span className="text-[10px] text-slate-400">≈&nbsp;﷼&nbsp;{formatNumber(irr)}</span>
            </div>
        );
    };

    const summaryColumns = [
        {
            field: 'row_number', header_fa: '#', header_en: '#', width: '32px',
            render: val => <span className="text-[12px] text-slate-400">{val}</span>,
        },        
        {
            field: 'account_id', header_fa: 'حساب', header_en: 'Account', width: '120px',
            render: val => {
                const acc = (lookups?.accounts || []).find(a => a.id === val);
                return <span className="text-[12px] text-slate-600 dark:text-slate-400 truncate block" title={acc ? acc.displayLabel : val}>{acc ? acc.displayLabel : (val || '—')}</span>;
            },
        },
        {
            field: 'currency', header_fa: 'ارز / نوع', header_en: 'Cur / Type', width: '65px',
            render: (val, row) => {
                const isDep = row.transaction_action === 'DEPOSIT';
                return (
                    <div className="flex flex-col gap-0.5 items-start">
                        <Badge size="sm" variant="slate">{val}</Badge>
                        <span className={`text-[10px] font-bold ${isDep ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                            {isRtl ? (isDep ? '↑ واریز' : '↓ برداشت') : (isDep ? '↑ Dep' : '↓ Wid')}
                        </span>
                    </div>
                );
            },
        },
        {
            field: 'exchange_rate_to_usd', header_fa: 'نرخ تبدیل', header_en: 'Rates', width: '90px',
            render: (val, row) => (
                <div className="flex flex-col gap-[2px]" dir="ltr">
                    <span className="text-[10px] text-slate-500">
                        1 {row.currency} = <span className="font-bold text-slate-700 dark:text-slate-300">{formatNumber(val)}</span> $
                    </span>
                    <span className="text-[10px] text-slate-500">
                        1 $ = <span className="font-bold text-slate-700 dark:text-slate-300">{formatNumber(row.exchange_rate_usd_to_irr)}</span> ﷼
                    </span>
                </div>
            ),
        },
        {
            field: 'deposit_amount', header_fa: 'واریز', header_en: 'Deposit', width: '110px',
            render: (val, row) => <AmountCell amount={val} usd={row.dep_usd} irr={row.dep_irr} cur={row.currency} isDeposit={true} />,
        },
        {
            field: 'withdrawal_amount', header_fa: 'برداشت', header_en: 'Withdrawal', width: '110px',
            render: (val, row) => <AmountCell amount={val} usd={row.wid_usd} irr={row.wid_irr} cur={row.currency} isDeposit={false} />,
        },
        {
            field: 'description', header_fa: 'شرح', header_en: 'Description', width: '120px',
            render: val => <span className="text-[12px] text-slate-500 dark:text-slate-400 truncate block" title={val || ''}>{val || '—'}</span>,
        },
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
                            {isTransfer && (
                                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-2 mt-1">
                                    <span className="text-slate-500 dark:text-slate-400">{t('وضعیت تراز:', 'Balance Status:')}</span>
                                    {isBalancedUsd ? (
                                        <Badge variant="emerald" size="sm">{t('تراز', 'Balanced')}</Badge>
                                    ) : (
                                        <Badge variant="orange" size="sm">{t('ناتراز', 'Unbalanced')}</Badge>
                                    )}
                                </div>
                            )}
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
                            {isTransfer && (
                                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-2 mt-1">
                                    <span className="text-slate-500 dark:text-slate-400">{t('وضعیت تراز:', 'Balance Status:')}</span>
                                    {isBalancedIrr ? (
                                        <Badge variant="emerald" size="sm">{t('تراز', 'Balanced')}</Badge>
                                    ) : (
                                        <Badge variant="orange" size="sm">{t('ناتراز', 'Unbalanced')}</Badge>
                                    )}
                                </div>
                            )}
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
                    <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 flex flex-col min-w-0 animate-in fade-in zoom-in-95 duration-200" style={{ height: isTransfer ? '350px' : '280px' }}>
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