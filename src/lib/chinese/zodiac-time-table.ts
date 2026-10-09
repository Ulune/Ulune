/*
 * The tables of Chinese astrology's Cycles and Pair pages (languages plan,
 * part 11), as plain text for Copy and as CSV in the tables' common shape
 * (a section column, ids rather than words): the year's twelve months with
 * how each of the reader's animals meets them, and two people's animals
 * place by place.
 */
import { BRANCHES, SIXTY } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { PLACE_WORD } from "./zodiac-reading";
import { meetLine } from "./zodiac-time-reading";
import type { PairMeeting, YearAhead } from "./zodiac-time";

type Shown = Pick<ChinesePrefs, "script" | "show">;

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const iso = (ms: number) => new Date(ms).toISOString();

/** The year ahead as CSV: the year, then one row per month, then one row per (month, place) meeting. */
export function yearsTableCsv(y: YearAhead): string {
  const rows: string[][] = [["section", "field", "value"]];
  rows.push(["year", "year", String(y.year)]);
  rows.push(["year", "pillar", SIXTY[y.pillar.cycle]!.id]);
  rows.push(["year", "animal", BRANCHES[y.pillar.branch]!.en.toLowerCase()]);
  rows.push(["year", "fromUtc", iso(y.fromMs)]);
  rows.push(["year", "toUtc", iso(y.toMs)]);
  for (const m of y.yours) rows.push(["year", `yours.${m.place}`, m.kinds.join("|")]);
  rows.push([]);
  rows.push(["month", "index", "fromUtc", "toUtc", "pillar", "hanzi", "animal", "year", "month", "day", "hour"]);
  for (const m of y.months) {
    const pair = SIXTY[m.pillar.cycle]!;
    const by = (id: string) => m.yours.find((p) => p.place === id)?.kinds.join("|") ?? "";
    rows.push(["month", String(m.index), iso(m.fromMs), iso(m.toMs), pair.id, pair.hant, BRANCHES[m.pillar.branch]!.en.toLowerCase(), by("year"), by("month"), by("day"), by("hour")]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}

/** The year ahead as text, for Copy. */
export function yearsTextLines(y: YearAhead, locale: string, prefs: Shown, name: string, day: (ms: number) => string): string[] {
  const colon = locale === "fr" ? " : " : ": ";
  const lines = [`${name ? `${name} · ` : ""}${y.year} · ${chineseLabel(SIXTY[y.pillar.cycle]!, locale, prefs).text} · ${day(y.fromMs)} – ${day(y.toMs)}`];
  for (const m of y.yours) lines.push(`${cnWord(locale, PLACE_WORD[m.place])}${colon}${meetLine(m.kinds, locale, prefs, true)}`);
  lines.push("");
  for (const m of y.months) {
    const mine = m.yours.find((p) => p.place === "year")!;
    lines.push(`${day(m.fromMs)} – ${day(m.toMs)} · ${chineseLabel(SIXTY[m.pillar.cycle]!, locale, prefs).text}${colon}${meetLine(mine.kinds, locale, prefs, true)}`);
  }
  return lines;
}

/** Two people's animals as CSV: one row per meeting of a place of A's with a place of B's. */
export function pairTableCsv(meetings: readonly PairMeeting[]): string {
  const rows: string[][] = [["meeting", "placeA", "placeB", "animalA", "animalB", "kinds"]];
  for (const m of meetings) rows.push(["meeting", m.a, m.b, BRANCHES[m.branchA]!.en.toLowerCase(), BRANCHES[m.branchB]!.en.toLowerCase(), m.kinds.join("|")]);
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
