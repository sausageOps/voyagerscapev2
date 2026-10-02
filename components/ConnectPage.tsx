"use client";
import { useUI } from "@/lib/ui-store";
import { useRecorder } from "@/lib/use-recorder";
import MessageCTA from "@/components/HomeConnect/MessageCTA";
import RecorderPanel from "@/components/HomeConnect/RecorderPanel";
import styles from "./ConnectPage.module.css";

export default function ConnectPage() {
  const { recorderOpen, setRecorderOpen } = useUI();
  const recorder = useRecorder();
  return <div className={styles.page}>
    <section className={styles.hero} data-nav-surface="dark">
      <div className={styles.meta}><span>TRANSMISSION DESK / 02</span><span>STATUS: LISTENING</span></div>
      <h1>SEND<br />A <i>SIGNAL.</i></h1>
      <p>Projects, collaborations, visual experiments—or something we have not imagined yet. Choose a channel.</p>
      <div className={styles.radar} aria-hidden="true"><i/><i/><i/><b/></div>
    </section>
    <section className={styles.desk}>
      <div className={styles.voice}>
        <span>CHANNEL 01 / VOICE</span><h2>LEAVE A TRACE<br />IN THE MACHINE.</h2><p>Record a short voice note directly in the browser. Nothing is captured until you press record.</p>
        <div className={styles.control}>{recorderOpen ? <RecorderPanel open={recorderOpen} onClose={()=>{setRecorderOpen(false);if(recorder.recordingState==="recording")void recorder.stop();}} recordingState={recorder.recordingState} playbackState={recorder.playbackState} elapsedMs={recorder.elapsedMs} level={recorder.level} error={recorder.error} hasClip={recorder.hasClip} supported={recorder.supported} onStart={recorder.start} onStop={recorder.stop} onPreview={recorder.preview} onDiscard={recorder.discard} onSubmit={recorder.submit}/> : <MessageCTA open={false} onOpen={()=>setRecorderOpen(true)}/>}</div>
      </div>
      <div className={styles.channels}>
        <span>CHANNEL 02 / WRITTEN</span>
        <a href="mailto:studio@voyagerscape.co"><small>NEW PROJECTS</small><strong>studio@voyagerscape.co</strong><b>↗</b></a>
        <a href="mailto:hello@voyagerscape.co"><small>GENERAL SIGNAL</small><strong>hello@voyagerscape.co</strong><b>↗</b></a>
        <span className={styles.socialLabel}>CHANNEL 03 / ELSEWHERE</span>
        <a href="https://www.instagram.com" target="_blank" rel="noreferrer"><small>VISUAL FEED</small><strong>Instagram</strong><b>↗</b></a>
        <a href="https://www.linkedin.com" target="_blank" rel="noreferrer"><small>PROFESSIONAL FREQUENCY</small><strong>LinkedIn</strong><b>↗</b></a>
      </div>
    </section>
  </div>;
}
