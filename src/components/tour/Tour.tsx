/**
 * The tour: eight short steps on the chart on screen (or on the sample, cast
 * for it), started only from a link, the guide or the menu. A soft ring shows
 * what each step is about and a card beside it says it; the page stays usable
 * underneath. Skip, Escape or Done end it and remember, on this device only,
 * that it was taken (lib/tour/state.ts). It downloads when it starts.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sampleBirth } from "@/lib/chart/sample";
import { useI18n } from "@/lib/i18n/locale";
import { endTour } from "@/lib/tour/state";
import { TOUR_STEPS, TOUR_WORDS, type TourStep } from "@/lib/tour/steps";
import { WHEEL_HINT_KEY } from "@/components/wheel-hint";
import { isWide } from "@/studio/dock/dock-layout";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";

type Rect = { x: number; y: number; w: number; h: number };
/** On a computer, where the card stands; on a phone, which edge of the screen holds it (CSS places it there). */
type Place = { style?: { left: number; top: number }; edge?: "top" | "bottom" };

const GAP = 16;
const MARGIN = 12;
/** How long a step may look for what it points at before the tour gives up (the reader left the chart). */
const LOST_MS = 1500;
/** The sample, cast for the tour, has this long to reach the screen. */
const READY_MS = 45000;

const WHEEL = '[data-testid="studio-natal"] svg.ulune-wheel:not(.ulune-wheel-ghost)';

function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/** What the step points at: the first of its targets that is on screen (the wheel itself before its frame). */
function findTarget(step: TourStep): Element | null {
  const selectors = step.targets[0]?.includes("studio-natal") ? [WHEEL, ...step.targets] : step.targets;
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return step.id === "table" ? (el.closest(".ulune-seg") ?? el) : el;
  }
  return null;
}

function sameRect(a: Rect | null, r: DOMRect): boolean {
  return (
    !!a && Math.abs(a.x - r.left) < 0.5 && Math.abs(a.y - r.top) < 0.5 && Math.abs(a.w - r.width) < 0.5 && Math.abs(a.h - r.height) < 0.5
  );
}

/** Beside the target on a computer; at the bottom of a phone's screen, above the tabs (at the top when that covers less of the target). */
function placeCard(rect: Rect | null, card: { w: number; h: number }, compact: boolean): Place {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (compact || !rect) {
    if (!rect) return { edge: "bottom" };
    // Where each edge would hold the card (shell.css), and which covers less of the target.
    const css = getComputedStyle(document.documentElement);
    const px = (name: string, or: number) => parseFloat(css.getPropertyValue(name)) || or;
    const bottomTop = vh - px("--ob-group-h", 64) - px("--ob-safe-b", 0) - 12 - card.h;
    const topBottom = px("--ob-top-h", 48) + 8 + card.h;
    const underBottom = Math.max(0, Math.min(rect.y + rect.h, vh) - Math.max(rect.y, bottomTop));
    const underTop = Math.max(0, Math.min(rect.y + rect.h, topBottom) - Math.max(rect.y, 0));
    return { edge: underBottom > underTop ? "top" : "bottom" };
  }
  const clampX = (x: number) => Math.min(Math.max(x, MARGIN), vw - card.w - MARGIN);
  const clampY = (y: number) => Math.min(Math.max(y, MARGIN), vh - card.h - MARGIN);
  const right = rect.x + rect.w + GAP;
  if (right + card.w <= vw - MARGIN) return { style: { left: right, top: clampY(rect.y) } };
  const left = rect.x - GAP - card.w;
  if (left >= MARGIN) return { style: { left, top: clampY(rect.y) } };
  const below = rect.y + rect.h + GAP;
  if (below + card.h <= vh - MARGIN) return { style: { left: clampX(rect.x), top: below } };
  const above = rect.y - GAP - card.h;
  if (above >= MARGIN) return { style: { left: clampX(rect.x), top: above } };
  return { style: { left: vw - card.w - MARGIN, top: vh - card.h - MARGIN } };
}

/** The sample, whatever its date looks like once cast: its place is Greenwich, to the ten-thousandth of a degree. */
function isSample(input: { latitude: number; longitude: number }): boolean {
  const s = sampleBirth("");
  return input.latitude === s.latitude && input.longitude === s.longitude;
}

