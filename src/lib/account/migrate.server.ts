import { SqlError, type SqlExecutor } from "./neon.server";

/*
 * The synced account's database migrations (db/migrations/NNNN_*.sql; docs/sync-protocol.md,
 * sections 12 and 15; share and compare plan, feature 4): each file not applied yet runs whole, in
 * one transaction, in the order of its number, through the same SQL executor as the server
 * (scripts/account-migrate.mjs in production, the tests against a local Postgres). A file records
 * itself in schema_migrations; a file once applied is never edited, the next change is a new file.
 */

export type Migration = { version: number; name: string; sql: string };

/** A migration file's statements: split at semicolons outside quotes, comments dropped. */
export function splitSql(text: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (!quoted && ch === "-" && text[i + 1] === "-") {
      while (i < text.length && text[i] !== "\n") i += 1;
      current += "\n";
      continue;
    }
    if (ch === "'") quoted = !quoted;
    if (!quoted && ch === ";") {
      if (current.trim()) out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** The migrations a folder's files make, in order ("0001_accounts.sql" is version 1). */
export function migrationsFrom(files: readonly { name: string; text: string }[]): Migration[] {
  return files
    .map((f) => ({ version: Number(/^(\d{4})_[a-z0-9_-]+\.sql$/.exec(f.name)?.[1] ?? NaN), name: f.name, sql: f.text }))
    .filter((m) => Number.isInteger(m.version) && m.version > 0)
    .sort((a, b) => a.version - b.version);
}

/** Apply the migrations the database does not have yet; returns their versions. */
export async function applyMigrations(sql: SqlExecutor, migrations: readonly Migration[]): Promise<number[]> {
  let applied = new Set<number>();
  try {
    const [result] = await sql.run([{ text: "SELECT version FROM schema_migrations", params: [] }], { readOnly: true });
    applied = new Set(result.rows.map((row) => Number(row[0])));
  } catch (err) {
    // No table yet: nothing was ever applied.
    if (!(err instanceof SqlError && err.code === "42P01")) throw err;
  }
  const done: number[] = [];
  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    await sql.run(splitSql(m.sql).map((text) => ({ text, params: [] })));
    done.push(m.version);
  }
  return done;
}
