import { useMemo, useRef, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { BRANCHES, PHASES, SIXTY, STEMS, type ChineseName } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord, animalOf, theAnimal } from "@/lib/chinese/words";
import { branchAngle, zodiacChart, ZODIAC_PLACES, type ZodiacChart, type ZodiacPlace } from "@/lib/chinese/zodiac";
import { PLACE_ANIMAL, PLACE_WORD, branchRef, placeRef, zodiacReading } from "@/lib/chinese/zodiac-reading";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/zodiac.css";

/*
 * Chinese astrology (languages plan, language 1, part 7, at /chinese-astrology):
 * the four animals of a birth on the wheel of the twelve, each in its compass
 * place (the Rat at the north, at the top; the Rabbit east, the Horse south,
 * the Rooster west), in its branch's phase colour, with the reader's year,
 * month, day and hour marked, and this year's and this month's animals on
 * the rim. Below or beside it, the four animals as cards. Everything is
 * worked out here from the cast chart, on the reader's clock and day
 * boundary (Settings → Chinese traditions); nothing is sent. The relations
 * between the animals (part 8), their glyphs (part 9), their readings
 * (part 10), Pair and the year ahead (part 11) follow.
 */

export type ZodiacState = {
  zodiac: ZodiacChart | null;
  enabled: boolean;
};

/** The device's own Chinese font (languages plan: nothing downloaded). */
const CJK = '"PingFang TC", "PingFang SC", "Noto Sans CJK TC", "Noto Sans CJK SC", "Microsoft JhengHei", "Microsoft YaHei", sans-serif';
const C = 200;
const R_OUT = 188;
const R_IN = 116;

const at = (angle: number, r: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};
const f = (n: number) => n.toFixed(2);

/** A sector of the ring between two radii, centred on an angle (degrees clockwise from the top). */
function sector(angle: number, r0: number, r1: number): string {
  const a0 = at(angle - 15, r1);
  const a1 = at(angle + 15, r1);
  const b1 = at(angle + 15, r0);
  const b0 = at(angle - 15, r0);
  return `M ${f(a0.x)} ${f(a0.y)} A ${r1} ${r1} 0 0 1 ${f(a1.x)} ${f(a1.y)} L ${f(b1.x)} ${f(b1.y)} A ${r0} ${r0} 0 0 0 ${f(b0.x)} ${f(b0.y)} Z`;
}

/** A place's initial on its badge: Y, M, D, H (A, M, J, H in French). */
const initial = (word: string) => word.charAt(0).toUpperCase();

function hanziLang(script: "hant" | "hans") {
  return script === "hans" ? "zh-Hans" : "zh-Hant";
}

