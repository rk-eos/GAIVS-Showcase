# Adding your real files

## Videos
Drop each project's video into `assets/videos/` named to match its booth id
in `data/projects.js` — e.g. booth `01` → `01.mp4`.

- Format: **.mp4** (H.264) works everywhere without conversion.
  If your files are .mov from a phone, most video tools (or `ffmpeg -i in.mov -c:v libx264 -c:a aac out.mp4`) convert them.
- Keep files reasonably compressed (under ~150MB each) so the page loads quickly —
  1080p at a moderate bitrate is plenty for a 3–5 min pitch video.

## Pitch decks
Drop each 6-page deck into `assets/decks/` as a **PDF**, named to match — e.g. `01.pdf`.

- If decks are currently PowerPoint/Google Slides, export/download as PDF first
  (File → Download → PDF in Slides, or Save As → PDF in PowerPoint).
- PDFs display inline in the browser's built-in viewer; the "Open deck in new tab"
  link underneath is a fallback for browsers that don't render PDFs inline.

## Updating project info
Edit `data/projects.js` — each project is one object with `id`, `title`,
`students`, `blurb`, `videoSrc`, and `deckSrc`. Categories/tracks aren't
decided yet, so booths are just numbered 01–20 for now and colored
decoratively (not by category) in the 3D hallway.
