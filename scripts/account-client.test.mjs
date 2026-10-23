// The synced account on the device (src/lib/account/client; share and compare plan, feature 4;
// docs/sync-protocol.md, section 6): what syncs and what stays on one device; how every kind of
// record merges (a record on its own, the library, the groups with their deletions, the homes,
// the encyclopedia's bookmarks, the ways in); and the engine itself, two devices against the real
// server (service.server.ts and its memory store, no network): records sent and read, a conflict
// merged the same way on both, deletions (a change beats one), a group deleted that stays deleted,
// the library's order joined, a cursor too old listing everything again, a record written again
// unchanged not sent, one too large kept here, a server rolling a record back, the account full,
// and what the server holds: bucket sizes and hashed names only. And whether the server keeps
// accounts at all (the 2.0 fixes, item 4): asked once a visit, the answer kept when it is clear.
import assert from "node:assert/strict";
import { test } from "node:test";
import { b64u, fromB64u, randomBytes } from "../src/lib/account/encoding.ts";
import { openRecord, recordId, sealRecord, syncKeys } from "../src/lib/account/keys.ts";
import { API_BASE, BUCKETS } from "../src/lib/account/protocol.ts";
import { accountService } from "../src/lib/account/service.server.ts";
import { memoryStore } from "../src/lib/account/store-memory.server.ts";
import { AccountFailure, AccountSession } from "../src/lib/account/client/api.ts";
import { SyncEngine, contentHash, newSyncState } from "../src/lib/account/client/engine.ts";
import { SPACE_WAYS, adopt, agrees, kindOf, merge, mergeById, mergeIds, syncs, waysUsable } from "../src/lib/account/client/merge.ts";
import { formatAccountId, readAccountId } from "../src/lib/account/client/account-id.ts";
import { syncKeyBytes, syncKeysFrom } from "../src/lib/account/client/keyring.ts";
import { ACCOUNT_PRF_SALT } from "../src/lib/account/client/passkeys.ts";
import { PROBE, accountAvailable, accountKnown, forgetAccountAnswer } from "../src/lib/account/client/available.ts";
import { prfSalt } from "../src/lib/account/keys.ts";
import { ORIGIN, call, checkStolenRows, createAccount, linkDevice } from "./account-helpers.mjs";

const T0 = Date.UTC(2026, 9, 23, 12);

/* ------------------------------------------------------------ what syncs */

test("what syncs: every record of the space but one device's own (its check, first view, inbox key, backup mark, AI keys, partners, Compare, pages read, the engine's state)", () => {
  for (const name of ["chart/abc", "note/abc", "state/library", "state/groups", "fs/homes", "enc/bookmarks", "enc/note/saturn", SPACE_WAYS, "some/future-record"]) {
    assert.ok(syncs(name), name);
  }
  for (const name of ["sys/check", "view/first", "inbox/key", "state/backup", "state/ai", "state/pair", "state/compare", "enc/recent", "sync/account", "sync/anything", ""]) {
    assert.ok(!syncs(name), name);
  }
  assert.equal(kindOf("chart/x"), "record");
  assert.equal(kindOf("note/x"), "record");
  assert.equal(kindOf("enc/note/x"), "record");
  assert.equal(kindOf("state/library"), "library");
  assert.equal(kindOf("state/groups"), "groups");
  assert.equal(kindOf("fs/homes"), "homes");
  assert.equal(kindOf("enc/bookmarks"), "bookmarks");
  assert.equal(kindOf(SPACE_WAYS), "ways");
});

/* ------------------------------------------------------------ the merge rules */

test("a record on its own: the later write wins, a tie the same on both devices, and a change beats a deletion", () => {
  const a = { value: { text: "A" }, t: 10 };
  const b = { value: { text: "B" }, t: 20 };
  assert.deepEqual(merge("chart/x", a, b, null, false), { text: "B" });
  assert.deepEqual(merge("chart/x", b, a, null, false), { text: "B" });
  const tieA = merge("note/x", { value: { text: "A" }, t: 5 }, { value: { text: "B" }, t: 5 }, null, false);
  const tieB = merge("note/x", { value: { text: "B" }, t: 5 }, { value: { text: "A" }, t: 5 }, null, false);
  assert.deepEqual(tieA, tieB);
  // Deleted on one side, changed on the other: the change stays, whichever side.
  assert.deepEqual(merge("chart/x", { value: null, t: 99 }, b, null, false), { text: "B" });
  assert.deepEqual(merge("chart/x", a, { value: null, t: 99 }, null, false), { text: "A" });
  assert.equal(merge("enc/note/x", { value: null, t: 1 }, { value: null, t: 2 }, null, false), null);
});

