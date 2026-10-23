// The synced account's protocol, part by part (docs/sync-protocol.md; share and compare plan,
// feature 4): strict base64url, record names, sealed and padded records, device names, the ways
// in's keys, the server's tokens, the device link's code, the CBOR reader, and that the document,
// the migration and the code agree on every number.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { b64u, fromB64u, randomBytes, utf8 } from "../src/lib/account/encoding.ts";
import {
  linkIdOf,
  linkQr,
  linkSecrets,
  newLinkKey,
  openDeviceName,
  openLinkPayload,
  openRecord,
  padTo,
  passphraseSecrets,
  prfSalt,
  readLinkQr,
  recordId,
  recoveryKek,
  recoverySecrets,
  sealDeviceName,
  sealLinkPayload,
  sealRecord,
  syncKeys,
  unpad,
  unwrapDataKey,
  wrapAad,
  wrapDataKey,
} from "../src/lib/account/keys.ts";
import { ARGON_DEFAULT, BUCKETS, ERRORS, KEEP_DAYS, LIMITS, OPERATIONS, TTL, bucketFor, dayOf } from "../src/lib/account/protocol.ts";
import { PURPOSE, deriveSecrets, isFresh, issueChallenge, issueSession, readChallenge, readSession } from "../src/lib/account/tokens.server.ts";
import { CborError, decodeCbor } from "../src/lib/account/cbor.server.ts";
import { splitSql } from "../src/lib/account/migrate.server.ts";
import { cbor } from "./account-helpers.mjs";

const DOC = readFileSync(new URL("../docs/sync-protocol.md", import.meta.url), "utf8");
const MIGRATION = readFileSync(new URL("../db/migrations/0001_accounts.sql", import.meta.url), "utf8");
const ACCOUNT = b64u(randomBytes(16));

test("base64url is read strictly: one spelling per value", () => {
  const bytes = new Uint8Array([0xfb, 0xff, 0x01]);
  assert.equal(b64u(bytes), "-_8B");
  assert.deepEqual(fromB64u("-_8B"), bytes);
  // Padding, the other alphabet, a lone character, spaces, anything else: refused.
  for (const bad of ["-_8B=", "+/8B", "A", " -_8B", "-_8B\n", "é", "-_8B==", "-_8B-"]) {
    assert.equal(fromB64u(bad), null, JSON.stringify(bad));
  }
  assert.deepEqual(fromB64u(""), new Uint8Array(0));
  assert.equal(fromB64u("AB"), null, "spare bits set");
  assert.deepEqual(fromB64u("AA"), new Uint8Array([0]));
});

test("days are whole days since 1970: 22 October 2026 is day 20748", () => {
  assert.equal(dayOf(Date.UTC(2026, 9, 22, 23, 59)), 20748);
  assert.equal(dayOf(Date.UTC(2026, 9, 22, 0, 0)), 20748);
  assert.match(DOC, /22 October 2026 is day 20748/);
});

test("the document, the migration and the code agree on the buckets, the limits and every operation and error", () => {
  const sizes = /size IN \(([\d, ]+)\)/.exec(MIGRATION)[1].split(",").map((n) => Number(n.trim()));
  assert.deepEqual(sizes, [...BUCKETS]);
  assert.match(DOC, /8 192, 16 384, 32 768, 65 536, 131 072 and 262 144 bytes/);
  const spaced = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  for (const n of [LIMITS.records, LIMITS.tombstones, LIMITS.devices, LIMITS.newAccountsPerDay]) assert.ok(DOC.includes(spaced(n)), `limit ${n}`);
  assert.match(DOC, /16 MiB \(16 777 216\)/);
  assert.equal(LIMITS.bytes, 16_777_216);
  assert.match(DOC, /64 records, 640 KiB of blobs, a 1 MiB body/);
  assert.equal(LIMITS.batchPuts, 64);
  assert.equal(LIMITS.batchBytes, 640 * 1024);
  assert.match(DOC, /\*\*one hour\*\*/);
  assert.equal(TTL.session, 3600);
  assert.match(DOC, /\*\*five minutes\*\*/);
  assert.equal(TTL.fresh, 300);
  assert.match(DOC, /\*\*ten minutes\*\*/);
  assert.equal(TTL.link, 600);
  assert.equal(KEEP_DAYS.inactive, 730);
  assert.match(DOC, /730 days/);
  assert.equal(KEEP_DAYS.tombstones, 90);
  for (const op of OPERATIONS) assert.ok(DOC.includes(`\`${op}\``), `the document names ${op}`);
  for (const [code, status] of Object.entries(ERRORS)) assert.match(DOC, new RegExp(`\\| ${status} \\| \`${code}\` \\|`), code);
  assert.deepEqual(ARGON_DEFAULT, { m: 19_456, t: 2, p: 1 });
});

