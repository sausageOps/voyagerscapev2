"use client";

import { useCallback, useState } from "react";
import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import styles from "./CrtStatic.module.css";

export type CrtStatus = "idle" | "rec" | "wait" | "play" | "err";

interface CrtStaticProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  /** 0–1 live level. Unused: the fallback carries no live meter. */
  level: number;
  onShutter: () => void;
}

const STATUS_TEXT: Record<CrtStatus, string> = {
  idle: "Idle",
  rec: "Recording",
  wait: "Encoding",
  play: "Playing back",
  err: "No input",
};

const LED: Record<CrtStatus, string> = {
  idle: "#6fe0a4",
  rec: "#ff6a8c",
  wait: "#ffc34d",
  play: "#6fe0a4",
  err: "#ff5a4d",
};

function resolveStatus(r: RecordingState, p: AudioPlaybackState): CrtStatus {
  if (p === "playing") return "play";
  if (r === "recording") return "rec";
  if (r === "processing" || r === "submitting") return "wait";
  if (r === "error") return "err";
  return "idle";
}

/**
 * THE MACHINE, IN ITS OWN 360 x 330 FIELD
 * =======================================
 *
 * Kept as its own function with its own coordinate field so the
 * artwork's forty-odd hand-placed coordinates never have to be re-tuned
 * when the surrounding box changes — the caller places it with a
 * transform instead. That is the same reason the programme artwork
 * inside it gets a nested viewBox.
 */
