/*
 * The pages of the sixty pillars and of the thirty Na Yin (encyclopedia plan, part 25; the writers'
 * guide, section 1): combination pages, as part 23's setup decided, assembled from what Ulune
 * already holds, with a short opening written for each. combinations.mjs's Chinese frame
 * (CHINESE_MAKERS) calls the two makers below for every row of the writers' manifest in each
 * language, and puts the opening (content/encyclopedia/combinations/pillar.<n>.<lang>.md and
 * na-yin.<n>.<lang>.md) first under Meaning.
 *
 *   - A pillar: its stem and its branch, by the images the readings give them (the Day Master's,
 *     bazi-texts.ts; the animal's portrait, zodiac-texts.ts) and the way their phases meet; the
 *     zodiac's reading of its year (zodiac-texts.ts PAIR_TEXTS); its Na Yin; what it is as a year
 *     (the years of the 1800–2200 table), a month (the five tigers), a day (the day count of
 *     day-cycle.ts) and an hour (the five rats); as a day pillar, the gods of its branch's hidden
 *     stems for its own stem, and that stem's life stage there; its ten-day week and the two
 *     branches it leaves empty; its Ten-God frame, what its stem and its branch's main qi are to
 *     each of the ten Day Masters; and its names in Japan, Korea and Vietnam, made from those the
 *     stems' and branches' own pages give.
 *   - A Na Yin: its two pillars, its phase and what that phase is to each Day Master's (the
 *     board's reading, bazi-texts.ts FAMILY_NAMES), its years, the other Na Yin of its phase, and
 *     the tradition's arithmetic of its phase (the numbers of its four characters).
 *
 * Facts come from the engine (names.ts, bazi-signs.ts, day-cycle.ts) and names from the manifest;
 * scripts/encyclopedia-chinese.test.mjs checks the pages against bazi.ts, bazi-signs.ts, lunar.ts
 * and pillars.ts to the character. Plain JavaScript: the engine's modules come in as T, read
 * fresh by the frame on each build.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readManifest } from "./chinese.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const NB = "\u202f";

/**
 * The modules of src/lib/chinese the makers read, merged by the frame into T in this order:
 * bazi-texts.ts's FAMILY_NAMES (the god families' names, as the board's key says them) comes last
 * and is the one T holds (names.ts has a FAMILY_NAMES of its own, which the makers do not use).
 */
export const PILLAR_TEXTS = ["names.ts", "bazi-signs.ts", "day-cycle.ts", "zodiac-texts.ts", "bazi-texts.ts"];

/** The years of the time table the pages count in (terms.ts: Swiss Ephemeris, 1800 to 2200). */
export const TABLE_YEARS = [1800, 2200];
/** The year whose days a pillar's page lists. */
export const DAYS_YEAR = 2026;
/** The decade whose solar years a pillar's month names. */
const MONTH_DECADE = 2020;

/** The Ten Gods in bazi.ts's order: each family, the same polarity first. */
export const TEN_GODS = ["companion", "rob-wealth", "eating-god", "hurting-officer", "indirect-wealth", "direct-wealth", "seven-killings", "direct-officer", "indirect-resource", "direct-resource"];
const FAMILIES = ["peer", "output", "wealth", "power", "resource"];
const PHASE_ORDER = ["wood", "fire", "earth", "metal", "water"];

/**
 * The numbers of the stems and branches the tradition gives the Na Yin's arithmetic (Yang Xiong's
 * Taixuan: 甲己子午 9, 乙庚丑未 8, 丙辛寅申 7, 丁壬卯酉 6, 戊癸辰戌 5, 巳亥 4), and the phase of a
 * last digit (1 and 6 Water, 2 and 7 Fire, 3 and 8 Wood, 4 and 9 Metal, 5 and 0 Earth). For the
 * four characters of a Na Yin's two pillars, 49 less their sum gives a phase, and the Na Yin's is
 * the one it produces: the test checks the thirty against names.ts.
 */
export const STEM_NUMBER = [9, 8, 7, 6, 5, 9, 8, 7, 6, 5];
export const BRANCH_NUMBER = [9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4];
const DIGIT_PHASE = ["earth", "water", "fire", "wood", "metal", "earth", "water", "fire", "wood", "metal"];

/** The phase the tradition's arithmetic gives the Na Yin of the n-th two pillars (0–29). */
export function naYinArithmetic(n, SIXTY) {
  const a = SIXTY[2 * n];
  const b = SIXTY[2 * n + 1];
  const sum = STEM_NUMBER[a.stem] + BRANCH_NUMBER[a.branch] + STEM_NUMBER[b.stem] + BRANCH_NUMBER[b.branch];
  const rest = 49 - sum;
  const base = DIGIT_PHASE[rest % 10];
  return { sum, rest, base, phase: PHASE_ORDER[(PHASE_ORDER.indexOf(base) + 1) % 5] };
}

/** The Ten God a stem is to a Day Master, as bazi.ts's tenGodOf finds it: the steps between their phases along the generating cycle, and whether their polarities agree. */
export function godOf(dm, stem, STEMS) {
  const a = STEMS[dm];
  const b = STEMS[stem];
  const step = (PHASE_ORDER.indexOf(b.phase) - PHASE_ORDER.indexOf(a.phase) + 5) % 5;
  return TEN_GODS[step * 2 + (a.polarity === b.polarity ? 0 : 1)];
}

