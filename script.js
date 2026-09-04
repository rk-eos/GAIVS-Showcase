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

  var FLAG_BY_COUNTRY = {
    "Indonesia": "\uD83C\uDDEE\uD83C\uDDE9",
    "Vietnam": "\uD83C\uDDFB\uD83C\uDDF3",
    "United States": "\uD83C\uDDFA\uD83C\uDDF8",
    "China": "\uD83C\uDDE8\uD83C\uDDF3",
    "Japan": "\uD83C\uDDEF\uD83C\uDDF5",
  };

  // "Chaerin Lee 🇻🇳, Onie Namkung 🇻🇳" style — each name paired with its own
  // country flag so mixed-country teams (e.g. EyeSpy E-bikes) show correctly.
  // Used for regular DOM text (panel, podium, list) where the browser renders
  // emoji flags natively and correctly.
  function studentsWithFlags(project) {
    var countries = project.countries || [];
    return project.students.map(function (name, i) {
      var flag = FLAG_BY_COUNTRY[countries[i]] || "";
      return flag ? name + " " + flag : name;
    }).join(", ");
  }

  // Canvas does not reliably combine regional-indicator emoji into flags on
  // Windows. Draw them locally so they stay crisp, offline, and CSP-safe.
  function drawFlagIcon(ctx, country, x, y, w, h) {
    ctx.save();
    roundRect(ctx, x, y, w, h, 3);
    ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y, w, h);
    if (country === "Indonesia") {
      ctx.fillStyle = "#CE1126"; ctx.fillRect(x, y, w, h / 2);
    } else if (country === "Vietnam") {
      ctx.fillStyle = "#DA251D"; ctx.fillRect(x, y, w, h);
      drawStar(ctx, x + w / 2, y + h / 2, h * 0.28, h * 0.12, 5, "#FFDF00");
    } else if (country === "United States") {
      for (var s = 0; s < 7; s++) {
        ctx.fillStyle = "#B22234"; ctx.fillRect(x, y + s * h / 7, w, h / 14);
      }
      ctx.fillStyle = "#3C3B6E"; ctx.fillRect(x, y, w * 0.45, h * 0.55);
      ctx.fillStyle = "#FFFFFF";
      for (var sy = 0; sy < 3; sy++) for (var sx = 0; sx < 4; sx++) {
        ctx.beginPath(); ctx.arc(x + 4 + sx * 6, y + 4 + sy * 5, 1.1, 0, Math.PI * 2); ctx.fill();
      }
    } else if (country === "China") {
      ctx.fillStyle = "#DE2910"; ctx.fillRect(x, y, w, h);
      drawStar(ctx, x + w * 0.25, y + h * 0.32, h * 0.22, h * 0.09, 5, "#FFDE00");
    } else if (country === "Japan") {
      ctx.fillStyle = "#BC002D"; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.28, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(38,51,59,0.18)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 3);
    ctx.stroke();
  }

  function boothPosition(index) {
    var pair = Math.floor(index / 2);
    var side = index % 2 === 0 ? -1 : 1; // even index -> left, odd -> right
    return { x: side * SIDE_X, z: -(10 + pair * PAIR_SPACING) };
  }

  function progressToZ(progress) {
    return START_Z + (END_Z - START_Z) * progress;
  }

  // ===========================================================================
  // CANVAS TITLE CARD (project-aware vector art + booth information)
  // ===========================================================================
  var ART_THEMES = [
    { key: "fashion", label: "STYLE + SHARE", match: /stylist|fashion|wardrobe|outfit|clothing|beauty|wear/ },
    { key: "refill", label: "REFILL + REUSE", match: /refill|reusable|packaging|bottle|single.use|zero.waste/ },
    { key: "water", label: "WATER WATCH", match: /aqua|water|flood|drain|leak|ocean|marine|hydration/ },
    { key: "air", label: "CLEAN AIR", match: /air|pollution|emission|breath|carbon/ },
    { key: "fire", label: "FIRE SAFETY", match: /fire|flame|smoke|wildfire|emergency/ },
    { key: "prosthetic", label: "HUMAN TECH", match: /prosthetic|limb|bioeng|surger|amput|arm/ },
    { key: "access", label: "ACCESS FOR ALL", match: /accessib|sign language|hearing|deaf|mute|blind|vision/ },
    { key: "crossing", label: "SAFER STREETS", match: /crossing|cross the road|road safety|pedestrian/ },
    { key: "park", label: "PLAY OUTSIDE", match: /park|playground|play near|safe space to play/ },
    { key: "mobility", label: "MOVE BETTER", match: /bike|e-bike|ride|mobility|transport|transit|commute|route|vehicle|traffic/ },
    { key: "queue", label: "FAIR + FAST", match: /lineup|lunch line|queue|cut in line/ },
    { key: "finance", label: "HEALTHY CHOICES", match: /gambl|finance|money|budget|invest|saving|spend|bank/ },
    { key: "health", label: "WELLBEING", match: /health|mental|wellness|medical|therapy|care|fitness|sleep|stress/ },
    { key: "career", label: "OPEN DOORS", match: /career|job|resume|work|hire|employ|talent|intern/ },
    { key: "connect", label: "CONNECT", match: /link|connect|network|community|social|together|matching/ }
  ];

  function pickArtTheme(project) {
    var source = [project.title, project.blurb, project.ask, project.commitment]
      .filter(Boolean).join(" ").toLowerCase();
    for (var i = 0; i < ART_THEMES.length; i++) {
      if (ART_THEMES[i].match.test(source)) return ART_THEMES[i];
    }
    return { key: "spark", label: "AI VENTURE" };
  }

  function drawStar(ctx, cx, cy, outer, inner, points, fill) {
    ctx.save(); ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 ? inner : outer;
      var a = -Math.PI / 2 + i * Math.PI / points;
      if (!i) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
  }

  function drawProjectArt(ctx, project, accent, x, y, w, h) {
    var theme = pickArtTheme(project);
    var cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    roundRect(ctx, x, y, w, h, 22); ctx.clip();
    var bg = ctx.createLinearGradient(x, y, x + w, y + h);
    bg.addColorStop(0, accent); bg.addColorStop(1, "#26333B");
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.15; ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2;
    for (var g = -h; g < w + h; g += 34) {
      ctx.beginPath(); ctx.moveTo(x + g, y); ctx.lineTo(x + g + h, y + h); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.arc(x + w * 0.75, y + h * 0.18, w * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#FFFFFF"; ctx.fillStyle = "#FFFFFF";
    ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.lineJoin = "round";

    if (theme.key === "fashion") {
      ctx.beginPath(); ctx.arc(cx, cy - 58, 18, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 40); ctx.lineTo(cx - 58, cy + 22); ctx.lineTo(cx + 58, cy + 22); ctx.closePath(); ctx.stroke();
      drawStar(ctx, cx + 58, cy - 52, 15, 6, 4, "#F2C75C");
    } else if (theme.key === "water") {
      ctx.beginPath(); ctx.moveTo(cx, cy - 82); ctx.bezierCurveTo(cx - 58, cy - 10, cx - 48, cy + 48, cx, cy + 56); ctx.bezierCurveTo(cx + 48, cy + 48, cx + 58, cy - 10, cx, cy - 82); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx - 10, cy + 10, 22, 0.1, 1.6); ctx.stroke();
    } else if (theme.key === "refill") {
      ctx.strokeRect(cx - 28, cy - 44, 56, 90); ctx.fillRect(cx - 16, cy - 62, 32, 18);
      ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy + 2, 70, -1.15, 1.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 66, cy + 30); ctx.lineTo(cx + 66, cy + 2); ctx.lineTo(cx + 42, cy + 18); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + 2, 70, 1.95, 4.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 58, cy - 38); ctx.lineTo(cx - 66, cy - 10); ctx.lineTo(cx - 40, cy - 20); ctx.stroke();
    } else if (theme.key === "air") {
      ctx.lineWidth = 8;
      [-38, 0, 38].forEach(function (dy, i) {
        ctx.beginPath(); ctx.moveTo(cx - 66, cy + dy);
        ctx.bezierCurveTo(cx - 10, cy + dy - 28, cx + 8, cy + dy + 28, cx + 62 - i * 10, cy + dy); ctx.stroke();
      });
      ctx.fillStyle = "#F2C75C"; ctx.beginPath(); ctx.ellipse(cx + 52, cy - 60, 15, 28, 0.65, 0, Math.PI * 2); ctx.fill();
    } else if (theme.key === "fire") {
      ctx.beginPath(); ctx.moveTo(cx, cy + 66); ctx.bezierCurveTo(cx - 72, cy + 22, cx - 18, cy - 10, cx - 28, cy - 76); ctx.bezierCurveTo(cx + 42, cy - 30, cx + 78, cy + 22, cx, cy + 66); ctx.stroke();
      ctx.fillStyle = "#F2C75C"; ctx.beginPath(); ctx.moveTo(cx, cy + 36); ctx.bezierCurveTo(cx - 24, cy + 8, cx + 4, cy - 4, cx + 2, cy - 34); ctx.bezierCurveTo(cx + 32, cy - 4, cx + 28, cy + 24, cx, cy + 36); ctx.fill();
    } else if (theme.key === "mobility") {
      ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx - 48, cy + 34, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 52, cy + 34, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 48, cy + 34); ctx.lineTo(cx - 8, cy - 24); ctx.lineTo(cx + 18, cy + 34); ctx.lineTo(cx - 48, cy + 34); ctx.moveTo(cx - 8, cy - 24); ctx.lineTo(cx + 42, cy - 24); ctx.lineTo(cx + 52, cy + 34); ctx.stroke();
    } else if (theme.key === "park") {
      ctx.fillStyle = "#F2C75C"; ctx.beginPath(); ctx.arc(cx - 28, cy - 32, 42, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 28, cy - 18, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cx - 9, cy - 14, 18, 78);
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx - 70, cy + 64); ctx.quadraticCurveTo(cx, cy + 34, cx + 70, cy + 64); ctx.stroke();
    } else if (theme.key === "crossing") {
      ctx.fillStyle = "#FFFFFF";
      [-62, -20, 22].forEach(function (dx) { ctx.save(); ctx.translate(cx + dx, cy); ctx.rotate(-0.22); ctx.fillRect(-10, -70, 20, 140); ctx.restore(); });
      ctx.fillStyle = "#F2C75C"; ctx.beginPath(); ctx.arc(cx + 54, cy - 50, 17, 0, Math.PI * 2); ctx.fill();
    } else if (theme.key === "queue") {
      [-52, 0, 52].forEach(function (dx, i) {
        ctx.beginPath(); ctx.arc(cx + dx, cy - 30 + i * 8, 17, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + dx, cy - 10 + i * 8); ctx.lineTo(cx + dx, cy + 48 + i * 8); ctx.stroke();
      });
      ctx.strokeStyle = "#F2C75C"; ctx.beginPath(); ctx.moveTo(cx - 70, cy + 72); ctx.lineTo(cx + 72, cy + 72); ctx.stroke();
    } else if (theme.key === "access") {
      ctx.beginPath(); ctx.ellipse(cx, cy, 76, 48, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#F2C75C"; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
      drawStar(ctx, cx + 66, cy - 62, 14, 6, 4, "#FFFFFF");
    } else if (theme.key === "prosthetic") {
      ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(cx - 28, cy - 74); ctx.lineTo(cx - 10, cy - 12); ctx.lineTo(cx + 22, cy + 20); ctx.lineTo(cx + 10, cy + 74); ctx.stroke();
      ctx.lineWidth = 6; [-1, 0, 1].forEach(function (n) { ctx.beginPath(); ctx.arc(cx - 28 + n * 24, cy - 70 + Math.abs(n) * 10, 10, 0, Math.PI * 2); ctx.stroke(); });
      drawStar(ctx, cx + 56, cy - 30, 15, 6, 4, "#F2C75C");
    } else if (theme.key === "health") {
      ctx.beginPath(); ctx.moveTo(cx, cy + 60); ctx.bezierCurveTo(cx - 95, cy + 6, cx - 64, cy - 66, cx - 18, cy - 44); ctx.bezierCurveTo(cx, cy - 84, cx + 84, cy - 62, cx + 72, cy - 4); ctx.bezierCurveTo(cx + 66, cy + 24, cx + 34, cy + 46, cx, cy + 60); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 42, cy + 2); ctx.lineTo(cx - 16, cy + 2); ctx.lineTo(cx - 2, cy - 20); ctx.lineTo(cx + 16, cy + 20); ctx.lineTo(cx + 30, cy + 2); ctx.lineTo(cx + 48, cy + 2); ctx.stroke();
    } else if (theme.key === "career") {
      roundRect(ctx, cx - 70, cy - 34, 140, 92, 12); ctx.stroke(); ctx.strokeRect(cx - 26, cy - 56, 52, 24);
      ctx.beginPath(); ctx.moveTo(cx - 68, cy); ctx.lineTo(cx + 68, cy); ctx.stroke();
    } else if (theme.key === "finance") {
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cx - 66, cy + 18, 26, 46); ctx.fillRect(cx - 22, cy - 14, 26, 78); ctx.fillRect(cx + 22, cy - 54, 26, 118);
      ctx.strokeStyle = "#F2C75C"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx - 68, cy - 28); ctx.lineTo(cx - 18, cy - 52); ctx.lineTo(cx + 14, cy - 38); ctx.lineTo(cx + 64, cy - 82); ctx.stroke();
    } else {
      var nodes = [[-58,-32],[0,-62],[58,-28],[-48,42],[12,22],[60,58]];
      ctx.lineWidth = 6; ctx.globalAlpha = 0.8;
      [[0,1],[1,2],[0,3],[1,4],[2,4],[3,4],[4,5],[2,5]].forEach(function (p) {
        ctx.beginPath(); ctx.moveTo(cx + nodes[p[0]][0], cy + nodes[p[0]][1]); ctx.lineTo(cx + nodes[p[1]][0], cy + nodes[p[1]][1]); ctx.stroke();
      });
      ctx.globalAlpha = 1; nodes.forEach(function (n, i) {
        ctx.fillStyle = i === 4 ? "#F2C75C" : "#FFFFFF"; ctx.beginPath(); ctx.arc(cx + n[0], cy + n[1], i === 4 ? 14 : 10, 0, Math.PI * 2); ctx.fill();
      });
    }

    ctx.restore();
  }

  // Artwork is selected from each project's decrypted title and description
  // at runtime; protected project data is never copied into source.
  function makeLabelTexture(idText, titleText, studentsText, opts, countries) {
    opts = opts || {};
    var project = opts.project || { title: titleText };
    var accent = opts.accent || "#DFA63E";
    var canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 400;
    var ctx = canvas.getContext("2d");

    ctx.save();
    ctx.shadowColor = "rgba(38,51,59,0.30)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, 24, 18, 592, 344, 30);
    ctx.fill();
    ctx.restore();

    var sheen = ctx.createLinearGradient(24, 18, 616, 362);
    sheen.addColorStop(0, "#FFFFFF");
    sheen.addColorStop(1, "#F7F2E8");
    ctx.fillStyle = sheen;
    roundRect(ctx, 24, 18, 592, 344, 30);
    ctx.fill();
    ctx.strokeStyle = "#E8E2D4";
    ctx.lineWidth = 3;
    roundRect(ctx, 24, 18, 592, 344, 30);
    ctx.stroke();

    // accent bar and the project-aware vector illustration
    ctx.save();
    roundRect(ctx, 24, 18, 592, 344, 30);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(24, 18, 592, 12);
    ctx.restore();
    drawProjectArt(ctx, project, accent, 424, 34, 176, 312);

    var badge = /^\d+$/.test(idText) ? "BOOTH " + idText : idText + " PLACE";
    ctx.font = "600 21px 'IBM Plex Mono', monospace";
    var bw = ctx.measureText(badge).width + 44;
    ctx.fillStyle = "#DFA63E";
    roundRect(ctx, 58, 54, bw, 42, 21);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, 80, 76);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#26333B";
    ctx.font = "700 46px 'Space Grotesk', sans-serif";
    var titleLines = splitLines(ctx, titleText, 334);
    if (titleLines.length > 1) {
      ctx.font = "700 38px 'Space Grotesk', sans-serif";
      titleLines = splitLines(ctx, titleText, 334);
    }
    if (titleLines.length > 2) {
      ctx.font = "700 33px 'Space Grotesk', sans-serif";
      titleLines = splitLines(ctx, titleText, 334);
    }
    var ty = titleLines.length > 1 ? 154 : 178;
    titleLines.slice(0, 2).forEach(function (l, i) {
      ctx.fillText(l, 62, ty + i * 45);
    });

    ctx.fillStyle = "#DFA63E";
    ctx.fillRect(62, 250, 62, 5);

    if (studentsText) {
      ctx.fillStyle = "#3E4C55";
      ctx.font = "600 21px 'IBM Plex Mono', monospace";
      var nameLines = splitLines(ctx, studentsText, 334);
      var ny = nameLines.length > 1 ? 286 : 302;
      nameLines.slice(0, 2).forEach(function (l, i) {
        ctx.fillText(l, 62, ny + i * 28);
      });
    }

    // locally drawn flags avoid cross-origin requests and emoji shaping issues
    var uniqueCountries = [];
    (countries || []).forEach(function (c) {
      if (c && uniqueCountries.indexOf(c) === -1) uniqueCountries.push(c);
    });
    if (uniqueCountries.length) {
      var flagW = 30, flagH = 21, gap = 7;
      var startX = 62;
      var flagY = 326;
      uniqueCountries.forEach(function (country, i) {
        var fx = startX + i * (flagW + gap);
        drawFlagIcon(ctx, country, fx, flagY, flagW, flagH);
      });
    }

    var texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }

  function splitLines(ctx, text, maxWidth) {
    var words = String(text || "").split(" ");
    var line = "", lines = [];
    words.forEach(function (w) {
      var test = (line + " " + w).trim();
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
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

  function makeHardwoodTexture() {
    var w = 128, h = 512;
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    var plankW = 32; // 4 planks across the tile width
    var seamRows = [0, h / 2]; // staggered end-joints, brick pattern
    var tones = ["#B8875A", "#C6996B", "#AE7E4E", "#BD8F60"];

    for (var col = 0; col < w / plankW; col++) {
      var offsetRow = col % 2 === 0 ? 0 : h / 4; // stagger every other column
      for (var seg = -1; seg < 3; seg++) {
        var y0 = seg * (h / 2) + offsetRow;
        var tone = tones[(col + seg + 4) % tones.length];
        ctx.fillStyle = tone;
        ctx.fillRect(col * plankW, y0, plankW, h / 2);

        // subtle grain streaks
        ctx.strokeStyle = "rgba(60,35,15,0.12)";
        ctx.lineWidth = 1;
        for (var g = 0; g < 5; g++) {
          var gx = col * plankW + 3 + g * 6 + (Math.random() * 2 - 1);
          ctx.beginPath();
          ctx.moveTo(gx, y0);
          ctx.lineTo(gx + (Math.random() * 4 - 2), y0 + h / 2);
          ctx.stroke();
        }

        // end-joint seam line
        ctx.strokeStyle = "rgba(40,24,10,0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(col * plankW, y0);
        ctx.lineTo(col * plankW + plankW, y0);
        ctx.stroke();
      }
      // long seam between plank columns
      ctx.strokeStyle = "rgba(40,24,10,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(col * plankW, 0);
      ctx.lineTo(col * plankW, h);
      ctx.stroke();
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

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

  // ---------------------------------------------------------------------------
  // WINNER / PLAQUE / ATMOSPHERE ART HELPERS
  // ---------------------------------------------------------------------------
  var MEDAL_SPEC = {
    1: { face: "#F2C75C", edge: "#A9751B", ink: "#5A3D08", ribbon: "#8E2E4D", numeral: "1" },
    2: { face: "#D9DEE2", edge: "#8B959C", ink: "#3F484E", ribbon: "#37788A", numeral: "2" },
    3: { face: "#D89A63", edge: "#8E5C2E", ink: "#4A2C10", ribbon: "#5F4632", numeral: "3" },
    hm: { face: "#F4F0E6", edge: "#DFA63E", ink: "#8E2E4D", ribbon: "#37788A", numeral: "HM", font: "700 48px 'Space Grotesk', sans-serif" },
  };
  var medalTextureCache = {};

  // gold/silver/bronze disc + ribbon, drawn flat with hard toon-style edges
  function makeMedalTexture(place) {
    if (medalTextureCache[place]) return medalTextureCache[place];
    var spec = MEDAL_SPEC[place] || MEDAL_SPEC[1];
    var c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    var ctx = c.getContext("2d");

    // ribbon: two angled bands hanging from the top down behind the disc
    ctx.fillStyle = spec.ribbon;
    [[-1], [1]].forEach(function (s) {
      var d = s[0];
      ctx.beginPath();
      ctx.moveTo(128 + d * 12, 24);
      ctx.lineTo(128 + d * 62, 24);
      ctx.lineTo(128 + d * 40, 128);
      ctx.lineTo(128 + d * 6, 118);
      ctx.closePath();
      ctx.fill();
    });
    ctx.strokeStyle = "#1C1A16";
    ctx.lineWidth = 6;
    [[-1], [1]].forEach(function (s) {
      var d = s[0];
      ctx.beginPath();
      ctx.moveTo(128 + d * 12, 24);
      ctx.lineTo(128 + d * 62, 24);
      ctx.lineTo(128 + d * 40, 128);
      ctx.stroke();
    });

    // disc — flat fill + a lighter inner ring, no soft gradients (toon look)
    ctx.beginPath(); ctx.arc(128, 158, 74, 0, Math.PI * 2);
    ctx.fillStyle = spec.edge; ctx.fill();
    ctx.strokeStyle = "#1C1A16"; ctx.lineWidth = 7; ctx.stroke();

    ctx.beginPath(); ctx.arc(128, 158, 58, 0, Math.PI * 2);
    ctx.fillStyle = spec.face; ctx.fill();

    ctx.fillStyle = spec.ink;
    ctx.font = spec.font || "700 74px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec.numeral, 128, 162);

    var tex = new THREE.CanvasTexture(c);
    medalTextureCache[place] = tex;
    return tex;
  }

  // storefront sign: the venture's initial inside a rounded square in its accent color
  function makePlaqueTexture(letter, hexColor) {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#F4F0E6";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#" + ("000000" + hexColor.toString(16)).slice(-6);
    roundRect(ctx, 26, 26, 204, 204, 46);
    ctx.fill();
    ctx.strokeStyle = "rgba(28,26,22,0.75)";
    ctx.lineWidth = 8;
    roundRect(ctx, 26, 26, 204, 204, 46);
    ctx.stroke();
    ctx.fillStyle = "#FBFAF7";
    ctx.font = "700 108px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(letter || "?"), 128, 136);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // vertical alpha ramp used by the light shafts (bright at the glass, fading to the floor)
  function makeShaftTexture() {
    var c = document.createElement("canvas");
    c.width = 4; c.height = 128;
    var ctx = c.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "rgba(255,236,196,1)");
    g.addColorStop(0.45, "rgba(255,226,175,0.45)");
    g.addColorStop(1, "rgba(255,214,150,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(c);
  }

  // round dust-mote sprite, shared by every particle in the Points cloud
  function makeMoteTexture() {
    var c = document.createElement("canvas");
    c.width = 32; c.height = 32;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,244,220,1)");
    g.addColorStop(0.5, "rgba(255,238,205,0.45)");
    g.addColorStop(1, "rgba(255,236,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }

  // adds a black inverted-hull outline around a mesh (Borderlands-style)
  function addOutline(mesh, scale) {
    var outlineMat = new THREE.MeshBasicMaterial({ color: 0x1c1a16, side: THREE.BackSide });
    var outline = new THREE.Mesh(mesh.geometry, outlineMat);
    outline.scale.multiplyScalar(scale || 1.06);
    mesh.add(outline);
    return outline;
  }

  // second, larger inverted hull in translucent gold — reads as a soft glowing rim
  var goldRimMat = new THREE.MeshBasicMaterial({
    color: 0xdfa63e, side: THREE.BackSide, transparent: true, opacity: 0.38, depthWrite: false,
  });
  function addGoldRim(mesh, scale) {
    var rim = new THREE.Mesh(mesh.geometry, goldRimMat);
    rim.scale.multiplyScalar(scale || 1.13);
    mesh.add(rim);
    return rim;
  }

  // winner glory lighting: no visible cone geometry (it read as light coming
  // from nowhere) — just a warm pool on the floor, as if cast by the pendants
  var SPOT_BASE_R = 1.7;     // pool radius on the floor
  var SPOT_POOL_OPACITY = 0.16;
  function addSpotlight(x, z) {
    var pool = new THREE.Mesh(
      new THREE.CircleGeometry(SPOT_BASE_R, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffe2ac, transparent: true, opacity: SPOT_POOL_OPACITY,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.02, z);
    scene.add(pool);
    return pool;
  }

  // ===========================================================================
  // SCENE SETUP
  // ===========================================================================
  var canvas = document.getElementById("hallwayCanvas");
  var wrap = document.querySelector(".hallway-wrap");
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setClearColor(0xfbfaf7, 1);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x4a3450, 20, Math.abs(END_WALL_Z) + 16);

  var camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200);
  var EYE_HEIGHT = 1.6;
  camera.rotation.order = "YXZ";
  camera.position.set(0, EYE_HEIGHT, START_Z);

  function resize() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    var isPhone = w < 720;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isPhone ? 1.5 : 2));
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 76 : (camera.aspect < 1.15 ? 68 : 62);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  // atmosphere: smooth sunset gradient — reads consistently across every glass
  // bay, unlike a photo which shows a different unrelated crop per panel
  var skyCanvas = document.createElement("canvas");
  skyCanvas.width = 8; skyCanvas.height = 512;
  var skyCtx = skyCanvas.getContext("2d");
  var skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, "#1B2A4A");
  skyGrad.addColorStop(0.42, "#5B3E5C");
  skyGrad.addColorStop(0.68, "#B5566B");
  skyGrad.addColorStop(0.86, "#E8935A");
  skyGrad.addColorStop(1, "#F6C86B");
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 8, 512);
  var skyTex = new THREE.CanvasTexture(skyCanvas);
  scene.background = skyTex;

  // lights — dim warm dusk fill; the interior fixtures still do the actual work
  scene.add(new THREE.AmbientLight(0xe0b8b0, 0.4));
  scene.add(new THREE.HemisphereLight(0x6b4a5c, 0x2a2216, 0.45));
  var duskLight = new THREE.DirectionalLight(0xe8935a, 0.4);
  duskLight.position.set(4, 20, START_Z - 10);
  duskLight.target.position.set(0, 0, START_Z - 30);
  scene.add(duskLight);
  scene.add(duskLight.target);
  for (var lz = START_Z - 4; lz > END_Z + 4; lz -= 11) {
    var pl = new THREE.PointLight(0xffe9c2, 65, 26, 2);
    pl.position.set(0, 6.5, lz);
    scene.add(pl);
  }

  var WALL_H = 9, WALL_X = 7.5;
  var RIDGE_Y = WALL_H + 2.6;   // peak of the gabled roof
  var PENDANT_Y = 5.3;          // fixed hang height regardless of roof shape

  // floor: hardwood planks + a teal runway rug down the center
  var floorGeo = new THREE.PlaneGeometry(WALL_X * 2 + 2, HALLWAY_LEN);
  var hardwoodTex = makeHardwoodTexture();
  var TILE_W = 2, TILE_L = 4; // world units per texture tile
  hardwoodTex.repeat.set((WALL_X * 2 + 2) / TILE_W, HALLWAY_LEN / TILE_L);
  var maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
  hardwoodTex.anisotropy = maxAniso;
  var floor = new THREE.Mesh(floorGeo, toonMaterial(0xffffff, { map: hardwoodTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, HALLWAY_CENTER_Z);
  scene.add(floor);

  var runway = new THREE.Mesh(new THREE.PlaneGeometry(1.5, HALLWAY_LEN), toonMaterial(0x37788a));
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.008, HALLWAY_CENTER_Z);
  scene.add(runway);

  // gabled roof — alternating solid + glass skylight bays so the sky shows through
  var roofOpaqueMat = toonMaterial(0xece4d3, { side: THREE.DoubleSide });
  var glassMat = new THREE.MeshBasicMaterial({
    color: 0xeaf6fb, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
  });
  glassMat.fog = false;
  var mullionMat = toonMaterial(0x584f42);
  var slopeDX = WALL_X, slopeDY = RIDGE_Y - WALL_H;
  var slopeLen = Math.sqrt(slopeDX * slopeDX + slopeDY * slopeDY);
  var slopeAngle = Math.atan2(slopeDY, slopeDX);

  function addMullion(z) {
    [-1, 1].forEach(function (side) {
      var bar = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.08, 0.12), mullionMat);
      bar.position.set(side * WALL_X / 2, (WALL_H + RIDGE_Y) / 2, z);
      bar.rotation.z = side < 0 ? slopeAngle : Math.PI - slopeAngle;
      addOutline(bar, 1.1);
      scene.add(bar);
    });
  }

  var BAY_LEN = 8;
  var bayIdx = 0;
  var lastZ1 = START_Z;
  var glassBays = []; // {z0, z1} ranges of the see-through skylight bays
  for (var bz = START_Z; bz > END_Z - BAY_LEN; bz -= BAY_LEN) {
    var z0 = bz, z1 = bz - BAY_LEN;
    var isGlass = bayIdx % 2 === 1;
    bayIdx++;
    if (isGlass) glassBays.push({ z0: z0, z1: z1 });
    addMullion(z0);
    lastZ1 = z1;
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
  addMullion(lastZ1);

  // ---------------------------------------------------------------------------
  // ATMOSPHERE — light shafts + drifting dust under the glass skylight bays
  // ---------------------------------------------------------------------------
  var MOTES_TOTAL = 380;          // hard ceiling on particle count
  var MOTE_DRIFT = 0.055;         // world units/second of downward drift
  var SHAFT_OPACITY = 0.07;
  var dustPositions = null, dustDrift = null, dustBounds = null, dustPoints = null;

  (function buildAtmosphere() {
    if (!glassBays.length) return;

    // dust motes, distributed evenly across the glass bays only
    var perBay = Math.max(8, Math.floor(MOTES_TOTAL / glassBays.length));
    var count = perBay * glassBays.length;
    dustPositions = new Float32Array(count * 3);
    dustDrift = new Float32Array(count);
    dustBounds = new Float32Array(count * 2); // yMin, yMax per mote
    var i = 0;
    glassBays.forEach(function (bay) {
      for (var n = 0; n < perBay; n++) {
        var yTop = 1.0 + Math.random() * (RIDGE_Y - 1.0);
        dustPositions[i * 3] = (Math.random() * 2 - 1) * (WALL_X - 0.8);
        dustPositions[i * 3 + 1] = yTop;
        dustPositions[i * 3 + 2] = bay.z1 + Math.random() * (bay.z0 - bay.z1);
        dustDrift[i] = 0.45 + Math.random() * 0.9;
        dustBounds[i * 2] = 0.35;
        dustBounds[i * 2 + 1] = RIDGE_Y;
        i++;
      }
    });
    var dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    var dustMat = new THREE.PointsMaterial({
      map: makeMoteTexture(), color: 0xfff2d4, size: 0.09, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    dustMat.fog = false;
    dustPoints = new THREE.Points(dustGeo, dustMat);
    dustPoints.renderOrder = 3;
    scene.add(dustPoints);
  })();

  // ridge cap beam along the peak, and eave beams where roof meets wall
  var capMat = toonMaterial(0x8f8577);
  var ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, HALLWAY_LEN), capMat);
  ridgeCap.position.set(0, RIDGE_Y, HALLWAY_CENTER_Z);
  addOutline(ridgeCap, 1.1);
  scene.add(ridgeCap);

  var trussMat = toonMaterial(0x8f8577);
  for (var tz = START_Z - 2; tz > END_Z; tz -= 8) {
    var beam = new THREE.Mesh(new THREE.BoxGeometry(WALL_X * 2, 0.28, 0.28), trussMat);
    beam.position.set(0, WALL_H - 0.25, tz);
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
      toonMaterial(0xfff6df, { emissive: 0xffe0a0, emissiveIntensity: 2.1 })
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
  var trimMat = toonMaterial(0xdfa63e, { emissive: 0x8a611f, emissiveIntensity: 0.4 });
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
  var bannerTexture = new THREE.CanvasTexture(bannerCanvas);
  var banner = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 2.25),
    toonMaterial(0xffffff, { map: bannerTexture })
  );
  // high enough that the bobbing winner cards and medals never cover it
  banner.position.set(0, 5.6, END_WALL_Z - 0.83);
  scene.add(banner);

  var logoImg = new Image();
  logoImg.onload = function () {
    bctx.fillStyle = "#FBFAF7";
    bctx.fillRect(0, 0, 1024, 384);
    var logoH = 150, logoW = logoH * (logoImg.width / logoImg.height);
    bctx.drawImage(logoImg, (1024 - logoW) / 2, 26, logoW, logoH);

    bctx.textAlign = "center";
    bctx.fillStyle = "#26333B";
    bctx.font = "700 62px 'Space Grotesk', sans-serif";
    bctx.fillText("GAIVS 2026", 512, 258);

    // gold rule between the year and the showcase line
    bctx.strokeStyle = "#DFA63E";
    bctx.lineWidth = 4;
    bctx.beginPath();
    bctx.moveTo(300, 286);
    bctx.lineTo(724, 286);
    bctx.stroke();
    bctx.fillStyle = "#DFA63E";
    [300, 724].forEach(function (x) {
      bctx.beginPath();
      bctx.arc(x, 286, 7, 0, Math.PI * 2);
      bctx.fill();
    });

    bctx.fillStyle = "#8E2E4D";
    bctx.font = "700 34px 'Space Grotesk', sans-serif";
    var showcase = "CLASS OF 2026 SHOWCASE";
    // letter-spaced by hand — canvas 2D has no tracking control
    var trackedX = 512 - (bctx.measureText(showcase).width + (showcase.length - 1) * 4) / 2;
    for (var ci = 0; ci < showcase.length; ci++) {
      var ch = showcase.charAt(ci);
      bctx.textAlign = "left";
      bctx.fillText(ch, trackedX, 336);
      trackedX += bctx.measureText(ch).width + 4;
    }
    bctx.textAlign = "center";

    bannerTexture.needsUpdate = true;
  };
  logoImg.src = "assets/img/gaivs-logo-full.png";

  var endGlow = new THREE.PointLight(0xffe9c2, 20, 12, 2);
  endGlow.position.set(0, 3.6, END_WALL_Z - 3);
  scene.add(endGlow);

  // booths — museum-plinth style: cream base + colored accent top, with a soft ground shadow
  var clickableMeshes = [];
  var floatingSprites = [];
  var medalSprites = [];
  var winnerStops = [];   // {z, progress} for the cinematic auto-walk pauses

  // place lookup for the three winning project ids (WINNERS is a plain global)
  var placeByProjectId = {};
  if (typeof WINNERS !== "undefined" && WINNERS) {
    WINNERS.forEach(function (w) { placeByProjectId[w.projectId] = w.place; });
  }

  var WINNER_EMISSIVE = 0xdfa63e;
  var WINNER_EMISSIVE_INTENSITY = 0.34;
  var HONORABLE_MENTION_PROJECT_ID = "16";
  var MEDAL_BOB = 0.11;
  var PLAQUE_SIZE = 0.42;

  PROJECTS.forEach(function (project, index) {
    var pos = boothPosition(index);
    var color = ACCENT_COLORS[index % ACCENT_COLORS.length];
    var side = index % 2 === 0 ? -1 : 1;   // -1 = left of the aisle
    var place = placeByProjectId[project.id];
    var isHonorableMention = project.id === HONORABLE_MENTION_PROJECT_ID;

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

    var texture = makeLabelTexture(project.id, project.title, project.students.join(", "), { accent: "#" + ("000000" + color.toString(16)).slice(-6), project: project }, project.countries);
    var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    var sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.56, 1.6, 1);
    sprite.position.set(pos.x, 2.85, pos.z);
    sprite.userData.baseY = 2.85;
    sprite.userData.phase = index * 0.65;
    scene.add(sprite);
    floatingSprites.push(sprite);

    // storefront sign on the aisle-facing plinth face: the booth number
    var initial = project.id;
    var plaque = new THREE.Mesh(
      new THREE.BoxGeometry(PLAQUE_SIZE, PLAQUE_SIZE, 0.05),
      toonMaterial(0xffffff, { map: makePlaqueTexture(initial, color) })
    );
    plaque.position.set(pos.x - side * 0.98, 0.5, pos.z);
    plaque.rotation.y = -side * Math.PI / 2;  // texture face points at the aisle
    plaque.userData.projectIndex = index;
    scene.add(plaque);
    clickableMeshes.push(plaque);

    if (place) {
      // gold glory: rim hulls, warmer emissive rest state, medal, spotlight
      [base, top].forEach(function (m) {
        addGoldRim(m, 1.11);
        m.userData.restEmissive = WINNER_EMISSIVE;
        m.userData.restIntensity = WINNER_EMISSIVE_INTENSITY;
        m.material.emissive.setHex(WINNER_EMISSIVE);
        m.material.emissiveIntensity = WINNER_EMISSIVE_INTENSITY;
      });

      var medalMat = new THREE.SpriteMaterial({ map: makeMedalTexture(place), transparent: true, alphaTest: 0.5, depthWrite: false });
      medalMat.fog = false;
      var medal = new THREE.Sprite(medalMat);
      medal.scale.set(0.72, 0.72, 1);
      var medalY = 3.72;
      medal.position.set(pos.x, medalY, pos.z);
      medal.userData.baseY = medalY;
      medal.userData.phase = place * 1.1;
      scene.add(medal);
      medalSprites.push(medal);

      addSpotlight(pos.x, pos.z);
      winnerStops.push({ z: pos.z, place: place });
    } else if (isHonorableMention) {
      // SmartLink receives a distinct rosette, teal glow, and tour pause without
      // presenting it as a numbered podium placement.
      [base, top].forEach(function (m) {
        addGoldRim(m, 1.09);
        m.userData.restEmissive = 0x37788a;
        m.userData.restIntensity = 0.3;
        m.material.emissive.setHex(0x37788a);
        m.material.emissiveIntensity = 0.3;
      });

      var honorableMat = new THREE.SpriteMaterial({ map: makeMedalTexture("hm"), transparent: true, alphaTest: 0.5, depthWrite: false });
      honorableMat.fog = false;
      var honorableMedal = new THREE.Sprite(honorableMat);
      honorableMedal.scale.set(0.78, 0.78, 1);
      var honorableY = 3.72;
      honorableMedal.position.set(pos.x, honorableY, pos.z);
      honorableMedal.userData.baseY = honorableY;
      honorableMedal.userData.phase = 4.4;
      scene.add(honorableMedal);
      medalSprites.push(honorableMedal);

      addSpotlight(pos.x, pos.z);
      winnerStops.push({ z: pos.z, place: "hm" });
    }

    project.__meshes = [base, top];
    project.__z = pos.z;
  });

  // winners podium — the finale tableau at the end of the hall. Sits just
  // beyond the camera's reachable travel (END_Z) so it's always seen from a
  // respectful distance and never clipped through.
  (function buildPodium() {
    if (typeof WINNERS === "undefined" || !WINNERS.length) return;
    var projectIndexById = {};
    PROJECTS.forEach(function (p, i) { projectIndexById[p.id] = i; });

    var podiumZ = END_WALL_Z + 2.5;
    var specByPlace = {
      1: { x: 0, height: 1.3, color: 0xdfa63e, label: "1ST" },
      2: { x: -2.9, height: 0.9, color: 0x37788a, label: "2ND" },
      3: { x: 2.9, height: 0.7, color: 0x8e2e4d, label: "3RD" },
    };

    WINNERS.forEach(function (winner) {
      var idx = projectIndexById[winner.projectId];
      if (idx === undefined) return;
      var project = PROJECTS[idx];
      var spec = specByPlace[winner.place];
      if (!spec) return;

      var block = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, spec.height, 1.3),
        toonMaterial(spec.color, { emissive: spec.color, emissiveIntensity: 0.1 })
      );
      block.position.set(spec.x, spec.height / 2, podiumZ);
      block.userData.projectIndex = idx;
      addOutline(block, 1.05);
      scene.add(block);
      clickableMeshes.push(block);

      var shadowBlob = new THREE.Mesh(
        new THREE.CircleGeometry(1.05, 24),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 })
      );
      shadowBlob.rotation.x = -Math.PI / 2;
      shadowBlob.position.set(spec.x, 0.015, podiumZ);
      scene.add(shadowBlob);

      var texture = makeLabelTexture(spec.label, project.title, project.students.join(", "), { accent: "#" + ("000000" + spec.color.toString(16)).slice(-6), project: project }, project.countries);
      var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      var sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(2.56, 1.6, 1);
      var baseY = spec.height + 1.0;
      sprite.position.set(spec.x, baseY, podiumZ);
      sprite.userData.baseY = baseY;
      sprite.userData.phase = winner.place * 0.8;
      scene.add(sprite);
      floatingSprites.push(sprite);

      addGoldRim(block, 1.09);
      addSpotlight(spec.x, podiumZ);

      var medalMat = new THREE.SpriteMaterial({ map: makeMedalTexture(winner.place), transparent: true, alphaTest: 0.5, depthWrite: false });
      medalMat.fog = false;
      var medal = new THREE.Sprite(medalMat);
      medal.scale.set(0.8, 0.8, 1);
      var medalY = baseY + 1.05;
      medal.position.set(spec.x, medalY, podiumZ);
      medal.userData.baseY = medalY;
      medal.userData.phase = winner.place * 1.4;
      scene.add(medal);
      medalSprites.push(medal);
    });

    var podiumGlow = new THREE.PointLight(0xffe9c2, 26, 10, 2);
    podiumGlow.position.set(0, 3.2, podiumZ + 1.5);
    scene.add(podiumGlow);
  })();

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

  walkForward.addEventListener("click", function () { stopAutoWalk(); setProgress(targetProgress + 0.08); hint.classList.add("is-hidden"); });
  walkBack.addEventListener("click", function () { stopAutoWalk(); setProgress(targetProgress - 0.08); hint.classList.add("is-hidden"); });

  var autoWalkBtn = document.getElementById("autoWalkBtn");
  var autoWalking = false;
  var AUTO_WALK_SECONDS = 55.5;      // travel time; + 3 x 1.5s winner pauses ~= 60s total
  var AUTO_EASE = 0.16;              // fraction of the trip spent easing in / out
  var WINNER_PAUSE_SECONDS = 1.5;    // dwell time in front of each winner booth
  var SWAY_AMPLITUDE = 0.42;         // lateral camera drift while auto-walking
  var SWAY_PERIOD = 13;              // seconds per full sway cycle
  var SWAY_YAW = 0.028;              // radians of matching head-turn

  var autoWalkTravel = 0;            // seconds of *travel* accumulated
  var autoWalkStartProgress = 0;
  var autoWalkPauseUntil = 0;        // performance.now() timestamp
  var autoWalkLastFrame = 0;
  var autoWalkSway = 0;              // seconds of sway clock (keeps running while paused)
  var autoWalkStops = [];            // {progress, used}

  // linear in the middle, quadratic ramps at both ends; f(0)=0, f(1)=1
  function easeEnds(x, e) {
    if (e <= 0) return x;
    var total = 1 - e;
    var f;
    if (x < e) f = (x * x) / (2 * e);
    else if (x <= 1 - e) f = x - e / 2;
    else { var u = 1 - x; f = 1 - e - (u * u) / (2 * e); }
    return Math.max(0, Math.min(1, f / total));
  }

  function startAutoWalk() {
    autoWalking = true;
    autoWalkTravel = 0;
    autoWalkPauseUntil = 0;
    autoWalkLastFrame = performance.now();
    autoWalkStartProgress = targetProgress;
    autoWalkStops = winnerStops.map(function (s) {
      return { progress: (s.z - START_Z) / (END_Z - START_Z), used: false };
    }).filter(function (s) { return s.progress > autoWalkStartProgress + 0.01; });
    autoWalkBtn.innerHTML = "&#10074;&#10074;";
    autoWalkBtn.setAttribute("aria-label", "Pause walkthrough");
    hint.classList.add("is-hidden");
  }
  function stopAutoWalk() {
    if (!autoWalking) return;
    autoWalking = false;
    autoWalkBtn.innerHTML = "&#9654;";
    autoWalkBtn.setAttribute("aria-label", "Play walkthrough");
  }
  autoWalkBtn.addEventListener("click", function () {
    if (autoWalking) stopAutoWalk();
    else startAutoWalk();
  });
  ["wheel", "touchstart", "keydown"].forEach(function (evt) {
    (evt === "keydown" ? document : canvas).addEventListener(evt, function (e) {
      if (autoWalking && (evt !== "keydown" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) stopAutoWalk();
    });
  });
  slider.addEventListener("pointerdown", stopAutoWalk);

  // ---------------------------------------------------------------------------
  // FREE WALK — pointer-lock first person: WASD/arrows move, mouse looks,
  // Esc (or the WASD button) returns to the scroll/slider view.
  // ---------------------------------------------------------------------------
  var freeWalkBtn = document.getElementById("freeWalkBtn");
  var crosshair = document.getElementById("walkCrosshair");
  var freeWalking = false;
  var fwYaw = 0, fwPitch = 0;
  var fwKeys = {};
  var fwLastFrame = 0;
  var FW_SPEED = 4.4;
  var FW_X_LIMIT = 2.55;
  var FW_Z_MIN = END_Z + 0.4;

  var fwFallback = false;    // pointer lock unavailable: drag on the canvas to look
  var fwDragDist = 0;
  function fwLocked() { return document.pointerLockElement === canvas; }

  function activateFreeWalk(fallback) {
    freeWalking = true;
    fwFallback = fallback;
    stopAutoWalk();
    fwYaw = 0; fwPitch = 0; fwKeys = {};
    fwLastFrame = performance.now();
    if (crosshair) crosshair.hidden = false;
    if (freeWalkBtn) freeWalkBtn.classList.add("is-active");
    var fwHint = document.getElementById("freeWalkHint");
    if (fwHint) {
      fwHint.hidden = false;
      clearTimeout(fwHint.__t);
      fwHint.__t = setTimeout(function () { fwHint.hidden = true; }, 6000);
    }
    hint.classList.add("is-hidden");
  }
  function deactivateFreeWalk() {
    freeWalking = false;
    fwFallback = false;
    fwKeys = {};
    if (crosshair) crosshair.hidden = true;
    if (freeWalkBtn) freeWalkBtn.classList.remove("is-active");
    var fwHint2 = document.getElementById("freeWalkHint");
    if (fwHint2) { clearTimeout(fwHint2.__t); fwHint2.hidden = true; }
    camera.rotation.x = 0;
    camera.rotation.y = 0;
    camera.position.x = Math.max(-1, Math.min(1, camera.position.x));
    // hand the position back to the slider system
    setProgress((camera.position.z - START_Z) / (END_Z - START_Z));
  }
  function exitFreeWalk() {
    if (fwLocked()) document.exitPointerLock();
    else if (freeWalking) deactivateFreeWalk();
  }

  document.addEventListener("pointerlockchange", function () {
    if (fwLocked()) activateFreeWalk(false);
    else if (freeWalking && !fwFallback) deactivateFreeWalk();
  });
  document.addEventListener("pointerlockerror", function () {
    // pane/iframe blocked pointer lock — fall back to drag-to-look
    if (!freeWalking) activateFreeWalk(true);
  });

  if (freeWalkBtn) freeWalkBtn.addEventListener("click", function () {
    if (freeWalking) { exitFreeWalk(); return; }
    stopAutoWalk();
    if (canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch (e) { activateFreeWalk(true); }
    } else {
      activateFreeWalk(true);
    }
  });

  document.addEventListener("mousemove", function (e) {
    if (!freeWalking) return;
    // locked: every movement looks. fallback: only while dragging on the canvas.
    if (!fwLocked()) {
      if (e.buttons !== 1 || (e.target !== canvas && !canvas.contains(e.target))) return;
      fwDragDist += Math.abs(e.movementX) + Math.abs(e.movementY);
    }
    fwYaw -= e.movementX * 0.0022;
    fwPitch -= e.movementY * 0.0018;
    var lim = 0.6;
    if (fwPitch > lim) fwPitch = lim;
    if (fwPitch < -lim) fwPitch = -lim;
  });
  canvas.addEventListener("mousedown", function () { fwDragDist = 0; });
  document.addEventListener("keydown", function (e) {
    if (!freeWalking) return;
    fwKeys[e.code] = true;
    if (e.code === "Escape" && fwFallback) exitFreeWalk();
  });
  document.addEventListener("keyup", function (e) { fwKeys[e.code] = false; });

  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    if (freeWalking) return;
    setProgress(targetProgress + e.deltaY * 0.0006);
    hint.classList.add("is-hidden");
  }, { passive: false });

  document.addEventListener("keydown", function (e) {
    if (!panelIsOpen() && !freeWalking) {
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
      // stop a few units short of the booth so it sits in front of the camera
      // rather than beside/behind it
      var pairZ = match.__z + 5;
      var progress = Math.max(0, Math.min(1, (pairZ - START_Z) / (END_Z - START_Z)));
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
  var lastDustFrame = performance.now();
  function animate() {
    requestAnimationFrame(animate);

    var now = performance.now();

    if (autoWalking) {
      var dt = Math.min(0.1, Math.max(0, (now - autoWalkLastFrame) / 1000));
      autoWalkLastFrame = now;
      autoWalkSway += dt;

      if (now >= autoWalkPauseUntil) {
        autoWalkTravel += dt;
        var raw = autoWalkStartProgress + (1 - autoWalkStartProgress) * (autoWalkTravel / AUTO_WALK_SECONDS);
        if (raw >= 1) raw = 1;
        var p = autoWalkStartProgress + (1 - autoWalkStartProgress) *
          easeEnds((raw - autoWalkStartProgress) / Math.max(1e-6, 1 - autoWalkStartProgress), AUTO_EASE);

        // dwell a beat in front of each winner booth as we draw level with it
        for (var si = 0; si < autoWalkStops.length; si++) {
          var stop = autoWalkStops[si];
          if (!stop.used && p >= stop.progress) {
            stop.used = true;
            autoWalkPauseUntil = now + WINNER_PAUSE_SECONDS * 1000;
            break;
          }
        }

        targetProgress = p;
        if (raw >= 1) stopAutoWalk();
        slider.value = Math.round(targetProgress * 1000);
        updateCounter();
      }
    }
    var moving;
    if (freeWalking) {
      var fdt = Math.min(0.05, Math.max(0, (now - fwLastFrame) / 1000));
      fwLastFrame = now;
      var fwd = (fwKeys.KeyW || fwKeys.ArrowUp ? 1 : 0) - (fwKeys.KeyS || fwKeys.ArrowDown ? 1 : 0);
      var strafe = (fwKeys.KeyD || fwKeys.ArrowRight ? 1 : 0) - (fwKeys.KeyA || fwKeys.ArrowLeft ? 1 : 0);
      var sinY = Math.sin(fwYaw), cosY = Math.cos(fwYaw);
      camera.position.x += (-sinY * fwd + cosY * strafe) * FW_SPEED * fdt;
      camera.position.z += (-cosY * fwd - sinY * strafe) * FW_SPEED * fdt;
      camera.position.x = Math.max(-FW_X_LIMIT, Math.min(FW_X_LIMIT, camera.position.x));
      camera.position.z = Math.max(FW_Z_MIN, Math.min(START_Z, camera.position.z));
      camera.rotation.y = fwYaw;
      camera.rotation.x = fwPitch;
      moving = fwd !== 0 || strafe !== 0;
      camera.position.y = EYE_HEIGHT + (moving ? Math.sin(now * 0.012) * 0.035 : 0);
    } else {
      var targetZ = progressToZ(targetProgress);
      camera.position.z += (targetZ - camera.position.z) * 0.08;

      var targetSwayX = mouseNormX * 0.5;
      var targetYaw = 0;
      if (autoWalking) {
        var swayPhase = (autoWalkSway / SWAY_PERIOD) * Math.PI * 2;
        targetSwayX += Math.sin(swayPhase) * SWAY_AMPLITUDE;
        targetYaw = -Math.sin(swayPhase + 0.6) * SWAY_YAW;
      }
      camera.position.x += (targetSwayX - camera.position.x) * 0.06;
      camera.rotation.y += (targetYaw - camera.rotation.y) * 0.04;
      if (camera.rotation.x !== 0) camera.rotation.x *= 0.9;

      moving = Math.abs(targetZ - camera.position.z) > 0.02;
      var bob = moving ? Math.sin(performance.now() * 0.008) * 0.025 : 0;
      camera.position.y = EYE_HEIGHT + bob;
    }

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

    var t = now * 0.0016;
    floatingSprites.forEach(function (s) {
      s.position.y = s.userData.baseY + Math.sin(t + s.userData.phase) * 0.14;
    });
    medalSprites.forEach(function (s) {
      s.position.y = s.userData.baseY + Math.sin(t * 0.75 + s.userData.phase) * MEDAL_BOB;
    });

    // dust drifts down through the shafts and wraps back up to the ridge
    if (dustPoints) {
      var ddt = Math.min(0.1, (now - lastDustFrame) / 1000);
      lastDustFrame = now;
      var swirl = now * 0.00016;
      for (var d = 0; d < dustDrift.length; d++) {
        var yi = d * 3 + 1;
        dustPositions[yi] -= MOTE_DRIFT * dustDrift[d] * ddt;
        dustPositions[d * 3] += Math.sin(swirl + d) * 0.0009;
        if (dustPositions[yi] < dustBounds[d * 2]) dustPositions[yi] = dustBounds[d * 2 + 1];
      }
      dustPoints.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  resize();
  updateCounter();
  animate();
  var hallwayLoader = document.getElementById("hallwayLoader");
  if (hallwayLoader) hallwayLoader.classList.add("is-hidden");

  // deep link: hall.html?booth=05 walks straight there and opens the panel
  (function handleDeepLink() {
    var boothId = new URLSearchParams(location.search).get("booth");
    if (!boothId) return;
    var idx = PROJECTS.findIndex(function (p) { return p.id === boothId; });
    if (idx === -1) return;
    setProgress(Math.max(0, Math.min(1, (PROJECTS[idx].__z + 5 - START_Z) / (END_Z - START_Z))));
    setTimeout(function () { openPanel(idx); }, 900);
  })();

  // ===========================================================================
  // CLICK -> RAYCAST -> OPEN PANEL
  // ===========================================================================
  var raycaster = new THREE.Raycaster();
  canvas.addEventListener("click", function (e) {
    var ndc;
    if (freeWalking && fwFallback && fwDragDist > 8) { fwDragDist = 0; return; }
    if (freeWalking && fwLocked()) {
      ndc = new THREE.Vector2(0, 0); // crosshair = screen centre
    } else {
      var rect = canvas.getBoundingClientRect();
      ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    }
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(clickableMeshes);
    if (hits.length) {
      if (freeWalking) document.exitPointerLock();
      openPanel(hits[0].object.userData.projectIndex);
    }
  });

  // ===========================================================================
  // DETAIL PANEL (same interaction pattern as before, no track/category info)
  // ===========================================================================
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("panel");
  var panelClose = document.getElementById("panelClose");
  var panelPrev = document.getElementById("panelPrev");
  var panelNext = document.getElementById("panelNext");
  var panelShare = document.getElementById("panelShare");
  var panelBoothId = document.getElementById("panelBoothId");
  var panelTitle = document.getElementById("panelTitle");
  var panelStudents = document.getElementById("panelStudents");
  var panelBlurb = document.getElementById("panelBlurb");
  var panelVideo = document.getElementById("panelVideo");
  var panelVideoFrame = document.getElementById("panelVideoFrame");
  var panelVideoPlaceholder = document.getElementById("panelVideoPlaceholder");
  var panelVideoExternalLink = document.getElementById("panelVideoExternalLink");
  panelVideo.addEventListener("error", function () {
    panelVideo.hidden = true;
    panelVideoPlaceholder.hidden = false;
  });

  // classifies a video link so we know how to display it:
  //  - local file (assets/videos/..) -> native <video> tag
  //  - YouTube / Drive single-file link -> converted to an embeddable iframe URL
  //  - Drive folder or anything else we can't embed -> external "watch" link only
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

  var panelDeckLink = document.getElementById("panelDeckLink");
  var panelPrototypeLink = document.getElementById("panelPrototypeLink");
  var panelAskWrap = document.getElementById("panelAskWrap");
  var panelAsk = document.getElementById("panelAsk");
  var panelCommitmentWrap = document.getElementById("panelCommitmentWrap");
  var panelCommitment = document.getElementById("panelCommitment");
  var currentIndex = null;
  function panelIsOpen() { return !panel.hidden; }

  function openPanel(index) {
    currentIndex = index;
    var project = PROJECTS[index];

    panelBoothId.textContent = "Booth " + project.id;
    panelTitle.textContent = project.title;
    panelStudents.textContent = studentsWithFlags(project);
    panelBlurb.textContent = project.blurb;

    var hasDeck = !!project.deckSrc;
    var v = classifyVideo(project.videoSrc);
    panelVideo.hidden = true; panelVideo.removeAttribute("src");
    panelVideoFrame.hidden = true; panelVideoFrame.removeAttribute("src");
    panelVideoPlaceholder.hidden = true;
    panelVideoExternalLink.hidden = true;
    if (v.type === "video") {
      panelVideo.hidden = false; panelVideo.src = sanUrl(v.url);
    } else if (v.type === "iframe") {
      panelVideoFrame.hidden = false; panelVideoFrame.src = sanUrl(v.url);
    } else if (v.type === "external") {
      panelVideoExternalLink.hidden = false;
      panelVideoExternalLink.href = sanUrl(v.url);
    } else {
      panelVideoPlaceholder.hidden = false;
    }

    if (hasDeck) {
      panelDeckLink.href = sanUrl(project.deckSrc);
      panelDeckLink.style.display = "inline-flex";
    } else {
      panelDeckLink.style.display = "none";
    }

    if (project.prototypeSrc) {
      panelPrototypeLink.href = sanUrl(project.prototypeSrc);
      panelPrototypeLink.style.display = "inline-flex";
    } else {
      panelPrototypeLink.style.display = "none";
    }

    var panelPoster = document.getElementById("panelPoster");
    if (panelPoster) {
      if (project.thumb) { panelPoster.src = project.thumb; panelPoster.hidden = false; }
      else { panelPoster.hidden = true; panelPoster.removeAttribute("src"); }
    }

    panelAskWrap.hidden = !project.ask;
    panelAsk.textContent = project.ask || "";
    panelCommitmentWrap.hidden = !project.commitment;
    panelCommitment.textContent = project.commitment || "";

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
    panelVideoFrame.removeAttribute("src");
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
  panelShare.addEventListener("click", function () {
    if (currentIndex === null) return;
    var url = location.origin + location.pathname + "?booth=" + PROJECTS[currentIndex].id;
    var promise = navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject();
    promise.then(function () { panelShare.textContent = "Copied!"; })
      .catch(function () { window.prompt("Copy this link:", url); });
    setTimeout(function () { panelShare.innerHTML = "&#128279; Share"; }, 1600);
  });
  panelNext.addEventListener("click", function () { stepPanel(1); });

  document.addEventListener("keydown", function (e) {
    if (panel.hidden) return;
    if (e.key === "Escape") closePanel();
    if (e.key === "ArrowRight") stepPanel(1);
    if (e.key === "ArrowLeft") stepPanel(-1);
  });
})();
