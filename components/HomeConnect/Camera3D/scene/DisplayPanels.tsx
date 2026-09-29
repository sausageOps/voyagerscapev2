"use client";

import { Text } from "@react-three/drei";
import { COUNTER, FRONT_Z, PANEL, READOUT } from "../proportions";

interface DisplayPanelsProps {
  capture: boolean;
}

interface DisplaySpec {
  x: number;
  y: number;
  w: number;
  h: number;
  planeHeight: number;
  label: string;
  value: string;
}

const DISPLAY_INK = "#e0ebd9";
const DISPLAY_RULE = "#cddcc6";
const DISPLAY_FONT = "/fonts/jetbrains-mono/JetBrainsMono-Medium.woff2";
const DISPLAY_CHARACTERS = "MODE EXPLORE CAPTURE FOCUS READY LOCKED";

/*
 * These values mirror the last canvas layout, but only as world-space layout
 * constants. The glyphs themselves are rendered by Troika as SDF geometry,
 * not painted into a bitmap.
 */
const SOURCE_WIDTH = 512;
const LABEL_SOURCE_SIZE = 48;
const VALUE_SOURCE_SIZE = 56;
const TEXT_LEFT = 0.13;
const LABEL_CENTER = 0.29;
const VALUE_CENTER = 0.71;
const RULE_WIDTH = 0.74;
const TEXT_Z_OFFSET = 0.046;
const RULE_Z_OFFSET = 0.044;

function DisplayPanelText({
  x,
  y,
  w,
  h,
  planeHeight,
  label,
  value,
}: DisplaySpec) {
  const planeWidth = w * 0.86;
  const sourceHeight = SOURCE_WIDTH * (h / w);
  const worldPerSourcePixel = planeHeight / sourceHeight;
  const textX = x - planeWidth / 2 + planeWidth * TEXT_LEFT;
  const labelY = y + planeHeight * (0.5 - LABEL_CENTER);
  const valueY = y + planeHeight * (0.5 - VALUE_CENTER);
  const labelSize = LABEL_SOURCE_SIZE * worldPerSourcePixel;
  const valueSize = VALUE_SOURCE_SIZE * worldPerSourcePixel;
  const ruleWidth = planeWidth * RULE_WIDTH;
  const ruleHeight = worldPerSourcePixel * 2;

  return (
    <>
      <mesh
        position={[x, y, FRONT_Z + PANEL.proud + PANEL.thickness / 2 + RULE_Z_OFFSET]}
        renderOrder={4}
      >
        <planeGeometry args={[ruleWidth, ruleHeight]} />
        <meshBasicMaterial
          color={DISPLAY_RULE}
          transparent
          opacity={0.22}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Text
        anchorX="left"
        anchorY="middle"
        characters={DISPLAY_CHARACTERS}
        color={DISPLAY_INK}
        depthOffset={-1}
        fillOpacity={0.98}
        font={DISPLAY_FONT}
        fontSize={labelSize}
        fontWeight={500}
        letterSpacing={0}
        position={[textX, labelY, FRONT_Z + PANEL.proud + PANEL.thickness / 2 + TEXT_Z_OFFSET]}
        renderOrder={5}
        sdfGlyphSize={64}
        whiteSpace="nowrap"
      >
        {label}
      </Text>
      <Text
        anchorX="left"
        anchorY="middle"
        characters={DISPLAY_CHARACTERS}
        color={DISPLAY_INK}
        depthOffset={-1}
        fillOpacity={0.98}
        font={DISPLAY_FONT}
        fontSize={valueSize}
        fontWeight={500}
        letterSpacing={0}
        position={[textX, valueY, FRONT_Z + PANEL.proud + PANEL.thickness / 2 + TEXT_Z_OFFSET]}
        renderOrder={5}
        sdfGlyphSize={64}
        whiteSpace="nowrap"
      >
        {value}
      </Text>
    </>
  );
}

/**
 * Crisp optical readouts placed directly in the camera's existing recessed
 * panels. Troika's SDF glyphs stay resolution-independent as the camera
 * rotates, translates, and changes scale on screen.
 */
export default function DisplayPanels({ capture }: DisplayPanelsProps) {
  return (
    <>
      <DisplayPanelText
        x={COUNTER.x}
        y={COUNTER.y}
        w={COUNTER.w}
        h={COUNTER.h}
        planeHeight={COUNTER.h * 0.7}
        label="MODE"
        value={capture ? "CAPTURE" : "EXPLORE"}
      />
      <DisplayPanelText
        x={READOUT.x}
        y={READOUT.y}
        w={READOUT.w}
        h={READOUT.h}
        planeHeight={READOUT.h * 0.82}
        label="FOCUS"
        value={capture ? "LOCKED" : "READY"}
      />
    </>
  );
}