/** The family of a phase to a Day Master's phase (bazi.ts's familyOf). */
const familyOf = (dmPhase, phase) => FAMILIES[(PHASE_ORDER.indexOf(phase) - PHASE_ORDER.indexOf(dmPhase) + 5) % 5];

/** A pillar's month: its solar month (0 = the Tiger month from Lichun) and the year stems whose year holds it (the five tigers, pillars.ts). */
export function monthOf(k, SIXTY) {
  const b = SIXTY[k].branch;
  const m = (b + 10) % 12;
  // pillars.ts: the month pillar of solar month m in the year y is the cycle's 12(y − 1984) + m + 2.
  const r = [0, 1, 2, 3, 4].find((x) => (((12 * x + m + 2) % 60) + 60) % 60 === k);
  return { index: m, stems: [r, r + 5], years: Array.from({ length: 10 }, (_, i) => MONTH_DECADE + i).filter((y) => (((y - 1984) % 5) + 5) % 5 === r) };
}

/** A pillar's hour: its branch's double hour, on the days whose stem is one of these two (the five rats, pillars.ts: the hour pillar is the cycle's 12 × day + branch). */
export function hourOf(k, SIXTY) {
  const b = SIXTY[k].branch;
  const r = [0, 1, 2, 3, 4].find((x) => (((12 * x + b) % 60) + 60) % 60 === k);
  return { branch: b, stems: [r, r + 5] };
}

/** The years 1800–2200 whose year pillar this is, each from its Lichun (lunar.ts's yearCycleOf: 1984 is Jia Zi). */
export const yearsOf = (k) => {
  const out = [];
  for (let y = TABLE_YEARS[0]; y <= TABLE_YEARS[1]; y += 1) if ((((y - 1984) % 60) + 60) % 60 === k) out.push(y);
  return out;
};

/** The days of a year whose day pillar this is, as [month, day]. */
function daysOf(k, year, dayCycleOf) {
  const out = [];
  for (let m = 1; m <= 12; m += 1) {
    const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
    for (let d = 1; d <= last; d += 1) if (dayCycleOf(year, m, d) === k) out.push([m, d]);
  }
  return out;
}

const MONTH_NAMES = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
};
const dateOf = ([m, d], lang) => (lang === "fr" ? `${d === 1 ? "1er" : d} ${MONTH_NAMES.fr[m - 1]}` : `${d} ${MONTH_NAMES.en[m - 1]}`);

