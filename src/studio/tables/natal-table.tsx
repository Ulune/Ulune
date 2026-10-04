import { ASPECT_COLOR } from "@/lib/chart/constants";
import { lineInk } from "@/lib/chart/wheel-style";
import { ChevronRight } from "lucide-react";
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
  tightestText,
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
  weightText,
  type BalanceGroup,
} from "@/lib/chart/table-cells";
import { chartTextParts, formatChartTableCsv, formatChartTableText, type ChartTextPartId } from "@/lib/chart/table-export";
import {
  chartRulerFacts,
  dignityRows,
  dispositorsOf,
  mutualReceptions,
  receptionDetail,
  strongestLine,
} from "@/lib/chart/table-dignities";
import { houseRows, interceptedText, twoCuspsText } from "@/lib/chart/table-houses";
import { shapeText, type MergedShape } from "@/lib/chart/table-patterns";
import { MIDPOINT_LIST_BODIES, midpointList, starRows, type Contact } from "@/lib/chart/table-stars";
import type { BodyId, ChartPatterns, NatalChart, SignId } from "@/lib/chart/types";
import type { GlossaryId } from "@/lib/i18n/glossary";
import type { AppLocale } from "@/lib/i18n/messages";
import { partRows } from "@/lib/csv";
import { aspectName, bodyBare, bodyLabel, houseName, signName } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import {
  aspectsWord,
  dignitiesWord,
  gridWord,
  housesWord,
  patternsWord,
  pointsGroupLabel,
  starsWord,
  pointsText,
  tablePartHint,
  tablePartLabel,
  unknownTimeNote,
  type TablePartId,
} from "@/lib/i18n/table-ui";
import { cn, formatArc, formatDegree, formatDegreeSeconds, formatSignedDms, formatSignedDmsSeconds } from "@/lib/utils";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";
import { ParallelGlyph } from "@/studio/tables/table-glyphs";
import { Maybe, OrbLimit, ToolCheck, UnknownNote } from "@/studio/tables/cross-parts";
import { previewProps } from "@/lib/depth/preview-bus";

/** The parts of the natal table, in reading order. */
const PARTS: TablePartId[] = ["identity", "points", "houses", "aspects", "grid", "dignities", "patterns", "balance", "stars"];

/** The glossary's words each part uses, folded under its hint. */
const TERMS: Partial<Record<TablePartId, GlossaryId[]>> = {
  identity: ["siderealTime", "sect", "moonPhase"],
  points: ["declination", "latitude", "outOfBounds", "station", "combust", "sect", "lot"],
  houses: ["house", "intercepted"],
  aspects: ["aspect", "orb", "applying", "outOfSign", "parallel"],
  grid: ["aspect", "orb", "applying", "parallel"],
  dignities: ["domicile", "exaltation", "triplicity", "term", "face", "peregrine", "sect", "dispositor", "reception"],
  patterns: ["voidOfCourse"],
  stars: ["fixedStar", "midpoint"],
};

/** A midpoint composite (lib/chart/composite.ts marks its time "midpoint"). */
function isCompositeChart(chart: NatalChart): boolean {
  return chart.meta.time === "midpoint";
}

