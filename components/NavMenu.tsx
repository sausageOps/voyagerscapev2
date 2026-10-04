"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ROUTES, isRouteActive } from "@/lib/routes";
import { useNavPointerLight } from "@/lib/use-nav-pointer-light";
import NavGlassSurface from "./NavGlassSurface";
import reactiveStyles from "./ReactiveNavGlass.module.css";
import styles from "./NavMenu.module.css";

export default function NavMenu({ id }: { id?: string }) {
  const pathname = usePathname();
  const navRef = useNavPointerLight<HTMLElement>();

  return (
    <nav
      id={id}
      className={`${styles.nav} ${reactiveStyles.tracker}`}
      aria-label="Primary"
      ref={navRef}
    >
      <NavGlassSurface
        height="var(--header-control-height)"
        borderRadius={9999}
        borderWidth={0.08}
        brightness={62}
        opacity={0.9}
        blur={8}
        displace={0.2}
        backgroundOpacity={0.14}
        saturation={1.08}
        distortionScale={-76}
        redOffset={0}
        greenOffset={0}
        blueOffset={0}
        className={reactiveStyles.surface}
      >
        <ul className={styles.list}>
          {NAV_ROUTES.map((route) => {
            const active = isRouteActive(route, pathname);
            return (
              <li key={route.command}>
                <Link
                  href={route.href}
                  className={styles.item}
                  aria-current={active ? "page" : undefined}
                  data-cursor="link"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <span className={styles.label}>{route.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </NavGlassSurface>
    </nav>
  );
}
