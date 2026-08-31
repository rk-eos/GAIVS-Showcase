# Sound effects

## What changed

**`assets/audio/applause.mp3` — replaced.** The old clip ended abruptly and had
unclear provenance (its ID3 tags read `converted by convert2mp3.net`, so it had
been ripped from a streaming site). The new one is synthesized from scratch: no
licensing question, and it dies away gracefully instead of being cut off.

9.000 s · 44.1 kHz stereo · 128 kbps · 145 KB · peak −1.96 dBFS · fades to
−63.7 dBFS. Full provenance and method in `assets/audio/SOURCES.md`.

The tail works because 140 simulated clappers each stop at their own moment
across ~4.3–8.7 s (a few hold on to the end), so the room thins out naturally
rather than the whole crowd being faded down at once.

**`sfx.js` — new.** Self-contained IIFE exposing `window.GAIVS_SFX`:

| Method | Sound |
| --- | --- |
| `playApplause(intensity)` | The clip, with a ~4 s exponential fade-out tail. `intensity` scales volume — `1` normal, `1.5` for 1st place. |
| `playSparkle()` | 1st-place chime. Four struck bell voices, each built from 7 inharmonic partials with per-partial decay rates, detuned beating twins on the low partials, an FM strike transient, a low bloom for body and a swept shimmer layer. Runs through a small convolution reverb. |
| `playDrumroll()` | ~1.8 s snare roll at ~30 Hz with human jitter and a crescendo, band-limited to snare territory. Baked into one buffer and cached on first use. |
| `playWhoosh()` | ~0.5 s soft riser, a resonant band swept up and slightly back down, for card flips. |

Lazy `AudioContext` (nothing is created until the first call), resume-on-call
for autoplay policy, and every public method is wrapped so audio can never throw
into the reveal sequence — including when the browser has no Web Audio at all.

### Levels

Measured by rendering through an `OfflineAudioContext`. Nothing clips.

| | peak | RMS |
| --- | --- | --- |
| applause (intensity 1) | −6.1 dBFS | −22.1 dBFS |
| sparkle | −5.6 dBFS | −26.5 dBFS |
| drumroll | −11.8 dBFS | −37.5 dBFS |
| whoosh | −17.7 dBFS | −49.7 dBFS |

Applause stays dominant, the chime sits just under it, and the drumroll and
whoosh stay well back as support.

## Integration

`awards.js` already probes for this module — its `sfx()` helper returns
`window.GAIVS_SFX || null` and `cueApplause` / `cueSparkle` / `cueDrumroll` /
`cueWhoosh` delegate to it when present, falling back to the built-in audio
otherwise. So the only wiring needed is to load `sfx.js` ahead of `awards.js`.

`index.html` loads its scripts through `gate.js`, which appends everything in
its `data-scripts` list in order after unlock — so add `sfx.js` at the front of
that list. Line 142 of `index.html` becomes:

```html
<script src="gate.js?v=2" data-scripts="sfx.js?v=1,awards.js?v=24"></script>
```

(`sfx.js` doesn't touch `PROJECTS`, so a plain `<script src="sfx.js"></script>`
before that line works too — the `data-scripts` list is just the house style
here. Bump `awards.js`'s `?v=` when you edit it, so the change gets past caches.)

Once that is in place, all four cues pick up the new sounds automatically, and
the older `playApplause` / `playSparkle` functions inside `awards.js` become
dead fallback paths that can be removed whenever convenient.
