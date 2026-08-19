(function () {
  "use strict";

  // ===========================================================================
  // AMBIENT WEBGL PARTICLE BACKGROUND (three.js)
  // ===========================================================================
  function initParticleBg() {
    var canvas = document.getElementById("particleBg");
    if (!canvas || typeof THREE === "undefined") return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 18;

    function resize() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    var COUNT = 220;
    var positions = new Float32Array(COUNT * 3);
    var colors = new Float32Array(COUNT * 3);
    var palette = [
      [0x37 / 255, 0x78 / 255, 0x8a / 255], // teal
      [0xdf / 255, 0xa6 / 255, 0x3e / 255], // gold
      [0x8e / 255, 0x2e / 255, 0x4d / 255], // maroon
    ];
    for (var i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      var c = palette[i % palette.length];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    var material = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.55 });
    var points = new THREE.Points(geometry, material);
    scene.add(points);

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();
      points.rotation.y = t * 0.02;
      points.rotation.x = Math.sin(t * 0.05) * 0.05;
      renderer.render(scene, camera);
    }
    animate();
  }

  // ===========================================================================
  // REVEAL SEQUENCE
  // ===========================================================================
  var trackByCode = {};
  (typeof TRACKS !== "undefined" ? TRACKS : []).forEach(function (t) { trackByCode[t.code] = t; });
  var projectById = {};
  (typeof PROJECTS !== "undefined" ? PROJECTS : []).forEach(function (p) { projectById[p.id] = p; });
  var winnerByPlace = {};
  (typeof WINNERS !== "undefined" ? WINNERS : []).forEach(function (w) { winnerByPlace[w.place] = w; });

  var sequence = [3, 2, 1];
  var stepIndex = 0;
  var revealedProjectByPlace = {};

  var revealBtn = document.getElementById("revealBtn");
  var enterHallBtn = document.getElementById("enterHallBtn");

  function populateCard(place, project) {
    var track = trackByCode[project.track] || { color: "#37788A", name: "" };
    document.getElementById("track-" + place).textContent = track.name;
    document.getElementById("track-" + place).style.color = track.color;
    document.getElementById("title-" + place).textContent = project.title;
    document.getElementById("students-" + place).textContent = project.students.join(", ");
    document.getElementById("blurb-" + place).textContent = project.blurb;
  }

  function revealPlace(place) {
    var winner = winnerByPlace[place];
    if (!winner) return;
    var project = projectById[winner.projectId];
    if (!project) return;

    revealedProjectByPlace[place] = project;
    populateCard(place, project);

    var card = document.getElementById("card-" + place);
    var locked = card.querySelector(".podium__locked");
    var revealed = card.querySelector(".podium__revealed");

    var tl = gsap.timeline();
    tl.to(locked, { opacity: 0, scale: 0.8, duration: 0.22, ease: "power1.in" })
      .set(locked, { display: "none" })
      .set(revealed, { hidden: false })
      .call(function () { revealed.hidden = false; })
      .fromTo(revealed, { opacity: 0, y: 14, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.6)" });

    if (place === 1) {
      tl.call(function () {
        if (typeof confetti === "function") {
          confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.55 },
            colors: ["#DFA63E", "#37788A", "#8E2E4D"],
          });
        }
        gsap.fromTo(card, { boxShadow: "0 10px 34px rgba(223,166,62,0.18)" },
          { boxShadow: "0 16px 50px rgba(223,166,62,0.45)", duration: 0.6, yoyo: true, repeat: 3 });
      }, null, "-=0.1");
    }
  }

  function updateActionUI() {
    if (stepIndex >= sequence.length) {
      revealBtn.hidden = true;
      enterHallBtn.hidden = false;
      gsap.fromTo(enterHallBtn, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
      return;
    }
    var labels = { 3: "Reveal 3rd Place", 2: "Reveal 2nd Place", 1: "Reveal 1st Place \uD83C\uDFC6" };
    revealBtn.textContent = labels[sequence[stepIndex]];
  }

  revealBtn.addEventListener("click", function () {
    var place = sequence[stepIndex];
    revealPlace(place);
    stepIndex++;
    updateActionUI();
  });

  // initial podium entrance animation
  window.addEventListener("DOMContentLoaded", function () {
    initParticleBg();
    gsap.fromTo(".podium__slot", { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out", delay: 0.15 });
    updateActionUI();
  });

  // ===========================================================================
  // WATCH MODAL
  // ===========================================================================
  var watchOverlay = document.getElementById("watchOverlay");
  var watchModal = document.getElementById("watchModal");
  var watchClose = document.getElementById("watchClose");
  var watchTitle = document.getElementById("watchTitle");
  var watchVideo = document.getElementById("watchVideo");
  var watchDeck = document.getElementById("watchDeck");

  function openWatch(project) {
    watchTitle.textContent = project.title;
    watchVideo.src = project.videoEmbedUrl || project.videoSrc || "";
    watchDeck.src = project.deckEmbedUrl || project.deckSrc || "";
    watchOverlay.hidden = false;
    watchModal.hidden = false;
    gsap.fromTo(watchModal, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" });
    watchModal.setAttribute("aria-hidden", "false");
  }

  function closeWatch() {
    gsap.to(watchModal, {
      opacity: 0, scale: 0.95, duration: 0.2, ease: "power1.in",
      onComplete: function () {
        watchOverlay.hidden = true;
        watchModal.hidden = true;
        watchVideo.src = "";
        watchDeck.src = "";
      },
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".podium__watch-btn");
    if (btn) {
      var place = parseInt(btn.dataset.place, 10);
      var project = revealedProjectByPlace[place];
      if (project) openWatch(project);
    }
  });
  watchOverlay.addEventListener("click", closeWatch);
  watchClose.addEventListener("click", closeWatch);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !watchModal.hidden) closeWatch();
  });
})();
