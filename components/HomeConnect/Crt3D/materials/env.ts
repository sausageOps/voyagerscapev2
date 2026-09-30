import * as THREE from "three";

/**
 * PROCEDURAL STUDIO ENVIRONMENT
 * =============================
 *
 * The single highest-value trick for making shaded primitives read as a
 * photographed product: give the materials something to reflect.
 *
 * Rather than downloading an HDRI (hundreds of KB, and the wrong colour
 * temperature for a cream page) we paint a small equirectangular gradient on
 * a 2D canvas and run it through PMREMGenerator. Cost: one canvas, one
 * prefilter pass, roughly a millisecond, zero bytes over the network.
 *
 * Tuned differently from a product-photography rig: the dominant feature is
 * a broad, soft WINDOW shape high and to the left. That is deliberate — the
 * only thing on this object that reflects sharply is the tube face, and a
 * curved dark glass reflecting a soft rectangle is the most recognisable
 * "CRT in a room" cue there is. A point-like source would give it a sci-fi
 * star highlight instead.
 *
 * BUILT FOR AN OBJECT THAT TURNS
 * ------------------------------
 * The cursor now swings the monitor through ±20° of yaw and ±12° of
 * pitch, and that changes what this map has to be. A single light source,
 * however beautifully shaped, gives a reflection that is present at one
 * orientation and simply absent at the others — the glass "switches off"
 * as you sweep past it, which reads as a bug rather than as a material.
 *
 * So the room is furnished all the way round the arc the tube face can
 * sweep: a window upper-left, a long overhead softbox across the top, a
 * second smaller window right of centre, and the horizon strip. At every
 * reachable orientation the glass has something to catch, and turning the
 * monitor slides the highlight continuously from one to the next instead
 * of blinking between them. That continuity is the thing that tells the
 * eye it is looking at a curved reflective surface.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture | null {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  /* ---- base: ceiling → horizon → floor ---- */
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0.0, "#ffffff");
  base.addColorStop(0.3, "#faf6ee");
  base.addColorStop(0.5, "#eee7db");
  base.addColorStop(0.64, "#d9d0c1");
  base.addColorStop(1.0, "#a49d90");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  /* ---- the window: a soft-edged rectangle, upper left. This is the shape
         the tube face reflects, and the reason the glass reads as glass. ---- */
  const winX = w * 0.19;
  const winY = h * 0.2;
  const winW = w * 0.2;
  const winH = h * 0.24;
  const halo = ctx.createRadialGradient(
    winX + winW / 2,
    winY + winH / 2,
    0,
    winX + winW / 2,
    winY + winH / 2,
    winW * 1.5,
  );
  halo.addColorStop(0, "rgba(255,255,255,0.85)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.filter = "blur(6px)";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(winX, winY, winW, winH);
  // A mullion, so the reflection has internal structure rather than being
  // one featureless blob sliding across the glass.
  ctx.filter = "blur(4px)";
  ctx.fillStyle = "rgba(196,188,174,0.85)";
  ctx.fillRect(winX + winW * 0.47, winY, winW * 0.06, winH);
  ctx.restore();

  /* ---- overhead softbox: a long, low bar across the ceiling.
         On a convex tube face a long horizontal source reflects as the
         elongated, gently curved streak that says "this glass bulges".
         It is the highlight that sweeps vertically as the monitor
         pitches, which is the half of the motion a window high on the
         left cannot describe. ---- */
  ctx.save();
  ctx.filter = "blur(9px)";
  const bar = ctx.createLinearGradient(0, 0, w, 0);
  bar.addColorStop(0.0, "rgba(255,255,255,0.12)");
  bar.addColorStop(0.28, "rgba(255,255,255,0.78)");
  bar.addColorStop(0.55, "rgba(255,255,255,0.86)");
  bar.addColorStop(0.82, "rgba(255,255,255,0.5)");
  bar.addColorStop(1.0, "rgba(255,255,255,0.12)");
  ctx.fillStyle = bar;
  ctx.fillRect(w * 0.04, h * 0.055, w * 0.92, h * 0.062);
  ctx.restore();

  /* ---- second window, right of centre. Smaller and dimmer than the
         first: it exists so that yawing the monitor to the far end of its
         range hands the reflection off to a new source rather than
         running out of room. ---- */
  ctx.save();
  ctx.filter = "blur(7px)";
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.fillRect(w * 0.6, h * 0.235, w * 0.13, h * 0.19);
  ctx.filter = "blur(4px)";
  ctx.fillStyle = "rgba(196,188,174,0.7)";
  ctx.fillRect(w * 0.6 + w * 0.062, h * 0.235, w * 0.008, h * 0.19);
  ctx.restore();

  /* ---- fill card, right: dimmer, faintly pink so the shadow side keeps the
         brand temperature instead of going neutral grey ---- */
  const fill = ctx.createRadialGradient(w * 0.72, h * 0.44, 0, w * 0.72, h * 0.44, w * 0.28);
  fill.addColorStop(0, "rgba(249,226,243,0.5)");
  fill.addColorStop(1, "rgba(249,226,243,0)");
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);

  /* ---- narrow bright strip along the horizon: this is what draws the crisp
         specular line along the top edge of the casting and the base ---- */
  const strip = ctx.createLinearGradient(0, h * 0.43, 0, h * 0.53);
  strip.addColorStop(0, "rgba(255,255,255,0)");
  strip.addColorStop(0.5, "rgba(255,255,255,0.85)");
  strip.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = strip;
  ctx.fillRect(0, h * 0.43, w, h * 0.1);

  const equirect = new THREE.CanvasTexture(canvas);
  equirect.mapping = THREE.EquirectangularReflectionMapping;
  equirect.colorSpace = THREE.SRGBColorSpace;
  equirect.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromEquirectangular(equirect);

  equirect.dispose();
  pmrem.dispose();

  return target.texture;
}

