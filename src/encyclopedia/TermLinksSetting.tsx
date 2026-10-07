import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { Term } from "./Term";
import { readTermLinks, setTermLinks, TERM_LINKS, type TermLinks } from "./term-links";
import { tr, type EncKey } from "./words";
import "./term-links-setting.css";

const LABEL: Record<TermLinks, [EncKey, EncKey]> = {
  subtle: ["encLinksSubtle", "encLinksSubtleHint"],
  underline: ["encLinksUnderline", "encLinksUnderlineHint"],
  none: ["encLinksNone", "encLinksNoneHint"],
};

/** Settings: how words with an encyclopedia entry are marked, kept on this device, with a live example. */
export function TermLinksSetting() {
  const { locale } = useI18n();
  const t = (key: EncKey) => tr(locale, key);
  const [value, setValue] = useState<TermLinks>("subtle");
  // The device's choice, read once the page runs (the server's page shows the default).
  useEffect(() => setValue(readTermLinks()), []);
  const [before, after] = t("encLinksSample").split("{word}");
  return (
    <section id="term-links" className="ulune-panel ob-settings-card" data-testid="settings-term-links">
      <h2 className="ob-settings-h">{t("encLinks")}</h2>
      <p className="ob-data-body">{t("encLinksLead")}</p>
      <fieldset className="ob-term-links">
        <legend className="sr-only">{t("encLinks")}</legend>
        {TERM_LINKS.map((option) => (
          <label key={option} className="ob-check" htmlFor={`term-links-${option}`}>
            <input
              id={`term-links-${option}`}
              type="radio"
              name="term-links"
              data-testid={`term-links-${option}`}
              checked={value === option}
              onChange={() => {
                setValue(option);
                setTermLinks(option);
              }}
            />
            <span>
              {t(LABEL[option][0])}
              <span className="ob-check-hint"> — {t(LABEL[option][1])}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="ob-data-body ob-term-links-sample" data-testid="term-links-sample">
        {before}
        <Term id="retrograde" slug="retrograde" lang={locale}>
          {t("encLinksWord")}
        </Term>
        {after}
      </p>
    </section>
  );
}
