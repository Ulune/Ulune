import { useMemo } from "react";
import { PlanetGlyph } from "@/components/glyphs";
import type { CivilDate } from "@/lib/chart/timing-window";
import { localHourFraction } from "@/lib/chart/timing-window";
import type { TimingHit } from "@/lib/chart/transit-exact";
import { ASPECT_COLOR } from "@/lib/chart/constants";
import { aspectLinkPhrase } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { dateFormat } from "@/lib/intl-cache";
import type { MessageKey } from "@/lib/i18n/messages";

/** "242 exact aspects", not a bare number. */
function exactCount(t: (key: MessageKey, vars?: Record<string, string | number>) => string, n: number): string {
  if (n === 0) return t("timingExactNone");
  if (n === 1) return t("timingExactOne");
  return t("timingExactMany", { n });
}

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
