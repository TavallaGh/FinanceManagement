/* Filename: workflow/StateMachineCanvas.js */
(() => {
  const STATUS_LIST = [
    { value: 'DRAFT', fa: 'یادداشت', en: 'Draft', color: 'from-slate-100 to-slate-200' },
    { value: 'REGISTERED', fa: 'ثبت شده', en: 'Registered', color: 'from-blue-100 to-blue-200' },
    { value: 'REVIEWED', fa: 'بررسی شده', en: 'Reviewed', color: 'from-violet-100 to-violet-200' },
    { value: 'APPROVED', fa: 'تایید شده', en: 'Approved', color: 'from-emerald-100 to-emerald-200' },
    { value: 'IN_PROGRESS', fa: 'در حال انجام', en: 'In Progress', color: 'from-amber-100 to-amber-200' },
    { value: 'DONE', fa: 'انجام شده', en: 'Done', color: 'from-green-100 to-green-200' },
    { value: 'REJECTED', fa: 'عدم تایید', en: 'Rejected', color: 'from-rose-100 to-rose-200' },
    { value: 'CANCELED', fa: 'لغو شده', en: 'Canceled', color: 'from-red-100 to-red-200' },
    { value: 'CLOSED', fa: 'بسته شده', en: 'Closed', color: 'from-zinc-100 to-zinc-200' },
  ];

  const NODE_WIDTH = 188;
  const NODE_HEIGHT = 112;
  const CANVAS_SAFE_MARGIN = 36;

  const createNode = (status, x, y) => ({
    id: crypto.randomUUID(),
    status,
    x,
    y,
  });

  const createEdge = (source, target) => ({
    id: crypto.randomUUID(),
    source,
    target,
  });

  const getNodeCenter = (node) => ({
    x: node.x + (NODE_WIDTH / 2),
    y: node.y + (NODE_HEIGHT / 2),
  });

  const getNodeEdges = (node) => {
    if (!node) return { right: 0, left: 0, top: 0, bottom: 0, x: 0, y: 0 };
    const center = getNodeCenter(node);
    return {
      right: node.x + NODE_WIDTH,
      left: node.x,
      top: node.y,
      bottom: node.y + NODE_HEIGHT,
      x: center.x,
      y: center.y,
    };
  };

  const getEdgeGeometry = (sourceNode, targetNode) => {
    const sRect = getNodeEdges(sourceNode);
    const tRect = getNodeEdges(targetNode);
    const gap = 20;

    let startX = sRect.right;
    let startY = sRect.y;
    let endX = tRect.left;
    let endY = tRect.y;
    let points = [];

    if (sRect.right + gap < tRect.left) {
      startX = sRect.right;
      startY = sRect.y;
      endX = tRect.left;
      endY = tRect.y;
      const midX = startX + ((endX - startX) / 2);
      points = [
        { x: startX, y: startY },
        { x: midX, y: startY },
        { x: midX, y: endY },
        { x: endX, y: endY },
      ];
    } else if (sRect.left > tRect.right + gap) {
      startX = sRect.left;
      startY = sRect.y;
      endX = tRect.right;
      endY = tRect.y;
      const midX = startX + ((endX - startX) / 2);
      points = [
        { x: startX, y: startY },
        { x: midX, y: startY },
        { x: midX, y: endY },
        { x: endX, y: endY },
      ];
    } else if (sRect.bottom + gap < tRect.top) {
      startX = sRect.x;
      startY = sRect.bottom;
      endX = tRect.x;
      endY = tRect.top;
      const midY = startY + ((endY - startY) / 2);
      points = [
        { x: startX, y: startY },
        { x: startX, y: midY },
        { x: endX, y: midY },
        { x: endX, y: endY },
      ];
    } else if (sRect.top > tRect.bottom + gap) {
      startX = sRect.x;
      startY = sRect.top;
      endX = tRect.x;
      endY = tRect.bottom;
      const midY = startY + ((endY - startY) / 2);
      points = [
        { x: startX, y: startY },
        { x: startX, y: midY },
        { x: endX, y: midY },
        { x: endX, y: endY },
      ];
    } else {
      const goRight = sRect.x <= tRect.x;
      startX = goRight ? sRect.right : sRect.left;
      startY = sRect.y;
      endX = goRight ? tRect.left : tRect.right;
      endY = tRect.y;
      const dogLegX = goRight
        ? Math.max(sRect.right, tRect.right) + gap
        : Math.min(sRect.left, tRect.left) - gap;
      points = [
        { x: startX, y: startY },
        { x: dogLegX, y: startY },
        { x: dogLegX, y: endY },
        { x: endX, y: endY },
      ];
    }

    const compactPoints = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
      const prev = compactPoints[compactPoints.length - 1];
      const curr = points[i];
      if (Math.abs(prev.x - curr.x) > 0.1 || Math.abs(prev.y - curr.y) > 0.1) {
        compactPoints.push(curr);
      }
    }

    const start = compactPoints[0] || points[0] || { x: startX, y: startY };
    const end = compactPoints[compactPoints.length - 1] || points[points.length - 1] || { x: endX, y: endY };
    const tail = compactPoints[compactPoints.length - 2] || start;
    const angle = Math.atan2(end.y - tail.y, end.x - tail.x);
    const headLength = 12;
    const headWidth = 5;
    const arrowLeft = {
      x: end.x - (headLength * Math.cos(angle)) + (headWidth * Math.sin(angle)),
      y: end.y - (headLength * Math.sin(angle)) - (headWidth * Math.cos(angle)),
    };
    const arrowRight = {
      x: end.x - (headLength * Math.cos(angle)) - (headWidth * Math.sin(angle)),
      y: end.y - (headLength * Math.sin(angle)) + (headWidth * Math.cos(angle)),
    };
    return {
      start,
      end,
      points: compactPoints,
      arrowLeft,
      arrowRight,
      pathD: compactPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '),
    };
  };

  const autoLayoutGraph = ({ activeGraph, canvasRef, statusOrderMap, showToast, t, setActiveGraph }) => {
    const nodes = activeGraph.nodes;
    const edges = activeGraph.edges;
    if (!nodes.length) {
      showToast(t('ابتدا چند وضعیت به بوم اضافه کنید.', 'Add some statuses first.'), 'warning');
      return;
    }

    const levelMap = {};
    const indegree = {};
    const adjacency = {};
    const reverseAdjacency = {};
    const nodeMap = {};

    const statusRank = (nodeId) => {
      const node = nodeMap[nodeId];
      const rank = statusOrderMap[node?.status];
      return typeof rank === 'number' ? rank : 999;
    };

    nodes.forEach(node => {
      nodeMap[node.id] = node;
      indegree[node.id] = 0;
      adjacency[node.id] = [];
      reverseAdjacency[node.id] = [];
    });
    edges.forEach(edge => {
      if (!adjacency[edge.source]) return;
      adjacency[edge.source].push(edge.target);
      reverseAdjacency[edge.target].push(edge.source);
      if (typeof indegree[edge.target] === 'number') indegree[edge.target] += 1;
    });

    Object.keys(adjacency).forEach(sourceId => {
      adjacency[sourceId].sort((a, b) => statusRank(a) - statusRank(b));
    });

    const draftNode = nodes.find(node => node.status === 'DRAFT');
    const roots = draftNode
      ? [draftNode.id]
      : nodes.filter(node => indegree[node.id] === 0).map(node => node.id).sort((a, b) => statusRank(a) - statusRank(b));

    const queue = [...roots];
    roots.forEach((id) => { levelMap[id] = 0; });

    const visited = new Set();
    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const baseLevel = levelMap[id] || 0;
      (adjacency[id] || []).forEach(targetId => {
        levelMap[targetId] = Math.max(levelMap[targetId] || 0, baseLevel + 1);
        if (!visited.has(targetId) && !queue.includes(targetId)) queue.push(targetId);
      });
      queue.sort((a, b) => statusRank(a) - statusRank(b));
    }

    const maxLevel = Math.max(0, ...Object.values(levelMap));
    nodes.forEach(node => {
      if (typeof levelMap[node.id] !== 'number') levelMap[node.id] = maxLevel + 1;
    });

    const levels = Object.keys(levelMap).map(Number);
    const maxLevelForChain = Math.max(0, ...levels);
    const effectiveColMap = {};

    const orderedNodeIds = [...nodes]
      .sort((a, b) => {
        const levelDiff = (levelMap[a.id] || 0) - (levelMap[b.id] || 0);
        if (levelDiff !== 0) return levelDiff;
        return statusRank(a.id) - statusRank(b.id);
      })
      .map(node => node.id);

    const rootIds = roots.length ? roots : orderedNodeIds.slice(0, 1);
    rootIds.forEach((rootId) => { effectiveColMap[rootId] = 0; });

    const inCount = (nodeId) => (reverseAdjacency[nodeId] || []).length;
    const outCount = (nodeId) => (adjacency[nodeId] || []).length;

    orderedNodeIds.forEach(nodeId => {
      if (typeof effectiveColMap[nodeId] === 'number') return;
      const parents = reverseAdjacency[nodeId] || [];
      if (!parents.length) {
        effectiveColMap[nodeId] = 0;
        return;
      }

      const primaryParent = parents.slice().sort((a, b) => {
        const levelDiff = (levelMap[b] || 0) - (levelMap[a] || 0);
        if (levelDiff !== 0) return levelDiff;
        return statusRank(a) - statusRank(b);
      })[0];

      const parentCol = typeof effectiveColMap[primaryParent] === 'number'
        ? effectiveColMap[primaryParent]
        : (levelMap[primaryParent] || 0);

      const isOrphanNode = inCount(nodeId) === 0 && outCount(nodeId) === 0;
      const isSingleChain =
        parents.length === 1 &&
        outCount(primaryParent) <= 1 &&
        inCount(nodeId) <= 1 &&
        (levelMap[nodeId] <= maxLevelForChain);

      if (isOrphanNode || isSingleChain) {
        effectiveColMap[nodeId] = parentCol;
      } else {
        const maxParentCol = parents.reduce((maxCol, pid) => {
          const col = typeof effectiveColMap[pid] === 'number' ? effectiveColMap[pid] : (levelMap[pid] || 0);
          return Math.max(maxCol, col);
        }, parentCol);
        effectiveColMap[nodeId] = maxParentCol + 1;
      }
    });

    const columnGroups = {};
    orderedNodeIds.forEach(nodeId => {
      const col = effectiveColMap[nodeId] || 0;
      if (!columnGroups[col]) columnGroups[col] = [];
      columnGroups[col].push(nodeId);
    });

    const columnKeys = Object.keys(columnGroups).map(Number).sort((a, b) => a - b);
    const rowPosMap = {};
    columnKeys.forEach(col => {
      columnGroups[col].sort((a, b) => {
        const predsA = (reverseAdjacency[a] || []).filter(pid => typeof rowPosMap[pid] === 'number');
        const predsB = (reverseAdjacency[b] || []).filter(pid => typeof rowPosMap[pid] === 'number');
        const avgA = predsA.length ? predsA.reduce((sum, pid) => sum + rowPosMap[pid], 0) / predsA.length : statusRank(a);
        const avgB = predsB.length ? predsB.reduce((sum, pid) => sum + rowPosMap[pid], 0) / predsB.length : statusRank(b);
        if (Math.abs(avgA - avgB) > 0.001) return avgA - avgB;
        return statusRank(a) - statusRank(b);
      });
      columnGroups[col].forEach((nodeId, index) => { rowPosMap[nodeId] = index; });
    });

    const canvasHeight = canvasRef.current ? canvasRef.current.clientHeight : 680;
    const xPadding = 56;
    const yPadding = 44;
    const horizontalGap = Math.round(NODE_WIDTH * 0.5);
    const verticalGap = Math.round(NODE_HEIGHT * 0.5);
    const usableHeight = Math.max(320, canvasHeight - (yPadding * 2));

    const nextPos = {};
    columnKeys.forEach(col => {
      const ids = columnGroups[col] || [];
      const colHeight = (ids.length * NODE_HEIGHT) + ((ids.length - 1) * verticalGap);
      const startY = yPadding + Math.max(0, (usableHeight - colHeight) / 2);
      const x = xPadding + (col * (NODE_WIDTH + horizontalGap));
      ids.forEach((id, idx) => {
        nextPos[id] = { x, y: startY + (idx * (NODE_HEIGHT + verticalGap)) };
      });
    });

    setActiveGraph(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => ({ ...node, x: nextPos[node.id]?.x ?? node.x, y: nextPos[node.id]?.y ?? node.y })),
    }));

    const finalColumns = columnKeys.length || 1;
    const canvasWidth = canvasRef.current ? canvasRef.current.clientWidth : 1200;
    const maxVisibleColumns = Math.max(1, Math.floor((Math.max(320, canvasWidth - (xPadding * 2)) + horizontalGap) / (NODE_WIDTH + horizontalGap)));
    const fitsWidth = finalColumns <= maxVisibleColumns;
    showToast(
      fitsWidth
        ? t('چیدمان مرتب شد و تا حد ممکن در عرض صفحه جا داده شد.', 'Layout cleaned and fitted to current width where possible.')
        : t('چیدمان مرتب شد. به دلیل تعداد/ارتباط بالا، بخشی از مسیرها با اسکرول افقی قابل مشاهده است.', 'Layout cleaned. Due to complexity, additional nodes are available via horizontal scroll.'),
      'success'
    );
  };

  const renderStateMachineCanvas = (props) => {
    const {
      activeMachine,
      t,
      entityLabelByCode,
      Sparkles,
      Button,
      currentTypeDirty,
      isLoading,
      Save,
      onAutoLayout,
      onCancel,
      onSave,
      isRtl,
      statusUsageSet,
      handlePaletteDragStart,
      canvasRef,
      handleCanvasDrop,
      setSelectedNodeId,
      setSelectedEdgeId,
      contentSize,
      activeGraph,
      nodeById,
      selectedEdgeId,
      edgeFormLabelById,
      setPendingSourceId,
      pendingSourceId,
      statusMap,
      selectedNodeId,
      tryConnect,
      openNodeSettingsModal,
      setDragging,
      Link2,
      UserRound,
      Database,
      Trash2,
      removeNodeWithRelations,
      assigneeConfigCountByNode,
      dataEntryConfigCountByNode,
      openNodeDataEntryModal,
    } = props;

    return (
      <>
        {activeMachine && (
          <div className="mt-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/30 px-3 py-2 text-[12px] text-indigo-900 dark:text-indigo-100">
            <span className="font-bold">{t('روال', 'Machine')}:</span> {activeMachine.machine_title || activeMachine.machine_code || '-'}
            {' | '}
            <span className="font-bold">{t('موجودیت', 'Entity')}:</span> {entityLabelByCode[activeMachine.entity_code] || activeMachine.entity_code || '-'}
            {' | '}
            <span className="font-bold">{t('شرط ورود', 'Entry Condition')}:</span> {activeMachine.entry_condition_text || '-'}
          </div>
        )}

        <div className="mt-2">
          <div className="flex items-center justify-between gap-3">
            <div id="state-machine-design-header" className="flex-1 min-w-0 text-[12px] text-slate-600 dark:text-slate-300 font-semibold">
              {t('در حال طراحی روال انتخاب‌شده', 'Designing selected state machine')}
            </div>
            <div className="shrink-0 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" icon={Sparkles} onClick={onAutoLayout}>{t('مرتب سازی چیدمان', 'Auto Layout')}</Button>
              <Button size="sm" variant="outline" onClick={onCancel} disabled={!currentTypeDirty || isLoading}>{t('لغو', 'Cancel')}</Button>
              <Button size="sm" variant={currentTypeDirty ? 'primary' : 'outline'} icon={Save} isLoading={isLoading} disabled={!currentTypeDirty || isLoading} onClick={() => onSave()}>
                {t('ذخیره طراحی روال', 'Save Machine Design')}
              </Button>
            </div>
          </div>
        </div>

        <div id="state-machine-design-panel" role="tabpanel" aria-labelledby="state-machine-design-header" className="flex-1 min-h-0 flex flex-row gap-3">
          <div className="w-[125px] sm:w-[140px] shrink-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-2 overflow-auto custom-scrollbar">
            <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200 mb-2">{t('وضعیت های مجاز', 'Allowed Statuses')}</div>
            <div className="space-y-2">
              {STATUS_LIST.map(status => {
                const used = statusUsageSet.has(status.value);
                return (
                  <div
                    key={status.value}
                    draggable
                    onDragStart={(event) => handlePaletteDragStart(event, status.value)}
                    className={`select-none px-2 py-1.5 rounded-lg border text-[11px] font-bold leading-4 cursor-grab active:cursor-grabbing bg-gradient-to-br ${status.color} ${used ? 'opacity-45' : 'opacity-100'}`}
                    title={t('بکش و روی بوم رها کن', 'Drag and drop into canvas')}
                  >
                    {isRtl ? status.fa : status.en}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={canvasRef}
            className="flex-1 min-h-[420px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-[radial-gradient(circle_at_1px_1px,_#e2e8f0_1px,_transparent_0)] [background-size:16px_16px] dark:bg-[radial-gradient(circle_at_1px_1px,_#334155_1px,_transparent_0)] overflow-auto relative"
            dir="ltr"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleCanvasDrop}
            onClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
          >
            <div style={{ width: contentSize.width, height: contentSize.height, position: 'relative' }}>
              <svg className="absolute inset-0 pointer-events-none" style={{ width: contentSize.width, height: contentSize.height }} viewBox={`0 0 ${contentSize.width} ${contentSize.height}`}>
                {activeGraph.edges.map(edge => {
                  const source = nodeById[edge.source];
                  const target = nodeById[edge.target];
                  if (!source || !target) return null;
                  const geometry = getEdgeGeometry(source, target);
                  const isSelected = selectedEdgeId === edge.id;
                  const edgeForms = edge?.settings?.data_entry?.forms;
                  const hasDataEntryForm = Array.isArray(edgeForms) && edgeForms.some(Boolean);
                  const strokeColor = isSelected ? '#dc2626' : (hasDataEntryForm ? '#16a34a' : '#4f46e5');
                  return (
                    <g key={edge.id}>
                      <path d={geometry.pathD} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={isSelected ? 1 : 0.9} />
                      <polygon points={`${geometry.end.x},${geometry.end.y} ${geometry.arrowLeft.x},${geometry.arrowLeft.y} ${geometry.arrowRight.x},${geometry.arrowRight.y}`} fill={strokeColor} opacity={isSelected ? 1 : 0.95} />
                    </g>
                  );
                })}
              </svg>

              {activeGraph.edges.map(edge => {
                const source = nodeById[edge.source];
                const target = nodeById[edge.target];
                if (!source || !target) return null;
                const geometry = getEdgeGeometry(source, target);
                const xs = geometry.points.map(point => point.x);
                const ys = geometry.points.map(point => point.y);
                const left = Math.min(...xs) - 18;
                const top = Math.min(...ys) - 18;
                const width = Math.max(30, Math.max(...xs) - left + 18);
                const height = Math.max(30, Math.max(...ys) - top + 18);
                return (
                  <button
                    type="button"
                    key={`hit-${edge.id}`}
                    className="absolute border-0 bg-transparent"
                    style={{ left, top, width, height }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                    title={`${t('انتخاب مسیر', 'Select edge')} | ${edgeFormLabelById[edge.id] || '-'}`}
                  />
                );
              })}

              {activeGraph.nodes.map(node => {
                const status = statusMap[node.status];
                const incomingCount = activeGraph.edges.filter(edge => edge.target === node.id).length;
                const outgoingCount = activeGraph.edges.filter(edge => edge.source === node.id).length;
                const isSelected = node.id === selectedNodeId;
                const isConnectSource = pendingSourceId === node.id;
                const hasOutgoing = outgoingCount > 0;
                const hasAssigneeData = assigneeConfigCountByNode[node.id] > 0;
                const hasDataEntry = dataEntryConfigCountByNode[node.id] > 0;
                return (
                  <div
                    key={node.id}
                    data-node-card="1"
                    className={`absolute rounded-2xl border shadow-sm transition ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-300/50' : 'border-slate-200 dark:border-slate-600'} ${isConnectSource ? 'ring-2 ring-amber-300' : ''} bg-white dark:bg-slate-800`}
                    style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT, left: node.x, top: node.y }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (pendingSourceId && pendingSourceId !== node.id) {
                        tryConnect(pendingSourceId, node.id);
                        setPendingSourceId(null);
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                        return;
                      }
                      if (!pendingSourceId && selectedNodeId === node.id) {
                        openNodeSettingsModal(node.id);
                        return;
                      }
                      setSelectedNodeId(node.id);
                      setSelectedEdgeId(null);
                    }}
                  >
                    <div className="h-full flex flex-col">
                      <div className={`h-1.5 rounded-t-2xl bg-gradient-to-r ${status?.color || 'from-slate-100 to-slate-200'}`} />
                      <div className="px-3 py-2 cursor-move" onMouseDown={(event) => {
                        event.stopPropagation();
                        const card = event.currentTarget.closest('[data-node-card="1"]');
                        const rect = card ? card.getBoundingClientRect() : event.currentTarget.getBoundingClientRect();
                        setDragging({ id: node.id, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top });
                      }}>
                        <div className="text-[12px] font-black text-slate-800 dark:text-slate-100 leading-5">{isRtl ? status?.fa : status?.en}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-1">{t('ورودی', 'In')} {incomingCount} | {t('خروجی', 'Out')} {outgoingCount}</div>
                        {assigneeConfigCountByNode[node.id] > 0 && <div className="mt-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{t('قواعد انجام‌دهنده', 'Assignee Rules')}: {assigneeConfigCountByNode[node.id]}</div>}
                        {dataEntryConfigCountByNode[node.id] > 0 && <div className="mt-1 text-[10px] font-bold text-sky-600 dark:text-sky-400">{t('فرم روی خطوط خروجی', 'Outgoing Edge Forms')}: {dataEntryConfigCountByNode[node.id]}</div>}
                      </div>
                      <div className="px-2 pb-2 mt-auto flex items-center justify-end gap-1">
                        <button type="button" title={t('اتصال خروجی', 'Connect Out')} aria-label={t('اتصال خروجی', 'Connect Out')} className={`h-7 w-7 inline-flex items-center justify-center rounded-lg border transition ${hasOutgoing ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-50' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'}`} onClick={(event) => { event.stopPropagation(); setSelectedNodeId(node.id); setPendingSourceId(node.id); setSelectedEdgeId(null); }}><Link2 size={14} /></button>
                        {hasOutgoing && <button type="button" title={t('تنظیم انجام‌دهنده', 'Configure Assignee')} aria-label={t('تنظیم انجام‌دهنده', 'Configure Assignee')} className={`h-7 w-7 inline-flex items-center justify-center rounded-lg border transition ${hasAssigneeData ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-50' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'}`} onClick={(event) => { event.stopPropagation(); setSelectedNodeId(node.id); setSelectedEdgeId(null); openNodeSettingsModal(node.id); }}><UserRound size={14} /></button>}
                        {hasOutgoing && <button type="button" title={t('تنظیم اطلاعات', 'Configure Data')} aria-label={t('تنظیم اطلاعات', 'Configure Data')} className={`h-7 w-7 inline-flex items-center justify-center rounded-lg border transition ${hasDataEntry ? 'border-sky-200 text-sky-700 hover:bg-sky-50' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'}`} onClick={(event) => { event.stopPropagation(); setSelectedNodeId(node.id); setSelectedEdgeId(null); openNodeDataEntryModal(node.id); }}><Database size={14} /></button>}
                        <button type="button" title={t('حذف', 'Delete')} aria-label={t('حذف', 'Delete')} className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" onClick={(event) => { event.stopPropagation(); removeNodeWithRelations(node.id); }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  window.StateMachineCanvasModule = {
    STATUS_LIST,
    NODE_WIDTH,
    NODE_HEIGHT,
    CANVAS_SAFE_MARGIN,
    createNode,
    createEdge,
    getEdgeGeometry,
    autoLayoutGraph,
    renderStateMachineCanvas,
  };
})();