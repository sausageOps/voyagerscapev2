"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LENS, LENS_Z, IRIS } from "../proportions";
import type { CameraMaterials } from "../materials/materials";

/** Knurl teeth around the focus ring. Instanced → one draw call. */
const KNURL_COUNT = 56;

/**
 * LENS ASSEMBLY
 * =============
 *
 * The focal point of the object, built as a real telescoping stack rather than
 * concentric circles:
 *
 *   mount ring  → barrel → knurled focus ring → bezel → front lip
 *   inner throat (BackSide, matte black) running back into the body
 *   seven-blade iris sitting inside the throat
 *   a domed front element over the top
 *
 * Total protrusion is ~0.55 world units against a body depth of 1.02 — the
 * proportion of a compact camera, which is what the SVG was describing.
 *
 * The iris is genuine geometry: seven straight-edged blades, each tangent to a
 * circle of radius `IRIS.opening`, stacked a fraction of a millimetre apart.
 * Seven planes cost nothing and give a real heptagonal aperture with visible
 * overlap at the corners — the thing the SVG could only imply with radial
 * lines. It is static in Stage 1; animating `opening` is Stage 4.
 */
export default function LensAssembly({ materials: m }: { materials: CameraMaterials }) {
  const knurlRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => {
    /**
     * A barrel section is a TUBE, not a solid. `openEnded` must be true:
     * a capped CylinderGeometry puts a disc across each end, and the cap on
     * the front-most ring sits directly over the lens opening — which renders
     * as a flat black plate and hides the entire interior behind it.
     */
    const ring = (rOuter: number, from: number, to: number, segments = 48) => {
      const g = new THREE.CylinderGeometry(rOuter, rOuter, to - from, segments, 1, true);
      g.rotateX(Math.PI / 2);
      g.translate(0, 0, (from + to) / 2);
      return g;
    };

    /** Annular face used to close a barrel step without blocking the bore. */
    const shoulder = (rInner: number, rOuter: number, z: number) => {
      const g = new THREE.RingGeometry(rInner, rOuter, 52);
      g.translate(0, 0, z);
      return g;
    };

    /* ---- barrel stack -------------------------------------------------- */
    const mount = ring(LENS.rMount, LENS_Z.mount.from, LENS_Z.mount.to, 52);
    const barrel = ring(LENS.rBarrel, LENS_Z.barrel.from, LENS_Z.barrel.to, 52);
    const focus = ring(LENS.rFocus, LENS_Z.focus.from, LENS_Z.focus.to, 52);
    const bezel = ring(LENS.rBezel, LENS_Z.bezel.from, LENS_Z.bezel.to, 52);

    /* Annular shoulders between the steps, so the stack reads as machined
       rings rather than as free-floating tubes. */
    const shoulderMount = shoulder(LENS.rBarrel, LENS.rMount, LENS_Z.mount.to);
    const shoulderBarrel = shoulder(LENS.rFocus, LENS.rBarrel, LENS_Z.barrel.to);
    const shoulderFocus = shoulder(LENS.rBezel, LENS.rFocus, LENS_Z.focus.to);
    /* Front face of the bezel: an annulus, leaving the bore open. */
    const bezelFace = shoulder(LENS.rGlass - 0.01, LENS.rBezel, LENS_Z.bezel.to);

    /* ---- front lip: a thin bright metal ring at the very front --------- */
    const lip = new THREE.TorusGeometry(LENS.rBezel - 0.012, 0.014, 10, 56);
    lip.translate(0, 0, LENS_Z.bezel.to - 0.01);

    /* ---- throat: open cylinder, rendered from the inside --------------- */
    const throat = new THREE.CylinderGeometry(
      LENS.rThroat,
      LENS.rThroat,
      LENS_Z.throat.to - LENS_Z.throat.from,
      44,
      1,
      true,
    );
    throat.rotateX(Math.PI / 2);
    throat.translate(0, 0, (LENS_Z.throat.from + LENS_Z.throat.to) / 2);

    /* ---- backing disc so the tube does not read as a hole -------------- */
    const back = new THREE.CircleGeometry(LENS.rThroat, 44);
    back.translate(0, 0, LENS_Z.irisBack);

    /* ---- knurl tooth: radial thickness x tangential width x axial run -- */
    const knurl = new THREE.BoxGeometry(0.03, 0.017, (LENS_Z.focus.to - LENS_Z.focus.from) * 0.8);

    /* ---- one iris blade ------------------------------------------------ */
    const blade = new THREE.BoxGeometry(IRIS.halfWidth * 2, IRIS.reach - IRIS.opening, IRIS.thickness);

    /* ---- domed front element ------------------------------------------ */
    // A spherical cap, not a flat disc: the curvature is what makes the
    // highlight travel across the glass instead of sitting on it.
    const sphereR = 1.05;
    const phi = Math.asin(LENS.rGlass / sphereR);
    const glass = new THREE.SphereGeometry(sphereR, 48, 20, 0, Math.PI * 2, 0, phi);
    glass.rotateX(Math.PI / 2);
    glass.translate(0, 0, LENS_Z.glassApex - sphereR);

    /* ---- a faint coating ring just inside the bezel -------------------- */
    const coating = new THREE.TorusGeometry(LENS.rGlass - 0.02, 0.008, 8, 48);
    coating.translate(0, 0, LENS_Z.glassApex - 0.12);

    return {
      mount,
      barrel,
      focus,
      bezel,
      shoulderMount,
      shoulderBarrel,
      shoulderFocus,
      bezelFace,
      lip,
      throat,
      back,
      knurl,
      blade,
      glass,
      coating,
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => (g as THREE.BufferGeometry).dispose());
    },
    [geo],
  );

  /* Lay out the knurl teeth around the focus ring. */
  useLayoutEffect(() => {
    const mesh = knurlRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const r = LENS.rFocus + 0.008;
    const z = (LENS_Z.focus.from + LENS_Z.focus.to) / 2;

    for (let i = 0; i < KNURL_COUNT; i += 1) {
      const a = (i / KNURL_COUNT) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, z);
      dummy.rotation.set(0, 0, a);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  /* Seven blades, each tangent to the opening circle. */
  const blades = useMemo(
    () =>
      Array.from({ length: IRIS.blades }, (_, i) => ({
        angle: (i / IRIS.blades) * Math.PI * 2,
        z: LENS_Z.irisPlane + i * IRIS.stack,
      })),
    [],
  );

  return (
    <group position={[LENS.x, LENS.y, 0]}>
      {/* ---- barrel stack ---- */}
      <mesh geometry={geo.mount} material={m.lensBody} />
      <mesh geometry={geo.barrel} material={m.lensBody} />
      <mesh geometry={geo.focus} material={m.metalDark} />
      <mesh geometry={geo.bezel} material={m.lensBody} />
      <mesh geometry={geo.shoulderMount} material={m.lensBody} />
      <mesh geometry={geo.shoulderBarrel} material={m.lensBody} />
      <mesh geometry={geo.shoulderFocus} material={m.lensBody} />
      <mesh geometry={geo.bezelFace} material={m.metalDark} />
      <mesh geometry={geo.lip} material={m.metalBright} />

      {/* ---- knurling ---- */}
      <instancedMesh
        ref={knurlRef}
        args={[geo.knurl, m.metalMid, KNURL_COUNT]}
        frustumCulled={false}
      />

      {/* ---- focus index mark: the one pale-yellow accent on the lens ---- */}
      <mesh
        material={m.yellow}
        position={[0, LENS.rFocus + 0.016, LENS_Z.focus.to - 0.03]}
        geometry={geo.knurl}
        scale={[1.15, 1.9, 0.45]}
      />

      {/* ---- interior ---- */}
      <mesh geometry={geo.throat} material={m.lensInner} />
      {/* Front-facing: m.lensInner is BackSide (it lines the tube), so the
          rear stop needs its own material or it culls away to nothing. */}
      <mesh geometry={geo.back} material={m.lensStop} />

      {/* ---- iris ---- */}
      {blades.map(({ angle, z }) => (
        <group key={angle} rotation={[0, 0, angle]}>
          <mesh
            geometry={geo.blade}
            material={m.blade}
            position={[0, (IRIS.opening + IRIS.reach) / 2, z]}
          />
        </group>
      ))}

      {/* ---- glass ---- */}
      <mesh geometry={geo.coating} material={m.metalDark} />
      <mesh geometry={geo.glass} material={m.glass} renderOrder={2} />
    </group>
  );
}
