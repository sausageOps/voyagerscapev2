"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TOP_Y, DIAL, SHUTTER } from "../proportions";
import type { CameraMaterials } from "../materials/materials";

/**
 * TOP-DECK CONTROLS
 * =================
 *
 * The SVG drew the mode dial and shutter on the front face because a flat
 * illustration has nowhere else to put them. In three dimensions they belong
 * on the top deck, which is also what earns the three-quarter view its keep:
 * the dial and the pink shutter are the payoff for tilting the object.
 *
 *   mode dial — knurled cylinder, 12 instanced detents, one pale-yellow index
 *   shutter   — pink button seated in a machined metal collar
 *
 * Stage 1 is static. Hover depression and the shutter timeline are Stage 5.
 */
export default function Controls({ materials: m }: { materials: CameraMaterials }) {
  const detentRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => {
    /* ---- mode dial ---- */
    const dial = new THREE.CylinderGeometry(DIAL.r, DIAL.r * 0.97, DIAL.h, 44);
    const dialTop = new THREE.CircleGeometry(DIAL.r * 0.9, 40);
    dialTop.rotateX(-Math.PI / 2);
    const dialSeat = new THREE.CylinderGeometry(DIAL.r * 1.1, DIAL.r * 1.12, 0.035, 44);
    const detent = new THREE.BoxGeometry(0.016, DIAL.h * 0.62, 0.03);
    const indexPip = new THREE.BoxGeometry(0.022, 0.012, 0.07);

    /* ---- shutter ---- */
    const collar = new THREE.CylinderGeometry(SHUTTER.rCollar, SHUTTER.rCollar * 1.04, 0.05, 40);
    const collarRing = new THREE.TorusGeometry(SHUTTER.rCollar - 0.008, 0.012, 10, 40);
    collarRing.rotateX(Math.PI / 2);
    const button = new THREE.CylinderGeometry(SHUTTER.rButton, SHUTTER.rButton * 0.94, SHUTTER.h, 36);
    // A gently domed cap rather than a flat disc — it catches the key light.
    const buttonCap = new THREE.SphereGeometry(SHUTTER.rButton * 2.2, 32, 12, 0, Math.PI * 2, 0, 0.47);

    return { dial, dialTop, dialSeat, detent, indexPip, collar, collarRing, button, buttonCap };
  }, []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => (g as THREE.BufferGeometry).dispose());
    },
    [geo],
  );

  useLayoutEffect(() => {
    const mesh = detentRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const r = DIAL.r - 0.006;

    for (let i = 0; i < DIAL.detents; i += 1) {
      const a = (i / DIAL.detents) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <group>
      {/* ------------------------------------------------------ mode dial -- */}
      <group position={[DIAL.x, TOP_Y, DIAL.z]}>
        <mesh geometry={geo.dialSeat} material={m.shell} position={[0, 0.004, 0]} />
        <mesh geometry={geo.dial} material={m.metalMid} position={[0, DIAL.h / 2 + 0.012, 0]} />
        <mesh
          geometry={geo.dialTop}
          material={m.metalBright}
          position={[0, DIAL.h + 0.0135, 0]}
        />
        <instancedMesh
          ref={detentRef}
          args={[geo.detent, m.metalDark, DIAL.detents]}
          position={[0, DIAL.h / 2 + 0.012, 0]}
          frustumCulled={false}
        />
        {/* index mark, pale yellow, pointing forward */}
        <mesh
          geometry={geo.indexPip}
          material={m.yellow}
          position={[0, DIAL.h + 0.016, DIAL.r * 0.55]}
        />
      </group>

      {/* -------------------------------------------------- shutter button -- */}
      <group position={[SHUTTER.x, TOP_Y, SHUTTER.z]}>
        <mesh geometry={geo.collar} material={m.metalMid} position={[0, 0.014, 0]} />
        <mesh geometry={geo.collarRing} material={m.metalBright} position={[0, 0.04, 0]} />
        <mesh geometry={geo.button} material={m.pink} position={[0, SHUTTER.h / 2 + 0.028, 0]} />
        <mesh
          geometry={geo.buttonCap}
          material={m.pink}
          position={[0, SHUTTER.h + 0.028 - SHUTTER.rButton * 1.93, 0]}
        />
      </group>
    </group>
  );
}
