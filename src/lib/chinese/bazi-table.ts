/*
 * BaZi's table (languages plan, part 12; its full form with every layer is
 * part 17): the four pillars with each stem's god, each branch and its
 * hidden stems with theirs, and how often each god stands in the chart;
 * from part 13 the Day Master's stage in each branch, each pillar's Na Yin,
 * the empty branches and the symbolic stars; from part 14 the interactions
 * between the pillars and whether they transform; as
 * text for Copy and as CSV in the tables' common shape (a section column,
 * ids rather than words).
 */
import { BRANCHES, SIXTY, STEMS } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { DAY_MASTER_NAME, TEN_GODS, tenGodById, type BaziChart, type BaziPillar } from "./bazi";
import { PILLAR_WORD, ixStatus } from "./bazi-reading";
import { INTERACTION_NAMES, baziInteractions, type Interaction } from "./bazi-interactions";
import { STARS, baziSigns, type PillarSigns } from "./bazi-signs";
import { PLACE_WORD } from "./zodiac-places";

type Shown = Pick<ChinesePrefs, "script" | "show">;

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** A pillar's hidden stems in a line: "丁 dīng 70 Seven Killings · 己 jǐ 30 Indirect Resource". */
export function hiddenGodsLine(p: BaziPillar, locale: string, prefs: Shown): string {
  return p.hidden
    .map((h) => {
      const s = chineseLabel(STEMS[h.stem]!, locale, prefs);
      const said = prefs.show === "names" ? s.name : [s.hanzi, s.pinyin].filter(Boolean).join(" ");
      return `${said} ${h.weight} ${chineseLabel(tenGodById(h.god), locale, prefs).name}`;
    })
    .join(" · ");
}

/** The stem's god, or the Day Master, as the board says it. */
export function stemGodName(p: BaziPillar, locale: string, prefs: Shown): string {
  return p.god ? chineseLabel(tenGodById(p.god), locale, prefs).text : chineseLabel(DAY_MASTER_NAME, locale, prefs).text;
}

export function baziTextParts(c: BaziChart, locale: string, prefs: Shown, name = ""): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? " : " : ": ";
  const pillars = c.pillars.map(
    (p) =>
      `${cnWord(locale, PILLAR_WORD[p.id])}${p.uncertain ? " ~" : ""}${colon}${chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text} · ${stemGodName(p, locale, prefs)} · ${cnWord(locale, "zkHidden")} ${hiddenGodsLine(p, locale, prefs)}`,
  );
  const gods = TEN_GODS.map((g) => `${chineseLabel(g, locale, prefs).text}${colon}${c.gods[g.id].shown} · ${c.gods[g.id].hidden}`);
  const signs = baziSigns(c);
  const signLines = signs.pillars.map(
    (s) =>
      `${cnWord(locale, PILLAR_WORD[s.place])}${colon}${cnWord(locale, "bzStage")} ${chineseLabel(s.stage, locale, prefs).text} · ${cnWord(locale, "zkNaYin")} ${chineseLabel(s.naYin, locale, prefs).text}${s.empty ? ` · ${cnWord(locale, "bzEmptyBadge")}` : ""}`,
  );
  const [a, b] = signs.empty;
  signLines.push(`${cnWord(locale, "bzEmptyHead")}${colon}${chineseLabel(BRANCHES[a]!, locale, prefs).text} · ${chineseLabel(BRANCHES[b]!, locale, prefs).text}`);
  const starLines = signs.stars.length
    ? signs.stars.map((h) => `${chineseLabel(STARS.find((x) => x.id === h.id)!, locale, prefs).text}${colon}${starPlaces(h.places, locale)}`)
    : [cnWord(locale, "bzStarsNone")];
  return [
    { id: "pillars", lines: [`${name ? `${name} · ` : ""}${cnWord(locale, "bzPartPillars")}`, ...pillars] },
    { id: "gods", lines: [`${cnWord(locale, "bzPartGods")} (${cnWord(locale, "bzGodsKey")})`, ...gods] },
    { id: "signs", lines: [cnWord(locale, "bzPartSigns"), ...signLines] },
    { id: "stars", lines: [cnWord(locale, "bzStarsHead"), ...starLines] },
    { id: "interactions", lines: [cnWord(locale, "bzPartIx"), ...ixLines(c, locale, prefs, colon)] },
  ];
}

