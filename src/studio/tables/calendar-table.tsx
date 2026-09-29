import { CalendarDays } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { PairIcon, SkyEventIcon } from "@/components/calendar-icons";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { calendarRows, type CalRow } from "@/lib/chart/calendar-rows";
import type { TransitWindow } from "@/lib/chart/personal-transits";
import type { SkyAspect, SkyEvent } from "@/lib/chart/sky-events";
import { bodyAt, type SkyWindow } from "@/lib/chart/sky-window";
import type { TimingHit, TimingScope } from "@/lib/chart/transit-exact";
import { calendarIcs } from "@/lib/i18n/calendar-export";
import { signWord, skyEventDetail, skyEventTitle, yourAspectWords } from "@/lib/i18n/calendar-words";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { TIMING_TABLE_COLUMN_KEYS, TIMING_UI, timingTableColumns, timingTableEmpty, timingTableHint, timingTableTitle } from "@/lib/i18n/timing-ui";
import { dateFormat } from "@/lib/intl-cache";
import { cn, formatDegree } from "@/lib/utils";
import { downloadText } from "@/lib/download-text";
import { DataTable } from "@/studio/tables/DataTable";

const FIRST_ROWS = 250;
const MORE_ROWS = 250;
const T = TIMING_UI.table;
type Who = "all" | "sky" | "yours";

/** The UT column of Copy and CSV: 2026-09-28 02:48 (the minute it falls in). */
const ut = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

/**
 * The calendar's events table (part 57 of the launch plan): the sky's events
 * and your exacts of the period in time order, when, what, where and for
 * whom; filters; Copy and CSV (with a UT column) and a calendar file (.ics)
 * made on this device. Past rows are dimmed.
 */
