import { Crumbs, EncFrame, EncLink, Licence, Mark, TwinLink } from "./frame";
import { tr } from "./words";
import type { ListRow, TraditionHome } from "./types";

/*
 * A tradition's home (/encyclopedia/astrology, /encyclopedie/astrologie): its
 * introduction, then its families as grids of glyph cards. An entry with a
 * page is a link to it; one without is listed with its summary, unlinked.
 * Each family and each entry can be reached by its anchor (#family-planets,
 * #saturn): the breadcrumbs of a page lead to its family here. The
 * combination pages' families (part 17) are lists of names in columns.
 */

function Card({ row, lang }: { row: ListRow; lang: TraditionHome["lang"] }) {
  const [id, title, glyph, summary, slug] = row;
  return (
    <li id={id} className="ob-enc-card" data-entry={id} data-page={slug ? "" : undefined}>
      <Mark glyph={glyph} title={title} />
      <span className="ob-enc-card-text">
        {slug ? (
          <EncLink to={lang} slug={slug} className="ob-enc-card-name ob-enc-card-link">
            {title}
          </EncLink>
        ) : (
          <span className="ob-enc-card-name">{title}</span>
        )}
        <span className="ob-enc-card-summary">{summary}</span>
      </span>
    </li>
  );
}

export function TraditionPage({ home }: { home: TraditionHome }) {
  const { lang } = home;
  return (
    <EncFrame lang={lang} testId="enc-tradition">
      <Crumbs lang={lang} items={[{ label: tr(lang, "encTitle") }, { label: home.name }]} />
      <header className="ob-enc-hero">
        <h1 className="ob-enc-title">{home.name}</h1>
        <p className="ob-enc-lead">{home.intro}</p>
        <p className="ob-enc-meta">
          <TwinLink lang={lang} slug={home.twinHome} />
        </p>
      </header>
      {home.families.map((f) => (
        <section key={f.id} id={`family-${f.id}`} className="ob-enc-family" aria-labelledby={`h-family-${f.id}`} data-family={f.id}>
          <h2 id={`h-family-${f.id}`} className="ob-enc-h2">
            {f.name}
          </h2>
          {f.compact ? (
            // The combination pages (part 17): their names only, in columns.
            <ul className="ob-enc-compact" data-compact="">
              {f.rows.map(([id, title, , , slug]) => (
                <li key={id} id={id} data-entry={id}>
                  <EncLink to={lang} slug={slug} className="ob-enc-compact-link">
                    {title}
                  </EncLink>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="ob-enc-cards">
              {f.rows.map((row) => (
                <Card key={row[0]} row={row} lang={lang} />
              ))}
            </ul>
          )}
        </section>
      ))}
      <footer className="ob-enc-foot">
        <Licence lang={lang} />
      </footer>
    </EncFrame>
  );
}
