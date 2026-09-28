import { useId, useRef, useState, type KeyboardEvent } from "react";
import { hdActId, hdColumnRows } from "@/lib/chart/hd-rows";
import type { HdLayer, HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { hdBodyLabel, hdGraphText, hdLayerLabel } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { PlanetGlyph } from "./glyphs";

/**
 * One column beside the bodygraph: the 13 bodies of the Design (left, red)
 * or of the Personality (right, ink), each with the gate and line it
 * colours. Pointing at a row outlines its gate on the chart; choosing it
 * opens that body's reading. One Tab stop; the arrows walk the rows.
 */
export function HdColumn({
  chart,
  layer,
  view,
  moment,
  selectedId,
  lit,
  outlined,
  onPoint,
  onPick,
}: {
  chart: HumanDesignChart;
  layer: HdLayer;
  view: HdView;
  /** When the column was taken (hdMomentLabel). */
  moment: string;
  selectedId: string | null;
  /** Rows kept bright by the chosen piece (act ids); empty when nothing is chosen. */
  lit: ReadonlySet<string> | null;
  /** Rows outlined by the pointer (act ids). */
  outlined: ReadonlySet<string> | null;
  onPoint: (id: string | null) => void;
  onPick: (id: string) => void;
}) {
  const { locale } = useI18n();
  const uid = useId();
  const rows = hdColumnRows(chart, layer);
  const [at, setAt] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const dim = view !== "both" && view !== layer;
  const name = hdGraphText(locale, layer === "design" ? "colDesign" : "colPersonality");

  const focusRow = (i: number) => {
    const n = ((i % rows.length) + rows.length) % rows.length;
    setAt(n);
    list.current?.querySelectorAll<HTMLElement>("[role=option]")[n]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !rows.length) return;
    let handled = true;
    if (e.key === "ArrowDown") focusRow(at + 1);
    else if (e.key === "ArrowUp") focusRow(at - 1);
    else if (e.key === "Home") focusRow(0);
    else if (e.key === "End") focusRow(rows.length - 1);
    else if (e.key === "Enter" || e.key === " ") {
      const row = rows[at];
      if (row) onPick(hdActId(layer, row.body));
    } else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <section
      className="ulune-hd-col"
      data-layer={layer}
      data-dim={dim ? "1" : undefined}
      data-testid={`hd-col-${layer}`}
      aria-labelledby={`${uid}-k`}
    >
      <button
        type="button"
        className="ulune-hd-col-head"
        data-testid={`hd-col-head-${layer}`}
        aria-pressed={selectedId === "hello:layers"}
        onClick={() => onPick("hello:layers")}
      >
        <span id={`${uid}-k`} className="ulune-hd-col-k">
          {name}
        </span>
        {moment ? <span className="ulune-hd-col-when">{moment}</span> : null}
        <span className="ulune-hd-col-line">{hdGraphText(locale, layer === "design" ? "colDesignLine" : "colPersonalityLine")}</span>
      </button>
      <div
        ref={list}
        role="listbox"
        aria-labelledby={`${uid}-k`}
        aria-orientation="vertical"
        className="ulune-hd-rows"
        onKeyDown={onKeyDown}
      >
        {rows.map((row, i) => {
          const id = hdActId(layer, row.body);
          const body = hdBodyLabel(locale, row.body);
          return (
            <div
              key={id}
              role="option"
              tabIndex={i === at ? 0 : -1}
              aria-selected={selectedId === id}
              aria-label={hdGraphText(locale, "rowLabel", { layer: hdLayerLabel(locale, layer), body, gate: row.gate, line: row.line })}
              data-testid={`hd-row-${layer}-${row.body}`}
              data-act={id}
              data-gate={row.gate}
              data-lit={lit?.has(id) ? "1" : undefined}
              data-hero={selectedId === id ? "1" : undefined}
              data-hover={outlined?.has(id) ? "1" : undefined}
              className="ulune-hd-row"
              onClick={() => {
                setAt(i);
                onPick(id);
              }}
              onPointerEnter={(e) => {
                if (e.pointerType !== "touch") onPoint(id);
              }}
              onPointerLeave={() => onPoint(null)}
              onFocus={() => {
                setAt(i);
                onPoint(id);
              }}
              onBlur={() => onPoint(null)}
            >
              <span className="ulune-hd-row-name">{body}</span>
              <span className="ulune-hd-row-gl">
                {row.gate}.{row.line}
              </span>
              <span className="ulune-hd-row-glyph" aria-hidden>
                <PlanetGlyph id={row.body} size={15} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
