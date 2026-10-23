// The synced account's database, brought up to date (docs/sync-protocol.md, section 15): the
// files of db/migrations not applied yet, each in one transaction, over Neon's HTTPS endpoint.
// Run once after creating the database, and after any new migration:
//   ACCOUNT_DATABASE_URL=postgresql://… npm run account:migrate
// (Or paste db/migrations/0001_accounts.sql into Neon's SQL editor.) It prints versions only.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyMigrations, migrationsFrom } from "../src/lib/account/migrate.server.ts";
import { neonExecutor } from "../src/lib/account/neon.server.ts";

const url = process.env.ACCOUNT_DATABASE_URL?.trim();
if (!url) {
  console.error("account-migrate: set ACCOUNT_DATABASE_URL to the Neon database's connection string");
  process.exit(1);
}
const dir = new URL("../db/migrations/", import.meta.url).pathname;
const migrations = migrationsFrom(readdirSync(dir).map((name) => ({ name, text: readFileSync(join(dir, name), "utf8") })));
try {
  const done = await applyMigrations(neonExecutor({ connectionString: url, timeoutMs: 60_000 }), migrations);
  console.log(done.length ? `account-migrate: applied ${done.join(", ")}` : "account-migrate: already up to date");
} catch (err) {
  console.error(`account-migrate: failed (${err?.code ?? err?.message ?? err})`);
  process.exit(1);
}
