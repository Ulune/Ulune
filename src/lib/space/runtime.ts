import { forgetAiKeys, keepAiKeysIn, type AiKeys } from "@/lib/ai/use-ai-account";
import { fromStoredRow, unseenRows, type SavedChart, type StoredRow } from "@/lib/chart/library";
import { writeSpaceFlag } from "./flag";
import {
  AI_RECORD,
  BACKUP_RECORD,
  CHART_RECORD,
  LIBRARY_RECORD,
  PAIR_RECORD,
  type BackupRecord,
  type LibraryRecord,
  type PairRecord,
} from "./records";
import { idbStore, spaceSupported, type LockMode, type SpaceMeta, type SpaceStore } from "./store";
import {
  Vault,
  adoptBackup,
  checkBackupWay,
  openBackup,
  parseBackup,
  type PasskeySecret,
  type SpaceBackup,
  type SpaceSeed,
  type WayIn,
} from "./vault";
import {
  openVault,
  runLockHooks,
  setBackupWatch,
  setOpenVault,
  spaceBridge,
  useSpace,
  type SpaceStatus,
} from "./state";

/*
 * The private space at work on the page: finding it, creating it, unlocking
 * and locking it, and when it locks by itself. Loaded only when a space
 * exists or the reader asks for one (components/space).
 *
 * While it is open, the reader's AI keys are kept in it (lib/ai), and the
 * studio's charts and partners (studio/space-sync.ts). Locking drops the key
 * and everything read with it from the page.
 */

/** "After a while away": fifteen minutes without a touch, or out of sight. */
const IDLE_MS = 15 * 60 * 1000;

let store: SpaceStore | null = null;

function theStore(): SpaceStore {
  if (!spaceSupported()) throw new Error("space-unavailable");
  store ??= idbStore();
  return store;
}

function describe(meta: SpaceMeta | null, status: SpaceStatus): void {
  useSpace.setState({
    status,
    lock: meta?.lock ?? "close",
    hasPassphrase: Boolean(meta?.wraps.some((w) => w.kind === "passphrase")),
    passkeys: (meta?.wraps ?? []).flatMap((w) =>
      w.kind === "passkey" ? [{ credId: w.credId, prfSalt: w.prfSalt, added: w.added }] : [],
    ),
  });
}

function flagFor(lock: LockMode): "locked" | "stay" {
  return lock === "stay" ? "stay" : "locked";
}

let booted: Promise<void> | null = null;

/**
 * Look for this browser's space once: none, locked, or (stay unlocked on this
 * device) opened at once with the key the browser keeps.
 */
export function bootSpace(): Promise<void> {
  booted ??= (async () => {
    if (!spaceSupported()) {
      describe(null, "unavailable");
      return;
    }
    let meta: SpaceMeta | null;
    try {
      meta = await Vault.find(theStore());
    } catch {
      describe(null, "unavailable");
      return;
    }
    if (!meta) {
      // Nothing here: the empty database opening it made goes too.
      await theStore()
        .erase()
        .catch(() => {});
      writeSpaceFlag(null);
      describe(null, "none");
      return;
    }
    writeSpaceFlag(flagFor(meta.lock));
    if (meta.lock === "stay") {
      const vault = await Vault.unlockOnDevice(theStore()).catch(() => null);
      if (vault) {
        await opened(vault, "unlocked");
        return;
      }
    }
    describe(meta, "locked");
  })();
  return booted;
}

/** Look again: another tab may have made or erased the space meanwhile. */
export function recheckSpace(): Promise<void> {
  booted = null;
  return bootSpace();
}

async function opened(vault: Vault, how: "created" | "unlocked"): Promise<void> {
  setOpenVault(vault);
  const stored = await vault.get<AiKeys>(AI_RECORD).catch(() => null);
  keepAiKeysIn((next) => {
    void vault.put(AI_RECORD, next).catch(() => {
      /* the space went away (erased in another tab): the keys stay in the tab */
    });
  }, stored);
  setBackupWatch(() => void checkBackup());
  // The studio's charts first, then the page says the space is open.
  await spaceBridge()?.open(vault, how);
  describe(vault.meta, "open");
  armIdle(vault.meta.lock);
  keepStorage();
  await checkBackup();
}

/** Ask the browser to keep the space's data (Safari may otherwise drop it after seven days away). */
function keepStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => false);
  } catch {
    /* not offered here */
  }
}

