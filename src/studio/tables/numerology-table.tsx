import { useMemo, useState } from "react";
import { partRows } from "@/lib/csv";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { chartDisplayName, type SavedChart } from "@/lib/chart/library";
import { castNumerology, numerologyOptionsOf, type NumerologyChart, type NumerologyName } from "@/lib/chart/numerology";
import type { AgeSpan } from "@/lib/chart/numerology-cycles";
import { GRID_CELLS, type GridLayoutId } from "@/lib/chart/numerology-grid";
import type { NameLetter } from "@/lib/chart/numerology-name";
import { stepsText, wholeText, type NumerologyValue } from "@/lib/chart/numerology-reduce";
import {
  TABLE_CORES,
  agesText,
  bridgeRows,
  compareRows,
  cycleRows,
  detailRows,
  numerologyTableCsv,
  numerologyTextParts,
  spanYearsText,
  tableCoreLabel,
  tableCoreValue,
  tableYears,
  termText,
  valueNote,
  wordRows,
  yearLettersText,
  type TableCoreId,
} from "@/lib/chart/numerology-table";
import { usePack } from "@/lib/content/packs";
import { pickBi } from "@/lib/content/types";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyCoreLabel, numerologyPageText as p, numerologySystemLabel } from "@/lib/i18n/numerology-ui";
import { cn } from "@/lib/utils";
import { useSwitchY } from "@/studio/modes/hooks/useSwitchY";
import { DataTable } from "@/studio/tables/DataTable";
import { NumerologyLifeLine } from "@/studio/tables/numerology-life";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * The numerology table (part 61 of the launch plan): one scroll under the
 * pinned bar, as every mode's table: the core numbers with their steps, the
 * name letter by letter, the birth grid, the long cycles, the years, the
 * bridges (and two people side by side) and what the numbers mean. Copy and
 * CSV for the whole and for each part; everything is worked out here, on the
 * device.
 */
