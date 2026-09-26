import type { BodyId, NatalChart } from "./types";
import { CALC_VERSION, DEFAULT_VISIBLE } from "./constants";

const KEY = "ulune.wheel.bodies";

export function loadVisibleBodies(): Set<BodyId> {
  if (typeof window === "undefined") return new Set(DEFAULT_VISIBLE);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set(DEFAULT_VISIBLE);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return new Set(DEFAULT_VISIBLE);
    return new Set(parsed.filter((id): id is BodyId => typeof id === "string"));
  } catch {
    return new Set(DEFAULT_VISIBLE);
  }
}

export function saveVisibleBodies(ids: Set<BodyId>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* quota / private */
  }
}

/**
 * True when a saved chart must be recast: pre-Swiss, or cast under older
 * calculation rules (CALC_VERSION: historical time zones, Swiss fixed stars,
 * DE441 ephemeris files…). A chart cast under the current rules is complete
 * as it is — bodies can be missing legitimately (Eris and Sedna before 1500,
 * Chiron before 675), which must not send it into a recast on every opening.
 */
export function needsSwissUpgrade(chart: NatalChart): boolean {
  if (chart.meta.ephemeris !== "swiss" || chart.meta.lilith !== "true") return true;
  return (chart.meta.calc ?? 0) < CALC_VERSION;
}

/**
 * Whether a recast moved the chart enough to change its reading: another
 * UTC instant, or any body or angle more than an arc-minute away.
 */
export function chartMoved(before: NatalChart, after: NatalChart): boolean {
  const instant = (iso: string) => Math.round(Date.parse(iso) / 1000);
  if (instant(before.meta.utc) !== instant(after.meta.utc)) return true;
  const lon = new Map<string, number>();
  for (const p of [...after.planets, ...Object.values(after.angles)]) lon.set(p.id, p.ecliptic);
  for (const p of [...before.planets, ...Object.values(before.angles)]) {
    const now = lon.get(p.id);
    if (now == null) continue;
    const d = Math.abs(((now - p.ecliptic + 540) % 360) - 180);
    if (d > 1 / 60) return true;
  }
  return false;
}
