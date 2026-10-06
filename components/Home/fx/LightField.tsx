"use client";

/* =========================================================================
   LIGHT FIELD  —  image → data → form → image
   -------------------------------------------------------------------------
   SELECTION RECORD
     section : 04 MADE WITH LIGHT  (+ 15 DIGITAL / CODE IDENTITY)
     source  : React Bits — Dither / Dot Grid / Pixel Blast,
               Cult UI — Hero Dithering, Aceternity — Dither Shader
     why     : the chapter has to *be* the argument, not illustrate it. One
               surface that samples a photograph into light and puts it
               back makes the code identity visible without a single line
               of "we also do technology".
     change  : every candidate ships as a WebGL fragment shader. The
               homepage already owns one WebGL context (the Pattern Waves
               atmosphere), and the brief forbids stacking canvases, so
               this is a single 2D context: the photograph is sampled once
               per grid resolution into a luminance array, and each frame
               is a few thousand rects — cheap, pausable, and it can hold
               the palette exactly (ink on paper, never a rainbow).

   The field is driven, never animated: progress comes from the scroll and
   light from the pointer. With no input it is perfectly still.
   ========================================================================= */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { clamp01, lerp, range, smoothstep } from "../lib/engine";
import styles from "./LightField.module.css";

export interface LightFieldHandle {
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number, strength: number) => void;
}

interface Props {
  src: string;
  width: number;
  height: number;
  alt: string;
  isDark: boolean;
}

const GLYPHS = ["·", ":", "+", "=", "*", "#", "%", "@"];

