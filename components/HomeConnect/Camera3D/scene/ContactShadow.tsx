"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { GROUND_Y } from "../proportions";
import { PALETTE } from "../materials/palette";

/**
 * CONTACT SHADOW
 * ==============
 *
 * A single ground plane carrying a procedural shadow, evaluated in the
 * fragment shader from a rounded-box distance field.
 *
 * WHY THIS IS NOT A TEXTURED PLANE ANY MORE
 * -----------------------------------------
 * The previous version painted a radial gradient into a 128px canvas and
 * used it as an `alphaMap` on two stacked planes, the larger scaled to 4.7
 * world units. That was fine at Stage 1B's framing. Stage 2 zoomed the
 * object in by 22%, and at the new scale 4.7 units projects to roughly
 * 590 CSS pixels inside a 482 pixel canvas — so the gradient was still at
 * ~40% opacity when it ran off the side of the drawing surface. A WebGL
 * canvas cannot paint past its own element, so the falloff was sliced off
 * flat on both sides and the "soft shadow" read as a big translucent
 * rectangle sitting behind the camera.
 *
 * Reducing the opacity would not have fixed that: the boundary was a hard
 * geometric cut, not a density problem. The plane had to get smaller than
 * the viewport and the falloff had to be guaranteed to reach zero inside
 * it. Both are now true by construction:
 *
 *   - PLANE spans 3.36 x 1.80 units. Projected through the staging yaw at
 *     the current framing that is ~473 CSS px wide against a 482 px canvas.
 *   - the shader multiplies everything by a rim mask that is already zero
 *     at the plane's own boundary, so the quad's edges can never be seen
 *     however the framing changes.
 *
 * SHAPE
 * -----
 * A camera resting on a surface does not cast a circular blob. The dark
 * part follows the rectangular footprint of the base and only becomes
 * elliptical as it diffuses outward. So the field is a rounded box the
 * size of the body's footprint, sampled twice: once tight for the contact
 * line, once wide for the ambient pool. Two smoothsteps and a length() —
 * no render target, no depth pass, no blur passes, no extra draw call
 * beyond the one quad that was already here.
 */

/** Plane half-extents in world units. Sized to sit inside the canvas. */
const HALF_W = 1.68;
const HALF_D = 0.9;

/** Contact footprint half-extents. The body's base is 3.0 x 1.02; the core
 *  is held inside that because the object's own overhang occludes its edge. */
const FOOT_W = 1.1;
const FOOT_D = 0.34;

/** Nudge away from the key light at (-4.4, 3.4, 4.0), and a little toward
 *  the viewer so the pool reads at an 14° downward view instead of hiding
 *  entirely under the body. Small — the object is resting, not flying. */
const OFFSET_X = 0.08;
const OFFSET_Z = 0.1;

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

    float d = sdRoundBox(p, uFoot, 0.28);

    // Tight contact darkening, then a broad diffuse pool. Squaring the pool
    // keeps its tail long and its shoulder low, which is what stops the two
    // lobes reading as two separate shapes.
    float core = 1.0 - smoothstep(0.0, uCoreBlur, d);
    float pool = 1.0 - smoothstep(0.0, uPoolBlur, d);
    float a = core * 0.58 + pool * pool * 0.42;

    // The quad's own boundary is masked to zero well before its edge, so
    // there is no rectangle to see no matter how the scene is framed.
    a *= 1.0 - smoothstep(0.78, 1.0, length(n));

    // The object floats. As it rises the contact loosens slightly.
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
          uCoreBlur: { value: 0.3 },
          uPoolBlur: { value: 0.72 },
          uStrength: { value: 0.26 },
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
