/* Prototype account-tree logic. Production mutations belong in the backend. */
(() => {
  const key = value => String(value ?? '');
  const fail = (fa, en) => { throw Object.assign(new Error(en), { fa, en }); };

  const getNewNodeDepth = (nodes, parentId) => {
    const byId = new Map(nodes.map(node => [key(node.id), node]));
    const visited = new Set();
    let depth = 1;
    while (parentId != null && parentId !== '') {
      if (visited.has(key(parentId))) fail('ساختار حساب دارای چرخه است.', 'The account tree contains a cycle.');
      visited.add(key(parentId));
      const parent = byId.get(key(parentId));
      if (!parent) fail('اطلاعات حساب پدر در دسترس نیست.', 'Parent account data is unavailable.');
      depth++;
      parentId = parent.parentId;
    }
    return depth;
  };

  const segmentLength = (chart, depth) => Number([
    null, chart.len_group || 1, chart.len_general || 2,
    chart.len_subsidiary || 3, chart.len_detail || 4
  ][depth]);

  const suggestNextCode = (nodes, parentId, depth, chart) => {
    const prefix = String(nodes.find(n => key(n.id) === key(parentId))?.code || '');
    let maximum = 0;
    nodes.filter(n => key(n.parentId) === key(parentId)).forEach(node => {
      const code = String(node.code || '');
      if (!code.startsWith(prefix)) return;
      const suffix = parseInt(code.slice(prefix.length), 10);
      if (Number.isFinite(suffix)) maximum = Math.max(maximum, suffix);
    });
    return prefix + String(maximum + 1).padStart(segmentLength(chart, depth), '0');
  };

  const validateUniqueness = (nodes, node) => {
    const others = nodes.filter(n => key(n.id) !== key(node.id));
    const siblings = others.filter(n => key(n.parentId) === key(node.parentId));
    if (siblings.some(n => (n.titleFa || '').trim() === (node.titleFa || '').trim())) {
      fail('عنوان فارسی در این سطح تکراری است', 'Duplicate Persian title at this level');
    }
    if ((node.titleEn || '').trim() && siblings.some(n => (n.titleEn || '').trim() === node.titleEn.trim())) {
      fail('عنوان انگلیسی در این سطح تکراری است', 'Duplicate English title at this level');
    }
    if (others.some(n => String(n.code).trim() === String(node.code).trim())) {
      fail('کد حساب وارد شده در کل ساختار تکراری است', 'Account code must be unique throughout the chart');
    }
  };

  const fetchAccounts = async (supabase, chartId) => {
    if (!supabase) fail('اتصال داده در دسترس نیست.', 'The data connection is unavailable.');
    const rows = [];
    let total = null;
    do {
      const { data, error, count } = await supabase.from('fm_coa_accounts')
        .select('*', { count: 'exact' }).eq('chart_id', chartId)
        .order('id', { ascending: true }).range(rows.length, rows.length + 499);
      if (error) throw error;
      if (total !== null && count !== total) fail('ساختار تغییر کرده است؛ دوباره بارگذاری کنید.', 'The tree changed; reload it.');
      total = count;
      if (!Array.isArray(data) || !Number.isInteger(total) || (!data.length && rows.length < total)) {
        fail('دریافت کامل ساختار حساب ممکن نشد.', 'Could not retrieve the complete account tree.');
      }
      rows.push(...data);
    } while (rows.length < total);
    if (new Set(rows.map(row => key(row.id))).size !== rows.length) {
      fail('ساختار هنگام دریافت تغییر کرد؛ دوباره بارگذاری کنید.', 'The tree changed while loading; reload it.');
    }
    return rows;
  };

  const asNodes = rows => rows.map(row => ({
    id: row.id, parentId: row.parent_id, code: row.code,
    titleFa: row.title_fa, titleEn: row.title_en
  }));

  const subtree = (nodes, nodeId) => {
    const root = nodes.find(n => key(n.id) === key(nodeId));
    if (!root) fail('حساب انتخاب‌شده در دسترس نیست.', 'The selected account is unavailable.');
    const result = [{ ...root, relativeDepth: 0 }];
    const seen = new Set([key(root.id)]);
    for (let i = 0; i < result.length; i++) {
      for (const child of nodes.filter(n => key(n.parentId) === key(result[i].id))) {
        if (seen.has(key(child.id))) fail('ساختار حساب دارای چرخه است.', 'The account tree contains a cycle.');
        seen.add(key(child.id));
        result.push({ ...child, relativeDepth: result[i].relativeDepth + 1 });
      }
    }
    return result;
  };

  const parentOptions = (nodes, nodeId) => {
    const branch = subtree(nodes, nodeId);
    const excluded = new Set(branch.map(n => key(n.id)));
    const height = Math.max(...branch.map(n => n.relativeDepth));
    const currentParent = key(branch[0].parentId);
    const candidates = nodes.filter(n => !excluded.has(key(n.id)) && key(n.id) !== currentParent &&
      getNewNodeDepth(nodes, n.id) + height <= 4);
    if (currentParent !== '' && height < 4) candidates.unshift({ id: null, code: '', isRoot: true });
    return candidates;
  };

  const planMove = (nodes, nodeId, parentId, newCode, chart) => {
    const branch = subtree(nodes, nodeId);
    if (!parentOptions(nodes, nodeId).some(n => key(n.id) === key(parentId))) {
      fail('پدر انتخاب‌شده مجاز نیست؛ چرخه یا عمق بیش از چهار سطح ایجاد می‌شود یا پدر تغییر نکرده است.',
        'Invalid parent: unchanged parent, cycle, or depth exceeding four levels.');
    }
    const code = String(newCode || '').trim();
    if (!code) fail('کد حساب الزامی است.', 'Account code is required.');
    const depth = getNewNodeDepth(nodes, parentId);
    validateUniqueness(nodes, { ...branch[0], parentId, code });
    const byId = new Map(nodes.map(n => [key(n.id), n]));
    const newCodes = new Map([[key(nodeId), code]]);
    const changes = branch.map((node, index) => {
      let nextCode = code;
      if (index > 0) {
        const oldPrefix = String(byId.get(key(node.parentId)).code);
        const oldCode = String(node.code);
        const suffix = oldCode.startsWith(oldPrefix) ? oldCode.slice(oldPrefix.length) : '';
        if (!/^\d+$/.test(suffix)) {
          fail(`کد زیرمجموعه ${oldCode} با پدر آن سازگار نیست؛ ابتدا کد آن را اصلاح کنید.`,
            `Child code ${oldCode} does not match its parent; correct it first.`);
        }
        const length = segmentLength(chart, depth + node.relativeDepth);
        const digits = suffix.replace(/^0+(?=\d)/, '');
        if (digits.length > length) {
          fail(`کد ${oldCode} در طول کد سطح مقصد جا نمی‌گیرد.`, `Code ${oldCode} exceeds the destination segment length.`);
        }
        nextCode = newCodes.get(key(node.parentId)) + digits.padStart(length, '0');
        newCodes.set(key(node.id), nextCode);
      }
      return { ...node, oldCode: node.code, code: nextCode, parentId: index === 0 ? parentId : node.parentId };
    });
    const movingIds = new Set(changes.map(n => key(n.id)));
    const usedCodes = new Set(nodes.filter(n => !movingIds.has(key(n.id))).map(n => String(n.code).trim()));
    for (const change of changes) {
      if (usedCodes.has(change.code)) fail(`کد ${change.code} تکراری است.`, `Duplicate account code: ${change.code}.`);
      usedCodes.add(change.code);
    }
    return changes;
  };

  const saveMove = async ({ supabase, chart, rows, nodeId, parentId, code, canEdit, userName }) => {
    if (!canEdit) fail('مجوز ویرایش حساب ندارید.', 'You do not have permission to edit accounts.');
    const fresh = await fetchAccounts(supabase, chart.id);
    if (JSON.stringify(fresh) !== JSON.stringify(rows)) {
      fail('اطلاعات ساختار تغییر کرده است؛ دوباره بارگذاری و کدهای جدید را بررسی کنید.',
        'The chart has changed; reload and review the new codes.');
    }
    const changes = planMove(asNodes(fresh), nodeId, parentId, code, chart);
    const changesById = new Map(changes.map(change => [key(change.id), change]));
    // One PostgREST upsert statement keeps the entire branch atomic. Preserve all
    // stored columns and IDs; existing RLS still controls every affected row.
    const payload = fresh.filter(row => changesById.has(key(row.id))).map(row => {
      const change = changesById.get(key(row.id));
      return { ...row, parent_id: change.parentId || null, code: change.code };
    });
    const { error } = await supabase.from('fm_coa_accounts').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    let logError = null;
    try {
      const result = await supabase.from('fm_record_logs').insert(changes.map(change => ({
        entity_type: 'حساب کدینگ', record_id: key(change.id), action: 'update', user_name: userName,
        details: `انتقال شاخه ${nodeId}: کد ${change.oldCode} → ${change.code}؛ پدر ${fresh.find(row => key(row.id) === key(change.id)).parent_id ?? 'root'} → ${change.parentId ?? 'root'}`
      })));
      logError = result.error;
    } catch (error) { logError = error; }
    return { changes, logError };
  };

  window.ChartOfAccountsLogic = {
    getNewNodeDepth, suggestNextCode, validateUniqueness, fetchAccounts,
    asNodes, parentOptions, planMove, saveMove
  };
})();
