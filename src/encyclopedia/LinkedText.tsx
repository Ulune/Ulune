import { Fragment, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { loadLexicon } from "./data";
import { compileLexicon, linkText, type Matcher } from "./linker";
import { Term } from "./Term";
import { termId } from "./term-ids";
import type { Lang } from "./types";

/*
 * A reading's running text with its encyclopedia words linked (encyclopedia
 * plan, part 16): the reading card and the guide render their paragraphs
 * through it. Its own download, with the language's lexicon, fetched the
 * first time a reading shows; until then the text shows as it always did.
 * The entries a reading is about link nowhere in it.
 */

type Lexicons = Record<string, Matcher | null>;

const loaded = new Map<Lang, Lexicons>();
const loading = new Map<Lang, Promise<Lexicons>>();

function lexicons(lang: Lang): Promise<Lexicons> {
  let p = loading.get(lang);
  if (!p) {
    p = loadLexicon(lang).then((rows) => {
      const out: Lexicons = {};
      for (const [t, r] of Object.entries(rows)) out[t] = compileLexicon(r);
      loaded.set(lang, out);
      return out;
    });
    p.catch(() => loading.delete(lang));
    loading.set(lang, p);
  }
  return p;
}

const CENTRE: Record<string, string> = { solarPlexus: "solar-plexus" };
const CORE: Record<string, string> = {
  lifePath: "life-path",
  expression: "expression",
  soulUrge: "soul-urge",
  personality: "personality-number",
  birthday: "birthday",
  maturity: "maturity",
  attitude: "attitude-number",
  rationalThought: "rational-thought",
  balance: "balance-number",
  passion: "hidden-passion",
  lessons: "karmic-lesson",
};

/** The entries a reading is about, from its id ("planet:saturn", "aspect:sun_trine_moon", "gate:34", "core:lifePath"…). */
export function subjectOf(readingId: string): Set<string> {
  const out = new Set<string>();
  const [kind, rest = ""] = readingId.split(":");
  const add = (id: string | null) => id && out.add(id);
  if (kind === "planet" || kind === "angle") add(termId("body", rest));
  else if (kind === "sign") add(termId("sign", rest));
  else if (kind === "house") add(termId("house", rest));
  else if (kind === "aspect") for (const part of rest.split("_")) add(termId("body", part) ?? termId("aspect", part));
  else if (kind === "gate") add(`hd-gate-${rest}`);
  else if (kind === "channel") add(`hd-channel-${rest.replace("–", "-")}`);
  else if (kind === "center") add(`hd-centre-${CENTRE[rest] ?? rest}`);
  else if (kind === "core" || kind === "detail") add(CORE[rest] ?? null);
  return out;
}

export function LinkedText({ text, tradition, readingId }: { text: string; tradition: string; readingId?: string }) {
  const { locale } = useI18n();
  const lang: Lang = locale === "fr" ? "fr" : "en";
  const [lex, setLex] = useState<Lexicons | undefined>(() => loaded.get(lang));
  useEffect(() => {
    if (lex && loaded.get(lang) === lex) return;
    let live = true;
    lexicons(lang)
      .then((l) => live && setLex(l))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [lang, lex]);
  const matcher = lex?.[tradition] ?? null;
  if (!matcher) return <>{text}</>;
  const pieces = linkText(text, matcher, readingId ? subjectOf(readingId) : undefined);
  return (
    <>
      {pieces.map((p, i) =>
        p.id ? (
          <Term key={i} id={p.id} slug={p.slug} lang={lang}>
            {p.text}
          </Term>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
