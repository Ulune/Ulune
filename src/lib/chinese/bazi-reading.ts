/*
 * What BaZi's pillar board says about a chosen cell (languages plan,
 * part 12): a stem (the Day Master, or one of the Ten Gods), a branch with
 * its hidden stems, a hidden stem, or one of the Ten Gods with where it
 * stands in the chart. Each says why a stem is the god it is (its phase
 * against the Day Master's, and their polarities), so the board can be
 * checked rather than believed.
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { BRANCHES, PHASES, POLARITY_NAMES, SIXTY, STEMS, type PhaseId } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord, type ChineseWordKey } from "./words";
import { DAY_MASTER_NAME, TEN_GODS, familyOf, tenGodById, tenGodOf, type BaziChart, type BaziPillar, type BaziPlaceId, type GodFamily, type TenGodId } from "./bazi";
import { DAY_MASTER_IMAGES, FAMILY_NAMES, TEN_GOD_TEXTS } from "./bazi-texts";
import { STARS, TRINE_PHASES, baziSigns, stageOf, starById, trineOfBranch, type BaziSigns, type StarBase, type StarId, type StarSource } from "./bazi-signs";
import { STAGE_TEXTS, STAR_TEXTS } from "./bazi-signs-texts";
import { said } from "./zodiac-texts";

type Shown = Pick<ChinesePrefs, "script" | "show">;

export const PILLAR_WORD: Record<BaziPlaceId, ChineseWordKey> = { year: "bzPillarYear", month: "bzPillarMonth", day: "bzPillarDay", hour: "bzPillarHour" };
const QI_WORD: readonly ChineseWordKey[] = ["bzQiMain", "bzQiMiddle", "bzQiResidual"];
const WHY: Record<GodFamily, ChineseWordKey> = { peer: "bzWhyPeer", output: "bzWhyOutput", wealth: "bzWhyWealth", power: "bzWhyPower", resource: "bzWhyResource" };

/** A selection on the board: a stem, a branch, a hidden stem or a god. */
export const stemRef = (place: BaziPlaceId): string => `bz:stem:${place}`;
export const branchCellRef = (place: BaziPlaceId): string => `bz:branch:${place}`;
export const hiddenRef = (place: BaziPlaceId, i: number): string => `bz:hidden:${place}:${i}`;
export const godRef = (id: TenGodId): string => `bz:god:${id}`;
/** Part 13: a pillar's life stage and Na Yin, the empty branches, a symbolic star. */
export const stageRef = (place: BaziPlaceId): string => `bz:stage:${place}`;
export const naYinRef = (place: BaziPlaceId): string => `bz:nayin:${place}`;
export const EMPTY_REF = "bz:empty";
export const starRef = (id: StarId): string => `bz:star:${id}`;

/** A phase as a sentence needs it: "Fire" in English; in French with its article ("le Feu", "la Terre", "l’Eau") or partitive ("du Feu", "de la Terre", "de l’Eau"). */
function phaseWords(id: PhaseId, locale: string): { the: string; The: string; some: string; name: string } {
  const p = PHASES.find((x) => x.id === id)!;
  if (locale !== "fr") return { the: p.en, The: p.en, some: p.en, name: p.en };
  const elided = /^[AEIOUÉ]/.test(p.fr);
  const fem = id === "earth";
  const the = elided ? `l’${p.fr}` : `${fem ? "la" : "le"} ${p.fr}`;
  const some = elided ? `de l’${p.fr}` : fem ? `de la ${p.fr}` : `du ${p.fr}`;
  return { the, The: the.charAt(0).toUpperCase() + the.slice(1), some, name: p.fr };
}

