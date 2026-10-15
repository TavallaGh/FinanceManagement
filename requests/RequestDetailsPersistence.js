/* Filename: requests/RequestDetailsPersistence.js */
(() => {
  const React = window.React;
  const { useState, useRef, useEffect, useCallback } = React;

  const BALANCED_REQUEST_TYPES = ['TRANSFER', 'EXCHANGE'];

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
      resolveNextAssignees,
      resolveDataEntryFormsForStatus,
      selectedMachineMeta,
      parseAmount,
      resolveRates,
      isMissingWorkItemsTableError,
      getStatus,
      lookups,
      sendWorkflowAssignmentNotifications,
    } = params;

    const [currencyRates, setCurrencyRates] = useState({});
    const initialized = useRef(false);

    const getRatesForDate = useCallback(async (dateRaw) => {
      const dateKey = (dateRaw || new Date().toISOString()).replace(/\//g, '-').split('T')[0];
      const { data, error } = await supabase
        .from('fm_currency_rates')
        .select('base_currency, target_currency, rate, rate_date')
        .lte('rate_date', dateKey)
        .order('rate_date', { ascending: false });

      if (error) throw error;

      const latest = {};
      (data || []).forEach(rate => {
        const key = `${rate.base_currency}_${rate.target_currency}`;
        if (!latest[key]) latest[key] = rate.rate;
      });

      return latest;
    }, [supabase]);

    const validateTransferBalance = useCallback(async (itemsInput = items) => {
      if (!BALANCED_REQUEST_TYPES.includes(header.request_type) || !itemsInput.length) return true;

      const ratesMap = await getRatesForDate(header.need_date || header.created_at || new Date().toISOString());
      let diffUsd = 0;

      itemsInput.forEach(item => {
        const dep = parseAmount(item.deposit_amount);
        const wid = parseAmount(item.withdrawal_amount);
        const cur = item.currency || 'IRR';
        const { toUsd } = resolveRates(ratesMap, cur);
        diffUsd += (dep - wid) * toUsd;
      });

      const tolerance = 0.01;
      if (Math.abs(diffUsd) > tolerance) {
        showToast(
          t(
            `بالانس درخواست صحیح نیست. اختلاف معادل دلار: ${diffUsd.toFixed(2)}`,
            `Request balance mismatch. USD difference: ${diffUsd.toFixed(2)}`
          ),
          'error'
        );
        return false;
      }

      return true;
    }, [getRatesForDate, header.created_at, header.need_date, header.request_type, items, parseAmount, resolveRates, showToast, t]);

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
        const [accRes, chartRes, costRes, incRes, usersRes, partiesRes, personnelRes, nodesRes, rolesRes, currRes, cbcRes, projectsRes] =
          await Promise.all([
            supabase.from('fm_coa_accounts').select('id, title_fa, title_en, code, currency_id, parent_id, chart_id').eq('is_active', true),
            supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
            supabase.from('fm_cost_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('fm_income_types').select('id, title_fa, title_en, code, parent_id').eq('is_active', true),
            supabase.from('sec_users').select('id, full_name, username, party_id'),
            supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, mobile').eq('is_active', true),
            supabase.from('fm_org_chart_personnel').select('node_id, person_id'),
            supabase.from('fm_org_chart_nodes').select('id, title, parent_id'),
            supabase.from('sec_roles').select('id, title, code').eq('is_active', true),
            supabase.from('fm_currencies').select('id, code, title'),
            supabase.from('fm_cost_benefit_centers').select('id, title_fa, title_en, center_kind, is_cost_center, is_benefit_center, is_active, manager:parties(id, first_name, last_name), office:fm_org_offices(id, title)'),
            supabase.from('gen_projects').select('id, code, title, status, manager_party_id').eq('is_active', true).order('code'),
          ]);

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

        const rolesMap = {};
        (rolesRes.data || []).forEach(r => { rolesMap[r.id] = r.title || r.code || ''; });

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
          rolesMap,
          currentUserDeptId: myDeptId,
          currentUserDeptTitle: myDeptTitle,
          currentUserPartyId: myPartyId,
          currentUserPartyName: myPartyName,
          projects: (projectsRes.data || []).map(p => ({
            id: p.id,
            code: p.code || '',
            title: p.title || '',
            status: p.status || '',
            managerName: partiesMap[p.manager_party_id] || '',
            displayLabel: p.title || '',
          })),
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

    const getPermissionValue = useCallback((field, sourceItems = items, sourceHeader = header) => {
      if (field.startsWith('items.')) {
        const itemField = field.slice(6);
        if (itemField === 'amount') return sourceItems.some(item => parseAmount(item.deposit_amount) > 0 || parseAmount(item.withdrawal_amount) > 0);
        return sourceItems.length > 0 && sourceItems.every(item => item[itemField] !== null && item[itemField] !== undefined && String(item[itemField]).trim() !== '');
      }
      const value = sourceHeader[field];
      return value !== null && value !== undefined && String(value).trim() !== '';
    }, [header, items, parseAmount]);

    const toUuidOrNull = useCallback((value) => {
      const v = String(value || '').trim();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : null;
    }, []);

    const handleSave = useCallback(async (actionOrStatus, actionInput = {}) => {
      const selectedAction = actionOrStatus && typeof actionOrStatus === 'object' ? actionOrStatus : null;
      const statusToSave = selectedAction?.to_status || (typeof actionOrStatus === 'string' ? actionOrStatus : header.status);
      const overrideItems = Array.isArray(actionInput?.overrideItems) ? actionInput.overrideItems : null;
      const itemsForSave = overrideItems || items;

      if (selectedAction) {
        const missingField = Object.entries(selectedAction.field_permissions || {})
          .find(([field, permission]) => permission === 'REQUIRED' && !getPermissionValue(field, itemsForSave, header));
        if (missingField) {
          const labels = {
            need_date: t('تاریخ نیاز', 'Need Date'), request_type: t('نوع درخواست', 'Request Type'),
            payment_type: t('نوع پرداخت', 'Payment Type'), description: t('شرح درخواست', 'Description'),
            'items.description': t('شرح اقلام', 'Item Description'), 'items.amount': t('مبلغ اقلام', 'Item Amount'),
            'items.approved_amount': t('مبلغ تاییدشده', 'Approved Amount'),
          };
          const fieldLabel = labels[missingField[0]] || missingField[0];
          return showToast(t(`پر کردن فیلد ${fieldLabel} برای این عملیات الزامی است.`, `${fieldLabel} is required for this action.`), 'error');
        }
      }

      if (document.getElementById('grid-inline-edit-marker')) {
        return showToast(t('لطفاً ابتدا سطر باز اقلام را با Enter ذخیره کنید.', 'Please save the open items row first.'), 'warning');
      }

      if (!selectedAction && !header.description?.trim()) {
        return showToast(t('شرح درخواست الزامی است.', 'Request description is required.'), 'warning');
      }

      setIsLoading(true);
      try {
        const now = new Date().toISOString();
        const fromStatus = header.status || 'DRAFT';

        if (!(await validateTransferBalance(itemsForSave))) {
          return;
        }

        const payload = {
          request_code: header.request_code,
          registrar_id: header.registrar_id || currentUserId || null,
          requester_party_id: header.requester_party_id || null,
          department_id: header.department_id || null,
          need_date: header.need_date || null,
          request_type: header.request_type || 'GENERAL',
          payment_type: header.payment_type || null,
          description: header.description || '',
          status: statusToSave,
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
          const { error } = await supabase.from('req_requests').update(payload).eq('id', reqId);
          if (error) throw error;
        }

        if (isDirty || !header.id || !!overrideItems) {
          await supabase.from('req_request_items').delete().eq('request_id', reqId);
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
              project_id: item.project_id || null,
              deposit_amount: parseAmount(item.deposit_amount),
              withdrawal_amount: parseAmount(item.withdrawal_amount),
              approved_amount: parseAmount(item.approved_amount),
              remaining_amount: parseAmount(item.remaining_amount),
              related_account_id: item.related_account_id || item.account_id || null,
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

        const statusChanged = String(fromStatus || '') !== String(statusToSave || '');
        if (statusChanged && reqId) {
          const actorName = lookups.usersMap?.[currentUserId] || currentUserName || '';
          const nextAssigneeResult = await resolveNextAssignees(statusToSave);
          const nextAssignee = nextAssigneeResult.labels.length
            ? nextAssigneeResult.labels.join(' | ')
            : '-';
          const actorUserId = toUuidOrNull(currentUserId);
          const statusLogDescription = (actionInput?.approver_note || '').trim() || null;
          const logPayload = {
            request_id: reqId,
            from_status: fromStatus,
            to_status: statusToSave,
            actor_user_id: actorUserId,
            actor_name: actorName || 'Unknown',
            next_assignee: nextAssignee,
            description: statusLogDescription,
            metadata: {
              actor_user_id_raw: currentUserId || null,
              action_id: selectedAction?.id || null,
              action_label_fa: selectedAction?.action_label_fa || null,
              action_label_en: selectedAction?.action_label_en || null,
              data_entry_form: selectedAction?.data_entry_form || null,
              approver_note: statusLogDescription,
              workflow_source: selectedAction?.workflow_source || 'VISUAL',
            },
          };

          const { error: logError } = await supabase.from('req_request_status_logs').insert([logPayload]);
          if (logError) {
            console.error('Request status log insert error:', logError);
            showToast(
              t(
                `ثبت لاگ تغییر وضعیت انجام نشد: ${logError.message || 'خطای نامشخص'}`,
                `Status log was not saved: ${logError.message || 'Unknown error'}`
              ),
              'warning'
            );
          }

          try {
            const closePayload = {
              is_closed: true,
              closed_at: now,
              closed_by_user_id: actorUserId,
              close_action: selectedAction?.id || statusToSave,
              close_note: statusLogDescription,
              current_status: statusToSave,
            };

            const { error: closeWorkItemsError } = await supabase
              .from('wf_work_items')
              .update(closePayload)
              .eq('source_type', 'STATE_MACHINE')
              .eq('entity_type', 'req_requests')
              .eq('entity_id', String(reqId))
              .eq('is_closed', false);
            if (closeWorkItemsError && !isMissingWorkItemsTableError(closeWorkItemsError)) throw closeWorkItemsError;

            const recipients = (nextAssigneeResult.users || []).map(item => ({
              userId: String(item.userId || '').trim(),
              label: String(item.label || '').trim(),
            })).filter(item => item.userId);

            const roleRecipients = (nextAssigneeResult.roles || []).map(item => ({
              roleId: String(item.roleId || '').trim(),
              label: String(item.label || '').trim(),
            })).filter(item => item.roleId);

            console.log('WF_WORK_ITEMS_DEBUG assignees', {
              request_id: String(reqId),
              from_status: fromStatus,
              to_status: statusToSave,
              users_count: recipients.length,
              roles_count: roleRecipients.length,
              machine_id: selectedMachineMeta?.id || null,
              machine_code: selectedMachineMeta?.machine_code || null,
            });

            const machineUuid = toUuidOrNull(selectedMachineMeta?.id);

            if (recipients.length > 0) {
              const requestCaption = `${header.request_code || ''}${header.description ? ` | ${header.description}` : ''}`.trim() || String(reqId);
              const nextDataEntryForms = resolveDataEntryFormsForStatus(statusToSave);
              const insertRows = recipients.map(recipient => ({
                source_type: 'STATE_MACHINE',
                source_ref_schema: 'public',
                source_ref_table: 'wf_state_machines',
                source_ref_id: selectedMachineMeta?.id ? String(selectedMachineMeta.id) : null,
                state_machine_id: machineUuid,
                entity_code: 'REQ_REQUESTS',
                entity_type: 'req_requests',
                entity_id: String(reqId),
                record_code: header.request_code || null,
                record_title: requestCaption,
                form_component: 'RequestManagement',
                data_entry_forms: nextDataEntryForms,
                from_status: fromStatus,
                to_status: statusToSave,
                current_status: statusToSave,
                assigned_to_user_id: toUuidOrNull(recipient.userId),
                assigned_to_label: recipient.label || null,
                assigned_by_user_id: actorUserId,
                assigned_at: now,
                priority: 2,
                metadata: {
                  machine_code: selectedMachineMeta?.machine_code || null,
                  machine_id: selectedMachineMeta?.id || null,
                  assigned_to_user_raw: recipient.userId || null,
                  action_id: selectedAction?.id || null,
                  action_label_fa: selectedAction?.action_label_fa || null,
                  action_label_en: selectedAction?.action_label_en || null,
                  workflow_source: selectedAction?.workflow_source || 'VISUAL',
                },
              }));

              const { error: insertWorkItemsError } = await supabase.from('wf_work_items').insert(insertRows);
              if (!insertWorkItemsError) {
                console.log('WF_WORK_ITEMS_DEBUG inserted user rows', insertRows.length);
              }
              if (insertWorkItemsError && !isMissingWorkItemsTableError(insertWorkItemsError)) throw insertWorkItemsError;
            } else if (roleRecipients.length > 0) {
              const requestCaption = `${header.request_code || ''}${header.description ? ` | ${header.description}` : ''}`.trim() || String(reqId);
              const nextDataEntryForms = resolveDataEntryFormsForStatus(statusToSave);
              const insertRows = roleRecipients.map(recipient => ({
                source_type: 'STATE_MACHINE',
                source_ref_schema: 'public',
                source_ref_table: 'wf_state_machines',
                source_ref_id: selectedMachineMeta?.id ? String(selectedMachineMeta.id) : null,
                state_machine_id: machineUuid,
                entity_code: 'REQ_REQUESTS',
                entity_type: 'req_requests',
                entity_id: String(reqId),
                record_code: header.request_code || null,
                record_title: requestCaption,
                form_component: 'RequestManagement',
                data_entry_forms: nextDataEntryForms,
                from_status: fromStatus,
                to_status: statusToSave,
                current_status: statusToSave,
                assigned_to_role_id: toUuidOrNull(recipient.roleId),
                assigned_to_label: recipient.label || null,
                assigned_by_user_id: actorUserId,
                assigned_at: now,
                priority: 2,
                metadata: {
                  machine_code: selectedMachineMeta?.machine_code || null,
                  machine_id: selectedMachineMeta?.id || null,
                  assigned_to_role_raw: recipient.roleId || null,
                  action_id: selectedAction?.id || null,
                  action_label_fa: selectedAction?.action_label_fa || null,
                  action_label_en: selectedAction?.action_label_en || null,
                  workflow_source: selectedAction?.workflow_source || 'VISUAL',
                },
              }));

              if (insertRows.length > 0) {
                const { error: insertRoleWorkItemsError } = await supabase.from('wf_work_items').insert(insertRows);
                if (!insertRoleWorkItemsError) {
                  console.log('WF_WORK_ITEMS_DEBUG inserted role rows', insertRows.length);
                }
                if (insertRoleWorkItemsError && !isMissingWorkItemsTableError(insertRoleWorkItemsError)) throw insertRoleWorkItemsError;
              }
            } else {
              showToast(
                t('برای وضعیت بعدی، انجام‌دهنده‌ای از روال تاییدات پیدا نشد؛ آیتمی در کارتابل ایجاد نشد.', 'No assignee was resolved for the next status, so no cartable item was created.'),
                'warning'
              );
            }
          } catch (workItemError) {
            console.error('Request state-machine work-item sync error:', workItemError);
            showToast(
              t('تغییر وضعیت انجام شد اما ثبت آیتم کارتابل با خطا مواجه شد.', 'Status changed but syncing cartable work items failed.'),
              'warning'
            );
          }

          try {
            const recipients = (nextAssigneeResult.users || []).map(item => ({
              userId: item.userId,
              label: item.label,
            }));
            const statusInfo = getStatus(statusToSave);
            const fromStatusInfo = getStatus(fromStatus);
            const requestCaption = `${header.request_code || ''}${header.description ? ` | ${header.description}` : ''}`.trim() || String(reqId);
            const noteTextFa = statusLogDescription ? `\nتوضیحات: ${statusLogDescription}` : '';
            const noteTextEn = statusLogDescription ? `\nNote: ${statusLogDescription}` : '';

            await sendWorkflowAssignmentNotifications({
              supabase,
              recipients,
              actorUserId: currentUserId,
              titleFa: 'ارجاع مرحله تایید',
              titleEn: 'Approval Assignment',
              messageFa: `درخواست ${requestCaption} از وضعیت ${fromStatusInfo.fa || fromStatus} به وضعیت ${statusInfo.fa || statusToSave} تغییر کرد و برای شما ارجاع شد.${noteTextFa}`,
              messageEn: `Request ${requestCaption} moved from ${fromStatusInfo.en || fromStatus} to ${statusInfo.en || statusToSave} and was assigned to you.${noteTextEn}`,
              type: 'info',
              entityType: 'req_requests',
              entityId: String(reqId),
              entityTitle: requestCaption,
              formComponent: 'RequestManagement',
              action: 'open_record',
              actionPayloadExtra: {
                workflow_entity_code: 'REQ_REQUESTS',
                from_status: fromStatus,
                to_status: statusToSave,
                action_id: selectedAction?.id || null,
              },
            });
          } catch (notificationError) {
            console.error('Request workflow assignment notification error:', notificationError);
            showToast(t('ارجاع انجام شد اما ارسال نوتیفیکیشن با خطا مواجه شد.', 'Assignment was done but sending notification failed.'), 'warning');
          }
        }

        setHeader(p => ({ ...p, status: statusToSave }));
        setIsDirty(false);
        setHasSaved(true);
        showToast(selectedAction || typeof actionOrStatus === 'string'
          ? t('وضعیت درخواست تغییر کرد.', 'Request status updated.')
          : t('درخواست با موفقیت ذخیره شد.', 'Request saved successfully.'));
      } catch (err) {
        console.error('RequestFormModal save error:', err?.message || err, '| code:', err?.code, '| details:', err?.details, '| hint:', err?.hint);
        showToast(t('خطا در ذخیره درخواست.', 'Error saving request.'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [
      currentUserId,
      currentUserName,
      getPermissionValue,
      getStatus,
      header,
      isMissingWorkItemsTableError,
      isDirty,
      items,
      lookups,
      parseAmount,
      resolveDataEntryFormsForStatus,
      resolveNextAssignees,
      selectedMachineMeta,
      sendWorkflowAssignmentNotifications,
      setHeader,
      setIsDirty,
      setItems,
      setHasSaved,
      showToast,
      supabase,
      t,
      toUuidOrNull,
      validateTransferBalance,
    ]);

    return {
      currencyRates,
      handleSave,
    };
  };

  window.useRequestDetailsPersistence = useRequestDetailsPersistence;
})();
