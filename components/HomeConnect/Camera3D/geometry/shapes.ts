import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * GEOMETRY HELPERS
 * ================
 *
 * Everything the object is made of is generated here from primitives and
 * extruded profiles — no loaded model, no external asset.
 *
 * Two ideas carry most of the weight:
 *
 *  1. `extrudeCentred` — a bevelled `ExtrudeGeometry`. Every large surface is
 *     an extruded rounded profile with a 4-segment bevel, so every silhouette
 *     edge catches a highlight instead of terminating in a hard corner.
 *
 *  2. `bake` + `merge` — the object is completely static, so parts sharing a
 *     material are welded into one buffer at build time. This is what pays
 *     for the extra detail in Stage 1B: the part count roughly doubled while
 *     the draw call count went *down*.
 */

/* ------------------------------------------------------------ profiles ---- */

/** Rounded rectangle with independent top/bottom corner radii. */
export function roundedRectShape(w: number, h: number, rTop: number, rBot: number): THREE.Shape {
  const x = w / 2;
  const y = h / 2;
  const rt = Math.min(rTop, x, y);
  const rb = Math.min(rBot, x, y);

  const s = new THREE.Shape();
  s.moveTo(-x + rb, -y);
  s.lineTo(x - rb, -y);
  s.quadraticCurveTo(x, -y, x, -y + rb);
  s.lineTo(x, y - rt);
  s.quadraticCurveTo(x, y, x - rt, y);
  s.lineTo(-x + rt, y);
  s.quadraticCurveTo(-x, y, -x, y - rt);
  s.lineTo(-x, -y + rb);
  s.quadraticCurveTo(-x, -y, -x + rb, -y);
  s.closePath();
  return s;
}

/**
 * Trapezoid with rounded corners — the prism hump. Sides draft inward toward
 * the top, which is the difference between "a housing" and "a box on a lid".
 */
export function trapezoidShape(
  wBase: number,
  wTop: number,
  h: number,
  r: number,
): THREE.Shape {
  const xb = wBase / 2;
  const xt = wTop / 2;
  const y = h / 2;
  const rr = Math.min(r, xt, y / 2);

  const s = new THREE.Shape();
  s.moveTo(-xb + rr, -y);
  s.lineTo(xb - rr, -y);
  s.quadraticCurveTo(xb, -y, xb - rr * 0.2, -y + rr);
  s.lineTo(xt, y - rr);
  s.quadraticCurveTo(xt, y, xt - rr, y);
  s.lineTo(-xt + rr, y);
  s.quadraticCurveTo(-xt, y, -xt, y - rr);
  s.lineTo(-xb + rr * 0.2, -y + rr);
  s.quadraticCurveTo(-xb, -y, -xb + rr, -y);
  s.closePath();
  return s;
}

/**
 * Bevelled extrusion, centred on its own depth so the mesh can be positioned
 * by its middle rather than its back face.
 *
 * `depth` is the TOTAL depth including both bevel caps.
 */
export function extrudeCentred(
  shape: THREE.Shape,
  depth: number,
  bevel = 0.05,
  curveSegments = 14,
): THREE.ExtrudeGeometry {
  // Keep the bevel from eating the whole extrusion on thin parts.
  const b = Math.min(bevel, depth / 2.5);
  const core = Math.max(depth - b * 2, 0.001);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: core,
    bevelEnabled: b > 0.0005,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments,
  });

  // ExtrudeGeometry runs from -bevelThickness to core + bevelThickness.
  geo.translate(0, 0, -core / 2);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/* ------------------------------------------------- lens-barrel elements ---- */

/**
 * Open tube along +Z. `openEnded` MUST stay true: a capped CylinderGeometry
 * puts a disc across each end, and a cap on any forward barrel section sits
 * directly over the bore — which renders as a flat black plate and hides the
 * entire lens interior behind it.
 */
