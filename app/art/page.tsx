import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Art",
  description: "Voyagerscape photography and art portfolio — galleries, projects and filters.",
};

export default function ArtPage() {
  return (
    <PlaceholderPage
      title="Art"
      index="01"
      note="This is where the Voyagerscape photography and art portfolio will live — galleries, projects and filters. The shell, navigation, terminal and visual modes already work here."
    />
  );
}
