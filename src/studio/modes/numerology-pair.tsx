import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { deFr } from "@/lib/chinese/both";
import { chartDisplayName } from "@/lib/chart/library";
import { castNumerology, numerologyOptionsOf, type NumerologyChart } from "@/lib/chart/numerology";
import { PAIR_CORES, numerologyPair, pairRow, type PairCoreId, type PairId, type PairPerson, type PairRow } from "@/lib/chart/numerology-pair";
import { NP_REL_REF, NP_YEAR_REF, digitLine, npDigitRef, npPairRef, pairLabel, yearLine, type PairContext } from "@/lib/chart/interpret-numerology-pair";
import { polar, sectorAngle, sectorPath } from "@/lib/chart/numerology-wheel";
import { isMaster, wholeText, type NumerologyValue } from "@/lib/chart/numerology-reduce";
import type { NatalChart } from "@/lib/chart/types";
import { registerPack, usePack, type NumPairPack } from "@/lib/content/packs";
import { previewProps } from "@/lib/depth/preview-bus";
import { focusField } from "@/lib/focus-field";
import { npWord } from "@/lib/i18n/catalog/numerology-pair-words";
import { useI18n } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyCoreLabel, numerologyNoNatal, numerologyWheelText } from "@/lib/i18n/numerology-ui";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { usePairPick } from "@/studio/modes/hooks/usePairPick";
import { MODE_META } from "@/studio/modes/meta";
import { PairSelects, type PairPick } from "@/studio/modes/pair-selects";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { NUMEROLOGY_FIRST_YEAR, NUMEROLOGY_LAST_YEAR, setNumerologyYear, useNumerologyYear } from "@/studio/numerology-year";
import { useKeptScroll } from "@/studio/return-parts";
import { useDomIds, useScopeId, useScopeKey, useScoped } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/first-read.css";
import "@/studio/modes/styles/pair.css";
import "@/studio/modes/styles/numerology-pair.css";

// This page's reading text (lib/content/packs.ts): its loaders arrive with the page, not in the first download.
registerPack("numpair", {
  en: () => import("@/lib/content/pack-num-pair?lang=en"),
  fr: () => import("@/lib/content/pack-num-pair?lang=fr"),
});

/*
 * Numerology's Relationship (share and compare plan, feature 5c; decision
 * R3), at /numerology/pair, numerology's Relationship lens (Alt+3): two
 * people's numbers side by side, A the chart shown and B synastry's partner
 * (the one second person every Relationship page shares). Each person's
 * numbers follow the numerology pages' own rules (the full name at birth,
 * else the chart's typed name; without one the name's numbers wait, and the
 * page says where to add it).
 *
 * The figure is the numerology wheel made for two: the nine numbers as a
 * band, A's six numbers inside it (filled discs) and B's outside (rings), a
 * digit both hold ringed, the relationship number in the centre. Each pair of
 * the same number is one part of the wheel (both discs and the line between
 * them): one Tab stop, the arrows walk the six pairs, Enter opens a pair's
 * reading. Beside it, the relationship number, the six pairs and the four
 * crossed ones, each with how the two tend to work together, the shared
 * digits and "You two, now": both personal years for the year shown (the
 * numerology pages' own year steps) and the relationship's year. Dynamics,
 * never a score. The table (Copy, CSV) holds the same, and the numerology
 * table's former "Compare" lives here now. Worked out on the device; nothing
 * is sent.
 */

export type NumerologyPairState = {
  pick: PairPick | null;
  ctx: PairContext | null;
  /** The pairs' texts (their own download, in the reader's language), once here. */
  pack: NumPairPack | null;
  /** Whose name numbers wait for a full name at birth. */
  waits: Record<PairPerson, boolean>;
  enabled: boolean;
};

