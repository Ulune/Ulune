import { Cake } from "lucide-react";
import type { ReactNode } from "react";
import { PlanetGlyph } from "@/components/glyphs";
import type { PeopleKind, PersonEvent } from "@/lib/chart/calendar-people";
import { cpWord } from "@/lib/i18n/catalog/calendar-people-words";
import { dayShort, loc, personDetail, personShort, personTitle } from "@/lib/i18n/calendar-people-text";
import { useI18n } from "@/lib/i18n/locale";
import { dateFormat } from "@/lib/intl-cache";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import "./calendar-people.css";

export { eventsOfDay, peopleEvents, peopleOfGroup } from "@/lib/chart/calendar-people";
export { peopleIcsWords, personDetail, personIcsItem, personReading, personShort, personTitle } from "@/lib/i18n/calendar-people-text";

/*
 * The Calendar's birthdays and returns of the charts you keep (share and
 * compare plan, idea B10): what the layer draws and says, loaded when it is
 * switched on (with its words and its style sheet; the calendar's own code
 * stays as it was). The month marks a day with the person's name and a sign
 * of the event; the day lists each one as a bar; the year gives each person a
 * lane with their ticks and their returns' windows; the table and the
 * calendar file read the same rows. Every event opens its reading in the
 * panel, with a way to the person's chart and, for a return, to their
 * transits at that moment. Names are shown on this device only.
 */

/**
 * A reading's way to the person (personReading's links): "open-chart:<id>:natal" opens that kept chart,
 * "open-chart:<id>:transits:<ms>" its transits at that moment. The Reading tab hands its links on as an
 * event, answered here, as this code is loaded whenever such a reading is shown.
 */
if (typeof window !== "undefined") {
  window.addEventListener("ulune:reading-link", (e) => {
    const { ref, open } = (e as CustomEvent<{ ref: string; open: (page: StudioPage) => void }>).detail;
    const hit = /^open-chart:([^:]+):(natal|transits)(?::(-?\d+))?$/.exec(ref);
    if (!hit) return;
    e.preventDefault();
    const [, id, target, at] = hit as unknown as [string, string, "natal" | "transits", string | undefined];
    const store = useStudioStore.getState();
    if (!store.rows.some((r) => r.id === id)) return;
    store.select(id);
    if (target === "transits" && at && Number.isFinite(Number(at))) store.pin(Number(at));
    useStudioStore.setState({ selectedId: null, dock: "reading", dockOpen: true });
    open(target);
  });
}

const KIND_ICON: Record<Exclude<PeopleKind, "birthday">, string> = { solar: "sun", saturn: "saturn", uranus: "uranus", chiron: "chiron" };

/** A sign of the event: a cake for a birthday, the planet that returns. */
export function PersonIcon({ kind, size = 12 }: { kind: PeopleKind; size?: number }) {
  if (kind === "birthday") return <Cake className="ulune-cal-cake" width={size} height={size} strokeWidth={1.75} aria-hidden />;
  return (
    <span className="ulune-cal-icon" aria-hidden>
      <PlanetGlyph id={KIND_ICON[kind]} size={size} />
    </span>
  );
}

/** A day's cell in the month: up to two people, each with the signs of their events (a birthday and its solar return side by side) and their name; the rest as a count. */
export function PeopleCell({ events, day }: { events: readonly PersonEvent[]; day: string }) {
  const { locale } = useI18n();
  if (!events.length) return null;
  const byPerson = new Map<string, PersonEvent[]>();
  for (const e of events) byPerson.set(e.personId, [...(byPerson.get(e.personId) ?? []), e]);
  const people = [...byPerson.values()];
  return (
    <span className="ulune-cal-people" data-testid={`calendar-people-${day}`} data-count={events.length} aria-hidden title={events.map((e) => personShort(e, locale)).join("\n")}>
      {people.slice(0, 2).map((own) => (
        <span key={own[0]!.personId} className="ulune-cal-person" data-kinds={own.map((e) => e.kind).join(" ")}>
          {own.map((e) => (
            <PersonIcon key={e.kind} kind={e.kind} size={11} />
          ))}
          <span className="ulune-cal-person-name">{own[0]!.name}</span>
        </span>
      ))}
      {people.length > 2 ? <span className="ulune-cal-more">+{people.length - 2}</span> : null}
    </span>
  );
}

