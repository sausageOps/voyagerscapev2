"use client";

import { useEffect, type RefObject } from "react";
import { Renderer, Program, Mesh, Triangle, Texture, type OGLRenderingContext } from "ogl";
import styles from "./WarpTextLayer.module.css";

/**
 * REACT BITS — WARP TEXT, over the live hero line.
 * ================================================
 *
 * Source: the official React Bits registry item `WarpText-TS-CSS`
 * (https://reactbits.dev/r/WarpText-TS-CSS.json), the TypeScript/CSS
 * variant of https://reactbits.dev/c/text-animations/warp-text. Its
 * `ogl@^1.0.11` dependency is already in this project (Pattern Waves),
 * so nothing was installed.
 *
 * KEPT VERBATIM from that source: both shaders (ambient fbm warp,
 * pointer lens with bulge + ripple, refraction split), the uniform set
 * and `syncUniforms`, the Renderer/Triangle/Program/Mesh/Texture setup,
 * the animation loop with its idle drift and damping, the
 * Resize/Intersection observers, the visibility, reduced-motion and
 * context-loss handling, and the disposal path.
 *
 * ADAPTED — and only where the hero forced it:
 *
 * 1. TEXT SOURCE. The component takes a static `text` prop and
 *    rasterises it centred in its own box. This hero's words are owned
 *    by the rotation engine, which must stay authoritative, and the
 *    line is not one uniform string: the rotating word is 0.74em, the
 *    fixed word is 1em, and one of them sits on a translucent
 *    backplate. So `buildTextCanvas` is replaced by `mirrorHeroLine`,
 *    which reads the live DOM — text, rect, font, colour, letter
 *    spacing — and redraws it into the texture at its real position.
 *    The texture is a copy of the hero line, not a re-typeset version
 *    of it, so the composition survives the swap exactly.
 *
 * 2. WHEN IT RE-RASTERISES. On text change, as the brief requires, but
 *    also while a word is mid-roll — the engine rolls the outgoing word
 *    out of its clip window while the incoming one rises, and a texture
 *    frozen on the old string would turn that into a hard cut. A cheap
 *    signature (text + rounded rect) decides; the OGL context, program
 *    and texture object are created once and never rebuilt.
 *
 * 3. POINTER. The official build listens on the canvas. This canvas is
 *    `pointer-events: none` (the hero must never intercept the page),
 *    so the same two handlers are fed from window listeners and mapped
 *    through the canvas rect. Touch is ignored exactly as upstream.
 *
 * 4. MOUNT GUARDS. Reduced motion leaves the DOM text alone. Pointer
 *    capability is separate: coarse/touch devices still get the visual
 *    renderer, but not the pointer lens listeners. If the Renderer
 *    throws, upstream warns and returns, and here that also means the
 *    hero is simply never mirrored.
 */

export interface WarpTextLayerProps {
  /** The hero heading that owns the words to mirror. */
  targetRef: RefObject<HTMLElement>;
  warpStrength?: number;
  warpScale?: number;
  speed?: number;
  pointerInfluence?: number;
  pointerStrength?: number;
  refraction?: number;
  ripple?: boolean;
}

interface RuntimeProps {
  warpStrength: number;
  warpScale: number;
  speed: number;
  pointerInfluence: number;
  pointerStrength: number;
  refraction: number;
  ripple: boolean;
}

/* ---------- shaders: upstream, unmodified ---------- */

const vertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion;

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65);

  vec4 base = sampleText(displaced);
  float r = sampleText(displaced + split).r;
  float g = base.g;
  float b = sampleText(displaced - split).b;
  float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);

  vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

/* ---------- upstream helper, unmodified ---------- */

const measureLine = (ctx: CanvasRenderingContext2D, line: string, letterSpacing: number): number => {
  const chars = Array.from(line);
  const textWidth = chars.reduce((width, char) => width + ctx.measureText(char).width, 0);
  return textWidth + Math.max(0, chars.length - 1) * letterSpacing;
};

