import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About"
      index="03"
      note="This is where the Voyagerscape story will live — creative direction, photography, technology and automotive background. The shell, navigation, terminal and visual modes already work here."
    />
  );
}
