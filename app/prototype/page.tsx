"use client";

import ColoniaPillPrototype from "@/components/ColoniaPillPrototype/ColoniaPillPrototype";

/**
 * Isolated prototype preview page.
 * Accessible at /prototype for testing and visual QA.
 * Does NOT interfere with the production navigation or routes.
 */
export default function PrototypePage() {
  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        gap: "48px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "600px" }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--vs-ink-faint)",
            marginBottom: "8px",
          }}
        >
          Experiment 01 — Standalone Prototype
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "32px",
            fontWeight: 400,
            marginBottom: "12px",
            color: "var(--vs-ink)",
          }}
        >
          Colonia-Style Solid Navigation Pill
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--vs-ink-soft)",
            lineHeight: 1.5,
          }}
        >
          High-contrast solid black capsule with integrated circular controls, high-contrast white typography, and zero glassmorphism / zero backdrop-filter.
        </p>
      </div>

      {/* Render the Colonia-Style Solid Pill Prototype */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <ColoniaPillPrototype />
      </div>
    </div>
  );
}
