"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ROUTES, isRouteActive } from "@/lib/routes";
import NavGlassSurface from "./NavGlassSurface";
import styles from "./NavMenu.module.css";

export default function NavMenu({ id }: { id?: string }) {
  const pathname = usePathname();

  return (
    <nav
      id={id}
      className={styles.nav}
      aria-label="Primary"
    >
      <NavGlassSurface
        height="var(--header-control-height)"
        borderRadius={9999}
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