/** The day's birthdays and returns, each a bar opening its reading. */
export function PeopleDay({ events, tz, selectedId, onSelect }: { events: readonly PersonEvent[]; tz: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale } = useI18n();
  if (!events.length) return null;
  return (
    <div className="ulune-cal-numday ulune-cal-peopleday" data-testid="calendar-peopleday">
      {events.map((e) => (
        <button
          key={e.id}
          type="button"
          className={cn("ulune-cal-numbar ulune-cal-personbar", selectedId === e.id && "is-on")}
          data-testid={`calendar-person-${e.kind}`}
          data-person={e.personId}
          aria-pressed={selectedId === e.id}
          onClick={() => onSelect(e.id)}
        >
          <span className="ulune-cal-numbar-n" aria-hidden>
            <PersonIcon kind={e.kind} size={20} />
          </span>
          <span className="ulune-cal-numbar-text">
            <span className="ulune-cal-numbar-title">{personTitle(e, locale)}</span>
            <span className="ulune-cal-numbar-line">{personDetail(e, locale, tz)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Each tick's shift in pixels, so that ticks closer than a few days (a fiftieth of the track) sit side by side around their dates. */
function sideBySide(xs: readonly number[]): number[] {
  const shift = xs.map(() => 0);
  for (let i = 0; i < xs.length; ) {
    let j = i + 1;
    while (j < xs.length && xs[j]! - xs[j - 1]! < 0.02) j++;
    for (let k = i; k < j; k++) shift[k] = (k - i - (j - i - 1) / 2) * 22;
    i = j;
  }
  return shift;
}

/** The year's lanes: a heading, then a lane per person with their ticks and their returns' windows within 1°. */
export function PeopleLane({
  events,
  x,
  pct,
  tz,
  heading,
  selectedId,
  onSelect,
}: {
  events: readonly PersonEvent[];
  x: (ms: number) => number;
  pct: (v: number) => string;
  tz: string;
  heading: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  if (!events.length) return null;
  const people = [...new Map(events.map((e) => [e.personId, e.name])).entries()];
  return (
    <>
      <p className="ulune-cal-tl-sect">{heading}</p>
      {people.map(([id, name]) => {
        const own = events.filter((e) => e.personId === id).sort((a, b) => a.t - b.t);
        // A birthday and its solar return a day or two apart: side by side, not one over the other.
        const nudge = sideBySide(own.map((e) => x(e.t)));
        const windows = [...new Map(own.filter((e) => e.window).map((e) => [`${e.kind}-${e.window!.from}`, { kind: e.kind, ...e.window! }])).values()];
        return (
          <div key={id} className="ulune-cal-tl-row is-people" data-testid="calendar-year-person" data-person={id}>
            <span className="ulune-cal-tl-label">
              <span className="ulune-cal-person-name">{name}</span>
            </span>
            <span className="ulune-cal-tl-track">
              {windows.map((w) => (
                <span key={`${w.kind}-${w.from}`} className="ulune-cal-tl-win is-people" style={{ left: pct(x(w.from)), width: pct(Math.max(0.004, x(w.to) - x(w.from))) }} aria-hidden />
              ))}
              {own.map((e, i) => (
                <button
                  key={e.id}
                  type="button"
                  className={cn("ulune-cal-tl-person", selectedId === e.id && "is-on")}
                  style={{ left: pct(x(e.t)), marginLeft: nudge[i] ? `${nudge[i] - 10}px` : undefined }}
                  data-kind={e.kind}
                  data-testid={`calendar-year-person-${e.kind}`}
                  aria-pressed={selectedId === e.id}
                  aria-label={`${personTitle(e, locale)}, ${dayShort(e.t, locale, tz)}`}
                  title={`${personTitle(e, locale)} · ${dayShort(e.t, locale, tz)}`}
                  onClick={() => onSelect(e.id)}
                >
                  <PersonIcon kind={e.kind} size={11} />
                </button>
              ))}
            </span>
          </div>
        );
      })}
    </>
  );
}

/** A month's card in a phone's year: its birthdays and returns, each a line opening its reading. */
export function PeopleMonthLines({ events, tz, selectedId, onSelect }: { events: readonly PersonEvent[]; tz: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale } = useI18n();
  return (
    <>
      {events.map((e) => (
        <button key={e.id} type="button" className={cn("ulune-cal-effect-line is-people", selectedId === e.id && "is-on")} data-testid={`calendar-year-card-person-${e.kind}`} onClick={() => onSelect(e.id)}>
          <PersonIcon kind={e.kind} size={12} />
          <span>
            <b>{personTitle(e, locale)}</b> · {dateFormat(loc(locale), { timeZone: tz, day: "numeric" }).format(new Date(e.t))}
          </span>
        </button>
      ))}
    </>
  );
}

/** Whose birthdays and returns: every kept chart, or one of the space's groups (B5). */
export function PeopleGroupSelect({ groups, value, onChange }: { groups: readonly { id: string; name: string }[]; value: string | null; onChange: (id: string | null) => void }) {
  const { locale } = useI18n();
  if (!groups.length) return null;
  return (
    <label className="ulune-cal-people-group" data-testid="calendar-group">
      <span className="ulune-cal-layer-hint">{cpWord(locale, "cplGroupLabel")}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} data-testid="calendar-group-select" aria-label={cpWord(locale, "cplGroupLabel")}>
        <option value="">{cpWord(locale, "cplGroupAll")}</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The key's line for the layer. */
export function PeopleLegend(): ReactNode {
  const { locale } = useI18n();
  return (
    <span data-testid="calendar-legend-people">
      <PersonIcon kind="birthday" size={12} /> {cpWord(locale, "cplLegend")}
    </span>
  );
}
