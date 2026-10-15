import { Hash, Hexagon, Sparkles, Sun, type LucideIcon } from "lucide-react";
import { LanguageMark } from "@/studio/shell/language-mark";
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
 * yet shows its card (pointing at it, focusing it or tapping it). The
 * Chinese traditions (part 23) wear the language picker's own marks and
 * their names in characters; Chinese cosmology, which the three share, the
 * taiji; a tradition whose introduction is written before its entries says
 * "Introduction".
 */

const ICON: Record<string, LucideIcon> = { astrology: Sun, "human-design": Hexagon, numerology: Hash, shared: Sparkles };
/** The Chinese languages' marks, as the language picker draws them. */
const PICKER_MARK = new Set(["chinese-astrology", "bazi", "feng-shui"]);

/** The taiji, for the cosmology the Chinese languages share: a circle and its two halves, in the picker's line. */
function TaijiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 2.2a2.9 2.9 0 0 1 0 5.8 2.9 2.9 0 0 0 0 5.8" />
      <circle cx="8" cy="5.1" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="8" cy="10.9" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TraditionMark({ id }: { id: string }) {
  if (id === "chinese") return <TaijiMark className="ob-enc-trad-icon" />;
  if (PICKER_MARK.has(id)) return <LanguageMark id={id as "bazi"} className="ob-enc-trad-icon" />;
  const Icon = ICON[id] ?? Sparkles;
  return <Icon className="ob-enc-trad-icon" strokeWidth={1.5} aria-hidden />;
}
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
          {home.traditions.map((t) => (
            <li key={t.id}>
              <EncLink to={lang} slug={t.home} className="ob-enc-trad" data-tradition={t.id}>
                <TraditionMark id={t.id} />
                <span className="ob-enc-trad-name">
                  {t.name}
                  {t.zh ? (
                    <span className="ob-enc-trad-zh" lang="zh-Hant">
                      {` ${t.zh.hant}`}
                    </span>
                  ) : null}
                </span>
                <span className="ob-enc-trad-intro">{t.intro}</span>
                <span className="ob-enc-trad-count">{t.count > 1 ? tr(lang, "encEntries", { n: t.count }) : t.count ? tr(lang, "encEntry") : tr(lang, "encIntroOnly")}</span>
              </EncLink>
            </li>
          ))}
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
