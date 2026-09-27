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
 * Header order is the array order: HOME · WORK · SERVICES · STORE.
 */
export const ROUTES: RouteDef[] = [
  // The Connect experience *is* the homepage, so /connect reads as Home.
  { label: "Home", href: "/", command: "home", ready: true, match: ["/connect"] },
  { label: "Work", href: "/work", command: "work", ready: false },
  { label: "Services", href: "/services", command: "services", ready: false },
  { label: "Store", href: "/store", command: "store", ready: false },
  // Kept so the `connect` command keeps working; not shown in the nav.
  { label: "Connect", href: "/", command: "connect", ready: true, nav: false },
];

/** Items shown in the header cluster, in order. */
export const NAV_ROUTES = ROUTES.filter((route) => route.nav !== false);

/** True when the current pathname should light this route up. */
export function isRouteActive(route: RouteDef, pathname: string): boolean {
  return route.href === pathname || (route.match?.includes(pathname) ?? false);
}
