/**
 * The bodygraph's side of the depth engine. Pointing at a centre lifts it as a
 * tile carrying its gates, with its defined channels and the centres they
 * reach; a gate brings its channel and centre; a channel brings its two gates
 * and two centres. The rest of the bodygraph dims meanwhile.
 */
import { HD_CHANNELS, HD_GATE_CENTER, type HdCenterId } from "@/lib/chart/human-design";
import { flattenPath } from "@/lib/depth/relief-geom";
import type { DepthAdapter, LiftMode, ReliefItem, ReliefRequest, Tier } from "./depth-controller";

function q(svg: SVGSVGElement, testId: string): Element | null {
  return svg.querySelector(`[data-testid="${testId}"]`);
}

function channelEl(svg: SVGSVGElement, gates: readonly [number, number]) {
  return q(svg, `hd-channel-${gates[0]}-${gates[1]}`);
}

function isOn(el: Element | null): boolean {
  if (!el) return false;
  return el.getAttribute("data-tone") !== "off";
}

/** The id a bodygraph element answers to (`center:g`, `gate:34`, `channel:34–20`). */
export function hdIdOf(target: Element | null): string | null {
  const el = target?.closest?.("[data-testid^='hd-center-'], [data-testid^='hd-gate-'], [data-testid^='hd-channel-']");
  if (!el) return null;
  const tid = el.getAttribute("data-testid") ?? "";
  if (tid.startsWith("hd-center-")) return `center:${tid.slice(10)}`;
  if (tid.startsWith("hd-gate-")) return `gate:${tid.slice(8)}`;
  if (tid.startsWith("hd-channel-")) {
    const [a, b] = tid.slice(11).split("-").map(Number);
    const ch = HD_CHANNELS.find((c) => c.gates[0] === a && c.gates[1] === b);
    return ch ? `channel:${ch.id}` : null;
  }
  return null;
}

type Role = "hero" | "related" | "context";

/** Heights, px on a 700 px figure (× the adapter's 1.6 for this small figure). */
const HD_HEIGHTS: Record<LiftMode, { center: number; gate: number; channel: number; related: number; relatedLine: number; context: number; stud: number }> = {
  pinned: { center: 7, gate: 6, channel: 5, related: 3.5, relatedLine: 3, context: 2.2, stud: 1.5 },
  hover: { center: 4.5, gate: 4, channel: 3, related: 2.2, relatedLine: 1.8, context: 1.3, stud: 1 },
  preview: { center: 3, gate: 2.8, channel: 2.2, related: 0, relatedLine: 0, context: 0, stud: 0.7 },
};

function toneColor(tone: string | null): string {
  if (tone === "design") return "var(--hd-design)";
  if (tone === "personality" || tone === "both" || tone === "mixed") return "var(--hd-personality)";
  return "var(--color-border-strong)";
}

/**
 * Describe what stands out of the bodygraph: a centre as a tile carrying its
 * gates (as studs), with its defined channels and the centres they reach; a
 * gate with its channels and the gates at their other end; a channel with its
 * two gates and centres.
 */
