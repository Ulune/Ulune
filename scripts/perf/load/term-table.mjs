// The built files that hold the Chinese term and new-moon table (src/lib/chinese/time-table.ts,
// 1799–2201), found by pieces of its data rather than by a chunk's name, which the bundler may
// change: the budgets' row for the table (languages plan, part 30), and languages.mjs, which counts
// it apart from each language's own files. The Chinese words' book likewise (below).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../paths.mjs";

const ASSETS = join(ROOT, ".vercel/output/static/assets");

/** The table's files in the build, as paths from the site's root (`/assets/terms-….js`). */
export function termTableFiles() {
  const src = readFileSync(join(ROOT, "src/lib/chinese/time-table.ts"), "utf8");
  const pieces = ["TERM_REMAINDERS", "MOON_REMAINDERS"].map((name) => {
    const m = new RegExp(`export const ${name} =\\s*\`\\s*([A-Za-z0-9+/=]{40})`).exec(src);
    if (!m) throw new Error(`src/lib/chinese/time-table.ts: no ${name}`);
    return m[1];
  });
  if (!existsSync(ASSETS)) throw new Error("no build (npm run build first)");
  const files = readdirSync(ASSETS).filter((f) => f.endsWith(".js") && pieces.some((p) => readFileSync(join(ASSETS, f), "utf8").includes(p)));
  if (!files.length) throw new Error("no built file holds the term table");
  return files.map((f) => `/assets/${f}`);
}

/**
 * The built files that hold the Chinese traditions' interface words (src/lib/i18n/catalog/chinese.ts,
 * read through src/lib/chinese/words.ts), found by one of its keys: shared by the three Chinese
 * languages and fetched by the first Chinese page a reader opens, since "/" no longer fetches it at
 * idle (the bug-fix round, item 5), so languages.mjs counts it apart, as it does the term table.
 */
export function chineseWordsFiles() {
  if (!existsSync(ASSETS)) throw new Error("no build (npm run build first)");
  const files = readdirSync(ASSETS).filter((f) => f.endsWith(".js") && readFileSync(join(ASSETS, f), "utf8").includes("cnSettingsLead:"));
  if (!files.length) throw new Error("no built file holds the Chinese words");
  return files.map((f) => `/assets/${f}`);
}

