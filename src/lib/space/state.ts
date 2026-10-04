import { create } from "zustand";
import type { LockMode } from "./store";
import type { Vault } from "./vault";

/*
 * What the page shows of the private space, light enough for the top bar of
 * every page: whether there is one and whether it is open, when it locks,
 * which ways in it has, and which sheet (sign in, unlock…) is up. The engine
 * (lib/space/runtime.ts, the vault and its cryptography) loads only when a
 * space exists or the reader asks for one.
 */

export type SpaceStatus =
  /** Not known yet (the page has not looked). */
  | "checking"
  /** No private space in this browser: just looking. */
  | "none"
  /** One exists and is locked. */
  | "locked"
  /** Open: charts and keys are kept in it. */
  | "open"
  /** This browser can't keep one (no IndexedDB or WebCrypto). */
  | "unavailable";

export type SpaceSheet =
  | null
  /** Sign in for the first time: a passkey or a passphrase. */
  | "create"
  /** Coming back: unlock. */
  | "unlock"
  /** Charts saved here before the private space, in the clear: keep them in one, or erase them. */
  | "legacy"
  /** The open space's ways in: a passphrase set or removed, a passkey added or removed, a new recovery code. */
  | "passphrase"
  | "remove-passphrase"
  | "add-passkey"
  | "remove-passkey"
  | "new-code"
  /** A backup file: made this browser's space (none here), or its charts added to the open one. */
  | "restore"
  | "import"
  /** The space sent to another device of the reader's (a sealed copy through the share sheet). */
  | "add-device";

export type SpaceView = {
  status: SpaceStatus;
  lock: LockMode;
  hasPassphrase: boolean;
  passkeys: { credId: string; prfSalt: string; added: number }[];
  sheet: SpaceSheet;
  /** What the sheet acts on (the passkey to remove). */
  sheetFor: string | null;
  /** When a backup was last downloaded (null: never). */
  backupAt: number | null;
  /** The charts changed since (or there are charts and no backup yet). */
  backupDue: boolean;
};

export const useSpace = create<SpaceView>(() => ({
  status: "checking",
  lock: "close",
  hasPassphrase: false,
  passkeys: [],
  sheet: null,
  sheetFor: null,
  backupAt: null,
  backupDue: false,
}));

export function openSpaceSheet(sheet: Exclude<SpaceSheet, null>, sheetFor: string | null = null): void {
  useSpace.setState({ sheet, sheetFor });
}

export function closeSpaceSheet(): void {
  useSpace.setState({ sheet: null, sheetFor: null });
}

/**
 * The studio's side of the space (studio/space-sync.ts): what to load when it
 * opens, what to clear when it locks. Registered by the studio when it mounts;
 * a space opened before (on another page) is handed over then.
 */
export type SpaceBridge = {
  open: (vault: Vault, how: "created" | "unlocked") => Promise<void>;
  /** Seal what is still waiting to be written (before the key goes, or a backup). */
  beforeLock: () => Promise<void>;
  close: () => void;
  lockChanged: (lock: LockMode) => void;
  /** The space's charts changed underneath (a backup's added): read them again. */
  reload: () => Promise<void>;
};

let bridge: SpaceBridge | null = null;
let vaultNow: Vault | null = null;

export function setSpaceBridge(next: SpaceBridge): void {
  bridge = next;
  if (vaultNow?.isOpen) void next.open(vaultNow, "unlocked");
}

export function spaceBridge(): SpaceBridge | null {
  return bridge;
}

/** The open vault (lib/space/runtime.ts keeps it here), or null. */
export function openVault(): Vault | null {
  return vaultNow?.isOpen ? vaultNow : null;
}

export function setOpenVault(next: Vault | null): void {
  vaultNow = next;
}

let backupWatch: (() => void) | null = null;

/** Who looks again at whether a backup is due (lib/space/runtime.ts, while a space is open). */
export function setBackupWatch(fn: (() => void) | null): void {
  backupWatch = fn;
}

/** Charts were sealed into the space (studio/space-sync.ts): a backup may now be due. */
export function chartsWritten(): void {
  backupWatch?.();
}

const lockHooks = new Set<() => void>();

/**
 * Something held in memory about the charts (an AI answer, a written text)
 * that must go when the space locks. Returns the way to stop.
 */
export function whenSpaceLocks(fn: () => void): () => void {
  lockHooks.add(fn);
  return () => lockHooks.delete(fn);
}

export function runLockHooks(): void {
  for (const fn of lockHooks) {
    try {
      fn();
    } catch {
      /* one forgetting must not stop the others */
    }
  }
}
