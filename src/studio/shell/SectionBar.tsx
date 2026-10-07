import { useEffect, useState } from "react";
import { PathLink } from "@/components/path-link";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { ENCYCLOPEDIA_PATHS, SECTIONS, lastLanguage, pageFor, pagePath, sectionOf, type SectionId } from "@/studio/map";
import { preloadMode } from "@/studio/modes/registry";
import { SECTION_ICON, SECTION_LABEL } from "@/studio/shell/map-ui";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";
import type { StudioPage } from "@/studio/url";

/**
 * The sections (page reorganisation, parts R2 and R4): Charts, Calendar and
 * Encyclopedia. On a computer, words in the middle of the top bar with a line
 * under the chosen one; on a phone, the bottom tab bar, icon and word, with
 * room for five. Charts opens the last language's last page, Calendar the
 * calendar; the Encyclopedia is a page of its own, outside the studio.
 */
export function SectionBar() {
  const { t, locale } = useI18n();
  // The page pressed shows at once, before it is drawn (store.navPage).
  const page = useStudioStore((s) => s.navPage ?? s.page);
  const pending = useStudioStore((s) => s.navPage != null);
  const { setPage } = useStudioUrl({ hydrate: false });
  const section = sectionOf(page);
  // Where Charts leads from the Calendar, read from this device once mounted
  // (the server's page cannot know it).
  const [lastChart, setLastChart] = useState<StudioPage>("natal");
  useEffect(() => setLastChart(pageFor(lastLanguage())), [page]);
  const pageOf = (id: SectionId): StudioPage | null =>
    id === "charts" ? (section === "charts" ? page : lastChart) : id === "calendar" ? "timing" : null;

  return (
    <nav
      data-testid="studio-nav"
      data-page={page}
      data-pending={pending ? "1" : undefined}
      aria-label={t("sectionsNav")}
      className="ob-sections"
      style={{ ["--ob-i" as string]: String(Math.max(0, SECTIONS.indexOf(section))), ["--ob-n" as string]: String(SECTIONS.length) }}
    >
      <div className="ob-sections-track">
        {/* On a phone the chosen section sits on a pill, which carries its own
            copy of the bar in the pill's colour, held still while the pill
            slides: each word changes colour exactly where the pill's edge passes. */}
        <span className="ob-sections-ind" aria-hidden>
          <span className="ob-sections-ink">
            {SECTIONS.map((id) => {
              const Icon = SECTION_ICON[id];
              return (
                <span key={id} className="ob-section ob-section--ink">
                  <Icon className="ob-section-icon" strokeWidth={1.75} />
                  <span className="ob-section-label">{t(SECTION_LABEL[id])}</span>
                </span>
              );
            })}
          </span>
        </span>
        {SECTIONS.map((id) => {
          const on = id === section;
          const Icon = SECTION_ICON[id];
          const target = pageOf(id);
          const href = target
            ? pagePath(target, locale)
            : locale === "fr"
              ? ENCYCLOPEDIA_PATHS.fr
              : ENCYCLOPEDIA_PATHS.en;
          // The page's code is fetched as the pointer or the focus arrives.
          const ahead = () => {
            if (target && !on) preloadMode(target);
          };
          return (
            <PathLink
              key={id}
              href={href}
              data-testid={`section-${id}`}
              aria-current={on ? "page" : undefined}
              className={cn("ob-section", on && "is-on")}
              onPointerEnter={ahead}
              onPointerDown={ahead}
              onFocus={ahead}
              onClick={(e) => {
                if (!target || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                // A studio page: the studio's own switch, not a new page.
                e.preventDefault();
                if (!on) setPage(target);
              }}
            >
              <Icon className="ob-section-icon" strokeWidth={1.75} aria-hidden />
              <span className="ob-section-label">{t(SECTION_LABEL[id])}</span>
            </PathLink>
          );
        })}
      </div>
    </nav>
  );
}
