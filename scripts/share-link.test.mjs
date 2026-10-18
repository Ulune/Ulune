/*
 * The share link (share plan, feature 1; src/lib/share): its format both
 * ways, and hostile links. A link is untrusted input: garbage, cut-off,
 * oversized, altered or newer links, out-of-range values and script or
 * direction marks in names are refused or cleaned, never thrown at the page
 * as anything but ShareLinkError; whatever reads back passes the server's own
 * input rules (lib/chart/server-input.ts) and the birth form's date rules.
 * Also: the zone table matches the tz database, what the sheet puts in a
 * link (the name and place switches, the partner on a Relationship page),
 * the words' book, and /s as one of the pages the privacy rule allows.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ShareLinkError, fromB64u, toB64u, utf8 } from "../src/lib/share/bytes.ts";
import { HOUSE_CODES, NAME_MAX, PAGE_CODES, cleanText, packShare, unpackShare } from "../src/lib/share/format.ts";
import { MAX_FRAGMENT, makeShareLink, readShareFragment } from "../src/lib/share/link.ts";
import { ZONE_TABLE, isKnownZone } from "../src/lib/share/zones.ts";
import { hasOwnName, isPairPage, partnerRow, previewLine, sharedBirthOf } from "../src/lib/share/compose.ts";
import { birthInputOf } from "../src/lib/share/arrive.ts";
import { birthKey } from "../src/lib/chart/library.ts";
import { normalizeBirth } from "../src/lib/chart/parse-birth.ts";
import { birthSchema } from "../src/lib/chart/server-input.ts";
import { STUDIO_PAGES } from "../src/studio/url.ts";
import { shareWords } from "../src/lib/i18n/catalog/share-words.ts";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";
import { zoneTable } from "./share-zones.mjs";

const ROOT = new URL("..", import.meta.url).pathname;

/** Fixture A (the e2e suites' made-up chart) as a link carries it. */
const A = {
  date: "1990-06-15",
  time: "12:00",
  timeUnknown: false,
  latitude: 48.85341,
  longitude: 2.3488,
  houseSystem: "placidus",
  zone: "Europe/Paris",
  name: "Camille",
  placeLabel: "Paris, Île-de-France, France",
};
/** Fixture B. */
const B = { ...A, date: "1987-11-03", time: "23:10", latitude: 59.91273, longitude: 10.74609, zone: "Europe/Oslo", name: "Sample B", placeLabel: "Oslo, Norway" };

const fragmentOf = (link) => link.slice(link.indexOf("#"));

/** A plaintext sealed as a link's would be (same key size, nonce and associated data): for crafted payloads. */
async function sealRaw(plain) {
  const raw = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(12), additionalData: utf8("ulune/share/v1") }, key, plain));
  return `#1.${toB64u(raw)}.${toB64u(ct)}`;
}

/** The reason a fragment is refused ("" when it reads). */
async function refusal(fragment) {
  try {
    await readShareFragment(fragment);
    return "";
  } catch (err) {
    assert.ok(err instanceof ShareLinkError, `not a ShareLinkError: ${err}`);
    return err.reason;
  }
}

/** The five bytes of a moment, laid out as format.ts packs them (year 12 bits, month 4, day 5, second 17, two spare). */
function moment(year, month, day, second, spare = 0) {
  const hi = (year << 9) | (month << 5) | day;
  return [hi >>> 13, (hi >>> 5) & 0xff, ((hi & 0x1f) << 3) | (second >>> 14), (second >>> 6) & 0xff, ((second & 0x3f) << 2) | spare];
}

/** A one-chart plaintext with no texts, from its fields: the head, the flags, the moment, the coordinates. */
function bare({ head = 0, flags = 0, when = moment(1990, 6, 15, 43200), lat = 48853410, lon = 2348800, tail = [] } = {}) {
  const i32 = (v) => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
  return Uint8Array.from([head, flags >>> 8, flags & 0xff, ...when, ...i32(lat), ...i32(lon), ...tail]);
}

