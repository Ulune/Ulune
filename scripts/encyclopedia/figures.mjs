/*
 * The encyclopedia's small figures (encyclopedia plan, part 19: "drawn by
 * Ulune itself from the same data as its charts, so they are exact, light,
 * sharp at any size, in both themes, and free of anyone else's rights").
 *
 * Made at build time as SVG text in the page's data, so a page carries no
 * code for them and reads whole without JavaScript; their colours are the
 * app's (the elements' and the aspects' colours the reader chose, the theme's
 * ink), set by encyclopedia.css on the classes used here. Each figure has a
 * text twin: a caption under it and a fuller description for screen readers.
 *
 * The numbers come from the code the charts use (src/lib/chart: the orbs,
 * the bodygraph's drawing, the gates' places on the zodiac, the birth grid),
 * read as the build reads the reading texts (combinations.mjs).
 */
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const ELEMENTS = ["fire", "earth", "air", "water"];
const MODALITIES = ["cardinal", "fixed", "mutable"];
const GLYPH = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂", jupiter: "♃", saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇",
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋", leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏", sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};
const SIGN_NAME = {
  en: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
  fr: ["Bélier", "Taureau", "Gémeaux", "Cancer", "Lion", "Vierge", "Balance", "Scorpion", "Sagittaire", "Capricorne", "Verseau", "Poissons"],
};
const PLANET_NAME = {
  en: { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto" },
  fr: { sun: "Soleil", moon: "Lune", mercury: "Mercure", venus: "Vénus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturne", uranus: "Uranus", neptune: "Neptune", pluto: "Pluton" },
};
const ELEMENT_WORD = {
  en: { fire: "a fire sign", earth: "an earth sign", air: "an air sign", water: "a water sign" },
  fr: { fire: "un signe de feu", earth: "un signe de terre", air: "un signe d’air", water: "un signe d’eau" },
};
/** Aspect entry → [angle, the code's id, colour family]. */
const ASPECTS = {
  conjunction: [0, "conjunction", "conj"],
  sextile: [60, "sextile", "soft"],
  square: [90, "square", "hard"],
  trine: [120, "trine", "soft"],
  opposition: [180, "opposition", "hard"],
  quincunx: [150, "quincunx", "minor"],
  "semi-sextile": [30, "semisextile", "minor"],
  "semi-square": [45, "semisquare", "minor"],
  quintile: [72, "quintile", "minor"],
};
const ASPECT_NAME = {
  en: { conjunction: "conjunction", sextile: "sextile", square: "square", trine: "trine", opposition: "opposition", quincunx: "quincunx", "semi-sextile": "semi-sextile", "semi-square": "semi-square", quintile: "quintile" },
  fr: { conjunction: "conjonction", sextile: "sextile", square: "carré", trine: "trigone", opposition: "opposition", quincunx: "quinconce", "semi-sextile": "semi-sextile", "semi-square": "semi-carré", quintile: "quintile" },
};
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const S = " ";

/* -------------------------------------------------------------- the code's numbers */

let cache = null;
function code(root) {
  if (cache?.root === root) return cache;
  const require = createRequire(join(root, "package.json"));
  const load = (f) => {
    const path = join(root, "src/lib/chart", f);
    delete require.cache[path];
    return require(path);
  };
  const hd = load("human-design.ts");
  const geometry = load("bodygraph-geometry.ts");
  const constants = load("constants.ts");
  const grid = load("numerology-grid.ts");
  cache = { root, hd, geometry, orbs: constants.ASPECT_ORBS, grid };
  return cache;
}

/* -------------------------------------------------------------- drawing helpers */

const n = (x) => String(Math.round(x * 100) / 100);
/** A point on a circle, longitude counted from the left, anticlockwise, as on a chart wheel. */
const at = (cx, cy, r, lon) => {
  const t = ((180 + lon) * Math.PI) / 180;
  return [cx + r * Math.cos(t), cy - r * Math.sin(t)];
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A ring sector from `a` to `b` degrees, between two radii. */
function sector(cx, cy, r0, r1, a, b) {
  const [x1, y1] = at(cx, cy, r1, a);
  const [x2, y2] = at(cx, cy, r1, b);
  const [x3, y3] = at(cx, cy, r0, b);
  const [x4, y4] = at(cx, cy, r0, a);
  const large = b - a > 180 ? 1 : 0;
  // Anticlockwise on the page is "sweep 0" with y pointing down.
  return `M${n(x1)} ${n(y1)}A${n(r1)} ${n(r1)} 0 ${large} 0 ${n(x2)} ${n(y2)}L${n(x3)} ${n(y3)}A${n(r0)} ${n(r0)} 0 ${large} 1 ${n(x4)} ${n(y4)}Z`;
}
const text = (x, y, s, cls = "f-label", extra = "") => `<text x="${n(x)}" y="${n(y)}" class="${cls}"${extra}>${esc(s)}</text>`;
const svg = (w, h, body, label) =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}" class="f-svg" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

/* -------------------------------------------------------------- the figures */

/** The zodiac as a ring, some signs coloured by their element; a marker on one. */
function zodiac({ lit = [], marker = null, polygon = false, gate = null }) {
  const c = 120;
  const [r0, r1, rg] = [76, 112, 94];
  let body = `<circle cx="${c}" cy="${c}" r="${r1}" class="f-line"/><circle cx="${c}" cy="${c}" r="${r0}" class="f-line"/>`;
  SIGNS.forEach((s, i) => {
    const on = lit.includes(i);
    body += `<path d="${sector(c, c, r0, r1, i * 30, i * 30 + 30)}" class="${on ? `f-el f-el-${ELEMENTS[i % 4]}` : "f-cell"}"/>`;
    const [x, y] = at(c, c, rg, i * 30 + 15);
    body += text(x, y, GLYPH[s], `f-glyph${on ? " f-on" : ""}`);
  });
  for (let i = 0; i < 12; i += 1) {
    const [x1, y1] = at(c, c, r0, i * 30);
    const [x2, y2] = at(c, c, r1, i * 30);
    body += `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" class="f-line"/>`;
  }
  if (polygon && lit.length > 2) {
    const pts = lit.map((i) => at(c, c, r0 - 6, i * 30 + 15));
    body += `<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" class="f-shape"/>`;
  }
  if (gate) {
    body += `<path d="${sector(c, c, r0 - 14, r1 + 6, gate.from, gate.from + gate.size)}" class="f-gate-arc"/>`;
    const [x, y] = at(c, c, r0 - 28, gate.from + gate.size / 2);
    body += text(x, y, String(gate.gate), "f-num f-on");
  }
  if (marker) {
    const [x, y] = at(c, c, r0 - 22, marker.lon);
    const [dx, dy] = at(c, c, r0, marker.lon);
    body += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(dx)}" y2="${n(dy)}" class="f-strong"/>`;
    body += `<circle cx="${n(x)}" cy="${n(y)}" r="13" class="f-disc"/>` + text(x, y, marker.glyph, marker.glyphClass ?? "f-glyph f-on");
  }
  return { w: 240, h: 240, body };
}