export function tube(r: number, from: number, to: number, seg = 52): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(r, r, to - from, seg, 1, true);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (from + to) / 2);
  return g;
}

/** Truncated open cone along +Z — used for the inward taper of the bore. */
export function taper(
  rFront: number,
  rBack: number,
  from: number,
  to: number,
  seg = 52,
): THREE.CylinderGeometry {
  // CylinderGeometry(radiusTop, radiusBottom, ...) with +Y toward +Z after the
  // rotation below, so radiusTop becomes the FRONT radius.
  const g = new THREE.CylinderGeometry(rFront, rBack, to - from, seg, 1, true);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (from + to) / 2);
  return g;
}

/** Annular face at a given z, normal facing +Z. Closes a barrel step without
 *  blocking the bore. */
export function annulus(rInner: number, rOuter: number, z: number, seg = 52): THREE.RingGeometry {
  const g = new THREE.RingGeometry(rInner, rOuter, seg);
  g.translate(0, 0, z);
  return g;
}

/** Thin bright ring used as a machined engraving line. */
export function engraving(r: number, thickness: number, z: number, seg = 56): THREE.TorusGeometry {
  const g = new THREE.TorusGeometry(r, thickness, 8, seg);
  g.translate(0, 0, z);
  return g;
}

/* ------------------------------------------------------ merge machinery ---- */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/**
 * Apply a transform to a geometry in place and return it, so parts can be
 * positioned before being welded together.
 */
export function bake(
  geo: THREE.BufferGeometry,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
): THREE.BufferGeometry {
  _p.set(position[0], position[1], position[2]);
  _e.set(rotation[0], rotation[1], rotation[2]);
  _q.setFromEuler(_e);
  _s.set(scale[0], scale[1], scale[2]);
  _m.compose(_p, _q, _s);
  geo.applyMatrix4(_m);
  return geo;
}

/**
 * Weld a list of geometries into one buffer and dispose the sources.
 *
 * `mergeGeometries` refuses to mix indexed and non-indexed inputs and refuses
 * to mix attribute sets, so everything is normalised to non-indexed with
 * exactly position/normal/uv first. At these vertex counts (low thousands)
 * de-indexing costs nothing and removes a whole class of silent failures.
 */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = parts.map((g) => {
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();

    // Drop anything that is not position/normal/uv so the attribute sets match.
    for (const name of Object.keys(flat.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") {
        flat.deleteAttribute(name);
      }
    }
    if (!flat.getAttribute("normal")) flat.computeVertexNormals();
    if (!flat.getAttribute("uv")) {
      const count = flat.getAttribute("position").count;
      flat.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    flat.clearGroups();
    return flat;
  });

  const merged = mergeGeometries(clean, false);
  clean.forEach((g) => g.dispose());

  if (!merged) {
    // Should not happen — but never take down the hero over a geometry weld.
    return new THREE.BufferGeometry();
  }
  merged.computeBoundingSphere();
  return merged;
}

/* ----------------------------------------------------------- shadow map ---- */

/**
 * Soft radial falloff used for the contact shadow. Generated at runtime — no
 * texture is downloaded. 128px is plenty for a blurred blob.
 */
export function radialShadowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // NB: three reads `alphaMap` from the GREEN CHANNEL, not from the image's
    // alpha. The gradient must therefore be painted fully opaque as a
    // white → black luminance ramp; a white-with-alpha gradient produces a
    // hard-edged disc because the green channel is flat 255 wherever anything
    // was drawn at all.
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, size, size);

    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // A real contact shadow is dense and small at the core, then falls away
    // fast — a linear ramp reads as fog, not contact.
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.24, "rgba(190,190,190,1)");
    g.addColorStop(0.52, "rgba(92,92,92,1)");
    g.addColorStop(0.78, "rgba(24,24,24,1)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  // A data map, not a colour map: leave it linear. Tagging it sRGB makes the
  // shader decode it and crushes the mid-tones of the falloff to near nothing.
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
