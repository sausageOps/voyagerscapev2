"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioPlaybackState, RecordingState } from "@/lib/ui-store";
import { prefersReducedMotion } from "@/lib/motion";
import { MACHINE_STATUS_TEXT, resolveMachineStatus } from "./CreativeMachine3D/status";
import styles from "./CreativeMachineFallback.module.css";

interface CreativeMachineFallbackProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  level: number;
  onShutter: () => void;
}

/**
 * Capability and reduced-motion fallback for the same machine silhouette.
 * It is intentionally an illustration of the Creative Machine rather than
 * the former camera, so the hero's idea is retained without WebGL.
 */
export default function CreativeMachineFallback({
  recordingState,
  playbackState,
  onShutter,
}: CreativeMachineFallbackProps) {
  const [pulsing, setPulsing] = useState(false);
  const timeout = useRef<number | null>(null);
  const status = resolveMachineStatus(recordingState, playbackState);

  useEffect(
    () => () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    },
    [],
  );

  const activate = useCallback(() => {
    onShutter();
    setPulsing(true);
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(
      () => {
        timeout.current = null;
        setPulsing(false);
      },
      prefersReducedMotion() ? 120 : 720,
    );
  }, [onShutter]);

  return (
    <div className={styles.stage} data-status={status}>
      <button
        type="button"
        className={`${styles.hit} ${pulsing ? styles.pulse : ""}`}
        onClick={activate}
        data-cursor="creative-machine-control"
        data-cursor-label="Pulse"
        aria-label="Activate the creative machine control"
      >
        <svg className={styles.svg} viewBox="0 0 360 330" role="img" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="cmShell" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset="0.48" stopColor="#ded2bd" />
              <stop offset="1" stopColor="#bfb39f" />
            </linearGradient>
            <linearGradient id="cmPanel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4b4a50" />
              <stop offset="1" stopColor="#24252a" />
            </linearGradient>
            <linearGradient id="cmScreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#293a47" />
              <stop offset="1" stopColor="#10161c" />
            </linearGradient>
            <radialGradient id="cmShadow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#6c6253" stopOpacity="0.2" />
              <stop offset="1" stopColor="#6c6253" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx="181" cy="295" rx="132" ry="18" fill="url(#cmShadow)" />
          <g className={styles.machine}>
            {/* Asymmetric chassis with a structural right service rail. */}
            <path
              d="M53 121 Q53 103 72 98 L104 90 L121 69 Q126 61 141 60 H196 Q208 60 216 70 L232 88 L277 100 Q301 105 301 128 V255 Q301 274 282 279 H76 Q57 276 57 255 Z"
              fill="url(#cmShell)"
              stroke="#9c907d"
              strokeWidth="2"
            />
            <path d="M67 130 Q67 112 85 109 L111 103 H252 Q281 108 282 130 V248 Q280 263 265 264 H82 Q69 262 69 247 Z" fill="#eee4d3" stroke="#b4a891" strokeWidth="1.5" />

            {/* top service deck and elevated sensor */}
            <rect x="117" y="77" width="106" height="18" rx="7" fill="#4a494d" />
            <rect x="130" y="83" width="73" height="4" rx="2" fill="#c9b277" />
            <g className={styles.arm}>
              <path d="M231 91 L239 47" stroke="#989083" strokeWidth="8" strokeLinecap="round" />
              <path d="M231 91 L239 47" stroke="#d5cabb" strokeWidth="3" strokeLinecap="round" />
              <rect x="215" y="29" width="57" height="21" rx="7" fill="url(#cmPanel)" />
              <rect x="225" y="36" width="36" height="4" rx="2" fill="#d8ccff" />
              <circle cx="220" cy="40" r="4" className={styles.signal} fill="#c4b9a6" />
            </g>

            {/* central visual terminal */}
            <rect x="83" y="128" width="147" height="101" rx="16" fill="url(#cmPanel)" />
            <rect x="92" y="137" width="129" height="83" rx="11" fill="url(#cmScreen)" />
            <rect x="105" y="157" width="83" height="5" rx="2.5" className={styles.screenGlow} fill="#d8ccff" opacity="0.55" />
            <rect x="105" y="190" width="53" height="4" rx="2" fill="#8f887d" />
            <g fill="#d8ccff">
              <rect x="109" y="169" width="9" height="17" rx="3" />
              <rect x="126" y="164" width="9" height="22" rx="3" />
              <rect x="143" y="173" width="9" height="13" rx="3" />
            </g>
            <circle cx="195" cy="178" r="12" fill="none" stroke="#d8ccff" strokeWidth="4" />
            <circle cx="195" cy="178" r="3.5" className={styles.signal} fill="#c4b9a6" />

            {/* eight-sided scanner, deliberately secondary to the display */}
            <path d="M255 133 L274 142 L281 161 L272 181 L253 188 L235 178 L229 159 L238 141 Z" fill="#45444a" stroke="#8e8779" strokeWidth="2" />
            <path d="M252 143 L266 149 L271 161 L264 174 L250 178 L240 170 L238 158 L244 147 Z" fill="#15181c" />
            <rect x="250" y="148" width="7" height="25" rx="3.5" fill="#f3e5b5" />
            <rect x="243" y="170" width="21" height="4" rx="2" fill="#9b9285" />

            {/* linked lower deck */}
            <rect x="82" y="239" width="53" height="14" rx="5" fill="#222329" />
            <circle cx="97" cy="246" r="4" fill="#c3ae77" />
            <circle cx="119" cy="246" r="4" fill="#c3ae77" />
            <rect x="151" y="240" width="48" height="12" rx="4" fill="#46464c" />
            <rect x="164" y="244" width="21" height="4" rx="2" fill="#f3e5b5" />

            {/* vents / rail */}
            <rect x="70" y="213" width="18" height="53" rx="6" fill="#27282d" />
            {[220, 230, 240, 250].map((y) => <rect key={y} x="75" y={y} width="8" height="2.5" rx="1" fill="#737078" />)}
            <rect x="286" y="153" width="13" height="95" rx="5" fill="#46454b" />
            {[174, 202, 230].map((y) => <circle key={y} cx="294" cy={y} r="3" fill="#c3ae77" />)}

            {/* physical main control */}
            <g className={styles.dial}>
              <circle cx="254" cy="239" r="31" fill="#414047" stroke="#8e8779" strokeWidth="3" />
              <circle cx="254" cy="239" r="24" fill="#d8ccff" stroke="#b2a6d6" strokeWidth="2" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                const x = 254 + Math.cos(rad) * 27;
                const y = 239 + Math.sin(rad) * 27;
                return <rect key={angle} x={x - 1.5} y={y - 4} width="3" height="8" rx="1.5" fill="#8f887d" transform={`rotate(${angle} ${x} ${y})`} />;
              })}
              <rect x="251" y="223" width="6" height="17" rx="2" fill="#1d1f25" />
              <circle cx="244" cy="250" r="3.5" fill="#f1b8e4" />
            </g>

            {/* shared status channel */}
            <g>
              <circle cx="222" cy="112" r="4" fill="#8f887d" />
              <circle cx="236" cy="112" r="4" className={styles.signal} fill="#c4b9a6" />
              <circle cx="250" cy="112" r="4" fill="#8f887d" />
            </g>
            <rect x="89" y="273" width="51" height="10" rx="4" fill="#222329" />
            <rect x="221" y="273" width="51" height="10" rx="4" fill="#222329" />
          </g>
        </svg>
      </button>
      <span className="vs-sr-only" aria-live="polite">
        Creative machine: {pulsing ? "Pulse initiated" : MACHINE_STATUS_TEXT[status]}
      </span>
    </div>
  );
}
