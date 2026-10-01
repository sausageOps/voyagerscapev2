import * as THREE from "three";

/**
 * FASCIA ARTWORK
 * ==============
 *
 * The manufacturer marking, rasterised once into a small canvas and used
 * as the alpha of a decal on the bezel. Nothing here places anything —
 * see MARKING in proportions.ts for where it lands, and CrtUnit for the
 * mesh that carries it.
 *
 * WHY A CANVAS AND NOT GEOMETRY
 * -----------------------------
 * Text as geometry needs a font loader, a typeface converted to outlines
 * and a few hundred triangles per glyph, for a mark that is two
 * millimetres tall. A canvas gets the same result at one 512-pixel
 * upload, and — the part that matters — it lets the mark be set in the
 * project's actual typeface rather than an approximation of it.
 *
 * WHITE INK, COLOURED BY THE MATERIAL
 * -----------------------------------
 * The glyphs are painted white, so the texture carries only coverage.
 * The colour comes from the material, which means the marking is tinted
 * by the same `dim` the rest of the shell is and cannot drift away from
 * the palette. It is lit as part of the casting, not drawn over it.
 *
 * TYPOGRAPHY LOCK
 * ---------------
 * JetBrains Mono, resolved from the variable next/font emits rather than
 * named here — this file is not allowed to know the family. If the font
 * has not finished loading when the artwork is first rasterised it is
 * re-rasterised once `document.fonts` settles, which is why the box is
 * sized from a nominal monospace advance instead of from a measurement:
 * the plane is already in the scene by then, and a box that changed
 * width on the second paint would stretch the glyphs to fit it.
 */

/** Rasterisation height. Generous: the mark is read at a glancing angle. */
const FONT_PX = 72;
/** Nominal advance of a monospace glyph, in ems. JetBrains Mono is 0.6. */
const ADVANCE = 0.6;
/** Breathing room inside the artwork box, in multiples of the font size. */
const PAD_X = 0.35;
const LINE = 1.35;

export interface MarkingArtwork {
  texture: THREE.CanvasTexture;
  /** Width / height of the artwork box, for sizing the plane. */
  aspect: number;
  dispose: () => void;
}

function monoFamily(): string {
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-mono-tech")
      .trim();
    if (v) return `${v}, monospace`;
  } catch {
    /* non-browser or locked-down environment; the fallback is fine */
  }
  return "monospace";
}

function paint(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* Fit, then centre. A fallback face with a wider advance is scaled
     down to stay inside the box rather than being allowed to run past
     its edge — the box is fixed because the plane is sized from it. */
  const inner = canvas.width - 2 * PAD_X * FONT_PX;
  let size = FONT_PX;
  ctx.font = `500 ${size}px ${monoFamily()}`;
  const measured = ctx.measureText(text).width;
  if (measured > inner) {
    size = Math.max(8, Math.floor((size * inner) / measured));
    ctx.font = `500 ${size}px ${monoFamily()}`;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

export function createMarkingArtwork(text: string): MarkingArtwork {
  const canvas = document.createElement("canvas");
  /* Sized from the nominal advance, NOT from a measurement — see the note
     about the second paint at the top of this file. */
  canvas.width = Math.ceil((text.length * ADVANCE + 2 * PAD_X) * FONT_PX);
  canvas.height = Math.ceil(LINE * FONT_PX);

  paint(canvas, text);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  /* The first paint may have landed on the fallback face. Re-set it once
     the real one is available; the box does not move, so nothing in the
     scene has to be told. */
  let disposed = false;
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  fonts?.ready
    ?.then(() => {
      if (disposed) return;
      paint(canvas, text);
      texture.needsUpdate = true;
    })
    .catch(() => undefined);

  return {
    texture,
    aspect: canvas.width / canvas.height,
    dispose: () => {
      disposed = true;
      texture.dispose();
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
