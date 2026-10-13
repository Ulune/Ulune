import { useRef, type KeyboardEvent } from "react";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { DIRECTIONS, trigramOfDirection, type DirectionId } from "@/lib/chinese/fengshui";
import { MOUNTAINS, type MountainId } from "@/lib/chinese/fengshui-home";
import { FSH_FACING_REF, fmtDeg, fshMountainRef, mountainCode, mountainPhase } from "@/lib/chinese/fengshui-home-reading";
import { starState, type FlyingChart, type PalaceId } from "@/lib/chinese/fengshui-stars";
import { chartName, fssPalaceRef, gridRows, palaceName, planRows, type ChartVariant } from "@/lib/chinese/fengshui-stars-reading";
import { directionName } from "@/lib/chinese/fengshui-reading";
import type { YearStars } from "@/lib/chinese/fengshui-years";
import { afflictionName } from "@/lib/chinese/fengshui-years-reading";
import { listWords, roomName, roomsLabel } from "@/lib/chinese/fengshui-rooms-reading";
import { roomsIn, type HomeRoom } from "@/lib/chinese/fengshui-rooms";
import { CJK, hanziLang } from "@/lib/chinese/animal-chars";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useHomeInput } from "@/studio/modes/fengshui-home-state";

/*
 * Feng Shui's home figures (languages plan, part 24: "the luopan and the
 * nine-palace figures"):
 *
 *   - The luopan: from the outside in, a ring of degrees (a tick each
 *     degree, longer each five and fifteen, a number each thirty), the 24
 *     mountains in their phase colours, the eight directions with their
 *     trigrams, and the heaven pool in the centre with the facing. North or
 *     south at the top (the rose's setting); while the phone's compass is
 *     live, the whole plate turns so the line at the top shows where the
 *     phone points, as a luopan's plate turns under its fixed thread.
 *   - The nine palaces: each chart as a square of nine, the mountain star top
 *     left, the water star top right, the period star below, each number in
 *     its state's colour and the period's own underlined; laid out as a plan
 *     of the home, its front at the bottom (the eight outer palaces turned in
 *     steps of 45°), or as the books draw it, south at the top. The front and
 *     back are named outside the square.
 *
 * One Tab stop each; the arrows walk the mountains round the plate, the
 * palaces across the square.
 */

const C = 200;
const R_DEG = 214;
const R_OUT = 192;
const R_MID = 150;
const R_IN = 110;
const R_CORE = 70;

const at = (angle: number, r: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};
const f = (n: number) => n.toFixed(2);

function ring(angle: number, half: number, r0: number, r1: number): string {
  const a0 = at(angle - half, r1);
  const a1 = at(angle + half, r1);
  const b1 = at(angle + half, r0);
  const b0 = at(angle - half, r0);
  return `M ${f(a0.x)} ${f(a0.y)} A ${r1} ${r1} 0 0 1 ${f(a1.x)} ${f(a1.y)} L ${f(b1.x)} ${f(b1.y)} A ${r0} ${r0} 0 0 0 ${f(b0.x)} ${f(b0.y)} Z`;
}

/** The ring of degrees, drawn once with north at the top and turned as a whole. */
const DEGREE_TICKS = Array.from({ length: 360 }, (_, d) => {
  const len = d % 15 === 0 ? 11 : d % 5 === 0 ? 7 : 3.5;
  const a = at(d, R_OUT + 1);
  const b = at(d, R_OUT + 1 + len);
  return { d, x1: f(a.x), y1: f(a.y), x2: f(b.x), y2: f(b.y), major: d % 15 === 0 };
});
const DEGREE_PATH = DEGREE_TICKS.filter((t) => !t.major).map((t) => `M${t.x1} ${t.y1}L${t.x2} ${t.y2}`).join("");
const DEGREE_MAJOR = DEGREE_TICKS.filter((t) => t.major).map((t) => `M${t.x1} ${t.y1}L${t.x2} ${t.y2}`).join("");

