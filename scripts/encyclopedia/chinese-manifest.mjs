/*
 * The writers' manifest of the encyclopedia's Chinese pages (encyclopedia
 * plan, part 23): every entry the Chinese traditions need, one per id of
 * src/lib/chinese/term-ids.ts, with what a writer needs to start its two
 * files: its family and folder, its kind, its addresses and titles in
 * English and French, its Chinese name from the engine (characters in both
 * scripts, pinyin with tone marks), a glyph and the entries it is closest
 * to. Written to content/encyclopedia/chinese-manifest.json, which the build
 * reads (chinese.mjs) and scripts/encyclopedia-chinese.test.mjs keeps equal
 * to what this script makes.
 *
 *   node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/encyclopedia/chinese-manifest.mjs           prints a summary
 *   … chinese-manifest.mjs --write    writes the manifest again (after a change to the engine's names or the registry)
 *   … chinese-manifest.mjs --status   builds the encyclopedia and says its mistakes and warnings, then what is
 *                                     written, family by family, and which family can go live
 *
 * Titles and addresses follow the app's own words (the Chinese catalog,
 * lib/i18n/catalog/chinese.ts) and the engine's names. An address is the
 * title made plain (accents off, words joined by hyphens), with the pinyin
 * where a term is known by it (jia-wood, zi-rat, lichun, sheng-qi), and a
 * word more where two terms would share one (wood-phase, kan-trigram,
 * zi-mountain). Once a page is published its address never changes.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHINESE_FAMILIES, CHINESE_FAMILY_IDS, chineseTermIds } from "../../src/lib/chinese/term-ids.ts";
import { ANIMALS, BRANCHES, FAMILY_NAMES, NA_YIN, PHASES, POLARITY_NAMES, SIXTY, SOLAR_TERMS, STEMS } from "../../src/lib/chinese/names.ts";
import { DAY_MASTER_NAME, TEN_GODS } from "../../src/lib/chinese/bazi.ts";
import { STAGES, STARS as SHEN_SHA } from "../../src/lib/chinese/bazi-signs.ts";
import { STRUCTURE_NAMES } from "../../src/lib/chinese/bazi-balance.ts";
import { INTERACTION_NAMES } from "../../src/lib/chinese/bazi-interactions.ts";
import { MANSIONS, TRIGRAMS } from "../../src/lib/chinese/fengshui.ts";
import { MOUNTAINS } from "../../src/lib/chinese/fengshui-home.ts";
import { STARS as FLYING_STARS } from "../../src/lib/chinese/fengshui-stars.ts";
import { FORMATION_NAMES } from "../../src/lib/chinese/fengshui-stars-texts.ts";
import { AFFLICTION_NAMES } from "../../src/lib/chinese/fengshui-years-texts.ts";
import { PAIR_NAMES } from "../../src/lib/chinese/fengshui-readings-texts.ts";
import { PAIR_TEXTS } from "../../src/lib/chinese/fengshui-pair-texts.ts";
import { CHINESE_FAMILY_DEFS, COMBINATION_TERMS, MANIFEST_FILE, MANIFEST_PATH, SHARED_IDEAS_TERMS } from "./chinese.mjs";
import { slugify } from "./combinations.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

/** Each family of terms: its tradition and family in the encyclopedia. */
const PLACE = new Map();
for (const [tradition, list] of Object.entries(CHINESE_FAMILY_DEFS)) for (const f of list) PLACE.set(f.terms, { tradition, family: f.id });
PLACE.set(SHARED_IDEAS_TERMS, { tradition: "shared", family: "ideas" });

/** A Chinese name from the engine: `from` says where (file and table). */
const engine = (n, from) => (n ? { hant: n.hant, hans: n.hans, pinyin: n.pinyin, engine: true, from } : null);
/** A name the engine does not hold: a suggestion, to check against a dictionary before it goes in. */
const suggested = (hant, hans, pinyin) => ({ hant, hans, pinyin, engine: false, from: "not in the engine: a suggestion, check it in a dictionary" });

const NUMERAL = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const NUMERAL_PINYIN = ["", "yī", "èr", "sān", "sì", "wǔ", "liù", "qī", "bā", "jiǔ"];
const plain = (s) => slugify(s);
const phaseOf = (id) => PHASES.find((p) => p.id === id);

/** The generating cycle (Wood → Fire → Earth → Metal → Water) and the controlling one (Wood → Earth → Water → Fire → Metal). */
const PHASE_IDS = PHASES.map((p) => p.id);
const produces = (id) => PHASE_IDS[(PHASE_IDS.indexOf(id) + 1) % 5];
const producedBy = (id) => PHASE_IDS[(PHASE_IDS.indexOf(id) + 4) % 5];
const controls = (id) => PHASE_IDS[(PHASE_IDS.indexOf(id) + 2) % 5];
const controlledBy = (id) => PHASE_IDS[(PHASE_IDS.indexOf(id) + 3) % 5];
/** The planet named after each phase in Chinese astronomy (木星 Jupiter, 火星 Mars, 土星 Saturn, 金星 Venus, 水星 Mercury), and the Western element of the same name. */
const PHASE_PLANET = { wood: "jupiter", fire: "mars", earth: "saturn", metal: "venus", water: "mercury" };
const PHASE_ELEMENT = { fire: "element-fire", earth: "element-earth", water: "element-water" };

