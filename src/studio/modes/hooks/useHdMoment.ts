import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { door } from "@/lib/engine/door";
import { gateSpan, hdMomentOf, type HdMoment, type SkyPoint } from "@/lib/chart/hd-transit";
import { isAbort, lru } from "@/lib/chart/result-cache";
import { bodyAt } from "@/lib/chart/sky-window";
import type { PlanetId } from "@/lib/chart/types";
import { loadWindowsBetween, onWindow, prefetchWindows, windowAt, windowsWork } from "@/lib/chart/window-cache";
import { errorForState } from "@/lib/i18n/errors";

/*
 * The sky at a moment as Human Design reads it (share and compare plan,
 * feature 5b: the Cycles page's dial; feature 5e: "You two, now" on the
 * Relationship page): the 13 bodies of a bodygraph's column, each in its
 * gate and line (lib/chart/hd-transit.ts), and how long the Sun and the Moon
 * stay in theirs. Read from the scrub window's chunks, the same for everyone
 * (through the "calculate" door, on this device by default), so the figure
 * follows the dial frame by frame; where no chunk can be had, one transits
 * cast at the moment, with no place and no chart in it. Nothing of a
 * person's goes anywhere for it.
 */

const DAY = 86_400_000;
const CUSPS = Array.from({ length: 12 }, (_, i) => i * 30);
/** Casts made in this tab, by moment (a fallback: chunks are the usual way). */
const casts = lru<HdMoment>(32);
const MOVE_MS = 60;

export type HdGateSpan = { gate: number; line: number; from: number; to: number };

export type HdMomentState = {
  moment: HdMoment | null;
  /** The Sun's gate (the gate of the week), when it came into it and when it leaves; null until the chunks around the moment are here. */
  week: HdGateSpan | null;
  /** The Moon's, the same. */
  moon: HdGateSpan | null;
  /** Time can glide (Play, a flick): the chunks work in this session. */
  smooth: boolean;
  busy: boolean;
  error: string | null;
  retry: () => void;
};

/** A body's place and speed from the chunk holding `ms`, if it is here. */
function chunkPoint(body: PlanetId, ms: number): SkyPoint | null {
  const win = windowAt(ms);
  return win ? bodyAt(win, body, ms) : null;
}

/** The moment at `at` (ms UTC), while `enabled`. */
export function useHdMoment(at: number, enabled: boolean): HdMomentState {
  const [winTick, setWinTick] = useState(0);
  const [cast, setCast] = useState<HdMoment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const first = useRef(true);
  // A chunk arriving may hold the moment, or the days around it.
  useEffect(() => onWindow(() => setWinTick((n) => n + 1)), []);
  useEffect(() => {
    if (!enabled || !Number.isFinite(at)) return;
    prefetchWindows(at);
    // The Sun's week either side: one or two chunks.
    void loadWindowsBetween(at - 7 * DAY, at + 7 * DAY);
  }, [enabled, at, tick]);
  const fromChunk = useMemo(() => {
    void winTick;
    if (!enabled) return null;
    const win = windowAt(at);
    return win ? hdMomentOf(at, (b) => bodyAt(win, b as PlanetId, at)) : null;
  }, [enabled, at, winTick]);
  // No chunk for this moment (yet): one cast, once the dial holds still a moment.
  useEffect(() => {
    if (!enabled || fromChunk || !Number.isFinite(at)) return;
    const have = casts.get(String(at));
    if (have) {
      setCast(have);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const delay = first.current ? 0 : MOVE_MS;
    first.current = false;
    const handle = window.setTimeout(() => {
      void door
        .castTransits({
          data: { at: new Date(at).toISOString(), latitude: 0, longitude: 0, natalCusps: CUSPS, natalBodies: [], houseSystem: "whole", timezone: "UTC" },
          signal: ctrl.signal,
        })
        .then((sky) => {
          const byId = new Map(sky.planets.map((p) => [p.id, p]));
          const m = hdMomentOf(at, (b) => {
            const p = byId.get(b);
            return p && typeof p.speed === "number" ? { lon: p.ecliptic, speed: p.speed } : null;
          });
          if (!m) throw new Error("E:chart.moment.invalid");
          casts.set(String(at), m);
          setCast(m);
          setError(null);
        })
        .catch((err: unknown) => {
          if (isAbort(err)) return;
          setError(errorForState(err));
        });
    }, delay);
    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
  }, [enabled, fromChunk, at, tick]);
  const week = useMemo(() => {
    void winTick;
    return enabled ? gateSpan((ms) => chunkPoint("sun", ms), at) : null;
  }, [enabled, at, winTick]);
  const moon = useMemo(() => {
    void winTick;
    return enabled ? gateSpan((ms) => chunkPoint("moon", ms), at) : null;
  }, [enabled, at, winTick]);
  const retry = useCallback(() => {
    setError(null);
    setTick((n) => n + 1);
  }, []);
  const moment = fromChunk ?? cast;
  const shownError = moment && fromChunk ? null : error;
  return useMemo(
    () => ({ moment, week, moon, smooth: enabled && windowsWork(), busy: enabled && !moment && !shownError, error: shownError, retry }),
    [moment, week, moon, enabled, shownError, retry],
  );
}
