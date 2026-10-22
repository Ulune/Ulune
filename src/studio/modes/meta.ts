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
  /**
   * Drawn in the main chart scope only, never in a Compare pane (share and compare plan,
   * feature 2; studio/scope.tsx): the Calendar is not one person's chart, Feng Shui's Home
   * is a home on this device (comparing two homes is idea B6, later).
   */
  mainOnly?: boolean;
};

/**
 * What sets a page apart; every other page needs a chart and is found by its
 * name ("studio-transits", and "studio-transits-empty" while it has nothing to
 * draw). Written this short since the 2.0 week 4 review: the first download
 * carries this table, and each page's full entry cost it 0.02 KB gz.
 */
const UNLIKE: Partial<Record<StudioPage, Partial<ModeMeta>>> = {
  timing: { needsChart: false, noPicture: true, mainOnly: true },
  design: { stageTestId: "studio-humandesign", emptyTestId: "studio-humandesign-empty" },
  "numerology-cycles": { noPicture: true },
  "zodiac-years": { noPicture: true },
  "bazi-luck": { noPicture: true },
  "bazi-pair": { noPicture: true },
  // Feng Shui's Home is a home on this device (FS13); its Cycles' year alone needs no chart, your directions do (feature 5d).
  "fengshui-home": { needsChart: false, mainOnly: true },
  "fengshui-cycles": { needsChart: false },
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
  "numerology-pair": "pageNumerologyPair",
  zodiac: "pageZodiac",
  "zodiac-years": "pageZodiacYears",
  "zodiac-pair": "pageZodiacPair",
  bazi: "pageBazi",
  "bazi-luck": "pageBaziLuck",
  "bazi-pair": "pageBaziPair",
  fengshui: "pageFengShui",
  "fengshui-pair": "pageFengShuiPair",
  "fengshui-home": "pageFengShuiHome",
  "fengshui-cycles": "pageFengShuiCycles",
  design: "pageDesign",
  "design-pair": "pageDesignPair",
  "design-cycles": "pageDesignCycles",
};

export const MODE_META = Object.fromEntries(
  (Object.keys(PAGE_LABEL) as StudioPage[]).map((id): [StudioPage, ModeMeta] => [
    id,
    { id, labelKey: PAGE_LABEL[id], needsChart: true, stageTestId: `studio-${id}`, emptyTestId: `studio-${id}-empty`, ...UNLIKE[id] },
  ]),
) as Record<StudioPage, ModeMeta>;