/* The wheel for two: the band of the nine numbers, A's discs inside, B's outside. */
const HALF = 252;
const R_BAND_IN = 148;
const R_BAND_OUT = 186;
const R_DIGIT = 167;
const R_CENTRE = 52;
const DISC = 14.5;
/** Each person's two rows of discs: A's inside the band, B's outside it. */
const ROWS: Record<PairPerson, [number, number]> = { a: [122, 92], b: [213, 240] };
/** Offsets (degrees) in a sector for 1 to 6 discs: one row, then two. */
const SPREAD: Record<number, [number[], number[]]> = {
  1: [[0], []],
  2: [[-9.5, 9.5], []],
  3: [[-12, 0, 12], []],
  4: [[-9.5, 9.5], [-13, 13]],
  5: [[-12, 0, 12], [-13, 13]],
  6: [[-12, 0, 12], [-16, 0, 16]],
};

type Disc = { core: PairCoreId; value: NumerologyValue; x: number; y: number };

/** A person's discs in their sectors (a master by its root's sector, a debt by its number's). */
function discsOf(chart: NumerologyChart, who: PairPerson): Disc[] {
  const by = new Map<number, { core: PairCoreId; value: NumerologyValue }[]>();
  for (const core of PAIR_CORES) {
    const value = (core === "lifepath" ? chart.lifePath : core === "expression" ? chart.expression : core === "soulurge" ? chart.soulUrge : core === "personality" ? chart.personality : core === "birthday" ? chart.birthday : chart.maturity) as NumerologyValue;
    if (value.digit == null) continue;
    by.set(value.digit, [...(by.get(value.digit) ?? []), { core, value }]);
  }
  const out: Disc[] = [];
  for (const [digit, list] of by) {
    const [one, two] = SPREAD[Math.min(list.length, 6)]!;
    const mid = sectorAngle(digit);
    list.forEach((d, i) => {
      const inOne = i < one.length;
      const p = polar(inOne ? ROWS[who][0] : ROWS[who][1], mid + (inOne ? one[i]! : (two[i - one.length] ?? 0)));
      out.push({ ...d, x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 });
    });
  }
  return out;
}

/** "13/4", "11/2", "3"; a dash for a number that waits for a name. */
const whole = (v: NumerologyValue) => (v.number == null ? "—" : wholeText(v));
/** ": " and "; ", with French's narrow no-break space before them. */
const colonOf = (locale: AppLocale) => (locale === "fr" ? "\u202f: " : ": ");
const semiOf = (locale: AppLocale) => (locale === "fr" ? "\u202f; " : "; ");

/** A disc: A's filled, B's a ring; a master or a karmic debt written whole, ringed again. */
function DiscMark({ d, who }: { d: Disc; who: PairPerson }) {
  const text = whole(d.value);
  const marked = Boolean(d.value.debt) || isMaster(d.value.number);
  return (
    <g className={cn("ulune-np-disc", `is-${who}`)} data-core={d.core} data-who={who}>
      {marked ? <circle cx={d.x} cy={d.y} r={DISC + 3.5} className="ulune-np-disc-ring" /> : null}
      <circle cx={d.x} cy={d.y} r={DISC} className="ulune-np-disc-face" />
      <text x={d.x} y={d.y} dy="0.36em" textAnchor="middle" data-long={text.length > 2 ? "1" : undefined}>
        {text}
      </text>
    </g>
  );
}

