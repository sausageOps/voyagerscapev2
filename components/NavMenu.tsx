"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ROUTES, isRouteActive } from "@/lib/routes";
import GlassControl from "@/components/primitives/GlassControl";
import styles from "./NavMenu.module.css";

export default function NavMenu({ id }: { id?: string }) {
  const pathname = usePathname();

  return (
    <nav id={id} className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {NAV_ROUTES.map((route) => {
          const active = isRouteActive(route, pathname);
          return (
            <li key={route.command}>
              <GlassControl
                as={Link}
                href={route.href}
                size="md"
                variant={active ? "regular" : "clear"}
                active={active}
                className={styles.item}
                aria-current={active ? "page" : undefined}
                data-cursor="link"
                data-magnetic
              >
                <span className={styles.label} data-text={route.label}>
                  {route.label}
                </span>
              </GlassControl>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
