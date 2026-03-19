(function () {
  const slides = [
    { file: "index.html", title: "نمای کلی Work-Items" },
    { file: "01-purpose-and-outcomes.html", title: "هدف، خروجی و ارزش کسب‌وکاری" },
    { file: "02-folder-map-and-concepts.html", title: "نقشه پوشه‌ها و مفاهیم کلیدی" },
    { file: "03-refienment-deep-dive.html", title: "Refienment دقیق" },
    { file: "04-solution-deep-dive.html", title: "Solution دقیق" },
    { file: "05-implementation-deep-dive.html", title: "Implementation دقیق" },
    { file: "06-completion-deep-dive.html", title: "Completion دقیق" },
    { file: "07-operational-jira-gitlab-flow.html", title: "فلو عملیاتی Jira/GitLab" },
    { file: "08-governance-rules-and-gates.html", title: "گیت‌ها، کنترل کیفیت و قوانین" },
    { file: "09-end-to-end-example.html", title: "سناریوی End-to-End" },
    { file: "10-definition-of-ready-for-teams.html", title: "DoR و آمادگی تیم‌ها" },
    { file: "11-onboarding-and-next-actions.html", title: "راهنمای شروع تیم و اقدامات بعدی" }
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
    a.innerHTML = `<span class="thumb-label">${i + 1}</span>`;
    thumbs.appendChild(a);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" && next) location.href = next;
    if (event.key === "ArrowLeft" && prev) location.href = prev;
  });
})();
