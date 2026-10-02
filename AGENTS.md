# VOYAGERSCAPE — PROJECT RULES

## TYPOGRAPHY LOCK

The current typography is part of the approved Voyagerscape foundation.

DO NOT modify, replace, remove, rename, or regenerate:

- Pixelify Sans

- Inter Tight

- JetBrains Mono

DO NOT modify:

- /public/fonts/

- app/layout.tsx font-loading configuration

- typography tokens in styles/globals.css

Do not introduce a replacement font.

Do not add Google Fonts.

Do not use a similar substitute font.

The following font families and roles are fixed:

Pixelify Sans

→ Display / hero typography

Inter Tight

→ Body / general UI text

JetBrains Mono

→ Technical / navigation / labels / terminal typography

Any future task involving visual design must preserve the existing typography unless the user explicitly asks to change the typography.

## SCOPE RULE

When the user asks for a specific visual modification:

1. Modify only the requested area.

2. Do not redesign unrelated components.

3. Do not change global typography.

4. Do not change navigation, footer, camera, colors, or spacing unless explicitly requested.

5. Do not install new dependencies unless explicitly requested.

The current localhost homepage is the visual baseline.

## GLASS SYSTEM LOCK — NO AUTOMATIC BORDERS OR SHADOWS

Glass in Voyagerscape means exactly:

TRANSLUCENT SURFACE + OPTIONAL BACKDROP BLUR

It does **not** mean border, box-shadow, inset shadow, outline, gradient
edge, glow, or a decorative pseudo-element edge.

The canonical glass treatment is the shared `.vs-glass` class in
`styles/globals.css` (variants: `--clear`, `--solid`, `--dark`, `--blur`).
It guarantees `border: none` and `box-shadow: none` in the rest state and
in `:hover`, `:focus` and `:active`. Keyboard focus uses the sanctioned
transient `:focus-visible` outline with `outline-offset` — never a
permanent decorative border.

Rules for any future glass pill / chip / card / button / nav surface:

1. Compose `.vs-glass` (or `<GlassControl>`); do not re-invent the material.
2. Never add a border, shadow, inset highlight, glow or edge pseudo-element
   to a shared glass class, utility, token or variant.
3. A single component may declare `border` / `box-shadow` only when that
   specific component has an explicit design reason for it — it must never
   come from the glass system.
4. Opt into blur per surface with `--glass-blur` or `.vs-glass--blur`.
5. Do not globally disable borders/shadows on non-glass elements; CRT
   geometry, lighting, physical shadows and reflections are out of scope.