/** The wheel for two. One Tab stop: the arrows walk the six pairs, Enter opens one. */
function PairWheel({ ctx, onSay }: { ctx: PairContext; onSay: (id: PairId | null) => void }) {
  const { locale } = useI18n();
  const w = useWheelView();
  const ring = useRef<SVGGElement>(null);
  const { pair, names } = ctx;
  const discs = useMemo(() => ({ a: discsOf(pair.a, "a"), b: discsOf(pair.b, "b") }), [pair]);
  const shared = new Set(pair.shared.map((s) => s.digit));
  const chosen = PAIR_CORES.find((id) => w.selectedId === npPairRef(id));
  const live = PAIR_CORES.filter((id) => pairRow(pair, id).text);
  const stop: PairCoreId = chosen ?? live[0] ?? "lifepath";
  const lit = chosen ?? null;
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const el = (e.target as Element).closest<SVGGElement>("[data-pair]");
    if (!el) return;
    const i = live.indexOf(el.dataset.pair as PairCoreId);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % live.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i + live.length - 1) % live.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = live.length - 1;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      w.pick(npPairRef(live[i]!));
      return;
    }
    if (next == null) return;
    e.preventDefault();
    ring.current?.querySelector<SVGGElement>(`[data-pair="${live[next]}"]`)?.focus();
  };
  const relOn = w.selectedId === NP_REL_REF;
  return (
    <svg
      viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`}
      className="ulune-np-svg"
      role="group"
      aria-label={npWord(locale, "npWheelAria", { a: names.a, b: names.b, deA: deFr(names.a), deB: deFr(names.b) })}
      data-testid="numerology-pair-wheel"
      data-focus={lit ? "pinned" : undefined}
    >
      <g className="ulune-np-band" aria-hidden>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const at = polar(R_DIGIT, sectorAngle(n));
          const both = shared.has(n);
          return (
            <g key={n} className={cn("ulune-np-sector", both && "is-shared")} data-testid={`numerology-pair-sector-${n}`} data-shared={both ? "1" : undefined}>
              <path d={sectorPath(n, 0.8, R_BAND_IN, R_BAND_OUT)} className="ulune-np-sector-band" />
              {both ? <path d={sectorPath(n, 1.6, R_BAND_IN - 4, R_BAND_OUT + 4)} className="ulune-np-sector-ring" /> : null}
              <text x={at.x} y={at.y} dy="0.36em" textAnchor="middle">
                {n}
              </text>
            </g>
          );
        })}
      </g>
      {/* A's discs and B's that belong to no pair the keyboard walks (a number that waits for a name has no partner). */}
      <g ref={ring} onKeyDown={onKey}>
        {PAIR_CORES.map((id) => {
          const r = pairRow(pair, id);
          const da = discs.a.find((d) => d.core === id);
          const db = discs.b.find((d) => d.core === id);
          const ref = npPairRef(id);
          const on = w.selectedId === ref;
          const usable = Boolean(r.text && da && db);
          // The pair said under the wheel, and the reading previewed beside it (previewProps), both.
          const pv = previewProps(ref);
          const label = `${pairLabel(r, names, locale)}${colonOf(locale)}${names.a} ${whole(r.a.value)}, ${names.b} ${whole(r.b.value)}${r.gap ? `${semiOf(locale)}${r.same ? npWord(locale, "npSame") : npWord(locale, "npGap", { n: r.gap.number ?? 0 })}` : ""}`;
          return (
            <g
              key={id}
              data-pair={id}
              data-testid={`numerology-pair-part-${id}`}
              className={cn("ulune-np-pair", on && "is-on", lit && !on && "is-faded")}
              {...(usable
                ? {
                    role: "button",
                    tabIndex: id === stop ? 0 : -1,
                    "aria-label": label,
                    "aria-pressed": on,
                    onClick: () => w.choose(ref),
                    onPointerDown: pv.onPointerDown,
                    onPointerEnter: (e: PointerEvent<SVGGElement>) => {
                      onSay(id);
                      pv.onPointerEnter?.(e);
                    },
                    onPointerLeave: (e: PointerEvent<SVGGElement>) => {
                      onSay(null);
                      pv.onPointerLeave?.(e);
                    },
                    onFocus: (e: FocusEvent<SVGGElement>) => {
                      onSay(id);
                      pv.onFocus?.(e);
                    },
                    onBlur: (e: FocusEvent<SVGGElement>) => {
                      onSay(null);
                      pv.onBlur?.(e);
                    },
                  }
                : { "aria-hidden": true })}
            >
              {da && db ? <line x1={da.x} y1={da.y} x2={db.x} y2={db.y} className="ulune-np-chord" /> : null}
              {da ? <DiscMark d={da} who="a" /> : null}
              {db ? <DiscMark d={db} who="b" /> : null}
            </g>
          );
        })}
      </g>
      {/* The centre: the relationship number; it opens its reading (its card beside does the same by keyboard). */}
      <g className={cn("ulune-np-centre", relOn && "is-on")} onClick={() => w.choose(NP_REL_REF)} aria-hidden data-testid="numerology-pair-centre">
        <circle r={R_CENTRE} />
        <text y={-18} dy="0.36em" textAnchor="middle" className="ulune-np-centre-k">
          {npWord(locale, "npCentre")}
        </text>
        <text y={8} dy="0.36em" textAnchor="middle" className="ulune-np-centre-n">
          {whole(pair.relationship)}
        </text>
      </g>
    </svg>
  );
}

/** Under the wheel: who is where, and what a ring says. */
function WheelKey({ names }: { names: PairContext["names"] }) {
  const { locale } = useI18n();
  return (
    <div className="ulune-np-key" data-testid="numerology-pair-key">
      <p>
        <span className="ulune-np-dot" aria-hidden /> {npWord(locale, "npKeyInside", { a: names.a })} <span className="ulune-np-dot is-b" aria-hidden /> {npWord(locale, "npKeyOutside", { b: names.b })}
      </p>
      <p>{npWord(locale, "npKeyShared")}</p>
    </div>
  );
}

/** A pair as a row: its name, both numbers, how the two tend to work together (once the texts are here) and its bridge. */
function PairRowButton({ r, ctx, pack }: { r: PairRow; ctx: PairContext; pack: NumPairPack | null }) {
  const { locale } = useI18n();
  const w = useWheelView();
  const ref = npPairRef(r.id);
  const on = w.selectedId === ref;
  const together = pack?.pairTogether(r, locale) ?? null;
  const line = together ? (together.split(/(?<=[.!?])\s/)[0] ?? together) : null;
  return (
    <li>
      <button
        type="button"
        className={cn("ulune-np-row", on && "is-on")}
        data-testid={`numerology-pair-row-${r.id}`}
        data-key={r.key ?? ""}
        aria-pressed={on}
        onClick={() => w.choose(ref)}
        {...previewProps(ref)}
      >
        <span className="ulune-np-row-head">
          <span className="ulune-np-row-name">{pairLabel(r, ctx.names, locale)}</span>
          <span className="ulune-np-row-nums">
            <span className="ulune-np-num is-a">
              <span className="ulune-np-dot" aria-hidden />
              <span className="sr-only">
                {ctx.names.a}
                {colonOf(locale)}
              </span>
              {whole(r.a.value)}
            </span>
            <span className="ulune-np-num is-b">
              <span className="ulune-np-dot is-b" aria-hidden />
              <span className="sr-only">
                {ctx.names.b}
                {colonOf(locale)}
              </span>
              {whole(r.b.value)}
            </span>
            {r.gap ? <span className="ulune-np-gap">{r.same ? npWord(locale, "npSame") : npWord(locale, "npGap", { n: r.gap.number ?? 0 })}</span> : null}
          </span>
        </span>
        {r.text ? (
          <span className="ulune-np-row-line">{line ?? " "}</span>
        ) : (
          <span className="ulune-np-row-line is-wait">{npWord(locale, "npWait", { name: r.a.value.number == null ? ctx.names.a : ctx.names.b, deName: deFr(r.a.value.number == null ? ctx.names.a : ctx.names.b) })}</span>
        )}
      </button>
    </li>
  );
}

/** ‹ 2026 ›: the year both personal years are read for (the numerology pages' own steps, shared with Cycles). */
function YearSteps({ year, locale }: { year: number; locale: AppLocale }) {
  const thisYear = new Date().getFullYear();
  return (
    <span className="ulune-np-steps">
      <button type="button" className="ulune-np-step" data-testid="numerology-pair-year-prev" aria-label={numerologyWheelText(locale, "prevYear")} title={numerologyWheelText(locale, "prevYear")} disabled={year <= NUMEROLOGY_FIRST_YEAR} onClick={() => setNumerologyYear(year - 1)}>
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className="ulune-np-step is-year"
        data-testid="numerology-pair-year"
        data-now={year === thisYear ? "1" : undefined}
        aria-label={year === thisYear ? String(year) : numerologyWheelText(locale, "backToNow")}
        title={year === thisYear ? undefined : numerologyWheelText(locale, "backToNow")}
        onClick={() => setNumerologyYear(null)}
      >
        {year}
      </button>
      <button type="button" className="ulune-np-step" data-testid="numerology-pair-year-next" aria-label={numerologyWheelText(locale, "nextYear")} title={numerologyWheelText(locale, "nextYear")} disabled={year >= NUMEROLOGY_LAST_YEAR} onClick={() => setNumerologyYear(year + 1)}>
        <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </span>
  );
}

/** The birth form's names for numerology, the full name at birth first (A's, on the main page only). */
function useOpenNames(): (() => void) | null {
  const main = useScopeId() === "main";
  const openDock = useStudioStore((s) => s.openDock);
  if (!main) return null;
  return () => {
    openDock("birth");
    focusField("birth-full-name");
  };
}

function PairFigure() {
  const { locale } = useI18n();
  const w = useWheelView();
  const data = useModeData("numerology-pair");
  const partnerBirth = useScoped((s) => s.pair.addingPartnerFor === "numerology-pair");
  const openNames = useOpenNames();
  const domId = useDomIds();
  const [say, setSay] = useState<PairId | null>(null);
  // On a screen without hover, the hint says "tap" rather than "point at".
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches) setTouch(true);
  }, []);
  // Its own scroll comes back where it was when the studio does (reorganisation R6).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, useScopeKey("numerology-pair-scroll"), Boolean(data?.ctx));
  if (!data?.enabled) return null;
  if (!data.ctx) {
    if (partnerBirth) return <div data-testid="numerology-pair-need-second" className="hidden" />;
    return (
      <div data-testid="numerology-pair-need-second" className="grid min-h-[12rem] place-items-center px-4 text-center">
        <button
          type="button"
          data-testid="numerology-pair-add-second-wheel"
          onClick={() => data.pick?.addSecond()}
          className="inline-flex min-h-[var(--btn-h)] items-center justify-center rounded-md px-4 font-display text-2xl leading-none text-fg hover:text-fg-muted"
        >
          {npWord(locale, "npAddSecond")}
        </button>
      </div>
    );
  }
  const ctx = data.ctx;
  const { pair, names } = ctx;
  const same = pair.rows.filter((r) => !r.cross);
  const cross = pair.rows.filter((r) => r.cross);
  const sayRow = say ? pairRow(pair, say) : w.selectedId?.startsWith("np:pair:") ? pairRow(pair, w.selectedId.slice(8) as PairId) : null;
  const sayLine = sayRow
    ? `${pairLabel(sayRow, names, locale)}${colonOf(locale)}${names.a} ${whole(sayRow.a.value)} · ${names.b} ${whole(sayRow.b.value)}${sayRow.gap ? ` · ${sayRow.same ? npWord(locale, "npSame") : npWord(locale, "npGap", { n: sayRow.gap.number ?? 0 })}` : ""}`
    : npWord(locale, touch ? "npSayHintTouch" : "npSayHint");
  const relText = data.pack?.relationshipText(pair.relationship.number, locale) ?? "";
  const yearText = data.pack?.coupleYearText(pair.year.together.number, locale) ?? "";
  const h = (id: string) => domId(`np-${id}-h`);
  return (
    <div ref={scroller} className="ulune-np" data-testid="numerology-pair" data-chart-pick data-rel={pair.relationship.number ?? ""} data-year={pair.year.year}>
      <div className="ulune-np-body">
        <div className="ulune-np-figure">
          <div className="ulune-np-wheelbox">
            <PairWheel ctx={ctx} onSay={setSay} />
          </div>
          <p className="ulune-np-say" data-testid="numerology-pair-say" data-on={sayRow ? "1" : undefined}>
            {sayLine}
          </p>
          <WheelKey names={names} />
        </div>
        <div className="ulune-np-side">
          {data.waits.a || data.waits.b ? (
            <div className="ulune-np-names" data-testid="numerology-pair-names">
              {data.waits.a ? (
                <p>
                  {npWord(locale, "npNameWaits", { name: names.a, deName: deFr(names.a) })}{" "}
                  {openNames ? (
                    <button type="button" className="ob-keep-link" data-testid="numerology-pair-add-name" onClick={openNames}>
                      {npWord(locale, "npAddName")}
                    </button>
                  ) : null}
                </p>
              ) : null}
              {data.waits.b ? <p>{npWord(locale, "npNameWaitsB", { name: names.b, deName: deFr(names.b) })}</p> : null}
            </div>
          ) : null}
          <button
            type="button"
            className={cn("ulune-np-card ulune-np-rel", w.selectedId === NP_REL_REF && "is-on")}
            data-testid="numerology-pair-rel"
            aria-pressed={w.selectedId === NP_REL_REF}
            onClick={() => w.choose(NP_REL_REF)}
            {...previewProps(NP_REL_REF)}
          >
            <span className="ulune-np-h">{npWord(locale, "npRelHead")}</span>
            <span className="ulune-np-rel-row">
              <b className="ulune-np-rel-n">{whole(pair.relationship)}</b>
              <span className="ulune-np-rel-steps">{npWord(locale, "npRelSteps", { steps: pair.relationship.chain && pair.relationship.terms ? `${pair.relationship.terms.map((t) => t.value).join(" + ")} = ${pair.relationship.chain.join(" → ")}` : whole(pair.relationship) })}</span>
            </span>
            {relText ? <span className="ulune-np-card-line">{relText}</span> : null}
          </button>
          <section aria-labelledby={h("side")} className="ulune-np-list">
            <h3 id={h("side")} className="ulune-np-h">
              {npWord(locale, "npSideHead")}
            </h3>
            <ul>
              {same.map((r) => (
                <PairRowButton key={r.id} r={r} ctx={ctx} pack={data.pack} />
              ))}
            </ul>
          </section>
          <section aria-labelledby={h("cross")} className="ulune-np-list">
            <h3 id={h("cross")} className="ulune-np-h">
              {npWord(locale, "npCrossHead")}
            </h3>
            <ul>
              {cross.map((r) => (
                <PairRowButton key={r.id} r={r} ctx={ctx} pack={data.pack} />
              ))}
            </ul>
          </section>
          <section aria-labelledby={h("shared")} className="ulune-np-list" data-testid="numerology-pair-shared">
            <h3 id={h("shared")} className="ulune-np-h">
              {npWord(locale, "npSharedHead")}
            </h3>
            {pair.shared.length ? (
              <ul className="ulune-np-digits">
                {pair.shared.map((s) => {
                  const ref = npDigitRef(s.digit);
                  return (
                    <li key={s.digit}>
                      <button type="button" className={cn("ulune-np-digit", w.selectedId === ref && "is-on")} data-testid={`numerology-pair-digit-${s.digit}`} aria-pressed={w.selectedId === ref} onClick={() => w.choose(ref)} {...previewProps(ref)}>
                        <b className="ulune-np-digit-n">{s.digit}</b>
                        <span>{digitLine(s, names, locale)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="ulune-np-none" data-testid="numerology-pair-shared-none">
                {npWord(locale, "npSharedNone")}
              </p>
            )}
          </section>
          <section className={cn("ulune-np-card ulune-np-now", w.selectedId === NP_YEAR_REF && "is-on")} aria-labelledby={h("now")} data-testid="numerology-pair-now">
            <span className="ulune-np-now-head">
              <h3 id={h("now")} className="ulune-np-h">
                {npWord(locale, "npNowHead")}
              </h3>
              <YearSteps year={pair.year.year} locale={locale} />
            </span>
            <button type="button" className="ulune-np-now-line" data-testid="numerology-pair-year-line" aria-pressed={w.selectedId === NP_YEAR_REF} onClick={() => w.choose(NP_YEAR_REF)} {...previewProps(NP_YEAR_REF)}>
              <span>{yearLine(ctx, locale)}</span>
              {yearText ? <span className="ulune-np-card-line">{yearText}</span> : null}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function PairControls() {
  const data = useModeData("numerology-pair");
  if (!data?.pick) return null;
  return <PairSelects mode="synastry" pair={data.pick} prefix="numerology-pair" page="numerology-pair" />;
}

/**
 * The side panel with nothing chosen (the first read): the relationship number, the Life Paths, the
 * Soul Urges (else the Birthdays, without the names), the shared digits and the two of you this year.
 */
function PairHello() {
  const { locale } = useI18n();
  const w = useWheelView();
  const data = useModeData("numerology-pair");
  const domId = useDomIds();
  if (!data?.enabled) return null;
  if (!data.ctx) {
    return (
      <section className="ulune-np-hello" data-testid="numerology-pair-hello" data-empty="1">
        <button type="button" data-testid="numerology-pair-add-second-panel" onClick={() => data.pick?.addSecond()} className="inline-flex min-h-11 items-center rounded-md font-display text-xl leading-tight text-fg hover:text-fg-muted">
          {npWord(locale, "npAddSecond")}
        </button>
        <p className="ulune-np-hello-p">{npWord(locale, "npLead")}</p>
      </section>
    );
  }
  if (!data.pack) return <LoadingLines lines={4} />;
  const ctx = data.ctx;
  const { pair, names } = ctx;
  const lines = data.pack.firstReadLines(ctx, locale);
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const nums = (id: PairId) => {
    const r = pairRow(pair, id);
    return `${whole(r.a.value)} · ${whole(r.b.value)}`;
  };
  const heart: PairId = pairRow(pair, "soulurge").text ? "soulurge" : "birthday";
  const firstShared = pair.shared[0];
  type Step = { id: string; ref: string; label: string; value: string; text: string };
  const steps: Step[] = [
    { id: "rel", ref: NP_REL_REF, label: npWord(locale, "npRelHead"), value: whole(pair.relationship), text: lines.rel },
    { id: "lifepath", ref: npPairRef("lifepath"), label: numerologyCoreLabel(locale, "lifepath"), value: nums("lifepath"), text: lines.pairs.lifepath ?? "" },
    { id: heart, ref: npPairRef(heart), label: numerologyCoreLabel(locale, heart), value: nums(heart), text: lines.pairs[heart] ?? "" },
    firstShared
      ? { id: "shared", ref: npDigitRef(firstShared.digit), label: npWord(locale, "npSharedHead"), value: pair.shared.map((s) => s.digit).join(", "), text: digitLine(firstShared, names, locale) }
      : { id: "shared", ref: NP_REL_REF, label: npWord(locale, "npSharedHead"), value: "", text: npWord(locale, "npSharedNone") },
    { id: "year", ref: NP_YEAR_REF, label: npWord(locale, "npNowHead"), value: String(pair.year.year), text: yearLine(ctx, locale) },
  ];
  return (
    <section className="ulune-hd-first ulune-np-first" data-testid="numerology-pair-hello" aria-labelledby={domId("ulune-np-first-title")}>
      <h3 id={domId("ulune-np-first-title")} className="ulune-kicker ulune-hd-first-title">
        {npWord(locale, "npFirstTitle")}
      </h3>
      <p className="ulune-np-hello-p">{npWord(locale, "npLead")}</p>
      <ol className="ulune-hd-steps">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              data-testid={`numerology-pair-hello-${st.id}`}
              className={cn("ulune-hd-step", w.selectedId === st.ref && "is-on")}
              aria-label={`${i + 1}. ${st.label}${st.value ? `${colon}${st.value}` : ""}. ${st.text}`}
              onClick={() => w.pick(st.ref)}
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
                <span className="ulune-hd-step-text">{st.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="ulune-np-hello-p">{npWord(locale, "npNoVerdict")}</p>
    </section>
  );
}

const loadTable = () => import("@/studio/tables/numerology-pair-table");
const NumerologyPairTable = lazyNamed(loadTable, "NumerologyPairTable");

function PairData() {
  const data = useModeData("numerology-pair");
  const w = useWheelView();
  if (!data?.ctx) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <NumerologyPairTable ctx={data.ctx} pack={data.pack} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

/** A chart's numbers for the year shown, with its own names for numerology (its input, as the numerology pages read it). */
function castFor(chart: NatalChart | null, input: Parameters<typeof numerologyOptionsOf>[0] | undefined, year: number): NumerologyChart | null {
  if (!chart || !input) return null;
  return castNumerology(chart, { ...numerologyOptionsOf(input, chart), calendarYear: year });
}

function usePairRuntime(): ModeRuntime<NumerologyPairState> {
  const { locale, t } = useI18n();
  const page = useStudioStore((s) => s.page);
  const chart = useScoped((s) => s.chart);
  const input = useScoped((s) => s.input);
  const rows = useStudioStore((s) => s.rows);
  const selectedId = useScoped((s) => s.selectedId);
  const stepped = useNumerologyYear();
  const enabled = page === "numerology-pair" && Boolean(chart);
  const { pick, inner, chartB } = usePairPick(enabled, "numerology-pair");
  const year = stepped ?? new Date().getFullYear();
  // A's names for numerology: the chart shown's own input, else its row's (the chart chosen as A); B's, its row's.
  const inputA = inner && inner === chart ? input : rows.find((r) => r.id === pick.aId)?.input;
  const inputB = rows.find((r) => r.id === pick.resolvedBId)?.input;
  const a = useMemo(() => (enabled ? castFor(inner, inputA, year) : null), [enabled, inner, inputA, year]);
  const b = useMemo(() => (enabled ? castFor(chartB, inputB, year) : null), [enabled, chartB, inputB, year]);
  const names = useMemo(
    () => ({ a: inner ? chartDisplayName(inner.meta, t("untitled")) : "A", b: chartB ? chartDisplayName(chartB.meta, t("untitled")) : "B" }),
    [inner, chartB, t],
  );
  const ctx = useMemo<PairContext | null>(() => (a && b ? { pair: numerologyPair(a, b), names } : null), [a, b, names]);
  // The pairs' texts, in the reader's language: their own download, fetched while the page is shown.
  const pack = usePack("numpair", locale, enabled);
  const reading = useMemo(() => (enabled && pack ? pack.numerologyPairReading(ctx, selectedId, locale) : null), [enabled, pack, ctx, selectedId, locale]);
  const waits = useMemo(() => ({ a: Boolean(a && !a.names.birth), b: Boolean(b && !b.names.birth) }), [a, b]);
  const data = useMemo<NumerologyPairState>(() => ({ pick, ctx, pack, waits, enabled }), [pick, ctx, pack, waits, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const numerologyPairMode: ModeDef = {
  ...MODE_META["numerology-pair"],
  emptyText: numerologyNoNatal,
  Controls: PairControls,
  Figure: PairFigure,
  HelloEmpty: PairHello,
  Data: PairData,
  preloadData: () => prefetch(loadTable),
  useRuntime: usePairRuntime,
};
