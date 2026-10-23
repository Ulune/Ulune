// The synced account's server, end to end (src/lib/account/service.server.ts against the memory
// store; docs/sync-protocol.md; share and compare plan, feature 4): one uniform answer to garbage,
// sign-ins that tell nothing, the passphrase that never leaves the device, sessions renewed with a
// device key and ended with the device, ways in and devices, records with versions, conflicts,
// pages, tombstones, quotas and padding, a device added by QR code, deleting everything, the
// daily clean-up and the two-year rule, rate limits, and a stolen copy of the database.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { contentSecurityPolicy } from "../src/lib/csp.ts";
import { b64u, fromB64u, randomBytes } from "../src/lib/account/encoding.ts";
import {
  linkQr,
  linkSecrets,
  newDeviceKey,
  newLinkKey,
  openDeviceName,
  openRecord,
  passphraseSecrets,
  readLinkQr,
  recordId,
  recoveryKek,
  recoverySecrets,
  sealDeviceName,
  sealLinkPayload,
  signWithDevice,
  syncKeys,
  unwrapDataKey,
  wrapAad,
  wrapDataKey,
} from "../src/lib/account/keys.ts";
import { API_BASE, ARGON_DEFAULT, BUCKETS, CLEANUP_PATH, OPERATIONS, dayOf } from "../src/lib/account/protocol.ts";
import { accountService } from "../src/lib/account/service.server.ts";
import { memoryStore } from "../src/lib/account/store-memory.server.ts";
import { ORIGIN, call, checkStolenRows, createAccount, linkDevice, makeAuthenticator, newCode, realisticSession, renew, sealedPut } from "./account-helpers.mjs";

const T0 = Date.UTC(2026, 9, 22, 12);
const DAY = 86_400_000;

function setup(options = {}) {
  const store = options.store ?? memoryStore();
  const clock = { now: options.now ?? T0 };
  const svc = accountService({
    store,
    secret: options.secret === undefined ? randomBytes(32) : options.secret,
    origins: [ORIGIN],
    now: () => clock.now,
    rules: options.rules ?? false,
    limits: options.limits,
    cronSecret: options.cronSecret ?? null,
  });
  return { svc, store, clock };
}

const put = (svc, who, puts) => call(svc, "records/put", { puts }, { token: who.token });

test("every operation answers garbage the same way, and only to POST with JSON, at its own address", async () => {
  const { svc } = setup();
  const garbage = [{ raw: "garbage" }, { raw: "[]" }, { raw: '{"surprise":1}' }, { raw: "" }, { raw: "null" }, { raw: '{"cursor":"1"}' }];
  for (const op of OPERATIONS) {
    for (const g of garbage) {
      const res = await call(svc, op, null, { raw: g.raw });
      assert.equal(res.status, 400, `${op} ${g.raw}`);
      assert.equal(res.text, '{"error":"bad-request"}', `${op} ${g.raw}`);
      assert.equal(res.headers.get("cache-control"), "no-store");
    }
    // Not JSON's type, a query string, not a POST, another site's page.
    assert.equal((await call(svc, op, {}, { headers: { "content-type": "text/plain" } })).text, '{"error":"bad-request"}');
    assert.equal((await call(svc, op, {}, { query: "?cursor=1" })).text, '{"error":"bad-request"}');
    const get = await call(svc, op, null, { method: "GET" });
    assert.equal(get.status, 405);
    assert.equal(get.headers.get("allow"), "POST");
    assert.equal(get.text, '{"error":"method"}');
    const cross = await call(svc, op, {}, { headers: { "sec-fetch-site": "cross-site" } });
    assert.equal(cross.status, 403);
    assert.equal(cross.text, '{"error":"cross-site"}');
  }
  const unknown = await call(svc, "accounts/list", {});
  assert.equal(unknown.status, 404);
  assert.equal(unknown.text, '{"error":"not-found"}');
  // Over its size: 413, whatever the operation.
  const big = await call(svc, "account/begin", null, { raw: `{"x":"${"a".repeat(70_000)}"}` });
  assert.equal(big.status, 413);
  assert.equal(big.text, '{"error":"too-large"}');
  // A session operation without a session.
  const none = await call(svc, "account/status", {});
  assert.equal(none.status, 401);
  assert.equal(none.text, '{"error":"denied"}');
});

test("without a database or a secret (production not set up), a valid request is 503, after the same checks", async () => {
  for (const options of [{ store: null }, { secret: null }]) {
    const svc = accountService({ store: options.store === null ? null : memoryStore(), secret: options.secret === null ? null : randomBytes(32), origins: [ORIGIN], rules: false });
    assert.equal((await call(svc, "account/begin", null, { raw: "garbage" })).status, 400);
    const res = await call(svc, "account/begin", {});
    assert.equal(res.status, 503);
    assert.equal(res.text, '{"error":"unavailable"}');
    assert.ok(Number(res.headers.get("retry-after")) > 0);
  }
});

