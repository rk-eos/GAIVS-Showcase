// ---------------------------------------------------------------------------
// SAFE URL HELPER
// Shared scheme validator for any URL that comes out of the project data and
// ends up in an href / src. Only http: and https: are accepted; javascript:,
// data:, vbscript:, file: and friends are rejected. No host allowlist — the
// decks and prototypes live on many different services.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  function isSafe(url) {
    if (typeof url !== "string") return false;
    var trimmed = url.trim();
    if (!trimmed) return false;
    var parsed;
    try {
      parsed = new URL(trimmed, window.location.href);
    } catch (e) {
      return false;
    }
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }

  function sanitize(url) {
    return isSafe(url) ? String(url).trim() : "";
  }

  window.GAIVS_SAFEURL = { isSafe: isSafe, sanitize: sanitize };
})();
