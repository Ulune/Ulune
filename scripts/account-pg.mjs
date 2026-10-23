// A real Postgres for the synced account's tests, when this computer has one (docs/sync-protocol.md,
// section 15): a throwaway cluster in a temporary folder (initdb, pg_ctl; as the postgres user when
// run as root), a small client of Postgres's own wire protocol over its Unix socket (no driver, no
// new dependency), and a stand-in for Neon's HTTPS endpoint in front of it, speaking what
// src/lib/account/neon.server.ts sends: {"queries": [{query, params}]} run in one transaction, every
// value as text, refusals as {message, code, constraint} with status 400. Nothing leaves the machine.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A PostgreSQL program, from the PATH or Debian's and Ubuntu's /usr/lib/postgresql/<version>/bin. */
function findProgram(name) {
  for (const dir of (process.env.PATH ?? "").split(":")) if (dir && existsSync(join(dir, name))) return join(dir, name);
  const base = "/usr/lib/postgresql";
  if (!existsSync(base)) return null;
  const versions = readdirSync(base)
    .filter((v) => /^\d+$/.test(v))
    .sort((a, b) => Number(b) - Number(a));
  for (const v of versions) if (existsSync(join(base, v, "bin", name))) return join(base, v, "bin", name);
  return null;
}

/** A cluster started for the tests, or { skip: why } when there can be none here. */
export function startPostgres() {
  const initdb = findProgram("initdb");
  const pgctl = findProgram("pg_ctl");
  if (!initdb || !pgctl) return { skip: "no PostgreSQL on this computer (initdb not found)" };
  const asRoot = process.getuid?.() === 0;
  if (asRoot && spawnSync("id", ["-u", "postgres"]).status !== 0) return { skip: "run as root, and there is no postgres user to run PostgreSQL as" };
  const run = (program, args) =>
    asRoot ? spawnSync("runuser", ["-u", "postgres", "--", program, ...args], { encoding: "utf8", timeout: 90_000 }) : spawnSync(program, args, { encoding: "utf8", timeout: 90_000 });
  const dir = mkdtempSync(join(tmpdir(), "ulune-pg-"));
  if (asRoot) execFileSync("chown", ["postgres", dir]);
  const data = join(dir, "data");
  const port = 5400 + Math.floor(Math.random() * 500);
  const gone = () => rmSync(dir, { recursive: true, force: true });
  let r = run(initdb, ["-D", data, "-A", "trust", "-U", "ulune", "-E", "UTF8", "--no-locale", "--no-sync", "--no-instructions"]);
  if (r.status !== 0) {
    gone();
    return { skip: `initdb failed: ${(r.stderr || r.error?.message || "").slice(0, 200)}` };
  }
  const options = `-k ${dir} -p ${port} -c listen_addresses='' -c fsync=off -c synchronous_commit=off -c full_page_writes=off`;
  r = run(pgctl, ["-D", data, "-l", join(dir, "log"), "-w", "-t", "60", "-o", options, "start"]);
  if (r.status !== 0) {
    gone();
    return { skip: `PostgreSQL did not start: ${(r.stderr || "").slice(0, 200)}` };
  }
  const version = spawnSync(join(initdb, "..", "postgres"), ["--version"], { encoding: "utf8" }).stdout.trim();
  return {
    socket: join(dir, `.s.PGSQL.${port}`),
    version,
    stop() {
      run(pgctl, ["-D", data, "-m", "immediate", "-w", "stop"]);
      gone();
    },
  };
}

/* ------------------------------------------------------------ Postgres's wire protocol, the simple query part */

export class PgWire {
  static connect(socket, { user = "ulune", database = "postgres" } = {}) {
    return new Promise((resolve, reject) => {
      const sock = connect(socket);
      const wire = new PgWire(sock);
      sock.once("error", reject);
      sock.once("connect", async () => {
        const params = Buffer.from(`user\0${user}\0database\0${database}\0client_encoding\0UTF8\0\0`, "utf8");
        const head = Buffer.alloc(8);
        head.writeInt32BE(8 + params.length, 0);
        head.writeInt32BE(196608, 4);
        sock.write(Buffer.concat([head, params]));
        try {
          for (;;) {
            const m = await wire.next();
            if (m.type === "R" && m.body.readInt32BE(0) !== 0) throw new Error("only trust authentication is supported here");
            if (m.type === "E") throw new Error(PgWire.error(m.body).message);
            if (m.type === "Z") break;
          }
          sock.removeListener("error", reject);
          resolve(wire);
        } catch (err) {
          sock.destroy();
          reject(err);
        }
      });
    });
  }

