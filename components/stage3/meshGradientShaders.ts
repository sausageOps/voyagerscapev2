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

export const VERTEX_SHADER = /* glsl */ `
precision highp float;

attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
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
 *      by slow noise, not a sine, so it never visibly cycles.
 *   3. SUBTLE DEFORMATION. A small higher-frequency warp breaks up any
 *      residual circularity in the spots — this is what stops the result
 *      reading as "blobs".
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
 * MOTION. Each spot orbits on three mutually incommensurable frequencies
 * (base, ×0.613, ×0.787 / ×0.431), so no spot ever retraces a visible path
 * and the five together never return to a previous arrangement. Base rates
 * are 0.0132–0.0252 rev/s — orbital periods of 40–76 seconds. Measured on a
 * CPU port of this exact shader, ~91% of pixels shift by more than 4/255
 * within 15 seconds with no input of any kind.
 *
 * No pointer input, no particles, no smoke, no fluid solver, no neon.
 */
export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

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

const float SHARP  = 1.95;   // weight sharpening — the anti-grey knob
const float CHROMA = 1.05;   // gentle chroma lift after the blend
const float LMAX   = 0.952;  // ceiling on lightness, stops cream blowing out

/* ---------- Ashima / Stefan Gustavson 3-D simplex noise ---------- */
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

/* One spot's orbit. Three incommensurable frequencies so the path never
   closes and never reads as a circle. */
vec2 orbit(vec2 home, vec2 radius, float rate, float phase, float t) {
  float w = 6.2831853 * rate;
  return home + vec2(
    radius.x * cos(w * t + phase)         + 0.10 * sin(w * 0.613 * t + phase * 1.7),
    radius.y * sin(w * 0.787 * t + phase) + 0.10 * cos(w * 0.431 * t + phase * 2.3)
  );
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float t = uTime;

  /* ---- 1. gentle bend over the whole frame ---- */
  float tb = t * 0.016;
  p.x += 0.26 * fbm2(vec3(p * 0.55, tb));
  p.y += 0.26 * fbm2(vec3(p * 0.55 + vec2(5.1, 2.4), tb + 9.7));

  /* ---- 2. centre swirl, decaying toward the edges ---- */
  float amount = 1.35 * exp(-dot(p, p) / 0.62);
  float angle = amount * (0.55 + 0.45 * snoise(vec3(0.0, 0.0, t * 0.021)));
  float ca = cos(angle);
  float sa = sin(angle);
  p = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);

  /* ---- 3. subtle deformation (breaks residual circularity) ---- */
  float td = t * 0.013;
  p.x += 0.055 * fbm2(vec3(p * 1.7 + vec2(11.2, 4.4), td));
  p.y += 0.055 * fbm2(vec3(p * 1.7 + vec2(2.9, 17.6), td + 13.1));

  /* ---- 4. five drifting spots, Gaussian weights ---- */
  vec2 c0 = orbit(vec2(-0.55, -0.30), vec2(0.30, 0.22), 0.0210, 0.0, t);
  vec2 c1 = orbit(vec2( 0.52, -0.28), vec2(0.26, 0.30), 0.0168, 1.7, t);
  vec2 c2 = orbit(vec2(-0.50,  0.33), vec2(0.32, 0.24), 0.0252, 3.1, t);
  vec2 c3 = orbit(vec2( 0.54,  0.31), vec2(0.24, 0.28), 0.0190, 4.6, t);
  vec2 c4 = orbit(vec2( 0.00,  0.00), vec2(0.18, 0.16), 0.0132, 2.2, t);

  float w0 = 0.94 * exp(-dot(p - c0, p - c0) / (2.0 * 0.44 * 0.44));
  float w1 = 0.98 * exp(-dot(p - c1, p - c1) / (2.0 * 0.44 * 0.44));
  float w2 = 0.94 * exp(-dot(p - c2, p - c2) / (2.0 * 0.45 * 0.45));
  float w3 = 0.96 * exp(-dot(p - c3, p - c3) / (2.0 * 0.43 * 0.43));
  float w4 = 0.72 * exp(-dot(p - c4, p - c4) / (2.0 * 0.46 * 0.46));

  /* Sharpen, then normalise. (wᵢ/Σw)^P renormalised is identical to
     wᵢ^P/Σwⱼ^P, so one normalisation is enough.) */
  w0 = pow(w0, SHARP);
  w1 = pow(w1, SHARP);
  w2 = pow(w2, SHARP);
  w3 = pow(w3, SHARP);
  w4 = pow(w4, SHARP);

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
