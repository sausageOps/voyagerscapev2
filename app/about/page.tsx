import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";
import AboutCrt from "@/components/Crt/AboutCrt";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About"
      index="03"
      note="This is where the Voyagerscape story will live — creative direction, photography, technology and automotive background. The shell, navigation, terminal and visual modes already work here."
    >
      {/* Temporary home for the existing archive monitor, moved off the
          Home hero while that hero is being re-explored. */}
      <AboutCrt />
    </PlaceholderPage>
  );
}
