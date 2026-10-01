import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyHueChip,
  ASPECT_KEYS,
  compartmentInk,
  DEFAULT_LOOK,
  DEFAULT_LOOK_DAY,
  ELEMENT_KEYS,
  LEGACY_FACTORY_NIGHT,
  lookHasLegacyFactoryTokens,
  rawLookHasLegacyFactory,
  factoryDayFor,
  HUE_CHIPS,
  nearestHueChip,
  oklchCss,
  parseLook,
  planetPaint,
  TRADITIONAL_PLANET_INK,
  TRADITIONAL_PLANET_INK_DAY,
  resolveSwatch,
  sameOklch,
} from "../src/lib/look.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");

function parseOklch(raw) {
  const m = String(raw).match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i);
  assert.ok(m, `not oklch: ${raw}`);
  return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) };
}

function near(a, b, eps = 0.005) {
  return Math.abs(a - b) <= eps;
}

function blockVars(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `missing ${startMarker}`);
  const slice = source.slice(start, endMarker ? source.indexOf(endMarker, start) : undefined);
  return slice;
}

test("factory token in light paints DEFAULT_LOOK_DAY, not dayRecipe", () => {
  for (const key of ELEMENT_KEYS) {
    const painted = resolveSwatch(
      DEFAULT_LOOK.elements[key],
      "light",
      factoryDayFor(DEFAULT_LOOK.elements[key], DEFAULT_LOOK.elements, DEFAULT_LOOK_DAY.elements, key),
    );
    assert.ok(sameOklch(painted, DEFAULT_LOOK_DAY.elements[key]), `element ${key}`);
  }
  for (const key of ASPECT_KEYS) {
    const painted = resolveSwatch(
      DEFAULT_LOOK.aspects[key],
      "light",
      factoryDayFor(DEFAULT_LOOK.aspects[key], DEFAULT_LOOK.aspects, DEFAULT_LOOK_DAY.aspects, key),
    );
    assert.ok(sameOklch(painted, DEFAULT_LOOK_DAY.aspects[key]), `aspect ${key}`);
  }
  for (const key of ASPECT_KEYS) {
    const painted = resolveSwatch(
      DEFAULT_LOOK.outerAspects[key],
      "light",
      factoryDayFor(
        DEFAULT_LOOK.outerAspects[key],
        DEFAULT_LOOK.outerAspects,
        DEFAULT_LOOK_DAY.outerAspects,
        key,
      ),
    );
    assert.ok(sameOklch(painted, DEFAULT_LOOK_DAY.outerAspects[key]), `outer ${key}`);
  }
  assert.equal(DEFAULT_LOOK_DAY.aspects.conj.l, 0.78);
  assert.equal(DEFAULT_LOOK_DAY.outerAspects.conj.l, 0.76);
});

test("applyHueChip(nearest) on factory natal tokens stays factory night", () => {
  const rows = [
    ["fire", DEFAULT_LOOK.elements.fire],
    ["earth", DEFAULT_LOOK.elements.earth],
    ["water", DEFAULT_LOOK.elements.water],
    ["conj", DEFAULT_LOOK.aspects.conj],
    ["hard", DEFAULT_LOOK.aspects.hard],
    ["soft", DEFAULT_LOOK.aspects.soft],
    ["minor", DEFAULT_LOOK.aspects.minor],
    ["outer-hard", DEFAULT_LOOK.outerAspects.hard],
    ["outer-soft", DEFAULT_LOOK.outerAspects.soft],
    ["outer-minor", DEFAULT_LOOK.outerAspects.minor],
  ];
  for (const [name, color] of rows) {
    const chip = HUE_CHIPS.find((c) => c.id === nearestHueChip(color));
    assert.ok(chip, name);
    const next = applyHueChip(color, chip);
    assert.ok(sameOklch(next, color), `${name} chip ${chip.id}`);
  }
});

test("applyHueChip(gold) on factory outer-conj is a customization", () => {
  const gold = HUE_CHIPS.find((c) => c.id === "gold");
  const next = applyHueChip(DEFAULT_LOOK.outerAspects.conj, gold);
  assert.equal(sameOklch(next, DEFAULT_LOOK.outerAspects.conj), false);
  const painted = resolveSwatch(next, "light", null);
  assert.ok(painted.h >= 80 && painted.h <= 110, `hue ${painted.h}`);
  assert.ok(painted.l >= 0.6, `recipe L ${painted.l} should stay light`);
});

