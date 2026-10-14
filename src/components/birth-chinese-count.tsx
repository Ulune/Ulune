import { useI18n } from "@/lib/i18n/locale";
import { cnWord } from "@/lib/chinese/words";
import type { BirthInput } from "@/lib/chart/types";

export type ChineseCount = NonNullable<BirthInput["chineseCount"]>;

/**
 * The birth form's yin or yang count (languages plan, decision 4): one
 * optional choice in the form's options, worded as the Chinese traditions'
 * own count, read by two calculations only (BaZi's luck pillars, the Kua
 * number; Zi Wei Dou Shu with the second wave of languages); left empty,
 * those pages show both versions. Kept
 * with the chart on the device like numerology's names, never sent. Its
 * words load with it, when the options open, so they stay out of the first
 * page's download.
 */
export function BirthChineseCount({
  value,
  selectClass,
  onChoose,
}: {
  value: BirthInput["chineseCount"];
  selectClass: string;
  onChoose: (next: ChineseCount | undefined) => void;
}) {
  const { locale } = useI18n();
  return (
    <div className="mt-3 min-w-0" data-testid="birth-chinese-count">
      {/* The form's Label, written out: importing it here moved the server's shared helpers
          into a chunk of their own, read across a cycle (the deploy check, 9 Oct 2026). */}
      <label htmlFor="birth-count" className="mb-[var(--space-2)] block ulune-kicker text-fg-muted">
        {cnWord(locale, "cnCount")}
      </label>
      <select
        id="birth-count"
        data-testid="birth-count"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChoose(v === "yang" || v === "yin" ? v : undefined);
        }}
        className={selectClass}
      >
        <option value="">{cnWord(locale, "cnCountNone")}</option>
        <option value="yang">{cnWord(locale, "cnCountYang")}</option>
        <option value="yin">{cnWord(locale, "cnCountYin")}</option>
      </select>
      <p className="mt-1 text-xs text-fg-muted" data-testid="birth-count-note">
        {cnWord(locale, "cnCountNote")}
      </p>
    </div>
  );
}

