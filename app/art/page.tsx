import type { Metadata } from "next";
import EditorialPage from "@/components/EditorialPage";
export const metadata: Metadata = { title: "Visual Archive", description: "Selected photography, moving image and visual studies from Voyagerscape." };
export default function ArtPage(){ return <EditorialPage variant="art" />; }
