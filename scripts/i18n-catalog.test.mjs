import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const CAT_DIR = join(ROOT, "src/lib/i18n/catalog");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|json|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

test("every key has English and French", () => {
  for (const [key, [en, fr]] of Object.entries(CATALOG)) {
    assert.ok(en && en.trim(), `${key}: English missing`);
    assert.ok(fr && fr.trim(), `${key}: French missing`);
  }
});

test("no key is defined in two areas", () => {
  const seen = new Map();
  for (const f of readdirSync(CAT_DIR)) {
    if (f === "index.ts") continue;
    const src = readFileSync(join(CAT_DIR, f), "utf8");
    for (const m of src.matchAll(/\n {2}([A-Za-z0-9_]+): \[/g)) {
      assert.ok(!seen.has(m[1]), `${m[1]} in ${f} and ${seen.get(m[1])}`);
      seen.set(m[1], f);
    }
  }
});

test("typographic apostrophes only", () => {
  for (const [key, pair] of Object.entries(CATALOG)) {
    for (const text of pair) assert.ok(!/\w'\w/.test(text), `${key}: straight apostrophe in "${text}"`);
  }
});

test("no unused keys", () => {
  const corpus = walk(join(ROOT, "src"))
    .filter((p) => !p.startsWith(CAT_DIR))
    .map((p) => readFileSync(p, "utf8"))
    .join("\n");
  const unused = Object.keys(CATALOG).filter((key) => {
    if (new RegExp(`["'\`]${key}["'\`]`).test(corpus)) return false;
    if (new RegExp(`[.\\[]${key}\\b`).test(corpus)) return false;
    if (key.startsWith("scrubUnit_") || key.startsWith("err_")) return false;
    if (key.endsWith("Hint") && new RegExp(`["'\`]${key.slice(0, -4)}["'\`]`).test(corpus)) return false;
    return true;
  });
  assert.deepEqual(unused, []);
});

test("no English literal in aria-label", () => {
  const hits = walk(join(ROOT, "src"))
    .filter((p) => p.endsWith(".tsx"))
    .flatMap((p) =>
      [...readFileSync(p, "utf8").matchAll(/aria-label="([A-Za-z][^"]*)"/g)].map((m) => `${p}: ${m[1]}`),
    );
  assert.deepEqual(hits, []);
});
