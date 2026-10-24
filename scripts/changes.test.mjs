// What's new (src/lib/changes.ts, rendered at /changes; languages plan, part
// 29): the newest entry names the version the footer, Settings and the error
// reports carry (APP_VERSION, which package.json states too); English and
// French tell the same versions in the same shape, block by block and line by
// line; the typography is the rest of Ulune's (curly apostrophes, French
// narrow no-break spaces). The synced account's lines wait in
// src/lib/changes-sync-draft.ts until its server is live (2.0's release,
// PRODUCTION.md): held to the same rules, and never promised before, so
// What's new says nothing of syncing while they wait.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { CHANGES, CHANGES_UPDATED } from "../src/lib/changes.ts";
import { APP_VERSION } from "../src/lib/app-identity.ts";

const { en, fr } = CHANGES;
const HEADING = /^Ulune (\d+)\.(\d+)(?:\.(\d+))?$/;
const blockTexts = (b) => [b.h ?? "", b.p ?? "", ...(b.list ?? [])];
const texts = (page) => [page.title, page.updated, ...page.blocks.flatMap(blockTexts)];

// The synced account's lines, while they wait; once they are in changes.ts, the file goes and these checks with it.
const SYNC_URL = new URL("../src/lib/changes-sync-draft.ts", import.meta.url);
const syncDraft = existsSync(SYNC_URL) ? (await import(SYNC_URL.href)).CHANGES_SYNC_DRAFT : null;
const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

/** A heading's version as numbers, [2, 0, 0] for "Ulune 2.0". */
function versionOf(h) {
  const m = HEADING.exec(h ?? "");
  assert.ok(m, `not a version's heading: "${h}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}
const newer = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** A version's block: a heading, a lead ending with a colon, and its lines. */
function assertShape(block) {
  versionOf(block.h);
  assert.ok(block.p?.trim().endsWith(":"), `${block.h}: its lead ends with a colon`);
  assert.ok(block.list?.length, `${block.h}: no list`);
  for (const item of block.list) assert.ok(item.trim().length > 10, `${block.h}: an empty line`);
}

/** The French lines tell what the English ones do, line for line. */
function assertTwinLines(name, list, twin) {
  assert.equal(twin?.length, list?.length, `${name}: ${list?.length} lines in English, ${twin?.length} in French`);
  list.forEach((item, j) => assert.notEqual(twin[j], item, `${name}, line ${j + 1}: French not written`));
}

/** The French block tells what the English one does, line for line. */
function assertTwins(block, twin) {
  assert.equal(twin.h, block.h);
  assert.equal(Boolean(twin.p), Boolean(block.p), `${block.h}: a lead in one language only`);
  assertTwinLines(block.h, block.list, twin.list);
}

function assertCurly(list) {
  for (const text of list) {
    assert.ok(!text.includes("'"), `straight apostrophe in "${text.slice(0, 80)}…"`);
    assert.ok(!text.includes('"'), `straight quote in "${text.slice(0, 80)}…"`);
  }
}

function assertFrenchSpacing(list) {
  for (const text of list) {
    const bad = [];
    for (const m of text.matchAll(/(.{0,24})(?<![\u202f\d])([:;!?])(?=\s|$)/gu)) bad.push(`${m[1]}${m[2]}`);
    for (const m of text.matchAll(/(.{0,12})«(?!\u202f)(.{0,12})/gu)) bad.push(`${m[1]}«${m[2]}`);
    for (const m of text.matchAll(/(.{0,12})(?<!\u202f)»/gu)) bad.push(`${m[1]}»`);
    assert.deepEqual(bad, [], `in "${text.slice(0, 80)}…"`);
  }
}

test("the newest entry is the version Ulune says it is, and package.json says the same", () => {
  // "Ulune 2.0" names 2.0.0, as "Ulune 1.0" named 1.0.0.
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
  const version = APP_VERSION.split(".").map(Number);
  assert.deepEqual(versionOf(en.blocks[0].h), version, `What's new begins with ${en.blocks[0].h}, Ulune is ${APP_VERSION}`);
  assert.deepEqual(versionOf(fr.blocks[0].h), version);
  const pkg = readJson("../package.json");
  assert.equal(pkg.version, APP_VERSION, "package.json's version");
  const lock = readJson("../package-lock.json");
  assert.equal(lock.version, APP_VERSION, "package-lock.json's version");
  assert.equal(lock.packages?.[""]?.version, APP_VERSION, "package-lock.json's own package");
  // The page's date is a real day.
  assert.match(CHANGES_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
  const day = new Date(`${CHANGES_UPDATED}T00:00:00Z`);
  assert.equal(day.toISOString().slice(0, 10), CHANGES_UPDATED);
});

test("every version once, newest first, each a heading, a lead and its list", () => {
  const versions = en.blocks.map((b) => versionOf(b.h));
  for (let i = 1; i < versions.length; i++) {
    assert.ok(newer(versions[i - 1], versions[i]) > 0, `${en.blocks[i - 1].h} is not newer than ${en.blocks[i].h}`);
  }
  for (const page of [en, fr]) for (const block of page.blocks) assertShape(block);
});

test("English and French tell the same versions in the same shape", () => {
  assert.equal(en.title, "What’s new");
  assert.equal(fr.title, "Nouveautés");
  assert.ok(en.updated.includes("{date}") && fr.updated.includes("{date}"));
  assert.deepEqual(
    fr.blocks.map((b) => b.h),
    en.blocks.map((b) => b.h),
  );
  en.blocks.forEach((block, i) => assertTwins(block, fr.blocks[i]));
});

test("curly apostrophes and quotes in both languages", () => {
  assertCurly([...texts(en), ...texts(fr)]);
});

test("French typography: a narrow no-break space before : ; ! ? and inside « »", () => {
  assertFrenchSpacing(texts(fr));
});

test("the synced account's lines wait, ready in both languages, and What's new promises no syncing meanwhile", { skip: syncDraft ? false : "written into changes.ts" }, () => {
  assert.ok(syncDraft.en.length > 0, "no line waits");
  assertTwinLines("the sync draft", syncDraft.en, syncDraft.fr);
  for (const item of [...syncDraft.en, ...syncDraft.fr]) assert.ok(item.trim().length > 10, "an empty line");
  assertCurly([...syncDraft.en, ...syncDraft.fr]);
  assertFrenchSpacing(syncDraft.fr);
  // Not shown before the account's server is live: no line of it, and no word of syncing, in What's new.
  const shown = [...texts(en), ...texts(fr)];
  for (const item of [...syncDraft.en, ...syncDraft.fr]) assert.ok(!shown.includes(item), `already in What's new: "${item.slice(0, 60)}…"`);
  for (const text of shown) assert.doesNotMatch(text, /\bsync|synchroni/i, `What's new speaks of syncing: "${text.slice(0, 80)}…"`);
});
