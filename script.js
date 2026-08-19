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
  // CEL SHADING HELPERS
  // ===========================================================================
  function makeToonGradient() {
    var c = document.createElement("canvas");
    c.width = 4; c.height = 1;
    var ctx = c.getContext("2d");
    var shades = [70, 140, 200, 255];
    shades.forEach(function (v, i) {
      ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
      ctx.fillRect(i, 0, 1, 1);
    });
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }
  var toonGradient = makeToonGradient();

  function toonMaterial(color, opts) {
    opts = opts || {};
    var mat = new THREE.MeshToonMaterial({
      color: color, gradientMap: toonGradient,
      emissive: opts.emissive !== undefined ? opts.emissive : 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0,
      map: opts.map || null,
      side: opts.side !== undefined ? opts.side : THREE.FrontSide,
    });
    return mat;
  }

  // adds a black inverted-hull outline around a mesh (Borderlands-style)
  function addOutline(mesh, scale) {
    var outlineMat = new THREE.MeshBasicMaterial({ color: 0x1c1a16, side: THREE.BackSide });
    var outline = new THREE.Mesh(mesh.geometry, outlineMat);
    outline.scale.multiplyScalar(scale || 1.06);
    mesh.add(outline);
    return outline;
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
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0xd9cdb2, 0.95));
  var sun = new THREE.DirectionalLight(0xfff6e0, 1.1);
  sun.position.set(4, 20, START_Z - 10);
  sun.target.position.set(0, 0, START_Z - 30);
  scene.add(sun);
  scene.add(sun.target);
  for (var lz = START_Z - 4; lz > END_Z + 4; lz -= 11) {
    var pl = new THREE.PointLight(0xffe9c2, 45, 24, 2);
    pl.position.set(0, 6.5, lz);
    scene.add(pl);
  }

  var WALL_H = 9, WALL_X = 7.5;
  var RIDGE_Y = WALL_H + 2.6;   // peak of the gabled roof
  var PENDANT_Y = 5.3;          // fixed hang height regardless of roof shape

  // floor: warm base + a teal runway stripe down the center
  var floorGeo = new THREE.PlaneGeometry(WALL_X * 2 + 2, HALLWAY_LEN);
  var floor = new THREE.Mesh(floorGeo, toonMaterial(0xf6f2e9));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, HALLWAY_CENTER_Z);
  scene.add(floor);

  var runway = new THREE.Mesh(new THREE.PlaneGeometry(1.5, HALLWAY_LEN), toonMaterial(0x37788a));
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.008, HALLWAY_CENTER_Z);
  scene.add(runway);

  var grid = new THREE.GridHelper(Math.max(WALL_X * 2, HALLWAY_LEN), Math.round(HALLWAY_LEN / 2), 0xe3ddcb, 0xe3ddcb);
  grid.position.set(0, 0.012, HALLWAY_CENTER_Z);
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  // gabled roof — alternating solid + glass skylight bays so the sky shows through
  var roofOpaqueMat = toonMaterial(0xece4d3, { side: THREE.DoubleSide });
  var glassMat = new THREE.MeshBasicMaterial({ color: 0xdcebf0, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
  var BAY_LEN = 8;
  var bayIdx = 0;
  for (var bz = START_Z; bz > END_Z - BAY_LEN; bz -= BAY_LEN) {
    var z0 = bz, z1 = bz - BAY_LEN;
    var isGlass = bayIdx % 2 === 1;
    bayIdx++;
    [-1, 1].forEach(function (side) {
      var outerX = side * WALL_X;
      var geo = new THREE.BufferGeometry();
      var verts = new Float32Array([
        outerX, WALL_H, z0,   0, RIDGE_Y, z0,   outerX, WALL_H, z1,
        outerX, WALL_H, z1,   0, RIDGE_Y, z0,   0, RIDGE_Y, z1,
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      var mesh = new THREE.Mesh(geo, isGlass ? glassMat : roofOpaqueMat);
      scene.add(mesh);
    });
  }

  // ridge cap beam along the peak, and eave beams where roof meets wall
  var capMat = toonMaterial(0x8f8577);
  var ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, HALLWAY_LEN), capMat);
  ridgeCap.position.set(0, RIDGE_Y, HALLWAY_CENTER_Z);
  addOutline(ridgeCap, 1.1);
  scene.add(ridgeCap);

  var trussMat = toonMaterial(0x8f8577);
  for (var tz = START_Z - 2; tz > END_Z; tz -= 8) {
    var beam = new THREE.Mesh(new THREE.BoxGeometry(WALL_X * 2, 0.28, 0.28), trussMat);
    beam.position.set(0, WALL_H + 0.3, tz);
    addOutline(beam, 1.08);
    scene.add(beam);
  }

  for (var fz = START_Z - 3; fz > END_Z + 3; fz -= 6) {
    var rodTop = RIDGE_Y - 0.3;
    var rodLen = rodTop - PENDANT_Y;
    var rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, rodLen, 8),
      toonMaterial(0x6b6255)
    );
    rod.position.set(0, (rodTop + PENDANT_Y) / 2, fz);
    scene.add(rod);

    var pendant = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12),
      toonMaterial(0xfff6df, { emissive: 0xffe0a0, emissiveIntensity: 1.6 })
    );
    pendant.position.set(0, PENDANT_Y, fz);
    addOutline(pendant, 1.1);
    scene.add(pendant);
  }

  // vertical accent pillars between booth pairs, alternating brand colors — breaks up repetition and doubles as wayfinding
  var pillarColors = [0x37788a, 0xdfa63e, 0x8e2e4d];
  var pillarIdx = 0;
  for (var pz = START_Z - PAIR_SPACING / 2; pz > END_Z; pz -= PAIR_SPACING) {
    var pillarColor = pillarColors[pillarIdx % pillarColors.length];
    pillarIdx++;
    [-WALL_X, WALL_X].forEach(function (x) {
      var pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, 0.6), toonMaterial(pillarColor));
      pillar.position.set(x + (x < 0 ? 0.15 : -0.15), WALL_H / 2, pz);
      addOutline(pillar, 1.04);
      scene.add(pillar);
    });
  }

  // walls with a teal baseboard and a gold datum line
  var wallMat = toonMaterial(0xfdfbf5);
  var baseboardMat = toonMaterial(0x2c6473);
  var trimMat = toonMaterial(0xdfa63e, { emissive: 0x8a611f, emissiveIntensity: 0.25 });
  [-WALL_X, WALL_X].forEach(function (x) {
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
    new THREE.BoxGeometry(WALL_X * 2 + 0.2, WALL_H, 0.3),
    toonMaterial(0xfdfbf5)
  );
  endWall.position.set(0, WALL_H / 2, END_WALL_Z - 1);
  addOutline(endWall, 1.02);
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
    toonMaterial(0xffffff, { map: bannerTexture })
  );
  banner.position.set(0, 1.9, END_WALL_Z - 0.83);
  scene.add(banner);

  var endGlow = new THREE.PointLight(0xffe9c2, 20, 12, 2);
  endGlow.position.set(0, 3, END_WALL_Z - 3);
  scene.add(endGlow);

  // booths — museum-plinth style: cream base + colored accent top, with a soft ground shadow
  var clickableMeshes = [];
  var floatingSprites = [];
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

    var baseMat = toonMaterial(0xf4f0e6);
    var base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 1.0), baseMat);
    base.position.set(pos.x, 0.425, pos.z);
    base.userData.projectIndex = index;
    base.userData.restEmissive = 0x000000;
    base.userData.restIntensity = 0;
    addOutline(base, 1.05);
    scene.add(base);
    clickableMeshes.push(base);

    var topMat = toonMaterial(color, { emissive: color, emissiveIntensity: 0.12 });
    var top = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.95, 0.82), topMat);
    top.position.set(pos.x, 0.425 + 0.475 + 0.4, pos.z);
    top.userData.projectIndex = index;
    top.userData.restEmissive = color;
    top.userData.restIntensity = 0.12;
    addOutline(top, 1.06);
    scene.add(top);
    clickableMeshes.push(top);

    var texture = makeLabelTexture(project.id, project.title);
    var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    var sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.9, 0.95, 1);
    sprite.position.set(pos.x, 2.5, pos.z);
    sprite.userData.baseY = 2.5;
    sprite.userData.phase = index * 0.65;
    scene.add(sprite);
    floatingSprites.push(sprite);

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

    var t = performance.now() * 0.0016;
    floatingSprites.forEach(function (s) {
      s.position.y = s.userData.baseY + Math.sin(t + s.userData.phase) * 0.14;
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
