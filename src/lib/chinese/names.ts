/*
 * The names of the Chinese calendar's building blocks: the ten Heavenly
 * Stems, the twelve Earthly Branches, the five phases, the sixty pairs, the
 * twenty-four solar terms and the twelve animals. Each carries its
 * characters (Traditional, the default, and Simplified), its pinyin with
 * tone marks, and its English and French names, so every page and the
 * encyclopedia say each term the same way.
 *
 * Characters and pinyin were checked against the Unicode Han database
 * (Unihan) and the standard readings of the solar terms (芒種 mángzhòng,
 * 處暑 chǔshǔ, 霜降 shuāngjiàng); scripts/chinese-names.test.mjs keeps them
 * consistent. Plain data: nothing here depends on the calendar engine.
 */

export type ChineseName = {
  /** Traditional characters (Ulune's default). */
  hant: string;
  /** Simplified characters. */
  hans: string;
  /** Hanyu Pinyin with tone marks, lower case, syllables joined. */
  pinyin: string;
  /** English name. */
  en: string;
  /** French name (French typography: ’ for the apostrophe). */
  fr: string;
};

export type PhaseId = "wood" | "fire" | "earth" | "metal" | "water";
export type Polarity = "yang" | "yin";

export type Phase = ChineseName & { id: PhaseId };

/** The five phases (五行 wǔxíng), in the order of the generating cycle. */
export const PHASES: readonly Phase[] = [
  { id: "wood", hant: "木", hans: "木", pinyin: "mù", en: "Wood", fr: "Bois" },
  { id: "fire", hant: "火", hans: "火", pinyin: "huǒ", en: "Fire", fr: "Feu" },
  { id: "earth", hant: "土", hans: "土", pinyin: "tǔ", en: "Earth", fr: "Terre" },
  { id: "metal", hant: "金", hans: "金", pinyin: "jīn", en: "Metal", fr: "Métal" },
  { id: "water", hant: "水", hans: "水", pinyin: "shuǐ", en: "Water", fr: "Eau" },
];

export const POLARITY_NAMES: Record<Polarity, ChineseName> = {
  yang: { hant: "陽", hans: "阳", pinyin: "yáng", en: "Yang", fr: "yang" },
  yin: { hant: "陰", hans: "阴", pinyin: "yīn", en: "Yin", fr: "yin" },
};

export type Stem = ChineseName & {
  /** 0 (Jia) to 9 (Gui). */
  index: number;
  /** Toneless pinyin, for addresses and search. */
  id: string;
  phase: PhaseId;
  polarity: Polarity;
};

/**
 * The ten Heavenly Stems (天干 tiāngān). Their English and French names are
 * their phase and polarity, the way the stems are taught: Jia is Yang Wood.
 */
export const STEMS: readonly Stem[] = [
  { index: 0, id: "jia", hant: "甲", hans: "甲", pinyin: "jiǎ", phase: "wood", polarity: "yang", en: "Yang Wood", fr: "Bois yang" },
  { index: 1, id: "yi", hant: "乙", hans: "乙", pinyin: "yǐ", phase: "wood", polarity: "yin", en: "Yin Wood", fr: "Bois yin" },
  { index: 2, id: "bing", hant: "丙", hans: "丙", pinyin: "bǐng", phase: "fire", polarity: "yang", en: "Yang Fire", fr: "Feu yang" },
  { index: 3, id: "ding", hant: "丁", hans: "丁", pinyin: "dīng", phase: "fire", polarity: "yin", en: "Yin Fire", fr: "Feu yin" },
  { index: 4, id: "wu", hant: "戊", hans: "戊", pinyin: "wù", phase: "earth", polarity: "yang", en: "Yang Earth", fr: "Terre yang" },
  { index: 5, id: "ji", hant: "己", hans: "己", pinyin: "jǐ", phase: "earth", polarity: "yin", en: "Yin Earth", fr: "Terre yin" },
  { index: 6, id: "geng", hant: "庚", hans: "庚", pinyin: "gēng", phase: "metal", polarity: "yang", en: "Yang Metal", fr: "Métal yang" },
  { index: 7, id: "xin", hant: "辛", hans: "辛", pinyin: "xīn", phase: "metal", polarity: "yin", en: "Yin Metal", fr: "Métal yin" },
  { index: 8, id: "ren", hant: "壬", hans: "壬", pinyin: "rén", phase: "water", polarity: "yang", en: "Yang Water", fr: "Eau yang" },
  { index: 9, id: "gui", hant: "癸", hans: "癸", pinyin: "guǐ", phase: "water", polarity: "yin", en: "Yin Water", fr: "Eau yin" },
];