test("lists merge item by item against their base: additions joined, deletions kept, changes beat deletions, the order of the side that moved things", () => {
  const id = (x) => x.id;
  const pick = (l, r) => (l.v >= r.v ? l : r);
  const base = [{ id: "a", v: 1 }, { id: "b", v: 1 }, { id: "c", v: 1 }];
  // Here: b deleted, d added. There: c changed, e added.
  const local = [{ id: "a", v: 1 }, { id: "c", v: 1 }, { id: "d", v: 1 }];
  const remote = [{ id: "a", v: 1 }, { id: "b", v: 1 }, { id: "c", v: 2 }, { id: "e", v: 1 }];
  assert.deepEqual(mergeById(local, remote, base, id, pick).map((x) => `${x.id}${x.v}`), ["a1", "c2", "e1", "d1"]);
  // Deleted here, changed there: it comes back.
  assert.deepEqual(mergeById([{ id: "a", v: 1 }], [{ id: "a", v: 1 }, { id: "b", v: 5 }], base.slice(0, 2), id, pick).map((x) => x.id), ["a", "b"]);
  // No base (a first sync): nothing is taken out.
  assert.deepEqual(mergeIds(["x", "y"], ["y", "z"], null), ["x", "y", "z"]);
  // This side reordered: its order wins; the other's additions follow.
  assert.deepEqual(mergeIds(["c", "a", "b"], ["a", "b", "c", "d"], ["a", "b", "c"]), ["c", "a", "b", "d"]);
  // This side did not reorder: the other's order.
  assert.deepEqual(mergeIds(["a", "b", "c", "x"], ["c", "b", "a"], ["a", "b", "c"]), ["c", "b", "a", "x"]);
});

test("the library: its order merged, the chart open (and the one before) stay this device's; a new device takes the account's", () => {
  const base = { order: ["a", "b"], activeId: "a" };
  const local = { order: ["a", "b", "c"], activeId: "c", previousId: "a" };
  const remote = { order: ["d", "a"], activeId: "d" };
  const kept = merge("state/library", { value: local, t: 1 }, { value: remote, t: 2 }, base, true);
  assert.deepEqual(kept.order.sort(), ["a", "c", "d"]);
  assert.equal(kept.activeId, "c");
  assert.equal(kept.previousId, "a");
  assert.deepEqual(adopt("state/library", local, remote), { order: ["d", "a"], activeId: "c", previousId: "a" });
  assert.deepEqual(adopt("state/library", null, remote), remote);
  // What the server holds agrees when only the chart open differs.
  assert.ok(agrees("state/library", { order: ["d", "a"], activeId: "a" }, remote));
  assert.ok(!agrees("state/library", { order: ["a", "d"], activeId: "d" }, remote));
});

