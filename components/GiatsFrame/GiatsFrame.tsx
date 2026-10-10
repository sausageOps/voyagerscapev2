"use client";

/*
 * Giats page frame and grain (see GiatsFrame.module.css for the source
 * mapping). Mounted once in AppFrame, behind page content and below the
 * grain layer. Both layers are decorative and pointer-events:none.
 */

import styles from "./GiatsFrame.module.css";

export default function GiatsFrame() {
  return (
    <>
      <div className={styles.frame} aria-hidden="true" data-giats-frame />
      <div className={styles.grain} aria-hidden="true" data-giats-grain />
    </>
  );
}
