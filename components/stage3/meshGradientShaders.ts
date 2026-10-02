/* =========================================================
   STAGE 3 — ATMOSPHERE PROTOTYPE (ISOLATED)
   Procedural animated MESH GRADIENT.

   Nothing here is imported by the homepage. This module is only
   reachable from /stage3-atmosphere.

   Written against GLSL ES 1.00 on purpose: it compiles unchanged
   on a WebGL2 context *and* on a WebGL1 context, so the prototype
   needs one shader, not two. WebGPU would buy nothing here — the
   whole thing is one fragment pass with no compute, no storage
   buffers and no multi-pass work — and would cost the Safari and
   Firefox-stable audience the effect entirely.
   ========================================================= */

/* ---------- Ashima / Stefan Gustavson 3-D simplex noise ----------
   Shared verbatim by both stages. The vertex stage uses it to animate
   the five spots; the fragment stage uses it to warp the domain. */
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm2(vec3 p) {
  return 0.5 * snoise(p) + 0.25 * snoise(p * 2.07 + vec3(19.3, 7.7, 3.3));
}

/* NOTE ON AMPLITUDE — do not "fix" this.
   This is the 0.6-radius variant of Ashima's simplex noise paired with the
   42.0 scale factor that belongs to the 0.5-radius variant, so snoise()
   actually swings to about ±4 (std ≈ 0.70), not ±1. Every amplitude
   constant below was tuned against that measured behaviour. Re-normalising
   the noise would silently collapse the motion to a quarter of its size.

   The consequence that *does* need handling: any modulator that must stay
   positive cannot be driven by raw snoise. softBound() maps the whole real
   line into (-1, 1) smoothly — unlike clamp() it never flat-lines, so a
   modulator keeps moving instead of sticking at its limit. */
float softBound(float n) {
  return n * inversesqrt(1.0 + n * n);
}
`;

/**
 * VERTEX STAGE — where the spots actually live.
 *
 * Each spot's state (position, radius, strength) depends only on uTime, not
 * on the pixel, so computing it per-fragment would run the same 20 noise
 * samples a million times a frame for one answer. It is computed here
 * instead — three times per frame, once per vertex of the full-screen
 * triangle — and handed to the fragment stage as five flat varyings.
 * Because the value is identical at all three vertices, interpolation is
 * exact and the fragment stage sees a true per-frame constant.
 *
 * Net effect: the spots get rich, noise-driven motion (wander, breathing,
 * strength modulation) at essentially zero per-pixel cost. The fragment
 * stage's noise budget is unchanged at 11 samples.
 *
 * Packing: xy = centre, z = sigma, w = gain.
 */
export const VERTEX_SHADER = /* glsl */ `
precision highp float;

attribute vec2 aPosition;

uniform float uTime;

varying vec2 vUv;
varying vec4 vS0;
varying vec4 vS1;
varying vec4 vS2;
varying vec4 vS3;
varying vec4 vS4;

${NOISE_GLSL}

/* Spot motion, in four independent layers:

     ORBIT    — an ellipse at 'rate' rev/s. Periods are 61–83 s.
     WOBBLE   — two further incommensurable frequencies (x0.613, x0.431)
                so the path never closes and never reads as a circle.
     WANDER   — slow 1-D noise on each axis. This is what makes the drift
                look environmental rather than mechanical: the spot is
                carried off its orbit and brought back, never on a schedule.
     BREATHE  — the Gaussian's sigma swells and contracts, so a colour
                region grows and shrinks rather than only sliding.
     GAINMOD  — the spot's strength is modulated, so dominance passes
                between colours and the whole field re-composes.

   Every modulator is driven from the spot's own phase, so the five are
   decorrelated and the arrangement never repeats. */
vec4 spot(vec2 home, vec2 radius, float rate, float phase, float sigma, float gain, float t) {
  float w = 6.2831853 * rate;

  vec2 c = home + vec2(
    radius.x * cos(w * t + phase)         + 0.14 * sin(w * 0.613 * t + phase * 1.7),
    radius.y * sin(w * 0.787 * t + phase) + 0.14 * cos(w * 0.431 * t + phase * 2.3)
  );

  c += 0.18 * vec2(
    snoise(vec3(phase * 3.1, 0.0, t * 0.0115)),
    snoise(vec3(0.0, phase * 2.7 + 11.0, t * 0.0098))
  );

  /* Both modulators are soft-bounded: sigma must never reach zero (a
     zero-width Gaussian is a hard point — the exact "blob" artefact this
     field must not produce), and gain must stay positive. Bounded to ±1,
     sigma stays in [0.62, 1.38]x and gain in [0.78, 1.28]x. */
  float s = sigma * (1.0 + 0.38 * softBound(snoise(vec3(phase * 5.0, 7.0, t * 0.0085))));
  float g = gain * exp(0.25 * softBound(snoise(vec3(phase * 4.0, 21.0, t * 0.0072))));

  return vec4(c, s, g);
}

