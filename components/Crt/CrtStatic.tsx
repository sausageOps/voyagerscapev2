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
     edit that silently breaks one scene out of five; letting SVG do the
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

          {/* VOYAGE ARCADE — the geometric shooter, held on one frame.
              Same palette and the same shapes the canvas programme draws,
              so the fallback is the same broadcast at lower fidelity. */}
          {channel === 2 && (
            <g shapeRendering="crispEdges">
              <rect x={sx} y={sy} width={sw} height="54" fill="#120b2e" />
              <rect x={sx} y={sy + 54} width={sw} height="40" fill="#1b0f3c" />
              <rect x={sx} y={sy + 94} width={sw} height={sh - 94} fill="#241247" />
              {/* the banded planet, half off the left edge */}
              {[0, 1, 2, 3].map((i) => (
                <rect
                  key={i}
                  x={sx}
                  y={sy + 8 + i * 13}
                  width={26 - Math.abs(i - 1.5) * 6}
                  height="13"
                  fill={["#3c2f6e", "#4a3a86", "#5d4aa0", "#7a5fb8"][i]}
                />
              ))}
              {/* stars, on a fixed lattice */}
              {[
                [22, 16], [54, 8], [86, 30], [140, 12], [168, 44],
                [40, 74], [112, 66], [180, 92], [64, 108], [150, 120],
              ].map(([x, y]) => (
                <rect key={`${x}-${y}`} x={sx + x} y={sy + y} width="3" height="3" fill="#8f86c8" />
              ))}
              {/* enemies: a diamond and an orb */}
              <path
                d={`M${sx + 66} ${sy + 24} L${sx + 80} ${sy + 38} L${sx + 66} ${sy + 52} L${sx + 52} ${sy + 38} Z`}
                fill="#ff6ad5"
              />
              <rect x={sx + 60} y={sy + 32} width="12" height="12" fill="#ffd6f2" />
              <rect x={sx + 128} y={sy + 22} width="26" height="20" fill="#ffc14d" />
              <rect x={sx + 134} y={sy + 16} width="14" height="6" fill="#ffc14d" />
              <rect x={sx + 136} y={sy + 28} width="10" height="8" fill="#fff0c0" />
              {/* shots */}
              <rect x={sx + 96} y={sy + 64} width="4" height="12" fill="#fff6a0" />
              <rect x={sx + 96} y={sy + 90} width="4" height="12" fill="#fff6a0" />
              {/* the player */}
              <path
                d={`M${sx + 98} ${sy + 104} L${sx + 116} ${sy + 126} L${sx + 80} ${sy + 126} Z`}
                fill="#2f7fd0"
              />
              <rect x={sx + 92} y={sy + 112} width="12" height="10" fill="#8fd4ff" />
              <rect x={sx + 96} y={sy + 114} width="4" height="6" fill="#ffe36a" />
              <rect x={sx + 94} y={sy + 126} width="8" height="6" fill="#ff9f4a" />
              {/* HUD strips */}
              <rect x={sx} y={sy} width={sw} height="12" fill="#0b0820" />
              <rect x={sx} y={sy + 12} width={sw} height="2" fill="#4b4380" />
              <rect x={sx + 8} y={sy + 3} width="46" height="6" fill="#8f86c8" />
              <rect x={sx + 140} y={sy + 3} width="48" height="6" fill="#57e0ff" />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <rect
                  key={i}
                  x={sx + 60 + i * 10}
                  y={sy + 134}
                  width="7"
                  height="7"
                  fill={i < 5 ? "#57e0ff" : "#241247"}
                />
              ))}
            </g>
          )}

          {/* SIGNAL LOST — the engineering page: bars, a flatlined
              timebase, the geometry under test and a dead carrier. */}
          {channel === 3 && (
            <g>
              {["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"].map(
                (c, i) => (
                  <rect
                    key={c}
                    x={sx + (i * sw) / 7}
                    y={sy}
                    width={sw / 7 + 1}
                    height="22"
                    fill={c}
                  />
                ),
              )}
              {Array.from({ length: 10 }, (_, i) => (
                <rect
                  key={i}
                  x={sx + (i * sw) / 10}
                  y={sy + 22}
                  width={sw / 10 + 1}
                  height="6"
                  fill={`rgb(${Math.round((i / 9) * 210)},${Math.round((i / 9) * 210)},${Math.round((i / 9) * 210)})`}
                />
              ))}

              {/* timebase panel, holding a dead trace */}
              <rect x={sx + 4} y={sy + 34} width="92" height="52" fill="#070c10" />
              <rect
                x={sx + 4.5}
                y={sy + 34.5}
                width="91"
                height="51"
                fill="none"
                stroke="#1e3a44"
                strokeWidth="1"
              />
              <rect x={sx + 5} y={sy + 35} width="90" height="7" fill="#0e1c22" />
              <rect x={sx + 8} y={sy + 37} width="34" height="3" fill="#5f97a8" />
              <path
                d={`M${sx + 8} ${sy + 62} l8 0 l3 -5 l4 10 l3 -5 l10 0 l4 -3 l3 6 l5 -3 l12 0 l4 4 l3 -4 l16 0`}
                fill="none"
                stroke="#3f6a78"
                strokeWidth="1.2"
              />

              {/* geometry under test */}
              <rect x={sx + 100} y={sy + 34} width="92" height="52" fill="#070c10" />
              <rect
                x={sx + 100.5}
                y={sy + 34.5}
                width="91"
                height="51"
                fill="none"
                stroke="#1e3a44"
                strokeWidth="1"
              />
              <rect x={sx + 101} y={sy + 35} width="90" height="7" fill="#0e1c22" />
              <rect x={sx + 104} y={sy + 37} width="38" height="3" fill="#5f97a8" />
              <g stroke="#96ebff" strokeWidth="1.1" fill="none" opacity="0.85">
                <path
                  d={`M${sx + 146} ${sy + 46} L${sx + 168} ${sy + 64} L${sx + 146} ${sy + 82} L${sx + 124} ${sy + 64} Z`}
                />
                <path d={`M${sx + 146} ${sy + 46} L${sx + 146} ${sy + 82}`} />
                <path d={`M${sx + 124} ${sy + 64} L${sx + 168} ${sy + 64}`} />
                <path
                  d={`M${sx + 134} ${sy + 55} L${sx + 158} ${sy + 55} L${sx + 158} ${sy + 74} L${sx + 134} ${sy + 74} Z`}
                />
              </g>

              {/* readout rows, as rules rather than type */}
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <rect x={sx + 6} y={sy + 94 + i * 8} width="20" height="3" fill="#2f5b68" />
                  <rect x={sx + 32} y={sy + 94 + i * 8} width="46" height="3" fill="#7fb8cc" />
                  <rect x={sx + 104} y={sy + 94 + i * 8} width="22" height="3" fill="#2f5b68" />
                  <rect x={sx + 132} y={sy + 94 + i * 8} width="52" height="3" fill="#7fb8cc" />
                </g>
              ))}

              {/* the verdict banner */}
              <rect x={sx + 6} y={sy + 118} width={sw - 12} height="16" fill="#0d1418" />
              <rect
                x={sx + 6.5}
                y={sy + 118.5}
                width={sw - 13}
                height="15"
                fill="none"
                stroke="#ff8a6a"
                strokeWidth="1"
              />
              <rect x={sx + 12} y={sy + 123} width="62" height="7" fill="#ff9f7a" />
              <rect x={sx + 138} y={sy + 124} width="44" height="4" fill="#4b6a76" />

              {/* carrier meter, pinned at almost nothing */}
              <rect x={sx + 6} y={sy + 138} width={sw - 12} height="6" fill="#16242c" />
              {Array.from({ length: 14 }, (_, i) => (
                <rect
                  key={i}
                  x={sx + 8 + i * 13}
                  y={sy + 139}
                  width="10"
                  height="4"
                  fill={i < 2 ? "#6fe0a4" : "#1b2c33"}
                />
              ))}
            </g>
          )}

          {/* PIXEL ARCHIVE — the quiet one: one held frame of the
              tile-grid adventure, on its own limited palette. */}
          {channel === 4 && (
            <g shapeRendering="crispEdges">
              <rect x={sx} y={sy} width={sw} height="30" fill="#1d1b3a" />
              <rect x={sx} y={sy + 30} width={sw} height="20" fill="#43305c" />
              <rect x={sx} y={sy + 50} width={sw} height="10" fill="#8a4f6a" />
              {/* moon and stars */}
              <rect x={sx + 148} y={sy + 8} width="14" height="14" fill="#f2e2b0" />
              <rect x={sx + 145} y={sy + 11} width="20" height="8" fill="#f2e2b0" />
              {[[18, 10], [42, 20], [70, 6], [96, 24], [120, 14], [174, 26]].map(([x, y]) => (
                <rect key={`${x}-${y}`} x={sx + x} y={sy + y} width="3" height="3" fill="#f2e2b0" />
              ))}
              {/* ridge, water, bank */}
              <rect x={sx} y={sy + 48} width={sw} height="14" fill="#2b2350" />
              <rect x={sx} y={sy + 62} width={sw} height="20" fill="#2f4a7a" />
              <rect x={sx} y={sy + 62} width={sw} height="3" fill="#6fa8d8" />
              {[10, 38, 66, 104, 132, 170].map((x) => (
                <rect key={x} x={sx + x} y={sy + 70} width="6" height="3" fill="#6fa8d8" />
              ))}
              <rect x={sx} y={sy + 82} width={sw} height={sh - 82} fill="#3f6b4a" />
              <rect x={sx} y={sy + 82} width={sw} height="3" fill="#2a4a35" />
              {/* the stone marker */}
              <rect x={sx + 18} y={sy + 50} width="20" height="36" fill="#9a9a8a" />
              <rect x={sx + 15} y={sy + 46} width="26" height="5" fill="#9a9a8a" />
              <rect x={sx + 22} y={sy + 58} width="5" height="8" fill="#171326" />
              <rect x={sx + 31} y={sy + 58} width="5" height="8" fill="#ffd15c" />
              <rect x={sx + 23} y={sy + 72} width="10" height="14" fill="#171326" />
              {/* two pines */}
              {[62, 112].map((x) => (
                <g key={x}>
                  <rect x={sx + x} y={sy + 58} width="16" height="6" fill="#2f6b3f" />
                  <rect x={sx + x + 3} y={sy + 52} width="10" height="6" fill="#2f6b3f" />
                  <rect x={sx + x + 5} y={sy + 46} width="6" height="6" fill="#4a8f52" />
                  <rect x={sx + x + 6} y={sy + 64} width="4" height="8" fill="#4a3524" />
                </g>
              ))}
              {/* the road and the walker */}
              <rect x={sx} y={sy + 100} width={sw} height="16" fill="#8a7a5a" />
              <rect x={sx} y={sy + 100} width={sw} height="3" fill="#5f533a" />
              <rect x={sx} y={sy + 113} width={sw} height="3" fill="#5f533a" />
              <rect x={sx + 86} y={sy + 96} width="12" height="6" fill="#f0c090" />
              <rect x={sx + 84} y={sy + 102} width="16" height="14" fill="#c85a4a" />
              <rect x={sx + 102} y={sy + 104} width="4" height="8" fill="#ffd15c" />
              {/* the text box */}
              <rect x={sx + 8} y={sy + 120} width={sw - 16} height="24" fill="#171326" />
              <rect
                x={sx + 8.5}
                y={sy + 120.5}
                width={sw - 17}
                height="23"
                fill="none"
                stroke="#9a9a8a"
                strokeWidth="1"
              />
              <rect x={sx + 13} y={sy + 124} width="16" height="16" fill="#c85a4a" />
              <rect x={sx + 13} y={sy + 124} width="16" height="5" fill="#f0c090" />
              <rect x={sx + 36} y={sy + 126} width="118" height="4" fill="#e8e2d0" />
              <rect x={sx + 36} y={sy + 135} width="96" height="3" fill="#a8a292" />
              <rect x={sx + 168} y={sy + 136} width="5" height="5" fill="#ffd15c" />
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
 * rolling through a sync disturbance to get there. Five frames, one piece
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
    setChannel((c) => (c + 1) % 5);
    onShutter();
  }, [onShutter]);

  const label = [
    "VOYAGE DRIVE",
    "ARCHIVE MAZE",
    "VOYAGE ARCADE",
    "SIGNAL LOST",
    "PIXEL ARCHIVE",
  ][channel];

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
