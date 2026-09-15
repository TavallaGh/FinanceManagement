/* Filename: financial/BalanceMonthlyReportLogic.js */
(() => {
  const Core = window.DSCore || window.DesignSystem || {};

  const JAL_FA = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const GRE_FA = ['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
  const GRE_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const pad2 = (n) => String(n).padStart(2, '0');
  const normalizeSlashDate = (v) => String(v || '').replace(/-/g, '/');
  const normalizeDashDate = (v) => String(v || '').replace(/\//g, '-');

  const isJalaliLeap = (y) => {
    const a = ((y - 474) % 2820 + 474);
    return ((a + 38) * 682) % 2816 < 682;
  };

  const monthLastDay = (year, month, cal) => {
    if (cal === 'jalali') {
      if (month <= 6) return 31;
      if (month <= 11) return 30;
      return isJalaliLeap(year) ? 30 : 29;
    }
    return new Date(year, month, 0).getDate();
  };

  const monthLabel = (year, month, cal, isRtl) => {
    const i = month - 1;
    const name = cal === 'jalali'
      ? (JAL_FA[i] || String(month))
      : (isRtl ? (GRE_FA[i] || String(month)) : (GRE_EN[i] || String(month)));
    return `${name} ${year}`;
  };

  const currentCalYear = (cal) => {
    const d = new Date();
    if (cal === 'jalali') return d.getMonth() >= 2 ? d.getFullYear() - 621 : d.getFullYear() - 622;
    return d.getFullYear();
  };

  const slotTargetDate = (year, month, day, cal) => {
    const actualDay = day === 'LAST'
      ? monthLastDay(year, month, cal)
      : Math.min(Number(day), monthLastDay(year, month, cal));

    if (cal === 'jalali' && typeof Core.j2g === 'function') {
      const parts = Core.j2g(year, month, actualDay);
      if (Array.isArray(parts) && parts.length === 3) {
        const [gy, gm, gd] = parts;
        return {
          slash: `${gy}/${pad2(gm)}/${pad2(gd)}`,
          dash: `${gy}-${pad2(gm)}-${pad2(gd)}`,
        };
      }
    }

    const slash = `${year}/${pad2(month)}/${pad2(actualDay)}`;
    return {
      slash,
      dash: normalizeDashDate(slash),
    };
  };

  const prevMonthSlot = (year, month) => {
    if (month <= 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
  };

  const fmt = (num) => {
    if (num === null || num === undefined) return '—';
    const v = parseFloat(num);
    if (Number.isNaN(v)) return '—';
    if (v === 0) return '0';
    const abs = Math.abs(v).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return v < 0 ? `(${abs})` : abs;
  };

  const fmtDecimal = (num, maxFractionDigits = 6) => {
    if (num === null || num === undefined) return '—';
    const value = Number(num);
    if (Number.isNaN(value)) return '—';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits
    });
  };

  const buildRateLookup = (rows) => {
    const map = new Map();
    (rows || []).forEach((r) => {
      const base = String(r.base_currency || '').toUpperCase();
      const tgt = String(r.target_currency || '').toUpperCase();
      if (!base || !tgt) return;
      const k = `${base}|${tgt}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ rate: parseFloat(r.rate || 0), date: normalizeDashDate(r.rate_date), ts: String(r.created_at || '') });
    });
    map.forEach((list) => list.sort((a, b) => {
      const dc = b.date.localeCompare(a.date);
      return dc !== 0 ? dc : b.ts.localeCompare(a.ts);
    }));
    return map;
  };

  const latestRate = (lookup, from, to, upTo) => {
    const upToDash = normalizeDashDate(upTo);
    const list = lookup.get(`${from}|${to}`) || [];
    for (const e of list) {
      if (e.date <= upToDash && e.rate > 0) return e.rate;
    }
    return null;
  };

  const resolveRate = (lookup, fromCode, toCode, dateSlash, cache) => {
    const from = String(fromCode || '').toUpperCase();
    const to = String(toCode || '').toUpperCase();
    if (!from || !to || from === to) return 1;
    const ck = `${dateSlash}|${from}|${to}`;
    if (cache.has(ck)) return cache.get(ck);

    let rate = latestRate(lookup, from, to, dateSlash);
    if (rate === null) {
      const inv = latestRate(lookup, to, from, dateSlash);
      if (inv !== null) rate = 1 / inv;
    }
    if (rate === null) {
      const a = latestRate(lookup, from, 'USD', dateSlash);
      const b = latestRate(lookup, 'USD', to, dateSlash);
      if (a !== null && b !== null) rate = a * b;
    }

    const result = rate !== null ? (rate || 0) : 0;
    cache.set(ck, result);
    return result;
  };

  const buildTree = (accounts) => {
    const map = new Map((accounts || []).map((a) => [String(a.id), { ...a, children: [] }]));
    const roots = [];
    map.forEach((node) => {
      if (node.parent_id && map.has(String(node.parent_id))) {
        map.get(String(node.parent_id)).children.push(node);
      } else {
        roots.push(node);
      }
    });
    const sort = (n) => {
      n.children.sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
      n.children.forEach(sort);
    };
    roots.sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
    roots.forEach(sort);
    return roots;
  };

  const buildGroupedRows = ({ selectedIds, tree, accById, matrix, slots, isRtl }) => {
    const rows = [];

    const pushRow = (row, parentRowId = null) => {
      rows.push({ ...row, _rowId: row._id, _parentRowId: parentRowId });
      return row._id;
    };

    const validLeafs = (node) => {
      if (!node.children || node.children.length === 0) {
        return accById.has(String(node.id)) ? [String(node.id)] : [];
      }
      return node.children.flatMap(validLeafs);
    };

    const nodeTitle = (node) => {
      const name = isRtl
        ? (node.title_fa || node.title_en || '')
        : (node.title_en || node.title_fa || '');
      return node.code ? `${node.code} - ${name}` : name;
    };

    const accTitle = (acc) => {
      const name = isRtl
        ? (acc.title_fa || acc.title_en || '')
        : (acc.title_en || acc.title_fa || '');
      return acc.code ? `${acc.code} - ${name}` : name;
    };

    const makeTotValues = (leafIds) => {
      const obj = {};
      slots.forEach((s) => {
        let usd = 0;
        let irr = 0;
        leafIds.forEach((id) => {
          const c = matrix[id]?.[s.key];
          if (c) {
            usd += c.usd || 0;
            irr += c.irr || 0;
          }
        });
        obj[s.key] = { usd, irr };
      });
      return obj;
    };

    const makeCurrencyTotValues = (leafIds) => {
      const obj = {};
      slots.forEach((s) => {
        let nat = 0;
        let usd = 0;
        let irr = 0;
        leafIds.forEach((id) => {
          const c = matrix[id]?.[s.key];
          if (!c) return;
          nat += c.nat || 0;
          usd += c.usd || 0;
          irr += c.irr || 0;
        });
        obj[s.key] = { nat, usd, irr };
      });
      return obj;
    };

    const makeCurrencyBuckets = (leafNodes) => {
      const buckets = new Map();
      leafNodes.forEach((leafNode) => {
        const id = String(leafNode.id);
        const acc = accById.get(id);
        if (!acc) return;
        const code = String(acc.currency_code || '').toUpperCase() || (isRtl ? 'نامشخص' : 'N/A');
        if (!buckets.has(code)) buckets.set(code, []);
        buckets.get(code).push(leafNode);
      });
      return Array.from(buckets.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([currencyCode, leafNodesInCurrency]) => ({
          currencyCode,
          leafNodes: leafNodesInCurrency.sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
        }));
    };

    const pushCurrencyGroups = (leafNodes, depth, parentRowId) => {
      const buckets = makeCurrencyBuckets(leafNodes);
      buckets.forEach((bucket) => {
        const leafIds = bucket.leafNodes.map((n) => String(n.id));
        const currencyRowId = pushRow({
          _id: `c-${depth}-${bucket.currencyCode}-${leafIds.join('-')}`,
          _type: 'currency_header',
          _depth: depth,
          _title: isRtl ? `ارز: ${bucket.currencyCode}` : `Currency: ${bucket.currencyCode}`,
          _currency: bucket.currencyCode,
          _leafIds: leafIds,
          ...makeCurrencyTotValues(leafIds)
        }, parentRowId);

        bucket.leafNodes.forEach((leafNode) => {
          const acc = accById.get(String(leafNode.id));
          if (!acc) return;
          const r = {
            _id: `l-${leafNode.id}`,
            _type: 'leaf',
            _depth: depth + 1,
            _title: accTitle(acc),
            _currency: acc.currency_code || '',
            _accountId: String(acc.id),
            _leafIds: [String(acc.id)]
          };
          slots.forEach((s) => { r[s.key] = matrix[String(acc.id)]?.[s.key] || null; });
          pushRow(r, currencyRowId);
        });
      });
    };

    const hasSel = (node) => selectedIds.has(String(node.id)) || (node.children || []).some(hasSel);

    const addSubtree = (node, depth, forceInclude = false, parentRowId = null) => {
      const isLeaf = !node.children || node.children.length === 0;
      if (isLeaf) {
        if (!forceInclude && !selectedIds.has(String(node.id))) return;
        const acc = accById.get(String(node.id));
        if (!acc) return;
        const r = { _id: `l-${node.id}`, _type: 'leaf', _depth: depth, _title: accTitle(acc), _currency: acc.currency_code || '' };
        r._accountId = String(acc.id);
        r._leafIds = [String(acc.id)];
        slots.forEach((s) => { r[s.key] = matrix[String(acc.id)]?.[s.key] || null; });
        pushRow(r, parentRowId);
        return;
      }

      const nodeSelected = forceInclude || selectedIds.has(String(node.id));
      const visibleKids = nodeSelected ? (node.children || []) : (node.children || []).filter(hasSel);
      const vl = validLeafs(node);
      if (vl.length === 0 || (!nodeSelected && visibleKids.length === 0)) return;

      const hdr = {
        _id: `h-${node.id}`,
        _type: 'group_header',
        _depth: depth,
        _title: nodeTitle(node),
        _currency: '',
        _leafIds: vl,
        ...makeTotValues(vl)
      };
      const hdrRowId = pushRow(hdr, parentRowId);

      const leafKids = visibleKids.filter((c) => (!c.children || c.children.length === 0) && accById.has(String(c.id)));
      const branchKids = visibleKids.filter((c) => c.children && c.children.length > 0);

      if (leafKids.length > 0) pushCurrencyGroups(leafKids, depth + 1, hdrRowId);
      branchKids.forEach((c) => addSubtree(c, depth + 1, nodeSelected, hdrRowId));
    };

    const process = (node, depth) => {
      if (selectedIds.has(String(node.id))) {
        addSubtree(node, depth, true, null);
      } else {
        const selKids = (node.children || []).filter(hasSel);
        if (selKids.length === 0) return;
        addSubtree(node, depth, false, null);
      }
    };

    tree.forEach((root) => process(root, 0));
    return rows;
  };

  // Presentation layers share the original account matrix and report scope.
  const buildMonthlyAccountPaths = (tree) => {
    const paths = new Map();
    const visit = (node, parents) => {
      const path = [...parents, node];
      paths.set(String(node.id), path);
      (node.children || []).forEach(child => visit(child, path));
    };
    (tree || []).forEach(node => visit(node, []));
    return paths;
  };

  const buildMonthlyTabRows = (reportData, level, previousRows, selectedRows = [], isRtl = true) => {
    if (!reportData) return [];
    const { matrix = {}, accountPaths = new Map(), reportAccountLookup = new Map(), slots } = reportData;
    const selected = new Set(selectedRows.map(String));
    const scope = previousRows
      ? new Set(previousRows.filter(row => !selected.size || selected.has(row.id)).flatMap(row => row._leafIds))
      : new Set(reportAccountLookup.keys());
    const name = node => isRtl
      ? (node.title_fa || node.title_en || '')
      : (node.title_en || node.title_fa || '');
    const title = node => [node.code, name(node)].filter(Boolean).join(' - ');
    const buckets = new Map();
    scope.forEach(accountId => {
      const account = reportAccountLookup.get(accountId);
      if (!account) return;
      const path = accountPaths.get(accountId) || [account];
      const node = level < 3 ? path[level] : account;
      if (!node) return;
      const currency = String(account.currency_code || '').toUpperCase();
      const parents = level < 3 ? path.slice(0, level) : path.slice(0, -1);
      const pathIds = parents.map(parent => String(parent.id));
      // Stable account IDs keep identically named paths separate in both languages.
      const pathKey = JSON.stringify(pathIds);
      const id = level === 3
        ? 'currency-' + JSON.stringify([pathIds, String(account.currency_id || currency)])
        : 'account-' + node.id;
      if (!buckets.has(id)) {
        buckets.set(id, {
          id, _id: id,
          _type: level === 4 ? 'leaf' : level === 3 ? 'currency_header' : 'group_header',
          _title: level === 3 ? (currency || (isRtl ? 'نامشخص' : 'N/A')) : title(node),
          _currency: level >= 3 ? currency : '',
          _accountId: level === 4 ? accountId : undefined,
          _leafIds: [],
          _pathKey: pathKey,
          _path: parents.map(name).join(' / '),
        });
      }
      const row = buckets.get(id);
      row._leafIds.push(accountId);
    });
    return Array.from(buckets.values()).map(row => {
      slots.forEach(slot => {
        if (level === 4) {
          row[slot.key] = matrix[row._accountId]?.[slot.key] || null;
          return;
        }
        const value = { usd: 0, irr: 0 };
        if (level === 3) value.nat = 0;
        row._leafIds.forEach(id => {
          const cell = matrix[id]?.[slot.key];
          Object.keys(value).forEach(key => { value[key] += cell?.[key] || 0; });
        });
        row[slot.key] = value;
      });
      return row;
    }).sort((a, b) => {
      if (level === 3) {
        const pathOrder = a._path.localeCompare(b._path) || a._pathKey.localeCompare(b._pathKey);
        if (pathOrder) return pathOrder;
      }
      return a._title.localeCompare(b._title);
    });
  };

  const buildMonthlyWorkbook = (reportData, XLSX, isRtl) => {
    if (!reportData || !XLSX) throw new Error('Monthly report or Excel library is unavailable.');
    const t = (fa, en) => isRtl ? fa : en;
    const labels = [
      t('گروه حساب', 'Account Groups'), t('حساب کل', 'General Ledger'),
      t('حساب معین', 'Subsidiary Accounts'), t('ارز', 'Currencies'), t('حساب‌ها', 'Accounts'),
    ];
    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: isRtl }] };
    let previousRows = null;
    labels.forEach((label, level) => {
      // Export uses the current advanced-filter scope, not selections in displayed tabs.
      const rows = buildMonthlyTabRows(reportData, level, previousRows, [], isRtl);
      previousRows = rows;
      const headers = [
        t('مسیر حساب', 'Account Path'),
        level === 3 ? t('ارز حساب', 'Account Currency') : t('حساب / گروه', 'Account / Group'),
        t('ارز مبلغ', 'Amount Currency'),
        ...reportData.slots.map(slot => slot.label),
      ];
      const data = [headers];
      rows.forEach(row => {
        let amounts = [{ currency: 'USD', field: 'usd' }, { currency: 'IRR', field: 'irr' }];
        if (level === 3 && row._currency !== 'USD' && row._currency !== 'IRR') {
          amounts = [{ currency: row._currency || t('نامشخص', 'Unknown'), field: 'nat' }, ...amounts];
        }
        if (level === 4) amounts = [{ currency: row._currency || t('نامشخص', 'Unknown'), field: 'nat' }];
        amounts.forEach(({ currency, field }) => {
          data.push([row._path, row._title, currency, ...reportData.slots.map(slot => {
            const value = row[slot.key]?.[field];
            if (value === null || value === undefined) return null;
            if (typeof value !== 'number' || !Number.isFinite(value)) {
              throw new Error('Invalid balance in Excel export.');
            }
            return value;
          })]);
        });
      });
      const sheet = XLSX.utils.aoa_to_sheet(data);
      sheet['!cols'] = [{ wch: 42 }, { wch: 32 }, { wch: 16 }, ...reportData.slots.map(() => ({ wch: 20 }))];
      sheet['!autofilter'] = { ref: sheet['!ref'] };
      // Keep balances numeric; locale formatting and debit/credit text never enter cells.
      for (let row = 1; row < data.length; row += 1) {
        for (let col = 3; col < headers.length; col += 1) {
          const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
          if (cell?.t === 'n') cell.z = '#,##0.############;(#,##0.############);0';
        }
      }
      XLSX.utils.book_append_sheet(workbook, sheet, label);
    });
    return workbook;
  };

  const collectSelectedLeafIds = ({ selectedIds, accountTree }) => {
    const result = new Set();
    const addLeaves = (node) => {
      if (!node.children || node.children.length === 0) {
        result.add(String(node.id));
        return;
      }
      node.children.forEach(addLeaves);
    };
    const visit = (node) => {
      if (selectedIds.has(String(node.id))) addLeaves(node);
      else (node.children || []).forEach(visit);
    };
    (accountTree || []).forEach(visit);
    return result;
  };

  const generateMonthlyReportData = async ({
    supabase,
    filters,
    availablePeriods,
    fPeriods,
    cal,
    currencies,
    accountMap,
    accountTree,
    selectedIds,
    isRtl,
  }) => {
    const showMovements = !!filters?.show_movements;

    const slots = (availablePeriods || [])
      .filter((p) => fPeriods.has(p.key))
      .sort((a, b) => {
        const byStart = String(a.periodFrom || '').localeCompare(String(b.periodFrom || ''));
        if (byStart !== 0) return byStart;
        return String(a.key || '').localeCompare(String(b.key || ''));
      })
      .map((p) => {
        const periodFrom = normalizeSlashDate(p.periodFrom);
        const periodTo = normalizeSlashDate(p.periodTo);
        return {
          ...p,
          targetDate: periodTo,
          targetRateDate: normalizeDashDate(periodTo),
          periodFrom,
          periodTo,
        };
      });

    if (!slots.length) {
      return { kind: 'invalid_months' };
    }

    const maxTxDate = slots[slots.length - 1].targetDate;
    const maxRateDate = slots[slots.length - 1].targetRateDate || normalizeDashDate(maxTxDate);
    const leafIdSet = collectSelectedLeafIds({ selectedIds, accountTree });
    if (!leafIdSet.size) {
      return { kind: 'no_leaf_accounts' };
    }

    const selectedCurrency = filters?.currency || null;
    const selCurrId = selectedCurrency ? String(selectedCurrency.id || '') : '';
    const currMap = new Map((currencies || []).map((c) => [String(c.id), c]));

    const baseAccounts = Array.from(leafIdSet)
      .map((id) => accountMap.get(id))
      .filter(Boolean)
      .map((a) => ({ ...a, currency_code: currMap.get(String(a.currency_id || ''))?.code || '' }))
      .filter((a) => !selCurrId || String(a.currency_id || '') === selCurrId);

    if (!baseAccounts.length) {
      return {
        kind: 'ok',
        reportData: {
          slots,
          groupedRows: [],
          grandTotal: {},
          leafCount: 0,
          detailItems: [],
          rateLookup: new Map(),
          reportAccountLookup: new Map(),
          showMovements,
        }
      };
    }

    const accById = new Map(baseAccounts.map((a) => [String(a.id), a]));
    const accIds = baseAccounts.map((a) => String(a.id));

    const allRates = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await supabase.from('fm_currency_rates')
        .select('base_currency, target_currency, rate, rate_date, created_at')
        .lte('rate_date', maxRateDate)
        .order('rate_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(off, off + 999);
      if (error) throw error;
      if (data?.length) allRates.push(...data);
      if (!data || data.length < 1000) break;
    }
    const rateLookup = buildRateLookup(allRates);
    const rateCache = new Map();

    const { data: userData } = await supabase
      .from('sec_users')
      .select('id, full_name, username');
    const userNameMap = {};
    (userData || []).forEach((user) => {
      const label = `${user.full_name || user.username || ''}`.trim();
      if (label) userNameMap[String(user.id)] = label;
    });

    const { data: txData } = await supabase.from('fm_transactions')
      .select('id, document_code, document_date, status, transaction_type, reference_code, description, created_at, registrar_id, reviewed_at, approved_at, department_id, reviewed_by_name, approved_by_name')
      .in('status', ['TEMPORARY', 'FINAL', 'APPROVED'])
      .lte('document_date', maxTxDate);

    const txDateMap = new Map();
    const txMetaMap = new Map();
    (txData || []).forEach((tx) => {
      const txId = String(tx.id || '');
      if (!txId) return;
      txDateMap.set(txId, normalizeSlashDate(tx.document_date));
      txMetaMap.set(txId, {
        id: tx.id,
        document_code: tx.document_code || '',
        document_date: normalizeSlashDate(tx.document_date),
        status: tx.status || '',
        transaction_type: tx.transaction_type || '',
        reference_code: tx.reference_code || '',
        description: tx.description || '',
        created_at: tx.created_at || '',
        registrar_id: tx.registrar_id || '',
        reviewed_at: tx.reviewed_at || '',
        approved_at: tx.approved_at || '',
        department_id: tx.department_id || '',
        reviewed_by_name: tx.reviewed_by_name || '',
        approved_by_name: tx.approved_by_name || '',
      });
    });
    const validTxIds = new Set(Array.from(txDateMap.keys()));

    const dailyMap = {};
    const detailItems = [];
    const BATCH = 400;
    for (let i = 0; i < accIds.length; i += BATCH) {
      const batch = accIds.slice(i, i + BATCH);
      const { data: items } = await supabase.from('fm_transaction_items')
        .select('*')
        .in('account_id', batch);
      (items || []).forEach((item) => {
        const txId = String(item.transaction_id || '');
        if (!validTxIds.has(txId)) return;

        const txDate = txDateMap.get(txId);
        if (!txDate) return;
        const aid = String(item.account_id);
        if (!dailyMap[aid]) dailyMap[aid] = {};
        if (!dailyMap[aid][txDate]) dailyMap[aid][txDate] = { dep: 0, wid: 0 };
        if (item.transaction_action === 'DEPOSIT') {
          dailyMap[aid][txDate].dep += parseFloat(item.deposit_amount || 0) || 0;
        } else {
          dailyMap[aid][txDate].wid += parseFloat(item.withdrawal_amount || 0) || 0;
        }

        const txMeta = txMetaMap.get(txId) || {};
        const account = accById.get(aid) || {};
        const rawDep = parseFloat(item.deposit_amount || 0) || 0;
        const rawWid = parseFloat(item.withdrawal_amount || 0) || 0;
        const rateToUsd = parseFloat(item.exchange_rate_to_usd || 0) || 0;
        const rateUsdToIrr = parseFloat(item.exchange_rate_usd_to_irr || 0) || 0;
        const amount = rawDep > 0 ? rawDep : rawWid;
        const resolvedToUsd = rateToUsd > 0 ? rateToUsd : 1;
        const resolvedUsdToIrr = rateUsdToIrr > 0 ? rateUsdToIrr : 1;

        detailItems.push({
          ...item,
          deposit_amount: rawDep,
          withdrawal_amount: rawWid,
          _stored_exchange_rate_to_usd: rateToUsd > 0 ? rateToUsd : null,
          _stored_exchange_rate_usd_to_irr: rateUsdToIrr > 0 ? rateUsdToIrr : null,
          exchange_rate_to_usd: resolvedToUsd,
          exchange_rate_usd_to_irr: resolvedUsdToIrr,
          amount_usd: amount * resolvedToUsd,
          amount_irr: amount * resolvedToUsd * resolvedUsdToIrr,
          dep_usd: rawDep * resolvedToUsd,
          dep_irr: rawDep * resolvedToUsd * resolvedUsdToIrr,
          wid_usd: rawWid * resolvedToUsd,
          wid_irr: rawWid * resolvedToUsd * resolvedUsdToIrr,
          remained_amount: item.remained_amount != null ? parseFloat(item.remained_amount) : null,
          _doc_id: txMeta.id || item.transaction_id,
          _doc_code: txMeta.document_code || '',
          _doc_date: normalizeSlashDate(txMeta.document_date || txDate || ''),
          _tx_type: txMeta.transaction_type || '',
          _tx_status: txMeta.status || '',
          _tx_reference_code: txMeta.reference_code || '',
          _tx_description: txMeta.description || '',
          _tx_created_at: txMeta.created_at || '',
          _registrar_name: userNameMap[String(txMeta.registrar_id || '')] || txMeta.registrar_id || '',
          _tx_meta: txMeta,
          _account: account,
          _account_code: account.code || '',
          _account_title: isRtl ? (account.title_fa || account.title_en || account.code || '') : (account.title_en || account.title_fa || account.code || ''),
          _account_currency_code: account.currency_code || '',
        });
      });
    }

    const matrix = {};
    const grandTotal = {};
    slots.forEach((s) => { grandTotal[s.key] = { usd: 0, irr: 0 }; });

    baseAccounts.forEach((acc) => {
      const aid = String(acc.id);
      const daily = dailyMap[aid] || {};
      const dates = Object.keys(daily).sort();
      matrix[aid] = {};

      slots.forEach((s) => {
        let bal = 0;
        dates.forEach((d) => {
          if (d <= s.targetDate) bal += (daily[d].dep || 0) - (daily[d].wid || 0);
        });

        let dep = 0;
        let wid = 0;
        dates.forEach((d) => {
          if (d >= s.periodFrom && d <= s.periodTo) {
            dep += daily[d].dep || 0;
            wid += daily[d].wid || 0;
          }
        });

        const currCode = acc.currency_code || '';
        const usdR = resolveRate(rateLookup, currCode, 'USD', s.targetRateDate || s.targetDate, rateCache);
        const irrR = resolveRate(rateLookup, currCode, 'IRR', s.targetRateDate || s.targetDate, rateCache);
        const usd = bal * usdR;
        const irr = bal * irrR;

        matrix[aid][s.key] = { nat: bal, usd, irr, dep, wid };
        grandTotal[s.key].usd += usd;
        grandTotal[s.key].irr += irr;
      });
    });

    const groupedRows = buildGroupedRows({
      selectedIds,
      tree: accountTree,
      accById,
      matrix,
      slots,
      isRtl,
    });

    return {
      kind: 'ok',
      reportData: {
        slots,
        groupedRows,
        matrix,
        accountPaths: buildMonthlyAccountPaths(accountTree),
        grandTotal,
        leafCount: baseAccounts.length,
        detailItems,
        rateLookup,
        reportAccountLookup: accById,
        showMovements,
      }
    };
  };

  window.BalanceMonthlyReportLogic = {
    pad2,
    normalizeSlashDate,
    normalizeDashDate,
    monthLabel,
    currentCalYear,
    slotTargetDate,
    prevMonthSlot,
    fmt,
    fmtDecimal,
    buildRateLookup,
    resolveRate,
    buildTree,
    buildGroupedRows,
    buildMonthlyAccountPaths,
    buildMonthlyTabRows,
    buildMonthlyWorkbook,
    collectSelectedLeafIds,
    generateMonthlyReportData,
  };
})();
