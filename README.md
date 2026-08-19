# Showcase Hall — Student Project Exhibition

An interactive, blueprint-style floor plan for browsing a museum/conference-style
showcase of ~20 student projects. Each booth opens a panel with the project's
pitch video and 6-page deck.

## What's here
```
index.html          — page structure
style.css           — blueprint visual theme
script.js           — renders the map, search/filter, detail panel
data/projects.js     — YOUR PROJECT DATA — edit this
assets/videos/       — drop .mp4 files here
assets/decks/        — drop .pdf files here
assets/README.md     — naming + format details
```

## 1. Add your content
1. Open `data/projects.js` and replace the placeholder entries with your
   real 20 projects (title, students, one-line blurb).
2. Drop video + deck files into `assets/videos` / `assets/decks` following
   the naming pattern in `assets/README.md`.

## 2. Preview locally
Any static file server works, e.g. from this folder:
```
python3 -m http.server 8000
```
then open http://localhost:8000

(Opening `index.html` directly by double-clicking usually also works, but some
browsers block local video/PDF loading over `file://` — a local server avoids that.)

## 3. Publish it
Pick whichever is easiest for you:

- **GitHub Pages** (free): push this folder to a GitHub repo, enable Pages in
  repo settings, done. Best if files aren't huge (GitHub has repo size limits).
- **Netlify / Vercel** (free): drag-and-drop the folder in their dashboard.
  Handles larger video files better than GitHub Pages.
- **Embed in a Google Site**: host the folder anywhere above, then in Google
  Sites use Insert → Embed → "By URL" to embed the page. Note: Sites' embed
  frame adds its own scroll/border chrome and isn't full-bleed, so it'll feel
  less immersive than visiting the hosted page directly.

If your videos are large, consider uploading them to YouTube (unlisted) instead
and swapping `videoSrc` for a YouTube embed — ask me and I can wire that in.

## Notes on the design
- Booth IDs encode meaning: the letter is the aisle/track (A–D), the number is
  position within that aisle — so `C-03` always reads as "3rd booth in
  Sustainability."
- Search and track filters dim non-matching booths on the map itself rather
  than swapping to a separate list, so you never lose your sense of place.
- Arrow keys (← →) step through booths once a panel is open, Esc closes it.
