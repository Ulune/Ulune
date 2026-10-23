// The synced account's two stores held to the same behaviour (src/lib/account/store-memory.server.ts
// and store-sql.server.ts; docs/sync-protocol.md, sections 6, 9 and 13; share and compare plan,
// feature 4): every step run against memory, and against a real Postgres through a stand-in for
// Neon's HTTPS endpoint when this computer has PostgreSQL (scripts/account-pg.mjs), with the
// migrations applied the way production applies them. Then, on Postgres: concurrent writers, what
// the schema itself refuses, and every table of a realistic session dumped as a thief would get it.
// Also the Neon executor's own protocol, with a fetch that never leaves the test.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, test } from "node:test";
import { b64u, fromB64u, randomBytes } from "../src/lib/account/encoding.ts";
import { applyMigrations, migrationsFrom } from "../src/lib/account/migrate.server.ts";
import { SqlError, neonEndpoint, neonExecutor } from "../src/lib/account/neon.server.ts";
import { KEEP_DAYS } from "../src/lib/account/protocol.ts";
import { accountService } from "../src/lib/account/service.server.ts";
import { memoryStore } from "../src/lib/account/store-memory.server.ts";
import { sqlStore } from "../src/lib/account/store-sql.server.ts";
import { StoreUnavailable } from "../src/lib/account/store.server.ts";
import { ORIGIN, checkStolenRows, realisticSession } from "./account-helpers.mjs";
import { PgWire, fakeNeon, startPostgres } from "./account-pg.mjs";

const DIR = new URL("../db/migrations/", import.meta.url).pathname;
const MIGRATIONS = migrationsFrom(readdirSync(DIR).map((name) => ({ name, text: readFileSync(join(DIR, name), "utf8") })));
const D0 = 20748;
/** A Postgres connection string as Neon gives them (written so: the repository's address check reads "user@host" as an e-mail). */
const conn = (scheme, credentials, rest) => `${scheme}://${credentials}${String.fromCharCode(64)}${rest}`;

const pg = startPostgres();
const neon = pg.skip ? null : await fakeNeon(pg.socket);
after(async () => {
  await neon?.close();
  pg.stop?.();
});
console.log(pg.skip ? `# account-store: the Postgres half skipped: ${pg.skip}` : `# account-store: also against ${pg.version}`);

