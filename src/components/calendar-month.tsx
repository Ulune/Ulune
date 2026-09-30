import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { SignMark, SkyEventIcon } from "@/components/calendar-icons";
import { PlanetGlyph } from "@/components/glyphs";
import { MoonGlyph } from "@/components/moon-glyph";
import { headlineRank, isHeadline, moonAt } from "@/lib/chart/calendar-sky";
import { changeId, changesByDay, dayKey, personalDayOn, type NumerologyCalendar } from "@/lib/chart/numerology-calendar";
import { ASPECT_COLOR } from "@/lib/chart/constants";
import { skyEventId, type PhaseIndex, type SkyEvent } from "@/lib/chart/sky-events";
import type { SkyWindow } from "@/lib/chart/sky-window";
import { civilKey, daysInMonth, mondayIndex, utcFromCivil, type CivilDate } from "@/lib/chart/timing-window";
import type { TimingHit } from "@/lib/chart/types";
import { CALENDAR_UI, dailyPhaseWord, fill, numChangeShort, numChangeTitle, signWord, skyEventShort, skyEventTitle } from "@/lib/i18n/calendar-words";
import { dateFormat } from "@/lib/intl-cache";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { cn } from "@/lib/utils";

/** Colour never alone: a joining ring is doubled, a tense one squared, a flowing one round. */
const FAMILY: Record<string, string> = { conjunction: "conj", trine: "soft", sextile: "soft", square: "hard", opposition: "hard" };

const WEEKDAYS = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  fr: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
};

type Day = {
  headlines: SkyEvent[];
  moonIngress: Extract<SkyEvent, { k: "ingress" }> | null;
  phase: PhaseIndex | null;
  mine: TimingHit[];
};

