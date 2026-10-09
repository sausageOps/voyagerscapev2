"use client";

import { useEffect, useState } from "react";
import FlexCarousel, {
  type FlexCarouselItem,
} from "@/components/FlexCarousel/FlexCarousel";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "./HomeCarousel.module.css";

/**
 * HOMEPAGE PRIMARY VISUAL — React Bits Flex Carousel.
 *
 * Runs the vendored `components/FlexCarousel` (reactbits.dev/components/
 * flex-carousel) with the exact configuration pinned for the homepage:
 *
 *   autoplay: true        — advance one card at a time
 *   interval: 1.5         — SECONDS between steps (engine multiplies by 1000)
 *   cardHeight: 0.55      — card height as a fraction of the container height
 *   dispersion: 1         — rainbow splitting at the invisible lens edge
 *   gap: 10               — px between cards
 *
 * Every other prop keeps the component's own defaults (preset "liquid",
 * intro "rise", natural card fit, focus-on-click, squeeze 0.2). One
 * integration decision deviates from the component default and is
 * deliberate: `captureWheel={false}`. Vertical mouse-wheel scroll over the
 * homepage must keep scrolling the page to the footer — an existing site
 * interaction — instead of being captured by the carousel; horizontal
 * trackpad/wheel input, drag, keyboard and autoplay are unchanged.
 *
 * The pause toggle is the accessible autoplay control required by WCAG 2.2.2
 * (the engine also pauses on hover/focus/interaction and under
 * prefers-reduced-motion on its own).
 */

/* TEMPORARY IMAGE SET — documented in /public/carousel/README.md.
   The repository ships no Voyagerscape photography yet, so the carousel
   runs on eight clearly-labelled AI-generated placeholder photographs
   themed on the route vocabulary from lib/routes + the nav icons
   (Fuji, Kujukushima, Fukuroda Falls, Glover Garden, London Eye,
   whale watching, camellia, kite flying). Swap the `src` values for the
   real archive photography when it lands; nothing else needs to change. */
const CAROUSEL_ITEMS: FlexCarouselItem[] = [
  {
    src: "/carousel/vs-01-fuji.jpg",
    alt: "Mount Fuji at dawn across a calm lake",
    title: "Fuji",
    subtitle: "Dawn, from the lake side",
  },
  {
    src: "/carousel/vs-02-kujukushima.jpg",
    alt: "Green islands scattered across Kujukushima bay",
    title: "Kujukushima",
    subtitle: "Ninety-nine islands, one bay",
  },
  {
    src: "/carousel/vs-03-fukuroda-falls.jpg",
    alt: "Fukuroda Falls pouring over a mossy cliff",
    title: "Fukuroda",
    subtitle: "The falls in four seasons",
  },
  {
    src: "/carousel/vs-04-glover-garden.jpg",
    alt: "Historic veranda house at Glover Garden above Nagasaki harbor",
    title: "Glover Garden",
    subtitle: "Above the harbor, Nagasaki",
  },
  {
    src: "/carousel/vs-05-london-eye.jpg",
    alt: "The London Eye at dusk over the Thames",
    title: "London Eye",
    subtitle: "Dusk on the South Bank",
  },
  {
    src: "/carousel/vs-06-whale-tail.jpg",
    alt: "A whale's fluke rising from a calm sea",
    title: "Whale Watching",
    subtitle: "Fluke on the way out",
  },
  {
    src: "/carousel/vs-07-camellia.jpg",
    alt: "A red camellia against a warm ivory wall",
    title: "Camellia",
    subtitle: "Winter bloom",
  },
  {
    src: "/carousel/vs-08-kite.jpg",
    alt: "A traditional paper kite in a pale winter sky",
    title: "Kite Flying",
    subtitle: "New year, riverbank wind",
  },
];

export default function HomeCarousel() {
  const [paused, setPaused] = useState(false);

  /* Honest control state: under reduced motion the carousel engine ignores
     autoplay entirely, so show the toggle as paused from the start. */
  useEffect(() => {
    if (prefersReducedMotion()) setPaused(true);
  }, []);

  return (
    <div className={styles.region}>
      <div className={styles.stage}>
        <FlexCarousel
          items={CAROUSEL_ITEMS}
          autoplay={!paused}
          interval={1.5}
          cardHeight={0.55}
          dispersion={1}
          gap={10}
          captureWheel={false}
        />
      </div>

      <button
        type="button"
        className={styles.pause}
        aria-pressed={paused}
        aria-label={paused ? "Play autoplay" : "Pause autoplay"}
        onClick={() => setPaused((value) => !value)}
      >
        <span className={styles.pauseWord}>{paused ? "Play" : "Pause"}</span>
        <span className={styles.pauseHint}>autoplay</span>
      </button>
    </div>
  );
}
