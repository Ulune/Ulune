// The encyclopedia's preview images (encyclopedia plan, part 21): every core
// page has its own, drawn from what it shows now (run
// `node scripts/encyclopedia/previews.mjs` when an entry's name, glyph or
// figure changes); a page's head names it, a combination's names its first
// part's; none is left for an entry that is gone.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildEncyclopedia, readContent } from "./encyclopedia/build.mjs";
import { PREVIEW_DIR, PREVIEW_MANIFEST, previewEntries, previewKey } from "./encyclopedia/previews.mjs";
import { entryHead } from "../src/encyclopedia/head.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const real = buildEncyclopedia(readContent(`${ROOT}content/encyclopedia`));

test("every core page has its image, drawn from what it shows now", () => {
  const manifest = JSON.parse(readFileSync(PREVIEW_MANIFEST, "utf8"));
  const entries = previewEntries(real.data);
  assert.ok(entries.length > 300);
  const stale = [];
  for (const e of entries) {
    const file = join(PREVIEW_DIR, `${e.en.id}.jpg`);
    assert.ok(existsSync(file), `${e.en.id}: no image (node scripts/encyclopedia/previews.mjs)`);
    const size = statSync(file).size;
    assert.ok(size > 5_000 && size < 80_000, `${e.en.id}: ${size} bytes`);
    if (manifest[e.en.id] !== previewKey(e)) stale.push(e.en.id);
  }
  assert.deepEqual(stale, [], "drawn from an older entry: node scripts/encyclopedia/previews.mjs");
  const ids = new Set(entries.map((e) => e.en.id));
  for (const f of readdirSync(PREVIEW_DIR)) if (f.endsWith(".jpg")) assert.ok(ids.has(f.slice(0, -4)), `${f}: no entry`);
});

test("a page's head names its image; a combination's, its first part's", () => {
  const meta = (id, lang = "en") => Object.fromEntries(entryHead(real.data.pages[`${lang}/${id}`]).meta.filter((m) => m.property || m.name).map((m) => [m.property ?? m.name, m.content]));
  assert.equal(meta("saturn")["og:image"], "https://ulune.app/previews/saturn.jpg");
  assert.equal(meta("saturn", "fr")["og:image:alt"], "Saturne · Encyclopédie · Ulune");
  assert.equal(meta("moon-in-scorpio")["og:image"], "https://ulune.app/previews/moon.jpg");
  assert.equal(meta("life-path-7")["twitter:card"], "summary_large_image");
  for (const page of Object.values(real.data.pages)) {
    const m = entryHead(page).meta.find((x) => x.property === "og:image");
    assert.ok(m && existsSync(join(PREVIEW_DIR, m.content.split("/").pop())), `${page.lang}/${page.id}`);
  }
});
