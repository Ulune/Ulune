/**
 * The year sky files in the browser (sky-year.ts): fetched once from
 * /api/sky-year (the edge and the browser keep them for a year), held in
 * memory. Nothing personal goes out: a file is asked for by its year only.
 */
import { CALC_VERSION } from "./constants";
import { SKY_YEAR_FORMAT, SKY_YEAR_MAX, SKY_YEAR_MIN, yearOf, type SkyYear } from "./sky-year";

/** A few years at hand (about 60 KB each). */
const MAX_YEARS = 6;
const RETRY_MS = 30_000;

const loaded = new Map<number, SkyYear>();
const inflight = new Map<number, Promise<SkyYear | null>>();
const failedAt = new Map<number, number>();

function keep(file: SkyYear) {
  loaded.delete(file.y);
  loaded.set(file.y, file);
  while (loaded.size > MAX_YEARS) {
    const oldest = loaded.keys().next().value;
    if (oldest == null) break;
    loaded.delete(oldest);
  }
}

function valid(file: unknown, y: number): file is SkyYear {
  const f = file as SkyYear;
  return (
    Boolean(f) &&
    f.y === y &&
    Number.isInteger(f.n) &&
    f.n >= 2 &&
    typeof f.bodies === "object" &&
    Object.values(f.bodies).every((s) => Array.isArray(s) && s.length === 2 * f.n) &&
    Array.isArray(f.events)
  );
}

/** A year's file if it is here. */
export function yearFile(y: number): SkyYear | null {
  return loaded.get(y) ?? null;
}

export function loadYear(y: number): Promise<SkyYear | null> {
  const have = loaded.get(y);
  if (have) return Promise.resolve(have);
  const pending = inflight.get(y);
  if (pending) return pending;
  if (typeof window === "undefined" || !Number.isInteger(y) || y < SKY_YEAR_MIN || y > SKY_YEAR_MAX) return Promise.resolve(null);
  const failed = failedAt.get(y);
  if (failed != null && Date.now() - failed < RETRY_MS) return Promise.resolve(null);
  const run = (async () => {
    try {
      const res = await fetch(`/api/sky-year?y=${y}&v=${CALC_VERSION}.${SKY_YEAR_FORMAT}`);
      if (!res.ok) throw new Error(String(res.status));
      const file: unknown = await res.json();
      if (!valid(file, y)) throw new Error("bad year file");
      keep(file);
      failedAt.delete(y);
      return file;
    } catch {
      failedAt.set(y, Date.now());
      return null;
    } finally {
      inflight.delete(y);
    }
  })();
  inflight.set(y, run);
  return run;
}

/** The files for every year [from, to] touches; null when one cannot be had. */
export async function loadYearsBetween(from: number, to: number): Promise<SkyYear[] | null> {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  const years: number[] = [];
  for (let y = yearOf(from); y <= yearOf(to); y += 1) years.push(y);
  const files = await Promise.all(years.map((y) => loadYear(y)));
  return files.every((f): f is SkyYear => f != null) ? files : null;
}
