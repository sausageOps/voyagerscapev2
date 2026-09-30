import * as THREE from "three";
import { CRT } from "../palette";
import type { ScreenState } from "../proportions";

/**
 * SCREEN TEXTURE
 * ==============
 *
 * A CanvasTexture painted with the terminal's current state. It is used as the
 * emissiveMap of the phosphor material, so whatever is drawn here glows.
 *
 * Content is deliberately restrained: a header rail, a large centred state
 * word set in the LOCKED display typeface (Pixelify Sans, read from the CSS
 * custom property so the typography lock is honoured), a faint coordinate
 * grid, scanlines, a vignette and a blinking cursor block. No noise, no
 * cyberpunk clutter.
 *
 * Typography is resolved from `--font-display` / `--font-mono` on the document
 * root, which is exactly the Voyagerscape font stack. We redraw once
 * `document.fonts.ready` resolves so the first paint is not a fallback face.
 */

const W = 1024;
const H = 668; // ~ aperture aspect (2.86 : 1.86)

function fontStack(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v || fallback;
}

export interface ScreenTexture {
  texture: THREE.CanvasTexture;
  draw: (state: ScreenState, index: number, opts?: { warm?: number }) => void;
  dispose: () => void;
}

export function createScreenTexture(): ScreenTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  let last: { state: ScreenState; index: number } | null = null;

  const draw: ScreenTexture["draw"] = (state, index, opts) => {
    last = { state, index };
    const display = fontStack("--font-display", "sans-serif");
    const mono = fontStack("--font-mono", "monospace");

    // --- base glass ---
    ctx.fillStyle = CRT.screenGlass;
    ctx.fillRect(0, 0, W, H);

    // faint radial phosphor wash so the centre feels lit even when quiet
    const wash = ctx.createRadialGradient(W / 2, H * 0.46, 40, W / 2, H * 0.46, W * 0.62);
    wash.addColorStop(0, "rgba(150,140,210,0.16)");
    wash.addColorStop(0.5, "rgba(120,112,180,0.06)");
    wash.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    // --- faint coordinate grid ---
    ctx.strokeStyle = "rgba(150,140,210,0.06)";
    ctx.lineWidth = 1;
    const gx = 8;
    const gy = 6;
    ctx.beginPath();
    for (let i = 1; i < gx; i++) {
      const x = (i / gx) * W;
      ctx.moveTo(x, 40);
      ctx.lineTo(x, H - 40);
    }
    for (let j = 1; j < gy; j++) {
      const y = (j / gy) * H;
      ctx.moveTo(40, y);
      ctx.lineTo(W - 40, y);
    }
    ctx.stroke();

    // centre crosshair, very faint
    ctx.strokeStyle = "rgba(180,170,230,0.10)";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 26, H * 0.46);
    ctx.lineTo(W / 2 + 26, H * 0.46);
    ctx.moveTo(W / 2, H * 0.46 - 26);
    ctx.lineTo(W / 2, H * 0.46 + 26);
    ctx.stroke();

    // --- header rail ---
    ctx.fillStyle = "rgba(200,190,245,0.72)";
    ctx.font = `500 26px ${mono}`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText("VOYAGERSCAPE", 56, 68);
    ctx.textAlign = "right";
    ctx.fillText("TERMINAL // CRT-01", W - 56, 68);

    ctx.strokeStyle = "rgba(160,150,215,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(56, 92);
    ctx.lineTo(W - 56, 92);
    ctx.stroke();

    // --- the state word, centred, in the display face ---
    const glow = CRT.phosphor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 178px ${display}`;
    ctx.shadowColor = "rgba(180,168,255,0.85)";
    ctx.shadowBlur = 34;
    ctx.fillStyle = glow;
    ctx.fillText(state, W / 2, H * 0.47);
    ctx.shadowBlur = 0;

    // --- footer rail ---
    ctx.strokeStyle = "rgba(160,150,215,0.35)";
    ctx.beginPath();
    ctx.moveTo(56, H - 84);
    ctx.lineTo(W - 56, H - 84);
    ctx.stroke();

    ctx.font = `500 24px ${mono}`;
    ctx.fillStyle = "rgba(200,190,245,0.66)";
    ctx.textAlign = "left";
    const idx = String(index + 1).padStart(2, "0");
    ctx.fillText(`MODE ${idx}`, 56, H - 44);

    ctx.textAlign = "center";
    const warm = opts?.warm ?? 0;
    ctx.fillStyle = warm > 0.5 ? "rgba(243,217,160,0.85)" : "rgba(200,190,245,0.6)";
    ctx.fillText("● LIVE", W / 2, H - 44);

    ctx.textAlign = "right";
    // little blinking cursor block
    ctx.fillStyle = "rgba(220,208,255,0.9)";
    ctx.fillRect(W - 78, H - 62, 18, 26);
    ctx.fillStyle = "rgba(200,190,245,0.66)";
    ctx.fillText("RDY", W - 92, H - 44);

    // --- scanlines ---
    ctx.fillStyle = "rgba(4,5,10,0.22)";
    for (let y = 0; y < H; y += 4) {
      ctx.fillRect(0, y, W, 2);
    }

    // --- vignette ---
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.85);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    texture.needsUpdate = true;
  };

  // Repaint with the real font once it has loaded (first paint may fall back).
  if (typeof document !== "undefined" && "fonts" in document) {
    document.fonts.ready.then(() => {
      if (last) draw(last.state, last.index);
    });
  }

  return {
    texture,
    draw,
    dispose: () => texture.dispose(),
  };
}

/* -------------------------------------------------------------------------- */

const RW = 512;
const RH = 256;

export interface ReadoutTexture {
  texture: THREE.CanvasTexture;
  draw: (index: number) => void;
  dispose: () => void;
}

/** Small amber secondary readout — coordinates + signal index. */
export function createReadoutTexture(): ReadoutTexture {
  const canvas = document.createElement("canvas");
  canvas.width = RW;
  canvas.height = RH;
  const ctx = canvas.getContext("2d")!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  let lastIndex = 0;

  const draw: ReadoutTexture["draw"] = (index) => {
    lastIndex = index;
    const mono = fontStack("--font-mono", "monospace");

    ctx.fillStyle = CRT.readoutGlass;
    ctx.fillRect(0, 0, RW, RH);

    ctx.shadowColor = "rgba(243,217,160,0.7)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(243,217,160,0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.font = `500 40px ${mono}`;
    ctx.fillText("SIG", 30, 62);
    ctx.font = `600 88px ${mono}`;
    const n = String((index * 13 + 7) % 100).padStart(2, "0");
    ctx.fillText(n, 150, 66);

    ctx.font = `500 34px ${mono}`;
    const lat = (12.4 + index * 3.1).toFixed(1);
    const lon = (88.2 - index * 5.3).toFixed(1);
    ctx.fillText(`${lat}  ${lon}`, 30, 158);

    ctx.shadowBlur = 0;

    // scanlines
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    for (let y = 0; y < RH; y += 4) ctx.fillRect(0, y, RW, 2);

    texture.needsUpdate = true;
  };

  if (typeof document !== "undefined" && "fonts" in document) {
    document.fonts.ready.then(() => draw(lastIndex));
  }

  return { texture, draw, dispose: () => texture.dispose() };
}
