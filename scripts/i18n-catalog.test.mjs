import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";
import { calendarLayerWords } from "../src/lib/i18n/catalog/calendar-layer-words.ts";
import { pickerWords } from "../src/lib/i18n/catalog/picker-words.ts";
import { chinese } from "../src/lib/i18n/catalog/chinese.ts";
import { spaceWords } from "../src/lib/i18n/catalog/space-words.ts";
import { dataWords } from "../src/lib/i18n/catalog/data-words.ts";
import { aiWords } from "../src/lib/i18n/catalog/ai-words.ts";
import { placesWords } from "../src/lib/i18n/catalog/places-words.ts";
import { guideWords } from "../src/lib/i18n/catalog/guide-words.ts";
import { guideBodyWords } from "../src/lib/i18n/catalog/guide-body-words.ts";
import { bodiesWords } from "../src/lib/i18n/catalog/bodies-words.ts";
import { lookWords } from "../src/lib/i18n/catalog/look-words.ts";
import { tablesWords } from "../src/lib/i18n/catalog/tables-words.ts";
import { engineWords } from "../src/lib/i18n/catalog/engine-words.ts";
import { hdPairWords } from "../src/lib/i18n/catalog/hd-pair-words.ts";
import { hdCyclesWords } from "../src/lib/i18n/catalog/hd-cycles-words.ts";
import { fengShuiCyclesWords } from "../src/lib/i18n/catalog/fengshui-cycles-words.ts";
import { groupsWords } from "../src/lib/i18n/catalog/groups-words.ts";
import { groupsNeedWords } from "../src/lib/i18n/catalog/groups-need-words.ts";
import { numPairWords } from "../src/lib/i18n/catalog/numerology-pair-words.ts";
import { pairNowWords } from "../src/lib/i18n/catalog/pair-now-words.ts";
import { pairNowWestWords } from "../src/lib/i18n/catalog/pair-now-west-words.ts";
import { calendarPeopleWords } from "../src/lib/i18n/catalog/calendar-people-words.ts";
import { syncWords } from "../src/lib/i18n/catalog/sync-words.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const CAT_DIR = join(ROOT, "src/lib/i18n/catalog");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|json|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

test("every key has English and French", () => {
  for (const [key, [en, fr]] of Object.entries(CATALOG)) {
    assert.ok(en && en.trim(), `${key}: English missing`);
    assert.ok(fr && fr.trim(), `${key}: French missing`);
  }
});