test("the PRF salt is SHA-256 of its label, as the document prints it", async () => {
  const salt = await prfSalt();
  const hex = Buffer.from(salt).toString("hex");
  assert.equal(hex, "0fb65ed09e6d03c5e90951910eda91264545130bf586466f75522bf5ed8eea11");
  assert.ok(DOC.replace(/ /g, "").includes(hex));
});

test("record names: the same on every device of the account, unrelated across accounts, saying nothing", async () => {
  const key = randomBytes(32);
  const a = await syncKeys(key, ACCOUNT);
  const b = await syncKeys(new Uint8Array(key), ACCOUNT);
  const other = await syncKeys(key, b64u(randomBytes(16)));
  const rid = await recordId(a, "chart/abc");
  assert.equal(rid, await recordId(b, "chart/abc"));
  assert.notEqual(rid, await recordId(other, "chart/abc"));
  assert.notEqual(rid, await recordId(a, "chart/abd"));
  assert.equal(fromB64u(rid).byteLength, 16);
  assert.doesNotMatch(rid, /chart/);
});

test("a sealed record is a bucket's size, opens under its own rid and account only, and carries its name", async () => {
  const keys = await syncKeys(randomBytes(32), ACCOUNT);
  const rid = await recordId(keys, "note/1");
  const note = await sealRecord(keys, rid, { n: "note/1", t: 1, v: { text: "read on 12 Oct", at: 1 } });
  assert.equal(note.byteLength, 8192);
  const chart = { id: "c1", input: { name: "TraceQA", date: "15/06/1990", placeLabel: "Paris" }, chart: { planets: Array.from({ length: 400 }, (_, i) => ({ id: i, lon: i * 0.731 })) } };
  const chartRid = await recordId(keys, "chart/c1");
  const sealed = await sealRecord(keys, chartRid, { n: "chart/c1", t: 2, v: chart });
  // A chart and a note look alike on the server.
  assert.equal(sealed.byteLength, 8192);
  const plain = await sealRecord(keys, chartRid, { n: "chart/c1", t: 2, v: chart }, { compress: false });
  assert.ok(plain.byteLength > 8192 && BUCKETS.includes(plain.byteLength));
  assert.deepEqual((await openRecord(keys, chartRid, sealed)).v, chart);
  assert.deepEqual((await openRecord(keys, chartRid, plain)).v, chart);
  // Moved under another rid, another account, or altered: it does not open.
  await assert.rejects(() => openRecord(keys, rid, sealed));
  await assert.rejects(async () => openRecord(await syncKeys(randomBytes(32), ACCOUNT), chartRid, sealed));
  const bent = new Uint8Array(sealed);
  bent[100] ^= 1;
  await assert.rejects(() => openRecord(keys, chartRid, bent));
  // Sealed under one rid with another name inside: the device refuses it.
  const lying = await sealRecord(keys, rid, { n: "chart/c1", t: 3, v: {} });
  await assert.rejects(() => openRecord(keys, rid, lying), /wrong-record/);
  // Nothing readable in the bytes.
  const text = Buffer.from(sealed).toString("latin1");
  for (const word of ["TraceQA", "1990", "Paris", "chart/", "note/"]) assert.ok(!text.includes(word), word);
});

test("padding: 0x80 then zeros to the bucket; a record too big for the largest bucket is refused", async () => {
  assert.deepEqual(unpad(padTo(utf8("ab"), 8)), utf8("ab"));
  assert.throws(() => unpad(new Uint8Array(8)));
  assert.throws(() => unpad(new Uint8Array([1, 2, 0, 0])));
  assert.equal(bucketFor(8192 - 29), 8192);
  assert.equal(bucketFor(8192 - 28), 16384);
  assert.equal(bucketFor(262144), null);
  const keys = await syncKeys(randomBytes(32), ACCOUNT);
  const rid = await recordId(keys, "state/big");
  const noise = b64u(randomBytes(200_000));
  await assert.rejects(() => sealRecord(keys, rid, { n: "state/big", t: 1, v: noise + noise }), /record-too-big/);
});

