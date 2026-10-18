import { create } from "zustand";
import type { StudioPage } from "@/studio/url";

/*
 * Sharing's state on the page (share plan, feature 1): whether the share
 * sheet is open, and the note a shared chart's arrival leaves when it needs
 * a button (the offer to create a private space, or to unlock it). Small,
 * with the toolbar's menu; the sheet and the note load when one shows
 * (studio/stage/ExportMenu.tsx, ShareHost).
 *
 * Asking for someone's chart (idea B4) adds: the asker's sheet, and on the
 * recipient's side the request they opened, held in this tab's memory only
 * (never stored: a reload forgets it) until they send their chart back or
 * put it away. Their sheets and cards load when one shows
 * (studio/show/host.tsx, ExtrasHost; components/share/ask-ui.tsx).
 */

export type ArrivalNote = {
  /** "offer": no private space, the offer to create one; "unlock": a locked space that could not keep the chart until it is unlocked. */
  kind: "offer" | "unlock";
  /** Two charts arrived (a Relationship page's "Share both"). */
  both: boolean;
};

/** A request for the reader's chart, opened from a link (lib/share/request.ts). */
export type PendingRequest = {
  /** The asker's first name, when they gave it. */
  asker: string | null;
  /** The page the chart opens on once cast. */
  page: StudioPage;
  /** When it arrived: a chart kept since then is the answer. */
  at: number;
};

/** The share sheet opened to send a chart back to the person who asked for it (their name, when they gave it). */
export type Reply = { asker: string | null };

type ShareUi = {
  sheet: boolean;
  note: ArrivalNote | null;
  /** The share sheet's purpose, when it answers a request. */
  reply: Reply | null;
  /** The sheet that makes a request link. */
  ask: boolean;
  request: PendingRequest | null;
};

export const useShareUi = create<ShareUi>(() => ({ sheet: false, note: null, reply: null, ask: false, request: null }));

export const openShareSheet = (reply: Reply | null = null) => useShareUi.setState({ sheet: true, reply });
export const closeShareSheet = () => useShareUi.setState({ sheet: false, reply: null });
export const showArrivalNote = (note: ArrivalNote | null) => useShareUi.setState({ note });
export const openAskSheet = () => useShareUi.setState({ ask: true });
export const closeAskSheet = () => useShareUi.setState({ ask: false });
export const holdRequest = (request: PendingRequest | null) => useShareUi.setState({ request });
