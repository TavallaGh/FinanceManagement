/* Filename: requests/RequestDetailsPersistence.js */
(() => {
  const React = window.React;
  const { useState, useRef, useEffect, useCallback } = React;

  const BALANCED_REQUEST_TYPES = ['TRANSFER'];

  const useRequestDetailsPersistence = (params) => {
    const {
      isOpen,
      formMode,
      initialRecord,
      supabase,
      isRtl,
      t,
      currentUserId,
      currentUserName,
      header,
      setHeader,
      items,
      setItems,
      isDirty,
      setIsDirty,
      setHasSaved,
      setIsLoading,
      setCopyWarning,
      showToast,
      setLookups,
      parseAmount,
      lookups,
      access,
      dataScope,
      readOnly = false,
    } = params;

    const [currencyRates, setCurrencyRates] = useState({});
    const initialized = useRef(false);
    const saving = useRef(false);

    const getRatesForDate = useCallback((dateRaw) =>
      window.RequestStatusActions.getRatesForDate(supabase, dateRaw), [supabase]);

    const validateTransferBalance = useCallback(async (itemsInput = items) => {
      try {
        await window.RequestStatusActions.validateBalance(supabase, header, itemsInput, t);
        return true;
      } catch (error) {
        showToast(error.message, 'error');
        return false;
      }
    }, [supabase, header, items, showToast, t]);

    useEffect(() => {
      let cancelled = false;

      const loadCurrencyRates = async () => {
        if (!BALANCED_REQUEST_TYPES.includes(header.request_type)) {
          if (!cancelled) setCurrencyRates({});
          return;
        }

        try {
          const ratesMap = await getRatesForDate(header.need_date || header.created_at || new Date().toISOString());
          if (!cancelled) setCurrencyRates(ratesMap);
        } catch (e) {
          console.error('RequestFormModal currency rates error:', e);
          if (!cancelled) setCurrencyRates({});
        }
      };

      loadCurrencyRates();
      return () => { cancelled = true; };
    }, [getRatesForDate, header.created_at, header.need_date, header.request_type]);

    const fetchDeps = useCallback(async () => {
      if (!supabase) return null;
      try {
        const [accRes, chartRes, costRes, incRes, usersRes, partiesRes, personnelRes, nodesRes, currRes, cbcRes] =
          await Promise.all([
            supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, chart_id').eq('is_active', true),
            supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
            supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('sec_users').select('id, full_name, username, party_id'),
            supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, mobile').eq('is_active', true),
            supabase.from('fm_org_chart_personnel').select('node_id, person_id'),
            supabase.from('fm_org_chart_nodes').select('id, title, parent_id'),
            supabase.from('fm_currencies').select('id, code, title, decimal_places'),
            supabase.from('fm_cost_benefit_centers').select('id, title_fa, title_en, center_kind, is_cost_center, is_benefit_center, is_active, manager:parties(id, first_name, last_name), office:fm_org_offices(id, title)'),
          ]);

        for (const result of [accRes, chartRes, costRes, incRes, usersRes, partiesRes, personnelRes, nodesRes, currRes, cbcRes]) {
          if (result.error) throw result.error;
        }
        const activeCharts = chartRes.data || [];
        const activeChartIds = new Set(activeCharts.map(c => c.id));

        const buildLeafs = (rows, charts = null) => {
          const parentIds = new Set(rows.map(i => i.parent_id).filter(Boolean));
          return rows.filter(i => {
            if (parentIds.has(i.id)) return false;
            if (charts && !activeChartIds.has(i.chart_id)) return false;
            return true;
          }).map(i => {
            const fa = i.title_fa || i.title;
            const en = i.title_en || i.title_fa || i.title;
            const pathArr = [isRtl ? fa : en];
            let curr = i;
            while (curr && curr.parent_id) {
              const par = rows.find(p => p.id === curr.parent_id);
              if (par) {
                pathArr.unshift(isRtl ? (par.title_fa || par.title) : (par.title_en || par.title_fa || par.title));
                curr = par;
              } else {
                break;
              }
            }
            return {
              ...i,
              displayLabel: isRtl ? fa : en,
              pathTitle: pathArr.join(' / '),
              chart_name: charts ? (activeCharts.find(c => c.id === i.chart_id)?.title || '') : '',
            };
          });
        };

        const usersMap = {};
        (usersRes.data || []).forEach(u => { usersMap[u.id] = u.full_name || u.username || ''; });

        const partiesMap = {};
        const partiesList = (partiesRes.data || []).map(p => {
          const name = p.party_type === 'legal'
            ? (p.company_name || '')
            : `${p.first_name || ''} ${p.last_name || ''}`.trim();
          partiesMap[p.id] = name;
          return {
            ...p,
            displayLabel: name,
          };
        });

        const nodesMap = {};
        (nodesRes.data || []).forEach(n => { nodesMap[n.id] = n.title; });

        let myDeptId = null;
        let myDeptTitle = '';
        let myPartyId = null;
        let myPartyName = '';
        const me = currentUserId ? (usersRes.data || []).find(u => u.id === currentUserId) : null;
        if (me?.party_id) {
          myPartyId = me.party_id;
          myPartyName = partiesMap[myPartyId] || '';
          const myPersonnel = (personnelRes.data || []).find(p => p.person_id === myPartyId);
          if (myPersonnel) {
            myDeptId = myPersonnel.node_id;
            myDeptTitle = nodesMap[myPersonnel.node_id] || '';
          }
        }

        const currencyCodeById = {};
        (currRes.data || []).forEach(row => {
          currencyCodeById[String(row.id)] = row.code || '';
        });

        const leafAccountsWithCurrency = buildLeafs(accRes.data || [], activeCharts).map(account => ({
          ...account,
          currency_code: currencyCodeById[String(account.currency_id)] || '',
        }));

        const lk = {
          leafAccounts: leafAccountsWithCurrency,
          allAccounts: accRes.data || [],
          costTypes: buildLeafs(costRes.data || []),
          incomeTypes: buildLeafs(incRes.data || []),
          costBenefitCenters: (cbcRes.data || []).map(r => ({
            id: r.id,
            titleFa: r.title_fa || '',
            titleEn: r.title_en || r.title_fa || '',
            centerKind: r.center_kind || '',
            isCostCenter: r.is_cost_center ?? false,
            isBenefitCenter: r.is_benefit_center ?? false,
            isActive: r.is_active ?? true,
            managerName: r.manager ? `${r.manager.first_name || ''} ${r.manager.last_name || ''}`.trim() : '',
            officeName: r.office?.title || '',
          })),
          currencies: currRes.data || [],
          usersMap,
          usersList: usersRes.data || [],
          partiesMap,
          partiesList,
          nodesMap,
          orgNodes: nodesRes.data || [],
          personnelRows: personnelRes.data || [],
          currentUserDeptId: myDeptId,
          currentUserDeptTitle: myDeptTitle,
          currentUserPartyId: myPartyId,
          currentUserPartyName: myPartyName,
        };

        setLookups(lk);
        return lk;
      } catch (e) {
        console.error('RequestFormModal deps error:', e);
        showToast(t('خطا در بارگذاری اطلاعات پایه', 'Error loading dependencies'), 'error');
        return null;
      }
    }, [supabase, isRtl, currentUserId, showToast, t, setLookups]);

    useEffect(() => {
      if (!isOpen) {
        initialized.current = false;
        setHasSaved(false);
        setCopyWarning(null);
        return;
      }
      if (initialized.current) return;
      initialized.current = true;

      fetchDeps().then(async (lk) => {
        if (!lk) return;

        const needNewCode = formMode === 'CREATE' || formMode === 'COPY';
        let code = '';
        if (needNewCode) {
          if (window.AutoNumberingService) {
            try {
              const preview = await window.AutoNumberingService.previewNext('REQUESTS');
              if (preview?.formattedCode) code = preview.formattedCode;
            } catch {}
          }
          if (!code) code = `REQ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        }

        setCopyWarning(null);

        if (formMode === 'CREATE') {
          setHeader({
            request_code: code,
            registrar_id: currentUserId,
            requester_party_id: lk.currentUserPartyId,
            requester_display: lk.currentUserPartyName || lk.usersMap[currentUserId] || currentUserName,
            department_id: lk.currentUserDeptId,
            department_title: lk.currentUserDeptTitle,
            created_at: new Date().toISOString(),
            need_date: '',
            request_type: 'GENERAL',
            payment_type: '',
            description: '',
            status: 'DRAFT',
          });
          setItems([]);
          setIsDirty(false);
          setHasSaved(false);
        } else if (formMode === 'COPY' && initialRecord) {
          setCopyWarning(t(
            `هشدار: این درخواست کپی از درخواست ${initialRecord.request_code} می‌باشد و نیازمند بررسی و تغییرات است.`,
            `Warning: This is a copy of request ${initialRecord.request_code} and requires review.`
          ));
          setHeader({
            ...initialRecord,
            transaction_id: null,
            transaction_assignee_user_id: null,
            transaction_assignee_group_id: null,
            id: undefined,
            request_code: code,
            status: 'DRAFT',
            registrar_id: currentUserId,
            requester_party_id: lk.currentUserPartyId,
            requester_display: lk.currentUserPartyName || lk.usersMap[currentUserId] || currentUserName,
            department_id: lk.currentUserDeptId,
            department_title: lk.currentUserDeptTitle,
            created_at: new Date().toISOString(),
            need_date: '',
            payment_type: initialRecord.payment_type || '',
            reviewer_id: null,
            reviewer_name: null,
            reviewed_at: null,
            approver_id: null,
            approver_name: null,
            approved_at: null,
          });
          const mapped = (initialRecord.req_request_items || []).map(item => ({
            ...item,
            _tempId: crypto.randomUUID(),
            id: undefined,
            request_id: undefined,
            account_id: undefined,
            deposit_amount: item.deposit_amount != null ? parseFloat(item.deposit_amount) : 0,
            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0,
            approved_amount: 0,
            remaining_amount: 0,
          })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
          setItems(mapped);
          setIsDirty(true);
          setHasSaved(false);
        } else if (formMode === 'EDIT' && initialRecord) {
          setHeader({
            ...initialRecord,
            department_title: initialRecord.department_id ? (lk.nodesMap[initialRecord.department_id] || '') : '',
            requester_display: initialRecord.requester_party_id
              ? (lk.partiesMap[initialRecord.requester_party_id] || '')
              : (initialRecord.registrar_id ? (lk.usersMap[initialRecord.registrar_id] || '') : ''),
          });
          const mapped = (initialRecord.req_request_items || []).map(item => ({
            ...item,
            _tempId: crypto.randomUUID(),
            account_id: undefined,
            deposit_amount: item.deposit_amount != null ? parseFloat(item.deposit_amount) : 0,
            withdrawal_amount: item.withdrawal_amount != null ? parseFloat(item.withdrawal_amount) : 0,
            approved_amount: item.approved_amount != null ? parseFloat(item.approved_amount) : 0,
            remaining_amount: item.remaining_amount != null ? parseFloat(item.remaining_amount) : 0,
          })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0));
          setItems(mapped);
          setIsDirty(false);
          setHasSaved(false);
        }
      });
    }, [isOpen, formMode, initialRecord, currentUserId, currentUserName, fetchDeps, parseAmount, setCopyWarning, setHasSaved, setHeader, setIsDirty, setItems, t]);

    const handleSave = useCallback(async (actionOrStatus, actionInput = {}) => {
      if (readOnly || saving.current) return false;
      const action = actionOrStatus && typeof actionOrStatus === 'object' ? actionOrStatus : null;
      const targetStatus = action?.to_status || (typeof actionOrStatus === 'string' ? actionOrStatus : header.status);
      if (targetStatus !== header.status) {
        if (!action || isDirty) {
          showToast(t('ابتدا تغییرات درخواست را ذخیره کنید.', 'Save request changes first.'), 'warning');
          return false;
        }
        saving.current = true;
        setIsLoading(true);
        try {
          const savedItems = await window.RequestStatusActions.changeStatus({
            supabase, header, action, access, dataScope, currentUserId,
            currentUserName: lookups.usersMap[currentUserId] || currentUserName,
            items, input: actionInput, accounts: lookups.leafAccounts, currencies: lookups.currencies, t,
          });
          setItems(savedItems.map(item => ({ ...item, _tempId: item._tempId || crypto.randomUUID() })));
          setHeader(previous => ({ ...previous, status: action.to_status,
            ...(action.data_entry_form === 'ACCOUNTS_AMOUNTS' ? {
              transaction_assignee_user_id: actionInput.assignee?.kind === 'USER' ? actionInput.assignee.id : null,
              transaction_assignee_group_id: actionInput.assignee?.kind === 'GROUP' ? actionInput.assignee.id : null,
            } : {}) }));
          setHasSaved(true);
          showToast(t('وضعیت درخواست تغییر کرد.', 'Request status updated.'));
          return true;
        } catch (error) {
          showToast(t('تغییر وضعیت انجام نشد: ', 'Status change failed: ') + error.message, 'error');
          return false;
        } finally {
          saving.current = false;
          setIsLoading(false);
        }
      }
      if (action || (header.id ? !access.canEdit || header.status !== 'DRAFT' : !access.canCreate)) {
        showToast(t('اجازه ذخیره این درخواست را ندارید.', 'You cannot save this request.'), 'error');
        return false;
      }
      const itemsForSave = items;
      if (document.getElementById('grid-inline-edit-marker')) {
        return showToast(t('لطفاً ابتدا سطر باز اقلام را با Enter ذخیره کنید.', 'Please save the open items row first.'), 'warning');
      }

      if (!header.description?.trim()) {
        return showToast(t('شرح درخواست الزامی است.', 'Request description is required.'), 'warning');
      }
      const needDate = window.RequestStatusActions.normalizeNeedDate(header.need_date);
      if (!needDate) {
        return showToast(t('تاریخ نیاز معتبر الزامی است.', 'A valid need date is required.'), 'warning');
      }

      saving.current = true;
      setIsLoading(true);
      try {
        const now = new Date().toISOString();

        if (header.request_type === 'EXCHANGE') {
          window.RequestExchangeLogic.validate(itemsForSave, t, { accounts: lookups.leafAccounts });
          const schemaCheck = await supabase.from('req_request_items')
            .select('destination_account_id, destination_currency, exchange_rate').limit(0);
          if (schemaCheck.error) throw schemaCheck.error;
        }

        if (!(await validateTransferBalance(itemsForSave))) {
          return;
        }

        const payload = {
          request_code: header.request_code,
          registrar_id: header.registrar_id || currentUserId || null,
          requester_party_id: header.requester_party_id || null,
          department_id: header.department_id || null,
          need_date: needDate,
          request_type: header.request_type || 'GENERAL',
          payment_type: header.payment_type || null,
          description: header.description || '',
          status: 'DRAFT',
        };

        let reqId = header.id;
        if (!reqId) {
          payload.created_at = now;
          const { data, error } = await supabase.from('req_requests').insert([payload]).select('id');
          if (error) throw error;
          reqId = data[0].id;
          setHeader(p => ({ ...p, id: reqId }));
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('REQUESTS'); } catch {}
          }
        } else {
          const { data, error } = await supabase.from('req_requests').update(payload)
            .eq('id', reqId).eq('status', 'DRAFT').select('id');
          if (error) throw error;
          if (data?.length !== 1) throw new Error(t('درخواست تغییر کرده یا دسترسی ندارید.', 'Request changed or access denied.'));
        }

        if (isDirty || !header.id) {
          const { error: deleteError } = await supabase.from('req_request_items').delete().eq('request_id', reqId);
          if (deleteError) throw deleteError;
          if (itemsForSave.length > 0) {
            const itemsPayload = itemsForSave.map((item, idx) => ({
              request_id: reqId,
              row_number: idx + 1,
              currency: item.currency || null,
              transaction_action: item.transaction_action || 'DEPOSIT',
              transaction_group: item.transaction_group || null,
              cost_type_id: item.cost_type_id || null,
              income_type_id: item.income_type_id || null,
              party_id: item.party_id || null,
              center_id: item.center_id || null,
              project_id: item.project_id || null, // Preserve legacy values when items are reinserted.
              deposit_amount: parseAmount(item.deposit_amount),
              withdrawal_amount: parseAmount(item.withdrawal_amount),
              approved_amount: parseAmount(item.approved_amount),
              remaining_amount: parseAmount(item.remaining_amount),
              related_account_id: item.related_account_id || item.account_id || null,
              ...(header.request_type === 'EXCHANGE' ? {
                destination_account_id: item.destination_account_id || null,
                destination_currency: item.destination_currency || null,
                exchange_rate: window.RequestExchangeLogic.hasValue(item.exchange_rate) ? Number(item.exchange_rate) : null,
              } : {}),
              description: item.description || null,
            }));
            const { data: savedItems, error: iErr } = await supabase.from('req_request_items').insert(itemsPayload).select();
            if (iErr) throw iErr;
            setItems((savedItems || []).map(i => ({
              ...i,
              _tempId: crypto.randomUUID(),
              deposit_amount: parseFloat(i.deposit_amount) || 0,
              withdrawal_amount: parseFloat(i.withdrawal_amount) || 0,
              approved_amount: parseFloat(i.approved_amount) || 0,
              remaining_amount: parseFloat(i.remaining_amount) || 0,
            })).sort((a, b) => (a.row_number || 0) - (b.row_number || 0)));
          }
        }

        setIsDirty(false);
        setHasSaved(true);
        showToast(t('درخواست با موفقیت ذخیره شد.', 'Request saved successfully.'));
        return true;
      } catch (err) {
        console.error('RequestFormModal save error:', err?.message || err, '| code:', err?.code, '| details:', err?.details, '| hint:', err?.hint);
        showToast(t('خطا در ذخیره درخواست.', 'Error saving request.'), 'error');
      } finally {
        saving.current = false;
        setIsLoading(false);
      }
    }, [
      readOnly,
      access,
      dataScope,
      currentUserId,
      currentUserName,
      header,
      isDirty,
      items,
      lookups,
      parseAmount,
      setHeader,
      setIsDirty,
      setItems,
      setHasSaved,
      showToast,
      supabase,
      t,
      validateTransferBalance,
    ]);

    return {
      currencyRates,
      handleSave,
    };
  };

  window.useRequestDetailsPersistence = useRequestDetailsPersistence;
})();
