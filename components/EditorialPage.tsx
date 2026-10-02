import Link from "next/link";
import styles from "./EditorialPage.module.css";

export type EditorialVariant = "art" | "about" | "privacy";

const data = {
  art: {
    index: "ARCHIVE / 01",
    eyebrow: "SELECTED WORK — 2024 / 2026",
    title: ["IMAGES WITH", "A MEMORY."],
    intro: "An active index of photographs, motion fragments and visual studies. Not arranged by algorithm—sequenced by feeling, place and signal.",
  },
  about: {
    index: "FIELD MANUAL / 03",
    eyebrow: "ANIKET — VOYAGERSCAPE",
    title: ["ONE PRACTICE.", "MANY LENSES."],
    intro: "Voyagerscape lives where photography, technology and curiosity overlap. It is a place for looking carefully, testing ideas and making the machinery visible.",
  },
  privacy: {
    index: "SYSTEM / 06",
    eyebrow: "PRIVACY PROTOCOL — REV 2026.10",
    title: ["CLEAR SIGNAL.", "NO NOISE."],
    intro: "A short, human-readable account of what this site handles and what it does not. Voyagerscape collects as little as possible.",
  },
};

export default function EditorialPage({ variant }: { variant: EditorialVariant }) {
  const page = data[variant];
  if (variant === "art") return <ArtPage page={page} />;
  if (variant === "about") return <AboutPage page={page} />;
  return <PrivacyPage page={page} />;
}

function Header({ page }: { page: (typeof data)[EditorialVariant] }) {
  return <header className={styles.hero}>
    <div className={styles.top}><span>{page.index}</span><span>{page.eyebrow}</span></div>
    <h1>{page.title[0]}<br /><i>{page.title[1]}</i></h1>
    <p>{page.intro}</p><span className={styles.down}>↓ CONTINUE</span>
  </header>;
}

function ArtPage({ page }: { page: (typeof data)["art"] }) {
  const films = [
    ["/crt/channel-01.mp4", "01", "Transit Memory", "Motion / Field"],
    ["/crt/channel-03.mp4", "02", "Chrome / Dust", "Machine / Study"],
    ["/crt/channel-04.mp4", "03", "No Fixed Horizon", "Travel / Journal"],
    ["/crt/channel-02.mp4", "04", "After the Weather", "Place / Observation"],
  ];
  return <div className={styles.page}><Header page={page} />
    <section className={styles.archive}>
      {films.map(([src,n,title,type],i)=><article className={styles.project} key={src}>
        <div className={styles.film}><video src={src} autoPlay muted loop playsInline preload="metadata" /></div>
        <div className={styles.caption}><span>{n} / 04</span><h2>{title}</h2><span>{type} — 2026</span></div>
        {i===1 && <p className={styles.interlude}>THE ARCHIVE IS NOT A VAULT.<br /><i>IT IS A LIVING EDIT.</i></p>}
      </article>)}
    </section>
    <section className={styles.next} data-nav-surface="dark"><span>NEW TRANSMISSIONS ADDED IRREGULARLY.</span><h2>WANT TO MAKE<br />SOMETHING <i>MOVE?</i></h2><Link href="/connect">SEND A SIGNAL ↗</Link></section>
  </div>;
}

function AboutPage({ page }: { page: (typeof data)["about"] }) {
  return <div className={styles.page}><Header page={page} />
    <section className={styles.manifesto}>
      <span>01 / ORIGIN</span><h2>BUILT FROM THE URGE<br />TO LOOK <i>TWICE.</i></h2>
      <div className={styles.manifestoGrid}><p>Voyagerscape began as a way to keep photographs from becoming a passive feed. Each image is treated as evidence: of a place, a machine, a weather system or a passing thought.</p><p>The practice moves between cameras and cloud infrastructure, automotive culture and AI, physical travel and digital experiments. The tools change. Attention remains the medium.</p></div>
    </section>
    <section className={styles.roles} data-nav-surface="dark"><span>02 / WORKING TERRITORY</span>{["PHOTOGRAPHY","TECHNOLOGY","AUTOMOTIVE","CLOUD + AI","VISUAL ART"].map((x,i)=><div key={x}><b>0{i+1}</b><h2>{x}</h2><span>↗</span></div>)}</section>
    <section className={styles.aboutVisual}><video src="/crt/channel-05.mp4" autoPlay muted loop playsInline /><div><span>03 / METHOD</span><h2>OBSERVE.<br />DISRUPT.<br /><i>REASSEMBLE.</i></h2><p>No fixed style, no single discipline. Only a consistent appetite for strange connections and a preference for work that rewards exploration.</p><Link href="/art">OPEN THE ARCHIVE ↗</Link></div></section>
  </div>;
}

function PrivacyPage({ page }: { page: (typeof data)["privacy"] }) {
  return <div className={styles.page}><Header page={page} />
    <section className={styles.policy}>
      <aside><span>INDEX</span><a href="#collection">01 / COLLECTION</a><a href="#voice">02 / VOICE NOTES</a><a href="#services">03 / SERVICES</a><a href="#contact">04 / CONTACT</a></aside>
      <div className={styles.policyCopy}>
        <article id="collection"><span>01</span><h2>Minimal collection</h2><p>This website does not intentionally collect personal information simply because you browse it. Standard technical request logs may be processed by the hosting platform for security and reliability.</p></article>
        <article id="voice"><span>02</span><h2>Voice transmissions</h2><p>The recorder requests microphone access only after you choose to record. Nothing is captured beforehand. A clip remains on your device until you explicitly send it; do not include sensitive information.</p></article>
        <article id="services"><span>03</span><h2>External services</h2><p>Links to third-party services such as Instagram and LinkedIn are governed by their own policies. Voyagerscape does not use advertising trackers or sell visitor data.</p></article>
        <article id="contact"><span>04</span><h2>Questions</h2><p>For privacy questions, corrections or deletion requests, write to <a href="mailto:hello@voyagerscape.co">hello@voyagerscape.co</a>.</p></article>
      </div>
    </section>
  </div>;
}
