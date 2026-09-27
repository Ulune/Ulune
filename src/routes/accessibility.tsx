import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { LegalPage } from "@/components/legal-page";
import { useI18n } from "@/lib/i18n/locale";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/lib/legal/pages";

export const Route = createFileRoute("/accessibility")({
  head: () =>
    pageHead({
      path: "/accessibility",
      title: "Accessibility · Ulune",
      description:
        "How accessible Ulune is: its aim (WCAG 2.2 AA), the gaps known today, and how to report a problem.",
    }),
  component: Page,
});

function Page() {
  const { locale } = useI18n();
  const text = LEGAL_PAGES["accessibility"][locale];
  return <LegalPage id="accessibility" title={text.title} updated={text.updated} date={LEGAL_UPDATED} blocks={text.blocks} />;
}
