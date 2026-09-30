import * as THREE from "three";
import { SCREEN } from "../proportions";

/**
 * THE FACEPLATE
 * =============
 *
 * A custom shader for the curved tube face: a soft studio reflection that
 * moves with the glass, a thickness-driven dark edge, and a faint warm
 * glow from the phosphor scattering inside the pane.
 *
 * WHY THIS IS NOT A MeshPhysicalMaterial ANY MORE
 * -----------------------------------------------
 * Because a transparent PBR material composites the wrong way round for
 * this job, and no amount of tuning fixes it.
 *
 * `transparent: true` with `opacity: 0.19` blends the ENTIRE shaded
 * result — diffuse, specular, environment and all — at 19%. So the
 * reflection, the one thing that has to survive, arrives at a fifth
 * strength, and the only way to get it back is to push
 * `envMapIntensity` to absurd values (it was at 2.9). Worse, the alpha
 * that is dimming the reflection is the same alpha that decides how much
 * of the game shows through, so the two are welded together: you cannot
 * make the glass more reflective without making the picture dimmer, and
 * the brief's final rule is that the picture wins.
 *
 * The physically correct answer is `transmission`, and it costs a
 * separate backdrop render pass — which the brief rules out, reasonably,
 * for one mesh on a homepage.
 *
 * So the compositing is done explicitly instead, with premultiplied
 * alpha:
 *
 *     result = reflection + picture x (1 - absorption)
 *
 * `reflection` is ADDED, never scaled by alpha, so it can be tuned for
 * how the room actually looks in the glass. `absorption` separately
 * controls how much of the picture the glass body eats, which is near
 * zero in the middle of the pane and substantial at the rim where you
 * are looking through the most glass. Two independent knobs instead of
 * one contradictory one, and the game can never be dimmed by making the
 * reflection better.
 *
 * WHERE THE REFLECTION COMES FROM
 * -------------------------------
 * The same room the plastic is lit by — literally the same painting
 * function — sampled as a blurred equirectangular map along the
 * reflection vector. Because it is a genuine reflection of a world-space
 * direction, it sweeps across the pane as the monitor turns and it
 * cannot be faked by anything attached to the screen texture. A CRT is
 * mostly a mirror that happens to have a picture in it, and that
 * sweeping is the single clearest signal that the surface is curved
 * glass rather than a printed panel.
 *
 * FRESNEL IS NEARLY USELESS HERE, WHICH IS WHY THE RIM IS EXPLICIT
 * ----------------------------------------------------------------
 * A tube face is a very shallow spherical section — 0.205 of bulge over
 * 1.37 of half-width, so the surface normal never tilts more than about
 * 17° from straight ahead. Schlick at that angle returns 0.05, the same
 * as dead centre: the honest Fresnel term produces almost no edge
 * response at all on this geometry, and a glass that relies on it looks
 * flat.
 *
 * What actually darkens and brightens the edge of a real faceplate is
 * THICKNESS — the pane is a lens, and at the rim you are looking through
 * several times as much dark glass. So the rim term is driven by
 * position on the pane, not by viewing angle, and it is recovered
 * exactly from the geometry: the surface is z = -bulge x rho², so
 * rho = sqrt(-z / bulge) with no extra attribute and no approximation.
 */

const VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying float vRho;

  uniform float uBulge;

  void main() {
    /* The patch is generated as z = -bulge * rho^2, so the normalised
       radius is recoverable from the vertex's own z. Exact, free, and it
       cannot drift out of step with the geometry the way a second
       attribute would. */
    vRho = sqrt(clamp(-position.z / uBulge, 0.0, 1.0));

    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    // The hero group is never scaled, so the upper 3x3 is a pure rotation.
    vWorldNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D uEnv;
  uniform float uReflect;
  uniform float uAbsorb;
  uniform float uGlow;
  uniform vec3 uTint;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying float vRho;

  #define RECIP_PI2 0.15915494309

  /* three's equirectangular convention, so the map painted for the
     scene environment can be reused here unchanged. */
  vec2 equirectUv(vec3 dir) {
    return vec2(
      atan(dir.z, dir.x) * RECIP_PI2 + 0.5,
      asin(clamp(dir.y, -1.0, 1.0)) * (1.0 / 3.14159265) + 0.5
    );
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndv = clamp(dot(N, V), 0.0, 1.0);

    vec3 R = reflect(-V, N);
    vec3 room = texture2D(uEnv, equirectUv(R)).rgb;

    /* Schlick against an ior of 1.58 — leaded faceplate glass. Honest,
       and on this curvature worth almost nothing except right at the
       very edge, which is the point made at the top of this file. */
    float fres = 0.05 + 0.95 * pow(1.0 - ndv, 5.0);

    /* Thickness. Squared because the path length through a lens grows
       faster than linearly as you move off axis. */
    float rim = smoothstep(0.44, 1.0, vRho);
    float rim2 = rim * rim;

    /* The polished bevel right at the outer edge of the pane, just
       inside the bezel lip. A thin, brighter line — this is the detail
       that reads specifically as THICKNESS rather than as a vignette. */
    float lip = smoothstep(0.88, 0.975, vRho) * (1.0 - smoothstep(0.975, 1.0, vRho));

    /* ---- what the glass ADDS -------------------------------------- */
    float k = fres + 0.18 * rim2 + 0.5 * lip;
    /* Old faceplates are not neutral: they pull very slightly warm. */
    vec3 refl = room * k * uReflect * vec3(1.0, 0.988, 0.962);

    /* Phosphor light scattering sideways inside the pane, so it pools
       where the glass is thickest. Warm, and very low — this is the
       difference between glass over a lit screen and glass over a
       picture of one. */
    refl += uTint * uGlow * rim2;

    /* ---- what the glass TAKES AWAY --------------------------------- */
    /* Premultiplied alpha: the picture behind is multiplied by
       (1 - a) and the reflection above is added on top of it. Tiny in
       the middle of the pane so the game is barely touched, real at the
       rim where you are looking through the most glass. */
    float a = 0.03 + uAbsorb * rim2 * rim;

    gl_FragColor = vec4(refl, a);
  }
`;

export interface GlassUniforms {
  uEnv: { value: THREE.Texture | null };
  /** Master reflection strength. Driven by cursor proximity. */
  uReflect: { value: number };
  /** How much of the picture the glass body absorbs at the rim. */
  uAbsorb: { value: number };
  /** Phosphor light scattering inside the pane. */
  uGlow: { value: number };
  uTint: { value: THREE.Color };
  uBulge: { value: number };
}

/** Resting reflection strength, and how much cursor proximity adds. */
export const GLASS = { reflect: 1.0, reflectHover: 0.22 } as const;

export function createGlassMaterial(env: THREE.Texture | null): {
  material: THREE.ShaderMaterial;
  uniforms: GlassUniforms;
} {
  const uniforms: GlassUniforms = {
    uEnv: { value: env },
    uReflect: { value: GLASS.reflect },
    /* 0.30, arrived at by rendering a real programme frame behind the
       glass and looking at it. At 0.46 the corners stopped reading as
       thickness and started reading as a vignette overlay, which is the
       one thing the brief rules out by name — and the CRT shader
       already applies a vignette of its own underneath this. */
    uAbsorb: { value: 0.3 },
    uGlow: { value: 0.1 },
    uTint: { value: new THREE.Color("#9ec8e0") },
    uBulge: { value: SCREEN.bulge * SCREEN.glassOversize },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    /* src = ONE, dst = ONE_MINUS_SRC_ALPHA. The whole compositing model
       depends on this one flag. */
    premultipliedAlpha: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    /* The room texture is already sRGB-encoded and the framebuffer holds
       sRGB-encoded values, so this shader works in that space end to end
       and must not be converted on the way out. */
    toneMapped: false,
  });

  return { material, uniforms };
}
