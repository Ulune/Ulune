import type { ComponentType } from "react";
import type { ElementReading } from "@/lib/chart/types";
import type { AppLocale } from "@/lib/i18n/messages";
import type { ModeMeta } from "@/studio/modes/meta";

export type { ModeGroupId } from "@/studio/url";

/**
 * What a mode's own hooks hand the shell: its data (read by its figure,
 * panels and table through useModeData) and the reading of the selected item.
 * Keep it stable between renders (useMemo): every change re-renders what reads it.
 */
export type ModeRuntime<D = unknown> = { data: D; reading: ElementReading | null };

export type ModeDef = ModeMeta & {
  Controls?: ComponentType;
  Figure: ComponentType;
  Caption?: ComponentType;
  HelloEmpty: ComponentType;
  Data: ComponentType;
  /** What the empty studio says on this mode before any chart is cast. */
  emptyText?: (locale: AppLocale) => string;
  /** Fetch the table view's code ahead (the view switch is pointed at or focused). */
  preloadData?: () => void;
  /**
   * The mode's hooks (fetching its sky, building its readings). Mounted once
   * the mode has loaded and kept while the studio is open, so its state
   * survives switching to another mode and back, as before; each hook stays
   * idle while its mode is not the one shown.
   */
  useRuntime: () => ModeRuntime;
};
