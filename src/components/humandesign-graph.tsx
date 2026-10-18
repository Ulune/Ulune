import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  BODYGRAPH_CENTERS,
  BODYGRAPH_CHANNELS,
  BODYGRAPH_GATES,
  BODYGRAPH_H,
  BODYGRAPH_W,
  GATE_R,
  centerPath,
} from "@/lib/chart/bodygraph-geometry";
import { hdFocusOf, hdSay, type HdFocus } from "@/lib/chart/hd-focus";
import type { HdPairBy, HdPairKind, HdPairTone } from "@/lib/chart/hd-pair";
import { useFirstHint } from "@/lib/first-hint";
import { parseHdActId } from "@/lib/chart/hd-rows";
import { hdArrowsOf } from "@/lib/chart/hd-variable";
import { graphForView, HD_CENTER_IDS, HD_CHANNELS, type HdCenterId, type HdView, type HumanDesignChart } from "@/lib/chart/human-design";
import { announceChartHover, onChartPreview } from "@/lib/depth/preview-bus";
import { prefersReducedMotion } from "@/lib/depth/env";
import { useI18n } from "@/lib/i18n/locale";
import { hdGraphText } from "@/lib/i18n/hd-ui";
import { cn } from "@/lib/utils";
import { FigureKeys, type FigurePart } from "./figure-keys";
import { FigureZoom } from "./figure-zoom";
import { HdColumn } from "./hd-columns";
import { useHdNames } from "./use-hd-names";
import { useDomIds, useScopeId } from "@/studio/scope";

/*
 * The bodygraph between its two columns: nine centres, 36 channels and 64
 * gates drawn from bodygraph-geometry.ts, the Design's 13 bodies on the left
 * and the Personality's on the right. Pointing outlines a piece, what it
 * connects to and its rows; choosing it keeps those bright and fades the
 * rest. Nothing is copied or moved: what is lit is always where it is drawn.
 *
 * Given `pair`, the same drawing is a connection chart (Human Design ›
 * Relationship, share and compare plan, feature 5a; modes/design-pair.tsx):
 * each gate is A's (a filled disc), B's (a ring) or both's (a filled disc
 * with a ring); only the channels the two form are drawn, each half as its
 * gate's (A solid, B hollow, both cased), so the four kinds read by pattern
 * as well as colour, an electromagnetic one marked where its halves meet;
 * the centres the two define are filled, with a mark for who defines them.
 * No columns; what is said and lit is the pair's. Without it, nothing
 * changes from the natal bodygraph.
 */

/** A connection chart drawn on the bodygraph: what modes/design-pair.tsx hands it, from lib/chart/hd-pair.ts. */
export type HdPairFigure = {
  /** Whose each gate is. */
  tones: ReadonlyMap<number, HdPairTone>;
  /** The channels the two form, by kind (the others are not drawn). */
  kinds: ReadonlyMap<string, HdPairKind>;
  /** Formed channels whose kind could differ at another birth hour (no birth time). */
  uncertain: ReadonlySet<string>;
  /** The centres defined between the two, and who defines them. */
  centres: ReadonlyMap<HdCenterId, HdPairBy>;
  /** What a choice or the pointer lights. */
  focusOf: (id: string | null) => HdFocus | null;
  /** The line naming a piece (under the chart, the keyboard's list, the phone's card). */
  say: (id: string) => string;
  /** The keyboard's list, in walking order. */
  parts: FigurePart[];
  /** The figure's name for screen readers. */
  label: string;
};

type Tone = "off" | "personality" | "design" | "both";

/** A pointer that crosses the gap between two pieces keeps the first lit this long (ms). */
const HOVER_LINGER_MS = 90;
/** On a touch screen, a tap this close to a gate chooses it (CSS px). */
const TOUCH_GATE_PX = 14;
/** What a panel may point at on the chart (a row, a fact, a reading's link). */
const PREVIEWABLE = /^(gate|channel|center|act):|^hello:(authority|profile|cross)$/;
/** On a connection chart: its pieces, and the page's own parts (a kind, the conditioning, the open centres…). */
const PAIR_PREVIEWABLE = /^(gate|channel|center|hdp):/;

