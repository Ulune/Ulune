/*
 * The private space's records, by name (each sealed on its own, lib/space/vault.ts):
 *
 *   chart/<id>     a chart of the library (lib/chart/library.ts, StoredRow)
 *   state/library  the library's order and the chart open
 *   state/pair     the partners chosen for synastry and composite
 *   state/ai       the AI keys (lib/ai/use-ai-account.ts)
 *   state/backup   when a backup was last downloaded, and of which charts
 *   view/first     the instant first view, while the space stays unlocked here
 */

export const CHART_RECORD = "chart/";
export const LIBRARY_RECORD = "state/library";
export const PAIR_RECORD = "state/pair";
export const AI_RECORD = "state/ai";
export const BACKUP_RECORD = "state/backup";

export type LibraryRecord = { order: string[]; activeId: string | null };
export type PairRecord = { partnerId: string | null; compositePartnerId: string | null };
/** `mark`: the charts' sealed state then (lib/space/vault.ts, Vault.mark). */
export type BackupRecord = { at: number; mark: string };
