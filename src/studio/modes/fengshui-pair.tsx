import { Suspense, useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { LoadingLines } from "@/components/loading-lines";
import { TrigramGlyph, withTrigrams } from "@/components/trigram-mark";
import { chartDisplayName } from "@/lib/chart/library";
import type { NatalChart } from "@/lib/chart/types";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord, type ChineseWordKey } from "@/lib/chinese/words";
import { DIRECTION_IDS, directionById, fengShuiOf, type DirectionId, type FengShui, type FsCount } from "@/lib/chinese/fengshui";
import { homeOf } from "@/lib/chinese/fengshui-home";
import { TRIGRAM_TEXTS } from "@/lib/chinese/fengshui-texts";
import { countLabel, directionName, groupLabel, mansionName } from "@/lib/chinese/fengshui-reading";
import { fengShuiPair, pairDirection, type PairKind, type PairPerson } from "@/lib/chinese/fengshui-pair";
import {
  FSP_PRACTICE_REF,
  FSP_SUMMARY_REF,
  bestDirection,
  bestLine,
  directionAria,
  fsPairReading,
  fspDirRef,
  fspKuaRef,
  groupsLine,
  listOfKind,
  pairPracticeLines,
  type FsPairContext,
  type FsPairHome,
  type FsPairNames,
} from "@/lib/chinese/fengshui-pair-reading";
import { declination, decimalYear } from "@/lib/chinese/geomag";
import { FSP_NOW, fsNowLead, fsPairNow, fsPairNowReading, type FsPairNow } from "@/lib/chinese/fengshui-pair-now";
import { directionName as dirName } from "@/lib/chinese/fengshui-reading";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import { deFr, said } from "@/lib/chinese/both";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { HowUluneCalculates, MethodNotes } from "@/studio/modes/chinese-notes";
import { parseFacing, useHomeInput } from "@/studio/modes/fengshui-home-state";
import { useMethodNotes } from "@/studio/modes/hooks/useMethodNotes";
import { usePairPick } from "@/studio/modes/hooks/usePairPick";
import { MODE_META } from "@/studio/modes/meta";
import { PairSelects, type PairPick } from "@/studio/modes/pair-selects";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { FsNow } from "@/studio/modes/pair-now/fengshui-now";
import { useKeptScroll } from "@/studio/return-parts";
import { useDomIds, useScopeKey, useScoped } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/zodiac.css";
import "@/studio/modes/styles/first-read.css";
import "@/studio/modes/styles/pair.css";
import "@/studio/modes/styles/fengshui.css";
import "@/studio/modes/styles/fengshui-pair.css";

/*
 * Feng Shui's Relationship lens, two people in one home (review items FS5
 * and FS32; the languages plan's "in Pair, both Kua numbers on one compass,
 * the directions they share and the ones they don't"), at /feng-shui/pair.
 * A is the chart shown, B synastry's partner (one second person for every
 * Pair page). Each person's Kua with the Kua page's yin or yang rules: a
 * birth without a count shows both Kua numbers, and the compass reads the
 * one chosen beside it (kept in memory while Ulune stays open, never stored).
 *
 * One compass rose with both people's eight mansions: A's ring inside, B's
 * outside, each tinted where it is supportive and hatched where it is
 * challenging, its mansion in words; a badge at each direction says what it
 * is for the two (filled: supportive for both; hatched: challenging for
 * both; half: mixed), and the directions supportive for both are outlined.
 * One Tab stop, the arrows walk round it. Beside it: the two Kua, the groups,
 * the three lists (supportive for both, challenging for both, mixed) and the
 * practical lines for two, every part opening its reading. With a home on
 * the Home lens, its facing is read beside the two Kua. "You two, now"
 * (share and compare plan, feature 5e) ends the column and the first read:
 * the year's and the month's stars over the directions the two share
 * (pair-now/fengshui-now.tsx). Worked out here; nothing is sent.
 */

