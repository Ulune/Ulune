/**
 * The count strip under the wheel: how many aspects of each kind the wheel
 * draws, each chip in its family's colour and line style. Pointing at a chip
 * lights that family on the wheel (the others step back); a click hides or
 * shows it (the same aspect filter as the Aspects controls). With a body,
 * sign or house pinned, the chips count its aspects instead.
 *
 * The wheel's zoom port places it: in the free margin beside the wheel when
 * there is room, else in the stage footer (wheel-zoom.tsx).
 */
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ASPECT_COLOR } from "@/lib/chart/constants";
import { resolveWheelFocus, type WheelFocusCtx } from "@/lib/chart/wheel-focus";
import { ASPECT_PATTERN, lineInk } from "@/lib/chart/wheel-style";
import {
  ASPECT_DENSITY_ORDER,
  applyAspectDensity,
  currentAspectDensity,
  subscribeChartView,
  toggleAspectType,
  type AspectDensity,
} from "@/lib/chart/use-chart-view";
import type { AspectId, BodyId, SignId } from "@/lib/chart/types";
import { previewProps } from "@/lib/depth/preview-bus";
import { aspectName, bodyLabel, signName } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import type { SelectionStore } from "@/lib/chart/selection-store";
import { AspectGlyph, PlanetGlyph, SignGlyph } from "./glyphs";

/** Majors first, then the minors, as astrologers list them. */
const ORDER: AspectId[] = [
  "conjunction",
  "opposition",
  "square",
  "trine",
  "sextile",
  "quincunx",
  "semisextile",
  "semisquare",
  "quintile",
];

/** A few pixels of the family's line: solid, dashed, dotted, or a conjunction's yoke. */
export function AspectSwatch({ type }: { type: AspectId }) {
  const pattern = ASPECT_PATTERN[type] ?? "solid";
  return (
    <svg className="ob-aspect-swatch" width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
      {pattern === "arc" ? (
        <path d="M 3.5 1.5 L 3.5 5 Q 3.5 8.5 7 8.5 L 13 8.5 Q 16.5 8.5 16.5 5 L 16.5 1.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <line
          x1={2}
          y1={5}
          x2={18}
          y2={5}
          stroke="currentColor"
          strokeWidth={pattern === "dots" ? 2 : type === "opposition" ? 2.4 : 1.8}
          strokeLinecap="round"
          strokeDasharray={pattern === "solid" ? undefined : pattern === "dash" ? "5 3" : pattern === "dashdot" ? "5 2.4 0.01 2.4" : "0.01 3"}
        />
      )}
    </svg>
  );
}

type Row = { id: string; type: AspectId };

const DENSITY_LABEL = { simple: "densitySimple", standard: "densityStandard", detailed: "densityDetailed" } as const;

/** One, two or three lines lit: how much of the aspect web shows. */
function DensityIcon({ level }: { level: AspectDensity | null }) {
  const n = level ? ASPECT_DENSITY_ORDER.indexOf(level) + 1 : 0;
  return (
    <svg className="size-4" viewBox="0 0 16 16" aria-hidden="true">
      {[0, 1, 2].map((k) => (
        <line key={k} x1={3} x2={13} y1={12 - k * 4} y2={12 - k * 4} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" opacity={k < n ? 1 : 0.3} />
      ))}
    </svg>
  );
}

/** The density switch: simple (four majors, tight), standard, detailed (every aspect). */
function DensityButton() {
  const { t } = useI18n();
  const level = useSyncExternalStore(subscribeChartView, currentAspectDensity, () => "standard" as AspectDensity);
  const next: AspectDensity = level ? ASPECT_DENSITY_ORDER[(ASPECT_DENSITY_ORDER.indexOf(level) + 1) % 3] : "standard";
  const label = t("densityLabel", { level: t(level ? DENSITY_LABEL[level] : "densityCustom"), next: t(DENSITY_LABEL[next]) });
  return (
    <button
      type="button"
      className="ob-aspect-chip ob-aspect-density"
      data-testid="aspect-density"
      data-density={level ?? "custom"}
      aria-label={label}
      title={label}
      onClick={() => applyAspectDensity(next)}
    >
      <DensityIcon level={level} />
    </button>
  );
}

