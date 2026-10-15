import type { MessageKey } from "@/lib/i18n/messages";
import type { StudioPage } from "@/studio/url";

/**
 * What the shell needs to know about every mode before its code has loaded:
 * names, test ids. The modes themselves (figures, panels, tables and
 * their data) load when they are first opened, or at idle beforehand.
 */
export type ModeMeta = {
  id: StudioPage;
  labelKey: MessageKey;
  /**
   * The page waits for a birth chart (the form stands in its place until one is cast). The Calendar
   * (reorganisation plan, R5) and Feng Shui's Home (languages plan, part 27, review fix FS13) don't:
   * the shell shows them as they are, with the form only when asked for (workspace.tsx).
   */
  needsChart: boolean;
  stageTestId: string;
  emptyTestId?: string;
  /** Its figure is not one drawing (the Calendar's days, numerology's cycles): no picture to export. */
  noPicture?: boolean;
};

export const MODE_META: Record<StudioPage, ModeMeta> = {
  natal: {
    id: "natal",
    labelKey: "pageNatal",
    needsChart: true,
    stageTestId: "studio-natal",
  },
  transits: {
    id: "transits",
    labelKey: "pageTransits",
    needsChart: true,
    stageTestId: "studio-transits",
    emptyTestId: "studio-transits-empty",
  },
  timing: {
    id: "timing",
    labelKey: "pageTiming",
    needsChart: false,
    stageTestId: "studio-timing",
    emptyTestId: "studio-timing-empty",
    noPicture: true,
  },
  progressions: {
    id: "progressions",
    labelKey: "pageProgressions",
    needsChart: true,
    stageTestId: "studio-progressions",
    emptyTestId: "studio-progressions-empty",
  },
  synastry: {
    id: "synastry",
    labelKey: "pageSynastry",
    needsChart: true,
    stageTestId: "studio-synastry",
    emptyTestId: "studio-synastry-empty",
  },
  composite: {
    id: "composite",
    labelKey: "pageComposite",
    needsChart: true,
    stageTestId: "studio-composite",
    emptyTestId: "studio-composite-empty",
  },
  design: {
    id: "design",
    labelKey: "pageDesign",
    needsChart: true,
    stageTestId: "studio-humandesign",
    emptyTestId: "studio-humandesign-empty",
  },
  numerology: {
    id: "numerology",
    labelKey: "pageNumerology",
    needsChart: true,
    stageTestId: "studio-numerology",
    emptyTestId: "studio-numerology-empty",
  },
  "numerology-cycles": {
    id: "numerology-cycles",
    labelKey: "pageNumerologyCycles",
    needsChart: true,
    stageTestId: "studio-numerology-cycles",
    emptyTestId: "studio-numerology-cycles-empty",
    noPicture: true,
  },
  zodiac: {
    id: "zodiac",
    labelKey: "pageZodiac",
    needsChart: true,
    stageTestId: "studio-zodiac",
    emptyTestId: "studio-zodiac-empty",
  },
  "zodiac-years": {
    id: "zodiac-years",
    labelKey: "pageZodiacYears",
    needsChart: true,
    stageTestId: "studio-zodiac-years",
    emptyTestId: "studio-zodiac-years-empty",
    noPicture: true,
  },
  "zodiac-pair": {
    id: "zodiac-pair",
    labelKey: "pageZodiacPair",
    needsChart: true,
    stageTestId: "studio-zodiac-pair",
    emptyTestId: "studio-zodiac-pair-empty",
  },
  bazi: {
    id: "bazi",
    labelKey: "pageBazi",
    needsChart: true,
    stageTestId: "studio-bazi",
    emptyTestId: "studio-bazi-empty",
  },
  "bazi-luck": {
    id: "bazi-luck",
    labelKey: "pageBaziLuck",
    needsChart: true,
    stageTestId: "studio-bazi-luck",
    emptyTestId: "studio-bazi-luck-empty",
    noPicture: true,
  },
  "bazi-pair": {
    id: "bazi-pair",
    labelKey: "pageBaziPair",
    needsChart: true,
    stageTestId: "studio-bazi-pair",
    emptyTestId: "studio-bazi-pair-empty",
    noPicture: true,
  },
  fengshui: {
    id: "fengshui",
    labelKey: "pageFengShui",
    needsChart: true,
    stageTestId: "studio-fengshui",
    emptyTestId: "studio-fengshui-empty",
  },
  "fengshui-pair": {
    id: "fengshui-pair",
    labelKey: "pageFengShuiPair",
    needsChart: true,
    stageTestId: "studio-fengshui-pair",
    emptyTestId: "studio-fengshui-pair-empty",
  },
  "fengshui-home": {
    id: "fengshui-home",
    labelKey: "pageFengShuiHome",
    needsChart: false,
    stageTestId: "studio-fengshui-home",
    emptyTestId: "studio-fengshui-home-empty",
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
  "numerology-cycles": "pageNumerologyCycles",
  zodiac: "pageZodiac",
  "zodiac-years": "pageZodiacYears",
  "zodiac-pair": "pageZodiacPair",
  bazi: "pageBazi",
  "bazi-luck": "pageBaziLuck",
  "bazi-pair": "pageBaziPair",
  fengshui: "pageFengShui",
  "fengshui-pair": "pageFengShuiPair",
  "fengshui-home": "pageFengShuiHome",
  design: "pageDesign",
};