/** A blank wheel of twelve equal houses, the Ascendant on the left; some houses lit, an angle marked. */
function houses({ lit = [], angle = null, glyph = null }) {
  const c = 120;
  const [r0, r1] = [44, 108];
  let body = `<circle cx="${c}" cy="${c}" r="${r1}" class="f-line"/><circle cx="${c}" cy="${c}" r="${r0}" class="f-line"/>`;
  for (let h = 1; h <= 12; h += 1) {
    const a = (h - 1) * 30;
    const on = lit.includes(h);
    body += `<path d="${sector(c, c, r0, r1, a, a + 30)}" class="${on ? "f-lit" : "f-cell"}"/>`;
    const [x, y] = at(c, c, r0 + 14, a + 15);
    body += text(x, y, String(h), `f-num${on ? " f-on" : ""}`);
    const [x1, y1] = at(c, c, r0, a);
    const [x2, y2] = at(c, c, r1, a);
    body += `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" class="${a % 90 === 0 ? "f-axis" : "f-line"}"/>`;
  }
  // The four angles: the Ascendant at the 1st cusp, the IC at the 4th, the Descendant at the 7th, the Midheaven at the 10th.
  const ANG = { ascendant: [0, "AC"], "imum-coeli": [90, "IC"], descendant: [180, "DC"], midheaven: [270, "MC"] };
  for (const [id, [a, label]] of Object.entries(ANG)) {
    const [x, y] = at(c, c, r1 + 1, a);
    const [tx, ty] = at(c, c, r1 - 12, a + (a === 90 || a === 270 ? 8 : -8));
    const on = id === angle;
    if (on) body += `<circle cx="${n(x)}" cy="${n(y)}" r="5" class="f-dot"/>`;
    body += text(tx, ty, label, `f-small${on ? " f-on" : ""}`);
  }
  if (glyph && lit.length) {
    const [x, y] = at(c, c, (r0 + r1) / 2 + 12, (lit[0] - 1) * 30 + 15);
    body += `<circle cx="${n(x)}" cy="${n(y)}" r="12" class="f-disc"/>` + text(x, y, glyph, "f-glyph f-on");
  }
  return { w: 240, h: 240, body };
}

