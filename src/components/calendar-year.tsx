import { useEffect, useRef, useState } from "react";
import { PairIcon, SignMark } from "@/components/calendar-icons";
import { PlanetGlyph } from "@/components/glyphs";
import { MoonGlyph } from "@/components/moon-glyph";
import { windowId } from "@/lib/chart/calendar-sky";
import { headlineTransits, type YearLayout, type YearTransit } from "@/lib/chart/calendar-year";
import { changeId, changesBetween, dayKey, personalMonthOn, personalYearOn, type NumerologyCalendar } from "@/lib/chart/numerology-calendar";
import { utcFromCivil } from "@/lib/chart/timing-window";
import { ASPECT_COLOR, ELEMENT_COLOR, SIGN_META } from "@/lib/chart/constants";
import { skyEventId, type SkyAspect, type SkyEvent } from "@/lib/chart/sky-events";
import { SIGN_IDS } from "@/lib/chart/types";
import { bodyLabel } from "@/lib/i18n/astro";
import { CALENDAR_UI, fill, numChangeDetail, numChangeTitle, phaseWord, signWord, skyEventTitle, yourAspectWords } from "@/lib/i18n/calendar-words";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { dateFormat } from "@/lib/intl-cache";
import { cn } from "@/lib/utils";

const Y = CALENDAR_UI.year;

/**
 * The calendar's year (part 57 of the launch plan). Wide: a timeline to
 * scale (the Moon's new and full phases and the eclipses, the seasons, each
 * planet's signs with its retrograde stretches hatched, your big transits as
 * bars while within 1° with a tick per exact pass) and, with your
 * numerology, a band per personal month (part 62). Narrow: a card per
 * month. The container decides which shows (timing.css).
 */
export function CalendarYear({
  layout,
  tz,
  nowMs,
  showSky,
  showYours,
  selectedId,
  onSelect,
  onOpenMonth,
  num = null,
}: {
  layout: YearLayout;
  tz: string;
  nowMs: number;
  showSky: boolean;
  showYours: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Open a month (1–12) of the year in the month view. */
  onOpenMonth: (month: number) => void;
  /** Your numerology (with your transits on): the personal months, a long cycle changing on a birthday. */
  num?: NumerologyCalendar | null;
}) {
  const props = { layout, tz, nowMs, showSky, showYours, selectedId, onSelect, onOpenMonth, num };
  return (
    <div className="ulune-cal-year" data-testid="calendar-year">
      <YearTimeline {...props} />
      <YearMonths {...props} />
    </div>
  );
}

type Props = Parameters<typeof CalendarYear>[0];

function useFormats(tz: string) {
  const { locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  return {
    locale,
    time: (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms)),
    dayMonth: (ms: number) => dateFormat(loc, { timeZone: tz, day: "numeric", month: "short" }).format(new Date(ms)),
    day: (ms: number) => dateFormat("en-GB", { timeZone: tz, day: "numeric" }).format(new Date(ms)),
    month: (ms: number, style: "short" | "long") => dateFormat(loc, { timeZone: tz, month: style }).format(new Date(ms)),
  };
}

/** The widest stretch of a sign's time that no retrograde stretch covers (the whole of it when none does). */
function openStretch(seg: { from: number; to: number }, retro: { from: number; to: number }[]) {
  let parts = [{ from: seg.from, to: seg.to }];
  for (const r of retro) {
    parts = parts.flatMap((p) =>
      r.to <= p.from || r.from >= p.to
        ? [p]
        : [
            ...(r.from > p.from ? [{ from: p.from, to: r.from }] : []),
            ...(r.to < p.to ? [{ from: r.to, to: p.to }] : []),
          ],
    );
  }
  return parts.reduce((best, p) => (p.to - p.from > best.to - best.from ? p : best), { from: seg.from, to: seg.from });
}

