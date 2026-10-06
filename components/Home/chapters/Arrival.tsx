"use client";

/* =========================================================================
   01 — ARRIVAL
   -------------------------------------------------------------------------
   SELECTION RECORD
     hero type   : React Bits — Variable Proximity / Text Pressure
                   → components/Home/fx/ProximityType
     hero image  : React Bits — Pixel Transition + Cult UI — Hero Dithering
                   → the photograph develops out of a Bayer dither and the
                     crop breathes with the pointer; it behaves like a
                     material, never like a hover-scaled <img>.
     hero cursor : React Bits — Pixel Trail → components/Home/fx/DustCursor
     transition  : Aceternity — Container Scroll / Sticky Scroll Reveal
                   → re-authored as a sticky stage whose clip-path opens
                     from a portrait panel to full bleed, so the hero does
                     not fade away: it *becomes* the next chapter's ground.

   The whole scene is driven by three CSS variables written once per frame
   (--open, --lift, --fade) plus two pointer variables. No layout is read
   or written during the scroll.
   ========================================================================= */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useTheme } from "@/lib/theme-provider";
import { useUI } from "@/lib/ui-store";
import ProximityType from "../fx/ProximityType";
import DustCursor from "../fx/DustCursor";
import { DitherSurface } from "../lib/dither";
import {
  prefersReducedMotion,
  range,
  scrollToY,
  setVar,
  smoothstep,
  useField,
  useScene,
} from "../lib/engine";
import { ARRIVAL_FRAME } from "../data";
import styles from "./Arrival.module.css";

