import { createFileRoute } from "@tanstack/react-router";
import { LangSwitch } from "@/components/lang-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { PageTopBar } from "@/studio/shell/PageTopBar";
import { Toaster } from "@/components/toaster";
import { APP_VERSION, SOURCE_URL } from "@/lib/app-identity";
import { useI18n } from "@/lib/i18n/locale";
import { YourData } from "@/components/your-data";
import { SpaceSettings } from "@/components/space/space-settings";
import { LegalNav } from "@/components/legal-page";
import { pageHead } from "@/lib/page-head";
import { problemMailto } from "@/lib/contact";

export const Route = createFileRoute("/settings")({
  // Nothing here for a search engine: the page is about this browser.
  head: () => pageHead({ path: "/settings", title: "Settings · Ulune", index: false }),
  component: Settings,
});

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
          <p className="ob-data-body">
            {t("reportProblemLead")}{" "}
            <a href={problemMailto(t)} className="ob-keep-link" data-testid="report-problem">
              {t("reportProblem")}
            </a>
          </p>
          <p className="ob-data-body">
            {t("guidePrecise4")}{" "}
            <a
              href={SOURCE_URL}
              className="ob-keep-link"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="settings-source"
            >
              {t("guideSource")}
              <span className="sr-only"> ({t("legalNewTab")})</span>
            </a>
          </p>
        </section>
        <p className="font-mono text-xs text-fg-subtle" data-testid="app-version">
          Ulune {APP_VERSION}
        </p>
      </main>
    </div>
  );
}
