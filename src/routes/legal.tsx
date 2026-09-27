import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { LegalPage } from "@/components/legal-page";
import { useI18n } from "@/lib/i18n/locale";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/lib/legal/pages";

export const Route = createFileRoute("/legal")({
  head: () =>
    pageHead({
      path: "/legal",
      title: "Legal notice · Ulune",
      description:
        "The legal notice of Ulune (ulune.app): its publisher, how to reach them, and its host.",
    }),
  component: Page,
});

function Page() {
  const { locale } = useI18n();
  const text = LEGAL_PAGES["legal"][locale];
  return <LegalPage id="legal" title={text.title} updated={text.updated} date={LEGAL_UPDATED} blocks={text.blocks} />;
}