test("the passphrase never leaves the device: the server gets an authentication key, checks it, and cannot open the wrap", async () => {
  const { svc, store } = setup();
  const who = await createAccount(svc, { passphrase: "correct horse battery staple" });
  const sent = JSON.stringify(who.sent);
  assert.ok(!sent.includes("correct horse"), "the passphrase");
  assert.ok(!sent.includes(b64u(who.dataKey)), "the data key");
  // What the server keeps: the salt and settings (the device's), its own salt and a scrypt hash, the wrap.
  const way = (await store.listWays(fromB64u(who.account))).find((w) => w.kind === "passphrase");
  assert.equal(way.authHash.byteLength, 32);
  assert.notDeepEqual(way.authHash, fromB64u(who.sent.passphrase.authKey));
  // A new device: the salt and settings, then the same derivation, then the wrap opens with the passphrase's own key.
  const params = await call(svc, "passphrase/params", { account: who.account });
  assert.deepEqual(params.body, { salt: b64u(who.salt), ...ARGON_DEFAULT });
  const { authKey, kek } = await passphraseSecrets("correct horse battery staple", who.account, fromB64u(params.body.salt), params.body);
  const device = await newDeviceKey();
  const res = await call(svc, "passphrase/sign-in", { account: who.account, authKey: b64u(authKey), device: { key: b64u(device.publicKey) } });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.way.kind, "passphrase");
  assert.deepEqual(await unwrapDataKey(fromB64u(res.body.way.wrap), kek, wrapAad(who.account, "passphrase")), who.dataKey);
  // The authentication key opens nothing.
  const asKek = await crypto.subtle.importKey("raw", authKey, "AES-GCM", false, ["decrypt"]);
  await assert.rejects(() => unwrapDataKey(fromB64u(res.body.way.wrap), asKek, wrapAad(who.account, "passphrase")));
});

test("a wrong key and an unknown account fail alike; an unknown account's salt is made up, the same every time", async () => {
  const { svc } = setup();
  const who = await createAccount(svc, { fast: true });
  const device = { key: b64u((await newDeviceKey()).publicKey) };
  const stranger = b64u(randomBytes(16));
  const wrong = await call(svc, "passphrase/sign-in", { account: who.account, authKey: b64u(randomBytes(32)), device });
  const unknown = await call(svc, "passphrase/sign-in", { account: stranger, authKey: b64u(randomBytes(32)), device });
  for (const res of [wrong, unknown]) {
    assert.equal(res.status, 401);
    assert.equal(res.text, '{"error":"denied"}');
  }
  const p1 = await call(svc, "passphrase/params", { account: stranger });
  const p2 = await call(svc, "passphrase/params", { account: stranger });
  assert.deepEqual(p1.body, p2.body);
  assert.deepEqual(Object.keys(p1.body), ["salt", "m", "t", "p"]);
  assert.equal(fromB64u(p1.body.salt).byteLength, 16);
  assert.deepEqual({ ...p1.body, salt: "" }, { salt: "", ...ARGON_DEFAULT });
  // Another server's made-up salt differs (it comes from the server's secret).
  const other = setup();
  assert.notEqual((await call(other.svc, "passphrase/params", { account: stranger })).body.salt, p1.body.salt);
  // The right key still works.
  assert.equal((await call(svc, "passphrase/sign-in", { account: who.account, authKey: b64u(who.fastAuthKey), device })).status, 200);
  // A recovery lookup that does not exist: the same answer.
  const rec = await call(svc, "recovery/sign-in", { lookup: b64u(randomBytes(16)), authKey: b64u(randomBytes(32)), device });
  assert.equal(rec.text, '{"error":"denied"}');
});

test("the recovery code alone signs in on any device and opens the data key; signing in counts as using the account", async () => {
  const { svc, clock, store } = setup();
  const who = await createAccount(svc, { fast: true });
  const { lookup, authKey } = await recoverySecrets(who.code);
  const device = await newDeviceKey();
  clock.now += 3 * DAY;
  const res = await call(svc, "recovery/sign-in", { lookup: b64u(lookup), authKey: b64u(authKey), device: { key: b64u(device.publicKey) } });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.account, who.account);
  const row = await store.getAccount(fromB64u(who.account));
  assert.deepEqual([row.createdDay, row.seenDay], [dayOf(T0), dayOf(T0) + 3]);
  assert.deepEqual(await unwrapDataKey(fromB64u(res.body.way.wrap), await recoveryKek(who.code, res.body.account), wrapAad(res.body.account, "recovery")), who.dataKey);
  assert.equal((await call(svc, "recovery/sign-in", { lookup: b64u(lookup), authKey: b64u(randomBytes(32)), device: { key: b64u(device.publicKey) } })).status, 401);
});

