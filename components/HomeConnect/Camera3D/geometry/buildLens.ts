import * as THREE from "three";
import { LENS, LENS_Z, PLINTH, IRIS } from "../proportions";
import { LathePath, tube, taper, annulus, engraving, bake, merge } from "./shapes";

/**
 * LENS ASSEMBLY — GEOMETRY
 * ========================
 *
 * A pure builder (no React, no DOM) so the exact geometry the hero renders
 * can be measured headlessly for the fit hull.
 *
 * Stage 3 replaces the stacked-cylinder barrel with TURNED profiles: every
 * band is a `LathePath` — a machinist's cross-section with filleted
 * shoulders — revolved as one continuous surface. Highlights roll across the
 * shoulders instead of kinking at hard annulus edges, and the radial
 * smooth-shading removes the faceting that made the old stack read as
 * primitives.
 *
 * The z-plan is deliberately close to Stage 2's (total protrusion, waist,
 * focus-ring position): the silhouette people signed off on stays, the
 * surfaces between its anchor points are what changed.
 *
 * Motion-coupled values — iris plane, blade budget, glass apex/radii, focus
 * ring travel — are untouched; see proportions.ts. This file owns surfaces
 * only.
 *
 * Band map (all lathe strips, merged per material):
 *
 *   satin      flange → mount collar → step collar   (three strips, one buffer)
 *   dark       aperture ring → bezel wall + face     (two strips, one buffer)
 *   barrel     the near-black waist behind the ring
 *   focusRing  rubber ring, its own buffer + its own pivot group (the rig
 *              rotates it; see LensAssembly.tsx)
 *   bezelChamfer  the bright dive from the bezel face into the bore
 */
export interface LensGeometry {
  satin: THREE.BufferGeometry;
  dark: THREE.BufferGeometry;
  barrel: THREE.BufferGeometry;
  focusRing: THREE.BufferGeometry;
  bezelChamfer: THREE.BufferGeometry;
  engravings: THREE.BufferGeometry;
  index: THREE.BufferGeometry;
  bore: THREE.BufferGeometry;
  stop: THREE.BufferGeometry;
  bladeBacking: THREE.BufferGeometry;
  knurl: THREE.BoxGeometry;
  blade: THREE.BoxGeometry;
  glass: THREE.BufferGeometry;
  glassInner: THREE.BufferGeometry;
}

/** Lathe segment count — shared by every band so joint circles align exactly. */
const SEG = 96;

