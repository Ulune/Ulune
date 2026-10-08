/*
 * The combination pages (encyclopedia plan, part 17; claude/ulune-combinations-plan.md):
 * "Moon in Scorpio", "Venus square Mars", "Mars in the 10th house", "Life
 * Path 7"… Each is assembled at build time from the very texts Ulune's
 * readings show (src/lib/content), so a page and its reading never
 * disagree, with a summary and an opening written for it in
 * content/encyclopedia/combinations/<group>[.<part>].<lang>.md:
 *
 *   moon-in-scorpio:
 *     summary: One sentence for the card, under 160 characters.
 *     opening: One to three sentences: what makes this combination itself.
 *
 * readContent (build.mjs) turns each into an ordinary entry file, so every
 * check of the build applies to them too. A page whose opening is missing
 * is built without it, with a warning.
 */
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";

export const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
export const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
export const MAJOR = ["conjunction", "sextile", "square", "trine", "opposition"];

/** Pairs by aspect that never occur in one chart: Mercury stays within about 28° of the Sun, Venus within about 47°. */
export const IMPOSSIBLE = new Set([
  ...["sextile", "square", "trine", "opposition"].flatMap((x) => [`sun-${x}-mercury`, `sun-${x}-venus`]),
  ...["square", "trine", "opposition"].map((x) => `mercury-${x}-venus`),
]);
export const PLACES = ["lifepath", "expression", "soulurge", "personality", "maturity", "birthday"];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

const PLANET = {
  en: { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto" },
  fr: { sun: "Soleil", moon: "Lune", mercury: "Mercure", venus: "Vénus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturne", uranus: "Uranus", neptune: "Neptune", pluto: "Pluton" },
};
/** "the Sun", « le Soleil »: as the readings write them inside a sentence. */
const THE = {
  en: (p) => (p === "sun" || p === "moon" ? `the ${PLANET.en[p]}` : PLANET.en[p]),
  fr: (p) => (p === "sun" ? "le Soleil" : p === "moon" ? "la Lune" : PLANET.fr[p]),
};
const SIGN = {
  en: { aries: "Aries", taurus: "Taurus", gemini: "Gemini", cancer: "Cancer", leo: "Leo", virgo: "Virgo", libra: "Libra", scorpio: "Scorpio", sagittarius: "Sagittarius", capricorn: "Capricorn", aquarius: "Aquarius", pisces: "Pisces" },
  fr: { aries: "Bélier", taurus: "Taureau", gemini: "Gémeaux", cancer: "Cancer", leo: "Lion", virgo: "Vierge", libra: "Balance", scorpio: "Scorpion", sagittarius: "Sagittaire", capricorn: "Capricorne", aquarius: "Verseau", pisces: "Poissons" },
};
const GLYPH = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂", jupiter: "♃", saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇",
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋", leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏", sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
  conjunction: "☌", sextile: "⚹", square: "□", trine: "△", opposition: "☍",
};
const ELEMENT = ["fire", "earth", "air", "water"];
const MODALITY = ["cardinal", "fixed", "mutable"];
const ASPECT_WORD = {
  en: { conjunction: "conjunct", sextile: "sextile", square: "square", trine: "trine", opposition: "opposite" },
  fr: { conjunction: "conjoint", sextile: "sextile", square: "carré", trine: "trigone", opposition: "opposé" },
};
const FAMILY_OF = { conjunction: "blend", sextile: "flow", trine: "flow", square: "tension", opposition: "tension" };
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const ordinal = (n) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const PLACE = {
  en: { lifepath: "Life Path", expression: "Expression", soulurge: "Soul Urge", personality: "Personality", maturity: "Maturity", birthday: "Birthday" },
  fr: { lifepath: "Chemin de vie", expression: "Expression", soulurge: "Élan de l’âme", personality: "Personnalité", maturity: "Maturité", birthday: "Jour de naissance" },
};
const PLACE_ENTRY = { lifepath: "life-path", expression: "expression", soulurge: "soul-urge", personality: "personality-number", maturity: "maturity", birthday: "birthday" };
const PLACE_SLUG = { lifepath: "life-path", expression: "expression", soulurge: "soul-urge", personality: "personality", maturity: "maturity", birthday: "birthday" };