test("legacy factory silver air upgrades to V1 gold; custom mixes stay", () => {
  const legacy = parseLook({
    elements: LEGACY_FACTORY_NIGHT.elements,
    aspects: LEGACY_FACTORY_NIGHT.aspects,
    pairing: "classic",
  });
  assert.ok(legacy);
  assert.ok(sameOklch(legacy.elements.air, DEFAULT_LOOK.elements.air), "air → gold");
  assert.ok(sameOklch(legacy.elements.fire, DEFAULT_LOOK.elements.fire), "fire");
  assert.ok(sameOklch(legacy.elements.earth, DEFAULT_LOOK.elements.earth), "earth");
  assert.ok(sameOklch(legacy.elements.water, DEFAULT_LOOK.elements.water), "water");
  assert.ok(sameOklch(legacy.aspects.hard, DEFAULT_LOOK.aspects.hard), "hard");
  assert.equal(lookHasLegacyFactoryTokens(legacy), false);

  const customAir = { h: 245, c: 0.13, l: 0.7 };
  const mixed = parseLook({
    elements: { ...LEGACY_FACTORY_NIGHT.elements, air: customAir },
    aspects: DEFAULT_LOOK.aspects,
    pairing: "classic",
  });
  assert.ok(mixed);
  assert.ok(sameOklch(mixed.elements.air, customAir), "custom air kept");
  assert.ok(sameOklch(mixed.elements.fire, DEFAULT_LOOK.elements.fire), "legacy fire still upgrades");

  const already = parseLook(DEFAULT_LOOK);
  assert.ok(already);
  assert.ok(sameOklch(already.elements.air, DEFAULT_LOOK.elements.air));
  assert.equal(
    rawLookHasLegacyFactory({
      elements: LEGACY_FACTORY_NIGHT.elements,
      aspects: LEGACY_FACTORY_NIGHT.aspects,
    }),
    true,
  );
  assert.equal(rawLookHasLegacyFactory(DEFAULT_LOOK), false);
  assert.equal(
    rawLookHasLegacyFactory({
      live: { elements: LEGACY_FACTORY_NIGHT.elements, aspects: DEFAULT_LOOK.aspects },
    }),
    true,
  );

  const muddy = parseLook({
    elements: { ...DEFAULT_LOOK.elements, air: { h: 95, c: 0.14, l: 0.78 } },
    aspects: DEFAULT_LOOK.aspects,
    pairing: "classic",
  });
  assert.ok(muddy);
  assert.ok(sameOklch(muddy.elements.air, DEFAULT_LOOK.elements.air), "muddy V1 air → lamp-gold");
  assert.ok(sameOklch(muddy.elements.fire, DEFAULT_LOOK.elements.fire), "fire untouched");

  const lemon = parseLook({
    elements: { ...DEFAULT_LOOK.elements, air: { h: 95, c: 0.16, l: 0.81 } },
    aspects: DEFAULT_LOOK.aspects,
    pairing: "classic",
  });
  assert.ok(lemon);
  assert.ok(sameOklch(lemon.elements.air, DEFAULT_LOOK.elements.air), "lemon V1 air → lamp-gold");
  assert.ok(sameOklch(lemon.elements.fire, DEFAULT_LOOK.elements.fire), "fire untouched");
});

test("compartmentInk factory table", () => {
  const look = parseLook(DEFAULT_LOOK);
  assert.ok(look);
  const expect = {
    dark: { fire: "var(--wheel-sign-ink)", earth: "var(--wheel-sign-ink)", air: "var(--wheel-sign-ink)", water: "var(--wheel-sign-ink)" },
    light: { fire: "var(--wheel-sign-ink)", earth: "var(--wheel-sign-ink)", air: "var(--wheel-sign-ink)", water: "var(--wheel-sign-ink)" },
  };
  for (const theme of ["dark", "light"]) {
    for (const el of ELEMENT_KEYS) {
      assert.equal(compartmentInk(look, el, theme), expect[theme][el], `${theme} ${el}`);
    }
  }
});

