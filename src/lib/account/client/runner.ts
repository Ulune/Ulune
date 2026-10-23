import { ENC_CHANGED, FS_CHANGED, KEPT_CHANGED, SYNC_RECORD } from "@/lib/space/records";
import { spaceBridge, useSpace, type SyncView } from "@/lib/space/state";
import type { SpaceStore } from "@/lib/space/store";
import type { Vault } from "@/lib/space/vault";
import type { SyncKeys } from "../keys";
import { AccountFailure, AccountSession, fetchTransport } from "./api";
import { SyncEngine, type SyncState } from "./engine";
import { syncKeysFrom } from "./keyring";
import { SPACE_WAYS, syncs } from "./merge";
import { spaceLocal, type SpaceLocal } from "./space-local";

/*
 * The synced account at work on the page (share and compare plan, feature 4): loaded only when the
 * open space syncs (lib/space/runtime.ts finds its sync/account record), stopped when it locks.
 *
 * When it syncs: when the space opens; a couple of seconds after the reader changes something;
 * when Ulune comes back into view, the window gets the focus or the network comes back; and every
 * two minutes while Ulune is in view. One round at a time, and one tab at a time (the browser's
 * lock "ulune-sync"); another tab is told what changed so its page reads it again. Nothing ever
 * waits on it: offline, the page works as before and the changes go when the network is back.
 *
 * What it says, quietly (Settings, the Private menu): synced and when; waiting for the network;
 * paused, to sign in again (this device was removed, or the account deleted); the account full.
 */

const POLL_MS = 2 * 60_000;
const AFTER_WRITE_MS = 2_000;
const RETRY_MS = [15_000, 30_000, 60_000, 120_000, 300_000];
/** Back in view (the tab shown and the window focused, often both at once): one round, not one for each, nor one right after another. */
const VIEW_GAP_MS = 5_000;

type Running = {
  vault: Vault;
  store: SpaceStore;
  session: AccountSession;
  engine: SyncEngine;
  local: SpaceLocal;
  keys: SyncKeys;
  account: string;
  timer: number;
  poll: number;
  failures: number;
  /** When the last round ended (ms). */
  last: number;
  busy: Promise<void> | null;
  again: boolean;
  stopped: boolean;
  channel: BroadcastChannel | null;
  /** The runtime's way to say the space's ways in changed. */
  ways: () => void;
  off: () => void;
};

let running: Running | null = null;
let writeHook: ((names: readonly string[]) => void) | null = null;

/** The space's writes, as runtime.ts sees them (set while sync runs). */
export function syncWriteHook(): ((names: readonly string[]) => void) | null {
  return writeHook;
}

function say(next: Partial<SyncView> & { state: SyncView["state"] }): void {
  const r = running;
  if (!r) return;
  const was = useSpace.getState().sync;
  useSpace.setState({ sync: { account: r.account, at: was?.at ?? null, ...next } });
}

/** The page reads again what the account changed in the space. */
function refresh(names: readonly string[], ways: () => void): void {
  const charts = names.filter((n) => n.startsWith("chart/")).map((n) => n.slice("chart/".length));
  if (charts.length || names.includes("state/library")) void spaceBridge()?.reload(charts).catch(() => {});
  if (names.some((n) => n.startsWith("note/") || n === "state/groups")) window.dispatchEvent(new Event(KEPT_CHANGED));
  if (names.some((n) => n.startsWith("enc/"))) window.dispatchEvent(new Event(ENC_CHANGED));
  if (names.includes("fs/homes")) window.dispatchEvent(new Event(FS_CHANGED));
  if (names.includes(SPACE_WAYS)) ways();
}

/**
 * Start syncing the open space (it holds a sync/account record). `waysChanged`: the runtime's way
 * to say the space's ways in changed (the account brought others').
 */
