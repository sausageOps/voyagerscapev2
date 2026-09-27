"use client";

import { useEffect, useRef } from "react";
import { gsap, revealUp } from "@/lib/motion";
import TechLabel from "@/components/primitives/TechLabel";
import styles from "./Directory.module.css";

interface Entry {
  label: string;
  value: string;
  href?: string;
}

interface CardDef {
  id: string;
  accent: "pink" | "peach";
  entries: Entry[];
}

/** Two small floating objects, not a four-column dashboard. */
const CARDS: CardDef[] = [
  {
    id: "contact",
    accent: "pink",
    entries: [
      { label: "New Projects", value: "studio@voyagerscape.co", href: "mailto:studio@voyagerscape.co" },
      { label: "General", value: "hello@voyagerscape.co", href: "mailto:hello@voyagerscape.co" },
    ],
  },
  {
    id: "positions",
    accent: "peach",
    entries: [
      { label: "Open Positions", value: "Coming soon" },
      { label: "Collaborate", value: "Available for selected work" },
    ],
  },
];

export default function Directory({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = gsap.context(() => {
      revealUp("[data-card]", { delay: 0.55, stagger: 0.09, y: 16 });
    }, ref);
    return () => ctx.revert();
  }, [ready]);

  return (
    <div className={styles.field} ref={ref} data-parallax="cards">
      {CARDS.map((card) => (
        <article
          key={card.id}
          className={`${styles.card} ${styles[card.accent]}`}
          data-card
          data-slot={card.id}
        >
          {card.entries.map((entry) => (
            <div className={styles.entry} key={entry.label}>
              <TechLabel nano className={styles.label}>
                {entry.label}
              </TechLabel>
              {entry.href ? (
                <a className={styles.value} href={entry.href} data-cursor="link">
                  {entry.value}
                </a>
              ) : (
                <span className={styles.value}>{entry.value}</span>
              )}
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}
