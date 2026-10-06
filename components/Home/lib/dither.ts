"use client";

/* =========================================================================
   ORDERED DITHER SURFACE
   -------------------------------------------------------------------------
   A paper-coloured 4×4 Bayer dither that can be dissolved in and out over
   any element. It is Voyagerscape's reveal material: a photograph does not
   fade in, it *develops* — the paper breaks into a pixel grid and the
   image comes through it.

   Performance note: a naive implementation fills one rect per cell, every
   frame (tens of thousands of calls). Ordered dithering is periodic, so
   instead we bake the 17 possible 4×4 coverage states into 17 tiny tiles
   once, turn them into canvas patterns, and a redraw becomes a single
   fillRect. Cost per frame is effectively one composited rectangle.
   ========================================================================= */

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const LEVELS = BAYER.length + 1; // 0..16 inclusive

function buildTiles(color: string, cell: number): HTMLCanvasElement[] {
  const tiles: HTMLCanvasElement[] = [];
  for (let level = 0; level < LEVELS; level += 1) {
    const tile = document.createElement("canvas");
    tile.width = cell * 4;
    tile.height = cell * 4;
    const ctx = tile.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color;
      for (let i = 0; i < 16; i += 1) {
        if (BAYER[i] < level) {
          ctx.fillRect((i % 4) * cell, Math.floor(i / 4) * cell, cell, cell);
        }
      }
    }
    tiles.push(tile);
  }
  return tiles;
}

export interface DitherOptions {
  /** Paper colour painted over the image. */
  color: string;
  /** Pixel size of one dither cell (device-independent px). */
  cell?: number;
}

export class DitherSurface {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private patterns: (CanvasPattern | null)[] = [];
  private tiles: HTMLCanvasElement[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private coverage = -1;
  private cell: number;
  private color: string;

  constructor(canvas: HTMLCanvasElement, options: DitherOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cell = options.cell ?? 3;
    this.color = options.color;
    this.rebuild();
  }

  setColor(color: string) {
    if (color === this.color) return;
    this.color = color;
    this.rebuild();
    const current = this.coverage;
    this.coverage = -1;
    this.draw(current < 0 ? 0 : current);
  }

  private rebuild() {
    if (!this.ctx) return;
    this.tiles = buildTiles(this.color, this.cell);
    this.patterns = this.tiles.map((tile) => this.ctx!.createPattern(tile, "repeat"));
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (width === this.width && height === this.height && dpr === this.dpr) return;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const current = this.coverage;
    this.coverage = -1;
    this.draw(current < 0 ? 0 : current);
  }

  /** coverage 0 = fully revealed image, 1 = fully paper. */
  draw(coverage: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const next = coverage < 0 ? 0 : coverage > 1 ? 1 : coverage;
    if (Math.abs(next - this.coverage) < 0.008) return;
    this.coverage = next;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (next <= 0.001) return;

    const level = Math.round(next * (LEVELS - 1));
    const pattern = this.patterns[level];
    if (!pattern) return;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  destroy() {
    this.patterns = [];
    this.tiles = [];
    this.ctx = null;
  }
}
