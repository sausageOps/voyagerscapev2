# Homepage — component selection record

Every interaction on `/` was chosen from the supplied libraries before it was
built, then re-authored to Voyagerscape's constraints. This is the record the
brief asks for: **section → component → source → why → what changed**.

Two constraints shaped nearly every "what changed" line:

1. **No new dependencies.** The repo ships GSAP, Lenis, OGL and Three; most of
   the source components are written against `motion/react` (Framer Motion) or
   `three`-based shader stacks. Where a component's *idea* was right and its
   *implementation* was a dependency, the idea was re-authored on GSAP + CSS
   variables + one 2D canvas.
2. **One WebGL context.** The frame's atmosphere (React Bits *Pattern Waves*,
   already approved) owns the only WebGL surface, and it is now scoped to the
   first chapter. Every later effect is a 2D canvas or pure CSS.

---

## 01 — ARRIVAL

| | |
|---|---|
| **Hero typography** | React Bits — *Variable Proximity* / *Text Pressure* |
| why | Per-letter proximity is the only cursor-driven type behaviour that stays premium and readable; the headline leans toward the reader instead of performing. |
| changed | The originals interpolate variable-font axes. The display face is locked to **Pixelify Sans**, which ships as three *static* cuts — no `wght` axis, and synthetic bolding destroys a pixel grid. So the axis blend became (a) a genuinely heavier 600 cut cross-fading over the 400 cut, absolutely positioned so weight can change with **zero reflow**, and (b) continuous scale / lift / lateral pressure. `motion/react` dropped; the falloff runs on the page's shared engine. |
| file | `components/Home/fx/ProximityType.tsx` |

| | |
|---|---|
| **Hero image** | React Bits — *Pixel Transition* + Cult UI — *Hero Dithering* |
| why | The image had to behave like a material: it *develops* out of paper rather than fading in, and its crop breathes with the pointer. No `scale(1.05)` hover anywhere on the page. |
| changed | Ordered 4×4 Bayer dithering, but the 17 possible coverage states are baked into 17 tiny tiles once and used as canvas patterns — a redraw is a single `fillRect` instead of tens of thousands. The same surface is reused for the chapter's exit dissolve. |
| file | `components/Home/lib/dither.ts` |

| | |
|---|---|
| **Cursor** | React Bits — *Pixel Trail* / *Ghost Cursor* |
| why | Light, film, dust — and pixels are already the page's material (dither, pixel display face), so the cursor speaks the same language rather than adding one. |
| changed | 2D canvas instead of a WebGL grid; ≤ 60 live specks of 1–3px at ≤ 0.3 alpha, so it can never fight the headline for contrast. The **shell's own cursor is untouched** — this sits behind it and only inside the hero. |
| file | `components/Home/fx/DustCursor.tsx` |

| | |
|---|---|
| **Chapter handover** | Aceternity — *Container Scroll Animation* / *Sticky Scroll Reveal* |
| why | The hero must not fade away. It is pinned, the typography lifts behind the photograph, and the photograph's mask opens from a portrait panel to full bleed and then dissolves into paper — the next chapter's ground. |
| changed | `clip-path: inset()` driven by one CSS variable written once per frame, instead of a component that mounts its own scroll listener per element. |

---

## 02 — IDENTITY

| | |
|---|---|
| **Statement** | Magic UI — *Text Reveal* / React Bits — *Scroll Reveal* |
| why | "This is not only photography." should arrive at reading speed — the reader's own scroll supplies the ink. |
| changed | Word density is a CSS variable (`color-mix`) written by the shared engine; no per-word observers, no motion library. |

| | |
|---|---|
| **Creative DNA index** | React Bits — *Variable Proximity* (dominance) + 21st.dev community — hover-preview cards |
| why | The brief describes a typographic field *and* an interactive index. Those are the same six words, so they became **one** list: a typographic field that happens to be navigable. Two blocks saying PHOTOGRAPHY · ART · MOTION · DESIGN · CODE · EXPERIMENT twice would have been decoration. |
| changed | Dominance is continuous (distance to pointer), not binary hover, so the hierarchy is something the visitor holds. Touch and keyboard get the same thing through scroll position and focus — the preview is never hover-only. |
| files | `components/Home/chapters/Identity.tsx`, `components/Home/fx/DnaPreview.tsx` |

| | |
|---|---|
| **Previews** | Animata — *Disclose Image* / *Images Reveal*; React Bits — *Pixel Transition* |
| why | Each discipline is shown as *a treatment of the same medium* — photograph, abstraction, sequence, composition, sampled data, distortion — which is the chapter's argument. |
| changed | One frame, six clipped layers; only the active one animates. The CODE state is a real 72px sample of the photograph, posterised and drawn back at `image-rendering: pixelated` — computed once, ever. |

