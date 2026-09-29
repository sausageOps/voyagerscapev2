"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LENS, LENS_Z, IRIS, PLINTH, KNURL } from "../proportions";
import { tube, taper, annulus, engraving, bake, merge } from "../geometry/shapes";
import type { CameraMaterials } from "../materials/materials";

/**
 * LENS ASSEMBLY
 * =============
 *
 * The focal point of the object. Stage 1 built this as a monotonic taper of
 * four same-coloured rings, which is why it read as one dark cylinder with
 * something shiny in it. Stage 1B rebuilds it as a real optical stack with a
 * *non-monotonic* profile, which is the thing that actually reads as a lens:
 *
 *   plinth ─ mount ─┐              ┌─ focus ring ─┐
 *                   └─ ap. ring ───┘  (proud)     └─ step ─ bezel
 *
 * Stepping in to a waist at the aperture ring and back out to a proud,
 * rubber-knurled focus ring gives four shoulder lines that each catch the key
 * light, so the barrel is legible as an assembly of parts instead of a shape.
 *
 * Depth cues, in order of how much work they do:
 *   1. the proud focus ring, which throws a shadow line on both sides
 *   2. the bright machined annulus on the bezel face, ringing the dark bore
 *   3. the bore itself — taper into throat, with the iris visible well inside
 *   4. the glass, a shallow cap recessed behind the bezel lip
 *
 * The iris is genuine geometry: seven straight-edged blades, each tangent to
 * a circle of radius `IRIS.opening`. It is static in Stage 1B.
 *
 * Every static part sharing a material is welded with `merge()`, so this whole
 * assembly is twelve draw calls despite roughly doubling in part count.
 */
