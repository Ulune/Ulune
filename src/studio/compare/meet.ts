import { languageOf, lensesOf, pagesOf } from "@/studio/map";
import type { StudioPage } from "@/studio/url";

/*
 * Where "See how they meet" leads from Compare (share and compare plan,
 * feature 2, "Compare and Relationship"): the language's Relationship page,
 * with the same two people; and which tables have an A | B form. Pure, no
 * browser; Compare's own download.
 */

/**
 * The Relationship page that reads how the two people of Compare meet ("See
 * how they meet"): astrology's Synastry, Human Design's connection chart
 * (feature 5a), numerology's two people (5c), Chinese astrology's, BaZi's
 * and Feng Shui's pair pages. A language without a Relationship lens has
 * none, and the link is not shown. The one place that says so: when a
 * language gains the lens in the map (src/studio/map.ts), its link appears.
 */
export function relationshipPageOf(page: StudioPage): StudioPage | null {
  const lang = languageOf(page);
  if (!lang || !lensesOf(lang).includes("relationship")) return null;
  const pages = pagesOf(lang, "relationship");
  // Astrology's Relationship has two pages: Synastry reads how two charts meet (the Composite is a third chart).
  return pages.includes("synastry") ? "synastry" : (pages[0] ?? null);
}

/** The pages whose table also has an A | B form, one table for two (merged.tsx): numerology's core numbers, BaZi's pillars. */
export const mergedPage = (page: StudioPage): boolean => page === "numerology" || page === "bazi";