const LightField = forwardRef<LightFieldHandle, Props>(function LightField(
  { src, width, height, alt, isDark },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<LightFieldHandle>({ setProgress: () => {}, setPointer: () => {} });

  useImperativeHandle(ref, () => ({
    setProgress: (p) => apiRef.current.setProgress(p),
    setPointer: (x, y, s) => apiRef.current.setPointer(x, y, s),
  }));

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const image = imgRef.current;
    const paper = paperRef.current;
    if (!host || !canvas || !image || !paper) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let progress = 0;
    let px = 0.5;
    let py = 0.5;
    let ps = 0;
    let raf = 0;
    let visible = false;
    let ready = false;

    /* ---- luminance sampling, cached per grid resolution ---- */
    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });
    const cache = new Map<string, Float32Array>();

    const sample = (cols: number, rows: number): Float32Array | null => {
      if (!sctx || !ready) return null;
      const key = `${cols}x${rows}`;
      const hit = cache.get(key);
      if (hit) return hit;
      sampler.width = cols;
      sampler.height = rows;
      sctx.clearRect(0, 0, cols, rows);
      sctx.drawImage(image, 0, 0, cols, rows);
      let data: ImageData;
      try {
        data = sctx.getImageData(0, 0, cols, rows);
      } catch {
        return null;
      }
      const out = new Float32Array(cols * rows);
      for (let i = 0; i < out.length; i += 1) {
        const o = i * 4;
        out[i] =
          (0.2126 * data.data[o] + 0.7152 * data.data[o + 1] + 0.0722 * data.data[o + 2]) / 255;
      }
      if (cache.size > 6) cache.clear();
      cache.set(key, out);
      return out;
    };

    const readInk = () => {
      const cs = getComputedStyle(document.documentElement);
      const hostStyle = getComputedStyle(host);
      return {
        ink: cs.getPropertyValue("--vs-ink").trim() || "#111111",
        paper: cs.getPropertyValue("--vs-frame-bg").trim() || "#fffdf9",
        /* canvas cannot resolve CSS variables, so the real resolved family
           is read off the host (which inherits the technical face). */
        mono: hostStyle.fontFamily || "ui-monospace, monospace",
      };
    };
    let palette = readInk();

    const resize = () => {
      const rect = host.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      cache.clear();
      schedule();
    };

    const draw = () => {
      raf = 0;
      if (!w || !h) return;

      /* -------- stage mix -------- */
      const onset = smoothstep(0, 1, range(progress, 0.1, 0.3));
      const outset = smoothstep(0, 1, range(progress, 0.76, 0.93));
      const presence = clamp01(onset - outset);
      const dataStage = smoothstep(0, 1, range(progress, 0.2, 0.5));
      const formStage = smoothstep(0, 1, range(progress, 0.52, 0.72));
      const resolve = smoothstep(0, 1, range(progress, 0.72, 0.92));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      paper.style.opacity = presence.toFixed(3);
      if (presence <= 0.002) return;

      /* coarse in the middle of the passage, fine at both ends */
      const cell = Math.max(
        7,
        Math.round(lerp(lerp(11, 20, dataStage), lerp(27, 12, resolve), formStage)),
      );
      const cols = Math.max(2, Math.floor(w / cell));
      const rows = Math.max(2, Math.floor(h / cell));
      const lum = sample(cols, rows);
      if (!lum) return;

      const offsetX = (w - cols * cell) / 2;
      const offsetY = (h - rows * cell) / 2;
      const lightX = px * w;
      const lightY = py * h;
      const reach = Math.max(w, h) * 0.34;
      const glyphMode = formStage > 0.42 && resolve < 0.6;

      if (glyphMode) {
        ctx.font = `${Math.round(cell * 0.92)}px ${palette.mono}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
      }

      for (let y = 0; y < rows; y += 1) {
        const cy = offsetY + y * cell + cell / 2;
        for (let x = 0; x < cols; x += 1) {
          const cx = offsetX + x * cell + cell / 2;
          const l = lum[y * cols + x];
          /* ink density: dark pixels carry more ink */
          let density = 1 - l;

          if (ps > 0.01) {
            const d = Math.hypot(cx - lightX, cy - lightY);
            if (d < reach) {
              const fall = 1 - d / reach;
              density += fall * fall * 0.42 * ps;
            }
          }

          density = clamp01(density * (0.5 + 0.9 * presence));
          if (density < 0.06) continue;

          const alpha = Math.min(0.92, density * presence);

          if (glyphMode) {
            const g = GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(density * GLYPHS.length))];
            ctx.fillStyle = palette.ink;
            ctx.globalAlpha = alpha * 0.85;
            ctx.fillText(g, cx, cy);
          } else {
            const size = cell * (0.22 + density * 0.74);
            ctx.fillStyle = palette.ink;
            ctx.globalAlpha = alpha;
            const square = formStage;
            if (square > 0.5) {
              ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
            } else {
              ctx.beginPath();
              ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      ctx.globalAlpha = 1;


    };

    const schedule = () => {
      if (raf || !visible) return;
      raf = requestAnimationFrame(draw);
    };

    apiRef.current = {
      setProgress: (p) => {
        if (Math.abs(p - progress) < 0.0015) return;
        progress = p;
        schedule();
      },
      setPointer: (x, y, s) => {
        if (Math.abs(x - px) < 0.002 && Math.abs(y - py) < 0.002 && Math.abs(s - ps) < 0.004) {
          return;
        }
        px = x;
        py = y;
        ps = s;
        schedule();
      },
    };

    const onReady = () => {
      ready = true;
      cache.clear();
      schedule();
    };
    if (image.complete && image.naturalWidth) onReady();
    else image.addEventListener("load", onReady, { once: true });

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule();
        else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "10% 0px" },
    );
    io.observe(host);

    const onTheme = () => {
      palette = readInk();
      schedule();
    };
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    resize();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      image.removeEventListener("load", onReady);
      cache.clear();
    };
  }, [src, isDark]);

  return (
    <div className={styles.host} ref={hostRef}>
      <div className={styles.paper} aria-hidden="true" ref={paperRef} />
      <img
        className={styles.photo}
        ref={imgRef}
        src={src}
        width={width}
        height={height}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
      <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />
    </div>
  );
});

export default LightField;
