import { fromHex, hex } from "./encoding";
import { SqlError, type SqlExecutor, type SqlResult, type SqlStatement, type SqlValue } from "./neon.server";
import type { AccountRow, AccountStore, Bytes, ChangesResult, DeviceRow, LinkRow, PutResult, WayRow } from "./store.server";
import { StoreUnavailable } from "./store.server";
import type { WayKind } from "./protocol";

/*
 * The synced account's store in Postgres (store.server.ts; tables in db/migrations/0001_accounts.sql;
 * docs/sync-protocol.md, sections 6 and 13; share and compare plan, feature 4), through an SQL
 * executor: Neon's HTTPS endpoint in production (neon.server.ts), a stand-in for it over a local
 * Postgres in the tests. Each method is one transaction of statements sent at once (Neon's HTTP
 * batches cannot wait for an answer half-way), so every decision is made inside SQL:
 *
 *   - a write to an account first locks its row (the version counter's UPDATE, or SELECT … FOR
 *     UPDATE): writes to one account run one at a time, and versions are never seen out of order;
 *   - quotas are CHECK constraints on the account's counters, recomputed in the same transaction:
 *     a batch over quota fails whole (23514);
 *   - every value goes in and comes back as text: bytes as \x… hex (bytea) or base64 inside JSON.
 */

const bytea = (bytes: Bytes | null | undefined): SqlValue => (bytes ? `\\x${hex(bytes)}` : null);
const num = (n: number | null | undefined): SqlValue => (n === null || n === undefined ? null : String(Math.trunc(n)));

function readBytea(value: SqlValue): Bytes | null {
  if (value === null) return null;
  const bytes = value.startsWith("\\x") ? fromHex(value.slice(2)) : null;
  if (!bytes) throw new StoreUnavailable("bytea");
  return bytes;
}

function needBytea(value: SqlValue): Bytes {
  const bytes = readBytea(value);
  if (!bytes) throw new StoreUnavailable("null bytes");
  return bytes;
}

function readNum(value: SqlValue): number | null {
  return value === null ? null : Number(value);
}

function needNum(value: SqlValue): number {
  const n = readNum(value);
  if (n === null || !Number.isFinite(n)) throw new StoreUnavailable("number");
  return n;
}

function readBool(value: SqlValue): boolean {
  return value === "t" || value === "true";
}

/** base64 as Postgres's encode() writes it (lines of 76) back to bytes. */
function readBase64(value: SqlValue): Bytes | null {
  if (value === null) return null;
  return new Uint8Array(Buffer.from(value.replace(/\s+/g, ""), "base64"));
}

/** The result's rows as objects by column name. */
function objects(result: SqlResult): Record<string, SqlValue>[] {
  return result.rows.map((row) => Object.fromEntries(result.fields.map((name, i) => [name, row[i] ?? null])));
}

const s = (text: string, ...params: SqlValue[]): SqlStatement => ({ text, params });

const WAY_COLUMNS =
  "account_id, id, kind, lookup, public_key, alg, counter, client_salt, argon_m, argon_t, argon_p, server_salt, auth_hash, wrap, created_day, used_day";

function wayRow(r: Record<string, SqlValue>): WayRow {
  return {
    account: needBytea(r.account_id),
    id: needBytea(r.id),
    kind: r.kind as WayKind,
    lookup: readBytea(r.lookup),
    publicKey: readBytea(r.public_key),
    alg: readNum(r.alg),
    counter: readNum(r.counter),
    clientSalt: readBytea(r.client_salt),
    argonM: readNum(r.argon_m),
    argonT: readNum(r.argon_t),
    argonP: readNum(r.argon_p),
    serverSalt: readBytea(r.server_salt),
    authHash: readBytea(r.auth_hash),
    wrap: needBytea(r.wrap),
    createdDay: needNum(r.created_day),
    usedDay: readNum(r.used_day),
  };
}

function wayParams(w: WayRow): SqlValue[] {
  return [
    bytea(w.account),
    bytea(w.id),
    w.kind,
    bytea(w.lookup),
    bytea(w.publicKey),
    num(w.alg),
    num(w.counter),
    bytea(w.clientSalt),
    num(w.argonM),
    num(w.argonT),
    num(w.argonP),
    bytea(w.serverSalt),
    bytea(w.authHash),
    bytea(w.wrap),
    num(w.createdDay),
    num(w.usedDay),
  ];
}

