/**
 * Depth: the ranked relief on hover and click (the focus, its sign and house
 * stand out of the flat chart as solids with sides and shadows, tops exactly
 * in place; its aspect lines stay flat lines, lit and drawn over the others),
 * the 3D view (strata,
 * sprites, stems, arcs, orbit), companions that preview in the chart, the
 * bodygraph and the numerology wheel, reduced motion, phones, and the Look
 * switches. Stability is checked too: the flat chart never tilts or drifts,
 * and a 3D sprite held under the pointer keeps its hover.
 * See the 3D charts plan.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import {
  FIXTURE_A,
  SHOTS,
  castFixture,
  clickDockTab,
  ensureShotsDir,
  goStudioPage,
  gotoApp,
  keepCharts,
  launch,
} from "./_lib.mjs";

const noLite = () => {
  window.__uluneDepthNoLite = true;
};

/**
 * What stands out of a figure now (the 2D relief): one entry per lifted
 * focus, with its pieces (tops) — kind, tier, height, the copies they carry —
 * how many wall facets its sides show and how far its shadows fall (how high
 * it reads).
 */
function liveRelief(page, root = ".ob-figure") {
  return page.evaluate(
    (r) =>
      [...document.querySelectorAll(`${r} .ulune-relief`)].map((rel) => {
        const tops = [...rel.querySelectorAll(".ulune-relief-top")].map((t) => ({
          key: t.getAttribute("data-key"),
          kind: t.getAttribute("data-kind"),
          tier: Number(t.getAttribute("data-tier")),
          h: Number(t.getAttribute("data-h")),
          ids: [...t.children].filter((c) => !c.classList.contains("ulune-relief-base")).map((c) => c.getAttribute("data-hl") || c.getAttribute("data-clone-of") || ""),
          pop: t.hasAttribute("data-pop"),
        }));
        const shades = [...rel.querySelectorAll(".ulune-relief-shade")].map((sh) => Number(sh.getAttribute("data-dy")) || 0);
        return {
          key: rel.getAttribute("data-relief-key"),
          mode: rel.getAttribute("data-mode"),
          tops,
          walls: rel.querySelectorAll(".ulune-relief-sides [data-wall]").length,
          // Deepest shadow offset (units): how high the focus reads.
          dy: shades.length ? Math.max(...shades) : 0,
          anims: rel.getAnimations({ subtree: true }).length,
        };
      }),
    root,
  );
}

