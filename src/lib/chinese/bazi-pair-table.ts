/*
 * BaZi's Pair as a table (languages plan, part 19): the Day Masters, the
 * partner palaces and what each brings the other; each pillar of the second
 * chart and what it meets in the first. As text for Copy and CSV ids.
 */
import { BRANCHES, SIXTY, STEMS } from "./names";
import type { ChinesePrefs } from "./prefs";
import { chineseLabel } from "./prefs";
import { cnWord } from "./words";
import type { BaziChart } from "./bazi";
import { PILLAR_WORD } from "./bazi-reading";
import type { BaziPair } from "./bazi-pair";
import { dmLine, giftLines, meetRowLine, palaceLine, type PairNames } from "./bazi-pair-reading";

type Shown = Pick<ChinesePrefs, "script" | "show">;
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

export function pairTextParts(p: BaziPair, b: BaziChart, names: PairNames, locale: string, prefs: Shown): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? " : " : ": ";
  return [
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
        ...b.pillars.map((q) => `${cnWord(locale, "bzpMeetFrom", { b: names.b, pillar: cnWord(locale, PILLAR_WORD[q.id]).toLowerCase() })} (${chineseLabel(SIXTY[q.pillar.cycle]!, locale, prefs).text})${colon}${meetRowLine(p, q.id, names, locale, prefs)}`),
      ],
    },
  ];
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
  rows.push(["palace", "a", BRANCHES[p.palace.a]!.id]);
  rows.push(["palace", "b", BRANCHES[p.palace.b]!.id]);
  rows.push(["palace", "kinds", p.palace.same ? "same" : p.palace.kinds.join("|")]);
  for (const g of p.gifts.toA) rows.push(["gift", "toA", `${g.phase}:${g.why}:${g.share.toFixed(3)}`]);
  for (const g of p.gifts.toB) rows.push(["gift", "toB", `${g.phase}:${g.why}:${g.share.toFixed(3)}`]);
  rows.push([]);
  rows.push(["meet", "from", "meets"]);
  for (const m of p.meetings) rows.push(["meet", m.from, m.meets.map((x) => `${x.kind}:${x.with.join("+")}${x.phase ? `:${x.phase}` : ""}`).join("|")]);
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