export function NumerologyTable({
  chart,
  name = "",
  nameFrom = null,
  rows,
  activeId,
  selectedId,
  onSelect,
  openBirth,
}: {
  chart: NumerologyChart;
  /** The chart's name, for the copied text and the file. */
  name?: string;
  /** Where the name numbers' name comes from: the full name at birth, or the chart's name. */
  nameFrom?: "birth" | "chart" | null;
  /** The library, for two people side by side. */
  rows: SavedChart[];
  activeId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  openBirth: () => void;
}) {
  const { locale, t } = useI18n();
  const [layout, setLayout] = useState<GridLayoutId>("phillips");
  const [wholeLife, setWholeLife] = useState(false);
  const [pair, setPair] = useState<{ a?: string; b?: string }>({});

  // Two people from the library: the chart shown first, then another.
  const aId = pair.a && rows.some((r) => r.id === pair.a) ? pair.a : (activeId ?? rows[0]?.id);
  const bId = pair.b && pair.b !== aId && rows.some((r) => r.id === pair.b) ? pair.b : rows.find((r) => r.id !== aId)?.id;
  const rowA = rows.find((r) => r.id === aId);
  const rowB = rows.find((r) => r.id === bId);
  const year = chart.calendarYear;
  const castA = useMemo(() => (rowA ? castNumerology(rowA.chart, { ...numerologyOptionsOf(rowA.input, rowA.chart), calendarYear: year }) : null), [rowA, year]);
  const castB = useMemo(() => (rowB ? castNumerology(rowB.chart, { ...numerologyOptionsOf(rowB.input, rowB.chart), calendarYear: year }) : null), [rowB, year]);
  const other = castA && castB && rowB ? { name: chartDisplayName(rowB.input), chart: castB } : null;
  const whoA = rowA ? chartDisplayName(rowA.input) : name;

  const text = () => numerologyTextParts(chart, locale, { who: name, layout, wholeLife, other: other && castA ? other : null });
  const partText = (id: string) => () => text().find((x) => x.id === id)?.lines.join("\n") ?? "";
  const pick = { selectedId, onSelect };
  const gate = chart.names.birth ? null : <NameGate locale={locale} openBirth={openBirth} />;

  // Each part as its own table (review 3 Oct, B2, B3).
  const csvOf = (kinds: string[]) => () => partRows(numerologyTableCsv(chart, { wholeLife }), kinds);

  const parts: TablePart[] = [
    {
      id: "core",
      label: p(locale, "part_core"),
      heading: p(locale, "headCore"),
      hint: p(locale, "hint_core"),
      terms: ["lifePath", "nameNumbers", "birthday", "maturity", "masterNumbers", "karmicDebt"],
      copyText: partText("core"),
      table: csvOf(["core"]),
      children: (
        <>
          {gate}
          <CorePart chart={chart} locale={locale} {...pick} />
        </>
      ),
    },
    {
      id: "name",
      label: p(locale, "part_name"),
      heading: p(locale, "headName"),
      hint: p(locale, "hint_name"),
      terms: ["nameNumbers", "karmicLesson", "hiddenPassion", "finerNumbers", "planes", "stones", "chaldean"],
      copyText: partText("name"),
      table: csvOf(["letter"]),
      children: gate ?? <NamePart chart={chart} locale={locale} nameFrom={nameFrom} openBirth={openBirth} {...pick} />,
    },
    {
      id: "grid",
      label: p(locale, "part_grid"),
      heading: p(locale, "headGrid"),
      hint: p(locale, "hint_grid"),
      terms: ["birthGrid"],
      copyText: partText("grid"),
      table: csvOf(["grid"]),
      children: <GridPart chart={chart} locale={locale} layout={layout} setLayout={setLayout} />,
    },
    {
      id: "cycles",
      label: p(locale, "part_cycles"),
      heading: p(locale, "headCycles"),
      hint: p(locale, "hint_cycles"),
      terms: ["periodCycle", "pinnacle", "challenge"],
      copyText: partText("cycles"),
      table: csvOf(["cycle"]),
      children: <CyclesPart chart={chart} locale={locale} {...pick} />,
    },
    {
      id: "years",
      label: p(locale, "part_years"),
      heading: p(locale, "headYears"),
      hint: p(locale, "hint_years"),
      terms: ["personalCycles", "letterCycle"],
      copyText: partText("years"),
      table: csvOf(["year"]),
      children: <YearsPart chart={chart} locale={locale} wholeLife={wholeLife} setWholeLife={setWholeLife} {...pick} />,
    },
    {
      id: "bridges",
      label: p(locale, "part_bridges"),
      heading: p(locale, "headBridges"),
      hint: p(locale, "hint_bridges"),
      terms: ["bridge"],
      copyText: partText("bridges"),
      table: csvOf(["bridge"]),
      children: (
        <BridgesPart
          chart={chart}
          locale={locale}
          {...pick}
          rows={rows}
          aId={aId}
          bId={bId}
          whoA={whoA}
          castA={castA}
          castB={castB}
          setPair={(a, b) => setPair({ a, b })}
        />
      ),
    },
    {
      id: "numbers",
      label: p(locale, "part_numbers"),
      heading: p(locale, "headNumbers"),
      hint: p(locale, "hint_numbers"),
      terms: ["masterNumbers"],
      children: <NumbersPart locale={locale} {...pick} />,
    },
  ];

  return (
    <div data-testid="numerology-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage
        name="numerology"
        label={t("tableSections")}
        parts={parts}
        fileStem={p(locale, "fileName", { name: name || "ulune" })}
        intro={
          <details className="ob-rc-about ulune-num-method" data-testid="numerology-method">
            <summary>{p(locale, "methodTitle")}</summary>
            <p className="ob-rc-p">{p(locale, "method")}</p>
            <p className="ob-rc-p">{numerologySystemLabel(locale)}</p>
          </details>
        }
        actions={
          <TableActions
            text={() => text().map((x) => x.lines.join("\n")).join("\n\n")}
            csv={() => numerologyTableCsv(chart, { wholeLife })}
            fileName={p(locale, "fileName", { name: name || "ulune" })}
          />
        }
      />
    </div>
  );
}

type Pick = { selectedId: string | null; onSelect: (id: string) => void };

