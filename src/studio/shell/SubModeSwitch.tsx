import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { preloadMode } from "@/studio/modes/registry";
import { rememberGroupPage } from "@/studio/shell/GroupBar";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";
import { MODE_GROUPS, groupOf, type StudioPage } from "@/studio/url";

/** Modes inside the active group. Hidden for one-mode groups. */
export function SubModeSwitch() {
  const { t } = useI18n();
  const page = useStudioStore((s) => s.page);
  const { setPage } = useStudioUrl({ hydrate: false });
  const group = MODE_GROUPS.find((g) => g.id === groupOf(page));
  const pages = (group?.pages ?? []) as readonly StudioPage[];
  if (pages.length <= 1) return null;
  const index = Math.max(0, pages.indexOf(page));
  return (
    <div
      className="ob-submodes"
      role="tablist"
      aria-label={t("shellModes")}
      data-testid="submode-switch"
      style={{ ["--ob-i" as string]: String(index), ["--ob-n" as string]: String(pages.length) }}
    >
      <span className="ob-submodes-ind" aria-hidden />
      {pages.map((id) => {
        const on = id === page;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            data-page={id}
            data-testid={`studio-page-${id}`}
            aria-selected={on}
            onPointerEnter={() => preloadMode(id)}
            onFocus={() => preloadMode(id)}
            onClick={() => {
              if (on) return;
              rememberGroupPage(id);
              setPage(id);
            }}
            className={cn("ob-submode", on && "is-on")}
          >
            <span className="ob-submode-label">{t(PAGE_LABEL[id])}</span>
          </button>
        );
      })}
    </div>
  );
}
