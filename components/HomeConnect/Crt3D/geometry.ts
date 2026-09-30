import * as THREE from "three";
import {
  roundedRectShape,
  extrudeCentred,
  bake,
  merge,
} from "@/components/HomeConnect/Camera3D/geometry/shapes";

/**
 * CRT GEOMETRY HELPERS
 * ====================
 *
 * Reuses the camera hero's proven primitives (rounded-rect extrusion, bake,
 * merge) and adds the two the CRT needs: a curved screen panel and a bevelled
 * rounded box for the shell steps.
 */
export { roundedRectShape, extrudeCentred, bake, merge };

/** A bevelled rounded box, centred on the origin, facing +z. */
export function roundedBox(
  w: number,
  h: number,
  depth: number,
  rTop: number,
  rBot: number,
  bevel = 0.05,
): THREE.ExtrudeGeometry {
  return extrudeCentred(roundedRectShape(w, h, rTop, rBot), depth, bevel, 16);
}

/**
 * A curved screen panel: a subdivided plane bulged toward +z by a smooth
 * paraboloid, so it reads as convex CRT glass. UVs are preserved from the
 * base PlaneGeometry.
 */
export function curvedPanel(
  w: number,
  h: number,
  bulge: number,
  segs = 40,
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(w, h, segs, segs);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hw = w / 2;
  const hh = h / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / hw;
    const ny = y / hh;
    // Rounded-corner-friendly bulge: product of two cosine humps.
    const z = bulge * Math.cos((nx * Math.PI) / 2) * Math.cos((ny * Math.PI) / 2);
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * A frame (rounded-rect with a rounded-rect hole), extruded. Used for the
 * screen bezel. The hole is the aperture.
 */
export function frameGeometry(
  outerW: number,
  outerH: number,
  outerRTop: number,
  outerRBot: number,
  holeW: number,
  holeH: number,
  holeR: number,
  depth: number,
  bevel = 0.03,
): THREE.ExtrudeGeometry {
  const shape = roundedRectShape(outerW, outerH, outerRTop, outerRBot);
  const hole = roundedRectShape(holeW, holeH, holeR, holeR);
  shape.holes.push(hole);
  return extrudeCentred(shape, depth, bevel, 16);
}