/** Why a stem is the god it is to this Day Master: "Your Day Master Xin (Metal) produces Water, and Ren is of the other polarity: …". */
export function whyGod(dayMaster: number, stem: number, locale: string, prefs: Shown): string {
  const god = tenGodOf(dayMaster, stem);
  const dm = STEMS[dayMaster]!;
  const s = STEMS[stem]!;
  const ph = phaseWords(s.phase, locale);
  return cnWord(locale, WHY[god.family], {
    stem: chineseLabel(s, locale, { ...prefs, show: "pinyin" }).pinyin ?? s.id,
    dm: chineseLabel(dm, locale, { ...prefs, show: "pinyin" }).pinyin ?? dm.id,
    dmPhase: phaseWords(dm.phase, locale).name,
    phase: ph.name,
    thePhase: ph.the,
    ThePhase: ph.The,
    somePhase: ph.some,
    polarity: cnWord(locale, god.samePolarity ? "bzSamePolarity" : "bzOtherPolarity"),
    god: chineseLabel(god, locale, prefs).name,
  });
}

function about(locale: string, signs = false): ElementReading["about"] {
  const paragraphs = [cnWord(locale, "bzAbout1"), cnWord(locale, "bzAbout2")];
  if (signs) paragraphs.push(cnWord(locale, "bzAbout3"));
  return { title: cnWord(locale, "bzAboutTitle"), paragraphs };
}

function pillarFact(p: BaziPillar, locale: string, prefs: Shown): ReadingFact {
  return { label: cnWord(locale, PILLAR_WORD[p.id]), value: chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text };
}

/** A stem of the board: the Day Master's image, or the god it is and why. */
function stemReading(c: BaziChart, p: BaziPillar, locale: string, prefs: Shown): ElementReading {
  const s = STEMS[p.stem]!;
  const label = chineseLabel(s, locale, prefs);
  const phase = PHASES.find((x) => x.id === s.phase)!;
  const facts: ReadingFact[] = [
    pillarFact(p, locale, prefs),
    { label: cnWord(locale, "zkStem"), value: label.text },
    { label: cnWord(locale, "zkAnimalPhase"), value: chineseLabel(phase, locale, prefs).text },
    { label: cnWord(locale, "zkPolarity"), value: chineseLabel(POLARITY_NAMES[s.polarity], locale, prefs).text },
  ];
  const isDm = p.id === "day";
  const god = p.god ? tenGodById(p.god) : null;
  if (god) facts.push({ label: cnWord(locale, "bzGod"), value: chineseLabel(god, locale, prefs).text, ref: godRef(god.id) });
  const lead = isDm ? said(DAY_MASTER_IMAGES[p.stem]!, locale) : said(TEN_GOD_TEXTS[god!.id], locale);
  const sections = isDm
    ? [{ id: "tradition", title: cnWord(locale, "zkTradition"), paragraphs: [cnWord(locale, "bzDayMasterRole")] }]
    : [{ id: "why", title: cnWord(locale, "bzWhy"), paragraphs: [whyGod(c.dayMaster, p.stem, locale, prefs)] }];
  return {
    id: stemRef(p.id),
    kind: "sign",
    title: isDm ? `${label.name} · ${chineseLabel(DAY_MASTER_NAME, locale, prefs).name}` : label.name,
    kicker: [cnWord(locale, PILLAR_WORD[p.id]), isDm ? chineseLabel(DAY_MASTER_NAME, locale, prefs).text : chineseLabel(god!, locale, prefs).text].join(" · "),
    lead,
    paragraphs: [lead, ...sections.flatMap((x) => x.paragraphs)],
    facts,
    sections,
    mark: label.hanzi ?? undefined,
    about: about(locale),
  };
}

/** A hidden stem in a line: "Bing · Yang Fire 60 · Direct Officer". */
function hiddenLine(h: BaziPillar["hidden"][number], locale: string, prefs: Shown): string {
  const s = chineseLabel(STEMS[h.stem]!, locale, prefs);
  return `${s.text} ${h.weight} · ${chineseLabel(tenGodById(h.god), locale, prefs).name}`;
}

