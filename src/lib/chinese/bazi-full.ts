/*
 * BaZi's full table (languages plan, part 17: "a table view with every layer
 * as columns, exportable to CSV"): one row per pillar, the four of the chart
 * and, when given, the luck pillar running now and this year's pillar; one
 * column per layer: the pillar, its stem and god, its branch and phase, the
 * hidden stems with their gods, the Day Master's life stage in the branch,
 * the Na Yin, an empty branch, the stars, what it joins or meets, and the
 * points it brings to the five phases. As rows for the screen, lines for
 * Copy and ids for the CSV.
 */
import { BRANCHES, HIDDEN_STEMS, PHASES, SIXTY, STEMS, naYinOf } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { DAY_MASTER_NAME, tenGodById, tenGodOf, type BaziChart, type BaziPlaceId } from "./bazi";
import { STARS, baziSigns, stageOf, starsForPillar, type StarId } from "./bazi-signs";
import { INTERACTION_NAMES, baziInteractions } from "./bazi-interactions";
import { baziBalance } from "./bazi-balance";
import { PILLAR_WORD, fmtPoints } from "./bazi-reading";
import { PLACE_WORD } from "./zodiac-places";
import { luckAt, type FlowYear, type Luck, type Meeting } from "./bazi-luck";
import { semicolon } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;

/** What the time rows read: the lucks (one per count given) and the year shown. */
export type FullTime = { lucks: Luck[]; year: FlowYear; nowMs: number };

export type FullRow = {
  id: string;
  kind: "natal" | "luck" | "year";
  place?: BaziPlaceId;
  label: string;
  pillar: string;
  stem: string;
  stemGod: string;
  branch: string;
  hidden: string;
  stage: string;
  naYin: string;
  empty: string;
  stars: string;
  links: string;
  points: string;
  /** The same, as ids for the CSV. */
  ids: string[];
};

export const FULL_CSV_HEAD = ["full", "row", "pillar", "stem", "stemGod", "branch", "hiddenStems", "stage", "naYin", "empty", "stars", "links", "points"];

const dash = "–";