---

## 03 — VISUAL WORLD

| | |
|---|---|
| **Composition** | Velora — *Parallax Grid*; 21st.dev — scroll choreography |
| why | "A wall, not a feed." Frames are *placed* on an explicit 12-column grid with overlapping row spans, each at its own depth, so the wall separates as you pass it. |
| changed | Six depths are driven by **one** variable (`--par`) written once per frame; no per-figure scroll listeners. Mobile re-composes into a deliberate column with varying widths and alignments — not a shrunk grid. |

| | |
|---|---|
| **Signature mechanic** | React Bits — *Image Trail* (after Codrops) |
| why | The one memorable interaction. Fragments of photographs left behind the pointer *is* the subject — images as memory — and it exists only inside the wall. |
| changed | Smaller (160px), spaced further apart (130px threshold), seven live fragments maximum, graded to the palette, and each fragment develops through a clip-path wipe instead of popping. Runs on GSAP (already in the stack) and is disabled on coarse pointers and reduced motion. |
| file | `components/Home/fx/ImageTrail.tsx` |

---

## 04 — MADE WITH LIGHT  (and the code identity)

| | |
|---|---|
| **Light field** | React Bits — *Dither* / *Dot Grid* / *Pixel Blast*; Cult UI — *Hero Dithering*; Aceternity — *Dither Shader* |
| why | The chapter has to *be* the argument. One surface samples a photograph into light, takes it apart into data and form, and puts it back — pointer as the light source, scroll as the sequence. §14 and §15 of the brief are the same object here on purpose: two separate experiments would have said the same thing twice. |
| changed | Every candidate is a WebGL fragment shader. This is a single 2D context: the photograph is sampled **once per grid resolution** into a luminance array, and a frame is a few thousand rects, arcs or mono glyphs. It holds the palette exactly (ink on paper, never a rainbow), pauses offscreen, and is perfectly still with no input. |
| file | `components/Home/fx/LightField.tsx` |

---

## 05 — PHOTOGRAPHS

| | |
|---|---|
| **Reveal** | Aceternity — *Hero Parallax*; Animata — *Images Reveal* |
| why | The payoff is slowness: each frame is uncovered by a clip-path wipe tied to its own position in the scroll, and its image travels through depth behind the frame. |
| changed | Three deliberately different weights (wide / small and offset / centred) rather than a repeated card. |

| | |
|---|---|
| **Second state** | Aceternity — *Lens* |
| why | "Inspecting an artwork." Hovering magnifies exactly where the pointer is, at full tonal contrast — the only place on the page where the house grade lifts, which is the point. |
| changed | Pure CSS magnification positioned against the *image box* (not the figure, whose box differs per composition), with the frame's pixel size supplied as a variable. Captions are permanent editorial information, never a hover reward. |

---

## 06 — VOYAGERSCAPE

Nothing from any library. After six chapters of response, the page stops
responding: a justified wordmark that drifts a couple of per cent with the
scroll, three words, one line, two ways onward. Stillness only reads as
stillness after motion.

---

## The art object

| | |
|---|---|
| **Viewfinder** | Cult UI — *Dynamic Island* + Animata micro widgets |
| why | §18 asks for a small art object and §19 for a chapter-aware morphing status element. Two floating objects is clutter, so this is one: a dial that reads the page — chapter name, film counter from the scroll, aperture and shutter from the pointer. It is instrumentation; it never replaces navigation. |
| changed | Built in the house material (`.vs-glass`), with the site's own rolling-word window for state changes. **Sticky, not fixed** — the app shell translates on the X axis when the terminal or mobile menu opens, which would reparent any fixed descendant. |
| file | `components/Home/objects/Viewfinder.tsx` |

---

## Deliberately not used

*Splash Cursor, Liquid Chrome, Laser Flow, Electric Border, Metaballs, Star
Border, Canvas Reveal, Background Ripple, Tracing Beam, Animated Beam, Card
Swap, Chroma Grid, Bento, Stacked Sections, Apple Cards Carousel, Spotlight
Card, Shape Blur, Click Spark, Magnet, Noise overlays.*

Each was considered and rejected for the same reason: it would have added a
second idea to a chapter that already had one, or it would have advertised
technology instead of using it. The page runs **one** signature mechanic per
chapter.

## Licensing

All sources used are free and source-available: React Bits (MIT + Commons
Clause), Aceternity UI, Magic UI, Animata, Cult UI, Motion Primitives and
Codrops demos (MIT / copy-paste). Nothing Pro, paid or closed-source was used,
and no component was installed as a package — every adaptation is original code
in `components/Home/**` written against the dependencies the project already
had.
