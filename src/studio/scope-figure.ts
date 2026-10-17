import { useContext, useEffect, useState } from "react";
import { isWide } from "@/studio/dock/dock-layout";
import { ChartScopeContext, useScoped } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";

/*
 * What a figure that keeps its reading behind a card on a phone asks of its
 * chart scope (studio/scope.tsx; share and compare plan, feature 2): its
 * selection with the quiet choice, and whether the reading stands beside it.
 * Apart from scope.tsx so that it loads with the pages that use it (Human
 * Design's), not with the first page.
 */

/** Toggles a choice in the main scope without touching the panel (a phone's figure, the reading behind its card). */
const quietMain = (id: string) => useStudioStore.setState((s) => ({ selectedId: s.selectedId === id ? null : id }));

/**
 * The selection of this part's chart: `pick` (a list or a table, asks for its
 * reading), `choose` (on the figure itself), `clear`, and `quiet` (chosen on a
 * phone's figure: lit, its reading kept behind the pick card).
 */
export function useScopedSelection() {
  const scope = useContext(ChartScopeContext);
  const selectedId = useScoped((s) => s.selectedId);
  const pick = useScoped((s) => s.pick);
  const choose = useScoped((s) => s.choose);
  const clear = useScoped((s) => s.clear);
  return { selectedId, pick, choose, clear, quiet: scope ? scope.state.choose : quietMain };
}

/**
 * Whether the reading stands beside the figure: a computer's side panel (the
 * main scope, as the window says), or what Compare's layout says for a scope.
 * On a phone the reading is a sheet over the figure, and a choice keeps the
 * figure whole (the pick card).
 */
export function useReadingBeside(): boolean {
  const scope = useContext(ChartScopeContext);
  const [wide, setWide] = useState(true);
  useEffect(() => {
    if (scope) return;
    const on = () => setWide(isWide());
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [scope]);
  return scope ? scope.readingBeside : wide;
}
