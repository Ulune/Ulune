/*
 * The calendar's reading pack: the readings of the sky's events, a day, the
 * Moon of a day, a slow transit's window and your exacts, with the text they
 * draw on, loaded in one language at a time through packs.ts
 * (import("…/pack-cal?lang=fr")) when the calendar needs them; see
 * scripts/content-packs-plugin.mjs. The text it shares with the astrology
 * pack (the bodies, signs and aspects) comes in a chunk the two share.
 * Import it only through packs.ts, never directly from studio code.
 */
export { calendarDayReading, moonDayReading, skyEventReading, windowReading } from "@/lib/chart/interpret-calendar";
export { timingBodyReading, timingExactReading } from "@/lib/chart/interpret-timing";
