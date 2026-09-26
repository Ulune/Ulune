/*
 * The astrology reading pack: every builder of the chart's readings and the
 * text they draw on, loaded in one language at a time through packs.ts
 * (import("…/pack-astro?lang=fr")); see scripts/content-packs-plugin.mjs.
 * Import it only through packs.ts, never directly from studio code: a direct
 * import would bring both languages back into the studio's first download.
 */
export { buildCompositeDossier, dossierFor } from "@/lib/chart/interpret-local";
export { buildTransitDossier } from "@/lib/chart/interpret-transit";
export { buildProgressedDossier } from "@/lib/chart/interpret-progressions";
export { buildSynastryDossier } from "@/lib/chart/interpret-synastry";
export {
  timingBodyReading,
  timingDateReading,
  timingExactReading,
} from "@/lib/chart/interpret-timing";
export { withClickNote } from "@/lib/i18n/click-notes";
export { dumpChartForPrompt } from "@/lib/chart/dump";