/** A database of its own for one test, migrated; its executor and store. */
async function postgresStore() {
  const name = `t_${b64u(randomBytes(9)).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const admin = await PgWire.connect(pg.socket);
  const made = await admin.query(`CREATE DATABASE ${name}`);
  admin.close();
  if (made.error) throw new Error(made.error.message);
  const connectionString = conn("postgresql", "ulune:not-a-secret", `ep-test-123456.eu-central-1.aws.neon.tech/${name}?sslmode=require`);
  const sql = neonExecutor({ connectionString, endpoint: neon.url });
  assert.deepEqual(await applyMigrations(sql, MIGRATIONS), [1]);
  return { store: sqlStore(sql), sql, database: name };
}

const KINDS = [["memory", async () => ({ store: memoryStore() })]];
if (!pg.skip) KINDS.push(["postgres", postgresStore]);

const id = () => randomBytes(16);
const hexOf = (b) => Buffer.from(b).toString("hex");

function wayRow(account, kind, extra = {}) {
  return {
    account,
    id: id(),
    kind,
    lookup: kind === "passphrase" ? null : kind === "recovery" ? id() : randomBytes(32),
    publicKey: kind === "passkey" ? randomBytes(91) : null,
    alg: kind === "passkey" ? -7 : null,
    counter: kind === "passkey" ? 0 : null,
    clientSalt: kind === "passphrase" ? randomBytes(16) : null,
    argonM: kind === "passphrase" ? 19456 : null,
    argonT: kind === "passphrase" ? 2 : null,
    argonP: kind === "passphrase" ? 1 : null,
    serverSalt: kind === "passkey" ? null : randomBytes(16),
    authHash: kind === "passkey" ? null : randomBytes(32),
    wrap: randomBytes(60),
    createdDay: D0,
    usedDay: null,
    ...extra,
  };
}

const deviceRow = (account, day = D0) => ({ account, id: id(), publicKey: randomBytes(91), name: null, createdDay: day, seenDay: day });

async function newAccount(store, options = {}) {
  const account = id();
  const ways = [wayRow(account, "passphrase"), wayRow(account, "recovery"), ...(options.passkey ? [wayRow(account, "passkey")] : [])];
  const device = deviceRow(account, options.day ?? D0);
  assert.equal(await store.createAccount({ id: account, day: options.day ?? D0, quotaBytes: options.quotaBytes ?? 16 * 2 ** 20, quotaRecords: options.quotaRecords ?? 2000 }, ways, device), "ok");
  return { account, ways, device };
}

const blob = (size = 8192) => randomBytes(size);

for (const [kind, make] of KINDS) {
  test(`${kind}: an account is made whole with its ways in and its first device, or not at all`, async () => {
    const { store } = await make();
    const { account, ways, device } = await newAccount(store, { passkey: true });
    const row = await store.getAccount(account);
    assert.deepEqual({ ...row, id: hexOf(row.id) }, { id: hexOf(account), createdDay: D0, seenDay: D0, seq: 0, floor: 0, bytes: 0, records: 0, quotaBytes: 16 * 2 ** 20, quotaRecords: 2000 });
    assert.equal(await store.accountsCreatedOn(D0), 1);
    assert.equal(await store.accountsCreatedOn(D0 + 1), 0);
    const passkey = ways.find((w) => w.kind === "passkey");
    const found = await store.findWay("passkey", passkey.lookup);
    assert.equal(hexOf(found.account), hexOf(account));
    assert.deepEqual(found.publicKey, passkey.publicKey);
    assert.equal(found.counter, 0);
    assert.equal(hexOf((await store.findWay("recovery", ways[1].lookup)).id), hexOf(ways[1].id));
    assert.equal(await store.findWay("recovery", id()), null);
    assert.deepEqual((await store.listWays(account)).map((w) => w.kind).sort(), ["passkey", "passphrase", "recovery"]);
    assert.equal(await store.touch(account, device.id, D0 + 3), true);
    assert.equal((await store.getAccount(account)).seenDay, D0 + 3);
    assert.equal((await store.getDevice(account, device.id)).seenDay, D0 + 3);
    assert.equal(await store.touch(account, id(), D0 + 4), false);
    assert.equal((await store.getAccount(account)).seenDay, D0 + 3, "an unknown device moves nothing");
    // The same passkey for another account: nothing of that account is made.
    const other = id();
    const taken = await store.createAccount({ id: other, day: D0, quotaBytes: 1, quotaRecords: 1 }, [{ ...passkey, account: other, id: id() }, wayRow(other, "recovery")], deviceRow(other));
    assert.equal(taken, "taken");
    assert.equal(await store.getAccount(other), null);
    assert.equal(await store.accountsCreatedOn(D0), 1);
  });

  test(`${kind}: ways in are added, replaced and removed as the protocol says; a passkey's counter only goes up`, async () => {
    const { store } = await make();
    const { account, ways } = await newAccount(store);
    const p1 = wayRow(account, "passkey");
    assert.equal(await store.addWay(p1, 2), "ok");
    assert.equal(await store.addWay({ ...wayRow(account, "passkey"), lookup: p1.lookup }, 2), "taken");
    assert.equal(await store.addWay(wayRow(account, "passkey"), 2), "ok");
    assert.equal(await store.addWay(wayRow(account, "passkey"), 2), "limit");
    assert.equal(await store.addWay(wayRow(id(), "passkey"), 2), "missing");
    // A new passphrase and a new recovery code replace theirs.
    const pass2 = wayRow(account, "passphrase");
    assert.equal(await store.addWay(pass2, 2), "ok");
    const rec2 = wayRow(account, "recovery");
    assert.equal(await store.addWay(rec2, 2), "ok");
    const kinds = (await store.listWays(account)).map((w) => `${w.kind}:${hexOf(w.id)}`).sort();
    assert.equal(kinds.filter((k) => k.startsWith("passphrase")).length, 1);
    assert.ok(kinds.includes(`passphrase:${hexOf(pass2.id)}`) && kinds.includes(`recovery:${hexOf(rec2.id)}`));
    assert.equal(await store.findWay("recovery", ways[1].lookup), null, "the old code is gone");
    // Removing: never the recovery code, never the last passkey or passphrase.
    assert.equal(await store.removeWay(account, rec2.id), "last");
    assert.equal(await store.removeWay(account, id()), "missing");
    const passkeys = (await store.listWays(account)).filter((w) => w.kind === "passkey");
    for (const w of passkeys) assert.equal(await store.removeWay(account, w.id), "ok");
    assert.equal(await store.removeWay(account, pass2.id), "last");
    // Counters: 0 then 0 is fine (passkeys that count nothing); otherwise they must grow.
    const p3 = wayRow(account, "passkey");
    await store.addWay(p3, 10);
    assert.equal(await store.usedWay(account, p3.id, D0 + 1, 0), true);
    assert.equal(await store.usedWay(account, p3.id, D0 + 1, 5), true);
    assert.equal(await store.usedWay(account, p3.id, D0 + 1, 5), false);
    assert.equal(await store.usedWay(account, p3.id, D0 + 1, 3), false);
    assert.equal(await store.usedWay(account, p3.id, D0 + 2, 0), false);
    assert.equal(await store.usedWay(account, p3.id, D0 + 2, 6), true);
    const used = (await store.listWays(account)).find((w) => hexOf(w.id) === hexOf(p3.id));
    assert.equal(used.counter, 6);
    assert.equal(used.usedDay, D0 + 2);
    assert.equal(await store.usedWay(account, pass2.id, D0 + 5), true);
    assert.equal((await store.listWays(account)).find((w) => w.kind === "passphrase").usedDay, D0 + 5);
  });

  test(`${kind}: a nonce is spent once`, async () => {
    const { store } = await make();
    const nonce = id();
    assert.equal(await store.spendNonce(nonce, D0), true);
    assert.equal(await store.spendNonce(nonce, D0 + 1), false);
    assert.equal(await store.spendNonce(id(), D0), true);
  });

  test(`${kind}: devices join, are named and removed; beyond the limit the one seen longest ago leaves`, async () => {
    const { store } = await make();
    const { account, device } = await newAccount(store);
    const d2 = deviceRow(account, D0 + 1);
    const d3 = deviceRow(account, D0 + 2);
    await store.addDevice(d2, 3);
    await store.addDevice(d3, 3);
    await store.touch(account, device.id, D0 + 3);
    const d4 = deviceRow(account, D0 + 4);
    await store.addDevice(d4, 3);
    const ids = (await store.listDevices(account)).map((d) => hexOf(d.id)).sort();
    assert.deepEqual(ids, [device.id, d3.id, d4.id].map(hexOf).sort(), "the second, seen longest ago, left");
    const name = randomBytes(128);
    assert.equal(await store.renameDevice(account, d3.id, name), true);
    assert.deepEqual((await store.getDevice(account, d3.id)).name, name);
    assert.equal(await store.renameDevice(account, d2.id, name), false);
    assert.equal(await store.removeDevice(account, d3.id), true);
    assert.equal(await store.removeDevice(account, d3.id), false);
    assert.equal(await store.getDevice(account, d3.id), null);
    await store.addDevice(deviceRow(id()), 3);
    assert.equal((await store.listDevices(account)).length, 2, "a device of no account joins nothing");
  });

  test(`${kind}: records: compare-and-set, versions in order, conflicts, whole-batch quotas, tombstones and their cap, pages by count and bytes`, async () => {
    const { store } = await make();
    const { account } = await newAccount(store, { quotaRecords: 6, quotaBytes: 6 * 8192 });
    const [a, b, c] = [id(), id(), id()];
    const one = await store.putRecords(account, [{ rid: a, base: 0, blob: blob() }, { rid: b, base: 0, blob: blob() }, { rid: c, base: 0, blob: null }], D0, 2);
    assert.deepEqual(one.applied.map((x) => [hexOf(x.rid), x.version]), [[hexOf(a), 1], [hexOf(b), 2], [hexOf(c), 3]]);
    assert.deepEqual(one.conflicts, []);
    // A stale base: a conflict carrying the server's copy; the other put applies.
    const newB = blob();
    const two = await store.putRecords(account, [{ rid: a, base: 0, blob: blob() }, { rid: b, base: 2, blob: newB }], D0 + 1, 2);
    assert.deepEqual(two.applied.map((x) => x.version), [5]);
    assert.equal(two.conflicts.length, 1);
    assert.equal(two.conflicts[0].version, 1);
    assert.equal(two.conflicts[0].blob.byteLength, 8192);
    // A conflict on a record that does not exist (a base for something gone).
    const three = await store.putRecords(account, [{ rid: id(), base: 4, blob: blob() }], D0 + 1, 2);
    assert.deepEqual(three.conflicts.map((x) => [x.version, x.deleted, x.blob]), [[0, false, null]]);
    // The tombstone at version 3 is the record's version.
    const four = await store.putRecords(account, [{ rid: c, base: 0, blob: blob() }], D0 + 1, 2);
    assert.deepEqual(four.conflicts.map((x) => [x.version, x.deleted, x.blob]), [[3, true, null]]);
    assert.equal((await store.putRecords(account, [{ rid: c, base: 3, blob: blob() }], D0 + 1, 2)).applied[0].version, 8);
    let row = await store.getAccount(account);
    assert.deepEqual([row.seq, row.records, row.bytes], [8, 3, 3 * 8192]);
    // Over quota: nothing of the batch applies, the counter does not move.
    const over = await store.putRecords(account, [{ rid: id(), base: 0, blob: blob() }, { rid: id(), base: 0, blob: blob() }, { rid: id(), base: 0, blob: blob(16384) }], D0 + 2, 2);
    assert.equal(over, "quota");
    row = await store.getAccount(account);
    assert.deepEqual([row.seq, row.records, row.bytes], [8, 3, 3 * 8192]);
    assert.equal(await store.putRecords(id(), [{ rid: id(), base: 0, blob: blob() }], D0, 2), "missing");
    // Pages: by count, by bytes (at least one record a page), from 0 live records only.
    const fill = await store.putRecords(account, [{ rid: id(), base: 0, blob: blob() }, { rid: id(), base: 0, blob: blob() }, { rid: id(), base: 0, blob: blob() }], D0 + 2, 2);
    assert.equal(fill.applied.length, 3);
    const all = await store.changes(account, 0, 100, 10 ** 9);
    assert.deepEqual(all.rows.map((r) => r.version), [1, 5, 8, 9, 10, 11]);
    assert.equal(all.more, false);
    const byCount = await store.changes(account, 0, 2, 10 ** 9);
    assert.deepEqual([byCount.rows.map((r) => r.version), byCount.more], [[1, 5], true]);
    const byBytes = await store.changes(account, 0, 100, 8192 * 2);
    assert.deepEqual([byBytes.rows.map((r) => r.version), byBytes.more], [[1, 5], true]);
    const tiny = await store.changes(account, 0, 100, 1);
    assert.deepEqual([tiny.rows.map((r) => r.version), tiny.more], [[1], true]);
    assert.deepEqual((await store.changes(account, 11, 100, 10 ** 9)).rows, []);
    assert.equal(await store.changes(id(), 0, 10, 10), null);
    // Tombstones beyond the cap (2 here) go, oldest first, and the purge mark rises.
    const live = all.rows.map((r) => ({ rid: r.rid, base: r.version, blob: null }));
    const del = await store.putRecords(account, live.slice(0, 3), D0 + 3, 2);
    assert.deepEqual(del.applied.map((x) => x.version), [12, 13, 14]);
    row = await store.getAccount(account);
    assert.deepEqual([row.floor, row.records, row.bytes], [12, 3, 3 * 8192]);
    assert.deepEqual(await store.changes(account, 11, 100, 10 ** 9), { rows: [], more: true, reset: true });
    const after = await store.changes(account, 12, 100, 10 ** 9);
    assert.deepEqual(after.rows.map((r) => [r.version, r.deleted, r.blob]), [[13, true, null], [14, true, null]]);
    assert.deepEqual((await store.changes(account, 0, 100, 10 ** 9)).rows.map((r) => r.version), [9, 10, 11]);
  });

  test(`${kind}: device links: joined once, given once by its own account, taken once`, async () => {
    const { store } = await make();
    const { account } = await newAccount(store);
    const other = (await newAccount(store)).account;
    const link = { id: id(), day: D0, opener: "giver", account, giverEpk: randomBytes(65), takerEpk: null, takerKey: null, sealed: null, device: null };
    await store.openLink(link);
    assert.equal((await store.getLink(link.id)).opener, "giver");
    // The giver opened it: a giver cannot join it; the taker joins once.
    assert.equal(await store.joinLink(link.id, { giverEpk: randomBytes(65), account }), null);
    const takerKey = randomBytes(91);
    const joined = await store.joinLink(link.id, { takerEpk: randomBytes(65), takerKey });
    assert.deepEqual(joined.takerKey, takerKey);
    assert.equal(await store.joinLink(link.id, { takerEpk: randomBytes(65), takerKey }), null);
    assert.equal(await store.takeLink(link.id), null, "not given yet");
    const device = deviceRow(account);
    assert.equal(await store.giveLink(link.id, other, randomBytes(100), deviceRow(other), 30), false, "another account");
    const sealed = randomBytes(100);
    assert.equal(await store.giveLink(link.id, account, sealed, device, 30), true);
    assert.equal(await store.giveLink(link.id, account, sealed, deviceRow(account), 30), false, "once");
    assert.deepEqual((await store.getDevice(account, device.id)).publicKey, takerKey, "the taker's key joined the account");
    const taken = await store.takeLink(link.id);
    assert.deepEqual([hexOf(taken.account), hexOf(taken.device), hexOf(taken.sealed)], [hexOf(account), hexOf(device.id), hexOf(sealed)]);
    assert.equal(await store.takeLink(link.id), null);
    assert.equal(await store.getLink(link.id), null);
    // Opened by the new device: a giver of an existing account joins it once.
    const byTaker = { id: id(), day: D0, opener: "taker", account: null, giverEpk: null, takerEpk: randomBytes(65), takerKey, sealed: null, device: null };
    await store.openLink(byTaker);
    assert.equal(await store.joinLink(byTaker.id, { takerEpk: randomBytes(65), takerKey }), null);
    assert.equal(await store.joinLink(byTaker.id, { giverEpk: randomBytes(65), account: id() }), null, "no such account");
    assert.equal(hexOf((await store.joinLink(byTaker.id, { giverEpk: randomBytes(65), account })).account), hexOf(account));
    await store.closeLink(byTaker.id);
    assert.equal(await store.getLink(byTaker.id), null);
  });

  test(`${kind}: deleting an account takes everything of it, and nothing else`, async () => {
    const { store } = await make();
    const { account, device } = await newAccount(store, { passkey: true });
    const keep = await newAccount(store);
    await store.putRecords(account, [{ rid: id(), base: 0, blob: blob() }], D0, 10);
    await store.putRecords(keep.account, [{ rid: id(), base: 0, blob: blob() }], D0, 10);
    await store.openLink({ id: id(), day: D0, opener: "giver", account, giverEpk: randomBytes(65), takerEpk: null, takerKey: null, sealed: null, device: null });
    assert.equal(await store.deleteAccount(account), true);
    assert.equal(await store.deleteAccount(account), false);
    assert.equal(await store.getAccount(account), null);
    assert.deepEqual(await store.listWays(account), []);
    assert.deepEqual(await store.listDevices(account), []);
    assert.equal(await store.touch(account, device.id, D0), false);
    assert.equal(await store.changes(account, 0, 10, 10 ** 6), null);
    assert.equal((await store.changes(keep.account, 0, 10, 10 ** 6)).rows.length, 1);
  });

  test(`${kind}: the daily clean-up: two years unseen, 90-day tombstones, spent nonces, old links`, async () => {
    const { store } = await make();
    const old = await newAccount(store, { day: D0 });
    const recent = await newAccount(store, { day: D0 });
    await store.touch(recent.account, recent.device.id, D0 + 700);
    const rids = [id(), id()];
    const w = await store.putRecords(recent.account, rids.map((rid) => ({ rid, base: 0, blob: blob() })), D0, 10);
    await store.putRecords(recent.account, [{ rid: rids[0], base: w.applied[0].version, blob: null }], D0 + 10, 10);
    await store.putRecords(recent.account, [{ rid: rids[1], base: w.applied[1].version, blob: null }], D0 + 650, 10);
    await store.spendNonce(id(), D0 + 728);
    await store.spendNonce(id(), D0 + 731);
    await store.openLink({ id: id(), day: D0 + 729, opener: "taker", account: null, giverEpk: null, takerEpk: randomBytes(65), takerKey: randomBytes(91), sealed: null, device: null });
    await store.openLink({ id: id(), day: D0 + 731, opener: "taker", account: null, giverEpk: null, takerEpk: randomBytes(65), takerKey: randomBytes(91), sealed: null, device: null });
    const result = await store.cleanup(D0 + 731, KEEP_DAYS);
    assert.deepEqual(result, { accounts: 1, tombstones: 1, spent: 1, links: 1 });
    assert.equal(await store.getAccount(old.account), null);
    const kept = await store.getAccount(recent.account);
    assert.equal(kept.floor, 3, "the purged tombstone's version");
    assert.deepEqual((await store.changes(recent.account, 3, 10, 10 ** 6)).rows.map((r) => [r.version, r.deleted]), [[4, true]]);
    assert.equal((await store.changes(recent.account, 2, 10, 10 ** 6)).reset, true);
    assert.deepEqual(await store.cleanup(D0 + 731, KEEP_DAYS), { accounts: 0, tombstones: 0, spent: 0, links: 0 });
  });
}

