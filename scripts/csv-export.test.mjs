/**
 * The review of 3 Oct 2026, tables (B2, B3): CSV for spreadsheets (a BOM, and
 * ";" with decimal commas in French), one table per part with one header, the
 * aspects with the same columns in every table, and a real table for the
 * clipboard.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { formatChartTableCsv } from "../src/lib/chart/table-export.ts";
import { transitTableCsv } from "../src/lib/chart/cross-export.ts";
import { ASPECT_CSV_HEAD } from "../src/lib/chart/table-aspects.ts";
import { crossView, transitAspectRows } from "../src/lib/chart/cross-table.ts";
import { csvSections, encodeCsv, htmlTable, parseCsv, partRows } from "../src/lib/csv.ts";

const CAMILLE = { name: "Camille Marie Laurent", placeLabel: "Paris, France", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 };

test("CSV reads back what it wrote, quotes and line breaks included", () => {
  const rows = parseCsv('a,b,c\n"x, y","say ""hi""","two\nlines"\n\nd,e\n');
  assert.deepEqual(rows, [["a", "b", "c"], ["x, y", 'say "hi"', "two\nlines"], [], ["d", "e"]]);
  assert.deepEqual(csvSections(rows).map((s) => s.kind), ["a", "d"]);
});

test("a spreadsheet file: a BOM, and in French ';' and decimal commas", () => {
  const rows = [["id", "orb", "date", "name"], ["sun", "12.5000", "1990-06-15", "Paris; France"]];
  const en = encodeCsv(rows, "en");
  assert.ok(en.startsWith("﻿"));
  assert.equal(en, "﻿id,orb,date,name\r\nsun,12.5000,1990-06-15,Paris; France\r\n");
  const fr = encodeCsv(rows, "fr");
  assert.equal(fr, '﻿id;orb;date;name\r\nsun;12,5000;1990-06-15;"Paris; France"\r\n');
});

test("a part's CSV is one table with one header, as filtered on screen", async () => {
  const chart = await calculateNatal(CAMILLE);
  const csv = formatChartTableCsv(chart, "en");
  const points = partRows(csv, ["point"]);
  assert.equal(points[0][0], "id");
  assert.ok(points.every((r) => r.length === points[0].length));
  assert.equal(points.filter((r) => !r.length).length, 0);
  const aspects = partRows(csv, ["aspect"], (r) => r.type === "trine");
  assert.deepEqual(aspects[0], ASPECT_CSV_HEAD.slice(1));
  assert.ok(aspects.length > 1 && aspects.slice(1).every((r) => r[1] === "trine"));
});

test("the aspects have the same columns in the chart's and the transits' CSV", async () => {
  const chart = await calculateNatal(CAMILLE);
  const sky = await calculateTransits({
    utc: new Date("2026-10-04T12:00:00Z"),
    latitude: chart.meta.latitude,
    longitude: chart.meta.longitude,
    natalCusps: chart.houses.map((h) => h.ecliptic),
    natalBodies: [...chart.planets, ...Object.values(chart.angles)].map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    houseSystem: chart.meta.houseSystem,
  });
  const natalHead = csvSections(parseCsv(formatChartTableCsv(chart, "en"))).find((s) => s.kind === "aspect").rows[0];
  assert.deepEqual(natalHead, [...ASPECT_CSV_HEAD]);
  {
    const transitHead = csvSections(parseCsv(transitTableCsv(sky, chart, "en"))).find((s) => s.kind === "aspect").rows[0];
    assert.deepEqual(transitHead, [...ASPECT_CSV_HEAD]);
    // The table's own sort and filters.
    const rows = transitAspectRows(sky, chart);
    const tight = crossView(rows, { sort: "orb", orbMax: 1, minors: true });
    assert.ok(tight.every((r) => r.orb <= 1));
    const byB = crossView(rows, { sort: "b", orbMax: null, minors: true });
    assert.equal(byB.length, rows.length);
  }
});

test("the clipboard's table: a header and its rows, escaped", () => {
  const html = htmlTable([["a", "b"], ["<x>", "y & z"]], "Aspects");
  assert.equal(html, "<table><caption>Aspects</caption><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>&lt;x&gt;</td><td>y &amp; z</td></tr></tbody></table>");
});

test("the full midpoint list: every pair, in zodiac order, one body's on asking (B7)", async () => {
  const { midpointList, midpointRows, MIDPOINT_LIST_BODIES } = await import("../src/lib/chart/table-stars.ts");
  const chart = await calculateNatal(CAMILLE);
  const all = midpointList(chart);
  const n = MIDPOINT_LIST_BODIES.length;
  assert.equal(all.length, (n * (n - 1)) / 2);
  for (let i = 1; i < all.length; i += 1) assert.ok(all[i].ecliptic >= all[i - 1].ecliptic);
  const sun = midpointList(chart, "sun");
  assert.equal(sun.length, n - 1);
  assert.ok(sun.every((r) => r.a === "sun" || r.b === "sun"));
  // The chart's five are the same rows in the full list.
  for (const r of midpointRows(chart)) {
    const same = all.find((x) => x.id === r.id);
    assert.ok(same, r.id);
    assert.ok(Math.abs(same.ecliptic - r.ecliptic) < 1e-9, r.id);
    assert.deepEqual(same.contacts.map((c) => c.body), r.contacts.map((c) => c.body));
  }
});
