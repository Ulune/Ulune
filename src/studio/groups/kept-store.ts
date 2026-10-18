import { create } from "zustand";
import { GROUPS_RECORD, KEPT_CHANGED, NOTE_RECORD, type GroupsRecord, type KeptGroup, type NoteRecord } from "@/lib/space/records";
import { chartsWritten, openVault, spaceBridge, useSpace, whenSpaceLocks } from "@/lib/space/state";
import type { Vault } from "@/lib/space/vault";
import { useStudioStore } from "@/studio/store";
import { cleanGroups, cleanNote, forgetCharts, keepMembers } from "./kept";

/*
 * The groups of charts and the notes on charts (share and compare plan,
 * ideas B5 and B6) as the page holds them while the private space is open:
 * read from it once per opening, written back at each change, one write
 * after another (state/groups, note/<id>: sealed like the charts,
 * lib/space/vault.ts), forgotten from the page when it locks. Without an open
 * space there are none, and nothing of them is ever kept in the clear.
 *
 * A chart the reader forgets leaves its groups here; its note's record goes
 * with the chart's own (studio/space-sync.ts, which seals and deletes the
 * charts). Nothing is written before the space's records are read, so a
 * page that has not read them can never write an empty list over them.
 */

type Kept = {
  /** Read from the space open now (false: none is open, or not read yet). */
  ready: boolean;
  groups: readonly KeptGroup[];
  /** The notes, by chart id. */
  notes: Readonly<Record<string, NoteRecord>>;
};

export const useKept = create<Kept>(() => ({ ready: false, groups: [], notes: {} }));

/** The space whose records the page holds now. */
let readFrom: Vault | null = null;
let reading: { vault: Vault; done: Promise<void> } | null = null;
let chain: Promise<unknown> = Promise.resolve();
let watching = false;

function forget(): void {
  readFrom = null;
  reading = null;
  useKept.setState({ ready: false, groups: [], notes: {} });
}

/** The space's chart ids, once the studio holds them all (its library is the space's: space-sync.ts); null before. */
function chartIds(): ReadonlySet<string> | null {
  return spaceBridge()?.joined() ? new Set(useStudioStore.getState().rows.map((r) => r.id)) : null;
}

/** Reads the open space's groups and notes (once per opening); without an open space there are none. */
export function loadKept(): Promise<void> {
  watch();
  const vault = openVault();
  if (!vault) {
    if (useKept.getState().ready) forget();
    return Promise.resolve();
  }
  if (readFrom === vault && useKept.getState().ready) return Promise.resolve();
  if (reading?.vault !== vault) {
    const done = read(vault).finally(() => {
      if (reading?.done === done) reading = null;
    });
    reading = { vault, done };
  }
  return reading.done;
}

async function read(vault: Vault): Promise<void> {
  try {
    const [raw, list] = await Promise.all([vault.get<GroupsRecord>(GROUPS_RECORD).catch(() => null), vault.list<unknown>(NOTE_RECORD)]);
    if (openVault() !== vault) return;
    const notes: Record<string, NoteRecord> = {};
    for (const [key, value] of list.rows) {
      const note = cleanNote(value);
      if (note) notes[key.slice(NOTE_RECORD.length)] = note;
    }
    readFrom = vault;
    const groups = cleanGroups(raw);
    useKept.setState({ ready: true, groups, notes });
    // A chart forgotten before they were read leaves its groups now.
    const ids = chartIds();
    const kept = ids ? keepMembers(groups, ids) : groups;
    if (kept !== groups) void putGroups(kept);
  } catch {
    /* locked meanwhile: read again when it opens */
  }
}

function watch(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  // Locked: forgotten from the page. Opened (here or on another page): read.
  whenSpaceLocks(forget);
  useSpace.subscribe((s, prev) => {
    if (s.status !== prev.status) void loadKept();
  });
  // A backup's groups and notes joined the space (lib/space/runtime.ts): read again.
  window.addEventListener(KEPT_CHANGED, () => {
    readFrom = null;
    void loadKept();
  });
  // A chart forgotten (the switcher's ×): out of every group, its note out of the page.
  useStudioStore.subscribe((s, prev) => {
    if (s.rows === prev.rows) return;
    const state = useKept.getState();
    if (!state.ready || !openVault() || !spaceBridge()?.joined()) return;
    const now = new Set(s.rows.map((r) => r.id));
    const gone = prev.rows.filter((r) => !now.has(r.id)).map((r) => r.id);
    if (!gone.length) return;
    if (gone.some((id) => state.notes[id])) {
      const notes = { ...state.notes };
      for (const id of gone) delete notes[id];
      useKept.setState({ notes });
    }
    const groups = forgetCharts(state.groups, gone);
    if (groups !== state.groups) void putGroups(groups);
  });
}

/** One write after another, to the space read; false when none is open (or the write failed). */
function write(fn: (vault: Vault) => Promise<void>): Promise<boolean> {
  const vault = openVault();
  if (!vault || readFrom !== vault) return Promise.resolve(false);
  const done = chain.then(() => fn(vault)).then(
    () => {
      // A backup may now be due (lib/space/runtime.ts counts the notes and groups with the charts).
      chartsWritten();
      return true;
    },
    () => false,
  );
  chain = done;
  return done;
}

function putGroups(groups: readonly KeptGroup[]): Promise<boolean> {
  useKept.setState({ groups });
  return write((v) => (groups.length ? v.put(GROUPS_RECORD, { groups } satisfies GroupsRecord) : v.remove(GROUPS_RECORD)));
}

/** The groups as the reader changed them (made, renamed, moved, deleted, a chart put in or out); false when no space is open. */
export function setGroups(next: readonly KeptGroup[]): Promise<boolean> {
  const { ready, groups } = useKept.getState();
  if (!ready) return Promise.resolve(false);
  if (next === groups) return Promise.resolve(true);
  const ids = chartIds();
  return putGroups(ids ? keepMembers(next, ids) : next);
}

/**
 * The note on a chart, written (an empty text deletes it). False when it can't
 * be kept: no space open, or the chart was forgotten meanwhile (a save still
 * waiting as its field goes must not bring the note back).
 */
export function saveNote(chartId: string, text: string): Promise<boolean> {
  const { ready, notes } = useKept.getState();
  if (!ready || !useStudioStore.getState().rows.some((r) => r.id === chartId)) return Promise.resolve(false);
  const note = cleanNote({ text, at: Date.now() });
  if (note?.text === notes[chartId]?.text) return Promise.resolve(true);
  const next = { ...notes };
  if (note) next[chartId] = note;
  else delete next[chartId];
  useKept.setState({ notes: next });
  return write((v) => (note ? v.put(NOTE_RECORD + chartId, note) : v.remove(NOTE_RECORD + chartId)));
}
