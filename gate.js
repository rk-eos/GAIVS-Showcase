// ---------------------------------------------------------------------------
// ACCESS GATE
// The project data (data/projects.enc.json) is AES-GCM encrypted; the key is
// derived from an access code shared privately with students and parents.
// The code is never stored in this repo — a wrong code simply fails to
// decrypt. After a successful unlock the derived key is kept for the browser
// session so navigating between pages doesn't re-prompt.
//
// Each page loads this file with a data-scripts attribute listing the scripts
// that depend on PROJECTS; they are appended in order after decryption.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var gateScript = document.currentScript;
  var scriptsToLoad = (gateScript.getAttribute("data-scripts") || "").split(",").filter(Boolean);

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function deriveKey(password, salt) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (baseKey) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: salt, iterations: 250000, hash: "SHA-256" },
          baseKey, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
      });
  }

  function decrypt(key, payload) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.ct))
      .then(function (buf) { return new TextDecoder().decode(buf); });
  }

  function loadScriptsSequentially(list, done) {
    if (!list.length) { done(); return; }
    var s = document.createElement("script");
    s.src = list[0];
    s.onload = function () { loadScriptsSequentially(list.slice(1), done); };
    document.body.appendChild(s);
  }

  // The decrypted payload is DATA, never code: parse it as JSON and publish it
  // on window.PROJECTS. Nothing from the payload is ever evaluated.
  // Returns true on success so callers can gate the unlock ceremony on it.
  function runPage(plaintext) {
    var data;
    try {
      data = JSON.parse(plaintext);
    } catch (e) {
      if (typeof errorEl !== "undefined" && errorEl) {
        errorEl.textContent = "The showcase data could not be read — contact your organizer.";
      }
      return false;
    }
    window.PROJECTS = data;
    loadScriptsSequentially(scriptsToLoad, function () {
      document.dispatchEvent(new Event("gaivs:unlocked"));
    });
    return true;
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  // ----- overlay UI -----
  var overlay, input, errorEl, submitBtn, busy = false;

  var GATE_CSS =
    '#gateOverlay{position:fixed;inset:0;z-index:9999;background:#FBFAF7;display:flex;align-items:center;justify-content:center;padding:24px;overflow:hidden;}' +
    '#gateOverlay .gate-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,rgba(251,250,247,0) 38%,rgba(38,51,59,0.055) 78%,rgba(38,51,59,0.13) 100%);}' +
    '#gateOverlay .gate-specks{position:absolute;inset:0;pointer-events:none;overflow:hidden;}' +
    '#gateOverlay .gate-speck{position:absolute;border-radius:50%;filter:blur(38px);opacity:0.16;will-change:transform;}' +
    '#gateOverlay .gate-speck.s1{width:280px;height:280px;background:#DFA63E;left:8%;top:14%;animation:gateDrift1 46s ease-in-out infinite;}' +
    '#gateOverlay .gate-speck.s2{width:340px;height:340px;background:#37788A;right:6%;top:26%;opacity:0.13;animation:gateDrift2 58s ease-in-out infinite;}' +
    '#gateOverlay .gate-speck.s3{width:220px;height:220px;background:#8E2E4D;left:22%;bottom:10%;opacity:0.10;animation:gateDrift3 52s ease-in-out infinite;}' +
    '#gateOverlay .gate-speck.s4{width:180px;height:180px;background:#DFA63E;right:20%;bottom:16%;opacity:0.11;animation:gateDrift2 64s ease-in-out infinite reverse;}' +
    '@keyframes gateDrift1{0%,100%{transform:translate3d(0,0,0);}50%{transform:translate3d(40px,-34px,0);}}' +
    '@keyframes gateDrift2{0%,100%{transform:translate3d(0,0,0);}50%{transform:translate3d(-46px,28px,0);}}' +
    '@keyframes gateDrift3{0%,100%{transform:translate3d(0,0,0);}50%{transform:translate3d(30px,26px,0);}}' +
    '#gateOverlay .gate-box{position:relative;z-index:2;max-width:380px;width:100%;text-align:center;opacity:0;transform:translateY(14px);animation:gateRise 900ms cubic-bezier(.22,.61,.36,1) 120ms forwards;transition:opacity 260ms ease,transform 260ms ease;}' +
    '@keyframes gateRise{to{opacity:1;transform:translateY(0);}}' +
    '#gateOverlay .gate-box.gate-out{opacity:0;transform:scale(.965);}' +
    '#gateOverlay img{width:200px;max-width:70%;margin-bottom:18px;}' +
    '#gateOverlay h1{font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:22px;color:#26333B;margin:0 0 6px;}' +
    '#gateOverlay p{font-family:"IBM Plex Mono",monospace;font-size:12px;color:#5F6B72;margin:0 0 18px;line-height:1.5;}' +
    '#gateOverlay input{width:100%;box-sizing:border-box;padding:12px 16px;border:1.5px solid #E3DFD5;border-radius:999px;font-family:"IBM Plex Mono",monospace;font-size:14px;text-align:center;outline:none;background:#fff;color:#26333B;transition:border-color 180ms ease,box-shadow 180ms ease;}' +
    '#gateOverlay input:focus{border-color:#DFA63E;box-shadow:0 0 0 4px rgba(223,166,62,0.14);}' +
    '#gateOverlay button{margin-top:12px;width:100%;padding:12px;border:none;border-radius:999px;background:#DFA63E;color:#fff;font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:15px;cursor:pointer;transition:background 180ms ease,opacity 180ms ease;}' +
    '#gateOverlay button:hover{background:#C8922F;}' +
    '#gateOverlay button[disabled]{cursor:default;opacity:0.72;background:#C8922F;}' +
    '#gateOverlay .gate-error{color:#8E2E4D;min-height:18px;margin:10px 0 0;}' +
    '#gateOverlay .gate-door{position:absolute;top:0;bottom:0;width:50.5%;background:#FBFAF7;z-index:3;display:none;will-change:transform;}' +
    '#gateOverlay .gate-door.left{left:0;border-right:1px solid rgba(223,166,62,0.55);}' +
    '#gateOverlay .gate-door.right{right:0;border-left:1px solid rgba(223,166,62,0.55);}' +
    '#gateOverlay.gate-doors .gate-vignette,#gateOverlay.gate-doors .gate-specks{opacity:0;transition:opacity 260ms ease;}' +
    '#gateOverlay.gate-doors{background:transparent;}' +
    '#gateOverlay.gate-doors .gate-door{display:block;transition:transform 900ms cubic-bezier(.65,0,.35,1);}' +
    '#gateOverlay.gate-open .gate-door.left{transform:translate3d(-100%,0,0);}' +
    '#gateOverlay.gate-open .gate-door.right{transform:translate3d(100%,0,0);}' +
    '#gateOverlay.gate-fade{transition:opacity 200ms ease;opacity:0;}' +
    '@media (prefers-reduced-motion: reduce){' +
    '#gateOverlay .gate-speck{animation:none;}' +
    '#gateOverlay .gate-box{animation:none;opacity:1;transform:none;}' +
    '}';

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.id = "gateOverlay";
    overlay.innerHTML =
      '<style>' + GATE_CSS + '</style>' +
      '<div class="gate-specks" aria-hidden="true">' +
      '<span class="gate-speck s1"></span><span class="gate-speck s2"></span>' +
      '<span class="gate-speck s3"></span><span class="gate-speck s4"></span>' +
      '</div>' +
      '<div class="gate-vignette" aria-hidden="true"></div>' +
      '<div class="gate-door left" aria-hidden="true"></div>' +
      '<div class="gate-door right" aria-hidden="true"></div>' +
      '<div class="gate-box">' +
      '<img src="assets/img/gaivs-logo-full.png" alt="Global AI Venture Studio">' +
      '<h1>Showcase access</h1>' +
      '<p>Enter the access code shared with students and parents to view the showcase.</p>' +
      '<input id="gateInput" type="password" autocomplete="off" placeholder="Access code" aria-label="Access code">' +
      '<button id="gateSubmit">Enter the showcase</button>' +
      '<p class="gate-error" id="gateError" role="status" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector("#gateInput");
    errorEl = overlay.querySelector("#gateError");
    submitBtn = overlay.querySelector("#gateSubmit");
    submitBtn.addEventListener("click", attempt);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") attempt(); });
    input.focus();
  }

  function setBusy(state) {
    busy = state;
    if (!submitBtn) return;
    submitBtn.disabled = state;
    submitBtn.textContent = state ? "Unlocking…" : "Enter the showcase";
    if (input) input.disabled = state;
  }

  // Card retreats, then the two cream doors part to reveal the page behind.
  function openDoors() {
    var box = overlay.querySelector(".gate-box");
    if (prefersReducedMotion()) {
      overlay.classList.add("gate-fade");
      window.setTimeout(function () { overlay.remove(); }, 220);
      return;
    }
    if (box) box.classList.add("gate-out");
    window.setTimeout(function () {
      if (box) box.style.display = "none";
      overlay.classList.add("gate-doors");
      // next frame so the transition has a starting position to animate from
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          overlay.classList.add("gate-open");
        });
      });
      window.setTimeout(function () { overlay.remove(); }, 960);
    }, 280);
  }

  var payload = null;
  function fetchPayload() {
    if (payload) return Promise.resolve(payload);
    return fetch("data/projects.enc.json").then(function (r) { return r.json(); })
      .then(function (p) { payload = p; return p; });
  }

  function attempt() {
    if (busy) return;
    var pw = input.value.trim().toLowerCase();
    if (!pw) return;
    errorEl.textContent = "";
    setBusy(true);
    fetchPayload().then(function (p) {
      return deriveKey(pw, b64ToBytes(p.salt)).then(function (key) {
        return decrypt(key, p).then(function (plaintext) {
          // remember for this browser session (raw key export, sessionStorage only)
          crypto.subtle.exportKey("raw", key).then(function (raw) {
            try {
              sessionStorage.setItem("gaivsKey", btoa(String.fromCharCode.apply(null, new Uint8Array(raw))));
            } catch (e) { /* storage unavailable — will re-prompt per page */ }
          });
          if (runPage(plaintext)) openDoors();
          else setBusy(false);
        });
      });
    }).catch(function () {
      setBusy(false);
      errorEl.textContent = "That code didn't work — check with your organizer.";
      input.select();
    });
  }

  function tryStoredKey() {
    var stored = null;
    try { stored = sessionStorage.getItem("gaivsKey"); } catch (e) { /* ignore */ }
    if (!stored) return Promise.reject();
    return fetchPayload().then(function (p) {
      return crypto.subtle.importKey("raw", b64ToBytes(stored), { name: "AES-GCM" }, true, ["decrypt"])
        .then(function (key) { return decrypt(key, p); });
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    tryStoredKey().then(function (plaintext) {
      if (!runPage(plaintext)) buildOverlay();
    }).catch(buildOverlay);
  });
})();
