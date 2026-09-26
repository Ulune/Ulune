import { startTransition, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { AspectGlyph, PlanetGlyph } from "@/components/glyphs";
import { DataTable } from "@/studio/tables/DataTable";
import { applyingFromExactDays, timingRowTestId, type TimingHit, type TimingScope } from "@/lib/chart/transit-exact";
import { timingWhen } from "@/lib/chart/timing-window";
import { aspectName, bodyTableLabel } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import {
  TIMING_TABLE_COLUMN_KEYS,
  timingApplyingTitle,
  timingSeparatingTitle,
  timingTableColumns,
  timingTableEmpty,
  timingTableHint,
  timingTableTitle,
} from "@/lib/i18n/timing-ui";

const FIRST_ROWS = 250;
const MORE_ROWS = 250;

export function TimingTable({
  hits,
  scope,
  tz,
  selectedId,
  onSelect,
  nowMs,
}: {
  hits: TimingHit[];
  scope: TimingScope;
  tz: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  nowMs: number;
}) {
  const { locale } = useI18n();
  const columns = timingTableColumns(locale);
  const whenKind = scope === "day" ? "time" : "table";
  // A year holds some 2,800 exacts: the first rows show at once and the rest
  // follow in slices between frames (one render of them all held the page for
  // about a second on the test machine). A day or a month fits in the first slice.
  const [shown, setShown] = useState(() => ({ hits, n: Math.min(FIRST_ROWS, hits.length) }));
  const n = shown.hits === hits ? shown.n : Math.min(FIRST_ROWS, hits.length);
  useEffect(() => {
    if (n >= hits.length) return;
    const id = window.setTimeout(() => {
      startTransition(() => setShown({ hits, n: Math.min(hits.length, n + MORE_ROWS) }));
    }, 0);
    return () => window.clearTimeout(id);
  }, [hits, n]);
  const rows = n >= hits.length ? hits : hits.slice(0, n);
  const completeNow = () => {
    if (n < hits.length) flushSync(() => setShown({ hits, n: hits.length }));
  };

  return (
    <section data-testid="timing-table" className="ulune-panel min-w-0 overflow-hidden">
      <header className="flex flex-col gap-[var(--space-3)] border-b border-border px-[var(--space-4)] py-[var(--space-3)] md:px-[var(--space-5)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none text-fg">{timingTableTitle(locale)}</h2>
          <p className="mt-[var(--space-2)] max-w-[61.8ch] text-sm text-fg-muted">{timingTableHint(locale)}</p>
        </div>
      </header>
      <div className="min-w-0 px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        {hits.length ? (
          <DataTable wide exportName="ulune-timing" beforeExport={completeNow}>
              <thead>
                <tr data-testid="timing-table-cols">
                  {columns.map((label, i) => {
                    const key = TIMING_TABLE_COLUMN_KEYS[i] ?? label.toLowerCase();
                    return (
                      <th key={key} data-col={key} data-testid={`timing-col-${key}`}>
                        {label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((hit) => (
                  <TimingRow
                    key={hit.id}
                    hit={hit}
                    when={timingWhen(hit.exactUtc, tz, locale, whenKind)}
                    selected={selectedId === `timing:${hit.id}`}
                    locale={locale}
                    nowMs={nowMs}
                    onSelect={() => onSelect(`timing:${hit.id}`)}
                  />
                ))}
              </tbody>
            </DataTable>
        ) : (
          <p data-testid="timing-table-empty" className="text-sm text-fg-muted">
            {timingTableEmpty(locale, scope)}
          </p>
        )}
      </div>
    </section>
  );
}

function TimingRow({
  hit,
  when,
  selected,
  locale,
  nowMs,
  onSelect,
}: {
  hit: TimingHit;
  when: string;
  selected: boolean;
  locale: "en" | "fr";
  nowMs: number;
  onSelect: () => void;
}) {
  const days = (Date.parse(hit.exactUtc) - nowMs) / 86_400_000;
  const applying = applyingFromExactDays(Number.isFinite(days) ? days : null, null);
  const separating = applying === false;
  const isApplying = applying === true;
  return (
    <tr
      data-testid={timingRowTestId(hit)}
      data-transit={hit.moving}
      data-aspect={hit.type}
      data-natal={hit.natal}
      data-when={hit.exactUtc}
      data-selected={selected ? "1" : undefined}
      className={selected ? "bg-bg-subtle" : undefined}
    >
      <td data-col="when" className="font-mono whitespace-nowrap">
        <button type="button" onClick={onSelect} className="inline-flex h-11 min-w-0 items-center text-left">
          {when}
        </button>
      </td>
      <td data-col="transit">
        <button type="button" onClick={onSelect} className="inline-flex h-11 min-w-0 items-center gap-2 text-left">
          <span className="grid size-5 shrink-0 place-items-center text-fg">
            <PlanetGlyph id={hit.moving} size={14} />
          </span>
          {bodyTableLabel(hit.moving, locale)}
        </button>
      </td>
      <td data-col="aspect">
        <span className="inline-flex items-center gap-1.5">
          <AspectGlyph id={hit.type} size={12} />
          {aspectName(hit.type, locale)}
        </span>
      </td>
      <td data-col="natal">
        <span className="inline-flex items-center gap-2">
          <span className="grid size-5 place-items-center text-fg">
            <PlanetGlyph id={hit.natal} size={14} />
          </span>
          {bodyTableLabel(hit.natal, locale)}
        </span>
      </td>
      <td data-col="a" className="ulune-as-cell">
        {isApplying ? (
          <span title={timingApplyingTitle(locale)} aria-label={timingApplyingTitle(locale)}>
            A
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </td>
      <td data-col="s" className="ulune-as-cell">
        {separating ? (
          <span title={timingSeparatingTitle(locale)} aria-label={timingSeparatingTitle(locale)}>
            S
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </td>
    </tr>
  );
}
