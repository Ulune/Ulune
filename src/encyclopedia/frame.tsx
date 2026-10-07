import { Link, useRouter } from "@tanstack/react-router";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { PageTopBar } from "@/studio/shell/PageTopBar";
import { historyIndex, studioReturn } from "@/studio/return-target";
import { TEXT_LICENCE } from "./head";
import type { Lang } from "./types";
import { tr } from "./words";
import "./encyclopedia.css";

/*
 * What every encyclopedia page shares: the frame of the app's other pages
 * (its top bar), the page's language on its content, breadcrumbs, the link
 * to the same page in the other language, and the licence of the text. The
 * words are in the page's language (its address says which), whatever the
 * reader's interface language: /encyclopedie/… is a French page for everyone.
 */

type AnchorProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "children">;

/**
 * A link inside the encyclopedia, moved to by the app without reloading:
 * `to` the language of the address, then its home, or a page or a tradition
 * by its address (`slug`). Pointing at it fetches the page's piece ahead, so
 * the click lands at once.
 */
export function EncLink({ to, slug, hash, children, ...rest }: { to: Lang; slug?: string; hash?: string; children: ReactNode } & AnchorProps) {
  if (slug) {
    return to === "fr" ? (
      <Link to="/encyclopedie/$slug" params={{ slug }} hash={hash} preload="intent" {...rest}>
        {children}
      </Link>
    ) : (
      <Link to="/encyclopedia/$slug" params={{ slug }} hash={hash} preload="intent" {...rest}>
        {children}
      </Link>
    );
  }
  return to === "fr" ? (
    <Link to="/encyclopedie" hash={hash} preload="intent" {...rest}>
      {children}
    </Link>
  ) : (
    <Link to="/encyclopedia" hash={hash} preload="intent" {...rest}>
      {children}
    </Link>
  );
}

export function EncFrame({ lang, testId, narrow = false, children }: { lang: Lang; testId: string; narrow?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0" data-testid={testId}>
      <PageTopBar />
      <main className={narrow ? "ob-enc ob-enc--narrow" : "ob-enc"} lang={lang}>
        <BackToStudio lang={lang} />
        {children}
      </main>
    </div>
  );
}

/**
 * "← Back to your chart" (page reorganisation plan, R6), when the reader came
 * from the studio in this tab: to the very entry of the tab's history it was
 * left from, as the browser's Back would, past the encyclopedia's pages read
 * since; the studio comes back with its chart, lens, pin, zoom and scroll.
 * A first visit (from a search engine, a shared link) has no such link: the
 * sections above lead into Ulune.
 */
function BackToStudio({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [back] = useState(studioReturn);
  if (!back) return null;
  const words = back.calendar ? "encBackCalendar" : back.chart ? "encBackChart" : "encBackCharts";
  return (
    <p className="ob-enc-back">
      <a
        href={back.href}
        className="ob-enc-back-link"
        data-testid="enc-back"
        onClick={(e) => {
          // A new tab or window: the browser's own way (that tab starts afresh).
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          const now = historyIndex();
          if (back.index != null && now != null && back.index < now) router.history.go(back.index - now);
          else void router.navigate({ href: back.href });
        }}
      >
        <span aria-hidden="true">←</span>
        {tr(lang, words)}
      </a>
    </p>
  );
}

export type Crumb = { label: string; slug?: string; hash?: string; home?: boolean };

/** Encyclopedia › Astrology › Planets › Saturn: each a link but the last, the page itself. */
export function Crumbs({ lang, items }: { lang: Lang; items: Crumb[] }) {
  return (
    <nav className="ob-enc-crumbs" aria-label={tr(lang, "encBreadcrumb")} data-testid="enc-crumbs">
      <ol>
        {items.map((c, i) =>
          i === items.length - 1 ? (
            <li key={i} aria-current="page">
              {c.label}
            </li>
          ) : (
            <li key={i}>
              <EncLink to={lang} slug={c.slug} hash={c.hash}>
                {c.label}
              </EncLink>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}

/** The same page in the other language, named in that language. */
export function TwinLink({ lang, slug, title }: { lang: Lang; slug?: string; title?: string }) {
  const twin: Lang = lang === "en" ? "fr" : "en";
  return (
    <EncLink to={twin} slug={slug} className="ob-enc-twin" hrefLang={twin} lang={twin} data-testid="enc-twin">
      <span className="ob-enc-twin-label">{tr(lang, "encTwin")}</span>
      {title ? <span className="ob-enc-twin-title">{title}</span> : null}
    </EncLink>
  );
}

/** The text's licence (content/encyclopedia/LICENSE); the code's is on the credits page. */
export function Licence({ lang }: { lang: Lang }) {
  const [before, after] = tr(lang, "encLicence").split("{licence}");
  return (
    <p className="ob-enc-licence" data-testid="enc-licence">
      {before}
      <a href={TEXT_LICENCE.url} target="_blank" rel="license noopener noreferrer">
        {TEXT_LICENCE.name}
        <span className="sr-only"> ({tr(lang, "legalNewTab")})</span>
      </a>
      {after}
    </p>
  );
}

/**
 * A glyph, or the name's first letter where the entry has none. A glyph of
 * more than two characters (a profile "1/3", a channel "64–47") is set
 * smaller so it fits the square.
 */
export function Mark({ glyph, title }: { glyph: string; title: string }) {
  const cls = !glyph ? "ob-enc-mark ob-enc-mark--letter" : [...glyph].length > 2 ? "ob-enc-mark ob-enc-mark--long" : "ob-enc-mark";
  return (
    <span className={cls} aria-hidden="true">
      {glyph || title.charAt(0)}
    </span>
  );
}