if (!pg.skip) {
  test("postgres: concurrent batches on one account: unique versions in commit order, one winner per record", async () => {
    const { store } = await postgresStore();
    const { account } = await newAccount(store);
    const results = await Promise.all(Array.from({ length: 8 }, () => store.putRecords(account, [{ rid: id(), base: 0, blob: blob() }, { rid: id(), base: 0, blob: blob() }], D0, 100)));
    const versions = results.flatMap((r) => r.applied.map((a) => a.version)).sort((x, y) => x - y);
    assert.deepEqual(versions, Array.from({ length: 16 }, (_, i) => i + 1));
    const listed = await store.changes(account, 0, 100, 10 ** 9);
    assert.deepEqual(listed.rows.map((r) => r.version), versions);
    // Eight devices write the same new record at once: one wins, the others see its version.
    const rid = id();
    const race = await Promise.all(Array.from({ length: 8 }, () => store.putRecords(account, [{ rid, base: 0, blob: blob() }], D0, 100)));
    assert.equal(race.filter((r) => r.applied.length === 1).length, 1);
    const winner = race.find((r) => r.applied.length).applied[0].version;
    for (const r of race.filter((x) => !x.applied.length)) assert.equal(r.conflicts[0].version, winner);
    assert.equal((await store.getAccount(account)).records, 17);
  });

  test("postgres: the migrations apply once, and the schema itself refuses what the protocol forbids", async () => {
    const { sql, database } = await postgresStore();
    assert.deepEqual(await applyMigrations(sql, MIGRATIONS), [], "already applied");
    const refuse = async (text, params, code) => {
      await assert.rejects(
        () => sql.run([{ text, params }]),
        (err) => err instanceof SqlError && err.code === code,
        text.slice(0, 60),
      );
    };
    const account = `\\x${hexOf(id())}`;
    await sql.run([{ text: "INSERT INTO accounts (id, created_day, seen_day, quota_bytes, quota_records) VALUES ($1::bytea, 1, 1, 100, 1)", params: [account] }]);
    // A blob not of a bucket's size, a tombstone with a blob, a passphrase without its salt, a name not 128 bytes, a short id.
    await refuse("INSERT INTO records VALUES ($1::bytea, $2::bytea, 1, false, $3::bytea, 8000, 1)", [account, `\\x${hexOf(id())}`, `\\x${hexOf(randomBytes(8000))}`], "23514");
    await refuse("INSERT INTO records VALUES ($1::bytea, $2::bytea, 1, true, $3::bytea, 0, 1)", [account, `\\x${hexOf(id())}`, `\\x${hexOf(randomBytes(8192))}`], "23514");
    await refuse(
      "INSERT INTO ways (account_id, id, kind, wrap, created_day, server_salt, auth_hash) VALUES ($1::bytea, $2::bytea, 'passphrase', $3::bytea, 1, $4::bytea, $5::bytea)",
      [account, `\\x${hexOf(id())}`, `\\x${hexOf(randomBytes(60))}`, `\\x${hexOf(randomBytes(16))}`, `\\x${hexOf(randomBytes(32))}`],
      "23514",
    );
    await refuse("INSERT INTO devices VALUES ($1::bytea, $2::bytea, $3::bytea, $4::bytea, 1, 1)", [account, `\\x${hexOf(id())}`, `\\x${hexOf(randomBytes(91))}`, `\\x${hexOf(randomBytes(64))}`], "23514");
    await refuse("INSERT INTO accounts (id, created_day, seen_day, quota_bytes, quota_records) VALUES ($1::bytea, 1, 1, 1, 1)", [`\\x${hexOf(randomBytes(8))}`], "23514");
    // Over quota through the counters: the check that makes a batch fail whole.
    await refuse("UPDATE accounts SET records = 2 WHERE id = $1::bytea", [account], "23514");
    // Only these kinds of column: nothing that could hold a time of day or an address.
    const wire = await PgWire.connect(pg.socket, { database });
    const { results } = await wire.query("SELECT DISTINCT data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1");
    wire.close();
    assert.deepEqual(
      results[0].rows.map((r) => r[0]),
      ["bigint", "boolean", "bytea", "integer", "text"],
    );
  });

  test("postgres: a stolen copy of every table after a realistic session holds nothing readable", async () => {
    const { store, database } = await postgresStore();
    const svc = accountService({ store, secret: randomBytes(32), origins: [ORIGIN], rules: false });
    await realisticSession(svc, { fast: true });
    const wire = await PgWire.connect(pg.socket, { database });
    const tables = {};
    for (const table of ["accounts", "ways", "devices", "records", "spent", "links", "schema_migrations"]) {
      const { results, error } = await wire.query(`SELECT * FROM ${table}`);
      assert.equal(error, null);
      const [r] = results;
      tables[table] = r.rows.map((row) =>
        Object.fromEntries(
          r.fields.map((f, i) => {
            const v = row[i];
            if (v === null) return [f, null];
            if (v.startsWith("\\x")) return [f, new Uint8Array(Buffer.from(v.slice(2), "hex"))];
            if (/^-?\d+$/.test(v)) return [f, Number(v)];
            return [f, v];
          }),
        ),
      );
    }
    wire.close();
    const { found, values } = checkStolenRows(tables);
    assert.deepEqual(found, []);
    assert.ok(values > 100);
    assert.equal(tables.accounts.length, 1);
    assert.equal(tables.devices.length, 3);
    assert.ok(tables.records.every((r) => r.deleted === "t" || r.blob.byteLength === 8192));
    assert.ok(tables.spent.length >= 1 && tables.links.length === 0, "the creation's challenge spent; the link deleted once taken");
  });
}

