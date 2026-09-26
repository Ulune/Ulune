import type { MessageKey } from "@/lib/i18n/messages";
import type { MODE_GROUPS, ModeGroupId, StudioPage } from "@/studio/url";

/**
 * What the shell needs to know about every mode before its code has loaded:
 * names, group, test ids. The modes themselves (figures, panels, tables and
 * their data) load when they are first opened, or at idle beforehand.
 */
export type ModeMeta = {
  id: StudioPage;
  group: ModeGroupId;
  labelKey: MessageKey;
  needsChart: boolean;
  stageTestId: string;
  emptyTestId?: string;
};

export const MODE_META: Record<StudioPage, ModeMeta> = {
  natal: {
    id: "natal",
    group: "chart",
    labelKey: "pageNatal",
    needsChart: true,
    stageTestId: "studio-natal",
  },
  transits: {
    id: "transits",
    group: "time",
    labelKey: "pageTransits",
    needsChart: true,
    stageTestId: "studio-transits",
    emptyTestId: "studio-transits-empty",
  },
  timing: {
    id: "timing",
    group: "time",
    labelKey: "pageTiming",
    needsChart: true,
    stageTestId: "studio-timing",
    emptyTestId: "studio-timing-empty",
  },
  progressions: {
    id: "progressions",
    group: "time",
    labelKey: "pageProgressions",
    needsChart: true,
    stageTestId: "studio-progressions",
    emptyTestId: "studio-progressions-empty",
  },
  synastry: {
    id: "synastry",
    group: "pair",
    labelKey: "pageSynastry",
    needsChart: true,
    stageTestId: "studio-synastry",
    emptyTestId: "studio-synastry-empty",
  },
  composite: {
    id: "composite",
    group: "pair",
    labelKey: "pageComposite",
    needsChart: true,
    stageTestId: "studio-composite",
    emptyTestId: "studio-composite-empty",
  },
  design: {
    id: "design",
    group: "systems",
    labelKey: "pageDesign",
    needsChart: true,
    stageTestId: "studio-humandesign",
    emptyTestId: "studio-humandesign-empty",
  },
  numerology: {
    id: "numerology",
    group: "systems",
    labelKey: "pageNumerology",
    needsChart: true,
    stageTestId: "studio-numerology",
    emptyTestId: "studio-numerology-empty",
  },
};

export const PAGE_LABEL: Record<StudioPage, MessageKey> = {
  natal: "pageNatal",
  transits: "pageTransits",
  timing: "pageTiming",
  synastry: "pageSynastry",
  composite: "pageComposite",
  progressions: "pageProgressions",
  numerology: "pageNumerology",
  design: "pageDesign",
};

export const GROUP_LABEL: Record<(typeof MODE_GROUPS)[number]["id"], MessageKey> = {
  chart: "groupChart",
  time: "groupTime",
  pair: "groupPair",
  systems: "groupSystems",
};