export function NatalTable({
  chart,
  selectedId = null,
  onSelect,
  parts,
  name = "natal",
  testId = "studio-table",
}: {
  chart: NatalChart;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** The parts to show, in their order (all nine by default; the composite shows five). */
  parts?: TablePartId[];
  /** Which table (the part last read is kept per table, for the visit). */
  name?: string;
  testId?: string;
}) {
  const { locale, t } = useI18n();
  const patterns = useMemo(() => hydratePatterns(chart), [chart]);
  const shown = parts ?? PARTS;
  const scope = { parts, composite: name === "composite" };

  const actions = (
    <TableActions
      text={() => formatChartTableText(chart, locale, scope)}
      csv={() => formatChartTableCsv(chart, locale, scope)}
      fileName={`${chart.meta.name || name} table`}
    />
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
    dignities: <DignitiesPart chart={chart} patterns={patterns} selectedId={selectedId} onSelect={onSelect} />,
    stars: <StarsPart chart={chart} onSelect={onSelect} />,
  };

  // Each part as its own table, for its CSV and the clipboard (review 3 Oct, B2, B3);
  // the aspects as filtered on screen.
  const tableOf = (id: TablePartId) => {
    const kinds = CSV_KINDS[id];
    if (!kinds) return undefined;
    return () => partRows(formatChartTableCsv(chart, locale, scope), kinds, id === "aspects" ? shownAspectKeep(chart, locale) : undefined);
  };

  const page: TablePart[] = shown.map((id) => ({
    id,
    label: tablePartLabel(locale, id),
    hint: tablePartHint(locale, id),
    terms: TERMS[id],
    copyText: id === "grid" ? undefined : textOf(id as ChartTextPartId),
    table: tableOf(id),
    children: content[id],
  }));

  return (
    <div data-testid={testId} data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name={name} label={t("tableSections")} parts={page} actions={actions} fileStem={chart.meta.name || name} />
    </div>
  );
}

