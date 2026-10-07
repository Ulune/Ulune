/*
 * L opens the language picker (the keys in CommandPalette.tsx). The language
 * button listens while it is on screen; from the Calendar, which has none,
 * the key opens Charts and the picker waits a moment for the button.
 */
let opener: (() => void) | null = null;
let waitUntil = 0;

/** The language button, while it is on screen; returns its goodbye. */
export function bindLanguagePicker(open: () => void): () => void {
  opener = open;
  if (waitUntil > Date.now()) {
    waitUntil = 0;
    open();
  }
  return () => {
    if (opener === open) opener = null;
  };
}

/** Opens the picker, or returns false when no button is on screen (it opens if one comes within two seconds). */
export function openLanguagePicker(): boolean {
  if (opener) {
    opener();
    return true;
  }
  waitUntil = Date.now() + 2000;
  return false;
}
