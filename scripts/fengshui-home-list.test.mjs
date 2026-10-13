/*
 * The homes kept, as the chart switcher and ⌘K list and open them
 * (reorganisation plan, R9; languages plan, part 28): read from an open
 * private space with no more than their names, facings and years, and never
 * held once it locks, even when it locks while they are being read or while
 * one is being opened. A made-up space in memory (no browser, no
 * cryptography: lib/space/vault.ts has its own tests); made-up homes only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_HOMES } from "../src/lib/chinese/fengshui-home-record.ts";
import { FS_HOMES_RECORD } from "../src/lib/space/records.ts";
import { setOpenVault } from "../src/lib/space/state.ts";
import { openKeptHome, readHomeList, useHomeList } from "../src/studio/modes/fengshui-home-list.ts";
import { loadHomes, useHomes } from "../src/studio/modes/fengshui-homes.ts";
import { useHomeInput } from "../src/studio/modes/fengshui-home-state.ts";

const ROOM = { id: "r1", kind: "bedroom", palace: "n" };
const RECORD = {
  homes: [
    { id: "h1", name: "Zqxv cabin", typed: "180", source: "compass", year: "1998", rooms: [ROOM], savedAt: 1 },
    { id: "h2", name: "Qwrt flat", typed: "", source: "map", year: "1972", rooms: [], savedAt: 2 },
  ],
  activeId: "h2",
};

/** A gate: what waits on `at` goes on once `open()` is called. */
function gate() {
  let open;
  const at = new Promise((resolve) => (open = resolve));
  return { at, open };
}

/** A space in memory, open; its reads and writes can be held at a gate, and each says when it starts. */
function space(records = { [FS_HOMES_RECORD]: RECORD }) {
  const v = {
    isOpen: true,
    records: new Map(Object.entries(records)),
    holdGet: null,
    holdPut: null,
    started: { get: gate(), put: gate() },
    async get(key) {
      v.started.get.open();
      if (v.holdGet) await v.holdGet;
      return structuredClone(v.records.get(key) ?? null);
    },
    async put(key, value) {
      v.started.put.open();
      if (v.holdPut) await v.holdPut;
      v.records.set(key, structuredClone(value));
    },
  };
  setOpenVault(v);
  return v;
}

/** The space locks: its key goes (lib/space/runtime.ts, lockSpace). */
function lock(v) {
  v.isOpen = false;
  setOpenVault(null);
}

/** Nothing read, nothing on the home page: as a page that has not looked yet. */
function afresh() {
  setOpenVault(null);
  useHomeList.setState({ ready: false, homes: [], keptId: null });
  useHomes.setState({ ready: false, open: false, rec: EMPTY_HOMES });
  useHomeInput.getState().clearHome();
}

test("the list: the open space's homes, names, facings and years only, in the record's order", async () => {
  afresh();
  space();
  await readHomeList();
  const { ready, homes } = useHomeList.getState();
  assert.equal(ready, true);
  assert.deepEqual(
    homes.map((h) => [h.id, h.name, h.typed, h.source, h.year]),
    [
      ["h1", "Zqxv cabin", "180", "compass", "1998"],
      ["h2", "Qwrt flat", "", "map", "1972"],
    ],
  );
  assert.equal("rooms" in homes[0], false, "the rooms stay in the space until the home page reads them");
});

test("the list: the space locked while it was read, nothing is listed", async () => {
  afresh();
  const v = space();
  const held = gate();
  v.holdGet = held.at;
  const reading = readHomeList();
  await v.started.get.at;
  lock(v);
  held.open();
  await reading;
  assert.deepEqual(useHomeList.getState().homes, []);
  assert.equal(useHomeList.getState().ready, false);
});

test("a home chosen in the switcher or ⌘K opens on the Home page, and is the one the space opens next", async () => {
  afresh();
  const v = space();
  assert.equal(await openKeptHome("h1"), true);
  const page = useHomeInput.getState();
  assert.deepEqual([page.keptId, page.name, page.typed, page.year, page.rooms.length], ["h1", "Zqxv cabin", "180", "1998", 1]);
  assert.equal(v.records.get(FS_HOMES_RECORD).activeId, "h1");
  // A home the space no longer holds, or no space open: nothing changes.
  assert.equal(await openKeptHome("gone"), false);
  assert.equal(useHomeInput.getState().keptId, "h1");
  lock(v);
  assert.equal(await openKeptHome("h2"), false);
});

test("the home page's store: the space locked while its homes were read, none comes back, nor the home last open", async () => {
  afresh();
  const v = space();
  const held = gate();
  v.holdGet = held.at;
  const reading = loadHomes();
  await v.started.get.at;
  lock(v);
  held.open();
  await reading;
  const homes = useHomes.getState();
  assert.equal(homes.open, false);
  assert.deepEqual(homes.rec.homes, []);
  assert.equal(useHomeInput.getState().keptId, null, "the home last open (h2) is not put on the page");
  // Opened again (a new key): read anew, the home last open back on the empty page.
  space();
  await loadHomes();
  assert.equal(useHomes.getState().open, true);
  assert.deepEqual(useHomes.getState().rec.homes.map((h) => h.id), ["h1", "h2"]);
  assert.equal(useHomeInput.getState().keptId, "h2");
});

test("a home being opened when the space locks: false, so the switcher and ⌘K do not go to the Home page", async () => {
  afresh();
  const v = space();
  const held = gate();
  v.holdPut = held.at;
  const opening = openKeptHome("h1");
  await v.started.put.at;
  lock(v);
  held.open();
  assert.equal(await opening, false);
});
