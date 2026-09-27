import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Guide } from "@/components/first-screen/Guide";
import { SiteFooter } from "@/components/first-screen/SiteFooter";
import { useI18n } from "@/lib/i18n/locale";
import { pageHead } from "@/lib/page-head";
import { PageTopBar } from "@/studio/shell/PageTopBar";

export const Route = createFileRoute("/guide")({
  // The same words as the home page's guide: the home page is the one search engines find.
  head: () => pageHead({ path: "/guide", title: "Guide · Ulune", index: false }),
  component: GuidePage,
});

/**
 * The guide on its own page, for a reader with a chart on screen (the first
 * screen shows it under the form). Its tour and sample links go back to the
 * studio and ask it, through the history's state, to start them.
 */
function GuidePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className="min-w-0" data-testid="guide-page">
      <PageTopBar />
      <main className="ob-guide-page">
        <h1 className="ob-guide-page-title font-display">{t("guidePage")}</h1>
        <p className="ob-guide-page-lead">{t("guidePageLead")}</p>
        <Guide
          onTour={() => void navigate({ to: "/", state: { tour: true } })}
          onSample={() => void navigate({ to: "/", state: { sample: true } })}
        />
        <SiteFooter />
      </main>
    </div>
  );
}
