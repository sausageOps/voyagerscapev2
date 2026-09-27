"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import type { RecordingState, AudioPlaybackState } from "@/lib/ui-store";
import styles from "./Camera.module.css";

export type CameraStatus = "idle" | "rec" | "wait" | "play" | "err";

interface CameraProps {
  recordingState: RecordingState;
  playbackState: AudioPlaybackState;
  /** 0–1 live level, drives the status strip while recording/playing. */
  level: number;
  onShutter: () => void;
}

/** Screen-reader wording only — never rendered onto the object. */
const STATUS_TEXT: Record<CameraStatus, string> = {
  idle: "Idle",
  rec: "Recording",
  wait: "Encoding",
  play: "Playing back",
  err: "No input",
};

/** Lit segments on the abstract readout, per state. */
const SEGMENTS: Record<CameraStatus, number> = { idle: 1, rec: 4, wait: 2, play: 3, err: 1 };

function resolveStatus(r: RecordingState, p: AudioPlaybackState): CameraStatus {
  if (p === "playing") return "play";
  if (r === "recording") return "rec";
  if (r === "processing" || r === "submitting") return "wait";
  if (r === "error") return "err";
  return "idle";
}

/**
 * Voyagerscape's observation device.
 *
 * An original compact camera built as layered SVG: moulded two-tone body,
 * knurled dials, a multi-element lens with a pointer-tracked specular, a
 * physical shutter that depresses, and a hanging strap.
 *
 * The object carries NO typography — state is communicated purely through
 * lamps, segments and tick marks. Pointer response is layered: the shell
 * leads, the lens parallaxes a little further, the specular reacts fastest
 * and the contact shadow drifts the opposite way, slowest.
 */
