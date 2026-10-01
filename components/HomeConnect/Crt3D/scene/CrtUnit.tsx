"use client";

import { forwardRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { FRONT_Z, MARKING, SCREEN } from "../proportions";
import type { MonitorGeometry } from "../geometry/monitor";
import type { CrtMaterials } from "../materials/materials";
import { PALETTE } from "../materials/palette";

/**
 * ONE MACHINE
 * ===========
 *
 * A complete monitor: housing, tube, controls, base and the point light
 * its own screen throws onto its own bezel. Purely presentational — it
 * places meshes and holds refs, and never writes a transform itself.
 * `CrtRig` owns the one frame loop that drives both units.
 *
 * SHARED BUFFERS, SEPARATE EVERYTHING ELSE
 * ----------------------------------------
 * Both units are handed the SAME `MonitorGeometry` — the same vertex
 * buffers, uploaded once. Two monitors therefore cost twice the draw
 * calls and none of the extra memory or build time, which is the whole
 * reason the geometry was moved out into pure functions in the first
 * iteration.
 *
 * What is NOT shared is anything that makes the second machine a second
 * machine: its own materials (tinted toward the page for distance), its
 * own canvas and CanvasTexture, its own shader instance and uniforms, its
 * own contact shadow, its own spill light. The saving is on the expensive
 * thing; the difference is kept on the cheap ones.
 *
 * THE SPILL LIGHT LIVES HERE, NOT IN THE LIGHTING RIG
 * ---------------------------------------------------
 * It is parented inside the unit, so it turns and moves with the monitor
 * and stays locked a fixed distance in front of its own tube. A screen
 * glow that stays put while the object it belongs to rotates reads
 * instantly as a lamp in the room rather than as light coming off the
 * picture.
 */
const CrtUnit = forwardRef<THREE.Group, {
  geometry: MonitorGeometry;
  materials: CrtMaterials;
  crtMaterial: THREE.ShaderMaterial;
  powerRef: MutableRefObject<THREE.Group | null>;
  spillRef: MutableRefObject<THREE.PointLight | null>;
  /** Spill distance falloff. The smaller tube lights a smaller area. */
  spillDistance?: number;
}>(function CrtUnit(
  { geometry, materials, crtMaterial, powerRef, spillRef, spillDistance = 3.2 },
  ref,
) {
  const { housing, screen, controls, base } = geometry;

  /* The marking's plane is sized from its own artwork so the type is
     never stretched: the height is authored, the width follows the
     raster. Right-aligned to the control aperture, so the plane's centre
     is half its width inboard of that edge. */
  const markW = MARKING.h * ((materials.marking.userData.aspect as number) || 10);

  return (
    <group ref={ref}>
      {/* ---------------------------------------------------- housing --- */}
      <mesh geometry={housing.bezel} material={materials.bezel} />
      <mesh geometry={housing.wall} material={materials.bezelInner} />
      <mesh geometry={housing.rear} material={materials.shellRear} />
      <mesh geometry={housing.seam} material={materials.seam} />
      <mesh geometry={housing.ventPlate} material={materials.shellRear} />
      <mesh geometry={housing.ventFloor} material={materials.vent} />

      {/* ------------------------------------------------------ tube --- */}
      <group position={[0, SCREEN.cy, 0]}>
        <mesh
          geometry={screen.mask}
          material={materials.tubeMask}
          position={[0, 0, SCREEN.imageZ - 0.008]}
        />
        <mesh geometry={screen.image} material={crtMaterial} position={[0, 0, SCREEN.imageZ]} />
        {/* Drawn last: a transparent surface with depthWrite off has to
            composite over a picture that is already in the buffer. */}
        <mesh
          geometry={screen.glass}
          material={materials.glass}
          position={[0, 0, SCREEN.glassZ]}
          renderOrder={4}
        />
      </group>

      {/* --------------------------------------------- control panel ---
          One recessed fascia insert with the speaker slots cut through
          it, one dark cavity behind, and everything else standing proud
          of the same part. The insert is moulded in the rear shell's
          slightly deeper cream rather than a new tone — it is a
          different shot of the same resin, which is what a recessed
          fascia actually was. */}
      <mesh geometry={controls.panelFloor} material={materials.vent} />
      <mesh geometry={controls.panel} material={materials.shellRear} />
      <mesh geometry={controls.buttons} material={materials.button} />
      {/* The badge plinths are RAISED, so they are moulded in the bezel's
          own plastic. They had been painted in `buttonWell` — the colour
          reserved for the inside of a recess — which made two blank tabs
          stick out of the fascia in a tone that only makes sense in a
          hole. Same geometry, correct material. */}
      <mesh geometry={controls.badges} material={materials.bezel} />

      {/* ------------------------------------------- fascia marking ---
          Pad-printed artwork on the bezel, in the clear band between the
          aperture and the control strip. It is a child of the unit, so
          it turns with the casting, takes the same key and softbox as
          the plastic it sits on, and goes into shadow with it — which is
          the whole difference between printing and an overlay. */}
      <mesh
        material={materials.marking}
        position={[MARKING.right - markW / 2, MARKING.y, FRONT_Z + MARKING.z]}
        renderOrder={2}
      >
        <planeGeometry args={[markW, MARKING.h]} />
      </mesh>

      <group ref={powerRef} position={geometry.powerOrigin}>
        <mesh geometry={controls.power} material={materials.buttonPower} />
      </group>

      <group position={geometry.ledOrigin}>
        <mesh geometry={controls.led} material={materials.led} rotation={[Math.PI / 2, 0, 0]} />
        <mesh
          geometry={controls.ledLens}
          material={materials.ledLens}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, 0.004]}
          renderOrder={3}
        />
      </group>

      {/* ------------------------------------------------------ base --- */}
      <mesh geometry={base} material={materials.shell} />

      {/* --------------------------------------------- the tube's own
          contribution to the room. Weak, short-range, and driven every
          frame from the mean luminance of this unit's canvas. A CRT
          throws very little light in a lit room; overdriving this is the
          fastest way to make the object look like it is on fire. ------ */}
      <pointLight
        ref={spillRef}
        color={PALETTE.screenSpill}
        intensity={0}
        distance={spillDistance}
        decay={2}
        position={[0, SCREEN.cy, FRONT_Z + 0.42]}
      />
    </group>
  );
});

export default CrtUnit;
