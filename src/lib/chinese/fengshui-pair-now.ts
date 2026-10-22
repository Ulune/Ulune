/*
 * "You two, now" on Feng Shui's Relationship page (share and compare plan,
 * feature 5e): the year's and the month's flying stars over the directions
 * the two people share, with Feng Shui's Cycles' own reading of a direction
 * under the year (fengshui-cycles.ts: strengthened, steady or resting, the
 * Three Killings never at your back) read for two. A direction supportive for
 * both has one state for both; the direction to face together this year is
 * the first shared one the year strengthens, else the first that stays
 * steady. Two people of two groups share none: each one's own direction to
 * face this year, at desks of their own. Suggestions about timing only, never
 * about a place's worth; nothing to buy or hang. Pure; nothing leaves the
 * device.
 *
 *   fsp:now             the year and the month for the two
 *   fsp:now:dir:e       one direction under the year, for both
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { MANSIONS, type DirectionId } from "./fengshui";
import { directionsOfYear, personDirection, personYear, type CycleState, type DirectionYear, type PersonDirection, type PersonYear } from "./fengshui-cycles";
import { directionsList, monthFiveLine, monthLine, starName, stateWord } from "./fengshui-cycles-reading";
import { AFFLICTION_FOR_YOU, STAR_FOR_YOU } from "./fengshui-cycles-texts";
import type { FengShuiPair } from "./fengshui-pair";
import { dirIn, directionName, mansionName } from "./fengshui-reading";
import { starOf } from "./fengshui-stars";
import { yearStarsAt, type YearStars } from "./fengshui-years";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { said, type Both } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;
type Person = "a" | "b";
export type FsNowNames = Record<Person, string>;

export const FSP_NOW = "fsp:now";
export const fspNowRef = (d: DirectionId): string => `fsp:now:dir:${d}`;

export type FsNowDir = { direction: DirectionId; x: DirectionYear; a: PersonDirection; b: PersonDirection };

export type FsPairNow = {
  y: YearStars;
  people: Record<Person, PersonYear>;
  /** The directions supportive for both, in the pair's order (the most supportive for both first). */
  shared: FsNowDir[];
  /** The shared direction to face together this year (strengthened, else steady without the Three Killings behind), or null. */
  face: DirectionId | null;
  /** The shared directions the year asks to rest. */
  rest: DirectionId[];
};

/** The pair under the year and the month an instant is in. */
export function fsPairNow(pair: FengShuiPair, ms: number): FsPairNow {
  const y = yearStarsAt(ms);
  const dirs = directionsOfYear(y);
  const people = { a: personYear(pair.a, y, dirs), b: personYear(pair.b, y, dirs) };
  const shared = pair.shared.map((d) => ({ direction: d, x: dirs.find((r) => r.direction === d)!, a: personDirection(people.a, d), b: personDirection(people.b, d) }));
  const face = shared.find((s) => s.a.state === "strengthened") ?? shared.find((s) => s.a.state === "steady" && !s.x.killingsBehind) ?? null;
  return { y, people, shared, face: face?.direction ?? null, rest: shared.filter((s) => s.a.state === "rest").map((s) => s.direction) };
}

/** A shared direction's state, for two (the Three Killings across from a steady one say why it is not the one to face). */
const STATE_TWO: Readonly<Record<CycleState | "behind", Both>> = {
  strengthened: [
    "Supportive for both of you, and strengthened this year: a good side to face together for new starts and long tasks.",
    "Favorable pour vous deux, et renforcée cette année\u202f: un bon côté vers lequel vous tourner ensemble pour les commencements et les longues tâches.",
  ],
  steady: [
    "Supportive for both of you, with a mixed star this year: still yours to share, with a little care.",
    "Favorable pour vous deux, avec une étoile mitigée cette année\u202f: toujours à partager, avec un peu d’attention.",
  ],
  behind: [
    "Supportive for both of you, steady this year: the Three Killings fall across from it, so for a shared desk or a long task, face another of your shared directions.",
    "Favorable pour vous deux, stable cette année\u202f: les Trois Sha tombent à l’opposé, alors pour un bureau partagé ou une longue tâche, tournez-vous vers une autre de vos directions communes.",
  ],
  rest: [
    "Supportive for both of you, resting this year: a year to let that side rest rather than start work there; your other shared directions can carry the new starts.",
    "Favorable pour vous deux, au repos cette année\u202f: une année pour laisser reposer ce côté plutôt que d’y entamer des travaux\u202f; vos autres directions communes peuvent porter les commencements.",
  ],
};

