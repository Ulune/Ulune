/* The encyclopedia's answers to the ⌘K palette (palette.ts loads this on the first letter typed). */
import { encPath, loadIndex } from "./data";
import { engineFor } from "./engine";
import { search } from "./search";
import type { Lang } from "./types";

export type PaletteHit = { id: string; title: string; summary: string; href: string };

/**
 * The best entries for a search, each with where it leads: its page, or, for
 * an entry that is a card only, its card on its tradition's home.
 */
export async function paletteHits(lang: Lang, query: string, limit = 8): Promise<PaletteHit[]> {
  const [engine, index] = await Promise.all([engineFor(lang), loadIndex()]);
  return search(engine, query, limit).map((h) => {
    const home = index.traditions.find((t) => t.id === h.tradition)?.home[lang];
    const href = h.slug ? encPath(lang, h.slug) : home ? `${encPath(lang, home)}#${h.id}` : encPath(lang);
    return { id: h.id, title: h.title, summary: h.summary, href };
  });
}
