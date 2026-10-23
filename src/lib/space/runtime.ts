import { forgetAiKeys, keepAiKeysIn, type AiKeys } from "@/lib/ai/use-ai-account";
// Types only: the library's code (and the chart engine it brings) loads when a backup is added, not with the space.
import type { SavedChart, StoredRow } from "@/lib/chart/library";
import { importWithRetry } from "@/lib/lazy-retry";
import { writeSpaceFlag } from "./flag";
import {
  AI_RECORD,
  BACKUP_RECORD,
  CHART_RECORD,
  ENC_BOOKMARKS_RECORD,
  ENC_CHANGED,
  ENC_NOTE_RECORD,
  FS_CHANGED,
  FS_HOMES_RECORD,
  GROUPS_RECORD,
  KEPT_CHANGED,
  LIBRARY_RECORD,
  NOTE_RECORD,
  PAIR_RECORD,
  SYNC_RECORD,
  type BackupRecord,
  type GroupsRecord,
  type LibraryRecord,
  type NoteRecord,
  type PairRecord,
} from "./records";
import { idbStore, type LockMode, type SpaceMeta, type SpaceStore, type Wrap } from "./store";
import { b64u, itemAad, seal } from "./crypto";
import type { SyncState } from "@/lib/account/client/engine";
import { spaceSupported } from "./supported";
import { joinInbox, sayJoined } from "./inbox";
import {
  Vault,
  adoptBackup,
  checkBackupWay,
  movesToStay,
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
  type SpaceView,
} from "./state";

/*
 * The private space at work on the page: finding it, creating it, unlocking
 * and locking it, and when it locks by itself. Loaded only when a space
 * exists or the reader asks for one (components/space).
 *
 * While it is open, the reader's AI keys are kept in it (lib/ai), and the
 * studio's charts and partners (studio/space-sync.ts). Locking drops the key
 * and everything read with it from the page.
 *
 * The synced account (share and compare plan, feature 4): a space that holds
 * a sync/account record syncs while it is open (lib/account/client/runner.ts,
 * loaded then and only then); every write to it is told to the sync, which
 * sends it a moment later. A new device's space is made here from the
 * account's copy (adoptSyncedSpace).
 */

/** "After a while away": fifteen minutes without a touch, or out of sight. */
const IDLE_MS = 15 * 60 * 1000;

let store: SpaceStore | null = null;
/** The synced account's code, once a space that syncs opened here. */
let syncing: typeof import("@/lib/account/client/runner") | null = null;

/** Records written: the sync is told (it ignores those that stay on this device); the space's ways in are "space/ways" to it. */
function tellSync(names: readonly string[]): void {
  syncing?.syncWriteHook()?.(names);
}

/** The store, its writes watched for the synced account. */
function watched(base: SpaceStore): SpaceStore {
  return {
    ...base,
    async writeItems(puts, deletes = []) {
      await base.writeItems(puts, deletes);
      tellSync([...puts.map(([name]) => name), ...deletes]);
    },
    async putMeta(meta) {
      await base.putMeta(meta);
      tellSync(["space/ways"]);
    },
  };
}

