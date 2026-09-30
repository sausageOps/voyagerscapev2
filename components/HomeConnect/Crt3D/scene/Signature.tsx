"use client";

import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { CrtMaterials } from "../materials";
import { SIGNATURE } from "../proportions";
import { bake, merge } from "../geometry";

/**
 * SIGNATURE COMPONENT — the "signal sphere"
 * =========================================
 *
 * A glowing lavender orb cradled in a twin brass gimbal on a short post at the
 * top of the machine. It reads as an observatory sensor head, not a control —
 * the "why is this on the website?" detail that makes the object unmistakably
 * Voyagerscape. The gimbal rings turn slowly and the orb breathes at idle.
 */
export default function Signature({
  materials,
  ringRef,
  sphereRef,
  haloRef,
}: {
  materials: CrtMaterials;
  ringRef: MutableRefObject<THREE.Group | null>;
  sphereRef: MutableRefObject<THREE.Mesh | null>;
  haloRef: MutableRefObject<THREE.PointLight | null>;
}) {
  const cy = SIGNATURE.baseY + SIGNATURE.postH + SIGNATURE.forkR;

  const mount = useMemo(() => {
    const brass: THREE.BufferGeometry[] = [];
    const dark: THREE.BufferGeometry[] = [];

    // post
    const post = new THREE.CylinderGeometry(SIGNATURE.postR, SIGNATURE.postR * 1.3, SIGNATURE.postH, 20);
    dark.push(bake(post, [0, SIGNATURE.baseY + SIGNATURE.postH / 2, 0]));
    // collar
    const collar = new THREE.CylinderGeometry(SIGNATURE.postR * 1.5, SIGNATURE.postR * 1.5, 0.06, 20);
    brass.push(bake(collar, [0, SIGNATURE.baseY + 0.04, 0]));
    // yoke arms rising to the gimbal pivots
    for (const sx of [-1, 1]) {
      const arm = new THREE.CylinderGeometry(0.03, 0.03, SIGNATURE.forkR * 1.1, 12);
      brass.push(
        bake(
          arm,
          [sx * SIGNATURE.forkR * 0.72, SIGNATURE.baseY + SIGNATURE.postH + SIGNATURE.forkR * 0.35, 0],
          [0, 0, sx * 0.5],
        ),
      );
    }

    return { brass: merge(brass), dark: merge(dark) };
  }, []);

  // Gimbal rings (spun as a group).
  const rings = useMemo(() => {
    const outer = new THREE.TorusGeometry(SIGNATURE.forkR, SIGNATURE.forkTube, 12, 48);
    const inner = new THREE.TorusGeometry(SIGNATURE.forkR * 0.78, SIGNATURE.forkTube * 0.8, 12, 48);
    inner.rotateY(Math.PI / 2);
    return merge([outer, inner]);
  }, []);

  useEffect(
    () => () => {
      mount.brass.dispose();
      mount.dark.dispose();
      rings.dispose();
    },
    [mount, rings],
  );

  return (
    <group position={[SIGNATURE.x, 0, SIGNATURE.z]}>
      <mesh geometry={mount.dark} material={materials.metalDark} />
      <mesh geometry={mount.brass} material={materials.brass} />

      {/* gimbal rings — slowly spun */}
      <group position={[0, cy, 0]} ref={ringRef}>
        <mesh geometry={rings} material={materials.brassBright} />
      </group>

      {/* the signal sphere */}
      <mesh ref={sphereRef} position={[0, cy, 0]} material={materials.sphere}>
        <sphereGeometry args={[SIGNATURE.sphereR, 32, 24]} />
      </mesh>

      {/* halo light so the sphere throws lavender onto the brass */}
      <pointLight
        ref={haloRef}
        color="#d8ccff"
        intensity={0.7}
        distance={1.6}
        decay={2}
        position={[0, cy, 0.1]}
      />
    </group>
  );
}
