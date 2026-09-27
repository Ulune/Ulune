import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let rel = specifier.slice(2);
    if (!/\.(js|mjs|cjs|json|wasm|ts)$/.test(rel)) rel += ".ts";
    return nextResolve(pathToFileURL(join(SRC, rel)).href, context);
  }
  if (
    specifier.startsWith(".") &&
    !/\.(js|mjs|cjs|json|wasm|ts)$/.test(specifier) &&
    !specifier.includes("?")
  ) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      /* a folder, then */
    }
    try {
      return await nextResolve(`${specifier}/index.ts`, context);
    } catch {
      /* fall through */
    }
  }
  return nextResolve(specifier, context);
}
