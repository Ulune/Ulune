import { Suspense, useMemo, useRef, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { LoadingLines } from "@/components/loading-lines";
import { TrigramBars, TrigramGlyph, withTrigrams } from "@/components/trigram-mark";
import { phaseWord } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { DIRECTION_IDS, MANSIONS, MANSION_IDS, directionById, fengShuiOf, trigramOfDirection, type DirectionId, type FengShui, type FsCount } from "@/lib/chinese/fengshui";
import { GROUP_TEXTS, MANSION_TEXTS, TRIGRAM_TEXTS } from "@/lib/chinese/fengshui-texts";
import { countLabel, directionName, fengShuiReading, fsDirRef, fsKuaRef, fsPracticeRef, groupLabel, mansionName, practiceLines } from "@/lib/chinese/fengshui-reading";
import { said } from "@/lib/chinese/both";
import { CJK, hanziLang } from "@/lib/chinese/animal-chars";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { HowUluneCalculates, MethodNotes } from "@/studio/modes/chinese-notes";
import { useMethodNotes } from "@/studio/modes/hooks/useMethodNotes";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useKeptScroll } from "@/studio/return-parts";
import { useDomIds, useScoped, useScopedPage, useScopeKey } from "@/studio/scope";
import "@/studio/modes/styles/zodiac.css";
import "@/studio/modes/styles/first-read.css";
import "@/studio/modes/styles/fengshui.css";

/*
 * Feng Shui, the personal half (languages plan, language 3, part 21: "Kua,
 * Eight Mansions and the compass rose"), at /feng-shui. The Kua number from
 * the solar year of birth and the tradition's yin or yang count (both when
 * the birth gives none), and its eight directions on a compass rose: four
 * supportive (tinted), four challenging (hatched), each saying its mansion in
 * words and opening its reading; beside the rose, the directions as lists
 * and the practical lines. The north at the top, or the south as the Chinese
 * compass is drawn (Settings → Chinese traditions). Worked out here from the
 * birth date; nothing is sent. Part 29 adds the method notes to the side
 * panel's first read (chinese-notes.tsx). Part 27's review fix FS7: the
 * trigrams are drawn by Ulune (components/trigram-mark.tsx), not left to a
 * font that may draw ☰…☷ tiny or as empty boxes.
 */

export type FengShuiState = {
  /** One per count given, both without one. */
  list: FengShui[];
  enabled: boolean;
};

const C = 200;
const R_OUT = 190;
const R_IN = 64;

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

