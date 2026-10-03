import { PairIcon, SkyEventIcon } from "@/components/calendar-icons";
import { MoonGlyph } from "@/components/moon-glyph";
import type { DayOverview, DayRow } from "@/lib/chart/calendar-day";
import { nextEvent, windowId } from "@/lib/chart/calendar-sky";
import { changeId, type NumerologyCalendar } from "@/lib/chart/numerology-calendar";
import { ASPECT_COLOR } from "@/lib/chart/constants";
import type { TransitWindow } from "@/lib/chart/personal-transits";
import type { SkyAspect, SkyEvent } from "@/lib/chart/sky-events";
import { seasonOf } from "@/lib/chart/sky-events";
import { utcFromCivil, type CivilDate } from "@/lib/chart/timing-window";
import {
  CALENDAR_UI,
  dayMoonWords,
  fill,
  lastsWords,
  numChangeDetail,
  numChangeTitle,
  signWord,
  skyEventDetail,
  skyEventTitle,
  yourAspectWords,
} from "@/lib/i18n/calendar-words";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { dateFormat } from "@/lib/intl-cache";
import { cn, formatArc, formatDegree } from "@/lib/utils";

const D = CALENDAR_UI.day;

/**
 * The calendar's day (part 56 of the launch plan): the Moon bar, a rail of
 * the day's hours with a tick per event and the void-of-course hours
 * hatched, the agenda (the sky's events and your exacts, the Moon's
 * included), and your slow transits in effect; with your numerology, the
 * personal day under the Moon and a long cycle changing that day (part 62).
 */
