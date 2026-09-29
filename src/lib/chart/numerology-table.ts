/**
 * The numerology table's rows (part 61 of the launch plan): the core
 * numbers with their steps, the name letter by letter, the birth grid, the
 * long cycles, the years, the bridges. The page, its Copy buttons and the
 * CSV read from here; every step is written from the calculation.
 */
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyCoreLabel, numerologyPageText as p } from "@/lib/i18n/numerology-ui";
import { numerologyYear, valueOfCore, type NumerologyChart, type NumerologyCoreId, type NumerologyName } from "./numerology";
import { LETTER_CYCLE_IDS, type AgeSpan, type NumerologyYearRow } from "./numerology-cycles";
import { GRID_LAYOUTS, type GridLayoutId } from "./numerology-grid";
import { PLANE_IDS, PLANE_LETTERS, type NameWord } from "./numerology-name";
import { chainText, gapOf, isMaster, stepsText, term, wholeText, type NumerologyTerm, type NumerologyValue } from "./numerology-reduce";

/** The core numbers the table lists: the wheel's six, then two more from the date and the name. */
export const TABLE_CORES = [
  "lifepath",
  "expression",
  "soulurge",
  "personality",
  "birthday",
  "maturity",
  "attitude",
  "rationalThought",
] as const;
export type TableCoreId = (typeof TABLE_CORES)[number];

export function tableCoreValue(chart: NumerologyChart, id: TableCoreId): NumerologyValue {
  if (id === "attitude") return chart.attitude;
  if (id === "rationalThought") return chart.rationalThought;
  return valueOfCore(chart, id);
}

export function tableCoreLabel(locale: AppLocale, id: TableCoreId): string {
  return id === "attitude" || id === "rationalThought" ? p(locale, id) : numerologyCoreLabel(locale, id as NumerologyCoreId);
}

/** A karmic debt or a master number, said in words ("karmic debt 13"). */
export function valueNote(locale: AppLocale, value: NumerologyValue): string {
  if (value.debt) return p(locale, "debtNote", { debt: value.debt });
  if (isMaster(value.number)) return p(locale, "masterNote");
  return "";
}

/** A name's letters with their values: "C3 A1 M4 I9 L3 L3 E5". */
export function lettersText(word: NameWord): string {
  return word.letters.map((l) => `${l.ch}${l.value}`).join(" ");
}

export type WordRow = { word: NameWord; all: NumerologyTerm; vowels: NumerologyTerm | null; consonants: NumerologyTerm | null };

/** Each name of a name: its letters, and its total, vowels and consonants each reduced. */
export function wordRows(name: NumerologyName): WordRow[] {
  return name.parsed.words.map((word) => {
    const sum = (pick: (vowel: boolean) => boolean) => {
      const ls = word.letters.filter((l) => pick(l.vowel));
      return ls.length ? term(word.text, ls.reduce((s, l) => s + l.value, 0)) : null;
    };
    return { word, all: sum(() => true)!, vowels: sum((v) => v), consonants: sum((v) => !v) };
  });
}

/** How a name's number was added: "28 → 10 → 1" for one name. */
export function termText(t: NumerologyTerm | null): string {
  return t ? chainText(t.chain) : "";
}

export type DetailRow = { id: string; label: string; value: string; how: string };

