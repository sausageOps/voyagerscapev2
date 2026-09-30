"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { LENS, LENS_Z, IRIS, KNURL } from "../proportions";
import { buildLensGeometry } from "../geometry/buildLens";
import type { CameraMaterials } from "../materials/materials";

/**
 * LENS ASSEMBLY
 * =============
 *
 * The focal point of the object. Stage 3 builds the barrel as TURNED lathe
 * profiles (see geometry/buildLens.ts): filleted shoulders, rolled lips,
 * smooth circumferential shading — a manufactured stack rather than stacked
 * cylinders. The z-plan, the waist-and-shoulder silhouette and every
 * motion-coupled value are Stage 2's, unchanged.
 *
 * STAGE 2 MECHANISMS — PRESERVED
 * -------------------------------
 * The focus ring and its 64 knurl teeth share a pivot group that rotates
 * about the optical axis, and the seven iris blades live in a seven-instance
 * InstancedMesh whose matrices are rewritten per frame. Both stay exactly as
 * they were; only the static surfaces around them were rebuilt.
 *
 * This component owns no motion. It exposes the two moving parts through refs
 * and `CameraRig` drives them, because there must be exactly one place that
 * decides where anything is on a given frame.
 */
export interface LensAssemblyProps {
  materials: CameraMaterials;
  /** Pivot for the focus ring + its knurling. Rotated about Z by the rig. */
  focusRingRef?: MutableRefObject<THREE.Group | null>;
  /**
   * Depth-parallax pivot for the focus ring, counter-positioned so that its
   * rotation happens about the OBJECT's origin rather than the optical axis.
   *
   * Rotating the ring about its own centre would tilt it on the barrel, which
   * looks like a part working loose. Rotating it about the origin the body is
   * already turning around translates it instead, by an amount proportional
   * to how far forward it sits — which is what parallax physically is.
   */
  focusParallaxRef?: MutableRefObject<THREE.Group | null>;
  /** Seven blades. Driven through `setIrisOpening`. */
  irisRef?: MutableRefObject<THREE.InstancedMesh | null>;
}

const irisDummy = new THREE.Object3D();

/**
 * Write the blade matrices for an aperture radius, in world units.
 *
 * Each blade is baked with its inner edge on local y=0, so placing the blade
 * at radius `opening` along its own outward axis puts that edge tangent to a
 * circle of that radius — seven of them bound a regular heptagon with
 * apothem `opening`, which is what an iris diaphragm actually is.
 *
 * Translating rather than pivoting is deliberate; see IRIS.open in
 * proportions.ts for why the pivoting version does not fit inside the barrel.
 */
export function setIrisOpening(mesh: THREE.InstancedMesh, opening: number) {
  for (let i = 0; i < IRIS.blades; i += 1) {
    const a = (i / IRIS.blades) * Math.PI * 2;
    // The blade's local +Y after a Z-rotation of `a`.
    irisDummy.position.set(-Math.sin(a) * opening, Math.cos(a) * opening, LENS_Z.irisPlane + i * IRIS.stack);
    irisDummy.rotation.set(0, 0, a);
    irisDummy.updateMatrix();
    mesh.setMatrixAt(i, irisDummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

export default function LensAssembly({
  materials: m,
  focusRingRef,
  focusParallaxRef,
  irisRef,
}: LensAssemblyProps) {
  const knurlRef = useRef<THREE.InstancedMesh>(null);
  const localIris = useRef<THREE.InstancedMesh | null>(null);

  const geo = useMemo(() => buildLensGeometry(), []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => (g as THREE.BufferGeometry).dispose());
    },
    [geo],
  );

  /* Lay out the knurl ridges around the focus ring. */
  useLayoutEffect(() => {
    const mesh = knurlRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const r = LENS.rFocus + 0.006;
    const z = (LENS_Z.focus.from + LENS_Z.focus.to) / 2;

    for (let i = 0; i < KNURL.focus; i += 1) {
      const a = (i / KNURL.focus) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, z);
      dummy.rotation.set(0, 0, a);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  /* Seed the iris at its resting aperture, so the first painted frame is
     already correct rather than showing seven blades stacked at the centre. */
  useLayoutEffect(() => {
    const mesh = localIris.current;
    if (!mesh) return;
    setIrisOpening(mesh, IRIS.open);
    mesh.computeBoundingSphere();
  }, []);

  return (
    <group position={[LENS.x, LENS.y, 0]}>
      {/* ---- mounting hardware + fixed barrel ---- */}
      <mesh geometry={geo.satin} material={m.satin} />
      <mesh geometry={geo.dark} material={m.metalDark} />
      <mesh geometry={geo.barrel} material={m.lensBody} />

      {/* ---- focus ring: the one rotating control ----
          Ring and knurling share this pivot so the teeth travel with the
          rubber. It sits at the group origin, which is already on the
          optical axis, so a Z rotation here is a rotation about the axis.
          The counter-positioned wrapper keeps the rig's parallax rotation
          about the OBJECT origin — unchanged from Stage 2. */}
      <group ref={focusParallaxRef} position={[-LENS.x, -LENS.y, 0]}>
        <group position={[LENS.x, LENS.y, 0]}>
          <group ref={focusRingRef}>
            <mesh geometry={geo.focusRing} material={m.rubber} />
            <instancedMesh
              ref={knurlRef}
              args={[geo.knurl, m.rubber, KNURL.focus]}
              frustumCulled={false}
            />
          </group>
        </group>
      </group>

      {/* ---- front group ---- */}
      <mesh geometry={geo.bezelChamfer} material={m.metalMid} />
      <mesh geometry={geo.engravings} material={m.metalBright} />

      {/* ---- index mark ---- */}
      <mesh geometry={geo.index} material={m.yellow} />

      {/* ---- interior ---- */}
      {/* m.lensInner is BackSide (it lines the tube), so the rear stop needs
          its own front-facing material or it culls away to nothing. */}
      <mesh geometry={geo.bore} material={m.lensInner} />
      <mesh geometry={geo.stop} material={m.lensStop} />

      {/* ---- iris ---- */}
      <mesh geometry={geo.bladeBacking} material={m.blade} />
      <instancedMesh
        ref={(node) => {
          localIris.current = node;
          if (irisRef) irisRef.current = node;
        }}
        args={[geo.blade, m.blade, IRIS.blades]}
        frustumCulled={false}
      />

      {/* ---- glass ---- */}
      <mesh geometry={geo.glassInner} material={m.glassInner} renderOrder={2} />
      <mesh geometry={geo.glass} material={m.glass} renderOrder={3} />
    </group>
  );
}
