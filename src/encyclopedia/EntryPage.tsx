import { APP_VERSION, SITE_URL } from "@/lib/app-identity";
import { dateFormat } from "@/lib/intl-cache";
import { OPERATOR } from "@/lib/legal/operator";
import { Sections } from "./Body";
import { encPath } from "./data";
import { Crumbs, EncFrame, EncLink, Licence, Mark, TwinLink } from "./frame";
import { tr } from "./words";
import type { EntryRef, Lang, PageData } from "./types";

/*
 * An entry's page (encyclopedia plan, "An entry, start to finish"), in this
 * order: the head (name, glyph, tradition, the name in the other language),
 * the one-sentence summary, "In your chart" (later), the body's sections,
 * Related, Sources, then the date it was last revised, a way to report an
 * error, the next and previous pages of its family and the text's licence.
 * Rendered on the server: complete and readable without JavaScript.
 */

function revisedOn(lang: Lang, iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  // British English, as the rest of Ulune; French writes the first "1er".
  return dateFormat(lang === "en" ? "en-GB" : "fr", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}

/** The app's "Report a problem" email, naming the page. */
function errorMail(page: PageData): string {
  const url = `${SITE_URL}${encPath(page.lang, page.slug)}`;
  const subject = tr(page.lang, "encReportSubject", { version: APP_VERSION, title: page.title });
  const body = `${url}\n\n${tr(page.lang, "reportMailBody")}\n\n`;
  return `mailto:${OPERATOR.contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/*
 * IN YOUR CHART (encyclopedia plan, part 18, not built yet): with a chart
 * open, a short personal part goes here, between the summary and the body,
 * worked out on the device from the chart in memory (Saturn in Capricorn in
 * the 5th house…), with a switch to hide it (decision 6). The page itself
 * stays the same for everyone: the server never learns which chart reads it.
 */
function InYourChart(_props: { page: PageData }) {
  return null;
}

function RelatedCard({ entry, lang }: { entry: EntryRef; lang: Lang }) {
  return (
    <li className="ob-enc-card" data-entry={entry.id}>
      <Mark glyph={entry.glyph} title={entry.title} />
      <span className="ob-enc-card-text">
        {entry.slug ? (
          <EncLink to={lang} slug={entry.slug} className="ob-enc-card-name ob-enc-card-link">
            {entry.title}
          </EncLink>
        ) : (
          <span className="ob-enc-card-name">{entry.title}</span>
        )}
        <span className="ob-enc-card-summary">{entry.summary}</span>
      </span>
    </li>
  );
}

export function EntryPage({ page }: { page: PageData }) {
  const { lang } = page;
  return (
    <EncFrame lang={lang} testId="enc-entry" narrow>
      <Crumbs
        lang={lang}
        items={[
          { label: tr(lang, "encTitle") },
          { label: page.tradition.name, slug: page.tradition.home },
          { label: page.family.name, slug: page.tradition.home, hash: `family-${page.family.id}` },
          { label: page.title },
        ]}
      />
      <article className="ob-enc-article" data-entry={page.id}>
        <header className="ob-enc-head">
          {page.glyph ? (
            <span className="ob-enc-glyph" aria-hidden="true">
              {page.glyph}
            </span>
          ) : null}
          <div className="ob-enc-head-text">
            <h1 className="ob-enc-title">{page.title}</h1>
            <p className="ob-enc-meta">
              <EncLink to={lang} slug={page.tradition.home} className="ob-enc-tag" data-tradition={page.tradition.id}>
                {page.tradition.name}
              </EncLink>
              <TwinLink lang={lang} slug={page.twin.slug} title={page.twin.title} />
            </p>
          </div>
        </header>
        <p className="ob-enc-summary" data-testid="enc-summary">
          {page.summary}
        </p>
        <InYourChart page={page} />
        <Sections sections={page.sections} lang={lang} />
        {page.related.length ? (
          <section className="ob-enc-section" aria-labelledby="s-related" data-testid="enc-related">
            <h2 id="s-related" className="ob-enc-h2">
              {tr(lang, "encRelated")}
            </h2>
            <ul className="ob-enc-cards">
              {page.related.map((r) => (
                <RelatedCard key={r.id} entry={r} lang={lang} />
              ))}
            </ul>
          </section>
        ) : null}
        {page.sources.length ? (
          <section className="ob-enc-section" aria-labelledby="s-sources" data-testid="enc-sources">
            <h2 id="s-sources" className="ob-enc-h2">
              {tr(lang, "encSources")}
            </h2>
            <ul className="ob-enc-sources">
              {page.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <footer className="ob-enc-foot">
          <p data-testid="enc-revised">
            {tr(lang, "encRevised", { date: revisedOn(lang, page.revised) })}{" "}
            <a href={errorMail(page)} className="ob-enc-quiet-link" data-testid="enc-report">
              {tr(lang, "encReport")}
            </a>
          </p>
          {page.prev || page.next ? (
            <nav className="ob-enc-pn" aria-label={tr(lang, "encFamilyNav")} data-testid="enc-family-nav">
              {page.prev ? (
                <EncLink to={lang} slug={page.prev.slug} rel="prev" className="ob-enc-pn-link" data-testid="enc-prev">
                  <span className="ob-enc-pn-label">
                    <span aria-hidden="true">← </span>
                    {tr(lang, "encPrev")}
                  </span>
                  <span className="ob-enc-pn-title">{page.prev.title}</span>
                </EncLink>
              ) : (
                <span />
              )}
              {page.next ? (
                <EncLink to={lang} slug={page.next.slug} rel="next" className="ob-enc-pn-link ob-enc-pn-link--next" data-testid="enc-next">
                  <span className="ob-enc-pn-label">
                    {tr(lang, "encNext")}
                    <span aria-hidden="true"> →</span>
                  </span>
                  <span className="ob-enc-pn-title">{page.next.title}</span>
                </EncLink>
              ) : null}
            </nav>
          ) : null}
          <Licence lang={lang} />
        </footer>
      </article>
    </EncFrame>
  );
}
