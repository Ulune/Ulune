import { createFileRoute } from "@tanstack/react-router";
import { accountRequest } from "@/lib/account/config.server";

/**
 * The synced account's operations, version 1: POST /api/account/v1/<operation>
 * (docs/sync-protocol.md; share and compare plan, feature 4). Everything happens in
 * src/lib/account/service.server.ts, which answers any other method with 405 and an unknown
 * operation with 404, both as {"error": code} like every other failure. On Vercel these run in
 * Frankfurt (vite.config.ts, functionRules), beside the database.
 */
export const Route = createFileRoute("/api/account/v1/$")({
  server: {
    handlers: {
      POST: ({ request }) => accountRequest(request),
      ANY: ({ request }) => accountRequest(request),
    },
  },
});
