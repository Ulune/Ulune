import { createFileRoute } from "@tanstack/react-router";
import { accountCleanupRequest } from "@/lib/account/config.server";

/**
 * The synced account's daily clean-up (docs/sync-protocol.md, section 9; share and compare plan,
 * feature 4, decision A3): accounts unused for two years, tombstones older than 90 days, spent
 * challenges and old device links. Vercel's scheduler calls it at 03:17 UTC (vite.config.ts,
 * crons) with `Authorization: Bearer <CRON_SECRET>`; without that secret set, it never runs.
 * It answers counts only.
 */
export const Route = createFileRoute("/api/account/cleanup")({
  server: {
    handlers: {
      GET: ({ request }) => accountCleanupRequest(request),
      ANY: ({ request }) => accountCleanupRequest(request),
    },
  },
});
