/*
 * Feng Shui's Cycles as a table (share and compare plan, feature 5d): the
 * year and the month on the dial with the year's afflictions; the eight
 * directions with their stars, what falls there and, for each count shown,
 * your mansion and what the year makes of it; and the year in practice. As
 * text for Copy, and as CSV with ids, the same in every language.
 */
import type { ChinesePrefs } from "./prefs";
import { chineseLabel } from "./prefs";
import { cnWord } from "./words";
import { fscWord } from "./fsc-words";
import { DIRECTION_IDS, MANSIONS, directionById, trigramOfDirection } from "./fengshui";
import { countLabel } from "./fengshui-reading";
import { afflictionName, afflictionPlace, yearLine } from "./fengshui-years-reading";
import { CYCLE_AFFLICTIONS, personDirection } from "./fengshui-cycles";
import { low, monthFiveLine, monthLine, practiceLines, starName, stateWord, type CyclesContext } from "./fengshui-cycles-reading";
import { semicolon } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function cyclesTextParts(ctx: CyclesContext, name: string, locale: string, prefs: Shown): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const both = ctx.people.length > 1;
  const { y } = ctx;
  const parts = [
    {
      id: "year",
      lines: [
        [name, fscWord(locale, "fscPartYear")].filter(Boolean).join(" · "),
        yearLine(y, locale),
        `${monthLine(y, locale, ctx.timeZone)} ${monthFiveLine(y, locale)}`,
        ...CYCLE_AFFLICTIONS.map((id) => `${afflictionName(id, locale, prefs)}${colon}${afflictionPlace(y, id, locale, prefs)}`),
      ],
    },
    {
      id: "dirs",
      lines: [
        cnWord(locale, "fsPartDirs"),
        ...DIRECTION_IDS.map((d) => {
          const x = ctx.dirs.find((r) => r.direction === d)!;
          const tri = trigramOfDirection(d);
          const stars = `${cnWord(locale, "fsyYearStar")} ${starName(x.year, locale)}, ${cnWord(locale, "fsyMonthStar").toLowerCase()} ${starName(x.month, locale)}`;
          const marks = [...x.afflictions.map((id) => low(afflictionName(id, locale, prefs))), ...(x.monthFive ? [fscWord(locale, "fscMonthFiveMark")] : [])];
          const per = ctx.people.map((p) => {
            const own = personDirection(p, d);
            const kind = cnWord(locale, own.supportive ? "fsSupportive" : "fsChallenging").toLowerCase();
            return `${both ? `${countLabel(p.fs.count, locale)} ` : ""}${chineseLabel(MANSIONS[own.mansion], locale, prefs).text} (${kind}), ${stateWord(own.state, locale)}`;
          });
          return [
            `${chineseLabel(directionById(d), locale, prefs).text} · ${tri.symbol} ${chineseLabel(tri, locale, { ...prefs, show: "names" }).name}${colon}${stars}`,
            ...(marks.length ? [marks.join(", ")] : []),
            ...per,
          ].join(semicolon(locale));
        }),
      ],
    },
  ];
  if (ctx.people.length) {
    parts.push({
      id: "you",
      lines: [fscWord(locale, "fscPartYou"), ...ctx.people.flatMap((p) => practiceLines(p, locale).map((l) => `${both ? `${countLabel(p.fs.count, locale)}${colon}` : ""}${l}`))],
    });
  }
  return parts;
}

export function cyclesTableCsv(ctx: CyclesContext): string {
  const { y } = ctx;
  const a = y.afflictions;
  const rows: string[][] = [["year", "field", "value"]];
  rows.push(["year", "solarYear", String(y.solarYear)]);
  rows.push(["year", "star", String(y.year)]);
  rows.push(["year", "monthIndex", String(y.monthIndex)]);
  rows.push(["year", "monthStar", String(y.month)]);
  rows.push(["year", "monthFrom", isoDay(y.monthFrom)]);
  rows.push(["year", "monthTo", isoDay(y.monthTo)]);
  rows.push([]);
  rows.push(["aff", "id", "place"]);
  rows.push(["aff", "five-yellow", a.fiveYellow]);
  rows.push(["aff", "tai-sui", a.taiSui]);
  rows.push(["aff", "year-breaker", a.yearBreaker]);
  rows.push(["aff", "three-killings", a.threeKillings.direction]);
  rows.push(["aff", "month-five-yellow", a.monthFiveYellow]);
  rows.push([]);
  rows.push(["dir", "direction", "yearStar", "monthStar", "afflictions", "monthFive"]);
  for (const x of ctx.dirs) rows.push(["dir", x.direction, String(x.year), String(x.month), x.afflictions.join("|"), x.monthFive ? "1" : "0"]);
  if (ctx.people.length) {
    rows.push([]);
    rows.push(["you", "count", "direction", "mansion", "supportive", "state"]);
    for (const p of ctx.people) for (const x of p.directions) rows.push(["you", p.fs.count, x.direction, x.mansion, x.supportive ? "1" : "0", x.state]);
    rows.push([]);
    rows.push(["best", "count", "kua", "direction", "resting"]);
    for (const p of ctx.people) rows.push(["best", p.fs.count, String(p.fs.kua), p.best ?? "", p.resting.join("|")]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}