test("groups: by id, a name changed on one side wins, charts joined as sets, a deleted group stays deleted, two groups of one name become one", () => {
  const g = (id, name, members, at = 1) => ({ id, name, members, at });
  const base = { groups: [g("1", "Family", ["a", "b"]), g("2", "Friends", ["c"]), g("3", "Clients", [])] };
  // Here: Family renamed, b taken out, Clients deleted. There: Friends gets d, Family gets e, Work added.
  const local = { groups: [g("1", "Family 2", ["a"], 5), g("2", "Friends", ["c"])] };
  const remote = { groups: [g("1", "Family", ["a", "b", "e"], 6), g("2", "Friends", ["c", "d"], 6), g("3", "Clients", []), g("4", "Work", ["x"], 6)] };
  const kept = merge("state/groups", { value: local, t: 5 }, { value: remote, t: 6 }, base, true);
  assert.deepEqual(
    kept.groups.map((x) => `${x.id}:${x.name}:${x.members.join("+")}`),
    ["1:Family 2:a+e", "2:Friends:c+d", "4:Work:x"],
  );
  // Both renamed: the later.
  const both = merge("state/groups", { value: { groups: [g("1", "Fam", ["a"], 9)] }, t: 9 }, { value: { groups: [g("1", "Famille", ["a"], 7)] }, t: 7 }, { groups: [g("1", "Family", ["a"])] }, true);
  assert.equal(both.groups[0].name, "Fam");
  // Made on two devices under one name: one group, the smaller id, both's charts; the same on either side.
  const one = merge("state/groups", { value: { groups: [g("zz", "Family", ["a"])] }, t: 1 }, { value: { groups: [g("aa", "family", ["b"])] }, t: 1 }, null, false);
  const other = merge("state/groups", { value: { groups: [g("aa", "family", ["b"])] }, t: 1 }, { value: { groups: [g("zz", "Family", ["a"])] }, t: 1 }, null, false);
  assert.deepEqual(one.groups.map((x) => [x.id, x.members.sort()]), [["aa", ["a", "b"]]]);
  assert.deepEqual(other.groups.map((x) => [x.id, x.members.sort()]), [["aa", ["a", "b"]]]);
  // Every group deleted here, none changed there: none left (the record goes).
  assert.equal(merge("state/groups", { value: null, t: 3 }, { value: base, t: 2 }, base, true), null);
  // At most 24.
  const many = { groups: Array.from({ length: 30 }, (_, i) => g(`g${String(i).padStart(2, "0")}`, `Group ${i}`, [])) };
  assert.equal(merge("state/groups", { value: many, t: 1 }, { value: { groups: [] }, t: 1 }, null, false).groups.length, 24);
});

test("homes: by id, the one saved later; the home open stays this device's; bookmarks by page, newest first; ways in by kind and passkey", () => {
  const home = (id, name, savedAt) => ({ id, name, typed: "180", source: "compass", year: "1990", savedAt, rooms: [] });
  const base = { homes: [home("h1", "Flat", 1), home("h2", "Cabin", 1)], activeId: "h1" };
  const local = { homes: [home("h1", "Flat", 1), home("h2", "Cabin by the lake", 5)], activeId: "h2" };
  const remote = { homes: [home("h1", "Flat", 1), home("h2", "Cabin", 1), home("h3", "Studio", 4)], activeId: "h3" };
  const kept = merge("fs/homes", { value: local, t: 5 }, { value: remote, t: 4 }, base, true);
  assert.deepEqual(kept.homes.map((h) => `${h.id}:${h.name}`), ["h1:Flat", "h2:Cabin by the lake", "h3:Studio"]);
  assert.equal(kept.activeId, "h2");
  // Deleted there, renamed here: the home stays.
  const gone = merge("fs/homes", { value: local, t: 5 }, { value: { homes: [home("h1", "Flat", 1)], activeId: null }, t: 4 }, base, true);
  assert.deepEqual(gone.homes.map((h) => h.id), ["h1", "h2"]);
  assert.equal(adopt("fs/homes", local, remote).activeId, "h2", "the home open here stays open");
  assert.equal(adopt("fs/homes", local, { homes: [home("h1", "Flat", 1)], activeId: "h1" }).activeId, null, "the home open here is gone from the server's copy");
  assert.ok(agrees("fs/homes", { ...remote, activeId: "h1" }, remote));

  const page = (id, at) => ({ id, at, glyph: "♄", title: { en: id, fr: id }, slug: { en: id, fr: id } });
  // Saturn marked here and there (the later kept), Venus marked there, the Moon unmarked there.
  const marks = merge("enc/bookmarks", { value: [page("saturn", 3), page("moon", 1)], t: 3 }, { value: [page("venus", 4), page("saturn", 2)], t: 4 }, [page("moon", 1)], true);
  assert.deepEqual(marks.map((p) => `${p.id}${p.at}`), ["venus4", "saturn3"]);
  // The moon unmarked here, nothing changed there: it stays unmarked.
  assert.deepEqual(merge("enc/bookmarks", { value: [page("saturn", 3)], t: 3 }, { value: [page("saturn", 3), page("moon", 1)], t: 1 }, [page("saturn", 3), page("moon", 1)], true).map((p) => p.id), ["saturn"]);

  const pass = (salt) => ({ kind: "passphrase", id: "p", salt, m: 19456, t: 2, p: 1, iv: "i", ct: "c" });
  const code = (ct) => ({ kind: "recovery", id: "r", iv: "i", ct });
  const key = (credId) => ({ kind: "passkey", id: credId, credId, prfSalt: "s", added: 1, iv: "i", ct: "c" });
  const wb = { id: "S", passkeyUser: "U", wraps: [pass("old"), code("one")] };
  // Here a passkey added; there the passphrase changed: both kept.
  const wl = { id: "S", passkeyUser: "U", wraps: [pass("old"), code("one"), key("k1")] };
  const wr = { id: "S", passkeyUser: "U", wraps: [pass("new"), code("one")] };
  const ways = merge(SPACE_WAYS, { value: wl, t: 2 }, { value: wr, t: 3 }, wb, true);
  assert.deepEqual(ways.wraps.map((w) => (w.kind === "passphrase" ? `pass:${w.salt}` : w.kind)).sort(), ["pass:new", "passkey", "recovery"]);
  // Another space's ways never replace this one's; a set that would not open the space neither.
  assert.deepEqual(merge(SPACE_WAYS, { value: wl, t: 1 }, { value: { ...wr, id: "T" }, t: 9 }, wb, true), wl);
  assert.deepEqual(adopt(SPACE_WAYS, wl, { ...wr, wraps: [code("two")] }), wl);
  assert.ok(waysUsable(wr.wraps) && !waysUsable([code("x")]) && !waysUsable([pass("x")]));
});

