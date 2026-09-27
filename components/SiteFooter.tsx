"use client";

import { useEffect, useRef } from "react";
import { gsap, revealUp } from "@/lib/motion";
import TechLabel from "@/components/primitives/TechLabel";
import RollingText from "@/components/primitives/RollingText";
import WordBlocks from "@/components/primitives/WordBlocks";
import styles from "./SiteFooter.module.css";

const STATEMENT = [
  { text: "The" },
  { text: "Quietly" },
  { text: "Deliberate" },
  { text: "Design" },
  { text: "Practice" },
];

/**
 * Secondary section on a half-step darker warm ground. Distributed
 * horizontally on desktop, deliberately re-stacked and centred on mobile.
 */
export default function SiteFooter() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries[0]?.isIntersecting) return;
          revealUp("[data-foot-fade]", { stagger: 0.06, y: 14 });
          io.disconnect();
        },
        { threshold: 0.2 },
      );
      io.observe(el);
      return () => io.disconnect();
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <footer className={styles.footer} ref={ref}>
      <div className={styles.inner}>
        <div className={styles.statement} data-foot-fade>
          <WordBlocks words={STATEMENT} size="statement" interactive />
        </div>

        <div className={styles.meta}>
          <div className={`${styles.col} ${styles.left}`} data-foot-fade>
            <span className={styles.copy}>© 2026 Voyagerscape</span>
            <a className={styles.metaLink} href="/privacy" data-cursor="link" data-tactile>
              <RollingText text="Privacy Policy" />
            </a>
          </div>

          <div className={`${styles.col} ${styles.center}`} data-foot-fade>
            <TechLabel nano className={styles.metaLabel}>
              General Enquiries
            </TechLabel>
            <a className={styles.metaLink} href="mailto:hello@voyagerscape.co" data-cursor="link" data-tactile>
              <RollingText text="hello@voyagerscape.co" />
            </a>
          </div>

          <div className={`${styles.col} ${styles.right}`} data-foot-fade>
            <TechLabel nano className={styles.metaLabel}>
              Connect
            </TechLabel>
            <span className={styles.socials}>
              <a
                className={styles.metaLink}
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer noopener"
                data-cursor="link"
                data-tactile
              >
                <RollingText text="LinkedIn" />
              </a>
              <a
                className={styles.metaLink}
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                data-cursor="link"
                data-tactile
              >
                <RollingText text="Instagram" />
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
