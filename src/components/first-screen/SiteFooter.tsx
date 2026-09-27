import { Link } from "@tanstack/react-router";
import { LangSwitch } from "@/components/lang-switch";
import { APP_VERSION, SOURCE_URL } from "@/lib/app-identity";
import { problemMailto } from "@/lib/contact";
import { useI18n } from "@/lib/i18n/locale";
import { LEGAL_LINKS } from "@/lib/legal/links";

/**
 * The site's footer, under the guide (the first screen and /guide): the legal
 * pages, the source code (how Ulune offers every visitor its code, as the GNU
 * AGPL asks), "Report a problem", the version and the language.
 */
export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="ob-footer" data-testid="site-footer">
      <nav className="ob-footer-nav" aria-label={t("legalAbout")}>
        {LEGAL_LINKS.map((link) => (
          <Link key={link.id} to={link.to} className="ob-footer-link" data-testid={`footer-link-${link.id}`}>
            {t(link.label)}
          </Link>
        ))}
        <a
          href={SOURCE_URL}
          className="ob-footer-link"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="footer-link-source"
        >
          {t("guideSource")}
          <span className="sr-only"> ({t("legalNewTab")})</span>
        </a>
        <a href={problemMailto(t)} className="ob-footer-link" data-testid="footer-link-report">
          {t("reportProblem")}
        </a>
      </nav>
      <div className="ob-footer-meta">
        <span className="ob-footer-version" data-testid="footer-version">
          Ulune {APP_VERSION}
        </span>
        <LangSwitch testIdPrefix="footer-lang" />
      </div>
    </footer>
  );
}
