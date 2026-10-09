import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { SOLAR_TERMS } from "@/lib/chinese/names";
import {
  CLOCKS,
  DAY_BOUNDARIES,
  DEFAULT_CHINESE_PREFS,
  SCRIPTS,
  TERM_SHOWS,
  chineseLabel,
  readChinesePrefs,
  setChinesePrefs,
  type ChinesePrefs,
} from "@/lib/chinese/prefs";
import { cnWord, type ChineseWordKey } from "@/lib/chinese/words";
import "./chinese-settings.css";

type Group<K extends keyof ChinesePrefs> = {
  key: K;
  title: ChineseWordKey;
  lead?: ChineseWordKey;
  options: readonly { value: ChinesePrefs[K]; label: ChineseWordKey; hint?: ChineseWordKey }[];
};

const SHOW: Group<"show"> = {
  key: "show",
  title: "cnShow",
  options: TERM_SHOWS.map((value) => ({
    value,
    label: value === "full" ? "cnShowFull" : value === "pinyin" ? "cnShowPinyin" : "cnShowNames",
  })),
};
const SCRIPT: Group<"script"> = {
  key: "script",
  title: "cnScript",
  options: SCRIPTS.map((value) => ({
    value,
    label: value === "hant" ? "cnScriptHant" : "cnScriptHans",
    hint: value === "hant" ? "cnScriptHantHint" : "cnScriptHansHint",
  })),
};
const CLOCK: Group<"clock"> = {
  key: "clock",
  title: "cnClock",
  lead: "cnClockLead",
  options: CLOCKS.map((value) => ({
    value,
    label: value === "true-solar" ? "cnClockSolar" : value === "local-mean" ? "cnClockMean" : "cnClockCivil",
    hint: value === "true-solar" ? "cnClockSolarHint" : value === "local-mean" ? "cnClockMeanHint" : "cnClockCivilHint",
  })),
};
const DAY: Group<"dayBoundary"> = {
  key: "dayBoundary",
  title: "cnDay",
  lead: "cnDayLead",
  options: DAY_BOUNDARIES.map((value) => ({
    value,
    label: value === "23:00" ? "cnDay23" : value === "split" ? "cnDaySplit" : "cnDayMidnight",
    hint: value === "23:00" ? "cnDay23Hint" : value === "split" ? "cnDaySplitHint" : "cnDayMidnightHint",
  })),
};

/**
 * Settings → Chinese traditions (languages plan, part 6): how Chinese terms
 * are written (with pinyin and characters, Traditional or Simplified) and how
 * the calendar is read for a birth (the clock of the hour, when the day
 * turns). Kept in this browser only (lib/chinese/prefs.ts); the defaults are
 * the owner's answers of 6 October 2026.
 */
export function ChineseSettings() {
  const { locale } = useI18n();
  const t = (key: ChineseWordKey, vars?: Record<string, string>) => cnWord(locale, key, vars);
  const [prefs, setPrefs] = useState<ChinesePrefs>(DEFAULT_CHINESE_PREFS);
  // The device's choices, read once the page runs (the server's page shows the defaults).
  useEffect(() => setPrefs(readChinesePrefs()), []);
  const choose = (patch: Partial<ChinesePrefs>) => setPrefs(setChinesePrefs(patch));
  const sample = chineseLabel(SOLAR_TERMS[0]!, locale, prefs);

  function radios<K extends keyof ChinesePrefs>(group: Group<K>, extra?: React.ReactNode) {
    const name = `chinese-${group.key}`;
    return (
      <fieldset className="ob-cn-group" data-testid={`settings-chinese-${group.key}`}>
        <legend className="ob-cn-legend">{t(group.title)}</legend>
        {group.lead ? <p className="ob-data-body ob-cn-lead">{t(group.lead)}</p> : null}
        {group.options.map((option) => {
          const id = `${name}-${String(option.value).replace(/[^a-z0-9]/gi, "")}`;
          return (
            <label key={String(option.value)} className="ob-check" htmlFor={id}>
              <input
                id={id}
                type="radio"
                name={name}
                data-testid={id}
                checked={prefs[group.key] === option.value}
                onChange={() => choose({ [group.key]: option.value } as Partial<ChinesePrefs>)}
              />
              <span>
                {t(option.label)}
                {option.hint ? <span className="ob-check-hint"> — {t(option.hint)}</span> : null}
              </span>
            </label>
          );
        })}
        {extra}
      </fieldset>
    );
  }

  return (
    <section id="chinese" className="ulune-panel ob-settings-card" data-testid="settings-chinese">
      <h2 className="ob-settings-h">{t("cnSettings")}</h2>
      <p className="ob-data-body">{t("cnSettingsLead")}</p>
      {radios(
        SHOW,
        <p className="ob-data-body ob-cn-sample" data-testid="settings-chinese-sample">
          {t("cnShowSample", { term: "" })}
          <span>{sample.name}</span>
          {sample.pinyin ? <span lang="zh-Latn-pinyin"> · {sample.pinyin}</span> : null}
          {sample.hanzi ? (
            <span lang={prefs.script === "hans" ? "zh-Hans" : "zh-Hant"} className="ob-cn-hanzi">
              {" "}
              {sample.hanzi}
            </span>
          ) : null}
        </p>,
      )}
      {radios(SCRIPT)}
      {radios(CLOCK)}
      {radios(DAY)}
    </section>
  );
}
