// Reads scripts/perf/.out/load/client-chunks.json (analyze.vite.config.mjs) and
// prints each chunk's gzip size (the minified file on disk) and its biggest
// modules, grouped by folder. node scripts/perf/load/chunk-report.mjs [top=12]
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { OUT, ROOT } from "../paths.mjs";

const top = Number(process.argv[2] || 12);
const chunks = JSON.parse(readFileSync(join(OUT, "load/client-chunks.json"), "utf8"));
const dist = join(ROOT, ".vercel/output/static");
const gz = (file) => {
  const p = join(dist, file);
  return existsSync(p) ? gzipSync(readFileSync(p), { level: 9 }).length : 0;
};
const kb = (n) => (n / 1024).toFixed(1).padStart(7);
for (const c of chunks.sort((a, b) => b.code - a.code)) {
  const total = c.modules.reduce((a, m) => a + m.bytes, 0) || 1;
  const kind = c.isEntry ? "entry" : c.isDynamicEntry ? "lazy" : "shared";
  console.log(`\n${c.file}  ${kind}  ${kb(gz(c.file))} KB gz  ${kb(c.code)} KB min  ${c.facade ?? ""}`);
  if (c.dynamicImports.length) console.log(`   lazy → ${c.dynamicImports.join(", ")}`);
  const folders = new Map();
  for (const m of c.modules) {
    const f = m.id.includes("node_modules/") ? "npm:" + m.id.split("node_modules/").pop().split("/").slice(0, m.id.split("node_modules/").pop().startsWith("@") ? 2 : 1).join("/") : m.id.split("/").slice(0, 3).join("/");
    folders.set(f, (folders.get(f) ?? 0) + m.bytes);
  }
  for (const [f, b] of [...folders].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`   ${((b / total) * 100).toFixed(1).padStart(5)}%  ${kb(b)} KB  ${f}`);
  }
}
