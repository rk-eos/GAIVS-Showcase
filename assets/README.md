# Adding your real files

## Videos
Drop each project's video into `assets/videos/` named to match its booth id
in `data/projects.js`, lowercase, no dash — e.g. booth `A-01` → `a01.mp4`.

- Format: **.mp4** (H.264) works everywhere without conversion.
  If your files are .mov from a phone, most video tools (or `ffmpeg -i in.mov -c:v libx264 -c:a aac out.mp4`) convert them.
- Keep files reasonably compressed (under ~150MB each) so the page loads quickly —
  1080p at a moderate bitrate is plenty for a 3–5 min pitch video.

## Pitch decks
Drop each 6-page deck into `assets/decks/` as a **PDF**, named to match — e.g. `a01.pdf`.

- If decks are currently PowerPoint/Google Slides, export/download as PDF first
  (File → Download → PDF in Slides, or Save As → PDF in PowerPoint).
- PDFs display inline in the browser's built-in viewer; the "Open deck in new tab"
  link underneath is a fallback for browsers that don't render PDFs inline.

## Updating project info
Edit `data/projects.js` — each project is one object with `title`, `students`,
`blurb`, `videoSrc`, `deckSrc`, and its `row`/`col`/`track` position on the map.
The `id` (e.g. `A-01`) is just a label; changing `row`/`col`/`track` is what
actually moves it around the floor plan.