export async function startSync(vault: Vault, store: SpaceStore, waysChanged: () => void): Promise<void> {
  stopSync();
  const state = await vault.get<SyncState>(SYNC_RECORD).catch(() => null);
  if (!state?.keys) return;
  const keys = await syncKeysFrom(state.account, state.keys);
  const deviceKey = await store.getAccountKey();
  const local = spaceLocal(vault, store, waysChanged);
  // Without its key this device can't sign its sessions: it signs in again.
  const session = new AccountSession(fetchTransport(), { account: state.account, device: state.device }, deviceKey ?? ({} as CryptoKey));
  const engine = new SyncEngine({ session, keys, local });
  const r: Running = {
    vault,
    store,
    session,
    engine,
    local,
    keys,
    account: state.account,
    timer: 0,
    poll: 0,
    failures: 0,
    last: 0,
    busy: null,
    again: false,
    stopped: false,
    channel: typeof BroadcastChannel === "function" ? new BroadcastChannel("ulune-sync") : null,
    ways: waysChanged,
    off: () => {},
  };
  running = r;
  useSpace.setState({ sync: { state: deviceKey ? "busy" : "paused", at: null, account: state.account } });
  if (!deviceKey) return;

  writeHook = (names) => {
    const mine = names.filter((n) => syncs(n) && !local.quiet.has(n));
    if (!mine.length || r.stopped) return;
    engine.noteWrites(mine);
    soon(r, AFTER_WRITE_MS);
  };
  const onVisible = () => {
    if (document.visibilityState !== "visible" || r.busy || Date.now() - r.last < VIEW_GAP_MS) return;
    soon(r, 0);
  };
  const onOnline = () => soon(r, 0);
  const onOffline = () => say({ state: "offline" });
  const onMessage = (e: MessageEvent) => {
    const names = (e.data as { changed?: unknown })?.changed;
    if (Array.isArray(names)) refresh(names.filter((n): n is string => typeof n === "string"), waysChanged);
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  r.channel?.addEventListener("message", onMessage);
  r.poll = window.setInterval(() => {
    if (document.visibilityState === "visible") soon(r, 0);
  }, POLL_MS);
  r.off = () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    r.channel?.removeEventListener("message", onMessage);
    r.channel?.close();
    window.clearInterval(r.poll);
    window.clearTimeout(r.timer);
  };
  soon(r, 0);
}

/** Stop syncing on this page (the space locks, or sync is turned off): nothing of it stays in memory. */
export function stopSync(): void {
  const r = running;
  if (!r) return;
  r.stopped = true;
  r.off();
  r.session.forget();
  running = null;
  writeHook = null;
  useSpace.setState({ sync: null });
}

/** A round now (or as soon as the one under way ends). */
export function syncNow(): Promise<void> {
  const r = running;
  if (!r) return Promise.resolve();
  return run(r);
}

/** What runs this page's sync, for the account's other operations (setup.ts). */
export function runningSync(): { session: AccountSession; account: string; keys: SyncKeys; vault: Vault; store: SpaceStore; engine: SyncEngine } | null {
  const r = running;
  return r && !r.stopped ? { session: r.session, account: r.account, keys: r.keys, vault: r.vault, store: r.store, engine: r.engine } : null;
}

function soon(r: Running, ms: number): void {
  if (r.stopped) return;
  window.clearTimeout(r.timer);
  r.timer = window.setTimeout(() => void run(r), ms);
}

/** One round, under the browser's lock; another asked meanwhile runs after it. */
function run(r: Running): Promise<void> {
  if (r.stopped) return Promise.resolve();
  if (r.busy) {
    r.again = true;
    return r.busy;
  }
  r.busy = (async () => {
    do {
      r.again = false;
      await locked(() => round(r));
    } while (r.again && !r.stopped);
  })().finally(() => {
    r.busy = null;
    r.last = Date.now();
  });
  return r.busy;
}

type Locks = { request: (name: string, cb: () => Promise<void>) => Promise<void> };

async function locked(fn: () => Promise<void>): Promise<void> {
  const locks = (navigator as Navigator & { locks?: Locks }).locks;
  if (locks?.request) await locks.request("ulune-sync", fn);
  else await fn();
}

async function round(r: Running): Promise<void> {
  if (r.stopped || !r.vault.isOpen) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    say({ state: "offline" });
    return;
  }
  const was = useSpace.getState().sync;
  if (was?.state !== "ok" || !was.at) say({ state: "busy" });
  try {
    const out = await r.engine.round();
    if (r.stopped) return;
    r.failures = 0;
    say({ state: "ok", at: Date.now() });
    if (out.changed.length) {
      refresh(out.changed, r.ways);
      r.channel?.postMessage({ changed: out.changed });
    }
  } catch (err) {
    if (r.stopped) return;
    const code = err instanceof AccountFailure ? err.code : "error";
    if (code === "denied") {
      // This device was removed, or the account deleted: the reader signs in again (or stops syncing here).
      say({ state: "paused" });
      return;
    }
    if (code === "quota") {
      say({ state: "full" });
      return;
    }
    r.failures += 1;
    say({ state: code === "network" ? "offline" : "error" });
    const wait = err instanceof AccountFailure && err.retryAfter ? err.retryAfter * 1000 : RETRY_MS[Math.min(r.failures - 1, RETRY_MS.length - 1)]!;
    soon(r, wait);
  }
}
