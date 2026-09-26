import assert from "node:assert/strict";
import { test } from "node:test";
import { fitScale, planeMatrix, projectPoint } from "../src/lib/depth/math.ts";
import { cameraAxes, chartToScene, clipMatrix, frameMatrix, pot, projectChart, toGL } from "../src/lib/depth/gl-math.ts";

const W = 700;
const P = 1120;
const scene = (over = {}) => ({ width: W, height: W, perspective: P, originX: W / 2, originY: W / 2, rx: 0, ry: 0, rz: 0, ...over });
const frame = { k: 0.9, ox: 7, oy: 7, vbx: -21, vby: -21 };
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const CAMS = [
  { rx: 0, rz: 0 },
  { rx: 56, rz: 0, scale: fitScale(56) },
  { rx: 40, rz: -73, scale: fitScale(40) },
  { rx: 72, rz: 190, scale: fitScale(72) },
  // Zoomed in with the lens, and moved.
  { rx: 50, rz: 20, scale: fitScale(50), zoom: 2.2, panX: -140, panY: 60 },
];
const PTS = [
  [360, 360, 0],
  [22, 700, 0],
  [640, 90, 12],
  [360, 120, 60],
  [501, 488, 95],
];

test("WebGL lands every chart point where the CSS camera draws it", () => {
  for (const cam of CAMS) {
    const st = scene(cam);
    const m = chartToScene(st, frame);
    for (const [x, y, z] of PTS) {
      // CSS: a plane at height z·k (stack px), the chart point in stack px.
      const css = planeMatrix(st, { z: z * frame.k, scale: 1, originX: 0, originY: 0 });
      const sx = frame.ox + (x - frame.vbx) * frame.k;
      const sy = frame.oy + (y - frame.vby) * frame.k;
      const a = projectPoint(css, sx, sy);
      const b = projectChart(m, x, y, z);
      assert.ok(close(a.x, b.x, 1e-6) && close(a.y, b.y, 1e-6), `${JSON.stringify(cam)} ${x},${y},${z}: css ${a.x},${a.y} gl ${b.x},${b.y}`);
    }
  }
});

test("clip space: the same screen pixel, and nearer points get smaller depths", () => {
  const vp = { x: 0, y: 0, w: W, h: W };
  for (const cam of CAMS.slice(1)) {
    const st = scene(cam);
    const c = clipMatrix(st, frame, vp, 0.6 * W, -W);
    const m = chartToScene(st, frame);
    const ndc = (x, y, z) => {
      const X = c[0] * x + c[1] * y + c[2] * z + c[3];
      const Y = c[4] * x + c[5] * y + c[6] * z + c[7];
      const Z = c[8] * x + c[9] * y + c[10] * z + c[11];
      const Wc = c[12] * x + c[13] * y + c[14] * z + c[15];
      return { x: X / Wc, y: Y / Wc, z: Z / Wc };
    };
    for (const [x, y, z] of PTS) {
      const s = projectChart(m, x, y, z);
      const n = ndc(x, y, z);
      assert.ok(close((n.x + 1) * (W / 2), s.x, 1e-6) && close((1 - n.y) * (W / 2), s.y, 1e-6), `pixel ${x},${y},${z}`);
      assert.ok(n.z > -1 && n.z < 1, `depth in range ${n.z}`);
    }
    // Along the view axis toward the viewer the depth shrinks.
    const { toward } = cameraAxes(st);
    const d0 = ndc(360, 360, 0).z;
    const d1 = ndc(360 + toward[0] * 50, 360 + toward[1] * 50, toward[2] * 50).z;
    assert.ok(d1 < d0, `nearer should be smaller: ${d1} vs ${d0}`);
  }
});

test("a canvas wider than the scene (margins) still shows each point on its pixel", () => {
  const st = scene({ rx: 50, rz: 20, scale: fitScale(50) });
  const vp = { x: -40, y: -30, w: W + 80, h: W + 60 };
  const c = clipMatrix(st, frame, vp, 0.6 * W, -W);
  const m = chartToScene(st, frame);
  for (const [x, y, z] of PTS) {
    const Wc = c[12] * x + c[13] * y + c[14] * z + c[15];
    const nx = (c[0] * x + c[1] * y + c[2] * z + c[3]) / Wc;
    const ny = (c[4] * x + c[5] * y + c[6] * z + c[7]) / Wc;
    const s = projectChart(m, x, y, z);
    assert.ok(close(vp.x + ((nx + 1) / 2) * vp.w, s.x, 1e-6) && close(vp.y + ((1 - ny) / 2) * vp.h, s.y, 1e-6));
  }
});

test("camera axes: right is right on screen, up is up, toward comes closer", () => {
  for (const cam of CAMS.slice(1)) {
    const st = scene(cam);
    const m = chartToScene(st, frame);
    const { right, up, toward } = cameraAxes(st);
    const o = projectChart(m, 360, 360, 30);
    const r = projectChart(m, 360 + right[0] * 10, 360 + right[1] * 10, 30 + right[2] * 10);
    const u = projectChart(m, 360 + up[0] * 10, 360 + up[1] * 10, 30 + up[2] * 10);
    const t = projectChart(m, 360 + toward[0] * 10, 360 + toward[1] * 10, 30 + toward[2] * 10);
    assert.ok(r.x > o.x + 1 && Math.abs(r.y - o.y) < Math.abs(r.x - o.x) * 0.2, `right ${JSON.stringify([o, r])}`);
    assert.ok(u.y < o.y - 1 && Math.abs(u.x - o.x) < Math.abs(u.y - o.y) * 0.2, `up ${JSON.stringify([o, u])}`);
    assert.ok(t.w < o.w, "toward the viewer: W shrinks");
  }
});

test("toGL transposes; pot rounds up to powers of two", () => {
  const m = frameMatrix(frame);
  const g = toGL(m);
  assert.ok(close(g[12], m[3], 1e-4) && close(g[3], m[12], 1e-4) && close(g[1], m[4], 1e-6));
  assert.deepEqual([pot(1), pot(2), pot(3), pot(1500), pot(2048), pot(2049)], [1, 2, 4, 2048, 2048, 4096]);
});