test("device names: always 128 bytes, cut between characters, opened only with the account's key", async () => {
  const keys = await syncKeys(randomBytes(32), ACCOUNT);
  const device = b64u(randomBytes(16));
  for (const name of ["Camille’s phone", "", "é".repeat(80), "日本語".repeat(40)]) {
    const sealed = await sealDeviceName(keys, device, name);
    assert.equal(sealed.byteLength, 128);
    const back = await openDeviceName(keys, device, sealed);
    assert.ok(name.startsWith(back) && utf8(back).byteLength < 100);
    if (utf8(name).byteLength < 100) assert.equal(back, name);
  }
  const sealed = await sealDeviceName(keys, device, "Camille’s phone");
  await assert.rejects(() => openDeviceName(keys, b64u(randomBytes(16)), sealed));
});

test("a passphrase gives an authentication key and a key-encryption key that are unrelated; the wrap opens with it only", async () => {
  const dataKey = randomBytes(32);
  const salt = randomBytes(16);
  const { authKey, kek } = await passphraseSecrets("  correct horse battery staple ", ACCOUNT, salt, ARGON_DEFAULT);
  const again = await passphraseSecrets("correct horse battery staple", ACCOUNT, salt, ARGON_DEFAULT);
  assert.deepEqual(authKey, again.authKey, "normalised as the space does");
  assert.equal(authKey.byteLength, 32);
  const wrap = await wrapDataKey(dataKey, kek, wrapAad(ACCOUNT, "passphrase"));
  assert.equal(wrap.byteLength, 60);
  assert.deepEqual(await unwrapDataKey(wrap, again.kek, wrapAad(ACCOUNT, "passphrase")), dataKey);
  // The authentication key opens nothing: as a key, it does not unwrap.
  const asKek = await crypto.subtle.importKey("raw", authKey, "AES-GCM", false, ["encrypt", "decrypt"]);
  await assert.rejects(() => unwrapDataKey(wrap, asKek, wrapAad(ACCOUNT, "passphrase")));
  // Another account's wrap label: refused.
  await assert.rejects(() => unwrapDataKey(wrap, again.kek, wrapAad(b64u(randomBytes(16)), "passphrase")));
});

test("the recovery code alone gives its lookup and authentication key; its kek opens its wrap", async () => {
  const code = "0123456789ABCDEFGHJKMNPQR";
  const a = await recoverySecrets(code);
  const b = await recoverySecrets(code);
  assert.deepEqual(a, b);
  assert.equal(a.lookup.byteLength, 16);
  assert.notDeepEqual(a.lookup, (await recoverySecrets("0123456789ABCDEFGHJKMNPQS")).lookup);
  const dataKey = randomBytes(32);
  const wrap = await wrapDataKey(dataKey, await recoveryKek(code, ACCOUNT), wrapAad(ACCOUNT, "recovery"));
  assert.deepEqual(await unwrapDataKey(wrap, await recoveryKek(code, ACCOUNT), wrapAad(ACCOUNT, "recovery")), dataKey);
});

test("sessions are bound to an account and a device, last an hour, are fresh for five minutes, and any changed byte fails", () => {
  const secrets = deriveSecrets(randomBytes(32));
  const account = randomBytes(16);
  const device = randomBytes(16);
  const t0 = Date.UTC(2026, 9, 22, 12);
  const token = issueSession(secrets, account, device, t0, true);
  const s = readSession(secrets, token, t0 + 1000);
  assert.deepEqual([...s.account], [...account]);
  assert.deepEqual([...s.device], [...device]);
  assert.ok(isFresh(s, t0 + 299_000) && !isFresh(s, t0 + 301_000));
  assert.ok(readSession(secrets, token, t0 + 3_599_000));
  assert.equal(readSession(secrets, token, t0 + 3_600_000), null, "expired");
  assert.ok(!isFresh(readSession(secrets, issueSession(secrets, account, device, t0, false), t0), t0));
  const bytes = fromB64u(token);
  for (let i = 0; i < bytes.length; i += 1) {
    const bent = new Uint8Array(bytes);
    bent[i] ^= 0x20;
    assert.equal(readSession(secrets, b64u(bent), t0), null, `byte ${i}`);
  }
  assert.equal(readSession(deriveSecrets(randomBytes(32)), token, t0), null, "another server secret");
  // A challenge is not a session, and is bound to its purpose and ids.
  const { token: challenge } = issueChallenge(secrets, PURPOSE.renew, t0, TTL.challenge, [account, device]);
  assert.equal(readSession(secrets, challenge, t0), null);
  assert.equal(readChallenge(secrets, PURPOSE.signIn, challenge, t0, 32), null);
  assert.deepEqual([...readChallenge(secrets, PURPOSE.renew, challenge, t0, 32).bound], [...account, ...device]);
  assert.equal(readChallenge(secrets, PURPOSE.renew, challenge, t0 + 300_000, 32), null, "five minutes");
});

