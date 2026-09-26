import { useCallback, useEffect, useMemo } from "react";
import { buildComposite } from "@/lib/chart/composite";
import { buildSynastry, partnerBodies } from "@/lib/chart/synastry";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { useStudioStore } from "@/studio/store";

export function usePairCharts(mode: "synastry" | "composite", enabled = true) {
  const { locale } = useI18n();
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const chartA = useStudioStore((s) => s.chart);
  const partnerId = useStudioStore((s) =>
    mode === "synastry" ? s.pair.partnerId : s.pair.compositePartnerId,
  );
  const setPartner = useStudioStore((s) => s.setPartner);
  const applySaved = useStudioStore((s) => s.applySaved);
  const beginAddPartner = useStudioStore((s) => s.beginAddPartner);

  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const aId = activeId && ids.includes(activeId) ? activeId : (ids[0] ?? null);
  const others = useMemo(() => rows.filter((row) => row.id !== aId), [rows, aId]);
  const cleared = partnerId === "";
  const resolvedBId = cleared
    ? null
    : partnerId && others.some((row) => row.id === partnerId)
      ? partnerId
      : (others[0]?.id ?? null);

  useEffect(() => {
    if (!enabled) return;
    if (cleared) return;
    if (resolvedBId && resolvedBId !== partnerId) setPartner(mode, resolvedBId);
  }, [enabled, cleared, resolvedBId, partnerId, setPartner, mode]);

  const inner =
    aId && aId === activeId && chartA
      ? chartA
      : aId
        ? (rows.find((row) => row.id === aId)?.chart ?? null)
        : null;
  const chartB = rows.find((row) => row.id === resolvedBId)?.chart ?? null;

  // Built only while this pair mode is shown: a pairing made elsewhere waits
  // until the mode is opened (a few milliseconds then).
  const synastry = useMemo(
    () => (enabled && mode === "synastry" && inner && chartB ? buildSynastry(inner, chartB) : null),
    [enabled, mode, inner, chartB],
  );
  const composite = useMemo(
    () => (enabled && mode === "composite" && inner && chartB ? buildComposite(inner, chartB) : null),
    [enabled, mode, inner, chartB],
  );
  // The readings come with the reading text (its own download).
  const astro = usePack("astro", locale, enabled);
  const synastryDossier = useMemo(
    () =>
      inner && chartB && synastry && astro
        ? astro.buildSynastryDossier(inner, chartB, synastry.aspects, locale)
        : null,
    [inner, chartB, synastry, locale, astro],
  );
  const compositeDossier = useMemo(
    () => (composite && astro ? astro.buildCompositeDossier(composite, locale) : null),
    [composite, locale, astro],
  );

  // Stable between renders so the bi-wheel's memo holds across pins and hovers.
  const outerBodies = useMemo(() => (chartB ? partnerBodies(chartB) : []), [chartB]);

  const selectA = useCallback(
    (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (row) applySaved(row);
    },
    [rows, applySaved],
  );
  const selectB = useCallback((id: string) => setPartner(mode, id), [setPartner, mode]);
  const addSecond = useCallback(() => beginAddPartner(mode), [beginAddPartner, mode]);

  return useMemo(
    () => ({
      rows,
      aId,
      resolvedBId,
      others,
      inner,
      chartB,
      synastry,
      composite,
      synastryDossier,
      compositeDossier,
      outerBodies,
      selectA,
      selectB,
      addSecond,
      enabled,
    }),
    [rows, aId, resolvedBId, others, inner, chartB, synastry, composite, synastryDossier, compositeDossier, outerBodies, selectA, selectB, addSecond, enabled],
  );
}
