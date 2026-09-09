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
  };

  const useTransactionReviewAnalyticsModel = ({
    itemsGridData,
    t,
    isRtl,
    lookups,
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

    const getItemAmountByGroup = useCallback((row) => {
      const dep = toNum(row.deposit_amount);
      const wid = toNum(row.withdrawal_amount);
      return dep > 0 ? dep : wid;
    }, []);

    const groupedCostRows = useMemo(() => {
      const bucket = new Map();
      const totalDocs = new Set();
      let totalItems = 0;
      let totalAmount = 0;

      (itemsGridData || []).forEach((row) => {
        if (String(row.transaction_group || '').toUpperCase() !== 'COST') return;
        const key = String(row.cost_type_id || '__unknown_cost__');
        if (!bucket.has(key)) {
          bucket.set(key, {
            _groupKey: key,
            _groupLabel: key === '__unknown_cost__' ? t('نامشخص', 'Unknown') : getTypeLabel(COST_TYPE_LOOKUP, row.cost_type_id, t('نامشخص', 'Unknown')),
            item_count: 0,
            amount_total: 0,
            _docs: new Set(),
            _items: [],
          });
        }

        const entry = bucket.get(key);
        const amount = getItemAmountByGroup(row);
        entry.item_count += 1;
        entry.amount_total += amount;
        entry._docs.add(String(row._doc_id || ''));
        entry._items.push(row);

        totalItems += 1;
        totalAmount += amount;
        totalDocs.add(String(row._doc_id || ''));
      });

      const sortedGroups = Array.from(bucket.values())
        .map((entry) => ({
          ...entry,
          doc_count: entry._docs.size,
        }))
        .sort((a, b) => toNum(b.amount_total) - toNum(a.amount_total));

      const rows = [];
      sortedGroups.forEach((entry) => {
        const groupRowId = `cost-g-${entry._groupKey}`;
        rows.push({
          _rowId: groupRowId,
          _parentRowId: null,
          _nodeType: 'group',
          _treeLabel: entry._groupLabel,
          _groupLabel: entry._groupLabel,
          _doc_code: entry._groupLabel,
          _tx_type: `${fmt(entry.item_count)} ${t('قلم', 'items')} / ${fmt(entry.doc_count)} ${t('سند', 'docs')}`,
          description: t('جمع گروه هزینه', 'Cost group summary'),
          deposit_amount: entry.amount_total,
          withdrawal_amount: 0,
          remained_amount: entry.amount_total,
          item_count: entry.item_count,
          doc_count: entry.doc_count,
          amount_total: entry.amount_total,
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
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 font-bold',
        _treeLabel: t('جمع کل', 'Grand Total'),
        _groupLabel: t('جمع کل', 'Grand Total'),
        _doc_code: t('جمع کل هزینه‌ها', 'Costs Grand Total'),
        _tx_type: `${fmt(totalItems)} ${t('قلم', 'items')} / ${fmt(totalDocs.size)} ${t('سند', 'docs')}`,
        description: t('جمع کل همه گروه‌های هزینه', 'Total of all cost groups'),
        deposit_amount: totalAmount,
        withdrawal_amount: 0,
        remained_amount: totalAmount,
        item_count: totalItems,
        doc_count: totalDocs.size,
        amount_total: totalAmount,
        _isTotal: true,
      });

      return rows;
    }, [itemsGridData, t, getTypeLabel, COST_TYPE_LOOKUP, getItemAmountByGroup, fmt]);

    const groupedIncomeRows = useMemo(() => {
      const bucket = new Map();
      const totalDocs = new Set();
      let totalItems = 0;
      let totalAmount = 0;

      (itemsGridData || []).forEach((row) => {
        if (String(row.transaction_group || '').toUpperCase() !== 'INCOME') return;
        const key = String(row.income_type_id || '__unknown_income__');
        if (!bucket.has(key)) {
          bucket.set(key, {
            _groupKey: key,
            _groupLabel: key === '__unknown_income__' ? t('نامشخص', 'Unknown') : getTypeLabel(INCOME_TYPE_LOOKUP, row.income_type_id, t('نامشخص', 'Unknown')),
            item_count: 0,
            amount_total: 0,
            _docs: new Set(),
            _items: [],
          });
        }

        const entry = bucket.get(key);
        const amount = getItemAmountByGroup(row);
        entry.item_count += 1;
        entry.amount_total += amount;
        entry._docs.add(String(row._doc_id || ''));
        entry._items.push(row);

        totalItems += 1;
        totalAmount += amount;
        totalDocs.add(String(row._doc_id || ''));
      });

      const sortedGroups = Array.from(bucket.values())
        .map((entry) => ({
          ...entry,
          doc_count: entry._docs.size,
        }))
        .sort((a, b) => toNum(b.amount_total) - toNum(a.amount_total));

      const rows = [];
      sortedGroups.forEach((entry) => {
        const groupRowId = `income-g-${entry._groupKey}`;
        rows.push({
          _rowId: groupRowId,
          _parentRowId: null,
          _nodeType: 'group',
          _treeLabel: entry._groupLabel,
          _groupLabel: entry._groupLabel,
          _doc_code: entry._groupLabel,
          _tx_type: `${fmt(entry.item_count)} ${t('قلم', 'items')} / ${fmt(entry.doc_count)} ${t('سند', 'docs')}`,
          description: t('جمع گروه درآمد', 'Income group summary'),
          deposit_amount: entry.amount_total,
          withdrawal_amount: 0,
          remained_amount: entry.amount_total,
          item_count: entry.item_count,
          doc_count: entry.doc_count,
          amount_total: entry.amount_total,
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
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 font-bold',
        _treeLabel: t('جمع کل', 'Grand Total'),
        _groupLabel: t('جمع کل', 'Grand Total'),
        _doc_code: t('جمع کل درآمدها', 'Incomes Grand Total'),
        _tx_type: `${fmt(totalItems)} ${t('قلم', 'items')} / ${fmt(totalDocs.size)} ${t('سند', 'docs')}`,
        description: t('جمع کل همه گروه‌های درآمد', 'Total of all income groups'),
        deposit_amount: totalAmount,
        withdrawal_amount: 0,
        remained_amount: totalAmount,
        item_count: totalItems,
        doc_count: totalDocs.size,
        amount_total: totalAmount,
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
            _docs: new Set(),
            _items: [],
          });
        }

        const entry = bucket.get(key);
        const amount = getItemAmountByGroup(row);

        if (group === 'COST') {
          entry.cost_total += amount;
          totalCost += amount;
        }
        if (group === 'INCOME') {
          entry.income_total += amount;
          totalIncome += amount;
        }

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
          _treeLabel: entry._groupLabel,
          _groupLabel: entry._groupLabel,
          _doc_code: entry._groupLabel,
          _tx_type: `${fmt(entry.item_count)} ${t('قلم', 'items')} / ${fmt(entry.doc_count)} ${t('سند', 'docs')}`,
          description: t('جمع مرکز هزینه/درآمد', 'Cost/Income center summary'),
          deposit_amount: entry.income_total,
          withdrawal_amount: entry.cost_total,
          remained_amount: entry.net_total,
          item_count: entry.item_count,
          doc_count: entry.doc_count,
          cost_total: entry.cost_total,
          income_total: entry.income_total,
          net_total: entry.net_total,
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
        _rowClassName: 'bg-slate-100/80 dark:bg-slate-700/40 font-bold',
        _treeLabel: t('جمع کل', 'Grand Total'),
        _groupLabel: t('جمع کل', 'Grand Total'),
        _doc_code: t('جمع کل مراکز', 'Centers Grand Total'),
        _tx_type: `${fmt(totalItems)} ${t('قلم', 'items')} / ${fmt(totalDocs.size)} ${t('سند', 'docs')}`,
        description: t('جمع کل همه مراکز', 'Total of all centers'),
        deposit_amount: totalIncome,
        withdrawal_amount: totalCost,
        remained_amount: totalIncome - totalCost,
        item_count: totalItems,
        doc_count: totalDocs.size,
        cost_total: totalCost,
        income_total: totalIncome,
        net_total: totalIncome - totalCost,
        _isTotal: true,
      });

      return rows;
    }, [itemsGridData, getCenterLabel, t, getItemAmountByGroup, fmt]);

    return {
      groupedCostRows,
      groupedIncomeRows,
      groupedCenterRows,
    };
  };

  window.TransactionReviewViewAnalytics = {
    useTransactionReviewAnalyticsModel,
  };
})();