export const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/œ/g, "oe")
    .toLowerCase()
    .replace(/[’']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Every combination: its id, group and the family it is listed in, by group, in order. */
export function combinationIds() {
  const groups = {
    "planet-in-sign": PLANETS.flatMap((p) => SIGNS.map((s) => `${p}-in-${s}`)),
    "planet-aspect": PLANETS.flatMap((a, i) => PLANETS.slice(i + 1).flatMap((b) => MAJOR.map((x) => `${a}-${x}-${b}`))),
    "planet-in-house": PLANETS.flatMap((p) => Array.from({ length: 12 }, (_, i) => `${p}-in-house-${i + 1}`)),
    "angle-in-sign": ["ascendant", "midheaven"].flatMap((a) => SIGNS.map((s) => `${a}-in-${s}`)),
    "planet-angle": ["ascendant", "midheaven"].flatMap((a) => PLANETS.map((p) => `${p}-and-${a}`)),
    "number-in-place": PLACES.flatMap((pl) => NUMBERS.filter((n) => !(pl === "birthday" && n === 33)).map((n) => `${PLACE_SLUG[pl]}-${n}`)),
  };
  return groups;
}

/** The families the combinations are listed in, per tradition, as the registry adds them. */
export const COMBINATION_FAMILIES = {
  astrology: [
    { id: "in-signs", group: "planet-in-sign", name: { en: "Planets in signs", fr: "Planètes en signe" } },
    { id: "in-aspect", group: "planet-aspect", name: { en: "Planets in aspect", fr: "Planètes en aspect" } },
    { id: "in-houses", group: "planet-in-house", name: { en: "Planets in houses", fr: "Planètes en maison" } },
    { id: "angles-in-signs", group: "angle-in-sign", name: { en: "The Ascendant and the Midheaven by sign", fr: "L’Ascendant et le Milieu du Ciel par signe" } },
    { id: "planets-and-angles", group: "planet-angle", name: { en: "Planets and the angles", fr: "Les planètes et les angles" } },
  ],
  numerology: [{ id: "numbers-in-places", group: "number-in-place", name: { en: "Numbers by position", fr: "Les nombres par position" } }],
};

/** "moon-in-scorpio:\n  summary: …\n  opening: …" → { id: { summary, opening } }, with its revision date. */
export function parseOpenings(text) {
  const out = {};
  let revised = null;
  let id = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line || line.startsWith("#")) continue;
    const date = /^revised:\s*(\d{4}-\d{2}-\d{2})$/.exec(line);
    if (date) {
      revised = date[1];
      continue;
    }
    const head = /^([a-z0-9-]+):$/.exec(line);
    if (head) {
      id = head[1];
      out[id] = {};
      continue;
    }
    const field = /^ {2}(summary|opening): (.+)$/.exec(line);
    if (field && id) out[id][field[1]] = field[2];
  }
  return { revised, entries: out };
}

/** The texts the readings use, read fresh (a change shows on the next build). */
function texts(root) {
  const require = createRequire(join(root, "package.json"));
  const load = (f) => {
    const path = join(root, "src/lib/content", f);
    delete require.cache[path];
    return require(path);
  };
  return {
    ...load("astro-planet-sign.ts"),
    ...load("astro-aspects.ts"),
    ...load("astro-bodies.ts"),
    ...load("astro-signs-houses.ts"),
    ...load("numerology-places.ts"),
  };
}

const quote = (s) => `"${s.replace(/"/g, "”")}"`;

