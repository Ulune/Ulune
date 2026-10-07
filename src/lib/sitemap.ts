/*
 * The sitemap (served at /sitemap.xml by src/routes/sitemap[.]xml.ts): the
 * public pages of INDEXED_PAGES, then every encyclopedia entry that has a
 * page, in both languages, from the encyclopedia's term index, so a page
 * written joins it with no list to keep by hand. Each encyclopedia address,
 * and each of the Calendar's, names its twin in the other language. Pure: the
 * unit tests call it as the route does.
 */
import { SITE_URL } from "@/lib/app-identity";
import { INDEXED_PAGES } from "@/lib/page-head";
import { CALENDAR_PATHS } from "@/studio/map";
import type { TermIndex } from "@/encyclopedia/types";

const BASE = { en: "/encyclopedia", fr: "/encyclopedie" } as const;

/** Every encyclopedia address with its English and French forms: the homes, then the pages. */
export function encyclopediaPairs(index: TermIndex): { en: string; fr: string }[] {
  const pairs: { en: string; fr: string }[] = [{ en: BASE.en, fr: BASE.fr }];
  for (const t of index.traditions) if (t.count > 0) pairs.push({ en: `${BASE.en}/${t.home.en}`, fr: `${BASE.fr}/${t.home.fr}` });
  for (const row of Object.values(index.terms)) if (row[4]) pairs.push({ en: `${BASE.en}/${row[2]}`, fr: `${BASE.fr}/${row[3]}` });
  return pairs;
}

/** An address of the encyclopedia (its homes are in INDEXED_PAGES too, and come from its index here). */
export const isEncyclopediaPath = (path: string): boolean => /^\/encycloped(ia|ie)(\/|$)/.test(path);

/** The addresses the sitemap lists, in its order. */
export function sitemapPaths(index: TermIndex): string[] {
  return [...INDEXED_PAGES.filter((p) => !isEncyclopediaPath(p)), ...encyclopediaPairs(index).flatMap((p) => [p.en, p.fr])];
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function sitemapXml(index: TermIndex): string {
  const twins = new Map<string, { en: string; fr: string }>();
  for (const p of [{ en: CALENDAR_PATHS.en, fr: CALENDAR_PATHS.fr }, ...encyclopediaPairs(index)]) {
    twins.set(p.en, p);
    twins.set(p.fr, p);
  }
  const urls = sitemapPaths(index).map((path) => {
    const pair = twins.get(path);
    const alternates = pair
      ? (["en", "fr"] as const).map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${escape(SITE_URL + pair[l])}"/>`).join("")
      : "";
    return `  <url><loc>${escape(SITE_URL + path)}</loc>${alternates}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}
