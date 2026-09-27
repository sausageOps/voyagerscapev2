import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import AppShell from "@/components/AppShell";

/* Display face: a grotesque whose curves are built from rectangular steps —
   the rasterised character the reference trades on (cf. FK Raster Grotesk),
   rather than a conventional geometric sans. */
const display = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display-face",
  display: "swap",
});

const grotesk = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-grotesk",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-tech",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://voyagerscape.studio"),
  title: {
    default: "Voyagerscape",
    template: "%s — Voyagerscape",
  },
  description:
    "Voyagerscape is an independent design practice building considered digital objects. Leave us a message.",
  applicationName: "Voyagerscape",
  openGraph: {
    title: "Voyagerscape",
    description: "An independent design practice building considered digital objects.",
    siteName: "Voyagerscape",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f0e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${grotesk.variable} ${mono.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
