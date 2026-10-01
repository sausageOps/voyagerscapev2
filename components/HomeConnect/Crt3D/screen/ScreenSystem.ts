import * as THREE from "three";
import { CHANNELS } from "../proportions";
import { createProgrammes, type Programme } from "./programmes";

/**
 * SCREEN SYSTEM
 * =============
 *
 * Owns the phosphor canvas, the texture the tube samples, and the one state
 * machine that decides what is on screen.
 *
 * ONE STATE MACHINE PER TUBE
 * --------------------------
 * Each monitor owns exactly one of these, and it has exactly one input:
 * `bump()`. Automatic cycling and a user click are the same event —
 * "advance the channel" — which is why clicking during an automatic change
 * cannot leave two transitions fighting over the same texture. The dwell
 * timer is simply reset by a manual bump, so a click also buys the new
 * channel its full viewing time rather than dumping you into whatever was
 * half-finished.
 *
 * TWO TUBES, INDEPENDENTLY ALIVE
 * ------------------------------
 * The second machine is not a mirror of the first. It runs its own
 * instance with its own programme objects, its own canvas, its own dwell
 * length and its own phase, so the two drift against each other instead
 * of cutting together — a pair of machines each working through the
 * archive at its own pace, which is the entire reason for having two.
 *
 * Drift alone would eventually let both land on the same programme, and
 * two identical pictures instantly collapse back into "one model twice".
 * So a unit can be given a `peer`: when it advances, it skips any
 * programme its peer is currently showing. That is the only coupling
 * between the two systems, it is one integer wide, and it is read at the
 * moment of the switch rather than held as shared state.
 *
 * PAINT RATE
 * ----------
 * Capped at CHANNELS.fps, not the display rate. Period hardware did not run
 * at 60, the content is authored for a chunkier cadence, and it means the
 * canvas work is roughly a third of what it would otherwise be. The 3D
 * scene still renders every frame; only the texture upload is throttled.
 *
 * PHOSPHOR PERSISTENCE
 * --------------------
 * Real trailing, not a shader approximation: each painted frame is
 * composited with the previous one in `lighter` at a low alpha, so bright
 * moving objects leave a decaying smear and static areas do not. The amount
 * is per-programme — a driving scene wants it, a test card emphatically
 * does not, because it would blow out the calibration bars.
 */

/** Per-programme persistence. Keyed by programme id. */
const PERSISTENCE: Record<string, number> = {
  /* The video channel. Lower than the procedural drive it stands in for:
     the footage already carries the source's own motion blur, so the full
     0.13 smears the bright HUD into a permanent ghost. Enough to keep it
     on the same tube as the other channels, not enough to double-expose
     it. */
  channel01: 0.06,
  drive: 0.13,
  maze: 0.1,
  arcade: 0.075,
  signal: 0.04,
  /* The pixel scene is nearly static and its palette is flat, so any
     trailing at all just fogs the dark half of it. */
  pixel: 0.05,
};

/** Deterministic hash noise for the sync artefacts. No allocation. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export interface ScreenOptions {
  /** Repaint rate. The smaller tube can afford less. */
  fps?: number;
  /** Seconds each programme holds. */
  dwell?: number;
  /** Which programme to open on. */
  startIndex?: number;
  /** Seconds of dwell already elapsed at t=0, to offset the phase. */
  phase?: number;
  /** Master brightness for this tube's canvas. */
  gain?: number;
  /** Index this unit must not switch to — the other monitor's channel. */
  peer?: () => number;
}

export interface ScreenFrame {
  /** 0 = settled, 1 = mid sync-disturbance. Drives the CRT shader. */
  transition: number;
  /** Label of the channel currently held. */
  label: string;
  /** Rough mean luminance, 0–1, for the spill light on the bezel. */
  luma: number;
}

export class ScreenSystem {
  readonly texture: THREE.CanvasTexture;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  /** Holds the previous painted frame, for phosphor persistence. */
  private prev: HTMLCanvasElement;
  private prevCtx: CanvasRenderingContext2D;

  private programmes: Programme[];
  private index = 0;
  /** Index we are transitioning TO, or -1. */
  private pending = -1;

  private dwell = 0;
  private progT = 0;
  private transT = -1;
  private paintAcc = 0;
  private mono = "monospace";
  private luma = 0.3;

  private fps: number;
  private dwellLen: number;
  private gain: number;
  private peer?: () => number;

