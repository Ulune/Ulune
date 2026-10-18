/*
 * A dialog's focus (share plan, feature 1; share and compare plan, idea B4 and
 * feature 2): kept inside the open sheet, or Compare's chart shown full size.
 */

/** What Tab stops at: a dialog's controls, a figure's keyboard list included. */
const TABBABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";

/** Focus kept inside a dialog: Tab from its last control goes to its first, Shift+Tab the other way. */
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault: () => void }, card: HTMLElement | null): void {
  if (e.key !== "Tab") return;
  const items = Array.from(card?.querySelectorAll<HTMLElement>(TABBABLE) ?? []).filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
