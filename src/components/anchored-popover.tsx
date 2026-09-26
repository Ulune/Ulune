import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { popoverPlacement } from "@/lib/popover-place";

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
        className="fixed z-50 max-h-[min(70dvh,32rem)] overflow-auto"
        style={place ? { top: place.top, left: place.left, width: place.width } : { visibility: "hidden" }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