export default function LensAssembly({ materials: m }: { materials: CameraMaterials }) {
  const knurlRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => {
    /** Annular shoulder whose face points BACK down the barrel (-Z). Used
     *  where the stack steps outward and the step would otherwise be an
     *  invisible one-sided face. */
    const annulusBack = (rIn: number, rOut: number, z: number, seg = 52) => {
      const g = new THREE.RingGeometry(rIn, rOut, seg);
      g.rotateX(Math.PI);
      g.translate(0, 0, z);
      return g;
    };

    /* ---- mounting plinth on the body face ------------------------------ */
    // A chamfered boss the barrel grows out of. Without it the lens simply
    // pierces a flat wall, which is most of why Stage 1 read as "a cylinder
    // placed near a box".
    const plinth = merge([
      tube(PLINTH.r, PLINTH.from, PLINTH.to - PLINTH.chamfer, 56),
      annulus(LENS.rMount - 0.004, PLINTH.r - PLINTH.chamfer, PLINTH.to, 56),
    ]);

    // The chamfer is split out in warm metal. A dark boss on a dark panel is
    // invisible; one bright ring where the lens meets the body is what makes
    // the barrel look BOLTED ON rather than pushed through a hole.
    const plinthRing = taper(
      PLINTH.r - PLINTH.chamfer,
      PLINTH.r,
      PLINTH.to - PLINTH.chamfer,
      PLINTH.to,
      56,
    );

    /* ---- barrel, in two alternating values ------------------------------ */
    // Viewed close to head-on the axial steps compress into concentric rings,
    // so shading alone cannot separate them — in Stage 1B's first pass every
    // section was the same near-black and the whole barrel read as one
    // cylinder with a texture on it. Alternating the sections between satin
    // and near-black is what makes the stack legible as a stack.

    // Lighter: mount collar and the step in front of the focus ring.
    const barrelLight = merge([
      tube(LENS.rMount, LENS_Z.mount.from, LENS_Z.mount.to, 52),
      annulus(LENS.rApRing, LENS.rMount, LENS_Z.mount.to, 52),
      tube(LENS.rStep, LENS_Z.step.from, LENS_Z.step.to, 52),
      annulus(LENS.rStep, LENS.rFocus, LENS_Z.focus.to, 52),
    ]);

    // Darker: the fixed barrel at the waist, and the bezel wall.
    const barrelDark = merge([
      tube(LENS.rBarrel, LENS_Z.barrel.from, LENS_Z.barrel.to, 52),
      annulusBack(LENS.rBarrel, LENS.rFocus, LENS_Z.focus.from, 52),
      annulus(LENS.rBezel, LENS.rStep, LENS_Z.step.to, 52),
      tube(LENS.rBezel, LENS_Z.bezel.from, LENS_Z.bezel.to, 52),
    ]);

    /* ---- aperture ring: the waist -------------------------------------- */
    const apRing = merge([
      tube(LENS.rApRing, LENS_Z.apRing.from, LENS_Z.apRing.to, 52),
      annulus(LENS.rBarrel, LENS.rApRing, LENS_Z.apRing.to, 52),
    ]);

    /* ---- focus ring: proud, moulded rubber ----------------------------- */
    const focusRing = tube(LENS.rFocus, LENS_Z.focus.from, LENS_Z.focus.to, 56);

    /* ---- bezel face: dark retaining ring + a thin bright chamfer ------- */
    // A single wide warm-grey annulus here read as a fat silver washer and
    // out-competed the glass for attention. A real lens front is a DARK
    // retaining ring with a narrow bright chamfer at the outer edge only.
    const bezelFace = annulus(LENS.rMouth, LENS.rBezel - 0.026, LENS_Z.bezel.to, 56);
    const bezelChamfer = annulus(LENS.rBezel - 0.026, LENS.rBezel, LENS_Z.bezel.to, 56);

    /* ---- fine engraved lines ------------------------------------------- */
    const engravings = merge([
      engraving(LENS.rMount + 0.002, 0.005, LENS_Z.mount.from + 0.022, 56),
      engraving(LENS.rStep + 0.002, 0.0045, LENS_Z.step.from + 0.026, 56),
    ]);

    /* ---- bore interior: taper into the throat, seen from inside -------- */
    const bore = merge([
      taper(LENS.rMouth, LENS.rThroat, LENS_Z.throat.to, LENS_Z.mouth, 48),
      tube(LENS.rThroat, LENS_Z.throat.from, LENS_Z.throat.to, 48),
    ]);

    /* ---- rear stop + internal baffles ---------------------------------- */
    // Baffles are the detail that reads as "optics" rather than "tube": two
    // thin concentric steps down the bore, catching just enough light to
    // describe how far back the interior goes.
    const stop = merge([
      bake(new THREE.CircleGeometry(LENS.rThroat, 48), [0, 0, LENS_Z.irisBack]),
      annulus(LENS.rThroat - 0.055, LENS.rThroat, LENS_Z.throat.to - 0.02, 48),
      annulus(LENS.rThroat - 0.038, LENS.rThroat, LENS_Z.throat.to - 0.1, 48),
    ]);

    /* ---- knurl tooth: radial depth x tangential width x axial run ------ */
    const knurl = new THREE.BoxGeometry(
      0.02,
      0.03,
      (LENS_Z.focus.to - LENS_Z.focus.from) * 0.78,
    );

    /* ---- seven blades, welded into one buffer -------------------------- */
    const blades = merge(
      Array.from({ length: IRIS.blades }, (_, i) => {
        const a = (i / IRIS.blades) * Math.PI * 2;
        const g = new THREE.BoxGeometry(
          IRIS.halfWidth * 2,
          IRIS.reach - IRIS.opening,
          IRIS.thickness,
        );
        // Offset along the blade's own +Y, then swung into place.
        const midR = (IRIS.opening + IRIS.reach) / 2;
        bake(g, [0, midR, LENS_Z.irisPlane + i * IRIS.stack]);
        g.rotateZ(a);
        return g;
      }),
    );

    /* ---- domed front element ------------------------------------------- */
    // A shallow spherical cap. Stage 1 used R=1.05, which at this aperture is
    // a 0.13-deep bulge — it read as a glass marble sitting on the barrel and
    // it was the main reason the iris behind it looked like a cut gemstone.
    // R=2.2 gives a 0.058 sag: a lens element, not a bauble.
    // R=1.05 (Stage 1) was a 0.13 bulge that read as a glass marble. R=2.2
    // flattened it so far that every normal pointed at the camera and the
    // element reflected one flat value — a smoked plastic disc. R=1.45 keeps
    // enough curvature for the highlight to travel across the glass.
    const sphereR = 1.45;
    const phi = Math.asin(LENS.rGlass / sphereR);
    const glass = new THREE.SphereGeometry(sphereR, 56, 20, 0, Math.PI * 2, 0, phi);
    glass.rotateX(Math.PI / 2);
    glass.translate(0, 0, LENS_Z.glassApex - sphereR);

    /* ---- second element, concave, set back down the bore --------------- */
    // rotateX(-PI/2) puts the pole at -Z, so the cap curves AWAY from the
    // viewer and its rim stands in front of its centre: a concave surface,
    // which catches its highlight in the opposite sense to the front
    // element. The two lights at two depths are the depth cue.
    const innerR = 0.85;
    const innerRim = 0.38;
    const innerPhi = Math.asin(innerRim / innerR);
    const glassInner = new THREE.SphereGeometry(innerR, 48, 16, 0, Math.PI * 2, 0, innerPhi);
    glassInner.rotateX(-Math.PI / 2);
    glassInner.translate(0, 0, LENS_Z.innerApex + innerR);

    /* ---- the one index mark -------------------------------------------- */
    // Focus index on the step ring, at twelve o'clock, pointing back at the
    // focus ring — the one mark a photographer would actually line up.
    //
    // An arc of aperture graduations was tried here and cut: at hero size
    // nine small yellow marks around the collar read as scattered dirt
    // rather than as a scale, and they fought the single index for
    // attention. One deliberate mark is worth nine decorative ones.
    const index = bake(new THREE.BoxGeometry(0.028, 0.016, 0.055), [
      0,
      LENS.rStep + 0.005,
      LENS_Z.step.from + 0.036,
    ]);

    return {
      plinth,
      plinthRing,
      barrelLight,
      barrelDark,
      apRing,
      focusRing,
      bezelFace,
      bezelChamfer,
      engravings,
      bore,
      stop,
      knurl,
      blades,
      glass,
      glassInner,
      index,
    };
  }, []);

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

  return (
    <group position={[LENS.x, LENS.y, 0]}>
      {/* ---- mounting hardware ---- */}
      <mesh geometry={geo.plinth} material={m.satin} />
      <mesh geometry={geo.plinthRing} material={m.metalMid} />

      {/* ---- barrel ---- */}
      <mesh geometry={geo.barrelLight} material={m.satin} />
      <mesh geometry={geo.barrelDark} material={m.lensBody} />
      <mesh geometry={geo.apRing} material={m.metalDark} />
      <mesh geometry={geo.focusRing} material={m.rubber} />
      <mesh geometry={geo.bezelFace} material={m.metalDark} />
      <mesh geometry={geo.bezelChamfer} material={m.metalMid} />
      <mesh geometry={geo.engravings} material={m.metalBright} />

      {/* ---- knurling ---- */}
      <instancedMesh
        ref={knurlRef}
        args={[geo.knurl, m.rubber, KNURL.focus]}
        frustumCulled={false}
      />

      {/* ---- index marks ---- */}
      <mesh geometry={geo.index} material={m.yellow} />

      {/* ---- interior ---- */}
      {/* m.lensInner is BackSide (it lines the tube), so the rear stop needs
          its own front-facing material or it culls away to nothing. */}
      <mesh geometry={geo.bore} material={m.lensInner} />
      <mesh geometry={geo.stop} material={m.lensStop} />

      {/* ---- iris ---- */}
      <mesh geometry={geo.blades} material={m.blade} />

      {/* ---- glass ---- */}
      <mesh geometry={geo.glassInner} material={m.glassInner} renderOrder={2} />
      <mesh geometry={geo.glass} material={m.glass} renderOrder={3} />
    </group>
  );
}
