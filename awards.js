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
  // AUDIO — real applause clip + a synthesized sparkle chime for 1st place
  // ===========================================================================
  var audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  var applauseSrc = "assets/audio/applause.mp3";
  var FADE_OUT_SECONDS = 1.4;
  function playApplause(intensity) {
    intensity = intensity || 1;
    var baseVolume = Math.min(1, 0.75 * intensity);
    var el = new Audio(applauseSrc);
    el.volume = baseVolume;
    el.addEventListener("timeupdate", function () {
      if (!el.duration) return;
      var remaining = el.duration - el.currentTime;
      if (remaining < FADE_OUT_SECONDS) {
        el.volume = Math.max(0, baseVolume * (remaining / FADE_OUT_SECONDS));
      }
    });
    el.play().catch(function () { /* autoplay-policy edge cases — ignore */ });
  }

  function playSparkle() {
    var ctx = getAudioCtx();
    if (!ctx) return;
    var notes = [783.99, 987.77, 1174.66, 1567.98, 1975.53]; // G5 B5 D6 G6 B6
    var startTime = ctx.currentTime;
    notes.forEach(function (freq, i) {
      var t = startTime + i * 0.09;
      var osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });

    // bright shimmer layer — short burst of high-passed noise
    var shimmerDur = 0.6;
    var buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * shimmerDur), ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.3));
    }
    var noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    var hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 5000;
    var shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.18;
    noiseSrc.connect(hp);
    hp.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    noiseSrc.start(startTime);
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
    var track = trackByCode[project.track] || null;
    var trackEl = document.getElementById("track-" + place);
    if (track && track.name) {
      trackEl.textContent = track.name;
      trackEl.style.color = track.color;
      trackEl.hidden = false;
    } else {
      trackEl.hidden = true;
    }
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
    tl.call(function () {
      playApplause(place === 1 ? 1.5 : 1);
      if (place === 1) playSparkle();
    })
      .to(locked, { opacity: 0, scale: 0.8, duration: 0.22, ease: "power1.in" })
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

  function resetReveal() {
    stepIndex = 0;
    revealedProjectByPlace = {};

    [1, 2, 3].forEach(function (place) {
      var card = document.getElementById("card-" + place);
      var locked = card.querySelector(".podium__locked");
      var revealed = card.querySelector(".podium__revealed");
      gsap.killTweensOf(card);
      gsap.set(locked, { display: "", opacity: 1, scale: 1 });
      gsap.set(revealed, { opacity: 0, y: 14, scale: 0.92 });
      revealed.hidden = true;
      card.style.boxShadow = "";
    });

    var bonusCard = document.getElementById("bonusCard");
    if (bonusCard) {
      var bonusLocked = bonusCard.querySelector(".bonus-card__locked");
      var bonusRevealed = bonusCard.querySelector(".bonus-card__revealed");
      gsap.killTweensOf(bonusCard);
      gsap.set(bonusLocked, { display: "", opacity: 1, scale: 1 });
      gsap.set(bonusRevealed, { opacity: 0, y: 10, scale: 0.95 });
      bonusRevealed.hidden = true;
    }

    enterHallBtn.hidden = true;
    revealBtn.hidden = false;
    gsap.set(revealBtn, { opacity: 1, y: 0 });
    updateActionUI();
  }

  var resetRevealBtn = document.getElementById("resetRevealBtn");
  if (resetRevealBtn) resetRevealBtn.addEventListener("click", resetReveal);
  if (new URLSearchParams(location.search).get("present") && resetRevealBtn) resetRevealBtn.style.display = "none";

  // initial podium entrance animation
  window.addEventListener("DOMContentLoaded", function () {
    initParticleBg();
    gsap.fromTo(".podium__slot", { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out", delay: 0.15 });
    gsap.fromTo(".credit-footnote", { opacity: 0, y: 12 },
      { opacity: 0.55, y: 0, duration: 0.6, ease: "power2.out", delay: 0.5 });
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
  var watchVideoPlaceholder = document.getElementById("watchVideoPlaceholder");
  var watchDeckLink = document.getElementById("watchDeckLink");
  watchVideo.addEventListener("error", function () {
    watchVideo.hidden = true;
    watchVideoPlaceholder.hidden = false;
  });

  function openWatch(project) {
    watchTitle.textContent = project.title;
    var deckUrl = project.deckSrc || "";

    if (project.videoSrc) {
      watchVideo.hidden = false;
      watchVideoPlaceholder.hidden = true;
      watchVideo.src = project.videoSrc;
    } else {
      watchVideo.hidden = true;
      watchVideo.removeAttribute("src");
      watchVideoPlaceholder.hidden = false;
    }

    if (deckUrl) {
      watchDeckLink.href = deckUrl;
      watchDeckLink.style.display = "inline-flex";
    } else {
      watchDeckLink.style.display = "none";
    }

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
        watchVideo.pause();
        watchVideo.removeAttribute("src");
        watchVideo.load();
      },
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".podium__watch-btn");
    if (btn) {
      var place = parseInt(btn.dataset.place, 10);
      var project = revealedProjectByPlace[place];
      if (project) openWatch(project);
      return;
    }
    var saveBtn = e.target.closest(".podium__save-btn");
    if (saveBtn) {
      var savePlace = parseInt(saveBtn.dataset.place, 10);
      var saveProject = revealedProjectByPlace[savePlace];
      if (saveProject) downloadCertificate(saveProject, savePlace);
    }
  });

  var certPrizes = { 1: "$3,000", 2: "$1,500", 3: "$500" };
  var certLabels = { 1: "1ST PLACE", 2: "2ND PLACE", 3: "3RD PLACE" };
  var certLogo = new Image();
  certLogo.src = "assets/img/gaivs-logo-full.png";

  function downloadCertificate(project, place) {
    var c = document.createElement("canvas");
    c.width = 1200; c.height = 800;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#FBFAF7"; ctx.fillRect(0, 0, 1200, 800);
    ctx.strokeStyle = "#DFA63E"; ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 1152, 752);
    var logoH = 56, logoW = certLogo.width ? logoH * (certLogo.width / certLogo.height) : 190;
    if (certLogo.complete && certLogo.naturalWidth) ctx.drawImage(certLogo, (1200 - logoW) / 2, 70, logoW, logoH);
    ctx.textAlign = "center";
    ctx.fillStyle = "#DFA63E";
    ctx.font = "800 30px 'Poppins', sans-serif";
    ctx.fillText(certLabels[place] || "", 600, 190);
    ctx.fillStyle = "#26333B";
    ctx.font = "800 46px 'Poppins', sans-serif";
    ctx.fillText(project.title, 600, 270);
    ctx.font = "20px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#5F6B72";
    ctx.fillText(project.students.join(", "), 600, 320);
    ctx.fillStyle = "#37788A";
    ctx.font = "italic 22px 'Source Serif 4', serif";
    wrapCenter(ctx, project.blurb, 600, 400, 900, 34);
    ctx.fillStyle = "#DFA63E";
    ctx.font = "800 40px 'Poppins', sans-serif";
    ctx.fillText(certPrizes[place] || "", 600, 560);
    ctx.font = "16px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#8A949A";
    ctx.fillText("10,000 vibecoding credits on SparkEd CodeBox", 600, 590);
    ctx.fillStyle = "#26333B";
    ctx.font = "700 22px 'Poppins', sans-serif";
    ctx.fillText("GLOBAL AI VENTURE STUDIO · 2026", 600, 700);
    triggerDownload(c, "gaivs-2026-" + (project.id || "winner") + "-certificate.png");
  }

  function wrapCenter(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(" "), line = "", lines = [];
    words.forEach(function (w) {
      var test = (line + " " + w).trim();
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    lines.slice(0, 2).forEach(function (l, i) { ctx.fillText(l, x, y + i * lineHeight); });
  }

  function triggerDownload(canvas, filename) {
    canvas.toBlob(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    });
  }

  watchOverlay.addEventListener("click", closeWatch);
  watchClose.addEventListener("click", closeWatch);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !watchModal.hidden) closeWatch();
  });
})();
