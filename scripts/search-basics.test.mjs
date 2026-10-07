// What search engines and link previews read (src/lib/page-head.ts,
// public/robots.txt, the sitemap at /sitemap.xml): one address per page, the
// public pages listed, the private ones kept out.
import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { SITE_URL } from "../src/lib/app-identity.ts";
import { HOME_STRUCTURED_DATA, HOME_TITLE, INDEXED_PAGES, pageHead } from "../src/lib/page-head.ts";
import { isEncyclopediaPath, sitemapPaths, sitemapXml } from "../src/lib/sitemap.ts";
import { buildEncyclopedia, readContent } from "./encyclopedia/build.mjs";
import { calendarHead } from "../src/studio/calendar-head.ts";
import { CALENDAR_PATHS } from "../src/studio/map.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
/** The encyclopedia's index, as the build makes it from content/encyclopedia. */
const encyclopedia = buildEncyclopedia(readContent(new URL("../content/encyclopedia", import.meta.url).pathname));

/** The Calendar's two addresses and their languages: each a page of its own (src/studio/calendar-head.ts). */
const CALENDAR = { [CALENDAR_PATHS.en]: "en", [CALENDAR_PATHS.fr]: "fr" };
/** A route file that hands studioRoute() the Calendar's head in one language. */
const calendarRoute = (lang) => new RegExp(`studioRoute\\(\\{ head: \\(\\) => calendarHead\\("${lang}"\\) \\}\\)`);

test("robots.txt lets every page be read and names the sitemap", () => {
  const robots = read("public/robots.txt");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: \/\S/m);
  assert.match(robots, new RegExp(`^Sitemap: ${SITE_URL}/sitemap\\.xml$`, "m"));
});

test("the sitemap lists exactly the public pages, the encyclopedia's from its own index", () => {
  // Made by a server route from the encyclopedia's index (src/lib/sitemap.ts): no static copy to fall out of step.
  assert.ok(!existsSync(new URL("../public/sitemap.xml", import.meta.url)), "a static public/sitemap.xml would hide the route");
  assert.match(read("src/routes/sitemap[.]xml.ts"), /createFileRoute\("\/sitemap\.xml"\)[\s\S]*sitemapXml\(index\)/);
  assert.deepEqual(encyclopedia.errors, []);
  const { index } = encyclopedia.data;
  const locs = [...sitemapXml(index).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, sitemapPaths(index).map((p) => `${SITE_URL}${p}`));
  // Every page INDEXED_PAGES names is there, and every encyclopedia entry with a page, in both languages.
  for (const p of INDEXED_PAGES) assert.ok(locs.includes(`${SITE_URL}${p}`), p);
  const pages = Object.values(index.terms).filter((row) => row[4]);
  assert.equal(locs.filter((l) => /\/encycloped(ia|ie)\/./.test(l)).length, 2 * pages.length + 2 * index.traditions.filter((t) => t.count).length);
  // The Calendar's two addresses name each other, as their heads do.
  const twins = `<xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/calendar"/><xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL}/calendrier"/>`;
  for (const path of Object.values(CALENDAR_PATHS)) assert.ok(sitemapXml(index).includes(`<loc>${SITE_URL}${path}</loc>${twins}</url>`), path);
});

test("each public page names its own address, title and description", () => {
  // The encyclopedia's pages build their heads with their data (src/encyclopedia/head.ts, scripts/encyclopedia.test.mjs).
  for (const file of ["encyclopedia.index", "encyclopedie.index", "encyclopedia.$slug", "encyclopedie.$slug"]) {
    assert.match(read(`src/routes/${file}.tsx`), /head: \(\{ loaderData \}\) => loaderData\?\.head \?\?/, file);
  }
  for (const path of INDEXED_PAGES.filter((p) => !isEncyclopediaPath(p))) {
    if (path in CALENDAR) {
      // The Calendar's head comes from calendarHead, in its address's language.
      // The studio's paths are children of its layout (src/routes/_studio.tsx).
      assert.match(read(`src/routes/_studio.${path.slice(1)}.tsx`), calendarRoute(CALENDAR[path]), `src/routes/_studio.${path.slice(1)}.tsx has no head for ${path}`);
      assert.deepEqual(calendarHead(CALENDAR[path]).links[0], { rel: "canonical", href: `${SITE_URL}${path}` });
      continue;
    }
    // The home page's head is the studio's, shared by every studio path (src/studio/studio-route.tsx).
    const file = path === "/" ? "src/studio/studio-route.tsx" : `src/routes${path}.tsx`;
    assert.match(read(file), new RegExp(`pageHead\\(\\{\\s*path: "${path}"`), `${file} has no head for ${path}`);
  }
  const head = pageHead({ path: "/privacy", title: "Privacy · Ulune", description: "About data." });
  assert.deepEqual(head.links, [{ rel: "canonical", href: `${SITE_URL}/privacy` }]);
  assert.ok(head.meta.some((m) => m.name === "description" && m.content === "About data."));
  assert.ok(head.meta.some((m) => m.property === "og:url" && m.content === `${SITE_URL}/privacy`));
  assert.ok(!head.meta.some((m) => m.name === "robots"));
});

