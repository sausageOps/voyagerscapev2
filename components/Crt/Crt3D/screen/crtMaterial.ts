import * as THREE from "three";
import { SCREEN } from "../proportions";

/**
 * CRT DISPLAY SHADER
 * ==================
 *
 * The treatment applied to the phosphor canvas before it reaches the glass.
 *
 * The governing constraint is in the brief and it is the hard one: this has
 * to read as CRT HARDWARE, not as a retro filter. The difference is almost
 * entirely restraint plus the right frequencies:
 *
 *  - Scanlines are subtle (18% depth) and, critically, they FADE OUT when
 *    the screen is rendered too small for them to resolve. A scanline
 *    pattern sampled below its Nyquist limit does not look like a CRT, it
 *    looks like moiré, and that is what most implementations of this get
 *    wrong on a phone. `uScanFade` is driven from the actual rendered pixel
 *    height of the tube — see CrtRig.
 *
 *  - Channel separation is 0.7 of a source texel. Real shadow-mask
 *    convergence error is under a pixel; the huge red/cyan fringing people
 *    reach for is a 3D-glasses effect, not a monitor.
 *
 *  - Horizontal softness comes from a 3-tap box along x only. A CRT is sharp
 *    vertically (the scanline IS the vertical sample) and soft horizontally
 *    (the beam is a spot with finite width sweeping continuously). Blurring
 *    both axes is the single most common mistake and it instantly reads as
 *    an out-of-focus image rather than an analogue one.
 *
 *  - Bloom is four wide taps of the luma, added back at 11%. Enough for
 *    bright pixels to eat into their neighbours, far short of a glow pass.
 *
 * Everything is one pass on the screen mesh itself. There is no
 * post-processing stack anywhere in this feature, which is what keeps the
 * hero affordable.
 */

export interface CrtUniforms {
  uMap: { value: THREE.Texture | null };
  uTime: { value: number };
  /** 0 settled, 1 mid channel change. */
  uTrans: { value: number };
  /** Power-on wipe, 0 → 1. */
  uWarm: { value: number };
  /** Scanline visibility, killed when the tube renders too small. */
  uScanFade: { value: number };
  /** Master brightness, also used for the click flicker. */
  uGain: { value: number };
  /**
   * How much of the raster's built-in geometric distortion to cancel for
   * the current programme. 0 = the authored behaviour, untouched; 1 =
   * the picture is laid out as a true rectangle. Per-channel — see the
   * RASTER LINEARITY note in the fragment shader.
   */
  uUndistort: { value: number };
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uTrans;
  uniform float uWarm;
  uniform float uScanFade;
  uniform float uGain;
  uniform float uUndistort;

  varying vec2 vUv;

  /* Superellipse exponent of the tube face. Interpolated from SCREEN.n so
     it cannot drift away from the mesh it is cancelling. */
  const float SE_N = ${SCREEN.n.toFixed(1)};
  /* What is left of the shader's own barrel term once a programme asks to
     be shown undistorted. Small, but not zero: the edges keep a trace of
     raster curvature on top of the glass's physical bulge. */
  const float RESIDUAL_BARREL = 0.35;

  const vec2 TEXEL = vec2(1.0 / 320.0, 1.0 / 240.0);
  /* Deliberately below the source's 240 lines. Matching them 1:1 beats
     against the sampling grid; 200 is visibly a raster without ever
     resolving into a pattern of its own. */
  const float LINES = 200.0;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  /* Soft horizontal box. x only — see the note at the top of this file. */
  vec3 sampleSoft(vec2 uv, float o) {
    vec3 c = texture2D(uMap, uv).rgb * 0.5;
    c += texture2D(uMap, uv + vec2(TEXEL.x * o, 0.0)).rgb * 0.25;
    c += texture2D(uMap, uv - vec2(TEXEL.x * o, 0.0)).rgb * 0.25;
    return c;
  }

