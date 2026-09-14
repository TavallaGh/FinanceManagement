/* Filename: financial/TransactionReviewViewAnalytics.js */
(() => {
  const React = window.React;
  const { useMemo, useCallback } = React || {};

  const toNum = (value) => {
    const numeric = parseFloat(value || 0);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const fallbackModel = {
    groupedCostRows: [],
    groupedIncomeRows: [],
    groupedCenterRows: [],
    groupedAccountRows: [],
  };

  const useTransactionReviewAnalyticsModel = ({
    itemsGridData,
    t,
    isRtl,
    lookups,
    accountsMap,
    fmt,
  }) => {
    if (!React || typeof useMemo !== 'function' || typeof useCallback !== 'function') {
      return fallbackModel;
    }

    const COST_TYPE_LOOKUP = useMemo(
      () => new Map((lookups?.costTypes || []).map(item => [String(item.id), item])),
      [lookups?.costTypes]
    );
    const INCOME_TYPE_LOOKUP = useMemo(
      () => new Map((lookups?.incomeTypes || []).map(item => [String(item.id), item])),
      [lookups?.incomeTypes]
    );
    const CENTER_LOOKUP = useMemo(
      () => new Map((lookups?.costBenefitCenters || []).map(item => [String(item.id), item])),
      [lookups?.costBenefitCenters]
    );

    const getTypeLabel = useCallback((lookupMap, id, fallback) => {
      const item = lookupMap.get(String(id || ''));
      if (!item) return fallback;
      return isRtl
        ? (item.displayLabel || item.titleFa || item.title_fa || item.titleEn || item.title_en || item.code || fallback)
        : (item.displayLabel || item.titleEn || item.title_en || item.titleFa || item.title_fa || item.code || fallback);
    }, [isRtl]);

    const getCenterLabel = useCallback((id) => {
      const item = CENTER_LOOKUP.get(String(id || ''));
      if (!item) return t('بدون مرکز', 'No Center');
      return isRtl
        ? (item.title_fa || item.titleFa || item.title_en || item.titleEn || t('بدون عنوان', 'Untitled'))
        : (item.title_en || item.titleEn || item.title_fa || item.titleFa || t('Untitled', 'بدون عنوان'));
    }, [CENTER_LOOKUP, isRtl, t]);

    const getAccountLabel = useCallback((accountId, row) => {
      const key = String(accountId || '');
      const account = accountsMap && typeof accountsMap.get === 'function' ? accountsMap.get(key) : null;
      if (account) {
        const title = isRtl
          ? (account.title_fa || account.title_en || account.code || t('بدون عنوان', 'Untitled'))
          : (account.title_en || account.title_fa || account.code || t('Untitled', 'بدون عنوان'));
        return account.code ? `${title} (${account.code})` : title;
      }
      if (row && row.account_id) return String(row.account_id);
      return t('بدون حساب', 'No Account');
    }, [accountsMap, isRtl, t]);

    const getItemAmountByGroup = useCallback((row) => {
      const dep = toNum(row.deposit_amount);
      const wid = toNum(row.withdrawal_amount);
      return dep > 0 ? dep : wid;
    }, []);

    const getRowSortTs = useCallback((row) => {
      const ts = row?._tx?.registered_at || row?._tx?.created_at || row?._doc_date || null;
      const parsed = ts ? new Date(ts).getTime() : NaN;
      return Number.isFinite(parsed) ? parsed : 0;
    }, []);

    const groupedCostRows = useMemo(() => {
      const bucket = new Map();
      const totalDocs = new Set();
      let totalItems = 0;
      let totalDepUsd = 0;
      let totalWidUsd = 0;
      let totalDepIrr = 0;
      let totalWidIrr = 0;

      (itemsGridData || []).forEach((row) => {
        if (String(row.transaction_group || '').toUpperCase() !== 'COST') return;
        const key = String(row.cost_type_id || '__unknown_cost__');
        if (!bucket.has(key)) {
          bucket.set(key, {
            _groupKey: key,
            _groupLabel: key === '__unknown_cost__' ? t('نامشخص', 'Unknown') : getTypeLabel(COST_TYPE_LOOKUP, row.cost_type_id, t('نامشخص', 'Unknown')),
            item_count: 0,
            dep_usd_total: 0,
            wid_usd_total: 0,
            dep_irr_total: 0,
            wid_irr_total: 0,
            net_usd_total: 0,
            net_irr_total: 0,
            _docs: new Set(),
            _items: [],
          });
        }

        const entry = bucket.get(key);
        const amount = getItemAmountByGroup(row);
        const action = String(row.transaction_action || '').toUpperCase();
        const isDeposit = action
          ? action === 'DEPOSIT'
          : toNum(row.deposit_amount) > 0;
        const usdAmount = toNum(isDeposit ? row.dep_usd : row.wid_usd);
        const irrAmount = toNum(isDeposit ? row.dep_irr : row.wid_irr);

        if (isDeposit) {
          entry.dep_usd_total += usdAmount;
          entry.dep_irr_total += irrAmount;
          totalDepUsd += usdAmount;
          totalDepIrr += irrAmount;
        } else {
          entry.wid_usd_total += usdAmount;
          entry.wid_irr_total += irrAmount;
          totalWidUsd += usdAmount;
          totalWidIrr += irrAmount;
        }
        entry.net_usd_total = entry.dep_usd_total - entry.wid_usd_total;
        entry.net_irr_total = entry.dep_irr_total - entry.wid_irr_total;

        entry.item_count += 1;
        entry._docs.add(String(row._doc_id || ''));
        entry._items.push(row);

        totalItems += 1;
        totalDocs.add(String(row._doc_id || ''));
      });

      const sortedGroups = Array.from(bucket.values())
        .map((entry) => ({
          ...entry,
          doc_count: entry._docs.size,
        }))
        .sort((a, b) => Math.abs(toNum(b.net_usd_total)) - Math.abs(toNum(a.net_usd_total)));

      const rows = [];
      sortedGroups.forEach((entry) => {
        const groupRowId = `cost-g-${entry._groupKey}`;
        rows.push({
          _rowId: groupRowId,
          _parentRowId: null,
          _nodeType: 'group',
          _summaryMode: 'converted_only',
          _treeLabel: entry._groupLabel,
          _groupLabel: entry._groupLabel,
          _doc_code: '-',
          _tx_type: `${fmt(entry.item_count)} ${t('قلم', 'items')} / ${fmt(entry.doc_count)} ${t('سند', 'docs')}`,
          description: t('جمع گروه هزینه', 'Cost group summary'),
          deposit_amount: entry.dep_usd_total,
          withdrawal_amount: entry.wid_usd_total,
          remained_amount: null,
          item_count: entry.item_count,
          doc_count: entry.doc_count,
          dep_usd_total: entry.dep_usd_total,
          wid_usd_total: entry.wid_usd_total,
          dep_irr_total: entry.dep_irr_total,
          wid_irr_total: entry.wid_irr_total,
          net_usd_total: entry.net_usd_total,
          net_irr_total: entry.net_irr_total,
        });

        (entry._items || []).forEach((item, idx) => {
          const itemId = item.id || `${item._doc_id || 'doc'}-${item.row_number || idx}`;
          rows.push({
            ...item,
            _rowId: `cost-i-${entry._groupKey}-${itemId}-${idx}`,
            _parentRowId: groupRowId,
            _nodeType: 'item',
            _treeLabel: '',
            _groupLabel: '',
            item_count: '',
            doc_count: '',
            amount_total: getItemAmountByGroup(item),
          });
        });
      });

      rows.push({
        _rowId: 'cost-total',
        _parentRowId: null,
        _nodeType: 'total',
        _summaryMode: 'converted_only',
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 font-bold',
        _treeLabel: t('جمع کل', 'Grand Total'),
        _groupLabel: t('جمع کل', 'Grand Total'),
        _doc_code: t('جمع کل هزینه‌ها', 'Costs Grand Total'),
        _tx_type: `${fmt(totalItems)} ${t('قلم', 'items')} / ${fmt(totalDocs.size)} ${t('سند', 'docs')}`,
        description: t('جمع کل همه گروه‌های هزینه', 'Total of all cost groups'),
        deposit_amount: totalDepUsd,
        withdrawal_amount: totalWidUsd,
        remained_amount: null,
        item_count: totalItems,
        doc_count: totalDocs.size,
        dep_usd_total: totalDepUsd,
        wid_usd_total: totalWidUsd,
        dep_irr_total: totalDepIrr,
        wid_irr_total: totalWidIrr,
        net_usd_total: totalDepUsd - totalWidUsd,
        net_irr_total: totalDepIrr - totalWidIrr,
        _isTotal: true,
      });

      return rows;
    }, [itemsGridData, t, getTypeLabel, COST_TYPE_LOOKUP, getItemAmountByGroup, fmt]);

    const groupedIncomeRows = useMemo(() => {
      const bucket = new Map();
      const totalDocs = new Set();
      let totalItems = 0;
      let totalDepUsd = 0;
      let totalWidUsd = 0;
      let totalDepIrr = 0;
      let totalWidIrr = 0;

      (itemsGridData || []).forEach((row) => {
        if (String(row.transaction_group || '').toUpperCase() !== 'INCOME') return;
        const key = String(row.income_type_id || '__unknown_income__');
        if (!bucket.has(key)) {
          bucket.set(key, {
            _groupKey: key,
            _groupLabel: key === '__unknown_income__' ? t('نامشخص', 'Unknown') : getTypeLabel(INCOME_TYPE_LOOKUP, row.income_type_id, t('نامشخص', 'Unknown')),
            item_count: 0,
            dep_usd_total: 0,
            wid_usd_total: 0,
            dep_irr_total: 0,
            wid_irr_total: 0,
            net_usd_total: 0,
            net_irr_total: 0,
            _docs: new Set(),
            _items: [],
          });
        }

        const entry = bucket.get(key);
        const amount = getItemAmountByGroup(row);
        const action = String(row.transaction_action || '').toUpperCase();
        const isDeposit = action
          ? action === 'DEPOSIT'
          : toNum(row.deposit_amount) > 0;
        const usdAmount = toNum(isDeposit ? row.dep_usd : row.wid_usd);
        const irrAmount = toNum(isDeposit ? row.dep_irr : row.wid_irr);

        if (isDeposit) {
          entry.dep_usd_total += usdAmount;
          entry.dep_irr_total += irrAmount;
          totalDepUsd += usdAmount;
          totalDepIrr += irrAmount;
        } else {
          entry.wid_usd_total += usdAmount;
          entry.wid_irr_total += irrAmount;
          totalWidUsd += usdAmount;
          totalWidIrr += irrAmount;
        }
        entry.net_usd_total = entry.dep_usd_total - entry.wid_usd_total;
        entry.net_irr_total = entry.dep_irr_total - entry.wid_irr_total;

        entry.item_count += 1;
        entry._docs.add(String(row._doc_id || ''));
        entry._items.push(row);

        totalItems += 1;
        totalDocs.add(String(row._doc_id || ''));
      });

      const sortedGroups = Array.from(bucket.values())
        .map((entry) => ({
          ...entry,
          doc_count: entry._docs.size,
        }))
        .sort((a, b) => Math.abs(toNum(b.net_usd_total)) - Math.abs(toNum(a.net_usd_total)));

      const rows = [];
      sortedGroups.forEach((entry) => {
        const groupRowId = `income-g-${entry._groupKey}`;
        rows.push({
          _rowId: groupRowId,
          _parentRowId: null,
          _nodeType: 'group',
          _summaryMode: 'converted_only',
          _treeLabel: entry._groupLabel,
          _groupLabel: entry._groupLabel,
          _doc_code: '-',
          _tx_type: `${fmt(entry.item_count)} ${t('قلم', 'items')} / ${fmt(entry.doc_count)} ${t('سند', 'docs')}`,
          description: t('جمع گروه درآمد', 'Income group summary'),
          deposit_amount: entry.dep_usd_total,
          withdrawal_amount: entry.wid_usd_total,
          remained_amount: null,
          item_count: entry.item_count,
          doc_count: entry.doc_count,
          dep_usd_total: entry.dep_usd_total,
          wid_usd_total: entry.wid_usd_total,
          dep_irr_total: entry.dep_irr_total,
          wid_irr_total: entry.wid_irr_total,
          net_usd_total: entry.net_usd_total,
          net_irr_total: entry.net_irr_total,
        });

        (entry._items || []).forEach((item, idx) => {
          const itemId = item.id || `${item._doc_id || 'doc'}-${item.row_number || idx}`;
          rows.push({
            ...item,
            _rowId: `income-i-${entry._groupKey}-${itemId}-${idx}`,
            _parentRowId: groupRowId,
            _nodeType: 'item',
            _treeLabel: '',
            _groupLabel: '',
            item_count: '',
            doc_count: '',
            amount_total: getItemAmountByGroup(item),
          });
        });
      });

      rows.push({
        _rowId: 'income-total',
        _parentRowId: null,
        _nodeType: 'total',
        _summaryMode: 'converted_only',
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 font-bold',
        _treeLabel: t('جمع کل', 'Grand Total'),
        _groupLabel: t('جمع کل', 'Grand Total'),
        _doc_code: t('جمع کل درآمدها', 'Incomes Grand Total'),
        _tx_type: `${fmt(totalItems)} ${t('قلم', 'items')} / ${fmt(totalDocs.size)} ${t('سند', 'docs')}`,
        description: t('جمع کل همه گروه‌های درآمد', 'Total of all income groups'),
        deposit_amount: totalDepUsd,
        withdrawal_amount: totalWidUsd,
        remained_amount: null,
        item_count: totalItems,
        doc_count: totalDocs.size,
        dep_usd_total: totalDepUsd,
        wid_usd_total: totalWidUsd,
        dep_irr_total: totalDepIrr,
        wid_irr_total: totalWidIrr,
        net_usd_total: totalDepUsd - totalWidUsd,
        net_irr_total: totalDepIrr - totalWidIrr,
        _isTotal: true,
      });

      return rows;
    }, [itemsGridData, t, getTypeLabel, INCOME_TYPE_LOOKUP, getItemAmountByGroup, fmt]);

    const groupedCenterRows = useMemo(() => {
      const bucket = new Map();
      const totalDocs = new Set();
      let totalItems = 0;
      let totalCost = 0;
      let totalIncome = 0;
      let totalDepUsd = 0;
      let totalWidUsd = 0;
      let totalDepIrr = 0;
      let totalWidIrr = 0;

      (itemsGridData || []).forEach((row) => {
        const group = String(row.transaction_group || '').toUpperCase();
        if (group !== 'COST' && group !== 'INCOME') return;
        const key = String(row.center_id || '__no_center__');
        if (!bucket.has(key)) {
          bucket.set(key, {
            _groupKey: key,
            _groupLabel: getCenterLabel(row.center_id),
            item_count: 0,
            cost_total: 0,
            income_total: 0,
            net_total: 0,
            dep_usd_total: 0,
            wid_usd_total: 0,
            dep_irr_total: 0,
            wid_irr_total: 0,
            net_usd_total: 0,
            net_irr_total: 0,
            _docs: new Set(),
            _items: [],
          });
        }

        const entry = bucket.get(key);
        const amount = getItemAmountByGroup(row);
        const action = String(row.transaction_action || '').toUpperCase();
        const isDeposit = action
          ? action === 'DEPOSIT'
          : toNum(row.deposit_amount) > 0;
        const usdAmount = toNum(isDeposit ? row.dep_usd : row.wid_usd);
        const irrAmount = toNum(isDeposit ? row.dep_irr : row.wid_irr);

        if (group === 'COST') {
          entry.cost_total += amount;
          totalCost += amount;
        }
        if (group === 'INCOME') {
          entry.income_total += amount;
          totalIncome += amount;
        }

        if (isDeposit) {
          entry.dep_usd_total += usdAmount;
          entry.dep_irr_total += irrAmount;
          totalDepUsd += usdAmount;
          totalDepIrr += irrAmount;
        } else {
          entry.wid_usd_total += usdAmount;
          entry.wid_irr_total += irrAmount;
          totalWidUsd += usdAmount;
          totalWidIrr += irrAmount;
        }

        entry.net_usd_total = entry.dep_usd_total - entry.wid_usd_total;
        entry.net_irr_total = entry.dep_irr_total - entry.wid_irr_total;

        entry.net_total = entry.income_total - entry.cost_total;
        entry.item_count += 1;
        entry._docs.add(String(row._doc_id || ''));
        entry._items.push(row);

        totalItems += 1;
        totalDocs.add(String(row._doc_id || ''));
      });

      const sortedGroups = Array.from(bucket.values())
        .map((entry) => ({
          ...entry,
          doc_count: entry._docs.size,
        }))
        .sort((a, b) => Math.abs(toNum(b.net_total)) - Math.abs(toNum(a.net_total)));

      const rows = [];
      sortedGroups.forEach((entry) => {
        const groupRowId = `center-g-${entry._groupKey}`;
        rows.push({
          _rowId: groupRowId,
          _parentRowId: null,
          _nodeType: 'group',
          _summaryMode: 'converted_only',
          _treeLabel: entry._groupLabel,
          _groupLabel: entry._groupLabel,
          _doc_code: '-',
          _tx_type: `${fmt(entry.item_count)} ${t('قلم', 'items')} / ${fmt(entry.doc_count)} ${t('سند', 'docs')}`,
          description: t('جمع مرکز هزینه/درآمد', 'Cost/Income center summary'),
          deposit_amount: entry.dep_usd_total,
          withdrawal_amount: entry.wid_usd_total,
          remained_amount: null,
          item_count: entry.item_count,
          doc_count: entry.doc_count,
          cost_total: entry.cost_total,
          income_total: entry.income_total,
          net_total: entry.net_total,
          dep_usd_total: entry.dep_usd_total,
          wid_usd_total: entry.wid_usd_total,
          dep_irr_total: entry.dep_irr_total,
          wid_irr_total: entry.wid_irr_total,
          net_usd_total: entry.net_usd_total,
          net_irr_total: entry.net_irr_total,
        });

        (entry._items || []).forEach((item, idx) => {
          const amount = getItemAmountByGroup(item);
          const group = String(item.transaction_group || '').toUpperCase();
          const itemId = item.id || `${item._doc_id || 'doc'}-${item.row_number || idx}`;
          rows.push({
            ...item,
            _rowId: `center-i-${entry._groupKey}-${itemId}-${idx}`,
            _parentRowId: groupRowId,
            _nodeType: 'item',
            _treeLabel: '',
            _groupLabel: '',
            item_count: '',
            doc_count: '',
            cost_total: group === 'COST' ? amount : 0,
            income_total: group === 'INCOME' ? amount : 0,
            net_total: group === 'INCOME' ? amount : -amount,
          });
        });
      });

      rows.push({
        _rowId: 'center-total',
        _parentRowId: null,
        _nodeType: 'total',
        _summaryMode: 'converted_only',
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 font-bold',
        _treeLabel: t('جمع کل', 'Grand Total'),
        _groupLabel: t('جمع کل', 'Grand Total'),
        _doc_code: t('جمع کل مراکز', 'Centers Grand Total'),
        _tx_type: `${fmt(totalItems)} ${t('قلم', 'items')} / ${fmt(totalDocs.size)} ${t('سند', 'docs')}`,
        description: t('جمع کل همه مراکز', 'Total of all centers'),
        deposit_amount: totalDepUsd,
        withdrawal_amount: totalWidUsd,
        remained_amount: null,
        item_count: totalItems,
        doc_count: totalDocs.size,
        cost_total: totalCost,
        income_total: totalIncome,
        net_total: totalIncome - totalCost,
        dep_usd_total: totalDepUsd,
        wid_usd_total: totalWidUsd,
        dep_irr_total: totalDepIrr,
        wid_irr_total: totalWidIrr,
        net_usd_total: totalDepUsd - totalWidUsd,
        net_irr_total: totalDepIrr - totalWidIrr,
        _isTotal: true,
      });

      return rows;
    }, [itemsGridData, getCenterLabel, t, getItemAmountByGroup, fmt]);

    const groupedAccountRows = useMemo(() => {
      const bucket = new Map();
      const totalDocs = new Set();
      let totalItems = 0;
      let totalDeposit = 0;
      let totalWithdrawal = 0;
      let totalDepUsd = 0;
      let totalWidUsd = 0;
      let totalDepIrr = 0;
      let totalWidIrr = 0;

      (itemsGridData || []).forEach((row) => {
        const key = String(row.account_id || '__no_account__');
        if (!bucket.has(key)) {
          const account = accountsMap && typeof accountsMap.get === 'function' ? accountsMap.get(key) : null;
          bucket.set(key, {
            _groupKey: key,
            _groupLabel: getAccountLabel(row.account_id, row),
            currency: account?.currency_code || row.currency || '-',
            item_count: 0,
            deposit_total: 0,
            withdrawal_total: 0,
            net_total: 0,
            last_balance: null,
            last_balance_ts: 0,
            dep_usd_total: 0,
            wid_usd_total: 0,
            dep_irr_total: 0,
            wid_irr_total: 0,
            net_usd_total: 0,
            net_irr_total: 0,
            _docs: new Set(),
            _items: [],
          });
        }

        const entry = bucket.get(key);
        const amount = getItemAmountByGroup(row);
        const action = String(row.transaction_action || '').toUpperCase();
        const isDeposit = action
          ? action === 'DEPOSIT'
          : toNum(row.deposit_amount) > 0;

        if (isDeposit) {
          entry.deposit_total += amount;
          totalDeposit += amount;
          const depUsd = toNum(row.dep_usd);
          const depIrr = toNum(row.dep_irr);
          entry.dep_usd_total += depUsd;
          entry.dep_irr_total += depIrr;
          totalDepUsd += depUsd;
          totalDepIrr += depIrr;
        } else {
          entry.withdrawal_total += amount;
          totalWithdrawal += amount;
          const widUsd = toNum(row.wid_usd);
          const widIrr = toNum(row.wid_irr);
          entry.wid_usd_total += widUsd;
          entry.wid_irr_total += widIrr;
          totalWidUsd += widUsd;
          totalWidIrr += widIrr;
        }

        entry.net_total = entry.deposit_total - entry.withdrawal_total;
        entry.net_usd_total = entry.dep_usd_total - entry.wid_usd_total;
        entry.net_irr_total = entry.dep_irr_total - entry.wid_irr_total;

        const rowTs = getRowSortTs(row);
        if (rowTs >= entry.last_balance_ts) {
          entry.last_balance_ts = rowTs;
          const candidateBalance = row.remained_amount != null ? toNum(row.remained_amount) : (row._balance_after != null ? toNum(row._balance_after) : null);
          entry.last_balance = candidateBalance;
        }

        entry.item_count += 1;
        entry._docs.add(String(row._doc_id || ''));
        entry._items.push(row);

        totalItems += 1;
        totalDocs.add(String(row._doc_id || ''));
      });

      const sortedGroups = Array.from(bucket.values())
        .map((entry) => ({
          ...entry,
          doc_count: entry._docs.size,
        }))
        .sort((a, b) => Math.abs(toNum(b.net_total)) - Math.abs(toNum(a.net_total)));

      const rows = [];
      sortedGroups.forEach((entry) => {
        const groupRowId = `account-g-${entry._groupKey}`;
        rows.push({
          _rowId: groupRowId,
          _parentRowId: null,
          _nodeType: 'group',
          _summaryMode: 'account_with_converted',
          _treeLabel: entry._groupLabel,
          _groupLabel: entry._groupLabel,
          _doc_code: '-',
          _tx_type: `${fmt(entry.item_count)} ${t('قلم', 'items')} / ${fmt(entry.doc_count)} ${t('سند', 'docs')}`,
          description: t('جمع حساب', 'Account summary'),
          currency: entry.currency,
          deposit_amount: entry.deposit_total,
          withdrawal_amount: entry.withdrawal_total,
          remained_amount: entry.last_balance,
          item_count: entry.item_count,
          doc_count: entry.doc_count,
          deposit_total: entry.deposit_total,
          withdrawal_total: entry.withdrawal_total,
          net_total: entry.net_total,
          dep_usd_total: entry.dep_usd_total,
          wid_usd_total: entry.wid_usd_total,
          dep_irr_total: entry.dep_irr_total,
          wid_irr_total: entry.wid_irr_total,
          net_usd_total: entry.net_usd_total,
          net_irr_total: entry.net_irr_total,
        });

        (entry._items || []).forEach((item, idx) => {
          const amount = getItemAmountByGroup(item);
          const action = String(item.transaction_action || '').toUpperCase();
          const isDeposit = action
            ? action === 'DEPOSIT'
            : toNum(item.deposit_amount) > 0;
          const itemId = item.id || `${item._doc_id || 'doc'}-${item.row_number || idx}`;
          rows.push({
            ...item,
            _rowId: `account-i-${entry._groupKey}-${itemId}-${idx}`,
            _parentRowId: groupRowId,
            _nodeType: 'item',
            _treeLabel: '',
            _groupLabel: '',
            item_count: '',
            doc_count: '',
            deposit_total: isDeposit ? amount : 0,
            withdrawal_total: isDeposit ? 0 : amount,
            net_total: isDeposit ? amount : -amount,
          });
        });
      });

      rows.push({
        _rowId: 'account-total',
        _parentRowId: null,
        _nodeType: 'total',
        _summaryMode: 'account_with_converted',
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 font-bold',
        _treeLabel: t('جمع کل', 'Grand Total'),
        _groupLabel: t('جمع کل', 'Grand Total'),
        _doc_code: t('جمع کل حساب‌ها', 'Accounts Grand Total'),
        _tx_type: `${fmt(totalItems)} ${t('قلم', 'items')} / ${fmt(totalDocs.size)} ${t('سند', 'docs')}`,
        description: t('جمع کل همه حساب‌ها', 'Total of all accounts'),
        deposit_amount: totalDeposit,
        withdrawal_amount: totalWithdrawal,
        remained_amount: null,
        item_count: totalItems,
        doc_count: totalDocs.size,
        deposit_total: totalDeposit,
        withdrawal_total: totalWithdrawal,
        net_total: totalDeposit - totalWithdrawal,
        dep_usd_total: totalDepUsd,
        wid_usd_total: totalWidUsd,
        dep_irr_total: totalDepIrr,
        wid_irr_total: totalWidIrr,
        net_usd_total: totalDepUsd - totalWidUsd,
        net_irr_total: totalDepIrr - totalWidIrr,
        _isTotal: true,
      });

      return rows;
    }, [itemsGridData, getAccountLabel, t, getItemAmountByGroup, fmt, accountsMap, getRowSortTs]);

    return {
      groupedCostRows,
      groupedIncomeRows,
      groupedCenterRows,
      groupedAccountRows,
    };
  };

  window.TransactionReviewViewAnalytics = {
    useTransactionReviewAnalyticsModel,
  };
})();
