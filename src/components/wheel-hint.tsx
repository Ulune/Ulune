/**
 * A first-run hint on the wheel: how to read it (point or tap a planet to see
 * its aspects, click to pin). It shows once per device, on the first wheel
 * (UI plan, part 95), until something is pinned, it is closed or the page
 * changes; kept in this browser only. It stays away
 * while the tour runs, and the tour's second step, which teaches the same
 * gesture, counts as having seen it.
 */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { SelectionStore } from "@/lib/chart/selection-store";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/locale";
import { useTour } from "@/lib/tour/state";

export const WHEEL_HINT_KEY = "ulune.hint.wheel.v1";
const KEY = WHEEL_HINT_KEY;

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

/**
 * Where a note over the wheel goes, off the chart: in the free band above
 * the wheel where the stage is taller than wide (a phone), else in the
 * port's top-left corner, outside the round of the wheel. `anchor` sits in
 * the wheel's stage; the note is drawn into the port (`port`).
 */
export function usePortPlace(open: boolean, extra: unknown = null) {
  const anchor = useRef<HTMLSpanElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [port, setPort] = useState<HTMLElement | null>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!port) setPort(anchor.current?.closest<HTMLElement>(".ulune-wheel-zoom-port") ?? null);
  }, [port, open]);
  useLayoutEffect(() => {
    const el = ref.current;
    const stage = anchor.current?.parentElement;
    if (!el || !stage || !port) return;
    const s = stage.getBoundingClientRect();
    const p = port.getBoundingClientRect();
    const above = s.top - p.top;
    if (above >= el.offsetHeight + 12) setPlace({ top: `${Math.round((above - el.offsetHeight) / 2)}px` });
    else setPlace({ top: "8px", left: "8px", transform: "none", maxWidth: "220px" });
  }, [open, port, extra]);
  return { anchor, ref, port, place };
}

export function WheelHint({ selection }: { selection: SelectionStore }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [touch, setTouch] = useState(false);
  const pinned = useSyncExternalStore(selection.subscribe, selection.get, () => null);
  const touring = useTour((s) => s.active);
  // Off the chart (review 3 Oct, C5: it sat on the MC until closed).
  const { anchor, ref, port, place } = usePortPlace(open, touring);
  useEffect(() => {
    if (seen()) return;
    setTouch(typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches);
    // After the wheel has drawn itself in.
    // Once per device (part 95): seen as soon as it shows.
    const timer = window.setTimeout(() => {
      setOpen(true);
      remember();
    }, 1600);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (pinned && open) {
      remember();
      setOpen(false);
    }
  }, [pinned, open]);
  if (!open || touring) return <span ref={anchor} hidden />;
  const hint = (
    <div ref={ref} className="ulune-wheel-hint" role="note" data-testid="wheel-hint" style={place ?? { visibility: "hidden" }}>
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
  return (
    <>
      <span ref={anchor} hidden />
      {port ? createPortal(hint, port) : null}
    </>
  );
}