export type FengShuiPairState = {
  pick: PairPick | null;
  /** Each person's Kua for each count shown: the one their birth gives, or both. */
  lists: Record<PairPerson, FengShui[]>;
  /** What the page reads (the pair on the compass, the names, the home); null without a second person. */
  ctx: FsPairContext | null;
  names: FsPairNames;
  /** The count the compass reads for a person whose birth gives none. */
  setCount: (person: PairPerson, count: FsCount) => void;
  /** The two cast charts, for the method notes. */
  charts: { a: NatalChart | null; b: NatalChart | null };
  /** "You two, now" (feature 5e): the year and the month we are in over the directions the two share. */
  now: FsPairNow | null;
  enabled: boolean;
};

const PEOPLE: readonly PairPerson[] = ["a", "b"];

/* The rose: A's ring between the hub and R_M, B's between R_M and the rim; the badges ring the hub. */
const C = 200;
const R_HUB = 84;
const R_M = 140;
const R_O = 196;
const R_BADGE = 64;
const BADGE = 13;
const TEXT_A = (R_HUB + R_M) / 2;
const TEXT_B = (R_M + R_O) / 2;

const at = (angle: number, r: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};
const f = (n: number) => n.toFixed(2);

/** A wedge of the rose between two radii, 45° wide, centred on an angle (degrees clockwise from the top). */
function wedge(angle: number, r0: number, r1: number): string {
  const a0 = at(angle - 22.5, r1);
  const a1 = at(angle + 22.5, r1);
  const b1 = at(angle + 22.5, r0);
  const b0 = at(angle - 22.5, r0);
  return `M ${f(a0.x)} ${f(a0.y)} A ${r1} ${r1} 0 0 1 ${f(a1.x)} ${f(a1.y)} L ${f(b1.x)} ${f(b1.y)} A ${r0} ${r0} 0 0 0 ${f(b0.x)} ${f(b0.y)} Z`;
}

/** A mansion's name in its ring, along the ring (turned so it never reads upside down), a little smaller only when too long for it. */
function RingWord({ angle, r, word, hard }: { angle: number; r: number; word: string; hard: boolean }) {
  const p = at(angle, r);
  const turn = angle > 90 && angle < 270 ? angle - 180 : angle;
  // About 0.56 em a letter at 11 px; the room is the wedge's width at this radius, less a margin.
  const room = 2 * r * Math.sin((22.5 * Math.PI) / 180) - 10;
  const wide = word.length * 6.2;
  return (
    <text
      x={f(p.x)}
      y={f(p.y)}
      transform={`rotate(${f(turn)} ${f(p.x)} ${f(p.y)})`}
      className={cn("ulune-fsp-word", hard && "is-hard")}
      style={wide > room ? { fontSize: `${f((11 * room) / wide)}px` } : undefined}
    >
      {word}
    </text>
  );
}

