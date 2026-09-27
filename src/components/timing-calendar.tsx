import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { PlanetGlyph } from "@/components/glyphs";
import { SegmentedToggle } from "@/components/segmented-toggle";
import type { CivilDate } from "@/lib/chart/timing-window";
import { civilKey, daysInMonth, localHourFraction, mondayIndex } from "@/lib/chart/timing-window";
import type { TimingHit, TimingScope } from "@/lib/chart/transit-exact";
import { ASPECT_COLOR } from "@/lib/chart/constants";
import { aspectLinkPhrase } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { timingScopeLabel } from "@/lib/i18n/timing-ui";
import { cn } from "@/lib/utils";
import { dateFormat } from "@/lib/intl-cache";
import type { MessageKey } from "@/lib/i18n/messages";

/** "242 exact aspects", not a bare number. */
function exactCount(t: (key: MessageKey, vars?: Record<string, string | number>) => string, n: number): string {
  if (n === 0) return t("timingExactNone");
  if (n === 1) return t("timingExactOne");
  return t("timingExactMany", { n });
}

const WEEKDAYS = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  fr: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
};

const MONTHS = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  fr: [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ],
};

function caption(scope: TimingScope, civil: CivilDate, locale: "en" | "fr"): string {
  const months = MONTHS[locale];
  const month = months[civil.month - 1] ?? "";
  if (scope === "day") return `${civil.day} ${month} ${civil.year}`;
  if (scope === "month") return `${month} ${civil.year}`;
  return String(civil.year);
}

