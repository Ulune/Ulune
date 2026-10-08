import { Hash, Hexagon, Sparkles, Sun, type LucideIcon } from "lucide-react";
import { MineIndexSlot, ShelfSlot } from "./MineSlot";
import { EncFrame, EncLink, Licence, TwinLink } from "./frame";
import { tr } from "./words";
import type { HomeRouteData } from "./load";
import { SearchBox } from "./SearchBox";
import { Term } from "./Term";

/*
 * The encyclopedia's home (/encyclopedia, /encyclopedie): the search box
 * first, then the traditions as cards, then every entry from A to Z in the
 * page's language, with a row of letters to jump to. An entry with no page
 * yet shows its card (pointing at it, focusing it or tapping it).
 */

const ICON: Record<string, LucideIcon> = { astrology: Sun, "human-design": Hexagon, numerology: Hash, shared: Sparkles };
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const anchor = (letter: string) => `az-${letter === "#" ? "0" : letter.toLowerCase()}`;

export function HomePage({ data }: { data: HomeRouteData }) {
  const { home } = data;
  const { lang } = home;
  const names = Object.fromEntries(home.traditions.map((t) => [t.id, t.name]));
  const present = new Set(home.az.map(([letter]) => letter));
  return (
    <EncFrame lang={lang} testId="enc-home">
      <header className="ob-enc-hero">
        <h1 className="ob-enc-title">{tr(lang, "encTitle")}</h1>
        <p className="ob-enc-lead">{tr(lang, "encLead")}</p>
        <p className="ob-enc-meta">
          <TwinLink lang={lang} />
        </p>
      </header>

      <SearchBox lang={lang} initialQ={data.q} initialHits={data.hits} names={names} />
      <MineIndexSlot lang={lang} />
      <ShelfSlot lang={lang} />

      <section className="ob-enc-block" aria-labelledby="h-traditions" data-testid="enc-traditions">
        <h2 id="h-traditions" className="ob-enc-h2">
          {tr(lang, "encTraditions")}
        </h2>
        <ul className="ob-enc-trads">
          {home.traditions.map((t) => {
            const Icon = ICON[t.id] ?? Sparkles;
            return (
              <li key={t.id}>
                <EncLink to={lang} slug={t.home} className="ob-enc-trad" data-tradition={t.id}>
                  <Icon className="ob-enc-trad-icon" strokeWidth={1.5} aria-hidden />
                  <span className="ob-enc-trad-name">{t.name}</span>
                  <span className="ob-enc-trad-intro">{t.intro}</span>
                  <span className="ob-enc-trad-count">{tr(lang, "encEntries", { n: t.count })}</span>
                </EncLink>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="ob-enc-block" aria-labelledby="h-az" data-testid="enc-az">
        <h2 id="h-az" className="ob-enc-h2">
          {tr(lang, "encAZ")}
        </h2>
        <nav className="ob-enc-letters" aria-label={tr(lang, "encLetters")} data-testid="enc-letters">
          {(present.has("#") ? ["#", ...LETTERS] : LETTERS).map((letter) =>
            present.has(letter) ? (
              <a key={letter} href={`#${anchor(letter)}`} className="ob-enc-letter">
                {letter}
              </a>
            ) : (
              <span key={letter} className="ob-enc-letter ob-enc-letter--none" aria-hidden="true">
                {letter}
              </span>
            ),
          )}
        </nav>
        {home.az.map(([letter, rows]) => (
          <section key={letter} id={anchor(letter)} className="ob-enc-az-group" aria-labelledby={`h-${anchor(letter)}`}>
            <h3 id={`h-${anchor(letter)}`} className="ob-enc-h3">
              {letter}
            </h3>
            <ul className="ob-enc-az">
              {rows.map(([id, title, , , slug, tradition]) => (
                <li key={id} data-entry={id}>
                  {slug ? (
                    <EncLink to={lang} slug={slug} className="ob-enc-az-link">
                      {title}
                    </EncLink>
                  ) : (
                    <Term id={id} lang={lang} slug={null}>
                      {title}
                    </Term>
                  )}
                  <span className="ob-enc-az-tag">{names[tradition] ?? tradition}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>

      <footer className="ob-enc-foot">
        <Licence lang={lang} />
      </footer>
    </EncFrame>
  );
}
