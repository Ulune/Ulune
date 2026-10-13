import { create } from "zustand";
import { cleanHomeCore, cleanHomeList, type HomeCore } from "@/lib/chinese/fengshui-home-core";
import { importWithRetry } from "@/lib/lazy-retry";
import { FS_CHANGED, FS_HOMES_RECORD } from "@/lib/space/records";
import { openVault, useSpace, whenSpaceLocks } from "@/lib/space/state";
import type { Vault } from "@/lib/space/vault";

/*
 * The homes kept, as the chart switcher and ⌘K list them (reorganisation
 * plan, R9: "People and places"): read from the open private space with no
 * more than their names, facings and years (lib/chinese/fengshui-home-core.ts),
 * so opening the switcher downloads a few kilobytes, never the home page's
 * engine. Once the home page's own store has run (fengshui-homes.ts), it says
 * what is kept and which home the page has open, and this list follows it.
 * Nothing here outlives the space: the list goes when it locks.
 */

type HomeList = {
  /** Read from the open space (false before, and with no open space). */
  ready: boolean;
  homes: readonly HomeCore[];
  /** The kept home open on Feng Shui's Home page (null when none is, or that page's code hasn't run). */
  keptId: string | null;
};

const EMPTY: HomeList = { ready: false, homes: [], keptId: null };

export const useHomeList = create<HomeList>(() => EMPTY);

/** Set once the home page's store has said what is kept: from then on, it alone does (followHomes). */
let followed = false;
let watching = false;
let reading: { vault: Vault; done: Promise<void> } | null = null;

/** Reads the open space's homes, once per opening; nothing without an open space. */
export function readHomeList(): Promise<void> {
  watch();
  const vault = openVault();
  if (followed || !vault || useHomeList.getState().ready) return Promise.resolve();
  if (reading?.vault === vault) return reading.done;
  const done = vault
    .get(FS_HOMES_RECORD)
    .then((rec) => {
      // The space locked meanwhile, or the home page's store came first: its word stands.
      if (!followed && openVault() === vault) useHomeList.setState({ ready: true, homes: cleanHomeList(rec, cleanHomeCore).homes });
    })
    .catch(() => {})
    .finally(() => {
      if (reading?.vault === vault) reading = null;
    });
  reading = { vault, done };
  return done;
}

function watch(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  whenSpaceLocks(() => {
    if (!followed) useHomeList.setState(EMPTY);
  });
  useSpace.subscribe((s, prev) => {
    if (followed || s.status === prev.status) return;
    useHomeList.setState(EMPTY);
    void readHomeList();
  });
  // A backup's homes joined the space: read it again (the list stays meanwhile).
  window.addEventListener(FS_CHANGED, () => {
    if (followed) return;
    useHomeList.setState({ ready: false });
    void readHomeList();
  });
}

/** What the home page's store holds (fengshui-homes.ts calls this whenever it changes, once it has read the space). */
export function followHomes(homes: readonly HomeCore[], keptId: string | null): void {
  followed = true;
  useHomeList.setState({ ready: true, homes, keptId });
}

/**
 * A kept home opened on Feng Shui's Home page, with the home page's code
 * (needed there anyway). False when the space is not open or no longer holds
 * that home, when it locks meanwhile, or when that code cannot be fetched:
 * then nothing changes, as choosing it would empty the page.
 */
export async function openKeptHome(id: string): Promise<boolean> {
  try {
    const { chooseHome, loadHomes, useHomes } = await importWithRetry(() => import("@/studio/modes/fengshui-homes"), { attempts: 2 });
    await loadHomes();
    if (!openVault() || !useHomes.getState().rec.homes.some((h) => h.id === id)) return false;
    return await chooseHome(id);
  } catch {
    return false;
  }
}
