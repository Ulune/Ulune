import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BirthDateField } from "@/components/birth-date-field";
import type { FigurePart } from "@/components/figure-keys";
import { PlanetGlyph } from "@/components/glyphs";
import { ScopeCard } from "@/components/hd-card";
import { HumanDesignGraph, type HdPairFigure } from "@/components/humandesign-graph";
import { LoadingLines } from "@/components/loading-lines";
import { MaskedInput } from "@/components/masked-input";
import { PickCard } from "@/components/pick-card";
import { useHdNames } from "@/components/use-hd-names";
import { zoneCity } from "@/lib/chart/calendar-prefs";
import { ageAt, cycleStatus, LIFE_CYCLES, type HdCyclesContext, type LifeCycle, type LifeCycleId } from "@/lib/chart/hd-cycles";
import { centreNowWord, channelStateWord, CYCLE_WORD, cycleDate, cycleDateTime, momentWhen } from "@/lib/chart/hd-cycles-table";
import type { HdNames } from "@/lib/chart/hd-focus";
import { hdPairUncertain } from "@/lib/chart/hd-pair";
import {
  HDC_CENTRES,
  HDC_COMPLETES,
  HDC_MOMENT,
  HDC_MOON,
  HDC_SOLAR,
  HDC_WEEK,
  hdcBodyRef,
  hdcLifeRef,
  hdTransit,
  hdTransitFocus,
  parseHdcRef,
  type HdTransit,
} from "@/lib/chart/hd-transit";
import { HD_CENTER_IDS, HD_GATE_CENTER, type HdBodyId, type HumanDesignChart } from "@/lib/chart/human-design";
import { chartDisplayName } from "@/lib/chart/library";
import { maskBirthTime } from "@/lib/chart/parse-birth";
import type { NatalChart } from "@/lib/chart/types";
import { registerPack, usePack } from "@/lib/content/packs";
import { previewProps } from "@/lib/depth/preview-bus";
import { door } from "@/lib/engine/door";
import { hdCyclesWords, type HdCyclesWordKey } from "@/lib/i18n/catalog/hd-cycles-words";
import { errorForState, localizeError } from "@/lib/i18n/errors";
import { hdActivationLabel, hdBodyLabel, hdCenterLabel, hdChannelCentersLine, hdGateTitle } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/messages";
import { transitClockLabel } from "@/lib/i18n/transits-ui";
import { bookT } from "@/lib/i18n/words-book";
import { dateFormat } from "@/lib/intl-cache";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { euroFromMs, msFromEuro, timeFromMs } from "@/studio/modes/euro-date";
import { useClockZone } from "@/studio/modes/hooks/useClockZone";
import { useHdLifeCycles, useHdSolarReturn, type HdLifeCyclesState, type HdSolarState } from "@/studio/modes/hooks/useHdCycles";
import { useHdMoment } from "@/studio/modes/hooks/useHdMoment";
import { hdKeyOf, keepHd, keptHd } from "@/studio/modes/hooks/useHumanDesign";
import { MODE_META } from "@/studio/modes/meta";
import { TimeDial } from "@/studio/modes/time-dial";
import type { StepUnit } from "@/studio/modes/time-tape";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useKeptScroll } from "@/studio/return-parts";
import { useChartScope, useDomIds, useScopeKey, useScoped, useScopedPage } from "@/studio/scope";
import { useReadingBeside, useScopedSelection } from "@/studio/scope-figure";
import { useScopedTime, useScopedTimeSet } from "@/studio/scope-time";
import "@/studio/modes/styles/hd.css";
import "@/studio/modes/styles/first-read.css";
import "@/studio/modes/styles/hd-pair.css";
import "@/studio/modes/styles/transits.css";
import "@/studio/modes/styles/hd-cycles.css";

// This page's reading text (lib/content/packs.ts): its loaders arrive with the page, not in the first download.
registerPack("hdcycles", {
  en: () => import("@/lib/content/pack-hd-cycles?lang=en"),
  fr: () => import("@/lib/content/pack-hd-cycles?lang=fr"),
});

/*
 * Human Design's Cycles lens (share and compare plan, feature 5b, decision
 * R2), at /human-design/cycles: your bodygraph under the sky of the moment on
 * the dial, and the cycles of a life.
 *
 * The moment: the 13 bodies' gates and lines (hooks/useHdMoment.ts: the sky's
 * chunks, the same for everyone, through the door), drawn over your bodygraph
 * as the connection chart draws two people (the natal figure given `pair`,
 * hd-pair.css), the moment as the second "person" in its own colour
 * (hd-cycles.css): your gates filled, the moment's ringed, the channels it
 * completes with yours marked where their halves meet, the centres it defines
 * filled with who defines them. Above the figure, the moment's thirteen
 * bodies; beside it, the gate of the week (the Sun's, about 5.7 days a gate),
 * the Moon's, what the moment completes, the centres it defines for you, the
 * four life cycles with their exact dates (hooks/useHdCycles.ts) and the
 * chosen year's solar return; under it, the dial every time page shares
 * (time-dial.tsx), the studio's one time, or a Compare pane's own
 * (scope-time.ts).
 *
 * Its readings come with their own pack (pack-hd-cycles.ts:
 * lib/chart/interpret-hd-cycles.ts and its texts); the side panel's first
 * read takes the same steps. Drawn in its chart's scope (studio/scope.tsx):
 * Compare shows two people under the same moment. Nothing here sends
 * anything of the person: the sky is asked for by its date alone.
 */

/** The dates the ephemeris files cover (as Transits' dial). */
const SKY_MIN = Date.UTC(1800, 0, 1);
const SKY_MAX = Date.UTC(2399, 11, 31);
/** The dial's steps: a day by default, a week a choice away. */
const UNITS: readonly StepUnit[] = ["hour", "day", "week", "month", "year"];
const NO_MOMENTS = { design: "", personality: "" };

type Say = (key: HdCyclesWordKey, vars?: Record<string, string | number>) => string;

