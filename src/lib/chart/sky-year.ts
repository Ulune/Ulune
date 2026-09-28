/**
 * The year's sky file, one request for the calendar's year view and for your
 * long transits: the slow bodies (Jupiter … Pluto, Chiron, the North Node)
 * every day at 00:00 UTC, and the year's sky events without the Moon's own
 * sign changes, aspects and void-of-course spans (its phases kept). The same
 * for everyone, kept a year by the edge and the browser, like the 32-day
 * chunks (sky-window.ts) that carry everything, the Moon included.
 */
import type { SkyEvent } from "./sky-events";
import { hermite } from "./sky-window";

export const SKY_SLOW_BODIES = ["jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode"] as const;
export type SlowBody = (typeof SKY_SLOW_BODIES)[number];

/** What a year file holds, for the caches (the request's `v`). */
export const SKY_YEAR_FORMAT = 1;

/** The ephemeris files shipped cover 600 BC to 2399 AD (a year needs its next 1 January). */
export const SKY_YEAR_MIN = -599;
export const SKY_YEAR_MAX = 2398;

const DAY_MS = 86_400_000;

export type SkyYear = {
  /** The calculation version (constants.ts CALC_VERSION). */
  v: number;
  /** Its format (SKY_YEAR_FORMAT). */
  f: number;
  /** The year (astronomical numbering: 0 is 1 BC). */
  y: number;
  /** 1 January 00:00 UTC, ms. */
  t0: number;
  /** Hours between samples (24). */
  step: number;
  /** Samples per series: every day from 1 January to the next 1 January, both included. */
  n: number;
  /** Per body: [lon0, speed0, lon1, speed1, …], degrees and degrees per day. */
  bodies: Partial<Record<SlowBody, number[]>>;
  /** The year's events in [t0, next 1 January), in time order, without the Moon's own (its phases kept). */
  events: SkyEvent[];
};

/** 1 January 00:00 UTC of a year, ms (years 0–99 included, which Date.UTC maps to the 1900s). */
export function yearStart(year: number): number {
  const d = new Date(0);
  d.setUTCFullYear(year, 0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/** The UTC year a moment falls in. */
export function yearOf(ms: number): number {
  return new Date(ms).getUTCFullYear();
}

/** Whether `ms` lies within the file's samples (its last one, the next 1 January, included). */
export function yearCovers(year: SkyYear, ms: number): boolean {
  return ms >= year.t0 && ms <= year.t0 + (year.n - 1) * year.step * 3_600_000;
}

/** A slow body's longitude and speed at `ms` from the day's samples (cubic Hermite), or null outside the file. */
export function slowAt(year: SkyYear, body: SlowBody, ms: number): { lon: number; speed: number } | null {
  const s = year.bodies[body];
  if (!s || !yearCovers(year, ms)) return null;
  const stepMs = year.step * 3_600_000;
  const x = (ms - year.t0) / stepMs;
  const i = Math.min(year.n - 2, Math.max(0, Math.floor(x)));
  const lon0 = s[2 * i];
  const v0 = s[2 * i + 1];
  const lon1 = s[2 * i + 2];
  const v1 = s[2 * i + 3];
  if (![lon0, v0, lon1, v1].every(Number.isFinite)) return null;
  return hermite(lon0!, v0!, lon1!, v1!, x - i, stepMs / DAY_MS);
}
