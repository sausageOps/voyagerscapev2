"use client";

import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import TechLabel from "@/components/primitives/TechLabel";
import MessageCTA from "@/components/HomeConnect/MessageCTA";
import RecorderPanel from "@/components/HomeConnect/RecorderPanel";
import styles from "./ConnectPage.module.css";

/**
 * Dedicated /connect route. A genuinely separate page from the homepage: it
 * does NOT render the home hero/camera composition. It reuses the existing
 * Connect-specific functionality — the "Leave us a message" recorder
 * (MessageCTA + RecorderPanel + useRecorder) and the studio contact details.
 * The command terminal is already available globally via the app shell.
 */
export default function ConnectPage() {
  const { recorderOpen, setRecorderOpen } = useUI();
  const recorder = useRecorder();

  return (
    <section className={styles.wrap}>
      <div className={styles.inner}>
        <TechLabel nano className={styles.index}>
          02 — Transmission desk
        </TechLabel>
        <h1 className={styles.title}>Connect</h1>
        <p className={styles.note}>
          Leave the studio a voice message, or reach us directly. The transmission desk is open.
        </p>

        <div className={styles.control}>
          {recorderOpen ? (
            <RecorderPanel
              open={recorderOpen}
              onClose={() => {
                setRecorderOpen(false);
                if (recorder.recordingState === "recording") void recorder.stop();
              }}
              recordingState={recorder.recordingState}
              playbackState={recorder.playbackState}
              elapsedMs={recorder.elapsedMs}
              level={recorder.level}
              error={recorder.error}
              hasClip={recorder.hasClip}
              supported={recorder.supported}
              onStart={recorder.start}
              onStop={recorder.stop}
              onPreview={recorder.preview}
              onDiscard={recorder.discard}
              onSubmit={recorder.submit}
            />
          ) : (
            <MessageCTA open={recorderOpen} onOpen={() => setRecorderOpen(true)} />
          )}
        </div>

        <div className={styles.contacts}>
          <div className={styles.contactCol}>
            <TechLabel nano className={styles.contactLabel}>
              New Projects
            </TechLabel>
            <a className={styles.contactLink} href="mailto:studio@voyagerscape.co" data-cursor="link">
              studio@voyagerscape.co
            </a>
          </div>

          <div className={styles.contactCol}>
            <TechLabel nano className={styles.contactLabel}>
              General Enquiries
            </TechLabel>
            <a className={styles.contactLink} href="mailto:hello@voyagerscape.co" data-cursor="link">
              hello@voyagerscape.co
            </a>
          </div>

          <div className={styles.contactCol}>
            <TechLabel nano className={styles.contactLabel}>
              Connect
            </TechLabel>
            <span className={styles.socials}>
              <a
                className={styles.contactLink}
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer noopener"
                data-cursor="link"
              >
                LinkedIn
              </a>
              <a
                className={styles.contactLink}
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                data-cursor="link"
              >
                Instagram
              </a>
            </span>
          </div>
        </div>

        <TechLabel nano className={styles.hint}>
          Press / for the command terminal
        </TechLabel>
      </div>
    </section>
  );
}