/** The family entries and the ideas the engine has no table for: titles, addresses and names (the catalog's words). */
const CONCEPTS = {
  phase: { en: "Five phases", fr: "Cinq phases", slug: ["five-phases", "cinq-phases"], zh: engine(FAMILY_NAMES.phases, "names.ts FAMILY_NAMES.phases"), glyph: "五行" },
  stem: { en: "Heavenly Stems", fr: "Troncs célestes", slug: ["heavenly-stems", "troncs-celestes"], zh: engine(FAMILY_NAMES.stems, "names.ts FAMILY_NAMES.stems"), glyph: "天干" },
  branch: { en: "Earthly Branches", fr: "Branches terrestres", slug: ["earthly-branches", "branches-terrestres"], zh: engine(FAMILY_NAMES.branches, "names.ts FAMILY_NAMES.branches"), glyph: "地支" },
  pillar: { en: "Sixty-cycle", fr: "Cycle sexagésimal", slug: ["sixty-cycle", "cycle-sexagesimal"], zh: engine(FAMILY_NAMES.sixty, "names.ts FAMILY_NAMES.sixty"), glyph: "甲子" },
  "na-yin": { en: "Na Yin", fr: "Na Yin", slug: ["na-yin", "na-yin"], zh: suggested("納音", "纳音", "nàyīn"), glyph: "納音" },
  "solar-term": { en: "Solar terms", fr: "Termes solaires", slug: ["solar-terms", "termes-solaires"], zh: engine(FAMILY_NAMES.terms, "names.ts FAMILY_NAMES.terms"), glyph: "節氣" },
  relation: { en: "Relations", fr: "Relations", slug: ["relations", "relations"], zh: null, glyph: "" },
  trigram: { en: "Trigrams", fr: "Trigrammes", slug: ["trigrams", "trigrammes"], zh: suggested("八卦", "八卦", "bāguà"), glyph: "八卦" },
  animal: { en: "Twelve animals", fr: "Douze animaux", slug: ["twelve-animals", "douze-animaux"], zh: engine(FAMILY_NAMES.animals, "names.ts FAMILY_NAMES.animals"), glyph: "生肖" },
  "ten-god": { en: "Ten Gods", fr: "Dix Dieux", slug: ["ten-gods", "dix-dieux"], zh: suggested("十神", "十神", "shíshén"), glyph: "十神" },
  "life-stage": { en: "Twelve life stages", fr: "Douze stades de vie", slug: ["life-stages", "stades-de-vie"], zh: suggested("十二長生", "十二长生", "shí’èr chángshēng"), glyph: "長生" },
  "shen-sha": { en: "Symbolic stars", fr: "Étoiles symboliques", slug: ["symbolic-stars", "etoiles-symboliques"], zh: suggested("神煞", "神煞", "shénshà"), glyph: "神煞" },
  structure: { en: "Structures", fr: "Structures", slug: ["structures", "structures"], zh: suggested("格局", "格局", "géjú"), glyph: "格局" },
  kua: { en: "Kua number", fr: "Nombre Kua", slug: ["kua-number", "nombre-kua"], zh: suggested("命卦", "命卦", "mìngguà"), glyph: "命卦" },
  mansion: { en: "Eight Mansions", fr: "Huit Demeures", slug: ["eight-mansions", "huit-demeures"], zh: suggested("八宅", "八宅", "bāzhái"), glyph: "八宅" },
  mountain: { en: "Twenty-four mountains", fr: "Vingt-quatre montagnes", slug: ["twenty-four-mountains", "vingt-quatre-montagnes"], zh: suggested("二十四山", "二十四山", "èrshísì shān"), glyph: "山" },
  "flying-star": { en: "Flying Stars", fr: "Étoiles volantes", slug: ["flying-stars", "etoiles-volantes"], zh: suggested("玄空飛星", "玄空飞星", "xuánkōng fēixīng"), glyph: "飛星" },
  formation: { en: "Star formations", fr: "Formations d’étoiles", slug: ["star-formations", "formations-d-etoiles"], zh: null, glyph: "" },
  affliction: { en: "Annual afflictions", fr: "Afflictions annuelles", slug: ["annual-afflictions", "afflictions-annuelles"], zh: null, glyph: "" },
  period: { en: "Nine periods", fr: "Neuf périodes", slug: ["nine-periods", "neuf-periodes"], zh: suggested("三元九運", "三元九运", "sān yuán jiǔ yùn"), glyph: "九運" },
  pairing: { en: "Pairs of stars", fr: "Paires d’étoiles", slug: ["star-pairs", "paires-d-etoiles"], zh: null, glyph: "" },
  // The families of ideas (their entries are themselves).
  "hidden-stems": { en: "Hidden stems", fr: "Troncs cachés", slug: ["hidden-stems", "troncs-caches"], zh: suggested("藏干", "藏干", "cánggān"), glyph: "藏干" },
  "tai-sui": { en: "Tai Sui", fr: "Tai Sui", slug: ["tai-sui", "tai-sui"], zh: engine(AFFLICTION_NAMES["tai-sui"], "fengshui-years-texts.ts AFFLICTION_NAMES"), glyph: "太歲", aliases: [["Grand Duke", "the year’s ruler"], ["Grand Duc", "maître de l’année"]] },
  "solar-month": { en: "Solar month", fr: "Mois solaire", slug: ["solar-month", "mois-solaire"], zh: null, glyph: "" },
  "lo-shu": { en: "Lo Shu", fr: "Lo Shu", slug: ["lo-shu", "lo-shu"], zh: suggested("洛書", "洛书", "luòshū"), glyph: "洛書" },
  "year-animal": { en: "Year animal", fr: "Animal de l’année", slug: ["year-animal", "animal-de-l-annee"], zh: suggested("年支", "年支", "niánzhī"), glyph: "年" },
  "month-animal": { en: "Month animal", fr: "Animal du mois", slug: ["month-animal", "animal-du-mois"], zh: suggested("月支", "月支", "yuèzhī"), glyph: "月" },
  "day-animal": { en: "Day animal", fr: "Animal du jour", slug: ["day-animal", "animal-du-jour"], zh: suggested("日支", "日支", "rìzhī"), glyph: "日" },
  "hour-animal": { en: "Hour animal", fr: "Animal de l’heure", slug: ["hour-animal", "animal-de-l-heure"], zh: suggested("時支", "时支", "shízhī"), glyph: "時" },
  "ben-ming-nian": { en: "Own year", fr: "Année propre", slug: ["ben-ming-nian", "ben-ming-nian"], zh: suggested("本命年", "本命年", "běnmìngnián"), glyph: "本命", aliases: [["Ben Ming Nian"], ["Ben Ming Nian"]] },
  "day-master": { en: "Day Master", fr: "Maître du jour", slug: ["day-master", "maitre-du-jour"], zh: engine(DAY_MASTER_NAME, "bazi.ts DAY_MASTER_NAME"), glyph: "日主" },
  "year-pillar": { en: "Year pillar", fr: "Pilier de l’année", slug: ["year-pillar", "pilier-de-l-annee"], zh: suggested("年柱", "年柱", "niánzhù"), glyph: "年柱" },
  "month-pillar": { en: "Month pillar", fr: "Pilier du mois", slug: ["month-pillar", "pilier-du-mois"], zh: suggested("月柱", "月柱", "yuèzhù"), glyph: "月柱" },
  "day-pillar": { en: "Day pillar", fr: "Pilier du jour", slug: ["day-pillar", "pilier-du-jour"], zh: suggested("日柱", "日柱", "rìzhù"), glyph: "日柱" },
  "hour-pillar": { en: "Hour pillar", fr: "Pilier de l’heure", slug: ["hour-pillar", "pilier-de-l-heure"], zh: suggested("時柱", "时柱", "shízhù"), glyph: "時柱" },
  "empty-branches": { en: "Empty branches", fr: "Branches vides", slug: ["empty-branches", "branches-vides"], zh: suggested("空亡", "空亡", "kōngwáng"), glyph: "空亡" },
  "phase-balance": { en: "Balance of the phases", fr: "Équilibre des phases", slug: ["balance-of-the-phases", "equilibre-des-phases"], zh: null, glyph: "" },
  "day-master-strength": { en: "Day Master strength", fr: "Force du Maître du jour", slug: ["day-master-strength", "force-du-maitre-du-jour"], zh: null, glyph: "" },
  "favourable-phases": { en: "Favourable phases", fr: "Phases favorables", slug: ["favourable-phases", "phases-favorables"], zh: suggested("喜用神", "喜用神", "xǐyòngshén"), glyph: "用神" },
  "luck-pillar": { en: "Luck pillar", fr: "Pilier de chance", slug: ["luck-pillar", "pilier-de-chance"], zh: suggested("大運", "大运", "dàyùn"), glyph: "大運" },
  "annual-pillar": { en: "Annual pillar", fr: "Pilier annuel", slug: ["annual-pillar", "pilier-annuel"], zh: suggested("流年", "流年", "liúnián"), glyph: "流年" },
  "monthly-pillar": { en: "Monthly pillar", fr: "Pilier mensuel", slug: ["monthly-pillar", "pilier-mensuel"], zh: suggested("流月", "流月", "liúyuè"), glyph: "流月" },
  "daily-pillar": { en: "Daily pillar", fr: "Pilier quotidien", slug: ["daily-pillar", "pilier-quotidien"], zh: suggested("流日", "流日", "liúrì"), glyph: "流日" },
  "partner-palace": { en: "Partner palace", fr: "Palais du partenaire", slug: ["partner-palace", "palais-du-partenaire"], zh: suggested("夫妻宮", "夫妻宫", "fūqīgōng"), glyph: "夫妻" },
  facing: { en: "Facing", fr: "Façade", slug: ["facing", "facade"], zh: suggested("向", "向", "xiàng"), glyph: "向" },
  luopan: { en: "Luopan", fr: "Luopan", slug: ["luopan", "luopan"], zh: suggested("羅盤", "罗盘", "luópán"), glyph: "羅盤" },
  "flying-star-chart": { en: "Flying Star chart", fr: "Thème des Étoiles volantes", slug: ["flying-star-chart", "theme-des-etoiles-volantes"], zh: suggested("飛星盤", "飞星盘", "fēixīngpán"), glyph: "星盤" },
  "replacement-chart": { en: "Replacement chart", fr: "Thème de remplacement", slug: ["replacement-chart", "theme-de-remplacement"], zh: suggested("替卦", "替卦", "tìguà"), glyph: "替卦" },
  "annual-stars": { en: "Annual stars", fr: "Étoiles annuelles", slug: ["annual-stars", "etoiles-annuelles"], zh: suggested("流年飛星", "流年飞星", "liúnián fēixīng"), glyph: "流年" },
  "monthly-stars": { en: "Monthly stars", fr: "Étoiles mensuelles", slug: ["monthly-stars", "etoiles-mensuelles"], zh: suggested("流月飛星", "流月飞星", "liúyuè fēixīng"), glyph: "流月" },
};

