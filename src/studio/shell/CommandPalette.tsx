import { Suspense, useEffect, useRef, useState } from "react";
import { lazyNamed, prefetch, whenIdle } from "@/lib/lazy-component";
import { useStudioStore } from "@/studio/store";
import { MODE_GROUPS, type StudioPage } from "@/studio/url";
import { useStudioUrl } from "@/studio/use-studio-url";
import { usePresence } from "@/lib/presence";

const loadDialog = () => import("@/studio/shell/CommandPaletteDialog");
const CommandPaletteDialog = lazyNamed(loadDialog, "CommandPaletteDialog");

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/**
 * ⌘K / Ctrl+K: jump to any mode, chart, body, Look profile or setting
 * (CommandPaletteDialog.tsx, loaded ahead at idle).
 * Also: 1–4 switch groups, T toggles the table, Esc clears the selection.
 */
export function CommandPalette() {
  const { setPage, setView } = useStudioUrl({ hydrate: false });
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  // One key listener for the palette's lifetime; it reads the latest state
  // from a ref (it used to be re-attached after every render).
  const latest = useRef({ open, setPage, setView });
  useEffect(() => {
    latest.current = { open, setPage, setView };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { open, setPage, setView } = latest.current;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        returnFocus.current = document.activeElement as HTMLElement | null;
        setOpen((v) => !v);
        return;
      }
      if (open || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStudioStore.getState();
      if (/^[1-4]$/.test(e.key) && s.chart) {
        const group = MODE_GROUPS[Number(e.key) - 1];
        if (group) setPage(group.pages[0] as StudioPage);
      } else if (e.key === "t" || e.key === "T") {
        if (s.chart) setView(s.view === "table" ? "wheel" : "table");
      } else if (e.key === "Escape" && s.selectedId) {
        const el = document.activeElement;
        if (!el || el === document.body || (el instanceof HTMLElement && el.closest(".ob-stage"))) s.clear();
      }
    };
    const onOpen = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("ulune:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ulune:palette", onOpen);
    };
  }, []);

  // The palette's code, ahead of the first ⌘K.
  useEffect(() => whenIdle(() => prefetch(loadDialog), 5000), []);

  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => returnFocus.current?.focus?.());
  };

  // Closing, it fades out first (lib/presence.ts).
  const { shown, leaving } = usePresence(open);
  if (!shown) return null;
  return (
    <div className="contents" data-leaving={leaving ? "" : undefined} inert={leaving || undefined}>
      <Suspense fallback={null}>
        <CommandPaletteDialog onClose={close} />
      </Suspense>
    </div>
  );
}