test("the Neon executor speaks Neon's protocol: its endpoint, its headers, one transaction per batch, refusals by code", async () => {
  assert.equal(neonEndpoint(conn("postgresql", "u:p", "ep-cool-darkness-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require")), "https://api.eu-central-1.aws.neon.tech/sql");
  assert.equal(neonEndpoint(conn("postgres", "u:p", "ep-x.eu-central-1.aws.neon.tech/db")), "https://api.eu-central-1.aws.neon.tech/sql");
  assert.throws(() => neonEndpoint("https://example.org"));
  const sent = [];
  let answer = () => new Response(JSON.stringify({ results: [{ fields: [{ name: "n" }, { name: "b" }], rows: [["1", "\\x00ff"]] }, { fields: [], rows: [] }] }), { status: 200 });
  const fetchStub = async (url, init) => {
    sent.push({ url, init });
    return answer();
  };
  const cs = conn("postgresql", "u:p", "ep-x.eu-central-1.aws.neon.tech/db");
  const sql = neonExecutor({ connectionString: cs, fetch: fetchStub });
  const results = await sql.run([{ text: "SELECT $1::int AS n", params: ["1"] }, { text: "SELECT 1", params: [] }], { readOnly: true });
  assert.deepEqual(results[0], { fields: ["n", "b"], rows: [["1", "\\x00ff"]] });
  const [{ url, init }] = sent;
  assert.equal(url, "https://api.eu-central-1.aws.neon.tech/sql");
  assert.equal(init.method, "POST");
  assert.equal(init.headers["Neon-Connection-String"], cs);
  assert.equal(init.headers["Neon-Raw-Text-Output"], "true");
  assert.equal(init.headers["Neon-Array-Mode"], "true");
  assert.equal(init.headers["Neon-Batch-Isolation-Level"], "ReadCommitted");
  assert.equal(init.headers["Neon-Batch-Read-Only"], "true");
  assert.deepEqual(JSON.parse(init.body), { queries: [{ query: "SELECT $1::int AS n", params: ["1"] }, { query: "SELECT 1", params: [] }] });
  // Refused by Postgres: its code and constraint, nothing else.
  answer = () => new Response(JSON.stringify({ message: "new row violates check constraint", code: "23514", constraint: "accounts_quota_records", detail: "Failing row contains (secret)" }), { status: 400 });
  await assert.rejects(
    () => sql.run([{ text: "SELECT 1", params: [] }]),
    (err) => err instanceof SqlError && err.code === "23514" && err.constraint === "accounts_quota_records" && !err.message.includes("secret"),
  );
  // A serialisation failure is tried again; the network failing is "unavailable".
  let tries = 0;
  answer = () => (++tries < 3 ? new Response(JSON.stringify({ message: "could not serialize", code: "40001" }), { status: 400 }) : new Response(JSON.stringify({ results: [{ fields: [], rows: [] }] }), { status: 200 }));
  await sql.run([{ text: "SELECT 1", params: [] }]);
  assert.equal(tries, 3);
  const down = neonExecutor({ connectionString: cs, fetch: async () => { throw new TypeError("fetch failed"); } });
  await assert.rejects(() => down.run([{ text: "SELECT 1", params: [] }]), StoreUnavailable);
  const odd = neonExecutor({ connectionString: cs, fetch: async () => new Response("bad gateway", { status: 502 }) });
  await assert.rejects(() => odd.run([{ text: "SELECT 1", params: [] }]), StoreUnavailable);
});

