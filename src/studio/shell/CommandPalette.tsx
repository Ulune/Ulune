import { Suspense, useEffect, useRef, useState } from "react";
import { lazyNamed, prefetch, whenIdle } from "@/lib/lazy-component";
import { useStudioStore } from "@/studio/store";
import { LENSES, languageOf, lastLanguage, lensesOf, pageFor } from "@/studio/map";
import { openLanguagePicker } from "@/studio/shell/language-open";
import { useStudioUrl } from "@/studio/use-studio-url";
import { usePresence } from "@/lib/presence";

const loadDialog = () => import("@/studio/shell/CommandPaletteDialog");
const CommandPaletteDialog = lazyNamed(loadDialog, "CommandPaletteDialog");

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/**
 * ⌘K / Ctrl+K: jump to any section, language, lens, mode, chart, body, Look
 * profile or setting (CommandPaletteDialog.tsx, loaded ahead at idle).
 * Also: L opens the language picker, Alt+1 to Alt+4 choose the lens (Natal,
 * Cycles, Relationship, Home), T toggles the table, Esc clears the selection; 1 to
 * 4 choose the rings (rings-menu.tsx).
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
      if (open || isTyping(e.target) || e.metaKey || e.ctrlKey) return;
      const s = useStudioStore.getState();
      const busy = () => Boolean(document.querySelector("[role=dialog], [role=menu]"));
      if (e.altKey) {
        // Alt+1 to Alt+4: the lens, in the language on screen (the last one,
        // from the Calendar), when it has that lens. By the key's place, as
        // Alt with a digit types another sign on a Mac.
        const n = /^Digit([1-9])$/.exec(e.code);
        const lens = n ? LENSES[Number(n[1]) - 1] : undefined;
        const lang = languageOf(s.navPage ?? s.page) ?? lastLanguage();
        if (!lens || !lensesOf(lang).includes(lens) || busy()) return;
        e.preventDefault();
        setPage(pageFor(lang, lens));
      } else if ((e.key === "l" || e.key === "L") && !busy()) {
        e.preventDefault();
        // From the Calendar: Charts first, where the language button is.
        if (!openLanguagePicker()) setPage(pageFor(lastLanguage()));
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
