import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * GEOMETRY HELPERS
 * ================
 *
 * Everything the monitor is made of is generated here from profiles and
 * lofts. Nothing is loaded; there is no model file anywhere in this feature.
 *
 * Three ideas carry the object:
 *
 *  1. `extrudeCentred` with HOLES — the front casting is one extruded profile
 *     with the screen aperture cut out of it. That single fact is what makes
 *     the bezel read as a moulding with an opening rather than a frame made
 *     of four sticks.
 *
 *  2. `loft` — the rear housing is a sequence of rounded-rectangle rings
 *     swept back and drawn in. A tapered box cannot produce the "holds its
 *     section, then draws in hard" profile a tube housing has.
 *
 *  3. `bake` + `merge` — the monitor never deforms, so every part sharing a
 *     material is welded into one buffer at build time. The whole object
 *     lands in single-digit draw calls.
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
 * Superellipse outline — the shape of a CRT aperture.
 *
 * |x/a|^n + |y/b|^n = 1. At n = 2 this is an ellipse, at n → ∞ a rectangle.
 * Around n = 5 it lands on the softly-cornered opening a moulded tube bezel
 * actually has, and — crucially — it is the same function the screen mesh
 * is built from, so the glass edge and the bezel opening are guaranteed to
 * agree everywhere instead of only at the corners.
 */
export function superellipsePath(a: number, b: number, n: number, seg = 96): THREE.Path {
  const p = new THREE.Path();
  for (let i = 0; i <= seg; i += 1) {
    const th = (i / seg) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

/** The same outline as a flat list of points, for lofting. */
export function superellipsePoints(a: number, b: number, n: number, seg = 64): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < seg; i += 1) {
    const th = (i / seg) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    pts.push(
      new THREE.Vector2(
        a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
        b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n),
      ),
    );
  }
  return pts;
}

/** Rounded rectangle as a point ring, wound counter-clockwise. */
export function roundedRectPoints(w: number, h: number, r: number, cornerSeg = 8): THREE.Vector2[] {
  const x = w / 2;
  const y = h / 2;
  const rr = Math.min(r, x, y);
  const pts: THREE.Vector2[] = [];

  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= cornerSeg; i += 1) {
      const a = a0 + (i / cornerSeg) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
    }
  };

  corner(x - rr, -y + rr, -Math.PI / 2); // bottom right
  corner(x - rr, y - rr, 0); // top right
  corner(-x + rr, y - rr, Math.PI / 2); // top left
  corner(-x + rr, -y + rr, Math.PI); // bottom left
  return pts;
}

/**
 * Bevelled extrusion, centred on its own depth.
 *
 * `depth` is the TOTAL depth including both bevel caps, so a caller can
 * position the part by its middle and know where its faces landed.
 */
export function extrudeCentred(
  shape: THREE.Shape,
  depth: number,
  bevel = 0.04,
  curveSegments = 16,
): THREE.ExtrudeGeometry {
  const b = Math.min(bevel, depth / 2.5);
  const core = Math.max(depth - b * 2, 0.001);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: core,
    bevelEnabled: b > 0.0005,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: 3,
    curveSegments,
  });

  geo.translate(0, 0, -core / 2);
  geo.computeVertexNormals();
  return geo;
}

/* ---------------------------------------------------------------- loft ---- */

export interface LoftRing {
  points: THREE.Vector2[];
  z: number;
  /** Vertical offset applied to the whole ring. */
  y?: number;
}

/**
 * Sweep a surface through a sequence of rings.
 *
 * All rings must have the same point count and the same winding, which they
 * do because callers build them from the same generator at different scales.
 * Normals are computed from the result rather than analytically: the rings
 * are dense enough (64 points) that the difference is invisible, and the
 * analytic version has to special-case the ring where the taper rate
 * changes, which is exactly where a mistake would show.
 */