/** The rose of one Kua: eight wedges, one Tab stop, the arrows walk round it. */
function Rose({ fs, both }: { fs: FengShui; both: boolean }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const domId = useDomIds();
  const ring = useRef<SVGGElement>(null);
  const turn = prefs.compass === "south" ? 180 : 0;
  const chosen = DIRECTION_IDS.find((d) => w.selectedId === fsDirRef(fs.count, d));
  const stop: DirectionId = chosen ?? fs.of["sheng-qi"];
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
      w.pick(fsDirRef(fs.count, DIRECTION_IDS[i]!));
      return;
    }
    if (next == null) return;
    e.preventDefault();
    ring.current?.querySelector<SVGGElement>(`[data-dir="${DIRECTION_IDS[next]}"]`)?.focus();
  };
  const hatch = domId(`ulune-fs-hatch-${fs.count}`);
  const label = `${cnWord(locale, "fsRose")}${both ? ` · ${countLabel(fs.count, locale)}` : ""} · ${cnWord(locale, "fsKuaN", { n: fs.kua })}`;
  const kuaRef = fsKuaRef(fs.count);
  return (
    <svg viewBox="-6 -6 412 412" className="ulune-fs-rose" role="group" aria-label={label} data-testid={`fengshui-rose-${fs.count}`} data-top={prefs.compass}>
      <defs>
        <pattern id={hatch} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" className="ulune-fs-hatch" />
        </pattern>
      </defs>
      <circle cx={C} cy={C} r={R_OUT} className="ulune-fs-rim" />
      <g ref={ring} onKeyDown={onKey}>
        {fs.directions.map((row) => {
          const dir = directionById(row.direction);
          const angle = (dir.degrees + turn) % 360;
          const ref = fsDirRef(fs.count, row.direction);
          const on = w.selectedId === ref;
          const tri = trigramOfDirection(row.direction);
          const mid = at(angle, (R_IN + R_OUT) / 2 + 4);
          const kind = cnWord(locale, row.supportive ? "fsSupportive" : "fsChallenging").toLowerCase();
          return (
            <g
              key={row.direction}
              data-dir={row.direction}
              data-mansion={row.mansion}
              data-supportive={row.supportive ? "1" : "0"}
              data-testid={`fengshui-wedge-${fs.count}-${row.direction}`}
              className={cn("ulune-fs-wedge", row.supportive ? "is-good" : "is-hard", on && "is-on")}
              role="button"
              tabIndex={row.direction === stop ? 0 : -1}
              aria-label={`${directionName(row.direction, locale)} (${phaseWord(tri.phase, locale)}): ${mansionName(row.mansion, locale)}, ${kind}`}
              aria-pressed={on}
              onClick={() => w.choose(ref)}
              {...previewProps(ref)}
            >
              <path d={wedge(angle, R_IN, R_OUT)} className="ulune-fs-cell" style={row.supportive ? undefined : { fill: `url(#${hatch})` }} />
              {/* The trigram drawn (FS7): a font may draw ☰…☷ tiny or as empty boxes. */}
              <TrigramBars lines={tri.lines} cx={mid.x} cy={mid.y - 25} w={20} className="ulune-fs-tri" data-phase={tri.phase} />
              <text x={f(mid.x)} y={f(mid.y)} className="ulune-fs-dir">
                {dir.short[locale === "fr" ? "fr" : "en"]}
              </text>
              <text x={f(mid.x)} y={f(mid.y + 19)} className="ulune-fs-mansion">
                {mansionName(row.mansion, locale)}
              </text>
            </g>
          );
        })}
      </g>
      {/* The centre: the Kua, its trigram and its group; it opens the Kua's reading (the card beside does the same by keyboard). */}
      <g className={cn("ulune-fs-centre", w.selectedId === kuaRef && "is-on")} onClick={() => w.choose(kuaRef)} aria-hidden data-testid={`fengshui-centre-${fs.count}`}>
        <circle cx={C} cy={C} r={R_IN - 6} />
        <text x={C} y={C - 28} className="ulune-fs-centre-sub">
          {cnWord(locale, "fsKuaHead")}
        </text>
        <text x={C} y={C - 5} className="ulune-fs-centre-n">
          {fs.kua}
        </text>
        <TrigramBars lines={fs.trigram.lines} cx={C} cy={C + 21} w={15} className="ulune-fs-centre-bars" />
        <text x={C} y={C + 38} className="ulune-fs-centre-tri" lang={prefs.show === "full" ? hanziLang(prefs.script) : undefined} fontFamily={prefs.show === "full" ? CJK : undefined}>
          {prefs.show === "full" ? fs.trigram[prefs.script] : chineseLabel(fs.trigram, locale, prefs).name}
        </text>
      </g>
    </svg>
  );
}