const drawLine = (
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  letterSpacing: number,
): void => {
  const chars = Array.from(line);
  let cursor = x;
  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + (index === chars.length - 1 ? 0 : letterSpacing);
  });
};

const syncUniforms = (program: Program, props: RuntimeProps): void => {
  const uniforms = program.uniforms;
  uniforms.uWarpStrength.value = props.warpStrength;
  uniforms.uWarpScale.value = props.warpScale;
  uniforms.uSpeed.value = props.speed;
  uniforms.uPointerInfluence.value = props.pointerInfluence;
  uniforms.uPointerStrength.value = props.pointerStrength;
  uniforms.uRefraction.value = props.refraction;
  uniforms.uRipple.value = props.ripple ? 1 : 0;
};

/* ---------- the adaptation: the hero line as the texture ---------- */

interface Piece {
  el: HTMLElement;
  clip?: DOMRect;
}

/** Everything the layer mirrors: the fixed word, plus whichever words
 *  of the marked rotating windows are currently inside their clip
 *  window. On-stage is decided from the element's own transform matrix,
 *  not from a word list — the rotation engine stays the only thing that
 *  knows what is showing. */
function collect(root: HTMLElement): Piece[] {
  const pieces: Piece[] = [];
  root.querySelectorAll<HTMLElement>("[data-warp-src]").forEach((el) => pieces.push({ el }));
  root.querySelectorAll<HTMLElement>("[data-warp-window]").forEach((win) => {
    const clip = win.getBoundingClientRect();
    win.querySelectorAll<HTMLElement>("[data-identity-word]").forEach((word) => {
      const box = word.getBoundingClientRect();
      // Cheap intersection test against the window it rolls inside.
      if (box.bottom < clip.top - 1 || box.top > clip.bottom + 1) return;
      if (getComputedStyle(word).opacity === "0") return;
      pieces.push({ el: word, clip });
    });
  });
  return pieces;
}

/** Signature of what is on screen right now. Text changes and roll
 *  frames both move it, so one comparison covers both re-raster rules. */
function signature(pieces: Piece[]): string {
  return pieces
    .map((p) => {
      const b = p.el.getBoundingClientRect();
      return `${p.el.textContent}@${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.width)}`;
    })
    .join("|");
}

/**
 * The colour a piece is drawn in, captured BEFORE the layer hides it.
 *
 * This is the bug that blanked the hero: the layer hid the DOM text and
 * then kept re-reading that same text's computed colour on every
 * re-mirror, so every raster after the first one painted the line in
 * `transparent` and the texture came back empty. The ink is now read
 * once, cached, and never re-read from a hidden element; hiding also
 * uses visibility rather than colour so a cache miss still reads a real
 * colour.
 */
const inkCache = new WeakMap<HTMLElement, string>();

function inkOf(el: HTMLElement): string {
  const cached = inkCache.get(el);
  if (cached) return cached;
  let color = getComputedStyle(el).color;
  // Defensive: never cache an invisible ink.
  if (!color || color === "transparent" || /rgba\(.*,\s*0\s*\)$/.test(color)) {
    const parent = el.parentElement;
    color = parent ? getComputedStyle(parent).color : "#18181b";
  }
  // The glyph body must be solid: drop any alpha the computed value
  // carries so the texture can never be rasterised semi-transparent.
  const rgba = color.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const [r, g, b] = rgba[1].split(",").map((part) => parseFloat(part));
    color = `rgb(${r}, ${g}, ${b})`;
  }
  inkCache.set(el, color);
  return color;
}

/** Draw the live line into the texture canvas, 1:1 with the DOM.
 *  Returns whether anything was actually painted — the gate that decides
 *  if the DOM text may be handed over to the shader. */
