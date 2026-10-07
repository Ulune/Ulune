import { Fragment } from "react";
import { Term } from "./Term";
import type { Block, Inline, Lang, Section } from "./types";

/*
 * An entry's body as the build gave it (types.ts): sections of paragraphs,
 * lists and tables, with bold, italic and links to other entries. Rendered on
 * the server, so a page reads whole without JavaScript.
 */

export function Inlines({ nodes, lang }: { nodes: Inline[]; lang: Lang }) {
  return (
    <>
      {nodes.map((n, i) => (
        <Fragment key={i}>
          {typeof n === "string" ? (
            n
          ) : "b" in n ? (
            <strong>
              <Inlines nodes={n.b} lang={lang} />
            </strong>
          ) : "i" in n ? (
            <em>
              <Inlines nodes={n.i} lang={lang} />
            </em>
          ) : (
            <Term id={n.l} lang={lang} slug={n.s}>
              {n.w}
            </Term>
          )}
        </Fragment>
      ))}
    </>
  );
}

function BlockView({ block, lang, label }: { block: Block; lang: Lang; label: string }) {
  if (block.t === "p") {
    return (
      <p>
        <Inlines nodes={block.c} lang={lang} />
      </p>
    );
  }
  if (block.t === "ul" || block.t === "ol") {
    const items = block.items.map((item, i) => (
      <li key={i}>
        <Inlines nodes={item} lang={lang} />
      </li>
    ));
    return block.t === "ul" ? <ul>{items}</ul> : <ol start={block.start === 1 ? undefined : block.start}>{items}</ol>;
  }
  const align = (i: number) => {
    const a = block.align[i];
    return a === "c" ? "center" : a === "r" ? "right" : a === "l" ? "left" : undefined;
  };
  return (
    // A wide table scrolls on its own on a narrow screen; the keyboard can reach it.
    <div className="ob-enc-table" role="region" aria-label={label} tabIndex={0}>
      <table>
        <thead>
          <tr>
            {block.head.map((cell, i) => (
              <th key={i} scope="col" style={{ textAlign: align(i) }}>
                <Inlines nodes={cell} lang={lang} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i} style={{ textAlign: align(i) }}>
                  <Inlines nodes={cell} lang={lang} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Sections({ sections, lang }: { sections: Section[]; lang: Lang }) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.key} className="ob-enc-section ob-enc-prose" aria-labelledby={`s-${s.key}`} data-section={s.key}>
          <h2 id={`s-${s.key}`} className="ob-enc-h2">
            {s.h}
          </h2>
          {s.blocks.map((b, i) => (
            <BlockView key={i} block={b} lang={lang} label={s.h} />
          ))}
        </section>
      ))}
    </>
  );
}
