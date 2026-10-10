"use client";

/*
 * Ported from Giats `src/components/canvas/background/Background.jsx`.
 *
 * Unchanged: shader program, uniform names and values for offsets, line
 * blur, noise, plane resolution, background scale, the offset ping-pong
 * motion (updateOffset), and the per-frame time step.
 *
 * Adapted for Voyagerscape:
 *   - imports are relative and typed (TypeScript, no `@src` alias);
 *   - `useWindowSize` comes from a local hook (the source used
 *     `@darkroom.engineering/hamo`, which Voyagerscape does not install);
 *   - the three colour uniforms (uColor1..3) follow the Day/Night surface
 *     tokens from styles/globals.css. The shader itself is not touched.
 */

import * as THREE from "three";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";

import fragmentShader from "./shaders/fragmentShader";
import vertexShader from "./shaders/vertexShader";

const OFFSET_STEP = 0.00005;
const OFFSET_MAX = 5.0;
const OFFSET_MIN = 0.1;

/* Colour uniforms, as RGB 0–1. uColor1 = base ground, uColor2 = deep ground,
   uColor3 = subsurface. Both themes use the --vs-bg / --vs-bg-deep /
   --vs-bg-sub token values from globals.css (Night: warm charcoal). The
   values are repeated here because uniforms cannot read CSS variables. */
const hex = (value: string): [number, number, number] => {
  const n = parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const PALETTE_DAY = [hex("#f5f0e8"), hex("#efe8dd"), hex("#eae4d9")] as const;
const PALETTE_NIGHT = [hex("#292824"), hex("#34322D"), hex("#403D36")] as const;

function useWindowSize() {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}

function updateOffset(
  uniform: { value: number },
  isIncreasing: { current: boolean },
  step: number,
  min: number,
  max: number,
) {
  if (uniform.value >= max && isIncreasing.current) {
    isIncreasing.current = false;
  } else if (uniform.value <= min && !isIncreasing.current) {
    isIncreasing.current = true;
  }

  uniform.value += isIncreasing.current ? step : -step;
}

/* `isDark` is a prop, not context: R3F renders children in its own reconciler,
   so DOM-tree providers (ThemeProvider) are not visible inside <Canvas>. */
export default function Background({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const windowSize = useWindowSize();
  const { viewport, invalidate } = useThree();

  const isOffsetXIncreasing = useRef(true);
  const isOffsetYIncreasing = useRef(true);

  const uniforms = useMemo(() => {
    // Colours are applied by the effect below, so the theme is not a dependency here.
    const [c1, c2, c3] = isDark ? PALETTE_NIGHT : PALETTE_DAY;
    return {
      uTime: { value: 0 },
      uColor1: { value: [...c1] },
      uColor2: { value: [...c2] },
      uColor3: { value: [...c3] },
      uColorAccent: { value: new THREE.Color(20.0, 20.0, 20.0) },
      uLinesBlur: { value: 0.49 },
      uNoise: { value: 0.02 },
      uOffsetX: { value: 0.34 },
      uOffsetY: { value: 0.0 },
      uLinesAmount: { value: 5.0 },
      uPlaneRes: { value: new THREE.Vector2(windowSize.width, windowSize.height) },
      uMouse2D: { value: new THREE.Vector2(1.0, 1.0) },
      uBackgroundScale: { value: 3.0 },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSize]);

  // Re-apply the palette whenever the theme or the material changes. Repaints on demand too.
  useEffect(() => {
    const materialUniforms = (ref.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    if (!materialUniforms) return;
    const [c1, c2, c3] = isDark ? PALETTE_NIGHT : PALETTE_DAY;
    materialUniforms.uColor1.value = [...c1];
    materialUniforms.uColor2.value = [...c2];
    materialUniforms.uColor3.value = [...c3];
    invalidate();
  }, [isDark, uniforms, invalidate]);

  useFrame((_state, delta) => {
    const material = ref.current?.material as THREE.ShaderMaterial | undefined;
    if (material && material.uniforms) {
      const materialUniforms = material.uniforms;
      materialUniforms.uTime.value += delta * 0.001;

      updateOffset(materialUniforms.uOffsetX, isOffsetXIncreasing, OFFSET_STEP, OFFSET_MIN, OFFSET_MAX);
      updateOffset(materialUniforms.uOffsetY, isOffsetYIncreasing, OFFSET_STEP, OFFSET_MIN, OFFSET_MAX);
    }
  });

  return (
    <mesh ref={ref}>
      <planeGeometry args={[viewport.width, viewport.height, 1, 1]} />
      <shaderMaterial
        attach="material"
        args={[
          {
            uniforms,
            vertexShader,
            fragmentShader,
          },
        ]}
      />
    </mesh>
  );
}
