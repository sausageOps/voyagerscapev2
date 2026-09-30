"use client";

import { useCallback, useState } from "react";
import { SCREEN_STATES } from "./proportions";
import styles from "./Crt3D.module.css";

/**
 * CRT FALLBACK — static SVG
 * =========================
 *
 * The production-safe, motion-free rendering of the terminal: no WebGL, no
 * animation. Covers the server render, reduced motion, data saver, no-WebGL
 * and runtime context loss. Tapping still advances the screen state (a text
 * swap — not motion), so the object stays interactive everywhere.
 */
export default function CrtFallback() {
  const [i, setI] = useState(0);
  const state = SCREEN_STATES[i % SCREEN_STATES.length];
  const advance = useCallback(() => setI((n) => (n + 1) % SCREEN_STATES.length), []);

  return (
    <div className={styles.stage}>
      <button
        type="button"
        className={styles.hit}
        onClick={advance}
        data-cursor="crt"
        data-cursor-label="Tune"
        aria-label="Voyagerscape terminal — press to change signal"
      >
        <div className={styles.canvas} aria-hidden="true">
          <svg viewBox="0 0 400 400" width="100%" height="100%" role="img">
            <defs>
              <radialGradient id="crtScreen" cx="50%" cy="44%" r="70%">
                <stop offset="0%" stopColor="#1a1730" />
                <stop offset="60%" stopColor="#0b0d14" />
                <stop offset="100%" stopColor="#05060a" />
              </radialGradient>
              <linearGradient id="crtShell" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2d9c7" />
                <stop offset="100%" stopColor="#c6bca6" />
              </linearGradient>
              <pattern id="crtScan" width="4" height="4" patternUnits="userSpaceOnUse">
                <rect width="4" height="2" fill="rgba(5,6,10,0.35)" />
              </pattern>
              <filter id="crtGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* stand */}
            <rect x="140" y="356" width="120" height="26" rx="10" fill="#b0a68f" />
            <rect x="176" y="330" width="48" height="34" rx="8" fill="url(#crtShell)" />

            {/* body */}
            <rect x="44" y="66" width="312" height="272" rx="30" fill="url(#crtShell)" stroke="#b0a68f" strokeWidth="2" />
            {/* seam */}
            <rect x="52" y="120" width="296" height="3" rx="1.5" fill="#b0a68f" opacity="0.6" />

            {/* signature signal sphere on top */}
            <g transform="translate(120 60)">
              <rect x="-5" y="6" width="10" height="20" rx="4" fill="#4a4b52" />
              <circle cx="0" cy="-14" r="18" fill="none" stroke="#d9bd7c" strokeWidth="3" />
              <ellipse cx="0" cy="-14" rx="8" ry="18" fill="none" stroke="#d9bd7c" strokeWidth="2.4" />
              <circle cx="0" cy="-14" r="10" fill="#c9baff" filter="url(#crtGlow)" />
            </g>

            {/* screen bezel + recess */}
            <rect x="70" y="92" width="260" height="176" rx="22" fill="#1b1c21" />
            <rect x="84" y="104" width="232" height="152" rx="16" fill="url(#crtScreen)" />

            {/* screen content */}
            <text
              x="200"
              y="188"
              textAnchor="middle"
              fill="#dcd0ff"
              filter="url(#crtGlow)"
              style={{ font: "600 46px var(--font-display)" }}
            >
              {state}
            </text>
            <text x="98" y="126" fill="rgba(200,190,245,0.7)" style={{ font: "500 11px var(--font-mono)" }}>
              VOYAGERSCAPE
            </text>
            <text x="302" y="126" textAnchor="end" fill="rgba(200,190,245,0.7)" style={{ font: "500 11px var(--font-mono)" }}>
              CRT-01
            </text>
            <text x="98" y="246" fill="rgba(200,190,245,0.6)" style={{ font: "500 11px var(--font-mono)" }}>
              MODE {String((i % SCREEN_STATES.length) + 1).padStart(2, "0")}
            </text>
            <rect x="84" y="104" width="232" height="152" rx="16" fill="url(#crtScan)" opacity="0.5" />

            {/* fascia controls */}
            <g>
              {[110, 150, 190].map((cx) => (
                <g key={cx}>
                  <circle cx={cx} cy={300} r={17} fill="#3a3b43" stroke="#2b2c33" strokeWidth="2" />
                  <circle cx={cx} cy={300} r={11} fill="#4a4b52" />
                  <rect x={cx - 1.5} y={289} width={3} height={9} rx={1.5} fill="#d9bd7c" />
                </g>
              ))}
              <rect x={224} y={288} width={24} height={24} rx={6} fill="#f1b8e4" />
              <rect x={256} y={288} width={24} height={24} rx={6} fill="#f3e5b5" />
              {/* LEDs */}
              <circle cx={296} cy={288} r={4} fill="#7fd6a8" />
              <circle cx={296} cy={300} r={4} fill="#f3e5b5" />
              <circle cx={296} cy={312} r={4} fill="#f1b8e4" />
              {/* secondary readout */}
              <rect x={312} y={286} width={30} height={28} rx={5} fill="#0b0906" />
              <text x={327} y={304} textAnchor="middle" fill="#f3d9a0" style={{ font: "600 12px var(--font-mono)" }}>
                07
              </text>
            </g>
          </svg>
        </div>
      </button>
      <span className="vs-sr-only" aria-live="polite">
        Terminal signal: {state}
      </span>
    </div>
  );
}