export type Animal = ChineseName & {
  /** 0 (Rat) to 11 (Pig), the order of the branches. */
  index: number;
  id: string;
};

/** The twelve animals (生肖 shēngxiào) with the characters of the animals themselves. */
export const ANIMALS: readonly Animal[] = [
  { index: 0, id: "rat", hant: "鼠", hans: "鼠", pinyin: "shǔ", en: "Rat", fr: "Rat" },
  { index: 1, id: "ox", hant: "牛", hans: "牛", pinyin: "niú", en: "Ox", fr: "Bœuf" },
  { index: 2, id: "tiger", hant: "虎", hans: "虎", pinyin: "hǔ", en: "Tiger", fr: "Tigre" },
  { index: 3, id: "rabbit", hant: "兔", hans: "兔", pinyin: "tù", en: "Rabbit", fr: "Lapin" },
  { index: 4, id: "dragon", hant: "龍", hans: "龙", pinyin: "lóng", en: "Dragon", fr: "Dragon" },
  { index: 5, id: "snake", hant: "蛇", hans: "蛇", pinyin: "shé", en: "Snake", fr: "Serpent" },
  { index: 6, id: "horse", hant: "馬", hans: "马", pinyin: "mǎ", en: "Horse", fr: "Cheval" },
  { index: 7, id: "goat", hant: "羊", hans: "羊", pinyin: "yáng", en: "Goat", fr: "Chèvre" },
  { index: 8, id: "monkey", hant: "猴", hans: "猴", pinyin: "hóu", en: "Monkey", fr: "Singe" },
  { index: 9, id: "rooster", hant: "雞", hans: "鸡", pinyin: "jī", en: "Rooster", fr: "Coq" },
  { index: 10, id: "dog", hant: "狗", hans: "狗", pinyin: "gǒu", en: "Dog", fr: "Chien" },
  { index: 11, id: "pig", hant: "豬", hans: "猪", pinyin: "zhū", en: "Pig", fr: "Cochon" },
];

export type Branch = ChineseName & {
  /** 0 (Zi) to 11 (Hai). */
  index: number;
  id: string;
  phase: PhaseId;
  /** The polarity of the branch's place in the cycle (Zi, the first, is yang). */
  polarity: Polarity;
  /** The animal's index in ANIMALS (the same as the branch's). */
  animal: number;
  /** Its double hour on the clock, [start, end) in hours: Zi is 23–1. */
  hours: readonly [number, number];
  /** The solar month it rules, 0 = the Tiger month from Lichun … 11 = the Ox month from Xiaohan. */
  solarMonth: number;
  /** The lunar month it is the branch of (Yin is month 1, Zi month 11). */
  lunarMonth: number;
};

/**
 * The twelve Earthly Branches (地支 dìzhī). Their English and French names
 * are their animals' (the Horse branch, Wu), as they are commonly taught.
 */
