import type { CSSProperties, ReactNode } from "react";
import { AspectGlyph, PlanetGlyph, SignGlyph } from "@/components/glyphs";
import type { CrossAspectRow } from "@/lib/chart/cross-table";
import { crossPhrase, exactWhen, type ExactKind, type SideOf } from "@/lib/chart/cross-export";
import { allowedText } from "@/lib/chart/table-aspects";
import { phaseWord, type Cell } from "@/lib/chart/table-cells";
import type { AspectLink, SignId } from "@/lib/chart/types";
import { aspectName, bodyBare, bodyLabel, signName } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { aspectsWord, gridWord, modesWord } from "@/lib/i18n/table-ui";
import { previewProps } from "@/lib/depth/preview-bus";
import { cn, formatArc } from "@/lib/utils";
import { DataTable } from "@/studio/tables/DataTable";
import "@/studio/modes/styles/tables.css";

/** A check box with its words, in a part's tools. */
export function ToolCheck({ checked, onChange, testId, children }: { checked: boolean; onChange: (on: boolean) => void; testId: string; children: ReactNode }) {
  return (
    <label className="ulune-tool-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      {children}
    </label>
  );
}

/** A value that hangs on an unknown birth time: ~ before it, dimmed (as in the chart table). */
export function Maybe({ cell, mono = false, className }: { cell: Cell; mono?: boolean; className?: string }) {
  return (
    <span className={cn(mono && "font-mono", cell.uncertain && "ulune-uncertain", className)}>
      {cell.uncertain ? "~" : ""}
      {cell.text}
    </span>
  );
}

export function UnknownNote({ children }: { children: ReactNode }) {
  return <p className="ulune-unknown-note">{children}</p>;
}

/** A position: "24°03'00"" and the sign's glyph and name. */
export function Position({ cell, sign }: { cell: Cell; sign: SignId }) {
  const { locale } = useI18n();
  return (
    <span className="whitespace-nowrap">
      <Maybe cell={cell} mono />{" "}
      <span className="inline-flex items-center gap-1.5 align-[-1px]">
        <SignGlyph id={sign} size={12} />
        {signName(sign, locale)}
      </span>
    </span>
  );
}

/** A body's glyph and name. */
export function Body({ id, size = 14 }: { id: string; size?: number }) {
  const { locale } = useI18n();
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-5 shrink-0 place-items-center text-fg">
        <PlanetGlyph id={id} size={size} />
      </span>
      {bodyBare(id, locale)}
    </span>
  );
}

/** One column of the aspects table: its key (for tests and styles) and its words. */
type Column = { key: string; label: string };

/**
 * The aspects between two charts (a moving sky and the birth chart, or two
 * birth charts): who, the aspect, whom, the orb beside the orb allowed with
 * a strength bar, applying or separating, and for a moving sky when it is
 * exact. A row opens its reading; an aspect to one end of an axis has its
 * mirror under it.
 */
