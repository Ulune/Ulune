import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { useI18n } from "@/lib/i18n/locale";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/lib/legal/pages";

export const Route = createFileRoute("/legal")({
  head: () => ({ meta: [{ title: "Legal notice · Ulune" }] }),
  component: Page,
});

function Page() {
  const { locale } = useI18n();
  const text = LEGAL_PAGES["legal"][locale];
  return <LegalPage id="legal" title={text.title} updated={text.updated} date={LEGAL_UPDATED} blocks={text.blocks} />;
}
