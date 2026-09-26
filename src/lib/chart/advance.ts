import { signFromEcliptic } from "@/lib/chart/constants";
import type { BodyId, Placement } from "@/lib/chart/types";
import { formatDegree } from "@/lib/utils";

const MEAN_SPEED: Partial<Record<BodyId, number>> = {
  sun: 0.9856,
  moon: 13.1764,
  mercury: 1.3833,
  venus: 1.2,
  mars: 0.524,
  jupiter: 0.0831,
  saturn: 0.0335,
  uranus: 0.0117,
  neptune: 0.006,
  pluto: 0.004,
  chiron: 0.02,
  // Nodes move together: south node stays exactly opposite the north node.
  northnode: -0.053,
  southnode: -0.053,
  lilith: 0.111,
  ceres: 0.21,
  juno: 0.25,
  vesta: 0.27,
  eris: 0.001,
  sedna: 0.0005,
};

function wrap360(n: number): number {
  return ((n % 360) + 360) % 360;
}

function houseFromCusps(ecliptic: number, cusps: number[]): number {
  for (let i = 0; i < 12; i += 1) {
    const a = cusps[i] ?? 0;
    const b = cusps[(i + 1) % 12] ?? 0;
    if (a <= b) {
      if (ecliptic >= a && ecliptic < b) return i + 1;
    } else if (ecliptic >= a || ecliptic < b) {
      return i + 1;
    }
  }
  return 1;
}

function speedOf(p: Placement): number {
  return Number.isFinite(p.speed) ? (p.speed as number) : (MEAN_SPEED[p.id] ?? 0);
}

export function advancePlacement(p: Placement, days: number, natalCusps: number[]): Placement {
  const speed = speedOf(p);
  const ecliptic = wrap360(p.ecliptic + speed * days);
  const retrograde = speed < 0;
  return {
    ...p,
    ecliptic,
    sign: signFromEcliptic(ecliptic),
    signDegree: ((ecliptic % 30) + 30) % 30,
    formatted: formatDegree(ecliptic),
    house: natalCusps.length ? houseFromCusps(ecliptic, natalCusps) : p.house,
    retrograde,
    speed,
  };
}

export function advancePlanets(
  planets: Placement[],
  natalCusps: number[],
  fromMs: number,
  toMs: number,
): Placement[] {
  const days = (toMs - fromMs) / 86_400_000;
  if (!Number.isFinite(days) || Math.abs(days) < 1 / 48) return planets;
  return planets.map((p) => advancePlacement(p, days, natalCusps));
}
