import { Link } from "@tanstack/react-router";
import { CircleDot, Clock3, Combine, Shapes } from "lucide-react";
import type { ComponentType } from "react";
import { SOURCE_URL } from "@/lib/app-identity";
import { useI18n } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { GlossaryDetails } from "@/components/glossary-details";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

/** The four tabs, with the tab bar's own icons (studio/shell/GroupBar.tsx). */
const MODES: { id: string; icon: Icon; label: MessageKey; body: MessageKey }[] = [
  { id: "chart", icon: CircleDot, label: "groupChart", body: "guideDoChart" },
  { id: "time", icon: Clock3, label: "groupTime", body: "guideDoTime" },
  { id: "pair", icon: Combine, label: "groupPair", body: "guideDoPair" },
  { id: "systems", icon: Shapes, label: "groupSystems", body: "guideDoSystems" },
];

const QUESTIONS: { id: string; q: MessageKey; a: MessageKey }[] = [
  { id: "time", q: "faqTimeQ", a: "faqTimeA" },
  { id: "houses", q: "faqHousesQ", a: "faqHousesA" },
  { id: "free", q: "faqFreeQ", a: "faqFreeA" },
  { id: "kept", q: "faqKeptQ", a: "faqKeptA" },
  { id: "trust", q: "faqTrustQ", a: "faqTrustA" },
  { id: "ai", q: "faqAiQ", a: "faqAiA" },
];

/**
 * The guide, under the first screen's form and on /guide: what Ulune is,
 * what it does, how to begin, the tour and the sample, what happens to the
 * reader's data, how precise it is, and a few answers. Plain text from the
 * catalog, rendered by the server, so it reads without JavaScript and search
 * engines read it too.
 */
export function Guide({ onTour, onSample }: { onTour: () => void; onSample: () => void }) {
  const { t } = useI18n();
  return (
    <div className="ob-guide" data-testid="guide">
      <section className="ob-guide-sec" aria-labelledby="guide-what">
        <h2 id="guide-what" className="ob-guide-h">
          {t("guideWhatTitle")}
        </h2>
        <p className="ob-guide-p">{t("guideWhatBody")}</p>
      </section>

      <section className="ob-guide-sec" aria-labelledby="guide-do">
        <h2 id="guide-do" className="ob-guide-h">
          {t("guideDoTitle")}
        </h2>
        <ul className="ob-guide-modes">
          {MODES.map(({ id, icon: ModeIcon, label, body }) => (
            <li key={id} className="ob-guide-mode" data-testid={`guide-mode-${id}`}>
              <span className="ob-guide-mode-head">
                <ModeIcon className="ob-guide-mode-icon" strokeWidth={1.75} aria-hidden />
                <span className="ob-guide-mode-name">{t(label)}</span>
              </span>
              <span className="ob-guide-mode-body">{t(body)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ob-guide-sec" aria-labelledby="guide-begin">
        <h2 id="guide-begin" className="ob-guide-h">
          {t("guideBeginTitle")}
        </h2>
        <ol className="ob-guide-steps">
          <li>{t("guideBegin1")}</li>
          <li>{t("guideBegin2")}</li>
          <li>{t("guideBegin3")}</li>
        </ol>
        <p className="ob-guide-p ob-guide-note">{t("guideBeginNoTime")}</p>
      </section>

      <section className="ob-guide-sec" aria-labelledby="guide-new">
        <h2 id="guide-new" className="ob-guide-h">
          {t("guideNewTitle")}
        </h2>
        <p className="ob-guide-p">{t("guideNewBody")}</p>
        <p className="ob-guide-links">
          <button type="button" className="ob-guide-link" data-testid="guide-tour" onClick={onTour}>
            {t("guideNewTour")}
          </button>
          <button type="button" className="ob-guide-link" data-testid="guide-sample" onClick={onSample}>
            {t("guideNewSample")}
          </button>
        </p>
        <GlossaryDetails all testId="guide-glossary" />
      </section>

      <section className="ob-guide-sec" aria-labelledby="guide-data">
        <h2 id="guide-data" className="ob-guide-h">
          {t("guideDataTitle")}
        </h2>
        <ul className="ob-guide-list">
          <li>{t("guideData1")}</li>
          <li>{t("guideData2")}</li>
          <li>{t("guideData3")}</li>
          <li>{t("guideData4")}</li>
        </ul>
        <p className="ob-guide-links">
          <Link to="/privacy" className="ob-guide-link" data-testid="guide-privacy">
            {t("guideDataLink")}
          </Link>
        </p>
      </section>

      <section className="ob-guide-sec" aria-labelledby="guide-precise">
        <h2 id="guide-precise" className="ob-guide-h">
          {t("guidePreciseTitle")}
        </h2>
        <ul className="ob-guide-list">
          <li>{t("guidePrecise1")}</li>
          <li>{t("guidePrecise2")}</li>
          <li>{t("guidePrecise3")}</li>
          <li>{t("guidePreciseProgressions")}</li>
          <li>{t("guidePrecise4")}</li>
        </ul>
        <p className="ob-guide-links">
          <a
            href={SOURCE_URL}
            className="ob-guide-link"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="guide-source"
          >
            {t("guideSource")}
            <span className="sr-only"> ({t("legalNewTab")})</span>
          </a>
          <Link to="/credits" className="ob-guide-link" data-testid="guide-credits">
            {t("legalCredits")}
          </Link>
        </p>
      </section>

      <section className="ob-guide-sec" aria-labelledby="guide-faq">
        <h2 id="guide-faq" className="ob-guide-h">
          {t("guideFaqTitle")}
        </h2>
        <div className="ob-guide-faq">
          {QUESTIONS.map(({ id, q, a }) => (
            <details key={id} className="ob-guide-qa" data-testid={`guide-faq-${id}`}>
              <summary>{t(q)}</summary>
              <p className="ob-guide-p">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
