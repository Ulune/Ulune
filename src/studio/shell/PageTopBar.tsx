import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PathLink } from "@/components/path-link";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/studio/shell/AccountMenu";
import { SpaceButton } from "@/components/space/space-button";
import { CALENDAR_PATHS, ENCYCLOPEDIA_PATHS, SECTIONS, lastLanguage, pageFor, pagePath, type SectionId } from "@/studio/map";
import { SECTION_ICON, SECTION_LABEL } from "@/studio/shell/map-ui";
import "./page-bar.css";

/*
 * The top bar of the pages outside the studio (settings, the guide, the
 * legal pages, not found). Nothing here imports the studio (store, chart
 * picker, reading text), and the studio does not load it: its code and its
 * styles (page-bar.css) come with those pages.
 */

/** Ulune's star (as ulune-mark.tsx draws it: a copy, so this bar shares no chunk with the studio). */
function UluneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="currentColor" aria-hidden>
      <path d="M6 0C6.4 3.1 8.9 5.6 12 6 8.9 6.4 6.4 8.9 6 12 5.6 8.9 3.1 6.4 0 6 3.1 5.6 5.6 3.1 6 0Z" />
    </svg>
  );
}

/** Where Charts leads: the last language's last page, read from this device once mounted. */
function useChartsPath(locale: string): string {
  const [path, setPath] = useState(() => pagePath("natal", locale));
  useEffect(() => setPath(pagePath(pageFor(lastLanguage()), locale)), [locale]);
  return path;
}

/**
 * Top bar for pages outside the studio (settings, the guide, the legal
 * pages, not found): the studio's own frame (UI plan, part 97), its mark
 * back to the studio and the three sections (page reorganisation, R2), not
 * a separate “← Studio” bar.
 */
export function PageTopBar({ menu = true }: { menu?: boolean }) {
  const { t, locale } = useI18n();
  const fr = locale === "fr";
  const charts = useChartsPath(locale);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The encyclopedia's pages are this bar's own section; the other pages are none.
  const here: SectionId | null = /^\/encyclop(e|%C3%A9|é)di(a|e)(\/|$)/i.test(pathname) ? "encyclopedia" : null;
  const href: Record<SectionId, string> = {
    charts,
    calendar: fr ? CALENDAR_PATHS.fr : CALENDAR_PATHS.en,
    encyclopedia: fr ? ENCYCLOPEDIA_PATHS.fr : ENCYCLOPEDIA_PATHS.en,
  };
  return (
    <header className="ob-pagebar" data-testid="page-topbar">
      <Link to="/" className="ob-brand ob-brand--page" data-testid="back-to-studio" aria-label={t("shellHome")}>
        <UluneMark className="ob-brand-mark" />
        <span className="ob-brand-word">Ulune</span>
      </Link>
      <nav className="ob-pagebar-nav" aria-label={t("sectionsNav")}>
        {SECTIONS.map((id) => {
          const Icon = SECTION_ICON[id];
          return (
            <PathLink
              key={id}
              href={href[id]}
              className={cn("ob-pagebar-link", here === id && "is-on")}
              data-testid={`section-${id}`}
              aria-current={here === id ? "page" : undefined}
              aria-label={t(SECTION_LABEL[id])}
            >
              <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              <span className="ob-pagebar-word">{t(SECTION_LABEL[id])}</span>
            </PathLink>
          );
        })}
      </nav>
      <div className="ob-pagebar-r">
        {menu ? (
          <>
            <SpaceButton />
            <AccountMenu />
          </>
        ) : null}
      </div>
    </header>
  );
}
