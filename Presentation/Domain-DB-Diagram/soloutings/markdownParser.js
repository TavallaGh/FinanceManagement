function parseBool(value) {
  const text = String(value || "").trim().toLowerCase();
  return text === "true" || text === "yes" || text === "1" || text === "pk";
}

function parseTableRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /\|/.test(line) && /column/i.test(line) && /type/i.test(line));

  if (headerIndex < 0 || headerIndex + 2 >= lines.length) {
    return [];
  }

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || !line.startsWith("|")) {
      break;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (!cells[0]) {
      continue;
    }

    rows.push({
      name: cells[0] || "",
      type: cells[1] || "string",
      pk: parseBool(cells[2]),
      fk: cells[3] || ""
    });
  }

  return rows;
}

function parseMarkdown(mdText, fallbackName = "Table") {
  const titleMatch = mdText.match(/^#\s+(.+)$/m);
  const name = titleMatch?.[1]?.trim() || fallbackName;
  const columns = parseTableRows(mdText);

  return {
    name,
    columns
  };
}

function convertMarkdownToSchema(fileEntries) {
  const tables = fileEntries.map((entry, index) => {
    const fallbackName = entry.name.replace(/\.md$/i, "");
    const parsed = parseMarkdown(entry.content, fallbackName);

    return {
      id: `t_${index}_${fallbackName.replace(/\W+/g, "_")}`,
      fileName: entry.name,
      fileHandle: entry.handle,
      name: parsed.name,
      position: { x: 100 + index * 70, y: 100 + index * 50 },
      columns: parsed.columns
    };
  });

  const schema = {
    tables,
    relations: []
  };

  recomputeRelations(schema);
  return schema;
}

function recomputeRelations(schema) {
  const tableByName = new Map(schema.tables.map((table) => [table.name, table]));
  const relations = [];

  schema.tables.forEach((table) => {
    table.columns.forEach((column) => {
      const raw = String(column.fk || "").trim();
      if (!raw) {
        return;
      }

      const match = raw.match(/^([^.\s]+)\.([^.\s]+)$/);
      if (!match) {
        relations.push({
          fromTableId: table.id,
          fromColumn: column.name,
          toTableId: null,
          toColumn: null,
          rawFk: raw,
          unresolved: true
        });
        return;
      }

      const [, targetTableName, targetColumnName] = match;
      const targetTable = tableByName.get(targetTableName);

      relations.push({
        fromTableId: table.id,
        fromColumn: column.name,
        toTableId: targetTable?.id || null,
        toColumn: targetColumnName,
        rawFk: raw,
        unresolved: !targetTable
      });
    });
  });

  schema.relations = relations;
}

function padRow(cells, sizes) {
  return `| ${cells[0].padEnd(sizes[0], " ")} | ${cells[1].padEnd(sizes[1], " ")} | ${cells[2].padEnd(sizes[2], " ")} | ${cells[3].padEnd(sizes[3], " ")} |`;
}

function generateMarkdown(table) {
  const rows = table.columns.map((column) => [
    column.name || "",
    column.type || "string",
    column.pk ? "true" : "",
    column.fk || ""
  ]);

  const allRows = [["Column", "Type", "PK", "FK"], ...rows];
  const sizes = [0, 0, 0, 0];
  allRows.forEach((row) => {
    row.forEach((cell, i) => {
      sizes[i] = Math.max(sizes[i], String(cell).length);
    });
  });

  const header = padRow(["Column", "Type", "PK", "FK"], sizes);
  const divider = padRow(sizes.map((size) => "-".repeat(Math.max(size, 2))), sizes);
  const body = rows.map((row) => padRow(row, sizes));

  return [`# ${table.name}`, "", header, divider, ...body, ""].join("\n");
}

window.MarkdownParser = {
  parseMarkdown,
  convertMarkdownToSchema,
  recomputeRelations,
  generateMarkdown
};
