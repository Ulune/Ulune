import { createFileRoute } from "@tanstack/react-router";
import { calculateSkyWindow } from "@/lib/chart/calculate.server";
import { chunkStart } from "@/lib/chart/sky-window";

/**
 * One chunk of the scrub window (src/lib/chart/sky-window.ts): the sky every
 * 12 hours over 32 days, the same for every visitor. `t0` must be a chunk
 * boundary; `v` (the client's calculation version) only keys the caches.
 * Kept a year by the edge and the browser: the sky at a moment never changes,
 * and a new calculation version asks under a new URL.
 */
const KEEP = "public, max-age=31536000, s-maxage=31536000, immutable";
/** 600 BC to 2399 AD: the ephemeris files shipped. */
const MIN_MS = Date.UTC(-599, 0, 1);
const MAX_MS = Date.UTC(2399, 0, 1);

export const Route = createFileRoute("/api/sky-window")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("t0") ?? "";
        const t0 = /^-?\d{1,15}$/.test(raw) ? Number(raw) : NaN;
        if (!Number.isFinite(t0) || chunkStart(t0) !== t0 || t0 < MIN_MS || t0 > MAX_MS) {
          return new Response(JSON.stringify({ error: "E:window.start" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }
        try {
          const win = await calculateSkyWindow(t0);
          return new Response(JSON.stringify(win), {
            headers: { "Content-Type": "application/json", "Cache-Control": KEEP },
          });
        } catch (err) {
          console.error("[sky-window]", err instanceof Error ? err.message : err);
          return new Response(JSON.stringify({ error: "E:window.failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
