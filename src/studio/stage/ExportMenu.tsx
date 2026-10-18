import { Share2 } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnchoredPopover } from "@/components/anchored-popover";
import { useShareUi } from "@/components/share/share-state";
import { useI18n } from "@/lib/i18n/locale";
import { canPrefetchAhead, lazyNamed, prefetch, whenIdle } from "@/lib/lazy-component";
import { useExportShown } from "@/studio/stage/export-shown";

/*
 * The toolbar's Share and export: its button and its menu. The menu's items
 * (export-items.tsx: a link to the chart, the picture, print, copy, asking
 * for someone's chart) are their own download, fetched at idle, or when the
 * button is pointed at, focused or pressed, with the export code they use,
 * so it is there by the time an item is picked (copying must happen within
 * the click in Safari).
 */
const loadItems = () => import("@/studio/stage/export-items");
const ExportItems = lazyNamed(loadItems, "ExportItems");
const itemsAhead = () => prefetch(() => Promise.all([loadItems(), import("@/lib/export/chart-summary"), import("@/lib/export/wheel-export")]));

/*
 * The share sheet and a shared chart's arrival note (share plan, feature 1):
 * their code (components/share/share-ui.tsx) comes when one of them shows, or
 * ahead when "Share a link" is pointed at or focused (export-items.tsx).
 */
const ShareUi = lazyNamed(() => import("@/components/share/share-ui"), "ShareUi");

/** Where they are drawn, mounted with the toolbar's menu (they open from here or from the phone's ⋯ menu, MorePanel.tsx). */
function ShareHost() {
  const shown = useShareUi((s) => s.sheet || s.note !== null);
  return shown ? (
    <Suspense fallback={null}>
      <ShareUi />
    </Suspense>
  ) : null;
}

/** The toolbar's Share and export: the ways out in a menu under its button. */
export function ExportMenu({ extraSlot }: { extraSlot?: (el: HTMLElement | null) => void } = {}) {
  const { t } = useI18n();
  const shown = useExportShown();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  // The items' code at idle, on a good connection (the button's point, focus and press fetch it too).
  useEffect(() => (canPrefetchAhead() ? whenIdle(() => prefetch(loadItems), 6000) : undefined), []);
  if (!shown) return null;
  return (
    <>
      <button
        ref={ref}
        type="button"
        className="ob-icon-btn ob-export-btn"
        data-testid="export-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("exportMenu")}
        title={t("exportMenu")}
        onPointerEnter={itemsAhead}
        onFocus={itemsAhead}
        onClick={() => {
          itemsAhead();
          setOpen((v) => !v);
        }}
      >
        <Share2 className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
      <AnchoredPopover
        open={open}
        anchorRef={ref}
        onClose={close}
        hideLabel={t("hidePanel")}
        align="end"
        width={248}
        backdrop={false}
      >
        <div
          role="menu"
          aria-label={t("exportMenu")}
          className="ob-menu"
          data-testid="export-panel"
        >
          <Suspense fallback={null}>
            <ExportItems close={close} extraSlot={extraSlot} />
          </Suspense>
        </div>
      </AnchoredPopover>
      <ShareHost />
    </>
  );
}
