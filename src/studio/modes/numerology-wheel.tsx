import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FigureKeys, type FigurePart } from "@/components/figure-keys";
import { FigureZoom } from "@/components/figure-zoom";
import { valueOfCore, type NumerologyChart } from "@/lib/chart/numerology";
import { numerologyFocus, WHEEL_CORES } from "@/lib/chart/numerology-focus";
import { isMaster, wholeText } from "@/lib/chart/numerology-reduce";
import {
  WHEEL,
  placeDiscs,
  placeLetters,
  polar,
  sectorAngle,
  sectorPath,
} from "@/lib/chart/numerology-wheel";
import { announceChartHover, onChartPreview } from "@/lib/depth/preview-bus";
import { prefersReducedMotion } from "@/lib/depth/env";
import { useI18n } from "@/lib/i18n/locale";
import { numerologySay } from "@/lib/i18n/numerology-say";
import { numerologyWheelText } from "@/lib/i18n/numerology-ui";

/*
 * The numerology wheel (part 60 of the launch plan): the nine numbers as a
 * band, shaded by how many letters of the name fall on each (none: a dashed
 * karmic lesson); the letters on their numbers, vowels inside, consonants
 * outside; the core numbers as discs in their sectors (a master or a karmic
 * debt written whole, ringed); the Life Path in the centre; the personal year
 * outside the band, with the month and the day as two ticks. Pointing lights
 * what makes a number; choosing keeps it lit and fades the rest.
 */

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** A pointer that crosses the gap between two parts keeps the first lit this long (ms). */
const HOVER_LINGER_MS = 90;
/** What a panel may point at on the wheel (a tile, a row, a reading's link). */
const PREVIEWABLE = /^(number|letter|core|time|detail|plane|bridge):/;

function partOf(target: EventTarget | null): string | null {
  const el = target instanceof Element ? target.closest("[data-part]") : null;
  return el?.getAttribute("data-part") ?? null;
}