/* ------------------------------------------------------------ the engine, two devices */

function setup(options = {}) {
  const store = memoryStore();
  const clock = { now: T0 };
  const svc = accountService({ store, secret: randomBytes(32), origins: [ORIGIN], now: () => clock.now, rules: false, limits: options.limits });
  return { svc, store, clock };
}

/** The service as a page's transport: its answers, or an AccountFailure. */
function transportFor(svc, log = null) {
  return async (op, body, token) => {
    log?.push({ op, body });
    const res = await call(svc, op, body, { token });
    if (res.status !== 200) throw new AccountFailure(res.body?.error ?? "unavailable", res.status);
    return res.body;
  };
}

/** A device's private space as the engine sees it: a map of records, each write a new fingerprint. */
function memoryLocal() {
  const items = new Map();
  let state = null;
  let n = 0;
  const clone = (v) => (v === null || v === undefined ? null : structuredClone(v));
  return {
    items,
    async snapshot() {
      return new Map([...items].filter(([k]) => syncs(k)).map(([k, v]) => [k, v.fp]));
    },
    async read(name) {
      return items.has(name) ? clone(items.get(name).value) : null;
    },
    async write(changes) {
      const out = new Map();
      for (const [name, value] of changes) {
        if (value === null) {
          items.delete(name);
          out.set(name, null);
        } else {
          const fp = `fp${(n += 1)}`;
          items.set(name, { value: clone(value), fp });
          out.set(name, fp);
        }
      }
      return out;
    },
    async loadState() {
      return clone(state);
    },
    async saveState(s) {
      state = clone(s);
    },
    /** The reader changes a record here. */
    set(name, value) {
      if (value === null) items.delete(name);
      else items.set(name, { value: clone(value), fp: `fp${(n += 1)}` });
    },
    get(name) {
      return items.has(name) ? clone(items.get(name).value) : null;
    },
    get state() {
      return state;
    },
  };
}

async function device(svc, who, clock, local = memoryLocal()) {
  const session = new AccountSession(transportFor(svc), { account: who.account, device: who.device }, who.deviceKey, () => clock.now);
  session.adopt({ token: who.token, ttl: 3600 });
  if (!(await local.loadState())) await local.saveState(newSyncState(who.account, who.device));
  const engine = new SyncEngine({ session, keys: who.keys, local, now: () => clock.now });
  return { local, engine, session, who };
}

