/** Major/minor date checkpoints for transit & progressed scrubbers. */

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

export type ScrubTick = { pct: number; major: boolean };

/** Transit ±1y: month majors + week minors. */
export function transitScrubTicks(minMs: number, maxMs: number): ScrubTick[] {
  const span = maxMs - minMs;
  if (span <= 0) return [];
  const ticks: ScrubTick[] = [];
  const seen = new Set<string>();

  // Week minors
  const startWeek = Math.ceil(minMs / WEEK) * WEEK;
  for (let t = startWeek; t <= maxMs; t += WEEK) {
    const pct = ((t - minMs) / span) * 100;
    if (pct < 0 || pct > 100) continue;
    const key = pct.toFixed(3);
    if (seen.has(key)) continue;
    seen.add(key);
    ticks.push({ pct, major: false });
  }

  // Month majors (1st of each month UTC)
  const d = new Date(minMs);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth();
  // start at next month boundary if past day 1
  if (d.getUTCDate() > 1 || d.getUTCHours() > 0) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  for (;;) {
    const t = Date.UTC(y, m, 1);
    if (t > maxMs) break;
    if (t >= minMs) {
      const pct = ((t - minMs) / span) * 100;
      const key = pct.toFixed(3);
      // upgrade or insert major
      const existing = ticks.find((x) => Math.abs(x.pct - pct) < 0.05);
      if (existing) existing.major = true;
      else if (!seen.has(key)) {
        seen.add(key);
        ticks.push({ pct, major: true });
      }
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  return ticks.sort((a, b) => a.pct - b.pct);
}

/** Progressed life years: year majors + month minors (in year-units). */
export function progressedScrubTicks(maxYears: number): ScrubTick[] {
  if (maxYears <= 0) return [];
  const ticks: ScrubTick[] = [];
  for (let y = 0; y <= maxYears; y++) {
    ticks.push({ pct: (y / maxYears) * 100, major: true });
    if (y < maxYears) {
      for (let mo = 1; mo < 12; mo++) {
        const yrs = y + mo / 12;
        if (yrs >= maxYears) break;
        ticks.push({ pct: (yrs / maxYears) * 100, major: false });
      }
    }
  }
  return ticks;
}