export type DesignCyclesState = {
  enabled: boolean;
  chart: NatalChart | null;
  name: string;
  /** The person's bodygraph (null while it is cast). Not `hd`: Compare's "What they share" reads that as the natal page's. */
  natalHd: HumanDesignChart | null;
  natalError: string | null;
  retryNatal: () => void;
  at: number;
  live: boolean;
  smooth: boolean;
  /** The bodygraph under the moment (null until the sky is here), and the one the figure draws (the same gates keep the same overlay). */
  transit: HdTransit | null;
  figureTransit: HdTransit | null;
  skyBusy: boolean;
  skyError: string | null;
  retrySky: () => void;
  cycles: HdLifeCyclesState;
  solar: HdSolarState & { transit: HdTransit | null };
  setSolarYear: (year: number | null) => void;
  /** What the readings and the table read. */
  ctx: HdCyclesContext | null;
  /** The dial's clock. */
  clock: string;
};

/** The page's words: its book, then the app's catalog. */
function useWords(): Say {
  const { locale, t } = useI18n();
  return useMemo(() => bookT(hdCyclesWords, t, locale), [t, locale]);
}

/** A word of the book without the catalog (the empty studio's line, before any hook runs). */
const said = (key: HdCyclesWordKey, locale: string): string => hdCyclesWords[key][locale === "fr" ? 1 : 0];

/** French "de" before a name: "de Camille", "d’Anna". */
const deName = (name: string): string => (/^(?:[aeiouhéèêëàâîïôûœæ]|y(?![aeiouéèêëàâîïôû]))/iu.test(name) ? `d’${name}` : `de ${name}`);
const upper = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);
const tag = (locale: AppLocale) => (locale === "fr" ? "fr-FR" : "en-GB");

/** "Mars 20.3 ℞, Sun 20.1". */
function bodiesOn(t: HdTransit, gate: number, locale: AppLocale): string {
  return t.moment.rows
    .filter((r) => r.gate === gate)
    .map((r) => `${upper(hdBodyLabel(locale, r.body))} ${r.gate}.${r.line}${r.retrograde ? " ℞" : ""}`)
    .join(", ");
}

/** "Gate 20 · Contemplation". */
function gateName(n: number, locale: AppLocale, names: HdNames | null): string {
  const name = names?.gate(n);
  return name ? `${hdGateTitle(locale, n)} · ${name}` : hdGateTitle(locale, n);
}

function channelName(id: string, names: HdNames | null): string {
  const name = names?.channel(id);
  return name ? `${id} · ${name}` : id;
}

/** A short day and time in a zone: "Tue 14 Oct, 09:12". */
const dayTime = (ms: number, zone: string, locale: AppLocale) =>
  `${dateFormat(tag(locale), { weekday: "short", day: "numeric", month: "short", timeZone: zone }).format(ms)}, ${dateFormat(tag(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone }).format(ms)}`;
const clockOnly = (ms: number, zone: string, locale: AppLocale) => dateFormat(tag(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone }).format(ms);
const monthYear = (ms: number, zone: string, locale: AppLocale) => dateFormat(tag(locale), { month: "short", year: "numeric", timeZone: zone }).format(ms);
const sameDay = (a: number, b: number, zone: string) => {
  const f = dateFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: zone });
  return f.format(a) === f.format(b);
};

/** A cycle's age, as its row says it: "at 29", "at 58 to 59". */
function cycleAge(c: LifeCycle, birth: number, w: Say): string {
  const first = c.passages[0];
  const last = c.passages[c.passages.length - 1];
  if (!first || !last) return "";
  const a = ageAt(birth, first.at).years;
  const b = ageAt(birth, last.at).years;
  return a === b ? w("hdcAgeAt", { n: a }) : w("hdcAgeBetween", { a, b });
}

const statusKey = { past: "hdcPast", now: "hdcNow", coming: "hdcComing" } as const;

/** The one line that names a piece of the figure or a part of the page (under the figure, in the keyboard's list, on the phone's card). */
function cyclesSay(data: DesignCyclesState, t: HdTransit, id: string, locale: AppLocale, w: Say, names: HdNames | null): string {
  const ref = parseHdcRef(id);
  const ctx = data.ctx;
  if (ref) {
    if (ref.kind === "week" || ref.kind === "moon" || ref.kind === "body") {
      const body: HdBodyId = ref.kind === "week" ? "sun" : ref.kind === "moon" ? "moon" : ref.body;
      const row = t.moment.rows.find((r) => r.body === body);
      if (!row) return "";
      const span = ref.kind === "week" ? ctx?.week : ref.kind === "moon" ? ctx?.moon : null;
      const head = ref.kind === "week" ? w("hdcWeek") : ref.kind === "moon" ? w("hdcMoon") : "";
      const when =
        span && span.gate === row.gate
          ? ref.kind === "week"
            ? w("hdcSpan", { from: dayTime(span.from, data.clock, locale), to: dayTime(span.to, data.clock, locale) })
            : w("hdcUntil", { time: sameDay(span.to, data.at, data.clock) ? clockOnly(span.to, data.clock, locale) : dayTime(span.to, data.clock, locale) })
          : "";
      return [head, `${upper(hdBodyLabel(locale, body))} ${row.gate}.${row.line}${row.retrograde ? " ℞" : ""}`, names?.gate(row.gate) ?? "", when].filter(Boolean).join(" · ");
    }
    if (ref.kind === "completes") return `${w("hdcCompletesHead")} · ${t.completes.length ? t.completes.map((ch) => ch.id).join(", ") : w("hdcCompletesNone")}`;
    if (ref.kind === "centres") return `${w("hdcCentresHead")} · ${t.conditioned.length ? t.conditioned.map((c) => hdCenterLabel(locale, c)).join(", ") : w("hdcCentresNone")}`;
    if (ref.kind === "moment") return `${w("hdcMomentHead")} · ${ctx ? momentWhen(ctx, locale) : ""}`;
    if (ref.kind === "life") {
      const c = data.cycles.cycles?.find((x) => x.id === ref.id);
      const name = w(CYCLE_WORD[ref.id]);
      if (!c || !ctx) return name;
      const status = cycleStatus(c, data.at);
      return [name, cycleAge(c, ctx.birth, w), c.passages[0] ? cycleDate(c.passages[0].at, ctx, locale) : "", status ? w(statusKey[status]) : ""].filter(Boolean).join(" · ");
    }
    if (ref.kind === "solar") {
      const s = data.solar;
      const when = s.at == null || !ctx ? "" : ctx.timeUnknown ? cycleDate(s.at, ctx, locale) : cycleDateTime(s.at, ctx, locale);
      return [w("hdcStepSolar", { year: s.year }), when].filter(Boolean).join(" · ");
    }
    return "";
  }
  const sep = id.indexOf(":");
  const kind = id.slice(0, sep);
  const key = id.slice(sep + 1);
  if (kind === "gate") {
    const n = Number(key);
    const tone = t.pair.tones.get(n) ?? "off";
    const acts = data.natalHd ? data.natalHd.activations.filter((a) => a.gate === n).map((a) => hdActivationLabel(locale, a)).join(", ") : "";
    const centre = HD_GATE_CENTER[n];
    const whose = [
      tone === "a" || tone === "both" ? w("hdcSayYours", { acts }) : "",
      tone === "b" || tone === "both" ? w("hdcSayNow", { bodies: bodiesOn(t, n, locale) }) : "",
      tone === "off" ? w("hdcSayNeither") : "",
    ].filter(Boolean);
    return [gateName(n, locale, names), centre ? hdCenterLabel(locale, centre) : "", ...whose].filter(Boolean).join(" · ");
  }
  if (kind === "channel") {
    const ch = t.pair.channels.find((c) => c.id === key);
    if (!ch) return key;
    return [channelName(ch.id, names), hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]), channelStateWord(ch, w)].join(" · ");
  }
  if (kind === "center") return `${hdCenterLabel(locale, key as (typeof HD_CENTER_IDS)[number])} · ${centreNowWord(t, key as (typeof HD_CENTER_IDS)[number], w)}`;
  return "";
}

