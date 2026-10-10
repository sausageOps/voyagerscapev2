"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/components/SmoothScroll";
import styles from "./PinnedPanels.module.css";

/**
 * PINNED PANELS — a faithful port of the GSAP demo "Pinned panels with
 * overscroll" (codepen.io/GreenSock/pen/bGRdvMy, "Slides Pinning - Overscroll
 * Solution"). Structure, timings and the overscroll (fake-scroll) maths are
 * the demo's own; see buildPanels() for the line-by-line correspondence.
 *
 * Content is the demo's sample content and image arrangement. The images are
 * local neutral placeholders (the demo's CDN images are not reachable from
 * the build environment). Photography and copy are replaced in a later pass.
 */

type Panel =
  | { id: string; kind: "image"; title: string; src: string }
  | { id: string; kind: "text"; title: string; paragraphs: string[] };

const LONG_PARAGRAPH =
  "This section is long with text content and needs to be scrollable within before the next slide comes in.";

const PANELS: Panel[] = [
  { id: "section-1", kind: "image", title: "Section 1", src: "/pinned-panels/sample-1.jpg" },
  {
    id: "section-2",
    kind: "text",
    title: "Section 2",
    paragraphs: [...Array.from({ length: 11 }, () => LONG_PARAGRAPH), "This is the end..."],
  },
  { id: "section-3", kind: "image", title: "Section 3", src: "/pinned-panels/sample-2.jpg" },
  // The last panel is not pinned (the demo's panels.pop()): it flows into the
  // ordinary page content, and the footer follows it.
  { id: "section-4", kind: "image", title: "Section 4", src: "/pinned-panels/sample-3.jpg" },
];

/** The demo pins every panel except the last one. */
const PINNED_COUNT = PANELS.length - 1;

const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";

/** Height changes below this, with the width unchanged, are mobile toolbar
 *  movement and must not rebuild the pins mid-scroll. */
const TOOLBAR_THRESHOLD_PX = 120;

/**
 * Builds the demo's pinned timelines for every pinned panel. Returns a cleanup
 * that removes the overscroll margins; the ScrollTriggers and timelines are
 * owned by the surrounding gsap.matchMedia context and are reverted with it.
 */
function buildPanels(root: HTMLElement): () => void {
  const allPanels = Array.from(root.querySelectorAll<HTMLElement>("[data-pinned-panel]"));
  // Start from an unmodified layout so every measurement below is current.
  allPanels.forEach((panel) => {
    panel.style.marginBottom = "";
  });

  // Demo: var panels = gsap.utils.toArray(".section"); panels.pop();
  const panels = allPanels.slice(0, PINNED_COUNT);

  panels.forEach((panel) => {
    // Demo: the element holding the content inside the panel.
    const innerpanel = panel.querySelector<HTMLElement>("[data-pinned-inner]");
    if (!innerpanel) return;

    // Demo: panelHeight / windowHeight / difference.
    const panelHeight = innerpanel.offsetHeight;
    const windowHeight = window.innerHeight;
    const difference = panelHeight - windowHeight;

    // Demo: the portion of the overall animation that is fake scrolling. The
    // scale and fade take one window height, so the ratio follows from that.
    const fakeScrollRatio = difference > 0 ? difference / (difference + windowHeight) : 0;

    // Demo: add the margin the fake scroll needs so the next element comes in
    // at the right time.
    if (fakeScrollRatio) {
      panel.style.marginBottom = panelHeight * fakeScrollRatio + "px";
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: panel,
        start: "bottom bottom",
        end: () => (fakeScrollRatio ? `+=${innerpanel.offsetHeight}` : "bottom top"),
        pinSpacing: false,
        pin: true,
        // Adaptation: the homepage sits inside a transformed composition
        // (HorizontalComposition), which would make `position: fixed` pins
        // resolve against that ancestor. Transform pinning is the demo's
        // identical pin, positioned by transform instead.
        pinType: "transform",
        scrub: true,
      },
    });

    // Demo: fake scroll. 1 is the rest of the timeline (0.9 scale + 0.1 fade).
    if (fakeScrollRatio) {
      tl.to(innerpanel, {
        yPercent: -100,
        y: window.innerHeight,
        duration: 1 / (1 - fakeScrollRatio) - 1,
        ease: "none",
      });
    }

    // Demo: scale to 0.7 and fade, then fade out.
    tl.fromTo(panel, { scale: 1, opacity: 1 }, { scale: 0.7, opacity: 0.5, duration: 0.9 }).to(
      panel,
      { opacity: 0, duration: 0.1 },
    );
  });

  ScrollTrigger.refresh();

  return () => {
    allPanels.forEach((panel) => {
      panel.style.marginBottom = "";
    });
  };
}