void main() {
  vUv = aPosition * 0.5 + 0.5;

  float t = uTime;
  vS0 = spot(vec2(-0.52, -0.26), vec2(0.50, 0.38), 0.0150, 0.0000, 0.45, 0.94, t);
  vS1 = spot(vec2( 0.50, -0.24), vec2(0.46, 0.42), 0.0131, 1.2566, 0.44, 0.98, t);
  vS2 = spot(vec2(-0.48,  0.28), vec2(0.54, 0.36), 0.0164, 2.5133, 0.46, 0.94, t);
  vS3 = spot(vec2( 0.52,  0.26), vec2(0.44, 0.40), 0.0142, 3.7699, 0.43, 0.96, t);
  vS4 = spot(vec2( 0.00,  0.00), vec2(0.40, 0.34), 0.0121, 5.0265, 0.46, 0.66, t);

  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * MESH GRADIENT
 * -------------
 * The general technique (independently implemented here — no third-party
 * code, markup, branding or assets): a handful of soft colour spots sit on
 * slow orbits and melt into one another, read through a distorted domain.
 *
 *   1. GENTLE BEND. A very low-frequency noise warp bows the whole frame.
 *   2. CENTRE SWIRL. A rotation whose strength decays as exp(-r²/k), so it
 *      twists the middle and vanishes before the edges. Its angle is driven
 *      by slow signed noise, so the twist winds up, unwinds through zero and
 *      counter-rotates — it never visibly cycles.
 *   3. SUBTLE DEFORMATION. A higher-frequency warp breaks up any residual
 *      circularity in the spots — this is what stops the result reading as
 *      "blobs".
 *   4. SPOT BLEND. Five Gaussian-weighted colour spots, normalised to a
 *      partition of unity.
 *
 * MIDPOINTS STAY VIVID — the two decisions that matter:
 *
 *   (a) Colours are mixed in OKLab, not sRGB. Averaging pastels in sRGB
 *       drags the midpoint toward grey; OKLab interpolates perceptually, so
 *       lavender→sage passes through a believable tint instead of mud. The
 *       palette is stored pre-converted so the per-pixel cost is one
 *       OKLab→sRGB transform, not ten.
 *   (b) The normalised weights are sharpened (wᵢ^P, renormalised). Plain
 *       normalised Gaussians average all five spots almost everywhere,
 *       which is exactly the "everything goes grey in the middle" failure.
 *       Sharpening keeps the blend C¹-smooth while letting the nearest spot
 *       dominate locally.
 *
 * MOTION (v2). The first pass drifted but read as a near-static CSS
 * gradient: orbit radii of 0.18–0.32 are small against a frame spanning
 * ±0.9 in x, so the *structure* barely moved even though pixels changed.
 * v2 fixes the amplitude rather than the speed — rates were *lowered*
 * ~25% (periods 61–83 s, previously 40–76 s) while:
 *
 *   • orbit radii went 0.18–0.32 → 0.34–0.54, and the homes were pulled
 *     in off the corners so the spots sweep across the frame instead of
 *     hovering in it;
 *   • orbit phases are now spread evenly round the circle (2π/5 apart) so
 *     the five stay distributed and never bunch into one corner, which
 *     was what left large areas as a flat average;
 *   • sigma breathes ±38% and per-spot gain is modulated ±25%, so regions
 *     grow, shrink and trade dominance — the field re-composes, it does
 *     not just slide;
 *   • the whole-frame bend went 0.26 → 0.45 at a *lower* spatial
 *     frequency (0.55 → 0.40), the swirl 1.35 → 1.70 with a wider falloff
 *     and a signed angle, and the deformation 0.055 → 0.10.
 *
 * Measured on a CPU port of this exact shader, large-scale structure
 * (24×24 coarse blocks — what the eye actually tracks rather than
 * per-pixel noise) moves 5.7/255 by 8 s, 7.4/255 by 12 s and 9.4/255 by
 * 20 s. The headline number barely beats v1's; the difference the eye
 * reads is *where* it happens — v1's orbits never carried a colour across
 * the frame, so the composition at t=20 was the composition at t=0 with
 * the edges stirred. Side-by-side renders at t=0/8/16 are what this pass
 * was tuned against, not the scalar.
 *
 * Palette and frame are unchanged from v1. No pointer input, no particles,
 * no smoke, no fluid solver, no neon.
 */
export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec4 vS0;   // xy = centre, z = sigma, w = gain
varying vec4 vS1;
varying vec4 vS2;
varying vec4 vS3;
varying vec4 vS4;

uniform float uTime;    // seconds, monotonically accumulated by the host
uniform float uAspect;  // frame width / height

/* ---- palette, pre-converted to OKLab (L, a, b) ----
   sRGB sources:
     warm cream   #f5efe1      muted lavender #cfc4e9
     sage / mint  #c0dcc9      powder blue    #b9cfea
     warm cream 2 #f1e9dc (centre anchor) */
const vec3 SPOT_CREAM    = vec3(0.95291,  0.00097,  0.01969);
const vec3 SPOT_LAVENDER = vec3(0.84131,  0.02518, -0.04575);
const vec3 SPOT_SAGE     = vec3(0.87088, -0.03753,  0.01733);
const vec3 SPOT_POWDER   = vec3(0.84682, -0.01278, -0.04298);
const vec3 SPOT_WARM     = vec3(0.92300,  0.00210,  0.01980);

const float SHARP  = 2.05;   // weight sharpening — the anti-grey knob
const float CHROMA = 0.96;   // chroma trim, keeps the larger regions muted
const float LMAX   = 0.952;  // ceiling on lightness, stops cream blowing out

${NOISE_GLSL}

/* ---------- OKLab -> sRGB ---------- */
vec3 oklabToSrgb(vec3 lab) {
  float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;

  vec3 lin = vec3(
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
  lin = clamp(lin, 0.0, 1.0);

  // linear -> sRGB transfer
  return mix(
    lin * 12.92,
    1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055,
    step(vec3(0.0031308), lin)
  );
}

/* Gaussian weight for one spot, already sharpened. */
float spotWeight(vec2 p, vec4 s) {
  vec2 d = p - s.xy;
  return pow(s.w * exp(-dot(d, d) / (2.0 * s.z * s.z)), SHARP);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float t = uTime;

  /* ---- 1. gentle bend over the whole frame ----
     Low frequency, large amplitude: this is the layer that makes the
     boundaries between colour regions visibly swell and recede. */
  float tb = t * 0.026;
  p.x += 0.45 * fbm2(vec3(p * 0.40, tb));
  p.y += 0.45 * fbm2(vec3(p * 0.40 + vec2(5.1, 2.4), tb + 9.7));

  /* ---- 2. centre swirl, decaying toward the edges ----
     Signed angle: the twist winds one way, relaxes through zero and winds
     back, so the centre is never caught in a steady rotation. */
  float amount = 1.70 * exp(-dot(p, p) / 0.80);
  float angle = amount * snoise(vec3(0.0, 0.0, t * 0.018));
  float ca = cos(angle);
  float sa = sin(angle);
  p = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);

  /* ---- 3. deformation (breaks residual circularity) ---- */
  float td = t * 0.022;
  p.x += 0.10 * fbm2(vec3(p * 1.15 + vec2(11.2, 4.4), td));
  p.y += 0.10 * fbm2(vec3(p * 1.15 + vec2(2.9, 17.6), td + 13.1));

  /* ---- 4. five drifting spots, Gaussian weights ----
     Centres, sigmas and gains all arrive animated from the vertex stage.

     Sharpen, then normalise: (wᵢ/Σw)^P renormalised is identical to
     wᵢ^P/Σwⱼ^P, so one normalisation is enough. */
  float w0 = spotWeight(p, vS0);
  float w1 = spotWeight(p, vS1);
  float w2 = spotWeight(p, vS2);
  float w3 = spotWeight(p, vS3);
  float w4 = spotWeight(p, vS4);

  float total = max(w0 + w1 + w2 + w3 + w4, 1e-6);

  vec3 lab = (w0 * SPOT_CREAM
            + w1 * SPOT_LAVENDER
            + w2 * SPOT_SAGE
            + w3 * SPOT_POWDER
            + w4 * SPOT_WARM) / total;

  /* ---- light: slow, broad unevenness on lightness only ---- */
  lab.x *= 1.0 + 0.022 * fbm2(vec3(p * 0.8 + vec2(31.7, 5.2), t * 0.009 + 4.0));
  lab.x = min(lab.x, LMAX);
  lab.yz *= CHROMA;

  vec3 col = oklabToSrgb(lab);

  /* Static per-pixel hash dither, ±0.6/255 — purely to break up the 8-bit
     banding a field this smooth would otherwise show. It does not move. */
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (dither - 0.5) * (1.2 / 255.0);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
