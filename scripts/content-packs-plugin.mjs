// One reading pack per language, cut from the bilingual sources at build time.
//
// The reading text lives once, in English and French side by side
// ({ en: "…", fr: "…" } in src/lib/content and a few i18n prose files). A pack
// is imported with a language query — import("@/lib/content/pack-reading?lang=fr")
// — and that query follows every import made inside it into the modules that
// carry reading text (the scoped set below), so each language gets its own
// copy of them. In those copies every { en, fr } pair of plain strings is
// replaced by that language's string under both keys, so the code reading
// them (pickBi, `.fr`, `.en`) works unchanged while the other language's text
// is gone. Modules outside the scoped set are shared by both languages.
//
// Dev and build behave the same; the bilingual files stay the single source,
// and scripts/content-packs.test.mjs checks each pack against them.
import ts from "typescript";

const LANG_RE = /[?&]lang=(en|fr)(?=&|$)/;

/** Modules that carry reading text, or reach it: they get one copy per language. */
const SCOPED = [
  /\/src\/lib\/content\/(?!types\.ts)[^/]+\.ts$/,
  /\/src\/lib\/chart\/interpret-[^/]+\.ts$/,
  /\/src\/lib\/chart\/plain\.ts$/,
  /\/src\/lib\/chart\/dump\.ts$/,
  /\/src\/lib\/i18n\/click-notes\.ts$/,
  /\/src\/lib\/i18n\/hd-prose\.ts$/,
  /\/src\/lib\/i18n\/numerology-prose\.ts$/,
  /\/src\/lib\/i18n\/numerology-text\.ts$/,
];

/** Files whose { en, fr } string pairs are cut down to one language. */
const TEXT = [
  /\/src\/lib\/content\/[^/]+\.ts$/,
  /\/src\/lib\/i18n\/hd-prose\.ts$/,
  /\/src\/lib\/i18n\/numerology-prose\.ts$/,
];

const clean = (id) => id.replace(/[?#].*$/, "");
export const isScoped = (id) => SCOPED.some((re) => re.test(clean(id)));
const isText = (id) => TEXT.some((re) => re.test(clean(id)));

function stringOf(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node;
  return null;
}

/**
 * Every object literal made of exactly `en` and `fr` plain strings becomes
 * that language's string under both keys (French falls back to English when
 * its text is empty, as pickBi does). Anything else is left as it is.
 */
export function cutToLanguage(code, lang, fileName = "content.ts") {
  const sf = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];
  let pairs = 0;
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node) && node.properties.length === 2) {
      const found = {};
      for (const p of node.properties) {
        if (!ts.isPropertyAssignment(p)) break;
        const name = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : null;
        const value = stringOf(p.initializer);
        if ((name === "en" || name === "fr") && value) found[name] = value;
      }
      if (found.en && found.fr) {
        const pick = lang === "fr" && found.fr.text !== "" ? found.fr : found.en;
        edits.push([node.getStart(sf), node.getEnd(), `__bi(${pick.getText(sf)})`]);
        pairs++;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!pairs) return { code, pairs };
  edits.sort((a, b) => b[0] - a[0]);
  let out = code;
  for (const [start, end, text] of edits) out = out.slice(0, start) + text + out.slice(end);
  // One tiny helper per file: both keys hold the kept text.
  out = `const __bi = (s: string) => ({ en: s, fr: s });\n${out}`;
  return { code: out, pairs };
}

export function contentPacksPlugin() {
  return {
    name: "ulune:content-packs",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer) return null;
      const m = importer.match(LANG_RE);
      if (!m || LANG_RE.test(source)) return null;
      const resolved = await this.resolve(source, clean(importer), { ...options, skipSelf: true });
      if (!resolved || resolved.external || !isScoped(resolved.id)) return resolved;
      return `${resolved.id}${resolved.id.includes("?") ? "&" : "?"}lang=${m[1]}`;
    },
    transform(code, id) {
      const m = id.match(LANG_RE);
      if (!m || !isText(id)) return null;
      const { code: out, pairs } = cutToLanguage(code, m[1], clean(id));
      return pairs ? { code: out, map: null } : null;
    },
  };
}
