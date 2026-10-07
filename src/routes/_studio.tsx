import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StudioPage } from "@/studio/studio-page";

/*
 * Every studio page (`/`, /astrology…, /human-design, /numerology,
 * /calendar, /calendrier) is a child of this layout, which holds the studio
 * itself. A page switch changes the child and keeps this route, so the studio
 * stays mounted (its sheet, menus and effects): as a component of each child,
 * every switch built it anew, the router's code splitting giving each path a
 * component of its own. Written here, the studio is split out of the first
 * script once. The children keep their search params, cache rules, heads and
 * the move of 1.x addresses (src/studio/studio-route.tsx).
 */
export const Route = createFileRoute("/_studio")({ component: StudioLayout });

function StudioLayout() {
  return (
    <>
      <StudioPage />
      {/* The children draw nothing of their own. */}
      <Outlet />
    </>
  );
}
