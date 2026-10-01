// The chart's colours on a Display P3 screen (src/lib/color-gamut.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { inGamut, maxChroma, widen } from "../src/lib/color-gamut.ts";
import { DEFAULT_LOOK, TRADITIONAL_PLANET_INK, swatchCss } from "../src/lib/look.ts";

const palette = [
  ...Object.values(DEFAULT_LOOK.elements),
  ...Object.values(DEFAULT_LOOK.aspects),
  ...Object.values(DEFAULT_LOOK.outerAspects),
  ...Object.values(TRADITIONAL_PLANET_INK),
];

test("sRGB sits inside P3, and the gamut edges are where they should be", () => {
  assert.ok(maxChroma(0.628, 29.2, "srgb") > 0.25 && maxChroma(0.628, 29.2, "srgb") < 0.26); // sRGB red
  for (const c of palette) assert.ok(maxChroma(c.l, c.h, "p3") >= maxChroma(c.l, c.h, "srgb"));
});

test("widened, a colour keeps its lightness and hue, gains chroma, and stays on the screen", () => {
  for (const c of palette) {
    const w = widen(c);
    assert.equal(w.l, c.l);
    assert.equal(w.h, c.h);
    assert.ok(w.c >= c.c, `${JSON.stringify(c)} lost chroma`);
    assert.ok(inGamut(w, "p3"), `${JSON.stringify(w)} outside P3`);
  }
  // The element colours take most of the room: green, the most, grows by a third.
  const earth = widen(DEFAULT_LOOK.elements.earth);
  assert.ok(earth.c > DEFAULT_LOOK.elements.earth.c * 1.25);
});

test("a grey stays a grey, and an sRGB screen gets the colour as chosen", () => {
  const grey = widen({ l: 0.6, c: 0, h: 80 });
  assert.equal(grey.c, 0);
  const moon = widen(TRADITIONAL_PLANET_INK.moon);
  assert.ok(moon.c < 0.03);
  assert.equal(swatchCss(DEFAULT_LOOK.elements.fire, false), "oklch(0.580 0.200 22.0)");
  assert.notEqual(swatchCss(DEFAULT_LOOK.elements.fire, true), "oklch(0.580 0.200 22.0)");
});
