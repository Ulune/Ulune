// What's new (src/lib/changes.ts, rendered at /changes; languages plan, part
// 29): the newest entry names the version the footer, Settings and the error
// reports carry (APP_VERSION); English and French tell the same versions in
// the same shape, block by block and line by line; the typography is the
// rest of Ulune's (curly apostrophes, French narrow no-break spaces). The 2.0
// entry waits in src/lib/changes-2.0-draft.ts until 2.0 is ready
// (PRODUCTION.md, "Branches and releases": v2 leaves the version and the top
// of changes.ts alone): it is held to the same rules, and never shown before
// its version is.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { CHANGES, CHANGES_UPDATED } from "../src/lib/changes.ts";
import { APP_VERSION } from "../src/lib/app-identity.ts";

const { en, fr } = CHANGES;
const HEADING = /^Ulune (\d+)\.(\d+)(?:\.(\d+))?$/;
const blockTexts = (b) => [b.h ?? "", b.p ?? "", ...(b.list ?? [])];
const texts = (page) => [page.title, page.updated, ...page.blocks.flatMap(blockTexts)];

// The 2.0 draft, while it waits; once it is written into changes.ts at the release, the file goes and these checks with it.
const DRAFT_URL = new URL("../src/lib/changes-2.0-draft.ts", import.meta.url);
const draft = existsSync(DRAFT_URL) ? (await import(DRAFT_URL.href)).CHANGES_2_0_DRAFT : null;

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

/** The French block tells what the English one does, line for line. */
function assertTwins(block, twin) {
  assert.equal(twin.h, block.h);
  assert.equal(Boolean(twin.p), Boolean(block.p), `${block.h}: a lead in one language only`);
  assert.equal(twin.list?.length, block.list?.length, `${block.h}: ${block.list?.length} lines in English, ${twin.list?.length} in French`);
  block.list.forEach((item, j) => assert.notEqual(twin.list[j], item, `${block.h}, line ${j + 1}: French not written`));
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

test("the newest entry is the version Ulune says it is", () => {
  assert.equal(en.blocks[0].h, `Ulune ${APP_VERSION}`);
  assert.equal(fr.blocks[0].h, `Ulune ${APP_VERSION}`);
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

test("the 2.0 draft waits for its version: newer than Ulune's, not yet in What's new, ready in both languages", { skip: draft ? false : "written into changes.ts" }, () => {
  for (const block of [draft.en, draft.fr]) assertShape(block);
  assertTwins(draft.en, draft.fr);
  // Its version is ahead of the one Ulune says it is, and What's new does not show it yet.
  assert.ok(newer(versionOf(draft.en.h), versionOf(`Ulune ${APP_VERSION}`)) > 0, `${draft.en.h} is not newer than Ulune ${APP_VERSION}`);
  assert.ok(!en.blocks.some((b) => b.h === draft.en.h), `${draft.en.h} is in changes.ts already: delete the draft`);
  assertCurly([...blockTexts(draft.en), ...blockTexts(draft.fr)]);
  assertFrenchSpacing(blockTexts(draft.fr));
});
