// Draw calls across the entry animation (t = 0 → 1): dashes are finest at the start.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { OUT } from "../paths.mjs";
const S = (f) => pathToFileURL(join(OUT, "gl3d/src", f)).href;
const { setup } = await import("./harness-lib.mjs");
const { settle } = await import(S("spring.js"));
for (const key of ["default", "detailed", "bi", "every"]) {
  const { v, cam } = await setup(key);
  const row = [];
  for (const t of [0.05, 0.15, 0.3, 0.5, 0.7, 1]) {
    settle(v.t, t);
    cam.rx = 50 * t; cam.rz += 0.1;
    v.render();
    row.push(`t=${t}:${v.draws}`);
  }
  console.log(key.padEnd(9), row.join("  "));
}