function Monitor({ channel, status }: { channel: number; status: CrtStatus }) {
  /* THE APERTURE, in the casting's coordinates. Tracks SCREEN in
     proportions.ts after the bezel reduction: 18% more visible screen for
     the same body. */
  const ax = 74;
  const ay = 62;
  const aw = 212;
  const ah = 160;

  /* The programme artwork keeps its own authored 196 x 148 field and is
     mapped into the aperture by a nested <svg> viewBox. Re-tuning forty
     hand-placed coordinates to fit a bezel change is exactly the kind of
     edit that silently breaks one scene out of four; letting SVG do the
     mapping cannot. The two boxes are 1.324 and 1.325 to one, so nothing
     stretches. */
  const sx = 82;
  const sy = 66;
  const sw = 196;
  const sh = 148;

  return (
    <g>
        {/* ---- contact shadow ---- */}
        <ellipse cx="180" cy="309" rx="128" ry="13" fill="#4a4236" opacity="0.18" />
        <ellipse cx="180" cy="308" rx="88" ry="8" fill="#4a4236" opacity="0.22" />

        {/* ---- base: foot and neck ---- */}
        <rect x="58" y="288" width="244" height="19" rx="9" fill="url(#vsCrtShell)" />
        <rect x="58" y="299" width="244" height="8" rx="4" fill="#c2b598" />
        <rect x="116" y="272" width="128" height="18" rx="7" fill="#d9ccb0" />

        {/* ---- rear housing, seen past the left flank ---- */}
        <path d="M40 40 L16 64 L16 230 L40 256 Z" fill="url(#vsCrtRear)" />
        <path d="M40 40 L16 64 L16 76 L40 52 Z" fill="#c0b394" opacity="0.7" />
        {/* flank ventilation */}
        <g fill="#5d5445" opacity="0.8">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x="21" y={108 + i * 14} width="13" height="5" rx="2.5" />
          ))}
        </g>

        {/* ---- top deck ventilation ---- */}
        <g fill="#5d5445" opacity="0.75">
          {Array.from({ length: 13 }, (_, i) => (
            <rect key={i} x={110 + i * 13} y="24" width="5" height="12" rx="2.5" />
          ))}
        </g>

        {/* ---- front casting ---- */}
        <rect x="38" y="36" width="284" height="238" rx="20" fill="url(#vsCrtShell)" />
        {/* moulding seam down the left flank */}
        <path d="M41 46 L41 264" stroke="#b6a98c" strokeWidth="1.4" fill="none" opacity="0.7" />

        {/* ---- recessed bezel step ---- */}
        <rect
          x={ax - 11}
          y={ay - 11}
          width={aw + 22}
          height={ah + 22}
          rx="40"
          fill="url(#vsCrtStep)"
        />
        <rect x={ax - 5} y={ay - 5} width={aw + 10} height={ah + 10} rx="36" fill="#a99c80" />

        {/* ---- the tube ---- */}
        <svg
          x={ax}
          y={ay}
          width={aw}
          height={ah}
          viewBox={`${sx} ${sy} ${sw} ${sh}`}
          preserveAspectRatio="none"
          clipPath="url(#vsCrtClip2)"
          overflow="hidden"
        >
          <rect x={sx} y={sy} width={sw} height={sh} fill="url(#vsCrtTube)" />

          {channel === 0 && (
            <g>
              <rect x={sx} y={sy} width={sw} height="62" fill="#3d2f63" />
              <rect x={sx} y={sy + 44} width={sw} height="18" fill="#8a5070" />
              <circle cx={sx + 122} cy={sy + 54} r="18" fill="#e89a60" />
              <rect x={sx} y={sy + 62} width={sw} height={sh - 62} fill="#1c2a1e" />
              <path
                d={`M${sx + 92} ${sy + 62} L${sx + 108} ${sy + 62} L${sx + 168} ${sy + sh} L${sx + 28} ${sy + sh} Z`}
                fill="#3b3b42"
              />
              <path
                d={`M${sx + 98} ${sy + 74} L${sx + 102} ${sy + 74} L${sx + 108} ${sy + 96} L${sx + 92} ${sy + 96} Z`}
                fill="#e6e0cb"
              />
              <path
                d={`M${sx + 86} ${sy + 112} L${sx + 114} ${sy + 112} L${sx + 124} ${sy + 146} L${sx + 76} ${sy + 146} Z`}
                fill="#e6e0cb"
              />
              <rect x={sx + 62} y={sy + 106} width="76" height="22" rx="4" fill="#c8455f" />
              <rect x={sx + 76} y={sy + 96} width="48" height="14" rx="3" fill="#8e2f45" />
              <rect x={sx + 66} y={sy + 114} width="14" height="7" fill="#ff5c5c" />
              <rect x={sx + 120} y={sy + 114} width="14" height="7" fill="#ff5c5c" />
            </g>
          )}

          {channel === 1 && (
            <g>
              <rect x={sx} y={sy} width={sw} height={sh / 2} fill="#1b2026" />
              <rect x={sx} y={sy + sh / 2} width={sw} height={sh / 2} fill="#2c2820" />
              <path
                d={`M${sx} ${sy} L${sx + 66} ${sy + 52} L${sx + 66} ${sy + 96} L${sx} ${sy + sh} Z`}
                fill="#4a5a66"
              />
              <path
                d={`M${sx + sw} ${sy} L${sx + 130} ${sy + 52} L${sx + 130} ${sy + 96} L${sx + sw} ${sy + sh} Z`}
                fill="#38454e"
              />
              <rect x={sx + 66} y={sy + 52} width="64" height="44" fill="#2a343d" />
              <rect x={sx + 88} y={sy + 66} width="20" height="30" fill="#c8a85a" opacity="0.8" />
              <rect x={sx + 6} y={sy + 34} width="4" height="40" fill="#bee1f0" opacity="0.18" />
            </g>
          )}

          {channel === 2 && (
            <g shapeRendering="crispEdges">
              <rect x={sx} y={sy} width={sw} height={sh} fill="#2c2450" />
              <rect x={sx} y={sy + 96} width={sw} height={sh - 96} fill="#4a3a2c" />
              <rect x={sx} y={sy + 96} width={sw} height="5" fill="#6b5540" />
              <rect x={sx + 26} y={sy + 66} width="52" height="9" fill="#7a6248" />
              <rect x={sx + 120} y={sy + 50} width="46" height="9" fill="#7a6248" />
              <rect x={sx + 42} y={sy + 44} width="18" height="18" fill="#f2c48a" />
              <rect x={sx + 46} y={sy + 62} width="10" height="14" fill="#4f7fd8" />
              <rect x={sx + 132} y={sy + 34} width="14" height="14" fill="#f2d76a" />
              <rect x={sx + 100} y={sy + 82} width="20" height="14" fill="#6fbf7f" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <rect key={i} x={sx + 10 + i * 16} y={sy + 14} width="5" height="5" fill="#cfc6f0" />
              ))}
            </g>
          )}

          {channel === 3 && (
            <g>
              {["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"].map(
                (c, i) => (
                  <rect
                    key={c}
                    x={sx + (i * sw) / 7}
                    y={sy}
                    width={sw / 7 + 1}
                    height="30"
                    fill={c}
                  />
                ),
              )}
              <g stroke="#96ebff" strokeWidth="1.2" fill="none" opacity="0.85">
                <path
                  d={`M${sx + 98} ${sy + 52} L${sx + 134} ${sy + 82} L${sx + 98} ${sy + 112} L${sx + 62} ${sy + 82} Z`}
                />
                <path d={`M${sx + 98} ${sy + 52} L${sx + 98} ${sy + 112}`} />
                <path d={`M${sx + 62} ${sy + 82} L${sx + 134} ${sy + 82}`} />
                <path
                  d={`M${sx + 78} ${sy + 66} L${sx + 118} ${sy + 66} L${sx + 118} ${sy + 98} L${sx + 78} ${sy + 98} Z`}
                />
              </g>
              <g fill="#16242c">
                <rect x={sx + 14} y={sy + 122} width={sw - 28} height="7" />
              </g>
              {Array.from({ length: 14 }, (_, i) => (
                <rect
                  key={i}
                  x={sx + 16 + i * 12}
                  y={sy + 123}
                  width="9"
                  height="5"
                  fill={i > 10 ? "#ffd06a" : "#6fe0a4"}
                  opacity={i < 9 ? 1 : 0.25}
                />
              ))}
            </g>
          )}

          {/* raster treatment: scanlines, then a vignette, then the
              specular the glass throws back at the room */}
          <rect x={sx} y={sy} width={sw} height={sh} fill="url(#vsCrtScan)" />
          <rect x={sx} y={sy} width={sw} height={sh} fill="url(#vsCrtVig)" />
          <rect x={sx} y={sy} width={sw} height={sh} fill="url(#vsCrtGlass)" />
        </svg>

        {/* inner bezel lip, drawn over the tube edge */}
        <rect
          x={ax}
          y={ay}
          width={aw}
          height={ah}
          rx="32"
          ry="28"
          fill="none"
          stroke="#8b7f66"
          strokeWidth="2"
          opacity="0.8"
        />

        {/* ---- control cluster, lower right ---- */}
        <g>
          <rect x="192" y="240" width="90" height="19" rx="7" fill="#a89b80" />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={198 + i * 20}
              y={244}
              width="14"
              height="11"
              rx="3"
              fill={i === 1 || i === 2 ? "#44444c" : "#3a3a40"}
            />
          ))}
          {/* status lamp */}
          <circle cx="290" cy="250" r="6" fill="#9d917a" />
          <circle cx="290" cy="250" r="3.4" fill={LED[status]} />
          {/* power switch */}
          <rect x="298" y="239" width="24" height="21" rx="7" fill="#ddd1b6" />
          <rect x="302" y="244" width="16" height="12" rx="4" fill="#2e2e34" />
          <path
            d="M310 246.5 a3.4 3.4 0 1 0 0.01 0"
            fill="none"
            stroke="#8b8b94"
            strokeWidth="1.1"
          />
          <rect x="309.4" y="245.4" width="1.2" height="3.2" fill="#8b8b94" />
        </g>

        {/* ---- badge deboss, lower left. No typography, by design. ---- */}
        <rect x="66" y="245" width="60" height="10" rx="4" fill="#d3c6aa" />
        <rect x="134" y="245" width="20" height="10" rx="4" fill="#d3c6aa" />
    </g>
  );
}

