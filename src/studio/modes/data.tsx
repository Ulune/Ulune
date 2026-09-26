import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ElementReading } from "@/lib/chart/types";
import type { CompositeState } from "@/studio/modes/composite";
import type { DesignState } from "@/studio/modes/design";
import type { NumerologyState } from "@/studio/modes/numerology";
import type { ProgressionsState } from "@/studio/modes/progressions";
import { useLoadedModes } from "@/studio/modes/registry";
import type { SynastryState } from "@/studio/modes/synastry";
import type { TimingState } from "@/studio/modes/timing";
import type { TransitsState } from "@/studio/modes/transits";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";

/*
 * Each mode's hooks run in its own runtime (a component that renders
 * nothing), mounted once the mode has been opened and kept afterwards, so a
 * mode keeps its sky, its scope and its dates across switches, as before.
 * Only modes that were opened run at all. A runtime hands its data and the
 * selected item's reading to the figure, panels and table through a small
 * store, updated in a layout effect: whatever reads it re-renders before the
 * frame is painted.
 */

export type ModeData = {
  natal: null;
  transits: TransitsState;
  timing: TimingState;
  progressions: ProgressionsState;
  synastry: SynastryState;
  composite: CompositeState;
  design: DesignState;
  numerology: NumerologyState;
};

const slots: Partial<Record<StudioPage, ModeRuntime>> = {};
const subs = new Set<() => void>();

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

function publish(page: StudioPage, runtime: ModeRuntime | undefined) {
  if (slots[page] === runtime) return;
  if (runtime) slots[page] = runtime;
  else delete slots[page];
  for (const fn of subs) fn();
}

function Runtime({ def }: { def: ModeDef }) {
  const runtime = def.useRuntime();
  useLayoutEffect(() => {
    publish(def.id, runtime);
  }, [def.id, runtime]);
  useLayoutEffect(() => () => publish(def.id, undefined), [def.id]);
  return null;
}

/** Mounts the hooks of every mode opened so far (see above). */
export function ModeRuntimes() {
  const page = useStudioStore((s) => s.page);
  const loaded = useLoadedModes();
  const opened = useRef(new Set<StudioPage>());
  opened.current.add(page);
  return (
    <>
      {loaded
        .filter((def) => opened.current.has(def.id))
        .map((def) => (
          <Runtime key={def.id} def={def} />
        ))}
    </>
  );
}

/** A mode's data, from inside that mode (undefined for the moment before its hooks have run). */
export function useModeData<K extends Exclude<StudioPage, "natal">>(page: K): ModeData[K] | undefined {
  return useSyncExternalStore(
    subscribe,
    () => slots[page]?.data as ModeData[K] | undefined,
    () => undefined,
  );
}

/** The reading of the selected item in the mode on screen. */
export function useModeReading(): ElementReading | null {
  const page = useStudioStore((s) => s.page);
  return useSyncExternalStore(
    subscribe,
    () => slots[page]?.reading ?? null,
    () => null,
  );
}