function NameGate({ locale, openBirth }: { locale: AppLocale; openBirth: () => void }) {
  return (
    <div data-testid="numerology-name-gate" className="ulune-num-gate">
      <p>{p(locale, "addBirthNameHint")}</p>
      <button type="button" data-testid="numerology-add-birth-name" className="ulune-num-gate-btn" onClick={openBirth}>
        {p(locale, "addBirthName")}
      </button>
    </div>
  );
}

/** A row that opens its reading (part 63): the whole row takes the click, its first cell the keyboard. */
function pickRow(ref: string | null, { selectedId, onSelect }: Pick) {
  if (!ref) return {};
  const on = selectedId === ref;
  return {
    "data-selected": on ? "1" : undefined,
    className: cn("cursor-pointer", on && "bg-bg-subtle"),
    onClick: () => onSelect(ref),
    ...previewProps(ref),
  };
}

/** The first cell's words as the row's button (Tab, Enter). */
function PickLabel({ refId, selectedId, children }: { refId: string | null; selectedId: string | null; children: React.ReactNode }) {
  if (!refId) return <>{children}</>;
  return (
    <button type="button" className="ulune-row-pick" aria-pressed={selectedId === refId}>
      {children}
    </button>
  );
}

/** "13/4" with "karmic debt 13" under it. */
function ValueCell({ value, locale }: { value: NumerologyValue; locale: AppLocale }) {
  if (value.number == null) return <span className="ulune-num-none">—</span>;
  const note = valueNote(locale, value);
  return (
    <>
      <span className="font-mono tabular-nums">{wholeText(value)}</span>
      {note ? <span className="ulune-cell-sub">{note}</span> : null}
    </>
  );
}

