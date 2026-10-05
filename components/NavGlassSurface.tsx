"use client";

import React from "react";
import styles from "./NavGlassSurface.module.css";

export interface NavGlassSurfaceProps {
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  contentPadding?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: "R" | "G" | "B";
  yChannel?: "R" | "G" | "B";
  mixBlendMode?: React.CSSProperties["mixBlendMode"];
  className?: string;
  style?: React.CSSProperties;
}

export default function NavGlassSurface({
  children,
  width = "auto",
  height = "auto",
  contentPadding = 5,
  borderRadius = 15,
  className = "",
  style = {},
}: NavGlassSurfaceProps) {
  const containerStyle = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    "--glass-content-padding":
      typeof contentPadding === "number" ? `${contentPadding}px` : contentPadding,
  } as React.CSSProperties;

  return (
    <div className={`${styles.surface} ${className}`} style={containerStyle}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
