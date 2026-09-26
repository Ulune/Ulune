import { createFileRoute } from "@tanstack/react-router";
import { LangSwitch } from "@/components/lang-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { PageTopBar } from "@/studio/shell/PageTopBar";
import { Toaster } from "@/components/toaster";
import { APP_VERSION } from "@/lib/app-identity";
import { useI18n } from "@/lib/i18n/locale";
import { YourData } from "@/components/your-data";
import { SpaceSettings } from "@/components/space/space-settings";
import { LegalNav } from "@/components/legal-page";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const { t } = useI18n();
  return (
    <div className="min-w-0" data-testid="settings-page">
      <PageTopBar />
      <Toaster />
      <main className="ulune-settings">
        <section className="ulune-panel ob-settings-card" data-testid="settings-prefs">
          <h2 className="ob-settings-h">{t("shellSettings")}</h2>
          <div className="ob-settings-row">
            <span className="ob-menu-label">{t("language")}</span>
            <LangSwitch />
          </div>
          <div className="ob-settings-row">
            <span className="ob-menu-label">{t("theme")}</span>
            <ThemeSwitch />
          </div>
        </section>
        <SpaceSettings />
        <YourData />
        <section className="ulune-panel ob-settings-card" data-testid="settings-legal">
          <h2 className="ob-settings-h">{t("legalAbout")}</h2>
          <LegalNav />
        </section>
        <p className="font-mono text-xs text-fg-subtle" data-testid="app-version">
          Ulune {APP_VERSION}
        </p>
      </main>
    </div>
  );
}
