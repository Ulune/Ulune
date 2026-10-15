import { Fragment, useEffect, useState } from "react";
import { CHINESE_READING, LIVE_FAMILIES } from "@/lib/chinese/term-live";
import { useI18n } from "@/lib/i18n/locale";
import { importWithRetry } from "@/lib/lazy-retry";
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
 * The entries a reading is about link nowhere in it: a Chinese reading's
 * (languages plan, part 29) come from the registry of Chinese terms, its own
 * download, fetched only once the encyclopedia has written a family of
 * Chinese terms (lib/chinese/term-live.ts) and the reading's words link.
 */

type Lexicons = Record<string, Matcher | null>;

/** A Chinese reading's entries, every one it is about, written or not (lib/chinese/term-refs.ts, chineseRefTerms). */
type ChineseTerms = (readingId: string) => string[];
let chinese: ChineseTerms | null = null;
let chineseLoading: Promise<ChineseTerms> | null = null;

function chineseTerms(): Promise<ChineseTerms> {
  if (!chineseLoading) {
    const p = importWithRetry(() => import("@/lib/chinese/term-refs")).then((m) => (chinese = m.chineseRefTerms));
    p.catch(() => {
      if (chineseLoading === p) chineseLoading = null;
    });
    chineseLoading = p;
  }
  return chineseLoading;
}

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
/** The numerology readings' ids ("core:lifepath", "detail:attitude"), and their older spellings. */
const CORE: Record<string, string> = {
  lifepath: "life-path",
  soulurge: "soul-urge",
  personalYear: "personal-year",
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

/**
 * The entries a reading is about, from its id ("planet:saturn",
 * "aspect:sun_trine_moon", "gate:34", "core:lifePath"…); a Chinese reading's
 * ("bz:god:eating-god") from the registry of Chinese terms, when given.
 */
export function subjectOf(readingId: string, chineseOf?: ChineseTerms | null): Set<string> {
  if (CHINESE_READING.test(readingId)) return new Set(chineseOf?.(readingId) ?? []);
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
  // Until the encyclopedia writes a Chinese family no entry can be a Chinese reading's own, so nothing waits and
  // the registry is not fetched (the Calendar's day animal and solar terms link astrology's words meanwhile).
  const chineseReading = Boolean(readingId && LIVE_FAMILIES.size && CHINESE_READING.test(readingId));
  const [cn, setCn] = useState<ChineseTerms | null>(() => chinese);
  useEffect(() => {
    if (!matcher || !chineseReading || cn) return;
    let live = true;
    chineseTerms()
      .then((f) => live && setCn(() => f))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [matcher, chineseReading, cn]);
  if (!matcher) return <>{text}</>;
  // A Chinese reading waits for its own entries, so it never links to itself.
  if (chineseReading && !cn) return <>{text}</>;
  const pieces = linkText(text, matcher, readingId ? subjectOf(readingId, cn) : undefined);
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