/** French phase names in an address: accents off ("metal"). */
const frPlain = (s) => plain(s);

/** One entry's row: its family's own fields first, then what every row has. */
function row(id, terms, fields) {
  const { tradition, family } = PLACE.get(terms);
  const kind = COMBINATION_TERMS.has(terms) && id !== CHINESE_FAMILIES[terms].concept ? "combination" : "core";
  return {
    id,
    terms,
    tradition,
    family,
    kind,
    folder: kind === "combination" ? `content/encyclopedia/combinations (openings: ${terms}.<n>.<lang>.md)` : `content/encyclopedia/${tradition}`,
    slug: { en: fields.slug[0], fr: fields.slug[1] },
    title: { en: fields.en, fr: fields.fr },
    ...(fields.aliases ? { aliases: { en: fields.aliases[0], fr: fields.aliases[1] } } : {}),
    chinese: fields.zh ?? null,
    glyph: fields.glyph ?? "",
    related: (fields.related ?? []).filter((r) => r !== id),
    ...(fields.texts ? { texts: fields.texts } : {}),
  };
}

const concept = (id, terms, related = []) => {
  const c = CONCEPTS[id];
  return row(id, terms, { ...c, related });
};

/** Every entry of one family of terms, in the engine's order, its own entry first. */
function familyRows(terms) {
  const f = CHINESE_FAMILIES[terms];
  const ids = chineseTermIds(terms);
  const head = f.concept ? [f.concept] : [];
  const members = ids.filter((id) => !head.includes(id));
  switch (terms) {
    case "phase":
      return [
        concept("phase", terms, [...members, "yin-yang", "stem", "branch"]),
        ...PHASES.map((p) =>
          row(`phase-${p.id}`, terms, {
            en: p.en,
            fr: p.fr,
            slug: [`${p.id}-phase`, `phase-${frPlain(p.fr)}`],
            zh: engine(p, "names.ts PHASES"),
            glyph: p.hant,
            related: ["phase", `phase-${producedBy(p.id)}`, `phase-${produces(p.id)}`, `phase-${controls(p.id)}`, `phase-${controlledBy(p.id)}`, PHASE_PLANET[p.id], ...(PHASE_ELEMENT[p.id] ? [PHASE_ELEMENT[p.id]] : []), "yin-yang"],
          }),
        ),
      ];
    case "polarity":
      return [
        row("yin-yang", terms, {
          en: "Yin and yang",
          fr: "Yin et yang",
          slug: ["yin-yang", "yin-yang"],
          zh: { ...engine({ hant: POLARITY_NAMES.yin.hant + POLARITY_NAMES.yang.hant, hans: POLARITY_NAMES.yin.hans + POLARITY_NAMES.yang.hans, pinyin: POLARITY_NAMES.yin.pinyin + POLARITY_NAMES.yang.pinyin }, "names.ts POLARITY_NAMES, yin then yang") },
          glyph: "☯",
          related: ["phase", "stem", "branch", "trigram", "lo-shu"],
        }),
      ];
    case "stem":
      return [
        concept("stem", terms, [...members, "branch", "phase", "yin-yang", "pillar"]),
        ...STEMS.map((s, i) =>
          row(`stem-${s.id}`, terms, {
            en: `${s.id.charAt(0).toUpperCase() + s.id.slice(1)} · ${s.en}`,
            fr: `${s.id.charAt(0).toUpperCase() + s.id.slice(1)} · ${s.fr}`,
            slug: [`${s.id}-${s.phase}`, `${s.id}-${frPlain(phaseOf(s.phase).fr)}`],
            // "Jia Wood", and as it is written and said in Chinese ("甲木", "jiǎ mù"): the plan's search finds it by each.
            aliases: [
              [s.en, `${s.id.charAt(0).toUpperCase() + s.id.slice(1)} ${phaseOf(s.phase).en}`, s.pinyin, `${s.hant}${phaseOf(s.phase).hant}`, `${s.pinyin} ${phaseOf(s.phase).pinyin}`],
              [s.fr, `${s.id.charAt(0).toUpperCase() + s.id.slice(1)} ${phaseOf(s.phase).fr}`, s.pinyin, `${s.hant}${phaseOf(s.phase).hant}`, `${s.pinyin} ${phaseOf(s.phase).pinyin}`],
            ],
            zh: engine(s, "names.ts STEMS"),
            glyph: s.hant,
            related: ["stem", `phase-${s.phase}`, "yin-yang", `stem-${STEMS[(i + 9) % 10].id}`, `stem-${STEMS[(i + 1) % 10].id}`, `stem-${STEMS[(i + 5) % 10].id}`, "day-master", "relation-stem-combination"],
          }),
        ),
      ];
    case "branch":
      return [
        concept("branch", terms, [...members, "stem", "animal", "phase", "hidden-stems", "relation"]),
        ...BRANCHES.map((b, i) => {
          const name = b.id.charAt(0).toUpperCase() + b.id.slice(1);
          return row(`branch-${b.id}`, terms, {
            en: `${name} · ${b.en}`,
            fr: `${name} · ${b.fr}`,
            slug: [`${b.id}-${plain(b.en)}`, `${b.id}-${frPlain(b.fr)}`],
            aliases: [[`${b.en} branch`, b.pinyin], [`branche du ${b.fr}`, b.pinyin]],
            zh: engine(b, "names.ts BRANCHES"),
            glyph: b.hant,
            related: ["branch", `animal-${ANIMALS[i].id}`, `phase-${b.phase}`, "hidden-stems", `branch-${BRANCHES[(i + 6) % 12].id}`, `mountain-${b.id}`, "relation-clash", "relation-harmony"],
          });
        }),
      ];
    case "pillar":
      return [
        concept("pillar", terms, ["stem", "branch", "na-yin", "pillar-jia-zi", "day-pillar", "year-pillar", "luck-pillar"]),
        ...SIXTY.map((p, i) => {
          const [s, b] = p.id.split("-");
          const name = `${s.charAt(0).toUpperCase() + s.slice(1)} ${b.charAt(0).toUpperCase() + b.slice(1)}`;
          return row(`pillar-${p.id}`, terms, {
            en: `${name} · ${p.en}`,
            fr: `${name} · ${p.fr}`,
            slug: [p.id, p.id],
            aliases: [[p.en, `${s}-${b}`, p.pinyin, p.hant], [p.fr, `${s}-${b}`, p.pinyin, p.hant]],
            zh: engine(p, "names.ts SIXTY"),
            glyph: p.hant,
            related: [`stem-${s}`, `branch-${b}`, `animal-${ANIMALS[p.branch].id}`, `na-yin-${NA_YIN[Math.floor(i / 2)].pinyin.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, "-")}`, `pillar-${SIXTY[(i + 59) % 60].id}`, `pillar-${SIXTY[(i + 1) % 60].id}`],
            texts: [`src/lib/chinese/zodiac-texts.ts PAIR_TEXTS["${p.branch}:${STEMS[p.stem].phase}"] (the year animal of this pillar, read by the zodiac)`, "names.ts: its stem, branch, Na Yin and hidden stems"],
          });
        }),
      ];
    case "na-yin":
      return [
        concept("na-yin", terms, ["pillar", "phase", ...members.slice(0, 3)]),
        ...NA_YIN.map((n, i) => {
          const slug = n.pinyin.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, "-");
          return row(`na-yin-${slug}`, terms, {
            en: n.en,
            fr: n.fr,
            slug: [slug, slug],
            aliases: [[n.pinyin, n.hant], [n.pinyin, n.hant]],
            zh: engine(n, "names.ts NA_YIN"),
            glyph: n.hant,
            related: ["na-yin", `pillar-${SIXTY[i * 2].id}`, `pillar-${SIXTY[i * 2 + 1].id}`, `phase-${n.phase}`],
            texts: ["names.ts NA_YIN: its image and its phase", `its two pillars: ${SIXTY[i * 2].id}, ${SIXTY[i * 2 + 1].id}`],
          });
        }),
      ];
    case "solar-term":
      return [
        concept("solar-term", terms, [...members.slice(0, 4), "solar-month", "season", "ingress"]),
        ...SOLAR_TERMS.map((t, i) =>
          row(`solar-term-${t.id}`, terms, {
            en: t.en,
            fr: t.fr,
            slug: [t.id, t.id],
            aliases: [[t.pinyin, t.hant], [t.pinyin, t.hant]],
            zh: engine(t, "names.ts SOLAR_TERMS"),
            glyph: t.hant,
            related: ["solar-term", `solar-term-${SOLAR_TERMS[(i + 23) % 24].id}`, `solar-term-${SOLAR_TERMS[(i + 1) % 24].id}`, ...(t.kind === "jie" ? ["solar-month"] : []), "season"],
          }),
        ),
      ];
    case "relation": {
      const SLUG = {
        harmony: ["six-harmonies", "six-harmonies"],
        trine: ["three-harmonies", "trois-harmonies"],
        "half-trine": ["half-trine", "demi-trigone"],
        season: ["seasonal-trio", "trio-saisonnier"],
        clash: ["clash", "choc"],
        harm: ["harm", "nuisance"],
        punishment: ["punishment", "punition"],
        "self-punishment": ["self-punishment", "autopunition"],
        destruction: ["destruction", "destruction"],
        "stem-combination": ["stem-combination", "combinaison-de-troncs"],
        "stem-clash": ["stem-clash", "choc-de-troncs"],
      };
      return [
        concept("relation", terms, [...members.slice(0, 5), "branch", "stem"]),
        ...Object.entries(f.ids).map(([k, id]) => {
          const n = INTERACTION_NAMES[k];
          return row(id, terms, {
            en: n.en,
            fr: n.fr,
            slug: SLUG[k],
            aliases: [[n.pinyin, n.hant], [n.pinyin, n.hant]],
            zh: engine(n, "bazi-interactions.ts INTERACTION_NAMES"),
            glyph: n.hant,
            related: ["relation", ...(k.startsWith("stem-") ? ["stem"] : ["branch"])],
          });
        }),
      ];
    }
    case "trigram":
      return [
        concept("trigram", terms, [...members, "lo-shu", "kua", "yin-yang"]),
        ...TRIGRAMS.map((t) =>
          row(`trigram-${t.id}`, terms, {
            en: `${t.en} · ${t.image.en}`,
            fr: `${t.fr} · ${t.image.fr.replace(/^(l’|la |le )/, "").replace(/^./, (c) => c.toUpperCase())}`,
            slug: [`${t.id}-trigram`, `trigramme-${t.id}`],
            aliases: [[t.pinyin, t.hant, t.symbol], [t.pinyin, t.hant, t.symbol]],
            zh: engine(t, "fengshui.ts TRIGRAMS"),
            glyph: t.symbol,
            related: ["trigram", `phase-${t.phase}`, `kua-${t.kua}`, "lo-shu"],
          }),
        ),
      ];
    case "chinese-concept":
      return [
        concept("hidden-stems", terms, ["branch", "stem", "ten-god", "day-master"]),
        concept("tai-sui", terms, ["year-animal", "ben-ming-nian", "affliction-year-breaker", "relation-clash", "jupiter"]),
        concept("solar-month", terms, ["solar-term", "solar-term-lichun", "month-pillar", "month-animal"]),
        concept("lo-shu", terms, ["trigram", "flying-star", "period", "birth-grid"]),
      ];
    case "animal":
      return [
        concept("animal", terms, [...members, "branch", "year-animal", "tai-sui"]),
        ...ANIMALS.map((a, i) =>
          row(`animal-${a.id}`, terms, {
            en: a.en,
            fr: a.fr,
            slug: [plain(a.en), frPlain(a.fr)],
            aliases: [[a.pinyin, a.hant], [a.pinyin, a.hant]],
            zh: engine(a, "names.ts ANIMALS"),
            glyph: a.hant,
            related: ["animal", `branch-${BRANCHES[i].id}`, `phase-${BRANCHES[i].phase}`, `animal-${ANIMALS[(i + 6) % 12].id}`, "relation-clash", "relation-harmony", "relation-trine"],
          }),
        ),
      ];
    case "zodiac-concept":
      return [
        concept("year-animal", terms, ["animal", "solar-term-lichun", "tai-sui", "month-animal"]),
        concept("month-animal", terms, ["animal", "solar-month", "year-animal", "day-animal"]),
        concept("day-animal", terms, ["animal", "day-pillar", "month-animal", "hour-animal"]),
        concept("hour-animal", terms, ["animal", "hour-pillar", "day-animal", "branch"]),
        concept("ben-ming-nian", terms, ["tai-sui", "year-animal", "animal"]),
      ];
    case "ten-god":
      return [
        concept("ten-god", terms, [...members, "day-master", "phase", "yin-yang"]),
        ...TEN_GODS.map((g, i) =>
          row(`ten-god-${g.id}`, terms, {
            en: g.en,
            fr: g.fr,
            slug: [plain(g.en), plain(g.fr)],
            aliases: [[g.pinyin, g.hant], [g.pinyin, g.hant]],
            zh: engine(g, "bazi.ts TEN_GODS"),
            glyph: g.hant,
            related: ["ten-god", `ten-god-${TEN_GODS[i % 2 ? i - 1 : i + 1].id}`, "day-master", ...(STRUCTURE_NAMES[g.id] ? [`structure-${g.id}`] : [])],
          }),
        ),
      ];
    case "life-stage":
      return [
        concept("life-stage", terms, [...members.slice(0, 4), "day-master", "branch"]),
        ...STAGES.map((s, i) =>
          row(`life-stage-${s.id}`, terms, {
            en: `${s.en} stage`,
            fr: `Stade ${s.fr}`,
            // Addressed by Ulune's names (BaZi part 20 renamed four: Retreat, Rest, Storehouse, Pause); the classical ones are found by search.
            slug: [`${plain(s.en)}-stage`, `stade-${plain(s.fr)}`],
            aliases: [[s.pinyin, s.hant, ...(s.classical ? [`${s.classical[0]} stage`] : [])], [s.pinyin, s.hant, ...(s.classical ? [`stade ${s.classical[1]}`] : [])]],
            zh: engine(s, "bazi-signs.ts STAGES"),
            glyph: s.hant,
            related: ["life-stage", `life-stage-${STAGES[(i + 11) % 12].id}`, `life-stage-${STAGES[(i + 1) % 12].id}`, "day-master"],
          }),
        ),
      ];
    case "shen-sha":
      return [
        concept("shen-sha", terms, [...members.slice(0, 4), "day-master"]),
        ...SHEN_SHA.map((s) => {
          const en = /star$/i.test(s.en) ? s.en : `${s.en} star`;
          return row(`shen-sha-${s.id}`, terms, {
            en,
            fr: s.fr,
            slug: [plain(en), /^étoile/i.test(s.fr) ? plain(s.fr) : `etoile-${plain(s.fr)}`],
            aliases: [[s.en, s.pinyin, s.hant], [s.pinyin, s.hant]],
            zh: engine(s, "bazi-signs.ts STARS"),
            glyph: s.hant.slice(0, 2),
            related: ["shen-sha", "day-master"],
          });
        }),
      ];
    case "structure":
      return [
        concept("structure", terms, [...members.slice(0, 4), "day-master", "ten-god", "day-master-strength"]),
        ...Object.keys(f.ids).map((k) => {
          const n = STRUCTURE_NAMES[k];
          return row(`structure-${k}`, terms, {
            en: n.en,
            fr: n.fr,
            slug: [plain(n.en), plain(n.fr)],
            aliases: [[n.pinyin, n.hant], [n.pinyin, n.hant]],
            zh: engine(n, "bazi-balance.ts STRUCTURE_NAMES"),
            glyph: n.hant,
            related: ["structure", ...(TEN_GODS.some((g) => g.id === k) ? [`ten-god-${k}`] : []), "day-master-strength"],
          });
        }),
      ];
    case "bazi-concept":
      return [
        concept("day-master", terms, ["stem", "ten-god", "day-pillar", "day-master-strength", "phase"]),
        concept("year-pillar", terms, ["month-pillar", "year-animal", "solar-term-lichun", "pillar"]),
        concept("month-pillar", terms, ["year-pillar", "day-pillar", "solar-month", "pillar"]),
        concept("day-pillar", terms, ["day-master", "month-pillar", "hour-pillar", "partner-palace"]),
        concept("hour-pillar", terms, ["day-pillar", "hour-animal", "pillar"]),
        concept("empty-branches", terms, ["branch", "day-pillar", "pillar"]),
        concept("phase-balance", terms, ["phase", "day-master-strength", "favourable-phases", "hidden-stems"]),
        concept("day-master-strength", terms, ["day-master", "phase-balance", "favourable-phases", "structure"]),
        concept("favourable-phases", terms, ["day-master-strength", "phase-balance", "phase", "luck-pillar"]),
        concept("luck-pillar", terms, ["annual-pillar", "pillar", "yin-yang", "month-pillar"]),
        concept("annual-pillar", terms, ["luck-pillar", "monthly-pillar", "tai-sui"]),
        concept("monthly-pillar", terms, ["annual-pillar", "daily-pillar", "solar-month"]),
        concept("daily-pillar", terms, ["monthly-pillar", "day-pillar"]),
        concept("partner-palace", terms, ["day-pillar", "day-master", "branch"]),
      ];
    case "kua":
      return [
        concept("kua", terms, [...members, "mansion", "trigram", "yin-yang"]),
        ...Object.keys(f.ids).map((k) => {
          const t = TRIGRAMS.find((x) => String(x.kua) === k);
          return row(`kua-${k}`, terms, {
            en: `Kua ${k}`,
            fr: `Kua ${k}`,
            slug: [`kua-${k}`, `kua-${k}`],
            zh: null,
            glyph: k,
            related: ["kua", `trigram-${t.id}`, "mansion", t.group === "east" ? "mansion-sheng-qi" : "mansion-fu-wei"],
          });
        }),
      ];
    case "mansion":
      return [
        concept("mansion", terms, [...members.slice(0, 4), "kua", "trigram"]),
        ...Object.entries(MANSIONS).map(([k, m]) => {
          const name = k
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          return row(`mansion-${k}`, terms, {
            en: `${name} · ${m.en}`,
            fr: `${name} · ${m.fr}`,
            slug: [k, k],
            aliases: [[m.en, m.pinyin, m.hant], [m.fr, m.pinyin, m.hant]],
            zh: engine(m, "fengshui.ts MANSIONS"),
            glyph: m.hant,
            related: ["mansion", "kua"],
          });
        }),
      ];
    case "mountain":
      return [
        concept("mountain", terms, ["luopan", "facing", "mountain-zi", "mountain-wu", "trigram"]),
        ...MOUNTAINS.map((m, i) =>
          row(`mountain-${m.id}`, terms, {
            en: `${m.en} mountain`,
            fr: `Montagne ${m.fr}`,
            slug: [`${m.id}-mountain`, `montagne-${m.id}`],
            aliases: [[m.pinyin, m.hant], [m.pinyin, m.hant]],
            zh: engine(m, "fengshui-home.ts MOUNTAINS"),
            glyph: m.hant,
            related: ["mountain", `mountain-${MOUNTAINS[(i + 23) % 24].id}`, `mountain-${MOUNTAINS[(i + 1) % 24].id}`, `mountain-${MOUNTAINS[(i + 12) % 24].id}`, ...(m.kind === "branch" ? [`branch-${m.id}`] : m.kind === "stem" ? [`stem-${m.id}`] : [`trigram-${m.id}`]), "facing"],
          }),
        ),
      ];
    case "flying-star":
      return [
        concept("flying-star", terms, [...members.slice(0, 3), "flying-star-chart", "period", "lo-shu"]),
        ...FLYING_STARS.map((s) =>
          row(`flying-star-${s.n}`, terms, {
            en: `${s.en} star`,
            fr: `Étoile ${s.fr}`,
            slug: [`${plain(s.en)}-star`, `etoile-${plain(s.fr)}`],
            aliases: [[s.star.en, s.pinyin, s.hant], [s.star.fr, s.pinyin, s.hant]],
            zh: engine(s, "fengshui-stars.ts STARS"),
            glyph: String(s.n),
            related: ["flying-star", `period-${s.n}`, `phase-${s.phase}`, "flying-star-chart"],
          }),
        ),
      ];
    case "formation":
      return [
        concept("formation", terms, [...members.slice(0, 4), "flying-star-chart"]),
        ...Object.keys(f.ids).map((k) => {
          const n = FORMATION_NAMES[k];
          const slug = n.pinyin.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, "-");
          return row(`formation-${k}`, terms, {
            en: n.en,
            fr: n.fr,
            slug: [slug, slug],
            aliases: [[n.pinyin, n.hant], [n.pinyin, n.hant]],
            zh: engine(n, "fengshui-stars-texts.ts FORMATION_NAMES"),
            glyph: n.hant.slice(0, 2),
            related: ["formation", "flying-star-chart", "facing"],
          });
        }),
      ];
    case "affliction": {
      const SLUG = { "five-yellow": ["five-yellow", "cinq-jaune"], "year-breaker": ["year-breaker", "briseur-de-l-annee"], "three-killings": ["three-killings", "trois-sha"] };
      return [
        concept("affliction", terms, [...members, "tai-sui", "annual-stars"]),
        ...Object.keys(f.ids).map((k) => {
          const n = AFFLICTION_NAMES[k];
          return row(`affliction-${k}`, terms, {
            en: n.en.replace(/^The /, ""),
            fr: n.fr.replace(/^(Le |La |Les )/, ""),
            slug: SLUG[k],
            aliases: [[n.pinyin, n.hant], [n.pinyin, n.hant]],
            zh: engine(n, "fengshui-years-texts.ts AFFLICTION_NAMES"),
            glyph: n.hant,
            related: ["affliction", "tai-sui", "annual-stars", ...(k === "five-yellow" ? ["flying-star-5"] : [])],
          });
        }),
      ];
    }
    case "period":
      return [
        concept("period", terms, [...members.slice(6), "flying-star-chart", "flying-star"]),
        ...Object.keys(f.ids).map((k) =>
          row(`period-${k}`, terms, {
            en: `Period ${k}`,
            fr: `Période ${k}`,
            slug: [`period-${k}`, `periode-${k}`],
            zh: suggested(`${NUMERAL[k]}運`, `${NUMERAL[k]}运`, `${NUMERAL_PINYIN[k]} yùn`),
            glyph: NUMERAL[k],
            related: ["period", `flying-star-${k}`, `period-${k === "1" ? 9 : Number(k) - 1}`, `period-${k === "9" ? 1 : Number(k) + 1}`],
          }),
        ),
      ];
    case "pairing":
      return [
        concept("pairing", terms, ["flying-star", "flying-star-chart", "pairing-1-4", "pairing-1-6"]),
        ...Object.keys(f.ids).map((k) => {
          const n = PAIR_NAMES[k];
          const [a, b] = k.split("-");
          return row(`pairing-${k}`, terms, {
            en: `${a} and ${b} · ${n.en.charAt(0).toUpperCase() + n.en.slice(1)}`,
            fr: `${a} et ${b} · ${n.fr.charAt(0).toUpperCase() + n.fr.slice(1)}`,
            slug: [`stars-${k}`, `etoiles-${k}`],
            zh: n.hant ? engine(n, "fengshui-readings-texts.ts PAIR_NAMES") : null,
            glyph: `${a}·${b}`,
            related: ["pairing", `flying-star-${a}`, ...(a !== b ? [`flying-star-${b}`] : [])],
            texts: [`src/lib/chinese/fengshui-pair-texts.ts PAIR_TEXTS["${k}"] (${PAIR_TEXTS[k] ? "the reading of the pair" : "none"})`],
          });
        }),
      ];
    case "fengshui-concept":
      return [
        concept("facing", terms, ["luopan", "mountain", "flying-star-chart", "replacement-chart"]),
        concept("luopan", terms, ["facing", "mountain", "trigram"]),
        concept("flying-star-chart", terms, ["flying-star", "period", "facing", "replacement-chart", "lo-shu"]),
        concept("replacement-chart", terms, ["flying-star-chart", "mountain", "facing"]),
        concept("annual-stars", terms, ["monthly-stars", "flying-star", "affliction", "tai-sui"]),
        concept("monthly-stars", terms, ["annual-stars", "solar-month", "flying-star"]),
      ];
  }
  throw new Error(`No manifest rule for the family "${terms}"`);
}

