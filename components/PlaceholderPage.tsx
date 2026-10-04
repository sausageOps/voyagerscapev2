import TechLabel from "@/components/primitives/TechLabel";
import styles from "./PlaceholderPage.module.css";

/**
 * Temporary state for routes that are scaffolded but not yet written.
 * Replacing one with real content requires no shell changes.
 */
export default function PlaceholderPage({
  title,
  index,
  note,
  children,
}: {
  title: string;
  index: string;
  note: string;
  /** Optional extra block, rendered under the copy. */
  children?: React.ReactNode;
}) {
  return (
    <section className={styles.wrap}>
      <div className={styles.inner}>
        <TechLabel nano className={styles.index}>
          {index} — In production
        </TechLabel>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.note}>{note}</p>
        <TechLabel nano className={styles.hint}>
          Press / for the command terminal
        </TechLabel>
      </div>
      {children ? <div className={styles.extra}>{children}</div> : null}
    </section>
  );
}
