import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ZodiacState } from "@/studio/modes/zodiac";
import type { ZodiacYearsState } from "@/studio/modes/zodiac-years";
import type { ZodiacPairState } from "@/studio/modes/zodiac-pair";
import type { BaziState } from "@/studio/modes/bazi";
import type { BaziLuckState } from "@/studio/modes/bazi-luck";
import type { BaziPairState } from "@/studio/modes/bazi-pair";
import type { FengShuiState } from "@/studio/modes/fengshui";
import type { FengShuiPairState } from "@/studio/modes/fengshui-pair";
import type { FengShuiHomeState } from "@/studio/modes/fengshui-home";
import type { FengShuiCyclesState } from "@/studio/modes/fengshui-cycles";
import type { ElementReading } from "@/lib/chart/types";
import type { CompositeState } from "@/studio/modes/composite";
import type { DesignState } from "@/studio/modes/design";
import type { DesignPairState } from "@/studio/modes/design-pair";
import type { NumerologyState } from "@/studio/modes/numerology";
import type { NumerologyPairState } from "@/studio/modes/numerology-pair";
import type { ProgressionsState } from "@/studio/modes/progressions";
import { MODE_META } from "@/studio/modes/meta";
import { useLoadedModes } from "@/studio/modes/registry";
import type { SynastryState } from "@/studio/modes/synastry";
import type { TimingState } from "@/studio/modes/timing";
import type { TransitsState } from "@/studio/modes/transits";
import type { ModeDef } from "@/studio/modes/types";
import { createSlotStore, useChartScope, type ChartScope, type SlotStore } from "@/studio/scope";
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
 *
 * A runtime runs for a chart scope (studio/scope.tsx): the main one's
 * runtimes are mounted by the workspace, a Compare pane's by its
 * ChartScopeProvider, each publishing into its scope's own slots, so the same
 * page runs twice for two charts without the two meeting (share and compare
 * plan, feature 2). The Calendar and Feng Shui's Home run in the main scope
 * only (ModeMeta.mainOnly).
 */

export type ModeData = {
  natal: null;
  transits: TransitsState;
  timing: TimingState;
  progressions: ProgressionsState;
  synastry: SynastryState;
  composite: CompositeState;
  design: DesignState;
  "design-pair": DesignPairState;
  numerology: NumerologyState;
  "numerology-cycles": NumerologyState;
  "numerology-pair": NumerologyPairState;
  zodiac: ZodiacState;
  "zodiac-years": ZodiacYearsState;
  "zodiac-pair": ZodiacPairState;
  bazi: BaziState;
  "bazi-luck": BaziLuckState;
  "bazi-pair": BaziPairState;
  fengshui: FengShuiState;
  "fengshui-pair": FengShuiPairState;
  "fengshui-home": FengShuiHomeState;
  "fengshui-cycles": FengShuiCyclesState;
};

/** The main scope's runtimes (the studio as it is without Compare). */
const mainSlots = createSlotStore();

/** The slots of the scope given, else of the scope around the caller (the main one outside any). */
function useSlots(scope?: ChartScope | null): SlotStore {
  const around = useChartScope();
  return (scope ?? around)?.slots ?? mainSlots;
}

function Runtime({ def, slots }: { def: ModeDef; slots: SlotStore }) {
  const runtime = def.useRuntime();
  useLayoutEffect(() => {
    slots.set(def.id, runtime);
  }, [slots, def.id, runtime]);
  useLayoutEffect(() => () => slots.set(def.id, undefined), [slots, def.id]);
  return null;
}

/** Mounts the hooks of every mode opened so far, for the scope around it (see above). */
export function ModeRuntimes() {
  const scope = useChartScope();
  const slots = scope?.slots ?? mainSlots;
  const page = useStudioStore((s) => s.page);
  const loaded = useLoadedModes();
  const opened = useRef(new Set<StudioPage>());
  if (!scope || !MODE_META[page].mainOnly) opened.current.add(page);
  return (
    <>
      {loaded
        .filter((def) => opened.current.has(def.id))
        .map((def) => (
          <Runtime key={def.id} def={def} slots={slots} />
        ))}
    </>
  );
}

/**
 * A mode's data, from inside that mode (undefined for the moment before its
 * hooks have run): the scope's around the caller, or the scope given.
 */
export function useModeData<K extends Exclude<StudioPage, "natal">>(page: K, scope?: ChartScope | null): ModeData[K] | undefined {
  const slots = useSlots(scope);
  return useSyncExternalStore(
    slots.subscribe,
    () => slots.get(page)?.data as ModeData[K] | undefined,
    () => undefined,
  );
}

/** The reading of the selected item in the mode on screen: the scope's around the caller, or the scope given. */
export function useModeReading(scope?: ChartScope | null): ElementReading | null {
  const page = useStudioStore((s) => s.page);
  const slots = useSlots(scope);
  return useSyncExternalStore(
    slots.subscribe,
    () => slots.get(page)?.reading ?? null,
    () => null,
  );
}
