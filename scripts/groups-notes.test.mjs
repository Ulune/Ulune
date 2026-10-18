/*
 * Groups of charts and notes on charts (share and compare plan, ideas B5 and
 * B6): what their records may hold (src/studio/groups/kept.ts), a group made,
 * renamed, moved, deleted, a chart put in and taken out, a forgotten chart
 * leaving every group, a backup's groups and notes joining another space's
 * on the charts as that space knows them (lib/space/runtime.ts, importBackup,
 * run here on an in-memory space), backups carrying them sealed, the readable
 * copy, the notes' search; their two word books held to the catalog's rules
 * and said by the code that loads them; and none of their code touching the
 * browser's plain storage.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { memoryStore } from "../src/lib/space/store.ts";
import { Vault, adoptBackup, openBackup } from "../src/lib/space/vault.ts";
import { GROUPS_RECORD, KEPT_CHANGED, NOTE_RECORD } from "../src/lib/space/records.ts";
import {
  GROUPS_MAX,
  GROUP_NAME_MAX,
  NOTE_MAX,
  addGroup,
  cleanGroups,
  cleanName,
  cleanNote,
  cleanText,
  dropGroup,
  forgetCharts,
  groupsOf,
  joinGroups,
  joinsNote,
  keepMembers,
  moveGroup,
  noteFinds,
  renameGroup,
  setMember,
} from "../src/studio/groups/kept.ts";
import { groupsWords } from "../src/lib/i18n/catalog/groups-words.ts";
import { groupsNeedWords } from "../src/lib/i18n/catalog/groups-need-words.ts";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const PASS = "correct horse battery staple";
const group = (id, name, members = [], at = 1) => ({ id, name, members, at });

test("a group's name and a note's text as they are kept", () => {
  assert.equal(cleanName("  Family \n\t friends  "), "Family friends");
  // Direction marks and control characters never stay; nothing that is not a string becomes a name.
  assert.equal(cleanName("\u202eylimaF\u202c\u0000"), "ylimaF");
  assert.equal(cleanName(42), "");
  assert.equal(cleanName("   "), "");
  assert.equal(cleanName("x".repeat(60)).length, GROUP_NAME_MAX);
  // Never half a character: an emoji across the limit goes whole.
  assert.equal(cleanName(`${"a".repeat(GROUP_NAME_MAX - 1)}😀`), "a".repeat(GROUP_NAME_MAX - 1));
  // A note: plain text, its lines kept, Windows' line ends made one, "<3" and tags kept as text.
  assert.equal(cleanText("read on 12 Oct\r\nasked about work <3 <b>x</b>\u0007"), "read on 12 Oct\nasked about work <3 <b>x</b>");
  assert.equal(cleanText("x".repeat(NOTE_MAX + 50)).length, NOTE_MAX);
  assert.deepEqual(cleanNote({ text: "  read on 12 Oct  ", at: 5 }), { text: "  read on 12 Oct  ", at: 5 });
  assert.equal(cleanNote({ text: " \n ", at: 5 }), null);
  assert.equal(cleanNote({ text: 7, at: 5 }), null);
  assert.equal(cleanNote(null), null);
  assert.deepEqual(cleanNote({ text: "a", at: -3 }), { text: "a", at: 0 });
  assert.deepEqual(cleanNote({ text: "a", at: Number.NaN }), { text: "a", at: 0 });
});

test("a groups record, from the space or a backup, keeps only what is well formed", () => {
  assert.deepEqual(cleanGroups(null), []);
  assert.deepEqual(cleanGroups({ groups: "Family" }), []);
  const many = Array.from({ length: GROUPS_MAX + 5 }, (_, i) => group(`g${i}`, `G${i}`));
  const read = cleanGroups({
    groups: [
      group("a", " Family ", ["c1", "c1", 3, "", "c2"], 10),
      null,
      { name: "No id" },
      group("a", "Same id"),
      group("b", "FAMILY"),
      group("c", "Élan"),
      group("d", "elan"),
      group("e", "   "),
      group("x".repeat(200), "Long id"),
      { id: "f", name: "Odd", members: "c1", at: "soon" },
      ...many,
    ],
  });
  assert.deepEqual(read[0], group("a", "Family", ["c1", "c2"], 10));
  // The same id once, the same name once (case and accents aside), and a name, always.
  assert.deepEqual(read.slice(1, 3).map((g) => g.name), ["Élan", "Odd"]);
  assert.deepEqual(read[2], group("f", "Odd", [], 0));
  assert.equal(read.length, GROUPS_MAX);
});

test("groups made, renamed, moved and deleted; a chart put in and taken out", () => {
  let groups = addGroup([], "Family", "a", 1);
  groups = addGroup(groups, "Clients", "b", 2, ["c1"]);
  assert.deepEqual(groups.map((g) => g.name), ["Family", "Clients"]);
  assert.deepEqual(groups[1].members, ["c1"]);
  assert.equal(addGroup(groups, "  ", "z", 3), "empty");
  assert.equal(addGroup(groups, "family", "z", 3), "taken");
  assert.equal(addGroup(addGroup([], "Élan", "e", 1), "ELAN", "z", 3), "taken");
  const full = Array.from({ length: GROUPS_MAX }, (_, i) => group(`g${i}`, `G${i}`));
  assert.equal(addGroup(full, "One more", "z", 3), "full");

  assert.equal(renameGroup(groups, "a", "clients", 4), "taken");
  assert.equal(renameGroup(groups, "a", " ", 4), "empty");
  assert.equal(renameGroup(groups, "a", "Family", 4), groups, "the same name changes nothing");
  const renamed = renameGroup(groups, "a", "Famille", 4);
  assert.deepEqual(renamed[0], group("a", "Famille", [], 4));
  assert.equal(renamed[1], groups[1], "the other group is the same object");
  // A group's own name in other letters is a rename, not "taken".
  assert.equal(renameGroup(groups, "a", "FAMILY", 5)[0].name, "FAMILY");

  assert.deepEqual(moveGroup(groups, "b", -1).map((g) => g.id), ["b", "a"]);
  assert.equal(moveGroup(groups, "a", -1), groups);
  assert.equal(moveGroup(groups, "b", 1), groups);
  assert.equal(moveGroup(groups, "nope", 1), groups);

  let next = setMember(groups, "a", "c2", true, 9);
  assert.deepEqual(next[0], group("a", "Family", ["c2"], 9));
  assert.equal(setMember(next, "a", "c2", true, 10), next, "already in: the same list");
  next = setMember(next, "a", "c2", false, 11);
  assert.deepEqual(next[0].members, []);
  assert.equal(setMember(next, "nope", "c2", true, 12), next);
  assert.deepEqual(groupsOf(groups, "c1").map((g) => g.id), ["b"]);

  // Deleting a group never touches a chart: only the group goes.
  assert.deepEqual(dropGroup(groups, "b").map((g) => g.id), ["a"]);
  assert.equal(dropGroup(groups, "nope"), groups);
});

test("a forgotten chart leaves every group; the groups stay, even empty", () => {
  const groups = [group("a", "Family", ["c1", "c2"]), group("b", "Clients", ["c2"]), group("c", "Friends", ["c3"])];
  const after = forgetCharts(groups, ["c2"]);
  assert.deepEqual(after.map((g) => g.members), [["c1"], [], ["c3"]]);
  assert.equal(after[2], groups[2], "a group without it is the same object");
  assert.equal(forgetCharts(groups, ["nope"]), groups);
  assert.equal(forgetCharts(groups, []), groups);
  // A chart forgotten before the groups were read: only the space's charts stay in them.
  assert.deepEqual(keepMembers(groups, new Set(["c1", "c3"])).map((g) => g.members), [["c1"], [], ["c3"]]);
  assert.equal(keepMembers(groups, new Set(["c1", "c2", "c3"])), groups);
});

test("a backup's groups join the space's: by id, then by name, on the charts as the space knows them, nothing taken out", () => {
  const ours = [group("a", "Family", ["x1"], 5), group("b", "Clients", ["x2"], 5)];
  // Their c1 is our x1 (the same birth), c2 joins as itself, c9 did not come.
  const map = new Map([
    ["c1", "x1"],
    ["c2", "c2"],
  ]);
  const mapId = (id) => map.get(id);
  const theirs = [
    group("t1", "family", ["c1", "c2", "c9"], 9),
    group("b", "Clients renamed", ["c2"], 8),
    group("t3", "Friends", ["c9"], 3),
  ];
  const joined = joinGroups(ours, theirs, mapId);
  assert.deepEqual(joined, [
    // Matched by name: our name and id stay, their charts join.
    group("a", "Family", ["x1", "c2"], 9),
    // The same group (its id), renamed later in the backup: the later name.
    group("b", "Clients renamed", ["x2", "c2"], 8),
    // A group of theirs we lack: added after ours, even with none of its charts here.
    group("t3", "Friends", [], 3),
  ]);
  assert.deepEqual(ours[0].members, ["x1"], "the space's own list is not changed in place");
  // Twice is once.
  assert.equal(joinGroups(joined, theirs, mapId), null);
  assert.equal(joinGroups(ours, [], mapId), null);
  // An older name of the same group does not come back; nor one another group already has.
  assert.equal(joinGroups([group("b", "Clients", ["x2"], 8)], [group("b", "Old name", ["x2"], 2)], mapId), null);
  const clash = joinGroups([group("a", "Family", [], 1), group("b", "Clients", [], 1)], [group("b", "family", [], 9)], mapId);
  assert.equal(clash, null);
  // 24 at most.
  const full = Array.from({ length: GROUPS_MAX }, (_, i) => group(`g${i}`, `G${i}`));
  assert.equal(joinGroups(full, [group("new", "New one")], mapId), null);
});

test("a backup's note joins where there is none, or an older, different one", () => {
  assert.equal(joinsNote(null, { text: "a", at: 1 }), true);
  assert.equal(joinsNote({ text: "a", at: 1 }, { text: "b", at: 2 }), true);
  assert.equal(joinsNote({ text: "a", at: 3 }, { text: "b", at: 2 }), false);
  assert.equal(joinsNote({ text: "a", at: 1 }, { text: "a", at: 2 }), false);
});

test("the switcher's search in notes: every word typed, case and accents aside", () => {
  const note = { text: "Lu le 12 oct. ; question sur le Travail, à Élancourt", at: 1 };
  assert.equal(noteFinds(note, "travail"), true);
  assert.equal(noteFinds(note, "  elancourt   12 "), true);
  assert.equal(noteFinds(note, "travail paris"), false);
  assert.equal(noteFinds(note, "   "), false);
  assert.equal(noteFinds(undefined, "travail"), false);
});

/** What a store holds, as text: the records' bytes and the description. */
function storeText(store) {
  const { meta, items } = store.dump();
  return JSON.stringify(meta) + [...items.entries()].map(([k, s]) => `${k}:${Buffer.from(s.ct).toString("latin1")}`).join("\n");
}