export function CalendarMonth({
  civil,
  tz,
  events,
  wins,
  hits,
  showSky,
  showYours,
  selectedDay,
  todayKey,
  onPickDay,
  onShiftMonth,
  num = null,
}: {
  civil: CivilDate;
  tz: string;
  events: readonly SkyEvent[];
  wins: readonly SkyWindow[];
  hits: readonly TimingHit[];
  showSky: boolean;
  showYours: boolean;
  selectedDay: string | null;
  todayKey: string;
  onPickDay: (day: CivilDate) => void;
  /** Page Up / Page Down: the previous or next month. */
  onShiftMonth?: (dir: 1 | -1) => void;
  /** Your numerology (with your transits on): each day's personal day, a cycle's change on its birthday. */
  num?: NumerologyCalendar | null;
}) {
  const { locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";

  const byDay = useMemo(() => {
    const key = dateFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    const map = new Map<string, Day>();
    const day = (ms: number) => {
      const k = key.format(new Date(ms));
      let d = map.get(k);
      if (!d) {
        d = { headlines: [], moonIngress: null, phase: null, mine: [] };
        map.set(k, d);
      }
      return d;
    };
    for (const ev of events) {
      if (ev.k === "ingress" && ev.body === "moon") day(ev.t).moonIngress = ev;
      if (ev.k === "phase") day(ev.t).phase = ev.phase;
      if (isHeadline(ev)) day(ev.t).headlines.push(ev);
    }
    for (const h of hits) if (h.moving !== "moon") day(Date.parse(h.exactUtc)).mine.push(h);
    for (const d of map.values()) d.headlines.sort((a, b) => headlineRank(a) - headlineRank(b) || a.t - b.t);
    return map;
  }, [events, hits, tz]);

  const first: CivilDate = { year: civil.year, month: civil.month, day: 1 };
  const pad = mondayIndex(first);
  const count = daysInMonth(civil.year, civil.month);
  const changes = useMemo(
    () => (num ? changesByDay(num, dayKey(civil.year, civil.month, 1), dayKey(civil.year, civil.month, count)) : null),
    [num, civil.year, civil.month, count],
  );
  const cells: Array<CivilDate | null> = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: count }, (_, i) => ({ year: civil.year, month: civil.month, day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dayName = dateFormat(loc, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  // One Tab stop for the month (the chosen day, else today, else the 1st); the arrows walk the days
  // (on into the next or last month at an edge), Home and End the week, Page Up and Page Down the months.
  const grid = useRef<HTMLDivElement>(null);
  // After Page Up / Page Down the focus follows into the new month; an arrow past the month's first
  // or last day goes on into the month before or after, to the day it reached.
  const refocus = useRef(false);
  const refocusDay = useRef<number | null>(null);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    const day = refocusDay.current;
    refocusDay.current = null;
    const target = day ? grid.current?.querySelector<HTMLElement>(`[data-day="${day}"]`) : null;
    (target ?? grid.current?.querySelector<HTMLElement>('[tabindex="0"]'))?.focus();
  }, [civil.year, civil.month]);
  const inMonth = (key: string | null) => (key && key.startsWith(`${civil.year}-${String(civil.month).padStart(2, "0")}-`) ? key : null);
  const stop = inMonth(selectedDay) ?? inMonth(todayKey) ?? civilKey(first);
  // The chosen day, else today, in view: on a short screen the last weeks sit below the
  // calendar's fold. Measured from the layout, not the cells' entrance transforms.
  const shownDay = inMonth(selectedDay) ?? inMonth(todayKey);
  useEffect(() => {
    if (!shownDay) return;
    const frame = requestAnimationFrame(() => {
      const cell = grid.current?.querySelector<HTMLElement>(`[data-testid="calendar-day-${shownDay}"]`);
      const box = cell?.closest<HTMLElement>(".ulune-timing-hero");
      if (!cell || !box || box.scrollHeight <= box.clientHeight + 1) return;
      const top = (el: HTMLElement) => {
        let t = 0;
        for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) t += e.offsetTop;
        return t;
      };
      const y = top(cell) - top(box);
      if (y + cell.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = y + cell.offsetHeight - box.clientHeight + 8;
      else if (y < box.scrollTop) box.scrollTop = Math.max(0, y - 8);
    });
    return () => cancelAnimationFrame(frame);
  }, [shownDay, civil.year, civil.month]);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-day]");
    if (!btn) return;
    const day = Number(btn.dataset.day);
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next = day;
    if (e.key in step) next = day + step[e.key]!;
    else if (e.key === "Home") next = day - ((pad + day - 1) % 7);
    else if (e.key === "End") next = day + (6 - ((pad + day - 1) % 7));
    else if ((e.key === "PageUp" || e.key === "PageDown") && onShiftMonth) {
      e.preventDefault();
      refocus.current = true;
      onShiftMonth(e.key === "PageUp" ? -1 : 1);
      return;
    } else return;
    e.preventDefault();
    if (e.key in step && (next < 1 || next > count) && onShiftMonth) {
      // Past the edge: the neighbouring month, on the day the arrow reached.
      const before = new Date(Date.UTC(civil.year, civil.month - 1, 0)).getUTCDate();
      refocus.current = true;
      refocusDay.current = next < 1 ? before + next : next - count;
      onShiftMonth(next < 1 ? -1 : 1);
      return;
    }
    next = Math.min(count, Math.max(1, next));
    grid.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus();
  };
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));

  return (
    <div data-testid="calendar-month" className="ulune-cal-month">
      <div className="ulune-cal-weekdays" aria-hidden>
        {WEEKDAYS[locale].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div ref={grid} className="ulune-cal-grid" role="group" aria-label={dateFormat(loc, { timeZone: "UTC", month: "long", year: "numeric" }).format(Date.UTC(civil.year, civil.month - 1, 1, 12))} onKeyDown={onKey}>
        {cells.map((date, i) => {
          if (!date) return <span key={`e-${i}`} className="ulune-cal-cell is-empty" aria-hidden />;
          const key = civilKey(date);
          const d = byDay.get(key);
          const moon = moonAt(wins, utcFromCivil({ ...date, hour: 12, minute: 0 }, tz).getTime());
          const heads = showSky ? (d?.headlines ?? []) : [];
          const mine = showYours ? (d?.mine ?? []) : [];
          const ingress = d?.moonIngress ?? null;
          const signs = ingress ? (
            <>
              <SignMark sign={(ingress.sign + 11) % 12} size={12} />
              <span className="ulune-cal-arrow">›</span>
              <SignMark sign={ingress.sign} size={12} />
            </>
          ) : moon ? (
            <SignMark sign={moon.sign} size={12} />
          ) : null;
          // Spoken: the day, its Moon (the phase word only when no exact phase falls that day:
          // the phase is then said with its time among the events), the events, your count.
          const moonWords = moon
            ? [
                d?.phase == null ? dailyPhaseWord(moon.elong, locale) : "",
                ingress
                  ? fill(CALENDAR_UI.moon.inSignThen, locale, { sign: signWord((ingress.sign + 11) % 12, locale), next: signWord(ingress.sign, locale), time: time(ingress.t) })
                  : fill(CALENDAR_UI.moon.inSign, locale, { sign: signWord(moon.sign, locale) }),
              ]
                .filter(Boolean)
                .join(", ")
            : "";
          const pd = num ? personalDayOn(num, date.year, date.month, date.day) : null;
          const turns = changes?.get(key) ?? [];
          const label = [
            dayName.format(Date.UTC(date.year, date.month - 1, date.day, 12)),
            moonWords,
            ...heads.map((ev) => `${skyEventTitle(ev, locale, time)}, ${time(ev.t)}`),
            mine.length ? fill(CALENDAR_UI.yours.count, locale, { n: mine.length }) : "",
            pd != null ? fill(CALENDAR_UI.num.cellDay, locale, { n: pd }) : "",
            ...turns.map((c) => numChangeTitle(c, locale)),
          ]
            .filter(Boolean)
            .join("; ");
          return (
            <button
              key={key}
              type="button"
              data-testid={`calendar-day-${key}`}
              data-day={date.day}
              tabIndex={key === stop ? 0 : -1}
              data-mine={mine.length}
              data-sky={heads.length}
              aria-label={label}
              aria-pressed={selectedDay === key}
              aria-current={todayKey === key ? "date" : undefined}
              onClick={() => onPickDay(date)}
              className={cn("ulune-cal-cell", selectedDay === key && "is-on", todayKey === key && "is-today")}
              style={{ ["--enter" as string]: i }}
            >
              <span className="ulune-cal-top">
                <span className="ulune-cal-n">
                  {date.day}
                  {pd != null ? <sup className="ulune-cal-pd">{pd}</sup> : null}
                </span>
                <span className="ulune-cal-moon">
                  <span className="ulune-cal-signs">{signs}</span>
                  {moon ? <MoonGlyph elong={moon.elong} size={17} /> : null}
                </span>
              </span>
              {heads.length ? (
                <span className="ulune-cal-sky">
                  {heads.slice(0, 3).map((ev) => (
                    <span key={skyEventId(ev)} className="ulune-cal-line">
                      <SkyEventIcon ev={ev} />
                      <span className="ulune-cal-word">{skyEventShort(ev, locale)}</span>
                    </span>
                  ))}
                  {heads.length > 3 ? (
                    <span className="ulune-cal-line ulune-cal-more">{fill(CALENDAR_UI.yours.more, locale, { n: heads.length - 3 })}</span>
                  ) : null}
                </span>
              ) : null}
              {turns.length ? (
                <span className="ulune-cal-turns" aria-hidden>
                  {turns.map((c) => (
                    <span key={changeId(c)} className="ulune-cal-turn-n" data-testid={`calendar-numchange-${c.kind}-${c.index}`}>
                      {numChangeShort(c, locale)}
                    </span>
                  ))}
                </span>
              ) : null}
              {mine.length ? (
                <span className="ulune-cal-yours" aria-hidden>
                  {mine.slice(0, 4).map((h) => (
                    <span key={h.id} className="ulune-cal-you" data-family={FAMILY[h.type] ?? "minor"} style={{ ["--c" as string]: ASPECT_COLOR[h.type] }}>
                      <PlanetGlyph id={h.moving} size={12} />
                    </span>
                  ))}
                  {mine.length > 4 ? <span className="ulune-cal-more">+{mine.length - 4}</span> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarLegend({ num = false }: { num?: boolean }) {
  const { locale } = useI18n();
  const l = CALENDAR_UI.legend;
  return (
    <p className="ulune-cal-legend" data-testid="calendar-legend">
      <span>
        <MoonGlyph elong={120} size={13} /> {pick(l.moon, locale)}
      </span>
      <span>
        <MoonGlyph elong={270} size={13} /> {pick(l.phase, locale)}
      </span>
      <span>
        <span className="ulune-cal-icon" aria-hidden>
          <PlanetGlyph id="mars" size={12} />
          <span className="ulune-cal-arrow">→</span>
          <SignMark sign={4} size={11} />
        </span>{" "}
        {pick(l.ingress, locale)}
      </span>
      <span>
        <span className="ulune-cal-icon" aria-hidden>
          <PlanetGlyph id="venus" size={12} />
          <span className="ulune-cal-turn">℞</span>
        </span>{" "}
        {pick(l.station, locale)}
      </span>
      <span>
        {pick(l.yours, locale)} <i className="ulune-cal-dot" data-family="conj" style={{ background: "var(--aspect-conj)" }} /> {pick(l.conj, locale)}{" "}
        <i className="ulune-cal-dot" data-family="soft" style={{ background: "var(--aspect-soft)" }} /> {pick(l.soft, locale)}{" "}
        <i className="ulune-cal-dot" data-family="hard" style={{ background: "var(--aspect-hard)" }} /> {pick(l.hard, locale)}
      </span>
      {num ? (
        <>
          <span data-testid="calendar-legend-num">
            <span className="ulune-cal-n" aria-hidden>
              6<sup className="ulune-cal-pd">3</sup>
            </span>{" "}
            {pick(CALENDAR_UI.num.legend, locale)}
          </span>
          <span>
            <i className="ulune-cal-dot" style={{ background: "var(--color-halo)" }} /> {pick(CALENDAR_UI.num.legendTurn, locale)}
          </span>
        </>
      ) : null}
    </p>
  );
}
