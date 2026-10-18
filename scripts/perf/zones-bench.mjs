// What the place search's zones cost Ulune's server (on-device plan, W1-9): each place found
// comes with the zone of the server's map (geo-tz), so a chart calculated on the device agrees
// with the server's. Run in a process of its own, as a server function starts cold: the map's
// index loaded and the regions of eight places read (a search's list, scattered over four
// continents as "Paris" finds them), then the same places again (geo-tz keeps the regions it read).
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/zones-bench.mjs
const PLACES = [
  [48.8534, 2.3488, "Europe/Paris"],
  [33.6609, -95.5555, "America/Chicago"],
  [36.302, -88.3267, "America/Chicago"],
  [45.6397, 5.7374, "Europe/Paris"],
  [43.3666, -80.9497, "America/Toronto"],
  [38.2098, -84.2530, "America/New_York"],
  [-33.4489, -70.6693, "America/Santiago"],
  [35.6944, 51.4215, "Asia/Tehran"],
].map(([latitude, longitude, timezone]) => ({ latitude, longitude, timezone }));

const t0 = performance.now();
const { zonedPlaces } = await import("../../src/lib/chart/birth-time.server.ts");
await zonedPlaces(PLACES);
const cold = performance.now() - t0;
const warm = [];
for (let i = 0; i < 5; i += 1) {
  const t = performance.now();
  await zonedPlaces(PLACES);
  warm.push(performance.now() - t);
}
warm.sort((a, b) => a - b);
console.log(JSON.stringify({ cold, warm: warm[2] }));