/** A branch of the board: its animal, phase, and hidden stems with their gods. */
function branchReading(c: BaziChart, p: BaziPillar, locale: string, prefs: Shown): ElementReading {
  const b = BRANCHES[p.branch]!;
  const label = chineseLabel(b, locale, prefs);
  const phase = PHASES.find((x) => x.id === b.phase)!;
  const facts: ReadingFact[] = [
    pillarFact(p, locale, prefs),
    { label: cnWord(locale, "zkBranch"), value: label.text },
    { label: cnWord(locale, "zkAnimalPhase"), value: chineseLabel(phase, locale, prefs).text },
    { label: cnWord(locale, "zkPolarity"), value: chineseLabel(POLARITY_NAMES[b.polarity], locale, prefs).text },
    ...p.hidden.map((h, i) => ({ label: cnWord(locale, QI_WORD[i]!), value: hiddenLine(h, locale, prefs), ref: hiddenRef(p.id, i) })),
  ];
  const lead = cnWord(locale, "bzBranchLead", {
    branch: [label.pinyin, label.hanzi].filter(Boolean).join(" ") || b.id,
    animal: label.name,
    list: p.hidden.map((h) => chineseLabel(STEMS[h.stem]!, locale, prefs).name).join(", "),
  });
  return {
    id: branchCellRef(p.id),
    kind: "sign",
    title: label.name,
    kicker: [cnWord(locale, PILLAR_WORD[p.id]), cnWord(locale, "zkBranch")].join(" · "),
    lead,
    paragraphs: [lead],
    facts,
    mark: label.hanzi ?? undefined,
    about: about(locale),
  };
}

/** A hidden stem: the god it is, quietly, and why. */
function hiddenReading(c: BaziChart, p: BaziPillar, i: number, locale: string, prefs: Shown): ElementReading | null {
  const h = p.hidden[i];
  if (!h) return null;
  const s = chineseLabel(STEMS[h.stem]!, locale, prefs);
  const god = tenGodById(h.god);
  const lead = said(TEN_GOD_TEXTS[god.id], locale);
  const why = whyGod(c.dayMaster, h.stem, locale, prefs);
  return {
    id: hiddenRef(p.id, i),
    kind: "sign",
    title: s.name,
    kicker: [cnWord(locale, PILLAR_WORD[p.id]), cnWord(locale, QI_WORD[i]!), String(h.weight)].join(" · "),
    lead,
    paragraphs: [lead, why, cnWord(locale, "bzHiddenNote")],
    facts: [
      { label: cnWord(locale, "zkStem"), value: s.text },
      { label: cnWord(locale, QI_WORD[i]!), value: String(h.weight) },
      { label: cnWord(locale, "bzGod"), value: chineseLabel(god, locale, prefs).text, ref: godRef(god.id) },
      { label: cnWord(locale, "zkBranch"), value: chineseLabel(BRANCHES[p.branch]!, locale, prefs).text, ref: branchCellRef(p.id) },
    ],
    sections: [
      { id: "why", title: cnWord(locale, "bzWhy"), paragraphs: [why] },
      { id: "hidden", title: cnWord(locale, "zkHidden"), paragraphs: [cnWord(locale, "bzHiddenNote")] },
    ],
    mark: s.hanzi ?? undefined,
    about: about(locale),
  };
}

