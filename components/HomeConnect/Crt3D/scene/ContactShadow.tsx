"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { BASE, GROUND_Y, SHADOW } from "../proportions";
import { PALETTE } from "../materials/palette";

/**
 * CONTACT SHADOW
 * ==============
 *
 * One ground quad carrying a procedural shadow, evaluated in the fragment
 * shader from a rounded-box distance field. No shadow map, no depth pass,
 * no blur passes — two smoothsteps and a length().
 *
 * SHAPE
 * -----
 * The footprint is the BASE's plan, not the monitor's. That distinction is
 * the whole job here: the body is 3.3 units wide but it touches the desk
 * through a 2.86-unit foot, so the dark contact core has to be the foot
 * and the broad diffuse pool has to be the body occluding the room light
 * above it. Driving both from the body's silhouette — the obvious
 * shortcut — puts hard shadow under thin air at the left and right edges
 * and the monitor stops looking like it is standing on anything.
 *
 * IT TURNS WITH THE OBJECT
 * ------------------------
 * `uYaw` rotates the distance field under the monitor every frame, so as
 * the cursor swings the body round, the pool swings with it and its
 * projected width changes — widest when the body is square on, narrower
 * and longer as it turns away.
 *
 * This matters more than its cost. With ±20° of cursor yaw, a fixed
 * shadow is not a subtle inaccuracy: the body visibly rotates over a
 * stationary pool, and the object immediately reads as a sprite pasted
 * onto a painted smudge. One rotation in the fragment shader fixes it.
 *
 * `uPitch` does the other half. Pitching the monitor lifts the leading
 * or trailing edge of its base off the desk, so the contact tightens at
 * one end and loosens at the other — the field is offset along z by a
 * fraction of the pitch to lean the pool the same way the object is
 * leaning.
 *
 * The quad's own boundary is masked to zero well before its edge, so there
 * is no rectangle to see however the scene is framed. That matters more
 * than it sounds: a WebGL canvas cannot paint outside its element, so a
 * gradient still at 40% opacity when it reaches the edge of the drawing
 * surface gets sliced off flat and reads as a translucent grey box.
 *
 * A THIRD, SOFTER LOBE FOR GROUNDING
 * -----------------------------------
 * `core` and `pool` above are the original contact shadow and are
 * untouched — same shape, same weight, same darkness. `cast` is a third
 * sample of the same distance field: much larger blur radius, a fraction
 * of the density, recentred a little toward the body's own back (so it
 * reads as the room's light being occluded broadly, not just at the
 * foot). It is screen-blended on top (`a + cast * (1 - a)`), which is
 * what keeps it from ever compounding into something darker than the
 * existing contact shadow — it can only ever fill in the faint, wide halo
 * around it. This is the whole "premium soft cast shadow" ask: not a new
 * render pass, one more evaluation of a distance field this file already
 * has open.
 */

/** Plane half-extents in world units. Declared in proportions.ts because
 *  the camera fit has to frame them — see SHADOW there. */
const HALF_W = SHADOW.halfW;
const HALF_D = SHADOW.halfD;

/** Contact footprint: the base's plan, pulled in slightly because the
 *  chamfer on the foot means its true contact patch is smaller than its
 *  outline. */
const FOOT_W = BASE.foot.w / 2 - 0.16;
const FOOT_D = BASE.foot.d / 2 - 0.16;

/** Nudge away from the key light at (−4.2, 3.6, 4.2), and a little toward
 *  the viewer so the pool reads at a 9° downward view instead of hiding
 *  entirely under the body. */