function entryFile({ id, lang, slug, title, aliases = [], tradition, family, glyph, summary, related, revised, body }) {
  const meta = [
    "---",
    `id: ${id}`,
    `lang: ${lang}`,
    `slug: ${slug}`,
    `title: ${title}`,
    ...(aliases.length ? [`aliases: [${aliases.join(", ")}]`] : []),
    `tradition: ${tradition}`,
    `family: ${family}`,
    "kind: combination",
    "page: true",
    `glyph: ${quote(glyph)}`,
    `summary: ${quote(summary)}`,
    `related: [${related.join(", ")}]`,
    `revised: ${revised}`,
    "---",
    "",
  ];
  return meta.join("\n") + body.join("\n") + "\n";
}

const pick = (bi, lang) => (bi ? bi[lang] : "");

/**
 * The combination entries as files `{ path: "astrology/moon-in-scorpio.en.md", text }`,
 * plus the warnings for missing openings. `dir` is content/encyclopedia.
 */
export function combinationFiles(dir) {
  const root = resolve(dir, "..", "..");
  const files = [];
  const warnings = [];
  if (!existsSync(join(dir, "combinations"))) return { files, warnings };
  const T = texts(root);
  const groups = combinationIds();
  const sec = { en: { meaning: "Meaning", practice: "In practice", corr: "Correspondences" }, fr: { meaning: "Sens", practice: "En pratique", corr: "Correspondances" } };

  for (const lang of ["en", "fr"]) {
    // A group's openings may be split in parts: planet-in-sign.en.md, planet-in-sign.2.en.md…
    const openingsOf = (group) => {
      const out = { revised: null, entries: {} };
      const re = new RegExp(`^${group}(\\.[a-z0-9-]+)?\\.${lang}\\.md$`);
      for (const name of readdirSync(join(dir, "combinations")).sort()) {
        if (!re.test(name)) continue;
        const one = parseOpenings(readFileSync(join(dir, "combinations", name), "utf8"));
        if (one.revised && (!out.revised || one.revised > out.revised)) out.revised = one.revised;
        Object.assign(out.entries, one.entries);
      }
      return out;
    };
    for (const fam of [...COMBINATION_FAMILIES.astrology.map((f) => ({ ...f, tradition: "astrology" })), ...COMBINATION_FAMILIES.numerology.map((f) => ({ ...f, tradition: "numerology" }))]) {
      const { revised, entries } = openingsOf(fam.group);
      for (const id of groups[fam.group]) {
        const o = entries[id] ?? {};
        if (!o.summary || !o.opening) warnings.push({ file: `content/encyclopedia/combinations/${fam.group}.${lang}.md`, line: 1, message: `${id}: no ${!o.summary ? "summary" : "opening"} yet` });
        const made = make(fam.group, id, lang, T);
        if (!made) continue;
        const body = [`## ${sec[lang].meaning}`, "", ...(o.opening ? [o.opening, ""] : []), ...made.meaning.flatMap((p) => [p, ""])];
        if (made.practice?.length) body.push(`## ${sec[lang].practice}`, "", ...made.practice.flatMap((p) => [p, ""]));
        body.push(`## ${sec[lang].corr}`, "", ...made.corr.map((c) => `- ${c}`));
        files.push({
          path: `${fam.tradition}/${id}.${lang}.md`,
          text: entryFile({
            id,
            lang,
            slug: made.slug,
            title: made.title,
            aliases: made.aliases,
            tradition: fam.tradition,
            family: fam.id,
            glyph: made.glyph,
            summary: o.summary ?? `${made.title}.`,
            related: made.related,
            revised: revised ?? "2026-10-08",
            body,
          }),
        });
      }
    }
  }
  return { files, warnings };

  function make(group, id, lang, T) {
    const fr = lang === "fr";
    if (group === "planet-in-sign") {
      const [p, , s] = id.split("-");
      const si = SIGNS.indexOf(s);
      const text = pick(T.PLANET_IN_SIGN[p]?.[s], lang);
      if (!text) return null;
      const title = fr ? `${PLANET.fr[p]} en ${SIGN.fr[s]}` : `${PLANET.en[p]} in ${SIGN.en[s]}`;
      return {
        title,
        slug: slugify(title),
        aliases: fr ? [] : [`${SIGN.en[s]} ${PLANET.en[p]}`],
        glyph: GLYPH[p] + GLYPH[s],
        related: [p, s, `${p}-in-${SIGNS[(si + 11) % 12]}`, `${p}-in-${SIGNS[(si + 1) % 12]}`],
        meaning: [text],
        corr: [
          `${fr ? "La planète\u202f" : "The planet"}: [[${p}]]`,
          `${fr ? "Le signe\u202f" : "The sign"}: [[${s}]], [[element-${ELEMENT[si % 4]}]], [[modality-${MODALITY[si % 3]}]]`,
          `${fr ? "Le même signe, une autre planète\u202f" : "The same sign, another planet"}: ${PLANETS.filter((x) => x !== p).map((x) => `[[${x}-in-${s}|${fr ? PLANET.fr[x] : PLANET.en[x]}]]`).join(", ")}`,
        ],
      };
    }
    if (group === "planet-aspect") {
      const [a, x, b] = id.split("-");
      const pair = T.PAIR_TEXT[[a, b].sort().join("|")];
      const asp = T.ASPECT_TEXT[x];
      if (!pair || !asp) return null;
      const title = fr ? `${PLANET.fr[a]} ${ASPECT_WORD.fr[x]} ${PLANET.fr[b]}` : `${PLANET.en[a]} ${ASPECT_WORD.en[x]} ${PLANET.en[b]}`;
      return {
        title,
        slug: slugify(title),
        aliases: fr ? [] : [`${PLANET.en[a]} ${x} ${PLANET.en[b]}`].filter((s) => s !== title),
        glyph: GLYPH[a] + GLYPH[x] + GLYPH[b],
        related: [a, b, x, ...MAJOR.filter((y) => y !== x).slice(0, 2).map((y) => `${a}-${y}-${b}`)],
        meaning: [pick(pair.theme, lang), pick(pair[FAMILY_OF[x]], lang)],
        // An aspect no birth chart can hold (Mercury and Venus stay near the Sun) gets no advice for having it.
        practice: IMPOSSIBLE.has(id) ? [] : [pick(asp.inPractice, lang)],
        corr: [
          `${fr ? "Les planètes\u202f" : "The planets"}: [[${a}]], [[${b}]]`,
          `${fr ? "L’aspect\u202f" : "The aspect"}: [[${x}]] (${asp.angle})`,
          `${fr ? "Les mêmes planètes, un autre aspect\u202f" : "The same planets, another aspect"}: ${MAJOR.filter((y) => y !== x).map((y) => `[[${a}-${y}-${b}|${ASPECT_WORD[lang][y]}]]`).join(", ")}`,
        ],
      };
    }
    if (group === "planet-in-house") {
      const parts = id.split("-");
      const p = parts[0];
      const n = Number(parts[3]);
      const verb = pick(T.BODY_TEXT[p]?.inHouse, lang);
      const area = pick(T.HOUSE_TEXT[n]?.area, lang);
      if (!verb || !area) return null;
      const sentence = fr ? `En maison ${ROMAN[n]}, ${THE.fr(p)} ${verb} ${area}.` : `In the ${ordinal(n)} house, ${THE.en(p)} ${verb} ${area}.`;
      const title = fr ? `${PLANET.fr[p]} en maison ${ROMAN[n]}` : `${PLANET.en[p]} in the ${ordinal(n)} house`;
      return {
        title,
        slug: fr ? slugify(`${PLANET.fr[p]} en maison ${n}`) : slugify(title),
        aliases: fr ? [`${PLANET.fr[p]} en maison ${n}`] : [`${PLANET.en[p]} in house ${n}`],
        glyph: `${GLYPH[p]}${n}`,
        related: [p, `house-${n}`, `${p}-in-house-${n === 1 ? 12 : n - 1}`, `${p}-in-house-${n === 12 ? 1 : n + 1}`],
        meaning: [sentence.charAt(0).toUpperCase() + sentence.slice(1)],
        corr: [
          `${fr ? "La planète\u202f" : "The planet"}: [[${p}]]`,
          `${fr ? "La maison\u202f" : "The house"}: [[house-${n}]]`,
          `${fr ? "La même maison, une autre planète\u202f" : "The same house, another planet"}: ${PLANETS.filter((x) => x !== p).map((x) => `[[${x}-in-house-${n}|${fr ? PLANET.fr[x] : PLANET.en[x]}]]`).join(", ")}`,
        ],
      };
    }
    if (group === "angle-in-sign") {
      const [a, , s] = id.split("-");
      const text = pick(T.SIGN_TEXT[s]?.[a === "ascendant" ? "rising" : "midheaven"], lang);
      if (!text) return null;
      const angle = a === "ascendant" ? (fr ? "Ascendant" : "Ascendant") : fr ? "Milieu du Ciel" : "Midheaven";
      const title = fr ? `${angle} en ${SIGN.fr[s]}` : `${angle} in ${SIGN.en[s]}`;
      return {
        title,
        slug: slugify(title),
        aliases: fr ? [] : a === "ascendant" ? [`${SIGN.en[s]} rising`, `${SIGN.en[s]} Ascendant`] : [`${SIGN.en[s]} Midheaven`],
        glyph: (a === "ascendant" ? "AC" : "MC") + GLYPH[s],
        related: [a, s],
        meaning: [text],
        corr: [`${fr ? "L’angle\u202f" : "The angle"}: [[${a}]]`, `${fr ? "Le signe\u202f" : "The sign"}: [[${s}]]`],
      };
    }
    if (group === "planet-angle") {
      const [p, , a] = id.split("-");
      const t = T.ANGLE_PAIR_TEXT[`${a}|${p}`];
      if (!t) return null;
      const angle = a === "ascendant" ? (fr ? "l’Ascendant" : "the Ascendant") : fr ? "le Milieu du Ciel" : "the Midheaven";
      const title = fr ? `${PLANET.fr[p]} et ${angle}` : `${PLANET.en[p]} and ${angle}`;
      return {
        title,
        slug: slugify(title),
        aliases: fr ? [] : [`${PLANET.en[p]} on ${angle}`],
        glyph: GLYPH[p] + (a === "ascendant" ? "AC" : "MC"),
        related: [p, a],
        meaning: [pick(t.theme, lang)],
        corr: [`${fr ? "La planète\u202f" : "The planet"}: [[${p}]]`, `${fr ? "L’angle\u202f" : "The angle"}: [[${a}]]`],
      };
    }
    if (group === "number-in-place") {
      const n = Number(id.split("-").pop());
      const place = PLACES.find((pl) => id === `${PLACE_SLUG[pl]}-${n}`);
      const text = pick(T.PLACE_TEXT[place]?.[n], lang);
      if (!text) return null;
      const title = `${PLACE[lang][place]} ${n}`;
      return {
        title,
        slug: slugify(title),
        aliases: [],
        glyph: String(n),
        related: [PLACE_ENTRY[place], `number-${n}`],
        meaning: [text],
        corr: [
          `${fr ? "La position\u202f" : "The position"}: [[${PLACE_ENTRY[place]}]]`,
          `${fr ? "Le nombre\u202f" : "The number"}: [[number-${n}]]`,
          `${fr ? "Le même nombre ailleurs\u202f" : "The same number elsewhere"}: ${PLACES.filter((x) => x !== place && !(x === "birthday" && n === 33)).map((x) => `[[${PLACE_SLUG[x]}-${n}|${PLACE[lang][x]}]]`).join(", ")}`,
        ],
      };
    }
    return null;
  }
}