export function Tour() {
  const { locale, t } = useI18n();
  const L = locale === "fr" ? 1 : 0;
  const w = (key: keyof typeof TOUR_WORDS) => TOUR_WORDS[key][L];
  const chart = useStudioStore((s) => s.chart);
  const input = useStudioStore((s) => s.input);
  const { setPage, setView } = useStudioUrl({ hydrate: false });
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [compact, setCompact] = useState(() => !isWide());
  const [card, setCard] = useState({ w: 320, h: 180 });
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const reduced = useMemo(reducedMotion, []);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  // Before the first step: the chart on screen, on the birth chart's wheel; the sample when there is none.
  useEffect(() => {
    const s = useStudioStore.getState();
    if (s.creating || s.pair.addingPartnerFor) {
      if (!s.chart) void s.cast(sampleBirth(t("sampleName")));
      else s.discardDraft();
    } else if (!s.chart) {
      void s.cast(sampleBirth(t("sampleName")));
    }
    if (s.page !== "natal") setPage("natal");
    if (s.view !== "wheel") setView("wheel");
    const started = performance.now();
    const timer = window.setInterval(() => {
      const st = useStudioStore.getState();
      if (st.chart && !st.creating && document.querySelector('[data-testid="studio-natal"] .ulune-stage-figure')) {
        window.clearInterval(timer);
        setReady(true);
      } else if (performance.now() - started > READY_MS) {
        window.clearInterval(timer);
        endTour(false);
      }
    }, 100);
    return () => window.clearInterval(timer);
    // Once, when the tour opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => setCompact(!isWide());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The reading step opens the panel (a sheet on a phone) and puts it back as it was.
  useEffect(() => {
    if (!ready || step.id !== "reading") return;
    const before = useStudioStore.getState();
    const wasOpen = before.dockOpen;
    const wasTab = before.dock;
    useStudioStore.setState({ dock: "reading", dockOpen: true });
    return () => useStudioStore.setState({ dock: wasTab, dockOpen: wasOpen });
  }, [ready, step.id]);

  // The second step teaches what the wheel's first-run hint says: it counts as seen.
  useEffect(() => {
    if (!ready || step.id !== "planets") return;
    try {
      window.localStorage.setItem(WHEEL_HINT_KEY, "1");
    } catch {
      /* private mode */
    }
  }, [ready, step.id]);

  // Follow the target: it can move (a sheet rising, a resize, a scroll).
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let lostSince = 0;
    // Nothing is scrolled into view: the studio is one fixed screen, and scrolling
    // an element there would shift the whole app (its frame hides overflow).
    const tick = () => {
      const el = findTarget(step);
      if (el) {
        lostSince = 0;
        const r = el.getBoundingClientRect();
        setRect((prev) => (sameRect(prev, r) ? prev : { x: r.left, y: r.top, w: r.width, h: r.height }));
      } else {
        lostSince ||= performance.now();
        if (performance.now() - lostSince > LOST_MS) {
          endTour(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [ready, step]);

  // The card's size, for placing it: it changes with the step, the language and the layout.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (Math.abs(r.width - card.w) > 0.5 || Math.abs(r.height - card.h) > 0.5) setCard({ w: r.width, h: r.height });
  }, [card.w, card.h, index, ready, compact, L]);

  // Focus goes to the step's main button, so Enter moves on and a screen reader hears the step.
  useEffect(() => {
    if (ready) primaryRef.current?.focus({ preventScroll: true });
    else cardRef.current?.focus({ preventScroll: true });
  }, [ready, index]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1)), []);
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const skip = useCallback(() => endTour(true), []);
  const done = useCallback(() => endTour(true), []);
  const castOwn = useCallback(() => {
    endTour(true);
    useStudioStore.getState().startNew();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      } else if (ready && !typing(e.target) && e.key === "ArrowRight" && !last) {
        e.preventDefault();
        next();
      } else if (ready && !typing(e.target) && e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, last, index, next, back, skip]);

  const who = useMemo(() => {
    if (!chart) return w("whoSample");
    if (isSample(input)) return w("whoSample");
    const name = input.name?.trim();
    return name ? w("whoNamed").replace("{name}", name) : w("whoOwn");
    // w reads the locale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, input, L]);

  const place = placeCard(ready ? rect : null, card, compact);
  const body = ((compact && step.compact) || step.body)[L].replace("{who}", who);
  const ring = ready && rect;
  const round = ring && step.targets[0]?.includes("studio-natal") && Math.abs(rect.w - rect.h) < 2;

  return createPortal(
    <>
      {ring ? (
        <div
          className="ob-tour-ring"
          data-motion={reduced ? "off" : "on"}
          data-round={round ? "1" : undefined}
          aria-hidden="true"
          style={{ left: rect.x - 6, top: rect.y - 6, width: rect.w + 12, height: rect.h + 12 }}
        />
      ) : null}
      <div
        ref={cardRef}
        className="ob-tour-card"
        data-edge={place.edge}
        data-testid="tour-card"
        data-step={ready ? step.id : "preparing"}
        role="dialog"
        aria-modal="false"
        aria-label={w("label")}
        aria-describedby="ob-tour-body"
        tabIndex={-1}
        style={place.style}
      >
        {ready ? (
          <>
            <p className="ob-tour-count">
              {w("count").replace("{n}", String(index + 1)).replace("{total}", String(TOUR_STEPS.length))}
            </p>
            <h2 className="ob-tour-title">{step.title[L]}</h2>
            <p id="ob-tour-body" className="ob-tour-body" aria-live="polite">
              {body}
            </p>
          </>
        ) : (
          <p id="ob-tour-body" className="ob-tour-body" aria-live="polite">
            {w("preparing")}
          </p>
        )}
        <div className="ob-tour-actions">
          <button type="button" className="ob-tour-skip" data-testid="tour-skip" onClick={skip}>
            {w("skip")}
          </button>
          {ready ? (
            <span className="ob-tour-nav">
              {index > 0 ? (
                <button type="button" className="ob-btn" data-testid="tour-back" onClick={back}>
                  {w("back")}
                </button>
              ) : null}
              {last ? (
                <>
                  <button type="button" className="ob-btn" data-testid="tour-cast-own" onClick={castOwn}>
                    {w("castOwn")}
                  </button>
                  <button
                    ref={primaryRef}
                    type="button"
                    className="ob-btn ob-btn--primary"
                    data-testid="tour-done"
                    onClick={done}
                  >
                    {w("done")}
                  </button>
                </>
              ) : (
                <button
                  ref={primaryRef}
                  type="button"
                  className="ob-btn ob-btn--primary"
                  data-testid="tour-next"
                  onClick={next}
                >
                  {w("next")}
                </button>
              )}
            </span>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
}
