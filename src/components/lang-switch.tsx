import { useI18n, type Locale } from "@/lib/i18n/locale";
import { SegmentedToggle } from "./segmented-toggle";

export function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <SegmentedToggle
      value={locale}
      onChange={setLocale}
      ariaLabel={t("language")}
      options={(["en", "fr"] as Locale[]).map((code) => ({
        value: code,
        testId: `lang-${code}`,
        label: code.toUpperCase(),
      }))}
    />
  );
}
