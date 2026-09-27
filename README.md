# Voyagerscape — Connect

An interactive `/connect` experience: a warm ivory canvas, an original retro
answer-machine centrepiece, an Apple-Liquid-Glass-inspired control layer and a
hidden `/` command terminal.

```bash
npm install
npm run dev      # http://localhost:3000/connect
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

**The connect experience _is_ the homepage.** `app/page.tsx` and
`app/connect/page.tsx` both render the one implementation,
`components/HomeConnect/HomeConnect.tsx` — no duplicated markup, `/connect`
kept as an alias with a canonical link back to `/`. The nav keeps
SERVICES / WORK / CONNECT / STORE with no separate HOME item: the CONNECT route
declares `href: "/"`, and `isRouteActive()` reads the alias list so the pill
stays active on both paths. Terminal `home` and `connect` both land on `/`.

Only `/` is implemented; the others render `PlaceholderPage`. Adding a real page
means writing `app/<route>/page.tsx` and flipping `ready: true`; the shell,
terminal, cursor, visual modes and route transition already apply.

## Composition

The homepage follows an art-directed layout per range rather than one desktop
sheet with a mobile override:

- **Desktop (>1100px)** — the object is absolutely centred in the viewport and
  everything else is pinned around it: the statement upper-left, the message
  control upper-right, and the two information cards at the lower corners.
- **Tablet (768–1099px)** — the same idea relaxed into a column, cards side by
  side.
- **Mobile (<768px)** — a deliberate vertical narrative reordered with
  `order`: statement → object → information card → wide CTA → footer.

The statement is set as **word capsules** (`primitives/WordBlocks`), a data-driven
run shared with the footer statement — not every word is blocked, which is what
keeps the rhythm from looking mechanical. Type roles are explicit
(`--font-display` Space Grotesk, `--font-body` Inter Tight, `--font-mono`
JetBrains Mono) so mobile never falls back to a system face, and hero metrics are
tuned separately per range rather than scaled.

`SiteFooter` is mounted in `AppShell`, so every future route inherits it: a
secondary warm-grey band with a centred word-block statement and metadata
distributed left/centre/right, re-stacked and centred on mobile.

## The camera

The hero object is an original camera — Voyagerscape's observation unit — built
as layered SVG in `components/HomeConnect/Camera.tsx` (no Three.js, no bitmap).
One continuous moulded silhouette with an integrated prism hump, an ivory top
deck over a leatherette front, knurled mode dial, seated shutter, viewfinder and
tally lamp, an edge grip and a strap on a keeper.

**The object carries no typography of any kind** — no wordmark, model number or
label. State is communicated only through physical signals: the tally lamp
colour, four lit segments and a level bar on the readout, and a row of recessed
tick marks that advances with each shutter press. The bottom-left shell is
deliberately blank apart from two recessed screws.
The lens is the focal point: barrel, knurled focus ring, coated glass, iris,
aperture facets, two internal reflections and a rim light.

Pointer response is **layered**, which is what sells the depth — each element
has its own travel and settle time, driven by `gsap.quickTo`:

| layer | travel | settle |
| --- | --- | --- |
| shell (`--tilt-x/y/r`) | 10px / 7px / 0.9° | 0.9s |
| lens | +3.4px (further, same way) | 0.62s |
| specular | 13px, opposite | 0.38s |
| contact shadow | 5px, opposite | 1.25s |

A smoothstep proximity falloff means the object reacts near the pointer and
eases back to neutral once it leaves — it never tracks the cursor forever.
Parallax is gated behind `(pointer: fine)`, so touch keeps only the idle float.

Pressing it runs a shutter timeline — the button depresses, the shell drops 3px
and tilts 0.5°, the contact shadow compresses, the iris blinks and a flash ring
expands — then settles back. It advances the tick indicator and nothing else: it
never opens a gallery. If a recording is running it stops it; if a clip exists it previews it.
The status screen mirrors the recorder (`VS-01/STANDBY`, `REC/LISTENING`,
`PLAY/OUTPUT`, `WAIT/ENCODING`, `ERR/NO INPUT`) and the tally lamp colour
follows. Cursor labels come from the existing cursor contract: the body is
`data-cursor-label="Look"`, and the shutter group overrides it with `"Click"`.

## Architecture

```
app/                 routes + metadata (RSC by default)
components/          AppShell, SiteHeader, NavMenu, BrandMark, CommandTerminal,
components/HomeConnect/  HomeConnect (the home/connect composition), Camera,
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
