// Static import graph of the source (no build): which files an entry pulls in
// eagerly (dynamic import() and `import type` excluded), their gzip sizes, and
// why a file is there (the shortest import chain from the entry).
// node scripts/perf/load/graph.mjs src/routes/index.tsx [--why src/lib/content/hd.ts] [--top 40]
// Several entries: separate them with commas. Sizes are of the source, gzip -9:
// a rough guide to what a chunk will weigh, not the build's own numbers.
import { existsSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, relative, resolve } from "node:path";
import { ROOT } from "../paths.mjs";

const args = process.argv.slice(2);
const entries = (args.find((a) => !a.startsWith("--")) ?? "src/routes/index.tsx").split(",");
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const why = opt("--why");
const top = Number(opt("--top") ?? 40);
const EXT = ["", ".ts", ".tsx", ".js", ".mjs", ".json", "/index.ts", "/index.tsx"];

function resolveSpec(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return { pkg: spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0] };
  base = base.replace(/\?.*$/, "");
  for (const e of EXT) {
    const p = base + e;
    if (existsSync(p) && statSync(p).isFile()) return { file: p };
  }
  return { missing: base };
}

const IMPORT_RE = /(?:^|\n)\s*(import|export)\s+(type\s+)?([^;'"`]*?)\s*from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']/g;
function importsOf(file) {
  if (!/\.(tsx?|mjs|js)$/.test(file)) return [];
  const src = readFileSync(file, "utf8");
  const out = [];
  for (const m of src.matchAll(IMPORT_RE)) {
    if (m[5]) { out.push(m[5]); continue; }
    if (m[2]) continue; // import type / export type
    const clause = m[3] ?? "";
    // `import { type A, type B } from` is type-only too.
    const inner = clause.match(/^\{([\s\S]*)\}$/);
    if (inner && inner[1].split(",").map((s) => s.trim()).filter(Boolean).every((s) => s.startsWith("type "))) continue;
    out.push(m[4]);
  }
  return out;
}

const parent = new Map();
const pkgs = new Map();
const seen = new Set();
const queue = [];
for (const e of entries) {
  const f = resolve(ROOT, e);
  seen.add(f);
  queue.push(f);
}
while (queue.length) {
  const f = queue.shift();
  for (const spec of importsOf(f)) {
    if (spec.endsWith(".css") || spec.includes(".css?")) continue;
    const r = resolveSpec(f, spec);
    if (r.pkg) {
      if (!pkgs.has(r.pkg)) pkgs.set(r.pkg, f);
      continue;
    }
    if (!r.file || seen.has(r.file)) continue;
    seen.add(r.file);
    parent.set(r.file, f);
    queue.push(r.file);
  }
}

const rel = (p) => relative(ROOT, p);
if (why) {
  const target = resolve(ROOT, why);
  if (!seen.has(target)) {
    console.log(`${why} is not reached eagerly from ${entries.join(", ")}`);
  } else {
    const chain = [target];
    while (parent.has(chain[0])) chain.unshift(parent.get(chain[0]));
    console.log(chain.map(rel).join("\n  → "));
  }
  process.exit(0);
}
const rows = [...seen].map((f) => {
  const buf = readFileSync(f);
  return { file: rel(f), gz: gzipSync(buf, { level: 9 }).length };
});
const total = rows.reduce((a, r) => a + r.gz, 0);
console.log(`${entries.join(", ")}: ${rows.length} source files, ${(total / 1024).toFixed(1)} KB gz of source (packages not counted)`);
const folders = new Map();
for (const r of rows) {
  const k = r.file.split("/").slice(0, 3).join("/");
  folders.set(k, (folders.get(k) ?? 0) + r.gz);
}
console.log("\nBy folder:");
for (const [k, v] of [...folders].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${(v / 1024).toFixed(1).padStart(6)} KB  ${k}`);
console.log(`\nLargest files (top ${top}):`);
for (const r of rows.sort((a, b) => b.gz - a.gz).slice(0, top)) console.log(`  ${(r.gz / 1024).toFixed(1).padStart(6)} KB  ${r.file}`);
console.log(`\nPackages: ${[...pkgs.keys()].sort().join(", ")}`);
