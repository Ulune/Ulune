import { ChevronLeft, ChevronRight } from "lucide-react";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { zoneCity, zoneOffset, type CalendarZone } from "@/lib/chart/calendar-prefs";
import type { CivilDate } from "@/lib/chart/timing-window";
import type { TimingScope } from "@/lib/chart/transit-exact";
import { CALENDAR_UI, fill } from "@/lib/i18n/calendar-words";
import { useI18n } from "@/lib/i18n/locale";
import { pick } from "@/lib/i18n/pick";
import { timingScopeLabel } from "@/lib/i18n/timing-ui";
import { dateFormat } from "@/lib/intl-cache";
import { cn } from "@/lib/utils";

function caption(scope: TimingScope, civil: CivilDate, locale: "en" | "fr"): string {
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const at = Date.UTC(civil.year, civil.month - 1, civil.day, 12);
  if (scope === "year") return String(civil.year);
  const text =
    scope === "day"
      ? dateFormat(loc, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(at)
      : dateFormat(loc, { timeZone: "UTC", month: "long", year: "numeric" }).format(at);
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
export function CalendarBar({
  scope,
  civil,
  onShift,
  onToday,
  zone,
  zones,
  onZone,
  nowMs,
  showSky,
  showYours,
  onSky,
  onYours,
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
}) {
  const { locale, t } = useI18n();
  const z = CALENDAR_UI.zone;
  const current = zones[zone];
  // A device set to UTC says so the same way as the UT choice.
  const ut = zone === "utc" || current === "UTC" || current === "Etc/UTC";
  const zoneLine = ut ? pick(z.ut, locale) : `${fill(z.cityTime, locale, { city: zoneCity(current) })} · ${zoneOffset(current, nowMs)}`;
  return (
    <div data-testid="timing-scope" className="ulune-cal-bar">
      <div className="ulune-cal-caption">
        <button type="button" data-testid="timing-prev" aria-label={t("periodPrev")} onClick={() => onShift(-1)} className="ob-icon-btn ob-icon-btn--quiet">
          <ChevronLeft className="size-4" />
        </button>
        <p data-testid="timing-caption" className="ulune-cal-title" aria-live="polite">
          {caption(scope, civil, locale)}
        </p>
        <button type="button" data-testid="timing-next" aria-label={t("periodNext")} onClick={() => onShift(1)} className="ob-icon-btn ob-icon-btn--quiet">
          <ChevronRight className="size-4" />
        </button>
        <button type="button" data-testid="calendar-today" onClick={onToday} className="ulune-cal-chip">
          {pick(CALENDAR_UI.switches.today, locale)}
        </button>
      </div>
      <div className="ulune-cal-options">
        <label className="ulune-cal-zone" data-testid="calendar-zone">
          <span className="ulune-cal-zone-line" data-testid="calendar-zone-line">
            {zoneLine}
          </span>
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
        </label>
        <div className="ulune-cal-switches">
          <button type="button" data-testid="calendar-switch-sky" aria-pressed={showSky} onClick={() => onSky(!showSky)} className={cn("ulune-cal-chip", showSky && "is-on")}>
            <i className="ulune-cal-dot" style={{ background: "var(--color-fg-muted)" }} />
            {pick(CALENDAR_UI.switches.sky, locale)}
          </button>
          <button type="button" data-testid="calendar-switch-yours" aria-pressed={showYours} onClick={() => onYours(!showYours)} className={cn("ulune-cal-chip", showYours && "is-on")}>
            <i className="ulune-cal-dot" style={{ background: "var(--aspect-soft)" }} />
            {pick(CALENDAR_UI.switches.yours, locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
