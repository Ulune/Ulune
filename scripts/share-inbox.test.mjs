/*
 * The private space's inbox (share plan, feature 1; src/lib/space/inbox.ts):
 * charts shared while the space is locked are sealed to its public key
 * (ECDH P-256, HKDF-SHA-256, AES-256-GCM) and join it at the next unlock.
 *   - sealing and opening, and nothing readable in what is stored;
 *   - tampering fails closed: an altered entry, one renamed, one sealed for
 *     another space or to another key never opens;
 *   - the key pair: made once with the space (or at the first unlock of an
 *     older one), its public half put back after a restore, a new pair when
 *     the record is unreadable; a space with no public key keeps nothing;
 *   - the merge at unlock: by id or birth, never twice, never over a chart
 *     already kept, the newest first in the order, the inbox emptied;
 *   - a new space or a restored one starts with an empty inbox.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { b64u } from "../src/lib/space/crypto.ts";
import { INBOX_MAX, inboxKeyFor, joinInbox, keepWhileLocked, openInboxEntry, sealForInbox } from "../src/lib/space/inbox.ts";
import { CHART_RECORD, INBOX_KEY_RECORD, LIBRARY_RECORD } from "../src/lib/space/records.ts";
import { memoryStore } from "../src/lib/space/store.ts";
import { Vault, adoptBackup } from "../src/lib/space/vault.ts";

const PASS = "correct horse battery staple";
const CURVE = { name: "ECDH", namedCurve: "P-256" };

/** A chart as the space keeps one (StoredRow), with what fromStoredRow needs. */
function stored(id, input, extra = {}) {
  return {
    id,
    input: { name: "", date: "1990-06-15", time: "12:00", latitude: 48.85341, longitude: 2.3488, placeLabel: "Paris", houseSystem: "placidus", ...input },
    chart: { meta: { name: input.name ?? "", date: input.date ?? "1990-06-15" }, angles: {}, planets: [], houses: [], aspects: [], patterns: {}, stars: [], midpoints: [] },
    grok: null,
    timeUnknown: false,
    savedAt: 100,
    ...extra,
  };
}
const CAMILLE = stored("cam-1", { name: "Camille" });
const SAMPLE = stored("smp-1", { name: "Sample B", date: "1987-11-03", time: "23:10", latitude: 59.91273, longitude: 10.74609, placeLabel: "Oslo" }, { sharedAt: 1_792_000_000_000, savedAt: 200 });

/** Every byte the store holds for the inbox, read as text: nothing of the chart may be legible. */
function rawInbox(store) {
  const { inbox, inboxKey } = store.dump();
  const text = (b) => new TextDecoder("utf-8", { fatal: false }).decode(b);
  return [...inbox.entries()].map(([name, s]) => `${name}|${text(s.epk)}|${text(s.iv)}|${text(s.ct)}`).join("\n") + text(inboxKey ?? new Uint8Array());
}

test("sealed to the public key, opened with the private one; nothing readable in between", async () => {
  const pair = await crypto.subtle.generateKey(CURVE, false, ["deriveBits"]);
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const sealed = await sealForInbox(spki, "space-1", "in/abc", SAMPLE);
  assert.equal(sealed.epk.length, 65, "an uncompressed P-256 point");
  assert.equal(sealed.iv.length, 12);
  assert.deepEqual(await openInboxEntry(pair.privateKey, "space-1", "in/abc", sealed), SAMPLE);
  const legible = new TextDecoder("utf-8", { fatal: false }).decode(sealed.ct);
  for (const word of ["Sample", "Oslo", "1987", "59.91", "smp-1"]) assert.ok(!legible.includes(word), word);
  // Each entry its own ephemeral key: the same chart sealed twice shares nothing.
  const again = await sealForInbox(spki, "space-1", "in/abc", SAMPLE);
  assert.notDeepEqual(again.epk, sealed.epk);
  assert.notDeepEqual(again.ct, sealed.ct);
});

