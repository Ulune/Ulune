import SwissEPH from "sweph-wasm";
import createModule from "sweph-wasm/wasm/swisseph";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fromZonedTime } from "date-fns-tz";
import tzlookup from "tz-lookup";

const wasmBinary = readFileSync(
  join(process.cwd(), "node_modules/sweph-wasm/dist/wasm/swisseph.wasm"),
);
const wasm = await createModule({ wasmBinary });
const swe = new SwissEPH(wasm);
const FS = wasm.FS;
try {
  FS.mkdir("/ephe");
} catch {
  /* exists */
}
for (const name of readdirSync("/workspace/ephe")) {
  const buf = readFileSync(join("/workspace/ephe", name));
  FS.writeFile("/ephe/" + name, buf);
  console.log("wrote", name, buf.length);
}
const pathPtr = wasm._malloc(16);
wasm.stringToUTF8("/ephe", pathPtr, 16);
wasm._swe_set_ephe_path(pathPtr);
wasm._free(pathPtr);

const tz = tzlookup(59.9139, 10.7522);
const utc = fromZonedTime("1987-11-03T23:10:00", tz);
console.log("tz", tz, utc.toISOString());
const [, ut] = swe.swe_utc_to_jd(
  utc.getUTCFullYear(),
  utc.getUTCMonth() + 1,
  utc.getUTCDate(),
  utc.getUTCHours(),
  utc.getUTCMinutes(),
  utc.getUTCSeconds(),
  swe.SE_GREG_CAL,
);
const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
function fmt(lon) {
  const n = ((Number(lon) % 360) + 360) % 360;
  const signs = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];
  const s = Math.floor(n / 30);
  const d = n % 30;
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}' ${signs[s]}`;
}
const bodies = {
  sun: 0,
  moon: 1,
  mercury: 2,
  venus: 3,
  mars: 4,
  jupiter: 5,
  saturn: 6,
  uranus: 7,
  neptune: 8,
  pluto: 9,
  trueNode: 11,
  trueLilith: 13,
  chiron: 15,
  ceres: 17,
  juno: 19,
  vesta: 20,
  eris: 10000 + 136199,
  sedna: 10000 + 90377,
};
for (const [name, id] of Object.entries(bodies)) {
  try {
    const pos = swe.swe_calc_ut(ut, id, flag);
    console.log(name.padEnd(12), fmt(pos[0]), "spd", Number(pos[3]).toFixed(4));
  } catch (e) {
    console.log(name.padEnd(12), "ERR", e instanceof Error ? e.message : e);
  }
}
const houses = swe.swe_houses(ut, 59.9139, 10.7522, "P");
console.log("cusps0-2", houses.cusps[0], houses.cusps[1], houses.cusps[2]);
console.log("ASC", fmt(houses.ascmc[0]));
console.log("MC ", fmt(houses.ascmc[1]));
console.log("Vx ", fmt(houses.ascmc[3]));
