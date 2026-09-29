import { ChevronRight, Copy, Download } from "lucide-react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AspectGlyph, PlanetGlyph, SignGlyph } from "@/components/glyphs";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { hydratePatterns } from "@/lib/chart/patterns";
import { aspectHolds } from "@/lib/chart/day-checks";
import {
  aspectPhrase,
  aspectTableRows,
  DEFAULT_ASPECT_OPTIONS,
  parallelPhrase,
  parallelRows,
  parallelsOf,
  PARALLEL_ORB,
  allowedText,
  type AspectOptions,
  type AspectSort,
} from "@/lib/chart/table-aspects";
import {
  balanceGroups,
  cellText,
  chartFacts,
  groupedPoints,
  patternSections,
  pointRow,
  pointSelectId,
  rankingFacts,
  weightText,
  type BalanceGroup,
  type Cell,
} from "@/lib/chart/table-cells";
import { chartTextParts, formatChartTableCsv, formatChartTableText, type ChartTextPartId } from "@/lib/chart/table-export";
import { houseRows, interceptedText, twoCuspsText } from "@/lib/chart/table-houses";
import type { ChartPatterns, NatalChart } from "@/lib/chart/types";
import { aspectName, bodyBare, bodyLabel, houseName, signName } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import {
  aspectsWord,
  gridWord,
  housesWord,
  pointsGroupLabel,
  pointsText,
  tablePartHint,
  tablePartLabel,
  unknownTimeNote,
  type TablePartId,
} from "@/lib/i18n/table-ui";
import { cn, formatArc, formatSignedDms, formatSignedDmsSeconds } from "@/lib/utils";
import { DataTable } from "@/studio/tables/DataTable";
import { TablePage, type TablePart } from "@/studio/tables/TablePage";
import { ParallelGlyph } from "@/studio/tables/table-glyphs";
import { toast } from "@/lib/toast";
import { previewProps } from "@/lib/depth/preview-bus";

/** The parts of the natal table, in reading order. */
const PARTS: TablePartId[] = ["identity", "points", "houses", "aspects", "grid", "patterns", "balance", "ranking"];

/** A value that hangs on an unknown birth time: ~ before it, dimmed. */
function Maybe({ cell, mono = false, className }: { cell: Cell; mono?: boolean; className?: string }) {
  return (
    <span className={cn(mono && "font-mono", cell.uncertain && "ulune-uncertain", className)}>
      {cell.uncertain ? "~" : ""}
      {cell.text}
    </span>
  );
}

function UnknownNote({ children }: { children: ReactNode }) {
  return <p className="ulune-unknown-note">{children}</p>;
}