export function baziFullRows(c: BaziChart, locale: string, prefs: Shown, time?: FullTime): FullRow[] {
  const signs = baziSigns(c);
  const ixs = baziInteractions(c);
  const balance = baziBalance(c);
  const names = { ...prefs, show: "names" as const };
  const hiddenOf = (branch: number) =>
    HIDDEN_STEMS[branch]!.map((h) => {
      const s = chineseLabel(STEMS[h.stem]!, locale, prefs);
      const said = prefs.show === "names" ? s.name : [s.hanzi, s.pinyin].filter(Boolean).join(" ");
      return `${said} ${h.weight} ${chineseLabel(tenGodOf(c.dayMaster, h.stem), locale, names).name}`;
    }).join(" · ");
  const hiddenIds = (branch: number) => HIDDEN_STEMS[branch]!.map((h) => `${STEMS[h.stem]!.id}:${h.weight}:${tenGodOf(c.dayMaster, h.stem).id}`).join("|");
  const starNames = (ids: StarId[]) => (ids.length ? ids.map((id) => chineseLabel(STARS.find((x) => x.id === id)!, locale, names).name).join(", ") : dash);
  const emptyWord = (b: number) => (signs.empty.includes(b) ? cnWord(locale, "bzYes") : dash);
  const branchText = (b: number) => {
    const br = BRANCHES[b]!;
    return `${chineseLabel(br, locale, prefs).text} · ${chineseLabel(PHASES.find((x) => x.id === br.phase)!, locale, names).name}`;
  };
  const meetText = (m: Meeting) =>
    `${chineseLabel(INTERACTION_NAMES[m.kind], locale, names).name} · ${m.with.map((p) => (p === "luck" ? cnWord(locale, "bzlInLuck") : cnWord(locale, PLACE_WORD[p]))).join(", ")}`;

  const rows: FullRow[] = c.pillars.map((p) => {
    const ps = signs.pillars.find((x) => x.place === p.id)!;
    const mine = ixs.filter((x) => x.places.includes(p.id));
    const links = mine.map((x) => `${chineseLabel(INTERACTION_NAMES[x.kind], locale, names).name} · ${x.places.filter((q) => q !== p.id).map((q) => cnWord(locale, PLACE_WORD[q])).join(", ") || cnWord(locale, PLACE_WORD[p.id])}`);
    const pts = PHASES.map((ph) => {
      const n = balance.phases.find((x) => x.phase === ph.id)!.parts.filter((x) => x.place === p.id).reduce((s, x) => s + x.points, 0);
      return [ph, n] as const;
    }).filter(([, n]) => n > 0);
    const god = p.god ? chineseLabel(tenGodById(p.god), locale, names).name : chineseLabel(DAY_MASTER_NAME, locale, names).name;
    return {
      id: p.id,
      kind: "natal",
      place: p.id,
      label: `${cnWord(locale, PILLAR_WORD[p.id])}${p.uncertain ? " ~" : ""}`,
      pillar: chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text,
      stem: chineseLabel(STEMS[p.stem]!, locale, prefs).text,
      stemGod: god,
      branch: branchText(p.branch),
      hidden: hiddenOf(p.branch),
      stage: chineseLabel(ps.stage, locale, prefs).text,
      naYin: chineseLabel(ps.naYin, locale, prefs).text,
      empty: ps.empty ? cnWord(locale, "bzYes") : dash,
      stars: starNames(ps.stars),
      links: links.length ? links.join(semicolon(locale)) : dash,
      points: pts.map(([ph, n]) => `${chineseLabel(ph, locale, names).name} ${fmtPoints(n, locale)}`).join(" · "),
      ids: [
        "full",
        p.id,
        SIXTY[p.pillar.cycle]!.id,
        STEMS[p.stem]!.id,
        p.god ?? "day-master",
        BRANCHES[p.branch]!.id,
        hiddenIds(p.branch),
        ps.stage.id,
        ps.naYin.hant,
        ps.empty ? "1" : "0",
        ps.stars.join("|"),
        mine.map((x) => x.id).join("|"),
        pts.map(([ph, n]) => `${ph.id}:${Math.round(n * 100) / 100}`).join("|"),
      ],
    };
  });

  if (time) {
    const timeRow = (id: string, kind: "luck" | "year", label: string, cycle: number, meets: Meeting[]): FullRow => {
      const pair = SIXTY[cycle]!;
      const stars = starsForPillar(c, pair.stem, pair.branch);
      const stage = stageOf(c.dayMaster, pair.branch);
      const ny = naYinOf(cycle);
      return {
        id,
        kind,
        label,
        pillar: chineseLabel(pair, locale, prefs).text,
        stem: chineseLabel(STEMS[pair.stem]!, locale, prefs).text,
        stemGod: chineseLabel(tenGodOf(c.dayMaster, pair.stem), locale, names).name,
        branch: branchText(pair.branch),
        hidden: hiddenOf(pair.branch),
        stage: chineseLabel(stage, locale, prefs).text,
        naYin: chineseLabel(ny, locale, prefs).text,
        empty: emptyWord(pair.branch),
        stars: starNames(stars),
        links: meets.length ? meets.map(meetText).join(semicolon(locale)) : dash,
        points: dash,
        ids: [
          "full",
          id,
          pair.id,
          STEMS[pair.stem]!.id,
          tenGodOf(c.dayMaster, pair.stem).id,
          BRANCHES[pair.branch]!.id,
          hiddenIds(pair.branch),
          stage.id,
          ny.hant,
          signs.empty.includes(pair.branch) ? "1" : "0",
          stars.join("|"),
          meets.map((m) => `${m.kind}:${m.with.join("+")}`).join("|"),
          "",
        ],
      };
    };
    for (const l of time.lucks) {
      const p = luckAt(l, time.nowMs);
      if (!p) continue;
      const label = `${cnWord(locale, "bzlInLuck")} · ${cnWord(locale, "bzlAges", { from: Math.floor(p.fromAge), to: Math.floor(p.toAge) })}${time.lucks.length > 1 ? ` · ${cnWord(locale, l.count === "yang" ? "bzlCountYang" : "bzlCountYin")}` : ""}`;
      rows.push(timeRow(`luck-${l.count}`, "luck", label, p.pillar.cycle, p.meets));
    }
    rows.push(timeRow("flow-year", "year", cnWord(locale, "bzlYearHead", { year: time.year.year }), time.year.pillar.cycle, time.year.meets));
  }
  return rows;
}

/** The full table as Copy's lines: one line per pillar, every layer in it. */
export function fullLines(rows: FullRow[], locale: string): string[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const k = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  return rows.map(
    (r) =>
      `${r.label}${colon}${r.pillar} | ${r.stemGod} | ${r.branch} | ${k("zkHidden")} ${r.hidden} | ${k("bzStage")} ${r.stage} | ${k("zkNaYin")} ${r.naYin} | ${k("bzEmptyBadge")} ${r.empty} | ${k("bzStarsHead")} ${r.stars} | ${k("bzlMeetsCol")} ${r.links}${r.points !== dash ? ` | ${k("bzPointsCol")} ${r.points}` : ""}`,
  );
}
