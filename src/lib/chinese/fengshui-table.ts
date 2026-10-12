/*
 * Feng Shui's personal page as a table (languages plan, part 21): for each
 * count shown, the Kua with its trigram, group and working; the eight
 * directions with their trigram and mansion; the practical lines. As text
 * for Copy, and as CSV with ids.
 */
import type { ChinesePrefs } from "./prefs";
import { chineseLabel } from "./prefs";
import { cnWord } from "./words";
import { DIRECTION_IDS, MANSIONS, directionById, trigramOfDirection, type FengShui } from "./fengshui";
import { countLabel, groupLabel, kuaLine, kuaSteps, practiceLines } from "./fengshui-reading";

type Shown = Pick<ChinesePrefs, "script" | "show">;
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

export function fengShuiTextParts(list: readonly FengShui[], name: string, locale: string, prefs: Shown): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const both = list.length > 1;
  const tag = (fs: FengShui) => (both ? `${countLabel(fs.count, locale)}${colon}` : "");
  return [
    {
      id: "kua",
      lines: [
        [name, cnWord(locale, "fsKuaHead")].filter(Boolean).join(" · "),
        ...list.flatMap((fs) => [
          `${tag(fs)}${kuaLine(fs, locale, prefs)} ${groupLabel(fs, locale)}.`,
          ...kuaSteps(fs, locale).map((l) => `  ${l}`),
        ]),
      ],
    },
    {
      id: "dirs",
      lines: [
        cnWord(locale, "fsPartDirs"),
        ...DIRECTION_IDS.map((d) => {
          const tri = trigramOfDirection(d);
          const per = list.map((fs) => {
            const row = fs.directions.find((x) => x.direction === d)!;
            const m = chineseLabel(MANSIONS[row.mansion], locale, prefs).text;
            const kind = cnWord(locale, row.supportive ? "fsSupportive" : "fsChallenging").toLowerCase();
            return `${both ? `${countLabel(fs.count, locale)} ` : ""}${m} (${kind})`;
          });
          return `${chineseLabel(directionById(d), locale, prefs).text} · ${tri.symbol} ${chineseLabel(tri, locale, { ...prefs, show: "names" }).name}${colon}${per.join(" · ")}`;
        }),
      ],
    },
    {
      id: "practice",
      lines: [cnWord(locale, "fsPracticeHead"), ...list.flatMap((fs) => practiceLines(fs, locale).map((l) => `${tag(fs)}${l.text}`))],
    },
  ];
}

export function fengShuiTableCsv(list: readonly FengShui[]): string {
  const rows: string[][] = [["section", "count", "field", "value"]];
  for (const fs of list) {
    rows.push(["kua", fs.count, "solarYear", String(fs.solarYear)]);
    rows.push(["kua", fs.count, "kua", String(fs.kua)]);
    rows.push(["kua", fs.count, "trigram", fs.trigram.id]);
    rows.push(["kua", fs.count, "group", fs.group]);
    rows.push(["kua", fs.count, "digits", String(fs.steps.root)]);
    rows.push(["kua", fs.count, "sum", String(fs.steps.raw)]);
    rows.push(["kua", fs.count, "five", fs.steps.five ? "1" : "0"]);
    rows.push(["kua", fs.count, "uncertain", fs.uncertain ? "1" : "0"]);
  }
  rows.push([]);
  rows.push(["dir", "count", "direction", "mansion"]);
  for (const fs of list) {
    for (const r of fs.directions) rows.push(["dir", fs.count, r.direction, `${r.mansion}:${r.rank + 1}:${r.supportive ? "supportive" : "challenging"}`]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
