import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTopBar } from "@/studio/shell/PageTopBar";
import { Toaster } from "@/components/toaster";
import { APP_VERSION, SOURCE_URL } from "@/lib/app-identity";
import { useI18n } from "@/lib/i18n/locale";
import { YourData } from "@/components/your-data";
import { SpaceSettings } from "@/components/space/space-settings";
import { LegalNav } from "@/components/legal-page";
import { keepWhole } from "@/components/keep-whole";
import { pageHead } from "@/lib/page-head";
import { problemMailto } from "@/lib/contact";
import "@/components/settings-page.css";

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
      <main className="ulune-settings ulune-settings--grid">
        {/* Language and appearance live in the account menu (UI plan, decision 3): one line says where. */}
        <header className="ob-settings-top" data-testid="settings-prefs">
          <h1 className="ob-settings-title">{t("shellSettings")}</h1>
          <p className="ob-data-body">{t("settingsLangHint")}</p>
        </header>
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
            {keepWhole(t("guidePrecise4"))}{" "}
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
          <Link to="/changes" className="ob-notice-link">
            Ulune {APP_VERSION} · {t("whatsNew")}
          </Link>
        </p>
      </main>
    </div>
  );
}
