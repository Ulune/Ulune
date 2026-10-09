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
import { DAY_MASTER_NAME, TEN_GODS, tenGodById, tenGodOf, type BaziChart, type BaziPillar, type BaziPlaceId, type GodFamily, type TenGodId } from "./bazi";
import { DAY_MASTER_IMAGES, FAMILY_NAMES, TEN_GOD_TEXTS } from "./bazi-texts";
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

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "bzAboutTitle"), paragraphs: [cnWord(locale, "bzAbout1"), cnWord(locale, "bzAbout2")] };
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
  return null;
}
