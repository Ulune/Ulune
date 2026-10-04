import { CalendarDays, CalendarSearch, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import type { IcsKind } from "@/lib/i18n/calendar-export";
import { AnchoredPopover } from "@/components/anchored-popover";
import { LoadingLines } from "@/components/loading-lines";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { zoneCity, zoneOffset, type CalendarZone } from "@/lib/chart/calendar-prefs";
import { scopeBounds, utcFromCivil, type CivilDate } from "@/lib/chart/timing-window";
import type { TimingScope } from "@/lib/chart/transit-exact";
import { CALENDAR_UI, fill } from "@/lib/i18n/calendar-words";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { timingScopeLabel } from "@/lib/i18n/timing-ui";
import { dateFormat } from "@/lib/intl-cache";
import { cn } from "@/lib/utils";

function caption(scope: TimingScope, civil: CivilDate, locale: "en" | "fr", short = false): string {
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const at = Date.UTC(civil.year, civil.month - 1, civil.day, 12);
  if (scope === "year") return String(civil.year);
  // A day of another year says its year.
  const year = civil.year !== new Date().getFullYear() ? { year: "numeric" as const } : {};
  const text =
    scope === "day"
      ? dateFormat(loc, { timeZone: "UTC", weekday: short ? "short" : "long", day: "numeric", month: short ? "short" : "long", ...year }).format(at)
      : dateFormat(loc, { timeZone: "UTC", month: short ? "short" : "long", year: "numeric" }).format(at);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Day, month or year: in the stage's strip, next to the pages of Time (and above the table). */
export function CalendarScope({ scope, onScope }: { scope: TimingScope; onScope: (next: TimingScope) => void }) {
  const { locale, t } = useI18n();
  return (
    <div className="ulune-cal-scope" data-testid="calendar-scope">
      <SegmentedToggle
        ariaLabel={t("pageTiming")}
        value={scope}
        onChange={onScope}
        options={(["day", "month", "year"] as const).map((id) => ({
          value: id,
          testId: `timing-scope-${id}`,
          label: timingScopeLabel(locale, id),
        }))}
      />
    </div>
  );
}

/**
 * The calendar's bar: the period with its arrows and Today, then the clock
 * the times follow and the two switches (the sky, your transits). On a phone
 * the clock and switches move under the month (calendar.css).
 */
/**
 * The zone's offset over the period shown, not today's (review 3 Oct, T3):
 * "UTC+1" in November, "UTC+2 → UTC+1" for a month or day the clocks go back
 * in, "UTC+1 / UTC+2" for a year with summer time.
 */
function periodOffset(zone: string, scope: TimingScope, civil: CivilDate): string {
  if (scope === "year") {
    const winter = zoneOffset(zone, utcFromCivil({ year: civil.year, month: 1, day: 15, hour: 12, minute: 0 }, zone).getTime());
    const summer = zoneOffset(zone, utcFromCivil({ year: civil.year, month: 7, day: 15, hour: 12, minute: 0 }, zone).getTime());
    return winter === summer ? winter : `${winter} / ${summer}`;
  }
  const b = scopeBounds(scope, civil, zone);
  const from = zoneOffset(zone, b.from.getTime());
  const to = zoneOffset(zone, b.to.getTime() - 1);
  return from === to ? from : `${from} → ${to}`;
}

/**
 * The calendar file and what it holds (review 3 Oct, T5): the sky's main
 * events, with your transits from Mars outwards, or everything shown.
 */
export function IcsMenu({
  onExport,
  loading = false,
  className,
  testId,
  children,
}: {
  onExport: (kind: IcsKind) => void;
  loading?: boolean;
  className: string;
  testId: string;
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const hint = pick(loading ? CALENDAR_UI.switches.fileWait : CALENDAR_UI.switches.fileHint, locale);
  const kinds: IcsKind[] = ["main", "mine", "all"];
  return (
    <span ref={box} className="ulune-ics-menu">
      <button
        type="button"
        data-testid={testId}
        className={className}
        onClick={() => setOpen((x) => !x)}
        disabled={loading}
        aria-busy={loading || undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        title={hint}
        aria-label={hint}
      >
        {children}
      </button>
      {open ? (
        <span role="menu" className="ob-menu ulune-ics-pop" data-testid={`${testId}-menu`}>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="menuitem"
              className="ob-menu-item"
              data-testid={`${testId}-${k}`}
              onClick={() => {
                setOpen(false);
                onExport(k);
              }}
            >
              {pick(CALENDAR_UI.switches.icsKind[k], locale)}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

// The month picker the birth form uses (its own download).
const loadPicker = () => import("./birth-calendar");
const BirthCalendar = lazyNamed(loadPicker, "BirthCalendar");

/** Any date, straight away (review 3 Oct, T9): the same calendar as the birth form's, with its month and year lists. */
function DateJump({ civil, onJump, label, locale }: { civil: CivilDate; onJump: (next: CivilDate) => void; label: string; locale: "en" | "fr" }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const day = new Date(civil.year, civil.month - 1, civil.day);
  const [month, setMonth] = useState(day);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-testid="calendar-jump"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="ob-icon-btn ob-icon-btn--quiet"
        onPointerEnter={() => prefetch(loadPicker)}
        onFocus={() => prefetch(loadPicker)}
        onClick={() => {
          setMonth(day);
          setOpen((x) => !x);
        }}
      >
        <CalendarSearch className="size-4" aria-hidden />
      </button>
      <AnchoredPopover
        open={open}
        anchorRef={trigger}
        onClose={() => setOpen(false)}
        id="calendar-jump-pop"
        testId="calendar-jump-pop"
        role="dialog"
        aria-label={label}
        hideLabel={label}
        align="start"
        width={21 * 16}
      >
        <div className="rounded-md border border-border bg-bg-elevated p-[var(--space-3)] shadow-lg">
          <Suspense fallback={<LoadingLines lines={5} />}>
            <BirthCalendar
              locale={locale}
              month={month}
              onMonthChange={setMonth}
              selected={day}
              onPick={(d) => {
                onJump({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
                setOpen(false);
              }}
            />
          </Suspense>
        </div>
      </AnchoredPopover>
    </>
  );
}

export function CalendarBar({
  scope,
  civil,
  onShift,
  onToday,
  zone,
  zones,
  onZone,
  nowMs: _nowMs,
  showSky,
  showYours,
  onSky,
  onYours,
  onExport,
  loading = false,
  table = false,
  num = null,
  numOn = false,
  onNum,
  onJump,
}: {
  scope: TimingScope;
  civil: CivilDate;
  onShift: (dir: 1 | -1) => void;
  onToday: () => void;
  zone: CalendarZone;
  /** The IANA zone each choice stands for (device, birth place, UT). */
  zones: Record<CalendarZone, string>;
  onZone: (next: CalendarZone) => void;
  nowMs: number;
  showSky: boolean;
  showYours: boolean;
  onSky: (on: boolean) => void;
  onYours: (on: boolean) => void;
  /** Save the period shown as a calendar file (.ics), holding the main events, with your transits, or everything. */
  onExport: (kind: IcsKind) => void;
  /** The period is still arriving: the file waits for it. */
  loading?: boolean;
  /** Over the table, which has its own filters and export: the period and the clock only. */
  table?: boolean;
  /** Your numerology for the period shown, "Personal month 4" (with your transits on), and its reading's id. */
  num?: { id: string; text: string } | null;
  numOn?: boolean;
  onNum?: (id: string) => void;
  /** Go to any date, keeping the view (day, month or year). */
  onJump?: (next: CivilDate) => void;
}) {
  const { locale, t } = useI18n();
  const z = CALENDAR_UI.zone;
  const current = zones[zone];
  // A device set to UTC says so the same way as the UT choice.
  const ut = zone === "utc" || current === "UTC" || current === "Etc/UTC";
  const zoneLine = ut ? pick(z.ut, locale) : `${fill(z.cityTime, locale, { city: zoneCity(current) })} · ${periodOffset(current, scope, civil)}`;
  return (
    <div data-testid="timing-scope" className="ulune-cal-bar">
      <div className="ulune-cal-caption">
        <button type="button" data-testid="timing-prev" aria-label={t("periodPrev")} onClick={() => onShift(-1)} className="ob-icon-btn ob-icon-btn--quiet">
          <ChevronLeft className="size-4" />
        </button>
        <p data-testid="timing-caption" className="ulune-cal-title" aria-live="polite">
          <span className="ulune-cal-title-long">{caption(scope, civil, locale)}</span>
          {/* On a phone the short form (“Wed 30 Sept”, “Sept 2026”): the long one cut its year. */}
          {scope !== "year" ? <span className="ulune-cal-title-short">{caption(scope, civil, locale, true)}</span> : null}
          {num ? (
            <button
              type="button"
              className={cn("ulune-cal-title-num", numOn && "is-on")}
              data-testid="calendar-num"
              aria-pressed={numOn}
              onClick={() => onNum?.(num.id)}
            >
              {num.text}
            </button>
          ) : null}
        </p>
        <button type="button" data-testid="timing-next" aria-label={t("periodNext")} onClick={() => onShift(1)} className="ob-icon-btn ob-icon-btn--quiet">
          <ChevronRight className="size-4" />
        </button>
        {onJump ? <DateJump civil={civil} onJump={onJump} label={t("calendarJump")} locale={locale} /> : null}
        <button type="button" data-testid="calendar-today" onClick={onToday} className="ulune-cal-chip ulune-cal-today">
          {pick(CALENDAR_UI.switches.today, locale)}
        </button>
      </div>
      <div className="ulune-cal-options">
        <label className="ulune-cal-zone" data-testid="calendar-zone">
          <span className="ulune-cal-zone-line" data-testid="calendar-zone-line">
            {zoneLine}
          </span>
          {/* The menu's own width stays inside the words (Safari sizes it to its longest choice). */}
          <span className="ulune-cal-zone-hit">
            <select
              aria-label={pick(z.menu, locale)}
              value={zone}
              onChange={(e) => onZone(e.target.value as CalendarZone)}
              data-testid="calendar-zone-select"
            >
              <option value="device">{fill(z.device, locale, { city: zoneCity(zones.device) })}</option>
              <option value="birth">{fill(z.birth, locale, { city: zoneCity(zones.birth) })}</option>
              <option value="utc">{pick(z.utc, locale)}</option>
            </select>
          </span>
        </label>
        <div className="ulune-cal-switches" hidden={table}>
          <button type="button" data-testid="calendar-switch-sky" aria-pressed={showSky} onClick={() => onSky(!showSky)} className={cn("ulune-cal-chip", showSky && "is-on")}>
            <i className="ulune-cal-dot" style={{ background: "var(--color-fg-muted)" }} />
            {pick(CALENDAR_UI.switches.sky, locale)}
          </button>
          <button type="button" data-testid="calendar-switch-yours" aria-pressed={showYours} onClick={() => onYours(!showYours)} className={cn("ulune-cal-chip", showYours && "is-on")}>
            <i className="ulune-cal-dot" style={{ background: "var(--aspect-soft)" }} />
            {pick(CALENDAR_UI.switches.yours, locale)}
          </button>
          <IcsMenu onExport={onExport} loading={loading} className="ulune-cal-chip" testId="calendar-export">
            {loading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <CalendarDays className="size-3.5" aria-hidden />}
            <span className="ulune-cal-file-word">.ics</span>
          </IcsMenu>
        </div>
      </div>
    </div>
  );
}
