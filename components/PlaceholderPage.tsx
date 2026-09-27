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
}: {
  title: string;
  index: string;
  note: string;
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
    </section>
  );
}