export const BRANCHES: readonly Branch[] = [
  { index: 0, id: "zi", hant: "子", hans: "子", pinyin: "zǐ", phase: "water", polarity: "yang", animal: 0, hours: [23, 1], solarMonth: 10, lunarMonth: 11, en: "Rat", fr: "Rat" },
  { index: 1, id: "chou", hant: "丑", hans: "丑", pinyin: "chǒu", phase: "earth", polarity: "yin", animal: 1, hours: [1, 3], solarMonth: 11, lunarMonth: 12, en: "Ox", fr: "Bœuf" },
  { index: 2, id: "yin", hant: "寅", hans: "寅", pinyin: "yín", phase: "wood", polarity: "yang", animal: 2, hours: [3, 5], solarMonth: 0, lunarMonth: 1, en: "Tiger", fr: "Tigre" },
  { index: 3, id: "mao", hant: "卯", hans: "卯", pinyin: "mǎo", phase: "wood", polarity: "yin", animal: 3, hours: [5, 7], solarMonth: 1, lunarMonth: 2, en: "Rabbit", fr: "Lapin" },
  { index: 4, id: "chen", hant: "辰", hans: "辰", pinyin: "chén", phase: "earth", polarity: "yang", animal: 4, hours: [7, 9], solarMonth: 2, lunarMonth: 3, en: "Dragon", fr: "Dragon" },
  { index: 5, id: "si", hant: "巳", hans: "巳", pinyin: "sì", phase: "fire", polarity: "yin", animal: 5, hours: [9, 11], solarMonth: 3, lunarMonth: 4, en: "Snake", fr: "Serpent" },
  { index: 6, id: "wu", hant: "午", hans: "午", pinyin: "wǔ", phase: "fire", polarity: "yang", animal: 6, hours: [11, 13], solarMonth: 4, lunarMonth: 5, en: "Horse", fr: "Cheval" },
  { index: 7, id: "wei", hant: "未", hans: "未", pinyin: "wèi", phase: "earth", polarity: "yin", animal: 7, hours: [13, 15], solarMonth: 5, lunarMonth: 6, en: "Goat", fr: "Chèvre" },
  { index: 8, id: "shen", hant: "申", hans: "申", pinyin: "shēn", phase: "metal", polarity: "yang", animal: 8, hours: [15, 17], solarMonth: 6, lunarMonth: 7, en: "Monkey", fr: "Singe" },
  { index: 9, id: "you", hant: "酉", hans: "酉", pinyin: "yǒu", phase: "metal", polarity: "yin", animal: 9, hours: [17, 19], solarMonth: 7, lunarMonth: 8, en: "Rooster", fr: "Coq" },
  { index: 10, id: "xu", hant: "戌", hans: "戌", pinyin: "xū", phase: "earth", polarity: "yang", animal: 10, hours: [19, 21], solarMonth: 8, lunarMonth: 9, en: "Dog", fr: "Chien" },
  { index: 11, id: "hai", hant: "亥", hans: "亥", pinyin: "hài", phase: "water", polarity: "yin", animal: 11, hours: [21, 23], solarMonth: 9, lunarMonth: 10, en: "Pig", fr: "Cochon" },
];

/**
 * The stems hidden in each branch (地支藏干): the main qi first, then the
 * middle and the residual where there are, each with the weight a common
 * method gives it (one stem 100; two 70 and 30; three 60, 30 and 10). The
 * main qi is always of the branch's own phase. BaZi (part 15) names the
 * method it counts with; the zodiac's table shows them.
 */
export const HIDDEN_STEMS: readonly (readonly { stem: number; weight: number }[])[] = [
  [{ stem: 9, weight: 100 }],
  [{ stem: 5, weight: 60 }, { stem: 9, weight: 30 }, { stem: 7, weight: 10 }],
  [{ stem: 0, weight: 60 }, { stem: 2, weight: 30 }, { stem: 4, weight: 10 }],
  [{ stem: 1, weight: 100 }],
  [{ stem: 4, weight: 60 }, { stem: 1, weight: 30 }, { stem: 9, weight: 10 }],
  [{ stem: 2, weight: 60 }, { stem: 4, weight: 30 }, { stem: 6, weight: 10 }],
  [{ stem: 3, weight: 70 }, { stem: 5, weight: 30 }],
  [{ stem: 5, weight: 60 }, { stem: 3, weight: 30 }, { stem: 1, weight: 10 }],
  [{ stem: 6, weight: 60 }, { stem: 8, weight: 30 }, { stem: 4, weight: 10 }],
  [{ stem: 7, weight: 100 }],
  [{ stem: 4, weight: 60 }, { stem: 7, weight: 30 }, { stem: 3, weight: 10 }],
  [{ stem: 8, weight: 70 }, { stem: 0, weight: 30 }],
];

