import { Minus, Pause, Play, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { transitScrubTicks } from "@/studio/modes/time-scrub-ticks";
import { dateFormat } from "@/lib/intl-cache";
import "@/studio/modes/styles/time.css";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export type ScrubUnit = "hour" | "day" | "week" | "month";
const UNIT_MS: Record<ScrubUnit, number> = { hour: HOUR, day: DAY, week: 7 * DAY, month: 30.44 * DAY };
const STEP_KEY = "ulune.scrub.unit";

function loadUnit(): ScrubUnit {
  if (typeof window === "undefined") return "day";
  try {
    const raw = window.localStorage.getItem(STEP_KEY);
    if (raw === "hour" || raw === "day" || raw === "week" || raw === "month") return raw;
  } catch {
    /* ignore */
  }
  return "day";
}

/**
 * Time scrubber for moving skies: a range across ±1 year, a step unit that
 * the arrow keys and −/+ follow (Shift ×10), a locale readout and Play,
 * which advances one day per second (off under reduced motion). With
 * `smooth` (the sky can be drawn on the client: the scrub window), Play moves
 * time every frame; otherwise it steps 0.3 day every 300 ms, one cast a step.
 */
export function TimeScrubber({
  value,
  min,
  max,
  onChange,
  testId,
  label,
  smooth = false,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (ms: number) => void;
  testId: string;
  label: string;
  smooth?: boolean;
}) {
  const { locale, t } = useI18n();
  const [unit, setUnit] = useState<ScrubUnit>("day");
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setUnit(loadUnit());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const clamp = (ms: number) => Math.min(max, Math.max(min, ms));
  const step = (dir: 1 | -1, times = 1) => onChange(clamp(valueRef.current + dir * UNIT_MS[unit] * times));

  useEffect(() => {
    if (!playing || reduced) return;
    const advance = (by: number): boolean => {
      const next = valueRef.current + by;
      if (next >= max) {
        setPlaying(false);
        onChange(max);
        return false;
      }
      onChange(next);
      return true;
    };
    if (!smooth) {
      const id = window.setInterval(() => advance(0.3 * DAY), 300);
      return () => window.clearInterval(id);
    }
    // One day per second, every frame (a hidden tab's frames pause it).
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(100, Math.max(0, now - last));
      last = now;
      if (advance((dt / 1000) * DAY)) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, max, onChange, smooth]);

  const pct = ((clamp(value) - min) / (max - min || 1)) * 100;
  const ticks = useMemo(() => transitScrubTicks(min, max), [min, max]);
  const readout = dateFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(clamp(value));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const times = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      step(1, times);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      step(-1, times);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      step(1, 10);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      step(-1, 10);
    }
  };

  return (
    <div className="ulune-time-scrub" data-testid={`${testId}-band`}>
      <div className="ulune-time-scrub-head">
        <button
          type="button"
          className="ob-icon-btn ob-icon-btn--quiet"
          data-testid={`${testId}-play`}
          aria-pressed={playing}
          aria-label={playing ? t("scrubPause") : t("scrubPlay")}
          title={reduced ? t("scrubPlayReduced") : playing ? t("scrubPause") : t("scrubPlay")}
          disabled={reduced}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause className="size-4" strokeWidth={1.75} /> : <Play className="size-4" strokeWidth={1.75} />}
        </button>
        <p data-testid={`${testId}-readout`} className="ulune-time-readout" aria-live="polite">
          {readout}
        </p>
        <label className="ulune-time-unit">
          <span className="sr-only">{t("scrubStep")}</span>
          <select
            data-testid={`${testId}-unit`}
            value={unit}
            onChange={(e) => {
              const next = e.target.value as ScrubUnit;
              setUnit(next);
              try {
                window.localStorage.setItem(STEP_KEY, next);
              } catch {
                /* ignore */
              }
            }}
          >
            {(["hour", "day", "week", "month"] as const).map((u) => (
              <option key={u} value={u}>
                {t(`scrubUnit_${u}` as const)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ob-icon-btn ob-icon-btn--quiet"
          aria-label={t("scrubBack")}
          onClick={() => step(-1)}
        >
          <Minus className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="ob-icon-btn ob-icon-btn--quiet"
          aria-label={t("scrubForward")}
          onClick={() => step(1)}
        >
          <Plus className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="ulune-time-ticks" aria-hidden="true">
        {ticks.map((tick) => (
          <span
            key={`${tick.major ? "M" : "m"}-${tick.pct.toFixed(3)}`}
            className="ulune-time-tick"
            data-major={tick.major ? "1" : "0"}
            style={{ left: `${tick.pct}%` }}
          />
        ))}
      </div>
      <label className="block w-full min-w-0">
        <span className="sr-only">{label}</span>
        <input
          type="range"
          data-testid={testId}
          min={min}
          max={max}
          step={1}
          value={clamp(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          onKeyDown={onKey}
          aria-valuetext={readout}
          className="ulune-time-slider"
          style={{ ["--pct" as string]: `${pct}%` }}
        />
      </label>
    </div>
  );
}