/** How far from the centre an aspect's number sits: inside the chord, clear of it (AspectDial.tsx does the same). */
export const labelRadius = (angle, r) => Math.max(18, r * Math.cos(((angle / 2) * Math.PI) / 180) - 16);

/** Two points on a circle at an aspect's angle, the orb shaded where the second may fall. */
function aspect({ type, orb, glyphs = null }) {
  const [angle, , family] = ASPECTS[type];
  const c = 120;
  const r = 88;
  // Symmetric about the top of the circle.
  const top = 270;
  const a = top - angle / 2;
  const b = top + angle / 2;
  let body = `<circle cx="${c}" cy="${c}" r="${r}" class="f-line"/>`;
  body += `<path d="${sector(c, c, r - 7, r + 7, b - orb, b + orb)}" class="f-orb"/>`;
  const [ax, ay] = at(c, c, r, a);
  const [bx, by] = at(c, c, r, b);
  if (angle > 0) {
    // The angle's number on the centre's side of the line, clear of it.
    const [lx, ly] = at(c, c, labelRadius(angle, r), top);
    body += text(lx, angle === 180 ? ly - 12 : ly, `${angle}°`, "f-small f-on");
    body += `<line x1="${n(ax)}" y1="${n(ay)}" x2="${n(bx)}" y2="${n(by)}" class="f-asp f-asp-${family}"/>`;
  }
  body += `<line x1="${c}" y1="${c}" x2="${n(ax)}" y2="${n(ay)}" class="f-ray"/><line x1="${c}" y1="${c}" x2="${n(bx)}" y2="${n(by)}" class="f-ray"/>`;
  const dot = (x, y, g, outward) => {
    if (!g) return `<circle cx="${n(x)}" cy="${n(y)}" r="5.5" class="f-dot"/>`;
    const [gx, gy] = outward;
    return `<circle cx="${n(x)}" cy="${n(y)}" r="4" class="f-dot"/><circle cx="${n(gx)}" cy="${n(gy)}" r="12" class="f-disc"/>` + text(gx, gy, g, "f-glyph f-on");
  };
  // A conjunction: the two side by side, a few degrees apart.
  const [pa, pb] = angle === 0 ? [top - 3, top + 3] : [a, b];
  const [pax, pay] = at(c, c, r, pa);
  const [pbx, pby] = at(c, c, r, pb);
  body += dot(pax, pay, glyphs?.[0], at(c, c, r + 18, pa - (angle === 0 ? 6 : 0)));
  body += dot(pbx, pby, glyphs?.[1], at(c, c, r + 18, pb + (angle === 0 ? 6 : 0)));
  const [ox, oy] = at(c, c, r + 20, b + orb + 4);
  if (!glyphs) body += text(ox, oy, `±${orb}°`, "f-small");
  return { w: 240, h: 240, body, data: { angle, orb } };
}

/** An aspect pattern: its points on the circle, its lines in the aspects' colours. */
function pattern(id) {
  const P = {
    "grand-trine": { pts: [90, 210, 330], lines: [[0, 1, "soft"], [1, 2, "soft"], [0, 2, "soft"]] },
    "t-square": { pts: [180, 0, 270], lines: [[0, 1, "hard"], [0, 2, "hard"], [1, 2, "hard"]] },
    "grand-cross": { pts: [0, 90, 180, 270], lines: [[0, 1, "hard"], [1, 2, "hard"], [2, 3, "hard"], [3, 0, "hard"], [0, 2, "hard"], [1, 3, "hard"]] },
    yod: { pts: [240, 300, 90], lines: [[0, 1, "soft"], [0, 2, "minor"], [1, 2, "minor"]] },
    kite: { pts: [90, 210, 330, 270], lines: [[0, 1, "soft"], [1, 2, "soft"], [0, 2, "soft"], [0, 3, "hard"], [1, 3, "soft"], [2, 3, "soft"]] },
    "mystic-rectangle": { pts: [30, 150, 210, 330], lines: [[0, 2, "hard"], [1, 3, "hard"], [0, 1, "soft"], [2, 3, "soft"], [0, 3, "soft"], [1, 2, "soft"]] },
    stellium: { pts: [250, 262, 271, 283], lines: [] },
  }[id];
  if (!P) return null;
  const c = 120;
  const r = 92;
  let body = `<circle cx="${c}" cy="${c}" r="${r}" class="f-line"/>`;
  const xy = P.pts.map((lon) => at(c, c, r, lon));
  for (const [i, j, fam] of P.lines) body += `<line x1="${n(xy[i][0])}" y1="${n(xy[i][1])}" x2="${n(xy[j][0])}" y2="${n(xy[j][1])}" class="f-asp f-asp-${fam}"/>`;
  if (id === "stellium") body += `<path d="${sector(c, c, r - 9, r + 9, 244, 289)}" class="f-orb"/>`;
  for (const [x, y] of xy) body += `<circle cx="${n(x)}" cy="${n(y)}" r="5.5" class="f-dot"/>`;
  return { w: 240, h: 240, body };
}