export type CyclePair = ChineseName & {
  /** 0 (Jia-Zi) to 59 (Gui-Hai). */
  index: number;
  /** Toneless pinyin with a hyphen, as in addresses: "jia-zi". */
  id: string;
  stem: number;
  branch: number;
};

/** In French the animal comes first and the stem follows as its complement, without an article: Rat de Bois yang, Serpent d’Eau yin. */
const frPair = (stem: Stem, branch: Branch): string => `${branch.fr} ${/^[AEIOUÉÈ]/.test(stem.fr) ? "d’" : "de "}${stem.fr}`;

/**
 * The sixty pairs (六十甲子), each stem with the branch of the same
 * polarity: Jia-Zi, Yi-Chou … Gui-Hai. English "Yang Wood Rat", French
 * "Rat de Bois yang".
 */
export const SIXTY: readonly CyclePair[] = Array.from({ length: 60 }, (_, index) => {
  const stem = STEMS[index % 10];
  const branch = BRANCHES[index % 12];
  return {
    index,
    id: `${stem.id}-${branch.id}`,
    stem: stem.index,
    branch: branch.index,
    hant: stem.hant + branch.hant,
    hans: stem.hans + branch.hans,
    pinyin: stem.pinyin + branch.pinyin,
    en: `${stem.en} ${branch.en}`,
    fr: frPair(stem, branch),
  };
});

export type NaYin = ChineseName & {
  /** 0 (Jia-Zi and Yi-Chou) to 29 (Ren-Xu and Gui-Hai): one for each two pairs of the cycle. */
  index: number;
  /** The phase it sounds. */
  phase: PhaseId;
};

