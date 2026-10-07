/*
 * What the encyclopedia's routes load (src/routes/encyclopedia*.tsx and
 * encyclopedie*.tsx import it when a page opens, never up front): the data of
 * the page and its head. On the server the page is rendered complete with it;
 * in the browser a move between pages fetches only the next page's piece.
 *
 * Addresses: /encyclopedia/<slug> in English, /encyclopedie/<slug> in French.
 * A slug is an entry's (it has a page) or a tradition's home. An entry's id
 * leads to its own address (a link that knew only the id); an entry with no
 * page yet, and anything else, is not found.
 */
import { notFound, redirect } from "@tanstack/react-router";
import { loadHome, loadIndex, loadPage, loadTraditionHome, termPath, termRow } from "./data";
import { engineFor } from "./engine";
import { entryHead, homeHead, traditionHead, type Head } from "./head";
import { search, type SearchHit } from "./search";
import type { HomeData, Lang, PageData, TraditionHome } from "./types";

export type HomeRouteData = { home: HomeData; q: string; hits: SearchHit[] | null; head: Head };
export type SlugRouteData =
  | { kind: "entry"; page: PageData; head: Head }
  | { kind: "tradition"; home: TraditionHome; head: Head };

/** The home, and the results of `?q=` when the server is asked for them (a search sent without JavaScript). */
export async function homeData(lang: Lang, q?: string): Promise<HomeRouteData> {
  const home = await loadHome(lang);
  const query = (q ?? "").trim();
  const hits = query ? search(await engineFor(lang), query) : null;
  return { home, q: query, hits, head: homeHead(lang) };
}

export async function slugData(lang: Lang, slug: string): Promise<SlugRouteData> {
  const index = await loadIndex();
  const tradition = index.traditions.find((t) => t.home[lang] === slug && t.count > 0);
  if (tradition) {
    const home = await loadTraditionHome(lang, tradition.id);
    if (home) return { kind: "tradition", home, head: traditionHead(home) };
  }
  const column = lang === "en" ? 2 : 3;
  const id = Object.keys(index.terms).find((k) => index.terms[k]![column] === slug);
  if (!id) {
    // An entry's id rather than its address: on to the address, when it has a page.
    const row = termRow(index.terms, slug);
    const path = row && termPath(row, lang);
    if (path) throw redirect({ href: path });
    throw notFound();
  }
  const row = termRow(index.terms, id);
  if (!row?.[4]) throw notFound();
  const page = await loadPage(lang, id, row[0]);
  if (!page) throw notFound();
  return { kind: "entry", page, head: entryHead(page) };
}
