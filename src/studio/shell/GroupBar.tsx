import { CircleDot, Clock3, Combine, Shapes } from "lucide-react";
import type { ComponentType } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { GROUP_LABEL } from "@/studio/modes/meta";
import { preloadMode } from "@/studio/modes/registry";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";
import { MODE_GROUPS, groupOf, type ModeGroupId, type StudioPage } from "@/studio/url";

const ICON: Record<ModeGroupId, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  chart: CircleDot,
  time: Clock3,
  pair: Combine,
  systems: Shapes,
};

const LAST_KEY = "ulune.studio.group-last";

function loadLast(): Partial<Record<ModeGroupId, StudioPage>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LAST_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function rememberGroupPage(page: StudioPage) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...loadLast(), [groupOf(page)]: page };
    window.localStorage.setItem(LAST_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Four groups. Header centre on wide, bottom tab bar on compact. */
export function GroupBar() {
  const { t } = useI18n();
  const page = useStudioStore((s) => s.page);
  const { setPage } = useStudioUrl({ hydrate: false });
  const active = groupOf(page);
  const index = MODE_GROUPS.findIndex((g) => g.id === active);

  return (
    <nav
      data-testid="studio-nav"
      aria-label={t("studioNav")}
      className="ob-groups"
      style={{ ["--ob-i" as string]: String(Math.max(0, index)) }}
    >
      <div className="ob-groups-track" role="tablist" aria-label={t("studioNav")}>
        <span className="ob-groups-ind" aria-hidden />
        {MODE_GROUPS.map((g) => {
          const on = active === g.id;
          const Icon = ICON[g.id];
          const target = () => {
            const last = loadLast()[g.id];
            const pages = g.pages as readonly StudioPage[];
            return last && pages.includes(last) ? last : pages[0];
          };
          // Fetch the mode as the pointer or focus arrives: it is usually
          // there by the time of the click.
          const ahead = () => {
            if (!on) preloadMode(target());
          };
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              data-testid={`mode-group-${g.id}`}
              aria-selected={on}
              onPointerEnter={ahead}
              onFocus={ahead}
              onClick={() => {
                if (on) return;
                const next = target();
                rememberGroupPage(next);
                setPage(next);
              }}
              className={cn("ob-group", on && "is-on")}
            >
              <Icon className="ob-group-icon" strokeWidth={1.75} />
              <span className="ob-group-label">{t(GROUP_LABEL[g.id])}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
