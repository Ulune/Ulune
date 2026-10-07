import { useId } from "react";
import {
  LAYER_LANGUAGE_LABEL,
  layerAvailable,
  layerGroups,
  type CalendarLayerId,
  type ShownLayers,
} from "@/lib/chart/calendar-layers";
import { useI18n } from "@/lib/i18n/locale";
import { calWord } from "@/lib/i18n/calendar-layer-words";
import { cn } from "@/lib/utils";

/**
 * The Calendar's layers, in its View menu (page reorganisation plan, R5): a
 * switch per layer under its language's name, in the registry's order
 * (lib/chart/calendar-layers.ts), so a language added there gets its group
 * here. A layer read from a chart, with no chart cast, stays in the list,
 * unavailable, saying why, with the way to cast one under the list.
 */
export function CalendarLayers({
  on,
  hasChart,
  onLayer,
  onCast,
}: {
  /** Each switch's position: the reader's choice, else the layer's default. */
  on: ShownLayers;
  hasChart: boolean;
  onLayer: (id: CalendarLayerId, on: boolean) => void;
  /** Opens the birth form: offered while no chart is cast. */
  onCast?: () => void;
}) {
  const { locale } = useI18n();
  const base = useId();
  return (
    <div className="ulune-cal-layers" data-testid="calendar-layers">
      <p className="ulune-cal-view-h">{calWord(locale, "calLayers")}</p>
      {layerGroups().map((group) => {
        // Ids apart for a language and a layer of the same name (numerology is both).
        const langId = `${base}-lang-${group.language}`;
        return (
          <div
            key={group.language}
            role="group"
            aria-labelledby={langId}
            className="ulune-cal-layer-group"
            data-testid={`calendar-layers-${group.language}`}
          >
            <p id={langId} className="ulune-cal-layer-lang">
              {calWord(locale, LAYER_LANGUAGE_LABEL[group.language])}
            </p>
            {group.layers.map((layer) => {
              const ok = layerAvailable(layer, hasChart);
              const checked = ok && on[layer.id];
              const nameId = `${base}-layer-${layer.id}`;
              const hintId = `${nameId}-hint`;
              return (
                <button
                  key={layer.id}
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  // Unavailable, not disabled: it stays in the Tab order, so its reason is heard.
                  aria-disabled={ok ? undefined : true}
                  aria-labelledby={nameId}
                  aria-describedby={hintId}
                  data-testid={`calendar-layer-${layer.id}`}
                  data-available={ok ? "1" : "0"}
                  className={cn("ob-menu-item ulune-cal-layer", checked && "is-on", !ok && "is-unavailable")}
                  onClick={() => {
                    if (ok) onLayer(layer.id, !on[layer.id]);
                  }}
                >
                  <span className="ulune-cal-layer-words">
                    <span id={nameId} className="ulune-cal-layer-name">
                      {calWord(locale, layer.label)}
                    </span>
                    <span id={hintId} className="ulune-cal-layer-hint">
                      {calWord(locale, ok ? layer.hint : "calLayerNeedsChart")}
                    </span>
                  </span>
                  <span className="ulune-cal-layer-track" aria-hidden>
                    <span className="ulune-cal-layer-thumb" />
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
      {!hasChart && onCast ? (
        <button type="button" className="ulune-cal-invite-link" data-testid="calendar-layers-cast" onClick={onCast}>
          {calWord(locale, "calInvite")}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The Calendar without a chart (R5): one quiet line under the bar inviting
 * the reader to cast one, which brings their transits into the days.
 */
export function CalendarInvite({ onCast }: { onCast: () => void }) {
  const { locale } = useI18n();
  return (
    <p className="ulune-cal-invite" data-testid="calendar-invite">
      <button type="button" className="ulune-cal-invite-link" data-testid="calendar-invite-cast" onClick={onCast}>
        {calWord(locale, "calInvite")}
      </button>
    </p>
  );
}