/** The name's finer numbers, in the order the table shows them. */
export function detailRows(name: NumerologyName, locale: AppLocale): DetailRow[] {
  const d = name.detail;
  const none = p(locale, "none");
  const initials = name.parsed.words.map((w) => w.letters[0]!).filter(Boolean);
  const rows: DetailRow[] = [
    { id: "lessons", label: p(locale, "lessons"), value: d.karmicLessons.join(", ") || none, how: p(locale, "lessonsHow") },
    {
      id: "passion",
      label: p(locale, "passion"),
      value: d.hiddenPassion.join(", ") || none,
      how: d.hiddenPassion.length ? p(locale, "passionHow", { count: d.counts[d.hiddenPassion[0]!] ?? 0 }) : "",
    },
    {
      id: "subconscious",
      label: p(locale, "subconscious"),
      value: String(d.subconsciousSelf),
      how: p(locale, "subconsciousHow", { n: d.karmicLessons.length }),
    },
    {
      id: "balance",
      label: p(locale, "balance"),
      value: wholeText(d.balance),
      how: `${initials.map((l) => `${l.ch} ${l.value}`).join(" + ")}${d.balance.chain && d.balance.chain.length > 1 ? ` = ${chainText(d.balance.chain)}` : ""}`,
    },
    ...PLANE_IDS.map((id) => {
      const plane = d.planes.find((x) => x.id === id)!;
      return {
        id: `plane-${id}`,
        label: p(locale, `plane_${id}`),
        value: plane.value.number == null ? none : wholeText(plane.value),
        how: plane.letters.length
          ? `${plane.letters.map((l) => l.ch).join(" ")}${plane.value.chain && plane.value.chain.length ? ` · ${chainText(plane.value.chain)}` : ""}`
          : p(locale, "planeLetters", { letters: PLANE_LETTERS[id].split("").join(" ") }),
      };
    }),
    { id: "cornerstone", label: p(locale, "cornerstone"), value: d.cornerstone ?? none, how: p(locale, "cornerstoneHow") },
    { id: "capstone", label: p(locale, "capstone"), value: d.capstone ?? none, how: p(locale, "capstoneHow") },
    { id: "firstVowel", label: p(locale, "firstVowel"), value: d.firstVowel ?? none, how: p(locale, "firstVowelHow") },
  ];
  if (name.chaldean) {
    const c = name.chaldean;
    rows.push({
      id: "chaldean",
      label: p(locale, "chaldean"),
      value: String(c.single),
      how: [c.total, ...(c.compound != null && c.compound !== c.total ? [c.compound] : []), ...(c.single !== (c.compound ?? c.total) ? [c.single] : [])].join(" → "),
    });
  }
  return rows;
}

export type CycleRow = {
  kind: "period" | "pinnacle" | "challenge";
  index: number;
  value: NumerologyValue;
  span: AgeSpan;
  main: boolean;
};

/** Period cycles, pinnacles and challenges, each with its ages. */
export function cycleRows(chart: NumerologyChart): CycleRow[] {
  return [
    ...chart.life.periods.map((c) => ({ kind: "period" as const, index: c.index, value: c.value, span: c, main: false })),
    ...chart.life.pinnacles.map((c) => ({ kind: "pinnacle" as const, index: c.index, value: c.value, span: c, main: false })),
    ...chart.life.challenges.map((c) => ({ kind: "challenge" as const, index: c.index, value: c.value, span: c, main: c.main })),
  ];
}

/** "0–32", "50 on". */
export function agesText(locale: AppLocale, span: AgeSpan): string {
  return span.toAge == null ? p(locale, "onwards", { from: span.fromAge }) : `${span.fromAge}–${span.toAge}`;
}

/** The calendar years a span runs over: "1990–2022", "2040 on". */
export function spanYearsText(locale: AppLocale, birthYear: number, span: AgeSpan): string {
  const from = birthYear + span.fromAge;
  return span.toAge == null ? p(locale, "onwards", { from }) : `${from}–${birthYear + span.toAge}`;
}

/** The years the Years part lists: nine round the chosen one, or the whole life to 90. */
export function tableYears(chart: NumerologyChart, whole: boolean): NumerologyYearRow[] {
  const from = whole ? chart.year : chart.calendarYear - 4;
  const to = whole ? chart.year + 90 : chart.calendarYear + 4;
  const out: NumerologyYearRow[] = [];
  for (let y = from; y <= to; y += 1) out.push(numerologyYear(chart, y));
  return out;
}

