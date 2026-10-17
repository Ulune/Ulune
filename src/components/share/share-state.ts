import { create } from "zustand";

/*
 * Sharing's state on the page (share plan, feature 1): whether the share
 * sheet is open, and the note a shared chart's arrival leaves when it needs
 * a button (the offer to create a private space, or to unlock it). Small,
 * with the toolbar's menu; the sheet and the note load when one shows
 * (studio/stage/ExportMenu.tsx, ShareHost).
 */

export type ArrivalNote = {
  /** "offer": no private space, the offer to create one; "unlock": a locked space that could not keep the chart until it is unlocked. */
  kind: "offer" | "unlock";
  /** Two charts arrived (a Relationship page's "Share both"). */
  both: boolean;
};

export const useShareUi = create<{ sheet: boolean; note: ArrivalNote | null }>(() => ({ sheet: false, note: null }));

export const openShareSheet = () => useShareUi.setState({ sheet: true });
export const closeShareSheet = () => useShareUi.setState({ sheet: false });
export const showArrivalNote = (note: ArrivalNote | null) => useShareUi.setState({ note });
