import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compensation,
  fitScale,
  isFlat,
  lensMatrix,
  planeMatrix,
  planeTransformCss,
  projectPoint,
  stackTransformCss,
  unprojectPoint,
} from "../src/lib/depth/math.ts";
import { SPRINGS, aim, dampingRatio, makeSpring, settle, stepSpring } from "../src/lib/depth/spring.ts";

const W = 700;
const P = 1120;

function scene(over = {}) {
  return { width: W, height: W, perspective: P, originX: W / 2, originY: W / 2, rx: 0, ry: 0, rz: 0, ...over };
}

const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test("flat base plane maps every point onto itself", () => {
  const m = planeMatrix(scene(), { z: 0, scale: 1, originX: W / 2, originY: W / 2 });
  for (const [x, y] of [[0, 0], [350, 350], [700, 120], [33.3, 690]]) {
    const p = projectPoint(m, x, y);
    assert.ok(close(p.x, x) && close(p.y, y), `${x},${y} → ${p.x},${p.y}`);
  }
});

test("a compensated plane at any height lines up with the base at zero tilt, for any camera origin", () => {
  for (const origin of [[350, 350], [120, 500], [690, 10]]) {
    for (const z of [1, 24, 42, 140]) {
      const s = scene({ originX: origin[0], originY: origin[1] });
      const m = planeMatrix(s, { z, scale: compensation(P, z), originX: origin[0], originY: origin[1] });
      for (const [x, y] of [[0, 0], [350, 350], [700, 700], [512, 77]]) {
        const p = projectPoint(m, x, y);
        assert.ok(close(p.x, x, 1e-6) && close(p.y, y, 1e-6), `z=${z} ${x},${y} → ${p.x},${p.y}`);
      }
    }
  }
});

test("an uncompensated lifted plane grows around the camera origin by P/(P−z)", () => {
  const z = 42;
  const m = planeMatrix(scene({ originX: 200, originY: 300 }), { z, scale: 1, originX: 0, originY: 0 });
  const k = P / (P - z);
  const p = projectPoint(m, 300, 300);
  assert.ok(close(p.x, 200 + 100 * k, 1e-6));
  assert.ok(close(p.y, 300, 1e-6));
  const q = projectPoint(m, 200, 300);
  assert.ok(close(q.x, 200) && close(q.y, 300), "the point under the camera does not move");
});

test("tilt directions match CSS: rotateY(+) sends the right edge away, rotateX(+) the top edge", () => {
  const my = planeMatrix(scene({ ry: 10 }), { z: 0, scale: 1, originX: 0, originY: 0 });
  const right = projectPoint(my, 700, 350);
  const left = projectPoint(my, 0, 350);
  assert.ok(right.x - 350 < 350 - left.x, "right half is foreshortened more (further away)");
  const mx = planeMatrix(scene({ rx: 10 }), { z: 0, scale: 1, originX: 0, originY: 0 });
  const top = projectPoint(mx, 350, 0);
  const bottom = projectPoint(mx, 350, 700);
  assert.ok(350 - top.y < bottom.y - 350, "top half is further away");
});

test("unproject inverts project at every tilt, height and camera origin", () => {
  const cases = [
    { rx: 3, ry: -4, rz: 0 },
    { rx: 56, ry: 0, rz: 30 },
    { rx: 40, ry: 8, rz: -120 },
    { rx: -4, ry: 4, rz: 0 },
  ];
  for (const rot of cases) {
    for (const z of [0, 20, 60]) {
      for (const origin of [[350, 350], [260, 410]]) {
        const s = scene({ ...rot, originX: origin[0], originY: origin[1] });
        const plane = { z, scale: compensation(P, z), originX: origin[0], originY: origin[1] };
        const m = planeMatrix(s, plane);
        for (const [x, y] of [[350, 350], [100, 120], [640, 520], [20, 690]]) {
          const scr = projectPoint(m, x, y);
          const back = unprojectPoint(m, scr.x, scr.y);
          assert.ok(back, "invertible");
          assert.ok(close(back.x, x, 1e-6) && close(back.y, y, 1e-6), `${JSON.stringify(rot)} z=${z}: ${x},${y} → ${back.x},${back.y}`);
        }
      }
    }
  }
});

