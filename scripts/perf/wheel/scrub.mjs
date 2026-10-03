// The transit time tape dragged at 60 Hz for 2 s over 20 days, on a served build (ULUNE_DEV):
// wheel updates per second (distinct Moon positions per frame), server casts
// during the drag, and the time from letting go to the exact sky.
// ULUNE_DEV=http://127.0.0.1:9311 node scripts/perf/wheel/scrub.mjs [runs=3] [cpu=1]
import { launch, gotoApp, clickDockTab, castFixture, FIXTURE_A, goStudioPage } from "../../e2e/_lib.mjs";
const runs = Number(process.argv[2] ?? 3);
const cpu = Number(process.argv[3] ?? 1);
const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const results = [];
for (let r = 0; r < runs; r++) {
  const { browser, page } = await launch(1280);
  const reqs = [];
  page.on("request", (q) => { if (q.url().includes("/_serverFn")) reqs.push({ t: Date.now(), kind: "req" }); });
  page.on("response", (q) => { if (q.url().includes("/_serverFn")) reqs.push({ t: Date.now(), kind: "res" }); });
  try {
    await gotoApp(page);
    await clickDockTab(page, "birth");
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    await goStudioPage(page, "transits");
    await page.getByTestId("transit-ring").waitFor({ timeout: 30000 });
    await page.getByTestId("transit-scrubber").waitFor({ timeout: 20000 });
    await page.waitForTimeout(3000);
    if (cpu > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu }); }
    // The time dial (part 87d): the tape dragged 200 px (20 days at the Day
    // step) by pointer events sent in the page at 60 Hz, as a hand's arrive (a
    // driven mouse waits for each event's round trip and could not keep up).
    await page.getByTestId("transit-scrubber-unit").selectOption("day");
    const start = Date.now();
    const res = await page.evaluate(async () => {
      const el = document.querySelector("[data-testid=transit-scrubber]");
      const box = el.getBoundingClientRect();
      const y = box.y + box.height / 2;
      const x0 = box.x + box.width * 0.8;
      const send = (type, x) => el.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "mouse", button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
      const moon = () => { const r = document.querySelector("[data-testid=transit-ring] [data-kind=transit][data-transit=moon]")?.getBoundingClientRect(); return r ? `${r.x.toFixed(1)},${r.y.toFixed(1)}` : "none"; };
      let frames = 0, last = moon(), changes = 0, running = true;
      const loop = () => { if (!running) return; frames++; const m = moon(); if (m !== last) { changes++; last = m; } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      send("pointerdown", x0);
      const t0 = performance.now();
      for (let i = 1; i <= 120; i++) {
        send("pointermove", x0 - (i / 120) * 200);
        const due = t0 + i * (2000 / 120);
        await new Promise((r) => setTimeout(r, Math.max(0, due - performance.now())));
      }
      const dragMs = performance.now() - t0;
      running = false;
      send("pointerup", x0 - 200);
      return { dragMs, frames, changes };
    });
    const released = Date.now();
    await page.waitForTimeout(2500);
    const during = reqs.filter((q) => q.kind === "req" && q.t >= start && q.t <= released).length;
    const firstRes = reqs.find((q) => q.kind === "res" && q.t > released);
    results.push({ ...res, updatesPerSec: res.changes / (res.dragMs / 1000), castsDuringDrag: during, exactAfterMs: firstRes ? firstRes.t - released : null });
  } finally {
    await browser.close();
  }
}
console.log(JSON.stringify({ cpu, runs: results.map((x) => ({ ups: +x.updatesPerSec.toFixed(1), casts: x.castsDuringDrag, exactAfter: x.exactAfterMs, frames: x.frames, dragMs: Math.round(x.dragMs), changes: x.changes })), median: { updatesPerSec: +med(results.map((x) => x.updatesPerSec)).toFixed(1), castsDuringDrag: med(results.map((x) => x.castsDuringDrag)), exactAfterMs: med(results.map((x) => x.exactAfterMs ?? Infinity)) } }));