/** The six core numbers the wheel draws, then Attitude and Rational thought. */
function CorePart({ chart, locale, selectedId, onSelect }: { chart: NumerologyChart; locale: AppLocale } & Pick) {
  const refOf = (id: TableCoreId) => (id === "attitude" || id === "rationalThought" ? `detail:${id}` : `core:${id}`);
  return (
    <DataTable stickyFirst={false} className="ulune-num-core">
      <thead>
        <tr>
          <th data-col="number">{p(locale, "col_number")}</th>
          <th data-col="value">{p(locale, "col_value")}</th>
          <th data-col="steps">{p(locale, "col_steps")}</th>
          <th data-col="from">{p(locale, "col_from")}</th>
        </tr>
      </thead>
      <tbody>
        {TABLE_CORES.map((id) => {
          const value = tableCoreValue(chart, id);
          const ref = refOf(id);
          const live = value.number != null;
          const on = selectedId === ref;
          return (
            <tr
              key={id}
              data-testid={`num-core-${id}`}
              data-selected={on ? "1" : undefined}
              className={cn(live && "cursor-pointer", on && "bg-bg-subtle")}
              onClick={live ? () => onSelect(ref) : undefined}
              {...(live ? previewProps(ref) : {})}
            >
              <td data-col="number">
                {live ? (
                  <button type="button" className="ulune-row-pick" aria-pressed={on}>
                    {tableCoreLabel(locale, id)}
                  </button>
                ) : (
                  tableCoreLabel(locale, id)
                )}
              </td>
              <td data-col="value">
                <ValueCell value={value} locale={locale} />
              </td>
              <td data-col="steps" className="font-mono tabular-nums">
                {value.number == null ? "" : stepsText(value)}
              </td>
              <td data-col="from">{p(locale, `from_${id}`)}</td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

/** A name's letters, vowels in bold; a Y is a button that switches it. */
function Letters({ chart, letters, locale }: { chart: NumerologyChart; letters: NameLetter[]; locale: AppLocale }) {
  const switchY = useSwitchY();
  return (
    <span className="ulune-num-letters">
      {letters.map((l) =>
        l.y != null && chart.names.birth?.parsed.letters.includes(l) ? (
          <button
            key={l.index}
            type="button"
            className="ulune-num-y"
            data-testid={`num-y-${l.y}`}
            data-vowel={l.vowel ? "1" : undefined}
            aria-pressed={l.vowel}
            title={p(locale, "ySwitchTitle", { role: p(locale, l.vowel ? "vowels" : "consonants").toLowerCase() })}
            onClick={(e) => {
              e.stopPropagation();
              switchY(chart, l, l.vowel ? "c" : "v");
            }}
          >
            {l.ch}
            <sub>{l.value}</sub>
          </button>
        ) : (
          <span key={l.index} data-vowel={l.vowel ? "1" : undefined}>
            {l.ch}
            <sub>{l.value}</sub>
          </span>
        ),
      )}
    </span>
  );
}

function WordsTable({ chart, name, locale, testId }: { chart: NumerologyChart; name: NumerologyName; locale: AppLocale; testId: string }) {
  return (
    <DataTable stickyFirst={false} className="ulune-num-words">
      <thead>
        <tr>
          <th data-col="name">{p(locale, "col_name")}</th>
          <th data-col="letters">{p(locale, "col_letters")}</th>
          <th data-col="all">{p(locale, "col_all")}</th>
          <th data-col="vowels">{p(locale, "vowels")}</th>
          <th data-col="consonants">{p(locale, "consonants")}</th>
        </tr>
      </thead>
      <tbody data-testid={testId}>
        {wordRows(name).map((r, i) => (
          <tr key={i} data-testid={`${testId}-${i}`}>
            <td data-col="name">{r.word.text}</td>
            <td data-col="letters">
              <Letters chart={chart} letters={r.word.letters} locale={locale} />
            </td>
            <td data-col="all" className="font-mono tabular-nums">
              {termText(r.all)}
            </td>
            <td data-col="vowels" className="font-mono tabular-nums">
              {termText(r.vowels)}
            </td>
            <td data-col="consonants" className="font-mono tabular-nums">
              {termText(r.consonants)}
            </td>
          </tr>
        ))}
        <tr data-total="1">
          <td data-col="name">{p(locale, "total")}</td>
          <td data-col="letters" />
          <td data-col="all" className="font-mono tabular-nums">
            {stepsText(name.expression)}
          </td>
          <td data-col="vowels" className="font-mono tabular-nums">
            {stepsText(name.soulUrge)}
          </td>
          <td data-col="consonants" className="font-mono tabular-nums">
            {stepsText(name.personality)}
          </td>
        </tr>
      </tbody>
    </DataTable>
  );
}

/** The reading a finer number's row opens (part 63); none for an empty one. */
function detailRef(id: string, present: boolean): string | null {
  if (id.startsWith("plane-")) return `plane:${id.slice(6)}`;
  if (id === "lessons" || id === "subconscious" || id === "balance" || id === "chaldean") return `detail:${id}`;
  return present ? `detail:${id}` : null;
}

/** The name letter by letter, the letters on each number, the finer numbers, the name used now. */
function NamePart({
  chart,
  locale,
  nameFrom,
  openBirth,
  selectedId,
  onSelect,
}: { chart: NumerologyChart; locale: AppLocale; nameFrom: "birth" | "chart" | null; openBirth: () => void } & Pick) {
  const birth = chart.names.birth!;
  const counts = birth.detail.counts;
  const current = chart.names.current;
  return (
    <div className="ulune-num-part">
      {nameFrom ? (
        <p className="ulune-num-note" data-testid="num-name-from" data-from={nameFrom}>
          {p(locale, nameFrom === "birth" ? "nameFromBirth" : "nameFromChart", { name: birth.text })}{" "}
          <button type="button" className="ulune-num-gate-btn" data-testid="num-name-change" onClick={openBirth}>
            {p(locale, nameFrom === "birth" ? "changeNames" : "addFullName")}
          </button>
        </p>
      ) : null}
      <WordsTable chart={chart} name={birth} locale={locale} testId="num-words" />
      <DataTable stickyFirst={false} className="ulune-num-counts">
        <thead>
          <tr>
            <th data-col="label">{p(locale, "col_number")}</th>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <th key={n} data-col={`n${n}`}>
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr data-testid="num-counts">
            <td data-col="label">{p(locale, "letters")}</td>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
              const ref = `number:${n}`;
              return (
                <td
                  key={n}
                  data-col={`n${n}`}
                  data-lesson={counts[n] === 0 ? "1" : undefined}
                  data-passion={birth.detail.hiddenPassion.includes(n) ? "1" : undefined}
                  data-selected={selectedId === ref ? "1" : undefined}
                  className="cursor-pointer font-mono tabular-nums"
                  onClick={() => onSelect(ref)}
                  {...previewProps(ref)}
                >
                  {counts[n] ?? 0}
                </td>
              );
            })}
          </tr>
        </tbody>
      </DataTable>
      <DataTable stickyFirst={false} className="ulune-num-detail">
        <thead>
          <tr>
            <th data-col="number">{p(locale, "col_number")}</th>
            <th data-col="value">{p(locale, "col_value")}</th>
            <th data-col="how">{p(locale, "col_how")}</th>
          </tr>
        </thead>
        <tbody>
          {detailRows(birth, locale).map((r) => {
            const ref = detailRef(r.id, r.value !== p(locale, "none"));
            return (
              <tr key={r.id} data-testid={`num-detail-${r.id}`} {...pickRow(ref, { selectedId, onSelect })}>
                <td data-col="number">
                  <PickLabel refId={ref} selectedId={selectedId}>
                    {r.label}
                  </PickLabel>
                </td>
                <td data-col="value" className="font-mono tabular-nums">
                  {r.value}
                </td>
                <td data-col="how">{r.how}</td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      <p className="ulune-num-note">{p(locale, "chaldeanNote")}</p>
      {current ? (
        <>
          <h3 className="ulune-num-subhead">{p(locale, "currentHead", { name: current.text })}</h3>
          <WordsTable chart={chart} name={current} locale={locale} testId="num-current" />
          <p className="ulune-num-note">{p(locale, "minorNote")}</p>
        </>
      ) : null}
    </div>
  );
}

/** The birth grid as a square, and its eight lines. */
function GridPart({
  chart,
  locale,
  layout,
  setLayout,
}: {
  chart: NumerologyChart;
  locale: AppLocale;
  layout: GridLayoutId;
  setLayout: (next: GridLayoutId) => void;
}) {
  const counts = chart.grid.counts;
  return (
    <div className="ulune-num-part">
      <div className="ulune-num-gridrow">
        <table className="ulune-num-grid" data-testid="num-grid" data-layout={layout} aria-label={p(locale, "gridAria", { layout: p(locale, `layout_${layout}`) })}>
          <tbody>
            {GRID_CELLS[layout].map((row, i) => (
              <tr key={i}>
                {row.map((d) => (
                  <td key={d} data-digit={d} data-empty={counts[d] ? undefined : "1"}>
                    <span className="ulune-num-grid-d">{counts[d] ? String(d).repeat(counts[d]!).split("").join(" ") : ""}</span>
                    <span className="ulune-num-grid-k" aria-hidden>
                      {d}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <SegmentedToggle
          ariaLabel={p(locale, "layoutLabel")}
          value={layout}
          onChange={setLayout}
          options={[
            { value: "phillips", testId: "num-grid-phillips", label: p(locale, "layout_phillips") },
            { value: "loshu", testId: "num-grid-loshu", label: p(locale, "layout_loshu") },
          ]}
        />
      </div>
      <DataTable stickyFirst={false} className="ulune-num-lines">
        <thead>
          <tr>
            <th data-col="line">{p(locale, "col_line")}</th>
            <th data-col="state">{p(locale, "col_state")}</th>
          </tr>
        </thead>
        <tbody>
          {chart.grid.lines[layout].map((line) => (
            <tr key={line.id} data-testid={`num-line-${line.id}`} data-state={line.state}>
              <td data-col="line" className="font-mono tabular-nums">
                {line.id}
              </td>
              <td data-col="state">{p(locale, `line_${line.state}`)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

const within = (span: AgeSpan, age: number) => age >= span.fromAge && (span.toAge == null || age < span.toAge);

/** Period cycles, pinnacles and challenges with their ages and years; the ones running now marked. */
function CyclesPart({ chart, locale, ...pick }: { chart: NumerologyChart; locale: AppLocale } & Pick) {
  return (
    <div className="ulune-num-part">
      <NumerologyLifeLine chart={chart} locale={locale} />
      <CyclesTable chart={chart} locale={locale} {...pick} />
    </div>
  );
}

function CyclesTable({ chart, locale, selectedId, onSelect }: { chart: NumerologyChart; locale: AppLocale } & Pick) {
  return (
    <DataTable stickyFirst={false} className="ulune-num-cycles">
      <thead>
        <tr>
          <th data-col="cycle">{p(locale, "col_cycle")}</th>
          <th data-col="number">{p(locale, "col_number")}</th>
          <th data-col="ages">{p(locale, "col_ages")}</th>
          <th data-col="years">{p(locale, "col_years")}</th>
        </tr>
      </thead>
      <tbody>
        {cycleRows(chart).map((r) => {
          const now = within(r.span, chart.age);
          const ref = r.value.number == null ? null : `cycle:${r.kind}:${r.index}`;
          return (
            <tr
              key={`${r.kind}-${r.index}`}
              data-testid={`num-cycle-${r.kind}-${r.index}`}
              data-now={now ? "1" : undefined}
              data-kind={r.kind}
              {...pickRow(ref, { selectedId, onSelect })}
            >
              <td data-col="cycle">
                <PickLabel refId={ref} selectedId={selectedId}>
                  {p(locale, `cycle_${r.kind}`, { n: r.index })}
                </PickLabel>
                {r.main ? <span className="ulune-cell-sub">{p(locale, "main")}</span> : null}
              </td>
              <td data-col="number">
                <ValueCell value={r.value} locale={locale} />
              </td>
              <td data-col="ages" className="font-mono tabular-nums">
                {agesText(locale, r.span)}
                {now ? <span className="ulune-cell-sub">{p(locale, "now")}</span> : null}
              </td>
              <td data-col="years" className="font-mono tabular-nums">
                {spanYearsText(locale, chart.year, r.span)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

/** This year's, month's and day's numbers, then the years round the one shown (or the whole life). */
function YearsPart({
  chart,
  locale,
  wholeLife,
  setWholeLife,
  selectedId,
  onSelect,
}: { chart: NumerologyChart; locale: AppLocale; wholeLife: boolean; setWholeLife: (v: boolean) => void } & Pick) {
  const pack = usePack("num", locale);
  const years = useMemo(() => tableYears(chart, wholeLife), [chart, wholeLife]);
  const cards: { id: string; label: string; value: NumerologyValue; text: string }[] = [
    {
      id: "core:personalYear",
      label: numerologyCoreLabel(locale, "personalYear"),
      value: chart.personalYear,
      text: pack && chart.personalYear.digit ? pickBi(pack.PERSONAL_YEAR_TEXT[chart.personalYear.digit as 1], locale) : "",
    },
    {
      id: "time:month",
      label: p(locale, "personalMonth"),
      value: chart.personalMonth,
      text: pack && chart.personalMonth.digit ? pickBi(pack.PERSONAL_MONTH_TEXT[chart.personalMonth.digit as 1], locale) : "",
    },
    {
      id: "time:day",
      label: p(locale, "personalDay"),
      value: chart.personalDay,
      text: pack && chart.personalDay.digit ? pickBi(pack.PERSONAL_DAY_TEXT[chart.personalDay.digit as 1], locale) : "",
    },
    {
      id: `year:${chart.calendarYear}`,
      label: p(locale, "universalYear"),
      value: chart.universalYear,
      text: pack && chart.universalYear.digit ? pickBi(pack.UNIVERSAL_YEAR_TEXT[chart.universalYear.digit as 1], locale) : "",
    },
  ];
  return (
    <div className="ulune-num-part">
      <h3 className="ulune-num-subhead">{p(locale, "thisYearHead", { year: chart.calendarYear })}</h3>
      <div className="ulune-num-cards" data-testid="num-now">
        {cards.map((c) => {
          const on = c.id !== "" && selectedId === c.id;
          const body = (
            <>
              <span className="ulune-num-card-k">{c.label}</span>
              <span className="ulune-num-card-n">{c.value.number ?? "—"}</span>
              <span className="ulune-num-card-steps">{stepsText(c.value)}</span>
              {c.text ? <span className="ulune-num-card-t">{c.text}</span> : null}
            </>
          );
          return c.id ? (
            <button
              key={c.label}
              type="button"
              className={cn("ulune-num-card", on && "is-on")}
              aria-pressed={on}
              onClick={() => onSelect(c.id)}
              {...previewProps(c.id)}
            >
              {body}
            </button>
          ) : (
            <div key={c.label} className="ulune-num-card">
              {body}
            </div>
          );
        })}
      </div>
      <SegmentedToggle
        ariaLabel={p(locale, "yearsLabel")}
        value={wholeLife ? "life" : "nine"}
        onChange={(v) => setWholeLife(v === "life")}
        options={[
          { value: "nine", testId: "num-years-nine", label: p(locale, "nineYears") },
          { value: "life", testId: "num-years-life", label: p(locale, "wholeLife") },
        ]}
      />
      <DataTable stickyFirst={false} className="ulune-num-years">
        <thead>
          <tr>
            <th data-col="year">{p(locale, "col_year")}</th>
            <th data-col="age">{p(locale, "col_age")}</th>
            <th data-col="py">{p(locale, "col_personalYear")}</th>
            <th data-col="pinnacle">{p(locale, "col_pinnacle")}</th>
            <th data-col="challenge">{p(locale, "col_challenge")}</th>
            <th data-col="period">{p(locale, "col_period")}</th>
            <th data-col="essence">{p(locale, "col_essence")}</th>
            <th data-col="letters">{p(locale, "letters")}</th>
          </tr>
        </thead>
        <tbody data-testid="num-years">
          {years.map((r) => {
            const c = r.cycles;
            return (
              <tr
                key={r.year}
                data-testid={`num-year-${r.year}`}
                data-now={r.year === chart.calendarYear ? "1" : undefined}
                {...pickRow(`year:${r.year}`, { selectedId, onSelect })}
              >
                <td data-col="year" className="font-mono tabular-nums">
                  <PickLabel refId={`year:${r.year}`} selectedId={selectedId}>
                    {r.year}
                  </PickLabel>
                </td>
                <td data-col="age" className="font-mono tabular-nums">
                  {c ? r.age : "—"}
                </td>
                <td data-col="py" className="font-mono tabular-nums">
                  {r.personalYear.number}
                </td>
                <td data-col="pinnacle" className="font-mono tabular-nums">
                  {c ? wholeText(c.pinnacle.value) : ""}
                </td>
                <td data-col="challenge" className="font-mono tabular-nums">
                  {c ? wholeText(c.challenge.value) : ""}
                </td>
                <td data-col="period" className="font-mono tabular-nums">
                  {c ? wholeText(c.period.value) : ""}
                </td>
                <td data-col="essence" className="font-mono tabular-nums">
                  {c?.letters ? wholeText(c.essence) : ""}
                </td>
                <td data-col="letters" className="font-mono">
                  {yearLettersText(r)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </div>
  );
}

/** The two bridges, then two people from the library side by side. */
function BridgesPart({
  chart,
  locale,
  rows,
  aId,
  bId,
  whoA,
  castA,
  castB,
  setPair,
  selectedId,
  onSelect,
}: Pick & {
  chart: NumerologyChart;
  locale: AppLocale;
  rows: SavedChart[];
  aId: string | undefined;
  bId: string | undefined;
  whoA: string;
  castA: NumerologyChart | null;
  castB: NumerologyChart | null;
  setPair: (a?: string, b?: string) => void;
}) {
  const rowB = rows.find((r) => r.id === bId);
  return (
    <div className="ulune-num-part">
      <DataTable stickyFirst={false} className="ulune-num-bridges">
        <thead>
          <tr>
            <th data-col="bridge">{p(locale, "col_bridge")}</th>
            <th data-col="between">{p(locale, "col_between")}</th>
            <th data-col="gap">{p(locale, "col_gap")}</th>
          </tr>
        </thead>
        <tbody>
          {bridgeRows(chart, locale).map((b) => (
            <tr key={b.id} data-testid={`num-bridge-${b.id}`} {...pickRow(b.value.number == null ? null : `bridge:${b.id}`, { selectedId, onSelect })}>
              <td data-col="bridge">
                <PickLabel refId={b.value.number == null ? null : `bridge:${b.id}`} selectedId={selectedId}>
                  {b.label}
                </PickLabel>
              </td>
              <td data-col="between" className="font-mono tabular-nums">
                {b.value.gap ? `${b.value.gap[0]} · ${b.value.gap[1]}` : "—"}
              </td>
              <td data-col="gap" className="font-mono tabular-nums">
                {b.value.number ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <h3 className="ulune-num-subhead">{p(locale, "compareTitle")}</h3>
      {rows.length < 2 ? (
        <div data-testid="numerology-compare-empty" className="ulune-num-gate">
          <p>{p(locale, "emptyCompare")}</p>
          <p className="ulune-num-note">{p(locale, "emptyCompareHint")}</p>
        </div>
      ) : (
        <>
          <div className="ulune-num-pair">
            <label>
              <span>{p(locale, "personA")}</span>
              <select data-testid="numerology-compare-a" value={aId ?? ""} onChange={(e) => setPair(e.target.value || undefined, bId)}>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {chartDisplayName(r.input)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{p(locale, "personB")}</span>
              <select data-testid="numerology-compare-b" value={bId ?? ""} onChange={(e) => setPair(aId, e.target.value || undefined)}>
                {rows
                  .filter((r) => r.id !== aId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {chartDisplayName(r.input)}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {castA && castB ? (
            <DataTable stickyFirst={false} className="ulune-num-compare">
              <thead>
                <tr>
                  <th data-col="number">{p(locale, "col_number")}</th>
                  <th data-col="a">{whoA || p(locale, "personA")}</th>
                  <th data-col="b">{rowB ? chartDisplayName(rowB.input) : p(locale, "personB")}</th>
                  <th data-col="gap">{p(locale, "col_gap")}</th>
                </tr>
              </thead>
              <tbody data-testid="numerology-compare-table">
                {compareRows(castA, castB).map((r) => (
                  <tr key={r.id} data-testid={`numerology-compare-row-${r.id}`}>
                    <td data-col="number">{tableCoreLabel(locale, r.id)}</td>
                    <td data-col="a">
                      <ValueCell value={r.a} locale={locale} />
                    </td>
                    <td data-col="b">
                      <ValueCell value={r.b} locale={locale} />
                    </td>
                    <td data-col="gap" className="font-mono tabular-nums">
                      {r.gap?.number ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : null}
        </>
      )}
    </div>
  );
}

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33] as const;

/** What each number stands for; a row opens its reading. */
function NumbersPart({ locale, selectedId, onSelect }: { locale: AppLocale } & Pick) {
  const pack = usePack("num", locale);
  return (
    <div className="ulune-num-part">
      <DataTable stickyFirst={false} className="ulune-num-numbers">
        <thead>
          <tr>
            <th data-col="number">{p(locale, "col_number")}</th>
            <th data-col="keywords">{p(locale, "col_keywords")}</th>
            <th data-col="meaning">{p(locale, "col_meaning")}</th>
          </tr>
        </thead>
        <tbody>
          {NUMBERS.map((n) => {
            const ref = `number:${n}`;
            const on = selectedId === ref;
            const text = pack?.NUMBER_TEXT[n];
            return (
              <tr
                key={n}
                data-testid={`num-number-${n}`}
                data-selected={on ? "1" : undefined}
                className={cn("cursor-pointer", on && "bg-bg-subtle")}
                onClick={() => onSelect(ref)}
                {...previewProps(ref)}
              >
                <td data-col="number">
                  <button type="button" className="ulune-row-pick font-mono tabular-nums" aria-pressed={on}>
                    {n}
                  </button>
                </td>
                <td data-col="keywords">{text ? pickBi(text.keywords, locale) : ""}</td>
                <td data-col="meaning">{text ? pickBi(text.what, locale) : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      <p className="ulune-num-note">{p(locale, "mastersNote")}</p>
    </div>
  );
}