/** A text as the format writes it: its UTF-8 length, then its bytes. */
const text = (s) => {
  const b = utf8(s);
  return [b.length, ...b];
};

/** What the server's own input rule says of a birth read back (castChart's validator). */
function serverTakes(birth) {
  const out = birthSchema.safeParse({
    date: birth.date,
    time: birth.time,
    latitude: birth.latitude,
    longitude: birth.longitude,
    houseSystem: birth.houseSystem,
    timeUnknown: birth.timeUnknown,
    zone: birth.zone,
    tz: birth.tz,
    fold: birth.fold,
  });
  assert.ok(out.success, `the server refuses ${JSON.stringify(birth)}`);
  // And the date and time read as the cast reads them.
  normalizeBirth({ date: birth.date, time: birth.time, placeLabel: "", latitude: birth.latitude, longitude: birth.longitude, timeUnknown: birth.timeUnknown });
}

test("a link reads back what was put in it, one chart or two", async () => {
  const one = { page: "bazi", charts: [A] };
  const back = await readShareFragment(fragmentOf(await makeShareLink("https://ulune.app", one)));
  assert.deepEqual(back, one);
  const two = { page: "synastry", charts: [A, B] };
  assert.deepEqual(await readShareFragment(fragmentOf(await makeShareLink("https://ulune.app/", two))), two);
  for (const birth of [...back.charts]) serverTakes(birth);
});

test("every field survives: unknown time, seconds, both folds, the count, chosen zones and offsets, numerology's names, the ends of the ephemeris", async () => {
  const births = [
    { ...A, time: "", timeUnknown: true },
    { ...A, time: "14:30:45", fold: 0, chineseCount: "yang" },
    { ...A, fold: 1, chineseCount: "yin", tz: "lmt" },
    { ...A, tz: "+05:30", houseSystem: "whole" },
    { ...A, tz: "-04:56:02", houseSystem: "topocentric" },
    { ...A, tz: "Asia/Kolkata", houseSystem: "koch" },
    { ...A, date: "0001-01-01", time: "00:00", latitude: -90, longitude: -180 },
    { ...A, date: "2399-12-31", time: "23:59:59", latitude: 90, longitude: 180 },
    // Julian before 15 October 1582, as the birth form reads it.
    { ...A, date: "1582-10-10", time: "06:00" },
    { ...A, date: "1600-02-29" },
    { ...A, birthName: "Quintessa Marie Aurelia", currentName: "Quintessa Vale", numerologyY: "vcv" },
    { ...A, name: "Ζωή Παπαδοπούλου 李雷 עדי", placeLabel: "Αθήνα, Ελλάδα" },
  ];
  for (const birth of births) {
    const payload = { page: "natal", charts: [birth] };
    const back = await readShareFragment(fragmentOf(await makeShareLink("https://ulune.app", payload)));
    assert.deepEqual(back, payload, JSON.stringify(birth));
    serverTakes(back.charts[0]);
  }
  // Every house system, every page.
  for (const houseSystem of HOUSE_CODES) {
    assert.equal(unpackShare(packShare({ page: "natal", charts: [{ ...A, houseSystem }] })).charts[0].houseSystem, houseSystem);
  }
  for (const page of STUDIO_PAGES) assert.equal(unpackShare(packShare({ page, charts: [A] })).page, page);
});

