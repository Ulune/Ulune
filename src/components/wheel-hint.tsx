/**
 * A first-run hint on the wheel: how to read it (point or tap a planet to see
 * its aspects, click to pin). It goes away for good once something is pinned
 * or it is closed; the choice is kept in this browser only.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import type { SelectionStore } from "@/lib/chart/selection-store";
import { useI18n } from "@/lib/i18n/locale";

const KEY = "ulune.hint.wheel.v1";

function seen(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function remember() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* private mode: the hint just comes back next time */
  }
}

export function WheelHint({ selection }: { selection: SelectionStore }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [touch, setTouch] = useState(false);
  const pinned = useSyncExternalStore(selection.subscribe, selection.get, () => null);
  useEffect(() => {
    if (seen()) return;
    setTouch(typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches);
    // After the wheel has drawn itself in.
    const timer = window.setTimeout(() => setOpen(true), 1600);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (pinned && open) {
      remember();
      setOpen(false);
    }
  }, [pinned, open]);
  if (!open) return null;
  return (
    <div className="ulune-wheel-hint" role="note" data-testid="wheel-hint">
      <span>{t(touch ? "wheelHintTap" : "wheelHintPoint")}</span>
      <button
        type="button"
        className="ulune-wheel-hint-close"
        aria-label={t("wheelHintClose")}
        onClick={() => {
          remember();
          setOpen(false);
        }}
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
