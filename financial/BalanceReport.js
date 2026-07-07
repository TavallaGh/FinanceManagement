/* Filename: financial/BalanceReport.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;

  // ── Fallbacks ─────────────────────────────────────────────────────────────
  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const FallbackComponent = () => null;

  // ── Icons ─────────────────────────────────────────────────────────────────
  const LucideIcons = window.LucideIcons || {};
  const {
    TrendingUp     = FallbackIcon,
    RefreshCw      = FallbackIcon,
    FileSpreadsheet = FallbackIcon,
    Loader2        = FallbackIcon,
  } = LucideIcons;

  // ── Design System ─────────────────────────────────────────────────────────
  const DS        = window.DesignSystem  || {};
  const Core      = window.DSCore        || DS || {};
  const DSGrid    = window.DSGrid        || DS || {};
  const DSFeedback = window.DSFeedback   || DS || {};

  const Button          = Core.Button          || FallbackComponent;
  const PageHeader      = Core.PageHeader      || FallbackComponent;
  const EmptyState      = Core.EmptyState      || FallbackComponent;
  const Badge           = Core.Badge           || FallbackComponent;
  const AdvancedFilter  = DSGrid.AdvancedFilter || FallbackComponent;
  const Toast           = DSFeedback.Toast     || FallbackComponent;

  const supabase = window.supabase;

  // ── Helpers ───────────────────────────────────────────────────────────────
  /** Convert YYYY/MM/DD  →  YYYY-MM-DD (for JS Date & lexical comparison) */
  const toIso = (d) => (d ? String(d).replace(/\//g, '-') : '');

  /** Format a number with thousand separators; negative shown in parens */
  const fmt = (num) => {
    if (num === null || num === undefined) return '—';
    const v = parseFloat(num);
    if (isNaN(v)) return '—';
    if (v === 0) return '0';
    const abs = Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return v < 0 ? `(${abs})` : abs;
  };

  /** Build an array of ISO date strings for a range (max 62 days) */
  const buildDateRange = (from, to) => {
    const f = toIso(from);
    const t = toIso(to);
    if (!f || !t || f > t) return [];
    const dates = [];
    let cur = new Date(f + 'T00:00:00');
    const end = new Date(t + 'T00:00:00');
    let guard = 0;
    while (cur <= end && guard < 62) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return dates;
  };

  // ══════════════════════════════════════════════════════════════════════════
  const BalanceReport = ({ language = 'fa', formCode = 'FIN_BALANCE_REPORT' }) => {
    const isRtl    = language === 'fa';
    const t        = useCallback((fa, en) => (isRtl ? fa : en), [isRtl]);
    const calMode  = Core.useCalendarMode ? Core.useCalendarMode() : 'jalali';
    const fmtDate  = (d) => (Core.formatGlobalDate ? Core.formatGlobalDate(d, calMode) : d);

    // ── Current user ────────────────────────────────────────────────────────
    const sessionData = (() => {
      try {
        return JSON.parse(
          sessionStorage.getItem('fm_user_session') ||
          localStorage.getItem('fm_user_session') || '{}'
        );
      } catch { return {}; }
    })();
    const navUser       = window.NavigationSystem?.currentUser || {};
    const currentUserId = sessionData.id || navUser.id || null;
    const userType      = (sessionData.type || sessionData.user_type || navUser.user_type || '').toLowerCase();
    const isAdmin       = userType === 'admin' || userType === 'superadmin';

    // ── State ────────────────────────────────────────────────────────────────
    const [initLoading,  setInitLoading]  = useState(true);
    const [generating,   setGenerating]   = useState(false);
    const [filters,      setFilters]      = useState({});
    const [balanceGroups, setBalanceGroups] = useState([]);
    const [reportData,   setReportData]   = useState(null);
    const [toast,        setToast]        = useState({ isVisible: false, message: '', type: 'success' });

    const showToast = useCallback((msg, type = 'success') => {
      setToast({ isVisible: true, message: msg, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    // ── Load accessible balance groups ──────────────────────────────────────
    const loadGroups = useCallback(async () => {
      if (!supabase) { setInitLoading(false); return; }
      setInitLoading(true);
      try {
        const { data: groups } = await supabase
          .from('fm_balance_groups')
          .select('id, code, title_fa, title_en, access:fm_balance_group_access(grantee_type, grantee_id)')
          .eq('is_active', true)
          .order('code');

        const enriched = (groups || []).map(g => ({
          ...g,
          displayLabel: g.title_fa || g.code || ''
        }));

        if (isAdmin) {
          setBalanceGroups(enriched);
          return;
        }

        if (!currentUserId) { setBalanceGroups([]); return; }

        const { data: urData } = await supabase
          .from('sec_user_roles')
          .select('role_id')
          .eq('user_id', currentUserId);

        const myRoleIds = new Set((urData || []).map(r => String(r.role_id)));

        const accessible = enriched.filter(g =>
          (g.access || []).some(a => {
            const gt = (a.grantee_type || '').toLowerCase();
            if (gt === 'user'  && String(a.grantee_id) === String(currentUserId)) return true;
            if (gt === 'role'  && myRoleIds.has(String(a.grantee_id)))            return true;
            return false;
          })
        );
        setBalanceGroups(accessible);
      } catch (e) {
        console.error('BalanceReport: error loading groups', e);
      } finally {
        setInitLoading(false);
      }
    }, [isAdmin, currentUserId]);

    useEffect(() => { loadGroups(); }, [loadGroups]);

    // ── Generate report ─────────────────────────────────────────────────────
    const handleGenerate = useCallback(async () => {
      const selGroup  = filters.balance_group;
      const dateFrom  = filters.date_from;
      const dateTo    = filters.date_to;

      if (!selGroup || !dateFrom || !dateTo) {
        showToast(t('لطفاً گروه بالانس و بازه تاریخی را مشخص کنید.', 'Please select balance group and date range.'), 'warning');
        return;
      }

      const groupId  = (typeof selGroup === 'object') ? selGroup.id : selGroup;
      const isoFrom  = toIso(dateFrom);
      const isoTo    = toIso(dateTo);

      if (isoFrom > isoTo) {
        showToast(t('تاریخ شروع نباید بعد از تاریخ پایان باشد.', 'Start date must not be after end date.'), 'error');
        return;
      }

      setGenerating(true);
      setReportData(null);

      try {
        // ── 1. Group accounts (is_active = true only) ──────────────────────
        const { data: groupAccs, error: gaErr } = await supabase
          .from('fm_balance_group_accounts')
          .select('account_id, valid_from, valid_to, fm_coa_accounts(id, code, title_fa, title_en)')
          .eq('group_id', groupId)
          .eq('is_active', true);

        if (gaErr) throw gaErr;
        if (!groupAccs || groupAccs.length === 0) {
          setReportData({ dates: [], accounts: [], matrix: {}, groupName: selGroup.title_fa || '' });
          return;
        }

        // Deduplicate accounts; collect all valid date ranges per account
        const accMap = {};
        (groupAccs || []).forEach(ga => {
          const aid = String(ga.account_id);
          if (!accMap[aid]) {
            accMap[aid] = {
              id:       aid,
              code:     ga.fm_coa_accounts?.code     || '',
              title_fa: ga.fm_coa_accounts?.title_fa || '',
              title_en: ga.fm_coa_accounts?.title_en || '',
              ranges:   []
            };
          }
          accMap[aid].ranges.push({
            from: toIso(ga.valid_from) || '0000-01-01',
            to:   toIso(ga.valid_to)   || '9999-12-31'
          });
        });

        const allAccounts  = Object.values(accMap).sort((a, b) => a.code.localeCompare(b.code));
        const accountIds   = allAccounts.map(a => a.id);
        const dates        = buildDateRange(isoFrom, isoTo);

        if (dates.length === 0) {
          setReportData({ dates: [], accounts: allAccounts, matrix: {}, groupName: selGroup.title_fa || '' });
          return;
        }

        // ── 2. Transactions (TEMPORARY / FINAL / APPROVED) up to dateTo ───
        //    document_date stored as YYYY/MM/DD — compare with slashes
        const isoToSlash = isoTo.replace(/-/g, '/');
        const { data: txData } = await supabase
          .from('fm_transactions')
          .select('id, document_date, status')
          .in('status', ['TEMPORARY', 'FINAL', 'APPROVED'])
          .lte('document_date', isoToSlash);

        // Build a map: txId → ISO date
        const txDateMap = {};
        (txData || []).forEach(tx => {
          txDateMap[String(tx.id)] = toIso(tx.document_date);
        });
        const validTxIds = new Set(Object.keys(txDateMap));

        // ── 3. Transaction items for the accounts ─────────────────────────
        let allItems = [];
        if (validTxIds.size > 0 && accountIds.length > 0) {
          const BATCH = 400;
          for (let i = 0; i < accountIds.length; i += BATCH) {
            const batch = accountIds.slice(i, i + BATCH);
            const { data: items } = await supabase
              .from('fm_transaction_items')
              .select('account_id, transaction_id, transaction_action, deposit_amount, withdrawal_amount')
              .in('account_id', batch);

            (items || []).forEach(item => {
              if (validTxIds.has(String(item.transaction_id))) {
                allItems.push(item);
              }
            });
          }
        }

        // ── 4. Build daily totals: dailyMap[accountId][isoDate] = {dep,wid} ─
        const dailyMap = {};
        allItems.forEach(item => {
          const aid    = String(item.account_id);
          const txDate = txDateMap[String(item.transaction_id)];
          if (!txDate) return;
          if (!dailyMap[aid]) dailyMap[aid] = {};
          if (!dailyMap[aid][txDate]) dailyMap[aid][txDate] = { dep: 0, wid: 0 };
          if (item.transaction_action === 'DEPOSIT') {
            dailyMap[aid][txDate].dep += parseFloat(item.deposit_amount || 0);
          } else {
            dailyMap[aid][txDate].wid += parseFloat(item.withdrawal_amount || 0);
          }
        });

        // ── 5. Compute running balance (cumulative from inception) ─────────
        /*
         *  Balance(account, dayX) = Σ (deposit - withdrawal)  for all tx dates ≤ dayX
         *
         *  This is the standard running/cumulative balance formula:
         *    Balance(X) = Balance(X-1) + Deposits(X) – Withdrawals(X)
         */
        const matrix = {};
        allAccounts.forEach(acc => {
          matrix[acc.id] = {};
          const daily     = dailyMap[acc.id] || {};
          const txDates   = Object.keys(daily).sort();

          dates.forEach(d => {
            // Account is shown for date d only if it was active in the group on that day
            const activeOnDate = acc.ranges.some(r => d >= r.from && d <= r.to);
            if (!activeOnDate) {
              matrix[acc.id][d] = null;
              return;
            }
            // Cumulative balance up to (and including) d
            let balance = 0;
            txDates.forEach(txD => {
              if (txD <= d) balance += daily[txD].dep - daily[txD].wid;
            });
            matrix[acc.id][d] = balance;
          });
        });

        setReportData({
          dates,
          accounts:  allAccounts,
          matrix,
          groupName: (typeof selGroup === 'object') ? (selGroup.title_fa || selGroup.code || '') : ''
        });

      } catch (e) {
        console.error('BalanceReport: error generating', e);
        showToast(t('خطا در تولید گزارش', 'Error generating report'), 'error');
      } finally {
        setGenerating(false);
      }
    }, [filters, showToast, t]);

    // ── Excel export ────────────────────────────────────────────────────────
    const handleExport = useCallback(() => {
      if (!reportData) return;
      const XLSX = window.XLSX;
      if (!XLSX) { showToast(t('کتابخانه اکسل در دسترس نیست', 'Excel library not available'), 'error'); return; }

      const { dates, accounts, matrix } = reportData;
      const header = [
        t('کد حساب', 'Account Code'),
        t('عنوان حساب', 'Account Title'),
        ...dates.map(d => fmtDate(d))
      ];
      const rows = accounts.map(acc => [
        acc.code,
        isRtl ? acc.title_fa : (acc.title_en || acc.title_fa),
        ...dates.map(d => {
          const v = matrix[acc.id]?.[d];
          return v === null || v === undefined ? '' : v;
        })
      ]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('بالانس روزانه', 'Daily Balance'));
      XLSX.writeFile(wb, 'BalanceReport.xlsx');
    }, [reportData, isRtl, fmtDate, showToast, t]);

    // ── LOV columns for balance group ───────────────────────────────────────
    const groupLovCols = useMemo(() => [
      { field: 'code',     header_fa: 'کد',              header_en: 'Code',         width: '70px'  },
      { field: 'title_fa', header_fa: 'عنوان گروه بالانس', header_en: 'Balance Group', width: '220px' }
    ], []);

    // ── Filter fields ───────────────────────────────────────────────────────
    const filterFields = useMemo(() => [
      {
        name:         'balance_group',
        label:        t('گروه بالانس', 'Balance Group'),
        type:         'lov',
        lovData:      balanceGroups,
        lovColumns:   groupLovCols,
        dropdownWidth:'min-w-[340px]'
      },
      { name: 'date_from', label: t('از تاریخ', 'From Date'), type: 'date' },
      { name: 'date_to',   label: t('تا تاریخ', 'To Date'),   type: 'date' }
    ], [t, balanceGroups, groupLovCols]);

    // ── Matrix renderer (custom – no DS equivalent) ─────────────────────────
    const renderMatrix = () => {
      const { dates, accounts, matrix, groupName } = reportData;

      if (accounts.length === 0) {
        return React.createElement(EmptyState, {
          title:       t('حسابی در این گروه یافت نشد', 'No accounts found in this group'),
          description: t('گروه انتخابی هیچ حساب فعالی ندارد.', 'The selected balance group has no active accounts.'),
          language
        });
      }

      if (dates.length === 0) {
        return React.createElement(EmptyState, {
          title:       t('بازه تاریخی نامعتبر است', 'Invalid date range'),
          description: t('بازه تاریخی وارد شده نامعتبر است.', 'The provided date range is invalid.'),
          language
        });
      }

      /* Sticky offset for the two frozen columns */
      const stickyFirst  = isRtl ? { right: 0 }      : { left: 0 };
      const stickySecond = isRtl ? { right: '70px' }  : { left: '70px' };
      const cellBase     = 'border border-slate-200 dark:border-slate-700 px-2 py-1.5';
      const stickyBase   = 'bg-inherit';

      return React.createElement('div', { className: 'flex flex-col h-full' },

        // ── Info bar ──────────────────────────────────────────────────────
        React.createElement('div', {
          className: 'flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 shrink-0 flex-wrap gap-2'
        },
          React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
            groupName && React.createElement(Badge, { variant: 'info', size: 'sm' }, groupName),
            React.createElement('span', { className: 'text-[12px] text-slate-500 dark:text-slate-400' },
              t(
                `${accounts.length} حساب  ·  ${dates.length} روز`,
                `${accounts.length} accounts  ·  ${dates.length} days`
              )
            )
          ),
          React.createElement(Button, {
            variant: 'ghost',
            size:    'xs',
            icon:    FileSpreadsheet,
            onClick: handleExport
          }, t('خروجی اکسل', 'Export Excel'))
        ),

        // ── Scrollable matrix ─────────────────────────────────────────────
        React.createElement('div', { className: 'flex-1 overflow-auto custom-scrollbar' },
          React.createElement('table', { className: 'border-collapse text-[12px]', style: { minWidth: '100%' } },

            // Header row
            React.createElement('thead', null,
              React.createElement('tr', null,

                // Code column header
                React.createElement('th', {
                  className: `${cellBase} sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-right font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap`,
                  style: { ...stickyFirst, position: 'sticky', minWidth: '70px' }
                }, t('کد حساب', 'Code')),

                // Title column header
                React.createElement('th', {
                  className: `${cellBase} sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-right font-bold text-slate-700 dark:text-slate-300`,
                  style: { ...stickySecond, position: 'sticky', minWidth: '180px' }
                }, t('عنوان حساب', 'Account Title')),

                // Date column headers
                ...dates.map(d =>
                  React.createElement('th', {
                    key: d,
                    className: `${cellBase} sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-center font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap`,
                    style: { minWidth: '110px' }
                  }, fmtDate(d))
                )
              )
            ),

            // Body rows
            React.createElement('tbody', null,
              accounts.map((acc, idx) => {
                const rowBg = idx % 2 === 0
                  ? 'bg-white dark:bg-slate-900'
                  : 'bg-slate-50/60 dark:bg-slate-800/40';

                return React.createElement('tr', {
                  key: acc.id,
                  className: `${rowBg} hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors`
                },

                  // Code cell (sticky)
                  React.createElement('td', {
                    className: `${cellBase} ${stickyBase} font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap`,
                    style: { ...stickyFirst, position: 'sticky' }
                  }, acc.code),

                  // Title cell (sticky)
                  React.createElement('td', {
                    className: `${cellBase} ${stickyBase} font-medium text-slate-800 dark:text-slate-200 truncate`,
                    style: { ...stickySecond, position: 'sticky', maxWidth: '200px' },
                    title: isRtl ? acc.title_fa : (acc.title_en || acc.title_fa)
                  }, isRtl ? acc.title_fa : (acc.title_en || acc.title_fa)),

                  // Value cells
                  ...dates.map(d => {
                    const val = matrix[acc.id]?.[d];

                    // Account not valid on this date
                    if (val === null || val === undefined) {
                      return React.createElement('td', {
                        key: d,
                        className: `${cellBase} text-center text-slate-300 dark:text-slate-600`
                      }, '—');
                    }

                    const colorCls = val === 0
                      ? 'text-slate-400 dark:text-slate-500'
                      : val > 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400';

                    return React.createElement('td', {
                      key: d,
                      className: `${cellBase} text-center font-mono ${colorCls}`
                    }, fmt(val));
                  })
                );
              })
            )
          )
        )
      );
    };

    // ── Main render ─────────────────────────────────────────────────────────
    return React.createElement('div', {
      className: 'h-full flex flex-col font-sans',
      dir: isRtl ? 'rtl' : 'ltr'
    },
      React.createElement('div', {
        className: 'p-4 h-full flex flex-col bg-slate-50/50 dark:bg-slate-900 overflow-hidden'
      },

        // Page header
        React.createElement(PageHeader, {
          title:       t('گزارش بالانس روزانه', 'Daily Balance Report'),
          icon:        TrendingUp,
          language,
          description: t(
            'نمایش موجودی روزانه حساب‌ها به‌ازای هر گروه بالانس (ماتریس حساب × تاریخ)',
            'Daily account balance matrix per balance group (accounts × dates)'
          ),
          breadcrumbs: [
            { label: t('مدیریت مالی', 'Financial Management') },
            { label: t('گزارش بالانس روزانه', 'Daily Balance Report') }
          ]
        }),

        React.createElement('div', { className: 'flex-1 min-h-0 flex flex-col mt-4 overflow-hidden gap-2' },

          // Advanced filter
          React.createElement(AdvancedFilter, {
            fields:        filterFields,
            initialValues: filters,
            onFilter:      setFilters,
            onClear:       () => { setFilters({}); setReportData(null); },
            language,
            defaultOpen:   true
          },
            // "Generate Report" button placed in the children slot (left side of footer)
            React.createElement(Button, {
              variant: 'primary',
              size:    'sm',
              icon:    generating ? Loader2 : RefreshCw,
              onClick: handleGenerate,
              disabled: generating
            }, generating
              ? t('در حال پردازش...', 'Processing...')
              : t('تولید گزارش', 'Generate Report')
            )
          ),

          // Content area
          generating
            ? React.createElement('div', {
                className: 'flex-1 flex items-center justify-center gap-2 text-[13px] text-slate-500 dark:text-slate-400'
              },
                React.createElement('div', {
                  className: 'w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0'
                }),
                t('در حال محاسبه گزارش...', 'Generating report...')
              )

            : !reportData
              ? React.createElement('div', { className: 'flex-1' },
                  React.createElement(EmptyState, {
                    title:       t('گزارشی نمایش داده نشده', 'No report displayed'),
                    description: t(
                      'گروه بالانس و بازه تاریخی را انتخاب کرده، سپس دکمه «تولید گزارش» را بزنید.',
                      'Select a balance group and date range, then click Generate Report.'
                    ),
                    language
                  })
                )

              : React.createElement('div', {
                  className: 'flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col'
                },
                  renderMatrix()
                )
        )
      ),

      // Toast
      React.createElement(Toast, {
        isVisible: toast.isVisible,
        message:   toast.message,
        type:      toast.type,
        onClose:   () => setToast(prev => ({ ...prev, isVisible: false })),
        language
      })
    );
  };

  window.BalanceReport = BalanceReport;
})();
