// Drive the real WheelView3D.render()/pick() against a counting mock GL and print one
// line of JSON per scenario: GL calls, draws, JS time per frame (V8, indicative only)
// and bytes allocated per frame. Build first: node scripts/perf/gl3d/build.mjs.
// The scenarios and the measuring live in harness-lib.mjs (shared with alloc-prof and entry-draws).
import { scenario, SCENARIOS } from "./harness-lib.mjs";

const NAMES = {
  default: "natal default (10 planets + 4 angles, majors, orb 5)",
  detailed: "natal detailed (10+4, all aspects, orb 8)",
  every: "natal every body (24+4, all aspects, orb 8)",
  bi: "bi-wheel transits (10+10+4, majors+minors, orb 5)",
};
for (const key of ["default", "detailed", "every", "bi"]) {
  await scenario({ ...SCENARIOS[key], name: NAMES[key] });
}
