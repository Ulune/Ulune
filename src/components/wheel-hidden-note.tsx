/**
 * What you picked, when the wheel's filters hide it (review 3 Oct, C1): an
 * aspect of a type that is off, wider than its orb or to a kind of point
 * that is off, or a body that is not on the wheel. Picking it from the panel
 * or the table used to dim the wheel and draw nothing. A short note says why,
 * with the one change that shows it.
 */
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { ASPECT_ORBS } from "@/lib/chart/constants";
import { blockedTarget, cloneAspectFilter, orbCap, type AspectFilter } from "@/lib/chart/aspect-filter";
import type { SelectionStore } from "@/lib/chart/selection-store";
import type { AspectLink, BodyId, NatalChart } from "@/lib/chart/types";
import { useChartView } from "@/lib/chart/use-chart-view";
import { aspectName, bodyLabel, formatOrb } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { usePortPlace } from "@/components/wheel-hint";

type Fix = { text: string; action: string; apply: () => void };

export function WheelHiddenNote({
  selection,
  chart,
  visible,
  filter,
}: {
  selection: SelectionStore;
  chart: NatalChart;
  visible: ReadonlySet<string>;
  filter: AspectFilter;
}) {
  const { locale, t } = useI18n();
  const pinned = useSyncExternalStore(selection.subscribe, selection.get, () => null);
  const view = useChartView();
  const fix = hiddenFix(pinned, chart, visible, filter, {
    body: (id) => bodyLabel(id, locale),
    aspect: (type) => aspectName(type, locale),
    orb: (n) => `${formatOrb(n, locale)}°`,
    t,
    addBody: (id) => {
      const next = new Set(visible as ReadonlySet<BodyId>);
      next.add(id);
      view.setVisible(next);
    },
    setFilter: (next) => view.setAspectFilter(next),
  });
  const { anchor, ref, port, place } = usePortPlace(Boolean(fix), pinned);
  if (!fix) return <span ref={anchor} hidden />;
  const note = (
    <div ref={ref} className="ulune-wheel-hint ulune-wheel-note" role="status" data-testid="wheel-hidden-note" style={place ?? { visibility: "hidden" }}>
      <span>{fix.text}</span>
      <button type="button" className="ulune-wheel-note-fix" data-testid="wheel-hidden-fix" onClick={fix.apply}>
        {fix.action}
      </button>
    </div>
  );
  return (
    <>
      <span ref={anchor} hidden />
      {port ? createPortal(note, port) : null}
    </>
  );
}

type Words = {
  body: (id: string) => string;
  aspect: (type: AspectLink["type"]) => string;
  orb: (n: number) => string;
  t: ReturnType<typeof useI18n>["t"];
  addBody: (id: BodyId) => void;
  setFilter: (next: AspectFilter) => void;
};

/** Why the pinned thing is not drawn, and the change that draws it (null: it is drawn). */
export function hiddenFix(
  pinned: string | null,
  chart: NatalChart,
  visible: ReadonlySet<string>,
  filter: AspectFilter,
  w: Words,
): Fix | null {
  if (!pinned) return null;
  const body = /^(?:planet|angle):(.+)$/.exec(pinned)?.[1] as BodyId | undefined;
  if (body) {
    const known = chart.planets.some((p) => p.id === body) || Object.values(chart.angles).some((a) => a.id === body);
    if (!known || visible.has(body)) return null;
    return { text: w.t("hiddenBody", { name: w.body(body) }), action: w.t("hiddenAdd"), apply: () => w.addBody(body) };
  }
  const id = /^aspect:(.+)$/.exec(pinned)?.[1];
  if (!id) return null;
  const a = chart.aspects.find((x) => x.id === id);
  if (!a) return null;
  for (const end of [a.a, a.b]) {
    if (!visible.has(end)) return { text: w.t("hiddenBody", { name: w.body(end) }), action: w.t("hiddenAdd"), apply: () => w.addBody(end) };
  }
  const name = w.aspect(a.type);
  if (!filter.types.has(a.type)) {
    return {
      text: w.t("hiddenAspectType", { name }),
      action: w.t("hiddenShow"),
      apply: () => {
        const next = cloneAspectFilter(filter);
        next.types.add(a.type);
        w.setFilter(next);
      },
    };
  }
  const cap = orbCap(filter, a.type, a.a, a.b);
  if (a.orb > cap) {
    const wider = Math.min(ASPECT_ORBS[a.type], Math.ceil(a.orb * 2) / 2);
    return {
      text: w.t("hiddenOrb", { name, orb: w.orb(a.orb), cap: w.orb(cap) }),
      action: w.t("hiddenWiden", { orb: w.orb(wider) }),
      apply: () => {
        const next = cloneAspectFilter(filter);
        next.orbs = { ...next.orbs, [a.type]: Math.max(wider, next.orbs[a.type] ?? 0) };
        w.setFilter(next);
      },
    };
  }
  const key = blockedTarget(a, filter);
  if (key) {
    return {
      text: w.t("hiddenTargets"),
      action: w.t("hiddenShow"),
      apply: () => {
        const next = cloneAspectFilter(filter);
        next[key] = true;
        w.setFilter(next);
      },
    };
  }
  return null;
}
