# GAIVS Showcase — Security Notes

Scope of this pass: `listing.js`, `safeurl.js`, `vendor/`, this file.
Everything else (`gate.js`, `script.js`, `awards.js`, `present.js`, HTML, CSS, `data/`)
is untouched — the drop-in material below is for whoever owns those files.

## Verdict table

| # | Finding | Verdict | One-line evidence |
|---|---------|---------|-------------------|
| 1 | Client-side gate brute-forceable if code is weak | REAL (mitigated, not fixable client-side) | `gate.js:29` — `iterations: 250000, hash: "SHA-256"`, AES-GCM-256: params are sound, so residual risk is entirely the entropy of the shared code. |
| 2 | Decrypted payload executed as script; CDN scripts could read it | REAL | `gate.js:47-50` `runPage()` builds a `<script>` with `code.textContent = plaintext` and appends it; three/gsap/confetti load from unpkg/jsDelivr with no SRI (`index.html:139-141`, `hall.html:103`) and share the same realm as `PROJECTS`. |
| 3 | innerHTML XSS in `listing.js` | REAL — FIXED | old `renderList()` did `listWrap.innerHTML = projects.map(...)` interpolating `p.title`, `p.students`, `p.blurb`, `p.id`, `p.deckSrc` raw. |
| 4 | Unvalidated href assignment | REAL — fixed in `listing.js`, open in `script.js` / `awards.js` | `script.js:1025,1031,1038` and `awards.js:623,629,636` assign `.href` straight from project fields / `classifyVideo` output. |
| 5 | Third-party metadata (Google Fonts, YouTube/Drive embeds) | PARTIAL | Google Fonts CSS+files are loaded on all three pages (`index.html:16-18` etc.) and YouTube embeds use `https://www.youtube.com/embed/` (`listing.js`, `script.js:985`, `awards.js:598`) — real but low-severity metadata leakage; the Drive `/preview` frame is required for playback and cannot be removed. |
| 6 | Commit author email | NOT ASSESSED HERE (note only) | No git commands were run in this pass; main session should verify `git log --format='%ae'` and, if a personal address is exposed, set a `noreply` address and rewrite history if warranted. |

---

## 1. Gate strength

**Verdict: REAL, mitigated.** `gate.js:26-32` uses PBKDF2-SHA256 at 250,000 iterations
to derive an AES-GCM-256 key — that is at or above current OWASP guidance, and there is
no weakness in the KDF construction. But this is a *published ciphertext*: anyone with
the repo can run an offline dictionary attack at their own pace, and 250k iterations only
buys a constant factor. `gate.js:171` also lowercases the code (`input.value.trim().toLowerCase()`),
which removes case entropy.

No code change made. Recommendations for the main session:
- Use a code with real entropy — five or six random words, or ≥12 random chars. A memorable
  phrase like a school name is trivially brute-forced regardless of iteration count.
- Since the code is lowercased, do not count on case for entropy; add length instead.
- Consider raising iterations to 600,000 (`gate.js:29`) — a one-line change, ~1s on a laptop.

## 2. Payload executed as script (drop-in for `gate.js`)

**Verdict: REAL.** The decrypted plaintext is currently *JavaScript*, executed via an
injected `<script>`. Two consequences: (a) anyone who guesses the code gets arbitrary-JS
execution semantics rather than data parsing, and (b) any third-party script in the page —
three.js, gsap, confetti, all loaded from a CDN with no integrity attribute — runs in the
same realm and can read `window.PROJECTS` (student names and links) after unlock.

### Step A — re-encrypt the payload as JSON

The plaintext inside `data/projects.enc.json` must become a bare JSON array/object (i.e.
`[{"id":"01", ...}]`), **not** `const PROJECTS = [...]` / `window.PROJECTS = ...`.
Re-run the encryption script with the JSON text as input; `salt` / `iv` / `ct` field names
stay the same. This step and the `runPage()` change must land together.

### Step B — exact replacement for `runPage()` in `gate.js` (currently lines 47-54)

Replace:

```js
  function runPage(plaintext) {
    var code = document.createElement("script");
    code.textContent = plaintext;
    document.body.appendChild(code); // defines PROJECTS
    loadScriptsSequentially(scriptsToLoad, function () {
      document.dispatchEvent(new Event("gaivs:unlocked"));
    });
  }
```

with:

```js
  // The decrypted payload is DATA, never code: parse it as JSON and publish it
  // on window.PROJECTS. Nothing from the payload is ever evaluated.
  function runPage(plaintext) {
    var data;
    try {
      data = JSON.parse(plaintext);
    } catch (e) {
      if (typeof errorEl !== "undefined" && errorEl) {
        errorEl.textContent = "The showcase data could not be read — contact your organizer.";
      }
      if (typeof setBusy === "function") setBusy(false);
      return;
    }
    window.PROJECTS = data;
    loadScriptsSequentially(scriptsToLoad, function () {
      document.dispatchEvent(new Event("gaivs:unlocked"));
    });
  }
```

