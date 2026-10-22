import { useCallback, useContext } from "react";
import { ChartScopeContext, type ScopeMoment } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";

/*
 * The moment a page reads, in its chart scope (studio/scope.tsx; share and
 * compare plan, idea B7, "one chart, two moments"). Every scope shares the
 * studio's one time (the store's `time`: transits' moment, the progressed
 * date) and each Cycles page's one year, as before; a scope given a moment
 * of its own (Compare's second pane in that way) reads it instead, and its
 * dials, steppers and "now" move it alone. Imported by the pages that read
 * time (transits, progressions, the Cycles pages), not by the first page.
 */

type TimeOf = Pick<ScopeMoment, "at" | "live" | "progressionTarget">;

/** One part of the moment this part reads: the studio's time, or its scope's own. */
export function useScopedTime<K extends keyof TimeOf>(key: K): TimeOf[K] {
  const shared = useStudioStore((s) => (s.time as TimeOf)[key]);
  const own: TimeOf | undefined = useContext(ChartScopeContext)?.moment;
  return own ? own[key] : shared;
}

/** How this part moves its moment: the studio's (pin, now, the progressed date), or its scope's own. */
export function useScopedTimeSet(): { pin: (at: number) => void; now: () => void; setProgressionTarget: (at: number) => void } {
  const scope = useContext(ChartScopeContext);
  const pinShared = useStudioStore((s) => s.pin);
  const nowShared = useStudioStore((s) => s.now);
  const targetShared = useStudioStore((s) => s.setProgressionTarget);
  const set = scope?.moment ? scope.setMoment : undefined;
  const pin = useCallback((at: number) => (set ? set({ at, live: false }) : pinShared(at)), [set, pinShared]);
  const now = useCallback(() => (set ? set({ at: Date.now(), live: true }) : nowShared()), [set, nowShared]);
  const setProgressionTarget = useCallback((at: number) => (set ? set({ progressionTarget: at }) : targetShared(at)), [set, targetShared]);
  return { pin, now, setProgressionTarget };
}

/** The year a Cycles page shows (null: this year): its one stepper's (`shared`), or its scope's own. */
export function useScopedYear(shared: number | null): number | null {
  const own = useContext(ChartScopeContext)?.moment;
  return own ? own.year : shared;
}

/**
 * How this part steps its year: the page's one stepper (`setShared`), or its
 * scope's own moment, the year first kept within the page's years and set back
 * to null for this year by `norm` (the page's own rule).
 */
export function useScopedSetYear(setShared: (year: number | null) => void, norm: (year: number | null) => number | null): (year: number | null) => void {
  const scope = useContext(ChartScopeContext);
  const set = scope?.moment ? scope.setMoment : undefined;
  return useCallback((year: number | null) => (set ? set({ year: norm(year) }) : setShared(year)), [set, setShared, norm]);
}

/** Feng Shui's dial (a solar year and month, null: now; a month left null is this month's): its one dial's, or its scope's own. */
export function useScopedDial(shared: { year: number; month: number } | null): { year: number; month: number | null } | null {
  const own = useContext(ChartScopeContext)?.moment;
  if (!own) return shared;
  return own.year == null ? null : { year: own.year, month: own.month };
}

/** How this part turns Feng Shui's dial: its one dial, or its scope's own moment (`norm` keeps it within the dial's years). */
export function useScopedSetDial<D extends { year: number; month: number } | null>(setShared: (next: D) => void, norm: (next: D) => D): (next: D) => void {
  const scope = useContext(ChartScopeContext);
  const set = scope?.moment ? scope.setMoment : undefined;
  return useCallback(
    (next: D) => {
      if (!set) return setShared(next);
      const to = norm(next);
      set({ year: to?.year ?? null, month: to?.month ?? null });
    },
    [set, setShared, norm],
  );
}
