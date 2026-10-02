import assert from "node:assert/strict";
import { test } from "node:test";
import { fanAngles } from "../src/lib/chart/fan-angles.ts";

const SEP = 8;

function wrap(e) {
  return ((e % 360) + 360) % 360;
}

function circularDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function assertAdjacentOrderPreserved(targets, display) {
  const n = targets.length;
  const idx = targets.map((_, i) => i).sort((a, b) => {
    const d = wrap(targets[a]) - wrap(targets[b]);
    return d !== 0 ? d : a - b;
  });
  let cut = 0;
  let best = -1;
  for (let k = 0; k < n; k += 1) {
    const a = wrap(targets[idx[k]]);
    const b = wrap(targets[idx[(k + 1) % n]]);
    const gap = (b - a + 360) % 360;
    if (gap > best + 1e-12 || (Math.abs(gap - best) <= 1e-12 && (k + 1) % n === 0)) {
      best = gap;
      cut = (k + 1) % n;
    }
  }
  const order = [...idx.slice(cut), ...idx.slice(0, cut)];
  for (let k = 1; k < n; k += 1) {
    const i = order[k - 1];
    const j = order[k];
    const td = circularDelta(targets[i], targets[j]);
    const dd = circularDelta(display[i], display[j]);
    if (Math.abs(td) < 0.05) continue;
    assert.ok(
      dd > 0,
      `adjacent order swapped: ${targets[i]}→${targets[j]} became ${display[i]}→${display[j]}`,
    );
  }
}

function assertMinSep(display, sep) {
  const n = display.length;
  if (n < 2) return;
  const sorted = display.map(wrap).sort((a, b) => a - b);
  for (let k = 0; k < n; k += 1) {
    const a = sorted[k];
    const b = sorted[(k + 1) % n];
    const gap = (b - a + 360) % 360;
    const g = gap === 0 && n > 1 ? 0 : gap;
    assert.ok(g + 1e-6 >= Math.min(sep, 360 / n - 0.45), `gap ${g} < sep at ${a}–${b}`);
  }
}

test("tight stellium keeps ecliptic order", () => {
  const t = [120.1, 120.4, 121.0, 122.2, 128.0];
  const d = fanAngles(t, SEP);
  assertAdjacentOrderPreserved(t, d);
  assertMinSep(d, SEP);
});

test("stellium wrapping 0° keeps order", () => {
  const t = [358.2, 359.6, 0.4, 1.8, 3.0];
  const d = fanAngles(t, SEP);
  assertAdjacentOrderPreserved(t, d);
  assertMinSep(d, SEP);
});

test("two separate stelliums do not swap across the sky", () => {
  const t = [10.0, 10.4, 11.1, 200.0, 200.5, 201.2];
  const d = fanAngles(t, SEP);
  assertAdjacentOrderPreserved(t, d);
  assertMinSep(d, SEP);
});

test("spread planets stay put", () => {
  const t = [0, 90, 180, 270];
  const d = fanAngles(t, SEP);
  for (let i = 0; i < t.length; i += 1) {
    assert.ok(Math.abs(circularDelta(t[i], d[i])) < 0.2);
  }
});

test("coincident planets fan without overlapping", () => {
  const t = [15, 15, 15];
  const d = fanAngles(t, SEP);
  assertMinSep(d, SEP);
});

test("leaders would not cross: display is monotonic along the cluster", () => {
  const t = [85.0, 85.3, 86.1, 87.4, 88.0, 89.2];
  const d = fanAngles(t, SEP);
  const pairs = t.map((e, i) => ({ t: e, d: d[i] })).sort((a, b) => a.t - b.t);
  for (let i = 1; i < pairs.length; i += 1) {
    assert.ok(
      circularDelta(pairs[i - 1].d, pairs[i].d) > 0,
      "display order broke along increasing ecliptic",
    );
  }
});

test("fanAnglesBy: one gap for all is fanAngles; narrow pairs sit closer than wide ones", async () => {
  const { fanAnglesBy } = await import("../src/lib/chart/fan-angles.ts");
  const crowd = [10, 10.5, 11, 11.2, 30, 359.5, 0.2];
  const a = fanAngles(crowd, 5);
  const b = fanAnglesBy(crowd, () => 5);
  for (let i = 0; i < crowd.length; i += 1) assert.ok(Math.abs(((a[i] - b[i] + 540) % 360) - 180) < 1e-9);
  // Three bodies at one place: the narrow pair (0, 1) 3° apart, the wide pair (1, 2) 6°.
  const out = fanAnglesBy([100, 100, 100], (i, j) => (i + j === 1 ? 3 : 6));
  const sorted = [...out].sort((x, y) => x - y);
  assert.ok(Math.abs(sorted[1] - sorted[0] - 3) < 1e-9 || Math.abs(sorted[1] - sorted[0] - 6) < 1e-9);
  assert.ok(Math.abs(sorted[2] - sorted[0] - 9) < 1e-9);
  // Centred on the crowd's place (least squares): the mean stays at 100.
  assert.ok(Math.abs(out.reduce((s, x) => s + x, 0) / 3 - 100) < 1e-9);
  // Apart already: nothing moves.
  assert.deepEqual(fanAnglesBy([10, 50, 90], () => 5), [10, 50, 90]);
});
