/**
 * The Calendar's layers by language (page reorganisation plan, R5): the
 * registry and its defaults, what is kept on this device, the sky alone
 * without a chart, and which rows each layer lets into the events table and
 * the calendar file.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CALENDAR_LAYERS,
  LAYER_LANGUAGE_LABEL,
  anyPersonalShown,
  cleanChoices,
  layerAvailable,
  layerGroups,
  layerOfRow,
  layersForWhom,
  layersOn,
  rowShown,
  shownLayers,
} from "../src/lib/chart/calendar-layers.ts";
import { CALENDAR_DEFAULTS, loadCalendarPrefs, parseCalendarPrefs, saveCalendarPrefs } from "../src/lib/chart/calendar-prefs.ts";
import { calendarRows } from "../src/lib/chart/calendar-rows.ts";
import { calendarLayers } from "../src/lib/i18n/catalog/calendar-layers.ts";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";
import { calendarLayerWords } from "../src/lib/i18n/catalog/calendar-layer-words.ts";

const KEY = "ulune.calendar.v1";

/** A browser's storage, in memory. */
function memory(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    data,
  };
}

test("the layers come by language, astrology first, each with its words in English and French", () => {
  assert.deepEqual(
    CALENDAR_LAYERS.map((l) => `${l.language}/${l.id}`),
    ["astrology/sky", "astrology/transits", "numerology/numerology"],
  );
  assert.deepEqual(
    layerGroups().map((g) => [g.language, g.layers.map((l) => l.id)]),
    [
      ["astrology", ["sky", "transits"]],
      ["numerology", ["numerology"]],
    ],
  );
  for (const l of CALENDAR_LAYERS) {
    for (const key of [l.label, l.hint, LAYER_LANGUAGE_LABEL[l.language]]) {
      // The layers’ words live outside the index (catalog/calendar-layer-words.ts): they stay out of the first download.
      const pair = CATALOG[key] ?? calendarLayerWords[key];
      assert.ok(pair, `${l.id}: no words for ${key}`);
      assert.ok(pair[0].trim() && pair[1].trim(), key);
    }
  }
  // The Calendar's words in French: typographic apostrophes, a narrow no-break space before : ; ! ?
  for (const [key, [en, fr]] of Object.entries({ ...calendarLayers, ...calendarLayerWords })) {
    assert.ok(en.trim() && fr.trim(), key);
    assert.ok(!/\w'\w/.test(`${en} ${fr}`), `${key}: a straight apostrophe`);
    assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(fr), `${key}: French punctuation without its narrow space: "${fr}"`);
  }
  // Each kind of row in the events table belongs to one layer.
  assert.equal(layerOfRow("sky")?.id, "sky");
  assert.equal(layerOfRow("you")?.id, "transits");
  assert.equal(layerOfRow("num")?.id, "numerology");
});

test("the sky and your transits are on until switched, numerology waits to be asked for", () => {
  assert.deepEqual(layersOn(), { sky: true, transits: true, numerology: false });
  assert.deepEqual(layersOn({ numerology: true, sky: false }), { sky: false, transits: true, numerology: true });
  for (const l of CALENDAR_LAYERS) assert.equal(l.needsChart, l.id !== "sky", `${l.id} needs a chart`);
});

test("without a chart the Calendar is the sky alone, and the reader's switches wait for one", () => {
  const choices = { numerology: true };
  assert.deepEqual(shownLayers(choices, false), { sky: true, transits: false, numerology: false });
  assert.deepEqual(shownLayers(choices, true), { sky: true, transits: true, numerology: true });
  assert.deepEqual(shownLayers({ sky: false, transits: false }, true), { sky: false, transits: false, numerology: false });
  const [sky, transits, numerology] = CALENDAR_LAYERS;
  assert.equal(layerAvailable(sky, false), true);
  assert.equal(layerAvailable(transits, false), false);
  assert.equal(layerAvailable(numerology, false), false);
  assert.equal(layerAvailable(numerology, true), true);
  assert.equal(anyPersonalShown(shownLayers({}, false)), false);
  assert.equal(anyPersonalShown(shownLayers({}, true)), true);
  assert.equal(anyPersonalShown(shownLayers({ transits: false }, true)), false);
  assert.equal(anyPersonalShown(shownLayers({ transits: false, numerology: true }, true)), true);
});

