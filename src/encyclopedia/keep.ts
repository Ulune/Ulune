import { create } from "zustand";
import { openVault, useSpace, whenSpaceLocks } from "@/lib/space/state";
import type { Lang, PageData } from "./types";

/*
 * The reader's own encyclopedia (encyclopedia plan, part 20): bookmarks,
 * notes and the pages recently read. Bookmarks and notes are kept only in
 * the private space, each sealed like a chart (lib/space/vault.ts); the
 * pages read too while it is open, otherwise only in this tab's memory.
 * Nothing leaves the browser; a locked space forgets them from memory; a
 * backup of the space carries them.
 *
 *   enc/bookmarks   the pages kept, newest first
 *   enc/note/<id>   the reader's note on a page
 *   enc/recent      the pages read, newest first (the last 20)
 */

export const BOOKMARKS_RECORD = "enc/bookmarks";
export const NOTE_RECORD = "enc/note/";
export const RECENT_RECORD = "enc/recent";
const RECENT_MAX = 20;
export const NOTE_MAX = 4000;

/** A page as the lists show it, in both languages, without loading anything. */
export type KeptPage = { id: string; at: number; glyph: string; title: Record<Lang, string>; slug: Record<Lang, string> };
export type KeptNote = { text: string; at: number; page: KeptPage };

type Keep = {
  /** "space": read from the open space; "tab": no space open, the tab's memory only. */
  where: "space" | "tab";
  ready: boolean;
  bookmarks: KeptPage[];
  notes: Record<string, KeptNote>;
  recent: KeptPage[];
};

export const useKeep = create<Keep>(() => ({ where: "tab", ready: false, bookmarks: [], notes: {}, recent: [] }));

export function keptPage(page: PageData): KeptPage {
  const other = page.twin.lang;
  return {
    id: page.id,
    at: Date.now(),
    glyph: page.glyph,
    title: { [page.lang]: page.title, [other]: page.twin.title } as Record<Lang, string>,
    slug: { [page.lang]: page.slug, [other]: page.twin.slug } as Record<Lang, string>,
  };
}

let loading: Promise<void> | null = null;
let watching = false;

/** Reads the open space's records (once per opening), or settles on the tab's memory. */
export function loadKeep(): Promise<void> {
  watch();
  const vault = openVault();
  if (!vault) {
    if (useKeep.getState().where === "space") useKeep.setState({ where: "tab", bookmarks: [], notes: {}, recent: [] });
    useKeep.setState({ ready: true });
    return Promise.resolve();
  }
  if (useKeep.getState().where === "space" && useKeep.getState().ready) return Promise.resolve();
  loading ??= (async () => {
    try {
      const [bookmarks, recent, notes] = await Promise.all([
        vault.get<KeptPage[]>(BOOKMARKS_RECORD),
        vault.get<KeptPage[]>(RECENT_RECORD),
        vault.list<KeptNote>(NOTE_RECORD),
      ]);
      // The pages read in this tab before the space was opened join those kept.
      const tab = useKeep.getState().where === "tab" ? useKeep.getState().recent : [];
      const merged = mergeRecent(tab, recent ?? []);
      useKeep.setState({
        where: "space",
        ready: true,
        bookmarks: bookmarks ?? [],
        recent: merged,
        notes: Object.fromEntries(notes.rows.map(([key, note]) => [key.slice(NOTE_RECORD.length), note])),
      });
      if (tab.length) await vault.put(RECENT_RECORD, merged);
    } catch {
      useKeep.setState({ ready: true });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function watch(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  // Locked: forget it all from memory. Opened (on this page or another): read it.
  whenSpaceLocks(() => useKeep.setState({ where: "tab", ready: true, bookmarks: [], notes: {}, recent: [] }));
  useSpace.subscribe((s, prev) => {
    if (s.status !== prev.status) void loadKeep();
  });
}

function mergeRecent(a: KeptPage[], b: KeptPage[]): KeptPage[] {
  const out: KeptPage[] = [];
  for (const p of [...a, ...b].sort((x, y) => y.at - x.at)) if (!out.some((q) => q.id === p.id)) out.push(p);
  return out.slice(0, RECENT_MAX);
}

/** A page read: first of the recent ones (sealed in the space, or the tab's memory). */
export async function noteRead(page: PageData): Promise<void> {
  await loadKeep();
  const recent = mergeRecent([keptPage(page)], useKeep.getState().recent);
  useKeep.setState({ recent });
  const vault = openVault();
  if (vault && useKeep.getState().where === "space") await vault.put(RECENT_RECORD, recent).catch(() => {});
}

export async function clearRecent(): Promise<void> {
  useKeep.setState({ recent: [] });
  const vault = openVault();
  if (vault && useKeep.getState().where === "space") await vault.remove(RECENT_RECORD).catch(() => {});
}

/** Bookmarks and notes need the open space: false (and nothing kept) without one. */
export async function toggleBookmark(page: PageData): Promise<boolean> {
  const vault = openVault();
  if (!vault) return false;
  await loadKeep();
  const now = useKeep.getState().bookmarks;
  const next = now.some((b) => b.id === page.id) ? now.filter((b) => b.id !== page.id) : [keptPage(page), ...now];
  useKeep.setState({ bookmarks: next });
  await vault.put(BOOKMARKS_RECORD, next);
  return true;
}

/** The reader's note on a page; an empty text removes it. */
export async function saveNote(page: PageData, text: string): Promise<boolean> {
  const vault = openVault();
  if (!vault) return false;
  await loadKeep();
  const clean = text.slice(0, NOTE_MAX);
  const notes = { ...useKeep.getState().notes };
  if (clean.trim()) {
    notes[page.id] = { text: clean, at: Date.now(), page: keptPage(page) };
    useKeep.setState({ notes });
    await vault.put(NOTE_RECORD + page.id, notes[page.id]);
  } else {
    delete notes[page.id];
    useKeep.setState({ notes });
    await vault.remove(NOTE_RECORD + page.id);
  }
  return true;
}
