/*
 * BaZi's Cycles as a table (languages plan, part 16): the luck pillars, for
 * each count given, with their ages, years, pillars, gods and what they
 * meet; the year shown and its twelve months. As text for Copy and as CSV in
 * the tables' common shape (a section column, ids rather than words).
 */
import { SIXTY } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { tenGodById } from "./bazi";
import type { FlowYear, Luck, Meeting } from "./bazi-luck";
import { ageWords, countWord, dateIn, meetingShort } from "./bazi-luck-reading";
import { semicolon } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const meetsText = (list: Meeting[], locale: string, prefs: Shown) => (list.length ? list.map((m) => meetingShort(m, locale, prefs)).join(semicolon(locale)) : "–");
const meetsIds = (list: Meeting[]) => list.map((m) => `${m.kind}:${m.with.join("+")}${m.phase ? `:${m.phase}` : ""}`).join("|");

export function luckTextParts(lucks: Luck[], y: FlowYear, locale: string, prefs: Shown, name = "", tz?: string): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const god = (id: Parameters<typeof tenGodById>[0]) => chineseLabel(tenGodById(id), locale, prefs).text;
  const luckLines = lucks.flatMap((l) => [
    `${countWord(l.count, locale)} · ${cnWord(locale, l.direction === "forward" ? "bzlForward" : "bzlBackward")} · ${cnWord(locale, "bzlFrom", { age: ageWords(l.start, locale), date: dateIn(l.startMs, locale, tz) })}`,
    ...l.pillars.map(
      (p) =>
        `${cnWord(locale, "bzlAges", { from: Math.floor(p.fromAge), to: Math.floor(p.toAge) })} · ${new Date(p.fromMs).getUTCFullYear()}${colon}${chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text} · ${god(p.god)} · ${god(p.branchGod)} · ${meetsText(p.meets, locale, prefs)}`,
    ),
  ]);
  const yearLine = `${cnWord(locale, "bzlYearHead", { year: y.year })}${colon}${chineseLabel(SIXTY[y.pillar.cycle]!, locale, prefs).text} · ${god(y.god)} · ${meetsText(y.meets, locale, prefs)}`;
  const monthLines = y.months.map(
    (m) => `${dateIn(m.fromMs, locale, tz, { day: "numeric", month: "short" })}${colon}${chineseLabel(SIXTY[m.pillar.cycle]!, locale, prefs).text} · ${god(m.god)} · ${meetsText(m.meets, locale, prefs)}`,
  );
  return [
    { id: "luck", lines: [`${name ? `${name} · ` : ""}${cnWord(locale, "bzlPartLuck")}`, ...luckLines] },
    { id: "year", lines: [cnWord(locale, "bzlPartYear"), yearLine, ...monthLines] },
  ];
}

export function luckTableCsv(lucks: Luck[], y: FlowYear): string {
  const rows: string[][] = [["section", "field", "value"]];
  for (const l of lucks) {
    rows.push(["luckStart", l.count, l.direction, l.startAge.toFixed(3), new Date(l.startMs).toISOString().slice(0, 10), new Date(l.jieMs).toISOString(), l.days.toFixed(3)]);
  }
  rows.push([]);
  rows.push(["luck", "count", "index", "fromAge", "toAge", "fromYear", "pillar", "hanzi", "god", "branchGod", "meets"]);
  for (const l of lucks) {
    for (const p of l.pillars) {
      const pair = SIXTY[p.pillar.cycle]!;
      rows.push(["luck", l.count, String(p.index), p.fromAge.toFixed(2), p.toAge.toFixed(2), String(new Date(p.fromMs).getUTCFullYear()), pair.id, pair.hant, p.god, p.branchGod, meetsIds(p.meets)]);
    }
  }
  rows.push([]);
  rows.push(["flow", "kind", "index", "from", "pillar", "hanzi", "god", "branchGod", "meets"]);
  const pair = SIXTY[y.pillar.cycle]!;
  rows.push(["flow", "year", String(y.year), new Date(y.fromMs).toISOString(), pair.id, pair.hant, y.god, y.branchGod, meetsIds(y.meets)]);
  for (const m of y.months) {
    const mp = SIXTY[m.pillar.cycle]!;
    rows.push(["flow", "month", String(m.index), new Date(m.fromMs).toISOString(), mp.id, mp.hant, m.god, m.branchGod, meetsIds(m.meets)]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