function mirrorHeroLine(
  canvas: HTMLCanvasElement,
  base: DOMRect,
  pieces: Piece[],
  dpr: number,
  verify = false,
): boolean {
  const width = Math.max(1, Math.floor(base.width * dpr));
  const height = Math.max(1, Math.floor(base.height * dpr));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, base.width, base.height);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const nativeSpacing = "letterSpacing" in ctx;

  pieces.forEach(({ el, clip }) => {
    const text = el.textContent ?? "";
    if (!text) return;
    const box = el.getBoundingClientRect();
    if (!box.width) return;
    const cs = getComputedStyle(el);
    const spacing = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) || 0;

    ctx.save();
    if (clip) {
      ctx.beginPath();
      ctx.rect(clip.left - base.left, clip.top - base.top, clip.width, clip.height);
      ctx.clip();
    }
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.fillStyle = inkOf(el);
    if (nativeSpacing) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        `${spacing}px`;
    }

    /* Baseline, derived from the piece's own box — one rule for every
       piece, no per-word constants.

       An INLINE piece (the wordmark) has a rect that IS the font box,
       so box.top + ascent is already the browser's baseline. A
       BLOCK-LEVEL piece does not: the rotating words are
       position:absolute, so they are blockified and their rect is the
       LINE BOX (line-height 1.25), with the font box centred inside it
       by half-leading. Reading box.top as the font box top therefore
       lifted every rotating word by (1.25 - 1.1176) / 2 = 0.066em —
       about 6px at desktop size — while the inline wordmark stayed put,
       which is the step between "Explore" and "Voyagerscape".

       Measuring the half-leading from the element's own rect against
       the font's own ascent + descent removes it for every piece at
       once: it evaluates to zero for inline pieces (rect == font box,
       nothing moves) and to the exact leading for block pieces, so all
       of them land on the browser's baseline — the one the DOM already
       lays out. Nothing is hardcoded and nothing is per-word. */
    const metrics = ctx.measureText(text);
    const ascent = metrics.fontBoundingBoxAscent || box.height * 0.8;
    const descent = metrics.fontBoundingBoxDescent || 0;
    const fontBox = ascent + descent;
    const halfLeading = fontBox > 0 && Math.abs(box.height - fontBox) > 0.5
      ? (box.height - fontBox) / 2
      : 0;
    const x = box.left - base.left;
    const y = box.top - base.top + halfLeading + ascent;

    if (nativeSpacing) ctx.fillText(text, x, y);
    else drawLine(ctx, text, x, y, spacing);
    ctx.restore();
  });

  if (!verify) return true;
  // One honest check that the texture has ink in it, run only while the
  // DOM text is still visible: if this is false, nothing is handed over.
  try {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 8) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* ---------- component ---------- */

