/* ===========================================================================
   PRESENT MODE — ?present=1
   A thin, self-contained presenter layer for screen-recording the showcase.
   Adds html.is-presenting (styled entirely by present.css), a faint HUD, and
   keyboard driving so the presenter never has to hunt for a button on camera.

     SPACE  index → reveal next / enter hall     hall → start-stop auto walk
     c      toggle a cursor-free screen
     3      3-2-1 countdown to sync a narration take

   Touches no existing script: it only clicks buttons the pages already own.
   =========================================================================== */
(function () {
  "use strict";

  if (location.search.indexOf("present=1") === -1) return;

  var HALL_URL = "hall.html?present=1";
  var root = document.documentElement;

  /* --- page detection ---------------------------------------------------- */
  function detectPage() {
    if (document.getElementById("podium")) return "index";
    if (document.getElementById("hallwayCanvas")) return "hall";
    return null;
  }

  /* --- small helpers ----------------------------------------------------- */
  function byId(id) { return document.getElementById(id); }

  function isVisible(el) {
    if (!el || el.hidden) return false;
    if (el.style && el.style.display === "none") return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function modalOpen() {
    var panel = byId("panel");
    var watch = byId("watchModal");
    return isVisible(panel) || isVisible(watch);
  }

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  /* --- HUD --------------------------------------------------------------- */
  var hudLabel = null;

  function buildHud(text) {
    var hud = document.createElement("div");
    hud.className = "present-hud";
    hud.setAttribute("aria-hidden", "true");

    var dot = document.createElement("span");
    dot.className = "present-hud__dot";
    hud.appendChild(dot);

    hudLabel = document.createElement("span");
    hudLabel.className = "present-hud__label";
    hudLabel.textContent = text;
    hud.appendChild(hudLabel);

    var keys = document.createElement("span");
    keys.className = "present-hud__keys";
    keys.textContent = "c cursor · 3 countdown";
    hud.appendChild(keys);

    document.body.appendChild(hud);
  }

  function setHud(text) {
    if (hudLabel) hudLabel.textContent = text;
  }

  /* --- countdown --------------------------------------------------------- */
  var countdownRunning = false;

  function runCountdown() {
    if (countdownRunning) return;
    countdownRunning = true;

    var wrap = document.createElement("div");
    wrap.className = "present-countdown";
    wrap.setAttribute("aria-hidden", "true");

    var num = document.createElement("div");
    num.className = "present-countdown__num";
    wrap.appendChild(num);
    document.body.appendChild(wrap);

    var steps = ["3", "2", "1", "Go"];
    var i = 0;

    function tick() {
      if (i >= steps.length) {
        wrap.className = "present-countdown present-countdown--out";
        setTimeout(function () {
          if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
          countdownRunning = false;
        }, 500);
        return;
      }
      num.className = "present-countdown__num" +
        (steps[i] === "Go" ? " present-countdown__num--go" : "");
      num.textContent = steps[i];
      // restart the pop animation on each number
      void num.offsetWidth;
      i++;
      setTimeout(tick, steps[i - 1] === "Go" ? 500 : 800);
    }

    tick();
  }

  /* --- index page -------------------------------------------------------- */
  function initIndex() {
    buildHud("SPACE → reveal next");

    function refreshHud() {
      var enter = byId("enterHallBtn");
      if (isVisible(enter)) setHud("SPACE → enter the hall");
      else setHud("SPACE → reveal next");
    }

    // The reveal button's label/visibility is swapped by awards.js, so poll
    // lightly rather than assuming when it changes.
    setInterval(refreshHud, 400);
    document.addEventListener("gaivs:unlocked", refreshHud);

    return function advance() {
      var enter = byId("enterHallBtn");
      if (isVisible(enter)) {
        location.href = HALL_URL;
        return;
      }
      var reveal = byId("revealBtn");
      if (isVisible(reveal)) reveal.click();
    };
  }

  /* --- hall page --------------------------------------------------------- */
  function initHall() {
    buildHud("SPACE → start/stop walk");

    var header = document.querySelector(".hall-header");
    if (header) {
      setTimeout(function () {
        header.className += " present-header-slim";
      }, 3000);
    }

    return function toggleWalk() {
      var btn = byId("autoWalkBtn");
      if (isVisible(btn)) btn.click();
    };
  }

  /* --- boot -------------------------------------------------------------- */
  function boot() {
    var page = detectPage();
    if (!page) return;

    root.className += " is-presenting";

    var primary = page === "index" ? initIndex() : initHall();

    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      var key = e.key;

      if (key === " " || key === "Spacebar" || e.keyCode === 32) {
        if (modalOpen()) return;
        e.preventDefault();
        primary();
        return;
      }

      if (key === "c" || key === "C") {
        if (modalOpen()) return;
        e.preventDefault();
        if (root.className.indexOf("present-no-cursor") === -1) {
          root.className += " present-no-cursor";
        } else {
          root.className = root.className
            .replace(/\s*present-no-cursor\b/g, "");
        }
        return;
      }

      if (key === "3" || e.keyCode === 51) {
        if (modalOpen()) return;
        e.preventDefault();
        runCountdown();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
