/**
 * The calendar's rows as a calendar file (.ics), in the reader's language:
 * each event's title and a short description, your slow transits as the
 * whole days they stay within 1°.
 */
import { buildIcs, type IcsItem } from "@/lib/chart/calendar-ics";
import { isHeadline } from "@/lib/chart/calendar-sky";
import { MEAN_SPEED } from "@/lib/chart/constants";
import type { BodyId } from "@/lib/chart/types";
import type { CalRow } from "@/lib/chart/calendar-rows";
import type { TransitWindow } from "@/lib/chart/personal-transits";
import type { SkyAspect } from "@/lib/chart/sky-events";
import { dateFormat } from "@/lib/intl-cache";
import { formatDegree } from "@/lib/utils";
import { CALENDAR_UI, fill, numChangeDetail, numChangeTitle, signWord, skyEventDetail, skyEventTitle, yourAspectWords } from "./calendar-words";
import type { AppLocale } from "./messages";
import { pick } from "./pick";

const ymd = (ms: number, tz: string) => dateFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));

/**
 * What a calendar file holds (review 3 Oct, T5): the sky's main events (and
 * numerology's turns), those with your transits from Mars outwards and their
 * days within 1°, or everything the calendar shows (the fast planets' too).
 */
export type IcsKind = "main" | "mine" | "all";

/** Your transits worth a calendar's day: the slow movers' (the Sun, Mercury and Venus pass in a day or two). */
const SLOW_MOVERS = new Set<string>(["mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode", "truenode"]);

export function icsKeeps(r: CalRow, kind: IcsKind): boolean {
  if (kind === "all") return true;
  if (r.kind === "num") return true;
  if (r.kind === "sky") return isHeadline(r.ev);
  return kind === "mine" && SLOW_MOVERS.has(r.hit.moving);
}

export function calendarIcs(
  rows: readonly CalRow[],
  windows: readonly TransitWindow[],
  locale: AppLocale,
  tz: string,
  name: string,
  opts: {
    /** Where a moving body stands at a moment (the chunks at hand), for your transits' descriptions. */
    lonAt?: (body: string, t: number) => number | null;
    kind?: IcsKind;
    /** A transit's one line of meaning, once the calendar's reading text is here. */
    meaning?: (hit: Extract<CalRow, { kind: "you" }>["hit"]) => string;
  } = {},
): string {
  const { lonAt, kind = "all", meaning } = opts;
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  const shortDay = (ms: number) => dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(ms));
  const degree = (lon: number) => `${formatDegree(lon)} ${signWord(Math.floor((((lon % 360) + 360) % 360) / 30), locale)}`;
  const kept = rows.filter((r) => icsKeeps(r, kind));
  const items: IcsItem[] = kept.map((r) => {
    if (r.kind === "sky") {
      const ev = r.ev;
      const detail = skyEventDetail(ev, locale, degree);
      return {
        uid: `${r.id.slice(4)}@ulune.app`,
        start: ev.t,
        end: ev.k === "void" ? ev.end : undefined,
        summary: skyEventTitle(ev, locale, time, shortDay),
        description: [pick(CALENDAR_UI.day.sky, locale), detail].filter(Boolean).join(" · "),
      };
    }
    if (r.kind === "num") {
      // A cycle's change: the whole birthday.
      const c = r.change;
      const next = new Date(`${c.day}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      return {
        uid: `num-${c.kind}-${c.index}-${c.day}@ulune.app`,
        start: r.t,
        days: { from: c.day, to: next.toISOString().slice(0, 10) },
        summary: numChangeTitle(c, locale),
        description: [pick(CALENDAR_UI.num.label, locale), numChangeDetail(c, locale)].join(" · "),
      };
    }
    const h = r.hit;
    // Where the planet stands, about when it is within 1° (from its mean speed), and what it is about.
    const lon = lonAt?.(h.moving, r.t) ?? null;
    const speed = MEAN_SPEED[h.moving as BodyId];
    const half = speed ? (1 / speed) * 86_400_000 : 0;
    const span = half >= 36 * 3_600_000 ? fill(CALENDAR_UI.yours.window, locale, { from: shortDay(r.t - half), to: shortDay(r.t + half) }) : "";
    return {
      uid: `${r.id.slice(7)}@ulune.app`,
      start: r.t,
      summary: yourAspectWords(h.moving, h.type as SkyAspect, h.natal, locale),
      description: [
        [pick(CALENDAR_UI.day.you, locale), lon != null ? degree(lon) : ""].filter(Boolean).join(" · "),
        span,
        meaning?.(h) ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  });
  for (const w of kind === "main" ? [] : windows) {
    // The whole days it stays within 1°, the last one included.
    const last = ymd(w.to, tz);
    const next = new Date(`${last}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    items.push({
      uid: `win-${w.moving}-${w.type}-${w.natal}-${w.from}@ulune.app`,
      start: w.from,
      days: { from: ymd(w.from, tz), to: next.toISOString().slice(0, 10) },
      summary: `${yourAspectWords(w.moving, w.type as SkyAspect, w.natal, locale)} (1°)`,
      description: [
        fill(CALENDAR_UI.yours.window, locale, { from: ymd(w.from, tz), to: last }),
        ...w.passes.map((t) => fill(CALENDAR_UI.yours.exactOn, locale, { when: `${ymd(t, tz)} ${time(t)}` })),
      ].join("\n"),
    });
  }
  return buildIcs(items, name);
}