test("sessions: an hour long, renewed with the device key, ended with the device; fresh sign-ins for what matters", async () => {
  const { svc, clock } = setup();
  const who = await createAccount(svc, { fast: true });
  assert.equal((await call(svc, "account/status", {}, { token: who.token })).status, 200);
  // An hour later the token is over; the device key renews it.
  clock.now += 60 * 60_000;
  assert.equal((await call(svc, "account/status", {}, { token: who.token })).status, 401);
  const renewed = await renew(svc, who);
  assert.equal(renewed.status, 200, renewed.text);
  assert.equal(renewed.body.ttl, 3600);
  const token = renewed.body.token;
  assert.equal((await call(svc, "account/status", {}, { token })).status, 200);
  // A renewal signed by another key, or with a challenge used before, or for another device: refused.
  const begin = await call(svc, "session/begin", { account: who.account, device: who.device });
  const stranger = await newDeviceKey();
  assert.equal(
    (await call(svc, "session/renew", { account: who.account, device: who.device, challenge: begin.body.challenge, signature: await signWithDevice(stranger.privateKey, "renew", begin.body.challenge) })).status,
    401,
  );
  const good = { account: who.account, device: who.device, challenge: begin.body.challenge, signature: await signWithDevice(who.deviceKey, "renew", begin.body.challenge) };
  assert.equal((await call(svc, "session/renew", good)).status, 200);
  assert.equal((await call(svc, "session/renew", good)).status, 401, "a challenge is used once");
  assert.equal((await call(svc, "session/renew", { ...good, device: b64u(randomBytes(16)) })).status, 401);
  // session/begin answers anything well-formed: it looks nothing up.
  assert.equal((await call(svc, "session/begin", { account: b64u(randomBytes(16)), device: b64u(randomBytes(16)) })).status, 200);
  // A renewed session is not fresh: changing the ways in or deleting asks for a sign-in again.
  assert.equal((await call(svc, "account/delete", { confirm: "delete-everything" }, { token })).status, 403);
  const rec = await recoverySecrets(who.code);
  const again = await call(svc, "recovery/sign-in", { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey) }, { token });
  assert.equal(again.status, 200, again.text);
  assert.equal(again.body.device, who.device, "the same device, fresh");
  // Five minutes later it is no longer fresh.
  clock.now += 6 * 60_000;
  assert.equal((await call(svc, "ways/remove", { way: b64u(randomBytes(16)) }, { token: again.body.token })).text, '{"error":"fresh-sign-in"}');
});

test("removing a device ends its sessions and its renewals at once", async () => {
  const { svc } = setup();
  const who = await createAccount(svc, { fast: true });
  const rec = await recoverySecrets(who.code);
  const key2 = await newDeviceKey();
  const second = await call(svc, "recovery/sign-in", { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), device: { key: b64u(key2.publicKey) } });
  const other = { ...who, device: second.body.device, token: second.body.token, deviceKey: key2.privateKey };
  // Removing another device needs a fresh sign-in: the first device's creation is fresh.
  assert.equal((await call(svc, "devices/remove", { device: other.device }, { token: who.token })).status, 200);
  assert.equal((await call(svc, "account/status", {}, { token: other.token })).status, 401);
  assert.equal((await renew(svc, other)).status, 401);
  // Signing out: removing one's own device needs nothing more, and ends it.
  const renewed = await renew(svc, who);
  assert.equal((await call(svc, "devices/remove", { device: who.device }, { token: renewed.body.token })).status, 200);
  assert.equal((await call(svc, "devices/list", {}, { token: renewed.body.token })).status, 401);
});

test("devices: named under seal, listed with their days, and beyond thirty the one seen longest ago leaves", async () => {
  const { svc, clock } = setup({ limits: { devices: 3 } });
  const who = await createAccount(svc, { fast: true });
  const sealed = await sealDeviceName(who.keys, who.device, "Camille’s iPhone");
  assert.equal((await call(svc, "devices/rename", { device: who.device, name: b64u(sealed) }, { token: who.token })).status, 200);
  assert.equal((await call(svc, "devices/rename", { device: who.device, name: b64u(randomBytes(64)) }, { token: who.token })).status, 400, "a name is 128 bytes");
  const list = await call(svc, "devices/list", {}, { token: who.token });
  assert.equal(list.body.devices.length, 1);
  const [me] = list.body.devices;
  assert.equal(me.current, true);
  assert.equal(me.created, dayOf(T0));
  assert.equal(await openDeviceName(who.keys, me.id, fromB64u(me.name)), "Camille’s iPhone");
  const rec = await recoverySecrets(who.code);
  const join = async () => {
    clock.now += DAY;
    const key = await newDeviceKey();
    return (await call(svc, "recovery/sign-in", { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), device: { key: b64u(key.publicKey) } })).body.device;
  };
  const d2 = await join();
  const d3 = await join();
  // The first device is seen today: the second (seen longest ago) leaves when a fourth joins.
  const renewed = await renew(svc, who);
  await call(svc, "account/status", {}, { token: renewed.body.token });
  clock.now += DAY;
  await call(svc, "account/status", {}, { token: (await renew(svc, who)).body.token });
  const d4 = await join();
  const ids = (await call(svc, "devices/list", {}, { token: (await renew(svc, who)).body.token })).body.devices.map((d) => d.id);
  assert.deepEqual(ids.sort(), [who.device, d3, d4].sort());
  assert.ok(!ids.includes(d2));
});

