import { useCallback, useEffect, useMemo, useState } from "react";
import { buildComposite } from "@/lib/chart/composite";
import { davisonCastInput, davisonMoment } from "@/lib/chart/davison";
import { castChart } from "@/lib/chart/functions";
import type { NatalChart } from "@/lib/chart/types";
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
  const kind = useStudioStore((s) => s.pair.compositeKind);
  const midpoints = useMemo(
    () => (enabled && mode === "composite" && kind === "composite" && inner && chartB ? buildComposite(inner, chartB) : null),
    [enabled, mode, kind, inner, chartB],
  );
  // The Davison chart: cast like a birth (the moment and place halfway), once per pair.
  const [davison, setDavison] = useState<{ key: string; chart: NatalChart } | null>(null);
  const [davisonError, setDavisonError] = useState<string | null>(null);
  const davisonKey = inner && chartB ? `${inner.meta.utc}|${chartB.meta.utc}|${inner.meta.latitude},${inner.meta.longitude}|${chartB.meta.latitude},${chartB.meta.longitude}|${inner.meta.houseSystem}` : "";
  useEffect(() => {
    if (!enabled || mode !== "composite" || kind !== "davison" || !inner || !chartB) return;
    if (davison?.key === davisonKey) return;
    const m = davisonMoment(inner, chartB);
    if (!m) return;
    let gone = false;
    setDavisonError(null);
    castChart({ data: { ...davisonCastInput(m), houseSystem: inner.meta.houseSystem, timeUnknown: false, locale } })
      .then((res) => {
        if (gone) return;
        const chart: NatalChart = {
          ...res.chart,
          meta: { ...res.chart.meta, name: `${inner.meta.name || "A"} & ${chartB.meta.name || "B"}`, placeLabel: "Davison", relationship: "davison", timeUnknown: m.timeUnknown || undefined },
        };
        setDavison({ key: davisonKey, chart });
      })
      .catch((err: unknown) => {
        if (!gone) setDavisonError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      gone = true;
    };
  }, [enabled, mode, kind, inner, chartB, davison, davisonKey, locale]);
  const composite = kind === "davison" ? (davison?.key === davisonKey ? davison.chart : null) : midpoints;
  const davisonPending = kind === "davison" && Boolean(inner && chartB) && !composite && !davisonError;
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
  /** A and B change places (review 3 Oct, P4): B becomes the chart shown, A the partner. */
  const swap = useCallback(() => {
    if (!aId || !resolvedBId) return;
    const row = rows.find((r) => r.id === resolvedBId);
    if (!row) return;
    const oldA = aId;
    applySaved(row);
    setPartner(mode, oldA);
  }, [aId, resolvedBId, rows, applySaved, setPartner, mode]);

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
      swap,
      enabled,
      kind,
      davisonPending,
      davisonError,
    }),
    [rows, aId, resolvedBId, others, inner, chartB, synastry, composite, synastryDossier, compositeDossier, outerBodies, selectA, selectB, addSecond, swap, enabled, kind, davisonPending, davisonError],
  );
}