function IdentityPart({ chart, patterns }: { chart: NatalChart; patterns: ChartPatterns }) {
  const { locale } = useI18n();
  const facts = chartFacts(chart, patterns.isDay, locale);
  return (
    <dl
      className="ulune-idfacts grid gap-x-[var(--space-5)] gap-y-[var(--space-3)] sm:grid-cols-2"
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
  // A composite has no motion of its own and its dignities are left to the
  // birth charts (review 3 Oct, P5): those columns go.
  const composite = isCompositeChart(chart);
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
            {composite ? null : <th data-col="motion">{pointsText(locale, "motion")}</th>}
            <th data-col="latitude">{pointsText(locale, "latitude")}</th>
            <th data-col="declination">{pointsText(locale, "declination")}</th>
            {composite ? null : <th data-col="dignity">{pointsText(locale, "dignity")}</th>}
            <th data-col="notes">{pointsText(locale, "notes")}</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.id} data-group={g.id}>
            <tr className="ulune-group-row">
              <th colSpan={composite ? 6 : 8} scope="colgroup" data-testid={`points-group-${g.id}`}>
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
                  {composite ? null : <td data-col="motion">
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
                  </td>}
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
                  {composite ? null : <td data-col="dignity">
                    {r.dignity ? (
                      <span className={cn(r.dignity.uncertain && "ulune-uncertain")} data-testid={`dignity-${p.id}`}>
                        <span className="ulune-score font-mono">
                          {r.dignity.uncertain ? "~" : ""}
                          {r.dignity.scoreText}
                        </span>
                        <span className="ulune-cell-sub">{r.dignity.words.join(" · ")}</span>
                      </span>
                    ) : null}
                  </td>}
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

/** The midpoint list's body, for the visit only. */
let midpointBody: BodyId | "" = "";

/** The aspects' filters and sort, kept for the visit only (in memory, never stored). */
let aspectOptions: AspectOptions = DEFAULT_ASPECT_OPTIONS;

/** Each part's tables in the chart's CSV (the first, "section,field,value", is the chart's identity). */
const CSV_KINDS: Partial<Record<TablePartId, string[]>> = {
  identity: ["section"],
  points: ["point"],
  houses: ["house"],
  aspects: ["aspect"],
  dignities: ["dignity"],
  patterns: ["shape"],
  balance: ["balance"],
  stars: ["star", "midpoint"],
};

/** The aspects the table shows now (their mirrors with them). */
function shownAspectKeep(chart: NatalChart, locale: AppLocale) {
  const { rows } = aspectTableRows(chart, locale, aspectOptions);
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.aspect.id);
    for (const t of r.twins) ids.add(t.id);
  }
  return (row: Record<string, string>) => ids.has(`${row.a}_${row.type}_${row.b}`);
}

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
  // Applying or separating needs a sky that moves: not a composite's (review 3 Oct, P5).
  const composite = isCompositeChart(chart);
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
  const tightest = tightestText(chart, locale);
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
        <OrbLimit value={opts.orbMax} onChange={(orbMax) => setOpts({ ...opts, orbMax })} testId="aspects-orb" />
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
      {tightest ? (
        <p className="ulune-part-count" data-testid="aspects-tightest">
          <Maybe cell={{ ...tightest, text: tightest.text.charAt(0).toUpperCase() + tightest.text.slice(1) }} />
        </p>
      ) : null}
      {rows.length ? (
        <DataTable className="ulune-aspects" stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="pair">{aspectsWord(locale, "pair")}</th>
              <th data-col="aspect">{aspectsWord(locale, "aspect")}</th>
              <th data-col="orb">{aspectsWord(locale, "orb")}</th>
              {composite ? null : <th data-col="phase">{aspectsWord(locale, "phase")}</th>}
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
                  {composite ? null : <td data-col="phase">{r.phase}</td>}
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

/** A shape of the Patterns part: its name (and "dominant"), its corners and focal point, the orbs that hold it. */
function ShapeLine({ shape, uncertain }: { shape: MergedShape; uncertain: boolean }) {
  const { locale } = useI18n();
  const t = shapeText(shape, locale);
  return (
    <span className={cn("ulune-shape", uncertain && "ulune-uncertain")}>
      <span className="ulune-shape-name">
        {uncertain ? "~" : ""}
        {t.name}
        {shape.dominant ? <span className="ulune-note ulune-shape-tag">{patternsWord(locale, "dominant")}</span> : null}
      </span>
      <span className="ulune-cell-sub">
        {t.members}
        {t.focal ? ` · ${t.focal}` : ""}
      </span>
      <span className="ulune-cell-sub">
        {t.orbs}
        {t.ways ? ` · ${t.ways}` : ""}
      </span>
    </span>
  );
}

/** A ruler's glyph in the dignity table; its name for screen readers; marked when it is the row's own planet. */
function RulerGlyph({ id, own, scored, title }: { id: string | null; own?: boolean; scored?: boolean; title?: string }) {
  const { locale, t } = useI18n();
  if (!id) return <span className="ulune-dig-none">{t("flagNo")}</span>;
  const name = bodyLabel(id, locale);
  return (
    <span className={cn("ulune-dig-ruler", own && "is-own", scored && "is-scored")} title={title ? `${name} · ${title}` : name} data-body={id}>
      <PlanetGlyph id={id} size={15} />
      <span className="sr-only">
        {name}
        {title ? ` (${title})` : ""}
      </span>
    </span>
  );
}

/** A body's glyph and name, inline (dispositor chains, receptions). */
function BodyName({ id }: { id: string }) {
  const { locale } = useI18n();
  return (
    <span className="ulune-body-name" data-body={id}>
      <PlanetGlyph id={id} size={14} />
      {bodyBare(id, locale)}
    </span>
  );
}

function DignitiesPart({
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
  const { locale, t } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const rulers = useMemo(() => chartRulerFacts(chart, patterns, locale), [chart, patterns, locale]);
  const rows = useMemo(() => dignityRows(chart, patterns, locale), [chart, patterns, locale]);
  const disp = useMemo(() => dispositorsOf(chart), [chart]);
  const receptions = useMemo(() => mutualReceptions(chart), [chart]);
  const strongest = strongestLine(rows, locale);
  const w = (key: Parameters<typeof dignitiesWord>[1], vars?: Record<string, string>) => dignitiesWord(locale, key, vars);
  const inLoop = new Set<string>(disp.loops.flat());
  return (
    <>
      {unknown ? <UnknownNote>{unknownTimeNote(locale, "dignities")}</UnknownNote> : null}
      <div className="ulune-subpart ulune-subpart-first" data-testid="dignities-ruler">
        <h3 className="ulune-subpart-h">{w("rulerHead")}</h3>
        <p className="ulune-tpart-hint">{w("rulerHint")}</p>
        <dl className="ulune-ruler-facts">
          {rulers.map((r) => (
            <div key={r.planet} data-by={r.by}>
              <dt className="ulune-kicker text-fg-muted">{w(r.by === "both" ? "rulerBoth" : r.by === "traditional" ? "rulerTraditional" : "rulerModern")}</dt>
              <dd>
                <PickRow onClick={onSelect ? () => onSelect(pointSelectId(r.planet)) : undefined}>
                  <span className="inline-flex items-center gap-2">
                    <PlanetGlyph id={r.planet} size={16} />
                    <Maybe cell={r.where} />
                  </span>
                </PickRow>
                <p className="ulune-ruler-lines">
                  {r.dignity ? (
                    <span className={cn(r.dignity.uncertain && "ulune-uncertain")}>
                      <span className="ulune-score font-mono">
                        {r.dignity.uncertain ? "~" : ""}
                        {r.dignity.scoreText}
                      </span>{" "}
                      {r.dignity.words.join(" · ")}
                    </span>
                  ) : null}
                  {r.notes.map((n) => (
                    <Maybe key={n.text} cell={n} className="ulune-note" />
                  ))}
                </p>
                <p className="ulune-ruler-aspects text-sm text-fg-muted">
                  <span className="text-fg">{w("aspectsLabel")}:</span>{" "}
                  {r.aspects.length ? (
                    <span className={cn(unknown && "ulune-uncertain")}>
                      {unknown ? "~" : ""}
                      {r.aspects.map((a) => a.text).join(", ")}
                    </span>
                  ) : (
                    w("noAspects")
                  )}
                </p>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="ulune-subpart" data-testid="dignities-table">
        <h3 className="ulune-subpart-h">{w("tableHead")}</h3>
        <p className="ulune-tpart-hint">{w("tableHint")}</p>
        <DataTable className="ulune-dignities" stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="planet">{w("planet")}</th>
              <th data-col="position">{w("position")}</th>
              <th data-col="domicile" data-glyph>{w("domicile")}</th>
              <th data-col="exaltation" data-glyph>{w("exaltation")}</th>
              <th data-col="triplicity" data-glyph>{w("triplicity")}</th>
              <th data-col="term" data-glyph>{w("term")}</th>
              <th data-col="face" data-glyph>{w("face")}</th>
              <th data-col="detriment" data-glyph>{w("detriment")}</th>
              <th data-col="fall" data-glyph>{w("fall")}</th>
              <th data-col="score">{w("score")}</th>
              <th data-col="sect">{w("sect")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = pointSelectId(r.planet);
              const on = selectedId === id;
              const x = r.rulers;
              const trip = [w("tripDay"), w("tripNight"), w("tripPart")];
              return (
                <tr
                  key={r.planet}
                  data-planet={r.planet}
                  data-selected={on ? "1" : undefined}
                  data-uncertain={r.dignity.uncertain ? "1" : undefined}
                  className={cn(onSelect && "cursor-pointer")}
                  onClick={() => onSelect?.(id)}
                  {...previewProps(id)}
                >
                  <td data-col="planet">
                    <button type="button" className="ulune-row-pick" aria-pressed={on}>
                      <span className="grid size-5 place-items-center text-fg">
                        <PlanetGlyph id={r.planet} size={14} />
                      </span>
                      {bodyBare(r.planet, locale)}
                    </button>
                  </td>
                  <td data-col="position" className="whitespace-nowrap" data-label={w("position")}>
                    <span className="font-mono">{formatDegree(r.point.ecliptic)}</span>{" "}
                    <span className="inline-flex items-center gap-1.5 align-[-1px]">
                      <SignGlyph id={r.point.sign} size={12} />
                      {signName(r.point.sign, locale)}
                    </span>
                  </td>
                  <td data-col="domicile" data-glyph data-label={w("domicile")}>
                    <RulerGlyph id={x.domicile} own={x.domicile === r.planet} />
                  </td>
                  <td data-col="exaltation" data-glyph data-label={w("exaltation")}>
                    <RulerGlyph id={x.exaltation} own={x.exaltation === r.planet} />
                  </td>
                  <td data-col="triplicity" data-glyph data-label={w("triplicity")}>
                    <span className="ulune-dig-trip">
                      {x.triplicity.map((tp, i) => (
                        <RulerGlyph
                          key={`${tp}-${i}`}
                          id={tp}
                          own={tp === r.planet && i === r.sectTriplicity}
                          scored={i === r.sectTriplicity}
                          title={`${trip[i]}${i === r.sectTriplicity ? `, ${w("scored")}` : ""}`}
                        />
                      ))}
                    </span>
                  </td>
                  <td data-col="term" data-glyph data-label={w("term")}>
                    <RulerGlyph id={x.term} own={x.term === r.planet} />
                  </td>
                  <td data-col="face" data-glyph data-label={w("face")}>
                    <RulerGlyph id={x.face} own={x.face === r.planet} />
                  </td>
                  <td data-col="detriment" data-glyph data-label={w("detriment")}>
                    <RulerGlyph id={x.detriment} own={x.detriment === r.planet} />
                  </td>
                  <td data-col="fall" data-glyph data-label={w("fall")}>
                    <RulerGlyph id={x.fall} own={x.fall === r.planet} />
                  </td>
                  <td data-col="score" data-testid={`dignity-score-${r.planet}`} data-label={w("score")}>
                    <span className="ulune-score font-mono">
                      {r.dignity.uncertain ? "~" : ""}
                      {r.dignity.scoreText}
                    </span>
                    <span className="ulune-cell-sub">{r.dignity.words.join(" · ")}</span>
                  </td>
                  <td data-col="sect" data-label={w("sect")}>
                    {r.sect ? <Maybe cell={r.sect} /> : t("flagNo")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        <p className="ulune-part-count" data-testid="dignities-strongest">
          {w("strongest")}: <Maybe cell={strongest} />
        </p>
      </div>

      <div className="ulune-subpart" data-testid="dignities-dispositors">
        <h3 className="ulune-subpart-h">{w("dispositorsHead")}</h3>
        <p className="ulune-tpart-hint">{w("dispositorsHint")}</p>
        <p className="ulune-disp-finals" data-testid="dispositors-finals">
          <span className="ulune-kicker text-fg-muted">{w(disp.single ? "finalOne" : "finals")}</span>{" "}
          {disp.finals.length ? (
            <>
              {disp.finals.map((id) => (
                <BodyName key={id} id={id} />
              ))}
              <span className="text-fg-muted"> · {w(disp.single ? "finalOneNote" : "finalsNote")}</span>
            </>
          ) : (
            <span className="text-fg-muted">{w("noFinal")}</span>
          )}
        </p>
        <ul className="ulune-disp-chains">
          {disp.chains
            .filter((c) => !inLoop.has(c.path[0] as string))
            .map((c) => (
              <li key={c.path.join(">")} data-chain={c.path.join(">")} className={cn(c.uncertain && "ulune-uncertain")}>
                {c.uncertain ? "~" : ""}
                {c.path.map((id, i) => (
                  <span key={`${id}-${i}`}>
                    {i ? <span className="ulune-disp-arrow" aria-hidden> → </span> : null}
                    <BodyName id={id} />
                  </span>
                ))}
                {c.end === "loop" ? <span className="text-fg-muted"> · {w("loop")}</span> : null}
              </li>
            ))}
          {disp.loops.map((ring) => (
            <li key={ring.join("|")} data-loop={ring.join("|")}>
              {ring.map((id, i) => (
                <span key={id}>
                  {i ? <span className="ulune-disp-arrow" aria-hidden> ⇄ </span> : null}
                  <BodyName id={id} />
                </span>
              ))}
              <span className="text-fg-muted"> · {w("loop")}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="ulune-subpart" data-testid="dignities-receptions">
        <h3 className="ulune-subpart-h">{w("receptionsHead")}</h3>
        <p className="ulune-tpart-hint">{w("receptionsHint")}</p>
        {receptions.length ? (
          <ul className="ulune-disp-chains">
            {receptions.map((r) => (
              <li key={`${r.a}|${r.b}`} data-reception={`${r.a}|${r.b}`} data-kind={r.kind} className={cn(r.uncertain && "ulune-uncertain")}>
                {r.uncertain ? "~" : ""}
                <BodyName id={r.a} />
                <span className="ulune-disp-arrow" aria-hidden>
                  {" "}
                  ⇄{" "}
                </span>
                <BodyName id={r.b} />
                <span className="text-fg-muted"> · {w(r.kind === "domicile" ? "byDomicile" : r.kind === "exaltation" ? "byExaltation" : "byMixed")}</span>
                <span className="ulune-cell-sub">{receptionDetail(r, chart, locale)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">{w("noReceptions")}</p>
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
                  <li key={item.text} data-shape={item.shape?.type} data-dominant={item.shape?.dominant ? "1" : undefined}>
                    <PickRow onClick={onSelect && item.pick ? () => onSelect(item.pick!) : undefined}>
                      {item.shape ? <ShapeLine shape={item.shape} uncertain={item.uncertain} /> : <Maybe cell={item} />}
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

/** A contact on a star or a midpoint: the body's glyph and name, its orb. */
function ContactList({ contacts, onSelect }: { contacts: Contact[]; onSelect?: (id: string) => void }) {
  const { locale } = useI18n();
  if (!contacts.length) return <span className="text-fg-subtle">{starsWord(locale, "noneOn")}</span>;
  return (
    <span className="ulune-contacts">
      {contacts.map((c) => (
        <span key={`${c.body}-${c.opposite ? "o" : "c"}`} className={cn("ulune-contact", c.uncertain && "ulune-uncertain")} data-body={c.body}>
          {c.uncertain ? "~" : ""}
          <GlyphPick id={c.body} onSelect={onSelect} size={13} />
          {bodyBare(c.body, locale)} <span className="font-mono text-fg-muted">{formatArc(c.orb)}</span>
          {c.opposite ? <span className="text-fg-muted"> · {starsWord(locale, "opposite")}</span> : null}
        </span>
      ))}
    </span>
  );
}

function StarsPart({ chart, onSelect }: { chart: NatalChart; onSelect?: (id: string) => void }) {
  const { locale } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const stars = useMemo(() => starRows(chart), [chart]);
  // Every midpoint, in zodiac order, narrowed to one body's if asked (review 3 Oct, B7).
  const [mpBody, setMpBody] = useState<BodyId | "">(midpointBody);
  const pickMpBody = (next: BodyId | "") => {
    midpointBody = next;
    setMpBody(next);
  };
  const midpoints = useMemo(() => midpointList(chart, mpBody || null), [chart, mpBody]);
  const mpBodies = useMemo(() => MIDPOINT_LIST_BODIES.filter((id) => id in chart.angles || chart.planets.some((p) => p.id === id)), [chart]);
  const position = (lon: number, sign: SignId, uncertain = false) => (
    <span className={cn("whitespace-nowrap", uncertain && "ulune-uncertain")}>
      <span className="font-mono">
        {uncertain ? "~" : ""}
        {unknown ? formatDegree(lon) : formatDegreeSeconds(lon)}
      </span>{" "}
      <span className="inline-flex items-center gap-1.5 align-[-1px]">
        <SignGlyph id={sign} size={12} />
        {signName(sign, locale)}
      </span>
    </span>
  );
  return (
    <>
      {unknown ? <UnknownNote>{unknownTimeNote(locale, "stars")}</UnknownNote> : null}
      <div className="ulune-subpart ulune-subpart-first" data-testid="stars-fixed">
        <h3 className="ulune-subpart-h">{starsWord(locale, "starsHead")}</h3>
        <DataTable className="ulune-stars" stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="star">{starsWord(locale, "star")}</th>
              <th data-col="position">{starsWord(locale, "position")}</th>
              <th data-col="on">{starsWord(locale, "on")}</th>
            </tr>
          </thead>
          <tbody>
            {stars.map((r) => (
              <tr key={r.id} data-star={r.id}>
                <td data-col="star">{starsWord(locale, r.id)}</td>
                <td data-col="position">{position(r.ecliptic, r.sign)}</td>
                <td data-col="on">
                  <ContactList contacts={r.contacts} onSelect={onSelect} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
      <div className="ulune-subpart" data-testid="stars-midpoints">
        <h3 className="ulune-subpart-h">{starsWord(locale, "midpointsHead")}</h3>
        <div className="ulune-part-tools" data-testid="midpoints-tools">
          <label className="ulune-tool-sort">
            <span className="ulune-tool-label">{starsWord(locale, "midpointsOf")}</span>
            <select className="ulune-tool-select" value={mpBody} onChange={(e) => pickMpBody(e.target.value as BodyId | "")} data-testid="midpoints-body">
              <option value="">{starsWord(locale, "midpointsAll")}</option>
              {mpBodies.map((id) => (
                <option key={id} value={id}>
                  {bodyBare(id, locale)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="ulune-part-count" data-testid="midpoints-count" aria-live="polite">
          {starsWord(locale, "midpointsCount", { n: String(midpoints.length) })}
        </p>
        <DataTable className="ulune-stars" stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="midpoint">{starsWord(locale, "midpoint")}</th>
              <th data-col="position">{starsWord(locale, "position")}</th>
              <th data-col="on">{starsWord(locale, "on")}</th>
            </tr>
          </thead>
          <tbody>
            {midpoints.map((r) => (
              <tr key={r.id} data-midpoint={r.id} data-uncertain={r.uncertain ? "1" : undefined}>
                <td data-col="midpoint">
                  <span className="ulune-pair">
                    <PlanetGlyph id={r.a} size={13} />
                    {bodyBare(r.a, locale)}
                    <span className="text-fg-subtle" aria-hidden>
                      /
                    </span>
                    <PlanetGlyph id={r.b} size={13} />
                    {bodyBare(r.b, locale)}
                  </span>
                </td>
                <td data-col="position">{position(r.ecliptic, r.sign, r.uncertain)}</td>
                <td data-col="on">
                  <ContactList contacts={r.contacts} onSelect={onSelect} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
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
  const { locale } = useI18n();
  const max = Math.max(1e-6, ...group.rows.map((r) => r.value));
  return (
    <div className="ob-bal" role="group" aria-label={group.title} data-group={group.id} data-uncertain={group.uncertain ? "1" : undefined}>
      <p className="ob-rc-h">
        {group.uncertain ? "~" : ""}
        {group.title}
      </p>
      <ul className="ob-bal-rows">
        {group.rows.map((r) => (
          <li key={r.id} className="ob-bal-row" data-row={r.id} aria-label={`${r.label}: ${weightText(r.value, locale)}${r.bodies.length ? ` (${r.bodies.map((id) => bodyBare(id, locale)).join(", ")})` : ""}`}>
            <span className="ob-bal-label">{r.label}</span>
            <span className="ob-bal-track" aria-hidden>
              <span
                className="ob-bal-fill"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "var(--color-fg-muted)" }}
              />
            </span>
            <span className="ob-bal-n">{weightText(r.value, locale)}</span>
            {r.bodies.length ? (
              <span className="ob-bal-bodies" aria-hidden>
                {r.bodies.map((id) => (
                  <span key={id} title={bodyLabel(id, locale)} data-body={id}>
                    <PlanetGlyph id={id} size={13} />
                  </span>
                ))}
              </span>
            ) : null}
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
                        <span className="ob-agrid-glyph" style={{ color: lineInk(ASPECT_COLOR[a.type]) }}>
                          <AspectGlyph id={a.type} size={19} />
                        </span>
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
