/* Filename: financial/TransactionMainExcel.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useCallback } = React;

  const FallbackComponent = () => null;
  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const Feedback = window.DSFeedback || window.DSOverlays || DS || {};

  const Button = Core.Button || FallbackComponent;
  const Modal = Feedback.Modal || FallbackComponent;

  const normalizeImportToken = (value) => String(value ?? '').trim().toLowerCase().replace(/[\s\-_\/|]+/g, ' ').replace(/\s+/g, ' ');
  const normalizeLooseMatchToken = (value) => normalizeImportToken(value).replace(/\s+/g, '');
  const formatDateToYmd = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseImportedDate = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (value instanceof Date) return formatDateToYmd(value);

    const text = String(value).trim();
    if (!text) return '';

    const numericValue = Number(text);
    if (Number.isFinite(numericValue) && numericValue > 0 && Number.isInteger(numericValue)) {
      const parsed = window.XLSX?.SSF?.parse_date_code ? window.XLSX.SSF.parse_date_code(numericValue) : null;
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }

    const normalized = text.replace(/\./g, '/').replace(/-/g, '/');
    const parts = normalized.split('/').map(part => part.trim()).filter(Boolean);
    if (parts.length !== 3) return '';

    const [first, second, third] = parts;
    let year = null;
    let month = null;
    let day = null;

    if (third.length === 4) {
      year = Number(third);
      const firstNum = Number(first);
      const secondNum = Number(second);
      if (firstNum > 12 && secondNum <= 12) {
        day = firstNum;
        month = secondNum;
      } else {
        month = firstNum;
        day = secondNum;
      }
    } else if (first.length === 4) {
      year = Number(first);
      month = Number(second);
      day = Number(third);
    }

    if (!year || !month || !day) return '';
    const parsedDate = new Date(year, month - 1, day);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return formatDateToYmd(parsedDate);
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '';
    const v = parseFloat(String(num).replace(/,/g, ''));
    if (isNaN(v)) return '';
    return String(v);
  };

  const pickLocalizedTitle = (item, isRtl) => {
    if (!item) return '';
    return isRtl
      ? (item.displayLabel || item.titleFa || item.title_fa || item.titleEn || item.title_en || item.code || '')
      : (item.displayLabel || item.titleEn || item.title_en || item.titleFa || item.title_fa || item.code || '');
  };

  const buildIndexedLookup = (items = [], getLabels = []) => {
    const map = new Map();
    (items || []).forEach(item => {
      const itemKey = item?.id ?? item?.value ?? item?.code ?? item?.title ?? JSON.stringify(item);
      getLabels.forEach(getLabel => {
        const label = normalizeImportToken(getLabel(item));
        if (!label) return;
        const entry = map.get(label) || { items: [], seen: new Set() };
        if (!entry.seen.has(itemKey)) {
          entry.seen.add(itemKey);
          entry.items.push(item);
        }
        map.set(label, entry);
      });
    });
    return map;
  };

  const getSingleMatch = (collection, rawValue) => {
    const normalized = normalizeImportToken(rawValue);
    if (!normalized) return { id: null, item: null, label: '' };
    const entry = collection.get(normalized);
    const matches = entry?.items || [];
    if (matches.length === 1) {
      const item = matches[0];
      return { id: item.id ?? item.value ?? null, item, label: pickLocalizedTitle(item, true) || String(rawValue) };
    }
    if (matches.length === 0) {
      const queryLoose = normalizeLooseMatchToken(rawValue);
      const fuzzyMatches = [];
      const seenIds = new Set();
      for (const [label, bucket] of collection.entries()) {
        if (!label) continue;
        const labelLoose = normalizeLooseMatchToken(label);
        if (!labelLoose) continue;
        if (labelLoose === queryLoose || labelLoose.includes(queryLoose) || queryLoose.includes(labelLoose)) {
          (bucket.items || []).forEach(item => {
            const itemId = item.id ?? item.value ?? item.code ?? item.title ?? JSON.stringify(item);
            if (seenIds.has(itemId)) return;
            seenIds.add(itemId);
            fuzzyMatches.push(item);
          });
        }
      }
      if (fuzzyMatches.length === 1) {
        const item = fuzzyMatches[0];
        return { id: item.id ?? item.value ?? null, item, label: pickLocalizedTitle(item, true) || String(rawValue), fuzzy: true };
      }
      if (fuzzyMatches.length > 1) return { error: String(rawValue), ambiguous: true };
      return { error: String(rawValue) };
    }
    return { error: String(rawValue), ambiguous: true };
  };

  const collectLookupDebugCandidates = (collection, rawValue, maxItems = 5) => {
    const normalized = normalizeImportToken(rawValue);
    const looseNormalized = normalizeLooseMatchToken(rawValue);
    const seen = new Set();
    const candidates = [];

    for (const entry of collection.values()) {
      for (const item of (entry?.items || [])) {
        const label = pickLocalizedTitle(item, true) || item?.titleFa || item?.title_fa || item?.titleEn || item?.title_en || item?.code || '';
        const labelNormalized = normalizeImportToken(label);
        const labelLoose = normalizeLooseMatchToken(label);
        if (!labelNormalized || !labelLoose) continue;
        if (normalized && labelNormalized === normalized) continue;
        if (!looseNormalized) continue;
        if (!(labelLoose.includes(looseNormalized) || looseNormalized.includes(labelLoose))) continue;

        const itemKey = item?.id ?? item?.value ?? item?.code ?? labelNormalized;
        if (seen.has(itemKey)) continue;
        seen.add(itemKey);
        candidates.push(label);
        if (candidates.length >= maxItems) return candidates;
      }
    }

    return candidates;
  };

  const collectLookupSampleTitles = (collection, maxItems = 5) => {
    const samples = [];
    const seen = new Set();
    for (const entry of collection.values()) {
      for (const item of (entry?.items || [])) {
        const label = pickLocalizedTitle(item, true) || item?.titleFa || item?.title_fa || item?.titleEn || item?.title_en || item?.code || '';
        if (!label) continue;
        const normalized = normalizeImportToken(label);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        samples.push(label);
        if (samples.length >= maxItems) return samples;
      }
    }
    return samples;
  };

  const collectLookupDebugEntries = (collection, rawValue, maxItems = 5) => {
    const normalized = normalizeImportToken(rawValue);
    const looseNormalized = normalizeLooseMatchToken(rawValue);
    const seen = new Set();
    const candidates = [];

    for (const entry of collection.values()) {
      for (const item of (entry?.items || [])) {
        const label = pickLocalizedTitle(item, true) || item?.titleFa || item?.title_fa || item?.titleEn || item?.title_en || item?.code || '';
        const labelNormalized = normalizeImportToken(label);
        const labelLoose = normalizeLooseMatchToken(label);
        if (!labelNormalized || !labelLoose) continue;
        if (normalized && labelNormalized === normalized) continue;
        if (!looseNormalized) continue;
        if (!(labelLoose.includes(looseNormalized) || looseNormalized.includes(labelLoose))) continue;

        const itemKey = item?.id ?? item?.value ?? item?.code ?? labelNormalized;
        if (seen.has(itemKey)) continue;
        seen.add(itemKey);

        const parts = [label];
        if (item?.code) parts.push(`code=${item.code}`);
        if (item?.id !== undefined && item?.id !== null) parts.push(`id=${item.id}`);
        if (item?.pathTitle) parts.push(`path=${item.pathTitle}`);
        if (item?.chart_name) parts.push(`chart=${item.chart_name}`);
        candidates.push(parts.join(' | '));
        if (candidates.length >= maxItems) return candidates;
      }
    }

    return candidates;
  };

  const useTransactionMainExcel = ({
    isRtl,
    t,
    supabase,
    showToast,
    deptsMap,
    lookups,
    filteredTransactions,
    usersMap,
    currentUserId,
    currentUserName,
    dateLocale,
    fetchData,
    logAction,
  }) => {
    const [importErrors, setImportErrors] = useState({ isOpen: false, errors: [] });

    const triggerBlobDownload = useCallback((blob, filename) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      try {
        if (typeof link.click === 'function') {
          link.click();
        } else {
          link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
      } catch (clickError) {
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 0);
    }, []);

    const activeChartAccounts = useMemo(() => {
      const activeChartId = lookups.activeChartId;
      const accounts = lookups.accounts || [];
      if (!activeChartId) return accounts;
      return accounts.filter(item => String(item.chart_id) === String(activeChartId));
    }, [lookups.activeChartId, lookups.accounts]);

    const lookupByTitle = useMemo(() => ({
      accounts: buildIndexedLookup(activeChartAccounts, [
        item => item.displayLabel,
        item => item.titleFa || item.title_fa,
        item => item.titleEn || item.title_en,
      ]),
      costTypes: buildIndexedLookup([
        ...(lookups.costTypesAll || []),
        ...(lookups.costTypes || []),
      ], [
        item => item.displayLabel,
        item => item.titleFa || item.title_fa,
        item => item.titleEn || item.title_en,
        item => item.pathTitle,
        item => item.code,
      ]),
      incomeTypes: buildIndexedLookup([
        ...(lookups.incomeTypesAll || []),
        ...(lookups.incomeTypes || []),
      ], [
        item => item.displayLabel,
        item => item.titleFa || item.title_fa,
        item => item.titleEn || item.title_en,
        item => item.pathTitle,
        item => item.code,
      ]),
      centers: buildIndexedLookup(lookups.costBenefitCenters || [], [
        item => item.displayLabel,
        item => item.titleFa || item.title_fa,
        item => item.titleEn || item.title_en,
      ]),
      departments: buildIndexedLookup(
        Object.entries(deptsMap || {}).map(([id, title]) => ({ id, title })),
        [item => item.title]
      ),
    }), [activeChartAccounts, deptsMap, lookups.costBenefitCenters, lookups.costTypes, lookups.costTypesAll, lookups.incomeTypes, lookups.incomeTypesAll]);

    const enumAliases = useMemo(() => ({
      transactionType: new Map([
        ['opening', 'OPENING'], ['افتتاحیه', 'OPENING'],
        ['closing', 'CLOSING'], ['اختتامیه', 'CLOSING'],
        ['general', 'GENERAL'], ['عمومی', 'GENERAL'],
        ['transfer', 'TRANSFER'], ['انتقال', 'TRANSFER'],
      ].map(([k, v]) => [normalizeImportToken(k), v])),
      status: new Map([
        ['draft', 'DRAFT'], ['یادداشت', 'DRAFT'],
        ['temporary', 'TEMPORARY'], ['موقت', 'TEMPORARY'],
        ['final', 'FINAL'], ['بررسی شده', 'FINAL'],
        ['approved', 'APPROVED'], ['تایید شده', 'APPROVED'],
      ].map(([k, v]) => [normalizeImportToken(k), v])),
      action: new Map([
        ['deposit', 'DEPOSIT'], ['واریز', 'DEPOSIT'],
        ['withdrawal', 'WITHDRAWAL'], ['برداشت', 'WITHDRAWAL'],
      ].map(([k, v]) => [normalizeImportToken(k), v])),
      group: new Map([
        ['cost', 'COST'], ['هزینه', 'COST'],
        ['income', 'INCOME'], ['درآمد', 'INCOME'],
        ['balance', 'BALANCE'], ['بالانس', 'BALANCE'],
        ['other', 'OTHER'], ['سایر', 'OTHER'],
      ].map(([k, v]) => [normalizeImportToken(k), v])),
    }), []);

    const handleDownloadSample = useCallback(() => {
      const XLSX = window.XLSX;
      if (!XLSX) {
        showToast(t('کتابخانه ساخت فایل اکسل در دسترس نیست.', 'Excel library is not available.'), 'error');
        return;
      }

      const firstAccount = (lookups.accounts || [])[0] || null;
      const firstCostType = (lookups.costTypes || [])[0] || null;
      const firstIncomeType = (lookups.incomeTypes || [])[0] || null;
      const firstCenter = (lookups.costBenefitCenters || [])[0] || null;
      const firstDeptTitle = Object.values(deptsMap || {}).find(Boolean) || '';

      const headers = [
        t('کد سند', 'Document Code'),
        t('تاریخ سند', 'Document Date'),
        t('نوع سند', 'Transaction Type'),
        t('وضعیت', 'Status'),
        t('عنوان دپارتمان', 'Department Title'),
        t('شرح سند', 'Description'),
        t('ردیف', 'Row'),
        t('عنوان حساب', 'Account Title'),
        t('نوع عملیات', 'Action'),
        t('گروه', 'Group'),
        t('عنوان هزینه', 'Cost Type Title'),
        t('عنوان درآمد', 'Income Type Title'),
        t('عنوان مرکز', 'Center Title'),
        t('کد ارز', 'Currency'),
        t('واریز', 'Deposit'),
        t('برداشت', 'Withdrawal'),
        t('شرح قلم', 'Item Description'),
      ];

      const sampleRows = isRtl ? [
        ['DOC-001', '2026-08-01', 'عمومی', 'یادداشت', firstDeptTitle, 'نمونه سند هزینه', 1, pickLocalizedTitle(firstAccount, isRtl) || 'صندوق', 'واریز', 'هزینه', pickLocalizedTitle(firstCostType, isRtl) || 'هزینه اداری', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', 1000000, '', 'پرداخت هزینه نمونه'],
        ['DOC-001', '2026-08-01', 'عمومی', 'یادداشت', firstDeptTitle, 'نمونه سند هزینه', 2, pickLocalizedTitle(firstAccount, isRtl) || 'بانک', 'برداشت', 'هزینه', pickLocalizedTitle(firstCostType, isRtl) || 'هزینه اداری', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', '', 1000000, 'ردیف دوم'],
        ['DOC-002', '2026-08-02', 'انتقال', 'موقت', firstDeptTitle, 'نمونه سند انتقال', 1, pickLocalizedTitle(firstAccount, isRtl) || 'صندوق', 'واریز', 'بالانس', '', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', 500000, '', 'ردیف انتقال'],
      ] : [
        ['DOC-001', '2026-08-01', 'General', 'Draft', firstDeptTitle, 'Sample cost document', 1, pickLocalizedTitle(firstAccount, isRtl) || 'Cash', 'Deposit', 'Cost', pickLocalizedTitle(firstCostType, isRtl) || 'Administrative Expense', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', 1000000, '', 'Sample item'],
        ['DOC-001', '2026-08-01', 'General', 'Draft', firstDeptTitle, 'Sample cost document', 2, pickLocalizedTitle(firstAccount, isRtl) || 'Bank', 'Withdrawal', 'Cost', pickLocalizedTitle(firstCostType, isRtl) || 'Administrative Expense', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', '', 1000000, 'Second row'],
        ['DOC-002', '2026-08-02', 'Transfer', 'Temporary', firstDeptTitle, 'Sample transfer document', 1, pickLocalizedTitle(firstAccount, isRtl) || 'Cash', 'Deposit', 'Balance', '', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', 500000, '', 'Transfer row'],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      triggerBlobDownload(blob, `Transaction_Import_Sample_${new Date().getTime()}.xlsx`);
    }, [deptsMap, isRtl, lookups.accounts, lookups.costBenefitCenters, lookups.costTypes, showToast, t, triggerBlobDownload]);

    const handleImportTransactions = useCallback((file) => {
      if (!file) return;
      const XLSX = window.XLSX;
      if (!XLSX) {
        showToast(t('کتابخانه پردازش فایل در دسترس نیست.', 'File processing library is not available.'), 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const ext = (file.name.split('.').pop() || '').toLowerCase();
          const workbook = ext === 'csv'
            ? XLSX.read(new TextDecoder('utf-8').decode(e.target.result).replace(/^\uFEFF/, ''), { type: 'string', cellDates: true })
            : XLSX.read(e.target.result, { type: 'array', cellDates: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

          if (rawRows.length < 2) {
            showToast(t('فایل خالی یا نامعتبر است.', 'File is empty or invalid.'), 'error');
            return;
          }

          const rows = rawRows.slice(1).map((cols, index) => ({
            sheetRow: index + 2,
            documentCode: String(cols[0] ?? '').trim(),
            documentDate: parseImportedDate(cols[1]),
            transactionType: String(cols[2] ?? '').trim(),
            status: String(cols[3] ?? '').trim(),
            departmentTitle: String(cols[4] ?? '').trim(),
            description: String(cols[5] ?? '').trim(),
            rowNumber: String(cols[6] ?? '').trim(),
            accountTitle: String(cols[7] ?? '').trim(),
            transactionAction: String(cols[8] ?? '').trim(),
            transactionGroup: String(cols[9] ?? '').trim(),
            costTypeTitle: String(cols[10] ?? '').trim(),
            incomeTypeTitle: String(cols[11] ?? '').trim(),
            centerTitle: String(cols[12] ?? '').trim(),
            currencyCode: String(cols[13] ?? '').trim().toUpperCase(),
            depositAmount: String(cols[14] ?? '').trim(),
            withdrawalAmount: String(cols[15] ?? '').trim(),
            itemDescription: String(cols[16] ?? '').trim(),
          })).filter(row => Object.values(row).some(value => String(value ?? '').trim() !== ''));

          if (rows.length === 0) {
            showToast(t('هیچ داده‌ای برای ورود وجود ندارد.', 'No data to import.'), 'warning');
            return;
          }

          const docGroups = new Map();
          const errors = [];
          rows.forEach(row => {
            const groupKey = normalizeImportToken(row.documentCode);
            if (!groupKey) {
              errors.push(`${t('ردیف', 'Row')} ${row.sheetRow}: ${t('کد سند الزامی است.', 'Document Code is required.')}`);
              return;
            }
            const groupRows = docGroups.get(groupKey) || [];
            groupRows.push(row);
            docGroups.set(groupKey, groupRows);
          });

          if (errors.length > 0) {
            setImportErrors({ isOpen: true, errors });
            return;
          }

          const docsToSave = [];
          for (const [groupKey, groupRows] of docGroups.entries()) {
            const masterRow = groupRows[0];
            const docTypeRaw = normalizeImportToken(masterRow.transactionType);
            const docStatusRaw = normalizeImportToken(masterRow.status);
            const docType = docTypeRaw ? enumAliases.transactionType.get(docTypeRaw) || null : 'GENERAL';
            const docStatus = docStatusRaw ? enumAliases.status.get(docStatusRaw) || null : 'DRAFT';
            const docDepartment = masterRow.departmentTitle ? getSingleMatch(lookupByTitle.departments, masterRow.departmentTitle) : { id: null };
            const masterErrors = [];

            if (!masterRow.documentCode) masterErrors.push(t('کد سند الزامی است.', 'Document code is required.'));
            if (!masterRow.documentDate) masterErrors.push(t('تاریخ سند الزامی است.', 'Document date is required.'));
            if (!masterRow.description) masterErrors.push(t('شرح سند الزامی است.', 'Document description is required.'));
            if (docTypeRaw && !docType) masterErrors.push(t('نوع سند نامعتبر است.', 'Transaction type is invalid.'));
            if (docStatusRaw && !docStatus) masterErrors.push(t('وضعیت سند نامعتبر است.', 'Status is invalid.'));
            if (masterRow.departmentTitle && docDepartment.error) {
              masterErrors.push(`${t('دپارتمان', 'Department')} «${masterRow.departmentTitle}» ${docDepartment.ambiguous ? t('مبهم است', 'is ambiguous') : t('یافت نشد', 'was not found')}`);
            }

            const seenRowNumbers = new Set();
            const mappedItems = [];
            for (const row of groupRows) {
              const rowErrors = [];
              const rowLabel = `${t('ردیف', 'Row')} ${row.sheetRow}`;
              const masterFieldChecks = [
                ['documentDate', t('تاریخ سند', 'Document date')],
                ['transactionType', t('نوع سند', 'Transaction type')],
                ['status', t('وضعیت', 'Status')],
                ['departmentTitle', t('دپارتمان', 'Department')],
              ];
              masterFieldChecks.forEach(([field, label]) => {
                const currentValue = String(row[field] ?? '').trim();
                const masterValue = String(masterRow[field] ?? '').trim();
                if (currentValue && masterValue && normalizeImportToken(currentValue) !== normalizeImportToken(masterValue)) {
                  rowErrors.push(`${rowLabel}: ${label} ${t('با مقدار ردیف اول سند همخوان نیست.', 'does not match the first row of the document.')}`);
                }
              });

              const amountDep = parseFloat(String(row.depositAmount || '0').replace(/,/g, '')) || 0;
              const amountWid = parseFloat(String(row.withdrawalAmount || '0').replace(/,/g, '')) || 0;
              const amountCount = (amountDep > 0 ? 1 : 0) + (amountWid > 0 ? 1 : 0);
              if (amountCount !== 1) {
                rowErrors.push(`${rowLabel}: ${t('فقط یکی از مبلغ واریز یا برداشت باید بزرگتر از صفر باشد.', 'Exactly one of deposit or withdrawal must be greater than zero.')} | ${t('واریز', 'Deposit')}: raw="${row.depositAmount || ''}" parsed=${amountDep} | ${t('برداشت', 'Withdrawal')}: raw="${row.withdrawalAmount || ''}" parsed=${amountWid}`);
              }

              const accountMatch = getSingleMatch(lookupByTitle.accounts, row.accountTitle);
              if (accountMatch.error) {
                const candidates = collectLookupDebugEntries(lookupByTitle.accounts, row.accountTitle).join(' | ');
                const samples = collectLookupSampleTitles(lookupByTitle.accounts).join(' | ');
                rowErrors.push(`${rowLabel}: ${t('حساب', 'Account')} «${row.accountTitle}» ${accountMatch.ambiguous ? t('مبهم است', 'is ambiguous') : t('یافت نشد', 'was not found')}${candidates ? ` | ${t('نزدیک‌ها', 'Near matches')}: ${candidates}` : ''} | ${t('نمونه‌های موجود', 'Stored samples')}: ${samples || '-'} | ${t('کل حساب‌های قابل‌استفاده', 'Available accounts')}: ${lookupByTitle.accounts?.length || 0}`);
              }

              const actionValue = enumAliases.action.get(normalizeImportToken(row.transactionAction)) || (amountDep > 0 ? 'DEPOSIT' : amountWid > 0 ? 'WITHDRAWAL' : null);
              if (!actionValue) {
                rowErrors.push(`${rowLabel}: ${t('نوع عملیات نامعتبر است.', 'Action is invalid.')}`);
              } else if (amountDep > 0 && actionValue !== 'DEPOSIT') {
                rowErrors.push(`${rowLabel}: ${t('مبلغ واریز با نوع عملیات همخوانی ندارد.', 'Deposit amount does not match the selected action.')}`);
              } else if (amountWid > 0 && actionValue !== 'WITHDRAWAL') {
                rowErrors.push(`${rowLabel}: ${t('مبلغ برداشت با نوع عملیات همخوانی ندارد.', 'Withdrawal amount does not match the selected action.')}`);
              }

              const groupRaw = normalizeImportToken(row.transactionGroup);
              const inferredGroup = groupRaw ? enumAliases.group.get(groupRaw) || null : (row.costTypeTitle ? 'COST' : row.incomeTypeTitle ? 'INCOME' : 'OTHER');
              if (groupRaw && !inferredGroup) {
                rowErrors.push(`${rowLabel}: ${t('گروه نامعتبر است.', 'Group is invalid.')}`);
              }

              const costMatch = row.costTypeTitle ? getSingleMatch(lookupByTitle.costTypes, row.costTypeTitle) : { id: null };
              const incomeMatch = row.incomeTypeTitle ? getSingleMatch(lookupByTitle.incomeTypes, row.incomeTypeTitle) : { id: null };
              const centerMatch = row.centerTitle ? getSingleMatch(lookupByTitle.centers, row.centerTitle) : { id: null };
              if (inferredGroup === 'COST' && !row.costTypeTitle) {
                rowErrors.push(`${rowLabel}: ${t('برای گروه هزینه، عنوان هزینه الزامی است.', 'Cost type title is required for COST group.')}`);
              }
              if (inferredGroup === 'INCOME' && !row.incomeTypeTitle) {
                rowErrors.push(`${rowLabel}: ${t('برای گروه درآمد، عنوان درآمد الزامی است.', 'Income type title is required for INCOME group.')}`);
              }
              if (row.costTypeTitle && costMatch.error) {
                const candidates = collectLookupDebugCandidates(lookupByTitle.costTypes, row.costTypeTitle).join(' | ');
                const samples = collectLookupSampleTitles(lookupByTitle.costTypes).join(' | ');
                rowErrors.push(`${rowLabel}: ${t('نوع هزینه', 'Cost type')} «${row.costTypeTitle}» ${costMatch.ambiguous ? t('مبهم است', 'is ambiguous') : t('یافت نشد', 'was not found')}${candidates ? ` | ${t('نزدیک‌ها', 'Near matches')}: ${candidates}` : ''} | ${t('عنوان نرمال‌شده', 'Normalized title')}: ${normalizeImportToken(row.costTypeTitle) || '-'} | ${t('نمونه‌های موجود', 'Stored samples')}: ${samples || '-'} | ${t('کل', 'Total')}: ${lookupByTitle.costTypesAll?.length || 0} | ${t('فعال', 'Active')}: ${lookupByTitle.costTypes?.length || 0}`);
              }
              if (row.incomeTypeTitle && incomeMatch.error) {
                const candidates = collectLookupDebugCandidates(lookupByTitle.incomeTypes, row.incomeTypeTitle).join(' | ');
                const samples = collectLookupSampleTitles(lookupByTitle.incomeTypes).join(' | ');
                rowErrors.push(`${rowLabel}: ${t('نوع درآمد', 'Income type')} «${row.incomeTypeTitle}» ${incomeMatch.ambiguous ? t('مبهم است', 'is ambiguous') : t('یافت نشد', 'was not found')}${candidates ? ` | ${t('نزدیک‌ها', 'Near matches')}: ${candidates}` : ''} | ${t('عنوان نرمال‌شده', 'Normalized title')}: ${normalizeImportToken(row.incomeTypeTitle) || '-'} | ${t('نمونه‌های موجود', 'Stored samples')}: ${samples || '-'} | ${t('کل', 'Total')}: ${lookupByTitle.incomeTypesAll?.length || 0} | ${t('فعال', 'Active')}: ${lookupByTitle.incomeTypes?.length || 0}`);
              }
              if (row.centerTitle && centerMatch.error) {
                rowErrors.push(`${rowLabel}: ${t('مرکز', 'Center')} «${row.centerTitle}» ${centerMatch.ambiguous ? t('مبهم است', 'is ambiguous') : t('یافت نشد', 'was not found')}`);
              }
              if (!row.itemDescription) {
                rowErrors.push(`${rowLabel}: ${t('شرح قلم الزامی است.', 'Item description is required.')}`);
              }

              const rowNumber = String(row.rowNumber || '').trim();
              const rowNumberNum = rowNumber ? parseInt(rowNumber, 10) : null;
              if (rowNumber && (!rowNumberNum || rowNumberNum < 1)) {
                rowErrors.push(`${rowLabel}: ${t('ردیف باید عدد صحیح مثبت باشد.', 'Row number must be a positive integer.')}`);
              }
              if (rowNumberNum) {
                if (seenRowNumbers.has(rowNumberNum)) {
                  rowErrors.push(`${rowLabel}: ${t('ردیف تکراری است.', 'Row number is duplicated within the document.')}`);
                }
                seenRowNumbers.add(rowNumberNum);
              }

              const currencyCode = row.currencyCode || (accountMatch.item?.currency_code || 'IRR');
              if (row.currencyCode && !(lookups.currencies || []).some(cur => normalizeImportToken(cur.code) === normalizeImportToken(row.currencyCode))) {
                rowErrors.push(`${rowLabel}: ${t('کد ارز نامعتبر است.', 'Currency code is invalid.')}`);
              }

              const isTransferRow = normalizeImportToken(masterRow.transactionType) === 'transfer' || docType === 'TRANSFER';
              if (rowErrors.length === 0) {
                mappedItems.push({
                  row_number: rowNumberNum || groupRows.indexOf(row) + 1,
                  account_id: accountMatch.id,
                  transaction_action: actionValue,
                  transaction_group: inferredGroup,
                  cost_type_id: inferredGroup === 'COST' && costMatch.id ? costMatch.id : null,
                  income_type_id: inferredGroup === 'INCOME' && incomeMatch.id ? incomeMatch.id : null,
                  center_id: centerMatch.id || null,
                  currency: currencyCode || 'IRR',
                  deposit_amount: amountDep,
                  withdrawal_amount: amountWid,
                  description: row.itemDescription,
                });
              }

              rowErrors.forEach(msg => masterErrors.push(msg));
            }

            const finalItems = mappedItems.map(item => ({
              ...item,
            }));

            if (masterErrors.length > 0 || finalItems.length === 0) {
              const docLabel = masterRow.documentCode || groupKey;
              (masterErrors.length > 0 ? masterErrors : [t('این سند هیچ قلم معتبری ندارد.', 'This document has no valid items.')]).forEach(msg => {
                errors.push(`${t('سند', 'Document')} ${docLabel}: ${msg}`);
              });
              continue;
            }

            docsToSave.push({
              groupKey,
              masterRow,
              documentType: docType || 'GENERAL',
              documentStatus: docStatus || 'DRAFT',
              departmentId: docDepartment.id || null,
              items: finalItems,
            });
          }

          if (errors.length > 0) {
            setImportErrors({ isOpen: true, errors });
            return;
          }

          let insertedCount = 0;
          let updatedCount = 0;
          for (const doc of docsToSave) {
            const documentCode = doc.masterRow.documentCode;

            const txPayload = {
              document_code: documentCode,
              document_date: doc.masterRow.documentDate,
              registrar_id: currentUserId || null,
              transaction_type: doc.documentType || 'GENERAL',
              department_id: doc.departmentId || null,
              status: doc.documentStatus || 'DRAFT',
              description: doc.masterRow.description || '',
            };

            const { data: existingTx } = await supabase.from('fm_transactions').select('id').eq('document_code', documentCode).maybeSingle();
            let txId = existingTx?.id || null;
            if (txId) {
              const { error } = await supabase.from('fm_transactions').update(txPayload).eq('id', txId);
              if (error) throw error;
              updatedCount++;
            } else {
              const { data, error } = await supabase.from('fm_transactions').insert([txPayload]).select('id');
              if (error) throw error;
              txId = data?.[0]?.id;
              insertedCount++;
              if (window.AutoNumberingService && !doc.masterRow.documentCode) {
                await window.AutoNumberingService.consumeNext('TRANSACTIONS').catch(() => {});
              }
            }

            await supabase.from('fm_transaction_items').delete().eq('transaction_id', txId);
            const itemsPayload = doc.items.map(item => ({
              transaction_id: txId,
              row_number: item.row_number,
              account_id: item.account_id,
              transaction_action: item.transaction_action,
              transaction_group: item.transaction_group,
              cost_type_id: item.cost_type_id,
              income_type_id: item.income_type_id,
              center_id: item.center_id,
              currency: item.currency,
              deposit_amount: item.deposit_amount,
              withdrawal_amount: item.withdrawal_amount,
              description: item.description || null,
            }));
            let itemInsertResult = await supabase.from('fm_transaction_items').insert(itemsPayload);
            if (itemInsertResult.error) {
              console.warn('fm_transaction_items insert failed, retrying without center_id:', itemInsertResult.error.message);
              const payloadWithoutCenter = itemsPayload.map(item => {
                const nextItem = { ...item };
                delete nextItem.center_id;
                return nextItem;
              });
              itemInsertResult = await supabase.from('fm_transaction_items').insert(payloadWithoutCenter);
            }
            if (itemInsertResult.error) throw itemInsertResult.error;

            await logAction(existingTx ? 'import_transaction_update' : 'import_transaction_create', txId, `Import ${documentCode}`);
          }

          await fetchData();
          setImportErrors({ isOpen: false, errors: [] });
          showToast(t(`ایمپورت با موفقیت انجام شد: ${insertedCount} جدید و ${updatedCount} به‌روز شد.`, `Import complete: ${insertedCount} inserted, ${updatedCount} updated.`), 'success');
        } catch (error) {
          console.error('Import parsing/saving error:', error);
          setImportErrors({ isOpen: true, errors: [error?.message || t('خطا در پردازش فایل.', 'Error processing file.')] });
        }
      };

      reader.readAsArrayBuffer(file);
    }, [currentUserId, fetchData, logAction, lookupByTitle.accounts, lookupByTitle.centers, lookupByTitle.costTypes, lookupByTitle.departments, lookupByTitle.incomeTypes, enumAliases.action, enumAliases.group, enumAliases.status, enumAliases.transactionType, showToast, supabase, t]);

    const formatDT = useCallback((val) => {
      if (!val) return '';
      try {
        return new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(val));
      } catch (e) {
        return String(val);
      }
    }, [dateLocale]);

    const onExport = useCallback(() => {
      const XLSX = window.XLSX;
      if (!XLSX) {
        showToast(t('کتابخانه ساخت فایل اکسل در دسترس نیست.', 'Excel library is not available.'), 'error');
        return;
      }

      const dataToExport = filteredTransactions || [];
      if (dataToExport.length === 0) {
        showToast(t('داده‌ای برای خروجی وجود ندارد.', 'No data to export.'), 'warning');
        return;
      }

      const TX_TYPE = { OPENING: t('افتتاحیه', 'Opening'), CLOSING: t('اختتامیه', 'Closing'), GENERAL: t('عمومی', 'General'), TRANSFER: t('انتقال', 'Transfer') };
      const TX_STATUS = { DRAFT: t('یادداشت', 'Draft'), TEMPORARY: t('موقت', 'Temporary'), FINAL: t('بررسی شده', 'Final'), APPROVED: t('تایید شده', 'Approved') };
      const TX_ACTION = { DEPOSIT: t('واریز', 'Deposit'), WITHDRAWAL: t('برداشت', 'Withdrawal') };
      const TX_GROUP = { COST: t('هزینه', 'Cost'), INCOME: t('درآمد', 'Income'), BALANCE: t('بالانس', 'Balance'), OTHER: t('سایر', 'Other') };

      const headers = [
        t('کد تراکنش', 'Transaction Code'), t('کد عطف', 'Ref Code'), t('شماره روزانه', 'Daily Number'),
        t('تاریخ سند', 'Document Date'), t('زمان ثبت', 'Registered At'),
        t('نوع تراکنش', 'Type'), t('وضعیت', 'Status'), t('ثبت‌کننده', 'Registrar'), t('دپارتمان', 'Department'),
        t('شرح سربرگ', 'Description'), t('بررسی‌کننده', 'Reviewed By'), t('تاریخ بررسی', 'Reviewed At'),
        t('تاییدکننده', 'Approved By'), t('تاریخ تایید', 'Approved At'),
        t('ردیف', 'Row'), t('حساب', 'Account'), t('نوع عملیات', 'Action'), t('گروه', 'Group'),
        t('نوع هزینه/درآمد', 'Cost/Income Type'), t('ارز', 'Currency'), t('مرکز هزینه/درآمد', 'Cost/Income Center'),
        t('واریز', 'Deposit'), t('برداشت', 'Withdrawal'), t('شرح قلم', 'Item Desc'),
      ];

      const rows = [];
      dataToExport.forEach(tx => {
        const txItems = tx.fm_transaction_items || [];
        const hdr = [
          tx.document_code || '', tx.reference_code || '', tx.daily_number || '',
          tx.document_date || '', formatDT(tx.created_at),
          TX_TYPE[tx.transaction_type] || tx.transaction_type || '',
          TX_STATUS[tx.status] || tx.status || '',
          usersMap[tx.registrar_id] || '',
          (Object.entries(deptsMap || {}).find(([, title]) => title === tx.department_id) || [])[1] || '',
          tx.description || '',
          tx.reviewed_by_name || '', formatDT(tx.reviewed_at),
          tx.approved_by_name || '', formatDT(tx.approved_at),
        ];

        if (txItems.length === 0) {
          rows.push([...hdr, '', '', '', '', '', '', '', '', '', '', '']);
        } else {
          txItems.forEach(item => {
            const acc = (lookups.accounts || []).find(a => String(a.id) === String(item.account_id));
            const costT = (lookups.costTypes || []).find(c => String(c.id) === String(item.cost_type_id));
            const incT = (lookups.incomeTypes || []).find(c => String(c.id) === String(item.income_type_id));
            const center = (lookups.costBenefitCenters || []).find(c => String(c.id) === String(item.center_id));
            const subType = item.transaction_group === 'COST'
              ? (costT ? pickLocalizedTitle(costT, isRtl) : '')
              : item.transaction_group === 'INCOME'
              ? (incT ? pickLocalizedTitle(incT, isRtl) : '')
              : '';
            rows.push([
              ...hdr,
              item.row_number || '',
              acc ? pickLocalizedTitle(acc, isRtl) : (item.account_id || ''),
              TX_ACTION[item.transaction_action] || item.transaction_action || '',
              TX_GROUP[item.transaction_group] || item.transaction_group || '',
              subType,
              item.currency || '',
              center ? pickLocalizedTitle(center, isRtl) : '',
              item.deposit_amount || '0',
              item.withdrawal_amount || '0',
              item.description || '',
            ]);
          });
        }
      });

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
      const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `transactions_full_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [dateLocale, filteredTransactions, isRtl, lookups.accounts, lookups.costBenefitCenters, lookups.costTypes, lookups.incomeTypes, showToast, t, usersMap, deptsMap]);

    const importErrorsModal = React.createElement(Modal, {
      isOpen: importErrors.isOpen,
      onClose: () => setImportErrors({ isOpen: false, errors: [] }),
      title: t('گزارش خطاهای ایمپورت', 'Import Error Report'),
      language: isRtl ? 'fa' : 'en',
      width: 'max-w-2xl'
    },
      React.createElement('div', { className: 'p-4 flex flex-col gap-3 max-h-[65vh] overflow-hidden' },
        React.createElement('div', { className: 'rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200' },
          t('قبل از ذخیره، موارد زیر باید اصلاح شوند و فایل دوباره آپلود شود.', 'Fix the items below before saving and upload the file again.')
        ),
        React.createElement('div', { className: 'flex-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3' },
          importErrors.errors.length > 0
            ? React.createElement('ul', { className: 'space-y-2 text-[12px] text-slate-700 dark:text-slate-300' },
                importErrors.errors.map((err, idx) => React.createElement('li', { key: idx, className: 'rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2 border border-slate-200 dark:border-slate-700' }, err))
              )
            : React.createElement('div', { className: 'text-[12px] text-slate-500' }, t('خطایی ثبت نشده است.', 'No errors recorded.'))
        )
      ),
      React.createElement('div', { className: 'p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end rounded-b-lg' },
        React.createElement(Button, { variant: 'outline', size: 'sm', onClick: () => setImportErrors({ isOpen: false, errors: [] }) }, t('بستن', 'Close'))
      )
    );

    return {
      handleDownloadSample,
      handleImportTransactions,
      onExport,
      importErrorsModal,
      setImportErrors,
    };
  };

  window.TransactionMainExcel = { useTransactionMainExcel };
})();