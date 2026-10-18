import { ChevronLeft, ChevronRight, Columns2, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { chartDisplayName } from "@/lib/chart/library";
import { showWords } from "@/lib/i18n/catalog/show-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { canCompare as comparableHere, toggleCompare } from "@/studio/compare/comparable";
import { isWide, panelBeside } from "@/studio/dock/dock-layout";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import { leaveShowMode, useShowMode } from "./show-state";
import "./show.css";

/*
 * Show mode (share and compare plan, idea B2): the page on screen as a
 * presentation, for a laptop on a table, a tablet or a TV. Loaded the first
 * time it is used (show-state.ts asks for the full screen; ExtrasHost,
 * host.tsx, draws this while it is on).
 *
 * While it is on (show.css, under html[data-show]): the top bar, the
 * sections, the toolbar, the footer, the zoom and the hints are hidden; the
 * figure takes the room they leave; the side panel shows the reading only,
 * in large type, beside the figure on a wide or sideways screen and under it
 * on one held upright; the Chinese pages and numerology, drawn at a set
 * size, are drawn larger on a large screen. The selection works as ever: a
 * planet, a gate, a pillar tapped, its reading comes in large type.
 *
 * A discreet bar comes at the top when the mouse moves or the screen is
 * tapped (and stays while it is pointed at or holds the focus): the page and
 * whose chart it is, the previous and next chart in the switcher's order
 * (also Page Up and Page Down, as a presenter's clicker sends them),
 * Compare's toggle where the page has Compare (its two panes then shown
 * large, studio/compare), and Leave.
 * Escape leaves too, and so does leaving the browser's full screen; leaving
 * puts back the panel as it was and the focus on Show mode's button. A
 * phone held upright is told once that turning it gives a larger chart.
 * With reduced motion asked for, nothing slides or fades.
 */

/** The pages drawn at a set size (pillars, cards, a wheel of numbers): drawn larger on a large screen (show.css). */
const DRAWN_LARGER: ReadonlySet<StudioPage> = new Set<StudioPage>([
  "numerology",
  "numerology-cycles",
  "numerology-pair",
  "zodiac",
  "zodiac-years",
  "zodiac-pair",
  "bazi",
  "bazi-luck",
  "bazi-pair",
  "fengshui",
  "fengshui-pair",
  "fengshui-home",
  "fengshui-cycles",
]);

/** How long the bar stays once the mouse is still (ms). */
const BAR_MS = 2600;

/** The keyboard's focus in the bar (not a button's after a click with the mouse, which lets the bar go). */
function keyboardIn(bar: HTMLElement): boolean {
  try {
    return Boolean(bar.querySelector(":focus-visible"));
  } catch {
    return bar.contains(document.activeElement);
  }
}

type FullscreenDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };

