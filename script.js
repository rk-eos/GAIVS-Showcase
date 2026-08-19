(function () {
  "use strict";

  // ===========================================================================
  // LAYOUT CONSTANTS
  // ===========================================================================
  var PAIR_SPACING = 7;       // distance along Z between successive booth pairs
  var START_Z = 9;            // camera Z at the entrance (progress = 0)
  var PAIR_COUNT = Math.ceil(PROJECTS.length / 2);
  var LAST_PAIR_Z = -(10 + (PAIR_COUNT - 1) * PAIR_SPACING);
  var END_WALL_Z = LAST_PAIR_Z - 10;  // where the physical end wall sits
  var END_Z = END_WALL_Z + 5;         // camera's max travel (progress = 1000) — stops short of the wall
  var FAR_EDGE_Z = END_WALL_Z - 3;    // a little past the wall, for floor/ceiling/wall padding
  var SIDE_X = 3.2;
  var HALLWAY_LEN = START_Z - FAR_EDGE_Z + 12;
  var HALLWAY_CENTER_Z = (START_Z + FAR_EDGE_Z) / 2;

  var ACCENT_COLORS = [0x37788a, 0xdfa63e, 0x8e2e4d];

  function boothPosition(index) {
    var pair = Math.floor(index / 2);
    var side = index % 2 === 0 ? -1 : 1; // even index -> left, odd -> right
    return { x: side * SIDE_X, z: -(10 + pair * PAIR_SPACING) };
  }

  function progressToZ(progress) {
    return START_Z + (END_Z - START_Z) * progress;
  }

  // ===========================================================================
  // CANVAS TEXT LABEL (booth number + title, drawn to a canvas texture)
  // ===========================================================================
  function makeLabelTexture(idText, titleText) {
    var canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    roundRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 24);
    ctx.fill();
    ctx.strokeStyle = "#ECECEC";
    ctx.lineWidth = 3;
    roundRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 24);
    ctx.stroke();

    ctx.fillStyle = "#DFA63E";
    ctx.font = "700 64px 'Poppins', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(idText, canvas.width / 2, 108);

    ctx.fillStyle = "#26333B";
    ctx.font = "600 34px 'Poppins', sans-serif";
    wrapCanvasText(ctx, titleText, canvas.width / 2, 165, canvas.width - 60, 40);

    var texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapCanvasText(ctx, text, cx, y, maxWidth, lineHeight) {
    var words = text.split(" ");
    var line = "", lines = [];
    words.forEach(function (w) {
      var test = (line + " " + w).trim();
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, 2).forEach(function (l, i) {
      ctx.fillText(l, cx, y + i * lineHeight);
    });
  }

  // ===========================================================================
  // SCENE SETUP
  // ===========================================================================
  var canvas = document.getElementById("hallwayCanvas");
  var wrap = document.querySelector(".hallway-wrap");
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setClearColor(0xfbfaf7, 1);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xfbfaf7, 22, Math.abs(END_WALL_Z) + 20);

  var camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200);
  var EYE_HEIGHT = 1.6;
  camera.position.set(0, EYE_HEIGHT, START_Z);

  function resize() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // atmosphere: soft vertical gradient sky instead of flat clear color
  var skyCanvas = document.createElement("canvas");
  skyCanvas.width = 8; skyCanvas.height = 256;
  var skyCtx = skyCanvas.getContext("2d");
  var skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0, "#F3E7D0");
  skyGrad.addColorStop(1, "#FBFAF7");
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 8, 256);
  scene.background = new THREE.CanvasTexture(skyCanvas);

  // lights — ambient + warm hemisphere + a run of gallery downlights
  scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0xd9cdb2, 1.4));
  for (var lz = START_Z - 4; lz > END_Z + 4; lz -= 11) {
    var pl = new THREE.PointLight(0xffe9c2, 22, 15, 2);
    pl.position.set(0, 3.7, lz);
    scene.add(pl);
  }

  var WALL_H = 3.6, CEIL_Y = 3.6;

  // floor: warm base + a teal runway stripe down the center
  var floorGeo = new THREE.PlaneGeometry(12, HALLWAY_LEN);
  var floorMat = new THREE.MeshStandardMaterial({ color: 0xf6f2e9, roughness: 0.95 });
  var floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, HALLWAY_CENTER_Z);
  scene.add(floor);

  var runway = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, HALLWAY_LEN),
    new THREE.MeshStandardMaterial({ color: 0x37788a, roughness: 0.85 })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.008, HALLWAY_CENTER_Z);
  scene.add(runway);

  var grid = new THREE.GridHelper(Math.max(12, HALLWAY_LEN), Math.round(HALLWAY_LEN / 2), 0xe3ddcb, 0xe3ddcb);
  grid.position.set(0, 0.012, HALLWAY_CENTER_Z);
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  // ceiling with recessed light strips
  var ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(12, HALLWAY_LEN),
    new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CEIL_Y, HALLWAY_CENTER_Z);
  scene.add(ceiling);

  for (var fz = START_Z - 3; fz > END_Z + 3; fz -= 6) {
    var rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a7a5a })
    );
    rod.position.set(0, CEIL_Y - 0.28, fz);
    scene.add(rod);

    var pendant = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff6df, emissive: 0xffe0a0, emissiveIntensity: 1.6, roughness: 0.4 })
    );
    pendant.position.set(0, CEIL_Y - 0.56, fz);
    scene.add(pendant);
  }

  // vertical accent pillars between booth pairs, alternating brand colors — breaks up repetition and doubles as wayfinding
  var pillarColors = [0x37788a, 0xdfa63e, 0x8e2e4d];
  var pillarIdx = 0;
  for (var pz = START_Z - PAIR_SPACING / 2; pz > END_Z; pz -= PAIR_SPACING) {
    var pillarColor = pillarColors[pillarIdx % pillarColors.length];
    pillarIdx++;
    [-5, 5].forEach(function (x) {
      var pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, WALL_H, 0.5),
        new THREE.MeshStandardMaterial({ color: pillarColor, roughness: 0.6 })
      );
      pillar.position.set(x + (x < 0 ? 0.09 : -0.09), WALL_H / 2, pz);
      scene.add(pillar);
    });
  }

  // walls with a teal baseboard and a gold datum line
  var wallMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf5, roughness: 0.92 });
  var baseboardMat = new THREE.MeshStandardMaterial({ color: 0x2c6473, roughness: 0.8 });
  var trimMat = new THREE.MeshStandardMaterial({ color: 0xdfa63e, roughness: 0.5, emissive: 0x8a611f, emissiveIntensity: 0.25 });
  [-5, 5].forEach(function (x) {
    var wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, WALL_H, HALLWAY_LEN), wallMat);
    wall.position.set(x, WALL_H / 2, HALLWAY_CENTER_Z);
    scene.add(wall);

    var baseboard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, HALLWAY_LEN), baseboardMat);
    baseboard.position.set(x, 0.17, HALLWAY_CENTER_Z);
    scene.add(baseboard);

    var trim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, HALLWAY_LEN), trimMat);
    trim.position.set(x, 2.5, HALLWAY_CENTER_Z);
    scene.add(trim);
  });

  // end wall — a visible terminus instead of an infinite foggy vanishing point
  var endWall = new THREE.Mesh(
    new THREE.BoxGeometry(10.2, WALL_H, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xfdfbf5, roughness: 0.9 })
  );
  endWall.position.set(0, WALL_H / 2, END_WALL_Z - 1);
  scene.add(endWall);

  var bannerCanvas = document.createElement("canvas");
  bannerCanvas.width = 1024; bannerCanvas.height = 384;
  var bctx = bannerCanvas.getContext("2d");
  bctx.fillStyle = "#37788A";
  bctx.fillRect(0, 0, 1024, 384);
  bctx.fillStyle = "#FBFAF7";
  bctx.font = "800 84px 'Poppins', sans-serif";
  bctx.textAlign = "center";
  bctx.fillText("You've reached", 512, 165);
  bctx.fillStyle = "#DFA63E";
  bctx.fillText("the end of the hall", 512, 260);
  var bannerTexture = new THREE.CanvasTexture(bannerCanvas);
  var banner = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 2.25),
    new THREE.MeshStandardMaterial({ map: bannerTexture, roughness: 0.6 })
  );
  banner.position.set(0, 1.9, END_WALL_Z - 0.83);
  scene.add(banner);

  var endGlow = new THREE.PointLight(0xffe9c2, 20, 12, 2);
  endGlow.position.set(0, 3, END_WALL_Z - 3);
  scene.add(endGlow);

  // booths — museum-plinth style: cream base + colored accent top, with a soft ground shadow
  var clickableMeshes = [];
  PROJECTS.forEach(function (project, index) {
    var pos = boothPosition(index);
    var color = ACCENT_COLORS[index % ACCENT_COLORS.length];

    var shadowBlob = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 })
    );
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.set(pos.x, 0.015, pos.z);
    scene.add(shadowBlob);

    var baseMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.85 });
    var base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 1.0), baseMat);
    base.position.set(pos.x, 0.425, pos.z);
    base.userData.projectIndex = index;
    base.userData.restEmissive = 0x000000;
    base.userData.restIntensity = 0;
    scene.add(base);
    clickableMeshes.push(base);

    var topMat = new THREE.MeshStandardMaterial({
      color: color, roughness: 0.65, emissive: color, emissiveIntensity: 0.12,
    });
    var top = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.95, 0.82), topMat);
    top.position.set(pos.x, 0.425 + 0.475 + 0.4, pos.z);
    top.userData.projectIndex = index;
    top.userData.restEmissive = color;
    top.userData.restIntensity = 0.12;
    scene.add(top);
    clickableMeshes.push(top);

    var texture = makeLabelTexture(project.id, project.title);
    var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    var sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.9, 0.95, 1);
    sprite.position.set(pos.x, 2.15, pos.z);
    scene.add(sprite);

    project.__meshes = [base, top];
    project.__z = pos.z;
  });

  // ===========================================================================
  // WALKING
  // ===========================================================================
  var slider = document.getElementById("walkSlider");
  var walkBack = document.getElementById("walkBack");
  var walkForward = document.getElementById("walkForward");
  var boothCounter = document.getElementById("boothCounter");
  var hint = document.getElementById("hallwayHint");

  var targetProgress = 0; // 0-1
  var mouseNormX = 0;

  function setProgress(p) {
    targetProgress = Math.max(0, Math.min(1, p));
    slider.value = Math.round(targetProgress * 1000);
    updateCounter();
  }

  function updateCounter() {
    var boothPos = targetProgress * PROJECTS.length;
    if (targetProgress <= 0.01) boothCounter.textContent = "Entrance";
    else if (targetProgress >= 0.99) boothCounter.textContent = "End of hall";
    else boothCounter.textContent = "Near booth " + Math.min(PROJECTS.length, Math.ceil(boothPos)) + " of " + PROJECTS.length;
  }

  slider.addEventListener("input", function () {
    targetProgress = parseInt(slider.value, 10) / 1000;
    updateCounter();
    hint.classList.add("is-hidden");
  });

  walkForward.addEventListener("click", function () { setProgress(targetProgress + 0.08); hint.classList.add("is-hidden"); });
  walkBack.addEventListener("click", function () { setProgress(targetProgress - 0.08); hint.classList.add("is-hidden"); });

  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    setProgress(targetProgress + e.deltaY * 0.0006);
    hint.classList.add("is-hidden");
  }, { passive: false });

  document.addEventListener("keydown", function (e) {
    if (!panelIsOpen()) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { setProgress(targetProgress + 0.05); hint.classList.add("is-hidden"); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { setProgress(targetProgress - 0.05); hint.classList.add("is-hidden"); }
    }
  });

  var touchStartY = null;
  canvas.addEventListener("touchstart", function (e) { touchStartY = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener("touchmove", function (e) {
    if (touchStartY === null) return;
    var dy = touchStartY - e.touches[0].clientY;
    setProgress(targetProgress + dy * 0.0018);
    touchStartY = e.touches[0].clientY;
    hint.classList.add("is-hidden");
  }, { passive: true });

  wrap.addEventListener("mousemove", function (e) {
    var rect = wrap.getBoundingClientRect();
    mouseNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  });

  // search-to-walk
  var searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var term = searchInput.value.trim().toLowerCase();
    if (!term) return;
    var match = PROJECTS.find(function (p) {
      return (p.title + " " + p.students.join(" ") + " " + p.id).toLowerCase().indexOf(term) !== -1;
    });
    if (match) {
      var pairZ = match.__z;
      var progress = (pairZ - START_Z) / (END_Z - START_Z);
      setProgress(progress);
      flashBooth(match.__meshes);
      hint.classList.add("is-hidden");
    }
  });

  function flashBooth(meshes) {
    meshes.forEach(function (mesh) {
      mesh.material.emissive.setHex(0xdfa63e);
      mesh.userData.flash = 1.4;
    });
  }

  // ===========================================================================
  // RENDER LOOP
  // ===========================================================================
  var lastZ = camera.position.z;
  function animate() {
    requestAnimationFrame(animate);

    var targetZ = progressToZ(targetProgress);
    camera.position.z += (targetZ - camera.position.z) * 0.08;

    var targetSwayX = mouseNormX * 0.5;
    camera.position.x += (targetSwayX - camera.position.x) * 0.06;

    var moving = Math.abs(targetZ - camera.position.z) > 0.02;
    var bob = moving ? Math.sin(performance.now() * 0.008) * 0.025 : 0;
    camera.position.y = EYE_HEIGHT + bob;

    clickableMeshes.forEach(function (m) {
      if (m.userData.flash > 0) {
        m.userData.flash *= 0.92;
        m.material.emissiveIntensity = m.userData.flash;
        if (m.userData.flash < 0.02) {
          m.userData.flash = 0;
          m.material.emissive.setHex(m.userData.restEmissive || 0x000000);
          m.material.emissiveIntensity = m.userData.restIntensity || 0;
        }
      }
    });

    renderer.render(scene, camera);
  }
  resize();
  updateCounter();
  animate();

  // ===========================================================================
  // CLICK -> RAYCAST -> OPEN PANEL
  // ===========================================================================
  var raycaster = new THREE.Raycaster();
  canvas.addEventListener("click", function (e) {
    var rect = canvas.getBoundingClientRect();
    var ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(clickableMeshes);
    if (hits.length) openPanel(hits[0].object.userData.projectIndex);
  });

  // ===========================================================================
  // DETAIL PANEL (same interaction pattern as before, no track/category info)
  // ===========================================================================
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("panel");
  var panelClose = document.getElementById("panelClose");
  var panelPrev = document.getElementById("panelPrev");
  var panelNext = document.getElementById("panelNext");
  var panelBoothId = document.getElementById("panelBoothId");
  var panelTitle = document.getElementById("panelTitle");
  var panelStudents = document.getElementById("panelStudents");
  var panelBlurb = document.getElementById("panelBlurb");
  var panelVideo = document.getElementById("panelVideo");
  var panelDeck = document.getElementById("panelDeck");
  var panelDeckFallback = document.getElementById("panelDeckFallback");
  var currentIndex = null;

  function panelIsOpen() { return !panel.hidden; }

  function openPanel(index) {
    currentIndex = index;
    var project = PROJECTS[index];

    panelBoothId.textContent = "Booth " + project.id;
    panelTitle.textContent = project.title;
    panelStudents.textContent = project.students.join(", ");
    panelBlurb.textContent = project.blurb;

    panelVideo.src = project.videoSrc;
    panelDeck.src = project.deckSrc;
    panelDeckFallback.href = project.deckSrc;

    overlay.hidden = false;
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add("is-open"); });
    panel.setAttribute("aria-hidden", "false");
    panelClose.focus();
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    panelVideo.pause();
    panelVideo.removeAttribute("src");
    panelVideo.load();
    setTimeout(function () { overlay.hidden = true; panel.hidden = true; }, 280);
    currentIndex = null;
  }

  function stepPanel(delta) {
    if (currentIndex === null) return;
    openPanel((currentIndex + delta + PROJECTS.length) % PROJECTS.length);
  }

  overlay.addEventListener("click", closePanel);
  panelClose.addEventListener("click", closePanel);
  panelPrev.addEventListener("click", function () { stepPanel(-1); });
  panelNext.addEventListener("click", function () { stepPanel(1); });

  document.addEventListener("keydown", function (e) {
    if (panel.hidden) return;
    if (e.key === "Escape") closePanel();
    if (e.key === "ArrowRight") stepPanel(1);
    if (e.key === "ArrowLeft") stepPanel(-1);
  });
})();