/**
 * MOULDED-PLASTIC ROUGHNESS MAP
 * =============================
 *
 * Old ABS is not uniformly matte. It has a fine pebbled texture from the
 * mould, and thirty years of handling leaves the high points very slightly
 * polished. Without this the shell renders as a perfectly even surface,
 * which is the main thing that makes procedural plastic look like plastic in
 * the pejorative sense.
 *
 * One 256² greyscale canvas, reused by every shell material and tiled hard.
 * It modulates roughness only — never colour, which would tint the cream.
 */
export function createPlasticRoughness(): THREE.Texture | null {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const img = ctx.createImageData(size, size);
  const d = img.data;

  // Value noise at two scales: a coarse blotch for moulding flow lines and a
  // fine grain for the pebble finish. Both are held in a narrow band around
  // mid-grey — a roughness map with real contrast reads as dirt, not finish.
  const coarse = 16;
  const grid = new Float32Array((coarse + 1) * (coarse + 1));
  for (let i = 0; i < grid.length; i += 1) grid[i] = Math.random();

  const sample = (x: number, y: number) => {
    const gx = (x / size) * coarse;
    const gy = (y / size) * coarse;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const i00 = grid[y0 * (coarse + 1) + x0];
    const i10 = grid[y0 * (coarse + 1) + x0 + 1];
    const i01 = grid[(y0 + 1) * (coarse + 1) + x0];
    const i11 = grid[(y0 + 1) * (coarse + 1) + x0 + 1];
    return (i00 * (1 - sx) + i10 * sx) * (1 - sy) + (i01 * (1 - sx) + i11 * sx) * sy;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const blotch = sample(x, y);
      const grain = Math.random();
      const v = 168 + (blotch - 0.5) * 42 + (grain - 0.5) * 26;
      const p = (y * size + x) * 4;
      d[p] = d[p + 1] = d[p + 2] = Math.max(0, Math.min(255, v));
      d[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.needsUpdate = true;
  return tex;
}