function ZodiacWheel({ z }: { z: ZodiacChart }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const ring = useRef<SVGGElement>(null);
  const byBranch = useMemo(() => {
    const map = new Map<number, ZodiacPlace[]>();
    for (const p of z.places) map.set(p.branch, [...(map.get(p.branch) ?? []), p]);
    return map;
  }, [z]);
  const selectedBranch = /^zk:branch:(\d+)$/.exec(w.selectedId ?? "")?.[1];
  // One Tab stop for the ring: the chosen animal, else the year's; the arrows walk round it.
  const stop = selectedBranch != null ? Number(selectedBranch) : z.places[0]!.branch;
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const el = (e.target as Element).closest<SVGGElement>("[data-branch]");
    if (!el) return;
    const b = Number(el.dataset.branch);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (b + 1) % 12;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (b + 11) % 12;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 11;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      w.pick(branchRef(b));
      return;
    }
    if (next == null) return;
    e.preventDefault();
    ring.current?.querySelector<SVGGElement>(`[data-branch="${next}"]`)?.focus();
  };
  const year = z.places[0]!;
  const yearPair = chineseLabel(SIXTY[year.pillar.cycle]!, locale, prefs);
  const nowYearBranch = z.now.year.branch;
  const nowMonthBranch = z.now.month.branch;
  const nowYear = new Date().getFullYear();
  return (
    <svg viewBox="-24 -24 448 448" className="ulune-zk-wheel" role="group" aria-label={cnWord(locale, "zkWheel")} data-testid="zodiac-wheel">
      <circle cx={C} cy={C} r={R_OUT} className="ulune-zk-rim" />
      <g ref={ring} onKeyDown={onKey}>
        {BRANCHES.map((b) => {
          const angle = branchAngle(b.index);
          const mine = byBranch.get(b.index) ?? [];
          const animal = chineseLabel(b, locale, prefs);
          const ref = branchRef(b.index);
          const on = w.selectedId === ref || mine.some((p) => w.selectedId === placeRef(p.id));
          // Each animal's words stand upright, stacked at its cell's middle (the cells are about as
          // wide as they are deep all round the ring): the branch, the animal, its name.
          const mid = at(angle, (R_IN + R_OUT) / 2);
          const spoken = [
            `${animal.name}${animal.pinyin ? ` (${animal.pinyin})` : ""}`,
            (locale === "fr" ? PHASES.find((p) => p.id === b.phase)!.fr : PHASES.find((p) => p.id === b.phase)!.en).toLowerCase(),
            mine.length ? cnWord(locale, "zkSectorYours", { places: mine.map((p) => cnWord(locale, PLACE_WORD[p.id]).toLowerCase()).join(", ") }) : "",
            b.index === nowYearBranch ? cnWord(locale, "zkSectorNow") : "",
            b.index === nowMonthBranch ? cnWord(locale, "zkSectorNowMonth") : "",
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <g
              key={b.id}
              data-branch={b.index}
              data-mine={mine.length || undefined}
              data-phase={b.phase}
              data-testid={`zodiac-sector-${b.id}`}
              className={cn("ulune-zk-sector", mine.length && "is-mine", on && "is-on")}
              role="button"
              tabIndex={b.index === stop ? 0 : -1}
              aria-label={spoken}
              aria-pressed={on}
              onClick={() => w.choose(ref)}
              {...previewProps(ref)}
            >
              <path d={sector(angle, R_IN, R_OUT)} className="ulune-zk-cell" />
              {prefs.show !== "names" ? (
                <text x={f(mid.x)} y={f(mid.y - 25)} className="ulune-zk-branch" lang={prefs.show === "full" ? hanziLang(prefs.script) : undefined}>
                  {prefs.show === "full" ? `${b[prefs.script]} ${b.pinyin}` : b.pinyin}
                </text>
              ) : null}
              {prefs.show === "full" ? (
                <>
                  <text x={f(mid.x)} y={f(mid.y - 2)} className="ulune-zk-hanzi" lang={hanziLang(prefs.script)} fontFamily={CJK}>
                    {animalChar(b.animal, prefs.script)}
                  </text>
                  <text x={f(mid.x)} y={f(mid.y + 21)} className="ulune-zk-name">
                    {animal.name}
                  </text>
                </>
              ) : (
                <text x={f(mid.x)} y={f(mid.y + 4)} className="ulune-zk-name is-big">
                  {animal.name}
                </text>
              )}
            </g>
          );
        })}
      </g>
      {/* The reader's animals: a badge each, inside the ring at its animal; two on one animal stack inward. */}
      {[...byBranch.entries()].flatMap(([branch, places]) =>
        places.map((p, i) => {
          const pt = at(branchAngle(branch), 98 - i * 24);
          const word = cnWord(locale, PLACE_WORD[p.id]);
          return (
            <g
              key={p.id}
              className={cn("ulune-zk-badge", w.selectedId === placeRef(p.id) && "is-on", p.uncertain && "is-uncertain")}
              data-testid={`zodiac-badge-${p.id}`}
              data-place={p.id}
              onClick={() => w.choose(placeRef(p.id))}
              aria-hidden
            >
              <circle cx={f(pt.x)} cy={f(pt.y)} r={11} />
              <text x={f(pt.x)} y={f(pt.y)}>
                {initial(word)}
              </text>
            </g>
          );
        }),
      )}
      {/* Now: this year's animal and this month's, on the rim. */}
      {(() => {
        const y = at(branchAngle(nowYearBranch), R_OUT + 13);
        const m = at(branchAngle(nowMonthBranch), R_OUT + 5);
        return (
          <g className="ulune-zk-now" aria-hidden data-testid="zodiac-now">
            <text x={f(y.x)} y={f(y.y)} className="ulune-zk-now-year" data-branch={nowYearBranch}>
              {nowYear}
            </text>
            <circle cx={f(m.x)} cy={f(m.y)} r={3.2} className="ulune-zk-now-month" data-branch={nowMonthBranch} />
          </g>
        );
      })()}
      {/* The centre: the year's pillar. */}
      <g className="ulune-zk-centre" aria-hidden>
        {yearPair.hanzi ? (
          <text x={C} y={C - 14} className="ulune-zk-centre-hanzi" lang={hanziLang(prefs.script)} fontFamily={CJK}>
            {yearPair.hanzi}
          </text>
        ) : null}
        <text x={C} y={yearPair.hanzi ? C + 18 : C - 4} className="ulune-zk-centre-name">
          {yearPair.name}
        </text>
        <text x={C} y={yearPair.hanzi ? C + 36 : C + 16} className="ulune-zk-centre-sub">
          {cnWord(locale, "zkYearAnimal")}
        </text>
      </g>
    </svg>
  );
}

