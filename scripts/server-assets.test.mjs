// The deployed server finds its data files (scripts/copy-server-assets.mjs):
// the build copies them, each one is there and real, and each lands where the
// server looks for it. `npm run check:deploy` tries a built copy for real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { REQUIRED, ROOT, serverAssets } from "./copy-server-assets.mjs";

test("the production build copies the server's data files", () => {
  const { scripts } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.equal(scripts.build, "vite build && node scripts/copy-server-assets.mjs");
});

test("every file the server needs is there to copy, and real", () => {
  const assets = serverAssets();
  for (const need of REQUIRED) {
    const pair = assets.find(([, to]) => to === need);
    assert.ok(pair, `${need} is not copied`);
    assert.ok(existsSync(pair[0]), `${pair[0]} is missing`);
    // A Git LFS pointer is a few hundred bytes.
    assert.ok(statSync(pair[0]).size > 10_000, `${pair[0]} is not a real file`);
  }
});

test("they land where the server looks for them", () => {
  const calc = readFileSync(join(ROOT, "src/lib/chart/calculate.server.ts"), "utf8");
  const birth = readFileSync(join(ROOT, "src/lib/chart/birth-time.server.ts"), "utf8");
  assert.match(calc, /join\(process\.cwd\(\), "swisseph\.wasm"\)/);
  assert.match(calc, /join\(process\.cwd\(\), "ephe"\)/);
  assert.match(birth, /join\(process\.cwd\(\), "geo-tz"\)/);
  assert.match(birth, /const GEO_DATA = "timezones\.geojson\.geo\.dat"/);
});