test("ways in: a passkey added, the passphrase and the recovery code replaced, the last ones never removed", async () => {
  const { svc } = setup({ limits: { passkeys: 2 } });
  const who = await createAccount(svc, { fast: true });
  const token = who.token; // fresh: just created
  const begin = await call(svc, "ways/begin", {}, { token });
  assert.deepEqual(begin.body.exclude, []);
  const auth = await makeAuthenticator({ alg: -8 });
  const credential = await auth.register(begin.body.challenge);
  const wrap = b64u(randomBytes(60));
  const added = await call(svc, "ways/add", { challenge: begin.body.challenge, passkey: { credential, wrap } }, { token });
  assert.equal(added.status, 200, added.text);
  assert.equal(added.body.way.kind, "passkey");
  // Its challenge is spent; the same registration again is refused.
  assert.equal((await call(svc, "ways/add", { challenge: begin.body.challenge, passkey: { credential, wrap } }, { token })).status, 401);
  const listed = (await call(svc, "ways/list", {}, { token })).body.ways;
  assert.deepEqual(listed.map((w) => w.kind).sort(), ["passkey", "passphrase", "recovery"]);
  assert.equal(listed.find((w) => w.kind === "passkey").credential, auth.id);
  assert.deepEqual((await call(svc, "ways/begin", {}, { token })).body.exclude, [auth.id]);
  // Two passkeys at most here: the third is refused.
  const b2 = await call(svc, "ways/begin", {}, { token });
  assert.equal((await call(svc, "ways/add", { challenge: b2.body.challenge, passkey: { credential: await (await makeAuthenticator()).register(b2.body.challenge), wrap } }, { token })).status, 200);
  const b3 = await call(svc, "ways/begin", {}, { token });
  assert.equal((await call(svc, "ways/add", { challenge: b3.body.challenge, passkey: { credential: await (await makeAuthenticator()).register(b3.body.challenge), wrap } }, { token })).text, '{"error":"limit"}');
  // A new passphrase replaces the old one: the old key no longer signs in.
  const newKey = randomBytes(32);
  const passphrase = { salt: b64u(randomBytes(16)), ...ARGON_DEFAULT, authKey: b64u(newKey), wrap };
  assert.equal((await call(svc, "ways/add", { passphrase }, { token })).status, 200);
  const device = { key: b64u((await newDeviceKey()).publicKey) };
  assert.equal((await call(svc, "passphrase/sign-in", { account: who.account, authKey: b64u(who.fastAuthKey), device })).status, 401);
  assert.equal((await call(svc, "passphrase/sign-in", { account: who.account, authKey: b64u(newKey), device })).status, 200);
  // A new recovery code: the old one stops working.
  const code = newCode();
  const rec = await recoverySecrets(code);
  assert.equal((await call(svc, "ways/add", { recovery: { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), wrap } }, { token })).status, 200);
  const old = await recoverySecrets(who.code);
  assert.equal((await call(svc, "recovery/sign-in", { lookup: b64u(old.lookup), authKey: b64u(old.authKey), device })).status, 401);
  // Removing: the passkeys and the passphrase one by one, never the last one, never the recovery code.
  const ways = (await call(svc, "ways/list", {}, { token })).body.ways;
  const of = (kind) => ways.filter((w) => w.kind === kind);
  assert.equal((await call(svc, "ways/remove", { way: of("recovery")[0].id }, { token })).text, '{"error":"last-way-in"}');
  for (const w of of("passkey")) assert.equal((await call(svc, "ways/remove", { way: w.id }, { token })).status, 200);
  assert.equal((await call(svc, "ways/remove", { way: of("passphrase")[0].id }, { token })).text, '{"error":"last-way-in"}');
  // Removing what is not there is done already.
  assert.equal((await call(svc, "ways/remove", { way: b64u(randomBytes(16)) }, { token })).status, 200);
  // Exactly one way in per request, a challenge only with a passkey.
  assert.equal((await call(svc, "ways/add", { passphrase, recovery: { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), wrap } }, { token })).status, 400);
  assert.equal((await call(svc, "ways/add", { challenge: b2.body.challenge, passphrase }, { token })).status, 400);
});

