import { StoreUnavailable } from "./store.server";

/*
 * SQL over HTTPS to Neon (docs/sync-protocol.md, section 15; share and compare plan, feature 4,
 * decision A2), with fetch alone: no driver, no new dependency. It speaks the protocol of Neon's
 * own serverless driver (@neondatabase/serverless 1.x, "neon()" over fetch): a POST to
 * https://api.<the database's region host>/sql with the connection string in the
 * Neon-Connection-String header, a body {"queries": [{query, params}]} run as one transaction, and
 * every value given and returned as text (Neon-Raw-Text-Output, Neon-Array-Mode). Statements that
 * Postgres refuses come back as {message, code, …} with status 400; a serialisation failure is
 * tried again (the transaction was rolled back). Nothing is logged here: a failure carries its
 * SQLSTATE code only, never a value.
 */

export type SqlValue = string | null;
export type SqlStatement = { text: string; params: readonly SqlValue[] };
export type SqlResult = { fields: string[]; rows: SqlValue[][] };

export interface SqlExecutor {
  /** The statements in one transaction (read committed); all of them, or none. */
  run(statements: readonly SqlStatement[], options?: { readOnly?: boolean }): Promise<SqlResult[]>;
}

/** Postgres refused a statement: its SQLSTATE code and, for a broken constraint, the constraint's name. */
export class SqlError extends Error {
  readonly code: string;
  readonly constraint: string | null;
  constructor(code: string, constraint: string | null) {
    super(`sql ${code}`);
    this.name = "SqlError";
    this.code = code;
    this.constraint = constraint;
  }
}

/** Neon's HTTP endpoint for a connection string, as its driver makes it: the host's first label becomes "api". */
export function neonEndpoint(connectionString: string): string {
  const url = new URL(connectionString.replace(/^postgres(ql)?:/, "http:"));
  if (!url.hostname || !url.username || url.pathname.length < 2) throw new Error("not a Postgres connection string");
  return `https://${url.hostname.replace(/^[^.]+\./, "api.")}/sql`;
}

function text(value: unknown): SqlValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "t" : "f";
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function readResult(raw: unknown): SqlResult {
  const r = raw as { fields?: { name?: unknown }[]; rows?: unknown[] };
  if (!r || !Array.isArray(r.fields) || !Array.isArray(r.rows)) throw new StoreUnavailable("unexpected answer");
  const fields = r.fields.map((f) => String(f?.name ?? ""));
  const rows = r.rows.map((row) => (Array.isArray(row) ? row.map(text) : fields.map((name) => text((row as Record<string, unknown>)[name]))));
  return { fields, rows };
}

const RETRY_CODES = new Set(["40001", "40P01"]);

export function neonExecutor(options: {
  connectionString: string;
  /** Another endpoint (the tests' stand-in for Neon); by default Neon's own for this connection string. */
  endpoint?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): SqlExecutor {
  const endpoint = options.endpoint ?? neonEndpoint(options.connectionString);
  const send = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;

  async function once(statements: readonly SqlStatement[], readOnly: boolean): Promise<SqlResult[]> {
    let res: Response;
    try {
      res = await send(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Neon-Connection-String": options.connectionString,
          "Neon-Raw-Text-Output": "true",
          "Neon-Array-Mode": "true",
          "Neon-Batch-Isolation-Level": "ReadCommitted",
          "Neon-Batch-Read-Only": readOnly ? "true" : "false",
        },
        body: JSON.stringify({ queries: statements.map((s) => ({ query: s.text, params: s.params })) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new StoreUnavailable("network");
    }
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as { code?: unknown; constraint?: unknown } | null;
      if (body && typeof body.code === "string") throw new SqlError(body.code, typeof body.constraint === "string" ? body.constraint : null);
      throw new StoreUnavailable("refused");
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new StoreUnavailable(`status ${res.status}`);
    }
    const body = (await res.json().catch(() => null)) as { results?: unknown[] } | null;
    if (!body || !Array.isArray(body.results) || body.results.length !== statements.length) throw new StoreUnavailable("unexpected answer");
    return body.results.map(readResult);
  }

  return {
    async run(statements, runOptions = {}) {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await once(statements, Boolean(runOptions.readOnly));
        } catch (err) {
          if (err instanceof SqlError && RETRY_CODES.has(err.code) && attempt < 3) {
            await new Promise((r) => setTimeout(r, 20 * (attempt + 1) + Math.random() * 30));
            continue;
          }
          throw err;
        }
      }
    },
  };
}
