/**
 * The rooms and the home record (languages plan, part 26): how a room sits
 * with its palace's stars, what the palace's reading and the table say of
 * it, the figure's label, the record as read back from the private space or
 * a backup (only well-formed homes and rooms), how a backup's homes join,
 * and the texts' typography and tone. Made-up homes only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { homeOf, periodOf } from "../src/lib/chinese/fengshui-home.ts";
import { homeReading, homeStars } from "../src/lib/chinese/fengshui-home-reading.ts";
import { fssPalaceRef } from "../src/lib/chinese/fengshui-stars-reading.ts";
import { ROOMS_MAX, ROOM_KINDS, cleanRooms, roomFit, roomUse } from "../src/lib/chinese/fengshui-rooms.ts";
import { ROOM_FIT_TEXTS, ROOM_NAMES, ROOMS_HERE } from "../src/lib/chinese/fengshui-rooms-texts.ts";
import { listWords, roomLines, roomsLabel } from "../src/lib/chinese/fengshui-rooms-reading.ts";
import { HOMES_MAX, cleanHome, cleanHomes, cleanName, dropHome, joinHomes, putHome } from "../src/lib/chinese/fengshui-home-record.ts";
import { homeTableCsv, homeTextParts } from "../src/lib/chinese/fengshui-home-table.ts";
import { PRIVACY_NOTICE } from "../src/lib/legal/privacy-notice.ts";

const full = { script: "hant", show: "full" };
// Period 7, sitting Zi facing Wu (facing 180°, built 1998), read in Period 9.
const home = homeOf(180, "compass", null);
const period = { year: 1998, ...periodOf(1998) };
const rooms = [
  { id: "r1", kind: "kitchen", palace: "ne" },
  { id: "r2", kind: "bathroom", palace: "ne" },
  { id: "r3", kind: "bedroom", palace: "n" },
  { id: "r4", kind: "entrance", palace: "s" },
  { id: "r5", kind: "living", palace: "s" },
  { id: "r6", kind: "dining", palace: "s" },
  { id: "r7", kind: "bedroom", palace: "e" },
  { id: "r8", kind: "office", palace: "e" },
];
const stars = homeStars(home, period, 2026, null, rooms);
const ctx = { home, period, people: [], place: "Paris", declination: null, stars, years: null, rooms };

test("the kinds of room and how each is read", () => {
  assert.deepEqual(ROOM_KINDS.map((k) => k.id), ["entrance", "living", "dining", "kitchen", "office", "bedroom", "children", "bathroom", "storage"]);
  assert.deepEqual(["bedroom", "children"].map(roomUse), ["quiet", "quiet"]);
  assert.deepEqual(["entrance", "living", "dining", "kitchen", "office"].map(roomUse), Array(5).fill("active"));
  assert.deepEqual(["bathroom", "storage"].map(roomUse), ["passage", "passage"]);
});

test("a room against its palace's stars, in Period 9", () => {
  const c = stars.main;
  assert.deepEqual([c.palaces.ne.mountain, c.palaces.ne.water], [9, 5]);
  // The north-east: the mountain star 9 is timely, the water star 5 dormant.
  assert.deepEqual(roomFit("bedroom", c, "ne", 9), { use: "quiet", reads: "mountain", n: 9, other: null, fit: "suits" });
  assert.deepEqual(roomFit("kitchen", c, "ne", 9), { use: "active", reads: "water", n: 5, other: 9, fit: "elsewhere" });
  assert.deepEqual(roomFit("bathroom", c, "ne", 9), { use: "passage", reads: "mountain", n: 9, other: null, fit: "spends" });
  // The east: 5 and 9, the other way round.
  assert.equal(roomFit("office", c, "e", 9).fit, "suits");
  assert.deepEqual(roomFit("bedroom", c, "e", 9), { use: "quiet", reads: "mountain", n: 5, other: 9, fit: "elsewhere" });
  // The north (7 and 7) and the south (8 and 6): neither timely.
  assert.equal(roomFit("bedroom", c, "n", 9).fit, "neither");
  assert.equal(roomFit("entrance", c, "s", 9).fit, "neither");
  assert.equal(roomFit("storage", c, "s", 9).fit, "free");
  // Every use and fit has its text.
  for (const k of ROOM_KINDS) for (const p of ["c", "n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
    const f = roomFit(k.id, c, p, 9);
    assert.ok(ROOM_FIT_TEXTS[`${f.use}-${f.fit}`], `${k.id} ${p}`);
  }
});

test("what a palace's reading says of its rooms, in both languages", () => {
  const ne = roomLines(stars.main, "ne", rooms, 9, "en");
  assert.equal(ne[0], "In this palace: your kitchen and your bathroom.");
  assert.equal(ne.length, 3);
  assert.match(ne[1], /^For your kitchen, a room of activity, the schools read the water star: here the 5 Yellow, dormant\. This palace’s timely star is its mountain star, the 9 Purple/);
  assert.match(ne[2], /^For your bathroom, a room of passage, .* here the 9 Purple,/);
  const fr = roomLines(stars.main, "ne", rooms, 9, "fr");
  assert.equal(fr[0], "Dans ce palais\u202f: votre cuisine et votre salle d’eau.");
  assert.match(fr[1], /^Pour votre cuisine, une pièce d’activité, les écoles lisent l’étoile de l’eau\u202f: ici le 5 Jaune, en sommeil\./);
  for (const l of [...ne, ...fr, ...roomLines(stars.main, "n", rooms, 9, "en"), ...roomLines(stars.main, "s", rooms, 9, "fr")]) assert.doesNotMatch(l, /\{\w+\}/);
  assert.match(roomLines(stars.main, "n", rooms, 9, "en")[1], /in its season in Period 9/);
  assert.deepEqual(roomLines(stars.main, "w", rooms, 9, "en"), []);
  // Two bedrooms in one palace: named twice, read once.
  const two = roomLines(stars.main, "n", [...rooms, { id: "r9", kind: "bedroom", palace: "n" }], 9, "en");
  assert.equal(two[0], "In this palace: your 2 bedrooms.");
  assert.equal(two.length, 2);
  // The palace's reading: its rooms first.
  const r = homeReading(ctx, fssPalaceRef("main", "ne"), "en", full);
  assert.equal(r.sections[0].id, "rooms");
  assert.equal(r.sections[0].title, "Your rooms here");
  assert.ok(r.paragraphs.includes(ne[0]));
  assert.equal(homeReading({ ...ctx, stars: homeStars(home, period, 2026, null, []) }, fssPalaceRef("main", "ne"), "en", full).sections[0].id, "stars");
});

test("the figure's label and the lists", () => {
  assert.equal(roomsLabel(rooms, "ne", "en"), "Kitchen · Bath");
  assert.equal(roomsLabel(rooms, "s", "en"), "Entry +2");
  assert.equal(roomsLabel([...rooms, { id: "x", kind: "bedroom", palace: "n" }], "n", "fr"), "Chambre ×2");
  assert.equal(roomsLabel(rooms, "w", "en"), "");
  assert.equal(listWords(["a", "b", "c"], "en"), "a, b and c");
  assert.equal(listWords(["a", "b", "c"], "fr"), "a, b et c");
});

test("the table's text and file", () => {
  const part = homeTextParts(ctx, "Camille", "en", full).find((p) => p.id === "rooms");
  assert.ok(part);
  assert.equal(part.lines[0], "Your rooms");
  assert.ok(part.lines.includes("North-East palace: Kitchen and Bathroom or toilet"), part.lines.join(" / "));
  assert.ok(part.lines.some((l) => l.startsWith("  For your kitchen")));
  const csv = homeTableCsv(ctx).split("\n");
  assert.ok(csv.includes("room,id,kind,palace,fit"));
  assert.ok(csv.includes("room,r1,kitchen,ne,active:elsewhere:water:5"));
  assert.ok(csv.includes("room,r3,bedroom,n,quiet:neither:mountain:7"));
  // Without rooms, no part and no rows.
  const bare = { ...ctx, rooms: [] };
  assert.equal(homeTextParts(bare, "", "en", full).find((p) => p.id === "rooms"), undefined);
  assert.ok(!homeTableCsv(bare).includes("room,"));
  // Rooms without a year: placed, not read.
  const noYear = { ...ctx, period: null, stars: null };
  assert.ok(homeTableCsv(noYear).includes("room,r1,kitchen,ne,"));
});

test("the home record as read back: only well-formed homes and rooms", () => {
  assert.deepEqual(
    cleanRooms([{ id: "a", kind: "kitchen", palace: "ne" }, { id: "a", kind: "bedroom", palace: "n" }, { id: "b", kind: "sauna", palace: "n" }, { id: "c", kind: "bedroom", palace: "up" }, null, "x", { id: "d e", kind: "bedroom", palace: "n" }]),
    [{ id: "a", kind: "kitchen", palace: "ne" }],
  );
  assert.equal(cleanRooms(Array.from({ length: 60 }, (_, i) => ({ id: `r${i}`, kind: "bedroom", palace: "n" }))).length, ROOMS_MAX);
  assert.deepEqual(cleanRooms("rooms"), []);
  assert.equal(cleanName("  The   cabin\n by the lake ", "Home"), "The cabin by the lake");
  assert.equal(cleanName("", "Home"), "Home");
  assert.equal(cleanName("x".repeat(80), "Home").length, 60);
  const h = cleanHome({ id: "h1", name: "Cabin", typed: "172.5", source: "map", year: "1998", rooms: [{ id: "a", kind: "kitchen", palace: "ne" }], savedAt: 5, extra: "dropped" });
  assert.deepEqual(h, { id: "h1", name: "Cabin", typed: "172.5", source: "map", year: "1998", rooms: [{ id: "a", kind: "kitchen", palace: "ne" }], savedAt: 5 });
  assert.equal(cleanHome({ id: "../x", name: "A" }), null);
  assert.equal(cleanHome({ id: "h2", source: "satellite" }).source, "compass");
  const rec = cleanHomes({ homes: [h, h, { id: "h2" }, "junk"], activeId: "h9" });
  assert.deepEqual(rec.homes.map((x) => x.id), ["h1", "h2"]);
  assert.equal(rec.activeId, null, "an active home that isn't there");
  assert.deepEqual(cleanHomes(null), { homes: [], activeId: null });
  assert.equal(cleanHomes({ homes: Array.from({ length: 20 }, (_, i) => ({ id: `h${i}` })) }).homes.length, HOMES_MAX);
});

test("homes kept, forgotten, and joined from a backup", () => {
  const a = { id: "a", name: "A", typed: "90", source: "compass", year: "", rooms: [], savedAt: 1 };
  const b = { id: "b", name: "B", typed: "", source: "compass", year: "2001", rooms: [], savedAt: 2 };
  let rec = putHome({ homes: [], activeId: null }, a);
  rec = putHome(rec, b);
  assert.deepEqual(rec.homes.map((x) => x.id), ["a", "b"]);
  assert.equal(rec.activeId, "b");
  rec = putHome(rec, { ...a, name: "A2", savedAt: 3 });
  assert.deepEqual(rec.homes.map((x) => x.name), ["A2", "B"]);
  assert.equal(rec.activeId, "a");
  assert.deepEqual(dropHome(rec, "a"), { homes: [rec.homes[1]], activeId: null });
  // A backup: a home not here joins; an older copy of one here doesn't; a newer one does. The choice of home stays.
  const theirs = { homes: [{ ...b, name: "B old", savedAt: 1 }, { ...a, name: "A3", savedAt: 9 }, { id: "c", name: "C", typed: "", source: "compass", year: "", rooms: [], savedAt: 4 }], activeId: "c" };
  const joined = joinHomes(rec, theirs);
  assert.deepEqual(joined.homes.map((x) => x.name), ["A3", "B", "C"]);
  assert.equal(joined.activeId, "a");
  assert.equal(joinHomes(joined, theirs), null, "nothing new the second time");
});

test("the texts in both languages, in Ulune's typography and tone", () => {
  const all = [...Object.values(ROOM_FIT_TEXTS), ROOMS_HERE, ...Object.values(ROOM_NAMES).flatMap((n) => [n.name, n.short, n.yours, n.yoursMany])];
  assert.equal(Object.keys(ROOM_FIT_TEXTS).length, 8);
  for (const [en, fr] of all) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick\w*|health\w*|doomed|unlucky|lucky|curse[ds]?|must|fate|disaster|divorce|accident|bankrupt\w*|buy|cure|remedy|amulet|charm)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|santé|malchance|maudit|condamn\w*|doit|devez|destin|désastre|divorce|accident|faillite|acheter|remède|amulette)\b/i, fr.slice(0, 40));
  }
  for (const [en, fr] of Object.values(ROOM_FIT_TEXTS)) for (const t of [en, fr]) assert.match(t, /\{room\}/);
  for (const k of ["quiet-elsewhere", "active-elsewhere"]) for (const t of ROOM_FIT_TEXTS[k]) assert.match(t, /never a rule|jamais une règle/);
});

test("the privacy notice says how the compass is read and where the home is kept", () => {
  for (const locale of ["en", "fr"]) {
    const text = JSON.stringify(PRIVACY_NOTICE[locale].blocks);
    assert.match(text, locale === "en" ? /Use the compass/ : /Utiliser la boussole/);
    assert.match(text, locale === "en" ? /the homes you keep for Feng Shui/ : /les logements que vous gardez pour le Feng Shui/);
    assert.match(text, locale === "en" ? /its facing, the year it was built, its rooms/ : /son orientation, son année de construction, ses pièces/);
  }
});
