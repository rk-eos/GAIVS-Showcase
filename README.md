# GAIVS Showcase — Global AI Venture Studio

A results-reveal landing page (3rd → 2nd → 1st place podium, with motion
and confetti) leading into a real 3D walkthrough hallway of all 20 student
projects. Each booth opens a panel with the project's pitch video and
6-page deck.

## What's here
```
index.html             — RESULTS REVEAL (landing page): 3rd → 2nd → 1st place, podium, confetti
hall.html               — the 3D walkthrough hallway of all 20 booths
brand.css               — shared color/font tokens (Global AI Venture Studio palette)
awards.css / awards.js  — reveal page styling + GSAP/confetti/WebGL particle bg
style.css / script.js   — hallway styling + Three.js walkthrough logic
data/projects.js        — YOUR PROJECT DATA — edit this
data/winners.js         — which booth id took 1st/2nd/3rd — edit this
assets/videos/          — drop .mp4 files here
assets/decks/           — drop .pdf files here
assets/README.md        — naming + format details
```

## The results reveal (index.html)
This is the front door. It shows a locked 3rd/2nd/1st podium; each click on
"Reveal Nth Place" flips that card open (pulling title/students/blurb straight
from the matching entry in `data/projects.js`), with a bigger confetti-and-glow
moment on 1st place. After all three are revealed, an "Explore all 20 projects"
button appears, linking to `hall.html`.

**To set the winners:** open `data/winners.js` and change the `projectId` on
each place to the winning booth's id (e.g. `"01"`) — everything else (title,
students, blurb, video, deck) pulls automatically from that project's entry
in `data/projects.js`, so there's nothing to duplicate.

Uses GSAP (card animations), canvas-confetti (the 1st-place burst), and a
lightweight Three.js particle field in the background — all loaded from CDN,
no build step needed.

## The project hall (hall.html)
A real 3D corridor (Three.js/WebGL), not a flat map. Booths line both sides
of the hallway, numbered 01–20 — no categories yet, since tracks aren't
decided; colors are purely decorative for now and easy to swap for real
category coloring later. Ways to walk through it:
- Scroll / mouse wheel over the hallway
- Drag the slider at the bottom
- Arrow keys (← →)
- The on-screen ← / → buttons (also the only walk method on touch devices without a wheel)

Typing in the search box and pressing **Enter** walks straight to the first
matching project and gives its booth a brief highlight flash. Clicking any
booth opens the same detail panel as before (video + deck), with Prev/Next
to browse without leaving the panel.

## 1. Add your content
1. Open `data/projects.js` and replace the placeholder entries with your
   real 20 projects (title, students, one-line blurb).
2. Drop video + deck files into `assets/videos` / `assets/decks` following
   the naming pattern in `assets/README.md`.
3. Once categories/tracks are decided, ask to have them added back in —
   the hallway is already built to color booths by group, it's just off
   for now.

## 2. Preview locally
Any static file server works, e.g. from this folder:
```
python3 -m http.server 8000
```
then open http://localhost:8000

(Opening `index.html` directly by double-clicking usually also works, but some
browsers block local video/PDF loading over `file://` — a local server avoids that.)

## 3. Publish it
Already deployed via GitHub Pages from this repo. To change the URL, see the
project's chat history for custom-domain steps, or ask again any time.

If your videos are large, consider uploading them to YouTube (unlisted) instead
and swapping `videoSrc` for a YouTube embed — ask and it can be wired in.
