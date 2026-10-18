import { HomeTree } from "@/studio/home-tree";
import { ErrorSlot } from "@/studio/shell/ErrorSlot";
import { SectionBar } from "@/studio/shell/SectionBar";
import { TopLeft, TopRight } from "@/studio/shell/TopBar";
import { useStudioUrl } from "@/studio/use-studio-url";
import { Toaster } from "@/components/toaster";
import { CommandPalette } from "@/studio/shell/CommandPalette";
import { ExtrasHost } from "@/studio/show/host";
import { useEffect } from "react";
import { importWithRetry } from "@/lib/lazy-retry";
import { useI18n } from "@/lib/i18n/locale";
import { useStudioStore } from "@/studio/store";
import { MODE_META } from "@/studio/modes/meta";
import { TourHost } from "@/components/tour/TourHost";

/**
 * The first stop for the keyboard, in words that fit the page: straight to
 * the form's first field when the form is on screen, else to the calendar or
 * the chart. The Calendar shows the sky without a chart, and Feng Shui's
 * Home a home (workspace.tsx: the form comes there only when asked for).
 */
function SkipLink() {
  const { t } = useI18n();
  const to = useStudioStore((s) =>
    s.pair.addingPartnerFor || s.creating || (!s.chart && MODE_META[s.page].needsChart)
      ? "form"
      : s.page === "timing"
        ? "calendar"
        : "chart",
  );
  return (
    <a
      href="#main"
      className="ob-skip"
      data-testid="skip-link"
      onClick={(e) => {
        e.preventDefault();
        const target = (to === "form" ? document.getElementById("native-name") : null) ?? document.getElementById("main");
        target?.focus();
      }}
    >
      {to === "form" ? t("skipToForm") : to === "calendar" ? t("skipToCalendar") : t("skipToChart")}
    </a>
  );
}

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
 * One fixed-viewport grid. Wide: [top-l | sections | top-r] over the body.
 * Compact: [top-l | top-r], body, the sections as the bottom tab bar.
 */
export function Shell() {
  useStudioUrl();
  return (
    <div className="ob-app" data-testid="app-shell">
      <SkipLink />
      <TopLeft />
      <SectionBar />
      <Toaster />
      <PerfOverlay />
      {import.meta.env.DEV ? <SelfTest /> : null}
      <CommandPalette />
      <TopRight />
      {/* Show mode and asking for someone's chart (share and compare plan, ideas B2 and B4): loaded when wanted. */}
      <ExtrasHost />
      <main id="main" className="ob-body-slot" tabIndex={-1}>
        <ErrorSlot>
          <HomeTree />
        </ErrorSlot>
      </main>
      <TourHost />
    </div>
  );
}
