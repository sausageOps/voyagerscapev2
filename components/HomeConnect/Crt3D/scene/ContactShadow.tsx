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
 * through a 2.42-unit foot, so the dark contact core has to be the foot
 * and the broad diffuse pool has to be the body occluding the room light
 * above it. Driving both from the body's silhouette — the obvious
 * shortcut — puts hard shadow under thin air at the left and right edges
 * and the monitor stops looking like it is standing on anything.
 *
 * The quad's own boundary is masked to zero well before its edge, so there
 * is no rectangle to see however the scene is framed. That matters more
 * than it sounds: a WebGL canvas cannot paint outside its element, so a
 * gradient still at 40% opacity when it reaches the edge of the drawing
 * surface gets sliced off flat and reads as a translucent grey box.
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
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 n = vUv * 2.0 - 1.0;
    vec2 p = n * uHalf;

    float d = sdRoundBox(p, uFoot, 0.3);

    // Tight contact darkening, then a broad diffuse pool. Squaring the pool
    // keeps its tail long and its shoulder low, which is what stops the two
    // lobes reading as two separate shapes.
    float core = 1.0 - smoothstep(0.0, uCoreBlur, d);
    float pool = 1.0 - smoothstep(0.0, uPoolBlur, d);
    float a = core * 0.62 + pool * pool * 0.38;

    a *= 1.0 - smoothstep(0.74, 1.0, length(n));
    a *= uStrength * (1.0 - uLift * 0.09);

    if (a < 0.004) discard;

    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export default function ContactShadow({
  materialRef,
}: {
  materialRef?: MutableRefObject<THREE.ShaderMaterial | null>;
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
          uCoreBlur: { value: 0.22 },
          // A heavy object's pool is tighter and darker than a light one's.
          uPoolBlur: { value: 0.66 },
          uStrength: { value: 0.32 },
          uLift: { value: 0 },
        },
      }),
    [],
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
    <mesh
      geometry={geometry}
      material={material}
      position={[OFFSET_X, GROUND_Y, OFFSET_Z]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
    />
  );
}