/** The luopan. `live` is the phone's heading while its compass reads, or null. */
export function Luopan({ live, years = null }: { live: number | null; years?: YearStars | null }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("fengshui-home");
  const ringRef = useRef<SVGGElement>(null);
  const home = data?.ctx.home ?? null;
  // Live, the plate turns under the fixed line at the top: what the phone points at stands there.
  const turn = live != null ? (360 - live) % 360 : prefs.compass === "south" ? 180 : 0;
  const chosen = MOUNTAINS.find((m) => w.selectedId === fshMountainRef(m.id));
  const stop: MountainId = chosen?.id ?? home?.facingMountain.id ?? "zi";
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const el = (e.target as Element).closest<SVGGElement>("[data-mountain]");
    if (!el) return;
    const i = MOUNTAINS.findIndex((m) => m.id === el.dataset.mountain);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % 24;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i + 23) % 24;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 23;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      w.pick(fshMountainRef(MOUNTAINS[i]!.id));
      return;
    }
    if (next == null) return;
    e.preventDefault();
    ringRef.current?.querySelector<SVGGElement>(`[data-mountain="${MOUNTAINS[next]!.id}"]`)?.focus();
  };
  const facingAt = home ? (home.facing.degrees + turn) % 360 : null;
  return (
    <svg viewBox="-28 -28 456 456" className="ulune-fsh-dial" role="group" aria-label={cnWord(locale, "fshDial")} data-testid="fengshui-home-dial" data-top={live != null ? "live" : prefs.compass} data-turn={turn.toFixed(1)}>
      <circle cx={C} cy={C} r={R_DEG} className="ulune-fsh-plate" />
      <g className="ulune-fsh-degrees" data-testid="fengshui-home-degrees" transform={`rotate(${f(turn)} ${C} ${C})`} aria-hidden>
        <path d={DEGREE_PATH} className="ulune-fsh-tick" />
        <path d={DEGREE_MAJOR} className="ulune-fsh-tick is-major" />
        {Array.from({ length: 12 }, (_, i) => i * 30).map((d) => {
          const p = at(d, R_DEG - 5);
          return (
            <text key={d} x={f(p.x)} y={f(p.y)} className="ulune-fsh-deg" transform={`rotate(${d} ${f(p.x)} ${f(p.y)})`}>
              {d}
            </text>
          );
        })}
      </g>
      <circle cx={C} cy={C} r={R_OUT} className="ulune-fsh-rim" />
      <g ref={ringRef} onKeyDown={onKey}>
        {MOUNTAINS.map((m) => {
          const angle = (m.degrees + turn) % 360;
          const ref = fshMountainRef(m.id);
          const l = chineseLabel(m, locale, prefs);
          const mid = at(angle, (R_MID + R_OUT) / 2);
          const facing = home?.facingMountain.id === m.id;
          const sitting = home?.sittingMountain.id === m.id;
          const aff = !years ? null : years.afflictions.taiSui === m.id ? "tai-sui" : years.afflictions.yearBreaker === m.id ? "year-breaker" : years.afflictions.threeKillings.mountains.includes(m.id) ? "three-killings" : null;
          const spoken = [`${l.name}${l.pinyin ? ` (${l.pinyin})` : ""}`, mountainCode(m, locale), facing ? cnWord(locale, "fshDialFacing").toLowerCase() : "", sitting ? cnWord(locale, "fshDialSitting").toLowerCase() : "", aff ? afflictionName(aff, locale, prefs).toLowerCase() : ""].filter(Boolean).join(", ");
          return (
            <g
              key={m.id}
              data-mountain={m.id}
              data-phase={mountainPhase(m)}
              data-testid={`fengshui-home-mountain-${m.id}`}
              className={cn("ulune-fsh-mountain", facing && "is-facing", sitting && "is-sitting", w.selectedId === ref && "is-on")}
              role="button"
              tabIndex={m.id === stop ? 0 : -1}
              aria-label={spoken}
              aria-pressed={w.selectedId === ref}
              onClick={() => w.choose(ref)}
              {...previewProps(ref)}
            >
              <path d={ring(angle, 7.5, R_MID, R_OUT)} className="ulune-fsh-cell" />
              {aff ? <path d={ring(angle, 6.5, R_OUT - 7, R_OUT - 2)} className="ulune-fsh-aff" data-aff={aff} data-testid={`fengshui-home-aff-${m.id}`} /> : null}
              {l.hanzi ? (
                <text x={f(mid.x)} y={f(mid.y)} className="ulune-fsh-hanzi" lang={hanziLang(prefs.script)} fontFamily={CJK}>
                  {l.hanzi}
                </text>
              ) : (
                <text x={f(mid.x)} y={f(mid.y)} className="ulune-fsh-name">
                  {l.name}
                </text>
              )}
            </g>
          );
        })}
      </g>
      <g aria-hidden className="ulune-fsh-dirs">
        {DIRECTIONS.map((d) => {
          const angle = (d.degrees + turn) % 360;
          const mid = at(angle, (R_IN + R_MID) / 2);
          const tri = trigramOfDirection(d.id);
          return (
            <g key={d.id} data-dir={d.id}>
              <path d={ring(angle, 22.5, R_IN, R_MID)} className="ulune-fsh-dircell" />
              <text x={f(mid.x)} y={f(mid.y - 9)} className="ulune-fsh-dir">
                {d.short[locale === "fr" ? "fr" : "en"]}
              </text>
              <text x={f(mid.x)} y={f(mid.y + 10)} className="ulune-fsh-tri" data-phase={tri.phase}>
                {tri.symbol}
              </text>
            </g>
          );
        })}
      </g>
      {facingAt != null ? (
        <g aria-hidden className="ulune-fsh-axis" data-testid="fengshui-home-axis" data-facing={home!.facing.degrees.toFixed(1)}>
          <line x1={f(at(facingAt + 180, R_CORE).x)} y1={f(at(facingAt + 180, R_CORE).y)} x2={f(at(facingAt + 180, R_IN).x)} y2={f(at(facingAt + 180, R_IN).y)} className="ulune-fsh-sit" />
          <line x1={f(at(facingAt, R_CORE).x)} y1={f(at(facingAt, R_CORE).y)} x2={f(at(facingAt, R_IN - 8).x)} y2={f(at(facingAt, R_IN - 8).y)} className="ulune-fsh-face" />
          <path
            d={`M ${f(at(facingAt, R_IN).x)} ${f(at(facingAt, R_IN).y)} L ${f(at(facingAt - 5.5, R_IN - 16).x)} ${f(at(facingAt - 5.5, R_IN - 16).y)} L ${f(at(facingAt + 5.5, R_IN - 16).x)} ${f(at(facingAt + 5.5, R_IN - 16).y)} Z`}
            className="ulune-fsh-head"
          />
        </g>
      ) : null}
      {live != null ? (
        // The fixed thread: the phone's top edge, over the turning plate.
        <g aria-hidden className="ulune-fsh-live" data-testid="fengshui-home-needle">
          <line x1={C} y1={C - R_CORE + 4} x2={C} y2={C - R_DEG - 10} />
          <path d={`M ${C} ${C - R_DEG - 4} l -6 -12 h 12 Z`} />
        </g>
      ) : null}
      <g aria-hidden className={cn("ulune-fsh-core", w.selectedId === FSH_FACING_REF && "is-on")} onClick={() => home && w.choose(FSH_FACING_REF)}>
        <circle cx={C} cy={C} r={R_CORE - 4} />
        <text x={C} y={C - 20} className="ulune-fsh-core-sub">
          {cnWord(locale, live != null ? "fshHeading" : "fshDialFacing")}
        </text>
        <text x={C} y={C + 4} className="ulune-fsh-core-n" data-testid="fengshui-home-core">
          {live != null ? fmtDeg(Math.round(live), locale, 0) : home ? fmtDeg(home.facing.degrees, locale) : "–"}
        </text>
        <text x={C} y={C + 28} className="ulune-fsh-core-sub">
          {live == null && home ? mountainCode(home.facingMountain, locale) : ""}
        </text>
      </g>
    </svg>
  );
}

