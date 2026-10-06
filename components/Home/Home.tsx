"use client";

/* =========================================================================
   VOYAGERSCAPE — HOMEPAGE
   -------------------------------------------------------------------------
   Six chapters, one continuous passage:

     01 ARRIVAL        images become worlds        (pinned, clip-path handover)
     02 IDENTITY       this is not only photography
     03 VISUAL WORLD   a wall, not a feed
     04 EXPERIMENT     made with light             (pinned, image → data → form)
     05 PHOTOGRAPHY    and then, the photographs
     06 VOYAGERSCAPE   stillness

   The page lives inside the existing shell: header, physical navigation,
   mobile menu, cursor, theme and footer are untouched. Everything added
   here is scoped to components/Home/** and the homepage route.

   Component selection per chapter, and why, is recorded at the top of each
   chapter file and collected in docs/homepage-component-map.md.
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import Arrival from "./chapters/Arrival";
import Identity from "./chapters/Identity";
import VisualWorld from "./chapters/VisualWorld";
import LightLab from "./chapters/LightLab";
import Photographs from "./chapters/Photographs";
import Signoff from "./chapters/Signoff";
import Viewfinder from "./objects/Viewfinder";
import { CHAPTERS } from "./data";
import styles from "./Home.module.css";

export default function Home() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [chapter, setChapter] = useState(0);

  /* ---- which chapter is the reader standing in? ---- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>("[data-chapter-section]"),
    );
    if (!sections.length) return;

    const order = sections.map((section) =>
      CHAPTERS.findIndex((entry) => entry.id === section.dataset.chapterSection),
    );

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = sections.indexOf(entry.target as HTMLElement);
          const index = order[i];
          if (index >= 0) setChapter(index);
        });
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((section) => io.observe(section));
    return () => io.disconnect();
  }, []);

  /* ---- hand the frame's atmosphere over to the page ----
     The Pattern Waves surface belongs to ARRIVAL. Past it the ground is
     paper, and the shader is taken out of the compositor entirely (not
     merely faded) so its canvas stops costing anything. */
  useEffect(() => {
    const html = document.documentElement;
    const beyond = chapter > 0;
    html.dataset.homeScene = beyond ? "beyond" : "arrival";
    let timer = 0;
    if (beyond) {
      timer = window.setTimeout(() => {
        html.dataset.homeAtmosphere = "off";
      }, 900);
    } else {
      html.dataset.homeAtmosphere = "on";
    }
    return () => window.clearTimeout(timer);
  }, [chapter]);

  useEffect(
    () => () => {
      const html = document.documentElement;
      delete html.dataset.homeScene;
      delete html.dataset.homeAtmosphere;
    },
    [],
  );

  return (
    <div className={styles.home} ref={rootRef} data-chapter={CHAPTERS[chapter]?.id}>
      <Viewfinder scopeRef={rootRef} chapter={chapter} />
      <Arrival nextId="identity" />
      <Identity />
      <VisualWorld />
      <LightLab />
      <Photographs />
      <Signoff />
    </div>
  );
}
