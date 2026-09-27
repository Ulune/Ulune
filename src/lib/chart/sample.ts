import type { BirthInput } from "./types";

/**
 * The sample chart: 1 January 2000, noon, at Greenwich. A moment and a place,
 * nobody's birth. The first screen offers it, and the tour uses it when no
 * chart is open.
 */
export function sampleBirth(name: string): BirthInput {
  return {
    name,
    date: "01/01/2000",
    time: "12:00",
    latitude: 51.4779,
    longitude: -0.0015,
    placeLabel: "Greenwich, London, United Kingdom",
    houseSystem: "placidus",
  };
}
