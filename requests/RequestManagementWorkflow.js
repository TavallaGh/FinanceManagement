/* Filename: requests/RequestManagementWorkflow.js */
(() => {
  const React = window.React;
  const { useMemo } = React;

  const workflowShared = window.RequestWorkflowShared || {
    parseVisualWorkflowGraph: (raw) => {
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
    },
    matchOperator: (actualCandidate, operator, expectedValue) => {
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
    },
    parseEntryConditionText: (textValue) => {
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
    },
  };

  const useRequestManagementWorkflow = ({
    currentUserId,
    requests,
    filteredRecordId,
    filters,
    ownDataOnly,
    stateMachineRows,
    userRoles,
    rolesMap,
    usersList,
    usersMap,
    orgNodes,
    personnelRows,
    parseAmount,
  }) => {
    const parseVisualWorkflowGraph = (raw) => workflowShared.parseVisualWorkflowGraph(raw);

    const workflowAssignments = useMemo(() => {
      if (!currentUserId) return { actionableSet: new Set(), assignedMap: {} };

      const today = new Date();
      const toDateOnly = (val) => {
        if (!val) return null;
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      const getRequestConditionValue = (requestRow, field) => {
        if (!field) return undefined;
        const reqItems = requestRow.req_request_items || [];
        if (field === 'total_usd_amount') {
          return reqItems.reduce((total, item) => {
            const amount = Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount));
            const rate = parseFloat(item.exchange_rate_to_usd || 1) || 1;
            return total + (amount * rate);
          }, 0);
        }
        if (field.startsWith('items.')) {
          const itemField = field.slice(6);
          if (itemField === 'amount') {
            return reqItems.map(item => Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount)));
          }
          return reqItems.map(item => item[itemField]).filter(value => value !== null && value !== undefined);
        }
        return requestRow[field];
      };

      const conditionMatches = (requestRow, condition) => {
        if (!condition?.field) return true;
        const actual = getRequestConditionValue(requestRow, condition.field);
        const values = Array.isArray(actual) ? actual : [actual];
        return values.some(candidate => workflowShared.matchOperator(candidate, condition.operator || '=', condition.value));
      };

      const stateMachineMatchesRequest = (machine, requestRow) => {
        if (!machine || machine.is_active === false) return false;
        const fromDate = toDateOnly(machine.valid_from);
        const toDate = toDateOnly(machine.valid_to);
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (fromDate && todayDate < fromDate) return false;
        if (toDate && todayDate > toDate) return false;

        if (machine.entry_condition && typeof machine.entry_condition === 'object' && machine.entry_condition.field) {
          return conditionMatches(requestRow, {
            field: machine.entry_condition.field,
            operator: machine.entry_condition.operator || '=',
            value: machine.entry_condition.value,
          });
        }

        const parsedText = workflowShared.parseEntryConditionText(machine.entry_condition_text);
        if (parsedText) return conditionMatches(requestRow, parsedText);

        return true;
      };

      const selectMachineForRequest = (requestRow) => {
        const candidates = (stateMachineRows || [])
          .filter(machine => String(machine.entity_code || '') === 'REQ_REQUESTS')
          .filter(machine => stateMachineMatchesRequest(machine, requestRow))
          .sort((a, b) => String(a.machine_code || '').localeCompare(String(b.machine_code || '')));
        return candidates[0] || null;
      };

      const usersById = {};
      (usersList || []).forEach(user => { usersById[String(user.id)] = user; });
      const currentUser = usersById[String(currentUserId)] || null;
      const currentUserPartyId = currentUser?.party_id ? String(currentUser.party_id) : null;

      const nodeById = {};
      (orgNodes || []).forEach(node => { nodeById[String(node.id)] = node; });

      const nodeByPartyId = {};
      const partyIdsByNodeId = {};
      (personnelRows || []).forEach(row => {
        const personId = row?.person_id != null ? String(row.person_id) : null;
        const nodeId = row?.node_id != null ? String(row.node_id) : null;
        if (personId && nodeId && !nodeByPartyId[personId]) nodeByPartyId[personId] = nodeId;
        if (personId && nodeId) {
          if (!partyIdsByNodeId[nodeId]) partyIdsByNodeId[nodeId] = [];
          partyIdsByNodeId[nodeId].push(personId);
        }
      });

      const roleSet = new Set((userRoles || []).map(String));

      const userDisplay = (user) => user ? (user.full_name || user.username || String(user.id)) : '';

      const getConditionValue = (requestRow, field) => {
        const reqItems = requestRow.req_request_items || [];
        if (field === 'total_usd_amount') {
          return reqItems.reduce((total, item) => {
            const amount = Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount));
            const rate = parseFloat(item.exchange_rate_to_usd || 1) || 1;
            return total + (amount * rate);
          }, 0);
        }
        if (field.startsWith('items.')) {
          const itemField = field.slice(6);
          if (itemField === 'amount') {
            return reqItems.map(item => Math.max(parseAmount(item.deposit_amount), parseAmount(item.withdrawal_amount)));
          }
          return reqItems.map(item => item[itemField]).filter(value => value !== null && value !== undefined);
        }
        return requestRow[field];
      };

      const singleConditionMatch = (requestRow, condition) => {
        if (!condition?.field) return true;
        const actual = getConditionValue(requestRow, condition.field);
        const expected = condition.value;
        const values = Array.isArray(actual) ? actual : [actual];
        return values.some(candidate => {
          return workflowShared.matchOperator(candidate, condition.operator, expected);
        });
      };

      const assigneeBlockConditionsMatch = (requestRow, conditions) => {
        if (!Array.isArray(conditions) || conditions.length === 0) return true;
        let result = true;
        conditions.forEach((condition, index) => {
          const matched = singleConditionMatch(requestRow, condition);
          if (index === 0) {
            result = matched;
            return;
          }
          if (String(condition.joinWithPrev || 'AND').toUpperCase() === 'OR') result = result || matched;
          else result = result && matched;
        });
        return result;
      };

      const resolveAssignee = (requestRow, type, value) => {
        if (!type || !value) return { found: false, matches: false, labels: [] };
        if (type === 'USER') {
          const assignedUser = usersById[String(value)];
          const label = assignedUser ? userDisplay(assignedUser) : (usersMap[value] || String(value));
          return { found: true, matches: String(value) === String(currentUserId), labels: [label] };
        }
        if (type === 'ROLE') {
          const roleTitle = rolesMap[String(value)] || String(value);
          return { found: true, matches: roleSet.has(String(value)), labels: [roleTitle] };
        }
        if (type === 'DYNAMIC' && value === 'REQUESTER') {
          const requesterId = requestRow.registrar_id || null;
          const requesterUser = usersById[String(requesterId || '')];
          const label = requesterUser ? userDisplay(requesterUser) : (requesterId ? (usersMap[requesterId] || String(requesterId)) : '');
          return { found: !!requesterId, matches: !!requesterId && String(requesterId) === String(currentUserId), labels: label ? [label] : [] };
        }
        if (type === 'DYNAMIC' && value === 'DIRECT_MANAGER') {
          const requesterUser = usersById[String(requestRow.registrar_id || '')];
          const requesterPartyId = requesterUser?.party_id ? String(requesterUser.party_id) : null;
          if (!requesterPartyId || !currentUserPartyId) return { found: false, matches: false, labels: [] };
          const requesterNodeId = nodeByPartyId[requesterPartyId];
          if (!requesterNodeId) return { found: false, matches: false, labels: [] };
          const parentNodeId = nodeById[requesterNodeId]?.parent_id ? String(nodeById[requesterNodeId].parent_id) : null;
          if (!parentNodeId) return { found: false, matches: false, labels: [] };
          const managerPartyIds = partyIdsByNodeId[parentNodeId] || [];
          const managerUsers = (usersList || []).filter(u => managerPartyIds.includes(String(u.party_id || '')));
          const labels = managerUsers.map(userDisplay).filter(Boolean);
          const found = labels.length > 0;
          const matches = managerPartyIds.includes(String(currentUserPartyId));
          return { found, matches, labels };
        }
        return { found: false, matches: false, labels: [] };
      };

      const actionableSet = new Set();
      const assignedMap = {};

      (requests || []).forEach(requestRow => {
        const wf = selectMachineForRequest(requestRow);
        if (!wf || wf.is_active === false) {
          assignedMap[String(requestRow.id)] = { label: '-', isMine: false };
          return;
        }
        const graph = parseVisualWorkflowGraph(wf.graph_json);
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const edges = Array.isArray(graph.edges) ? graph.edges : [];
        if (!nodes.length || !edges.length) {
          assignedMap[String(requestRow.id)] = { label: '-', isMine: false };
          return;
        }

        const currentNodes = nodes.filter(node => String(node?.status || '') === String(requestRow.status || ''));
        let canAct = false;
        const assigneeLabels = [];

        for (const node of currentNodes) {
          const hasOutgoing = edges.some(edge => String(edge?.source || '') === String(node?.id || ''));
          if (!hasOutgoing) continue;

          const blocks = Array.isArray(node?.settings?.assignee?.blocks) ? node.settings.assignee.blocks : [];
          for (const block of blocks) {
            if (!assigneeBlockConditionsMatch(requestRow, block?.conditions || [])) continue;
            let resolution = resolveAssignee(requestRow, block?.assignee_type, block?.assignee_value);
            if (!resolution.found && block?.fallback_assignee_type) {
              resolution = resolveAssignee(requestRow, block.fallback_assignee_type, block.fallback_assignee_value);
            }
            (resolution.labels || []).forEach(label => {
              if (label && !assigneeLabels.includes(label)) assigneeLabels.push(label);
            });
            if (resolution.matches) {
              canAct = true;
            }
          }
        }

        const label = assigneeLabels.length ? assigneeLabels.join(' | ') : '-';
        assignedMap[String(requestRow.id)] = { label, isMine: canAct };
        if (canAct) actionableSet.add(String(requestRow.id));
      });

      return { actionableSet, assignedMap };
    }, [currentUserId, orgNodes, parseAmount, personnelRows, requests, rolesMap, stateMachineRows, userRoles, usersList, usersMap]);

    const actionableRequestIds = workflowAssignments.actionableSet;

    const filteredData = useMemo(() => {
      return (requests || []).filter(r => {
        if (filteredRecordId && String(r.id) !== String(filteredRecordId)) return false;

        const hasItemFilters =
          !!filters.transaction_action ||
          !!filters.transaction_group ||
          !!filters.sub_type_id ||
          !!filters.party_id ||
          !!filters.center_id;

        if (ownDataOnly) {
          const isCreator = String(r.registrar_id || '') === String(currentUserId || '');
          if (filters.assigned_to_me) {
            if (!actionableRequestIds.has(String(r.id))) return false;
          } else {
            if (!isCreator) return false;
          }
        } else {
          if (filters.assigned_to_me && !actionableRequestIds.has(String(r.id))) return false;
        }

        if (!hasItemFilters) return true;

        const hasMatchingItem = (r.req_request_items || []).some(item => {
          if (filters.transaction_action && item.transaction_action !== filters.transaction_action) return false;
          if (filters.transaction_group && item.transaction_group !== filters.transaction_group) return false;

          if (filters.sub_type_id) {
            const selected = filters.sub_type_id;
            if (selected.subTypeGroup === 'COST') {
              if (String(item.cost_type_id || '') !== String(selected.id)) return false;
            } else if (selected.subTypeGroup === 'INCOME') {
              if (String(item.income_type_id || '') !== String(selected.id)) return false;
            }
          }

          if (filters.party_id && String(item.party_id || '') !== String(filters.party_id.id)) return false;
          if (filters.center_id && String(item.center_id || '') !== String(filters.center_id.id)) return false;

          return true;
        });

        return hasMatchingItem;
      }).map(r => {
        const assigned = workflowAssignments.assignedMap[String(r.id)] || { label: '-', isMine: false };
        return { ...r, assigned_to_display: assigned.label, assigned_to_is_me: assigned.isMine };
      });
    }, [requests, filteredRecordId, filters, actionableRequestIds, workflowAssignments.assignedMap, ownDataOnly, currentUserId]);

    return {
      workflowAssignments,
      actionableRequestIds,
      filteredData,
    };
  };

  window.useRequestManagementWorkflow = useRequestManagementWorkflow;
})();
