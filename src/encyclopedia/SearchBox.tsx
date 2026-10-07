import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { ENC_BASE } from "./data";
import { engineFor } from "./engine";
import { EncLink, Mark } from "./frame";
import { tr } from "./words";
import { byTradition, search, type SearchHit } from "./search";
import type { Lang } from "./types";

/*
 * The encyclopedia's search box (encyclopedia plan, part 5): the index of the
 * page's language is downloaded the first time the box is focused or typed
 * in, then every letter answers at once, on the device; nothing typed leaves
 * it. Results come grouped by tradition, each with its summary. Without
 * JavaScript the box is a plain form: the server answers ?q= with the same
 * results.
 */

export function SearchBox({
  lang,
  initialQ,
  initialHits,
  names,
}: {
  lang: Lang;
  initialQ: string;
  initialHits: SearchHit[] | null;
  /** Each tradition's name in the page's language. */
  names: Record<string, string>;
}) {
  const [q, setQ] = useState(initialQ);
  const [hits, setHits] = useState<SearchHit[] | null>(initialHits);
  const latest = useRef(initialQ);
  const navigate = useNavigate();

  const run = (value: string) => {
    latest.current = value;
    if (!value.trim()) {
      setHits(null);
      return;
    }
    engineFor(lang).then(
      (engine) => {
        if (latest.current === value) setHits(search(engine, value));
      },
      () => {},
    );
  };

  const count = hits?.length ?? 0;
  const said = hits == null ? "" : count === 0 ? tr(lang, "encSearchNone", { q }) : count === 1 ? tr(lang, "encSearchOne") : tr(lang, "encSearchMany", { n: count });
  return (
    <section className="ob-enc-search" data-testid="enc-search">
      <form
        role="search"
        action={ENC_BASE[lang]}
        method="get"
        onSubmit={(e) => {
          // With JavaScript the results are already on screen: Enter opens the first page among them.
          e.preventDefault();
          const first = hits?.find((h) => h.slug);
          if (first?.slug) {
            void navigate(lang === "fr" ? { to: "/encyclopedie/$slug", params: { slug: first.slug } } : { to: "/encyclopedia/$slug", params: { slug: first.slug } });
          }
        }}
      >
        <label htmlFor="enc-q" className="ob-enc-search-label">
          {tr(lang, "encSearch")}
        </label>
        <div className="ob-enc-search-row">
          <Search className="ob-enc-search-icon" strokeWidth={1.75} aria-hidden />
          <input
            id="enc-q"
            name="q"
            type="search"
            value={q}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-describedby="enc-q-hint"
            aria-controls="enc-results"
            data-testid="enc-search-input"
            onFocus={() => void engineFor(lang).catch(() => {})}
            onChange={(e) => {
              setQ(e.target.value);
              run(e.target.value);
            }}
          />
          <button type="submit" className="ob-enc-search-go">
            {tr(lang, "encSearchGo")}
          </button>
        </div>
        <p id="enc-q-hint" className="ob-enc-search-hint">
          {tr(lang, "encSearchHint")}
        </p>
      </form>
      <p className="sr-only" aria-live="polite" data-testid="enc-search-count">
        {said}
      </p>
      <div id="enc-results" className="ob-enc-results" data-testid="enc-results">
        {hits != null && count === 0 ? <p className="ob-enc-none">{said}</p> : null}
        {byTradition(hits ?? []).map((g) => (
          <section key={g.tradition} className="ob-enc-results-group" aria-labelledby={`r-${g.tradition}`} data-tradition={g.tradition}>
            <h3 id={`r-${g.tradition}`} className="ob-enc-h3">
              {names[g.tradition] ?? g.tradition}
            </h3>
            <ul className="ob-enc-hits">
              {g.hits.map((h) => (
                <li key={h.id} className="ob-enc-hit" data-entry={h.id}>
                  <Mark glyph={h.glyph} title={h.title} />
                  <span className="ob-enc-card-text">
                    {h.slug ? (
                      <EncLink to={lang} slug={h.slug} className="ob-enc-card-name ob-enc-card-link">
                        {h.title}
                      </EncLink>
                    ) : (
                      <span className="ob-enc-card-name">{h.title}</span>
                    )}
                    <span className="ob-enc-card-summary">{h.summary}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