  constructor(opts: ScreenOptions = {}) {
    this.fps = opts.fps ?? CHANNELS.fps;
    this.dwellLen = opts.dwell ?? CHANNELS.dwell;
    this.gain = opts.gain ?? 1;
    this.peer = opts.peer;
    this.canvas = document.createElement("canvas");
    this.canvas.width = CHANNELS.texW;
    this.canvas.height = CHANNELS.texH;
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.prev = document.createElement("canvas");
    this.prev.width = CHANNELS.texW;
    this.prev.height = CHANNELS.texH;
    const pctx = this.prev.getContext("2d", { alpha: false });
    if (!pctx) throw new Error("2d context unavailable");
    this.prevCtx = pctx;
    this.prevCtx.fillStyle = "#000";
    this.prevCtx.fillRect(0, 0, CHANNELS.texW, CHANNELS.texH);

    this.programmes = createProgrammes();
    this.index = (opts.startIndex ?? 0) % this.programmes.length;
    this.dwell = opts.phase ?? 0;

    /* Typography lock: the readouts use JetBrains Mono, resolved from the
       variable next/font emits rather than naming a family this file is not
       allowed to know. Falls back to the system monospace if the font has
       not finished loading — the layout is identical either way. */
    try {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-mono-tech")
        .trim();
      if (v) this.mono = `${v}, monospace`;
    } catch {
      /* non-browser or locked-down environment; the fallback is fine */
    }

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    // Paint one complete frame immediately so the tube is never blank on
    // the first rendered frame.
    this.paint(0, true);
  }

  get label(): string {
    return this.programmes[this.index].label;
  }

  /** The programme index currently held. Read by the other tube. */
  get channel(): number {
    return this.index;
  }

  /** Advance the channel. The only input this machine has. */
  bump() {
    if (this.transT >= 0) return; // already changing; ignore the double-tap
    const n = this.programmes.length;
    let next = (this.index + 1) % n;
    /* Never land on whatever the other machine is showing. One step is
       always enough with five programmes and two tubes, but the loop is
       bounded anyway rather than assuming that stays true. */
    const avoid = this.peer?.();
    for (let i = 0; i < n && next === avoid; i += 1) next = (next + 1) % n;
    this.transT = 0;
    this.pending = next;
    this.dwell = 0;
  }

  /**
   * @param frozen reduced motion: hold one stable archive frame, no cycling.
   */
  update(dt: number, frozen: boolean): ScreenFrame {
    if (frozen) {
      /* Reduced motion: one stable frame, painted once, then left alone.
         A channel change is honoured — reduced motion is not reduced
         function — but it happens as a CUT. There is no disturbance to
         ride through, so the pending swap is committed on the spot and
         the machine is left idle rather than half-way through a
         transition it will never finish. */
      if (this.pending >= 0) {
        this.index = this.pending;
        this.pending = -1;
        this.transT = -1;
        this.progT = 0;
        this.programmes[this.index].reset();
        this.paintAcc = 0;
      }
      /* Painted once, then left alone — unless the programme says its
         picture has arrived since. That is the asynchronous case only
         (channel 01 decoding its first video frame); the procedural
         programmes never report dirty, so this path is byte-for-byte the
         behaviour it had. */
      if (this.paintAcc === 0 || this.programmes[this.index].dirty?.()) {
        this.paint(0, true);
        this.paintAcc = 1;
      }
      return { transition: 0, label: this.label, luma: this.luma };
    }

    this.progT += dt;
    this.dwell += dt;

    /* ---- transition state ---- */
    if (this.transT >= 0) {
      this.transT += dt;
      /* Swap just after the peak of the disturbance rather than at the
         midpoint of the window. The picture is at its most broken around
         a third of the way in, so that is where the cut hides — and it
         leaves the whole of the long settle for the NEW programme to
         walk back into place, which is the half of the effect the eye
         actually reads. */
      const swapAt = CHANNELS.transition * 0.34;
      if (this.pending >= 0 && this.transT >= swapAt) {
        this.index = this.pending;
        this.pending = -1;
        this.progT = 0;
        this.programmes[this.index].reset();
      }
      if (this.transT >= CHANNELS.transition) this.transT = -1;
    } else if (this.dwell >= this.dwellLen) {
      this.bump();
    }

    /* ---- throttled paint ---- */
    this.paintAcc += dt;
    const interval = 1 / this.fps;
    if (this.paintAcc >= interval) {
      this.paint(Math.min(this.paintAcc, 0.1), false);
      this.paintAcc = 0;
    }

    return { transition: this.transitionAmount(), label: this.label, luma: this.luma };
  }

