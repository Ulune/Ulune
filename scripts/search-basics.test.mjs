// What search engines and link previews read (src/lib/page-head.ts,
// public/robots.txt, public/sitemap.xml): one address per page, the public
// pages listed, the private ones kept out.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { SITE_URL } from "../src/lib/app-identity.ts";
import { HOME_STRUCTURED_DATA, HOME_TITLE, INDEXED_PAGES, pageHead } from "../src/lib/page-head.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("robots.txt lets every page be read and names the sitemap", () => {
  const robots = read("public/robots.txt");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: \/\S/m);
  assert.match(robots, new RegExp(`^Sitemap: ${SITE_URL}/sitemap\\.xml$`, "m"));
});

test("the sitemap lists exactly the public pages", () => {
  const locs = [...read("public/sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, INDEXED_PAGES.map((p) => `${SITE_URL}${p}`));
});

test("each public page names its own address, title and description", () => {
  for (const path of INDEXED_PAGES) {
    const file = path === "/" ? "src/routes/index.tsx" : `src/routes${path}.tsx`;
    assert.match(read(file), new RegExp(`pageHead\\(\\{\\s*path: "${path}"`), `${file} has no head for ${path}`);
  }
  const head = pageHead({ path: "/privacy", title: "Privacy · Ulune", description: "About data." });
  assert.deepEqual(head.links, [{ rel: "canonical", href: `${SITE_URL}/privacy` }]);
  assert.ok(head.meta.some((m) => m.name === "description" && m.content === "About data."));
  assert.ok(head.meta.some((m) => m.property === "og:url" && m.content === `${SITE_URL}/privacy`));
  assert.ok(!head.meta.some((m) => m.name === "robots"));
});

test("settings and a missing page stay out of search", () => {
  for (const file of ["src/routes/settings.tsx", "src/routes/$.tsx"]) {
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
  assert.match(read("src/routes/index.tsx"), /type: "application\/ld\+json", children: JSON\.stringify\(HOME_STRUCTURED_DATA\)/);
});
