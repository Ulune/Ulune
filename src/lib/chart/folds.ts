/** Fold flags kept on ChartView for old `ulune.chart.view.v1` payloads. Dock tabs replaced the UI. */
export const FOLD_IDS = ["birth", "summary", "mixer", "look", "strip", "click", "compose"] as const;
export type FoldId = (typeof FOLD_IDS)[number];
export type FoldState = Record<FoldId, boolean>;

export const DEFAULT_FOLDS: FoldState = {
  birth: false,
  summary: false,
  mixer: false,
  look: false,
  strip: false,
  click: true,
  compose: false,
};