/** The bodygraph, small: some centres lit, channels drawn, a gate marked. */
function bodygraph(g, { centres = [], channels = [], gates = [] }) {
  const { BODYGRAPH_W: W, BODYGRAPH_H: H, BODYGRAPH_CENTERS, BODYGRAPH_CHANNELS, BODYGRAPH_GATES, centerPath } = g.geometry;
  let body = "";
  for (const [id, d] of Object.entries(BODYGRAPH_CHANNELS)) body += `<path d="${d.d}" class="${channels.includes(id) ? "f-channel f-on" : "f-channel"}"/>`;
  for (const id of Object.keys(BODYGRAPH_CENTERS)) body += `<path d="${centerPath(id)}" class="${centres.includes(id) ? "f-centre f-lit" : "f-centre"}"/>`;
  for (const gate of gates) {
    const p = BODYGRAPH_GATES[gate];
    body += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="19" class="f-gate"/>` + text(p.x, p.y, String(gate), "f-num f-gate-num");
  }
  return { w: W, h: H, body, scale: 0.5 };
}

/** King Wen's hexagrams by their two trigrams: rows the lower, columns the upper. */
const TRIGRAMS = ["qian", "zhen", "kan", "gen", "kun", "xun", "li", "dui"];
const KING_WEN = [
  [1, 34, 5, 26, 11, 9, 14, 43],
  [25, 51, 3, 27, 24, 42, 21, 17],
  [6, 40, 29, 4, 7, 59, 64, 47],
  [33, 62, 39, 52, 15, 53, 56, 31],
  [12, 16, 8, 23, 2, 20, 35, 45],
  [44, 32, 48, 18, 46, 57, 50, 28],
  [13, 55, 63, 22, 36, 37, 30, 49],
  [10, 54, 60, 41, 19, 61, 38, 58],
];
/** A trigram's three lines, bottom first (1 a whole line, yang). */
const TRIGRAM_LINES = { qian: [1, 1, 1], zhen: [1, 0, 0], kan: [0, 1, 0], gen: [0, 0, 1], kun: [0, 0, 0], xun: [0, 1, 1], li: [1, 0, 1], dui: [1, 1, 0] };
const TRIGRAM_NAME = {
  en: { qian: "Heaven", zhen: "Thunder", kan: "Water", gen: "Mountain", kun: "Earth", xun: "Wind", li: "Fire", dui: "Lake" },
  fr: { qian: "Ciel", zhen: "Tonnerre", kan: "Eau", gen: "Montagne", kun: "Terre", xun: "Vent", li: "Feu", dui: "Lac" },
};
const TRIGRAM_GLYPH = { qian: "☰", dui: "☱", li: "☲", zhen: "☳", xun: "☴", kan: "☵", gen: "☶", kun: "☷" };

/** Hexagram `k` (King Wen's number): its lower and upper trigrams and its six lines, bottom first. */
export function hexagram(k) {
  for (let lo = 0; lo < 8; lo += 1) {
    const up = KING_WEN[lo].indexOf(k);
    if (up >= 0) {
      const lower = TRIGRAMS[lo];
      const upper = TRIGRAMS[up];
      return { lower, upper, lines: [...TRIGRAM_LINES[lower], ...TRIGRAM_LINES[upper]] };
    }
  }
  return null;
}

/** Six lines, the first at the bottom; some lines lit; the two trigrams named. */
function hexFigure({ lines, lit = [], numbers = true, trigrams = null, lang = "en" }) {
  const W = trigrams ? 250 : 150;
  const x0 = 34;
  const lw = 96;
  let body = "";
  for (let i = 0; i < 6; i += 1) {
    const y = 176 - i * 28;
    const on = lit.includes(i + 1);
    const cls = on ? "f-yao f-on" : "f-yao";
    if (lines ? lines[i] : 1) body += `<rect x="${x0}" y="${y - 7}" width="${lw}" height="14" rx="2" class="${cls}"/>`;
    else body += `<rect x="${x0}" y="${y - 7}" width="${lw / 2 - 8}" height="14" rx="2" class="${cls}"/><rect x="${x0 + lw / 2 + 8}" y="${y - 7}" width="${lw / 2 - 8}" height="14" rx="2" class="${cls}"/>`;
    if (numbers) body += text(16, y, String(i + 1), `f-small${on ? " f-on" : ""}`);
  }
  if (trigrams) {
    body += `<line x1="${x0 + lw + 10}" y1="34" x2="${x0 + lw + 10}" y2="104" class="f-line"/><line x1="${x0 + lw + 10}" y1="118" x2="${x0 + lw + 10}" y2="188" class="f-line"/>`;
    body += text(x0 + lw + 18, 69, `${TRIGRAM_GLYPH[trigrams.upper]} ${TRIGRAM_NAME[lang][trigrams.upper]}`, "f-small f-start");
    body += text(x0 + lw + 18, 153, `${TRIGRAM_GLYPH[trigrams.lower]} ${TRIGRAM_NAME[lang][trigrams.lower]}`, "f-small f-start");
  }
  return { w: W, h: 200, body };
}

/** The birth grid (Phillips's layout: 3 6 9 above, 1 4 7 below), some cells lit, their line drawn. */
function grid(g, { lit = [], line = null }) {
  const rows = g.grid.GRID_CELLS.phillips;
  const s = 52;
  const x0 = 14;
  let body = "";
  const where = {};
  rows.forEach((row, r) =>
    row.forEach((d, col) => {
      const x = x0 + col * s;
      const y = x0 + r * s;
      where[d] = [x + s / 2, y + s / 2];
      const on = lit.includes(d);
      body += `<rect x="${x}" y="${y}" width="${s}" height="${s}" class="${on ? "f-lit" : "f-cell"}"/>` + text(x + s / 2, y + s / 2, String(d), `f-big${on ? " f-on" : ""}`);
    }),
  );
  if (line) {
    const [a, b] = [where[line[0]], where[line[2]]];
    body += `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" class="f-arrow"/>`;
  }
  return { w: 3 * s + 2 * x0, h: 3 * s + 2 * x0, body };
}

