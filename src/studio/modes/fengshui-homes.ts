import { create } from "zustand";
import { EMPTY_HOMES, HOMES_MAX, cleanHomes, cleanName, dropHome, putHome, type HomesRecord, type KeptHome } from "@/lib/chinese/fengshui-home-record";
import { FS_CHANGED, FS_HOMES_RECORD } from "@/lib/space/records";
import { openVault, useSpace, whenSpaceLocks } from "@/lib/space/state";
import type { Vault } from "@/lib/space/vault";
import { followHomes } from "@/studio/modes/fengshui-home-list";
import { useHomeInput } from "@/studio/modes/fengshui-home-state";

/*
 * Feng Shui's homes kept (languages plan, part 26): the private space's
 * `fs/homes` record, sealed like a chart (lib/space/vault.ts), read when the
 * home page opens with the space open. A kept home's changes are sealed as
 * the reader makes them; the home last open comes back with the page. When
 * the space locks, the homes and the kept home on the page go from memory.
 * Without an open space nothing is kept: the page's home stays in this tab.
 * The chart switcher and ⌘K list the homes from fengshui-home-list.ts, which
 * follows this store once it has read the space (reorganisation plan, R9).
 */

type Homes = {
  /** Read (or settled on nothing to read). */
  ready: boolean;
  /** Read from an open space. */
  open: boolean;
  rec: HomesRecord;
};

export const useHomes = create<Homes>(() => ({ ready: false, open: false, rec: EMPTY_HOMES }));

/** The read under way, and the space it reads (a space locked and opened again is read anew). */
let loading: { vault: Vault; done: Promise<void> } | null = null;
let watching = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const isEmpty = () => {
  const s = useHomeInput.getState();
  return !s.keptId && !s.typed.trim() && !s.year.trim() && s.rooms.length === 0;
};

/** Reads the open space's homes (once per opening); the home last open comes back if the page has none. */
export function loadHomes(): Promise<void> {
  watch();
  const vault = openVault();
  if (!vault) {
    useHomes.setState({ ready: true, open: false, rec: EMPTY_HOMES });
    return Promise.resolve();
  }
  if (useHomes.getState().open && useHomes.getState().ready) return Promise.resolve();
  if (loading?.vault === vault) return loading.done;
  const done = (async () => {
    try {
      const rec = cleanHomes(await vault.get(FS_HOMES_RECORD));
      // The space locked while it was read (part 28): what it keeps went with it, and nothing comes back.
      if (openVault() !== vault) return;
      useHomes.setState({ ready: true, open: true, rec });
      const last = rec.homes.find((h) => h.id === rec.activeId);
      if (last && isEmpty()) useHomeInput.getState().openHome(last);
    } catch {
      if (openVault() === vault) useHomes.setState({ ready: true });
    } finally {
      if (loading?.vault === vault) loading = null;
    }
  })();
  loading = { vault, done };
  return done;
}

function watch(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  whenSpaceLocks(() => {
    if (timer) clearTimeout(timer);
    timer = null;
    useHomes.setState({ ready: true, open: false, rec: EMPTY_HOMES });
    // A kept home's facing, year and rooms go from memory with the space.
    if (useHomeInput.getState().keptId) useHomeInput.getState().clearHome();
  });
  useSpace.subscribe((s, prev) => {
    if (s.status !== prev.status) void loadHomes();
  });
  // A backup's homes joined the space: read it again.
  window.addEventListener(FS_CHANGED, () => {
    useHomes.setState({ ready: false, open: false });
    void loadHomes();
  });
  // The switcher's and ⌘K's list (R9): the homes as this store holds them, and the one the page has open.
  const follow = () => {
    const h = useHomes.getState();
    if (h.ready) followHomes(h.open ? h.rec.homes : [], useHomeInput.getState().keptId);
  };
  useHomes.subscribe(follow);
  useHomeInput.subscribe((s, prev) => {
    if (s.keptId !== prev.keptId) follow();
  });
  // A kept home's changes, sealed a moment after the last one.
  useHomeInput.subscribe((s, prev) => {
    if (!s.keptId || s.keptId !== prev.keptId) return;
    if (s.typed === prev.typed && s.source === prev.source && s.year === prev.year && s.rooms === prev.rooms && s.name === prev.name) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void saveOpenHome();
    }, 400);
  });
}

async function write(rec: HomesRecord): Promise<boolean> {
  const vault = openVault();
  if (!vault) return false;
  useHomes.setState({ rec });
  try {
    await vault.put(FS_HOMES_RECORD, rec);
    return true;
  } catch {
    return false;
  }
}

/** The home on the page as a record, under its id. */
function asKept(id: string, fallbackName: string): KeptHome {
  const s = useHomeInput.getState();
  return { id, name: cleanName(s.name, fallbackName), typed: s.typed.trim(), source: s.source, year: s.year.trim(), rooms: s.rooms, savedAt: Date.now() };
}

async function saveOpenHome(): Promise<void> {
  const s = useHomeInput.getState();
  const { rec } = useHomes.getState();
  if (!s.keptId || !openVault()) return;
  const was = rec.homes.find((h) => h.id === s.keptId);
  await write(putHome(rec, asKept(s.keptId, was?.name ?? "—")));
}

/** Whether another home can be kept (HOMES_MAX at most). */
export const roomForAnother = (): boolean => useHomes.getState().rec.homes.length < HOMES_MAX;

/** The home on the page kept, under a new id, with this name if it has none. False without an open space or room for it. */
export async function keepThisHome(defaultName: string): Promise<boolean> {
  await loadHomes();
  if (!openVault() || !roomForAnother()) return false;
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  const id = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  const home = asKept(id, defaultName);
  const ok = await write(putHome(useHomes.getState().rec, home));
  if (ok) useHomeInput.setState({ keptId: id, name: home.name });
  return ok;
}

/**
 * A kept home opened on the page, or a new, empty one (null). True when that
 * kept home is on the page once done; never when the space locked meanwhile
 * (its homes went from memory with it, and stay gone).
 */
export async function chooseHome(id: string | null): Promise<boolean> {
  await loadHomes();
  const vault = openVault();
  const { rec } = useHomes.getState();
  const home = id ? rec.homes.find((h) => h.id === id) : null;
  if (timer) {
    clearTimeout(timer);
    timer = null;
    await saveOpenHome();
  }
  if (home && (!vault || openVault() !== vault)) return false;
  if (home) useHomeInput.getState().openHome(home);
  else useHomeInput.getState().clearHome();
  await write({ ...useHomes.getState().rec, activeId: home?.id ?? null });
  return Boolean(home) && openVault() === vault && useHomeInput.getState().keptId === home?.id;
}

/** The kept home on the page forgotten: taken out of the space; the page keeps it in this tab, unkept. */
export async function forgetThisHome(): Promise<void> {
  const id = useHomeInput.getState().keptId;
  if (!id) return;
  if (timer) clearTimeout(timer);
  timer = null;
  useHomeInput.getState().markKept(null);
  await write(dropHome(useHomes.getState().rec, id));
}
