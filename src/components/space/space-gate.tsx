import { Suspense, useEffect } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, whenIdle } from "@/lib/lazy-component";
import { readSpaceFlag } from "@/lib/space/flag";
import { ERASED_NOTE, dropLegacySpace, eraseOldSignIn, hasLegacyData } from "@/lib/space/legacy";
import { toast } from "@/lib/toast";
import { loadSpaceRuntime } from "@/lib/space/load";
import { openSpaceSheet, useSpace } from "@/lib/space/state";
import { spaceSupported } from "@/lib/space/store";

const SpaceSheet = lazyNamed(() => import("./space-sheet"), "SpaceSheet");

/**
 * Mounted once on every page: finds this browser's private space (only when
 * the flag says one exists, so a first visit loads nothing of it), asks a
 * returning reader to unlock it, offers once per visit to deal with charts
 * kept in the clear before private spaces, and shows the sheet when asked.
 */
export function SpaceGate() {
  const { t } = useI18n();
  const sheet = useSpace((s) => s.sheet);
  const sheetFor = useSpace((s) => s.sheetFor);

  // Settings → Your data → Erase everything reloads the page: this says it is done.
  useEffect(() => {
    eraseOldSignIn();
    const stopLegacy = whenIdle(dropLegacySpace, 6000);
    let erased = false;
    try {
      erased = window.sessionStorage.getItem(ERASED_NOTE) === "1";
      window.sessionStorage.removeItem(ERASED_NOTE);
    } catch {
      /* storage off */
    }
    if (!erased) return stopLegacy;
    const timer = window.setTimeout(() => toast(t("dataErased"), "ok", 6000), 400);
    return () => {
      stopLegacy();
      window.clearTimeout(timer);
    };
  }, [t]);

  useEffect(() => {
    let gone = false;
    const afterBoot = () => {
      if (gone || useSpace.getState().sheet) return;
      const { status } = useSpace.getState();
      if (status === "locked") openSpaceSheet("unlock");
      else if (status === "none" && window.location.pathname === "/" && hasLegacyData()) openSpaceSheet("legacy");
    };
    const boot = () =>
      loadSpaceRuntime()
        .then((m) => m.bootSpace())
        .then(afterBoot, () => useSpace.setState({ status: "unavailable" }));
    if (!spaceSupported()) {
      useSpace.setState({ status: "unavailable" });
      return;
    }
    if (readSpaceFlag()) {
      void boot();
      return () => {
        gone = true;
      };
    }
    useSpace.setState({ status: "none" });
    afterBoot();
    // A space whose flag went missing (site data partly cleared) is looked for once the page is idle.
    const stop = whenIdle(() => {
      const dbs = (indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> }).databases;
      if (!dbs) return;
      void dbs
        .call(indexedDB)
        .then((list) => {
          if (!gone && list.some((db) => db.name === "ulune-space")) void boot();
        })
        .catch(() => {});
    }, 4000);
    return () => {
      gone = true;
      stop();
    };
  }, []);

  if (!sheet) return null;
  return (
    <Suspense fallback={null}>
      {/* Another sheet (or the same for another passkey) starts from its first step. */}
      <SpaceSheet key={`${sheet}:${sheetFor ?? ""}`} />
    </Suspense>
  );
}