/** The manifest: every family, then every entry, each family in the engine's order. */
export function makeManifest() {
  const families = [];
  const entries = [];
  for (const terms of CHINESE_FAMILY_IDS) {
    const rows = familyRows(terms);
    // Every id of the registry, once, and nothing else.
    const want = chineseTermIds(terms);
    const got = rows.map((r) => r.id);
    if (want.length !== got.length || want.some((id) => !got.includes(id))) {
      throw new Error(`${terms}: the manifest's rows (${got.join(", ")}) are not the registry's (${want.join(", ")})`);
    }
    const { tradition, family } = PLACE.get(terms);
    const def = CHINESE_FAMILY_DEFS[tradition]?.find((f) => f.id === family);
    families.push({
      terms,
      tradition,
      family,
      name: def?.name ?? { en: "Ideas", fr: "Idées" },
      kind: COMBINATION_TERMS.has(terms) ? "combination" : "core",
      entries: rows.length,
      encyclopediaPart: { chinese: 23, "chinese-astrology": 24, bazi: 25, "feng-shui": 26, shared: 23 }[tradition],
    });
    entries.push(...rows);
  }
  // Addresses unique in each language.
  for (const lang of ["en", "fr"]) {
    const seen = new Map();
    for (const e of entries) {
      const s = e.slug[lang];
      if (seen.has(s)) throw new Error(`the ${lang} address "${s}" is both ${seen.get(s)}'s and ${e.id}'s`);
      seen.set(s, e.id);
    }
  }
  return {
    about: `The writers' manifest of the encyclopedia's Chinese pages: made by scripts/encyclopedia/chinese-manifest.mjs, never edited by hand. ${MANIFEST_FILE}`,
    families,
    entries,
  };
}

