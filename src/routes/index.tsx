import { createFileRoute } from "@tanstack/react-router";
import { parseStudioSearch } from "@/lib/chart/studio";
import { Shell } from "@/studio/shell/Shell";
import { useLibraryBoot } from "@/studio/library-boot";
import { HOME_STRUCTURED_DATA, HOME_TITLE, pageHead } from "@/lib/page-head";

/**
 * The studio's page is the same for every visitor: it starts empty and fills
 * from this device's storage once it runs, and nothing on it depends on who
 * asks. So the edge may keep it (an hour, then served while refreshed in the
 * background) instead of running the server for each visit; the browser
 * always asks again, so a new deploy shows at once. The URL, query included,
 * is the cache key.
 */
const EDGE_CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800";

export const Route = createFileRoute("/")({
  validateSearch: parseStudioSearch,
  headers: () => ({ "Cache-Control": EDGE_CACHE }),
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
