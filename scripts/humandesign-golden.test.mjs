import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { calculateHumanDesign, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import {
  authorityFromGraph,
  definitionFromChannels,
  eclipticToGate,
  graphForView,
  HD_BODY_IDS,
  HD_CHANNELS,
  HD_GATE_41_START,
  HD_GATE_SIZE,
  HD_GATE_WHEEL,
  HD_LINE_SIZE,
  strategyOf,
  typeFromGraph,
  wrap360,
} from "../src/lib/chart/human-design.ts";
import { HD_HELLO, hdHelloCells } from "../src/lib/i18n/hd-hello.ts";
import {
  hdActivationColumns,
  hdNoNatal,
  hdReadingEmpty,
  hdTableColumns,
} from "../src/lib/i18n/hd-ui.ts";

const PARIS = {
  name: "Paris fixture",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

test("Rave mandala: Gate 41 at 2° Aquarius, 64 unique gates, 6 lines", () => {
  assert.equal(HD_GATE_SIZE, 5.625);
  assert.equal(HD_LINE_SIZE, 0.9375);
  assert.equal(HD_GATE_41_START, 302);
  assert.equal(HD_GATE_WHEEL.length, 64);
  assert.deepEqual([...HD_GATE_WHEEL].sort((a, b) => a - b), Array.from({ length: 64 }, (_, i) => i + 1));
  assert.equal(HD_CHANNELS.length, 36);
  const start = eclipticToGate(302);
  assert.equal(start.gate, 41);
  assert.equal(start.line, 1);
  const line2 = eclipticToGate(302 + HD_LINE_SIZE);
  assert.equal(line2.gate, 41);
  assert.equal(line2.line, 2);
  const next = eclipticToGate(302 + HD_GATE_SIZE);
  assert.equal(next.gate, 19);
  assert.equal(next.line, 1);
  const last = eclipticToGate(wrap360(302 - 1e-6));
  assert.equal(last.gate, 60);
  assert.equal(last.line, 6);
});

test("Committed copy: no-natal, empty reading, the first read's steps, table columns", () => {
  assert.equal(hdNoNatal("en"), "Cast a birth chart first.");
  assert.equal(hdReadingEmpty("en"), "Tap a channel, a gate, or a centre.");
  assert.equal(HD_HELLO.id, "hd.hello");
  // The five keys in the order Human Design teaches them (the plan, part 45).
  const cells = hdHelloCells("en");
  assert.equal(cells.map((c) => c.id).join(","), "type,strategy,authority,profile,definition");
  assert.equal(cells[0].sentence, "Your energy type: how you are built to use energy and meet other people.");
  assert.equal(cells[1].sentence, "The way of engaging with opportunities that works best for your type.");
  assert.equal(cells[2].sentence, "The inner signal Human Design says you can trust when deciding.");
  assert.equal(cells[3].sentence, "Two numbers from the lines of your two Suns: the role you tend to play.");
  assert.equal(cells[4].sentence, "How your coloured centres connect to each other.");
  assert.equal(hdHelloCells("fr")[3].label, "Profil");
  assert.deepEqual([...hdTableColumns("en")], ["Channel", "Gates", "Centres"]);
  assert.deepEqual([...hdActivationColumns("en")], ["Layer", "Body", "Gate", "Line", "Centre", "Channel"]);
  assert.deepEqual([...hdActivationColumns("fr")], ["Couche", "Corps", "Porte", "Ligne", "Centre", "Canal"]);
});

test("Type, strategy, and authority follow the graph, not a sun-sign table", () => {
  assert.equal(typeFromGraph([], []), "Reflector");
  assert.equal(strategyOf("Reflector"), "Wait a lunar cycle");
  assert.equal(authorityFromGraph([], "Reflector"), "Lunar");

  const sacralOnly = [{ id: "2–14", gates: [2, 14], centers: ["g", "sacral"], personality: true, design: false, mixed: false }];
  assert.equal(typeFromGraph(["g", "sacral"], sacralOnly), "Generator");
  assert.equal(strategyOf("Generator"), "Wait to respond");
  assert.equal(authorityFromGraph(["g", "sacral"], "Generator"), "Sacral");

  const motorThroat = [
    { id: "2–14", gates: [2, 14], centers: ["g", "sacral"], personality: false, design: false, mixed: true },
    { id: "33–13", gates: [33, 13], centers: ["throat", "g"], personality: false, design: false, mixed: true },
  ];
  assert.equal(typeFromGraph(["throat", "g", "sacral"], motorThroat), "Manifesting Generator");
  assert.equal(authorityFromGraph(["throat", "g", "sacral"], "Manifesting Generator"), "Sacral");

  const manifestor = [{ id: "12–22", gates: [12, 22], centers: ["throat", "solarPlexus"], personality: true, design: false, mixed: false }];
  assert.equal(typeFromGraph(["throat", "solarPlexus"], manifestor), "Manifestor");
  assert.equal(strategyOf("Manifestor"), "Inform before acting");
  assert.equal(authorityFromGraph(["throat", "solarPlexus"], "Manifestor"), "Emotional");

  const projector = [{ id: "17–62", gates: [17, 62], centers: ["ajna", "throat"], personality: true, design: false, mixed: false }];
  assert.equal(typeFromGraph(["ajna", "throat"], projector), "Projector");
  assert.equal(strategyOf("Projector"), "Wait for the invitation");
  assert.equal(authorityFromGraph(["ajna", "throat"], "Projector"), "Mental");
});

test("Paris 15 Jun 1990 14:30 — Personality + Design, type from the graph", async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "14:30" });
  assert.equal(natal.meta.lilith, "true");
  assert.equal(natal.meta.zodiac, "tropical");
  assert.equal(natal.meta.utc, "1990-06-15T12:30:00Z");
  const sun = natal.planets.find((p) => p.id === "sun");
  assert.ok(sun);

  const hd = await calculateHumanDesign({ natalUtc: new Date(natal.meta.utc) });
  const arc = (sun.ecliptic - hd.designSun + 360) % 360;
  assert.ok(Math.abs(arc - 88) < 1 / 3600, `design sun arc ${arc}`);
  assert.ok(Math.abs(hd.personalitySun - sun.ecliptic) < 1 / 3600);

  const pSun = hd.activations.find((a) => a.layer === "personality" && a.body === "sun");
  const dSun = hd.activations.find((a) => a.layer === "design" && a.body === "sun");
  assert.ok(pSun && dSun);
  assert.equal(pSun.gate, 12);
  assert.equal(pSun.line, 2);
  assert.equal(dSun.gate, 36);
  assert.equal(dSun.line, 4);
  assert.equal(hd.profile, "2/4");
  assert.equal(hd.definition, definitionFromChannels(hd.definedChannels));
  assert.equal(hd.definition, "Single");

  assert.equal(hd.type, "Manifesting Generator");
  assert.equal(hd.strategy, "Wait to respond");
  assert.equal(hd.authority, "Sacral");
  assert.deepEqual([...hd.definedCenters], ["throat", "g", "sacral"]);
  assert.deepEqual(
    hd.definedChannels.map((c) => c.id),
    ["33–13", "2–14"],
  );
  assert.ok(hd.definedChannels.every((c) => c.mixed));

  const natalNn = natal.planets.find((p) => p.id === "northnode");
  const hdNn = hd.activations.find((a) => a.layer === "personality" && a.body === "northnode");
  assert.ok(natalNn && hdNn);
  // The true node, as Jovian Archive uses it: the birth chart's own node.
  assert.ok(Math.abs(hdNn.ecliptic - natalNn.ecliptic) < 1e-9);

  assert.equal(hd.activations.filter((a) => a.layer === "personality").length, 13);
  assert.equal(hd.activations.filter((a) => a.layer === "design").length, 13);
  assert.ok(!hd.activations.some((a) => a.body === "chiron"));

  const both = graphForView(hd, "both");
  const personality = graphForView(hd, "personality");
  const design = graphForView(hd, "design");
  assert.deepEqual(
    both.channels.map((c) => c.id),
    ["33–13", "2–14"],
  );
  assert.equal(personality.channels.length, 0);
  assert.equal(design.channels.length, 0);
  assert.ok(personality.gates.has(12));
  assert.ok(!personality.gates.has(14));
  assert.ok(design.gates.has(14));
  assert.ok(!design.gates.has(12));
});