export default function Arrival({ nextId }: { nextId: string }) {
  const reducedRef = useRef(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<DitherSurface | null>(null);
  const coverRef = useRef({ intro: 1, exit: 0 });
  const paintRef = useRef<() => void>(() => {});
  const { isDark } = useTheme();
  /* The shell's startup curtain arms every entrance on the site; the hero
     rises *through* it rather than playing behind it. */
  const { loaded } = useUI();

  /* ---- the dither veil: intro development + exit dissolve ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const mask = maskRef.current;
    if (!canvas || !mask) return;

    const paper = getComputedStyle(document.documentElement)
      .getPropertyValue("--vs-frame-bg")
      .trim();
    const surface = new DitherSurface(canvas, { color: paper || "#fffdf9", cell: 3 });
    surfaceRef.current = surface;

    const paint = () => {
      const { intro, exit } = coverRef.current;
      surface.draw(Math.max(intro, exit));
    };
    paintRef.current = paint;

    const ro = new ResizeObserver(() => {
      const rect = mask.getBoundingClientRect();
      surface.resize(rect.width, rect.height);
      paint();
    });
    ro.observe(mask);

    paint();

    return () => {
      ro.disconnect();
      gsap.killTweensOf(coverRef.current);
      surface.destroy();
      surfaceRef.current = null;
    };
  }, []);

  /* ---- the photograph develops, once the curtain starts lifting ---- */
  useEffect(() => {
    if (!loaded) return;
    const paint = paintRef.current;
    if (prefersReducedMotion()) {
      coverRef.current.intro = 0;
      paint();
      return;
    }
    const proxy = coverRef.current;
    const tween = gsap.to(proxy, {
      intro: 0,
      duration: 1.7,
      delay: 0.1,
      ease: "power2.inOut",
      onUpdate: paint,
    });
    return () => {
      tween.kill();
    };
  }, [loaded]);

  /* Repaint the veil in the other theme's paper colour. */
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const paper = getComputedStyle(document.documentElement)
      .getPropertyValue("--vs-frame-bg")
      .trim();
    surface.setColor(paper || (isDark ? "#171716" : "#fffdf9"));
  }, [isDark]);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
  }, []);

  /* ---- scroll choreography ---- */
  useScene(trackRef, "pin", (p) => {
    const stage = stageRef.current;
    if (!stage) return;
    /* Reduced motion flattens the track to one screen, which would make
       the pin progress meaningless — leave the composition at rest. */
    if (reducedRef.current) return;
    const open = smoothstep(0, 1, range(p, 0.04, 0.66));
    const lift = range(p, 0, 0.62);
    const fade = range(p, 0.1, 0.42);
    setVar(stage, "--open", open);
    setVar(stage, "--lift", lift);
    setVar(stage, "--fade", fade);
    setVar(stage, "--scroll", p);

    const exit = smoothstep(0, 1, range(p, 0.72, 1)) * 0.94;
    if (Math.abs(exit - coverRef.current.exit) > 0.004) {
      coverRef.current.exit = exit;
      surfaceRef.current?.draw(Math.max(coverRef.current.intro, exit));
    }
  });

  /* ---- pointer: the crop breathes, it does not zoom ---- */
  useField(
    stageRef,
    (x, y, strength) => {
      const stage = stageRef.current;
      if (!stage) return;
      setVar(stage, "--mx", (x - 0.5) * 2 * strength);
      setVar(stage, "--my", (y - 0.5) * 2 * strength);
    },
    { ease: 0.08, margin: 0 },
  );

  /* ---- headline entrance ---- */
  useEffect(() => {
    if (!loaded) return;
    const el = headlineRef.current;
    if (!el) return;
    const chars = el.querySelectorAll<HTMLElement>("[data-char]");
    if (!chars.length) return;
    if (prefersReducedMotion()) return;
    const stage = stageRef.current;
    const fades = stage
      ? Array.from(stage.querySelectorAll<HTMLElement>("[data-hero-fade]"))
      : [];

    const tl = gsap.timeline();
    tl.fromTo(
      chars,
      { opacity: 0, yPercent: 46 },
      {
        opacity: 1,
        yPercent: 0,
        duration: 1.05,
        ease: "expo.out",
        stagger: 0.022,
        delay: 0.1,
        clearProps: "opacity,transform",
      },
    );
    if (fades.length) {
      tl.fromTo(
        fades,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.07,
          clearProps: "opacity,transform",
        },
        0.42,
      );
    }
    return () => {
      tl.kill();
    };
  }, [loaded]);

  const onEnter = () => {
    const next = document.getElementById(nextId);
    if (!next) return;
    scrollToY(next.getBoundingClientRect().top + window.scrollY, 1.2);
  };

  return (
    <section
      className={styles.chapter}
      id="arrival"
      data-chapter-section="arrival"
      aria-label="Arrival"
    >
      <div className={styles.track} ref={trackRef}>
        <div
          className={styles.stage}
          ref={stageRef}
          data-enter={loaded ? "done" : "pending"}
        >
          {/* ---- editorial metadata, the four corners ---- */}
          <div className={styles.meta}>
            <span className={`${styles.metaItem} ${styles.tl} vs-tech`} data-hero-fade>
              01 — Arrival
            </span>
            <span className={`${styles.metaItem} ${styles.tr} vs-tech`} data-hero-fade>
              Visual practice
            </span>
            <span className={`${styles.metaItem} ${styles.bl} vs-tech`} data-hero-fade>
              Kolkata / India
              <em className={styles.coords}>22.57°N 88.36°E</em>
            </span>
            <span className={`${styles.metaItem} ${styles.br} vs-tech`} data-hero-fade>
              2026
            </span>
          </div>

          {/* ---- headline ---- */}
          <div className={styles.typeLayer} ref={headlineRef}>
            <ProximityType
              as="h1"
              className={styles.headline}
              lines={["IMAGES", "BECOME", "WORLDS."]}
              label="Images become worlds."
              radius={200}
            />
            <p className={styles.standfirst} data-hero-fade>
              A visual practice working across photography, art, motion,
              design and code — one image at a time, until it opens.
            </p>
          </div>

          {/* ---- the photograph ---- */}
          <div className={styles.imageLayer}>
            <div className={styles.mask} ref={maskRef}>
              <img
                className={styles.image}
                src={ARRIVAL_FRAME.src}
                width={ARRIVAL_FRAME.width}
                height={ARRIVAL_FRAME.height}
                alt={ARRIVAL_FRAME.alt}
                decoding="async"
                fetchPriority="high"
              />
              <canvas className={styles.dither} ref={canvasRef} aria-hidden="true" />
              <span className={`${styles.plate} vs-tech vs-tech--nano`}>
                {ARRIVAL_FRAME.title} · {ARRIVAL_FRAME.place}
              </span>
            </div>
          </div>

          {/* ---- the way in ---- */}
          <button
            className={styles.enter}
            type="button"
            onClick={onEnter}
            data-hero-fade
            data-cursor-label="Enter"
          >
            <span className={styles.enterRule} aria-hidden="true">
              <i className={styles.enterFill} />
            </span>
            <span className={`${styles.enterLabel} vs-tech`}>Scroll to enter</span>
          </button>

          <DustCursor className={styles.dust} />
        </div>
      </div>
    </section>
  );
}