test("records: versions, compare-and-set, conflicts with the server's copy, paging, tombstones and padding", async () => {
  const { svc } = setup();
  const who = await createAccount(svc, { fast: true });
  const p1 = await sealedPut(who, "chart/a", { id: "a" });
  const p2 = await sealedPut(who, "chart/b", { id: "b" });
  const p3 = await sealedPut(who, "note/a", { text: "x" });
  const first = await put(svc, who, [p1, p2, p3]);
  assert.equal(first.status, 200, first.text);
  assert.deepEqual(
    first.body.applied.map((a) => a.version),
    [1, 2, 3],
  );
  assert.deepEqual(first.body.conflicts, []);
  // A device that did not see them writes chart/a as new: a conflict, with the server's copy to merge.
  const stale = await sealedPut(who, "chart/a", { id: "a", savedAt: 9 });
  const clash = await put(svc, who, [stale, await sealedPut(who, "chart/c", { id: "c" })]);
  assert.equal(clash.body.applied.length, 1);
  assert.equal(clash.body.conflicts.length, 1);
  const [conflict] = clash.body.conflicts;
  assert.equal(conflict.rid, p1.rid);
  assert.equal(conflict.version, 1);
  assert.deepEqual((await openRecord(who.keys, conflict.rid, fromB64u(conflict.blob))).v, { id: "a" });
  // Merged, put again on the version it saw.
  const merged = await put(svc, who, [{ ...stale, base: 1 }]);
  assert.equal(merged.body.applied[0].version, 6, "versions only grow: 4 and 5 went to the batch before");
  // Pages: from 0, live records only, two at a time.
  const pages = [];
  let cursor = 0;
  for (;;) {
    const page = await call(svc, "records/changes", { cursor, limit: 2 }, { token: who.token });
    assert.equal(page.status, 200);
    pages.push(page.body.changes.map((c) => c.version));
    cursor = page.body.cursor;
    if (!page.body.more) break;
  }
  assert.deepEqual(pages, [[2, 3], [5, 6]]);
  // A deletion is a tombstone: seen after a cursor, absent from a full listing.
  const del = await put(svc, who, [{ rid: p3.rid, base: 3, deleted: true }]);
  assert.equal(del.body.applied[0].version, 7);
  const after = await call(svc, "records/changes", { cursor: 6 }, { token: who.token });
  assert.deepEqual(after.body.changes, [{ rid: p3.rid, version: 7, deleted: true }]);
  const full = await call(svc, "records/changes", { cursor: 0 }, { token: who.token });
  assert.ok(!full.body.changes.some((c) => c.rid === p3.rid));
  assert.equal(full.body.cursor, 6);
  // Writing over a tombstone takes its version as base.
  assert.equal((await put(svc, who, [{ ...p3, base: 0 }])).body.conflicts[0].deleted, true);
  assert.equal((await put(svc, who, [{ ...p3, base: 7 }])).body.applied.length, 1);
  // The status counts live records and bytes.
  const status = await call(svc, "account/status", {}, { token: who.token });
  assert.deepEqual(status.body.usage, { records: 4, bytes: 4 * 8192 });
  assert.equal(status.body.latest, 9);
  // Not a bucket's size, two puts for one record, too many, too much, a blob and a deletion at once: refused whole.
  const bad = [
    [{ rid: p1.rid, base: 0, blob: b64u(randomBytes(8000)) }],
    [{ rid: p1.rid, base: 0, blob: b64u(randomBytes(8193)) }],
    [p1, p1],
    Array.from({ length: 65 }, (_, i) => ({ rid: b64u(randomBytes(16)), base: 0, deleted: true, i })).map(({ i: _i, ...p }) => p),
    [{ rid: p1.rid, base: 0, blob: p1.blob, deleted: true }],
    [{ rid: p1.rid, base: -1, deleted: true }],
    [{ rid: "chart/a", base: 0, deleted: true }],
    [],
  ];
  for (const puts of bad) assert.equal((await put(svc, who, puts)).status, 400, JSON.stringify(puts).slice(0, 80));
  const heavy = [262_144, 262_144, 131_072, 8192].map((size) => ({ rid: b64u(randomBytes(16)), base: 0, blob: b64u(randomBytes(size)) }));
  assert.equal((await put(svc, who, heavy)).status, 400, "over 640 KiB of blobs in one batch");
  // Bigger records, a bucket each.
  for (const size of BUCKETS) {
    const res = await put(svc, who, [{ rid: b64u(randomBytes(16)), base: 0, blob: b64u(randomBytes(size)) }]);
    assert.equal(res.status, 200, `${size}`);
  }
});

test("quotas: a batch over the account's records or bytes is refused whole (507)", async () => {
  const { svc } = setup({ limits: { records: 3, bytes: 4 * 8192 } });
  const who = await createAccount(svc, { fast: true });
  const blob = () => ({ rid: b64u(randomBytes(16)), base: 0, blob: b64u(randomBytes(8192)) });
  assert.equal((await put(svc, who, [blob(), blob()])).status, 200);
  const over = await put(svc, who, [blob(), blob()]);
  assert.equal(over.status, 507);
  assert.equal(over.text, '{"error":"quota"}');
  assert.equal((await call(svc, "account/status", {}, { token: who.token })).body.usage.records, 2, "nothing of the batch applied");
  assert.equal((await put(svc, who, [blob()])).status, 200);
  // Bytes: a bigger blob does not fit either.
  const { svc: svc2 } = setup({ limits: { records: 10, bytes: 3 * 8192 } });
  const two = await createAccount(svc2, { fast: true });
  assert.equal((await put(svc2, two, [{ rid: b64u(randomBytes(16)), base: 0, blob: b64u(randomBytes(32768)) }])).status, 507);
});

test("tombstones beyond the account's cap go, and a device whose cursor is older lists everything again", async () => {
  const { svc } = setup({ limits: { tombstones: 2 } });
  const who = await createAccount(svc, { fast: true });
  const puts = [];
  for (let i = 0; i < 4; i += 1) puts.push(await sealedPut(who, `note/${i}`, { i }));
  const written = (await put(svc, who, puts)).body.applied;
  const old = 4;
  // Three deleted: the oldest tombstone goes beyond the cap of two.
  const deleted = await put(svc, who, written.slice(0, 3).map((w) => ({ rid: w.rid, base: w.version, deleted: true })));
  assert.equal(deleted.body.applied.length, 3);
  const reset = await call(svc, "records/changes", { cursor: old - 2 }, { token: who.token });
  assert.deepEqual(reset.body, { changes: [], cursor: 0, more: true, reset: true });
  const fromNow = await call(svc, "records/changes", { cursor: 5 }, { token: who.token });
  assert.equal(fromNow.body.reset, undefined);
  assert.deepEqual(
    fromNow.body.changes.map((c) => c.deleted),
    [true, true],
  );
});

