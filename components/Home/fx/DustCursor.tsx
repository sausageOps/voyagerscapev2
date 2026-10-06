"use client";

/* =========================================================================
   DUST CURSOR  —  the hero's pointer material
   -------------------------------------------------------------------------
   SELECTION RECORD
     section : 01 ARRIVAL — cursor response
     source  : React Bits — Pixel Trail / Ghost Cursor (MIT + Commons Clause)
     why     : the brief asks for light / film / dust, not a gaming reticle.
               A pixel trail is also the only cursor idea that speaks the
               same language as the dither reveal and the pixel display face,
               so the page keeps one material vocabulary.
     change  : React Bits renders its trail as a WebGL grid. The homepage
               already owns one WebGL surface (Pattern Waves), and the rule
               is one canvas context per scene, so this is a 2D canvas that
               emits a handful of 1–3px specks of ink. Under 60 live
               particles, alpha capped at 0.3, so it can never fight the
               headline for contrast. The shell's own cursor (dot + ring +
               label) is untouched — this sits behind it.
   ========================================================================= */

import { useEffect, useRef } from "react";
import { isFinePointer, prefersReducedMotion } from "../lib/engine";
import { useTheme } from "@/lib/theme-provider";
import styles from "./DustCursor.module.css";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

const MAX_PARTICLES = 60;
const IDLE_AFTER = 420; // ms of stillness before the loop goes to sleep

export default function DustCursor({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    if (!isFinePointer() || prefersReducedMotion()) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ink = isDark ? "244, 239, 230" : "17, 17, 17";
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let lastMove = 0;
    let pending: { x: number; y: number } | null = null;
    let last: { x: number; y: number } | null = null;
    const particles: Particle[] = [];

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const spawn = (x: number, y: number, speed: number) => {
      const count = Math.min(3, 1 + Math.floor(speed / 26));
      for (let i = 0; i < count; i += 1) {
        if (particles.length >= MAX_PARTICLES) particles.shift();
        const angle = Math.random() * Math.PI * 2;
        const spread = 2 + Math.random() * 10;
        particles.push({
          x: x + Math.cos(angle) * spread,
          y: y + Math.sin(angle) * spread,
          vx: Math.cos(angle) * 0.12 + (Math.random() - 0.5) * 0.18,
          vy: Math.sin(angle) * 0.1 - 0.16 - Math.random() * 0.14,
          life: 0,
          max: 620 + Math.random() * 620,
          size: Math.random() < 0.72 ? 1 : Math.random() < 0.85 ? 2 : 3,
        });
      }
    };

    let prev = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(48, now - prev);
      prev = now;

      if (pending) {
        const rect = host.getBoundingClientRect();
        const x = pending.x - rect.left;
        const y = pending.y - rect.top;
        const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
        if (inside) {
          const speed = last ? Math.hypot(x - last.x, y - last.y) : 0;
          if (speed > 1.1) spawn(x, y, speed);
          last = { x, y };
        } else {
          last = null;
        }
        pending = null;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        const t = p.life / p.max;
        /* rise, hold, settle — never a hard pop */
        const alpha = Math.sin(Math.PI * t) * 0.3;
        ctx.fillStyle = `rgba(${ink}, ${alpha.toFixed(3)})`;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }

      const idle = now - lastMove > IDLE_AFTER && particles.length === 0;
      if (idle || !visible) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !visible) return;
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pending = { x: event.clientX, y: event.clientY };
      lastMove = performance.now();
      start();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          cancelAnimationFrame(raf);
          raf = 0;
          particles.length = 0;
          ctx.clearRect(0, 0, width, height);
        }
      },
      { threshold: 0 },
    );
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [isDark]);

  return (
    <div className={`${styles.host} ${className}`} ref={hostRef} aria-hidden="true">
      <canvas className={styles.canvas} ref={canvasRef} />
    </div>
  );
}