test("missing outerAspects inherit factory night", () => {
  const parsed = parseLook({
    elements: DEFAULT_LOOK.elements,
    aspects: DEFAULT_LOOK.aspects,
    planets: {},
    pairing: "classic",
  });
  assert.ok(parsed);
  assert.ok(sameOklch(parsed.outerAspects.hard, DEFAULT_LOOK.outerAspects.hard));
});

test("DEFAULT_LOOK / DEFAULT_LOOK_DAY lockstep with CSS", () => {
  const theme = blockVars(css, "/* Element / aspect hues", "--font-display");
  const light = blockVars(css, "html.light {", ":root {");
  const map = [
    ["--el-fire", DEFAULT_LOOK.elements.fire, DEFAULT_LOOK_DAY.elements.fire],
    ["--el-earth", DEFAULT_LOOK.elements.earth, DEFAULT_LOOK_DAY.elements.earth],
    ["--el-air", DEFAULT_LOOK.elements.air, DEFAULT_LOOK_DAY.elements.air],
    ["--el-water", DEFAULT_LOOK.elements.water, DEFAULT_LOOK_DAY.elements.water],
    ["--aspect-conj", DEFAULT_LOOK.aspects.conj, DEFAULT_LOOK_DAY.aspects.conj],
    ["--aspect-hard", DEFAULT_LOOK.aspects.hard, DEFAULT_LOOK_DAY.aspects.hard],
    ["--aspect-soft", DEFAULT_LOOK.aspects.soft, DEFAULT_LOOK_DAY.aspects.soft],
    ["--aspect-minor", DEFAULT_LOOK.aspects.minor, DEFAULT_LOOK_DAY.aspects.minor],
    ["--aspect-outer-conj", DEFAULT_LOOK.outerAspects.conj, DEFAULT_LOOK_DAY.outerAspects.conj],
    ["--aspect-outer-hard", DEFAULT_LOOK.outerAspects.hard, DEFAULT_LOOK_DAY.outerAspects.hard],
    ["--aspect-outer-soft", DEFAULT_LOOK.outerAspects.soft, DEFAULT_LOOK_DAY.outerAspects.soft],
    ["--aspect-outer-minor", DEFAULT_LOOK.outerAspects.minor, DEFAULT_LOOK_DAY.outerAspects.minor],
  ];
  for (const [name, night, day] of map) {
    const nightRe = new RegExp(`${name}:\\s*oklch\\([^)]+\\)`);
    const n = parseOklch(theme.match(nightRe)?.[0] ?? "");
    const d = parseOklch(light.match(nightRe)?.[0] ?? "");
    assert.ok(near(n.l, night.l) && near(n.c, night.c) && near(n.h, night.h), `night ${name}`);
    assert.ok(near(d.l, day.l) && near(d.c, day.c) && near(d.h, day.h), `day ${name}`);
    void oklchCss(night);
  }
  assert.match(css, /--aspect-outer-conj \{\n[\s\S]*initial-value: #dfa700;/);
});

test("planet colour mode: kept, read back, and painted through --pm-<id>", () => {
  assert.equal(DEFAULT_LOOK.planetInk, "element");
  assert.equal(parseLook({ planetInk: "plain" })?.planetInk, "plain");
  assert.equal(parseLook({ planetInk: "traditional" })?.planetInk, "traditional");
  assert.equal(parseLook({ planetInk: "neon" })?.planetInk, "element");
  assert.equal(parseLook({})?.planetInk, "element");
  // No pinned colour: the mode's variable, the element of its sign behind it.
  assert.equal(planetPaint("mars", "aries", {}), "var(--pm-mars, var(--el-fire))");
  // A pinned colour wins in every mode.
  assert.equal(planetPaint("mars", "aries", { mars: { h: 1, c: 0.1, l: 0.5 } }), "var(--planet-mars)");
  for (const id of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]) {
    assert.ok(TRADITIONAL_PLANET_INK[id] && TRADITIONAL_PLANET_INK_DAY[id], id);
    assert.ok(TRADITIONAL_PLANET_INK_DAY[id].l < TRADITIONAL_PLANET_INK[id].l, `${id} is deeper by day`);
  }
});
