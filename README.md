# Voyagerscape

A visual practice's site: an art-directed, interactive homepage (`/`), an
interactive `/connect` experience with an original retro answer-machine
centrepiece, a physical navigation shell and a hidden `/` command terminal.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

## Stack

React 18 · TypeScript · Next.js 14 (App Router) · GSAP · Lenis · CSS Modules.
No UI framework, no icon library, no unused dependencies.

## Routes

`/` `/services` `/work` `/connect` `/store` (+ `/privacy`) are registered in
`lib/routes.ts` — the single registry the header nav, the terminal commands and
the mobile sheet read from.

**Header order is HOME · WORK · SERVICES · STORE.** `ROUTES` is ordered, and
`NAV_ROUTES` simply filters out `nav: false` entries, so the array order *is*
the nav order. Connect is such an entry: it keeps the `connect` terminal command
pointing at `/` without appearing as a pill. Home carries `match: ["/connect"]`,
so the HOME pill stays active on the alias too.

**The homepage is the Voyagerscape experience.** `app/page.tsx` renders
`components/Home/Home.tsx`; `/connect` is its own route and own implementation
(`components/ConnectPage.tsx`), and the connect composition
(`components/HomeConnect/**`) is still mounted there.

Only `/` and `/connect` are implemented; the others render `PlaceholderPage`.
Adding a real page means writing `app/<route>/page.tsx` and flipping
`ready: true`; the shell, terminal, cursor, visual modes and route transition
already apply.

## Homepage

Six chapters, one continuous passage, all inside the existing shell (header,
physical navigation, mobile menu, cursor, theme and footer are untouched):

| | chapter | what it does |
| --- | --- | --- |
| 01 | **Arrival** | `IMAGES BECOME WORLDS.` Letters answer the pointer (real weight change, zero reflow); the photograph develops out of an ordered dither; a pinned stage opens its clip-path from a portrait panel to full bleed and dissolves into paper. |
| 02 | **Identity** | `This is not only photography.` — ink arrives word by word with the scroll. Below it the six disciplines are one typographic index whose dominance follows the pointer, with a live preview showing each as a *treatment of the same image*. |
| 03 | **Visual world** | `A wall, not a feed.` An explicit overlapping grid, six depths from one variable, a second state per frame — and the signature mechanic: photographic fragments left behind the pointer. |
| 04 | **Made with light** | A pinned plate where the photograph is sampled into light, taken apart into data and form, and put back. The pointer is the light source. One 2D canvas. |
| 05 | **Photographs** | Three frames at three different weights, uncovered by scroll, each with a loupe: the only place the house grade lifts. |
| 06 | **Voyagerscape** | Stillness. A justified wordmark, three words, two ways onward. |

A single sticky **viewfinder** object reads the page — chapter, film counter
from the scroll, aperture and shutter from the pointer. It is sticky rather
than fixed because the shell translates on the X axis when the terminal or the
mobile menu opens, which reparents fixed descendants.

```
components/Home/
  Home.tsx            chapter registry, active-chapter observer, atmosphere handover
  data.ts             every frame and every string on the page
  lib/engine.ts       ONE scroll source + ONE pointer source + ONE ticker
  lib/dither.ts       ordered Bayer dither as 17 baked canvas patterns
  chapters/           Arrival · Identity · VisualWorld · LightLab · Photographs · Signoff
  fx/                 ProximityType · DustCursor · DnaPreview · ImageTrail · LightField
  objects/Viewfinder  the page's one art object
```

**Why an engine.** Eight components each with their own `requestAnimationFrame`
and scroll listener is how a page like this becomes an effects monster.
`lib/engine.ts` measures element geometry once (and on resize / document
resize), gates every scene behind an `IntersectionObserver`, runs on the same
`gsap.ticker` Lenis uses, writes only CSS variables and transforms, and
**removes itself from the ticker the moment nothing is moving**. Pointer field
geometry is read in one batched pass per frame, before any style is written, so
a frame costs a single layout flush.

**Performance.** No new dependencies. The frame's WebGL atmosphere (Pattern
Waves) is scoped to chapter 01 and is taken out of the compositor past it;
every later effect is one 2D canvas, paused offscreen, redrawn only when a
value actually changes. Images are plain `<img>` with intrinsic dimensions
reserved and `loading="lazy"` below the fold.

**Responsive.** Mobile is composed, not scaled: the hero becomes a vertical
narrative, the wall becomes a column of varying widths and alignments, hover
states become permanent, and the trail, dust and loupe are disabled on coarse
pointers. `prefers-reduced-motion` unpins every track and holds each
composition still.

The selection record — section → component → source library → why → what
changed — is in `docs/homepage-component-map.md`.

## Architecture