const CHART_A = { id: "fixture-a", input: { name: "TraceQA", date: "15/06/1990", time: "12:00", placeLabel: "Paris, France", latitude: 48.8566, longitude: 2.3522 }, chart: { planets: [1, 2, 3] }, savedAt: 1 };
const CHART_B = { id: "fixture-b", input: { name: "Sample B", date: "03/11/1987", time: "23:10", placeLabel: "Oslo, Norway", latitude: 59.9139, longitude: 10.7522 }, chart: { planets: [4, 5, 6] }, savedAt: 2 };
const WAYS = { id: "space-one", passkeyUser: "user-one", wraps: [{ kind: "passphrase", id: "p", salt: "s", m: 19456, t: 2, p: 1, iv: "i", ct: "c" }, { kind: "recovery", id: "r", iv: "i", ct: "c" }] };

async function twoDevices(options = {}) {
  const { svc, store, clock } = setup(options);
  const one = await createAccount(svc, { fast: true });
  const a = await device(svc, one, clock);
  a.local.set(SPACE_WAYS, WAYS);
  a.local.set("chart/fixture-a", CHART_A);
  a.local.set("state/library", { order: ["fixture-a"], activeId: "fixture-a" });
  a.local.set("sys/check", { space: "space-one" });
  a.local.set("state/ai", { grok: "never-sent-key" });
  const first = await a.engine.round();
  assert.equal(first.sent, 3, "the ways, the chart and the library; the check and the AI keys stay");
  const two = await linkDevice(svc, one, { opener: "giver" });
  clock.now += 1000;
  const b = await device(svc, two, clock);
  const got = await b.engine.round();
  assert.equal(got.pulled, 3);
  return { svc, store, clock, a, b };
}

test("two devices: what one sends, the other gets, sealed; a device's own records never leave it", async () => {
  const { store, a, b, clock } = await twoDevices();
  assert.deepEqual(b.local.get("chart/fixture-a"), CHART_A);
  assert.deepEqual(b.local.get(SPACE_WAYS), WAYS);
  assert.equal(b.local.get("state/ai"), null);
  assert.equal(b.local.get("sys/check"), null);
  // A new device takes the account's open chart; nothing more to send either way.
  assert.equal(b.local.get("state/library").activeId, "fixture-a");
  clock.now += 1000;
  assert.equal((await a.engine.round()).sent, 0);
  assert.equal((await b.engine.round()).sent, 0);
  // On the server: hashed names, bucket sizes, nothing readable.
  const tables = store.dump();
  assert.ok(tables.records.every((r) => r.deleted || BUCKETS.includes(r.blob.byteLength)));
  const { found } = checkStolenRows(tables, ["TraceQA", "Paris", "15/06/1990", "chart/", "state/", "space/ways", "never-sent-key", "fixture-a"]);
  assert.deepEqual(found, []);
});

test("changes flow both ways; a conflict on one chart ends the same on both devices, the later change kept", async () => {
  const { a, b, clock } = await twoDevices();
  // B adds a chart, A a note; both change chart A, A later.
  b.local.set("chart/fixture-b", CHART_B);
  b.local.set("state/library", { order: ["fixture-b", "fixture-a"], activeId: "fixture-b" });
  b.engine.noteWrites(["chart/fixture-b", "state/library"]);
  a.local.set("note/fixture-a", { text: "A note", at: clock.now });
  clock.now += 1000;
  b.local.set("chart/fixture-a", { ...CHART_A, savedAt: 10, by: "b" });
  b.engine.noteWrites(["chart/fixture-a"]);
  clock.now += 1000;
  a.local.set("chart/fixture-a", { ...CHART_A, savedAt: 20, by: "a" });
  a.engine.noteWrites(["chart/fixture-a", "note/fixture-a"]);
  clock.now += 1000;
  await b.engine.round();
  await a.engine.round();
  await b.engine.round();
  await a.engine.round();
  for (const d of [a, b]) {
    assert.equal(d.local.get("chart/fixture-a").by, "a", "the later change");
    assert.deepEqual(d.local.get("chart/fixture-b"), CHART_B);
    assert.equal(d.local.get("note/fixture-a").text, "A note");
    assert.deepEqual([...d.local.get("state/library").order].sort(), ["fixture-a", "fixture-b"]);
  }
  // Each device kept its own open chart.
  assert.equal(a.local.get("state/library").activeId, "fixture-a");
  assert.equal(b.local.get("state/library").activeId, "fixture-b");
  // And it has settled: nothing more to send.
  assert.equal((await a.engine.round()).sent + (await b.engine.round()).sent, 0);
});

