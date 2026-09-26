import {
  graphForView,
  HD_CHANNELS,
  type HdCenterId,
  type HdView,
  type HumanDesignChart,
} from "@/lib/chart/human-design";
import { cn } from "@/lib/utils";
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { DepthController, type LiftMode } from "./depth/depth-controller";
import { HD_DEPTH_ADAPTER, collectHdRelief, hdIdOf } from "./depth/hd-depth";
import { getDepthPrefs, subscribeDepthPrefs } from "@/lib/depth/prefs";
import { prefersReducedMotion } from "@/lib/depth/env";
import { announceChartHover, onChartPreview } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { hdCenterLabel, hdCenterState, hdGateTitle, hdLayerLabel } from "@/lib/i18n/hd-ui";

/** Gate seats on each center’s rim so channels run between centers, not through them. */
/** How long the pointer rests on a piece before it rises, and how long a hover outlives a gap (ms). */
const HOVER_LIFT_MS = 120;
const HOVER_LINGER_MS = 90;

const GATE_XY: Record<number, [number, number]> = {
  // Head (down triangle)
  64: [148, 78],
  61: [180, 36],
  63: [212, 78],
  // Ajna (up triangle)
  47: [148, 112],
  24: [180, 102],
  4: [212, 112],
  17: [152, 148],
  43: [180, 156],
  11: [208, 148],
  // Throat (square)
  62: [156, 188],
  23: [180, 186],
  56: [204, 188],
  16: [140, 204],
  20: [140, 232],
  31: [156, 248],
  8: [180, 246],
  33: [204, 248],
  45: [226, 244],
  12: [222, 216],
  35: [226, 190],
  // G (diamond)
  7: [158, 278],
  1: [180, 274],
  13: [202, 278],
  10: [144, 310],
  25: [216, 310],
  15: [158, 342],
  2: [180, 348],
  46: [202, 342],
  // Heart (right triangle)
  21: [246, 286],
  51: [236, 310],
  26: [246, 334],
  40: [268, 322],
  // Spleen (right triangle)
  48: [86, 286],
  57: [108, 312],
  44: [118, 338],
  50: [108, 372],
  32: [72, 392],
  28: [58, 418],
  18: [86, 436],
  // Sacral (square)
  5: [158, 378],
  14: [180, 374],
  29: [202, 378],
  34: [144, 400],
  27: [144, 424],
  59: [216, 400],
  9: [158, 448],
  3: [180, 454],
  42: [202, 448],
  // Solar Plexus (left triangle)
  36: [274, 286],
  22: [252, 312],
  37: [252, 348],
  6: [252, 384],
  49: [288, 400],
  55: [302, 424],
  30: [274, 436],
  // Root (square)
  58: [132, 496],
  38: [158, 480],
  54: [180, 482],
  53: [202, 480],
  60: [228, 496],
  52: [158, 512],
  19: [224, 526],
  39: [204, 548],
  41: [180, 544],
};

const CENTERS: Array<{
  id: HdCenterId;
  kind: "tri-down" | "tri-up" | "square" | "diamond" | "tri-right" | "tri-left";
  x: number;
  y: number;
  s: number;
}> = [
  { id: "head", kind: "tri-down", x: 180, y: 58, s: 58 },
  { id: "ajna", kind: "tri-up", x: 180, y: 128, s: 56 },
  { id: "throat", kind: "square", x: 180, y: 216, s: 52 },
  { id: "g", kind: "diamond", x: 180, y: 312, s: 58 },
  { id: "heart", kind: "tri-right", x: 252, y: 314, s: 36 },
  { id: "spleen", kind: "tri-right", x: 86, y: 360, s: 52 },
  { id: "sacral", kind: "square", x: 180, y: 414, s: 56 },
  { id: "solarPlexus", kind: "tri-left", x: 274, y: 360, s: 52 },
  { id: "root", kind: "square", x: 180, y: 516, s: 56 },
];

function centerPath(kind: (typeof CENTERS)[number]["kind"], x: number, y: number, s: number): string {
  const h = s / 2;
  if (kind === "square") {
    return `M ${x - h} ${y - h} H ${x + h} V ${y + h} H ${x - h} Z`;
  }
  if (kind === "diamond") {
    return `M ${x} ${y - h} L ${x + h} ${y} L ${x} ${y + h} L ${x - h} ${y} Z`;
  }
  if (kind === "tri-down") {
    return `M ${x} ${y + h} L ${x - h} ${y - h} L ${x + h} ${y - h} Z`;
  }
  if (kind === "tri-up") {
    return `M ${x} ${y - h} L ${x - h} ${y + h} L ${x + h} ${y + h} Z`;
  }
  if (kind === "tri-right") {
    return `M ${x + h} ${y} L ${x - h} ${y - h} L ${x - h} ${y + h} Z`;
  }
  return `M ${x - h} ${y} L ${x + h} ${y - h} L ${x + h} ${y + h} Z`;
}

