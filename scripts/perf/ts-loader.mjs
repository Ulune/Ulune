// Node loader for the performance scripts: "@/…" → src/, .ts/.tsx without
// extensions, TSX through the repo's TypeScript (react-jsx), JSON as modules,
// CSS as nothing. Read-only: nothing in the repo is written.
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(ROOT, "src");
const require = createRequire(join(ROOT, "package.json"));
const ts = require("typescript");

function tryFile(base) {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const [bare, query] = specifier.split("?");
  const suffix = query ? `?${query}` : "";
  if (bare.startsWith("@/")) {
    const p = tryFile(join(SRC, bare.slice(2)));
    if (p) return { url: pathToFileURL(p).href + suffix, shortCircuit: true };
  }
  if ((bare.startsWith("./") || bare.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const p = tryFile(join(dirname(fileURLToPath(context.parentURL)), bare));
    if (p) return { url: pathToFileURL(p).href + suffix, shortCircuit: true };
  }
  if (bare.startsWith(".") || bare.startsWith("/")) return nextResolve(specifier, context);
  try {
    return await nextResolve(specifier, { ...context, parentURL: pathToFileURL(join(ROOT, "package.json")).href });
  } catch {
    return nextResolve(specifier, context);
  }
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith("file:")) return nextLoad(url, context);
  const path = fileURLToPath(url.split("?")[0]);
  if (url.includes("?url")) return { format: "module", source: `export default ${JSON.stringify(path)};`, shortCircuit: true };
  if (path.endsWith(".css")) return { format: "module", source: "export default {};", shortCircuit: true };
  if (path.endsWith(".json")) return { format: "module", source: `export default ${readFileSync(path, "utf8")};`, shortCircuit: true };
  if (path.endsWith(".tsx") || (path.endsWith(".ts") && path.startsWith(SRC))) {
    const out = ts.transpileModule(readFileSync(path, "utf8"), {
      fileName: path,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, isolatedModules: true },
    });
    const code = out.outputText.replaceAll(
      "import.meta.env",
      '({ VITE_AUTH_ENABLED: "true", DEV: false, PROD: true, SSR: true, MODE: "production", BASE_URL: "/" })',
    );
    return { format: "module", source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
