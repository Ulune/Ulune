import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useI18n } from "@/lib/i18n/locale";
import { dateFormat } from "@/lib/intl-cache";
import {
  addSteps,
  isStepUnit,
  msPerPx,
  STEP_UNITS,
  tapeTicks,
  UNIT_MS,
  UNIT_PX,
  wheelSteps,
  type StepUnit,
  type TapeTick,
} from "@/studio/modes/time-tape";
import "@/studio/modes/styles/time.css";

/** A flick goes on by itself while it is faster than this (px per ms), slowing as a wheel would. */
const FLICK_MIN = 0.35;
const FLICK_STOP = 0.02;
const FLICK_DECAY_MS = 320;
/** Play: a step every this long where each moment is a cast (the sky moves smoothly otherwise). */
const PLAY_TICK_MS = 450;

function loadUnit(key: string, units: readonly StepUnit[], fallback: StepUnit): StepUnit {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (isStepUnit(raw) && units.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Moving a chart through time with a hand that can be precise (part 87d), as
 * the desktop programs do: a step to choose (a minute to a year), ‹ › to take
 * one (Shift: ten; ← → on the page too), play forward or backward, and a tape of dates under a
 * fixed needle whose scale follows the step, so a drag, a flick, a wheel or
 * the arrow keys move time by whole steps (time-tape.ts). It replaces a slider
 * across two years, where a pixel was most of a day.
 *
 * `smooth`: the sky can be drawn here at any moment (the scrub window), so a
 * flick glides and Play runs every frame up to a week a second; otherwise Play
 * takes a step at a time, one cast each.
 */
export function TimeDial({
  value,
  onChange,
  min,
  max,
  units = STEP_UNITS,
  defaultUnit = "day",
  storageKey,
  testId,
  label,
  smooth = false,
  timeZone,
  withTime = true,
}: {
  value: number;
  onChange: (ms: number) => void;
  min: number;
  max: number;
  units?: readonly StepUnit[];
  defaultUnit?: StepUnit;
  storageKey: string;
  testId: string;
  label: string;
  smooth?: boolean;
  /** The readout's and the tape's zone (the birth place's for progressions); this device's when absent. */
  timeZone?: string;
  /** The readout shows the time of day. */
  withTime?: boolean;
}) {
  const { locale, t } = useI18n();
  const tag = locale === "fr" ? "fr-FR" : "en-GB";
  const [unit, setUnitState] = useState<StepUnit>(defaultUnit);
  const [playing, setPlaying] = useState<0 | 1 | -1>(0);
  const [reduced, setReduced] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const unitRef = useRef(unit);
  unitRef.current = unit;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setUnitState(loadUnit(storageKey, units, defaultUnit));
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const setUnit = (next: StepUnit) => {
    setUnitState(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      /* ignore */
    }
  };

  const clamp = useCallback((ms: number) => Math.min(max, Math.max(min, ms)), [min, max]);
  const emit = useCallback(
    (ms: number) => {
      const next = clamp(Math.round(ms));
      if (next !== valueRef.current) onChangeRef.current(next);
      return next;
    },
    [clamp],
  );
  const step = (dir: 1 | -1, times = 1) => {
    setPlaying(0);
    emit(addSteps(valueRef.current, unitRef.current, dir * times));
  };

  // ── Play, either way ────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || reduced) return;
    const dir = playing;
    const u = unit;
    const atEdge = (ms: number) => (dir > 0 ? ms >= max : ms <= min);
    if (!smooth || UNIT_MS[u] > UNIT_MS.week) {
      const id = window.setInterval(() => {
        const next = emit(addSteps(valueRef.current, u, dir));
        if (atEdge(next)) setPlaying(0);
      }, PLAY_TICK_MS);
      return () => window.clearInterval(id);
    }
    // A step a second, every frame (a hidden tab's frames pause it).
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(100, Math.max(0, now - last));
      last = now;
      const next = emit(valueRef.current + dir * (dt / 1000) * UNIT_MS[u]);
      if (atEdge(next)) setPlaying(0);
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, unit, smooth, min, max, emit]);

  // ── The tape ────────────────────────────────────────────────────────
  const tapeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [inkEpoch, setInkEpoch] = useState(0);
  const ink = useRef<{ epoch: number; fg: string; muted: string; faint: string; bg: string; mono: string } | null>(null);
  useEffect(() => {
    const el = tapeRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    // The theme changes the tape's ink.
    const mo = new MutationObserver(() => setInkEpoch((n) => n + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const h = 40; // .ulune-time-tape's height (reading it would force a layout on every frame)
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, h);
    // The theme's ink, read once per theme (reading styles on every frame of a drag forced a style pass each time).
    if (!ink.current || ink.current.epoch !== inkEpoch) {
      const css = getComputedStyle(canvas);
      const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      ink.current = {
        epoch: inkEpoch,
        fg: v("--color-fg", "#eee"),
        muted: v("--color-fg-muted", "#999"),
        faint: v("--color-border-strong", "#555"),
        bg: v("--color-bg", "#111"),
        mono: v("--font-mono", "monospace"),
      };
    }
    const { fg, muted, faint, bg, mono } = ink.current;
    const per = msPerPx(unit);
    const mid = width / 2;
    const v = clamp(value);
    const from = v - mid * per;
    const to = v + mid * per;
    const ticks = tapeTicks(unit, from, to);
    const words = labelWords(tag, unit);
    ctx.lineWidth = 1;
    ctx.font = `10.5px ${mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    let lastRight = -Infinity;
    for (const tick of ticks) {
      const x = Math.round(mid + (tick.t - v) / per) + 0.5;
      const len = tick.level === 2 ? 13 : tick.level === 1 ? 9 : 5;
      ctx.strokeStyle = tick.level === 2 ? muted : faint;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, len);
      ctx.stroke();
      if (!tick.label) continue;
      const text = words(tick);
      const w = ctx.measureText(text).width;
      if (x - w / 2 < lastRight + 8) continue;
      ctx.fillStyle = tick.level === 2 ? muted : faint;
      ctx.fillText(text, x, h - 6);
      lastRight = x + w / 2;
    }
    // Outside the dates the chart can be cast for, the tape is empty.
    ctx.fillStyle = bg;
    const lo = mid + (min - v) / per;
    const hi = mid + (max - v) / per;
    ctx.globalAlpha = 0.7;
    if (lo > 0) ctx.fillRect(0, 0, lo, h);
    if (hi < width) ctx.fillRect(hi, 0, width - hi, h);
    ctx.globalAlpha = 1;
    // The needle: now on the chart.
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mid, 0);
    ctx.lineTo(mid, h - 18);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(mid - 5, 0);
    ctx.lineTo(mid + 5, 0);
    ctx.lineTo(mid, 6);
    ctx.closePath();
    ctx.fill();
  }, [value, unit, width, tag, inkEpoch, clamp, min, max]);

  // Drag and flick: the tape follows the hand, in whole steps.
  const drag = useRef<{ id: number; x0: number; v0: number; last: number; trail: { x: number; t: number }[] } | null>(null);
  const flick = useRef(0);
  const stopFlick = () => {
    if (flick.current) cancelAnimationFrame(flick.current);
    flick.current = 0;
  };
  useEffect(() => stopFlick, []);
  /**
   * The tape moved by dx px since the press: time follows it smoothly while
   * the hand (or a flick) moves it, and settles on a whole number of steps
   * from where it started when it stops.
   */
  const moveBy = (v0: number, dx: number, settle: boolean) => {
    const u = unitRef.current;
    if (settle) return emit(addSteps(v0, u, Math.round(-dx / UNIT_PX[u])));
    return emit(v0 - dx * msPerPx(u));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    stopFlick();
    setPlaying(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* a pointer the browser no longer knows (a test's, or one already gone) */
    }
    e.currentTarget.setAttribute("data-dragging", "");
    drag.current = { id: e.pointerId, x0: e.clientX, v0: valueRef.current, last: e.clientX, trail: [{ x: e.clientX, t: e.timeStamp }] };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.last = e.clientX;
    d.trail.push({ x: e.clientX, t: e.timeStamp });
    if (d.trail.length > 8) d.trail.shift();
    moveBy(d.v0, e.clientX - d.x0, false);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    e.currentTarget.removeAttribute("data-dragging");
    const settle = () => moveBy(d.v0, d.last - d.x0, true);
    if (!smooth || reduced) return void settle();
    const recent = d.trail.filter((p) => e.timeStamp - p.t < 90);
    const first = recent[0];
    const lastPt = recent[recent.length - 1];
    let vel = recent.length < 2 ? 0 : (lastPt.x - first.x) / Math.max(1, lastPt.t - first.t);
    if (Math.abs(vel) < FLICK_MIN) return void settle();
    let dx = d.last - d.x0;
    let prev = performance.now();
    const glide = (now: number) => {
      const dt = Math.min(50, now - prev);
      prev = now;
      dx += vel * dt;
      vel *= Math.exp(-dt / FLICK_DECAY_MS);
      const done = Math.abs(vel) < FLICK_STOP;
      const at = moveBy(d.v0, dx, done);
      if (done || at <= min || at >= max) {
        if (!done) moveBy(d.v0, dx, true);
        flick.current = 0;
        return;
      }
      flick.current = requestAnimationFrame(glide);
    };
    flick.current = requestAnimationFrame(glide);
  };

  // A wheel or a trackpad over the tape moves it (and not the page).
  const wheelCarry = useRef(0);
  useEffect(() => {
    const el = tapeRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      stopFlick();
      setPlaying(0);
      const { steps, carry } = wheelSteps(delta, e.deltaMode, unitRef.current, wheelCarry.current);
      wheelCarry.current = carry;
      if (steps) emit(addSteps(valueRef.current, unitRef.current, steps));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [emit]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const times = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") step(1, times);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") step(-1, times);
    else if (e.key === "PageUp") step(1, 10);
    else if (e.key === "PageDown") step(-1, 10);
    else return;
    e.preventDefault();
  };
  // On the page, with nothing else holding the keys (no field, no wheel, no
  // menu in focus), ← → step too, as in the desktop programs.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const onPageKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const at = document.activeElement;
      if (at && at !== document.body && at !== document.documentElement) return;
      if (document.querySelector("[role=dialog], [role=menu]")) return;
      e.preventDefault();
      stepRef.current(e.key === "ArrowRight" ? 1 : -1, e.shiftKey ? 10 : 1);
    };
    document.addEventListener("keydown", onPageKey);
    return () => document.removeEventListener("keydown", onPageKey);
  }, []);
  const onStep = (dir: 1 | -1) => (e: MouseEvent<HTMLButtonElement>) => step(dir, e.shiftKey ? 10 : 1);
  const togglePlay = (dir: 1 | -1) => {
    stopFlick();
    setPlaying((p) => (p === dir ? 0 : dir));
  };

  const shown = clamp(value);
  const day = dateFormat(tag, { dateStyle: "medium", ...(timeZone ? { timeZone } : {}) }).format(shown);
  const clock = withTime ? dateFormat(tag, { timeStyle: "short", ...(timeZone ? { timeZone } : {}) }).format(shown) : "";
  const readout = clock ? `${day}, ${clock}` : day;
  const stepName = t(`scrubUnit_${unit}` as const);

  return (
    <div className="ulune-time-scrub ulune-time-dial" data-testid={`${testId}-band`}>
      <div className="ulune-time-scrub-head">
        <button
          type="button"
          className="ob-icon-btn ob-icon-btn--quiet ulune-time-play-back"
          data-testid={`${testId}-play-back`}
          aria-pressed={playing === -1}
          aria-label={playing === -1 ? t("scrubPause") : t("scrubPlayBack")}
          title={reduced ? t("scrubPlayReduced") : playing === -1 ? t("scrubPause") : t("scrubPlayBack")}
          disabled={reduced}
          onClick={() => togglePlay(-1)}
        >
          {playing === -1 ? (
            <Pause className="size-4" strokeWidth={1.75} />
          ) : (
            <Play className="size-4 -scale-x-100" strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          className="ob-icon-btn ob-icon-btn--quiet"
          data-testid={`${testId}-back`}
          aria-label={`${t("scrubBack")}: ${stepName}`}
          title={`${t("scrubBack")}: ${stepName} (${t("scrubShiftTen")})`}
          onClick={onStep(-1)}
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
        </button>
        <p data-testid={`${testId}-readout`} className="ulune-time-readout" aria-live="polite">
          <span>{day}</span>
          {clock ? <span className="ulune-time-readout-clock">{clock}</span> : null}
        </p>
        <button
          type="button"
          className="ob-icon-btn ob-icon-btn--quiet"
          data-testid={`${testId}-forward`}
          aria-label={`${t("scrubForward")}: ${stepName}`}
          title={`${t("scrubForward")}: ${stepName} (${t("scrubShiftTen")})`}
          onClick={onStep(1)}
        >
          <ChevronRight className="size-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="ob-icon-btn ob-icon-btn--quiet"
          data-testid={`${testId}-play`}
          aria-pressed={playing === 1}
          aria-label={playing === 1 ? t("scrubPause") : t("scrubPlay")}
          title={reduced ? t("scrubPlayReduced") : playing === 1 ? t("scrubPause") : t("scrubPlay")}
          disabled={reduced}
          onClick={() => togglePlay(1)}
        >
          {playing === 1 ? <Pause className="size-4" strokeWidth={1.75} /> : <Play className="size-4" strokeWidth={1.75} />}
        </button>
        <label className="ulune-time-unit">
          <span className="sr-only">{t("scrubStep")}</span>
          <select data-testid={`${testId}-unit`} value={unit} onChange={(e) => isStepUnit(e.target.value) && setUnit(e.target.value)}>
            {units.map((u) => (
              <option key={u} value={u}>
                {t(`scrubUnit_${u}` as const)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        ref={tapeRef}
        role="slider"
        tabIndex={0}
        data-testid={testId}
        data-value={String(shown)}
        data-unit={unit}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={readout}
        title={t("scrubTapeHint")}
        className="ulune-time-tape"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKey}
      >
        <canvas ref={canvasRef} className="ulune-time-tape-canvas" aria-hidden="true" />
      </div>
    </div>
  );
}

/** The words under a labelled mark, in the reader's language, on this device's calendar as the marks are. */
function labelWords(tag: string, unit: StepUnit): (tick: TapeTick) => string {
  const time = dateFormat(tag, { hour: "2-digit", minute: "2-digit" });
  const date = dateFormat(tag, { day: "numeric", month: "short" });
  const dayNum = dateFormat(tag, { day: "numeric" });
  const month = dateFormat(tag, { month: "short" });
  const monthYear = dateFormat(tag, { month: "short", year: "numeric" });
  const year = dateFormat(tag, { year: "numeric" });
  return (tick) => {
    switch (tick.label) {
      case "time":
        return time.format(tick.t);
      case "date":
        return date.format(tick.t);
      case "day":
        return dayNum.format(tick.t);
      case "month":
        return month.format(tick.t);
      case "year":
        return unit === "day" || unit === "week" ? monthYear.format(tick.t) : year.format(tick.t);
      default:
        return "";
    }
  };
}
