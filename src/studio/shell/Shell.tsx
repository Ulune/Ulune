import { HomeTree } from "@/studio/home-tree";
import { ErrorSlot } from "@/studio/shell/ErrorSlot";
import { GroupBar } from "@/studio/shell/GroupBar";
import { TopLeft, TopRight } from "@/studio/shell/TopBar";
import { useStudioUrl } from "@/studio/use-studio-url";
import { Toaster } from "@/components/toaster";
import { CommandPalette } from "@/studio/shell/CommandPalette";
import { useEffect } from "react";
import { importWithRetry } from "@/lib/lazy-retry";

/**
 * The `?perf` overlay (lib/perf-overlay.ts), loaded only when asked for: the
 * address has `?perf`, or this device has `ulune.debug.perf` = "1".
 */
function PerfOverlay() {
  useEffect(() => {
    let wanted = false;
    try {
      wanted =
        new URLSearchParams(window.location.search).has("perf") ||
        window.localStorage.getItem("ulune.debug.perf") === "1";
    } catch {
      wanted = false;
    }
    if (!wanted) return;
    let stop: (() => void) | null = null;
    let gone = false;
    void importWithRetry(() => import("@/lib/perf-overlay")).then((m) => {
      if (!gone) stop = m.startPerfOverlay();
    });
    return () => {
      gone = true;
      stop?.();
    };
  }, []);
  return null;
}

/**
 * The development self-test (lib/qa-selftest.ts): the address has `?qa=<suite>`.
 * It lets a browser the test machine can only watch (Safari on a Mac) run the
 * checks by itself. Not in a build.
 */
function SelfTest() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const suite = new URLSearchParams(window.location.search).get("qa");
      if (suite) void importWithRetry(() => import("@/lib/qa-selftest")).then((m) => m.runSelfTest(suite));
    }
  }, []);
  return null;
}

/**
 * One fixed-viewport grid. Wide: [top-l | groups | top-r] over the body.
 * Compact: [top-l | top-r], body, groups as the bottom tab bar.
 */
export function Shell() {
  useStudioUrl();
  return (
    <div className="ob-app" data-testid="app-shell">
      <TopLeft />
      <GroupBar />
      <Toaster />
      <PerfOverlay />
      {import.meta.env.DEV ? <SelfTest /> : null}
      <CommandPalette />
      <TopRight />
      <div className="ob-body-slot">
        <ErrorSlot>
          <HomeTree />
        </ErrorSlot>
      </div>
    </div>
  );
}
