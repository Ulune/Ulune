import { Suspense, type ReactNode } from "react";
import type { ChineseFamily } from "@/lib/chinese/term-ids";
import { LIVE_FAMILIES } from "@/lib/chinese/term-live";
import type { TermPiece } from "@/lib/chinese/term-pieces";
import { lazyNamed } from "@/lib/lazy-component";

/*
 * A Chinese term the studio names by its id, in a table cell (languages plan,
 * part 29: "every term ready to link to the encyclopedia"; encyclopedia plan,
 * part 7: "in tables every cell that names a term is a link"): a stem, a
 * branch, a Ten God, a mountain, a star… Linked to its entry once the
 * encyclopedia has written its family (lib/chinese/term-live.ts); until then
 * the very words as before, with no markup and no download of their own.
 * The link and the registry it reads are ChineseTermLink.tsx, fetched with
 * the first written family; the words stand as they are meanwhile.
 */

const LiveTermWord = lazyNamed(() => import("./ChineseTermLink"), "LiveTermWord");
const LiveTermPieces = lazyNamed(() => import("./ChineseTermLink"), "LiveTermPieces");

export function ChineseTermWord({ family, id, children }: { family: ChineseFamily; id: string | number | null | undefined; children: ReactNode }) {
  if (!LIVE_FAMILIES.size) return <>{children}</>;
  return (
    <Suspense fallback={children}>
      <LiveTermWord family={family} id={id}>
        {children}
      </LiveTermWord>
    </Suspense>
  );
}

/**
 * A cell that names several terms ("己 jǐ 60 · 癸 guǐ 30", "Clash, Harm"):
 * each linked once its family is written. The pieces (lib/chinese/term-pieces.ts)
 * are only worked out then, and only used when they give back the cell's
 * text exactly; otherwise the text stays as it is.
 */
export function ChineseTermPieces({ text, pieces }: { text: string; pieces: () => TermPiece[] }) {
  if (!LIVE_FAMILIES.size) return <>{text}</>;
  return (
    <Suspense fallback={text}>
      <LiveTermPieces text={text} pieces={pieces} />
    </Suspense>
  );
}