export default function Camera({ recordingState, playbackState, level, onShutter }: CameraProps) {
  const status = resolveStatus(recordingState, playbackState);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const shutterRef = useRef<SVGGElement | null>(null);
  const lensRef = useRef<SVGGElement | null>(null);
  const shadowRef = useRef<SVGGElement | null>(null);
  const specRef = useRef<SVGGElement | null>(null);
  const irisRef = useRef<SVGCircleElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const [frames, setFrames] = useState(1);

  /* Idle float + layered pointer parallax (body / lens / specular / shadow) */
  useEffect(() => {
    const stage = stageRef.current;
    const floatEl = floatRef.current;
    const spec = specRef.current;
    const lens = lensRef.current;
    const shadow = shadowRef.current;
    if (!stage || !floatEl || !spec || !lens || !shadow) return;
    if (prefersReducedMotion()) return;
    // Pointer parallax is a fine-pointer affordance only; touch keeps the float.
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const ctx = gsap.context(() => {
      gsap.to(floatEl, {
        y: -7,
        rotate: 0.4,
        duration: 5.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }, stage);

    if (!finePointer) return () => ctx.revert();

    // Each layer has its own travel and settle time — that difference is what
    // reads as depth. Total shell movement stays inside ~13px.
    const tiltX = gsap.quickTo(stage, "--tilt-x", { duration: 0.9, ease: "power3.out" });
    const tiltY = gsap.quickTo(stage, "--tilt-y", { duration: 0.9, ease: "power3.out" });
    const rot = gsap.quickTo(stage, "--tilt-r", { duration: 1.1, ease: "power3.out" });
    const lensX = gsap.quickTo(lens, "x", { duration: 0.62, ease: "power3.out" });
    const lensY = gsap.quickTo(lens, "y", { duration: 0.62, ease: "power3.out" });
    const specX = gsap.quickTo(spec, "x", { duration: 0.38, ease: "power2.out" });
    const specY = gsap.quickTo(spec, "y", { duration: 0.38, ease: "power2.out" });
    const shadX = gsap.quickTo(shadow, "x", { duration: 1.25, ease: "power2.out" });
    const shadY = gsap.quickTo(shadow, "y", { duration: 1.25, ease: "power2.out" });
    const strapEl = stage.querySelector<SVGGElement>(`.${styles.strap}`);
    // the strap is soft goods: it lags everything else
    const strapX = strapEl ? gsap.quickTo(strapEl, "x", { duration: 1.5, ease: "power2.out" }) : null;
    const strapRot = strapEl ? gsap.quickTo(strapEl, "rotate", { duration: 1.7, ease: "power2.out" }) : null;

    const clamp = gsap.utils.clamp(-1, 1);

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = clamp((event.clientX - cx) / (rect.width * 0.75));
      const ny = clamp((event.clientY - cy) / (rect.height * 0.75));

      // Falloff: full response near the object, easing to neutral as the
      // pointer leaves it — so the camera settles instead of tracking forever.
      const reach = Math.max(rect.width, rect.height) * 1.35;
      const dist = Math.hypot(event.clientX - cx, event.clientY - cy);
      const near = gsap.utils.clamp(0, 1, 1 - dist / reach);
      const f = near * near * (3 - 2 * near); // smoothstep

      tiltX(nx * 10 * f);
      tiltY(ny * 7 * f);
      rot(nx * 0.9 * f);
      lensX(nx * 3.4 * f);
      lensY(ny * 2.6 * f);
      // the highlight slides across the glass, opposite to the viewing angle
      specX(nx * -13 * f);
      specY(ny * -9 * f);
      // the cast shadow lags and drifts the other way
      shadX(nx * -5 * f);
      shadY(ny * -2.5 * f);
      strapX?.(nx * 4.5 * f);
      strapRot?.(nx * 1.4 * f);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      ctx.revert();
    };
  }, []);

  /* Iris breathes very slightly while the message system is live */
  useEffect(() => {
    const iris = irisRef.current;
    if (!iris) return;
    const active = status === "rec" || status === "play";
    if (!active || prefersReducedMotion()) {
      gsap.to(iris, { attr: { r: 15 }, duration: 0.5, ease: "power2.out" });
      return;
    }
    const tween = gsap.to(iris, {
      attr: { r: 12.4 },
      duration: 1.5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, [status]);

  /* Shutter: the button depresses, the shell drops and tilts, the iris blinks */
  const fire = useCallback(() => {
    setFrames((n) => (n % 12) + 1);
    onShutter();
    if (prefersReducedMotion()) return;
    const shutter = shutterRef.current;
    const body = bodyRef.current;
    const iris = irisRef.current;
    const ring = ringRef.current;
    const shadow = shadowRef.current;
    if (!shutter || !body || !iris || !ring || !shadow) return;

    gsap
      .timeline()
      .to(shutter, { y: 3.4, duration: 0.07, ease: "power2.out" }, 0)
      .to(body, { y: 2, rotate: 0.35, duration: 0.09, ease: "power2.out" }, 0)
      // shadow tightens as the object settles towards the surface
      .to(shadow, { scaleX: 0.94, opacity: 0.78, duration: 0.09, ease: "power2.out" }, 0)
      .to(iris, { attr: { r: 4 }, duration: 0.09, ease: "power2.in" }, 0)
      .fromTo(
        ring,
        { attr: { r: 44 }, opacity: 0.45 },
        { attr: { r: 58 }, opacity: 0, duration: 0.55, ease: "power2.out" },
        0.02,
      )
      .to(shutter, { y: 0, duration: 0.42, ease: "elastic.out(1, 0.55)" }, 0.1)
      .to(body, { y: 0, rotate: 0, duration: 0.55, ease: "elastic.out(1, 0.5)" }, 0.1)
      .to(shadow, { scaleX: 1, opacity: 1, duration: 0.5, ease: "power2.out" }, 0.1)
      .to(iris, { attr: { r: 15 }, duration: 0.42, ease: "power3.out" }, 0.12);
  }, [onShutter]);

  const meter = Math.max(0.06, status === "rec" || status === "play" ? level : 0.06);
  const segments = SEGMENTS[status];

  return (
    <div className={styles.stage} ref={stageRef} data-status={status}>
      <div className={styles.float} ref={floatRef}>
        <button
          type="button"
          className={styles.hit}
          onClick={fire}
          data-cursor="camera"
          data-cursor-label="Look"
          aria-label="Observation device — press the shutter"
        >
          <svg className={styles.svg} viewBox="0 0 340 300" role="img" aria-hidden="true" focusable="false">
            <defs>
              {/* ---- body materials ---- */}
              <linearGradient id="vsCamTop" x1="0.1" y1="0" x2="0.85" y2="1">
                <stop offset="0" stopColor="#fffdf9" />
                <stop offset="0.45" stopColor="#efe8dc" />
                <stop offset="1" stopColor="#cfc4b1" />
              </linearGradient>
              <linearGradient id="vsCamBody" x1="0.12" y1="0" x2="0.9" y2="1">
                <stop offset="0" stopColor="#f7f2e9" />
                <stop offset="0.38" stopColor="#e7dfd2" />
                <stop offset="0.74" stopColor="#d3c8b6" />
                <stop offset="1" stopColor="#b9ad98" />
              </linearGradient>
              <linearGradient id="vsCamPlate" x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0" stopColor="#3a3a38" />
                <stop offset="0.5" stopColor="#26262a" />
                <stop offset="1" stopColor="#141417" />
              </linearGradient>
              <linearGradient id="vsCamEdge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.08" />
                <stop offset="1" stopColor="#8b8070" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="vsCamShutter" x1="0.2" y1="0" x2="0.8" y2="1">
                <stop offset="0" stopColor="#ffd9f3" />
                <stop offset="0.45" stopColor="#f1b8e4" />
                <stop offset="1" stopColor="#cf88c0" />
              </linearGradient>
              <linearGradient id="vsCamDial" x1="0.15" y1="0" x2="0.85" y2="1">
                <stop offset="0" stopColor="#fbf7f0" />
                <stop offset="0.55" stopColor="#ddd3c3" />
                <stop offset="1" stopColor="#aa9f8c" />
              </linearGradient>

              {/* ---- lens materials ---- */}
              <linearGradient id="vsBarrel" x1="0.1" y1="0" x2="0.9" y2="1">
                <stop offset="0" stopColor="#5d5d62" />
                <stop offset="0.28" stopColor="#3a3a40" />
                <stop offset="0.62" stopColor="#1e1e22" />
                <stop offset="1" stopColor="#47474d" />
              </linearGradient>
              <radialGradient id="vsGlass" cx="0.38" cy="0.3" r="0.82">
                <stop offset="0" stopColor="#4c5f74" />
                <stop offset="0.38" stopColor="#25303f" />
                <stop offset="0.76" stopColor="#121820" />
                <stop offset="1" stopColor="#0a0d12" />
              </radialGradient>
              <radialGradient id="vsCoating" cx="0.7" cy="0.75" r="0.6">
                <stop offset="0" stopColor="#b98fd8" stopOpacity="0.5" />
                <stop offset="0.55" stopColor="#6f8fd0" stopOpacity="0.16" />
                <stop offset="1" stopColor="#6f8fd0" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="vsSpec" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.25" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="vsGloss" cx="0.32" cy="0.14" r="0.8">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="vsCamCore" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#6d6455" stopOpacity="0.16" />
                <stop offset="0.55" stopColor="#6d6455" stopOpacity="0.05" />
                <stop offset="1" stopColor="#4e453a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="vsCamContact" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#6b6152" stopOpacity="0.1" />
                <stop offset="1" stopColor="#6b6152" stopOpacity="0" />
              </radialGradient>

              {/* No cast shadow: the object is defined by its own edges and
                  a whisper of contact tone. */}
              <filter id="vsCamGrain" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" result="n" />
                <feColorMatrix
                  in="n"
                  type="matrix"
                  values="0 0 0 0 0.34 0 0 0 0 0.31 0 0 0 0 0.26 0 0 0 0.5 0"
                />
              </filter>
              <filter id="vsLensBlur" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.4" />
              </filter>

              {/* One continuous moulded silhouette — the prism hump is part
                  of the shell, not a pasted-on box. Slightly asymmetric. */}
              <path
                id="vsCamBodyPath"
                d="M40 116
                   C 40 92 48 84 72 82
                   C 86 80.8 98 80.2 106 79.8
                   C 110 60 118 53.5 136 53
                   C 150 52.5 164 52.5 176 53
                   C 192 53.6 198 60 202 79
                   C 230 80 256 81 268 82
                   C 292 84 300 92 300 116
                   C 300.4 154 300 202 298 222
                   C 296 242 286 248.6 262 249.8
                   C 210 252 130 252 78 249.8
                   C 54 248.6 44 242 42 222
                   C 40 202 39.6 154 40 116 Z"
              />
              <clipPath id="vsCamClip">
                <use href="#vsCamBodyPath" />
              </clipPath>
              <clipPath id="vsLensClip">
                <circle cx="148" cy="176" r="52" />
              </clipPath>
              <clipPath id="vsScreenClip">
                <rect x="226" y="190" width="52" height="36" rx="8" />
              </clipPath>
            </defs>

            {/* Grounding: a broad soft pool plus a tighter core directly under
                the shell, on their own layer so they can drift and compress. */}
            <g ref={shadowRef} className={styles.shadow}>
              <ellipse cx="170" cy="266" rx="118" ry="13" fill="url(#vsCamContact)" opacity="0.6" />
              <ellipse cx="170" cy="256" rx="76" ry="7" fill="url(#vsCamCore)" />
            </g>

            {/* Woven strap, hung from the left lug and passing behind the shell */}
            <g className={styles.strap}>
              <path
                d="M52 104 C 30 130 22 168 26 200 C 29 226 36 244 46 254"
                fill="none"
                stroke="#b5a48c"
                strokeWidth="11"
                strokeLinecap="round"
              />
              <path
                d="M52 104 C 30 130 22 168 26 200 C 29 226 36 244 46 254"
                fill="none"
                stroke="#cbbda6"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M52 104 C 30 130 22 168 26 200 C 29 226 36 244 46 254"
                fill="none"
                stroke="#8d7f68"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray="0.6 7"
                opacity="0.45"
              />
              <path
                d="M52 104 C 30 130 22 168 26 200 C 29 226 36 244 46 254"
                fill="none"
                stroke="#fffdf8"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.35"
              />
              {/* leather keeper + tag */}
              <g transform="rotate(-6 27 192)">
                <rect x="16.5" y="184" width="21" height="15" rx="5" fill="#5d5346" />
                <rect x="18" y="185.6" width="18" height="4" rx="2" fill="#fff" opacity="0.2" />
                <rect x="18" y="195" width="18" height="2" rx="1" fill="#000" opacity="0.25" />
              </g>
            </g>

            <g ref={bodyRef}>
              {/* ---- main body ---- */}
              <use href="#vsCamBodyPath" fill="url(#vsCamBody)" />
              <g clipPath="url(#vsCamClip)">
                <rect x="0" y="0" width="340" height="300" fill="url(#vsGloss)" />
                <rect
                  x="0"
                  y="0"
                  width="340"
                  height="300"
                  filter="url(#vsCamGrain)"
                  opacity="0.19"
                  style={{ mixBlendMode: "multiply" }}
                />
                {/* moulded leatherette front, inset from the ivory deck */}
                <path
                  d="M40 122 L300 122 L300 222 C 298 242 288 248.6 264 249.8 L 76 249.8
                     C 52 248.6 44 242 42 222 Z"
                  fill="url(#vsCamPlate)"
                />
                <rect x="40" y="122" width="260" height="2.4" fill="#ffffff" opacity="0.55" />
                <rect x="40" y="124.4" width="260" height="1.4" fill="#000" opacity="0.35" />
                <rect x="40" y="112" width="260" height="10" fill="#8d8271" opacity="0.18" />
                {/* fine leather grain */}
                <g opacity="0.032">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <rect key={i} x="40" y={134 + i * 14} width="260" height="1" fill="#fff" />
                  ))}
                </g>
                {/* narrow moulded grip at the extreme right edge, clear of the panels */}
                <g>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <rect
                      key={i}
                      x={291 - i * 5}
                      y="138"
                      width="2.4"
                      height="96"
                      rx="1.2"
                      fill="#0b0b0e"
                      opacity="0.55"
                    />
                  ))}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <rect
                      key={`h${i}`}
                      x={293.4 - i * 5}
                      y="138"
                      width="0.9"
                      height="96"
                      rx="0.45"
                      fill="#fff"
                      opacity="0.12"
                    />
                  ))}
                </g>
                {/* deck shading so the ivory reads as a curved top surface */}
                <rect x="40" y="82" width="260" height="40" fill="url(#vsCamTop)" opacity="0.55" />
              </g>
              <use href="#vsCamBodyPath" fill="none" stroke="url(#vsCamEdge)" strokeWidth="1.7" />

              {/* ---- hump window (rangefinder) ---- */}
              <rect x="120" y="60" width="62" height="15" rx="6" fill="#b4a794" opacity="0.6" />
              <rect x="121.5" y="61.4" width="59" height="12.2" rx="5" fill="#1b2027" />
              <rect x="124" y="63" width="30" height="4" rx="2" fill="#8fb3c9" opacity="0.3" />

              {/* ---- viewfinder window ---- */}
              <g className={styles.control} data-cursor="camera" data-cursor-label="Interact">
              <rect x="60" y="92" width="42" height="21" rx="6" fill="#bfb4a1" opacity="0.55" />
              <rect x="62" y="93.6" width="38" height="17.8" rx="5" fill="#1b2027" />
              <rect x="64" y="95" width="34" height="7" rx="3.5" fill="#8fb3c9" opacity="0.32" />
              <circle cx="114" cy="103" r="3.2" className={styles.tally} />
              </g>

              {/* ---- mode dial ---- */}
              <g className={styles.control} data-cursor="camera" data-cursor-label="Interact">
                <circle cx="228" cy="103.5" r="15.5" fill="#b7ab97" opacity="0.5" />
                <circle cx="228" cy="102" r="14" fill="url(#vsCamDial)" />
                <circle cx="228" cy="102" r="14" fill="none" stroke="#fff" strokeOpacity="0.7" />
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (i / 12) * Math.PI * 2;
                  const x = 228 + Math.cos(a) * 11.2;
                  const y = 102 + Math.sin(a) * 11.2;
                  return (
                    <rect
                      key={i}
                      x={x - 0.7}
                      y={y - 1.8}
                      width="1.4"
                      height="3.6"
                      rx="0.7"
                      fill="#8a7f6d"
                      opacity="0.7"
                      transform={`rotate(${(i / 12) * 360} ${x} ${y})`}
                    />
                  );
                })}
                <rect x="227.1" y="91.5" width="1.8" height="6" rx="0.9" fill="#2c2c2e" />
              </g>

              {/* ---- shutter button, seated in a machined collar ---- */}
              <g
                ref={shutterRef}
                className={styles.shutter}
                data-cursor="camera"
                data-cursor-label="Click"
              >
                <circle cx="266" cy="103" r="13" fill="#9c917e" opacity="0.45" />
                <circle cx="266" cy="102" r="12" fill="url(#vsCamDial)" />
                <circle cx="266" cy="102" r="12" fill="none" stroke="#fff" strokeOpacity="0.6" />
                <circle cx="266" cy="100.6" r="8.6" fill="url(#vsCamShutter)" />
                <circle cx="266" cy="100.6" r="8.6" fill="none" stroke="#fff" strokeOpacity="0.55" />
                <ellipse cx="263.6" cy="97.6" rx="4.4" ry="2.6" fill="#fff" opacity="0.45" />
              </g>

              {/* ---- lens assembly (parallaxes slightly further than the shell) ---- */}
              <g ref={lensRef} className={styles.lens}>
                {/* shutter flash ring */}
                <circle
                  ref={ringRef}
                  cx="148"
                  cy="176"
                  r="44"
                  fill="none"
                  stroke="#f1b8e4"
                  strokeWidth="2"
                  opacity="0"
                />
                {/* mount + barrel */}
                <circle cx="148" cy="176" r="60" fill="#0f0f12" opacity="0.28" />
                <circle cx="148" cy="176" r="57" fill="url(#vsBarrel)" />
                <circle cx="148" cy="176" r="57" fill="none" stroke="#fff" strokeOpacity="0.28" />
                {/* knurled focus ring */}
                <g opacity="0.85">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const a = (i / 48) * Math.PI * 2;
                    return (
                      <rect
                        key={i}
                        x={148 + Math.cos(a) * 52 - 0.7}
                        y={176 + Math.sin(a) * 52 - 2.6}
                        width="1.4"
                        height="5.2"
                        rx="0.7"
                        fill={i % 2 ? "#6e6e76" : "#191920"}
                        transform={`rotate(${(i / 48) * 360} ${148 + Math.cos(a) * 52} ${176 + Math.sin(a) * 52})`}
                      />
                    );
                  })}
                </g>
                <circle cx="148" cy="176" r="47" fill="#2a2a30" />
                <circle cx="148" cy="176" r="47" fill="none" stroke="#fff" strokeOpacity="0.16" />
                <circle cx="148" cy="176" r="41" fill="#111116" />

                {/* glass */}
                <g clipPath="url(#vsLensClip)">
                  <circle cx="148" cy="176" r="39" fill="url(#vsGlass)" />
                  <circle cx="148" cy="176" r="39" fill="url(#vsCoating)" />
                  {/* iris */}
                  <circle ref={irisRef} cx="148" cy="176" r="15" fill="#05070a" />
                  <circle cx="148" cy="176" r="15" fill="none" stroke="#7f93ad" strokeOpacity="0.28" />
                  {/* aperture blade facets */}
                  <g opacity="0.3">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const a = (i / 7) * Math.PI * 2;
                      return (
                        <line
                          key={i}
                          x1={148 + Math.cos(a) * 16}
                          y1={176 + Math.sin(a) * 16}
                          x2={148 + Math.cos(a) * 31}
                          y2={176 + Math.sin(a) * 31}
                          stroke="#8fa6c2"
                          strokeWidth="0.8"
                        />
                      );
                    })}
                  </g>
                  {/* pointer-tracked specular */}
                  <g ref={specRef} className={styles.spec}>
                    <ellipse
                      cx="130"
                      cy="156"
                      rx="18"
                      ry="11"
                      fill="url(#vsSpec)"
                      transform="rotate(-28 130 156)"
                    />
                    <ellipse
                      cx="168"
                      cy="200"
                      rx="9"
                      ry="5"
                      fill="#cfe3ff"
                      opacity="0.18"
                      filter="url(#vsLensBlur)"
                    />
                  </g>
                  {/* faint secondary internal reflection, opposite the specular */}
                  <ellipse
                    cx="166"
                    cy="192"
                    rx="22"
                    ry="15"
                    fill="#6f86a8"
                    opacity="0.1"
                    filter="url(#vsLensBlur)"
                    transform="rotate(-28 166 192)"
                  />
                  {/* curvature falloff + rim light along the lower edge */}
                  <circle cx="148" cy="176" r="39" fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="6" />
                  <path
                    d="M112 196 A 39 39 0 0 0 184 196"
                    fill="none"
                    stroke="#9fc4e8"
                    strokeOpacity="0.4"
                    strokeWidth="2.2"
                    filter="url(#vsLensBlur)"
                  />
                  <path
                    d="M118 152 A 39 39 0 0 1 150 138"
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.5"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
                <circle cx="148" cy="176" r="39.5" fill="none" stroke="#fff" strokeOpacity="0.12" />
              </g>

              {/* ---- status readout: segments and a level bar, no glyphs ---- */}
              <rect x="224" y="188" width="56" height="40" rx="10" fill="#000" opacity="0.45" />
              <rect x="226" y="190" width="52" height="36" rx="8" fill="#0d1416" />
              <rect x="226" y="190" width="52" height="36" rx="8" fill="none" stroke="#fff" strokeOpacity="0.07" />
              <g clipPath="url(#vsScreenClip)">
                {/* four state segments — how many are lit is the message */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <rect
                    key={i}
                    x={233 + i * 10}
                    y="198"
                    width="7"
                    height="7"
                    rx="1.6"
                    fill="#8ff0c4"
                    opacity={i < segments ? 0.85 : 0.13}
                    className={styles.segment}
                  />
                ))}
                {/* level bar */}
                <rect x="233" y="211" width="38" height="3.4" rx="1.7" fill="#8ff0c4" opacity="0.12" />
                <rect
                  x="233"
                  y="211"
                  width={38 * meter}
                  height="3.4"
                  rx="1.7"
                  fill="#8ff0c4"
                  opacity="0.72"
                  className={styles.meter}
                />
                {/* two inert marker dots */}
                <circle cx="234.6" cy="219.5" r="1.3" fill="#8ff0c4" opacity="0.4" />
                <circle cx="239.6" cy="219.5" r="1.3" fill="#8ff0c4" opacity="0.18" />
                <rect x="226" y="190" width="52" height="36" fill="url(#vsGloss)" opacity="0.16" />
              </g>

              {/* ---- frame indicator: recessed tick marks, no numerals ---- */}
              <g>
                <rect x="224" y="150" width="56" height="24" rx="8" fill="#000" opacity="0.42" />
                <rect x="226" y="152" width="52" height="20" rx="6" fill="#16161a" />
                <rect x="226" y="152" width="52" height="20" rx="6" fill="none" stroke="#fff" strokeOpacity="0.08" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <rect
                    key={i}
                    x={231 + i * 3.7}
                    y={i % 3 === 0 ? 156 : 158.5}
                    width="1.6"
                    height={i % 3 === 0 ? 12 : 7}
                    rx="0.8"
                    fill={i < frames ? "#f6efe2" : "#cdc6ba"}
                    opacity={i < frames ? 0.92 : 0.14}
                    className={styles.tick}
                  />
                ))}
              </g>

              {/* ---- bottom-left: deliberately blank shell, two recessed screws ---- */}
              <g opacity="0.5">
                <circle cx="62" cy="238" r="2.6" fill="#000" opacity="0.45" />
                <circle cx="62" cy="237.4" r="2.2" fill="#6b6459" />
                <rect x="60.3" y="236.6" width="3.4" height="1" rx="0.5" fill="#000" opacity="0.5" />
                <circle cx="76" cy="238" r="2.6" fill="#000" opacity="0.45" />
                <circle cx="76" cy="237.4" r="2.2" fill="#6b6459" />
                <rect x="74.6" y="235.9" width="1" height="3.2" rx="0.5" fill="#000" opacity="0.5" />
              </g>

              {/* ---- strap lugs ---- */}
              <rect x="44" y="98" width="15" height="8" rx="4" fill="#cfc4b1" stroke="#8d8271" strokeOpacity="0.55" />
              <rect x="45.5" y="99.2" width="12" height="2.6" rx="1.3" fill="#fff" opacity="0.6" />
              <rect x="283" y="98" width="15" height="8" rx="4" fill="#cfc4b1" stroke="#8d8271" strokeOpacity="0.55" />
              <rect x="284.5" y="99.2" width="12" height="2.6" rx="1.3" fill="#fff" opacity="0.6" />
            </g>
          </svg>
        </button>
      </div>
      <span className="vs-sr-only" aria-live="polite">
        Device status: {STATUS_TEXT[status]}
      </span>
    </div>
  );
}
