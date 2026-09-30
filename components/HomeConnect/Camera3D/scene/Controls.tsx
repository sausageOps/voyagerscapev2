"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { DIAL, KNURL, TOP_Y } from "../proportions";
import { buildControlsGeometry } from "../geometry/buildControls";
import type { CameraMaterials } from "../materials/materials";

/**
 * TOP-DECK CONTROLS
 * =================
 *
 * A thin host for geometry/buildControls.ts — the lathe-turned dial, collar
 * and one-piece shutter button are documented there.
 *
 * STAGE 2 CONTRACTS — PRESERVED
 * ------------------------------
 *  - `buttonRef` receives the whole button (one buffer now, one lathe), and
 *    the rig only ever writes `position.y` to it.
 *  - `hitProxy` is the same invisible sphere over the button, same size,
 *    same position. Three does not skip invisible objects when raycasting
 *    but the renderer does skip them when drawing, so it costs one ray test
 *    and zero draw calls — and it gives the 0.1-unit button a hit target a
 *    human can actually land on. This is the one place R3F mesh pointer
 *    events earn their keep.
 *  - The travel bounds (skirt vs bore) are Stage 2 fixtures; see
 *    buildControls.ts.
 */
export interface ControlsProps {
  materials: CameraMaterials;
  /** Button lathe. Translated on Y by the rig. */
  buttonRef?: MutableRefObject<THREE.Group | null>;
  /** Fired when the cursor enters/leaves the shutter button. */
  onShutterHover?: (over: boolean) => void;
}

export default function Controls({ materials: m, buttonRef, onShutterHover }: ControlsProps) {
  const knurlRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => buildControlsGeometry(), []);

  useEffect(
    () => () => {
      Object.entries(geo).forEach(([, g]) => {
        if (g instanceof THREE.BufferGeometry) g.dispose();
      });
    },
    [geo],
  );

  useLayoutEffect(() => {
    const mesh = knurlRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const r = DIAL.r + 0.002;
    const y = (geo.seat && 0) + DIAL.h / 2 + 0.981 + 0.054;

    for (let i = 0; i < KNURL.dial; i += 1) {
      const a = (i / KNURL.dial) * Math.PI * 2;
      dummy.position.set(DIAL.x + Math.cos(a) * r, y, DIAL.z + Math.sin(a) * r);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geo]);

  return (
    <group>
      {/* boss moulded into the top plate */}
      <mesh geometry={geo.seat} material={m.deck} />

      {/* dial — dark drum, bright ridges. The reverse (pale drum, black
          teeth) rendered as a flat black gear with no material read. */}
      <mesh geometry={geo.dialMetal} material={m.metalDark} />
      <mesh geometry={geo.dialFace} material={m.metalBright} />
      <instancedMesh
        ref={knurlRef}
        args={[geo.knurl, m.metalMid, KNURL.dial]}
        frustumCulled={false}
      />
      <mesh geometry={geo.index} material={m.yellow} />

      {/* shutter */}
      <mesh geometry={geo.collar} material={m.metalMid} />
      <mesh geometry={geo.collarLip} material={m.metalBright} />
      <group ref={buttonRef}>
        <mesh geometry={geo.button} material={m.pink} />
      </group>
      <mesh
        geometry={geo.hitProxy}
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          onShutterHover?.(true);
        }}
        onPointerOut={() => onShutterHover?.(false)}
      />
    </group>
  );
}
