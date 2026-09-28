import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { popoverPlacement } from "@/lib/popover-place";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keys that belong to the control itself, not to moving through the panel. */
function ownsArrows(el: Element | null): boolean {
  if (!el) return false;
  if (el.closest('input, select, textarea, [role="radiogroup"], [role="slider"], [role="grid"], [role="listbox"]')) return true;
  return false;
}

export function AnchoredPopover({
  open,
  anchorRef,
  onClose,
  children,
  testId,
  id,
  role,
  "aria-label": ariaLabel,
  hideLabel = "Close",
  align = "start",
  width,
  backdrop = true,
  takeFocus = true,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  id?: string;
  role?: string;
  "aria-label"?: string;
  hideLabel?: string;
  align?: "start" | "end";
  width?: number;
  backdrop?: boolean;
  /**
   * The panel takes the focus when it opens (its [data-autofocus] or first
   * control), gives it back to its button when it closes, and closes when the
   * focus leaves it. Off for a list that follows a field being typed in.
   */
  takeFocus?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return;
    }
    const placeNow = () => {
      const node = anchorRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      const next = popoverPlacement(rect, {
        width: width ?? Math.max(rect.width, 16 * 16),
        height: panel?.height,
        align,
      });
      setPlace(next);
    };
    placeNow();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("resize", placeNow);
    window.addEventListener("scroll", placeNow, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", placeNow);
      window.removeEventListener("scroll", placeNow, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, align, width, onClose]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!open || !takeFocus) return;
    const anchor = anchorRef.current;
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
      target.focus({ preventScroll: true });
    });
    // Tab (or a click) out of the panel closes it.
    const onFocusIn = (e: FocusEvent) => {
      const at = e.target as Node | null;
      if (!at || panelRef.current?.contains(at) || anchorRef.current?.contains(at)) return;
      onCloseRef.current();
    };
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("focusin", onFocusIn);
      // Closed with the focus inside it (gone with it): back to its button.
      // Still open (only the effect's inputs changed), or the focus went
      // somewhere else: leave it.
      if (openRef.current) return;
      const active = document.activeElement;
      if (!active || active === document.body) anchor?.focus({ preventScroll: true });
    };
  }, [open, takeFocus, anchorRef]);

  /** Up and down move through a menu's items (Home and End to either end). */
  const onPanelKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!takeFocus || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    if (ownsArrows(document.activeElement)) return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? items.length - 1
          : e.key === "ArrowDown"
            ? (i + 1) % items.length
            : (i - 1 + items.length) % items.length;
    e.preventDefault();
    items[next]?.focus();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      {backdrop ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default"
          aria-label={hideLabel}
          onClick={onClose}
        />
      ) : null}
      <div
        ref={panelRef}
        id={id}
        role={role}
        aria-label={ariaLabel}
        data-testid={testId}
        tabIndex={-1}
        onKeyDown={onPanelKey}
        className="fixed z-50 max-h-[min(70dvh,32rem)] overflow-auto outline-none"
        style={place ? { top: place.top, left: place.left, width: place.width } : { visibility: "hidden" }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