/** What the bodygraph draws of the moment, and how it names its pieces. */
function useCyclesFigure(data: DesignCyclesState | undefined, w: Say, locale: AppLocale, names: HdNames | null): HdPairFigure | null {
  const t = data?.figureTransit ?? null;
  const hd = data?.natalHd ?? null;
  const cycles = data?.cycles.cycles ?? null;
  // The line under the figure names the dial's moment as it is now, though the figure itself is only drawn again when a gate or line changes.
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  });
  return useMemo(() => {
    if (!t || !hd || !data) return null;
    const say = (id: string) => cyclesSay(latest.current ?? data, t, id, locale, w, names);
    const { pair } = t;
    const parts: FigurePart[] = [];
    const centres = [...HD_CENTER_IDS].sort((x, y) => Number(pair.centres.find((c) => c.id === y)!.pair) - Number(pair.centres.find((c) => c.id === x)!.pair));
    for (const c of centres) parts.push({ id: `center:${c}`, label: say(`center:${c}`), kind: "center" });
    for (const ch of pair.formed) parts.push({ id: `channel:${ch.id}`, label: say(`channel:${ch.id}`), kind: "channel" });
    const gates = [...pair.tones.keys()];
    for (const g of gates.filter((n) => pair.tones.get(n) !== "off")) parts.push({ id: `gate:${g}`, label: say(`gate:${g}`), kind: "gate" });
    for (const ch of pair.channels.filter((c) => !c.kind)) parts.push({ id: `channel:${ch.id}`, label: say(`channel:${ch.id}`), kind: "channel-open" });
    for (const g of gates.filter((n) => pair.tones.get(n) === "off")) parts.push({ id: `gate:${g}`, label: say(`gate:${g}`), kind: "gate-off" });
    const lifeGates: Partial<Record<LifeCycleId, number>> = {};
    for (const c of cycles ?? []) lifeGates[c.id] = c.gate.gate;
    const sunEarth = hd.activations.filter((a) => a.layer === "personality" && (a.body === "sun" || a.body === "earth")).map((a) => a.gate);
    return {
      tones: pair.tones,
      kinds: new Map(pair.formed.map((ch) => [ch.id, ch.kind!] as const)),
      uncertain: hdPairUncertain(hd, { activations: [] }),
      centres: new Map(pair.centres.filter((c) => c.by).map((c) => [c.id, c.by!] as const)),
      focusOf: (id) => hdTransitFocus(t, id, { lifeGates, sunEarth }),
      say,
      parts,
      label: w("hdcAria", { name: data.name, deName: deName(data.name), when: data.ctx ? momentWhen(data.ctx, locale) : "" }),
      own: "hdc",
      testPrefix: "hd-cycles",
    };
    // The figure follows the gates (figureTransit), not each degree of the moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, hd, cycles, w, locale, names, data?.name, data?.ctx?.week, data?.ctx?.moon, data?.solar.at, data?.solar.year]);
}

/** The moment's thirteen bodies above the figure, each opening its reading. */
function MomentStrip({ data }: { data: DesignCyclesState }) {
  const { locale } = useI18n();
  const w = useWords();
  const view = useWheelView();
  const t = data.transit;
  if (!t) return <div className="ulune-hdc-strip" aria-hidden data-testid="hd-cycles-strip-loading" style={{ minHeight: 28 }} />;
  return (
    <ul className="ulune-hdc-strip" aria-label={w("hdcStripAria")} data-testid="hd-cycles-strip">
      {t.moment.rows.map((r) => {
        const ref = hdcBodyRef(r.body);
        const on = view.selectedId === ref;
        const completing = t.completes.filter((ch) => ch.b.gates.includes(r.gate)).map((ch) => ch.id);
        const completes = completing.length > 0;
        const yours = t.pair.gates.a.has(r.gate);
        // What the ring and the underline mean, said and shown on hover.
        const label = [
          w("hdcChipAria", { body: upper(hdBodyLabel(locale, r.body)), gate: r.gate, line: r.line, retro: r.retrograde ? w("hdcRetro") : "" }),
          yours ? w("hdcChipYours") : "",
          completes ? w("hdcChipCompletes", { channels: completing.join(", ") }) : "",
        ].join("");
        return (
          <li key={r.body}>
            <button
              type="button"
              className={cn("ulune-hdc-chip", on && "is-on")}
              data-testid={`hd-cycles-body-${r.body}`}
              data-gate={r.gate}
              data-line={r.line}
              data-completes={completes ? "1" : undefined}
              data-yours={yours ? "1" : undefined}
              aria-pressed={on}
              aria-label={label}
              title={label}
              onClick={() => view.pick(ref)}
              {...previewProps(ref)}
            >
              <span className="ulune-hdc-chip-glyph" aria-hidden>
                <PlanetGlyph id={r.body} size={13} />
              </span>
              <span className="ulune-hdc-chip-gl">
                {r.gate}.{r.line}
              </span>
              {r.retrograde ? (
                <span className="ulune-hdc-chip-retro" aria-hidden>
                  ℞
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** One row of the side lists: a label over a value, its reading on a press. */
function Row({ refId, testId, k, v, sub, mono, aria, status, extra }: { refId: string; testId: string; k?: string; v: string; sub?: string; mono?: boolean; aria?: string; status?: { key: "past" | "now" | "coming"; label: string } | null; extra?: Record<string, string | undefined> }) {
  const view = useWheelView();
  const on = view.selectedId === refId;
  return (
    <li>
      <button
        type="button"
        className={cn("ulune-hdc-row", on && "is-on")}
        data-testid={testId}
        data-status={status?.key}
        aria-pressed={on}
        aria-label={aria}
        onClick={() => view.pick(refId)}
        {...previewProps(refId)}
        {...extra}
      >
        {k ? <span className="ulune-hdc-row-k">{k}</span> : null}
        <span className="ulune-hdc-row-top">
          <span className={mono ? "ulune-hdc-row-gl" : "ulune-hdc-row-v"}>{v}</span>
          {status ? (
            <span className="ulune-hdc-status" data-status={status.key}>
              {status.label}
            </span>
          ) : null}
        </span>
        {sub ? <span className="ulune-hdc-row-sub">{sub}</span> : null}
      </button>
    </li>
  );
}

/** A channel's line as the figure draws it (the key). */
function LineSample({ kind }: { kind: "temporary" | "own" }) {
  const left = "M3 6H15";
  const right = "M15 6H27";
  return (
    <svg className="ulune-hdc-sample" viewBox="0 0 30 12" width="30" height="12" aria-hidden>
      {kind === "temporary" ? <path className="is-a" d={left} /> : null}
      {kind === "temporary" ? null : (
        <>
          <path className="is-b" d={left} />
          <path className="is-core-bg" d={left} />
        </>
      )}
      <path className="is-b" d={right} />
      <path className="is-core-bg" d={right} />
      {kind === "temporary" ? <path className="is-spark" d="M15 1.6L16.4 4.6L19.4 6L16.4 7.4L15 10.4L13.6 7.4L10.6 6L13.6 4.6Z" /> : null}
    </svg>
  );
}

/** Beside the figure: the moment (the week's gate, the Moon), what it completes, the centres it defines, the key, the life cycles, the solar return. */
function Side({ data }: { data: DesignCyclesState }) {
  const { locale, t: tr } = useI18n();
  const w = useWords();
  const domId = useDomIds();
  const names = useHdNames(locale);
  const { pin } = useScopedTimeSet();
  const t = data.transit;
  const ctx = data.ctx;
  const sun = t?.moment.rows.find((r) => r.body === "sun");
  const earth = t?.moment.rows.find((r) => r.body === "earth");
  const moon = t?.moment.rows.find((r) => r.body === "moon");
  const week = data.ctx?.week && sun && data.ctx.week.gate === sun.gate ? data.ctx.week : null;
  const moonSpan = data.ctx?.moon && moon && data.ctx.moon.gate === moon.gate ? data.ctx.moon : null;
  const nameOf = (g: number) => names?.gate(g) ?? "";
  const solar = data.solar;
  const solarWhen = solar.at == null || !ctx ? "" : ctx.timeUnknown ? cycleDate(solar.at, ctx, locale) : cycleDateTime(solar.at, ctx, locale);
  const sunNatal = data.natalHd?.activations.find((a) => a.layer === "personality" && a.body === "sun");
  const earthNatal = data.natalHd?.activations.find((a) => a.layer === "personality" && a.body === "earth");
  return (
    <div className="ulune-hdc-side" data-testid="hd-cycles-side">
      <section aria-labelledby={domId("hdc-moment-h")} data-testid="hd-cycles-moment">
        <h3 id={domId("hdc-moment-h")} className="ulune-hdc-h">
          {w("hdcMomentHead")}
        </h3>
        {t && sun && earth && moon ? (
          <ul className="ulune-hdc-list">
            <Row
              refId={HDC_WEEK}
              testId="hd-cycles-week"
              k={w("hdcWeek")}
              v={[`${sun.gate}.${sun.line}`, nameOf(sun.gate)].filter(Boolean).join(" · ")}
              sub={[`${w("hdcEarth")} ${earth.gate}.${earth.line}`, week ? w("hdcSpan", { from: dayTime(week.from, data.clock, locale), to: dayTime(week.to, data.clock, locale) }) : ""].filter(Boolean).join(" · ")}
              aria={w("hdcWeekAria", { gate: sun.gate, line: sun.line, span: week ? `, ${w("hdcSpan", { from: dayTime(week.from, data.clock, locale), to: dayTime(week.to, data.clock, locale) })}` : "" })}
              extra={{ "data-gate": String(sun.gate) }}
            />
            <Row
              refId={HDC_MOON}
              testId="hd-cycles-moon"
              k={w("hdcMoon")}
              v={[`${moon.gate}.${moon.line}`, nameOf(moon.gate)].filter(Boolean).join(" · ")}
              sub={moonSpan ? w("hdcUntil", { time: sameDay(moonSpan.to, data.at, data.clock) ? clockOnly(moonSpan.to, data.clock, locale) : dayTime(moonSpan.to, data.clock, locale) }) : undefined}
              aria={w("hdcMoonAria", { gate: moon.gate, line: moon.line, span: moonSpan ? `, ${w("hdcUntil", { time: clockOnly(moonSpan.to, data.clock, locale) })}` : "" })}
              extra={{ "data-gate": String(moon.gate) }}
            />
          </ul>
        ) : (
          <span className="ulune-hdc-working" aria-hidden />
        )}
      </section>
      <section aria-labelledby={domId("hdc-completes-h")} data-testid="hd-cycles-completes">
        <h3 id={domId("hdc-completes-h")} className="ulune-hdc-h">
          {w("hdcCompletesHead")}
        </h3>
        {t && t.completes.length ? (
          <ul className="ulune-hdc-list">
            {t.completes.map((ch) => {
              const gy = ch.a.gates[0]!;
              const gm = ch.b.gates[0]!;
              const bodies = bodiesOn(t, gm, locale);
              return (
                <Row
                  key={ch.id}
                  refId={`channel:${ch.id}`}
                  testId={`hd-cycles-channel-${ch.gates[0]}-${ch.gates[1]}`}
                  v={channelName(ch.id, names)}
                  sub={`${w("hdcYourGate", { g: gy })} · ${bodies}`}
                  aria={w("hdcCompletesAria", { channel: channelName(ch.id, names), gy, gm, bodies })}
                />
              );
            })}
          </ul>
        ) : (
          <p className="ulune-hdc-none" data-testid="hd-cycles-completes-none">
            {t ? w("hdcCompletesNone") : " "}
          </p>
        )}
      </section>
      <section aria-labelledby={domId("hdc-centres-h")} data-testid="hd-cycles-centres">
        <h3 id={domId("hdc-centres-h")} className="ulune-hdc-h">
          {w("hdcCentresHead")}
        </h3>
        {t && t.conditioned.length ? (
          <ul className="ulune-hdc-list">
            {t.conditioned.map((c) => (
              <Row
                key={c}
                refId={`center:${c}`}
                testId={`hd-cycles-centre-${c}`}
                v={hdCenterLabel(locale, c)}
                sub={`${centreNowWord(t, c, w)}${(t.through.get(c) ?? []).length ? ` · ${(t.through.get(c) ?? []).map((ch) => ch.id).join(", ")}` : ""}`}
              />
            ))}
          </ul>
        ) : (
          <p className="ulune-hdc-none" data-testid="hd-cycles-centres-none">
            {t ? w("hdcCentresNone") : " "}
          </p>
        )}
      </section>
      <section aria-labelledby={domId("hdc-life-h")} data-testid="hd-cycles-life" aria-busy={data.cycles.busy || undefined}>
        <h3 id={domId("hdc-life-h")} className="ulune-hdc-h">
          {w("hdcLifeHead")}
        </h3>
        {data.cycles.error ? (
          <p className="ulune-hdc-none" role="alert" data-testid="hd-cycles-life-error">
            {localizeError(data.cycles.error, locale, "couldNotCastSky")}{" "}
            <button type="button" className="underline" onClick={data.cycles.retry}>
              {tr("errorSlotRetry")}
            </button>
          </p>
        ) : !data.cycles.cycles || !ctx ? (
          <>
            <p className="ulune-hdc-none" data-testid="hd-cycles-life-working">
              {w("hdcWorking")}
            </p>
            {LIFE_CYCLES.map((d) => (
              <span key={d.id} className="ulune-hdc-working" aria-hidden />
            ))}
          </>
        ) : (
          <ul className="ulune-hdc-list">
            {data.cycles.cycles.map((c) => {
              const status = cycleStatus(c, data.at);
              const first = c.passages[0];
              const last = c.passages[c.passages.length - 1];
              const dates = first && last ? (first === last ? monthYear(first.at, ctx.zone, locale) : `${monthYear(first.at, ctx.zone, locale)} – ${monthYear(last.at, ctx.zone, locale)}`) : c.beyond ? w("hdcLifeBeyond") : w("hdcLifeNone");
              const age = cycleAge(c, ctx.birth, w);
              const label = status ? w(statusKey[status]) : "";
              return (
                <Row
                  key={c.id}
                  refId={hdcLifeRef(c.id)}
                  testId={`hd-cycles-life-${c.id}`}
                  v={w(CYCLE_WORD[c.id])}
                  sub={[age, dates, c.passages.length > 1 ? `${c.passages.length}×` : ""].filter(Boolean).join(" · ")}
                  status={status ? { key: status, label } : null}
                  aria={w("hdcLifeAria", { name: w(CYCLE_WORD[c.id]), age, dates, status: label })}
                  extra={{ "data-passages": String(c.passages.length), "data-cycle-status": status ?? "" }}
                />
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby={domId("hdc-solar-h")} data-testid="hd-cycles-solar">
        <h3 id={domId("hdc-solar-h")} className="ulune-hdc-h">
          {w("hdcSolarHead")}
          <span className="ulune-hdc-year" role="group" aria-label={w("hdcSolarYear")}>
            <button type="button" className="ulune-hdc-step" data-testid="hd-cycles-solar-prev" aria-label={w("hdcSolarPrev")} onClick={() => data.setSolarYear(solar.year - 1)}>
              <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
            <span className="ulune-hdc-year-v" data-testid="hd-cycles-solar-year" aria-live="polite">
              {solar.year}
            </span>
            <button type="button" className="ulune-hdc-step" data-testid="hd-cycles-solar-next" aria-label={w("hdcSolarNext")} onClick={() => data.setSolarYear(solar.year + 1)}>
              <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </span>
        </h3>
        {solar.error ? (
          <p className="ulune-hdc-none" role="alert">
            {localizeError(solar.error, locale, "couldNotCastSky")}{" "}
            <button type="button" className="underline" onClick={solar.retry}>
              {tr("errorSlotRetry")}
            </button>
          </p>
        ) : solar.busy ? (
          <span className="ulune-hdc-working" aria-hidden />
        ) : solar.at == null ? (
          <p className="ulune-hdc-none">{w("hdcSolarNone")}</p>
        ) : (
          <>
            <ul className="ulune-hdc-list">
              <Row
                refId={HDC_SOLAR}
                testId="hd-cycles-solar-row"
                v={solarWhen}
                sub={sunNatal && earthNatal ? w("hdcSolarSunEarth", { sun: `${sunNatal.gate}.${sunNatal.line}`, earth: `${earthNatal.gate}.${earthNatal.line}` }) : undefined}
                aria={w("hdcSolarAria", { year: solar.year, when: solarWhen })}
                extra={{ "data-at": String(solar.at), "data-completes": String(solar.transit?.completes.length ?? 0) }}
              />
            </ul>
            <button type="button" className="ulune-hdc-show" data-testid="hd-cycles-solar-show" onClick={() => pin(solar.at!)}>
              {w("hdcSolarShow")}
            </button>
          </>
        )}
      </section>
      <ul className="ulune-hdc-key" aria-hidden data-testid="hd-cycles-key">
        <li>
          <span className="ulune-hdc-gate is-a" /> {w("hdcKeyYours")}
        </li>
        <li>
          <span className="ulune-hdc-gate is-b" /> {w("hdcKeyMoment")}
        </li>
        <li>
          <span className="ulune-hdc-gate is-both" /> {w("hdcKeyBoth")}
        </li>
        <li>
          <LineSample kind="temporary" /> {w("hdcKeyTemporary")}
        </li>
        <li>
          <LineSample kind="own" /> {w("hdcKeyOwn")}
        </li>
      </ul>
    </div>
  );
}

/** The fields to type a moment in, opened from the dial's readout (as Transits'). */
function CyclesPicker() {
  const { locale, t } = useI18n();
  const at = useScopedTime("at");
  const { pin } = useScopedTimeSet();
  const domId = useDomIds();
  const clock = useClockZone(at);
  const date = euroFromMs(at, clock.tz);
  const time = timeFromMs(at, clock.tz);
  const pinDate = (next: string) => {
    const ms = msFromEuro(next, time, clock.tz);
    if (ms != null) pin(ms);
  };
  const pinTime = (next: string) => {
    const ms = msFromEuro(date, next, clock.tz);
    if (ms != null) pin(ms);
  };
  return (
    <div className="ulune-transit-clock-bar">
      <label className="ulune-transit-clock-field">
        <span className="ulune-time-picker-label">{transitClockLabel(locale, "date")}</span>
        <BirthDateField
          id={domId("hd-cycles-date")}
          name="hd-cycles-date"
          testId="hd-cycles-date"
          value={date}
          placeholder={t("datePlaceholder")}
          calendarLabel={t("openCalendar")}
          locale={locale}
          onTyped={pinDate}
          onBlur={() => {}}
        />
      </label>
      <label className="ulune-transit-clock-field">
        <span className="ulune-time-picker-label">{transitClockLabel(locale, "time")}</span>
        <MaskedInput
          id={domId("hd-cycles-time")}
          data-testid="hd-cycles-time"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("timePlaceholder")}
          value={time}
          mask={maskBirthTime}
          onTyped={pinTime}
          className="h-[var(--ctl-h)] w-full min-w-0"
        />
      </label>
      <span className="ulune-transit-zone" data-testid="hd-cycles-zone" title={clock.label}>
        {clock.label}
      </span>
    </div>
  );
}

/** The dial every time page shares: the studio's one moment, or a Compare pane's own. */
function CyclesDial({ data }: { data: DesignCyclesState }) {
  const { locale } = useI18n();
  const w = useWords();
  const { pin, now } = useScopedTimeSet();
  const clockZone = useClockZone(Date.now()).tz;
  return (
    <TimeDial
      value={data.at}
      min={SKY_MIN}
      max={SKY_MAX}
      onChange={pin}
      units={UNITS}
      defaultUnit="day"
      storageKey="ulune.scrub.unit.hd"
      testId="hd-cycles-dial"
      label={w("hdcDial")}
      smooth={data.smooth}
      timeZone={clockZone}
      picker={<CyclesPicker />}
      pickerLabel={transitClockLabel(locale, "pick")}
      pickerTestId="hd-cycles-clock"
      live={data.live}
      reset={{ label: transitClockLabel(locale, "now"), testId: "hd-cycles-now", onReset: now }}
    />
  );
}

/** On a phone, a piece chosen: one line and Read (pick-card.tsx); a Compare pane's in its own place. */
function CyclesCard({ figure }: { figure: HdPairFigure | null }) {
  const scope = useChartScope();
  const selectedId = useScoped((s) => s.selectedId);
  const text = figure && selectedId && /^(gate|channel|center|hdc):/.test(selectedId) ? figure.say(selectedId) : null;
  return scope ? <ScopeCard scope={scope} text={text} testId="hd-cycles-card" /> : <PickCard testId="hd-cycles-card" text={text} />;
}

function DesignCyclesFigure() {
  const { locale, t } = useI18n();
  const w = useWords();
  const view = useWheelView();
  // Wide screens read beside the figure; on a phone a choice keeps it whole behind the card.
  const wide = useReadingBeside();
  const sel = useScopedSelection();
  const data = useModeData("design-cycles");
  const names = useHdNames(locale);
  const figure = useCyclesFigure(data, w, locale, names);
  // Its own scroll comes back where it was when the studio does (reorganisation R6).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, useScopeKey("design-cycles-scroll"), Boolean(data?.natalHd));
  if (!data?.chart) return null;
  if (data.natalError) {
    return (
      <div className="px-5 py-10" role="alert" data-testid="hd-cycles-error">
        <p className="font-display text-2xl text-fg">{localizeError(data.natalError, locale)}</p>
        <button type="button" className="mt-2 text-sm underline" onClick={data.retryNatal}>
          {t("errorSlotRetry")}
        </button>
      </div>
    );
  }
  if (!data.natalHd || !figure) {
    return (
      <section data-testid="hd-cycles-loading" className="px-6 py-16 text-center" aria-busy="true">
        <span className="mx-auto block size-8 animate-pulse rounded-full bg-bg-subtle" />
      </section>
    );
  }
  const select = (id: string) => (wide ? view.choose(id) : sel.quiet(id));
  return (
    <div
      ref={scroller}
      className="ulune-hdc"
      data-testid="hd-cycles"
      data-chart-pick
      data-at={String(data.at)}
      data-sky={data.transit ? "1" : "0"}
      // The moment the figure shows: the dial's own once its sky is in (the last one meanwhile).
      data-moment={data.transit ? String(data.transit.moment.at) : undefined}
      data-completes={data.transit ? data.transit.completes.map((ch) => ch.id).join(",") : undefined}
    >
      <MomentStrip data={data} />
      {data.chart.meta.timeUnknown ? (
        <p className="ulune-hdc-unknown" role="note" data-testid="hd-cycles-unknown">
          {w("hdcUnknown")}
        </p>
      ) : null}
      {data.skyError ? (
        <p className="ulune-hdc-unknown" role="alert" data-testid="hd-cycles-sky-error">
          {localizeError(data.skyError, locale, "couldNotCastSky")}{" "}
          <button type="button" className="underline" onClick={data.retrySky}>
            {t("errorSlotRetry")}
          </button>
        </p>
      ) : null}
      <div className="ulune-hdc-body">
        <div className="ulune-hdc-figure" style={{ opacity: data.skyBusy ? 0.85 : 1 }}>
          <HumanDesignGraph chart={data.natalHd} view="both" selectedId={view.selectedId} onSelect={select} onClear={sel.clear} moments={NO_MOMENTS} pair={figure} />
        </div>
        <Side data={data} />
      </div>
      <div className="ulune-hdc-dial">
        <CyclesDial data={data} />
      </div>
      {wide ? null : <CyclesCard figure={figure} />}
    </div>
  );
}

/** "How Ulune finds these dates" (with the reading pack). */
function Method() {
  const { locale } = useI18n();
  const pack = usePack("hdcycles", locale, true);
  if (!pack) return null;
  const how = pack.hdCyclesMethod(locale);
  return (
    <details className="ob-rc-about" data-testid="hd-cycles-method">
      <summary>{how.title}</summary>
      <ul className="ulune-hdc-how-list">
        {how.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

/** The side panel with nothing chosen: the page in steps, each opening its reading and lighting its part of the figure. */
function DesignCyclesHello() {
  const { locale } = useI18n();
  const w = useWords();
  const view = useWheelView();
  const domId = useDomIds();
  const data = useModeData("design-cycles");
  const pack = usePack("hdcycles", locale, Boolean(data?.ctx));
  if (!data?.chart) return null;
  const ctx = data.ctx;
  if (!ctx || !pack) {
    return (
      <section className="ulune-hdc-hello" data-testid="hd-cycles-hello" data-empty="1">
        <LoadingLines lines={4} />
        <Method />
      </section>
    );
  }
  const first = pack.hdCyclesFirstRead(ctx, locale);
  const t = data.transit;
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const row = (body: HdBodyId) => t?.moment.rows.find((r) => r.body === body);
  const gl = (body: HdBodyId) => {
    const r = row(body);
    return r ? `${r.gate}.${r.line}` : "";
  };
  type Step = { id: string; ref: string; label: string; value: string; text: string };
  const steps: Step[] = [
    { id: "moment", ref: HDC_MOMENT, label: w("hdcStepMoment"), value: momentWhen(ctx, locale), text: first.texts.moment ?? "" },
    { id: "week", ref: HDC_WEEK, label: w("hdcStepWeek"), value: gl("sun"), text: first.texts.week ?? "" },
    { id: "moon", ref: HDC_MOON, label: w("hdcStepMoon"), value: gl("moon"), text: first.texts.moon ?? "" },
    { id: "completes", ref: HDC_COMPLETES, label: w("hdcStepCompletes"), value: t ? String(t.completes.length) : "", text: first.texts.completes ?? "" },
    { id: "centres", ref: HDC_CENTRES, label: w("hdcStepCentres"), value: t ? String(t.conditioned.length) : "", text: first.texts.centres ?? "" },
    ...LIFE_CYCLES.map((d) => {
      const c = data.cycles.cycles?.find((x) => x.id === d.id);
      return { id: `life-${d.id}`, ref: hdcLifeRef(d.id), label: w(CYCLE_WORD[d.id]), value: c ? cycleAge(c, ctx.birth, w) : "", text: first.texts[`life:${d.id}`] ?? "" };
    }),
    { id: "solar", ref: HDC_SOLAR, label: w("hdcStepSolar", { year: data.solar.year }), value: data.solar.at != null ? cycleDate(data.solar.at, ctx, locale) : "", text: first.texts.solar ?? "" },
  ];
  return (
    <section className="ulune-hd-first ulune-hdc-hello" data-testid="hd-cycles-hello" aria-labelledby={domId("ulune-hdc-first-title")}>
      <h3 id={domId("ulune-hdc-first-title")} className="ulune-kicker ulune-hd-first-title">
        {w("hdcFirstTitle")}
      </h3>
      <p className="ulune-hdc-p">{first.lead}</p>
      <ol className="ulune-hd-steps">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              data-testid={`hd-cycles-hello-${st.id}`}
              className={cn("ulune-hd-step", view.selectedId === st.ref && "is-on")}
              aria-label={`${i + 1}. ${st.label}${st.value ? `${colon}${st.value}` : ""}. ${st.text}`}
              onClick={() => view.pick(st.ref)}
              {...previewProps(st.ref)}
            >
              <span className="ulune-hd-step-n" aria-hidden>
                {i + 1}
              </span>
              <span className="ulune-hd-step-body">
                <span className="ulune-hd-step-head">
                  <span className="ulune-kicker ulune-hd-step-k">{st.label}</span>
                  {st.value ? <span className="ulune-hd-step-v">{st.value}</span> : null}
                </span>
                {st.text ? <span className="ulune-hd-step-text">{st.text}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="ulune-hd-first-next">{first.next}</p>
      <Method />
    </section>
  );
}

const loadTable = () => import("@/studio/tables/hd-cycles-table");
const HdCyclesTable = lazyNamed(loadTable, "HdCyclesTable");

function DesignCyclesData() {
  const data = useModeData("design-cycles");
  const view = useWheelView();
  if (!data?.ctx) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <HdCyclesTable ctx={data.ctx} selectedId={view.selectedId} onSelect={view.pick} />
    </Suspense>
  );
}

/**
 * The person's bodygraph, through the door (this device or Ulune's server, as
 * Settings says), kept in the tab's memory of bodygraphs the natal page, the
 * connection chart and Compare share: coming back draws it at once.
 */
function useBodygraph(enabled: boolean, chart: NatalChart | null) {
  const key = chart ? hdKeyOf(chart.meta.utc, chart.meta.timeUnknown) : "";
  const [cast, setCast] = useState<{ key: string; hd: HumanDesignChart } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled || !chart || !key) return;
    const kept = keptHd(key);
    if (kept) {
      setCast({ key, hd: kept });
      setError(null);
      return;
    }
    let gone = false;
    setError(null);
    const span = chart.meta.timeUnknown ? 720 : undefined;
    void door
      .castHumanDesign({ data: span ? { natalUtc: chart.meta.utc, spanMinutes: span } : { natalUtc: chart.meta.utc } })
      .then((hd) => {
        keepHd(key, hd);
        if (!gone) setCast({ key, hd });
      })
      .catch((err: unknown) => {
        if (!gone) setError(errorForState(err));
      });
    return () => {
      gone = true;
    };
    // The chart is read through its key: the same birth gives the same bodygraph.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, tick]);
  const hd = (cast && cast.key === key ? cast.hd : key ? keptHd(key) : null) ?? null;
  const retry = useCallback(() => setTick((n) => n + 1), []);
  return { hd, error, retry };
}

/** The calendar year a moment falls in, in a zone. */
const yearIn = (ms: number, zone: string) => Number(dateFormat("en-GB", { year: "numeric", timeZone: zone }).format(ms));

function useDesignCyclesRuntime(): ModeRuntime<DesignCyclesState> {
  const { locale, t } = useI18n();
  const page = useScopedPage();
  const chart = useScoped((s) => s.chart);
  const creating = useScoped((s) => s.creating);
  const selectedId = useScoped((s) => s.selectedId);
  const enabled = page === "design-cycles" && Boolean(chart) && !creating;
  const at = useScopedTime("at");
  const live = useScopedTime("live");
  const { now } = useScopedTimeSet();
  // The live sky follows the clock, but not in a hidden tab.
  useVisibleInterval(now, 60_000, live && enabled);
  const clock = useClockZone(at).tz;
  const natal = useBodygraph(enabled, chart);
  const sky = useHdMoment(at, enabled);
  const transit = useMemo(() => (natal.hd && sky.moment ? hdTransit(natal.hd, sky.moment) : null), [natal.hd, sky.moment]);
  // What the figure draws changes with the gates and lines, not with each degree.
  const sig = sky.moment ? sky.moment.rows.map((r) => `${r.gate}.${r.line}${r.retrograde ? "r" : ""}`).join(",") : "";
  const figureTransit = useMemo(
    () => transit ?? (natal.hd ? hdTransit(natal.hd, { at, rows: [] }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig, natal.hd],
  );
  // The life cycles once the bodygraph and the moment are here: the moment's own sky goes first.
  const cycles = useHdLifeCycles(chart, enabled && Boolean(natal.hd) && Boolean(sky.moment || sky.error));
  const zone = chart?.meta.timezone || "UTC";
  // The solar return's year follows the dial until the reader steps it; another chart starts again from the dial.
  const chartKey = chart?.meta.utc ?? "";
  const [ownYear, setOwnYear] = useState<{ key: string; year: number } | null>(null);
  const solarYear = ownYear && ownYear.key === chartKey ? ownYear.year : yearIn(at, zone);
  const solar = useHdSolarReturn(chart, solarYear, enabled && Boolean(natal.hd));
  const solarTransit = useMemo(() => (natal.hd && solar.moment ? hdTransit(natal.hd, solar.moment) : null), [natal.hd, solar.moment]);
  const name = chart ? chartDisplayName(chart.meta, t("untitled")) : "";
  const place = chart ? chart.meta.placeLabel?.split(",")[0]?.trim() || zoneCity(zone) : "";
  const ctx = useMemo<HdCyclesContext | null>(
    () =>
      natal.hd && chart
        ? {
            hd: natal.hd,
            name,
            birth: Date.parse(chart.meta.utc),
            at,
            transit,
            week: sky.week,
            moon: sky.moon,
            cycles: cycles.cycles,
            // Nothing to say while it is found, or when the sky could not be had (the side panel offers to try again).
            solar: solar.busy || solar.error ? null : { year: solarYear, at: solar.at, transit: solarTransit },
            zone,
            place,
            clock,
            timeUnknown: Boolean(chart.meta.timeUnknown),
          }
        : null,
    [natal.hd, chart, name, at, transit, sky.week, sky.moon, cycles.cycles, solar.busy, solar.error, solar.at, solarYear, solarTransit, zone, place, clock],
  );
  // The readings come with the page's own reading pack (its own download, one language at a time).
  const pack = usePack("hdcycles", locale, enabled);
  const reading = useMemo(() => (enabled && pack && ctx ? pack.hdCyclesReading(ctx, selectedId, locale) : null), [enabled, pack, ctx, selectedId, locale]);
  const setSolarYear = useCallback((year: number | null) => setOwnYear(year == null ? null : { key: chartKey, year }), [chartKey]);
  const solarState = useMemo(() => ({ ...solar, transit: solarTransit }), [solar, solarTransit]);
  const data = useMemo<DesignCyclesState>(
    () => ({
      enabled,
      chart,
      name,
      natalHd: natal.hd,
      natalError: natal.error,
      retryNatal: natal.retry,
      at,
      live,
      smooth: sky.smooth,
      transit,
      figureTransit,
      skyBusy: sky.busy,
      skyError: sky.error,
      retrySky: sky.retry,
      cycles,
      solar: solarState,
      setSolarYear,
      ctx,
      clock,
    }),
    [enabled, chart, name, natal.hd, natal.error, natal.retry, at, live, sky.smooth, transit, figureTransit, sky.busy, sky.error, sky.retry, cycles, solarState, setSolarYear, ctx, clock],
  );
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const designCyclesMode: ModeDef = {
  ...MODE_META["design-cycles"],
  emptyText: (locale) => said("hdcEmpty", locale),
  Figure: DesignCyclesFigure,
  HelloEmpty: DesignCyclesHello,
  Data: DesignCyclesData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useDesignCyclesRuntime,
};
