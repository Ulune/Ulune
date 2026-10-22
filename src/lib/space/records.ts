/*
 * The private space's records, by name (each sealed on its own, lib/space/vault.ts):
 *
 *   chart/<id>     a chart of the library (lib/chart/library.ts, StoredRow)
 *   state/library  the library's order, the chart open and the one open before it
 *   state/pair     the partners chosen for synastry and composite
 *   state/compare  Compare on or off, its second chart and linked selection, its way and that way's choices (studio/compare)
 *   state/ai       the AI keys (lib/ai/use-ai-account.ts)
 *   state/backup   when a backup was last downloaded, and of which charts
 *   state/groups   the reader's groups of charts: names, order, members (studio/groups, idea B5)
 *   note/<id>      the reader's note on a chart, plain text (studio/groups, idea B6); goes with its chart
 *   view/first     the instant first view, while the space stays unlocked here
 *   enc/bookmarks  the encyclopedia's pages kept (src/encyclopedia/keep.ts)
 *   enc/note/<id>  the reader's note on an encyclopedia page
 *   enc/recent     the encyclopedia's pages recently read
 *   fs/homes       Feng Shui's homes kept (lib/chinese/fengshui-home-record.ts)
 *   inbox/key      the inbox's key pair: charts shared while the space is locked are sealed to it (lib/space/inbox.ts)
 */
import type { StudioPage } from "@/studio/url";

export const CHART_RECORD = "chart/";
export const INBOX_KEY_RECORD = "inbox/key";
export const LIBRARY_RECORD = "state/library";
export const PAIR_RECORD = "state/pair";
export const COMPARE_RECORD = "state/compare";
export const AI_RECORD = "state/ai";
export const BACKUP_RECORD = "state/backup";
export const ENC_BOOKMARKS_RECORD = "enc/bookmarks";
export const ENC_NOTE_RECORD = "enc/note/";
export const ENC_RECENT_RECORD = "enc/recent";
export const FS_HOMES_RECORD = "fs/homes";
/** Said on the window when the homes kept changed underneath (a backup's joined; studio/modes/fengshui-homes.ts listens). */
export const FS_CHANGED = "ulune:homes-kept";
/** Said on the window when the encyclopedia's records changed underneath (a backup's joined; src/encyclopedia/keep.ts listens). */
export const ENC_CHANGED = "ulune:encyclopedia-kept";
/**
 * The chart switcher's groups and the notes on charts (share and compare plan, ideas B5 and B6):
 * one record for the groups, a record per note, so each syncs on its own later (feature 4).
 */
export const GROUPS_RECORD = "state/groups";
export const NOTE_RECORD = "note/";
/** Said on the window when the groups or notes changed underneath (a backup's joined; studio/groups/kept-store.ts listens). */
export const KEPT_CHANGED = "ulune:groups-kept";

/** `previousId`: the chart open before the one open (share and compare plan, idea B3), when there is one. */
export type LibraryRecord = { order: string[]; activeId: string | null; previousId?: string };
export type PairRecord = { partnerId: string | null; compositePartnerId: string | null };
/**
 * Compare's state, as the studio's store holds it (studio/store.ts, `compare`): on, B and linked
 * selection; since ideas B7 and B8 its way of comparing and that way's choices (studio/compare/
 * compare-modes.ts reads them with care): C and D (people), B's page (one person, two languages),
 * B's page and moment (one chart, two moments).
 */
export type CompareRecord = {
  on: boolean;
  partnerId: string | null;
  linked: boolean;
  mode?: "people" | "languages" | "moments";
  more?: string[];
  langPage?: StudioPage;
  moment?: CompareMoment;
};
/** The second pane's page and moment in Compare's two moments (studio/scope.tsx, ScopeMoment). */
export type CompareMoment = { page: StudioPage; at: number; live: boolean; progressionTarget: number; year: number | null; month: number | null };
/** `mark`: the charts' sealed state then (lib/space/vault.ts, Vault.mark), and their notes' and groups' once there are any. */
export type BackupRecord = { at: number; mark: string };
/** A group: its own name, its charts (ids, in the order added), when it last changed. In the reader's order. */
export type KeptGroup = { id: string; name: string; members: string[]; at: number };
export type GroupsRecord = { groups: readonly KeptGroup[] };
/** A note on a chart: plain text, and when it was last written. */
export type NoteRecord = { text: string; at: number };
