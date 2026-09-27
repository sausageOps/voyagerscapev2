import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <PlaceholderPage
      title="Services"
      index="02"
      note="This route is scaffolded and waiting for its content. The shell, navigation, terminal and visual modes already work here."
    />
  );
}
