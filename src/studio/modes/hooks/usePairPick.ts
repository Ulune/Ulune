import { useCallback, useEffect, useMemo } from "react";
import type { NatalChart } from "@/lib/chart/types";
import type { PairPick } from "@/studio/modes/pair-selects";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";

/*
 * The two people of a Chinese Pair page (Chinese astrology's, part 11;
 * BaZi's, part 19): A the chart shown, B synastry's partner, the same second
 * person for every Pair page; adding a second person returns to the page
 * that asked.
 */
/** The two people, as synastry chooses them (A the chart shown, B its partner). */
export function usePairPick(enabled: boolean, page: StudioPage): { pick: PairPick; inner: NatalChart | null; chartB: NatalChart | null } {
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const chartA = useStudioStore((s) => s.chart);
  const partnerId = useStudioStore((s) => s.pair.partnerId);
  const setPartner = useStudioStore((s) => s.setPartner);
  const applySaved = useStudioStore((s) => s.applySaved);
  const beginAddPartner = useStudioStore((s) => s.beginAddPartner);
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const aId = activeId && ids.includes(activeId) ? activeId : (ids[0] ?? null);
  const others = useMemo(() => rows.filter((row) => row.id !== aId), [rows, aId]);
  const cleared = partnerId === "";
  const resolvedBId = cleared ? null : partnerId && others.some((row) => row.id === partnerId) ? partnerId : (others[0]?.id ?? null);
  useEffect(() => {
    if (!enabled || cleared) return;
    if (resolvedBId && resolvedBId !== partnerId) setPartner("synastry", resolvedBId);
  }, [enabled, cleared, resolvedBId, partnerId, setPartner]);
  const inner = aId && aId === activeId && chartA ? chartA : aId ? (rows.find((row) => row.id === aId)?.chart ?? null) : null;
  const chartB = rows.find((row) => row.id === resolvedBId)?.chart ?? null;
  const selectA = useCallback(
    (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (row) applySaved(row);
    },
    [rows, applySaved],
  );
  const selectB = useCallback((id: string) => setPartner("synastry", id), [setPartner]);
  const addSecond = useCallback(() => beginAddPartner(page), [beginAddPartner, page]);
  const swap = useCallback(() => {
    if (!aId || !resolvedBId) return;
    const row = rows.find((r) => r.id === resolvedBId);
    if (!row) return;
    const oldA = aId;
    applySaved(row);
    setPartner("synastry", oldA);
  }, [aId, resolvedBId, rows, applySaved, setPartner]);
  const pick = useMemo(() => ({ rows, aId, resolvedBId, others, selectA, selectB, addSecond, swap }), [rows, aId, resolvedBId, others, selectA, selectB, addSecond, swap]);
  return { pick, inner, chartB };
}

