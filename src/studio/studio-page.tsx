/*
 * The studio's page: the component of the studio's layout route
 * (src/routes/_studio.tsx), the same instance for every studio path, which the
 * router's code splitting keeps out of the first script.
 */
import { useEffect } from "react";
import { Shell } from "@/studio/shell/Shell";
import { useLibraryBoot } from "@/studio/library-boot";
import { StudioReturnTracker, useStudioReturn } from "@/studio/return-memory";
import { whenIdle } from "@/lib/lazy-component";

export function StudioPage() {
  // Back to the same place after a page outside the studio (R6).
  useStudioReturn();
  useLibraryBoot();
  // The charts, summed up for the encyclopedia's "In your chart" (part 18), for this tab.
  // Its own download, once the page is idle: the studio's first script stays as it was.
  useEffect(
    () =>
      whenIdle(() => {
        void import("@/studio/your-chart-publish").then((m) => m.watchYourCharts()).catch(() => {});
      }),
    [],
  );
  return (
    <>
      <StudioReturnTracker />
      <Shell />
    </>
  );
}
