/**
 * The Houses part of the chart table (part 49 of the launch plan): each
 * cusp with the size of its house, the ruler of its sign and where that
 * ruler stands, the bodies inside, a sign intercepted within the house and a
 * sign that falls on two cusps. The page, its Copy button and the CSV read
 * from here.
 */
import { bodyBare, planetName, signName } from "@/lib/i18n/astro";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { housesWord, pointsWord } from "@/lib/i18n/table-ui";
import { formatArc, formatDegree, formatDegreeSeconds } from "@/lib/utils";
import { SIGN_RULER, TRADITIONAL_RULER } from "./constants";
import { POINT_GROUPS, type Cell } from "./table-cells";
import { SIGN_IDS, type BodyId, type HouseCusp, type NatalChart, type PlanetId, type SignId } from "./types";

const wrap360 = (x: number) => ((x % 360) + 360) % 360;

export type HouseRuler = {
  id: PlanetId;
  /** The traditional ruler, beside a modern one (Mars for Scorpio beside Pluto). */
  traditional: boolean;
  /** "Mercury in Gemini, house 10". */
  text: string;
  /** Where it stands is known (it may be missing from an old cast). */
  placed: boolean;
};

export type HouseRow = {
  cusp: HouseCusp;
  /** The cusp's position: to the second, or to the minute and ~ without a birth time. */
  position: Cell;
  sign: SignId;
  /** From this cusp to the next. */
  size: Cell;
  rulers: HouseRuler[];
  /** The bodies inside, in the Points order (the angles left out: they sit on cusps). */
  inside: BodyId[];
  /** Signs wholly inside this house: no cusp falls in them. */
  intercepted: SignId[];
  /** The cusp's sign is also on another cusp: every house it is on. */
  twoCusps: number[] | null;
  uncertain: boolean;
};

/** The sign of each cusp, and the signs no cusp falls in. */
function cuspSigns(chart: NatalChart): SignId[] {
  return chart.houses.map((h) => h.sign);
}

/** The house a longitude falls in, by the cusps (the next cusp excluded). */
function houseAt(lon: number, houses: readonly HouseCusp[]): number | null {
  for (let i = 0; i < houses.length; i += 1) {
    const h = houses[i];
    const next = houses[(i + 1) % houses.length];
    if (!h || !next) continue;
    const size = wrap360(next.ecliptic - h.ecliptic);
    if (size > 0 && wrap360(lon - h.ecliptic) < size) return h.id;
  }
  return null;
}

export function houseRows(chart: NatalChart, locale: AppLocale): HouseRow[] {
  const unknown = chart.meta.timeUnknown === true;
  const houses = chart.houses;
  const signs = cuspSigns(chart);
  const intercepted = SIGN_IDS.filter((s) => !signs.includes(s));
  const interceptedIn = new Map<number, SignId[]>();
  for (const s of intercepted) {
    const h = houseAt(SIGN_IDS.indexOf(s) * 30 + 15, houses);
    if (h != null) interceptedIn.set(h, [...(interceptedIn.get(h) ?? []), s]);
  }
  const rank = new Map<string, number>();
  for (const g of POINT_GROUPS) for (const id of g.ids) rank.set(id, rank.size);
  const bodies = [...chart.planets].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  const byId = new Map(chart.planets.map((p) => [p.id as string, p]));

  const rulerOf = (id: PlanetId, traditional: boolean): HouseRuler => {
    const p = byId.get(id);
    return {
      id,
      traditional,
      text: p
        ? translate(locale, "chartRulerDetail", { planet: planetName(id, locale), sign: signName(p.sign, locale), house: String(p.house) })
        : planetName(id, locale),
      placed: Boolean(p),
    };
  };

  return houses.map((h, i) => {
    const next = houses[(i + 1) % houses.length];
    const size = next ? wrap360(next.ecliptic - h.ecliptic) : 0;
    const modern = SIGN_RULER[h.sign];
    const trad = TRADITIONAL_RULER[h.sign];
    const rulers = [rulerOf(modern, false)];
    if (trad !== modern) rulers.push(rulerOf(trad, true));
    const same = houses.filter((c) => c.sign === h.sign).map((c) => c.id);
    return {
      cusp: h,
      position: { text: unknown ? formatDegree(h.ecliptic) : formatDegreeSeconds(h.ecliptic), uncertain: unknown },
      sign: h.sign,
      size: { text: formatArc(size), uncertain: unknown },
      rulers,
      inside: bodies.filter((p) => p.house === h.id).map((p) => p.id),
      intercepted: interceptedIn.get(h.id) ?? [],
      twoCusps: same.length > 1 ? same : null,
      uncertain: unknown,
    };
  });
}

/** "Virgo on cusps 1 and 2". */
export function twoCuspsText(row: HouseRow, locale: AppLocale): string {
  const list = row.twoCusps ?? [];
  const last = list.at(-1);
  const head = list.slice(0, -1).join(", ");
  return housesWord(locale, "twoCusps", { sign: signName(row.sign, locale), list: head ? `${head}${housesWord(locale, "and")}${last}` : String(last) });
}

/** "Gemini intercepted". */
export function interceptedText(sign: SignId, locale: AppLocale): string {
  return housesWord(locale, "intercepted", { sign: signName(sign, locale) });
}

/** A house as a line of text, with the same facts as the page. */
export function houseRowText(r: HouseRow, locale: AppLocale): string {
  const mark = r.uncertain ? "~" : "";
  const n = String(r.cusp.id);
  const head = pointsWord(locale, "houseN", { n });
  const bits = [
    `${head.charAt(0).toUpperCase()}${head.slice(1)}`,
    `${mark}${r.position.text} ${signName(r.sign, locale)}`,
    housesWord(locale, "sizeLine", { arc: `${mark}${r.size.text}` }),
    housesWord(locale, "rulerLine", {
      list: r.rulers.map((x) => (x.traditional ? housesWord(locale, "traditionalLine", { text: x.text }) : x.text)).join(", "),
    }),
    housesWord(locale, "insideLine", {
      list: r.inside.length ? r.inside.map((id) => bodyBare(id, locale)).join(", ") : translate(locale, "flagNo"),
    }),
  ];
  for (const s of r.intercepted) bits.push(interceptedText(s, locale));
  if (r.twoCusps) bits.push(twoCuspsText(r, locale));
  return bits.join(" · ");
}
