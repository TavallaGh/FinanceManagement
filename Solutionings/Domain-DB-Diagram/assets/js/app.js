import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

const focusGroups = {
  all: [],
  core: ["ORGANIZATIONS", "BRANCHES", "FISCAL_PERIODS", "LEDGERS", "ACCOUNTS", "VOUCHER_TYPES", "AUTO_NUMBER_SEQUENCES"],
  security: ["USER_ACCOUNTS", "ROLES", "USER_ORGANIZATION_ROLES", "ORGANIZATIONS"],
  masters: ["PARTIES", "COST_CENTERS", "PROJECTS", "ORGANIZATIONS"],
  transactions: ["JOURNAL_ENTRIES", "JOURNAL_ENTRY_LINES", "ACCOUNTS", "PARTIES", "COST_CENTERS", "PROJECTS", "FISCAL_PERIODS", "BRANCHES", "VOUCHER_TYPES"]
};

let panZoomInstance = null;

function getDiagramSvg() {
  return document.querySelector("#domainDiagram svg");
}

function getNodeName(node) {
  const textEl = node.querySelector("text");
  if (!textEl || !textEl.textContent) {
    return "";
  }
  const token = textEl.textContent.trim().split(/\s+/)[0] || "";
  return token.toUpperCase();
}

function applyFocus(presetKey) {
  const svg = getDiagramSvg();
  if (!svg) {
    return;
  }

  const selected = new Set(focusGroups[presetKey] || []);
  const nodes = svg.querySelectorAll("g.node");

  nodes.forEach((node) => {
    node.classList.remove("is-muted", "is-active");
    if (presetKey === "all") {
      return;
    }

    const entity = getNodeName(node);
    if (selected.has(entity)) {
      node.classList.add("is-active");
    } else {
      node.classList.add("is-muted");
    }
  });
}

function initPanZoom() {
  const svg = getDiagramSvg();
  if (!svg || typeof window.svgPanZoom !== "function") {
    return;
  }

  if (panZoomInstance) {
    panZoomInstance.destroy();
  }

  panZoomInstance = window.svgPanZoom(svg, {
    zoomEnabled: true,
    controlIconsEnabled: false,
    fit: true,
    center: true,
    minZoom: 0.3,
    maxZoom: 8,
    zoomScaleSensitivity: 0.25,
    mouseWheelZoomEnabled: true,
    panEnabled: true
  });
}

function downloadFile(name, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportSvg() {
  const svg = getDiagramSvg();
  if (!svg) {
    return;
  }
  const serialized = new XMLSerializer().serializeToString(svg);
  downloadFile("accounting-domain-diagram.svg", serialized, "image/svg+xml;charset=utf-8");
}

function exportPng() {
  const svg = getDiagramSvg();
  if (!svg) {
    return;
  }

  const serialized = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = function () {
    const width = Math.max(1600, image.width || 1600);
    const height = Math.max(900, image.height || 900);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        URL.revokeObjectURL(url);
        return;
      }
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "accounting-domain-diagram.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(pngUrl);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  image.src = url;
}

function togglePresentation() {
  const panel = document.getElementById("diagramPanel");
  if (!panel) {
    return;
  }

  panel.classList.toggle("presentation-mode");

  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    panel.requestFullscreen().catch(() => {});
  }
}

function bindEvents() {
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const resetViewBtn = document.getElementById("resetViewBtn");
  const fitViewBtn = document.getElementById("fitViewBtn");
  const applyFocusBtn = document.getElementById("applyFocusBtn");
  const clearFocusBtn = document.getElementById("clearFocusBtn");
  const focusPreset = document.getElementById("focusPreset");
  const downloadSvgBtn = document.getElementById("downloadSvgBtn");
  const downloadPngBtn = document.getElementById("downloadPngBtn");
  const presentationBtn = document.getElementById("presentationBtn");

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", () => panZoomInstance && panZoomInstance.zoomIn());
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", () => panZoomInstance && panZoomInstance.zoomOut());
  }
  if (resetViewBtn) {
    resetViewBtn.addEventListener("click", () => {
      if (!panZoomInstance) {
        return;
      }
      panZoomInstance.resetZoom();
      panZoomInstance.center();
    });
  }
  if (fitViewBtn) {
    fitViewBtn.addEventListener("click", () => {
      if (!panZoomInstance) {
        return;
      }
      panZoomInstance.fit();
      panZoomInstance.center();
    });
  }
  if (applyFocusBtn && focusPreset) {
    applyFocusBtn.addEventListener("click", () => applyFocus(focusPreset.value));
  }
  if (clearFocusBtn) {
    clearFocusBtn.addEventListener("click", () => applyFocus("all"));
  }
  if (downloadSvgBtn) {
    downloadSvgBtn.addEventListener("click", exportSvg);
  }
  if (downloadPngBtn) {
    downloadPngBtn.addEventListener("click", exportPng);
  }
  if (presentationBtn) {
    presentationBtn.addEventListener("click", togglePresentation);
  }
}

async function loadDiagram() {
  const host = document.getElementById("domainDiagram");
  if (!host) {
    return;
  }

  const erdText = await fetch("./assets/data/domain-erd.mmd").then((res) => res.text());

  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose"
  });

  const { svg } = await mermaid.render("accountingDomainDiagram", erdText);
  host.innerHTML = svg;
  initPanZoom();
}

async function loadDbml() {
  const dbmlHost = document.getElementById("dbmlContent");
  if (!dbmlHost) {
    return;
  }

  const dbmlText = await fetch("./assets/data/domain-schema.dbml").then((res) => res.text());
  dbmlHost.textContent = dbmlText;
}

async function boot() {
  try {
    await Promise.all([loadDiagram(), loadDbml()]);
    bindEvents();
  } catch (error) {
    const host = document.getElementById("domainDiagram");
    if (host) {
      host.innerHTML = "<p style=\"color:#b91c1c;direction:rtl\">بارگذاری فایل های دیاگرام انجام نشد. فایل را با یک static server اجرا کنید.</p>";
    }
  }
}

window.addEventListener("DOMContentLoaded", boot);
