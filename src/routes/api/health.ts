import { createFileRoute } from "@tanstack/react-router";
import { APP_VERSION } from "@/lib/app-identity";
import { calculateNatal } from "@/lib/chart/calculate.server";
import type { BirthInput } from "@/lib/chart/types";

/**
 * For an uptime monitor: casts one fixed chart (1 January 2000, noon, in
 * Paris: a moment and a place, nobody's birth) the way a reader's cast runs,
 * and answers 200 when the Swiss Ephemeris placed everything and the time
 * zone came from geo-tz's map, 503 otherwise. An answer is reused for 30 s,
 * so a burst of checks costs one cast.
 */
const FRESH_MS = 30_000;
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

type Health = { ok: boolean; ephemeris?: string; zones?: string; ms?: number; version: string };
let last: { at: number; health: Health } | null = null;

async function check(): Promise<Health> {
  const started = performance.now();
  try {
    const chart = await calculateNatal({
      name: "",
      date: "2000-01-01",
      time: "12:00",
      timeUnknown: false,
      placeLabel: "",
      houseSystem: "placidus",
      ...PARIS,
    } as BirthInput);
    const zones = chart.meta.birthTime?.zoneSource === "coordinates" && chart.meta.birthTime.zone === "Europe/Paris";
    const ok =
      chart.meta.ephemeris === "swiss" && !chart.meta.warnings?.length && chart.houses.length === 12 && zones;
    return {
      ok,
      ephemeris: chart.meta.ephemeris,
      zones: zones ? "geo-tz" : "fallback",
      ms: Math.round(performance.now() - started),
      version: APP_VERSION,
    };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - started), version: APP_VERSION };
  }
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const now = Date.now();
        if (!last || now - last.at > FRESH_MS) last = { at: now, health: await check() };
        return new Response(JSON.stringify(last.health), {
          status: last.health.ok ? 200 : 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
