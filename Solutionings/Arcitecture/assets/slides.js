(function () {
  const slides = [
    { file: "index.html", title: "عنوان" },
    { file: "01-context-mvp.html", title: "Context MVP و مسیر اجرا" },
    { file: "02-problem-goals-scope.html", title: "Problem + Goals + Scope" },
    { file: "03-architecture-principles.html", title: "اصول معماری + تصمیم کلان" },
    { file: "04-tech-stack-overview.html", title: "Tech Stack Overview" },
    { file: "05-high-level-system-diagram.html", title: "High-Level Diagram" },
    { file: "06-context-diagram.html", title: "Context Diagram" },
    { file: "07-container-diagram.html", title: "Container Diagram" },
    { file: "08-proposed-architecture-layered.html", title: "Proposed Layered Architecture" },
    { file: "09-module-structure.html", title: "Module Structure + Presentation Rule" },
    { file: "10-cqrs-rules.html", title: "CQRS + Data Strategy" },
    { file: "11-read-performance.html", title: "Read Performance + Redis Strategy" },
    { file: "12-integrations.html", title: "Integrations" },
    { file: "13-workflow-workbench.html", title: "Workflow / Workbench" },
    { file: "14-access-control.html", title: "Access Control" },
    { file: "15-observability-reliability.html", title: "Observability" },
    { file: "16-testing-strategy.html", title: "Testing Strategy" },
    { file: "17-folder-structure.html", title: "Folder Structure" },
    { file: "18-release-versioning.html", title: "Release & Versioning" },
    { file: "19-evolution-plan.html", title: "MVP → SoA" },
    { file: "20-risks-mitigations.html", title: "Risks & Mitigations" },
    { file: "21-summary-decisions.html", title: "Summary / Decisions" },
    { file: "22-zachman-framework.html", title: "Zachman Framework" },
    { file: "23-rag-architecture-diagram.html", title: "RAG Architecture Diagram" },
    { file: "24-agent-workflow-diagram.html", title: "Agent Workflow Diagram" }
  ];

  const current = location.pathname.split("/").pop() || "index.html";
  const idx = Math.max(0, slides.findIndex(s => s.file === current));

  const footer = document.getElementById("slide-footer");
  if (!footer) return;

  const prev = idx > 0 ? slides[idx - 1].file : null;
  const next = idx < slides.length - 1 ? slides[idx + 1].file : null;

  footer.innerHTML = `
    <div class="nav-controls">
      <a class="nav-btn ${prev ? "" : "disabled"}" href="${prev || "#"}">▶ قبلی</a>
      <span class="progress">اسلاید ${idx + 1} از ${slides.length}</span>
      <a class="nav-btn ${next ? "" : "disabled"}" href="${next || "#"}">بعدی ◀</a>
    </div>
    <div class="thumbs" id="thumbs"></div>
  `;

  const thumbs = footer.querySelector("#thumbs");
  slides.forEach((slide, i) => {
    const a = document.createElement("a");
    a.href = slide.file;
    a.className = "thumb" + (i === idx ? " active" : "");
    a.setAttribute("aria-label", `اسلاید ${i + 1}: ${slide.title}`);
    a.title = `اسلاید ${i + 1} از ${slides.length} — ${slide.title}`;
    a.innerHTML = `
      <span class="thumb-label">${i + 1}</span>
    `;
    thumbs.appendChild(a);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" && next) location.href = next;
    if (event.key === "ArrowLeft" && prev) location.href = prev;
  });
})();
