import { useI18n, type Locale } from "@/lib/i18n/locale";
import { SegmentedToggle } from "./segmented-toggle";

/** `testIdPrefix`: a second switch on the same page (the footer) names its buttons apart. */
export function LangSwitch({ testIdPrefix = "lang" }: { testIdPrefix?: string } = {}) {
  const { locale, setLocale, t } = useI18n();
  return (
    <SegmentedToggle
      value={locale}
      onChange={setLocale}
      ariaLabel={t("language")}
      options={(["en", "fr"] as Locale[]).map((code) => ({
        value: code,
        testId: `${testIdPrefix}-${code}`,
        label: code.toUpperCase(),
      }))}
    />
  );
}
