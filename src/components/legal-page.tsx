import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PageTopBar } from "@/studio/shell/PageTopBar";
import { useI18n } from "@/lib/i18n/locale";
import { dateFormat } from "@/lib/intl-cache";
import { OPERATOR } from "@/lib/legal/operator";
import type { NoticeBlock } from "@/lib/legal/privacy-notice";
import { LEGAL_LINKS } from "@/lib/legal/links";


const TOKEN = /\[([^\]]+)\]\(((?:https:\/\/|\/)[^)\s]*)\)|\{name\}|\{contact\}/g;

/**
 * A legal text's line: [label](/page) and [label](https://…) become links,
 * {name} and {contact} who publishes Ulune (lib/legal/operator.ts).
 */
export function LegalText({ text }: { text: string }) {
  const { t } = useI18n();
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    if (m[0] === "{name}") out.push(OPERATOR.name);
    else if (m[0] === "{contact}")
      out.push(
        <a key={at} className="ob-notice-link" href={`mailto:${OPERATOR.contact}`}>
          {OPERATOR.contact}
        </a>,
      );
    else if (m[2].startsWith("/")) {
      // Another legal page, in the app (a chart being looked at stays open).
      const page = LEGAL_LINKS.find((link) => link.to === m[2]);
      out.push(
        page ? (
          <Link key={at} className="ob-notice-link" to={page.to}>
            {m[1]}
          </Link>
        ) : (
          <a key={at} className="ob-notice-link" href={m[2]}>
            {m[1]}
          </a>
        ),
      );
    }
    else
      out.push(
        <a key={at} className="ob-notice-link" href={m[2]} target="_blank" rel="noopener noreferrer">
          {m[1]}
          <span className="sr-only"> ({t("legalNewTab")})</span>
        </a>,
      );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((part, i) => (typeof part === "string" ? <Fragment key={`t${i}`}>{part}</Fragment> : part))}</>;
}

/** The links between the legal pages, the current one marked. */
export function LegalNav({ current }: { current?: string }) {
  const { t } = useI18n();
  return (
    <nav className="ob-legal-nav" aria-label={t("legalAbout")} data-testid="legal-nav">
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.id}
          to={link.to}
          className="ob-legal-nav-link"
          aria-current={link.id === current ? "page" : undefined}
          data-testid={`legal-link-${link.id}`}
        >
          {t(link.label)}
        </Link>
      ))}
    </nav>
  );
}

/** A legal page: title, date, the blocks, anything after them, and the links to the others. */
export function LegalPage({
  id,
  title,
  updated,
  date: iso,
  blocks,
  children,
}: {
  id: string;
  title: string;
  updated: string;
  date: string;
  blocks: NoticeBlock[];
  children?: ReactNode;
}) {
  const { locale } = useI18n();
  const [y, m, d] = iso.split("-").map(Number);
  const date = dateFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  return (
    <div className="min-w-0" data-testid={`${id}-page`}>
      <PageTopBar />
      <main className="ulune-settings">
        <article className="ulune-panel ob-settings-card ob-notice">
          <h1 className="ob-notice-title">{title}</h1>
          <p className="ob-notice-date">{updated.replace("{date}", date)}</p>
          {blocks.map((block, i) => (
            <section key={i} className="ob-notice-block">
              {block.h ? <h2 className="ob-settings-h">{block.h}</h2> : null}
              {block.p ? (
                <p>
                  <LegalText text={block.p} />
                </p>
              ) : null}
              {block.list ? (
                <ul>
                  {block.list.map((item) => (
                    <li key={item}>
                      <LegalText text={item} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          {children}
          <LegalNav current={id} />
        </article>
      </main>
    </div>
  );
}
