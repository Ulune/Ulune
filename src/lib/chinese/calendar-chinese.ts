/*
 * What the Calendar loads for its Chinese day layer (languages plan,
 * part 11) when a day's reading is asked for: the reader's four animals
 * and the day's reading. Its own download, with the engine.
 */
import type { ChinesePrefs } from "./prefs";
import { zodiacChart, type ZodiacChart } from "./zodiac";

export { dayAnimalReading, dayRef } from "./zodiac-time-reading";
// The animals' drawings come with it: the Calendar's own chunk stays without them.
export { ANIMAL_GLYPH_INNER } from "./animal-glyphs";

/** The reader's animals from a cast chart's meta, on their clock and day boundary. */
export function zodiacOfMeta(
  meta: { utc: string; date: string; time: string; longitude: number; timeUnknown?: boolean },
  prefs: Pick<ChinesePrefs, "clock" | "dayBoundary">,
): ZodiacChart | null {
  return zodiacChart(
    { utc: meta.utc, date: meta.date, time: meta.time, longitude: meta.longitude, timeUnknown: meta.timeUnknown },
    { clock: prefs.clock, dayBoundary: prefs.dayBoundary },
  );
}
