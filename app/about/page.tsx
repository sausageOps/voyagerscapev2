import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";
import AboutCrt from "@/components/Crt/AboutCrt";
import CodropsMacHero from "@/components/CodropsMacDemo";
import styles from "./AboutPage.module.css";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About"
      index="03"
      note="This is where the Voyagerscape story will live — creative direction, photography, technology and automotive background. The shell, navigation, terminal and visual modes already work here."
    >
      <div className={styles.archiveContent}>
        {/* Keep the existing archive monitor and its interactions intact. */}
        <AboutCrt />
        <section className={styles.mac} aria-label="Codrops Macintosh demo">
          <CodropsMacHero />
        </section>
      </div>
    </PlaceholderPage>
  );
}
