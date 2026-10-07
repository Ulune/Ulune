import { REMEMBER_KEY } from "@/studio/map";

/*
 * The language button's one-time hint (page reorganisation plan, R8, for the
 * risk "Where did Time go?"): a reader who knew Ulune 1.x is shown, under the
 * language button, where its four tabs went, until they press "Got it" or
 * open the picker. A new reader never sees it.
 *
 * Who knew 1.x: this browser has a mark 1.x left while its tabs were used
 * (the last page or view, each tab's last sub-mode) and none of 2.0's
 * (REMEMBER_KEY, written by the first page 2.0 shows). Decided once, when the
 * studio's code first runs here, before 2.0 writes its own marks; the answer
 * is kept, so it is never asked again. On this device only, like the rest.
 */

export const LANG_HINT_KEY = "ulune.hint.lang.v1";

/** What 1.x wrote while its tabs were used (src/studio/url.ts; 1.x's GroupBar). */
export const MARKS_1X = ["ulune.studio.group-last", "ulune.studio.page", "ulune.studio.view"] as const;

type Store = Pick<Storage, "getItem" | "setItem">;

/** Whether this browser's reader gets the hint: "show" until it is done, "done" otherwise. Keeps the answer. */
export function decideLangHint(store: Store): "show" | "done" {
  const kept = store.getItem(LANG_HINT_KEY);
  if (kept === "show") return "show";
  if (kept != null) return "done";
  const fromOne = store.getItem(REMEMBER_KEY) == null && MARKS_1X.some((k) => store.getItem(k) != null);
  store.setItem(LANG_HINT_KEY, fromOne ? "show" : "1");
  return fromOne ? "show" : "done";
}

let state: "show" | "done" = "done";
if (typeof window !== "undefined") {
  try {
    state = decideLangHint(window.localStorage);
  } catch {
    /* no storage: no hint */
  }
}

/** Whether the hint is still to be shown here. */
export function langHintDue(): boolean {
  return state === "show";
}

/** The reader has it ("Got it", or the picker opened): never again on this device. */
export function langHintDone(): void {
  if (state !== "show") return;
  state = "done";
  try {
    window.localStorage.setItem(LANG_HINT_KEY, "1");
  } catch {
    /* this visit only */
  }
}
