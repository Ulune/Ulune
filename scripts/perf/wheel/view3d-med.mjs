// Medians of N runs of view3d.mjs (each run a fresh browser).
// node scripts/perf/wheel/view3d-med.mjs natal|transit classic|advanced|all [enter,…] [runs]
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const [mode = "natal", preset = "classic", which = "enter,reenter,orbit,sweep,pin", runs = "3"] = process.argv.slice(2);
const script = fileURLToPath(new URL("./view3d.mjs", import.meta.url));
const rows = [];
for (let i = 0; i < Number(runs); i += 1) {
  const txt = execFileSync(process.execPath, [script, mode, preset, which], { encoding: "utf8", env: process.env, maxBuffer: 1 << 24 });
  rows.push(JSON.parse(txt.trim().split("\n").pop()));
}
const med = (xs) => {
  const s = xs.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const out = { mode, preset, runs: rows.length, dpr: rows[0]?.dpr };
for (const key of which.split(",")) {
  const parts = rows.map((r) => r[key]).filter(Boolean);
  if (!parts.length) continue;
  const m = {};
  for (const [k, v] of Object.entries(parts[0])) {
    if (typeof v === "number") m[k] = med(parts.map((p) => p[k]));
    else if (k === "gl" && v) m.gl = { perFrame: v.perFrame, calls: med(parts.map((p) => p.gl?.calls)), draws: med(parts.map((p) => p.gl?.draws)) };
  }
  out[key] = m;
}
const errs = rows.flatMap((r) => r.errors ?? []);
if (errs.length) out.errors = errs.slice(0, 3);
console.log(JSON.stringify(out));
