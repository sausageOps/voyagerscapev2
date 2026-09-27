"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./Cursor.module.css";

type CursorMode = "default" | "link" | "label";

/** Elements that put the cursor into its interactive state. */
const INTERACTIVE =
  "[data-cursor], a[href], button, input, textarea, select, [role='button'], [tabindex]:not([tabindex='-1'])";

/** Subset that also receives the subtle magnetic pull. */
const MAGNETIC = "[data-magnetic]";
const MAGNET_MAX = 10; // px — refined, never "flying"
const MAGNET_RADIUS = 90; // px beyond the element bounds where pull begins

/**
 * Global custom cursor.
 *
 * Mounted once in AppShell so it survives every route transition. The DOM
 * nodes are always rendered (never behind a conditional return) — that was the
 * original bug: the mount effect ran while the refs were still null, so no
 * listeners were ever attached and the cursor sat frozen at 0,0 while the
 * native cursor had already been hidden.
 */
export default function Cursor() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!root || !dot || !ring || !label) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = prefersReducedMotion();

    let enabled = false;
    let visible = false;
    let pointer = { x: -100, y: -100 };
    let magnetEl: HTMLElement | null = null;
    let mode: CursorMode = "default";
    let labelText = "";

    /* Park off-screen first so the quickTo tweens start from a known state. */
    gsap.set([dot, ring], { opacity: 0, x: -100, y: -100 });

    /* Transform-driven follow: dot is near-instant, ring trails slightly. */
    const dotX = gsap.quickTo(dot, "x", { duration: reduced ? 0 : 0.05, ease: "power3.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: reduced ? 0 : 0.05, ease: "power3.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: reduced ? 0 : 0.2, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: reduced ? 0 : 0.2, ease: "power3.out" });

    const enable = () => {
      if (enabled) return;
      enabled = true;
      document.documentElement.classList.add("has-custom-cursor");
    };

    const disable = () => {
      if (!enabled) return;
      enabled = false;
      visible = false;
      document.documentElement.classList.remove("has-custom-cursor");
      gsap.set([dot, ring], { opacity: 0 });
      releaseMagnet();
    };

    const show = () => {
      if (visible) return;
      visible = true;
      // NB: never overwrite: true here — it would kill the quickTo x/y tweens
      gsap.to([dot, ring], { opacity: 1, duration: 0.2, ease: "power2.out", overwrite: "auto" });
    };

    const hide = () => {
      if (!visible) return;
      visible = false;
      gsap.to([dot, ring], { opacity: 0, duration: 0.18, ease: "power2.out", overwrite: "auto" });
    };

    function releaseMagnet() {
      if (!magnetEl) return;
      gsap.to(magnetEl, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.7)", overwrite: true });
      magnetEl = null;
    }

    const applyMagnet = (el: HTMLElement) => {
      if (reduced) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      const reach = Math.max(rect.width, rect.height) / 2 + MAGNET_RADIUS;
      const pull = gsap.utils.clamp(0, 1, 1 - Math.hypot(dx, dy) / reach);
      gsap.to(el, {
        x: gsap.utils.clamp(-MAGNET_MAX, MAGNET_MAX, dx * 0.32) * pull,
        y: gsap.utils.clamp(-MAGNET_MAX, MAGNET_MAX, dy * 0.32) * pull,
        duration: 0.45,
        ease: "power3.out",
        overwrite: true,
      });
    };

    const setMode = (next: CursorMode, nextLabel: string) => {
      if (next === mode && nextLabel === labelText) return;
      mode = next;
      labelText = nextLabel;
      root.dataset.mode = next;
      label.textContent = nextLabel;
      root.dataset.labelled = nextLabel ? "true" : "false";
    };

    /** Reads whatever sits under the pointer and syncs cursor + magnet state. */
    const syncTarget = () => {
      const under = document.elementFromPoint(pointer.x, pointer.y) as HTMLElement | null;
      const target = under?.closest<HTMLElement>(INTERACTIVE) ?? null;

      if (!target) {
        setMode("default", "");
        releaseMagnet();
        return;
      }

      const custom = target.dataset.cursor;
      const text = target.dataset.cursorLabel ?? "";
      setMode(text ? "label" : custom === "none" ? "default" : "link", text);

      const magnetTarget = target.closest<HTMLElement>(MAGNETIC);
      if (magnetTarget !== magnetEl) {
        releaseMagnet();
        magnetEl = magnetTarget;
      }
      if (magnetEl) applyMagnet(magnetEl);
    };

    const onPointerMove = (event: PointerEvent) => {
      // Only genuine touch/pen input disables the cursor. Some embedders
      // (and synthetic input) report an empty pointerType for real mice.
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        disable();
        return;
      }
      enable();
      pointer = { x: event.clientX, y: event.clientY };
      dotX(pointer.x);
      dotY(pointer.y);
      ringX(pointer.x);
      ringY(pointer.y);
      show();
      syncTarget();
    };

    /* Keep state correct when the page scrolls under a still pointer. */
    const onScroll = () => {
      if (!enabled || !visible) return;
      syncTarget();
    };

    const onDown = () => {
      if (!enabled) return;
      gsap.to(ring, { scale: 0.86, duration: 0.14, ease: "power2.out", overwrite: "auto" });
      gsap.to(dot, { scale: 0.6, duration: 0.14, ease: "power2.out", overwrite: "auto" });
    };

    const onUp = () => {
      if (!enabled) return;
      gsap.to([ring, dot], { scale: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    };

    const onLeave = (event: PointerEvent) => {
      if (event.relatedTarget === null) hide();
    };

    const onBlur = () => hide();
    const onTouch = () => disable();

    const onMediaChange = (event: MediaQueryListEvent) => {
      if (!event.matches) disable();
    };

    if (fine.matches) enable();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("blur", onBlur);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    fine.addEventListener("change", onMediaChange);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("scroll", onScroll, { capture: true });
      fine.removeEventListener("change", onMediaChange);
      releaseMagnet();
      gsap.killTweensOf([dot, ring]);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <div className={styles.root} ref={rootRef} data-mode="default" data-labelled="false" aria-hidden="true">
      <div className={styles.ring} ref={ringRef}>
        <span className={styles.label} ref={labelRef} />
      </div>
      <div className={styles.dot} ref={dotRef} />
    </div>
  );
}
