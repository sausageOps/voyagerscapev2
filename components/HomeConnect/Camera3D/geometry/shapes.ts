import * as THREE from "three";

/**
 * GEOMETRY HELPERS
 * ================
 *
 * Everything the object is made of is generated here from primitives and
 * extruded profiles — no loaded model, no external asset.
 *
 * The important one is `extrudeCentred`: a bevelled `ExtrudeGeometry` is what
 * separates "a designed physical object" from "a box". Every large surface on
 * this camera is an extruded rounded profile with a 4-segment bevel, so every
 * silhouette edge catches a highlight instead of terminating in a hard corner.
 */

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
 * Profile for the dark front panel: a straight top edge (it butts against the
 * cream deck band) over the body's generous moulded base.
 */
export function panelShape(w: number, topY: number, botY: number, rBot: number): THREE.Shape {
  const x = w / 2;
  const rb = Math.min(rBot, x, (topY - botY) / 2);

  const s = new THREE.Shape();
  s.moveTo(-x + rb, botY);
  s.lineTo(x - rb, botY);
  s.quadraticCurveTo(x, botY, x, botY + rb);
  s.lineTo(x, topY);
  s.lineTo(-x, topY);
  s.lineTo(-x, botY + rb);
  s.quadraticCurveTo(-x, botY, -x + rb, botY);
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
