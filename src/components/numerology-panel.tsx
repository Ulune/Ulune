import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { NumerologyHello } from "@/components/numerology-hello";
import {
  NUMEROLOGY_DASH,
  castNumerology,
  formatNumerologyDigit,
  formatNumerologyMaster,
  formatNumerologyNumber,
  givenBirthName,
  valueOfCore,
  type NumerologyChart,
  type NumerologyCoreId,
} from "@/lib/chart/numerology";
import { chartDisplayName, type SavedChart } from "@/lib/chart/library";
import { numerologyCoreLabel } from "@/lib/i18n/numerology-ui";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { coerceBodiesPage } from "@/studio/bodies-pages";
import { coerceLookPage } from "@/studio/look-pages";
import {
  NUMEROLOGY_PAGE_LABEL,
  NUMEROLOGY_PAGES,
  coerceNumerologyPage,
  loadNumerologyPage,
  saveNumerologyPage,
  type NumerologyPage,
} from "@/studio/numerology-pages";
import { useModeData } from "@/studio/modes/data";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import { studioSearch } from "@/studio/url";
import { pickBi, type Bi } from "@/lib/content/types";
import { onTablistKeyDown } from "@/lib/a11y/tablist";

function cycleText(table: Record<number, Bi> | undefined, n: number | null, locale: "en" | "fr") {
  return table && n != null ? pickBi(table[n], locale) : "";
}

const CORE_ROWS: NumerologyCoreId[] = [
  "lifepath",
  "expression",
  "soulurge",
  "personality",
  "birthday",
  "maturity",
  "personalYear",
];

const NAME_CORES = new Set<NumerologyCoreId>(["expression", "soulurge", "personality", "maturity"]);

const TEACH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33] as const;

