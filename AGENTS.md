# VOYAGERSCAPE — PROJECT RULES

## TYPOGRAPHY LOCK: APPROVED THREE-FAMILY SYSTEM

The site uses exactly three font families, one role each. The owner approved this system and it is the only permitted typography.

Geist Pixel Square
→ Brand and display: wordmark and navigation branding, page headings and titles, footer identity statement, loader typography, route-transition titles, display menu headings, deliberate brand moments. Token: `--font-display`. Weight 400 only.

Inter Tight
→ Body and readable prose: paragraphs, descriptions, page notes, long-form content, informational pages, proportional interface text. Token: `--font-body`. Weight 400 only.

JetBrains Mono
→ Technical UI: command terminal and input, CRT and canvas readouts, metadata, counters, technical labels, footer metadata, technical CTAs, skip links. Tokens: `--font-mono` and the runtime variable `--font-mono-tech`. Weights 400 and 500.

Rules:

- Do not add, replace or introduce any other font family, Google Fonts, external font services, or similar substitute fonts.
- Do not add a font file or weight unless live typography demonstrably needs it. Do not synthesise bold or italic for these families. Geist Pixel Square has one weight, so display rules request 400.
- Each family is declared once, in `app/layout.tsx`, through `next/font/local`, and exposed as `--font-display-face`, `--font-body-face` and `--font-mono-tech`. Components use the role tokens in `styles/globals.css`; they do not load fonts of their own.
- System fallbacks in the role tokens cover only glyphs or scripts the family does not carry, such as the multilingual greeting. They are not a substitute for the family.
- Pixelify Sans and Handjet are retired. Do not reintroduce them, their files, or their declarations.
- Licences: each family is SIL OFL 1.1. Keep `public/fonts/<family>/OFL.txt` and the attributions in `THIRD_PARTY_NOTICES.md` up to date with any font file change.
- Any change to these roles, families, weights or font files needs explicit owner approval.

Any future task involving visual design must preserve this typography unless the user explicitly asks to change the typography.

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