test("deletions: one deleted on a device goes everywhere; one changed elsewhere meanwhile comes back, never lost", async () => {
  const { a, b, clock } = await twoDevices();
  a.local.set("note/fixture-a", { text: "keep me?", at: 1 });
  a.local.set("chart/fixture-b", CHART_B);
  await a.engine.round();
  await b.engine.round();
  assert.equal(b.local.get("note/fixture-a").text, "keep me?");
  // A deletes the note: gone on B.
  a.local.set("note/fixture-a", null);
  clock.now += 1000;
  await a.engine.round();
  await b.engine.round();
  assert.equal(b.local.get("note/fixture-a"), null);
  // A deletes chart B while B changes it: it comes back on A.
  a.local.set("chart/fixture-b", null);
  b.local.set("chart/fixture-b", { ...CHART_B, savedAt: 99 });
  clock.now += 1000;
  await a.engine.round();
  await b.engine.round();
  await a.engine.round();
  assert.equal(a.local.get("chart/fixture-b").savedAt, 99);
  assert.equal(b.local.get("chart/fixture-b").savedAt, 99);
  // The other order: B's change arrives first, A's deletion after it conflicts and gives way.
  b.local.set("chart/fixture-b", { ...CHART_B, savedAt: 100 });
  await b.engine.round();
  a.local.set("chart/fixture-b", null);
  clock.now += 1000;
  await a.engine.round();
  assert.equal(a.local.get("chart/fixture-b").savedAt, 100);
});

test("a group deleted on one device stays deleted when the other changes another group; groups made on both join", async () => {
  const { a, b, clock } = await twoDevices();
  const g = (id, name, members, at) => ({ id, name, members, at });
  a.local.set("state/groups", { groups: [g("1", "Family", ["fixture-a"], 1), g("2", "Clients", [], 1)] });
  await a.engine.round();
  await b.engine.round();
  clock.now += 1000;
  // A deletes Clients; B renames Family and adds Friends.
  a.local.set("state/groups", { groups: [g("1", "Family", ["fixture-a"], 1)] });
  b.local.set("state/groups", { groups: [g("1", "Famille", ["fixture-a"], clock.now), g("2", "Clients", [], 1), g("3", "Friends", [], clock.now)] });
  await a.engine.round();
  await b.engine.round();
  await a.engine.round();
  for (const d of [a, b]) assert.deepEqual(d.local.get("state/groups").groups.map((x) => x.name), ["Famille", "Friends"]);
});

test("a record written again unchanged is not sent; one too large to seal stays on its device; homes and bookmarks sync", async () => {
  const { a, b, clock } = await twoDevices();
  a.local.set("chart/fixture-a", structuredClone(CHART_A));
  clock.now += 1000;
  assert.equal((await a.engine.round()).sent, 0, "the same content, a new nonce: nothing sent");
  // About 900 KB of text that does not compress: past the largest bucket.
  const noise = b64u(randomBytes(700_000));
  a.local.set("chart/huge", { id: "huge", noise });
  a.local.set("fs/homes", { homes: [{ id: "h1", name: "Flat", typed: "180", source: "compass", year: "1990", savedAt: 1, rooms: [] }], activeId: "h1" });
  a.local.set("enc/bookmarks", [{ id: "saturn", at: 1, glyph: "♄", title: { en: "Saturn", fr: "Saturne" }, slug: { en: "saturn", fr: "saturne" } }]);
  const out = await a.engine.round();
  assert.deepEqual(out.tooBig, ["chart/huge"]);
  assert.equal(out.sent, 2);
  await b.engine.round();
  assert.equal(b.local.get("chart/huge"), null);
  assert.equal(b.local.get("fs/homes").homes[0].name, "Flat");
  assert.equal(b.local.get("fs/homes").activeId, "h1", "a device without homes takes the account's open one");
  assert.equal(b.local.get("enc/bookmarks")[0].id, "saturn");
});

