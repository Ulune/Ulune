import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n/locale";
import { SegmentedToggle } from "./segmented-toggle";

const noSubscribe = () => () => {};

/** False while the page hydrates (the server drew the default, dark theme), true once it runs. */
function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  // The server knows no reader's theme: hydrate as it drew, then show the reader's (a light
  // theme left "Dark" pressed on the Settings page, since React doesn't patch attributes).
  const hydrated = useHydrated();
  return (
    <SegmentedToggle<Theme>
      value={hydrated ? theme : "dark"}
      onChange={setTheme}
      ariaLabel={t("theme")}
      options={[
        {
          value: "light",
          testId: "theme-light",
          ariaLabel: t("useLight"),
          title: t("useLight"),
          icon: (
            <span className="inline-flex items-center gap-1.5">
              <Sun className="size-3.5" strokeWidth={1.75} aria-hidden />
              <span>{t("useLight")}</span>
            </span>
          ),
        },
        {
          value: "dark",
          testId: "theme-dark",
          ariaLabel: t("useDark"),
          title: t("useDark"),
          icon: (
            <span className="inline-flex items-center gap-1.5">
              <Moon className="size-3.5" strokeWidth={1.75} aria-hidden />
              <span>{t("useDark")}</span>
            </span>
          ),
        },
      ]}
    />
  );
}