test("two devices sync: what one seals, the other opens with its own keys", async () => {
  const { svc } = setup();
  const one = await createAccount(svc, { fast: true });
  const two = await linkDevice(svc, one, { opener: "giver" });
  assert.equal(two.account, one.account);
  assert.deepEqual(two.dataKey, one.dataKey);
  const chart = { id: "fixture-b", input: { name: "Sample B", date: "03/11/1987" } };
  await put(svc, one, [await sealedPut(one, "chart/fixture-b", chart)]);
  const page = await call(svc, "records/changes", { cursor: 0 }, { token: two.token });
  const [change] = page.body.changes;
  assert.equal(change.rid, await recordId(two.keys, "chart/fixture-b"));
  const envelope = await openRecord(two.keys, change.rid, fromB64u(change.blob));
  assert.equal(envelope.n, "chart/fixture-b");
  assert.deepEqual(envelope.v, chart);
  // Each sees the other in its devices.
  const list = await call(svc, "devices/list", {}, { token: two.token });
  assert.equal(list.body.devices.length, 2);
  assert.equal(list.body.devices.find((d) => d.current).id, two.device);
});

test("a device link either way; joined, given and taken once; refused when expired, closed or signed wrong", async () => {
  const { svc, clock } = setup();
  const giver = await createAccount(svc, { fast: true });
  // The new device shows the QR code this time.
  const added = await linkDevice(svc, giver, { opener: "taker" });
  assert.equal(added.account, giver.account);
  assert.match(added.code, /^\d{3} \d{3}$/);
  assert.equal((await call(svc, "account/status", {}, { token: added.token })).status, 200);
  // The link is gone once taken.
  assert.equal((await call(svc, "link/state", { link: added.link })).status, 410);

  const g = await newLinkKey();
  const open = await call(svc, "link/open", { epk: b64u(g.epk) }, { token: giver.token });
  const link = open.body.link;
  assert.equal(open.body.ttl, 600);
  assert.deepEqual((await call(svc, "link/state", { link })).body, { state: "open", giver: b64u(g.epk) });
  const t = await newLinkKey();
  const td = await newDeviceKey();
  // A signed-in device cannot take a link the giver opened.
  assert.equal((await call(svc, "link/join", { link, epk: b64u(t.epk), device: { key: b64u(td.publicKey) } }, { token: giver.token })).status, 409);
  const join = await call(svc, "link/join", { link, epk: b64u(t.epk), device: { key: b64u(td.publicKey) } });
  assert.equal(join.status, 200);
  assert.equal(join.body.peer, b64u(g.epk));
  // Joined once.
  const intruder = await newLinkKey();
  assert.equal((await call(svc, "link/join", { link, epk: b64u(intruder.epk), device: { key: b64u(td.publicKey) } })).status, 409);
  // Taken before it is given: not yet.
  assert.equal((await call(svc, "link/take", { link, signature: await signWithDevice(td.privateKey, "link-take", link) })).status, 409);
  const { key } = await linkSecrets(g.privateKey, t.epk, link, g.epk, t.epk);
  const sealed = b64u(await sealLinkPayload(key, link, { v: 1, account: giver.account, key: b64u(giver.dataKey) }));
  // Another account's device cannot give it.
  const otherAccount = await createAccount(svc, { fast: true });
  assert.equal((await call(svc, "link/give", { link, sealed }, { token: otherAccount.token })).status, 409);
  assert.equal((await call(svc, "link/give", { link, sealed }, { token: giver.token })).status, 200);
  assert.equal((await call(svc, "link/give", { link, sealed }, { token: giver.token })).status, 409, "given once");
  // Taken with a signature by another key: refused; with its own: once.
  const wrongKey = await newDeviceKey();
  assert.equal((await call(svc, "link/take", { link, signature: await signWithDevice(wrongKey.privateKey, "link-take", link) })).status, 401);
  const signature = await signWithDevice(td.privateKey, "link-take", link);
  const take = await call(svc, "link/take", { link, signature });
  assert.equal(take.status, 200);
  assert.equal(take.body.sealed, sealed);
  assert.equal((await call(svc, "link/take", { link, signature })).status, 410);

  // Expired: ten minutes.
  const late = await call(svc, "link/open", { epk: b64u(g.epk) }, { token: giver.token });
  clock.now += 10 * 60_000 + 1000;
  assert.equal((await call(svc, "link/join", { link: late.body.link, epk: b64u(t.epk), device: { key: b64u(td.publicKey) } })).status, 410);
  clock.now = T0;
  // Closed by either side.
  const closing = await call(svc, "link/open", { epk: b64u(t.epk), device: { key: b64u(td.publicKey) } });
  assert.equal((await call(svc, "link/close", { link: closing.body.link })).status, 200);
  assert.equal((await call(svc, "link/state", { link: closing.body.link })).status, 410);
  // A link opened by the new device needs a signed-in device to join it.
  const byTaker = await call(svc, "link/open", { epk: b64u(t.epk), device: { key: b64u(td.publicKey) } });
  assert.equal((await call(svc, "link/join", { link: byTaker.body.link, epk: b64u(g.epk) })).status, 401);
  // A forged or bent link token: gone.
  const bent = fromB64u(byTaker.body.link);
  bent[5] ^= 1;
  assert.equal((await call(svc, "link/state", { link: b64u(bent) })).status, 410);
  // Not a point on the curve: refused.
  assert.equal((await call(svc, "link/open", { epk: b64u(new Uint8Array(65).fill(4)) }, { token: giver.token })).status, 400);
  // The QR code's text carries the link and the opener's key.
  assert.deepEqual(readLinkQr(linkQr(byTaker.body.link, t.epk)).epk, t.epk);
});