const CELL = 104;
const GAP = 4;
const PAD_Y = 30;

/** One chart as the nine palaces. */
export function PalaceFigure({ v, c, facing, now, years, rooms = [] }: { v: ChartVariant; c: FlyingChart; facing: DirectionId; now: number; years: YearStars | null; rooms?: readonly HomeRoom[] }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const orient = useHomeInput((s) => s.orient);
  const ref0 = useRef<SVGGElement>(null);
  const rows = orient === "home" ? planRows(facing) : gridRows("south");
  const flat = rows.flat();
  const chosen = flat.find((p) => w.selectedId === fssPalaceRef(v, p));
  const stop: PalaceId = chosen ?? "c";
  const short = (p: PalaceId) => (p === "c" ? "" : DIRECTIONS.find((d) => d.id === p)!.short[locale === "fr" ? "fr" : "en"]);
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const el = (e.target as Element).closest<SVGGElement>("[data-palace]");
    if (!el) return;
    const i = flat.indexOf(el.dataset.palace as PalaceId);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = i % 3 < 2 ? i + 1 : i;
    else if (e.key === "ArrowLeft") next = i % 3 > 0 ? i - 1 : i;
    else if (e.key === "ArrowDown") next = i < 6 ? i + 3 : i;
    else if (e.key === "ArrowUp") next = i > 2 ? i - 3 : i;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 8;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      w.pick(fssPalaceRef(v, flat[i]!));
      return;
    }
    if (next == null) return;
    e.preventDefault();
    ref0.current?.querySelector<SVGGElement>(`[data-palace="${flat[next]}"]`)?.focus();
  };
  const size = CELL * 3 + GAP * 2;
  const top = rows[0]![1] as DirectionId;
  const bottom = rows[2]![1] as DirectionId;
  return (
    <svg
      viewBox={`-2 0 ${size + 4} ${size + PAD_Y * 2}`}
      className="ulune-fsp"
      role="group"
      aria-label={chartName(c, locale, prefs)}
      data-testid={`fengshui-stars-grid-${v}`}
      data-orient={orient}
    >
      <text x={size / 2} y={PAD_Y / 2 + 2} className="ulune-fsp-edge" data-testid={`fengshui-stars-top-${v}`}>
        {orient === "home" ? cnWord(locale, "fsfBack", { dir: directionName(top, locale) }) : directionName(top, locale)}
      </text>
      <g ref={ref0} onKeyDown={onKey}>
        {flat.map((p, i) => {
          const x0 = (i % 3) * (CELL + GAP);
          const y0 = PAD_Y + Math.floor(i / 3) * (CELL + GAP);
          const st = c.palaces[p];
          const ref = fssPalaceRef(v, p);
          const num = (n: number, x: number, y: number, cls: string) => (
            <text x={x0 + x} y={y0 + y} className={cls} data-state={starState(n as 1, now as 1).state} data-now={n === now || undefined}>
              {n}
            </text>
          );
          return (
            <g
              key={p}
              data-palace={p}
              data-testid={`fengshui-stars-${v}-${p}`}
              className={cn("ulune-fss-cell ulune-fsp-cell", p === "c" && "is-centre", p === facing && orient === "home" && "is-front", years?.afflictions.fiveYellow === p && "is-five", w.selectedId === ref && "is-on")}
              role="button"
              tabIndex={p === stop ? 0 : -1}
              aria-pressed={w.selectedId === ref}
              aria-label={`${palaceName(p, locale)}: ${cnWord(locale, "fssMountainStar").toLowerCase()} ${st.mountain}, ${cnWord(locale, "fssWaterStar").toLowerCase()} ${st.water}, ${cnWord(locale, "fssPeriodStar").toLowerCase()} ${st.period}${years ? `, ${cnWord(locale, "fsyYearStar").toLowerCase()} ${years.yearChart[p]}, ${cnWord(locale, "fsyMonthStar").toLowerCase()} ${years.monthChart[p]}` : ""}${roomsIn(rooms, p).length ? `; ${listWords(roomsIn(rooms, p).map((r) => roomName(r.kind, locale).toLowerCase()), locale)}` : ""}`}
              onClick={() => w.choose(ref)}
              {...previewProps(ref)}
            >
              <rect x={x0} y={y0} width={CELL} height={CELL} rx={8} className="ulune-fsp-box" />
              {years?.afflictions.fiveYellow === p ? <rect x={x0 + 4} y={y0 + 4} width={CELL - 8} height={CELL - 8} rx={5} className="ulune-fsp-five" /> : null}
              <text x={x0 + CELL / 2} y={y0 + 14} className="ulune-fsp-dir">
                {short(p)}
              </text>
              {roomsIn(rooms, p).length ? (
                <text x={x0 + CELL / 2} y={y0 + 27} className="ulune-fsp-rooms" data-testid={`fengshui-stars-rooms-${v}-${p}`}>
                  {roomsLabel(rooms, p, locale)}
                </text>
              ) : null}
              {num(st.mountain, CELL * 0.3, 50, "ulune-fsp-star")}
              {num(st.water, CELL * 0.7, 50, "ulune-fsp-star")}
              {num(st.period, CELL / 2, 84, "ulune-fsp-period")}
              {years ? (
                <>
                  <text x={x0 + 14} y={y0 + CELL - 12} className="ulune-fsp-year" data-testid={`fengshui-stars-year-${v}-${p}`}>
                    {years.yearChart[p]}
                  </text>
                  <text x={x0 + CELL - 14} y={y0 + CELL - 12} className="ulune-fsp-month">
                    {years.monthChart[p]}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </g>
      <text x={size / 2} y={size + PAD_Y + PAD_Y / 2 + 4} className="ulune-fsp-edge is-front" data-testid={`fengshui-stars-bottom-${v}`}>
        {orient === "home" ? cnWord(locale, "fsfFront", { dir: directionName(bottom, locale) }) : directionName(bottom, locale)}
      </text>
    </svg>
  );
}

/** The stage's figure: the luopan or the Flying Stars, with their switches. */
export function FigurePane({ live }: { live: number | null }) {
  const { locale } = useI18n();
  const data = useModeData("fengshui-home");
  const figure = useHomeInput((s) => s.figure);
  const setFigure = useHomeInput((s) => s.setFigure);
  const chartPick = useHomeInput((s) => s.chart);
  const setChart = useHomeInput((s) => s.setChart);
  const orient = useHomeInput((s) => s.orient);
  const setOrient = useHomeInput((s) => s.setOrient);
  const stars = data?.ctx.stars ?? null;
  const home = data?.ctx.home ?? null;
  const yearLayer = useHomeInput((s) => s.yearLayer);
  const setYearLayer = useHomeInput((s) => s.setYearLayer);
  const years = yearLayer ? (data?.ctx.years ?? null) : null;
  // The compass's plate needs the luopan; without a chart there are no stars to show.
  const shown = live != null || !stars ? "luopan" : figure === "auto" ? "stars" : figure;
  const v: ChartVariant = chartPick === "ti" && stars?.ti ? "ti" : "main";
  const chart = stars ? (v === "ti" ? stars.ti! : stars.main) : null;
  const seg = (on: boolean) => cn("ulune-fsh-seg-btn", on && "is-on");
  return (
    <div className="ulune-fsh-figure">
      <div className="ulune-fsp-bar">
        <div className="ulune-fsh-seg" role="group" aria-label={cnWord(locale, "fsfFigure")}>
          <button type="button" className={seg(shown === "luopan")} aria-pressed={shown === "luopan"} data-testid="fengshui-home-fig-luopan" onClick={() => setFigure("luopan")}>
            {cnWord(locale, "fsfLuopan")}
          </button>
          <button type="button" className={seg(shown === "stars")} aria-pressed={shown === "stars"} data-testid="fengshui-home-fig-stars" disabled={!stars || live != null} onClick={() => setFigure("stars")}>
            {cnWord(locale, "fssHead")}
          </button>
        </div>
        <button type="button" className={cn("ulune-fsh-seg-btn ulune-fsh-toggle", yearLayer && "is-on")} aria-pressed={yearLayer} data-testid="fengshui-home-year-layer" onClick={() => setYearLayer(!yearLayer)}>
          {cnWord(locale, "fsyLayer")}
        </button>
      </div>
      {shown === "luopan" || !chart || !home ? (
        <div className="ulune-fs-rose-box ulune-fsh-dial-box">
          <Luopan live={live} years={years} />
        </div>
      ) : (
        <div className="ulune-fsp-box-wrap" data-testid="fengshui-stars-figure" data-chart={v}>
          <div className="ulune-fsp-bar">
            {stars!.ti ? (
              <div className="ulune-fsh-seg" role="group" aria-label={cnWord(locale, "fssHead")}>
                {(["main", "ti"] as const).map((k) => (
                  <button key={k} type="button" className={seg(v === k)} aria-pressed={v === k} data-testid={`fengshui-stars-pick-${k}`} onClick={() => setChart(k)}>
                    {cnWord(locale, k === "ti" ? "fssTi" : "fssMain")}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="ulune-fsh-seg" role="group" aria-label={cnWord(locale, "fsfOrientLabel")}>
              {(["home", "books"] as const).map((o) => (
                <button key={o} type="button" className={seg(orient === o)} aria-pressed={orient === o} data-testid={`fengshui-stars-orient-${o}`} onClick={() => setOrient(o)}>
                  {cnWord(locale, o === "home" ? "fsfOrientHome" : "fsfOrientBooks")}
                </button>
              ))}
            </div>
          </div>
          <PalaceFigure v={v} c={chart} facing={home.facingDirection} now={stars!.now} years={years} rooms={data?.ctx.rooms ?? []} />
          <p className="ulune-fsh-small ulune-fsp-legend">
            {cnWord(locale, "fssLegend")} {years ? cnWord(locale, "fsyLegend") : null}
          </p>
        </div>
      )}
    </div>
  );
}
