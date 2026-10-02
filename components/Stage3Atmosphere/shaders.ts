/**
 * Stage 3 atmosphere — shader sources.
 *
 * Pipeline (fragment):
 *   uv
 *   → pointer-bent domain (local, directional, no radial highlight)
 *   → three low-frequency fbm layers on independent time rates
 *   → two-stage domain warping (q, r) in the IQ sense
 *   → four pigment fields weighted by smooth, non-normalised masks
 *   → pigment-style mixing over a warm paper base
 *   → gentle large-scale luminance modulation + dither
 *
 * There is no sine translation of discrete blobs anywhere; every shape in
 * frame is a level set of the warped noise field, so the whole field
 * deforms rather than a handful of sprites sliding around.
 */

export const VERTEX_SHADER = `#version 100
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 100
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;          // already time-scaled on the CPU
uniform vec2 uPointer;        // aspect-corrected, -1..1-ish, smoothed
uniform vec2 uPointerVel;     // smoothed velocity
uniform float uPointerAmount; // 0..1 influence envelope
uniform float uStrength;

uniform vec3 uBase;
uniform vec3 uLavender;
uniform vec3 uSage;
uniform vec3 uPowder;
uniform vec3 uCream;
uniform vec3 uInk;

// ---------------------------------------------------------------- noise ----
// Gradient noise (IQ). Cheap, smooth, no texture lookups, no visible lattice
// at the low frequencies we use here.
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y);
}

// Three octaves: this is an atmosphere, not terrain. More octaves only adds
// thin filaments, which read as smoke rather than pigment.
float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  mat2 rot = mat2(0.86, 0.51, -0.51, 0.86);
  for (int i = 0; i < 3; i++) {
    s += a * gnoise(p);
    p = rot * p * 2.03;
    a *= 0.5;
  }
  return s;
}

// ------------------------------------------------------- pointer bending ----
// The pointer does not light anything. It displaces the sampling domain along
// its own travel direction, with a wide anisotropic falloff, so colour
// boundaries near the cursor stretch and lean instead of glowing.
vec2 bendDomain(vec2 p) {
  vec2 d = p - uPointer;
  float falloff = exp(-dot(d, d) * 2.4);
  float speed = length(uPointerVel);
  vec2 dir = speed > 0.0001 ? uPointerVel / speed : vec2(0.0);

  // Shear along travel direction + a slow swirl, so the disturbance is never
  // a circular region sliding under the cursor.
  vec2 shear = dir * falloff * (0.30 + min(speed, 2.0) * 0.20);
  vec2 swirl = vec2(-d.y, d.x) * falloff * 0.24;

  return p - (shear + swirl) * uPointerAmount * uStrength;
}

// -------------------------------------------------------------- regions ----
// A pigment region is a broad level set measured in WARPED space. Its anchor
// drifts on its own slow, incommensurate rates, but the anchor is never what
// you see: the visible boundary is the warp field, so the whole canvas
// deforms instead of a disc translating.
float pigmentRegion(
  vec2 w, vec2 anchor, float radius, float freq, vec2 offset, float rate, vec4 drift
) {
  float t = uTime;
  vec2 c = anchor + vec2(
    0.30 * sin(t * drift.x + drift.z) + 0.22 * cos(t * drift.y * 0.7),
    0.26 * cos(t * drift.y + drift.w) + 0.18 * sin(t * drift.x * 0.8)
  );
  vec2 d = (w - c) * vec2(1.0, 1.12);
  float dist = length(d);
  float n = fbm(w * freq + offset + vec2(t * rate, -t * rate * 0.8));
  // Written as an explicit inverse ramp: smoothstep with edge0 > edge1 is
  // undefined in the GLSL spec, even though most drivers tolerate it.
  return 1.0 - smoothstep(radius * 0.18, radius, dist + n * 0.62);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p = bendDomain(p);

  float t = uTime;

  // Stage 1 warp — broad, three incommensurate drift rates so nothing
  // re-synchronises on a short cycle.
  vec2 q = vec2(
    fbm(p * 0.90 + vec2(t * 0.09, -t * 0.06)),
    fbm(p * 0.90 + vec2(4.7 - t * 0.07, 2.3 + t * 0.11))
  );

  // Stage 2 warp — driven by stage 1, on yet another set of rates.
  vec2 r = vec2(
    fbm(p * 1.15 + 2.6 * q + vec2(1.7 + t * 0.045, 9.2 + t * 0.031)),
    fbm(p * 1.15 + 2.6 * q + vec2(8.3 - t * 0.037, 2.8 + t * 0.055))
  );

  vec2 w = p + 1.9 * r + 0.8 * q;

  float mLav = pigmentRegion(w, vec2(-0.55,  0.30), 1.15, 0.80, vec2( 0.0,  1.4), 0.030, vec4(0.021, 0.017, 0.0, 1.1));
  float mSag = pigmentRegion(w, vec2( 0.60, -0.32), 1.10, 0.90, vec2( 5.1, -3.2), 0.024, vec4(0.015, 0.026, 2.0, 0.4));
  float mPow = pigmentRegion(w, vec2( 0.45,  0.42), 0.95, 0.70, vec2(-2.8,  6.4), 0.019, vec4(0.027, 0.013, 4.2, 3.0));
  float mCre = pigmentRegion(w, vec2(-0.50, -0.45), 1.25, 1.00, vec2( 9.6,  4.9), 0.034, vec4(0.012, 0.022, 1.3, 5.2));

  // Layered like paint on paper. A normalised weighted sum would collapse
  // everything to the mean grey; layering keeps the regions legible.
  vec3 col = uBase;
  col = mix(col, uCream,    mCre * 0.80);
  col = mix(col, uSage,     mSag * 0.72);
  col = mix(col, uPowder,   mPow * 0.70);
  col = mix(col, uLavender, mLav * 0.74);

  // Very low-frequency density: seats some areas deeper. Field-driven, so it
  // is never a vignette.
  float depth = fbm(w * 0.40 + vec2(-4.2 + t * 0.013, 7.1 + t * 0.023));
  col = mix(col, uInk, smoothstep(0.05, 0.70, depth) * 0.20);

  // Large-scale luminance modulation — the photographic part.
  float lum = fbm(w * 0.30 + vec2(11.0 - t * 0.016, -6.0 + t * 0.011));
  col *= 1.0 + lum * 0.14;

  // Dither — these gradients are flat enough to band on 8-bit displays.
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.012;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