```
app/                 routes + metadata (RSC by default)
components/          AppShell, SiteHeader, NavMenu, BrandMark, CommandTerminal,
components/Home/     the homepage experience (see above)
components/HomeConnect/  the connect composition, rendered by /connect,
                     MessageCTA, RecorderPanel, AudioVisualizer, Directory,
                     CommandTerminal, CommandInput, Cursor, PageLoader,
                     RouteTransition, VisualModeProvider, SmoothScroll
components/primitives/  GlassControl, TechLabel, AnimatedText
lib/ui-store.tsx     reducer-backed UI state (terminal, visual mode, recording,
                     playback, mobile menu) — no prop drilling, no content state
lib/motion.ts        shared easings/durations, char splitting, reveals,
                     pointer tilt, glass specular, reduced-motion guard
lib/audio/recorder.ts MessageRecorder service + pluggable submit transport
lib/use-recorder.ts  React binding with guaranteed stream/rAF teardown
styles/globals.css   design tokens, liquid glass material, visual modes
```

## Liquid Glass

`.vs-glass` in `styles/globals.css` layers a translucent base, backdrop blur,
saturation and brightness sampling, a masked bright edge, an internal highlight,
a drop shadow, a sheen sheet that follows `--mx/--my` (written by
`attachGlassSpecular`) and a press compression. Variants: `--clear` for floating
controls over rich content, `--solid` for text surfaces (terminal, recorder),
`--dark`. A `@supports not (backdrop-filter)` fallback goes opaque.

The base radius is declared at zero specificity (`:where(.vs-glass)`) so
component modules always win regardless of stylesheet order.

## Command terminal

Press `/` anywhere outside a text field; `ESC` closes. Commands:
`home services work connect store` (navigate), `bw` / `negative` (global visual
mode via a filter on `<body>` plus a matching `<html>` canvas colour so there is
no light seam), `reset`, `close`, `help`. Unknown input returns
`E_UNKNOWN_CMD`. Visual mode is session-only state.

## Voice message

`MessageRecorder` wraps `MediaRecorder` + an `AnalyserNode` and exposes
`recordMessage · stopRecording · previewRecording · deleteRecording ·
submitRecording`. Streams, AudioContexts, object URLs and rAF loops are all
released on stop/unmount.

To attach a real backend, replace the transport — nothing else changes:

```ts
new MessageRecorder(async ({ blob, mimeType, durationMs }) => {
  const body = new FormData();
  body.append("clip", blob, `message.${mimeType.includes("mp4") ? "m4a" : "webm"}`);
  const res = await fetch("/api/messages", { method: "POST", body });
  return res.ok ? { ok: true, id: (await res.json()).id } : { ok: false };
});
```

The default transport is a mock that resolves after ~900 ms.

## Custom cursor

`components/Cursor.tsx` is mounted once in `AppShell`, so it survives every
route change (one instance, never duplicated). Its DOM nodes are always
rendered — they are never behind a conditional return, which was the original
failure: the mount effect ran while the refs were still null, so no listeners
were attached and the cursor sat frozen at 0,0 while `cursor: none` had already
hidden the native pointer.

- `position: fixed`, `z-index: 99999`, `pointer-events: none` on both layers.
- Position is driven purely by GSAP `quickTo` transforms — the dot at 0.05s,
  the ring at 0.2s — never React state per mousemove.
- `html.has-custom-cursor` is added only after the component mounts and sees a
  mouse; touch/pen input removes it again, and the rule is additionally gated
  behind `@media (hover: hover) and (pointer: fine)`.
- States: `default` (6px dot + 30px ring) → `link` (44px ring, dot shrinks) →
  `label` (62px ink disc with a contextual word). The device reports
  Record / Stop / Play / Listen from its live state; the CTA reports Open.
- Magnetism applies to `[data-magnetic]` only (nav pills, brand, terminal
  prompts and close, CTA), capped at 10px with a distance falloff and an
  elastic release.
- Hover state is re-evaluated on scroll via `elementFromPoint`, so the cursor
  never goes stale under a still pointer.
- All listeners, tweens and the html class are removed on unmount.

## Accessibility & motion

Semantic buttons/forms, skip link, visible focus rings, `aria-expanded` /
`aria-controls` / `aria-current`, polite live regions for device and recorder
status, an explicit microphone-permission explanation, and no information
behind hover alone. `prefers-reduced-motion` disables Lenis, the idle float,
the pointer parallax, the cord sway and the LED pulses, and shortens every
transition.

## Verified

Production build, no console errors, zero horizontal overflow and a single-fold
composition at 1440 · 1280 · 1024 · 834 · 768 · 430 · 390 · 375 · 360, plus
terminal, visual modes, keyboard paths, reduced motion and the full
record → preview → send flow under a fake media device. The cursor is verified
at 1440/1280/1024 for pixel-exact alignment (0px drift), correct state changes,
click pass-through, survival across route changes and being fully disabled on
touch.