export default function WarpTextLayer({
  targetRef,
  /* A controlled middle ground between the earlier restrained tuning
     (0.03 / 0.4 / 0.3 / 0.22 / 0.006 / ripple off) and the React Bits
     reference (0.08 / 0.55 / 0.42 / 0.38 / 0.018 / ripple on). White
     type on the frame's warm-white paper has almost no luminance
     contrast of its own, so the effect has to carry the legibility:
     stronger ambient warp to keep the letterforms moving against the
     static wave field, a wider and firmer pointer lens, and refraction
     raised to 0.014 so the RGB split reads as a visible chromatic edge
     — the reference's visual language — without tipping into fringing.
     Ripple is on for the travelling ring inside the lens. warpScale
     stays at stock. These are the single source of truth for BOTH hero
     rows: one renderer, one texture, no per-row overrides. */
  warpStrength = 0.06,
  warpScale = 1.7,
  speed = 0.5,
  pointerInfluence = 0.36,
  pointerStrength = 0.32,
  refraction = 0.014,
  ripple = true,
}: WarpTextLayerProps) {
  useEffect(() => {
    const target = targetRef.current;
    if (!target || typeof window === "undefined") return undefined;
    // Reduced motion keeps the existing DOM fallback. Pointer capability
    // only controls the interactive lens; it must not gate the visual
    // renderer on touch/coarse devices.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

    const host = target.parentElement;
    if (!host) return undefined;

    const runtime: RuntimeProps = {
      warpStrength,
      warpScale,
      speed,
      pointerInfluence,
      pointerStrength,
      refraction,
      ripple,
    };

    const container = document.createElement("div");
    container.className = styles.layer;
    container.setAttribute("aria-hidden", "true");
    host.appendChild(container);

    let renderer: Renderer;
    let gl: OGLRenderingContext;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
      gl = renderer.gl;
    } catch (error) {
      console.warn("WarpText: WebGL could not be initialized.", error);
      container.remove();
      return undefined;
    }

    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    const texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextTexture: { value: texture },
        uResolution: { value: new Float32Array([1, 1]) },
        uPointer: { value: new Float32Array([0.5, 0.5]) },
        uPointerActive: { value: 0 },
        uTime: { value: 0 },
        uWarpStrength: { value: runtime.warpStrength },
        uWarpScale: { value: runtime.warpScale },
        uSpeed: { value: runtime.speed },
        uPointerInfluence: { value: runtime.pointerInfluence },
        uPointerStrength: { value: runtime.pointerStrength },
        uRefraction: { value: runtime.refraction },
        uRipple: { value: runtime.ripple ? 1 : 0 },
        uMotion: { value: 1 },
      },
    });
    /* Alpha blending, corrected.
       OGL's `transparent: true` sets blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)
       for BOTH colour and alpha (node_modules/ogl/src/core/Program.js:47).
       Applied to the alpha channel over a cleared, fully transparent
       buffer that squares the source alpha: an antialiased edge pixel of
       0.5 is written as 0.25, one of 0.3 as 0.09. The glyph body (alpha
       1) is unaffected, but every soft edge — on a pixel face at this
       size, the whole contour of every element — composites far weaker
       than it should, which reads as a thin, washed-out letterform with
       the background coming through. The colour channels keep the
       upstream function exactly; only the alpha channel is corrected to
       the standard ONE / ONE_MINUS_SRC_ALPHA. The shader is untouched. */
    program.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const mesh = new Mesh(gl, { geometry, program });

    // One offscreen canvas for the whole session: re-rasterising during
    // a roll must not allocate.
    const textCanvas = document.createElement("canvas");

    let disposed = false;
    let contextLost = false;
    let visible = true;
    let pageVisible = !document.hidden;
    let reduceMotion = false;
    let raf = 0;
    let lastSignature = "";
    let mirrored: HTMLElement[] = [];
    let handedOver = false;
    /* The ResizeObserver fires the moment it starts observing, which is
       before the pixel face has loaded. Nothing may be rasterised — and
       above all nothing may be handed over — until it has. */
    let fontsReady = false;

    /* Temporary development diagnostics: add ?warp-debug to the URL.
       Silent in production and silent by default in development. */
    const debugging =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).has("warp-debug");
    const debug = (...args: unknown[]): void => {
      if (debugging) console.info("[WarpText]", ...args);
    };

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
    const startTime = performance.now();

    const renderOnce = () => {
      if (disposed || contextLost) return;
      renderer.render({ scene: mesh });
    };

    /** Mirror the current line into the texture. Replaces upstream's
     *  `rasterize`; same job, same call sites. */
    /* The handover sequence, in this order and no other:
         DOM visible -> renderer up -> texture built -> pixels verified
         -> one rendered frame -> only then hide the DOM text.
       Any failure at any step leaves the DOM text exactly as it is, so
       the hero can never be blank. */
    const rasterize = (): void => {
      if (disposed || contextLost) return;
      if (!fontsReady) {
        debug("skip: fonts not ready");
        return;
      }
      const base = container.getBoundingClientRect();
      if (base.width <= 0 || base.height <= 0) {
        debug("skip: container has no box", base.width, base.height);
        return;
      }
      const pieces = collect(target);
      if (!pieces.length) {
        debug("skip: nothing to mirror");
        return;
      }
      lastSignature = signature(pieces);

      let painted = false;
      try {
        painted = mirrorHeroLine(
          textCanvas,
          base,
          pieces,
          Math.min(window.devicePixelRatio || 1, 2),
          !handedOver,
        );
      } catch (error) {
        console.warn("WarpText: rasterisation failed; keeping DOM text.", error);
        return;
      }

      texture.image = textCanvas;
      texture.needsUpdate = true;
      renderOnce();

      if (debugging) probe(base, pieces);
      debug("mirrored", {
        container: `${Math.round(base.width)}x${Math.round(base.height)}`,
        texture: `${textCanvas.width}x${textCanvas.height}`,
        drawing: `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`,
        pieces: pieces.map((piece) => piece.el.textContent),
        ink: pieces.map((piece) => inkOf(piece.el))[0],
        font: pieces.length ? getComputedStyle(pieces[0].el).font : "",
        painted,
        handedOver,
      });

      if (handedOver || !painted) return;
      // A valid frame exists on screen now; the DOM text can step aside.
      handedOver = true;
      mirrored = Array.from(
        target.querySelectorAll<HTMLElement>(
          "[data-warp-src], [data-warp-window] [data-identity-word]",
        ),
      );
      // Cache every ink BEFORE hiding anything.
      mirrored.forEach((el) => inkOf(el));
      mirrored.forEach((el) => el.classList.add(styles.mirrored));
    };

    const showDom = (): void => {
      handedOver = false;
      target
        .querySelectorAll<HTMLElement>(`.${styles.mirrored}`)
        .forEach((el) => el.classList.remove(styles.mirrored));
      mirrored = [];
    };

    /* Diagnostic: read the same glyph centre out of (A) the rasterised
       2D canvas and (B) the GL drawing buffer after a render. Opaque in
       A but weak in B means the shader/blend stage; weak in A means the
       rasterisation; opaque in both means the pixels are solid and the
       issue is what they are being composited against. */
    const probe = (base: DOMRect, pieces: Piece[]): void => {
      const piece = pieces.find((candidate) => (candidate.el.textContent ?? "").length > 2);
      if (!piece) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const box = piece.el.getBoundingClientRect();
      // A point well inside the first glyph's stem area.
      const cssX = box.left - base.left + box.width * 0.06;
      const cssY = box.top - base.top + box.height * 0.5;
      const ctx = textCanvas.getContext("2d", { willReadFrequently: true });
      const texel = ctx?.getImageData(Math.round(cssX * dpr), Math.round(cssY * dpr), 1, 1).data;
      const buffer = new Uint8Array(4);
      try {
        gl.readPixels(
          Math.round(cssX * dpr),
          Math.round(gl.drawingBufferHeight - cssY * dpr),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          buffer,
        );
      } catch {
        /* readPixels is best effort */
      }
      debug("probe", {
        sample: piece.el.textContent,
        at: `${Math.round(cssX)},${Math.round(cssY)}`,
        rasterRGBA: texel ? Array.from(texel) : "unavailable",
        glRGBA: Array.from(buffer),
        note: "raster alpha 255 + gl alpha 255 = pixels are solid",
      });
    };

    const resize = () => {
      if (disposed || contextLost) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(rect.width, rect.height);
      program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
      rasterize();
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1 - (event.clientY - rect.top) / rect.height;
      pointer.tx = nx;
      pointer.ty = ny;
      // The canvas cannot receive pointerleave (it is pointer-events:
      // none), so leaving its box is what releases the lens.
      pointer.activeTarget = nx >= -0.15 && nx <= 1.15 && ny >= -0.3 && ny <= 1.3 ? 1 : 0;
    };

    const onPointerLeave = (): void => {
      pointer.activeTarget = 0;
    };

    const onContextLost = (event: Event): void => {
      event.preventDefault();
      contextLost = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      // Give the hero back to the DOM rather than leaving a blank line.
      showDom();
    };

    const onVisibility = (): void => {
      pageVisible = !document.hidden;
      if (pageVisible && visible && !raf) raf = requestAnimationFrame(loop);
      if (!pageVisible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReducedMotion = (event: MediaQueryListEvent): void => {
      reduceMotion = event.matches;
      program.uniforms.uMotion.value = reduceMotion ? 0 : 1;
      renderOnce();
    };

    const loop = (now: number): void => {
      if (disposed || contextLost) return;

      const elapsed = (now - startTime) * 0.001;
      const idleX = 0.5 + Math.sin(elapsed * 0.33) * 0.12;
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * 0.1;
      const targetX = pointer.activeTarget > 0 ? pointer.tx : idleX;
      const targetY = pointer.activeTarget > 0 ? pointer.ty : idleY;
      const damping = pointer.activeTarget > 0 ? 0.12 : 0.035;

      pointer.x += (targetX - pointer.x) * damping;
      pointer.y += (targetY - pointer.y) * damping;
      pointer.active += ((pointer.activeTarget > 0 ? 1 : 0.18) - pointer.active) * 0.06;

      program.uniforms.uPointer.value[0] = pointer.x;
      program.uniforms.uPointer.value[1] = pointer.y;
      program.uniforms.uPointerActive.value = hasFinePointer
        ? reduceMotion
          ? pointer.active * 0.35
          : pointer.active
        : 0;
      program.uniforms.uTime.value = reduceMotion ? 0 : elapsed;

      // The rotation engine owns the words; this only notices that they
      // moved or changed, and re-mirrors when they did.
      const pieces = collect(target);
      const sig = signature(pieces);
      if (sig !== lastSignature) {
        lastSignature = sig;
        try {
          mirrorHeroLine(
            textCanvas,
            container.getBoundingClientRect(),
            pieces,
            Math.min(window.devicePixelRatio || 1, 2),
          );
          texture.image = textCanvas;
          texture.needsUpdate = true;
        } catch (error) {
          console.warn("WarpText: re-mirror failed; restoring DOM text.", error);
          showDom();
        }
      }

      renderOnce();
      raf = requestAnimationFrame(loop);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]: IntersectionObserverEntry[]) => {
        visible = entry.isIntersecting;
        if (visible && pageVisible && !raf) raf = requestAnimationFrame(loop);
        if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    if (hasFinePointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("blur", onPointerLeave);
    }
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    document.addEventListener("visibilitychange", onVisibility);
    mediaQuery.addEventListener("change", onReducedMotion);

    syncUniforms(program, runtime);
    // Size the context now, but do NOT hand the hero over until Geist
    // Pixel has actually loaded: a raster taken against the fallback
    // face would both look wrong and mis-measure.
    const sizeOnly = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(rect.width, rect.height);
      program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
    };
    sizeOnly();
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (disposed) return;
      fontsReady = true;
      debug("fonts ready");
      rasterize();
      if (!handedOver) {
        // One retry a beat later (first paint can land mid-layout);
        // if that fails too, the DOM text simply stays.
        window.setTimeout(() => {
          if (!disposed && !handedOver) rasterize();
          if (!handedOver) debug("handover declined: DOM text kept visible");
        }, 400);
      }
    });
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (hasFinePointer) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("blur", onPointerLeave);
      }
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibility);
      mediaQuery.removeEventListener("change", onReducedMotion);

      showDom();

      if (!contextLost) {
        try {
          if (texture?.texture) gl.deleteTexture(texture.texture);
          geometry?.remove?.();
          program?.remove?.();
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch (error) {
          void error;
        }
      }
      container.remove();
    };
  }, [
    targetRef,
    warpStrength,
    warpScale,
    speed,
    pointerInfluence,
    pointerStrength,
    refraction,
    ripple,
  ]);

  return null;
}