/** One of the Ten Gods: what it stands for, and where it stands in the chart, shown and hidden. */
function godReading(c: BaziChart, id: TenGodId, locale: string, prefs: Shown): ElementReading {
  const god = tenGodById(id);
  const name = chineseLabel(god, locale, prefs);
  const facts: ReadingFact[] = [];
  for (const p of c.pillars) {
    if (p.god === id) facts.push({ label: cnWord(locale, PILLAR_WORD[p.id]), value: `${chineseLabel(STEMS[p.stem]!, locale, prefs).text} · ${cnWord(locale, "bzShown")}`, ref: stemRef(p.id) });
    p.hidden.forEach((h, i) => {
      if (h.god === id) facts.push({ label: cnWord(locale, PILLAR_WORD[p.id]), value: `${chineseLabel(STEMS[h.stem]!, locale, prefs).text} · ${cnWord(locale, "bzHiddenOne")} ${h.weight}`, ref: hiddenRef(p.id, i) });
    });
  }
  const lead = said(TEN_GOD_TEXTS[id], locale);
  const n = c.gods[id];
  const paragraphs = [lead];
  if (!n.shown && !n.hidden) paragraphs.push(cnWord(locale, "bzGodNone"));
  return {
    id: godRef(id),
    kind: "aspect",
    title: name.name,
    kicker: [said(FAMILY_NAMES[god.family], locale), [name.pinyin, name.hanzi].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
    lead,
    paragraphs,
    facts,
    sections: paragraphs.length > 1 ? [{ id: "none", title: cnWord(locale, "bzInChart"), paragraphs: paragraphs.slice(1) }] : undefined,
    mark: name.hanzi ?? undefined,
    about: about(locale),
  };
}

const BASE_WORD: Record<StarBase, ChineseWordKey> = {
  "day-stem": "bzBaseDm",
  "year-day-branch": "bzBaseBranches",
  "month-branch": "bzBaseMonth",
  "year-branch": "bzBaseYear",
  stems: "bzBaseStems",
};

/** A pinyin and characters, the way the "why" sentences name a stem or branch: "xīn 辛". */
function short(n: { id: string; pinyin: string; hant: string; hans: string; en: string; fr: string }, locale: string, prefs: Shown): string {
  const l = chineseLabel(n, locale, prefs);
  return prefs.show === "names" ? l.name : [l.pinyin, l.hanzi].filter(Boolean).join(" ");
}

/** "Horse · wǔ 午 or Tiger · yín 寅". */
function orList(items: string[], locale: string): string {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${cnWord(locale, "bzOr")} ${items.at(-1)}`;
}

/** The Day Master's stage in a pillar's branch, and why. */
function stageReading(c: BaziChart, signs: BaziSigns, p: BaziPillar, locale: string, prefs: Shown): ElementReading {
  const ps = signs.pillars.find((x) => x.place === p.id)!;
  const st = chineseLabel(ps.stage, locale, prefs);
  const dm = STEMS[c.dayMaster]!;
  // The branch where the Day Master is born: the one where its stage is Birth.
  const birthBranch = BRANCHES.find((b) => stageOf(c.dayMaster, b.index).id === "birth")!;
  const why = cnWord(locale, dm.polarity === "yang" ? "bzStageWhyYang" : "bzStageWhyYin", {
    dm: short(dm, locale, prefs),
    birth: chineseLabel(birthBranch, locale, prefs).text,
    branch: chineseLabel(BRANCHES[p.branch]!, locale, prefs).text,
    stage: st.name,
  });
  const lead = said(STAGE_TEXTS[ps.stage.id], locale);
  const sections = [
    { id: "why", title: cnWord(locale, "bzStageWhy"), paragraphs: [why] },
    { id: "stages", title: cnWord(locale, "bzStagesTitle"), paragraphs: [cnWord(locale, "bzStagesNote")] },
  ];
  return {
    id: stageRef(p.id),
    kind: "sign",
    title: st.name,
    kicker: [cnWord(locale, PILLAR_WORD[p.id]), cnWord(locale, "bzStage")].join(" · "),
    lead,
    paragraphs: [lead, why, cnWord(locale, "bzStagesNote")],
    facts: [
      pillarFact(p, locale, prefs),
      { label: cnWord(locale, "zkBranch"), value: chineseLabel(BRANCHES[p.branch]!, locale, prefs).text, ref: branchCellRef(p.id) },
      { label: chineseLabel(DAY_MASTER_NAME, locale, prefs).name, value: chineseLabel(dm, locale, prefs).text, ref: stemRef("day") },
      { label: cnWord(locale, "bzStage"), value: st.text },
    ],
    sections,
    mark: st.hanzi ?? undefined,
    about: about(locale, true),
  };
}

/** A pillar's Na Yin: its image, its phase, and how that phase meets the Day Master's. */
function naYinReading(c: BaziChart, signs: BaziSigns, p: BaziPillar, locale: string, prefs: Shown): ElementReading {
  const ny = signs.pillars.find((x) => x.place === p.id)!.naYin;
  const label = chineseLabel(ny, locale, prefs);
  const phase = PHASES.find((x) => x.id === ny.phase)!;
  const family = familyOf(STEMS[c.dayMaster]!.phase, ny.phase);
  const lead = cnWord(locale, "bzNaYinLead");
  return {
    id: naYinRef(p.id),
    kind: "sign",
    title: label.name,
    kicker: [cnWord(locale, PILLAR_WORD[p.id]), cnWord(locale, "zkNaYin")].join(" · "),
    lead,
    paragraphs: [lead],
    facts: [
      pillarFact(p, locale, prefs),
      { label: cnWord(locale, "zkNaYin"), value: label.text },
      { label: cnWord(locale, "bzPhase"), value: chineseLabel(phase, locale, prefs).text },
      { label: cnWord(locale, "bzToDm"), value: said(FAMILY_NAMES[family], locale), ref: stemRef("day") },
    ],
    mark: label.hanzi ?? undefined,
    about: about(locale, true),
  };
}

/** The empty branches of the day's week, and which pillars stand on them. */
function emptyReading(c: BaziChart, signs: BaziSigns, locale: string, prefs: Shown): ElementReading {
  const day = c.pillars.find((x) => x.id === "day")!;
  const first = day.pillar.cycle - (day.pillar.cycle % 10);
  const [a, b] = signs.empty;
  const br = (i: number) => chineseLabel(BRANCHES[((i % 12) + 12) % 12]!, locale, prefs).text;
  const why = cnWord(locale, "bzEmptyWhy", {
    day: chineseLabel(SIXTY[day.pillar.cycle]!, locale, prefs).text,
    first: chineseLabel(SIXTY[first]!, locale, prefs).text,
    from: br(SIXTY[first]!.branch),
    to: br(SIXTY[first + 9]!.branch),
    a: br(a),
    b: br(b),
  });
  const on = signs.pillars.filter((x) => x.empty);
  const lead = cnWord(locale, "bzEmptyLead");
  return {
    id: EMPTY_REF,
    kind: "sign",
    title: cnWord(locale, "bzEmptyHead"),
    kicker: [cnWord(locale, "bzEmptyHead"), "空亡 kōngwáng"].join(" · "),
    lead,
    paragraphs: [lead, why],
    facts: [
      { label: cnWord(locale, "bzWeek"), value: chineseLabel(SIXTY[first]!, locale, prefs).text, ref: stemRef("day") },
      { label: cnWord(locale, "bzEmptyHead"), value: `${br(a)} · ${br(b)}` },
      on.length
        ? { label: cnWord(locale, "bzEmptyPillars"), value: on.map((x) => cnWord(locale, PILLAR_WORD[x.place])).join(", "), ref: branchCellRef(on[0]!.place) }
        : { label: cnWord(locale, "bzEmptyPillars"), value: cnWord(locale, "bzEmptyNone") },
    ],
    sections: [{ id: "why", title: cnWord(locale, "bzEmptyWhyTitle"), paragraphs: [why] }],
    mark: "空",
    about: about(locale, true),
  };
}

/** How a star was found, in a sentence. */
function starWhy(c: BaziChart, id: StarId, src: StarSource, locale: string, prefs: Shown): string {
  const targets = src.stems
    ? cnWord(locale, "bzInStem", { list: orList(src.stems.map((s) => chineseLabel(STEMS[s]!, locale, prefs).text), locale) })
    : cnWord(locale, "bzInBranch", { list: orList((src.branches ?? []).map((b) => chineseLabel(BRANCHES[b]!, locale, prefs).text), locale) });
  if (src.from === "dm") return cnWord(locale, "bzStarFromDm", { dm: short(STEMS[c.dayMaster]!, locale, prefs), targets });
  if (src.from === "stems") {
    return cnWord(locale, "bzStarWonders", {
      list: (src.stems ?? []).map((s) => short(STEMS[s]!, locale, prefs)).join(", "),
      places: src.places.map((x) => cnWord(locale, PILLAR_WORD[x]).toLowerCase()).join(", "),
    });
  }
  const base = c.pillars.find((x) => x.id === src.from)!;
  const vars = {
    branch: chineseLabel(BRANCHES[base.branch]!, locale, prefs).text,
    pillar: cnWord(locale, PILLAR_WORD[base.id]).toLowerCase(),
    targets,
  };
  // The trine stars say the base's trine; the Virtues, the Phoenix and Joy do not.
  if (starById(id).base !== "year-day-branch") return cnWord(locale, "bzStarFromBranch", vars);
  const ph = phaseWords(TRINE_PHASES[trineOfBranch(base.branch)]!, locale);
  return cnWord(locale, "bzStarFromTrine", { ...vars, phase: ph.name, somePhase: ph.some });
}

/** A symbolic star: what it stands for, where it falls, how it was found. */
function starReading(c: BaziChart, signs: BaziSigns, id: StarId, locale: string, prefs: Shown): ElementReading | null {
  const hit = signs.stars.find((x) => x.id === id);
  if (!hit) return null;
  const star = starById(id);
  const name = chineseLabel(star, locale, prefs);
  const lead = said(STAR_TEXTS[id], locale);
  const how = hit.sources.map((src) => starWhy(c, id, src, locale, prefs));
  const byStem = star.base === "stems" || hit.sources.some((x) => x.stems && x.from !== "stems");
  const facts: ReadingFact[] = hit.places.map((place) => {
    const p = c.pillars.find((x) => x.id === place)!;
    return byStem
      ? { label: cnWord(locale, PILLAR_WORD[place]), value: chineseLabel(STEMS[p.stem]!, locale, prefs).text, ref: stemRef(place) }
      : { label: cnWord(locale, PILLAR_WORD[place]), value: chineseLabel(BRANCHES[p.branch]!, locale, prefs).text, ref: branchCellRef(place) };
  });
  return {
    id: starRef(id),
    kind: "aspect",
    title: name.name,
    kicker: [cnWord(locale, BASE_WORD[star.base]), [name.pinyin, name.hanzi].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead, ...how, cnWord(locale, "bzStarsNote")],
    facts,
    sections: [
      { id: "how", title: cnWord(locale, "bzStarHow"), paragraphs: how },
      { id: "stars", title: cnWord(locale, "bzStarsHead"), paragraphs: [cnWord(locale, "bzStarsNote")] },
    ],
    mark: name.hanzi ?? undefined,
    about: about(locale, true),
  };
}

/** The reading of a selection on the board, or null when it is not the board's. */
export function baziReading(c: BaziChart, ref: string | null, locale: string, prefs: Shown): ElementReading | null {
  if (!ref) return null;
  const m = /^bz:(stem|branch):(year|month|day|hour)$/.exec(ref);
  if (m) {
    const p = c.pillars.find((x) => x.id === m[2]);
    if (!p) return null;
    return m[1] === "stem" ? stemReading(c, p, locale, prefs) : branchReading(c, p, locale, prefs);
  }
  const h = /^bz:hidden:(year|month|day|hour):(\d)$/.exec(ref);
  if (h) {
    const p = c.pillars.find((x) => x.id === h[1]);
    return p ? hiddenReading(c, p, Number(h[2]), locale, prefs) : null;
  }
  const g = /^bz:god:([a-z-]+)$/.exec(ref);
  if (g && TEN_GODS.some((x) => x.id === g[1])) return godReading(c, g[1] as TenGodId, locale, prefs);
  // Part 13: the stages, the Na Yin, the empty branches, the stars.
  const sn = /^bz:(stage|nayin):(year|month|day|hour)$/.exec(ref);
  if (sn) {
    const p = c.pillars.find((x) => x.id === sn[2]);
    if (!p) return null;
    return sn[1] === "stage" ? stageReading(c, baziSigns(c), p, locale, prefs) : naYinReading(c, baziSigns(c), p, locale, prefs);
  }
  if (ref === EMPTY_REF) return emptyReading(c, baziSigns(c), locale, prefs);
  const st = /^bz:star:([a-z-]+)$/.exec(ref);
  if (st && STARS.some((x) => x.id === st[1])) return starReading(c, baziSigns(c), st[1] as StarId, locale, prefs);
  return null;
}
