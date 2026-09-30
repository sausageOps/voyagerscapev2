"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BASE, GROUND_Y } from "../proportions";
import { CRT } from "../palette";

/**
 * CONTACT SHADOW
 * ==============
 *
 * One ground quad carrying a procedural rounded-box shadow evaluated in the
 * fragment shader (same technique as the camera hero). Sized to the base
 * plinth footprint and masked to zero before the quad's own edge, so the
 * rectangle is never visible however the scene is framed. No render target.
 */
const HALF_W = 2.1;
const HALF_D = 1.4;
const FOOT_W = BASE.plateW / 2 - 0.1;
const FOOT_D = BASE.plateD / 2 - 0.1;

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
  uniform float uStrength;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    vec2 n = vUv * 2.0 - 1.0;
    vec2 p = n * uHalf;
    float d = sdRoundBox(p, uFoot, 0.3);
    float core = 1.0 - smoothstep(0.0, 0.32, d);
    float pool = 1.0 - smoothstep(0.0, 0.95, d);
    float a = core * 0.6 + pool * pool * 0.4;
    a *= 1.0 - smoothstep(0.74, 1.0, length(n));
    a *= uStrength;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export default function ContactShadow() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color(CRT.shadow) },
          uHalf: { value: new THREE.Vector2(HALF_W, HALF_D) },
          uFoot: { value: new THREE.Vector2(FOOT_W, FOOT_D) },
          uStrength: { value: 0.34 },
        },
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, GROUND_Y + 0.01, BASE.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
    />
  );
}
