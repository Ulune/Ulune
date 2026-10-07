/*
 * One definition for every page that draws the studio (`/` and each path of
 * src/studio/map.ts): the same search params, cache rules and head. The
 * studio itself is the component of their layout, src/routes/_studio.tsx:
 * one instance for every studio path, split out of the first script once.
 */
import { parseStudioSearch } from "@/lib/chart/studio";
import { HOME_STRUCTURED_DATA, HOME_TITLE, pageHead } from "@/lib/page-head";

/**
 * The studio's page is the same for every visitor: it starts empty and fills
 * from this device's storage once it runs, and nothing on it depends on who
 * asks. So Vercel's edge may keep it (an hour, then served while refreshed in
 * the background; a deploy starts with an empty edge cache) instead of running
 * the server for each visit. The browser gets its own rule: ask again every
 * time and never show a kept copy. A copy from before a deploy names code
 * files the new version no longer has, and a browser allowed to serve it
 * stale opens a page that doesn't start (Safari did, with the stale-while-
 * revalidate once in this header too). The URL, query included, is the key.
 */
const BROWSER_CACHE = "public, max-age=0, must-revalidate";
const EDGE_CACHE = "public, s-maxage=3600, stale-while-revalidate=604800";

/** The home page's head, which every studio path shares unless it has its own. */
function homeHead() {
  return {
    ...pageHead({ path: "/", title: HOME_TITLE }),
    // What the page is, for search engines (schema.org): a data block, never run.
    scripts: [{ type: "application/ld+json", children: JSON.stringify(HOME_STRUCTURED_DATA) }],
  };
}

/** A studio page's own head: pageHead's tags, and links of its own (another language's address). */
type Head = ReturnType<typeof pageHead> & { links?: { rel: string; href: string; hrefLang?: string }[] };

/**
 * Route options for a studio page. Every one names `/` as its canonical
 * address (they are one page for search engines), except a page given a
 * head of its own: the Calendar, found by itself (src/studio/calendar-head.ts).
 */
export function studioRoute(opts: { head?: () => Head } = {}) {
  return {
    validateSearch: parseStudioSearch,
    headers: () => ({ "Cache-Control": BROWSER_CACHE, "Vercel-CDN-Cache-Control": EDGE_CACHE }),
    head: opts.head ?? homeHead,
  };
}
