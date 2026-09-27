/**
 * The legal pages: Settings links to all five (privacy, legal notice, terms,
 * credits, accessibility); each has its title, the links to the others (the
 * current one marked), the publisher's address as a mail link where it
 * belongs, outside links in a new tab; English and French; no overflow on a
 * phone. Moving between them and back to the studio happens in the page: a
 * chart being looked at (kept nowhere) is still there afterwards.
 */
import { join } from "node:path";
import { FIXTURE_A, SHOTS, assertNoOverflow, castFixture, ensureShotsDir, gotoApp, launch, openMenu, setLang } from "./_lib.mjs";

const PAGES = [
  { id: "privacy", en: "Privacy", fr: "Confidentialité" },
  { id: "legal", en: "Legal notice", fr: "Mentions légales" },
  { id: "terms", en: "Terms of use", fr: "Conditions d’utilisation" },
  { id: "credits", en: "Credits", fr: "Crédits" },
  { id: "accessibility", en: "Accessibility", fr: "Accessibilité" },
];

async function onPage(page, id, title) {
  await page.getByTestId(`${id}-page`).waitFor({ timeout: 20000 });
  const h1 = (await page.locator("h1").first().innerText()).trim();
  if (h1 !== title) throw new Error(`${id}: title "${h1}", expected "${title}"`);
  const current = await page.locator(`[data-testid="legal-nav"] [aria-current="page"]`).getAttribute("data-testid");
  if (current !== `legal-link-${id}`) throw new Error(`${id}: the links mark ${current}`);
}

await ensureShotsDir();
const { browser, page } = await launch(1280);
try {
  await gotoApp(page);
  await castFixture(page, FIXTURE_A);
  const wheel = page.locator("svg.ulune-wheel:not(.ulune-wheel-ghost)");
  await wheel.waitFor({ timeout: 30000 });

  // Studio → Settings → each legal page → back to the studio, all in the page.
  await openMenu(page);
  await page.getByTestId("menu-settings").click();
  const links = page.locator('[data-testid="settings-legal"] [data-testid^="legal-link-"]');
  await links.first().waitFor({ timeout: 15000 });
  if ((await links.count()) !== PAGES.length) throw new Error(`Settings links ${await links.count()} legal pages`);
  // And a way to write: an email with the version in its subject.
  const report = await page.getByTestId("report-problem").getAttribute("href");
  if (!/^mailto:[^@\s?]+@[^@\s?]+\?subject=Ulune%20[\d.]+/.test(report ?? "")) throw new Error(`Settings: report a problem is ${report}`);
  await page.getByTestId("legal-link-legal").first().click();
  await onPage(page, "legal", "Legal notice");
  const text = await page.getByTestId("legal-page").innerText();
  for (const bit of ["Publisher", "Publication director", "Vercel Inc.", "440 N Barranca Ave"]) {
    if (!text.includes(bit)) throw new Error(`legal notice: no "${bit}"`);
  }
  const mail = await page.locator('[data-testid="legal-page"] a[href^="mailto:"]').first().getAttribute("href");
  if (!/^mailto:[^@\s]+@[^@\s]+$/.test(mail ?? "")) throw new Error("legal notice: no mail link");
  const outside = page.locator('[data-testid="legal-page"] a[href^="https://"]').first();
  if ((await outside.getAttribute("target")) !== "_blank" || !/noopener/.test((await outside.getAttribute("rel")) ?? ""))
    throw new Error("an outside link does not open apart");
  for (const p of PAGES) {
    await page.locator(`[data-testid="legal-nav"] [data-testid="legal-link-${p.id}"]`).click();
    await onPage(page, p.id, p.en);
  }
  const terms = PAGES.find((p) => p.id === "terms");
  await page.locator(`[data-testid="legal-nav"] [data-testid="legal-link-${terms.id}"]`).click();
  await onPage(page, "terms", terms.en);
  if (!/not scientifically validated/.test(await page.getByTestId("terms-page").innerText())) throw new Error("terms: no disclaimer");
  await page.screenshot({ path: join(SHOTS, "legal-terms-1280.png"), fullPage: true });
  await page.getByTestId("back-to-studio").click();
  await wheel.waitFor({ timeout: 20000 });
  console.log("legal pages, in the page, chart kept OK");

  // French.
  await gotoApp(page, "/credits");
  await setLang(page, "fr");
  for (const p of PAGES) {
    await page.locator(`[data-testid="legal-nav"] [data-testid="legal-link-${p.id}"]`).click();
    await onPage(page, p.id, p.fr);
  }
  console.log("French OK");
  await setLang(page, "en");

  // A phone: nothing runs off the screen.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const p of PAGES) {
    await gotoApp(page, `/${p.id}`);
    await onPage(page, p.id, p.en);
    await assertNoOverflow(page);
  }
  await page.screenshot({ path: join(SHOTS, "legal-accessibility-390.png"), fullPage: true });
  console.log("LEGAL OK");
} finally {
  await browser.close();
}
