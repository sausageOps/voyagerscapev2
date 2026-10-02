"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Stage3Atmosphere.module.css";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";
import { STAGE3_CONFIG, STAGE3_PALETTE } from "./palette";

/**
 * Stage 3 prototype — procedural colour atmosphere on a raw WebGL fullscreen
 * quad. Isolated from the homepage: nothing here is imported by HomeCanvas or
 * any shipped route other than the prototype page.
 *
 * Everything animated lives inside one requestAnimationFrame loop writing
 * uniforms. React state is only ever touched for the one-shot "no WebGL"
 * fallback flag, never per frame.
 */

type Uniforms = Record<string, WebGLUniformLocation | null>;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[stage3] shader compile failed", gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function Stage3Atmosphere({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    } as WebGLContextAttributes) ||
      canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })) as
      | WebGLRenderingContext
      | null;

    if (!gl) {
      setUnsupported(true);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      setUnsupported(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[stage3] link failed", gl.getProgramInfoLog(program));
      }
      setUnsupported(true);
      return;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const u: Uniforms = {};
    for (const name of [
      "uResolution",
      "uTime",
      "uPointer",
      "uPointerVel",
      "uPointerAmount",
      "uStrength",
      "uBase",
      "uLavender",
      "uSage",
      "uPowder",
      "uCream",
      "uInk",
    ]) {
      u[name] = gl.getUniformLocation(program, name);
    }

    gl.uniform3fv(u.uBase, STAGE3_PALETTE.base as unknown as number[]);
    gl.uniform3fv(u.uLavender, STAGE3_PALETTE.lavender as unknown as number[]);
    gl.uniform3fv(u.uSage, STAGE3_PALETTE.sage as unknown as number[]);
    gl.uniform3fv(u.uPowder, STAGE3_PALETTE.powder as unknown as number[]);
    gl.uniform3fv(u.uCream, STAGE3_PALETTE.cream as unknown as number[]);
    gl.uniform3fv(u.uInk, STAGE3_PALETTE.ink as unknown as number[]);
    gl.uniform1f(u.uStrength, STAGE3_CONFIG.pointerStrength);

    // ----------------------------------------------------------- sizing ---
    let width = 1;
    let height = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, STAGE3_CONFIG.maxPixelRatio);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.uResolution, w, h);
    };
    resize();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });

    // ---------------------------------------------------------- pointer ---
    const pointerTarget = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0 };
    const velocity = { x: 0, y: 0 };
    let influenceTarget = 0;
    let influence = 0;
    let hasPointer = false;

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const aspect = rect.width / rect.height;
      const nx = ((event.clientX - rect.left) / rect.width - 0.5) * aspect;
      const ny = 0.5 - (event.clientY - rect.top) / rect.height;
      if (!hasPointer) {
        pointer.x = nx;
        pointer.y = ny;
        hasPointer = true;
      }
      pointerTarget.x = nx;
      pointerTarget.y = ny;
      influenceTarget = 1;
    };

    const onPointerLeave = () => {
      influenceTarget = 0;
    };

    const host = canvas.parentElement ?? canvas;
    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerleave", onPointerLeave, { passive: true });
    host.addEventListener("pointercancel", onPointerLeave, { passive: true });

    // ------------------------------------------------------------- loop ---
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = performance.now();
    let simTime = Math.random() * 400; // avoid every visitor seeing frame zero
    let running = true;

    const render = (now: number) => {
      raf = window.requestAnimationFrame(render);
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;

      const timeScale = reduced.matches
        ? STAGE3_CONFIG.reducedTimeScale
        : STAGE3_CONFIG.timeScale;
      simTime += dt * timeScale * 10;

      // Pointer smoothing: critically-damped-ish follow, velocity derived from
      // the smoothed position so a flick bends the field and then relaxes.
      const follow = 1 - Math.pow(0.0015, dt);
      const prevX = pointer.x;
      const prevY = pointer.y;
      pointer.x += (pointerTarget.x - pointer.x) * follow;
      pointer.y += (pointerTarget.y - pointer.y) * follow;

      const instVx = dt > 0 ? (pointer.x - prevX) / dt : 0;
      const instVy = dt > 0 ? (pointer.y - prevY) / dt : 0;
      const velEase = 1 - Math.pow(0.02, dt);
      velocity.x += (instVx - velocity.x) * velEase;
      velocity.y += (instVy - velocity.y) * velEase;

      // Influence decays whenever movement stops, not only on leave.
      const moving = Math.hypot(instVx, instVy) > 0.02;
      if (!moving) influenceTarget = 0;
      const decay = 1 - Math.pow(STAGE3_CONFIG.pointerDecay, dt * 3);
      influence += (influenceTarget - influence) * (influenceTarget > influence ? 1 - Math.pow(0.02, dt) : decay);

      if (reduced.matches && influence < 0.001) {
        // Still draw once so the canvas is never blank, then idle.
        gl.uniform1f(u.uTime, simTime);
        gl.uniform2f(u.uPointer, pointer.x, pointer.y);
        gl.uniform2f(u.uPointerVel, 0, 0);
        gl.uniform1f(u.uPointerAmount, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return;
      }

      gl.uniform1f(u.uTime, simTime);
      gl.uniform2f(u.uPointer, pointer.x, pointer.y);
      gl.uniform2f(u.uPointerVel, velocity.x, velocity.y);
      gl.uniform1f(u.uPointerAmount, influence);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = window.requestAnimationFrame(render);
    };
    const stop = () => {
      running = false;
      window.cancelAnimationFrame(raf);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    raf = window.requestAnimationFrame(render);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
      observer?.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("pointercancel", onPointerLeave);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-stage3-fallback={unsupported ? "" : undefined}
      className={className ? `${styles.canvas} ${className}` : styles.canvas}
    />
  );
}
