import { createFileRoute, redirect } from "@tanstack/react-router";
import { studioRoute } from "@/studio/studio-route";
import { legacyStudioPath } from "@/studio/map";
import { parseStudioSearch, type StudioPage as StudioPageId } from "@/studio/url";

/*
 * The first screen (Astrology › Natal, or the page last used on this device).
 * A 1.x address (`/?studio=transits&view=table`) moves to its 2.0 path, its
 * other params kept, so old bookmarks and links still land on their page.
 */
export const Route = createFileRoute("/_studio/")({
  ...studioRoute(),
  // The 1.x `studio` param is read as written (`?studio=table` included), so it moves in one step.
  validateSearch: (search: Record<string, unknown>) => {
    if (typeof search.studio !== "string") return parseStudioSearch(search);
    const { studio: _old, ...rest } = search;
    return { ...parseStudioSearch(rest), studio: search.studio as StudioPageId };
  },
  beforeLoad: ({ location }) => {
    const search = location.search as Record<string, unknown>;
    const to = legacyStudioPath(search);
    if (!to) return;
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) {
      if (k === "studio" || k === "view" || v == null) continue;
      q.set(k, String(v));
    }
    if (to.view === "table") q.set("view", "table");
    const query = q.toString();
    throw redirect({ href: query ? `${to.path}?${query}` : to.path, replace: true });
  },
});
