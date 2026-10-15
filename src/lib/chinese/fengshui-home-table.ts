/*
 * Feng Shui's home page as a table (languages plan, part 22): the facing
 * with its mountains, edge, house and period, the house beside each Kua
 * shown; the 24 mountains with their spans, your home's marked. As text for
 * Copy and as CSV with ids.
 */
import type { ChinesePrefs } from "./prefs";
import { chineseLabel } from "./prefs";
import { cnWord } from "./words";
import { MOUNTAINS, houseMatch, norm360 } from "./fengshui-home";
import { countLabel, directionName } from "./fengshui-reading";
import { FLIGHT } from "./fengshui-stars";
import { chartName, chartWord, formationName, pairName, palaceName, roomsChart } from "./fengshui-stars-reading";
import { pairKey } from "./fengshui-pairs";
import { roomFit, roomsIn } from "./fengshui-rooms";
import { listWords, roomLines, roomName } from "./fengshui-rooms-reading";
import { AFFLICTION_IDS, afflictionName, afflictionPlace, monthLine, yearLine } from "./fengshui-years-reading";
import { edgeLine, facingLine, fmtDecl, fmtDeg, houseLine, matchLines, mountainCode, periodLines, sourceLine, type HomeContext } from "./fengshui-home-reading";
import { deFr } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

export function homeTextParts(c: HomeContext, name: string, locale: string, prefs: Shown): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const facing: string[] = [[name, cnWord(locale, "fshFacingHead")].filter(Boolean).join(" · ")];
  if (c.home) {
    facing.push(facingLine(c.home, locale, prefs), edgeLine(c.home, locale, prefs), sourceLine(c.home, locale), houseLine(c.home, locale, prefs));
    for (const fs of c.people) facing.push(...matchLines(c.home, fs, locale).map((l) => (c.people.length > 1 ? `${countLabel(fs.count, locale)}${colon}${l}` : l)));
  } else facing.push(cnWord(locale, "fshNoFacing"));
  facing.push(...periodLines(c, locale));
  if (c.declination != null) facing.push(cnWord(locale, "fshDecl", { place: c.place, dePlace: deFr(c.place), deg: fmtDecl(c.declination, locale) }));
  const stars: string[] = [cnWord(locale, "fssHead")];
  if (c.stars) {
    for (const [v, chart] of [["main", c.stars.main], ["ti", c.stars.ti]] as const) {
      if (!chart) continue;
      stars.push(`${c.stars.ti ? `${cnWord(locale, v === "ti" ? "fssTi" : "fssMain")}${colon}` : ""}${chartName(chart, locale, prefs)}`);
      stars.push(`${cnWord(locale, "fssFormationsHead")}${colon}${chart.formations.length ? chart.formations.map((f) => formationName(f, locale, prefs)).join(", ") : cnWord(locale, "fssNoFormation")}`);
      for (const p of FLIGHT) {
        const x = chart.palaces[p];
        const pair = c.stars.texts ? ` · ${pairName(x.mountain, x.water, c.stars.texts, locale, prefs)}` : "";
        stars.push(`  ${palaceName(p, locale)}${colon}${cnWord(locale, "fssPalaceLead", { m: x.mountain, w: x.water, p: x.period, b: x.base })}${pair}`);
      }
    }
  } else stars.push(cnWord(locale, c.home ? "fssNeedYear" : "fshNoFacing"));
  const years: string[] = [cnWord(locale, "fsyHead")];
  if (c.years) {
    const y = c.years;
    years.push(yearLine(y, locale), monthLine(y, locale));
    years.push(`${cnWord(locale, "fsyQuietHead")}${colon}`);
    for (const id of AFFLICTION_IDS) years.push(`  ${afflictionName(id, locale, prefs)}${colon}${afflictionPlace(y, id, locale, prefs)}`);
    for (const p of FLIGHT) years.push(`  ${palaceName(p, locale)}${colon}${cnWord(locale, "fsyTableCell", { y: y.yearChart[p], m: y.monthChart[p] })}`);
  }
  const rooms = c.rooms ?? [];
  const roomText: string[] = [cnWord(locale, "fsrHead")];
  // Read against the chart picked on the figure, said near a mountain's edge (FS30).
  const against = c.stars ? roomsChart(c.stars) : null;
  if (c.stars?.ti && against) roomText.push(cnWord(locale, "fsrAgainstPicked", { chart: chartWord(against.v, locale) }));
  for (const p of FLIGHT) {
    const here = roomsIn(rooms, p);
    if (!here.length) continue;
    roomText.push(`${palaceName(p, locale)}${colon}${listWords(here.map((r) => roomName(r.kind, locale)), locale)}`);
    if (c.stars && against) roomText.push(...roomLines(against.chart, p, rooms, c.stars.now, locale).slice(1).map((l) => `  ${l}`));
  }
  return [
    { id: "facing", lines: facing },
    ...(rooms.length ? [{ id: "rooms", lines: roomText }] : []),
    { id: "stars", lines: stars },
    ...(c.years ? [{ id: "years", lines: years }] : []),
    {
      id: "mountains",
      lines: [
        cnWord(locale, "fshMountainsHead"),
        ...MOUNTAINS.map((m) => {
          const here = c.home?.facingMountain.id === m.id ? ` · ${cnWord(locale, "fshDialFacing")}` : c.home?.sittingMountain.id === m.id ? ` · ${cnWord(locale, "fshDialSitting")}` : "";
          return `${mountainCode(m, locale)} ${chineseLabel(m, locale, prefs).text}${colon}${fmtDeg(norm360(m.degrees - 7.5), locale)} – ${fmtDeg(norm360(m.degrees + 7.5), locale)}, ${directionName(m.direction, locale).toLowerCase()}${here}`;
        }),
      ],
    },
  ];
}

