import { useMemo } from "react";
import type { CivilDate } from "@/lib/chart/timing-window";
import type { TimingHit } from "@/lib/chart/transit-exact";
import { useI18n } from "@/lib/i18n/locale";
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