export function CalendarDay({
  ov,
  civil,
  tz,
  nowMs,
  events,
  showSky,
  showYours,
  selectedId,
  onSelect,
  num = null,
}: {
  ov: DayOverview;
  civil: CivilDate;
  tz: string;
  nowMs: number;
  /** Every event at hand (chunks and year files), for "until" and the next phase. */
  events: readonly SkyEvent[];
  showSky: boolean;
  showYours: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Your numerology that day (with your transits on): the personal day, month and year, a cycle's change. */
  num?: { pd: number; pm: number; py: number; changes: NumerologyCalendar["changes"] } | null;
}) {
  const { locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  const dayMonth = (ms: number) => dateFormat(loc, { timeZone: tz, day: "numeric", month: "short" }).format(new Date(ms));
  const shortDay = (ms: number) => dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(ms));
  const degree = (lon: number) => `${formatDegree(lon)} ${signWord(Math.floor((((lon % 360) + 360) % 360) / 30), locale)}`;
  const span = ov.to - ov.from;
  const frac = (ms: number) => Math.min(1, Math.max(0, (ms - ov.from) / span));
  const pct = (x: number) => `${(x * 100).toFixed(3)}%`;
  const today = nowMs >= ov.from && nowMs < ov.to;
  const key = `${civil.year}-${String(civil.month).padStart(2, "0")}-${String(civil.day).padStart(2, "0")}`;

  // The Moon bar.
  const moon = ov.moon;
  const mw = dayMoonWords(ov, locale, time, shortDay);
  const moonId = `moon:${key}`;

  // The hours: every three, at their true place (a day of 23 or 25 hours when the clocks change).
  const hours = [0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({ h, x: frac(utcFromCivil({ ...civil, hour: h, minute: 0 }, tz).getTime()) }));

  const rows = ov.rows.filter((r) => (r.kind === "sky" ? showSky : showYours));
  const windowOf = (r: Extract<DayRow, { kind: "you" }>) =>
    ov.effect.find((w) => w.moving === r.hit.moving && w.type === r.hit.type && w.natal === r.hit.natal) ?? null;

  const skySub = (ev: SkyEvent): string => {
    if (ev.k === "ingress" && ev.body !== "moon") {
      const next = nextEvent(events, ev.t, "ingress", (x) => x.body === ev.body);
      return next ? fill(D.until, locale, { when: dayMonth(next.t) }) : "";
    }
    if (ev.k === "station") {
      const next = nextEvent(events, ev.t, "station", (x) => x.body === ev.body);
      return [degree(ev.lon), next ? fill(D.until, locale, { when: dayMonth(next.t) }) : ""].filter(Boolean).join(" · ");
    }
    return skyEventDetail(ev, locale, degree);
  };
  const youSub = (r: Extract<DayRow, { kind: "you" }>): string => lastsWords(r.hit.moving, windowOf(r), locale, dayMonth);
  const effectDetail = (w: TransitWindow): string => {
    const next = w.passes.find((t) => t >= ov.from);
    if (next != null) return fill(CALENDAR_UI.yours.exactOn, locale, { when: shortDay(next) });
    const last = w.passes[w.passes.length - 1];
    if (last != null) return fill(D.easing, locale, { when: shortDay(last) });
    return fill(D.closest, locale, { orb: formatArc(w.minOrb) });
  };

  return (
    <div className="ulune-cal-day" data-testid="calendar-day">
      <button
        type="button"
        className={cn("ulune-cal-moonbar", selectedId === moonId && "is-on")}
        data-testid="calendar-moonbar"
        aria-pressed={selectedId === moonId}
        onClick={() => onSelect(moonId)}
      >
        {moon ? <MoonGlyph elong={moon.elong} size={48} /> : <span className="ulune-cal-moonbar-blank" aria-hidden />}
        <span className="ulune-cal-moonbar-text">
          <span className="ulune-cal-moonbar-title">{mw.title || pick(CALENDAR_UI.panel.loading, locale)}</span>
          {mw.sign || mw.void ? <span className="ulune-cal-moonbar-line">{[mw.sign, mw.void].filter(Boolean).join(" · ")}</span> : null}
          {mw.phase ? <span className="ulune-cal-moonbar-line">{mw.phase}</span> : null}
        </span>
      </button>

      {num ? (
        <div className="ulune-cal-numday" data-testid="calendar-numday">
          <button
            type="button"
            className={cn("ulune-cal-numbar", selectedId === `numday:${key}` && "is-on")}
            aria-pressed={selectedId === `numday:${key}`}
            onClick={() => onSelect(`numday:${key}`)}
          >
            <span className="ulune-cal-numbar-n" aria-hidden>
              {num.pd}
            </span>
            <span className="ulune-cal-numbar-text">
              <span className="ulune-cal-numbar-title">{fill(CALENDAR_UI.num.personalDay, locale, { n: num.pd })}</span>
              <span className="ulune-cal-numbar-line">
                {fill(CALENDAR_UI.num.personalMonth, locale, { n: num.pm })} · {fill(CALENDAR_UI.num.personalYear, locale, { n: num.py })}
              </span>
            </span>
          </button>
          {num.changes.map((c) => {
            const id = changeId(c);
            return (
              <button
                key={id}
                type="button"
                className={cn("ulune-cal-numbar is-change", selectedId === id && "is-on")}
                aria-pressed={selectedId === id}
                data-testid={`calendar-numday-${c.kind}-${c.index}`}
                onClick={() => onSelect(id)}
              >
                <span className="ulune-cal-numbar-n" aria-hidden>
                  {c.value.number}
                </span>
                <span className="ulune-cal-numbar-text">
                  <span className="ulune-cal-numbar-title">{numChangeTitle(c, locale)}</span>
                  <span className="ulune-cal-numbar-line">{numChangeDetail(c, locale)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="ulune-cal-rail" aria-hidden>
        <div className="ulune-cal-hours">
          {hours.map(({ h, x }) => (
            <span key={h} style={{ left: pct(x) }}>
              {String(h).padStart(2, "0")}
            </span>
          ))}
          <span style={{ left: "100%" }}>24</span>
        </div>
        {showSky
          ? ov.voids.map((v) => {
              const a = frac(v.t);
              const b = frac(v.end);
              return (
                <span key={`v-${v.end}`} className="ulune-cal-voidband" style={{ left: pct(a), width: pct(b - a) }}>
                  <span>{pick(D.voidBand, locale)}</span>
                </span>
              );
            })
          : null}
        {rows.map((r) => (
          <span
            key={r.id}
            className={cn("ulune-cal-tick", r.kind === "you" && "is-you")}
            style={{ left: pct(frac(r.t)), ["--c" as string]: r.kind === "you" ? ASPECT_COLOR[r.hit.type] : undefined }}
            title={`${time(r.t)} ${r.kind === "sky" ? skyEventTitle(r.ev, locale, time, shortDay) : yourAspectWords(r.hit.moving, r.hit.type as SkyAspect, r.hit.natal, locale)}`}
          />
        ))}
        {today ? (
          <span className={cn("ulune-cal-nowline", frac(nowMs) > 0.8 && "is-late")} style={{ left: pct(frac(nowMs)) }}>
            <span>{pick(D.now, locale)}</span>
          </span>
        ) : null}
      </div>

      {rows.length ? (
        <ol className="ulune-cal-agenda" data-testid="calendar-agenda">
          {rows.map((r) => {
            const on = selectedId === r.id;
            const past = today && r.t < nowMs;
            const title = r.kind === "sky" ? skyEventTitle(r.ev, locale, time, shortDay) : yourAspectWords(r.hit.moving, r.hit.type as SkyAspect, r.hit.natal, locale);
            const sub = r.kind === "sky" ? skySub(r.ev) : youSub(r);
            const headline = r.kind === "sky" && (r.ev.k === "eclipse" || r.ev.k === "station" || r.ev.k === "phase" || seasonOf(r.ev) != null);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  data-testid={`calendar-row-${r.kind}`}
                  className={cn("ulune-cal-row", past && "is-past", on && "is-on", headline && "is-headline")}
                  aria-pressed={on}
                  onClick={() => onSelect(r.id)}
                >
                  <time className="ulune-cal-row-time" dateTime={new Date(r.t).toISOString()}>
                    {time(r.t)}
                  </time>
                  <span className="ulune-cal-row-icon">
                    {r.kind === "sky" ? <SkyEventIcon ev={r.ev} size={15} /> : <PairIcon a={r.hit.moving} type={r.hit.type as SkyAspect} b={r.hit.natal} size={15} />}
                  </span>
                  <span className="ulune-cal-row-text">
                    <span className="ulune-cal-row-title">{title}</span>
                    {sub ? <span className="ulune-cal-row-sub">{sub}</span> : null}
                  </span>
                  <span className={cn("ulune-cal-tag", r.kind === "you" && "is-you")}>{pick(r.kind === "sky" ? D.sky : D.you, locale)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="ulune-cal-empty">{pick(D.empty, locale)}</p>
      )}

      {showYours && ov.effect.length ? (
        <section className="ulune-cal-effect" data-testid="calendar-effect" aria-label={pick(D.inEffect, locale)}>
          <h3 className="ulune-cal-effect-h">{pick(D.inEffect, locale)}</h3>
          {ov.effect.map((w) => {
            const id = windowId(w);
            return (
              <button
                key={id}
                type="button"
                className={cn("ulune-cal-effect-line", selectedId === id && "is-on")}
                aria-pressed={selectedId === id}
                data-testid={`calendar-effect-${w.moving}-${w.type}-${w.natal}`}
                onClick={() => onSelect(id)}
              >
                <PairIcon a={w.moving} type={w.type as SkyAspect} b={w.natal} size={13} />
                <span>
                  <b>{yourAspectWords(w.moving, w.type as SkyAspect, w.natal, locale)}</b> · {effectDetail(w)}
                </span>
              </button>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