/** "a, b and c", « a, b et c ». */
const andList = (items, lang) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${lang === "fr" ? "et" : "and"} ${items.at(-1)}`);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const ordinalEn = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
const ordinal = (n, lang) => (lang === "fr" ? (n === 1 ? "1er" : `${n}e`) : ordinalEn(n));
/** The first sentence of a text. */
const firstSentence = (s) => {
  const i = s.indexOf(". ");
  return i < 0 ? s : s.slice(0, i + 1);
};
const pad = (n) => String(n).padStart(2, "0");

/** A phase inside a French sentence: its name, with its article, and partitive. */
const PHASE_FR = {
  wood: { name: "Bois", the: "le Bois", some: "du Bois" },
  fire: { name: "Feu", the: "le Feu", some: "du Feu" },
  earth: { name: "Terre", the: "la Terre", some: "de la Terre" },
  metal: { name: "Métal", the: "le Métal", some: "du Métal" },
  water: { name: "Eau", the: "l’Eau", some: "de l’Eau" },
};
const PHASE_EN = { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" };
/** A Ten God after "the" in French, and after "its". */
const GOD_FR = {
  companion: ["le", "son"],
  "rob-wealth": ["le", "son"],
  "eating-god": ["le", "son"],
  "hurting-officer": ["l’", "son"],
  "indirect-wealth": ["la", "sa"],
  "direct-wealth": ["la", "sa"],
  "seven-killings": ["les", "ses"],
  "direct-officer": ["l’", "son"],
  "indirect-resource": ["la", "sa"],
  "direct-resource": ["la", "sa"],
};

let cache = null;
/** The manifest's rows by id, and the Na Yin rows in the engine's order (read again when the manifest changes). */
function manifest() {
  const m = readManifest();
  if (!cache || cache.m !== m) {
    const entries = m?.entries ?? [];
    cache = { m, rows: new Map(entries.map((e) => [e.id, e])), naYin: entries.filter((e) => e.terms === "na-yin" && e.kind === "combination"), pillars: entries.filter((e) => e.terms === "pillar" && e.kind === "combination") };
  }
  return cache;
}
const title = (id, lang) => manifest().rows.get(id)?.title[lang] ?? id;
/** A pillar's or a stem's name, the part of its title before " · " ("Jia Zi", "Jia"). */
const nameOf = (id, lang) => title(id, lang).split(" · ")[0];

/**
 * The names a stem and a branch go by in Japan, Korea and Vietnam, as their own pages give them
 * (content/encyclopedia/chinese/stem-jia.en.md: "| Japanese, Korean, Vietnamese | Kinoe, gap, Giáp |"),
 * or null when a page does not.
 */
const eastNames = new Map();
function eastOf(id) {
  const file = join(ROOT, "content/encyclopedia/chinese", `${id}.en.md`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  const key = `${id} ${text.length}`;
  if (!eastNames.has(key)) {
    const m = /^\| Japanese, Korean, Vietnamese \| ([^|]+?) \|$/m.exec(text);
    const parts = m ? m[1].split(",").map((s) => s.trim()) : null;
    eastNames.set(key, parts?.length === 3 ? parts : null);
  }
  return eastNames.get(key);
}

/** A pillar's names in Japan, Korea and Vietnam, made from its stem's and branch's: kinoe-ne, gapja, Giáp Tý. */
export function eastPillar(stemId, branchId) {
  const s = eastOf(`stem-${stemId}`);
  const b = eastOf(`branch-${branchId}`);
  if (!s || !b) return null;
  // Korean joins the two syllables, with a hyphen before a vowel (byeong-in, gyeong-o).
  const korean = `${s[1].toLowerCase()}${/^[aeiou]/i.test(b[1]) ? "-" : ""}${b[1].toLowerCase()}`;
  return { japanese: `${s[0].toLowerCase()}-${b[0].toLowerCase()}`, korean, vietnamese: `${s[2]} ${b[2]}` };
}

/** What the pillar pages draw on, in each language. */
const PILLAR_SOURCES = {
  en: [
    "Sima Qian, Shiji, c. 94 BC",
    "Ban Gu, Hanshu, 1st century",
    "Xu Sheng (ed.), Yuanhai Ziping, Song dynasty",
    "Wan Minying, San Ming Tong Hui, 16th century",
    "Joseph Needham, Science and Civilisation in China, vol. 3, 1959",
  ],
  fr: [
    "Sima Qian, Shiji (Mémoires historiques), v. 94 av. J.-C.",
    "Ban Gu, Hanshu (Livre des Han), Ier siècle",
    "Xu Sheng (dir.), Yuanhai Ziping, dynastie Song",
    "Wan Minying, San Ming Tong Hui, XVIe siècle",
    "Joseph Needham, Science and Civilisation in China, vol. 3, 1959",
  ],
};
const NA_YIN_SOURCES = {
  en: [
    "Yang Xiong, Taixuan Jing, c. AD 2",
    "Xiao Ji, Wuxing Dayi, c. 600",
    "Shen Kuo, Mengxi Bitan, 1088",
    "Wan Minying, San Ming Tong Hui, 16th century",
    "Ho Peng Yoke, Chinese Mathematical Astrology, 2003",
  ],
  fr: [
    "Yang Xiong, Taixuan Jing, v. 2 apr. J.-C.",
    "Xiao Ji, Wuxing Dayi, v. 600",
    "Shen Kuo, Mengxi Bitan, 1088",
    "Wan Minying, San Ming Tong Hui, XVIe siècle",
    "Ho Peng Yoke, Chinese Mathematical Astrology, 2003",
  ],
};

/* ------------------------------------------------------------------ the sixty pillars */

/** The page of one of the sixty pillars (a manifest row "pillar-jia-zi"). */
export function makePillar(row, lang, T) {
  const { SIXTY, STEMS, BRANCHES, HIDDEN_STEMS, NA_YIN, SOLAR_TERMS, stageOf, emptyBranchesOf, dayCycleOf, PAIR_TEXTS, ANIMAL_PORTRAITS, DAY_MASTER_IMAGES } = T;
  const fr = lang === "fr";
  const k = SIXTY.findIndex((p) => `pillar-${p.id}` === row.id);
  if (k < 0) return null;
  const p = SIXTY[k];
  const stem = STEMS[p.stem];
  const branch = BRANCHES[p.branch];
  const say = (pair) => pair[fr ? 1 : 0];
  const S = (i) => nameOf(`stem-${STEMS[i].id}`, lang);
  const B = (i) => nameOf(`branch-${BRANCHES[i].id}`, lang);
  const P = (i) => nameOf(`pillar-${SIXTY[((i % 60) + 60) % 60].id}`, lang);
  const pillarLink = (i) => `[[pillar-${SIXTY[((i % 60) + 60) % 60].id}|${P(i)}]]`;
  const stemLink = (i) => `[[stem-${STEMS[i].id}|${S(i)}]]`;
  const branchLink = (i) => `[[branch-${BRANCHES[i].id}|${B(i)}]]`;
  const animalId = `animal-${manifest().rows.get(`branch-${branch.id}`)?.related?.find((r) => r.startsWith("animal-"))?.slice(7) ?? ""}`;
  const animal = title(animalId, lang);
  // The Goat is the one feminine animal in French (« la Chèvre »), as words.ts says.
  const goat = animalId === "animal-goat";
  const god = (id) => title(`ten-god-${id}`, lang);
  const godLink = (id) => `[[ten-god-${id}|${god(id)}]]`;
  const self = nameOf(row.id, lang);
  const ny = NA_YIN[Math.floor(k / 2)];
  const nyRow = manifest().naYin[Math.floor(k / 2)];
  const twin = k % 2 ? k - 1 : k + 1;
  const phaseWord = (ph) => (fr ? PHASE_FR[ph].name : PHASE_EN[ph]);
  const stemPhrase = (s) => (fr ? `${PHASE_FR[s.phase].some} ${s.polarity}` : `${s.polarity} ${PHASE_EN[s.phase]}`);
  const stage = stageOf(p.stem, p.branch);
  const stageLink = `[[life-stage-${stage.id}|${fr ? `stade ${stage.fr}` : `${stage.en} stage`}]]`;

  // Meaning: the two parts and how their phases meet; their images; the zodiac's year; the Na Yin.
  const rel = ((PHASE_ORDER.indexOf(stem.phase) - PHASE_ORDER.indexOf(branch.phase)) % 5 + 5) % 5;
  const sp = stem.phase;
  const bp = branch.phase;
  const relation = fr
    ? [
        `un tronc posé sur sa propre phase`,
        `un tronc que sa branche produit, comme ${PHASE_FR[bp].the} produit ${PHASE_FR[sp].the}`,
        `un tronc que sa branche contrôle, comme ${PHASE_FR[bp].the} contrôle ${PHASE_FR[sp].the}`,
        `un tronc qui contrôle sa branche, comme ${PHASE_FR[sp].the} contrôle ${PHASE_FR[bp].the}`,
        `un tronc qui produit sa branche, comme ${PHASE_FR[sp].the} produit ${PHASE_FR[bp].the}`,
      ][rel]
    : [
        "a stem standing on its own phase",
        `a stem its branch produces, as ${PHASE_EN[bp]} produces ${PHASE_EN[sp]}`,
        `a stem its branch controls, as ${PHASE_EN[bp]} controls ${PHASE_EN[sp]}`,
        `a stem that controls its branch, as ${PHASE_EN[sp]} controls ${PHASE_EN[bp]}`,
        `a stem that produces its branch, as ${PHASE_EN[sp]} produces ${PHASE_EN[bp]}`,
      ][rel];
  const branchPhrase = fr ? `${PHASE_FR[bp].some} ${branch.polarity}` : `${branch.polarity} ${PHASE_EN[bp]}`;
  const parts = fr
    ? `${stemLink(p.stem)} sur ${branchLink(p.branch)}${NB}: ${stemPhrase(stem)} sur ${branchPhrase}, ${relation}.`
    : `${stemLink(p.stem)} over ${branchLink(p.branch)}: ${stemPhrase(stem)} over ${branchPhrase}, ${relation}.`;
  const images = `${firstSentence(say(DAY_MASTER_IMAGES[p.stem]))} ${firstSentence(say(ANIMAL_PORTRAITS[p.branch].portrait))}`;
  const pairName = fr ? `${animal} ${/^[AEIOUÉ]/.test(PHASE_FR[sp].name) ? "d’" : "de "}${PHASE_FR[sp].name}` : `${PHASE_EN[sp]} ${animal}`;
  const zodiac = fr
    ? `Le zodiaque lit une année ${self} comme celle ${goat ? "de la" : "du"} ${pairName}. ${say(PAIR_TEXTS[`${p.branch}:${sp}`])}`
    : `The zodiac reads a ${self} year as the ${pairName}’s. ${say(PAIR_TEXTS[`${p.branch}:${sp}`])}`;
  const nyName = title(nyRow.id, lang);
  const sounds = fr
    ? `${rel === 0 ? `${PHASE_FR[sp].some} du pilier` : `${PHASE_FR[sp].some} et ${PHASE_FR[bp].some} du pilier`}`
    : `${rel === 0 ? `the pillar’s ${PHASE_EN[sp]}` : `the pillar’s ${PHASE_EN[sp]} and ${PHASE_EN[bp]}`}`;
  const naYin = fr
    ? `Son [[na-yin|Na Yin]], partagé avec ${pillarLink(twin)}, est [[${nyRow.id}|${nyName}]] (${ny.hant} ${ny.pinyin})${NB}: un son ${/^[AEIOUÉ]/.test(PHASE_FR[ny.phase].name) ? "d’" : "de "}${PHASE_FR[ny.phase].name}, entendu à côté ${sounds}.`
    : `Its [[na-yin|Na Yin]], shared with ${pillarLink(twin)}, is [[${nyRow.id}|${nyName}]] (${ny.hant} ${ny.pinyin}): a sound of ${PHASE_EN[ny.phase]}, heard beside ${sounds}.`;

  // In practice: as a year, a month, a day, an hour; as a day pillar; as a luck pillar or a year.
  const years = yearsOf(k);
  const month = monthOf(k, SIXTY);
  const jie = SOLAR_TERMS[2 * month.index];
  const jieLink = `[[solar-term-${jie.id}|${title(`solar-term-${jie.id}`, lang)}]]`;
  const days = daysOf(k, DAYS_YEAR, dayCycleOf).map((d) => dateOf(d, lang));
  const hour = hourOf(k, SIXTY);
  const [h0, h1] = BRANCHES[hour.branch].hours;
  const hours = fr ? `de ${h0}${NB}h à ${h1}${NB}h` : `${pad(h0)}:00–${pad(h1)}:00`;
  const hidden = HIDDEN_STEMS[p.branch];
  const hiddenGods = hidden.map((h) => godOf(p.stem, h.stem, STEMS));
  const ofAnimal = fr ? `${goat ? "de la" : "du"} ${animal}` : `the ${animal}’s`;
  const lichun = `[[solar-term-lichun|Lichun]]`;
  const practice = fr
    ? [
        `- **Comme année**, depuis ${lichun}, vers le 4 février${NB}: ${andList(years.map(String), lang)}, dans la table de 1800 à 2200.`,
        `- **Comme mois**${NB}: le mois ${ofAnimal} de chaque année ${S(month.stems[0])} ou ${S(month.stems[1])}, ouvert par ${jieLink}, ainsi dans les années solaires ${andList(month.years.map(String), lang)}.`,
        `- **Comme jour**, tous les soixante jours${NB}: en ${DAYS_YEAR}, le ${andList(days, lang).replace(/, /g, ", le ").replace(/ et /, " et le ")}.`,
        `- **Comme heure**${NB}: la double heure ${ofAnimal}, ${hours}, des jours ${S(hour.stems[0])} et ${S(hour.stems[1])}${hour.branch === 0 ? `, dont elle est la première heure${NB}: par défaut, le jour d’Ulune commence à 23${NB}h` : ""}.`,
        `- **Comme pilier du jour**, son tronc est le [[day-master|Maître du jour]], ${S(p.stem)}, assis sur ${B(p.branch)}, le [[partner-palace|palais du partenaire]]${NB}: ${B(p.branch)} contient ${andList(hidden.map((h) => stemLink(h.stem)), lang)}, ${andList(hiddenGods.map((g) => `${GOD_FR[g][0]}${GOD_FR[g][0].endsWith("’") ? "" : " "}${`[[ten-god-${g}|${god(g)}]]`}`), lang)} de ${S(p.stem)}, et ${S(p.stem)} y est au ${stageLink}.`,
        `- **Comme pilier de chance ou année**, il apporte à chaque Maître du jour le dieu de son tronc et celui du qi principal de sa branche${NB}: les correspondances ci-dessous les donnent pour les dix.`,
      ]
    : [
        `- **As a year**, from ${lichun}, around 4 February: ${andList(years.map(String), lang)}, in the 1800–2200 table.`,
        `- **As a month**: ${ofAnimal.replace(/’s$/, "")} month of every ${S(month.stems[0])} or ${S(month.stems[1])} year, opened by ${jieLink}, as in the solar years ${andList(month.years.map(String), lang)}.`,
        `- **As a day**, every sixty days: in ${DAYS_YEAR}, on ${andList(days, lang)}.`,
        `- **As an hour**: ${ofAnimal} double hour, ${hours}, of ${S(hour.stems[0])} and ${S(hour.stems[1])} days${hour.branch === 0 ? ", whose first hour it is: by default Ulune’s day begins at 23:00" : ""}.`,
        `- **As a day pillar**, its stem is the [[day-master|Day Master]], ${S(p.stem)}, sitting on ${B(p.branch)}, the [[partner-palace|partner palace]]: ${B(p.branch)} holds ${andList(hidden.map((h) => stemLink(h.stem)), lang)}, ${S(p.stem)}’s ${andList(hiddenGods.map(godLink), lang)}, and ${S(p.stem)} stands at its ${stageLink} there.`,
        "- **As a luck pillar or a year**, it brings each Day Master the god of its stem and the god of its branch’s main qi: the Correspondences below give them for all ten.",
      ];

  // Across traditions: its names in Japan, Korea and Vietnam.
  const east = eastPillar(stem.id, branch.id);
  const traditions = east
    ? [
        fr
          ? `- **Au Japon, en Corée et au Viêt Nam**, le même pilier se dit ${east.japanese}, ${east.korean} et ${east.vietnamese}, avec les lectures de ${stem.hant} et de ${branch.hant} propres à chaque langue.`
          : `- **In Japan, Korea and Vietnam** the same pillar is ${east.japanese}, ${east.korean} and ${east.vietnamese}, with each language’s readings of ${stem.hant} and ${branch.hant}.`,
      ]
    : [];

  // How Ulune calculates it: its place, the counts of the year, month, day and hour, its week.
  const week = k - (k % 10);
  const empty = emptyBranchesOf(k);
  const calculation = [
    fr
      ? `${self} est le ${ordinal(k + 1, lang)} des soixante piliers${NB}: le ${ordinal(p.stem + 1, lang)} des dix troncs sur la ${ordinal(p.branch + 1, lang).replace(/^1er$/, "1re")} des douze branches, que le cycle avance d’un pas ensemble, si bien qu’un tronc ne rencontre que les branches de sa polarité. Ulune compte le pilier d’une année depuis Lichun, 1984 étant Jia Zi${NB}; celui d’un mois douze par an à travers le cycle, depuis Bing Yin au mois du Tigre de 1984 (la règle des cinq tigres)${NB}; celui d’un jour par le compte des jours, le 1er janvier 2000 étant Wu Wu${NB}; celui d’une heure douze par jour (la règle des cinq rats).`
      : `${self} is the ${ordinal(k + 1, lang)} of the sixty pillars: the ${ordinal(p.stem + 1, lang)} of the ten stems over the ${ordinal(p.branch + 1, lang)} of the twelve branches, which the cycle moves on one step together, so that a stem only ever meets the branches of its polarity. Ulune counts a year’s pillar from Lichun, 1984 being Jia Zi; a month’s twelve a year through the cycle, from Bing Yin in the Tiger month of 1984 (the rule of the five tigers); a day’s by the count of days, 1 January 2000 being Wu Wu; an hour’s twelve a day (the rule of the five rats).`,
    fr
      ? `${k % 10 === 0 ? `${self} ouvre` : `${self} appartient à`} la décade de ${P(week)} à ${P(week + 9)}, dont les troncs rencontrent les branches de ${B(SIXTY[week].branch)} à ${B(SIXTY[week + 9].branch)} et laissent de côté ${B(empty[0])} et ${B(empty[1])}${NB}: pour un pilier du jour de cette décade, ce sont les [[empty-branches|branches vides]]. Son Na Yin est le ${ordinal(Math.floor(k / 2) + 1, lang)} des trente, un pour chaque couple de piliers.`
      : `${self} ${k % 10 === 0 ? "opens" : "belongs to"} the ten-day week from ${P(week)} to ${P(week + 9)}, whose stems meet the branches from ${B(SIXTY[week].branch)} to ${B(SIXTY[week + 9].branch)} and leave out ${B(empty[0])} and ${B(empty[1])}: for a day pillar of this week, those are the [[empty-branches|empty branches]]. Its Na Yin is the ${ordinal(Math.floor(k / 2) + 1, lang)} of the thirty, one for each two pillars.`,
  ];

  // Correspondences.
  const frame = (target) => STEMS.map((_, dm) => `${S(dm)} → ${god(godOf(dm, target, STEMS))}`).join(", ");
  const head = fr ? `| Correspondance | ${self} |` : `| Correspondence | ${self} |`;
  const hiddenCell = hidden.map((h) => `${stemLink(h.stem)} ${h.weight}`).join(", ");
  const relWords = fr
    ? [`${cap(PHASE_FR[sp].name)} sur ${PHASE_FR[bp].name}, une seule phase`, `${cap(PHASE_FR[bp].the)} produit ${PHASE_FR[sp].the}`, `${cap(PHASE_FR[bp].the)} contrôle ${PHASE_FR[sp].the}`, `${cap(PHASE_FR[sp].the)} contrôle ${PHASE_FR[bp].the}`, `${cap(PHASE_FR[sp].the)} produit ${PHASE_FR[bp].the}`][rel]
    : [`${PHASE_EN[sp]} over ${PHASE_EN[bp]}, one phase`, `${PHASE_EN[bp]} produces ${PHASE_EN[sp]}`, `${PHASE_EN[bp]} controls ${PHASE_EN[sp]}`, `${PHASE_EN[sp]} controls ${PHASE_EN[bp]}`, `${PHASE_EN[sp]} produces ${PHASE_EN[bp]}`][rel];
  const rowsEn = [
    `| Characters, pinyin | ${p.hant} ${p.pinyin} |`,
    `| Place in the cycle | ${k + 1} of 60 |`,
    `| Stem | ${stemLink(p.stem)}, ${stemPhrase(stem)} |`,
    `| Branch | ${branchLink(p.branch)}, the [[${animalId}|${animal}]], ${branchPhrase} |`,
    `| Hidden in the branch | ${hiddenCell} |`,
    `| Stem and branch | ${relWords} |`,
    `| Na Yin | [[${nyRow.id}|${nyName}]], with ${pillarLink(twin)} |`,
    `| Its stem’s stage in its branch | [[life-stage-${stage.id}|${stage.en}]] |`,
    `| Ten-day week | ${P(week)} to ${P(week + 9)}; empty branches ${B(empty[0])} and ${B(empty[1])} |`,
    `| Its stem, for each Day Master | ${frame(p.stem)} |`,
    `| Its branch’s main qi, for each Day Master | ${frame(hidden[0].stem)} |`,
    `| Years, 1800–2200 | ${years.join(", ")} |`,
    `| Month | ${animal} month of ${S(month.stems[0])} and ${S(month.stems[1])} years |`,
    `| Hour | ${animal} hour, ${hours}, of ${S(hour.stems[0])} and ${S(hour.stems[1])} days |`,
    `| Before and after | ${pillarLink(k - 1)}, ${pillarLink(k + 1)} |`,
    ...(east ? [`| Japanese, Korean, Vietnamese | ${cap(east.japanese)}, ${east.korean}, ${east.vietnamese} |`] : []),
  ];
  const rowsFr = [
    `| Caractères, pinyin | ${p.hant} ${p.pinyin} |`,
    `| Place dans le cycle | ${k + 1} sur 60 |`,
    `| Tronc | ${stemLink(p.stem)}, ${PHASE_FR[stem.phase].name} ${stem.polarity} |`,
    `| Branche | ${branchLink(p.branch)}, ${goat ? "la" : "le"} [[${animalId}|${animal}]], ${PHASE_FR[bp].name} ${branch.polarity} |`,
    `| Caché dans la branche | ${hiddenCell} |`,
    `| Tronc et branche | ${relWords} |`,
    `| Na Yin | [[${nyRow.id}|${nyName}]], avec ${pillarLink(twin)} |`,
    `| Stade de son tronc dans sa branche | [[life-stage-${stage.id}|${stage.fr}]] |`,
    `| Décade | De ${P(week)} à ${P(week + 9)}${NB}; branches vides ${B(empty[0])} et ${B(empty[1])} |`,
    `| Son tronc, pour chaque Maître du jour | ${frame(p.stem)} |`,
    `| Le qi principal de sa branche, pour chaque Maître du jour | ${frame(hidden[0].stem)} |`,
    `| Années, 1800–2200 | ${years.join(", ")} |`,
    `| Mois | Mois ${ofAnimal} des années ${S(month.stems[0])} et ${S(month.stems[1])} |`,
    `| Heure | Heure ${ofAnimal}, ${hours}, des jours ${S(hour.stems[0])} et ${S(hour.stems[1])} |`,
    `| Avant et après | ${pillarLink(k - 1)}, ${pillarLink(k + 1)} |`,
    ...(east ? [`| Japonais, coréen, vietnamien | ${cap(east.japanese)}, ${east.korean}, ${east.vietnamese} |`] : []),
  ];

  return {
    sections: {
      meaning: [parts, images, zodiac, naYin],
      practice,
      traditions,
      calculation,
      correspondences: [head, "| --- | --- |", ...(fr ? rowsFr : rowsEn)],
    },
    related: row.related,
    sources: PILLAR_SOURCES[lang],
  };
}

/* ------------------------------------------------------------------ the thirty Na Yin */

/** The page of one of the thirty Na Yin (a manifest row "na-yin-haizhong-jin"). */
export function makeNaYin(row, lang, T) {
  const { SIXTY, NA_YIN, FAMILY_NAMES } = T;
  if (!FAMILY_NAMES?.peer) throw new Error("pillars.mjs: T.FAMILY_NAMES is not bazi-texts.ts's (PILLAR_TEXTS's order)");
  const fr = lang === "fr";
  const list = manifest().naYin;
  const n = list.findIndex((r) => r.id === row.id);
  if (n < 0) return null;
  const ny = NA_YIN[n];
  const say = (pair) => pair[fr ? 1 : 0];
  const P = (i) => nameOf(`pillar-${SIXTY[i].id}`, lang);
  const pillarLink = (i) => `[[pillar-${SIXTY[i].id}|${P(i)}]]`;
  const a = 2 * n;
  const b = 2 * n + 1;
  const name = title(row.id, lang);
  const phase = fr ? PHASE_FR[ny.phase] : null;
  const phaseLink = fr ? `[[phase-${ny.phase}|${phase.name}]]` : `[[phase-${ny.phase}|${PHASE_EN[ny.phase]}]]`;
  const same = list.map((r, i) => ({ r, i })).filter(({ i }) => i !== n && NA_YIN[i].phase === ny.phase);
  const naYinLink = (i) => `[[${list[i].id}|${title(list[i].id, lang)}]]`;
  const meaning = fr
    ? [
        `C’est le Na Yin de deux piliers qui se suivent, ${pillarLink(a)} et ${pillarLink(b)}, le ${ordinal(n + 1, lang)} des trente${NB}: un son ${/^[AEIOUÉ]/.test(phase.name) ? "d’" : "de "}${phaseLink}. Le [[na-yin|Na Yin]] donne à chaque couple de piliers du cycle de soixante une image et une phase, qui s’entendent à côté des troncs et des branches.`,
        `${cap(PHASE_FR[ny.phase].the)} sonne dans six des trente${NB}: outre celui-ci, ${andList(same.map(({ i }) => naYinLink(i)), lang)}.`,
      ]
    : [
        `It is the Na Yin of two pillars that follow each other, ${pillarLink(a)} and ${pillarLink(b)}, the ${ordinal(n + 1, lang)} of the thirty: a sound of ${phaseLink}. The [[na-yin|Na Yin]] gives each two pillars of the sixty-cycle an image and a phase, heard beside their stems and branches.`,
        `${PHASE_EN[ny.phase]} sounds in six of the thirty: besides this one, ${andList(same.map(({ i }) => naYinLink(i)), lang)}.`,
      ];
  const years = yearsOf(a).map((y) => `${y}–${y + 1}`);
  // Its two pillars by their full names ("the Yang Fire Horse"), and their stems' phases beside the sound's.
  const full = (i) => title(`pillar-${SIXTY[i].id}`, lang).split(" · ")[1];
  // The two pillars' stems are always of one phase (Jia and Yi, Bing and Ding…).
  const stemPhase = T.STEMS[SIXTY[a].stem].phase;
  const of = (ph) => (/^[AEIOUÉ]/.test(PHASE_FR[ph].name) ? `d’${PHASE_FR[ph].name}` : `de ${PHASE_FR[ph].name}`);
  const twoEn = `- **Its two pillars**, ${P(a)}, the ${full(a)}, and ${P(b)}, the ${full(b)}: a ${PHASE_EN[ny.phase]} sound for two ${PHASE_EN[stemPhase]} stems, the Na Yin being a layer of its own beside the stem and the branch.`;
  const the = (s) => (/^Chèvre/.test(s) ? "la " : "le ");
  const twoFr = `- **Ses deux piliers**, ${P(a)}, ${the(full(a))}${full(a)}, et ${P(b)}, ${the(full(b))}${full(b)}${NB}: un son ${of(ny.phase)} pour deux troncs ${of(stemPhase)}, le Na Yin étant une couche à part, à côté du tronc et de la branche.`;
  const practice = fr
    ? [
        twoFr,
        `- **Sur le tableau** du BaZi, chaque pilier montre son Na Yin sous sa colonne, et sa lecture dit ce que sa phase est pour le Maître du jour${NB}: les correspondances ci-dessous le donnent pour les cinq phases.`,
        `- **Ses années**, deux de suite, chacune depuis Lichun${NB}: ${andList(years, lang)}, dans la table de 1800 à 2200.`,
        `- **Dans la table du zodiaque**, chacune des quatre places, l’année, le mois, le jour et l’heure, donne le Na Yin de son pilier.`,
      ]
    : [
        twoEn,
        `- **On BaZi’s board**, each pillar shows its Na Yin under its column, and its reading says what its phase is to the Day Master: the Correspondences below give it for all five phases.`,
        `- **Its years**, two in a row, each from Lichun: ${andList(years, lang)}, in the 1800–2200 table.`,
        `- **In the zodiac’s table**, each of the four places, the year, the month, the day and the hour, gives the Na Yin of its pillar.`,
      ];
  const ar = naYinArithmetic(n, SIXTY);
  const pa = SIXTY[a];
  const pb = SIXTY[b];
  const nums = [STEM_NUMBER[pa.stem], BRANCH_NUMBER[pa.branch], STEM_NUMBER[pb.stem], BRANCH_NUMBER[pb.branch]];
  const baseWord = fr ? PHASE_FR[ar.base].the : PHASE_EN[ar.base];
  const calculation = fr
    ? [
        `Ulune lit le Na Yin d’un pilier dans la table classique des trente (names.ts), un pour chaque couple de piliers dans l’ordre du cycle${NB}: celui-ci pour le ${ordinal(a + 1, lang)} et le ${ordinal(b + 1, lang)}, ${P(a)} et ${P(b)}. La tradition tire sa phase des nombres de ses quatre caractères${NB}: pour ${pa.hant} et ${pb.hant}, ${nums.join(" + ")} = ${ar.sum}${NB}; 49 − ${ar.sum} = ${ar.rest}, dont le ${ar.rest % 10} donne ${baseWord}, et ${baseWord} produit ${PHASE_FR[ny.phase].the}, la phase du Na Yin.`,
      ]
    : [
        `Ulune reads a pillar’s Na Yin from the classical table of thirty (names.ts), one for each two pillars in the cycle’s order: this one for the ${ordinal(a + 1, lang)} and the ${ordinal(b + 1, lang)}, ${P(a)} and ${P(b)}. The tradition draws its phase from the numbers of its four characters: for ${pa.hant} and ${pb.hant}, ${nums.join(" + ")} = ${ar.sum}; 49 − ${ar.sum} = ${ar.rest}, whose ${ar.rest % 10} gives ${baseWord}, and ${baseWord} produces ${PHASE_EN[ny.phase]}, the Na Yin’s phase.`,
      ];
  const toDm = PHASE_ORDER.map((dmPhase) => {
    const fam = familyOf(dmPhase, ny.phase);
    return fr ? `| Pour un Maître du jour ${/^[AEIOUÉ]/.test(PHASE_FR[dmPhase].name) ? "d’" : "de "}${PHASE_FR[dmPhase].name} | ${say(FAMILY_NAMES[fam])} |` : `| To ${dmPhase === "earth" ? "an" : "a"} ${PHASE_EN[dmPhase]} Day Master | ${say(FAMILY_NAMES[fam])} |`;
  });
  const correspondences = fr
    ? [
        `| Correspondance | ${name} |`,
        "| --- | --- |",
        `| Caractères, pinyin | ${ny.hant} ${ny.pinyin}${ny.hans !== ny.hant ? ` (${ny.hans})` : ""} |`,
        `| Phase | ${phaseLink} |`,
        `| Ses piliers | ${pillarLink(a)}, ${pillarLink(b)} |`,
        `| Place | ${n + 1} sur 30 |`,
        `| Années, 1800–2200 | ${years.join(", ")} |`,
        ...toDm,
        `| Avant et après | ${naYinLink((n + 29) % 30)}, ${naYinLink((n + 1) % 30)} |`,
        `| Les nombres | ${nums.join(" + ")} = ${ar.sum}${NB}; 49 − ${ar.sum} = ${ar.rest} |`,
      ]
    : [
        `| Correspondence | ${name} |`,
        "| --- | --- |",
        `| Characters, pinyin | ${ny.hant} ${ny.pinyin}${ny.hans !== ny.hant ? ` (${ny.hans})` : ""} |`,
        `| Phase | ${phaseLink} |`,
        `| Its pillars | ${pillarLink(a)}, ${pillarLink(b)} |`,
        `| Place | ${n + 1} of 30 |`,
        `| Years, 1800–2200 | ${years.join(", ")} |`,
        ...toDm,
        `| Before and after | ${naYinLink((n + 29) % 30)}, ${naYinLink((n + 1) % 30)} |`,
        `| The numbers | ${nums.join(" + ")} = ${ar.sum}; 49 − ${ar.sum} = ${ar.rest} |`,
      ];
  return {
    sections: { meaning, practice, calculation, correspondences },
    related: row.related,
    sources: NA_YIN_SOURCES[lang],
  };
}