type GateTone = "off" | "personality" | "design" | "both";

function toneOfGate(gate: number, personality: Set<number>, design: Set<number>): GateTone {
  const p = personality.has(gate);
  const d = design.has(gate);
  if (p && d) return "both";
  if (p) return "personality";
  if (d) return "design";
  return "off";
}

function strokeClass(tone: GateTone): string {
  if (tone === "design") return "is-design";
  if (tone === "both") return "is-both";
  if (tone === "personality") return "is-personality";
  return "is-off";
}

export function HumanDesignGraph({
  chart,
  view,
  selectedId,
  onSelect,
}: {
  chart: HumanDesignChart;
  view: HdView;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const graph = graphForView(chart, view);
  const personality = new Set(
    graph.activations.filter((a) => a.layer === "personality").map((a) => a.gate),
  );
  const design = new Set(graph.activations.filter((a) => a.layer === "design").map((a) => a.gate));
  const defined = new Set(graph.centers);
  const channelIds = new Set(graph.channels.map((c) => c.id));
  // Depth: what you point at lifts off the bodygraph (see depth-controller).
  const sceneRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const depthRef = useRef<DepthController | null>(null);
  const hoverRef = useRef<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const liftRef = useRef<(refresh: boolean) => void>(() => {});
  /** A hovered piece waiting for the pointer to rest, and a hover about to be let go. */
  const intentRef = useRef<{ key: string | null; timer: number }>({ key: null, timer: 0 });
  const lingerRef = useRef(0);
  liftRef.current = (refresh) => {
    const depth = depthRef.current;
    const svg = svgRef.current;
    if (!depth || !svg) return;
    const sel = selectedRef.current;
    const hov = hoverRef.current;
    const pre = previewRef.current;
    const id = sel ?? hov ?? pre;
    const mode: LiftMode | null = sel ? "pinned" : hov ? "hover" : pre ? "preview" : null;
    const req = getDepthPrefs().lift && id && mode ? collectHdRelief(svg, id, mode) : null;
    // Hover intent: a hovered piece rises once the pointer rests on it; what
    // was up stays up meanwhile (the figure dims under a lift: letting go
    // first would flash it bright between two pieces).
    const intent = intentRef.current;
    if (req && mode === "hover" && depth.activeKey() !== req.key && !prefersReducedMotion()) {
      if (intent.key !== req.key) {
        window.clearTimeout(intent.timer);
        intent.key = req.key;
        intent.timer = window.setTimeout(() => {
          intent.timer = 0;
          liftRef.current(false);
        }, HOVER_LIFT_MS);
        return;
      }
      if (intent.timer) return;
    } else if (intent.key !== null) {
      window.clearTimeout(intent.timer);
      intent.key = null;
      intent.timer = 0;
    }
    if (refresh && req && depth.activeKey() === req.key) depth.refresh(req);
    else depth.lift(req);
  };
  // Cinematic entrance: the centres settle in from the top down, the
  // channels draw themselves, the gates pop in a wave (styles.css).
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || prefersReducedMotion()) return;
    svg.setAttribute("data-entering", "");
    const id = window.setTimeout(() => svg.removeAttribute("data-entering"), 2000);
    return () => window.clearTimeout(id);
  }, []);
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const stack = stackRef.current;
    if (!scene || !stack) return;
    const depth = new DepthController(scene, stack, HD_DEPTH_ADAPTER, { reducedMotion: prefersReducedMotion });
    depth.setBase(svgRef.current);
    depthRef.current = depth;
    const offPrefs = subscribeDepthPrefs(() => liftRef.current(false));
    const offPreview = onChartPreview((id) => {
      previewRef.current = id && /^(center|gate|channel):/.test(id) ? id : null;
      liftRef.current(false);
    });
    const intent = intentRef.current;
    const linger = lingerRef;
    return () => {
      offPrefs();
      offPreview();
      window.clearTimeout(intent.timer);
      window.clearTimeout(linger.current);
      depth.destroy();
      depthRef.current = null;
    };
  }, []);
  // After React repaints the graph (selection, layer view), re-take the copies.
  useLayoutEffect(() => {
    liftRef.current(true);
  }, [selectedId, view, chart]);
  useEffect(() => () => announceChartHover(null), []);

  const keyPick = (id: string) => (ev: KeyboardEvent) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onSelect(id);
    }
  };

  const onHover = (id: string | null, now = false) => {
    window.clearTimeout(lingerRef.current);
    if (id === hoverRef.current) return;
    // Crossing a gap between two pieces does not drop the lift for a moment.
    if (id === null && !now && !prefersReducedMotion()) {
      lingerRef.current = window.setTimeout(() => onHover(null, true), HOVER_LINGER_MS);
      return;
    }
    hoverRef.current = id;
    announceChartHover(id);
    liftRef.current(false);
  };

  return (
    <div ref={sceneRef} className="ulune-depth ulune-hd-depth" data-testid="hd-depth">
    <div ref={stackRef} className="ulune-depth-stack">
    <svg
      ref={svgRef}
      viewBox="0 0 360 580"
      className="ulune-hd-svg"
      data-testid="hd-graph"
      data-view={view}
      role="group"
      aria-label={t("hdAria")}
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        onHover(hdIdOf(e.target as Element));
      }}
      onPointerLeave={() => onHover(null, true)}
      onFocus={(e) => onHover(hdIdOf(e.target as Element))}
      onBlur={() => onHover(null, true)}
    >
      <defs>
        <pattern id="hd-stripe" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" className="hd-fill-personality" />
          <rect width="2.5" height="5" className="hd-fill-design" />
        </pattern>
      </defs>

      {HD_CHANNELS.map((ch) => {
        const a = GATE_XY[ch.gates[0]];
        const b = GATE_XY[ch.gates[1]];
        if (!a || !b) return null;
        const on = channelIds.has(ch.id);
        const live = graph.channels.find((row) => row.id === ch.id);
        const t0 = toneOfGate(ch.gates[0], personality, design);
        const t1 = toneOfGate(ch.gates[1], personality, design);
        const mixed = Boolean(on && live?.mixed);
        const selected = selectedId === `channel:${ch.id}`;
        const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const tone = !on ? "off" : mixed ? "mixed" : live?.design && !live.personality ? "design" : "personality";
        const seg = (tn: GateTone, x1: number, y1: number, x2: number, y2: number, key: string) => (
          <g key={key}>
            <line className={strokeClass(tn === "both" ? "personality" : tn)} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} data-draw="" />
            {tn === "both" ? <line className="is-both-dash" x1={x1} y1={y1} x2={x2} y2={y2} /> : null}
          </g>
        );
        return (
          <g
            key={ch.id}
            data-testid={`hd-channel-${ch.gates[0]}-${ch.gates[1]}`}
            data-tone={tone}
            className={cn("ulune-hd-channel", selected && "is-selected")}
            // Entrance order: top to bottom.
            style={{ ["--enter" as string]: ((a[1] + b[1]) / 2 / 580).toFixed(3) }}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect(`channel:${ch.id}`);
            }}
          >
            <line className="hd-hit" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
            {!on ? (
              <line className="is-off" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} pathLength={1} data-draw="" />
            ) : mixed ? (
              <>
                {seg(t0, a[0], a[1], mid[0], mid[1], "a")}
                {seg(t1, mid[0], mid[1], b[0], b[1], "b")}
              </>
            ) : (
              seg(tone === "design" ? "design" : "personality", a[0], a[1], b[0], b[1], "ab")
            )}
          </g>
        );
      })}

      {CENTERS.map((c) => {
        const on = defined.has(c.id);
        const selected = selectedId === `center:${c.id}`;
        const id = `center:${c.id}`;
        return (
          <path
            key={c.id}
            d={centerPath(c.kind, c.x, c.y, c.s)}
            data-testid={`hd-center-${c.id}`}
            data-defined={on ? "1" : undefined}
            data-center={c.id}
            style={{ ["--enter" as string]: (c.y / 580).toFixed(3) }}
            className={cn("ulune-hd-center", selected && "is-selected")}
            tabIndex={0}
            role="button"
            aria-pressed={selected}
            aria-label={`${hdCenterLabel(locale, c.id)} · ${hdCenterState(locale, on)}`}
            onKeyDown={keyPick(id)}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect(id);
            }}
          />
        );
      })}

      {Object.entries(GATE_XY).map(([key, xy]) => {
        const gate = Number(key);
        const tone = toneOfGate(gate, personality, design);
        const selected = selectedId === `gate:${gate}`;
        const id = `gate:${gate}`;
        const active = tone !== "off";
        return (
          <g
            key={gate}
            data-testid={`hd-gate-${gate}`}
            data-tone={tone}
            style={{ ["--enter" as string]: (xy[1] / 580).toFixed(3) }}
            className={cn("ulune-hd-gate", selected && "is-selected")}
            tabIndex={active ? 0 : -1}
            role="button"
            aria-pressed={selected}
            aria-label={`${hdGateTitle(locale, gate)}${active ? ` · ${tone === "both" ? `${hdLayerLabel(locale, "personality")} + ${hdLayerLabel(locale, "design")}` : hdLayerLabel(locale, tone)}` : ""}`}
            onKeyDown={keyPick(id)}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect(id);
            }}
          >
            <circle className="hd-gate-hit" cx={xy[0]} cy={xy[1]} r="11" />
            <circle className="hd-gate-dot" cx={xy[0]} cy={xy[1]} r="2.2" />
            <circle className="hd-gate-disc" cx={xy[0]} cy={xy[1]} r="10" />
            <text x={xy[0]} y={xy[1]} textAnchor="middle" dominantBaseline="central">
              {gate}
            </text>
          </g>
        );
      })}
    </svg>
    </div>
    </div>
  );
}
