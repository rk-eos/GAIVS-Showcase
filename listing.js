(function () {
  "use strict";

  var listWrap = document.getElementById("listWrap");
  var searchInput = document.getElementById("searchInput");
  var projects = typeof PROJECTS !== "undefined" ? PROJECTS : [];

  function renderList() {
    listWrap.innerHTML = projects.map(function (p, i) {
      return (
        '<div class="list-item" data-index="' + i + '" data-search="' +
        (p.title + " " + p.students.join(" ") + " " + p.id).toLowerCase().replace(/"/g, "") +
        '">' +
          '<span class="list-item__id">' + p.id + "</span>" +
          '<div class="list-item__body">' +
            "<h2>" + p.title + "</h2>" +
            '<p class="list-item__students">' + p.students.join(", ") + "</p>" +
            '<p class="list-item__blurb">' + p.blurb + "</p>" +
          "</div>" +
          '<div class="list-item__actions">' +
            '<button class="list-item__watch-btn" data-index="' + i + '">&#9654; Watch pitch</button>' +
            (p.deckSrc ? '<a class="list-item__deck-link" href="' + p.deckSrc + '" target="_blank" rel="noopener">Open deck &#8599;</a>' : "") +
          "</div>" +
        "</div>"
      );
    }).join("");
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
  var watchVideoPlaceholder = document.getElementById("watchVideoPlaceholder");
  var watchDeckLink = document.getElementById("watchDeckLink");

  function openWatch(project) {
    watchTitle.textContent = project.title;
    if (project.videoSrc) {
      watchVideo.hidden = false;
      watchVideoPlaceholder.hidden = true;
      watchVideo.src = project.videoSrc;
    } else {
      watchVideo.hidden = true;
      watchVideo.removeAttribute("src");
      watchVideoPlaceholder.hidden = false;
    }
    if (project.deckSrc) {
      watchDeckLink.href = project.deckSrc;
      watchDeckLink.style.display = "inline-flex";
    } else {
      watchDeckLink.style.display = "none";
    }
    watchOverlay.hidden = false;
    watchModal.hidden = false;
    watchModal.setAttribute("aria-hidden", "false");
  }

  function closeWatch() {
    watchOverlay.hidden = true;
    watchModal.hidden = true;
    watchModal.setAttribute("aria-hidden", "true");
    watchVideo.removeAttribute("src");
  }

  watchOverlay.addEventListener("click", closeWatch);
  watchClose.addEventListener("click", closeWatch);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !watchModal.hidden) closeWatch();
  });
})();