export function collectHdRelief(svg: SVGSVGElement, id: string, mode: LiftMode): ReliefRequest | null {
  const sep = id.indexOf(":");
  const kind = id.slice(0, sep);
  const key = id.slice(sep + 1);
  const picked: { el: Element; role: Role }[] = [];
  const seen = new Set<Element>();
  const push = (role: Role, el: Element | null) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
    picked.push({ el, role });
  };
  if (kind === "center") {
    const c = key as HdCenterId;
    push("hero", q(svg, `hd-center-${c}`));
    // The centre comes up as one solid tile carrying all of its gates, so
    // their numbers show on it (active gates in colour, the others open).
    for (const [g, center] of Object.entries(HD_GATE_CENTER)) {
      if (center === c) push("hero", q(svg, `hd-gate-${g}`));
    }
    for (const ch of HD_CHANNELS) {
      if (!ch.centers.includes(c)) continue;
      const el = channelEl(svg, ch.gates);
      if (!isOn(el)) continue;
      push("related", el);
      const other = ch.centers[0] === c ? ch.centers[1] : ch.centers[0];
      push("context", q(svg, `hd-center-${other}`));
    }
  } else if (kind === "gate") {
    const n = Number(key);
    push("hero", q(svg, `hd-gate-${n}`));
    for (const ch of HD_CHANNELS) {
      if (!ch.gates.includes(n)) continue;
      push("related", channelEl(svg, ch.gates));
      const other = ch.gates[0] === n ? ch.gates[1] : ch.gates[0];
      const otherEl = q(svg, `hd-gate-${other}`);
      if (isOn(otherEl)) push("related", otherEl);
    }
    const center = HD_GATE_CENTER[n];
    if (center) push("context", q(svg, `hd-center-${center}`));
  } else if (kind === "channel") {
    const ch = HD_CHANNELS.find((c) => c.id === key);
    if (!ch) return null;
    push("hero", channelEl(svg, ch.gates));
    push("related", q(svg, `hd-gate-${ch.gates[0]}`));
    push("related", q(svg, `hd-gate-${ch.gates[1]}`));
    push("context", q(svg, `hd-center-${ch.centers[0]}`));
    push("context", q(svg, `hd-center-${ch.centers[1]}`));
  } else {
    return null;
  }
  if (!picked.some((p) => p.role === "hero")) return null;
  const H = HD_HEIGHTS[mode];
  const pace = mode === "pinned" ? 1 : 0.6;
  const items: ReliefItem[] = [];
  const centerKeys = new Set<string>();
  for (const { el } of picked) {
    const tid = el.getAttribute("data-testid") ?? "";
    if (tid.startsWith("hd-center-")) centerKeys.add(tid);
  }
  let n = 0;
  for (const { el, role } of picked) {
    if (mode === "preview" && role !== "hero") continue;
    const tier: Tier = role === "hero" ? 0 : role === "related" ? 1 : 2;
    const tid = el.getAttribute("data-testid") ?? "";
    const delay = (tier === 0 ? 0 : tier === 1 ? 100 + 40 * Math.min(n++, 6) : 260) * pace;
    if (tid.startsWith("hd-center-")) {
      const d = el.getAttribute("d");
      if (!d) continue;
      let pts: ReturnType<typeof flattenPath>[number] | undefined;
      try {
        [pts] = flattenPath(d);
      } catch {
        pts = undefined;
      }
      if (!pts || pts.length < 3) continue;
      const defined = el.hasAttribute("data-defined");
      items.push({
        key: tid,
        kind: "center",
        tier,
        layer: "slab",
        z: tier === 0 ? H.center : H.context,
        delay,
        els: [el],
        shapes: [{ kind: "poly", pts, d, color: defined ? "color-mix(in oklab, var(--color-fg) 42%, var(--color-bg))" : "color-mix(in oklab, var(--color-fg) 22%, var(--color-bg))" }],
      });
    } else if (tid.startsWith("hd-gate-")) {
      const disc = el.querySelector(".hd-gate-disc");
      const cx = Number(disc?.getAttribute("cx"));
      const cy = Number(disc?.getAttribute("cy"));
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
      const center = HD_GATE_CENTER[Number(tid.slice(8))];
      const on = center && centerKeys.has(`hd-center-${center}`) ? `hd-center-${center}` : null;
      // A gate carried by its lifted centre is a stud on the tile.
      const stud = on && tier === 0 && kind === "center";
      items.push({
        key: tid,
        kind: "gate",
        tier,
        layer: "body",
        z: stud ? H.stud : tier === 0 ? H.gate : H.related,
        on,
        delay: stud ? 90 * pace : delay,
        els: [el],
        shapes: [{ kind: "disc", cx, cy, r: 10.4, color: `color-mix(in oklab, ${toneColor(el.getAttribute("data-tone"))} 58%, var(--color-bg))` }],
        glyph: stud ? 1 : tier === 0 ? 1.2 : 1.08,
      });
    } else if (tid.startsWith("hd-channel-")) {
      const hit = el.querySelector(".hd-hit");
      if (!hit) continue;
      const tone = el.getAttribute("data-tone");
      items.push({
        key: tid,
        kind: "channel",
        tier,
        layer: "line",
        z: tier === 0 ? H.channel : H.relatedLine,
        delay,
        els: [el],
        shapes: [
          {
            kind: "line",
            x1: Number(hit.getAttribute("x1")),
            y1: Number(hit.getAttribute("y1")),
            x2: Number(hit.getAttribute("x2")),
            y2: Number(hit.getAttribute("y2")),
            w: isOn(el) ? 5.5 : 2,
            color: `color-mix(in oklab, ${toneColor(tone)} 70%, var(--color-bg))`,
          },
        ],
      });
    }
  }
  if (!items.length) return null;
  return { key: id, mode, items };
}

export const HD_DEPTH_ADAPTER: DepthAdapter = {
  planeClass: "ulune-hd-svg",
  heightScale: 1.6,
  dimBase: true,
};