const NOW_TEXTS = {
  face: [
    "This year, {dir} is the side to face together for new starts and long tasks: supportive for both of you, and the year’s {star} strengthens it.",
    "Cette année, {dir} est le côté vers lequel vous tourner ensemble pour les commencements et les longues tâches\u202f: favorable pour vous deux, et le {star} de l’année le renforce.",
  ],
  faceSteady: [
    "This year none of your shared directions is strengthened; {dir} stays steady, the best of them to face together.",
    "Cette année, aucune de vos directions communes n’est renforcée\u202f; {dir} reste stable, la meilleure à regarder ensemble.",
  ],
  allRest: [
    "This year your shared directions rest: lean on what is already under way together rather than starting anew.",
    "Cette année, vos directions communes se reposent\u202f: appuyez-vous sur ce qui est déjà en cours entre vous plutôt que de recommencer.",
  ],
  rest: ["To rest this year: {list}.", "À laisser reposer cette année\u202f: {list}."],
  noShared: [
    "No direction supports you both: this year {a} might face {dirA} and {b} {dirB}, at desks of their own.",
    "Aucune direction n’est favorable pour vous deux\u202f: cette année, {a} pourrait se tourner vers {dirA} et {b} vers {dirB}, à des bureaux séparés.",
  ],
  noOwn: ["the side already under way", "le côté déjà en cours"],
  about: [
    "“You two, now” lays the year’s and the month’s flying stars over the directions you share, as Feng Shui’s Cycles read them for each of you: which of your shared supportive directions the year strengthens, and which it asks to rest. Timing only: a direction keeps its worth from one year to the next.",
    "«\u202fVous deux, maintenant\u202f» pose les étoiles volantes de l’année et du mois sur les directions que vous partagez, comme les Cycles du Feng Shui les lisent pour chacun de vous\u202f: celles de vos directions favorables communes que l’année renforce, et celles qu’elle invite à laisser reposer. Une question de moment seulement\u202f: une direction garde sa valeur d’une année à l’autre.",
  ],
} as const satisfies Record<string, Both>;

/** "the east (Growth for Camille, Harmony for Sample B)". */
function dirWithMansions(s: FsNowDir, names: FsNowNames, locale: string): string {
  const of = (p: Person) => (locale === "fr" ? `${mansionName(s[p].mansion, locale)} pour ${names[p]}` : `${mansionName(s[p].mansion, locale)} for ${names[p]}`);
  return `${dirIn(s.direction, locale, "the")} (${of("a")}, ${of("b")})`;
}

/** The part's line: the direction to face together this year, or why there is none. */
export function fsNowLead(now: FsPairNow, names: FsNowNames, locale: string): string {
  if (!now.shared.length) {
    const own = (p: Person) => {
      const d = now.people[p].best;
      return d ? `${dirIn(d, locale, "the")} (${mansionName(personDirection(now.people[p], d).mansion, locale)})` : said(NOW_TEXTS.noOwn, locale);
    };
    return said(NOW_TEXTS.noShared, locale).replaceAll("{a}", names.a).replaceAll("{b}", names.b).replaceAll("{dirA}", own("a")).replaceAll("{dirB}", own("b"));
  }
  const s = now.shared.find((x) => x.direction === now.face);
  if (!s) return said(NOW_TEXTS.allRest, locale);
  const dir = dirWithMansions(s, names, locale);
  return s.a.state === "strengthened" ? said(NOW_TEXTS.face, locale).replaceAll("{dir}", dir).replaceAll("{star}", starName(s.x.year, locale)) : said(NOW_TEXTS.faceSteady, locale).replaceAll("{dir}", dir);
}

/** The shared directions to rest, or "". */
export const fsNowRest = (now: FsPairNow, locale: string): string => (now.rest.length ? said(NOW_TEXTS.rest, locale).replace("{list}", directionsList(now.rest, locale)) : "");

/** A direction's line: "year’s 9 Purple, month’s 3 Jade · strengthened". */
export function fsNowDirLine(s: FsNowDir, locale: string): string {
  const stars = locale === "fr" ? `${starName(s.x.year, locale)} de l’année, ${starName(s.x.month, locale)} du mois` : `year’s ${starName(s.x.year, locale)}, month’s ${starName(s.x.month, locale)}`;
  return `${stars} · ${stateWord(s.a.state, locale)}`;
}

/** The mansions in a line: "Growth · Harmony". */
export const fsNowMansions = (s: FsNowDir, locale: string): string => `${mansionName(s.a.mansion, locale)} · ${mansionName(s.b.mansion, locale)}`;

/** The rows the part shows: the shared directions, or, with none, each one's own direction to face this year. */
export function fsNowRows(now: FsPairNow): { direction: DirectionId; who: Person | null }[] {
  if (now.shared.length) return now.shared.map((s) => ({ direction: s.direction, who: null }));
  return (["a", "b"] as const).flatMap((p) => (now.people[p].best ? [{ direction: now.people[p].best!, who: p }] : []));
}