test("the 3D view's fit scale: 1 flat, smaller as it tips, and hit testing follows it", () => {
  assert.equal(fitScale(0), 1);
  assert.ok(fitScale(56) < 1 && fitScale(72) < fitScale(56) && fitScale(72) > 0.8, `${fitScale(56)} ${fitScale(72)}`);
  const s = scene({ rx: 72, rz: 180, scale: fitScale(72) });
  for (const z of [0, 35, 91]) {
    const m = planeMatrix(s, { z, scale: 1, originX: 0, originY: 0 });
    for (const [x, y] of [[350, 350], [120, 610], [640, 90]]) {
      const scr = projectPoint(m, x, y);
      const back = unprojectPoint(m, scr.x, scr.y);
      assert.ok(back && close(back.x, x, 1e-6) && close(back.y, y, 1e-6), `z=${z}: ${x},${y}`);
    }
  }
  // Tipped to the steepest angle and seen from the other side, the whole wheel
  // (and a margin) stays inside a stage it fills when flat.
  const m0 = planeMatrix(s, { z: 0, scale: 1, originX: 0, originY: 0 });
  let minX = Infinity;
  let maxX = -Infinity;
  for (let a = 0; a < 360; a += 2) {
    const p = projectPoint(m0, W / 2 + (W / 2) * Math.cos((a * Math.PI) / 180), W / 2 + (W / 2) * Math.sin((a * Math.PI) / 180));
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  assert.ok(minX > 10 && maxX < W - 10, `wheel spans ${minX.toFixed(1)}…${maxX.toFixed(1)} of ${W}`);
  assert.equal(stackTransformCss({ rx: 56, ry: 0, rz: 0, scale: 0.9 }), "scale3d(0.9000, 0.9000, 0.9000) rotateX(56.000deg) rotateY(0deg) rotateZ(0deg)");
});

test("the lens: the picture scaled around the origin and panned, and the pointer follows it", () => {
  const cam = { rx: 50, rz: -30, scale: fitScale(50) };
  const plain = scene(cam);
  for (const lens of [{ zoom: 1.6, panX: 0, panY: 0 }, { zoom: 2.5, panX: -180, panY: 95 }, { zoom: 3, panX: 400, panY: -400 }]) {
    const s = { ...plain, ...lens };
    for (const z of [0, 40]) {
      const m0 = planeMatrix(plain, { z, scale: 1, originX: 0, originY: 0 });
      const m = planeMatrix(s, { z, scale: 1, originX: 0, originY: 0 });
      for (const [x, y] of [[350, 350], [80, 600], [690, 40]]) {
        const a = projectPoint(m0, x, y);
        const b = projectPoint(m, x, y);
        // Exactly the unzoomed picture, scaled around the origin, then moved.
        assert.ok(close(b.x, W / 2 + lens.panX + (a.x - W / 2) * lens.zoom, 1e-6) && close(b.y, W / 2 + lens.panY + (a.y - W / 2) * lens.zoom, 1e-6));
        const back = unprojectPoint(m, b.x, b.y);
        assert.ok(back && close(back.x, x, 1e-6) && close(back.y, y, 1e-6), `unproject through the lens ${JSON.stringify(lens)}`);
      }
    }
  }
  // No lens: the identity.
  const id = lensMatrix({ originX: 120, originY: 80 });
  assert.deepEqual(id, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
});

test("CSS strings are stable and round small values to 0", () => {
  assert.equal(stackTransformCss({ rx: 0, ry: -0.0000001, rz: 12.3456 }), "rotateX(0deg) rotateY(0deg) rotateZ(12.346deg)");
  assert.equal(planeTransformCss({ z: 42, scale: 0.9625, originX: 0, originY: 0 }), "translate3d(0px, 0px, 42.000px) scale(0.96250)");
  assert.equal(isFlat({ rx: 0, ry: 0, rz: 0 }), true);
  assert.equal(isFlat({ rx: 0.5, ry: 0, rz: 0 }), false);
});

test("springs settle on target, lift overshoots a little, drop does not", () => {
  const lift = makeSpring(0, SPRINGS.lift);
  aim(lift, 1);
  let peak = 0;
  let t = 0;
  while (stepSpring(lift, 1 / 60) && t < 600) {
    peak = Math.max(peak, lift.x);
    t += 1;
  }
  assert.equal(lift.x, 1);
  assert.ok(peak > 1.02 && peak < 1.15, `lift peak ${peak}`);
  assert.ok(t < 90, `lift settles within 1.5 s (${t} frames)`);

  const drop = makeSpring(1, SPRINGS.drop);
  aim(drop, 0);
  let low = 1;
  t = 0;
  while (stepSpring(drop, 1 / 60) && t < 600) {
    low = Math.min(low, drop.x);
    t += 1;
  }
  assert.equal(drop.x, 0);
  assert.ok(low > -0.01, `drop does not go through the plate (${low})`);
  assert.ok(dampingRatio(SPRINGS.drop) >= 0.95);
  assert.ok(dampingRatio(SPRINGS.lift) < 1);
});

test("the same motion at 30, 60 and 120 fps", () => {
  const run = (fps) => {
    const s = makeSpring(0, SPRINGS.view);
    aim(s, 1);
    for (let i = 0; i < fps / 2; i += 1) stepSpring(s, 1 / fps);
    return s.x;
  };
  const a = run(30);
  const b = run(60);
  const c = run(120);
  assert.ok(Math.abs(a - b) < 0.01 && Math.abs(b - c) < 0.01, `${a} ${b} ${c}`);
});

test("held springs wait for their stagger, settle jumps", () => {
  const s = makeSpring(0, SPRINGS.lift);
  aim(s, 1, undefined, 1000, 50);
  stepSpring(s, 1 / 60, 1020);
  assert.equal(s.x, 0);
  stepSpring(s, 1 / 60, 1060);
  assert.ok(s.x > 0);
  settle(s, 0.5);
  assert.equal(s.x, 0.5);
  assert.equal(stepSpring(s, 1 / 60), false);
});