test("tampering fails closed: altered bytes, another name, another space, another key", async () => {
  const pair = await crypto.subtle.generateKey(CURVE, false, ["deriveBits"]);
  const other = await crypto.subtle.generateKey(CURVE, false, ["deriveBits"]);
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const sealed = await sealForInbox(spki, "space-1", "in/abc", CAMILLE);
  const flip = (bytes, at) => {
    const out = new Uint8Array(bytes);
    out[at] ^= 1;
    return out;
  };
  const attempts = [
    ["the ciphertext", pair.privateKey, "space-1", "in/abc", { ...sealed, ct: flip(sealed.ct, 5) }],
    ["the tag", pair.privateKey, "space-1", "in/abc", { ...sealed, ct: flip(sealed.ct, sealed.ct.length - 1) }],
    ["the nonce", pair.privateKey, "space-1", "in/abc", { ...sealed, iv: flip(sealed.iv, 0) }],
    ["the ephemeral key", pair.privateKey, "space-1", "in/abc", { ...sealed, epk: flip(sealed.epk, 40) }],
    ["the entry's name", pair.privateKey, "space-1", "in/abd", sealed],
    ["the space", pair.privateKey, "space-2", "in/abc", sealed],
    ["the key", other.privateKey, "space-1", "in/abc", sealed],
  ];
  for (const [what, key, space, name, entry] of attempts) {
    await assert.rejects(() => openInboxEntry(key, space, name, entry), undefined, `${what} changed, yet it opened`);
  }
});

test("the key pair: made once with the space, the public half beside it, put back after a restore", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  assert.equal(await store.getInboxKey(), null, "none before the space is opened by the page");
  const first = await inboxKeyFor(vault, store);
  const record = await vault.get(INBOX_KEY_RECORD);
  assert.equal(record.v, 1);
  const spki = await store.getInboxKey();
  assert.equal(b64u(spki), record.pub);
  assert.equal(first.extractable, false, "the page holds the private key non-extractable");
  // Again: the same pair.
  await inboxKeyFor(vault, store);
  assert.equal(b64u(await store.getInboxKey()), record.pub);
  assert.equal((await vault.get(INBOX_KEY_RECORD)).priv, record.priv);
  // The public half gone (a backup restored brings the record only): put back from the record.
  await store.putInboxKey(null);
  const again = await inboxKeyFor(vault, store);
  assert.equal(b64u(await store.getInboxKey()), record.pub);
  const sealed = await sealForInbox(await store.getInboxKey(), vault.meta.id, "in/x", CAMILLE);
  assert.deepEqual(await openInboxEntry(again, vault.meta.id, "in/x", sealed), CAMILLE);
  // An unreadable record: a new pair, its public half replacing the old one.
  await vault.put(INBOX_KEY_RECORD, { v: 1, pub: "x", priv: "not a key" });
  await inboxKeyFor(vault, store);
  assert.notEqual(b64u(await store.getInboxKey()), record.pub);
});

test("while locked: sealed into the inbox when the space has a public key, nothing kept when it has none or is full", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  vault.lock();
  // A space made before the inbox, not unlocked since: nothing is written, in the clear or otherwise.
  assert.equal(await keepWhileLocked(SAMPLE, store), "no-key");
  assert.equal(store.dump().inbox.size, 0);
  const open = await Vault.unlock(store, { passphrase: PASS });
  await inboxKeyFor(open, store);
  open.lock();
  assert.equal(await keepWhileLocked(SAMPLE, store), "sealed");
  const [name] = [...store.dump().inbox.keys()];
  assert.match(name, /^in\/[\w-]{16}$/, "an opaque name");
  const raw = rawInbox(store);
  for (const word of ["Sample", "Oslo", "1987", "59.91", "Camille"]) assert.ok(!raw.includes(word), `"${word}" readable in the inbox`);
  for (let i = 1; i < INBOX_MAX; i++) assert.equal(await keepWhileLocked(SAMPLE, store), "sealed");
  assert.equal(await keepWhileLocked(SAMPLE, store), "full");
  assert.equal(store.dump().inbox.size, INBOX_MAX);
});

