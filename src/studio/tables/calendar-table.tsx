import { CalendarDays } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { PairIcon, SkyEventIcon } from "@/components/calendar-icons";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { periodOf, type Period } from "@/lib/chart/calendar-periods";
import { calendarRows, type CalRow, type NumRow } from "@/lib/chart/calendar-rows";
import type { TransitWindow } from "@/lib/chart/personal-transits";
import type { SkyAspect, SkyEvent } from "@/lib/chart/sky-events";
import { bodyAt, type SkyWindow } from "@/lib/chart/sky-window";
import type { TimingHit, TimingScope } from "@/lib/chart/transit-exact";
import { calendarIcs } from "@/lib/i18n/calendar-export";
import { CALENDAR_UI, numChangeDetail, numChangeTitle, signWord, skyEventDetail, skyEventTitle, yourAspectWords } from "@/lib/i18n/calendar-words";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { TIMING_TABLE_COLUMN_KEYS, TIMING_UI, timingTableColumns, timingTableEmpty, timingTableHint, timingTableTitle } from "@/lib/i18n/timing-ui";
import { dateFormat } from "@/lib/intl-cache";
import { cn, formatDegree } from "@/lib/utils";
import { downloadText } from "@/lib/download-text";
import { DataTable } from "@/studio/tables/DataTable";
import { PartAbout, TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

const FIRST_ROWS = 250;
const MORE_ROWS = 250;
const T = TIMING_UI.table;
type Who = "all" | "sky" | "yours";

/** The UT column of Copy and CSV: 2026-09-28 02:48 (the minute it falls in). */
const ut = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

function csvCell(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * The calendar's events table (parts 57 and 52 of the launch plan): the
 * sky's events and your exacts of the period in time order, when, what,
 * where and for whom, a year's by month and a month's by week, with a bar of
 * links to each; filters; Copy and CSV (with a UT column) and a calendar
 * file (.ics) made on this device. Past rows are dimmed.
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
  num = [],
  loading = false,
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
  /** Numerology's changes on your birthdays (with your transits). */
  num?: readonly NumRow[];
  /** The period is still arriving: Copy, CSV and the file wait for it. */
  loading?: boolean;
}) {
  const { locale, t } = useI18n();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const [who, setWho] = useState<Who>("all");
  const [moon, setMoon] = useState(scope === "day");
  useEffect(() => setMoon(scope === "day"), [scope]);
  const rows = useMemo(
    () => calendarRows(events, hits, from, to, { sky: who !== "yours", yours: who !== "sky", moon }, num),
    [events, hits, from, to, who, moon, num],
  );
  const columns = timingTableColumns(locale);
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  const when = (ms: number) =>
    scope === "day" ? time(ms) : `${dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(ms))} ${time(ms)}`;
  const degree = (lon: number) => `${formatDegree(lon)} ${signWord(Math.floor((((lon % 360) + 360) % 360) / 30), locale)}`;
  const where = (r: CalRow): string => {
    if (r.kind === "num") return "";
    // Where a moving body stands at a moment, from the chunks at hand.
    const lonAt = (body: string, t: number) => {
      const w = wins.find((x) => t >= x.t0 && t <= x.t0 + (x.n - 1) * x.step * 3_600_000);
      return w ? (bodyAt(w, body as Parameters<typeof bodyAt>[1], t)?.lon ?? null) : null;
    };
    if (r.kind === "sky") {
      const ev = r.ev;
      if (ev.k === "phase" || ev.k === "eclipse" || ev.k === "station") return degree(ev.lon);
      if (ev.k === "ingress") return signWord(ev.sign, locale);
      // Two moving bodies: where each stands (review 3 Oct, B6).
      if (ev.k === "aspect") {
        const a = lonAt(ev.a, ev.t);
        const b = lonAt(ev.b, ev.t);
        return a != null && b != null ? `${degree(a)} – ${degree(b)}` : "";
      }
      return "";
    }
    const at = lonAt(r.hit.moving, r.t);
    return at != null ? degree(at) : "";
  };
  const title = (r: CalRow) =>
    r.kind === "sky"
      ? skyEventTitle(r.ev, locale, time)
      : r.kind === "num"
        ? numChangeTitle(r.change, locale)
        : yourAspectWords(r.hit.moving, r.hit.type as SkyAspect, r.hit.natal, locale);
  const detail = (r: CalRow) =>
    r.kind === "sky" && r.ev.k === "void" ? skyEventDetail(r.ev, locale, degree) : r.kind === "num" ? numChangeDetail(r.change, locale) : "";
  const forWho = (r: CalRow) => pick(r.kind === "sky" ? T.everyone : T.you, locale);
  /** A cycle's change has no hour: the whole birthday. */
  const whenOf = (r: CalRow) =>
    r.kind === "num"
      ? `${scope === "day" ? "" : `${dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(r.t))} `}${pick(CALENDAR_UI.num.birthday, locale)}`
      : when(r.t);
  const what = (r: CalRow) => {
    const extra = detail(r);
    return extra ? `${title(r)} (${extra})` : title(r);
  };

  // A year holds hundreds of rows: the first show at once, the rest follow in slices between frames.
  const [shown, setShown] = useState(() => ({ rows, n: Math.min(FIRST_ROWS, rows.length) }));
  const n = shown.rows === rows ? shown.n : Math.min(FIRST_ROWS, rows.length);
  useEffect(() => {
    if (n >= rows.length) return;
    const id = window.setTimeout(() => startTransition(() => setShown({ rows, n: Math.min(rows.length, n + MORE_ROWS) })), 0);
    return () => window.clearTimeout(id);
  }, [rows, n]);

  // The parts: a year's months, a month's weeks, the day; each with its rows (the ones shown so far).
  const groups = useMemo(() => {
    const out: (Period & { rows: { row: CalRow; index: number }[] })[] = [];
    rows.forEach((row, index) => {
      const p = periodOf(row.t, scope, tz, locale, to - 1);
      const last = out[out.length - 1];
      if (last && last.id === p.id) last.rows.push({ row, index });
      else out.push({ ...p, rows: [{ row, index }] });
    });
    return out;
  }, [rows, scope, tz, locale, to]);

  const line = (r: CalRow) => [whenOf(r), what(r), where(r), forWho(r)].filter(Boolean).join(" · ");
  const csv = () => [[...columns], ...rows.map((r) => [whenOf(r), what(r), where(r), forWho(r), ut(r.t)])].map((r) => r.map(csvCell).join(",")).join("\n");
  const text = () => [timingTableTitle(locale), ...groups.map((g) => [g.heading, ...g.rows.map((x) => line(x.row))].join("\n"))].join("\n\n");
  const exportIcs = () => {
    const spans = who === "sky" ? [] : windows.filter((w) => w.from < to && w.to >= from);
    const name = `Ulune ${fileName}`;
    downloadText(`ulune-${fileName}.ics`, calendarIcs(rows, spans, locale, tz, name), "text/calendar;charset=utf-8");
  };

  const table = (list: { row: CalRow; index: number }[]) => (
    <DataTable className="ulune-cal-rows" stickyFirst={false}>
      <thead>
        <tr>
          {columns.slice(0, TIMING_TABLE_COLUMN_KEYS.indexOf("ut")).map((label, i) => (
            <th key={TIMING_TABLE_COLUMN_KEYS[i]} data-col={TIMING_TABLE_COLUMN_KEYS[i]}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {list.map(({ row: r }) => {
          const on = selectedId === r.id;
          const extra = detail(r);
          return (
            <tr key={r.id} data-testid={`calendar-table-row-${r.kind}`} data-selected={on ? "1" : undefined} className={cn(on && "bg-bg-subtle", r.t < nowMs && "ulune-row-past")}>
              <td data-col="when" className="font-mono whitespace-nowrap">
                <button type="button" onClick={() => onSelect(r.id)} className="inline-flex h-11 min-w-0 items-center text-left">
                  {whenOf(r)}
                </button>
              </td>
              <td data-col="what">
                <button type="button" onClick={() => onSelect(r.id)} className="inline-flex min-h-11 min-w-0 items-center gap-2 text-left">
                  <span className="inline-flex shrink-0 text-fg-muted" aria-hidden>
                    {r.kind === "sky" ? (
                      <SkyEventIcon ev={r.ev} size={14} />
                    ) : r.kind === "num" ? (
                      <span className="ulune-cal-numbadge">{r.change.value.number}</span>
                    ) : (
                      <PairIcon a={r.hit.moving} type={r.hit.type as SkyAspect} b={r.hit.natal} size={14} />
                    )}
                  </span>
                  <span>
                    {title(r)}
                    {extra ? <span className="block text-xs text-fg-subtle">{extra}</span> : null}
                  </span>
                </button>
              </td>
              <td data-col="where" className="whitespace-nowrap">
                {where(r)}
              </td>
              <td data-col="for">
                <span className={cn("ulune-cal-tag", r.kind !== "sky" && "is-you")}>{forWho(r)}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );

  const parts: TablePart[] = groups.length
    ? groups.map((g) => ({
        id: g.id,
        label: g.label,
        heading: g.heading,
        copyText: () => [g.heading, ...g.rows.map((x) => line(x.row))].join("\n"),
        // The period as one table (review 3 Oct, B2, B3).
        table: () => [[...columns], ...g.rows.map(({ row: r }) => [whenOf(r), what(r), where(r), forWho(r), ut(r.t)])],
        children: table(g.rows.filter((x) => x.index < n)),
      }))
    : [
        {
          id: "none",
          label: timingTableTitle(locale),
          children: (
            <p data-testid="timing-table-empty" className="text-sm text-fg-muted">
              {timingTableEmpty(locale, scope)}
            </p>
          ),
        },
      ];

  const intro = (
    <div className="ulune-cal-table-intro">
      <PartAbout id="calendar" label={timingTableTitle(locale)}>
        <p className="ulune-tpart-hint">{timingTableHint(locale)}</p>
      </PartAbout>
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
    </div>
  );

  return (
    <section data-testid="timing-table" data-scope={scope} className="min-w-0">
      <TablePage
        key={fileName}
        name={`calendar-${fileName}`}
        fileStem={`ulune-${fileName}`}
        label={t("tableSections")}
        parts={parts}
        intro={intro}
        actions={
          <TableActions
            text={text}
            csv={csv}
            fileName={`ulune-${fileName}`}
            disabled={loading}
            extra={
              <button type="button" className="ob-table-export-btn" data-testid="calendar-ics" title={pick(T.icsHint, locale)} onClick={exportIcs} disabled={loading} aria-busy={loading || undefined}>
                <CalendarDays className="size-3.5" aria-hidden />
                <span className="ulune-tbar-act-label">{pick(T.ics, locale)}</span>
              </button>
            }
          />
        }
      />
    </section>
  );
}
