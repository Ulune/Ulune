// The server path's answers for requests no route serves (the Timing table), for
// scripts/e2e/engine-worker.mjs: reads a JSON list of TimingRequests on stdin and prints the
// answers of src/lib/chart/calculate.server.ts (as the timing golden suite calls it).
// Run with: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/e2e/_engine-reference.mjs
import { calculateTiming } from "../../src/lib/chart/calculate.server.ts";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const out = [];
for (const d of JSON.parse(input)) {
  out.push(
    await calculateTiming({
      from: new Date(d.from),
      to: new Date(d.to),
      latitude: d.latitude,
      longitude: d.longitude,
      natalBodies: d.natalBodies.map((r) => ({ id: r.id, name: r.name, ecliptic: r.ecliptic })),
      houseSystem: d.houseSystem,
    }),
  );
}
process.stdout.write(JSON.stringify(out));