/**
 * Half a millisecond of solar motion. The Design search runs on the same
 * millisecond grid `designUtc` is published on, so this is the whole error
 * budget; the engine's own gate is 1e-6°.
 */
const ARC_TOLERANCE_DEG = 1e-8;

const wrap180 = (n) => (((n + 180) % 360) + 360) % 360 - 180;
const arcResidual = (hd) => wrap180(hd.personalitySun - hd.designSun - 88);
const spanDays = (hd) => (new Date(hd.personalityUtc).getTime() - new Date(hd.designUtc).getTime()) / 86_400_000;

test("Design Sun sits on 88° of solar arc to 1e-8°, from perihelion to aphelion", async () => {
  // The arc takes 86.4 days near perihelion and 92.0 near aphelion, so these
  // cases walk the search across its whole bracket. Any of them drifting is
  // the search window or the solver, not the sky.
  const cases = [
    "1990-06-15T12:30:00Z", // the 14:30 Paris fixture
    "1990-06-15T10:00:00Z", // Fixture A
    "1990-01-04T00:00:00Z", // design window near perihelion — shortest span
    "1990-07-04T00:00:00Z", // design window near aphelion — longest span
    "2017-02-01T11:00:00Z", // design window crosses the 2016-12-31 leap second
    "1800-03-21T06:00:00Z",
    "2099-12-31T12:00:00Z",
  ];
  for (const iso of cases) {
    const hd = await calculateHumanDesign({ natalUtc: new Date(iso) });
    const residual = arcResidual(hd);
    assert.ok(
      Math.abs(residual) <= ARC_TOLERANCE_DEG,
      `${iso}: design arc off by ${residual.toExponential(3)}°`,
    );
    const days = spanDays(hd);
    assert.ok(days > 86 && days < 92.5, `${iso}: design span ${days} days is outside the solar-arc range`);
    // 88° of arc, never a frozen 88 days.
    assert.ok(Math.abs(days - 88) > 0.2, `${iso}: design span landed on 88.0 days, which would mean a day count`);
  }
});