export function loft(rings: LoftRing[], capBack = false): THREE.BufferGeometry {
  const n = rings[0].points.length;
  const pos: number[] = [];
  const uvs: number[] = [];

  for (let s = 0; s < rings.length - 1; s += 1) {
    const A = rings[s];
    const B = rings[s + 1];
    const ay = A.y ?? 0;
    const by = B.y ?? 0;
    const v0 = s / (rings.length - 1);
    const v1 = (s + 1) / (rings.length - 1);

    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      const a0 = A.points[i];
      const a1 = A.points[j];
      const b0 = B.points[i];
      const b1 = B.points[j];
      const u0 = i / n;
      const u1 = (i + 1) / n;

      // two triangles per quad, wound so the outside faces outward
      pos.push(a0.x, a0.y + ay, A.z, b0.x, b0.y + by, B.z, b1.x, b1.y + by, B.z);
      uvs.push(u0, v0, u0, v1, u1, v1);

      pos.push(a0.x, a0.y + ay, A.z, b1.x, b1.y + by, B.z, a1.x, a1.y + ay, A.z);
      uvs.push(u0, v0, u1, v1, u1, v0);
    }
  }

  if (capBack) {
    const last = rings[rings.length - 1];
    const ly = last.y ?? 0;
    // Fan from the ring centroid. The section is convex, so a fan is valid.
    let cx = 0;
    let cy = 0;
    for (const p of last.points) {
      cx += p.x;
      cy += p.y;
    }
    cx /= n;
    cy /= n;
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      const p0 = last.points[i];
      const p1 = last.points[j];
      pos.push(cx, cy + ly, last.z, p1.x, p1.y + ly, last.z, p0.x, p0.y + ly, last.z);
      uvs.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/* -------------------------------------------------------- curved screen --- */

/**
 * The tube face: a superellipse patch bulged forward into a shallow
 * spherical section.
 *
 * Built from a regular grid in unit-square space, mapped outward onto the
 * superellipse. That mapping matters for two reasons:
 *
 *  - the grid stays regular, so the mesh has real interior vertices to
 *    displace. `ShapeGeometry` would triangulate the outline into a fan with
 *    nothing in the middle to bend, and the "curved" screen would be flat
 *    everywhere except its rim.
 *
 *  - UVs come from the untouched square, so the image maps corner-to-corner
 *    of the aperture. The slight pinch this puts into the corners is not an
 *    artefact to fix — it is pincushion, and it is free.
 *
 * `bulge` is how far the EDGE sits behind the apex, so callers can place the
 * part by the apex and know exactly where the rim landed.
 */
export function tubeFaceGeometry(
  a: number,
  b: number,
  n: number,
  bulge: number,
  seg = 40,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  const map = (u: number, v: number): [number, number, number] => {
    // u,v in [-1,1]. Scale the square point out to the superellipse that
    // passes through it, so the boundary of the square lands on the outline.
    const au = Math.abs(u);
    const av = Math.abs(v);
    const maxc = Math.max(au, av);
    let k = 1;
    if (maxc > 1e-6) {
      const norm = Math.pow(Math.pow(au, n) + Math.pow(av, n), 1 / n);
      k = maxc / norm;
    }
    const x = u * k * a;
    const y = v * k * b;
    // Normalised superellipse radius, 0 at the centre and 1 at the rim.
    const rho = Math.min(1, Math.pow(Math.pow(au, n) + Math.pow(av, n), 1 / n) * k);
    const z = -bulge * rho * rho;
    return [x, y, z];
  };

  for (let j = 0; j <= seg; j += 1) {
    const v = (j / seg) * 2 - 1;
    for (let i = 0; i <= seg; i += 1) {
      const u = (i / seg) * 2 - 1;
      const [x, y, z] = map(u, v);
      pos.push(x, y, z);
      uv.push(i / seg, j / seg);
    }
  }

  const row = seg + 1;
  for (let j = 0; j < seg; j += 1) {
    for (let i = 0; i < seg; i += 1) {
      const p = j * row + i;
      idx.push(p, p + 1, p + row, p + 1, p + row + 1, p + row);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------ merge machinery ---- */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Apply a transform to a geometry in place, so parts can be positioned
 *  before being welded together. */
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
 * `mergeGeometries` refuses to mix indexed with non-indexed inputs and
 * refuses to mix attribute sets, so everything is normalised to non-indexed
 * with exactly position/normal/uv. At these vertex counts de-indexing costs
 * nothing and removes a whole class of silent failures.
 */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (parts.length === 0) return new THREE.BufferGeometry();

  const clean = parts.map((g) => {
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();

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

  if (!merged) return new THREE.BufferGeometry();
  merged.computeBoundingSphere();
  return merged;
}

/** A rounded slab — the workhorse for vents wells, badges and the base. */
export function slab(
  w: number,
  h: number,
  d: number,
  r: number,
  bevel = 0.012,
): THREE.BufferGeometry {
  return extrudeCentred(roundedRectShape(w, h, r, r), d, bevel, 8);
}