function theStore(): SpaceStore {
  if (!spaceSupported()) throw new Error("space-unavailable");
  store ??= watched(idbStore());
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

/** An older space that locks only because that was the default stays signed in from now on (vault.ts, movesToStay). */
async function staySignedIn(vault: Vault): Promise<void> {
  if (!movesToStay(vault.meta)) return;
  await vault.setLockMode("stay", false).catch(() => {
    /* kept as it was: it asks again next time */
  });
}

async function opened(vault: Vault, how: "created" | "unlocked"): Promise<void> {
  await staySignedIn(vault);
  writeSpaceFlag(flagFor(vault.meta.lock));
  setOpenVault(vault);
  const stored = await vault.get<AiKeys>(AI_RECORD).catch(() => null);
  keepAiKeysIn((next) => {
    void vault.put(AI_RECORD, next).catch(() => {
      /* the space went away (erased in another tab): the keys stay in the tab */
    });
  }, stored);
  setBackupWatch(() => void checkBackup());
  // Charts shared while it was locked join it first (lib/space/inbox.ts; its key pair is made here once).
  const shared = await joinInbox(vault, theStore()).catch(() => 0);
  // The studio's charts first, then the page says the space is open.
  await spaceBridge()?.open(vault, how);
  describe(vault.meta, "open");
  armIdle(vault.meta.lock);
  keepStorage();
  if (shared) void sayJoined(shared).catch(() => {});
  // A space that syncs is known as one before its sync starts: no backup reminder shows meanwhile.
  syncExpected = await syncsHere();
  await checkBackup();
  // The sync starts beside the page, never in its way (offline, its code may not even load).
  void startSyncing(vault);
}

/** The open space holds the account's record: it syncs, or will once its sync has started. */
let syncExpected = false;

/** The open space syncs when it holds the account's record (only then is the account's code fetched). */
async function startSyncing(vault: Vault): Promise<void> {
  const held = await theStore()
    .getItem(SYNC_RECORD)
    .catch(() => null);
  if (!held) return;
  try {
    syncing ??= await importWithRetry(() => import("@/lib/account/client/runner"));
    if (openVault() !== vault) return;
    await syncing.startSync(vault, theStore(), spaceChanged);
  } catch {
    /* not this time: the next opening tries again */
  }
}

/** Whether the open space syncs (it holds the account's record), without waiting for its sync to start. */
export async function syncsHere(): Promise<boolean> {
  if (!openVault()) return false;
  return Boolean(await theStore().getItem(SYNC_RECORD).catch(() => null));
}

/**
 * The open space starts syncing with an account just made or joined (lib/account/client/setup.ts):
 * this device's key for it, beside the space's own, and the account's state, sealed in the space.
 */
export async function attachAccount(state: SyncState, deviceKey: CryptoKey): Promise<void> {
  const vault = openVault();
  if (!vault) throw new Error("space-locked");
  syncExpected = true;
  await theStore().putAccountKey(deviceKey);
  await vault.put(SYNC_RECORD, state);
  await startSyncing(vault);
  // The backup reminder rests from now on.
  void checkBackup();
}

/** The open space stops syncing (the account deleted, or this device left it): its record and key here go; the space stays. */
export async function detachAccount(): Promise<void> {
  syncExpected = false;
  syncing?.stopSync();
  await theStore()
    .putAccountKey(null)
    .catch(() => {});
  const vault = openVault();
  if (vault) await vault.remove(SYNC_RECORD).catch(() => {});
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
  /** A shared computer: it locks when Ulune closes. Otherwise it stays signed in on this device. */
  shared = false,
): Promise<string> {
  const { vault, recoveryCode } = await Vault.create(theStore(), first, seed, shared ? "close" : "stay", shared);
  booted = Promise.resolve();
  await opened(vault, "created");
  return recoveryCode;
}

/**
 * A new space for the synced account (feature 4), opened: as createSpace, with the data key's bytes
 * once, for the account's own ways in (the caller wipes them).
 */
export async function createSpaceWithKey(
  first: { passphrase?: string; passkey?: PasskeySecret & { prfSalt: string } },
  seed: SpaceSeed | undefined,
  shared: boolean,
): Promise<{ recoveryCode: string; rawKey: Uint8Array<ArrayBuffer> }> {
  const { vault, recoveryCode, rawKey } = await Vault.create(theStore(), first, seed, shared ? "close" : "stay", shared, { rawKey: true });
  booted = Promise.resolve();
  await opened(vault, "created");
  return { recoveryCode, rawKey: rawKey! };
}

/** What a new device's space is made of: the account's copy, opened (lib/account/client/setup.ts). */
export type SyncedSpace = {
  rawKey: Uint8Array;
  ways: { id: string; passkeyUser: string; wraps: Wrap[] };
  records: readonly (readonly [string, unknown])[];
  /** The engine's state, each record's fingerprint filled in here as it is sealed. */
  state: SyncState;
  deviceKey: CryptoKey;
  shared: boolean;
};

/**
 * This browser's space made from the synced account's copy (a new device of the reader's): the same
 * id, data key and ways in as on their other devices, every record sealed here, the account's state
 * beside them; then opened. A space already here (open: its records were read before, to join this
 * one) is replaced.
 */
export async function adoptSyncedSpace(input: SyncedSpace): Promise<void> {
  const here = theStore();
  const existing = await Vault.find(here);
  if (existing && !openVault()) throw new Error("space-exists");
  const key = await crypto.subtle.importKey("raw", new Uint8Array(input.rawKey), { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const id = input.ways.id;
  const meta: SpaceMeta = {
    v: 1,
    id,
    created: Date.now(),
    lock: input.shared ? "close" : "stay",
    ...(input.shared ? { lockSet: true } : {}),
    passkeyUser: input.ways.passkeyUser,
    wraps: input.ways.wraps,
  };
  // The check record (vault.ts) proves the key; the rest as the account holds them.
  const items: [string, Awaited<ReturnType<typeof seal>>][] = [["sys/check", await seal(key, itemAad(id, "sys/check"), { space: id })]];
  const state: SyncState = { ...input.state, known: { ...input.state.known } };
  for (const [name, value] of input.records) {
    const sealed = await seal(key, itemAad(id, name), value);
    items.push([name, sealed]);
    if (state.known[name]) state.known[name] = { ...state.known[name]!, fp: b64u(sealed.iv) };
  }
  items.push([SYNC_RECORD, await seal(key, itemAad(id, SYNC_RECORD), state)]);
  // The space here gives way to the synced one; the page goes on saying a space is open (it is, a moment later).
  if (existing) await closeVault();
  await here.replaceAll(meta, items);
  if (!input.shared) await here.putDeviceKey(key);
  await here.putAccountKey(input.deviceKey);
  const vault = await Vault.fromKey(here, key);
  booted = Promise.resolve();
  await opened(vault, "unlocked");
}

/** Every record of the open space, read (to join them to the synced space that replaces it here). */
export async function readAllRecords(): Promise<Map<string, unknown>> {
  const vault = openVault();
  if (!vault) throw new Error("space-locked");
  await spaceBridge()?.beforeLock().catch(() => {});
  const { rows } = await vault.list<unknown>("");
  return new Map(rows.filter(([name]) => name !== "sys/check" && name !== SYNC_RECORD));
}

/** Open the space with a way in; throws WrongSecret when it does not open it. */
export async function unlockSpace(way: WayIn): Promise<void> {
  const vault = await Vault.unlock(theStore(), way);
  await opened(vault, "unlocked");
}

/** Lock now: what waits to be written is sealed, then the key and everything read with it leave the page. */
export async function lockSpace(): Promise<void> {
  const meta = await closeVault();
  describe(meta, meta ? "locked" : "none");
}

/** The open space closed (its description returned): as when it locks, without saying so yet (a synced space replaces it). */
async function closeVault(): Promise<SpaceMeta | null> {
  const vault = openVault();
  const meta = vault?.meta ?? null;
  syncExpected = false;
  syncing?.stopSync();
  if (vault) await spaceBridge()?.beforeLock().catch(() => {});
  vault?.lock();
  setOpenVault(null);
  setBackupWatch(null);
  disarmIdle();
  forgetAiKeys();
  spaceBridge()?.close();
  runLockHooks();
  useSpace.setState({ backupAt: null, backupDue: false });
  return meta;
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
  // A space that syncs: this device leaves the account first, when it can (the account and the other devices stay).
  const leaving = syncing?.runningSync();
  if (leaving) {
    await Promise.race([
      leaving.session.call("devices/remove", { device: leaving.session.device }).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  }
  await lockSpace();
  await theStore().erase();
  writeSpaceFlag(null);
  booted = Promise.resolve();
  describe(null, "none");
}

/* ------------------------------------------------ backups */

let backupCheck: Promise<void> = Promise.resolve();

/**
 * The charts' sealed state, and with them their notes' and the groups' once there are any (share
 * and compare plan, ideas B5 and B6: a note written since the last backup makes one due too).
 * Without notes or groups, the charts' mark alone, as before them.
 */
async function backupMark(vault: Vault): Promise<{ mark: string; count: number }> {
  const charts = await vault.mark(CHART_RECORD);
  const notes = await vault.mark(NOTE_RECORD);
  const groups = await vault.mark(GROUPS_RECORD);
  return notes.count || groups.count ? { mark: `${charts.mark}.${notes.mark}.${groups.mark}`, count: charts.count } : charts;
}

/**
 * Whether a backup is due: the charts (or their notes, or the groups) changed since the last one, or
 * there are charts and none yet. Not while the space syncs (feature 4): the server's sealed copy does
 * what the reminder is for; paused or full, it is due again.
 */
function checkBackup(): Promise<void> {
  backupCheck = backupCheck.then(async () => {
    const vault = openVault();
    if (!vault) return;
    try {
      const note = await vault.get<BackupRecord>(BACKUP_RECORD).catch(() => null);
      const { mark, count } = await backupMark(vault);
      if (openVault() !== vault) return;
      useSpace.setState({ backupAt: note?.at ?? null, backupDue: count > 0 && mark !== note?.mark && !syncKeeps(useSpace.getState()) });
    } catch {
      /* locked meanwhile */
    }
  });
  return backupCheck;
}

/** The open space syncs (or will once its sync starts), and its copy on the server is up to date or on its way. */
function syncKeeps(view: SpaceView): boolean {
  return view.sync ? view.sync.state !== "paused" && view.sync.state !== "full" : syncExpected;
}

// The reminder follows the sync: looked at again when it starts or stops keeping the copy.
useSpace.subscribe((now, before) => {
  if (syncKeeps(now) !== syncKeeps(before)) void checkBackup();
});

function saveBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
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

function backupName(ext = "json"): string {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  return `ulune-private-space-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}.${ext}`;
}

/** The open space as it is stored, sealed (what waits to be written is sealed first). */
async function sealedCopy(vault: Vault): Promise<string> {
  await spaceBridge()?.beforeLock().catch(() => {});
  return JSON.stringify(await vault.backup());
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
  const { mark } = await backupMark(vault);
  const note: BackupRecord = { at: Date.now(), mark };
  await vault.put(BACKUP_RECORD, note);
  saveBlob(backupName(), new Blob([await sealedCopy(vault)], { type: "application/json" }));
  await checkBackup();
}

/**
 * The space for another device (Settings → Add another device): the same
 * sealed copy as a backup, as files the system's share sheet may take
 * (AirDrop, Nearby Share, Files). Some browsers share only some kinds of
 * file, so it comes as JSON and as plain text; both open the same way.
 * Nothing of it goes through Ulune.
 */
export async function spaceCopyFiles(): Promise<{ json: File; text: File }> {
  const vault = openVault();
  if (!vault) throw new Error("space-locked");
  const sealed = await sealedCopy(vault);
  return {
    json: new File([sealed], backupName(), { type: "application/json" }),
    text: new File([sealed], backupName("txt"), { type: "text/plain" }),
  };
}

/** The copy for another device, saved where downloads go (no share sheet here). */
export function saveSpaceCopy(file: File): void {
  saveBlob(file.name, file);
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
export async function restoreSpace(backup: SpaceBackup, way: WayIn, shared = false): Promise<void> {
  if (await Vault.find(theStore())) throw new Error("space-exists");
  let vault: Vault;
  try {
    // The way in is tried on the file first: a wrong one answers at once, whatever the backup's size.
    await checkBackupWay(backup, way);
    await adoptBackup(theStore(), backup, shared);
    vault = await Vault.unlock(theStore(), way);
  } catch (err) {
    // Nothing is left behind, not even the empty database the check above opened.
    await theStore()
      .erase()
      .catch(() => {});
    throw err;
  }
  booted = Promise.resolve();
  await opened(vault, "unlocked");
}

/**
 * The charts of a backup (opened with one of its own ways in: it may be
 * another space's) added to the space open here: those it doesn't hold yet,
 * after its own, as they were sealed; then its groups and notes (ideas B5 and
 * B6), on the charts as this space knows them. Returns how many charts.
 */
export async function importBackup(backup: SpaceBackup, way: WayIn): Promise<number> {
  const vault = openVault();
  if (!vault) throw new Error("space-locked");
  return await importRecords(vault, await openBackup(backup, way));
}

/**
 * Another space's records, read (a backup's, or this device's own space before it joined the synced
 * account, feature 4), added to the space open here as a backup's are. Returns how many charts.
 */
export async function importRecords(vault: Vault, records: Map<string, unknown>): Promise<number> {
  const bridge = spaceBridge();
  await bridge?.beforeLock().catch(() => {});
  await importEncyclopedia(vault, records);
  await importHomes(vault, records);

  const { birthKey, fromStoredRow, unseenRows } = await importWithRetry(() => import("@/lib/chart/library"));
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
  // Each of the backup's charts as this space knows it: the same chart here (by id, or by birth, as
  // unseenRows tells them apart), or itself, joining.
  const ours = new Map<string, string>();
  for (const row of [...held, ...joining]) {
    if (!ours.has(row.id)) ours.set(row.id, row.id);
    if (!ours.has(birthKey(row.input))) ours.set(birthKey(row.input), row.id);
  }
  const mapped = new Map(candidates.map((row) => [row.id, ours.get(row.id) ?? ours.get(birthKey(row.input))]));
  if (joining.length) {
    const library = await vault.get<LibraryRecord>(LIBRARY_RECORD).catch(() => null);
    const order = library?.order?.length ? library.order : [...held].sort((a, b) => b.savedAt - a.savedAt).map((r) => r.id);
    const next: LibraryRecord = { order: [...order, ...joining.map((r) => r.id)], activeId: library?.activeId ?? null };
    await vault.write([
      ...joining.map((row) => [CHART_RECORD + row.id, found.get(row.id)] as const),
      [LIBRARY_RECORD, next],
    ]);
    await bridge?.reload();
  }
  // After the charts are on the page: the groups' code keeps only the space's charts in its groups.
  await importKept(vault, records, (id) => mapped.get(id));
  await checkBackup();
  return joining.length;
}

/**
 * A backup's groups and notes on charts (share and compare plan, ideas B5 and
 * B6) join the open space's (studio/groups/kept.ts): a group of the same id or
 * name takes the backup's charts too, the others are added; a note on a chart
 * that has none here, or an older one, joins. Their charts are named as this
 * space knows them (`mapId`); a note on a chart that did not come stays out.
 */
async function importKept(vault: Vault, records: Map<string, unknown>, mapId: (id: string) => string | undefined): Promise<void> {
  const notes = [...records].filter(([name]) => name.startsWith(NOTE_RECORD));
  if (!records.has(GROUPS_RECORD) && !notes.length) return;
  const { cleanGroups, cleanNote, joinGroups, joinsNote } = await importWithRetry(() => import("@/studio/groups/kept"));
  const puts: [string, unknown][] = [];
  if (records.has(GROUPS_RECORD)) {
    const ours = cleanGroups(await vault.get(GROUPS_RECORD).catch(() => null));
    const groups = joinGroups(ours, cleanGroups(records.get(GROUPS_RECORD)), mapId);
    if (groups) puts.push([GROUPS_RECORD, { groups } satisfies GroupsRecord]);
  }
  for (const [name, value] of notes) {
    const theirs = cleanNote(value);
    const id = mapId(name.slice(NOTE_RECORD.length));
    if (!theirs || !id) continue;
    const here = cleanNote(await vault.get(NOTE_RECORD + id).catch(() => null));
    if (joinsNote(here, theirs)) puts.push([NOTE_RECORD + id, theirs]);
  }
  if (!puts.length) return;
  await vault.write(puts);
  window.dispatchEvent(new Event(KEPT_CHANGED));
}

type KeptPage = { id: string; at: number };
type KeptNote = { text: string; at: number };

/**
 * A backup's encyclopedia (part 20) joins the open space's: its bookmarks
 * not kept here yet, its notes on pages that have none here or an older
 * one. The pages it read stay with it.
 */
async function importEncyclopedia(vault: Vault, records: Map<string, unknown>): Promise<void> {
  const puts: [string, unknown][] = [];
  const theirs = records.get(ENC_BOOKMARKS_RECORD) as KeptPage[] | undefined;
  if (Array.isArray(theirs) && theirs.length) {
    const ours = (await vault.get<KeptPage[]>(ENC_BOOKMARKS_RECORD).catch(() => null)) ?? [];
    const joining = theirs.filter((p) => p && typeof p.id === "string" && !ours.some((o) => o.id === p.id));
    if (joining.length) puts.push([ENC_BOOKMARKS_RECORD, [...ours, ...joining].sort((a, b) => b.at - a.at)]);
  }
  for (const [name, value] of records) {
    if (!name.startsWith(ENC_NOTE_RECORD)) continue;
    const note = value as KeptNote;
    if (!note || typeof note.text !== "string") continue;
    const here = await vault.get<KeptNote>(name).catch(() => null);
    if (!here || here.at < note.at) puts.push([name, note]);
  }
  if (!puts.length) return;
  await vault.write(puts);
  window.dispatchEvent(new Event(ENC_CHANGED));
}

/** A backup's homes (Feng Shui, part 26) join the open space's: those it doesn't hold, or holds older. */
async function importHomes(vault: Vault, records: Map<string, unknown>): Promise<void> {
  if (!records.has(FS_HOMES_RECORD)) return;
  const { cleanHomes, joinHomes } = await importWithRetry(() => import("@/lib/chinese/fengshui-home-record"));
  const ours = cleanHomes(await vault.get(FS_HOMES_RECORD).catch(() => null));
  const joined = joinHomes(ours, cleanHomes(records.get(FS_HOMES_RECORD)));
  if (!joined) return;
  await vault.put(FS_HOMES_RECORD, joined);
  window.dispatchEvent(new Event(FS_CHANGED));
}

/**
 * The open space's charts and partners, read, for the readable copy the
 * reader downloads from Your data (their AI keys stay out of it).
 */
export async function readableCopy(): Promise<{
  charts: StoredRow[];
  partners: PairRecord | null;
  groups: { name: string; charts: string[] }[];
  notes: { chart: string; text: string; at: string | null }[];
  encyclopedia: { bookmarks: unknown[]; notes: unknown[] };
  fengShui: { homes: unknown[] };
} | null> {
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
  // The groups and the notes on charts (ideas B5 and B6), the charts by their ids above: asked for, so given.
  const kept = (await vault.get<GroupsRecord>(GROUPS_RECORD).catch(() => null))?.groups ?? [];
  const groups = kept.map((g) => ({ name: g.name, charts: g.members }));
  const { rows: noted } = await vault.list<NoteRecord>(NOTE_RECORD);
  const chartNotes = noted.map(([key, n]) => ({ chart: key.slice(NOTE_RECORD.length), text: n.text, at: n.at ? new Date(n.at).toISOString() : null }));
  // The encyclopedia's bookmarks and notes (part 20): the reader's too.
  const bookmarks = (await vault.get<unknown[]>(ENC_BOOKMARKS_RECORD).catch(() => null)) ?? [];
  const { rows: notes } = await vault.list<unknown>(ENC_NOTE_RECORD);
  // Feng Shui's homes (part 26): the facing, year and rooms as the reader gave them.
  const homes = ((await vault.get<{ homes?: unknown[] }>(FS_HOMES_RECORD).catch(() => null))?.homes ?? []) as unknown[];
  return { charts, partners, groups, notes: chartNotes, encyclopedia: { bookmarks, notes: notes.map(([, n]) => n) }, fengShui: { homes } };
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
