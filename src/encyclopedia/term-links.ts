/*
 * How words linked to the encyclopedia are marked (decision 2 of the
 * encyclopedia plan): subtle (a fine dotted underline, by default), clearly
 * underlined, or no mark. Kept on this device only; the boot script
 * (lib/boot.ts) sets it on <html> before the page paints, so a reader's
 * choice never flashes from the default. Term.tsx's styles read it.
 */

import { TERM_LINKS_ATTR, TERM_LINKS_KEY } from "./term-links-keys";

export type TermLinks = "subtle" | "underline" | "none";
export const TERM_LINKS: readonly TermLinks[] = ["subtle", "underline", "none"];

export function readTermLinks(): TermLinks {
  try {
    const v = window.localStorage.getItem(TERM_LINKS_KEY);
    return v === "underline" || v === "none" ? v : "subtle";
  } catch {
    return "subtle";
  }
}

export function setTermLinks(value: TermLinks): void {
  const root = document.documentElement;
  if (value === "subtle") root.removeAttribute(TERM_LINKS_ATTR);
  else root.setAttribute(TERM_LINKS_ATTR, value);
  try {
    if (value === "subtle") window.localStorage.removeItem(TERM_LINKS_KEY);
    else window.localStorage.setItem(TERM_LINKS_KEY, value);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}
