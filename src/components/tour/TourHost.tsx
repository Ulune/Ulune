import { Suspense, useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { sampleBirth } from "@/lib/chart/sample";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed } from "@/lib/lazy-component";
import { startTour, useTour } from "@/lib/tour/state";
import { useStudioStore } from "@/studio/store";

const Tour = lazyNamed(() => import("./Tour"), "Tour");

/**
 * Where the tour appears once someone starts it (its code downloads then).
 * The guide's page sends readers back to the studio with `{ tour: true }` or
 * `{ sample: true }` in the history's state, never in the address, so a
 * shared link can neither open the tour nor cast a chart.
 */
export function TourHost() {
  const { t } = useI18n();
  const active = useTour((s) => s.active);
  const asked = useRouterState({
    select: (s) => (s.location.state?.tour ? "tour" : s.location.state?.sample ? "sample" : null),
  });
  useEffect(() => {
    if (!asked) return;
    const state = { ...(window.history.state ?? {}) } as Record<string, unknown>;
    delete state.tour;
    delete state.sample;
    window.history.replaceState(state, "");
    if (asked === "tour") startTour();
    else if (!useStudioStore.getState().chart) void useStudioStore.getState().cast(sampleBirth(t("sampleName")));
    // Once per arrival; `t` changes with the language only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked]);
  if (!active) return null;
  return (
    <Suspense fallback={null}>
      <Tour />
    </Suspense>
  );
}
