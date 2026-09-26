import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { useI18n } from "@/lib/i18n/locale";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/lib/legal/pages";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of use · Ulune" }] }),
  component: Page,
});

function Page() {
  const { locale } = useI18n();
  const text = LEGAL_PAGES["terms"][locale];
  return <LegalPage id="terms" title={text.title} updated={text.updated} date={LEGAL_UPDATED} blocks={text.blocks} />;
}