/** A new space, opened; returns its recovery code (shown once, kept nowhere). */
export async function createSpace(
  first: { passphrase?: string; passkey?: PasskeySecret & { prfSalt: string } },
  seed?: SpaceSeed,
): Promise<string> {
  const { vault, recoveryCode } = await Vault.create(theStore(), first, seed);
  writeSpaceFlag("locked");
  booted = Promise.resolve();
  await opened(vault, "created");
  return recoveryCode;
}

/** Open the space with a way in; throws WrongSecret when it does not open it. */
export async function unlockSpace(way: WayIn): Promise<void> {
  const vault = await Vault.unlock(theStore(), way);
  await opened(vault, "unlocked");
}

/** Lock now: what waits to be written is sealed, then the key and everything read with it leave the page. */
export async function lockSpace(): Promise<void> {
  const vault = openVault();
  const meta = vault?.meta ?? null;
  if (vault) await spaceBridge()?.beforeLock().catch(() => {});
  vault?.lock();
  setOpenVault(null);
  setBackupWatch(null);
  disarmIdle();
  forgetAiKeys();
  spaceBridge()?.close();
  runLockHooks();
  useSpace.setState({ backupAt: null, backupDue: false });
  describe(meta, meta ? "locked" : "none");
}

/** When the space locks by itself: when Ulune closes, after a while away, or never on this device. */
export async function setSpaceLock(lock: LockMode): Promise<void> {
  const vault = openVault();
  if (!vault) throw new Error("space-locked");
  await vault.setLockMode(lock);
  writeSpaceFlag(flagFor(lock));
  describe(vault.meta, "open");
  spaceBridge()?.lockChanged(lock);
  armIdle(lock);
}

/** The open space's vault, for what needs a way in again (a new passphrase, a backup). */
export function currentVault(): Vault | null {
  return openVault();
}

/** Refresh what the page says of the space after a change to its ways in. */
export function spaceChanged(): void {
  const vault = openVault();
  if (vault) describe(vault.meta, "open");
}

/**
 * Erase the space from this browser, open or not (a reader who lost every way
 * in can start again): its records, its key, its description, the flag.
 */
export async function eraseSpace(): Promise<void> {
  await lockSpace();
  await theStore().erase();
  writeSpaceFlag(null);
  booted = Promise.resolve();
  describe(null, "none");
}

/* ------------------------------------------------ backups */

let backupCheck: Promise<void> = Promise.resolve();

/** Whether a backup is due: the charts changed since the last one, or there are charts and none yet. */
function checkBackup(): Promise<void> {
  backupCheck = backupCheck.then(async () => {
    const vault = openVault();
    if (!vault) return;
    try {
      const note = await vault.get<BackupRecord>(BACKUP_RECORD).catch(() => null);
      const { mark, count } = await vault.mark(CHART_RECORD);
      if (openVault() !== vault) return;
      useSpace.setState({ backupAt: note?.at ?? null, backupDue: count > 0 && mark !== note?.mark });
    } catch {
      /* locked meanwhile */
    }
  });
  return backupCheck;
}

function saveFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function backupName(): string {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  return `ulune-private-space-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}.json`;
}

/**
 * The space as one encrypted file, downloaded (what waits to be written is
 * sealed first). It holds every record as stored, sealed, and the ways in as
 * wrapped keys: it opens with the passphrase, a passkey or the recovery code,
 * and only with them. When it was made is noted in the space (and in the file).
 */
export async function downloadBackup(): Promise<void> {
  const vault = openVault();
  if (!vault) throw new Error("space-locked");
  await spaceBridge()?.beforeLock().catch(() => {});
  const { mark } = await vault.mark(CHART_RECORD);
  const note: BackupRecord = { at: Date.now(), mark };
  await vault.put(BACKUP_RECORD, note);
  const backup = await vault.backup();
  saveFile(backupName(), JSON.stringify(backup));
  await checkBackup();
}

/** A chosen file, read as a backup; null when it isn't one (or is far too big to be one). */
export async function readBackupFile(file: File): Promise<SpaceBackup | null> {
  if (file.size > 64 * 1024 * 1024) return null;
  try {
    return parseBackup(await file.text());
  } catch {
    return null;
  }
}

/**
 * A backup made this browser's space (there is none here), opened with one of
 * the backup's ways in. A way that doesn't open it leaves nothing behind.
 */
export async function restoreSpace(backup: SpaceBackup, way: WayIn): Promise<void> {
  if (await Vault.find(theStore())) throw new Error("space-exists");
  let vault: Vault;
  try {
    // The way in is tried on the file first: a wrong one answers at once, whatever the backup's size.
    await checkBackupWay(backup, way);
    await adoptBackup(theStore(), backup);
    vault = await Vault.unlock(theStore(), way);
  } catch (err) {
    // Nothing is left behind, not even the empty database the check above opened.
    await theStore()
      .erase()
      .catch(() => {});
    throw err;
  }
  writeSpaceFlag(flagFor(vault.meta.lock));
  booted = Promise.resolve();
  await opened(vault, "unlocked");
}

