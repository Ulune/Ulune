/*
 * The Calendar's page head (page reorganisation plan, R5). Unlike the other
 * studio pages, which are the home page for search engines, the Calendar is
 * worth finding on its own ("Moon phases October 2026") and works without a
 * chart, so each of its two addresses is a page of its own: /calendar in
 * English, /calendrier in French, each naming itself as the one address and
 * the other as its twin in the other language (hreflang), English for anyone
 * else. Pure, no browser: scripts/search-basics.test.mjs reads it.
 */
import { SITE_URL } from "@/lib/app-identity";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { pageHead } from "@/lib/page-head";
import { CALENDAR_PATHS } from "@/studio/map";

export function calendarHead(locale: AppLocale) {
  const head = pageHead({
    path: CALENDAR_PATHS[locale],
    title: translate(locale, "calendarPageTitle"),
    description: translate(locale, "calendarPageDescription"),
  });
  const at = (lang: AppLocale) => `${SITE_URL}${CALENDAR_PATHS[lang]}`;
  return {
    ...head,
    meta: [...head.meta, { property: "og:locale", content: locale === "fr" ? "fr_FR" : "en_GB" }],
    links: [
      ...(head.links ?? []),
      { rel: "alternate", hrefLang: "en", href: at("en") },
      { rel: "alternate", hrefLang: "fr", href: at("fr") },
      { rel: "alternate", hrefLang: "x-default", href: at("en") },
    ],
  };
}