export function NumerologyWheel({
  chart,
  isNow,
  selectedId,
  onSelect,
  onClear,
}: {
  chart: NumerologyChart;
  /** The wheel shows this year: the month and the day ride beside the year's disc. */
  isNow: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** A click on empty space lets the chosen part go. */
  onClear: () => void;
}) {
  const { locale } = useI18n();
  const birth = chart.names.birth;
  const letters = useMemo(() => birth?.parsed.letters ?? [], [birth]);
  const counts = birth?.detail.counts ?? null;
  const passion = useMemo(() => new Set(birth?.detail.hiddenPassion ?? []), [birth]);
  const marks = useMemo(() => placeLetters(letters), [letters]);
  const discs = useMemo(
    () =>
      placeDiscs(
        WHEEL_CORES.flatMap((id) => {
          const value = valueOfCore(chart, id);
          return value.digit ? [{ digit: value.digit, item: { id, value } }] : [];
        }),
      ),
    [chart],
  );

  const [hover, setHover] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);
  const linger = useRef(0);
  const pointerType = useRef("mouse");
  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches)
      setTouch(true);
  }, []);
  useEffect(() => onChartPreview((id) => setPreview(id && PREVIEWABLE.test(id) ? id : null)), []);
  useEffect(() => () => window.clearTimeout(linger.current), []);
  useEffect(() => () => announceChartHover(null), []);

  const point = (id: string | null, now = false) => {
    window.clearTimeout(linger.current);
    if (id === null && !now && !prefersReducedMotion()) {
      linger.current = window.setTimeout(() => point(null, true), HOVER_LINGER_MS);
      return;
    }
    setHover(id);
    announceChartHover(id);
  };

  const chosen = useMemo(() => numerologyFocus(selectedId, chart), [selectedId, chart]);
  const pointed = useMemo(() => numerologyFocus(hover ?? preview, chart), [hover, preview, chart]);
  // Pointing shows what makes a part; with nothing pointed, the chosen part stays lit.
  const active = pointed ?? chosen;
  const mode = pointed ? "hover" : chosen ? "pinned" : null;
  const attrs = (id: string) => ({
    "data-part": id,
    "data-lit": active?.lit.has(id) ? "1" : undefined,
    "data-hero": active?.hero === id ? "1" : undefined,
    "data-chosen": selectedId === id ? "1" : undefined,
  });

  const onClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    const id = partOf(e.target);
    if (id) onSelect(id);
    else if (selectedId) onClear();
  };

  const say = (id: string) => numerologySay(chart, id, locale);
  // The keyboard's list: the numbers, the discs, the year's marks, then the letters.
  const parts = useMemo<FigurePart[]>(() => {
    const part = (id: string, kind: string) => ({
      id,
      label: numerologySay(chart, id, locale),
      kind,
    });
    const out: FigurePart[] = DIGITS.map((n) => part(`number:${n}`, "number"));
    for (const d of discs) out.push(part(`core:${d.item.id}`, "core"));
    out.push(part("core:personalYear", "time"));
    if (isNow) out.push(part("time:month", "time"), part("time:day", "time"));
    for (const l of letters) out.push(part(`letter:${l.index}`, "letter"));
    return out;
  }, [chart, locale, discs, letters, isNow]);

  const sayId =
    hover ?? (selectedId && PREVIEWABLE.test(selectedId) ? selectedId : null) ?? preview;
  const sayLine = sayId ? say(sayId) : numerologyWheelText(locale, touch ? "hintTouch" : "hint");

  const lp = chart.lifePath;
  const lpWhole = wholeText(lp);
  const py = chart.personalYear.number ?? 1;
  const yearAt = polar(WHEEL.rYear, sectorAngle(py));
  const tick = (id: "time:month" | "time:day", n: number, side: -1 | 1) => {
    const a = sectorAngle(n) + side * 10;
    const p0 = polar(WHEEL.rTickIn, a);
    const p1 = polar(WHEEL.rTickOut, a);
    const label = polar(WHEEL.rTickOut + 9, a);
    return (
      <g
        key={id}
        className="num-tick"
        {...attrs(id)}
        data-testid={`numerology-tick-${id.slice(5)}`}
      >
        <circle className="num-hit" cx={(p0.x + p1.x) / 2} cy={(p0.y + p1.y) / 2} r={8} />
        <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} />
        <text x={label.x} y={label.y} dy="0.36em" textAnchor="middle">
          {numerologyWheelText(locale, id === "time:month" ? "monthMark" : "dayMark")}
        </text>
      </g>
    );
  };

  return (
    <div className="ulune-num-graph" data-testid="num-box" data-focus={mode ?? undefined}>
      <div className="ulune-num-wheelbox">
        <FigureZoom testId="num-zoom">
          <svg
            viewBox={`${-WHEEL.half} ${-WHEEL.half} ${WHEEL.half * 2} ${WHEEL.half * 2}`}
            className="ulune-num-svg"
            data-testid="numerology-ring"
            data-focus={mode ?? undefined}
            data-named={birth ? "1" : undefined}
            role="img"
            aria-label={numerologyWheelText(locale, "aria")}
            onPointerDown={(e: ReactPointerEvent<SVGSVGElement>) => {
              pointerType.current = e.pointerType;
              if (e.pointerType === "touch" && !touch) setTouch(true);
            }}
            onPointerMove={(e) => {
              if (e.pointerType === "touch") return;
              point(partOf(e.target));
            }}
            onPointerLeave={() => point(null, true)}
            onClick={onClick}
          >
            <g className="num-band">
              {DIGITS.map((n) => {
                const k = counts?.[n] ?? 0;
                const at = polar(WHEEL.rNumber, sectorAngle(n));
                return (
                  <g
                    key={n}
                    className="num-sector"
                    {...attrs(`number:${n}`)}
                    data-testid={`numerology-digit-${n}`}
                    data-lesson={counts && k === 0 ? "1" : undefined}
                    data-passion={counts && passion.has(n) ? "1" : undefined}
                    style={{ "--k": Math.min(k, 6), "--enter": n - 1 } as CSSProperties}
                  >
                    <path
                      className="num-hit"
                      d={sectorPath(n, 0, WHEEL.rCentre + 2, WHEEL.rOut + 2)}
                    />
                    <path className="num-sector-band" d={sectorPath(n)} />
                    {counts && passion.has(n) ? (
                      <path
                        className="num-sector-mark"
                        d={sectorPath(n, 3, WHEEL.rOut + 3, WHEEL.rOut + 5)}
                      />
                    ) : null}
                    <text
                      className="num-sector-n"
                      x={at.x}
                      y={at.y}
                      dy="0.36em"
                      textAnchor="middle"
                    >
                      {n}
                    </text>
                  </g>
                );
              })}
            </g>
            {birth ? (
              <g className="num-tracks" aria-hidden>
                <circle r={WHEEL.rConsonant} />
                <circle r={WHEEL.rVowel} />
              </g>
            ) : null}
            <g className="num-letters">
              {marks.map((m) => (
                <g
                  key={m.letter.index}
                  className="num-letter"
                  {...attrs(`letter:${m.letter.index}`)}
                  data-vowel={m.letter.vowel ? "1" : undefined}
                  data-y={m.letter.y != null ? "1" : undefined}
                >
                  <circle className="num-hit" cx={m.x} cy={m.y} r={Math.max(6, m.size * 0.62)} />
                  <text x={m.x} y={m.y} dy="0.36em" textAnchor="middle" fontSize={m.size}>
                    {m.letter.ch}
                  </text>
                  {m.letter.y != null ? (
                    <circle className="num-letter-y" cx={m.x} cy={m.y + m.size * 0.72} r={1.5} />
                  ) : null}
                </g>
              ))}
            </g>
            <g className="num-discs">
              {discs.map(({ item, x, y }) => {
                const whole = wholeText(item.value);
                const marked = Boolean(item.value.debt) || isMaster(item.value.number);
                return (
                  <g
                    key={item.id}
                    className="num-disc"
                    {...attrs(`core:${item.id}`)}
                    data-testid={`numerology-disc-${item.id}`}
                    data-marked={marked ? "1" : undefined}
                  >
                    <circle className="num-hit" cx={x} cy={y} r={WHEEL.disc + 4} />
                    {marked ? (
                      <circle className="num-disc-ring" cx={x} cy={y} r={WHEEL.disc + 3.5} />
                    ) : null}
                    <circle className="num-disc-face" cx={x} cy={y} r={WHEEL.disc} />
                    <text
                      x={x}
                      y={y}
                      dy="0.36em"
                      textAnchor="middle"
                      data-long={whole.length > 2 ? "1" : undefined}
                    >
                      {whole}
                    </text>
                  </g>
                );
              })}
            </g>
            <g className="num-centre" {...attrs("core:lifepath")} data-testid="numerology-core">
              <circle className="num-centre-face" r={WHEEL.rCentre} />
              <text
                className="num-centre-n"
                y={lpWhole !== String(lp.number) ? -5 : 0}
                dy="0.36em"
                textAnchor="middle"
              >
                {lp.number}
              </text>
              {lpWhole !== String(lp.number) ? (
                <text className="num-centre-whole" y={21} dy="0.36em" textAnchor="middle">
                  {lpWhole}
                </text>
              ) : null}
            </g>
            <g className="num-time">
              <g
                className="num-year"
                {...attrs("core:personalYear")}
                data-testid="numerology-year-disc"
                data-now={isNow ? "1" : undefined}
              >
                <circle className="num-hit" cx={yearAt.x} cy={yearAt.y} r={WHEEL.year + 4} />
                <circle className="num-year-face" cx={yearAt.x} cy={yearAt.y} r={WHEEL.year} />
                <text x={yearAt.x} y={yearAt.y} dy="0.36em" textAnchor="middle">
                  {py}
                </text>
              </g>
              {isNow && chart.personalMonth.number
                ? tick("time:month", chart.personalMonth.number, -1)
                : null}
              {isNow && chart.personalDay.number
                ? tick("time:day", chart.personalDay.number, 1)
                : null}
            </g>
          </svg>
        </FigureZoom>
      </div>
      <p className="ulune-num-say" data-testid="num-say" data-on={sayId ? "1" : undefined}>
        {sayLine}
      </p>
      <FigureKeys
        testId="num-keys"
        parts={parts}
        selectedId={selectedId}
        label={numerologyWheelText(locale, "keysLabel")}
        hint={numerologyWheelText(locale, "keysHint")}
        said={(opened, name) =>
          numerologyWheelText(locale, opened ? "keysOpened" : "keysClosed", { name })
        }
        onPoint={(id) => point(id, true)}
        onPick={onSelect}
      />
    </div>
  );
}
