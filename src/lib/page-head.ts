/**
 * What a page tells search engines and link previews: its title, its
 * description, its one address (canonical: the query and the other domains
 * all point here), and whether it belongs in search at all. English only for
 * now: the server sends one head for every language (the audit's "French
 * pages at their own address" comes after v1.0).
 */
import { APP_DESCRIPTION, APP_NAME, SITE_URL } from "@/lib/app-identity";

type PageHead = {
  /** The page's path, "/" for the home page. */
  path: string;
  title: string;
  description?: string;
  /** false: kept out of search (settings, a missing page). */
  index?: boolean;
};

export function pageHead({ path, title, description, index = true }: PageHead) {
  if (!index) {
    return { meta: [{ title }, { name: "robots", content: "noindex" }] };
  }
  const url = `${SITE_URL}${path}`;
  const text = description ?? APP_DESCRIPTION;
  return {
    meta: [
      { title },
      { name: "description", content: text },
      { property: "og:title", content: title },
      { property: "og:description", content: text },
      { property: "og:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: text },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** The home page's title: the name and what it does. */
export const HOME_TITLE = `${APP_NAME} · Astrology charts, Human Design and numerology`;

/** Structured data for the home page: a free web application (schema.org). */
export const HOME_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_NAME,
  url: `${SITE_URL}/`,
  description: APP_DESCRIPTION,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  inLanguage: ["en", "fr"],
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
};

/** The pages a search engine should know (public/sitemap.xml lists the same). */
export const INDEXED_PAGES = ["/", "/privacy", "/legal", "/terms", "/credits", "/accessibility"] as const;
