import type { Metadata } from "next";
import CRTExperiment from "@/components/CRTExperiment";

export const metadata: Metadata = {
  title: "VOYAGERSCAPE CRT",
  description: "An independent visual research terminal experiment.",
};

export default function CRTPage() {
  return <CRTExperiment />;
}
