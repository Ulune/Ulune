/*
 * Feng Shui's Relationship lens as a table (review items FS5 and FS32): each
 * person's Kua for each count shown (the one the compass reads marked), the
 * eight directions with both people's mansions and what each is for the two
 * of them, and the practical lines for two. As text for Copy, and as CSV
 * with ids, each part a section of its own (its header's first cell names
 * it, so a part's Copy finds its table). Pure; tested in
 * scripts/chinese-fengshui-pair.test.mjs.
 */
import type { ChinesePrefs } from "./prefs";
import { chineseLabel } from "./prefs";
import { cnWord } from "./words";
import { DIRECTION_IDS, MANSIONS, directionById } from "./fengshui";
import { countLabel, groupLabel } from "./fengshui-reading";
import { pairDirection, type PairPerson } from "./fengshui-pair";
import { groupsLine, kindLabel, pairPracticeLines, practiceHead, type FsPairContext } from "./fengshui-pair-reading";

type Shown = Pick<ChinesePrefs, "script" | "show">;
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const PEOPLE: readonly PairPerson[] = ["a", "b"];

export function fsPairTextParts(c: FsPairContext, locale: string, prefs: Shown): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const { pair: p, names, lists } = c;
  const kind = (supportive: boolean) => cnWord(locale, supportive ? "fsSupportive" : "fsChallenging").toLowerCase();
  return [
    {
      id: "kua",
      lines: [
        `${names.a} · ${names.b} · ${cnWord(locale, "fspPartKua")}`,
        ...PEOPLE.flatMap((who) => {
          const list = lists[who];
          const both = list.length > 1;
          return list.map((fs) => {
            const count = both ? ` · ${countLabel(fs.count, locale)}` : "";
            const marked = both && fs.count === p[who].count ? ` (${cnWord(locale, "fspOnCompass")})` : "";
            return `${names[who]}${count}${colon}${cnWord(locale, "fsKuaN", { n: fs.kua })} · ${fs.trigram.symbol} ${chineseLabel(fs.trigram, locale, prefs).text} · ${groupLabel(fs, locale)}${marked}`;
          });
        }),
        groupsLine(p, names, locale),
      ],
    },
    {
      id: "dirs",
      lines: [
        cnWord(locale, "fspPartDirs"),
        ...DIRECTION_IDS.map((d) => {
          const x = pairDirection(p, d);
          const side = (who: PairPerson) => `${names[who]} ${chineseLabel(MANSIONS[x[who].mansion], locale, prefs).text} (${kind(x[who].supportive)})`;
          return `${chineseLabel(directionById(d), locale, prefs).text}${colon}${side("a")} · ${side("b")} · ${kindLabel(x, names, locale)}`;
        }),
      ],
    },
    {
      id: "practice",
      lines: [cnWord(locale, "fspPracticeHead"), ...pairPracticeLines(c, locale).map((l) => `${practiceHead(l.id, locale)}${colon}${l.text}`)],
    },
  ];
}

export function fsPairTableCsv(c: FsPairContext): string {
  const { pair: p, lists } = c;
  const rows: string[][] = [["kua", "person", "count", "kua", "trigram", "group", "compass", "uncertain"]];
  for (const who of PEOPLE) {
    for (const fs of lists[who]) rows.push(["kua", who, fs.count, String(fs.kua), fs.trigram.id, fs.group, fs.count === p[who].count ? "1" : "0", fs.uncertain ? "1" : "0"]);
  }
  rows.push([]);
  rows.push(["dir", "direction", "a", "a_kind", "b", "b_kind", "two", "supports"]);
  const kind = (supportive: boolean) => (supportive ? "supportive" : "challenging");
  for (const x of p.directions) rows.push(["dir", x.direction, x.a.mansion, kind(x.a.supportive), x.b.mansion, kind(x.b.supportive), x.kind, x.good ?? ""]);
  rows.push([]);
  rows.push(["practice", "line", "directions"]);
  rows.push(["practice", "desk", p.desk]);
  rows.push(["practice", "bed", p.bed]);
  rows.push(["practice", "rooms-a", p.sides.a.join("|")]);
  rows.push(["practice", "rooms-b", p.sides.b.join("|")]);
  rows.push(["practice", "store", DIRECTION_IDS.filter((d) => p.hard.includes(d)).join("|")]);
  if (c.home) rows.push(["practice", "home", c.home.home.facingDirection]);
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
