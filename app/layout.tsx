import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import AppShell from "@/components/AppShell";

/* The approved three-family typography system (AGENTS.md, TYPOGRAPHY LOCK).
   Each family is declared exactly once, here, and exposed as a CSS variable.
   Every rule in the site reads these variables through the role tokens in
   styles/globals.css; no component loads a font of its own. All three are
   SIL Open Font License 1.1 — see THIRD_PARTY_NOTICES.md and each family's
   OFL.txt under public/fonts/. */

/* BRAND & DISPLAY — Geist Pixel Square. Wordmark and navigation branding,
   page headings and titles, the footer identity statement, the loader, the
   route-transition titles and the display menu headings. The face ships a
   single weight (400); display rules never request another, so the browser
   never synthesises bold on the pixel grid. */
const display = localFont({
  src: "../public/fonts/geist-pixel/GeistPixel-Square.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-display-face",
  display: "swap",
});

/* BODY & READABLE PROSE — Inter Tight. Regular 400 is the only weight the
   live typography requires (paragraphs, descriptions, page notes, long-form
   content and proportional interface text). */
const body = localFont({
  src: "../public/fonts/inter-tight/InterTight-Regular.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-body-face",
  display: "swap",
});

/* TECHNICAL UI — JetBrains Mono. Terminal and command input, CRT and canvas
   readouts, metadata, counters, technical labels, footer metadata, technical
   CTAs and skip links. Regular 400 carries the text; Medium 500 is used for
   the command glyph and the terminal cursor. */
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

/**
 * Anti-flash theme initialization script.
 * Runs synchronously before first render to apply stored or system theme immediately.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('vs-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`;

/**
 * Initial scroll lock, set before the first paint (see the html[data-loader]
 * rules in styles/globals.css). `pending` locks the page under the server-
 * rendered cover until PageLoader takes the JS lock; `expired` releases it if
 * the loader has not finished after 10s. The ceiling is the only way out
 * when a load never completes, so the page can never stay locked. It also
 * dispatches `vs:loader-expired`, which makes PageLoader release its JS
 * scroll lock (that lock also stops Lenis). With JavaScript disabled this
 * script never runs, the attribute is absent, and the 6-second CSS failsafe
 * applies instead.
 */
const loaderInitScript = `(function(){try{var d=document.documentElement;d.setAttribute('data-loader','pending');setTimeout(function(){if(d.getAttribute('data-loader')!=='done'){d.setAttribute('data-loader','expired');window.dispatchEvent(new Event('vs:loader-expired'));}},10000);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: loaderInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
