import { Suspense, useMemo, useRef } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { chartDisplayName } from "@/lib/chart/library";
import type { NatalChart } from "@/lib/chart/types";
import { BRANCHES, STEMS, phaseWord } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { baziChart, type BaziChart } from "@/lib/chinese/bazi";
import { interactionTone } from "@/lib/chinese/bazi-interactions";
import { baziPair, type BaziPair } from "@/lib/chinese/bazi-pair";
import { PLACE_WORD } from "@/lib/chinese/zodiac-places";
import { branchCellRef, stemRef } from "@/lib/chinese/bazi-reading";
import {
  PAIR_DM_REF,
  PAIR_GIFTS_REF,
  PAIR_PALACE_REF,
  dmLine,
  giftLines,
  luckLines,
  luckRows,
  meetFromLabel,
  meetRowLine,
  pairCellRef,
  pairMeetRef,
  pairReading,
  palaceLine,
  type PairNames,
} from "@/lib/chinese/bazi-pair-reading";
import type { LuckCount } from "@/lib/chinese/bazi-luck";
import { hanziLang } from "@/lib/chinese/animal-chars";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { HowUluneCalculates, MethodNotes } from "@/studio/modes/chinese-notes";
import { useMethodNotes } from "@/studio/modes/hooks/useMethodNotes";
import { usePairPick } from "@/studio/modes/hooks/usePairPick";
import { MODE_META } from "@/studio/modes/meta";
import { PairSelects, type PairPick } from "@/studio/modes/pair-selects";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useKeptScroll } from "@/studio/return-parts";
import { useDomIds, useScopeKey, useScoped } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/zodiac.css";
import "@/studio/modes/styles/zodiac-time.css";
import "@/studio/modes/styles/pair.css";
import "@/studio/modes/styles/bazi-pair.css";

/*
 * BaZi's Relationship lens (languages plan, part 19: "two BaZi charts side
 * by side, Day Master relationship, each chart's day branch (the partner
 * palace) with the other's, and complementary phases"), at /bazi/pair. A is
 * the chart shown, B synastry's partner (one second person for every Pair
 * page). Both boards side by side, the Day Masters outlined; under them the
 * Day Masters' relation, the partner palaces, what each brings the other and
 * every meeting between B's pillars and A's, each opening its reading.
 * Worked out here; nothing is sent. Part 29 adds the method notes to the side
 * panel's first read, each named for its person (chinese-notes.tsx). Part 20
 * (the review's BZ9) adds each person's luck pillar of the moment, by their
 * own yin or yang count (both without one), what it is to the other and how
 * the two decades meet; each row opens that person's decade as Cycles reads
 * it.
 */

export type BaziPairState = {
  pick: PairPick | null;
  a: BaziChart | null;
  b: BaziChart | null;
  pair: BaziPair | null;
  names: PairNames;
  /** The two cast charts, for the method notes (part 29). */
  charts: { a: NatalChart | null; b: NatalChart | null };
  enabled: boolean;
};

