/**
 * VOYAGERSCAPE CRT — palette
 * ==========================
 *
 * On-brand but distinct from the camera hero: a warm bone/graphite industrial
 * machine. Brand accents (pink / yellow / lavender) survive on the LEDs,
 * buttons and the signature sphere. The phosphor is a restrained lavender-
 * white — deliberately NOT a green terminal or cyberpunk cyan.
 */
export const CRT = {
  /* shell — warm bone, the dominant surface */
  shell: "#d8cfbd",
  shellDeep: "#c6bca6",
  shellDark: "#b0a68f",

  /* dark graphite — bezel, recesses, vents */
  bezel: "#1b1c21",
  bezelInner: "#0e0f13",
  graphite: "#2b2c33",
  graphiteSoft: "#3a3b43",

  /* satin metal + brass signature hardware */
  satin: "#8b8474",
  metalDark: "#4a4b52",
  brass: "#b49a63",
  brassBright: "#d9bd7c",

  /* screen: near-black glass with a lavender phosphor */
  screenGlass: "#0a0e0d",
  phosphor: "#dcd0ff", // lavender-white text glow
  phosphorDim: "#8f86c4",
  scanline: "#05060a",

  /* readout: amber-ish secondary display */
  readoutGlass: "#0b0906",
  readoutGlow: "#f3d9a0",

  /* brand accents */
  pink: "#f1b8e4",
  yellow: "#f3e5b5",
  lavender: "#d8ccff",
  green: "#7fd6a8",

  /* signal sphere core */
  sphere: "#c9baff",

  /* lighting */
  lightKey: "#fffdf9",
  lightSky: "#fffdf9",
  lightGround: "#e7dfd2",
  lightFill: "#d8ccff",
  lightRim: "#f3e5b5",

  /* contact shadow */
  shadow: "#3a352b",
} as const;