const OFFSET_X = 0.1;
const OFFSET_Z = 0.06;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3  uColor;
  uniform vec2  uHalf;
  uniform vec2  uFoot;
  uniform float uCoreBlur;
  uniform float uPoolBlur;
  uniform float uStrength;
  uniform float uLift;
  uniform float uYaw;
  uniform float uPitch;
  uniform float uCastBlur;
  uniform float uCastStrength;
  uniform vec2  uCastOffset;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 n = vUv * 2.0 - 1.0;
    vec2 p = n * uHalf;

    /* Turn the footprint under the body. The plane's x/y map to world
       x/z, so the object's yaw is a plain 2D rotation here. */
    float c = cos(-uYaw);
    float s = sin(-uYaw);
    vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);

    /* Pitch leans the pool: the base's leading edge lifts, so the contact
       slides and the far end spreads. */
    q.y += uPitch * 0.55;

    float d = sdRoundBox(q, uFoot, 0.3);

    // Tight contact darkening, then a broad diffuse pool. Squaring the pool
    // keeps its tail long and its shoulder low, which is what stops the two
    // lobes reading as two separate shapes.
    /* Tilting the object off square lifts part of the base and softens
       the whole contact — a heavy thing sitting flat has the hardest
       shadow it will ever have. */
    float tilt = abs(uPitch) * 1.6;
    float core = 1.0 - smoothstep(0.0, uCoreBlur * (1.0 + tilt), d);
    float pool = 1.0 - smoothstep(0.0, uPoolBlur * (1.0 + tilt * 0.5), d);
    float a = core * 0.62 + pool * pool * 0.38;
    a *= 1.0 - tilt * 0.16;

    /* THIRD LOBE — the premium "cast" halo.
       Everything above this line is the original tight contact shadow,
       untouched. This lobe is a third, much larger and much softer
       sample of the same rounded-box field, recentred slightly toward
       −world-Z (the offset is applied in the body's own rotated frame,
       so it turns and leans with the object exactly like the core and
       pool do). It reads as the room's ambient occlusion pooling a
       little further out and a little further back than the hard
       contact, which is what grounds a physical object rather than a
       sprite: real ambient occlusion is broad and low-contrast, and it
       never lines up exactly with the contact patch beneath it.
       Screen-blended (a + cast*(1-a)) rather than added, so it can never
       double the contact shadow's own darkness — it only ever fills in
       the faint halo around it. */
    vec2 qCast = q + uCastOffset;
    float dCast = sdRoundBox(qCast, uFoot * 1.08, 0.5);
    float cast = 1.0 - smoothstep(0.0, uCastBlur * (1.0 + tilt * 0.5), dCast);
    float aCast = cast * cast * uCastStrength * (1.0 - tilt * 0.16);
    a = a + aCast * (1.0 - a);

    a *= 1.0 - smoothstep(0.74, 1.0, length(n));
    a *= uStrength * (1.0 - uLift * 0.09);

    if (a < 0.004) discard;

    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export default function ContactShadow({
  materialRef,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  strength = 1,
  softness = 1,
}: {
  materialRef?: MutableRefObject<THREE.ShaderMaterial | null>;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  /** Multiplier on the pool's density. */
  strength?: number;
  /** Multiplier on the blur radii. >1 = further away, softer contact. */
  softness?: number;
}) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color(PALETTE.shadow) },
          uHalf: { value: new THREE.Vector2(HALF_W, HALF_D) },
          uFoot: { value: new THREE.Vector2(FOOT_W, FOOT_D) },
          uCoreBlur: { value: 0.22 * softness },
          // A heavy object's pool is tighter and darker than a light one's.
          uPoolBlur: { value: 0.66 * softness },
          uStrength: { value: 0.32 * strength },
          uLift: { value: 0 },
          uYaw: { value: 0 },
          uPitch: { value: 0 },
          // The broad, low-contrast cast halo. Much larger blur radius
          // and a fraction of the pool's own density — it is meant to be
          // felt as grounding, not seen as a shape.
          uCastBlur: { value: 1.35 * softness },
          uCastStrength: { value: 0.16 * strength },
          // Recentred a touch toward the body's own local +X/+Y, which
          // (after the mesh's −90°-about-X rotation into the ground
          // plane) lands the halo's centre slightly toward +world-X and
          // −world-Z — the same "away from the key light at (−4.2, 3.6,
          // 4.2)" direction as the core's OFFSET_X, continued on to its
          // natural conclusion of trailing a little behind the unit.
          // Expressed in q-space (sdRoundBox(q + uCastOffset, …) is
          // centred at q = −uCastOffset), and applied AFTER the yaw
          // rotation above, so the trail stays fixed to the body's own
          // back rather than to the world as the unit turns.
          uCastOffset: { value: new THREE.Vector2(-0.06, -0.32) },
        },
      }),
    [strength, softness],
  );

  useEffect(() => {
    if (materialRef) materialRef.current = material;
    return () => {
      if (materialRef) materialRef.current = null;
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material, materialRef]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh
        geometry={geometry}
        material={material}
        position={[OFFSET_X, GROUND_Y, OFFSET_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      />
    </group>
  );
}
