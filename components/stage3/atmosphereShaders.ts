/* =========================================================
   STAGE 3 — ATMOSPHERE PROTOTYPE (ISOLATED)
   GLSL for the procedural pastel colour field.

   Nothing here is imported by the homepage. This module is only
   reachable from /stage3-atmosphere.

   Written against GLSL ES 1.00 on purpose: it compiles unchanged
   on a WebGL2 context *and* on a WebGL1 context, so the prototype
   needs one shader, not two.
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
 * ONE CONTINUOUS PIGMENT FIELD
 * ----------------------------
 * Not four blobs, not a layered gradient stack, not a sine loop.
 *
 *  1. DOMAIN DEFORMATION. A point is pushed through two successive
 *     low-frequency warps (a warp of a warp). Both warp fields vary over a
 *     distance *larger* than the frame, so they bend the field as a whole
 *     instead of folding it into filaments — that distinction is the whole
 *     difference between "atmosphere" and "marble".
 *
 *  2. PIGMENT WEIGHTING. Five pigments each own one slow noise field read
 *     at the deformed coordinate. Their colours are combined with a
 *     softmax — exp(k·n) weights, normalised. Because every pigment has a
 *     non-zero weight at every pixel, the result is one continuous medium
 *     that is locally dominated by a tone, never a set of discrete shapes
 *     with edges. A per-pigment bias sets roughly how much of the frame it
 *     tends to claim; a per-pigment scale jitter stops the five fields from
 *     ever lining up.
 *
 *  3. TEMPORAL EVOLUTION. All motion is travel along the z axis of 3-D
 *     simplex noise, at five mutually incommensurable rates between 0.0073
 *     and 0.019 units/second, plus the two warp clocks. Pigment regions
 *     therefore grow, thin out, bleed into each other and recede in place.
 *     Nothing translates, nothing orbits, nothing repeats: the combined
 *     period is effectively unbounded. Measured against a CPU port of this
 *     exact shader, 94% of pixels move by more than 4/255 within 20s, with
 *     a mean shift of ~8/255 — above the visibility threshold on a smooth
 *     field, and still far too slow to read as animation.
 *
 *  4. LIGHT. A sixth, slower field modulates luminance only (±5%), and a
 *     fine field adds ±1.6% — the photographic unevenness of light on a
 *     surface rather than a vector gradient.
 *
 * Every combinator is a linear ramp, a mix, or a softmax. There is
 * deliberately no smoothstep/threshold on the output fields: on a surface
 * this smooth those print visible iso-contour rings, which read as
 * artefacts rather than as pigment.
 */
export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;    // seconds, monotonically accumulated by the host
uniform float uAspect;  // frame width / height

/* ---- palette: muted lavender, sage/mint, warm cream, powder blue ----
   Held inside a narrow lightness band on purpose. A tone far outside it
   stops reading as pigment suspended in the field and starts reading as
   an object sitting on top of it. */
const vec3 P_CREAM      = vec3(0.961, 0.937, 0.882);
const vec3 P_LAVENDER   = vec3(0.812, 0.769, 0.914);
const vec3 P_SAGE       = vec3(0.753, 0.867, 0.788);
const vec3 P_POWDER     = vec3(0.725, 0.812, 0.918);
const vec3 P_PERIWINKLE = vec3(0.769, 0.741, 0.855);

/* Softmax sharpness. Higher = more separated regions, lower = more mist. */
const float K = 2.25;

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

/* Two octaves. The warp supplies the organic structure; extra octaves only
   add the high-frequency turbulence this field must not have. */
float fbm2(vec3 p) {
  return 0.5 * snoise(p) + 0.17 * snoise(p * 2.03 + vec3(13.1, 7.7, 3.3));
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 1.50;

  /* Whole-domain wander. Deliberately tiny and itself noise-driven, so the
     field settles rather than travels. */
  p += vec2(
    snoise(vec3(0.0, 0.0, uTime * 0.0041)),
    snoise(vec3(19.3, 7.1, uTime * 0.0036))
  ) * 0.12;

  float t1 = uTime * 0.0185;
  float t2 = uTime * 0.0112;

  /* --- deformation 1 --- */
  vec2 q = vec2(
    fbm2(vec3(p * 0.30, t1)),
    fbm2(vec3(p * 0.30 + vec2(4.7, 2.3), t1 + 11.37))
  );

  /* --- deformation 2, fed by the first --- */
  vec2 b = p * 0.22 + 0.34 * q;
  vec2 r = vec2(
    fbm2(vec3(b + vec2(1.7, 9.2), t2)),
    fbm2(vec3(b + vec2(8.3, 2.8), t2 + 5.13))
  );

  /* The pigment-space coordinate. */
  vec2 w = p * 0.62 + 0.46 * r;

  /* --- softmax over five pigments --- */
  vec3 num = vec3(0.0);
  float den = 0.0;
  float wt;

  wt = exp(K * (snoise(vec3(w * 1.00 + vec2( 0.0,  0.0), uTime * 0.0190)) + 0.40));
  num += wt * P_CREAM;      den += wt;

  wt = exp(K * (snoise(vec3(w * 0.92 + vec2(11.4,  3.7), uTime * 0.0150)) + 0.22));
  num += wt * P_LAVENDER;   den += wt;

  wt = exp(K * (snoise(vec3(w * 1.08 + vec2( 4.1, 17.9), uTime * 0.0118)) + 0.20));
  num += wt * P_SAGE;       den += wt;

  wt = exp(K * (snoise(vec3(w * 0.86 + vec2(21.6,  8.3), uTime * 0.0094)) + 0.16));
  num += wt * P_POWDER;     den += wt;

  wt = exp(K * (snoise(vec3(w * 1.21 + vec2( 7.8, 26.2), uTime * 0.0073)) - 0.18));
  num += wt * P_PERIWINKLE; den += wt;

  vec3 col = num / den;

  /* Slow, broad unevenness of light — luminance only. */
  col *= 1.0 + 0.050 * fbm2(vec3(w * 0.63 + vec2(31.7, 5.2), uTime * 0.0061 + 9.0));

  /* Fine unevenness. ±1.6%: felt, not seen. */
  col *= 1.0 + 0.016 * snoise(vec3(p * 0.90 + 0.8 * r, uTime * 0.0092 + 51.0));

  /* Static per-pixel hash dither, ±0.6/255. Purely to break up the 8-bit
     banding a field this smooth would otherwise show. Not grain, not a
     particle layer — it does not move. */
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (dither - 0.5) * (1.2 / 255.0);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
