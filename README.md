# Showcase Hall — Student Project Exhibition

An interactive, blueprint-style floor plan for browsing a museum/conference-style
showcase of ~20 student projects. Each booth opens a panel with the project's
pitch video and 6-page deck.

## What's here
```
index.html          — RESULTS REVEAL (landing page): 3rd → 2nd → 1st place, podium, confetti
hall.html            — the full interactive floor plan of all 20 booths
brand.css            — shared color/font tokens (Global AI Venture Studio palette)
awards.css / awards.js — reveal page styling + GSAP/confetti/WebGL logic
style.css / script.js  — hall page styling + floor plan logic
data/projects.js     — YOUR PROJECT DATA — edit this
data/winners.js       — which booth id took 1st/2nd/3rd — edit this
assets/videos/       — drop .mp4 files here
assets/decks/        — drop .pdf files here
assets/README.md     — naming + format details
```

## The results reveal (index.html)
This is now the front door. It shows a locked 3rd/2nd/1st podium; each click on
"Reveal Nth Place" flips that card open (pulling title/students/blurb straight
from the matching entry in `data/projects.js`), with a bigger confetti-and-glow
moment on 1st place. After all three are revealed, a "Explore all 20 projects"
button appears, linking to `hall.html`.

**To set the winners:** open `data/winners.js` and change the `projectId` on
each place to the winning booth's id (e.g. `"A-01"`) — everything else
(title, students, blurb, video, deck) pulls automatically from that project's
entry in `data/projects.js`, so there's nothing to duplicate.

Uses GSAP (card animations), canvas-confetti (the 1st-place burst), and a
lightweight Three.js particle field in the background — all loaded from CDN,
no build step needed.

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
