export interface RouteDef {
  label: string;
  href: string;
  /** Terminal command alias. */
  command: string;
  ready: boolean;
  /** Extra pathnames that should read as this route (aliases). */
  match?: string[];
  /** Command-only routes (aliases) stay out of the header cluster. */
  nav?: boolean;
}

/**
 * Single registry consumed by the nav, the terminal and future pages.
 * Header order is the array order: HOME · ART · CONNECT · ABOUT.
 *
 * The destinations are four genuinely separate routes/pages:
 *   HOME    → /
 *   ART     → /art       (dedicated art / portfolio page)
 *   CONNECT → /connect   (dedicated connect / contact page)
 *   ABOUT   → /about     (dedicated about page)
 */
export const ROUTES: RouteDef[] = [
  { label: "Home", href: "/", command: "home", ready: true },
  { label: "Art", href: "/art", command: "art", ready: false },
  { label: "Connect", href: "/connect", command: "connect", ready: true },
  { label: "About", href: "/about", command: "about", ready: false },
];

/** Items shown in the header cluster, in order. */
export const NAV_ROUTES = ROUTES.filter((route) => route.nav !== false);

/** True when the current pathname should light this route up. */
export function isRouteActive(route: RouteDef, pathname: string): boolean {
  return route.href === pathname || (route.match?.includes(pathname) ?? false);
}
