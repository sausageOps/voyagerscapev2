"use client";

import CrtObject from "./CrtObject";
import styles from "./AboutCrt.module.css";

/**
 * TEMPORARY HOST — the archive monitor on About.
 *
 * The CRT itself is unchanged: this only mounts the existing renderer
 * selector (`CrtObject`) in a centred box, with the recorder states the
 * machine idles on. There is no recorder on About, so the shutter
 * callback is a no-op; the monitor's own channel interaction is
 * untouched and still works on click, tap, Enter and Space.
 */
export default function AboutCrt() {
  return (
    <div className={styles.wrap}>
      <CrtObject
        recordingState="idle"
        playbackState="stopped"
        level={0}
        onShutter={() => {}}
      />
    </div>
  );
}