export function buildLensGeometry(): LensGeometry {
  /* ---- mounting flange: rounded root, chamfered top -------------------- */
  const flange = new LathePath(PLINTH.rInner, PLINTH.from)
    .lineTo(PLINTH.r, PLINTH.from)
    // Root fillet where the flange rises off the panel.
    .fillet(PLINTH.r, PLINTH.to - 0.034, 0.03, PLINTH.rFace, PLINTH.to)
    .lineTo(PLINTH.rFace, PLINTH.to)
    .lineTo(PLINTH.rInner, PLINTH.to)
    .latheZ(SEG);

  /* ---- mount collar: rises out of the flange face ---------------------- */
  const collar = new LathePath(LENS.rMount, LENS_Z.mount.from)
    .lineTo(LENS.rMount, LENS_Z.mount.to - 0.014)
    // Rolled lip down onto the aperture-ring shoulder.
    .fillet(LENS.rMount, LENS_Z.mount.to, 0.018, LENS.rApRing, LENS_Z.mount.to)
    .lineTo(LENS.rApRing, LENS_Z.mount.to)
    .latheZ(SEG);

  /* ---- aperture ring: the waist, darker metal -------------------------- */
  const apRing = new LathePath(LENS.rApRing, LENS_Z.mount.to - 0.002)
    .lineTo(LENS.rApRing, LENS_Z.apRing.to - 0.008)
    .fillet(LENS.rApRing, LENS_Z.apRing.to, 0.014, LENS.rBarrel, LENS_Z.apRing.to + 0.004)
    .lineTo(LENS.rBarrel, LENS_Z.apRing.to + 0.004)
    .latheZ(SEG);

  /* ---- fixed barrel: near-black, mostly shadowed by the ring ----------- */
  const barrel = new LathePath(LENS.rBarrel, LENS_Z.apRing.to)
    .lineTo(LENS.rBarrel, LENS_Z.barrel.to)
    // Seat face the focus ring rides on (hidden behind the ring).
    .lineTo(LENS.rFocus - 0.03, LENS_Z.barrel.to)
    .latheZ(SEG);

  /* ---- focus ring: rubber, filleted shoulders, front face closes it ---- */
  const focusRing = new LathePath(LENS.rFocus - 0.038, LENS_Z.focus.from - 0.002)
    .fillet(LENS.rFocus - 0.038, LENS_Z.focus.from, 0.016, LENS.rFocus, LENS_Z.focus.from + 0.026)
    .lineTo(LENS.rFocus, LENS_Z.focus.to - 0.026)
    .fillet(LENS.rFocus, LENS_Z.focus.to, 0.016, LENS.rStep - 0.002, LENS_Z.focus.to)
    .lineTo(LENS.rStep - 0.002, LENS_Z.focus.to)
    .latheZ(SEG);

  /* ---- step collar: satin, carries the index mark ---------------------- */
  const stepCollar = new LathePath(LENS.rStep, LENS_Z.step.from)
    .lineTo(LENS.rStep, LENS_Z.step.to - 0.012)
    .fillet(LENS.rStep, LENS_Z.step.to, 0.014, LENS.rBezel, LENS_Z.step.to + 0.006)
    .lineTo(LENS.rBezel, LENS_Z.step.to + 0.006)
    .latheZ(SEG);

  /* ---- bezel: dark retaining ring with a rounded lip ------------------- */
  const bezel = new LathePath(LENS.rBezel, LENS_Z.step.to + 0.004)
    .lineTo(LENS.rBezel, LENS_Z.bezel.to - 0.014)
    .fillet(LENS.rBezel, LENS_Z.bezel.to, 0.012, LENS.rBezel - 0.026, LENS_Z.bezel.to)
    .lineTo(LENS.rBezel - 0.026, LENS_Z.bezel.to)
    .latheZ(SEG);

  /* ---- bright chamfer: the dive from the bezel face into the bore ------ */
  const bezelChamfer = new LathePath(LENS.rBezel - 0.028, LENS_Z.bezel.to)
    .lineTo(LENS.rMouth, LENS_Z.mouth)
    .latheZ(SEG);

  /* ---- weld per material ------------------------------------------------ */
  const satin = merge([flange, collar, stepCollar]);
  const dark = merge([apRing, bezel]);

  /* ---- fine engraved lines --------------------------------------------- */
  const engravings = merge([
    engraving(LENS.rMount + 0.002, 0.005, LENS_Z.mount.from + 0.03, 64),
    engraving(LENS.rStep + 0.002, 0.0045, LENS_Z.step.from + 0.03, 64),
  ]);

  /* ---- bore interior: taper into the throat, seen from inside ---------- */
  const bore = merge([
    taper(LENS.rMouth, LENS.rThroat, LENS_Z.throat.to, LENS_Z.mouth, SEG),
    tube(LENS.rThroat, LENS_Z.throat.from, LENS_Z.throat.to, SEG),
  ]);

  /* ---- rear stop + internal baffles ------------------------------------ */
  const stop = merge([
    bake(new THREE.CircleGeometry(LENS.rThroat, 48), [0, 0, LENS_Z.irisBack]),
    annulus(LENS.rThroat - 0.055, LENS.rThroat, LENS_Z.throat.to - 0.02, 48),
    annulus(LENS.rThroat - 0.038, LENS.rThroat, LENS_Z.throat.to - 0.1, 48),
  ]);

  /* ---- knurl tooth: radial depth × tangential width × axial run -------- */
  const knurl = new THREE.BoxGeometry(
    0.02,
    0.03,
    (LENS_Z.focus.to - LENS_Z.focus.from) * 0.74,
  );

  /* ---- one blade, instanced seven times -------------------------------- */
  // Baked with the INNER edge on y=0 and the body running out to +Y, so an
  // instance's position along its own +Y axis is literally the aperture
  // radius. The whole actuation is then one number. The blade box and the
  // instancing are Stage 2 fixtures — left exactly as they were.
  const bladeLen = IRIS.reach - IRIS.opening;
  const blade = new THREE.BoxGeometry(IRIS.halfWidth * 2, bladeLen, IRIS.thickness);
  blade.translate(0, bladeLen / 2, 0);

  // Static disc directly behind the blades, same material. As the blades
  // retract they uncover this instead of uncovering the near-black rear
  // stop, so stopping down reads as the opening shrinking rather than as a
  // ring of daylight opening up at the bore wall.
  const bladeBacking = annulus(
    IRIS.backingFrom,
    IRIS.backingTo,
    LENS_Z.irisPlane - 0.008,
    48,
  );

  /* ---- domed front element --------------------------------------------- */
  // A shallow spherical cap. R=1.05 (Stage 1) was a 0.13 bulge that read as
  // a glass marble. R=2.2 flattened it so far that every normal pointed at
  // the camera. R=1.45 keeps enough curvature for the highlight to travel
  // across the glass. UNCHANGED from Stage 2 — this is a signed-off surface
  // and the rig modulates its envMapIntensity live.
  const sphereR = 1.45;
  const phi = Math.asin(LENS.rGlass / sphereR);
  const glass = new THREE.SphereGeometry(sphereR, 56, 20, 0, Math.PI * 2, 0, phi);
  glass.rotateX(Math.PI / 2);
  glass.translate(0, 0, LENS_Z.glassApex - sphereR);

  /* ---- second element, concave, set back down the bore ----------------- */
  // rotateX(-PI/2) puts the pole at -Z, so the cap curves AWAY from the
  // viewer and its rim stands in front of its centre: a concave surface,
  // which catches its highlight in the opposite sense to the front element.
  // The two lights at two depths are the depth cue. UNCHANGED from Stage 2.
  const innerR = 0.85;
  const innerRim = 0.38;
  const innerPhi = Math.asin(innerRim / innerR);
  const glassInner = new THREE.SphereGeometry(innerR, 48, 16, 0, Math.PI * 2, 0, innerPhi);
  glassInner.rotateX(-Math.PI / 2);
  glassInner.translate(0, 0, LENS_Z.innerApex + innerR);

  /* ---- the one index mark ---------------------------------------------- */
  // Focus index at twelve o'clock, pointing back at the focus ring. One
  // deliberate mark — an arc of graduations was tried and cut (it read as
  // scattered dirt at hero size).
  const index = bake(new THREE.BoxGeometry(0.028, 0.016, 0.055), [
    0,
    LENS.rStep + 0.005,
    LENS_Z.step.from + 0.038,
  ]);

  return {
    satin,
    dark,
    barrel,
    focusRing,
    bezelChamfer,
    engravings,
    index,
    bore,
    stop,
    bladeBacking,
    knurl,
    blade,
    glass,
    glassInner,
  };
}
