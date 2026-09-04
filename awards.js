(function () {
  "use strict";

  var FLAG_BY_COUNTRY = {
    "Indonesia": "\uD83C\uDDEE\uD83C\uDDE9",
    "Vietnam": "\uD83C\uDDFB\uD83C\uDDF3",
    "United States": "\uD83C\uDDFA\uD83C\uDDF8",
    "China": "\uD83C\uDDE8\uD83C\uDDF3",
    "Japan": "\uD83C\uDDEF\uD83C\uDDF5",
  };
  function studentsWithFlags(project) {
    var countries = project.countries || [];
    return project.students.map(function (name, i) {
      var flag = FLAG_BY_COUNTRY[countries[i]] || "";
      return flag ? name + " " + flag : name;
    }).join(", ");
  }

  // ===========================================================================
  // MOTION PREFERENCES
  // ===========================================================================
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  // scale a theatrical duration/delay down to (near) nothing when the viewer
  // has asked for reduced motion
  function dur(seconds) { return reducedMotion() ? Math.min(seconds, 0.001) : seconds; }
  function hold(seconds) { return reducedMotion() ? 0 : seconds; }

  // ===========================================================================
  // SOUND HOOKS — prefer window.GAIVS_SFX (loaded separately, may be absent),
  // fall back to the local synthesised/sampled cues below.
  // ===========================================================================
  function sfx() { return window.GAIVS_SFX || null; }
  function cueDrumroll() {
    var s = sfx();
    if (s && typeof s.playDrumroll === "function") s.playDrumroll();
  }
  function cueWhoosh() {
    var s = sfx();
    if (s && typeof s.playWhoosh === "function") s.playWhoosh();
  }
  function cueApplause(intensity) {
    var s = sfx();
    if (s && typeof s.playApplause === "function") s.playApplause(intensity);
    else playApplause(intensity);
  }
  function cueSparkle() {
    var s = sfx();
    if (s && typeof s.playSparkle === "function") s.playSparkle();
    else playSparkle();
  }

  // ===========================================================================
  // AMBIENT WEBGL PARTICLE BACKGROUND (three.js)
  // ===========================================================================
  // Filled in by initParticleBg() — no-ops until then so callers stay simple.
  var particleFx = {
    pulse: function () {},
    goldSwirl: function () {},
    reset: function () {},
  };

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

    // keep pristine copies so every reaction animates away from a stable base
    var basePositions = positions.slice();
    var baseColors = colors.slice();
    var baseRadius = new Float32Array(COUNT);
    for (var r = 0; r < COUNT; r++) {
      baseRadius[r] = Math.sqrt(
        basePositions[r * 3] * basePositions[r * 3] +
        basePositions[r * 3 + 1] * basePositions[r * 3 + 1]
      );
    }
    var MAX_RADIUS = 24;
    var BASE_SIZE = 0.14;
    var BASE_OPACITY = 0.55;

    // reaction state, tweened by GSAP and read every frame
    var fx = { wave: -1, waveAmp: 0, gold: 0, spin: 0 };

    particleFx.pulse = function (strength) {
      if (reducedMotion()) return;
      strength = strength || 1;
      gsap.killTweensOf(fx);
      fx.wave = 0;
      fx.waveAmp = 1;
      gsap.to(fx, { wave: 1, duration: 1.5, ease: "power2.out" });
      gsap.to(fx, { waveAmp: 0, duration: 1.5, ease: "power1.in" });
      gsap.fromTo(material, { size: BASE_SIZE },
        { size: BASE_SIZE * (1 + 0.5 * strength), duration: 0.35, yoyo: true, repeat: 1, ease: "sine.out" });
      gsap.fromTo(material, { opacity: BASE_OPACITY },
        { opacity: Math.min(0.95, BASE_OPACITY + 0.28 * strength), duration: 0.35, yoyo: true, repeat: 1, ease: "sine.out" });
    };

    particleFx.goldSwirl = function () {
      if (reducedMotion()) return;
      gsap.to(fx, { gold: 1, duration: 0.7, ease: "power2.out" });
      gsap.to(fx, { gold: 0.22, duration: 1.6, delay: 0.7, ease: "power1.inOut" });
      gsap.fromTo(fx, { spin: 0 }, { spin: 0.9, duration: 2, ease: "power2.out" });
    };

    particleFx.reset = function () {
      gsap.killTweensOf(fx);
      gsap.killTweensOf(material);
      fx.wave = -1; fx.waveAmp = 0; fx.gold = 0; fx.spin = 0;
      material.size = BASE_SIZE;
      material.opacity = BASE_OPACITY;
      positions.set(basePositions);
      colors.set(baseColors);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    };

    var GOLD = [0xdf / 255, 0xa6 / 255, 0x3e / 255];
    var lastGold = -1;

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();
      points.rotation.y = t * 0.02 + fx.spin;
      points.rotation.x = Math.sin(t * 0.05) * 0.05;

      // outward ripple: a soft band of displacement travelling out from centre
      if (fx.waveAmp > 0.001) {
        var front = fx.wave * MAX_RADIUS;
        for (var i = 0; i < COUNT; i++) {
          var d = baseRadius[i] - front;
          var band = Math.exp(-(d * d) / 8) * fx.waveAmp * 0.9;
          var k = baseRadius[i] > 0.001 ? 1 + band / baseRadius[i] : 1;
          positions[i * 3] = basePositions[i * 3] * k;
          positions[i * 3 + 1] = basePositions[i * 3 + 1] * k;
          positions[i * 3 + 2] = basePositions[i * 3 + 2] + band * 0.3;
        }
        geometry.attributes.position.needsUpdate = true;
      } else if (fx.wave >= 0) {
        positions.set(basePositions);
        geometry.attributes.position.needsUpdate = true;
        fx.wave = -1;
      }

      // gold tint blend for the 1st-place swirl
      if (Math.abs(fx.gold - lastGold) > 0.002) {
        lastGold = fx.gold;
        for (var j = 0; j < COUNT; j++) {
          colors[j * 3] = baseColors[j * 3] + (GOLD[0] - baseColors[j * 3]) * fx.gold;
          colors[j * 3 + 1] = baseColors[j * 3 + 1] + (GOLD[1] - baseColors[j * 3 + 1]) * fx.gold;
          colors[j * 3 + 2] = baseColors[j * 3 + 2] + (GOLD[2] - baseColors[j * 3 + 2]) * fx.gold;
        }
        geometry.attributes.color.needsUpdate = true;
      }

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
  var FADE_OUT_SECONDS = 4;
  var applauseBufferPromise = null;

  function loadApplauseBuffer() {
    var ctx = getAudioCtx();
    if (!ctx) return Promise.reject(new Error("no audio context"));
    if (!applauseBufferPromise) {
      applauseBufferPromise = fetch(applauseSrc)
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (buf) { return ctx.decodeAudioData(buf); });
    }
    return applauseBufferPromise;
  }

  function playApplause(intensity) {
    intensity = intensity || 1;
    var baseVolume = Math.min(1, 0.75 * intensity);
    loadApplauseBuffer().then(function (buffer) {
      var ctx = getAudioCtx();
      var source = ctx.createBufferSource();
      source.buffer = buffer;
      var gain = ctx.createGain();
      var now = ctx.currentTime;
      var dur = buffer.duration;
      var fadeStart = Math.max(0, dur - FADE_OUT_SECONDS);
      gain.gain.setValueAtTime(baseVolume, now);
      gain.gain.setValueAtTime(baseVolume, now + fadeStart);
      gain.gain.linearRampToValueAtTime(0.0001, now + dur);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
    }).catch(function () { /* autoplay-policy or decode edge cases — ignore */ });
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
  var honorableMentionEl = document.getElementById("honorableMention");
  var honorableMentionProject = projectById["16"];

  var revealBtn = document.getElementById("revealBtn");
  var enterHallBtn = document.getElementById("enterHallBtn");

  if (honorableMentionEl && honorableMentionProject) {
    honorableMentionEl.textContent = "\uD83C\uDF96\uFE0F Honorable mention: " +
      honorableMentionProject.title + " by " + honorableMentionProject.students.join(", ");
  }

  function revealHonorableMention() {
    if (!honorableMentionEl || !honorableMentionProject) return;
    honorableMentionEl.hidden = false;
    gsap.fromTo(honorableMentionEl, { opacity: 0, y: 10 },
      { opacity: 0.75, y: 0, duration: 0.6, ease: "power2.out" });
  }

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
    document.getElementById("students-" + place).textContent = studentsWithFlags(project);
    document.getElementById("blurb-" + place).textContent = project.blurb;
  }

  var houseLights = document.getElementById("houseLights");
  var ambience = document.getElementById("ambience");
  var finaleCaption = document.getElementById("finaleCaption");
  var podiumEl = document.getElementById("podium");

  // how bright the room settles back to after each successive reveal, and how
  // warm the golden ambience becomes
  var AFTERGLOW = { 3: 0.30, 2: 0.18, 1: 0 };
  var AMBIENCE = { 3: 0.22, 2: 0.45, 1: 1 };

  var goldRainTimer = null;

  // --- prize count-up ------------------------------------------------------
  var PRIZE_TARGET = { 1: 3000, 2: 1500, 3: 500 };

  function prizeEl(place) {
    var card = document.getElementById("card-" + place);
    return card ? card.querySelector(".podium__prize-amount") : null;
  }

  function formatMoney(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  function countUpPrize(place) {
    var el = prizeEl(place);
    if (!el) return;
    var target = PRIZE_TARGET[place] || 0;
    if (reducedMotion()) { el.textContent = formatMoney(target); return; }
    var counter = { v: 0 };
    el.classList.add("is-counting");
    el.textContent = formatMoney(0);
    gsap.killTweensOf(counter);
    gsap.to(counter, {
      v: target,
      duration: 1,
      ease: "power2.out",
      onUpdate: function () { el.textContent = formatMoney(counter.v); },
      onComplete: function () {
        el.textContent = formatMoney(target);
        el.classList.remove("is-counting");
        gsap.fromTo(el, { scale: 1.12 }, { scale: 1, duration: 0.3, ease: "back.out(2)" });
      },
    });
  }

  function resetPrize(place) {
    var el = prizeEl(place);
    if (!el) return;
    gsap.killTweensOf(el);
    el.classList.remove("is-counting");
    el.style.transform = "";
    el.textContent = formatMoney(PRIZE_TARGET[place] || 0);
  }

  // --- house lights --------------------------------------------------------
  var spotCard = null;
  function aimSpotlight(card) {
    if (!houseLights || !card) return;
    spotCard = card;
    var r = card.getBoundingClientRect();
    houseLights.style.setProperty("--spot-x", (r.left + r.width / 2) + "px");
    houseLights.style.setProperty("--spot-y", (r.top + r.height / 2) + "px");
    houseLights.style.setProperty("--spot-r", Math.round(Math.max(r.width, r.height) * 0.85 + 80) + "px");
  }

  function keepSpotlightAimed() { if (spotCard) aimSpotlight(spotCard); }
  window.addEventListener("resize", keepSpotlightAimed);
  var revealScroller = document.querySelector(".reveal");
  if (revealScroller) revealScroller.addEventListener("scroll", keepSpotlightAimed, { passive: true });

  // --- first-place gold rain ----------------------------------------------
  function startGoldRain() {
    if (typeof confetti !== "function" || reducedMotion()) return;
    var end = Date.now() + 4000;
    stopGoldRain();
    goldRainTimer = setInterval(function () {
      if (Date.now() > end) { stopGoldRain(); return; }
      confetti({
        particleCount: 5,
        startVelocity: 0,
        ticks: 320,
        gravity: 0.28,
        drift: (Math.random() - 0.5) * 1.2,
        scalar: 0.85,
        spread: 60,
        origin: { x: Math.random(), y: -0.05 },
        colors: ["#DFA63E", "#E8C377", "#F2E2BE"],
        disableForReducedMotion: true,
      });
    }, 180);
  }

  function stopGoldRain() {
    if (goldRainTimer) { clearInterval(goldRainTimer); goldRainTimer = null; }
  }

  // --- finale --------------------------------------------------------------
  function playFinale() {
    if (podiumEl) podiumEl.classList.add("is-finale");
    if (finaleCaption) {
      finaleCaption.hidden = false;
      gsap.fromTo(finaleCaption, { opacity: 0, y: 8 },
        { opacity: 0.85, y: 0, duration: dur(0.9), delay: hold(0.5), ease: "power2.out" });
    }
    [1, 2, 3].forEach(function (p) {
      var card = document.getElementById("card-" + p);
      if (!card) return;
      gsap.to(card, {
        boxShadow: p === 1
          ? "0 14px 46px rgba(223,166,62,0.42)"
          : "0 10px 34px rgba(223,166,62,0.26)",
        duration: dur(1.1),
        ease: "power2.out",
      });
    });
    gsap.to(".podium__slot", {
      scale: 0.985, y: 0, duration: dur(0.9), ease: "power2.out", stagger: 0.05,
      transformOrigin: "bottom center",
    });
  }

  function clearFinale() {
    if (podiumEl) podiumEl.classList.remove("is-finale");
    if (finaleCaption) {
      gsap.killTweensOf(finaleCaption);
      gsap.set(finaleCaption, { opacity: 0, y: 8 });
      finaleCaption.hidden = true;
    }
    gsap.killTweensOf(".podium__slot");
    gsap.set(".podium__slot", { scale: 1, y: 0, opacity: 1, transformOrigin: "50% 50%" });
  }

  // --- the reveal ----------------------------------------------------------
  function revealPlace(place, onDone) {
    var winner = winnerByPlace[place];
    var project = winner ? projectById[winner.projectId] : null;
    if (!project) { if (onDone) onDone(); return; }

    revealedProjectByPlace[place] = project;
    populateCard(place, project);

    var card = document.getElementById("card-" + place);
    var locked = card.querySelector(".podium__locked");
    var revealed = card.querySelector(".podium__revealed");
    var isFirst = place === 1;

    aimSpotlight(card);

    var tl = gsap.timeline({ onComplete: function () { if (onDone) onDone(); } });

    // 1. house lights down, drumroll, anticipation hold
    tl.call(function () { aimSpotlight(card); cueDrumroll(); })
      .to(houseLights, { opacity: 1, duration: dur(0.7), ease: "power2.inOut" })
      .to(card, { scale: 1.03, duration: dur(0.7), ease: "power2.out" }, "<")
      .to({}, { duration: hold(0.8) });

    // 2. the flip, inside the spotlight
    tl.call(function () { cueWhoosh(); })
      .to(locked, { opacity: 0, scale: 0.8, duration: dur(0.22), ease: "power1.in" })
      .set(locked, { display: "none" })
      .call(function () { revealed.hidden = false; })
      .fromTo(revealed, { opacity: 0, y: 14, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: dur(0.55), ease: "back.out(1.6)" });

    // 3. reaction — sound, particles, money
    tl.call(function () {
      cueApplause(isFirst ? 1.5 : 1);
      if (isFirst) cueSparkle();
      particleFx.pulse(isFirst ? 1.4 : 1);
      if (isFirst) particleFx.goldSwirl();
      countUpPrize(place);
      if (isFirst) {
        if (typeof confetti === "function") {
          confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.55 },
            colors: ["#DFA63E", "#37788A", "#8E2E4D"],
            disableForReducedMotion: true,
          });
        }
        startGoldRain();
        gsap.fromTo(card, { boxShadow: "0 10px 34px rgba(223,166,62,0.18)" },
          { boxShadow: "0 16px 50px rgba(223,166,62,0.45)", duration: dur(0.6), yoyo: true, repeat: 3 });
      }
    });

    // 4. lights back up — a little warmer and brighter each time
    tl.to(card, { scale: 1, duration: dur(0.8), ease: "power2.inOut" }, "+=" + hold(0.35))
      .to(houseLights, { opacity: AFTERGLOW[place], duration: dur(1.2), ease: "power2.inOut" }, "<")
      .to(ambience, { opacity: AMBIENCE[place], duration: dur(1.4), ease: "power2.inOut" }, "<");

    if (isFirst) tl.call(playFinale, null, "-=0.3");
  }

  var skipToHallLink = document.getElementById("skipToHallLink");
  function updateActionUI() {
    if (stepIndex >= sequence.length) {
      revealBtn.hidden = true;
      enterHallBtn.hidden = false;
      if (skipToHallLink) skipToHallLink.hidden = true; // redundant once the big button shows
      gsap.fromTo(enterHallBtn, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 });
      return;
    }
    if (skipToHallLink) skipToHallLink.hidden = false;
    var labels = { 3: "Reveal 3rd Place", 2: "Reveal 2nd Place", 1: "Reveal 1st Place \uD83C\uDFC6" };
    revealBtn.textContent = labels[sequence[stepIndex]];
  }

  var revealing = false;
  revealBtn.addEventListener("click", function () {
    if (revealing || stepIndex >= sequence.length) return;
    revealing = true;
    revealBtn.disabled = true;
    var place = sequence[stepIndex];
    // fade the button out of the shot while the lights are down
    gsap.to(revealBtn, { opacity: 0.15, duration: dur(0.5), ease: "power2.out" });
    revealPlace(place, function () {
      revealing = false;
      revealBtn.disabled = false;
      if (place === 3) revealHonorableMention();
      stepIndex++;
      gsap.to(revealBtn, { opacity: 1, duration: dur(0.4) });
      updateActionUI();
    });
  });

  function resetReveal() {
    stepIndex = 0;
    revealing = false;
    revealedProjectByPlace = {};

    // stop anything theatrical that may still be in flight
    stopGoldRain();
    clearFinale();
    particleFx.reset();
    if (typeof confetti === "function" && confetti.reset) confetti.reset();

    gsap.killTweensOf(houseLights);
    gsap.killTweensOf(ambience);
    gsap.set(houseLights, { opacity: 0 });
    gsap.set(ambience, { opacity: 0 });

    [1, 2, 3].forEach(function (place) {
      var card = document.getElementById("card-" + place);
      var locked = card.querySelector(".podium__locked");
      var revealed = card.querySelector(".podium__revealed");
      gsap.killTweensOf(card);
      gsap.set(card, { scale: 1 });
      gsap.set(locked, { display: "", opacity: 1, scale: 1 });
      gsap.set(revealed, { opacity: 0, y: 14, scale: 0.92 });
      revealed.hidden = true;
      card.style.boxShadow = "";
      resetPrize(place);
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

    if (honorableMentionEl) {
      gsap.killTweensOf(honorableMentionEl);
      gsap.set(honorableMentionEl, { opacity: 0, y: 10 });
      honorableMentionEl.hidden = true;
    }

    enterHallBtn.hidden = true;
    revealBtn.hidden = false;
    revealBtn.disabled = false;
    gsap.killTweensOf(revealBtn);
    gsap.set(revealBtn, { opacity: 1, y: 0 });
    updateActionUI();
  }

  var resetRevealBtn = document.getElementById("resetRevealBtn");
  if (resetRevealBtn) resetRevealBtn.addEventListener("click", resetReveal);
  if (new URLSearchParams(location.search).get("present") && resetRevealBtn) resetRevealBtn.style.display = "none";

  // initial podium entrance animation (this script may be injected after
  // DOMContentLoaded by the access gate, so run immediately in that case)
  function onReady(fn) {
    if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  onReady(function () {
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

  function sanUrl(u) {
    if (window.GAIVS_SAFEURL) return GAIVS_SAFEURL.sanitize(u);
    return typeof u === "string" ? u : "";
  }

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
    var deckUrl = project.deckSrc || "";

    watchVideo.hidden = true; watchVideo.removeAttribute("src");
    watchVideoFrame.hidden = true; watchVideoFrame.removeAttribute("src");
    watchVideoPlaceholder.hidden = true;
    watchVideoExternalLink.hidden = true;
    var v = classifyVideo(project.videoSrc);
    if (v.type === "video") {
      watchVideo.hidden = false; watchVideo.src = sanUrl(v.url);
    } else if (v.type === "iframe") {
      watchVideoFrame.hidden = false; watchVideoFrame.src = sanUrl(v.url);
    } else if (v.type === "external") {
      watchVideoExternalLink.hidden = false;
      watchVideoExternalLink.href = sanUrl(v.url);
    } else {
      watchVideoPlaceholder.hidden = false;
    }

    if (deckUrl) {
      watchDeckLink.href = sanUrl(deckUrl);
      watchDeckLink.style.display = "inline-flex";
    } else {
      watchDeckLink.style.display = "none";
    }

    if (project.prototypeSrc) {
      watchPrototypeLink.href = sanUrl(project.prototypeSrc);
      watchPrototypeLink.style.display = "inline-flex";
    } else {
      watchPrototypeLink.style.display = "none";
    }

    watchAskWrap.hidden = !project.ask;
    watchAsk.textContent = project.ask || "";
    watchCommitmentWrap.hidden = !project.commitment;
    watchCommitment.textContent = project.commitment || "";

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
    }
  });

  watchOverlay.addEventListener("click", closeWatch);
  watchClose.addEventListener("click", closeWatch);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !watchModal.hidden) closeWatch();
  });
})();
