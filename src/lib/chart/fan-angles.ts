/**
 * Spread overlapping glyphs around the wheel without changing their
 * ecliptic order. A force layout can swap neighbours in a stellium;
 * swapped glyphs make tick / aspect leaders cross.
 */
export function fanAngles(ecliptics: number[], minSep: number): number[] {
  const n = ecliptics.length;
  if (n === 0) return [];
  const target = ecliptics.map((e) => ((e % 360) + 360) % 360);
  if (n === 1) return target;

  const sep = Math.min(minSep, 360 / n - 0.45);
  if (!(sep > 0)) return target;

  const order = circularOrder(target);
  const unwrapped = unwrapAlong(target, order);

  const clusters: number[][] = unwrapped.map((_, k) => [k]);

  const bounds = (members: number[]) => {
    const m = members.length;
    const mean = members.reduce((sum, k) => sum + (unwrapped[k] ?? 0), 0) / m;
    const half = ((m - 1) * sep) / 2;
    return { lo: mean - half, hi: mean + half };
  };

  for (let guard = 0; guard < n; guard += 1) {
    let merged = false;
    for (let i = 0; i < clusters.length - 1; i += 1) {
      const a = clusters[i];
      const b = clusters[i + 1];
      if (!a || !b) continue;
      const left = bounds(a);
      const right = bounds(b);
      if (left.hi + sep > right.lo + 1e-9) {
        clusters[i] = [...a, ...b];
        clusters.splice(i + 1, 1);
        merged = true;
        break;
      }
    }
    if (!merged) break;
  }

  const out = target.slice();
  for (const members of clusters) {
    const { lo } = bounds(members);
    members.forEach((k, j) => {
      const orig = order[k];
      if (orig == null) return;
      out[orig] = (((lo + j * sep) % 360) + 360) % 360;
    });
  }
  return out;
}

/** Indices in circular order, cut at the largest gap so a 0° stellium stays together. */
function circularOrder(target: number[]): number[] {
  const n = target.length;
  const idx = target.map((_, i) => i).sort((a, b) => {
    const d = (target[a] ?? 0) - (target[b] ?? 0);
    return d !== 0 ? d : a - b;
  });
  let cut = 0;
  let best = -1;
  for (let k = 0; k < n; k += 1) {
    const a = target[idx[k] ?? 0] ?? 0;
    const b = target[idx[(k + 1) % n] ?? 0] ?? 0;
    const gap = (b - a + 360) % 360;
    // Prefer cutting at the wrap (cut = 0) when several gaps tie, so
    // coincident planets keep input / longitude-sort order.
    if (gap > best + 1e-12 || (Math.abs(gap - best) <= 1e-12 && (k + 1) % n === 0)) {
      best = gap;
      cut = (k + 1) % n;
    }
  }
  return [...idx.slice(cut), ...idx.slice(0, cut)];
}

function unwrapAlong(target: number[], order: number[]): number[] {
  const u: number[] = [];
  for (let k = 0; k < order.length; k += 1) {
    let v = target[order[k] ?? 0] ?? 0;
    if (k > 0) {
      const prev = u[k - 1] ?? 0;
      while (v < prev - 1e-9) v += 360;
    }
    u.push(v);
  }
  return u;
}