  void main() {
    vec2 uv = vUv;

    /* ---- geometry ------------------------------------------------------
       The mesh is already a curved tube face, so the heavy lifting is done
       in 3D and this is only the residual raster distortion: a small barrel
       term, plus the slight pincushion an uncorrected deflection yoke left
       at the edges. Both are tiny on purpose — the shape of the image is
       the glass's job, not the shader's. */
    vec2 c = uv * 2.0 - 1.0;
    float r2 = dot(c, c);

    /* ---- raster linearity ----------------------------------------------
       The tube face is a regular grid in unit-square space pushed OUT onto
       the superellipse outline, and its UVs stay on the untouched square.
       That is deliberate — it makes the picture meet the aperture corner
       to corner, and on the procedural programmes the pinch it leaves in
       the corners reads as free pincushion.

       On photographic content it does not. The grid is compressed hardest
       along the diagonals, so the mapping is strongly ANISOTROPIC there —
       about 2.5:1 at the corners, which shears anything with a known
       shape, a straight edge or a circle in it. The barrel term below is
       1.6% and radially symmetric; it is not the cause and turning it off
       does not help.

       So a programme can ask for the mapping to be undone, by sampling at
       the position the mesh actually put this fragment at rather than at
       the square grid coordinate it was authored on. k here is exactly
       the factor tubeFaceGeometry() applied to the vertex, so multiplying
       by it inverts the pinch and leaves the picture linear.

       NOTHING ABOUT THE OBJECT MOVES. The mesh, its curvature, the glass
       in front of it and the aperture are all untouched; this is a change
       of where the texture is read, not of where anything sits. The cost
       is that the squircle now crops the picture's extreme corners by a
       few percent instead of squashing them into the radius — which is
       what a rounded aperture does to a rectangular raster anyway.

       r2 above is deliberately taken BEFORE this, so the vignette and
       the overall tube shading are bit-identical on every channel. */
    float barrel = 1.0;
    if (uUndistort > 0.001) {
      vec2 ac = abs(c);
      float m = max(ac.x, ac.y);
      if (m > 1e-5) {
        float norm = pow(pow(ac.x, SE_N) + pow(ac.y, SE_N), 1.0 / SE_N);
        c *= mix(1.0, m / norm, uUndistort);
      }
      barrel = mix(1.0, RESIDUAL_BARREL, uUndistort);
    }

    c *= 1.0 + barrel * (0.028 * r2 - 0.012 * r2 * r2);

    /* ---- channel change ------------------------------------------------
       A tube losing and regaining sync: the picture rolls, a horizontal
       tear band slides through it, and the whole frame dims. */
    float tear = 0.0;
    if (uTrans > 0.001) {
      float band = smoothstep(0.06, 0.0, abs(fract(c.y * 0.5 + 0.5 - uTime * 1.7) - 0.5) - 0.06);
      tear = (hash21(vec2(floor(c.y * 120.0), floor(uTime * 40.0))) - 0.5) * 0.09 * uTrans;
      c.x += tear + band * 0.16 * uTrans;
      c.y += uTrans * 0.55 * sin(uTime * 9.0);
    }

    /* ---- power-on wipe --------------------------------------------------
       A CRT coming up does not fade in, it opens: a bright horizontal line
       stretches out to fill the raster. */
    float open = smoothstep(0.0, 1.0, uWarm);
    c.y /= max(open, 0.001);

    vec2 duv = c * 0.5 + 0.5;

    /* Overscan: outside the raster is the unlit tube, not black paint. */
    vec2 edge = smoothstep(0.0, 0.012, duv) * smoothstep(0.0, 0.012, 1.0 - duv);
    float inRaster = edge.x * edge.y;

    vec2 suv = clamp(duv, vec2(0.0), vec2(1.0));

    /* ---- convergence: sub-texel RGB separation, radial ------------------ */
    float sep = 0.7 + uTrans * 2.2;
    vec2 dir = normalize(c + vec2(1e-5)) * TEXEL.x * sep;
    vec3 col;
    col.r = sampleSoft(clamp(suv + dir, 0.0, 1.0), 1.0).r;
    col.g = sampleSoft(suv, 1.0).g;
    col.b = sampleSoft(clamp(suv - dir, 0.0, 1.0), 1.0).b;

    /* ---- bloom: four wide taps of the luma, added back low -------------- */
    vec3 wide = texture2D(uMap, clamp(suv + vec2(TEXEL.x * 3.0, 0.0), 0.0, 1.0)).rgb
              + texture2D(uMap, clamp(suv - vec2(TEXEL.x * 3.0, 0.0), 0.0, 1.0)).rgb
              + texture2D(uMap, clamp(suv + vec2(0.0, TEXEL.y * 2.0), 0.0, 1.0)).rgb
              + texture2D(uMap, clamp(suv - vec2(0.0, TEXEL.y * 2.0), 0.0, 1.0)).rgb;
    wide *= 0.25;
    float wl = dot(wide, vec3(0.2126, 0.7152, 0.0722));
    col += wide * smoothstep(0.42, 1.0, wl) * 0.28;

    /* ---- scanlines ------------------------------------------------------
       Modulated by luma: bright areas bloom over the gap between lines, so
       the raster is most visible in the mid-tones. That luma dependence is
       the detail that separates a real tube from a striped overlay. */
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float scan = sin(duv.y * LINES * 3.14159265);
    float depth = 0.18 * uScanFade * (1.0 - smoothstep(0.55, 1.0, lum));
    col *= 1.0 - depth * scan * scan;

    /* ---- aperture grille: a very faint vertical triad ------------------- */
    float grille = sin(duv.x * 320.0 * 3.14159265);
    col *= 1.0 - 0.05 * uScanFade * grille * grille;

    /* ---- phosphor tint: the white point of a 1990s tube is cold --------- */
    col *= vec3(0.98, 1.0, 1.06);

    /* ---- vignette and corner darkening ---------------------------------- */
    float vig = 1.0 - 0.34 * pow(r2 * 0.52, 1.35);
    /* The corners of a tube are darker than its edges — the beam is further
       from the gun and hitting the mask at a worse angle. */
    float corner = 1.0 - 0.3 * pow(abs(c.x * c.y), 1.6);
    col *= vig * corner;

    /* ---- beam instability ------------------------------------------------
       Two incommensurate rates so the fluctuation never resolves into a
       loop, plus a slow mains-hum band drifting down the raster. */
    float flicker = 1.0 + 0.012 * sin(uTime * 17.3) + 0.008 * sin(uTime * 3.1);
    float hum = 1.0 + 0.016 * sin((duv.y + uTime * 0.09) * 6.2831);
    col *= flicker * hum;

    /* ---- noise: fine, monochrome, and low ------------------------------- */
    float n = hash21(duv * vec2(320.0, 240.0) + uTime * 13.0) - 0.5;
    col += n * (0.028 + uTrans * 0.34);

    /* ---- static during the channel change -------------------------------- */
    if (uTrans > 0.001) {
      float s = hash21(duv * vec2(240.0, 180.0) + uTime * 57.0);
      col = mix(col, vec3(s * 0.85), uTrans * 0.55);
      col *= 1.0 - 0.5 * uTrans;
    }

    col *= uGain;
    col *= mix(0.02, 1.0, inRaster);

    /* The unlit tube is never pure black: it is dark green-grey glass with
       a little ambient in it, which is what stops the screen reading as a
       hole cut in the bezel when the picture is dark. */
    col = max(col, vec3(0.018, 0.022, 0.026));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createCrtMaterial(map: THREE.Texture): {
  material: THREE.ShaderMaterial;
  uniforms: CrtUniforms;
} {
  const uniforms: CrtUniforms = {
    uMap: { value: map },
    uTime: { value: 0 },
    uTrans: { value: 0 },
    uWarm: { value: 0 },
    uScanFade: { value: 1 },
    uGain: { value: 1 },
    uUndistort: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });

  return { material, uniforms };
}