export function homeTableCsv(c: HomeContext): string {
  const rows: string[][] = [["section", "field", "value"]];
  if (c.home) {
    const h = c.home;
    rows.push(["facing", "degrees", h.facing.degrees.toFixed(2)]);
    rows.push(["facing", "source", h.facing.source]);
    rows.push(["facing", "declination", h.facing.declination == null ? "" : h.facing.declination.toFixed(2)]);
    rows.push(["facing", "mountain", h.facingMountain.id]);
    rows.push(["facing", "sitting", h.sittingMountain.id]);
    rows.push(["facing", "edge", `${h.edge.level}:${h.edge.distance.toFixed(2)}:${h.edge.neighbour.id}`]);
    rows.push(["facing", "house", `${h.house.id}:${h.house.group}`]);
    for (const fs of c.people) {
      const m = houseMatch(h, fs);
      rows.push(["facing", `match-${fs.count}`, `${m.same ? "same" : "other"}:${m.facing}:${m.sitting}`]);
    }
  }
  if (c.period) rows.push(["facing", "period", `${c.period.period}:${c.period.year}`]);
  if (c.declination != null) rows.push(["facing", "placeDeclination", c.declination.toFixed(2)]);
  if (c.stars) {
    rows.push([]);
    rows.push(["stars", "chart", "palace", "mountain", "water", "period", "base", "pair"]);
    for (const [v, chart] of [["main", c.stars.main], ["ti", c.stars.ti]] as const) {
      if (!chart) continue;
      for (const p of FLIGHT) {
        const x = chart.palaces[p];
        rows.push(["stars", v, p, String(x.mountain), String(x.water), String(x.period), String(x.base), pairKey(x.mountain, x.water)]);
      }
      rows.push(["stars", v, "formations", chart.formations.join("|"), "", "", "", ""]);
    }
  }
  if (c.rooms?.length) {
    rows.push([]);
    // Each room read against the chart picked on the figure, named in the last column (FS30).
    rows.push(["room", "id", "kind", "palace", "fit", "chart"]);
    const against = c.stars ? roomsChart(c.stars) : null;
    for (const p of FLIGHT) {
      for (const r of roomsIn(c.rooms, p)) {
        const f = c.stars && against ? roomFit(r.kind, against.chart, p, c.stars.now) : null;
        rows.push(["room", r.id, r.kind, p, f ? `${f.use}:${f.fit}:${f.reads}:${f.n}` : "", f && against ? against.v : ""]);
      }
    }
  }
  if (c.years) {
    const y = c.years;
    rows.push([]);
    rows.push(["years", "field", "value"]);
    rows.push(["years", "solarYear", String(y.solarYear)]);
    rows.push(["years", "yearStar", String(y.year)]);
    rows.push(["years", "monthStar", String(y.month)]);
    rows.push(["years", "monthFrom", new Date(y.monthFrom).toISOString()]);
    rows.push(["years", "monthTo", new Date(y.monthTo).toISOString()]);
    rows.push(["years", "fiveYellow", y.afflictions.fiveYellow]);
    rows.push(["years", "monthFiveYellow", y.afflictions.monthFiveYellow]);
    rows.push(["years", "taiSui", y.afflictions.taiSui]);
    rows.push(["years", "yearBreaker", y.afflictions.yearBreaker]);
    rows.push(["years", "threeKillings", `${y.afflictions.threeKillings.direction}:${y.afflictions.threeKillings.mountains.join("|")}`]);
    for (const p of FLIGHT) rows.push(["years", `palace-${p}`, `${y.yearChart[p]}:${y.monthChart[p]}`]);
  }
  rows.push([]);
  rows.push(["mountain", "id", "from", "to", "direction", "home"]);
  for (const m of MOUNTAINS) {
    const here = c.home?.facingMountain.id === m.id ? "facing" : c.home?.sittingMountain.id === m.id ? "sitting" : "";
    rows.push(["mountain", m.id, String(norm360(m.degrees - 7.5)), String(norm360(m.degrees + 7.5)), m.direction, here]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
