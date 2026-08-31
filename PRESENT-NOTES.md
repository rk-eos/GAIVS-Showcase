# Present mode — integration notes

Two new standalone files at the repo root: `present.css` and `present.js`.
Both are inert unless the URL contains `present=1`, so they are safe to include
unconditionally on every load.

## Include lines to add

### `index.html`

Add the stylesheet **immediately after** the `awards.css` link in `<head>`
(currently line 20), so present-mode overrides win the cascade:

```html
<link rel="stylesheet" href="present.css?v=1">
```

Add the script **as the last `<script>` in `<body>`**, after the `gate.js` tag
(currently line 138):

```html
<script src="present.js?v=1"></script>
```

### `hall.html`

Add the stylesheet **immediately after** the `style.css` link in `<head>`
(currently line 19):

```html
<link rel="stylesheet" href="present.css?v=1">
```

Add the script **as the last `<script>` in `<body>`**, after the `gate.js` tag
(currently line 104):

```html
<script src="present.js?v=1"></script>
```

No other file changes are needed.

## Presenter controls

| Key     | index.html                                       | hall.html                  |
| ------- | ------------------------------------------------ | -------------------------- |
| `SPACE` | reveal next place; once all three are out, jumps to `hall.html?present=1` | start / stop the auto walk |
| `c`     | toggle a cursor-free screen (clean recording)     | same                       |
| `3`     | big centered 3 · 2 · 1 · Go countdown, then fades | same                       |

Keys are ignored while a project panel (`#panel`) or the watch modal
(`#watchModal`) is open, and while a text field has focus (so the hall search
box still works normally).

## What present mode hides / changes

- **index.html** — hides `.placeholder-warning` and `#resetRevealBtn`; freezes
  the credit footnote at a steady 0.55 opacity so a stray mouse can't flicker it
  mid-take.
- **hall.html** — hides `#hallwayHint`; after 3 s the header collapses to a
  slim state (subtitle, hall note and back link fade out, title shrinks) so the
  3D view dominates the frame.
- **both** — a faint bottom-right HUD in IBM Plex Mono at 40 % opacity showing
  the next SPACE action plus the `c` / `3` reminders. It is `pointer-events:
  none` and small enough to crop out of the final video.

## Recording recipe

1. Open `index.html?present=1`, unlock the password gate off-camera.
2. Press `c` to hide the cursor, then `3` for the countdown and start narrating.
3. `SPACE` three times to reveal 3rd → 2nd → 1st.
4. `SPACE` once more to fly to the hall (the `present=1` flag carries over).
5. `SPACE` on the hall page to start the auto walk; `SPACE` again to stop.
