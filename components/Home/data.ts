/* =========================================================================
   HOMEPAGE CONTENT
   -------------------------------------------------------------------------
   Every string and every frame the homepage shows lives here, so the
   composition components stay about behaviour and the edit stays about
   content. Images are plain assets in /public/home with their intrinsic
   dimensions recorded — the layout reserves the box before decode, so the
   page never shifts while photographs arrive.
   ========================================================================= */

export interface Frame {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Editorial caption, shown as the frame's second state. */
  title: string;
  place: string;
  year: string;
  /** Technical plate — the photographic identity made tangible. */
  exposure: string;
}

export const ARRIVAL_FRAME: Frame = {
  src: "/home/arrival.jpg",
  width: 1376,
  height: 768,
  alt: "Layered mountain ridges dissolving into morning haze.",
  title: "Ridgeline, first light",
  place: "Eastern Himalaya",
  year: "2025",
  exposure: "ISO 200 · 1/500 · f8",
};

/** 03 — VISUAL WORLD. A wall, not a feed. Order is the composition. */
export const WALL: Frame[] = [
  {
    src: "/home/world-01.jpg",
    width: 768,
    height: 1376,
    alt: "Board-marked concrete facade with a single deep opening.",
    title: "Board-marked",
    place: "Chandigarh",
    year: "2024",
    exposure: "ISO 100 · 1/125 · f5.6",
  },
  {
    src: "/home/world-03.jpg",
    width: 1264,
    height: 848,
    alt: "Long exposure of a calm sea meeting a pale sky.",
    title: "Thirty seconds of sea",
    place: "Konkan coast",
    year: "2025",
    exposure: "ISO 64 · 30s · f16",
  },
  {
    src: "/home/world-02.jpg",
    width: 768,
    height: 1376,
    alt: "A figure silhouetted against a tall window of diffused light.",
    title: "Someone, leaving",
    place: "Studio",
    year: "2024",
    exposure: "ISO 800 · 1/60 · f2",
  },
  {
    src: "/home/world-05.jpg",
    width: 1376,
    height: 768,
    alt: "Wind-rippled dunes divided by a single ridge of light and shadow.",
    title: "Wind, drawn",
    place: "Thar",
    year: "2023",
    exposure: "ISO 100 · 1/250 · f11",
  },
  {
    src: "/home/world-04.jpg",
    width: 768,
    height: 1376,
    alt: "A narrow Kolkata street at dawn with a distant walking figure.",
    title: "North Kolkata, 05:40",
    place: "Kolkata",
    year: "2025",
    exposure: "ISO 400 · 1/80 · f2.8",
  },
  {
    src: "/home/world-06.jpg",
    width: 768,
    height: 1376,
    alt: "Bare trunks standing in dense fog.",
    title: "Nothing, in detail",
    place: "Dooars",
    year: "2024",
    exposure: "ISO 320 · 1/160 · f4",
  },
];

/** 05 — PHOTOGRAPHY. Three frames, deliberately different weights. */
export const PHOTOGRAPHS: Frame[] = [
  {
    src: "/home/photo-01.jpg",
    width: 1584,
    height: 672,
    alt: "An empty road crossing a hazy plain beneath an immense pale sky.",
    title: "The road refuses to end",
    place: "Deccan plateau",
    year: "2025",
    exposure: "ISO 100 · 1/320 · f9",
  },
  {
    src: "/home/photo-02.jpg",
    width: 768,
    height: 1376,
    alt: "A linen curtain lifting beside a rectangle of window light.",
    title: "A room that breathes",
    place: "Kolkata",
    year: "2024",
    exposure: "ISO 640 · 1/100 · f2.8",
  },
  {
    src: "/home/photo-03.jpg",
    width: 1376,
    height: 768,
    alt: "Birds scattered across an empty sky above a thin band of rooftops.",
    title: "Everything above the rooftops",
    place: "Kolkata",
    year: "2026",
    exposure: "ISO 200 · 1/1000 · f5.6",
  },
];

/** 04 — the photograph that is taken apart and put back together. */
export const LIGHT_FRAME: Frame = WALL[3];

/* ---------- 02 — IDENTITY / CREATIVE DNA ---------- */

export type DnaPreview = "photograph" | "art" | "motion" | "design" | "code" | "experiment";

export interface DnaEntry {
  index: string;
  word: string;
  note: string;
  preview: DnaPreview;
  frame: Frame;
}

export const DNA: DnaEntry[] = [
  {
    index: "01",
    word: "Photography",
    note: "Looking long enough that the ordinary gives in.",
    preview: "photograph",
    frame: WALL[4],
  },
  {
    index: "02",
    word: "Art",
    note: "The frame stops being a document and starts being a claim.",
    preview: "art",
    frame: WALL[1],
  },
  {
    index: "03",
    word: "Motion",
    note: "Images that refuse to hold still for you.",
    preview: "motion",
    frame: WALL[2],
  },
  {
    index: "04",
    word: "Design",
    note: "Composition as a discipline, not a filter.",
    preview: "design",
    frame: WALL[0],
  },
  {
    index: "05",
    word: "Code",
    note: "The photograph as data — sampled, rebuilt, returned.",
    preview: "code",
    frame: WALL[3],
  },
  {
    index: "06",
    word: "Experiment",
    note: "The part that is allowed to fail in public.",
    preview: "experiment",
    frame: WALL[5],
  },
];

/* ---------- Chapter registry (drives the viewfinder) ---------- */

export interface Chapter {
  id: string;
  index: string;
  title: string;
  /** Right-hand readout in the viewfinder for this chapter. */
  readout: string;
}

export const CHAPTERS: Chapter[] = [
  { id: "arrival", index: "01", title: "Arrival", readout: "Observing" },
  { id: "identity", index: "02", title: "Identity", readout: "Index / 06" },
  { id: "world", index: "03", title: "Visual world", readout: "Frame 07" },
  { id: "light", index: "04", title: "Light", readout: "Light / 04" },
  { id: "photographs", index: "05", title: "Photographs", readout: "ISO 400" },
  { id: "voyagerscape", index: "06", title: "Voyagerscape", readout: "Voyage" },
];
