import { createFileRoute } from "@tanstack/react-router";
import { importWithRetry } from "@/lib/lazy-retry";

/*
 * /sitemap.xml (robots.txt names it): the public pages and every page of the
 * encyclopedia in both languages, made from the encyclopedia's index bundled
 * with the server (src/lib/sitemap.ts). The same for everyone; it changes
 * only with a deploy.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [{ sitemapXml }, index] = await Promise.all([
          importWithRetry(() => import("@/lib/sitemap")),
          importWithRetry(() => import("virtual:ulune-encyclopedia/index")).then((m) => m.default),
        ]);
        return new Response(sitemapXml(index), {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
