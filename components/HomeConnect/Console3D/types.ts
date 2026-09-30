export const CONSOLE_MODES = ["EXPLORE", "CAPTURE", "ARCHIVE", "SIGNAL", "ABOUT", "CONNECT"] as const;

export type ConsoleMode = (typeof CONSOLE_MODES)[number];

export const MODE_COPY: Record<ConsoleMode, { channel: string; note: string; color: string }> = {
  EXPLORE: { channel: "FIELD / 01", note: "MAP THE UNKNOWN", color: "#f3e5b5" },
  CAPTURE: { channel: "FRAME / 02", note: "HOLD A MOMENT", color: "#f1b8e4" },
  ARCHIVE: { channel: "INDEX / 03", note: "KEEP THE TRACE", color: "#d8ccff" },
  SIGNAL: { channel: "RELAY / 04", note: "FIND THE THREAD", color: "#a9dbc8" },
  ABOUT: { channel: "ORIGIN / 05", note: "READ THE TERRAIN", color: "#e9c9a1" },
  CONNECT: { channel: "LINK / 06", note: "OPEN A CHANNEL", color: "#b7d7ea" },
};
