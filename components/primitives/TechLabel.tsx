import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type TechLabelProps = {
  as?: ElementType;
  nano?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"span">, "children" | "className">;

/** Tiny uppercase monospace label used throughout the technical UI. */
export default function TechLabel({ as, nano, className, children, ...rest }: TechLabelProps) {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag
      {...rest}
      className={["vs-tech", nano ? "vs-tech--nano" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