export function CalendarTable({
  events,
  hits,
  windows,
  wins,
  from,
  to,
  scope,
  tz,
  nowMs,
  fileName,
  selectedId,
  onSelect,
}: {
  events: readonly SkyEvent[];
  hits: readonly TimingHit[];
  /** Your slow transits within 1° (the calendar file carries them as whole days). */
  windows: readonly TransitWindow[];
  /** The chunks at hand: where the moving planet stands at your exacts. */
  wins: readonly SkyWindow[];
  from: number;
  to: number;
  scope: TimingScope;
  tz: string;
  nowMs: number;
  /** "2026-09", "2026", "2026-09-28". */
  fileName: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [who, setWho] = useState<Who>("all");
  const [moon, setMoon] = useState(scope === "day");
  useEffect(() => setMoon(scope === "day"), [scope]);
  const rows = useMemo(
    () => calendarRows(events, hits, from, to, { sky: who !== "yours", yours: who !== "sky", moon }),
    [events, hits, from, to, who, moon],
  );
  const columns = timingTableColumns(locale);
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  const when = (ms: number) =>
    scope === "day" ? time(ms) : `${dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(ms))} ${time(ms)}`;
  const degree = (lon: number) => `${formatDegree(lon)} ${signWord(Math.floor((((lon % 360) + 360) % 360) / 30), locale)}`;
  const where = (r: CalRow): string => {
    if (r.kind === "sky") {
      const ev = r.ev;
      if (ev.k === "phase" || ev.k === "eclipse" || ev.k === "station") return degree(ev.lon);
      if (ev.k === "ingress") return signWord(ev.sign, locale);
      return "";
    }
    const w = wins.find((x) => r.t >= x.t0 && r.t <= x.t0 + (x.n - 1) * x.step * 3_600_000);
    const at = w ? bodyAt(w, r.hit.moving as Parameters<typeof bodyAt>[1], r.t) : null;
    return at ? degree(at.lon) : "";
  };

  // A year holds hundreds of rows: the first show at once, the rest follow in slices between frames.
  const [shown, setShown] = useState(() => ({ rows, n: Math.min(FIRST_ROWS, rows.length) }));
  const n = shown.rows === rows ? shown.n : Math.min(FIRST_ROWS, rows.length);
  useEffect(() => {
    if (n >= rows.length) return;
    const id = window.setTimeout(() => startTransition(() => setShown({ rows, n: Math.min(rows.length, n + MORE_ROWS) })), 0);
    return () => window.clearTimeout(id);
  }, [rows, n]);
  const visible = n >= rows.length ? rows : rows.slice(0, n);
  const completeNow = () => {
    if (n < rows.length) flushSync(() => setShown({ rows, n: rows.length }));
  };
  const exportIcs = () => {
    const spans = who === "sky" ? [] : windows.filter((w) => w.from < to && w.to >= from);
    const name = `Ulune ${fileName}`;
    downloadText(`ulune-${fileName}.ics`, calendarIcs(rows, spans, locale, tz, name), "text/calendar;charset=utf-8");
  };

  return (
    <section data-testid="timing-table" className="ulune-panel min-w-0 overflow-hidden">
      <header className="flex flex-col gap-[var(--space-3)] border-b border-border px-[var(--space-4)] py-[var(--space-3)] md:px-[var(--space-5)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none text-fg">{timingTableTitle(locale)}</h2>
          <p className="mt-[var(--space-2)] max-w-[61.8ch] text-sm text-fg-muted">{timingTableHint(locale)}</p>
        </div>
        <div className="ulune-cal-table-filters">
          <SegmentedToggle
            ariaLabel={pick(T.filter.label, locale)}
            value={who}
            onChange={setWho}
            options={(["all", "sky", "yours"] as const).map((id) => ({ value: id, testId: `calendar-table-${id}`, label: pick(T.filter[id], locale) }))}
          />
          <label className="ulune-cal-table-moon">
            <input type="checkbox" checked={moon} onChange={(e) => setMoon(e.target.checked)} data-testid="calendar-table-moon" />
            {pick(T.moon, locale)}
          </label>
        </div>
      </header>
      <div className="min-w-0 px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        {rows.length ? (
          <DataTable
            wide
            exportName={`ulune-${fileName}`}
            beforeExport={completeNow}
            extra={
              <button type="button" className="ob-table-export-btn" data-testid="calendar-ics" title={pick(T.icsHint, locale)} onClick={exportIcs}>
                <CalendarDays className="size-3.5" aria-hidden />
                <span>{pick(T.ics, locale)}</span>
              </button>
            }
          >
            <thead>
              <tr data-testid="timing-table-cols">
                {columns.map((label, i) => {
                  const key = TIMING_TABLE_COLUMN_KEYS[i] ?? label.toLowerCase();
                  return (
                    <th key={key} data-col={key} data-testid={`timing-col-${key}`} className={key === "ut" ? "ulune-col-export" : undefined}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const on = selectedId === r.id;
                const title = r.kind === "sky" ? skyEventTitle(r.ev, locale, time) : yourAspectWords(r.hit.moving, r.hit.type as SkyAspect, r.hit.natal, locale);
                const extra = r.kind === "sky" && r.ev.k === "void" ? skyEventDetail(r.ev, locale, degree) : "";
                return (
                  <tr key={r.id} data-testid={`calendar-table-row-${r.kind}`} data-selected={on ? "1" : undefined} className={cn(on && "bg-bg-subtle", r.t < nowMs && "ulune-row-past")}>
                    <td data-col="when" className="font-mono whitespace-nowrap">
                      <button type="button" onClick={() => onSelect(r.id)} className="inline-flex h-11 min-w-0 items-center text-left">
                        {when(r.t)}
                      </button>
                    </td>
                    <td data-col="what">
                      <button type="button" onClick={() => onSelect(r.id)} className="inline-flex min-h-11 min-w-0 items-center gap-2 text-left">
                        <span className="inline-flex shrink-0 text-fg-muted" aria-hidden>
                          {r.kind === "sky" ? <SkyEventIcon ev={r.ev} size={14} /> : <PairIcon a={r.hit.moving} type={r.hit.type as SkyAspect} b={r.hit.natal} size={14} />}
                        </span>
                        <span>
                          {title}
                          {extra ? <span className="block text-xs text-fg-subtle">{extra}</span> : null}
                        </span>
                      </button>
                    </td>
                    <td data-col="where" className="whitespace-nowrap">
                      {where(r)}
                    </td>
                    <td data-col="for">
                      <span className={cn("ulune-cal-tag", r.kind === "you" && "is-you")}>{pick(r.kind === "sky" ? T.everyone : T.you, locale)}</span>
                    </td>
                    <td data-col="ut" className="ulune-col-export">
                      {ut(r.t)}
                    </td>
                  </tr>
                );
              })}
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
