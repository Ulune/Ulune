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
import { edgeLine, facingLine, fmtDecl, fmtDeg, houseLine, matchLines, mountainCode, periodLines, sourceLine, type HomeContext } from "./fengshui-home-reading";

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
  if (c.declination != null) facing.push(cnWord(locale, "fshDecl", { place: c.place, deg: fmtDecl(c.declination, locale) }));
  return [
    { id: "facing", lines: facing },
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
  rows.push([]);
  rows.push(["mountain", "id", "from", "to", "direction", "home"]);
  for (const m of MOUNTAINS) {
    const here = c.home?.facingMountain.id === m.id ? "facing" : c.home?.sittingMountain.id === m.id ? "sitting" : "";
    rows.push(["mountain", m.id, String(norm360(m.degrees - 7.5)), String(norm360(m.degrees + 7.5)), m.direction, here]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
