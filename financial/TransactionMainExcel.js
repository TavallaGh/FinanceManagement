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
      getLabels.forEach(getLabel => {
        const label = normalizeImportToken(getLabel(item));
        if (!label) return;
        const list = map.get(label) || [];
        list.push(item);
        map.set(label, list);
      });
    });
    return map;
  };

  const getSingleMatch = (collection, rawValue) => {
    const normalized = normalizeImportToken(rawValue);
    if (!normalized) return { id: null, item: null, label: '' };
    const matches = collection.get(normalized) || [];
    if (matches.length === 1) {
      const item = matches[0];
      return { id: item.id ?? item.value ?? null, item, label: pickLocalizedTitle(item, true) || String(rawValue) };
    }
    if (matches.length === 0) return { error: String(rawValue) };
    return { error: String(rawValue), ambiguous: true };
  };

  const resolveRates = (ratesMap, currency) => {
    let toUsd = 1;
    if (currency !== 'USD') {
      const direct = ratesMap[`${currency}_USD`];
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

    const lookupByTitle = useMemo(() => ({
      accounts: buildIndexedLookup(lookups.accounts || [], [
        item => item.displayLabel,
        item => item.titleFa || item.title_fa,
        item => item.titleEn || item.title_en,
        item => item.pathTitle,
        item => item.code,
      ]),
      costTypes: buildIndexedLookup(lookups.costTypes || [], [
        item => item.displayLabel,
        item => item.titleFa || item.title_fa,
        item => item.titleEn || item.title_en,
        item => item.pathTitle,
        item => item.code,
      ]),
      incomeTypes: buildIndexedLookup(lookups.incomeTypes || [], [
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
        item => item.pathTitle,
        item => item.code,
      ]),
      departments: buildIndexedLookup(
        Object.entries(deptsMap || {}).map(([id, title]) => ({ id, title })),
        [item => item.title]
      ),
    }), [deptsMap, lookups.accounts, lookups.costTypes, lookups.costBenefitCenters, lookups.incomeTypes]);

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
        t('کلید سند', 'Document Key'),
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
        t('نرخ USD', 'Exchange Rate to USD'),
        t('نرخ IRR', 'Exchange Rate to IRR'),
      ];

      const sampleRows = isRtl ? [
        ['DOC-001', '', '2026-08-01', 'عمومی', 'یادداشت', firstDeptTitle, 'نمونه سند هزینه', 1, pickLocalizedTitle(firstAccount, isRtl) || 'صندوق', 'واریز', 'هزینه', pickLocalizedTitle(firstCostType, isRtl) || 'هزینه اداری', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', 1000000, '', 'پرداخت هزینه نمونه', '', ''],
        ['DOC-001', '', '2026-08-01', 'عمومی', 'یادداشت', firstDeptTitle, 'نمونه سند هزینه', 2, pickLocalizedTitle(firstAccount, isRtl) || 'بانک', 'برداشت', 'هزینه', pickLocalizedTitle(firstCostType, isRtl) || 'هزینه اداری', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', '', 1000000, 'ردیف دوم', '', ''],
        ['DOC-002', '', '2026-08-02', 'انتقال', 'موقت', firstDeptTitle, 'نمونه سند انتقال', 1, pickLocalizedTitle(firstAccount, isRtl) || 'صندوق', 'واریز', 'بالانس', '', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', 500000, '', 'ردیف انتقال', '', ''],
      ] : [
        ['DOC-001', '', '2026-08-01', 'General', 'Draft', firstDeptTitle, 'Sample cost document', 1, pickLocalizedTitle(firstAccount, isRtl) || 'Cash', 'Deposit', 'Cost', pickLocalizedTitle(firstCostType, isRtl) || 'Administrative Expense', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', 1000000, '', 'Sample item', '', ''],
        ['DOC-001', '', '2026-08-01', 'General', 'Draft', firstDeptTitle, 'Sample cost document', 2, pickLocalizedTitle(firstAccount, isRtl) || 'Bank', 'Withdrawal', 'Cost', pickLocalizedTitle(firstCostType, isRtl) || 'Administrative Expense', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', '', 1000000, 'Second row', '', ''],
        ['DOC-002', '', '2026-08-02', 'Transfer', 'Temporary', firstDeptTitle, 'Sample transfer document', 1, pickLocalizedTitle(firstAccount, isRtl) || 'Cash', 'Deposit', 'Balance', '', '', pickLocalizedTitle(firstCenter, isRtl), 'IRR', 500000, '', 'Transfer row', '', ''],
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
            documentKey: String(cols[0] ?? '').trim(),
            documentCode: String(cols[1] ?? '').trim(),
            documentDate: String(cols[2] ?? '').trim(),
            transactionType: String(cols[3] ?? '').trim(),
            status: String(cols[4] ?? '').trim(),
            departmentTitle: String(cols[5] ?? '').trim(),
            description: String(cols[6] ?? '').trim(),
            rowNumber: String(cols[7] ?? '').trim(),
            accountTitle: String(cols[8] ?? '').trim(),
            transactionAction: String(cols[9] ?? '').trim(),
            transactionGroup: String(cols[10] ?? '').trim(),
            costTypeTitle: String(cols[11] ?? '').trim(),
            incomeTypeTitle: String(cols[12] ?? '').trim(),
            centerTitle: String(cols[13] ?? '').trim(),
            currencyCode: String(cols[14] ?? '').trim().toUpperCase(),
            depositAmount: String(cols[15] ?? '').trim(),
            withdrawalAmount: String(cols[16] ?? '').trim(),
            itemDescription: String(cols[17] ?? '').trim(),
            exchangeRateToUsd: String(cols[18] ?? '').trim(),
            exchangeRateUsdToIrr: String(cols[19] ?? '').trim(),
          })).filter(row => Object.values(row).some(value => String(value ?? '').trim() !== ''));

          if (rows.length === 0) {
            showToast(t('هیچ داده‌ای برای ورود وجود ندارد.', 'No data to import.'), 'warning');
            return;
          }

          const docGroups = new Map();
          const errors = [];
          rows.forEach(row => {
            const groupKey = normalizeImportToken(row.documentKey || row.documentCode);
            if (!groupKey) {
              errors.push(`${t('ردیف', 'Row')} ${row.sheetRow}: ${t('کلید سند یا کد سند الزامی است.', 'Document Key or Document Code is required.')}`);
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

          const rateCache = {};
          const getRatesForDate = async (dateValue) => {
            const normalizedDate = String(dateValue || '').replace(/\//g, '-').substring(0, 10);
            if (!normalizedDate) return {};
            if (rateCache[normalizedDate]) return rateCache[normalizedDate];
            const { data } = await supabase
              .from('fm_currency_rates')
              .select('base_currency, target_currency, rate, rate_date, created_at')
              .lte('rate_date', normalizedDate)
              .order('rate_date', { ascending: false });
            const sorted = (data || []).slice().sort((a, b) => {
              if (a.rate_date > b.rate_date) return -1;
              if (a.rate_date < b.rate_date) return 1;
              return (a.created_at || '') > (b.created_at || '') ? -1 : 1;
            });
            const latest = {};
            sorted.forEach(r => {
              const key = `${r.base_currency}_${r.target_currency}`;
              if (!latest[key]) latest[key] = r.rate;
            });
            rateCache[normalizedDate] = latest;
            return latest;
          };

          const docsToSave = [];
          for (const [groupKey, groupRows] of docGroups.entries()) {
            const masterRow = groupRows[0];
            const docTypeRaw = normalizeImportToken(masterRow.transactionType);
            const docStatusRaw = normalizeImportToken(masterRow.status);
            const docType = docTypeRaw ? enumAliases.transactionType.get(docTypeRaw) || null : 'GENERAL';
            const docStatus = docStatusRaw ? enumAliases.status.get(docStatusRaw) || null : 'DRAFT';
            const docDepartment = masterRow.departmentTitle ? getSingleMatch(lookupByTitle.departments, masterRow.departmentTitle) : { id: null };
            const masterErrors = [];

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
                ['description', t('شرح سند', 'Document description')],
                ['documentCode', t('کد سند', 'Document code')],
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
                rowErrors.push(`${rowLabel}: ${t('فقط یکی از مبلغ واریز یا برداشت باید بزرگتر از صفر باشد.', 'Exactly one of deposit or withdrawal must be greater than zero.')}`);
              }

              const accountMatch = getSingleMatch(lookupByTitle.accounts, row.accountTitle);
              if (accountMatch.error) {
                rowErrors.push(`${rowLabel}: ${t('حساب', 'Account')} «${row.accountTitle}» ${accountMatch.ambiguous ? t('مبهم است', 'is ambiguous') : t('یافت نشد', 'was not found')}`);
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
                rowErrors.push(`${rowLabel}: ${t('نوع هزینه', 'Cost type')} «${row.costTypeTitle}» ${costMatch.ambiguous ? t('مبهم است', 'is ambiguous') : t('یافت نشد', 'was not found')}`);
              }
              if (row.incomeTypeTitle && incomeMatch.error) {
                rowErrors.push(`${rowLabel}: ${t('نوع درآمد', 'Income type')} «${row.incomeTypeTitle}» ${incomeMatch.ambiguous ? t('مبهم است', 'is ambiguous') : t('یافت نشد', 'was not found')}`);
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

              const rateToUsdRaw = parseFloat(String(row.exchangeRateToUsd || '').replace(/,/g, ''));
              const rateUsdToIrrRaw = parseFloat(String(row.exchangeRateUsdToIrr || '').replace(/,/g, ''));
              if (row.exchangeRateToUsd && (!rateToUsdRaw || rateToUsdRaw <= 0)) {
                rowErrors.push(`${rowLabel}: ${t('نرخ تبدیل به دلار نامعتبر است.', 'Exchange rate to USD is invalid.')}`);
              }
              if (row.exchangeRateUsdToIrr && (!rateUsdToIrrRaw || rateUsdToIrrRaw <= 0)) {
                rowErrors.push(`${rowLabel}: ${t('نرخ تبدیل به ریال نامعتبر است.', 'Exchange rate to IRR is invalid.')}`);
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
                  rate_to_usd: !isNaN(rateToUsdRaw) && rateToUsdRaw > 0 ? rateToUsdRaw : null,
                  rate_usd_to_irr: !isNaN(rateUsdToIrrRaw) && rateUsdToIrrRaw > 0 ? rateUsdToIrrRaw : null,
                });
              }

              rowErrors.forEach(msg => masterErrors.push(msg));
            }

            const ratesMap = await getRatesForDate(masterRow.documentDate);
            let totalDepositUsd = 0;
            let totalWithdrawalUsd = 0;
            const finalItems = mappedItems.map(item => {
              const rates = resolveRates(ratesMap, item.currency || 'IRR');
              const toUsd = item.rate_to_usd || rates.toUsd || 1;
              const usdToIrr = item.rate_usd_to_irr || rates.usdToIrr || 1;
              const amount = item.deposit_amount > 0 ? item.deposit_amount : item.withdrawal_amount;
              const amountUsd = amount * toUsd;
              const amountIrr = amountUsd * usdToIrr;
              if (item.transaction_action === 'DEPOSIT') totalDepositUsd += amountUsd;
              else totalWithdrawalUsd += amountUsd;
              return { ...item, exchange_rate_to_usd: toUsd, exchange_rate_usd_to_irr: usdToIrr, amount_usd: amountUsd, amount_irr: amountIrr };
            });

            if ((docType || normalizeImportToken(masterRow.transactionType) === 'transfer') && Math.abs(totalDepositUsd - totalWithdrawalUsd) > 0.0001) {
              masterErrors.push(t('سند انتقال باید از نظر ارزی متعادل باشد.', 'Transfer transactions must be balanced.'));
            }

            if (masterErrors.length > 0 || finalItems.length === 0) {
              const docLabel = masterRow.documentCode || masterRow.documentKey || groupKey;
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
            let documentCode = doc.masterRow.documentCode || '';
            if (!documentCode) {
              if (window.AutoNumberingService) {
                try {
                  const preview = await window.AutoNumberingService.previewNext('TRANSACTIONS');
                  documentCode = preview && preview.formattedCode ? preview.formattedCode : (typeof preview === 'string' ? preview : '');
                } catch (err) {
                  console.error('AutoNumbering preview error:', err);
                }
              }
              if (!documentCode) {
                documentCode = `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
              }
            }

            const txPayload = {
              document_code: documentCode,
              document_date: doc.masterRow.documentDate.replace(/\//g, '-'),
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
              exchange_rate_to_usd: item.exchange_rate_to_usd,
              exchange_rate_usd_to_irr: item.exchange_rate_usd_to_irr,
              amount_usd: item.amount_usd,
              amount_irr: item.amount_irr,
              description: item.description || null,
            }));
            const { error: itemError } = await supabase.from('fm_transaction_items').insert(itemsPayload);
            if (itemError) throw itemError;

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
        t('جمع واریز (USD)', 'Total Deposit (USD)'), t('جمع برداشت (USD)', 'Total Withdrawal (USD)'),
        t('جمع واریز (IRR)', 'Total Deposit (IRR)'), t('جمع برداشت (IRR)', 'Total Withdrawal (IRR)'),
        t('ردیف', 'Row'), t('حساب', 'Account'), t('نوع عملیات', 'Action'), t('گروه', 'Group'),
        t('نوع هزینه/درآمد', 'Cost/Income Type'), t('ارز', 'Currency'), t('مرکز هزینه/درآمد', 'Cost/Income Center'),
        t('واریز', 'Deposit'), t('برداشت', 'Withdrawal'), t('معادل دلار', 'Amount USD'), t('معادل ریال', 'Amount IRR'), t('شرح قلم', 'Item Desc'),
      ];

      const rows = [];
      dataToExport.forEach(tx => {
        const txItems = tx.fm_transaction_items || [];
        let txDepUsd = 0, txWidUsd = 0, txDepIrr = 0, txWidIrr = 0;
        txItems.forEach(item => {
          const usd = parseFloat(item.amount_usd || 0);
          const irr = parseFloat(item.amount_irr || 0);
          if (item.transaction_action === 'DEPOSIT') { txDepUsd += usd; txDepIrr += irr; }
          else { txWidUsd += usd; txWidIrr += irr; }
        });

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
          txDepUsd > 0 ? txDepUsd.toFixed(2) : '', txWidUsd > 0 ? txWidUsd.toFixed(2) : '',
          txDepIrr > 0 ? txDepIrr.toFixed(0) : '', txWidIrr > 0 ? txWidIrr.toFixed(0) : '',
        ];

        if (txItems.length === 0) {
          rows.push([...hdr, '', '', '', '', '', '', '', '', '', '', '', '']);
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
              item.amount_usd || '0',
              item.amount_irr || '0',
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