test("coordinates go to a millionth of a degree, so a birth reads as the same birth (library.ts, birthKey)", async () => {
  const fine = { ...A, latitude: 48.856613871, longitude: -2.352221999 };
  const back = unpackShare(packShare({ page: "natal", charts: [fine] })).charts[0];
  assert.ok(Math.abs(back.latitude - fine.latitude) <= 5e-7 && Math.abs(back.longitude - fine.longitude) <= 5e-7);
  // Five decimals (the place search's) come back exactly.
  const geocoded = unpackShare(packShare({ page: "natal", charts: [A] })).charts[0];
  assert.equal(geocoded.latitude, A.latitude);
  assert.equal(geocoded.longitude, A.longitude);
  // The input cast from a link keys as the chart the cast keeps (date, time, place, houses, the clock's reading).
  const input = birthInputOf(geocoded);
  const kept = { ...input, name: "Camille", time: "12:00", houseSystem: "placidus" };
  assert.equal(birthKey(input), birthKey(kept));
  assert.equal(birthKey(birthInputOf({ ...A, time: "", timeUnknown: true })), `1990-06-15||48.8534|2.3488|placidus|u`);
});

test("the link: compact, its own key each time, nothing readable in it", async () => {
  const link = await makeShareLink("https://ulune.app", { page: "natal", charts: [A] });
  assert.match(link, /^https:\/\/ulune\.app\/s#1\.[\w-]{22}\.[\w-]+$/);
  assert.ok(link.length >= 100 && link.length <= 160, `${link.length} characters`);
  const short = await makeShareLink("https://ulune.app", { page: "natal", charts: [{ ...A, placeLabel: "Paris" }] });
  assert.ok(short.length < link.length);
  for (const word of ["1990", "0615", "Paris", "Camille", "camille", "48.85", "Europe", "12:00", "TraceQA"]) {
    assert.ok(!link.toLowerCase().includes(word.toLowerCase()), `"${word}" in ${link}`);
  }
  const again = await makeShareLink("https://ulune.app", { page: "natal", charts: [A] });
  assert.notEqual(again, link, "a new key, so a new link");
  assert.deepEqual(await readShareFragment(fragmentOf(again)), await readShareFragment(fragmentOf(link)));
});

test("hostile links are refused, each for its reason", async () => {
  const good = fragmentOf(await makeShareLink("https://ulune.app", { page: "natal", charts: [A] }));
  const [, key, sealed] = good.slice(1).split(".");
  const cases = [
    ["", "empty"],
    ["#", "empty"],
    ["#hello", "shape"],
    ["#1.abc", "shape"],
    ["#1.a.b.c", "shape"],
    [`#${"x".repeat(MAX_FRAGMENT + 1)}`, "long"],
    // Version 2 is the typed link (a request, idea B4: scripts/share-request.test.mjs): a share's seal does not hold under it.
    [`#2.${key}.${sealed}`, "sealed"],
    [`#3.${key}.${sealed}`, "newer"],
    [`#999.${key}.${sealed}`, "newer"],
    [`#0.${key}.${sealed}`, "version"],
    [`#01.${key}.${sealed}`, "version"],
    [`#v1.${key}.${sealed}`, "version"],
    [`#1.${key.slice(0, 20)}.${sealed}`, "key"],
    [`#1.${key}A.${sealed}`, "key"],
    [`#1.${key.slice(0, 21)}*.${sealed}`, "key"],
    [`#1.${key}.${sealed.slice(0, 20)}`, "size"],
    [`#1.${key}.`, "size"],
    [`#1.${key}.${"A".repeat(4000)}`, "size"],
    [`#1.${key}.${sealed}!`, "size"],
    // Cut short by a few characters (a copy that missed the end): no longer base64 of the bytes, or no longer sealed.
    [`#1.${key}.${sealed.slice(0, -4)}`, "size|sealed"],
    [`#1.${key}.${sealed.slice(0, -1)}`, "size|sealed"],
    [`#1.${key}.${sealed.slice(0, -8)}`, "size|sealed"],
    // Altered.
    [`#1.${key}.${sealed.slice(0, 30)}${sealed[30] === "A" ? "B" : "A"}${sealed.slice(31)}`, "sealed"],
    [`#1.${toB64u(new Uint8Array(16))}.${sealed}`, "sealed"],
  ];
  for (const [fragment, reason] of cases) {
    const got = await refusal(fragment);
    assert.ok(reason.split("|").includes(got), `${fragment.slice(0, 60)}: "${got}", not ${reason}`);
  }
});

test("out-of-range values inside a well-sealed link are refused", async () => {
  const cases = [
    [bare({ when: moment(0, 6, 15, 0) }), "date"],
    [bare({ when: moment(2400, 1, 1, 0) }), "date"],
    [bare({ when: moment(1990, 13, 1, 0) }), "date"],
    [bare({ when: moment(1990, 0, 1, 0) }), "date"],
    [bare({ when: moment(1990, 2, 30, 0) }), "date"],
    [bare({ when: moment(1990, 6, 0, 0) }), "date"],
    [bare({ when: moment(1900, 2, 29, 0) }), "date"],
    [bare({ when: moment(1990, 6, 15, 86400) }), "time"],
    [bare({ when: moment(1990, 6, 15, 131071) }), "time"],
    [bare({ flags: 1, when: moment(1990, 6, 15, 60) }), "time"],
    [bare({ when: moment(1990, 6, 15, 0, 1) }), "reserved"],
    [bare({ head: 0x80 }), "reserved"],
    [bare({ lat: 90_000_001 }), "coordinates"],
    [bare({ lat: -90_000_001 }), "coordinates"],
    [bare({ lon: 180_000_001 }), "coordinates"],
    [bare({ lon: -2_147_483_648 }), "coordinates"],
    [bare({ flags: 10 << 12 }), "houses"],
    [bare({ flags: 15 << 12 }), "houses"],
    [bare({ flags: 3 << 1 }), "flags"],
    [bare({ flags: 3 << 3 }), "flags"],
    [bare({ tail: [0] }), "trailing"],
    [bare().slice(0, 15), "size"],
    [bare({ head: 0x40 }), "short"],
    [bare({ flags: 1 << 6, tail: text("Mars/Olympus_Mons") }), "tz"],
    [bare({ flags: 1 << 6, tail: text("+16:00") }), "tz"],
    [bare({ flags: 1 << 6, tail: text("+05:30:00") }), "tz"],
    [bare({ flags: 1 << 6, tail: text("LMT") }), "tz"],
    [bare({ flags: 1 << 6, tail: text("auto") }), "tz"],
    [bare({ flags: 1 << 6, tail: text("europe/paris") }), "tz"],
    [bare({ flags: 1 << 6, tail: text("x".repeat(41)) }), "tz"],
    [bare({ flags: 1 << 7, tail: [3, 0xff, 0xfe, 0xfd] }), "utf8"],
    [bare({ flags: 1 << 7, tail: [5, 0x41] }), "short"],
    [bare({ flags: (1 << 7) | (1 << 11), tail: [...text("Camille"), ...text("vx")] }), "roles"],
  ];
  for (const [plain, reason] of cases) assert.equal(await refusal(await sealRaw(plain)), reason, `${reason}: ${Buffer.from(plain).toString("hex")}`);
  // A place's zone this version does not know is only a hint: left out, the link still reads.
  const hint = await readShareFragment(await sealRaw(bare({ flags: 1 << 5, tail: text("Mars/Olympus_Mons") })));
  assert.equal(hint.charts[0].zone, undefined);
  // An unknown page opens the birth chart.
  assert.equal((await readShareFragment(await sealRaw(bare({ head: 63 })))).page, "natal");
  // Y's without a birth name to go with are left out.
  assert.equal((await readShareFragment(await sealRaw(bare({ flags: 1 << 11, tail: text("vc") })))).charts[0].numerologyY, undefined);
  // A link adds one chart or two, never more.
  assert.throws(() => packShare({ page: "natal", charts: [A, B, A] }), (e) => e instanceof ShareLinkError && e.reason === "count");
  assert.throws(() => packShare({ page: "natal", charts: [] }), (e) => e instanceof ShareLinkError && e.reason === "count");
  const three = [...packShare({ page: "synastry", charts: [A, B] }), ...packShare({ page: "natal", charts: [A] }).slice(1)];
  assert.equal(await refusal(await sealRaw(Uint8Array.from(three))), "trailing");
});

test("names are cleaned: no script, no control or direction marks, one space between words, a length cap", async () => {
  const rlo = String.fromCharCode(0x202e);
  const lri = String.fromCharCode(0x2066);
  const zwsp = String.fromCharCode(0x200b);
  const nul = String.fromCharCode(0);
  const bell = String.fromCharCode(7);
  const zwj = String.fromCharCode(0x200d);
  const read = async (name, placeLabel = "Paris") =>
    (await readShareFragment(await sealRaw(bare({ flags: (1 << 7) | (1 << 8), tail: [...text(name), ...text(placeLabel)] })))).charts[0];
  assert.equal((await read('<script>alert("x")</script>')).name, 'scriptalert("x")/script');
  assert.equal((await read('<img src=x onerror="alert(1)">')).name, 'img src=x onerror="alert(1)"');
  assert.equal((await read(`${rlo}evil${lri}gpj.exe`)).name, "evilgpj.exe");
  assert.equal((await read(`Ca${nul}mi${bell}lle${zwsp}`)).name, "Camille");
  assert.equal((await read("  Anne \t\n  Marie  ")).name, "Anne Marie");
  // The joiners some scripts and emoji need stay.
  assert.equal((await read(`مهر${zwj}ناز`)).name, `مهر${zwj}ناز`);
  // Nothing left: no name at all.
  assert.equal((await read(`${rlo}${zwsp} `)).name, undefined);
  const long = await read("é".repeat(120));
  assert.equal(Array.from(long.name).length, NAME_MAX);
  assert.equal(cleanText("x".repeat(500), 1000).length, 255, "a text keeps within 255 bytes");
  assert.equal(cleanText("🌙".repeat(100), 100), "🌙".repeat(63), "never half a character");
  // The sheet's side cleans the same way before anything is packed.
  const packed = unpackShare(packShare({ page: "natal", charts: [{ ...A, name: `${rlo}Camille<b>`, placeLabel: `Paris${bell}` }] })).charts[0];
  assert.equal(packed.name, "Camilleb");
  assert.equal(packed.placeLabel, "Paris");
});

test("fuzz: random and mutated payloads either read as valid births or are refused, never anything else", async () => {
  const valid = packShare({ page: "synastry", charts: [{ ...A, birthName: "Quintessa Marie", numerologyY: "vc", tz: "lmt", fold: 1 }, B] });
  let read = 0;
  for (let i = 0; i < 1500; i++) {
    let plain;
    if (i % 2) {
      plain = new Uint8Array(valid);
      for (let k = 1 + (i % 3); k > 0; k--) plain[Math.floor(Math.random() * plain.length)] ^= 1 << Math.floor(Math.random() * 8);
    } else {
      plain = crypto.getRandomValues(new Uint8Array(16 + Math.floor(Math.random() * 120)));
      plain[0] &= 0x7f;
    }
    try {
      const payload = await readShareFragment(await sealRaw(plain));
      read++;
      assert.ok(payload.charts.length === 1 || payload.charts.length === 2);
      for (const birth of payload.charts) serverTakes(birth);
    } catch (err) {
      assert.ok(err instanceof ShareLinkError, `${err} for ${Buffer.from(plain).toString("hex")}`);
    }
  }
  assert.ok(read > 0, "some mutated links still read (a changed letter in a name)");
});

test("the zone table is the tz database's own: every zone and link", () => {
  const db = JSON.parse(readFileSync(join(ROOT, "src/lib/chart/tzdb-data.json"), "utf8"));
  assert.equal(ZONE_TABLE, zoneTable(db).table, "src/lib/share/zones.ts is out of date: node scripts/share-zones.mjs");
  for (const name of [...Object.keys(db.zones), ...Object.keys(db.links)]) assert.ok(isKnownZone(name), name);
  for (const name of ["Europe/Atlantis", "europe/paris", "Europe/Paris ", "", "Europe", "UTC+1"]) assert.ok(!isKnownZone(name), name);
});

test("page codes: every page has its own, under 64", () => {
  const codes = STUDIO_PAGES.map((page) => PAGE_CODES[page]);
  assert.ok(codes.every((c) => Number.isInteger(c) && c >= 0 && c < 64), `a page without a code: ${STUDIO_PAGES.filter((p) => PAGE_CODES[p] === undefined)}`);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(PAGE_CODES.natal, 0);
});

test("base64url both ways, strictly", () => {
  for (let n = 0; n < 40; n++) {
    const bytes = crypto.getRandomValues(new Uint8Array(n));
    assert.deepEqual(fromB64u(toB64u(bytes)), bytes);
  }
  assert.equal(fromB64u("A"), null);
  assert.equal(fromB64u("AB"), null, "stray low bits");
  assert.equal(fromB64u("a+b/"), null);
  assert.equal(fromB64u("YQ=="), null);
  assert.deepEqual(fromB64u("YQ"), utf8("a"));
});

/* ------------------------------------------------- what the sheet puts in a link */

const row = (input, extra = {}) => ({
  id: extra.id ?? "a",
  input: { name: "", date: "1990-06-15", time: "12:00", latitude: 48.85341, longitude: 2.3488, placeLabel: "Paris, Île-de-France, France", houseSystem: "placidus", ...input },
  chart: { meta: { date: "1990-06-15", time: "12:00", latitude: 48.85341, longitude: 2.3488, houseSystem: "placidus", birthTime: { zone: "Europe/Paris", zoneSource: "place", local: "normal" } } },
  timeUnknown: false,
  savedAt: 1,
  ...extra,
});

test("the sheet's switches: the name (with numerology's names) and the place's name, the coordinates always", () => {
  const camille = row({ name: "Camille", birthName: "Camille Anne Martin", currentName: "Cam Martin", numerologyY: { name: "Camille Anne Martin", roles: "v" }, chineseCount: "yin" });
  const all = sharedBirthOf(camille, { name: true, place: true });
  assert.equal(all.name, "Camille");
  assert.equal(all.birthName, "Camille Anne Martin");
  assert.equal(all.currentName, "Cam Martin");
  assert.equal(all.numerologyY, "v");
  assert.equal(all.placeLabel, "Paris, Île-de-France, France");
  assert.equal(all.zone, "Europe/Paris", "the place's zone, read back from the chart");
  assert.equal(all.chineseCount, "yin");
  const anonymous = sharedBirthOf(camille, { name: false, place: false });
  for (const key of ["name", "birthName", "currentName", "numerologyY", "placeLabel"]) assert.equal(anonymous[key], undefined, key);
  assert.equal(anonymous.latitude, 48.85341);
  assert.equal(anonymous.date, "1990-06-15");
  // An unnamed chart is called by its place and date, which the link carries anyway: no name goes.
  const unnamed = row({ name: "Paris · 15/06/1990" });
  assert.equal(hasOwnName(unnamed), false);
  assert.equal(sharedBirthOf(unnamed, { name: true, place: true }).name, undefined);
  // Y's set for another name stay behind.
  assert.equal(sharedBirthOf(row({ name: "Camille", numerologyY: { name: "Someone Else", roles: "v" } }), { name: true, place: true }).numerologyY, undefined);
  // An unknown time goes as one.
  const noTime = sharedBirthOf({ ...row({ time: "" }), timeUnknown: true }, { name: true, place: true });
  assert.equal(noTime.time, "");
  assert.equal(noTime.timeUnknown, true);
});

test("Relationship pages offer both charts: the partner as the page shows it", () => {
  const rows = [row({}, { id: "a" }), row({}, { id: "b" }), row({}, { id: "c" })];
  const s = (pair, activeId = "a") => ({ rows, activeId, pair: { partnerId: null, compositePartnerId: null, ...pair } });
  assert.equal(partnerRow(s({ partnerId: "c" }), "synastry")?.id, "c");
  assert.equal(partnerRow(s({ partnerId: "c" }), "bazi-pair")?.id, "c");
  assert.equal(partnerRow(s({ partnerId: "gone" }), "zodiac-pair")?.id, "b", "the first other chart, as the page falls back");
  assert.equal(partnerRow(s({ partnerId: "c", compositePartnerId: "b" }), "composite")?.id, "b", "composite keeps its own");
  assert.equal(partnerRow(s({ partnerId: "" }), "fengshui-pair"), null, "a partner cleared");
  assert.equal(partnerRow(s({ partnerId: "a" }), "synastry")?.id, "b", "never the chart itself");
  assert.equal(partnerRow(s({ partnerId: "c" }), "natal"), null);
  assert.deepEqual(STUDIO_PAGES.filter(isPairPage).sort(), ["bazi-pair", "composite", "design-pair", "fengshui-pair", "numerology-pair", "synastry", "zodiac-pair"]);
});

test("the sheet's line says what the link holds", () => {
  assert.equal(previewLine({ ...A, placeLabel: "Paris" }, "en", "time unknown"), "Camille · 15 June 1990, 12:00 · Paris");
  assert.equal(previewLine({ ...A, name: undefined, placeLabel: undefined }, "fr", "heure inconnue"), "15 juin 1990, 12:00");
  assert.equal(previewLine({ ...A, time: "", timeUnknown: true, date: "0044-03-15" }, "en", "time unknown"), "Camille · 15 March 44, time unknown · Paris, Île-de-France, France");
});

/* ------------------------------------------------- the words, and the privacy rule's pages */

test("the share book: both languages, Ulune's typography, every word said by the code that loads it", () => {
  for (const [key, [en, fr]] of Object.entries(shareWords)) {
    assert.ok(en.trim() && fr.trim(), `${key}: a language missing`);
    for (const t of [en, fr]) assert.ok(!/\w'\w/.test(t), `${key}: a straight apostrophe in "${t}"`);
    assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(fr), `${key}: French punctuation without its narrow space: "${fr}"`);
    assert.ok(!/« |«[^\u202f]| »|[^\u202f]»/.test(fr), `${key}: « » without narrow spaces in "${fr}"`);
    assert.ok(!(key in CATALOG), `${key} in both the catalog and the share book`);
  }
  const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  };
  const sayers = ["src/components/share", "src/lib/share", "src/lib/space/inbox.ts"].flatMap((p) => (p.endsWith(".ts") ? [join(ROOT, p)] : walk(join(ROOT, p))));
  const corpus = sayers.map((p) => readFileSync(p, "utf8")).join("\n");
  const unsaid = Object.keys(shareWords).filter((key) => !new RegExp(`["'\`]${key}["'\`]|\\.${key}\\b`).test(corpus));
  assert.deepEqual(unsaid, []);
  // The two words the first page needs are in the catalog: the menu's item and the switcher's mark.
  assert.ok(CATALOG.shareLink && CATALOG.sharedWithYou && CATALOG.exportMenu[0] === "Share and export");
});

test("/s is one of Ulune's pages for the privacy rule, and carries nothing in its address", async () => {
  const { notAppFile } = await import("./e2e/_sent.mjs");
  const { DEV } = await import("./e2e/_lib.mjs");
  const ask = (path, type = "document") => ({ url: () => new URL(path, DEV).href, method: () => "GET", postData: () => null, resourceType: () => type });
  assert.equal(notAppFile(ask("/s")), "");
  assert.notEqual(notAppFile(ask("/s?chart=1990")), "", "a query on /s is sent");
  assert.notEqual(notAppFile(ask("/s", "fetch")), "", "only as a page");
  assert.notEqual(notAppFile(ask("/sx")), "");
});
