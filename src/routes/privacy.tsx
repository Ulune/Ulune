import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalText } from "@/components/legal-page";
import { useI18n } from "@/lib/i18n/locale";
import { OPERATOR } from "@/lib/legal/operator";
import { PRIVACY_NOTICE, PRIVACY_UPDATED } from "@/lib/legal/privacy-notice";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy · Ulune" }] }),
  component: Privacy,
});

/** The privacy notice: what Ulune keeps, what leaves the device and why, and the reader's choices. */
function Privacy() {
  const { locale } = useI18n();
  const notice = PRIVACY_NOTICE[locale];
  const who = OPERATOR.name && OPERATOR.contact ? notice.who : null;
  return (
    <LegalPage id="privacy" title={notice.title} updated={notice.updated} date={PRIVACY_UPDATED} blocks={notice.blocks}>
      {who ? (
        <section className="ob-notice-block">
          <h2 className="ob-settings-h">{who.h}</h2>
          <p data-testid="privacy-who">
            <LegalText text={who.p} />
          </p>
        </section>
      ) : null}
    </LegalPage>
  );
}