function MiniBoard({ person, c, name }: { person: "a" | "b"; c: BaziChart; name: string }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const order = prefs.pillarOrder === "classical" ? (["hour", "day", "month", "year"] as const) : (["year", "month", "day", "hour"] as const);
  const cell = (ref: string, n: number, kind: "stem" | "branch", place: string) => {
    const rec = kind === "stem" ? STEMS[n]! : BRANCHES[n]!;
    const l = chineseLabel(rec, locale, prefs);
    const full = pairCellRef(person, ref);
    return (
      <button
        type="button"
        className={cn("ulune-bzp-cell", w.selectedId === full && "is-on")}
        data-phase={rec.phase}
        data-testid={`bazi-pair-${person}-${place}-${kind}`}
        aria-pressed={w.selectedId === full}
        aria-label={`${name}, ${cnWord(locale, PLACE_WORD[place as "year"])}: ${l.text}${kind === "branch" ? `, ${phaseWord(rec.phase, locale)}` : ""}`}
        onClick={() => w.choose(full)}
        {...previewProps(full)}
      >
        {l.hanzi ? <span className="ulune-bzp-hanzi" lang={hanziLang(prefs.script)}>{l.hanzi}</span> : null}
        <span className="ulune-bzp-name">{l.name}</span>
      </button>
    );
  };
  return (
    <section className={cn("ulune-bzp-board", person === "b" && "is-b")} aria-label={name} data-testid={`bazi-pair-board-${person}`}>
      <h2 className="ulune-zky-h">
        <span className={cn("ulune-zkp-dot", person === "b" && "is-b")} aria-hidden /> {name}
      </h2>
      <div className="ulune-bzp-cols">
        {order.map((id) => {
          const p = c.pillars.find((x) => x.id === id);
          if (!p) return <div key={id} className="ulune-bzp-col is-missing" />;
          return (
            <div key={id} className={cn("ulune-bzp-col", id === "day" && "is-dm")} data-place={id}>
              <span className="ulune-bzp-place">{cnWord(locale, PLACE_WORD[id])}</span>
              {cell(stemRef(id), p.stem, "stem", id)}
              {cell(branchCellRef(id), p.branch, "branch", id)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Card({ refId, testId, title, lines }: { refId: string; testId: string; title: string; lines: string[] }) {
  const w = useWheelView();
  return (
    <button
      type="button"
      className={cn("ulune-bzp-card", w.selectedId === refId && "is-on")}
      data-testid={testId}
      aria-pressed={w.selectedId === refId}
      onClick={() => w.choose(refId)}
      {...previewProps(refId)}
    >
      <span className="ulune-zky-h">{title}</span>
      {lines.map((l, i) => (
        <span key={i} className="ulune-bzp-line">
          {l}
        </span>
      ))}
    </button>
  );
}

function PairFigure() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("bazi-pair");
  const partnerBirth = useScoped((s) => s.pair.addingPartnerFor === "bazi-pair");
  // Its own scroll comes back where it was when the studio does (reorganisation R6; part 28).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, useScopeKey("bazi-pair-scroll"), Boolean(data?.a && data.b && data.pair));
  const domId = useDomIds();
  if (!data?.a) return null;
  if (!data.b || !data.pair) {
    if (partnerBirth) return <div data-testid="bazi-pair-need-second" className="hidden" />;
    return (
      <div data-testid="bazi-pair-need-second" className="grid min-h-[12rem] place-items-center px-4 text-center">
        <button
          type="button"
          data-testid="bazi-pair-add-second"
          onClick={() => data.pick?.addSecond()}
          className="inline-flex min-h-[var(--btn-h)] items-center justify-center rounded-md px-4 font-display text-2xl leading-none text-fg hover:text-fg-muted"
        >
          {cnWord(locale, "zkPairAdd")}
        </button>
      </div>
    );
  }
  const { a, b, pair, names } = data;
  return (
    <div ref={scroller} className="ulune-bzp" data-testid="bazi-pair" data-chart-pick>
      <div className="ulune-bzp-boards">
        <MiniBoard person="a" c={a} name={names.a} />
        <MiniBoard person="b" c={b} name={names.b} />
      </div>
      <div className="ulune-bzp-cards">
        <Card refId={PAIR_DM_REF} testId="bazi-pair-dm" title={cnWord(locale, "bzpDmHead")} lines={[dmLine(pair, names, locale, prefs)]} />
        <Card refId={PAIR_PALACE_REF} testId="bazi-pair-palace" title={cnWord(locale, "bzpPalaceHead")} lines={[palaceLine(pair, names, locale, prefs)]} />
        <Card refId={PAIR_GIFTS_REF} testId="bazi-pair-gifts" title={cnWord(locale, "bzpPhasesHead")} lines={giftLines(pair, names, locale)} />
      </div>
      <section className="ulune-bzp-meets" aria-labelledby={domId("bzp-meets-h")}>
        <h2 id={domId("bzp-meets-h")} className="ulune-zky-h">
          {cnWord(locale, "bzpMeetHead")}
        </h2>
        <ul>
          {pair.meetings.map((m) => {
            const ref = pairMeetRef(m.from);
            return (
              <li key={m.from}>
                <button
                  type="button"
                  className={cn("ulune-bz-ixrow", w.selectedId === ref && "is-on")}
                  data-testid={`bazi-pair-meet-${m.from}`}
                  data-tone={m.meets.length ? (m.meets.some((x) => interactionTone(x.kind) === "tension") ? "tension" : "meet") : undefined}
                  aria-pressed={w.selectedId === ref}
                  onClick={() => w.choose(ref)}
                  {...previewProps(ref)}
                >
                  <span className="ulune-bz-ixrow-top">
                    <span className="ulune-bz-ixrow-kind">{meetFromLabel(names, m.from, locale, PLACE_WORD)}</span>
                  </span>
                  <span className="ulune-bz-ixrow-sub">{meetRowLine(pair, m.from, names, locale, prefs)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <LuckSection pair={pair} names={names} />
    </div>
  );
}

/** Each person's luck pillar of the moment, then how the two decades meet (part 20). */
function LuckSection({ pair, names }: { pair: BaziPair; names: PairNames }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const rows = luckRows(pair, names, locale, prefs);
  const domId = useDomIds();
  if (!rows.length) return null;
  return (
    <section className="ulune-bzp-meets ulune-bzp-luck" aria-labelledby={domId("bzp-luck-h")} data-testid="bazi-pair-luck">
      <h2 id={domId("bzp-luck-h")} className="ulune-zky-h">
        {cnWord(locale, "bzpLuckHead")}
      </h2>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={cn("ulune-bz-ixrow", w.selectedId === r.ref && "is-on")}
              data-testid={`bazi-pair-luck-${r.id}`}
              data-tone={r.tone}
              aria-pressed={w.selectedId === r.ref}
              onClick={() => w.choose(r.ref)}
              {...previewProps(r.ref)}
            >
              <span className="ulune-bz-ixrow-top">
                <span className="ulune-bz-ixrow-kind">{r.kind}</span>
              </span>
              <span className="ulune-bz-ixrow-sub">{r.sub}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PairControls() {
  const data = useModeData("bazi-pair");
  if (!data?.pick) return null;
  return <PairSelects mode="synastry" pair={data.pick} prefix="bazi-pair" page="bazi-pair" />;
}

/** The side panel with nothing chosen: what Pair compares, then its cards' lines and the luck pillars of the moment (part 20); first each person's method notes, last how Ulune calculates (part 29). */
function PairHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("bazi-pair");
  const notes = useMethodNotes("bazi-pair", data?.charts.a ?? null, { chart: data?.charts.b ?? null, names: data?.names ?? { a: "A", b: "B" } });
  if (!data?.a) return null;
  if (!data.pair) {
    return (
      <section className="ulune-zk-hello" data-testid="bazi-pair-hello" data-empty="1">
        <MethodNotes notes={notes} />
        <button type="button" data-testid="bazi-pair-add-second-panel" onClick={() => data.pick?.addSecond()} className="inline-flex min-h-11 items-center rounded-md font-display text-xl leading-tight text-fg hover:text-fg-muted">
          {cnWord(locale, "zkPairAdd")}
        </button>
        <HowUluneCalculates page="bazi-pair" />
      </section>
    );
  }
  const rows: [string, string][] = [
    [PAIR_DM_REF, dmLine(data.pair, data.names, locale, prefs)],
    [PAIR_PALACE_REF, palaceLine(data.pair, data.names, locale, prefs)],
    ...giftLines(data.pair, data.names, locale).map((l) => [PAIR_GIFTS_REF, l] as [string, string]),
    ...luckLines(data.pair, data.names, locale, prefs).map((l) => [l.ref, l.text] as [string, string]),
  ];
  return (
    <section className="ulune-zk-hello" data-testid="bazi-pair-hello">
      <MethodNotes notes={notes} />
      <h2 className="ulune-zk-hello-h">{cnWord(locale, "bzpTitle")}</h2>
      <p className="ulune-zk-hello-p">{cnWord(locale, "bzpLead")}</p>
      <ul className="ulune-zk-hello-list">
        {rows.map(([ref, line], i) => (
          <li key={i}>
            <button type="button" className="ulune-zk-hello-row is-rel" data-testid="bazi-pair-hello-row" onClick={() => w.pick(ref)}>
              <span>{line}</span>
            </button>
          </li>
        ))}
      </ul>
      <HowUluneCalculates page="bazi-pair" />
    </section>
  );
}

const loadTable = () => import("@/studio/tables/bazi-pair-table");
const BaziPairTable = lazyNamed(loadTable, "BaziPairTable");

function PairData() {
  const data = useModeData("bazi-pair");
  const w = useWheelView();
  if (!data?.pair || !data.b) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <BaziPairTable p={data.pair} b={data.b} names={data.names} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

const castOf = (chart: NatalChart | null, prefs: ReturnType<typeof useChinesePrefs>) =>
  chart
    ? baziChart(
        { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown },
        { clock: prefs.clock, dayBoundary: prefs.dayBoundary },
      )
    : null;

/** A birth's yin or yang count, when it gives one. */
const countOf = (n: string | undefined): LuckCount | null => (n === "yang" || n === "yin" ? n : null);

function usePairRuntime(): ModeRuntime<BaziPairState> {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const page = useStudioStore((s) => s.page);
  const chart = useScoped((s) => s.chart);
  const selectedId = useScoped((s) => s.selectedId);
  const enabled = page === "bazi-pair" && Boolean(chart);
  const { pick, inner, chartB } = usePairPick(enabled, "bazi-pair");
  // Each birth's own count (part 20): the chart shown's as its input holds it (as on Cycles), the partner's as its saved chart keeps it.
  const activeId = useScoped((s) => s.activeId);
  const inputCount = useScoped((s) => s.input.chineseCount);
  const rows = useStudioStore((s) => s.rows);
  const countA = countOf(pick.aId && pick.aId === activeId ? inputCount : rows.find((r) => r.id === pick.aId)?.input.chineseCount);
  const countB = countOf(rows.find((r) => r.id === pick.resolvedBId)?.input.chineseCount);
  const a = useMemo(() => (enabled ? castOf(inner, prefs) : null), [enabled, inner, prefs]);
  const b = useMemo(() => (enabled ? castOf(chartB, prefs) : null), [enabled, chartB, prefs]);
  const names = useMemo(
    () => ({ a: inner ? chartDisplayName(inner.meta, t("untitled")) : "A", b: chartB ? chartDisplayName(chartB.meta, t("untitled")) : "B" }),
    [inner, chartB, t],
  );
  // The luck pillars are read at the moment the two charts are paired (part 20), as the first read reads "now".
  const pair = useMemo(() => (a && b ? baziPair(a, b, { nowMs: Date.now(), counts: { a: countA, b: countB } }) : null), [a, b, countA, countB]);
  const tzA = inner?.meta.timezone;
  const tzB = chartB?.meta.timezone;
  const reading = useMemo(
    () => (pair && a && b ? pairReading(pair, a, b, selectedId, names, locale, prefs, { a: tzA, b: tzB }) : null),
    [pair, a, b, selectedId, names, locale, prefs, tzA, tzB],
  );
  const data = useMemo(() => ({ pick, a, b, pair, names, charts: { a: inner, b: chartB }, enabled }), [pick, a, b, pair, names, inner, chartB, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const baziPairMode: ModeDef = {
  ...MODE_META["bazi-pair"],
  emptyText: (locale) => cnWord(locale, "bzpEmpty"),
  Controls: PairControls,
  Figure: PairFigure,
  HelloEmpty: PairHello,
  Data: PairData,
  preloadData: () => prefetch(loadTable),
  useRuntime: usePairRuntime,
};
