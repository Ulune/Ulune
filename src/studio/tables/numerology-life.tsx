import type { CSSProperties } from "react";
import type { NumerologyChart } from "@/lib/chart/numerology";
import { nineYearStarts, type AgeSpan } from "@/lib/chart/numerology-cycles";
import { wholeText } from "@/lib/chart/numerology-reduce";
import { agesText, cycleRows, spanYearsText } from "@/lib/chart/numerology-table";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyPageText as p } from "@/lib/i18n/numerology-ui";

const LANES = ["period", "pinnacle", "challenge"] as const;
const YEAR_MS = 365.2425 * 86_400_000;

const within = (span: AgeSpan, age: number) => age >= span.fromAge && (span.toAge == null || age < span.toAge);

/** The age on the day shown, with the part of the year since the last birthday. */
function exactAge(chart: NumerologyChart): number {
  const on = Date.UTC(chart.calendarYear, chart.calendarMonth - 1, chart.calendarDay);
  const birthday = Date.UTC(chart.calendarYear, chart.month - 1, chart.day);
  const last = on >= birthday ? birthday : Date.UTC(chart.calendarYear - 1, chart.month - 1, chart.day);
  return chart.age + Math.min(0.999, Math.max(0, (on - last) / YEAR_MS));
}

/**
 * The life line (part 62 of the launch plan): the period cycles, pinnacles
 * and challenges to scale from birth to 75 (further for an older life), each
 * new nine-year round, and a line at the year shown. The table under it
 * holds the same in words, so the drawing is one picture for a screen reader.
 */
export function NumerologyLifeLine({ chart, locale }: { chart: NumerologyChart; locale: AppLocale }) {
  const age = exactAge(chart);
  const end = Math.max(75, Math.ceil((chart.age + 6) / 5) * 5);
  const at = (a: number) => Math.min(1, Math.max(0, a / end));
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  const rows = cycleRows(chart);
  const birth = { year: chart.year, month: chart.month, day: chart.day };
  const born = Date.UTC(chart.year, chart.month - 1, chart.day);
  // A round starts on 1 January: placed at the age on that day.
  const starts = nineYearStarts(birth, chart.year, chart.year + end).map((y) => ({ year: y, age: (Date.UTC(y, 0, 1) - born) / YEAR_MS }));
  const ticks = Array.from({ length: Math.floor(end / 10) + 1 }, (_, i) => i * 10);
  const running = rows.filter((r) => within(r.span, chart.age));
  const aria = p(locale, "lifeAria", {
    end,
    year: chart.calendarYear,
    age: chart.age,
    cycles: running.map((r) => `${p(locale, `cycle_${r.kind}`, { n: r.index })} ${wholeText(r.value)}`).join(", "),
  });
  const nowShown = chart.age >= 0 && chart.age <= end;
  return (
    <figure className="ulune-num-life" data-testid="num-lifeline" role="img" aria-label={aria}>
      {nowShown ? (
        <div className="ulune-num-life-row is-caption">
          <span />
          <span className="ulune-num-life-caption">
            <i aria-hidden />
            {p(locale, "lifeNow", { year: chart.calendarYear, age: chart.age, py: chart.personalYear.number ?? "" })}
          </span>
        </div>
      ) : null}
      {LANES.map((lane) => (
        <div key={lane} className="ulune-num-life-row" data-lane={lane}>
          <span className="ulune-num-life-label">{p(locale, `lane_${lane}`)}</span>
          <span className="ulune-num-life-track">
            {rows
              .filter((r) => r.kind === lane)
              .map((r) => {
                const from = at(r.span.fromAge);
                const to = at(r.span.toAge ?? end);
                const n = wholeText(r.value) || "0";
                const title = p(locale, "lifeSpan", {
                  cycle: p(locale, `cycle_${r.kind}`, { n: r.index }) + (r.main ? ` (${p(locale, "main")})` : ""),
                  n,
                  ages: agesText(locale, r.span),
                  years: spanYearsText(locale, chart.year, r.span),
                });
                return (
                  <span
                    key={r.index}
                    className="ulune-num-life-span"
                    data-testid={`num-life-${r.kind}-${r.index}`}
                    data-now={within(r.span, chart.age) ? "1" : undefined}
                    data-main={r.main ? "1" : undefined}
                    data-open={r.span.toAge == null ? "1" : undefined}
                    style={{ left: pct(from), width: pct(Math.max(0.004, to - from)) }}
                    title={title}
                  >
                    <b>{n}</b>
                    {r.main ? <small>{p(locale, "main")}</small> : null}
                  </span>
                );
              })}
          </span>
        </div>
      ))}
      <div className="ulune-num-life-row" data-lane="nine">
        <span className="ulune-num-life-label">{p(locale, "lane_nine")}</span>
        <span className="ulune-num-life-track">
          {starts
            .filter((s) => s.age >= 0 && s.age <= end)
            .map((s) => (
              <i key={s.year} className="ulune-num-life-start" style={{ left: pct(at(s.age)) }} title={p(locale, "nineStart", { year: s.year })} />
            ))}
        </span>
      </div>
      <div className="ulune-num-life-row is-axis">
        <span className="ulune-num-life-label">
          <span>{p(locale, "axisAge")}</span>
          <span>{p(locale, "axisYear")}</span>
        </span>
        <span className="ulune-num-life-track">
          {ticks.map((a) => (
            <span key={a} className="ulune-num-life-tick" style={{ left: pct(at(a)) }}>
              <b>{a}</b>
              <small>{chart.year + a}</small>
            </span>
          ))}
        </span>
      </div>
      {nowShown ? <span className="ulune-num-life-now" style={{ "--x": at(age) } as CSSProperties} /> : null}
    </figure>
  );
}
