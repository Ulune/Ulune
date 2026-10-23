import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_URL } from "@/lib/app-identity";
import { b64u, randomBytes, utf8 } from "./encoding";
import { neonExecutor } from "./neon.server";
import { accountService, operationOf, type AccountService } from "./service.server";
import { memoryStore } from "./store-memory.server";
import { sqlStore } from "./store-sql.server";
import type { AccountStore } from "./store.server";

/*
 * The synced account's server as the environment sets it up (docs/sync-protocol.md, section 15;
 * share and compare plan, feature 4). Read once, at the first account request:
 *
 *   - ACCOUNT_DATABASE_URL: Neon's connection string (Vercel's Neon integration sets it with the
 *     prefix ACCOUNT_). Without it: in development (`npm run dev`) accounts live in memory, kept in
 *     .data/account-store.json; ULUNE_ACCOUNT_STORE=memory keeps them in memory only (the deploy
 *     check, never on Vercel); in production, every account operation answers 503.
 *   - ULUNE_ACCOUNT_STORE=none: no accounts here, whatever else is set: every account operation
 *     answers 503, as production does until its database and secrets exist (the 2.0 fixes, item 4).
 *     The e2e suite sync-unavailable.mjs runs a development server so; on Vercel it would pause
 *     accounts without removing the database's address.
 *   - ACCOUNT_SESSION_SECRET: at least 32 characters (32 random bytes in base64). In development,
 *     made once and kept in .env.local (which git ignores) when it is not set.
 *   - CRON_SECRET: what Vercel's scheduler sends with the daily clean-up.
 *   - ACCOUNT_ORIGINS: the pages allowed to use passkeys (comma-separated); by default ulune.app in
 *     production, the deployment's own address on a preview, localhost:8097 in development.
 */

const DEV_ORIGINS = ["http://localhost:8097", "http://127.0.0.1:8097"];

function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL;
}

/** The development secret: from .env.local, or made and added to it. */
function developmentSecret(): string {
  const file = join(process.cwd(), ".env.local");
  const kept = existsSync(file) ? /^ACCOUNT_SESSION_SECRET=(\S{32,})$/m.exec(readFileSync(file, "utf8"))?.[1] : undefined;
  if (kept) return kept;
  const made = b64u(randomBytes(32));
  try {
    appendFileSync(file, `${existsSync(file) ? "\n" : ""}# Made by the synced account's development server (docs/sync-protocol.md); never used anywhere else.\nACCOUNT_SESSION_SECRET=${made}\n`, { mode: 0o600 });
  } catch {
    /* kept for this run only */
  }
  return made;
}

export function secretFromEnv(): Uint8Array | null {
  const given = process.env.ACCOUNT_SESSION_SECRET?.trim();
  if (given && given.length >= 32) return utf8(given);
  return isDevelopment() ? utf8(developmentSecret()) : null;
}

export function storeFromEnv(): AccountStore | null {
  if (process.env.ULUNE_ACCOUNT_STORE === "none") return null;
  const url = process.env.ACCOUNT_DATABASE_URL?.trim();
  if (url) return sqlStore(neonExecutor({ connectionString: url }));
  if (process.env.ULUNE_ACCOUNT_STORE === "memory" && !process.env.VERCEL) return memoryStore();
  if (isDevelopment()) return memoryStore({ file: join(process.cwd(), ".data", "account-store.json") });
  return null;
}

/** The origins whose pages may sign in with passkeys. */
export function originsFromEnv(): string[] {
  const listed = (process.env.ACCOUNT_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => /^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(o));
  if (listed.length) return listed;
  if (process.env.VERCEL_ENV === "production") return [SITE_URL];
  if (process.env.VERCEL_ENV === "preview") {
    const hosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].filter((h): h is string => Boolean(h));
    if (hosts.length) return hosts.map((h) => `https://${h}`);
  }
  return isDevelopment() ? DEV_ORIGINS : [SITE_URL];
}

let service: AccountService | null = null;

export function accountServiceFromEnv(): AccountService {
  service ??= accountService({
    store: storeFromEnv(),
    secret: secretFromEnv(),
    origins: originsFromEnv(),
    cronSecret: process.env.CRON_SECRET?.trim() || null,
  });
  return service;
}

/** A request to /api/account/v1/<operation> (src/routes/api/account.v1.$.ts). */
export function accountRequest(request: Request): Promise<Response> {
  return accountServiceFromEnv().handle(operationOf(request.url), request);
}

/** The daily clean-up's request (src/routes/api/account.cleanup.ts). */
export function accountCleanupRequest(request: Request): Promise<Response> {
  return accountServiceFromEnv().cleanupRequest(request);
}
