import { birthZoneLine, julianDayLine, universalTimeLine } from "./birth-time-label";
import { hydratePatterns } from "./anatomy";
import { CONFIG_LABEL } from "./overlay-filter";
import { HOUSE_SYSTEM_LABEL } from "./constants";
import type { NatalChart } from "./types";
import {
  aspectName,
  bodyLabel,
  dignityName,
  elementName,
  modalityName,
  planetName,
  signName,
} from "@/lib/i18n/astro";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { formatDegreeSeconds, formatSignedDmsSeconds, formatSpeed } from "@/lib/utils";

function yn(value: boolean, locale: AppLocale): string {
  return value ? translate(locale, "flagYes") : translate(locale, "flagNo");
}

function motionOf(
  speed: number | undefined,
  stationary: boolean | undefined,
  fast: boolean | undefined,
  locale: AppLocale,
): string {
  if (stationary) return translate(locale, "motionSta");
  if (fast) return translate(locale, "motionFast");
  if (speed == null) return translate(locale, "motionOk");
  return translate(locale, "motionOk");
}

function sunFlag(combust: boolean, cazimi: boolean, locale: AppLocale): string {
  if (cazimi) return translate(locale, "flagCazimi");
  if (combust) return translate(locale, "flagCombust");
  return translate(locale, "flagNo");
}

