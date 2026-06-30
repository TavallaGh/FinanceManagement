/* Filename: financial/TransactionActions.js
 * عملیات گروهی تراکنش‌ها و مدیریت اکسپورت
 * این ماژول یک custom hook با نام useTransactionActions صادر می‌کند
 * که توسط TransactionMain.js فراخوانی می‌شود.
 */
(() => {
  const React = window.React;
  const { useCallback, useMemo } = React;

  const FallbackIcon = ({ size = 16 }) =>
    React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

  const safeIcon = (moduleObj, iconName) => {
    const icon = moduleObj && moduleObj[iconName];
    if (typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof)) return icon;
    if (icon && icon.default) return icon.default;
    return FallbackIcon;
  };

  /* ── ثوابت وضعیت ─────────────────────────────────── */
  const STATUS_ORDER = ['DRAFT', 'TEMPORARY', 'FINAL', 'APPROVED'];

  const isLocked = (tx) => tx.status === 'FINAL' || tx.status === 'APPROVED';

  const canTransitionTo = (from, to) => {
    if (from === 'APPROVED') return false;
    if (to === 'DRAFT'      && from === 'TEMPORARY') return true;
    if (to === 'TEMPORARY'  && from === 'FINAL')     return true;
    const fromIdx = STATUS_ORDER.indexOf(from);
    const toIdx   = STATUS_ORDER.indexOf(to);
    return toIdx === fromIdx + 1;
  };

  /* ── محاسبه نرخ ارز ──────────────────────────────── */
  const resolveRates = (ratesMap, currency) => {
    let toUsd = 1;
    if (currency !== 'USD') {
      const direct  = ratesMap[`${currency}_USD`];
      if (direct) {
        toUsd = parseFloat(direct);
      } else {
        const inverse = ratesMap[`USD_${currency}`];
        if (inverse) toUsd = 1 / parseFloat(inverse);
      }
    }
    let usdToIrr = parseFloat(ratesMap['USD_IRR'] || 1);
    if (!ratesMap['USD_IRR'] && ratesMap['IRR_USD']) {
      usdToIrr = 1 / parseFloat(ratesMap['IRR_USD']);
    }
    return { toUsd, usdToIrr };
  };

  /* ════════════════════════════════════════════════════
     useTransactionActions — Custom Hook
     ════════════════════════════════════════════════════ */
  const useTransactionActions = ({
    transactions,
    filteredTransactions,
    filteredRecordId,
    usersMap,
    deptsMap,
    lookups,
    deleteConfirm,
    supabase,
    currentUserId,
    currentUserName,
    isRtl,
    dateLocale,
    setIsLoading,
    fetchData,
    showToast,
    logAction,
    setDeleteConfirm,
  }) => {
    const t = (fa, en) => isRtl ? fa : en;

    const LucideIcons = window.LucideIcons || {};
    const FileText    = safeIcon(LucideIcons, 'FileText');
    const EditIcon    = safeIcon(LucideIcons, 'Edit');
    const Trash2      = safeIcon(LucideIcons, 'Trash2');
    const RefreshCw   = safeIcon(LucideIcons, 'RefreshCw');
    const CheckCircle = safeIcon(LucideIcons, 'CheckCircle');
    const CheckSquare = safeIcon(LucideIcons, 'CheckSquare');
    const RotateCcw   = safeIcon(LucideIcons, 'RotateCcw');

    /* ── حذف (تک + گروهی) ─────────────────────────── */
    const executeDelete = useCallback(async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          if (isLocked(deleteConfirm.data)) {
            showToast(t('سندهای بررسی شده یا تایید شده قابل حذف نیستند.', 'Reviewed or approved documents cannot be deleted.'), 'warning');
            setDeleteConfirm({ isOpen: false, type: null, data: null });
            setIsLoading(false);
            return;
          }
          const { error } = await supabase.from('fm_transactions').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await logAction('delete_transaction', deleteConfirm.data.id, `حذف تراکنش: ${deleteConfirm.data.document_code}`);
        } else if (deleteConfirm.type === 'bulk') {
          const deletable = transactions.filter(tx => deleteConfirm.data.includes(tx.id) && !isLocked(tx));
          const skipped   = deleteConfirm.data.length - deletable.length;
          if (deletable.length === 0) {
            showToast(t(
              'هیچ‌کدام از سندهای انتخابی قابل حذف نیستند. سندهای بررسی شده یا تایید شده قابل حذف نمی‌باشند.',
              'None of the selected documents can be deleted.'
            ), 'warning');
            setDeleteConfirm({ isOpen: false, type: null, data: null });
            setIsLoading(false);
            return;
          }
          const deletableIds = deletable.map(tx => tx.id);
          const { error } = await supabase.from('fm_transactions').delete().in('id', deletableIds);
          if (error) throw error;
          await logAction(
            'bulk_delete_transactions', 'BULK_DELETE',
            `حذف گروهی ${deletableIds.length} تراکنش${skipped > 0 ? ` (${skipped} سند قفل شده نادیده گرفته شد)` : ''}`
          );
          if (skipped > 0) {
            showToast(t(
              `${deletableIds.length} سند حذف شد. ${skipped} سند بررسی/تایید شده نادیده گرفته شد.`,
              `${deletableIds.length} deleted. ${skipped} locked documents were skipped.`
            ), 'warning');
            fetchData();
            setDeleteConfirm({ isOpen: false, type: null, data: null });
            setIsLoading(false);
            return;
          }
        }
        showToast(t('عملیات با موفقیت انجام شد.', 'Operation successful.'));
        fetchData();
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (error) {
        showToast(t('خطا در حذف.', 'Error deleting.'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [deleteConfirm, transactions, supabase, setIsLoading, showToast, logAction, fetchData, setDeleteConfirm, isRtl]);

    /* ── تغییر وضعیت گروهی ───────────────────────── */
    const handleBulkStatusChange = useCallback(async (newStatus, ids) => {
      setIsLoading(true);
      try {
        const eligible = transactions.filter(tx => ids.includes(tx.id) && canTransitionTo(tx.status, newStatus));
        const skipped  = ids.length - eligible.length;

        if (eligible.length === 0) {
          showToast(t(
            'هیچ‌کدام از رکوردهای انتخابی امکان تغییر به این وضعیت را ندارند.',
            'None of the selected records can transition to this status.'
          ), 'warning');
          setIsLoading(false);
          return;
        }

        const eligibleIds = eligible.map(tx => tx.id);
        const now = new Date().toISOString();

        const { error } = await supabase.from('fm_transactions').update({ status: newStatus }).in('id', eligibleIds);
        if (error) throw error;

        const actorName = (currentUserId && usersMap[currentUserId]) ? usersMap[currentUserId] : currentUserName;
        const metaPayload = {};
        if (newStatus === 'FINAL') {
          metaPayload.reviewed_by      = currentUserId || null;
          metaPayload.reviewed_at      = now;
          metaPayload.reviewed_by_name = actorName;
        } else if (newStatus === 'APPROVED') {
          metaPayload.approved_by      = currentUserId || null;
          metaPayload.approved_at      = now;
          metaPayload.approved_by_name = actorName;
        } else if (newStatus === 'TEMPORARY') {
          metaPayload.reviewed_by      = null;
          metaPayload.reviewed_at      = null;
          metaPayload.reviewed_by_name = null;
        }
        if (Object.keys(metaPayload).length > 0) {
          const { error: metaError } = await supabase.from('fm_transactions').update(metaPayload).in('id', eligibleIds);
          if (metaError) console.warn('متادیتای بررسی/تایید ذخیره نشد:', metaError.message);
        }

        const statusLabels = { DRAFT: 'یادداشت', TEMPORARY: 'موقت', FINAL: 'بررسی شده', APPROVED: 'تایید شده' };
        showToast(
          skipped > 0
            ? t(`وضعیت ${eligible.length} سند تغییر کرد. ${skipped} سند به دلیل ترتیب وضعیت قابل تغییر نبود.`, `${eligible.length} records updated. ${skipped} skipped due to invalid transition.`)
            : t('وضعیت با موفقیت تغییر کرد.', 'Status updated.'),
          skipped > 0 ? 'warning' : 'success'
        );
        await logAction('bulk_status_update', 'BULK_UPDATE',
          `تغییر وضعیت ${eligible.length} سند به ${statusLabels[newStatus] || newStatus} توسط ${currentUserName}`
        );
        fetchData();
      } catch (error) {
        showToast(t('خطا در تغییر وضعیت.', 'Error updating status.'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [transactions, supabase, currentUserId, currentUserName, usersMap, setIsLoading, showToast, logAction, fetchData, isRtl]);

    /* ── بروزرسانی نرخ ارز گروهی ─────────────────── */
    const handleBulkUpdateRates = useCallback(async (ids) => {
      setIsLoading(true);
      try {
        const selectedTxs = transactions.filter(
          tx => ids.includes(tx.id) && (tx.status === 'DRAFT' || tx.status === 'TEMPORARY')
        );
        if (selectedTxs.length === 0) {
          showToast(t(
            'تراکنش‌های بررسی شده یا تایید شده امکان بروزرسانی نرخ ارز را ندارند.',
            'Reviewed or Approved transactions cannot have exchange rates updated.'
          ), 'warning');
          setIsLoading(false);
          return;
        }

        const uniqueDates = [...new Set(selectedTxs.map(tx => tx.document_date).filter(Boolean))];
        const ratesByDate = {};
        for (const date of uniqueDates) {
          const formattedDate = date.replace(/\//g, '-');
          const { data } = await supabase.from('fm_currency_rates')
            .select('base_currency, target_currency, rate, rate_date, created_at')
            .lte('rate_date', formattedDate)
            .order('rate_date', { ascending: false });
          // مرتب‌سازی ثانویه در کلاینت برای ایمنی در برابر تفاوت نسخه‌های Supabase
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
          ratesByDate[date] = latestRates;
        }

        let updatedCount = 0;
        for (const tx of selectedTxs) {
          const ratesMap = ratesByDate[tx.document_date] || {};
          for (const item of (tx.fm_transaction_items || [])) {
            const cur = item.currency || 'IRR';
            const { toUsd, usdToIrr } = resolveRates(ratesMap, cur);
            const dep = parseFloat(item.deposit_amount || 0);
            const wid = parseFloat(item.withdrawal_amount || 0);
            const val = dep > 0 ? dep : wid;
            const { error } = await supabase.from('fm_transaction_items').update({
              exchange_rate_to_usd:     toUsd,
              exchange_rate_usd_to_irr: usdToIrr,
              amount_usd:               val * toUsd,
              amount_irr:               val * toUsd * usdToIrr,
            }).eq('id', item.id);
            if (!error) updatedCount++;
          }
        }

        showToast(t(
          `${updatedCount} قلم تراکنش با آخرین نرخ‌های ارز بروز شد.`,
          `${updatedCount} items updated with latest exchange rates.`
        ));
        await logAction('bulk_update_rates', 'BULK',
          `بروزرسانی نرخ ارز ${selectedTxs.length} سند (${updatedCount} قلم) توسط ${currentUserName}`
        );
        fetchData();
      } catch (error) {
        showToast(t('خطا در بروزرسانی نرخ ارزها.', 'Error updating exchange rates.'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [transactions, supabase, currentUserName, setIsLoading, showToast, logAction, fetchData, isRtl]);

    /* ── اکسپورت CSV ─────────────────────────────── */
    const handleCustomExport = useCallback(() => {
      const TX_TYPE   = { OPENING: t('افتتاحیه','Opening'), CLOSING: t('اختتامیه','Closing'), GENERAL: t('عمومی','General'), TRANSFER: t('انتقال','Transfer') };
      const TX_STATUS = { DRAFT: t('یادداشت','Draft'), TEMPORARY: t('موقت','Temporary'), FINAL: t('بررسی شده','Final'), APPROVED: t('تایید شده','Approved') };
      const TX_ACTION = { DEPOSIT: t('واریز','Deposit'), WITHDRAWAL: t('برداشت','Withdrawal') };
      const TX_GROUP  = { COST: t('هزینه','Cost'), INCOME: t('درآمد','Income'), BALANCE: t('بالانس','Balance'), OTHER: t('سایر','Other') };

      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const formatDT = (val) => {
        if (!val) return '';
        try { return new Intl.DateTimeFormat(dateLocale, { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(val)); }
        catch(e) { return String(val); }
      };

      const headerCols = [
        t('کد تراکنش','Transaction Code'), t('تاریخ سند','Document Date'), t('زمان ثبت','Registered At'),
        t('نوع تراکنش','Type'), t('وضعیت','Status'), t('ثبت‌کننده','Registrar'), t('دپارتمان','Department'),
        t('شرح سربرگ','Description'), t('بررسی‌کننده','Reviewed By'), t('تاریخ بررسی','Reviewed At'),
        t('تاییدکننده','Approved By'), t('تاریخ تایید','Approved At'),
        t('جمع واریز (USD)','Total Deposit (USD)'), t('جمع برداشت (USD)','Total Withdrawal (USD)'),
        t('جمع واریز (IRR)','Total Deposit (IRR)'), t('جمع برداشت (IRR)','Total Withdrawal (IRR)'),
      ];
      const itemCols = [
        t('ردیف','Row'), t('حساب','Account'), t('نوع عملیات','Action'), t('گروه','Group'),
        t('نوع هزینه/درآمد','Cost/Income Type'), t('ارز','Currency'),
        t('واریز','Deposit'), t('برداشت','Withdrawal'),
        t('معادل دلار','Amount USD'), t('معادل ریال','Amount IRR'), t('شرح قلم','Item Desc'),
      ];

      const dataToExport = filteredRecordId
        ? filteredTransactions.filter(r => String(r.id) === filteredRecordId)
        : filteredTransactions;

      const rows = [];
      dataToExport.forEach(tx => {
        const txItems = tx.fm_transaction_items || [];
        let txDepUsd = 0, txWidUsd = 0, txDepIrr = 0, txWidIrr = 0;
        txItems.forEach(item => {
          const usd = parseFloat(item.amount_usd || 0);
          const irr = parseFloat(item.amount_irr || 0);
          if (item.transaction_action === 'DEPOSIT') { txDepUsd += usd; txDepIrr += irr; }
          else                                       { txWidUsd += usd; txWidIrr += irr; }
        });
        const hdr = [
          tx.document_code || '', tx.document_date || '', formatDT(tx.created_at),
          TX_TYPE[tx.transaction_type]   || tx.transaction_type || '',
          TX_STATUS[tx.status]           || tx.status           || '',
          usersMap[tx.registrar_id]      || '',
          deptsMap[tx.department_id]     || '',
          tx.description                 || '',
          tx.reviewed_by_name            || '', formatDT(tx.reviewed_at),
          tx.approved_by_name            || '', formatDT(tx.approved_at),
          txDepUsd > 0 ? txDepUsd.toFixed(2) : '', txWidUsd > 0 ? txWidUsd.toFixed(2) : '',
          txDepIrr > 0 ? txDepIrr.toFixed(0) : '', txWidIrr > 0 ? txWidIrr.toFixed(0) : '',
        ];

        const items = tx.fm_transaction_items || [];
        if (items.length === 0) {
          rows.push([...hdr, '', '', '', '', '', '', '', '', '', '', ''].map(esc).join(','));
        } else {
          items.forEach(item => {
            const acc   = (lookups.accounts   || []).find(a => String(a.id) === String(item.account_id));
            const costT = (lookups.costTypes   || []).find(c => String(c.id) === String(item.cost_type_id));
            const incT  = (lookups.incomeTypes || []).find(c => String(c.id) === String(item.income_type_id));
            const subType = item.transaction_group === 'COST'
              ? (costT ? (isRtl ? costT.title_fa : (costT.title_en || costT.title_fa)) : '')
              : item.transaction_group === 'INCOME'
              ? (incT  ? (isRtl ? incT.title_fa  : (incT.title_en  || incT.title_fa))  : '')
              : '';
            const itemRow = [
              item.row_number || '',
              acc ? acc.displayLabel : (item.account_id || ''),
              TX_ACTION[item.transaction_action] || item.transaction_action || '',
              TX_GROUP[item.transaction_group]   || item.transaction_group  || '',
              subType, item.currency || '',
              item.deposit_amount    || '0',
              item.withdrawal_amount || '0',
              item.amount_usd        || '0',
              item.amount_irr        || '0',
              item.description       || '',
            ];
            rows.push([...hdr, ...itemRow].map(esc).join(','));
          });
        }
      });

      const allCols = [...headerCols, ...itemCols];
      const csv  = '\uFEFF' + allCols.map(esc).join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href  = URL.createObjectURL(blob);
      link.setAttribute('download', `transactions_full_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [filteredTransactions, filteredRecordId, usersMap, deptsMap, lookups, isRtl, dateLocale]);

    /* ── آرایه عملیات گروهی ──────────────────────── */
    const bulkActions = useMemo(() => [
      { label: t('تغییر به موقت',       'Set Temporary'),           icon: FileText,    variant: 'outline',       requiredAccess: 'edit',   onClick: (ids) => handleBulkStatusChange('TEMPORARY', ids) },
      { label: t('تغییر به یادداشت',    'Set Draft'),               icon: EditIcon,    variant: 'outline',       requiredAccess: 'edit',   onClick: (ids) => handleBulkStatusChange('DRAFT',     ids) },
      { label: t('تبدیل به بررسی شده', 'Set Final'),               icon: CheckSquare, variant: 'outline',       requiredAccess: 'edit',   onClick: (ids) => handleBulkStatusChange('FINAL',     ids), className: 'text-blue-600 dark:text-blue-400' },
      { label: t('تبدیل به تایید شده', 'Set Approved'),            icon: CheckCircle, variant: 'outline',       requiredAccess: 'edit',   onClick: (ids) => handleBulkStatusChange('APPROVED',  ids), className: 'text-emerald-600 dark:text-emerald-400' },
      { label: t('برگشت به موقت',       'Revert to Temporary'),     icon: RotateCcw,   variant: 'outline',       requiredAccess: 'edit',   onClick: (ids) => handleBulkStatusChange('TEMPORARY', ids), className: 'text-orange-500 dark:text-orange-400' },
      { label: t('بروزرسانی نرخ ارز',  'Update Exchange Rates'),   icon: RefreshCw,   variant: 'outline',       requiredAccess: 'edit',   onClick: (ids) => handleBulkUpdateRates(ids),             className: 'text-indigo-600 dark:text-indigo-400' },
      { label: t('حذف گروهی',           'Bulk Delete'),             icon: Trash2,      variant: 'danger-outline', requiredAccess: 'delete', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) },
    ], [handleBulkStatusChange, handleBulkUpdateRates, setDeleteConfirm, isRtl,
        FileText, EditIcon, Trash2, RefreshCw, CheckCircle, CheckSquare, RotateCcw]);

    return { executeDelete, handleBulkStatusChange, handleBulkUpdateRates, handleCustomExport, bulkActions };
  };

  window.useTransactionActions = useTransactionActions;
})();
