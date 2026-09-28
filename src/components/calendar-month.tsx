import { useMemo } from "react";
import { PlanetGlyph, SignGlyph } from "@/components/glyphs";
import { MoonGlyph } from "@/components/moon-glyph";
import { headlineRank, isHeadline, moonAt } from "@/lib/chart/calendar-sky";
import { ASPECT_COLOR, ELEMENT_COLOR, SIGN_META } from "@/lib/chart/constants";
import { seasonOf, skyEventId, type PhaseIndex, type SkyEvent } from "@/lib/chart/sky-events";
import type { SkyWindow } from "@/lib/chart/sky-window";
import { civilKey, daysInMonth, mondayIndex, utcFromCivil, type CivilDate } from "@/lib/chart/timing-window";
import { SIGN_IDS, type TimingHit } from "@/lib/chart/types";
import { CALENDAR_UI, dailyPhaseWord, fill, signWord, skyEventShort, skyEventTitle } from "@/lib/i18n/calendar-words";
import { dateFormat } from "@/lib/intl-cache";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { cn } from "@/lib/utils";

const WEEKDAYS = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  fr: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
};
const PHASE_ELONG: Record<PhaseIndex, number> = { 0: 0, 1: 90, 2: 180, 3: 270 };

type Day = {
  headlines: SkyEvent[];
  moonIngress: Extract<SkyEvent, { k: "ingress" }> | null;
  phase: PhaseIndex | null;
  mine: TimingHit[];
};

function SignMark({ sign, size }: { sign: number; size: number }) {
  const id = SIGN_IDS[((sign % 12) + 12) % 12]!;
  return (
    <span className="ulune-cal-sign" style={{ color: ELEMENT_COLOR[SIGN_META[id].element] }} aria-hidden>
      <SignGlyph id={id} size={size} />
    </span>
  );
}

/** The glyphs of a headline event: the phase drawn, planet → sign, planet ℞, the Sun for a season, an eclipse disc. */
export function SkyEventIcon({ ev, size = 13 }: { ev: SkyEvent; size?: number }) {
  if (ev.k === "phase") return <MoonGlyph elong={PHASE_ELONG[ev.phase]} size={size} />;
  if (ev.k === "eclipse") return <span className={cn("ulune-cal-eclipse", ev.kind === "lunar" && "is-lunar")} style={{ width: size, height: size }} aria-hidden />;
  if (ev.k === "station") {
    return (
      <span className="ulune-cal-icon" aria-hidden>
        <PlanetGlyph id={ev.body} size={size} />
        <span className="ulune-cal-turn">{ev.turn === "rx" ? "℞" : "D"}</span>
      </span>
    );
  }
  if (ev.k === "ingress") {
    if (seasonOf(ev) != null) {
      return (
        <span className="ulune-cal-icon" style={{ color: "var(--aspect-conj)" }} aria-hidden>
          <PlanetGlyph id="sun" size={size} />
        </span>
      );
    }
    return (
      <span className="ulune-cal-icon" aria-hidden>
        <PlanetGlyph id={ev.body} size={size} />
        {ev.rx ? <span className="ulune-cal-turn">℞</span> : null}
        <span className="ulune-cal-arrow">→</span>
        <SignMark sign={ev.sign} size={size - 1} />
      </span>
    );
  }
  return null;
}

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
  const cells: Array<CivilDate | null> = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: count }, (_, i) => ({ year: civil.year, month: civil.month, day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dayName = dateFormat(loc, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));

  return (
    <div data-testid="calendar-month" className="ulune-cal-month">
      <div className="ulune-cal-weekdays" aria-hidden>
        {WEEKDAYS[locale].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="ulune-cal-grid" role="group">
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
          const label = [
            dayName.format(Date.UTC(date.year, date.month - 1, date.day, 12)),
            moonWords,
            ...heads.map((ev) => `${skyEventTitle(ev, locale, time)}, ${time(ev.t)}`),
            mine.length ? fill(CALENDAR_UI.yours.count, locale, { n: mine.length }) : "",
          ]
            .filter(Boolean)
            .join("; ");
          return (
            <button
              key={key}
              type="button"
              data-testid={`calendar-day-${key}`}
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
                <span className="ulune-cal-n">{date.day}</span>
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
              {mine.length ? (
                <span className="ulune-cal-yours" aria-hidden>
                  {mine.slice(0, 4).map((h) => (
                    <span key={h.id} className="ulune-cal-you" style={{ ["--c" as string]: ASPECT_COLOR[h.type] }}>
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

export function CalendarLegend() {
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
        {pick(l.yours, locale)} <i className="ulune-cal-dot" style={{ background: "var(--aspect-conj)" }} /> {pick(l.conj, locale)}{" "}
        <i className="ulune-cal-dot" style={{ background: "var(--aspect-soft)" }} /> {pick(l.soft, locale)}{" "}
        <i className="ulune-cal-dot" style={{ background: "var(--aspect-hard)" }} /> {pick(l.hard, locale)}
      </span>
    </p>
  );
}
