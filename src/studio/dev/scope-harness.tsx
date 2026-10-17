import type { SavedChart } from "@/lib/chart/library";
import { chartDisplayName } from "@/lib/chart/library";
import { LoadingLines } from "@/components/loading-lines";
import { useModeReading } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
import { useModeDef } from "@/studio/modes/registry";
import type { ModeDef } from "@/studio/modes/types";
import { useScoped } from "@/studio/scope";
import { useChartScopeHandle } from "@/studio/scope-handle";
import { ChartScopeProvider } from "@/studio/scope-provider";
import { ScopeStage } from "@/studio/stage/ScopeStage";
import { useStudioStore } from "@/studio/store";

/*
 * Development only: the Compare foundation's harness (share and compare plan,
 * feature 2, "Work" step 1; switched on by harness-mount.tsx). Over the
 * studio, the page on screen drawn twice, side by side, each copy in a scope
 * of its own: A the chart on screen, B synastry's partner or else the next
 * saved chart (on a Relationship page, each one's second person is the other).
 * Each pane shows its selection (data-selected), its reading and, with
 * nothing chosen, its panel's first read, so a test (scripts/e2e/scopes.mjs)
 * and a person can check that the two copies draw their own data, keep their
 * own selection and never meet the main page. Plain words: never shipped.
 */

const CSS = `
.ob-scope-harness { position: fixed; inset: 0; z-index: 80; display: flex; flex-direction: column; overflow: auto; background: var(--color-bg); color: var(--color-fg); }
.ob-scope-harness-head { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid var(--color-border); font: 13px/1.3 var(--font-ui); }
.ob-scope-harness-head b { font-weight: 600; }
.ob-scope-harness-head button { margin-left: auto; min-height: 32px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: 8px; }
.ob-scope-harness-panes { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1px; flex: 1 0 auto; background: var(--color-border); }
.ob-scope-pane { display: flex; flex-direction: column; min-width: 0; background: var(--color-bg); }
/* A phone held upright: the two stacked, each half the height and scrolling on its own (as Compare will). */
.ob-scope-pane { height: calc((100dvh - 50px) / 2); overflow: auto; }
.ob-scope-pane > .ob-stage { flex: 0 0 auto; height: 100%; }
@media (min-width: 700px) {
  .ob-scope-harness-panes { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .ob-scope-pane { height: auto; overflow: visible; }
  .ob-scope-pane > .ob-stage { height: min(74vh, 780px); }
}
.ob-scope-label { flex: 0 0 auto; font: 600 13px/1.2 var(--font-ui); white-space: nowrap; }
.ob-scope-reading { padding: 12px 16px; border-top: 1px solid var(--color-border); font: 13px/1.45 var(--font-ui); }
.ob-scope-reading h3 { margin: 0 0 4px; font: 600 15px/1.3 var(--font-ui); }
.ob-scope-pick { position: relative; min-height: 0; }
`;

export function ScopeHarness({ onClose }: { onClose: () => void }) {
  const page = useStudioStore((s) => s.page);
  const view = useStudioStore((s) => s.view);
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const partnerId = useStudioStore((s) => s.pair.partnerId);
  const mainSelected = useStudioStore((s) => s.selectedId);
  const { def } = useModeDef(page);
  const rowA = rows.find((r) => r.id === activeId) ?? null;
  const rowB = rows.find((r) => r.id === partnerId && r.id !== activeId) ?? rows.find((r) => r.id !== activeId) ?? null;
  const mainOnly = Boolean(MODE_META[page].mainOnly);
  const table = view === "table";
  return (
    <div
      className="ob-scope-harness"
      data-testid="scope-harness"
      data-page={page}
      data-view={view}
      data-main-selected={mainSelected ?? ""}
    >
      <style>{CSS}</style>
      <div className="ob-scope-harness-head">
        <b>Scopes</b>
        <span>
          {page} · {view}
        </span>
        <button type="button" data-testid="scope-harness-close" onClick={onClose}>
          Close
        </button>
      </div>
      {mainOnly ? (
        <p className="ob-scope-reading" data-testid="scope-harness-main-only">
          This page is drawn in the main scope only.
        </p>
      ) : !def ? (
        <LoadingLines lines={4} />
      ) : (
        <div className="ob-scope-harness-panes">
          <Pane id="a" row={rowA} partnerId={rowB?.id ?? null} def={def} table={table} />
          <Pane id="b" row={rowB} partnerId={rowA?.id ?? null} def={def} table={table} />
        </div>
      )}
    </div>
  );
}

function Pane({ id, row, partnerId, def, table }: { id: "a" | "b"; row: SavedChart | null; partnerId: string | null; def: ModeDef; table: boolean }) {
  const scope = useChartScopeHandle({ id, row, partnerId, compositePartnerId: partnerId });
  const name = row ? chartDisplayName(row.input) : "—";
  return (
    <ChartScopeProvider scope={scope}>
      <div className="ob-scope-pane" data-chart-scope={id} data-testid={`scope-pane-${id}`} data-selected={scope.state.selectedId ?? ""} data-chart={row?.id ?? ""}>
        <ScopeStage
          testId={`scope-stage-${id}`}
          label={`${id.toUpperCase()} · ${name}`}
          table={table}
          controls={def.Controls ? <def.Controls /> : null}
          caption={!table && def.Caption ? <def.Caption /> : null}
        >
          {!row ? (
            <p className="ob-scope-reading">No chart for this pane: cast a second one.</p>
          ) : table ? (
            <div className="ulune-table-view min-w-0">{def.Data ? <def.Data /> : null}</div>
          ) : (
            <def.Figure />
          )}
        </ScopeStage>
        <div className="ob-scope-pick" data-scope-pick-host={id} />
        {row ? <PaneReading id={id} def={def} /> : null}
      </div>
    </ChartScopeProvider>
  );
}

/** The scope's reading (its title), or with nothing chosen its panel's first read (HelloEmpty). */
function PaneReading({ id, def }: { id: "a" | "b"; def: ModeDef }) {
  const reading = useModeReading();
  const selectedId = useScoped((s) => s.selectedId);
  return (
    <section className="ob-scope-reading" data-testid={`scope-reading-${id}`} data-reading={reading?.id ?? ""} data-selected={selectedId ?? ""}>
      {reading ? (
        <>
          <h3>{reading.title}</h3>
          <p>{reading.kicker}</p>
        </>
      ) : (
        <def.HelloEmpty />
      )}
    </section>
  );
}
