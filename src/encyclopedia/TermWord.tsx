import type { ReactNode } from "react";
import { Term } from "./Term";
import { termId, type TermKind } from "./term-ids";

/**
 * A word the studio names by its id (a sign in a table cell, an aspect's
 * name, a pattern), linked to its encyclopedia entry (encyclopedia plan,
 * part 7: "in tables every cell that names a term is a link"). Inside a row
 * that chooses its own reading, the word is its own target: pressing it
 * opens the entry (or its card, on a phone) and leaves the row alone. A
 * thing with no entry stays a plain word.
 */
export function TermWord({ kind, id, children }: { kind: TermKind; id: string | number | null | undefined; children: ReactNode }) {
  const term = termId(kind, id);
  if (!term) return <>{children}</>;
  return (
    <span className="ob-term-in" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <Term id={term}>{children}</Term>
    </span>
  );
}