async function center(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Error(`no box for ${sel}`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

const sceneState = (page) =>
  page.evaluate(() => {
    const st = document.querySelector(".ob-figure .ulune-depth-stack");
    const sc = st?.parentElement;
    return { stack: st?.style.transform ?? "", perspective: sc?.style.perspective ?? "", camera: sc?.hasAttribute("data-depth-camera") ?? false };
  });

/** The focus the wheel paints, sampled every frame from now on. */
async function recordFocus(page) {
  await page.evaluate(() => {
    window.__focusLog = [];
    const tick = () => {
      // (With the 3D view on stage the hidden live chart is not painted: the view holds the focus.)
      const v = document.querySelector(".ob-figure .ulune-depth")?.__uluneView3d;
      const f = v?.onStage() ? v.focusId() : (document.querySelector(".ob-figure svg[data-depth-base]")?.getAttribute("data-focus-id") ?? "");
      const log = window.__focusLog;
      if (!log.length || log[log.length - 1] !== f) log.push(f);
      if (window.__focusLog === log) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function desktop() {
  const { browser, page } = await launch(1280);
  await page.addInitScript(noLite);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await gotoApp(page);
    // The chart comes back after a reload below: a private space that stays unlocked here.
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    await page.locator(".ob-figure svg[data-depth-base]").waitFor();
    // A fresh wheel assembles itself in order: the zodiac from the Ascendant,
    // the planets in a wave, then the aspects drawing themselves (tightest
    // first) — and is fully at rest a moment later.
    const entering = await page.evaluate(() => {
      const svg = document.querySelector(".ob-figure svg[data-depth-base]");
      const delays = (sel) =>
        [...svg.querySelectorAll(sel)]
          .flatMap((el) => el.getAnimations())
          .map((a) => a.effect.getTiming().delay)
          .filter((d) => typeof d === "number");
      return {
        on: svg.hasAttribute("data-entering"),
        signs: delays('[data-kind="sign-band"]'),
        planets: delays('[data-kind="planet"]'),
        draws: [...svg.querySelectorAll('[data-kind="aspect"][data-draw]')].flatMap((el) => el.getAnimations()).map((a) => a.animationName),
      };
    });
    const spread = (list) => (list.length ? Math.max(...list) - Math.min(...list) : 0);
    if (!entering.on || spread(entering.signs) < 200 || spread(entering.planets) < 150 || !entering.draws.includes("ulune-draw")) {
      throw new Error(`the wheel did not assemble in order ${JSON.stringify({ on: entering.on, signs: spread(entering.signs), planets: spread(entering.planets), draws: entering.draws.slice(0, 3) })}`);
    }
    await page.waitForFunction(() => !document.querySelector(".ob-figure svg[data-depth-base]")?.hasAttribute("data-entering"), null, { timeout: 5000 });
    const left = await page.evaluate(() => document.querySelector(".ob-figure svg[data-depth-base]").getAnimations({ subtree: true }).filter((a) => a.playState === "running").length);
    if (left) throw new Error(`${left} entrance animations still running after it ended`);

    // Rest: flat and plain 2D — no camera, no perspective, nothing lifted.
    if ((await liveRelief(page)).length) throw new Error("relief live at rest");
    let scene = await sceneState(page);
    if (scene.stack || scene.perspective || scene.camera) throw new Error(`3D camera on at rest ${JSON.stringify(scene)}`);

    // Hover the Moon: it stands out with its sign and house (a solid with
    // sides and a shadow); its aspects stay flat lines, lit and drawn over
    // every other line; nothing tilts.
    const moon = await center(page, ".ob-figure svg[data-depth-base] [data-kind=planet][data-body=moon] .ulune-wheel-halo");
    await page.mouse.move(moon.x - 60, moon.y - 60);
    await page.mouse.move(moon.x, moon.y, { steps: 6 });
    await page.waitForTimeout(700);
    let relief = await liveRelief(page);
    const hovered = relief.find((r) => r.key === "planet:moon" && r.mode === "hover");
    if (!hovered) throw new Error(`no relief for the hovered Moon ${JSON.stringify(relief)}`);
    const moonTop = hovered.tops.find((t) => t.tier === 0 && t.ids.includes("planet:moon"));
    if (!moonTop) throw new Error(`the Moon is not the focus of its relief ${JSON.stringify(hovered.tops)}`);
    if (hovered.tops.some((t) => t.kind === "aspect")) throw new Error("an aspect line rose out of the flat chart (lines stay flat in 2D)");
    const litTops = await page.evaluate(() => {
      const svg = document.querySelector(".ob-figure svg[data-depth-base]");
      const lit = [...svg.querySelectorAll("[data-aspect-line][data-in-focus='1']")].map((l) => l.getAttribute("data-hl"));
      const shown = [...svg.querySelectorAll("[data-kind='aspect-top'] [data-top-of][data-on='1']")].map((g) => g.getAttribute("data-top-of"));
      return { lit, shown };
    });
    if (!litTops.lit.length || litTops.lit.some((id) => !litTops.shown.includes(id)) || litTops.shown.length !== litTops.lit.length) {
      throw new Error(`the Moon's lit lines are not drawn over the others ${JSON.stringify(litTops)}`);
    }
    if (!hovered.tops.some((t) => t.kind === "sign" && t.tier === 1) || !hovered.tops.some((t) => t.kind === "house" && t.tier === 1)) {
      throw new Error(`the Moon's sign and house did not rise with it ${JSON.stringify(hovered.tops.map((t) => `${t.kind}:${t.tier}`))}`);
    }
    if (hovered.walls < 4 || hovered.dy < 2) throw new Error(`no sides or shadow ${JSON.stringify({ walls: hovered.walls, dy: hovered.dy })}`);
    const hidden = await page.evaluate(() => document.querySelector(".ob-figure svg[data-depth-base] [data-kind=planet][data-body=moon]")?.getAttribute("data-depth-hidden"));
    if (hidden !== "1") throw new Error("original Moon not hidden under its copy");
    scene = await sceneState(page);
    if (scene.stack || scene.camera) throw new Error(`chart moved on hover ${JSON.stringify(scene)}`);
    // Every top sits exactly on its original: nothing jumps under the pointer.
    const drift = await page.evaluate(() => {
      const pairs = [
        ["[data-kind=planet][data-body=moon] .ulune-wheel-halo", "[data-hl='planet:moon'] .ulune-wheel-halo"],
        ['[data-kind="sign-band"] path[data-kind="sign"]', 'path[data-kind="sign"]'],
        ['path[data-kind="house"]', 'path[data-kind="house"]'],
      ];
      let worst = 0;
      for (const top of document.querySelectorAll(".ob-figure .ulune-relief-top")) {
        for (const [origSel, copySel] of pairs) {
          const copy = top.querySelector(copySel);
          if (!copy) continue;
          const hl = copy.getAttribute("data-hl") ?? copy.closest("[data-hl]")?.getAttribute("data-hl");
          const kind = copy.getAttribute("data-kind");
          const orig = [...document.querySelectorAll(`.ob-figure svg[data-depth-base] ${origSel}`)].find(
            (o) => (o.getAttribute("data-hl") ?? o.closest("[data-hl]")?.getAttribute("data-hl")) === hl && o.getAttribute("data-kind") === kind,
          );
          if (!orig) continue;
          const a = orig.getBoundingClientRect();
          const b = copy.getBoundingClientRect();
          worst = Math.max(worst, Math.hypot(b.x - a.x, b.y - a.y), Math.abs(b.width - a.width), Math.abs(b.height - a.height));
        }
      }
      return worst;
    });
    if (drift > 0.5) throw new Error(`a lifted top drifted ${drift}px off its original`);
    const focus = await page.evaluate(() => document.querySelector(".ob-figure svg[data-depth-base]")?.getAttribute("data-focus-id"));
    if (focus !== "planet:moon") throw new Error(`hover picked ${focus}`);
    await page.screenshot({ path: join(SHOTS, "depth-hover-1280.png") });
    const hoverDy = hovered.dy;

    // Small moves on the Moon keep the same focus (no flicker).
    await recordFocus(page);
    for (let k = 0; k < 16; k += 1) {
      await page.mouse.move(moon.x + (k % 3) - 1, moon.y + (k % 2));
      await page.waitForTimeout(20);
    }
    const log = await page.evaluate(() => window.__focusLog);
    if (log.length !== 1) throw new Error(`focus flickered on the Moon: ${log.join(" → ")}`);

    // Click pins it higher: the Moon highest, its sign and house next, what
    // its aspects touch lowest; the lines themselves stay flat.
    await page.mouse.click(moon.x, moon.y);
    await page.waitForTimeout(900);
    relief = await liveRelief(page);
    const pinned = relief.find((r) => r.key === "planet:moon" && r.mode === "pinned");
    if (!pinned || pinned.dy <= hoverDy) throw new Error(`pinned lift ${JSON.stringify(relief)} vs ${hoverDy}`);
    const h0 = pinned.tops.find((t) => t.tier === 0)?.h ?? 0;
    const slabs1 = pinned.tops.filter((t) => t.kind !== "aspect" && t.tier === 1 && (t.kind === "sign" || t.kind === "house"));
    const touched = pinned.tops.filter((t) => t.tier === 2);
    if (!(h0 > 0) || !slabs1.length || slabs1.some((t) => t.h >= h0) || touched.some((t) => t.h >= Math.min(...slabs1.map((x) => x.h)))) {
      throw new Error(`tiers out of order ${JSON.stringify(pinned.tops.map((t) => [t.key, t.tier, t.h]))}`);
    }
    if (pinned.tops.some((t) => t.kind === "aspect")) throw new Error("an aspect line rose with the pin (lines stay flat in 2D)");
    const litPinned = await page.evaluate(() => document.querySelectorAll(".ob-figure svg[data-depth-base] [data-kind='aspect-top'] [data-top-of][data-on='1']").length);
    if (litPinned < 2) throw new Error(`the Moon should have several lit lines drawn over the rest (${litPinned})`);
    // Several solid pieces, each with sides.
    if (pinned.walls < 10) throw new Error(`pinned relief has few sides (${pinned.walls})`);
    await page.screenshot({ path: join(SHOTS, "depth-pinned-1280.png") });

    // Clicking the pinned Moon again clears the pin; leaving lets everything
    // sink back (briefly) and go.
    const stage = await page.locator(".ob-figure .ulune-wheel-stage").boundingBox();
    await page.mouse.click(moon.x, moon.y);
    await page.mouse.move(stage.x - 40, stage.y + 20);
    await page.waitForTimeout(450);
    if ((await liveRelief(page)).length) throw new Error(`relief still live after clearing: ${JSON.stringify(await liveRelief(page))}`);
    if (await page.locator(".ob-figure [data-depth-hidden]").count()) throw new Error("originals left hidden");

    // Hello cell → after a short dwell, the chart previews the Sun.
    await page.getByTestId("natal-hello-sun").hover();
    await page.waitForTimeout(500);
    relief = await liveRelief(page);
    if (!relief.some((r) => r.mode === "preview" && r.tops.some((t) => t.tier === 0 && t.ids.includes("planet:sun")))) {
      throw new Error(`hello preview ${JSON.stringify(relief)}`);
    }
    await page.mouse.move(5, 5);
    await page.waitForTimeout(500);
    if ((await liveRelief(page)).length) throw new Error("preview did not let go");

    // The mouse wheel zooms the flat chart around the pointer (the desktop
    // studio does not scroll); zooming back out puts it back.
    const moonNow = async () => {
      const b = await page.locator(".ob-figure svg[data-depth-base] [data-kind=planet][data-body=moon] .ulune-wheel-halo").boundingBox();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const zoomAttr = () => page.locator(".ob-figure .ulune-wheel-zoom-port").getAttribute("data-zoom");
    const w0 = await moonNow();
    await page.mouse.move(w0.x, w0.y);
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(300);
    const w1 = await moonNow();
    if (!(Number(await zoomAttr()) > 1.3) || Math.hypot(w1.x - w0.x, w1.y - w0.y) > 2) throw new Error(`wheel zoom (flat) ${JSON.stringify({ zoom: await zoomAttr(), w0, w1 })}`);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    if ((await zoomAttr()) !== "1.00") throw new Error(`wheel zoom out (flat) left ${await zoomAttr()}`);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);

    // 3D view (WebGL): the chart as one solid — the plate, the zodiac ring
    // standing on it, planets floating over their places, aspects as tubes
    // joining them. It tilts in smoothly, square (no twist).
    await page.evaluate(() => {
      window.__cam = [];
      const t0 = performance.now();
      const tick = () => {
        const d = document.querySelector(".ob-figure .ulune-depth")?.__uluneDepth;
        if (d) window.__cam.push(d.sceneState().rz);
        if (performance.now() - t0 < 2400) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByTestId("wheel-depth-3d").click();
    await page.waitForFunction(() => document.querySelector(".ob-figure svg[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    const twist = await page.evaluate(() => window.__cam);
    if (twist.some((rz) => Math.abs(rz) > 0.5)) throw new Error(`3D entry turned the chart ${JSON.stringify([Math.min(...twist), Math.max(...twist)])}`);
    const gl = () => page.evaluate(() => document.querySelector(".ob-figure .ulune-depth").__uluneView3d?.debugState());
    const cam = () => page.evaluate(() => { const s = document.querySelector(".ob-figure .ulune-depth").__uluneDepth.sceneState(); return { rx: s.rx, rz: s.rz }; });
    const at3d = (id) => page.evaluate((id) => document.querySelector(".ob-figure .ulune-depth").__uluneView3d.screenOf(id), id);
    const ink = () => page.evaluate(() => document.querySelector(".ob-figure .ulune-depth").__uluneView3d.debugInk());
    let v = await gl();
    if (!v?.ready || v.t < 0.99 || v.sprites.length < 10 || v.tubes.length < 5 || v.draws < 20) throw new Error(`3D view not built ${JSON.stringify(v && { ready: v.ready, t: v.t, sprites: v.sprites.length, tubes: v.tubes.length, draws: v.draws })}`);
    const c0 = await cam();
    if (Math.abs(c0.rx - 50) > 0.5) throw new Error(`3D camera ${JSON.stringify(c0)}`);
    // Aspects join the planets they link, up in the air (not flat on the plate).
    const joined = v.tubes.filter((t) => t.ends[0] && t.ends[1]);
    if (!joined.length || joined.some((t) => t.z[0] < 20 || t.z[1] < 20)) throw new Error(`aspect tubes do not join the planets ${JSON.stringify(joined.slice(0, 3))}`);
    if (v.sprites.some((s) => s.z < 20)) throw new Error("planets not floating over the chart");
    const inkRest = await ink();
    if (inkRest < 0.1) throw new Error(`3D view drew almost nothing (${inkRest})`);
    // The live chart stays flat in the page, invisible, taking the pointer.
    const live = await page.evaluate(() => {
      const svg = document.querySelector(".ob-figure svg[data-depth-base]");
      const scene = document.querySelector(".ob-figure .ulune-depth");
      return {
        opacity: getComputedStyle(svg).opacity,
        ring: getComputedStyle(svg.querySelector("[data-pinwheel]")).visibility,
        backdrop: getComputedStyle(svg.querySelector("[data-backdrop]")).visibility,
        stack: scene.querySelector(".ulune-depth-stack").style.transform,
        canvas: scene.querySelectorAll(":scope > canvas.ulune-depth-gl").length,
      };
    });
    if (live.opacity !== "0" || live.ring !== "hidden" || live.backdrop !== "visible" || live.stack || live.canvas !== 1) throw new Error(`live chart under the 3D view ${JSON.stringify(live)}`);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ulune.depth.v1") || "{}").view);
    if (stored !== "3d") throw new Error(`3D view not saved (${stored})`);
    // Opened straight in 3D (the view is remembered): the pictures show the
    // chart at rest, not mid fade-in.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.waitForFunction(() => document.querySelector(".ob-figure svg[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
    await page.waitForTimeout(2600);
    const inkReload = await ink();
    if (!(inkReload >= inkRest * 0.9)) throw new Error(`3D view drawn mid fade-in after a reload: ${inkRest} → ${inkReload}`);
    // The stage changes size (a panel opens, the window narrows): the canvas
    // follows the stage and the chart stays under the camera's centre.
    const fitOff = () =>
      page.evaluate(() => {
        const scene = document.querySelector(".ob-figure .ulune-depth");
        const st = scene.__uluneView3d.debugState();
        return { w: scene.clientWidth, css: st.canvas?.css ?? 0, ready: st.ready };
      });
    const sizes = new Set([(await fitOff()).w]);
    for (const step of ["panel-width", "panel-width", "dock-collapse", "dock-collapse"]) {
      await page.getByTestId(step).click();
      await page.waitForTimeout(900);
      const off = await fitOff();
      sizes.add(off.w);
      if (!off.ready || Math.abs(off.css - off.w) > 1) throw new Error(`3D view off the stage after ${step}: ${JSON.stringify(off)}`);
      if ((await ink()) < 0.1) throw new Error(`3D view blank after ${step}`);
    }
    if (sizes.size < 2) throw new Error(`the stage did not change size with the panel (${[...sizes].join(", ")})`);
    // Heights at rest (after the resizes), to measure the sinking against.
    const rest3d = Object.fromEntries((await gl()).sprites.map((s) => [s.id, s]));
    // Hover a planet where it is drawn: it is picked in 3D and stays picked
    // under small moves (no flicker). (The stage first stops moving: the
    // panel's slide can outlast a fixed wait on a busy machine.)
    await page.waitForFunction(
      () => {
        const r = document.querySelector(".ob-figure .ulune-depth").getBoundingClientRect();
        const key = `${r.left.toFixed(1)},${r.top.toFixed(1)},${r.width.toFixed(1)}`;
        const was = window.__stageKey;
        window.__stageKey = key;
        return was === key;
      },
      null,
      { polling: 150, timeout: 8000 },
    );
    let mp = await at3d("planet:moon");
    await page.mouse.move(mp.x - 30, mp.y - 30);
    await page.mouse.move(mp.x, mp.y, { steps: 4 });
    await page.waitForTimeout(300);
    await recordFocus(page);
    for (let k = 0; k < 20; k += 1) {
      await page.mouse.move(mp.x + (k % 2), mp.y);
      await page.waitForTimeout(40);
    }
    const log3d = await page.evaluate(() => window.__focusLog);
    if (log3d.length !== 1 || log3d[0] !== "planet:moon") throw new Error(`3D hover flickered: ${log3d.join(" → ")}`);
    // Hovered: its sign and house light up in place (nothing rises under the
    // pointer); its aspects are lit tubes with their marks.
    await page.waitForTimeout(400);
    v = await gl();
    const litBlocks = v.blocks.filter((b) => b.glow > 0.5);
    if (!litBlocks.some((b) => b.id.startsWith("sign:")) || v.blocks.some((b) => b.rise > 0.5) || v.sprites.some((s) => s.id === "planet:moon" && s.halo < 0.5)) {
      throw new Error(`3D hover should light the Moon's sign in place ${JSON.stringify(v.blocks)}`);
    }
    // What the hovered Moon leaves out sinks partway toward the plate; the
    // Moon and what it involves stay up.
    const hoverSunk = v.sprites.filter((s) => s.sinkTo > 0);
    const moonHover = v.sprites.find((s) => s.id === "planet:moon");
    if (!hoverSunk.length || !moonHover || moonHover.sinkTo !== 0 || v.sprites.every((s) => s.sinkTo > 0)) throw new Error(`3D hover should sink what the Moon leaves out ${JSON.stringify(v.sprites.map((s) => [s.id, s.sinkTo]))}`);
    for (const s of hoverSunk) {
      const r0 = rest3d[s.id];
      const ratio = (s.z - s.foot) / Math.max(1, r0.z - r0.foot);
      if (Math.abs(s.sinkTo - 0.6) > 0.01 || ratio < 0.5 || ratio > 0.72) throw new Error(`hover sink off for ${s.id}: ${JSON.stringify({ sinkTo: s.sinkTo, ratio })}`);
    }
    // Pinned: its sign, house and decan stand up as solids (what they touch
    // only lights up), the Moon rises highest, and its aspects arch up —
    // tighter orbs higher and thicker.
    await page.mouse.click(mp.x, mp.y);
    await page.waitForTimeout(1600);
    v = await gl();
    const risen = v.blocks.filter((b) => b.rise > 10);
    if (!risen.some((b) => b.id.startsWith("sign:") && b.tier === 1 && b.walls) || !risen.some((b) => b.id.startsWith("house:"))) throw new Error(`3D pinned blocks did not rise ${JSON.stringify(v.blocks)}`);
    if (v.blocks.some((b) => b.tier === 2 && b.rise > 0.5)) throw new Error(`what the focus touches should not rise ${JSON.stringify(v.blocks)}`);
    const moonZ = v.sprites.find((s) => s.id === "planet:moon")?.z ?? 0;
    if (!v.sprites.every((s) => s.id === "planet:moon" || s.z <= moonZ + 0.5)) throw new Error("the pinned Moon is not the highest planet");
    // Pinned: everything the Moon leaves out sinks to about a third of its
    // float height; what it involves stays at least where it was.
    for (const s of v.sprites) {
      const r0 = rest3d[s.id];
      const ratio = (s.z - s.foot) / Math.max(1, r0.z - r0.foot);
      if (s.sinkTo === 1 && ratio > 0.45) throw new Error(`pinned: ${s.id} did not sink (${ratio.toFixed(2)})`);
      if (s.sinkTo === 0 && ratio < 0.99) throw new Error(`pinned: ${s.id} is involved but sank (${ratio.toFixed(2)})`);
    }
    if (!v.sprites.some((s) => s.sinkTo === 1)) throw new Error("pinned: nothing sank");
    const orbs3d = await page.evaluate(() =>
      Object.fromEntries([...document.querySelectorAll(".ob-figure svg[data-depth-base] g[data-aspect][data-orb]")].map((g) => [g.getAttribute("data-hl"), Number(g.getAttribute("data-orb"))])),
    );
    const arched = v.tubes.filter((t) => t.arch > 5).sort((a, b) => orbs3d[a.id] - orbs3d[b.id]);
    if (arched.length < 2 || arched.some((t) => t.mark < 0.5)) throw new Error(`the Moon's aspects did not arch up with their marks ${JSON.stringify(arched)}`);
    for (let i = 1; i < arched.length; i += 1) {
      if (arched[i].arch > arched[i - 1].arch + 1e-6 || arched[i].r > arched[i - 1].r + 1e-6) throw new Error(`a wider orb arches higher or thicker: ${JSON.stringify(arched.map((t) => [t.id, orbs3d[t.id], t.arch, t.r]))}`);
    }
    await page.screenshot({ path: join(SHOTS, "depth-3d-1280.png") });
    // Unpin (the Moon has risen: click it where it is now).
    mp = await at3d("planet:moon");
    await page.mouse.click(mp.x, mp.y);
    await page.mouse.move(stage.x + 4, stage.y + 4);
    await page.waitForTimeout(1100);
    if ((await gl()).blocks.some((b) => b.rise > 1)) throw new Error("3D blocks stayed up after unpinning");
    // Unpinned: every body back at its float height.
    await page.waitForTimeout(400);
    for (const s of (await gl()).sprites) {
      const r0 = rest3d[s.id];
      if (Math.abs(s.z - r0.z) > Math.max(1, r0.z * 0.01) || s.sinkTo !== 0) throw new Error(`after the unpin ${s.id} is not back up: ${s.z} vs ${r0.z}`);
    }

    // Zoom in the 3D view: its own lens (the stage is not scaled, the canvas
    // stays sharp), an orbit still turns the chart (no pan steals the drag),
    // the mouse wheel zooms around the pointer, Fit puts it all back.
    const lensSt = () =>
      page.evaluate(() => {
        const scene = document.querySelector(".ob-figure .ulune-depth");
        const s = scene.__uluneDepth.sceneState();
        return { zoom: s.zoom ?? 1, panX: s.panX ?? 0, panY: s.panY ?? 0, rz: s.rz, inner: scene.closest(".ulune-wheel-zoom-inner")?.style.transform ?? "" };
      });
    await page.getByTestId("wheel-zoom-in").click();
    await page.waitForTimeout(900);
    let lz = await lensSt();
    if (!(lz.zoom > 1.2) || !/scale\(1\)/.test(lz.inner)) throw new Error(`3D zoom should use the view's lens ${JSON.stringify(lz)}`);
    const rzLens = lz.rz;
    await page.mouse.move(stage.x + stage.width * 0.5, stage.y + stage.height * 0.12);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width * 0.7, stage.y + stage.height * 0.12, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    lz = await lensSt();
    if (Math.abs(lz.rz - rzLens) < 10 || lz.panX || lz.panY) throw new Error(`orbit after zooming in 3D ${JSON.stringify(lz)}`);
    const mz = await at3d("planet:moon");
    await page.mouse.move(mz.x, mz.y);
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(1200);
    const mz2 = await at3d("planet:moon");
    lz = await lensSt();
    if (!(lz.zoom > 1.6) || Math.hypot(mz2.x - mz.x, mz2.y - mz.y) > 2) throw new Error(`the wheel should zoom around the pointer ${JSON.stringify({ lz, mz, mz2 })}`);
    await page.getByTestId("wheel-zoom-fit").click();
    // The lens eases home; a slow machine draws fewer frames, so wait for rest (up to 5 s).
    for (let i = 0; i < 25; i += 1) {
      await page.waitForTimeout(i ? 200 : 1500);
      lz = await lensSt();
      if (lz.zoom === 1 && !lz.panX && !lz.panY) break;
    }
    if (lz.zoom !== 1 || lz.panX || lz.panY || Math.abs(lz.rz % 360) > 0.5) throw new Error(`Fit should reset the lens and the camera ${JSON.stringify(lz)}`);

    // Orbit by dragging the plate; let go while moving and it glides on.
    // (A busy test machine can hold the release back long enough to read as
    // a pause — "stop here" — so a second drag is allowed.)
    let rzUp = 0;
    let rzGlide = 0;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.mouse.move(stage.x + stage.width * 0.5, stage.y + stage.height * 0.9);
      await page.mouse.down();
      await page.mouse.move(stage.x + stage.width * 0.2, stage.y + stage.height * 0.9, { steps: 8 });
      await page.mouse.up();
      rzUp = (await cam()).rz;
      await page.waitForTimeout(500);
      rzGlide = (await cam()).rz;
      if (Math.abs(rzGlide - rzUp) > 2) break;
    }
    if (Math.abs(rzUp) < 5) throw new Error("orbit did not turn the chart");
    if (!(Math.abs(rzGlide - rzUp) > 2)) throw new Error(`the chart did not glide on after the drag (${rzUp} → ${rzGlide})`);
    for (let k = 0; k < 2; k += 1) {
      await page.mouse.move(stage.x + stage.width * 0.95, stage.y + stage.height * 0.9);
      await page.mouse.down();
      await page.mouse.move(stage.x + stage.width * 0.05, stage.y + stage.height * 0.9, { steps: 12 });
      await page.mouse.up();
    }
    await page.waitForTimeout(400);
    // Dragging down brings the view over the top of the chart; up tips it.
    const rxStart = (await cam()).rx;
    await page.mouse.move(stage.x + stage.width * 0.08, stage.y + stage.height * 0.8);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width * 0.08, stage.y + stage.height * 0.8 + 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const rxDown = (await cam()).rx;
    if (!(rxDown < rxStart - 5)) throw new Error(`dragging down did not bring the view over the chart: ${rxStart} → ${rxDown}`);
    await page.mouse.move(stage.x + stage.width * 0.08, stage.y + stage.height * 0.9);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width * 0.08, stage.y + stage.height * 0.9 - 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const rxUp = (await cam()).rx;
    if (!(rxUp > rxDown + 5)) throw new Error(`dragging up did not tip the chart: ${rxDown} → ${rxUp}`);
    const turned = (await cam()).rz;
    if (Math.abs(turned) < 360) throw new Error(`long orbit turned only ${turned}°`);
    if ((await ink()) < 0.1) throw new Error("3D view blank after orbiting");

    // Back to flat: everything torn down; the camera turns back the shortest way.
    await page.evaluate(() => {
      window.__rz = [];
      const t0 = performance.now();
      const tick = () => {
        const d = document.querySelector(".ob-figure .ulune-depth")?.__uluneDepth;
        if (d) window.__rz.push(d.sceneState().rz);
        if (performance.now() - t0 < 1600) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByTestId("wheel-depth-3d").click();
    await page.waitForTimeout(1900);
    const rzExit = await page.evaluate(() => window.__rz);
    let travel = 0;
    for (let i = 1; i < rzExit.length; i += 1) travel += Math.abs(((((rzExit[i] - rzExit[i - 1]) % 360) + 540) % 360) - 180);
    if (travel > 185) throw new Error(`leaving 3D unwound ${Math.round(travel)}° (from ${turned}°)`);
    const baseAfter = await page.evaluate(() => {
      const svg = document.querySelector(".ob-figure svg[data-depth-base]");
      const scene = document.querySelector(".ob-figure .ulune-depth");
      return {
        view3d: svg.getAttribute("data-view3d"),
        opacity: getComputedStyle(svg).opacity,
        ring: getComputedStyle(svg.querySelector("[data-pinwheel]")).visibility,
        canvas: scene.querySelectorAll("canvas.ulune-depth-gl").length,
        camera: scene.hasAttribute("data-depth-camera"),
      };
    });
    if (baseAfter.view3d !== null || baseAfter.opacity !== "1" || baseAfter.ring !== "visible" || baseAfter.canvas || baseAfter.camera) throw new Error(`live chart not back after exit ${JSON.stringify(baseAfter)}`);
    if ((await liveRelief(page)).length || (await page.locator(".ob-figure [data-depth-hidden]").count())) {
      throw new Error(`a lift stayed after leaving 3D: ${JSON.stringify(await liveRelief(page))}`);
    }

    // Look → Type & ink → Depth: lift off means nothing rises.
    await clickDockTab(page, "look");
    await page.getByTestId("look-page-type").click();
    if (await page.locator("[data-depth-pref=tilt]").count()) throw new Error("tilt switch still offered");
    await page.locator("[data-depth-pref=lift]").click();
    await page.mouse.move(moon.x, moon.y, { steps: 4 });
    await page.waitForTimeout(500);
    if ((await liveRelief(page)).length) throw new Error("lift still on after switching it off");
    await page.locator("[data-depth-pref=lift]").click();

    // Bodygraph: pointing at a centre outlines it where it is drawn (the
    // Human Design plan, part 44): nothing lifts, nothing is copied over the
    // chart, nothing moves. The rest of its behaviour is in hd.mjs.
    await goStudioPage(page, "design");
    await page.getByTestId("hd-graph").waitFor({ timeout: 30000 });
    await page.waitForTimeout(700);
    const gBefore = await page.getByTestId("hd-center-g").boundingBox();
    await page.getByTestId("hd-center-g").hover();
    await page.waitForTimeout(600);
    const hd = await page.evaluate(() => ({
      copies: document.querySelectorAll("[data-testid=hd-box] .ulune-relief, [data-testid=hd-box] [data-clone-of]").length,
      outlined: document.querySelector("[data-testid=hd-center-g]").getAttribute("data-hover"),
      transformed: getComputedStyle(document.querySelector("[data-testid=hd-graph]")).transform,
    }));
    // (Its fade-in may leave an identity matrix behind: that moves nothing.)
    const still = !hd.transformed || hd.transformed === "none" || hd.transformed === "matrix(1, 0, 0, 1, 0, 0)";
    if (hd.copies || hd.outlined !== "hero" || !still) throw new Error(`bodygraph pointing ${JSON.stringify(hd)}`);
    const gAfter = await page.getByTestId("hd-center-g").boundingBox();
    if (Math.abs(gAfter.x - gBefore.x) > 0.5 || Math.abs(gAfter.y - gBefore.y) > 0.5) throw new Error("the pointed centre moved");

    // Numerology: pointing at a core tile lights its disc on the wheel, where it is drawn.
    await goStudioPage(page, "numerology");
    await page.getByTestId("numerology-ring").waitFor({ timeout: 30000 });
    await page.getByTestId("numerology-tile-lifepath").hover();
    await page.waitForTimeout(400);
    if ((await page.getByTestId("numerology-disc-lifepath").getAttribute("data-hero")) !== "1") throw new Error("the tile did not light its disc");
    const ring = await page.evaluate(() => getComputedStyle(document.querySelector("[data-testid=numerology-ring]")).transform);
    if (ring && ring !== "none") throw new Error(`numerology ring is transformed (${ring})`);

    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("depth-1280 OK");
  } finally {
    await browser.close();
  }
}

async function reduced() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  await page.addInitScript(noLite);
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await page.locator(".ob-figure svg[data-depth-base]").waitFor();
    if (await page.evaluate(() => document.querySelector(".ob-figure svg[data-depth-base]").hasAttribute("data-entering"))) {
      throw new Error("reduced motion: the wheel staged its entrance");
    }
    await page.waitForTimeout(400);
    const moon = await center(page, ".ob-figure svg[data-depth-base] [data-kind=planet][data-body=moon] .ulune-wheel-halo");
    await page.mouse.move(moon.x, moon.y, { steps: 3 });
    await page.waitForTimeout(80);
    const relief = await liveRelief(page);
    const moonUp = relief.find((r) => r.key === "planet:moon");
    if (!moonUp || moonUp.dy < 2 || !moonUp.walls) throw new Error(`reduced motion: relief should be there at once (${JSON.stringify(relief)})`);
    if (moonUp.anims || moonUp.tops.some((t) => t.pop)) throw new Error("reduced motion: relief animated");
    if ((await sceneState(page)).stack) throw new Error("reduced motion: chart transformed");
    console.log("depth-reduced OK");
  } finally {
    await browser.close();
  }
}

async function phone() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  await page.addInitScript(noLite);
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await page.locator(".ob-figure svg[data-depth-base]").waitFor();
    await page.waitForTimeout(400);
    const sun = await center(page, ".ob-figure svg[data-depth-base] [data-kind=planet][data-body=sun] .ulune-wheel-halo");
    await page.touchscreen.tap(sun.x, sun.y);
    await page.waitForTimeout(700);
    const relief = await liveRelief(page);
    if (!relief.some((r) => r.mode === "pinned" && r.tops.some((t) => t.tier === 0 && t.ids.includes("planet:sun")))) throw new Error(`phone tap lift ${JSON.stringify(relief)}`);
    if ((await sceneState(page)).stack) throw new Error("phone: chart transformed without the 3D view");
    const btn = page.getByTestId("wheel-depth-3d");
    await btn.scrollIntoViewIfNeeded();
    await btn.tap();
    await page.waitForFunction(() => document.querySelector(".ob-figure svg[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
    await page.waitForTimeout(1900);
    const stage = await page.locator(".ob-figure .ulune-wheel-stage").boundingBox();
    const cdp = await ctx.newCDPSession(page);
    const x = stage.x + stage.width / 2;
    const y = stage.y + stage.height * 0.85;
    const scroll0 = await page.evaluate(() => window.scrollY);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i += 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - i * 14, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(400);
    const rzPhone = await page.evaluate(() => document.querySelector(".ob-figure .ulune-depth").__uluneDepth.sceneState().rz);
    if (Math.abs(rzPhone) < 5) throw new Error(`phone: touch orbit did not turn the chart (${rzPhone})`);
    if ((await page.evaluate(() => window.scrollY)) !== scroll0) throw new Error("phone: orbit scrolled the page");
    await page.screenshot({ path: join(SHOTS, "depth-3d-390.png") });
    await btn.tap();
    await page.waitForTimeout(1600);
    console.log("depth-390 OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
await desktop();
await reduced();
await phone();
console.log("DEPTH OK");