export function NumerologyPanel() {
  const { t, locale } = useI18n();
  const w = useWheelView();
  const numerology = useModeData("numerology");
  const chart = useStudioStore((s) => s.chart);
  const birthName = useStudioStore((s) => s.input.name);
  const rows = useStudioStore((s) => s.rows);
  const openDock = useStudioStore((s) => s.openDock);
  const studioPage = useStudioStore((s) => s.page);
  const studioView = useStudioStore((s) => s.view);

  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const urlNum = coerceNumerologyPage(search.num);

  const [page, setPageState] = useState<NumerologyPage>(() => urlNum ?? loadNumerologyPage());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [teachN, setTeachN] = useState(1);

  useLayoutEffect(() => {
    if (urlNum && urlNum !== page) setPageState(urlNum);
  }, [urlNum, page]);

  const writeSearch = useCallback(
    (nextPage: NumerologyPage, numa?: string, numb?: string) => {
      void navigate({
        to: "/",
        search: studioSearch(
          studioPage,
          studioView,
          undefined,
          coerceBodiesPage(search.bodies),
          coerceLookPage(search.look),
          nextPage,
          numa,
          numb,
        ),
        replace: true,
      });
    },
    [navigate, studioPage, studioView, search.bodies, search.look],
  );

  // No auto-write of `num=` (Bodies/Look only write in setPage). A layout
  // effect that navigated whenever search.num !== page fought the optimistic
  // setPage update and froze Data tab clicks on the main thread.

  const setPage = useCallback(
    (next: NumerologyPage) => {
      setPageState(next);
      saveNumerologyPage(next);
      writeSearch(next, search.numa, search.numb);
    },
    [writeSearch, search.numa, search.numb],
  );

  const setCompareIds = useCallback(
    (numa?: string, numb?: string) => {
      writeSearch(page, numa, numb);
    },
    [writeSearch, page],
  );

  const modeNumbers = numerology?.numbers ?? null;
  const numbers = useMemo(() => {
    if (!chart) return modeNumbers;
    return (
      castNumerology(chart, {
        name: givenBirthName(birthName, chart),
        calendarYear,
      }) ?? modeNumbers
    );
  }, [chart, birthName, calendarYear, modeNumbers]);

  if (!numbers) return null;
  const named = Boolean(numbers.name);

  return (
    <div
      data-testid="numerology-panel"
      data-num-page={page}
      className="flex min-h-0 min-w-0 flex-col gap-[var(--space-3)]"
    >
      <div
        className="flex min-w-0 flex-wrap items-stretch border-b border-border"
        role="tablist"
        aria-label={t("pageNumerology")}
        onKeyDown={(e) => onTablistKeyDown(e, true)}
      >
        {NUMEROLOGY_PAGES.map((id) => {
          const on = page === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              data-testid={`num-page-${id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setPage(id)}
              className={cn(
                "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 px-1.5 text-xs sm:px-2 sm:text-xs",
                on
                  ? "ob-subtab-on"
                  : "text-fg-muted",
              )}
            >
              <span className="truncate">{t(NUMEROLOGY_PAGE_LABEL[id])}</span>
            </button>
          );
        })}
      </div>

      <details className="ob-rc-about" data-testid="numerology-teach-method">
        <summary>{t("numerologyMethodTitle")}</summary>
        <p className="ob-rc-p">{t("numerologyTeachMethod")}</p>
      </details>

      {page === "overview" ? (
        <Overview
          chart={numbers}
          named={named}
          selectedId={w.selectedId}
          onSelect={w.pick}
          openBirth={() => openDock("birth")}
        />
      ) : null}
      {page === "cores" ? (
        <Cores
          chart={numbers}
          named={named}
          locale={locale}
          selectedId={w.selectedId}
          onSelect={w.pick}
          openBirth={() => openDock("birth")}
        />
      ) : null}
      {page === "timing" ? (
        <Timing
          chart={numbers}
          locale={locale}
          calendarYear={calendarYear}
          setCalendarYear={setCalendarYear}
          selectedId={w.selectedId}
          onSelect={w.pick}
        />
      ) : null}
      {page === "compare" ? (
        <Compare
          rows={rows}
          numa={typeof search.numa === "string" ? search.numa : undefined}
          numb={typeof search.numb === "string" ? search.numb : undefined}
          setCompareIds={setCompareIds}
          calendarYear={calendarYear}
          locale={locale}
        />
      ) : null}
      {page === "numbers" ? (
        <Numbers
          locale={locale}
          teachN={teachN}
          setTeachN={setTeachN}
          onSelect={(n) => w.pick(`number:${n}`)}
        />
      ) : null}
    </div>
  );
}

function NameGate({ openBirth }: { openBirth: () => void }) {
  const { t } = useI18n();
  return (
    <div
      data-testid="numerology-name-gate"
      className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-fg-muted"
    >
      <p>{t("numerologyAddBirthNameHint")}</p>
      <button
        type="button"
        data-testid="numerology-add-birth-name"
        className="mt-2 inline-flex min-h-11 items-center underline"
        onClick={openBirth}
      >
        {t("numerologyAddBirthName")}
      </button>
    </div>
  );
}

function Overview({
  chart,
  named,
  selectedId,
  onSelect,
  openBirth,
}: {
  chart: NumerologyChart;
  named: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  openBirth: () => void;
}) {
  return (
    <div data-testid="numerology-overview" className="flex flex-col gap-[var(--space-3)]">
      {!named ? <NameGate openBirth={openBirth} /> : null}
      <NumerologyHello chart={chart} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}

function Cores({
  chart,
  named,
  locale,
  selectedId,
  onSelect,
  openBirth,
}: {
  chart: NumerologyChart;
  named: boolean;
  locale: "en" | "fr";
  selectedId: string | null;
  onSelect: (id: string) => void;
  openBirth: () => void;
}) {
  return (
    <div data-testid="numerology-cores" className="flex flex-col gap-[var(--space-3)]">
      {!named ? <NameGate openBirth={openBirth} /> : null}
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm" data-testid="numerology-cores-table">
          <thead>
            <tr className="border-b border-border text-left text-fg-muted">
              <th className="px-3 py-2">Core</th>
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Digit</th>
            </tr>
          </thead>
          <tbody>
            {CORE_ROWS.map((id) => {
              const value = valueOfCore(chart, id);
              const missing = NAME_CORES.has(id) && value.number == null;
              const selectId = `core:${id}`;
              return (
                <tr
                  key={id}
                  data-testid={`numerology-core-row-${id}`}
                  data-selected={selectedId === selectId ? "1" : undefined}
                  className={cn(
                    value.number != null && "cursor-pointer",
                    selectedId === selectId && "bg-bg-subtle",
                  )}
                  onClick={() => {
                    if (value.number != null) onSelect(selectId);
                  }}
                >
                  <td className="px-3 py-2.5">{numerologyCoreLabel(locale, id)}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums" data-missing={missing ? "1" : undefined}>
                    {missing ? NUMEROLOGY_DASH : formatNumerologyMaster(value)}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">
                    {formatNumerologyDigit(value, NUMEROLOGY_DASH)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Timing({
  chart,
  locale,
  calendarYear,
  setCalendarYear,
  selectedId,
  onSelect,
}: {
  chart: NumerologyChart;
  locale: "en" | "fr";
  calendarYear: number;
  setCalendarYear: (y: number) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  // The cycle texts come with the numerology pack (its own download).
  const pack = usePack("num", locale);
  return (
    <div data-testid="numerology-timing" className="flex flex-col gap-[var(--space-3)]">
      <label className="flex max-w-[12rem] flex-col gap-1 text-sm">
        <span className="text-fg-muted">Year</span>
        <input
          type="number"
          data-testid="numerology-year-picker"
          className="min-h-11 w-full rounded-md border border-border bg-bg px-3 text-fg"
          value={calendarYear}
          onChange={(e) => {
            const y = Number(e.target.value);
            if (Number.isFinite(y) && y >= 1 && y <= 9999) setCalendarYear(Math.trunc(y));
          }}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          data-testid="numerology-timing-year"
          onClick={() => onSelect("core:personalYear")}
          className={cn(
            "min-h-11 rounded-md border border-border px-3 py-3 text-left",
            selectedId === "core:personalYear" && "bg-bg-subtle",
          )}
        >
          <p className="text-xs uppercase tracking-wide text-fg-subtle">
            {numerologyCoreLabel(locale, "personalYear")}
          </p>
          <p className="mt-1 font-display text-3xl tabular-nums text-fg">
            {formatNumerologyNumber(chart.personalYear)}
          </p>
        </button>
        <div data-testid="numerology-timing-month" className="rounded-md border border-border px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-fg-subtle">{t("numerologyPersonalMonth")}</p>
          <p className="mt-1 font-display text-3xl tabular-nums text-fg">
            {formatNumerologyNumber(chart.personalMonth)}
          </p>
          <p className="mt-2 text-xs text-fg-muted">{cycleText(pack?.PERSONAL_MONTH_TEXT, chart.personalMonth.digit, locale) || t("numerologyTeachPersonalMonth")}</p>
        </div>
        <div data-testid="numerology-timing-day" className="rounded-md border border-border px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-fg-subtle">{t("numerologyPersonalDay")}</p>
          <p className="mt-1 font-display text-3xl tabular-nums text-fg">
            {formatNumerologyNumber(chart.personalDay)}
          </p>
          <p className="mt-2 text-xs text-fg-muted">{cycleText(pack?.PERSONAL_DAY_TEXT, chart.personalDay.digit, locale) || t("numerologyTeachPersonalDay")}</p>
        </div>
      </div>

      <div
        data-testid="numerology-universal-year"
        className="rounded-md border border-border bg-bg-subtle px-3 py-3"
      >
        <p className="text-xs uppercase tracking-wide text-fg-subtle">{t("numerologyUniversalYear")}</p>
        <p className="mt-1 font-display text-3xl tabular-nums text-fg">
          {formatNumerologyNumber(chart.universalYear)}
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          {cycleText(pack?.UNIVERSAL_YEAR_TEXT, chart.universalYear.digit, locale)}{" "}
          <span className="text-fg-subtle">{t("numerologyTeachUniversalYear")}</span>
        </p>
      </div>
    </div>
  );
}

function Compare({
  rows,
  numa,
  numb,
  setCompareIds,
  calendarYear,
  locale,
}: {
  rows: SavedChart[];
  numa?: string;
  numb?: string;
  setCompareIds: (a?: string, b?: string) => void;
  calendarYear: number;
  locale: "en" | "fr";
}) {
  const { t } = useI18n();

  if (rows.length < 2) {
    return (
      <div
        data-testid="numerology-compare-empty"
        className="rounded-md border border-dashed border-border px-3 py-6"
      >
        <p className="font-display text-xl text-fg">{t("numerologyEmptyCompare")}</p>
        <p className="mt-2 text-sm text-fg-muted">{t("numerologyEmptyCompareHint")}</p>
      </div>
    );
  }

  const aId = numa && rows.some((r) => r.id === numa) ? numa : rows[0]!.id;
  const bId =
    numb && rows.some((r) => r.id === numb) && numb !== aId
      ? numb
      : rows.find((r) => r.id !== aId)?.id;
  const rowA = rows.find((r) => r.id === aId);
  const rowB = bId ? rows.find((r) => r.id === bId) : undefined;

  const castA = rowA
    ? castNumerology(rowA.chart, {
        name: givenBirthName(rowA.input.name, rowA.chart),
        calendarYear,
      })
    : null;
  const castB = rowB
    ? castNumerology(rowB.chart, {
        name: givenBirthName(rowB.input.name, rowB.chart),
        calendarYear,
      })
    : null;

  const bridge = new Set<number>();
  if (castA && castB) {
    for (const id of CORE_ROWS) {
      const da = valueOfCore(castA, id).digit;
      const db = valueOfCore(castB, id).digit;
      if (da != null && db != null && da === db) bridge.add(da);
    }
  }

  return (
    <div data-testid="numerology-compare" className="flex flex-col gap-[var(--space-3)]">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">{t("numerologyPersonA")}</span>
          <select
            data-testid="numerology-compare-a"
            className="min-h-11 rounded-md border border-border bg-bg px-2"
            value={aId}
            onChange={(e) => setCompareIds(e.target.value || undefined, bId)}
          >
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {chartDisplayName(r.input)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">{t("numerologyPersonB")}</span>
          <select
            data-testid="numerology-compare-b"
            className="min-h-11 rounded-md border border-border bg-bg px-2"
            value={bId ?? ""}
            onChange={(e) => setCompareIds(aId, e.target.value || undefined)}
          >
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {chartDisplayName(r.input)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[28rem] text-sm" data-testid="numerology-compare-table">
          <thead>
            <tr className="border-b border-border text-left text-fg-muted">
              <th className="px-3 py-2">Core</th>
              <th className="px-3 py-2">
                {rowA ? chartDisplayName(rowA.input) : t("numerologyPersonA")}
              </th>
              <th className="px-3 py-2">
                {rowB ? chartDisplayName(rowB.input) : t("numerologyPersonB")}
              </th>
            </tr>
          </thead>
          <tbody>
            {CORE_ROWS.map((id) => (
              <tr key={id} data-testid={`numerology-compare-row-${id}`} className="max-md:block">
                <td className="px-3 py-2.5 max-md:block max-md:pt-3">{numerologyCoreLabel(locale, id)}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums max-md:block">
                  {castA ? formatNumerologyMaster(valueOfCore(castA, id)) : NUMEROLOGY_DASH}
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums max-md:block max-md:pb-3">
                  {castB ? formatNumerologyMaster(valueOfCore(castB, id)) : NUMEROLOGY_DASH}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div data-testid="numerology-bridge" className="rounded-md border border-border px-3 py-3">
        <p className="text-xs uppercase tracking-wide text-fg-subtle">{t("numerologyBridge")}</p>
        <p className="mt-1 font-mono text-lg tabular-nums text-fg">
          {bridge.size ? [...bridge].sort((a, b) => a - b).join(" · ") : NUMEROLOGY_DASH}
        </p>
        <p className="mt-2 text-sm text-fg-muted">{t("numerologyTeachBridge")}</p>
      </div>
    </div>
  );
}

function Numbers({
  locale,
  teachN,
  setTeachN,
  onSelect,
}: {
  locale: "en" | "fr";
  teachN: number;
  setTeachN: (n: number) => void;
  onSelect: (n: number) => void;
}) {
  const pack = usePack("num", locale);
  const paragraphs = pack ? pack.numerologyNumberParagraphs(locale, teachN) : [];
  return (
    <div data-testid="numerology-numbers" className="flex flex-col gap-[var(--space-3)]">
      <div className="flex flex-wrap gap-2" role="list">
        {TEACH_NUMBERS.map((n) => (
          <button
            key={n}
            type="button"
            role="listitem"
            data-testid={`numerology-teach-num-${n}`}
            aria-pressed={teachN === n}
            onClick={() => {
              setTeachN(n);
              onSelect(n);
            }}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center ulune-chip-radius border border-border px-2 font-mono text-sm",
              teachN === n && "bg-bg-subtle",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <article data-testid="numerology-teach-body" className="rounded-md border border-border px-4 py-4">
        <h4 className="font-display text-2xl text-fg">{teachN}</h4>
        {paragraphs.map((p, i) => (
          <p key={i} className="mt-3 text-sm leading-relaxed text-fg-muted">
            {p}
          </p>
        ))}
      </article>
    </div>
  );
}