Note: `attempt()` calls `openDoors()` before `runPage()` (`gate.js:184-185`); if you want a
parse failure to keep the gate visible, move the `openDoors()` call to after a successful
`runPage()` return. Also `tryStoredKey().then(runPage)` (`gate.js:206`) needs no change —
a stale/garbage session key now fails at `JSON.parse` and shows the message instead of
executing anything.

### Step C — vendored library `<script src>` replacements

The three libraries are now pinned in `vendor/` (see hashes below). Replace the CDN tags:

`index.html` lines 139-141 —

```html
<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
<script src="https://unpkg.com/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
```

becomes

```html
<script src="vendor/three-0.160.0.min.js"></script>
<script src="vendor/gsap-3.12.5.min.js"></script>
<script src="vendor/confetti-1.9.2.min.js"></script>
```

`hall.html` line 103 —

```html
<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
```

becomes

```html
<script src="vendor/three-0.160.0.min.js"></script>
```

`list.html` loads no CDN libraries; nothing to change there.

### Vendored file hashes (SHA-256)

| File | Bytes | SHA-256 |
|------|-------|---------|
| `vendor/three-0.160.0.min.js` | 669,884 | `170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa` |
| `vendor/gsap-3.12.5.min.js` | 72,214 | `28033e449a31ebcc396e5be8b13b63152bf03094288fb5867034321927bce087` |
| `vendor/confetti-1.9.2.min.js` | 10,781 | `e888ffb2080774361d6731d80aa5ae5d3f1265633b0bb32cc73c15dca97ae34e` |

Provenance: fetched with `curl` from `unpkg.com/three@0.160.0/build/three.min.js`,
`unpkg.com/gsap@3.12.5/dist/gsap.min.js`, and
`cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js`.
Each was inspected: GSAP carries its `GSAP 3.12.5` license banner, confetti carries the
jsDelivr/Terser banner naming `canvas-confetti@1.9.2`, and three.js opens with the r150+
`build/three.min.js` deprecation `console.warn` (expected for this build — it is the same
file the site was already loading, so behaviour is unchanged).

Verify at any time with `certutil -hashfile vendor\three-0.160.0.min.js SHA256`.

## 3. innerHTML XSS in `listing.js` — FIXED

The old `renderList()` concatenated `p.id`, `p.title`, `p.students`, `p.blurb` and
`p.deckSrc` into an HTML string. Any of those fields containing markup (or a crafted
`deckSrc` closing the attribute) would execute in the page.

Rewritten to `createElement` + `textContent` throughout, with `href` set only after
scheme validation. Preserved exactly: `list-item` (with `data-index`, `data-search`),
`list-item__id`, `list-item__body`, the `<h2>`, `list-item__students`, `list-item__blurb`,
`list-item__actions`, `list-item__watch-btn` (with `data-index`), `list-item__deck-link`
(`target="_blank" rel="noopener"`). The `data-search` value is still
`(title + " " + students.join(" ") + " " + id).toLowerCase().replace(/"/g, "")`, so the
existing search and click handlers are unaffected. Style stays ES5 (`var`, IIFE).

## 4. Unvalidated href assignment

`listing.js` — fixed: every URL now goes through `GAIVS_SAFEURL.sanitize()`, including the
watch-modal assignments (`watchVideo.src`, `watchVideoFrame.src`, `watchVideoExternalLink.href`,
`watchDeckLink.href`, `watchPrototypeLink.href`). When a URL fails validation the link is
hidden and its `href` removed rather than being set to a `javascript:` value.
`listing.js` carries an inline fallback copy of the validator, so it stays safe even if the
`safeurl.js` tag is missing — but please add the tag anyway.

**New file `safeurl.js`** exposes `window.GAIVS_SAFEURL = { isSafe(url), sanitize(url) }`.
It parses with the `URL` constructor inside `try/catch` (relative URLs resolved against
`location.href`, so local `assets/...` video paths still pass) and accepts only `http:` and
`https:`. No host allowlist.

### Load `safeurl.js` before the data-dependent scripts

Either add it as a plain tag in each page's `<head>` or just above the gate tag, e.g. in
`index.html`, `hall.html` and `list.html`:

```html
<script src="safeurl.js?v=1"></script>
```

…or, equivalently, prepend it to the gate's `data-scripts` list, e.g. in `list.html:61`:

```html
<script src="gate.js?v=2" data-scripts="safeurl.js?v=1,listing.js?v=7"></script>
```

