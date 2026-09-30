import * as THREE from "three";

/**
 * PROCEDURAL MICRO-TEXTURES
 * =========================
 *
 * Stage 3's material upgrade: subtle roughness variation and fine bump grain,
 * generated on small canvases at startup. Zero bytes over the network, a few
 * tens of KB of VRAM, and no color maps anywhere — the palette stays exactly
 * as authored in palette.ts.
 *
 * Everything is TILEABLE by construction (value noise sampled on a wrapped
 * grid, streaks seeded per row), because ExtrudeGeometry's world-scale UVs
 * wrap at integer boundaries and a visible tile seam would be worse than no
 * variation at all.
 *
 * Amplitude discipline: these maps modulate roughness by ±10% of its base
 * value and bump by a few thousandths of a world unit. The goal is "the eye
 * believes the surface has a finish", never "the eye sees a texture".
 */

const canvas2d = (size: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  return { canvas, ctx };
};

/** Wrapping pseudo-random hash — deterministic per seed, tileable per grid. */
function hash(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 1442695040888963407;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Tileable bilinear sample of the wrapped value-noise grid. */
function gridSample(gx: number, gy: number, grid: number, seed: number): number {
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = smooth(gx - x0);
  const fy = smooth(gy - y0);
  const wrap = (v: number) => ((v % grid) + grid) % grid;
  const v00 = hash(wrap(x0), wrap(y0), seed);
  const v10 = hash(wrap(x0 + 1), wrap(y0), seed);
  const v01 = hash(wrap(x0), wrap(y0 + 1), seed);
  const v11 = hash(wrap(x0 + 1), wrap(y0 + 1), seed);
  return (
    v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy
  );
}

/** Two-octave tileable value noise, mapped to grayscale [lo, hi] (0–255). */
function noiseTexture(
  size: number,
  grid: number,
  lo: number,
  hi: number,
  seed: number,
  repeat: number,
): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(size);
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x / size) * grid;
      const v = (y / size) * grid;
      const n =
        gridSample(u, v, grid, seed) * 0.68 + gridSample(u * 2, v * 2, grid * 2, seed + 7) * 0.32;
      const g = Math.round(lo + (hi - lo) * n);
      const i = (y * size + x) * 4;
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(new THREE.CanvasTexture(canvas), repeat);
}

/**
 * Fine speckle grain — the leatherette. Dense dark dots on a mid field, used
 * as BOTH roughnessMap and bumpMap so the grain reads in shading and in
 * silhouette catchlights alike.
 */
function speckleTexture(
  size: number,
  dots: number,
  dotR: number,
  lo: number,
  hi: number,
  seed: number,
  repeat: number,
): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(size);
  ctx.fillStyle = `rgb(${hi},${hi},${hi})`;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = `rgb(${lo},${lo},${lo})`;
  for (let i = 0; i < dots; i += 1) {
    const x = hash(i, 1, seed) * size;
    const y = hash(i, 2, seed) * size;
    const r = dotR * (0.5 + hash(i, 3, seed));
    // Draw each dot 9× shifted so the field tiles seamlessly.
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return finish(new THREE.CanvasTexture(canvas), repeat);
}

/**
 * Horizontal brushing streaks — the turned metals. Row luminance is chosen
 * per visible ROW (plus a little per-pixel jitter), which after the lathe's
 * u-wrap reads as circumferential machining marks around the barrel. Rows
 * are ~9px at 256px source; with the lathe repeat they land at a few rows
 * per band — coarse enough to resolve as marks, fine enough to average out
 * under mipmapping at distance.
 */
function streakTexture(size: number, rows: number, lo: number, hi: number, seed: number, repeatX: number): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(size);
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const rowH = size / rows;
  for (let y = 0; y < size; y += 1) {
    const row = Math.floor(y / rowH);
    const base = lo + (hi - lo) * hash(0, row, seed);
    for (let x = 0; x < size; x += 1) {
      const jitter = (hash(x, row, seed + 11) - 0.5) * (hi - lo) * 0.6;
      const g = Math.round(Math.min(hi, Math.max(lo, base + jitter)));
      const i = (y * size + x) * 4;
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, 1);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function finish(tex: THREE.CanvasTexture, repeat: number): THREE.CanvasTexture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  // Roughness/bump data must stay linear — no SRGB colorspace here.
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export interface CameraTextures {
  /** Soft blotches for the painted castings. */
  shellNoise: THREE.CanvasTexture;
  deckNoise: THREE.CanvasTexture;
  /** Leatherette grain (roughness + bump). */
  leatherGrain: THREE.CanvasTexture;
  /** Finer grain for the rubber. */
  rubberGrain: THREE.CanvasTexture;
  /** Circumferential brushing for the turned metals. */
  metalStreak: THREE.CanvasTexture;
  dispose: () => void;
}

export function createCameraTextures(): CameraTextures {
  const shellNoise = noiseTexture(256, 5, 214, 255, 101, 1.3);
  const deckNoise = noiseTexture(256, 6, 216, 255, 202, 1.3);
  const leatherGrain = speckleTexture(256, 2600, 1.1, 118, 205, 303, 3.2);
  const rubberGrain = speckleTexture(256, 2000, 0.9, 150, 216, 404, 2.6);
  const metalStreak = streakTexture(256, 28, 216, 255, 505, 4);

  return {
    shellNoise,
    deckNoise,
    leatherGrain,
    rubberGrain,
    metalStreak,
    dispose: () => {
      shellNoise.dispose();
      deckNoise.dispose();
      leatherGrain.dispose();
      rubberGrain.dispose();
      metalStreak.dispose();
    },
  };
}
