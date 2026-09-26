/**
 * One body or point as the chart shows it (sign, degree, house, motion), from
 * its longitude and speed. Shared by the server's casts and the scrub
 * window's provisional skies (sky-window.ts), so both write a placement the
 * same way.
 */
import { formatDegree } from "../utils";
import { PLANET_META, signFromEcliptic } from "./constants";
import { motionFlags } from "./transit-exact";
import type { AngleId, BodyId, Placement, PlanetId } from "./types";

export function makePlacement(
  id: BodyId,
  ecliptic: number,
  house: number,
  retrograde: boolean,
  speed = 0,
  extra?: { latitude?: number; declination?: number },
): Placement {
  const kind: Placement["kind"] =
    id === "ascendant" || id === "midheaven" || id === "descendant" || id === "ic"
      ? "angle"
      : PLANET_META[id as PlanetId]?.kind === "asteroid"
        ? "asteroid"
        : PLANET_META[id as PlanetId]?.kind === "point"
          ? "point"
          : "planet";
  const name =
    kind === "angle"
      ? { ascendant: "Ascendant", midheaven: "Midheaven", descendant: "Descendant", ic: "Imum Coeli" }[
          id as AngleId
        ]
      : PLANET_META[id as PlanetId].name;
  const motion = motionFlags(id, speed);
  return {
    id,
    kind,
    name,
    sign: signFromEcliptic(ecliptic),
    ecliptic,
    signDegree: ((ecliptic % 30) + 30) % 30,
    formatted: formatDegree(ecliptic),
    house,
    retrograde,
    speed,
    latitude: extra?.latitude,
    declination: extra?.declination,
    stationary: motion.stationary,
    fast: motion.fast,
  };
}
