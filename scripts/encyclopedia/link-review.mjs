// What the reading texts would link (encyclopedia plan, part 16), for review.
// Usage: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/encyclopedia/link-review.mjs [out.md]
// Walks every bilingual text of the readings (src/lib/content, the prose
// catalogs, and since part 23 the Chinese languages' texts, src/lib/chinese/*-texts.ts,
// written as [English, French] pairs), links it as the reading card does, and
// lists each linked form with its count and a few contexts, by language and
// tradition.
import { writeFileSync } from "node:fs";
import { buildEncyclopedia, readContent } from "./build.mjs";
import { compileLexicon, linkText } from "../../src/encyclopedia/linker.ts";

const SOURCES = {
  astrology: [
    "../../src/lib/content/astro-aspects.ts",
    "../../src/lib/content/astro-planet-sign.ts",
    "../../src/lib/content/astro-signs-houses.ts",
    "../../src/lib/content/astro-bodies.ts",
    "../../src/lib/content/astro-calendar.ts",
    "../../src/lib/content/astro-time.ts",
  ],
  "human-design": ["../../src/lib/content/hd.ts", "../../src/lib/content/hd-first.ts", "../../src/lib/i18n/hd-prose.ts"],
  numerology: [
    "../../src/lib/content/numerology.ts",
    "../../src/lib/content/numerology-more.ts",
    "../../src/lib/content/numerology-places.ts",
    "../../src/lib/i18n/numerology-prose.ts",
  ],
  "chinese-astrology": ["../../src/lib/chinese/zodiac-texts.ts", "../../src/lib/chinese/zodiac-time-texts.ts"],
  bazi: [
    "../../src/lib/chinese/bazi-texts.ts",
    "../../src/lib/chinese/bazi-readings-texts.ts",
    "../../src/lib/chinese/bazi-signs-texts.ts",
    "../../src/lib/chinese/bazi-balance-texts.ts",
    "../../src/lib/chinese/bazi-interactions-texts.ts",
  ],
  "feng-shui": [
    "../../src/lib/chinese/fengshui-texts.ts",
    "../../src/lib/chinese/fengshui-readings-texts.ts",
    "../../src/lib/chinese/fengshui-pair-texts.ts",
    "../../src/lib/chinese/fengshui-stars-texts.ts",
    "../../src/lib/chinese/fengshui-years-texts.ts",
    "../../src/lib/chinese/fengshui-rooms-texts.ts",
  ],
};

/** Every { en, fr } text under a value, and every [English, French] pair of the Chinese texts. */
function* bilingual(v, seen = new Set()) {
  if (!v || typeof v !== "object" || seen.has(v)) return;
  seen.add(v);
  if (typeof v.en === "string" && typeof v.fr === "string") {
    yield v;
    return;
  }
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "string") {
    yield { en: v[0], fr: v[1] };
    return;
  }
  for (const x of Object.values(v)) yield* bilingual(x, seen);
}

const { data, errors } = buildEncyclopedia(readContent("content/encyclopedia"));
if (!data) throw new Error(`the encyclopedia does not build: ${errors.length} errors`);

export async function review() {
  const report = {};
  for (const [tradition, files] of Object.entries(SOURCES)) {
    const texts = [];
    for (const f of files) {
      const mod = await import(new URL(f, import.meta.url).href);
      for (const v of Object.values(mod)) for (const bi of bilingual(v)) texts.push(bi);
    }
    for (const lang of ["en", "fr"]) {
      const m = compileLexicon(data.lexicon[lang][tradition] ?? []);
      const forms = new Map();
      for (const bi of texts) {
        for (const piece of linkText(bi[lang], m)) {
          if (!piece.id) continue;
          const key = `${piece.text} → ${piece.id}`;
          const row = forms.get(key) ?? { n: 0, ctx: [] };
          row.n += 1;
          if (row.ctx.length < 2) {
            const i = bi[lang].indexOf(piece.text);
            row.ctx.push(bi[lang].slice(Math.max(0, i - 40), i + piece.text.length + 40).replace(/\s+/g, " "));
          }
          forms.set(key, row);
        }
      }
      report[`${lang}/${tradition}`] = { texts: texts.length, forms: [...forms].sort((a, b) => b[1].n - a[1].n) };
    }
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await review();
  const lines = ["# What the readings link (part 16)", ""];
  for (const [k, r] of Object.entries(report)) {
    lines.push(`## ${k}: ${r.texts} texts, ${r.forms.length} forms`, "");
    for (const [form, row] of r.forms) lines.push(`- **${form}** ×${row.n} — …${row.ctx.join("… / …")}…`);
    lines.push("");
  }
  const out = process.argv[2];
  if (out) writeFileSync(out, lines.join("\n"));
  else console.log(lines.join("\n"));
}