test("a cursor older than the account's purge mark lists everything again: what was deleted meanwhile goes, what changed here is kept", async () => {
  const { a, b, clock } = await twoDevices({ limits: { tombstones: 1 } });
  for (const i of [1, 2, 3]) a.local.set(`note/${i}`, { text: `note ${i}`, at: i });
  await a.engine.round();
  await b.engine.round();
  assert.equal(b.local.get("note/3").text, "note 3");
  // B goes quiet; A deletes three notes (the oldest deletions purged beyond the cap); B changed note 3 meanwhile.
  for (const i of [1, 2, 3]) a.local.set(`note/${i}`, null);
  clock.now += 1000;
  await a.engine.round();
  b.local.set("note/3", { text: "note 3, changed offline", at: clock.now });
  clock.now += 1000;
  await b.engine.round();
  assert.equal(b.local.get("note/1"), null);
  assert.equal(b.local.get("note/2"), null);
  assert.equal(b.local.get("note/3").text, "note 3, changed offline");
  await a.engine.round();
  assert.equal(a.local.get("note/3").text, "note 3, changed offline", "sent again as new");
  assert.deepEqual(b.local.get("chart/fixture-a"), CHART_A, "what was not deleted stays");
});

test("a server offering an older copy than the device last had is ignored, and the device's copy is sent again", async () => {
  const { a, clock } = await twoDevices();
  a.local.set("note/x", { text: "first", at: 1 });
  await a.engine.round();
  const keys = a.who.keys;
  const rid = await recordId(keys, "note/x");
  const old = b64u(await sealRecord(keys, rid, { n: "note/x", t: 1, v: { text: "rolled back" } }));
  clock.now += 1000;
  a.local.set("note/x", { text: "second", at: 2 });
  a.engine.noteWrites(["note/x"]);
  await a.engine.round();
  // The server's next answer slips in the old blob as a newer version.
  const real = a.session.transport;
  let slipped = false;
  const sneaky = async (op, body, token) => {
    const out = await real(op, body, token);
    if (op === "records/changes" && !slipped) {
      slipped = true;
      return { changes: [{ rid, version: 1_000, blob: old }], cursor: out.cursor, more: false };
    }
    return out;
  };
  const session = new AccountSession(sneaky, { account: a.who.account, device: a.who.device }, a.who.deviceKey, () => clock.now);
  session.adopt({ token: a.who.token, ttl: 3600 });
  const engine = new SyncEngine({ session, keys, local: a.local, now: () => clock.now });
  await engine.round().catch(() => {});
  assert.equal(a.local.get("note/x").text, "second");
});

test("an account full: the batch is refused whole and the engine says so (507)", async () => {
  const { svc, clock } = setup({ limits: { records: 2 } });
  const one = await createAccount(svc, { fast: true });
  const a = await device(svc, one, clock);
  for (const i of [1, 2, 3]) a.local.set(`note/${i}`, { text: `${i}`, at: i });
  await assert.rejects(a.engine.round(), (err) => err instanceof AccountFailure && err.code === "quota");
});

test("the device's sealing is the server's: names hashed under the account's name key, records padded to the server's buckets", async () => {
  const keys = await syncKeys(randomBytes(32), b64u(randomBytes(16)));
  const rid = await recordId(keys, "chart/fixture-a");
  assert.equal(fromB64u(rid).byteLength, 16);
  assert.notEqual(rid, await recordId(keys, "chart/fixture-b"));
  for (const size of [10, 5_000, 20_000, 100_000]) {
    const v = { text: b64u(randomBytes(size)) };
    const blob = await sealRecord(keys, rid, { n: "chart/fixture-a", t: 1, v });
    assert.ok(BUCKETS.includes(blob.byteLength), `${size}: ${blob.byteLength}`);
    assert.deepEqual((await openRecord(keys, rid, blob)).v, v);
  }
  // A note and a chart look alike.
  const note = await sealRecord(keys, await recordId(keys, "note/x"), { n: "note/x", t: 1, v: { text: "hi" } });
  const chart = await sealRecord(keys, rid, { n: "chart/fixture-a", t: 1, v: CHART_A });
  assert.equal(note.byteLength, chart.byteLength);
  assert.equal(await contentHash({ b: 1, a: 2 }), await contentHash({ a: 2, b: 1 }), "a hash of the content, keys in any order");
});

