// Sampling allocation profile of render() and pick(), objects collected by GC included.
import inspector from "node:inspector/promises";
const session = new inspector.Session();
session.connect();
process.env.SCEN = process.env.SCEN || "detailed";
const mod = await import("./harness-lib.mjs");
const { v, cam, W } = await mod.setup(process.env.SCEN);
for (let i = 0; i < 50; i++) { cam.rz += 0.5; v.render(); }
for (const what of ["render", "pick"]) {
  await session.post("HeapProfiler.startSampling", { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  const N = 300;
  if (what === "render") for (let i = 0; i < N; i++) { cam.rz += 0.5; v.render(); }
  else for (let i = 0; i < N; i++) v.pick((i * 37) % W, (i * 53) % W);
  const { profile } = await session.post("HeapProfiler.stopSampling");
  const by = new Map();
  let total = 0;
  const walk = (n, stack) => {
    const f = n.callFrame;
    const name = `${f.functionName || "(anon)"}@${(f.url.split("/").pop() || "")}:${f.lineNumber + 1}`;
    const st = [...stack, name];
    const self = n.selfSize;
    if (self) {
      total += self;
      // attribute to the nearest frame inside wheel-view3d.js, plus the leaf
      const leaf = name;
      const owner = [...st].reverse().find((s) => s.includes("wheel-view3d.js")) || "?";
      const key = `${owner}  <-  ${leaf}`;
      by.set(key, (by.get(key) ?? 0) + self);
    }
    for (const c of n.children) walk(c, st);
  };
  walk(profile.head, []);
  console.log(`\n== ${what} (${process.env.SCEN}): ~${(total / N / 1024).toFixed(0)} KB sampled per call`);
  for (const [k, b] of [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`${(100 * b / total).toFixed(1).padStart(5)}%  ${k}`);
}
