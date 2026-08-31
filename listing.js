(function () {
  "use strict";

  var listWrap = document.getElementById("listWrap");
  var searchInput = document.getElementById("searchInput");
  var projects = typeof PROJECTS !== "undefined" ? PROJECTS : [];

  // safeurl.js exposes window.GAIVS_SAFEURL. If the page hasn't loaded it yet
  // we fall back to an equivalent local implementation so a missing <script>
  // can never silently disable URL validation.
  var SAFEURL = window.GAIVS_SAFEURL || {
    isSafe: function (url) {
      if (typeof url !== "string" || !url.trim()) return false;
      try {
        var p = new URL(url.trim(), window.location.href);
        return p.protocol === "http:" || p.protocol === "https:";
      } catch (e) { return false; }
    },
    sanitize: function (url) { return this.isSafe(url) ? String(url).trim() : ""; }
  };

  function safeUrl(url) { return SAFEURL.sanitize(url); }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function searchKey(p) {
    var students = Array.isArray(p.students) ? p.students.join(" ") : "";
    return (String(p.title || "") + " " + students + " " + String(p.id || ""))
      .toLowerCase().replace(/"/g, "");
  }

  function buildItem(p, i) {
    var item = el("div", "list-item");
    item.setAttribute("data-index", String(i));
    item.setAttribute("data-search", searchKey(p));

    var idSpan = el("span", "list-item__id");
    idSpan.textContent = p.id == null ? "" : String(p.id);
    item.appendChild(idSpan);

    var body = el("div", "list-item__body");

    var h2 = el("h2");
    h2.textContent = p.title == null ? "" : String(p.title);
    body.appendChild(h2);

    var students = el("p", "list-item__students");
    students.textContent = Array.isArray(p.students) ? p.students.join(", ") : "";
    body.appendChild(students);

    var blurb = el("p", "list-item__blurb");
    blurb.textContent = p.blurb == null ? "" : String(p.blurb);
    body.appendChild(blurb);

    item.appendChild(body);

    var actions = el("div", "list-item__actions");

    var btn = el("button", "list-item__watch-btn");
    btn.setAttribute("data-index", String(i));
    btn.textContent = "▶ Watch pitch";
    actions.appendChild(btn);

    var deckHref = safeUrl(p.deckSrc);
    if (deckHref) {
      var link = el("a", "list-item__deck-link");
      link.href = deckHref;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Open deck ↗";
      actions.appendChild(link);
    }

    item.appendChild(actions);
    return item;
  }

  function renderList() {
    while (listWrap.firstChild) listWrap.removeChild(listWrap.firstChild);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < projects.length; i++) {
      frag.appendChild(buildItem(projects[i], i));
    }
    listWrap.appendChild(frag);
  }
  renderList();

  listWrap.addEventListener("click", function (e) {
    var btn = e.target.closest(".list-item__watch-btn");
    if (!btn) return;
    var project = projects[parseInt(btn.dataset.index, 10)];
    if (project) openWatch(project);
  });

  searchInput.addEventListener("input", function () {
    var term = searchInput.value.trim().toLowerCase();
    listWrap.querySelectorAll(".list-item").forEach(function (item) {
      var match = !term || item.dataset.search.indexOf(term) !== -1;
      item.classList.toggle("is-hidden", !match);
    });
  });

  // ===========================================================================
  // WATCH MODAL — same pattern as the reveal page and hall panel
  // ===========================================================================
  var watchOverlay = document.getElementById("watchOverlay");
  var watchModal = document.getElementById("watchModal");
  var watchClose = document.getElementById("watchClose");
  var watchTitle = document.getElementById("watchTitle");
  var watchVideo = document.getElementById("watchVideo");
  var watchVideoFrame = document.getElementById("watchVideoFrame");
  var watchVideoPlaceholder = document.getElementById("watchVideoPlaceholder");
  var watchVideoExternalLink = document.getElementById("watchVideoExternalLink");
  var watchDeckLink = document.getElementById("watchDeckLink");
  var watchPrototypeLink = document.getElementById("watchPrototypeLink");
  var watchAskWrap = document.getElementById("watchAskWrap");
  var watchAsk = document.getElementById("watchAsk");
  var watchCommitmentWrap = document.getElementById("watchCommitmentWrap");
  var watchCommitment = document.getElementById("watchCommitment");
  watchVideo.addEventListener("error", function () {
    watchVideo.hidden = true;
    watchVideoPlaceholder.hidden = false;
  });

  function classifyVideo(url) {
    if (!url) return { type: "none" };
    var yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
    if (yt) return { type: "iframe", url: "https://www.youtube-nocookie.com/embed/" + yt[1] };
    var driveFile = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (driveFile) return { type: "iframe", url: "https://drive.google.com/file/d/" + driveFile[1] + "/preview" };
    if (/drive\.google\.com\/drive\/folders/.test(url)) return { type: "external", url: url };
    // any other external host (e.g. canva.link) may block framing — link out instead
    if (/^https?:\/\//.test(url)) return { type: "external", url: url };
    return { type: "video", url: url };
  }

  function openWatch(project) {
    watchTitle.textContent = project.title;
    watchVideo.hidden = true; watchVideo.removeAttribute("src");
    watchVideoFrame.hidden = true; watchVideoFrame.removeAttribute("src");
    watchVideoPlaceholder.hidden = true;
    watchVideoExternalLink.hidden = true;
    var v = classifyVideo(project.videoSrc);
    var vUrl = safeUrl(v.url);
    if (v.type === "video" && vUrl) {
      watchVideo.hidden = false; watchVideo.src = vUrl;
    } else if (v.type === "iframe" && vUrl) {
      watchVideoFrame.hidden = false; watchVideoFrame.src = vUrl;
    } else if (v.type === "external" && vUrl) {
      watchVideoExternalLink.hidden = false;
      watchVideoExternalLink.href = vUrl;
    } else {
      watchVideoPlaceholder.hidden = false;
    }
    var deckUrl = safeUrl(project.deckSrc);
    if (deckUrl) {
      watchDeckLink.href = deckUrl;
      watchDeckLink.style.display = "inline-flex";
    } else {
      watchDeckLink.removeAttribute("href");
      watchDeckLink.style.display = "none";
    }
    var protoUrl = safeUrl(project.prototypeSrc);
    if (protoUrl) {
      watchPrototypeLink.href = protoUrl;
      watchPrototypeLink.style.display = "inline-flex";
    } else {
      watchPrototypeLink.removeAttribute("href");
      watchPrototypeLink.style.display = "none";
    }
    watchAskWrap.hidden = !project.ask;
    watchAsk.textContent = project.ask || "";
    watchCommitmentWrap.hidden = !project.commitment;
    watchCommitment.textContent = project.commitment || "";
    watchOverlay.hidden = false;
    watchModal.hidden = false;
    watchModal.setAttribute("aria-hidden", "false");
  }

  function closeWatch() {
    watchOverlay.hidden = true;
    watchModal.hidden = true;
    watchModal.setAttribute("aria-hidden", "true");
    watchVideo.pause();
    watchVideo.removeAttribute("src");
    watchVideo.load();
    watchVideoFrame.removeAttribute("src");
  }

  watchOverlay.addEventListener("click", closeWatch);
  watchClose.addEventListener("click", closeWatch);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !watchModal.hidden) closeWatch();
  });
})();