test("no key is defined in two areas", () => {
  const seen = new Map();
  for (const f of readdirSync(CAT_DIR)) {
    if (f === "index.ts") continue;
    const src = readFileSync(join(CAT_DIR, f), "utf8");
    for (const m of src.matchAll(/\n {2}([A-Za-z0-9_]+): \[/g)) {
      assert.ok(!seen.has(m[1]), `${m[1]} in ${f} and ${seen.get(m[1])}`);
      seen.set(m[1], f);
    }
  }
});

test("typographic apostrophes only", () => {
  for (const [key, pair] of Object.entries(CATALOG)) {
    for (const text of pair) assert.ok(!/\w'\w/.test(text), `${key}: straight apostrophe in "${text}"`);
  }
});

test("no unused keys", () => {
  const corpus = walk(join(ROOT, "src"))
    .filter((p) => !p.startsWith(CAT_DIR))
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
  const unused = Object.keys(CATALOG).filter((key) => {
    if (new RegExp(`["'\`]${key}["'\`]`).test(corpus)) return false;
    if (new RegExp(`[.\\[]${key}\\b`).test(corpus)) return false;
    if (key.startsWith("scrubUnit_") || key.startsWith("err_")) return false;
    if (key.endsWith("Hint") && new RegExp(`["'\`]${key.slice(0, -4)}["'\`]`).test(corpus)) return false;
    return true;
  });
  assert.deepEqual(unused, []);
});

test("no English literal in aria-label", () => {
  const hits = walk(join(ROOT, "src"))
    .filter((p) => p.endsWith(".tsx"))
    .flatMap((p) =>
      [...readFileSync(p, "utf8").matchAll(/aria-label="([A-Za-z][^"]*)"/g)].map((m) => `${p}: ${m[1]}`),
    );
  assert.deepEqual(hits, []);
});

test("the catalogs read on their own, outside the index (the calendar's layers, the language picker, the Chinese traditions, the space sheet's, Your data's, the AI accounts', the switcher's homes', the guide's, the Bodies tab's, the Look tab's and the table's books), are complete too", () => {
  // Kept out of the index so they stay out of the first download; held to the same rules.
  for (const [name, words] of Object.entries({ calendarLayerWords, pickerWords, chinese, spaceWords, dataWords, aiWords, placesWords, guideWords, guideBodyWords, bodiesWords, lookWords, tablesWords, engineWords, hdPairWords, hdCyclesWords, fengShuiCyclesWords, groupsWords, groupsNeedWords, numPairWords, pairNowWords, pairNowWestWords, calendarPeopleWords, syncWords })) {
    for (const [key, [en, fr]] of Object.entries(words)) {
      assert.ok(en && en.trim(), `${name}.${key}: English missing`);
      assert.ok(fr && fr.trim(), `${name}.${key}: French missing`);
      for (const text of [en, fr]) assert.ok(!/\w'\w/.test(text), `${name}.${key}: straight apostrophe in "${text}"`);
      // French spacing: a narrow no-break space before : ; ! ? and inside « ».
      assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(fr), `${name}.${key}: French punctuation without its narrow space: "${fr}"`);
      assert.ok(!/« |«[^\u202f]| »|[^\u202f]»/.test(fr), `${name}.${key}: « » without narrow spaces in "${fr}"`);
    }
  }
});

test("every Chinese traditions word is said somewhere", () => {
  const corpus = walk(join(ROOT, "src"))
    .filter((p) => !p.startsWith(CAT_DIR))
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
  const unused = Object.keys(chinese).filter((key) => !new RegExp(`["'\`]${key}["'\`]`).test(corpus));
  assert.deepEqual(unused, []);
});

test("every word of the books kept out of the first download is said somewhere, and by the code that loads it", () => {
  const read = (p) => readFileSync(join(ROOT, p), "utf8");
  // The rest of the app's code: a book's word said there would be read from the catalog, which
  // lacks it, and show its key (part 30: the Bodies tab's, the Look tab's and the table's books).
  const others = walk(join(ROOT, "src")).filter((p) => !p.startsWith(CAT_DIR) && /\.(ts|tsx)$/.test(p));
  for (const [words, files] of [
    [spaceWords, ["src/components/space/space-sheet.tsx", "src/components/space/space-settings.tsx"]],
    [dataWords, ["src/components/your-data.tsx"]],
    [aiWords, ["src/components/ai-accounts.tsx"]],
    [placesWords, ["src/studio/shell/picker-places.tsx", "src/lib/chinese/fengshui-home-line.ts", "src/studio/shell/CommandPaletteDialog.tsx"]],
    [guideWords, ["src/components/first-screen/GuideAnswer.tsx"]],
    [guideBodyWords, ["src/components/first-screen/Guide.tsx"]],
    [bodiesWords, ["src/studio/dock/BodiesTab.tsx", "src/components/body-mixer.tsx", "src/components/aspect-layer-toggle.tsx", "src/components/wheel-hidden-note.tsx"]],
    [lookWords, ["src/studio/dock/LookTab.tsx", "src/components/look-panel.tsx", "src/components/look-profiles.tsx"]],
    [tablesWords, ["src/lib/chart/table-cells.ts"]],
    // The calculations on the device (on-device plan, step 5): their notices and their setting.
    [engineWords, ["src/components/engine/engine-ui.ts", "src/components/calculate-settings.tsx"]],
    // Human Design's connection chart (share and compare plan, feature 5a): its page, its table and the table's text.
    [hdPairWords, ["src/studio/modes/design-pair.tsx", "src/studio/tables/hd-pair-table.tsx", "src/lib/chart/hd-pair-table.ts"]],
    // Human Design's Cycles (feature 5b): its page, its table and the table's text.
    [hdCyclesWords, ["src/studio/modes/design-cycles.tsx", "src/studio/tables/hd-cycles-table.tsx", "src/lib/chart/hd-cycles-table.ts"]],
    // Feng Shui's Cycles (feature 5d): its page, readings and table, and Compare's "What they share" (review of 2.0's week 3).
    [fengShuiCyclesWords, ["src/studio/modes/fengshui-cycles.tsx", "src/lib/chinese/fengshui-cycles-reading.ts", "src/lib/chinese/fengshui-cycles-table.ts", "src/studio/tables/fengshui-cycles-table.tsx", "src/studio/compare/shared-fengshui.ts"]],
    // "You two, now" under each pair's reading (feature 5e): its heading on every page, the Chinese pages' table parts.
    [
      pairNowWords,
      [
        "src/studio/modes/pair-now/now-parts.tsx",
        "src/lib/i18n/pair-now-astro.ts",
        "src/lib/chart/interpret-pair-now.ts",
        "src/lib/chart/interpret-hd-pair-now.ts",
        "src/studio/tables/pair-now-astro-part.tsx",
        "src/studio/tables/pair-now-hd-part.tsx",
        "src/studio/modes/zodiac-pair.tsx",
        "src/studio/tables/zodiac-pair-table.tsx",
        "src/studio/modes/fengshui-pair.tsx",
        "src/studio/tables/fengshui-pair-table.tsx",
        "src/studio/modes/bazi-pair.tsx",
        "src/studio/tables/bazi-pair-table.tsx",
      ],
    ],
    // Its Western pages' own lines (astrology's Synastry and Composite, Human Design's connection chart; the week 4 review).
    [
      pairNowWestWords,
      [
        "src/studio/modes/pair-now/astro-now.tsx",
        "src/studio/modes/pair-now/hd-now.tsx",
        "src/studio/modes/pair-now/hd-now-words.ts",
        "src/lib/i18n/pair-now-astro.ts",
        "src/lib/chart/interpret-pair-now.ts",
        "src/lib/chart/interpret-hd-pair-now.ts",
        "src/studio/tables/pair-now-astro-part.tsx",
        "src/studio/tables/pair-now-hd-part.tsx",
      ],
    ],
    // The Calendar's birthdays and returns (idea B10): the layer's own module and its texts, loaded when it is on.
    [calendarPeopleWords, ["src/components/calendar-people.tsx", "src/lib/i18n/calendar-people-text.ts"]],
    // The synced account (feature 4): the space's sheet and settings, the device link's panel, the /link page.
    [
      syncWords,
      [
        "src/components/space/space-sheet.tsx",
        "src/components/space/space-settings.tsx",
        "src/components/space/sync-settings.tsx",
        "src/components/space/sync-link.tsx",
        "src/components/space/link-landing.tsx",
      ],
    ],
  ]) {
    const corpus = files.map(read).join("\n");
    const unsaid = Object.keys(words).filter((key) => !new RegExp(`["'\`]${key}["'\`]`).test(corpus));
    assert.deepEqual(unsaid, []);
    for (const key of Object.keys(words)) assert.ok(!(key in CATALOG), `${key} in both the catalog and a book`);
    const elsewhere = others
      .filter((p) => !files.includes(p.slice(ROOT.length)))
      .flatMap((p) => Object.keys(words).filter((key) => new RegExp(`["'\`]${key}["'\`]`).test(readFileSync(p, "utf8"))).map((key) => `${key} in ${p.slice(ROOT.length)}`));
    assert.deepEqual(elsewhere, [], "a book's word said by code that does not load the book");
  }
});

