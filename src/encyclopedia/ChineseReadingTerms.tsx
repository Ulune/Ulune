import { Fragment, useEffect, useState } from "react";
import { chineseSubjectOf } from "@/lib/chinese/term-ids";
import { useI18n } from "@/lib/i18n/locale";
import { loadCards, loadIndex, termRow } from "./data";
import { Term } from "./Term";
import type { Lang } from "./types";
import { tr } from "./words";

/*
 * Under a Chinese reading in the side panel, the entries of what it is about
 * (languages plan, part 29: "every term ready to link"): a Ten God, an
 * animal and its branch, a mountain, a star, the Day Master… from the
 * reading's id (lib/chinese/term-ids.ts), each by its title in the
 * encyclopedia. Only entries whose family is written, and only those with a
 * page: nothing at all until then. Its own download, with the registry of
 * Chinese terms, fetched by ReadingTerms for a Chinese reading.
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

export function ChineseReadingTerms({ readingId }: { readingId: string }) {
  const { locale } = useI18n();
  const lang: Lang = locale === "fr" ? "fr" : "en";
  const key = `${lang} ${readingId}`;
  const [shown, setShown] = useState<{ key: string; items: Entry[] } | null>(null);
  useEffect(() => {
    const ids = [...chineseSubjectOf(readingId)];
    if (!ids.length) return;
    let live = true;
    entriesOf(ids, lang)
      .then((items) => live && setShown({ key: `${lang} ${readingId}`, items }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [readingId, lang]);
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