export function CrossAspects({
  rows,
  columns,
  sides,
  exact,
  selectPrefix,
  rowTestId,
  rowData,
  movingNote,
  colTestPrefix,
  empty,
  selectedId,
  onSelect,
}: {
  rows: CrossAspectRow[];
  /** The words of the first and third columns ("Transit", "Natal"; the two names). */
  columns: { a: Column; b: Column };
  /** Who each end is, in the mirror's words. */
  sides: { a: SideOf; b: SideOf };
  exact?: ExactKind;
  selectPrefix: string;
  rowTestId: (link: AspectLink) => string;
  rowData?: (link: AspectLink) => Record<string, string | undefined>;
  /** Under the first body: how it moves (retrograde, stationary). */
  movingNote?: (link: AspectLink) => string;
  colTestPrefix: string;
  empty: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  if (!rows.length) {
    return (
      <p className="text-sm text-fg-muted" data-testid={`${colTestPrefix}-empty`}>
        {empty}
      </p>
    );
  }
  const cols: Column[] = [
    columns.a,
    { key: "aspect", label: aspectsWord(locale, "aspect") },
    columns.b,
    { key: "orb", label: aspectsWord(locale, "orb") },
    { key: "phase", label: aspectsWord(locale, "phase") },
    ...(exact ? [{ key: "exact", label: modesWord(locale, "exact") }] : []),
  ];
  const when = (r: CrossAspectRow): ReactNode => {
    if (!exact) return null;
    if (exact.pending) {
      return (
        <span className="text-fg-subtle" title={modesWord(locale, "pending")}>
          …
        </span>
      );
    }
    const when = exactWhen(r.link.exactUtc, exact, locale);
    if (!when) return <span className="text-fg-subtle" title={modesWord(locale, "notFound")}>—</span>;
    return <Maybe cell={{ text: when, uncertain: r.exactUncertain }} />;
  };
  return (
    <DataTable className="ulune-aspects ulune-cross" stickyFirst={false}>
      <thead>
        <tr data-testid={`${colTestPrefix}-cols`}>
          {cols.map((c) => (
            <th key={c.key} data-col={c.key} data-testid={`${colTestPrefix}-col-${c.key}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const l = r.link;
          const id = `${selectPrefix}${l.id}`;
          const on = selectedId === id;
          const note = movingNote?.(l);
          return (
            <tr
              key={l.id}
              {...previewProps(id)}
              {...(rowData?.(l) ?? {})}
              data-testid={rowTestId(l)}
              data-orb={String(r.orb)}
              data-selected={on ? "1" : undefined}
              data-uncertain={r.uncertain ? "1" : undefined}
              className="cursor-pointer"
              onClick={() => onSelect(id)}
            >
              <td data-col={columns.a.key}>
                <button type="button" className="ulune-row-pick" aria-pressed={on}>
                  <span className={cn(r.uncertain && "ulune-uncertain")}>{r.uncertain ? "~" : ""}</span>
                  <Body id={l.a} />
                </button>
                {note ? <span className="ulune-cell-sub">{note}</span> : null}
              </td>
              <td data-col="aspect">
                <span className="inline-flex items-center gap-1.5">
                  <AspectGlyph id={l.type} size={15} />
                  {aspectName(l.type, locale)}
                </span>
                {r.twins.length ? (
                  <span className="ulune-cell-sub" data-testid="aspect-mirror">
                    {aspectsWord(locale, "also", { list: r.twins.map((t) => crossPhrase(t, sides.a, sides.b, locale)).join(", ") })}
                  </span>
                ) : null}
              </td>
              <td data-col={columns.b.key}>
                <Body id={l.b} />
              </td>
              <td data-col="orb">
                <span className="whitespace-nowrap">
                  <span className="font-mono">{formatArc(r.orb)}</span>{" "}
                  <span className="ulune-orb-of">{aspectsWord(locale, "ofAllowed", { allowed: allowedText(r.allowed) })}</span>
                </span>
                <span className="ulune-strength" aria-hidden>
                  <span style={{ width: `${Math.round(r.strength * 100)}%` }} />
                </span>
              </td>
              <td data-col="phase" data-applying={l.applying === true ? "1" : l.applying === false ? "0" : ""}>
                {phaseWord(l.applying, locale)}
              </td>
              {exact ? (
                <td data-col="exact" data-exact={l.id} className="whitespace-nowrap" aria-busy={exact.pending ? true : undefined}>
                  {when(r)}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

/**
 * Two charts' bodies against each other in a grid: rows one chart, columns
 * the other, each cell the aspect with its orb and A or S. A cell opens its
 * reading.
 */
export function CrossGrid({
  links,
  rowIds,
  colIds,
  selectPrefix,
  uncertain,
  axes,
  label,
  selectedId,
  onSelect,
}: {
  links: readonly AspectLink[];
  rowIds: readonly string[];
  colIds: readonly string[];
  selectPrefix: string;
  uncertain: (link: AspectLink) => boolean;
  /** "Rows: the transits · columns: your chart". */
  axes: string;
  label: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const byPair = new Map<string, AspectLink>();
  for (const l of links) byPair.set(`${l.a}|${l.b}`, l);
  const orbParts = (orb: number) => {
    const text = formatArc(orb);
    return { main: text.replace(/'$/, ""), min: text.endsWith("'") ? "'" : "" };
  };
  const letter = (applying: boolean | null) =>
    applying === true ? gridWord(locale, "applyingShort") : applying === false ? gridWord(locale, "separatingShort") : "";
  return (
    <>
      <div className="ob-agrid-wrap" data-testid="cross-grid">
        <table className="ob-agrid ob-agrid-cross" aria-label={label} style={{ "--agrid-n": colIds.length + 1 } as CSSProperties}>
          <thead>
            <tr>
              <td className="ob-agrid-corner" />
              {colIds.map((c) => (
                <th key={c} scope="col" className="ob-agrid-diag" title={bodyLabel(c, locale)}>
                  <PlanetGlyph id={c} size={16} />
                  <span className="sr-only">{bodyLabel(c, locale)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowIds.map((r) => (
              <tr key={r}>
                <th scope="row" className="ob-agrid-diag" title={bodyLabel(r, locale)}>
                  <PlanetGlyph id={r} size={16} />
                  <span className="sr-only">{bodyLabel(r, locale)}</span>
                </th>
                {colIds.map((c) => {
                  const l = byPair.get(`${r}|${c}`);
                  if (!l) return <td key={c} />;
                  const id = `${selectPrefix}${l.id}`;
                  const maybe = uncertain(l) ? "~" : "";
                  const orb = orbParts(l.orb);
                  const as = letter(l.applying);
                  const phase = l.applying === true ? t("applying") : l.applying === false ? t("separating") : "";
                  return (
                    <td key={c} data-on={selectedId === id ? "1" : undefined} data-level={l.level} data-uncertain={maybe ? "1" : undefined}>
                      <button
                        type="button"
                        onClick={() => onSelect(id)}
                        {...previewProps(id)}
                        aria-label={`${maybe}${bodyLabel(l.a, locale)} ${aspectName(l.type, locale)} ${bodyLabel(l.b, locale)}, ${formatArc(l.orb)}${phase ? `, ${phase}` : ""}`}
                        title={`${maybe}${aspectName(l.type, locale)} · ${formatArc(l.orb)}${phase ? ` · ${phase}` : ""}`}
                      >
                        <AspectGlyph id={l.type} size={17} />
                        <span className="ob-agrid-orb" aria-hidden>
                          {maybe}
                          {orb.main}
                          <span className="ob-agrid-wide">{orb.min}</span>
                          {as ? <span className="ob-agrid-wide ob-agrid-as"> {as}</span> : null}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ob-agrid-legend" data-testid="cross-grid-legend">
        {axes} · {gridWord(locale, "legendPhase")}
      </p>
    </>
  );
}
