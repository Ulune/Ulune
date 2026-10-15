/*
 * BaZi's Pair as a table (languages plan, part 19): the Day Masters, the
 * partner palaces and what each brings the other; each pillar of the second
 * chart and what it meets in the first. Part 20 adds the luck pillars of the
 * moment (the review's BZ9), and gives the palaces and the gifts tables of
 * their own in the CSV, so each part's own CSV holds its rows. As text for
 * Copy and as CSV with ids.
 */
import { BRANCHES, SIXTY, STEMS } from "./names";
import type { ChinesePrefs } from "./prefs";
import { chineseLabel } from "./prefs";
import { cnWord } from "./words";
import type { BaziChart } from "./bazi";
import type { Meeting } from "./bazi-luck";
import type { BaziPair } from "./bazi-pair";
import { dmLine, giftLines, luckLines, meetFromLabel, meetRowLine, palaceLine, type PairNames } from "./bazi-pair-reading";

type Shown = Pick<ChinesePrefs, "script" | "show">;
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const meetsIds = (list: readonly Meeting[]) => list.map((m) => `${m.kind}:${m.with.join("+")}${m.phase ? `:${m.phase}` : ""}`).join("|");

export function pairTextParts(p: BaziPair, b: BaziChart, names: PairNames, locale: string, prefs: Shown): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const parts = [
    {
      id: "main",
      lines: [
        `${names.a} · ${names.b} · ${cnWord(locale, "bzpPartMain")}`,
        `${cnWord(locale, "bzpDmHead")}${colon}${dmLine(p, names, locale, prefs)}`,
        `${cnWord(locale, "bzpPalaceHead")}${colon}${palaceLine(p, names, locale, prefs)}`,
        ...giftLines(p, names, locale).map((l) => `${cnWord(locale, "bzpPhasesHead")}${colon}${l}`),
      ],
    },
    {
      id: "meets",
      lines: [
        cnWord(locale, "bzpPartMeets"),
        ...b.pillars.map((q) => `${meetFromLabel(names, q.id, locale)} (${chineseLabel(SIXTY[q.pillar.cycle]!, locale, prefs).text})${colon}${meetRowLine(p, q.id, names, locale, prefs)}`),
      ],
    },
  ];
  if (p.luck) parts.push({ id: "luck", lines: [cnWord(locale, "bzpLuckHead"), ...luckLines(p, names, locale, prefs).map((l) => l.text)] });
  return parts;
}

export function pairTableCsv(p: BaziPair): string {
  const rows: string[][] = [["section", "field", "value"]];
  rows.push(["dm", "a", STEMS[p.dm.a]!.id]);
  rows.push(["dm", "b", STEMS[p.dm.b]!.id]);
  rows.push(["dm", "godAB", p.dm.godAB]);
  rows.push(["dm", "godBA", p.dm.godBA]);
  rows.push(["dm", "family", p.dm.family]);
  rows.push(["dm", "combination", p.dm.combination ?? ""]);
  rows.push(["dm", "clash", p.dm.clash ? "1" : "0"]);
  rows.push([]);
  rows.push(["palace", "field", "value"]);
  rows.push(["palace", "a", BRANCHES[p.palace.a]!.id]);
  rows.push(["palace", "b", BRANCHES[p.palace.b]!.id]);
  rows.push(["palace", "kinds", p.palace.same ? "same" : p.palace.kinds.join("|")]);
  rows.push([]);
  rows.push(["gift", "to", "value"]);
  for (const g of p.gifts.toA) rows.push(["gift", "toA", `${g.phase}:${g.why}:${g.share.toFixed(3)}`]);
  for (const g of p.gifts.toB) rows.push(["gift", "toB", `${g.phase}:${g.why}:${g.share.toFixed(3)}`]);
  rows.push([]);
  rows.push(["meet", "from", "meets"]);
  for (const m of p.meetings) rows.push(["meet", m.from, meetsIds(m.meets)]);
  if (p.luck) {
    const L = p.luck;
    rows.push([]);
    // Each person's luck pillar of the moment, by each count shown ("given" when the birth gives it); before the first, its start age alone.
    rows.push(["luck", "person", "count", "given", "index", "pillar", "hanzi", "fromAge", "toAge", "god", "godForOther"]);
    for (const who of ["a", "b"] as const) {
      for (const d of L[who]) {
        const given = d.given ? "1" : "0";
        if (!d.pillar) {
          const start = L.lucks[who].find((l) => l.count === d.count)!.startAge;
          rows.push(["luck", who, d.count, given, "", "", "", start.toFixed(2), "", "", ""]);
          continue;
        }
        const pair = SIXTY[d.pillar.pillar.cycle]!;
        rows.push(["luck", who, d.count, given, String(d.pillar.index), pair.id, pair.hant, d.pillar.fromAge.toFixed(2), d.pillar.toAge.toFixed(2), d.pillar.god, d.godForOther ?? ""]);
      }
    }
    rows.push([]);
    rows.push(["luckmeet", "a", "b", "same", "meets"]);
    for (const m of L.meets) rows.push(["luckmeet", m.a, m.b, m.same ? "1" : "0", meetsIds(m.meets)]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