/** A chart as the space keeps it (lib/chart/library.ts, StoredRow), small. */
function chartRow(id, name, date, time = "12:00") {
  return {
    id,
    input: { name, date, time, latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris", houseSystem: "placidus" },
    chart: { meta: { name, houseSystem: "placidus" }, planets: [], angles: {}, houses: [], aspects: [], midpoints: [] },
    grok: null,
    timeUnknown: false,
    savedAt: 1,
  };
}

test("sealed: the groups' names and the notes are unreadable in the space and its backup without a way in", async () => {
  const store = memoryStore();
  const { vault } = await Vault.create(store, { passphrase: PASS });
  await vault.write([
    [GROUPS_RECORD, { groups: [group("a", "Zqfamily", ["c1"], 2)] }],
    [`${NOTE_RECORD}c1`, { text: "zqnote: asked about work", at: 3 }],
  ]);
  const text = storeText(store);
  assert.ok(!/Zqfamily|zqnote/.test(text), "a name or a note in the clear in the space");
  const backup = await vault.backup();
  assert.ok(!/Zqfamily|zqnote/.test(JSON.stringify(backup.items.map(([, s]) => s.ct))));
  assert.deepEqual(backup.items.map(([k]) => k).filter((k) => k === GROUPS_RECORD || k.startsWith(NOTE_RECORD)).sort(), [`${NOTE_RECORD}c1`, GROUPS_RECORD]);
  // Opened with the passphrase, both are there as written.
  const records = await openBackup(backup, { passphrase: PASS });
  assert.deepEqual(records.get(GROUPS_RECORD), { groups: [group("a", "Zqfamily", ["c1"], 2)] });
  assert.deepEqual(records.get(`${NOTE_RECORD}c1`), { text: "zqnote: asked about work", at: 3 });
});

test("backups carry groups and notes; added to another space, they join on its charts; the readable copy has them", async () => {
  // The page's window, for the space's code (the event said when groups and notes joined).
  globalThis.window ??= Object.assign(new EventTarget(), { setTimeout, clearTimeout });
  const heard = [];
  window.addEventListener(KEPT_CHANGED, () => heard.push(KEPT_CHANGED));
  const { setOpenVault } = await import("../src/lib/space/state.ts");
  const { importBackup, readableCopy } = await import("../src/lib/space/runtime.ts");

  // Space A: two charts, two groups, two notes; its backup.
  const a = await Vault.create(memoryStore(), { passphrase: PASS });
  await a.vault.write([
    ["chart/c1", chartRow("c1", "Camille", "1990-06-15")],
    ["chart/c2", chartRow("c2", "Sample B", "1987-11-03", "23:10")],
    ["state/library", { order: ["c1", "c2"], activeId: "c1" }],
    [GROUPS_RECORD, { groups: [group("ga", "Family", ["c1", "c2"], 20), group("gb", "Clients", ["c2"], 20)] }],
    [`${NOTE_RECORD}c1`, { text: "read on 12 Oct", at: 30 }],
    [`${NOTE_RECORD}c2`, { text: "asked about work", at: 30 }],
  ]);
  const backup = await a.vault.backup();

  // Restored in another browser: the same groups and notes.
  const restored = memoryStore();
  await adoptBackup(restored, backup);
  const opened = await Vault.unlock(restored, { passphrase: PASS });
  assert.deepEqual((await opened.get(GROUPS_RECORD)).groups.map((g) => g.name), ["Family", "Clients"]);
  assert.equal((await opened.get(`${NOTE_RECORD}c2`)).text, "asked about work");

  // Space B already holds Camille under another id (x1), a group "family" of its own and an older note.
  const b = await Vault.create(memoryStore(), { passphrase: "another space's passphrase" });
  await b.vault.write([
    ["chart/x1", chartRow("x1", "Camille", "1990-06-15")],
    ["state/library", { order: ["x1"], activeId: "x1" }],
    [GROUPS_RECORD, { groups: [group("gx", "family", ["x1"], 5)] }],
    [`${NOTE_RECORD}x1`, { text: "an older note", at: 10 }],
  ]);
  setOpenVault(b.vault);
  try {
    // Added with the backup's own passphrase: Sample B joins; Camille is the same birth, so x1.
    assert.equal(await importBackup(backup, { passphrase: PASS }), 1);
    assert.deepEqual((await b.vault.get(GROUPS_RECORD)).groups, [
      group("gx", "family", ["x1", "c2"], 20),
      group("gb", "Clients", ["c2"], 20),
    ]);
    assert.equal((await b.vault.get(`${NOTE_RECORD}x1`)).text, "read on 12 Oct", "the later note on the same person");
    assert.equal((await b.vault.get(`${NOTE_RECORD}c2`)).text, "asked about work");
    assert.equal(await b.vault.get(`${NOTE_RECORD}c1`), null, "no note on a chart id this space does not have");
    assert.deepEqual(heard, [KEPT_CHANGED]);
    // Added again: nothing new.
    assert.equal(await importBackup(backup, { passphrase: PASS }), 0);
    assert.deepEqual(heard, [KEPT_CHANGED]);
    // The readable copy (Your data): the groups by their charts' ids, the notes on them.
    const copy = await readableCopy();
    assert.deepEqual(copy.groups, [
      { name: "family", charts: ["x1", "c2"] },
      { name: "Clients", charts: ["c2"] },
    ]);
    assert.deepEqual(copy.notes.map((n) => [n.chart, n.text]).sort(), [
      ["c2", "asked about work"],
      ["x1", "read on 12 Oct"],
    ]);
  } finally {
    setOpenVault(null);
  }
});

test("the two books: both languages, Ulune's typography, said by the code that loads them, none in the catalog", () => {
  const read = (p) => readFileSync(join(ROOT, p), "utf8");
  for (const [book, words, files] of [
    ["groups-words", groupsWords, ["src/studio/groups/picker-groups.tsx", "src/studio/groups/note-field.tsx"]],
    [
      "groups-need-words",
      groupsNeedWords,
      ["src/studio/groups/need-line.tsx", "src/studio/groups/chart-kept.tsx", "src/studio/show/picker-extras.tsx", "src/studio/groups/picker-groups.tsx", "src/studio/groups/note-field.tsx"],
    ],
  ]) {
    for (const [key, [en, fr]] of Object.entries(words)) {
      assert.ok(en.trim() && fr.trim(), `${book}.${key}: a language missing`);
      for (const t of [en, fr]) assert.ok(!/\w'\w/.test(t), `${book}.${key}: a straight apostrophe in "${t}"`);
      assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(fr), `${book}.${key}: French punctuation without its narrow space: "${fr}"`);
      assert.ok(!/« |«[^\u202f]| »|[^\u202f]»/.test(fr), `${book}.${key}: « » without narrow spaces in "${fr}"`);
      assert.ok(!(key in CATALOG), `${key} in both the catalog and ${book}`);
      // Variables the same in both languages.
      assert.deepEqual(en.match(/\{\w+\}/g)?.sort() ?? [], fr.match(/\{\w+\}/g)?.sort() ?? [], `${book}.${key}: variables differ`);
    }
    const code = files.map(read).join("\n");
    const unsaid = Object.keys(words).filter((key) => !new RegExp(`["'\`]${key}["'\`]`).test(code));
    assert.deepEqual(unsaid, [], `${book}: words no code says`);
  }
  // No key in both books.
  for (const key of Object.keys(groupsWords)) assert.ok(!(key in groupsNeedWords), `${key} in both books`);
});

test("the groups' and notes' code never touches the browser's plain storage", () => {
  const dir = join(ROOT, "src/studio/groups");
  for (const f of readdirSync(dir)) {
    const src = readFileSync(join(dir, f), "utf8");
    assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(src), `${f} touches plain storage`);
  }
});