  constructor(sock) {
    this.sock = sock;
    this.buf = Buffer.alloc(0);
    this.queue = [];
    this.waiting = null;
    sock.on("data", (chunk) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      while (this.buf.length >= 5) {
        const len = this.buf.readInt32BE(1);
        if (this.buf.length < 1 + len) break;
        const msg = { type: String.fromCharCode(this.buf[0]), body: this.buf.subarray(5, 1 + len) };
        this.buf = this.buf.subarray(1 + len);
        if (this.waiting) {
          const w = this.waiting;
          this.waiting = null;
          w(msg);
        } else this.queue.push(msg);
      }
    });
  }

  next() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    return new Promise((resolve) => (this.waiting = resolve));
  }

  static error(body) {
    const fields = {};
    let at = 0;
    while (at < body.length && body[at] !== 0) {
      const code = String.fromCharCode(body[at]);
      const end = body.indexOf(0, at + 1);
      fields[code] = body.toString("utf8", at + 1, end);
      at = end + 1;
    }
    return { code: fields.C, message: fields.M, constraint: fields.n ?? null, detail: fields.D ?? null };
  }

  /** One simple query (several statements allowed): each statement's columns and text rows, or the error. */
  async query(sql) {
    const text = Buffer.from(`${sql}\0`, "utf8");
    const head = Buffer.alloc(5);
    head.write("Q", 0);
    head.writeInt32BE(4 + text.length, 1);
    this.sock.write(Buffer.concat([head, text]));
    const results = [];
    let current = { fields: [], rows: [] };
    let error = null;
    for (;;) {
      const m = await this.next();
      if (m.type === "T") {
        const n = m.body.readInt16BE(0);
        let at = 2;
        current.fields = [];
        for (let i = 0; i < n; i += 1) {
          const end = m.body.indexOf(0, at);
          current.fields.push(m.body.toString("utf8", at, end));
          at = end + 1 + 18;
        }
      } else if (m.type === "D") {
        const n = m.body.readInt16BE(0);
        let at = 2;
        const row = [];
        for (let i = 0; i < n; i += 1) {
          const len = m.body.readInt32BE(at);
          at += 4;
          if (len < 0) row.push(null);
          else {
            row.push(m.body.toString("utf8", at, at + len));
            at += len;
          }
        }
        current.rows.push(row);
      } else if (m.type === "C" || m.type === "I") {
        current.command = m.type === "C" ? m.body.toString("utf8", 0, m.body.length - 1) : "";
        results.push(current);
        current = { fields: [], rows: [] };
      } else if (m.type === "E") {
        error = PgWire.error(m.body);
      } else if (m.type === "Z") {
        return { results, error };
      }
    }
  }

  close() {
    const x = Buffer.alloc(5);
    x.write("X", 0);
    x.writeInt32BE(4, 1);
    this.sock.end(x);
  }
}

/** A statement with its $n parameters written in as literals (every parameter of the account's SQL is cast). */
export function inline(sql, params) {
  return sql.replace(/\$(\d+)/g, (_m, n) => {
    const v = params[Number(n) - 1];
    if (v === null || v === undefined) return "NULL";
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

const ISOLATION = { ReadCommitted: "READ COMMITTED", RepeatableRead: "REPEATABLE READ", Serializable: "SERIALIZABLE", ReadUncommitted: "READ UNCOMMITTED" };

/**
 * A stand-in for Neon's HTTPS SQL endpoint over the local cluster: one connection per request, the
 * batch in one transaction. It counts the requests and keeps the last connection string it was sent.
 */
export async function fakeNeon(socket) {
  const seen = { requests: 0, connectionString: null };
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    seen.requests += 1;
    seen.connectionString = req.headers["neon-connection-string"] ?? null;
    let wire;
    try {
      if (req.method !== "POST" || req.url !== "/sql" || !seen.connectionString || req.headers["neon-raw-text-output"] !== "true" || req.headers["neon-array-mode"] !== "true") {
        res.writeHead(404).end();
        return;
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const queries = body.queries ?? [body];
      const iso = ISOLATION[req.headers["neon-batch-isolation-level"]] ?? "READ COMMITTED";
      const ro = req.headers["neon-batch-read-only"] === "true" ? " READ ONLY" : "";
      const sql = [`BEGIN ISOLATION LEVEL ${iso}${ro}`, ...queries.map((q) => inline(q.query, q.params ?? [])), "COMMIT"].join(";\n");
      // The database named in the connection string, as Neon reads it.
      const database = decodeURIComponent(new URL(seen.connectionString.replace(/^postgres(ql)?:/, "http:")).pathname.slice(1)) || "postgres";
      wire = await PgWire.connect(socket, { database });
      const { results, error } = await wire.query(sql);
      if (error) {
        res.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ message: error.message, code: error.code, constraint: error.constraint }));
        return;
      }
      const own = results.slice(1, -1).map((r) => ({ fields: r.fields.map((name) => ({ name })), rows: r.rows, command: r.command, rowCount: r.rows.length }));
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body.queries ? { results: own } : own[0]));
    } catch (err) {
      res.writeHead(500).end(String(err?.message ?? err));
    } finally {
      wire?.close();
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return {
    url: `http://127.0.0.1:${server.address().port}/sql`,
    seen,
    close: () => new Promise((ok) => server.close(ok)),
  };
}
