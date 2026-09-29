import { createFileRoute } from "@tanstack/react-router";
import { parseStudioSearch } from "@/lib/chart/studio";
import { Shell } from "@/studio/shell/Shell";
import { useLibraryBoot } from "@/studio/library-boot";
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

export const Route = createFileRoute("/")({
  validateSearch: parseStudioSearch,
  headers: () => ({ "Cache-Control": BROWSER_CACHE, "Vercel-CDN-Cache-Control": EDGE_CACHE }),
  head: () => ({
    ...pageHead({ path: "/", title: HOME_TITLE }),
    // What the page is, for search engines (schema.org): a data block, never run.
    scripts: [{ type: "application/ld+json", children: JSON.stringify(HOME_STRUCTURED_DATA) }],
  }),
  component: Home,
});

function Home() {
  useLibraryBoot();
  return <Shell />;
}