function sectFlag(value: boolean | null, locale: AppLocale): string {
  if (value === true) return translate(locale, "inSect");
  if (value === false) return translate(locale, "outOfSect");
  return translate(locale, "flagNo");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function chartPoints(chart: NatalChart) {
  return [...chart.planets, ...Object.values(chart.angles)];
}

export function formatChartTableText(chart: NatalChart, locale: AppLocale): string {
  const fr = locale === "fr";
  const patterns = hydratePatterns(chart);
  const system = translate(locale, HOUSE_SYSTEM_LABEL[chart.meta.houseSystem] ?? "housePlacidus");
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  push(translate(locale, "tableIdentity"));
  push(`${translate(locale, "name")}: ${chart.meta.name}`);
  push(`${translate(locale, "date")}: ${chart.meta.date} ${chart.meta.time} (${birthZoneLine(chart.meta, locale)})`);
  push(`${translate(locale, "place")}: ${chart.meta.placeLabel} (${chart.meta.latitude.toFixed(4)}, ${chart.meta.longitude.toFixed(4)})`);
  push(`${translate(locale, "houseSystem")}: ${system}`);
  push(
    `${translate(locale, "tableDay").split(" ")[0]}: ${patterns.isDay ? translate(locale, "tableDay") : translate(locale, "tableNight")}`,
  );
  push(`UT: ${universalTimeLine(chart.meta)}${julianDayLine(chart.meta) ? ` · ${julianDayLine(chart.meta)}` : ""}`);
  push(fr ? "Swiss Ephemeris · tropical · nœud vrai · Lilith vraie" : "Swiss Ephemeris · tropical · true node · true Lilith");
  push();

  push(translate(locale, "tablePoints"));
  for (const p of chartPoints(chart)) {
    const flag = patterns.flags[p.id];
    const bits = [
      bodyLabel(p.id, locale),
      formatDegreeSeconds(p.ecliptic),
      signName(p.sign, locale),
      `${fr ? "M" : "H"}${p.house}`,
      p.speed != null ? formatSpeed(p.speed) : "",
      p.retrograde ? translate(locale, "dirRx") : translate(locale, "dirDirect"),
      motionOf(p.speed, flag?.stationary, flag?.fast, locale),
      p.declination != null ? formatSignedDmsSeconds(p.declination) : "",
      flag?.oob ? "OOB" : "",
      flag?.dignity ? dignityName(flag.dignity, locale) : "",
      flag?.dignity === "peregrine" ? translate(locale, "colPeregrine") : "",
      sunFlag(Boolean(flag?.combust), Boolean(flag?.cazimi), locale),
      flag?.angular ? translate(locale, "colAngular") : "",
      flag?.anaretic ? translate(locale, "colAnaretic") : "",
      flag?.ariesPoint ? translate(locale, "colAries") : "",
      sectFlag(flag?.inSect ?? null, locale),
    ].filter((x) => x && x !== translate(locale, "flagNo") && x !== translate(locale, "motionOk"));
    push(bits.join(" · "));
  }
  push();

  push(translate(locale, "tableHouses"));
  for (const h of chart.houses) {
    push(`${fr ? "M" : "H"}${h.id} ${formatDegreeSeconds(h.ecliptic)} ${signName(h.sign, locale)}`);
  }
  push();

  push(translate(locale, "tableAspects"));
  for (const a of chart.aspects) {
    const app =
      a.applying === true
        ? translate(locale, "applying")
        : a.applying === false
          ? translate(locale, "separating")
          : "";
    push(
      `${bodyLabel(a.a, locale)} ${aspectName(a.type, locale)} ${bodyLabel(a.b, locale)} · ${a.orb.toFixed(2)}° ${app} (${a.level})`,
    );
  }
  push();

  push(translate(locale, "tablePatterns"));
  if (patterns.configurations.length) {
    for (const c of patterns.configurations) {
      const label = CONFIG_LABEL[c.type][locale];
      const apex = c.apex ? ` · ${translate(locale, "configApex", { name: bodyLabel(c.apex, locale) })}` : "";
      push(`${label}: ${c.members.map((id) => bodyLabel(id, locale)).join(", ")}${apex}`);
    }
  } else push(translate(locale, "noConfigs"));
  if (patterns.receptions.length) {
    for (const r of patterns.receptions) {
      push(`${bodyLabel(r.a, locale)} ⇄ ${bodyLabel(r.b, locale)}`);
    }
  } else push(translate(locale, "noReceptions"));
  if (patterns.stelliums.length) {
    for (const s of patterns.stelliums) {
      push(`${s.place}: ${s.members.map((id) => bodyLabel(id, locale)).join(", ")}`);
    }
  } else push(translate(locale, "noStelliums"));
  const unaspected = chart.planets.filter((p) => patterns.flags[p.id]?.unaspected);
  if (unaspected.length) {
    push(`${translate(locale, "patternUnaspected")}: ${unaspected.map((p) => bodyLabel(p.id, locale)).join(", ")}`);
  } else push(translate(locale, "noUnaspected"));
  push(patterns.vocMoon ? translate(locale, "vocYes") : translate(locale, "vocNo"));
  if (patterns.retrogrades.length) {
    push(
      `${translate(locale, "patternRx")}: ${patterns.retrogrades.length} · ${patterns.retrogrades.map((id) => bodyLabel(id, locale)).join(", ")}`,
    );
  } else push(translate(locale, "noRx"));
  push();

  push(translate(locale, "tableBalance"));
  const w = patterns.weights;
  push(
    `${elementName("fire", locale)} ${w.elements.fire}, ${elementName("earth", locale)} ${w.elements.earth}, ${elementName("air", locale)} ${w.elements.air}, ${elementName("water", locale)} ${w.elements.water}`,
  );
  push(
    `${modalityName("cardinal", locale)} ${w.modalities.cardinal}, ${modalityName("fixed", locale)} ${w.modalities.fixed}, ${modalityName("mutable", locale)} ${w.modalities.mutable}`,
  );
  push(`${translate(locale, "polarityPositive")} ${w.polarity.positive} · ${translate(locale, "polarityNegative")} ${w.polarity.negative}`);
  push(
    `${translate(locale, "hemiEast")} ${w.hemisphere.east} · ${translate(locale, "hemiWest")} ${w.hemisphere.west} · ${translate(locale, "hemiNorth")} ${w.hemisphere.north} · ${translate(locale, "hemiSouth")} ${w.hemisphere.south}`,
  );
  push(
    `${translate(locale, "quad1")} ${w.quadrants[0]} · ${translate(locale, "quad2")} ${w.quadrants[1]} · ${translate(locale, "quad3")} ${w.quadrants[2]} · ${translate(locale, "quad4")} ${w.quadrants[3]}`,
  );
  push(
    `${translate(locale, "tempoAngular")} ${w.angularity.angular} · ${translate(locale, "tempoSuccedent")} ${w.angularity.succedent} · ${translate(locale, "tempoCadent")} ${w.angularity.cadent}`,
  );
  push();

  push(translate(locale, "tableRanking"));
  const ruler = chart.planets.find((p) => p.id === patterns.chartRuler);
  if (ruler) {
    push(
      `${translate(locale, "chartRulerHead")}: ${translate(locale, "chartRulerDetail", {
        planet: planetName(patterns.chartRuler, locale),
        sign: signName(ruler.sign, locale),
        house: String(ruler.house),
      })}`,
    );
  }
  if (patterns.tightest) {
    const t = patterns.tightest;
    push(
      `${translate(locale, "tightestHead")}: ${translate(locale, "tightestLine", {
        a: bodyLabel(t.a, locale),
        aspect: aspectName(t.type, locale),
        b: bodyLabel(t.b, locale),
        orb: t.orb.toFixed(2),
      })}${t.applying === true ? ` ${translate(locale, "applying")}` : t.applying === false ? ` ${translate(locale, "separating")}` : ""}`,
    );
  }
  for (const row of patterns.ranking) {
    const dignity = row.dignity ? dignityName(row.dignity, locale) : "—";
    const sect =
      row.inSect === true
        ? `, ${translate(locale, "inSect")}`
        : row.inSect === false
          ? `, ${translate(locale, "outOfSect")}`
          : "";
    push(
      translate(locale, "rankingLine", {
        planet: bodyLabel(row.id, locale),
        score: String(row.score),
        dignity,
        sect,
      }),
    );
  }
  if (patterns.dominant) {
    const d = patterns.dominant;
    push(
      translate(locale, "dominantLine", {
        shape: CONFIG_LABEL[d.type][locale],
        planet: d.apex ? bodyLabel(d.apex, locale) : "—",
      }),
    );
  } else push(translate(locale, "dominantNone"));

  return lines.join("\n");
}

export function formatChartTableCsv(chart: NatalChart, locale: AppLocale): string {
  const patterns = hydratePatterns(chart);
  const rows: string[][] = [];
  const add = (row: string[]) => rows.push(row.map(csvEscape));

  add(["section", "field", "value"]);
  add(["identity", "name", chart.meta.name]);
  add(["identity", "date", chart.meta.date]);
  add(["identity", "time", chart.meta.time]);
  add(["identity", "timezone", chart.meta.timezone]);
  if (chart.meta.birthTime) {
    add(["identity", "utcOffset", chart.meta.birthTime.offsetLabel.replace("\u2212", "-")]);
    add(["identity", "zoneAbbr", chart.meta.birthTime.abbr]);
    add(["identity", "summerTime", chart.meta.birthTime.dst ? "yes" : "no"]);
    add(["identity", "timeBasis", chart.meta.birthTime.basis]);
    if (chart.meta.birthTime.calendar === "julian") add(["identity", "calendar", "julian"]);
  }
  add(["identity", "place", chart.meta.placeLabel]);
  add(["identity", "latitude", chart.meta.latitude.toFixed(4)]);
  add(["identity", "longitude", chart.meta.longitude.toFixed(4)]);
  add(["identity", "houseSystem", chart.meta.houseSystem]);
  add(["identity", "sect", patterns.isDay ? "day" : "night"]);
  add(["identity", "utc", chart.meta.utc]);
  if (chart.meta.jdUt != null) add(["identity", "jdUt", chart.meta.jdUt.toFixed(6)]);
  if (chart.meta.deltaT != null) add(["identity", "deltaT", chart.meta.deltaT.toFixed(2)]);

  add([]);
  add([
    "point",
    "id",
    "name",
    "sign",
    "house",
    "longitude",
    "formatted",
    "speed",
    "direction",
    "stationary",
    "fast",
    "rx",
    "declination",
    "oob",
    "dignity",
    "peregrine",
    "combust",
    "cazimi",
    "angular",
    "anaretic",
    "ariesPoint",
    "inSect",
  ]);
  for (const p of chartPoints(chart)) {
    const flag = patterns.flags[p.id];
    add([
      "point",
      p.id,
      bodyLabel(p.id, locale),
      p.sign,
      String(p.house),
      p.ecliptic.toFixed(6),
      formatDegreeSeconds(p.ecliptic),
      p.speed != null ? p.speed.toFixed(6) : "",
      p.retrograde ? "Rx" : "D",
      flag?.stationary ? "1" : "0",
      flag?.fast ? "1" : "0",
      p.retrograde ? "1" : "0",
      p.declination != null ? p.declination.toFixed(6) : "",
      flag?.oob ? "1" : "0",
      flag?.dignity ?? "",
      flag?.dignity === "peregrine" ? "1" : "0",
      flag?.combust ? "1" : "0",
      flag?.cazimi ? "1" : "0",
      flag?.angular ? "1" : "0",
      flag?.anaretic ? "1" : "0",
      flag?.ariesPoint ? "1" : "0",
      flag?.inSect === true ? "1" : flag?.inSect === false ? "0" : "",
    ]);
  }

  add([]);
  add(["house", "id", "sign", "longitude", "formatted"]);
  for (const h of chart.houses) {
    add(["house", String(h.id), h.sign, h.ecliptic.toFixed(6), formatDegreeSeconds(h.ecliptic)]);
  }

  add([]);
  add(["aspect", "a", "b", "type", "level", "orb", "applying"]);
  for (const a of chart.aspects) {
    add([
      "aspect",
      a.a,
      a.b,
      a.type,
      a.level,
      a.orb.toFixed(4),
      a.applying === true ? "applying" : a.applying === false ? "separating" : "",
    ]);
  }

  add([]);
  add(["pattern", "kind", "value"]);
  for (const c of patterns.configurations) {
    add(["pattern", c.type, `${c.members.join("|")}${c.apex ? ` apex:${c.apex}` : ""}`]);
  }
  for (const r of patterns.receptions) add(["pattern", "reception", `${r.a}|${r.b}`]);
  for (const s of patterns.stelliums) add(["pattern", "stellium", `${s.place}|${s.members.join("|")}`]);
  add([
    "pattern",
    "unaspected",
    chart.planets.filter((p) => patterns.flags[p.id]?.unaspected).map((p) => p.id).join("|"),
  ]);
  add(["pattern", "vocMoon", patterns.vocMoon ? "1" : "0"]);
  add(["pattern", "retrogrades", patterns.retrogrades.join("|")]);

  const w = patterns.weights;
  add([]);
  add(["balance", "field", "value"]);
  add(["balance", "fire", String(w.elements.fire)]);
  add(["balance", "earth", String(w.elements.earth)]);
  add(["balance", "air", String(w.elements.air)]);
  add(["balance", "water", String(w.elements.water)]);
  add(["balance", "cardinal", String(w.modalities.cardinal)]);
  add(["balance", "fixed", String(w.modalities.fixed)]);
  add(["balance", "mutable", String(w.modalities.mutable)]);
  add(["balance", "positive", String(w.polarity.positive)]);
  add(["balance", "negative", String(w.polarity.negative)]);
  add(["balance", "east", String(w.hemisphere.east)]);
  add(["balance", "west", String(w.hemisphere.west)]);
  add(["balance", "north", String(w.hemisphere.north)]);
  add(["balance", "south", String(w.hemisphere.south)]);
  add(["balance", "q1", String(w.quadrants[0])]);
  add(["balance", "q2", String(w.quadrants[1])]);
  add(["balance", "q3", String(w.quadrants[2])]);
  add(["balance", "q4", String(w.quadrants[3])]);
  add(["balance", "angular", String(w.angularity.angular)]);
  add(["balance", "succedent", String(w.angularity.succedent)]);
  add(["balance", "cadent", String(w.angularity.cadent)]);

  add([]);
  add(["ranking", "field", "value"]);
  add(["ranking", "chartRuler", patterns.chartRuler]);
  if (patterns.tightest) {
    const t = patterns.tightest;
    add([
      "ranking",
      "tightest",
      `${t.a}|${t.type}|${t.b}|${t.orb.toFixed(4)}|${t.applying === true ? "applying" : t.applying === false ? "separating" : ""}`,
    ]);
  }
  for (const row of patterns.ranking) {
    add([
      "ranking",
      "dignitySect",
      `${row.id}|${row.score}|${row.dignity ?? ""}|${row.inSect === true ? "in" : row.inSect === false ? "out" : ""}`,
    ]);
  }
  if (patterns.dominant) {
    add([
      "ranking",
      "dominant",
      `${patterns.dominant.type}|${patterns.dominant.members.join("|")}|apex:${patterns.dominant.apex ?? ""}`,
    ]);
  }

  return rows.map((r) => r.join(",")).join("\n");
}
