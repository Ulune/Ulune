/*
 * The encyclopedia's data, one piece at a time (scripts/encyclopedia/vite-plugin.mjs
 * makes each piece a module of its own): nothing here is in the first
 * download of any page, and each piece is fetched once, the first time it is
 * needed. On the server they are all bundled with the app.
 */
import { importWithRetry } from "@/lib/lazy-retry";
import type { CardTexts, HomeData, Lang, PageData, SearchIndex, TermIndex, TermRow, TraditionHome } from "./types";

/** The encyclopedia's address in each language. */
export const ENC_BASE: Record<Lang, string> = { en: "/encyclopedia", fr: "/encyclopedie" };

export const encPath = (lang: Lang, slug?: string): string => (slug ? `${ENC_BASE[lang]}/${slug}` : ENC_BASE[lang]);

const loaders = () => importWithRetry(() => import("virtual:ulune-encyclopedia/loaders"));

let index: Promise<TermIndex> | null = null;

/** Every entry's tradition, family and addresses (a few KB; kept once loaded). */
export function loadIndex(): Promise<TermIndex> {
  index ??= importWithRetry(() => import("virtual:ulune-encyclopedia/index")).then((m) => m.default);
  // A failed download may be tried again later.
  index.catch(() => {
    index = null;
  });
  return index;
}

/** An entry's row in the index, or null (never a key of Object's prototype). */
export function termRow(terms: TermIndex["terms"], id: string): TermRow | null {
  return Object.hasOwn(terms, id) ? terms[id] : null;
}

/** An entry's address in a language, or null when it is a card only. */
export function termPath(row: TermRow, lang: Lang): string | null {
  return row[4] ? encPath(lang, lang === "en" ? row[2] : row[3]) : null;
}

/** A page, through its tradition's list of pages in that language (a small file per tradition, not one for all). */
export async function loadPage(lang: Lang, id: string, tradition: string): Promise<PageData | null> {
  const shard = (await loaders()).pages[`${lang}/${tradition}`];
  const load = shard ? (await importWithRetry(shard)).default[id] : undefined;
  return load ? (await importWithRetry(load)).default : null;
}

export async function loadCards(lang: Lang, tradition: string): Promise<CardTexts> {
  const load = (await loaders()).cards[`${lang}/${tradition}`];
  return load ? (await importWithRetry(load)).default : {};
}

export async function loadSearch(lang: Lang): Promise<SearchIndex> {
  const load = (await loaders()).search[lang];
  return load ? (await importWithRetry(load)).default : { lang, docs: [] };
}

export async function loadHome(lang: Lang): Promise<HomeData> {
  const load = (await loaders()).homes[lang];
  return load ? (await importWithRetry(load)).default : { lang, traditions: [], az: [] };
}

export async function loadTraditionHome(lang: Lang, tradition: string): Promise<TraditionHome | null> {
  const load = (await loaders()).traditions[`${lang}/${tradition}`];
  return load ? (await importWithRetry(load)).default : null;
}
