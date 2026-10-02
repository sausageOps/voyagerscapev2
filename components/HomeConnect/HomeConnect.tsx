"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import HeroObject from "./HeroObject";
import MessageCTA from "./MessageCTA";
import RecorderPanel from "./RecorderPanel";
import styles from "./HomeConnect.module.css";

const WORKS = [
  { src: "/crt/channel-01.mp4", code: "VS–01", title: "Transit Memory", place: "Western Corridor", year: "2026", type: "Moving photograph" },
  { src: "/crt/channel-02.mp4", code: "VS–02", title: "After the Weather", place: "North Atlantic", year: "2025", type: "Field observation" },
  { src: "/crt/channel-03.mp4", code: "VS–03", title: "Chrome / Dust", place: "Machine District", year: "2026", type: "Automotive study" },
  { src: "/crt/channel-04.mp4", code: "VS–04", title: "No Fixed Horizon", place: "Somewhere East", year: "2025", type: "Visual journal" },
  { src: "/crt/channel-05.mp4", code: "VS–05", title: "Night Receiver", place: "Archive Unknown", year: "2026", type: "Signal experiment" },
];

const EXPERIMENTS = [
  { n: "001", title: "Optical Memory", note: "Light, persistence and the unreliable image.", tone: "lavender" },
  { n: "002", title: "Machine / Image", note: "What the apparatus adds when nobody asks it to.", tone: "pink" },
  { n: "003", title: "Motion Index", note: "A moving archive assembled from transient places.", tone: "yellow" },
];