export function NatalTable({
  chart,
  selectedId = null,
  onSelect,
}: {
  chart: NatalChart;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const patterns = useMemo(() => hydratePatterns(chart), [chart]);

  function downloadCsv() {
    const csv = formatChartTableCsv(chart, locale);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chart.meta.name.replace(/\s+/g, "-").toLowerCase() || "natal"}-table.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyText() {
    const text = formatChartTableText(chart, locale);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast(t("tableCopied"));
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const actions = (
    <>
      <button type="button" className="ob-table-export-btn" data-testid="table-copy" onClick={() => void copyText()}>
        <Copy className="size-3.5" aria-hidden />
        <span className="ulune-tbar-act-label" aria-live="polite">
          {copied ? t("tableCopied") : t("tableCopy")}
        </span>
      </button>
      <button type="button" className="ob-table-export-btn" data-testid="table-csv" onClick={downloadCsv}>
        <Download className="size-3.5" aria-hidden />
        <span className="ulune-tbar-act-label">{t("tableExportCsv")}</span>
      </button>
    </>
  );

  const textOf = (id: ChartTextPartId) => () =>
    chartTextParts(chart, locale)
      .find((p) => p.id === id)
      ?.lines.join("\n") ?? "";

  const content: Record<TablePartId, ReactNode> = {
    identity: <IdentityPart chart={chart} patterns={patterns} />,
    points: <PointsPart chart={chart} patterns={patterns} selectedId={selectedId} onSelect={onSelect} />,
    houses: <HousesPart chart={chart} selectedId={selectedId} onSelect={onSelect} />,
    aspects: <AspectsPart chart={chart} selectedId={selectedId} onSelect={onSelect} />,
    grid: <AspectGrid chart={chart} selectedId={selectedId} onSelect={onSelect} />,
    patterns: <PatternsPart chart={chart} patterns={patterns} onSelect={onSelect} />,
    balance: <BalancePart chart={chart} patterns={patterns} />,
    ranking: <RankingPart chart={chart} patterns={patterns} onSelect={onSelect} />,
  };

  const parts: TablePart[] = PARTS.map((id) => ({
    id,
    label: tablePartLabel(locale, id),
    hint: tablePartHint(locale, id),
    copyText: id === "grid" ? undefined : textOf(id),
    children: content[id],
  }));

  return (
    <div data-testid="studio-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="natal" label={t("tableSections")} parts={parts} actions={actions} />
    </div>
  );
}

function IdentityPart({ chart, patterns }: { chart: NatalChart; patterns: ChartPatterns }) {
  const { locale } = useI18n();
  const facts = chartFacts(chart, patterns.isDay, locale);
  return (
    <dl
      className="grid gap-x-[var(--space-5)] gap-y-[var(--space-3)] sm:grid-cols-2"
      data-unknown={chart.meta.timeUnknown === true ? "1" : undefined}
    >
      {facts.map((f) => (
        <div key={f.id} data-fact={f.id}>
          <dt className="ulune-kicker text-fg-muted">{f.label}</dt>
          <dd className="mt-1 text-fg" data-testid={`table-fact-${f.id}`}>
            <span className={cn(f.mono && "font-mono text-sm", f.uncertain && "ulune-uncertain")}>
              {f.uncertain ? "~" : ""}
              {f.value}
            </span>
            {f.note ? <span className="text-sm"> · {f.note}</span> : null}
            {f.detail ? (
              <span className={cn("mt-0.5 block text-xs text-fg-muted", f.detailMono && "font-mono")}>{f.detail}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PointsPart({
  chart,
  patterns,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  patterns: ChartPatterns;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const groups = useMemo(
    () => groupedPoints(chart).map((g) => ({ id: g.id, rows: g.rows.map((p) => pointRow(p, chart, patterns, locale)) })),
    [chart, patterns, locale],
  );
  return (
    <>
      {unknown ? <UnknownNote>{pointsText(locale, "needsTime")}</UnknownNote> : null}
      <DataTable className="ulune-points" stickyFirst={false}>
        <thead>
          <tr>
            <th data-col="body">{pointsText(locale, "body")}</th>
            <th data-col="position">{pointsText(locale, "position")}</th>
            <th data-col="house">{pointsText(locale, "house")}</th>
            <th data-col="motion">{pointsText(locale, "motion")}</th>
            <th data-col="latitude">{pointsText(locale, "latitude")}</th>
            <th data-col="declination">{pointsText(locale, "declination")}</th>
            <th data-col="dignity">{pointsText(locale, "dignity")}</th>
            <th data-col="notes">{pointsText(locale, "notes")}</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.id} data-group={g.id}>
            <tr className="ulune-group-row">
              <th colSpan={8} scope="colgroup" data-testid={`points-group-${g.id}`}>
                {pointsGroupLabel(locale, g.id)}
              </th>
            </tr>
            {g.rows.map((r) => {
              const p = r.point;
              const id = pointSelectId(p.id);
              const on = selectedId === id;
              return (
                <tr
                  key={p.id}
                  data-body={p.id}
                  data-selected={on ? "1" : undefined}
                  data-uncertain={r.uncertain ? "1" : undefined}
                  className={cn(onSelect && "cursor-pointer", on && "bg-bg-subtle")}
                  onClick={() => onSelect?.(id)}
                  {...previewProps(id)}
                >
                  <td data-col="body">
                    <button type="button" className="ulune-row-pick" aria-pressed={on}>
                      <span className="grid size-5 place-items-center text-fg">
                        <PlanetGlyph id={p.id} size={14} />
                      </span>
                      {r.name}
                    </button>
                  </td>
                  <td data-col="position">
                    <span className="whitespace-nowrap">
                      <Maybe cell={r.position} mono />{" "}
                      <span className="inline-flex items-center gap-1.5 align-[-1px]">
                        <SignGlyph id={p.sign} size={12} />
                        {r.sign}
                      </span>
                    </span>
                    {r.range ? (
                      <span className="ulune-cell-sub" data-testid={`range-${p.id}`}>
                        {r.range}
                      </span>
                    ) : null}
                  </td>
                  <td data-col="house" className="ulune-house-num tabular-nums">
                    <Maybe cell={r.house} mono />
                  </td>
                  <td data-col="motion">
                    {r.motion ? (
                      <>
                        <span className="font-mono">{r.motion.speed}</span>
                        {r.motion.words.length ? (
                          <span className="ulune-cell-sub ulune-cell-words">{r.motion.words.join(" · ")}</span>
                        ) : null}
                        {r.motion.station ? (
                          <span className="ulune-cell-sub" data-testid={`station-${p.id}`}>
                            {r.motion.station}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </td>
                  <td data-col="latitude" className="whitespace-nowrap">
                    {r.latitude ? <Maybe cell={r.latitude} mono /> : null}
                  </td>
                  <td data-col="declination">
                    {r.declination ? <Maybe cell={r.declination} mono /> : null}
                    {r.oob ? <Maybe cell={r.oob} className="ulune-cell-sub" /> : null}
                    {r.latitude ? (
                      <span className="ulune-lat-inline">
                        {pointsText(locale, "latShort")} <Maybe cell={r.latitude} mono />
                      </span>
                    ) : null}
                  </td>
                  <td data-col="dignity">
                    {r.dignity ? (
                      <span className={cn(r.dignity.uncertain && "ulune-uncertain")} data-testid={`dignity-${p.id}`}>
                        <span className="ulune-score font-mono">
                          {r.dignity.uncertain ? "~" : ""}
                          {r.dignity.scoreText}
                        </span>
                        <span className="ulune-cell-sub">{r.dignity.words.join(" · ")}</span>
                      </span>
                    ) : null}
                  </td>
                  <td data-col="notes">
                    {r.notes.map((n) => (
                      <Maybe key={n.text} cell={n} className="ulune-note" />
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </DataTable>
    </>
  );
}

/** A body's glyph as a button that chooses it (in a cell that belongs to a row of its own). */
function GlyphPick({ id, onSelect, size = 14 }: { id: string; onSelect?: (id: string) => void; size?: number }) {
  const { locale } = useI18n();
  const pick = pointSelectId(id);
  const name = bodyLabel(id, locale);
  if (!onSelect) {
    return (
      <span className="ulune-glyph-pick" title={name} data-body={id}>
        <PlanetGlyph id={id} size={size} />
        <span className="sr-only">{name}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className="ulune-glyph-pick"
      title={name}
      aria-label={housesWord(locale, "choose", { name })}
      data-body={id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(pick);
      }}
      {...previewProps(pick)}
    >
      <PlanetGlyph id={id} size={size} />
    </button>
  );
}

function HousesPart({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const rows = useMemo(() => houseRows(chart, locale), [chart, locale]);
  return (
    <>
      {unknown ? <UnknownNote>{unknownTimeNote(locale, "houses")}</UnknownNote> : null}
      <DataTable className="ulune-houses" stickyFirst={false}>
        <thead>
          <tr>
            <th data-col="house">{housesWord(locale, "house")}</th>
            <th data-col="cusp">{housesWord(locale, "cusp")}</th>
            <th data-col="size">{housesWord(locale, "size")}</th>
            <th data-col="ruler">{housesWord(locale, "ruler")}</th>
            <th data-col="inside">{housesWord(locale, "inside")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const h = r.cusp;
            const id = `house:${h.id}`;
            const on = selectedId === id;
            return (
              <tr
                key={h.id}
                data-house={h.id}
                data-selected={on ? "1" : undefined}
                data-uncertain={r.uncertain ? "1" : undefined}
                className={cn(onSelect && "cursor-pointer")}
                onClick={() => onSelect?.(id)}
                {...previewProps(id)}
              >
                <td className="ulune-house-id" data-house={h.id} data-col="house">
                  <button type="button" className="ulune-row-pick" aria-pressed={on} aria-label={houseName(h.id, locale)}>
                    <span className="ulune-house-id-n">{h.id}</span>
                  </button>
                </td>
                <td data-col="cusp">
                  <span className="whitespace-nowrap">
                    <Maybe cell={r.position} mono />{" "}
                    <span className="inline-flex items-center gap-1.5 align-[-1px]">
                      <SignGlyph id={r.sign} size={12} />
                      {signName(r.sign, locale)}
                    </span>
                  </span>
                  {r.intercepted.map((sign) => (
                    <span key={sign} className="ulune-cell-sub" data-testid={`intercepted-${h.id}`}>
                      {interceptedText(sign, locale)}
                    </span>
                  ))}
                  {r.twoCusps ? (
                    <span className="ulune-cell-sub" data-testid={`two-cusps-${h.id}`}>
                      {twoCuspsText(r, locale)}
                    </span>
                  ) : null}
                </td>
                <td data-col="size">
                  <Maybe cell={r.size} mono />
                </td>
                <td data-col="ruler">
                  {r.rulers.map((x) => (
                    <span key={x.id} className={cn("ulune-ruler", x.traditional && "is-trad")} data-ruler={x.id}>
                      <GlyphPick id={x.id} onSelect={onSelect} size={13} />
                      <span>
                        {x.text}
                        {x.traditional ? <span className="text-fg-muted"> · {housesWord(locale, "traditional")}</span> : null}
                      </span>
                    </span>
                  ))}
                </td>
                <td data-col="inside">
                  {r.inside.length ? (
                    <span className="ulune-glyph-picks" data-testid={`inside-${h.id}`}>
                      {r.inside.map((b) => (
                        <GlyphPick key={b} id={b} onSelect={onSelect} size={16} />
                      ))}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </>
  );
}

/** A check box with its words, in a part's tools. */
function ToolCheck({ checked, onChange, testId, children }: { checked: boolean; onChange: (on: boolean) => void; testId: string; children: ReactNode }) {
  return (
    <label className="ulune-tool-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      {children}
    </label>
  );
}

/** The aspects' filters and sort, kept for the visit only (in memory, never stored). */
let aspectOptions: AspectOptions = DEFAULT_ASPECT_OPTIONS;

function AspectsPart({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const [opts, setOptsState] = useState<AspectOptions>(aspectOptions);
  const setOpts = (next: AspectOptions) => {
    aspectOptions = next;
    setOptsState(next);
  };
  const { rows, total, shown, folded } = useMemo(() => aspectTableRows(chart, locale, opts), [chart, locale, opts]);
  const parallels = useMemo(() => parallelRows(chart, opts), [chart, opts]);
  const decl = unknown ? formatSignedDms : formatSignedDmsSeconds;
  const count = [
    shown === total ? aspectsWord(locale, "countAll", { total: String(total) }) : aspectsWord(locale, "countSome", { shown: String(shown), total: String(total) }),
    folded === 1 ? aspectsWord(locale, "foldedOne") : folded > 1 ? aspectsWord(locale, "folded", { n: String(folded) }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const sorts: AspectSort[] = ["orb", "body", "aspect"];
  const sortWord = { orb: "sortOrb", body: "sortBody", aspect: "sortAspect" } as const;
  return (
    <>
      {unknown ? <UnknownNote>{unknownTimeNote(locale, "aspects")}</UnknownNote> : null}
      <div className="ulune-part-tools" data-testid="aspects-tools">
        <span className="ulune-tool-sort">
          <span className="ulune-tool-label" aria-hidden>
            {aspectsWord(locale, "sort")}
          </span>
          <SegmentedToggle
            ariaLabel={aspectsWord(locale, "sort")}
            value={opts.sort}
            onChange={(sort) => setOpts({ ...opts, sort })}
            options={sorts.map((id) => ({ value: id, testId: `aspects-sort-${id}`, label: aspectsWord(locale, sortWord[id]) }))}
          />
        </span>
        <ToolCheck checked={opts.minors} onChange={(minors) => setOpts({ ...opts, minors })} testId="aspects-minors">
          {aspectsWord(locale, "minors")}
        </ToolCheck>
        <ToolCheck checked={opts.angles} onChange={(angles) => setOpts({ ...opts, angles })} testId="aspects-angles">
          {aspectsWord(locale, "angles")}
        </ToolCheck>
        <ToolCheck checked={opts.unfold} onChange={(unfold) => setOpts({ ...opts, unfold })} testId="aspects-unfold">
          {aspectsWord(locale, "unfold")}
        </ToolCheck>
      </div>
      <p className="ulune-part-count" data-testid="aspects-count" aria-live="polite">
        {count}
      </p>
      {rows.length ? (
        <DataTable className="ulune-aspects" stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="pair">{aspectsWord(locale, "pair")}</th>
              <th data-col="aspect">{aspectsWord(locale, "aspect")}</th>
              <th data-col="orb">{aspectsWord(locale, "orb")}</th>
              <th data-col="phase">{aspectsWord(locale, "phase")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const a = r.aspect;
              const id = `aspect:${a.id}`;
              const on = selectedId === id;
              const notes = [r.minor ? t("tableAspectMinor") : "", r.outOfSign ? cellText(r.outOfSign) : ""].filter(Boolean);
              return (
                <tr
                  key={a.id}
                  data-aspect={a.id}
                  data-selected={on ? "1" : undefined}
                  data-uncertain={r.uncertain ? "1" : undefined}
                  data-minor={r.minor ? "1" : undefined}
                  data-out-of-sign={r.outOfSign ? "1" : undefined}
                  className={cn(onSelect && "cursor-pointer")}
                  onClick={() => onSelect?.(id)}
                  {...previewProps(id)}
                >
                  <td data-col="pair">
                    <button type="button" className="ulune-row-pick" aria-pressed={on}>
                      <span className={cn("ulune-pair", r.uncertain && "ulune-uncertain")}>
                        {r.uncertain ? "~" : ""}
                        <PlanetGlyph id={a.a} size={13} />
                        {bodyBare(a.a, locale)}
                        <span className="text-fg-subtle" aria-hidden>
                          ·
                        </span>
                        <PlanetGlyph id={a.b} size={13} />
                        {bodyBare(a.b, locale)}
                      </span>
                    </button>
                    {r.twins.length ? (
                      <span className="ulune-cell-sub" data-testid="aspect-mirror">
                        {aspectsWord(locale, "also", { list: r.twins.map((x) => aspectPhrase(x, locale)).join(", ") })}
                      </span>
                    ) : null}
                  </td>
                  <td data-col="aspect">
                    <span className="inline-flex items-center gap-1.5">
                      <AspectGlyph id={a.type} size={15} />
                      {r.type}
                    </span>
                    {notes.length ? <span className="ulune-cell-sub">{notes.join(" · ")}</span> : null}
                  </td>
                  <td data-col="orb">
                    <span className="whitespace-nowrap">
                      <span className="font-mono">{r.orb}</span>{" "}
                      <span className="ulune-orb-of">{aspectsWord(locale, "ofAllowed", { allowed: r.allowed })}</span>
                    </span>
                    <span className="ulune-strength" aria-hidden>
                      <span style={{ width: `${Math.round(r.strength * 100)}%` }} />
                    </span>
                  </td>
                  <td data-col="phase">{r.phase}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <p className="text-sm text-fg-muted" data-testid="aspects-none">
          {aspectsWord(locale, "none")}
        </p>
      )}

      <div className="ulune-subpart" data-testid="table-parallels">
        <h3 className="ulune-subpart-h">{aspectsWord(locale, "parallelsHead")}</h3>
        <p className="ulune-tpart-hint">{aspectsWord(locale, "parallelsHint")}</p>
        {unknown ? <UnknownNote>{aspectsWord(locale, "parallelsUnknown")}</UnknownNote> : null}
        {parallels.length ? (
          <DataTable className="ulune-aspects ulune-parallels" stickyFirst={false}>
            <thead>
              <tr>
                <th data-col="pair">{aspectsWord(locale, "pair")}</th>
                <th data-col="aspect">{aspectsWord(locale, "aspect")}</th>
                <th data-col="orb">{aspectsWord(locale, "orb")}</th>
                <th data-col="declinations">{aspectsWord(locale, "declinations")}</th>
              </tr>
            </thead>
            <tbody>
              {parallels.map((p) => (
                <tr key={p.id} data-parallel={p.id} data-kind={p.kind} data-uncertain={p.uncertain ? "1" : undefined}>
                  <td data-col="pair">
                    <span className={cn("ulune-pair", p.uncertain && "ulune-uncertain")}>
                      {p.uncertain ? "~" : ""}
                      <GlyphPick id={p.a} onSelect={onSelect} size={13} />
                      {bodyBare(p.a, locale)}
                      <span className="text-fg-subtle" aria-hidden>
                        ·
                      </span>
                      <GlyphPick id={p.b} onSelect={onSelect} size={13} />
                      {bodyBare(p.b, locale)}
                    </span>
                    {p.twins.length ? (
                      <span className="ulune-cell-sub" data-testid="parallel-mirror">
                        {aspectsWord(locale, "also", { list: p.twins.map((x) => parallelPhrase(x, locale)).join(", ") })}
                      </span>
                    ) : null}
                  </td>
                  <td data-col="aspect">
                    <span className="inline-flex items-center gap-1.5">
                      <ParallelGlyph kind={p.kind} size={13} />
                      {aspectsWord(locale, p.kind === "parallel" ? "parallelTitle" : "contraTitle")}
                    </span>
                  </td>
                  <td data-col="orb">
                    <span className="whitespace-nowrap">
                      <span className="font-mono">{formatArc(p.orb)}</span>{" "}
                      <span className="ulune-orb-of">{aspectsWord(locale, "ofAllowed", { allowed: allowedText(PARALLEL_ORB) })}</span>
                    </span>
                    <span className="ulune-strength" aria-hidden>
                      <span style={{ width: `${Math.round((1 - p.orb / PARALLEL_ORB) * 100)}%` }} />
                    </span>
                  </td>
                  <td data-col="declinations" className="font-mono whitespace-nowrap">
                    {decl(p.declA)} / {decl(p.declB)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-sm text-fg-muted" data-testid="parallels-none">
            {aspectsWord(locale, "noParallels")}
          </p>
        )}
      </div>
    </>
  );
}

function PatternsPart({
  chart,
  patterns,
  onSelect,
}: {
  chart: NatalChart;
  patterns: ChartPatterns;
  onSelect?: (id: string) => void;
}) {
  const { locale } = useI18n();
  const sections = patternSections(chart, patterns, locale);
  const unknown = chart.meta.timeUnknown === true;
  return (
    <>
      {unknown ? <UnknownNote>{unknownTimeNote(locale, "patterns")}</UnknownNote> : null}
      <div className="grid gap-[var(--space-4)]">
        {sections.map((s) => (
          <div key={s.id} data-pattern={s.id}>
            <h3 className="ulune-kicker text-fg-muted">{s.title}</h3>
            {s.items.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">{s.none}</p>
            ) : s.items.some((i) => i.pick) ? (
              <ul className="mt-2 grid gap-2">
                {s.items.map((item) => (
                  <li key={item.text}>
                    <PickRow onClick={onSelect && item.pick ? () => onSelect(item.pick!) : undefined}>
                      <Maybe cell={item} />
                    </PickRow>
                  </li>
                ))}
              </ul>
            ) : (
              s.items.map((item) => (
                <p key={item.text} className="mt-2 text-sm text-fg">
                  <Maybe cell={item} />
                </p>
              ))
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function BalancePart({ chart, patterns }: { chart: NatalChart; patterns: ChartPatterns }) {
  const { locale } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const groups = balanceGroups(chart, patterns, locale);
  return (
    <>
      {unknown ? <UnknownNote>{unknownTimeNote(locale, "balance")}</UnknownNote> : null}
      <div className="ob-balance-grid" data-unknown={unknown ? "1" : undefined}>
        {groups.map((g) => (
          <BarGroup key={g.id} group={g} />
        ))}
      </div>
    </>
  );
}

function RankingPart({
  chart,
  patterns,
  onSelect,
}: {
  chart: NatalChart;
  patterns: ChartPatterns;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const facts = rankingFacts(chart, patterns, locale);
  return (
    <>
      {unknown ? <UnknownNote>{unknownTimeNote(locale, "ranking")}</UnknownNote> : null}
      <dl className="grid gap-[var(--space-4)]">
        <div>
          <dt className="ulune-kicker text-fg-muted">{t("chartRulerHead")}</dt>
          <dd className="mt-2 text-sm text-fg">
            {facts.ruler ? <Maybe cell={facts.ruler} /> : t("flagNo")}
            {facts.ruler?.aspects ? <span className="mt-1 block text-fg-muted">{facts.ruler.aspects}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="ulune-kicker text-fg-muted">{t("tightestHead")}</dt>
          <dd className="mt-2 text-sm text-fg">{facts.tightest ? <Maybe cell={facts.tightest} /> : t("flagNo")}</dd>
        </div>
        <div>
          <dt className="ulune-kicker text-fg-muted">{t("rankingHead")}</dt>
          <dd className="mt-2">
            <ol className="grid gap-1">
              {facts.rows.map((row, i) => (
                <li key={row.id}>
                  <PickRow onClick={onSelect ? () => onSelect(pointSelectId(row.id)) : undefined}>
                    {i + 1}. <Maybe cell={row} />
                  </PickRow>
                </li>
              ))}
            </ol>
          </dd>
        </div>
        <div>
          <dt className="ulune-kicker text-fg-muted">{t("dominantHead")}</dt>
          <dd className="mt-2 text-sm text-fg">
            <Maybe cell={facts.dominant} />
          </dd>
        </div>
      </dl>
    </>
  );
}

function PickRow({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  if (!onClick) return <span className="block py-1 text-sm text-fg">{children}</span>;
  return (
    <button type="button" className="ob-pick-row" onClick={onClick}>
      <span>{children}</span>
      <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
    </button>
  );
}

function BarGroup({ group }: { group: BalanceGroup }) {
  const max = Math.max(1e-6, ...group.rows.map((r) => r.value));
  return (
    <div className="ob-bal" role="group" aria-label={group.title} data-group={group.id} data-uncertain={group.uncertain ? "1" : undefined}>
      <p className="ob-rc-h">
        {group.uncertain ? "~" : ""}
        {group.title}
      </p>
      <ul className="ob-bal-rows">
        {group.rows.map((r) => (
          <li key={r.id} className="ob-bal-row" aria-label={`${r.label}: ${weightText(r.value)}`}>
            <span className="ob-bal-label">{r.label}</span>
            <span className="ob-bal-track" aria-hidden>
              <span
                className="ob-bal-fill"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "var(--color-fg-muted)" }}
              />
            </span>
            <span className="ob-bal-n">{weightText(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The classic triangular aspectarian: one cell per pair with its orb and A
 * (applying) or S (separating); tap to read it. The switch fills the other
 * triangle with the parallels and contra-parallels.
 */
function AspectGrid({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const [showParallels, setShowParallels] = useState(false);
  const CORE = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode"];
  const ids = [
    ...chart.planets.filter((p) => CORE.includes(p.id)).map((p) => p.id as string),
    ...(["ascendant", "midheaven"] as const).filter((a) => chart.angles[a]),
  ];
  const byPair = new Map<string, NatalChart["aspects"][number]>();
  for (const a of chart.aspects) {
    byPair.set(`${a.a}|${a.b}`, a);
    byPair.set(`${a.b}|${a.a}`, a);
  }
  const parallels = useMemo(() => {
    const m = new Map<string, ReturnType<typeof parallelsOf>[number]>();
    if (!showParallels) return m;
    for (const p of parallelsOf(chart)) {
      m.set(`${p.a}|${p.b}`, p);
      m.set(`${p.b}|${p.a}`, p);
    }
    return m;
  }, [chart, showParallels]);
  const phaseLetter = (applying: boolean | null) =>
    applying === true ? gridWord(locale, "applyingShort") : applying === false ? gridWord(locale, "separatingShort") : "";
  const orbParts = (orb: number) => {
    const text = formatArc(orb);
    return { main: text.replace(/'$/, ""), min: text.endsWith("'") ? "'" : "" };
  };
  return (
    <>
      <div className="ulune-part-tools">
        <ToolCheck checked={showParallels} onChange={setShowParallels} testId="grid-parallels">
          {gridWord(locale, "parallels")}
        </ToolCheck>
      </div>
      <div className="ob-agrid-wrap" data-testid="aspect-grid">
        <table
          className="ob-agrid"
          aria-label={t("tableGrid")}
          data-parallels={showParallels ? "1" : undefined}
          style={{ "--agrid-n": ids.length } as CSSProperties}
        >
          <tbody>
            {ids.map((row, r) => (
              <tr key={row}>
                {ids.slice(0, r).map((col) => {
                  const a = byPair.get(`${row}|${col}`);
                  if (!a) return <td key={col} />;
                  const id = `aspect:${a.id}`;
                  const maybe = !aspectHolds(chart, a) ? "~" : "";
                  const orb = orbParts(a.orb);
                  const letter = phaseLetter(a.applying);
                  const phase = a.applying === true ? t("applying") : a.applying === false ? t("separating") : "";
                  return (
                    <td key={col} data-on={selectedId === id ? "1" : undefined} data-level={a.level} data-uncertain={maybe ? "1" : undefined}>
                      <button
                        type="button"
                        onClick={() => onSelect?.(id)}
                        {...previewProps(id)}
                        aria-label={`${maybe}${bodyLabel(a.a, locale)} ${aspectName(a.type, locale)} ${bodyLabel(a.b, locale)}, ${formatArc(a.orb)}${phase ? `, ${phase}` : ""}`}
                        title={`${maybe}${aspectName(a.type, locale)} · ${formatArc(a.orb)}${phase ? ` · ${phase}` : ""}`}
                      >
                        <AspectGlyph id={a.type} size={19} />
                        <span className="ob-agrid-orb" aria-hidden>
                          {maybe}
                          {orb.main}
                          <span className="ob-agrid-wide">{orb.min}</span>
                          {letter ? <span className="ob-agrid-wide ob-agrid-as"> {letter}</span> : null}
                        </span>
                      </button>
                    </td>
                  );
                })}
                <th scope="row" className="ob-agrid-diag" title={bodyLabel(row, locale)}>
                  <PlanetGlyph id={row} size={18} />
                  <span className="sr-only">{bodyLabel(row, locale)}</span>
                </th>
                {showParallels
                  ? ids.slice(r + 1).map((col) => {
                      const p = parallels.get(`${row}|${col}`);
                      if (!p) return <td key={col} className="ob-agrid-par" />;
                      const orb = orbParts(p.orb);
                      const words = `${p.uncertain ? "~" : ""}${parallelPhrase(p, locale)}, ${formatArc(p.orb)}`;
                      return (
                        <td key={col} className="ob-agrid-par" data-kind={p.kind} data-uncertain={p.uncertain ? "1" : undefined}>
                          <span className="ob-agrid-cell" role="img" aria-label={words} title={words}>
                            <ParallelGlyph kind={p.kind} size={14} />
                            <span className="ob-agrid-orb" aria-hidden>
                              {p.uncertain ? "~" : ""}
                              {orb.main}
                              <span className="ob-agrid-wide">{orb.min}</span>
                            </span>
                          </span>
                        </td>
                      );
                    })
                  : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ob-agrid-legend" data-testid="grid-legend">
        {gridWord(locale, "legendPhase")}
        {showParallels ? ` · ${gridWord(locale, "legendParallels")}` : ""}
      </p>
    </>
  );
}

export { NatalTable as ChartTable };
