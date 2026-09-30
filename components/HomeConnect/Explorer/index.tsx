"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import type { ExplorerState } from "./ExplorerCanvas";
import styles from "./Explorer.module.css";

const ExplorerCanvas = dynamic(() => import("./ExplorerCanvas"), { ssr: false, loading: () => null });

const LABELS: Record<ExplorerState, string> = {
  idle: "Idle · tap to observe",
  scanning: "Scanning field",
  found: "Signal found",
  ready: "Ready · tap to observe",
};

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function ExplorerFallback({ mode }: { mode: ExplorerState }) {
  const active = mode === "scanning";
  return (
    <svg className={styles.fallback} viewBox="0 0 640 440" role="img" aria-label="Voyagerscape Explorer observation instrument">
      <defs>
        <linearGradient id="exBody" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f7edda"/><stop offset="1" stopColor="#d8ccb5"/></linearGradient>
        <radialGradient id="exGlass" cx="35%" cy="28%"><stop stopColor="#7590a5"/><stop offset=".35" stopColor="#202d3b"/><stop offset="1" stopColor="#090d12"/></radialGradient>
        <filter id="exShadow" x="-30%" y="-50%" width="160%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
      </defs>
      <ellipse cx="317" cy="365" rx="205" ry="22" fill="#786c59" opacity=".12" filter="url(#exShadow)"/>
      <g transform="rotate(-2 320 225)">
        <rect x="108" y="128" width="430" height="194" rx="35" fill="url(#exBody)" stroke="#b7ab96" strokeWidth="2"/>
        <rect x="383" y="155" width="123" height="78" rx="14" fill="#343333"/>
        <rect x="395" y="167" width="99" height="54" rx="5" fill="#17201d"/>
        <text x="405" y="188" fill="#dcebd8" fontFamily="monospace" fontSize="9">VS / FIELD 01</text>
        <text x="405" y="207" fill="#dcebd8" fontFamily="monospace" fontWeight="bold" fontSize="12">{mode === "idle" ? "LOOK CLOSER" : mode === "scanning" ? "SCANNING" : mode === "found" ? "SIGNAL FOUND" : "READY"}</text>
        <rect x="405" y="213" width={active ? 65 : mode === "idle" ? 25 : 80} height="3" fill={active ? "#e7c963" : mode === "idle" ? "#9faaa0" : "#78d2a5"}/>
        <rect x="508" y="145" width="42" height="155" rx="15" fill="#f5ead6"/>
        <g transform="translate(233 225)">
          <circle r="105" fill="#777064"/>
          <circle r="91" fill="#222226"/>
          <circle r="80" fill="none" stroke="#b6ad9e" strokeWidth="18" strokeDasharray="8 5"/>
          <circle r="61" fill="none" stroke="#cbbcff" strokeWidth="5"/>
          <circle r="55" fill="url(#exGlass)"/>
          <ellipse cx="-16" cy="-18" rx="21" ry="10" fill="#b8dcf0" opacity=".28" transform="rotate(-30)"/>
        </g>
        <circle cx="414" cy="269" r="25" fill="#222226"/>
        <path d="M414 251v10m0 16v10m-18-18h10m16 0h10" stroke="#d8ccff" strokeWidth="5" strokeLinecap="round"/>
        <circle cx="466" cy="269" r="14" fill="#efb7df"/>
        <path d="M464 126l8-75 18 2 1 76" fill="#25252a"/>
        <circle cx="481" cy="50" r="11" fill="#cbbcff"/>
        <circle cx="515" cy="177" r="5" fill={active ? "#e7bd51" : mode === "idle" ? "#8e877c" : "#52c58c"}/>
        <circle cx="515" cy="195" r="5" fill={mode === "found" || mode === "ready" ? "#52c58c" : "#716a60"}/>
        <rect x="280" y="316" width="122" height="20" rx="7" fill="#8d8578"/>
      </g>
    </svg>
  );
}

export default function Explorer({ onObserve }: { onObserve?: () => void }) {
  const [mode, setMode] = useState<ExplorerState>("idle");
  const [webgl, setWebgl] = useState(false);
  const [lost, setLost] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timers = useRef<number[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setWebgl(!connection?.saveData && supportsWebGL());
    return () => timers.current.forEach(window.clearTimeout);
  }, []);

  const observe = useCallback(() => {
    if (mode === "scanning") return;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setMode("scanning");
    onObserve?.();
    timers.current.push(window.setTimeout(() => setMode("found"), reduced ? 500 : 1450));
    timers.current.push(window.setTimeout(() => setMode("ready"), reduced ? 900 : 2600));
  }, [mode, onObserve, reduced]);

  const onMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }, []);

  return (
    <div className={styles.stage} data-state={mode}>
      <button
        type="button"
        className={styles.hit}
        onClick={observe}
        onPointerMove={onMove}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => { setHovered(false); pointer.current = { x: 0, y: 0 }; }}
        data-cursor="camera"
        data-cursor-label="Explore"
        aria-label="Voyagerscape Explorer. Activate observation scan."
      >
        <div className={styles.canvas} aria-hidden="true">
          {webgl && !lost ? (
            <ExplorerCanvas mode={mode} hovered={hovered} reducedMotion={reduced} pointer={pointer} onContextLost={() => setLost(true)} />
          ) : (
            <ExplorerFallback mode={mode} />
          )}
        </div>
      </button>
      <div className={styles.status} aria-hidden="true"><span className={styles.statusDot} />{LABELS[mode]}</div>
      <span className="vs-sr-only" aria-live="polite">Explorer status: {LABELS[mode]}</span>
    </div>
  );
}
