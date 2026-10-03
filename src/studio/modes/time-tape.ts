/**
 * The time tape under a moving chart (time-dial.tsx): a ruler of dates that
 * slides under a fixed needle. Its scale follows the step chosen, so a drag
 * moves time by whole steps (a minute, a day, a month…) at a pace a hand can
 * hold, however far the chart may go. Pure: the dial, and its tests.
 *
 * Calendar steps (a day and longer) keep the clock time on this device's
 * calendar: a day on from 21:53 is 21:53 the next day, across a change of the
 * clocks too, and a month on from 31 January is the last day of February.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type StepUnit = "minute" | "tenMinutes" | "hour" | "day" | "week" | "month" | "year";

export const STEP_UNITS: readonly StepUnit[] = ["minute", "tenMinutes", "hour", "day", "week", "month", "year"];

/** A step's rough length (the tape's scale), and the room it takes on the tape (CSS px). */
export const UNIT_MS: Record<StepUnit, number> = {
  minute: MINUTE,
  tenMinutes: 10 * MINUTE,
  hour: HOUR,
  day: DAY,
  week: 7 * DAY,
  month: 30.436875 * DAY,
  year: 365.2425 * DAY,
};
export const UNIT_PX: Record<StepUnit, number> = {
  minute: 10,
  tenMinutes: 10,
  hour: 8,
  day: 10,
  week: 12,
  month: 14,
  year: 14,
};

export function isStepUnit(x: unknown): x is StepUnit {
  return typeof x === "string" && (STEP_UNITS as readonly string[]).includes(x);
}

/** `n` steps of `unit` from `ms` (n may be negative). */
export function addSteps(ms: number, unit: StepUnit, n: number): number {
  if (!n) return ms;
  switch (unit) {
    case "minute":
    case "tenMinutes":
    case "hour":
      return ms + n * UNIT_MS[unit];
    case "day":
    case "week": {
      const d = new Date(ms);
      d.setDate(d.getDate() + n * (unit === "week" ? 7 : 1));
      return d.getTime();
    }
    case "month":
    case "year": {
      const d = new Date(ms);
      const day = d.getDate();
      const months = n * (unit === "year" ? 12 : 1);
      d.setDate(1);
      d.setMonth(d.getMonth() + months);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last));
      return d.getTime();
    }
  }
}

/** Milliseconds per CSS pixel on the tape for a unit. */
export function msPerPx(unit: StepUnit): number {
  return UNIT_MS[unit] / UNIT_PX[unit];
}

/** A mark on the tape: 0 a plain step, 1 a group (a week, six hours…), 2 a labelled one. */
export type TapeTick = { t: number; level: 0 | 1 | 2; label?: "time" | "day" | "date" | "month" | "year" };

/** The marks between two moments for a unit, on this device's calendar. */
export function tapeTicks(unit: StepUnit, from: number, to: number): TapeTick[] {
  const out: TapeTick[] = [];
  if (!(to > from)) return out;
  const push = (t: number, level: 0 | 1 | 2, label?: TapeTick["label"]) => {
    if (t >= from && t <= to) out.push(label ? { t, level, label } : { t, level });
  };
  const start = new Date(from);
  if (unit === "minute" || unit === "tenMinutes" || unit === "hour") {
    const every = unit === "minute" ? 1 : unit === "tenMinutes" ? 10 : 60;
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours());
    for (let guard = 0; d.getTime() <= to && guard < 5000; guard += 1) {
      const h = d.getHours();
      const m = d.getMinutes();
      const t = d.getTime();
      if (h === 0 && m === 0) push(t, 2, "date");
      else if (unit === "hour") push(t, h % 6 === 0 ? 1 : 0);
      else if (unit === "tenMinutes") push(t, m === 0 ? 2 : 0, m === 0 ? "time" : undefined);
      else push(t, m % 10 === 0 ? 2 : m % 5 === 0 ? 1 : 0, m % 10 === 0 ? "time" : undefined);
      d.setMinutes(m + every);
    }
    return out;
  }
  if (unit === "day" || unit === "week") {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    for (let guard = 0; d.getTime() <= to && guard < 5000; guard += 1) {
      const t = d.getTime();
      const first = d.getDate() === 1;
      const monday = d.getDay() === 1;
      if (first) push(t, 2, d.getMonth() === 0 ? "year" : "month");
      else if (unit === "day") push(t, monday ? 1 : 0, monday ? "day" : undefined);
      else if (monday) push(t, 0);
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  if (unit === "month") {
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    for (let guard = 0; d.getTime() <= to && guard < 5000; guard += 1) {
      const mo = d.getMonth();
      push(d.getTime(), mo === 0 ? 2 : mo % 3 === 0 ? 1 : 0, mo === 0 ? "year" : undefined);
      d.setMonth(mo + 1);
    }
    return out;
  }
  const d = new Date(start.getFullYear(), 0, 1);
  for (let guard = 0; d.getTime() <= to && guard < 5000; guard += 1) {
    const y = d.getFullYear();
    push(d.getTime(), y % 10 === 0 ? 2 : y % 5 === 0 ? 1 : 0, y % 10 === 0 ? "year" : undefined);
    d.setFullYear(y + 1);
  }
  return out;
}

/**
 * Steps a wheel or trackpad gesture is worth: a mouse wheel's notch is one
 * step; a trackpad's glide moves the tape by its pixels. `carry` is the
 * remainder of earlier glides (px).
 */
export function wheelSteps(
  delta: number,
  deltaMode: number,
  unit: StepUnit,
  carry: number,
): { steps: number; carry: number } {
  if (deltaMode !== 0 || (Math.abs(delta) >= 50 && Number.isInteger(delta))) {
    return { steps: Math.sign(delta), carry: 0 };
  }
  const total = carry + delta;
  const steps = Math.trunc(total / UNIT_PX[unit]);
  return { steps, carry: total - steps * UNIT_PX[unit] };
}
