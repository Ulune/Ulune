/*
 * Human Design's connection chart, its reading pack (share and compare plan,
 * feature 5a): the pair's texts and the readings built from them, one
 * language at a time (through packs.ts and scripts/content-packs-plugin.mjs),
 * loaded by the Relationship page only, so the bodygraph's own pack stays as
 * it was. Import it only through packs.ts.
 */
export { hdPairFirstRead, hdPairMethod, hdPairReading, hdPairSummary } from "@/lib/chart/interpret-hd-pair";
// "You two, now" (share and compare plan, feature 5e): the moment's gates over the connection chart.
export { hdNowCentres, hdNowLead, hdPairNowReading } from "@/lib/chart/interpret-hd-pair-now";