function fullscreenElement(): Element | null {
  const d = document as FullscreenDoc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

function exitFullscreen(): void {
  const d = document as FullscreenDoc;
  try {
    if (d.fullscreenElement && d.exitFullscreen) void d.exitFullscreen().catch(() => {});
    else if (d.webkitFullscreenElement && d.webkitExitFullscreen) d.webkitExitFullscreen();
  } catch {
    /* already left */
  }
}

/** A key typed into a field, or pressed while a dialog (the engine's question too) or a menu is open, is theirs. */
function keyIsElsewhere(e: KeyboardEvent): boolean {
  const el = e.target;
  if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return true;
  return Boolean(document.querySelector("[role=dialog], [role=alertdialog], [role=menu]"));
}

/** Page Up and Page Down are a control's own in the reading (which they scroll) and in a list, a grid or a dial (the time dial, a month). */
const OWNS_PAGE_KEYS = ".ob-panel, [role=listbox], [role=grid], [role=slider], [role=radiogroup], [role=spinbutton]";

export function ShowMode() {
  const { t: tc, locale } = useI18n();
  const t = bookT(showWords, tc, locale);
  const page = useStudioStore((s) => s.page);
  const chart = useStudioStore((s) => s.chart);
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const compareOn = useStudioStore((s) => s.compare.on);
  const canCompare = useStudioStore(comparableHere);
  const [barShown, setBarShown] = useState(true);
  const [rotate, setRotate] = useState(false);
  // Said once the region is on the page (a live region filled as it appears is not always read).
  const [said, setSaid] = useState("");
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef(0);

  // The charts in the switcher's order (the most recent first), and the ones either side of this one.
  const { prev, next } = useMemo(() => {
    const ordered = [...rows].sort((a, b) => b.savedAt - a.savedAt);
    const at = ordered.findIndex((r) => r.id === activeId);
    if (ordered.length < 2 || at < 0) return { prev: null, next: null };
    return { prev: ordered[(at - 1 + ordered.length) % ordered.length], next: ordered[(at + 1) % ordered.length] };
  }, [rows, activeId]);
  const go = useCallback((id: string | undefined) => {
    const s = useStudioStore.getState();
    if (id && !s.creating && !s.pair.addingPartnerFor) s.select(id);
  }, []);

  // In: the reading shown in the panel, the page's attribute set; out: the panel as it was, the focus back.
  // (Compare's two charts on a screen too narrow for them and the panel (studio/compare): the reading
  // stays folded at the bottom, so the two are large; a tap on a chart brings it up, as ever.)
  useLayoutEffect(() => {
    const s = useStudioStore.getState();
    const before = { dock: s.dock, dockOpen: s.dockOpen };
    useStudioStore.setState(isWide() && !panelBeside() ? { dock: "reading" } : { dock: "reading", dockOpen: true });
    const html = document.documentElement;
    html.setAttribute("data-show", "");
    // Under the bar's controls, before the page's (the focus left the button Show mode hid).
    document.getElementById("main")?.focus({ preventScroll: true });
    return () => {
      html.removeAttribute("data-show");
      html.removeAttribute("data-show-larger");
      useStudioStore.setState(before);
      // Still on: drawn again at once (React's second pass in development), the full screen and the focus stay.
      if (useShowMode.getState().on) return;
      // The full screen Show mode asked for (only it asks for the whole page's) goes with it.
      if (fullscreenElement() === html) exitFullscreen();
      window.requestAnimationFrame(() => {
        const button = document.querySelector<HTMLElement>("[data-testid=show-open]");
        (button && button.offsetParent ? button : document.getElementById("main"))?.focus({ preventScroll: true });
      });
    };
  }, []);

  useLayoutEffect(() => {
    const html = document.documentElement;
    if (DRAWN_LARGER.has(page)) html.setAttribute("data-show-larger", "");
    else html.removeAttribute("data-show-larger");
  }, [page]);

  // The bar: shown on a move or a tap, gone once all is still (not while it is pointed at or focused).
  const showBar = useCallback(() => {
    setBarShown(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const bar = barRef.current;
      if (bar && (bar.matches(":hover") || keyboardIn(bar))) return;
      setBarShown(false);
    }, BAR_MS);
  }, []);
  useEffect(() => {
    showBar();
    const onMove = (e: PointerEvent) => {
      // A pen or a mouse that moves; a finger that taps.
      if (e.type === "pointermove" && e.pointerType === "touch") return;
      showBar();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.clearTimeout(hideTimer.current);
    };
  }, [showBar]);

  // Escape leaves; Page Up and Page Down go to the previous and next chart (a presenter's clicker).
  const latest = useRef({ prev, next, go });
  latest.current = { prev, next, go };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || keyIsElsewhere(e)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        leaveShowMode();
      } else if (e.key === "PageDown" || e.key === "PageUp") {
        // Not while the focus is in the reading, which they scroll, nor in a control that uses them.
        const at = document.activeElement;
        if (at instanceof HTMLElement && at.closest(OWNS_PAGE_KEYS)) return;
        const { prev: p, next: n, go: open } = latest.current;
        const to = e.key === "PageDown" ? n : p;
        if (!to) return;
        e.preventDefault();
        open(to.id);
      }
    };
    // Before the page's own keys (the palette's Escape lets go of the selection: here it leaves).
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // The browser's full screen left (its own Escape, its menu): Show mode goes with it.
  useEffect(() => {
    let full = fullscreenElement() === document.documentElement;
    const onChange = () => {
      const now = fullscreenElement() === document.documentElement;
      if (full && !now) leaveShowMode();
      full = now;
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setSaid(t("showOn")), 150);
    return () => window.clearTimeout(id);
    // Once, as Show mode starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A phone held upright: once, the hint to turn it; gone when it turns, or after a while.
  useEffect(() => {
    const upright = window.matchMedia("(pointer: coarse) and (orientation: portrait) and (max-width: 599.98px)");
    if (!upright.matches) return;
    setRotate(true);
    const off = () => setRotate(false);
    const timer = window.setTimeout(off, 7000);
    upright.addEventListener("change", off);
    return () => {
      window.clearTimeout(timer);
      upright.removeEventListener("change", off);
    };
  }, []);

  const name = chart?.meta.name || null;
  const label = (row: (typeof rows)[number]) => chartDisplayName(row.input, tc("untitled"));
  return (
    <>
      <div
        ref={barRef}
        className="ob-show-bar"
        role="toolbar"
        aria-label={t("showBar")}
        data-testid="show-bar"
        data-shown={barShown ? "" : undefined}
        onFocus={showBar}
        onPointerEnter={showBar}
      >
        <p className="ob-show-where" data-testid="show-where">
          <span className="ob-show-page">{tc(PAGE_LABEL[page])}</span>
          {name ? (
            <>
              <span className="ob-show-dot" aria-hidden>
                ·
              </span>
              <span className="ob-show-name">{name}</span>
            </>
          ) : null}
        </p>
        <p className="ob-show-keys" aria-hidden>
          {t("showKeys")}
        </p>
        <div className="ob-show-tools">
          {prev && next ? (
            <>
              <button
                type="button"
                className="ob-icon-btn ob-show-btn"
                data-testid="show-prev"
                aria-label={t("showPrev", { name: label(prev) })}
                title={t("showPrev", { name: label(prev) })}
                onClick={() => go(prev.id)}
              >
                <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className="ob-icon-btn ob-show-btn"
                data-testid="show-next"
                aria-label={t("showNext", { name: label(next) })}
                title={t("showNext", { name: label(next) })}
                onClick={() => go(next.id)}
              >
                <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />
              </button>
            </>
          ) : null}
          {canCompare ? (
            <button
              type="button"
              className="ob-icon-btn ob-show-btn"
              data-testid="show-compare"
              aria-pressed={compareOn}
              aria-label={tc("compare")}
              title={tc("compare")}
              onClick={toggleCompare}
            >
              <Columns2 className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className="ob-btn ob-btn--ghost ob-show-leave"
            data-testid="show-leave"
            aria-label={t("showLeave")}
            title={`${t("showLeave")} (Esc)`}
            onClick={leaveShowMode}
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
            <span>{t("showLeaveShort")}</span>
          </button>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {said}
      </p>
      {rotate ? (
        <p className="ob-show-rotate" data-testid="show-rotate" role="note">
          <RotateCw className="size-4" strokeWidth={1.75} aria-hidden />
          <span>{t("showRotate")}</span>
        </p>
      ) : null}
    </>
  );
}
