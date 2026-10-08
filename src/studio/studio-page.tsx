/*
 * The studio's page: the component of the studio's layout route
 * (src/routes/_studio.tsx), the same instance for every studio path, which the
 * router's code splitting keeps out of the first script.
 */
import { useEffect } from "react";
import { Shell } from "@/studio/shell/Shell";
import { useLibraryBoot } from "@/studio/library-boot";
import { StudioReturnTracker, useStudioReturn } from "@/studio/return-memory";

export function StudioPage() {
  // Back to the same place after a page outside the studio (R6).
  useStudioReturn();
  useLibraryBoot();
  // The charts, summed up for the encyclopedia's "In your chart" (part 18), for this tab.
  // Its own download, when the reader leaves the studio for another page (the
  // encyclopedia's subscribe and are drawn again when it lands): the studio's
  // own load stays as it was.
  useEffect(
    () => () => {
      void import("@/studio/your-chart-publish").then((m) => m.watchYourCharts()).catch(() => {});
    },
    [],
  );
  return (
    <>
      <StudioReturnTracker />
      <Shell />
    </>
  );
}
