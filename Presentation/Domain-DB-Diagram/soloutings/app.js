(function initDbDiagramApp() {
  const {
    openSchemaFolder: fsOpenSchemaFolder,
    readMarkdownFiles: fsReadMarkdownFiles,
    writeMarkdownFile: fsWriteMarkdownFile
  } = window.FileSystemBridge;

  const {
    convertMarkdownToSchema: mdConvertMarkdownToSchema,
    generateMarkdown: mdGenerateMarkdown,
    recomputeRelations: mdRecomputeRelations
  } = window.MarkdownParser;

  const {
    createDiagram: diagramCreateDiagram,
    autoLayoutTables: diagramAutoLayoutTables
  } = window.DiagramEngine;

  const state = {
    schema: { tables: [], relations: [] },
    folderHandle: null,
    selectedTableId: null,
    saveTimer: null,
    pendingSave: new Set(),
    hasLoadedOnce: false
  };

  const ui = {
    openFolderBtn: document.getElementById("openFolderBtn"),
    reloadBtn: document.getElementById("reloadBtn"),
    statusText: document.getElementById("statusText"),
    emptyEditor: document.getElementById("emptyEditor"),
    editorContent: document.getElementById("editorContent"),
    tableNameInput: document.getElementById("tableNameInput"),
    columnsList: document.getElementById("columnsList"),
    addColumnBtn: document.getElementById("addColumnBtn"),
    fkSuggestions: document.getElementById("fkSuggestions"),
    columnEditorTemplate: document.getElementById("columnEditorTemplate")
  };

  const diagram = diagramCreateDiagram({
    canvasEl: document.getElementById("canvas"),
    viewportEl: document.getElementById("viewport"),
    tablesLayerEl: document.getElementById("tablesLayer"),
    relationsEl: document.getElementById("relationsLayer"),
    onSelect(tableId) {
      state.selectedTableId = tableId;
      diagram.setSelectedTable(tableId);
      renderEditor();
    },
    onMove() {
      diagram.refreshRelations();
    }
  });

  function setStatus(message, isError = false) {
    ui.statusText.textContent = message;
    ui.statusText.style.color = isError ? "#a63636" : "";
  }

  function getSelectedTable() {
    return state.schema.tables.find((table) => table.id === state.selectedTableId) || null;
  }

  function scheduleWrite(table) {
    if (!table?.fileHandle) {
      return;
    }

    state.pendingSave.add(table.id);
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(async () => {
      const ids = [...state.pendingSave];
      state.pendingSave.clear();

      for (const id of ids) {
        const current = state.schema.tables.find((item) => item.id === id);
        if (!current?.fileHandle) {
          continue;
        }

        const markdown = mdGenerateMarkdown(current);
        await fsWriteMarkdownFile(current.fileHandle, markdown);
      }

      setStatus("Saved markdown updates");
    }, 450);
  }

  function updateFkSuggestions() {
    const options = [];
    state.schema.tables.forEach((table) => {
      table.columns.forEach((column) => {
        options.push(`<option value="${table.name}.${column.name}"></option>`);
      });
    });
    ui.fkSuggestions.innerHTML = options.join("\n");
  }

  function renameTableReferences(oldName, newName) {
    if (!oldName || oldName === newName) {
      return;
    }

    state.schema.tables.forEach((table) => {
      let touched = false;
      table.columns.forEach((column) => {
        const raw = String(column.fk || "").trim();
        if (!raw) {
          return;
        }

        const match = raw.match(/^([^.\s]+)\.(.+)$/);
        if (!match) {
          return;
        }

        const targetTable = match[1];
        const targetColumn = match[2];
        if (targetTable === oldName) {
          column.fk = `${newName}.${targetColumn}`;
          touched = true;
        }
      });

      if (touched) {
        scheduleWrite(table);
      }
    });
  }

  function renderEditor() {
    const table = getSelectedTable();
    if (!table) {
      ui.emptyEditor.classList.remove("hidden");
      ui.editorContent.classList.add("hidden");
      return;
    }

    ui.emptyEditor.classList.add("hidden");
    ui.editorContent.classList.remove("hidden");
    ui.tableNameInput.value = table.name;

    ui.columnsList.innerHTML = "";
    table.columns.forEach((column, index) => {
      const fragment = ui.columnEditorTemplate.content.cloneNode(true);
      const rowEl = fragment.querySelector(".column-editor-row");
      const nameInput = rowEl.querySelector("input[data-field='name']");
      const typeInput = rowEl.querySelector("input[data-field='type']");
      const pkInput = rowEl.querySelector("input[data-field='pk']");
      const fkInput = rowEl.querySelector("input[data-field='fk']");
      const deleteBtn = rowEl.querySelector("button[data-action='delete']");

      nameInput.value = column.name;
      typeInput.value = column.type || "";
      pkInput.checked = Boolean(column.pk);
      fkInput.value = column.fk || "";

      nameInput.addEventListener("input", () => {
        column.name = nameInput.value.trim();
        mdRecomputeRelations(state.schema);
        updateFkSuggestions();
        diagram.render(state.schema, state.selectedTableId);
        scheduleWrite(table);
      });

      typeInput.addEventListener("input", () => {
        column.type = typeInput.value.trim() || "string";
        diagram.render(state.schema, state.selectedTableId);
        scheduleWrite(table);
      });

      pkInput.addEventListener("change", () => {
        column.pk = pkInput.checked;
        diagram.render(state.schema, state.selectedTableId);
        scheduleWrite(table);
      });

      fkInput.addEventListener("input", () => {
        column.fk = fkInput.value.trim();
        mdRecomputeRelations(state.schema);
        diagram.render(state.schema, state.selectedTableId);
        scheduleWrite(table);
      });

      deleteBtn.addEventListener("click", () => {
        table.columns.splice(index, 1);
        mdRecomputeRelations(state.schema);
        updateFkSuggestions();
        diagram.render(state.schema, state.selectedTableId);
        renderEditor();
        scheduleWrite(table);
      });

      ui.columnsList.appendChild(fragment);
    });
  }

  async function loadSchemaFromFolder() {
    if (!state.folderHandle) {
      return;
    }

    const files = await fsReadMarkdownFiles(state.folderHandle);
    if (!files.length) {
      state.schema = { tables: [], relations: [] };
      state.selectedTableId = null;
      diagram.render(state.schema, null);
      renderEditor();
      setStatus("No markdown files found in selected folder", true);
      return;
    }

    state.schema = mdConvertMarkdownToSchema(files);
    diagramAutoLayoutTables(state.schema);

    if (!state.schema.tables.find((table) => table.id === state.selectedTableId)) {
      state.selectedTableId = state.schema.tables[0]?.id || null;
    }

    updateFkSuggestions();
    diagram.render(state.schema, state.selectedTableId);
    renderEditor();
    ui.reloadBtn.disabled = false;

    const firstLoadHint = state.hasLoadedOnce ? "Schema reloaded" : "Schema loaded";
    state.hasLoadedOnce = true;
    setStatus(`${firstLoadHint}: ${state.schema.tables.length} tables`);
  }

  ui.openFolderBtn.addEventListener("click", async () => {
    try {
      setStatus("Waiting for folder selection...");
      state.folderHandle = await fsOpenSchemaFolder();
      await loadSchemaFromFolder();
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("Folder selection canceled", true);
        return;
      }

      setStatus(error.message || "Unable to open folder", true);
    }
  });

  ui.reloadBtn.addEventListener("click", async () => {
    try {
      setStatus("Reloading markdown files...");
      await loadSchemaFromFolder();
    } catch (error) {
      setStatus(error.message || "Failed to reload", true);
    }
  });

  ui.tableNameInput.addEventListener("input", () => {
    const table = getSelectedTable();
    if (!table) {
      return;
    }

    const oldName = table.name;
    const nextName = ui.tableNameInput.value.trim();
    if (!nextName) {
      return;
    }

    table.name = nextName;
    renameTableReferences(oldName, nextName);
    mdRecomputeRelations(state.schema);
    updateFkSuggestions();
    diagram.render(state.schema, state.selectedTableId);
    scheduleWrite(table);
  });

  ui.addColumnBtn.addEventListener("click", () => {
    const table = getSelectedTable();
    if (!table) {
      return;
    }

    table.columns.push({
      name: `NewColumn${table.columns.length + 1}`,
      type: "string",
      pk: false,
      fk: ""
    });

    mdRecomputeRelations(state.schema);
    updateFkSuggestions();
    diagram.render(state.schema, state.selectedTableId);
    renderEditor();
    scheduleWrite(table);
  });

  if (!window.showDirectoryPicker) {
    setStatus("This browser does not support File System Access API", true);
  }
})();
