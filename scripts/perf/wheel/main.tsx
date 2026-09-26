// The real ChartWheel on its own page, for timing hovers, pins and entrances.
// Query: ?mode=natal|transit&preset=classic|advanced|all&theme=light&lift=0&view=3d
// __h: setSel, setTheme, rerender, remount (a fresh wheel), jump (transits a month on / back),
// d3 (the 3D view on or off: view3d.mjs)
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useState } from "react";
import { ChartWheel } from "@/components/chart-wheel";
import { useChartView } from "@/lib/chart/use-chart-view";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { LocaleProvider } from "@/lib/i18n/locale";
import { applyLook, defaultLook } from "@/lib/look";
import { setDepthPrefs } from "@/lib/depth/prefs";

const qs = new URLSearchParams(location.search);
const mode = qs.get("mode") ?? "natal";
const preset = qs.get("preset") ?? "classic";
const [natal, sky1, sky2] = await Promise.all([
  fetch("/natal.json").then((r) => r.json()),
  fetch("/sky.json").then((r) => r.json()),
  fetch("/sky2.json").then((r) => r.json()),
]);

try {
  localStorage.clear();
  localStorage.setItem("ulune.hint.wheel.v1", "1");
  if (qs.get("theme")) localStorage.setItem("ulune.theme", qs.get("theme")!);
  if (qs.get("lift") === "0") localStorage.setItem("ulune.depth.v1", JSON.stringify({ lift: false, view: "flat" }));
  // Opened straight in 3D (the view is remembered on the device).
  if (qs.get("view") === "3d") localStorage.setItem("ulune.depth.v1", JSON.stringify({ lift: true, view: "3d" }));
  // The per-node focus fades the composited ones replaced (chart-wheel.tsx nodeFades).
  if (qs.get("fades") === "node") localStorage.setItem("ulune.debug.fades", "node");
  // 3D under review: the chart picture's size, the canvas's device-pixel cap.
  if (qs.get("tex")) localStorage.setItem("ulune.debug.tex", qs.get("tex")!);
  if (qs.get("gldpr")) localStorage.setItem("ulune.debug.gldpr", qs.get("gldpr")!);
} catch {
  /* private mode */
}

function App() {
  const view = useChartView(false);
  const { theme, setTheme } = useTheme();
  const [sel, setSel] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // A fresh wheel (its entrance plays again): entrance.mjs.
  const [mount, setMount] = useState(0);
  // The transits a month on and back (the transits glide): glide.mjs.
  const [later, setLater] = useState(false);
  const sky = later ? sky2 : sky1;
  const pick = useCallback((id: string) => setSel((s) => (s === id ? null : id)), []);
  useEffect(() => {
    applyLook(document.documentElement, defaultLook(), theme);
  }, [theme]);
  (window as unknown as { __h: unknown }).__h = { setSel, setTheme, theme, rerender: () => setTick((t) => t + 1), remount: () => setMount((m) => m + 1), jump: () => setLater((v) => !v), d3: (on: boolean) => setDepthPrefs({ view: on ? "3d" : "flat" }), view };
  const outer =
    mode === "transit"
      ? { transits: sky.planets, crossAspects: sky.aspects, outerKind: "transit" as const, aspectLayer: view.aspectLayer }
      : {};
  // (?w=…&h=… sizes the stage: a bigger window.)
  const box = qs.get("w") ? { width: `${qs.get("w")}px`, height: `${qs.get("h") ?? qs.get("w")}px` } : undefined;
  return (
    <div className="ulune-sky-wheel harness" data-tick={tick} style={box}>
      <ChartWheel
        key={mount}
        chart={natal}
        selectedId={sel}
        visible={view.visible}
        aspectFilter={view.aspectFilter}
        overlays={view.overlays}
        starVisible={view.starVisible}
        midpointVisible={view.midpointVisible}
        onSelect={pick}
        {...outer}
      />
    </div>
  );
}

function Boot() {
  const v = useChartView(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (preset !== "classic") v.applyPreset(preset as never);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ready ? <App /> : null;
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <LocaleProvider>
      <Boot />
    </LocaleProvider>
  </ThemeProvider>,
);