  /**
   * THE SHAPE OF A CHANNEL CHANGE
   * -----------------------------
   * Deliberately NOT symmetrical. Sync is lost in an instant and regained
   * slowly: the line oscillator has to find the incoming pulse train and
   * then settle onto it, so the picture snaps apart and then walks back
   * into place.
   *
   * A raised cosine — the obvious envelope, and what this was — spends as
   * long breaking up as it does recovering, which reads as a deliberate
   * effect being played at you. The asymmetric one reads as hardware: a
   * fast attack over the first fifth of the window, then a long tail with
   * a small secondary kick in it, because a tube that has just re-locked
   * overshoots once before it holds.
   */
  private transitionAmount(): number {
    if (this.transT < 0) return 0;
    const p = Math.min(1, this.transT / CHANNELS.transition);
    const ATTACK = 0.18;
    if (p < ATTACK) return (p / ATTACK) ** 0.5;
    const k = (p - ATTACK) / (1 - ATTACK); // 0 → 1 across the settle
    const decay = (1 - k) ** 1.6;
    // one damped bounce as the line oscillator re-locks
    const ring = 1 + 0.35 * Math.sin(k * Math.PI * 2.4) * (1 - k);
    return Math.max(0, Math.min(1, decay * ring));
  }

  private paint(dt: number, force: boolean) {
    const prog = this.programmes[this.index];
    const ctx = this.ctx;
    const w = CHANNELS.texW;
    const h = CHANNELS.texH;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    prog.draw({
      ctx,
      t: this.progT,
      dt,
      w,
      h,
      mono: this.mono,
      frozen: force,
    });

    this.drawChannelOsd(ctx, w, force);
    ctx.restore();

    /* ---- phosphor persistence ---- */
    const decay = PERSISTENCE[prog.id] ?? 0.08;
    if (!force && decay > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = decay;
      ctx.drawImage(this.prev, 0, 0);
      ctx.restore();
    }
    this.prevCtx.globalCompositeOperation = "source-over";
    this.prevCtx.globalAlpha = 1;
    this.prevCtx.drawImage(this.canvas, 0, 0);

    /* ---- sync disturbance -------------------------------------------
       Applied AFTER the persistence buffer has been updated, so the
       torn frame is never fed back into the next one: the artefact is a
       fault in the display, not something the phosphor remembers. */
    if (!force && this.transT >= 0) this.tear(this.transitionAmount());

    /* ---- cheap mean luminance for the bezel spill light. Sampled from a
           16×12 downscale of the frame rather than the full canvas: a
           getImageData over 320×240 every paint is a real cost, over 192
           pixels it is not. ---- */
    this.luma = this.sampleLuma() * this.gain;

    this.texture.needsUpdate = true;
  }

  /**
   * HORIZONTAL SYNC DISTURBANCE
   * ===========================
   *
   * The picture itself coming apart, in the raster — not a filter over
   * the top of it. The frame is copied aside, the canvas is re-laid from
   * that copy in horizontal bands, and each band is displaced sideways by
   * its own amount. That is literally what a line oscillator losing lock
   * does: every scanline starts at the wrong time, so every line lands at
   * the wrong x.
   *
   * WHY IT IS HERE AND NOT IN THE SHADER
   * ------------------------------------
   * The tube shader already rolls, tears and mixes static, and that is
   * the right place for the ANALOGUE part of the fault — it works in the
   * distorted, curved space of the glass. But a shader tear is a
   * continuous uv displacement: it cannot break the picture into bands of
   * DIFFERENT heights, each offset independently, because it has no
   * memory of the frame. Doing the band structure on the source raster
   * and the roll in the shader is how the two halves of the effect end up
   * looking like one fault instead of two effects.
   *
   * It only runs during the ~0.6s window, so its cost is invisible in
   * the average frame.
   */
  private tearCanvas: HTMLCanvasElement | null = null;
  private tearCtx: CanvasRenderingContext2D | null = null;

