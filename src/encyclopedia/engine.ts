/* A language's search, ready to answer: its index downloaded once, the first time it is wanted. */
import { loadSearch } from "./data";
import { prepare, type SearchEngine } from "./search";
import type { Lang } from "./types";

const engines: Partial<Record<Lang, Promise<SearchEngine>>> = {};

export function engineFor(lang: Lang): Promise<SearchEngine> {
  const p = (engines[lang] ??= loadSearch(lang).then(prepare));
  // A failed download is tried again next time.
  p.catch(() => {
    if (engines[lang] === p) delete engines[lang];
  });
  return p;
}