function DirList({ fs, good }: { fs: FengShui; good: boolean }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const ids = MANSION_IDS.filter((m) => MANSIONS[m].supportive === good);
  const domId = useDomIds();
  const h = domId(`fs-${fs.count}-${good ? "good" : "hard"}-h`);
  return (
    <section className={cn("ulune-fs-list", good ? "is-good" : "is-hard")} aria-labelledby={h}>
      <h3 id={h} className="ulune-fs-h">
        <span className="ulune-fs-swatch" aria-hidden /> {cnWord(locale, good ? "fsSupportiveHead" : "fsChallengingHead")}
      </h3>
      <ul>
        {ids.map((m) => {
          const d = fs.of[m];
          const ref = fsDirRef(fs.count, d);
          return (
            <li key={m}>
              <button
                type="button"
                className={cn("ulune-fs-row", w.selectedId === ref && "is-on")}
                data-testid={`fengshui-dir-${fs.count}-${d}`}
                data-mansion={m}
                aria-pressed={w.selectedId === ref}
                onClick={() => w.choose(ref)}
                {...previewProps(ref)}
              >
                <span className="ulune-fs-row-name">{chineseLabel(MANSIONS[m], locale, prefs).text}</span>
                <span className="ulune-fs-row-dir">{directionName(d, locale)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CountBlock({ fs, both }: { fs: FengShui; both: boolean }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const kuaRef = fsKuaRef(fs.count);
  const practiceRef = fsPracticeRef(fs.count);
  return (
    <section className="ulune-fs-count" data-testid={`fengshui-count-${fs.count}`} aria-label={both ? countLabel(fs.count, locale) : undefined}>
      {both ? <h2 className="ulune-fs-count-h">{countLabel(fs.count, locale)}</h2> : null}
      <div className="ulune-fs-body">
        <div className="ulune-fs-rose-box">
          <Rose fs={fs} both={both} />
        </div>
        <div className="ulune-fs-side">
          <button
            type="button"
            className={cn("ulune-fs-card", w.selectedId === kuaRef && "is-on")}
            data-testid={`fengshui-kua-${fs.count}`}
            aria-pressed={w.selectedId === kuaRef}
            onClick={() => w.choose(kuaRef)}
            {...previewProps(kuaRef)}
          >
            <span className="ulune-fs-h">{cnWord(locale, "fsKuaN", { n: fs.kua })}</span>
            <span className="ulune-fs-card-line">
              <TrigramGlyph symbol={fs.trigram.symbol} /> {chineseLabel(fs.trigram, locale, prefs).text} · {groupLabel(fs, locale)}
            </span>
            {fs.uncertain ? <span className="ulune-fs-card-note">{cnWord(locale, "fsUncertain")}</span> : null}
          </button>
          <DirList fs={fs} good />
          <DirList fs={fs} good={false} />
          <button
            type="button"
            className={cn("ulune-fs-card", w.selectedId === practiceRef && "is-on")}
            data-testid={`fengshui-practice-${fs.count}`}
            aria-pressed={w.selectedId === practiceRef}
            onClick={() => w.choose(practiceRef)}
            {...previewProps(practiceRef)}
          >
            <span className="ulune-fs-h">{cnWord(locale, "fsPracticeHead")}</span>
            <span className="ulune-fs-card-line">{practiceLines(fs, locale)[0]!.text}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function FengShuiFigure() {
  const { locale } = useI18n();
  const data = useModeData("fengshui");
  // Its own scroll comes back where it was when the studio does (reorganisation R6; part 28).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, useScopeKey("fengshui-scroll"), Boolean(data?.list.length));
  if (!data?.list.length) return null;
  const both = data.list.length > 1;
  return (
    <div ref={scroller} className="ulune-fs" data-testid="fengshui" data-chart-pick data-counts={data.list.length}>
      {both ? (
        <p className="ulune-fs-note" data-testid="fengshui-both-note">
          {cnWord(locale, "fsBothNote")}
        </p>
      ) : null}
      <div className="ulune-fs-counts" data-n={data.list.length}>
        {data.list.map((fs) => (
          <CountBlock key={fs.count} fs={fs} both={both} />
        ))}
      </div>
    </div>
  );
}

/** A text's first sentence, for the first read's steps. */
const firstSentence = (t: string) => t.split(/(?<=[.!?])\s/)[0] ?? t;

/**
 * The side panel with nothing chosen: the Kua, its group, the best direction and the practice, per count;
 * first the notes the birth calls for, last how Ulune calculates (part 29, chinese-notes.tsx).
 */
function FengShuiHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("fengshui");
  const notes = useMethodNotes("fengshui", w.chart);
  const domId = useDomIds();
  if (!data?.list.length) return null;
  const both = data.list.length > 1;
  type Step = { id: string; ref: string; label: string; value: string; text: string };
  const steps: Step[] = data.list.flatMap((fs): Step[] => {
    const tag = both ? ` · ${countLabel(fs.count, locale)}` : "";
    const best = fs.of["sheng-qi"];
    return [
      { id: `kua-${fs.count}`, ref: fsKuaRef(fs.count), label: `${cnWord(locale, "fsKuaHead")}${tag}`, value: `${fs.kua} · ${fs.trigram.symbol} ${chineseLabel(fs.trigram, locale, { ...prefs, show: "names" }).name}`, text: firstSentence(said(TRIGRAM_TEXTS[fs.trigram.id], locale)) },
      { id: `group-${fs.count}`, ref: fsKuaRef(fs.count), label: `${cnWord(locale, "fsGroup")}${tag}`, value: groupLabel(fs, locale), text: said(GROUP_TEXTS[fs.group], locale) },
      { id: `best-${fs.count}`, ref: fsDirRef(fs.count, best), label: `${cnWord(locale, "fsFirstBest")}${tag}`, value: `${directionName(best, locale)} · ${mansionName("sheng-qi", locale)}`, text: firstSentence(said(MANSION_TEXTS["sheng-qi"], locale)) },
      { id: `practice-${fs.count}`, ref: fsPracticeRef(fs.count), label: `${cnWord(locale, "fsPracticeHead")}${tag}`, value: "", text: practiceLines(fs, locale)[1]!.text },
    ];
  });
  return (
    <section className="ulune-hd-first ulune-fs-first" data-testid="fengshui-hello" aria-labelledby={domId("ulune-fs-first-title")}>
      <MethodNotes notes={notes} />
      <h3 id={domId("ulune-fs-first-title")} className="ulune-kicker ulune-hd-first-title">
        {cnWord(locale, "fsFirstTitle")}
      </h3>
      <p className="ulune-zk-hello-p">{cnWord(locale, "fsLead")}</p>
      <ol className="ulune-hd-steps">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              data-testid={`fengshui-hello-${st.id}`}
              className={cn("ulune-hd-step", w.selectedId === st.ref && "is-on")}
              aria-label={`${i + 1}. ${st.label}${st.value ? `: ${st.value}` : ""}. ${st.text}`}
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
      {both ? <p className="ulune-zk-hello-p">{cnWord(locale, "fsBothNote")}</p> : null}
      <p className="ulune-zk-hello-note" data-testid="fengshui-compass-line">
        {cnWord(locale, "fsCompassLine", { top: cnWord(locale, prefs.compass === "south" ? "fsTopSouth" : "fsTopNorth") })}{" "}
        <Link to="/settings" hash="chinese" className="ob-keep-link" data-testid="fengshui-settings-link">
          {cnWord(locale, "zkSettingsLink")}
        </Link>
      </p>
      <HowUluneCalculates page="fengshui" />
    </section>
  );
}

const loadTable = () => import("@/studio/tables/fengshui-table");
const FengShuiTable = lazyNamed(loadTable, "FengShuiTable");

function FengShuiData() {
  const data = useModeData("fengshui");
  const w = useWheelView();
  if (!data?.list.length) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <FengShuiTable list={data.list} name={w.chart?.meta.name ?? ""} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useFengShuiRuntime(): ModeRuntime<FengShuiState> {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const chart = useScoped((s) => s.chart);
  const page = useScopedPage();
  const selectedId = useScoped((s) => s.selectedId);
  const count = useScoped((s) => s.input.chineseCount);
  const enabled = page === "fengshui" && Boolean(chart);
  const list = useMemo(() => {
    if (!enabled || !chart) return [];
    const birth = { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown };
    const counts: FsCount[] = count === "yang" || count === "yin" ? [count] : ["yang", "yin"];
    return counts.map((n) => fengShuiOf(birth, n)).filter((x): x is FengShui => Boolean(x));
  }, [enabled, chart, count]);
  const reading = useMemo(() => (list.length ? fengShuiReading(list, selectedId, locale, prefs) : null), [list, selectedId, locale, prefs]);
  const data = useMemo(() => ({ list, enabled }), [list, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const fengShuiMode: ModeDef = {
  ...MODE_META.fengshui,
  emptyText: (locale) => cnWord(locale, "fsEmpty"),
  Figure: FengShuiFigure,
  HelloEmpty: FengShuiHello,
  Data: FengShuiData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useFengShuiRuntime,
};
