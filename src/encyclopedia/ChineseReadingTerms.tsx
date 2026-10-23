import { Fragment, useEffect, useState } from "react";
import type { ChineseTermRef } from "@/lib/chinese/term-ids";
import { chineseReadingTerms } from "@/lib/chinese/term-refs";
import { useI18n } from "@/lib/i18n/locale";
import { loadCards, loadIndex, termRow } from "./data";
import { Term } from "./Term";
import type { Lang } from "./types";
import { tr } from "./words";

/*
 * Under a Chinese reading in the side panel, the entries of what it is about
 * (languages plan, part 29: "every term ready to link"): a Ten God, an
 * animal and its branch, a mountain, a star, the Day Master… each by its
 * title in the encyclopedia. The chart's own entries come first, as the
 * reading names them where it is built ("Kua 1", the Rest stage, Metal in the sea,
 * Period 9: the 2.0 fixes, item 2), then those of the reading's id, its
 * family's own entry or the idea of its place (lib/chinese/term-refs.ts).
 * Only entries whose family is written, and only those with a page: nothing
 * at all until then. Its own download, with the registry of Chinese terms,
 * fetched by ReadingTerms for a Chinese reading.
 */

type Entry = { id: string; title: string; slug: string };

/** The written entries' titles and addresses in a language, from the index and their traditions' card texts (each downloaded once). */
async function entriesOf(ids: readonly string[], lang: Lang): Promise<Entry[]> {
  const index = await loadIndex();
  const out: Entry[] = [];
  for (const id of ids) {
    const row = termRow(index.terms, id);
    // Never a link to a page that is not there.
    if (!row?.[4]) continue;
    const cards = await loadCards(lang, row[0]);
    out.push({ id, title: cards[id]?.[0] ?? id, slug: lang === "en" ? row[2] : row[3] });
  }
  return out;
}

export function ChineseReadingTerms({ readingId, terms }: { readingId: string; terms?: readonly ChineseTermRef[] }) {
  const { locale } = useI18n();
  const lang: Lang = locale === "fr" ? "fr" : "en";
  // The entries in their order, as one string: a reading built again with the same entries asks for nothing more.
  const ids = chineseReadingTerms(readingId, terms).join(" ");
  const key = `${lang} ${ids}`;
  const [shown, setShown] = useState<{ key: string; items: Entry[] } | null>(null);
  useEffect(() => {
    if (!ids) return;
    let live = true;
    entriesOf(ids.split(" "), lang)
      .then((items) => live && setShown({ key: `${lang} ${ids}`, items }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ids, lang]);
  const items = shown?.key === key ? shown.items : [];
  if (!items.length) return null;
  return (
    <section className="ob-rc-sec ob-rc-terms" data-testid="reading-terms">
      <h3 className="ob-rc-h">{tr(lang, "encInPanel")}</h3>
      <p className="ob-rc-p">
        {items.map((x, i) => (
          <Fragment key={x.id}>
            {i ? <span aria-hidden> · </span> : null}
            <Term id={x.id} slug={x.slug}>
              {x.title}
            </Term>
          </Fragment>
        ))}
      </p>
    </section>
  );
}