/** A longitude's place in its sign, as the gates' pages write it: 13°52′30″. */
function dms(lon) {
  const total = Math.round((((lon % 30) + 30) % 30) * 3600);
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${d}°${String(m).padStart(2, "0")}′${String(sec).padStart(2, "0")}″`;
}

/* -------------------------------------------------------------- the words */

const W = {
  en: {
    sign: (s, i) => `${s}: ${i * 30}° to ${i * 30 + 30}° of the zodiac, ${ELEMENT_WORD.en[ELEMENTS[i % 4]]}.`,
    signLabel: (s, i) => `The zodiac as a ring of twelve signs from Aries, ${s} highlighted between ${i * 30}° and ${i * 30 + 30}°.`,
    planetIn: (title, s) => `${title}: the planet’s glyph in the thirty degrees of ${s}.`,
    angleIn: (a, s) => `The ${a} in ${s}: the sign on that angle.`,
    elementOf: (name, list) => `${name}: ${list}.`,
    elementLabel: (name, list) => `The zodiac ring with the signs of ${name} highlighted (${list}), joined by a line.`,
    house: (h) => `The ${h} of a chart: the wheel is read anticlockwise from the Ascendant on the left.`,
    houseLabel: (k) => `A blank wheel of twelve equal houses, numbered anticlockwise from the Ascendant on the left; house ${k} is highlighted. The Midheaven is at the top.`,
    angle: (a) => `${a} on a blank wheel of houses: the Ascendant on the left, the Midheaven at the top.`,
    aspect: (name, angle, orb) => `A ${name}: ${angle}° between two points, with Ulune’s orb of ${orb}° either side (shaded).`,
    aspectLabel: (name, angle, orb) => `A circle with two points ${angle}° apart, joined by a line, the ${name}; a shaded band shows where the second point may fall within ${orb}° either side.`,
    pairAspect: (a, name, b, angle, orb) => `${a} and ${b} in ${name}: ${angle}° apart, give or take ${orb}°.`,
    pattern: (name) => `${name}: its points on the circle and the aspects that join them, each in its aspect’s colour.`,
    centre: (name) => `The bodygraph with the ${name} lit.`,
    centreLabel: (name) => `The Human Design bodygraph: nine centres joined by thirty-six channels, the ${name} highlighted.`,
    channel: (id) => `The channel ${id} on the bodygraph, joining its two centres.`,
    gate: (k, centre) => `Gate ${k} on the bodygraph, in the ${centre}, and hexagram ${k} with its two trigrams.`,
    gateLabel: (k, centre, hex) => `The bodygraph with gate ${k} marked in the ${centre}. Hexagram ${k}, from the bottom line up: ${hex}.`,
    mandala: (k, from, to) => `Gate ${k} on the zodiac: from ${from} to ${to}.`,
    hexLines: (lines) => lines.map((l) => (l ? "whole" : "broken")).join(", "),
    trigrams: (up, lo) => `upper trigram ${up}, lower trigram ${lo}`,
    line: (k) => `Line ${k} of the six lines of a hexagram, counted from the bottom.`,
    profile: (a, b) => `Lines ${a} and ${b} of a hexagram: the profile ${a}/${b}.`,
    gridLine: (d) => `The line ${d} of the birth grid (3 6 9 above, 1 4 7 below).`,
    gridNumber: (d) => `${d} in the birth grid (3 6 9 above, 1 4 7 below).`,
    gridLabel: (d) => `A three by three grid of the digits 1 to 9, columns 1 2 3, 4 5 6 and 7 8 9 from the bottom left; ${d} highlighted.`,
    deg: (lon) => `${dms(lon)} ${SIGN_NAME.en[Math.floor(lon / 30) % 12]}`,
  },
  fr: {
    sign: (s, i) => `${s}${S}: de ${i * 30}° à ${i * 30 + 30}° du zodiaque, ${ELEMENT_WORD.fr[ELEMENTS[i % 4]]}.`,
    signLabel: (s, i) => `Le zodiaque en anneau de douze signes à partir du Bélier, ${s} mis en évidence entre ${i * 30}° et ${i * 30 + 30}°.`,
    planetIn: (title, s) => `${title}${S}: le glyphe de la planète dans les trente degrés du signe.`,
    angleIn: (a, s) => `${a} en ${s}${S}: le signe sur cet angle.`,
    elementOf: (name, list) => `${name}${S}: ${list}.`,
    elementLabel: (name, list) => `L’anneau du zodiaque, les signes ${name} mis en évidence (${list}) et reliés par un trait.`,
    house: (h) => `La ${h} d’un thème${S}: la roue se lit dans le sens inverse des aiguilles d’une montre, depuis l’Ascendant à gauche.`,
    houseLabel: (k) => `Une roue vide de douze maisons égales, numérotées dans le sens inverse des aiguilles d’une montre depuis l’Ascendant à gauche${S}; la maison ${ROMAN[k]} est mise en évidence. Le Milieu du Ciel est en haut.`,
    angle: (a) => `${a} sur une roue de maisons vide${S}: l’Ascendant à gauche, le Milieu du Ciel en haut.`,
    aspect: (name, angle, orb) => `${name.charAt(0).toUpperCase()}${name.slice(1)}${S}: ${angle}° entre deux points, avec l’orbe d’Ulune de ${String(orb).replace(".", ",")}° de part et d’autre (en grisé).`,
    aspectLabel: (name, angle, orb) => `Un cercle avec deux points à ${angle}° l’un de l’autre, reliés par un trait${S}: ${name}${S}; une bande grisée montre où peut tomber le second point, à ${String(orb).replace(".", ",")}° près.`,
    pairAspect: (a, name, b, angle, orb) => `${a} et ${b} en ${name}${S}: à ${angle}° l’un de l’autre, à ${String(orb).replace(".", ",")}° près.`,
    pattern: (name) => `${name}${S}: ses points sur le cercle et les aspects qui les relient, chacun dans la couleur de son aspect.`,
    centre: (name) => `Le bodygraph, ${name} mis en évidence.`,
    centreLabel: (name) => `Le bodygraph du Human Design${S}: neuf centres reliés par trente-six canaux, ${name} mis en évidence.`,
    channel: (id) => `Le canal ${id} sur le bodygraph, entre ses deux centres.`,
    gate: (k, centre) => `La porte ${k} sur le bodygraph, dans ${centre}, et l’hexagramme ${k} avec ses deux trigrammes.`,
    gateLabel: (k, centre, hex) => `Le bodygraph, la porte ${k} marquée dans ${centre}. L’hexagramme ${k}, du trait du bas vers le haut${S}: ${hex}.`,
    mandala: (k, from, to) => `La porte ${k} sur le zodiaque${S}: de ${from} à ${to}.`,
    hexLines: (lines) => lines.map((l) => (l ? "plein" : "brisé")).join(", "),
    trigrams: (up, lo) => `trigramme du haut ${up}, trigramme du bas ${lo}`,
    line: (k) => `La ligne ${k} des six traits d’un hexagramme, comptés depuis le bas.`,
    profile: (a, b) => `Les lignes ${a} et ${b} d’un hexagramme${S}: le profil ${a}/${b}.`,
    gridLine: (d) => `La ligne ${d} de la grille de naissance (3 6 9 en haut, 1 4 7 en bas).`,
    gridNumber: (d) => `Le ${d} dans la grille de naissance (3 6 9 en haut, 1 4 7 en bas).`,
    gridLabel: (d) => `Une grille de trois sur trois des chiffres 1 à 9, colonnes 1 2 3, 4 5 6 et 7 8 9 depuis le bas à gauche${S}; ${d} mis en évidence.`,
    deg: (lon) => `${dms(lon)} ${SIGN_NAME.fr[Math.floor(lon / 30) % 12]}`,
  },
};

const CENTRE_NAME = {
  en: { head: "Head centre", ajna: "Ajna centre", throat: "Throat centre", g: "G centre", heart: "Heart centre", sacral: "Sacral centre", solarPlexus: "Solar Plexus centre", spleen: "Spleen centre", root: "Root centre" },
  fr: { head: "le centre de la Tête", ajna: "le centre Ajna", throat: "le centre de la Gorge", g: "le centre G", heart: "le centre du Cœur", sacral: "le centre Sacral", solarPlexus: "le centre du Plexus solaire", spleen: "le centre de la Rate", root: "le centre Racine" },
};
const AUTHORITY_CENTRES = { emotional: ["solarPlexus"], sacral: ["sacral"], splenic: ["spleen"], ego: ["heart"], "self-projected": ["g"], mental: ["head", "ajna"], lunar: [] };

/* -------------------------------------------------------------- which figure for which entry */

/**
 * The figure of an entry in a language, or null: `{ panels: [{ svg, w, h, scale? }], caption, label, interactive? }`.
 * `entry` is the build's entry ({ id, tradition, family }); `title` its title in that language.
 */
export function figureFor(entry, lang, title, root) {
  const g = code(root);
  const w = W[lang];
  const id = entry.id;
  const done = (panels, caption, label, interactive) => ({
    panels: panels.map((p) => ({ svg: svg(p.w, p.h, p.body, label), w: p.w, h: p.h, ...(p.scale ? { scale: p.scale } : {}) })),
    caption,
    ...(interactive ? { interactive } : {}),
  });
  if (entry.tradition === "astrology") {
    const si = SIGNS.indexOf(id);
    if (si >= 0) return done([zodiac({ lit: [si] })], w.sign(title, si), w.signLabel(title, si));
    let m = /^([a-z]+)-in-([a-z]+)$/.exec(id);
    if (m && SIGNS.includes(m[2])) {
      const i = SIGNS.indexOf(m[2]);
      const sname = SIGN_NAME[lang][i];
      if (PLANETS.includes(m[1])) {
        const cap = w.planetIn(title, sname);
        return done([zodiac({ lit: [i], marker: { lon: i * 30 + 15, glyph: GLYPH[m[1]] } })], cap, cap);
      }
      const label = m[1] === "ascendant" ? "AC" : "MC";
      const cap = w.angleIn(title.split(/ (in|en) /)[0], sname);
      return done([zodiac({ lit: [i], marker: { lon: i * 30 + 15, glyph: label, glyphClass: "f-small f-on" } })], cap, cap);
    }
    m = /^(element|modality)-([a-z]+)$/.exec(id);
    if (m) {
      const lit = SIGNS.map((_, i) => i).filter((i) => (m[1] === "element" ? ELEMENTS[i % 4] : MODALITIES[i % 3]) === m[2]);
      const list = lit.map((i) => SIGN_NAME[lang][i]).join(", ");
      return done([zodiac({ lit, polygon: true })], w.elementOf(title, list), w.elementLabel(title, list));
    }
    m = /^house-(\d+)$/.exec(id);
    if (m) return done([houses({ lit: [Number(m[1])] })], w.house(lang === "fr" ? `maison ${ROMAN[Number(m[1])]}` : title.toLowerCase()), w.houseLabel(Number(m[1])));
    m = /^([a-z]+)-in-house-(\d+)$/.exec(id);
    if (m) {
      const k = Number(m[2]);
      const cap =
        lang === "fr"
          ? `${title}${S}: la ${k === 1 ? "1re" : `${k}e`} maison, comptée dans le sens inverse des aiguilles d’une montre depuis l’Ascendant à gauche.`
          : `${title}: the ${title.split(" in the ")[1]}, counted anticlockwise from the Ascendant on the left.`;
      return done([houses({ lit: [k], glyph: GLYPH[m[1]] })], cap, cap);
    }
    if (["ascendant", "midheaven", "descendant", "imum-coeli"].includes(id)) {
      const lit = { ascendant: [1], "imum-coeli": [4], descendant: [7], midheaven: [10] }[id];
      const cap = w.angle(lang === "en" ? `The ${title}` : title);
      return done([houses({ lit, angle: id })], cap, cap);
    }
    if (ASPECTS[id] && entry.family === "aspects") {
      const orb = g.orbs[ASPECTS[id][1]];
      const name = ASPECT_NAME[lang][id];
      return done([aspect({ type: id, orb })], w.aspect(name, ASPECTS[id][0], orb), w.aspectLabel(name, ASPECTS[id][0], orb), { kind: "aspect", angle: ASPECTS[id][0], orb });
    }
    m = /^([a-z]+)-(conjunction|sextile|square|trine|opposition)-([a-z]+)$/.exec(id);
    if (m) {
      const orb = g.orbs[m[2]];
      const cap = w.pairAspect(PLANET_NAME[lang][m[1]], ASPECT_NAME[lang][m[2]], PLANET_NAME[lang][m[3]], ASPECTS[m[2]][0], orb);
      return done([aspect({ type: m[2], orb, glyphs: [GLYPH[m[1]], GLYPH[m[3]]] })], cap, cap);
    }
    const p = pattern(id);
    if (p) return done([p], w.pattern(title), w.pattern(title));
    return null;
  }
  if (entry.tradition === "human-design") {
    const cname = (c) => CENTRE_NAME[lang][c];
    let m = /^hd-centre-(.+)$/.exec(id);
    if (m) {
      const c = m[1] === "solar-plexus" ? "solarPlexus" : m[1];
      return done([bodygraph(g, { centres: [c] })], w.centre(cname(c).replace(/^le /, "")), w.centreLabel(cname(c)));
    }
    m = /^hd-channel-(\d+)-(\d+)$/.exec(id);
    if (m) {
      const ch = g.hd.HD_CHANNELS.find((c) => c.gates[0] === Number(m[1]) && c.gates[1] === Number(m[2]));
      if (!ch) return null;
      const cap = w.channel(ch.id);
      return done([bodygraph(g, { centres: [...ch.centers], channels: [ch.id], gates: [...ch.gates] })], cap, cap);
    }
    m = /^hd-gate-(\d+)$/.exec(id);
    if (m) {
      const k = Number(m[1]);
      const centre = g.hd.HD_GATE_CENTER[k];
      const hex = hexagram(k);
      const i = g.hd.HD_GATE_WHEEL.indexOf(k);
      const from = (g.hd.HD_GATE_41_START + i * g.hd.HD_GATE_SIZE) % 360;
      const size = g.hd.HD_GATE_SIZE;
      const hexText = `${w.hexLines(hex.lines)} (${w.trigrams(TRIGRAM_NAME[lang][hex.upper], TRIGRAM_NAME[lang][hex.lower])})`;
      const caption = `${w.gate(k, cname(centre))} ${w.mandala(k, w.deg(from), w.deg((from + size) % 360))}`;
      return done(
        [bodygraph(g, { centres: [centre], gates: [k] }), hexFigure({ lines: hex.lines, trigrams: hex, lang }), zodiac({ gate: { gate: k, from, size } })],
        caption,
        w.gateLabel(k, cname(centre), hexText),
      );
    }
    m = /^hd-line-(\d)$/.exec(id);
    if (m) return done([hexFigure({ lines: null, lit: [Number(m[1])] })], w.line(m[1]), w.line(m[1]));
    m = /^hd-profile-(\d)-(\d)$/.exec(id);
    if (m) return done([hexFigure({ lines: null, lit: [Number(m[1]), Number(m[2])] })], w.profile(m[1], m[2]), w.profile(m[1], m[2]));
    m = /^hd-authority-(.+)$/.exec(id);
    if (m && AUTHORITY_CENTRES[m[1]]?.length) {
      const cs = AUTHORITY_CENTRES[m[1]];
      const names = cs.map((c) => cname(c).replace(/^le /, "")).join(lang === "fr" ? " et " : " and ");
      return done([bodygraph(g, { centres: cs })], w.centre(names), w.centreLabel(cs.map(cname).join(lang === "fr" ? " et " : " and ")));
    }
    return null;
  }
  if (entry.tradition === "numerology") {
    let m = /^grid-(\d)-(\d)-(\d)$/.exec(id);
    if (m) {
      const d = [Number(m[1]), Number(m[2]), Number(m[3])];
      // The line as drawn: from one end of it to the other on the square.
      const line = g.grid.GRID_LINES.phillips.find((l) => [...l.digits].sort().join() === [...d].sort().join());
      if (!line) return null;
      const label = d.join("-");
      return done([grid(g, { lit: d, line: line.digits })], w.gridLine(label), w.gridLabel(label));
    }
    m = /^number-(\d)$/.exec(id);
    if (m && m[1] !== "0") return done([grid(g, { lit: [Number(m[1])] })], w.gridNumber(m[1]), w.gridLabel(m[1]));
    return null;
  }
  return null;
}

/** The figures' root (the repository), from content/encyclopedia. */
export const figuresRoot = (dir) => resolve(dir, "..", "..");