const text = (m) => `${JSON.stringify(m, null, 1)}\n`;

/** Which entries the encyclopedia has with their page (both languages, as the build makes them), by family, and which families can go live. */
async function status(m) {
  const { buildEncyclopedia, formatErrors, readContent } = await import("./build.mjs");
  const { LIVE_FAMILIES } = await import("../../src/lib/chinese/term-live.ts");
  const built = buildEncyclopedia(readContent(join(ROOT, "content/encyclopedia")));
  if (!built.data) return `The encyclopedia does not build (${built.errors.length} mistake(s)):\n${formatErrors(built.errors)}`;
  const terms = built.data.index.terms;
  const lines = [];
  for (const f of m.families) {
    const ids = m.entries.filter((e) => e.terms === f.terms).map((e) => e.id);
    const done = ids.filter((id) => Object.hasOwn(terms, id) && terms[id][4] === 1);
    const isLive = LIVE_FAMILIES.has(f.terms);
    const state = done.length === ids.length ? (isLive ? "live" : "written: add it to LIVE_FAMILIES (src/lib/chinese/term-live.ts)") : isLive ? "LIVE WITH ENTRIES MISSING" : done.length ? "in progress" : "to write";
    lines.push(`${f.terms.padEnd(17)} ${String(done.length).padStart(3)} / ${String(ids.length).padEnd(3)} ${f.tradition}/${f.family} (part ${f.encyclopediaPart}, ${f.kind}): ${state}`);
  }
  // The written pages whose Chinese name is the manifest's suggestion, not the engine's: for the owner's dictionary check (the writers' guide, section 3).
  const toCheck = m.entries.filter((e) => e.chinese && !e.chinese.engine && built.data.pages[`en/${e.id}`]?.zh).map((e) => `${e.id} (${e.chinese.hant} ${e.chinese.pinyin})`);
  lines.push("", toCheck.length ? `${toCheck.length} written page(s) give a suggested Chinese name, to check in a dictionary: ${toCheck.join(", ")}` : "No written page gives a Chinese name still to check.");
  // The build's warnings (a term linked twice in a paragraph…), a missing combination opening apart.
  const warnings = built.warnings.filter((w) => !/no (summary|opening) yet/.test(w.message));
  lines.push("", warnings.length ? `${warnings.length} warning(s):\n${formatErrors(warnings)}` : "The encyclopedia builds with no mistake and no warning.");
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = makeManifest();
  if (process.argv.includes("--write")) {
    writeFileSync(MANIFEST_PATH, text(m));
    console.log(`${MANIFEST_FILE}: ${m.entries.length} entries in ${m.families.length} families`);
  } else if (process.argv.includes("--status")) {
    console.log(await status(m));
  } else {
    const current = existsSync(MANIFEST_PATH) && readFileSync(MANIFEST_PATH, "utf8") === text(m);
    console.log(`${m.entries.length} entries in ${m.families.length} families; ${MANIFEST_FILE} is ${current ? "up to date" : "out of date: run with --write"}`);
  }
}

/** The manifest as the file holds it (for the test). */
export const manifestText = () => text(makeManifest());
