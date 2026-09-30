import * as THREE from "three";
import {
  mergeGeometries,
  toCreasedNormals,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * GEOMETRY HELPERS
 * ================
 *
 * Everything the object is made of is generated here from primitives and
 * extruded profiles — no loaded model, no external asset.
 *
 * Three ideas carry most of the weight:
 *
 *  1. `extrudeCentred` — a bevelled `ExtrudeGeometry`. Every large surface is
 *     an extruded rounded profile, so every silhouette edge catches a
 *     highlight instead of terminating in a hard corner.
 *
 *  2. `LathePath` — a turned profile with real fillets. Stage 3's lens and
 *     controls are lathes rather than stacked primitives: the profile is a
 *     machinist's drawing (line → fillet → line), and the revolution smooth-
 *     shades around the axis, so highlights roll across the barrel instead
 *     of stepping across radial facets.
 *
 *  3. `bake` + `merge` — the object is completely static, so parts sharing a
 *     material are welded into one buffer at build time. This is what pays
 *     for the extra detail: the part count roughly doubled while the draw
 *     call count stayed flat.
 *
 * Bevel direction note (verified against three r169, not assumed):
 * ExtrudeGeometry places the AUTHORED shape at the two caps and EXPANDS it
 * by `bevelSize` through the mid-band. For a shape with holes that means the
 * hole is widest at the caps and narrows toward the middle — which is why
 * the front pocket's mouth rolls inward like a drafted mould wall, and why
 * parts seated in a hole are authored oversized so they embed rather than
 * reveal a crack.
 */

/* ------------------------------------------------------------ profiles ---- */

/** Trace a rounded rectangle with independent top/bottom corner radii. */
function traceRoundedRect(
  s: THREE.Path,
  w: number,
  h: number,
  rTop: number,
  rBot: number,
  cx: number,
  cy: number,
): THREE.Path {
  const x = w / 2;
  const y = h / 2;
  const rt = Math.min(rTop, x, y);
  const rb = Math.min(rBot, x, y);

  s.moveTo(cx + (-x + rb), cy + -y);
  s.lineTo(cx + (x - rb), cy + -y);
  s.quadraticCurveTo(cx + x, cy + -y, cx + x, cy + (-y + rb));
  s.lineTo(cx + x, cy + (y - rt));
  s.quadraticCurveTo(cx + x, cy + y, cx + (x - rt), cy + y);
  s.lineTo(cx + (-x + rt), cy + y);
  s.quadraticCurveTo(cx + -x, cy + y, cx + -x, cy + (y - rt));
  s.lineTo(cx + -x, cy + (-y + rb));
  s.quadraticCurveTo(cx + -x, cy + -y, cx + (-x + rb), cy + -y);
  s.closePath();
  return s;
}

/** Rounded rectangle shape, centred on the origin. */
export function roundedRectShape(w: number, h: number, rTop: number, rBot: number): THREE.Shape {
  return traceRoundedRect(new THREE.Shape(), w, h, rTop, rBot, 0, 0) as THREE.Shape;
}

/**
 * The same rounded rectangle traced onto a THREE.Path — for use as a hole.
 * `cx`/`cy` offset the rectangle inside the parent shape.
 *
 * The winding is counter-clockwise; ExtrudeGeometry normalises hole winding
 * itself, so the same tracer serves both contours and holes.
 */
export function roundedRectPath(
  w: number,
  h: number,
  rTop: number,
  rBot: number,
  cx = 0,
  cy = 0,
): THREE.Path {
  return traceRoundedRect(new THREE.Path(), w, h, rTop, rBot, cx, cy);
}

/**
 * Ring shape: a rounded-rect contour with a rounded-rect hole, both centred
 * on (cx, cy). This is the collar/gasket primitive — extruded with bevels it
 * yields a frame whose outer rim AND bore mouth are both chamfered.
 */
export function roundedRectRing(
  outerW: number,
  outerH: number,
  rTopOut: number,
  rBotOut: number,
  innerW: number,
  innerH: number,
  rTopIn: number,
  rBotIn: number,
  cx = 0,
  cy = 0,
): THREE.Shape {
  const shape = roundedRectShape(outerW, outerH, rTopOut, rBotOut);
  shape.holes.push(roundedRectPath(innerW, innerH, rTopIn, rBotIn, cx, cy));
  return shape;
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
  bevelSegments = 4,
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
    bevelSegments,
    curveSegments,
  });

  // ExtrudeGeometry runs from -bevelThickness to core + bevelThickness.
  geo.translate(0, 0, -core / 2);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/* --------------------------------------------------------- lathe paths ---- */

/**
 * A 2D machinist's profile in (r, z), revolved into a surface.
 *
 * Profiles are authored the way a turned part is drawn: start at the base,
 * run up the outer wall, then in across the top face. That traversal gives
 * outward-pointing normals on the wall and viewer-facing normals on the top
 * (verified against LatheGeometry's winding) — and a profile that continues
 * BACK DOWN an inner bore keeps correct inward-facing normals, so cups and
 * collars are one continuous strip.
 *
 * `fillet` rounds the corner between the incoming leg and the outgoing leg.
 * The maths is the standard two-line fillet: tangent points at
 * t = radius / tan(θ/2) either side of the corner, arc centre on the
 * bisector at radius / sin(θ/2). The same formula produces convex round-overs
 * (material removed) and concave root fillets (material added) — which one
 * you get depends only on which way the profile turns, which is exactly how
 * a drawing behaves.
 */