const NA_YIN_ROWS: readonly (readonly [string, string, string, PhaseId, string, string])[] = [
  ["海中金", "海中金", "hǎizhōng jīn", "metal", "Metal in the sea", "Métal au fond de la mer"],
  ["爐中火", "炉中火", "lúzhōng huǒ", "fire", "Fire in the furnace", "Feu du fourneau"],
  ["大林木", "大林木", "dàlín mù", "wood", "Wood of the great forest", "Bois de la grande forêt"],
  ["路旁土", "路旁土", "lùpáng tǔ", "earth", "Earth by the roadside", "Terre du bord de la route"],
  ["劍鋒金", "剑锋金", "jiànfēng jīn", "metal", "Metal of the sword’s edge", "Métal du tranchant de l’épée"],
  ["山頭火", "山头火", "shāntóu huǒ", "fire", "Fire on the mountain top", "Feu au sommet de la montagne"],
  ["澗下水", "涧下水", "jiànxià shuǐ", "water", "Water in the ravine", "Eau du ravin"],
  ["城頭土", "城头土", "chéngtóu tǔ", "earth", "Earth on the city wall", "Terre des remparts"],
  ["白蠟金", "白蜡金", "báilà jīn", "metal", "Metal of white wax", "Métal de cire blanche"],
  ["楊柳木", "杨柳木", "yángliǔ mù", "wood", "Willow wood", "Bois de saule"],
  ["泉中水", "泉中水", "quánzhōng shuǐ", "water", "Water from the spring", "Eau de source"],
  ["屋上土", "屋上土", "wūshàng tǔ", "earth", "Earth on the roof", "Terre du toit"],
  ["霹靂火", "霹雳火", "pīlì huǒ", "fire", "Fire of the thunderbolt", "Feu de la foudre"],
  ["松柏木", "松柏木", "sōngbǎi mù", "wood", "Pine and cypress wood", "Bois de pin et de cyprès"],
  ["長流水", "长流水", "chángliú shuǐ", "water", "Long-flowing water", "Eau qui coule loin"],
  ["沙中金", "沙中金", "shāzhōng jīn", "metal", "Metal in the sand", "Métal dans le sable"],
  ["山下火", "山下火", "shānxià huǒ", "fire", "Fire at the foot of the mountain", "Feu au pied de la montagne"],
  ["平地木", "平地木", "píngdì mù", "wood", "Wood of the plain", "Bois de la plaine"],
  ["壁上土", "壁上土", "bìshàng tǔ", "earth", "Earth on the wall", "Terre du mur"],
  ["金箔金", "金箔金", "jīnbó jīn", "metal", "Gold leaf metal", "Métal de la feuille d’or"],
  ["覆燈火", "覆灯火", "fùdēng huǒ", "fire", "Fire of the lamp", "Feu de la lampe"],
  ["天河水", "天河水", "tiānhé shuǐ", "water", "Water of the Milky Way", "Eau de la Voie lactée"],
  ["大驛土", "大驿土", "dàyì tǔ", "earth", "Earth of the great road", "Terre de la grande route"],
  ["釵釧金", "钗钏金", "chāichuàn jīn", "metal", "Metal of hairpins and bracelets", "Métal des épingles et des bracelets"],
  ["桑柘木", "桑柘木", "sāngzhè mù", "wood", "Mulberry wood", "Bois du mûrier"],
  ["大溪水", "大溪水", "dàxī shuǐ", "water", "Water of the great stream", "Eau du grand torrent"],
  ["沙中土", "沙中土", "shāzhōng tǔ", "earth", "Earth in the sand", "Terre dans le sable"],
  ["天上火", "天上火", "tiānshàng huǒ", "fire", "Fire in the sky", "Feu du ciel"],
  ["石榴木", "石榴木", "shíliú mù", "wood", "Pomegranate wood", "Bois du grenadier"],
  ["大海水", "大海水", "dàhǎi shuǐ", "water", "Water of the great sea", "Eau de la grande mer"],
];

/**
 * The Na Yin (納音 nàyīn, "received sound"): the thirty "sounds" of the
 * sixty-cycle, one for each two pairs in order, each with its phase (Jia-Zi
 * and Yi-Chou are Metal in the sea; Geng-Wu, 1990's year, Earth by the
 * roadside). Their names are the classical images, in Ulune's words.
 */
export const NA_YIN: readonly NaYin[] = NA_YIN_ROWS.map(([hant, hans, pinyin, phase, en, fr], index) => ({
  index,
  hant,
  hans,
  pinyin,
  phase,
  en,
  fr,
}));

/** The Na Yin of a place in the sixty-cycle. */
export const naYinOf = (cycle: number): NaYin => NA_YIN[Math.floor((((cycle % 60) + 60) % 60) / 2)]!;

export type SolarTermName = ChineseName & {
  /** 0 (Lichun) to 23 (Dahan), as in terms.ts. */
  index: number;
  id: string;
  /** The Sun's apparent longitude, degrees. */
  longitude: number;
  /** "jie" (節) opens a solar month; "qi" (中氣) is a principal term. */
  kind: "jie" | "qi";
};

