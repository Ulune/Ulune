import { Link } from "@tanstack/react-router";
import { CircleDot, Clock3, Combine, Shapes } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { AccountMenu } from "@/studio/shell/AccountMenu";
import { SpaceButton } from "@/components/space/space-button";
import { MODE_GROUPS, type ModeGroupId, type StudioPage } from "@/studio/url";
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

const ICON: Record<ModeGroupId, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  chart: CircleDot,
  time: Clock3,
  pair: Combine,
  systems: Shapes,
};
const LABEL = { chart: "groupChart", time: "groupTime", pair: "groupPair", systems: "groupSystems" } as const;

/** The page each group last showed (GroupBar keeps it), read after mounting. */
function useLastPages(): Partial<Record<ModeGroupId, StudioPage>> {
  const [last, setLast] = useState<Partial<Record<ModeGroupId, StudioPage>>>({});
  useEffect(() => {
    try {
      setLast(JSON.parse(window.localStorage.getItem("ulune.studio.group-last") ?? "{}") ?? {});
    } catch {
      /* the groups' first pages */
    }
  }, []);
  return last;
}

/**
 * Top bar for pages outside the studio (settings, the guide, the legal
 * pages, not found): the studio's own frame (UI plan, part 97), its mark
 * back to the studio and its four pages, not a separate “← Studio” bar.
 */
export function PageTopBar({ menu = true }: { menu?: boolean }) {
  const { t } = useI18n();
  const last = useLastPages();
  return (
    <header className="ob-pagebar" data-testid="page-topbar">
      <Link to="/" className="ob-brand ob-brand--page" data-testid="back-to-studio" aria-label={t("shellStudio")}>
        <UluneMark className="ob-brand-mark" />
        <span className="ob-brand-word">Ulune</span>
      </Link>
      <nav className="ob-pagebar-nav" aria-label={t("studioNav")}>
        {MODE_GROUPS.map((g) => {
          const page = last[g.id] ?? g.pages[0];
          const Icon = ICON[g.id];
          return (
            <Link
              key={g.id}
              to="/"
              search={page === "natal" ? {} : { studio: page }}
              className="ob-pagebar-link"
              data-testid={`pagebar-${g.id}`}
              aria-label={t(LABEL[g.id])}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              <span className="ob-pagebar-word">{t(LABEL[g.id])}</span>
            </Link>
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
