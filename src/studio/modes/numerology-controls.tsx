import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { numerologyYear, type NumerologyChart } from "@/lib/chart/numerology";
import type { YRole } from "@/lib/chart/numerology-name";
import { wholeText, type NumerologyValue } from "@/lib/chart/numerology-reduce";
import { previewProps } from "@/lib/depth/preview-bus";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyDay } from "@/lib/i18n/numerology-say";
import { numerologyCoreLabel, numerologyWheelText } from "@/lib/i18n/numerology-ui";
import { useSwitchY } from "@/studio/modes/hooks/useSwitchY";
import { NUMEROLOGY_FIRST_YEAR, NUMEROLOGY_LAST_YEAR, setNumerologyYear } from "@/studio/numerology-year";

/*
 * Under the numerology wheel (part 60): the switch for a Y chosen on it, and
 * the year stepper with that year's personal year and long cycles.
 */

/** For a Y chosen on the wheel: count it as a vowel or a consonant (kept with the chart). */
export function NumerologyYSwitch({ numbers, selectedId, locale }: { numbers: NumerologyChart; selectedId: string | null; locale: AppLocale }) {
  const switchY = useSwitchY();
  const letters = numbers.names.birth?.parsed.letters ?? [];
  const at = selectedId?.startsWith("letter:") ? Number(selectedId.slice(7)) : -1;
  const letter = letters.find((l) => l.index === at);
  if (!letter || letter.y == null || !letter.yRule || !numbers.name) return null;
  const choose = (role: YRole) => switchY(numbers, letter, role);
  const rule = numerologyWheelText(locale, letter.yRule === "v" ? "roleVowel" : "roleConsonant");
  return (
    <div className="ulune-num-yswitch" role="group" aria-label={numerologyWheelText(locale, "yLabel")} data-testid="num-y-switch">
      <span className="ulune-num-yswitch-k">{numerologyWheelText(locale, "yLabel")}</span>
      <span className="ulune-num-yswitch-seg">
        <button type="button" aria-pressed={letter.vowel} data-testid="num-y-vowel" onClick={() => choose("v")}>
          {numerologyWheelText(locale, "yVowel")}
        </button>
        <button type="button" aria-pressed={!letter.vowel} data-testid="num-y-consonant" onClick={() => choose("c")}>
          {numerologyWheelText(locale, "yConsonant")}
        </button>
      </span>
      <span className="ulune-num-yswitch-note">{numerologyWheelText(locale, "yRuleSays", { role: rule })}</span>
    </div>
  );
}

/** ‹ 2026 ›: the year the wheel shows, its personal year and the long cycles it falls in. */
export function NumerologyYearStepper({ numbers, locale }: { numbers: NumerologyChart; locale: AppLocale }) {
  const year = numbers.calendarYear;
  const thisYear = new Date().getFullYear();
  const row = useMemo(() => numerologyYear(numbers, year), [numbers, year]);
  const c = row.cycles;
  const changed = (fromAge: number) =>
    c && fromAge === row.age && fromAge > 0
      ? numerologyWheelText(locale, "fromDate", { date: numerologyDay(locale, year, numbers.month, numbers.day) })
      : undefined;
  const chip = (key: string, label: string, value: NumerologyValue, since?: string, extra?: string) =>
    value.number == null ? null : (
      <span key={key} className="ulune-num-chip" data-testid={`num-chip-${key}`} data-new={since ? "1" : undefined} title={since}>
        {label} <b>{wholeText(value)}</b>
        {extra ? <span className="ulune-num-chip-x"> {extra}</span> : null}
      </span>
    );
  return (
    <div className="ulune-num-year" role="group" aria-label={numerologyWheelText(locale, "yearLabel")}>
      <div className="ulune-num-stepper">
        <button
          type="button"
          className="ulune-num-step"
          data-testid="num-year-prev"
          aria-label={numerologyWheelText(locale, "prevYear")}
          disabled={year <= NUMEROLOGY_FIRST_YEAR}
          onClick={() => setNumerologyYear(year - 1)}
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="ulune-num-year-n"
          data-testid="num-year"
          data-now={year === thisYear ? "1" : undefined}
          aria-label={year === thisYear ? String(year) : numerologyWheelText(locale, "backToNow", { year })}
          title={year === thisYear ? undefined : numerologyWheelText(locale, "backToNow", { year })}
          onClick={() => setNumerologyYear(null)}
        >
          {year}
        </button>
        <button
          type="button"
          className="ulune-num-step"
          data-testid="num-year-next"
          aria-label={numerologyWheelText(locale, "nextYear")}
          disabled={year >= NUMEROLOGY_LAST_YEAR}
          onClick={() => setNumerologyYear(year + 1)}
        >
          <ChevronRight className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <p className="ulune-num-year-line" data-testid="num-year-line">
        <span className="ulune-num-chip is-year" data-testid="num-chip-year" {...previewProps("core:personalYear")}>
          {numerologyCoreLabel(locale, "personalYear")} <b>{row.personalYear.number}</b>
        </span>
        {c ? (
          <>
            {chip("pinnacle", numerologyWheelText(locale, "pinnacle"), c.pinnacle.value, changed(c.pinnacle.fromAge))}
            {chip(
              "challenge",
              numerologyWheelText(locale, "challenge"),
              c.challenge.value,
              changed(c.challenge.fromAge),
              c.challenge.main ? numerologyWheelText(locale, "main") : undefined,
            )}
            {chip("period", numerologyWheelText(locale, "period"), c.period.value, changed(c.period.fromAge))}
            {c.letters ? chip("essence", numerologyWheelText(locale, "essence"), c.essence) : null}
            <span className="ulune-num-age">{numerologyWheelText(locale, "age", { age: row.age })}</span>
          </>
        ) : (
          <span className="ulune-num-age">{numerologyWheelText(locale, "beforeBirth")}</span>
        )}
      </p>
    </div>
  );
}
