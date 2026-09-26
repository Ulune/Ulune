/**
 * The `?perf` overlay (performance plan 5.6): add `?perf` to the address (or
 * `localStorage["ulune.debug.perf"] = "1"`) and a small panel in the corner
 * shows what the page costs on this device, once a second: frames per
 * second, long tasks (over 50 ms) in the last ten seconds and the longest,
 * the wheel's node count, whether 3D is on, and the JS heap where the browser
 * tells it. Plain DOM, outside React, so it doesn't move what it measures;
 * nothing is sent anywhere.
 */

type Sample = { at: number; ms: number };

export function startPerfOverlay(): () => void {
  const box = document.createElement("div");
  box.setAttribute("data-testid", "perf-overlay");
  box.setAttribute("aria-hidden", "true");
  box.style.cssText = [
    "position:fixed",
    "right:8px",
    "bottom:8px",
    "z-index:2147483647",
    "pointer-events:none",
    "font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace",
    "color:#f0efec",
    "background:rgba(17,17,17,.82)",
    "border:1px solid #2a2a2a",
    "border-radius:6px",
    "padding:6px 8px",
    "white-space:pre",
    "font-variant-numeric:tabular-nums",
  ].join(";");
  document.body.appendChild(box);

  let frames = 0;
  let raf = 0;
  const count = () => {
    frames += 1;
    raf = requestAnimationFrame(count);
  };
  raf = requestAnimationFrame(count);

  const longTasks: Sample[] = [];
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longTasks.push({ at: e.startTime, ms: e.duration });
    });
    observer.observe({ type: "longtask", buffered: false });
  } catch {
    observer = null; // Safari has no long-task timing.
  }

  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    const fps = (frames * 1000) / Math.max(1, now - last);
    frames = 0;
    last = now;
    while (longTasks.length && longTasks[0].at < now - 10_000) longTasks.shift();
    const worst = longTasks.reduce((m, t) => Math.max(m, t.ms), 0);
    const wheel = document.querySelector("svg.ulune-wheel:not(.ulune-wheel-ghost)");
    const nodes = wheel ? wheel.getElementsByTagName("*").length : 0;
    const in3d = wheel?.getAttribute("data-view3d") ? "on" : "off";
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    const lines = [
      `fps     ${fps.toFixed(0).padStart(4)}`,
      observer
        ? `long    ${String(longTasks.length).padStart(4)}  max ${worst.toFixed(0)} ms (10 s)`
        : "long     n/a",
      `nodes   ${String(nodes).padStart(4)}`,
      `3D       ${in3d}`,
    ];
    if (mem) lines.push(`heap    ${(mem.usedJSHeapSize / 1048576).toFixed(0).padStart(4)} MB`);
    box.textContent = lines.join("\n");
  };
  tick();
  const timer = window.setInterval(tick, 1000);

  return () => {
    window.clearInterval(timer);
    cancelAnimationFrame(raf);
    observer?.disconnect();
    box.remove();
  };
}
