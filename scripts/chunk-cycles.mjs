/*
 * Chunks that import each other run in an order set by whichever one is
 * loaded first. When chunk A reads, while it loads (at its top level), a
 * value that chunk B declares with var/let/const/class, and B can be loaded
 * first, A reads it before B has run: `undefined`. A spread then throws, and
 * `new Set(undefined)` quietly makes an empty set (October 2026: the server's
 * transit table lost its major aspects and patterns their classical planets
 * this way, once a new page loaded the constants' chunk first).
 *
 * This check reads a build's chunks (ES modules), finds every group of chunks
 * that import each other (strongly connected components of the static import
 * graph), and lists each top-level read of a value imported from a chunk of
 * the same group. Functions declared with `function` are safe to call (their
 * bindings exist before any chunk runs) unless the call itself happens at the
 * top level, which is listed too. Run after a build:
 *   node scripts/chunk-cycles.mjs .vercel/output/functions/__server.func .vercel/output/static/assets
 * It exits 1 when it finds any such read. Used by scripts/deploy-check.mjs.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as acorn from "acorn";

function listChunks(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      out.push(...listChunks(p));
    } else if (/\.(mjs|js)$/.test(name)) out.push(p);
  }
  return out;
}

function parse(file) {
  const src = readFileSync(file, "utf8");
  try {
    return { src, ast: acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }) };
  } catch {
    return null; // not an ES module we can read (a CommonJS file, a worker): not part of the graph
  }
}

/** Walk a node, skipping function bodies (their reads happen later, when called). */
function topLevelRefs(node, names, out, calls) {
  if (!node || typeof node !== "object") return;
  switch (node.type) {
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      return;
    case "MethodDefinition":
    case "Property":
      if (node.type === "MethodDefinition" || node.method || node.kind === "get" || node.kind === "set") {
        if (node.computed) topLevelRefs(node.key, names, out, calls);
        return;
      }
      break;
    case "PropertyDefinition":
      if (!node.static) return;
      break;
    case "CallExpression":
    case "NewExpression":
      if (node.callee.type === "Identifier" && names.has(node.callee.name)) calls.add(node.callee.name);
      break;
    case "Identifier":
      if (names.has(node.name)) out.add(node.name);
      return;
    case "MemberExpression":
      topLevelRefs(node.object, names, out, calls);
      if (node.computed) topLevelRefs(node.property, names, out, calls);
      return;
  }
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end") continue;
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) topLevelRefs(c, names, out, calls);
    else if (v && typeof v === "object" && typeof v.type === "string") topLevelRefs(v, names, out, calls);
  }
}

