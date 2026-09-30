import * as THREE from "three";
import { TOP_Y, DIAL, SHUTTER } from "../proportions";
import { LathePath, bake } from "./shapes";

/**
 * TOP-DECK CONTROLS — GEOMETRY
 * ============================
 *
 * Pure builder (no React, no DOM). The dial, collar and button are lathe-
 * turned in Stage 3: filleted roots, rolled lips, and the shutter button is
 * ONE continuous profile (wall → tangent dome) instead of a welded cylinder
 * + sphere cap — the silhouette can no longer part at the seam, whatever the
 * press spring does to it.
 *
 * The travel bounds are Stage 2 fixtures and are preserved EXACTLY:
 *
 *   collarTop = TOP_Y + 0.066
 *   button skirt bottom = collarTop − SHUTTER.skirt (0.055)
 *   collar bore bottom  = collarTop − SHUTTER.bore  (0.115)
 *
 * → at full press (0.045) the skirt bottom sits at collarTop − 0.100, still
 *   0.015 inside the bore wall. No gap can open around the button.
 *
 * Bases extend to TOP_Y − 0.03 so the parts stay seated in the DRAFTED plate
 * (the taper puts the deck at ≈ 0.955 at the dial's position) instead of
 * floating on the slope.
 */
export interface ControlsGeometry {
  seat: THREE.BufferGeometry;
  dialMetal: THREE.BufferGeometry;
  dialFace: THREE.BufferGeometry;
  knurl: THREE.BoxGeometry;
  collar: THREE.BufferGeometry;
  collarLip: THREE.BufferGeometry;
  button: THREE.BufferGeometry;
  hitProxy: THREE.BufferGeometry;
  index: THREE.BufferGeometry;
}

export function buildControlsGeometry(): ControlsGeometry {
  /* ------------------------------------------------------- mode dial --- */
  const dialBase = TOP_Y + 0.012;
  const dialTopY = dialBase + DIAL.h;
  const dialWellY = dialTopY - 0.016;

  // Moulded boss in the plate casting, so the dial emerges from the deck
  // instead of sitting on it.
  const seat = bake(
    new LathePath(DIAL.r * 1.02, TOP_Y - 0.03)
      .lineTo(DIAL.r * 1.13, TOP_Y - 0.03)
      .lineTo(DIAL.r * 1.13, TOP_Y + 0.008)
      .fillet(DIAL.r * 1.13, TOP_Y + 0.016, 0.008, DIAL.r * 1.02, TOP_Y + 0.016)
      .lineTo(DIAL.r * 1.02, TOP_Y + 0.016)
      .latheY(48),
    [DIAL.x, 0, DIAL.z],
  );

  // Skirt + rolled lip + recessed brushed well — one continuous cup.
  const dialMetal = bake(
    new LathePath(DIAL.r, dialBase)
      .lineTo(DIAL.r, dialTopY - 0.008)
      .fillet(DIAL.r, dialTopY, 0.009, DIAL.rInner, dialTopY)
      .lineTo(DIAL.rInner, dialTopY)
      .lineTo(DIAL.rInner, dialWellY)
      .latheY(48),
    [DIAL.x, 0, DIAL.z],
  );

  const dialFace = (() => {
    const g = new THREE.CircleGeometry(DIAL.rInner, 40);
    g.rotateX(-Math.PI / 2);
    return bake(g, [DIAL.x, dialWellY, DIAL.z]);
  })();

  const knurl = new THREE.BoxGeometry(0.016, DIAL.h * 0.78, 0.022);

  /* --------------------------------------------------------- shutter --- */
  const collarTop = TOP_Y + 0.066;

  // Stepped collar: outer wall with a rounded root, lip, then the bore wall
  // descending — one lathe strip, correct normals on all three faces.
  const collar = bake(
    new LathePath(SHUTTER.rCollar, TOP_Y - 0.03)
      .lineTo(SHUTTER.rCollar, TOP_Y + 0.02)
      .fillet(SHUTTER.rCollar, collarTop, 0.01, SHUTTER.rButton + 0.012, collarTop)
      .lineTo(SHUTTER.rButton + 0.012, collarTop)
      .lineTo(SHUTTER.rButton + 0.012, collarTop - SHUTTER.bore)
      .latheY(44),
    [SHUTTER.x, 0, SHUTTER.z],
  );

  // Bright lip ring — kept as the Stage 2 torus, it reads perfectly.
  const collarLip = new THREE.TorusGeometry(SHUTTER.rCollar - 0.006, 0.009, 10, 40);
  collarLip.rotateX(Math.PI / 2);
  bake(collarLip, [SHUTTER.x, collarTop, SHUTTER.z]);

  // Button: ONE lathe — wall rising from inside the bore, then a tangent
  // "squircle" dome. The dome meets the wall vertically (dr/dz = 0 at the
  // joint), so there is no corner to catch and no seam to open.
  const buttonTop = collarTop + SHUTTER.h;
  const domeBase = buttonTop - 0.055;
  const buttonProfile = new LathePath(SHUTTER.rButton, collarTop - SHUTTER.skirt);
  buttonProfile.lineTo(SHUTTER.rButton, domeBase);
  const DOME_STEPS = 14;
  for (let i = 1; i <= DOME_STEPS; i += 1) {
    const t = (i / DOME_STEPS) * (Math.PI / 2);
    const r = Math.max(SHUTTER.rButton * Math.cos(t) ** 0.72, 0.002);
    const z = domeBase + (buttonTop - domeBase) * Math.sin(t) ** 0.72;
    buttonProfile.arcPoints([[r, z]]);
  }
  const button = bake(buttonProfile.latheY(44), [SHUTTER.x, 0, SHUTTER.z]);

  /* Generous invisible hit target over the button + collar — Stage 2 fixture,
     same size, same position. Three skips invisible objects when drawing but
     not when raycasting, so it costs one ray test and zero draw calls. */
  const hitProxy = bake(
    new THREE.SphereGeometry(SHUTTER.rCollar * 1.5, 12, 8),
    [SHUTTER.x, collarTop + 0.02, SHUTTER.z],
  );

  /* ----------------------------------------------------- index mark ---- */
  const index = bake(new THREE.BoxGeometry(0.018, 0.006, 0.05), [
    DIAL.x,
    dialTopY + 0.001,
    DIAL.z + DIAL.r * 0.72,
  ]);

  return {
    seat,
    dialMetal,
    dialFace,
    knurl,
    collar,
    collarLip,
    button,
    hitProxy,
    index,
  };
}
