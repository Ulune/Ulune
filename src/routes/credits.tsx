import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { LegalPage } from "@/components/legal-page";
import { useI18n } from "@/lib/i18n/locale";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/lib/legal/pages";

export const Route = createFileRoute("/credits")({
  head: () =>
    pageHead({
      path: "/credits",
      title: "Credits · Ulune",
      description:
        "The software, data and fonts Ulune is built on, from the Swiss Ephemeris to the time zone maps, and their licences.",
    }),
  component: Page,
});

function Page() {
  const { locale } = useI18n();
  const text = LEGAL_PAGES["credits"][locale];
  return <LegalPage id="credits" title={text.title} updated={text.updated} date={LEGAL_UPDATED} blocks={text.blocks} />;
}
