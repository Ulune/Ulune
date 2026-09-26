// The returning user's saved chart (a library row as localStorage holds it).
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/load/make-row.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OUT } from "../paths.mjs";

const { calculateNatal } = await import("../../../src/lib/chart/calculate.server.ts");
const input = { name: "Paris fixture", latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris, France", houseSystem: "placidus", date: "1990-06-15", time: "14:30" };
const chart = await calculateNatal(input);
const row = { id: "11111111-2222-4333-8444-555555555555", input: { ...input, timeUnknown: false }, chart, dossier: { byId: {}, order: [] }, grok: null, timeUnknown: false, savedAt: Date.now() };
mkdirSync(join(OUT, "load"), { recursive: true });
writeFileSync(join(OUT, "load/saved-row.json"), JSON.stringify(row));
console.log("saved-row.json", JSON.stringify(row).length, "bytes");
process.exit(0);
