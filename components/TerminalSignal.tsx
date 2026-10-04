import styles from "./TerminalSignal.module.css";

interface TerminalSignalProps {
  open?: boolean;
}

/** Shared, decorative terminal-state signal used by every header trigger. */
export default function TerminalSignal({ open = false }: TerminalSignalProps) {
  return (
    <span className={styles.signal} data-open={open ? "true" : "false"} aria-hidden="true">
      <span className={`${styles.state} ${styles.prompt}`}>&gt;</span>
      <span className={`${styles.state} ${styles.cursor}`}>_</span>
      <span className={`${styles.state} ${styles.query}`}>?</span>
      <span className={styles.close}>×</span>
    </span>
  );
}