(bump `listing.js?v=6` to `?v=7` so the rewritten file isn't served from cache).

### Exact one-line wrappings for `script.js`

```js
// line 1025:  panelVideoExternalLink.href = v.url;
panelVideoExternalLink.href = GAIVS_SAFEURL.sanitize(v.url);

// line 1031:  panelDeckLink.href = project.deckSrc;
panelDeckLink.href = GAIVS_SAFEURL.sanitize(project.deckSrc);

// line 1038:  panelPrototypeLink.href = project.prototypeSrc;
panelPrototypeLink.href = GAIVS_SAFEURL.sanitize(project.prototypeSrc);
```

Also wrap the two media sources in the same `openPanel` block:
`panelVideo.src = GAIVS_SAFEURL.sanitize(v.url);` and
`panelVideoFrame.src = GAIVS_SAFEURL.sanitize(v.url);`.

### Exact one-line wrappings for `awards.js`

```js
// line 623:  watchVideoExternalLink.href = v.url;
watchVideoExternalLink.href = GAIVS_SAFEURL.sanitize(v.url);

// line 629:  watchDeckLink.href = deckUrl;
watchDeckLink.href = GAIVS_SAFEURL.sanitize(deckUrl);

// line 636:  watchPrototypeLink.href = project.prototypeSrc;
watchPrototypeLink.href = GAIVS_SAFEURL.sanitize(project.prototypeSrc);
```

Same for `watchVideo.src` / `watchVideoFrame.src` in `awards.js:616-621`.
(`awards.js:735` `a.href = URL.createObjectURL(blob)` is a self-generated blob download —
leave it as is, it does not take project data.)

## 5. Third-party metadata

**Verdict: PARTIAL.**

- **Google Fonts** (`index.html:16-18`, `hall.html:16-18`, `list.html:14`): each visitor's IP
  and User-Agent reach `fonts.googleapis.com` / `fonts.gstatic.com`. Real, low severity.
  Fully removing it means self-hosting the three families in `assets/` — worth doing if you
  want zero third-party requests, but out of scope for a hardening pass.
- **YouTube embeds**: `classifyVideo()` in `listing.js`, `script.js:985` and `awards.js:598`
  builds `https://www.youtube.com/embed/<id>`, which sets tracking cookies on view.
  Swap the domain in all three files:

  ```js
  // before
  if (yt) return { type: "iframe", url: "https://www.youtube.com/embed/" + yt[1] };
  // after
  if (yt) return { type: "iframe", url: "https://www.youtube-nocookie.com/embed/" + yt[1] };
  ```

  (I own `listing.js` but left its embed domain unchanged so all three stay in sync — apply
  this to `listing.js` too when you make the pass.)
- **Drive `/preview` frames** are required for playback of Drive-hosted pitches; keep them.
- Add `referrerpolicy="no-referrer"` to the two pitch iframes so the showcase URL is not sent
  to YouTube/Google:

  ```html
  <!-- index.html:120 -->
  <iframe id="watchVideoFrame" title="Pitch video" allow="autoplay; encrypted-media; fullscreen" referrerpolicy="no-referrer" allowfullscreen hidden></iframe>
  <!-- hall.html:91 -->
  <iframe id="panelVideoFrame" title="Pitch video" allow="autoplay; encrypted-media; fullscreen" referrerpolicy="no-referrer" allowfullscreen hidden></iframe>
  ```

  `list.html:43` has the same `watchVideoFrame` iframe and should get the attribute too.

## 6. Commit author email

Note only — no git commands were run in this pass. The main session should check
`git log --format='%an <%ae>' | sort -u` and, if a personal address is published, configure
a GitHub `users.noreply.github.com` address and decide whether to rewrite history before the
repo goes public.

## Recommended meta tags (GitHub Pages has no header control)

Instructions only — no HTML was edited. Add both tags inside `<head>` of `index.html`,
`hall.html`, `list.html` and `404.html`, **as early as possible and before any other
`<script>`/`<link>`** (a meta CSP only governs resources declared after it):

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://drive.google.com; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">
<meta name="referrer" content="no-referrer">
```

Caveats, deliberately conservative:
- `'unsafe-inline'` is kept in `script-src` because `gate.js` and others use inline handlers
  and `transitions.js` patterns; tightening to hashes/nonces is a follow-up, and is only
  meaningfully safer *after* finding 2's `JSON.parse` change lands.
- `style-src 'unsafe-inline'` is required by the injected `GATE_CSS` `<style>` block
  (`gate.js:106-107`) and by the inline `style.display` assignments.
- `frame-ancestors` is ignored in a meta CSP by most browsers — harmless to include.
- Ship the CSP only *after* the vendored `<script src>` swap in Step C; `default-src 'self'`
  will block the unpkg/jsDelivr tags and break the pages otherwise.
- Test all three pages with the console open before publishing; a meta CSP cannot be
  report-only, so a mistake is a hard breakage.