/** A stem or branch an interaction joins, short: "卯 mǎo" or "Rabbit". */
export function ixItemShort(ix: Interaction, n: number, locale: string, prefs: Shown): string {
  const l = chineseLabel(ix.level === "stem" ? STEMS[n]! : BRANCHES[n]!, locale, prefs);
  return prefs.show === "names" ? l.name : `${l.name} ${[l.hanzi, l.pinyin].filter(Boolean).join(" ")}`;
}

function ixLines(c: BaziChart, locale: string, prefs: Shown, colon: string): string[] {
  const list = baziInteractions(c);
  if (!list.length) return [cnWord(locale, "bzIxNone")];
  return list.map(
    (ix) =>
      `${chineseLabel(INTERACTION_NAMES[ix.kind], locale, prefs).text}${colon}${starPlaces(ix.places, locale)} · ${ix.items.map((n) => ixItemShort(ix, n, locale, prefs)).join(" · ")} · ${ixStatus(ix, locale)}`,
  );
}

/** The pillars a star falls in, short: "Year · Month". */
export function starPlaces(places: readonly PillarSigns["place"][], locale: string): string {
  return places.map((p) => cnWord(locale, PLACE_WORD[p])).join(" · ");
}

export function baziTableCsv(c: BaziChart): string {
  const rows: string[][] = [["section", "field", "value"]];
  rows.push(["bazi", "birthUtc", new Date(c.birthMs).toISOString()]);
  rows.push(["bazi", "clock", c.four.clock]);
  rows.push(["bazi", "dayBoundary", c.four.dayBoundary]);
  rows.push(["bazi", "dayMaster", STEMS[c.dayMaster]!.id]);
  rows.push(["bazi", "timeUnknown", c.timeUnknown ? "1" : "0"]);
  rows.push([]);
  rows.push(["pillar", "place", "pillar", "hanzi", "stem", "stemGod", "branch", "hiddenStems", "uncertain"]);
  for (const p of c.pillars) {
    const pair = SIXTY[p.pillar.cycle]!;
    rows.push([
      "pillar",
      p.id,
      pair.id,
      pair.hant,
      STEMS[p.stem]!.id,
      p.god ?? "day-master",
      BRANCHES[p.branch]!.id,
      p.hidden.map((h) => `${STEMS[h.stem]!.id}:${h.weight}:${h.god}`).join("|"),
      p.uncertain ? "1" : "0",
    ]);
  }
  rows.push([]);
  rows.push(["god", "id", "family", "shown", "hidden"]);
  for (const g of TEN_GODS) rows.push(["god", g.id, g.family, String(c.gods[g.id].shown), String(c.gods[g.id].hidden)]);
  const signs = baziSigns(c);
  rows.push([]);
  rows.push(["signs", "place", "stage", "stageHanzi", "naYin", "naYinPhase", "empty"]);
  for (const s of signs.pillars) rows.push(["signs", s.place, s.stage.id, s.stage.hant, s.naYin.hant, s.naYin.phase, s.empty ? "1" : "0"]);
  rows.push(["signs", "emptyBranches", signs.empty.map((x) => BRANCHES[x]!.id).join("|")]);
  rows.push([]);
  rows.push(["star", "id", "places"]);
  for (const h of signs.stars) rows.push(["star", h.id, h.places.join("|")]);
  rows.push([]);
  rows.push(["ix", "id", "kind", "level", "places", "items", "phase", "neighbours", "transforms", "conditions"]);
  for (const ix of baziInteractions(c)) {
    const items = ix.items.map((n) => (ix.level === "stem" ? STEMS[n]! : BRANCHES[n]!).id).join("|");
    rows.push([
      "ix",
      ix.id,
      ix.kind,
      ix.level,
      ix.places.join("|"),
      items,
      ix.phase ?? "",
      ix.neighbours ? "1" : "0",
      ix.transforms == null ? "" : ix.transforms ? "1" : "0",
      (ix.conditions ?? []).map((x) => `${x.id}:${x.met ? 1 : 0}`).join("|"),
    ]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
