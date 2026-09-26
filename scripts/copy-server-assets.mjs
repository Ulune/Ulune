/**
 * After `vite build`: the files the chart engine reads at run time, put next to
 * the Vercel function. Nitro bundles the JavaScript but leaves data behind, and
 * on Vercel the function's folder is all there is (process.cwd() is /var/task):
 * - the Swiss Ephemeris engine, swisseph.wasm (calculate.server.ts),
 * - the ephemeris files, ephe/*.se1 and Swiss's star catalogue sefstars.txt
 *   (calculate.server.ts),
 * - geo-tz's time zone map, geo-tz/timezones.geojson.geo.dat
 *   (birth-time.server.ts).
 * The build fails if any of them is missing: without them every cast fails on
 * the deployed site, or its time zones fall back to a coarse lookup, and a
 * local preview would not show it (it finds the files in the repository).
 * `npm run check:deploy` serves the result the way Vercel does and casts a chart.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** The Vercel function Nitro writes (preset "vercel"). */
export const FUNCTION_DIR = join(ROOT, ".vercel", "output", "functions", "__server.func");
/** Files the engine cannot run without; a Git LFS pointer is a few hundred bytes. */
export const REQUIRED = ["swisseph.wasm", "ephe/sepl_18.se1", "ephe/semo_18.se1", "ephe/sefstars.txt", "geo-tz/timezones.geojson.geo.dat"];
const REAL_FILE = 10_000;

/** What goes where: [from, to inside the function's folder]. */
export function serverAssets(root = ROOT) {
  const ephe = join(root, "ephe");
  const epheFiles = existsSync(ephe)
    ? readdirSync(ephe).filter((name) => name.endsWith(".se1") || name === "sefstars.txt")
    : [];
  return [
    [join(root, "node_modules/sweph-wasm/dist/wasm/swisseph.wasm"), "swisseph.wasm"],
    ...epheFiles.map((name) => [join(ephe, name), `ephe/${name}`]),
    [join(root, "node_modules/geo-tz/data/timezones.geojson.geo.dat"), "geo-tz/timezones.geojson.geo.dat"],
  ];
}

/** Copy them in; returns what is missing or too small to be real (empty when all is well). */
export function copyServerAssets(funcDir = FUNCTION_DIR, root = ROOT) {
  let bytes = 0;
  for (const [from, to] of serverAssets(root)) {
    if (!existsSync(from)) continue;
    const dest = join(funcDir, to);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(from, dest);
    bytes += statSync(dest).size;
  }
  const missing = REQUIRED.filter((to) => {
    const dest = join(funcDir, to);
    return !existsSync(dest) || statSync(dest).size < REAL_FILE;
  });
  return { missing, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!existsSync(FUNCTION_DIR)) {
    console.error("[server-assets] no .vercel/output/functions/__server.func: run `vite build` first");
    process.exit(1);
  }
  const { missing, bytes } = copyServerAssets();
  if (missing.length) {
    console.error(`[server-assets] missing next to the server function: ${missing.join(", ")}`);
    console.error("[server-assets] every cast would fail on the deployed site");
    process.exit(1);
  }
  console.log(`[server-assets] the engine, the ephemeris and the time zone map are next to the server function (${(bytes / 1e6).toFixed(1)} MB)`);
}
