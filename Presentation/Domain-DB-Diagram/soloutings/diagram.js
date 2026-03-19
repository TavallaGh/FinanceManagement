function tableSizeForLayout(table) {
  const baseHeight = 46;
  const rowHeight = 26;
  return {
    width: 250,
    height: baseHeight + table.columns.length * rowHeight + 8
  };
}

function autoLayoutTables(schema) {
  if (!window.dagre || !schema.tables.length) {
    return;
  }

  const g = new window.dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    ranksep: 110,
    nodesep: 55,
    marginx: 70,
    marginy: 70
  });
  g.setDefaultEdgeLabel(() => ({}));

  schema.tables.forEach((table) => {
    const size = tableSizeForLayout(table);
    g.setNode(table.id, { width: size.width, height: size.height });
  });

  schema.relations.forEach((relation) => {
    if (relation.toTableId) {
      g.setEdge(relation.fromTableId, relation.toTableId);
    }
  });

  window.dagre.layout(g);

  schema.tables.forEach((table) => {
    const node = g.node(table.id);
    if (!node) {
      return;
    }

    table.position = {
      x: Math.round(node.x - node.width / 2),
      y: Math.round(node.y - node.height / 2)
    };
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createDiagram({ canvasEl, viewportEl, tablesLayerEl, relationsEl, onSelect, onMove }) {
  const transform = { x: 120, y: 80, scale: 1 };
  let activeTableId = null;
  let schemaRef = null;

  function applyTransform() {
    viewportEl.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
  }

  function getColumnAnchor(tableId, columnName, side) {
    const tableEl = tablesLayerEl.querySelector(`[data-table-id="${tableId}"]`);
    if (!tableEl) {
      return null;
    }

    const rowEl = tableEl.querySelector(`[data-column-name="${CSS.escape(columnName)}"]`);
    const y = rowEl ? Number(rowEl.dataset.anchorY) : Number(tableEl.dataset.anchorYCenter || 0);
    const x = side === "left" ? Number(tableEl.dataset.anchorXLeft) : Number(tableEl.dataset.anchorXRight);

    return { x, y };
  }

  function renderRelations() {
    if (!schemaRef) {
      relationsEl.innerHTML = "";
      return;
    }

    const fragments = [];
    schemaRef.relations.forEach((relation) => {
      const from = getColumnAnchor(relation.fromTableId, relation.fromColumn, "right");
      if (!from) {
        return;
      }

      const to = relation.toTableId
        ? getColumnAnchor(relation.toTableId, relation.toColumn, "left")
        : { x: from.x + 140, y: from.y };

      if (!to) {
        return;
      }

      const curveOffset = Math.max(40, Math.abs(to.x - from.x) * 0.35);
      const d = [
        `M ${from.x} ${from.y}`,
        `C ${from.x + curveOffset} ${from.y}, ${to.x - curveOffset} ${to.y}, ${to.x} ${to.y}`
      ].join(" ");

      fragments.push(`<path class="relation-line ${relation.unresolved ? "unresolved" : ""}" d="${d}" />`);
    });

    relationsEl.innerHTML = fragments.join("\n");
  }

  function addDragBehavior(tableEl, table) {
    const headerEl = tableEl.querySelector(".table-header");
    if (!headerEl) {
      return;
    }

    headerEl.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      onSelect(table.id);

      const start = { x: event.clientX, y: event.clientY };
      const origin = { ...table.position };

      function onMouseMove(moveEvent) {
        const dx = (moveEvent.clientX - start.x) / transform.scale;
        const dy = (moveEvent.clientY - start.y) / transform.scale;

        table.position.x = Math.round(origin.x + dx);
        table.position.y = Math.round(origin.y + dy);
        tableEl.style.left = `${table.position.x}px`;
        tableEl.style.top = `${table.position.y}px`;

        updateAnchors(tableEl);
        renderRelations();
        onMove(table.id, table.position);
      }

      function onMouseUp() {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  function updateAnchors(tableEl) {
    const left = Number.parseFloat(tableEl.style.left || "0");
    const top = Number.parseFloat(tableEl.style.top || "0");
    const width = tableEl.offsetWidth;
    const headerHeight = tableEl.querySelector(".table-header")?.offsetHeight || 0;
    const rows = [...tableEl.querySelectorAll(".col-row")];

    tableEl.dataset.anchorXLeft = String(left);
    tableEl.dataset.anchorXRight = String(left + width);
    tableEl.dataset.anchorYCenter = String(top + headerHeight + Math.max(16, rows.length * 12));

    rows.forEach((rowEl, index) => {
      const rowY = top + headerHeight + index * 26 + 13;
      rowEl.dataset.anchorY = String(rowY);
    });
  }

  function renderTables(schema, selectedTableId = null) {
    schemaRef = schema;
    activeTableId = selectedTableId;
    tablesLayerEl.innerHTML = "";

    schema.tables.forEach((table) => {
      const tableEl = document.createElement("article");
      tableEl.className = "db-table" + (table.id === activeTableId ? " selected" : "");
      tableEl.dataset.tableId = table.id;
      tableEl.style.left = `${table.position.x}px`;
      tableEl.style.top = `${table.position.y}px`;

      const columnMarkup = table.columns
        .map((column) => {
          const classes = ["col-row"];
          if (column.pk) {
            classes.push("pk");
          }
          if (column.fk) {
            classes.push("fk");
          }

          const leftText = `${column.pk ? "PK " : ""}${column.fk ? "FK " : ""}${column.name} : ${column.type}`;
          return `<div class="${classes.join(" ")}" data-column-name="${column.name.replace(/"/g, "&quot;")}">
            <span>${leftText}</span>
            <span class="col-right">${column.fk || ""}</span>
          </div>`;
        })
        .join("");

      tableEl.innerHTML = `
        <div class="table-header">${table.name}</div>
        <div class="table-columns">${columnMarkup}</div>
      `;

      tableEl.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(table.id);
      });

      addDragBehavior(tableEl, table);
      tablesLayerEl.appendChild(tableEl);
      updateAnchors(tableEl);
    });

    renderRelations();
  }

  function setupPanAndZoom() {
    canvasEl.addEventListener("wheel", (event) => {
      event.preventDefault();

      const delta = event.deltaY < 0 ? 1.08 : 0.92;
      const oldScale = transform.scale;
      const newScale = clamp(oldScale * delta, 0.35, 2.5);

      const canvasRect = canvasEl.getBoundingClientRect();
      const cursorX = event.clientX - canvasRect.left;
      const cursorY = event.clientY - canvasRect.top;

      const worldX = (cursorX - transform.x) / oldScale;
      const worldY = (cursorY - transform.y) / oldScale;

      transform.scale = newScale;
      transform.x = cursorX - worldX * newScale;
      transform.y = cursorY - worldY * newScale;
      applyTransform();
    }, { passive: false });

    canvasEl.addEventListener("mousedown", (event) => {
      if (event.target.closest(".db-table")) {
        return;
      }

      canvasEl.classList.add("panning");
      const start = { x: event.clientX, y: event.clientY };
      const origin = { x: transform.x, y: transform.y };

      function onMouseMove(moveEvent) {
        transform.x = origin.x + (moveEvent.clientX - start.x);
        transform.y = origin.y + (moveEvent.clientY - start.y);
        applyTransform();
      }

      function onMouseUp() {
        canvasEl.classList.remove("panning");
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  setupPanAndZoom();
  applyTransform();

  return {
    render: renderTables,
    refreshRelations: renderRelations,
    setSelectedTable(tableId) {
      activeTableId = tableId;
      if (schemaRef) {
        renderTables(schemaRef, activeTableId);
      }
    }
  };
}

window.DiagramEngine = {
  autoLayoutTables,
  createDiagram
};
