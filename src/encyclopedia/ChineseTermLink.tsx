import { Fragment, type ReactNode } from "react";
import { linkableId, type ChineseFamily } from "@/lib/chinese/term-ids";
import type { TermPiece } from "@/lib/chinese/term-pieces";
import { Term } from "./Term";

/*
 * The linked side of ChineseTermWord.tsx (languages plan, part 29): its own
 * download, with the registry of Chinese terms, fetched only once the
 * encyclopedia has written a family of them. A thing whose family is written
 * links to its entry; anything else stays the very words it was. As in
 * TermWord, inside a row that picks its own reading the word is its own
 * target.
 */

export function LiveTermWord({ family, id, children }: { family: ChineseFamily; id: string | number | null | undefined; children: ReactNode }) {
  const term = linkableId(family, id);
  if (!term) return <>{children}</>;
  return (
    <span className="ob-term-in" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <Term id={term}>{children}</Term>
    </span>
  );
}

/** A cell naming several terms: its pieces, only when they give back its text exactly and one of them is written. */
export function LiveTermPieces({ text, pieces }: { text: string; pieces: () => TermPiece[] }) {
  const list = pieces();
  if (list.map((p) => p.text).join("") !== text || !list.some((p) => p.family && linkableId(p.family, p.id))) return <>{text}</>;
  return (
    <>
      {list.map((p, i) =>
        p.family ? (
          <LiveTermWord key={i} family={p.family} id={p.id}>
            {p.text}
          </LiveTermWord>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