test("settings, the guide's own page and a missing page stay out of search", () => {
  // /guide holds the same words as the home page's guide: the home page is the one found.
  for (const file of ["src/routes/settings.tsx", "src/routes/guide.tsx", "src/routes/$.tsx"]) {
    assert.match(read(file), /index: false/, file);
  }
  const hidden = pageHead({ path: "/settings", title: "Settings · Ulune", index: false });
  assert.ok(hidden.meta.some((m) => m.name === "robots" && m.content === "noindex"));
  assert.equal(hidden.links, undefined);
});

test("the home page says what Ulune is, as a free web application", () => {
  assert.match(HOME_TITLE, /^Ulune · /);
  assert.ok(HOME_TITLE.length <= 60, "a title search results show whole");
  assert.equal(HOME_STRUCTURED_DATA["@type"], "WebApplication");
  assert.equal(HOME_STRUCTURED_DATA.url, `${SITE_URL}/`);
  assert.equal(HOME_STRUCTURED_DATA.offers.price, "0");
  assert.match(read("src/studio/studio-route.tsx"), /type: "application\/ld\+json", children: JSON\.stringify\(HOME_STRUCTURED_DATA\)/);
});

test("every studio path but the Calendar's is the home page for search engines: one head, its canonical address /", () => {
  const files = ["index", "astrology.index", "astrology.transits", "astrology.progressions", "astrology.synastry", "astrology.composite", "human-design", "numerology.index"];
  for (const f of files) assert.match(read(`src/routes/_studio.${f}.tsx`), /\.\.\.studioRoute\(\)|\(studioRoute\(\)\)/, f);
  // The Calendar is a studio page too, with a head of its own in each language (reorganisation plan, R5).
  assert.match(read("src/routes/_studio.calendar.tsx"), calendarRoute("en"));
  assert.match(read("src/routes/_studio.calendrier.tsx"), calendarRoute("fr"));
  // studioRoute() without a head of its own gives the home page's.
  assert.match(read("src/studio/studio-route.tsx"), /pageHead\(\{ path: "\/", title: HOME_TITLE \}\)/);
  assert.match(read("src/studio/studio-route.tsx"), /head: opts\.head \?\? homeHead/);
});

test("the studio is its layout's component: one instance on every studio path, split from the first script", () => {
  // As each path's own component, the router gave every path a component of its own and a page switch rebuilt the studio.
  assert.match(read("src/routes/_studio.tsx"), /createFileRoute\("\/_studio"\)\(\{ component: StudioLayout \}\)/);
  assert.match(read("src/routes/_studio.tsx"), /<StudioPage \/>/);
  const files = ["index", "astrology.index", "astrology.transits", "astrology.progressions", "astrology.synastry", "astrology.composite", "human-design", "numerology.index", "calendar", "calendrier"];
  for (const f of files) assert.doesNotMatch(read(`src/routes/_studio.${f}.tsx`), /component:/, f);
  assert.doesNotMatch(read("src/studio/studio-route.tsx"), /^\s+component:/m);
});

test("the Calendar is a page of its own in each language, each naming the other", () => {
  for (const [lang, title] of [["en", "Calendar · Ulune"], ["fr", "Calendrier · Ulune"]]) {
    const head = calendarHead(lang);
    const meta = (key, value) => head.meta.find((m) => m[key] === value)?.content;
    assert.equal(head.meta.find((m) => m.title)?.title, title);
    assert.ok(head.meta.every((m) => m.name !== "robots"), "open to search engines");
    const description = meta("name", "description");
    assert.ok(description && description.length <= 180, `${lang} description: ${description}`);
    assert.match(description, lang === "en" ? /Moon phases, eclipses, retrogrades/ : /phases de la Lune, éclipses, rétrogradations/);
    assert.match(description, lang === "en" ? /your transits/ : /vos transits/);
    assert.equal(meta("property", "og:url"), `${SITE_URL}${CALENDAR_PATHS[lang]}`);
    assert.equal(meta("property", "og:locale"), lang === "en" ? "en_GB" : "fr_FR");
    assert.deepEqual(head.links, [
      { rel: "canonical", href: `${SITE_URL}${CALENDAR_PATHS[lang]}` },
      { rel: "alternate", hrefLang: "en", href: `${SITE_URL}/calendar` },
      { rel: "alternate", hrefLang: "fr", href: `${SITE_URL}/calendrier` },
      { rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}/calendar` },
    ]);
  }
  // French typography in the French head: a narrow no-break space before the colon.
  assert.match(calendarHead("fr").meta.find((m) => m.name === "description").content, /jour\u202f:/);
});

test("the home page's guide is in the server's page, in plain text", () => {
  const guide = read("src/components/first-screen/Guide.tsx");
  // No lazy loading or client-only switch around the guide: search engines read what the server sends.
  assert.doesNotMatch(guide, /lazy\(|useEffect|"use client"/);
  const workspace = read("src/studio/workspace.tsx");
  assert.match(workspace, /<Guide /);
  assert.match(workspace, /<SiteFooter \/>/);
  assert.ok(!INDEXED_PAGES.includes("/guide"));
});
