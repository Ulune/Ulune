/*
 * BaZi's table (languages plan, part 12; its full form with every layer is
 * part 17): the four pillars with each stem's god, each branch and its
 * hidden stems with theirs, and how often each god stands in the chart; as
 * text for Copy and as CSV in the tables' common shape (a section column,
 * ids rather than words).
 */
import { BRANCHES, SIXTY, STEMS } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { DAY_MASTER_NAME, TEN_GODS, tenGodById, type BaziChart, type BaziPillar } from "./bazi";
import { PILLAR_WORD } from "./bazi-reading";

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
  return [
    { id: "pillars", lines: [`${name ? `${name} · ` : ""}${cnWord(locale, "bzPartPillars")}`, ...pillars] },
    { id: "gods", lines: [`${cnWord(locale, "bzPartGods")} (${cnWord(locale, "bzGodsKey")})`, ...gods] },
  ];
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
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