test("The published designUtc IS the moment the Design was computed at", async () => {
  // Solving in Julian days and converting back through a Date reports an
  // instant that was never evaluated. Re-read the Sun at the timestamp we
  // hand the UI and it must be the same longitude, bit for bit.
  const natal = await calculateNatal({ ...PARIS, date: "2017-02-01", time: "12:00" });
  const hd = await calculateHumanDesign({ natalUtc: new Date(natal.meta.utc) });
  const sky = await calculateTransits({
    utc: new Date(hd.designUtc),
    latitude: PARIS.latitude,
    longitude: PARIS.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
  });
  const sun = sky.planets.find((p) => p.id === "sun");
  assert.ok(sun);
  assert.equal(sun.ecliptic, hd.designSun);
  assert.ok(Math.abs(arcResidual(hd)) <= ARC_TOLERANCE_DEG);
});

test("Sun and Earth are exactly opposite in both layers", async () => {
  const hd = await calculateHumanDesign({ natalUtc: new Date("1990-06-15T12:30:00Z") });
  for (const layer of ["personality", "design"]) {
    const sun = hd.activations.find((a) => a.layer === layer && a.body === "sun");
    const earth = hd.activations.find((a) => a.layer === layer && a.body === "earth");
    assert.ok(sun && earth, layer);
    // One Sun evaluation feeds both, so this is exact, not "within an orb":
    // two separate Swiss calls could straddle a gate boundary by an ulp.
    assert.equal(wrap360(sun.ecliptic + 180), earth.ecliptic);
  }
  assert.deepEqual(
    hd.activations.filter((a) => a.layer === "personality").map((a) => a.body),
    [...HD_BODY_IDS],
  );
});

test("True node: the bodygraph's node is the birth chart's, even where the mean node would change its gate", async () => {
  // 15 Oct 1998 is near the widest mean/true split (1.8°): the mean node sat
  // in gate 29, the true node, the natal table's, in gate 59. Human Design
  // used the mean node until part 46; Jovian Archive's charts use the true
  // one (hd-variable.test.mjs checks four node rows of a real Jovian chart).
  const natal = await calculateNatal({ ...PARIS, date: "1998-10-15", time: "12:00" });
  const trueNode = natal.planets.find((p) => p.id === "northnode");
  const hd = await calculateHumanDesign({ natalUtc: new Date(natal.meta.utc) });
  const node = hd.activations.find((a) => a.layer === "personality" && a.body === "northnode");
  assert.ok(trueNode && node);
  assert.ok(Math.abs(wrap180(node.ecliptic - trueNode.ecliptic)) < 1e-9);
  assert.equal(eclipticToGate(trueNode.ecliptic).gate, 59);
  assert.equal(node.gate, 59);
  // The South Node is its exact opposite.
  const southNode = hd.activations.find((a) => a.layer === "personality" && a.body === "southnode");
  assert.ok(southNode);
  assert.equal(southNode.ecliptic, wrap360(node.ecliptic + 180));
});
