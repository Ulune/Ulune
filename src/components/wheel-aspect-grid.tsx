/**
 * The aspect grid beside the wheel (wide stages only; wheel-zoom.tsx places
 * it): the aspects the wheel draws, one cell per pair, each glyph in its
 * family's ink, and each body's count on the diagonal. Linked both ways:
 * pointing at a cell lights that aspect on the wheel, a click pins it; what
 * the wheel lights (a hover, a pin, a panel's preview) lights its row,
 * column or cell here.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { ASPECT_COLOR } from "@/lib/chart/constants";
import type { SelectionStore } from "@/lib/chart/selection-store";
import type { AspectId, BodyId } from "@/lib/chart/types";
import { resolveWheelFocus, type WheelFocusCtx } from "@/lib/chart/wheel-focus";
import { lineInk } from "@/lib/chart/wheel-style";
import { currentChartHover, currentChartPreview, onChartHover, onChartPreview, previewProps } from "@/lib/depth/preview-bus";
import { aspectName, bodyLabel } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { AspectGlyph, PlanetGlyph } from "./glyphs";
import { formatArc } from "@/lib/utils";

export type GridRow = { id: string; aspect: string; type: AspectId; a: BodyId; b: BodyId; orb: number };

/** The wheel's own order: the lights, the planets, then the rest as the chart lists them. */
const ORDER = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

export function WheelAspectGrid({
  rows,
  shown = [],
  ctx,
  selection,
  onSelect,
}: {
  rows: GridRow[];
  /** The bodies on the wheel: the lights and planets among them have a row even with no aspect drawn (review 3 Oct, C7). */
  shown?: readonly string[];
  ctx: WheelFocusCtx;
  selection: SelectionStore;
  onSelect: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const pinned = useSyncExternalStore(selection.subscribe, selection.get, () => null);
  // What the wheel lights on hover is marked on the cells directly
  // (data-hover-lit), without re-rendering the grid on every hover change.
  // A pin still renders through React (data-lit) and wins over a hover.
  const gridRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef(ctx);
  const paintHover = useRef<() => void>(() => {});
  useEffect(() => {
    ctxRef.current = ctx;
  });
  useEffect(() => {
    let chart = currentChartHover();
    let preview = currentChartPreview();
    const paint = () => {
      const el = gridRef.current;
      if (!el) return;
      for (const cell of el.querySelectorAll("[data-hover-lit]")) cell.removeAttribute("data-hover-lit");
      const id = selection.get() ? null : (chart ?? preview);
      const focus = id ? resolveWheelFocus(id, ctxRef.current) : null;
      if (!focus?.id) {
        el.removeAttribute("data-hover-focus");
        return;
      }
      el.setAttribute("data-hover-focus", "");
      for (const cell of el.querySelectorAll<HTMLElement>("[data-aspect]")) {
        if (focus.aspects?.has(cell.dataset.aspect ?? "")) cell.setAttribute("data-hover-lit", "");
      }
      for (const cell of el.querySelectorAll<HTMLElement>("[data-body]")) {
        if (focus.bodies?.has((cell.dataset.body ?? "") as BodyId)) cell.setAttribute("data-hover-lit", "");
      }
    };
    paintHover.current = paint;
    paint();
    const offHover = onChartHover((id) => {
      chart = id;
      paint();
    });
    const offPreview = onChartPreview((id) => {
      preview = id;
      paint();
    });
    const offSelection = selection.subscribe(paint);
    return () => {
      offHover();
      offPreview();
      offSelection();
      paintHover.current = () => {};
    };
  }, [selection]);
  // Cells re-created by a render (new rows, a new chart) get their hover marks back.
  useLayoutEffect(() => {
    paintHover.current();
  });
  const bodies = useMemo(() => {
    const seen = new Set<BodyId>();
    for (const id of shown) if (ORDER.includes(id)) seen.add(id as BodyId);
    for (const r of rows) {
      seen.add(r.a);
      seen.add(r.b);
    }
    const rank = (id: string) => {
      const k = ORDER.indexOf(id);
      return k < 0 ? ORDER.length : k;
    };
    return [...seen].sort((x, y) => rank(x) - rank(y));
  }, [rows, shown]);
  const byPair = useMemo(() => {
    const m = new Map<string, GridRow>();
    for (const r of rows) {
      m.set(`${r.a}|${r.b}`, r);
      m.set(`${r.b}|${r.a}`, r);
    }
    return m;
  }, [rows]);
  const counts = useMemo(() => {
    const m = new Map<BodyId, number>();
    for (const r of rows) {
      m.set(r.a, (m.get(r.a) ?? 0) + 1);
      m.set(r.b, (m.get(r.b) ?? 0) + 1);
    }
    return m;
  }, [rows]);
  const focus = useMemo(() => (pinned ? resolveWheelFocus(pinned, ctx) : null), [pinned, ctx]);
  if (bodies.length < 2 || bodies.length > 16) return null;
  const n = bodies.length;
  return (
    <div
      ref={gridRef}
      className="ob-wgrid"
      role="group"
      aria-label={t("tableGrid")}
      data-testid="wheel-aspect-grid"
      data-focus={focus?.id ? "" : undefined}
      data-chart-pick
      style={{ ["--n" as string]: n, gridTemplateColumns: `repeat(${n}, var(--cell))` }}
    >
      {bodies.map((row, r) =>
        bodies.map((col, c) => {
          const key = `${row}|${col}`;
          if (c > r) return <span key={key} className="ob-wgrid-cell" data-empty aria-hidden="true" />;
          if (c === r) {
            const lit = focus?.bodies?.has(row) ? "1" : undefined;
            return (
              <span key={key} className="ob-wgrid-cell ob-wgrid-diag" data-lit={lit} data-body={row} title={`${bodyLabel(row, locale)} · ${counts.get(row) ?? 0}`}>
                <PlanetGlyph id={row} size={14} />
                <span className="ob-wgrid-count" aria-hidden="true">
                  {counts.get(row) ?? 0}
                </span>
              </span>
            );
          }
          const a = byPair.get(key);
          if (!a) return <span key={key} className="ob-wgrid-cell" data-empty aria-hidden="true" />;
          const lit = focus?.aspects?.has(a.aspect) ? "1" : undefined;
          const label = `${bodyLabel(a.a, locale)} ${aspectName(a.type, locale)} ${bodyLabel(a.b, locale)}, ${formatArc(a.orb)}`;
          return (
            <button
              key={key}
              type="button"
              className="ob-wgrid-cell"
              data-lit={lit}
              data-aspect={a.aspect}
              data-type={a.type}
              style={{ color: lineInk(ASPECT_COLOR[a.type]) }}
              aria-label={label}
              title={label}
              onClick={() => onSelect(a.id)}
              {...previewProps(a.id)}
            >
              <AspectGlyph id={a.type} size={13} />
            </button>
          );
        }),
      )}
    </div>
  );
}
