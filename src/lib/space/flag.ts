/*
 * The one thing about the private space kept outside it, in the clear: that
 * one exists in this browser, and whether it stays unlocked. The page reads
 * it before anything paints (lib/boot.ts), so a returning reader is not shown
 * the empty form first. It says nothing about what the space holds.
 */
export const SPACE_FLAG = "ulune.space";
export type SpaceFlag = "locked" | "stay";

export function readSpaceFlag(): SpaceFlag | null {
  try {
    const v = window.localStorage.getItem(SPACE_FLAG);
    return v === "locked" || v === "stay" ? v : null;
  } catch {
    return null;
  }
}

export function writeSpaceFlag(value: SpaceFlag | null): void {
  try {
    if (value) window.localStorage.setItem(SPACE_FLAG, value);
    else window.localStorage.removeItem(SPACE_FLAG);
  } catch {
    /* private mode: the page just starts as for a first visit */
  }
}