test("a device link: both sides find the same code and key; a key swapped by the server shows different codes", async () => {
  const link = b64u(new Uint8Array([1, 6, ...randomBytes(16), 0, 0, 0, 1, ...randomBytes(16)]));
  const giver = await newLinkKey();
  const taker = await newLinkKey();
  const atGiver = await linkSecrets(giver.privateKey, taker.epk, link, giver.epk, taker.epk);
  const atTaker = await linkSecrets(taker.privateKey, giver.epk, link, giver.epk, taker.epk);
  assert.match(atGiver.code, /^\d{3} \d{3}$/);
  assert.equal(atGiver.code, atTaker.code);
  const payload = { v: 1, account: ACCOUNT, key: b64u(randomBytes(32)) };
  const sealed = await sealLinkPayload(atGiver.key, link, payload);
  assert.deepEqual(await openLinkPayload(atTaker.key, link, sealed), payload);
  // The server puts its own key in place of the taker's (the giver opened, so the taker's key reached it through the server).
  const server = await newLinkKey();
  const fooled = await linkSecrets(giver.privateKey, server.epk, link, giver.epk, server.epk);
  const honest = await linkSecrets(taker.privateKey, giver.epk, link, giver.epk, taker.epk);
  assert.notEqual(fooled.code, honest.code);
  const forged = await sealLinkPayload(fooled.key, link, payload);
  await assert.rejects(() => openLinkPayload(honest.key, link, forged));
  // The QR code's text gives back the link and the opener's key.
  const qr = linkQr(link, giver.epk);
  assert.deepEqual(readLinkQr(qr), { link, epk: giver.epk });
  assert.equal(readLinkQr("abc"), null);
  assert.deepEqual(linkIdOf(link), fromB64u(link).slice(2, 18));
});

test("the CBOR reader takes what WebAuthn sends and refuses the rest", () => {
  const value = decodeCbor(cbor(new Map([["fmt", "none"], ["attStmt", new Map()], [1, 2], [-1, new Uint8Array([1, 2])], ["list", [true, false, null, 70000]]])));
  assert.equal(value.get("fmt"), "none");
  assert.equal(value.get(-1).length, 2);
  assert.deepEqual(value.get("list"), [true, false, null, 70000]);
  const refused = [
    new Uint8Array([0x5f, 0x41, 0x00, 0xff]), // indefinite byte string
    new Uint8Array([0xc2, 0x41, 0x00]), // a tag
    new Uint8Array([0xf9, 0x3c, 0x00]), // a float
    new Uint8Array([0x01, 0x02]), // trailing bytes
    new Uint8Array([0x42, 0x00]), // truncated
    new Uint8Array([0xa2, 0x01, 0x01, 0x01, 0x02]), // a repeated key
    new Uint8Array(Array.from({ length: 12 }, () => 0x81).concat([0x00])), // too deep
    new Uint8Array([0x62, 0xc3, 0x28]), // text that is not UTF-8
  ];
  for (const bytes of refused) assert.throws(() => decodeCbor(bytes), (err) => err instanceof CborError || err instanceof TypeError, [...bytes].join(","));
});

test("the migration splits into its statements, comments and quotes respected", () => {
  const statements = splitSql(MIGRATION);
  assert.ok(statements.length >= 15);
  assert.ok(statements.every((s) => !s.includes("--") && !/;\s*$/.test(s)));
  assert.ok(statements.some((s) => s.startsWith("CREATE TABLE accounts")));
  assert.deepEqual(splitSql("SELECT 'a;b'; -- c;d\nSELECT 2;"), ["SELECT 'a;b'", "SELECT 2"]);
  // Nothing in the schema stores a time finer than a day, an address or an agent.
  assert.doesNotMatch(statements.join("\n"), /timestamp|\btime\b|interval|inet|cidr|agent|\bip\b|address/i);
});
