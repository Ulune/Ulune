/*
 * Writes src/lib/share/zones.ts: the names of every time zone Ulune's tz
 * database knows (its zones and their links, src/lib/chart/tzdb-data.json),
 * which a share link's zone and time-zone choice are checked against on the
 * reader's device (share plan, feature 1). Run it after scripts/build-tzdb.py
 * makes a new database: scripts/share-link.test.mjs fails until the two agree.
 *   node scripts/share-zones.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = JSON.parse(readFileSync(join(ROOT, "src/lib/chart/tzdb-data.json"), "utf8"));

/** The names grouped by their area ("Europe:Paris,Oslo;…"), the shortest form that stays readable. */
export function zoneTable(data) {
  const names = [...new Set([...Object.keys(data.zones), ...Object.keys(data.links)])].sort();
  const groups = new Map();
  for (const name of names) {
    const i = name.indexOf("/");
    const area = i < 0 ? "" : name.slice(0, i);
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push(i < 0 ? name : name.slice(i + 1));
  }
  return { version: data.version, table: [...groups].map(([area, list]) => `${area}:${list.join(",")}`).join(";") };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { version, table } = zoneTable(db);
  const source = `/*
 * Every time zone name Ulune's tz database knows (${version}: its zones and
 * their links), grouped by area: "Europe:Paris,Oslo;…" names Europe/Paris and
 * Europe/Oslo. A share link's zone and time-zone choice are checked against it
 * on the reader's device, as the server would read them (share plan,
 * feature 1). Written by scripts/share-zones.mjs; do not edit by hand.
 */
export const ZONE_DB = "${version}";

export const ZONE_TABLE =
  "${table}";

let names: Set<string> | null = null;

/** Whether Ulune's tz database knows this zone name (a zone or one of its links). */
export function isKnownZone(name: string): boolean {
  if (!names) {
    names = new Set();
    for (const group of ZONE_TABLE.split(";")) {
      const at = group.indexOf(":");
      const area = group.slice(0, at);
      for (const rest of group.slice(at + 1).split(",")) names.add(area ? \`\${area}/\${rest}\` : rest);
    }
  }
  return names.has(name);
}
`;
  writeFileSync(join(ROOT, "src/lib/share/zones.ts"), source);
  console.log(`src/lib/share/zones.ts: ${table.length} characters (tz ${version})`);
}
