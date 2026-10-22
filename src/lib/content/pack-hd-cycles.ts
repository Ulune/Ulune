/*
 * Human Design's Cycles, its reading pack (share and compare plan, feature
 * 5b): the page's texts and the readings built from them, one language at a
 * time (through packs.ts and scripts/content-packs-plugin.mjs), loaded by the
 * Cycles page only, so the bodygraph's own pack and the connection chart's
 * stay as they were. Import it only through packs.ts.
 */
export {
  agePhrase,
  centreNow,
  channelNow,
  cycleNow,
  hdCycleName,
  hdCyclesChannelLabel,
  hdCyclesFirstRead,
  hdCyclesGateLabel,
  hdCyclesMethod,
  hdCyclesReading,
  momentSummary,
  passagesPhrase,
  solarTheme,
  solarWhen,
} from "@/lib/chart/interpret-hd-cycles";
