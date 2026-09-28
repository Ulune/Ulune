import { useId, useRef, useState, type KeyboardEvent } from "react";
import { hdActId, hdColumnRows } from "@/lib/chart/hd-rows";
import type { HdArrow } from "@/lib/chart/hd-variable";
import type { HdLayer, HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { hdArrowTitle, hdBodyLabel, hdGraphText, hdLayerLabel, hdUnknownText, hdVariableText } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { PlanetGlyph } from "./glyphs";

/**
 * One column beside the bodygraph: the 13 bodies of the Design (left, red)
 * or of the Personality (right, ink), each with the gate and line it
 * colours. Pointing at a row outlines its gate on the chart; choosing it
 * opens that body's reading. One Tab stop; the arrows walk the rows. The Sun
 * and North Node rows carry the arrows of Variable (with a birth time);
 * without one, the rows that could differ are marked ~.
 */

/** A small arrow, left or right. */
function ArrowMark({ left }: { left: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path
        d={left ? "M10.5 6H2M5.5 2.5 2 6l3.5 3.5" : "M1.5 6H10M6.5 2.5 10 6l-3.5 3.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function HdColumn({
  chart,
  layer,
  view,
  moment,
  selectedId,
  lit,
  outlined,
  arrows,
  uncertain,
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
  /** This column's arrows of Variable (none without a birth time). */
  arrows: readonly HdArrow[];
  /** Rows that could differ at another hour (no birth time). */
  uncertain: ReadonlySet<string> | null;
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
        <span id={`${uid}-k`} className="ulune-kicker ulune-hd-col-k">
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
          const arrow = arrows.find((a) => a.body === row.body);
          const arrowTitle = arrow
            ? `${hdArrowTitle(locale, arrow)}${arrow.steady ? "" : `. ${hdVariableText(locale, "unsteady")}`}`
            : "";
          const maybe = uncertain?.has(id) ?? false;
          const label = [
            hdGraphText(locale, "rowLabel", { layer: hdLayerLabel(locale, layer), body, gate: row.gate, line: row.line }),
            arrowTitle,
            maybe ? hdUnknownText(locale, "mark") : "",
          ]
            .filter(Boolean)
            .join(". ");
          return (
            <div
              key={id}
              role="option"
              tabIndex={i === at ? 0 : -1}
              aria-selected={selectedId === id}
              aria-label={label}
              data-uncertain={maybe ? "1" : undefined}
              title={maybe ? hdUnknownText(locale, "mark") : undefined}
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
              <span
                className="ulune-hd-row-arrow"
                data-testid={arrow ? `hd-arrow-${arrow.id}` : undefined}
                data-dir={arrow ? (arrow.left ? "left" : "right") : undefined}
                data-steady={arrow ? (arrow.steady ? "1" : "0") : undefined}
                title={arrowTitle || undefined}
                aria-hidden
              >
                {arrow ? <ArrowMark left={arrow.left} /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