const SCOPED = new Set(["planet", "angle", "transit", "partner", "progressed", "sign", "house", "decan"]);

export function AspectStrip({
  rows,
  hidden,
  ctx,
  selection,
}: {
  /** The aspects the wheel draws. */
  rows: Row[];
  /** Types the filter hides that this chart has, with how many. */
  hidden: Map<AspectId, number>;
  ctx: WheelFocusCtx;
  selection: SelectionStore;
}) {
  const { t, locale } = useI18n();
  const selected = useSyncExternalStore(selection.subscribe, selection.get, () => null);
  const scope = useMemo(() => {
    if (!selected) return null;
    const kind = selected.slice(0, selected.indexOf(":"));
    if (!SCOPED.has(kind)) return null;
    const focus = resolveWheelFocus(selected, ctx);
    return focus.id ? { id: selected, kind, key: selected.slice(kind.length + 1), aspects: focus.aspects } : null;
  }, [selected, ctx]);
  const total = new Map<AspectId, number>();
  const inScope = new Map<AspectId, number>();
  for (const r of rows) {
    total.set(r.type, (total.get(r.type) ?? 0) + 1);
    if (scope?.aspects.has(r.id)) inScope.set(r.type, (inScope.get(r.type) ?? 0) + 1);
  }
  const types = ORDER.filter((id) => (total.get(id) ?? 0) > 0 || (hidden.get(id) ?? 0) > 0);
  if (!types.length) return null;
  let label: ReactNode = null;
  let scopeName = "";
  if (scope) {
    if (scope.kind === "sign") {
      label = <SignGlyph id={scope.key as SignId} size={13} />;
      scopeName = signName(scope.key as SignId, locale);
    } else if (scope.kind === "house") {
      label = <span className="ob-aspect-scope-num">{scope.key}</span>;
      scopeName = t("aspectStripHouse", { n: scope.key });
    } else if (scope.kind !== "decan") {
      label = <PlanetGlyph id={scope.key as BodyId} size={13} />;
      scopeName = bodyLabel(scope.key as BodyId, locale);
    }
  }
  return (
    <div
      className="ob-aspect-strip"
      role="toolbar"
      aria-label={scope && scopeName ? t("aspectStripOf", { name: scopeName }) : t("aspectStripAria")}
      data-testid="aspect-strip"
      data-scope={scope ? scope.id : undefined}
      // A click here keeps the wheel's pin (it is part of the chart's controls).
      data-chart-pick
    >
      {label ? (
        <span className="ob-aspect-scope" title={scopeName} aria-hidden="true">
          {label}
        </span>
      ) : null}
      {types.map((type) => {
        const n = total.get(type) ?? 0;
        const on = n > 0;
        const shown = scope ? (inScope.get(type) ?? 0) : on ? n : (hidden.get(type) ?? 0);
        const name = aspectName(type, locale);
        return (
          <button
            key={type}
            type="button"
            className="ob-aspect-chip"
            data-type={type}
            data-on={on ? "1" : "0"}
            data-zero={scope && !shown ? "1" : undefined}
            aria-pressed={on}
            title={on ? t("aspectStripHide", { name, n }) : t("aspectStripShow", { name, n: hidden.get(type) ?? 0 })}
            style={{ color: lineInk(ASPECT_COLOR[type]) }}
            onClick={() => toggleAspectType(type)}
            {...previewProps(on ? `atype:${type}` : null)}
          >
            <AspectSwatch type={type} />
            <AspectGlyph id={type} size={13} className="ob-aspect-chip-glyph" />
            <span className="ob-aspect-chip-n">{shown}</span>
          </button>
        );
      })}
      <DensityButton />
    </div>
  );
}
