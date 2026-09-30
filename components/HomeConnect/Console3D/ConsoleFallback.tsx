"use client";

import { useState } from "react";
import { CONSOLE_MODES, MODE_COPY, type ConsoleMode } from "./types";
import styles from "./Console3D.module.css";

/**
 * Non-WebGL/reduced-motion representation. It preserves the same silhouette,
 * state controls and large tactile wheel without asking the browser to create
 * a rendering context.
 */
export default function ConsoleFallback() {
  const [mode, setMode] = useState<ConsoleMode>("EXPLORE");
  const [turns, setTurns] = useState(0);
  const copy = MODE_COPY[mode];

  const advance = () => {
    const next = CONSOLE_MODES[(CONSOLE_MODES.indexOf(mode) + 1) % CONSOLE_MODES.length];
    setTurns((value) => value + 1);
    setMode(next);
  };

  return (
    <div className={styles.fallback} data-cursor="console" data-cursor-label="Operate" role="group" aria-label="Voyagerscape navigation console">
      <svg className={styles.fallbackSvg} viewBox="0 0 690 500" aria-hidden="true">
        <defs>
          <linearGradient id="console-shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1e9dc" />
            <stop offset="1" stopColor="#c7baaa" />
          </linearGradient>
          <linearGradient id="console-bed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8ab9c" />
            <stop offset="1" stopColor="#8e8378" />
          </linearGradient>
          <radialGradient id="console-wheel" cx="35%" cy="28%">
            <stop offset="0" stopColor="#4d5057" />
            <stop offset="0.62" stopColor="#24262c" />
            <stop offset="1" stopColor="#101115" />
          </radialGradient>
          <filter id="console-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#514638" floodOpacity=".24" />
          </filter>
        </defs>
        <ellipse cx="348" cy="420" rx="252" ry="34" fill="#584d42" opacity=".16" />
        <g filter="url(#console-shadow)">
          <path d="M83 163 Q83 129 117 120 L576 120 Q612 129 612 163 L630 346 Q630 379 596 390 L103 390 Q69 379 69 346Z" fill="url(#console-shell)" stroke="#8d8172" strokeWidth="3" />
          <path d="M104 171 Q104 147 130 143 L561 143 Q589 148 589 171 L603 329 Q603 354 579 361 L117 361 Q94 354 94 329Z" fill="url(#console-bed)" stroke="#73695e" strokeWidth="3" />
          <path d="M205 158 L488 158 L504 249 L189 249Z" fill="#34373a" stroke="#111216" strokeWidth="6" />
          <path d="M217 168 L476 168 L489 238 L204 238Z" fill="#151d1e" />
          <text x="223" y="188" fill={copy.color} fontFamily="monospace" fontSize="12" letterSpacing="3">{copy.channel}</text>
          <text x="223" y="217" fill="#f7f0e5" fontFamily="monospace" fontSize="25" fontWeight="600">{mode}</text>
          <path d="M417 221 L468 221" stroke={copy.color} strokeWidth="4" strokeLinecap="round" />
          <g transform="translate(0 0)">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const x = 137 + (index % 3) * 26;
              const y = 237 + Math.floor(index / 3) * 25;
              const selected = CONSOLE_MODES[index] === mode;
              return <rect key={index} x={x} y={y} width="16" height="16" rx="4" fill={selected ? copy.color : "#4c4a48"} stroke="#211f1d" strokeWidth="2" />;
            })}
          </g>
          <path d="M517 230 L535 326" stroke="#36363a" strokeWidth="16" strokeLinecap="round" />
          <path d="M517 230 L535 326" stroke="#1a1b1f" strokeWidth="7" strokeLinecap="round" />
          <circle cx="529" cy="286" r="14" fill="#d8cabb" stroke="#49453f" strokeWidth="4" />
          <g transform={`rotate(${turns * 24} 348 317)`}>
            <circle cx="348" cy="317" r="102" fill="#131419" stroke="#aa9e8e" strokeWidth="11" />
            <circle cx="348" cy="317" r="81" fill="url(#console-wheel)" stroke="#505158" strokeWidth="9" />
            {Array.from({ length: 12 }, (_, index) => {
              const angle = (index / 12) * Math.PI * 2;
              const x = 348 + Math.cos(angle) * 72;
              const y = 317 + Math.sin(angle) * 72;
              return <rect key={index} x={x - 3} y={y - 10} width="6" height="20" rx="2" fill="#c8bcaa" transform={`rotate(${(index * 360) / 12 + 90} ${x} ${y})`} />;
            })}
            <circle cx="348" cy="317" r="53" fill="#7e776d" stroke="#ded4c4" strokeWidth="4" />
            <circle cx="348" cy="317" r="39" fill="#2a2c30" />
            <path d="M348 274 L356 295 L348 303 L340 295Z" fill={copy.color} />
          </g>
          <circle cx="514" cy="339" r="25" fill="#2a2c31" stroke="#a79b8b" strokeWidth="5" />
          <circle cx="514" cy="339" r="12" fill="#d5cab8" />
          <circle cx="552" cy="183" r="7" fill={copy.color} />
          <circle cx="570" cy="183" r="7" fill="#8b8479" />
          <path d="M108 145 L129 145" stroke="#595149" strokeWidth="5" strokeLinecap="round" />
          <path d="M556 145 L577 145" stroke="#595149" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
      <button type="button" className={styles.fallbackWheel} onClick={advance} aria-label={`Turn central control wheel. Current mode ${mode}.`} />
      <div className={styles.fallbackPads}>
        {CONSOLE_MODES.map((next) => (
          <button key={next} type="button" className={styles.fallbackPad} onClick={() => setMode(next)} aria-label={`Select ${next} mode`} />
        ))}
      </div>
      <span className="vs-sr-only" aria-live="polite">{mode}. {copy.note}</span>
    </div>
  );
}