const TERM_ROWS: readonly (readonly [string, string, string, string, string, string])[] = [
  ["lichun", "立春", "立春", "lìchūn", "Start of Spring", "Début du printemps"],
  ["yushui", "雨水", "雨水", "yǔshuǐ", "Rain Water", "Eau de pluie"],
  ["jingzhe", "驚蟄", "惊蛰", "jīngzhé", "Awakening of Insects", "Éveil des insectes"],
  ["chunfen", "春分", "春分", "chūnfēn", "Spring Equinox", "Équinoxe de printemps"],
  ["qingming", "清明", "清明", "qīngmíng", "Clear and Bright", "Pure clarté"],
  ["guyu", "穀雨", "谷雨", "gǔyǔ", "Grain Rain", "Pluie des grains"],
  ["lixia", "立夏", "立夏", "lìxià", "Start of Summer", "Début de l’été"],
  ["xiaoman", "小滿", "小满", "xiǎomǎn", "Grain Buds", "Petite abondance"],
  ["mangzhong", "芒種", "芒种", "mángzhòng", "Grain in Ear", "Grain en épi"],
  ["xiazhi", "夏至", "夏至", "xiàzhì", "Summer Solstice", "Solstice d’été"],
  ["xiaoshu", "小暑", "小暑", "xiǎoshǔ", "Minor Heat", "Petite chaleur"],
  ["dashu", "大暑", "大暑", "dàshǔ", "Major Heat", "Grande chaleur"],
  ["liqiu", "立秋", "立秋", "lìqiū", "Start of Autumn", "Début de l’automne"],
  ["chushu", "處暑", "处暑", "chǔshǔ", "End of Heat", "Fin des chaleurs"],
  ["bailu", "白露", "白露", "báilù", "White Dew", "Rosée blanche"],
  ["qiufen", "秋分", "秋分", "qiūfēn", "Autumn Equinox", "Équinoxe d’automne"],
  ["hanlu", "寒露", "寒露", "hánlù", "Cold Dew", "Rosée froide"],
  ["shuangjiang", "霜降", "霜降", "shuāngjiàng", "Frost’s Descent", "Descente du givre"],
  ["lidong", "立冬", "立冬", "lìdōng", "Start of Winter", "Début de l’hiver"],
  ["xiaoxue", "小雪", "小雪", "xiǎoxuě", "Minor Snow", "Petite neige"],
  ["daxue", "大雪", "大雪", "dàxuě", "Major Snow", "Grande neige"],
  ["dongzhi", "冬至", "冬至", "dōngzhì", "Winter Solstice", "Solstice d’hiver"],
  ["xiaohan", "小寒", "小寒", "xiǎohán", "Minor Cold", "Petit froid"],
  ["dahan", "大寒", "大寒", "dàhán", "Major Cold", "Grand froid"],
];

/** The twenty-four solar terms (二十四節氣), from Lichun. */
export const SOLAR_TERMS: readonly SolarTermName[] = TERM_ROWS.map(([id, hant, hans, pinyin, en, fr], index) => ({
  index,
  id,
  hant,
  hans,
  pinyin,
  en,
  fr,
  longitude: (315 + 15 * index) % 360,
  kind: index % 2 === 0 ? "jie" : "qi",
}));

/** The names of the families themselves. */
export const FAMILY_NAMES = {
  stems: { hant: "天干", hans: "天干", pinyin: "tiāngān", en: "Heavenly Stems", fr: "Troncs célestes" },
  branches: { hant: "地支", hans: "地支", pinyin: "dìzhī", en: "Earthly Branches", fr: "Branches terrestres" },
  phases: { hant: "五行", hans: "五行", pinyin: "wǔxíng", en: "Five Phases", fr: "Cinq Phases" },
  sixty: { hant: "六十甲子", hans: "六十甲子", pinyin: "liùshí jiǎzǐ", en: "Sixty-cycle", fr: "Cycle sexagésimal" },
  terms: { hant: "二十四節氣", hans: "二十四节气", pinyin: "èrshísì jiéqì", en: "Twenty-four solar terms", fr: "Vingt-quatre termes solaires" },
  animals: { hant: "生肖", hans: "生肖", pinyin: "shēngxiào", en: "Twelve animals", fr: "Douze animaux" },
  lunar: { hant: "農曆", hans: "农历", pinyin: "nónglì", en: "Chinese calendar", fr: "Calendrier chinois" },
} as const satisfies Record<string, ChineseName>;

/** Choose the characters a reader asked for: Traditional by default. */
export const hanzi = (name: ChineseName, script: "hant" | "hans" = "hant"): string => name[script];