export default function PinnedPanels() {
  const rootRef = useRef<HTMLElement | null>(null);
  const lenis = useLenis();

  /* Lenis drives window scroll (one engine, driven by the GSAP ticker in
     SmoothScroll). Updating ScrollTrigger from Lenis's own scroll event keeps
     pins in the same frame as the smooth position. No second loop is added. */
  useEffect(() => {
    if (!lenis) return;
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    return () => {
      lenis.off("scroll", onScroll);
    };
  }, [lenis]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);

    let mm = gsap.matchMedia();
    let disposed = false;
    let lastWidth = -1;
    let lastHeight = -1;
    let lastInnerHeights: number[] = [];

    const build = () => {
      if (disposed) return;
      mm.revert();
      mm = gsap.matchMedia();
      mm.add(MOTION_QUERY, () => {
        // Pinning CSS is applied only while motion is allowed, so the static
        // layout is the reduced-motion and JavaScript-off layout.
        root.setAttribute("data-pinned", "true");
        const cleanup = buildPanels(root);
        return () => {
          cleanup();
          root.removeAttribute("data-pinned");
        };
      });
      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
      lastInnerHeights = innerPanels().map((el) => el.offsetHeight);
    };

    const innerPanels = () =>
      Array.from(root.querySelectorAll<HTMLElement>("[data-pinned-inner]"));

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        const widthChanged = window.innerWidth !== lastWidth;
        const heightChanged =
          Math.abs(window.innerHeight - lastHeight) >= TOOLBAR_THRESHOLD_PX;
        const heights = innerPanels().map((el) => el.offsetHeight);
        const contentChanged =
          heights.length !== lastInnerHeights.length ||
          heights.some((h, i) => h !== lastInnerHeights[i]);
        if (widthChanged || heightChanged || contentChanged) build();
      });
    };

    // Images and fonts change measured heights after the first build.
    const images = Array.from(root.querySelectorAll("img"));
    const onImageLoad = () => schedule();
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener("load", onImageLoad);
    });
    void document.fonts?.ready.then(() => {
      if (!disposed) build();
    });

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => schedule())
        : null;
    observer?.observe(root);
    innerPanels().forEach((el) => observer?.observe(el));

    window.addEventListener("resize", schedule);

    build();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
      images.forEach((img) => img.removeEventListener("load", onImageLoad));
      mm.revert();
      root.removeAttribute("data-pinned");
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className={styles.root}
      aria-label="Pinned panels"
      data-pinned-root
    >
      {PANELS.map((panel) => {
        const isLong = panel.kind === "text";
        return (
          <div
            key={panel.id}
            className={isLong ? `${styles.panel} ${styles.panelLong}` : styles.panel}
            data-pinned-panel
            data-panel-id={panel.id}
          >
            <div className={styles.content}>
              <div className={styles.inner} data-pinned-inner>
                <h2 className={styles.title}>{panel.title}</h2>
                {panel.kind === "image" ? (
                  <img className={styles.image} src={panel.src} alt="" decoding="async" />
                ) : (
                  panel.paragraphs.map((text, i) => (
                    <p key={i} className={styles.text}>
                      {text}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
