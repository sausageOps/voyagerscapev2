"use client";

/* =========================================================
   STAGE 3 — ATMOSPHERE PROTOTYPE (ISOLATED)

   Host for the procedural mesh gradient. Mounted only by
   /stage3-atmosphere; imported by nothing else in the app.

   Contract:
   - zero React state updates per frame (the only setState is the
     one-shot "WebGL is unavailable" switch),
   - one requestAnimationFrame loop, throttled, paused when the tab
     is hidden,
   - devicePixelRatio capped, drawing buffer rendered below CSS size
     and let the compositor upscale (the field is band-limited, so
     this is free quality-wise and cheap on fill rate),
   - prefers-reduced-motion renders exactly one static frame,
   - context loss is recovered from; a hard failure falls back to a
     static CSS field.
   ========================================================= */

import { useEffect, useRef, useState } from "react";
import styles from "./AtmosphereField.module.css";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./meshGradientShaders";

/** Retina is wasted on a field with no edges in it. */
const DPR_CAP = 1.5;
/** Fraction of CSS pixels actually rasterised; upscaled by the compositor. */
const RENDER_SCALE = 0.72;
/** ~36fps. Nothing in the field moves fast enough to need more. */
const FRAME_INTERVAL_MS = 1000 / 36;
/** Where the static (reduced-motion) frame is sampled from. */
const STATIC_TIME = 48;

type GL = WebGL2RenderingContext | WebGLRenderingContext;

const CONTEXT_ATTRS: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
  powerPreference: "low-power",
  failIfMajorPerformanceCaveat: false,
};

function compile(gl: GL, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[stage3] shader compile failed:", gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: GL): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Shaders are reference-counted by the program; drop our handles either way.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[stage3] program link failed:", gl.getProgramInfoLog(program));
    }
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function AtmosphereField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl2", CONTEXT_ATTRS) ??
      canvas.getContext("webgl", CONTEXT_ATTRS)) as GL | null;

    if (!gl) {
      setUnsupported(true);
      return;
    }

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ---- GL resources (rebuilt on context restore) ---- */
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uAspect: WebGLUniformLocation | null = null;
    let ready = false;

    /* ---- loop state (never React state) ---- */
    let raf = 0;
    let elapsed = reduceQuery.matches ? STATIC_TIME : 0;
    let lastTick = 0;
    let lastDraw = 0;
    let bufferW = 0;
    let bufferH = 0;
    let destroyed = false;

    const buildResources = () => {
      program = createProgram(gl);
      if (!program) return false;

      buffer = gl.createBuffer();
      if (!buffer) return false;

      // One oversized triangle covering the clip-space viewport.
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );

      const aPosition = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      uTime = gl.getUniformLocation(program, "uTime");
      uAspect = gl.getUniformLocation(program, "uAspect");

      gl.useProgram(program);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0.864, 0.865, 0.876, 1);
      return true;
    };

    const releaseResources = () => {
      ready = false;
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      buffer = null;
      program = null;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const maxTexture = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;

      const w = Math.max(1, Math.min(Math.round(cssW * dpr * RENDER_SCALE), maxTexture));
      const h = Math.max(1, Math.min(Math.round(cssH * dpr * RENDER_SCALE), maxTexture));

      if (w === bufferW && h === bufferH) return false;
      bufferW = w;
      bufferH = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      return true;
    };

    const draw = () => {
      if (!ready) return;
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uAspect, bufferH > 0 ? bufferW / bufferH : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = (now: number) => {
      raf = window.requestAnimationFrame(tick);
      const delta = lastTick === 0 ? 0 : Math.min(now - lastTick, 120);
      lastTick = now;
      elapsed += delta / 1000;
      if (now - lastDraw < FRAME_INTERVAL_MS) return;
      lastDraw = now;
      draw();
    };

    const stopLoop = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      lastTick = 0;
    };

    const startLoop = () => {
      if (destroyed || !ready) return;
      stopLoop();
      if (reduceQuery.matches || document.hidden) {
        // Static frame only — no loop, no battery cost.
        draw();
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };

    /* ---- resize ---- */
    const onResize = () => {
      if (!ready) return;
      if (resize() && (reduceQuery.matches || document.hidden)) draw();
    };

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    observer?.observe(canvas);
    window.addEventListener("resize", onResize, { passive: true });

    /* ---- pause when not visible ---- */
    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    /* ---- reduced-motion can change mid-session ---- */
    const onReduceChange = () => {
      if (reduceQuery.matches) elapsed = STATIC_TIME;
      startLoop();
    };
    if (typeof reduceQuery.addEventListener === "function") {
      reduceQuery.addEventListener("change", onReduceChange);
    } else {
      // Safari < 14
      reduceQuery.addListener(onReduceChange);
    }

    /* ---- context loss ---- */
    const onLost = (event: Event) => {
      event.preventDefault();
      stopLoop();
      releaseResources();
    };
    const onRestored = () => {
      if (destroyed) return;
      ready = buildResources();
      if (!ready) {
        setUnsupported(true);
        return;
      }
      bufferW = 0;
      bufferH = 0;
      resize();
      startLoop();
    };
    canvas.addEventListener("webglcontextlost", onLost as EventListener, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);

    /* ---- go ---- */
    ready = buildResources();
    if (!ready) {
      setUnsupported(true);
    } else {
      resize();
      startLoop();
    }

    return () => {
      destroyed = true;
      stopLoop();
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (typeof reduceQuery.removeEventListener === "function") {
        reduceQuery.removeEventListener("change", onReduceChange);
      } else {
        reduceQuery.removeListener(onReduceChange);
      }
      canvas.removeEventListener("webglcontextlost", onLost as EventListener);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      releaseResources();
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  }, []);

  return (
    <div className={styles.field} aria-hidden="true">
      {/* Painted underneath always: it is the first-paint colour before GL
          is ready, and the whole picture if GL never arrives. */}
      <div className={styles.fallback} />
      {!unsupported && <canvas ref={canvasRef} className={styles.canvas} />}
    </div>
  );
}
