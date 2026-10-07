import { useEffect, useLayoutEffect } from "react";
import { loadLocalLibrary, readLegacyLibrary, saveLocalLibrary } from "@/lib/chart/library";
import { readSpaceFlag } from "@/lib/space/flag";
import { hasLegacyData } from "@/lib/space/legacy";
import { useSpace } from "@/lib/space/state";
import { finishLibraryBoot, joinSpace } from "@/studio/space-sync";
import { hydratePair, studioFlags, useStudioStore } from "@/studio/store";
import { loadDockOpen } from "@/studio/dock/dock-layout";

/**
 * Read once per page load: the studio coming back from a page outside it (an
 * encyclopedia page, Settings) finds its store as it left it (R6), rather than
 * the chart applied again (its form reset, its pin and its reading lost).
 */
let booted = false;

/**
 * The studio's library as the page opens, before the first paint so a
 * returning reader does not see the empty form first: what this tab already
 * showed, or else the charts kept in the clear before private spaces (read,
 * not written). A private space adds its charts when it opens
 * (studio/space-sync.ts); one that stays unlocked on this device opens by
 * itself in a moment, and the page waits for it.
 */
export function useLibraryBoot() {
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);

  useLayoutEffect(() => {
    if (booted) return;
    booted = true;
    // The panel as the reader left it, once the server's page is hydrated (store.ts starts it open, as the server draws it).
    const open = loadDockOpen();
    if (useStudioStore.getState().dockOpen !== open) useStudioStore.setState({ dockOpen: open });
    let restored = loadLocalLibrary();
    if (!restored.rows.length && hasLegacyData()) {
      const legacy = readLegacyLibrary();
      restored = legacy;
      hydratePair(legacy);
    }
    useStudioStore.getState().restoreLibrary(restored.rows, restored.activeId);
    joinSpace();
    const waiting = readSpaceFlag() === "stay" && useSpace.getState().status === "checking" && !restored.rows.length;
    if (!waiting) finishLibraryBoot();
  }, []);

  // A space that did not open by itself (locked, or its key no longer here): the page stops waiting.
  useEffect(
    () =>
      useSpace.subscribe((s) => {
        if (s.status !== "checking" && s.status !== "open") finishLibraryBoot();
      }),
    [],
  );

  useEffect(() => {
    if (!studioFlags().hydrated || !rows.length) return;
    saveLocalLibrary(rows, activeId);
  }, [rows, activeId]);
}
