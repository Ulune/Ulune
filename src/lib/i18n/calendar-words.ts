/**
 * The calendar's words (part 55 of the launch plan): the sky's events, the
 * Moon's state and your transits as short phrases, in English and French.
 */
import type { DayOverview } from "@/lib/chart/calendar-day";
import type { PhaseIndex, SkyAspect, SkyEvent } from "@/lib/chart/sky-events";
import { seasonOf } from "@/lib/chart/sky-events";
import { SIGN_IDS } from "@/lib/chart/types";
import { aspectLinkPhrase, aspectName, bodyAgree, bodyBare, bodyLabel, bodyPrep, signName } from "./astro";
import source from "./calendar-ui.json" with { type: "json" };
import type { AppLocale } from "./messages";
import { pick } from "./pick";

export const CALENDAR_UI = source;

type Pair = { en: string; fr: string };

/** A phrase with its {slots} filled. */
export function fill(pair: Pair, locale: AppLocale, vars: Record<string, string | number> = {}): string {
  return pick(pair, locale).replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function signWord(sign: number, locale: AppLocale): string {
  return signName(SIGN_IDS[((sign % 12) + 12) % 12]!, locale);
}

/** New Moon, First quarter, Full Moon, Last quarter. */
export function phaseWord(phase: PhaseIndex, locale: AppLocale): string {
  return (locale === "fr" ? source.moon.phases.fr : source.moon.phases.en)[phase]!;
}

/** The Moon of a day: its exact phase that day, else crescent or gibbous. */
export function dailyPhaseWord(elong: number, locale: AppLocale, exact?: PhaseIndex): string {
  if (exact != null) return phaseWord(exact, locale);
  const e = ((elong % 360) + 360) % 360;
  const i = e < 90 ? 0 : e < 180 ? 1 : e < 270 ? 2 : 3;
  return (locale === "fr" ? source.moon.daily.fr : source.moon.daily.en)[i]!;
}

export function litWord(lit: number, locale: AppLocale): string {
  return fill(source.moon.lit, locale, { n: Math.round(lit * 100) });
}

const EN_VERB: Record<SkyAspect, string> = {
  conjunction: "conjunct",
  sextile: "sextile",
  square: "square",
  trine: "trine",
  opposition: "opposite",
};

/** "Sun trine Uranus" / "Le Soleil en trigone à Uranus". */
export function skyAspectWords(a: string, type: SkyAspect, b: string, locale: AppLocale): string {
  if (locale === "fr") return aspectLinkPhrase(a, type, b, locale);
  return `${bodyLabel(a, locale)} ${EN_VERB[type]} ${bodyLabel(b, locale)}`;
}

/** "Venus square your North Node" / "Vénus en carré à votre Nœud Nord". */
export function yourAspectWords(moving: string, type: SkyAspect, natal: string, locale: AppLocale): string {
  if (locale === "fr") {
    const verb = `en ${aspectName(type, locale).toLowerCase()} ${type === "conjunction" ? "avec" : "à"}`;
    return fill(source.yours.aspect, locale, { moving: bodyLabel(moving, locale), verb, natal: bodyBare(natal, locale) });
  }
  return fill(source.yours.aspect, locale, { moving: bodyLabel(moving, locale), verb: EN_VERB[type], natal: bodyLabel(natal, locale) });
}

/** The last aspect of a void span: "opposite Mercury" / "opposition à Mercure". */
function lastAspectWords(body: string, type: SkyAspect, locale: AppLocale): string {
  if (locale === "fr") return `${aspectName(type, locale).toLowerCase()} ${type === "conjunction" ? bodyPrep(body, "avec") : bodyPrep(body, "à")}`;
  return `${EN_VERB[type]} ${bodyLabel(body, locale)}`;
}

/** An event's title: "Mars enters Leo", "Venus turns retrograde", "Total solar eclipse", "September equinox"… */
export function skyEventTitle(ev: SkyEvent, locale: AppLocale, time: (ms: number) => string): string {
  switch (ev.k) {
    case "phase":
      return phaseWord(ev.phase, locale);
    case "eclipse":
      return fill(source.sky.eclipse, locale, {
        type: pick(source.sky.eclipseType[ev.type], locale),
        kind: pick(source.sky.eclipseKind[ev.kind], locale),
      });
    case "ingress": {
      const season = seasonOf(ev);
      if (season != null) return (locale === "fr" ? source.sky.seasons.fr : source.sky.seasons.en)[season]!;
      return fill(ev.rx ? source.sky.back : source.sky.enters, locale, { body: bodyLabel(ev.body, locale), sign: signWord(ev.sign, locale) });
    }
    case "station":
      return ev.turn === "rx"
        ? fill(source.sky.turnsRx, locale, { body: bodyLabel(ev.body, locale) })
        : fill(source.sky.turnsDirect, locale, { body: bodyLabel(ev.body, locale), direct: bodyAgree(ev.body, "direct", "directe") });
    case "aspect":
      return skyAspectWords(ev.a, ev.type, ev.b, locale);
    case "void":
      return fill(source.sky.voidUntil, locale, { time: time(ev.end) });
  }
}

/** A second line for an event: its sign, degree or the last aspect of a void span. */
export function skyEventDetail(ev: SkyEvent, locale: AppLocale, degree: (lon: number) => string): string {
  switch (ev.k) {
    case "phase":
      return `${locale === "fr" ? "en" : "in"} ${signWord(Math.floor(ev.lon / 30), locale)}`;
    case "eclipse":
    case "station":
      return degree(ev.lon);
    case "void":
      return ev.last ? fill(source.sky.voidAfter, locale, { aspect: lastAspectWords(ev.last.body, ev.last.type, locale) }) : "";
    default:
      return "";
  }
}

/** A few words for a day cell: "Last quarter", "Mars", "Retrograde", "Equinox", "Solar eclipse". */
export function skyEventShort(ev: SkyEvent, locale: AppLocale): string {
  const s = source.sky.short;
  switch (ev.k) {
    case "phase":
      return phaseWord(ev.phase, locale);
    case "eclipse":
      return pick(ev.kind === "solar" ? s.solarEclipse : s.lunarEclipse, locale);
    case "ingress": {
      const season = seasonOf(ev);
      if (season != null) return pick(season % 2 === 0 ? s.equinox : s.solstice, locale);
      return bodyBare(ev.body, locale);
    }
    case "station":
      // Its glyph and ℞ or D come first: the word names the planet, as an ingress's does.
      return bodyBare(ev.body, locale);
    default:
      return "";
  }
}

/** The Moon bar of a day: its title and its lines (sign, void of course, phase). */
export function dayMoonWords(
  ov: DayOverview,
  locale: AppLocale,
  time: (ms: number) => string,
  shortDay: (ms: number) => string,
): { title: string; sign: string; void: string; phase: string } {
  const d = source.day;
  const dayPhase = ov.phase && ov.phase.t < ov.to ? ov.phase : null;
  const ingress = ov.ingresses[0] ?? null;
  const sign =
    ov.signAtStart == null
      ? ""
      : ingress
        ? fill(d.moonUntil, locale, { sign: signWord(ov.signAtStart, locale), time: time(ingress.t), next: signWord(ingress.sign, locale) })
        : fill(d.moonAllDay, locale, { sign: signWord(ov.signAtStart, locale) });
  const voids = ov.voids
    .map((v) => {
      const starts = v.t >= ov.from;
      const ends = v.end <= ov.to;
      if (starts && ends) return fill(d.voidFromTo, locale, { from: time(v.t), to: time(v.end) });
      if (ends) return fill(d.voidUntil, locale, { to: time(v.end) });
      if (starts) return fill(d.voidFrom, locale, { from: time(v.t) });
      return pick(d.voidAllDay, locale);
    })
    .join(", ");
  const phase = dayPhase
    ? fill(d.phaseAt, locale, { phase: phaseWord(dayPhase.phase, locale), time: time(dayPhase.t) })
    : ov.phase
      ? fill(d.nextPhase, locale, { phase: phaseWord(ov.phase.phase, locale), when: shortDay(ov.phase.t), time: time(ov.phase.t) })
      : "";
  const title = ov.moon ? `${dailyPhaseWord(ov.moon.elong, locale, dayPhase?.phase)} · ${litWord(ov.moon.lit, locale)}` : "";
  return { title, sign, void: voids, phase };
}

const FAST_MOVERS = new Set(["sun", "mercury", "venus"]);

/** How long one of your transits is felt: hours for the Moon, days for the quick planets, the 1° window for the slow. */
export function lastsWords(
  moving: string,
  window: { from: number; to: number } | null,
  locale: AppLocale,
  dayMonth: (ms: number) => string,
): string {
  const l = source.day.lasts;
  if (moving === "moon") return pick(l.moon, locale);
  if (FAST_MOVERS.has(moving)) return pick(l.fast, locale);
  if (moving === "mars") return pick(l.mars, locale);
  return window ? fill(source.yours.window, locale, { from: dayMonth(window.from), to: dayMonth(window.to) }) : pick(l.slow, locale);
}

/** "Pinnacle 3 begins: 1": a long cycle's change on a birthday (numerology, part 62). */
export function numChangeTitle(c: { kind: "period" | "pinnacle" | "challenge"; index: number; value: { number: number | null } }, locale: AppLocale): string {
  const cycle = fill(source.num[`cycle_${c.kind}`], locale, { n: c.index });
  return fill(source.num.begins, locale, { cycle, n: c.value.number ?? "" });
}

/** "Pinnacle 3 → 1": the same, short enough for a day of the month. */
export function numChangeShort(c: { kind: "period" | "pinnacle" | "challenge"; index: number; value: { number: number | null } }, locale: AppLocale): string {
  return `${fill(source.num[`cycle_${c.kind}`], locale, { n: c.index })} → ${c.value.number ?? ""}`;
}

/** "after 3, at 41". */
export function numChangeDetail(c: { age: number; previous: { number: number | null } }, locale: AppLocale): string {
  return fill(source.num.after, locale, { prev: c.previous.number ?? "", age: c.age });
}
