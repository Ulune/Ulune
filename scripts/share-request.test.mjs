/*
 * Asking for someone's chart (share and compare plan, idea B4;
 * src/lib/share/request.ts and the typed link in link.ts): the request
 * link both ways, what it may hold and nothing more, hostile links, and the
 * versions: a share link (version 1) reads as it always did, a request is a
 * typed link (version 2, type 1), and a version or a type this one does not
 * know is a newer Ulune's, never a broken link's.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ShareLinkError, toB64u, utf8 } from "../src/lib/share/bytes.ts";
import { PAGE_CODES } from "../src/lib/share/format.ts";
import { MAX_FRAGMENT, TYPED_VERSION, makeRequestLink, makeShareLink, readLink, readShareFragment } from "../src/lib/share/link.ts";
import { ASKER_MAX, REQUEST_TYPE, packRequest, requestPage, unpackRequest } from "../src/lib/share/request.ts";
import { STUDIO_PAGES } from "../src/studio/url.ts";
import { lensOf } from "../src/studio/map.ts";

const fragmentOf = (link) => link.slice(link.indexOf("#"));

/** Fixture A (the e2e suites' made-up chart) as a share link carries it. */
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

/** A typed link's plaintext sealed as Ulune seals one (version 2's key size, nonce and associated data). */
async function sealTyped(plain, { version = 2, aad = "ulune/link/v2" } = {}) {
  const raw = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(12), additionalData: utf8(aad) }, key, Uint8Array.from(plain)));
  return `#${version}.${toB64u(raw)}.${toB64u(ct)}`;
}

/** The reason a fragment is refused ("" when it reads). */
async function refusal(fragment) {
  try {
    await readLink(fragment);
    return "";
  } catch (err) {
    assert.ok(err instanceof ShareLinkError, `not a ShareLinkError: ${err}`);
    return err.reason;
  }
}

const text = (s) => {
  const b = utf8(s);
  return [b.length, ...b];
};