  private tear(amount: number) {
    if (amount <= 0.02) return;
    const w = CHANNELS.texW;
    const h = CHANNELS.texH;

    if (!this.tearCanvas) {
      this.tearCanvas = document.createElement("canvas");
      this.tearCanvas.width = w;
      this.tearCanvas.height = h;
      this.tearCtx = this.tearCanvas.getContext("2d", { alpha: false });
    }
    const src = this.tearCtx;
    if (!src) return;

    src.globalCompositeOperation = "source-over";
    src.globalAlpha = 1;
    src.drawImage(this.canvas, 0, 0);

    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    // Whatever the bands do not cover is unlit tube, not black paint.
    ctx.fillStyle = "#04060a";
    ctx.fillRect(0, 0, w, h);

    /* A quantised clock: the fault has to step, not slide. A smoothly
       moving tear is a modern glitch effect; a real one changes on the
       field rate and holds. */
    const step = Math.floor(this.transT * 30);
    // vertical roll, wrapped — the frame is still whole, just mistimed
    const roll = Math.round((hash(step * 1.7) - 0.5) * 34 * amount);

    for (let y = 0; y < h; ) {
      const bh = 4 + Math.floor(hash(y * 0.31 + step * 2.3) * 22);
      const off = Math.round((hash(y * 0.77 + step * 5.1) - 0.5) * 78 * amount);
      let sy = (y + roll) % h;
      if (sy < 0) sy += h;
      const take = Math.min(bh, h - y);
      // the band may straddle the wrap point, so it is drawn in two parts
      const first = Math.min(take, h - sy);
      if (first > 0) ctx.drawImage(src.canvas, 0, sy, w, first, off, y, w, first);
      if (take - first > 0) {
        ctx.drawImage(src.canvas, 0, 0, w, take - first, off, y + first, w, take - first);
      }
      y += bh;
    }

    /* A couple of dropped lines of pure noise, and the bright retrace
       bar that sweeps the raster while the tube hunts for the pulse. */
    for (let i = 0; i < 3; i += 1) {
      const ny = Math.floor(hash(step * 3.7 + i * 9.1) * h);
      const nh = 1 + Math.floor(hash(step * 6.1 + i) * 3);
      ctx.globalAlpha = 0.5 * amount;
      for (let x = 0; x < w; x += 4) {
        const v = Math.round(hash(x * 0.13 + step * 1.9 + i) * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, ny, 4, nh);
      }
    }
    const bar = (1 - amount) * h * 1.4 - 20;
    ctx.globalAlpha = 0.16 * amount;
    ctx.fillStyle = "#dff2ff";
    ctx.fillRect(0, bar, w, 10);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * CHANNEL OSD
   * -----------
   * The programme's name, in the box a monitor's own on-screen display
   * would have drawn it in — top left, hard-edged, one colour, and gone
   * again after a few seconds.
   *
   * Deliberately temporary rather than a permanent caption. A label welded
   * into the corner of every frame is a watermark: it stops the screen
   * being a window into the programme and starts being a UI with a picture
   * behind it. Three seconds is long enough to read and attribute, short
   * enough that the tube spends most of its time showing only the work.
   *
   * Under reduced motion it simply stays — there is no cycling to
   * annotate, so the one stable frame keeps its title.
   */
  private drawChannelOsd(ctx: CanvasRenderingContext2D, w: number, frozen: boolean) {
    const hold = 2.6;
    const fade = 0.7;
    const age = this.progT;
    if (!frozen && age > hold + fade) return;
    const alpha = frozen ? 1 : age < hold ? 1 : 1 - (age - hold) / fade;

    const prog = this.programmes[this.index];
    const text = prog.label;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `600 11px ${this.mono}`;
    const tw = ctx.measureText(text).width;
    const bw = tw + 34;

    ctx.fillStyle = "rgba(6,10,14,0.78)";
    ctx.fillRect(10, 10, bw, 20);
    // The little lit tab an OSD always had down its left edge
    ctx.fillStyle = "#7fd8c0";
    ctx.fillRect(10, 10, 3, 20);
    ctx.fillStyle = "#4e6b78";
    ctx.fillRect(10, 29, bw, 1);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#6f8b98";
    ctx.fillText(`0${this.index + 1}`, 20, 24);
    ctx.fillStyle = "#e8f2f6";
    ctx.fillText(text, 40, 24);
    ctx.restore();
  }

  private lumaCanvas: HTMLCanvasElement | null = null;
  private lumaCtx: CanvasRenderingContext2D | null = null;

  private sampleLuma(): number {
    if (!this.lumaCanvas) {
      this.lumaCanvas = document.createElement("canvas");
      this.lumaCanvas.width = 16;
      this.lumaCanvas.height = 12;
      this.lumaCtx = this.lumaCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
    }
    const c = this.lumaCtx;
    if (!c) return this.luma;
    c.drawImage(this.canvas, 0, 0, 16, 12);
    const d = c.getImageData(0, 0, 16, 12).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    }
    return sum / (d.length / 4) / 255;
  }

  dispose() {
    /* Most programmes are pure canvas work and own nothing to release.
       The video channel owns a media element, so the hook exists. */
    for (const p of this.programmes) p.dispose?.();
    this.texture.dispose();
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.prev.width = 0;
    this.prev.height = 0;
    if (this.tearCanvas) {
      this.tearCanvas.width = 0;
      this.tearCanvas.height = 0;
    }
    if (this.lumaCanvas) {
      this.lumaCanvas.width = 0;
      this.lumaCanvas.height = 0;
    }
  }
}