export class LathePath {
  private pts: THREE.Vector2[] = [];

  constructor(r: number, z: number) {
    this.pts.push(new THREE.Vector2(r, z));
  }

  /** Straight segment to (r, z). */
  lineTo(r: number, z: number): this {
    this.pts.push(new THREE.Vector2(r, z));
    return this;
  }

  /**
   * Round the corner at (cornerR, cornerZ) — the intersection of the line
   * through the current point and the line toward (outR, outZ) — and leave
   * the path at the tangent point on the outgoing leg. Follow with
   * `lineTo(outR, outZ)` to complete the leg.
   */
  fillet(cornerR: number, cornerZ: number, radius: number, outR: number, outZ: number): this {
    const c = new THREE.Vector2(cornerR, cornerZ);
    const out = new THREE.Vector2(outR, outZ);
    const prev = this.pts[this.pts.length - 1];

    const d1 = prev.clone().sub(c);
    const d2 = out.clone().sub(c);
    const l1 = d1.length();
    const l2 = d2.length();
    if (l1 < 1e-6 || l2 < 1e-6) {
      this.pts.push(c.clone());
      return this;
    }
    d1.divideScalar(l1);
    d2.divideScalar(l2);

    // Interior angle between the legs at the corner.
    const cosTheta = THREE.MathUtils.clamp(d1.dot(d2), -1, 1);
    const theta = Math.acos(cosTheta);
    const turn = Math.PI - theta;
    if (turn < 0.035 || turn > Math.PI - 0.035) {
      // Effectively straight (or a spike) — no fillet to cut.
      this.pts.push(c.clone());
      return this;
    }

    // Tangent distance, clamped so the arc never runs off either leg.
    let t = radius / Math.tan(theta / 2);
    t = Math.min(t, l1 * 0.9, l2 * 0.9);
    if (t < 1e-4) {
      this.pts.push(c.clone());
      return this;
    }

    const bisector = d1.clone().add(d2).normalize();
    const h = radius / Math.sin(theta / 2);
    const center = c.clone().add(bisector.multiplyScalar(h));

    const t1 = c.clone().add(d1.clone().multiplyScalar(t));
    const t2 = c.clone().add(d2.clone().multiplyScalar(t));

    const a1 = Math.atan2(t1.y - center.y, t1.x - center.x);
    let a2 = Math.atan2(t2.y - center.y, t2.x - center.x);
    // Sweep the short way around.
    let delta = a2 - a1;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    const steps = THREE.MathUtils.clamp(Math.ceil(Math.abs(delta) / (Math.PI / 18)), 2, 12);
    for (let i = 1; i < steps; i += 1) {
      const a = a1 + (delta * i) / steps;
      this.pts.push(
        new THREE.Vector2(
          center.x + Math.cos(a) * radius,
          center.y + Math.sin(a) * radius,
        ),
      );
    }
    this.pts.push(t2);
    return this;
  }

  /** Append explicit points (r, z) — for arcs the fillet helper cannot express. */
  arcPoints(points: readonly (readonly [number, number])[]): this {
    for (const [r, z] of points) this.pts.push(new THREE.Vector2(r, z));
    return this;
  }

  /** Revolve about the Z axis (the lens/barrel convention). */
  latheZ(segments = 96): THREE.LatheGeometry {
    const g = new THREE.LatheGeometry(this.pts, segments);
    g.rotateX(Math.PI / 2); // +Y → +Z
    g.computeBoundingSphere();
    return g;
  }

  /** Revolve about the Y axis (the top-deck convention: dial, buttons). */
  latheY(segments = 64): THREE.LatheGeometry {
    const g = new THREE.LatheGeometry(this.pts, segments);
    g.computeBoundingSphere();
    return g;
  }
}

/* ---------------------------------------------------- surface treatment ---- */

/**
 * Crease-angle normals: welds coincident vertices and smooths normals only
 * where the faces meet at less than `angle`. Bevels (15°-ish steps) roll
 * smoothly; parting lines (75°+) stay crisp. This is what turns the faceted
 * extrusion bevel into a moulded round-over without softening the whole
 * object into a blob.
 */
export function creased(geo: THREE.BufferGeometry, angle = Math.PI / 6): THREE.BufferGeometry {
  const out = toCreasedNormals(geo, angle);
  geo.dispose();
  out.computeBoundingSphere();
  return out;
}

/**
 * Taper the cross-section (x and y) as a function of z: nominal at
 * `frontZ`, smaller toward the back. Applied BEFORE `creased` so normals are
 * computed on the final positions.
 */
export function draftGeometry(
  geo: THREE.BufferGeometry,
  amount: number,
  frontZ: number,
  depth: number,
): THREE.BufferGeometry {
  if (amount <= 0) return geo;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const z = pos.getZ(i);
    const s = 1 - amount * ((frontZ - z) / depth);
    pos.setXY(i, pos.getX(i) * s, pos.getY(i) * s);
  }
  pos.needsUpdate = true;
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
 * exactly position/normal/uv first. At these vertex counts (low tens of
 * thousands) de-indexing costs nothing and removes a whole class of silent
 * failures.
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