test("a request link reads back what was put in it: the language, the page, the first name when given", async () => {
  const cases = [
    {},
    { lang: "fr" },
    { lang: "en", page: "bazi" },
    { lang: "fr", asker: "Camille", page: "design" },
    { asker: "Zoé", page: "numerology-cycles" },
    { asker: "李雷" },
  ];
  for (const request of cases) {
    const link = await makeRequestLink("https://ulune.app/", request);
    assert.match(link, /^https:\/\/ulune\.app\/s#2\.[\w-]{22}\.[\w-]+$/);
    const back = await readLink(fragmentOf(link));
    assert.equal(back.kind, "request");
    // English is the language when none is given; the birth chart's page goes as none.
    assert.deepEqual(back.request, { lang: request.lang ?? "en", ...(request.page ? { page: request.page } : {}), ...(request.asker ? { asker: request.asker } : {}) });
  }
});

test("a request holds no birth and nothing readable: short, its own key each time", async () => {
  const link = await makeRequestLink("https://ulune.app", { asker: "Camille", lang: "fr", page: "bazi" });
  assert.ok(link.length <= 110, `${link.length} characters`);
  assert.ok(!/camille|bazi/i.test(link), link);
  const again = await makeRequestLink("https://ulune.app", { asker: "Camille", lang: "fr", page: "bazi" });
  assert.notEqual(again, link, "a new key, so a new link");
  // Its bytes: the type, the flags, the language, the page's code, the name; nothing else.
  assert.deepEqual([...packRequest({ asker: "Ana", lang: "fr", page: "bazi" })], [0b11, 1, PAGE_CODES.bazi, 3, 0x41, 0x6e, 0x61]);
  assert.deepEqual([...packRequest({})], [0, 0]);
  assert.equal(REQUEST_TYPE, 1);
  assert.equal(TYPED_VERSION, 2);
});

test("a request opens one person's page: a Relationship page, Feng Shui's Home and the Calendar give their language's birth chart", () => {
  for (const page of STUDIO_PAGES) {
    const shown = requestPage(page);
    assert.ok(lensOf(shown) !== "relationship" && lensOf(shown) !== "home" && shown !== "timing", `${page} → ${shown}`);
    if (lensOf(page) === "natal" || lensOf(page) === "cycles") assert.equal(shown, page);
  }
  assert.equal(requestPage("synastry"), "natal");
  assert.equal(requestPage("composite"), "natal");
  assert.equal(requestPage("bazi-pair"), "bazi");
  assert.equal(requestPage("zodiac-pair"), "zodiac");
  assert.equal(requestPage("fengshui-pair"), "fengshui");
  assert.equal(requestPage("fengshui-home"), "fengshui");
  assert.equal(requestPage("timing"), "natal");
  // Packed from a Relationship page, it carries the language's own page.
  assert.deepEqual(unpackRequest(packRequest({ page: "bazi-pair" })), { lang: "en", page: "bazi" });
  assert.deepEqual(unpackRequest(packRequest({ page: "synastry" })), { lang: "en" });
});

test("the first name is cleaned as a share link's names are: no script, no control or direction marks, at most 40 characters", async () => {
  const rlo = String.fromCharCode(0x202e);
  const nul = String.fromCharCode(0);
  const read = async (name) => (await readLink(await sealTyped([1, 1, 0, ...text(name)]))).request.asker;
  assert.equal(await read('<script>alert("x")</script>'), 'scriptalert("x")/script');
  assert.equal(await read(`${rlo}evil${nul}`), "evil");
  assert.equal(await read("  Anne \t Marie "), "Anne Marie");
  assert.equal(await read(`${rlo} `), undefined, "nothing left: no name");
  assert.equal(Array.from(await read("é".repeat(80))).length, ASKER_MAX);
  // The sheet's side cleans before packing too.
  assert.deepEqual(unpackRequest(packRequest({ asker: `${rlo}Camille<b>` })), { lang: "en", asker: "Camilleb" });
  assert.deepEqual(unpackRequest(packRequest({ asker: "   " })), { lang: "en" });
});

test("hostile requests are refused, each for its reason, or read as the safe thing", async () => {
  const cases = [
    [[1, 0b100, 0], "reserved"],
    [[1, 0x80, 0], "reserved"],
    [[1, 0b10, 0, 64], "reserved"],
    [[1, 0b10, 0, 255], "reserved"],
    [[1, 0b10, 0], "short"],
    [[1, 0b1, 0, 5, 0x41], "short"],
    [[1, 0b1, 0, 3, 0xff, 0xfe, 0xfd], "utf8"],
    [[1, 0, 0, 0], "trailing"],
    [[1, 0b1, 0, ...text("Ana"), 0], "trailing"],
    [[0, 0, 0], "type"],
    [[2, 0, 0], "newer"],
    [[255, 0, 0], "newer"],
  ];
  for (const [plain, reason] of cases) assert.equal(await refusal(await sealTyped(plain)), reason, `${reason}: ${plain}`);
  // Too short or too long for a typed link, before anything is opened.
  assert.equal(await refusal(await sealTyped([1, 0])), "size");
  assert.equal(await refusal(await sealTyped([1, 1, 0, ...new Array(400).fill(0x41)])), "size");
  // A language this version does not know: left out (the reader's own is used).
  assert.deepEqual((await readLink(await sealTyped([1, 0, 9]))).request, {});
  // A page this version does not know (a code never given): the birth chart.
  const unknown = 63;
  assert.ok(!Object.values(PAGE_CODES).includes(unknown));
  assert.deepEqual((await readLink(await sealTyped([1, 0b10, 1, unknown]))).request, { lang: "fr" });
  // A Relationship page's code, which no sheet puts in a request: its language's own page.
  assert.deepEqual((await readLink(await sealTyped([1, 0b10, 0, PAGE_CODES["bazi-pair"]]))).request, { lang: "en", page: "bazi" });
});

test("versions: a share link reads as it always did, a request is version 2, a newer version or type says so", async () => {
  const share = await makeShareLink("https://ulune.app", { page: "bazi", charts: [A] });
  assert.match(share, /\/s#1\./);
  const read = await readLink(fragmentOf(share));
  assert.equal(read.kind, "share");
  assert.deepEqual(read.share, { page: "bazi", charts: [A] });
  assert.deepEqual(await readShareFragment(fragmentOf(share)), { page: "bazi", charts: [A] });
  // A request is not a shared chart.
  const request = fragmentOf(await makeRequestLink("https://ulune.app", { asker: "Ana" }));
  await assert.rejects(readShareFragment(request), (e) => e instanceof ShareLinkError && e.reason === "type");
  const [, key, sealed] = request.slice(1).split(".");
  const [, shareKey, shareSealed] = fragmentOf(share).slice(1).split(".");
  const cases = [
    [`#3.${key}.${sealed}`, "newer"],
    [`#42.${key}.${sealed}`, "newer"],
    [`#02.${key}.${sealed}`, "version"],
    [`#r1.${key}.${sealed}`, "version"],
    // A request under version 1's number, a share under version 2's: their seals no longer hold.
    [`#1.${key}.${sealed}`, "size|sealed"],
    [`#2.${shareKey}.${shareSealed}`, "size|sealed"],
    [`#2.${key}.${sealed.slice(0, -2)}`, "size|sealed"],
    [`#2.${key}.${sealed.slice(0, 20)}${sealed[20] === "A" ? "B" : "A"}${sealed.slice(21)}`, "sealed"],
    [`#2.${key.slice(0, 20)}.${sealed}`, "key"],
    [`#2.${key}`, "shape"],
    [`#${"2".repeat(MAX_FRAGMENT + 1)}`, "long"],
  ];
  for (const [fragment, reason] of cases) {
    const got = await refusal(fragment);
    assert.ok(reason.split("|").includes(got), `${fragment.slice(0, 40)}: "${got}", not ${reason}`);
  }
  // A version-1 link is held to version 1's sizes, whatever its seal.
  assert.equal(await refusal(await sealTyped([1, 0, 0], { version: 1, aad: "ulune/link/v2" })), "size");
});

test("fuzz: random and mutated typed links either read as a request or are refused, never anything else", async () => {
  const valid = [REQUEST_TYPE, ...packRequest({ asker: "Camille", lang: "fr", page: "design" })];
  let read = 0;
  for (let i = 0; i < 1200; i++) {
    let plain;
    if (i % 2) {
      plain = [...valid];
      for (let k = 1 + (i % 3); k > 0; k--) plain[Math.floor(Math.random() * plain.length)] ^= 1 << Math.floor(Math.random() * 8);
    } else {
      plain = [...crypto.getRandomValues(new Uint8Array(3 + Math.floor(Math.random() * 60)))];
      if (i % 4 === 0) plain[0] = 1;
    }
    try {
      const link = await readLink(await sealTyped(plain));
      read++;
      assert.equal(link.kind, "request");
      const { asker, lang, page, ...rest } = link.request;
      assert.deepEqual(rest, {});
      if (asker !== undefined) assert.ok(typeof asker === "string" && asker.length > 0 && Array.from(asker).length <= ASKER_MAX && !/[<>]/.test(asker) && !Array.from(asker).some((c) => c.codePointAt(0) < 32));
      if (lang !== undefined) assert.ok(lang === "en" || lang === "fr");
      if (page !== undefined) assert.ok(STUDIO_PAGES.includes(page) && requestPage(page) === page && page !== "natal");
    } catch (err) {
      assert.ok(err instanceof ShareLinkError, `${err} for ${plain}`);
    }
  }
  assert.ok(read > 0, "some mutated requests still read (a changed letter in a name)");
});
