import type { ReactNode } from "react";
import { SkyEventIcon } from "@/components/calendar-month";
import { AspectGlyph, PlanetGlyph } from "@/components/glyphs";
import { MoonGlyph } from "@/components/moon-glyph";
import { headlineRank, isHeadline, moonAt, nextMoonIngress, voidAt, windowWeight } from "@/lib/chart/calendar-sky";
import { ASPECT_COLOR } from "@/lib/chart/constants";
import type { TransitWindow } from "@/lib/chart/personal-transits";
import { skyEventId, type SkyAspect, type SkyEvent } from "@/lib/chart/sky-events";
import type { SkyWindow } from "@/lib/chart/sky-window";
import type { TimingHit } from "@/lib/chart/types";
import {
  CALENDAR_UI,
  dailyPhaseWord,
  fill,
  litWord,
  signWord,
  skyEventDetail,
  skyEventTitle,
  yourAspectWords,
} from "@/lib/i18n/calendar-words";
import { dateFormat } from "@/lib/intl-cache";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { formatDegree, cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

function Line({
  icon,
  title,
  detail,
  id,
  selected,
  onSelect,
  testId,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  id?: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  testId: string;
}) {
  const body = (
    <>
      <span className="ulune-cal-now-icon" aria-hidden>
        {icon}
      </span>
      <span className="ulune-cal-now-text">
        <span className="ulune-cal-now-title">{title}</span>
        {detail ? <span className="ulune-cal-now-detail">{detail}</span> : null}
      </span>
    </>
  );
  if (!id || !onSelect) {
    return (
      <div className="ulune-cal-now-line" data-testid={testId}>
        {body}
      </div>
    );
  }
  return (
    <button type="button" data-testid={testId} className={cn("ulune-cal-now-line", selected && "is-on")} aria-pressed={selected} onClick={() => onSelect(id)}>
      {body}
    </button>
  );
}

function PairIcon({ moving, type, natal }: { moving: string; type: SkyAspect; natal: string }) {
  return (
    <>
      <PlanetGlyph id={moving} size={14} />
      <span style={{ color: ASPECT_COLOR[type] }}>
        <AspectGlyph id={type} size={11} />
      </span>
      <PlanetGlyph id={natal} size={14} />
    </>
  );
}

/**
 * The calendar's side panel with nothing chosen: the Moon now, what is in
 * effect or coming for you, and the sky's next events.
 */
export function CalendarNow({
  nowMs,
  tz,
  events,
  wins,
  hits,
  windows,
  showSky,
  showYours,
  selectedId,
  onSelect,
}: {
  nowMs: number;
  tz: string;
  events: readonly SkyEvent[];
  wins: readonly SkyWindow[];
  hits: readonly TimingHit[];
  windows: readonly TransitWindow[];
  showSky: boolean;
  showYours: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const p = CALENDAR_UI.panel;
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  const dayKey = (ms: number) => dateFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
  const shortDay = (ms: number) => dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(ms));
  const dayMonth = (ms: number) => dateFormat(loc, { timeZone: tz, day: "numeric", month: "short" }).format(new Date(ms));
  const when = (ms: number) => {
    if (dayKey(ms) === dayKey(nowMs)) return pick(CALENDAR_UI.when.today, locale);
    if (dayKey(ms) === dayKey(nowMs + DAY_MS)) return pick(CALENDAR_UI.when.tomorrow, locale);
    return shortDay(ms);
  };
  /** Inside a phrase ("exact tomorrow"): the relative words in lower case, dates as they are. */
  const whenIn = (ms: number) => {
    const w = when(ms);
    return dayKey(ms) === dayKey(nowMs) || dayKey(ms) === dayKey(nowMs + DAY_MS) ? w.charAt(0).toLowerCase() + w.slice(1) : w;
  };
  const degree = (lon: number) => `${formatDegree(lon)} ${signWord(Math.floor((((lon % 360) + 360) % 360) / 30), locale)}`;

  // Now: the Moon.
  const moon = moonAt(wins, nowMs);
  const voidNow = voidAt(events, nowMs);
  const nextIngress = nextMoonIngress(events, nowMs);
  const moonDetail = moon
    ? [
        fill(CALENDAR_UI.moon.inSign, locale, { sign: signWord(moon.sign, locale) }),
        voidNow ? fill(CALENDAR_UI.moon.voidSince, locale, { time: time(voidNow.t) }) : "",
        nextIngress
          ? dayKey(nextIngress.t) === dayKey(nowMs)
            ? fill(CALENDAR_UI.moon.entersAt, locale, { sign: signWord(nextIngress.sign, locale), time: time(nextIngress.t) })
            : fill(CALENDAR_UI.moon.entersOn, locale, { sign: signWord(nextIngress.sign, locale), when: `${whenIn(nextIngress.t)} ${time(nextIngress.t)}` })
          : "",
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  // For you: the slow transits in effect, then the next quick exacts.
  const active = showYours
    ? windows
        .filter((w) => w.from <= nowMs && w.to >= nowMs && w.passes.length)
        .sort((a, b) => windowWeight(b) - windowWeight(a))
        .slice(0, 3)
    : [];
  const slow = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode"]);
  const quick = showYours ? hits.filter((h) => h.moving !== "moon" && !slow.has(h.moving) && Date.parse(h.exactUtc) > nowMs).slice(0, 2) : [];

  // In the sky: the next headline events.
  const sky = showSky
    ? events
        .filter((ev) => isHeadline(ev) && ev.t > nowMs)
        .slice(0, 8)
        .sort((a, b) => a.t - b.t || headlineRank(a) - headlineRank(b))
        .slice(0, 4)
    : [];

  return (
    <section data-testid="timing-hello" className="ulune-cal-now ulune-panel" aria-label={pick(p.now, locale)}>
      <h3 className="ulune-cal-now-kicker">{pick(p.now, locale)}</h3>
      {moon ? (
        <Line
          testId="calendar-now-moon"
          icon={<MoonGlyph elong={moon.elong} size={24} />}
          title={`${dailyPhaseWord(moon.elong, locale)} · ${litWord(moon.lit, locale)}`}
          detail={moonDetail}
        />
      ) : (
        <p className="ulune-cal-now-detail">{pick(p.loading, locale)}</p>
      )}
      {showYours ? (
        <>
          <h3 className="ulune-cal-now-kicker">{pick(p.forYou, locale)}</h3>
          {active.map((w) => {
            const next = w.passes.find((t) => t > nowMs);
            const last = [...w.passes].reverse().find((t) => t <= nowMs);
            const exact = next ?? last!;
            const id = `win:${w.moving}:${w.type}:${w.natal}:${w.from}`;
            return (
              <Line
                key={id}
                testId={`calendar-now-window-${w.moving}-${w.type}-${w.natal}`}
                id={id}
                selected={selectedId === id}
                onSelect={onSelect}
                icon={<PairIcon moving={w.moving} type={w.type as SkyAspect} natal={w.natal} />}
                title={yourAspectWords(w.moving, w.type as SkyAspect, w.natal, locale)}
                detail={`${fill(CALENDAR_UI.yours.exactOn, locale, { when: whenIn(exact) })} · ${fill(CALENDAR_UI.yours.window, locale, { from: dayMonth(w.from), to: dayMonth(w.to) })}`}
              />
            );
          })}
          {quick.map((h) => {
            const id = `timing:${h.id}`;
            return (
              <Line
                key={id}
                testId={`calendar-now-exact-${h.moving}-${h.type}-${h.natal}`}
                id={id}
                selected={selectedId === id}
                onSelect={onSelect}
                icon={<PairIcon moving={h.moving} type={h.type as SkyAspect} natal={h.natal} />}
                title={yourAspectWords(h.moving, h.type as SkyAspect, h.natal, locale)}
                detail={`${when(Date.parse(h.exactUtc))} · ${fill(CALENDAR_UI.yours.exactAt, locale, { time: time(Date.parse(h.exactUtc)) })}`}
              />
            );
          })}
          {!active.length && !quick.length ? <p className="ulune-cal-now-detail">{pick(p.quiet, locale)}</p> : null}
        </>
      ) : null}
      {sky.length ? (
        <>
          <h3 className="ulune-cal-now-kicker">{pick(p.inSky, locale)}</h3>
          {sky.map((ev) => {
            const id = `sky:${skyEventId(ev)}`;
            const extra = skyEventDetail(ev, locale, degree);
            return (
              <Line
                key={id}
                testId={`calendar-now-sky-${ev.k}`}
                id={id}
                selected={selectedId === id}
                onSelect={onSelect}
                icon={<SkyEventIcon ev={ev} size={15} />}
                title={skyEventTitle(ev, locale, time)}
                detail={[`${when(ev.t)} · ${time(ev.t)}`, extra].filter(Boolean).join(" · ")}
              />
            );
          })}
        </>
      ) : null}
    </section>
  );
}