test("the switches are kept on this device only, read with care", () => {
  // A first visit: nothing kept, the defaults.
  const store = memory();
  assert.deepEqual(loadCalendarPrefs(store), CALENDAR_DEFAULTS);
  assert.deepEqual(layersOn(loadCalendarPrefs(store).layers), { sky: true, transits: true, numerology: false });
  // Switched, kept, read back; the clock kept beside them.
  saveCalendarPrefs({ zone: "utc", layers: { numerology: true, transits: false } }, store);
  assert.deepEqual(JSON.parse(store.data.get(KEY)), { zone: "utc", layers: { numerology: true, transits: false } });
  const back = loadCalendarPrefs(store);
  assert.equal(back.zone, "utc");
  assert.deepEqual(layersOn(back.layers), { sky: true, transits: false, numerology: true });
  // A layer that no longer exists, or a value that is not a yes or no, is dropped.
  assert.deepEqual(cleanChoices({ sky: false, almanac: true, numerology: "yes" }), { sky: false });
  assert.deepEqual(cleanChoices(null), {});
  assert.deepEqual(parseCalendarPrefs({ zone: "mars", layers: [true] }), { zone: "device", layers: {} });
  // Broken storage never throws: the defaults.
  assert.deepEqual(loadCalendarPrefs(memory({ [KEY]: "{nope" })), CALENDAR_DEFAULTS);
  const blocked = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("SecurityError"); } };
  assert.deepEqual(loadCalendarPrefs(blocked), CALENDAR_DEFAULTS);
  assert.doesNotThrow(() => saveCalendarPrefs({ zone: "device", layers: { sky: false } }, blocked));
});

test("the two switches of Ulune 1.x are read as the layers of the same name", () => {
  // 1.x kept { zone, sky, yours }: "For you" off hid your transits (and numerology with them).
  const old = parseCalendarPrefs({ zone: "birth", sky: false, yours: false });
  assert.equal(old.zone, "birth");
  assert.deepEqual(layersOn(old.layers), { sky: false, transits: false, numerology: false });
  assert.deepEqual(layersOn(parseCalendarPrefs({ zone: "device", sky: true, yours: true }).layers), layersOn());
  // Once the layers are kept, the old switches are history.
  assert.deepEqual(parseCalendarPrefs({ zone: "device", sky: false, layers: { numerology: true } }).layers, { numerology: true });
});

/* The filtering of events by layer: the events table and the calendar file. */

const T0 = Date.UTC(2026, 9, 1);
const H = 3_600_000;
const EVENTS = [
  { k: "phase", t: T0 + 10 * H, phase: 2, lon: 8 },
  { k: "ingress", t: T0 + 30 * H, body: "mars", sign: 4 },
  { k: "ingress", t: T0 + 40 * H, body: "moon", sign: 5 },
];
const HITS = [
  { id: "saturn-square-sun-1", moving: "saturn", natal: "sun", type: "square", exactUtc: new Date(T0 + 20 * H).toISOString() },
  { id: "moon-trine-venus-1", moving: "moon", natal: "venus", type: "trine", exactUtc: new Date(T0 + 50 * H).toISOString() },
];
const NUM = [{ kind: "num", t: T0 + 5 * H, id: "numcycle:pinnacle:3", change: { kind: "pinnacle", index: 3, day: "2026-10-01" } }];
const kinds = (rows) => rows.map((r) => `${r.kind}:${r.id}`);

test("each layer lets its own rows through, and only the layers shown", () => {
  const all = calendarRows(EVENTS, HITS, T0, T0 + 3 * 24 * H, { layers: { sky: true, transits: true, numerology: true }, moon: true }, NUM);
  assert.deepEqual(kinds(all), [
    "num:numcycle:pinnacle:3",
    `sky:sky:phase-2-${T0 + 10 * H}`,
    "you:timing:saturn-square-sun-1",
    `sky:sky:ingress-mars-4-${T0 + 30 * H}`,
    `sky:sky:ingress-moon-5-${T0 + 40 * H}`,
    "you:timing:moon-trine-venus-1",
  ]);
  const by = (layers, moon = true) => calendarRows(EVENTS, HITS, T0, T0 + 3 * 24 * H, { layers, moon }, NUM).map((r) => r.kind);
  // The defaults: the sky and your transits, no numerology.
  assert.deepEqual(by(layersOn()), ["sky", "you", "sky", "sky", "you"]);
  // The sky alone (no chart): no transits, no numerology, whatever was switched.
  assert.deepEqual(by(shownLayers({ numerology: true }, false)), ["sky", "sky", "sky"]);
  // Numerology on, the sky off.
  assert.deepEqual(by({ transits: true, numerology: true }), ["num", "you", "you"]);
  // A layer left out is off.
  assert.deepEqual(by({}), []);
  // The Moon's own events and transits wait for the day.
  assert.deepEqual(by(layersOn(), false), ["sky", "you", "sky"]);
  assert.equal(rowShown("num", { numerology: true }), true);
  assert.equal(rowShown("num", { transits: true }), false);
});

test("the table's for-whom filter chooses among the layers shown", () => {
  const shown = shownLayers({ numerology: true }, true);
  assert.deepEqual(layersForWhom(shown, "all"), shown);
  assert.deepEqual(layersForWhom(shown, "sky"), { sky: true, transits: false, numerology: false });
  assert.deepEqual(layersForWhom(shown, "yours"), { sky: false, transits: true, numerology: true });
  // It never brings back a layer switched off.
  assert.deepEqual(layersForWhom(shownLayers({ transits: false }, true), "yours"), { sky: false, transits: false, numerology: false });
  const rows = calendarRows(EVENTS, HITS, T0, T0 + 3 * 24 * H, { layers: layersForWhom(shown, "yours"), moon: false }, NUM);
  assert.deepEqual(rows.map((r) => r.kind), ["num", "you"]);
});
