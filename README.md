# GAIVS Showcase — Global AI Venture Studio

A results-reveal landing page (3rd → 2nd → 1st place podium, with motion
and confetti) leading into a real 3D walkthrough hallway of all 17 student
projects. Each booth opens a panel with the project's pitch video and
6-page deck.

**The site is gated behind an access code** shared privately with students
and parents. Project data (names, blurbs, links) lives only in encrypted
form in this repo — see "Privacy" below.

## What's here
```
index.html              — RESULTS REVEAL (landing page): 3rd → 2nd → 1st place, podium, confetti
hall.html               — the 3D walkthrough hallway of all 17 booths
list.html               — simple list fallback for the hall
gate.js                 — access-code gate; decrypts the project data in the browser
data/projects.enc.json  — the project data, AES-GCM encrypted (see Privacy)
data/winners.js         — which booth id took 1st/2nd/3rd (ids only, no names)
brand.css               — shared color/font tokens (Global AI Venture Studio palette)
awards.css / awards.js  — reveal page styling + GSAP/confetti/WebGL particle bg
style.css / script.js   — hallway styling + Three.js walkthrough logic
listing.css / listing.js — list-view styling + rendering
assets/                 — logos, favicons, applause audio
```

## Privacy
Student names and submission details are **not** stored in plaintext anywhere
in this repository or its history. `data/projects.enc.json` is the project
data encrypted with AES-256-GCM; the key is derived (PBKDF2, 250k iterations)
from an access code that is distributed privately and never committed.
`gate.js` prompts for the code on each page and decrypts in the browser;
a wrong code simply fails to decrypt.

**To edit the project data:** keep your plaintext `projects.js` outside the
repo, edit it there, then re-encrypt it to `data/projects.enc.json`
(PBKDF2-SHA256, 250k iterations, random 16-byte salt, AES-GCM with random
12-byte IV, output `{salt, iv, ct}` as base64 JSON). Never commit the
plaintext file
(`.gitignore` already blocks `data/projects.js`).

## The results reveal (index.html)
Shows a locked 3rd/2nd/1st podium; each click on "Reveal Nth Place" flips
that card open, with a bigger confetti-and-glow moment on 1st place. After
all three are revealed, an "Explore all 17 projects" button appears.

**To set the winners:** open `data/winners.js` and change the `projectId` on
each place to the winning booth's id (e.g. `"01"`) — everything else pulls
automatically from the encrypted project data. When you change winners, bump
the `?v=` on `data/winners.js` in BOTH `index.html` and `hall.html` so no
visitor sees a stale cached copy.

## The project hall (hall.html)
A real 3D corridor (Three.js/WebGL). Booths line both sides of the hallway —
scroll, drag the slider, arrow keys, or the on-screen buttons to walk.
Search + Enter walks straight to a match. Clicking any booth opens the
detail panel (video + deck). `list.html` is the no-WebGL fallback.

## Preview locally
Any static file server works, e.g. from this folder:
```
python3 -m http.server 8000
```
then open http://localhost:8000 and enter the access code. (A server is
required — the gate fetches the encrypted data file, which browsers block
over `file://`.)

## Publish
Deployed via GitHub Pages from this repo — pushing to `main` redeploys.