export default function HomeConnect() {
  const { loaded, recorderOpen, setRecorderOpen } = useUI();
  const recorder = useRecorder();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeWork, setActiveWork] = useState(0);

  const onShutter = useCallback(() => {
    if (recorder.recordingState === "recording") void recorder.stop();
    else if (recorder.hasClip) recorder.preview();
  }, [recorder]);

  useEffect(() => {
    const root = rootRef.current;
    if (!loaded || !root) return;
    const reduced = prefersReducedMotion();
    const revealNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduced) {
      gsap.set(revealNodes, { opacity: 1, y: 0 });
      return;
    }
    const observers: IntersectionObserver[] = [];
    revealNodes.forEach((node) => {
      const io = new IntersectionObserver(([entry]) => {
        if (!entry?.isIntersecting) return;
        gsap.fromTo(node, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out" });
        io.disconnect();
      }, { threshold: 0.12 });
      io.observe(node);
      observers.push(io);
    });
    return () => observers.forEach((io) => io.disconnect());
  }, [loaded]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const onMove = (event: PointerEvent) => {
      root.style.setProperty("--pointer-x", `${(event.clientX / window.innerWidth - 0.5) * 2}`);
      root.style.setProperty("--pointer-y", `${(event.clientY / window.innerHeight - 0.5) * 2}`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const work = WORKS[activeWork];

  return (
    <div className={styles.home} ref={rootRef}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroGrid}>
          <div className={styles.heroMeta} data-reveal>
            <span>VISUAL ARCHIVE / 2026</span>
            <span>51.5072° N — 0.1276° W</span>
          </div>
          <p className={styles.sideNote} data-reveal>Photography<br />Technology<br />Experiment</p>
          <h1 id="home-title" className={styles.heroTitle} data-reveal>
            <span>VOYAGER</span><span>SCAPE</span>
          </h1>
          <div className={styles.heroObject} data-reveal>
            <HeroObject recordingState={recorder.recordingState} playbackState={recorder.playbackState} level={recorder.level} onShutter={onShutter} />
          </div>
          <div className={styles.channelReadout} data-reveal>
            <span className={styles.liveDot} /> CH–01 / IMAGE MACHINE
          </div>
          <div className={styles.heroStatement} data-reveal>
            <span>WHERE MACHINES</span><span>BECOME <em>ART</em></span>
          </div>
          <a className={styles.scrollCue} href="#signal" data-cursor="link"><span>SCROLL TO TUNE</span><b>↓</b></a>
        </div>
      </section>

      <section id="signal" className={styles.signal}>
        <div className={styles.signalBand} aria-hidden="true">
          <div>PHOTOGRAPHY IS A SIGNAL · MEMORY IS THE STATIC · PHOTOGRAPHY IS A SIGNAL · MEMORY IS THE STATIC ·</div>
        </div>
        <div className={styles.signalInner}>
          <span className={styles.sectionIndex} data-reveal>01 / RECEIVE</span>
          <h2 data-reveal>We collect the moments<br />between <i>place</i> and <i>machine.</i></h2>
          <p data-reveal>Voyagerscape is an evolving visual practice: field photography, moving images and digital studies shaped into one live archive.</p>
          <div className={styles.signalGlyph} data-reveal aria-hidden="true"><span /><span /><span /><span /><span /></div>
        </div>
      </section>

      <section className={styles.featured} aria-labelledby="featured-title">
        <header className={styles.sectionHead} data-reveal>
          <span className={styles.sectionIndex}>02 / SELECTED TRANSMISSIONS</span>
          <h2 id="featured-title">FIELD NOTES</h2>
          <span className={styles.count}>0{activeWork + 1} / 0{WORKS.length}</span>
        </header>
        <div className={styles.workStage} data-reveal>
          <div className={styles.workFrame}>
            <video key={work.src} src={work.src} autoPlay muted loop playsInline preload="metadata" />
            <span className={styles.frameCode}>{work.code}</span>
            <span className={styles.frameCross}>＋</span>
          </div>
          <div className={styles.workInfo}>
            <div><span>TITLE</span><strong>{work.title}</strong></div>
            <div><span>LOCATION</span><strong>{work.place}</strong></div>
            <div><span>FORMAT</span><strong>{work.type}</strong></div>
            <div><span>YEAR</span><strong>{work.year}</strong></div>
          </div>
        </div>
        <div className={styles.workStrip} role="list" aria-label="Choose a featured transmission">
          {WORKS.map((item, index) => (
            <button key={item.code} type="button" className={styles.workThumb} data-active={index === activeWork} onClick={() => setActiveWork(index)} data-cursor="link" aria-label={`View ${item.title}`}>
              <video src={item.src} muted playsInline preload="metadata" />
              <span>{item.code}</span><b>{item.title}</b>
            </button>
          ))}
        </div>
        <Link href="/art" className={styles.textLink} data-cursor="link">ENTER THE FULL ARCHIVE <span>↗</span></Link>
      </section>

      <section className={styles.broadcast} data-nav-surface="dark" aria-labelledby="broadcast-title">
        <div className={styles.broadcastTop} data-reveal>
          <span className={styles.sectionIndex}>03 / MOVING IMAGE</span>
          <p>CLICK THE RECEIVER TO MOVE<br />THROUGH FIVE LIVE CHANNELS.</p>
        </div>
        <h2 id="broadcast-title" className={styles.broadcastTitle} data-reveal>THE MACHINE<br />REMEMBERS.</h2>
        <div className={styles.broadcastObject} data-reveal>
          <HeroObject recordingState="idle" playbackState="stopped" level={0} onShutter={() => undefined} />
        </div>
        <div className={styles.frequency} data-reveal><span>CH 01</span><i /><span>CH 05</span></div>
      </section>

      <section className={styles.world} aria-labelledby="world-title">
        <div className={styles.worldVisual} data-reveal>
          <video src="/crt/channel-04.mp4" autoPlay muted loop playsInline preload="metadata" />
          <span className={styles.coordTop}>LAT 35.6762° N</span>
          <span className={styles.coordBottom}>LON 139.6503° E</span>
          <span className={styles.target} aria-hidden="true" />
        </div>
        <div className={styles.worldCopy}>
          <span className={styles.sectionIndex} data-reveal>04 / THE WORLD</span>
          <h2 id="world-title" data-reveal>LOOK LONGER.<br />THE ORDINARY<br /><i>STARTS MOVING.</i></h2>
          <p data-reveal>Travel is not a list of destinations. It is a way of paying attention—to weather, surfaces, speed and the human trace.</p>
          <Link href="/about" className={styles.roundLink} data-cursor="link">FIELD<br />PRACTICE ↗</Link>
        </div>
      </section>

      <section className={styles.lab} aria-labelledby="lab-title">
        <header className={styles.labHead} data-reveal>
          <span className={styles.sectionIndex}>05 / OPEN LAB</span>
          <h2 id="lab-title">UNFINISHED<br />ON PURPOSE.</h2>
          <p>Studies where image-making meets code, AI, optics and accident.</p>
        </header>
        <div className={styles.experimentList}>
          {EXPERIMENTS.map((item, index) => (
            <article className={`${styles.experiment} ${styles[item.tone]}`} key={item.n} data-reveal>
              <span>EXPERIMENT {item.n}</span><h3>{item.title}</h3><p>{item.note}</p>
              <div className={styles.experimentGraphic} aria-hidden="true"><i /><i /><i /></div>
              <b>0{index + 1} ↗</b>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.identity} data-nav-surface="dark" aria-labelledby="identity-title">
        <span className={styles.sectionIndex} data-reveal>06 / IDENTITY</span>
        <h2 id="identity-title" data-reveal>PHOTOGRAPHER <span>×</span><br />TECHNOLOGIST <span>×</span><br /><i>CURIOUS HUMAN.</i></h2>
        <div className={styles.identityMeta} data-reveal>
          <p>A practice by Aniket, built across photography, cloud, AI, automotive culture and visual experimentation.</p>
          <Link href="/about" data-cursor="link">READ THE FIELD MANUAL ↗</Link>
        </div>
      </section>

      <section className={styles.contact} aria-labelledby="contact-title">
        <div className={styles.contactOrbit} aria-hidden="true"><span>SEND A SIGNAL · SEND A SIGNAL · SEND A SIGNAL ·</span></div>
        <span className={styles.sectionIndex} data-reveal>07 / TRANSMIT</span>
        <h2 id="contact-title" data-reveal>HAVE SOMETHING<br />WORTH <i>EXPLORING?</i></h2>
        <p data-reveal>Projects, collaborations, strange ideas or a simple hello. The receiver is listening.</p>
        <div className={styles.contactControl} data-reveal>
          {recorderOpen ? (
            <RecorderPanel open={recorderOpen} onClose={() => { setRecorderOpen(false); if (recorder.recordingState === "recording") void recorder.stop(); }} recordingState={recorder.recordingState} playbackState={recorder.playbackState} elapsedMs={recorder.elapsedMs} level={recorder.level} error={recorder.error} hasClip={recorder.hasClip} supported={recorder.supported} onStart={recorder.start} onStop={recorder.stop} onPreview={recorder.preview} onDiscard={recorder.discard} onSubmit={recorder.submit} />
          ) : <MessageCTA open={recorderOpen} onOpen={() => setRecorderOpen(true)} />}
        </div>
        <Link href="/connect" className={styles.contactMail} data-cursor="link">OR OPEN THE TRANSMISSION DESK ↗</Link>
      </section>
    </div>
  );
}