test("the account id as shown: base32 in groups of four, read back in either spelling, forgiving case and the look-alike letters", () => {
  for (let i = 0; i < 50; i += 1) {
    const id = b64u(randomBytes(16));
    const shown = formatAccountId(id);
    assert.match(shown, /^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{2}$/);
    assert.equal(readAccountId(shown), id);
    assert.equal(readAccountId(shown.toLowerCase().replace(/-/g, " ")), id);
    assert.equal(readAccountId(shown.replace(/0/g, "O").replace(/1/g, "l")), id);
    assert.equal(readAccountId(id), id, "the protocol's own spelling, pasted");
    assert.equal(readAccountId(` ${id} `), id);
  }
  assert.equal(readAccountId(""), null);
  assert.equal(readAccountId("ABCD-EFGH"), null);
  assert.equal(readAccountId("UUUU-UUUU-UUUU-UUUU-UUUU-UUUU-UU"), null, "U is not a symbol");
  // 26 symbols whose last two spare bits are not zero: not an id.
  assert.equal(readAccountId("ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZ"), null);
});

test("the keys kept in the space's own record are the account's: the same record names, the same records opened", async () => {
  const dataKey = randomBytes(32);
  const account = b64u(randomBytes(16));
  const direct = await syncKeys(dataKey, account);
  const kept = await syncKeysFrom(account, await syncKeyBytes(dataKey, account));
  assert.equal(await recordId(kept, "chart/fixture-a"), await recordId(direct, "chart/fixture-a"));
  const rid = await recordId(direct, "note/x");
  const blob = await sealRecord(direct, rid, { n: "note/x", t: 1, v: { text: "hello" } });
  assert.deepEqual((await openRecord(kept, rid, blob)).v, { text: "hello" });
  assert.equal(ACCOUNT_PRF_SALT, b64u(await prfSalt()), "the passkeys' fixed salt is the protocol's");
});

/* ------------------------------------------------------------ whether the server keeps accounts */

test("whether Ulune's server keeps accounts: asked once a visit with an empty body, the clear answer kept; offline asked again", async () => {
  assert.equal(PROBE, `${API_BASE}passkey/begin`);
  const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
  // The server itself, as production runs it before its database (no store, no secret): 503 "unavailable".
  const off = accountService({ store: null, secret: null, origins: [ORIGIN], rules: false });
  const asked = [];
  const serve = (service) => async (url, init) => {
    asked.push({ url, body: init.body, method: init.method, credentials: init.credentials });
    return await service.handle(String(url).slice(API_BASE.length), new Request(`${ORIGIN}${url}`, { method: init.method, headers: init.headers, body: init.body }));
  };
  forgetAccountAnswer();
  assert.equal(accountKnown(), null);
  // Asked once, however many parts ask at the same time.
  const [a, b] = await Promise.all([accountAvailable(serve(off)), accountAvailable(serve(off))]);
  assert.deepEqual([a, b], [false, false]);
  assert.deepEqual(asked, [{ url: PROBE, body: "{}", method: "POST", credentials: "omit" }]);
  // Kept for the visit: never asked again.
  assert.equal(await accountAvailable(serve(off)), false);
  assert.equal(accountKnown(), false);
  assert.equal(asked.length, 1);
  // A server that keeps accounts answers a challenge.
  forgetAccountAnswer();
  const on = accountService({ store: memoryStore(), secret: randomBytes(32), origins: [ORIGIN], rules: false });
  assert.equal(await accountAvailable(serve(on)), true);
  assert.equal(accountKnown(), true);
  // No account route at all: not set up.
  forgetAccountAnswer();
  assert.equal(await accountAvailable(async () => new Response("<!doctype html>", { status: 404 })), false);
  // Offline, a passing trouble (a minute), too many tries, an odd answer: taken as set up for now, and asked again next time.
  for (const answer of [
    async () => {
      throw new TypeError("Failed to fetch");
    },
    async () => json(503, { error: "unavailable" }, { "Retry-After": "60" }),
    async () => json(429, { error: "slow-down" }, { "Retry-After": "30" }),
    async () => new Response("bad gateway", { status: 503 }),
  ]) {
    forgetAccountAnswer();
    assert.equal(await accountAvailable(answer), true);
    assert.equal(accountKnown(), null);
  }
  forgetAccountAnswer();
});