/**
 * THE STATIC MONITOR
 * ==================
 *
 * The production fallback, and the only thing the server renders. It
 * covers: no WebGL, reduced motion, data saver, the server render, and
 * runtime context loss.
 *
 * This is a layered SVG built to the same proportions as the 3D object —
 * same casting, same aperture placement, same control cluster, same base —
 * so the upgrade to the canvas is a change of fidelity, not a change of
 * object. It is also the reason the hero never pops or reflows: the two
 * occupy an identical box.
 *
 * NO ANIMATION AT ALL
 * -------------------
 * Not a single transform, transition or keyframe. This path exists partly
 * BECAUSE the user asked for reduced motion, so animating it — even
 * gently, even "tastefully" — would defeat the point. The tube holds one
 * complete, stable archive frame.
 *
 * INTERACTION SURVIVES
 * --------------------
 * Reduced motion is not reduced function. The monitor is still a button,
 * still carries the cursor contract, and still changes channel when
 * clicked — the picture simply cuts to the next programme instead of
 * rolling through a sync disturbance to get there. Four frames, one piece
 * of state, no timers.
 */
export default function CrtStatic({
  recordingState,
  playbackState,
  onShutter,
}: CrtStaticProps) {
  const status = resolveStatus(recordingState, playbackState);
  const [channel, setChannel] = useState(0);

  const onClick = useCallback(() => {
    setChannel((c) => (c + 1) % 4);
    onShutter();
  }, [onShutter]);

  const label = ["VOYAGE DRIVE", "ARCHIVE MAZE", "PIXEL ARCADE", "VOYAGE ARCHIVE"][channel];

  return (
    <div className={styles.stage} data-status={status}>
      <button
        type="button"
        className={styles.hit}
        onClick={onClick}
        data-cursor="camera"
        data-cursor-label="Switch"
        aria-label="Archive monitor — change channel"
      >
        <svg
          className={styles.svg}
          viewBox="0 0 568 541"
          role="img"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="vsCrtShell" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f0e8d4" />
              <stop offset="0.5" stopColor="#e3d8bf" />
              <stop offset="1" stopColor="#cfc2a4" />
            </linearGradient>
            <linearGradient id="vsCrtRear" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d3c6a9" />
              <stop offset="1" stopColor="#b3a68a" />
            </linearGradient>
            <linearGradient id="vsCrtStep" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9bc9e" />
              <stop offset="1" stopColor="#e6dcc5" />
            </linearGradient>
            <radialGradient id="vsCrtTube" cx="0.42" cy="0.36" r="0.86">
              <stop offset="0" stopColor="#1d3040" />
              <stop offset="0.62" stopColor="#0e1720" />
              <stop offset="1" stopColor="#05080c" />
            </radialGradient>
            <linearGradient id="vsCrtGlass" x1="0.1" y1="0" x2="0.7" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="0.36" stopColor="#ffffff" stopOpacity="0.045" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="vsCrtVig" cx="0.5" cy="0.5" r="0.62">
              <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.55" />
            </radialGradient>
            <pattern id="vsCrtScan" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="2" fill="#000" opacity="0.16" />
            </pattern>
            <clipPath id="vsCrtClip2" clipPathUnits="userSpaceOnUse">
              {/* In the NESTED artwork viewBox's coordinates. */}
              <rect x="82" y="66" width="196" height="148" rx="30" ry="26" />
            </clipPath>
            <clipPath id="vsCrtClip" clipPathUnits="userSpaceOnUse">
              {/* Superellipse-ish aperture, matching the 3D outline. One
                  definition serves both machines: clip paths inherit the
                  user space of the element that references them, so the
                  secondary's 0.7 transform scales the clip with it. */}
              <rect x="74" y="62" width="212" height="160" rx="32" ry="28" />
            </clipPath>
          </defs>

          {/* One machine, centred in a 568 x 541 field — the same 1.05
              aspect the WebGL box uses, so the two renderers occupy an
              identical footprint and the upgrade causes no layout shift.
              The artwork keeps its own 360-wide coordinate system and is
              placed by a transform rather than being re-tuned. */}
          <g transform="translate(40 24) scale(1.43)">
            <Monitor channel={channel} status={status} />
          </g>
        </svg>
      </button>
      <span className="vs-sr-only" aria-live="polite">
        Archive monitor. Now showing: {label}. Device status: {STATUS_TEXT[status]}
      </span>
    </div>
  );
}
