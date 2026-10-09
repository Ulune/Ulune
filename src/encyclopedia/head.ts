/*
 * What the encyclopedia's pages tell search engines and link previews
 * (encyclopedia plan, part 3): a title ("Saturn · Encyclopedia · Ulune"), the
 * one-sentence summary as the description, the page's own address as its
 * canonical one, its twin in the other language (hreflang), and for an entry
 * structured data marking it as a defined term. Built with the page's data
 * and handed to the router with it.
 */
import { SITE_URL } from "@/lib/app-identity";
import { pageHead } from "@/lib/page-head";
import { encPath } from "./data";
import { tr } from "./words";
import type { Lang, PageData, TraditionHome } from "./types";

type Tag = Record<string, string | undefined>;
export type Head = { meta: Tag[]; links?: Tag[]; scripts?: { type: string; children: string }[] };

/** The licence of the encyclopedia's text (content/encyclopedia/LICENSE). */
export const TEXT_LICENCE = { name: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/" };

const other = (lang: Lang): Lang => (lang === "en" ? "fr" : "en");

/** The page's head with its language and its twin: canonical itself, hreflang both, English the default. */
function withTwin(head: Head, lang: Lang, own: string, twin: string): Head {
  const en = lang === "en" ? own : twin;
  const fr = lang === "fr" ? own : twin;
  return {
    meta: [...head.meta, { property: "og:locale", content: lang === "fr" ? "fr_FR" : "en_GB" }],
    links: [
      ...(head.links ?? []),
      { rel: "alternate", hrefLang: "en", href: `${SITE_URL}${en}` },
      { rel: "alternate", hrefLang: "fr", href: `${SITE_URL}${fr}` },
      { rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}${en}` },
    ],
  };
}

/** JSON for a <script> block: nothing in it can close the tag. */
const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

export function homeHead(lang: Lang): Head {
  const title = `${tr(lang, "encTitle")} · Ulune`;
  return withTwin(pageHead({ path: encPath(lang), title, description: tr(lang, "encLead") }), lang, encPath(lang), encPath(other(lang)));
}

export function traditionHead(home: TraditionHome): Head {
  const title = `${home.name} · ${tr(home.lang, "encTitle")} · Ulune`;
  const own = encPath(home.lang, home.home);
  return withTwin(pageHead({ path: own, title, description: home.intro }), home.lang, own, encPath(other(home.lang), home.twinHome));
}

export function entryHead(page: PageData): Head {
  const title = `${page.title} · ${tr(page.lang, "encTitle")} · Ulune`;
  const own = encPath(page.lang, page.slug);
  const head = withTwin(pageHead({ path: own, title, description: page.summary }), page.lang, own, encPath(page.twin.lang, page.twin.slug));
  const term = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: page.title,
    ...(page.aliases.length ? { alternateName: page.aliases } : {}),
    description: page.summary,
    url: `${SITE_URL}${own}`,
    inLanguage: page.lang,
    termCode: page.id,
    dateModified: page.revised,
    license: TEXT_LICENCE.url,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `${tr(page.lang, "encTitle")} · Ulune`,
      url: `${SITE_URL}${encPath(page.lang)}`,
    },
  };
  return { ...head, meta: [...head.meta, ...previewMeta(page)], scripts: [{ type: "application/ld+json", children: jsonLd(term) }] };
}

/**
 * Its preview image for a shared link (part 21): a core page's own
 * (public/previews, scripts/encyclopedia/previews.mjs), a combination's that
 * of its first part (the Moon's for Moon in Scorpio).
 */
function previewMeta(page: PageData): Tag[] {
  const id = page.kind === "combination" ? page.related[0]?.id : page.id;
  if (!id) return [];
  const alt = page.kind === "combination" ? (page.related[0]?.title ?? page.title) : page.title;
  return [
    { property: "og:image", content: `${SITE_URL}/previews/${id}.jpg` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: `${alt} · ${tr(page.lang, "encTitle")} · Ulune` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: `${SITE_URL}/previews/${id}.jpg` },
  ];
}

