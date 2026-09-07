/* Filename: requests/RequestWorkFlow.js */
(() => {
  const React = window.React;
  const { useState, useMemo, useCallback, useEffect, useRef } = React;

  const useRequestWorkFlow = (params) => {
    const {
      isOpen,
      language,
      isRtl,
      t,
      supabase,
      header,
      items,
      lookups,
      currentUserId,
      isLoading,
      access,
      formCode,
      parseAmount,
      formatNumberSafe,
      getRequestedAmount,
      showToast,
      setItems,
      setIsDirty,
      safeIcon,
      LucideIcons,
      getStatus,
      isMissingWorkflowSchemaError,
      dataEntryComponents,
    } = params;

    const {
      Button,
      Modal,
      DataGrid,
      TextField,
      LOVField,
    } = dataEntryComponents;

    const [dynamicActions, setDynamicActions] = useState([]);
    const [workflowGraph, setWorkflowGraph] = useState({ nodes: [], edges: [] });
    const [workflowLoading, setWorkflowLoading] = useState(false);
    const [isWorkflowSchemaReady, setIsWorkflowSchemaReady] = useState(true);
    const [pendingWorkflowAction, setPendingWorkflowAction] = useState(null);
    const [approverNoteModal, setApproverNoteModal] = useState({ isOpen: false, note: '' });
    const [requestCommentModal, setRequestCommentModal] = useState({ isOpen: false, action: null });
    const [dataEntryModal, setDataEntryModal] = useState({ isOpen: false, mode: '', action: null, rows: [], note: '' });
    const hasShownMissingWorkflowWarning = useRef(false);

    const parseVisualWorkflowGraph = useCallback((raw) => {
      if (!raw) return { nodes: [], edges: [] };
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return {
            nodes: Array.isArray(parsed?.nodes) ? parsed.nodes : [],
            edges: Array.isArray(parsed?.edges) ? parsed.edges : [],
          };
        } catch {
          return { nodes: [], edges: [] };
        }
      }
      return {
        nodes: Array.isArray(raw?.nodes) ? raw.nodes : [],
        edges: Array.isArray(raw?.edges) ? raw.edges : [],
      };
    }, []);

    const getConditionValue = useCallback((field) => {
      if (field === 'total_usd_amount') {
        return items.reduce((total, item) => {
          const amount = Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount));
          const rate = parseFloat(item?.exchange_rate_to_usd || 1) || 1;
          return total + (amount * rate);
        }, 0);
      }
      if (field.startsWith('items.')) {
        const itemField = field.slice(6);
        if (itemField === 'amount') {
          return items.map(item => Math.max(parseAmount(item?.deposit_amount), parseAmount(item?.withdrawal_amount)));
        }
        return items.map(item => item?.[itemField]).filter(value => value !== null && value !== undefined);
      }
      return header[field];
    }, [header, items, parseAmount]);

    const singleConditionMatch = useCallback((condition) => {
      if (!condition?.field) return true;
      const actual = getConditionValue(condition.field);
      const expected = condition.value;
      const values = Array.isArray(actual) ? actual : [actual];

      const compare = (candidate) => {
        if (condition.operator === 'contains') return String(candidate ?? '').includes(String(expected ?? ''));
        const numeric = candidate !== '' && expected !== '' && !isNaN(Number(candidate)) && !isNaN(Number(expected));
        const left = numeric ? Number(candidate) : String(candidate ?? '');
        const right = numeric ? Number(expected) : String(expected ?? '');
        if (condition.operator === '=') return left === right;
        if (condition.operator === '!=') return left !== right;
        if (condition.operator === '>') return left > right;
        if (condition.operator === '>=') return left >= right;
        if (condition.operator === '<') return left < right;
        if (condition.operator === '<=') return left <= right;
        return false;
      };

      return values.some(compare);
    }, [getConditionValue]);

    const assigneeBlockConditionsMatch = useCallback((conditions) => {
      if (!Array.isArray(conditions) || conditions.length === 0) return true;
      let result = true;
      conditions.forEach((condition, index) => {
        const matched = singleConditionMatch(condition);
        if (index === 0) {
          result = matched;
          return;
        }
        if (String(condition.joinWithPrev || 'AND').toUpperCase() === 'OR') result = result || matched;
        else result = result && matched;
      });
      return result;
    }, [singleConditionMatch]);

    const resolveAssignee = useCallback(async (type, value) => {
      if (!type || !value) return { found: false, matches: false };
      if (type === 'USER') return { found: true, matches: String(value) === String(currentUserId) };
      if (type === 'ROLE') {
        const { data, error } = await supabase.from('sec_user_roles').select('role_id').eq('user_id', currentUserId).eq('role_id', value).limit(1);
        if (error) throw error;
        return { found: true, matches: (data || []).length > 0 };
      }
      if (type === 'DYNAMIC' && value === 'REQUESTER') {
        const requesterId = header.registrar_id || null;
        return { found: !!requesterId, matches: !!requesterId && String(requesterId) === String(currentUserId) };
      }
      if (type === 'DYNAMIC' && value === 'DIRECT_MANAGER') {
        const requesterUser = (lookups.usersList || []).find(user => String(user.id) === String(header.registrar_id || ''));
        const currentUser = (lookups.usersList || []).find(user => String(user.id) === String(currentUserId));
        if (!requesterUser?.party_id || !currentUser?.party_id) return { found: false, matches: false };

        const { data: requesterPersonnel } = await supabase
          .from('fm_org_chart_personnel')
          .select('node_id')
          .eq('person_id', requesterUser.party_id)
          .limit(1);
        const requesterNodeId = requesterPersonnel?.[0]?.node_id;
        if (!requesterNodeId) return { found: false, matches: false };

        const { data: requesterNodes } = await supabase
          .from('fm_org_chart_nodes')
          .select('parent_id')
          .eq('id', requesterNodeId)
          .limit(1);
        const parentId = requesterNodes?.[0]?.parent_id;
        if (!parentId) return { found: false, matches: false };

        const { data: managers } = await supabase.from('fm_org_chart_personnel').select('person_id').eq('node_id', parentId);
        const managerPartyIds = (managers || []).map(row => String(row.person_id));
        return { found: managerPartyIds.length > 0, matches: managerPartyIds.includes(String(currentUser.party_id)) };
      }
      return { found: false, matches: false };
    }, [currentUserId, header.registrar_id, lookups.usersList, supabase]);

    useEffect(() => {
      let cancelled = false;
      const loadAllowedActions = async () => {
        if (!isOpen || !header.id || !header.request_type || !header.status || !currentUserId) {
          setDynamicActions([]);
          setWorkflowGraph({ nodes: [], edges: [] });
          return;
        }
        if (!isWorkflowSchemaReady) {
          setDynamicActions([]);
          setWorkflowGraph({ nodes: [], edges: [] });
          return;
        }

        setWorkflowLoading(true);
        try {
          const matchOperator = (actualCandidate, operator, expectedValue) => {
            if (operator === 'contains') return String(actualCandidate ?? '').includes(String(expectedValue ?? ''));
            const numeric = actualCandidate !== '' && expectedValue !== '' && !isNaN(Number(actualCandidate)) && !isNaN(Number(expectedValue));
            const left = numeric ? Number(actualCandidate) : String(actualCandidate ?? '');
            const right = numeric ? Number(expectedValue) : String(expectedValue ?? '');
            if (operator === '=') return left === right;
            if (operator === '!=') return left !== right;
            if (operator === '>') return left > right;
            if (operator === '>=') return left >= right;
            if (operator === '<') return left < right;
            if (operator === '<=') return left <= right;
            return false;
          };

          const parseEntryConditionText = (textValue) => {
            const raw = String(textValue || '').trim();
            if (!raw) return null;
            const match = raw.match(/^\s*([a-zA-Z0-9_.]+)\s*(=|!=|>=|<=|>|<|contains)\s*(.+?)\s*$/i);
            if (!match) return null;
            const valueRaw = String(match[3] || '').trim();
            const normalizedValue = valueRaw.replace(/^['\"]|['\"]$/g, '');
            return {
              field: match[1],
              operator: String(match[2] || '=').toLowerCase(),
              value: normalizedValue,
            };
          };

          const conditionMatches = (condition) => {
            if (!condition?.field) return true;
            const actual = getConditionValue(condition.field);
            const values = Array.isArray(actual) ? actual : [actual];
            return values.some(candidate => matchOperator(candidate, condition.operator || '=', condition.value));
          };

          const stateMachineMatchesRequest = (machine) => {
            if (!machine || machine.is_active === false) return false;
            const today = new Date();
            const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const fromDate = machine.valid_from ? new Date(machine.valid_from) : null;
            const toDate = machine.valid_to ? new Date(machine.valid_to) : null;
            if (fromDate && !Number.isNaN(fromDate.getTime())) {
              const fromOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
              if (todayDate < fromOnly) return false;
            }
            if (toDate && !Number.isNaN(toDate.getTime())) {
              const toOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
              if (todayDate > toOnly) return false;
            }

            if (machine.entry_condition && typeof machine.entry_condition === 'object' && machine.entry_condition.field) {
              return conditionMatches({
                field: machine.entry_condition.field,
                operator: machine.entry_condition.operator || '=',
                value: machine.entry_condition.value,
              });
            }

            const parsedText = parseEntryConditionText(machine.entry_condition_text);
            if (parsedText) return conditionMatches(parsedText);
            return true;
          };

          const smResponse = await supabase
            .from('wf_state_machines')
            .select('id, machine_code, graph_json, is_active, valid_from, valid_to, entry_condition, entry_condition_text')
            .eq('entity_code', 'REQ_REQUESTS')
            .eq('is_active', true);

          if (smResponse.error) {
            if (isMissingWorkflowSchemaError(smResponse.error, smResponse.status)) {
              if (!cancelled) {
                setIsWorkflowSchemaReady(false);
                setDynamicActions([]);
                setWorkflowGraph({ nodes: [], edges: [] });
                if (!hasShownMissingWorkflowWarning.current) {
                  hasShownMissingWorkflowWarning.current = true;
                  showToast(t('تنظیمات State Machine برای این محیط کامل نیست. ابتدا اسکریپت‌های فاز ۲ و ۵ را اجرا کنید.', 'State machine setup is incomplete in this environment. Run Phase 2 and Phase 5 scripts first.'), 'warning');
                }
              }
              return;
            }
            throw smResponse.error;
          }

          const matched = (smResponse.data || [])
            .filter(stateMachineMatchesRequest)
            .sort((a, b) => String(a.machine_code || '').localeCompare(String(b.machine_code || '')));
          const selectedWorkflowData = matched[0] || null;

          if (!selectedWorkflowData || selectedWorkflowData.is_active === false) {
            if (!cancelled) {
              setDynamicActions([]);
              setWorkflowGraph({ nodes: [], edges: [] });
            }
            return;
          }

          const graph = parseVisualWorkflowGraph(selectedWorkflowData.graph_json);
          const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
          const edges = Array.isArray(graph.edges) ? graph.edges : [];
          if (!cancelled) setWorkflowGraph({ nodes, edges });
          const nodeById = {};
          nodes.forEach(node => { if (node?.id) nodeById[String(node.id)] = node; });

          const currentNodes = nodes.filter(node => String(node?.status || '') === String(header.status || ''));
          const allowedActions = [];

          for (const node of currentNodes) {
            const blocks = node?.settings?.assignee?.blocks;
            const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
            let canAct = false;

            for (const block of normalizedBlocks) {
              if (!assigneeBlockConditionsMatch(block?.conditions || [])) continue;
              let resolution = await resolveAssignee(block?.assignee_type, block?.assignee_value);
              if (!resolution.found && block?.fallback_assignee_type) {
                resolution = await resolveAssignee(block.fallback_assignee_type, block.fallback_assignee_value);
              }
              if (resolution.matches) {
                canAct = true;
                break;
              }
            }

            if (!canAct) continue;

            const outgoing = edges.filter(edge => String(edge?.source || '') === String(node.id || ''));
            outgoing.forEach((edge, edgeIndex) => {
              const targetNode = nodeById[String(edge?.target || '')];
              if (!targetNode?.status) return;
              const toStatus = String(targetNode.status);
              const statusInfo = getStatus(toStatus);
              const edgeForms = edge?.settings?.data_entry?.forms;
              const edgeDataEntryForm = Array.isArray(edgeForms) && edgeForms.length ? edgeForms[0] : '';
              allowedActions.push({
                id: `VIS_${node.id}_${edge.id || edgeIndex}_${toStatus}`,
                to_status: toStatus,
                action_label_fa: `تغییر به ${statusInfo.fa}`,
                action_label_en: `Move to ${statusInfo.en}`,
                button_variant: 'primary',
                icon_name: 'Check',
                field_permissions: {},
                post_action_hooks: {},
                data_entry_form: edgeDataEntryForm,
                workflow_source: 'VISUAL',
              });
            });
          }

          const deduped = [];
          const seen = new Set();
          allowedActions.forEach(action => {
            const key = action.to_status;
            if (seen.has(key)) return;
            seen.add(key);
            deduped.push(action);
          });

          if (!cancelled) setDynamicActions(deduped);
        } catch (error) {
          console.error('RequestWorkFlow load actions error:', error);
          if (!cancelled) {
            setDynamicActions([]);
            setWorkflowGraph({ nodes: [], edges: [] });
            showToast(t('خطا در بارگذاری روال تایید', 'Error loading approval workflow'), 'error');
          }
        } finally {
          if (!cancelled) setWorkflowLoading(false);
        }
      };
      loadAllowedActions();
      return () => { cancelled = true; };
    }, [assigneeBlockConditionsMatch, currentUserId, getConditionValue, getStatus, header, isMissingWorkflowSchemaError, isOpen, isWorkflowSchemaReady, parseVisualWorkflowGraph, resolveAssignee, showToast, supabase, t]);

    const workflowPermissions = useMemo(() => {
      const merged = {};
      dynamicActions.forEach(action => {
        Object.entries(action.field_permissions || {}).forEach(([field, permission]) => {
          if (permission === 'REQUIRED' || (permission === 'EDITABLE' && merged[field] !== 'REQUIRED')) merged[field] = permission;
          else if (!merged[field]) merged[field] = permission;
        });
      });
      return merged;
    }, [dynamicActions]);

    const openWorkflowDataEntryModal = useCallback((action) => {
      if (!Array.isArray(items) || items.length === 0) {
        showToast(t('برای این عملیات باید حداقل یک قلم درخواست وجود داشته باشد.', 'At least one request item is required for this action.'), 'warning');
        return;
      }

      const mode = String(action?.data_entry_form || '').trim();
      const rows = [...items]
        .sort((a, b) => (a.row_number || 0) - (b.row_number || 0))
        .map((item, index) => {
          const requested = getRequestedAmount(item);
          const approved = parseAmount(item.approved_amount);
          const remaining = Math.max(requested - approved, 0);
          const rowKey = String(item.id || item._tempId || `row_${index + 1}`);
          return {
            rowKey,
            row_number: item.row_number || index + 1,
            transaction_action: item.transaction_action || 'DEPOSIT',
            transaction_group: item.transaction_group || null,
            currency: item.currency || '',
            deposit_amount: parseAmount(item.deposit_amount),
            withdrawal_amount: parseAmount(item.withdrawal_amount),
            description: item.description || '',
            approved_amount: approved,
            remaining_amount: remaining,
            related_account_id: item.related_account_id || item.account_id || '',
          };
        });

      setPendingWorkflowAction(action);
      setDataEntryModal({ isOpen: true, mode, action, rows, note: '' });
    }, [getRequestedAmount, items, parseAmount, showToast, t]);

    const updateDataEntryRow = useCallback((rowKey, patch) => {
      setDataEntryModal(prev => ({
        ...prev,
        rows: (prev.rows || []).map(row => {
          if (row.rowKey !== rowKey) return row;
          const next = { ...row, ...patch };
          const requested = Math.max(parseAmount(next.deposit_amount), parseAmount(next.withdrawal_amount));
          const approved = parseAmount(next.approved_amount);
          next.remaining_amount = Math.max(requested - approved, 0);
          return next;
        }),
      }));
    }, [parseAmount]);

    const closeDataEntryModal = useCallback(() => {
      setDataEntryModal({ isOpen: false, mode: '', action: null, rows: [], note: '' });
      setPendingWorkflowAction(null);
    }, []);

    const saveDataEntryAndContinue = useCallback(async (handleSave) => {
      const mode = dataEntryModal.mode;
      const rows = Array.isArray(dataEntryModal.rows) ? dataEntryModal.rows : [];
      const action = pendingWorkflowAction || dataEntryModal.action;

      if (!action) {
        closeDataEntryModal();
        return;
      }

      if (mode === 'AMOUNT_APPROVAL') {
        for (const row of rows) {
          const requested = Math.max(parseAmount(row.deposit_amount), parseAmount(row.withdrawal_amount));
          const approved = parseAmount(row.approved_amount);
          if (approved < 0) {
            showToast(t(`مبلغ تایید شده در ردیف ${row.row_number} نمی‌تواند منفی باشد.`, `Approved amount cannot be negative in row ${row.row_number}.`), 'warning');
            return;
          }
          if (approved > requested) {
            showToast(t(`مبلغ تایید شده در ردیف ${row.row_number} نمی‌تواند بیشتر از مبلغ درخواستی باشد.`, `Approved amount cannot exceed requested amount in row ${row.row_number}.`), 'warning');
            return;
          }
        }
      }

      if (mode === 'ACCOUNT_SELECTION') {
        const missingAccountRow = rows.find(row => !String(row.related_account_id || '').trim());
        if (missingAccountRow) {
          showToast(t(`انتخاب حساب مرتبط برای ردیف ${missingAccountRow.row_number} الزامی است.`, `Related account is required for row ${missingAccountRow.row_number}.`), 'warning');
          return;
        }
      }

      const rowMap = new Map(rows.map(row => [row.rowKey, row]));
      const updatedItems = items.map((item, index) => {
        const rowKey = String(item.id || item._tempId || `row_${index + 1}`);
        const row = rowMap.get(rowKey);
        if (!row) return item;

        const requested = getRequestedAmount(item);
        const approvedFromModal = parseAmount(row.approved_amount);
        const approved = mode === 'AMOUNT_APPROVAL' ? approvedFromModal : parseAmount(item.approved_amount);
        const remaining = Math.max(requested - approved, 0);
        const relatedAccountId = mode === 'ACCOUNT_SELECTION' ? (row.related_account_id || null) : (item.related_account_id || item.account_id || null);

        return {
          ...item,
          approved_amount: approved,
          remaining_amount: remaining,
          related_account_id: relatedAccountId,
        };
      });

      const approverNote = String(dataEntryModal.note || '').trim();
      setDataEntryModal({ isOpen: false, mode: '', action: null, rows: [], note: '' });
      setPendingWorkflowAction(null);
      setItems(updatedItems);
      setIsDirty(true);
      await handleSave(action, { overrideItems: updatedItems, approver_note: approverNote });
    }, [closeDataEntryModal, dataEntryModal.action, dataEntryModal.mode, dataEntryModal.note, dataEntryModal.rows, getRequestedAmount, items, parseAmount, pendingWorkflowAction, setIsDirty, setItems, showToast, t]);

    const accountLovColumns = useMemo(() => [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '90px' },
      { field: 'displayLabel', header_fa: 'عنوان حساب', header_en: 'Account Title', width: '220px' },
      { field: 'pathTitle', header_fa: 'مسیر', header_en: 'Path', width: 'auto' },
      { field: 'chart_name', header_fa: 'کدینگ', header_en: 'Chart', width: '160px' },
    ], []);

    const dataEntryColumns = useMemo(() => {
      const mode = dataEntryModal.mode;
      const accountById = new Map((lookups.leafAccounts || []).map(acc => [String(acc.id), acc]));
      return [
        { field: 'row_number', header_fa: 'ردیف', header_en: 'Row', width: '60px' },
        {
          field: 'transaction_action',
          header_fa: 'نوع',
          header_en: 'Type',
          width: '80px',
          render: (val) => val === 'WITHDRAWAL'
            ? <span className="text-rose-600 dark:text-rose-400 font-bold">{t('برداشت', 'Withdrawal')}</span>
            : <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('واریز', 'Deposit')}</span>,
        },
        { field: 'transaction_group', header_fa: 'گروه', header_en: 'Group', width: '100px', render: (val) => <span>{val || '-'}</span> },
        { field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '80px', render: (val) => <span dir="ltr">{val || '-'}</span> },
        { field: 'deposit_amount', header_fa: 'واریز', header_en: 'Deposit', width: '100px', render: (val) => <span dir="ltr" className="block text-right">{formatNumberSafe(val)}</span> },
        { field: 'withdrawal_amount', header_fa: 'برداشت', header_en: 'Withdrawal', width: '100px', render: (val) => <span dir="ltr" className="block text-right">{formatNumberSafe(val)}</span> },
        { field: 'description', header_fa: 'شرح', header_en: 'Description', width: '180px', render: (val) => <span className="truncate block">{val || '-'}</span> },
        {
          field: 'approved_amount',
          header_fa: 'مبلغ تایید شده',
          header_en: 'Approved Amount',
          width: '100px',
          render: (val, row) => {
            if (mode !== 'AMOUNT_APPROVAL') return <span dir="ltr" className="block text-right">{formatNumberSafe(val)}</span>;
            return (
              <TextField
                size="sm"
                value={formatNumberSafe(val)}
                onChange={(e) => {
                  const raw = String(e.target.value || '').replace(/,/g, '');
                  if (raw === '' || !isNaN(Number(raw))) {
                    updateDataEntryRow(row.rowKey, { approved_amount: raw === '' ? 0 : Number(raw) });
                  }
                }}
                isRtl={isRtl}
                dir="ltr"
                wrapperClassName="m-0"
              />
            );
          },
        },
        { field: 'remaining_amount', header_fa: 'مبلغ مانده', header_en: 'Remaining Amount', width: '100px', render: (val) => <span dir="ltr" className="block text-right text-amber-600 dark:text-amber-400 font-bold">{formatNumberSafe(val)}</span> },
        {
          field: 'related_account_id',
          header_fa: 'حساب مرتبط',
          header_en: 'Related Account',
          width: '260px',
          render: (val, row) => {
            const account = accountById.get(String(val || ''));
            const displayValue = account ? `${account.code || ''} - ${account.displayLabel || ''}`.trim() : '';
            if (mode !== 'ACCOUNT_SELECTION') return <span className="truncate block">{displayValue || '-'}</span>;
            return (
              <div className="relative z-[120]">
                <LOVField
                  size="sm"
                  formCode={formCode}
                  data={lookups.leafAccounts || []}
                  columns={accountLovColumns}
                  dropdownWidth="min-w-[650px]"
                  displayValue={displayValue}
                  onChange={(selected) => updateDataEntryRow(row.rowKey, { related_account_id: selected ? selected.id : '' })}
                  isRtl={isRtl}
                  wrapperClassName="m-0"
                  placeholder={t('انتخاب حساب', 'Select account')}
                />
              </div>
            );
          },
        },
      ];
    }, [accountLovColumns, dataEntryModal.mode, formCode, formatNumberSafe, isRtl, lookups.leafAccounts, t, updateDataEntryRow]);

    const resolveAssigneeLabelsForLog = useCallback(async (type, value) => {
      if (!type || !value) return [];
      if (type === 'USER') {
        const user = (lookups.usersList || []).find(item => String(item.id) === String(value));
        return [user ? (user.full_name || user.username || String(value)) : String(value)];
      }
      if (type === 'ROLE') {
        const roleLabel = lookups.rolesMap?.[value] || String(value);
        return roleLabel ? [roleLabel] : [];
      }
      if (type === 'DYNAMIC' && value === 'REQUESTER') {
        const user = (lookups.usersList || []).find(item => String(item.id) === String(header.registrar_id || ''));
        const label = user ? (user.full_name || user.username || '') : (lookups.usersMap?.[header.registrar_id] || '');
        return label ? [label] : [];
      }
      if (type === 'DYNAMIC' && value === 'DIRECT_MANAGER') {
        const requesterUser = (lookups.usersList || []).find(item => String(item.id) === String(header.registrar_id || ''));
        if (!requesterUser?.party_id) return [];

        const requesterPartyId = String(requesterUser.party_id);
        const requesterPersonnel = (lookups.personnelRows || []).find(row => String(row.person_id) === requesterPartyId);
        const requesterNodeId = requesterPersonnel?.node_id ? String(requesterPersonnel.node_id) : null;
        if (!requesterNodeId) return [];

        const orgNode = (lookups.orgNodes || []).find(node => String(node.id) === requesterNodeId);
        const parentNodeId = orgNode?.parent_id ? String(orgNode.parent_id) : null;
        if (!parentNodeId) return [];

        const managerPartyIds = (lookups.personnelRows || []).filter(row => String(row.node_id) === parentNodeId).map(row => String(row.person_id));
        const managerLabels = (lookups.usersList || [])
          .filter(user => managerPartyIds.includes(String(user.party_id || '')))
          .map(user => user.full_name || user.username || String(user.id))
          .filter(Boolean);

        return [...new Set(managerLabels)];
      }
      return [];
    }, [header.registrar_id, lookups.orgNodes, lookups.personnelRows, lookups.rolesMap, lookups.usersList, lookups.usersMap]);

    const resolveNextAssigneeLabel = useCallback(async (nextStatus) => {
      const nodes = Array.isArray(workflowGraph?.nodes) ? workflowGraph.nodes : [];
      const edges = Array.isArray(workflowGraph?.edges) ? workflowGraph.edges : [];
      if (!nodes.length) return '-';

      const targetNodes = nodes.filter(node => String(node?.status || '') === String(nextStatus || ''));
      const labels = [];

      for (const node of targetNodes) {
        const hasOutgoing = edges.some(edge => String(edge?.source || '') === String(node?.id || ''));
        if (!hasOutgoing) continue;
        const blocks = Array.isArray(node?.settings?.assignee?.blocks) ? node.settings.assignee.blocks : [];
        for (const block of blocks) {
          if (!assigneeBlockConditionsMatch(block?.conditions || [])) continue;
          let assigneeLabels = await resolveAssigneeLabelsForLog(block?.assignee_type, block?.assignee_value);
          if (!assigneeLabels.length && block?.fallback_assignee_type) {
            assigneeLabels = await resolveAssigneeLabelsForLog(block.fallback_assignee_type, block.fallback_assignee_value);
          }
          assigneeLabels.forEach(label => {
            if (label && !labels.includes(label)) labels.push(label);
          });
        }
      }

      return labels.length ? labels.join(' | ') : '-';
    }, [assigneeBlockConditionsMatch, resolveAssigneeLabelsForLog, workflowGraph]);

    const handleWorkflowActionClick = useCallback((action, handleSave) => {
      const dataEntryForm = String(action?.data_entry_form || '').trim();
      if (!dataEntryForm) {
        handleSave(action);
        return;
      }
      if (dataEntryForm === 'APPROVER_NOTE') {
        setPendingWorkflowAction(action);
        setApproverNoteModal({ isOpen: true, note: '' });
        return;
      }
      if (dataEntryForm === 'REQUEST_COMMENT') {
        if (!header?.id) {
          showToast(t('برای ثبت کامنت ابتدا باید درخواست ذخیره شده باشد.', 'Request must be saved before adding a comment.'), 'warning');
          return;
        }
        setPendingWorkflowAction(action);
        setRequestCommentModal({ isOpen: true, action });
        return;
      }
      if (dataEntryForm === 'AMOUNT_APPROVAL' || dataEntryForm === 'ACCOUNT_SELECTION') {
        openWorkflowDataEntryModal(action);
        return;
      }
      handleSave(action);
    }, [header?.id, openWorkflowDataEntryModal, showToast, t]);

    const submitApproverNoteAndContinue = useCallback(async (handleSave) => {
      const note = String(approverNoteModal.note || '').trim();
      if (!note) {
        showToast(t('ثبت توضیحات انجام دهنده الزامی است.', 'Approver note is required.'), 'warning');
        return;
      }

      const action = pendingWorkflowAction;
      setApproverNoteModal({ isOpen: false, note: '' });
      setPendingWorkflowAction(null);
      if (action) await handleSave(action, { approver_note: note });
    }, [approverNoteModal.note, pendingWorkflowAction, showToast, t]);

    const closeApproverNoteModal = useCallback(() => {
      setApproverNoteModal({ isOpen: false, note: '' });
      setPendingWorkflowAction(null);
    }, []);

    const closeRequestCommentModal = useCallback(() => {
      setRequestCommentModal({ isOpen: false, action: null });
      setPendingWorkflowAction(null);
    }, []);

    const handleRequestCommentAdded = useCallback(async (handleSave) => {
      const action = pendingWorkflowAction || requestCommentModal.action;
      setRequestCommentModal({ isOpen: false, action: null });
      setPendingWorkflowAction(null);
      if (action) await handleSave(action);
    }, [pendingWorkflowAction, requestCommentModal.action]);

    const btnBase = 'flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 border rounded-md transition-colors';
    const variantClasses = {
      primary: 'border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
      danger: 'border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30',
      success: 'border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30',
      outline: 'border-slate-400 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800',
      'outline-indigo': 'border-indigo-400 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
    };

    const renderStatusActions = (handleSave) => (
      <div className="flex flex-wrap items-center gap-2 pr-2" onClick={e => e.stopPropagation()}>
        {workflowLoading && <div className="h-7 w-28 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />}
        {!workflowLoading && access.canEdit && dynamicActions.map(action => {
          const ActionIcon = safeIcon(LucideIcons, action.icon_name || 'Check');
          return (
            <button key={action.id} onClick={() => handleWorkflowActionClick(action, handleSave)} disabled={isLoading}
              className={`${btnBase} ${variantClasses[action.button_variant] || variantClasses.primary}`}>
              <ActionIcon size={12} /> {isRtl ? action.action_label_fa : action.action_label_en}
            </button>
          );
        })}
      </div>
    );

    const renderWorkflowModals = (handleSave) => (
      <>
        <Modal
          isOpen={dataEntryModal.isOpen}
          onClose={closeDataEntryModal}
          title={dataEntryModal.mode === 'AMOUNT_APPROVAL' ? t('تایید مقادیر اقلام درخواست', 'Request Item Amount Approval') : t('تعیین حساب اقلام درخواست', 'Request Item Account Selection')}
          language={language}
          width="max-w-7xl"
        >
          <div className="p-4 h-[72vh] bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg flex flex-col gap-3">
            <div className="text-[12px] text-slate-600 dark:text-slate-300">
              {dataEntryModal.mode === 'AMOUNT_APPROVAL'
                ? t('در این فرم فقط ستون مبلغ تایید شده قابل ویرایش است.', 'Only approved amount column is editable in this form.')
                : t('در این فرم فقط ستون حساب مرتبط قابل ویرایش است.', 'Only related account column is editable in this form.')}
            </div>
            <div className="flex-1 min-h-0">
              <DataGrid
                data={dataEntryModal.rows}
                columns={dataEntryColumns}
                language={language}
                formCode={formCode}
                hideImport={true}
                hideExport={true}
                hideToolbar={true}
                selectable={false}
                actionWidth="0px"
                minVisibleRows={6}
                className="h-full"
              />
            </div>
            <div className="bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-200 mb-1.5">{t('توضیحات انجام دهنده', 'Approver Note')}</label>
              <textarea
                value={dataEntryModal.note || ''}
                onChange={(e) => setDataEntryModal(prev => ({ ...prev, note: e.target.value }))}
                className="w-full min-h-[88px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-[12px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('توضیحات انجام دهنده را وارد کنید...', 'Enter approver note...')}
                dir={isRtl ? 'rtl' : 'ltr'}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeDataEntryModal}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={() => saveDataEntryAndContinue(handleSave)} isLoading={isLoading}>{t('ذخیره و ادامه', 'Save and Continue')}</Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={approverNoteModal.isOpen}
          onClose={closeApproverNoteModal}
          title={t('توضیحات انجام دهنده', 'Approver Note')}
          language={language}
          width="max-w-lg"
        >
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg flex flex-col gap-3">
            <textarea
              value={approverNoteModal.note}
              onChange={(e) => setApproverNoteModal(prev => ({ ...prev, note: e.target.value }))}
              className="w-full min-h-[130px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-[12px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('توضیحات انجام عملیات را وارد کنید...', 'Enter operation note...')}
              dir={isRtl ? 'rtl' : 'ltr'}
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeApproverNoteModal}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={() => submitApproverNoteAndContinue(handleSave)} isLoading={isLoading}>{t('ذخیره و ادامه', 'Save and Continue')}</Button>
            </div>
          </div>
        </Modal>

        {(() => {
          const { CommentModal } = window.DSComments || {};
          if (!CommentModal || !requestCommentModal.isOpen) return null;
          return (
            <CommentModal
              isOpen={requestCommentModal.isOpen}
              onClose={closeRequestCommentModal}
              onCommentAdded={() => handleRequestCommentAdded(handleSave)}
              language={language}
              entityType="req_requests"
              entityId={header?.id ? String(header.id) : ''}
              entityTitle={`${t('کد', 'Code')}: ${header.request_code || '-'} | ${t('شرح', 'Description')}: ${header.description || '-'}`}
            />
          );
        })()}
      </>
    );

    return {
      dynamicActions,
      workflowGraph,
      workflowLoading,
      workflowPermissions,
      renderStatusActions,
      renderWorkflowModals,
      resolveNextAssigneeLabel,
    };
  };

  window.useRequestWorkFlow = useRequestWorkFlow;
})();