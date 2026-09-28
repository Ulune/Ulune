import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { LegalPage } from "@/components/legal-page";
import { useI18n } from "@/lib/i18n/locale";
import { CHANGES, CHANGES_UPDATED } from "@/lib/changes";

export const Route = createFileRoute("/changes")({
  head: () =>
    pageHead({
      path: "/changes",
      title: "What’s new · Ulune",
      description: "What each version of Ulune brought, from the first public version on.",
    }),
  component: Page,
});

function Page() {
  const { locale } = useI18n();
  const text = CHANGES[locale];
  return <LegalPage id="changes" title={text.title} updated={text.updated} date={CHANGES_UPDATED} blocks={text.blocks} />;
}
