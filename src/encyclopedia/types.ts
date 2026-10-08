/*
 * What the encyclopedia's build (scripts/encyclopedia/build.mjs) gives the
 * site, one piece at a time: the term index, each page, the card texts of a
 * tradition in a language, the search index of a language, the homes. The
 * build writes plain JSON in these shapes; the site never sees the Markdown.
 */

export type Lang = "en" | "fr";

/** Text in a page's body: words, **bold**, *italic*, or a link to another entry. */
export type Inline =
  | string
  | { b: Inline[] }
  | { i: Inline[] }
  /**
   * A link: `l` the entry's id, `w` the words shown (its title in this
   * language when the writer gave none), `s` its address in this language
   * when it has a page (null: a card only), `g` its tradition.
   */
  | { l: string; w: string; s: string | null; g: string };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; start: number; items: Inline[][] }
  | { t: "table"; align: ("l" | "c" | "r" | "")[]; head: Inline[][]; rows: Inline[][][] };

/** A body section: `key` its anchor (the same in both languages), `h` its heading in the page's language. */
export type Section = { key: string; h: string; blocks: Block[] };

/** Another entry as a card: its address is null when it has no page. */
export type EntryRef = {
  id: string;
  title: string;
  glyph: string;
  summary: string;
  slug: string | null;
  tradition: string;
};

export type PageData = {
  id: string;
  lang: Lang;
  slug: string;
  title: string;
  glyph: string;
  aliases: string[];
  summary: string;
  kind: "core" | "combination" | "context";
  tradition: { id: string; name: string; home: string };
  family: { id: string; name: string };
  /** The same page in the other language. */
  twin: { lang: Lang; slug: string; title: string };
  sections: Section[];
  related: EntryRef[];
  sources: string[];
  /** YYYY-MM-DD. */
  revised: string;
  /** The pages before and after it in its family (entries without a page are skipped). */
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  /** Its figure, drawn at build time from the charts' own numbers (part 19, scripts/encyclopedia/figures.mjs). */
  figure?: Figure;
};

export type Figure = {
  /** One to three drawings, each an SVG with its own description for screen readers. */
  panels: { svg: string; w: number; h: number; scale?: number }[];
  /** The text twin shown under it. */
  caption: string;
  /** An aspect's figure the reader can turn through its orb. */
  interactive?: { kind: "aspect"; angle: number; orb: number };
};

export type TraditionInfo = {
  id: string;
  name: Record<Lang, string>;
  home: Record<Lang, string>;
  intro: Record<Lang, string>;
  families: { id: string; name: Record<Lang, string> }[];
  /** Its entries, and how many of them have a page. */
  count: number;
  pages: number;
};

/**
 * Every entry, by id: [tradition, family, English address, French address,
 * 1 when it has a page, glyph]. Small, so a link and a card can find any
 * entry's address and tradition.
 */
export type TermRow = [tradition: string, family: string, en: string, fr: string, page: 0 | 1, glyph: string];
export type TermIndex = { traditions: TraditionInfo[]; terms: Record<string, TermRow> };

/** A tradition's card texts in one language: id → [title, summary]. */
export type CardTexts = Record<string, [title: string, summary: string]>;

/**
 * One entry in a language's search index: [id, title, summary, glyph,
 * tradition, family, address ("" without a page), its names' words, its other
 * names' words (the other language, aliases), its summary's words]; the words
 * are folded (normalize.ts) and joined by spaces.
 */
export type SearchDoc = [
  id: string,
  title: string,
  summary: string,
  glyph: string,
  tradition: string,
  family: string,
  slug: string,
  names: string,
  others: string,
  words: string,
  /** 1 for a combination page (part 17): after the core entry it combines when both match as well. */
  combination?: 1,
];
export type SearchIndex = { lang: Lang; docs: SearchDoc[] };

/** An entry in a list (A–Z, a tradition's home): [id, title, glyph, summary, address or ""]. */
export type ListRow = [id: string, title: string, glyph: string, summary: string, slug: string];

/** The encyclopedia's home in a language: the traditions, then A–Z by first letter. */
export type HomeData = {
  lang: Lang;
  traditions: { id: string; name: string; intro: string; home: string; count: number; pages: number }[];
  /** [letter, rows with the tradition after each]. */
  az: [letter: string, rows: [...ListRow, tradition: string][]][];
};

/** A tradition's home: its families as grids of cards. */
export type TraditionHome = {
  lang: Lang;
  id: string;
  name: string;
  intro: string;
  home: string;
  /** Its address segment in the other language. */
  twinHome: string;
  families: { id: string; name: string; rows: ListRow[]; /** Combination pages (part 17): a short list of names, no cards. */ compact?: boolean }[];
};
