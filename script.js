(function () {
  "use strict";

  // -------------------------------------------------------------------------
  // LAYOUT CONSTANTS (must match viewBox in index.html: 1000 x 620)
  // -------------------------------------------------------------------------
  const START_X = 70, START_Y = 70;
  const BOOTH_W = 150, BOOTH_H = 80;
  const GAP_X = 26, ROW_H = 130;

  const trackByCode = Object.fromEntries(TRACKS.map((t) => [t.code, t]));
  const svgNS = "http://www.w3.org/2000/svg";

  const boothLayer = document.getElementById("boothLayer");
  const legendEl = document.getElementById("legend");
  const filtersEl = document.getElementById("trackFilters");
  const searchInput = document.getElementById("searchInput");

  const overlay = document.getElementById("overlay");
  const panel = document.getElementById("panel");
  const panelClose = document.getElementById("panelClose");
  const panelPrev = document.getElementById("panelPrev");
  const panelNext = document.getElementById("panelNext");
  const panelBoothId = document.getElementById("panelBoothId");
  const panelTrack = document.getElementById("panelTrack");
  const panelTitle = document.getElementById("panelTitle");
  const panelStudents = document.getElementById("panelStudents");
  const panelBlurb = document.getElementById("panelBlurb");
  const panelVideo = document.getElementById("panelVideo");
  const panelDeck = document.getElementById("panelDeck");
  const panelDeckFallback = document.getElementById("panelDeckFallback");

  let activeTrackFilters = new Set(); // empty = show all
  let searchTerm = "";
  let currentIndex = null; // index into PROJECTS, while panel open

  // -------------------------------------------------------------------------
  // LEGEND + FILTER CHIPS
  // -------------------------------------------------------------------------
  function renderLegend() {
    legendEl.innerHTML = TRACKS.map(
      (t) => `<span><span class="dot" style="background:${t.color}"></span>Aisle ${t.code} — ${t.name}</span>`
    ).join("");
  }

  function renderFilters() {
    const allChip = `<button class="track-chip is-active" data-track="all">All booths</button>`;
    const chips = TRACKS.map(
      (t) => `<button class="track-chip" data-track="${t.code}">
                <span class="track-chip__dot" style="background:${t.color}"></span>${t.code} · ${t.name}
              </button>`
    ).join("");
    filtersEl.innerHTML = allChip + chips;

    filtersEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".track-chip");
      if (!btn) return;
      const code = btn.dataset.track;

      if (code === "all") {
        activeTrackFilters.clear();
      } else {
        if (activeTrackFilters.has(code)) activeTrackFilters.delete(code);
        else activeTrackFilters.add(code);
      }
      syncFilterChipStyles();
      applyFilters();
    });
  }

  function syncFilterChipStyles() {
    const chips = filtersEl.querySelectorAll(".track-chip");
    chips.forEach((chip) => {
      const code = chip.dataset.track;
      const isActive = code === "all" ? activeTrackFilters.size === 0 : activeTrackFilters.has(code);
      chip.classList.toggle("is-active", isActive);
    });
  }

  // -------------------------------------------------------------------------
  // FLOOR PLAN RENDER
  // -------------------------------------------------------------------------
  function boothPosition(row, col) {
    return {
      x: START_X + (col - 1) * (BOOTH_W + GAP_X),
      y: START_Y + (row - 1) * ROW_H,
    };
  }

  function renderAisleLabels() {
    const rows = [...new Set(PROJECTS.map((p) => p.row))].sort();
    rows.forEach((row) => {
      const proj = PROJECTS.find((p) => p.row === row);
      const track = trackByCode[proj.track];
      const { y } = boothPosition(row, 1);
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", START_X);
      label.setAttribute("y", y - 14);
      label.setAttribute("class", "aisle-label");
      label.setAttribute("fill", track.color);
      label.textContent = `Aisle ${track.code} — ${track.name}`;
      boothLayer.appendChild(label);
    });
  }

  function renderBooths() {
    PROJECTS.forEach((project, index) => {
      const track = trackByCode[project.track];
      const { x, y } = boothPosition(project.row, project.col);

      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "booth-group");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `Booth ${project.id}: ${project.title}`);
      g.dataset.index = index;
      g.dataset.track = project.track;
      g.dataset.search = `${project.title} ${project.students.join(" ")} ${project.id}`.toLowerCase();

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("class", "booth-body");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", BOOTH_W);
      rect.setAttribute("height", BOOTH_H);
      rect.setAttribute("rx", 3);
      rect.setAttribute("stroke", track.color);
      g.appendChild(rect);

      const idText = document.createElementNS(svgNS, "text");
      idText.setAttribute("class", "booth-id");
      idText.setAttribute("x", x + 12);
      idText.setAttribute("y", y + 26);
      idText.setAttribute("fill", track.color);
      idText.textContent = project.id;
      g.appendChild(idText);

      const titleText = document.createElementNS(svgNS, "text");
      titleText.setAttribute("class", "booth-title");
      titleText.setAttribute("x", x + 12);
      titleText.setAttribute("y", y + 48);
      wrapSvgText(titleText, project.title, 22);
      g.appendChild(titleText);

      g.addEventListener("click", () => openPanel(index));
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPanel(index);
        }
      });

      boothLayer.appendChild(g);
    });
  }

  // naive multi-line wrap for svg <text> using <tspan>
  function wrapSvgText(textEl, str, maxChars) {
    const words = str.split(" ");
    let line = "";
    const lines = [];
    words.forEach((w) => {
      if ((line + " " + w).trim().length > maxChars) {
        lines.push(line.trim());
        line = w;
      } else {
        line = (line + " " + w).trim();
      }
    });
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((l, i) => {
      const tspan = document.createElementNS(svgNS, "tspan");
      tspan.setAttribute("x", textEl.getAttribute("x"));
      tspan.setAttribute("dy", i === 0 ? 0 : 13);
      tspan.textContent = l;
      textEl.appendChild(tspan);
    });
  }

  // -------------------------------------------------------------------------
  // SEARCH + FILTER
  // -------------------------------------------------------------------------
  function applyFilters() {
    const groups = boothLayer.querySelectorAll(".booth-group");
    groups.forEach((g) => {
      const matchesTrack = activeTrackFilters.size === 0 || activeTrackFilters.has(g.dataset.track);
      const matchesSearch = !searchTerm || g.dataset.search.includes(searchTerm);
      g.classList.toggle("is-dimmed", !(matchesTrack && matchesSearch));
    });
  }

  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    applyFilters();
  });

  // -------------------------------------------------------------------------
  // DETAIL PANEL
  // -------------------------------------------------------------------------
  function openPanel(index) {
    currentIndex = index;
    const project = PROJECTS[index];
    const track = trackByCode[project.track];

    panelBoothId.textContent = project.id;
    panelTrack.textContent = `Aisle ${track.code} · ${track.name}`;
    panelTrack.style.color = track.color;
    panelTitle.textContent = project.title;
    panelStudents.textContent = project.students.join(", ");
    panelBlurb.textContent = project.blurb;

    panelVideo.src = project.videoSrc;
    panelDeck.src = project.deckSrc;
    panelDeckFallback.href = project.deckSrc;

    overlay.hidden = false;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("is-open"));
    panel.setAttribute("aria-hidden", "false");
    panelClose.focus();
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    panelVideo.pause();
    panelVideo.removeAttribute("src");
    panelVideo.load();
    setTimeout(() => {
      overlay.hidden = true;
      panel.hidden = true;
    }, 280);
    currentIndex = null;
  }

  function stepPanel(delta) {
    if (currentIndex === null) return;
    const next = (currentIndex + delta + PROJECTS.length) % PROJECTS.length;
    openPanel(next);
  }

  overlay.addEventListener("click", closePanel);
  panelClose.addEventListener("click", closePanel);
  panelPrev.addEventListener("click", () => stepPanel(-1));
  panelNext.addEventListener("click", () => stepPanel(1));

  document.addEventListener("keydown", (e) => {
    if (panel.hidden) return;
    if (e.key === "Escape") closePanel();
    if (e.key === "ArrowRight") stepPanel(1);
    if (e.key === "ArrowLeft") stepPanel(-1);
  });

  // -------------------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------------------
  renderLegend();
  renderFilters();
  renderAisleLabels();
  renderBooths();
})();
