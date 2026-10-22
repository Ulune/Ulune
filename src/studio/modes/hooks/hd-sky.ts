import { door } from "@/lib/engine/door";
import type { SkyAt, SkyPoint } from "@/lib/chart/hd-cycles";
import { HD_SKY_BODIES } from "@/lib/chart/hd-transit";
import { bodyAt, chunkStart, covers } from "@/lib/chart/sky-window";
import { slowAt, yearOf, type SkyYear } from "@/lib/chart/sky-year";
import { loadWindow, windowAt } from "@/lib/chart/window-cache";
import { loadYear } from "@/lib/chart/year-cache";
import type { PlanetId } from "@/lib/chart/types";

/*
 * Where Human Design's Cycles page reads the sky (share and compare plan,
 * feature 5b; studio/modes/design-cycles.tsx), always through the
 * "calculate" door, never with anything of the reader's:
 *
 *   - on this device (the default): a transits cast at the moment, with no
 *     place and no chart (latitude and longitude 0, plain cusps, no natal
 *     bodies, UTC): the bodies' places alone, exactly, a few milliseconds each;
 *   - when the reader chose Ulune's server: the shared sky files, the year's
 *     (the slow planets, daily) and the 32-day chunks (every body, every 12
 *     hours), asked for by their date only and kept by the edge, so a life's
 *     cycles cost a few files rather than hundreds of calls, and no date of
 *     the reader's is sent.
 */

const CUSPS = Array.from({ length: 12 }, (_, i) => i * 30);
/** The bodies a moment's cast gives the page. */
const CAST_BODIES: ReadonlySet<string> = new Set([...HD_SKY_BODIES, "chiron"]);

/** The device turned to Ulune's server mid-way ("Use the server once"): the page starts again from the shared files. */
export const TURNED_TO_SERVER = "E:hdc.server";

/**
 * The sky at a moment through the door's transits cast (on this device), with
 * nothing of the reader's in it. `stillDevice` is asked before each cast: once
 * the door has turned to the server, the search stops (TURNED_TO_SERVER).
 */
export function castSky(signal?: AbortSignal, stillDevice: () => boolean = () => true): SkyAt {
  return async (ms) => {
    if (!stillDevice()) throw new Error(TURNED_TO_SERVER);
    const sky = await door.castTransits({
      data: { at: new Date(ms).toISOString(), latitude: 0, longitude: 0, natalCusps: CUSPS, natalBodies: [], houseSystem: "whole", timezone: "UTC" },
      signal,
    });
    const out: Record<string, SkyPoint> = {};
    for (const p of sky.planets) if (CAST_BODIES.has(p.id) && Number.isFinite(p.ecliptic) && Number.isFinite(p.speed)) out[p.id] = { lon: p.ecliptic, speed: p.speed as number };
    return out;
  };
}

/** A sky file that could not be had: offline, or Ulune's server out of reach. */
const missing = () => (typeof navigator !== "undefined" && navigator.onLine === false ? "E:net.offline" : "E:net.unreachable");

/** The slow planets from the year files (Ulune's server: shared, kept by the edge). */
export function yearSky(): SkyAt {
  const files = new Map<number, Promise<SkyYear | null>>();
  return async (ms) => {
    const y = yearOf(ms);
    if (!files.has(y)) files.set(y, loadYear(y));
    const file = await files.get(y)!;
    if (!file) throw new Error(missing());
    const out: Record<string, SkyPoint> = {};
    for (const b of ["saturn", "uranus", "chiron"] as const) {
      const p = slowAt(file, b, ms);
      if (p) out[b] = p;
    }
    return out;
  };
}

/** Every body from the scrub window's chunks (Ulune's server: shared, kept by the edge). */
export function chunkSky(): SkyAt {
  return async (ms) => {
    const win = windowAt(ms) ?? (await loadWindow(chunkStart(ms)));
    if (!win || !covers(win, ms)) throw new Error(missing());
    const out: Record<string, SkyPoint> = {};
    for (const b of CAST_BODIES) {
      const p = bodyAt(win, b as PlanetId, ms);
      if (p) out[b] = p;
    }
    return out;
  };
}
