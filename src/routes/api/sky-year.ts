import { createFileRoute } from "@tanstack/react-router";
import { calculateSkyYear } from "@/lib/chart/calculate.server";
import { SKY_YEAR_MAX, SKY_YEAR_MIN } from "@/lib/chart/sky-year";

/**
 * The year's sky file (src/lib/chart/sky-year.ts): the slow bodies every day
 * and the year's sky events, the same for every visitor. `y` is the year;
 * `v` (the client's calculation version and file format) only keys the
 * caches. Kept a year by the edge and the browser: a year's sky never
 * changes, and a new version asks under a new URL.
 */
const KEEP = "public, max-age=31536000, s-maxage=31536000, immutable";

export const Route = createFileRoute("/api/sky-year")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("y") ?? "";
        const year = /^-?\d{1,4}$/.test(raw) ? Number(raw) : NaN;
        if (!Number.isInteger(year) || year < SKY_YEAR_MIN || year > SKY_YEAR_MAX) {
          return new Response(JSON.stringify({ error: "E:year.range" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }
        try {
          const file = await calculateSkyYear(year);
          return new Response(JSON.stringify(file), {
            headers: { "Content-Type": "application/json", "Cache-Control": KEEP },
          });
        } catch (err) {
          console.error("[sky-year]", err instanceof Error ? err.message : err);
          return new Response(JSON.stringify({ error: "E:year.failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
