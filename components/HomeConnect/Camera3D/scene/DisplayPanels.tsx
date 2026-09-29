"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { COUNTER, FRONT_Z, PANEL, READOUT } from "../proportions";

interface DisplayPanelsProps {
  capture: boolean;
}

interface DisplayTexture {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
}

const DISPLAY_INK = "rgba(224, 235, 217, 0.98)";
const DISPLAY_RULE = "rgba(205, 220, 198, 0.22)";

function makeDisplay(aspect: number): DisplayTexture {
  const canvas = document.createElement("canvas");
  // Keep the physical panels unchanged, but give their tiny type enough
  // source resolution to stay crisp after it is projected onto the camera.
  canvas.width = 512;
  canvas.height = Math.max(1, Math.round(canvas.width / aspect));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return { canvas, texture };
}

function paintDisplay(display: DisplayTexture, label: string, value: string) {
  const { canvas, texture } = display;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = DISPLAY_RULE;
  ctx.fillRect(w * 0.13, h * 0.5 - 1, w * 0.74, 2);

  ctx.fillStyle = DISPLAY_INK;
  // The source texture is twice the old resolution; these sizes render about
  // one third larger on the unchanged physical panel while staying compact.
  ctx.font = '600 48px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText(label, w * 0.13, h * 0.29);
  ctx.font = '600 56px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText(value, w * 0.13, h * 0.71);
  texture.needsUpdate = true;
}

/**
 * Tiny optical readouts painted onto the camera's existing recessed panels.
 * They stay in the WebGL scene — no HTML overlay, no extra layout, and no
 * per-frame work. A capture only repaints the two small canvas textures.
 */
export default function DisplayPanels({ capture }: DisplayPanelsProps) {
  const upper = useMemo(
    () => makeDisplay(COUNTER.w / COUNTER.h),
    [],
  );
  const lower = useMemo(
    () => makeDisplay(READOUT.w / READOUT.h),
    [],
  );

  useLayoutEffect(() => {
    paintDisplay(upper, "MODE", capture ? "CAPTURE" : "EXPLORE");
    paintDisplay(lower, "FOCUS", capture ? "LOCKED" : "READY");
  }, [capture, lower, upper]);

  useEffect(
    () => () => {
      upper.texture.dispose();
      lower.texture.dispose();
    },
    [lower, upper],
  );

  const panelFace = FRONT_Z + PANEL.proud + PANEL.thickness / 2;
  const upperGeometry = useMemo(
    () => new THREE.PlaneGeometry(COUNTER.w * 0.86, COUNTER.h * 0.7),
    [],
  );
  const lowerGeometry = useMemo(
    () => new THREE.PlaneGeometry(READOUT.w * 0.86, READOUT.h * 0.82),
    [],
  );

  useEffect(
    () => () => {
      upperGeometry.dispose();
      lowerGeometry.dispose();
    },
    [lowerGeometry, upperGeometry],
  );

  const upperMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: upper.texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [upper.texture],
  );
  const lowerMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: lower.texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [lower.texture],
  );

  useEffect(
    () => () => {
      upperMaterial.dispose();
      lowerMaterial.dispose();
    },
    [lowerMaterial, upperMaterial],
  );

  return (
    <>
      <mesh
        geometry={upperGeometry}
        material={upperMaterial}
        position={[COUNTER.x, COUNTER.y, panelFace + 0.041]}
        renderOrder={4}
      />
      <mesh
        geometry={lowerGeometry}
        material={lowerMaterial}
        position={[READOUT.x, READOUT.y, panelFace + 0.041]}
        renderOrder={4}
      />
    </>
  );
}
