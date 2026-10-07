/*
 * The encyclopedia in the ⌘K palette (encyclopedia plan, part 5): its entries
 * found as the reader types, in the reader's language, listed after the
 * palette's own commands under "Encyclopedia". Nothing loads before the first
 * letter: then the language's search index, once (palette-search.ts).
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { importWithRetry } from "@/lib/lazy-retry";
import type { Lang } from "./types";
import { tr } from "./words";

/** A command as the palette lists it (CommandPaletteDialog.tsx). */
export type PaletteCommand = { id: string; section: string; label: string; hint?: string; find?: boolean; run: () => void };

const short = (text: string) => (text.length > 72 ? `${text.slice(0, 70)}…` : text);

export function useEncyclopediaCommands(query: string, lang: Lang): PaletteCommand[] {
  const navigate = useNavigate();
  const [commands, setCommands] = useState<PaletteCommand[]>([]);
  useEffect(() => {
    const q = query.trim();
    let live = true;
    if (!q) {
      setCommands([]);
      return;
    }
    importWithRetry(() => import("./palette-search"))
      .then((m) => m.paletteHits(lang, q))
      .then(
        (hits) => {
          if (!live) return;
          const section = tr(lang, "encTitle");
          setCommands(
            hits.map((h) => ({
              id: `enc:${h.id}`,
              section,
              label: h.title,
              hint: short(h.summary),
              find: true,
              run: () => void navigate({ href: h.href }),
            })),
          );
        },
        () => live && setCommands([]),
      );
    return () => {
      live = false;
    };
  }, [query, lang, navigate]);
  return commands;
}