test("at unlock: the charts join the space once each, newest first, never over a chart kept; the inbox is emptied", async () => {
  const store = memoryStore();
  const created = await Vault.create(store, { passphrase: PASS });
  let vault = created.vault;
  await vault.write([
    [CHART_RECORD + CAMILLE.id, CAMILLE],
    [LIBRARY_RECORD, { order: [CAMILLE.id], activeId: CAMILLE.id }],
  ]);
  await inboxKeyFor(vault, store);
  const keptBefore = (await store.listItems(CHART_RECORD + CAMILLE.id))[0][1];
  vault.lock();

  const newer = stored("smp-2", { ...SAMPLE.input }, { savedAt: 300, sharedAt: 1_792_000_100_000 });
  const lasse = stored("las-1", { name: "Lasse", date: "1970-01-02", latitude: 60.39, longitude: 5.32 }, { savedAt: 250, sharedAt: 1_792_000_050_000 });
  // The same birth as a kept chart under another id, and the kept chart's own id with another birth: neither may replace it.
  const camilleAgain = stored("cam-2", { name: "Camille (sent)" }, { savedAt: 400 });
  const sameId = stored(CAMILLE.id, { name: "Intruder", date: "2001-01-01" }, { savedAt: 500 });
  for (const row of [SAMPLE, newer, lasse, camilleAgain, sameId]) assert.equal(await keepWhileLocked(row, store), "sealed");
  // An altered entry and one sealed for another space: dropped unread.
  const names = [...store.dump().inbox.keys()];
  const altered = store.dump().inbox.get(names[0]);
  await store.putInbox("in/altered", { ...altered, ct: Uint8Array.from(altered.ct, (b, i) => (i === 3 ? b ^ 1 : b)) });
  await store.putInbox("in/elsewhere", await sealForInbox(await store.getInboxKey(), "another-space", "in/elsewhere", stored("zzz", { name: "Elsewhere" })));
  assert.equal(store.dump().inbox.size, 7);

  vault = await Vault.unlock(store, { passphrase: PASS });
  const added = await joinInbox(vault, store);
  assert.equal(added, 2, "Sample B once (two copies of one birth), Lasse; Camille is kept already");
  assert.equal(store.dump().inbox.size, 0, "the inbox is emptied");
  const { rows } = await vault.list(CHART_RECORD);
  const byId = new Map(rows.map(([key, row]) => [key.slice(CHART_RECORD.length), row]));
  assert.deepEqual([...byId.keys()].sort(), ["cam-1", "las-1", "smp-2"]);
  assert.equal(byId.get("cam-1").input.name, "Camille", "the kept chart is never written over");
  assert.deepEqual((await store.listItems(CHART_RECORD + CAMILLE.id))[0][1], keptBefore, "not even sealed again");
  assert.equal(byId.get("smp-2").sharedAt, 1_792_000_100_000, "the mark goes with the chart, sealed");
  const library = await vault.get(LIBRARY_RECORD);
  assert.deepEqual(library.order, ["smp-2", "las-1", "cam-1"], "the newest first, before the charts kept");
  assert.equal(library.activeId, CAMILLE.id, "the chart open stays open");
  // Nothing left to join the next time.
  assert.equal(await joinInbox(vault, store), 0);
});

test("a new space, or one restored from a backup, starts with an empty inbox", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  await inboxKeyFor(vault, store);
  vault.lock();
  await keepWhileLocked(SAMPLE, store);
  const backup = await (await Vault.unlock(store, { passphrase: PASS })).backup();
  // The backup holds the key pair's record (sealed), not the inbox.
  assert.ok(backup.items.some(([name]) => name === INBOX_KEY_RECORD));
  assert.ok(!JSON.stringify(backup).includes("in/"));
  await store.erase();
  assert.equal(await store.getInboxKey(), null);
  assert.equal(store.dump().inbox.size, 0);
  await keepWhileLocked(SAMPLE, store).then((r) => assert.equal(r, "no-key"));
  await adoptBackup(store, backup);
  assert.equal(store.dump().inbox.size, 0);
  // Its first unlock puts the public half back from the record.
  const restored = await Vault.unlock(store, { passphrase: PASS });
  await joinInbox(restored, store);
  assert.equal(b64u(await store.getInboxKey()), (await restored.get(INBOX_KEY_RECORD)).pub);
});