/** The animals' own characters (the branch's is on the rim): 鼠 for the Rat, 馬 or 马 for the Horse. */
const ANIMAL_HANT = ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"];
const ANIMAL_HANS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const animalChar = (i: number, script: "hant" | "hans") => (script === "hans" ? ANIMAL_HANS : ANIMAL_HANT)[i]!;

/** The four animals as cards: the place, the animal, its pillar's name and characters. */
function ZodiacCards({ z }: { z: ZodiacChart }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  return (
    <ul className="ulune-zk-cards" data-testid="zodiac-cards">
      {ZODIAC_PLACES.map((id) => {
        const p = z.places.find((x) => x.id === id);
        if (!p) {
          return (
            <li key={id} className="ulune-zk-card is-missing" data-testid={`zodiac-card-${id}`}>
              <span className="ulune-zk-card-k">{cnWord(locale, PLACE_ANIMAL[id])}</span>
              <span className="ulune-zk-card-note">{cnWord(locale, "zkNoHour")}</span>
            </li>
          );
        }
        const pair = chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs);
        const animal = chineseLabel(BRANCHES[p.branch]!, locale, prefs);
        const ref = placeRef(id);
        const on = w.selectedId === ref;
        return (
          <li key={id} className="ulune-zk-card-li">
            <button
              type="button"
              className={cn("ulune-zk-card", on && "is-on")}
              data-testid={`zodiac-card-${id}`}
              data-phase={p.branchPhase}
              data-uncertain={p.uncertain ? "1" : undefined}
              aria-pressed={on}
              onClick={() => w.pick(ref)}
              {...previewProps(ref)}
            >
              <span className="ulune-zk-card-k">
                {cnWord(locale, PLACE_ANIMAL[id])}
                {p.uncertain ? <span className="ulune-zk-card-tilde"> ~</span> : null}
              </span>
              <span className="ulune-zk-card-animal">
                {prefs.show === "full" ? (
                  <span className="ulune-zk-card-hanzi" lang={hanziLang(prefs.script)}>
                    {animalChar(p.branch, prefs.script)}
                  </span>
                ) : null}
                <span>{animal.name}</span>
              </span>
              <span className="ulune-zk-card-pair">
                {pair.name}
                {pair.pinyin ? <span className="ulune-zk-card-py"> · {pair.pinyin}</span> : null}
                {pair.hanzi ? (
                  <span className="ulune-zk-card-py" lang={hanziLang(prefs.script)}>
                    {" "}
                    {pair.hanzi}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ZodiacFigure() {
  const data = useModeData("zodiac");
  const z = data?.zodiac;
  if (!z) return null;
  return (
    <div className="ulune-zk" data-testid="zodiac" data-chart-pick>
      <div className="ulune-zk-wheel-box">
        <ZodiacWheel z={z} />
      </div>
      <ZodiacCards z={z} />
    </div>
  );
}

/** The side panel with nothing chosen: what the four animals are, the clock read, the New Year note, now. */
function ZodiacHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const data = useModeData("zodiac");
  const w = useWheelView();
  const z = data?.zodiac;
  if (!z) return null;
  const clock = cnWord(locale, prefs.clock === "true-solar" ? "cnClockSolar" : prefs.clock === "local-mean" ? "cnClockMean" : "cnClockCivil").toLowerCase();
  const day = cnWord(locale, prefs.dayBoundary === "23:00" ? "zkDayAt23" : prefs.dayBoundary === "split" ? "zkDaySplit" : "zkDayMidnight");
  return (
    <section className="ulune-zk-hello" data-testid="zodiac-hello">
      <h2 className="ulune-zk-hello-h">{cnWord(locale, "zkTitle")}</h2>
      <p className="ulune-zk-hello-p">{cnWord(locale, "zkLead")}</p>
      <ol className="ulune-zk-hello-list">
        {z.places.map((p) => {
          const pair = chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs);
          return (
            <li key={p.id}>
              <button type="button" className="ulune-zk-hello-row" data-testid={`zodiac-hello-${p.id}`} onClick={() => w.pick(placeRef(p.id))}>
                <b>{cnWord(locale, PLACE_WORD[p.id])}</b>
                <span>{pair.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {z.timeUnknown ? <p className="ulune-zk-hello-p">{cnWord(locale, "zkNoHour")}</p> : null}
      {z.newYearAnimal != null ? (
        <p className="ulune-zk-hello-p" data-testid="zodiac-newyear">
          {cnWord(locale, "zkNewYear", { theAnimal: theAnimal(z.newYearAnimal, locale) })}
        </p>
      ) : null}
      <p className="ulune-zk-hello-p">
        {cnWord(locale, "zkNowLine", {
          year: cnWord(locale, "zkNowYear", { animal: animalOf(z.now.year.branch, locale) }),
          month: cnWord(locale, "zkNowMonth", { animal: animalOf(z.now.month.branch, locale) }),
        })}
      </p>
      <p className="ulune-zk-hello-note" data-testid="zodiac-clock">
        {cnWord(locale, "zkClockLine", { clock, day })}{" "}
        <Link to="/settings" hash="chinese" className="ob-keep-link">
          {cnWord(locale, "zkSettingsLink")}
        </Link>
      </p>
    </section>
  );
}

/** The table view: the four pillars, each with its stem, branch, phase and Na Yin (relations come with part 8). */
function ZodiacData() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const data = useModeData("zodiac");
  const w = useWheelView();
  const z = data?.zodiac;
  if (!z) return null;
  const say = (n: ChineseName) => chineseLabel(n, locale, prefs).text;
  return (
    <div className="ulune-zk-table-box" data-testid="zodiac-table">
      <table className="ulune-zk-table">
        <caption className="ulune-zk-table-cap">{cnWord(locale, "zkTitle")}</caption>
        <thead>
          <tr>
            <th scope="col">{cnWord(locale, "zkPlace")}</th>
            <th scope="col">{cnWord(locale, "zkPillar")}</th>
            <th scope="col">{cnWord(locale, "zkStem")}</th>
            <th scope="col">{cnWord(locale, "zkBranch")}</th>
            <th scope="col">{cnWord(locale, "zkAnimalPhase")}</th>
            <th scope="col">{cnWord(locale, "zkNaYin")}</th>
          </tr>
        </thead>
        <tbody>
          {z.places.map((p) => (
            <tr key={p.id} data-testid={`zodiac-row-${p.id}`} className={cn(w.selectedId === placeRef(p.id) && "is-on")}>
              <th scope="row">
                <button type="button" className="ulune-zk-table-pick" onClick={() => w.pick(placeRef(p.id))}>
                  {cnWord(locale, PLACE_WORD[p.id])}
                  {p.uncertain ? " ~" : ""}
                </button>
              </th>
              <td>{say(SIXTY[p.pillar.cycle]!)}</td>
              <td>{say(STEM_OF(p))}</td>
              <td>{say(BRANCHES[p.branch]!)}</td>
              <td>{say(PHASES.find((x) => x.id === p.branchPhase)!)}</td>
              <td>{say(p.naYin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STEM_OF = (p: ZodiacPlace) => STEMS[p.stem]!;

function useZodiacRuntime(): ModeRuntime<ZodiacState> {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const chart = useStudioStore((s) => s.chart);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const enabled = page === "zodiac" && Boolean(chart);
  const zodiac = useMemo(
    () =>
      enabled && chart
        ? zodiacChart(
            { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown },
            { clock: prefs.clock, dayBoundary: prefs.dayBoundary },
          )
        : null,
    [enabled, chart, prefs.clock, prefs.dayBoundary],
  );
  const reading = useMemo(
    () => (zodiac ? zodiacReading(zodiac, selectedId, locale, prefs, chart?.meta.timezone) : null),
    [zodiac, selectedId, locale, prefs, chart],
  );
  const data = useMemo(() => ({ zodiac, enabled }), [zodiac, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const zodiacMode: ModeDef = {
  ...MODE_META.zodiac,
  emptyText: (locale) => cnWord(locale, "zkEmpty"),
  Figure: ZodiacFigure,
  HelloEmpty: ZodiacHello,
  Data: ZodiacData,
  useRuntime: useZodiacRuntime,
};
