import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { aspectHolds, isRough } from "@/lib/chart/day-checks";
import type { NatalChart, Placement } from "@/lib/chart/types";
import {
  aspectLinkPhrase,
  bodyLabel,
  elementName,
  houseName,
  modalityName,
  signName,
} from "@/lib/i18n/astro";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { formatArc } from "@/lib/utils";

/** "~" before what hangs on an unknown birth time (as in the table). */
function mark(on: boolean): string {
  return on ? "~" : "";
}

/** A position, "~" when the birth time is unknown and it moves enough in the day (or is an angle). */
function position(chart: NatalChart, p: Placement): string {
  return `${mark(isRough(chart, p))}${p.formatted}`;
}

function house(chart: NatalChart, n: number, locale: AppLocale, timeUnknown: boolean): string {
  return `${mark(timeUnknown || chart.meta.timeUnknown === true)}${houseName(n, locale)}`;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

function when(chart: NatalChart, locale: AppLocale, timeUnknown: boolean) {
  const m = chart.meta;
  // The date as the app writes it, 15/06/1990 (review 3 Oct, C8: the summary wrote 1990-06-15).
  return [formatEuropeanDate(m.date) || m.date, timeUnknown ? translate(locale, "timeUnknown") : m.time, m.placeLabel].filter(Boolean).join(" · ");
}

function bigThree(chart: NatalChart, locale: AppLocale, timeUnknown: boolean) {
  const rows: { label: string; value: string }[] = [];
  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  const asc = chart.angles.ascendant;
  for (const [id, p] of [
    ["sun", sun],
    ["moon", moon],
    ["ascendant", asc],
  ] as const) {
    if (!p) continue;
    rows.push({
      label: bodyLabel(id, locale),
      value: `${position(chart, p)} ${signName(p.sign, locale)} · ${house(chart, p.house, locale, timeUnknown)}`,
    });
  }
  return rows;
}

/** A short plain-text portrait of the chart, for pasting anywhere. */
export function chartSummaryText(chart: NatalChart, locale: AppLocale, timeUnknown = false): string {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(locale, k, v);
  const pat = chart.patterns;
  const lines: string[] = [];
  lines.push(chart.meta.name || t("untitled"));
  lines.push(when(chart, locale, timeUnknown));
  const unknown = timeUnknown || chart.meta.timeUnknown === true;
  lines.push(`${t(HOUSE_SYSTEM_LABEL[chart.meta.houseSystem ?? "placidus"])} · ${unknown ? `~${t("sectNeedsTime")}` : pat.isDay ? t("tableDay") : t("tableNight")}`);
  lines.push("");
  for (const r of bigThree(chart, locale, unknown)) lines.push(`${r.label}: ${r.value}`);
  lines.push("");
  lines.push(
    `${t("glanceElements")}: ${(["fire", "earth", "air", "water"] as const)
      .map((e) => `${elementName(e, locale)} ${pat.elementCounts[e]}`)
      .join(" · ")}`,
  );
  lines.push(
    `${t("glanceModes")}: ${(["cardinal", "fixed", "mutable"] as const)
      .map((m) => `${modalityName(m, locale)} ${pat.modalityCounts[m]}`)
      .join(" · ")}`,
  );
  const ruler = chart.planets.find((p) => p.id === pat.chartRuler);
  if (ruler) lines.push(`${t("glanceRuler")}: ${mark(unknown)}${bodyLabel(ruler.id, locale)} · ${signName(ruler.sign, locale)} · ${house(chart, ruler.house, locale, unknown)}`);
  if (pat.tightest) {
    lines.push(`${t("glanceTightest")}: ${mark(unknown)}${aspectLinkPhrase(pat.tightest.a, pat.tightest.type, pat.tightest.b, locale)} · ${formatArc(pat.tightest.orb)}`);
  }
  lines.push("");
  lines.push(`${t("tablePoints")}:`);
  for (const p of chart.planets) {
    lines.push(`  ${bodyLabel(p.id, locale)} ${position(chart, p)} ${signName(p.sign, locale)} · ${house(chart, p.house, locale, unknown)}${p.retrograde ? " ℞" : ""}`);
  }
  lines.push("");
  lines.push("Ulune");
  return lines.join("\n");
}

/** One-page printable chart sheet: wheel, Big Three, positions and aspects. */
export function chartSheetHtml(chart: NatalChart, locale: AppLocale, svg: string | null, timeUnknown = false): string {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  const unknown = timeUnknown || chart.meta.timeUnknown === true;
  const three = bigThree(chart, locale, unknown)
    .map((r) => `<div class="b3"><span>${esc(r.label)}</span><strong>${esc(r.value)}</strong></div>`)
    .join("");
  const points = chart.planets
    .map(
      (p) =>
        `<tr><td>${esc(bodyLabel(p.id, locale))}</td><td>${esc(position(chart, p))} ${esc(signName(p.sign, locale))}</td><td>${mark(unknown)}${p.house}</td><td>${p.retrograde ? "℞" : ""}</td></tr>`,
    )
    .join("");
  const aspects = chart.aspects
    .filter((a) => a.level === "major")
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 16)
    .map(
      (a) =>
        `<tr><td>${esc(`${mark(!aspectHolds(chart, a))}${aspectLinkPhrase(a.a, a.type, a.b, locale)}`)}</td><td>${esc(formatArc(a.orb))}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${esc(chart.meta.name || "Ulune")}</title>
<style>
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 10pt/1.4 -apple-system, "Segoe UI", system-ui, sans-serif; color: #111; }
h1 { margin: 0; font: 500 20pt/1.1 Georgia, "Times New Roman", serif; }
.meta { margin: 4px 0 10px; color: #555; }
.top { display: grid; grid-template-columns: 1fr 58mm; gap: 8mm; align-items: start; }
.wheel svg { width: 100%; height: auto; display: block; }
.b3 { display: flex; flex-direction: column; padding: 4px 0; border-bottom: 0.5pt solid #ccc; }
.b3 span { font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; color: #666; }
h2 { font: 600 8pt/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: .08em; color: #666; margin: 10px 0 4px; }
table { width: 100%; border-collapse: collapse; }
td { padding: 2px 4px 2px 0; border-bottom: 0.5pt solid #e3e3e3; font-variant-numeric: tabular-nums; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
footer { margin-top: 8px; color: #888; font-size: 8pt; }
</style></head><body>
<h1>${esc(chart.meta.name || t("untitled"))}</h1>
<p class="meta">${esc(when(chart, locale, timeUnknown))} · ${esc(t(HOUSE_SYSTEM_LABEL[chart.meta.houseSystem ?? "placidus"]))}</p>
<div class="top"><div class="wheel">${svg ?? ""}</div><div>${three}</div></div>
<div class="cols">
<div><h2>${esc(t("tablePoints"))}</h2><table>${points}</table></div>
<div><h2>${esc(t("tableAspects"))}</h2><table>${aspects}</table></div>
</div>
<footer>Ulune</footer>
</body></html>`;
}

/** Print through a hidden frame, so no pop-up is needed. */
export function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 60_000);
  };
  if (doc.readyState === "complete") window.setTimeout(go, 150);
  else frame.addEventListener("load", () => window.setTimeout(go, 150), { once: true });
}
