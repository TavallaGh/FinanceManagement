/* Filename: requests/RequestSummary.js */
/* Currency summary modal for requests – mirrors TransactionSummary.js pattern */
/* Shows requested / approved / remaining amounts converted to USD and IRR     */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo } = React;

  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

  function FallbackComponent() { return null; }

  const safeComp = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    if (c && c.default && (typeof c.default === 'function' || c.default.$$typeof)) return c.default;
    return FallbackComponent;
  };
  const safeIcon = (obj, name) => {
    const c = obj && obj[name];
    if (typeof c === 'function' || (c && c.$$typeof)) return c;
    if (c && c.default) return c.default;
    return FallbackIcon;
  };

  const LucideIcons = window.LucideIcons || {};
  const DollarSign  = safeIcon(LucideIcons, 'DollarSign');
  const CheckCircle = safeIcon(LucideIcons, 'CheckCircle');
  const Clock       = safeIcon(LucideIcons, 'Clock');
  const LayoutList  = safeIcon(LucideIcons, 'LayoutList');

  const DS   = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const Button = safeComp(Core, 'Button');
  const Badge  = safeComp(Core, 'Badge');
  const Card   = safeComp(Core, 'Card');

  const Grid     = window.DSGrid || DS || {};
  const DataGrid = safeComp(Grid, 'DataGrid');

  const Feedback = window.DSFeedback || window.DSOverlays || DS || {};
  const Modal    = safeComp(Feedback, 'Modal');

  // ── helpers ────────────────────────────────────────────────────────────────
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    const n = parseFloat(num);
    if (isNaN(n)) return '0';
    const parts = n.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts[1] === '00' ? parts[0] : parts.join('.');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RequestSummary
  // ════════════════════════════════════════════════════════════════════════════
  const RequestSummary = ({
    isOpen, onClose, record, language = 'fa', formCode = 'REQ_REQUEST_MNGMT'
  }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;

    const [showGrid,       setShowGrid]       = useState(false);
    const [currencyRates,  setCurrencyRates]  = useState({});

    // ── fetch exchange rates relative to the request date ──────────────────
    useEffect(() => {
      if (!isOpen || !record || !supabase) return;
      const fetchRates = async () => {
        try {
          const dateStr     = record.need_date || record.created_at || new Date().toISOString();
          const formattedDate = dateStr.replace(/\//g, '-').split('T')[0];
          const { data } = await supabase
            .from('fm_currency_rates')
            .select('base_currency, target_currency, rate, rate_date')
            .lte('rate_date', formattedDate)
            .order('rate_date', { ascending: false });
          const latest = {};
          (data || []).forEach(r => {
            const key = `${r.base_currency}_${r.target_currency}`;
            if (!latest[key]) latest[key] = r.rate;
          });
          setCurrencyRates(latest);
        } catch {}
      };
      fetchRates();
    }, [isOpen, record, supabase]);

    // ── rate resolver ──────────────────────────────────────────────────────
    const resolveRates = useCallback((currency) => {
      let toUsd = 1;
      if (currency !== 'USD') {
        const direct  = currencyRates[`${currency}_USD`];
        const inverse = currencyRates[`USD_${currency}`];
        if (direct)        toUsd = parseFloat(direct);
        else if (inverse)  toUsd = 1 / parseFloat(inverse);
      }
      let usdToIrr = parseFloat(currencyRates['USD_IRR'] || 1);
      if (!currencyRates['USD_IRR'] && currencyRates['IRR_USD'])
        usdToIrr = 1 / parseFloat(currencyRates['IRR_USD']);
      return { toUsd, usdToIrr };
    }, [currencyRates]);

    // ── compute all totals ─────────────────────────────────────────────────
    const {
      mappedItems,
      depReqUsd, widReqUsd, depReqIrr, widReqIrr,
      depAppUsd, widAppUsd, depAppIrr, widAppIrr,
      depRemUsd, widRemUsd, depRemIrr, widRemIrr,
    } = useMemo(() => {
      const rawItems = record?.req_request_items || [];
      let dRqU = 0, wRqU = 0, dRqI = 0, wRqI = 0;
      let dApU = 0, wApU = 0, dApI = 0, wApI = 0;
      let dReU = 0, wReU = 0, dReI = 0, wReI = 0;

      const mItems = rawItems.map(item => {
        const cur      = item.currency || 'IRR';
        const { toUsd, usdToIrr } = resolveRates(cur);
        const isDeposit = item.transaction_action === 'DEPOSIT';

        const reqDep = parseFloat(item.deposit_amount    || 0);
        const reqWid = parseFloat(item.withdrawal_amount || 0);
        const app    = parseFloat(item.approved_amount   || 0);
        const rem    = parseFloat(item.remaining_amount  || 0);

        const reqDepUsd = reqDep * toUsd;
        const reqWidUsd = reqWid * toUsd;
        const reqDepIrr = reqDepUsd * usdToIrr;
        const reqWidIrr = reqWidUsd * usdToIrr;

        const appUsd = app * toUsd;
        const appIrr = appUsd * usdToIrr;
        const remUsd = rem * toUsd;
        const remIrr = remUsd * usdToIrr;

        dRqU += reqDepUsd; wRqU += reqWidUsd;
        dRqI += reqDepIrr; wRqI += reqWidIrr;

        if (isDeposit) {
          dApU += appUsd; dApI += appIrr;
          dReU += remUsd; dReI += remIrr;
        } else {
          wApU += appUsd; wApI += appIrr;
          wReU += remUsd; wReI += remIrr;
        }

        return {
          ...item,
          deposit_amount:    reqDep,
          withdrawal_amount: reqWid,
          approved_amount:   app,
          remaining_amount:  rem,
          exchange_rate_to_usd:     toUsd,
          exchange_rate_usd_to_irr: usdToIrr,
          req_dep_usd: reqDepUsd, req_wid_usd: reqWidUsd,
          req_dep_irr: reqDepIrr, req_wid_irr: reqWidIrr,
          app_usd: appUsd, app_irr: appIrr,
          rem_usd: remUsd, rem_irr: remIrr,
        };
      });

      return {
        mappedItems: mItems,
        depReqUsd: dRqU, widReqUsd: wRqU, depReqIrr: dRqI, widReqIrr: wRqI,
        depAppUsd: dApU, widAppUsd: wApU, depAppIrr: dApI, widAppIrr: wApI,
        depRemUsd: dReU, widRemUsd: wReU, depRemIrr: dReI, widRemIrr: wReI,
      };
    }, [record, resolveRates]);

    if (!isOpen || !record) return null;

    const handleClose = () => { setShowGrid(false); onClose(); };

    // ── SummaryCard: compact, designed to fill flex-1 height ──────────────
    const SummaryCard = ({ title, Icon, iconColor, usdDep, usdWid, irrDep, irrWid }) => (
      <Card noPadding className="border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col min-h-0" language={language}>
        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 flex items-center justify-between shrink-0">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-[12px]">{title}</span>
          <Icon size={13} className={iconColor} />
        </div>
        <div className="px-2 py-1.5 flex-1">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="w-8 pb-0.5" />
                <th className="pb-0.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-[10px]">{t('واریز', 'Dep')}</th>
                <th className="pb-0.5 text-right font-bold text-rose-500 dark:text-rose-400 text-[10px]">{t('برداشت', 'Wid')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 dark:border-slate-700/60">
                <td className="py-1 text-[10px] font-bold text-slate-400">USD</td>
                <td className="py-1" dir="ltr"><span className="block text-right font-bold text-slate-700 dark:text-slate-200 text-[12px]">{formatNumber(usdDep)}</span></td>
                <td className="py-1" dir="ltr"><span className="block text-right font-bold text-slate-700 dark:text-slate-200 text-[12px]">{formatNumber(usdWid)}</span></td>
              </tr>
              <tr className="border-t border-slate-100 dark:border-slate-700/60">
                <td className="py-1 text-[10px] font-bold text-slate-400">IRR</td>
                <td className="py-1" dir="ltr"><span className="block text-right font-bold text-slate-700 dark:text-slate-200 text-[12px]">{formatNumber(irrDep)}</span></td>
                <td className="py-1" dir="ltr"><span className="block text-right font-bold text-slate-700 dark:text-slate-200 text-[12px]">{formatNumber(irrWid)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    );

    // ── AmountCell: user-entered (prominent) + calculated conversions (muted) ──
    // Currency code always after the number, dir=ltr, right-aligned
    const AmountCell = ({ amount, usd, irr, cur, isDeposit }) => {
      if (!amount) return <span className="text-slate-300 dark:text-slate-600 text-[12px]" dir="ltr">—</span>;
      const mainColor = isDeposit ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400';
      return (
        <div className="flex flex-col gap-[3px]" dir="ltr">
          {/* user-entered */}
          <span className={`font-bold text-[12px] ${mainColor}`}>
            {formatNumber(amount)}&nbsp;<span className="text-[10px] font-semibold">{cur}</span>
          </span>
          {/* calculated – muted, smaller */}
          <span className="text-[10px] text-slate-400">
            ≈&nbsp;$&nbsp;{formatNumber(usd)}
          </span>
          <span className="text-[10px] text-slate-400">
            ≈&nbsp;﷼&nbsp;{formatNumber(irr)}
          </span>
        </div>
      );
    };

    // ── grid columns – widths tuned to fit without horizontal scroll ──────
    const summaryColumns = [
      {
        field: 'row_number', header_fa: '#', header_en: '#', width: '32px',
        render: val => <span className="text-[12px] text-slate-400">{val}</span>,
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
        field: 'deposit_amount',
        header_fa: t('مبلغ درخواستی', 'Requested'),
        header_en: 'Requested',
        width: '100px',
        render: (val, row) => {
          const isDep = row.transaction_action === 'DEPOSIT';
          const amt   = isDep ? row.deposit_amount    : row.withdrawal_amount;
          const usd   = isDep ? row.req_dep_usd       : row.req_wid_usd;
          const irr   = isDep ? row.req_dep_irr       : row.req_wid_irr;
          return <AmountCell amount={amt} usd={usd} irr={irr} cur={row.currency} isDeposit={isDep} />;
        },
      },
      {
        field: 'approved_amount',
        header_fa: t('تایید شده', 'Approved'),
        header_en: 'Approved',
        width: '100px',
        render: (val, row) => {
          const isDep = row.transaction_action === 'DEPOSIT';
          return <AmountCell amount={val} usd={row.app_usd} irr={row.app_irr} cur={row.currency} isDeposit={isDep} />;
        },
      },
      {
        field: 'remaining_amount',
        header_fa: t('مانده', 'Remaining'),
        header_en: 'Remaining',
        width: '100px',
        render: (val, row) => {
          const isDep = row.transaction_action === 'DEPOSIT';
          return <AmountCell amount={val} usd={row.rem_usd} irr={row.rem_irr} cur={row.currency} isDeposit={isDep} />;
        },
      },
      {
        field: 'description', header_fa: 'شرح', header_en: 'Description', width: '110px',
        render: val => <span className="text-[12px] text-slate-500 dark:text-slate-400 truncate block" title={val || ''}>{val || '—'}</span>,
      },
    ];

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('خلاصه ارزی درخواست', 'Request Currency Summary')}
        width={showGrid ? 'max-w-5xl' : 'max-w-xs'}
        language={language}
      >
        <div className={`p-4 bg-slate-50 dark:bg-slate-900 rounded-b-lg flex gap-4 ${showGrid ? 'flex-row' : 'flex-col'}`}>

          {/* ── Cards column (always 230px, same size in both states) ── */}
          <div
            className="flex flex-col gap-2 shrink-0"
            style={{ width: '280px', height: showGrid ? '380px' : 'auto' }}
          >
            <SummaryCard
              title={t('مبلغ درخواستی', 'Requested')}
              Icon={DollarSign} iconColor="text-indigo-500"
              usdDep={depReqUsd} usdWid={widReqUsd}
              irrDep={depReqIrr} irrWid={widReqIrr}
            />
            <SummaryCard
              title={t('تایید شده', 'Approved')}
              Icon={CheckCircle} iconColor="text-emerald-500"
              usdDep={depAppUsd} usdWid={widAppUsd}
              irrDep={depAppIrr} irrWid={widAppIrr}
            />
            <SummaryCard
              title={t('مانده', 'Remaining')}
              Icon={Clock} iconColor="text-orange-500"
              usdDep={depRemUsd} usdWid={widRemUsd}
              irrDep={depRemIrr} irrWid={widRemIrr}
            />
            <Button
              variant={showGrid ? 'primary' : 'outline'}
              className="w-full mt-auto"
              icon={LayoutList}
              onClick={() => setShowGrid(p => !p)}
            >
              {showGrid ? t('مخفی‌سازی اقلام', 'Hide Items') : t('نمایش جزئیات اقلام', 'Show Item Details')}
            </Button>
          </div>

          {/* ── Data Grid (same height as cards, no horizontal scroll) ── */}
          {showGrid && (
            <div
              className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 animate-in fade-in duration-200 min-w-0"
              style={{ height: '380px' }}
            >
              <DataGrid
                data={mappedItems}
                columns={summaryColumns}
                language={language}
                formCode={formCode}
                hideImport={true}
                hideExport={true}
                hideToolbar={true}
                selectable={false}
              />
            </div>
          )}
        </div>
      </Modal>
    );
  };

  window.RequestSummary = RequestSummary;
})();