export function findCycleReads(dirs) {
  const files = dirs.flatMap((d) => listChunks(resolve(d)));
  const mods = new Map();
  for (const f of files) {
    const p = parse(f);
    if (p) mods.set(f, p);
  }
  // Static imports between chunks, and what each chunk declares at its top level.
  const edges = new Map();
  const declKind = new Map(); // file → Map(local name → "function" | "value")
  const exportsOf = new Map(); // file → Map(exported name → local name)
  for (const [f, { ast }] of mods) {
    const to = new Set();
    const kinds = new Map();
    const exp = new Map();
    for (const n of ast.body) {
      if ((n.type === "ImportDeclaration" || (n.type === "ExportNamedDeclaration" && n.source) || n.type === "ExportAllDeclaration") && n.source) {
        const target = resolve(dirname(f), n.source.value);
        if (mods.has(target)) to.add(target);
      }
      const decl = n.type === "ExportNamedDeclaration" ? n.declaration : n;
      if (decl?.type === "FunctionDeclaration" && decl.id) kinds.set(decl.id.name, "function");
      if (decl?.type === "ClassDeclaration" && decl.id) kinds.set(decl.id.name, "value");
      if (decl?.type === "VariableDeclaration") for (const d of decl.declarations) if (d.id.type === "Identifier") kinds.set(d.id.name, "value");
      if (n.type === "ExportNamedDeclaration" && !n.source) {
        for (const s of n.specifiers) exp.set(s.exported.name ?? s.exported.value, s.local.name);
        if (n.declaration?.id) exp.set(n.declaration.id.name, n.declaration.id.name);
        if (n.declaration?.type === "VariableDeclaration") for (const d of n.declaration.declarations) if (d.id.type === "Identifier") exp.set(d.id.name, d.id.name);
      }
    }
    edges.set(f, to);
    declKind.set(f, kinds);
    exportsOf.set(f, exp);
  }
  // Strongly connected components (Tarjan).
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const stack = [];
  const on = new Set();
  const groupOf = new Map();
  const groups = [];
  const strong = (v) => {
    idx.set(v, index);
    low.set(v, index);
    index += 1;
    stack.push(v);
    on.add(v);
    for (const w of edges.get(v) ?? []) {
      if (!idx.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const g = [];
      let w;
      do {
        w = stack.pop();
        on.delete(w);
        g.push(w);
      } while (w !== v);
      if (g.length > 1) {
        for (const m of g) groupOf.set(m, groups.length);
        groups.push(g);
      }
    }
  };
  for (const f of mods.keys()) if (!idx.has(f)) strong(f);

  // Inside each group: top-level reads of values imported from another chunk of the group.
  const findings = [];
  for (const [f, { src, ast }] of mods) {
    if (!groupOf.has(f)) continue;
    const g = groupOf.get(f);
    const risky = new Map(); // local name → "from file: exported"
    for (const n of ast.body) {
      if (n.type !== "ImportDeclaration") continue;
      const target = resolve(dirname(f), n.source.value);
      if (groupOf.get(target) !== g) continue;
      for (const s of n.specifiers) {
        if (s.type === "ImportNamespaceSpecifier") {
          risky.set(s.local.name, `${relative(process.cwd(), target)} (namespace)`);
          continue;
        }
        const exported = s.type === "ImportDefaultSpecifier" ? "default" : (s.imported.name ?? s.imported.value);
        const local = exportsOf.get(target)?.get(exported);
        const kind = local ? declKind.get(target)?.get(local) : undefined;
        risky.set(s.local.name, { from: relative(process.cwd(), target), exported, kind: kind ?? "value" });
      }
    }
    if (!risky.size) continue;
    for (const n of ast.body) {
      if (n.type === "ImportDeclaration" || n.type === "ExportAllDeclaration") continue;
      if (n.type === "ExportNamedDeclaration" && !n.declaration) continue;
      const node = n.type === "ExportNamedDeclaration" || n.type === "ExportDefaultDeclaration" ? n.declaration : n;
      const refs = new Set();
      const calls = new Set();
      topLevelRefs(node, new Set(risky.keys()), refs, calls);
      for (const name of refs) {
        const r = risky.get(name);
        const isFn = typeof r === "object" && r.kind === "function";
        // A function's name read at the top level is fine (its binding exists); calling it there is not.
        if (isFn && !calls.has(name)) continue;
        const line = src.slice(0, n.start).split("\n").length;
        const region = [...src.slice(0, n.start).matchAll(/\/\/#region (\S+)/g)].at(-1)?.[1]?.split("/").pop();
        findings.push({
          file: relative(process.cwd(), f),
          line,
          region: region ?? null,
          name,
          from: typeof r === "object" ? `${r.from}: ${r.exported}${isFn ? " (called)" : ""}` : r,
        });
      }
    }
  }
  return { groups: groups.map((g) => g.map((f) => relative(process.cwd(), f))), findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dirs = process.argv.slice(2);
  if (!dirs.length) {
    console.error("usage: node scripts/chunk-cycles.mjs <build dir>…");
    process.exit(2);
  }
  const { groups, findings } = findCycleReads(dirs);
  console.log(`chunk groups that import each other: ${groups.length}`);
  for (const f of findings) console.log(`  ${f.file}:${f.line}${f.region ? ` [${f.region}]` : ""} reads ${f.name} from ${f.from} while loading`);
  if (findings.length) {
    console.error(`CHUNK CYCLES: ${findings.length} top-level read(s) across a cycle; make them lazy (read inside a function).`);
    process.exit(1);
  }
  console.log("no top-level read across a chunk cycle");
}

export { pathToFileURL };