const WAY_VALUES =
  "$1::bytea, $2::bytea, $3::text, $4::bytea, $5::bytea, $6::int, $7::bigint, $8::bytea, $9::int, $10::int, $11::int, $12::bytea, $13::bytea, $14::bytea, $15::int, $16::int";

const DEVICE_COLUMNS = "account_id, id, public_key, name, created_day, seen_day";

function deviceRow(r: Record<string, SqlValue>): DeviceRow {
  return {
    account: needBytea(r.account_id),
    id: needBytea(r.id),
    publicKey: needBytea(r.public_key),
    name: readBytea(r.name),
    createdDay: needNum(r.created_day),
    seenDay: needNum(r.seen_day),
  };
}

const LINK_COLUMNS = "id, day, opener, account_id, giver_epk, taker_epk, taker_key, sealed, device_id";

function linkRow(r: Record<string, SqlValue>): LinkRow {
  return {
    id: needBytea(r.id),
    day: needNum(r.day),
    opener: r.opener === "taker" ? "taker" : "giver",
    account: readBytea(r.account_id),
    giverEpk: readBytea(r.giver_epk),
    takerEpk: readBytea(r.taker_epk),
    takerKey: readBytea(r.taker_key),
    sealed: readBytea(r.sealed),
    device: readBytea(r.device_id),
  };
}

/** The devices of an account beyond `max`, the one seen longest ago first, except the one just added ($1 account, $2 kept, $3 max). */
const EVICT_DEVICES = `DELETE FROM devices WHERE account_id = $1::bytea AND id IN (
  SELECT id FROM devices WHERE account_id = $1::bytea AND id <> $2::bytea
  ORDER BY seen_day, created_day, id
  LIMIT GREATEST(0, (SELECT count(*) FROM devices WHERE account_id = $1::bytea) - $3::int)
)`;

const LOCK_ACCOUNT = "SELECT 1 FROM accounts WHERE id = $1::bytea FOR UPDATE";

function isUnique(err: unknown): boolean {
  return err instanceof SqlError && err.code === "23505";
}

