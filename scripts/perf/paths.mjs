// Where things are, for every performance script (run them from anywhere).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PERF = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(PERF, "../..");
export const SRC = join(ROOT, "src");
export const OUT = join(PERF, ".out");
/** A Chromium to drive; Playwright's own when unset. */
export const CHROME = process.env.CHROME || undefined;