/** Where a centre's mark stands on a connection chart: its middle, the small Heart's nudged clear of gate 51. */
function markAt(c: HdCenterId): readonly [number, number] {
  if (c === "heart") return [340, 398];
  const pts = BODYGRAPH_CENTERS[c].points;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

/** A small four-pointed spark: an electromagnetic channel's meeting point, a centre defined only together. */
function sparkPath([x, y]: readonly [number, number], r: number): string {
  const k = r * 0.32;
  const f = (n: number) => String(Math.round(n * 100) / 100);
  return `M${f(x)} ${f(y - r)}L${f(x + k)} ${f(y - k)}L${f(x + r)} ${f(y)}L${f(x + k)} ${f(y + k)}L${f(x)} ${f(y + r)}L${f(x - k)} ${f(y + k)}L${f(x - r)} ${f(y)}L${f(x - k)} ${f(y - k)}Z`;
}

/** Who defines a centre between the two, as a mark: A's dot, B's ring, both, or the spark of "only together". */
function CentreMark({ centre, by, dim }: { centre: HdCenterId; by: HdPairBy; dim: boolean }) {
  const [x, y] = markAt(centre);
  const two = by === "both";
  const w = two ? 20 : 12;
  return (
    <g className="hd-mark" data-by={by} data-dim={dim ? "1" : undefined} data-testid={`hd-mark-${centre}`}>
      <rect className="hd-mark-pill" x={x - w / 2} y={y - 5.5} width={w} height={11} rx={5.5} />
      {by === "together" ? <path className="hd-mark-spark" d={sparkPath([x, y], 4.6)} /> : null}
      {by === "a" || two ? <circle className="hd-mark-a" cx={two ? x - 4.6 : x} cy={y} r={3.2} /> : null}
      {by === "b" || two ? <circle className="hd-mark-b" cx={two ? x + 4.6 : x} cy={y} r={2.6} /> : null}
    </g>
  );
}

function partOf(target: EventTarget | null): string | null {
  const el = target instanceof Element ? target.closest("[data-part]") : null;
  return el?.getAttribute("data-part") ?? null;
}

export function HumanDesignGraph({
  chart,
  view,
  selectedId,
  onSelect,
  onClear,
  moments,
  pair,
}: {
  chart: HumanDesignChart;
  view: HdView;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** A click on empty space lets the chosen piece go. */
  onClear: () => void;
  /** When each column was taken ("6 Oct 1999, 02:48 BST"). */
  moments: { design: string; personality: string };
  /** Draw a connection chart instead (see above); `chart` is then the first person's, its own parts not drawn. */
  pair?: HdPairFigure;
}) {
  const { locale, t } = useI18n();
  const names = useHdNames(locale);
  const graph = graphForView(chart, view);
  const tones = useMemo(() => {
    const p = new Set(graph.activations.filter((a) => a.layer === "personality").map((a) => a.gate));
    const d = new Set(graph.activations.filter((a) => a.layer === "design").map((a) => a.gate));
    const out = new Map<number, Tone>();
    for (let g = 1; g <= 64; g += 1) out.set(g, p.has(g) && d.has(g) ? "both" : p.has(g) ? "personality" : d.has(g) ? "design" : "off");
    return out;
  }, [graph.activations]);
  const defined = useMemo(() => new Set(graph.centers), [graph.centers]);
  const arrows = useMemo(() => hdArrowsOf(chart), [chart]);
  const uncertainRows = useMemo(() => (chart.uncertain ? new Set(chart.uncertain.rows) : null), [chart.uncertain]);
  const uncertainChannels = useMemo(() => new Set(chart.uncertain?.channels ?? []), [chart.uncertain]);
  const onChannels = useMemo(() => new Set(graph.channels.map((c) => c.id)), [graph.channels]);
  const channelRank = (ch: (typeof HD_CHANNELS)[number]) =>
    onChannels.has(ch.id) ? 2 : (tones.get(ch.gates[0]) ?? "off") !== "off" || (tones.get(ch.gates[1]) ?? "off") !== "off" ? 1 : 0;

  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const linger = useRef(0);
  const pointerType = useRef("mouse");
  // A screen without a pointer that hovers gets the tap hint from the start.
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches) setTouch(true);
  }, []);

  const focus = useMemo(() => (pair ? pair.focusOf(selectedId) : hdFocusOf(selectedId, chart)), [selectedId, chart, pair]);
  const pointed = hover ?? (focus ? null : preview);
  const outline = useMemo(() => (pair ? pair.focusOf(pointed) : hdFocusOf(pointed, chart)), [pointed, chart, pair]);
  // Whose each gate is: a layer's on a natal chart, a person's on a connection chart.
  const shown: ReadonlyMap<number, string> = pair ? pair.tones : tones;
  const mode = focus ? "pinned" : outline ? "hover" : null;

  // Previews and hovers stay in this figure's chart scope (studio/scope.tsx: the main page, or a Compare pane).
  const scopeId = useScopeId();
  const domId = useDomIds();
  const previewable = pair ? PAIR_PREVIEWABLE : PREVIEWABLE;
  useEffect(() => onChartPreview((id) => setPreview(id && previewable.test(id) ? id : null), scopeId), [scopeId, previewable]);
  useEffect(() => () => window.clearTimeout(linger.current), []);
  useEffect(() => () => announceChartHover(null, scopeId), [scopeId]);

  const point = (id: string | null, now = false) => {
    window.clearTimeout(linger.current);
    if (id === null && !now && !prefersReducedMotion()) {
      linger.current = window.setTimeout(() => point(null, true), HOVER_LINGER_MS);
      return;
    }
    setHover(id);
    announceChartHover(id, scopeId);
  };

  /** On a touch screen, the gate nearest the finger (within a fingertip) wins. */
  const nearestGate = (clientX: number, clientY: number): string | null => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    let best: string | null = null;
    let bestD = TOUCH_GATE_PX;
    const pt = svg.createSVGPoint();
    for (const [n, g] of Object.entries(BODYGRAPH_GATES)) {
      pt.x = g.x;
      pt.y = g.y;
      const p = pt.matrixTransform(m);
      const d = Math.hypot(p.x - clientX, p.y - clientY);
      if (d <= bestD) {
        bestD = d;
        best = `gate:${n}`;
      }
    }
    return best;
  };

  const onClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    let id = partOf(e.target);
    if (pointerType.current === "touch" && !id?.startsWith("gate:")) id = nearestGate(e.clientX, e.clientY) ?? id;
    if (id) onSelect(id);
    else if (selectedId) onClear();
  };

  const parts = useMemo<FigurePart[]>(() => {
    if (pair) return pair.parts;
    const out: FigurePart[] = [];
    const say = (id: string) => hdSay(chart, view, id, locale, names);
    const centres = [...HD_CENTER_IDS].sort((a, b) => Number(defined.has(b)) - Number(defined.has(a)));
    for (const c of centres) out.push({ id: `center:${c}`, label: say(`center:${c}`), kind: "center" });
    const chans = [...HD_CHANNELS].sort((a, b) => Number(onChannels.has(b.id)) - Number(onChannels.has(a.id)));
    for (const ch of chans.filter((c) => onChannels.has(c.id))) out.push({ id: `channel:${ch.id}`, label: say(`channel:${ch.id}`), kind: "channel" });
    const gates = [...tones.keys()];
    for (const g of gates.filter((n) => tones.get(n) !== "off")) out.push({ id: `gate:${g}`, label: say(`gate:${g}`), kind: "gate" });
    for (const ch of chans.filter((c) => !onChannels.has(c.id))) out.push({ id: `channel:${ch.id}`, label: say(`channel:${ch.id}`), kind: "channel-open" });
    for (const g of gates.filter((n) => tones.get(n) === "off")) out.push({ id: `gate:${g}`, label: say(`gate:${g}`), kind: "gate-off" });
    return out;
  }, [pair, chart, view, locale, names, defined, onChannels, tones]);

  // The line under the chart: what the pointer is on, else the chosen row or
  // piece, else what a panel points at, else the hint.
  const sayId = pair
    ? (hover ?? focus?.hero ?? (selectedId?.startsWith("hdp:") ? selectedId : null) ?? outline?.hero ?? (preview?.startsWith("hdp:") ? preview : null))
    : (hover ??
      (parseHdActId(selectedId) ? selectedId : (focus?.hero ?? null)) ??
      (preview && parseHdActId(preview) ? preview : (outline?.hero ?? null)));
  // The how-to line shows until the pointer first finds a shape (part 95).
  const firstHint = useFirstHint("ulune.hint.hd.v1", sayId != null);
  const sayLine = sayId ? (pair ? pair.say(sayId) : hdSay(chart, view, sayId, locale, names)) : firstHint ? hdGraphText(locale, touch ? "hintTouch" : "hint") : "\u00a0";

  const attrs = (id: string) => ({
    "data-part": id,
    "data-lit": focus?.lit.has(id) ? "1" : undefined,
    "data-hero": focus?.hero === id ? "1" : undefined,
    "data-hover": outline?.lit.has(id) ? (outline.hero === id ? "hero" : "1") : undefined,
  });

  // The two columns' headers take the taller one's height (the Design's line can run a line
  // longer in a narrow column), so their rows stay level with each other.
  const row3 = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = row3.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const level = () => {
      frame = 0;
      const heads = [...box.querySelectorAll<HTMLElement>(".ulune-hd-col-head")];
      if (heads.length !== 2) return;
      for (const h of heads) h.style.minHeight = "";
      const tall = Math.max(...heads.map((h) => h.getBoundingClientRect().height));
      for (const h of heads) h.style.minHeight = `${tall}px`;
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(level);
    };
    const watch = new ResizeObserver(soon);
    watch.observe(box);
    soon();
    return () => {
      watch.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const column = (layer: "design" | "personality") => (
    <HdColumn
      chart={chart}
      layer={layer}
      view={view}
      moment={moments[layer]}
      selectedId={selectedId}
      lit={focus ? focus.rows : null}
      outlined={outline ? outline.rows : null}
      arrows={arrows.filter((a) => a.layer === layer)}
      uncertain={uncertainRows}
      onPoint={(id) => point(id, id !== null)}
      onPick={onSelect}
    />
  );

  return (
    <div className="ulune-hd-graph" data-testid={pair ? "hd-pair-box" : "hd-box"} data-focus={mode ?? undefined} data-pair={pair ? "" : undefined}>
      <div ref={row3} className="ulune-hd-row3">
        {pair ? null : column("design")}
        <FigureZoom testId={pair ? "hd-pair-zoom" : "hd-zoom"}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${BODYGRAPH_W} ${BODYGRAPH_H}`}
            className="ulune-hd-svg"
            data-testid={pair ? "hd-pair-graph" : "hd-graph"}
            data-view={pair ? undefined : view}
            data-focus={mode ?? undefined}
            role="img"
            aria-label={pair ? pair.label : t("hdAria")}
            // Its stripes' pattern by this figure's own id (hd.css: both a gate's layers).
            style={scopeId === "main" ? undefined : ({ "--hd-stripe": `url(#${domId("hd-stripe")})` } as CSSProperties)}
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
            <defs>
              <pattern id={domId("hd-stripe")} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" className="hd-fill-personality" />
                <rect width="2.5" height="5" className="hd-fill-design" />
              </pattern>
            </defs>
            <g className="hd-channels">
              {/* Undefined channels first, hanging ones next, the defined last, on
                  top: where two cross (2–14 and 44–26), a click on a coloured
                  channel opens that channel, not the bare line drawn over it. */}
              {HD_CHANNELS.map((ch, chIndex) => ({ ch, chIndex, rank: pair ? (pair.kinds.has(ch.id) ? 2 : 0) : channelRank(ch) }))
                .sort((a, b) => a.rank - b.rank || a.chIndex - b.chIndex)
                .map(({ ch, chIndex }) => {
                const draw = BODYGRAPH_CHANNELS[ch.id];
                if (pair) {
                  // Only what the two form, each half as its gate's: A solid, B hollow, both cased.
                  const kind = pair.kinds.get(ch.id);
                  const half = (tone: HdPairTone | undefined, d: string) =>
                    tone === "a" ? (
                      <path className="hd-line is-a" d={d} />
                    ) : tone === "b" ? (
                      <>
                        <path className="hd-line is-b" d={d} />
                        <path className="hd-line-core" d={d} />
                      </>
                    ) : tone === "both" ? (
                      <>
                        <path className="hd-line is-b is-wide" d={d} />
                        <path className="hd-line is-a is-core" d={d} />
                      </>
                    ) : null;
                  return (
                    <g
                      key={ch.id}
                      {...attrs(`channel:${ch.id}`)}
                      data-testid={`hd-channel-${ch.gates[0]}-${ch.gates[1]}`}
                      data-tone={kind ? "defined" : "off"}
                      data-kind={kind}
                      data-uncertain={kind && pair.uncertain.has(ch.id) ? "1" : undefined}
                      className={cn("ulune-hd-channel", kind && "is-on")}
                    >
                      <path className="hd-hit" d={draw.d} />
                      <path className="hd-off" d={draw.d} />
                      {kind ? half(pair.tones.get(ch.gates[0]), draw.dA) : null}
                      {kind ? half(pair.tones.get(ch.gates[1]), draw.dB) : null}
                      {kind === "electromagnetic" ? <path className="hd-spark" d={sparkPath(draw.mid, 6)} /> : null}
                    </g>
                  );
                }
                const t0 = tones.get(ch.gates[0]) ?? "off";
                const t1 = tones.get(ch.gates[1]) ?? "off";
                const on = onChannels.has(ch.id);
                const half = (tone: Tone, d: string) =>
                  tone === "off" ? null : (
                    <>
                      <path className={tone === "design" ? "hd-line is-design" : "hd-line is-personality"} d={d} pathLength={1} />
                      {tone === "both" ? <path className="hd-line is-both-dash" d={d} /> : null}
                    </>
                  );
                return (
                  <g
                    key={ch.id}
                    {...attrs(`channel:${ch.id}`)}
                    data-testid={`hd-channel-${ch.gates[0]}-${ch.gates[1]}`}
                    data-tone={on ? "defined" : t0 !== "off" || t1 !== "off" ? "hanging" : "off"}
                    data-uncertain={uncertainChannels.has(ch.id) ? "1" : undefined}
                    className={cn("ulune-hd-channel", on && "is-on")}
                    // Its place in the entrance: the defined channels draw first (hd.css).
                    style={{ ["--enter" as string]: on ? 0 : 1 + (chIndex % 12) }}
                  >
                    <path className="hd-hit" d={draw.d} />
                    <path className="hd-off" d={draw.d} />
                    {half(t0, draw.dA)}
                    {half(t1, draw.dB)}
                  </g>
                );
              })}
            </g>
            <g className="hd-centers">
              {HD_CENTER_IDS.map((c, ci) => (
                <path
                  key={c}
                  // From the Head down to the Root in the entrance (hd.css).
                  style={{ ["--enter" as string]: ci }}
                  {...attrs(`center:${c}`)}
                  d={centerPath(c)}
                  data-testid={`hd-center-${c}`}
                  data-center={c}
                  data-shape={BODYGRAPH_CENTERS[c].shape}
                  data-defined={(pair ? pair.centres.has(c) : defined.has(c)) ? "1" : undefined}
                  data-by={pair?.centres.get(c)}
                  className="ulune-hd-center"
                />
              ))}
            </g>
            {pair ? (
              <g className="hd-marks" aria-hidden>
                {[...pair.centres].map(([c, by]) => (
                  // It fades with its centre when a choice leaves the centre out.
                  <CentreMark key={c} centre={c} by={by} dim={Boolean(focus && !focus.lit.has(`center:${c}`))} />
                ))}
              </g>
            ) : null}
            <g className="hd-gates">
              {Object.entries(BODYGRAPH_GATES).map(([key, g]) => {
                const n = Number(key);
                const tone = shown.get(n) ?? "off";
                return (
                  <g key={n} {...attrs(`gate:${n}`)} data-testid={`hd-gate-${n}`} data-tone={tone} className="ulune-hd-gate">
                    <circle className="hd-gate-hit" cx={g.x} cy={g.y} r={GATE_R + 2.5} />
                    <circle className="hd-gate-disc" cx={g.x} cy={g.y} r={GATE_R} />
                    {pair && (tone === "b" || tone === "both") ? <circle className="hd-gate-ring" cx={g.x} cy={g.y} r={GATE_R - 1.5} /> : null}
                    <text x={g.x} y={g.y} dy="0.36em" textAnchor="middle">
                      {n}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </FigureZoom>
        {pair ? null : column("personality")}
      </div>
      <p className="ulune-hd-say" data-testid={pair ? "hd-pair-say" : "hd-say"} data-on={sayId ? "1" : undefined}>
        {sayLine}
      </p>
      <FigureKeys
        testId={pair ? "hd-pair-keys" : "hd-keys"}
        parts={parts}
        selectedId={selectedId && /^(gate|channel|center):/.test(selectedId) ? selectedId : (focus?.hero ?? null)}
        label={hdGraphText(locale, "keysLabel")}
        hint={hdGraphText(locale, "keysHint")}
        said={(opened, name) => hdGraphText(locale, opened ? "keysOpened" : "keysClosed", { name })}
        onPoint={(id) => point(id, true)}
        onPick={onSelect}
      />
    </div>
  );
}
