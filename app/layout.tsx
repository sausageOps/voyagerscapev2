import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import AppShell from "@/components/AppShell";

/* Display face: a grotesque whose curves are built from rectangular steps —
   the rasterised character the reference trades on (cf. FK Raster Grotesk),
   rather than a conventional geometric sans. */
const display = localFont({
  src: [
    {
      path: "../public/fonts/pixelify-sans/PixelifySans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/pixelify-sans/PixelifySans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/pixelify-sans/PixelifySans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-display-face",
  display: "swap",
});

const grotesk = localFont({
  src: [
    {
      path: "../public/fonts/inter-tight/InterTight-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/inter-tight/InterTight-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/inter-tight/InterTight-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/inter-tight/InterTight-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-grotesk",
  display: "swap",
});

const mono = localFont({
  src: [
    {
      path: "../public/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
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
