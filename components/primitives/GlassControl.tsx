"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode,
} from "react";
import { attachGlassSpecular } from "@/lib/motion";
import styles from "./GlassControl.module.css";

type Variant = "clear" | "regular" | "solid" | "dark";
type Size = "sm" | "md" | "lg";

export interface GlassControlProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  as?: ElementType;
  variant?: Variant;
  size?: Size;
  active?: boolean;
  /** Disables the press-compression effect (for static surfaces). */
  inert?: boolean;
  children?: ReactNode;
  href?: string;
}

const variantClass: Record<Variant, string> = {
  clear: "vs-glass--clear",
  regular: "",
  solid: "vs-glass--solid",
  dark: "vs-glass--dark",
};

/**
 * The single Liquid Glass primitive: layered material + pointer specular +
 * active compression. Everything glassy in the site composes this.
 */
const GlassControl = forwardRef<HTMLButtonElement, GlassControlProps>(function GlassControl(
  { as, variant = "regular", size = "md", active, inert, className, children, ...rest },
  forwardedRef,
) {
  const Tag = (as ?? "button") as ElementType;
  const localRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    return attachGlassSpecular(el as HTMLElement);
  }, []);

  const classes = [
    "vs-glass",
    variantClass[variant],
    styles.control,
    styles[size],
    active ? styles.active : "",
    inert ? styles.inert : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      {...rest}
      ref={(node: HTMLElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node as HTMLButtonElement);
        else if (forwardedRef) forwardedRef.current = node as HTMLButtonElement;
      }}
      className={classes}
      data-active={active ? "true" : undefined}
    >
      <span className={styles.inner}>{children}</span>
    </Tag>
  );
});

export default GlassControl;