/** The letter cycles of a year: "I · R · R". */
export function yearLettersText(row: NumerologyYearRow): string {
  const l = row.cycles?.letters;
  return l ? LETTER_CYCLE_IDS.map((id) => l[id].letter.ch).join(" · ") : "";
}

/** The two bridges of one person: Life Path to Expression, Soul Urge to Personality. */
export function bridgeRows(chart: NumerologyChart, locale: AppLocale) {
  return [
    { id: "lifePathExpression", label: p(locale, "bridgeLpEx"), value: chart.bridges.lifePathExpression },
    { id: "soulUrgePersonality", label: p(locale, "bridgeSuPe"), value: chart.bridges.soulUrgePersonality },
  ];
}

/** Two people's core numbers side by side, with the gap between each pair. */
export function compareRows(a: NumerologyChart, b: NumerologyChart) {
  return TABLE_CORES.map((id) => {
    const va = tableCoreValue(a, id);
    const vb = tableCoreValue(b, id);
    const gap = va.number != null && vb.number != null ? gapOf(va.number, vb.number) : null;
    return { id, a: va, b: vb, gap };
  });
}

type TextPart = { id: string; lines: string[] };

/** The table as text, part by part (Copy). */
export function numerologyTextParts(
  chart: NumerologyChart,
  locale: AppLocale,
  opts: { who?: string; layout?: GridLayoutId; wholeLife?: boolean; other?: { name: string; chart: NumerologyChart } | null } = {},
): TextPart[] {
  const colon = locale === "fr" ? " : " : ": ";
  const dash = "—";
  const birth = chart.names.birth;

  const core: string[] = [p(locale, "headCore")];
  if (opts.who) core.push(opts.who);
  for (const id of TABLE_CORES) {
    const v = tableCoreValue(chart, id);
    const note = valueNote(locale, v);
    const steps = stepsText(v);
    core.push(
      `${tableCoreLabel(locale, id)}${colon}${v.number == null ? dash : wholeText(v)}${steps && steps !== wholeText(v) ? ` (${steps})` : ""}${note ? `, ${note}` : ""}`,
    );
  }

  const name: string[] = [p(locale, "headName")];
  const nameLines = (n: NumerologyName) => {
    for (const r of wordRows(n)) {
      name.push(
        `${r.word.text}${colon}${lettersText(r.word)} · ${termText(r.all)} · ${p(locale, "vowels")} ${termText(r.vowels) || dash} · ${p(locale, "consonants")} ${termText(r.consonants) || dash}`,
      );
    }
    name.push(
      `${p(locale, "total")}${colon}${stepsText(n.expression)} · ${p(locale, "vowels")} ${stepsText(n.soulUrge) || dash} · ${p(locale, "consonants")} ${stepsText(n.personality) || dash}`,
    );
  };
  if (birth) {
    nameLines(birth);
    name.push(`${p(locale, "letters")}${colon}${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}×${birth.detail.counts[n] ?? 0}`).join(" ")}`);
    for (const r of detailRows(birth, locale)) name.push(`${r.label}${colon}${r.value}${r.how ? ` (${r.how})` : ""}`);
  } else name.push(p(locale, "noName"));
  const current = chart.names.current;
  if (current) {
    name.push(p(locale, "currentHead", { name: current.text }));
    nameLines(current);
  }

  const layout = opts.layout ?? "phillips";
  const grid: string[] = [p(locale, "headGrid"), `${p(locale, "digits")}${colon}${chart.grid.digits.join(" ") || dash}`];
  grid.push(`${p(locale, "missing")}${colon}${chart.grid.missing.join(" ") || p(locale, "none")}`);
  for (const line of chart.grid.lines[layout]) grid.push(`${line.id}${colon}${p(locale, `line_${line.state}`)}`);

  const cycles: string[] = [p(locale, "headCycles")];
  for (const r of cycleRows(chart)) {
    cycles.push(
      `${p(locale, `cycle_${r.kind}`, { n: r.index })}${r.main ? ` (${p(locale, "main")})` : ""}${colon}${wholeText(r.value)} · ${agesText(locale, r.span)} · ${spanYearsText(locale, chart.year, r.span)}`,
    );
  }

  const years: string[] = [p(locale, "headYears")];
  for (const r of tableYears(chart, Boolean(opts.wholeLife))) {
    const c = r.cycles;
    years.push(
      [
        String(r.year),
        c ? p(locale, "ageShort", { age: r.age }) : p(locale, "beforeBirth"),
        `${p(locale, "col_personalYear")} ${r.personalYear.number}`,
        ...(c
          ? [
              `${p(locale, "col_pinnacle")} ${wholeText(c.pinnacle.value)}`,
              `${p(locale, "col_challenge")} ${wholeText(c.challenge.value)}`,
              `${p(locale, "col_period")} ${wholeText(c.period.value)}`,
              ...(c.letters ? [`${p(locale, "col_essence")} ${wholeText(c.essence)}`, yearLettersText(r)] : []),
            ]
          : []),
      ].join(" · "),
    );
  }

  const bridges: string[] = [p(locale, "headBridges")];
  for (const b of bridgeRows(chart, locale)) {
    bridges.push(`${b.label}${colon}${b.value.number == null ? dash : `${b.value.number} (${stepsText(b.value)})`}`);
  }
  if (opts.other) {
    bridges.push(p(locale, "compareHead", { a: opts.who || "A", b: opts.other.name }));
    for (const r of compareRows(chart, opts.other.chart)) {
      bridges.push(
        `${tableCoreLabel(locale, r.id)}${colon}${r.a.number == null ? dash : wholeText(r.a)} · ${r.b.number == null ? dash : wholeText(r.b)} · ${p(locale, "col_gap")} ${r.gap?.number ?? dash}`,
      );
    }
  }

  return [
    { id: "core", lines: core },
    { id: "name", lines: name },
    { id: "grid", lines: grid },
    { id: "cycles", lines: cycles },
    { id: "years", lines: years },
    { id: "bridges", lines: bridges },
  ];
}

const bit = (x: boolean | null | undefined) => (x ? "1" : "0");

function csvEscape(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The whole reading as CSV: plain ids and numbers, the same in every language. */
export function numerologyTableCsv(chart: NumerologyChart, opts: { wholeLife?: boolean } = {}): string {
  const rows: string[][] = [["section", "field", "value"]];
  const date = `${chart.year}-${String(chart.month).padStart(2, "0")}-${String(chart.day).padStart(2, "0")}`;
  rows.push(["numerology", "birthDate", date]);
  rows.push(["numerology", "name", chart.name ?? ""]);
  if (chart.currentName) rows.push(["numerology", "currentName", chart.currentName]);
  rows.push(["numerology", "year", String(chart.calendarYear)]);
  rows.push(["numerology", "method", "pythagorean-decoz"]);
  rows.push([]);
  rows.push(["core", "id", "number", "digit", "steps", "debt", "master"]);
  for (const id of TABLE_CORES) {
    const v = tableCoreValue(chart, id);
    rows.push(["core", id, v.number == null ? "" : String(v.number), v.digit == null ? "" : String(v.digit), stepsText(v), v.debt ? String(v.debt) : "", bit(isMaster(v.number))]);
  }
  const birth = chart.names.birth;
  if (birth) {
    rows.push([]);
    rows.push(["letter", "index", "letter", "value", "vowel", "name", "plane", "y"]);
    for (const l of birth.parsed.letters) {
      const plane = PLANE_IDS.find((id) => PLANE_LETTERS[id].includes(l.ch)) ?? "";
      rows.push([
        "letter",
        String(l.index),
        l.ch,
        String(l.value),
        bit(l.vowel),
        birth.parsed.words[l.word]?.text ?? "",
        plane,
        l.yRule ? ((l.vowel ? "v" : "c") === l.yRule ? "rule" : "hand") : "",
      ]);
    }
    rows.push([]);
    rows.push(["count", "number", "letters"]);
    for (let n = 1; n <= 9; n += 1) rows.push(["count", String(n), String(birth.detail.counts[n] ?? 0)]);
    rows.push([]);
    rows.push(["detail", "id", "value"]);
    const d = birth.detail;
    rows.push(["detail", "karmicLessons", d.karmicLessons.join("|")]);
    rows.push(["detail", "hiddenPassion", d.hiddenPassion.join("|")]);
    rows.push(["detail", "subconsciousSelf", String(d.subconsciousSelf)]);
    rows.push(["detail", "balance", String(d.balance.number ?? "")]);
    for (const plane of d.planes) rows.push(["detail", `plane-${plane.id}`, String(plane.value.number ?? "")]);
    rows.push(["detail", "cornerstone", d.cornerstone ?? ""]);
    rows.push(["detail", "capstone", d.capstone ?? ""]);
    rows.push(["detail", "firstVowel", d.firstVowel ?? ""]);
    if (birth.chaldean) {
      rows.push(["detail", "chaldeanTotal", String(birth.chaldean.total)]);
      rows.push(["detail", "chaldeanCompound", String(birth.chaldean.compound ?? "")]);
      rows.push(["detail", "chaldeanSingle", String(birth.chaldean.single)]);
    }
  }
  const current = chart.names.current;
  if (current) {
    rows.push([]);
    rows.push(["minor", "id", "number"]);
    rows.push(["minor", "expression", String(current.expression.number ?? "")]);
    rows.push(["minor", "soulUrge", String(current.soulUrge.number ?? "")]);
    rows.push(["minor", "personality", String(current.personality.number ?? "")]);
  }
  rows.push([]);
  rows.push(["grid", "digit", "count"]);
  for (let n = 1; n <= 9; n += 1) rows.push(["grid", String(n), String(chart.grid.counts[n] ?? 0)]);
  rows.push(["line", "layout", "id", "state"]);
  for (const layout of GRID_LAYOUTS) for (const line of chart.grid.lines[layout]) rows.push(["line", layout, line.id, line.state]);
  rows.push([]);
  rows.push(["cycle", "kind", "index", "number", "fromAge", "toAge", "main"]);
  for (const r of cycleRows(chart)) {
    rows.push(["cycle", r.kind, String(r.index), String(r.value.number ?? ""), String(r.span.fromAge), r.span.toAge == null ? "" : String(r.span.toAge), bit(r.main)]);
  }
  rows.push([]);
  rows.push(["year", "year", "age", "personalYear", "pinnacle", "challenge", "period", "essence", "physical", "mental", "spiritual"]);
  for (const r of tableYears(chart, Boolean(opts.wholeLife))) {
    const c = r.cycles;
    const l = c?.letters;
    rows.push([
      "year",
      String(r.year),
      c ? String(r.age) : "",
      String(r.personalYear.number ?? ""),
      c ? String(c.pinnacle.value.number ?? "") : "",
      c ? String(c.challenge.value.number ?? "") : "",
      c ? String(c.period.value.number ?? "") : "",
      l ? String(c.essence.number ?? "") : "",
      l?.physical.letter.ch ?? "",
      l?.mental.letter.ch ?? "",
      l?.spiritual.letter.ch ?? "",
    ]);
  }
  rows.push([]);
  rows.push(["bridge", "id", "a", "b", "gap"]);
  const lp = chart.bridges.lifePathExpression;
  const su = chart.bridges.soulUrgePersonality;
  rows.push(["bridge", "lifePathExpression", String(lp.gap?.[0] ?? ""), String(lp.gap?.[1] ?? ""), String(lp.number ?? "")]);
  rows.push(["bridge", "soulUrgePersonality", String(su.gap?.[0] ?? ""), String(su.gap?.[1] ?? ""), String(su.number ?? "")]);
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}
