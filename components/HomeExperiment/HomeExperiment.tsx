"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./HomeExperiment.module.css";
import ImageTrail from "./ImageTrail";
import {
  useFinePointer,
  useOnScreen,
  usePointerField,
  useReducedMotion,
  useScrollReveal,
  useVariableProximity,
} from "./useExperimentMotion";

/* =========================================================
   VOYAGERSCAPE — HOMEPAGE EXPERIMENT
   A six-chapter visual journey. Nothing outside this folder
   (nav, header, mobile menu, theme, footer) is touched; the
   page mounts inside the existing AppShell / HomeCanvas frame.

   Chapters:
     01 ARRIVAL        — oversized statement + photographic fragment
     02 IDENTITY       — "this is not just photography"
     03 VISUAL WORLD   — editorial playground grid
     04 EXPERIMENTATION— made with light / code / time / curiosity
     05 PHOTOGRAPHY    — cinematic plates
     06 VOYAGERSCAPE   — the quiet close

   React Bits vocabulary used (6, all free/MIT-equivalent and
   re-implemented locally against the existing GSAP/CSS stack so
   no dependency, licence or bundle is added):
     Split Text · Variable Proximity · Scroll Reveal ·
     Image Transition (grid) · Image Trail · Text Loop
   ========================================================= */

/** Placeholder plate set — swap these six files to re-skin the page. */
const PLATES = {
  arrival: "/home-experiment/frag-01.jpg",
  light: "/home-experiment/frag-02.jpg",
  motion: "/home-experiment/frag-03.jpg",
  horizon: "/home-experiment/frag-04.jpg",
  paper: "/home-experiment/frag-05.jpg",
  room: "/home-experiment/frag-06.jpg",
} as const;

/* ---------------------------------------------------------
   Split Text — characters as individually addressable objects.
   Rendered on the server exactly as it is on the client, so the
   hero never hydrates differently (no layout shift, no mismatch).
   --------------------------------------------------------- */