/** The long cycles changing in the year, each with the noon of its birthday in the calendar's clock. */
function yearChanges(num: NumerologyCalendar | null | undefined, year: number, tz: string) {
  if (!num) return [];
  return changesBetween(num, dayKey(year, 1, 1), dayKey(year, 12, 31)).map((c) => {
    const [y, m, d] = c.day.split("-").map(Number) as [number, number, number];
    return { c, t: utcFromCivil({ year: y, month: m, day: d, hour: 12, minute: 0 }, tz).getTime() };
  });
}

function YearTimeline({ layout, tz, nowMs, showSky, showYours, selectedId, onSelect, onOpenMonth, num }: Props) {
  const f = useFormats(tz);
  const { locale } = f;
  const [all, setAll] = useState(false);
  const span = layout.to - layout.from;
  const x = (ms: number) => Math.min(1, Math.max(0, (ms - layout.from) / span));
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  const shown = all ? layout.transits : headlineTransits(layout.transits);
  const more = layout.transits.length - shown.length;
  const title = (ev: SkyEvent) => `${skyEventTitle(ev, locale, f.time)} · ${f.dayMonth(ev.t)} ${f.time(ev.t)}`;
  const today = nowMs >= layout.from && nowMs < layout.to;
  const mark = (ev: SkyEvent, className: string, children: React.ReactNode, label?: string) => {
    const id = `sky:${skyEventId(ev)}`;
    return (
      <button
        key={id}
        type="button"
        tabIndex={-1}
        className={cn(className, selectedId === id && "is-on")}
        style={{ left: pct(x(ev.t)) }}
        title={title(ev)}
        aria-label={title(ev)}
        onClick={() => onSelect(id)}
      >
        {children}
        {label ? <small>{label}</small> : null}
      </button>
    );
  };
  return (
    <div className="ulune-cal-tl" data-testid="calendar-timeline">
      <div className="ulune-cal-tl-row ulune-cal-tl-axis" aria-hidden>
        <span />
        <span className="ulune-cal-tl-track">
          {layout.months.slice(0, 12).map((m, i) => (
            <button key={m} type="button" tabIndex={-1} style={{ left: pct(x(m)) }} onClick={() => onOpenMonth(i + 1)}>
              {f.month(m + 43_200_000, "short").replace(".", "")}
            </button>
          ))}
        </span>
      </div>
      {showSky ? (
        <>
          <div className="ulune-cal-tl-row is-moon">
            <span className="ulune-cal-tl-label">
              <MoonGlyph elong={180} size={13} /> {pick(Y.moonRow, locale)}
            </span>
            <span className="ulune-cal-tl-track">
              {layout.phases.map((ev) => mark(ev, "ulune-cal-tl-phase", <MoonGlyph elong={ev.phase === 0 ? 0 : 180} size={11} />))}
              {layout.eclipses.map((ev) =>
                ev.k === "eclipse"
                  ? mark(ev, cn("ulune-cal-tl-eclipse", ev.kind === "lunar" && "is-lunar"), <span className={cn("ulune-cal-eclipse", ev.kind === "lunar" && "is-lunar")} style={{ width: 15, height: 15 }} />, f.dayMonth(ev.t))
                  : null,
              )}
            </span>
          </div>
          <div className="ulune-cal-tl-row is-seasons">
            <span className="ulune-cal-tl-label">
              <span style={{ color: "var(--aspect-conj)" }}>
                <PlanetGlyph id="sun" size={13} />
              </span>{" "}
              {pick(Y.seasons, locale)}
            </span>
            <span className="ulune-cal-tl-track">
              {layout.seasons.map((ev) =>
                mark(
                  ev,
                  "ulune-cal-tl-season",
                  <span style={{ color: "var(--aspect-conj)" }}>
                    <PlanetGlyph id="sun" size={11} />
                  </span>,
                  f.dayMonth(ev.t),
                ),
              )}
            </span>
          </div>
          {layout.bodies.map((b) => (
            <div key={b.body} className="ulune-cal-tl-row" data-body={b.body}>
              <span className="ulune-cal-tl-label">
                <PlanetGlyph id={b.body} size={13} /> {bodyLabel(b.body, locale)}
              </span>
              <span className="ulune-cal-tl-track is-bands">
                {b.segments.map((s) => {
                  const w = x(s.to) - x(s.from);
                  const id = SIGN_IDS[s.sign]!;
                  const free = openStretch(s, b.retro);
                  const room = x(free.to) - x(free.from);
                  return (
                    <span
                      key={s.from}
                      className="ulune-cal-tl-sign"
                      style={{ left: pct(x(s.from)), width: pct(w), ["--el" as string]: ELEMENT_COLOR[SIGN_META[id].element] }}
                      title={`${bodyLabel(b.body, locale)} · ${f.dayMonth(s.from)} – ${f.dayMonth(s.to)}`}
                    >
                      {room > 0.035 ? (
                        <span className="ulune-cal-tl-signat" style={{ left: pct((x((free.from + free.to) / 2) - x(s.from)) / w) }}>
                          <SignMark sign={s.sign} size={12} />
                        </span>
                      ) : null}
                    </span>
                  );
                })}
                {b.retro.map((r) => (
                  <span key={r.from} className="ulune-cal-tl-rx" style={{ left: pct(x(r.from)), width: pct(x(r.to) - x(r.from)) }} title={`℞ ${f.dayMonth(r.from)} – ${f.dayMonth(r.to)}`}>
                    {x(r.to) - x(r.from) > 0.02 ? <i>℞</i> : null}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </>
      ) : null}
      {showYours && num ? <NumLane layout={layout} tz={tz} num={num} x={x} pct={pct} selectedId={selectedId} onSelect={onSelect} /> : null}
      {showYours ? (
        <>
          <p className="ulune-cal-tl-sect">{pick(Y.yoursHead, locale)}</p>
          {shown.length ? (
            shown.map((t) => <TransitRow key={t.key} t={t} x={x} pct={pct} selectedId={selectedId} onSelect={onSelect} dayMonth={f.dayMonth} />)
          ) : (
            <p className="ulune-cal-empty">{pick(layout.ready ? Y.none : CALENDAR_UI.panel.loading, locale)}</p>
          )}
          {more > 0 || all ? (
            <button type="button" className="ulune-cal-chip ulune-cal-tl-more" data-testid="calendar-year-all" aria-expanded={all} onClick={() => setAll(!all)}>
              {all ? pick(Y.fewer, locale) : fill(Y.all, locale, { n: layout.transits.length })}
            </button>
          ) : null}
        </>
      ) : null}
      {today ? (
        <span className="ulune-cal-tl-today" style={{ ["--x" as string]: x(nowMs) }} aria-hidden>
          <span>{pick(CALENDAR_UI.when.today, locale).toLowerCase()}</span>
        </span>
      ) : null}
    </div>
  );
}

/** Numerology's lane: a band per personal month, a mark on a birthday where a long cycle changes, and those changes. */
function NumLane({
  layout,
  tz,
  num,
  x,
  pct,
  selectedId,
  onSelect,
}: {
  layout: YearLayout;
  tz: string;
  num: NumerologyCalendar;
  x: (ms: number) => number;
  pct: (v: number) => string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const f = useFormats(tz);
  const { locale } = f;
  const year = layout.year;
  const changes = yearChanges(num, year, tz);
  const days = [...new Set(changes.map((r) => r.t))];
  return (
    <>
      <p className="ulune-cal-tl-sect">{pick(CALENDAR_UI.num.yearHead, locale)}</p>
      <div className="ulune-cal-tl-row is-num" data-testid="calendar-year-num">
        <span className="ulune-cal-tl-label">
          <span className="ulune-cal-numbadge" aria-hidden>
            {personalYearOn(num, year)}
          </span>
          <span>{pick(CALENDAR_UI.num.lane, locale)}</span>
        </span>
        <span className="ulune-cal-tl-track">
          <span className="ulune-cal-tl-numbands">
            {layout.months.slice(0, 12).map((m, i) => {
              const pm = personalMonthOn(num, year, i + 1);
              const id = `nummonth:${year}-${String(i + 1).padStart(2, "0")}`;
              const label = `${f.month(m + 43_200_000, "long")}: ${fill(CALENDAR_UI.num.personalMonth, locale, { n: pm }).toLowerCase()}`;
              return (
                <button
                  key={m}
                  type="button"
                  tabIndex={-1}
                  className={cn("ulune-cal-tl-pm", selectedId === id && "is-on")}
                  style={{ left: pct(x(m)), width: pct(x(layout.months[i + 1]!) - x(m)) }}
                  title={label}
                  aria-label={label}
                  data-testid={`calendar-year-pm-${i + 1}`}
                  onClick={() => onSelect(id)}
                >
                  {pm}
                </button>
              );
            })}
          </span>
          {days.map((t) => (
            <span key={t} className="ulune-cal-tl-numturn" style={{ left: pct(x(t)) }} aria-hidden />
          ))}
        </span>
      </div>
      {changes.length ? (
        <div className="ulune-cal-tl-row is-numturns">
          <span />
          <span className="ulune-cal-tl-numchips">
            {changes.map(({ c, t }) => {
              const id = changeId(c);
              return (
                <button
                  key={id}
                  type="button"
                  className={cn("ulune-cal-chip ulune-cal-mchip", selectedId === id && "is-on")}
                  aria-pressed={selectedId === id}
                  data-testid={`calendar-year-numchange-${c.kind}-${c.index}`}
                  title={numChangeDetail(c, locale)}
                  onClick={() => onSelect(id)}
                >
                  <span className="ulune-cal-numbadge" aria-hidden>
                    {c.value.number}
                  </span>
                  <span>
                    {numChangeTitle(c, locale)} · {f.dayMonth(t)}
                  </span>
                </button>
              );
            })}
          </span>
        </div>
      ) : null}
    </>
  );
}

function TransitRow({
  t,
  x,
  pct,
  selectedId,
  onSelect,
  dayMonth,
}: {
  t: YearTransit;
  x: (ms: number) => number;
  pct: (v: number) => string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  dayMonth: (ms: number) => string;
}) {
  const { locale } = useI18n();
  const first = t.windows[0]!;
  const id = windowId(first);
  const words = yourAspectWords(t.moving, t.type as SkyAspect, t.natal, locale);
  const exact = t.passes.length ? fill(CALENDAR_UI.yours.exactOn, locale, { when: t.passes.map(dayMonth).join(", ") }) : pick(Y.nearMiss, locale);
  const on = t.windows.some((w) => selectedId === windowId(w));
  return (
    <div className="ulune-cal-tl-row is-yours">
      <button type="button" className={cn("ulune-cal-tl-label ulune-cal-tl-you", on && "is-on")} aria-pressed={on} aria-label={`${words}, ${exact}`} onClick={() => onSelect(id)} data-testid={`calendar-year-transit-${t.moving}-${t.type}-${t.natal}`}>
        <PairIcon a={t.moving} type={t.type as SkyAspect} b={t.natal} size={12} />
        <span>
          {bodyLabel(t.moving, locale)} · {bodyLabel(t.natal, locale)}
        </span>
      </button>
      <span className="ulune-cal-tl-track" aria-hidden>
        {t.windows.map((w) => (
          <span key={w.from} className="ulune-cal-tl-win" style={{ left: pct(x(w.from)), width: pct(Math.max(0.004, x(w.to) - x(w.from))), ["--c" as string]: ASPECT_COLOR[t.type] }} />
        ))}
        {t.passes.map((p) => (
          <span key={p} className="ulune-cal-tl-pass" style={{ left: pct(x(p)) }} />
        ))}
      </span>
    </div>
  );
}

/** A phone's year: a card per month with its sky and your big transits. */
function YearMonths({ layout, tz, nowMs, showSky, showYours, selectedId, onSelect, onOpenMonth, num }: Props) {
  const f = useFormats(tz);
  const { locale } = f;
  const shownTransits = headlineTransits(layout.transits, 99);
  const numChanges = showYours ? yearChanges(num, layout.year, tz) : [];
  // On a phone the year opens on the current month (the stage scrolls, not the page), and
  // stays on it while the year's sky and your transits arrive, until the reader scrolls.
  const list = useRef<HTMLOListElement>(null);
  const placed = useRef<{ year: number; top: number } | null>(null);
  useEffect(() => {
    const el = list.current;
    if (!el || getComputedStyle(el).display === "none") return;
    const card = el.querySelector<HTMLElement>(".is-now");
    let box: HTMLElement | null = el.parentElement;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    if (!card || !box) return;
    const last = placed.current;
    if (last && last.year === layout.year && Math.abs(box.scrollTop - last.top) > 2) return;
    box.scrollTop += card.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
    placed.current = { year: layout.year, top: box.scrollTop };
  }, [layout.year, layout.transits.length, layout.phases.length, layout.stations.length]);
  return (
    <ol ref={list} className="ulune-cal-months" data-testid="calendar-year-months">
      {layout.months.slice(0, 12).map((m, i) => {
        const end = layout.months[i + 1]!;
        const inMonth = (t: number) => t >= m && t < end;
        const sky: SkyEvent[] = showSky
          ? [
              ...layout.stations,
              ...layout.ingresses.filter((ev) => ev.k === "ingress" && !["sun", "mercury", "venus"].includes(ev.body)),
              ...layout.seasons,
              ...layout.phases,
              ...layout.eclipses,
            ]
              .filter((ev) => inMonth(ev.t))
              .sort((a, b) => a.t - b.t)
          : [];
        const yours = showYours
          ? shownTransits
              .map((t) => ({ t, days: t.passes.filter(inMonth) }))
              .filter((r) => r.days.length)
          : [];
        const current = nowMs >= m && nowMs < end;
        const pm = showYours && num ? personalMonthOn(num, layout.year, i + 1) : null;
        const pmId = `nummonth:${layout.year}-${String(i + 1).padStart(2, "0")}`;
        const turns = numChanges.filter((r) => inMonth(r.t));
        return (
          <li key={m} className={cn("ulune-cal-monthcard", current && "is-now")} data-testid={`calendar-year-month-${i + 1}`}>
            <h3 className="ulune-cal-monthcard-h">
              <button type="button" onClick={() => onOpenMonth(i + 1)}>
                {f.month(m + 43_200_000, "long").replace(/^./, (c) => c.toUpperCase())}
              </button>
            </h3>
            {sky.length || pm != null ? (
              <span className="ulune-cal-monthcard-chips">
                {pm != null ? (
                  <button
                    type="button"
                    className={cn("ulune-cal-chip ulune-cal-mchip ulune-cal-pmchip", selectedId === pmId && "is-on")}
                    data-testid={`calendar-year-card-pm-${i + 1}`}
                    onClick={() => onSelect(pmId)}
                  >
                    <span className="ulune-cal-numbadge" aria-hidden>
                      {pm}
                    </span>
                    <span>{fill(CALENDAR_UI.num.personalMonth, locale, { n: pm })}</span>
                  </button>
                ) : null}
                {sky.map((ev) => {
                  const id = `sky:${skyEventId(ev)}`;
                  return (
                    <button key={id} type="button" className={cn("ulune-cal-chip ulune-cal-mchip", selectedId === id && "is-on")} aria-label={`${skyEventTitle(ev, locale, f.time)}, ${f.dayMonth(ev.t)}`} onClick={() => onSelect(id)}>
                      <ChipFace ev={ev} locale={locale} />
                      <span>{f.day(ev.t)}</span>
                    </button>
                  );
                })}
              </span>
            ) : null}
            {turns.map(({ c, t }) => {
              const id = changeId(c);
              return (
                <button key={id} type="button" className={cn("ulune-cal-effect-line is-num", selectedId === id && "is-on")} data-testid={`calendar-year-card-numchange-${c.kind}-${c.index}`} onClick={() => onSelect(id)}>
                  <span className="ulune-cal-numbadge" aria-hidden>
                    {c.value.number}
                  </span>
                  <span>
                    <b>{numChangeTitle(c, locale)}</b> · {f.day(t)}
                  </span>
                </button>
              );
            })}
            {yours.map(({ t, days }) => {
              const id = windowId(t.windows[0]!);
              return (
                <button key={t.key} type="button" className={cn("ulune-cal-effect-line", selectedId === id && "is-on")} onClick={() => onSelect(id)}>
                  <PairIcon a={t.moving} type={t.type as SkyAspect} b={t.natal} size={12} />
                  <span>
                    <b>{yourAspectWords(t.moving, t.type as SkyAspect, t.natal, locale)}</b> · {days.map(f.day).join(", ")}
                  </span>
                </button>
              );
            })}
          </li>
        );
      })}
    </ol>
  );
}

function ChipFace({ ev, locale }: { ev: SkyEvent; locale: "en" | "fr" }) {
  if (ev.k === "phase") return <MoonGlyph elong={ev.phase * 90} size={11} title={phaseWord(ev.phase, locale)} />;
  if (ev.k === "eclipse") {
    return (
      <>
        <span className={cn("ulune-cal-eclipse", ev.kind === "lunar" && "is-lunar")} style={{ width: 11, height: 11 }} aria-hidden />
        <span>{pick(CALENDAR_UI.sky.eclipseType[ev.type], locale).toLowerCase()}</span>
      </>
    );
  }
  if (ev.k === "station") {
    return (
      <span className="ulune-cal-icon" aria-hidden>
        <PlanetGlyph id={ev.body} size={11} />
        <span className="ulune-cal-turn">{ev.turn === "rx" ? "℞" : "D"}</span>
      </span>
    );
  }
  if (ev.k === "ingress" && ev.body === "sun" && ev.sign % 3 === 0) {
    const word = pick(ev.sign % 6 === 0 ? CALENDAR_UI.sky.short.equinox : CALENDAR_UI.sky.short.solstice, locale).toLowerCase();
    return (
      <>
        <span style={{ color: "var(--aspect-conj)" }} aria-hidden>
          <PlanetGlyph id="sun" size={11} />
        </span>
        <span>{word}</span>
      </>
    );
  }
  if (ev.k === "ingress") {
    return (
      <span className="ulune-cal-icon" aria-hidden>
        <PlanetGlyph id={ev.body} size={11} />
        {ev.rx ? <span className="ulune-cal-turn">℞</span> : null}
        <span className="ulune-cal-arrow">→</span>
        <SignMark sign={ev.sign} size={10} />
      </span>
    );
  }
  return null;
}

/** The side panel of the year with nothing chosen: the year's sky in a few lines, and your year. */
export function CalendarYearPanel({
  layout,
  tz,
  showSky,
  showYours,
  selectedId,
  onSelect,
  num = null,
}: {
  layout: YearLayout;
  tz: string;
  showSky: boolean;
  showYours: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  num?: NumerologyCalendar | null;
}) {
  const f = useFormats(tz);
  const { locale } = f;
  const linkTo = (id: string, text: string) => (
    <button key={id} type="button" className={cn("ulune-cal-inline", selectedId === id && "is-on")} onClick={() => onSelect(id)}>
      {text}
    </button>
  );
  const link = (ev: SkyEvent, text: string) => linkTo(`sky:${skyEventId(ev)}`, text);
  /** Items with commas between them, each comma kept on the line of the item before it. */
  const join = (items: React.ReactNode[]) => {
    const list = items.filter(Boolean);
    return list.flatMap((it, i) =>
      i < list.length - 1
        ? [
            <span key={`j${i}`} className="whitespace-nowrap">
              {it},
            </span>,
            " ",
          ]
        : [it],
    );
  };
  // Retrograde stretches of Mercury, Venus and Mars that start in the year.
  const retro = (["mercury", "venus", "mars"] as const)
    .map((body) => {
      const rx = layout.stations.filter((s) => s.k === "station" && s.body === body && s.turn === "rx");
      return rx.length
        ? {
            body,
            spans: rx.map((s) => {
              const back = layout.bodies.find((b) => b.body === body)?.retro.find((r) => r.from === s.t);
              return link(s, `${f.dayMonth(s.t)}–${back ? f.dayMonth(back.to) : "…"}`);
            }),
          }
        : null;
    })
    .filter(Boolean) as Array<{ body: string; spans: React.ReactNode[] }>;
  const slow = layout.ingresses.filter((ev) => ev.k === "ingress" && ["jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"].includes(ev.body) && !ev.rx);
  const top = layout.transits.filter((t) => t.passes.length).slice(0, 6);
  const rest = layout.transits.length - top.length;
  return (
    <section data-testid="timing-hello" className="ulune-cal-now ulune-panel ulune-cal-yearpanel" aria-label={fill(Y.inSky, locale, { year: layout.year })}>
      {showSky ? (
        <>
          <h3 className="ulune-cal-now-kicker">{fill(Y.inSky, locale, { year: layout.year })}</h3>
          {layout.eclipses.length ? (
            <p className="ulune-cal-yearline">
              <b>{fill(Y.eclipses, locale, { n: layout.eclipses.length })}</b>
              {locale === "fr" ? "\u202f: " : ": "}
              {join(layout.eclipses.map((ev) => link(ev, `${skyEventTitle(ev, locale, f.time).toLowerCase()} ${f.dayMonth(ev.t)}`)))}
            </p>
          ) : null}
          {retro.map((r) => (
            <p key={r.body} className="ulune-cal-yearline">
              <b>{fill(Y.retro, locale, { body: bodyLabel(r.body, locale) })}</b>
              {locale === "fr" ? "\u202f: " : ": "}
              {join(r.spans)}
            </p>
          ))}
          {slow.length ? (
            <p className="ulune-cal-yearline">
              <b>{pick(Y.signs, locale)}</b>
              {locale === "fr" ? "\u202f: " : ": "}
              {join(
                slow.map((ev) =>
                  ev.k === "ingress" ? link(ev, fill(Y.into, locale, { body: bodyLabel(ev.body, locale), sign: signWord(ev.sign, locale), when: f.dayMonth(ev.t) })) : null,
                ),
              )}
            </p>
          ) : null}
        </>
      ) : null}
      {showYours ? (
        <>
          <h3 className="ulune-cal-now-kicker">{pick(Y.yourYear, locale)}</h3>
          {num ? (
            <p className="ulune-cal-yearline" data-testid="calendar-yearpanel-num">
              {linkTo(`numyear:${layout.year}`, fill(CALENDAR_UI.num.personalYear, locale, { n: personalYearOn(num, layout.year) }))}
              {yearChanges(num, layout.year, tz).map(({ c, t }) => (
                <span key={changeId(c)}>
                  {" · "}
                  {linkTo(changeId(c), `${numChangeTitle(c, locale)}, ${f.dayMonth(t)}`)}
                </span>
              ))}
            </p>
          ) : null}
          {top.length ? (
            top.map((t) => {
              const id = windowId(t.windows[0]!);
              return (
                <button key={t.key} type="button" className={cn("ulune-cal-effect-line", selectedId === id && "is-on")} aria-pressed={selectedId === id} onClick={() => onSelect(id)}>
                  <PairIcon a={t.moving} type={t.type as SkyAspect} b={t.natal} size={13} />
                  <span>
                    <b>{yourAspectWords(t.moving, t.type as SkyAspect, t.natal, locale)}</b> · {fill(CALENDAR_UI.yours.exactOn, locale, { when: t.passes.map(f.dayMonth).join(", ") })}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="ulune-cal-now-detail">{pick(layout.ready ? Y.none : CALENDAR_UI.panel.loading, locale)}</p>
          )}
          {rest > 0 ? <p className="ulune-cal-now-detail">{fill(Y.more, locale, { n: rest })}</p> : null}
        </>
      ) : null}
    </section>
  );
}