test("delete everything: a fresh sign-in, then nothing of the account is left, and its devices are signed out", async () => {
  const { svc, store } = setup();
  const who = await createAccount(svc, { fast: true });
  const other = await createAccount(svc, { fast: true });
  const second = await linkDevice(svc, who);
  await put(svc, who, [await sealedPut(who, "chart/a", { id: "a" })]);
  await put(svc, other, [await sealedPut(other, "chart/a", { id: "a" })]);
  const renewed = await renew(svc, who);
  assert.equal((await call(svc, "account/delete", { confirm: "delete-everything" }, { token: renewed.body.token })).status, 403);
  assert.equal((await call(svc, "account/delete", { confirm: "yes" }, { token: who.token })).status, 400);
  const res = await call(svc, "account/delete", { confirm: "delete-everything" }, { token: who.token });
  assert.deepEqual(res.body, { deleted: true });
  for (const token of [who.token, second.token, renewed.body.token]) assert.equal((await call(svc, "account/status", {}, { token })).status, 401);
  assert.equal((await renew(svc, second)).status, 401);
  const dump = store.dump();
  const gone = (bytes) => bytes && b64u(bytes) === who.account;
  assert.ok(!dump.accounts.some((a) => gone(a.id)));
  assert.ok(!dump.ways.some((w) => gone(w.account)));
  assert.ok(!dump.devices.some((d) => gone(d.account)));
  assert.ok(!dump.records.some((r) => gone(r.account)));
  // The other account is untouched.
  assert.equal((await call(svc, "account/status", {}, { token: other.token })).body.usage.records, 1);
  // Its passphrase and recovery code sign in nowhere now.
  const rec = await recoverySecrets(who.code);
  assert.equal((await call(svc, "recovery/sign-in", { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), device: { key: b64u((await newDeviceKey()).publicKey) } })).status, 401);
});

test("the daily clean-up: accounts unseen for two years, tombstones after 90 days, spent challenges, old links; only with the cron secret", async () => {
  const { svc, clock } = setup({ cronSecret: "cron-secret-for-the-test-0123456789" });
  const idle = await createAccount(svc, { fast: true });
  const active = await createAccount(svc, { fast: true });
  const w = await put(svc, active, [await sealedPut(active, "note/x", { x: 1 }), await sealedPut(active, "note/y", { y: 1 })]);
  await put(svc, active, [{ rid: w.body.applied[0].rid, base: w.body.applied[0].version, deleted: true }]);
  await call(svc, "link/open", { epk: b64u((await newLinkKey()).epk) }, { token: active.token });
  const cron = (headers) => svc.cleanupRequest(new Request(`${ORIGIN}${CLEANUP_PATH}`, { headers }));
  // 729 days later the idle account stays; the active one is seen again on its last day.
  clock.now = T0 + 729 * DAY;
  await call(svc, "account/status", {}, { token: (await renew(svc, active)).body.token });
  let res = await cron({ authorization: "Bearer cron-secret-for-the-test-0123456789" });
  assert.equal(res.status, 200);
  const first = await res.json();
  assert.deepEqual(first, { accounts: 0, tombstones: 1, spent: 2, links: 1 });
  // The tombstone was purged: a device at cursor 2 lists everything again.
  assert.equal((await call(svc, "records/changes", { cursor: 2 }, { token: (await renew(svc, active)).body.token })).body.reset, true);
  // 731 days after it was last seen, the idle account is deleted.
  clock.now = T0 + 731 * DAY;
  res = await cron({ authorization: "Bearer cron-secret-for-the-test-0123456789" });
  assert.equal((await res.json()).accounts, 1);
  assert.equal((await renew(svc, idle)).status, 401);
  assert.equal((await renew(svc, active)).status, 200);
  // Without the right secret, or with another method: nothing runs.
  assert.equal((await cron({ authorization: "Bearer nope" })).status, 401);
  assert.equal((await cron({})).status, 401);
  assert.equal((await svc.cleanupRequest(new Request(`${ORIGIN}${CLEANUP_PATH}`, { method: "POST" }))).status, 405);
  const unset = setup();
  assert.equal((await unset.svc.cleanupRequest(new Request(`${ORIGIN}${CLEANUP_PATH}`, { headers: { authorization: "Bearer " } }))).status, 503);
});

