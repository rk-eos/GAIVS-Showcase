/* ===========================================================================
 * GAIVS_SFX — sound effects for the winners reveal.
 *
 * Exposes window.GAIVS_SFX with:
 *   playApplause(intensity)  crowd applause clip, graceful ~4s fade-out tail
 *   playSparkle()            layered bell chime for 1st place
 *   playDrumroll()           ~1.8s snare-style anticipation roll
 *   playWhoosh()             short soft riser for card flips
 *
 * Everything is lazy: no AudioContext exists until the first call, and every
 * entry point is wrapped so a blocked / unsupported audio stack can never throw
 * into the reveal sequence.
 * ======================================================================== */
(function () {
  "use strict";

  var APPLAUSE_SRC = "assets/audio/applause.mp3";
  var APPLAUSE_FADE_SECONDS = 4;

  // ---------------------------------------------------------------------------
  // CONTEXT + MASTER BUS
  // ---------------------------------------------------------------------------
  var ctx = null;
  var master = null;
  var reverb = null;      // convolver, shared "room" send
  var reverbGain = null;

  function audio() {
    if (ctx === null) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { ctx = false; return null; }
      try { ctx = new AC(); } catch (e) { ctx = false; return null; }

      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      // A small bright room. Keeps the chime and whoosh from sounding dry and
      // synthetic without washing out the applause (which has its own room).
      try {
        reverb = ctx.createConvolver();
        reverb.buffer = makeImpulse(1.9, 2.4);
        reverbGain = ctx.createGain();
        reverbGain.gain.value = 0.9;
        reverb.connect(reverbGain);
        reverbGain.connect(master);
      } catch (e2) {
        reverb = null;
      }
    }
    if (ctx === false) return null;
    // Browsers start the context suspended until a user gesture.
    if (ctx.state === "suspended" && ctx.resume) {
      try { ctx.resume(); } catch (e3) { /* nothing useful to do */ }
    }
    return ctx;
  }

  // Exponentially decaying noise, darkening as it decays — a serviceable
  // stand-in for a recorded room impulse.
  function makeImpulse(seconds, falloff) {
    var rate = ctx.sampleRate;
    var len = Math.max(1, Math.floor(rate * seconds));
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      var lp = 0;
      for (var i = 0; i < len; i++) {
        var frac = i / len;
        var env = Math.pow(1 - frac, falloff);
        // one-pole lowpass with a cutoff that closes over time
        var a = 0.35 * (1 - frac) + 0.05;
        lp += a * ((Math.random() * 2 - 1) * env - lp);
        d[i] = lp;
      }
    }
    return buf;
  }

  // Route a node to the dry master and (optionally) the reverb send.
  function send(node, dry, wet) {
    var g = ctx.createGain();
    g.gain.value = dry;
    node.connect(g);
    g.connect(master);
    if (reverb && wet > 0) {
      var w = ctx.createGain();
      w.gain.value = wet;
      node.connect(w);
      w.connect(reverb);
    }
  }

  function noiseBuffer(seconds) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------------------------------------------------------------------------
  // APPLAUSE
  // ---------------------------------------------------------------------------
  var applausePromise = null;

  function applauseBuffer() {
    var c = audio();
    if (!c) return Promise.reject(new Error("no audio context"));
    if (!applausePromise) {
      applausePromise = fetch(APPLAUSE_SRC)
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (raw) {
          return new Promise(function (resolve, reject) {
            // callback form as well as the promise return — older WebKit only
            // supports the callbacks.
            var p = c.decodeAudioData(raw, resolve, reject);
            if (p && typeof p.then === "function") p.then(resolve, reject);
          });
        });
    }
    return applausePromise;
  }

  function applause(intensity) {
    intensity = intensity || 1;
    var vol = Math.min(1, 0.62 * intensity);   // 1 => 0.62, 1.5 => 0.93

    applauseBuffer().then(function (buffer) {
      var c = audio();
      if (!c) return;
      var src = c.createBufferSource();
      src.buffer = buffer;

      var gain = c.createGain();
      var now = c.currentTime;
      var total = buffer.duration;
      var fadeAt = Math.max(0.05, total - APPLAUSE_FADE_SECONDS);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.setValueAtTime(vol, now + fadeAt);
      // exponential decay reads as a room emptying out; a linear ramp sounds
      // like someone pulling a fader.
      gain.gain.exponentialRampToValueAtTime(0.0001, now + total);

      src.connect(gain);
      send(gain, 1, 0);   // the clip already carries its own room
      src.start(now);
      src.stop(now + total + 0.05);
    })["catch"](function () { /* autoplay policy / decode edge cases */ });
  }

  // ---------------------------------------------------------------------------
  // SPARKLE — 1st place chime
  // ---------------------------------------------------------------------------
  // One struck bell voice: inharmonic partials, each with its own decay, plus a
  // short FM strike transient. The inharmonicity and the per-partial decay rates
  // are what separate this from a plain oscillator beep.
  var PARTIALS = [
    // ratio, level, decay(s), detune(cents)
    [1.000, 1.00, 3.00, 0],
    [2.003, 0.52, 2.20, -4],
    [2.988, 0.34, 1.60, 6],
    [4.180, 0.22, 1.10, -7],
    [5.430, 0.14, 0.75, 9],
    [6.790, 0.09, 0.50, -5],
    [8.210, 0.05, 0.32, 4]
  ];

  function bell(f0, t0, level) {
    var voice = ctx.createGain();
    voice.gain.value = level;

    // gentle top-end tame so the high partials shimmer instead of stabbing
    var tone = ctx.createBiquadFilter();
    tone.type = "highshelf";
    tone.frequency.value = 5000;
    tone.gain.value = -5;
    voice.connect(tone);
    send(tone, 0.85, 0.55);

    var i, p, osc, g, freq, dec;
    for (i = 0; i < PARTIALS.length; i++) {
      p = PARTIALS[i];
      freq = f0 * p[0];
      if (freq > 15000) continue;
      dec = p[2];

      osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = p[3];

      g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(p[1] * 0.32, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dec);

      osc.connect(g);
      g.connect(voice);
      osc.start(t0);
      osc.stop(t0 + dec + 0.05);

      // Beating twin, a few cents off, on the strong low partials only. Real
      // bells wobble slightly; a single oscillator per partial sounds dead.
      if (i < 3) {
        var osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = freq;
        osc2.detune.value = p[3] + (i % 2 === 0 ? 7 : -7);
        var g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.0001, t0);
        g2.gain.exponentialRampToValueAtTime(p[1] * 0.16, t0 + 0.008);
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dec * 0.85);
        osc2.connect(g2);
        g2.connect(voice);
        osc2.start(t0);
        osc2.stop(t0 + dec + 0.05);
      }
    }

    // FM strike: a fast, inharmonic metallic click that decays in ~120ms and
    // gives the note its "struck" attack.
    var car = ctx.createOscillator();
    car.type = "sine";
    car.frequency.value = f0 * 2;
    var mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = f0 * 1.414;      // irrational-ish ratio => clangy
    var modDepth = ctx.createGain();
    modDepth.gain.setValueAtTime(f0 * 5, t0);
    modDepth.gain.exponentialRampToValueAtTime(f0 * 0.05, t0 + 0.14);
    mod.connect(modDepth);
    modDepth.connect(car.frequency);

    var strikeGain = ctx.createGain();
    strikeGain.gain.setValueAtTime(0.0001, t0);
    strikeGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.004);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.20);
    car.connect(strikeGain);
    strikeGain.connect(voice);

    mod.start(t0); mod.stop(t0 + 0.25);
    car.start(t0); car.stop(t0 + 0.25);
  }

  function sparkle() {
    var c = audio();
    if (!c) return;
    var t0 = c.currentTime + 0.02;

    // Rising figure, G major pentatonic-ish, with the top note ringing longest.
    var notes = [783.99, 1174.66, 1567.98, 2349.32];  // G5 D6 G6 D7
    var levels = [0.55, 0.5, 0.6, 0.32];
    for (var i = 0; i < notes.length; i++) {
      bell(notes[i], t0 + i * 0.085, levels[i]);
    }

    // Low bloom an octave and a half down — gives the chime a body so it reads
    // as "magical" rather than "doorbell".
    var sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(261.63, t0);
    var subG = c.createGain();
    subG.gain.setValueAtTime(0.0001, t0);
    subG.gain.exponentialRampToValueAtTime(0.10, t0 + 0.05);
    subG.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    sub.connect(subG);
    send(subG, 0.8, 0.3);
    sub.start(t0);
    sub.stop(t0 + 2.3);

    // Shimmer: quiet high noise swept upward, riding just under the bells.
    var shimDur = 1.8;
    var noise = c.createBufferSource();
    noise.buffer = noiseBuffer(shimDur);

    var bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(2200, t0);
    bp.frequency.exponentialRampToValueAtTime(9000, t0 + 1.1);

    var shimG = c.createGain();
    shimG.gain.setValueAtTime(0.0001, t0);
    shimG.gain.exponentialRampToValueAtTime(0.045, t0 + 0.12);
    shimG.gain.exponentialRampToValueAtTime(0.0001, t0 + shimDur);

    noise.connect(bp);
    bp.connect(shimG);
    send(shimG, 0.7, 0.8);
    noise.start(t0);
    noise.stop(t0 + shimDur);
  }

  // ---------------------------------------------------------------------------
  // DRUMROLL
  // ---------------------------------------------------------------------------
  // Rendered once into a single buffer: ~55 individually enveloped noise hits is
  // a lot of graph nodes to schedule live, and baking it keeps the timing exact.
  var rollBuffer = null;

  function makeRoll() {
    var rate = ctx.sampleRate;
    var dur = 1.8;
    var len = Math.floor(rate * dur);
    var buf = ctx.createBuffer(2, len, rate);
    var chL = buf.getChannelData(0);
    var chR = buf.getChannelData(1);

    var hitLen = Math.floor(rate * 0.045);
    var t = 0.0;
    while (t < dur - 0.05) {
      var start = Math.floor(t * rate);
      // crescendo across the roll
      var prog = t / dur;
      var amp = (0.30 + 0.70 * prog * prog) * (0.75 + Math.random() * 0.25);
      // alternating hands sit slightly off-centre
      var pan = (Math.random() * 2 - 1) * 0.5;
      var gl = Math.cos((pan + 1) * Math.PI / 4);
      var gr = Math.sin((pan + 1) * Math.PI / 4);
      var decay = 0.010 + Math.random() * 0.006;

      for (var i = 0; i < hitLen && start + i < len; i++) {
        var ts = i / rate;
        var env = Math.exp(-ts / decay);
        if (i < 8) env *= i / 8;
        var v = (Math.random() * 2 - 1) * env * amp;
        chL[start + i] += v * gl;
        chR[start + i] += v * gr;
      }
      // ~30Hz repetition with human jitter
      t += (1 / 30) * (0.82 + Math.random() * 0.36);
    }

    // normalize with headroom
    var peak = 0;
    for (var k = 0; k < len; k++) {
      var a = Math.abs(chL[k]); if (a > peak) peak = a;
      var b = Math.abs(chR[k]); if (b > peak) peak = b;
    }
    if (peak > 0) {
      var n = 0.9 / peak;
      for (var k2 = 0; k2 < len; k2++) { chL[k2] *= n; chR[k2] *= n; }
    }
    return buf;
  }

  function drumroll() {
    var c = audio();
    if (!c) return;
    if (!rollBuffer) rollBuffer = makeRoll();

    var t0 = c.currentTime + 0.01;
    var src = c.createBufferSource();
    src.buffer = rollBuffer;

    // Band-limit into snare territory: no deep thump, no hiss.
    var hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 220;
    var bp = c.createBiquadFilter();
    bp.type = "peaking";
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    bp.gain.value = 4;
    var lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 7500;

    var g = c.createGain();
    var d = rollBuffer.duration;
    g.gain.setValueAtTime(0.30, t0);
    g.gain.setValueAtTime(0.30, t0 + d - 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);

    src.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(g);
    send(g, 1, 0.35);
    src.start(t0);
    src.stop(t0 + d + 0.05);
  }

  // ---------------------------------------------------------------------------
  // WHOOSH
  // ---------------------------------------------------------------------------
  function whoosh() {
    var c = audio();
    if (!c) return;
    var t0 = c.currentTime + 0.01;
    var dur = 0.5;

    var src = c.createBufferSource();
    src.buffer = noiseBuffer(dur);

    // Sweep a resonant band up and slightly back down — reads as movement
    // rather than as a hiss.
    var bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(320, t0);
    bp.frequency.exponentialRampToValueAtTime(3200, t0 + dur * 0.72);
    bp.frequency.exponentialRampToValueAtTime(1500, t0 + dur);

    var lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 9000;

    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.20, t0 + dur * 0.66);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(bp); bp.connect(lp); lp.connect(g);
    send(g, 1, 0.30);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API — every entry point swallows its own errors
  // ---------------------------------------------------------------------------
  function guard(fn) {
    return function (a) {
      try { return fn(a); } catch (e) { /* audio is never worth breaking the page */ }
    };
  }

  window.GAIVS_SFX = {
    playApplause: guard(applause),
    playSparkle: guard(sparkle),
    playDrumroll: guard(drumroll),
    playWhoosh: guard(whoosh)
  };
})();