export function TimingScopeBar({
  scope,
  civil,
  onScope,
  onShift,
}: {
  scope: TimingScope;
  civil: CivilDate;
  onScope: (next: TimingScope) => void;
  onShift: (dir: 1 | -1) => void;
}) {
  const { locale, t } = useI18n();
  return (
    <div data-testid="timing-scope" className="ulune-timing-scope">
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
      <div className="ulune-timing-caption">
        <button
          type="button"
          data-testid="timing-prev"
          aria-label={t("periodPrev")}
          onClick={() => onShift(-1)}
          className="ob-icon-btn ob-icon-btn--quiet"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p
          data-testid="timing-caption"
          className="min-w-0 flex-1 text-center font-display text-xl leading-none text-fg md:text-2xl"
        >
          {caption(scope, civil, locale)}
        </p>
        <button
          type="button"
          data-testid="timing-next"
          aria-label={t("periodNext")}
          onClick={() => onShift(1)}
          className="ob-icon-btn ob-icon-btn--quiet"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Pack marks into lanes so no two overlap (greedy by time). */
function packLanes(fracs: number[], gap: number): number[] {
  const order = fracs.map((f, i) => [f, i] as const).sort((a, b) => a[0] - b[0]);
  const laneEnd: number[] = [];
  const lanes = new Array<number>(fracs.length).fill(0);
  for (const [f, i] of order) {
    let lane = laneEnd.findIndex((end) => f - end >= gap);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(f);
    } else laneEnd[lane] = f;
    lanes[i] = lane;
  }
  return lanes;
}

export function TimingDayStrip({
  hits,
  tz,
  selectedId,
  onSelectHit,
}: {
  hits: TimingHit[];
  tz: string;
  selectedId: string | null;
  onSelectHit: (hit: TimingHit) => void;
}) {
  const { locale } = useI18n();
  const hours = [0, 6, 12, 18, 24];
  const placed = hits
    .map((hit) => ({ hit, frac: localHourFraction(hit.exactUtc, tz) }))
    .filter((row): row is { hit: TimingHit; frac: number } => row.frac != null);
  const lanes = packLanes(
    placed.map((p) => p.frac),
    0.12,
  );
  const laneCount = Math.max(1, ...lanes.map((l) => l + 1));
  return (
    <div data-testid="timing-strip" className="ulune-timing-strip">
      <div className="ulune-timing-hours" aria-hidden>
        {hours.map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>
      <div className="ulune-timing-track" style={{ height: `${laneCount * 48 + 8}px` }}>
        {placed.map(({ hit, frac }, i) => {
          const id = `timing:${hit.id}`;
          const active = selectedId === id;
          const phrase = aspectLinkPhrase(hit.moving, hit.type, hit.natal, locale);
          return (
            <button
              key={hit.id}
              type="button"
              data-testid={`timing-mark-${hit.moving}-${hit.type}-${hit.natal}`}
              data-when={hit.exactUtc}
              data-hour={String(frac)}
              data-lane={lanes[i]}
              title={phrase}
              aria-label={phrase}
              aria-pressed={active}
              onClick={() => onSelectHit(hit)}
              className={cn("ulune-timing-mark", active && "ulune-timing-mark-on")}
              style={{
                left: `clamp(22px, ${frac * 100}%, calc(100% - 22px))`,
                top: `${4 + (lanes[i] ?? 0) * 48}px`,
                ["--mark-aspect" as string]: ASPECT_COLOR[hit.type],
              }}
            >
              <PlanetGlyph id={hit.moving} size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimingMonthGrid({
  civil,
  hits,
  tz,
  selectedDay,
  onPickDay,
}: {
  civil: CivilDate;
  hits: TimingHit[];
  tz: string;
  selectedDay: string | null;
  onPickDay: (civil: CivilDate) => void;
}) {
  const { locale, t } = useI18n();
  const first: CivilDate = { year: civil.year, month: civil.month, day: 1 };
  const pad = mondayIndex(first);
  const count = daysInMonth(civil.year, civil.month);
  const cells: Array<CivilDate | null> = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: count }, (_, i) => ({ year: civil.year, month: civil.month, day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Grouped once per set of hits, with one formatter (it was one per hit, per render).
  const byDay = useMemo(() => {
    const format = dateFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    const map = new Map<string, TimingHit[]>();
    for (const hit of hits) {
      const t = Date.parse(hit.exactUtc);
      if (!Number.isFinite(t)) continue;
      const key = format.format(new Date(t));
      const list = map.get(key) ?? [];
      list.push(hit);
      map.set(key, list);
    }
    return map;
  }, [hits, tz]);

  return (
    <div data-testid="timing-month" className="ulune-timing-month">
      <div className="ulune-timing-weekdays">
        {WEEKDAYS[locale].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="ulune-timing-grid">
        {cells.map((day, i) => {
          if (!day) {
            return <span key={`e-${i}`} className="ulune-timing-cell is-empty" />;
          }
          const key = civilKey(day);
          const list = byDay.get(key) ?? [];
          const active = selectedDay === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`timing-day-${key}`}
              data-count={list.length}
              aria-label={`${day.day} · ${exactCount(t, list.length)}`}
              aria-pressed={active}
              onClick={() => onPickDay(day)}
              className={cn("ulune-timing-cell", active && "is-on")}
              style={{ ["--relief" as string]: Math.min(list.length, 4), ["--enter" as string]: i }}
            >
              <span className="ulune-timing-cell-n">{day.day}</span>
              <span className="ulune-timing-dots" aria-hidden>
                {list.slice(0, 3).map((hit) => (
                  <span
                    key={hit.id}
                    className="ulune-timing-dot"
                    style={{ background: ASPECT_COLOR[hit.type] }}
                  />
                ))}
                {list.length > 3 ? <span className="ulune-timing-more">+{list.length - 3}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimingYearGrid({
  year,
  hits,
  tz,
  onPickMonth,
}: {
  year: number;
  hits: TimingHit[];
  tz: string;
  onPickMonth: (civil: CivilDate) => void;
}) {
  const { locale, t } = useI18n();
  const months = MONTHS[locale];
  const counts = useMemo(() => {
    const format = dateFormat("en-GB", { timeZone: tz, month: "numeric" });
    const out = Array.from({ length: 12 }, () => 0);
    for (const hit of hits) {
      const t = Date.parse(hit.exactUtc);
      if (!Number.isFinite(t)) continue;
      const m = Number(format.format(new Date(t)));
      if (m >= 1 && m <= 12) out[m - 1] = (out[m - 1] ?? 0) + 1;
    }
    return out;
  }, [hits, tz]);
  const max = Math.max(1, ...counts);
  return (
    <div data-testid="timing-year" className="ulune-timing-year">
      {months.map((name, i) => {
        const month = i + 1;
        const n = counts[i] ?? 0;
        const heat = n / max;
        return (
          <button
            key={month}
            type="button"
            data-testid={`timing-month-${year}-${String(month).padStart(2, "0")}`}
            data-count={n}
            onClick={() => onPickMonth({ year, month, day: 1 })}
            className="ulune-timing-year-cell"
            style={{ ["--heat" as string]: heat.toFixed(3), ["--enter" as string]: i }}
          >
            <span className="ulune-timing-year-name">{name}</span>
            <span className="ulune-timing-year-bar" aria-hidden>
              <span style={{ width: `${Math.round(heat * 100)}%` }} />
            </span>
            <span className="ulune-timing-year-count">{exactCount(t, n)}</span>
          </button>
        );
      })}
    </div>
  );
}