function SplitLine({
  text,
  proximity = false,
  baseDelay = 0,
}: {
  text: string;
  proximity?: boolean;
  baseDelay?: number;
}) {
  const chars = Array.from(text);
  return (
    <span className={styles.splitLine}>
      {chars.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className={styles.splitChar}
          {...(proximity ? { "data-prox": "" } : {})}
          style={{ transitionDelay: `${baseDelay + i * 0.028}s` }}
          aria-hidden="true"
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

/* =========================================================
   01 — ARRIVAL
   ========================================================= */
function Arrival() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const onScreen = useOnScreen(ref, "0px");
  const [entered, setEntered] = useState(false);

  useVariableProximity(ref, { radius: 280, enabled: fine && !reduced });
  usePointerField(ref, fine && !reduced && onScreen);

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 90);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section
      ref={ref}
      className={styles.arrival}
      data-entered={entered ? "true" : "false"}
      aria-labelledby="vs-arrival-title"
    >
      <p className={`vs-tech ${styles.chapterTag}`}>01 — Arrival</p>

      <h1 id="vs-arrival-title" className={styles.arrivalTitle}>
        <span className="vs-sr-only">Images become worlds.</span>
        <span className={styles.arrivalRow} data-row="a">
          <SplitLine text="IMAGES" proximity baseDelay={0.1} />
        </span>
        <span className={styles.arrivalRow} data-row="b">
          <SplitLine text="BECOME" proximity baseDelay={0.26} />
        </span>
        <span className={styles.arrivalRow} data-row="c">
          <SplitLine text="WORLDS" proximity baseDelay={0.42} />
          <span className={styles.arrivalStop} aria-hidden="true">
            .
          </span>
        </span>
      </h1>

      {/* The photographic fragment sits inside the typographic field, not
          behind it: it occupies the counter-space of the second row and
          drifts against the pointer, so type and image read as one object. */}
      <figure className={styles.arrivalFragment} aria-hidden="true">
        <Image
          src={PLATES.arrival}
          alt=""
          fill
          priority
          sizes="(max-width: 767px) 52vw, (max-width: 1100px) 34vw, 24vw"
          className={styles.arrivalFragmentImage}
        />
        <span className={styles.grain} />
      </figure>

      <div className={styles.arrivalFoot}>
        <p className={styles.arrivalNote}>
          A visual practice working between photograph, artefact and screen.
          Some of it is taken. Some of it is built.
        </p>
        <p className={`vs-tech ${styles.scrollHint}`}>
          <span className={styles.scrollHintRule} aria-hidden="true" />
          Scroll to enter
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   02 — IDENTITY
   ========================================================= */
const DISCIPLINES = [
  { word: "PHOTOGRAPHY", note: "the foundation" },
  { word: "ART", note: "the argument" },
  { word: "MOTION", note: "the tense" },
  { word: "DESIGN", note: "the discipline" },
  { word: "CODE", note: "the material" },
  { word: "EXPERIMENT", note: "the method" },
];

function Identity() {
  return (
    <section className={styles.identity} aria-labelledby="vs-identity-title">
      <p className={`vs-tech ${styles.chapterTag}`} data-reveal>
        02 — Identity
      </p>

      <h2 id="vs-identity-title" className={styles.identityLede} data-reveal>
        This is not <em>only</em> photography.
      </h2>

      <ul className={styles.disciplineList}>
        {DISCIPLINES.map(({ word, note }, i) => (
          <li
            key={word}
            className={styles.disciplineRow}
            data-reveal
            style={{ transitionDelay: `${i * 0.07}s` }}
          >
            <span className={`vs-tech vs-tech--nano ${styles.disciplineIndex}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={styles.disciplineWord}>{word}</span>
            <span className={styles.disciplineNote}>{note}</span>
          </li>
        ))}
      </ul>

      <p className={styles.identityTail} data-reveal>
        Voyagerscape exists between those lines. The camera is one instrument
        among several, and the picture is rarely the last step.
      </p>
    </section>
  );
}

/* =========================================================
   03 — VISUAL WORLD (the playground)
   ========================================================= */
type Plate = {
  src: string;
  caption: string;
  index: string;
  area: string;
  ratio: string;
  objectPosition?: string;
};

const PLAYGROUND: Plate[] = [
  {
    src: PLATES.light,
    caption: "Study, folded light",
    index: "P / 01",
    area: "a",
    ratio: "4 / 5",
  },
  {
    src: PLATES.horizon,
    caption: "Horizon, almost nothing",
    index: "P / 02",
    area: "b",
    ratio: "16 / 9",
  },
  {
    src: PLATES.motion,
    caption: "Figure, dissolved",
    index: "P / 03",
    area: "c",
    ratio: "3 / 4",
    objectPosition: "50% 35%",
  },
  {
    src: PLATES.paper,
    caption: "Contact sheet, torn",
    index: "P / 04",
    area: "d",
    ratio: "1 / 1",
  },
  {
    src: PLATES.room,
    caption: "Room, held",
    index: "P / 05",
    area: "e",
    ratio: "5 / 4",
  },
];

function Playground() {
  return (
    <section className={styles.playground} aria-labelledby="vs-playground-title">
      <header className={styles.playgroundHead}>
        <p className={`vs-tech ${styles.chapterTag}`} data-reveal>
          03 — Visual world
        </p>
        <h2 id="vs-playground-title" className={styles.sectionTitle} data-reveal>
          A wall, not a feed.
        </h2>
      </header>

      <div className={styles.grid}>
        {PLAYGROUND.map((plate, i) => (
          <figure
            key={plate.src + plate.area}
            className={styles.plate}
            data-area={plate.area}
            data-reveal
            style={{
              transitionDelay: `${i * 0.06}s`,
              ["--ratio" as string]: plate.ratio,
            }}
          >
            <div className={styles.plateFrame}>
              <Image
                src={plate.src}
                alt={plate.caption}
                fill
                loading="lazy"
                sizes="(max-width: 767px) 92vw, (max-width: 1100px) 48vw, 33vw"
                className={styles.plateImage}
                style={plate.objectPosition ? { objectPosition: plate.objectPosition } : undefined}
              />
              <span className={styles.grain} aria-hidden="true" />
            </div>
            <figcaption className={styles.plateCaption}>
              <span className="vs-tech vs-tech--nano">{plate.index}</span>
              <span className={styles.plateCaptionText}>{plate.caption}</span>
            </figcaption>
          </figure>
        ))}

        {/* The grid is a composition, not a gallery: text occupies two of its
            cells so images and language sit on the same wall. */}
        <p className={styles.gridNote} data-area="n1" data-reveal>
          Fragments kept out of order on purpose. Sequence is a later decision.
        </p>
        <p className={styles.gridWord} data-area="n2" data-reveal aria-hidden="true">
          LOOK
          <br />
          AGAIN
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   04 — EXPERIMENTATION
   ========================================================= */
const MADE_WITH = ["LIGHT", "CODE", "TIME", "CURIOSITY"];

function Experimentation() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const onScreen = useOnScreen(ref, "0px");
  const [i, setI] = useState(0);

  /* Text Loop — only ticks while the chapter is actually on screen. */
  useEffect(() => {
    if (!onScreen || reduced) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % MADE_WITH.length), 2200);
    return () => window.clearInterval(id);
  }, [onScreen, reduced]);

  return (
    <section ref={ref} className={styles.experiment} aria-labelledby="vs-experiment-title">
      <ImageTrail
        images={[PLATES.paper, PLATES.light, PLATES.motion, PLATES.room, PLATES.horizon]}
        enabled={fine && !reduced && onScreen}
      />

      <div className={styles.experimentInner}>
        <p className={`vs-tech ${styles.chapterTag}`} data-reveal>
          04 — Experimentation
        </p>

        <h2 id="vs-experiment-title" className={styles.madeWith} data-reveal>
          <span className={styles.madeWithStatic}>MADE WITH</span>
          <span className={styles.madeWithSlot}>
            <span className="vs-sr-only">
              light, code, time and curiosity
            </span>
            {MADE_WITH.map((word, idx) => (
              <span
                key={word}
                className={styles.madeWithWord}
                data-on={idx === i ? "true" : "false"}
                aria-hidden="true"
              >
                {word}
              </span>
            ))}
          </span>
        </h2>

        <div className={styles.experimentCols}>
          <p data-reveal>
            The technical work is not a separate department. A shader, an
            exposure and a typeface are all decisions about light, and they get
            made at the same desk.
          </p>
          <p data-reveal style={{ transitionDelay: "0.08s" }}>
            This site is part of the practice rather than a brochure for it:
            the interface is another surface the images are developed on.
          </p>
        </div>

        <p className={`vs-tech vs-tech--nano ${styles.experimentHint}`} data-reveal>
          {fine ? "Move across this field" : "Built to be touched"}
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   05 — PHOTOGRAPHY
   ========================================================= */
const CINEMA = [
  {
    src: PLATES.room,
    title: "Interiors, waiting",
    meta: "Series — ongoing",
    align: "left" as const,
    ratio: "16 / 10",
  },
  {
    src: PLATES.horizon,
    title: "Ground, haze, nothing",
    meta: "Series — 2024",
    align: "right" as const,
    ratio: "21 / 9",
  },
  {
    src: PLATES.light,
    title: "A room describing itself",
    meta: "Study — silver",
    align: "left" as const,
    ratio: "4 / 5",
  },
];

function Photography() {
  return (
    <section className={styles.photography} aria-labelledby="vs-photography-title">
      <header className={styles.photographyHead}>
        <p className={`vs-tech ${styles.chapterTag}`} data-reveal>
          05 — Photography
        </p>
        <h2 id="vs-photography-title" className={styles.sectionTitle} data-reveal>
          And then, the photographs.
        </h2>
      </header>

      {CINEMA.map((plate, i) => (
        <figure
          key={plate.src + i}
          className={styles.cinemaPlate}
          data-align={plate.align}
          data-reveal
          style={{ ["--ratio" as string]: plate.ratio }}
        >
          <div className={styles.cinemaFrame}>
            <Image
              src={plate.src}
              alt={plate.title}
              fill
              loading="lazy"
              sizes="(max-width: 767px) 94vw, 62vw"
              className={styles.cinemaImage}
            />
            <span className={styles.grain} aria-hidden="true" />
          </div>
          <figcaption className={styles.cinemaCaption}>
            <span className={styles.cinemaTitle}>{plate.title}</span>
            <span className="vs-tech vs-tech--nano">{plate.meta}</span>
          </figcaption>
        </figure>
      ))}

      <p className={styles.photographyTail} data-reveal>
        The full archive lives in{" "}
        <Link href="/art" className={styles.inlineLink}>
          Art
        </Link>
        .
      </p>
    </section>
  );
}

/* =========================================================
   06 — VOYAGERSCAPE
   ========================================================= */
function Statement() {
  return (
    <section className={styles.statement} aria-labelledby="vs-statement-title">
      <p className={`vs-tech ${styles.chapterTag}`} data-reveal>
        06 — Voyagerscape
      </p>

      <h2 id="vs-statement-title" className={styles.statementTitle} data-reveal>
        VOYAGERSCAPE
      </h2>

      <ul className={styles.statementTriad} aria-label="Visuals, ideas, experiments">
        <li data-reveal>VISUALS</li>
        <li data-reveal style={{ transitionDelay: "0.1s" }}>
          IDEAS
        </li>
        <li data-reveal style={{ transitionDelay: "0.2s" }}>
          EXPERIMENTS
        </li>
      </ul>

      <p className={styles.statementClose} data-reveal>
        Kept deliberately unfinished.
      </p>
    </section>
  );
}

/* =========================================================
   PAGE
   ========================================================= */
export default function HomeExperiment() {
  const scope = useRef<HTMLDivElement>(null);
  useScrollReveal(scope);

  return (
    <div ref={scope} className={styles.page}>
      <Arrival />
      <Identity />
      <Playground />
      <Experimentation />
      <Photography />
      <Statement />
    </div>
  );
}
