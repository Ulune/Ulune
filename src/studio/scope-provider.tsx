import type { ReactNode } from "react";
import { ModeRuntimes } from "@/studio/modes/data";
import { ChartScopeContext, type ChartScope } from "@/studio/scope";

/*
 * Draws a Compare pane in its chart scope (share and compare plan, feature 2,
 * the foundation): the scope made by useChartScopeHandle (scope-handle.ts)
 * around its children, and the scope's runtimes for the pages it shows
 * (modes/data.tsx). Loaded with Compare only.
 */

/** Draws its children in the scope, and runs the scope's runtimes for the pages it shows (modes/data.tsx). */
export function ChartScopeProvider({ scope, children }: { scope: ChartScope; children?: ReactNode }) {
  return (
    <ChartScopeContext.Provider value={scope}>
      <ModeRuntimes />
      {children}
    </ChartScopeContext.Provider>
  );
}