/**
 * The charts of a backup (opened with one of its own ways in: it may be
 * another space's) added to the space open here: those it doesn't hold yet,
 * after its own, as they were sealed. Returns how many.
 */
export async function importBackup(backup: SpaceBackup, way: WayIn): Promise<number> {
  const vault = openVault();
  if (!vault) throw new Error("space-locked");
  const records = await openBackup(backup, way);
  const bridge = spaceBridge();
  await bridge?.beforeLock().catch(() => {});

  const theirOrder = (records.get(LIBRARY_RECORD) as LibraryRecord | undefined)?.order ?? [];
  const rank = new Map(theirOrder.map((id, i) => [id, i]));
  const found = new Map<string, StoredRow>();
  const candidates: SavedChart[] = [];
  for (const [name, value] of records) {
    if (!name.startsWith(CHART_RECORD)) continue;
    try {
      const row = fromStoredRow(value as StoredRow);
      if (!row) continue;
      found.set(row.id, value as StoredRow);
      candidates.push(row);
    } catch {
      /* not a chart this version can read */
    }
  }
  candidates.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));

  const { rows: stored } = await vault.list<StoredRow>(CHART_RECORD);
  const held = stored.map(([, row]) => fromStoredRow(row)).filter((row): row is SavedChart => row !== null);
  const joining = unseenRows(candidates, held);
  if (!joining.length) return 0;
  const library = await vault.get<LibraryRecord>(LIBRARY_RECORD).catch(() => null);
  const order = library?.order?.length ? library.order : [...held].sort((a, b) => b.savedAt - a.savedAt).map((r) => r.id);
  const next: LibraryRecord = { order: [...order, ...joining.map((r) => r.id)], activeId: library?.activeId ?? null };
  await vault.write([
    ...joining.map((row) => [CHART_RECORD + row.id, found.get(row.id)] as const),
    [LIBRARY_RECORD, next],
  ]);
  await bridge?.reload();
  await checkBackup();
  return joining.length;
}

/**
 * The open space's charts and partners, read, for the readable copy the
 * reader downloads from Your data (their AI keys stay out of it).
 */
export async function readableCopy(): Promise<{ charts: StoredRow[]; partners: PairRecord | null } | null> {
  const vault = openVault();
  if (!vault) return null;
  await spaceBridge()?.beforeLock().catch(() => {});
  const { rows } = await vault.list<StoredRow>(CHART_RECORD);
  const library = await vault.get<LibraryRecord>(LIBRARY_RECORD).catch(() => null);
  const rank = new Map((library?.order ?? []).map((id, i) => [id, i]));
  const charts = rows
    .map(([, row]) => row)
    .sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  const partners = await vault.get<PairRecord>(PAIR_RECORD).catch(() => null);
  return { charts, partners };
}

/* ------------------------------------------------ after a while away */

let lastTouch = 0;
let hiddenAt: number | null = null;
let timer = 0;

function touched(): void {
  lastTouch = Date.now();
}

function onVisibility(): void {
  if (document.visibilityState === "hidden") {
    hiddenAt = Date.now();
    return;
  }
  const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
  hiddenAt = null;
  if (away >= IDLE_MS || Date.now() - lastTouch >= IDLE_MS) void lockSpace();
  else touched();
}

function check(): void {
  if (Date.now() - lastTouch >= IDLE_MS) void lockSpace();
}

const OPTS = { capture: true, passive: true } as const;

function armIdle(lock: LockMode): void {
  disarmIdle();
  if (lock !== "idle" || typeof window === "undefined") return;
  touched();
  window.addEventListener("pointerdown", touched, OPTS);
  window.addEventListener("keydown", touched, OPTS);
  window.addEventListener("wheel", touched, OPTS);
  document.addEventListener("visibilitychange", onVisibility);
  timer = window.setInterval(check, 30_000);
}

function disarmIdle(): void {
  if (typeof window === "undefined") return;
  window.removeEventListener("pointerdown", touched, OPTS);
  window.removeEventListener("keydown", touched, OPTS);
  window.removeEventListener("wheel", touched, OPTS);
  document.removeEventListener("visibilitychange", onVisibility);
  window.clearInterval(timer);
  hiddenAt = null;
}