/** The two people's rose: eight wedges, one Tab stop, the arrows walk round it. */
function PairRose({ ctx }: { ctx: FsPairContext }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const ring = useRef<SVGGElement>(null);
  const hatch = `ulune-fsp-hatch-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const { pair: p, names } = ctx;
  const turn = prefs.compass === "south" ? 180 : 0;
  const chosen = DIRECTION_IDS.find((d) => w.selectedId === fspDirRef(d));
  const stop: DirectionId = chosen ?? bestDirection(p);
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const el = (e.target as Element).closest<SVGGElement>("[data-dir]");
    if (!el) return;
    const i = DIRECTION_IDS.indexOf(el.dataset.dir as DirectionId);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % 8;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i + 7) % 8;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 7;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      w.pick(fspDirRef(DIRECTION_IDS[i]!));
      return;
    }
    if (next == null) return;
    e.preventDefault();
    ring.current?.querySelector<SVGGElement>(`[data-dir="${DIRECTION_IDS[next]}"]`)?.focus();
  };
  const label = `${cnWord(locale, "fspRose")} · ${names.a}, ${cnWord(locale, "fspInner")}, ${cnWord(locale, "fsKuaN", { n: p.a.kua })} · ${names.b}, ${cnWord(locale, "fspOuter")}, ${cnWord(locale, "fsKuaN", { n: p.b.kua })}`;
  const summaryOn = w.selectedId === FSP_SUMMARY_REF;
  return (
    <svg viewBox="-4 -4 408 408" className="ulune-fsp-rose" role="group" aria-label={label} data-testid="fengshui-pair-rose" data-top={prefs.compass}>
      <defs>
        <pattern id={hatch} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" className="ulune-fs-hatch" />
        </pattern>
      </defs>
      <circle cx={C} cy={C} r={R_O} className="ulune-fs-rim" />
      {/* The hub: both Kua numbers, A's filled dot and B's ring; it opens the summary (the Groups card does the same by keyboard). */}
      <g className={cn("ulune-fsp-hub", summaryOn && "is-on")} onClick={() => w.choose(FSP_SUMMARY_REF)} aria-hidden data-testid="fengshui-pair-hub">
        <circle cx={C} cy={C} r={R_HUB - 3} />
        <text x={C} y={C - 27} className="ulune-fs-centre-sub">
          Kua
        </text>
        <text x={C - 18} y={C} className="ulune-fsp-hub-n">
          {p.a.kua}
        </text>
        <text x={C + 18} y={C} className="ulune-fsp-hub-n">
          {p.b.kua}
        </text>
        <circle cx={C - 18} cy={C + 25} r={4.5} className="ulune-fsp-hub-dot" />
        <circle cx={C + 18} cy={C + 25} r={4} className="ulune-fsp-hub-dot is-b" />
      </g>
      <g ref={ring} onKeyDown={onKey}>
        {DIRECTION_IDS.map((d) => {
          const x = pairDirection(p, d);
          const dir = directionById(d);
          const angle = (dir.degrees + turn) % 360;
          const ref = fspDirRef(d);
          const on = w.selectedId === ref;
          const badge = at(angle, R_BADGE);
          return (
            <g
              key={d}
              data-dir={d}
              data-kind={x.kind}
              data-a={x.a.mansion}
              data-b={x.b.mansion}
              data-testid={`fengshui-pair-wedge-${d}`}
              className={cn("ulune-fsp-wedge", `is-${x.kind}`, on && "is-on")}
              role="button"
              tabIndex={d === stop ? 0 : -1}
              aria-label={directionAria(p, d, names, locale)}
              aria-pressed={on}
              onClick={() => w.choose(ref)}
              {...previewProps(ref)}
            >
              <path d={wedge(angle, R_HUB, R_M)} className={cn("ulune-fsp-cell", x.a.supportive ? "is-good" : "is-hard")} style={x.a.supportive ? undefined : { fill: `url(#${hatch})` }} data-person="a" />
              <path d={wedge(angle, R_M, R_O)} className={cn("ulune-fsp-cell", x.b.supportive ? "is-good" : "is-hard")} style={x.b.supportive ? undefined : { fill: `url(#${hatch})` }} data-person="b" />
              <RingWord angle={angle} r={TEXT_A} word={mansionName(x.a.mansion, locale)} hard={!x.a.supportive} />
              <RingWord angle={angle} r={TEXT_B} word={mansionName(x.b.mansion, locale)} hard={!x.b.supportive} />
              {/* Supportive for both: the whole wedge outlined; chosen or focused: its edge in ink. */}
              {x.kind === "both-good" ? <path d={wedge(angle, R_HUB, R_O)} className="ulune-fsp-shared" /> : null}
              <path d={wedge(angle, R_HUB, R_O)} className="ulune-fsp-edge" />
              <g className="ulune-fsp-badge">
                <circle cx={f(badge.x)} cy={f(badge.y)} r={BADGE} style={x.kind === "both-hard" ? { fill: `url(#${hatch})` } : undefined} />
                {x.kind === "mixed" ? <path d={`M ${f(badge.x)} ${f(badge.y - BADGE)} A ${BADGE} ${BADGE} 0 0 0 ${f(badge.x)} ${f(badge.y + BADGE)} Z`} className="ulune-fsp-half" /> : null}
                <text x={f(badge.x)} y={f(badge.y)}>
                  {dir.short[locale === "fr" ? "fr" : "en"]}
                </text>
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Under the rose: the two rings, and what each badge says. */
function RoseKey({ names }: { names: FsPairNames }) {
  const { locale } = useI18n();
  return (
    <div className="ulune-fsp-legend" data-testid="fengshui-pair-legend">
      <p className="ulune-fsp-legend-line">
        <span className="ulune-fsp-dot" aria-hidden /> {names.a}, {cnWord(locale, "fspInner")} <span className="ulune-fsp-dot is-b" aria-hidden /> {names.b}, {cnWord(locale, "fspOuter")}
      </p>
      <p className="ulune-fsp-legend-line">{cnWord(locale, "fspLegend")}</p>
      <ul className="ulune-fsp-legend-kinds">
        {(["both-good", "mixed", "both-hard"] as const).map((k) => (
          <li key={k}>
            <span className={cn("ulune-fsp-chip", `is-${k}`)} aria-hidden /> {cnWord(locale, k === "both-good" ? "fspKindGood" : k === "both-hard" ? "fspKindHard" : "fspKindMixed")}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A person's Kua card, and beside it, for a birth without a yin or yang count, the count the compass reads. */
function PersonCard({ person, data }: { person: PairPerson; data: FengShuiPairState & { ctx: FsPairContext } }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const fs = data.ctx.pair[person];
  const list = data.lists[person];
  const name = data.names[person];
  const ref = fspKuaRef(person);
  const both = list.length > 1;
  return (
    <div className="ulune-fsp-person" data-testid={`fengshui-pair-who-${person}`}>
      <button
        type="button"
        className={cn("ulune-fs-card", w.selectedId === ref && "is-on")}
        data-testid={`fengshui-pair-kua-${person}`}
        aria-pressed={w.selectedId === ref}
        onClick={() => w.choose(ref)}
        {...previewProps(ref)}
      >
        <span className="ulune-fs-h ulune-fsp-who">
          <span className={cn("ulune-fsp-dot", person === "b" && "is-b")} aria-hidden /> {cnWord(locale, "fspPersonKua", { name, deName: deFr(name) })}
        </span>
        <span className="ulune-fs-card-line">
          <b className="ulune-fsp-kua-n">{cnWord(locale, "fsKuaN", { n: fs.kua })}</b> · <TrigramGlyph symbol={fs.trigram.symbol} /> {chineseLabel(fs.trigram, locale, prefs).text} · {groupLabel(fs, locale)}
        </span>
        {fs.uncertain ? <span className="ulune-fs-card-note">{cnWord(locale, "fsUncertain")}</span> : null}
      </button>
      {both ? (
        <div className="ulune-fsp-count">
          <div className="ulune-fsp-count-btns" role="group" aria-label={cnWord(locale, "fspCountGroup", { name, deName: deFr(name) })}>
            {list.map((x) => (
              <button
                key={x.count}
                type="button"
                className="ulune-fsp-count-btn"
                data-testid={`fengshui-pair-count-${person}-${x.count}`}
                aria-pressed={x.count === fs.count}
                onClick={() => data.setCount(person, x.count)}
              >
                <span>
                  {countLabel(x.count, locale)} · {cnWord(locale, "fsKuaN", { n: x.kua })}
                </span>
              </button>
            ))}
          </div>
          <p className="ulune-fs-card-note">{cnWord(locale, "fspCountPick", { name, deName: deFr(name) })}</p>
        </div>
      ) : null}
    </div>
  );
}

const LIST_WORDS: Record<PairKind, { head: ChineseWordKey; none: ChineseWordKey }> = {
  "both-good": { head: "fspSharedHead", none: "fspNoneShared" },
  "both-hard": { head: "fspHardHead", none: "fspNoneHard" },
  mixed: { head: "fspMixedHead", none: "fspNoneMixed" },
};

/** One list beside the rose: its directions, each with both people's mansions (the mixed ones say whom they support), or why it has none. */
function PairList({ kind, ctx }: { kind: PairKind; ctx: FsPairContext }) {
  const { locale } = useI18n();
  const w = useWheelView();
  const { pair: p, names } = ctx;
  const dirs = listOfKind(p, kind);
  const domId = useDomIds();
  const h = domId(`fsp-${kind}-h`);
  return (
    <section className={cn("ulune-fsp-list", `is-${kind}`)} aria-labelledby={h} data-testid={`fengshui-pair-list-${kind}`}>
      <h3 id={h} className="ulune-fs-h">
        <span className={cn("ulune-fsp-chip", `is-${kind}`)} aria-hidden /> {cnWord(locale, LIST_WORDS[kind].head)}
      </h3>
      {dirs.length ? (
        <ul>
          {dirs.map((d) => {
            const x = pairDirection(p, d);
            const ref = fspDirRef(d);
            return (
              <li key={d}>
                <button
                  type="button"
                  className={cn("ulune-fs-row ulune-fsp-row", w.selectedId === ref && "is-on")}
                  data-testid={`fengshui-pair-dir-${d}`}
                  aria-pressed={w.selectedId === ref}
                  onClick={() => w.choose(ref)}
                  {...previewProps(ref)}
                >
                  <span className="ulune-fs-row-name">{directionName(d, locale)}</span>
                  <span className="ulune-fsp-row-who">
                    {PEOPLE.map((who) => (
                      <span key={who} className="ulune-fsp-row-m" data-supportive={x[who].supportive ? "1" : "0"}>
                        <span className={cn("ulune-fsp-dot", who === "b" && "is-b")} aria-hidden />
                        <span className="sr-only">{names[who]}: </span>
                        {mansionName(x[who].mansion, locale)}
                      </span>
                    ))}
                  </span>
                  {x.kind === "mixed" ? <span className="ulune-fsp-row-for">{cnWord(locale, "fspMixedFor", { name: names[x.good ?? "a"] })}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ulune-fsp-none" data-testid={`fengshui-pair-none-${kind}`}>
          {cnWord(locale, LIST_WORDS[kind].none)}
        </p>
      )}
    </section>
  );
}

function PairFigure() {
  const { locale } = useI18n();
  const w = useWheelView();
  const data = useModeData("fengshui-pair");
  const partnerBirth = useScoped((s) => s.pair.addingPartnerFor === "fengshui-pair");
  // Its own scroll comes back where it was when the studio does (reorganisation R6).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, useScopeKey("fengshui-pair-scroll"), Boolean(data?.ctx));
  if (!data?.lists.a.length) return null;
  if (!data.ctx) {
    if (partnerBirth) return <div data-testid="fengshui-pair-need-second" className="hidden" />;
    return (
      <div data-testid="fengshui-pair-need-second" className="grid min-h-[12rem] place-items-center px-4 text-center">
        <button
          type="button"
          data-testid="fengshui-pair-add-second-rose"
          onClick={() => data.pick?.addSecond()}
          className="inline-flex min-h-[var(--btn-h)] items-center justify-center rounded-md px-4 font-display text-2xl leading-none text-fg hover:text-fg-muted"
        >
          {cnWord(locale, "zkPairAdd")}
        </button>
      </div>
    );
  }
  const ctx = data.ctx;
  const full = { ...data, ctx };
  const p = ctx.pair;
  const practice = pairPracticeLines(ctx, locale);
  return (
    <div ref={scroller} className="ulune-fs ulune-fsp" data-testid="fengshui-pair" data-chart-pick data-groups={p.sameGroup ? "same" : "two"}>
      <div className="ulune-fsp-body">
        <div className="ulune-fsp-figure">
          <div className="ulune-fsp-rose-box">
            <PairRose ctx={ctx} />
          </div>
          <RoseKey names={ctx.names} />
        </div>
        <div className="ulune-fsp-side">
          <div className="ulune-fsp-people">
            {PEOPLE.map((person) => (
              <PersonCard key={person} person={person} data={full} />
            ))}
          </div>
          <button
            type="button"
            className={cn("ulune-fs-card", w.selectedId === FSP_SUMMARY_REF && "is-on")}
            data-testid="fengshui-pair-groups"
            aria-pressed={w.selectedId === FSP_SUMMARY_REF}
            onClick={() => w.choose(FSP_SUMMARY_REF)}
            {...previewProps(FSP_SUMMARY_REF)}
          >
            <span className="ulune-fs-h">
              {cnWord(locale, "fspGroups")} · {cnWord(locale, p.sameGroup ? "fspSameGroup" : "fspTwoGroups")}
            </span>
            <span className="ulune-fs-card-line">{groupsLine(p, ctx.names, locale)}</span>
          </button>
          {(["both-good", "both-hard", "mixed"] as const).map((kind) => (
            <PairList key={kind} kind={kind} ctx={ctx} />
          ))}
          <button
            type="button"
            className={cn("ulune-fs-card", w.selectedId === FSP_PRACTICE_REF && "is-on")}
            data-testid="fengshui-pair-practice"
            aria-pressed={w.selectedId === FSP_PRACTICE_REF}
            onClick={() => w.choose(FSP_PRACTICE_REF)}
            {...previewProps(FSP_PRACTICE_REF)}
          >
            <span className="ulune-fs-h">{cnWord(locale, "fspPracticeHead")}</span>
            <span className="ulune-fs-card-line">{practice[0]!.text}</span>
            {practice.some((l) => l.id === "home") ? <span className="ulune-fs-card-note">{practice.find((l) => l.id === "home")!.text}</span> : null}
          </button>
          {data.now ? <FsNow now={data.now} names={ctx.names} onFigure ruled /> : null}
        </div>
      </div>
    </div>
  );
}

function PairControls() {
  const data = useModeData("fengshui-pair");
  if (!data?.pick) return null;
  return <PairSelects mode="synastry" pair={data.pick} prefix="fengshui-pair" page="fengshui-pair" />;
}

/** A text's first sentence, for the first read's steps. */
const firstSentence = (t: string) => t.split(/(?<=[.!?])\s/)[0] ?? t;

/**
 * The side panel with nothing chosen: each person's Kua, the groups, the best direction for both (or
 * the best middle ground) and the practice; first each person's method notes, last how Ulune calculates.
 */
function PairHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("fengshui-pair");
  const notes = useMethodNotes("fengshui-pair", data?.charts.a ?? null, { chart: data?.charts.b ?? null, names: data?.names ?? { a: "A", b: "B" } });
  const domId = useDomIds();
  if (!data?.lists.a.length) return null;
  if (!data.ctx) {
    return (
      <section className="ulune-zk-hello" data-testid="fengshui-pair-hello" data-empty="1">
        <MethodNotes notes={notes} />
        <button
          type="button"
          data-testid="fengshui-pair-add-second-panel"
          onClick={() => data.pick?.addSecond()}
          className="inline-flex min-h-11 items-center rounded-md font-display text-xl leading-tight text-fg hover:text-fg-muted"
        >
          {cnWord(locale, "zkPairAdd")}
        </button>
        <p className="ulune-zk-hello-p">{cnWord(locale, "fspLead")}</p>
        <HowUluneCalculates page="fengshui-pair" />
      </section>
    );
  }
  const ctx = data.ctx;
  const { pair: p, names } = ctx;
  const best = bestDirection(p);
  const colon = locale === "fr" ? "\u202f: " : ": ";
  type Step = { id: string; ref: string; label: string; value: string; text: string };
  const steps: Step[] = [
    ...PEOPLE.map((person): Step => {
      const fs = p[person];
      const tag = data.lists[person].length > 1 ? ` · ${countLabel(fs.count, locale)}` : "";
      return {
        id: `kua-${person}`,
        ref: fspKuaRef(person),
        label: cnWord(locale, "fspPersonKua", { name: names[person], deName: deFr(names[person]) }),
        value: `${fs.kua} · ${fs.trigram.symbol} ${chineseLabel(fs.trigram, locale, { ...prefs, show: "names" }).name}${tag}`,
        text: firstSentence(said(TRIGRAM_TEXTS[fs.trigram.id], locale)),
      };
    }),
    { id: "groups", ref: FSP_SUMMARY_REF, label: cnWord(locale, "fspGroups"), value: cnWord(locale, p.sameGroup ? "fspSameGroup" : "fspTwoGroups"), text: groupsLine(p, names, locale) },
    { id: "best", ref: fspDirRef(best), label: cnWord(locale, p.shared.length ? "fspFirstBest" : "fspFirstMiddle"), value: directionName(best, locale), text: bestLine(p, names, locale) },
    { id: "practice", ref: FSP_PRACTICE_REF, label: cnWord(locale, "fspPracticeHead"), value: "", text: pairPracticeLines(ctx, locale)[0]!.text },
    // "You two, now" (feature 5e): the direction to face together this year.
    ...(data.now
      ? [{ id: "now", ref: FSP_NOW, label: pnWord(locale, "ptnHead"), value: data.now.face ? dirName(data.now.face, locale) : String(data.now.y.solarYear), text: fsNowLead(data.now, names, locale) }]
      : []),
  ];
  return (
    <section className="ulune-hd-first ulune-fs-first" data-testid="fengshui-pair-hello" aria-labelledby={domId("ulune-fsp-first-title")}>
      <MethodNotes notes={notes} />
      <h3 id={domId("ulune-fsp-first-title")} className="ulune-kicker ulune-hd-first-title">
        {cnWord(locale, "fspFirstTitle")}
      </h3>
      <p className="ulune-zk-hello-p">{cnWord(locale, "fspLead")}</p>
      <ol className="ulune-hd-steps">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              data-testid={`fengshui-pair-hello-${st.id}`}
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
                  {st.value ? <span className="ulune-hd-step-v">{withTrigrams(st.value)}</span> : null}
                </span>
                <span className="ulune-hd-step-text">{st.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="ulune-zk-hello-p">{cnWord(locale, "fspNoVerdict")}</p>
      <p className="ulune-zk-hello-note" data-testid="fengshui-pair-compass-line">
        {cnWord(locale, "fsCompassLine", { top: cnWord(locale, prefs.compass === "south" ? "fsTopSouth" : "fsTopNorth") })}{" "}
        <Link to="/settings" hash="chinese" className="ob-keep-link" data-testid="fengshui-pair-settings-link">
          {cnWord(locale, "zkSettingsLink")}
        </Link>
      </p>
      <HowUluneCalculates page="fengshui-pair" />
    </section>
  );
}

const loadTable = () => import("@/studio/tables/fengshui-pair-table");
const FengShuiPairTable = lazyNamed(loadTable, "FengShuiPairTable");

function PairData() {
  const data = useModeData("fengshui-pair");
  const w = useWheelView();
  if (!data?.ctx) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <FengShuiPairTable ctx={data.ctx} selectedId={w.selectedId} onSelect={w.pick} now={data.now} />
    </Suspense>
  );
}

/** A cast chart's Kua for the count its birth gives, or for both counts. */
function kuaList(chart: NatalChart | null, count: FsCount | undefined): FengShui[] {
  if (!chart) return [];
  const birth = { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown };
  const counts: FsCount[] = count === "yang" || count === "yin" ? [count] : ["yang", "yin"];
  return counts.map((n) => fengShuiOf(birth, n)).filter((x): x is FengShui => Boolean(x));
}

/** The home on the Home lens, as that page reads its facing (the map's bearings turned by the declination at the chart's place). */
function usePairHome(chart: NatalChart | null): FsPairHome | null {
  const typed = useHomeInput((s) => s.typed);
  const source = useHomeInput((s) => s.source);
  const keptId = useHomeInput((s) => s.keptId);
  const name = useHomeInput((s) => s.name);
  const lat = chart?.meta.latitude;
  const lon = chart?.meta.longitude;
  return useMemo(() => {
    const deg = parseFacing(typed);
    if (deg == null) return null;
    const decl = source === "map" && Number.isFinite(lat) && Number.isFinite(lon) ? declination(lat!, lon!, decimalYear(Date.now())) : null;
    return { home: homeOf(deg, source, decl), name: keptId ? name.trim() : "" };
  }, [typed, source, keptId, name, lat, lon]);
}

function usePairRuntime(): ModeRuntime<FengShuiPairState> {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const page = useStudioStore((s) => s.page);
  const chart = useScoped((s) => s.chart);
  const input = useScoped((s) => s.input);
  const rows = useStudioStore((s) => s.rows);
  const selectedId = useScoped((s) => s.selectedId);
  const enabled = page === "fengshui-pair" && Boolean(chart);
  const { pick, inner, chartB } = usePairPick(enabled, "fengshui-pair");
  const idA = pick.aId;
  const idB = pick.resolvedBId;
  // Each person's yin or yang count as kept with their chart (the Birth tab's Options), if any.
  const countA = (inner && inner === chart ? input : rows.find((r) => r.id === idA)?.input)?.chineseCount;
  const countB = rows.find((r) => r.id === idB)?.input.chineseCount;
  const listA = useMemo(() => (enabled ? kuaList(inner, countA) : []), [enabled, inner, countA]);
  const listB = useMemo(() => (enabled ? kuaList(chartB, countB) : []), [enabled, chartB, countB]);
  // Without a count, the one the compass reads, by chart: in memory while Ulune stays open, never stored.
  const [chosen, setChosen] = useState<Readonly<Record<string, FsCount>>>({});
  const setCount = useCallback(
    (person: PairPerson, count: FsCount) => {
      const id = person === "a" ? idA : idB;
      if (id) setChosen((c) => ({ ...c, [id]: count }));
    },
    [idA, idB],
  );
  const onCompass = (list: FengShui[], id: string | null): FengShui | null => (id ? list.find((fs) => fs.count === chosen[id]) : undefined) ?? list[0] ?? null;
  const a = onCompass(listA, idA);
  const b = onCompass(listB, idB);
  const pair = useMemo(() => (a && b ? fengShuiPair(a, b) : null), [a, b]);
  const names = useMemo(
    () => ({ a: inner ? chartDisplayName(inner.meta, t("untitled")) : "A", b: chartB ? chartDisplayName(chartB.meta, t("untitled")) : "B" }),
    [inner, chartB, t],
  );
  const home = usePairHome(chart);
  const ctx = useMemo<FsPairContext | null>(() => (pair ? { pair, names, lists: { a: listA, b: listB }, home } : null), [pair, names, listA, listB, home]);
  // "You two, now" (feature 5e): the year and the month we are in, read again every ten minutes while shown.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useVisibleInterval(() => setNowMs(Date.now()), 600_000, enabled);
  const hour = Math.floor(nowMs / 3_600_000);
  const now = useMemo(() => (pair ? fsPairNow(pair, hour * 3_600_000) : null), [pair, hour]);
  const reading = useMemo(() => {
    if (!enabled) return null;
    if (selectedId?.startsWith(FSP_NOW)) return now ? fsPairNowReading(now, names, selectedId, locale, prefs, pnWord(locale, "ptnHead"), inner?.meta.timezone) : null;
    return fsPairReading(ctx, selectedId, locale, prefs);
  }, [enabled, ctx, selectedId, locale, prefs, now, names, inner]);
  const data = useMemo(
    () => ({ pick, lists: { a: listA, b: listB }, ctx, names, setCount, charts: { a: inner, b: chartB }, now, enabled }),
    [pick, listA, listB, ctx, names, setCount, inner, chartB, now, enabled],
  );
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const fengShuiPairMode: ModeDef = {
  ...MODE_META["fengshui-pair"],
  emptyText: (locale) => cnWord(locale, "fspEmpty"),
  Controls: PairControls,
  Figure: PairFigure,
  HelloEmpty: PairHello,
  Data: PairData,
  preloadData: () => prefetch(loadTable),
  useRuntime: usePairRuntime,
};