/** "2026: 1 White in the centre, 9 Purple this month" (the stars in the centre of the year's chart and the month's). */
export function fsNowWhen(now: FsPairNow, locale: string): string {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  return locale === "fr"
    ? `${now.y.solarYear}${colon}${starName(now.y.year, locale)} au centre, ${starName(now.y.month, locale)} ce mois-ci`
    : `${now.y.solarYear}${colon}${starName(now.y.year, locale)} in the centre, ${starName(now.y.month, locale)} this month`;
}

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "fssAboutTitle"), paragraphs: [said(NOW_TEXTS.about, locale)] };
}

const starText = (n: number, locale: string, prefs: Shown) => chineseLabel(starOf(n), locale, prefs).text;

/** "You two, now" on the Pair page: the year and month for two, or one direction under them; null for another id. */
export function fsPairNowReading(now: FsPairNow, names: FsNowNames, ref: string | null, locale: string, prefs: Shown, head: string, tz?: string): ElementReading | null {
  if (!ref?.startsWith(FSP_NOW)) return null;
  const colon = locale === "fr" ? "\u202f: " : ": ";
  if (ref === FSP_NOW) {
    const lead = fsNowLead(now, names, locale);
    const rest = fsNowRest(now, locale);
    const month = monthLine(now.y, locale, tz);
    const five = monthFiveLine(now.y, locale);
    const facts: ReadingFact[] = [
      { label: cnWord(locale, "fsyYearStar"), value: starText(now.y.year, locale, prefs) },
      { label: cnWord(locale, "fsyMonthStar"), value: starText(now.y.month, locale, prefs) },
      ...now.shared.map((s) => ({ label: `${directionName(s.direction, locale)} · ${fsNowMansions(s, locale)}`, value: stateWord(s.a.state, locale), ref: fspNowRef(s.direction) })),
    ];
    return {
      id: FSP_NOW,
      kind: "house",
      title: `${head} · ${now.y.solarYear}`,
      kicker: fsNowWhen(now, locale),
      lead,
      paragraphs: [lead, ...(rest ? [rest] : []), month, five],
      facts,
      sections: [{ id: "month", title: cnWord(locale, "fsyMonthStar"), paragraphs: [month, five] }],
      links: { title: head, rows: fsNowRows(now).map((r) => ({ ref: fspNowRef(r.direction), label: directionName(r.direction, locale), detail: r.who ? names[r.who] : undefined })) },
      mark: String(now.y.year),
      about: about(locale),
    };
  }
  const d = /^fsp:now:dir:(n|ne|e|se|s|sw|w|nw)$/.exec(ref)?.[1] as DirectionId | undefined;
  if (!d) return null;
  const pa = personDirection(now.people.a, d);
  const pb = personDirection(now.people.b, d);
  const x: DirectionYear = pa;
  const shared = now.shared.find((s) => s.direction === d);
  const state = shared ? said(STATE_TWO[shared.a.state === "steady" && shared.x.killingsBehind ? "behind" : shared.a.state], locale) : "";
  const each = (["a", "b"] as const).map((p) => {
    const pd = p === "a" ? pa : pb;
    const kind = cnWord(locale, pd.supportive ? "fsSupportive" : "fsChallenging").toLowerCase();
    return `${names[p]}${colon}${mansionName(pd.mansion, locale)}, ${kind}, ${stateWord(pd.state, locale)}`;
  });
  const star = x.year === 5 ? [] : [said(STAR_FOR_YOU[x.year], locale)];
  const marks = [...x.afflictions.map((id) => said(AFFLICTION_FOR_YOU[id], locale)), ...(x.monthFive ? [said(AFFLICTION_FOR_YOU["month-five-yellow"], locale)] : [])];
  const lead = state || each.join(locale === "fr" ? "\u202f; " : "; ");
  return {
    id: ref,
    kind: "house",
    title: `${directionName(d, locale)} · ${now.y.solarYear}`,
    kicker: [head, `${mansionName(pa.mansion, locale)} · ${mansionName(pb.mansion, locale)}`, stateWord(pa.state, locale)].join(" · "),
    lead,
    paragraphs: [lead, ...(state ? each : []), ...star, ...marks],
    facts: [
      { label: cnWord(locale, "fsyYearStar"), value: starText(x.year, locale, prefs) },
      { label: cnWord(locale, "fsyMonthStar"), value: starText(x.month, locale, prefs) },
      ...(["a", "b"] as const).map((p) => ({ label: `${names[p]} · ${cnWord(locale, "fsMansion")}`, value: chineseLabel(MANSIONS[(p === "a" ? pa : pb).mansion], locale, prefs).text })),
    ],
    sections: [
      { id: "each", title: head, paragraphs: each },
      ...(star.length ? [{ id: "star", title: cnWord(locale, "fsyYearStar"), paragraphs: star }] : []),
      ...(marks.length ? [{ id: "quiet", title: cnWord(locale, "fsyQuietHead"), paragraphs: marks }] : []),
    ],
    links: { title: head, rows: [{ ref: FSP_NOW, label: fsNowWhen(now, locale) }] },
    mark: String(x.year),
    about: about(locale),
  };
}