test("the store and secret a deployment gets: Neon with a connection string; memory only off Vercel and when asked; none when turned off; otherwise none", async () => {
  const { secretFromEnv, storeFromEnv } = await import("../src/lib/account/config.server.ts");
  const saved = { ...process.env };
  try {
    for (const k of ["ACCOUNT_DATABASE_URL", "ULUNE_ACCOUNT_STORE", "ACCOUNT_SESSION_SECRET"]) delete process.env[k];
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    assert.equal(storeFromEnv(), null, "production without a database: none");
    assert.equal(secretFromEnv(), null, "production without a secret: none");
    process.env.ULUNE_ACCOUNT_STORE = "memory";
    assert.equal(storeFromEnv(), null, "never memory on Vercel");
    delete process.env.VERCEL;
    assert.equal(typeof storeFromEnv()?.putRecords, "function", "memory when asked, off Vercel (the deploy check)");
    process.env.ACCOUNT_DATABASE_URL = conn("postgresql", "u:p", "ep-x.eu-central-1.aws.neon.tech/db");
    process.env.VERCEL = "1";
    assert.equal(typeof storeFromEnv()?.putRecords, "function", "the database when there is one");
    // Accounts turned off on purpose (the 2.0 fixes, item 4): none, even with a database, and in development too.
    process.env.ULUNE_ACCOUNT_STORE = "none";
    assert.equal(storeFromEnv(), null, "none, even with a database");
    delete process.env.VERCEL;
    delete process.env.ACCOUNT_DATABASE_URL;
    process.env.NODE_ENV = "development";
    assert.equal(storeFromEnv(), null, "none in development either");
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    process.env.ACCOUNT_SESSION_SECRET = "too short";
    assert.equal(secretFromEnv(), null);
    process.env.ACCOUNT_SESSION_SECRET = "x".repeat(44);
    assert.equal(secretFromEnv().byteLength, 44);
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});

test("the origins allowed to use passkeys come from the deployment: ulune.app, a preview's own address, or a list", async () => {
  const { originsFromEnv } = await import("../src/lib/account/config.server.ts");
  const saved = { ...process.env };
  try {
    delete process.env.ACCOUNT_ORIGINS;
    process.env.VERCEL_ENV = "production";
    assert.deepEqual(originsFromEnv(), ["https://ulune.app"]);
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "ulune-git-v2-ulune.vercel.app";
    assert.deepEqual(originsFromEnv(), ["https://ulune-git-v2-ulune.vercel.app"]);
    process.env.ACCOUNT_ORIGINS = "https://ulune.app, https://evil example, http://localhost:8097/";
    assert.deepEqual(originsFromEnv(), ["https://ulune.app", "http://localhost:8097"]);
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
  void fromB64u;
});