export function sqlStore(sql: SqlExecutor): AccountStore {
  const one = async (statement: SqlStatement, readOnly = false) => objects((await sql.run([statement], { readOnly }))[0]);

  return {
    async accountsCreatedOn(day) {
      const [r] = await one(s("SELECT count(*)::int AS n FROM accounts WHERE created_day = $1::int", num(day)), true);
      return needNum(r.n);
    },

    async createAccount(account, ways, device) {
      try {
        await sql.run([
          s(
            "INSERT INTO accounts (id, created_day, seen_day, quota_bytes, quota_records) VALUES ($1::bytea, $2::int, $2::int, $3::bigint, $4::int)",
            bytea(account.id),
            num(account.day),
            num(account.quotaBytes),
            num(account.quotaRecords),
          ),
          ...ways.map((w) => s(`INSERT INTO ways (${WAY_COLUMNS}) VALUES (${WAY_VALUES})`, ...wayParams(w))),
          s(
            `INSERT INTO devices (${DEVICE_COLUMNS}) VALUES ($1::bytea, $2::bytea, $3::bytea, $4::bytea, $5::int, $6::int)`,
            bytea(device.account),
            bytea(device.id),
            bytea(device.publicKey),
            bytea(device.name),
            num(device.createdDay),
            num(device.seenDay),
          ),
        ]);
        return "ok";
      } catch (err) {
        if (isUnique(err)) return "taken";
        throw err;
      }
    },

    async getAccount(id) {
      const [r] = await one(
        s("SELECT id, created_day, seen_day, seq, floor, bytes, records, quota_bytes, quota_records FROM accounts WHERE id = $1::bytea", bytea(id)),
        true,
      );
      if (!r) return null;
      const row: AccountRow = {
        id: needBytea(r.id),
        createdDay: needNum(r.created_day),
        seenDay: needNum(r.seen_day),
        seq: needNum(r.seq),
        floor: needNum(r.floor),
        bytes: needNum(r.bytes),
        records: needNum(r.records),
        quotaBytes: needNum(r.quota_bytes),
        quotaRecords: needNum(r.quota_records),
      };
      return row;
    },

    async deleteAccount(id) {
      return (await one(s("DELETE FROM accounts WHERE id = $1::bytea RETURNING 1 AS ok", bytea(id)))).length > 0;
    },

    async touch(account, device, day) {
      const [r] = await one(
        s(
          `WITH d AS (
             UPDATE devices SET seen_day = $3::int WHERE account_id = $1::bytea AND id = $2::bytea AND seen_day < $3::int RETURNING 1
           ), a AS (
             UPDATE accounts SET seen_day = $3::int WHERE id = $1::bytea AND seen_day < $3::int
               AND EXISTS (SELECT 1 FROM devices WHERE account_id = $1::bytea AND id = $2::bytea) RETURNING 1
           )
           SELECT EXISTS (SELECT 1 FROM devices WHERE account_id = $1::bytea AND id = $2::bytea) AS ok`,
          bytea(account),
          bytea(device),
          num(day),
        ),
      );
      return readBool(r?.ok ?? null);
    },

    async findWay(kind, lookup) {
      const [r] = await one(s(`SELECT ${WAY_COLUMNS} FROM ways WHERE kind = $1::text AND lookup = $2::bytea`, kind, bytea(lookup)), true);
      return r ? wayRow(r) : null;
    },

    async listWays(account) {
      return (await one(s(`SELECT ${WAY_COLUMNS} FROM ways WHERE account_id = $1::bytea ORDER BY created_day, id`, bytea(account)), true)).map(wayRow);
    },

    async addWay(way, maxPasskeys) {
      const here = "EXISTS (SELECT 1 FROM accounts WHERE id = $1::bytea)";
      const insert =
        way.kind === "passkey"
          ? s(
              `INSERT INTO ways (${WAY_COLUMNS}) SELECT ${WAY_VALUES} WHERE ${here}
                 AND (SELECT count(*) FROM ways WHERE account_id = $1::bytea AND kind = 'passkey') < $17::int RETURNING 1 AS ok`,
              ...wayParams(way),
              num(maxPasskeys),
            )
          : s(`INSERT INTO ways (${WAY_COLUMNS}) SELECT ${WAY_VALUES} WHERE ${here} RETURNING 1 AS ok`, ...wayParams(way));
      try {
        const results = await sql.run([
          s(LOCK_ACCOUNT, bytea(way.account)),
          ...(way.kind === "passkey" ? [] : [s("DELETE FROM ways WHERE account_id = $1::bytea AND kind = $2::text", bytea(way.account), way.kind)]),
          insert,
          s(`SELECT ${here} AS here`, bytea(way.account)),
        ]);
        if (results.at(-2)!.rows.length) return "ok";
        return readBool(objects(results.at(-1)!)[0]?.here ?? null) ? "limit" : "missing";
      } catch (err) {
        if (isUnique(err)) return "taken";
        throw err;
      }
    },

    async removeWay(account, id) {
      const results = await sql.run([
        s(LOCK_ACCOUNT, bytea(account)),
        s(
          `DELETE FROM ways WHERE account_id = $1::bytea AND id = $2::bytea AND kind <> 'recovery'
             AND EXISTS (SELECT 1 FROM ways w WHERE w.account_id = $1::bytea AND w.id <> $2::bytea AND w.kind IN ('passkey', 'passphrase'))
           RETURNING 1 AS ok`,
          bytea(account),
          bytea(id),
        ),
        s("SELECT EXISTS (SELECT 1 FROM ways WHERE account_id = $1::bytea AND id = $2::bytea) AS still", bytea(account), bytea(id)),
      ]);
      if (results[1].rows.length) return "ok";
      return readBool(objects(results[2])[0]?.still ?? null) ? "last" : "missing";
    },

    async usedWay(account, id, day, counter) {
      if (counter === undefined) {
        await one(
          s(
            "UPDATE ways SET used_day = $3::int WHERE account_id = $1::bytea AND id = $2::bytea AND (used_day IS NULL OR used_day < $3::int)",
            bytea(account),
            bytea(id),
            num(day),
          ),
        );
        return true;
      }
      const rows = await one(
        s(
          `UPDATE ways SET counter = $4::bigint, used_day = GREATEST(COALESCE(used_day, 0), $3::int)
           WHERE account_id = $1::bytea AND id = $2::bytea AND ((counter = 0 AND $4::bigint = 0) OR counter < $4::bigint)
           RETURNING 1 AS ok`,
          bytea(account),
          bytea(id),
          num(day),
          num(counter),
        ),
      );
      return rows.length > 0;
    },

    async spendNonce(nonce, day) {
      const rows = await one(s("INSERT INTO spent (nonce, day) VALUES ($1::bytea, $2::int) ON CONFLICT DO NOTHING RETURNING 1 AS ok", bytea(nonce), num(day)));
      return rows.length > 0;
    },

    async addDevice(device, max) {
      await sql.run([
        s(LOCK_ACCOUNT, bytea(device.account)),
        s(
          `INSERT INTO devices (${DEVICE_COLUMNS})
           SELECT $1::bytea, $2::bytea, $3::bytea, $4::bytea, $5::int, $6::int WHERE EXISTS (SELECT 1 FROM accounts WHERE id = $1::bytea)`,
          bytea(device.account),
          bytea(device.id),
          bytea(device.publicKey),
          bytea(device.name),
          num(device.createdDay),
          num(device.seenDay),
        ),
        s(EVICT_DEVICES, bytea(device.account), bytea(device.id), num(max)),
      ]);
    },

    async getDevice(account, id) {
      const [r] = await one(s(`SELECT ${DEVICE_COLUMNS} FROM devices WHERE account_id = $1::bytea AND id = $2::bytea`, bytea(account), bytea(id)), true);
      return r ? deviceRow(r) : null;
    },

    async listDevices(account) {
      return (await one(s(`SELECT ${DEVICE_COLUMNS} FROM devices WHERE account_id = $1::bytea ORDER BY created_day, id`, bytea(account)), true)).map(deviceRow);
    },

    async renameDevice(account, id, name) {
      return (
        (await one(s("UPDATE devices SET name = $3::bytea WHERE account_id = $1::bytea AND id = $2::bytea RETURNING 1 AS ok", bytea(account), bytea(id), bytea(name))))
          .length > 0
      );
    },

    async removeDevice(account, id) {
      return (await one(s("DELETE FROM devices WHERE account_id = $1::bytea AND id = $2::bytea RETURNING 1 AS ok", bytea(account), bytea(id)))).length > 0;
    },

    async putRecords(account, puts, day, maxTombstones): Promise<PutResult | "quota" | "missing"> {
      const n = puts.length;
      const input = JSON.stringify(puts.map((p, i) => ({ i, rid: hex(p.rid), base: p.base, blob: p.blob ? Buffer.from(p.blob).toString("base64") : null })));
      const a = bytea(account);
      let results: SqlResult[];
      try {
        results = await sql.run([
          // 1. The account's row locked, and n versions taken (some unused if their puts conflict: versions only need to grow).
          s("UPDATE accounts SET seq = seq + $2::int WHERE id = $1::bytea RETURNING seq", a, num(n)),
          // 2. The puts whose base is the record's version, written with the new versions in batch order.
          s(
            `WITH input AS (
               SELECT (e->>'i')::int AS i, decode(e->>'rid', 'hex') AS rid, (e->>'base')::bigint AS base,
                      CASE WHEN e->>'blob' IS NULL THEN NULL ELSE decode(e->>'blob', 'base64') END AS blob
               FROM jsonb_array_elements($2::jsonb) AS e
             ), ok AS (
               SELECT input.* FROM input LEFT JOIN records r ON r.account_id = $1::bytea AND r.rid = input.rid
               WHERE COALESCE(r.version, 0) = input.base
             )
             INSERT INTO records (account_id, rid, version, deleted, blob, size, changed_day)
             SELECT $1::bytea, ok.rid, (SELECT seq FROM accounts WHERE id = $1::bytea) - $3::int + ok.i + 1,
                    ok.blob IS NULL, ok.blob, COALESCE(length(ok.blob), 0), $4::int
             FROM ok WHERE EXISTS (SELECT 1 FROM accounts WHERE id = $1::bytea)
             ON CONFLICT (account_id, rid) DO UPDATE
               SET version = EXCLUDED.version, deleted = EXCLUDED.deleted, blob = EXCLUDED.blob, size = EXCLUDED.size, changed_day = EXCLUDED.changed_day
             RETURNING encode(rid, 'hex') AS rid, version`,
            a,
            input,
            num(n),
            num(day),
          ),
          // 3. The counters again; the quota checks refuse the whole batch.
          s(
            `UPDATE accounts SET bytes = t.bytes, records = t.n
             FROM (SELECT COALESCE(sum(size), 0)::bigint AS bytes, (count(*) FILTER (WHERE NOT deleted))::int AS n
                   FROM records WHERE account_id = $1::bytea) t
             WHERE accounts.id = $1::bytea`,
            a,
          ),
          // 4. Beyond the newest tombstones kept, the oldest go, and the purge mark moves up.
          s(
            `WITH doomed AS (
               SELECT rid FROM records WHERE account_id = $1::bytea AND deleted ORDER BY version DESC OFFSET $2::int
             ), gone AS (
               DELETE FROM records r USING doomed d WHERE r.account_id = $1::bytea AND r.rid = d.rid RETURNING r.version
             )
             UPDATE accounts SET floor = GREATEST(floor, (SELECT COALESCE(max(version), 0) FROM gone)) WHERE id = $1::bytea`,
            a,
            num(maxTombstones),
          ),
          // 5. The puts not applied: their records as they are (written before this batch).
          s(
            `SELECT encode(r.rid, 'hex') AS rid, r.version, r.deleted, encode(r.blob, 'base64') AS blob
             FROM records r
             WHERE r.account_id = $1::bytea
               AND r.rid IN (SELECT decode(e->>'rid', 'hex') FROM jsonb_array_elements($2::jsonb) AS e)
               AND r.version <= (SELECT seq FROM accounts WHERE id = $1::bytea) - $3::int`,
            a,
            input,
            num(n),
          ),
        ]);
      } catch (err) {
        if (err instanceof SqlError && err.code === "23514" && (err.constraint ?? "").startsWith("accounts_quota")) return "quota";
        throw err;
      }
      if (!results[0].rows.length) return "missing";
      const applied = objects(results[1]).map((r) => ({ rid: fromHex(r.rid ?? "")!, version: needNum(r.version) }));
      const done = new Set(applied.map((x) => hex(x.rid)));
      const current = new Map(objects(results[4]).map((r) => [r.rid ?? "", r]));
      const conflicts = puts
        .filter((p) => !done.has(hex(p.rid)))
        .map((p) => {
          const r = current.get(hex(p.rid));
          return r
            ? { rid: p.rid, version: needNum(r.version), deleted: readBool(r.deleted), blob: readBase64(r.blob) }
            : { rid: p.rid, version: 0, deleted: false, blob: null };
        });
      return { applied, conflicts };
    },

    async changes(account, cursor, limit, maxBytes): Promise<ChangesResult | null> {
      const [head, page] = await sql.run(
        [
          s("SELECT floor, seq FROM accounts WHERE id = $1::bytea", bytea(account)),
          s(
            `SELECT encode(rid, 'hex') AS rid, version, deleted,
                    CASE WHEN running - size < $4::bigint THEN encode(blob, 'base64') END AS blob,
                    (running - size < $4::bigint) AS fits
             FROM (
               SELECT rid, version, deleted, blob, size, sum(size) OVER (ORDER BY version) AS running
               FROM records
               WHERE account_id = $1::bytea AND version > $2::bigint AND ($2::bigint > 0 OR NOT deleted)
               ORDER BY version
               LIMIT $3::int
             ) x
             ORDER BY version`,
            bytea(account),
            num(cursor),
            num(limit + 1),
            num(maxBytes),
          ),
        ],
        { readOnly: true },
      );
      const [acc] = objects(head);
      if (!acc) return null;
      if (cursor > 0 && cursor < needNum(acc.floor)) return { rows: [], more: true, reset: true };
      const inner = objects(page);
      const rows: ChangesResult["rows"] = [];
      for (const r of inner) {
        if (!readBool(r.fits) || rows.length >= limit) break;
        rows.push({ rid: fromHex(r.rid ?? "")!, version: needNum(r.version), deleted: readBool(r.deleted), blob: readBase64(r.blob) });
      }
      return { rows, more: rows.length < inner.length, reset: false };
    },

    async openLink(link) {
      await one(
        s(
          `INSERT INTO links (${LINK_COLUMNS}) VALUES ($1::bytea, $2::int, $3::text, $4::bytea, $5::bytea, $6::bytea, $7::bytea, $8::bytea, $9::bytea)`,
          bytea(link.id),
          num(link.day),
          link.opener,
          bytea(link.account),
          bytea(link.giverEpk),
          bytea(link.takerEpk),
          bytea(link.takerKey),
          bytea(link.sealed),
          bytea(link.device),
        ),
      );
    },

    async getLink(id) {
      const [r] = await one(s(`SELECT ${LINK_COLUMNS} FROM links WHERE id = $1::bytea`, bytea(id)), true);
      return r ? linkRow(r) : null;
    },

    async joinLink(id, side) {
      const [r] =
        "giverEpk" in side
          ? await one(
              s(
                `UPDATE links SET giver_epk = $2::bytea, account_id = $3::bytea
                 WHERE id = $1::bytea AND opener = 'taker' AND giver_epk IS NULL AND EXISTS (SELECT 1 FROM accounts WHERE id = $3::bytea)
                 RETURNING ${LINK_COLUMNS}`,
                bytea(id),
                bytea(side.giverEpk),
                bytea(side.account),
              ),
            )
          : await one(
              s(
                `UPDATE links SET taker_epk = $2::bytea, taker_key = $3::bytea
                 WHERE id = $1::bytea AND opener = 'giver' AND taker_epk IS NULL
                 RETURNING ${LINK_COLUMNS}`,
                bytea(id),
                bytea(side.takerEpk),
                bytea(side.takerKey),
              ),
            );
      return r ? linkRow(r) : null;
    },

    async giveLink(id, account, sealed, device, maxDevices) {
      const results = await sql.run([
        s(LOCK_ACCOUNT, bytea(account)),
        s(
          `WITH l AS (
             UPDATE links SET sealed = $3::bytea, device_id = $4::bytea
             WHERE id = $1::bytea AND account_id = $2::bytea AND sealed IS NULL
               AND giver_epk IS NOT NULL AND taker_epk IS NOT NULL AND taker_key IS NOT NULL
             RETURNING taker_key
           )
           INSERT INTO devices (${DEVICE_COLUMNS})
           SELECT $2::bytea, $4::bytea, taker_key, NULL, $5::int, $5::int FROM l RETURNING 1 AS ok`,
          bytea(id),
          bytea(account),
          bytea(sealed),
          bytea(device.id),
          num(device.createdDay),
        ),
        s(EVICT_DEVICES, bytea(account), bytea(device.id), num(maxDevices)),
      ]);
      return results[1].rows.length > 0;
    },

    async takeLink(id) {
      const [r] = await one(s(`DELETE FROM links WHERE id = $1::bytea AND sealed IS NOT NULL RETURNING ${LINK_COLUMNS}`, bytea(id)));
      return r ? linkRow(r) : null;
    },

    async closeLink(id) {
      await one(s("DELETE FROM links WHERE id = $1::bytea", bytea(id)));
    },

    async cleanup(today, keep) {
      const count = (results: SqlResult[]) => needNum(objects(results.at(-1)!)[0]?.n ?? "0");
      const accounts = count(
        await sql.run([s("WITH d AS (DELETE FROM accounts WHERE seen_day < $1::int RETURNING 1) SELECT count(*)::int AS n FROM d", num(today - keep.inactive))]),
      );
      const before = num(today - keep.tombstones);
      const tombstones = count(
        await sql.run([
          // The accounts first, in one order, as a batch of writes locks them: no deadlock with a sync.
          s("SELECT 1 FROM accounts WHERE id IN (SELECT DISTINCT account_id FROM records WHERE deleted AND changed_day < $1::int) ORDER BY id FOR UPDATE", before),
          s(
            `WITH gone AS (DELETE FROM records WHERE deleted AND changed_day < $1::int RETURNING account_id, version),
                  tops AS (SELECT account_id, max(version) AS top, count(*) AS n FROM gone GROUP BY account_id),
                  moved AS (UPDATE accounts a SET floor = GREATEST(a.floor, t.top) FROM tops t WHERE a.id = t.account_id RETURNING 1)
             SELECT COALESCE(sum(n), 0)::int AS n FROM tops`,
            before,
          ),
        ]),
      );
      const spent = count(await sql.run([s("WITH d AS (DELETE FROM spent WHERE day < $1::int RETURNING 1) SELECT count(*)::int AS n FROM d", num(today - keep.spent))]));
      const links = count(await sql.run([s("WITH d AS (DELETE FROM links WHERE day < $1::int RETURNING 1) SELECT count(*)::int AS n FROM d", num(today - keep.links))]));
      return { accounts, tombstones, spent, links };
    },
  };
}
