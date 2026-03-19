(function () {
  const slides = [
    { file: "index.html", title: "ساختار 3 سکشن ارائه", section: "index" },
    { file: "00-ai-overview.html", title: "کاور ارائه", section: "ai" },
    { file: "01-strategy-triad.html", title: "پایلوت از صفر تا انتخاب معماری", section: "ai" },
    { file: "02-time-cost-comparison.html", title: "ابزارهای سازمانی و اتوماسیون", section: "ai" },
    { file: "03-calculation-reconciliation.html", title: "جدول یکپارچه تصمیم گیری", section: "ai" },
    { file: "04-quality-reconciliation.html", title: "جدول یکپارچه کیفیت", section: "ai" },
    { file: "05-cost-reconciliation.html", title: "جدول یکپارچه هزینه", section: "ai" },
    { file: "06-smart-substitution.html", title: "تفسیر سه مولفه استراتژیک", section: "ai" },
    { file: "07-executive-decisions.html", title: "نقشه اجرایی پایلوت", section: "ai" },
    { file: "08-data-required-for-final-kpis.html", title: "داده های مورد نیاز", section: "ai" },
    { file: "09-product-vibe-prototype.html", title: "Product: Vibe Coding Prototype", section: "product" },
    { file: "10-product-before-after-timeline.html", title: "Product: Before/After Timeline", section: "product" },
    { file: "11-product-phase-flow.html", title: "Product: Phase Flow", section: "product" },
    { file: "12-product-proposal-diagram.html", title: "Product: Proposal Diagram", section: "product" },
    { file: "13-product-mvp-requirements.html", title: "Product: MVP Requirements", section: "product" },
    { file: "14-product-workflows.html", title: "Product: Core Workflows", section: "product" },
    { file: "15-product-design-system-and-tasks.html", title: "Product: Design System to Tasks", section: "product" },
    { file: "16-product-acceptance-and-kpis.html", title: "Product: Acceptance & KPIs", section: "product" },
    { file: "17-product-roadmap-and-handover.html", title: "Product: Roadmap & Handover", section: "product" },
    { file: "18-tech-architecture-summary.html", title: "Technical: Architecture Summary", section: "tech" },
    { file: "19-tech-critical-diagrams.html", title: "Technical: High-Level Diagram", section: "tech" },
    { file: "20-tech-selected-slides-table.html", title: "Technical: Selected Slides Table", section: "tech" },
    { file: "21-tech-key-tables.html", title: "Technical: Key Tables", section: "tech" },
    { file: "22-tech-ai-workflow.html", title: "Technical: MVP to SoA Evolution", section: "tech" }
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
    const sectionClass = slide.section ? ` sec-${slide.section}` : "";
    a.className = "thumb" + sectionClass + (i === idx ? " active" : "");
    a.setAttribute("aria-label", `اسلاید ${i + 1}: ${slide.title}`);
    a.title = `اسلاید ${i + 1} از ${slides.length} — ${slide.title}`;
    a.innerHTML = `<span class="thumb-label">${i + 1}</span>`;
    thumbs.appendChild(a);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" && next) location.href = next;
    if (event.key === "ArrowLeft" && prev) location.href = prev;
  });
})();