test("rate limits: per address and per account, counted in memory; failed sign-ins slow an account down", async () => {
  const { svc, clock } = setup({ rules: { ip: { limit: 5, windowMs: 60_000 }, failures: { limit: 3, windowMs: 15 * 60_000 } } });
  const statuses = [];
  for (let i = 0; i < 7; i += 1) statuses.push((await call(svc, "passkey/begin", {}, { ip: "198.51.100.1" })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429, 429]);
  const limited = await call(svc, "passkey/begin", {}, { ip: "198.51.100.1" });
  assert.equal(limited.text, '{"error":"slow-down"}');
  assert.ok(Number(limited.headers.get("retry-after")) >= 1);
  assert.equal((await call(svc, "passkey/begin", {}, { ip: "198.51.100.2" })).status, 200, "another address");
  clock.now += 61_000;
  assert.equal((await call(svc, "passkey/begin", {}, { ip: "198.51.100.1" })).status, 200, "a new window");
  // Three wrong keys for one account: then even the right one waits, from any address.
  const who = await createAccount(svc, { fast: true, ip: "198.51.100.9" });
  const device = { key: b64u((await newDeviceKey()).publicKey) };
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await call(svc, "passphrase/sign-in", { account: who.account, authKey: b64u(randomBytes(32)), device }, { ip: `198.51.100.${20 + i}` })).status, 401);
  }
  assert.equal((await call(svc, "passphrase/sign-in", { account: who.account, authKey: b64u(who.fastAuthKey), device }, { ip: "198.51.100.30" })).status, 429);
  clock.now += 16 * 60_000;
  assert.equal((await call(svc, "passphrase/sign-in", { account: who.account, authKey: b64u(who.fastAuthKey), device }, { ip: "198.51.100.30" })).status, 200);
});

test("the limiter stays bounded however many addresses come", async () => {
  const { RateLimiter } = await import("../src/lib/account/limits.server.ts");
  let now = 0;
  const limiter = new RateLimiter(() => now, {}, 1000);
  for (let i = 0; i < 5000; i += 1) limiter.take("ip", `address-${i}`);
  assert.ok(limiter.size <= 1000);
  now += 120_000;
  limiter.take("ip", "late");
  assert.ok(limiter.size <= 1000);
});

test("a stolen copy of the database holds nothing readable: no names, dates, places, notes, groups, device names or record names", async () => {
  const store = memoryStore();
  const { svc } = setup({ store });
  const logged = [];
  const saved = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  for (const k of Object.keys(saved)) console[k] = (...args) => logged.push(args.join(" "));
  let session;
  try {
    session = await realisticSession(svc);
  } finally {
    Object.assign(console, saved);
  }
  // Nothing about the requests was logged.
  assert.deepEqual(logged, []);
  const tables = store.dump();
  const { found, values } = checkStolenRows(tables);
  assert.deepEqual(found, []);
  assert.ok(values > 50);
  // What a thief does learn: the account, its devices, how many records and their sizes, the days.
  assert.equal(tables.accounts.length, 1);
  assert.equal(tables.devices.length, 3);
  assert.equal(tables.records.filter((r) => !r.deleted).length, 5);
  assert.equal(tables.records.filter((r) => r.deleted).length, 1);
  assert.ok(tables.records.every((r) => r.deleted || r.blob.byteLength === 8192), "a chart and a note look alike");
  // And the reader's own devices open everything.
  const page = await call(svc, "records/changes", { cursor: 0 }, { token: session.c.token });
  const names = [];
  for (const c of page.body.changes) names.push((await openRecord(session.c.keys, c.rid, fromB64u(c.blob))).n);
  assert.deepEqual(names.sort(), ["chart/fixture-a", "chart/fixture-b", "fs/homes", "state/groups", "state/library"]);
  const devices = (await call(svc, "devices/list", {}, { token: session.c.token })).body.devices;
  const named = [];
  for (const d of devices) if (d.name) named.push(await openDeviceName(session.c.keys, d.id, fromB64u(d.name)));
  assert.deepEqual(named.sort(), ["Camille’s iPhone", "Sample B’s laptop"]);
});

test("the endpoints are Ulune's own address: the pages' policy already allows them; the build runs them in Frankfurt with a daily clean-up", () => {
  const connect = contentSecurityPolicy("n")
    .split("; ")
    .find((d) => d.startsWith("connect-src "));
  assert.ok(connect.split(" ").includes("'self'"));
  assert.ok(API_BASE.startsWith("/api/account/v1/") && CLEANUP_PATH.startsWith("/api/account/"));
  const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /functionRules: \{\s*"\/api\/account\/\*\*": \{ regions: \["fra1"\]/);
  assert.match(vite, /crons: \[\{ path: "\/api\/account\/cleanup", schedule: "17 3 \* \* \*" \}\]/);
  const route = readFileSync(new URL("../src/routes/api/account.v1.$.ts", import.meta.url), "utf8");
  assert.match(route, /createFileRoute\("\/api\/account\/v1\/\$"\)/);
  assert.match(route, /POST: /);
  const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  for (const name of ["ACCOUNT_DATABASE_URL", "ACCOUNT_SESSION_SECRET", "CRON_SECRET", "ACCOUNT_ORIGINS"]) assert.match(example, new RegExp(`^${name}=$`, "m"));
  // Keys the tests never use are not checked here: the device side's keys.ts works on any WebCrypto.
  void syncKeys;
  void wrapDataKey;
});
